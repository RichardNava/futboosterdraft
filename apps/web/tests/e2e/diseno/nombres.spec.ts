import { expect, test, type Page } from '@playwright/test';

/** Nombres largos recortados con etiqueta (spec 004, Edge Cases; research R9; contracts/ui.md §10). */

const NOMBRE_LARGO = 'Club Atlético Valle Alto'; // 24 caracteres, el máximo

async function partidaConNombreLargo(page: Page): Promise<string> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Jugar como invitado' }).click();
  await expect(page.getByRole('heading', { name: 'Nueva partida' })).toBeVisible();
  const r = await page.request.post('/api/partidas', { data: { modo: 'liga', numParticipantes: 4 } });
  const { id } = (await r.json()) as { id: string };
  const nombre = await page.request.put(`/api/partidas/${id}/nombre-equipo`, { data: { nombre: NOMBRE_LARGO } });
  expect(nombre.ok()).toBe(true);
  return id;
}

async function terminarDraft(page: Page, id: string) {
  await page.request.post(`/api/partidas/${id}/iniciar`);
  for (let i = 0; i < 60; i++) {
    const estado = ((await (await page.request.get(`/api/partidas/${id}`)).json()) as { estado: string }).estado;
    if (estado === 'en_torneo') return;
    await page.request.post('/api/dev/reloj/avanzar', { data: { ms: 54_000 } });
    await page.waitForTimeout(50);
  }
  throw new Error('El draft no terminó');
}

const etiquetaAbierta = (page: Page) => page.locator('.etiqueta-nombre:popover-open');

test('un nombre de 24 caracteres se recorta sin desbordar y muestra el texto completo al señalar y al enfocar', async ({ page }) => {
  test.setTimeout(240_000);
  const id = await partidaConNombreLargo(page);
  await terminarDraft(page, id);
  await page.setViewportSize({ width: 360, height: 640 });

  // Plantillas: la pestaña del equipo propio recorta el nombre.
  await page.goto(`/partidas/${id}/plantillas`);
  const pestana = page.getByRole('tab', { name: new RegExp(NOMBRE_LARGO) });
  const nombre = pestana.locator('.nombre-recortado');
  await expect(nombre).toBeVisible();
  expect(await nombre.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  expect(await nombre.evaluate((el) => getComputedStyle(el).textOverflow)).toBe('ellipsis');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  // Ratón: al señalarlo 400 ms.
  await page.setViewportSize({ width: 1366, height: 768 });
  await nombre.hover();
  await expect(etiquetaAbierta(page)).toHaveText(NOMBRE_LARGO);
  await page.mouse.move(0, 0);
  await expect(etiquetaAbierta(page)).toHaveCount(0);

  // Teclado: al enfocar la pestaña con las flechas.
  const pestanas = page.getByRole('tab');
  const indice = await pestanas.evaluateAll((ps, n) => ps.findIndex((p) => p.textContent?.includes(n as string)), NOMBRE_LARGO);
  const otra = pestanas.nth(indice === 0 ? 1 : indice - 1);
  await otra.click();
  await page.keyboard.press(indice === 0 ? 'ArrowLeft' : 'ArrowRight');
  await expect(pestana).toBeFocused();
  await expect(etiquetaAbierta(page)).toHaveText(NOMBRE_LARGO);

  // El nombre completo sigue en el DOM para los lectores de pantalla.
  await expect(nombre).toHaveText(NOMBRE_LARGO);

  // Torneo a 360 px: ni la tabla ni la página desbordan.
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto(`/partidas/${id}/torneo`);
  await expect(page.locator('.clasificacion')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test.describe('en una pantalla táctil', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 360, height: 640 } });

  test('mantener pulsado el nombre de una carta del draft no la elige', async ({ page }) => {
    test.setTimeout(120_000);
    const id = await partidaConNombreLargo(page);
    await page.request.post(`/api/partidas/${id}/iniciar`);
    await page.goto(`/partidas/${id}/draft`);
    await expect(page.getByRole('heading', { name: /Sobre 1/ })).toBeVisible({ timeout: 30_000 });
    // Se salta la apertura del sobre.
    const saltar = page.getByRole('button', { name: /Saltar/ });
    if (await saltar.isVisible().catch(() => false)) await saltar.click();
    const carta = page.locator('section[aria-label="Sobre actual"] .carta-cuerpo[role="button"]').first();
    await expect(carta).toBeVisible({ timeout: 15_000 });
    const nombre = carta.locator('.carta-apellidos .nombre-recortado');
    await nombre.scrollIntoViewIfNeeded();
    const caja = (await nombre.boundingBox())!;
    const punto = { x: caja.x + caja.width / 2, y: caja.y + caja.height / 2 };

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [punto] });
    await page.waitForTimeout(700);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(300);

    await expect(carta).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('[data-principal]')).toHaveAttribute('aria-disabled', 'true');
    // Si el nombre estaba recortado, la etiqueta muestra el texto completo.
    const recortado = await nombre.evaluate((el) => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1);
    if (recortado) await expect(etiquetaAbierta(page)).toHaveText((await nombre.textContent()) ?? '');

    // Un toque normal sí la elige.
    await carta.tap();
    await expect(carta).toHaveAttribute('aria-pressed', 'true');
  });
});
