/**
 * Cosméticos (escudos y sobres), packs, posesión y ajustes (spec 011, data-model §1, §2 y §6; migración 0014).
 */
import type { TipoCosmetico } from '@fbd/domain';
import { sql } from 'drizzle-orm';
import { boolean, check, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { usuarios } from './base';
import { compras } from './coleccion';

export const cosmeticos = pgTable(
  'cosmeticos',
  {
    id: text('id').primaryKey(),
    tipo: text('tipo').$type<TipoCosmetico>().notNull(),
    nombre: text('nombre').notNull(),
    gratuito: boolean('gratuito').notNull(),
    precioCentimos: integer('precio_centimos'),
    precioFragmentos: integer('precio_fragmentos'),
    activo: boolean('activo').notNull().default(true),
    orden: integer('orden').notNull(),
  },
  (t) => [
    check('cosmeticos_tipo_ck', sql`${t.tipo} in ('escudo','sobre')`),
    check('cosmeticos_precio_ck', sql`${t.gratuito} or (coalesce(${t.precioCentimos}, 0) > 0 and coalesce(${t.precioFragmentos}, 0) > 0)`),
  ],
);

export const packsCosmeticos = pgTable(
  'packs_cosmeticos',
  {
    id: text('id').primaryKey(),
    tipo: text('tipo').$type<TipoCosmetico>().notNull(),
    nombre: text('nombre').notNull(),
    cosmeticos: text('cosmeticos').array().notNull(),
    precioCentimos: integer('precio_centimos').notNull(),
    activo: boolean('activo').notNull().default(true),
  },
  (t) => [
    check('packs_cosmeticos_tipo_ck', sql`${t.tipo} in ('escudo','sobre')`),
    check('packs_cosmeticos_precio_ck', sql`${t.precioCentimos} > 0`),
  ],
);

export const cosmeticosUsuario = pgTable(
  'cosmeticos_usuario',
  {
    usuarioId: text('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    cosmeticoId: text('cosmetico_id')
      .notNull()
      .references(() => cosmeticos.id),
    compraId: uuid('compra_id')
      .notNull()
      .references(() => compras.id),
    adquiridoEn: timestamp('adquirido_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ name: 'cosmeticos_usuario_pk', columns: [t.usuarioId, t.cosmeticoId] })],
);

export const ajustes = pgTable('ajustes', {
  clave: text('clave').primaryKey(),
  valor: jsonb('valor').notNull(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
});
