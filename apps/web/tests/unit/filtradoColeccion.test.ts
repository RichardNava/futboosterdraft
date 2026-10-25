import type { CartaPoseida } from '@fbd/protocol';
import { describe, expect, it } from 'vitest';
import { FILTROS_INICIALES, filtrarCartas, normalizar, ordenarCartas, paginaQueContiene, paginar } from '../../src/pantallas/coleccion/filtrado';

const carta = (id: number, extra: Partial<CartaPoseida>): CartaPoseida => ({
  id,
  nombre: 'Teo',
  apellidos: 'Valotal Rosandez',
  nombreCarta: 'Teo Valotal',
  nacionalidad: 'BRA',
  imagen: '/cartas/siluetas/por.svg',
  imagenBg: '/cartas/fondos/por.svg',
  demarcacion: 'POR',
  posicion: ['POR'],
  media: 70,
  nivel: 'Superclase',
  virtudes: [],
  defectos: [],
  stats: {},
  activa: true,
  via: 'registro',
  obtenidaEn: '2026-10-25T00:00:00.000Z',
  colecciones: ['core'],
  esCore: true,
  valorFragmentos: null,
  historia: '',
  ...extra,
});

const cartas = [
  carta(1, {}),
  carta(2, { nombre: 'Íker', apellidos: 'Baruvia Urirdez', nombreCarta: 'Íker Baruvia', nacionalidad: 'ESP', demarcacion: 'DEF', nivel: 'GOAT', media: 90, activa: false }),
  carta(3, { nombre: 'Álvaro', apellidos: 'Calnas Dorel', nombreCarta: 'Álvaro Calnas', nacionalidad: 'ARG', demarcacion: 'DEL', nivel: 'Epico', media: 82, colecciones: ['all-stars', 'top-argentinos'], esCore: false }),
];

describe('filtrado de la colección (R15)', () => {
  it('normaliza sin tildes ni mayúsculas', () => {
    expect(normalizar('VALÓTAL Íker')).toBe('valotal iker');
  });

  it('busca en nombreCarta, nombre y apellidos sin tildes', () => {
    expect(filtrarCartas(cartas, 'valotal', FILTROS_INICIALES).map((c) => c.id)).toEqual([1]);
    expect(filtrarCartas(cartas, 'IKER', FILTROS_INICIALES).map((c) => c.id)).toEqual([2]);
    expect(filtrarCartas(cartas, 'urirdez', FILTROS_INICIALES).map((c) => c.id)).toEqual([2]);
    expect(filtrarCartas(cartas, 'nadie', FILTROS_INICIALES)).toEqual([]);
  });

  it('filtra por estado, nivel, demarcación y colección', () => {
    expect(filtrarCartas(cartas, '', { ...FILTROS_INICIALES, estado: 'inactivas' }).map((c) => c.id)).toEqual([2]);
    expect(filtrarCartas(cartas, '', { ...FILTROS_INICIALES, nivel: 'Epico' }).map((c) => c.id)).toEqual([3]);
    expect(filtrarCartas(cartas, '', { ...FILTROS_INICIALES, demarcacion: 'POR' }).map((c) => c.id)).toEqual([1]);
    expect(filtrarCartas(cartas, '', { ...FILTROS_INICIALES, coleccion: 'top-argentinos' }).map((c) => c.id)).toEqual([3]);
  });

  it.each([
    ['nombre', 'asc', [3, 2, 1]],
    ['nombre', 'desc', [1, 2, 3]],
    ['nacionalidad', 'desc', [2, 1, 3]],
    ['coleccion', 'asc', [3, 1, 2]],
    ['nivel', 'desc', [2, 3, 1]],
    ['demarcacion', 'asc', [1, 2, 3]],
    ['media', 'desc', [2, 3, 1]],
  ] as const)('ordena por %s %s la lista entera', (criterio, sentido, ids) => {
    expect(ordenarCartas(cartas, criterio, sentido).map((c) => c.id)).toEqual(ids);
  });

  it('pagina y, al cambiar el tamaño, mantiene visible la primera carta de la página', () => {
    const lista = Array.from({ length: 50 }, (_, i) => i);
    expect(paginar(lista, 1, 12)).toEqual({ elementos: lista.slice(12, 24), pagina: 1, paginas: 5 });
    expect(paginar(lista, 99, 12).pagina).toBe(4);
    // Página 3 de 12 por página empieza en la carta 36; con 8 por página, está en la página 4 (índice).
    const primera = 3 * 12;
    const nueva = paginaQueContiene(primera, 8);
    expect(paginar(lista, nueva, 8).elementos).toContain(primera);
  });
});
