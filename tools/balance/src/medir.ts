#!/usr/bin/env tsx
/**
 * Medición descriptiva de una serie de partidos entre equipos sintéticos equilibrados con la táctica por
 * defecto (T003, T033): goles por partido, dispersión de resultados, reparto de los goles por tipo y por
 * zona y volumen de pases, conducciones, tiros y centros por equipo y partido.
 *
 *   pnpm --filter @fbd/balance exec tsx src/medir.ts --n 1000 [--seed 1] [--json]
 */
import { parametrosActuales, semillaDesdeTexto } from '@fbd/domain';
import { avanzar, crearPartido, type EstadisticasEquipo, type EventoPartido } from '@fbd/engine';
import { clonar, equipoSintetico } from './equipos';

export interface Medicion {
  n: number;
  golesPorPartido: number;
  pct00: number;
  pct6oMas: number;
  resultadoMasFrecuente: { resultado: string; pct: number };
  golesPorTipo: Record<string, number>;
  golesPorZona: Record<string, number>;
  porEquipo: { pases: number; pasesCompletados: number; conducciones: number; tiros: number; centros: number; pasesCortos?: number; pasesLargos?: number; pasesLargosAtras?: number };
  msPorPartido: number;
}

const GRUPO: Record<string, string> = { normal: 'jugada', lejano: 'jugada', manoAMano: 'jugada', cabeza: 'cabeza', falta: 'falta', penalti: 'penalti', propia: 'propia' };

export function medir(n: number, semilla = 1, etiqueta = 'medir'): Medicion {
  const base = equipoSintetico({ semilla: 'medir' });
  const otro = clonar(base, 'b');
  const parametros = parametrosActuales();
  const resultados = new Map<string, number>();
  const tipos: Record<string, number> = {};
  const zonas: Record<string, number> = {};
  const stats: EstadisticasEquipo[] = [];
  let goles = 0;
  let ceros = 0;
  let seisOMas = 0;
  const inicio = Date.now();
  for (let i = 0; i < n; i++) {
    const aEnCasa = i % 2 === 0;
    const r = avanzar(
      crearPartido({
        version: parametros.version,
        parametros,
        semilla: semillaDesdeTexto(`${etiqueta}:${semilla + i}`),
        eliminatoria: false,
        local: aEnCasa ? base : otro,
        visitante: aEnCasa ? otro : base,
      }),
      'final',
    );
    const total = r.marcador.local + r.marcador.visitante;
    goles += total;
    if (total === 0) ceros++;
    if (total >= 6) seisOMas++;
    const clave = `${r.marcador.local}-${r.marcador.visitante}`;
    resultados.set(clave, (resultados.get(clave) ?? 0) + 1);
    for (const ev of r.eventos as EventoPartido[]) {
      if (ev.tipo !== 'gol') continue;
      const t = GRUPO[String(ev.datos.tipo)] ?? String(ev.datos.tipo);
      tipos[t] = (tipos[t] ?? 0) + 1;
      if (ev.datos.zonaRemate) zonas[String(ev.datos.zonaRemate)] = (zonas[String(ev.datos.zonaRemate)] ?? 0) + 1;
    }
    stats.push(r.estadisticas.local, r.estadisticas.visitante);
  }
  const [resultado, veces] = [...resultados.entries()].sort((a, b) => b[1] - a[1])[0]!;
  const m = (f: (e: EstadisticasEquipo) => number) => stats.reduce((a, e) => a + f(e), 0) / stats.length;
  const extra = stats[0] as EstadisticasEquipo & { pasesCortos?: number; pasesLargos?: number; pasesLargosAtras?: number };
  const pct = (x: number) => Math.round((1000 * x) / Math.max(1, goles)) / 10;
  return {
    n,
    golesPorPartido: goles / n,
    pct00: (100 * ceros) / n,
    pct6oMas: (100 * seisOMas) / n,
    resultadoMasFrecuente: { resultado, pct: (100 * veces) / n },
    golesPorTipo: Object.fromEntries(Object.entries(tipos).map(([k, v]) => [k, pct(v)])),
    golesPorZona: Object.fromEntries(Object.entries(zonas).map(([k, v]) => [k, pct(v)])),
    porEquipo: {
      pases: m((e) => e.pases),
      pasesCompletados: m((e) => e.pasesCompletados),
      conducciones: m((e) => e.conducciones),
      tiros: m((e) => e.tiros),
      centros: m((e) => e.centros),
      ...(extra && 'pasesCortos' in extra
        ? {
            pasesCortos: m((e) => (e as typeof extra).pasesCortos ?? 0),
            pasesLargos: m((e) => (e as typeof extra).pasesLargos ?? 0),
            pasesLargosAtras: m((e) => (e as typeof extra).pasesLargosAtras ?? 0),
          }
        : {}),
    },
    msPorPartido: (Date.now() - inicio) / n,
  };
}

const esPrincipal = process.argv[1]?.replace(/\\/g, '/').endsWith('balance/src/medir.ts');
if (esPrincipal) {
  const args = process.argv.slice(2);
  const valor = (k: string, d: number) => {
    const i = args.indexOf(k);
    return i >= 0 ? Number(args[i + 1]) : d;
  };
  const r = medir(valor('--n', 1000), valor('--seed', 1));
  console.log(JSON.stringify(r, null, 2));
}
