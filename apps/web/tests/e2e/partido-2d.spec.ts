import { expect, test } from '@playwright/test';
import { partidaTrasDraft } from './ayudas';

/**
 * Escenario F del quickstart (Historia 3): partido 2D en directo contra un NPC con el búfer de
 * anticipación. Velocidades x2, x4 y x8 (por defecto x2 y recordada al recargar), «¡GOL!», descanso con
 * «Seguir», «Se aplicará en el minuto N» tras pedir un cambio, estadísticas finales (FR-024) y a 360 px el
 * campo, el marcador y los controles visibles sin desbordar (FR-025b).
 */
test('partido 2D en directo: velocidades, pausas anunciadas, cambio y estadísticas', async ({ page }) => {
  test.setTimeout(400_000);
  const partidaId = await partidaTrasDraft(page, { tipoSimulacion: '2d' });
  await page.goto(`/partidas/${partidaId}/alineacion`);
  await page.getByRole('button', { name: 'Comenzar partido' }).click();
  await expect(page.locator('.campo-2d canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'x2' })).toHaveAttribute('aria-pressed', 'true');

  // Se recuerda la última velocidad elegida.
  await page.getByRole('button', { name: 'x8' }).click();
  await expect(page.getByRole('button', { name: 'x8' })).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.locator('.campo-2d canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'x8' })).toHaveAttribute('aria-pressed', 'true');

  // Se apunta si se ve «¡GOL!» en algún momento (el rótulo dura 2 s reales).
  await page.evaluate(() => {
    const w = window as unknown as { golVisto: boolean };
    w.golVisto = false;
    const mirar = () => {
      if (document.querySelector('.marcador-2d')?.textContent?.includes('¡GOL!')) w.golVisto = true;
      requestAnimationFrame(mirar);
    };
    mirar();
  });

  // Un cambio con el balón en juego: el servidor confirma el minuto en que se aplica.
  await page.getByLabel('Sale').selectOption({ index: 1 });
  await page.getByLabel('Entra').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Hacer el cambio' }).click();
  await expect(page.getByText(/Se aplicará en el minuto \d+|Tu cambio se aplicó en el minuto \d+/)).toBeVisible({ timeout: 60_000 });

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

  // Final: resumen y estadísticas con pases, precisión de pase, centros y tiros.
  await expect(page.getByRole('heading', { name: 'Resumen del partido' })).toBeVisible({ timeout: 180_000 });
  const tabla = page.getByRole('table');
  for (const fila of ['Pases intentados', 'Pases completados', 'Precisión de pase', 'Centros', 'Tiros']) await expect(tabla).toContainText(fila);
  const marcador = (await page.locator('.marcador-2d span').first().textContent()) ?? '';
  const goles = [...marcador.matchAll(/(\d+) – (\d+)/g)].flatMap((m) => [Number(m[1]), Number(m[2])]).reduce((a, b) => a + b, 0);
  if (goles > 0) expect(await page.evaluate(() => (window as unknown as { golVisto: boolean }).golVisto)).toBe(true);
});
