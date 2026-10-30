-- El nivel "Epico" pasa a llamarse "Crack": se renombra en las cartas guardadas y en el check.
ALTER TABLE "jugadores" DROP CONSTRAINT "jugadores_nivel_ck";
--> statement-breakpoint
UPDATE "jugadores" SET "nivel" = 'Crack' WHERE "nivel" = 'Epico';
--> statement-breakpoint
ALTER TABLE "jugadores" ADD CONSTRAINT "jugadores_nivel_ck" CHECK ("jugadores"."nivel" in ('Superclase','Crack','Legendario','GOAT'));
