/**
 * Comprobaciones de la spec 003 (research R25; T032): 003/SC-001 a 003/SC-007. 003/SC-009 la compone `cli.ts`
 * con el resultado de las comprobaciones de las specs 001 y 002. Todas con semillas fijas.
 */
import { CASILLA_CENTRAL, calcularMedia, FORMACIONES, proponerLanzadores, type FormacionId, type Jugador, type Virtud } from '@fbd/domain';
import type { EquipoPartido, MetricasJugador } from '@fbd/engine';
import type { GrupoComprobaciones } from '../cli';
import { serieCore } from '../core';
import { clonar, equipoSintetico } from '../equipos';
import { mayorSignificativo, media, serie, type ResultadoSerie } from '../series';
import type { Comprobacion } from './partido';

/** Conducciones por equipo y partido del motor 2.0.0 (línea base de T003, `checklists/linea-base.md`). */
export const LINEA_BASE_CONDUCCIONES = 16.9;

const pct = (x: number) => `${(100 * x).toFixed(1)} %`;
const GRUPO: Record<string, string> = { normal: 'jugada', lejano: 'jugada', manoAMano: 'jugada', cabeza: 'cabeza', falta: 'falta', penalti: 'penalti', propia: 'propia' };

/**
 * Equipos de la serie base de la 003: un equipo sintético equilibrado y su clon. Son siempre los mismos objetos (y
 * las mismas ids de jugador), para comparar las métricas de un jugador entre series (SC-006 y SC-007).
 */
let equiposBase: { base: EquipoPartido; rival: EquipoPartido } | null = null;
function equipos003() {
  if (!equiposBase) {
    const base = equipoSintetico({ semilla: 'sc003' });
    equiposBase = { base, rival: clonar(base, 'b') };
  }
  return equiposBase;
}

/** Serie base de la 003, con métricas del equipo A. */
const cache = new Map<string, ResultadoSerie>();
function serieBase(n: number, semilla: number): ResultadoSerie {
  const clave = `${n}:${semilla}`;
  let r = cache.get(clave);
  if (!r) {
    const { base, rival } = equipos003();
    r = serie(base, rival, n, semilla, 'sc003', { metricas: true });
    cache.set(clave, r);
  }
  return r;
}
const cacheCore = new Map<string, ReturnType<typeof serieCore>>();
function core(n: number, semilla: number) {
  const clave = `${n}:${semilla}`;
  let r = cacheCore.get(clave);
  if (!r) {
    r = serieCore(n, semilla);
    cacheCore.set(clave, r);
  }
  return r;
}

/** Vacía las series guardadas (pruebas de determinismo). */
export function vaciarCaches(): void {
  cache.clear();
  cacheCore.clear();
}

