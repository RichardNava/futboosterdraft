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
