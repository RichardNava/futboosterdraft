/**
 * Partidos (T093; data-model §6.1).
 *
 * `entrada` guarda la entrada completa del motor (alineaciones con los datos de cada jugador, sin los
 * parámetros, que se recuperan por `versionParametros`). Con ella y las `decisiones` registradas se
 * reconstruye exactamente el partido (FR-040), por ejemplo tras un reinicio del servidor.
 */
import { sql } from 'drizzle-orm';
import { boolean, check, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
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
    /**
     * Cómo se resolvió (data-model §7.1): `directo` = humano contra NPC jugado en vivo; `apertura` = partido
     * entre humanos resuelto al abrirlo uno de ellos; `plazo` = al vencer el plazo; `npc` = NPC contra NPC.
     */
    resolucion: text('resolucion').notNull().default('directo'),
    /** Modalidad de cada humano, fijada en su primer `abrir` (spec 003, FR-035): `{ [participanteId]: 'rapida' | '2d' }`. */
    modalidades: jsonb('modalidades').notNull().default(sql`'{}'::jsonb`),
    /** Quién abrió primero un partido entre humanos (research R8). */
    abiertoPorId: uuid('abierto_por_id').references(() => participantes.id),
    iniciadoEn: timestamp('iniciado_en', { withTimezone: true }),
    finalizadoEn: timestamp('finalizado_en', { withTimezone: true }),
  },
  (t) => [
    index('partidos_partida_idx').on(t.partidaId),
    check('partidos_resolucion_ck', sql`${t.resolucion} in ('directo','apertura','plazo','npc')`),
    check(
      'partidos_estado_ck',
      sql`${t.estado} in ('programado','primera_parte','descanso','segunda_parte','pre_prorroga','prorroga','penaltis','finalizado')`,
    ),
  ],
);

/**
 * Visionado de un partido entre humanos por cada uno de sus participantes (data-model §7.2): mientras está
 * `pendiente`, a ese participante no se le revela el resultado (FR-030, research R8).
 */
export const visionados = pgTable(
  'visionados',
  {
    partidoId: uuid('partido_id')
      .notNull()
      .references(() => partidos.id, { onDelete: 'cascade' }),
    participanteId: uuid('participante_id')
      .notNull()
      .references(() => participantes.id, { onDelete: 'cascade' }),
    estado: text('estado').notNull(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.partidoId, t.participanteId] }),
    check('visionados_estado_ck', sql`${t.estado} in ('pendiente','visto','revelado')`),
  ],
);
