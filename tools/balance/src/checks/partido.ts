/**
 * Comprobaciones estadísticas de partido (T078): SC-004, SC-005, SC-006 (con dirección), SC-007 y
 * SC-015. Todas usan semillas fijas, así que el resultado es reproducible.
 */
import type { EstadisticasEquipo } from '@fbd/engine';
import { clonar, conStatsDesplazados, conTresFueraDePosicion, equipoSintetico, type OpcionesEquipo } from '../equipos';
import { mayorSignificativo, media, serie } from '../series';

export interface Comprobacion {
  id: string;
  descripcion: string;
  ok: boolean;
  detalle: string;
}

const pct = (x: number, n: number) => `${((100 * x) / n).toFixed(1)} %`;
const col = (r: { estadisticasA: EstadisticasEquipo[] }, campo: keyof EstadisticasEquipo) => r.estadisticasA.map((e) => e[campo]);

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

export function comprobarSC005(n: number, semilla: number): Comprobacion {
  const base = equipoSintetico({ semilla: 'sc005' });
  const r = serie(base, conTresFueraDePosicion(clonar(base, 'b')), n, semilla, 'sc005');
  return {
    id: 'SC-005',
    descripcion: 'Posiciones naturales frente a 3 fuera de posición: gana ≥ 65 %',
    ok: r.victoriasA / n >= 0.65,
    detalle: `naturales ${pct(r.victoriasA, n)}, empates ${pct(r.empates, n)}, fuera de posición ${pct(r.victoriasB, n)}`,
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

export function comprobacionesPartido(n: number, semilla: number): Comprobacion[] {
  return [comprobarSC004(n, semilla), comprobarSC005(n, semilla), ...comprobarSC006(n, semilla), comprobarSC007(n, semilla), comprobarSC015(n, semilla)];
}
