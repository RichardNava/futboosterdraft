import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  crearMesa,
  elegir,
  ErrorDraft,
  plantillas,
  receptor,
  resolverTurno,
  sobreDe,
  todosEligieron,
  vistaParticipante,
  type Mesa,
} from '../../src/draft/mesa';

const T0 = 1_000_000;
const TURNO_S = 45;

/** Mesa sintética: sobre del asiento a en la ronda r = cartas [base, base+7], medias crecientes. */
function mesaDePrueba(n: number): Mesa {
  const participantes = Array.from({ length: n }, (_, i) => `p${i}`);
  const sobres = [];
  const medias: Record<number, number> = {};
  let id = 1;
  for (const ronda of [1, 2, 3] as const) {
    for (let asiento = 0; asiento < n; asiento++) {
      const cartas: number[] = [];
      for (let k = 0; k < 8; k++) {
        cartas.push(id);
        medias[id] = 70 + ((id * 7) % 25);
        id++;
      }
      sobres.push({ ronda, asientoOrigen: asiento, cartas });
    }
  }
  return crearMesa({ participantes, sobres, medias, ahora: T0, turnoS: TURNO_S });
}

/** Completa el draft eligiendo siempre la primera carta (o dejando vencer si `vencer`). */
function jugarDraft(mesa: Mesa, decide: (m: Mesa, p: string) => number | null) {
  let ahora = T0;
  const recorridos: { ronda: number; turno: number; asiento: number; sobreOrigen: number }[] = [];
  while (mesa.estado === 'en_turno') {
    for (const [asiento, p] of mesa.participantes.entries()) {
      const s = sobreDe(mesa, p);
      recorridos.push({ ronda: mesa.ronda, turno: mesa.turno, asiento, sobreOrigen: s.asientoOrigen });
      const carta = decide(mesa, p);
      if (carta !== null) mesa = elegir(mesa, p, carta, ahora);
    }
    ahora = todosEligieron(mesa) ? ahora + 1000 : mesa.venceEn + 1;
    mesa = resolverTurno(mesa, ahora);
  }
  return { mesa, recorridos };
}

