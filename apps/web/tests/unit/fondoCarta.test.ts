/** Fondo de acción de la carta: el propio o una foto de su demarcación. */
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fondoDe, type CartaResumen } from '../../src/componentes/CartaJugador';

const carta = (id: number, demarcacion: CartaResumen['demarcacion'], imagenBg?: string): CartaResumen => ({
  id,
  nombre: 'J',
  apellidos: 'P',
  demarcacion,
  posicion: [],
  media: 70,
  nivel: 'Superclase',
  virtudes: [],
  defectos: [],
  imagenBg,
});

describe('fondoDe', () => {
  it('respeta un fondo propio', () => {
    expect(fondoDe(carta(1, 'POR', '/cartas/propias/x.png'))).toBe('/cartas/propias/x.png');
  });

  it('cambia el genérico (o ninguno) por una foto de la demarcación, siempre la misma y existente', () => {
    for (const [dem, nombre] of [['POR', 'portero'], ['DEF', 'defensa'], ['MED', 'medio'], ['DEL', 'delantero']] as const) {
      const vistos = new Set<string>();
      for (let id = 1; id <= 40; id++) {
        const ruta = fondoDe(carta(id, dem, `/cartas/fondos/${dem.toLowerCase()}.svg`));
        expect(ruta).toMatch(new RegExp(`^/cartas/fondos/${nombre}_bg\\d\\.webp$`));
        expect(fondoDe(carta(id, dem))).toBe(ruta);
        expect(existsSync(new URL(`../../public${ruta}`, import.meta.url))).toBe(true);
        vistos.add(ruta);
      }
      expect(vistos.size).toBeGreaterThan(1);
    }
  });
});
