/**
 * Defectos físicos (spec 005, T037; FR-014; research R6): Frágil, De cristal, Fatigado e Indisciplinado.
 */
import { describe, expect, it } from 'vitest';
import { comprobarLesion } from '../src/acciones/lesiones';
import { acumularCansancio } from '../src/modificadores/cansancio';
import { contextoDe, ponerRasgos, titularEn } from './ayudas';
import { conParametros, P4, partido4, razon } from './ayudasRasgos';

function lesiones(n: number, defectos: ('Fragil' | 'DeCristal')[], prob: number) {
  const q = conParametros((x) => {
    x.lesiones.probabilidadPorEntrada = prob;
  });
  const gravedades: string[] = [];
  for (let i = 0; i < n; i++) {
    const e = partido4(`lesion-${i}`, q);
    const j = ponerRasgos(titularEn(e, 'local', 'DC'), { defectos });
    if (comprobarLesion(contextoDe(e, `lesion-${i}`), e.equipos.local, j)) {
      gravedades.push(String(e.eventos.find((x) => x.tipo === 'lesion')!.datos.gravedad));
    }
  }
  return gravedades;
}

describe('Frágil y De cristal (lesiones)', () => {
  it('Frágil multiplica por 3 la probabilidad de lesión', () => {
    const con = lesiones(600, ['Fragil'], 0.05).length;
    const sin = lesiones(600, [], 0.05).length;
    expect(razon(con, sin)).toBeGreaterThan(2.4);
    expect(razon(con, sin)).toBeLessThan(3.6);
  });

  it('De cristal: con la lesión forzada, la gravedad es siempre «larga»', () => {
    const g = lesiones(40, ['DeCristal'], 1);
    expect(g).toHaveLength(40);
    expect(new Set(g)).toEqual(new Set(['larga']));
    expect(new Set(lesiones(40, [], 1)).size).toBeGreaterThan(1);
  });
});

describe('Fatigado e Indisciplinado (cansancio)', () => {
  it('Fatigado empieza a cansarse al comenzar la segunda parte, aunque el inicio general sea el minuto 65', () => {
    expect(P4.cansancio.inicioMin).toBe(65);
    const e = partido4('fatigado');
    const eq = e.equipos.local;
    const fatigado = ponerRasgos(titularEn(e, 'local', 'MC-1'), { defectos: ['Fatigado'] });
    const normal = titularEn(e, 'local', 'MC-2');
    e.reloj = { parte: 1, segundosEnParte: 44 * 60, paradas: 0, descuento: null };
    acumularCansancio(e, eq, 60);
    expect(fatigado.cansancio).toBe(0);
    e.reloj = { parte: 2, segundosEnParte: 30, paradas: 0, descuento: null }; // minuto 46
    acumularCansancio(e, eq, 60);
    expect(fatigado.cansancio).toBeGreaterThan(0);
    expect(normal.cansancio).toBe(0);
  });

  it('Indisciplinado acumula 1,5 veces el cansancio', () => {
    const e = partido4('indisciplinado');
    const eq = e.equipos.local;
    const indisciplinado = ponerRasgos(titularEn(e, 'local', 'MC-1'), { defectos: ['Indisciplinado'] });
    const normal = titularEn(e, 'local', 'MC-2');
    e.reloj = { parte: 2, segundosEnParte: 25 * 60, paradas: 0, descuento: null }; // minuto 70
    acumularCansancio(e, eq, 300);
    expect(normal.cansancio).toBeGreaterThan(0);
    expect(indisciplinado.cansancio / normal.cansancio).toBeCloseTo(P4.defectos!.indisciplinado, 6);
  });
});
