import { expect, test, type Locator, type Page } from '@playwright/test';
import { LIMA } from './comprobaciones';

/**
 * Flujo completo solo con teclado (spec 004, SC-007, FR-030): crear partida → draft → formación → partido → torneo,
 * con Tab, Mayús+Tab, Intro, Espacio y flechas, y el foco visible (contorno lima de ≥ 2 px) en cada paso. El reloj
 * simulado del servidor solo se usa para no esperar los turnos del draft.
 */

async function focoVisible(page: Page, donde: string) {
  const foco = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;
    const e = getComputedStyle(el);
    return { quien: `${el.tagName.toLowerCase()} «${(el.textContent ?? '').trim().slice(0, 30)}»`, ancho: parseFloat(e.outlineWidth), estilo: e.outlineStyle, color: e.outlineColor };
  });
  if (!foco) return;
  expect(foco.estilo, `${donde}: ${foco.quien} sin contorno de foco`).not.toBe('none');
  expect(foco.ancho, `${donde}: ${foco.quien}`).toBeGreaterThanOrEqual(2);
  expect(foco.color, `${donde}: ${foco.quien}`).toBe(LIMA);
}

/** Pulsa Tab hasta que el foco llega a `objetivo`, comprobando el foco visible en cada paso. */
async function tabHasta(page: Page, objetivo: Locator, donde: string, max = 120) {
  for (let i = 0; i < max; i++) {
    if (await objetivo.evaluate((el) => el === document.activeElement).catch(() => false)) return;
    await page.keyboard.press('Tab');
    await focoVisible(page, donde);
  }
  throw new Error(`${donde}: no se llega con Tab`);
}

test('crear partida → draft → formación → partido → torneo, solo con el teclado', async ({ page }) => {
  test.setTimeout(400_000);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/');

  // Inicio: entrar como invitado.
  await tabHasta(page, page.getByRole('button', { name: 'Jugar como invitado' }), 'inicio');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Nueva partida' })).toBeVisible();

  // Nueva partida: liga de 4 por defecto; «Crear partida».
  await tabHasta(page, page.getByRole('button', { name: 'Crear partida' }), 'nueva partida');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Sala' })).toBeVisible();

  // Sala: «Empezar».
  await tabHasta(page, page.locator('[data-principal]'), 'sala');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: /Sobre 1/ })).toBeVisible({ timeout: 30_000 });

  // Draft: la apertura se salta con Escape; la carta se elige con Intro y se confirma.
  await page.keyboard.press('Escape');
  const carta = page.locator('section[aria-label="Sobre actual"] .carta-cuerpo[role="button"]').first();
  await expect(carta).toBeVisible({ timeout: 15_000 });
  await tabHasta(page, carta, 'draft');
  await page.keyboard.press('Enter');
  await expect(carta).toHaveAttribute('aria-pressed', 'true');
  await tabHasta(page, page.getByRole('button', { name: 'Confirmar elección' }), 'draft');
  await page.keyboard.press('Enter');
  // Contra NPC el turno pasa en cuanto se confirma.
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(/Sobre 1 · Turno 1 de 8/);

  // El resto de turnos, por tiempo.
  const partidaId = /\/partidas\/([^/]+)\//.exec(page.url())![1]!;
  for (let i = 0; i < 60; i++) {
    const estado = ((await (await page.request.get(`/api/partidas/${partidaId}`)).json()) as { estado: string }).estado;
    if (estado === 'en_torneo') break;
    await page.request.post('/api/dev/reloj/avanzar', { data: { ms: 54_000 } });
    await page.waitForTimeout(50);
  }
  const preparar = page.locator('[data-principal]').filter({ hasText: 'Preparar equipo' });
  await expect(preparar).toBeVisible({ timeout: 30_000 });
  await tabHasta(page, preparar, 'fin del draft');
  await page.keyboard.press('Enter');

  // Formación: un intercambio con Intro sobre dos fichas y «Confirmar alineación».
  await expect(page.getByRole('heading', { name: 'Formación' })).toBeVisible();
  const delantero = page.locator('.ficha-equipo[data-casilla="DC"]');
  await tabHasta(page, delantero, 'formación');
  await page.keyboard.press('Enter');
  await expect(delantero).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Escape');
  await tabHasta(page, page.locator('[data-principal]'), 'formación');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Torneo' })).toBeVisible();

  // Torneo: simulación rápida con Espacio y «Comenzar partido».
  const rapida = page.getByLabel('Simulación rápida');
  await tabHasta(page, page.getByRole('radio', { checked: true }), 'preparación');
  for (let i = 0; i < 2 && !(await rapida.isChecked()); i++) await page.keyboard.press('ArrowDown');
  await expect(rapida).toBeChecked();
  await focoVisible(page, 'modo del partido');
  await tabHasta(page, page.locator('[data-principal]'), 'preparación');
  await page.keyboard.press('Enter');

  // Partido: «Finalizar partido» y «Siguiente».
  const finalizar = page.getByRole('button', { name: 'Finalizar partido' });
  await expect(finalizar).toBeVisible({ timeout: 30_000 });
  await tabHasta(page, finalizar, 'partido');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('resultado-partido')).toBeVisible({ timeout: 60_000 });
  await tabHasta(page, page.locator('[data-principal]'), 'resultado');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Torneo' })).toBeVisible();

  // Torneo: las pestañas con flechas.
  const pestana = page.getByRole('tab', { selected: true });
  await tabHasta(page, pestana, 'torneo');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Máximos goleadores' })).toHaveAttribute('aria-selected', 'true');
  await focoVisible(page, 'pestañas');
  await page.keyboard.press('Shift+Tab');
  await focoVisible(page, 'torneo');
});
