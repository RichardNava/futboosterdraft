import { describe, expect, it } from 'vitest';
import { limpiarPreferenciasSobre, siguienteSobre, sobreActual } from '../../src/cosmeticos/carrusel';
import type { PreferenciasSobre } from '../../src/cosmeticos/tipos';
import { Rng, semillaDesdeTexto } from '../../src/rng/xoshiro';

const base: PreferenciasSobre = { sobreFavorito: null, sobreCarrusel: false, sobresMarcados: [], sobreBaraja: [], sobreUltimo: null };
const rng = (): Rng => new Rng(semillaDesdeTexto('carrusel'));

function sacar(p: PreferenciasSobre, n: number, r = rng()): { disenos: string[]; p: PreferenciasSobre } {
  const disenos: string[] = [];
  for (let i = 0; i < n; i++) {
    const s = siguienteSobre(p, r);
    disenos.push(s.diseno);
    p = s.preferencias;
  }
  return { disenos, p };
}

describe('carrusel de sobres (spec 011, data-model §4)', () => {
  it('sin carrusel: favorito o sobre-original', () => {
    expect(siguienteSobre(base, rng()).diseno).toBe('sobre-original');
    expect(siguienteSobre({ ...base, sobreFavorito: 'sobre-a' }, rng()).diseno).toBe('sobre-a');
    expect(sobreActual({ ...base, sobreFavorito: 'sobre-a' })).toBe('sobre-a');
  });

  it('con N ≥ 2 marcados salen los N sin repetir y nunca dos iguales seguidos al cambiar de vuelta', () => {
    const marcados = ['a', 'b', 'c', 'd'];
    let p: PreferenciasSobre = { ...base, sobreCarrusel: true, sobresMarcados: marcados };
    const r = new Rng(semillaDesdeTexto('vueltas'));
    let anterior: string | null = null;
    for (let vuelta = 0; vuelta < 50; vuelta++) {
      const { disenos, p: q } = sacar(p, 4, r);
      expect([...disenos].sort()).toEqual(marcados);
      expect(disenos[0]).not.toBe(anterior);
      anterior = disenos[3]!;
      p = q;
    }
  });

  it('con 2 marcados alterna siempre', () => {
    const { disenos } = sacar({ ...base, sobreCarrusel: true, sobresMarcados: ['a', 'b'] }, 20);
    for (let i = 1; i < disenos.length; i++) expect(disenos[i]).not.toBe(disenos[i - 1]);
  });

  it('1 marcado equivale a favorito y 0 marcados a sobre-original', () => {
    expect(sacar({ ...base, sobreCarrusel: true, sobresMarcados: ['a'] }, 3).disenos).toEqual(['a', 'a', 'a']);
    expect(sacar({ ...base, sobreCarrusel: true, sobreFavorito: 'x' }, 2).disenos).toEqual(['sobre-original', 'sobre-original']);
  });

  it('sobreActual no modifica el estado y anticipa el siguiente de la baraja', () => {
    const p: PreferenciasSobre = { ...base, sobreCarrusel: true, sobresMarcados: ['a', 'b'], sobreBaraja: ['b'], sobreUltimo: 'a' };
    const copia = structuredClone(p);
    expect(sobreActual(p)).toBe('b');
    expect(p).toEqual(copia);
    expect(siguienteSobre(p, rng()).diseno).toBe('b');
  });

  it('los ids no disponibles se descartan', () => {
    const p: PreferenciasSobre = { sobreFavorito: 'x', sobreCarrusel: true, sobresMarcados: ['a', 'x', 'b'], sobreBaraja: ['x', 'b'], sobreUltimo: 'a' };
    expect(limpiarPreferenciasSobre(p, new Set(['a', 'b']))).toEqual({
      sobreFavorito: null,
      sobreCarrusel: true,
      sobresMarcados: ['a', 'b'],
      sobreBaraja: ['b'],
      sobreUltimo: 'a',
    });
  });
});
