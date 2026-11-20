/** Componente `Fragmentos` (spec 016, T026; FR-031, US4-2; contracts/ui.md §1). */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Fragmentos } from '../../src/componentes/Fragmentos';

const html = (props: Parameters<typeof Fragmentos>[0]) => renderToStaticMarkup(createElement(Fragmentos, props));
/** Lo que lee un lector de pantalla: el texto sin el icono, que está oculto. */
const leido = (marcado: string) => marcado.replace(/<img[^>]*>/g, '').replace(/<[^>]+>/g, '');

describe('Fragmentos', () => {
  it('el lector lee «2.400 fragmentos» y el icono es decorativo', () => {
    const m = html({ cantidad: 2400 });
    expect(leido(m)).toBe('2.400 fragmentos');
    expect(m).toMatch(/<img[^>]*alt=""[^>]*aria-hidden="true"/);
    expect(m).toContain('srcSet="/iconos/fragmento-32.webp 1x, /iconos/fragmento-64.webp 2x"');
  });

  it('con signo pinta «+175»; sin signo, sin «+»', () => {
    expect(leido(html({ cantidad: 175, signo: true }))).toBe('+175 fragmentos');
    expect(leido(html({ cantidad: 175 }))).toBe('175 fragmentos');
  });

  it('el icono mide 16 px por defecto y el tamaño pedido si se indica', () => {
    expect(html({ cantidad: 1 })).toMatch(/width="16" height="16"/);
    expect(html({ cantidad: 1, tamano: 24 })).toMatch(/width="24" height="24"/);
  });
});
