CREATE TABLE "alineaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participante_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"formacion" text NOT NULL,
	"titulares" jsonb NOT NULL,
	"suplentes" integer[] NOT NULL,
	"tactica" jsonb NOT NULL,
	"lanzadores" jsonb NOT NULL,
	"confirmada_en" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "participantes" ADD COLUMN "equipaciones" jsonb;--> statement-breakpoint
ALTER TABLE "plantillas" ADD COLUMN "dorsales" jsonb;--> statement-breakpoint
ALTER TABLE "alineaciones" ADD CONSTRAINT "alineaciones_participante_id_participantes_id_fk" FOREIGN KEY ("participante_id") REFERENCES "public"."participantes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "alineaciones_version_uq" ON "alineaciones" USING btree ("participante_id","version");