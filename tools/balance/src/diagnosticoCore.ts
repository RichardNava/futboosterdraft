#!/usr/bin/env tsx
/**
 * Diagnóstico de calibración (T033): media de goles y reparto por tipo en la serie sintética y en la serie Core a
 * la vez, con parámetros cambiados al vuelo (`--set ruta=valor`, sobre una copia de los parámetros actuales).
 *
 *   pnpm --filter @fbd/balance exec tsx src/diagnosticoCore.ts --n 200 --set acciones.gol.normal=0.2
 */
import { parametrosActuales } from '@fbd/domain';
import { serieCore } from './core';
import { clonar, equipoSintetico } from './equipos';
import { media, serie, type ResultadoSerie } from './series';

const args = process.argv.slice(2);
const i = args.indexOf('--n');
const n = i >= 0 ? Number(args[i + 1]) : 200;
const p = parametrosActuales() as unknown as Record<string, unknown>;
args.forEach((a, k) => {
  if (a !== '--set') return;
  const [ruta, valor] = args[k + 1]!.split('=');
  const partes = ruta!.split('.');
  let o = p;
  for (const c of partes.slice(0, -1)) o = o[c] as Record<string, unknown>;
  o[partes[partes.length - 1]!] = Number(valor);
});

const GRUPO: Record<string, string> = { normal: 'jugada', lejano: 'jugada', manoAMano: 'jugada', cabeza: 'cabeza', falta: 'falta', penalti: 'penalti', propia: 'propia' };
function resumen(nombre: string, r: ResultadoSerie, extra = '') {
  const goles = r.golesA.map((g, j) => g + r.golesB[j]!);
  const tipos: Record<string, number> = {};
  for (const g of r.goles) tipos[GRUPO[g.tipo] ?? g.tipo] = (tipos[GRUPO[g.tipo] ?? g.tipo] ?? 0) + 1;
  const fuera = r.goles.filter((g) => g.zonaRemate !== 'area').length / Math.max(1, r.goles.length);
  const tiros = media([...r.estadisticasA, ...r.estadisticasB].map((e) => e.tiros));
  console.log(
    `${nombre}: ${media(goles).toFixed(2)} goles · tiros/equipo ${tiros.toFixed(1)} · fuera ${(100 * fuera).toFixed(1)} % · ` +
      Object.entries(tipos)
        .map(([t, v]) => `${t} ${((100 * v) / r.goles.length).toFixed(1)} %`)
        .join(' · ') +
      extra,
  );
}

const base = equipoSintetico({ semilla: 'diag' });
resumen('sintética', serie(base, clonar(base, 'b'), n, 1, 'diag'));
const c = serieCore(n, 1);
resumen('core', c.serie, ` · torneos ${c.porTorneo.map((x) => x.toFixed(2)).join(' ')}`);
