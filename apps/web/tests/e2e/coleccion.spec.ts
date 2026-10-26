import { expect, test } from '@playwright/test';
import { registrar } from './ayudas';

/**
 * Colección (spec 006, US1 y US2; quickstart A a E): acceso solo para registrados, 300 cartas de Core, búsqueda,
 * orden, paginador, preferencias que se conservan, ficha y mínimo de la colección activa.
 */

test('«Colección» solo aparece para registrados; sin sesión pide entrar y un invitado ve la invitación', async ({ page }) => {
  await page.goto('/coleccion');
  await expect(page).toHaveURL(/acceso=entrar/);
  await expect(page.getByRole('link', { name: 'Colección' })).toHaveCount(0);

  await page.goto('/');
  await page.getByRole('button', { name: 'Jugar como invitado' }).click();
  await expect(page.getByRole('heading', { name: 'Nueva partida' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Colección' })).toHaveCount(0);
  await page.goto('/coleccion');
  await expect(page.getByText('La colección y la tienda son para usuarios registrados', { exact: false })).toBeVisible();
});

test('300 cartas, búsqueda sin tildes, orden por nacionalidad, última página, preferencias y ficha (US1)', async ({ page }) => {
  await registrar(page);
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Colección' }).first()).toBeVisible();
  await page.goto('/coleccion');
  await expect(page.getByRole('heading', { name: 'Colección' })).toBeVisible();
  await expect(page.locator('.coleccion-resumen')).toContainText('300');
  await expect(page.locator('.coleccion-resumen')).toContainText('Cumple el mínimo');

  await page.getByRole('searchbox', { name: 'Buscar por nombre' }).fill('VALOTAL');
  await expect(page.locator('.coleccion-carta')).toHaveCount(1);
  await expect(page.locator('.coleccion-carta')).toContainText('Teo Valotal');
  await page.getByRole('button', { name: 'Borrar', exact: true }).click();

  await page.getByLabel('Ordenar por').selectOption('nacionalidad');
  await page.getByRole('button', { name: /Orden ascendente/ }).click();
  // Paginador encima y debajo de la rejilla, con la página actual y las cuatro siguientes.
  const abajo = page.getByRole('navigation', { name: 'Páginas', exact: true });
  await expect(page.getByRole('navigation', { name: 'Páginas (arriba)' })).toBeVisible();
  await expect(abajo.getByRole('button', { name: /^Página \d+$/ })).toHaveCount(5);
  await abajo.getByRole('button', { name: 'Página 5' }).click();
  await expect(abajo.getByRole('button', { name: 'Página 5' })).toHaveAttribute('aria-current', 'page');
  await abajo.getByRole('button', { name: 'Última' }).click();
  await expect(abajo.getByText(/Página (\d+) de \1/)).toBeVisible();

  await page.getByRole('radio', { name: 'Grande' }).click();
  await page.reload();
  await expect(page.getByRole('radio', { name: 'Grande' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByLabel('Ordenar por')).toHaveValue('nacionalidad');
  await expect(page.getByRole('button', { name: /Orden descendente/ })).toBeVisible();

  await page.locator('.coleccion-carta .carta-cuerpo').first().click();
  const ficha = page.getByRole('dialog');
  await expect(ficha).toContainText('Las cartas de Core no se pueden desfragmentar');
  await expect(ficha).toContainText('Core');
  await page.keyboard.press('Escape');
  await expect(ficha).toHaveCount(0);
});

test('con solo Core, desactivar una carta se impide y explica el mínimo (US2, escenario 3)', async ({ page }) => {
  await registrar(page);
  await page.goto('/coleccion');
  const interruptor = page.getByRole('switch').first();
  await expect(interruptor).toHaveAttribute('aria-disabled', 'true');
  await interruptor.click({ force: true });
  await expect(page.getByText(/Mínimo de (POR|DEF|MED|DEL) \S+: \d+; tienes \d+ activas/).first()).toBeVisible();
  await expect(interruptor).toBeChecked();
});
