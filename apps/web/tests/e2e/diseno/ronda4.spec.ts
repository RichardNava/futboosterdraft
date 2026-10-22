import { expect, test, type Page } from '@playwright/test';
import { jugarHastaCaer, partidaTrasDraft, sabotear } from '../ayudas';

/**
 * Ronda 4 de la spec 004 (FR-051 a FR-056). Con `CAPTURAS=<carpeta>` guarda capturas de cada pantalla para la
 * revisión visual.
 */

const capturar = async (page: Page, nombre: string) => {
  if (!process.env.CAPTURAS) return;
  // Tras las entradas con retardo de los titulares.
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${process.env.CAPTURAS}/${nombre}.png` });
};

test('FR-051: la portada sin sesión muestra los tres pasos sin desplazarse', async ({ page }) => {
  for (const [width, height] of [
    [1366, 768],
    [1280, 720],
    [1024, 768],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Gana el torneo' })).toBeVisible();
    const pasos = await page.locator('.pasos').boundingBox();
    expect(pasos!.y + pasos!.height).toBeLessThanOrEqual(height);
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
    const titular = await page.locator('.portada .cartel').boundingBox();
    expect(titular!.y).toBeGreaterThan(0);
    await capturar(page, `portada-${width}x${height}`);
  }
});

test('FR-056: la carta se elige por el hueco del pie y con doble clic se confirma', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Jugar como invitado' }).click();
  await page.getByRole('button', { name: 'Crear partida' }).click();
  await page.getByRole('button', { name: 'Empezar' }).click();
  await expect(page.getByRole('heading', { name: /Sobre 1 · Turno 1 de 8/ })).toBeVisible();
  // Sin la apertura del sobre: se deja vencer el primer turno.
  await page.request.post('/api/dev/reloj/avanzar', { data: { ms: 54_000 } });
  await expect(page.getByRole('heading', { name: /Turno 2 de 8/ })).toBeVisible();
  await page.getByRole('button', { name: 'Entendido' }).click();

  // Una carta con hueco en el pie (menos de 4 rasgos entre virtudes y defectos): pulsar al fondo de él la elige.
  const sobre = page.locator('section[aria-label="Sobre actual"]');
  const conHueco = sobre
    .locator('.carta')
    .filter({ has: page.locator('.carta-rasgos[data-total="0"], .carta-rasgos[data-total="1"], .carta-rasgos[data-total="2"], .carta-rasgos[data-total="3"]') })
    .first();
  const pie = await conHueco.locator('.carta-virtudes').boundingBox();
  await page.mouse.click(pie!.x + pie!.width / 2, pie!.y + pie!.height - 3);
  await expect(conHueco.locator('.carta-cuerpo')).toHaveAttribute('aria-pressed', 'true');
  await capturar(page, 'draft-hueco-pie');

  // Doble clic en otra carta: la elige y confirma sin el botón.
  const otra = sobre.locator('.carta').filter({ hasNot: page.locator('[aria-pressed="true"]') }).first();
  await otra.locator('.carta-cuerpo').dblclick();
  // Los NPC eligen al instante: el turno avanza en cuanto llega la elección, y solo una (la automática y esta).
  await expect(page.getByRole('heading', { name: /Turno 3 de 8/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mi plantilla (2/24)' })).toBeVisible();
});

test('FR-052 a FR-054: goleadores en la franja del 2D, goles resaltados y resultado en dos columnas', async ({ page }) => {
  test.setTimeout(400_000);
  await page.setViewportSize({ width: 1366, height: 768 });
  const id = await partidaTrasDraft(page);
  // Alineación saboteada: el rival marca casi seguro.
  await sabotear(page, id);
  await page.goto(`/partidas/${id}/torneo`);
  await page.getByLabel('Simulación 2D').check();
  await page.getByRole('button', { name: 'Comenzar partido' }).click();
  await expect(page.locator('.campo-2d canvas')).toBeVisible();
  await page.getByRole('button', { name: 'x8' }).click();

  // En cuanto se ve un gol: goleador en la franja y gol resaltado en «Lo que ha pasado».
  await expect(page.locator('.franja-2d .goleadores-2d li').first()).toBeVisible({ timeout: 300_000 });
  await expect(page.locator('.franja-2d .goleadores-2d li').first()).toContainText(/\d+'/);
  const gol = page.locator('.partido-2d-lateral .evento.evento-gol').first();
  await expect(gol).toBeVisible();
  expect(Number(await gol.locator('.evento-texto > span').first().evaluate((el) => getComputedStyle(el).fontWeight))).toBeGreaterThanOrEqual(700);
  // La franja con goleadores no rompe FR-049: sin desplazamiento.
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
  await capturar(page, '2d-goleadores');

  await page.getByRole('button', { name: 'Finalizar partido' }).click();
  await expect(page.getByTestId('resultado-partido')).toBeVisible({ timeout: 60_000 });
  const resumen = await page.getByTestId('resultado-eventos').boundingBox();
  const estadisticas = await page.getByTestId('resultado-estadisticas').boundingBox();
  expect(resumen!.x + resumen!.width).toBeLessThanOrEqual(estadisticas!.x);
  expect(Math.abs(resumen!.y - estadisticas!.y)).toBeLessThan(4);
  await capturar(page, 'resultado-1366x768');
  await page.setViewportSize({ width: 390, height: 844 });
  await capturar(page, 'resultado-390x844');
});

test.describe('con movimiento reducido', () => {
  test.use({ reducedMotion: 'reduce' });

  test('FR-055: el nombre del campeón va arriba y la barra no lo tapa', async ({ page }) => {
    test.setTimeout(600_000);
    await page.setViewportSize({ width: 1366, height: 768 });
    // En una liga pura no hay derrota: al terminar, directamente el campeón.
    const id = await partidaTrasDraft(page);
    expect((await jugarHastaCaer(page, id)).campeon).not.toBeNull();
    await page.goto(`/partidas/${id}/torneo`);
    await expect(page.getByRole('heading', { level: 1, name: 'Campeones', exact: true })).toBeVisible({ timeout: 30_000 });

    for (const [width, height] of [
      [1366, 768],
      [390, 844],
    ] as const) {
      await page.setViewportSize({ width, height });
      const mensaje = await page.getByRole('heading', { name: /campeón del torneo!$/ }).boundingBox();
      const titular = await page.getByRole('heading', { level: 1 }).boundingBox();
      const barra = await page.locator('.barra-principal').boundingBox();
      expect(mensaje!.y).toBeLessThan(titular!.y);
      expect(mensaje!.y + mensaje!.height).toBeLessThanOrEqual(barra!.y);
      await capturar(page, `campeon-${width}x${height}`);
    }
  });
});
