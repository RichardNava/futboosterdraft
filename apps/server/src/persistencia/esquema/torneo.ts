/**
 * Torneo, jornadas, bajas, contadores de amarillas y avisos (T110; data-model §5 y §7).
 *
 * El estado del torneo (calendario, resultados, cuadro y campeón) se guarda como JSON en `torneos`;
 * las bajas y los contadores de amarillas, en sus tablas. Las jornadas guardan sus plazos para
 * reprogramar los vencimientos tras un reinicio.
 */
import { sql } from 'drizzle-orm';
import { boolean, check, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { participantes, partidas, usuarios } from './base';

export const torneos = pgTable('torneos', {
  partidaId: uuid('partida_id')
    .primaryKey()
    .references(() => partidas.id, { onDelete: 'cascade' }),
  /** EstadoTorneo sin las bajas (modo, fase, jornadas, resultados, cuadro, campeón). */
  estado: jsonb('estado').notNull(),
  campeonId: uuid('campeon_id'),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
});

export const jornadas = pgTable(
  'jornadas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    partidaId: uuid('partida_id')
      .notNull()
      .references(() => partidas.id, { onDelete: 'cascade' }),
    numero: integer('numero').notNull(),
    tipo: text('tipo').notNull(),
    estado: text('estado').notNull(),
    abreEn: timestamp('abre_en', { withTimezone: true }),
    /** Plazo de la jornada (asíncrono) o fin de la preparación (en directo). */
    venceEn: timestamp('vence_en', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('jornadas_partida_numero_uq').on(t.partidaId, t.numero),
    check('jornadas_estado_ck', sql`${t.estado} in ('pendiente','abierta','cerrada')`),
    check('jornadas_tipo_ck', sql`${t.tipo} in ('liga','octavos','cuartos','semifinal','final')`),
  ],
);

export const bajas = pgTable(
  'bajas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    partidaId: uuid('partida_id')
      .notNull()
      .references(() => partidas.id, { onDelete: 'cascade' }),
    participanteId: uuid('participante_id')
      .notNull()
      .references(() => participantes.id, { onDelete: 'cascade' }),
    jugadorId: integer('jugador_id').notNull(),
    motivo: text('motivo').notNull(),
    gravedad: text('gravedad'),
    partidoOrigenId: text('partido_origen_id').notNull(),
    partidosRestantes: integer('partidos_restantes').notNull(),
  },
  (t) => [
    index('bajas_partida_idx').on(t.partidaId),
    check('bajas_motivo_ck', sql`${t.motivo} in ('roja','acumulacion_amarillas','lesion')`),
    check('bajas_gravedad_ck', sql`${t.gravedad} is null or ${t.gravedad} in ('leve','media','grave','larga')`),
  ],
);

export const contadoresAmarillas = pgTable(
  'contadores_amarillas',
  {
    partidaId: uuid('partida_id')
      .notNull()
      .references(() => partidas.id, { onDelete: 'cascade' }),
    participanteId: uuid('participante_id').notNull(),
    jugadorId: integer('jugador_id').notNull(),
    amarillas: integer('amarillas').notNull(),
  },
  (t) => [primaryKey({ columns: [t.partidaId, t.participanteId, t.jugadorId] }), check('contadores_rango_ck', sql`${t.amarillas} between 0 and 2`)],
);

export const avisos = pgTable(
  'avisos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: text('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    tipo: text('tipo').notNull(),
    partidaId: uuid('partida_id').references(() => partidas.id, { onDelete: 'cascade' }),
    partidoId: uuid('partido_id'),
    texto: text('texto').notNull(),
    leido: boolean('leido').notNull().default(false),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull(),
    enviadoEmailEn: timestamp('enviado_email_en', { withTimezone: true }),
  },
  (t) => [
    index('avisos_usuario_idx').on(t.usuarioId),
    check('avisos_tipo_ck', sql`${t.tipo} in ('jornada_abierta','rival_listo','plazo_proximo','partido_auto_resuelto','torneo_terminado')`),
  ],
);
