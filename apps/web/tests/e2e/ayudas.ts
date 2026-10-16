import { expect, type Page } from '@playwright/test';

/** Entra como invitado, crea una liga de 4 contra NPC y completa el draft adelantando el reloj simulado. */
export async function partidaTrasDraft(page: Page, cuerpo: Record<string, unknown> = {}): Promise<string> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Jugar como invitado' }).click();
  await expect(page.getByRole('heading', { name: 'Nueva partida' })).toBeVisible();
  const r = await page.request.post('/api/partidas', {
    data: { modo: 'liga', numParticipantes: 4, tipoSimulacion: 'rapida', ritmo: 'directo', ...cuerpo },
  });
  expect(r.status()).toBe(201);
  const { id } = (await r.json()) as { id: string };
  await page.request.post(`/api/partidas/${id}/iniciar`);
  for (let i = 0; i < 40; i++) {
    const estado = ((await (await page.request.get(`/api/partidas/${id}`)).json()) as { estado: string }).estado;
    if (estado === 'en_torneo') return id;
    await page.request.post('/api/dev/reloj/avanzar', { data: { ms: 46_000 } });
  }
  throw new Error('El draft no terminó');
}
