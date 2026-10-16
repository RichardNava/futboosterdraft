/**
 * Esquema base de persistencia (T023; data-model §1.1, §2.1–§2.3).
 *
 * Las tablas de usuarios y sesiones las usa Better Auth (research R12). Sus columnas deben tener las
 * claves que espera la librería; el `apodo` del modelo de datos es el campo `name`, y el `tipo`
 * ('registrado' | 'invitado') se deriva de `isAnonymous`.
 */
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

// ---------- Better Auth ----------

export const usuarios = pgTable(
  'usuarios',
  {
    id: text('id').primaryKey(),
    /** Apodo visible (3–20 caracteres). */
    name: text('apodo').notNull(),
    email: text('email').notNull(),
    emailVerified: boolean('email_verificado').notNull().default(false),
    image: text('imagen'),
    isAnonymous: boolean('es_invitado').notNull().default(false),
    createdAt: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('usuarios_email_uq').on(t.email)],
);

export const sesiones = pgTable(
  'sesiones',
  {
    id: text('id').primaryKey(),
    token: text('token').notNull(),
    userId: text('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expira_en', { withTimezone: true }).notNull(),
    ipAddress: text('ip'),
    userAgent: text('user_agent'),
    createdAt: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('sesiones_token_uq').on(t.token)],
);

export const cuentas = pgTable('cuentas', {
  id: text('id').primaryKey(),
  accountId: text('cuenta_id').notNull(),
  providerId: text('proveedor_id').notNull(),
  userId: text('usuario_id')
    .notNull()
    .references(() => usuarios.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expira_en', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expira_en', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
});

export const verificaciones = pgTable('verificaciones', {
  id: text('id').primaryKey(),
  identifier: text('identificador').notNull(),
  value: text('valor').notNull(),
  expiresAt: timestamp('expira_en', { withTimezone: true }).notNull(),
  createdAt: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
});

// ---------- Catálogo ----------

export const jugadores = pgTable(
  'jugadores',
  {
    id: integer('id').primaryKey(),
    nombre: text('nombre').notNull(),
    apellidos: text('apellidos').notNull(),
    nacionalidad: text('nacionalidad').notNull(),
    fechaNacimiento: text('fecha_nacimiento').notNull(),
    altura: integer('altura').notNull(),
    demarcacion: text('demarcacion').notNull(),
    posicion: text('posicion').array().notNull(),
    historia: text('historia').notNull(),
    stats: jsonb('stats').notNull(),
    media: real('media').notNull(),
    specials: text('specials').array().notNull(),
    nivel: text('nivel').notNull(),
    coleccion: text('coleccion').notNull(),
  },
  (t) => [
    index('jugadores_coleccion_idx').on(t.coleccion),
    check('jugadores_demarcacion_ck', sql`${t.demarcacion} in ('POR','DEF','MED','DEL')`),
    check('jugadores_nivel_ck', sql`${t.nivel} in ('Superclase','Epico','Legendario','GOAT')`),
    check('jugadores_altura_ck', sql`${t.altura} between 150 and 215`),
  ],
);

// ---------- Partidas ----------

export const partidas = pgTable(
  'partidas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    anfitrionId: text('anfitrion_id')
      .notNull()
      .references(() => usuarios.id),
    modo: text('modo').notNull(),
    numParticipantes: integer('num_participantes').notNull(),
    /** Plazas reservadas a personas, incluido el anfitrión; el resto son NPC. */
    plazasHumanas: integer('plazas_humanas').notNull(),
    tipoSimulacion: text('tipo_simulacion').notNull(),
    ritmo: text('ritmo').notNull(),
    plazoJornadaHoras: integer('plazo_jornada_horas').notNull().default(24),
    npcConfig: jsonb('npc_config').notNull().default(sql`'[]'::jsonb`),
    tiempos: jsonb('tiempos').notNull(),
    colecciones: text('colecciones').array().notNull().default(sql`ARRAY['Core']::text[]`),
    estado: text('estado').notNull().default('buscando'),
    semilla: text('semilla').notNull(),
    creadaEn: timestamp('creada_en', { withTimezone: true }).notNull().defaultNow(),
    actualizadaEn: timestamp('actualizada_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('partidas_estado_idx').on(t.estado),
    check('partidas_modo_ck', sql`${t.modo} in ('liga','playoff','mixto')`),
    // "Liga 4–8; playoff ∈ {4, 8, 16}; mixto = 8"
    check(
      'partidas_num_participantes_ck',
      sql`(${t.modo} = 'liga' and ${t.numParticipantes} between 4 and 8)
        or (${t.modo} = 'playoff' and ${t.numParticipantes} in (4, 8, 16))
        or (${t.modo} = 'mixto' and ${t.numParticipantes} = 8)`,
    ),
    check('partidas_tipo_simulacion_ck', sql`${t.tipoSimulacion} in ('rapida','2d')`),
    check('partidas_ritmo_ck', sql`${t.ritmo} in ('directo','asincrono')`),
    check(
      'partidas_estado_ck',
      sql`${t.estado} in ('buscando','en_draft','en_torneo','terminada','cancelada','abandonada')`,
    ),
  ],
);

export const participantes = pgTable(
  'participantes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    partidaId: uuid('partida_id')
      .notNull()
      .references(() => partidas.id, { onDelete: 'cascade' }),
    tipo: text('tipo').notNull(),
    usuarioId: text('usuario_id').references(() => usuarios.id),
    nivelNPC: text('nivel_npc'),
    nombreEquipo: text('nombre_equipo').notNull(),
    mesaIndice: integer('mesa_indice'),
    asiento: integer('asiento'),
    controladoPorNPC: boolean('controlado_por_npc').notNull().default(false),
    /** { primera, segunda }, cada una { principal, secundario } (FR-031b). */
    equipaciones: jsonb('equipaciones'),
    unidoEn: timestamp('unido_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('participantes_partida_idx').on(t.partidaId),
    uniqueIndex('participantes_partida_usuario_uq').on(t.partidaId, t.usuarioId),
    check('participantes_tipo_ck', sql`${t.tipo} in ('humano','npc')`),
    check(
      'participantes_humano_ck',
      sql`(${t.tipo} = 'humano' and ${t.usuarioId} is not null) or (${t.tipo} = 'npc' and ${t.nivelNPC} is not null)`,
    ),
    check(
      'participantes_nivel_ck',
      sql`${t.nivelNPC} is null or ${t.nivelNPC} in ('amateur','intermedio','avanzado','PRO')`,
    ),
  ],
);

/** Peticiones ya procesadas por partida, para descartar duplicados (FR-062). */
export const peticionesProcesadas = pgTable(
  'peticiones_procesadas',
  {
    partidaId: text('partida_id').notNull(),
    requestId: text('request_id').notNull(),
    respuesta: jsonb('respuesta').notNull(),
    creadaEn: timestamp('creada_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.partidaId, t.requestId] })],
);
