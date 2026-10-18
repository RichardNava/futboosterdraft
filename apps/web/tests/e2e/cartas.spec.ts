import { expect, test, type Page } from '@playwright/test';

/**
 * Cartas de jugador (US1; FR-001 a FR-005, SC-002; quickstart, escenario A). Usa la ruta de pruebas
 * `/_pruebas/cartas`, que pinta todas las cartas de la colección Core.
 */

/** Elementos de cada carta cuyo contenido desborda (texto cortado o con barra de desplazamiento). */
async function desbordes(page: Page): Promise<string[]> {
  return page.$$eval('.carta.completa', (cartas) =>
    cartas.flatMap((carta) => {
      const problemas: string[] = [];
      const id = carta.getAttribute('data-jugador') ?? '?';
      for (const el of [carta, ...Array.from(carta.querySelectorAll<HTMLElement>('*'))]) {
        if (el.matches('[popover]')) continue;
        if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) {
          problemas.push(`${id}: ${el.className || el.tagName}`);
        }
      }
      return problemas;
    }),
  );
}

async function abrirCartas(page: Page): Promise<void> {
  await page.goto('/_pruebas/cartas');
  await expect(page.locator('.carta.completa').first()).toBeVisible();
}

for (const ancho of [1280, 360]) {
  test(`ninguna carta de la colección Core desborda a ${ancho} px (SC-002)`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 900 });
    await abrirCartas(page);
    expect(await page.locator('.carta.completa').count()).toBeGreaterThan(100);
    expect(await desbordes(page)).toEqual([]);
  });
}

test('disposición: cabecera, posiciones bajo el nombre y pie con 6 stats y los specials (FR-001)', async ({ page }) => {
  await abrirCartas(page);
  const carta = page.locator('.carta.completa').first();
  const cabecera = await carta.locator('.carta-cabecera').boundingBox();
  const nombre = await carta.locator('.carta-nombre').boundingBox();
  const posiciones = await carta.locator('.carta-posiciones').boundingBox();
  const pie = await carta.locator('.carta-pie').boundingBox();
  await expect(carta.locator('.carta-silueta')).toBeVisible();
  await expect(carta.locator('.carta-media')).toBeVisible();
  expect(posiciones!.y).toBeGreaterThanOrEqual(nombre!.y + nombre!.height - 1);
  expect(pie!.y).toBeGreaterThan(posiciones!.y);
  expect(cabecera!.y).toBeLessThanOrEqual(nombre!.y);
  await expect(carta.locator('.carta-stat')).toHaveCount(6);
});

test('un GOAT con 4 specials muestra los 4 sin desplazamiento (FR-003)', async ({ page }) => {
  await abrirCartas(page);
  const goat = page.locator('.carta.completa[data-nivel="GOAT"][data-specials="4"]').first();
  await expect(goat).toBeVisible();
  await expect(goat.locator('.carta-special')).toHaveCount(4);
  await goat.scrollIntoViewIfNeeded();
  const marco = (await goat.boundingBox())!;
  for (const s of await goat.locator('.carta-special').all()) {
    const caja = (await s.boundingBox())!;
    expect(caja.x).toBeGreaterThanOrEqual(marco.x);
    expect(caja.y).toBeGreaterThanOrEqual(marco.y);
    expect(caja.x + caja.width).toBeLessThanOrEqual(marco.x + marco.width);
    expect(caja.y + caja.height).toBeLessThanOrEqual(marco.y + marco.height);
  }
});

test('pulsar un special abre su descripción (FR-004)', async ({ page }) => {
  await abrirCartas(page);
  const special = page.locator('.carta.completa .carta-special').first();
  await special.click();
  const id = await special.getAttribute('popovertarget');
  const descripcion = page.locator(`[id="${id}"]`);
  await expect(descripcion).toBeVisible();
  expect((await descripcion.textContent())!.length).toBeGreaterThan(10);
});

test('los cuatro niveles tienen un acabado distinto (FR-002)', async ({ page }) => {
  await abrirCartas(page);
  const marcos = new Set<string>();
  for (const nivel of ['Superclase', 'Epico', 'Legendario', 'GOAT']) {
    const carta = page.locator(`.carta.completa[data-nivel="${nivel}"]`).first();
    await expect(carta).toBeVisible();
    marcos.add(await carta.evaluate((el) => getComputedStyle(el).borderTopColor + getComputedStyle(el).backgroundImage));
  }
  expect(marcos.size).toBe(4);
});
