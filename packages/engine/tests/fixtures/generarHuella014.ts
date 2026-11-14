/**
 * Genera `huella-014.json` (T068). Se ejecuta una sola vez, al cerrar el motor 7.0.0 (antes de refactorizar):
 *   pnpm --filter @fbd/engine exec tsx tests/fixtures/generarHuella014.ts
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parametrosActuales } from '@fbd/domain';
import { draftHuella, partidoHuella, SEMILLAS_DRAFTS, SEMILLAS_PARTIDOS, type Huella } from './huella014';

const huella: Huella = {
  version: parametrosActuales().version,
  partidos: SEMILLAS_PARTIDOS.map(partidoHuella),
  drafts: SEMILLAS_DRAFTS.map(draftHuella),
};
const ruta = fileURLToPath(new URL('./huella-014.json', import.meta.url));
writeFileSync(ruta, `${JSON.stringify(huella)}\n`);
console.log(`Escrita ${ruta}: ${huella.partidos.length} partidos y ${huella.drafts.length} drafts.`);
