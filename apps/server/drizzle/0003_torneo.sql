CREATE TABLE "avisos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" text NOT NULL,
	"tipo" text NOT NULL,
	"partida_id" uuid,
	"partido_id" uuid,
	"texto" text NOT NULL,
	"leido" boolean DEFAULT false NOT NULL,
	"creado_en" timestamp with time zone NOT NULL,
	"enviado_email_en" timestamp with time zone,
	CONSTRAINT "avisos_tipo_ck" CHECK ("avisos"."tipo" in ('jornada_abierta','rival_listo','plazo_proximo','partido_auto_resuelto','torneo_terminado'))
);
--> statement-breakpoint
CREATE TABLE "bajas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partida_id" uuid NOT NULL,
	"participante_id" uuid NOT NULL,
	"jugador_id" integer NOT NULL,
	"motivo" text NOT NULL,
	"gravedad" text,
	"partido_origen_id" text NOT NULL,
	"partidos_restantes" integer NOT NULL,
	CONSTRAINT "bajas_motivo_ck" CHECK ("bajas"."motivo" in ('roja','acumulacion_amarillas','lesion')),
	CONSTRAINT "bajas_gravedad_ck" CHECK ("bajas"."gravedad" is null or "bajas"."gravedad" in ('leve','media','grave','larga'))
);
--> statement-breakpoint
CREATE TABLE "contadores_amarillas" (
	"partida_id" uuid NOT NULL,
	"participante_id" uuid NOT NULL,
	"jugador_id" integer NOT NULL,
	"amarillas" integer NOT NULL,
	CONSTRAINT "contadores_amarillas_partida_id_participante_id_jugador_id_pk" PRIMARY KEY("partida_id","participante_id","jugador_id"),
	CONSTRAINT "contadores_rango_ck" CHECK ("contadores_amarillas"."amarillas" between 0 and 2)
);
--> statement-breakpoint
CREATE TABLE "jornadas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partida_id" uuid NOT NULL,
	"numero" integer NOT NULL,
	"tipo" text NOT NULL,
	"estado" text NOT NULL,
	"abre_en" timestamp with time zone,
	"vence_en" timestamp with time zone,
	CONSTRAINT "jornadas_estado_ck" CHECK ("jornadas"."estado" in ('pendiente','abierta','cerrada')),
	CONSTRAINT "jornadas_tipo_ck" CHECK ("jornadas"."tipo" in ('liga','octavos','cuartos','semifinal','final'))
);
--> statement-breakpoint
CREATE TABLE "torneos" (
	"partida_id" uuid PRIMARY KEY NOT NULL,
	"estado" jsonb NOT NULL,
	"campeon_id" uuid,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "avisos" ADD CONSTRAINT "avisos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avisos" ADD CONSTRAINT "avisos_partida_id_partidas_id_fk" FOREIGN KEY ("partida_id") REFERENCES "public"."partidas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bajas" ADD CONSTRAINT "bajas_partida_id_partidas_id_fk" FOREIGN KEY ("partida_id") REFERENCES "public"."partidas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bajas" ADD CONSTRAINT "bajas_participante_id_participantes_id_fk" FOREIGN KEY ("participante_id") REFERENCES "public"."participantes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contadores_amarillas" ADD CONSTRAINT "contadores_amarillas_partida_id_partidas_id_fk" FOREIGN KEY ("partida_id") REFERENCES "public"."partidas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jornadas" ADD CONSTRAINT "jornadas_partida_id_partidas_id_fk" FOREIGN KEY ("partida_id") REFERENCES "public"."partidas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "torneos" ADD CONSTRAINT "torneos_partida_id_partidas_id_fk" FOREIGN KEY ("partida_id") REFERENCES "public"."partidas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "avisos_usuario_idx" ON "avisos" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "bajas_partida_idx" ON "bajas" USING btree ("partida_id");--> statement-breakpoint
CREATE UNIQUE INDEX "jornadas_partida_numero_uq" ON "jornadas" USING btree ("partida_id","numero");