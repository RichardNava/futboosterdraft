import { expect, test, type Page } from '@playwright/test';

/**
 * Escenario A del quickstart: draft en solitario como invitado (Historias 1 y 5).
 * El servidor corre con reloj simulado (`--fake-clock`) para poder vencer turnos al instante.
 */

async function composicionDelSobre(page: Page) {
  const demarcaciones = await page.locator('section[aria-label="Sobre actual"] .carta-demarcacion').allTextContents();
  // El nivel se reconoce por el acabado de la carta (spec 002, FR-002): se lee de `data-nivel`.
  const niveles = await page.locator('section[aria-label="Sobre actual"] .carta').evaluateAll((cs) => cs.map((c) => c.getAttribute('data-nivel') ?? ''));
  const cuenta = (lista: string[], valor: string) => lista.filter((x) => x === valor).length;
  return {
    total: demarcaciones.length,
    POR: cuenta(demarcaciones, 'POR'),
    DEF: cuenta(demarcaciones, 'DEF'),
    MED: cuenta(demarcaciones, 'MED'),
    DEL: cuenta(demarcaciones, 'DEL'),
    Superclase: cuenta(niveles, 'Superclase'),
    Crack: cuenta(niveles, 'Crack'),
    altas: cuenta(niveles, 'Legendario') + cuenta(niveles, 'GOAT'),
  };
}

test('un invitado completa el draft contra 3 NPC', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Jugar como invitado' }).click();
  await expect(page.getByRole('heading', { name: 'Nueva partida' })).toBeVisible();
  await page.getByRole('button', { name: 'Crear partida' }).click();

  // Sala: 1 humano + 3 NPC de nivel amateur, intermedio o avanzado (nunca PRO).
  await expect(page.getByRole('heading', { name: 'Sala' })).toBeVisible();
  const etiquetasNPC = page.locator('.lista-participantes .etiqueta', { hasText: 'NPC' });
  await expect(etiquetasNPC).toHaveCount(3);
  for (const texto of await etiquetasNPC.allTextContents()) expect(texto).not.toContain('PRO');
  await page.getByRole('button', { name: 'Empezar' }).click();

  // Primer sobre: composición de FR-014 (0 o 1 portero, 2–3 defensas, 3 medios, 2 delanteros…).
  await expect(page.getByRole('heading', { name: /Sobre 1 · Turno 1 de 8/ })).toBeVisible();
  const c = await composicionDelSobre(page);
  expect(c.total).toBe(8);
  expect(c.POR).toBeLessThanOrEqual(1);
  expect(c.POR + c.DEF).toBe(3);
  expect(c.MED).toBe(3);
  expect(c.DEL).toBe(2);
  expect(c.Superclase).toBe(4);
  expect(c.Crack).toBe(2);
  expect(c.altas).toBe(2);

  // Dejar vencer el turno (45 s más los 8 s de margen de la apertura del sobre, spec 003): se elige la de mayor media.
  await page.request.post('/api/dev/reloj/avanzar', { data: { ms: 54_000 } });
  await expect(page.getByRole('status')).toContainText('Se acabó el tiempo');
  await expect(page.getByRole('heading', { name: /Turno 2 de 8/ })).toBeVisible();
  await page.getByRole('button', { name: 'Entendido' }).click();

  // Resto del draft: elegir siempre la primera carta.
  for (let i = 1; i < 24; i++) {
    const cartas = page.locator('section[aria-label="Sobre actual"] .carta-cuerpo[role="button"]');
    await cartas.first().click();
    await page.getByRole('button', { name: 'Confirmar elección' }).click();
    if (i < 23) {
      // Índice (desde 0) del turno siguiente: i + 1.
      const ronda = Math.floor((i + 1) / 8) + 1;
      const turno = ((i + 1) % 8) + 1;
      await expect(page.getByRole('heading', { name: `Sobre ${ronda} · Turno ${turno} de 8` })).toBeVisible();
    }
  }

  // Al terminar: «Preparar equipo» (spec 002, FR-011) o las plantillas, con los 24 jugadores propios y las de
  // los rivales visibles (FR-054a).
  await expect(page.getByRole('button', { name: 'Preparar equipo' })).toBeVisible();
  await page.getByRole('button', { name: 'Ver las plantillas' }).click();
  await expect(page.getByRole('heading', { name: 'Plantillas' })).toBeVisible();
  await expect(page.getByRole('tab')).toHaveCount(4);
  await expect(page.locator('.columnas-demarcacion .carta')).toHaveCount(24);
  await page.getByRole('tab').nth(1).click();
  await expect(page.locator('.columnas-demarcacion .carta')).toHaveCount(24);
});
