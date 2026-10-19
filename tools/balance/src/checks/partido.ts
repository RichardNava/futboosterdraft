/**
 * Comprobaciones estadísticas de partido (T078, T074): SC-004, SC-006 (con dirección), SC-007 y SC-015 de
 * la spec 001, y SC-007 y SC-008 de la spec 002 (el partido 2D parece fútbol y los stats de pase se notan).
 * SC-005 lo sustituye SC-011 de la spec 002 (checks/colocacion.ts). Todas usan semillas fijas, así que el
 * resultado es reproducible.
 */
import type { EstadisticasEquipo } from '@fbd/engine';
import type { GrupoComprobaciones } from '../cli';
import { clonar, conPaseDeMedios, conStatsDesplazados, equipoSintetico, type OpcionesEquipo } from '../equipos';
import { mayorSignificativo, media, serie } from '../series';

export interface Comprobacion {
  id: string;
  descripcion: string;
  ok: boolean;
  detalle: string;
}

const pct = (x: number, n: number) => `${((100 * x) / n).toFixed(1)} %`;
/** Campos numéricos de las estadísticas (todos menos el histograma de secuencias y los repartos de goles). */
type Campo = Exclude<keyof EstadisticasEquipo, 'secuencias' | 'golesPorTipo' | 'golesPorZona'>;
const col = (r: { estadisticasA: EstadisticasEquipo[] }, campo: Campo) => r.estadisticasA.map((e) => e[campo]);

export function comprobarSC004(n: number, semilla: number): Comprobacion {
  const base = equipoSintetico({ semilla: 'sc004' });
  const r = serie(conStatsDesplazados(base, 5), base, n, semilla, 'sc004');
  const ok = r.victoriasA / n >= 0.6 && r.victoriasB / n >= 0.1;
  return {
    id: 'SC-004',
    descripcion: '+5 de media: el mejor gana ≥ 60 % y el peor ≥ 10 %',
    ok,
    detalle: `mejor ${pct(r.victoriasA, n)}, empates ${pct(r.empates, n)}, peor ${pct(r.victoriasB, n)}`,
  };
}

/** Serie de un equipo con una configuración frente al rival de referencia (4-4-2, táctica por defecto). */
function frente(opciones: OpcionesEquipo, n: number, semilla: number, etiqueta: string) {
  const rivalRef = equipoSintetico({ semilla: 'referencia', participanteId: 'rival' });
  return serie(equipoSintetico({ semilla: 'sc006', ...opciones }), rivalRef, n, semilla, etiqueta);
}

