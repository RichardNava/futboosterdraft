import { expect, type Locator, type Page } from '@playwright/test';

/** Entra como invitado, crea una liga de 4 contra NPC y completa el draft adelantando el reloj simulado. */
export async function partidaTrasDraft(page: Page, cuerpo: Record<string, unknown> = {}): Promise<string> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Jugar como invitado' }).click();
  await expect(page.getByRole('heading', { name: 'Nueva partida' })).toBeVisible();
  const r = await page.request.post('/api/partidas', {
    data: { modo: 'liga', numParticipantes: 4, ...cuerpo },
  });
  expect(r.status()).toBe(201);
  const { id } = (await r.json()) as { id: string };
  await page.request.post(`/api/partidas/${id}/iniciar`);
  // Turnos de 45 s (53 s el primero de cada ronda, por la apertura del sobre): pasos de 54 s.
  for (let i = 0; i < 60; i++) {
    const estado = ((await (await page.request.get(`/api/partidas/${id}`)).json()) as { estado: string }).estado;
    if (estado === 'en_torneo') return id;
    await page.request.post('/api/dev/reloj/avanzar', { data: { ms: 54_000 } });
    await page.waitForTimeout(50);
  }
  throw new Error('El draft no terminó');
}

/** Arrastra con el ratón (Pointer Events) un elemento hasta el centro de otro. */
export async function arrastrarSobre(page: Page, origen: Locator, destino: Locator): Promise<void> {
  // Centrado en la ventana: al pie, la barra principal fija podría taparlo.
  await origen.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  const a = (await origen.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 10, a.y + a.height / 2 + 10, { steps: 3 });
  await destino.scrollIntoViewIfNeeded();
  const b = (await destino.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
  await page.mouse.up();
}

/** En «Gestionar equipo»: el primer suplente entra por el titular de la casilla indicada. */
export async function sustituirEnGestion(page: Page, casilla = 'DC'): Promise<void> {
  const gestion = page.getByTestId('gestion-equipo');
  await arrastrarSobre(page, gestion.getByTestId('banquillo').locator('.ficha-lista').first(), gestion.locator(`.ficha-equipo[data-casilla="${casilla}"]`));
}

// Escenario J (spec 003, US10), compartido con las pruebas de diseño de la spec 004.

export interface VistaTorneo {
  campeon: { id: string; nombre: string } | null;
  jornadaActual: number | null;
  miEliminacion: { fase: string; etiqueta: string } | null;
  jornadas: { estado: string; partidos: { partidoId: string | null; estado: string; local: { id: string; nombre: string } | null; visitante: { id: string; nombre: string } | null }[] }[];
}

/** Vista del torneo desde la API. */
export const vistaTorneo = async (page: Page, id: string) => (await (await page.request.get(`/api/partidas/${id}/torneo`)).json()) as VistaTorneo;

/** Alineación saboteada (un delantero en la portería y el portero en su sitio) para perder casi seguro. */
export async function sabotear(page: Page, id: string) {
  const { alineacion, plantilla } = (await (await page.request.get(`/api/partidas/${id}/alineacion`)).json()) as {
    alineacion: { titulares: { casillaId: string; jugadorId: number }[] } & Record<string, unknown>;
    plantilla: { id: number; demarcacion: string }[];
  };
  const dem = (jid: number) => plantilla.find((j) => j.id === jid)?.demarcacion;
  const portero = alineacion.titulares.find((t) => t.casillaId === 'POR')!;
  const delantero = alineacion.titulares.find((t) => dem(t.jugadorId) === 'DEL') ?? alineacion.titulares.find((t) => t.casillaId !== 'POR')!;
  const titulares = alineacion.titulares.map((t) => (t === portero ? { ...t, jugadorId: delantero.jugadorId } : t === delantero ? { ...t, jugadorId: portero.jugadorId } : t));
  await page.request.put(`/api/partidas/${id}/alineacion`, { data: { ...alineacion, titulares, colocacion: undefined } });
}

/** Juega como el único humano, saboteado, hasta quedar eliminado (o, si no hay derrota posible, hasta el campeón). */
export async function jugarHastaCaer(page: Page, id: string): Promise<VistaTorneo> {
  for (let i = 0; i < 400; i++) {
    const t = await vistaTorneo(page, id);
    if (t.miEliminacion || t.campeon) return t;
    const abierta = t.jornadas.find((j) => j.estado === 'abierta');
    const mio = abierta?.partidos.find((p) => p.estado === 'programado');
    if (mio) {
      await sabotear(page, id);
      await page.request.post(`/api/partidos/${mio.partidoId}/abrir`);
    } else if (!abierta) await page.request.post(`/api/partidas/${id}/siguiente-jornada`);
    await page.request.post('/api/dev/reloj/avanzar', { data: { ms: 130_000 } });
    await page.waitForTimeout(150);
  }
  throw new Error('No se llegó al final');
}
