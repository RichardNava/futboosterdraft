/**
 * Esquema base de persistencia (T023; data-model §1.1, §2.1–§2.3).
 *
 * Las tablas de usuarios y sesiones las usa Better Auth (research R12). Sus columnas deben tener las
 * claves que espera la librería; el `apodo` del modelo de datos es el campo `name`, y el `tipo`
 * ('registrado' | 'invitado') se deriva de `isAnonymous`.
 */
import type { Dificultad } from '@fbd/domain';
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
    /** Nombre destacado en la carta (spec 006, migración 0011). */
    nombreCarta: text('nombre_carta').notNull(),
    nacionalidad: text('nacionalidad').notNull(),
    fechaNacimiento: text('fecha_nacimiento').notNull(),
    altura: integer('altura').notNull(),
    demarcacion: text('demarcacion').notNull(),
    posicion: text('posicion').array().notNull(),
    historia: text('historia').notNull(),
    stats: jsonb('stats').notNull(),
    media: real('media').notNull(),
    virtudes: text('virtudes').array().notNull(),
    /** Defectos de la carta (spec 005, migración 0010). */
    defectos: text('defectos').array().notNull().default(sql`'{}'::text[]`),
    nivel: text('nivel').notNull(),
    /** Imagen superior y fondo de la carta (spec 006, R7). La pertenencia a colecciones va en `colecciones_cartas`. */
    imagen: text('imagen').notNull(),
    imagenBg: text('imagen_bg').notNull(),
  },
  (t) => [
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
    plazoJornadaHoras: integer('plazo_jornada_horas').notNull().default(24),
    npcConfig: jsonb('npc_config').notNull().default(sql`'[]'::jsonb`),
    /** Niveles del relleno automático de NPC (spec 003, FR-038a). */
    dificultad: text('dificultad').$type<Dificultad>().notNull().default('normal'),
    tiempos: jsonb('tiempos').notNull(),
    colecciones: text('colecciones').array().notNull().default(sql`ARRAY['core']::text[]`),
    /** Foto de las cartas activas del anfitrión registrado al crear la partida (spec 006, R12); null = `colecciones`. */
    poolCartas: integer('pool_cartas').array(),
    estado: text('estado').notNull().default('buscando'),
    semilla: text('semilla').notNull(),
    /** Versión del catálogo con que se juega (spec 005, FR-036): 1 = cartas anteriores a la spec 005. */
    versionCatalogo: integer('version_catalogo').notNull().default(1),
    /** Formación común y Estado de forma del modo duelos (spec 005, FR-061): `ConfigDuelos`, o null. */
    configDuelos: jsonb('config_duelos'),
    creadaEn: timestamp('creada_en', { withTimezone: true }).notNull().defaultNow(),
    actualizadaEn: timestamp('actualizada_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('partidas_estado_idx').on(t.estado),
    check('partidas_modo_ck', sql`${t.modo} in ('liga','playoff','mixto','duelos')`),
    // "Liga 4–8; playoff ∈ {4, 8, 16}; mixto = 8; duelos como el playoff"
    check(
      'partidas_num_participantes_ck',
      sql`(${t.modo} = 'liga' and ${t.numParticipantes} between 4 and 8)
        or (${t.modo} = 'playoff' and ${t.numParticipantes} in (4, 8, 16))
        or (${t.modo} = 'mixto' and ${t.numParticipantes} = 8)
        or (${t.modo} = 'duelos' and ${t.numParticipantes} in (4, 8, 16))`,
    ),
    check(
      'partidas_estado_ck',
      sql`${t.estado} in ('buscando','en_draft','en_torneo','terminada','cancelada','abandonada')`,
    ),
    check('partidas_dificultad_ck', sql`${t.dificultad} in ('facil','normal','dificil')`),
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
    /** { primera, segunda }, cada una { diseno, colores } (v2, spec 003; la 0008 convierte las v1). */
    equipaciones: jsonb('equipaciones'),
    /** Última modalidad usada al abrir un partido: preselecciona el selector (spec 003, FR-032). */
    ultimaModalidad: text('ultima_modalidad'),
    /** Pantallas de final de torneo ya vistas (spec 003, FR-041). */
    derrotaVistaEn: timestamp('derrota_vista_en', { withTimezone: true }),
    campeonVistoEn: timestamp('campeon_visto_en', { withTimezone: true }),
    unidoEn: timestamp('unido_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('participantes_partida_idx').on(t.partidaId),
    uniqueIndex('participantes_partida_usuario_uq').on(t.partidaId, t.usuarioId),
    // Nombre único por partida sin distinguir mayúsculas (spec 003, FR-043; migración 0008).
    uniqueIndex('participantes_nombre_equipo_uq').on(t.partidaId, sql`lower(${t.nombreEquipo})`),
    check('participantes_tipo_ck', sql`${t.tipo} in ('humano','npc')`),
    check(
      'participantes_humano_ck',
      sql`(${t.tipo} = 'humano' and ${t.usuarioId} is not null) or (${t.tipo} = 'npc' and ${t.nivelNPC} is not null)`,
    ),
    check(
      'participantes_nivel_ck',
      sql`${t.nivelNPC} is null or ${t.nivelNPC} in ('amateur','intermedio','avanzado','PRO')`,
    ),
    check('participantes_modalidad_ck', sql`${t.ultimaModalidad} is null or ${t.ultimaModalidad} in ('rapida','2d')`),
  ],
);

/**
 * Perfil de un usuario registrado (spec 003, data-model §5): última modalidad usada (migración 0006) y, desde la
 * 0008, el nombre de equipo y las equipaciones por defecto. Es independiente de las tablas de Better Auth.
 */
export const perfilesUsuario = pgTable(
  'perfiles_usuario',
  {
    usuarioId: text('usuario_id')
      .primaryKey()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    ultimaModalidad: text('ultima_modalidad'),
    /** Nombre de equipo y equipaciones (v2) por defecto para las partidas nuevas (spec 003, FR-042a, FR-045). */
    nombreEquipo: text('nombre_equipo'),
    equipaciones: jsonb('equipaciones'),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull(),
  },
  (t) => [check('perfiles_usuario_modalidad_ck', sql`${t.ultimaModalidad} is null or ${t.ultimaModalidad} in ('rapida','2d')`)],
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