/** SC-001 sobre una serie: media, 0-0, ≥ 6 goles y resultado más frecuente (con orden local-visitante). */
function dispersion(r: ResultadoSerie) {
  const goles = r.golesA.map((g, i) => g + r.golesB[i]!);
  const veces = new Map<string, number>();
  for (const x of r.resultados) veces.set(x, (veces.get(x) ?? 0) + 1);
  const [masFrecuente, cuantas] = [...veces.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['-', 0];
  return {
    media: media(goles),
    ceros: goles.filter((g) => g === 0).length,
    seis: goles.filter((g) => g >= 6).length,
    masFrecuente,
    cuota: cuantas / Math.max(1, r.n),
  };
}

export function comprobarSC001(n: number, semilla: number, conCore: boolean): Comprobacion[] {
  const fila = (id: string, nombre: string, r: ResultadoSerie, extra = { ok: true, detalle: '' }): Comprobacion => {
    const d = dispersion(r);
    const ok = d.media >= 2.6 && d.media <= 3.4 && d.ceros > 0 && d.seis > 0 && d.cuota <= 0.2 && extra.ok;
    return {
      id,
      descripcion: `${nombre}: media de 2,6–3,4 goles, hay 0-0 y partidos de ≥ 6 goles, ningún resultado > 20 %`,
      ok,
      detalle: `${d.media.toFixed(2)} goles por partido; ${d.ceros} 0-0 y ${d.seis} partidos de ≥ 6 goles en ${r.n}; más frecuente ${d.masFrecuente} (${pct(d.cuota)})${extra.detalle}`,
    };
  };
  const salida = [fila('003/SC-001', 'Serie sintética', serieBase(n, semilla))];
  if (conCore) {
    const c = core(n, semilla);
    const enRango = c.porTorneo.filter((m) => m >= 2.6 && m <= 3.4).length / Math.max(1, c.porTorneo.length);
    salida.push(
      fila('003/SC-001c', 'Serie Core', c.serie, {
        ok: enRango >= 0.9,
        detalle: `; ${pct(enRango)} de ${c.porTorneo.length} torneos con su media en 2,6–3,4 (≥ 90 %)`,
      }),
    );
  }
  return salida;
}

function reparto(r: ResultadoSerie) {
  const total = Math.max(1, r.goles.length);
  const fuera = r.goles.filter((g) => g.zonaRemate !== 'area');
  const tipos: Record<string, number> = {};
  for (const g of r.goles) tipos[GRUPO[g.tipo] ?? g.tipo] = (tipos[GRUPO[g.tipo] ?? g.tipo] ?? 0) + 1;
  return {
    total,
    fuera: fuera.length / total,
    frontalDeFuera: fuera.filter((g) => g.zonaRemate === 'frontal').length / Math.max(1, fuera.length),
    propioCampo: r.goles.filter((g) => g.distancia >= 53).length / total,
    tipo: (t: string) => (tipos[t] ?? 0) / total,
  };
}

export function comprobarSC002(n: number, semilla: number): Comprobacion {
  const d = reparto(serieBase(n, semilla));
  return {
    id: '003/SC-002',
    descripcion: 'Goles desde fuera del área: entre el 22 % y el 28 %, la mayoría a ≤ 25 m y ≤ 0,5 % desde el propio campo',
    ok: d.fuera >= 0.22 && d.fuera <= 0.28 && d.frontalDeFuera > 0.5 && d.propioCampo <= 0.005,
    detalle: `${pct(d.fuera)} fuera del área (de ellos ${pct(d.frontalDeFuera)} a ≤ 25 m); ${pct(d.propioCampo)} desde el propio campo; ${d.total} goles`,
  };
}

export function comprobarSC003(n: number, semilla: number): Comprobacion {
  const d = reparto(serieBase(n, semilla));
  const rangos: [string, string, number, number][] = [
    ['penalti', 'penalti', 0.06, 0.12],
    ['cabeza', 'cabeza', 0.1, 0.18],
    ['falta', 'falta directa', 0.05, 0.1],
    ['propia', 'propia puerta', 0.01, 0.03],
  ];
  return {
    id: '003/SC-003',
    descripcion: 'Variedad de goles: penaltis 6–12 %, cabeza 10–18 %, falta directa 5–10 % y propia puerta 1–3 %',
    ok: rangos.every(([t, , min, max]) => d.tipo(t) >= min && d.tipo(t) <= max),
    detalle: rangos.map(([t, nombre, min, max]) => `${nombre} ${pct(d.tipo(t))}${d.tipo(t) >= min && d.tipo(t) <= max ? '' : ' ✘'}`).join(' · ') + ` · jugada ${pct(d.tipo('jugada'))}`,
  };
}

const ambos = (r: ResultadoSerie) => [...r.estadisticasA, ...r.estadisticasB];

export function comprobarSC004(n: number, semilla: number): Comprobacion {
  const s = ambos(serieBase(n, semilla));
  const largos = s.reduce((a, e) => a + e.pasesLargos, 0) / Math.max(1, s.reduce((a, e) => a + e.pases, 0));
  const atras = media(s.map((e) => e.pasesLargosAtras));
  return {
    id: '003/SC-004',
    descripcion: 'Pases largos: ≤ 15 % de los pases y ≤ 0,5 largos hacia atrás por equipo y partido',
    ok: largos <= 0.15 && atras <= 0.5,
    detalle: `${pct(largos)} de pases largos; ${atras.toFixed(2)} largos hacia atrás por equipo y partido`,
  };
}

export function comprobarSC005(n: number, semilla: number): Comprobacion {
  const s = ambos(serieBase(n, semilla));
  const conducciones = media(s.map((e) => e.conducciones));
  const cortos = s.reduce((a, e) => a + e.pasesCortos, 0) / Math.max(1, s.reduce((a, e) => a + e.pases, 0));
  const objetivo = 1.3 * LINEA_BASE_CONDUCCIONES;
  return {
    id: '003/SC-005',
    descripcion: `Juego combinado: ≥ ${objetivo.toFixed(1)} conducciones por equipo y partido (+30 % sobre ${LINEA_BASE_CONDUCCIONES}) y ≥ 60 % de pases de menos de 20 m`,
    ok: conducciones >= objetivo && cortos >= 0.6,
    detalle: `${conducciones.toFixed(1)} conducciones por equipo y partido; ${pct(cortos)} de pases cortos`,
  };
}

/** Mismo equipo con un titular (por casilla) con stats y virtudes cambiadas; conserva su id. */
export function conTitular(equipo: EquipoPartido, casillaId: string, cambios: { stats?: Record<string, number>; virtudes?: Virtud[] }): EquipoPartido {
  const titulares = equipo.titulares.map((t) => {
    if (t.casillaId !== casillaId) return t;
    const j = t.jugador;
    const stats = { ...(j.stats as unknown as Record<string, number>) };
    for (const [k, d] of Object.entries(cambios.stats ?? {})) {
      if (stats[k] === undefined) throw new Error(`${j.demarcacion} no tiene el stat ${k}`);
      stats[k] = Math.max(1, Math.min(99, stats[k]! + d));
    }
    const nuevos = stats as unknown as Jugador['stats'];
    const jugador: Jugador = { ...j, stats: nuevos, media: calcularMedia({ demarcacion: j.demarcacion, stats: nuevos }), virtudes: [...j.virtudes, ...(cambios.virtudes ?? [])] };
    return { ...t, jugador };
  });
  return { ...equipo, titulares, lanzadores: proponerLanzadores(titulares.map((t) => t.jugador)) };
}

type Medida = (m: MetricasJugador) => number;
const sumaMetrica = (r: ResultadoSerie, id: number, f: Medida) => r.metricasA.map((p) => (p[id] ? f(p[id]!) : 0));
const cuotaEquipo = (r: ResultadoSerie, id: number, f: Medida) => {
  let suyo = 0;
  let total = 0;
  for (const p of r.metricasA) for (const [k, m] of Object.entries(p)) {
    total += f(m);
    if (Number(k) === id) suyo += f(m);
  }
  return total > 0 ? suyo / total : 0;
};

export function comprobarSC006(n: number, semilla: number): Comprobacion {
  const { base, rival } = equipos003();
  const sin = serieBase(n, semilla);
  const casos: { nombre: string; casilla: string; stats: Record<string, number>; medidas: [string, Medida, number][] }[] = [
    { nombre: 'regate', casilla: 'EI', stats: { regate: 15 }, medidas: [['regates', (m) => m.regates, 0.25]] },
    // En un centrocampista: el delantero centro ya concentra más de la mitad de los tiros de su equipo.
    { nombre: 'tiro', casilla: 'MC-2', stats: { disparo: 15 }, medidas: [['tiros', (m) => m.tirosArea + m.tirosFrontal + m.tirosLejos, 0.25]] },
    { nombre: 'defensa', casilla: 'DCI', stats: { tackling: 15, anticipacion: 15, marcaje: 15 }, medidas: [['acciones defensivas', (m) => m.intercepciones + m.entradasGanadas + m.recuperaciones, 0.2]] },
    { nombre: 'pase', casilla: 'MC-1', stats: { pase: 15 }, medidas: [['pases que rompen líneas', (m) => m.pasesRompeLineas, 0.15]] },
    {
      nombre: 'físico y velocidad',
      casilla: 'SD',
      stats: { velocidad: 15, agresividad: 15 },
      medidas: [
        ['duelos ganados', (m) => m.duelosGanados, 0.15],
        ['conducciones largas', (m) => m.conduccionesLargas, 0.15],
      ],
    },
  ];
  const partes: string[] = [];
  let ok = true;
  for (const c of casos) {
    const id = base.titulares.find((t) => t.casillaId === c.casilla)!.jugador.id;
    const con = serie(conTitular(base, c.casilla, { stats: c.stats }), rival, n, semilla, 'sc003', { metricas: true });
    for (const [nombre, f, minimo] of c.medidas) {
      const a = media(sumaMetrica(sin, id, f));
      const b = media(sumaMetrica(con, id, f));
      const aumento = a > 0 ? b / a - 1 : 0;
      const cuota = cuotaEquipo(con, id, f);
      const bien = aumento >= minimo && cuota <= 0.6;
      ok &&= bien;
      partes.push(`+15 ${c.nombre}: ${nombre} ${a.toFixed(2)} → ${b.toFixed(2)} (+${(100 * aumento).toFixed(0)} %, objetivo +${100 * minimo} %; cuota ${pct(cuota)})${bien ? '' : ' ✘'}`);
    }
  }
  return {
    id: '003/SC-006',
    descripcion: 'Stats en la elección: +15 de regate, tiro y defensa dan ≥ 25 %, ≥ 25 % y ≥ 20 % más de su acción; +15 de pase, ≥ 15 % más pases que rompen líneas; +15 de físico y velocidad, ≥ 15 % más duelos ganados y conducciones largas; cuota ≤ 60 %',
    ok,
    detalle: partes.join(' · '),
  };
}

export function comprobarSC007(n: number, semilla: number): Comprobacion {
  const { base, rival } = equipos003();
  const sin = serieBase(n, semilla);
  const golesFaltaEquipo = (r: ResultadoSerie) => r.estadisticasA.map((e) => e.golesPorTipo.falta);
  const casos: { virtud: Virtud; casilla: string; nombre: string; medida: (r: ResultadoSerie, id: number) => number[]; aumentoMinimo?: number }[] = [
    { virtud: 'LanzadorFaltas', casilla: 'MC-1', nombre: 'goles de falta directa', medida: (r) => golesFaltaEquipo(r), aumentoMinimo: 0.3 },
    { virtud: 'Cabeceador', casilla: 'DC', nombre: 'goles de cabeza del jugador', medida: (r, id) => sumaMetrica(r, id, (m) => m.golesCabeza) },
    { virtud: 'Matador', casilla: 'DC', nombre: 'goles del jugador', medida: (r, id) => sumaMetrica(r, id, (m) => m.goles) },
    { virtud: 'Rematador', casilla: 'DC', nombre: 'goles del jugador', medida: (r, id) => sumaMetrica(r, id, (m) => m.goles) },
    { virtud: 'Llegador', casilla: 'MC-1', nombre: 'goles del jugador', medida: (r, id) => sumaMetrica(r, id, (m) => m.goles) },
    { virtud: 'Desbordante', casilla: 'EI', nombre: 'regates intentados', medida: (r, id) => sumaMetrica(r, id, (m) => m.regates) },
    { virtud: 'Filigranas', casilla: 'EI', nombre: 'regates ganados', medida: (r, id) => sumaMetrica(r, id, (m) => m.regatesGanados) },
  ];
  let ok = true;
  const partes: string[] = [];
  for (const c of casos) {
    const id = base.titulares.find((t) => t.casillaId === c.casilla)!.jugador.id;
    const con = serie(conTitular(base, c.casilla, { virtudes: [c.virtud] }), rival, n, semilla, 'sc003', { metricas: true });
    const a = c.medida(sin, id);
    const b = c.medida(con, id);
    const aumento = media(a) > 0 ? media(b) / media(a) - 1 : 0;
    const bien = c.aumentoMinimo !== undefined ? aumento >= c.aumentoMinimo : mayorSignificativo(b, a);
    ok &&= bien;
    partes.push(`${c.virtud}: ${c.nombre} ${media(a).toFixed(3)} → ${media(b).toFixed(3)} (+${(100 * aumento).toFixed(0)} %)${bien ? '' : ' ✘'}`);
  }
  return {
    id: '003/SC-007',
    descripcion: 'Virtudes con efecto: Lanzador de faltas ≥ 30 % más goles de falta directa; el resto, diferencia significativa en su acción',
    ok,
    detalle: partes.join(' · '),
  };
}

/**
 * 003/SC-023 (hallazgo H11): en 3-4-3, 4-2-3-1 y 4-3-3, los extremos y mediapuntas (ED, EI y MCO, por la posición de su
 * casilla) marcan entre el 25 % y el 50 % de los goles de su equipo. Cinco equipos sintéticos distintos por formación,
 * para que el reparto no dependa de la calidad de un jugador concreto.
 */
export function comprobarSC023(n: number, semilla: number): Comprobacion {
  const EQUIPOS = 5;
  const partes: string[] = [];
  let ok = true;
  for (const formacion of ['3-4-3', '4-2-3-1', '4-3-3'] as FormacionId[]) {
    let total = 0;
    let llegadores = 0;
    for (let k = 0; k < EQUIPOS; k++) {
      const a = equipoSintetico({ formacion, semilla: `sc023-${formacion}-${k}`, participanteId: 'a' });
      const b = equipoSintetico({ formacion, semilla: `sc023-${formacion}-b${k}`, participanteId: 'b' });
      const posicion = new Map(
        a.titulares.map((t) => {
          const c = FORMACIONES[formacion].casillas.find((x) => x.id === t.casillaId)!;
          return [t.jugador.id, c.id === CASILLA_CENTRAL ? 'DCI' : c.posicionesAdmitidas[0]!] as const;
        }),
      );
      const r = serie(a, b, Math.max(1, Math.round(n / EQUIPOS)), semilla + k, `sc023-${formacion}-${k}`, { metricas: true });
      for (const m of r.metricasA) {
        for (const [id, met] of Object.entries(m)) {
          const goles = met.goles ?? 0;
          total += goles;
          if (['ED', 'EI', 'MCO'].includes(posicion.get(Number(id)) ?? '')) llegadores += goles;
        }
      }
    }
    const cuota = total ? (100 * llegadores) / total : 0;
    const cumple = cuota >= 25 && cuota <= 50;
    ok &&= cumple;
    partes.push(`${formacion}: ${cuota.toFixed(1)} % de ${total} goles${cumple ? '' : ' ✘'}`);
  }
  return {
    id: '003/SC-023',
    descripcion: 'Extremos y mediapuntas (ED, EI, MCO) marcan entre el 25 % y el 50 % de los goles en 3-4-3, 4-2-3-1 y 4-3-3',
    ok,
    detalle: partes.join(' · '),
  };
}

export function gruposPartido003(): GrupoComprobaciones[] {
  return [
    { ids: ['003/SC-001'], serie: 'sintetica', ejecutar: (o) => comprobarSC001(o.n, o.seed, false) },
    { ids: ['003/SC-001c'], serie: 'core', ejecutar: (o) => comprobarSC001(o.n, o.seed, true).slice(1) },
    { ids: ['003/SC-002'], serie: 'sintetica', ejecutar: (o) => [comprobarSC002(o.n, o.seed)] },
    { ids: ['003/SC-003'], serie: 'sintetica', ejecutar: (o) => [comprobarSC003(o.n, o.seed)] },
    { ids: ['003/SC-004'], serie: 'sintetica', ejecutar: (o) => [comprobarSC004(o.n, o.seed)] },
    { ids: ['003/SC-005'], serie: 'sintetica', ejecutar: (o) => [comprobarSC005(o.n, o.seed)] },
    { ids: ['003/SC-006'], serie: 'sintetica', ejecutar: (o) => [comprobarSC006(o.n, o.seed)] },
    { ids: ['003/SC-007'], serie: 'sintetica', ejecutar: (o) => [comprobarSC007(o.n, o.seed)] },
    { ids: ['003/SC-023'], serie: 'sintetica', ejecutar: (o) => [comprobarSC023(o.n, o.seed)] },
  ];
}
