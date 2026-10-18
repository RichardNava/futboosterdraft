import { expect, test, type Page } from '@playwright/test';

/** Escenario B del quickstart (US10; FR-006 a FR-010, SC-017): apertura de los sobres propios. */

const dialogo = (page: Page) => page.getByRole('dialog', { name: 'Apertura del sobre' });
const titulo = (page: Page) => page.getByRole('heading', { level: 1 });

async function empezarDraft(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Jugar como invitado' }).click();
  await expect(page.getByRole('heading', { name: 'Nueva partida' })).toBeVisible();
  await page.getByRole('button', { name: 'Crear partida' }).click();
  await expect(page.getByRole('heading', { name: 'Sala' })).toBeVisible();
  await page.getByRole('button', { name: 'Iniciar draft' }).click();
}

/** Elige la primera carta y espera al siguiente turno. */
async function elegir(page: Page, siguiente: RegExp) {
  await page.locator('section[aria-label="Sobre actual"] .carta-cuerpo[role="button"]').first().click();
  await page.getByRole('button', { name: 'Confirmar elección' }).click();
  await expect(titulo(page)).toHaveText(siguiente);
}

test('la animación aparece al abrir cada sobre propio, se puede saltar, da 6 s más y no se repite al recargar', async ({ page }) => {
  test.setTimeout(240_000);
  await empezarDraft(page);

  // 1 y 3. Primer sobre: animación de ≤ 6 s y el reloj del turno con los 6 s de margen (45 + 6).
  await expect(dialogo(page)).toBeVisible();
  const inicio = Date.now();
  await expect(page.locator('.reloj')).toHaveText('51 s');
  await expect(dialogo(page)).toBeHidden({ timeout: 7000 });
  expect(Date.now() - inicio).toBeLessThanOrEqual(6000);
  await expect(titulo(page)).toContainText('Sobre 1 · Turno 1 de 8');

  // En el resto de turnos, sin animación.
  for (let t = 2; t <= 8; t++) {
    await elegir(page, new RegExp(`Sobre 1 · Turno ${t} de 8`));
    await expect(dialogo(page)).toHaveCount(0);
  }

  // 2. Segundo sobre: «Saltar» revela las cartas al instante.
  await page.locator('section[aria-label="Sobre actual"] .carta-cuerpo[role="button"]').first().click();
  await page.getByRole('button', { name: 'Confirmar elección' }).click();
  await expect(dialogo(page)).toBeVisible();
  await dialogo(page).getByRole('button', { name: 'Saltar' }).click();
  await expect(dialogo(page)).toBeHidden({ timeout: 500 });
  await expect(titulo(page)).toContainText('Sobre 2 · Turno 1 de 8');

  // 5. Silenciar en la barra: la preferencia se recuerda al recargar.
  await page.getByRole('button', { name: 'Silenciar los sonidos' }).click();
  // 7. Recargar (aquí, sin animación en curso; tampoco se repite la del turno): las cartas aparecen directamente.
  await page.reload();
  await expect(titulo(page)).toContainText('Sobre 2 · Turno 1 de 8');
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Activar los sonidos' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('fbd.sonido'))).toBe('silenciado');

  // Tercer sobre, recargando a mitad de su animación: no se repite.
  for (let t = 2; t <= 8; t++) await elegir(page, new RegExp(`Sobre 2 · Turno ${t} de 8`));
  await page.locator('section[aria-label="Sobre actual"] .carta-cuerpo[role="button"]').first().click();
  await page.getByRole('button', { name: 'Confirmar elección' }).click();
  await expect(dialogo(page)).toBeVisible();
  await page.reload();
  await expect(titulo(page)).toContainText('Sobre 3 · Turno 1 de 8');
  await expect(dialogo(page)).toHaveCount(0);
});

test('con movimiento reducido, la animación es un fundido breve', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await empezarDraft(page);
  await expect(dialogo(page)).toBeVisible();
  await expect(dialogo(page)).toHaveClass(/fase-fundido/);
  await expect(dialogo(page)).toBeHidden({ timeout: 1000 });
});
