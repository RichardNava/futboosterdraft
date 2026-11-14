#!/usr/bin/env tsx
/**
 * Sonda rápida de la spec 014 (para calibrar): goles, fueras de juego, mano a mano, idas y vueltas y energía al 90' en
 * N partidos entre equipos sintéticos.
 *
 *   pnpm --filter @fbd/balance exec tsx src/sonda014.ts --n 100 [--linea]
 */
import { energiaDe, type JugadorEnPartido } from '@fbd/engine';
import { clonar, equipoSintetico } from './equipos';
import { media, serie } from './series';

const args = process.argv.slice(2);
const n = Number(args[args.indexOf('--n') + 1] ?? 100) || 100;
const base = equipoSintetico({ semilla: 'sonda014' });
const a = args.includes('--linea') ? { ...base, tactica: { ...base.tactica, lineaAdelantada: true } } : base;
const b = clonar(base, 'b');
let energia = 0;
let nEnergia = 0;
const r = serie(a, b, n, 1, 'sonda014', {
  metricas: true,
  alTerminar: (final, ladoA) => {
    for (const j of final.estado.equipos[ladoA].jugadores as JugadorEnPartido[]) {
      if (!j.enCampo || j.entroDesdeBanquillo) continue;
      energia += energiaDe(final.estado, j).energia;
      nEnergia++;
    }
  },
});
const suma = (campo: string) => r.metricasA.reduce((t, m) => t + Object.values(m).reduce((u, x) => u + ((x as unknown as Record<string, number>)[campo] ?? 0), 0), 0);
const goles = r.golesA.map((g, i) => g + r.golesB[i]!);
console.log(`partidos ${n} · ${(r.ms / n).toFixed(0)} ms/partido`);
console.log(`goles/partido ${media(goles).toFixed(2)} · ≥6 de diferencia ${(r.golesA.filter((g, i) => Math.abs(g - r.golesB[i]!) >= 6).length / n * 100).toFixed(1)} %`);
console.log(`fueras de juego/partido (A+B) ${media(r.estadisticasA.map((s, i) => s.fuerasDeJuego + r.estadisticasB[i]!.fuerasDeJuego)).toFixed(2)} · provocados por A ${media(r.estadisticasA.map((s) => s.fuerasDeJuegoProvocados)).toFixed(2)}`);
console.log(`incoherentes ${suma('fuerasDeJuegoIncoherentes')}`);
const disparo = suma('manoAManoDisparo');
console.log(`mano a mano A: ${suma('manoAMano')} · a distancia ${disparo} · tiro ${suma('manoAManoTiro')} (${((100 * suma('manoAManoTiro')) / Math.max(1, disparo)).toFixed(1)} %) · pase atrás ${suma('manoAManoPaseAtras')} (${((100 * suma('manoAManoPaseAtras')) / Math.max(1, suma('manoAMano'))).toFixed(1)} %)`);
console.log(`idas y vueltas A ${suma('idasVueltas')}`);
console.log(`pases A/partido ${media(r.estadisticasA.map((s) => s.pases)).toFixed(1)} · completados ${(100 * r.estadisticasA.reduce((t, s) => t + s.pasesCompletados, 0) / Math.max(1, r.estadisticasA.reduce((t, s) => t + s.pases, 0))).toFixed(1)} %`);
console.log(`tiros A/partido ${media(r.estadisticasA.map((s) => s.tiros)).toFixed(1)} · energía media titulares al final ${(energia / Math.max(1, nEnergia)).toFixed(1)}`);
