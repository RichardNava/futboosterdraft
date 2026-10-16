/**
 * Alineaciones versionadas (T071; data-model §4.1).
 */
import { integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { participantes } from './base';

export const alineaciones = pgTable(
  'alineaciones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    participanteId: uuid('participante_id')
      .notNull()
      .references(() => participantes.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    formacion: text('formacion').notNull(),
    titulares: jsonb('titulares').notNull(),
    suplentes: integer('suplentes').array().notNull(),
    tactica: jsonb('tactica').notNull(),
    lanzadores: jsonb('lanzadores').notNull(),
    confirmadaEn: timestamp('confirmada_en', { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex('alineaciones_version_uq').on(t.participanteId, t.version)],
);
