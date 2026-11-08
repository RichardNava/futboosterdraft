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

/**
 * Spec 012 (US2, SC-004 y FR-019): el lienzo mide lo mismo durante todo el partido (a 1440 px en la primera parte y
 * a 1024 px tras el descanso) y los iconos de tarjeta de «Lo que ha pasado» se pintan con su token.
 */
test('partido 2D: campo de tamaño constante y tarjetas con su color', async ({ page }) => {
  test.setTimeout(400_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const partidaId = await partidaTrasDraft(page);
  await page.goto(`/partidas/${partidaId}/torneo`);
  await page.getByLabel('Simulación 2D').check();
  await page.getByRole('button', { name: 'Comenzar partido' }).click();
  await expect(page.locator('.campo-2d canvas')).toBeVisible();
  await page.getByRole('button', { name: 'x8' }).click();

  // Cada fotograma apunta el tamaño del lienzo por ancho de ventana.
  await page.evaluate(() => {
    const w = window as unknown as { medidas: Record<number, string[]> };
    w.medidas = {};
    const medir = () => {
      const c = document.querySelector('.campo-2d canvas');
      if (c) {
        const r = c.getBoundingClientRect();
        const clave = `${r.x},${r.y},${r.width},${r.height}`;
        const lista = (w.medidas[window.innerWidth] ??= []);
        if (!lista.includes(clave)) lista.push(clave);
      }
      requestAnimationFrame(medir);
    };
    medir();
  });

  // Colores de tarjeta: el icono toma el valor del token.
  const colores = await page.evaluate(() => {
    const raiz = getComputedStyle(document.documentElement);
    const muestra = (clase: string) => {
      const el = document.createElement('span');
      el.className = `icono ${clase}`;
      document.querySelector('.partido-2d-lateral')!.append(el);
      const color = getComputedStyle(el).color;
      el.remove();
      return color;
    };
    const resolver = (token: string) => {
      const el = document.createElement('span');
      el.style.color = raiz.getPropertyValue(token).trim();
      document.body.append(el);
      const color = getComputedStyle(el).color;
      el.remove();
      return color;
    };
    return {
      amarilla: [muestra('icono-amarilla'), resolver('--color-tarjeta-amarilla')],
      roja: [muestra('icono-roja'), resolver('--color-tarjeta-roja')],
    };
  });
  expect(colores.amarilla[0]).toBe(colores.amarilla[1]);
  expect(colores.roja[0]).toBe(colores.roja[1]);

  const seguir = page.getByRole('button', { name: 'Seguir' });
  await expect(seguir).toBeVisible({ timeout: 200_000 });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(500);
  await seguir.click();

  await expect(page.getByTestId('resultado-partido')).toBeVisible({ timeout: 300_000 });
  const medidas = await page.evaluate(() => (window as unknown as { medidas: Record<number, string[]> }).medidas);
  expect(medidas[1440]).toHaveLength(1);
  expect(medidas[1024]).toHaveLength(1);
});
