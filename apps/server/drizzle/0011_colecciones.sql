-- Spec 006 (research R1, R2, R4, R8, R10, R12; data-model §3): colecciones, colección propia, fragmentos y compras.
-- Cartas: la pertenencia a colecciones pasa a `colecciones_cartas`; nuevos campos de presentación (R4).
ALTER TABLE "jugadores" ADD COLUMN "nombre_carta" text;
--> statement-breakpoint
ALTER TABLE "jugadores" ADD COLUMN "imagen" text;
--> statement-breakpoint
ALTER TABLE "jugadores" ADD COLUMN "imagen_bg" text;
--> statement-breakpoint
UPDATE "jugadores" SET
  "nombre_carta" = "nombre" || ' ' || split_part("apellidos", ' ', 1),
  "imagen" = '/cartas/siluetas/' || lower("demarcacion") || '.svg',
  "imagen_bg" = '/cartas/fondos/' || lower("demarcacion") || '.svg';
--> statement-breakpoint
-- GBR no es una selección (R6): el mismo reparto que `data/core.json` (tools/fixtures/src/migrarCartas006.ts).
UPDATE "jugadores" j SET
  "nacionalidad" = r.codigo,
  "historia" = replace(j."historia", '(GBR)', '(' || r.codigo || ')')
FROM (VALUES (2, 'WAL'), (6, 'WAL'), (22, 'ENG'), (47, 'SCO'), (49, 'ENG'), (98, 'ENG'), (104, 'SCO'), (116, 'WAL'),
  (131, 'ENG'), (162, 'ENG'), (165, 'ENG'), (171, 'SCO'), (186, 'SCO'), (201, 'NIR'), (225, 'ENG'), (241, 'ENG'),
  (253, 'NIR'), (273, 'ENG'), (292, 'ENG')) AS r(id, codigo)
