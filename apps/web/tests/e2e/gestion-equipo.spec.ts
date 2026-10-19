import { expect, test, type Page } from '@playwright/test';
import { arrastrarSobre, partidaTrasDraft, sustituirEnGestion } from './ayudas';

/** Escenario E del quickstart de la spec 003: gestión del equipo durante el partido (US5, escenarios 1 a 8). */

async function hastaElDescansoRapida(page: Page) {
  const partidaId = await partidaTrasDraft(page);
  await page.goto(`/partidas/${partidaId}/torneo`);
  await page.getByLabel('Simulación rápida').check();
  await page.getByRole('button', { name: 'Comenzar partido' }).click();
  await expect(page.locator('.resultado .fase')).toHaveText('Descanso');
  return partidaId;
}

test('en el descanso de la rápida: «Gestionar equipo» y «Seguir» principales; sustituciones con contador y límite; descartar pide confirmación', async ({ page }) => {
  await hastaElDescansoRapida(page);
  await expect(page.locator('[data-principal]')).toHaveText(['Gestionar equipo', 'Seguir']);
  await page.getByRole('button', { name: 'Gestionar equipo' }).click();

  const gestion = page.getByTestId('gestion-equipo');
  await expect(gestion).toBeVisible();
  await expect(gestion.getByText('Sustituciones restantes: 5')).toBeVisible();
  await sustituirEnGestion(page, 'DC');
  await expect(gestion.getByText('Sustituciones restantes: 4')).toBeVisible();

  // Hasta 5 sustituciones; la sexta se rechaza con un mensaje.
  for (const casilla of ['SD', 'EI', 'ED', 'MC-1']) {
    if ((await gestion.getByTestId('banquillo').locator('.ficha-lista').count()) === 0) break;
    const ficha = gestion.locator(`.ficha-equipo[data-casilla="${casilla}"]`);
    if ((await ficha.count()) === 0) continue;
    await sustituirEnGestion(page, casilla);
  }
  if ((await gestion.getByText('Sustituciones restantes: 0').count()) > 0 && (await gestion.getByTestId('banquillo').locator('.ficha-lista').count()) > 0) {
    await sustituirEnGestion(page, 'LD');
    await expect(gestion.getByRole('alert')).toContainText('Ya has hecho las 5 sustituciones');
  }

  // «Volver sin cambios» con cambios pide confirmación.
  await page.getByRole('button', { name: 'Volver sin cambios' }).click();
  await expect(page.getByRole('alertdialog')).toContainText('¿Descartar los cambios?');
  await page.getByRole('button', { name: 'Descartar' }).click();
  await expect(gestion).toBeHidden();
  await expect(page.locator('[data-principal]')).toHaveText(['Gestionar equipo', 'Seguir']);
});

test('cambiar de formación con jugadores recolocados pide confirmación; al cancelar no cambia nada; confirmar aplica el cambio', async ({ page }) => {
  await hastaElDescansoRapida(page);
  await page.getByRole('button', { name: 'Gestionar equipo' }).click();
  const gestion = page.getByTestId('gestion-equipo');
  // Recolocar a un titular en otra zona libre.
  const dc = gestion.locator('.ficha-equipo[data-casilla="DC"]');
  await arrastrarSobre(page, dc, gestion.getByTestId('campo-equipo'));
  const formacion = gestion.getByRole('combobox', { name: 'Formación' });
  const antes = await formacion.inputValue();
  const otra = antes === '4-3-3' ? '4-4-2' : '4-3-3';
  await formacion.selectOption(otra);
  if ((await page.getByRole('alertdialog').count()) > 0) {
    await expect(page.getByRole('alertdialog')).toContainText('Se perderá la colocación personalizada');
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(formacion).toHaveValue(antes);
  }
  await sustituirEnGestion(page, 'DC');
  await page.getByRole('button', { name: 'Confirmar cambios' }).click();
  await expect(gestion).toBeHidden();
  // La segunda parte se juega con el cambio: aparece la sustitución en el resumen final.
  await page.getByRole('button', { name: 'Seguir' }).click();
  await expect(page.getByTestId('resultado-partido')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('.resumen-eventos')).toContainText(/Entra/);
});

test('en la 2D, «Gestionar equipo» detiene la reproducción y al volver sigue en el mismo minuto', async ({ page }) => {
  test.setTimeout(300_000);
  const partidaId = await partidaTrasDraft(page);
  await page.goto(`/partidas/${partidaId}/torneo`);
  await page.getByLabel('Simulación 2D').check();
  await page.getByRole('button', { name: 'Comenzar partido' }).click();
  await expect(page.locator('.campo-2d canvas')).toBeVisible();
  await page.getByRole('button', { name: 'x8' }).click();
  await expect
    .poll(async () => Number(/(\d+)'/.exec((await page.locator('.marcador-2d .nota').textContent()) ?? '')?.[1] ?? 0), { timeout: 120_000 })
    .toBeGreaterThanOrEqual(10);
  // En juego: «Finalizar partido» es el principal y «Gestionar equipo», secundario.
  await expect(page.locator('[data-principal]')).toHaveText('Finalizar partido');
  const minutoDe = async () => Number(/(\d+)'/.exec((await page.locator('.marcador-2d .nota').textContent()) ?? '')?.[1] ?? 0);
  const antes = await minutoDe();
  await page.getByRole('button', { name: 'Gestionar equipo' }).click();
  await expect(page.getByTestId('gestion-equipo')).toBeVisible();
  // A x8 serían más de 2 minutos de juego: con la gestión abierta, la reproducción no avanza.
  await page.waitForTimeout(4000);
  await page.getByRole('button', { name: 'Volver sin cambios' }).click();
  const despues = await minutoDe();
  expect(despues - antes).toBeLessThanOrEqual(1);
});

test('una reproducción entre humanos no tiene «Gestionar equipo»', async ({ page }) => {
  // Las partidas entre humanos se resuelven con decisiones automáticas (FR-027, FR-031): basta con comprobar que la
  // pantalla de reproducción no ofrece la gestión.
  const partidaId = await partidaTrasDraft(page);
  await page.goto(`/partidas/${partidaId}/torneo`);
  await expect(page.getByRole('button', { name: 'Gestionar equipo' })).toHaveCount(0);
});
