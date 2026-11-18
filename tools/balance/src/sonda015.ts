#!/usr/bin/env tsx
/**
 * Sonda rápida de la spec 015 (para calibrar `decision.factores.regate` sin la serie de 1.000): SC-002a, SC-002b y las
 * conducciones y pases por partido de los dos equipos (003/SC-005, 002/SC-007a).
 *
 *   pnpm --filter @fbd/balance exec tsx src/sonda015.ts --n 200
 */
import { comprobarSC002a, comprobarSC002b } from './checks/motor015';
import { clonar, equipoSintetico } from './equipos';
import { media, serie } from './series';

const args = process.argv.slice(2);
const n = Number(args[args.indexOf('--n') + 1] ?? 200) || 200;
for (const c of [comprobarSC002a(n, 1), comprobarSC002b(n, 1)]) console.log(`${c.ok ? '✔' : '✘'} ${c.id} ${c.detalle}`);
const base = equipoSintetico({ semilla: 'sonda015' });
const r = serie(base, clonar(base, 'b'), n, 1, 'sonda015');
const porPartido = (f: (i: number) => number) => media(r.estadisticasA.map((_, i) => f(i)));
console.log(`conducciones/partido ${porPartido((i) => r.estadisticasA[i]!.conducciones + r.estadisticasB[i]!.conducciones).toFixed(1)} · pases completados/partido (A+B) ${porPartido((i) => r.estadisticasA[i]!.pasesCompletados + r.estadisticasB[i]!.pasesCompletados).toFixed(1)} · goles/partido ${media(r.golesA.map((g, i) => g + r.golesB[i]!)).toFixed(2)}`);