describe('mesa de draft (FR-006 a FR-012)', () => {
  it('receptor: izquierda (asiento + 1) en las rondas 1 y 3, derecha (asiento − 1) en la 2', () => {
    expect(receptor(0, 1, 5)).toBe(1);
    expect(receptor(4, 1, 5)).toBe(0);
    expect(receptor(0, 2, 5)).toBe(4);
    expect(receptor(3, 3, 5)).toBe(4);
  });

  it('los sobres circulan en la dirección correcta (SC-002)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 4, max: 8 }), (n) => {
        const { recorridos } = jugarDraft(mesaDePrueba(n), (m, p) => sobreDe(m, p).restantes[0]!);
        for (const r of recorridos) {
          const d = r.ronda === 2 ? -1 : 1;
          // En el turno t, el asiento a tiene el sobre que abrió el asiento a − d·(t−1).
          const esperado = (((r.asiento - d * (r.turno - 1)) % n) + n) % n;
          expect(r.sobreOrigen).toBe(esperado);
        }
      }),
      { numRuns: 15 },
    );
  });

  it('al final cada participante tiene 24 jugadores, 8 de cada sobre, sin duplicados (SC-001, FR-012)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 4, max: 8 }), fc.integer({ min: 0, max: 1000 }), (n, sal) => {
        const { mesa } = jugarDraft(mesaDePrueba(n), (m, p) => {
          const r = sobreDe(m, p).restantes;
          return r[(sal + m.turno) % r.length]!;
        });
        expect(mesa.estado).toBe('terminada');
        const ps = plantillas(mesa);
        const todos = Object.values(ps).flat();
        expect(new Set(todos).size).toBe(todos.length);
        for (const p of mesa.participantes) {
          expect(ps[p]).toHaveLength(24);
          for (const ronda of [1, 2, 3]) {
            expect(mesa.elecciones.filter((e) => e.participanteId === p && e.ronda === ronda)).toHaveLength(8);
          }
        }
      }),
      { numRuns: 20 },
    );
  });

  it('al vencer el turno se elige la carta de mayor media; con empate, la primera del sobre (FR-009)', () => {
    let mesa = mesaDePrueba(4);
    const sobre = sobreDe(mesa, 'p0');
    const medias = sobre.restantes.map((id) => mesa.medias[id]!);
    const maxima = Math.max(...medias);
    const esperada = sobre.restantes[medias.indexOf(maxima)];
    mesa = resolverTurno(mesa, mesa.venceEn + 1);
    const auto = mesa.elecciones.find((e) => e.participanteId === 'p0');
    expect(auto?.jugadorId).toBe(esperada);
    expect(auto?.origen).toBe('auto');
  });

  it('desempate de la autoelección: la primera en el orden del sobre', () => {
    let mesa = mesaDePrueba(4);
    const sobre = sobreDe(mesa, 'p1');
    const medias = { ...mesa.medias };
    for (const id of sobre.restantes) medias[id] = 80;
    mesa = { ...mesa, medias };
    mesa = resolverTurno(mesa, mesa.venceEn + 1);
    expect(mesa.elecciones.find((e) => e.participanteId === 'p1')?.jugadorId).toBe(sobre.restantes[0]);
  });

  it('rechaza YA_ELEGIDO, CARTA_NO_EN_SOBRE y TURNO_CERRADO (FR-010)', () => {
    let mesa = mesaDePrueba(4);
    const propia = sobreDe(mesa, 'p0').restantes[0]!;
    const ajena = sobreDe(mesa, 'p1').restantes[0]!;
    const codigo = (f: () => unknown) => {
      try {
        f();
      } catch (e) {
        return (e as ErrorDraft).codigo;
      }
      return null;
    };
    expect(codigo(() => elegir(mesa, 'p0', ajena, T0))).toBe('CARTA_NO_EN_SOBRE');
    expect(codigo(() => elegir(mesa, 'p0', propia, mesa.venceEn + 1))).toBe('TURNO_CERRADO');
    mesa = elegir(mesa, 'p0', propia, T0);
    expect(codigo(() => elegir(mesa, 'p0', sobreDe(mesa, 'p0').restantes[1]!, T0))).toBe('YA_ELEGIDO');
    expect(codigo(() => elegir(mesa, 'nadie', propia, T0))).toBe('NO_PARTICIPA');
  });

  it('el turno no avanza mientras falten elecciones y quede tiempo', () => {
    let mesa = mesaDePrueba(4);
    mesa = elegir(mesa, 'p0', sobreDe(mesa, 'p0').restantes[0]!, T0);
    expect(todosEligieron(mesa)).toBe(false);
    expect(() => resolverTurno(mesa, T0 + 1000)).toThrow(ErrorDraft);
  });

  it('la vista de un participante no revela las elecciones ajenas del turno (FR-007)', () => {
    let mesa = mesaDePrueba(4);
    const carta = sobreDe(mesa, 'p1').restantes[2]!;
    mesa = elegir(mesa, 'p1', carta, T0);
    const vista = vistaParticipante(mesa, 'p0');
    expect(vista.eligieron).toEqual(['p1']);
    expect(JSON.stringify(vista)).not.toContain(`${carta}`.padStart(0));
    expect(vista.misElecciones).toEqual([]);
    expect(vista.sobre.cartas).toEqual(sobreDe(mesa, 'p0').restantes);
    expect(vista.haElegido).toBe(false);
  });

  it('vence en turnoS segundos y el siguiente turno recibe un nuevo plazo', () => {
    let mesa = mesaDePrueba(4);
    expect(mesa.venceEn).toBe(T0 + TURNO_S * 1000);
    const ahora = mesa.venceEn + 1;
    mesa = resolverTurno(mesa, ahora);
    expect(mesa.turno).toBe(2);
    expect(mesa.venceEn).toBe(ahora + TURNO_S * 1000);
  });
});
