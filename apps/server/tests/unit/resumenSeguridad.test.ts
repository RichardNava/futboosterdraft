import { describe, expect, it } from 'vitest';
import { generarResumen } from '../seguridad/resumen';

const fichero = (assertionResults: { title: string; status: string }[], status = 'passed') => ({
  testResults: [{ name: 'C:/x/limites.test.ts', status, assertionResults }],
});

describe('resumen de la verificación de seguridad', () => {
  it('con todo bloqueado no hay errores y la tabla lo muestra', () => {
    const r = generarResumen(fichero([{ title: 'SEG-004: Probar 100 contraseñas', status: 'passed' }]));
    expect(r.errores).toEqual([]);
    expect(r.markdown).toContain('| Probar 100 contraseñas | SEG-004 | Bloqueado |');
    expect(r.markdown).toContain('1 de 1 ataques bloqueados');
  });

  it('un ataque que no se bloquea es un error', () => {
    const r = generarResumen(fichero([{ title: 'SEG-001: Comprar sin pagar', status: 'failed' }], 'failed'));
    expect(r.filas[0]?.resultado).toBe('NO bloqueado');
    expect(r.errores).toHaveLength(1);
  });

  it('un ataque omitido no cuenta como bloqueado', () => {
    const r = generarResumen(fichero([{ title: 'SEG-002: Algo', status: 'skipped' }]));
    expect(r.filas[0]?.resultado).toBe('Sin ejecutar');
    expect(r.errores).toHaveLength(1);
  });

  it('un nombre mal formado es un error', () => {
    const r = generarResumen(fichero([{ title: 'ataque sin identificador', status: 'passed' }]));
    expect(r.filas).toEqual([]);
    expect(r.errores[0]).toContain('SEG-NNN');
  });

  it('un fichero que no carga es un error', () => {
    expect(generarResumen(fichero([], 'failed')).errores[0]).toContain('No se pudo ejecutar limites.test.ts');
  });

  it('sin resultados es un error', () => {
    expect(generarResumen({ testResults: [] }).errores).toEqual(['No hay ningún ataque que verificar']);
    expect(generarResumen({}).errores).toEqual(['No hay ningún ataque que verificar']);
  });
});
