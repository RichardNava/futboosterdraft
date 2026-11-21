/**
 * Arranque con configuración insegura (spec 017, T060, FR-036): cada regla nombra la variable y nunca muestra su valor.
 */
import { describe, expect, it } from 'vitest';
import { validarEntornoProduccion } from '../../src/entorno';

const VALIDO = {
  AUTH_SECRET: 'x'.repeat(48),
  PUBLIC_URL: 'https://juego.pruebas.test',
  DATABASE_URL: 'postgres://propio:clave-propia@bd:5432/juego',
  PROXIES_CONFIANZA: '1',
};

const CASOS: [string, Record<string, string | undefined>, string][] = [
  ['sin AUTH_SECRET', { AUTH_SECRET: undefined }, 'AUTH_SECRET'],
  ['con AUTH_SECRET corto', { AUTH_SECRET: 'secreto-corto-de-prueba' }, 'AUTH_SECRET'],
  ['con el AUTH_SECRET de ejemplo', { AUTH_SECRET: 'cambia-esto-por-un-secreto-largo-y-aleatorio' }, 'AUTH_SECRET'],
  ['sin PUBLIC_URL', { PUBLIC_URL: undefined }, 'PUBLIC_URL'],
  ['con PUBLIC_URL sin HTTPS', { PUBLIC_URL: 'http://juego.pruebas.test' }, 'PUBLIC_URL'],
  ['sin DATABASE_URL', { DATABASE_URL: undefined }, 'DATABASE_URL'],
  ['con la credencial de ejemplo', { DATABASE_URL: 'postgres://fbd:fbd@bd:5432/juego' }, 'DATABASE_URL'],
  ['sin PROXIES_CONFIANZA', { PROXIES_CONFIANZA: undefined }, 'PROXIES_CONFIANZA'],
  ['con PROXIES_CONFIANZA negativo', { PROXIES_CONFIANZA: '-1' }, 'PROXIES_CONFIANZA'],
  ['con PROXIES_CONFIANZA no entero', { PROXIES_CONFIANZA: 'todos' }, 'PROXIES_CONFIANZA'],
  ['con METRICAS_TOKEN corto', { METRICAS_TOKEN: 'token-corto-de-prueba' }, 'METRICAS_TOKEN'],
  ['con LIMITES_DESACTIVADOS', { LIMITES_DESACTIVADOS: '1' }, 'LIMITES_DESACTIVADOS'],
];

describe('arranque en producción', () => {
  it('SEG-021: la configuración correcta arranca', () => {
    expect(validarEntornoProduccion(VALIDO)).toEqual([]);
    expect(validarEntornoProduccion({ ...VALIDO, PROXIES_CONFIANZA: '0', METRICAS_TOKEN: 'm'.repeat(32) })).toEqual([]);
  });

  it.each(CASOS)('SEG-021: arrancar %s', (_nombre, cambio, variable) => {
    const problemas = validarEntornoProduccion({ ...VALIDO, ...cambio });
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toContain(variable);
    for (const valor of Object.values(cambio)) if (valor) expect(problemas[0]).not.toContain(valor);
  });
});
