/**
 * Rutas del catálogo (T031): ficha de jugador, formaciones y rasgos (virtudes y defectos).
 */
import { cartaEnVersion, FORMACIONES_IDS, FORMACIONES, VERSION_CATALOGO_ACTUAL, type Jugador } from '@fbd/domain';
import { asc, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { BaseDatos } from '../persistencia/db';
import { coleccionesCartas, jugadores } from '../persistencia/esquema/index';
import { errores } from './errores';
import { TEXTOS_RASGOS } from './textosRasgos';

/** Fila de base de datos → objeto Jugador del catálogo. */
export function filaAJugador(f: typeof jugadores.$inferSelect) {
  return {
    id: f.id,
    nombre: f.nombre,
    apellidos: f.apellidos,
    nombre_carta: f.nombreCarta,
    nacionalidad: f.nacionalidad,
    fecha_nacimiento: f.fechaNacimiento,
    altura: f.altura,
    demarcacion: f.demarcacion,
    posicion: f.posicion,
    historia: f.historia,
    stats: f.stats,
    media: f.media,
    virtudes: f.virtudes,
    defectos: f.defectos,
    nivel: f.nivel,
    imagen: f.imagen,
    imagen_bg: f.imagenBg,
  };
}

/** Colecciones de cada carta (spec 006): `colecciones_cartas` agrupada por jugador. */
async function pertenencia(db: BaseDatos, id?: number): Promise<Map<number, string[]>> {
  const filas = await db
    .select()
    .from(coleccionesCartas)
    .where(id === undefined ? undefined : eq(coleccionesCartas.jugadorId, id))
    .orderBy(asc(coleccionesCartas.coleccionId));
  const r = new Map<number, string[]>();
  for (const f of filas) r.set(f.jugadorId, [...(r.get(f.jugadorId) ?? []), f.coleccionId]);
  return r;
}

function versionPedida(valor: string | undefined): number {
  if (valor === undefined) return VERSION_CATALOGO_ACTUAL;
  const v = Number(valor);
  if (!Number.isInteger(v) || v < 1 || v > VERSION_CATALOGO_ACTUAL) throw errores.validacion('VERSION_INVALIDA', `Versión de catálogo desconocida: ${valor}`);
  return v;
}

export function registrarRutasCatalogo(app: FastifyInstance, db: BaseDatos): void {
  // Catálogo completo (público, como cada ficha); lo usa la página de pruebas de las cartas (SC-002).
  // `?version=1` sirve las cartas de antes de la spec 005, para las vistas de partidas antiguas (research R4).
  app.get<{ Querystring: { version?: string } }>('/api/catalogo/jugadores', async (req) => {
    const version = versionPedida(req.query.version);
    const colecciones = await pertenencia(db);
    return (await db.select().from(jugadores).orderBy(asc(jugadores.id))).map((f) => ({
      ...cartaEnVersion(filaAJugador(f) as Jugador, version),
      colecciones: colecciones.get(f.id) ?? [],
    }));
  });

  app.get<{ Params: { id: string }; Querystring: { version?: string } }>('/api/catalogo/jugadores/:id', async (req) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw errores.validacion('ID_INVALIDO', 'El id del jugador debe ser un entero');
    const version = versionPedida(req.query.version);
    const fila = (await db.select().from(jugadores).where(eq(jugadores.id, id)).limit(1))[0];
    if (!fila) throw errores.noEncontrado('JUGADOR_NO_ENCONTRADO', `No existe el jugador ${id}`);
    return { ...cartaEnVersion(filaAJugador(fila) as Jugador, version), colecciones: (await pertenencia(db, id)).get(id) ?? [] };
  });

  app.get('/api/catalogo/formaciones', async () => FORMACIONES_IDS.map((id) => FORMACIONES[id]));

  app.get('/api/catalogo/rasgos', async () => TEXTOS_RASGOS);
}
