/**
 * Colocación libre de los titulares (FR-034, FR-034b; research R13; data-model §4).
 *
 * - Cada titular tiene un punto `(x, y)` en coordenadas del equipo: el de la colocación o, si falta, el de
 *   su casilla en la formación de partida.
 * - Su posición efectiva es la de la zona que contiene el punto (el de la casilla `POR`, siempre `POR`).
 * - La formación es «personalizada» si algún titular está en una zona distinta de la de su casilla.
 * - Ofensividad y amplitud: ajuste sobre el perfil de la formación de partida (acotados a ±`limite`):
 *   `ofensividad = perfil.ofensividad + Σ (peso(línea efectiva) − peso(línea de su casilla)) + β · (x̄ − x̄ casillas) / 100`
 *   con pesos defensa −1, medio 0 y ataque +1, y
 *   `amplitud = perfil.amplitud + γ · (dispersión lateral − dispersión de las casillas) / 100`.
 *   Con la colocación de la propia formación, el ajuste es 0 (la tabla de la spec 001).
 * - Dos titulares en el mismo punto se separan `separacionMinima` unidades.
 */
import type { Posicion } from '../catalogo/tipos';
import type { ParametrosEquilibrado } from '../parametros/index';
import { FORMACIONES, type FormacionId } from './formaciones';
import { ANCHO_CAMPO, LARGO_CAMPO, zonaEn, type LineaZona, type Zona } from './zonas';

export interface PuntoColocacion {
  jugadorId: number;
  x: number;
  y: number;
}

export interface TitularColocado {
  jugadorId: number;
  casillaId: string;
  x: number;
  y: number;
  zona: Zona;
  posicionEfectiva: Posicion;
}

export interface Reparto {
  defensa: number;
  medio: number;
  ataque: number;
}

export interface ResultadoColocacion {
  titulares: TitularColocado[];
  personalizada: boolean;
  reparto: Reparto;
  ofensividad: number;
  amplitud: number;
  avisos: string[];
}

const PESO: Record<LineaZona, number> = { porteria: 0, defensa: -1, medio: 0, ataque: 1 };
const CENTRO_Y = ANCHO_CAMPO / 2;

const media = (v: readonly number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);
const dispersion = (ys: readonly number[]) => media(ys.map((y) => Math.abs(y - CENTRO_Y)));

/** Separa los puntos a menos de `minima` unidades de otro anterior (en y, hacia dentro del campo). */
function separar(puntos: { x: number; y: number }[], minima: number): void {
  for (let i = 1; i < puntos.length; i++) {
    for (let intentos = 0; intentos < 20; intentos++) {
      const p = puntos[i]!;
      const choca = puntos.slice(0, i).some((q) => Math.hypot(p.x - q.x, p.y - q.y) < minima);
      if (!choca) break;
      const abajo = p.y + minima <= ANCHO_CAMPO;
      p.y = abajo ? p.y + minima : p.y - minima;
    }
  }
}

/**
 * Posición efectiva en una zona: entre las que admite la zona, primero la natural del jugador que también es
 * de su casilla, luego la de su casilla, luego otra natural suya y, si no, la primera de la zona.
 */
function posicionEn(zona: Zona, deCasilla: readonly Posicion[], porJugador: readonly Posicion[] = []): Posicion {
  const admite = (p: Posicion) => zona.posicionesAdmitidas.includes(p);
  return (
    porJugador.find((p) => admite(p) && deCasilla.includes(p)) ??
    deCasilla.find(admite) ??
    porJugador.find(admite) ??
    zona.posicionesAdmitidas[0]!
  );
}

/**
 * Colocación de una alineación: puntos, zonas y posiciones efectivas, reparto, perfil calculado y avisos.
 * `posicionesDe` (opcional) permite elegir, en una zona con dos posiciones, la natural del jugador.
 */
