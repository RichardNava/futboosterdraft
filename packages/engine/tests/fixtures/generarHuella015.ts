/**
 * Genera `huella-015.json` (spec 015, T073; SC-010): los mismos 100 partidos y 20 drafts que `huella-014.json`, con los
 * parámetros 8.0.0. Se genera al cerrar la spec y no se regenera después: cualquier diferencia es un cambio del motor.
 *   pnpm --filter @fbd/engine exec tsx tests/fixtures/generarHuella015.ts
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PARAMETROS_V8 } from '@fbd/domain';
import { draftHuella, partidoHuella, SEMILLAS_DRAFTS, SEMILLAS_PARTIDOS, type Huella } from './huella014';

const huella: Huella = {
  version: PARAMETROS_V8.version,
  partidos: SEMILLAS_PARTIDOS.map((i) => partidoHuella(i, PARAMETROS_V8)),
  drafts: SEMILLAS_DRAFTS.map((i) => draftHuella(i, PARAMETROS_V8)),
};
const ruta = fileURLToPath(new URL('./huella-015.json', import.meta.url));
writeFileSync(ruta, `${JSON.stringify(huella)}\n`);
console.log(`Escrita ${ruta}: ${huella.partidos.length} partidos y ${huella.drafts.length} drafts.`);
