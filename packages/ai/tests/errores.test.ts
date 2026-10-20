/**
 * Errores creíbles de los NPC (spec 003, FR-037; research R12, data-model §6; T087): con plantillas Core
 * aleatorias, cualquier error de cualquier familia y nivel respeta el guardarraíl.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import fc from 'fast-check';
import {
  autoAlineacion,
  derivarSemilla,
  NIVELES_NPC,
  PARAMETROS_V3,
  previsualizar,
  Rng,
  semillaDesdeTexto,
  tacticaPorDefecto,
  validarAlineacion,
  type Alineacion,
  type Jugador,
} from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import {
  errorAlineacion,
  errorColocacion,
  errorFormacion,
  errorLanzadores,
  errorTactica,
  fuerzaColocada,
  CRUCE_MAXIMO,
  type ContextoErrores,
} from '../src/errores';
import { decidirAlineacionDetallada } from '../src/alineacion';
import { erroresDe } from '../src/perfiles';

const p = PARAMETROS_V3;
const RUTA_CORE = fileURLToPath(new URL('../../../data/core.json', import.meta.url));
const CORE = (JSON.parse(readFileSync(RUTA_CORE, 'utf-8')) as { jugadores: Jugador[] }).jugadores;
const CUPO = { POR: 3, DEF: 8, MED: 8, DEL: 5 } as const;

/** Plantilla de 24 de la colección Core, al azar con la semilla. */
function plantillaCore(semilla: string): Jugador[] {
  const rng = new Rng(semillaDesdeTexto(semilla));
  const barajada = rng.barajar(CORE);
  return (Object.keys(CUPO) as (keyof typeof CUPO)[]).flatMap((d) => barajada.filter((j) => j.demarcacion === d).slice(0, CUPO[d]));
}

type Familia = 'formacion' | 'alineacion' | 'colocacion' | 'tactica' | 'lanzadores';
const FAMILIAS: readonly Familia[] = ['formacion', 'alineacion', 'colocacion', 'tactica', 'lanzadores'];

function aplicar(familia: Familia, a: Alineacion, ctx: ContextoErrores, rival: Jugador[], semilla: string): Alineacion | null {
  const rng = new Rng(semillaDesdeTexto(semilla));
  switch (familia) {
    case 'formacion':
      return errorFormacion(a, ctx, rng);
    case 'alineacion':
      return errorAlineacion(a, ctx, rng);
    case 'colocacion':
      return errorColocacion(a, ctx, rng);
    case 'tactica':
      return errorTactica(a, ctx, rival, rng);
    case 'lanzadores':
      return errorLanzadores(a, ctx, rng);
  }
}

describe('errores de los NPC (T087)', () => {
  it('cualquier error de cualquier familia y nivel deja una alineación válida, sin cruces > 0,2 y dentro del coste', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 8 }),
        fc.constantFrom(...NIVELES_NPC),
        fc.constantFrom(...FAMILIAS),
        (semilla, nivel, familia) => {
          const plantilla = plantillaCore(`plantilla:${semilla}`);
          const rival = plantillaCore(`rival:${semilla}`);
          const bajas = new Set<number>();
          const ctx: ContextoErrores = { plantilla, bajas, p, costeMaximo: erroresDe(nivel, p).costeMaximo };
          const correcta = autoAlineacion(plantilla, bajas, p, { tactica: tacticaPorDefecto() });
          const otra = aplicar(familia, correcta, ctx, rival, `error:${semilla}`);
          if (!otra) return;
          expect(validarAlineacion(otra, plantilla.map((j) => j.id), bajas)).toEqual([]);
          const porId = new Map(plantilla.map((j) => [j.id, j]));
          for (const t of otra.titulares) {
            // El portero en la portería y ningún jugador de campo en ella.
            expect(t.casillaId === 'POR').toBe(porId.get(t.jugadorId)!.demarcacion === 'POR');
          }
          const antes = new Map(previsualizar(correcta, (id) => porId.get(id)!, p).titulares.map((t) => [t.jugadorId, t.penalizacion]));
          for (const t of previsualizar(otra, (id) => porId.get(id)!, p).titulares) {
            if (t.penalizacion > (antes.get(t.jugadorId) ?? 0)) expect(t.penalizacion).toBeLessThanOrEqual(CRUCE_MAXIMO);
          }
          expect(fuerzaColocada(correcta, plantilla, p) - fuerzaColocada(otra, plantilla, p)).toBeLessThanOrEqual(ctx.costeMaximo + 1e-9);
        },
      ),
      { numRuns: 120, seed: 3 },
    );
  });

  it('con la misma semilla, el mismo error', () => {
    const plantilla = plantillaCore('x');
    const rival = plantillaCore('y');
    for (const nivel of NIVELES_NPC) {
      const a = decidirAlineacionDetallada(nivel, plantilla, new Set(), rival, derivarSemilla(semillaDesdeTexto('s'), nivel), { parametros: p, limiteMs: 0 });
      const b = decidirAlineacionDetallada(nivel, plantilla, new Set(), rival, derivarSemilla(semillaDesdeTexto('s'), nivel), { parametros: p, limiteMs: 0 });
      expect(a).toEqual(b);
    }
    for (const familia of FAMILIAS) {
      const ctx: ContextoErrores = { plantilla, bajas: new Set(), p, costeMaximo: 6 };
      const correcta = autoAlineacion(plantilla, new Set(), p);
      expect(aplicar(familia, correcta, ctx, rival, 'misma')).toEqual(aplicar(familia, correcta, ctx, rival, 'misma'));
    }
  });

  it('las familias de la preparación producen errores (no son siempre nulas)', () => {
    const vistos = new Set<Familia>();
    for (let i = 0; i < 40 && vistos.size < FAMILIAS.length; i++) {
      const plantilla = plantillaCore(`v${i}`);
      const rival = plantillaCore(`r${i}`);
      const ctx: ContextoErrores = { plantilla, bajas: new Set(), p, costeMaximo: 6 };
      const correcta = autoAlineacion(plantilla, new Set(), p);
      for (const f of FAMILIAS) if (aplicar(f, correcta, ctx, rival, `e${i}`)) vistos.add(f);
    }
    expect([...vistos].sort()).toEqual([...FAMILIAS].sort());
  });
});
