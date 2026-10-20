/** Participante de referencia de SC-010 (spec 003, research R13; T089). */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { derivarSemilla, PARAMETROS_V3, Rng, semillaDesdeTexto, tacticaPorDefecto, type Jugador } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { draftMesa } from '../src/checks/npc';
import { alineacionReferencia, elegirCartaReferencia, FORMACIONES_REFERENCIA } from '../src/referencia';

const p = PARAMETROS_V3;
const CORE = (JSON.parse(readFileSync(fileURLToPath(new URL('../../../data/core.json', import.meta.url)), 'utf-8')) as { jugadores: Jugador[] }).jugadores;

describe('participante de referencia (T089)', () => {
  it('es determinista: con la misma semilla, el mismo draft y la misma alineación', () => {
    const draft = () =>
      draftMesa('referencia-t089', ['referencia', 'otro'], (_pid, sobre, parcial, ronda, turno) => elegirCartaReferencia(sobre, parcial, ronda, turno, p));
    const a = draft();
    const b = draft();
    expect(a.referencia!.map((j) => j.id)).toEqual(b.referencia!.map((j) => j.id));
    expect(alineacionReferencia(a.referencia!, new Set(), p)).toEqual(alineacionReferencia(b.referencia!, new Set(), p));
  });

  it('usa la táctica por defecto y una formación entre 4-4-2 y 4-3-3', () => {
    for (let i = 0; i < 10; i++) {
      const rng = new Rng(derivarSemilla(semillaDesdeTexto('plantillas'), String(i)));
      const barajada = rng.barajar(CORE);
      const plantilla = (['POR', 'DEF', 'MED', 'DEL'] as const).flatMap((d, k) => barajada.filter((j) => j.demarcacion === d).slice(0, [3, 8, 8, 5][k]));
      const a = alineacionReferencia(plantilla, new Set(), p);
      expect(FORMACIONES_REFERENCIA).toContain(a.formacion);
      expect(a.tactica).toEqual(tacticaPorDefecto());
    }
  });

  it('nunca pide cambios durante el partido: en los partidos de SC-010 su lado no tiene nivel de NPC', async () => {
    // `torneoReferencia` pasa a `jugarHastaElFinal` solo el nivel del lado del NPC; el de la referencia queda sin
    // nivel y, por tanto, sin decisiones (ver `decidirNPCEnPausa`).
    const fuente = readFileSync(fileURLToPath(new URL('../src/checks/npc.ts', import.meta.url)), 'utf-8');
    expect(fuente).toContain('enCasa ? { visitante: nivel } : { local: nivel }');
  });
});
