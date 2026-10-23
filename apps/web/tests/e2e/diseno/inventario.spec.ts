import { expect, test, type Page } from '@playwright/test';
import { jugarHastaCaer, partidaTrasDraft } from '../ayudas';
import { comprobarDiseno } from './comprobaciones';

/**
 * Recorrido de diseño por el inventario de pantallas (spec 004, FR-013, FR-040; data-model §3): en cada pantalla y a
 * 360, 683, 768, 1366 y 1920 px, sin desplazamiento horizontal, sin infracciones de axe WCAG 2.1 AA, con el lima
 * reservado y el foco visible. Una partida en solitario contra NPC con el reloj simulado.
 */

const avanzar = (page: Page, ms: number) => page.request.post('/api/dev/reloj/avanzar', { data: { ms } });

test('inventario: inicio, partida, draft, formación, partido, torneo', async ({ page }) => {
  test.setTimeout(1_800_000);

  // 1. Inicio sin sesión.
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await comprobarDiseno(page, 'Inicio sin sesión');

  // 5. Nueva partida.
  await page.getByRole('button', { name: 'Jugar como invitado' }).click();
  await expect(page.getByRole('heading', { name: 'Nueva partida' })).toBeVisible();
  await comprobarDiseno(page, 'Nueva partida');

  // 3. Mis partidas, sin partidas.
  await page.goto('/mis-partidas');
  await expect(page.getByText(/Todavía no tienes partidas/)).toBeVisible();
  await comprobarDiseno(page, 'Mis partidas vacía');

  // 4. Mi perfil (invitado).
  await page.goto('/perfil');
  await expect(page.getByRole('heading', { name: 'Mi perfil' })).toBeVisible();
  await comprobarDiseno(page, 'Mi perfil');

  // 6. Sala.
  const r = await page.request.post('/api/partidas', { data: { modo: 'liga', numParticipantes: 4 } });
  const { id } = (await r.json()) as { id: string };
  await page.goto(`/partidas/${id}/sala`);
  await expect(page.getByRole('heading', { name: 'Sala' })).toBeVisible();
  await comprobarDiseno(page, 'Sala');

  // 7. Draft (con la apertura del sobre ya terminada) y «Draft terminado».
  await page.locator('[data-principal]').click();
  await expect(page.getByRole('heading', { name: /Sobre 1/ })).toBeVisible({ timeout: 30_000 });
  await page.keyboard.press('Escape');
  await expect(page.locator('section[aria-label="Sobre actual"]')).toBeVisible({ timeout: 15_000 });
  await comprobarDiseno(page, 'Draft');
  for (let i = 0; i < 60; i++) {
    const estado = ((await (await page.request.get(`/api/partidas/${id}`)).json()) as { estado: string }).estado;
    if (estado === 'en_torneo') break;
    await avanzar(page, 54_000);
    await page.waitForTimeout(50);
  }
  await expect(page.getByRole('heading', { name: 'Draft terminado' })).toBeVisible({ timeout: 30_000 });
  await comprobarDiseno(page, 'Draft terminado');

  // 2 y 3. Inicio con sesión y Mis partidas con partidas.
  await page.goto('/');
  await expect(page.locator('[data-principal]')).toHaveText('Continuar partida');
  await comprobarDiseno(page, 'Inicio con sesión');
  await page.goto('/mis-partidas');
  await expect(page.locator('.lista-partidas li')).toHaveCount(1);
  await comprobarDiseno(page, 'Mis partidas');

  // 8 y 22. Plantillas y ficha de jugador.
  await page.goto(`/partidas/${id}/plantillas`);
  await expect(page.getByRole('heading', { name: 'Plantillas' })).toBeVisible();
  await comprobarDiseno(page, 'Plantillas');
  await page.locator('.carta-ficha').first().click();
  await expect(page.getByRole('dialog', { name: 'Ficha del jugador' })).toBeVisible();
  await expect(page.locator('.ficha-carta .carta')).toBeVisible();
  await comprobarDiseno(page, 'Ficha de jugador', { pasosTab: 10 });
  await page.keyboard.press('Escape');

  // 9. Formación, con las secciones plegables abiertas.
  await page.goto(`/partidas/${id}/alineacion`);
  await expect(page.getByRole('heading', { name: 'Formación' })).toBeVisible();
  const cerrada = page.locator('details.seccion-plegable:not([open]) > summary');
  while ((await cerrada.count()) > 0) await cerrada.first().click();
  await comprobarDiseno(page, 'Formación');

  // 10, 16 y 21. Torneo con la preparación del partido.
  await page.goto(`/partidas/${id}/torneo`);
  await expect(page.locator('[data-principal]')).toHaveText('Comenzar partido');
  await comprobarDiseno(page, 'Torneo y preparación');
  for (const pestana of ['Máximos goleadores', 'Calendario']) {
    await page.getByRole('tab', { name: pestana }).click();
    await comprobarDiseno(page, `Torneo: ${pestana}`, { pasosTab: 0 });
  }

  // 11 y 13. Partido rápido: descanso (dos principales contra un NPC) y gestión del equipo.
  await page.getByLabel('Simulación rápida').check();
  await page.getByRole('button', { name: 'Comenzar partido' }).click();
  await expect(page.locator('.resultado .fase')).toHaveText('Descanso', { timeout: 60_000 });
  await comprobarDiseno(page, 'Descanso', { maxLima: 2 });
  await page.getByRole('button', { name: 'Gestionar equipo' }).click();
  await expect(page.getByTestId('gestion-equipo')).toBeVisible();
  await comprobarDiseno(page, 'Gestión del equipo');
  await page.getByRole('button', { name: 'Volver sin cambios' }).click();

  // 14. Resultado.
  await page.getByRole('button', { name: 'Finalizar partido' }).click();
  await expect(page.getByTestId('resultado-partido')).toBeVisible({ timeout: 60_000 });
  await comprobarDiseno(page, 'Resultado');
  const partidoId = /partido\/([^/?]+)/.exec(page.url())?.[1];

  // 16. Torneo al terminar la jornada.
  await page.locator('[data-principal]').click();
  await expect(page.locator('[data-principal]')).toHaveText('Siguiente jornada', { timeout: 30_000 });
  await comprobarDiseno(page, 'Fin de jornada');
  await page.locator('[data-principal]').click();

  // 15. Reproducción de un partido ya jugado.
  if (partidoId) {
    await page.goto(`/partidas/${id}/reproduccion/${partidoId}`);
    await expect(page.locator('main')).toBeVisible();
    await page.waitForLoadState('networkidle');
    await comprobarDiseno(page, 'Reproducción');
  }

  // 12 y 19. Partido 2D con la franja compacta de la barra.
  await page.goto(`/partidas/${id}/torneo`);
  await page.getByLabel('Simulación 2D').check();
  await page.getByRole('button', { name: 'Comenzar partido' }).click();
  await expect(page.locator('.campo-2d canvas')).toBeVisible();
  await expect(page.locator('.barra-navegacion.compacta')).toBeVisible();
  await comprobarDiseno(page, 'Partido 2D');
});

