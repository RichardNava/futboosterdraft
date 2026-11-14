/**
 * Frecuencias de tarjetas, penaltis y lesiones (spec 005, T078; FR-070 a FR-072, SC-011; research R1 y R2).
 *
 * Por partido (los dos equipos), en la serie sintética (`005/SC-011`) y en la Core (`005/SC-011b`): amarillas, rojas
 * (directas más doble amarilla), penaltis y lesiones, frente a sus objetivos ±20 %. El detalle muestra «actual 3.0.0 /
 * medido / objetivo» para cada magnitud.
 */
import { parametrosActuales } from '@fbd/domain';
import type { GrupoComprobaciones } from '../cli';
import { serieCore } from '../core';
import { clonar, equipoSintetico } from '../equipos';
import { serie, type ResultadoSerie } from '../series';
import type { Comprobacion } from './partido';

/** Objetivos por partido de FR-071. */
const OBJETIVOS_DISCIPLINA = { amarillas: 4, rojas: 0.2, penaltis: 0.35, lesiones: 0.35 } as const;
const TOLERANCIA = 0.2;

type Magnitud = keyof typeof OBJETIVOS_DISCIPLINA;

/** Amarillas, rojas, penaltis y lesiones por partido de una serie (los dos equipos). */
function frecuencias(r: ResultadoSerie): Record<Magnitud, number> {
  const suma = (f: (e: ResultadoSerie['estadisticasA'][number]) => number) =>
    (r.estadisticasA.reduce((a, e) => a + f(e), 0) + r.estadisticasB.reduce((a, e) => a + f(e), 0)) / Math.max(1, r.n);
  return {
    amarillas: suma((e) => e.amarillas),
    rojas: suma((e) => e.rojas),
    penaltis: r.penaltis / Math.max(1, r.n),
    lesiones: suma((e) => e.lesiones),
  };
}

function comprobacion(id: string, nombre: string, medido: Record<Magnitud, number>, actual: Record<Magnitud, number> | null): Comprobacion {
  const filas = (Object.keys(OBJETIVOS_DISCIPLINA) as Magnitud[]).map((m) => {
    const objetivo = OBJETIVOS_DISCIPLINA[m];
    const ok = Math.abs(medido[m] - objetivo) <= TOLERANCIA * objetivo;
    return { m, ok, texto: `${m} ${actual ? `${actual[m].toFixed(2)} / ` : ''}${medido[m].toFixed(2)} / ${objetivo} ${ok ? '✅' : '❌'}` };
  });
  return {
    id,
    descripcion: `${nombre}: amarillas 4, rojas 0,20, penaltis 0,35 y lesiones 0,35 por partido (±20 %)${actual ? '; actual 3.0.0 / medido / objetivo' : '; medido / objetivo'}`,
    ok: filas.every((f) => f.ok),
    detalle: filas.map((f) => f.texto).join(' · '),
  };
}

/** 005/SC-011 en la serie sintética con los parámetros actuales. */
function comprobarSC011Sintetica(n: number, semilla: number): Comprobacion {
  const base = equipoSintetico({ semilla: 'disciplina-005' });
  const rival = clonar(base, 'b');
  // Desde la 7.0.0 (spec 014, research R14) la 3.0.0 ya no se simula: sin columna «actual».
  const medido = frecuencias(serie(base, rival, n, semilla, 'disciplina-005', { parametros: parametrosActuales() }));
  return comprobacion('005/SC-011', `Serie sintética, parámetros ${parametrosActuales().version}`, medido, null);
}

/** 005/SC-011b en la serie Core (plantillas draftadas por NPC). */
function comprobarSC011Core(n: number, semilla: number): Comprobacion {
  return comprobacion('005/SC-011b', `Serie Core (NPC avanzados), parámetros ${parametrosActuales().version}`, frecuencias(serieCore(n, semilla).serie), null);
}

/** Comprobaciones de disciplina y lesiones (spec 005) para la herramienta. */
export function gruposDisciplina(): GrupoComprobaciones[] {
  return [
    { ids: ['005/SC-011'], serie: 'sintetica', ejecutar: (o) => [comprobarSC011Sintetica(o.n, o.seed)] },
    { ids: ['005/SC-011b'], serie: 'core', ejecutar: (o) => [comprobarSC011Core(o.n, o.seed)] },
  ];
}
