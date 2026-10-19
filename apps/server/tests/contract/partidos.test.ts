/**
 * Contrato HTTP de los partidos de la spec 002 (contracts/http-api.md; T033): abrir, visto, revelar y la
 * vista "pendiente de ver" de un partido entre humanos.
 */
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { partidaTrasDraft } from '../helpers/partidas';
import { avanzarHasta, torneo } from '../helpers/torneo';
import { crearRegistrado, peticion, type UsuarioPrueba } from '../helpers/usuarios';

const HORA = 3600_000;

describe('contrato HTTP de partidos (spec 002)', () => {
  let bd: BdPruebas;
  let srv: ServidorPruebas;
  let a: UsuarioPrueba;
  let b: UsuarioPrueba;
  let partidaId: string;
  let entreHumanos: string;
  let contraNpc: string | undefined;

  beforeAll(async () => {
    bd = await iniciarBdPruebas();
    srv = await iniciarServidorPruebas(bd);
    b = await crearRegistrado(srv.url);
    const r = await partidaTrasDraft(srv, { cuerpo: { plazasHumanas: 2, plazoJornadaHoras: 24 }, otros: [b] });
    a = r.anfitrion;
    partidaId = r.partida.id;
    const c = await srv.gestor.obtenerOError(partidaId);
    const ia = c.participanteDeUsuario(a.id)!.id;
    const ib = c.participanteDeUsuario(b.id)!.id;
    await avanzarHasta(srv, 24 * HORA + 1, async () => {
      const t = await torneo(srv, partidaId, a);
      const j = t.jornadas.find((x: any) => x.estado === 'abierta');
      if (!j) return false;
      const deA = j.partidos.filter((p: any) => p.local.id === ia || p.visitante.id === ia);
      const humano = deA.find((p: any) => p.local.id === ib || p.visitante.id === ib);
      if (humano) entreHumanos = humano.partidoId;
      return humano !== undefined;
    }, 10);
    // Partido de B contra un NPC en la misma jornada (si lo hay).
    const t = await torneo(srv, partidaId, b);
    const j = t.jornadas.find((x: any) => x.estado === 'abierta');
    contraNpc = j.partidos.find((p: any) => p.partidoId !== entreHumanos && (p.local.id === ib || p.visitante.id === ib))?.partidoId;
  });
  afterAll(async () => {
    await srv?.cerrar();
    await bd?.detener();
  });

  it('POST /api/partidos/:id/listo ya no existe', async () => {
    expect((await peticion(srv.url, `/api/partidos/${entreHumanos}/listo`, { metodo: 'POST', cookie: a.cookie })).estado).toBe(404);
  });

  it('abrir: 404 PARTIDO_NO_ENCONTRADO con un partido que no existe', async () => {
    const r = await peticion(srv.url, `/api/partidos/${randomUUID()}/abrir`, { metodo: 'POST', cookie: a.cookie });
    expect(r.estado).toBe(404);
    expect(r.cuerpo.error.codigo).toBe('PARTIDO_NO_ENCONTRADO');
  });

  it('abrir: una modalidad inválida es un 422 (spec 003, T045)', async () => {
    const r = await peticion(srv.url, `/api/partidos/${entreHumanos}/abrir`, { metodo: 'POST', cookie: a.cookie, cuerpo: { modalidad: '3d' } });
    expect(r.estado).toBe(422);
  });

  it('abrir contra un humano: { modo: "reproduccion", modalidad }, idempotente y sin cambiar la modalidad (FR-035)', async () => {
    const r = await peticion(srv.url, `/api/partidos/${entreHumanos}/abrir`, { metodo: 'POST', cookie: a.cookie, cuerpo: { modalidad: '2d' } });
    expect(r.estado).toBe(200);
    expect(r.cuerpo).toEqual({ modo: 'reproduccion', modalidad: '2d' });
    const otra = await peticion(srv.url, `/api/partidos/${entreHumanos}/abrir`, { metodo: 'POST', cookie: a.cookie, cuerpo: { modalidad: 'rapida' } });
    expect(otra.cuerpo).toEqual({ modo: 'reproduccion', modalidad: '2d' });
  });

  it('GET /api/partidos/:id con el visionado pendiente: { estado: "pendiente_de_ver" } sin marcador ni eventos', async () => {
    const r = await peticion(srv.url, `/api/partidos/${entreHumanos}`, { cookie: b.cookie });
    expect(r.estado).toBe(200);
    expect(r.cuerpo).toMatchObject({ estado: 'pendiente_de_ver' });
    expect(r.cuerpo.marcador).toBeUndefined();
    expect(r.cuerpo.eventos).toBeUndefined();
  });

  it('visto y revelar son idempotentes y desbloquean el resultado', async () => {
    for (let i = 0; i < 2; i++) expect((await peticion(srv.url, `/api/partidos/${entreHumanos}/visto`, { metodo: 'POST', cookie: a.cookie })).estado).toBe(200);
    for (let i = 0; i < 2; i++) expect((await peticion(srv.url, `/api/partidos/${entreHumanos}/revelar`, { metodo: 'POST', cookie: b.cookie })).estado).toBe(200);
    for (const u of [a, b]) {
      const r = await peticion(srv.url, `/api/partidos/${entreHumanos}`, { cookie: u.cookie });
      expect(r.cuerpo.estado).toBe('finalizado');
      expect(r.cuerpo.marcador).toBeDefined();
    }
    // GET devuelve la modalidad de quien pregunta: A lo abrió en 2D y B aún no lo ha abierto.
    expect((await peticion(srv.url, `/api/partidos/${entreHumanos}`, { cookie: a.cookie })).cuerpo.modalidad).toBe('2d');
    expect((await peticion(srv.url, `/api/partidos/${entreHumanos}`, { cookie: b.cookie })).cuerpo.modalidad).toBeNull();
  });

  it('visto y revelar: 404 si el usuario no juega ese partido', async () => {
    const otro = await crearRegistrado(srv.url);
    expect((await peticion(srv.url, `/api/partidos/${entreHumanos}/visto`, { metodo: 'POST', cookie: otro.cookie })).estado).toBe(404);
  });

  it('abrir contra un NPC con { modalidad: "2d" }: { modo: "directo", modalidad: "2d" }; una segunda apertura no la cambia', async () => {
    if (!contraNpc) return;
    const r = await peticion(srv.url, `/api/partidos/${contraNpc}/abrir`, { metodo: 'POST', cookie: b.cookie, cuerpo: { modalidad: '2d' } });
    expect(r.estado).toBe(200);
    expect(r.cuerpo).toEqual({ modo: 'directo', modalidad: '2d' });
    const otra = await peticion(srv.url, `/api/partidos/${contraNpc}/abrir`, { metodo: 'POST', cookie: b.cookie, cuerpo: { modalidad: 'rapida' } });
    expect(otra.cuerpo).toEqual({ modo: 'directo', modalidad: '2d' });
    expect((await peticion(srv.url, `/api/partidos/${contraNpc}`, { cookie: b.cookie })).cuerpo.modalidad).toBe('2d');
  });
});
