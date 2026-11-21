/**
 * Registro de administración y órdenes de consola (spec 017, data-model; migración 0018).
 */
import { sql } from 'drizzle-orm';
import { check, index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/** Acciones e intentos denegados; un trigger impide cambiarlos, salvo vaciar `motivo` (FR-047). */
export const registroAdmin = pgTable(
  'registro_admin',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Sin clave ajena: la entrada sobrevive a la cuenta. `null` si actúa la consola. */
    actorId: text('actor_id'),
    actorTipo: text('actor_tipo').$type<'cuenta' | 'consola'>().notNull(),
    actorRol: text('actor_rol').notNull(),
    accion: text('accion').notNull(),
    objetoTipo: text('objeto_tipo').$type<'cuenta' | 'partida' | 'ajuste'>(),
    objetoId: text('objeto_id'),
    valorAnterior: jsonb('valor_anterior'),
    valorNuevo: jsonb('valor_nuevo'),
    motivo: text('motivo'),
    resultado: text('resultado').$type<'ok' | 'denegado' | 'error'>().notNull(),
    intentos: integer('intentos').notNull().default(1),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('registro_admin_creado_idx').on(t.creadoEn.desc()),
    index('registro_admin_objeto_idx').on(t.objetoTipo, t.objetoId, t.creadoEn.desc()),
    index('registro_admin_actor_idx').on(t.actorId, t.creadoEn.desc()),
    check('registro_admin_actor_tipo_ck', sql`${t.actorTipo} in ('cuenta','consola')`),
    check('registro_admin_objeto_tipo_ck', sql`${t.objetoTipo} is null or ${t.objetoTipo} in ('cuenta','partida','ajuste')`),
    check('registro_admin_resultado_ck', sql`${t.resultado} in ('ok','denegado','error')`),
    check('registro_admin_motivo_ck', sql`${t.motivo} is null or char_length(${t.motivo}) <= 500`),
    check('registro_admin_intentos_ck', sql`${t.intentos} > 0`),
  ],
);

/** Órdenes de la consola que necesitan el estado en memoria del servidor (R21). */
export const ordenesConsola = pgTable(
  'ordenes_consola',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tipo: text('tipo').$type<'partida.cerrar'>().notNull(),
    datos: jsonb('datos').notNull(),
    estado: text('estado').$type<'pendiente' | 'hecha' | 'rechazada' | 'caducada'>().notNull().default('pendiente'),
    resultado: jsonb('resultado'),
    creadaEn: timestamp('creada_en', { withTimezone: true }).notNull().defaultNow(),
    procesadaEn: timestamp('procesada_en', { withTimezone: true }),
  },
  (t) => [
    index('ordenes_consola_pendientes_idx').on(t.creadaEn).where(sql`${t.estado} = 'pendiente'`),
    check('ordenes_consola_tipo_ck', sql`${t.tipo} in ('partida.cerrar')`),
    check('ordenes_consola_estado_ck', sql`${t.estado} in ('pendiente','hecha','rechazada','caducada')`),
  ],
);
