import { expect, test } from '@playwright/test';
import { registrar } from './ayudas';

/**
 * Tienda (spec 006, US4, US5 y US7; quickstart G, H y J): paquete de fragmentos con el pago de prueba, sobre con
 * fragmentos con su apertura y compra de una colección.
 */

test('paquete de 1.000 fragmentos con la cinta de pago de prueba (US7)', async ({ page }) => {
  await registrar(page);
  // El saldo de la barra lleva a los paquetes de fragmentos de la tienda.
  await page.goto('/');
  await page.getByRole('link', { name: /^Fragmentos: 0\./ }).click();
  await expect(page).toHaveURL(/\/tienda#fragmentos$/);
  await page.locator('[data-paquete="fragmentos-1000"]').getByRole('button', { name: /Comprar/ }).click();
  const dialogo = page.getByRole('dialog');
  await expect(dialogo.getByText('PAGO DE PRUEBA — no se cobra nada')).toBeVisible();
  await dialogo.getByRole('button', { name: 'Confirmar compra' }).click();
  await expect(page.locator('.tienda-saldo')).toContainText('1.000');
  await expect(page.locator('.saldo-navegacion')).toContainText('1.000');
});

test('sobre con fragmentos desde «Colección»: apertura, 8 cartas nuevas y saldo −1.000 (US4)', async ({ page }) => {
  await registrar(page);
  const id = crypto.randomUUID();
  expect((await page.request.post('/api/tienda/fragmentos/fragmentos-1000/comprar', { data: { idCompra: id } })).status()).toBe(200);
  await page.goto('/coleccion');
  await page.getByRole('link', { name: 'Tienda' }).last().click();
  await expect(page.locator('.tienda-saldo')).toContainText('1.000');
  await page.getByRole('button', { name: 'Comprar por 1.000 fragmentos' }).click();
  await expect(page.getByRole('dialog', { name: 'Apertura del sobre' })).toBeVisible();
  await page.getByRole('button', { name: 'Saltar' }).click();
  const sobre = page.getByRole('region', { name: 'Tu sobre' });
  await sobre.getByRole('radio', { name: 'Revelar una a una' }).click();
  for (let i = 1; i <= 8; i++) await sobre.getByRole('button', { name: `Revelar la carta ${i}` }).click();
  await expect(sobre.locator('.carta.completa')).toHaveCount(8);
  // Cada carta ocupa su celda: antes se quedaba en una franja de ancho casi nulo.
  expect((await sobre.locator('.carta.completa').first().boundingBox())!.width).toBeGreaterThan(120);
  // Dos filas de cuatro que caben sin scroll.
  const filas = await sobre.locator('.carta.completa').evaluateAll((cs) => cs.map((c) => Math.round(c.getBoundingClientRect().top)));
  expect(new Set(filas.slice(0, 4)).size).toBe(1);
  expect(new Set(filas.slice(4)).size).toBe(1);
  expect(filas[4]).toBeGreaterThan(filas[0]!);
  expect(await sobre.evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
  const nombre = await sobre.locator('.carta.completa .carta-apellidos').first().innerText();
  await sobre.getByRole('link', { name: 'Ver en mi colección' }).click();
  await expect(page.locator('.coleccion-resumen')).toContainText('308');
  await page.getByRole('searchbox', { name: 'Buscar por nombre' }).fill(nombre);
  await expect(page.locator('.coleccion-carta').first()).toBeVisible();
  await page.goto('/tienda');
  await expect(page.locator('.tienda-saldo')).toContainText('0');
});

test('comprar Top Argentinos: confirmación, resumen y tarjeta «Adquirida» (US5)', async ({ page }) => {
  await registrar(page);
  await page.goto('/tienda');
  await page.locator('[data-coleccion="top-argentinos"]').getByRole('button', { name: /Comprar/ }).click();
  await expect(page.getByRole('dialog').getByText('PAGO DE PRUEBA — no se cobra nada')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar compra' }).click();
  await page.getByRole('button', { name: 'Saltar' }).click();
  const resumen = page.getByRole('dialog', { name: /adquirida/ });
  await expect(resumen).toContainText('39 cartas nuevas');
  await expect(resumen).toContainText('+175');
  await resumen.getByRole('button', { name: 'Seguir comprando' }).click();
  await expect(page.locator('[data-coleccion="top-argentinos"]')).toContainText('Adquirida');
  await expect(page.locator('[data-coleccion="top-argentinos"]').getByRole('button', { name: /Comprar/ })).toHaveCount(0);
});
