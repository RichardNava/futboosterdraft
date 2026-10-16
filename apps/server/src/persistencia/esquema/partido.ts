/**
 * Partidos (T093; data-model §6.1).
 *
 * `entrada` guarda la entrada completa del motor (alineaciones con los datos de cada jugador, sin los
 * parámetros, que se recuperan por `versionParametros`). Con ella y las `decisiones` registradas se
 * reconstruye exactamente el partido (FR-040), por ejemplo tras un reinicio del servidor.
 */
import { sql } from 'drizzle-orm';
import { boolean, check, index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { participantes, partidas } from './base';

export const partidos = pgTable(
  'partidos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    partidaId: uuid('partida_id')
      .notNull()
      .references(() => partidas.id, { onDelete: 'cascade' }),
    /** Jornada (se enlaza con la tabla de jornadas del torneo). */
    jornadaId: uuid('jornada_id'),
    jornadaNumero: integer('jornada_numero').notNull(),
    localId: uuid('local_id')
      .notNull()
      .references(() => participantes.id),
    visitanteId: uuid('visitante_id')
      .notNull()
      .references(() => participantes.id),
    eliminatoria: boolean('eliminatoria').notNull().default(false),
    semilla: text('semilla').notNull(),
    versionParametros: text('version_parametros').notNull(),
    entrada: jsonb('entrada'),
    decisiones: jsonb('decisiones').notNull().default(sql`'[]'::jsonb`),
    eventos: jsonb('eventos').notNull().default(sql`'[]'::jsonb`),
    estadisticas: jsonb('estadisticas'),
    marcador: jsonb('marcador'),
    estado: text('estado').notNull().default('programado'),
    resueltoAutomaticamente: boolean('resuelto_automaticamente').notNull().default(false),
    iniciadoEn: timestamp('iniciado_en', { withTimezone: true }),
    finalizadoEn: timestamp('finalizado_en', { withTimezone: true }),
  },
  (t) => [
    index('partidos_partida_idx').on(t.partidaId),
    check(
      'partidos_estado_ck',
      sql`${t.estado} in ('programado','primera_parte','descanso','segunda_parte','pre_prorroga','prorroga','penaltis','finalizado')`,
    ),
  ],
);
