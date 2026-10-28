import { expect, test, type Page } from '@playwright/test';

/**
 * Cartas de jugador (US1; FR-001 a FR-005, SC-002; quickstart, escenario A). Usa la ruta de pruebas
 * `/_pruebas/cartas`, que pinta todas las cartas de la colección Core.
 */

/** Elementos de cada carta cuyo contenido desborda (texto cortado o con barra de desplazamiento). */
async function desbordes(page: Page): Promise<string[]> {
  return page.$$eval('.carta.completa', (cartas) =>
    cartas.flatMap((carta) => {
      const problemas: string[] = [];
      const id = carta.getAttribute('data-jugador') ?? '?';
      for (const el of [carta, ...Array.from(carta.querySelectorAll<HTMLElement>('*'))]) {
        if (el.matches('[popover]')) continue;
        if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) {
          problemas.push(`${id}: ${el.className || el.tagName}`);
        }
      }
      return problemas;
    }),
  );
}

async function abrirCartas(page: Page): Promise<void> {
  await page.goto('/_pruebas/cartas');
  await expect(page.locator('.carta.completa').first()).toBeVisible();
}

for (const ancho of [1280, 360]) {
  test(`ninguna carta de la colección Core desborda a ${ancho} px (SC-002)`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 900 });
    await abrirCartas(page);
    expect(await page.locator('.carta.completa').count()).toBeGreaterThan(100);
    expect(await desbordes(page)).toEqual([]);
  });
}

test('disposición: cabecera, posiciones bajo el nombre y pie con 6 stats y las virtudes (FR-001)', async ({ page }) => {
  await abrirCartas(page);
  const carta = page.locator('.carta.completa').first();
  const cabecera = await carta.locator('.carta-cabecera').boundingBox();
  const nombre = await carta.locator('.carta-nombre').boundingBox();
  const posiciones = await carta.locator('.carta-posiciones').boundingBox();
  const pie = await carta.locator('.carta-pie').boundingBox();
  await expect(carta.locator('.carta-silueta')).toBeVisible();
  await expect(carta.locator('.carta-media')).toBeVisible();
  expect(posiciones!.y).toBeGreaterThanOrEqual(nombre!.y + nombre!.height - 1);
  expect(pie!.y).toBeGreaterThan(posiciones!.y);
  expect(cabecera!.y).toBeLessThanOrEqual(nombre!.y);
  await expect(carta.locator('.carta-stat')).toHaveCount(6);
});

test('un GOAT con 4 virtudes muestra los 4 sin desplazamiento (FR-003)', async ({ page }) => {
  await abrirCartas(page);
  const goat = page.locator('.carta.completa[data-nivel="GOAT"][data-virtudes="4"]').first();
  await expect(goat).toBeVisible();
  await expect(goat.locator('.carta-virtud')).toHaveCount(4);
  await goat.scrollIntoViewIfNeeded();
  const marco = (await goat.boundingBox())!;
  for (const s of await goat.locator('.carta-virtud').all()) {
    const caja = (await s.boundingBox())!;
    expect(caja.x).toBeGreaterThanOrEqual(marco.x);
    expect(caja.y).toBeGreaterThanOrEqual(marco.y);
    expect(caja.x + caja.width).toBeLessThanOrEqual(marco.x + marco.width);
    expect(caja.y + caja.height).toBeLessThanOrEqual(marco.y + marco.height);
  }
});

test('pulsar una virtud abre su descripción (FR-004)', async ({ page }) => {
  await abrirCartas(page);
  const virtud = page.locator('.carta.completa .carta-virtud').first();
  await virtud.click();
  const id = await virtud.getAttribute('popovertarget');
  const descripcion = page.locator(`[id="${id}"]`);
  await expect(descripcion).toBeVisible();
  expect((await descripcion.textContent())!.length).toBeGreaterThan(10);
});

test('los cuatro niveles tienen un acabado distinto (FR-002)', async ({ page }) => {
  await abrirCartas(page);
  const marcos = new Set<string>();
  for (const nivel of ['Superclase', 'Epico', 'Legendario', 'GOAT']) {
    const carta = page.locator(`.carta.completa[data-nivel="${nivel}"]`).first();
    await expect(carta).toBeVisible();
    marcos.add(await carta.evaluate((el) => getComputedStyle(el).borderTopColor + getComputedStyle(el).backgroundImage));
  }
  expect(marcos.size).toBe(4);
});

test('spec 007 (FR-004, FR-006b): la carta completa mide 2 : 3 y su fondo es el marco de su nivel', async ({ page }) => {
  await abrirCartas(page);
  for (const nivel of ['superclase', 'epico', 'legendario', 'goat']) {
    const carta = page.locator(`.carta.completa.nivel-${nivel}`).first();
    const { ancho, alto, fondo } = await carta.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { ancho: r.width, alto: r.height, fondo: getComputedStyle(el).backgroundImage };
    });
    expect(Math.abs(ancho / alto - 2 / 3)).toBeLessThan(0.02);
    expect(fondo).toContain(`/cartas/marcos/${nivel}.svg`);
  }
});

