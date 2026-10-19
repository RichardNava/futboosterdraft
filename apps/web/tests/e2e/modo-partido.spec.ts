import { expect, test } from '@playwright/test';
import { partidaTrasDraft } from './ayudas';

/** Escenario C del quickstart de la spec 003: el modo de simulación se elige en cada partido (US3). */

test('«Crear partida» ya no tiene opción de tipo de simulación', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Jugar como invitado' }).click();
  await expect(page.getByRole('heading', { name: 'Nueva partida' })).toBeVisible();
  await page.goto('/partidas/nueva');
  await expect(page.getByRole('heading', { name: 'Nueva partida' })).toBeVisible();
  await expect(page.getByText('Simulación de los partidos')).toHaveCount(0);
  await expect(page.getByText('2D en tiempo real')).toHaveCount(0);
});

test('el primer partido viene en rápida; se elige 2D y el siguiente partido la propone; se vuelve a rápida', async ({ page }) => {
  test.setTimeout(400_000);
  const partidaId = await partidaTrasDraft(page);
  // El selector está en la preparación del torneo, no en «Formación» (FR-032).
  await page.goto(`/partidas/${partidaId}/alineacion`);
  await expect(page.getByRole('heading', { name: 'Formación' })).toBeVisible();
  await expect(page.getByLabel('Simulación rápida')).toHaveCount(0);
  await page.goto(`/partidas/${partidaId}/torneo`);
  await expect(page.getByLabel('Simulación rápida')).toBeChecked();

  // Se cambia a 2D: el partido se ve en el campo.
  await page.getByLabel('Simulación 2D').check();
  await page.getByRole('button', { name: 'Comenzar partido' }).click();
  await expect(page.locator('.campo-2d canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Finalizar partido' }).click();
  await expect(page.getByTestId('resultado-partido')).toBeVisible({ timeout: 60_000 });

  // Siguiente jornada: viene preseleccionada la 2D.
  await page.locator('[data-principal]').click();
  await expect(page.getByRole('heading', { name: 'Torneo' })).toBeVisible();
  const siguiente = page.getByRole('button', { name: 'Siguiente jornada' });
  if (await siguiente.count()) await siguiente.click();
  await page.goto(`/partidas/${partidaId}/torneo`);
  await expect(page.getByLabel('Simulación 2D')).toBeChecked({ timeout: 30_000 });

  // Se cambia a rápida: el partido se presenta como resumen por partes.
  await page.getByLabel('Simulación rápida').check();
  await page.getByRole('button', { name: 'Comenzar partido' }).click();
  await expect(page.locator('.resultado .fase')).toHaveText(/Descanso|Final/);
  await expect(page.locator('.campo-2d canvas')).toHaveCount(0);
});
