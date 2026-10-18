import { expect, test, type Locator, type Page } from '@playwright/test';
import { partidaTrasDraft } from './ayudas';

// El campo de colocación entero a la vista, para arrastrar con el ratón.
test.use({ viewport: { width: 1280, height: 1400 } });

/** Escenario I del quickstart (US7; FR-034): colocación libre de los titulares, con ratón y con teclado. */

interface Carta {
  id: number;
  nombre: string;
  apellidos: string;
}
interface Datos {
  alineacion: { titulares: { casillaId: string; jugadorId: number }[] };
  plantilla: Carta[];
}

const campo = (page: Page) => page.getByLabel('Colocación de los titulares');

/** Ficha de un titular en el campo de colocación. */
function ficha(page: Page, j: Carta): Locator {
  return campo(page).getByRole('button', { name: new RegExp(`^${j.nombre} ${j.apellidos}: `) });
}

/** Arrastra una ficha al punto (x, y) en coordenadas del equipo (x 0–1000 hacia arriba, y 0–640). */
async function arrastrar(page: Page, j: Carta, x: number, y: number): Promise<void> {
  await campo(page).scrollIntoViewIfNeeded();
  const caja = (await campo(page).boundingBox())!;
  const origen = (await ficha(page, j).boundingBox())!;
  await page.mouse.move(origen.x + origen.width / 2, origen.y + origen.height / 2);
  await page.mouse.down();
  await page.mouse.move(caja.x + (y / 640) * caja.width, caja.y + caja.height - (x / 1000) * caja.height, { steps: 8 });
  await page.mouse.up();
}

async function abrir(page: Page, formacion: string) {
  const partidaId = await partidaTrasDraft(page);
  await page.goto(`/partidas/${partidaId}/alineacion`);
  await expect(page.getByRole('heading', { name: 'Alineación' })).toBeVisible();
  await page.getByLabel('Formación').selectOption(formacion);
  const datos = (await (await page.request.get(`/api/partidas/${partidaId}/alineacion`)).json()) as Datos;
  const porId = new Map(datos.plantilla.map((j) => [j.id, j]));
  /** Jugador que la pantalla tiene ahora en una casilla (según su ficha en el campo de la alineación). */
  const enCasilla = async (etiqueta: string) => {
    const nombre = (await page.getByRole('button', { name: new RegExp(`^${etiqueta}: `) }).first().getAttribute('aria-label'))!.split(': ')[1]!;
    return datos.plantilla.find((j) => `${j.nombre} ${j.apellidos}` === nombre.split(',')[0])!;
  };
  return { partidaId, porId, enCasilla };
}

test('4-3-3: retrasar al DC lo convierte en SD; el portero no sale de su zona (pasos 1 y 2)', async ({ page }) => {
  const { enCasilla } = await abrir(page, '4-3-3');
  const dc = await enCasilla('DC');
  await expect(ficha(page, dc)).toHaveAccessibleName(/: DC$/);
  await arrastrar(page, dc, 700, 320);
  await expect(ficha(page, dc)).toHaveAccessibleName(/: SD$/);
  await expect(page.getByText(/Formación personalizada/)).toBeVisible();

  // El portero no puede salir de la zona de portería.
  const portero = await enCasilla('POR');
  await arrastrar(page, portero, 500, 320);
  await expect(ficha(page, portero)).toHaveAccessibleName(/: POR$/);
  const caja = (await campo(page).boundingBox())!;
  const p = (await ficha(page, portero).boundingBox())!;
  // Su centro sigue en la franja de la portería (x < 110 de 1000).
  expect((caja.y + caja.height - (p.y + p.height / 2)) / caja.height).toBeLessThan(0.12);
});

test('4-4-2: un MC en la zona de delanteros da una formación personalizada 4-3-3 con ofensividad +1, y se guarda al confirmar (pasos 3 y 4)', async ({ page }) => {
  const { partidaId, enCasilla } = await abrir(page, '4-4-2');
  const mc = await enCasilla('MC');
  await arrastrar(page, mc, 780, 300);
  await expect(ficha(page, mc)).toHaveAccessibleName(/: DC$/);
  const resumen = page.locator('.colocacion-resumen');
  await expect(resumen).toContainText('Formación personalizada (4-4-2 → 4-3-3)');
  await expect(resumen).toContainText('Defensa 4 · Medio 3 · Ataque 3');
  await expect(resumen).toContainText('Ofensividad +1');

  await page.getByRole('button', { name: /Confirmar/ }).first().click();
  await expect(page.getByRole('status').filter({ hasText: /confirmad|guardad/i }).first()).toBeVisible();
  const guardada = (await (await page.request.get(`/api/partidas/${partidaId}/alineacion`)).json()) as { alineacion: { colocacion?: { jugadorId: number; x: number; y: number }[] } };
  const punto = guardada.alineacion.colocacion?.find((c) => c.jugadorId === mc.id);
  expect(punto).toBeDefined();
  expect(punto!.x).toBeGreaterThan(700);
});

test('alternativa con teclado: seleccionar, mover con las flechas y cancelar con Escape', async ({ page }) => {
  const { enCasilla } = await abrir(page, '4-3-3');
  const dc = await enCasilla('DC');
  const f = ficha(page, dc);
  await f.focus();
  await page.keyboard.press('Enter');
  await expect(f).toHaveAttribute('aria-pressed', 'true');
  // Seis pasos de 10 hacia atrás: de x = 760 a 700, zona de SD.
  for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowDown');
  await expect(f).toHaveAccessibleName(/: SD, moviendo con las flechas$/);
  await page.keyboard.press('Escape');
  await expect(f).toHaveAccessibleName(/: DC$/);
  await expect(f).toHaveAttribute('aria-pressed', 'false');
});
