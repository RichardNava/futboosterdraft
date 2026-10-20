import { expect, test, type Page } from '@playwright/test';
import { arrastrarSobre } from './ayudas';

/**
 * Escenario D del quickstart de la spec 003 (US4; FR-006, FR-007; SC-013): en cada pantalla del flujo hay un único
 * botón principal, dentro del viewport antes y después de desplazarse hasta el final, y es el botón más grande.
 */

/** `cuantos`: 1, salvo en el descanso contra un NPC, con dos de la misma importancia (FR-006a). */
async function comprobarPrincipal(page: Page, pantalla: string, cuantos = 1) {
  const principales = page.locator('[data-principal]');
  await expect(principales, pantalla).toHaveCount(cuantos);
  const principal = principales.last();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(principal, `${pantalla}: arriba`).toBeInViewport();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(principal, `${pantalla}: abajo`).toBeInViewport();
  const areas = await principales.evaluateAll((bs) => bs.map((b) => b.getBoundingClientRect().width * b.getBoundingClientRect().height));
  const area = Math.min(...areas);
  const otros = await page.locator('button:visible, a.boton:visible').evaluateAll((bs) =>
    bs.filter((b) => !b.hasAttribute('data-principal')).map((b) => b.getBoundingClientRect().width * b.getBoundingClientRect().height),
  );
  expect(Math.max(0, ...otros), `${pantalla}: el principal es el botón más grande`).toBeLessThanOrEqual(area);
}

async function avanzarReloj(page: Page, partidaId: string) {
  for (let i = 0; i < 60; i++) {
    const estado = ((await (await page.request.get(`/api/partidas/${partidaId}`)).json()) as { estado: string }).estado;
    if (estado === 'en_torneo') return;
    await page.request.post('/api/dev/reloj/avanzar', { data: { ms: 54_000 } });
    await page.waitForTimeout(50);
  }
}

for (const vp of [
  { width: 1366, height: 768 },
  { width: 360, height: 640 },
]) {
  test(`botón principal visible y único a ${vp.width}×${vp.height}`, async ({ page }) => {
    test.setTimeout(400_000);
    await page.setViewportSize(vp);
    await page.goto('/');
    await page.getByRole('button', { name: 'Jugar como invitado' }).click();
    await expect(page.getByRole('heading', { name: 'Nueva partida' })).toBeVisible();
    const r = await page.request.post('/api/partidas', { data: { modo: 'liga', numParticipantes: 4 } });
    const { id: partidaId } = (await r.json()) as { id: string };

    // Sala: «Empezar» del anfitrión.
    await page.goto(`/partidas/${partidaId}/sala`);
    await comprobarPrincipal(page, 'sala');
    await expect(page.locator('[data-principal]')).toHaveText('Empezar');
    await page.locator('[data-principal]').click();

    // Draft: «Confirmar elección» (desactivado con su motivo hasta elegir una carta).
    await expect(page.getByRole('heading', { name: /Sobre 1/ })).toBeVisible({ timeout: 30_000 });
    await page.keyboard.press('Escape');
    await page.mouse.click(5, 5);
    await comprobarPrincipal(page, 'draft');
    await expect(page.locator('[data-principal]')).toHaveAttribute('aria-disabled', 'true');

    // Fin del draft, visto en directo: «Preparar equipo».
    await avanzarReloj(page, partidaId);
    await expect(page.locator('[data-principal]')).toHaveText('Preparar equipo', { timeout: 30_000 });
    await comprobarPrincipal(page, 'fin del draft');

    // «Formación»: siempre «Confirmar alineación» (FR-003b); con una alineación inválida, desactivado y con el motivo.
    await page.goto(`/partidas/${partidaId}/alineacion`);
    await expect(page.locator('[data-principal]')).toHaveText('Confirmar alineación');
    await expect(page.getByLabel('Simulación rápida')).toHaveCount(0);
    await comprobarPrincipal(page, 'formación');
    const por = page.locator('.ficha-equipo[data-casilla="POR"]');
    await por.scrollIntoViewIfNeeded();
    await arrastrarSobre(page, por, page.locator('.ficha-equipo[data-casilla="DC"]'));
    const principal = page.locator('[data-principal]');
    await expect(principal).toHaveText('Confirmar alineación');
    if ((await principal.getAttribute('aria-disabled')) === 'true') {
      const motivo = await principal.getAttribute('aria-describedby');
      await expect(page.locator(`[id="${motivo}"]`)).not.toBeEmpty();
    }
    // Preparación en el torneo: «Comenzar partido».
    await page.goto(`/partidas/${partidaId}/torneo`);
    await expect(page.locator('[data-principal]')).toHaveText('Comenzar partido');
    await comprobarPrincipal(page, 'preparación');

    // Partido rápido: «Finalizar partido» en juego y «Gestionar equipo» en el descanso; la gestión y el resultado.
    await page.getByLabel('Simulación rápida').check();
    await page.getByRole('button', { name: 'Comenzar partido' }).click();
    await expect(page.locator('.resultado .fase')).toHaveText('Descanso');
    // Descanso contra un NPC: «Gestionar equipo» y «Seguir» con la misma importancia, «Seguir» a la derecha (FR-006a).
    await expect(page.locator('[data-principal]')).toHaveText(['Gestionar equipo', 'Seguir']);
    await comprobarPrincipal(page, 'descanso', 2);
    const [gestionar, seguir] = await page.locator('[data-principal]').evaluateAll((bs) => bs.map((b) => b.getBoundingClientRect()));
    expect(seguir!.x).toBeGreaterThan(gestionar!.x);
    expect(Math.abs(seguir!.height - gestionar!.height)).toBeLessThanOrEqual(1);
    await page.getByRole('button', { name: 'Gestionar equipo' }).click();
    await expect(page.locator('[data-principal]')).toHaveText('Confirmar cambios');
    await comprobarPrincipal(page, 'gestión del equipo');
    await page.getByRole('button', { name: 'Volver sin cambios' }).click();
    await page.getByRole('button', { name: 'Finalizar partido' }).click();
    await expect(page.getByTestId('resultado-partido')).toBeVisible();
    await expect(page.locator('[data-principal]')).toHaveText('Siguiente');
    await comprobarPrincipal(page, 'resultado');

    // Torneo, al terminar la jornada: «Siguiente jornada».
    await page.locator('[data-principal]').click();
    await expect(page.getByRole('heading', { name: 'Torneo' })).toBeVisible();
    await expect(page.locator('[data-principal]')).toHaveText('Siguiente jornada', { timeout: 30_000 });
    await comprobarPrincipal(page, 'fin de jornada');
    await page.locator('[data-principal]').click();

    // Partido 2D en juego: «Finalizar partido».
    await page.goto(`/partidas/${partidaId}/torneo`);
    await page.getByLabel('Simulación 2D').check();
    await page.getByRole('button', { name: 'Comenzar partido' }).click();
    await expect(page.locator('.campo-2d canvas')).toBeVisible();
    await expect(page.locator('[data-principal]')).toHaveText('Finalizar partido');
    await comprobarPrincipal(page, 'partido 2D');
  });
}
