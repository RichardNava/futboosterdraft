/**
 * Sonda de goles contra NPC (spec 012, ronda 2): goles a favor y en contra del participante de referencia en la liga
 * de `torneoReferencia` (draft de Core, alineación del NPC mirando al rival, partido con `jugarHastaElFinal`).
 *
 *   pnpm --filter @fbd/balance exec tsx src/sondaGolesNPC.ts 4 amateur intermedio avanzado PRO
 */
import { decidirAlineacion, equipoDesdeAlineacion, jugarHastaElFinal } from '@fbd/ai';
import { derivarSemilla, parametrosActuales, type NivelNPC } from '@fbd/domain';
import { crearPartido } from '@fbd/engine';
import { draftMesa, electorNPC, relojSimulado } from './checks/npc';
import { alineacionReferencia, elegirCartaReferencia } from './referencia';

const torneos = Number(process.argv[2] ?? 4);
const niveles = (process.argv.slice(3).length ? process.argv.slice(3) : ['amateur', 'intermedio', 'avanzado', 'PRO']) as NivelNPC[];
const p = parametrosActuales();

for (const nivel of niveles) {
  const favor: number[] = [];
  const contra: number[] = [];
  for (let t = 0; t < torneos; t++) {
    const semilla = `sonda-goles:${nivel}:${t}`;
    const npcs = Array.from({ length: 7 }, (_, i) => `npc${i + 1}`);
    const participantes = ['referencia', ...npcs];
    const { elegirDe } = electorNPC(semilla, participantes.length, p);
    const equipos = draftMesa(semilla, participantes, (pid, sobre, parcial, ronda, turno) =>
      pid === 'referencia' ? elegirCartaReferencia(sobre, parcial, ronda, turno, p) : elegirDe(nivel, pid, sobre, parcial, ronda, turno),
    );
    const porIdDe = (pid: string) => new Map(equipos[pid]!.map((j) => [j.id, j]));
    const referencia = equipoDesdeAlineacion('referencia', alineacionReferencia(equipos.referencia!, new Set(), p), porIdDe('referencia'));
    for (const npc of npcs) {
      const a = decidirAlineacion(nivel, equipos[npc]!, new Set(), equipos.referencia!, derivarSemilla(semilla, `alineacion:${npc}`), { parametros: p, ahora: relojSimulado() });
      const rival = equipoDesdeAlineacion(npc, a, porIdDe(npc));
      const semillaPartido = derivarSemilla(semilla, `partido:${npc}`);
      const motor = crearPartido({ version: p.version, parametros: p, semilla: semillaPartido, eliminatoria: false, local: referencia, visitante: rival });
      const fin = jugarHastaElFinal(motor, { visitante: nivel }, semillaPartido);
      favor.push(fin.marcador.local);
      contra.push(fin.marcador.visitante);
    }
  }
  const m = (x: number[]) => (x.reduce((a, b) => a + b, 0) / x.length).toFixed(2);
  const goleadas = favor.filter((g, i) => g + contra[i]! >= 8).length;
  console.log(`${nivel}: a favor ${m(favor)} · en contra ${m(contra)} · partidos con ≥ 8 goles ${goleadas}/${favor.length} · máx ${Math.max(...favor)}`);
}
