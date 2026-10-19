-- Spec 003, US11 (data-model §9, pasos 1, 6 y 7): nombre y equipaciones por defecto en el perfil, equipaciones v2
-- y nombre de equipo único por partida sin distinguir mayúsculas.
ALTER TABLE "perfiles_usuario" ADD COLUMN "nombre_equipo" text;
--> statement-breakpoint
ALTER TABLE "perfiles_usuario" ADD COLUMN "equipaciones" jsonb;
--> statement-breakpoint
UPDATE "participantes"
SET "equipaciones" = jsonb_build_object(
	'primera', jsonb_build_object('diseno', 'lisa', 'colores', jsonb_build_array("equipaciones"->'primera'->>'principal', "equipaciones"->'primera'->>'secundario')),
	'segunda', jsonb_build_object('diseno', 'lisa', 'colores', jsonb_build_array("equipaciones"->'segunda'->>'principal', "equipaciones"->'segunda'->>'secundario'))
)
WHERE "equipaciones" IS NOT NULL AND NOT ("equipaciones"->'primera' ? 'diseno');
--> statement-breakpoint
WITH "repetidos" AS (
	SELECT "id", row_number() OVER (PARTITION BY "partida_id", lower("nombre_equipo") ORDER BY "id") AS "n"
	FROM "participantes"
)
UPDATE "participantes" p
SET "nombre_equipo" = left(p."nombre_equipo", 24 - length(' ' || r."n")) || ' ' || r."n"
FROM "repetidos" r
WHERE p."id" = r."id" AND r."n" > 1;
--> statement-breakpoint
CREATE UNIQUE INDEX "participantes_nombre_equipo_uq" ON "participantes" ("partida_id", lower("nombre_equipo"));
