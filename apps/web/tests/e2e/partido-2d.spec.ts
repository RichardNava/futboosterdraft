import { randomUUID } from 'node:crypto';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

interface PartidoTorneo {
  partidoId: string | null;
  local: { id: string } | null;
  visitante: { id: string } | null;
  estado: string;
}
interface Torneo {
  jornadaActual: number | null;
  jornadas: { numero: number; partidos: PartidoTorneo[] }[];
}

const avanzarReloj = (r: APIRequestContext, ms: number) => r.post('/api/dev/reloj/avanzar', { data: { ms } });

async function registrar(page: Page): Promise<void> {
  await page.goto('/');
  const r = await page.request.post('/api/auth/registro', {
    data: { email: `${randomUUID()}@e2e.test`, password: 'contraseña-segura', apodo: `E2E${randomUUID().slice(0, 6)}` },
  });
  expect(r.ok()).toBe(true);
}

/**
 * Escenario D del quickstart (Historia 6): dos cuentas registradas en dos navegadores juegan en 2D.
 * Se usa una liga de 4 (en vez del playoff del quickstart) para que los dos humanos se enfrenten seguro
 * en alguna jornada de la ida, sin depender del sorteo del cuadro.
 */
test('partido 2D entre dos humanos: velocidad compartida y cambio en la siguiente interrupción', async ({ browser }) => {
  test.setTimeout(600_000);
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const a = await ctxA.newPage();
  const b = await ctxB.newPage();
  await registrar(a);
  await registrar(b);

  const r = await a.request.post('/api/partidas', {
    data: { modo: 'liga', numParticipantes: 4, tipoSimulacion: '2d', ritmo: 'directo', plazasHumanas: 2 },
  });
  expect(r.status()).toBe(201);
  const { id: partidaId } = (await r.json()) as { id: string };
  expect((await b.request.post(`/api/partidas/${partidaId}/unirse`)).ok()).toBe(true);
  await a.request.post(`/api/partidas/${partidaId}/iniciar`);

  // Draft: las elecciones de los humanos se hacen solas al vencer cada turno.
  for (let i = 0; i < 40; i++) {
    const estado = ((await (await a.request.get(`/api/partidas/${partidaId}`)).json()) as { estado: string }).estado;
    if (estado === 'en_torneo') break;
    await avanzarReloj(a.request, 46_000);
  }

  // Jornada en la que se enfrentan los dos humanos.
  const partida = (await (await a.request.get(`/api/partidas/${partidaId}`)).json()) as { participantes: { id: string; tipo: string }[] };
  const humanos = new Set(partida.participantes.filter((p) => p.tipo === 'humano').map((p) => p.id));
  const torneo = async () => (await (await a.request.get(`/api/partidas/${partidaId}/torneo`)).json()) as Torneo;
  const entreHumanos = (t: Torneo) =>
    t.jornadas.flatMap((j) => j.partidos.map((p) => ({ jornada: j.numero, ...p }))).find((p) => humanos.has(p.local?.id ?? '') && humanos.has(p.visitante?.id ?? ''))!;
  let t = await torneo();
  const cruce = entreHumanos(t);
  expect(cruce).toBeDefined();

  // Las jornadas anteriores se juegan sin nadie mirando: sin conexión abierta, el servidor no espera.
  for (let i = 0; i < 200 && t.jornadaActual !== cruce.jornada; i++) {
    await avanzarReloj(a.request, 130_000);
    await a.waitForTimeout(250);
    t = await torneo();
  }
  const partidoId = entreHumanos(t).partidoId!;
  expect(partidoId).toBeTruthy();

  // Los dos abren el partido durante la preparación; al vencer, empieza en 2D.
  await a.goto(`/partidas/${partidaId}/partido/${partidoId}`);
  await b.goto(`/partidas/${partidaId}/partido/${partidoId}`);
  await expect(a.getByText('Esperando el inicio del partido…')).toBeVisible();
  await expect(b.getByText('Esperando el inicio del partido…')).toBeVisible();
  await avanzarReloj(a.request, 300_001);
  await expect(a.locator('.campo-2d canvas')).toBeVisible();
  await expect(b.locator('.campo-2d canvas')).toBeVisible();

  // A elige x32 y B x4: la reproducción va a x4 para los dos.
  await a.getByRole('button', { name: 'x32' }).click();
  await b.getByRole('button', { name: 'x4' }).click();
  await expect(a.getByRole('button', { name: 'x32' })).toHaveAttribute('aria-pressed', 'true');
  await expect(a.getByText('Tu rival va más lento: se reproduce a x4.')).toBeVisible();

  // A pide una sustitución con el balón en juego: queda pendiente y se aplica en la siguiente interrupción.
  await a.getByLabel('Sale').selectOption({ index: 1 });
  await a.getByLabel('Entra').selectOption({ index: 1 });
  await a.getByRole('button', { name: 'Hacer el cambio' }).click();
  await expect(a.getByText(/Un cambio pendiente hasta la próxima interrupción del juego/)).toBeVisible();
  await expect(a.getByText('Tu cambio ya se ha aplicado.')).toBeVisible({ timeout: 120_000 });
  await expect(b.getByRole('status').filter({ hasText: 'Tu rival ha hecho una sustitución.' })).toBeVisible({ timeout: 30_000 });

  // B sube a x32: los dos van a x32 y el partido llega al final.
  await b.getByRole('button', { name: 'x32' }).click();
  await expect(a.getByText('Tu rival va más lento')).toBeHidden();
  await expect(a.getByRole('heading', { name: 'Resumen del partido' })).toBeVisible({ timeout: 400_000 });
  await expect(b.getByRole('heading', { name: 'Resumen del partido' })).toBeVisible({ timeout: 60_000 });
  await expect(a.locator('.resumen-eventos')).toContainText(/Entra/);

  await ctxA.close();
  await ctxB.close();
});
