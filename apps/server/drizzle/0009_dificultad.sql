-- Spec 003, H14 (FR-038a): dificultad de la partida, que decide los niveles del relleno automático de NPC.
-- Las partidas ya creadas quedan en «Normal», el reparto que tenían.
ALTER TABLE "partidas" ADD COLUMN "dificultad" text DEFAULT 'normal' NOT NULL;
--> statement-breakpoint
ALTER TABLE "partidas" ADD CONSTRAINT "partidas_dificultad_ck" CHECK ("partidas"."dificultad" in ('facil','normal','dificil'));
