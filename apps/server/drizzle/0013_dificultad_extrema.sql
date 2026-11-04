-- Dificultad «Extrema»: el relleno automático de NPC sortea avanzados y PRO (spec 003, FR-038a).
ALTER TABLE "partidas" DROP CONSTRAINT "partidas_dificultad_ck";
--> statement-breakpoint
ALTER TABLE "partidas" ADD CONSTRAINT "partidas_dificultad_ck" CHECK ("partidas"."dificultad" in ('facil','normal','dificil','extrema'));
