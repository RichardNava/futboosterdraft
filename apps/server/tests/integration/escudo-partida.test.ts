/**
 * Escudo de cada equipo en una partida (spec 011, US1; T024; data-model §5): copia del perfil al unirse, asignado
 * estable, NPC por semilla, círculo del invitado, cambio por partida y `escudos` en `partido.inicio`.
 */
import { escudoAsignado } from '@fbd/domain';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { escudoDe } from '../../src/actores/identidad';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { ClienteWs } from '../helpers/clienteWs';
import { avanzarHasta } from '../helpers/torneo';
import { crearInvitado, crearRegistrado, peticion, type UsuarioPrueba } from '../helpers/usuarios';

const TURNO = 46_000;

describe('escudo por partida (spec 011, US1)', () => {
  let bd: BdPruebas;
  let srv: ServidorPruebas;

  beforeAll(async () => {
    bd = await iniciarBdPruebas();
  });
  beforeEach(async () => {
    await srv?.cerrar();
    await bd.limpiar();
    srv = await iniciarServidorPruebas(bd);
  });
  afterAll(async () => {
    await srv?.cerrar();
    await bd?.detener();
  });

  const gratuitos = () => srv.gestor.servicios.cosmeticos.gratuitos('escudo');
  const elegirEnPerfil = (u: UsuarioPrueba, escudo: string | null) =>
    peticion(srv.url, '/api/perfil/aspecto', { metodo: 'PUT', cookie: u.cookie, cuerpo: { escudo } });
  const cambiarEnPartida = (u: UsuarioPrueba, id: string, escudo: string | null) =>
    peticion(srv.url, `/api/partidas/${id}/escudo`, { metodo: 'PUT', cookie: u.cookie, cuerpo: { escudo } });
  const filaEscudo = async (id: string, usuarioId: string) =>
    (await bd.db.execute<{ escudo: string | null }>(sql`select escudo from participantes where partida_id = ${id} and usuario_id = ${usuarioId}`)).rows[0]!.escudo;

  async function crear(u: UsuarioPrueba, cuerpo: Record<string, unknown> = {}): Promise<string> {
    const r = await peticion(srv.url, '/api/partidas', { cookie: u.cookie, cuerpo: { modo: 'liga', numParticipantes: 4, plazasHumanas: 3, ...cuerpo } });
    expect(r.estado, JSON.stringify(r.cuerpo)).toBe(201);
    return r.cuerpo.id as string;
  }
  async function escudoEn(id: string, usuarioId: string): Promise<string | null> {
    const c = await srv.gestor.obtenerOError(id);
    return escudoDe(c, c.participanteDeUsuario(usuarioId)!.id);
  }

  it('el escudo del perfil se copia al unirse; cambiarlo en la partida no cambia el del perfil', async () => {
    const a = await crearRegistrado(srv.url);
    const b = await crearRegistrado(srv.url);
    const [x, y] = gratuitos();
    expect((await elegirEnPerfil(a, x!)).estado).toBe(200);
    expect((await elegirEnPerfil(b, y!)).estado).toBe(200);
    const id = await crear(a);
    await peticion(srv.url, `/api/partidas/${id}/unirse`, { metodo: 'POST', cookie: b.cookie });
    expect(await filaEscudo(id, a.id)).toBe(x);
    expect(await filaEscudo(id, b.id)).toBe(y);

    const r = await cambiarEnPartida(a, id, y!);
    expect(r.estado, JSON.stringify(r.cuerpo)).toBe(200);
    expect(r.cuerpo).toEqual({ escudo: y });
    expect(await filaEscudo(id, a.id)).toBe(y);
    expect((await peticion(srv.url, '/api/perfil/aspecto', { cookie: a.cookie })).cuerpo.escudo).toBe(x);
    // null vuelve al del perfil.
    expect((await cambiarEnPartida(a, id, null)).cuerpo).toEqual({ escudo: x });
  });

  it('sin escudo elegido: el mismo asignado en dos partidas, sin escribir la fila', async () => {
    const a = await crearRegistrado(srv.url);
    const id1 = await crear(a);
    const id2 = await crear(a);
    const esperado = escudoAsignado(a.id, gratuitos());
    expect(await escudoEn(id1, a.id)).toBe(esperado);
    expect(await escudoEn(id2, a.id)).toBe(esperado);
    expect(await filaEscudo(id1, a.id)).toBeNull();
  });

  it('los NPC llevan un escudo gratuito; el invitado sin elegir, ninguno (círculo)', async () => {
    const g = await crearInvitado(srv.url);
    const id = await crear(g, { plazasHumanas: 1 });
    const c = await srv.gestor.obtenerOError(id);
    for (const p of c.participantes.filter((p) => p.tipo === 'npc')) expect(gratuitos()).toContain(escudoDe(c, p.id));
    expect(await escudoEn(id, g.id)).toBeNull();
  });

  it('escudos no disponibles: 422 COSMETICO_NO_DISPONIBLE (también un invitado con uno de pago)', async () => {
    const a = await crearRegistrado(srv.url);
    const g = await crearInvitado(srv.url);
    const ida = await crear(a);
    const idg = await crear(g, { plazasHumanas: 1 });
    for (const [u, id] of [[a, ida], [g, idg]] as const) {
      const r = await cambiarEnPartida(u, id, 'escudo-premium-1');
      expect(r.estado).toBe(422);
      expect(r.cuerpo.error.codigo).toBe('COSMETICO_NO_DISPONIBLE');
      expect((await cambiarEnPartida(u, id, 'no-existe')).estado).toBe(422);
    }
    // Un invitado sí puede elegir uno gratuito.
    expect((await cambiarEnPartida(g, idg, gratuitos()[3]!)).cuerpo).toEqual({ escudo: gratuitos()[3] });
  });

  it('partido.inicio lleva los escudos (null en los dos si coinciden), la alineación el propio y tras empezar el torneo 409', async () => {
    const u = await crearRegistrado(srv.url);
    const id = await crear(u, { plazasHumanas: 1 });
    const ws = await ClienteWs.conectar(srv.urlWs, id, u.cookie);
    await ws.esperar('estado');
    await peticion(srv.url, `/api/partidas/${id}/iniciar`, { metodo: 'POST', cookie: u.cookie });
    await avanzarHasta(srv, TURNO, async () => ws.recibidos.some((m) => m.t === 'preparacion.inicio'), 400);
    const prep = await ws.esperar('preparacion.inicio');

    // Mismo escudo que el rival del primer partido: ninguno de los dos se pinta (FR-008).
    const c = await srv.gestor.obtenerOError(id);
    const yo = c.participanteDeUsuario(u.id)!.id;
    const partido = (await c.servicios.repoPartidos.resumenesDePartida(id)).find((p) => p.id === prep.partidoId)!;
    const rival = partido.localId === yo ? partido.visitanteId : partido.localId;
    const delRival = escudoDe(c, rival)!;
    expect((await cambiarEnPartida(u, id, delRival)).estado).toBe(200);
    expect((await peticion(srv.url, `/api/partidas/${id}/alineacion`, { cookie: u.cookie })).cuerpo.escudo).toBe(delRival);

    const desde = ws.recibidos.length;
    await peticion(srv.url, `/api/partidos/${prep.partidoId}/abrir`, { metodo: 'POST', cookie: u.cookie });
    const inicio = await ws.esperar('partido.inicio', { desde });
    expect(inicio.escudos).toEqual({ local: null, visitante: null });

    const r = await cambiarEnPartida(u, id, gratuitos()[0]!);
    expect(r.estado).toBe(409);
    expect(r.cuerpo.error.codigo).toBe('TORNEO_INICIADO');
    await ws.cerrar();
  });

  it('partido.inicio con escudos distintos los lleva los dos', async () => {
    const u = await crearRegistrado(srv.url);
    const id = await crear(u, { plazasHumanas: 1 });
    const ws = await ClienteWs.conectar(srv.urlWs, id, u.cookie);
    await ws.esperar('estado');
    await peticion(srv.url, `/api/partidas/${id}/iniciar`, { metodo: 'POST', cookie: u.cookie });
    await avanzarHasta(srv, TURNO, async () => ws.recibidos.some((m) => m.t === 'preparacion.inicio'), 400);
    const prep = await ws.esperar('preparacion.inicio');
    const c = await srv.gestor.obtenerOError(id);
    const partido = (await c.servicios.repoPartidos.resumenesDePartida(id)).find((p) => p.id === prep.partidoId)!;
    const esperado = { local: escudoDe(c, partido.localId), visitante: escudoDe(c, partido.visitanteId) };
    if (esperado.local === esperado.visitante) return; // Coincidencia por azar: lo cubre el caso anterior.
    const desde = ws.recibidos.length;
    await peticion(srv.url, `/api/partidos/${prep.partidoId}/abrir`, { metodo: 'POST', cookie: u.cookie });
    const inicio = await ws.esperar('partido.inicio', { desde });
    expect(inicio.escudos).toEqual(esperado);
    expect(inicio.escudos.local ?? inicio.escudos.visitante).toBeTruthy();
    await ws.cerrar();
  });
});
