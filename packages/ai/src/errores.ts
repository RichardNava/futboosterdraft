/**
 * Errores creíbles de los NPC (spec 003, FR-037 a FR-037b; research R12, data-model §6).
 *
 * La dificultad sale de la calidad de las decisiones, no de ventajas en el motor: cada nivel comete, con la
 * probabilidad de `parametros.npc.errores`, errores que haría una persona (una carta que no encaja, un
 * titular peor, una táctica inoportuna…). Todos usan el PRNG con la semilla de la decisión, así que la
 * misma decisión repite el mismo error.
 *
 * Guardarraíl (`esErrorAdmisible`): un error se descarta, y se mantiene la decisión correcta, si deja una
 * alineación inválida, un portero fuera de la portería o un jugador de campo en ella, un cruce de
 * demarcación con penalización > 0,2 o una pérdida de fuerza mayor que `costeMaximo`.
 */
import {
  autoAlineacion,
  candidatos,
  FORMACIONES,
  LARGO_CAMPO,
  ANCHO_CAMPO,
  previsualizar,
  validarAlineacion,
  validarTactica,
  valorLanzamiento,
  zonaEn,
  type Alineacion,
  type Jugador,
  type ParametrosEquilibrado,
  type Rng,
  type Tactica,
} from '@fbd/domain';
import type { DecisionPartido, EstadoMotor, Lado } from '@fbd/engine';
import { FORMACIONES_BASICAS } from './perfiles';

/** Penalización máxima admitida en un cruce de demarcación provocado por un error. */
export const CRUCE_MAXIMO = 0.2;
/** Distancia máxima (en valor de carta) de la decisión dudosa del PRO a la mejor carta (FR-037b). */
export const DISTANCIA_DUDOSA = 1.5;

/** Virtudes de equipo (igual que el evaluador: su efecto no se acumula). */
const VIRTUDES_EQUIPO = new Set(['Capitania', 'Jerarquia', 'Libero', 'BoxToBox', 'FortalezaMental', 'Motivador', 'Carismatico']);

export interface ContextoErrores {
  plantilla: readonly Jugador[];
  bajas: ReadonlySet<number>;
  p: ParametrosEquilibrado;
  costeMaximo: number;
}

const porIdDe = (plantilla: readonly Jugador[]) => new Map(plantilla.map((j) => [j.id, j]));

/**
 * Fuerza de una alineación con su colocación: media efectiva de los titulares en la zona en la que juegan,
 * más la sinergia de las virtudes de equipo (como `fuerzaAlineacion`, pero mirando la colocación).
 */
export function fuerzaColocada(a: Alineacion, plantilla: readonly Jugador[], p: ParametrosEquilibrado): number {
  const porId = porIdDe(plantilla);
  const vista = previsualizar(a, (id) => porId.get(id)!, p);
  const total = vista.titulares.reduce((s, t) => s + t.media, 0);
  const equipo = new Set(a.titulares.flatMap((t) => porId.get(t.jugadorId)?.virtudes ?? []).filter((s) => VIRTUDES_EQUIPO.has(s)));
  return total / 11 + equipo.size * 0.5;
}

/** Penalización de cada titular en la zona en la que juega. */
function penalizaciones(a: Alineacion, plantilla: readonly Jugador[], p: ParametrosEquilibrado): Map<number, number> {
  const porId = porIdDe(plantilla);
  return new Map(previsualizar(a, (id) => porId.get(id)!, p).titulares.map((t) => [t.jugadorId, t.penalizacion]));
}

/** ¿Se puede aplicar el error? (guardarraíl de data-model §6). */
export function esErrorAdmisible(antes: Alineacion, despues: Alineacion, ctx: ContextoErrores): boolean {
  const { plantilla, bajas, p, costeMaximo } = ctx;
  if (validarAlineacion(despues, plantilla.map((j) => j.id), bajas).length > 0) return false;
  const porId = porIdDe(plantilla);
  // Portero en la portería y ningún jugador de campo en ella (la colocación ya la valida `validarAlineacion`).
  for (const t of despues.titulares) {
    const j = porId.get(t.jugadorId);
    if (!j) return false;
    if ((t.casillaId === 'POR') !== (j.demarcacion === 'POR')) return false;
  }
  // Ningún cruce nuevo con penalización > 0,2 (los que ya traía la decisión correcta no cuentan).
  const previas = penalizaciones(antes, plantilla, p);
  for (const [id, pen] of penalizaciones(despues, plantilla, p)) {
    if (pen > CRUCE_MAXIMO + 1e-9 && pen > (previas.get(id) ?? 0) + 1e-9) return false;
  }
  return fuerzaColocada(antes, plantilla, p) - fuerzaColocada(despues, plantilla, p) <= costeMaximo + 1e-9;
}

// ---------- Draft ----------

export interface CartaValorada {
  carta: Jugador;
  /** Valor de la carta para el NPC, sin ruido. */
  valor: number;
}

/**
 * Error de draft: una carta de más media que no encaja (vale menos para la plantilla) o, si no hay ninguna,
 * otra que encaja peor, con una pérdida de valor de como mucho `costeMaximo`. `null` si no hay ninguna.
 */
