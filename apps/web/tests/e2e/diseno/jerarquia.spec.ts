import { expect, test, type Locator, type Page } from '@playwright/test';
import { partidaTrasDraft } from '../ayudas';
import { LIMA } from './comprobaciones';

/** Jerarquía de las pantallas de juego (spec 004, US5; FR-018, FR-020 a FR-023; contracts/ui.md §6). */

const AMBAR = 'rgb(255, 208, 0)';
const ERROR = 'rgb(255, 122, 107)';

async function dentroDeLaVista(page: Page, l: Locator, nombre: string) {
  const r = (await l.boundingBox())!;
  const vp = page.viewportSize()!;
  expect(r.y, `${nombre}: arriba`).toBeGreaterThanOrEqual(0);
  expect(r.y, `${nombre}: empieza dentro de la vista`).toBeLessThan(vp.height);
  expect(r.x + r.width, `${nombre}: sin salirse por la derecha`).toBeLessThanOrEqual(vp.width);
}

async function insigniasSinColor(page: Page) {
  const colores = await page.locator('.insignia:not(.advertencia)').evaluateAll((xs) => xs.map((x) => getComputedStyle(x).color));
  for (const c of colores) expect([LIMA, AMBAR, ERROR]).not.toContain(c);
}

test('draft a 1366×768: cartas, temporizador y plantilla a la vista sin desplazarse', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Jugar como invitado' }).click();
  await expect(page.getByRole('heading', { name: 'Nueva partida' })).toBeVisible();
  const r = await page.request.post('/api/partidas', { data: { modo: 'liga', numParticipantes: 4 } });
  const { id } = (await r.json()) as { id: string };
  await page.request.post(`/api/partidas/${id}/iniciar`);
  await page.goto(`/partidas/${id}/draft`);
  await expect(page.getByRole('heading', { name: /Sobre 1/ })).toBeVisible({ timeout: 30_000 });
  await page.keyboard.press('Escape');
  await page.mouse.click(5, 5);
  await expect(page.locator('section[aria-label="Sobre actual"]')).toBeVisible({ timeout: 15_000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await dentroDeLaVista(page, page.locator('.rejilla-cartas'), 'cartas');
  await dentroDeLaVista(page, page.locator('.reloj'), 'temporizador');
  await dentroDeLaVista(page, page.getByRole('heading', { name: /Mi plantilla/ }), 'plantilla');
  await expect(page.locator('.eleccion-cartel')).toHaveText('Elección 1 de 24');
});

test('clasificación, eventos, franja 2D e insignias', async ({ page }) => {
  test.setTimeout(300_000);
  const id = await partidaTrasDraft(page);

  // Partido rápido hasta el resultado: cada evento con icono con nombre y texto.
  await page.goto(`/partidas/${id}/torneo`);
  await page.getByLabel('Simulación rápida').check();
  await page.getByRole('button', { name: 'Comenzar partido' }).click();
  await page.getByRole('button', { name: 'Finalizar partido' }).click();
  await expect(page.getByTestId('resultado-partido')).toBeVisible({ timeout: 60_000 });
  const eventos = page.locator('.resumen-eventos li');
  const n = await eventos.count();
  for (let i = 0; i < n; i++) {
    const e = eventos.nth(i);
    await expect(e.locator('svg[role="img"]')).toHaveAttribute('aria-label', /.+/);
    expect(((await e.locator('.evento-texto').textContent()) ?? '').trim().length).toBeGreaterThan(0);
    expect(await e.locator('.evento-minuto').evaluate((m) => [getComputedStyle(m).textAlign, getComputedStyle(m).fontVariantNumeric])).toEqual(['right', 'tabular-nums']);
  }

  // Clasificación: fila propia con luz lima tenue y barra lima de 3 px; cifras a la derecha y tabulares.
  await page.locator('[data-principal]').click();
  await expect(page.getByRole('heading', { name: 'Torneo' })).toBeVisible();
  const propia = page.locator('.clasificacion tr.fila-propia');
  await expect(propia).toHaveCount(1);
  expect(await propia.evaluate((tr) => getComputedStyle(tr).backgroundColor)).toBe('rgba(183, 255, 44, 0.12)');
  const barra = await propia.locator('> :first-child').evaluate((c) => getComputedStyle(c).boxShadow);
  expect(barra).toContain(LIMA);
  expect(barra).toContain('3px 0px 0px 0px inset');
  const celda = propia.locator('td').last();
  expect(await celda.evaluate((c) => [getComputedStyle(c).textAlign, getComputedStyle(c).fontVariantNumeric])).toEqual(['right', 'tabular-nums']);
  await insigniasSinColor(page);

  // Partido 2D: la franja no se superpone al campo.
  await page.locator('[data-principal]').filter({ hasText: 'Siguiente jornada' }).click({ timeout: 30_000 });
  await page.goto(`/partidas/${id}/torneo`);
  await page.getByLabel('Simulación 2D').check();
  await page.getByRole('button', { name: 'Comenzar partido' }).click();
  const lienzo = page.locator('.campo-2d canvas');
  await expect(lienzo).toBeVisible();
  const franja = (await page.locator('.franja-2d').boundingBox())!;
  const campo = (await lienzo.boundingBox())!;
  expect(franja.y + franja.height).toBeLessThanOrEqual(campo.y + 0.5);
  await expect(page.getByRole('group', { name: 'Velocidad de reproducción' }).getByRole('button')).toHaveCount(3);
});
