/** Rasgadura propia de cada sobre (spec 011, US2-4; T040; research R8). */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { POLIGONO_ORIGINAL, rasgaduraDe } from '../../src/componentes/arte/rasgadura';

const catalogo = JSON.parse(readFileSync(new URL('../../../../data/cosmeticos.json', import.meta.url), 'utf8')) as { cosmeticos: { id: string; tipo: string }[] };
const sobres = catalogo.cosmeticos.filter((c) => c.tipo === 'sobre').map((c) => c.id);

/** Vértices del borde superior: todos menos las dos esquinas inferiores. */
function borde(poligono: string): [number, number][] {
  const m = /^polygon\((.*)\)$/.exec(poligono);
  expect(m).not.toBeNull();
  const puntos = m![1]!.split(', ').map((p) => p.split(' ').map((v) => Number.parseFloat(v)) as [number, number]);
  for (const [x, y] of puntos) {
    expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThanOrEqual(100);
  }
  expect(puntos.slice(-2)).toEqual([
    [100, 100],
    [0, 100],
  ]);
  return puntos.slice(0, -2);
}

describe('rasgaduraDe', () => {
  it('es determinista', () => {
    expect(rasgaduraDe('sobre-cubismo')).toBe(rasgaduraDe('sobre-cubismo'));
  });

  it('el original conserva su polígono', () => {
    expect(rasgaduraDe('sobre-original')).toBe(POLIGONO_ORIGINAL);
  });

  it.each(sobres.filter((id) => id !== 'sobre-original'))('%s: 17–23 vértices, de izquierda a derecha, en la banda del 8 % al 22 %', (id) => {
    const puntos = borde(rasgaduraDe(id));
    expect(puntos.length).toBeGreaterThanOrEqual(17);
    expect(puntos.length).toBeLessThanOrEqual(23);
    expect(puntos[0]![0]).toBe(0);
    expect(puntos.at(-1)![0]).toBe(100);
    for (let i = 1; i < puntos.length; i++) expect(puntos[i]![0]).toBeGreaterThan(puntos[i - 1]![0]);
    for (const [, y] of puntos) {
      expect(y).toBeGreaterThanOrEqual(8);
      expect(y).toBeLessThanOrEqual(22);
    }
  });

  it('los 31 sobres del catálogo dan 31 polígonos distintos', () => {
    expect(sobres).toHaveLength(31);
    expect(new Set(sobres.map(rasgaduraDe)).size).toBe(31);
  });
});
