/**
 * Comprobaciones del motor 7.0.0 (spec 014): mano a mano (SC-002), ida y vuelta (SC-003), fuera de juego (SC-004,
 * SC-005) y cansancio (SC-006). Series sintéticas equilibradas con semillas fijas.
 */
import { energiaDe, type EquipoPartido, type EstadoMotor, type JugadorEnPartido, type MetricasJugador } from '@fbd/engine';
import type { GrupoComprobaciones } from '../cli';
import { clonar, equipoSintetico } from '../equipos';
import { serie, type ResultadoSerie } from '../series';
import type { Comprobacion } from './partido';

const pct = (x: number) => `${(100 * x).toFixed(1)} %`;

/** Suma de un contador de las métricas de los jugadores del equipo A en toda la serie. */
function suma(r: ResultadoSerie, campo: keyof MetricasJugador): number {
  let t = 0;
  for (const m of r.metricasA) for (const j of Object.values(m)) t += j[campo];
  return t;
}

/** Fueras de juego por partido (de los dos equipos). */
const fuerasPorPartido = (r: ResultadoSerie) => r.estadisticasA.reduce((t, s, i) => t + s.fuerasDeJuego + r.estadisticasB[i]!.fuerasDeJuego, 0) / Math.max(1, r.n);

/** Mano a mano, ida y vuelta y fuera de juego (SC-002 a SC-005). */
function comprobacionesJugada014(n: number, semilla: number): Comprobacion[] {
  const base = equipoSintetico({ semilla: 'motor014' });
  const rival = clonar(base, 'b');
  const r = serie(base, rival, n, semilla, 'motor014', { metricas: true });
  const conLinea = { ...rival, tactica: { ...rival.tactica, lineaAdelantada: true } };
  const linea = serie(base, conLinea, n, semilla, 'motor014', { metricas: true });

  const disparo = suma(r, 'manoAManoDisparo');
  const tiros = suma(r, 'manoAManoTiro');
  const total = suma(r, 'manoAMano');
  const atras = suma(r, 'manoAManoPaseAtras');
  const idas = suma(r, 'idasVueltas');
  const fueras = fuerasPorPartido(r);
  // Fueras de juego que provoca el rival con y sin línea adelantada (los del equipo A).
  const sinL = r.estadisticasB.reduce((t, s) => t + s.fuerasDeJuegoProvocados, 0) / n;
  const conL = linea.estadisticasB.reduce((t, s) => t + s.fuerasDeJuegoProvocados, 0) / n;
  const pitados = suma(r, 'fuerasDeJuego') + suma(linea, 'fuerasDeJuego');
  const incoherentes = suma(r, 'fuerasDeJuegoIncoherentes') + suma(linea, 'fuerasDeJuegoIncoherentes');
  return [
    {
      id: '014/SC-002',
      descripcion: 'Mano a mano: ≥ 80 % de los que están a distancia de disparo acaban en tiro; < 2 % en pase atrás',
      ok: disparo > 0 && tiros / disparo >= 0.8 && atras / Math.max(1, total) < 0.02,
      detalle: `${total} mano a mano · a distancia de disparo ${disparo}, tiro ${pct(tiros / Math.max(1, disparo))} · pase atrás ${pct(atras / Math.max(1, total))}`,
    },
    {
      id: '014/SC-003',
      descripcion: 'Ida y vuelta: 0 secuencias A → B → A → B entre los mismos dos sin presión ni avance',
      ok: idas === 0,
      detalle: `${idas} secuencias en ${n} partidos`,
    },
    {
      id: '014/SC-004',
      descripcion: 'Fueras de juego: entre 1 y 6 por partido',
      ok: fueras >= 1 && fueras <= 6,
      detalle: `${fueras.toFixed(2)} por partido`,
    },
    {
      id: '014/SC-004b',
      descripcion: 'Línea adelantada: provoca ≥ 30 % más fueras de juego que sin ella',
      ok: sinL > 0 && conL >= 1.3 * sinL,
      detalle: `sin ${sinL.toFixed(2)} · con ${conL.toFixed(2)} por partido (${sinL > 0 ? `${((100 * (conL - sinL)) / sinL).toFixed(0)} %` : '—'})`,
    },
    {
      id: '014/SC-005',
      descripcion: 'Cada fuera de juego pitado: x del infractor > x del penúltimo defensor y > x del balón al salir el pase',
      ok: pitados > 0 && incoherentes === 0,
      detalle: `${incoherentes} incoherentes de ${pitados} pitados`,
    },
  ];
}

/** Perfiles de cansancio: el equipo A con todos sus titulares así. */
function perfil(base: EquipoPartido, nombre: 'normal' | 'presion' | 'fatigado' | 'incansable'): EquipoPartido {
  if (nombre === 'presion') return { ...base, tactica: { ...base.tactica, alturaBloque: 'presion_alta' } };
  if (nombre === 'normal') return base;
  return {
    ...base,
    titulares: base.titulares.map((t) => ({
      ...t,
      jugador: nombre === 'fatigado' ? { ...t.jugador, virtudes: [], defectos: ['Fatigado'] } : { ...t.jugador, virtudes: ['Incansable'], defectos: [] },
    })),
  };
}

const MINUTOS = [45, 75, 90, 120] as const;

