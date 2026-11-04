/** Cartas de la portada: del catálogo oficial, una por nivel entre las cuatro mejores de Core. */
import type { Jugador } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { cartasPortada } from '../../src/pantallas/Inicio';

const carta = (id: number, nivel: string, media: number, colecciones = ['core']) =>
  ({ id, nivel, media, colecciones, nombre_carta: `C${id}`, imagen_bg: `/bg${id}`, stats: {} }) as unknown as Jugador & { colecciones: string[] };

describe('cartasPortada', () => {
  it('saca una carta por nivel, de Core y entre las cuatro de media más alta, con los campos de la carta', () => {
    const catalogo = [
      ...[90, 89, 88, 87, 50].map((m, i) => carta(i + 1, 'GOAT', m)),
      carta(10, 'GOAT', 99, ['all-stars']),
      carta(20, 'Crack', 80),
    ];
    const [crack, goat] = cartasPortada(catalogo, () => 0.99);
    expect(crack!.id).toBe(20);
    expect(goat!.id).toBe(4); // la cuarta mejor de Core; ni la de 50 ni la de otra colección
    expect(goat).toMatchObject({ nombreCarta: 'C4', imagenBg: '/bg4' });
    expect(cartasPortada(catalogo, () => 0)[1]!.id).toBe(1);
  });
});
