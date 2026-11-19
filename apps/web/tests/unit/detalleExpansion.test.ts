/**
 * Tarjeta y detalle de una expansión (spec 016, T047; FR-017, FR-019; contracts/ui.md §2). Se comprueba el marcado;
 * el foco al abrir, `Esc` y la vuelta del foco son de `Dialogo` (useAtraparFoco) y los recorre el e2e de la tienda.
 */
import type { CartaExpansion, ProductoColeccion } from '@fbd/protocol';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DetalleExpansion, gruposPorNivel } from '../../src/componentes/DetalleExpansion';
import { descripcionExpansion, TarjetaExpansion } from '../../src/componentes/TarjetaExpansion';

const NIVELES = ['GOAT', 'Legendario', 'Crack', 'Superclase'] as const;
const carta = (numero: number, poseida = false): CartaExpansion => {
  const nivel = NIVELES[Math.floor((numero - 1) / 6)]!;
  return {
    numero,
    poseida,
    compensacion: poseida ? { GOAT: 175, Legendario: 125, Crack: 75, Superclase: 25 }[nivel] : 0,
    carta: {
      id: 300 + numero,
      nombre: `Nombre${numero}`,
      apellidos: `Apellido${numero}`,
      nombreCarta: `Carta ${numero}`,
      nacionalidad: 'ESP',
      demarcacion: 'MED',
      posicion: ['MC'],
      media: 80,
      nivel,
      virtudes: [],
      defectos: [],
      stats: {},
      imagen: `/cartas/retratos-propios/c${numero}.webp`,
      imagenBg: `/cartas/fondos/jugadores/${300 + numero}.webp`,
    } as CartaExpansion['carta'],
  };
};

function producto(extra: Partial<ProductoColeccion> = {}): ProductoColeccion {
  // Desordenadas a propósito: el detalle las ordena por número.
  const cartas = [24, 1, 7, 13, 2, 19].map((n) => carta(n, n === 1 || n === 19));
  return {
    id: 'remontada-historica',
    nombre: 'Remontada Histórica',
    descripcion: '',
    precioCentimos: null,
    precioFragmentos: 2400,
    numCartas: 24,
    porNivel: { GOAT: 6, Legendario: 6, Crack: 6, Superclase: 6 },
    muestra: [],
    poseidas: 2,
    adquirida: false,
    soloFragmentos: null,
    cartas,
    compensacion: 200,
    sobreRegalo: { id: 'sobre-7', nombre: 'Sobre 7', poseido: false },
    icono: '/expansiones/remontada-historica/icono-256.webp',
    iconoGrande: '/expansiones/remontada-historica/icono-512.webp',
    cartel: '/expansiones/remontada-historica/cartel.webp',
    ...extra,
  };
}

const nada = () => undefined;
const texto = (html: string) => html.replace(/<img[^>]*>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('DetalleExpansion', () => {
  const html = renderToStaticMarkup(createElement(DetalleExpansion, { producto: producto(), saldo: 3000, onComprar: nada, onCerrar: nada }));

  it('es un modal con el nombre como título y el cartel', () => {
    expect(html).toMatch(/role="dialog"[^>]*aria-labelledby="titulo-detalle-expansion"/);
    expect(html).toMatch(/<h2 id="titulo-detalle-expansion" tabindex="-1">Remontada Histórica<\/h2>/);
    expect(html).toContain('src="/expansiones/remontada-historica/cartel.webp"');
  });

  it('agrupa por nivel, de GOAT a Superclase, en orden de número', () => {
    expect(gruposPorNivel(producto().cartas).map((g) => [g.nivel, g.cartas.map((c) => c.numero)])).toEqual([
      ['GOAT', [1, 2]],
      ['Legendario', [7]],
      ['Crack', [13]],
      ['Superclase', [19, 24]],
    ]);
    const orden = [...html.matchAll(/detalle-expansion-nombre">([^<]+)</g)].map((m) => m[1]);
    expect(orden).toEqual(['Carta 1', 'Carta 2', 'Carta 7', 'Carta 13', 'Carta 19', 'Carta 24']);
  });

  it('las poseídas llevan «Tienes» y su compensación; el pie, el total, el regalo y la compra', () => {
    expect(texto(html)).toContain('Tienes +175 fragmentos');
    expect(texto(html)).toContain('Tienes +25 fragmentos');
    expect(texto(html)).toContain('Te devolvemos 200 fragmentos por 2 cartas · De regalo');
    expect(html).toContain('aria-label="Ver «Sobre 7», el sobre de regalo"');
    expect(html).toContain('src="/cosmeticos/sobres/sobre-7-mini.webp"');
    expect(texto(html)).toContain('Comprar · 2.400 fragmentos');
  });

  it('cada jugador es un botón que abre su carta', () => {
    expect([...html.matchAll(/class="detalle-expansion-fila" aria-label="Ver la carta de ([^"]+)"/g)].map((m) => m[1])).toEqual([
      'Carta 1',
      'Carta 2',
      'Carta 7',
      'Carta 13',
      'Carta 19',
      'Carta 24',
    ]);
  });
});

describe('TarjetaExpansion', () => {
  const tarjeta = (p: ProductoColeccion, saldo: number) =>
    renderToStaticMarkup(createElement(TarjetaExpansion, { producto: p, saldo, onComprar: nada, onVerDetalle: nada }));

  it('nombre, descripción con reparto y regalo, lo que se devuelve, «Ver detalle» con su nombre accesible e icono decorativo', () => {
    const html = tarjeta(producto(), 3000);
    expect(descripcionExpansion(producto())).toBe('24 jugadores · 6 GOAT · 6 Legendario · 6 Crack · 6 Superclase');
    expect(texto(html)).toContain('24 jugadores · 6 GOAT · 6 Legendario · 6 Crack · 6 Superclase · De regalo');
    expect(html).toContain('src="/cosmeticos/sobres/sobre-7-mini.webp"');
    expect(texto(html)).toContain('Tienes 2 de 24 · te devolvemos 200 fragmentos');
    expect(html).toContain('aria-label="Ver detalle de Remontada Histórica"');
    expect(html).toMatch(/<img class="expansion-icono"[^>]*alt=""/);
  });

  it('adquirida: el sello en lugar de la compra, y «Ver detalle» sigue', () => {
    const html = tarjeta(producto({ adquirida: true }), 3000);
    expect(html).toContain('Adquirida');
    expect(texto(html)).not.toContain('Comprar');
    expect(html).toContain('Ver detalle');
  });

  it('sin saldo: «Te faltan» con lo que falta', () => {
    expect(texto(tarjeta(producto(), 2399))).toContain('Te faltan 1 fragmentos');
  });

  it('con todas las cartas: lo que recibirá', () => {
    expect(texto(tarjeta(producto({ soloFragmentos: 2400, poseidas: 24 }), 3000))).toContain('Ya tienes todas: recibirás 2.400 fragmentos y el sobre');
  });
});
