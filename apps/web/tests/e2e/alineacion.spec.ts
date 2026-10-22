import { expect, test, type Locator, type Page } from '@playwright/test';
import { arrastrarSobre, partidaTrasDraft } from './ayudas';

/** Escenario B del quickstart de la spec 003: «Formación» con un único campo (US2, escenarios 1 a 7). */

const ficha = (page: Page, casilla: string) => page.locator(`.ficha-equipo[data-casilla="${casilla}"]`);

/** Arrastra un elemento hasta un punto de la pantalla con el ratón (Pointer Events). */
async function arrastrar(page: Page, origen: Locator, hasta: { x: number; y: number }) {
  const caja = (await origen.boundingBox())!;
  await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
  await page.mouse.down();
  await page.mouse.move(caja.x + caja.width / 2 + 10, caja.y + caja.height / 2 + 10, { steps: 3 });
  await page.mouse.move(hasta.x, hasta.y, { steps: 8 });
  await page.mouse.up();
}

const centro = async (l: Locator) => {
  const c = (await l.boundingBox())!;
  return { x: c.x + c.width / 2, y: c.y + c.height / 2 };
};

async function abrirFormacion(page: Page) {
  const partidaId = await partidaTrasDraft(page);
  await page.goto(`/partidas/${partidaId}/alineacion`);
  await expect(page.getByRole('heading', { name: 'Formación' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Formación' }).selectOption('4-4-2');
  return partidaId;
}

test('un solo campo: recolocar, intercambiar titulares y meter a un suplente', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await abrirFormacion(page);
  // No hay un segundo campo de colocación (FR-001).
  await expect(page.locator('[aria-label="Colocación"]')).toHaveCount(0);
  await expect(page.getByTestId('campo-equipo')).toHaveCount(1);

  // Recolocar al delantero centro en la banda: cambia su posición efectiva.
  const campo = (await page.getByTestId('campo-equipo').boundingBox())!;
  const dc = ficha(page, 'DC');
  const idDc = await dc.getAttribute('data-jugador');
  await arrastrar(page, dc, { x: campo.x + campo.width * 0.08, y: campo.y + campo.height * 0.2 });
  await expect(page.locator(`.ficha-equipo[data-jugador="${idDc}"]`)).not.toHaveAttribute('data-posicion', 'DC');

  // Soltar un titular sobre otro: intercambian casillas.
  const ld = ficha(page, 'LD');
  const idLd = await ld.getAttribute('data-jugador');
  await arrastrar(page, page.locator(`.ficha-equipo[data-jugador="${idDc}"]`), await centro(ld));
  await expect(page.locator(`.ficha-equipo[data-jugador="${idDc}"]`)).toHaveAttribute('data-casilla', 'LD');
  await expect(page.locator(`.ficha-equipo[data-jugador="${idLd}"]`)).toHaveAttribute('data-casilla', 'DC');
  // Un jugador fuera de sus posiciones queda penalizado (salvo que juegue de LD o sea Todocampista: depende del draft).
  const partidaId = /partidas\/([^/]+)\//.exec(page.url())![1];
  const { plantilla } = (await (await page.request.get(`/api/partidas/${partidaId}/alineacion`)).json()) as { plantilla: { id: number; posicion: string[]; virtudes: string[] }[] };
  const movido = plantilla.find((j) => j.id === Number(idDc))!;
  if (!movido.posicion.includes('LD') && !movido.virtudes.includes('Todocampista')) {
    await expect(page.locator(`.ficha-equipo[data-jugador="${idDc}"]`)).toHaveAccessibleName(/fuera de posición/);
  }

  // Un suplente sobre un titular: el titular pasa al banquillo.
  const suplente = page.getByTestId('banquillo').locator('.ficha-lista').first();
  const idSuplente = await suplente.getAttribute('data-jugador');
  const mc = ficha(page, 'MC-1');
  const idMc = await mc.getAttribute('data-jugador');
  await arrastrar(page, suplente, await centro(mc));
  await expect(page.locator(`.ficha-equipo[data-jugador="${idSuplente}"]`)).toHaveAttribute('data-casilla', 'MC-1');
  await expect(page.getByTestId("banquillo").locator(`.ficha-lista[data-jugador="${idMc}"]`)).toHaveCount(1);

  // Soltar fuera del campo y del banquillo no cambia nada.
  await arrastrar(page, ficha(page, 'SD'), { x: 5, y: 5 });
  await expect(ficha(page, 'SD')).toHaveCount(1);

  // Con recolocaciones, cambiar de formación pide confirmación (FR-002a).
  await page.getByRole('combobox', { name: 'Formación' }).selectOption('4-3-3');
  await expect(page.getByRole('alertdialog')).toContainText('Se perderá la colocación personalizada');
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByRole('combobox', { name: 'Formación' })).toHaveValue('4-4-2');

  await page.locator('[data-principal]').click();
  await expect(page.getByRole('status').filter({ hasText: 'Alineación confirmada' })).toBeVisible();
});

for (const vp of [
  { width: 1366, height: 768 },
  { width: 360, height: 640 },
]) {
  test(`carta ampliada a ${vp.width}×${vp.height}: aparece en < 500 ms, no tapa la ficha y queda en pantalla`, async ({ page }) => {
    await page.setViewportSize(vp);
    await abrirFormacion(page);
    for (const casilla of ['POR', 'DC', 'LD', 'LI']) {
      const f = ficha(page, casilla);
      await f.scrollIntoViewIfNeeded();
      const inicio = Date.now();
      await f.hover();
      const vista = page.getByTestId('vista-carta');
      await expect(vista).toBeVisible({ timeout: 500 });
      expect(Date.now() - inicio).toBeLessThan(1000);
      const v = (await vista.boundingBox())!;
      const c = (await f.boundingBox())!;
      // Una carta, no una franja (hallazgo H3): ancho de carta y proporción cercana a 5:7.
      const carta = (await vista.locator('.carta').boundingBox())!;
      expect(carta.width).toBeGreaterThanOrEqual(Math.min(200, vp.width - 32));
      expect(carta.height / carta.width).toBeLessThan(1.8);
      expect(v.x).toBeGreaterThanOrEqual(7);
      expect(v.y).toBeGreaterThanOrEqual(7);
      expect(v.x + v.width).toBeLessThanOrEqual(vp.width - 7);
      expect(v.y + v.height).toBeLessThanOrEqual(vp.height - 7);
      if (vp.width > 1000) {
        const solapa = v.x < c.x + c.width && v.x + v.width > c.x && v.y < c.y + c.height && v.y + v.height > c.y;
        expect(solapa).toBe(false);
      }
      await page.mouse.move(1, 1);
      await expect(vista).toHaveCount(0);
    }
  });
}

test('la carta ampliada no aparece durante un arrastre', async ({ page }) => {
  await abrirFormacion(page);
  const dc = ficha(page, 'DC');
  const c = await centro(dc);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + 40, c.y + 40, { steps: 5 });
  await page.waitForTimeout(400);
  await expect(page.getByTestId('vista-carta')).toHaveCount(0);
  await page.mouse.up();
});

