import { expect, test } from '@playwright/test';

/** H14 de la validación (spec 003, FR-038a): dificultad de la partida al crearla. */

test('«Nueva partida» ofrece Fácil, Normal y Difícil, con Normal preseleccionada; la sala muestra la elegida', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Jugar como invitado' }).click();
  await expect(page.getByRole('heading', { name: 'Nueva partida' })).toBeVisible();
  const grupo = page.getByRole('group', { name: 'Dificultad' });
  await expect(grupo.getByRole('radio')).toHaveCount(3);
  await expect(grupo.getByRole('radio', { name: /^Normal/ })).toBeChecked();
  await grupo.getByRole('radio', { name: /^Difícil/ }).check();
  await page.getByRole('button', { name: 'Crear partida' }).click();
  await expect(page.getByRole('heading', { name: 'Sala' })).toBeVisible();
  await expect(page.getByTestId('dificultad')).toContainText('Difícil');
  // Invitado: las 3 plazas restantes se rellenan al crear, solo con intermedios y avanzados.
  const distintivos = page.locator('.lista-participantes .nivel-npc');
  await expect(distintivos).toHaveCount(3);
  for (const texto of await distintivos.allTextContents()) expect(texto).toMatch(/Intermedio|Avanzado/);
});
