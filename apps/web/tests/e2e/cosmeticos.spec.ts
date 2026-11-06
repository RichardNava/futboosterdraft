import { expect, test, type Page } from '@playwright/test';
import { partidaTrasDraft, registrar } from './ayudas';

/**
 * Cosméticos (spec 011; quickstart, recorridos 1–8 y 10): escudo elegido en el perfil y visto en el partido, sobres
 * en carrusel con su apertura y compra de cosméticos en la tienda. Sin paquetes de fragmentos, el saldo se da con
 * `/api/dev/fragmentos` (solo con el reloj simulado).
 */

const darFragmentos = async (page: Page, fragmentos: number) =>
  expect((await page.request.post('/api/dev/fragmentos', { data: { fragmentos } })).status()).toBe(200);

async function completarDraft(page: Page): Promise<string> {
  const r = await page.request.post('/api/partidas', { data: { modo: 'liga', numParticipantes: 4, plazasHumanas: 1 } });
  expect(r.status()).toBe(201);
  const { id } = (await r.json()) as { id: string };
  await page.request.post(`/api/partidas/${id}/iniciar`);
  for (let i = 0; i < 60; i++) {
    const estado = ((await (await page.request.get(`/api/partidas/${id}`)).json()) as { estado: string }).estado;
    if (estado === 'en_torneo') return id;
    await page.request.post('/api/dev/reloj/avanzar', { data: { ms: 54_000 } });
    await page.waitForTimeout(50);
  }
  throw new Error('El draft no terminó');
}

test.describe('escudos', () => {
  test('una cuenta nueva elige un escudo gratuito y lo ve en el marcador y el resumen (US1)', async ({ page }) => {
    await registrar(page);
    await page.goto('/perfil');
    const escudos = page.getByRole('group', { name: 'Escudo' });
    await escudos.getByRole('button', { name: 'Lobo' }).click();
    await expect(escudos.getByRole('button', { name: 'Lobo' })).toHaveAttribute('aria-pressed', 'true');

    const id = await completarDraft(page);
    await page.goto(`/partidas/${id}/torneo`);
    await page.getByRole('button', { name: 'Comenzar partido' }).click();
    const marcador = page.locator('.marcador');
    await expect(marcador.getByTestId('escudo-local')).toBeVisible();
    await expect(marcador.getByTestId('escudo-visitante')).toBeVisible();
    await expect(marcador.locator('img[src*="escudo-lobo-64"]')).toHaveCount(1);
    await page.getByRole('button', { name: 'Seguir' }).click();
    await expect(page.locator('.resultado .fase')).toHaveText('Final');
    const eventos = page.locator('.resumen-eventos .evento');
    if ((await eventos.count()) > 0) await expect(page.locator('.resumen-eventos .chapa-escudo').first()).toBeVisible();
  });

  test('un invitado sin elegir ve el círculo y en la Alineación solo escudos gratuitos (US1-6)', async ({ page }) => {
    const id = await partidaTrasDraft(page);
    await page.goto(`/partidas/${id}/alineacion`);
    await page.getByRole('tab', { name: 'Personalización' }).click();
    const selector = page.getByRole('group', { name: 'Escudo del equipo en esta partida' });
    await expect(selector.locator('button[data-cosmetico]')).toHaveCount(18);
    await expect(selector.locator('.cosmetico-bloqueado')).toHaveCount(0);
    await page.goto(`/partidas/${id}/torneo`);
    await page.getByRole('button', { name: 'Comenzar partido' }).click();
    // El NPC lleva su escudo; el invitado, el círculo de color.
    await expect(page.locator('.marcador img.chapa-escudo')).toHaveCount(1);
    await expect(page.locator('.marcador span.chapa')).toHaveCount(1);
  });
});

test.describe('sobres', () => {
  test('con dos diseños en carrusel, las aperturas de la tienda alternan los dos (US2)', async ({ page }) => {
    await registrar(page);
    for (const id of ['sobre-1', 'sobre-2']) {
      const r = await page.request.post(`/api/tienda/cosmeticos/${id}/comprar`, { data: { idCompra: crypto.randomUUID(), moneda: 'eur' } });
      expect(r.status()).toBe(200);
    }
    await page.goto('/perfil');
    // El interruptor cambia al guardarse en el servidor.
    await page.getByRole('switch', { name: 'Carrusel' }).click();
    await expect(page.getByRole('switch', { name: 'Carrusel' })).toBeChecked();
    const carrusel = page.getByRole('group', { name: 'Sobres del carrusel' });
    for (const nombre of ['Sobre 1', 'Sobre 2']) {
      await carrusel.getByRole('checkbox', { name: nombre }).click();
      await expect(carrusel.getByRole('checkbox', { name: nombre })).toHaveAttribute('aria-checked', 'true');
    }

    await darFragmentos(page, 2000);
    await page.goto('/tienda');
    const vistos: string[] = [];
    for (let i = 0; i < 2; i++) {
      await page.getByRole('button', { name: 'Comprar por 1.000 fragmentos' }).click();
      const apertura = page.getByRole('dialog', { name: 'Apertura del sobre' });
      await expect(apertura).toBeVisible();
      const src = (await apertura.locator('img.sobre-arte').first().getAttribute('src')) ?? '';
      vistos.push(src);
      await page.getByRole('button', { name: 'Saltar' }).click();
      await page.getByRole('region', { name: 'Tu sobre' }).getByRole('button', { name: 'Seguir comprando' }).click();
    }
    expect(vistos.map((s) => /sobre-(\d)\.webp/.exec(s)?.[1]).sort()).toEqual(['1', '2']);
  });
});

test.describe('tienda', () => {
  test('comprar un escudo con fragmentos y doble pulsación: un cargo, «Comprado» y desbloqueado en el perfil (US3)', async ({ page }) => {
    await registrar(page);
    await darFragmentos(page, 250);
    await page.goto('/tienda#escudos');
    await page.locator('[data-cosmetico="escudo-premium-1"]').getByRole('button', { name: '250 fragmentos' }).click();
    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toContainText('250 fragmentos');
    await dialogo.getByRole('button', { name: 'Confirmar compra' }).dblclick();
    await expect(page.locator('[data-cosmetico="escudo-premium-1"]')).toContainText('Comprado');
    await expect(page.locator('[data-pack="pack-escudos-1"]')).toContainText('Ya tienes alguno');
    await expect(page.locator('.saldo-navegacion')).toContainText('0');
    const movimientos = (await (await page.request.get('/api/fragmentos/movimientos')).json()) as { movimientos: { motivo: string }[] };
    expect(movimientos.movimientos.filter((m) => m.motivo === 'compra_cosmetico')).toHaveLength(1);

    await page.goto('/perfil');
    const escudos = page.getByRole('group', { name: 'Escudo' });
    await escudos.getByRole('button', { name: 'Premium 1' }).click();
    await expect(escudos.getByRole('button', { name: 'Premium 1' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('un invitado ve el catálogo y al comprar se le pide crear cuenta (US3-3)', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Jugar como invitado' }).click();
    await page.goto('/tienda');
    await page.locator('[data-cosmetico="escudo-premium-2"]').getByRole('button', { name: /^0,25/ }).click();
    await expect(page.getByRole('dialog', { name: 'Crea tu cuenta para comprar' })).toBeVisible();
  });
});
