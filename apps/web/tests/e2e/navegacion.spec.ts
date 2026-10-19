import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';

/**
 * Navegación libre (US6; FR-017 a FR-021): escenario D, paso 3 (modal de abandono en un draft con otro
 * humano) y escenario E (en solitario, sin modal, con pausa y reanudación con el tiempo que quedaba).
 */
const avanzarReloj = (p: Page, ms: number) => p.request.post('/api/dev/reloj/avanzar', { data: { ms } });

async function registrar(page: Page): Promise<void> {
  await page.goto('/');
  const r = await page.request.post('/api/auth/registro', {
    data: { email: `${randomUUID()}@e2e.test`, password: 'contraseña-segura', apodo: `E2E${randomUUID().slice(0, 6)}` },
  });
  expect(r.ok()).toBe(true);
}

const barra = (p: Page) => p.getByRole('navigation', { name: 'Navegación principal' });

test('en solitario: sin modal, la partida se pausa al salir y sigue al volver (escenario E)', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Jugar como invitado' }).click();
  await expect(page.getByRole('heading', { name: 'Nueva partida' })).toBeVisible();
  const r = await page.request.post('/api/partidas', { data: { modo: 'liga', numParticipantes: 4 } });
  const { id } = (await r.json()) as { id: string };
  await page.request.post(`/api/partidas/${id}/iniciar`);
  await page.goto(`/partidas/${id}/draft`);
  const titulo = page.getByRole('heading', { level: 1 });
  await expect(titulo).toContainText('Turno 1 de 8');

  // El menú principal está a un clic: «Mis partidas» sin modal.
  await barra(page).getByRole('link', { name: 'Mis partidas' }).click();
  await expect(page.getByRole('heading', { name: 'Mis partidas' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // Pausada: aunque pase el plazo del turno, no se elige sola.
  await avanzarReloj(page, 120_000);
  await page.getByRole('link', { name: 'Elegir carta' }).click();
  await expect(titulo).toContainText('Turno 1 de 8');
  await expect(page.getByRole('status').filter({ hasText: 'elegida automáticamente' })).toHaveCount(0);

  // Desde cada pantalla de la partida, la barra lleva al inicio en un clic.
  await barra(page).getByRole('link', { name: 'Inicio' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('draft con otro humano: «¿Abandonar la partida?» al salir; cancelar se queda, abandonar sale (escenario D, paso 3)', async ({ browser }) => {
  test.setTimeout(120_000);
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  await registrar(a);
  await registrar(b);
  const r = await a.request.post('/api/partidas', { data: { modo: 'liga', numParticipantes: 4, plazasHumanas: 2 } });
  const { id } = (await r.json()) as { id: string };
  expect((await b.request.post(`/api/partidas/${id}/unirse`)).ok()).toBe(true);
  await a.request.post(`/api/partidas/${id}/iniciar`);
  await a.goto(`/partidas/${id}/draft`);
  await b.goto(`/partidas/${id}/draft`);
  await expect(a.getByRole('heading', { level: 1 })).toContainText('Turno 1 de 8');

  await barra(a).getByRole('link', { name: 'Inicio' }).click();
  const modal = a.getByRole('dialog', { name: '¿Abandonar la partida?' });
  await expect(modal).toBeVisible();
  await expect(modal).toContainText('Si sales ahora, abandonarás la partida y un NPC ocupará tu plaza');
  await modal.getByRole('button', { name: 'Seguir en el draft' }).click();
  await expect(modal).toBeHidden();
  await expect(a).toHaveURL(new RegExp(`/partidas/${id}/draft`));

  await barra(a).getByRole('link', { name: 'Mis partidas' }).click();
  await modal.getByRole('button', { name: 'Abandonar' }).click();
  await expect(a.getByRole('heading', { name: 'Mis partidas' })).toBeVisible();

  // B elige y el turno se resuelve sin esperar a quien se fue (su plaza la ocupa un NPC).
  const tituloB = b.getByRole('heading', { level: 1 });
  await b.locator('.rejilla-cartas .carta-cuerpo[role="button"]').first().click();
  await b.getByRole('button', { name: 'Confirmar elección' }).click();
  await expect(tituloB).toContainText('Turno 2 de 8', { timeout: 5000 });
});
