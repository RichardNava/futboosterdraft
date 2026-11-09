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
  test.setTimeout(600_000);
  // Registrado: fuera de la pantalla del torneo no hay conexión, y la partida de un invitado se abandona a los 10 minutos.
  const partidaId = await partidaTrasDraft(page, {}, { registrado: true });
  await page.goto(`/partidas/${partidaId}/torneo`);
  await expect(page.getByRole('heading', { name: 'Torneo' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Jornada 1' })).toBeVisible();
  await expect(page.getByText('Tu partido:')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Clasificación' })).toHaveAttribute('aria-selected', 'true');
  // En liga siguen las tablas de goleadores y asistentes (spec 007, FR-016).
  await expect(page.getByRole('tab', { name: 'Máximos goleadores' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Máximos asistentes' })).toBeVisible();
  await expect(page.locator('.clasificacion tbody tr')).toHaveCount(4);

  // Se juega el torneo como el único humano (spec 002, research R9): abre su partido, deja que venza el
  // descanso sin «Seguir» adelantando el reloj, y pide la siguiente jornada al cerrarse cada una.
  await page.goto('/');
  let bajasVistas = false;
  let torneo: Torneo | null = null;
  for (let i = 0; i < 1000; i++) {
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

  // Primero, la pantalla del campeón (spec 003, FR-040); vista una vez, al volver se ve el torneo.
  await page.goto(`/partidas/${partidaId}/torneo`);
  await expect(page.getByRole('heading', { name: `¡${torneo!.campeon!.nombre}, campeón del torneo!` })).toBeVisible();
  await page.reload();
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

/**
 * Spec 012 (US5, FR-026 a FR-029): con un titular de baja en la alineación confirmada, el botón de avanzar se
 * desactiva con su motivo y «Avisos» pide intervenir; tras sustituirlo, se puede jugar. Plantillas con escudo y nombre.
 */
test('baja pendiente: botón bloqueado, aviso de intervención y Plantillas con escudo', async ({ page }) => {
  test.setTimeout(300_000);
  const partidaId = await partidaTrasDraft(page, {}, { registrado: true });
  type Vista = {
    alineacion: { titulares: { casillaId: string; jugadorId: number }[]; suplentes: number[]; lanzadores: Record<string, unknown> };
    plantilla: { id: number; apellidos: string }[];
  };
  const vista = async () => (await (await page.request.get(`/api/partidas/${partidaId}/alineacion`)).json()) as Vista;
  const { alineacion } = await vista();
  expect((await page.request.put(`/api/partidas/${partidaId}/alineacion`, { data: alineacion })).ok()).toBe(true);
  const lesionado = alineacion.titulares[5]!.jugadorId;
  expect((await page.request.post(`/api/dev/partidas/${partidaId}/baja`, { data: { jugadorId: lesionado } })).ok()).toBe(true);

  await page.goto(`/partidas/${partidaId}/torneo`);
  const principal = page.locator('[data-principal]');
  await expect(principal).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByText(/Sustituye a .+ \(lesionado\) para continuar/)).toBeVisible();
  await page.getByRole('button', { name: /Avisos/ }).click();
  const aviso = page.locator('[data-aviso-equipo="baja_pendiente"]');
  await expect(aviso).toBeVisible();
  await expect(aviso.getByRole('link')).toHaveAttribute('href', `/partidas/${partidaId}/alineacion`);

  // Se sustituye solo al lesionado (por la API, como haría Formación) y el botón se activa.
  const entra = alineacion.suplentes[0]!;
  const nueva = {
    ...alineacion,
    titulares: alineacion.titulares.map((t) => (t.jugadorId === lesionado ? { ...t, jugadorId: entra } : t)),
    suplentes: alineacion.suplentes.filter((id) => id !== entra),
    lanzadores: JSON.parse(JSON.stringify(alineacion.lanzadores).replaceAll(String(lesionado), String(entra))),
  };
  expect((await page.request.put(`/api/partidas/${partidaId}/alineacion`, { data: nueva })).ok()).toBe(true);
  await page.reload();
  await expect(page.locator('[data-principal]')).not.toHaveAttribute('aria-disabled', 'true');

  // Plantillas (ronda 2 de la spec 012, FR-040): las pestañas, solo con el nombre; la chapa y la media del mejor once,
  // en la ficha del equipo elegido.
  await page.goto(`/partidas/${partidaId}/plantillas`);
  const pestanas = page.getByRole('tablist', { name: 'Plantillas de los equipos' }).getByRole('tab');
  await expect(pestanas).toHaveCount(4);
  for (let i = 0; i < 4; i++) await expect(pestanas.nth(i).locator('.nombre-recortado')).not.toBeEmpty();
  const ficha = page.getByRole('region', { name: 'Equipo' });
  await expect(ficha.locator('.chapa')).toHaveCount(1);
  await expect(ficha.getByTestId('media-equipo')).toBeVisible();
});
