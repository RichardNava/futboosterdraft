import { expect, test } from '@playwright/test';
import { partidaTrasDraft, sustituirEnGestion } from './ayudas';

/**
 * Escenario F del quickstart (Historia 3): partido 2D en directo contra un NPC con el búfer de
 * anticipación. Velocidades x2, x4 y x8 (por defecto x2 y recordada al recargar), «¡Gol!», descanso con
 * «Seguir», «Se aplicará en el minuto N» tras pedir un cambio, estadísticas finales (FR-024) y a 360 px el
 * campo, el marcador y los controles visibles sin desbordar (FR-025b).
 */
test('partido 2D en directo: velocidades, pausas anunciadas, cambio y estadísticas', async ({ page }) => {
  test.setTimeout(400_000);
  const partidaId = await partidaTrasDraft(page);
  await page.goto(`/partidas/${partidaId}/torneo`);
  await page.getByLabel('Simulación 2D').check();
  await page.getByRole('button', { name: 'Comenzar partido' }).click();
  await expect(page.locator('.campo-2d canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'x2' })).toHaveAttribute('aria-pressed', 'true');

  // Se recuerda la última velocidad elegida.
  await page.getByRole('button', { name: 'x8' }).click();
  await expect(page.getByRole('button', { name: 'x8' })).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.locator('.campo-2d canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'x8' })).toHaveAttribute('aria-pressed', 'true');

  // Se apunta si se ve «¡Gol!» en algún momento (el rótulo dura 2 s reales).
  await page.evaluate(() => {
    const w = window as unknown as { golVisto: boolean };
    w.golVisto = false;
    const mirar = () => {
      if (document.querySelector('.marcador-2d')?.textContent?.includes('¡Gol!')) w.golVisto = true;
      requestAnimationFrame(mirar);
    };
    mirar();
  });

  // Un cambio con el balón en juego desde «Gestionar equipo» (spec 003, US5): se aplica en la siguiente interrupción.
  await page.getByRole('button', { name: 'Gestionar equipo' }).click();
  await sustituirEnGestion(page);
  await expect(page.getByText('Sustituciones restantes: 4')).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar cambios' }).click();
  await expect(page.getByText(/Los cambios se aplicarán en la próxima interrupción|Se aplicará en el minuto \d+|Tu cambio se aplicó en el minuto \d+/)).toBeVisible({ timeout: 60_000 });

  // Descanso: la reproducción se detiene hasta «Seguir».
  const seguir = page.getByRole('button', { name: 'Seguir' });
  await expect(seguir).toBeVisible({ timeout: 120_000 });
  await expect(page.locator('.marcador-2d')).toContainText('Descanso');
  await seguir.click();
  await expect(seguir).toBeHidden();

  // A 360 px se ven el campo, el marcador y los controles sin desbordar.
  await page.setViewportSize({ width: 360, height: 740 });
  for (const visible of [page.locator('.campo-2d canvas'), page.locator('.marcador-2d'), page.getByRole('button', { name: 'x4' })]) await expect(visible).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await page.setViewportSize({ width: 1280, height: 800 });

  // Final: la pantalla de resultado (sin campo) con estadísticas de pases, precisión de pase, centros y tiros.
  await expect(page.getByTestId('resultado-partido')).toBeVisible({ timeout: 180_000 });
  await expect(page.locator('.campo-2d canvas')).toHaveCount(0);
  const tabla = page.getByRole('table');
  for (const fila of ['Pases intentados', 'Pases completados', 'Precisión de pase', 'Centros', 'Tiros']) await expect(tabla).toContainText(fila);
  const marcador = (await page.getByTestId('resultado-marcador').textContent()) ?? '';
  const goles = [...marcador.matchAll(/(\d+) – (\d+)/g)].flatMap((m) => [Number(m[1]), Number(m[2])]).reduce((a, b) => a + b, 0);
  if (goles > 0) expect(await page.evaluate(() => (window as unknown as { golVisto: boolean }).golVisto)).toBe(true);
});
