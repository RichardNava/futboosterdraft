/**
 * Rutas del catálogo (T031): ficha de jugador, formaciones y specials.
 */
import { FORMACIONES_IDS, FORMACIONES, TODOS_LOS_SPECIALS, SPECIALS_GENERICOS, SPECIALS_POR, SPECIALS_DEF, SPECIALS_MED, type Special } from '@fbd/domain';
import { asc, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { BaseDatos } from '../persistencia/db';
import { jugadores } from '../persistencia/esquema/index';
import { errores } from './errores';
import { TEXTOS_SPECIALS } from './textosSpecials';

export function ambitoSpecial(s: Special): 'generico' | 'POR' | 'DEF' | 'MED' | 'DEL' {
  if ((SPECIALS_GENERICOS as readonly Special[]).includes(s)) return 'generico';
  if ((SPECIALS_POR as readonly Special[]).includes(s)) return 'POR';
  if ((SPECIALS_DEF as readonly Special[]).includes(s)) return 'DEF';
  if ((SPECIALS_MED as readonly Special[]).includes(s)) return 'MED';
  return 'DEL';
}

/** Fila de base de datos → objeto Jugador del catálogo. */
export function filaAJugador(f: typeof jugadores.$inferSelect) {
  return {
    id: f.id,
    nombre: f.nombre,
    apellidos: f.apellidos,
    nacionalidad: f.nacionalidad,
    fecha_nacimiento: f.fechaNacimiento,
    altura: f.altura,
    demarcacion: f.demarcacion,
    posicion: f.posicion,
    historia: f.historia,
    stats: f.stats,
    media: f.media,
    specials: f.specials,
    nivel: f.nivel,
    coleccion: f.coleccion,
  };
}

export function registrarRutasCatalogo(app: FastifyInstance, db: BaseDatos): void {
  // Catálogo completo (público, como cada ficha); lo usa la página de pruebas de las cartas (SC-002).
  app.get('/api/catalogo/jugadores', async () =>
    (await db.select().from(jugadores).orderBy(asc(jugadores.id))).map(filaAJugador),
  );

  app.get<{ Params: { id: string } }>('/api/catalogo/jugadores/:id', async (req) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw errores.validacion('ID_INVALIDO', 'El id del jugador debe ser un entero');
    const fila = (await db.select().from(jugadores).where(eq(jugadores.id, id)).limit(1))[0];
    if (!fila) throw errores.noEncontrado('JUGADOR_NO_ENCONTRADO', `No existe el jugador ${id}`);
    return filaAJugador(fila);
  });

  app.get('/api/catalogo/formaciones', async () => FORMACIONES_IDS.map((id) => FORMACIONES[id]));

  app.get('/api/catalogo/specials', async () =>
    TODOS_LOS_SPECIALS.map((s) => ({ id: s, ambito: ambitoSpecial(s), ...TEXTOS_SPECIALS[s] })),
  );
}
