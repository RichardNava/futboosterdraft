import { expect, type Page } from '@playwright/test';

/** Entra como invitado, crea una liga de 4 contra NPC y completa el draft adelantando el reloj simulado. */
export async function partidaTrasDraft(page: Page, cuerpo: Record<string, unknown> = {}): Promise<string> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Jugar como invitado' }).click();
  await expect(page.getByRole('heading', { name: 'Nueva partida' })).toBeVisible();
  const r = await page.request.post('/api/partidas', {
    data: { modo: 'liga', numParticipantes: 4, tipoSimulacion: 'rapida', ...cuerpo },
  });
  expect(r.status()).toBe(201);
  const { id } = (await r.json()) as { id: string };
  await page.request.post(`/api/partidas/${id}/iniciar`);
  // Turnos de 45 s (51 s el primero de cada ronda, por la apertura del sobre): pasos de 52 s.
  for (let i = 0; i < 60; i++) {
    const estado = ((await (await page.request.get(`/api/partidas/${id}`)).json()) as { estado: string }).estado;
    if (estado === 'en_torneo') return id;
    await page.request.post('/api/dev/reloj/avanzar', { data: { ms: 52_000 } });
    await page.waitForTimeout(50);
  }
  throw new Error('El draft no terminó');
}
