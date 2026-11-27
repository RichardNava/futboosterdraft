/**
 * Defectos físicos (spec 005, T037; FR-014; research R6): Frágil, De cristal, Fatigado e Indisciplinado.
 */
import { describe, expect, it } from 'vitest';
import { comprobarLesion } from '../src/acciones/lesiones';
import { contextoDe, ponerRasgos, titularEn } from './ayudas';
import { jugarHasta } from './ayudasFatiga';
import { conParametros, partido4, razon } from './ayudasRasgos';

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

describe('Fatigado e Indisciplinado (energía, spec 018)', () => {
  it('Fatigado gasta ×1,3 y ya no empieza antes del tramo general', () => {
    const e = partido4('fatigado');
    const fatigado = ponerRasgos(titularEn(e, 'local', 'MC-1'), { defectos: ['Fatigado'] });
    const normal = titularEn(e, 'local', 'MC-2');
    jugarHasta(e, 30);
    expect(fatigado.energia).toBe(100);
    jugarHasta(e, 45);
    expect((100 - fatigado.energia) / (100 - normal.energia)).toBeCloseTo(1.3, 6);
  });

  it('Indisciplinado empieza 5 minutos antes en cada parte', () => {
    const e = partido4('indisciplinado');
    const indisciplinado = ponerRasgos(titularEn(e, 'local', 'MC-1'), { defectos: ['Indisciplinado'] });
    const normal = titularEn(e, 'local', 'MC-2');
    jugarHasta(e, 30);
    expect(indisciplinado.energia).toBeLessThan(100);
    expect(normal.energia).toBe(100);
  });
});