test('inventario: derrota y campeón', async ({ page }) => {
  test.setTimeout(600_000);
  const id = await partidaTrasDraft(page, { modo: 'playoff', numParticipantes: 4 });
  const t = await jugarHastaCaer(page, id);
  await page.goto(`/partidas/${id}/torneo`);
  if (t.miEliminacion) {
    await expect(page.getByRole('heading', { name: /ha sido derrotado/ })).toBeVisible();
    await comprobarDiseno(page, 'Derrota');
    const principal = page.locator('[data-principal]');
    const texto = (await principal.textContent()) ?? '';
    if (texto.includes('Simular')) await principal.click();
    else if (texto.includes('Ver campeón')) await principal.click();
    else await page.request.post(`/api/partidas/${id}/simular-resto`, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
    if (!texto.includes('Simular') && !texto.includes('Ver campeón')) await page.goto(`/partidas/${id}/torneo`);
  }
  await expect(page.getByRole('heading', { level: 1, name: 'Campeones', exact: true })).toBeVisible({ timeout: 60_000 });
  await comprobarDiseno(page, 'Campeón');
});

test('inventario: bandeja de avisos de un usuario registrado', async ({ page }) => {
  await page.goto('/');
  const r = await page.request.post('/api/auth/registro', { data: { email: `inventario-${Date.now()}@pruebas.test`, password: 'contraseña-segura', apodo: 'Inventario' } });
  expect(r.ok()).toBe(true);
  await page.goto('/');
  await page.getByRole('button', { name: /Avisos/ }).click();
  await expect(page.getByRole('list', { name: 'Avisos' })).toBeVisible();
  await comprobarDiseno(page, 'Bandeja de avisos', { pasosTab: 0 });
  await page.goto('/perfil');
  await expect(page.getByLabel('Nombre del equipo')).toBeVisible();
  await comprobarDiseno(page, 'Mi perfil (registrado)');
});

test.describe('con una pantalla táctil', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 360, height: 640 } });

  test('cada control visible mide al menos 44 × 44 px', async ({ page }) => {
    test.setTimeout(300_000);
    const medir = async (pantalla: string) => {
      const pequenos = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement>('button, a.boton, [role="button"], [role="tab"], select, summary, input:not([type="checkbox"]):not([type="radio"]), .enlaces-navegacion a, .opcion'))
          .filter((el) => !el.closest('.carta, [popover], .apertura-sobre') && el.getClientRects().length > 0)
          .map((el) => ({ el, r: el.getBoundingClientRect() }))
          .filter(({ r }) => r.width > 0 && (r.width < 43.5 || r.height < 43.5))
          .slice(0, 5)
          .map(({ el, r }) => `${el.tagName.toLowerCase()}.${Array.from(el.classList).join('.')} «${(el.textContent ?? '').trim().slice(0, 20)}» ${Math.round(r.width)}×${Math.round(r.height)}`),
      );
      expect(pequenos, pantalla).toEqual([]);
    };
    await page.goto('/');
    await medir('Inicio');
    await page.getByRole('button', { name: 'Jugar como invitado' }).click();
    await expect(page.getByRole('heading', { name: 'Nueva partida' })).toBeVisible();
    await medir('Nueva partida');
    const id = await (async () => {
      const r = await page.request.post('/api/partidas', { data: { modo: 'liga', numParticipantes: 4 } });
      return ((await r.json()) as { id: string }).id;
    })();
    await page.goto(`/partidas/${id}/sala`);
    await expect(page.getByRole('heading', { name: 'Sala' })).toBeVisible();
    await medir('Sala');
    await page.request.post(`/api/partidas/${id}/iniciar`);
    for (let i = 0; i < 60; i++) {
      const estado = ((await (await page.request.get(`/api/partidas/${id}`)).json()) as { estado: string }).estado;
      if (estado === 'en_torneo') break;
      await avanzar(page, 54_000);
      await page.waitForTimeout(50);
    }
    await page.goto(`/partidas/${id}/alineacion`);
    await expect(page.getByRole('heading', { name: 'Formación' })).toBeVisible();
    await medir('Formación');
    await page.goto(`/partidas/${id}/torneo`);
    await expect(page.getByRole('heading', { name: 'Torneo' })).toBeVisible();
    await medir('Torneo');
  });
});
