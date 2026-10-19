/**
 * Sonda de calibración de `npc.errores` (T097): porcentaje de victorias del participante de referencia contra 7 NPC
 * de un nivel con otra probabilidad y otro coste de errores, cambiando los parámetros en memoria (sin tocar
 * `v3.json`).
 *
 *   pnpm --filter @fbd/balance exec tsx src/sondaNPC.ts 20 amateur:700:12 intermedio:450:9
 */
import { PARAMETROS_V3, type FamiliaErrorNPC, type NivelNPC } from '@fbd/domain';
import { victoriasReferencia } from './checks/npc';

const torneos = Number(process.argv[2] ?? 20);
const familias: FamiliaErrorNPC[] = ['draft', 'alineacion', 'colocacion', 'formacion', 'tactica', 'lanzadores', 'partido'];

for (const variante of process.argv.slice(3)) {
  const [nivel, prob, coste] = variante.split(':') as [NivelNPC, string, string];
  const e = PARAMETROS_V3.npc.errores[nivel];
  e.probabilidad = Object.fromEntries(familias.map((f) => [f, Number(prob)])) as typeof e.probabilidad;
  e.costeMaximo = Number(coste);
  const [r] = victoriasReferencia(torneos, 1, [nivel]);
  console.log(`${nivel} ${prob}‰ coste ${coste}: ${r!.pctVictorias.toFixed(1)} % ± ${r!.errorEstandar.toFixed(1)} (V ${r!.victorias} / E ${r!.empates} / D ${r!.derrotas})`);
}
