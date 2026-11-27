#!/usr/bin/env tsx
/**
 * Umbral de rendimiento del motor (spec 018, FR-039 y FR-040; sustituye a 002/FR-028a): media de partidos completos sin
 * fotogramas ≤ 60 ms, con fotogramas ≤ 80 ms, con métricas ≤ 60 ms y `resolverResto` desde el minuto 0 ≤ 60 ms, en el CI
 * con Node 22. Termina con código 1 si se supera alguno.
 *
 *   pnpm --filter @fbd/balance umbral-motor            (20 partidos)
 *   pnpm --filter @fbd/balance umbral-motor -- --n 50
 */
import { resolverResto } from '@fbd/ai';
import { parametrosActuales, semillaDesdeTexto } from '@fbd/domain';
import { avanzar, crearPartido } from '@fbd/engine';
import { clonar, equipoSintetico } from './equipos';

const MAX_PARTIDO_MS = Number(process.env.MAX_PARTIDO_MS ?? 60);
const MAX_RESOLVER_RESTO_MS = Number(process.env.MAX_RESOLVER_RESTO_MS ?? 60);
const MAX_METRICAS_MS = Number(process.env.MAX_METRICAS_MS ?? 60);
const MAX_FOTOGRAMAS_MS = Number(process.env.MAX_FOTOGRAMAS_MS ?? 80);
const i = process.argv.indexOf('--n');
const n = i >= 0 ? Number(process.argv[i + 1]) : 20;

const parametros = parametrosActuales();
// Ids como los del catálogo (1 a 396): con los de las cartas sintéticas (desde 1 000 000), V8 guarda en modo diccionario
// los registros por id del motor (`espacio.jugadores`, objetivos y destinos) y el partido cuesta un 17 % más que en el
// servidor (spec 018, T066). Si el catálogo pasa de unos 1000 ids, hay que medirlo con los suyos.
const local = clonar(equipoSintetico({ semilla: 'umbral' }), 'sintetico', 1);
const visitante = clonar(local, 'b', 101);
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

t0 = performance.now();
for (let k = 0; k < n; k++) avanzar(crearPartido(entrada(3000 + k)), 'final', { fotogramas: true });
const fotogramas = (performance.now() - t0) / n;

const ok = partido <= MAX_PARTIDO_MS && resto <= MAX_RESOLVER_RESTO_MS && metricas <= MAX_METRICAS_MS && fotogramas <= MAX_FOTOGRAMAS_MS;
console.log(`${partido <= MAX_PARTIDO_MS ? '✔' : '✘'} partido completo sin fotogramas: ${partido.toFixed(1)} ms (máximo ${MAX_PARTIDO_MS} ms)`);
console.log(`${resto <= MAX_RESOLVER_RESTO_MS ? '✔' : '✘'} resolverResto desde el minuto 0: ${resto.toFixed(1)} ms (máximo ${MAX_RESOLVER_RESTO_MS} ms)`);
console.log(`${metricas <= MAX_METRICAS_MS ? '✔' : '✘'} partido completo con métricas: ${metricas.toFixed(1)} ms (máximo ${MAX_METRICAS_MS} ms)`);
console.log(`${fotogramas <= MAX_FOTOGRAMAS_MS ? '✔' : '✘'} partido completo con fotogramas: ${fotogramas.toFixed(1)} ms (máximo ${MAX_FOTOGRAMAS_MS} ms)`);
process.exit(ok ? 0 : 1);