export function errorDraft(valoradas: readonly CartaValorada[], elegidaId: number, costeMaximo: number, rng: Rng): number | null {
  const elegida = valoradas.find((v) => v.carta.id === elegidaId);
  if (!elegida) return null;
  const asumibles = valoradas.filter((v) => v.carta.id !== elegidaId && v.valor <= elegida.valor && elegida.valor - v.valor <= costeMaximo + 1e-9);
  // Primero, las de más media que no encajan; si no hay (p. ej. quien solo mira la media), otra que encaja peor.
  const deMasMedia = asumibles.filter((v) => v.carta.media > elegida.carta.media);
  const opciones = deMasMedia.length ? deMasMedia : asumibles;
  return opciones.length ? rng.elegir(opciones).carta.id : null;
}

/** Decisión dudosa del PRO: la segunda mejor carta, si está a ≤ 1,5 puntos de la mejor. */
export function decisionDudosa(valoradas: readonly CartaValorada[]): number | null {
  const orden = [...valoradas].sort((a, b) => b.valor - a.valor || a.carta.id - b.carta.id);
  const [mejor, segunda] = orden;
  if (!mejor || !segunda) return null;
  return mejor.valor - segunda.valor <= DISTANCIA_DUDOSA + 1e-9 ? segunda.carta.id : null;
}

// ---------- Alineación ----------

/** Una formación básica que encaja peor que la elegida. */
export function errorFormacion(a: Alineacion, ctx: ContextoErrores, rng: Rng): Alineacion | null {
  const fuerza = fuerzaColocada(a, ctx.plantilla, ctx.p);
  for (const f of rng.barajar(FORMACIONES_BASICAS.filter((x) => x !== a.formacion))) {
    const otra = autoAlineacion(ctx.plantilla, ctx.bajas, ctx.p, { formaciones: [f], tactica: a.tactica });
    if (fuerzaColocada(otra, ctx.plantilla, ctx.p) < fuerza && esErrorAdmisible(a, otra, ctx)) return otra;
  }
  return null;
}

/** Deja en el banquillo a un titular por otro peor de su misma demarcación. */
export function errorAlineacion(a: Alineacion, ctx: ContextoErrores, rng: Rng): Alineacion | null {
  const porId = porIdDe(ctx.plantilla);
  const titulares = new Set(a.titulares.map((t) => t.jugadorId));
  const cambia = (id: number, sale: number, entra: number) => (id === sale ? entra : id);
  for (const t of rng.barajar(a.titulares.filter((x) => x.casillaId !== 'POR'))) {
    const sale = porId.get(t.jugadorId);
    if (!sale) continue;
    const peores = ctx.plantilla.filter(
      (j) => !titulares.has(j.id) && !ctx.bajas.has(j.id) && j.demarcacion === sale.demarcacion && j.media < sale.media,
    );
    for (const entra of rng.barajar(peores)) {
      const suplentes = a.suplentes.includes(entra.id) ? a.suplentes.map((id) => cambia(id, entra.id, sale.id)) : a.suplentes;
      const l = a.lanzadores;
      const otra: Alineacion = {
        ...a,
        titulares: a.titulares.map((x) => (x.jugadorId === sale.id ? { ...x, jugadorId: entra.id } : x)),
        suplentes,
        lanzadores: {
          penaltis: cambia(l.penaltis, sale.id, entra.id),
          faltas: cambia(l.faltas, sale.id, entra.id),
          corners: cambia(l.corners, sale.id, entra.id),
          tanda: l.tanda.map((id) => cambia(id, sale.id, entra.id)),
        },
        ...(a.colocacion ? { colocacion: a.colocacion.map((c) => (c.jugadorId === sale.id ? { ...c, jugadorId: entra.id } : c)) } : {}),
      };
      if (esErrorAdmisible(a, otra, ctx)) return otra;
    }
  }
  return null;
}

/** Desplazamientos a una zona contigua (las zonas miden unos 110–200 de largo y 110–130 de ancho). */
const DESPLAZAMIENTOS: readonly [number, number][] = [
  [130, 0],
  [-130, 0],
  [0, 120],
  [0, -120],
  [200, 0],
  [-200, 0],
];

/** Mueve a un titular a una posición contigua, fuera de la suya. */
export function errorColocacion(a: Alineacion, ctx: ContextoErrores, rng: Rng): Alineacion | null {
  const casillas = new Map(FORMACIONES[a.formacion].casillas.map((c) => [c.id, c]));
  for (const t of rng.barajar(a.titulares.filter((x) => x.casillaId !== 'POR'))) {
    const base = a.colocacion?.find((c) => c.jugadorId === t.jugadorId) ?? casillas.get(t.casillaId)?.zona;
    if (!base) continue;
    const zona = zonaEn(base.x, base.y);
    for (const [dx, dy] of rng.barajar(DESPLAZAMIENTOS)) {
      const x = Math.round(Math.min(LARGO_CAMPO, Math.max(0, base.x + dx)));
      const y = Math.round(Math.min(ANCHO_CAMPO, Math.max(0, base.y + dy)));
      const destino = zonaEn(x, y);
      if (destino.id === zona.id || destino.linea === 'porteria') continue;
      const otra: Alineacion = {
        ...a,
        colocacion: [...(a.colocacion ?? []).filter((c) => c.jugadorId !== t.jugadorId), { jugadorId: t.jugadorId, x, y }],
      };
      if (esErrorAdmisible(a, otra, ctx)) return otra;
    }
  }
  return null;
}