/** Energía media de los titulares que siguen en el campo y acierto de pase por tramos (SC-006, M5.7). */
function medirCansancio(equipo: EquipoPartido, rival: EquipoPartido, n: number, semilla: number) {
  const energia: Record<number, number[]> = { 45: [], 75: [], 90: [], 120: [] };
  const acierto = { antes: [0, 0], final: [0, 0] };
  let anterior: number | null = null;
  const titulares = new Set(equipo.titulares.map((t) => t.jugador.id));
  const media = (e: EstadoMotor, lado: 'local' | 'visitante') => {
    const js = e.equipos[lado].jugadores.filter((j: JugadorEnPartido) => j.enCampo && titulares.has(j.jugador.id));
    return js.reduce((t, j) => t + energiaDe(e, j).energia, 0) / Math.max(1, js.length);
  };
  // Pases (completados, intentados) al 80' de cada partido, para restarlos al final del 90'.
  let al80: [number, number] | null = null;
  const cerrar90 = (e: EstadoMotor, ladoA: 'local' | 'visitante') => {
    const s = e.estadisticas[ladoA];
    energia[90]!.push(media(e, ladoA));
    if (al80) {
      acierto.final[0]! += s.pasesCompletados - al80[0];
      acierto.final[1]! += s.pases - al80[1];
    }
    al80 = null;
  };
  serie(equipo, rival, n, semilla, 'cansancio014', {
    eliminatoria: true,
    observador: (e, ladoA) => {
      const s = e.estadisticas[ladoA];
      const { parte, segundosEnParte } = e.reloj;
      // El 90 y el 120 al terminar la parte (descuento incluido).
      if (anterior !== null && anterior !== parte) {
        if (anterior === 2) cerrar90(e, ladoA);
        if (anterior === 4) energia[120]!.push(media(e, ladoA));
      }
      anterior = parte;
      if (parte === 1 && segundosEnParte === 45 * 60) energia[45]!.push(media(e, ladoA));
      if (parte === 2 && segundosEnParte === 30 * 60) energia[75]!.push(media(e, ladoA));
      // Acierto antes del inicio del cansancio (hasta el 55') y en los 10 últimos minutos del 90'.
      if (parte === 2 && segundosEnParte === 10 * 60) {
        acierto.antes[0]! += s.pasesCompletados;
        acierto.antes[1]! += s.pases;
      }
      if (parte === 2 && segundosEnParte === 35 * 60) al80 = [s.pasesCompletados, s.pases];
    },
    alTerminar: (final, ladoA) => {
      if (anterior === 2) cerrar90(final.estado, ladoA);
      if (anterior === 4) energia[120]!.push(media(final.estado, ladoA));
      anterior = null;
    },
  });
  const m = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
  return {
    energia: Object.fromEntries(MINUTOS.map((k) => [k, m(energia[k]!)])) as Record<(typeof MINUTOS)[number], number>,
    aciertoAntes: acierto.antes[0]! / Math.max(1, acierto.antes[1]!),
    aciertoFinal: acierto.final[0]! / Math.max(1, acierto.final[1]!),
  };
}

/** Cansancio (SC-006, M5.7). */
function comprobacionesCansancio014(n: number, semilla: number): Comprobacion[] {
  const base = equipoSintetico({ semilla: 'cansancio014' });
  const rival = clonar(base, 'b');
  const nombres = ['normal', 'presion', 'fatigado', 'incansable'] as const;
  const medidas = Object.fromEntries(nombres.map((p) => [p, medirCansancio(perfil(base, p), rival, Math.max(1, Math.round(n / 4)), semilla)])) as Record<
    (typeof nombres)[number],
    ReturnType<typeof medirCansancio>
  >;
  const normal = medidas.normal;
  const fila = (p: (typeof nombres)[number]) => `${p}: ${MINUTOS.map((k) => `${k}' ${Number.isNaN(medidas[p].energia[k]) ? '—' : medidas[p].energia[k].toFixed(0)}`).join(' ')}`;
  return [
    {
      id: '014/SC-006',
      descripcion: "Cansancio: sin rasgos, energía media 45–55 % al 90' (descuento incluido)",
      ok: normal.energia[90] >= 45 && normal.energia[90] <= 55,
      detalle: nombres.map(fila).join(' · '),
    },
    {
      id: '014/SC-006b',
      descripcion: "Cansancio: tras una prórroga, energía < 40 % (naranja o rojo)",
      ok: normal.energia[120] < 40,
      detalle: `normal 120' ${Number.isNaN(normal.energia[120]) ? '—' : normal.energia[120].toFixed(0)} %`,
    },
    {
      id: '014/SC-006c',
      // Con el mismo rival, lo que pierde el equipo que se cansa frente al mismo equipo Incansable en los 10 últimos
      // minutos (antes del inicio del cansancio los dos rinden igual).
      descripcion: "Cansancio: en los 10 últimos minutos, el equipo cansado acierta menos pases que el mismo equipo Incansable",
      ok: normal.aciertoFinal < medidas.incansable.aciertoFinal,
      detalle: `antes del inicio: normal ${pct(normal.aciertoAntes)}, incansable ${pct(medidas.incansable.aciertoAntes)} · últimos 10': normal ${pct(normal.aciertoFinal)}, incansable ${pct(medidas.incansable.aciertoFinal)}, presión alta ${pct(medidas.presion.aciertoFinal)}`,
    },
  ];
}

/** Comprobaciones del motor 7.0.0 (spec 014) para la herramienta. */
export function gruposMotor014(): GrupoComprobaciones[] {
  return [
    { ids: ['014/SC-002', '014/SC-003', '014/SC-004', '014/SC-004b', '014/SC-005'], serie: 'sintetica', ejecutar: (o) => comprobacionesJugada014(o.n, o.seed) },
    { ids: ['014/SC-006', '014/SC-006b', '014/SC-006c'], serie: 'sintetica', ejecutar: (o) => comprobacionesCansancio014(o.n, o.seed) },
  ];
}