export function comprobarSC006(n: number, semilla: number): Comprobacion[] {
  const f343 = frente({ formacion: '3-4-3' }, n, semilla, 'f343');
  const f442 = frente({ formacion: '4-4-2' }, n, semilla, 'f442');
  const f541 = frente({ formacion: '5-4-1' }, n, semilla, 'f541');
  const presion = frente({ tactica: { alturaBloque: 'presion_alta' } }, n, semilla, 'presion');
  const catenaccio = frente({ tactica: { alturaBloque: 'catenaccio' } }, n, semilla, 'catenaccio');
  const linea = frente({ tactica: { lineaAdelantada: true } }, n, semilla, 'linea');
  const contra = frente({ tactica: { estiloConBalon: 'contraataque' } }, n, semilla, 'contra');
  const combinativo = frente({ tactica: { estiloConBalon: 'combinativo' } }, n, semilla, 'combinativo');
  const base = f442;

  const gf = (r: typeof base) => r.golesA;
  const gc = (r: typeof base) => r.golesB;
  const fmt = (r: typeof base) => `GF ${media(r.golesA).toFixed(2)} / GC ${media(r.golesB).toFixed(2)}`;
  return [
    {
      id: 'SC-006a',
      descripcion: 'Formación: goles a favor y en contra crecen con la ofensividad (3-4-3 > 4-4-2 > 5-4-1)',
      ok:
        mayorSignificativo(gf(f343), gf(f442)) &&
        mayorSignificativo(gf(f442), gf(f541)) &&
        mayorSignificativo(gc(f343), gc(f442)) &&
        mayorSignificativo(gc(f442), gc(f541)),
      detalle: `3-4-3 ${fmt(f343)} · 4-4-2 ${fmt(f442)} · 5-4-1 ${fmt(f541)}`,
    },
    {
      id: 'SC-006b',
      descripcion: 'Presión alta: más recuperaciones en campo rival y más cansancio que Bloque medio',
      ok:
        mayorSignificativo(col(presion, 'recuperacionesCampoRival'), col(base, 'recuperacionesCampoRival')) &&
        mayorSignificativo(col(presion, 'cansancioMedio'), col(base, 'cansancioMedio')),
      detalle: `recuperaciones en campo rival ${media(col(presion, 'recuperacionesCampoRival')).toFixed(1)} vs ${media(col(base, 'recuperacionesCampoRival')).toFixed(1)}; cansancio ${media(col(presion, 'cansancioMedio')).toFixed(3)} vs ${media(col(base, 'cansancioMedio')).toFixed(3)}`,
    },
    {
      id: 'SC-006c',
      descripcion: 'Catenaccio: menos posesión en campo rival y menos goles en contra que Bloque medio',
      ok:
        mayorSignificativo(col(base, 'posesionCampoRival'), col(catenaccio, 'posesionCampoRival')) &&
        mayorSignificativo(gc(base), gc(catenaccio)),
      detalle: `posesión en campo rival ${media(col(catenaccio, 'posesionCampoRival')).toFixed(1)} % vs ${media(col(base, 'posesionCampoRival')).toFixed(1)} %; GC ${media(gc(catenaccio)).toFixed(2)} vs ${media(gc(base)).toFixed(2)}`,
    },
    {
      id: 'SC-006d',
      descripcion: 'Línea adelantada: más fueras de juego provocados',
      ok: mayorSignificativo(col(linea, 'fuerasDeJuegoProvocados'), col(base, 'fuerasDeJuegoProvocados')),
      detalle: `${media(col(linea, 'fuerasDeJuegoProvocados')).toFixed(2)} vs ${media(col(base, 'fuerasDeJuegoProvocados')).toFixed(2)} por partido`,
    },
    {
      id: 'SC-006e',
      descripcion: 'Contraataque: menos posesión; Juego combinativo: más',
      ok: mayorSignificativo(col(base, 'posesion'), col(contra, 'posesion')) && mayorSignificativo(col(combinativo, 'posesion'), col(base, 'posesion')),
      detalle: `contraataque ${media(col(contra, 'posesion')).toFixed(1)} % · equilibrado ${media(col(base, 'posesion')).toFixed(1)} % · combinativo ${media(col(combinativo, 'posesion')).toFixed(1)} %`,
    },
  ];
}

export function comprobarSC007(n: number, semilla: number): Comprobacion {
  const base = equipoSintetico({ semilla: 'sc007' });
  const r = serie(base, clonar(base, 'b'), n, semilla, 'sc007');
  const goles = r.golesA.map((g, i) => g + r.golesB[i]!);
  const m = media(goles);
  const goleadas = goles.filter((g) => g >= 8).length / n;
  return {
    id: 'SC-007',
    descripcion: 'Entre equipos equilibrados: 2,0–3,5 goles por partido y < 2 % con 8 o más',
    ok: m >= 2 && m <= 3.5 && goleadas < 0.02,
    detalle: `${m.toFixed(2)} goles por partido; ${(goleadas * 100).toFixed(1)} % con 8 o más`,
  };
}

export function comprobarSC015(n: number, semilla: number): Comprobacion {
  const robustos = equipoSintetico({ semilla: 'sc015', specials: ['Robusto'] });
  const normales = equipoSintetico({ semilla: 'sc015', participanteId: 'b' });
  // Cuatro veces más partidos: las lesiones son poco frecuentes.
  const r = serie(robustos, normales, n * 4, semilla, 'sc015');
  const reduccion = r.lesionesB > 0 ? 1 - r.lesionesA / r.lesionesB : 0;
  return {
    id: 'SC-015',
    descripcion: 'Robusto reduce las lesiones un 30 % o más',
    ok: reduccion >= 0.3,
    detalle: `lesiones con Robusto ${r.lesionesA}, sin Robusto ${r.lesionesB} (reducción ${(reduccion * 100).toFixed(0)} %)`,
  };
}

/**
 * 002/SC-007: entre equipos equilibrados con la táctica por defecto, de media entre los dos equipos, las
 * estadísticas de un partido de fútbol de verdad.
 */