const velocidadMedia = (plantilla: readonly Jugador[]) => {
  const campo = plantilla.filter((j) => j.demarcacion !== 'POR');
  const v = campo.map((j) => (j.stats as unknown as Record<string, number>).velocidad ?? 0);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0;
};

/**
 * Táctica inoportuna: presión alta con la línea adelantada contra un rival más rápido, o encerrarse en el
 * catenaccio siendo mejor. `null` si ninguna de las dos tiene sentido o ya es la táctica elegida.
 */
export function errorTactica(a: Alineacion, ctx: ContextoErrores, rival: readonly Jugador[] | null, rng: Rng): Alineacion | null {
  if (!rival?.length) return null;
  const opciones: Tactica[] = [];
  if (velocidadMedia(rival) > velocidadMedia(ctx.plantilla)) {
    opciones.push({ ...a.tactica, alturaBloque: 'presion_alta', lineaAdelantada: true });
  }
  const propia = ctx.plantilla.reduce((s, j) => s + j.media, 0) / Math.max(1, ctx.plantilla.length);
  const ajena = rival.reduce((s, j) => s + j.media, 0) / rival.length;
  if (propia > ajena) opciones.push({ ...a.tactica, alturaBloque: 'catenaccio', lineaAdelantada: false });
  const validas = opciones.filter((t) => validarTactica(t).length === 0 && JSON.stringify(t) !== JSON.stringify(a.tactica));
  if (!validas.length) return null;
  const otra = { ...a, tactica: rng.elegir(validas) };
  return esErrorAdmisible(a, otra, ctx) ? otra : null;
}

/** Un lanzador de penaltis con peor remate que el elegido. */
export function errorLanzadores(a: Alineacion, ctx: ContextoErrores, rng: Rng): Alineacion | null {
  const porId = porIdDe(ctx.plantilla);
  const titulares = a.titulares.map((t) => porId.get(t.jugadorId)).filter((j): j is Jugador => !!j && j.demarcacion !== 'POR');
  const actual = porId.get(a.lanzadores.penaltis);
  if (!actual) return null;
  const valor = valorLanzamiento(actual, 'penaltis');
  // Entre los siguientes candidatos, uno con peor remate (el error creíble: el segundo o el tercero).
  const peores = candidatos(titulares, 'penaltis').filter((j) => j.id !== actual.id && valorLanzamiento(j, 'penaltis') < valor).slice(0, 3);
  if (!peores.length) return null;
  const otra = { ...a, lanzadores: { ...a.lanzadores, penaltis: rng.elegir(peores).id } };
  return esErrorAdmisible(a, otra, ctx) ? otra : null;
}

// ---------- Partido ----------

export type TipoErrorPartido = 'cambioTardio' | 'sinReaccion' | 'tacticaContraproducente';

/**
 * Error en el partido: un cambio tardío (no hace las sustituciones que tocaban), no reaccionar al marcador
 * (no cambia la táctica que tocaba) o un cambio de táctica contraproducente (encerrarse perdiendo, irse
 * arriba ganando). Devuelve las decisiones corregidas, o `null` si ninguno tiene sentido aquí.
 */
export function errorPartido(
  decisiones: readonly DecisionPartido[],
  estado: EstadoMotor,
  lado: Lado,
  tacticas: { ofensiva: Tactica; defensiva: Tactica },
  rng: Rng,
): { decisiones: DecisionPartido[]; tipo: TipoErrorPartido } | null {
  const opciones: { decisiones: DecisionPartido[]; tipo: TipoErrorPartido }[] = [];
  if (decisiones.some((d) => d.tipo === 'sustitucion')) {
    opciones.push({ tipo: 'cambioTardio', decisiones: decisiones.filter((d) => d.tipo !== 'sustitucion') });
  }
  if (decisiones.some((d) => d.tipo === 'tactica')) {
    opciones.push({ tipo: 'sinReaccion', decisiones: decisiones.filter((d) => d.tipo !== 'tactica') });
  }
  const equipo = estado.equipos[lado];
  const diferencia = estado.marcador[lado] - estado.marcador[lado === 'local' ? 'visitante' : 'local'];
  const contraria = diferencia < 0 ? tacticas.defensiva : diferencia > 0 ? tacticas.ofensiva : null;
  if (contraria && JSON.stringify(contraria) !== JSON.stringify(equipo.tactica)) {
    opciones.push({
      tipo: 'tacticaContraproducente',
      decisiones: [
        ...decisiones.filter((d) => d.tipo !== 'tactica'),
        { participanteId: equipo.participanteId, tipo: 'tactica', datos: { tactica: contraria } },
      ],
    });
  }
  return opciones.length ? rng.elegir(opciones) : null;
}