WHERE j."id" = r.id AND j."nacionalidad" = 'GBR';
--> statement-breakpoint
ALTER TABLE "jugadores" ALTER COLUMN "nombre_carta" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "jugadores" ALTER COLUMN "imagen" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "jugadores" ALTER COLUMN "imagen_bg" SET NOT NULL;
--> statement-breakpoint
DROP INDEX IF EXISTS "jugadores_coleccion_idx";
--> statement-breakpoint
ALTER TABLE "jugadores" DROP COLUMN "coleccion";
--> statement-breakpoint
-- Partidas: foto de la colección activa del anfitrión (R12) e id de colección en minúsculas.
ALTER TABLE "partidas" ADD COLUMN "pool_cartas" integer[];
--> statement-breakpoint
ALTER TABLE "partidas" ALTER COLUMN "colecciones" SET DEFAULT ARRAY['core']::text[];
--> statement-breakpoint
UPDATE "partidas" SET "colecciones" = ARRAY['core']::text[];
--> statement-breakpoint
CREATE TABLE "colecciones" (
  "id" text PRIMARY KEY NOT NULL,
  "nombre" text NOT NULL,
  "descripcion" text NOT NULL,
  "tipo" text NOT NULL,
  "precio_centimos" integer,
  "destacadas" integer[] DEFAULT '{}' NOT NULL,
  "orden" integer NOT NULL,
  CONSTRAINT "colecciones_tipo_ck" CHECK ("tipo" in ('basica','pago')),
  CONSTRAINT "colecciones_precio_ck" CHECK ("tipo" = 'basica' or "precio_centimos" > 0)
);
--> statement-breakpoint
CREATE TABLE "colecciones_cartas" (
  "coleccion_id" text NOT NULL REFERENCES "colecciones"("id") ON DELETE cascade,
  "jugador_id" integer NOT NULL REFERENCES "jugadores"("id"),
  "version" text DEFAULT 'normal' NOT NULL,
  CONSTRAINT "colecciones_cartas_pk" PRIMARY KEY ("coleccion_id", "jugador_id"),
  CONSTRAINT "colecciones_cartas_version_ck" CHECK ("version" in ('normal'))
);
--> statement-breakpoint
CREATE INDEX "colecciones_cartas_jugador_idx" ON "colecciones_cartas" USING btree ("jugador_id");
--> statement-breakpoint
CREATE TABLE "cartas_usuario" (
  "usuario_id" text NOT NULL REFERENCES "usuarios"("id") ON DELETE cascade,
  "jugador_id" integer NOT NULL REFERENCES "jugadores"("id"),
  "version" text DEFAULT 'normal' NOT NULL,
  "activa" boolean DEFAULT true NOT NULL,
  "via" text NOT NULL,
  "obtenida_en" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "cartas_usuario_pk" PRIMARY KEY ("usuario_id", "jugador_id"),
  CONSTRAINT "cartas_usuario_version_ck" CHECK ("version" in ('normal')),
  CONSTRAINT "cartas_usuario_via_ck" CHECK ("via" in ('registro','coleccion','sobre'))
);
--> statement-breakpoint
CREATE TABLE "compras" (
  "id" uuid PRIMARY KEY NOT NULL,
  "usuario_id" text NOT NULL REFERENCES "usuarios"("id") ON DELETE cascade,
  "producto_tipo" text NOT NULL,
  "producto_id" text NOT NULL,
  "moneda" text NOT NULL,
  "importe" integer NOT NULL,
  "simulada" boolean DEFAULT true NOT NULL,
  "estado" text NOT NULL,
  "resultado" jsonb NOT NULL,
  "creada_en" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "compras_producto_tipo_ck" CHECK ("producto_tipo" in ('coleccion','sobre','fragmentos')),
  CONSTRAINT "compras_moneda_ck" CHECK ("moneda" in ('eur','fragmentos')),
  CONSTRAINT "compras_estado_ck" CHECK ("estado" in ('completada'))
);
--> statement-breakpoint
CREATE INDEX "compras_usuario_idx" ON "compras" USING btree ("usuario_id", "creada_en" DESC);
--> statement-breakpoint
CREATE TABLE "colecciones_usuario" (
  "usuario_id" text NOT NULL REFERENCES "usuarios"("id") ON DELETE cascade,
  "coleccion_id" text NOT NULL REFERENCES "colecciones"("id"),
  "compra_id" uuid NOT NULL REFERENCES "compras"("id"),
  "adquirida_en" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "colecciones_usuario_pk" PRIMARY KEY ("usuario_id", "coleccion_id")
);
--> statement-breakpoint
CREATE TABLE "saldos_fragmentos" (
  "usuario_id" text PRIMARY KEY NOT NULL REFERENCES "usuarios"("id") ON DELETE cascade,
  "saldo" integer DEFAULT 0 NOT NULL,
  "actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "saldos_fragmentos_saldo_ck" CHECK ("saldo" >= 0)
);
--> statement-breakpoint
CREATE TABLE "movimientos_fragmentos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "usuario_id" text NOT NULL REFERENCES "usuarios"("id") ON DELETE cascade,
  "importe" integer NOT NULL,
  "motivo" text NOT NULL,
  "referencia" text NOT NULL,
  "creado_en" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "movimientos_fragmentos_importe_ck" CHECK ("importe" <> 0),
  CONSTRAINT "movimientos_fragmentos_motivo_ck" CHECK ("motivo" in ('recompensa_torneo','desfragmentacion','duplicado','compra_fragmentos','compra_sobre'))
);
--> statement-breakpoint
CREATE INDEX "movimientos_fragmentos_usuario_idx" ON "movimientos_fragmentos" USING btree ("usuario_id", "creado_en" DESC);
--> statement-breakpoint
-- Una sola recompensa por torneo (R10, FR-019).
CREATE UNIQUE INDEX "movimientos_fragmentos_recompensa_uq" ON "movimientos_fragmentos" USING btree ("usuario_id", "motivo", "referencia") WHERE "motivo" = 'recompensa_torneo';
