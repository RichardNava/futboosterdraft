import { describe, expect, it } from 'vitest';
import { PARAMETROS_V6_2, PARAMETROS_V6_3, repartoDe } from '../../src/parametros/index';
import { accesoNivelRareza, NIVEL_RAREZA_POR_DEFECTO, NIVELES_RAREZA } from '../../src/sobres/rareza';

describe('niveles de rareza (spec 013, FR-012)', () => {
  it('cinco niveles en orden y Moderado por defecto', () => {
    expect(NIVELES_RAREZA).toEqual(['pobre', 'escaso', 'moderado', 'abundante', 'rico']);
    expect(NIVEL_RAREZA_POR_DEFECTO).toBe('moderado');
  });

  it('el reparto de cada nivel suma 8 y es el de la tabla (data-model §2.2)', () => {
    const tabla = {
      pobre: [5, 2, 0, 1, 0.05],
      escaso: [5, 2, 0, 1, 0.2],
      moderado: [4, 2, 1, 1, 0.3],
      abundante: [3, 2, 1, 2, 0.5],
      rico: [2, 2, 1, 3, 0.5],
    };
    for (const nivel of NIVELES_RAREZA) {
      const r = repartoDe(PARAMETROS_V6_3, nivel);
      expect(r.superclase + r.crack + r.legendario + r.altas).toBe(8);
      expect([r.superclase, r.crack, r.legendario, r.altas, r.probGoatEnAlta]).toEqual(tabla[nivel]);
    }
  });

  it('antes de la 6.3.0 todos los niveles tienen el reparto de siempre; la tienda sigue al 20 %', () => {
    expect(repartoDe(PARAMETROS_V6_2, 'rico')).toEqual({ superclase: 4, crack: 2, legendario: 1, altas: 1, probGoatEnAlta: 0.2 });
    expect(PARAMETROS_V6_3.sobres.probGoatEnAlta).toBe(0.2);
  });
});

describe('accesoNivelRareza (FR-019; data-model §2.3)', () => {
  const base = { precio: 100, premiumActivo: false } as const;

  it('libre: gratis para todos', () => {
    for (const nivel of NIVELES_RAREZA) {
      for (const tipoUsuario of ['registrado', 'invitado'] as const) {
        expect(accesoNivelRareza({ ...base, nivel, acceso: 'libre', tipoUsuario })).toEqual({ permitido: true, coste: 0 });
      }
    }
  });

  it('restringido + moderado: gratis para todos', () => {
    for (const tipoUsuario of ['registrado', 'invitado'] as const) {
      expect(accesoNivelRareza({ ...base, nivel: 'moderado', acceso: 'restringido', tipoUsuario })).toEqual({ permitido: true, coste: 0 });
    }
  });

  it('restringido + otro nivel: invitado no, registrado 100, con pase gratis', () => {
    const e = { ...base, nivel: 'rico', acceso: 'restringido' } as const;
    expect(accesoNivelRareza({ ...e, tipoUsuario: 'invitado' })).toEqual({ permitido: false, motivo: 'INVITADO' });
    expect(accesoNivelRareza({ ...e, tipoUsuario: 'registrado' })).toEqual({ permitido: true, coste: 100 });
    expect(accesoNivelRareza({ ...e, tipoUsuario: 'registrado', premiumActivo: true })).toEqual({ permitido: true, coste: 0 });
  });
});
