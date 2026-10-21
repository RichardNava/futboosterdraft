import { expect, test } from '@playwright/test';
import { LIMA } from './comprobaciones';

/** Estados vacío, de confirmación, de error de formulario y de botón desactivado (spec 004, US2; contracts/ui.md §7 y §8). */

test('«Mis partidas» sin partidas explica qué falta y ofrece «Nueva partida»', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Jugar como invitado' }).click();
  await expect(page.getByRole('heading', { name: 'Nueva partida' })).toBeVisible();
  await page.goto('/mis-partidas');
  await expect(page.getByText('Todavía no tienes partidas. Crea una para abrir tus primeros sobres.')).toBeVisible();
  const principal = page.locator('[data-principal]');
  await expect(principal).toHaveText('Nueva partida');
  await principal.click();
  await expect(page.getByRole('heading', { name: 'Nueva partida' })).toBeVisible();
});

test('guardar el perfil confirma con «Perfil guardado»', async ({ page }) => {
  await page.goto('/');
  const r = await page.request.post('/api/auth/registro', { data: { email: `estados-${Date.now()}@pruebas.test`, password: 'contraseña-segura', apodo: 'Estados' } });
  expect(r.ok()).toBe(true);
  await page.goto('/perfil');
  await page.getByLabel('Nombre del equipo').fill('Los Estados');
  await page.locator('[data-principal]').click();
  await expect(page.getByRole('status').filter({ hasText: 'Perfil guardado' })).toBeVisible();
});

test('un nombre de 2 caracteres muestra el error bajo el campo, enlazado', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Jugar como invitado' }).click();
  await expect(page.getByRole('heading', { name: 'Nueva partida' })).toBeVisible();
  const r = await page.request.post('/api/partidas', { data: { modo: 'liga', numParticipantes: 4 } });
  const { id } = (await r.json()) as { id: string };
  await page.goto(`/partidas/${id}/sala`);
  const campo = page.getByRole('textbox', { name: 'Nombre del equipo' });
  await campo.fill('Ab');
  const mensaje = 'El nombre del equipo debe tener entre 3 y 24 caracteres.';
  await expect(page.getByText(mensaje)).toBeVisible();
  await expect(campo).toHaveAttribute('aria-invalid', 'true');
  const ayuda = await campo.getAttribute('aria-describedby');
  await expect(page.locator(`[id="${ayuda}"]`)).toHaveText(mensaje);
});

test('el botón principal desactivado no es lima y muestra su motivo al lado', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Jugar como invitado' }).click();
  await expect(page.getByRole('heading', { name: 'Nueva partida' })).toBeVisible();
  const r = await page.request.post('/api/partidas', { data: { modo: 'liga', numParticipantes: 4 } });
  const { id } = (await r.json()) as { id: string };
  await page.request.post(`/api/partidas/${id}/iniciar`);
  await page.goto(`/partidas/${id}/draft`);
  await expect(page.getByRole('heading', { name: /Sobre 1/ })).toBeVisible({ timeout: 30_000 });
  await page.keyboard.press('Escape');
  const principal = page.locator('[data-principal]');
  await expect(principal).toHaveAttribute('aria-disabled', 'true');
  expect(await principal.evaluate((b) => getComputedStyle(b).backgroundColor)).not.toBe(LIMA);
  const motivo = await principal.getAttribute('aria-describedby');
  await expect(page.locator(`[id="${motivo}"]`)).toHaveText('Elige una carta del sobre');
  await expect(page.locator(`[id="${motivo}"]`)).toBeVisible();
});
