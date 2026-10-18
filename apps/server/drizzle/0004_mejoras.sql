-- Spec 002 (data-model §6 y §7): el ritmo del torneo se deduce del número de humanos, las mesas del draft
-- se pueden pausar, los partidos guardan cómo se resolvieron y quién los abrió, y se registra el visionado
-- de los partidos entre humanos.
CREATE TABLE "visionados" (
	"partido_id" uuid NOT NULL,
	"participante_id" uuid NOT NULL,
	"estado" text NOT NULL,
	"actualizado_en" timestamp with time zone NOT NULL,
	CONSTRAINT "visionados_partido_id_participante_id_pk" PRIMARY KEY("partido_id","participante_id"),
	CONSTRAINT "visionados_estado_ck" CHECK ("visionados"."estado" in ('pendiente','visto','revelado'))
);
--> statement-breakpoint
ALTER TABLE "partidas" DROP CONSTRAINT "partidas_ritmo_ck";--> statement-breakpoint
ALTER TABLE "avisos" DROP CONSTRAINT "avisos_tipo_ck";--> statement-breakpoint
ALTER TABLE "mesas" ADD COLUMN "pausada_en" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "mesas" ADD COLUMN "restante_ms" integer;--> statement-breakpoint
ALTER TABLE "partidos" ADD COLUMN "resolucion" text DEFAULT 'directo' NOT NULL;--> statement-breakpoint
ALTER TABLE "partidos" ADD COLUMN "abierto_por_id" uuid;--> statement-breakpoint
UPDATE "partidos" AS p SET "resolucion" = CASE
	WHEN p."resuelto_automaticamente" THEN 'plazo'
	WHEN (SELECT "tipo" FROM "participantes" WHERE "id" = p."local_id") = 'npc'
		AND (SELECT "tipo" FROM "participantes" WHERE "id" = p."visitante_id") = 'npc' THEN 'npc'
	ELSE 'directo'
END;--> statement-breakpoint
ALTER TABLE "partidos" DROP COLUMN "resuelto_automaticamente";--> statement-breakpoint
ALTER TABLE "visionados" ADD CONSTRAINT "visionados_partido_id_partidos_id_fk" FOREIGN KEY ("partido_id") REFERENCES "public"."partidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visionados" ADD CONSTRAINT "visionados_participante_id_participantes_id_fk" FOREIGN KEY ("participante_id") REFERENCES "public"."participantes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_abierto_por_id_participantes_id_fk" FOREIGN KEY ("abierto_por_id") REFERENCES "public"."participantes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partidas" DROP COLUMN "ritmo";--> statement-breakpoint
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_resolucion_ck" CHECK ("partidos"."resolucion" in ('directo','apertura','plazo','npc'));--> statement-breakpoint
ALTER TABLE "avisos" ADD CONSTRAINT "avisos_tipo_ck" CHECK ("avisos"."tipo" in ('jornada_abierta','rival_listo','plazo_proximo','partido_auto_resuelto','torneo_terminado','dorsal_asignado'));