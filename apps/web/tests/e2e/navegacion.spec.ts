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

test('«Abandonar» en la barra: en cualquier momento de la partida, un NPC ocupa la plaza (spec 007, segunda ronda)', async ({ browser }) => {
  test.setTimeout(120_000);
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  await registrar(a);
  await registrar(b);
  const r = await a.request.post('/api/partidas', { data: { modo: 'liga', numParticipantes: 4, plazasHumanas: 2 } });
  const { id } = (await r.json()) as { id: string };
  expect((await b.request.post(`/api/partidas/${id}/unirse`)).ok()).toBe(true);
  // En la sala aún no se juega: no hay botón.
  await a.goto(`/partidas/${id}/sala`);
  await expect(a.getByRole('heading', { name: 'Sala' })).toBeVisible();
  await expect(barra(a).getByRole('button', { name: 'Abandonar la partida' })).toHaveCount(0);
  await a.request.post(`/api/partidas/${id}/iniciar`);
  await a.goto(`/partidas/${id}/draft`);
  await b.goto(`/partidas/${id}/draft`);
  await expect(a.getByRole('heading', { level: 1 })).toContainText('Turno 1 de 8');

  // Cancelar se queda en el draft.
  await barra(a).getByRole('button', { name: 'Abandonar la partida' }).click();
  const modal = a.getByRole('dialog', { name: '¿Abandonar la partida?' });
  await modal.getByRole('button', { name: 'Seguir en el draft' }).click();
  await expect(modal).toBeHidden();
  await expect(a).toHaveURL(new RegExp(`/partidas/${id}/draft`));

  // Abandonar: al inicio, sin volver a preguntar, y la plaza la juega un NPC.
  await barra(a).getByRole('button', { name: 'Abandonar la partida' }).click();
  await modal.getByRole('button', { name: 'Abandonar', exact: true }).click();
  await expect(a).toHaveURL(/\/$/);
  await expect(modal).toHaveCount(0);
  const tituloB = b.getByRole('heading', { level: 1 });
  await b.locator('.rejilla-cartas .carta-cuerpo[role="button"]').first().click();
  await b.getByRole('button', { name: 'Confirmar elección' }).click();
  await expect(tituloB).toContainText('Turno 2 de 8', { timeout: 5000 });

  // Quien abandona ya no participa: en «Mis partidas» la ve como abandonada, sin «Continuar».
  const mias = (await (await a.request.get('/api/mis-partidas')).json()) as { enCurso: { id: string }[]; terminadas: { id: string; fase: string }[] };
  expect(mias.enCurso.map((p) => p.id)).not.toContain(id);
  expect(mias.terminadas.find((p) => p.id === id)?.fase).toBe('abandonada');
});

/** Spec 012 (US7, FR-031): los botones de sesión son botones con presencia y se ven sin desplazarse. */
test('botones de sesión visibles sin desplazarse, en escritorio y en móvil', async ({ page }) => {
  for (const ancho of [1440, 390]) {
    await page.setViewportSize({ width: ancho, height: ancho > 1000 ? 900 : 844 });
    await page.context().clearCookies();
    await page.goto('/');
    const iniciar = page.getByRole('button', { name: 'Iniciar sesión' });
    await expect(iniciar).toHaveClass(/secundario/);
    await expect(iniciar).toBeInViewport({ ratio: 1 });
    await iniciar.click();
    const cambiar = page.getByRole('button', { name: 'Crear una cuenta' });
    await expect(cambiar).toHaveClass(/secundario/);
    await cambiar.click();
    const yaTengo = page.getByRole('button', { name: 'Ya tengo cuenta' });
    await expect(yaTengo).toHaveClass(/secundario/);
    await expect(yaTengo).toBeInViewport({ ratio: 1 });

    await registrar(page);
    await page.goto('/');
    const cerrar = page.getByRole('button', { name: 'Cerrar sesión' });
    await expect(cerrar).toHaveClass(/secundario/);
    await expect(cerrar).toBeInViewport({ ratio: 1 });
  }
});

