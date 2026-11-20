-- Spec 016 (data-model §2): sobre de regalo de cada colección, número de la carta dentro de su colección, cosméticos
-- no vendibles y colecciones de pago sin precio en euros. No borra datos: la retirada de las cartas de prueba la hace
-- el seed.
ALTER TABLE "colecciones" ADD COLUMN "sobre_regalo" text REFERENCES "cosmeticos"("id");
--> statement-breakpoint
ALTER TABLE "colecciones" DROP CONSTRAINT "colecciones_precio_ck";
--> statement-breakpoint
ALTER TABLE "colecciones_cartas" ADD COLUMN "numero" integer;
--> statement-breakpoint
ALTER TABLE "colecciones_cartas" ADD CONSTRAINT "colecciones_cartas_numero_ck" CHECK ("numero" is null or "numero" >= 1);
--> statement-breakpoint
ALTER TABLE "cosmeticos" ADD COLUMN "vendible" boolean DEFAULT true NOT NULL;
