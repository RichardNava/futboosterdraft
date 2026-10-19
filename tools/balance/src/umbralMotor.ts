#!/usr/bin/env tsx
/**
 * Umbral de rendimiento del motor (FR-028a; T158; spec 003 T037): media de partidos completos sin fotogramas
 * ≤ 25 ms, con métricas ≤ 30 ms y `resolverResto` desde el minuto 0 ≤ 30 ms. Termina con código 1 si se supera alguno.
 *
 *   pnpm --filter @fbd/balance umbral-motor            (20 partidos)
 *   pnpm --filter @fbd/balance umbral-motor -- --n 50
 */
import { resolverResto } from '@fbd/ai';
import { parametrosActuales, semillaDesdeTexto } from '@fbd/domain';
import { avanzar, crearPartido } from '@fbd/engine';
import { clonar, equipoSintetico } from './equipos';

const MAX_PARTIDO_MS = Number(process.env.MAX_PARTIDO_MS ?? 25);
const MAX_RESOLVER_RESTO_MS = Number(process.env.MAX_RESOLVER_RESTO_MS ?? 30);
const MAX_METRICAS_MS = Number(process.env.MAX_METRICAS_MS ?? 30);
const i = process.argv.indexOf('--n');
const n = i >= 0 ? Number(process.argv[i + 1]) : 20;

const parametros = parametrosActuales();
const local = equipoSintetico({ semilla: 'umbral' });
const visitante = clonar(local, 'b');
const entrada = (k: number) => ({ version: parametros.version, parametros, semilla: semillaDesdeTexto(`umbral:${k}`), eliminatoria: false, local, visitante });

// Calentamiento (compilación JIT).
for (let k = 0; k < 3; k++) avanzar(crearPartido(entrada(-1 - k)), 'final');

let t0 = performance.now();
for (let k = 0; k < n; k++) avanzar(crearPartido(entrada(k)), 'final');
const partido = (performance.now() - t0) / n;

t0 = performance.now();
for (let k = 0; k < n; k++) resolverResto(crearPartido(entrada(1000 + k)), {}, semillaDesdeTexto(`umbral-resto:${k}`));
const resto = (performance.now() - t0) / n;

t0 = performance.now();
for (let k = 0; k < n; k++) avanzar(crearPartido(entrada(2000 + k)), 'final', { metricas: true });
const metricas = (performance.now() - t0) / n;

const ok = partido <= MAX_PARTIDO_MS && resto <= MAX_RESOLVER_RESTO_MS && metricas <= MAX_METRICAS_MS;
console.log(`${partido <= MAX_PARTIDO_MS ? '✔' : '✘'} partido completo sin fotogramas: ${partido.toFixed(1)} ms (máximo ${MAX_PARTIDO_MS} ms)`);
console.log(`${resto <= MAX_RESOLVER_RESTO_MS ? '✔' : '✘'} resolverResto desde el minuto 0: ${resto.toFixed(1)} ms (máximo ${MAX_RESOLVER_RESTO_MS} ms)`);
console.log(`${metricas <= MAX_METRICAS_MS ? '✔' : '✘'} partido completo con métricas: ${metricas.toFixed(1)} ms (máximo ${MAX_METRICAS_MS} ms)`);
process.exit(ok ? 0 : 1);
