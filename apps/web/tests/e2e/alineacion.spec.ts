import { expect, test, type Page } from '@playwright/test';
import { partidaTrasDraft } from './ayudas';

/** Escenario B del quickstart: preparación del equipo (Historia 2). */

interface Carta {
  id: number;
  nombre: string;
  apellidos: string;
  demarcacion: string;
  posicion: string[];
  specials: string[];
}

/**
 * Penalización en una casilla de defensa de un jugador que no tiene posiciones de defensa (FR-032): la menor
 * entre todas sus posiciones como origen (un MED puede tener también posiciones de DEL).
 */
const DEL = ['DC', 'SD', 'EI', 'ED'];
const penalizacionMedEnDefensa = (j: Carta) =>
  Math.min(...j.posicion.map((p) => (p === 'MCO' ? 30 : p === 'MD' ? 10 : DEL.includes(p) ? 40 : 20)));

const casilla = (page: Page, etiqueta: string) => page.getByRole('button', { name: new RegExp(`^${etiqueta.replace('/', '\\/')}:`) });

/** Selecciona a un jugador esté donde esté (campo, banquillo o resto) y lo coloca en una casilla. */
async function colocar(page: Page, j: Carta, etiqueta: string) {
  const nombre = `${j.nombre} ${j.apellidos}`;
  const enCampo = page.getByRole('button', { name: new RegExp(`: ${nombre}`) });
  if (await enCampo.count()) await enCampo.first().click();
  else await page.locator('.lista-compacta .carta-cuerpo', { hasText: j.apellidos.split(' ')[0]! }).first().click();
  await casilla(page, etiqueta).click();
}

test('preparar el equipo: penalizaciones, táctica, lanzadores y confirmación', async ({ page }) => {
  const partidaId = await partidaTrasDraft(page);
  const datos = (await (await page.request.get(`/api/partidas/${partidaId}/alineacion`)).json()) as { plantilla: Carta[] };
  const central = datos.plantilla.find((j) => j.posicion.includes('DCI') || j.posicion.includes('DCD'));
  const medio = datos.plantilla.find((j) => j.demarcacion === 'MED' && !j.specials.includes('Todocampista'));
  const defensa = datos.plantilla.find((j) => j.demarcacion === 'DEF' && j !== central);
  const delantero = datos.plantilla.find((j) => j.demarcacion === 'DEL' && !j.specials.includes('Todocampista'));
  test.skip(!central || !medio || !defensa || !delantero, 'La plantilla del draft no tiene los perfiles necesarios');

  await page.goto(`/partidas/${partidaId}/alineacion`);
  await expect(page.getByRole('heading', { name: 'Alineación' })).toBeVisible();
  await page.getByLabel('Formación').selectOption('3-5-2');

  // Un DCI o DCD en la casilla central de la defensa de 3: sin penalización (FR-025a).
  await colocar(page, central!, 'DCI/DCD');
  await expect(casilla(page, 'DCI/DCD')).not.toHaveAccessibleName(/fuera de posición/);

  // Un medio en esa casilla: fuera de posición, con la penalización de la tabla de FR-032 (escenario H).
  await colocar(page, medio!, 'DCI/DCD');
  await expect(casilla(page, 'DCI/DCD')).toHaveAccessibleName(/fuera de posición/);
  await expect(casilla(page, 'DCI/DCD')).toContainText(`−${penalizacionMedEnDefensa(medio!)} %`);

  // Un delantero en una casilla de defensa: −40 % (menos si también tiene posiciones de medio).
  await colocar(page, delantero!, 'DCD');
  await expect(casilla(page, 'DCD')).toContainText(`−${penalizacionMedEnDefensa(delantero!)} %`);

  // Un defensa en la portería: −60 % y aviso.
  await colocar(page, defensa!, 'POR');
  await expect(page.getByRole('alert')).toContainText('jugador de campo en la portería');
  await expect(casilla(page, 'POR')).toContainText('−60 %');

  // Catenaccio bloquea Línea adelantada.
  await page.getByLabel('Catenaccio').check();
  await expect(page.getByLabel(/Línea adelantada/)).toBeDisabled();

  // Lanzadores propuestos y editables.
  const penaltis = page.getByLabel('Penaltis');
  const propuesto = await penaltis.inputValue();
  expect(propuesto).not.toBe('');
  const opciones = await penaltis.locator('option').evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value));
  await penaltis.selectOption(opciones.find((v) => v !== propuesto)!);

  await page.getByRole('button', { name: 'Confirmar alineación' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Alineación confirmada' })).toBeVisible();
  await expect(page.getByText('Última confirmada: versión 1')).toBeVisible();
});
