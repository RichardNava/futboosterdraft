#!/usr/bin/env tsx
/**
 * Migración de las cartas de Core a la spec 006 (R4). Se ejecuta una vez y el resultado queda versionado en
 * `data/core.json`:
 *
 * - se quitan la clave raíz `coleccion` y el campo `coleccion` de cada carta (la pertenencia va en
 *   `data/colecciones.json`);
 * - `nombre_carta` = nombre + primer apellido;
 * - las cartas `GBR` se reparten con semilla fija entre `ENG`, `SCO`, `WAL` y `NIR` (10/4/3/2) y se reescribe el
 *   código en `historia`;
 * - `imagen` e `imagen_bg` = las rutas genéricas de su demarcación.
 *
 * Imprime la tabla `id → código` de las cartas `GBR`, que usa la migración SQL `0011_colecciones`.
 *
 * Uso: pnpm --filter @fbd/fixtures migrar-cartas-006 [--fichero data/core.json]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Rng, semillaDesdeTexto, validarColeccion, type Demarcacion, type Jugador } from '@fbd/domain';

/** Rutas genéricas de la imagen superior y del fondo de una demarcación (R7). */
export function imagenesGenericas(demarcacion: Demarcacion): Pick<Jugador, 'imagen' | 'imagen_bg'> {
  const d = demarcacion.toLowerCase();
  return { imagen: `/cartas/siluetas/${d}.svg`, imagen_bg: `/cartas/fondos/${d}.svg` };
}

export function nombreCarta(nombre: string, apellidos: string): string {
  return `${nombre} ${apellidos.split(' ')[0]}`;
}

const REPARTO_GBR: readonly [string, number][] = [['ENG', 10], ['SCO', 4], ['WAL', 3], ['NIR', 2]];

/** Reparte las cartas `GBR` entre las naciones del Reino Unido (orden canónico por id antes de barajar). */
export function repartoGbr(ids: readonly number[], semilla = 'futboosterdraft-gbr-006'): Map<number, string> {
  const barajados = new Rng(semillaDesdeTexto(semilla)).barajar([...ids].sort((a, b) => a - b));
  const codigos = REPARTO_GBR.flatMap(([codigo, n]) => Array<string>(n).fill(codigo));
  if (barajados.length !== codigos.length) throw new Error(`Se esperaban ${codigos.length} cartas GBR y hay ${barajados.length}`);
  return new Map(barajados.map((id, i) => [id, codigos[i]!]));
}

type CartaAntigua = Omit<Jugador, 'nombre_carta' | 'imagen' | 'imagen_bg'> & { coleccion?: string };

export function migrarCartas(antiguas: readonly CartaAntigua[]): { jugadores: Jugador[]; gbr: Map<number, string> } {
  const gbr = repartoGbr(antiguas.filter((c) => c.nacionalidad === 'GBR').map((c) => c.id));
  const jugadores = antiguas.map(({ coleccion: _c, ...c }) => {
    const nacionalidad = gbr.get(c.id) ?? c.nacionalidad;
    const { id, nombre, apellidos, ...resto } = c;
    return {
      id,
      nombre,
      apellidos,
      nombre_carta: nombreCarta(nombre, apellidos),
      ...resto,
      nacionalidad,
      historia: c.historia.replace('(GBR)', `(${nacionalidad})`),
      ...imagenesGenericas(c.demarcacion),
    };
  });
  return { jugadores, gbr };
}

function principal(): void {
  const args = process.argv.slice(2).filter((a) => a !== '--');
  const i = args.indexOf('--fichero');
  const ruta = resolve(process.env.INIT_CWD ?? process.cwd(), i >= 0 ? args[i + 1]! : 'data/core.json');
  const texto = readFileSync(ruta, 'utf-8');
  const fichero = JSON.parse(texto) as { coleccion?: string; version: string; jugadores: CartaAntigua[] };
  const { jugadores, gbr } = migrarCartas(fichero.jugadores);
  const errores = validarColeccion(jugadores);
  if (errores.length) {
    console.error(errores.slice(0, 20));
    throw new Error(`Las cartas migradas tienen ${errores.length} errores`);
  }
  const salto = texto.includes('\r\n') ? '\r\n' : '\n';
  writeFileSync(ruta, JSON.stringify({ version: fichero.version, jugadores }, null, 2).replace(/\n/g, salto) + salto, 'utf-8');
  console.log(`Migradas ${jugadores.length} cartas en ${ruta}. Reparto de GBR (id → código):`);
  console.log([...gbr].sort(([a], [b]) => a - b).map(([id, c]) => `(${id}, '${c}')`).join(', '));
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('fixtures/src/migrarCartas006.ts')) principal();