/** Spec 003, US7 (FR-008 a FR-010; SC-012; T077): tamaños de letra legibles y acabado por nivel. */
for (const [ancho, minimo] of [
  [1366, 16],
  [360, 14],
] as const) {
  test(`a ${ancho} px los stats y las virtudes de la carta completa miden ≥ ${minimo} px, y el valor es ≥ 1,25 veces la abreviatura`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 900 });
    await abrirCartas(page);
    const medidas = await page.$$eval('.carta.completa', (cartas) =>
      cartas.slice(0, 40).flatMap((c) => {
        const tam = (el: Element) => parseFloat(getComputedStyle(el).fontSize);
        const peso = (el: Element) => Number(getComputedStyle(el).fontWeight);
        const stats = Array.from(c.querySelectorAll('.carta-stat')).map((s) => ({ dt: tam(s.querySelector('dt')!), dd: tam(s.querySelector('dd')!), negrita: peso(s.querySelector('dd')!) }));
        const virtudes = Array.from(c.querySelectorAll('.carta-virtud')).map(tam);
        // Con 5 o 6 rasgos, la letra puede reducirse para que quepan sin cortarse (ronda 2 de la spec 005).
        const densa = c.querySelector('.carta-rasgos.densa') !== null;
        return [{ stats, virtudes, densa }];
      }),
    );
    for (const { stats, virtudes, densa } of medidas) {
      for (const s of stats) {
        expect(s.dt).toBeGreaterThanOrEqual(minimo);
        expect(s.dd).toBeGreaterThanOrEqual(minimo);
        if (ancho > 1000) expect(s.dd / s.dt).toBeGreaterThanOrEqual(1.25 - 1e-6);
        expect(s.negrita).toBeGreaterThanOrEqual(700);
      }
      for (const t of virtudes) expect(t).toBeGreaterThanOrEqual(densa ? minimo * 0.6 - 0.01 : minimo);
    }
  });
}

test('un GOAT con 4 virtudes no desborda la carta (scrollHeight ≤ clientHeight) y las cuatro clases de nivel se aplican', async ({ page }) => {
  await abrirCartas(page);
  const goat = page.locator('.carta.completa[data-nivel="GOAT"][data-virtudes="4"]').first();
  expect(await goat.evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
  for (const clase of ['nivel-superclase', 'nivel-epico', 'nivel-legendario', 'nivel-goat']) await expect(page.locator(`.carta.completa.${clase}`).first()).toBeVisible();
});

test('con movimiento reducido no hay animación de brillo', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await abrirCartas(page);
  for (const nivel of ['Legendario', 'GOAT']) {
    const carta = page.locator(`.carta.completa[data-nivel="${nivel}"]`).first();
    const animaciones = await carta.evaluate((el) => [getComputedStyle(el).animationName, getComputedStyle(el, '::before').animationName]);
    expect(animaciones.every((a) => a === 'none')).toBe(true);
  }
});

for (const ancho of [1280, 360]) {
  test(`a ${ancho} px todas las cartas completas miden lo mismo y cada virtud ocupa una línea sin cortarse (hallazgos H1 y H2)`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 900 });
    await abrirCartas(page);
    const medidas = await page.$$eval('.carta.completa', (cartas) =>
      cartas.map((c) => {
        const r = c.getBoundingClientRect();
        const virtudes = Array.from(c.querySelectorAll<HTMLElement>('.carta-virtud')).map((s) => {
          const alto = parseFloat(getComputedStyle(s).lineHeight) || parseFloat(getComputedStyle(s).fontSize) * 1.2;
          return { texto: s.textContent ?? '', cortado: s.scrollWidth > s.clientWidth + 1, lineas: Math.round(s.getBoundingClientRect().height / alto) };
        });
        return { id: c.getAttribute('data-jugador'), ancho: Math.round(r.width), alto: Math.round(r.height), virtudes };
      }),
    );
    const altos = new Set(medidas.map((m) => m.alto));
    const anchos = new Set(medidas.map((m) => m.ancho));
    expect([...anchos].length, `anchos: ${[...anchos].join(', ')}`).toBe(1);
    expect(Math.max(...altos) - Math.min(...altos), `altos: ${[...altos].join(', ')}`).toBeLessThanOrEqual(1);
    const malos = medidas.flatMap((m) => m.virtudes.filter((s) => s.cortado || s.lineas > 1).map((s) => `${m.id}: ${s.texto}`));
    expect(malos).toEqual([]);
  });
}

test('presentación (spec 006, SC-009): bandera y fondo en cada demarcación, sin imágenes rotas; la GOAT con imagen propia', async ({ page }) => {
  await abrirCartas(page);
  const presentacion = page.locator('[data-prueba="presentacion"]');
  await expect(presentacion.locator('.carta.completa')).toHaveCount(5);
  await expect(presentacion.locator('.carta-bandera')).toHaveCount(5);
  await expect(presentacion.locator('.carta-fondo-accion')).toHaveCount(5);
  await expect(presentacion.locator('img.carta-fondo-accion[src="/cartas/propias/goat-prueba.png"]')).toHaveCount(1);
  await page.waitForLoadState('networkidle');
  const rotas = await page.$$eval('img', (imgs) => imgs.filter((i) => i.complete && i.naturalWidth === 0 && i.getClientRects().length > 0).map((i) => i.src));
  expect(rotas).toEqual([]);
  // La compacta solo lleva la bandera, sin escudo.
  await expect(page.locator('.carta.compacta .carta-escudo')).toHaveCount(0);
  await expect(page.locator('.carta.compacta .carta-bandera').first()).toBeVisible();
});
