/**
 * Estado del campo único de «Formación» y de la gestión del equipo (spec 003, research R14; FR-001 a FR-003).
 * Reductor puro: el componente `CampoEquipo` solo traduce gestos en llamadas a `soltar` y `cambiarFormacion`.
 *
 * - `asignacion`: casilla → jugador (los titulares).
 * - `puntos`: colocación libre, solo de los titulares recolocados (unidades del campo: x 0–1000 hacia la
 *   portería rival, y 0–640).
 * - `banquillo`: los 7 suplentes, en orden.
 *
 * Los gestos (contracts/ui.md):
 * - soltar un titular en una zona libre lo recoloca;
 * - soltarlo sobre otro titular (a menos del radio de la ficha) intercambia sus casillas y sus puntos;
 * - soltar un suplente sobre un titular hace el cambio con el banquillo;
 * - soltar "muy cerca" de otra ficha ocupa el punto libre más cercano a ≥ `separacionMinima`;
 * - soltar fuera del campo y del banquillo no cambia nada.
 */
import {
  ANCHO_CAMPO,
  autoAlineacion,
  calcularColocacion,
  FORMACIONES,
  LARGO_CAMPO,
  type FormacionId,
  type Jugador,
  type ParametrosEquilibrado,
  type Posicion,
} from '@fbd/domain';

export interface Punto {
  x: number;
  y: number;
}

export interface EstadoCampo {
  formacion: FormacionId;
  asignacion: Record<string, number | undefined>;
  puntos: Record<number, Punto>;
  banquillo: number[];
}

/**
 * Dónde se suelta una ficha: un punto del campo, el banquillo o el resto de la plantilla (en estos dos, `sobre` es la
 * ficha de la lista sobre la que cae, para intercambiarlas; hallazgo H4) o fuera.
 */
export type DestinoSoltar =
  | { tipo: 'campo'; punto: Punto }
  | { tipo: 'banquillo'; sobre?: number }
  | { tipo: 'reserva'; sobre?: number }
  | { tipo: 'fuera' };

export interface OpcionesSoltar {
  parametros: ParametrosEquilibrado;
  /** Radio de la ficha (unidades): soltar a menos de esta distancia de otra cuenta como "encima". */
  radioFicha: number;
  posicionesDe?: (jugadorId: number) => readonly Posicion[];
  /** Jugadores que no se pueden mover al campo (de baja, sustituidos, expulsados). */
  bloqueados?: ReadonlySet<number>;
  /** Máximo de suplentes en el banquillo. */
  maxBanquillo?: number;
}

export const RADIO_FICHA = 28;

/** Acota un punto al campo. */
export function acotar(p: Punto): Punto {
  return { x: Math.round(Math.min(LARGO_CAMPO, Math.max(0, p.x))), y: Math.round(Math.min(ANCHO_CAMPO, Math.max(0, p.y))) };
}

const distancia = (a: Punto, b: Punto) => Math.hypot(a.x - b.x, a.y - b.y);

/** Titulares en el orden de las casillas de la formación. */
export function titularesDe(e: EstadoCampo): { casillaId: string; jugadorId: number }[] {
  return FORMACIONES[e.formacion].casillas.flatMap((c) => (e.asignacion[c.id] !== undefined ? [{ casillaId: c.id, jugadorId: e.asignacion[c.id]! }] : []));
}

/** Colocación de los titulares en el estado actual (la del dominio, igual que en el servidor). */
export function colocacionDe(e: EstadoCampo, p: ParametrosEquilibrado, posicionesDe?: (id: number) => readonly Posicion[]) {
  const titulares = titularesDe(e);
  const colocacion = titulares.flatMap((t) => (e.puntos[t.jugadorId] ? [{ jugadorId: t.jugadorId, ...e.puntos[t.jugadorId]! }] : []));
  return calcularColocacion(e.formacion, titulares, colocacion, p, posicionesDe);
}

/** Punto libre más cercano a `p` que queda a `minima` o más de todos los `otros` (búsqueda en anillos). */
export function puntoLibre(p: Punto, otros: readonly Punto[], minima: number): Punto {
  const libre = (q: Punto) => otros.every((o) => distancia(o, q) >= minima);
  const base = acotar(p);
  if (libre(base)) return base;
  for (let r = 2; r <= 4 * minima; r += 2) {
    let mejor: Punto | null = null;
    for (let i = 0; i < 32; i++) {
      const a = (2 * Math.PI * i) / 32;
      const q = acotar({ x: base.x + r * Math.cos(a), y: base.y + r * Math.sin(a) });
      if (libre(q) && (!mejor || distancia(q, base) < distancia(mejor, base))) mejor = q;
    }
    if (mejor) return mejor;
  }
  return base;
}

function casillaDe(e: EstadoCampo, jugadorId: number): string | undefined {
  return Object.entries(e.asignacion).find(([, id]) => id === jugadorId)?.[0];
}

