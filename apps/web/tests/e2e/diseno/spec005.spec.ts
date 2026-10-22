import { expect, test, type Page } from '@playwright/test';
import { comprobarDiseno } from './comprobaciones';

/**
 * Pantallas de la spec 005 (T104, T105): cartas con dos filas de rasgos, sala de duelos y pantalla de duelos, con las
 * comprobaciones comunes de diseño (sin desplazamiento horizontal, axe WCAG 2.1 AA, foco) a 1366 × 768 y 360 × 640.
 * Con `CAPTURAS=<carpeta>` guarda una captura de cada pantalla y ancho para la revisión visual.
 */

const ANCHOS = [
  { ancho: 1366, alto: 768 },
  { ancho: 360, alto: 640 },
] as const;

async function capturar(page: Page, nombre: string) {
  if (!process.env.CAPTURAS) return;
  for (const { ancho, alto } of ANCHOS) {
    await page.setViewportSize({ width: ancho, height: alto });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${process.env.CAPTURAS}/005-${nombre}-${ancho}.png` });
  }
}

async function salaDuelos(page: Page): Promise<string> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Jugar como invitado' }).click();
  await page.getByRole('radio', { name: /Duelo de jugadores/ }).check();
  await page.getByRole('button', { name: 'Crear partida' }).click();
  await expect(page.getByRole('region', { name: 'Duelo de jugadores' })).toBeVisible();
  return page.url().match(/partidas\/([^/]+)\/sala/)![1]!;
}

test('cartas con virtudes y defectos (pruebas de cartas)', async ({ page }) => {
  await page.goto('/_pruebas/cartas');
  await expect(page.locator('.carta-defecto').first()).toBeVisible();
  await comprobarDiseno(page, 'cartas con defectos', { anchos: ANCHOS, pasosTab: 0 });
  await capturar(page, 'cartas');
});

test('sala del modo Duelo de jugadores', async ({ page }) => {
  await salaDuelos(page);
  await comprobarDiseno(page, 'sala de duelos', { anchos: ANCHOS });
  await capturar(page, 'sala-duelos');
});

test('pantalla de duelos y su resumen', async ({ page }) => {
  const id = await salaDuelos(page);
  await page.getByRole('button', { name: 'Empezar' }).click();
  for (let i = 0; i < 60; i++) {
    if (((await (await page.request.get(`/api/partidas/${id}`)).json()) as { estado: string }).estado === 'en_torneo') break;
    await page.request.post('/api/dev/reloj/avanzar', { data: { ms: 54_000 } });
    await page.waitForTimeout(50);
  }
  const vista = await (await page.request.get(`/api/partidas/${id}/alineacion`)).json();
  await page.request.put(`/api/partidas/${id}/alineacion`, { data: vista.alineacion });
  const torneo = await (await page.request.get(`/api/partidas/${id}/torneo`)).json();
  const pendiente = torneo.pendientesDeVer[0] as string;
  await page.goto(`/partidas/${id}/duelos/${pendiente}`);
  await expect(page.locator('.duelo-escenario')).toBeVisible();
  await expect(page.locator('.duelos-marcador')).toHaveAttribute('aria-live', 'polite');
  await capturar(page, 'duelos');
  await page.getByRole('button', { name: 'Saltar al resultado' }).click();
  await expect(page.getByRole('region', { name: 'Resumen de los duelos' })).toBeVisible();
  await comprobarDiseno(page, 'resumen de duelos', { anchos: ANCHOS });
  await capturar(page, 'duelos-resumen');
});
