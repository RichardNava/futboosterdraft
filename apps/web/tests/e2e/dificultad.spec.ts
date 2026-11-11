import { expect, test } from '@playwright/test';

/** H14 de la validación (spec 003, FR-038a): dificultad de la partida al crearla. */

test('«Nueva partida» ofrece Fácil, Normal, Difícil y Extrema, con Normal preseleccionada; la sala muestra la elegida', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Jugar como invitado' }).click();
  await expect(page.getByRole('heading', { name: 'Nueva partida' })).toBeVisible();
  // Spec 013, ronda 2: deslizador por tramos (Fácil, Normal, Difícil, Extrema).
  const deslizador = page.getByRole('slider', { name: /^Dificultad/ });
  await expect(deslizador).toHaveAttribute('max', '3');
  await expect(deslizador).toHaveAttribute('aria-valuetext', /^Normal\./);
  await deslizador.focus();
  await page.keyboard.press('ArrowRight');
  await expect(deslizador).toHaveAttribute('aria-valuetext', /^Difícil\./);
  await page.getByRole('button', { name: 'Crear partida' }).click();
  await expect(page.getByRole('heading', { name: 'Sala' })).toBeVisible();
  await expect(page.getByTestId('dificultad')).toContainText('Difícil');
  // Invitado: las 3 plazas restantes se rellenan al crear, solo con intermedios y avanzados.
  const distintivos = page.locator('.lista-participantes .nivel-npc');
  await expect(distintivos).toHaveCount(3);
  for (const texto of await distintivos.allTextContents()) expect(texto).toMatch(/Intermedio|Avanzado/);
});
