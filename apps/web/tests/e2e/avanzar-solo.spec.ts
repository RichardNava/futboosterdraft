import { expect, test } from '@playwright/test';

/**
 * Escenario C del quickstart (US2; SC-003, SC-004): partida de 1 humano contra NPC, del draft al final del
 * torneo, pulsando siempre el botón de avanzar. Nunca se adelanta el reloj simulado: si alguna transición
 * dependiera de un temporizador, la prueba no terminaría.
 */
test('en solitario, del draft al campeón sin esperar a ningún temporizador (escenario C)', async ({ page }) => {
  test.setTimeout(600_000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Jugar como invitado' }).click();
  await expect(page.getByRole('heading', { name: 'Nueva partida' })).toBeVisible();
  const r = await page.request.post('/api/partidas', { data: { modo: 'liga', numParticipantes: 4, tipoSimulacion: 'rapida' } });
  expect(r.status()).toBe(201);
  const { id } = (await r.json()) as { id: string };
  await page.request.post(`/api/partidas/${id}/iniciar`);

  // Draft: elige al instante en cada turno; el siguiente sobre llega al momento.
  await page.goto(`/partidas/${id}/draft`);
  const inicioDraft = Date.now();
  for (let turno = 0; turno < 24; turno++) {
    const titulo = await page.getByRole('heading', { level: 1 }).textContent();
    await page.locator('.rejilla-cartas .carta-cuerpo[role="button"]').first().click();
    await page.getByRole('button', { name: 'Confirmar elección' }).click();
    if (turno < 23) await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(titulo!, { timeout: 1000 });
  }
  await expect(page.getByRole('heading', { name: 'Draft terminado' })).toBeVisible();
  expect(Date.now() - inicioDraft).toBeLessThan(5 * 60_000); // SC-004

  // «Preparar equipo» → alineación; «Comenzar partido» empieza al instante.
  await page.getByRole('button', { name: 'Preparar equipo' }).click();
  await expect(page.getByRole('heading', { name: 'Alineación' })).toBeVisible();

  for (let jornada = 1; jornada <= 6; jornada++) {
    await page.getByRole('button', { name: 'Comenzar partido' }).click();
    await expect(page).toHaveURL(/\/partido\//, { timeout: 1000 });
    // Descanso: «Seguir» reanuda al instante.
    await page.getByRole('button', { name: 'Seguir' }).click();
    await expect(page.getByRole('heading', { name: 'Resumen del partido' })).toBeVisible({ timeout: 3000 });
    // «Siguiente» lleva al torneo.
    await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Torneo' })).toBeVisible({ timeout: 1000 });
    if (jornada < 6) {
      await page.getByRole('button', { name: 'Siguiente jornada' }).click();
      await expect(page.getByRole('button', { name: 'Comenzar partido' })).toBeVisible({ timeout: 1000 });
    }
  }

  // Al final del torneo, «Volver al menú».
  await expect(page.getByText(/Campeón:/)).toBeVisible();
  await page.getByRole('button', { name: 'Volver al menú' }).click();
  await expect(page).toHaveURL(/\/$/);
});