/** Aplica el gesto de soltar al jugador `jugadorId` en `destino`. Devuelve el estado nuevo (o el mismo). */
export function soltar(e: EstadoCampo, jugadorId: number, destino: DestinoSoltar, o: OpcionesSoltar): EstadoCampo {
  if (destino.tipo === 'fuera') return e;
  const origen = casillaDe(e, jugadorId);
  const enBanquillo = e.banquillo.includes(jugadorId);

  const titular = (id: number) => casillaDe(e, id) !== undefined;
  if (destino.tipo === 'banquillo') {
    if (enBanquillo) return e;
    const sobre = destino.sobre !== undefined && e.banquillo.includes(destino.sobre) ? destino.sobre : undefined;
    const lleno = e.banquillo.length >= (o.maxBanquillo ?? 7);
    if (origen) {
      const puntos = { ...e.puntos };
      delete puntos[jugadorId];
      // Sobre un suplente (o con el banquillo lleno y sin hueco): intercambio, el suplente pasa a la casilla.
      if (sobre !== undefined) {
        return { ...e, asignacion: { ...e.asignacion, [origen]: sobre }, puntos, banquillo: e.banquillo.map((id) => (id === sobre ? jugadorId : id)) };
      }
      if (lleno) return e;
      return { ...e, asignacion: { ...e.asignacion, [origen]: undefined }, puntos, banquillo: [...e.banquillo, jugadorId] };
    }
    // Del resto de la plantilla al banquillo: ocupa el sitio de `sobre` o un hueco libre.
    if (o.bloqueados?.has(jugadorId)) return e;
    if (sobre !== undefined) return { ...e, banquillo: e.banquillo.map((id) => (id === sobre ? jugadorId : id)) };
    return lleno ? e : { ...e, banquillo: [...e.banquillo, jugadorId] };
  }

  if (destino.tipo === 'reserva') {
    // Del banquillo al resto de la plantilla; sobre otro jugador del resto, este entra en su sitio del banquillo.
    if (!enBanquillo) return e;
    const sobre = destino.sobre;
    const valido = sobre !== undefined && !titular(sobre) && !e.banquillo.includes(sobre) && !o.bloqueados?.has(sobre);
    return { ...e, banquillo: valido ? e.banquillo.map((id) => (id === jugadorId ? sobre! : id)) : e.banquillo.filter((id) => id !== jugadorId) };
  }

  if (o.bloqueados?.has(jugadorId)) return e;
  const p = acotar(destino.punto);
  const colocados = colocacionDe(e, o.parametros, o.posicionesDe).titulares;
  // ¿Encima de otra ficha?
  const encima = colocados
    .filter((t) => t.jugadorId !== jugadorId)
    .map((t) => ({ t, d: distancia(t, p) }))
    .filter((x) => x.d <= o.radioFicha)
    .sort((a, b) => a.d - b.d)[0]?.t;

  if (origen) {
    if (encima) {
      // Intercambio de dos titulares: casillas y puntos.
      const otro = encima.jugadorId;
      const puntos = { ...e.puntos };
      const pa = e.puntos[jugadorId];
      const pb = e.puntos[otro];
      delete puntos[jugadorId];
      delete puntos[otro];
      if (pb) puntos[jugadorId] = pb;
      if (pa) puntos[otro] = pa;
      return { ...e, asignacion: { ...e.asignacion, [origen]: otro, [encima.casillaId]: jugadorId }, puntos };
    }
    // Recolocación: al punto pedido o, si está muy cerca de otra ficha, al punto libre más cercano.
    const otros = colocados.filter((t) => t.jugadorId !== jugadorId);
    return { ...e, puntos: { ...e.puntos, [jugadorId]: puntoLibre(p, otros, o.parametros.colocacion.separacionMinima) } };
  }

  // Suplente o jugador del resto de la plantilla.
  if (encima) {
    const sale = encima.jugadorId;
    const puntos = { ...e.puntos };
    const suPunto = e.puntos[sale];
    delete puntos[sale];
    if (suPunto) puntos[jugadorId] = suPunto;
    const banquillo = enBanquillo ? e.banquillo.map((id) => (id === jugadorId ? sale : id)) : e.banquillo;
    return { ...e, asignacion: { ...e.asignacion, [encima.casillaId]: jugadorId }, puntos, banquillo };
  }
  // En una zona libre: solo si queda una casilla vacía.
  const vacia = FORMACIONES[e.formacion].casillas.find((c) => e.asignacion[c.id] === undefined);
  if (!vacia) return e;
  const otros = colocados;
  return {
    ...e,
    asignacion: { ...e.asignacion, [vacia.id]: jugadorId },
    puntos: { ...e.puntos, [jugadorId]: puntoLibre(p, otros, o.parametros.colocacion.separacionMinima) },
    banquillo: e.banquillo.filter((id) => id !== jugadorId),
  };
}

/** Mueve un titular `dx`, `dy` unidades (teclado). */
export function mover(e: EstadoCampo, jugadorId: number, dx: number, dy: number, o: OpcionesSoltar): EstadoCampo {
  const t = colocacionDe(e, o.parametros, o.posicionesDe).titulares.find((x) => x.jugadorId === jugadorId);
  if (!t) return e;
  const otros = colocacionDe(e, o.parametros, o.posicionesDe).titulares.filter((x) => x.jugadorId !== jugadorId);
  return { ...e, puntos: { ...e.puntos, [jugadorId]: puntoLibre({ x: t.x + dx, y: t.y + dy }, otros, o.parametros.colocacion.separacionMinima) } };
}

/**
 * Cambio de formación (FR-002a). Sin recolocaciones se aplica directamente; con ellas, devuelve
 * `requiereConfirmacion` y el estado que quedaría al aceptar: sin puntos y con los 11 titulares reasignados a
 * las casillas nuevas por demarcación (`autoAlineacion` restringida a ellos).
 */
export function cambiarFormacion(
  e: EstadoCampo,
  formacion: FormacionId,
  plantilla: readonly Jugador[],
  p: ParametrosEquilibrado,
): { requiereConfirmacion: boolean; estado: EstadoCampo } {
  const titulares = new Set(titularesDe(e).map((t) => t.jugadorId));
  const solo = plantilla.filter((j) => titulares.has(j.id));
  const a = autoAlineacion(solo, new Set(), p, { formaciones: [formacion] });
  const estado: EstadoCampo = { formacion, asignacion: Object.fromEntries(a.titulares.map((t) => [t.casillaId, t.jugadorId])), puntos: {}, banquillo: e.banquillo };
  return { requiereConfirmacion: Object.keys(e.puntos).length > 0, estado };
}
