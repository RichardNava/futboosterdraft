import { expect, test, type Page } from '@playwright/test';
import { jugarHastaCaer, partidaTrasDraft, vistaTorneo } from '../ayudas';

/** Portada, inicio con sesión, marcadores de cartel y finales (spec 004, US3; contracts/ui.md §3 a §5). */

const ENTRADILLA = 'Abre sobres, elige a tus jugadores por turnos y gana el torneo con tu once.';

for (const vp of [
  { width: 1366, height: 768 },
  { width: 360, height: 640 },
]) {
  test(`sin sesión, a ${vp.width}×${vp.height}: cartel, entradilla y «Empezar a jugar» sin desplazarse`, async ({ page }) => {
    await page.setViewportSize(vp);
    await page.goto('/');
    const titular = page.getByRole('heading', { level: 1, name: 'Fútboosterdraft' });
    await expect(titular).toBeInViewport({ ratio: 1 });
    expect(await titular.evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/^"?Barlow Condensed/);
    await expect(page.getByText(ENTRADILLA)).toBeInViewport({ ratio: 1 });
    const principal = page.locator('[data-principal]');
    await expect(principal).toHaveText('Empezar a jugar');
    await expect(principal).toBeInViewport({ ratio: 1 });
    // A 360 px, el titular ocupa como mucho dos líneas (FR-006).
    const lineas = await titular.evaluate((el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)));
    expect(lineas).toBeLessThanOrEqual(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    // «Empezar a jugar» abre el formulario de registro.
    await principal.click();
    await expect(page.getByRole('heading', { name: 'Crear cuenta' })).toBeVisible();
  });
}

test('con sesión: «Nueva partida» sin partidas y «Continuar partida» con una en curso', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Jugar como invitado' }).click();
  await expect(page.getByRole('heading', { name: 'Nueva partida' })).toBeVisible();
  await page.goto('/');
  await expect(page.locator('[data-principal]')).toHaveText('Nueva partida');
  await expect(page.getByRole('link', { name: 'Mis partidas' }).last()).toHaveClass(/secundario/);

  const r = await page.request.post('/api/partidas', { data: { modo: 'liga', numParticipantes: 4 } });
  const { id } = (await r.json()) as { id: string };
  await page.request.post(`/api/partidas/${id}/iniciar`);
  await page.goto('/');
  const principal = page.locator('[data-principal]');
  await expect(principal).toHaveText('Continuar partida');
  await principal.click();
  await expect(page).toHaveURL(new RegExp(`/partidas/${id}/(draft|sala)`));
});

test('una equipación negra lleva contorno en la vista previa de «Mi perfil»', async ({ page }) => {
  await page.goto('/');
  const r = await page.request.post('/api/auth/registro', { data: { email: `negra-${Date.now()}@pruebas.test`, password: 'contraseña-segura', apodo: 'Negra' } });
  expect(r.ok()).toBe(true);
  const negra = { primera: { diseno: 'lisa', colores: ['#000000'] }, segunda: { diseno: 'lisa', colores: ['#ffffff'] } };
  const perfil = await page.request.put('/api/perfil', { data: { nombreEquipo: 'Los Negros', equipaciones: negra } });
  expect(perfil.ok()).toBe(true);
  await page.goto('/perfil');
  await expect(page.locator('fieldset[data-equipacion="primera"] svg.camiseta')).toHaveClass(/con-contorno/);
  await expect(page.locator('fieldset[data-equipacion="segunda"] svg.camiseta')).not.toHaveClass(/con-contorno/);
});

async function marcadorDeCartel(page: Page) {
  const goles = page.getByTestId('resultado-marcador');
  await expect(goles).toBeVisible();
  const estilo = await goles.evaluate((el) => ({ familia: getComputedStyle(el).fontFamily, cifras: getComputedStyle(el).fontVariantNumeric }));
  expect(estilo.familia).toMatch(/^"?Barlow Condensed/);
  expect(estilo.cifras).toContain('tabular-nums');
  await expect(page.locator('.marcador .chapa')).toHaveCount(2);
  // Las chapas que se confunden con el lienzo llevan contorno (FR-034).
  const chapas = await page.locator('.marcador .chapa').evaluateAll((cs) =>
    cs.map((c) => ({ fondo: getComputedStyle(c).backgroundColor, contorno: c.classList.contains('con-contorno') })),
  );
  for (const c of chapas) {
    const [r, g, b] = (c.fondo.match(/\d+/g) ?? []).map(Number) as [number, number, number];
    if (r + g + b < 90) expect(c.contorno, `chapa ${c.fondo}`).toBe(true);
  }
}

test.describe('con movimiento reducido', () => {
  test.use({ reducedMotion: 'reduce' });

  test('marcador de cartel en el resultado y «Campeones» como titular protagonista sin animación', async ({ page }) => {
    test.setTimeout(600_000);
    const id = await partidaTrasDraft(page, { modo: 'playoff', numParticipantes: 4 });
    // Equipación negra: el marcador del resultado la muestra con contorno.
    await page.request.put(`/api/partidas/${id}/equipaciones`, { data: { primera: { diseno: 'lisa', colores: ['#000000'] }, segunda: { diseno: 'lisa', colores: ['#ffffff'] } } });
    await page.goto(`/partidas/${id}/torneo`);
    await page.getByLabel('Simulación rápida').check();
    await page.getByRole('button', { name: 'Comenzar partido' }).click();
    await page.getByRole('button', { name: 'Finalizar partido' }).click();
    await expect(page.getByTestId('resultado-partido')).toBeVisible({ timeout: 60_000 });
    await marcadorDeCartel(page);

    // Hasta el final del torneo y la pantalla del campeón.
    const t = await jugarHastaCaer(page, id);
    if (!t.campeon) await page.request.post(`/api/partidas/${id}/simular-resto`, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
    expect((await vistaTorneo(page, id)).campeon).not.toBeNull();
    await page.goto(`/partidas/${id}/torneo`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Si se perdió la final, primero la derrota y, con «Ver campeón», el campeón.
    if ((await page.getByRole('heading', { level: 1 }).textContent()) === 'Subcampeones') await page.locator('[data-principal]').click();
    const titular = page.getByRole('heading', { level: 1, name: 'Campeones', exact: true });
    await expect(titular).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('heading', { name: /campeón del torneo/ })).toBeVisible();
    // El titular es el texto más grande de la pantalla.
    const mayor = await page.evaluate(() =>
      Math.max(...Array.from(document.querySelectorAll<HTMLElement>('main *')).filter((el) => el.childElementCount === 0 && el.textContent?.trim()).map((el) => parseFloat(getComputedStyle(el).fontSize))),
    );
    expect(await titular.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(mayor);
    // Con movimiento reducido, sin animación.
    const duracion = await titular.evaluate((el) => parseFloat(getComputedStyle(el).animationDuration) * 1000);
    expect(duracion).toBeLessThanOrEqual(1);
  });
});
