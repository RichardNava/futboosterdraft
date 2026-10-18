import { expect, test } from '@playwright/test';
import { partidaTrasDraft } from './ayudas';

/** Escenario C del quickstart: partido rápido y descanso (Historia 3). */
test('partido rápido: descanso, cambios y resumen final', async ({ page }) => {
  const partidaId = await partidaTrasDraft(page);
  await page.goto(`/partidas/${partidaId}/alineacion`);
  await expect(page.getByRole('status').filter({ hasText: 'próximo partido contra' })).toBeVisible();

  // «Comenzar partido»: empieza al instante y la pantalla cambia sola (spec 002, FR-011).
  const antes = Date.now();
  await page.getByRole('button', { name: 'Comenzar partido' }).click();
  await expect(page.locator('.resultado .fase')).toHaveText('Descanso');
  expect(Date.now() - antes).toBeLessThan(10_000);
  await expect(page.locator('.resumen-eventos .evento-minuto').first()).toHaveText(/^\d+('|\+\d+')$/);

  // Una sustitución y un cambio a Presión alta.
  const sale = page.getByLabel('Sale');
  const entra = page.getByLabel('Entra');
  await sale.selectOption({ index: 1 });
  await entra.selectOption({ index: 1 });
  const nombreEntra = (await entra.locator('option:checked').textContent())!.split(' (')[0]!;
  await page.getByRole('button', { name: 'Hacer el cambio' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Sustitución pedida' })).toBeVisible();
  await page.getByText('Táctica', { exact: true }).click();
  await page.getByLabel('Presión alta').check();
  await page.getByRole('button', { name: 'Aplicar táctica' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Cambio táctico pedido' })).toBeVisible();

  await page.getByRole('button', { name: 'Seguir' }).click();
  await expect(page.locator('.resultado .fase')).toHaveText('Final');
  await expect(page.getByRole('heading', { name: 'Resumen del partido' })).toBeVisible();
  // El resumen muestra el dorsal delante del nombre: "Entra 17. Nombre Apellido por …".
  const nombre = nombreEntra.split(' ').slice(0, 2).join(' ');
  await expect(page.locator('.resumen-eventos')).toContainText(new RegExp(`Entra (\\d+\\. )?${nombre}`));
  await expect(page.getByRole('table')).toContainText('Posesión');
  await expect(page.getByRole('table')).toContainText('Tiros a puerta');
});
