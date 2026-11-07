/**
 * Seed del catálogo (T024; FR-024; spec 006, contracts/datos-cartas.md).
 *
 * Valida los ficheros de cartas y el de colecciones contra sus esquemas JSON (fuente única en @fbd/protocol) y después
 * con las reglas del dominio (`validarColeccion`, `validarCatalogo`). Si hay cualquier error, rechaza el lote entero.
 * Si todo es correcto, inserta de forma idempotente (upsert por id) cartas, colecciones y pertenencias en una
 * transacción, entrega las cartas añadidas a los compradores de colecciones ya vendidas (data-model §4.3) e informa
 * del recuento por demarcación × nivel de cada colección.
 *
 * Uso: pnpm seed                       (data/core-real.json + data/cartas-prueba.json + data/colecciones.json)
 *      pnpm seed --file a.json --file b.json --colecciones c.json
 */
import '../entorno';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import {
  DISTRIBUCION_CORE,
  MINIMO_EQUILIBRADO_CORE,
  NIVELES,
  recuentoPorDemarcacionYNivel,
  validarCatalogo,
  validarColeccion,
  valorDesfragmentar,
  type Coleccion,
  type Jugador,
  type TipoCosmetico,
} from '@fbd/domain';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { and, eq, inArray, notInArray, sql } from 'drizzle-orm';
import { conectar, urlBaseDatos, type BaseDatos } from './db';
import {
  cartasUsuario,
  colecciones as tablaColecciones,
  coleccionesCartas,
  coleccionesUsuario,
  cosmeticos as tablaCosmeticos,
  jugadores as tablaJugadores,
  packsCosmeticos,
  movimientosFragmentos,
  saldosFragmentos,
} from './esquema/index';

const require = createRequire(import.meta.url);
const esquemaJugadores = require('@fbd/protocol/schemas/player-data.schema.json') as object;
const esquemaColecciones = require('@fbd/protocol/schemas/colecciones.schema.json') as object;

export const FICHEROS_POR_DEFECTO = {
  cartas: ['data/core-real.json', 'data/cartas-prueba.json'],
  colecciones: 'data/colecciones.json',
  cosmeticos: 'data/cosmeticos.json',
};

export interface ErrorSeed {
  id?: unknown;
  regla: string;
  mensaje: string;
}

export interface ResultadoValidacion {
  jugadores: Jugador[];
  errores: ErrorSeed[];
}

export interface LoteCatalogo extends ResultadoValidacion {
  colecciones: Coleccion[];
}

const validadores = new Map<object, ReturnType<Ajv2020['compile']>>();
function validarEsquema(esquema: object, contenido: unknown): ErrorSeed[] {
  let validar = validadores.get(esquema);
  if (!validar) {
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    addFormats.default(ajv);
    validar = ajv.compile(esquema);
    validadores.set(esquema, validar);
  }
  if (validar(contenido)) return [];
  return (validar.errors ?? []).map((e) => ({ regla: `esquema:${e.keyword}`, mensaje: `${e.instancePath || '/'} ${e.message ?? ''}`.trim() }));
}

/** Valida el contenido completo de un fichero de cartas. */
export function validarFicheroCatalogo(contenido: unknown): ResultadoValidacion {
  const errores = validarEsquema(esquemaJugadores, contenido);
  const lista = (contenido as { jugadores?: unknown } | null)?.jugadores;
  errores.push(...validarColeccion(lista));
  return { jugadores: Array.isArray(lista) ? (lista as Jugador[]) : [], errores };
}

/** Valida un lote: varios ficheros de cartas y el de colecciones (ids únicos entre ficheros, pertenencias). */
export function validarLote(ficherosCartas: readonly unknown[], ficheroColecciones: unknown): LoteCatalogo {
  const errores: ErrorSeed[] = [];
  const jugadores: Jugador[] = [];
  for (const f of ficherosCartas) {
    const r = validarFicheroCatalogo(f);
    errores.push(...r.errores);
    jugadores.push(...r.jugadores);
  }
  const vistos = new Set<number>();
  for (const j of jugadores) {
    if (vistos.has(j.id)) errores.push({ id: j.id, regla: 'id_repetido', mensaje: `Id repetido entre ficheros: ${j.id}` });
    vistos.add(j.id);
  }
  errores.push(...validarEsquema(esquemaColecciones, ficheroColecciones));
  const catalogo = validarCatalogo(jugadores, (ficheroColecciones as { colecciones?: unknown } | null)?.colecciones);
  errores.push(...catalogo.errores);
  return { jugadores, colecciones: catalogo.colecciones, errores };
}

