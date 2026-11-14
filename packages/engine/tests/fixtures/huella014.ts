/**
 * Huella de equivalencia de la spec 014 (T068, research R13; data-model §6): 100 partidos (semillas 1–100, equipos de
 * `tools/balance` variados en formación, táctica y rasgos) y 20 drafts de 8 NPC (semillas 1–20). Se genera una vez al
 * cerrar el motor 7.0.0 y no se regenera durante la refactorización (FR-030): cualquier diferencia es un fallo.
 */
import { createHash } from 'node:crypto';
import { parametrosActuales, semillaDesdeTexto, type Tactica, type Virtud } from '@fbd/domain';
import { avanzar, crearPartido } from '../../src/index';
import { clonar, equipoSintetico } from '../../../../tools/balance/src/equipos';
import { draftMesa, electorNPC } from '../../../../tools/balance/src/checks/npc';

const FORMACIONES = ['4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '5-3-2', '3-4-3'] as const;
const TACTICAS: Partial<Tactica>[] = [
  {},
  { alturaBloque: 'presion_alta' },
  { alturaBloque: 'catenaccio' },
  { lineaAdelantada: true },
  { estiloConBalon: 'contraataque' },
  { estiloConBalon: 'combinativo' },
  { sistemaDefensivo: 'individual' },
];
const RASGOS: Virtud[][] = [[], ['Matador'], ['Incansable'], ['Desbordante'], ['Capitania']];
/** Ocho NPC, dos de cada nivel. */
const NIVELES_DRAFT = ['amateur', 'intermedio', 'avanzado', 'PRO'] as const;
const PARTICIPANTES = NIVELES_DRAFT.flatMap((n) => [`${n}-1`, `${n}-2`]);

export interface PartidoHuella {
  semilla: number;
  marcador: unknown;
  eventos: [string, number, string, number[]][];
  estadisticas: unknown;
  hashFotogramas: string;
}

export interface Huella {
  version: string;
  partidos: PartidoHuella[];
  drafts: { semilla: number; picks: Record<string, number[]> }[];
}

/** Partido `i` (1–100) de la huella. */
export function partidoHuella(i: number): PartidoHuella {
  const local = equipoSintetico({
    semilla: `huella-${i}`,
    formacion: FORMACIONES[i % FORMACIONES.length],
    tactica: TACTICAS[i % TACTICAS.length]!,
    virtudes: RASGOS[i % RASGOS.length]!,
  });
  const visitante = clonar(equipoSintetico({ semilla: `huella-${i}-b`, formacion: FORMACIONES[(i + 3) % FORMACIONES.length], tactica: TACTICAS[(i + 2) % TACTICAS.length]! }), 'visitante');
  // Los ids de los jugadores sintéticos salen de un contador global: se comparan por su posición en las convocatorias.
  const orden = new Map([...local.titulares.map((t) => t.jugador), ...local.suplentes, ...visitante.titulares.map((t) => t.jugador), ...visitante.suplentes].map((j, k) => [j.id, k]));
  const p = parametrosActuales();
  const r = avanzar(crearPartido({ version: p.version, parametros: p, semilla: semillaDesdeTexto(`huella-014-${i}`), eliminatoria: i % 4 === 0, local, visitante }), 'final', { fotogramas: true });
  return {
    semilla: i,
    marcador: r.marcador,
    eventos: r.estado.eventos.map((e) => [e.tipo, e.tick, e.equipo, e.jugadores.map((j) => orden.get(j.jugadorId) ?? -1)]),
    estadisticas: r.estadisticas,
    hashFotogramas: createHash('sha256').update(JSON.stringify(r.fotogramas)).digest('hex'),
  };
}

/** Draft `i` (1–20) de la huella: las cartas de cada NPC. */
export function draftHuella(i: number): { semilla: number; picks: Record<string, number[]> } {
  const semilla = `huella-014-draft-${i}`;
  const { elegirDe } = electorNPC(semilla, PARTICIPANTES.length, parametrosActuales());
  const nivel = (pid: string) => pid.slice(0, pid.lastIndexOf('-')) as (typeof NIVELES_DRAFT)[number];
  const plantillas = draftMesa(semilla, PARTICIPANTES, (pid, sobre, parcial, ronda, turno) => elegirDe(nivel(pid), pid, sobre, parcial, ronda, turno));
  return { semilla: i, picks: Object.fromEntries(Object.entries(plantillas).map(([pid, js]) => [pid, js.map((j) => j.id)])) };
}

export const SEMILLAS_PARTIDOS = Array.from({ length: 100 }, (_, i) => i + 1);
export const SEMILLAS_DRAFTS = Array.from({ length: 20 }, (_, i) => i + 1);
