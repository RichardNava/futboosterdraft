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

// Spec 013 (FR-027): «¿Has olvidado la contraseña?» pide el enlace y el enlace del correo abre la contraseña nueva.
test('credenciales malas ⇒ recuperar la contraseña sin decir si hay cuenta', async ({ page }) => {
  await abrirLogin(page);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.getByRole('button', { name: '¿Has olvidado la contraseña?' }).click();
  await expect(page.getByRole('heading', { name: 'Recuperar la contraseña' })).toBeVisible();
  await page.getByLabel('Correo electrónico').fill('nadie@pruebas.test');
  await page.getByRole('button', { name: 'Enviar enlace' }).click();
  await expect(page.getByRole('status')).toContainText('Si hay una cuenta con ese correo');
});

test('enlace del correo ⇒ contraseña nueva; enlace caducado ⇒ pedir otro', async ({ page }) => {
  let respuesta = { status: 200, body: { status: true } as object };
  await page.route('**/api/auth/restablecer', (r) => r.fulfill({ status: respuesta.status, contentType: 'application/json', body: JSON.stringify(respuesta.body) }));
  await page.goto('/?restablecer=abc');
  await expect(page.getByRole('heading', { name: 'Elige una contraseña nueva' })).toBeVisible();
  // SEG-030: el token sale de la dirección en cuanto se lee, y el formulario sigue funcionando con él en memoria.
  await expect(page).not.toHaveURL(/restablecer/);
  await page.getByLabel('Contraseña nueva', { exact: true }).fill('otra-contraseña');
  await page.getByRole('button', { name: 'Guardar contraseña' }).click();
  await expect(page.getByRole('status')).toContainText('Contraseña cambiada');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);

  respuesta = { status: 400, body: { code: 'INVALID_TOKEN', message: 'Invalid token' } };
  await page.goto('/?restablecer=caducado');
  await page.getByLabel('Contraseña nueva', { exact: true }).fill('otra-contraseña');
  await page.getByRole('button', { name: 'Guardar contraseña' }).click();
  await expect(page.getByRole('alert')).toContainText('El enlace no es válido o ha caducado.');
  await page.getByRole('button', { name: 'Pedir otro enlace' }).click();
  await expect(page.getByRole('heading', { name: 'Recuperar la contraseña' })).toBeVisible();
});
