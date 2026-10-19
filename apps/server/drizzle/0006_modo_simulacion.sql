-- Spec 003, US3 (data-model §9): el modo de simulación pasa de la partida a cada participante y partido.
CREATE TABLE "perfiles_usuario" (
	"usuario_id" text PRIMARY KEY NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
	"ultima_modalidad" text,
	"actualizado_en" timestamp with time zone NOT NULL,
	CONSTRAINT "perfiles_usuario_modalidad_ck" CHECK ("ultima_modalidad" IS NULL OR "ultima_modalidad" IN ('rapida','2d'))
);
--> statement-breakpoint
ALTER TABLE "participantes" ADD COLUMN "ultima_modalidad" text;
--> statement-breakpoint
ALTER TABLE "participantes" ADD CONSTRAINT "participantes_modalidad_ck" CHECK ("ultima_modalidad" IS NULL OR "ultima_modalidad" IN ('rapida','2d'));
--> statement-breakpoint
UPDATE "participantes" p SET "ultima_modalidad" = pa."tipo_simulacion" FROM "partidas" pa WHERE p."partida_id" = pa."id" AND p."tipo" = 'humano';
--> statement-breakpoint
ALTER TABLE "partidas" DROP CONSTRAINT "partidas_tipo_simulacion_ck";
--> statement-breakpoint
ALTER TABLE "partidas" DROP COLUMN "tipo_simulacion";
--> statement-breakpoint
ALTER TABLE "partidos" ADD COLUMN "modalidades" jsonb DEFAULT '{}'::jsonb NOT NULL;
