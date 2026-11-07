import { expect, test, type Page } from '@playwright/test';
import { partidaTrasDraft, type VistaTorneo } from '../ayudas';

/**
 * Ronda 5 de la spec 004 (FR-057 a FR-059). Con `CAPTURAS=<carpeta>` guarda capturas de cada pantalla para la
 * revisión visual.
 */

const capturar = async (page: Page, nombre: string) => {
  if (!process.env.CAPTURAS) return;
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${process.env.CAPTURAS}/${nombre}.png` });
};

const proporcion = (caja: { width: number; height: number } | null) => caja!.width / caja!.height;

test('FR-057 (retoques de la spec 011): dorsales plegados en una lista compacta, con aceptar y descartar en la fila', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  const partidaId = await partidaTrasDraft(page);
  await page.goto(`/partidas/${partidaId}/alineacion`);
  await page.getByRole('tab', { name: 'Personalización' }).click();
  // Plegados al final de la pestaña: no se ven hasta abrirlos.
  const plegable = page.locator('.plegable-dorsales');
  await expect(plegable).not.toHaveAttribute('open');
  await plegable.locator('summary').click();
  const filas = page.locator('.lista-dorsales li');
  await expect(filas).toHaveCount(24);

  // Una fila por jugador, todas del mismo alto y compactas; los números, alineados en columna.
  const cajas = await filas.evaluateAll((es) => es.map((e) => e.getBoundingClientRect()).map((r) => ({ alto: Math.round(r.height), x: Math.round(r.x) })));
  expect(new Set(cajas.map((c) => c.alto)).size).toBe(1);
  expect(cajas[0]!.alto).toBeLessThanOrEqual(52);
  await capturar(page, 'dorsales');

  // Sin cambio, no hay botones; al escribir, aparecen en la misma fila sin cambiar su alto.
  const fila = filas.first();
  const numero = fila.locator('.dorsal-campo');
  const original = await numero.inputValue();
  const aceptar = fila.getByRole('button', { name: /^Aceptar el dorsal/ });
  const descartar = fila.getByRole('button', { name: /^Descartar el dorsal/ });
  await expect(aceptar).toHaveCount(0);
  await numero.fill('77');
  await expect(aceptar).toBeVisible();
  await expect(descartar).toBeVisible();
  expect(Math.round((await fila.boundingBox())!.height)).toBe(cajas[0]!.alto);
  await capturar(page, 'dorsales-editando');

  // Descartar vuelve al número de antes; Escape también.
  await descartar.click();
  await expect(numero).toHaveValue(original);
  await numero.fill('78');
  await numero.press('Escape');
  await expect(numero).toHaveValue(original);
  // Intro acepta.
  await numero.fill('79');
  await numero.press('Enter');
  await expect(numero).toHaveValue('79');
  await expect(aceptar).toHaveCount(0);
});

test('FR-058: las filas de máximos goleadores y asistentes van debajo de los encabezados', async ({ page }) => {
  test.setTimeout(400_000);
  await page.setViewportSize({ width: 1366, height: 768 });
  const id = await partidaTrasDraft(page);
  // Solo hasta que haya goleadores y asistentes: con el torneo terminado, la pantalla es la del campeón.
  for (let i = 0; i < 200; i++) {
    const t = (await (await page.request.get(`/api/partidas/${id}/torneo`)).json()) as VistaTorneo & { goleadores?: unknown[]; asistentes?: unknown[] };
    if ((t.goleadores?.length ?? 0) > 0 && (t.asistentes?.length ?? 0) > 0) break;
    const abierta = t.jornadas.find((j) => j.estado === 'abierta');
    const mio = abierta?.partidos.find((p) => p.estado === 'programado');
    if (mio) await page.request.post(`/api/partidos/${mio.partidoId}/abrir`);
    else if (!abierta) await page.request.post(`/api/partidas/${id}/siguiente-jornada`);
    await page.request.post('/api/dev/reloj/avanzar', { data: { ms: 130_000 } });
    await page.waitForTimeout(150);
  }
  await page.goto(`/partidas/${id}/torneo`);
  for (const pestana of ['Máximos goleadores', 'Máximos asistentes']) {
    await page.getByRole('tab', { name: pestana }).click();
    const tabla = page.locator('table.goleadores');
    await expect(tabla).toBeVisible();
    expect(await tabla.evaluate((t) => getComputedStyle(t).display)).toBe('table');
    const cabecera = (await tabla.locator('thead tr').boundingBox())!;
    const fila = (await tabla.locator('tbody tr').first().boundingBox())!;
    expect(fila.y).toBeGreaterThanOrEqual(cabecera.y + cabecera.height - 1);
    expect(Math.abs(fila.x - cabecera.x)).toBeLessThan(2);
    await tabla.locator('tbody tr').first().scrollIntoViewIfNeeded();
    await capturar(page, pestana === 'Máximos goleadores' ? 'goleadores' : 'asistentes');
  }
});

test('FR-059: el sobre tiene las dimensiones de las cartas', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  // Portada: mismo ancho que las cartas del abanico (sin el giro, por eso con `offset*`) y la proporción del sobre
  // oficial, algo más alto que ellas (spec 007, FR-020).
  await page.goto('/');
  const sobre = page.locator('.portada-sobre');
  await expect(sobre).toBeVisible();
  const portada = await page.evaluate(() => {
    const s = document.querySelector<HTMLImageElement>('.portada-sobre')!;
    const c = document.querySelector<HTMLElement>('.portada-carta')!;
    return { sobre: { width: s.clientWidth, height: s.clientHeight }, carta: { width: c.offsetWidth, height: c.offsetHeight } };
  });
  expect(Math.abs(portada.sobre.width - portada.carta.width) / portada.carta.width).toBeLessThan(0.1);
  expect(Math.abs(proporcion(portada.sobre) - 600 / 957)).toBeLessThan(0.02);
  expect(portada.sobre.height).toBeGreaterThanOrEqual(portada.carta.height);
  await capturar(page, 'sobre-portada');

  // Apertura: el sobre cerrado tiene el ancho de las cartas que salen de él y es al menos tan alto como ellas.
  await page.getByRole('button', { name: 'Jugar como invitado' }).click();
  await page.getByRole('button', { name: 'Crear partida' }).click();
  await page.getByRole('button', { name: 'Empezar' }).click();
  const cerrado = await page.locator('.sobre-cerrado').boundingBox();
  await page.locator('.apertura-carta').first().waitFor({ state: 'visible', timeout: 20_000 });
  const carta = await page.locator('.apertura-carta').first().evaluate((c) => ({ width: (c as HTMLElement).offsetWidth, height: (c as HTMLElement).offsetHeight }));
  expect(Math.abs(cerrado!.width - carta.width)).toBeLessThan(4);
  expect(cerrado!.height).toBeGreaterThanOrEqual(carta.height - 1);
});
