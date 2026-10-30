#!/usr/bin/env tsx
/**
 * Colecciones de prueba de la spec 006 (R5). Con semilla fija escribe:
 *
 * - `data/cartas-prueba.json`: 75 cartas ficticias (`id` 301–375), con el mismo generador que Core;
 * - `data/colecciones.json`: `core` (básica, las 300 de Core), `all-stars` (3 de Core + 301–342) y `top-argentinos`
 *   (3 de Core `ARG` + 6 de *All Stars* + 343–375, todas `ARG`).
 *
 * Cada grupo de cartas nuevas tiene al menos 2 cartas de cada demarcación × nivel, para probar el sobre de la tienda
 * con los cupos completos.
 *
 * Uso: pnpm --filter @fbd/fixtures generar-colecciones-prueba
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CODIGOS_SELECCION,
  DEMARCACIONES,
  NIVELES,
  Rng,
  semillaDesdeTexto,
  validarCatalogo,
  validarColeccion,
  type Demarcacion,
  type Jugador,
  type Nivel,
} from '@fbd/domain';
import { generarJugador } from './generarCore';

const POR_CELDA = 2;

/** Celdas demarcación × nivel: `POR_CELDA` de cada una y el resto sorteadas. */
function celdas(rng: Rng, total: number): [Demarcacion, Nivel][] {
  const fijas = DEMARCACIONES.flatMap((d) => NIVELES.flatMap((n) => Array.from({ length: POR_CELDA }, () => [d, n] as [Demarcacion, Nivel])));
  const extra = Array.from({ length: total - fijas.length }, () => [rng.elegir(DEMARCACIONES), rng.elegir(NIVELES)] as [Demarcacion, Nivel]);
  return [...fijas, ...extra];
}

const ordenNivel = (n: Nivel) => NIVELES.indexOf(n);
const mejores = (cartas: readonly Jugador[], n: number) =>
  [...cartas].sort((a, b) => ordenNivel(b.nivel) - ordenNivel(a.nivel) || b.media - a.media || a.id - b.id).slice(0, n).map((c) => c.id);

export function generarColeccionesPrueba(core: readonly Jugador[], semilla = 'futboosterdraft-colecciones-006') {
  const rng = new Rng(semillaDesdeTexto(semilla));
  const nombresUsados = new Set(core.map((c) => `${c.nombre} ${c.apellidos}`));
  const nuevas = (desde: number, total: number, nacionalidad?: string) =>
    celdas(rng, total).map(([demarcacion, nivel], i) =>
      generarJugador(rng, { id: desde + i, demarcacion, nivel, nombresUsados, nacionalidad: nacionalidad ?? rng.elegir(CODIGOS_SELECCION) }),
    );
  const allStars = nuevas(301, 42);
  const argentinos = nuevas(343, 33, 'ARG');

  // Core en Top Argentinos: un Superclase, un Crack y un GOAT argentinos (los duplicados dan 25 + 50 + 100).
  const coreArg = (['Superclase', 'Crack', 'GOAT'] as const).map((nivel) => {
    const c = core.find((j) => j.nacionalidad === 'ARG' && j.nivel === nivel);
    if (!c) throw new Error(`Core no tiene ningún ARG ${nivel}`);
    return c.id;
  });
  const coreAllStars = mejores(core.filter((j) => j.nacionalidad !== 'ARG'), 3);
  const compartidas = rng.barajar(allStars.map((c) => c.id)).slice(0, 6).sort((a, b) => a - b);

  const cartasAllStars = [...coreAllStars, ...allStars.map((c) => c.id)];
  const cartasArgentinos = [...coreArg, ...compartidas, ...argentinos.map((c) => c.id)];
  const porId = new Map([...core, ...allStars, ...argentinos].map((c) => [c.id, c]));
  const colecciones = [
    {
      id: 'core',
      nombre: 'Core',
      descripcion: 'La colección básica: 300 cartas que tiene todo usuario registrado.',
      tipo: 'basica',
      cartas: core.map((c) => c.id),
    },
    {
      id: 'all-stars',
      nombre: 'All Stars',
      descripcion: 'Estrellas de todas las selecciones (colección de prueba).',
      tipo: 'pago',
      precio_centimos: 499,
      destacadas: mejores(allStars, 3),
      cartas: cartasAllStars,
    },
    {
      id: 'top-argentinos',
      nombre: 'Top Argentinos',
      descripcion: 'Lo mejor de la selección argentina (colección de prueba).',
      tipo: 'pago',
      precio_centimos: 399,
      destacadas: mejores(cartasArgentinos.map((id) => porId.get(id)!), 3),
      cartas: cartasArgentinos,
    },
  ];
  return { cartas: [...allStars, ...argentinos], colecciones };
}

function principal(): void {
  const raiz = process.env.INIT_CWD ?? process.cwd();
  const core = (JSON.parse(readFileSync(resolve(raiz, 'data/core.json'), 'utf-8')) as { jugadores: Jugador[] }).jugadores;
  const { cartas, colecciones } = generarColeccionesPrueba(core);
  const errores = [...validarColeccion([...core, ...cartas]), ...validarCatalogo([...core, ...cartas], colecciones).errores];
  if (errores.length) {
    console.error(errores.slice(0, 20));
    throw new Error(`Las colecciones de prueba tienen ${errores.length} errores`);
  }
  writeFileSync(resolve(raiz, 'data/cartas-prueba.json'), JSON.stringify({ version: '1.0.0', jugadores: cartas }, null, 2) + '\n', 'utf-8');
  writeFileSync(resolve(raiz, 'data/colecciones.json'), JSON.stringify({ version: '1.0.0', colecciones }, null, 2) + '\n', 'utf-8');
  console.log(`Escritas ${cartas.length} cartas de prueba y ${colecciones.length} colecciones`);
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('fixtures/src/generarColeccionesPrueba.ts')) principal();