test.describe('táctil', () => {
  test.use({ hasTouch: true, viewport: { width: 360, height: 640 } });
  test('pulsación larga muestra la carta', async ({ page }) => {
    await abrirFormacion(page);
    const f = ficha(page, 'DC');
    await f.scrollIntoViewIfNeeded();
    await f.dispatchEvent('pointerdown', { pointerType: 'touch', clientX: 0, clientY: 0, button: 0, isPrimary: true });
    await expect(page.getByTestId('vista-carta')).toBeVisible({ timeout: 1000 });
    await f.dispatchEvent('pointerup', { pointerType: 'touch', button: 0, isPrimary: true });
    await expect(page.getByTestId('vista-carta')).toHaveCount(0);
  });
});

test('un portero fuera de la portería desactiva «Confirmar alineación» y muestra el motivo', async ({ page }) => {
  await abrirFormacion(page);
  // Con el portero y la zona de destino a la vista: a media altura del campo, pegado a la banda derecha.
  await ficha(page, 'POR').scrollIntoViewIfNeeded();
  const campo = (await page.getByTestId('campo-equipo').boundingBox())!;
  const vista = page.viewportSize()!;
  await arrastrar(page, ficha(page, 'POR'), { x: campo.x + campo.width * 0.92, y: Math.min(vista.height - 20, campo.y + campo.height * 0.75) });
  const principal = page.locator('[data-principal]');
  await expect(principal).toHaveText('Confirmar alineación');
  await expect(principal).toHaveAttribute('aria-disabled', 'true');
  const id = await principal.getAttribute('aria-describedby');
  await expect(page.locator(`[id="${id}"]`)).not.toBeEmpty();
});

test('banquillo y resto de la plantilla: se intercambian arrastrando y con el teclado (hallazgo H4)', async ({ page }) => {
  await abrirFormacion(page);
  const banquillo = page.getByTestId('banquillo');
  const resto = page.getByTestId('reserva');
  const ids = async (l: typeof banquillo) => l.locator('.ficha-lista[data-jugador]').evaluateAll((els) => els.map((e) => Number((e as HTMLElement).dataset.jugador)));

  // Arrastrando: un jugador del resto sobre un suplente ocupa su sitio, y el suplente pasa al resto.
  const suplente = (await ids(banquillo))[0]!;
  const delResto = (await ids(resto))[0]!;
  await resto.locator(`.ficha-lista[data-jugador="${delResto}"]`).scrollIntoViewIfNeeded();
  await arrastrarSobre(page, resto.locator(`.ficha-lista[data-jugador="${delResto}"]`), banquillo.locator(`.ficha-lista[data-jugador="${suplente}"]`));
  await expect.poll(() => ids(banquillo)).toContain(delResto);
  expect(await ids(banquillo)).not.toContain(suplente);
  expect(await ids(resto)).toContain(suplente);

  // Con el teclado: seleccionar un suplente con Intro y pulsar Intro sobre uno del resto.
  const otroSuplente = (await ids(banquillo))[1]!;
  const otroResto = (await ids(resto))[1]!;
  await banquillo.locator(`.ficha-lista[data-jugador="${otroSuplente}"]`).focus();
  await page.keyboard.press('Enter');
  await resto.locator(`.ficha-lista[data-jugador="${otroResto}"]`).focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => ids(banquillo)).toContain(otroResto);
  expect(await ids(resto)).toContain(otroSuplente);
});

test('«Confirmar alineación» guarda y lleva al torneo; «Formación» no tiene selector de modo ni «Comenzar partido» (FR-003b, FR-032)', async ({ page }) => {
  await abrirFormacion(page);
  await expect(page.getByLabel('Simulación rápida')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Comenzar partido' })).toHaveCount(0);
  await expect(page.locator('[data-principal]')).toHaveText('Confirmar alineación');
  await page.locator('[data-principal]').click();
  await expect(page).toHaveURL(/\/torneo$/);
  await expect(page.getByRole('heading', { name: 'Torneo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Comenzar partido' })).toBeVisible();
});
