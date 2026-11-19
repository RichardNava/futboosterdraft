import { expect, test, type Page } from '@playwright/test';
import { registrar } from './ayudas';

/**
 * Tienda (spec 006, US4 y US5; quickstart G y H): sobre con fragmentos con su apertura y compra de una colección.
 * Spec 011 (FR-002, quickstart recorrido 9): sin bloque de fragmentos y las cartas solo en fragmentos. Sin paquetes de
 * fragmentos, el saldo se da con `/api/dev/fragmentos` (solo con el reloj simulado).
 */

const darFragmentos = async (page: Page, fragmentos: number) =>
  expect((await page.request.post('/api/dev/fragmentos', { data: { fragmentos } })).status()).toBe(200);

test('sin fragmentos a la venta y cartas solo en fragmentos (spec 011, FR-002)', async ({ page }) => {
  await registrar(page);
  await page.goto('/');
  await page.getByRole('link', { name: /^Fragmentos: 0\./ }).click();
  await expect(page).toHaveURL(/\/tienda$/);
  await expect(page.getByRole('heading', { name: 'Fragmentos' })).toHaveCount(0);
  // Los cosméticos sí tienen precio en euros; las cartas no.
  await expect(page.locator('.tienda-sobre, [data-coleccion]').getByText(/€/)).toHaveCount(0);
});

test('sobre con fragmentos desde «Colección»: apertura, 8 cartas nuevas y saldo −1.000 (US4)', async ({ page }) => {
  await registrar(page);
  await darFragmentos(page, 1000);
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

test('expansión: detalle, compra desde el modal, confirmación con el sobre de regalo y tarjeta «Adquirida» (spec 016, US2)', async ({ page }) => {
  await registrar(page);
  await darFragmentos(page, 2400);
  await page.goto('/tienda?seccion=colecciones');
  const tarjeta = page.locator('[data-coleccion="remontada-historica"]');
  const verDetalle = tarjeta.getByRole('button', { name: 'Ver detalle de Remontada Histórica' });

  // El modal se abre con el foco en el título y Esc lo cierra devolviendo el foco a «Ver detalle».
  await verDetalle.click();
  const detalle = page.getByRole('dialog', { name: 'Remontada Histórica' });
  await expect(detalle).toBeVisible();
  await expect(detalle.getByRole('heading', { name: 'Remontada Histórica' })).toBeFocused();
  await expect(detalle.locator('.detalle-expansion-cartas li')).toHaveCount(24);
  // Cada jugador abre su carta; Esc cierra solo la carta y el foco vuelve a la fila.
  const fila = detalle.locator('.detalle-expansion-fila').first();
  await fila.click();
  const carta = page.getByRole('dialog').filter({ has: page.locator('.carta.completa') });
  await expect(carta).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(carta).toHaveCount(0);
  await expect(detalle).toBeVisible();
  await expect(fila).toBeFocused();
  // El sobre de regalo, en pequeño, se amplía al pulsarlo.
  await detalle.getByRole('button', { name: /el sobre de regalo/ }).click();
  const sobre = page.getByRole('dialog', { name: 'Sobre 7' });
  await expect(sobre.locator('img[src="/cosmeticos/sobres/sobre-7.webp"]').first()).toBeVisible();
  await sobre.getByRole('button', { name: 'Cerrar' }).click();
  await expect(sobre).toHaveCount(0);
  await detalle.getByRole('heading', { name: 'Remontada Histórica' }).focus();
  await page.keyboard.press('Escape');
  await expect(detalle).toHaveCount(0);
  await expect(verDetalle).toBeFocused();

  await verDetalle.click();
  await detalle.getByRole('button', { name: 'Comprar · 2.400 fragmentos' }).click();
  // El modal se cierra y se abre la confirmación del pago, que lleva el mismo título.
  await expect(page.locator('.modal-expansion')).toHaveCount(0);
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar compra' }).click();
  await page.getByRole('button', { name: 'Saltar' }).click();
  const resumen = page.getByRole('dialog', { name: /adquirida/ });
  await expect(resumen).toContainText('24 cartas nuevas');
  await expect(resumen).toContainText('Sobre de regalo');
  await resumen.getByRole('button', { name: 'Seguir comprando' }).click();
  await expect(tarjeta).toContainText('Adquirida');
  await expect(tarjeta.getByRole('button', { name: /Comprar/ })).toHaveCount(0);
});
