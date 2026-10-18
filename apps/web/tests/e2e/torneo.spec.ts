import { expect, test } from '@playwright/test';
import { partidaTrasDraft } from './ayudas';

interface Torneo {
  campeon: { id: string; nombre: string } | null;
  jornadaActual: number | null;
  clasificacion: { nombre: string; pj: number }[];
  jornadas: { estado: string; partidos: { partidoId: string | null; estado: string }[] }[];
}

/** Escenario E del quickstart (lo que no depende del correo): liga de 4 de un humano hasta el campeón. */
test('torneo: clasificación, calendario, bajas y campeón', async ({ page }) => {
  test.setTimeout(300_000);
  const partidaId = await partidaTrasDraft(page);
  await page.goto(`/partidas/${partidaId}/torneo`);
  await expect(page.getByRole('heading', { name: 'Torneo' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Jornada 1' })).toBeVisible();
  await expect(page.getByText('Tu partido:')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Clasificación' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.clasificacion tbody tr')).toHaveCount(4);

  // Se juega el torneo como el único humano (spec 002, research R9): abre su partido, deja que venza el
  // descanso sin «Seguir» adelantando el reloj, y pide la siguiente jornada al cerrarse cada una.
  await page.goto('/');
  let bajasVistas = false;
  let torneo: Torneo | null = null;
  for (let i = 0; i < 400; i++) {
    torneo = (await (await page.request.get(`/api/partidas/${partidaId}/torneo`)).json()) as Torneo;
    if (torneo.campeon) break;
    // Si el equipo tiene alguna baja, la alineación la muestra con su distintivo y no deja alinearla.
    if (!bajasVistas) {
      const r = await page.request.get(`/api/partidas/${partidaId}/alineacion`);
      const equipo = r.ok() ? ((await r.json()) as { bajasDetalle: { jugadorId: number }[] }) : null;
      if (equipo?.bajasDetalle.length) {
        await page.goto(`/partidas/${partidaId}/alineacion`);
        await expect(page.locator('.etiqueta.baja').first()).toContainText(/Lesionado|Sancionado/);
        await page.goto('/');
        bajasVistas = true;
      }
    }
    const abierta = torneo.jornadas.find((j) => j.estado === 'abierta');
    const mio = abierta?.partidos.find((p) => p.estado === 'programado');
    if (mio) await page.request.post(`/api/partidos/${mio.partidoId}/abrir`);
    else if (!abierta) await page.request.post(`/api/partidas/${partidaId}/siguiente-jornada`);
    await page.request.post('/api/dev/reloj/avanzar', { data: { ms: 130_000 } });
    await page.waitForTimeout(250);
  }
  expect(torneo?.campeon).not.toBeNull();
  expect(torneo!.clasificacion.every((f) => f.pj === 6)).toBe(true);

  await page.goto(`/partidas/${partidaId}/torneo`);
  await expect(page.locator('.campeon')).toContainText(torneo!.campeon!.nombre);
  await expect(page.locator('.clasificacion tbody tr').first()).toContainText(torneo!.clasificacion[0]!.nombre);

  // Calendario: 6 jornadas jugadas, y desde un resultado se abre el resumen del partido.
  await page.getByRole('tab', { name: 'Calendario' }).click();
  await expect(page.locator('.calendario section')).toHaveCount(6);
  await expect(page.locator('.calendario .etiqueta', { hasText: 'Jugada' })).toHaveCount(6);
  await page.locator('.resultado-partido a').first().click();
  await expect(page.getByRole('heading', { name: 'Resumen del partido' })).toBeVisible();
  await expect(page.locator('.resultado .fase')).toHaveText('Final');
});
