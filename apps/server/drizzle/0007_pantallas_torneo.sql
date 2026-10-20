-- Spec 003, US10 (FR-041; data-model §9): cuándo vio cada participante su pantalla de derrota y la del campeón.
ALTER TABLE "participantes" ADD COLUMN "derrota_vista_en" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "participantes" ADD COLUMN "campeon_visto_en" timestamp with time zone;
