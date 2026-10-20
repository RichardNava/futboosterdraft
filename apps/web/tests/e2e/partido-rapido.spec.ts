import { expect, test } from '@playwright/test';
import { partidaTrasDraft, sustituirEnGestion } from './ayudas';

/** Escenario C del quickstart: partido rápido y descanso (Historia 3). */
test('partido rápido: descanso, cambios y resumen final', async ({ page }) => {
  const partidaId = await partidaTrasDraft(page);
  await page.goto(`/partidas/${partidaId}/torneo`);
  await expect(page.getByRole('status').filter({ hasText: 'próximo partido contra' })).toBeVisible();

  // «Comenzar partido»: empieza al instante y la pantalla cambia sola (spec 002, FR-011).
  const antes = Date.now();
  await page.getByRole('button', { name: 'Comenzar partido' }).click();
  await expect(page.locator('.resultado .fase')).toHaveText('Descanso');
  expect(Date.now() - antes).toBeLessThan(10_000);
  await expect(page.locator('.resumen-eventos .evento-minuto').first()).toHaveText(/^\d+('|\+\d+')$/);

  // Una sustitución desde «Gestionar equipo» (spec 003, US5): el primer suplente entra por el delantero centro.
  await page.getByRole('button', { name: 'Gestionar equipo' }).click();
  const suplente = page.getByTestId('gestion-equipo').getByTestId('banquillo').locator('.ficha-lista').first();
  const nombreEntra = (await suplente.getAttribute('aria-label'))!.replace(/ \(.*$/, '');
  await sustituirEnGestion(page);
  await page.getByRole('button', { name: 'Confirmar cambios' }).click();
  await expect(page.getByTestId('gestion-equipo')).toBeHidden();

  await page.getByRole('button', { name: 'Seguir' }).click();
  await expect(page.locator('.resultado .fase')).toHaveText('Final');
  await expect(page.getByRole('heading', { name: 'Resumen del partido' })).toBeVisible();
  // El resumen muestra el dorsal delante del nombre: "Entra 17. Nombre Apellido por …".
  const nombre = nombreEntra.split(' ').slice(0, 2).join(' ');
  await expect(page.locator('.resumen-eventos')).toContainText(new RegExp(`Entra (\\d+\\. )?${nombre}`));
  await expect(page.getByRole('table')).toContainText('Posesión');
  await expect(page.getByRole('table')).toContainText('Tiros a puerta');
});
