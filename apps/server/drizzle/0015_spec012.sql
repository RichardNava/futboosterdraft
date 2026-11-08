-- Spec 012 (data-model §1): celebraciones de gol como cosmético, celebración y modo de incidencias del perfil y de cada
-- participante, y el aviso «baja_sustituida».
ALTER TABLE "cosmeticos" DROP CONSTRAINT "cosmeticos_tipo_ck";
--> statement-breakpoint
ALTER TABLE "cosmeticos" ADD CONSTRAINT "cosmeticos_tipo_ck" CHECK ("tipo" in ('escudo','sobre','celebracion'));
--> statement-breakpoint
-- Null salvo celebraciones: { clase, duracionMs, sonido? }.
ALTER TABLE "cosmeticos" ADD COLUMN "datos" jsonb;
--> statement-breakpoint
-- Null = la celebración del juego.
ALTER TABLE "perfiles_usuario" ADD COLUMN "celebracion" text REFERENCES "cosmeticos"("id");
--> statement-breakpoint
ALTER TABLE "participantes" ADD COLUMN "celebracion" text REFERENCES "cosmeticos"("id");
--> statement-breakpoint
ALTER TABLE "perfiles_usuario" ADD COLUMN "modo_incidencias" text DEFAULT 'automatico' NOT NULL;
--> statement-breakpoint
ALTER TABLE "perfiles_usuario" ADD CONSTRAINT "perfiles_usuario_modo_incidencias_ck" CHECK ("modo_incidencias" in ('automatico','control_total'));
--> statement-breakpoint
ALTER TABLE "participantes" ADD COLUMN "modo_incidencias" text DEFAULT 'automatico' NOT NULL;
--> statement-breakpoint
ALTER TABLE "participantes" ADD CONSTRAINT "participantes_modo_incidencias_ck" CHECK ("modo_incidencias" in ('automatico','control_total'));
--> statement-breakpoint
ALTER TABLE "avisos" DROP CONSTRAINT "avisos_tipo_ck";
--> statement-breakpoint
ALTER TABLE "avisos" ADD CONSTRAINT "avisos_tipo_ck" CHECK ("tipo" in ('jornada_abierta','rival_listo','plazo_proximo','partido_auto_resuelto','torneo_terminado','dorsal_asignado','baja_sustituida'));
