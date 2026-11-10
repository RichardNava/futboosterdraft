import { expect, test, type Page } from '@playwright/test';

/** Spec 013 (US5; FR-026 a FR-028, SC-008): aviso de error de inicio de sesión arriba y sin mover la portada. */

async function abrirLogin(page: Page) {
  await page.goto('/?acceso=entrar');
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  await page.getByLabel('Correo electrónico').fill('nadie@pruebas.test');
  await page.getByLabel('Contraseña').fill('contraseña-mala');
}

const cajaEscena = (page: Page) => page.locator('.portada-escena').boundingBox();

test('contraseña mala ⇒ aviso visible sin desplazar y la portada no se mueve', async ({ page }) => {
  await abrirLogin(page);
  const antes = await cajaEscena(page);
  await page.getByRole('button', { name: 'Entrar' }).click();
  const aviso = page.getByRole('alert').filter({ hasText: 'El email o la contraseña no son correctos.' });
  await expect(aviso).toBeVisible();
  await expect(aviso).toBeInViewport();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect(await cajaEscena(page)).toEqual(antes);
});

test('429 ⇒ «Demasiados intentos»', async ({ page }) => {
  await page.route('**/api/auth/login', (r) => r.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: { codigo: 'DEMASIADAS_PETICIONES', mensaje: 'x', detalles: {} } }) }));
  await abrirLogin(page);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('alert')).toContainText('Demasiados intentos. Espera un minuto y vuelve a probar.');
});

test('red caída ⇒ «No hay conexión con el servidor»', async ({ page }) => {
  await page.route('**/api/auth/login', (r) => r.abort());
  await abrirLogin(page);
  const antes = await cajaEscena(page);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('alert')).toContainText('No hay conexión con el servidor. Inténtalo en unos segundos.');
  expect(await cajaEscena(page)).toEqual(antes);
});