export function comprobarSC007Partido2D(n: number, semilla: number): Comprobacion[] {
  const base = equipoSintetico({ semilla: 'sc007-2d' });
  const r = serie(base, clonar(base, 'b'), n, semilla, 'sc007-2d');
  const ambos = (campo: Campo) => media(r.estadisticasA.map((e, i) => e[campo] + r.estadisticasB[i]![campo]));
  let posesiones = 0;
  let largas = 0;
  for (const e of [...r.estadisticasA, ...r.estadisticasB]) {
    for (const [pases, cuantas] of Object.entries(e.secuencias)) {
      posesiones += cuantas;
      if (Number(pases) >= 3) largas += cuantas;
    }
  }
  const umbrales: [Campo, string, number][] = [
    ['pasesCompletados', 'pases completados', 150],
    ['centros', 'centros', 10],
    ['tiros', 'tiros', 15],
    ['conducciones', 'conducciones', 30],
    ['paredes', 'paredes', 3],
    ['cambiosOrientacion', 'cambios de orientación', 5],
    ['contraataques', 'contraataques', 3],
  ];
  const valores = umbrales.map(([campo, nombre, minimo]) => ({ nombre, minimo, valor: ambos(campo) }));
  const proporcion = posesiones ? largas / posesiones : 0;
  return [
    {
      id: '002/SC-007a',
      descripcion: 'Partido 2D entre equipos equilibrados: ≥ 150 pases completados, 10 centros, 15 tiros, 30 conducciones, 3 paredes, 5 cambios de orientación y 3 contraataques',
      ok: valores.every((v) => v.valor >= v.minimo),
      detalle: valores.map((v) => `${v.nombre} ${v.valor.toFixed(1)}${v.valor >= v.minimo ? '' : ` (< ${v.minimo})`}`).join(' · '),
    },
    {
      id: '002/SC-007b',
      descripcion: 'Al menos el 30 % de las posesiones con 3 o más pases seguidos',
      ok: proporcion >= 0.3,
      detalle: `${(proporcion * 100).toFixed(1)} % de ${posesiones} posesiones`,
    },
  ];
}

/** 002/SC-008: +10 de pase en los centrocampistas titulares → ≥ 10 % más pases completados (en número absoluto). */
export function comprobarSC008Pase(n: number, semilla: number): Comprobacion {
  const base = equipoSintetico({ semilla: 'sc008-2d' });
  const rival = equipoSintetico({ semilla: 'referencia', participanteId: 'rival' });
  const sin = serie(base, rival, n, semilla, 'sc008-2d');
  const con = serie(conPaseDeMedios(base, 10), rival, n, semilla, 'sc008-2d');
  const a = media(col(sin, 'pasesCompletados'));
  const b = media(col(con, 'pasesCompletados'));
  const aumento = a > 0 ? b / a - 1 : 0;
  return {
    id: '002/SC-008',
    descripcion: '+10 de pase en los centrocampistas titulares: ≥ 10 % más pases completados',
    ok: aumento >= 0.1,
    detalle: `${b.toFixed(1)} frente a ${a.toFixed(1)} pases completados por partido (+${(aumento * 100).toFixed(1)} %)`,
  };
}

/** Grupos del registro de `cli.ts` (T001): se pueden filtrar con `--solo` sin ejecutar los demás. */
export function gruposPartido(): GrupoComprobaciones[] {
  return [
    { ids: ['SC-004'], serie: 'sintetica', ejecutar: (o) => [comprobarSC004(o.n, o.seed)] },
    { ids: ['SC-006a', 'SC-006b', 'SC-006c', 'SC-006d', 'SC-006e'], serie: 'sintetica', ejecutar: (o) => comprobarSC006(o.n, o.seed) },
    { ids: ['SC-007'], serie: 'sintetica', ejecutar: (o) => [comprobarSC007(o.n, o.seed)] },
    { ids: ['SC-015'], serie: 'sintetica', ejecutar: (o) => [comprobarSC015(o.n, o.seed)] },
    { ids: ['002/SC-007a', '002/SC-007b'], serie: 'sintetica', ejecutar: (o) => comprobarSC007Partido2D(o.n, o.seed) },
    { ids: ['002/SC-008'], serie: 'sintetica', ejecutar: (o) => [comprobarSC008Pase(o.n, o.seed)] },
  ];
}

export function comprobacionesPartido(n: number, semilla: number): Comprobacion[] {
  // 001/SC-005 lo sustituye SC-011 de la spec 002 (checks/colocacion.ts).
  return [
    comprobarSC004(n, semilla),
    ...comprobarSC006(n, semilla),
    comprobarSC007(n, semilla),
    comprobarSC015(n, semilla),
    ...comprobarSC007Partido2D(n, semilla),
    comprobarSC008Pase(n, semilla),
  ];
}
