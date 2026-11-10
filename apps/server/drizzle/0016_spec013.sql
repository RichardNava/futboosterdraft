-- Spec 013 (data-model §1): nivel de rareza del draft, cobro e idempotencia de la creación, índice de «Mis partidas»,
-- pase premium, y los tipos de compra y motivos de movimiento nuevos.
ALTER TABLE "partidas" ADD COLUMN "nivel_rareza" text DEFAULT 'moderado' NOT NULL;
--> statement-breakpoint
ALTER TABLE "partidas" ADD CONSTRAINT "partidas_nivel_rareza_ck" CHECK ("nivel_rareza" in ('pobre','escaso','moderado','abundante','rico'));
--> statement-breakpoint
-- Fragmentos cobrados por el nivel; null = gratis.
ALTER TABLE "partidas" ADD COLUMN "cobro_rareza" integer;
--> statement-breakpoint
-- Clave del envío del formulario de crear partida (Idempotency-Key).
ALTER TABLE "partidas" ADD COLUMN "clave_creacion" text;
--> statement-breakpoint
CREATE UNIQUE INDEX "partidas_anfitrion_clave_uq" ON "partidas" ("anfitrion_id", "clave_creacion") WHERE "clave_creacion" is not null;
--> statement-breakpoint
CREATE INDEX "participantes_usuario_idx" ON "participantes" ("usuario_id");
--> statement-breakpoint
CREATE TABLE "pases_premium" (
  "usuario_id" text PRIMARY KEY REFERENCES "usuarios"("id"),
  -- null = nunca comprado
  "fin" timestamp with time zone,
  "cortesia" boolean DEFAULT false NOT NULL,
  "actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "compras" DROP CONSTRAINT "compras_producto_tipo_ck";
--> statement-breakpoint
ALTER TABLE "compras" ADD CONSTRAINT "compras_producto_tipo_ck"
  CHECK ("producto_tipo" in ('coleccion','sobre','fragmentos','cosmetico','pack_cosmeticos','pase_premium'));
--> statement-breakpoint
ALTER TABLE "movimientos_fragmentos" DROP CONSTRAINT "movimientos_fragmentos_motivo_ck";
--> statement-breakpoint
ALTER TABLE "movimientos_fragmentos" ADD CONSTRAINT "movimientos_fragmentos_motivo_ck"
  CHECK ("motivo" in ('recompensa_torneo','desfragmentacion','duplicado','compra_fragmentos','compra_sobre','compra_cosmetico','compra_coleccion','nivel_rareza','devolucion_nivel_rareza','compra_pase_premium'));
--> statement-breakpoint
CREATE UNIQUE INDEX "movimientos_devolucion_rareza_uq" ON "movimientos_fragmentos" ("referencia") WHERE "motivo" = 'devolucion_nivel_rareza';
