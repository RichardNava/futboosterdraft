/**
 * Genera `huella-018.json` (spec 018, T064; SC-009): los mismos 100 partidos y 20 drafts de `huella014.ts`, con los
 * parámetros 9.0.0 ya calibrados (T063). Se genera una sola vez y no se regenera: si una optimización la cambia, la
 * optimización no es válida (FR-045).
 *   pnpm --filter @fbd/engine exec tsx tests/fixtures/generarHuella018.ts
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PARAMETROS_V9 } from '@fbd/domain';
import { draftHuella, partidoHuella, SEMILLAS_DRAFTS, SEMILLAS_PARTIDOS, type Huella } from './huella014';

const huella: Huella = {
  version: PARAMETROS_V9.version,
  partidos: SEMILLAS_PARTIDOS.map((i) => partidoHuella(i, PARAMETROS_V9)),
  drafts: SEMILLAS_DRAFTS.map((i) => draftHuella(i, PARAMETROS_V9)),
};
const ruta = fileURLToPath(new URL('./huella-018.json', import.meta.url));
writeFileSync(ruta, `${JSON.stringify(huella)}\n`);
console.log(`Escrita ${ruta}: ${huella.partidos.length} partidos y ${huella.drafts.length} drafts.`);
