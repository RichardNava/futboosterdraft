import { expect, test, type Page } from '@playwright/test';

/**
 * Defectos en las cartas (spec 005, T044; FR-020 a FR-024, SC-006; quickstart, recorrido B).
 */

async function abrirCartas(page: Page): Promise<void> {
  await page.goto('/_pruebas/cartas');
  await expect(page.locator('.carta.completa').first()).toBeVisible();
}

test('el GOAT con 4 virtudes y 2 defectos muestra las dos filas completas y mide lo mismo que la carta sin rasgos', async ({ page }) => {
  await abrirCartas(page);
  const muestra = page.locator('section[aria-label="Muestra por nivel"] .rejilla-cartas');
  const goat = muestra.locator('.carta.completa[data-nivel="GOAT"][data-virtudes="4"][data-defectos="2"]').first();
  const sinRasgos = muestra.locator('.carta.completa[data-nivel="Superclase"][data-virtudes="0"][data-defectos="0"]').first();
  await expect(goat).toBeVisible();
  await expect(sinRasgos).toBeVisible();
  await expect(goat.locator('.carta-virtudes .carta-virtud')).toHaveCount(4);
  await expect(goat.locator('.carta-defectos .carta-defecto')).toHaveCount(2);

  // Los defectos van debajo de las virtudes, en rojo de juego y con su icono.
  const virtudes = (await goat.locator('.carta-virtudes').boundingBox())!;
  const defectos = (await goat.locator('.carta-defectos').boundingBox())!;
  expect(defectos.y).toBeGreaterThanOrEqual(virtudes.y + virtudes.height - 1);
  const defecto = goat.locator('.carta-defecto').first();
  await expect(defecto.locator('svg.carta-defecto-icono')).toHaveCount(1);
  const [colorDefecto, colorVirtud] = await Promise.all([
    defecto.evaluate((el) => getComputedStyle(el).color),
    goat.locator('.carta-virtud').first().evaluate((el) => getComputedStyle(el).color),
  ]);
  expect(colorDefecto).not.toBe(colorVirtud);
  expect(colorDefecto).toBe('rgb(255, 90, 110)');

  // Todas las cartas miden lo mismo, tengan los rasgos que tengan (FR-022).
  const a = (await goat.boundingBox())!;
  const b = (await sinRasgos.boundingBox())!;
  expect(Math.abs(a.height - b.height)).toBeLessThanOrEqual(1);
  expect(await goat.evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
});

test('pulsar un defecto abre «Defecto · …» y una virtud «Virtud · …» (FR-023)', async ({ page }) => {
  await abrirCartas(page);
  const defecto = page.locator('.carta.completa .carta-defecto').first();
  await defecto.click();
  const descripcion = page.locator(`[id="${await defecto.getAttribute('popovertarget')}"]`);
  await expect(descripcion).toBeVisible();
  await expect(descripcion.locator('strong')).toHaveText(/^Defecto · /);
  await page.keyboard.press('Escape');
  const virtud = page.locator('.carta.completa .carta-virtud').first();
  await virtud.click();
  await expect(page.locator(`[id="${await virtud.getAttribute('popovertarget')}"] strong`)).toHaveText(/^Virtud · /);
});

test('en el draft, pulsar un defecto abre su descripción y no elige la carta (FR-024)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Jugar como invitado' }).click();
  await expect(page.getByRole('heading', { name: 'Nueva partida' })).toBeVisible();
  await page.getByRole('button', { name: 'Crear partida' }).click();
  await expect(page.getByRole('heading', { name: 'Sala' })).toBeVisible();
  await page.getByRole('button', { name: 'Empezar' }).click();
  const sobre = page.locator('section[aria-label="Sobre actual"]');
  // Se avanzan turnos hasta que en el sobre haya una carta con defectos.
  for (let turno = 0; turno < 40; turno++) {
    await expect(sobre.locator('.carta').first()).toBeVisible();
    const defecto = sobre.locator('.carta-defecto').first();
    if ((await defecto.count()) > 0) {
      const carta = sobre.locator('.carta').filter({ has: page.locator('.carta-defecto') }).first();
      await defecto.click();
      const descripcion = page.locator(`[id="${await defecto.getAttribute('popovertarget')}"]`);
      await expect(descripcion).toBeVisible();
      await expect(descripcion.locator('strong')).toHaveText(/^Defecto · /);
      await expect(carta.locator('.carta-cuerpo')).toHaveAttribute('aria-pressed', 'false');
      await expect(page.getByRole('button', { name: 'Confirmar elección' })).toBeDisabled();
      return;
    }
    await page.request.post('/api/dev/reloj/avanzar', { data: { ms: 54_000 } });
    await page.waitForTimeout(300);
  }
  throw new Error('No apareció ninguna carta con defectos en el draft');
});
