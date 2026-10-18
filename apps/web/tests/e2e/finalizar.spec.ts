import { expect, test } from '@playwright/test';
import { partidaTrasDraft } from './ayudas';

/** Escenario G del quickstart (Historia 5), pasos 1 y 3: finalizar un 2D en el minuto 30 con un cambio pendiente. */
test('2D: «Finalizar partido» en el minuto 30 muestra el resultado en < 3 s con el cambio pendiente aplicado', async ({ page }) => {
  test.setTimeout(300_000);
  const partidaId = await partidaTrasDraft(page, { tipoSimulacion: '2d' });
  await page.goto(`/partidas/${partidaId}/alineacion`);
  await page.getByRole('button', { name: 'Comenzar partido' }).click();
  await expect(page.locator('.campo-2d canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Finalizar partido' })).toBeVisible();
  await page.getByRole('button', { name: 'x8' }).click();

  // Hasta el minuto 30 de lo que se está viendo.
  await expect
    .poll(async () => Number(/(\d+)'/.exec((await page.locator('.marcador-2d .nota').textContent()) ?? '')?.[1] ?? 0), { timeout: 120_000 })
    .toBeGreaterThanOrEqual(30);

  // Una sustitución pedida con el balón en juego y, sin esperar, «Finalizar partido».
  await page.getByLabel('Sale').selectOption({ index: 1 });
  await page.getByLabel('Entra').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Hacer el cambio' }).click();
  await expect(page.getByText(/Cambio confirmado|Se aplicará en el minuto|Tu cambio se aplicó/)).toBeVisible();
  const antes = Date.now();
  await page.getByRole('button', { name: 'Finalizar partido' }).click();
  await expect(page.getByRole('heading', { name: 'Resumen del partido' })).toBeVisible();
  expect(Date.now() - antes).toBeLessThan(3000);
  await expect(page.locator('.resumen-eventos')).toContainText(/Entra/);
  await expect(page.getByRole('table')).toContainText('Pases completados');
  await expect(page.getByRole('button', { name: 'Finalizar partido' })).toBeHidden();
});

/** Escenario G, paso 5: en la simulación rápida, «Finalizar partido» en el descanso lleva al resultado final. */
test('rápida: «Finalizar partido» siempre visible y en el descanso lleva al final', async ({ page }) => {
  const partidaId = await partidaTrasDraft(page);
  await page.goto(`/partidas/${partidaId}/alineacion`);
  await page.getByRole('button', { name: 'Comenzar partido' }).click();
  await expect(page.locator('.resultado .fase')).toHaveText('Descanso');
  await page.getByRole('button', { name: 'Finalizar partido' }).click();
  await expect(page.locator('.resultado .fase')).toHaveText('Final');
  await expect(page.getByRole('heading', { name: 'Resumen del partido' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Finalizar partido' })).toBeHidden();
});
