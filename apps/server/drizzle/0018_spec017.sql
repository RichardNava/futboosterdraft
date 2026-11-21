-- Spec 017: roles, suspensión, borrado de cuentas con pase, caducidad de peticiones, registro de administración y
-- órdenes de consola. Las cuentas existentes quedan como `jugador`.
ALTER TABLE "usuarios" ADD COLUMN "rol" text DEFAULT 'jugador' NOT NULL;
--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "suspendida_en" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_rol_ck" CHECK ("rol" in ('jugador','betatester','administrador'));
--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_invitado_rol_ck" CHECK (not "es_invitado" or "rol" = 'jugador');
--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_admin_suspension_ck" CHECK ("rol" <> 'administrador' or "suspendida_en" is null);
--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_invitado_suspension_ck" CHECK (not "es_invitado" or "suspendida_en" is null);
--> statement-breakpoint
ALTER TABLE "pases_premium" DROP CONSTRAINT "pases_premium_usuario_id_fkey";
--> statement-breakpoint
ALTER TABLE "pases_premium" ADD CONSTRAINT "pases_premium_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "movimientos_fragmentos" DROP CONSTRAINT "movimientos_fragmentos_motivo_ck";
--> statement-breakpoint
ALTER TABLE "movimientos_fragmentos" ADD CONSTRAINT "movimientos_fragmentos_motivo_ck"
  CHECK ("motivo" in ('recompensa_torneo','desfragmentacion','duplicado','compra_fragmentos','compra_sobre','compra_cosmetico','compra_coleccion','nivel_rareza','devolucion_nivel_rareza','compra_pase_premium','entrega_betatester'));
--> statement-breakpoint
CREATE UNIQUE INDEX "movimientos_entrega_betatester_uq" ON "movimientos_fragmentos" ("referencia") WHERE "motivo" = 'entrega_betatester';
--> statement-breakpoint
ALTER TABLE "avisos" DROP CONSTRAINT "avisos_tipo_ck";
--> statement-breakpoint
ALTER TABLE "avisos" ADD CONSTRAINT "avisos_tipo_ck"
  CHECK ("tipo" in ('jornada_abierta','rival_listo','plazo_proximo','partido_auto_resuelto','torneo_terminado','dorsal_asignado','baja_sustituida','partida_cerrada'));
--> statement-breakpoint
CREATE INDEX "peticiones_procesadas_creada_idx" ON "peticiones_procesadas" ("creada_en");
--> statement-breakpoint
CREATE TABLE "registro_admin" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_id" text,
  "actor_tipo" text NOT NULL,
  "actor_rol" text NOT NULL,
  "accion" text NOT NULL,
  "objeto_tipo" text,
  "objeto_id" text,
  "valor_anterior" jsonb,
  "valor_nuevo" jsonb,
  "motivo" text,
  "resultado" text NOT NULL,
  "intentos" integer DEFAULT 1 NOT NULL,
  "creado_en" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "registro_admin_actor_tipo_ck" CHECK ("actor_tipo" in ('cuenta','consola')),
  CONSTRAINT "registro_admin_objeto_tipo_ck" CHECK ("objeto_tipo" is null or "objeto_tipo" in ('cuenta','partida','ajuste')),
  CONSTRAINT "registro_admin_resultado_ck" CHECK ("resultado" in ('ok','denegado','error')),
  CONSTRAINT "registro_admin_motivo_ck" CHECK ("motivo" is null or char_length("motivo") <= 500),
  CONSTRAINT "registro_admin_intentos_ck" CHECK ("intentos" > 0)
);
--> statement-breakpoint
CREATE INDEX "registro_admin_creado_idx" ON "registro_admin" ("creado_en" DESC);
--> statement-breakpoint
CREATE INDEX "registro_admin_objeto_idx" ON "registro_admin" ("objeto_tipo", "objeto_id", "creado_en" DESC);
--> statement-breakpoint
CREATE INDEX "registro_admin_actor_idx" ON "registro_admin" ("actor_id", "creado_en" DESC);
--> statement-breakpoint
CREATE FUNCTION "registro_admin_inalterable"() RETURNS trigger AS $$
BEGIN
  -- Única excepción (FR-047): retirar el texto libre al eliminar la cuenta afectada.
  IF TG_OP = 'UPDATE' AND NEW."motivo" IS NULL AND (to_jsonb(NEW) - 'motivo') = (to_jsonb(OLD) - 'motivo') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'registro_admin es inalterable';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "registro_admin_inalterable_tg" BEFORE UPDATE OR DELETE ON "registro_admin"
  FOR EACH ROW EXECUTE FUNCTION "registro_admin_inalterable"();
--> statement-breakpoint
CREATE TABLE "ordenes_consola" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tipo" text NOT NULL,
  "datos" jsonb NOT NULL,
  "estado" text DEFAULT 'pendiente' NOT NULL,
  "resultado" jsonb,
  "creada_en" timestamp with time zone DEFAULT now() NOT NULL,
  "procesada_en" timestamp with time zone,
  CONSTRAINT "ordenes_consola_tipo_ck" CHECK ("tipo" in ('partida.cerrar')),
  CONSTRAINT "ordenes_consola_estado_ck" CHECK ("estado" in ('pendiente','hecha','rechazada','caducada'))
);
--> statement-breakpoint
CREATE INDEX "ordenes_consola_pendientes_idx" ON "ordenes_consola" ("creada_en") WHERE "estado" = 'pendiente';
