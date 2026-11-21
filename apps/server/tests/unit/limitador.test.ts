import { describe, expect, it } from 'vitest';
import { claveCliente, Limitador } from '../../src/http/limitador';

describe('límite de peticiones por clave (T141, spec 017)', () => {
  it('admite una ráfaga hasta la capacidad y después repone al ritmo indicado', () => {
    let t = 0;
    const l = new Limitador({ capacidad: 3, porSegundo: 2, ahora: () => t });
    expect([1, 2, 3].map(() => l.permitir('a'))).toEqual([true, true, true]);
    expect(l.permitir('a')).toBe(false);
    // Otra sesión tiene su propio cubo.
    expect(l.permitir('b')).toBe(true);
    t += 500; // medio segundo: una ficha
    expect(l.permitir('a')).toBe(true);
    expect(l.permitir('a')).toBe(false);
    t += 10_000; // nunca pasa de la capacidad
    expect([1, 2, 3, 4].map(() => l.permitir('a'))).toEqual([true, true, true, false]);
  });

  it('consulta sin gastar y olvida una clave', () => {
    const l = new Limitador({ capacidad: 1, porSegundo: 0, ahora: () => 0 });
    expect(l.disponible('a')).toBe(true);
    expect(l.disponible('a')).toBe(true);
    l.permitir('a');
    expect(l.disponible('a')).toBe(false);
    l.borrar('a');
    expect(l.disponible('a')).toBe(true);
  });

  it('SEG-022: con muchas claves sin ningún cubo lleno expulsa las más antiguas y conserva las recientes', () => {
    const l = new Limitador({ capacidad: 1, porSegundo: 0, ahora: () => 0 });
    for (let i = 0; i <= 10_000; i++) l.permitir(`k${i}`);
    expect((l as unknown as { cubos: Map<string, unknown> }).cubos.size).toBeLessThanOrEqual(9_000);
    expect(l.disponible('k0')).toBe(true); // expulsada
    expect(l.disponible('k10000')).toBe(false); // reciente
  });

  it('identifica una IPv4, agrupa una IPv6 por su /64 y reconoce las IPv4 mapeadas', () => {
    expect(claveCliente('203.0.113.7')).toBe('203.0.113.7');
    expect(claveCliente('2001:db8:1:2::a')).toBe(claveCliente('2001:0DB8:1:2:ffff:ffff:ffff:ffff'));
    expect(claveCliente('2001:db8:1:2::a')).not.toBe(claveCliente('2001:db8:1:3::a'));
    expect(claveCliente('::ffff:203.0.113.7')).toBe(claveCliente('::ffff:cb00:7107'));
    expect(claveCliente('::ffff:203.0.113.7')).not.toBe(claveCliente('::ffff:203.0.113.8'));
    expect(claveCliente('fe80::1%eth0')).toBe(claveCliente('fe80::2'));
  });
});
