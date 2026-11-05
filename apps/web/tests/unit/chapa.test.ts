/** Chapa con escudo (spec 011, US1; T023; research R7; contracts/ui.md §1). */
import type { Equipacion } from '@fbd/domain';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { chapasDelPartido } from '../../src/componentes/chapa';
import { Chapa } from '../../src/componentes/Marcador';

const camiseta = (...colores: string[]) => ({ diseno: 'lisa', colores }) as Equipacion;
const ROJO = '#d01010';
const AZUL = '#1030d0';

describe('chapasDelPartido (R7)', () => {
  const equipaciones = { local: camiseta(ROJO), visitante: camiseta(AZUL, '#ffffff') };

  it('sin escudos en el mensaje: los colores principales de siempre', () => {
    expect(chapasDelPartido(equipaciones)).toEqual({ local: { color: ROJO, escudo: null }, visitante: { color: AZUL, escudo: null } });
  });

  it('con escudos distintos: cada uno el suyo y su color principal de respaldo', () => {
    expect(chapasDelPartido(equipaciones, { local: 'escudo-lobo', visitante: 'escudo-navio-dorado' })).toEqual({
      local: { color: ROJO, escudo: 'escudo-lobo' },
      visitante: { color: AZUL, escudo: 'escudo-navio-dorado' },
    });
  });

  it('escudos anulados por coincidir: local con su principal y visitante con su secundario', () => {
    expect(chapasDelPartido(equipaciones, { local: null, visitante: null })).toEqual({
      local: { color: ROJO, escudo: null },
      visitante: { color: '#ffffff', escudo: null },
    });
  });

  it('si el secundario del visitante se parece al principal del local, el visitante usa su principal', () => {
    const r = chapasDelPartido({ local: camiseta(ROJO), visitante: camiseta(AZUL, ROJO) }, { local: null, visitante: null });
    expect(r.visitante.color).toBe(AZUL);
  });
});

describe('Chapa', () => {
  it('con escudo: imagen de 64 px con el nombre del equipo y su testid', () => {
    const html = renderToStaticMarkup(createElement(Chapa, { color: ROJO, escudo: 'escudo-lobo', nombre: 'Los Lobos', lado: 'local' }));
    expect(html).toContain('src="/cosmeticos/escudos/escudo-lobo-64.webp"');
    expect(html).toContain('alt="Los Lobos"');
    expect(html).toContain('data-testid="escudo-local"');
    expect(html).toContain('chapa-escudo');
  });

  it('sin escudo: el círculo de color, sin imagen', () => {
    const html = renderToStaticMarkup(createElement(Chapa, { color: ROJO, escudo: null }));
    expect(html).not.toContain('<img');
    expect(html).toContain('background:#d01010');
  });
});
