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

test('FR-057: dorsales alineados y aceptar o descartar bajo cada campo', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  const partidaId = await partidaTrasDraft(page);
  await page.goto(`/partidas/${partidaId}/alineacion`);
  await page.getByText('Dorsales', { exact: true }).click();
  const celdas = page.locator('.rejilla-dorsales li');
  await expect(celdas).toHaveCount(24);

  // Los campos de una misma columna comparten x y los de una misma fila comparten y, sea cual sea el nombre.
  const cajas = await page.locator('.rejilla-dorsales input').evaluateAll((es) => es.map((e) => e.getBoundingClientRect()).map((r) => ({ x: Math.round(r.x), y: Math.round(r.y) })));
  const xs = new Set(cajas.map((c) => c.x));
  const ys = new Set(cajas.map((c) => c.y));
  const columnas = Math.round(24 / ys.size);
  expect(xs.size).toBe(columnas);
  expect(ys.size * columnas).toBeGreaterThanOrEqual(24);
  await capturar(page, 'dorsales');

  // Sin cambio, los botones no se ven; al escribir, aparecen bajo el campo sin cambiar el alto de la celda.
  const celda = celdas.first();
  const alto = (await celda.boundingBox())!.height;
  const aceptar = celda.getByRole('button', { name: /^Aceptar el dorsal/ });
  const descartar = celda.getByRole('button', { name: /^Descartar el dorsal/ });
  await expect(aceptar).toBeHidden();
  await celda.locator('input').fill('77');
  await expect(aceptar).toBeVisible();
  await expect(descartar).toBeVisible();
  const campo = (await celda.locator('input').boundingBox())!;
  expect((await aceptar.boundingBox())!.y).toBeGreaterThan(campo.y + campo.height - 1);
  expect((await celda.boundingBox())!.height).toBe(alto);
  await capturar(page, 'dorsales-editando');

  // Descartar vacía el campo; Escape también.
  await descartar.click();
  await expect(celda.locator('input')).toHaveValue('');
  await celda.locator('input').fill('78');
  await celda.locator('input').press('Escape');
  await expect(celda.locator('input')).toHaveValue('');
  // Intro acepta.
  await celda.locator('input').fill('79');
  await celda.locator('input').press('Enter');
  await expect(celda.locator('.dorsal-actual')).toHaveText('79');
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
  // Portada: mismo ancho y proporción parecida a las cartas del abanico (sin el giro, por eso con `offset*`).
  await page.goto('/');
  const sobre = page.locator('.portada-sobre');
  await expect(sobre).toBeVisible();
  const portada = await page.evaluate(() => {
    const s = document.querySelector<SVGSVGElement>('.portada-sobre')!;
    const c = document.querySelector<HTMLElement>('.portada-carta')!;
    return { sobre: { width: s.clientWidth, height: s.clientHeight }, carta: { width: c.offsetWidth, height: c.offsetHeight } };
  });
  expect(Math.abs(portada.sobre.width - portada.carta.width) / portada.carta.width).toBeLessThan(0.1);
  expect(proporcion(portada.sobre)).toBeLessThan(0.6);
  await capturar(page, 'sobre-portada');

  // Apertura: el sobre cerrado mide lo mismo que las cartas que salen de él.
  await page.getByRole('button', { name: 'Jugar como invitado' }).click();
  await page.getByRole('button', { name: 'Crear partida' }).click();
  await page.getByRole('button', { name: 'Empezar' }).click();
  const cerrado = await page.locator('.sobre-cerrado').boundingBox();
  await page.locator('.apertura-carta').first().waitFor({ state: 'visible', timeout: 20_000 });
  const carta = await page.locator('.apertura-carta').first().evaluate((c) => ({ width: (c as HTMLElement).offsetWidth, height: (c as HTMLElement).offsetHeight }));
  expect(Math.abs(cerrado!.width - carta.width)).toBeLessThan(4);
  expect(Math.abs(proporcion(cerrado) - proporcion(carta))).toBeLessThan(0.05);
});
