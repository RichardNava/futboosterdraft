import { describe, expect, it } from 'vitest';
import { POSICIONES, POSICIONES_POR_DEMARCACION, type Demarcacion, type Posicion } from '../../src/catalogo/tipos';
import { casilla, CASILLA_CENTRAL } from '../../src/equipo/formaciones';
import { penalizacionPorPosicion, statsEfectivos } from '../../src/equipo/statsEfectivos';
import { PARAMETROS_V3 } from '../../src/parametros/index';
import { jugador } from './ayudas';

const p = PARAMETROS_V3;

const DEMARCACION: Record<Posicion, Demarcacion> = Object.fromEntries(
  (Object.entries(POSICIONES_POR_DEMARCACION) as [Demarcacion, readonly Posicion[]][]).flatMap(([d, ps]) => ps.map((x) => [x, d])),
) as Record<Posicion, Demarcacion>;

/**
 * Tabla de FR-031 y FR-032 copiada literalmente de spec.md (no de los parámetros): la prueba es la que fija
 * que los valores coinciden con la especificación (SC-012, invariante 9).
 */
function esperada(origen: Posicion, destino: readonly Posicion[]): number {
  if (destino.includes(origen)) return 0;
  const dOrigen = DEMARCACION[origen];
  const dDestino = DEMARCACION[destino[0]!];
  // | DEF, MED o DEL | POR | −60 % |  y  | POR | DEF, MED o DEL, cualquier posición | −60 % |
  if ((dOrigen === 'POR') !== (dDestino === 'POR')) return 0.6;
  // FR-031: misma demarcación, posición que no tiene: −10 %.
  if (dOrigen === dDestino) return 0.1;
  const destinoMco = destino.includes('MCO');
  if (dOrigen === 'DEL') return dDestino === 'MED' ? 0.2 : 0.4; // | DEL | MED | −20 % | · | DEL | DEF | −40 % |
  if (dOrigen === 'MED') {
    if (origen === 'MCO') return dDestino === 'DEL' ? 0.1 : 0.3; // | MED (MCO) | DEL | −10 % | · | DEF | −30 % |
    if (origen === 'MD') return dDestino === 'DEL' ? 0.3 : 0.1; // | MED (MD) | DEL | −30 % | · | DEF | −10 % |
    return 0.2; // | MED, excepto MCO y MD | DEL o DEF | −20 % |
  }
  // DEF
  if (dDestino === 'DEL') return 0.4; // | DEF | DEL | −40 % |
  return destinoMco ? 0.3 : 0.2; // | DEF | MED (MCO) | −30 % | · | DEF | MED excepto MCO | −20 % |
}

const DESTINOS: { nombre: string; posicionesAdmitidas: readonly Posicion[] }[] = [
  ...POSICIONES.map((x) => ({ nombre: x, posicionesAdmitidas: [x] as const })),
  { nombre: 'central de 3 o 5', posicionesAdmitidas: ['DCI', 'DCD'] },
];

