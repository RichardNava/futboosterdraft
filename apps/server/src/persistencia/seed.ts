/**
 * Seed del catálogo (T024; FR-024).
 *
 * Valida el fichero contra el esquema JSON (fuente única en @fbd/protocol) y después con las reglas
 * del dominio. Si hay cualquier error, rechaza el fichero entero. Si todo es correcto, inserta de
 * forma idempotente (upsert por id) e informa del recuento por demarcación × nivel.
 *
 * Uso: pnpm seed --file data/core.json
 */
import '../entorno';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import {
  DISTRIBUCION_CORE,
  MINIMO_EQUILIBRADO_CORE,
  recuentoPorDemarcacionYNivel,
  validarColeccion,
  type Jugador,
} from '@fbd/domain';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { sql } from 'drizzle-orm';
import { conectar, urlBaseDatos, type BaseDatos } from './db';
import { jugadores as tablaJugadores } from './esquema/index';

const require = createRequire(import.meta.url);
const esquemaJugadores = require('@fbd/protocol/schemas/player-data.schema.json') as object;

export interface ErrorSeed {
  id?: unknown;
  regla: string;
  mensaje: string;
}

export interface ResultadoValidacion {
  jugadores: Jugador[];
  errores: ErrorSeed[];
}

let validadorEsquema: ReturnType<Ajv2020['compile']> | undefined;

/** Valida el contenido completo de un fichero de catálogo. */
export function validarFicheroCatalogo(contenido: unknown): ResultadoValidacion {
  if (!validadorEsquema) {
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    addFormats.default(ajv);
    validadorEsquema = ajv.compile(esquemaJugadores);
  }
  const errores: ErrorSeed[] = [];
  if (!validadorEsquema(contenido)) {
    for (const e of validadorEsquema.errors ?? []) {
      errores.push({ regla: `esquema:${e.keyword}`, mensaje: `${e.instancePath || '/'} ${e.message ?? ''}`.trim() });
    }
  }
  const lista = (contenido as { jugadores?: unknown } | null)?.jugadores;
  errores.push(...validarColeccion(lista));
  return { jugadores: Array.isArray(lista) ? (lista as Jugador[]) : [], errores };
}

/** Informe del recuento comparado con la distribución recomendada de 300 cartas. */
export function informeDistribucion(jugadores: readonly Jugador[]): string {
  const recuento = recuentoPorDemarcacionYNivel(jugadores);
  const niveles = ['Superclase', 'Epico', 'Legendario', 'GOAT'] as const;
  const lineas = [`Catálogo: ${jugadores.length} jugadores (recomendado: 300)`, '        ' + niveles.join(' | ')];
  for (const dem of ['POR', 'DEF', 'MED', 'DEL'] as const) {
    const celdas = niveles.map((n) => `${recuento[dem][n]}/${DISTRIBUCION_CORE[dem][n]}`);
    lineas.push(`  ${dem}   ${celdas.join(' | ')}`);
  }
  // Mínimo de cada celda frente a la recomendación: un reparto por debajo de 243 no cubre los peores casos.
  const cubiertos = (['POR', 'DEF', 'MED', 'DEL'] as const).reduce(
    (acc, dem) => acc + niveles.reduce((a, n) => a + Math.min(recuento[dem][n], DISTRIBUCION_CORE[dem][n]), 0),
    0,
  );
  if (cubiertos < MINIMO_EQUILIBRADO_CORE) {
    lineas.push(
      `AVISO: el reparto equilibrado cubre ${cubiertos} cartas, por debajo del mínimo de ${MINIMO_EQUILIBRADO_CORE}: ` +
        'algunas mesas de 8 podrían quedarse sin cartas de alguna combinación.',
    );
  }
  return lineas.join('\n');
}

/** Inserta o actualiza el catálogo (idempotente). */
export async function cargarCatalogo(db: BaseDatos, jugadores: readonly Jugador[]): Promise<void> {
  await db.transaction(async (tx) => {
    for (const j of jugadores) {
      const fila = {
        id: j.id,
        nombre: j.nombre,
        apellidos: j.apellidos,
        nacionalidad: j.nacionalidad,
        fechaNacimiento: j.fecha_nacimiento,
        altura: j.altura,
        demarcacion: j.demarcacion,
        posicion: j.posicion,
        historia: j.historia,
        stats: j.stats,
        media: j.media,
        virtudes: j.virtudes,
        defectos: j.defectos,
        nivel: j.nivel,
        coleccion: j.coleccion,
      };
      await tx
        .insert(tablaJugadores)
        .values(fila)
        .onConflictDoUpdate({ target: tablaJugadores.id, set: { ...fila, id: sql`excluded.id` } });
    }
  });
}

async function principal(): Promise<void> {
  const args = process.argv.slice(2).filter((a) => a !== '--');
  const i = args.indexOf('--file');
  if (i < 0 || !args[i + 1]) throw new Error('Uso: pnpm seed --file <ruta al catálogo JSON>');
  const ruta = resolve(process.env.INIT_CWD ?? process.cwd(), args[i + 1]!);
  const contenido: unknown = JSON.parse(readFileSync(ruta, 'utf-8'));
  const { jugadores, errores } = validarFicheroCatalogo(contenido);
  if (errores.length) {
    for (const e of errores.slice(0, 50)) console.error(`  [${String(e.id ?? '-')}] ${e.regla}: ${e.mensaje}`);
    throw new Error(`Catálogo rechazado: ${errores.length} errores. No se ha cargado ningún jugador.`);
  }
  const conexion = conectar(urlBaseDatos());
  try {
    await cargarCatalogo(conexion.db, jugadores);
    console.log(informeDistribucion(jugadores));
  } finally {
    await conexion.cerrar();
  }
}

// Como comando: `pnpm seed` en desarrollo (tsx) o `node dist/seed.js` en la imagen de producción.
const ejecutable = process.argv[1]?.replace(/\\/g, '/') ?? '';
if (ejecutable.endsWith('persistencia/seed.ts') || ejecutable.endsWith('dist/seed.js')) {
  principal().catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  });
}
