import { randomUUID } from 'node:crypto';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

/**
 * Escenario K del quickstart (US11; FR-030, SC-019): torneo asíncrono con dos humanos. A abre el partido
 * contra B sin que B esté conectado y lo ve sin panel de cambios; B, después, lo ve "pendiente de ver", sin
 * marcador, y al verlo entero obtiene exactamente los mismos eventos.
 */

interface PartidoTorneo {
  partidoId: string | null;
  local: { id: string } | null;
  visitante: { id: string } | null;
  estado: string;
  marcador: unknown;
}
interface Torneo {
  jornadaActual: number | null;
  jornadas: { numero: number; estado: string; partidos: PartidoTorneo[] }[];
  pendientesDeVer: string[];
}

const HORA = 3600_000;
const avanzarReloj = (r: APIRequestContext, ms: number) => r.post('/api/dev/reloj/avanzar', { data: { ms } });

async function registrar(page: Page): Promise<void> {
  await page.goto('/');
  const r = await page.request.post('/api/auth/registro', {
    data: { email: `${randomUUID()}@e2e.test`, password: 'contraseña-segura', apodo: `E2E${randomUUID().slice(0, 6)}` },
  });
  expect(r.ok()).toBe(true);
}

test('dos humanos ven el mismo partido cada uno cuando quiere, sin revelarse el resultado antes (escenario K)', async ({ browser }) => {
  test.setTimeout(600_000);
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  await registrar(a);
  await registrar(b);

  // 1. Liga de 4 con 2 humanos, plazo de 24 h y simulación 2D.
  const r = await a.request.post('/api/partidas', { data: { modo: 'liga', numParticipantes: 4, plazasHumanas: 2, plazoJornadaHoras: 24 } });
  expect(r.status()).toBe(201);
  const { id: partidaId } = (await r.json()) as { id: string };
  expect((await b.request.post(`/api/partidas/${partidaId}/unirse`)).ok()).toBe(true);
  await a.request.post(`/api/partidas/${partidaId}/iniciar`);
  for (let i = 0; i < 40; i++) {
    const estado = ((await (await a.request.get(`/api/partidas/${partidaId}`)).json()) as { estado: string }).estado;
    if (estado === 'en_torneo') break;
    await avanzarReloj(a.request, 46_000);
  }

  const partida = (await (await a.request.get(`/api/partidas/${partidaId}`)).json()) as { participantes: { id: string; tipo: string }[] };
  const humanos = new Set(partida.participantes.filter((p) => p.tipo === 'humano').map((p) => p.id));
  const torneo = async (p: Page) => (await (await p.request.get(`/api/partidas/${partidaId}/torneo`)).json()) as Torneo;
  const entreHumanos = (t: Torneo) =>
    t.jornadas.flatMap((j) => j.partidos.map((p) => ({ jornada: j.numero, ...p }))).find((p) => humanos.has(p.local?.id ?? '') && humanos.has(p.visitante?.id ?? ''))!;
  let t = await torneo(a);
  const cruce = entreHumanos(t);
  // Las jornadas anteriores se cierran al vencer su plazo.
  for (let i = 0; i < 10 && t.jornadaActual !== cruce.jornada; i++) {
    await avanzarReloj(a.request, 24 * HORA + 1000);
    await a.waitForTimeout(400);
    t = await torneo(a);
  }
  const partidoId = entreHumanos(t).partidoId!;

  // 2. A pulsa «Ver partido»: se resuelve sin B y A lo ve con velocidades y «Finalizar partido», sin cambios.
  await a.goto(`/partidas/${partidaId}/torneo`);
  // El modo se elige en cada partido (spec 003, FR-032): A lo ve en 2D.
  await a.getByLabel('Simulación 2D').check();
  await a.getByRole('button', { name: 'Ver partido' }).first().click();
  await expect(a).toHaveURL(new RegExp(`/reproduccion/${partidoId}$`));
  await expect(a.getByRole('group', { name: 'Velocidad de reproducción' })).toBeVisible();
  await expect(a.getByText('Cambios', { exact: false }).filter({ has: a.locator('button') })).toHaveCount(0);
  await a.getByRole('button', { name: 'Finalizar partido' }).click();
  await expect(a.getByRole('heading', { name: 'Resumen del partido' })).toBeVisible();
  const eventosA = await a.locator('.resumen-eventos li').allTextContents();

  // 3. B, más tarde: su partido aparece «Pendiente de ver», sin marcador, y la clasificación no lo incluye.
  const vistaB = await torneo(b);
  expect(vistaB.pendientesDeVer).toEqual([partidoId]);
  const deB = vistaB.jornadas.flatMap((j) => j.partidos).find((p) => p.partidoId === partidoId)!;
  expect(deB.estado).toBe('pendiente_de_ver');
  expect(deB.marcador).toBeNull();
  await b.goto(`/partidas/${partidaId}/torneo`);
  await expect(b.getByText('Pendiente de ver').first()).toBeVisible();
  await expect(b.getByText(/No incluye 1 partido pendiente de ver/)).toBeVisible();
  await b.getByRole('button', { name: 'Ver partido' }).first().click();
  await b.getByRole('button', { name: 'Finalizar partido' }).click();
  await expect(b.getByRole('heading', { name: 'Resumen del partido' })).toBeVisible();
  expect(await b.locator('.resumen-eventos li').allTextContents()).toEqual(eventosA);
  // Al terminar, la clasificación de B ya lo incluye.
  await expect.poll(async () => (await torneo(b)).pendientesDeVer).toEqual([]);

  // 4. Si A no juega su partido contra un NPC, al vencer el plazo se resuelve solo y la jornada se cierra.
  const jornada = entreHumanos(await torneo(a)).jornada;
  await avanzarReloj(a.request, 24 * HORA + 1000);
  await expect.poll(async () => (await torneo(a)).jornadas.find((j) => j.numero === jornada)!.estado).toBe('cerrada');

  // 5. «Máximos goleadores» y «Máximos asistentes» coinciden con la suma de los resúmenes (sin la tanda).
  const goles = new Map<number, number>();
  const asistencias = new Map<number, number>();
  for (const p of (await torneo(a)).jornadas.flatMap((j) => j.partidos)) {
    if (p.estado !== 'finalizado' || !p.partidoId) continue;
    const r = (await (await a.request.get(`/api/partidos/${p.partidoId}`)).json()) as { eventos: { tipo: string; jugadores: { rol: string; jugadorId: number }[] }[] };
    for (const e of r.eventos.filter((x) => x.tipo === 'gol')) {
      for (const x of e.jugadores) {
        const m = x.rol === 'autor' ? goles : x.rol === 'asistente' ? asistencias : null;
        m?.set(x.jugadorId, (m.get(x.jugadorId) ?? 0) + 1);
      }
    }
  }
  const tabla = async (cual: string) =>
    new Map(((await (await a.request.get(`/api/partidas/${partidaId}/torneo/${cual}?todos=true`)).json()) as { filas: { jugador: { id: number }; total: number }[] }).filas.map((f) => [f.jugador.id, f.total]));
  expect(await tabla('goleadores')).toEqual(goles);
  expect(await tabla('asistentes')).toEqual(asistencias);
  await a.goto(`/partidas/${partidaId}/torneo`);
  await a.getByRole('tab', { name: 'Máximos goleadores' }).click();
  if (goles.size) await expect(a.getByRole('table', { name: 'Máximos goleadores' })).toBeVisible();
  await a.getByRole('tab', { name: 'Máximos asistentes' }).click();
  if (asistencias.size) await expect(a.getByRole('table', { name: 'Máximos asistentes' })).toBeVisible();
});
