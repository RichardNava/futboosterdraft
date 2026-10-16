CREATE TABLE "cuentas" (
	"id" text PRIMARY KEY NOT NULL,
	"cuenta_id" text NOT NULL,
	"proveedor_id" text NOT NULL,
	"usuario_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expira_en" timestamp with time zone,
	"refresh_token_expira_en" timestamp with time zone,
	"scope" text,
	"password" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jugadores" (
	"id" integer PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"apellidos" text NOT NULL,
	"nacionalidad" text NOT NULL,
	"fecha_nacimiento" text NOT NULL,
	"altura" integer NOT NULL,
	"demarcacion" text NOT NULL,
	"posicion" text[] NOT NULL,
	"historia" text NOT NULL,
	"stats" jsonb NOT NULL,
	"media" real NOT NULL,
	"specials" text[] NOT NULL,
	"nivel" text NOT NULL,
	"coleccion" text NOT NULL,
	CONSTRAINT "jugadores_demarcacion_ck" CHECK ("jugadores"."demarcacion" in ('POR','DEF','MED','DEL')),
	CONSTRAINT "jugadores_nivel_ck" CHECK ("jugadores"."nivel" in ('Superclase','Epico','Legendario','GOAT')),
	CONSTRAINT "jugadores_altura_ck" CHECK ("jugadores"."altura" between 150 and 215)
);
--> statement-breakpoint
CREATE TABLE "participantes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partida_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"usuario_id" text,
	"nivel_npc" text,
	"nombre_equipo" text NOT NULL,
	"mesa_indice" integer,
	"asiento" integer,
	"controlado_por_npc" boolean DEFAULT false NOT NULL,
	"unido_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "participantes_tipo_ck" CHECK ("participantes"."tipo" in ('humano','npc')),
	CONSTRAINT "participantes_humano_ck" CHECK (("participantes"."tipo" = 'humano' and "participantes"."usuario_id" is not null) or ("participantes"."tipo" = 'npc' and "participantes"."nivel_npc" is not null)),
	CONSTRAINT "participantes_nivel_ck" CHECK ("participantes"."nivel_npc" is null or "participantes"."nivel_npc" in ('amateur','intermedio','avanzado','PRO'))
);
--> statement-breakpoint
CREATE TABLE "partidas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"anfitrion_id" text NOT NULL,
	"modo" text NOT NULL,
	"num_participantes" integer NOT NULL,
	"plazas_humanas" integer NOT NULL,
	"tipo_simulacion" text NOT NULL,
	"ritmo" text NOT NULL,
	"plazo_jornada_horas" integer DEFAULT 24 NOT NULL,
	"npc_config" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tiempos" jsonb NOT NULL,
	"colecciones" text[] DEFAULT ARRAY['Core']::text[] NOT NULL,
	"estado" text DEFAULT 'buscando' NOT NULL,
	"semilla" text NOT NULL,
	"creada_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizada_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partidas_modo_ck" CHECK ("partidas"."modo" in ('liga','playoff','mixto')),
	CONSTRAINT "partidas_num_participantes_ck" CHECK (("partidas"."modo" = 'liga' and "partidas"."num_participantes" between 4 and 8)
        or ("partidas"."modo" = 'playoff' and "partidas"."num_participantes" in (4, 8, 16))
        or ("partidas"."modo" = 'mixto' and "partidas"."num_participantes" = 8)),
	CONSTRAINT "partidas_tipo_simulacion_ck" CHECK ("partidas"."tipo_simulacion" in ('rapida','2d')),
	CONSTRAINT "partidas_ritmo_ck" CHECK ("partidas"."ritmo" in ('directo','asincrono')),
	CONSTRAINT "partidas_estado_ck" CHECK ("partidas"."estado" in ('buscando','en_draft','en_torneo','terminada','cancelada','abandonada'))
);
--> statement-breakpoint
CREATE TABLE "peticiones_procesadas" (
	"partida_id" text NOT NULL,
	"request_id" text NOT NULL,
	"respuesta" jsonb NOT NULL,
	"creada_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "peticiones_procesadas_partida_id_request_id_pk" PRIMARY KEY("partida_id","request_id")
);
--> statement-breakpoint
CREATE TABLE "sesiones" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"usuario_id" text NOT NULL,
	"expira_en" timestamp with time zone NOT NULL,
	"ip" text,
	"user_agent" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" text PRIMARY KEY NOT NULL,
	"apodo" text NOT NULL,
	"email" text NOT NULL,
	"email_verificado" boolean DEFAULT false NOT NULL,
	"imagen" text,
	"es_invitado" boolean DEFAULT false NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verificaciones" (
	"id" text PRIMARY KEY NOT NULL,
	"identificador" text NOT NULL,
	"valor" text NOT NULL,
	"expira_en" timestamp with time zone NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "elecciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mesa_id" uuid NOT NULL,
	"ronda" integer NOT NULL,
	"turno" integer NOT NULL,
	"participante_id" uuid NOT NULL,
	"sobre_id" text NOT NULL,
	"jugador_id" integer NOT NULL,
	"origen" text NOT NULL,
	"registrada_en" timestamp with time zone NOT NULL,
	CONSTRAINT "elecciones_origen_ck" CHECK ("elecciones"."origen" in ('manual','auto','npc'))
);
--> statement-breakpoint
CREATE TABLE "mesas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partida_id" uuid NOT NULL,
	"indice" integer NOT NULL,
	"semilla" text NOT NULL,
	"participantes" text[] NOT NULL,
	"ronda" integer NOT NULL,
	"turno" integer NOT NULL,
	"turno_s" integer NOT NULL,
	"vence_en" timestamp with time zone NOT NULL,
	"estado" text NOT NULL,
	"sobres" jsonb NOT NULL,
	CONSTRAINT "mesas_estado_ck" CHECK ("mesas"."estado" in ('en_turno','terminada')),
	CONSTRAINT "mesas_ronda_ck" CHECK ("mesas"."ronda" between 1 and 3),
	CONSTRAINT "mesas_turno_ck" CHECK ("mesas"."turno" between 1 and 8)
);
--> statement-breakpoint
CREATE TABLE "plantillas" (
	"participante_id" uuid PRIMARY KEY NOT NULL,
	"jugadores" integer[] NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cuentas" ADD CONSTRAINT "cuentas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participantes" ADD CONSTRAINT "participantes_partida_id_partidas_id_fk" FOREIGN KEY ("partida_id") REFERENCES "public"."partidas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participantes" ADD CONSTRAINT "participantes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partidas" ADD CONSTRAINT "partidas_anfitrion_id_usuarios_id_fk" FOREIGN KEY ("anfitrion_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elecciones" ADD CONSTRAINT "elecciones_mesa_id_mesas_id_fk" FOREIGN KEY ("mesa_id") REFERENCES "public"."mesas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elecciones" ADD CONSTRAINT "elecciones_participante_id_participantes_id_fk" FOREIGN KEY ("participante_id") REFERENCES "public"."participantes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mesas" ADD CONSTRAINT "mesas_partida_id_partidas_id_fk" FOREIGN KEY ("partida_id") REFERENCES "public"."partidas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plantillas" ADD CONSTRAINT "plantillas_participante_id_participantes_id_fk" FOREIGN KEY ("participante_id") REFERENCES "public"."participantes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "jugadores_coleccion_idx" ON "jugadores" USING btree ("coleccion");--> statement-breakpoint
CREATE INDEX "participantes_partida_idx" ON "participantes" USING btree ("partida_id");--> statement-breakpoint
CREATE UNIQUE INDEX "participantes_partida_usuario_uq" ON "participantes" USING btree ("partida_id","usuario_id");--> statement-breakpoint
CREATE INDEX "partidas_estado_idx" ON "partidas" USING btree ("estado");--> statement-breakpoint
CREATE UNIQUE INDEX "sesiones_token_uq" ON "sesiones" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_email_uq" ON "usuarios" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "elecciones_turno_uq" ON "elecciones" USING btree ("mesa_id","ronda","turno","participante_id");--> statement-breakpoint
CREATE UNIQUE INDEX "elecciones_carta_uq" ON "elecciones" USING btree ("mesa_id","jugador_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mesas_partida_indice_uq" ON "mesas" USING btree ("partida_id","indice");