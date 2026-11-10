import { expect, test } from '@playwright/test';
import { registrar } from './ayudas';

/** Spec 013 (US7; FR-031, FR-032, SC-010): «Mi perfil» en dos columnas, sin desplazarse a 1366 × 768. */

test('a 1366 × 768, equipaciones, escudo y sobre a la vista sin desplazar; guardar funciona igual', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await registrar(page);
  await page.goto('/perfil');
  await expect(page.getByRole('heading', { name: 'Mi perfil' })).toBeVisible();
  for (const sel of ['[data-equipacion="primera"]', '[data-equipacion="segunda"]', '.perfil-escudo', '.perfil-sobre']) {
    const caja = (await page.locator(sel).boundingBox())!;
    expect(caja.y, sel).toBeGreaterThanOrEqual(0);
    expect(caja.y + Math.min(caja.height, 120), sel).toBeLessThanOrEqual(768);
  }
  // Equipaciones a la izquierda y escudo a la derecha.
  const equip = (await page.locator('.perfil-equipaciones').boundingBox())!;
  const escudo = (await page.locator('.perfil-escudo').boundingBox())!;
  expect(escudo.x).toBeGreaterThan(equip.x + equip.width / 2);

  await page.getByLabel('Nombre del equipo').fill('Los de la prueba');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText('Perfil guardado')).toBeVisible();
  const perfil = (await (await page.request.get('/api/perfil')).json()) as { nombreEquipo: string };
  expect(perfil.nombreEquipo).toBe('Los de la prueba');
});

test('a 375 px las secciones se apilan', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await registrar(page);
  await page.goto('/perfil');
  const equip = (await page.locator('.perfil-equipaciones').boundingBox())!;
  const escudo = (await page.locator('.perfil-escudo').boundingBox())!;
  expect(escudo.y).toBeGreaterThanOrEqual(equip.y + equip.height - 1);
});
