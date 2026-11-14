import { expect, test } from '@playwright/test';

/** Spec 013 (US3, contracts/ui.md): selector «Rareza del draft» al crear la partida y etiqueta en la sala. */

test('Moderado preseleccionado; elegir Rico ⇒ la sala muestra «Rareza: Rico»', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Jugar como invitado' }).click();
  await expect(page.getByRole('heading', { name: 'Nueva partida' })).toBeVisible();
  // Ronda 2: deslizador por tramos (Pobre, Escaso, Moderado, Alto, Rico).
  const deslizador = page.getByRole('group', { name: 'Rareza del draft' }).getByRole('slider');
  await expect(deslizador).toHaveAttribute('max', '4');
  await expect(deslizador).toHaveAttribute('aria-valuetext', /^Moderado\./);
  await deslizador.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(deslizador).toHaveAttribute('aria-valuetext', /^Rico\./);
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

test('ronda 4: en restringido y sin pase, la rareza se ve bloqueada en Moderado hasta pulsar el precio', async ({ page }) => {
  const niveles = ['pobre', 'escaso', 'moderado', 'abundante', 'rico'].map((nivel) =>
    nivel === 'moderado' ? { nivel, estado: 'gratis', coste: 0 } : { nivel, estado: 'pago', coste: 100 },
  );
  await page.route('**/api/partidas/niveles-rareza', (r) =>
    r.fulfill({ contentType: 'application/json', body: JSON.stringify({ acceso: 'restringido', premium: { activo: false, cortesia: false, fin: null }, saldo: 500, niveles }) }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Jugar como invitado' }).click();
  const seccion = page.getByRole('group', { name: 'Rareza del draft' });
  await expect(seccion.getByRole('img', { name: 'Rareza bloqueada' })).toBeVisible();
  await expect(seccion).toHaveAttribute('data-ayuda', /100 fragmentos por este torneo o activa el pase premium/);
  const deslizador = seccion.getByRole('slider', { includeHidden: true });
  await expect(deslizador).toHaveAttribute('aria-valuetext', /^Moderado\./);
  await expect(deslizador).not.toBeFocused();
  await seccion.getByRole('button', { name: /100 fragmentos: desbloquear/ }).click();
  await expect(seccion.getByRole('img', { name: 'Rareza bloqueada' })).toHaveCount(0);
  await seccion.getByRole('slider').focus();
  await page.keyboard.press('ArrowRight');
  await expect(seccion.getByRole('slider')).toHaveAttribute('aria-valuetext', /^Alto\./);
});

test('sin fragmentos suficientes, pulsar el precio no desbloquea y avisa', async ({ page }) => {
  const niveles = ['pobre', 'escaso', 'moderado', 'abundante', 'rico'].map((nivel) =>
    nivel === 'moderado' ? { nivel, estado: 'gratis', coste: 0 } : { nivel, estado: 'pago', coste: 100 },
  );
  await page.route('**/api/partidas/niveles-rareza', (r) =>
    r.fulfill({ contentType: 'application/json', body: JSON.stringify({ acceso: 'restringido', premium: { activo: false, cortesia: false, fin: null }, saldo: 40, niveles }) }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Jugar como invitado' }).click();
  const seccion = page.getByRole('group', { name: 'Rareza del draft' });
  await seccion.getByRole('button', { name: /100 fragmentos: desbloquear/ }).click();
  await expect(page.getByText('No dispones de los fragmentos necesarios')).toBeVisible();
  await expect(seccion.getByRole('img', { name: 'Rareza bloqueada' })).toBeVisible();
});
