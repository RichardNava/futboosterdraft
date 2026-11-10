import { expect, test } from '@playwright/test';

/** Spec 013 (US3, contracts/ui.md): selector «Rareza del draft» al crear la partida y etiqueta en la sala. */

test('Moderado preseleccionado; elegir Rico ⇒ la sala muestra «Rareza: Rico»', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Jugar como invitado' }).click();
  await expect(page.getByRole('heading', { name: 'Nueva partida' })).toBeVisible();
  const grupo = page.getByRole('group', { name: 'Rareza del draft' });
  await expect(grupo.getByRole('radio')).toHaveCount(5);
  await expect(grupo.getByRole('radio', { name: /^Moderado/ })).toBeChecked();
  await grupo.getByRole('radio', { name: /^Rico/ }).check();
  await page.getByRole('button', { name: 'Crear partida' }).click();
  await expect(page.getByRole('heading', { name: 'Sala' })).toBeVisible();
  await expect(page.getByTestId('rareza')).toContainText('Rareza: Rico');
});

test('doble clic en «Crear partida» ⇒ una sola partida', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Jugar como invitado' }).click();
  await expect(page.getByRole('heading', { name: 'Nueva partida' })).toBeVisible();
  const creaciones: string[] = [];
  page.on('response', (r) => {
    if (r.url().endsWith('/api/partidas') && r.request().method() === 'POST') creaciones.push(r.request().headers()['idempotency-key'] ?? '');
  });
  await page.getByRole('button', { name: 'Crear partida' }).dblclick();
  await expect(page.getByRole('heading', { name: 'Sala' })).toBeVisible();
  const { enCurso } = (await (await page.request.get('/api/mis-partidas')).json()) as { enCurso: unknown[] };
  expect(enCurso).toHaveLength(1);
  expect(new Set(creaciones).size).toBeLessThanOrEqual(1);
});