export function calcularColocacion(
  formacion: FormacionId,
  titulares: readonly { casillaId: string; jugadorId: number }[],
  colocacion: readonly PuntoColocacion[] | undefined,
  p: ParametrosEquilibrado,
  posicionesDe?: (jugadorId: number) => readonly Posicion[],
): ResultadoColocacion {
  const f = FORMACIONES[formacion];
  const porJugador = new Map((colocacion ?? []).map((c) => [c.jugadorId, c]));
  const filas = titulares.flatMap((t) => {
    const casilla = f.casillas.find((c) => c.id === t.casillaId);
    return casilla ? [{ t, casilla }] : [];
  });
  const puntos = filas.map(({ t, casilla }) => {
    const c = porJugador.get(t.jugadorId);
    return c ? { x: Math.round(c.x), y: Math.round(c.y) } : { x: casilla.zona.x, y: casilla.zona.y };
  });
  separar(puntos, p.colocacion.separacionMinima);

  const colocados: TitularColocado[] = filas.map(({ t, casilla }, i) => {
    const { x, y } = puntos[i]!;
    const zona = zonaEn(x, y);
    const posicionEfectiva = casilla.id === 'POR' ? 'POR' : posicionEn(zona, casilla.posicionesAdmitidas, posicionesDe?.(t.jugadorId));
    return { jugadorId: t.jugadorId, casillaId: casilla.id, x, y, zona, posicionEfectiva };
  });

  const reparto: Reparto = { defensa: 0, medio: 0, ataque: 0 };
  let personalizada = false;
  let ajuste = 0;
  const xs: number[] = [];
  const xsCasillas: number[] = [];
  const ys: number[] = [];
  const ysCasillas: number[] = [];
  filas.forEach(({ casilla }, i) => {
    const c = colocados[i]!;
    if (casilla.id === 'POR') return;
    const zonaCasilla = zonaEn(casilla.zona.x, casilla.zona.y);
    if (c.zona.id !== zonaCasilla.id) personalizada = true;
    if (c.zona.linea !== 'porteria') reparto[c.zona.linea]++;
    ajuste += PESO[c.zona.linea] - PESO[zonaCasilla.linea];
    xs.push(c.x);
    xsCasillas.push(casilla.zona.x);
    ys.push(c.y);
    ysCasillas.push(casilla.zona.y);
  });

  const { beta, gamma, limite } = p.colocacion;
  const acotar = (v: number) => Math.max(-limite, Math.min(limite, Math.round(v)));
  const ofensividad = acotar(f.perfil.ofensividad + ajuste + (beta * (media(xs) - media(xsCasillas))) / 100);
  const amplitud = acotar(f.perfil.amplitud + (gamma * (dispersion(ys) - dispersion(ysCasillas))) / 100);

  const avisos: string[] = [];
  if (reparto.defensa < 3) avisos.push('Menos de 3 defensas');
  if (reparto.ataque > 5) avisos.push('Más de 5 delanteros');
  for (const [linea, nombre] of [
    ['defensa', 'la defensa'],
    ['medio', 'el centro del campo'],
    ['ataque', 'el ataque'],
  ] as const) {
    if (reparto[linea] === 0) avisos.push(`Nadie en ${nombre}`);
  }
  return { titulares: colocados, personalizada, reparto, ofensividad, amplitud, avisos };
}

/** Motivos por los que una colocación no es válida (FR-034a). */
export function validarColocacion(
  formacion: FormacionId,
  titulares: readonly { casillaId: string; jugadorId: number }[],
  colocacion: readonly PuntoColocacion[],
): string[] {
  const motivos: string[] = [];
  const ids = new Set(titulares.map((t) => t.jugadorId));
  const vistos = new Set<number>();
  for (const c of colocacion) {
    if (!ids.has(c.jugadorId) || vistos.has(c.jugadorId)) motivos.push('COLOCACION_INVALIDA');
    vistos.add(c.jugadorId);
    if (!Number.isInteger(c.x) || !Number.isInteger(c.y) || c.x < 0 || c.x > LARGO_CAMPO || c.y < 0 || c.y > ANCHO_CAMPO) {
      motivos.push('COLOCACION_FUERA_DEL_CAMPO');
    }
  }
  const f = FORMACIONES[formacion];
  const puntoDe = (t: { casillaId: string; jugadorId: number }) =>
    colocacion.find((c) => c.jugadorId === t.jugadorId) ?? f.casillas.find((c) => c.id === t.casillaId)?.zona;
  for (const t of titulares) {
    const q = puntoDe(t);
    if (!q) continue;
    const enPorteria = zonaEn(q.x, q.y).linea === 'porteria';
    if (t.casillaId === 'POR' && !enPorteria) motivos.push('PORTERO_FUERA_DE_PORTERIA');
    if (t.casillaId !== 'POR' && enPorteria) motivos.push('JUGADOR_EN_PORTERIA');
  }
  return [...new Set(motivos)];
}

/**
 * Posición efectiva de los titulares colocados fuera de la zona de su casilla (para los dorsales fijos,
 * FR-035): `undefined` para los que siguen en su casilla.
 */
export function posicionesColocadas(
  formacion: FormacionId,
  titulares: readonly { casillaId: string; jugadorId: number }[],
  colocacion: readonly PuntoColocacion[] | undefined,
  p: ParametrosEquilibrado,
): (jugadorId: number) => Posicion | undefined {
  if (!colocacion?.length) return () => undefined;
  const r = calcularColocacion(formacion, titulares, colocacion, p);
  const casillas = FORMACIONES[formacion].casillas;
  const movidas = new Map(
    r.titulares
      .filter((t) => {
        const c = casillas.find((x) => x.id === t.casillaId)!;
        return zonaEn(c.zona.x, c.zona.y).id !== t.zona.id;
      })
      .map((t) => [t.jugadorId, t.posicionEfectiva]),
  );
  return (id) => movidas.get(id);
}
