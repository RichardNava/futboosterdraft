import { expect, test } from '@playwright/test';
import { jugarHastaCaer, partidaTrasDraft, vistaTorneo as vista, type VistaTorneo as Vista } from './ayudas';

/** Escenario J del quickstart (spec 003, US10; FR-039 a FR-041b): derrota, campeón y «Simular resto del torneo». */

const miEquipo = (t: Vista, id: string | null) =>
  t.jornadas.flatMap((j) => j.partidos.flatMap((p) => [p.local, p.visitante])).find((r) => r?.id === id)?.nombre ?? '';

test('playoff de 8: al caer, pantalla de derrota que sigue al volver; «Simular resto» lleva al campeón', async ({ page }) => {
  test.setTimeout(400_000);
  const id = await partidaTrasDraft(page, { modo: 'playoff', numParticipantes: 8 });
  const t = await jugarHastaCaer(page, id);
  expect(t.miEliminacion, 'el equipo saboteado debería caer').not.toBeNull();
  const yo = ((await (await page.request.get(`/api/partidas/${id}`)).json()) as { miParticipanteId: string }).miParticipanteId;
  const equipo = miEquipo(t, yo);

  await page.goto(`/partidas/${id}/torneo`);
  await expect(page.getByRole('heading', { name: `${equipo} ha sido derrotado en ${t.miEliminacion!.etiqueta}` })).toBeVisible();
  // Un único botón principal (FR-007, ampliación de boton-principal.spec).
  await expect(page.locator('[data-principal]')).toHaveCount(1);

  if (t.campeon) {
    // Perdió la final: «Ver campeón» lleva a la pantalla del campeón.
    await expect(page.locator('[data-principal]')).toHaveText('Ver campeón');
    await page.locator('[data-principal]').click();
    await expect(page.getByRole('heading', { name: `¡${t.campeon.nombre}, campeón del torneo!` })).toBeVisible();
    await expect(page.locator('[data-principal]')).toHaveText('Volver al menú');
    return;
  }

  // Sin humanos en competición: «Simular resto del torneo» con «Volver al menú» de secundario.
  await expect(page.locator('[data-principal]')).toHaveText('Simular resto del torneo');
  await page.getByRole('button', { name: 'Volver al menú' }).click();
  await expect(page).toHaveURL(/\/$/);
  // Al volver desde «Mis partidas», la misma pantalla (no se ha simulado nada).
  await page.goto(`/partidas/${id}/torneo`);
  await expect(page.getByRole('heading', { name: new RegExp(`ha sido derrotado en ${t.miEliminacion!.etiqueta}`) })).toBeVisible();
  expect((await vista(page, id)).campeon).toBeNull();

  await page.locator('[data-principal]').click();
  const fin = await (async () => {
    await expect.poll(async () => (await vista(page, id)).campeon?.nombre ?? null, { timeout: 15_000 }).not.toBeNull();
    return vista(page, id);
  })();
  await expect(page.getByRole('heading', { name: `¡${fin.campeon!.nombre}, campeón del torneo!` })).toBeVisible();
  await expect(page.locator('[data-principal]')).toHaveCount(1);
  await expect(page.locator('[data-principal]')).toHaveText('Volver al menú');
  await page.locator('[data-principal]').click();
  await expect(page).toHaveURL(/\/$/);
});

test('en una liga pura no hay pantalla de derrota', async ({ page }) => {
  test.setTimeout(300_000);
  const id = await partidaTrasDraft(page);
  const t = await jugarHastaCaer(page, id);
  expect(t.miEliminacion).toBeNull();
  expect(t.campeon).not.toBeNull();
  await page.goto(`/partidas/${id}/torneo`);
  await expect(page.getByText(/ha sido derrotado/)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: `¡${t.campeon!.nombre}, campeón del torneo!` })).toBeVisible();
});
