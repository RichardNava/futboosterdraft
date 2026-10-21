import { expect, test } from '@playwright/test';

/** Menú de navegación en móvil (spec 004, FR-012a; research R8; contracts/ui.md §2). */

test.use({ viewport: { width: 360, height: 640 } });

test('a 360 px, «Menú» abre un diálogo con los enlaces y el sonido; Escape, «Cerrar» y un enlace lo cierran', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Jugar como invitado' }).click();
  await expect(page.getByRole('heading', { name: 'Nueva partida' })).toBeVisible();

  const barra = page.getByRole('navigation', { name: 'Navegación principal' });
  await expect(barra.getByRole('link', { name: 'Fútboosterdraft' })).toBeVisible();
  const menu = barra.getByRole('button', { name: 'Menú' });
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  const controla = await menu.getAttribute('aria-controls');
  expect(controla).toBeTruthy();

  // Abrir y cerrar con Escape: el foco vuelve a «Menú».
  await menu.click();
  const panel = page.getByRole('dialog', { name: 'Menú' });
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute('id', controla!);
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  for (const enlace of ['Inicio', 'Mis partidas', 'Nueva partida', 'Mi perfil']) await expect(panel.getByRole('link', { name: enlace })).toBeVisible();
  await expect(panel.getByRole('button', { name: /sonidos/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(menu).toBeFocused();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');

  // «Cerrar».
  await menu.click();
  await panel.getByRole('button', { name: 'Cerrar' }).click();
  await expect(panel).toBeHidden();
  await expect(menu).toBeFocused();

  // Elegir un enlace lleva a su pantalla y cierra el panel.
  await menu.click();
  await panel.getByRole('link', { name: 'Mis partidas' }).click();
  await expect(page.getByRole('heading', { name: 'Mis partidas' })).toBeVisible();
  await expect(panel).toBeHidden();

  // Tras cerrarse, el botón principal se ve y se puede pulsar.
  const principal = page.locator('[data-principal]');
  await expect(principal).toBeInViewport();
  await principal.click();
  await expect(page.getByRole('heading', { name: 'Nueva partida' })).toBeVisible();
});

test('a 1366 px no hay botón «Menú»: los enlaces están en la barra', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/');
  const barra = page.getByRole('navigation', { name: 'Navegación principal' });
  await expect(barra.getByRole('button', { name: 'Menú' })).toBeHidden();
  await expect(barra.getByRole('link', { name: 'Inicio' })).toHaveAttribute('aria-current', 'page');
  await expect(barra.getByRole('link', { name: 'Mis partidas' })).toBeVisible();
});
