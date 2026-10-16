CREATE TABLE "partidos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partida_id" uuid NOT NULL,
	"jornada_id" uuid,
	"jornada_numero" integer NOT NULL,
	"local_id" uuid NOT NULL,
	"visitante_id" uuid NOT NULL,
	"eliminatoria" boolean DEFAULT false NOT NULL,
	"semilla" text NOT NULL,
	"version_parametros" text NOT NULL,
	"entrada" jsonb,
	"decisiones" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"eventos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"estadisticas" jsonb,
	"marcador" jsonb,
	"estado" text DEFAULT 'programado' NOT NULL,
	"resuelto_automaticamente" boolean DEFAULT false NOT NULL,
	"iniciado_en" timestamp with time zone,
	"finalizado_en" timestamp with time zone,
	CONSTRAINT "partidos_estado_ck" CHECK ("partidos"."estado" in ('programado','primera_parte','descanso','segunda_parte','pre_prorroga','prorroga','penaltis','finalizado'))
);
--> statement-breakpoint
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_partida_id_partidas_id_fk" FOREIGN KEY ("partida_id") REFERENCES "public"."partidas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_local_id_participantes_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."participantes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_visitante_id_participantes_id_fk" FOREIGN KEY ("visitante_id") REFERENCES "public"."participantes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "partidos_partida_idx" ON "partidos" USING btree ("partida_id");