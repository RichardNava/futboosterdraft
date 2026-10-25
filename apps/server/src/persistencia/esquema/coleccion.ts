/**
 * Colecciones, colección propia, fragmentos y compras (spec 006, data-model §3.2; migración 0011).
 */
import type { MotivoMovimiento, ViaCarta } from '@fbd/protocol';
import { sql } from 'drizzle-orm';
import { boolean, check, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { jugadores, usuarios } from './base';

export const colecciones = pgTable(
  'colecciones',
  {
    id: text('id').primaryKey(),
    nombre: text('nombre').notNull(),
    descripcion: text('descripcion').notNull(),
    tipo: text('tipo').$type<'basica' | 'pago'>().notNull(),
    precioCentimos: integer('precio_centimos'),
    destacadas: integer('destacadas').array().notNull().default(sql`'{}'::integer[]`),
    /** Orden en la tienda. */
    orden: integer('orden').notNull(),
  },
  (t) => [
    check('colecciones_tipo_ck', sql`${t.tipo} in ('basica','pago')`),
    check('colecciones_precio_ck', sql`${t.tipo} = 'basica' or ${t.precioCentimos} > 0`),
  ],
);

export const coleccionesCartas = pgTable(
  'colecciones_cartas',
  {
    coleccionId: text('coleccion_id')
      .notNull()
      .references(() => colecciones.id, { onDelete: 'cascade' }),
    jugadorId: integer('jugador_id')
      .notNull()
      .references(() => jugadores.id),
    version: text('version').notNull().default('normal'),
  },
  (t) => [
    primaryKey({ name: 'colecciones_cartas_pk', columns: [t.coleccionId, t.jugadorId] }),
    index('colecciones_cartas_jugador_idx').on(t.jugadorId),
    check('colecciones_cartas_version_ck', sql`${t.version} in ('normal')`),
  ],
);

/** Una fila por carta poseída, también las de Core (R8). */
export const cartasUsuario = pgTable(
  'cartas_usuario',
  {
    usuarioId: text('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    jugadorId: integer('jugador_id')
      .notNull()
      .references(() => jugadores.id),
    version: text('version').notNull().default('normal'),
    activa: boolean('activa').notNull().default(true),
    via: text('via').$type<ViaCarta>().notNull(),
    obtenidaEn: timestamp('obtenida_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'cartas_usuario_pk', columns: [t.usuarioId, t.jugadorId] }),
    check('cartas_usuario_version_ck', sql`${t.version} in ('normal')`),
    check('cartas_usuario_via_ck', sql`${t.via} in ('registro','coleccion','sobre')`),
  ],
);

export interface ResultadoCompraGuardado {
  cartas: number[];
  fragmentos: number;
  duplicados: { id: number; fragmentos: number }[];
}

export const compras = pgTable(
  'compras',
  {
    /** `idCompra` que genera el cliente (R10). */
    id: uuid('id').primaryKey(),
    usuarioId: text('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    productoTipo: text('producto_tipo').$type<'coleccion' | 'sobre' | 'fragmentos'>().notNull(),
    productoId: text('producto_id').notNull(),
    moneda: text('moneda').$type<'eur' | 'fragmentos'>().notNull(),
    /** Céntimos o fragmentos. */
    importe: integer('importe').notNull(),
    simulada: boolean('simulada').notNull().default(true),
    estado: text('estado').$type<'completada'>().notNull(),
    resultado: jsonb('resultado').$type<ResultadoCompraGuardado>().notNull(),
    creadaEn: timestamp('creada_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('compras_usuario_idx').on(t.usuarioId, t.creadaEn.desc()),
    check('compras_producto_tipo_ck', sql`${t.productoTipo} in ('coleccion','sobre','fragmentos')`),
    check('compras_moneda_ck', sql`${t.moneda} in ('eur','fragmentos')`),
    check('compras_estado_ck', sql`${t.estado} in ('completada')`),
  ],
);

export const coleccionesUsuario = pgTable(
  'colecciones_usuario',
  {
    usuarioId: text('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    coleccionId: text('coleccion_id')
      .notNull()
      .references(() => colecciones.id),
    compraId: uuid('compra_id')
      .notNull()
      .references(() => compras.id),
    adquiridaEn: timestamp('adquirida_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ name: 'colecciones_usuario_pk', columns: [t.usuarioId, t.coleccionId] })],
);

export const saldosFragmentos = pgTable(
  'saldos_fragmentos',
  {
    usuarioId: text('usuario_id')
      .primaryKey()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    saldo: integer('saldo').notNull().default(0),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('saldos_fragmentos_saldo_ck', sql`${t.saldo} >= 0`)],
);

export const movimientosFragmentos = pgTable(
  'movimientos_fragmentos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: text('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    importe: integer('importe').notNull(),
    motivo: text('motivo').$type<MotivoMovimiento>().notNull(),
    /** `partida_id`, `jugador_id` o `compra_id`. */
    referencia: text('referencia').notNull(),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('movimientos_fragmentos_usuario_idx').on(t.usuarioId, t.creadoEn.desc()),
    uniqueIndex('movimientos_fragmentos_recompensa_uq')
      .on(t.usuarioId, t.motivo, t.referencia)
      .where(sql`${t.motivo} = 'recompensa_torneo'`),
    check('movimientos_fragmentos_importe_ck', sql`${t.importe} <> 0`),
    check(
      'movimientos_fragmentos_motivo_ck',
      sql`${t.motivo} in ('recompensa_torneo','desfragmentacion','duplicado','compra_fragmentos','compra_sobre')`,
    ),
  ],
);
