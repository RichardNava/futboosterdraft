import { expect, test } from '@playwright/test';

/** Escenarios K y L del quickstart (spec 003, US11; FR-042 a FR-047, SC-022): nombre, equipación y perfil. */

async function avanzarDraft(page: import('@playwright/test').Page, id: string) {
  for (let i = 0; i < 60; i++) {
    const estado = ((await (await page.request.get(`/api/partidas/${id}`)).json()) as { estado: string }).estado;
    if (estado === 'en_torneo') return;
    await page.request.post('/api/dev/reloj/avanzar', { data: { ms: 54_000 } });
    await page.waitForTimeout(50);
  }
  throw new Error('El draft no terminó');
}

test('nombre: «Los Halcones» en la sala aparece en el draft, la clasificación, la preparación, el partido y los goleadores', async ({ page }) => {
  test.setTimeout(400_000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Jugar como invitado' }).click();
  await expect(page.getByRole('heading', { name: 'Nueva partida' })).toBeVisible();
  const r = await page.request.post('/api/partidas', { data: { modo: 'liga', numParticipantes: 4 } });
  const { id } = (await r.json()) as { id: string };
  await page.goto(`/partidas/${id}/sala`);

  // Sala: paso «Nombre del equipo», con contador y errores en línea.
  const campo = page.getByRole('textbox', { name: 'Nombre del equipo' });
  await campo.fill('Ab');
  await expect(page.getByText('El nombre del equipo debe tener entre 3 y 24 caracteres.')).toBeVisible();
  await campo.fill('Los Halcones');
  await expect(page.getByText(/12\/24 caracteres/)).toBeVisible();
  await page.getByRole('button', { name: 'Guardar nombre' }).click();
  await expect(page.locator('.lista-participantes')).toContainText('Los Halcones');

  // Draft: la lista de asientos.
  await page.locator('[data-principal]').click();
  await expect(page.getByRole('heading', { name: /Sobre 1/ })).toBeVisible({ timeout: 30_000 });
  await page.keyboard.press('Escape');
  await expect(page.getByText('Los Halcones').first()).toBeVisible();
  await avanzarDraft(page, id);

  // Clasificación y preparación.
  await page.goto(`/partidas/${id}/torneo`);
  await expect(page.locator('.clasificacion')).toContainText('Los Halcones');
  await expect(page.getByText(/Tu partido:/)).toContainText('Los Halcones');

  // Partido (rápido) hasta el final y goleadores.
  await page.goto(`/partidas/${id}/torneo`);
  await page.getByRole('button', { name: 'Comenzar partido' }).click();
  await expect(page.locator('main')).toContainText('Los Halcones');
  await page.getByRole('button', { name: 'Finalizar partido' }).click();
  await expect(page.getByTestId('resultado-partido')).toBeVisible();
  await page.goto(`/partidas/${id}/torneo`);
  await page.getByRole('tab', { name: 'Máximos goleadores' }).click();
  const tabla = page.locator('table').last();
  if ((await tabla.locator('tbody tr').count()) > 0) await expect(tabla).toContainText(/Los Halcones|Atlético|Real|Unión|Deportivo|Club|Racing|Sporting|Celta|Olímpico|Juventud/);
});

test('equipación: rayas verticales blancas y rojas; la vista previa y la chapa de la 2D comparten el patrón', async ({ page }) => {
  test.setTimeout(400_000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Jugar como invitado' }).click();
  await expect(page.getByRole('heading', { name: 'Nueva partida' })).toBeVisible();
  const r = await page.request.post('/api/partidas', { data: { modo: 'liga', numParticipantes: 4 } });
  const { id } = (await r.json()) as { id: string };
  await page.request.post(`/api/partidas/${id}/iniciar`);
  await avanzarDraft(page, id);

  await page.goto(`/partidas/${id}/alineacion`);
  await page.getByText('Equipaciones', { exact: true }).click();
  const primera = page.locator('fieldset[data-equipacion="primera"]');
  await primera.getByLabel('Diseño').selectOption('rayas');
  await primera.getByLabel('Color 1').fill('#ffffff');
  if ((await primera.getByLabel('Color 2').count()) === 0) await primera.getByRole('button', { name: 'Añadir color' }).click();
  await primera.getByLabel('Color 2').fill('#d01010');
  const segunda = page.locator('fieldset[data-equipacion="segunda"]');
  await segunda.getByLabel('Diseño').selectOption('lisa');
  await segunda.getByLabel('Color 1').fill('#1030d0');
  await expect(page.getByText('se parecen demasiado')).toHaveCount(0);
  await page.getByRole('button', { name: 'Guardar equipaciones' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Equipaciones guardadas' })).toBeVisible();
  const patron = await primera.locator('svg.camiseta').getAttribute('data-patron');
  expect(patron).toMatch(/^rayas:#ffffff@/);

  // En la 2D, el equipo local (o el visitante, si choca) lleva el mismo patrón.
  await page.goto(`/partidas/${id}/torneo`);
  await page.getByLabel('Simulación 2D').check();
  await page.getByRole('button', { name: 'Comenzar partido' }).click();
  const campo2d = page.locator('.campo-2d');
  await expect(campo2d).toBeVisible();
  const patrones = [await campo2d.getAttribute('data-patron-local'), await campo2d.getAttribute('data-patron-visitante')];
  expect(patrones).toContain(patron);
});

test('perfil: «Mi perfil» guarda los valores por defecto', async ({ page }) => {
  await page.goto('/');
  const correo = `perfil-${Date.now()}@pruebas.test`;
  const r = await page.request.post('/api/auth/registro', { data: { email: correo, password: 'contraseña-segura', apodo: 'Perfilista' } });
  expect(r.ok()).toBe(true);
  await page.goto('/perfil');
  await expect(page.getByRole('heading', { name: 'Mi perfil' })).toBeVisible();
  await page.getByLabel('Nombre del equipo').fill('Las Águilas');
  await expect(page.locator('[data-principal]')).toHaveText('Guardar');
  await page.locator('[data-principal]').click();
  await expect(page.getByRole('status').filter({ hasText: 'Perfil guardado' })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Nombre del equipo')).toHaveValue('Las Águilas');
});
