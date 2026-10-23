import { expect, test, type Page } from '@playwright/test';

/**
 * Modo Duelo de jugadores (spec 005, T062; FR-060 a FR-069; quickstart, recorrido D).
 */

async function crearYDraftear(page: Page): Promise<string> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Jugar como invitado' }).click();
  await expect(page.getByRole('heading', { name: 'Nueva partida' })).toBeVisible();
  // 1. Crear un torneo «Duelo de jugadores» de 4, con su icono.
  const opcion = page.getByRole('radio', { name: /Duelo de jugadores/ });
  await expect(page.locator('label', { has: opcion }).locator('svg')).toHaveCount(1);
  await opcion.check();
  await page.getByRole('button', { name: 'Crear partida' }).click();

  // 2. En la sala: 4-3-3 y Estado de forma activados, editables por el anfitrión.
  await expect(page.getByRole('heading', { name: 'Sala' })).toBeVisible();
  const config = page.getByRole('region', { name: 'Duelo de jugadores' });
  await expect(config.getByRole('combobox', { name: 'Formación' })).toHaveValue('4-3-3');
  await expect(config.getByRole('switch', { name: 'Estado de forma' })).toBeChecked();
  await config.getByRole('combobox', { name: 'Formación' }).selectOption('4-4-2');
  await expect(config.getByRole('combobox', { name: 'Formación' })).toHaveValue('4-4-2');
  await config.getByRole('switch', { name: 'Estado de forma' }).uncheck();
  await expect(config.getByRole('switch', { name: 'Estado de forma' })).not.toBeChecked();
  await config.getByRole('combobox', { name: 'Formación' }).selectOption('4-3-3');
  await config.getByRole('switch', { name: 'Estado de forma' }).check();
  const id = page.url().match(/partidas\/([^/]+)\/sala/)![1]!;
  await page.getByRole('button', { name: 'Empezar' }).click();

  // 3. Draft completo adelantando el reloj simulado.
  for (let i = 0; i < 60; i++) {
    const estado = ((await (await page.request.get(`/api/partidas/${id}`)).json()) as { estado: string }).estado;
    if (estado === 'en_torneo') return id;
    await page.request.post('/api/dev/reloj/avanzar', { data: { ms: 54_000 } });
    await page.waitForTimeout(50);
  }
  throw new Error('El draft no terminó');
}

test('torneo de duelos de 4: once bloqueado, duelos animados, salto al resultado y avance del cuadro', async ({ page }) => {
  const id = await crearYDraftear(page);

  // 4. Formación: sin táctica, dorsales, equipación ni banquillo.
  await page.goto(`/partidas/${id}/alineacion`);
  await expect(page.getByText(/la elige el anfitrión para todos/)).toBeVisible();
  await expect(page.getByTestId('banquillo')).toHaveCount(0);
  for (const seccion of ['Táctica', 'Lanzadores', 'Dorsales', 'Equipaciones']) await expect(page.locator('summary', { hasText: seccion })).toHaveCount(0);

  // 5. Confirmar el once con su diálogo: queda de solo lectura.
  await page.getByRole('button', { name: 'Confirmar once' }).click();
  await expect(page.getByRole('alertdialog')).toContainText('Este será tu once para todo el torneo. No podrás cambiarlo.');
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(page).toHaveURL(/\/torneo$/);
  await page.goto(`/partidas/${id}/alineacion`);
  await expect(page.getByText('Once confirmado', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirmar once' })).toHaveCount(0);

  // 6. Antes de ver sus duelos, el cuadro no revela quién pasa: ni ganador en su cruce ni su nombre en la final.
  const antes = (await (await page.request.get(`/api/partidas/${id}/torneo`)).json()) as {
    pendientesDeVer: string[];
    cuadro: { rondas: { cruces: { local: { id: string } | null; visitante: { id: string } | null; ganador: { id: string } | null }[] }[] };
  };
  expect(antes.pendientesDeVer.length).toBeGreaterThan(0);
  const [semis, final] = antes.cuadro.rondas;
  const propio = semis!.cruces.find((x) => x.ganador === null)!;
  expect(propio).toBeDefined();
  const delCruce = [propio.local?.id, propio.visitante?.id];
  expect([final!.cruces[0]!.local?.id, final!.cruces[0]!.visitante?.id].some((pid) => pid && delCruce.includes(pid))).toBe(false);
  expect(final!.cruces[0]!.ganador).toBeNull();

  // 7. «Ver duelos» muestra la animación; «Saltar al resultado» lleva al resumen; el cuadro avanza.
  await page.goto(`/partidas/${id}/torneo`);
  await page.getByRole('button', { name: 'Ver duelos' }).first().click();
  await expect(page.locator('.duelos-marcador')).toBeVisible();
  await expect(page.locator('.duelo-escenario .carta')).toHaveCount(2);
  await expect(page.getByRole('button', { name: '×2' })).toBeVisible();
  await page.getByRole('button', { name: 'Saltar al resultado' }).click();
  await expect(page.getByRole('region', { name: 'Resumen de los duelos' }).locator('tbody tr')).toHaveCount(11);
  await page.getByRole('button', { name: 'Volver al torneo' }).click();
  // Si el equipo perdió la semifinal, el torneo abre con la pantalla de la derrota; el cuadro se comprueba en la API.
  const eliminados = page.getByRole('heading', { name: 'Eliminados' });
  await expect(page.getByRole('heading', { name: 'Torneo' }).or(eliminados)).toBeVisible();
  if (await eliminados.isVisible()) {
    const torneo = (await (await page.request.get(`/api/partidas/${id}/torneo`)).json()) as {
      jornadas: { partidos: { tipo: string; marcador: unknown }[] }[];
    };
    expect(torneo.jornadas.flatMap((j) => j.partidos).some((p) => p.tipo === 'duelos' && p.marcador !== null)).toBe(true);
    return;
  }
  await page.getByRole('tab', { name: 'Calendario' }).click();
  await expect(page.locator('.resultado-partido', { hasText: /Duelos \d+–\d+/ }).first()).toBeVisible();
});

test('con movimiento reducido, los duelos solo usan fundidos', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const id = await crearYDraftear(page);
  await page.goto(`/partidas/${id}/alineacion`);
  await page.getByRole('button', { name: 'Confirmar once' }).click();
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await page.goto(`/partidas/${id}/torneo`);
  await page.getByRole('button', { name: 'Ver duelos' }).first().click();
  const lado = page.locator('.duelo-lado').first();
  await expect(lado).toBeVisible();
  // Sin desplazamientos ni escalas: la transformación es siempre la identidad.
  for (let i = 0; i < 5; i++) {
    expect(await lado.evaluate((el) => getComputedStyle(el).transform)).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
    await page.waitForTimeout(120);
  }
});
