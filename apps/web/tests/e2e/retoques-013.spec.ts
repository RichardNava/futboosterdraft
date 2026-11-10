import { expect, test } from '@playwright/test';
import { partidaTrasDraft } from './ayudas';

/** Spec 013 (US6; FR-029, FR-030, SC-009): descripción de rasgo y media del equipo sin fallos visuales. */

test('la descripción de un rasgo nunca se ve sin colocar ni en la esquina', async ({ page }) => {
  await page.goto('/_pruebas/cartas');
  const rasgos = page.locator('.carta.completa .carta-virtud');
  await expect(rasgos.first()).toBeVisible();
  // Cada fotograma: ninguna descripción abierta y visible sin `data-colocada` ni en (0, 0).
  await page.evaluate(() => {
    (window as unknown as { fallos: string[] }).fallos = [];
    const vigilar = () => {
      for (const d of document.querySelectorAll<HTMLElement>('.carta-descripcion:popover-open')) {
        const visible = getComputedStyle(d).visibility !== 'hidden';
        const r = d.getBoundingClientRect();
        if (visible && (!('colocada' in d.dataset) || (r.left === 0 && r.top === 0))) (window as unknown as { fallos: string[] }).fallos.push(d.id);
      }
      requestAnimationFrame(vigilar);
    };
    requestAnimationFrame(vigilar);
  });
  for (let i = 0; i < 12; i++) {
    const caja = (await rasgos.nth(i).boundingBox())!;
    await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2, { steps: 2 });
  }
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => (window as unknown as { fallos: string[] }).fallos)).toEqual([]);
});

test('la media del equipo se ve entera y sobre la estrella del 50 % al 200 % de zoom', async ({ page, browser, baseURL }) => {
  const id = await partidaTrasDraft(page);
  const sesion = await page.context().storageState();
  // El zoom del navegador: la ventana en px CSS se divide por el zoom y la densidad de píxeles se multiplica.
  for (const zoom of [0.5, 1, 1.5, 2]) {
    const contexto = await browser.newContext({
      storageState: sesion,
      baseURL,
      viewport: { width: Math.round(1366 / zoom), height: Math.round(768 / zoom) },
      deviceScaleFactor: zoom,
    });
    const p = await contexto.newPage();
    await p.goto(`/partidas/${id}/alineacion`);
    await expect(p.getByRole('heading', { name: 'Formación' })).toBeVisible();
    const resultado = await p.evaluate(() => {
      const valor = document.querySelector<HTMLElement>('.media-equipo-valor')!;
      valor.scrollIntoView({ block: 'center', inline: 'center' });
      const v = valor.getBoundingClientRect();
      const c = valor.closest<HTMLElement>('.media-equipo-cifra')!.getBoundingClientRect();
      const encima = document.elementFromPoint(v.left + v.width / 2, v.top + v.height / 2);
      return {
        dentro: v.top >= c.top - 1 && v.bottom <= c.bottom + 1 && v.left >= c.left - 1 && v.right <= c.right + 1,
        cifraEncima: encima === valor || (encima !== null && valor.contains(encima)) || `${encima?.tagName}.${encima?.getAttribute('class')}`,
      };
    });
    expect(resultado, `zoom ${zoom}`).toEqual({ dentro: true, cifraEncima: true });
    await contexto.close();
  }
});
