import { expect, test, type Page } from '@playwright/test';
import { partidaTrasDraft } from '../ayudas';

/**
 * Tema oscuro fijo, escala de esquinas, superficies con profundidad (spec 004, FR-001, FR-007, FR-042;
 * contracts/ui.md §1) y movimiento reducido (FR-033).
 */

/** Esquinas de la escala de tokens (FR-042): controles, paneles y piezas protagonistas. */
const RADIOS = ['6px', '12px', '20px'];

/** Contenedores de interfaz con fondo claro o con un radio fuera de la escala de tokens. */
async function revisarSuperficies(page: Page, pantalla: string) {
  const fallos = await page.evaluate((radios) => {
    const luminancia = (rgb: string) => {
      const m = rgb.match(/\d+(\.\d+)?/g);
      if (!m) return 0;
      const [r, g, b, a] = m.map(Number) as [number, number, number, number?];
      if (a === 0) return 0;
      // Con transparencia, el color se mezcla con el lienzo oscuro: cuenta en proporción a su opacidad.
      return ((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255) * (a ?? 1);
    };
    const describir = (el: Element) => `${el.tagName.toLowerCase()}.${Array.from(el.classList).join('.')}`;
    const fuera = (el: Element) => el.closest('.carta, .apertura-sobre, .campo, .campo-2d, .barra-navegacion, .camiseta, [popover]');
    const fallos: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('.panel, .modal, fieldset, .aviso, button, a.boton, input:not([type=checkbox]):not([type=radio]), select, textarea'))) {
      if (fuera(el) || el.getClientRects().length === 0) continue;
      const estilo = getComputedStyle(el);
      // El botón principal es lima a propósito (FR-012); el resto de superficies, oscuras.
      if (!el.matches('.boton-principal') && luminancia(estilo.backgroundColor) > 0.5) fallos.push(`${describir(el)}: fondo claro ${estilo.backgroundColor}`);
      const radio = estilo.borderTopLeftRadius;
      const esPestana = el.matches('.pestanas > *, .segmentado > *');
      if (!esPestana && !radios.includes(radio)) fallos.push(`${describir(el)}: radio ${radio}`);
    }
    return fallos.slice(0, 10);
  }, RADIOS);
  expect(fallos, pantalla).toEqual([]);
}

test.describe('con el modo claro del sistema', () => {
  test.use({ colorScheme: 'light' });

  test('la aplicación sigue oscura, con las esquinas de la escala y el lienzo del estadio', async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(10, 25, 19)');
    await revisarSuperficies(page, 'Inicio sin sesión');

    const partidaId = await partidaTrasDraft(page);
    await page.goto('/mis-partidas');
    await expect(page.getByRole('heading', { name: 'Mis partidas' })).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(10, 25, 19)');
    await revisarSuperficies(page, 'Mis partidas');

    await page.goto(`/partidas/${partidaId}/torneo`);
    await expect(page.getByRole('heading', { name: 'Torneo' })).toBeVisible();
    await revisarSuperficies(page, 'Torneo');
    await page.goto(`/partidas/${partidaId}/alineacion`);
    await expect(page.getByRole('heading', { name: 'Formación' })).toBeVisible();
    await revisarSuperficies(page, 'Formación');
    // La barra de navegación tiene su sombra y la atmósfera del estadio está detrás del contenido (FR-041, FR-042).
    expect(await page.locator('.barra-navegacion').evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe('none');
    expect(await page.locator('.ambiente').evaluate((el) => [getComputedStyle(el).position, getComputedStyle(el).zIndex, el.getAttribute('aria-hidden')])).toEqual(['fixed', '-1', 'true']);
  });
});

test.describe('con movimiento reducido', () => {
  test.use({ reducedMotion: 'reduce' });

  /** Duraciones (ms) de transiciones y animaciones de la interfaz, sin las cartas ni los sobres (003/FR-015). */
  async function duracionMaxima(page: Page): Promise<{ ms: number; donde: string }> {
    return page.evaluate(() => {
      const aMs = (v: string) => Math.max(0, ...v.split(',').map((x) => (x.trim().endsWith('ms') ? parseFloat(x) : parseFloat(x) * 1000)));
      let max = { ms: 0, donde: '' };
      for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
        if (el.closest('.carta, .apertura-sobre')) continue;
        const e = getComputedStyle(el);
        const ms = Math.max(aMs(e.transitionDuration), e.animationName === 'none' ? 0 : aMs(e.animationDuration));
        if (ms > max.ms) max = { ms, donde: `${el.tagName.toLowerCase()}.${Array.from(el.classList).join('.')}` };
      }
      return max;
    });
  }

  test('ninguna transición de la interfaz pasa de 100 ms (menú, diálogo y pestañas)', async ({ page }) => {
    test.setTimeout(240_000);
    const partidaId = await partidaTrasDraft(page);
    await page.goto(`/partidas/${partidaId}/torneo`);
    await expect(page.getByRole('heading', { name: 'Torneo' })).toBeVisible();
    await page.getByRole('tab').nth(1).click();
    let d = await duracionMaxima(page);
    expect(d.ms, `pestañas: ${d.donde}`).toBeLessThanOrEqual(100);

    // Menú móvil.
    await page.setViewportSize({ width: 360, height: 640 });
    await page.getByRole('button', { name: 'Menú' }).click();
    await expect(page.getByRole('dialog', { name: 'Menú' })).toBeVisible();
    d = await duracionMaxima(page);
    expect(d.ms, `menú: ${d.donde}`).toBeLessThanOrEqual(100);
    await page.keyboard.press('Escape');

    // Diálogo: la ficha de un jugador.
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto(`/partidas/${partidaId}/plantillas`);
    await page.locator('.carta-ficha').first().click();
    await expect(page.getByRole('dialog', { name: 'Ficha del jugador' })).toBeVisible();
    d = await duracionMaxima(page);
    expect(d.ms, `diálogo: ${d.donde}`).toBeLessThanOrEqual(100);
  });
});
