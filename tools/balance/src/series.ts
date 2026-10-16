/**
 * Series de partidos para el equilibrado (T090): N partidos con semillas reproducibles, alternando
 * quién juega en casa, y agregación de resultados y estadísticas por equipo.
 */
import { parametrosActuales, semillaDesdeTexto } from '@fbd/domain';
import { avanzar, crearPartido, type EquipoPartido, type EstadisticasEquipo } from '@fbd/engine';

export interface ResultadoSerie {
  n: number;
  victoriasA: number;
  victoriasB: number;
  empates: number;
  golesA: number[];
  golesB: number[];
  estadisticasA: EstadisticasEquipo[];
  estadisticasB: EstadisticasEquipo[];
  lesionesA: number;
  lesionesB: number;
  ms: number;
}

export function serie(a: EquipoPartido, b: EquipoPartido, n: number, semilla: number, etiqueta: string, eliminatoria = false): ResultadoSerie {
  const r: ResultadoSerie = { n, victoriasA: 0, victoriasB: 0, empates: 0, golesA: [], golesB: [], estadisticasA: [], estadisticasB: [], lesionesA: 0, lesionesB: 0, ms: 0 };
  const inicio = Date.now();
  const parametros = parametrosActuales();
  for (let i = 0; i < n; i++) {
    const aEnCasa = i % 2 === 0;
    const final = avanzar(
      crearPartido({
        version: parametros.version,
        parametros,
        semilla: semillaDesdeTexto(`${etiqueta}:${semilla + i}`),
        eliminatoria,
        local: aEnCasa ? a : b,
        visitante: aEnCasa ? b : a,
      }),
      'final',
    );
    const ga = aEnCasa ? final.marcador.local : final.marcador.visitante;
    const gb = aEnCasa ? final.marcador.visitante : final.marcador.local;
    r.golesA.push(ga);
    r.golesB.push(gb);
    if (ga > gb) r.victoriasA++;
    else if (gb > ga) r.victoriasB++;
    else r.empates++;
    const ea = aEnCasa ? final.estadisticas.local : final.estadisticas.visitante;
    const eb = aEnCasa ? final.estadisticas.visitante : final.estadisticas.local;
    r.estadisticasA.push(ea);
    r.estadisticasB.push(eb);
    r.lesionesA += ea.lesiones;
    r.lesionesB += eb.lesiones;
  }
  r.ms = Date.now() - inicio;
  return r;
}

export const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function errorEstandar(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = media(xs);
  const varianza = xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(varianza / xs.length);
}

/** `a` es significativamente mayor que `b` (diferencia de medias > 2 errores estándar). */
export function mayorSignificativo(a: number[], b: number[]): boolean {
  const diferencia = media(a) - media(b);
  const error = Math.sqrt(errorEstandar(a) ** 2 + errorEstandar(b) ** 2);
  return diferencia > 2 * error && diferencia > 0;
}
