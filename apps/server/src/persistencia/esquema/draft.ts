/**
 * Persistencia del draft (T048; data-model §3).
 *
 * La mesa guarda su estado (ronda, turno, plazo y los sobres con sus cartas restantes) como JSON:
 * los sobres siempre cambian junto con la mesa. Las elecciones van en su propia tabla con una
 * restricción única, de modo que la base de datos también impide elegir dos veces en un turno.
 */
import { sql } from 'drizzle-orm';
import { check, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { participantes, partidas } from './base';

export const mesas = pgTable(
  'mesas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    partidaId: uuid('partida_id')
      .notNull()
      .references(() => partidas.id, { onDelete: 'cascade' }),
    indice: integer('indice').notNull(),
    semilla: text('semilla').notNull(),
    /** Ids de participante ordenados por asiento. */
    participantes: text('participantes').array().notNull(),
    ronda: integer('ronda').notNull(),
    turno: integer('turno').notNull(),
    turnoS: integer('turno_s').notNull(),
    venceEn: timestamp('vence_en', { withTimezone: true }).notNull(),
    estado: text('estado').notNull(),
    /** SobreEnJuego[]: { id, ronda, asientoOrigen, cartas[8], restantes[] }. */
    sobres: jsonb('sobres').notNull(),
  },
  (t) => [
    uniqueIndex('mesas_partida_indice_uq').on(t.partidaId, t.indice),
    check('mesas_estado_ck', sql`${t.estado} in ('en_turno','terminada')`),
    check('mesas_ronda_ck', sql`${t.ronda} between 1 and 3`),
    check('mesas_turno_ck', sql`${t.turno} between 1 and 8`),
  ],
);

export const elecciones = pgTable(
  'elecciones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mesaId: uuid('mesa_id')
      .notNull()
      .references(() => mesas.id, { onDelete: 'cascade' }),
    ronda: integer('ronda').notNull(),
    turno: integer('turno').notNull(),
    participanteId: uuid('participante_id')
      .notNull()
      .references(() => participantes.id, { onDelete: 'cascade' }),
    sobreId: text('sobre_id').notNull(),
    jugadorId: integer('jugador_id').notNull(),
    origen: text('origen').notNull(),
    registradaEn: timestamp('registrada_en', { withTimezone: true }).notNull(),
  },
  (t) => [
    // Una sola elección por participante y turno (FR-010).
    uniqueIndex('elecciones_turno_uq').on(t.mesaId, t.ronda, t.turno, t.participanteId),
    // Una carta solo puede elegirse una vez en la mesa (FR-011).
    uniqueIndex('elecciones_carta_uq').on(t.mesaId, t.jugadorId),
    check('elecciones_origen_ck', sql`${t.origen} in ('manual','auto','npc')`),
  ],
);

export const plantillas = pgTable('plantillas', {
  participanteId: uuid('participante_id')
    .primaryKey()
    .references(() => participantes.id, { onDelete: 'cascade' }),
  jugadores: integer('jugadores').array().notNull(),
  /** { [jugadorId]: dorsal }; null hasta la primera alineación (FR-031a). */
  dorsales: jsonb('dorsales'),
});
