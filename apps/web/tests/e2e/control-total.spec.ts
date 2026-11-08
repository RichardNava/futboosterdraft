import { expect, test } from '@playwright/test';
import { partidaTrasDraft } from './ayudas';

/**
 * Spec 012 (US4, quickstart 9 y 11; FR-020 a FR-023): «Control total» elegido en la pestaña Táctica de Formación;
 * en la 2D contra un NPC, una lesión o expulsión propia detiene la reproducción con el aviso y abre «Gestionar
 * equipo»; al volver sin cambios, el partido sigue. Las lesiones se hacen más probables con la ruta de desarrollo.
 * Que en automático no se pare y que entre humanos no haya selector lo prueban el motor y la integración del servidor.
 */
test('control total en la 2D: parada por un lance propio, aviso y gestión del equipo', async ({ page }) => {
  test.setTimeout(400_000);
  const partidaId = await partidaTrasDraft(page);

  await page.goto(`/partidas/${partidaId}/alineacion`);
  await page.getByRole('tab', { name: 'Táctica' }).click();
  await page.getByRole('button', { name: 'Control total' }).click();
  await expect(page.getByRole('button', { name: 'Control total' })).toHaveAttribute('aria-pressed', 'true');

  await page.goto(`/partidas/${partidaId}/torneo`);
  await page.getByLabel('Simulación 2D').check();
  await page.getByRole('button', { name: 'Comenzar partido' }).click();
  await expect(page.locator('.campo-2d canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Control total' })).toHaveAttribute('aria-pressed', 'true');
  const partidoId = page.url().split('/').at(-1)!;
  expect((await page.request.post(`/api/dev/partidas/${partidaId}/partidos/${partidoId}/lesiones`)).ok()).toBe(true);
  await page.getByRole('button', { name: 'x8' }).click();

  const gestion = page.getByTestId('gestion-equipo');
  await expect(gestion).toBeVisible({ timeout: 300_000 });
  await expect(gestion.locator('.aviso-parada')).toContainText(/(Lesión|Expulsión) de .+\(\d+(\+\d+)?'\)\. (Te queda|No te quedan)/);

  // Sin cambios: se vuelve al partido y sigue (lo pendiente, en automático).
  await page.getByRole('button', { name: 'Volver sin cambios' }).click();
  await expect(gestion).toBeHidden();
  await expect(page.locator('.campo-2d canvas')).toBeVisible();
});
