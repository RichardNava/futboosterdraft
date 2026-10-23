-- Spec 005 (research R3, R4, R10; data-model §3): virtudes y defectos, versión del catálogo y modo Duelo de jugadores.
-- Renombrado (US1): la lista de habilidades de las cartas pasa a llamarse «virtudes», en la tabla y en las cartas
-- guardadas en `partidos.entrada`. Es la única columna jsonb que guarda cartas completas (los sobres guardan ids).
ALTER TABLE "jugadores" RENAME COLUMN "specials" TO "virtudes";
--> statement-breakpoint
UPDATE "partidos" SET "entrada" = replace("entrada"::text, '"specials":', '"virtudes":')::jsonb
WHERE "entrada"::text LIKE '%"specials":%';
--> statement-breakpoint
-- Defectos de las cartas (US2): vacíos hasta que se vuelva a cargar el catálogo.
ALTER TABLE "jugadores" ADD COLUMN "defectos" text[] DEFAULT '{}' NOT NULL;
--> statement-breakpoint
-- Cruces de duelos (US3).
ALTER TABLE "partidos" ADD COLUMN "tipo" text DEFAULT 'futbol' NOT NULL;
--> statement-breakpoint
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_tipo_ck" CHECK ("partidos"."tipo" in ('futbol','duelos'));
--> statement-breakpoint
ALTER TABLE "partidos" ADD COLUMN "duelos" jsonb;
--> statement-breakpoint
-- Versión del catálogo (FR-036): las partidas ya creadas siguen con las cartas anteriores; las nuevas se crean con 2.
ALTER TABLE "partidas" ADD COLUMN "version_catalogo" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "partidas" ADD COLUMN "config_duelos" jsonb;
--> statement-breakpoint
ALTER TABLE "partidas" DROP CONSTRAINT "partidas_modo_ck";
--> statement-breakpoint
ALTER TABLE "partidas" ADD CONSTRAINT "partidas_modo_ck" CHECK ("partidas"."modo" in ('liga','playoff','mixto','duelos'));
--> statement-breakpoint
ALTER TABLE "partidas" DROP CONSTRAINT "partidas_num_participantes_ck";
--> statement-breakpoint
ALTER TABLE "partidas" ADD CONSTRAINT "partidas_num_participantes_ck" CHECK (("partidas"."modo" = 'liga' and "partidas"."num_participantes" between 4 and 8)
        or ("partidas"."modo" = 'playoff' and "partidas"."num_participantes" in (4, 8, 16))
        or ("partidas"."modo" = 'mixto' and "partidas"."num_participantes" = 8)
        or ("partidas"."modo" = 'duelos' and "partidas"."num_participantes" in (4, 8, 16)));
--> statement-breakpoint
-- Once bloqueado del modo duelos (FR-063a).
ALTER TABLE "alineaciones" ADD COLUMN "bloqueada" boolean DEFAULT false NOT NULL;