/** Informe del recuento comparado con la distribución recomendada de 300 cartas. */
export function informeDistribucion(jugadores: readonly Jugador[]): string {
  const recuento = recuentoPorDemarcacionYNivel(jugadores);
  const lineas = [`Catálogo: ${jugadores.length} jugadores (recomendado: 300)`, '        ' + NIVELES.join(' | ')];
  for (const dem of ['POR', 'DEF', 'MED', 'DEL'] as const) {
    const celdas = NIVELES.map((n) => `${recuento[dem][n]}/${DISTRIBUCION_CORE[dem][n]}`);
    lineas.push(`  ${dem}   ${celdas.join(' | ')}`);
  }
  // Mínimo de cada celda frente a la recomendación: un reparto por debajo de 243 no cubre los peores casos.
  const cubiertos = (['POR', 'DEF', 'MED', 'DEL'] as const).reduce(
    (acc, dem) => acc + NIVELES.reduce((a, n) => a + Math.min(recuento[dem][n], DISTRIBUCION_CORE[dem][n]), 0),
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

/** Recuento por demarcación × nivel de cada colección. */
export function informeColecciones(jugadores: readonly Jugador[], colecciones: readonly Coleccion[]): string {
  const porId = new Map(jugadores.map((j) => [j.id, j]));
  return colecciones
    .map((c) => {
      const cartas = c.cartas.map((x) => porId.get(x.id)!);
      // Solo Core se compara con DISTRIBUCION_CORE; las de pago solo amplían el pool.
      if (c.tipo === 'basica') return `Colección ${c.id} (${c.tipo})\n${informeDistribucion(cartas)}`;
      const recuento = recuentoPorDemarcacionYNivel(cartas);
      const filas = (['POR', 'DEF', 'MED', 'DEL'] as const).map((d) => `  ${d}   ${NIVELES.map((n) => recuento[d][n]).join(' | ')}`);
      return [`Colección ${c.id} (${c.tipo}): ${cartas.length} cartas`, '        ' + NIVELES.join(' | '), ...filas].join('\n');
    })
    .join('\n\n');
}

export interface EntregaSeed {
  usuarioId: string;
  coleccionId: string;
  cartas: number[];
  duplicados: number[];
}

/**
 * Inserta o actualiza el catálogo (idempotente) en una transacción. Las cartas añadidas a una colección de pago ya
 * vendida se entregan a sus compradores: activas si no las tenían, o un movimiento `duplicado` si ya las tenían.
 */
export async function cargarCatalogo(db: BaseDatos, jugadores: readonly Jugador[], colecciones: readonly Coleccion[] = []): Promise<EntregaSeed[]> {
  const porId = new Map(jugadores.map((j) => [j.id, j]));
  return db.transaction(async (tx) => {
    for (const j of jugadores) {
      const fila = {
        id: j.id,
        nombre: j.nombre,
        apellidos: j.apellidos,
        nombreCarta: j.nombre_carta,
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
        imagen: j.imagen,
        imagenBg: j.imagen_bg,
        // Identidad alternativa (spec 011, FR-017): los tres nombres o ninguno (check de la migración 0014).
        nombreAlt: j.identidad_alternativa?.nombre ?? null,
        apellidosAlt: j.identidad_alternativa?.apellidos ?? null,
        nombreCartaAlt: j.identidad_alternativa?.nombre_carta ?? null,
        imagenAlt: j.identidad_alternativa?.imagen ?? null,
      };
      await tx
        .insert(tablaJugadores)
        .values(fila)
        .onConflictDoUpdate({ target: tablaJugadores.id, set: { ...fila, id: sql`excluded.id` } });
    }

    const entregas: EntregaSeed[] = [];
    for (const [orden, c] of colecciones.entries()) {
      const fila = {
        id: c.id,
        nombre: c.nombre,
        descripcion: c.descripcion,
        tipo: c.tipo,
        precioCentimos: c.precioCentimos ?? null,
        precioFragmentos: c.precioFragmentos ?? null,
        destacadas: c.destacadas ?? [],
        orden,
      };
      await tx.insert(tablaColecciones).values(fila).onConflictDoUpdate({ target: tablaColecciones.id, set: fila });

      const ids = c.cartas.map((x) => x.id);
      const anteriores = new Set(
        (await tx.select({ id: coleccionesCartas.jugadorId }).from(coleccionesCartas).where(eq(coleccionesCartas.coleccionId, c.id))).map((f) => f.id),
      );
      await tx.delete(coleccionesCartas).where(and(eq(coleccionesCartas.coleccionId, c.id), notInArray(coleccionesCartas.jugadorId, ids)));
      await tx
        .insert(coleccionesCartas)
        .values(c.cartas.map((x) => ({ coleccionId: c.id, jugadorId: x.id, version: x.version })))
        .onConflictDoUpdate({ target: [coleccionesCartas.coleccionId, coleccionesCartas.jugadorId], set: { version: sql`excluded.version` } });

      const nuevas = ids.filter((id) => !anteriores.has(id));
      if (c.tipo !== 'pago' || nuevas.length === 0 || anteriores.size === 0) continue;
      const compradores = await tx.select({ usuarioId: coleccionesUsuario.usuarioId }).from(coleccionesUsuario).where(eq(coleccionesUsuario.coleccionId, c.id));
      for (const { usuarioId } of compradores) {
        const poseidas = new Set(
          (
            await tx
              .select({ id: cartasUsuario.jugadorId })
              .from(cartasUsuario)
              .where(and(eq(cartasUsuario.usuarioId, usuarioId), inArray(cartasUsuario.jugadorId, nuevas)))
          ).map((f) => f.id),
        );
        const entrega: EntregaSeed = { usuarioId, coleccionId: c.id, cartas: [], duplicados: [] };
        for (const id of nuevas) {
          if (!poseidas.has(id)) {
            await tx.insert(cartasUsuario).values({ usuarioId, jugadorId: id, via: 'coleccion' });
            entrega.cartas.push(id);
            continue;
          }
          const importe = valorDesfragmentar(porId.get(id)!.nivel);
          await tx.insert(saldosFragmentos).values({ usuarioId }).onConflictDoNothing();
          await tx
            .update(saldosFragmentos)
            .set({ saldo: sql`${saldosFragmentos.saldo} + ${importe}`, actualizadoEn: new Date() })
            .where(eq(saldosFragmentos.usuarioId, usuarioId));
          await tx.insert(movimientosFragmentos).values({ usuarioId, importe, motivo: 'duplicado', referencia: String(id) });
          entrega.duplicados.push(id);
        }
        entregas.push(entrega);
      }
    }
    return entregas;
  });
}

// ---------- Cosméticos (spec 011, data-model §1) ----------

export interface CosmeticoJson {
  id: string;
  tipo: TipoCosmetico;
  nombre: string;
  gratuito: boolean;
  precio_centimos?: number;
  precio_fragmentos?: number;
  orden: number;
  activo?: boolean;
}
export interface PackJson {
  id: string;
  tipo: TipoCosmetico;
  nombre: string;
  precio_centimos: number;
  cosmeticos: string[];
  activo?: boolean;
}
export interface CatalogoCosmeticosJson {
  version: string;
  cosmeticos: CosmeticoJson[];
  packs: PackJson[];
}

/** Ids únicos, precios de los de pago y packs de exactamente 5 cosméticos activos, de pago y del tipo del pack. */
export function validarCosmeticos(c: CatalogoCosmeticosJson): ErrorSeed[] {
  const errores: ErrorSeed[] = [];
  const porId = new Map<string, CosmeticoJson>();
  const ids = new Set<string>();
  for (const x of [...c.cosmeticos, ...c.packs]) {
    if (ids.has(x.id)) errores.push({ id: x.id, regla: 'cosmetico_repetido', mensaje: `Id repetido: ${x.id}` });
    ids.add(x.id);
  }
  for (const x of c.cosmeticos) {
    porId.set(x.id, x);
    if (!x.gratuito && !((x.precio_centimos ?? 0) > 0 && (x.precio_fragmentos ?? 0) > 0)) {
      errores.push({ id: x.id, regla: 'cosmetico_precio', mensaje: 'Un cosmético de pago necesita precio_centimos y precio_fragmentos > 0' });
    }
  }
  for (const p of c.packs) {
    const validos = new Set(
      p.cosmeticos.filter((id) => {
        const x = porId.get(id);
        return x !== undefined && x.activo !== false && !x.gratuito && x.tipo === p.tipo;
      }),
    );
    if (p.cosmeticos.length !== 5 || validos.size !== 5) {
      errores.push({ id: p.id, regla: 'pack', mensaje: `El pack ${p.id} debe tener 5 cosméticos distintos, activos, de pago y de tipo ${p.tipo}` });
    }
  }
  return errores;
}

/** Upsert de cosméticos y packs; lo que ya no está en el JSON queda `activo = false` (nunca se borra). */
export async function cargarCosmeticos(db: BaseDatos, c: CatalogoCosmeticosJson): Promise<void> {
  await db.transaction(async (tx) => {
    for (const x of c.cosmeticos) {
      const fila = {
        id: x.id,
        tipo: x.tipo,
        nombre: x.nombre,
        gratuito: x.gratuito,
        precioCentimos: x.gratuito ? null : (x.precio_centimos ?? null),
        precioFragmentos: x.gratuito ? null : (x.precio_fragmentos ?? null),
        activo: x.activo !== false,
        orden: x.orden,
      };
      await tx.insert(tablaCosmeticos).values(fila).onConflictDoUpdate({ target: tablaCosmeticos.id, set: fila });
    }
    await tx.update(tablaCosmeticos).set({ activo: false }).where(notInArray(tablaCosmeticos.id, c.cosmeticos.map((x) => x.id)));
    for (const p of c.packs) {
      const fila = { id: p.id, tipo: p.tipo, nombre: p.nombre, cosmeticos: p.cosmeticos, precioCentimos: p.precio_centimos, activo: p.activo !== false };
      await tx.insert(packsCosmeticos).values(fila).onConflictDoUpdate({ target: packsCosmeticos.id, set: fila });
    }
    if (c.packs.length) await tx.update(packsCosmeticos).set({ activo: false }).where(notInArray(packsCosmeticos.id, c.packs.map((p) => p.id)));
  });
}

export function leerCosmeticos(base: string, fichero: string = FICHEROS_POR_DEFECTO.cosmeticos): { catalogo: CatalogoCosmeticosJson; errores: ErrorSeed[] } {
  const catalogo = JSON.parse(readFileSync(resolve(base, fichero), 'utf-8')) as CatalogoCosmeticosJson;
  return { catalogo, errores: validarCosmeticos(catalogo) };
}

/** Lee y valida un lote desde disco (rutas relativas a `base`). */
export function leerLote(base: string, ficherosCartas: readonly string[], ficheroColecciones: string): LoteCatalogo {
  const leer = (ruta: string): unknown => JSON.parse(readFileSync(resolve(base, ruta), 'utf-8'));
  return validarLote(ficherosCartas.map(leer), leer(ficheroColecciones));
}

function opciones(args: readonly string[]): { cartas: string[]; colecciones: string } {
  const cartas = args.flatMap((a, i) => (a === '--file' && args[i + 1] ? [args[i + 1]!] : []));
  const i = args.indexOf('--colecciones');
  return {
    cartas: cartas.length ? cartas : FICHEROS_POR_DEFECTO.cartas,
    colecciones: i >= 0 && args[i + 1] ? args[i + 1]! : FICHEROS_POR_DEFECTO.colecciones,
  };
}

async function principal(): Promise<void> {
  const o = opciones(process.argv.slice(2).filter((a) => a !== '--'));
  const { jugadores, colecciones, errores } = leerLote(process.env.INIT_CWD ?? process.cwd(), o.cartas, o.colecciones);
  const cosmeticos = leerCosmeticos(process.env.INIT_CWD ?? process.cwd());
  errores.push(...cosmeticos.errores);
  if (errores.length) {
    for (const e of errores.slice(0, 50)) console.error(`  [${String(e.id ?? '-')}] ${e.regla}: ${e.mensaje}`);
    throw new Error(`Catálogo rechazado: ${errores.length} errores. No se ha cargado ninguna carta, colección ni cosmético.`);
  }
  const conexion = conectar(urlBaseDatos());
  try {
    const entregas = await cargarCatalogo(conexion.db, jugadores, colecciones);
    await cargarCosmeticos(conexion.db, cosmeticos.catalogo);
    const { cosmeticos: c, packs } = cosmeticos.catalogo;
    console.log(`Cargadas ${jugadores.length} cartas, ${colecciones.length} colecciones, ${c.length} cosméticos y ${packs.length} packs.\n`);
    console.log(informeColecciones(jugadores, colecciones));
    for (const e of entregas) {
      console.log(`Entrega a ${e.usuarioId} (${e.coleccionId}): ${e.cartas.length} cartas nuevas y ${e.duplicados.length} duplicadas`);
    }
  } finally {
    await conexion.cerrar();
  }
}

// Como comando: `pnpm seed` en desarrollo (tsx) o `node dist/seed.js` en la imagen de producción.
const ejecutable = process.argv[1]?.replace(/\\/g, '/') ?? '';
if (ejecutable.endsWith('persistencia/seed.ts') || ejecutable.endsWith('dist/seed.js')) {
  principal().catch((e: unknown) => {
    console.error(e instanceof Error && e.message ? e.message : e); // AggregateError (p. ej. ECONNREFUSED) llega sin mensaje
    process.exitCode = 1;
  });
}
