import { describe, expect, it } from 'vitest';
import { claveSesion } from '../../src/http/app';
import { Limitador } from '../../src/http/limitador';

describe('límite de peticiones por sesión (T141)', () => {
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

  it('la clave es el token de sesión, con o sin el prefijo de producción', () => {
    expect(claveSesion('otra=1; better-auth.session_token=abc.def%3D')).toBe('abc.def%3D');
    expect(claveSesion('__Secure-better-auth.session_token=xyz')).toBe('xyz');
    expect(claveSesion('otra=1')).toBeNull();
    expect(claveSesion(undefined)).toBeNull();
  });
});
