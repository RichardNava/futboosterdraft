import { describe, expect, it } from 'vitest';
import { escudoAsignado, escudoNpc, escudosEnPartido, fnv1a32 } from '../../src/cosmeticos/escudos';
import { derivarSemilla, Rng, semillaDesdeTexto } from '../../src/rng/xoshiro';

const GRATUITOS = Array.from({ length: 18 }, (_, i) => `escudo-${i + 1}`);

describe('escudos (spec 011, data-model §5)', () => {
  it('FNV-1a de 32 bits con los vectores conocidos', () => {
    expect(fnv1a32('')).toBe(0x811c9dc5);
    expect(fnv1a32('a')).toBe(0xe40c292c);
    expect(fnv1a32('foobar')).toBe(0xbf9cf968);
  });

  it('escudoAsignado es estable y usa FNV-1a mod gratuitos', () => {
    const id = 'usuario-123';
    expect(escudoAsignado(id, GRATUITOS)).toBe(escudoAsignado(id, GRATUITOS));
    expect(escudoAsignado(id, GRATUITOS)).toBe(GRATUITOS[fnv1a32(id) % 18]);
    expect(escudoAsignado(id, [])).toBeNull();
  });

  it('escudoAsignado reparte cuentas entre varios escudos', () => {
    const vistos = new Set(Array.from({ length: 200 }, (_, i) => escudoAsignado(`u${i}`, GRATUITOS)));
    expect(vistos.size).toBeGreaterThan(10);
  });

  it('escudoNpc usa derivarSemilla(semilla, "escudo:" + pid)', () => {
    const semilla = semillaDesdeTexto('partida');
    const esperado = GRATUITOS[new Rng(derivarSemilla(semilla, 'escudo:p1')).entero(0, 17)];
    expect(escudoNpc(semilla, 'p1', GRATUITOS)).toBe(esperado);
    expect(escudoNpc(semilla, 'p1', GRATUITOS)).toBe(escudoNpc(semilla, 'p1', GRATUITOS));
  });

  it('escudosEnPartido anula los dos si coinciden', () => {
    expect(escudosEnPartido('a', 'a')).toEqual({ local: null, visitante: null });
    expect(escudosEnPartido('a', 'b')).toEqual({ local: 'a', visitante: 'b' });
    expect(escudosEnPartido(null, null)).toEqual({ local: null, visitante: null });
    expect(escudosEnPartido('a', null)).toEqual({ local: 'a', visitante: null });
  });
});