describe('penalización por posición (FR-031 a FR-033, SC-012, T024)', () => {
  it('todas las combinaciones de posición de origen y de destino coinciden con la tabla de la spec', () => {
    const errores: string[] = [];
    for (const origen of POSICIONES) {
      const j = jugador(DEMARCACION[origen], [origen], 80);
      for (const destino of DESTINOS) {
        const obtenida = penalizacionPorPosicion(j, destino, p);
        const deseada = esperada(origen, destino.posicionesAdmitidas);
        if (obtenida !== deseada) errores.push(`${origen} → ${destino.nombre}: ${obtenida} (esperado ${deseada})`);
      }
    }
    expect(errores).toEqual([]);
  });

  it('con varias posiciones se aplica la menor: MC + MD de DEL, −20 %; MD puro, −30 %', () => {
    const dc = { posicionesAdmitidas: ['DC'] as const };
    expect(penalizacionPorPosicion(jugador('MED', ['MC', 'MD'], 80), dc, p)).toBe(0.2);
    expect(penalizacionPorPosicion(jugador('MED', ['MD'], 80), dc, p)).toBe(0.3);
    expect(penalizacionPorPosicion(jugador('MED', ['MCO', 'MD'], 80), { posicionesAdmitidas: ['LD'] }, p)).toBe(0.1);
  });

  it('Todocampista: 0 en cualquier casilla de campo y −60 % en la portería', () => {
    const todo = jugador('DEL', ['DC'], 80, ['Todocampista']);
    for (const destino of DESTINOS.filter((d) => !d.posicionesAdmitidas.includes('POR'))) expect(penalizacionPorPosicion(todo, destino, p)).toBe(0);
    expect(penalizacionPorPosicion(todo, { posicionesAdmitidas: ['POR'] }, p)).toBe(0.6);
  });

  it('un DEF sin DCI ni DCD en la casilla central de una defensa de 3 o 5 recibe −10 % (Edge Case)', () => {
    const central = casilla('3-5-2', CASILLA_CENTRAL)!;
    expect(penalizacionPorPosicion(jugador('DEF', ['LD'], 80), central, p)).toBe(0.1);
    expect(penalizacionPorPosicion(jugador('DEF', ['DCI'], 80), central, p)).toBe(0);
  });

  it('los parámetros 2.0.0 contienen exactamente la tabla de la spec', () => {
    expect(p.penalizacionPosicion.mismaDemarcacion).toBe(0.1);
    expect(p.penalizacionPosicion.porteria).toBe(0.6);
    const cruces = Object.fromEntries(p.penalizacionPosicion.cruces.map((c) => [`${c.origen}>${c.destino}`, c.valor]));
    expect(cruces).toEqual({
      'DEL>MED': 0.2,
      'DEL>MED_MCO': 0.2,
      'DEL>DEF': 0.4,
      'MED>DEL': 0.2,
      'MED>DEF': 0.2,
      'MED_MCO>DEL': 0.1,
      'MED_MCO>DEF': 0.3,
      'MED_MD>DEL': 0.3,
      'MED_MD>DEF': 0.1,
      'DEF>DEL': 0.4,
      'DEF>MED': 0.2,
      'DEF>MED_MCO': 0.3,
    });
  });
});

describe('statsEfectivos (FR-028, FR-033)', () => {
  it('en una casilla de su posición no hay penalización', () => {
    const r = statsEfectivos(jugador('DEF', ['LD'], 80), casilla('4-3-3', 'LD')!, p);
    expect(r.fueraDePosicion).toBe(false);
    expect(r.penalizacion).toBe(0);
    expect(r.media).toBeCloseTo(80);
  });

  it('los stats efectivos aplican el porcentaje de la tabla a los seis stats', () => {
    const r = statsEfectivos(jugador('DEL', ['DC'], 80), casilla('4-3-3', 'LD')!, p);
    expect(r.penalizacion).toBe(0.4);
    expect(Object.values(r.stats).every((v) => v === 48)).toBe(true);
    expect(r.media).toBeCloseTo(48);
  });

  it('un portero fuera de la portería pierde un 60 %', () => {
    const r = statsEfectivos(jugador('POR', ['POR'], 80), casilla('4-3-3', 'DC')!, p);
    expect(r.penalizacion).toBe(0.6);
    expect(r.media).toBeCloseTo(32);
  });

  it('la media efectiva es el promedio de los stats efectivos, con un mínimo de 1 por stat', () => {
    const r = statsEfectivos(jugador('MED', ['MC'], 2, [], { pase: 90 }), casilla('4-3-3', 'POR')!, p);
    const valores = Object.values(r.stats);
    expect(Math.min(...valores)).toBeGreaterThanOrEqual(1);
    expect(r.media).toBeCloseTo(valores.reduce((a, b) => a + b, 0) / valores.length);
  });
});