/**
 * Spec 014 (US6; FR-024 a FR-028, SC-010): cambiar de pantalla sin pestañeo. Un observador anota cualquier esqueleto o
 * indicador de carga que llegue a montarse durante el recorrido.
 */
async function vigilarCargas(page: Page): Promise<() => Promise<string[]>> {
  await page.evaluate(() => {
    const w = window as unknown as { __cargas: string[] };
    w.__cargas = [];
    new MutationObserver(() => {
      for (const el of document.querySelectorAll('.esqueleto, .indicador-navegacion')) w.__cargas.push(`${location.pathname}:${el.className}`);
    }).observe(document.body, { childList: true, subtree: true });
  });
  return () => page.evaluate(() => (window as unknown as { __cargas: string[] }).__cargas);
}

const RECORRIDO = [
  ['Mis partidas', 'Mis partidas'],
  ['Mi perfil', 'Mi perfil'],
  ['Colección', 'Colección'],
  ['Tienda', 'Tienda'],
  ['Inicio', null],
] as const;

test('recorrido de pantallas principales sin esqueletos ni indicador de carga (SC-010)', async ({ page }) => {
  await registrar(page);
  await page.goto('/');
  await expect(barra(page).getByRole('link', { name: 'Mis partidas' })).toBeVisible();
  const cargas = await vigilarCargas(page);
  for (let vuelta = 0; vuelta < 2; vuelta++) {
    for (const [enlace, titulo] of RECORRIDO) {
      await barra(page).getByRole('link', { name: enlace }).first().click();
      if (titulo) await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible();
      else await expect(page).toHaveURL(/\/$/);
    }
  }
  expect(await cargas()).toEqual([]);
});

test('con la red lenta, la pantalla anterior se mantiene y el indicador aparece a los 2 s (FR-027)', async ({ page }) => {
  await registrar(page);
  await page.goto('/');
  await expect(barra(page).getByRole('link', { name: 'Mis partidas' })).toBeVisible();
  await page.route('**/api/perfil', async (ruta) => {
    await new Promise((r) => setTimeout(r, 3000));
    await ruta.continue();
  });
  const inicio = Date.now();
  await barra(page).getByRole('link', { name: 'Mi perfil' }).click();
  // Antes de 2 s: ni indicador ni pantalla nueva.
  await page.waitForTimeout(1500);
  await expect(page.locator('.indicador-navegacion')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1, name: 'Mi perfil' })).toHaveCount(0);
  await expect(page.locator('.indicador-navegacion')).toBeVisible({ timeout: 2000 });
  const aparece = Date.now() - inicio;
  expect(aparece).toBeGreaterThanOrEqual(1700);
  expect(aparece).toBeLessThanOrEqual(2800);
  await expect(page.getByRole('heading', { level: 1, name: 'Mi perfil' })).toBeVisible();
  await expect(page.locator('.indicador-navegacion')).toHaveCount(0);
});

test('con la red lenta, dos enlaces seguidos no dejan indicador del primero (FR-028)', async ({ page }) => {
  await registrar(page);
  await page.goto('/');
  await expect(barra(page).getByRole('link', { name: 'Mis partidas' })).toBeVisible();
  await page.route('**/api/perfil', async (ruta) => {
    await new Promise((r) => setTimeout(r, 3000));
    await ruta.continue();
  });
  await barra(page).getByRole('link', { name: 'Mi perfil' }).click();
  await page.waitForTimeout(500);
  await barra(page).getByRole('link', { name: 'Mis partidas' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Mis partidas' })).toBeVisible();
  await page.waitForTimeout(3000);
  await expect(page.locator('.indicador-navegacion')).toHaveCount(0);
  await expect(page).toHaveURL(/\/mis-partidas$/);
});
