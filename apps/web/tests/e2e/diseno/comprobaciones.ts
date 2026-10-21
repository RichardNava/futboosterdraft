/**
 * Comprobaciones de diseño comunes a todas las pantallas del inventario (spec 004, FR-040, research R13,
 * contracts/ui.md §1). No es una prueba: la usan inventario.spec.ts, teclado.spec.ts y las demás.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** Anchos de FR-031, más 683 px (ampliación del 200 % en un portátil de 1366 px), con su alto habitual. */
export const ANCHOS: ReadonlyArray<{ ancho: number; alto: number }> = [
  { ancho: 360, alto: 640 },
  { ancho: 683, alto: 384 },
  { ancho: 768, alto: 1024 },
  { ancho: 1366, alto: 768 },
  { ancho: 1920, alto: 1080 },
];

/** `--color-accion` calculado. */
export const LIMA = 'rgb(183, 255, 44)';

export interface OpcionesDiseno {
  /** Elementos rellenos de lima permitidos (2 en el descanso contra un NPC, 003/FR-006a). */
  maxLima?: number;
  /** Anchos que comprobar (por defecto, todos). */
  anchos?: ReadonlyArray<{ ancho: number; alto: number }>;
  /** Pasos de Tab que recorrer (por defecto, 40; 0 para no recorrer). */
  pasosTab?: number;
}

/** Selectores de los elementos visibles con el fondo calculado igual al lima. */
export async function rellenosLima(page: Page): Promise<string[]> {
  return page.evaluate((lima) => {
    const visibles: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      if (getComputedStyle(el).backgroundColor !== lima) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      visibles.push(describir(el));
    }
    return visibles;

    function describir(el: Element): string {
      const clases = Array.from(el.classList).map((c) => `.${c}`).join('');
      const texto = (el.textContent ?? '').trim().slice(0, 30);
      return `${el.tagName.toLowerCase()}${clases}${texto ? ` «${texto}»` : ''}`;
    }
  }, LIMA);
}

/**
 * Para cada ancho: sin desplazamiento horizontal, axe WCAG 2.1 AA sin infracciones, lima reservado, como mucho un
 * secundario lima, foco lima de ≥ 2 px con Tab y ningún texto en mayúsculas sostenidas.
 */
export async function comprobarDiseno(page: Page, nombre: string, opciones: OpcionesDiseno = {}): Promise<void> {
  const original = page.viewportSize();
  const maxLima = opciones.maxLima ?? 1;
  const pasosTab = opciones.pasosTab ?? 40;
  try {
    for (const { ancho, alto } of opciones.anchos ?? ANCHOS) {
      const donde = `${nombre} a ${ancho} px`;
      await page.setViewportSize({ width: ancho, height: alto });
      // Deja que la maquetación y los observadores de tamaño se asienten.
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

      // 1. Sin desplazamiento horizontal de la página (FR-031).
      const { scrollWidth, clientWidth, culpables } = await page.evaluate(() => {
        const raiz = document.documentElement;
        const anchoVista = raiz.clientWidth;
        const culpables = Array.from(document.querySelectorAll<HTMLElement>('body *'))
          .filter((el) => el.getBoundingClientRect().right > anchoVista + 1)
          .filter((el) => !el.closest('[data-desplazable], .tabla-desplazable, .cuadro, [popover], dialog, .ambiente'))
          .slice(0, 5)
          .map((el) => `${el.tagName.toLowerCase()}.${Array.from(el.classList).join('.')}`);
        return { scrollWidth: raiz.scrollWidth, clientWidth: anchoVista, culpables };
      });
      expect(scrollWidth, `${donde}: desplazamiento horizontal (${culpables.join(', ')})`).toBeLessThanOrEqual(clientWidth);

      // 2. axe, WCAG 2.1 AA (FR-029, FR-030). El lienzo del partido 2D es un objeto de juego.
      const axe = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .exclude('canvas')
        .analyze();
      const infracciones = axe.violations.map(
        (v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`,
      );
      expect(infracciones, `${donde}: infracciones de axe`).toEqual([]);

      // 3. Lima reservado al botón principal (FR-002, SC-002).
      const lima = await rellenosLima(page);
      expect(lima.length, `${donde}: rellenos de lima (${lima.join(', ')})`).toBeLessThanOrEqual(maxLima);

      // 4. Como mucho un secundario lima.
      const alternativas = await page.locator('button.secundario.alternativa:visible, a.secundario.alternativa:visible').count();
      expect(alternativas, `${donde}: secundarios lima`).toBeLessThanOrEqual(1);

      // 6. Sin mayúsculas sostenidas (FR-035).
      const mayusculas = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement>('body *'))
          .filter((el) => getComputedStyle(el).textTransform === 'uppercase')
          .slice(0, 5)
          .map((el) => `${el.tagName.toLowerCase()}.${Array.from(el.classList).join('.')}`),
      );
      expect(mayusculas, `${donde}: text-transform: uppercase`).toEqual([]);
    }

    // 5. Foco visible con Tab (FR-030), en el ancho de portátil.
    if (pasosTab > 0) {
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      for (let i = 0; i < pasosTab; i++) {
        await page.keyboard.press('Tab');
        const foco = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          if (!el || el === document.body) return null;
          const estilo = getComputedStyle(el);
          return {
            selector: `${el.tagName.toLowerCase()}.${Array.from(el.classList).join('.')} «${(el.textContent ?? '').trim().slice(0, 30)}»`,
            ancho: parseFloat(estilo.outlineWidth),
            estiloContorno: estilo.outlineStyle,
            color: estilo.outlineColor,
          };
        });
        if (!foco) continue;
        expect(foco.estiloContorno, `${nombre}: foco sin contorno en ${foco.selector}`).not.toBe('none');
        expect(foco.ancho, `${nombre}: contorno de foco < 2 px en ${foco.selector}`).toBeGreaterThanOrEqual(2);
        expect(foco.color, `${nombre}: contorno de foco no lima en ${foco.selector}`).toBe(LIMA);
      }
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    }
  } finally {
    if (original) await page.setViewportSize(original);
  }
}
