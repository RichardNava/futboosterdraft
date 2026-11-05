-- Spec 011 (data-model §1–§6): cosméticos (escudos y sobres), aspecto del perfil, escudo por partida, identidad de
-- las cartas, ajustes y cartas pagadas solo con fragmentos (FR-002).
CREATE TABLE "cosmeticos" (
  "id" text PRIMARY KEY NOT NULL,
  "tipo" text NOT NULL,
  "nombre" text NOT NULL,
  "gratuito" boolean NOT NULL,
  "precio_centimos" integer,
  "precio_fragmentos" integer,
  "activo" boolean DEFAULT true NOT NULL,
  "orden" integer NOT NULL,
  CONSTRAINT "cosmeticos_tipo_ck" CHECK ("tipo" in ('escudo','sobre')),
  CONSTRAINT "cosmeticos_precio_ck" CHECK ("gratuito" or (coalesce("precio_centimos", 0) > 0 and coalesce("precio_fragmentos", 0) > 0))
);
--> statement-breakpoint
CREATE TABLE "packs_cosmeticos" (
  "id" text PRIMARY KEY NOT NULL,
  "tipo" text NOT NULL,
  "nombre" text NOT NULL,
  "cosmeticos" text[] NOT NULL,
  "precio_centimos" integer NOT NULL,
  "activo" boolean DEFAULT true NOT NULL,
  CONSTRAINT "packs_cosmeticos_tipo_ck" CHECK ("tipo" in ('escudo','sobre')),
  CONSTRAINT "packs_cosmeticos_precio_ck" CHECK ("precio_centimos" > 0)
);
--> statement-breakpoint
CREATE TABLE "cosmeticos_usuario" (
  "usuario_id" text NOT NULL REFERENCES "usuarios"("id") ON DELETE cascade,
  "cosmetico_id" text NOT NULL REFERENCES "cosmeticos"("id"),
  "compra_id" uuid NOT NULL REFERENCES "compras"("id"),
  "adquirido_en" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "cosmeticos_usuario_pk" PRIMARY KEY ("usuario_id", "cosmetico_id")
);
--> statement-breakpoint
CREATE TABLE "ajustes" (
  "clave" text PRIMARY KEY NOT NULL,
  "valor" jsonb NOT NULL,
  "actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "perfiles_usuario" ADD COLUMN "escudo" text REFERENCES "cosmeticos"("id");
--> statement-breakpoint
ALTER TABLE "perfiles_usuario" ADD COLUMN "sobre_favorito" text REFERENCES "cosmeticos"("id");
--> statement-breakpoint
ALTER TABLE "perfiles_usuario" ADD COLUMN "sobre_carrusel" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "perfiles_usuario" ADD COLUMN "sobres_marcados" text[] DEFAULT '{}' NOT NULL;
--> statement-breakpoint
ALTER TABLE "perfiles_usuario" ADD COLUMN "sobre_baraja" text[] DEFAULT '{}' NOT NULL;
--> statement-breakpoint
ALTER TABLE "perfiles_usuario" ADD COLUMN "sobre_ultimo" text;
--> statement-breakpoint
-- Sin FK: retirar un cosmético nunca debe fallar en partidas viejas (data-model §5).
ALTER TABLE "participantes" ADD COLUMN "escudo" text;
--> statement-breakpoint
ALTER TABLE "partidas" ADD COLUMN "identidad" text DEFAULT 'real' NOT NULL;
--> statement-breakpoint
ALTER TABLE "partidas" ADD CONSTRAINT "partidas_identidad_ck" CHECK ("identidad" in ('real','alternativa'));
--> statement-breakpoint
ALTER TABLE "jugadores" ADD COLUMN "nombre_alt" text;
--> statement-breakpoint
ALTER TABLE "jugadores" ADD COLUMN "apellidos_alt" text;
--> statement-breakpoint
ALTER TABLE "jugadores" ADD COLUMN "nombre_carta_alt" text;
--> statement-breakpoint
ALTER TABLE "jugadores" ADD COLUMN "imagen_alt" text;
--> statement-breakpoint
ALTER TABLE "jugadores" ADD CONSTRAINT "jugadores_identidad_alt_ck" CHECK (
  ("nombre_alt" is null and "apellidos_alt" is null and "nombre_carta_alt" is null)
  or ("nombre_alt" is not null and "apellidos_alt" is not null and "nombre_carta_alt" is not null));
--> statement-breakpoint
ALTER TABLE "colecciones" ADD COLUMN "precio_fragmentos" integer;
--> statement-breakpoint
-- `not valid`: las colecciones de pago ya cargadas reciben el precio en el siguiente seed.
ALTER TABLE "colecciones" ADD CONSTRAINT "colecciones_precio_fragmentos_ck"
  CHECK ("tipo" = 'basica' or coalesce("precio_fragmentos", 0) > 0) NOT VALID;
--> statement-breakpoint
ALTER TABLE "compras" DROP CONSTRAINT "compras_producto_tipo_ck";
--> statement-breakpoint
ALTER TABLE "compras" ADD CONSTRAINT "compras_producto_tipo_ck"
  CHECK ("producto_tipo" in ('coleccion','sobre','fragmentos','cosmetico','pack_cosmeticos'));
--> statement-breakpoint
ALTER TABLE "movimientos_fragmentos" DROP CONSTRAINT "movimientos_fragmentos_motivo_ck";
--> statement-breakpoint
ALTER TABLE "movimientos_fragmentos" ADD CONSTRAINT "movimientos_fragmentos_motivo_ck"
  CHECK ("motivo" in ('recompensa_torneo','desfragmentacion','duplicado','compra_fragmentos','compra_sobre','compra_cosmetico','compra_coleccion'));
