import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';

/**
 * Escenario D del quickstart, pasos 1 y 2 (US2; FR-013): en un draft con dos humanos, quien ya ha elegido
 * ve «Esperando a: …» con el nombre del que falta, y el turno se resuelve en cuanto elige.
 */
async function registrar(page: Page): Promise<string> {
  await page.goto('/');
  const apodo = `E2E${randomUUID().slice(0, 6)}`;
  const r = await page.request.post('/api/auth/registro', { data: { email: `${randomUUID()}@e2e.test`, password: 'contraseña-segura', apodo } });
  expect(r.ok()).toBe(true);
  return apodo;
}

test('«Esperando a: B» y el turno se resuelve al elegir B (escenario D, pasos 1 y 2)', async ({ browser }) => {
  test.setTimeout(180_000);
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  await registrar(a);
  const apodoB = await registrar(b);
  const r = await a.request.post('/api/partidas', { data: { modo: 'liga', numParticipantes: 4, plazasHumanas: 2 } });
  const { id } = (await r.json()) as { id: string };
  expect((await b.request.post(`/api/partidas/${id}/unirse`)).ok()).toBe(true);
  await a.request.post(`/api/partidas/${id}/iniciar`);
  await a.goto(`/partidas/${id}/draft`);
  await b.goto(`/partidas/${id}/draft`);

  await a.locator('.rejilla-cartas .carta-cuerpo[role="button"]').first().click();
  await a.getByRole('button', { name: 'Confirmar elección' }).click();
  await expect(a.getByRole('status').filter({ hasText: 'Esperando a:' })).toContainText(apodoB);

  const titulo = await a.getByRole('heading', { level: 1 }).textContent();
  await b.locator('.rejilla-cartas .carta-cuerpo[role="button"]').first().click();
  await b.getByRole('button', { name: 'Confirmar elección' }).click();
  await expect(a.getByRole('heading', { level: 1 })).not.toHaveText(titulo!, { timeout: 2000 });
});
