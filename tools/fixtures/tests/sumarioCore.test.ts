import type { Demarcacion, Jugador, Nivel, Posicion, RecuentoCatalogo } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { sumarioCore } from '../src/coreReal';

let id = 0;
const carta = (demarcacion: Demarcacion, nivel: Nivel, posicion: Posicion[], media = 80): Jugador =>
  ({ id: ++id, nombre_carta: `J${id}`, demarcacion, nivel, posicion, media, nacionalidad: 'ESP', defectos: [] }) as unknown as Jugador;

const cero = { Superclase: 0, Crack: 0, Legendario: 0, GOAT: 0 };
// Objetivo de 12 cartas.
const distribucion: RecuentoCatalogo = {
  POR: { ...cero, Superclase: 2 },
  DEF: { ...cero, Crack: 3 },
  MED: { ...cero, Superclase: 4 },
  DEL: { ...cero, Legendario: 2, GOAT: 1 },
};
// 6 cartas: falta 1 POR, falta 1 DEF Crack, faltan 4 MED, falta 1 DEL Legendario y sobra 1 DEL GOAT.
const jugadores = [
  carta('POR', 'Superclase', ['POR']),
  carta('DEF', 'Crack', ['LD', 'DCD']),
  carta('DEF', 'Crack', ['DCI']),
  carta('DEL', 'GOAT', ['DC'], 88.5),
  carta('DEL', 'GOAT', ['EI', 'DC'], 95),
  carta('DEL', 'Legendario', ['ED'], 85),
];

describe('sumarioCore (spec 008, R11)', () => {
  const s = sumarioCore(jugadores, distribucion);

  it('cuenta cada celda frente al objetivo', () => {
    expect(s.tabla.DEF.Crack).toEqual({ actual: 2, objetivo: 3, diferencia: 1 });
    expect(s.tabla.DEL.GOAT).toEqual({ actual: 2, objetivo: 1, diferencia: -1 });
  });

  it('huecos − excesos es lo que falta para el objetivo', () => {
    expect(s.huecos).toBe(7);
    expect(s.excesos).toBe(1);
    expect(s.huecos - s.excesos).toBe(12 - jugadores.length);
  });

  it('cuenta posiciones principales y secundarias, y marca la poca cobertura', () => {
    expect(s.posiciones.DC).toMatchObject({ principal: 1, secundaria: 1, cobertura: 2, pocaCobertura: true });
    expect(s.posiciones.DCD).toMatchObject({ principal: 0, secundaria: 1 });
  });

  it('propone recolocar el exceso más cercano al borde de su banda en el nivel vecino con hueco', () => {
    expect(s.recolocaciones).toEqual([
      { demarcacion: 'DEL', nivel: 'GOAT', sobran: 1, candidatos: [{ id: 4, nombre_carta: 'J4', media: 88.5, nivelPropuesto: 'Legendario' }] },
    ]);
  });

  it('ordena las necesidades por tamaño del hueco, con texto llano', () => {
    expect(s.necesidades.map((n) => [n.demarcacion, n.nivel, n.cuantos])).toEqual([
      ['MED', 'Superclase', 4],
      ['POR', 'Superclase', 1],
      ['DEF', 'Crack', 1],
      ['DEL', 'Legendario', 1],
    ]);
    expect(s.necesidades[1]!.texto).toBe('Falta 1 POR Superclase');
    expect(s.necesidades[0]!.texto).toMatch(/^Faltan 4 MED Superclase, preferiblemente (MD|MC|MII|MID|MCO)$/);
  });
});
