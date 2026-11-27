/**
 * Panel de administración (spec 017, T099; quickstart D y E): roles, fragmentos, suspensión y cierre de partida.
 */
import { randomUUID } from 'node:crypto';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { fijarRol } from './ayudas';

const PASSWORD = 'contraseña-segura';

async function cuenta(browser: Browser, apodo: string): Promise<{ page: Page; email: string }> {
  const contexto = await browser.newContext();
  const page = await contexto.newPage();
  const email = `e2e-${randomUUID()}@pruebas.test`;
  await page.goto('/');
  expect((await page.request.post('/api/auth/registro', { data: { email, password: PASSWORD, apodo } })).status()).toBe(200);
  return { page, email };
}

async function confirmar(page: Page, boton: string, motivo = 'Prueba del panel') {
  const dialogo = page.getByRole('dialog');
  await dialogo.getByLabel('Motivo').fill(motivo);
  await dialogo.getByRole('button', { name: boton, exact: true }).click();
}

async function elegirCuenta(page: Page, email: string) {
  await page.getByRole('tab', { name: 'Cuentas' }).click();
  await page.getByLabel('Buscar por correo o apodo').fill(email);
  await page.getByRole('button', { name: 'Buscar' }).click();
  await page.getByRole('button', { name: new RegExp(email) }).click();
}

const LISTA_PARTIDAS = /\/api\/admin\/partidas\?/;

/** Deja en la lista del panel solo la partida de la prueba: la base de datos de desarrollo puede tener cientos. */
async function mostrarSoloPartida(page: Page, id: string) {
  await page.route(LISTA_PARTIDAS, async (ruta) => {
    let cursor: string | null = null;
    do {
      const r = await page.request.get(`/api/admin/partidas?limite=50${cursor ? `&cursor=${cursor}` : ''}`);
      const datos = (await r.json()) as { partidas: { id: string }[]; cursor: string | null };
      const propia = datos.partidas.find((p) => p.id === id);
      if (propia) return ruta.fulfill({ json: { partidas: [propia], cursor: null } });
      cursor = datos.cursor;
    } while (cursor);
    return ruta.abort();
  });
}

test('un administrador gestiona roles, fragmentos, suspensión y partidas', async ({ browser }) => {
  test.setTimeout(300_000);
  const admin = await cuenta(browser, 'Admin E2E');
  const jugador = await cuenta(browser, 'Jugador E2E');
  fijarRol(admin.email, 'administrador');
  try {
    // Sin el rol, /admin lleva al inicio.
    await jugador.page.goto('/admin');
    await expect(jugador.page).toHaveURL(/\/$/);
    await expect(jugador.page.getByRole('link', { name: 'Administración' })).toHaveCount(0);

    await admin.page.goto('/');
    await admin.page.getByRole('link', { name: 'Administración' }).first().click();
    await expect(admin.page.getByRole('heading', { name: 'Administración' })).toBeVisible();

    // Ajuste.
    await admin.page.getByRole('tab', { name: 'Ajustes' }).click();
    await admin.page.getByLabel('Acceso a los niveles de rareza', { exact: true }).selectOption('restringido');
    await admin.page.getByRole('button', { name: 'Cambiar Acceso a los niveles de rareza' }).click();
    await confirmar(admin.page, 'Cambiar ajuste');
    await expect(admin.page.getByText('Ajuste cambiado.')).toBeVisible();
    await admin.page.getByLabel('Acceso a los niveles de rareza', { exact: true }).selectOption('libre');
    await admin.page.getByRole('button', { name: 'Cambiar Acceso a los niveles de rareza' }).click();
    await confirmar(admin.page, 'Cambiar ajuste');

    // Rol y fragmentos; más de 10.000 no se puede enviar.
    await elegirCuenta(admin.page, jugador.email);
    await admin.page.getByRole('button', { name: 'Cambiar rol' }).click();
    await admin.page.getByRole('dialog').getByLabel('Rol', { exact: true }).selectOption('betatester');
    await confirmar(admin.page, 'Cambiar rol');
    await admin.page.getByRole('button', { name: 'Entregar fragmentos' }).click();
    await admin.page.getByRole('dialog').getByLabel(/Cantidad/).fill('10001');
    await admin.page.getByRole('dialog').getByLabel('Motivo').fill('Prueba del panel');
    await expect(admin.page.getByRole('dialog').getByRole('button', { name: 'Entregar', exact: true })).toBeDisabled();
    await admin.page.getByRole('dialog').getByLabel(/Cantidad/).fill('1000');
    await admin.page.getByRole('dialog').getByRole('button', { name: 'Entregar', exact: true }).click();
    await expect(admin.page.getByText(/Entregados 1000 fragmentos/)).toBeVisible();

    // Partida de la otra cuenta, cerrada desde el panel.
    const r = await jugador.page.request.post('/api/partidas', { data: { modo: 'liga', numParticipantes: 4 } });
    const { id } = (await r.json()) as { id: string };
    await jugador.page.goto(`/partidas/${id}/sala`);
    await expect(jugador.page.getByRole('heading', { name: 'Sala' })).toBeVisible();
    await mostrarSoloPartida(admin.page, id);
    await admin.page.getByRole('tab', { name: 'Partidas' }).click();
    await admin.page.getByRole('button', { name: /Liga/ }).first().click();
    // La base de datos de desarrollo puede tener otras partidas: solo se cierra la de esta prueba.
    await expect(admin.page.getByLabel('Detalle de la partida').getByText(id, { exact: true })).toBeVisible();
    await admin.page.unroute(LISTA_PARTIDAS);
    await admin.page.getByRole('button', { name: 'Cerrar partida' }).click();
    await confirmar(admin.page, 'Cerrar partida');
    await expect(jugador.page.getByText('Un administrador ha cerrado esta partida. No se reparten premios.')).toBeVisible();
    await expect(jugador.page).toHaveURL(/\/$/);

    // Suspensión con la sesión abierta, dentro de una partida.
    const otra = await jugador.page.request.post('/api/partidas', { data: { modo: 'liga', numParticipantes: 4 } });
    await jugador.page.goto(`/partidas/${((await otra.json()) as { id: string }).id}/sala`);
    await expect(jugador.page.getByRole('heading', { name: 'Sala' })).toBeVisible();
    await elegirCuenta(admin.page, jugador.email);
    await admin.page.getByRole('button', { name: 'Suspender' }).click();
    await confirmar(admin.page, 'Suspender');
    await expect(jugador.page.getByText('Tu sesión ha terminado')).toBeVisible({ timeout: 6_000 });
    const login = await jugador.page.request.post('/api/auth/login', { data: { email: jugador.email, password: PASSWORD } });
    expect(login.status()).toBe(403);

    // Registro.
    await admin.page.getByRole('tab', { name: 'Registro' }).click();
    await expect(admin.page.getByRole('tabpanel').getByRole('listitem').filter({ hasText: 'Suspender cuenta' }).first()).toBeVisible();
  } finally {
    fijarRol(admin.email, 'jugador');
  }
});
