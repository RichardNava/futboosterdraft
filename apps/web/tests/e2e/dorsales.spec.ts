import { expect, test } from '@playwright/test';
import { partidaTrasDraft } from './ayudas';

/** Escenario J del quickstart (US8; FR-035 a FR-038, SC-014): dorsales del 1 al 24 y reasignación sin duplicados. */

interface Carta {
  id: number;
  nombre: string;
  apellidos: string;
}

test('dorsales del 1 al 24, reasignación con aviso y asignación automática al empezar el partido', async ({ page }) => {
  const partidaId = await partidaTrasDraft(page);
  await page.goto(`/partidas/${partidaId}/alineacion`);
  await page.getByRole('button', { name: 'Confirmar alineación' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Alineación confirmada' })).toBeVisible();

  // 1. Del 1 al 24, sin repetir.
  const datos = (await (await page.request.get(`/api/partidas/${partidaId}/alineacion`)).json()) as { dorsales: Record<string, number>; plantilla: Carta[] };
  expect(Object.values(datos.dorsales).sort((a, b) => a - b)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
  const conDorsal = (n: number) => datos.plantilla.find((j) => datos.dorsales[j.id] === n)!;
  const fila = (j: Carta) => page.locator('.rejilla-dorsales li').filter({ hasText: `${j.nombre} ${j.apellidos.split(' ')[0]}` });
  const editar = async (j: Carta, n: number) => {
    await page.getByLabel(`Nuevo dorsal de ${j.nombre} ${j.apellidos}`).fill(String(n));
    await fila(j).getByRole('button', { name: 'Cambiar' }).click();
  };
  await page.getByText('Dorsales', { exact: true }).click();

  // 2. El 33 al que lleva el 14: el 14 queda libre, sin preguntar.
  const catorce = conDorsal(14);
  await editar(catorce, 33);
  await expect(fila(catorce).locator('.dorsal-actual')).toHaveText('33');

  // 3. El 2 a otro jugador: aviso, se confirma con un clic y el que lo tenía queda «Sin dorsal».
  const dos = conDorsal(2);
  const otro = conDorsal(20);
  await editar(otro, 2);
  const aviso = page.getByRole('alert').filter({ hasText: `El 2 lo lleva ${dos.apellidos.split(' ')[0]}: se quedará sin dorsal` });
  await expect(aviso).toBeVisible();
  await aviso.getByRole('button', { name: 'Confirmar' }).click();
  await expect(fila(otro).locator('.dorsal-actual')).toHaveText('2');
  await expect(fila(dos)).toContainText('Sin dorsal');

  // 4. Convocado (el del 2 es titular) y al empezar: el libre más bajo (el 14) y un aviso.
  await page.getByRole('button', { name: 'Comenzar partido' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Dorsales nuevos' })).toContainText(`${dos.apellidos.split(' ')[0]} lleva el 14`);
});
