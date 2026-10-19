import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { ClienteWs } from '../helpers/clienteWs';
import { avanzarHasta, espera, jugarSolo, seguirSiempre, torneo } from '../helpers/torneo';
import { crearInvitado, crearRegistrado, peticion, type UsuarioPrueba } from '../helpers/usuarios';

describe('torneo de un humano y abandonos (spec 001/US4; spec 002/US11)', () => {
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

  async function crear(u: UsuarioPrueba, cuerpo: Record<string, unknown>) {
    const r = await peticion(srv.url, '/api/partidas', {
      cookie: u.cookie,
      cuerpo: { ...cuerpo },
    });
    expect(r.estado, JSON.stringify(r.cuerpo)).toBe(201);
    const ws = await ClienteWs.conectar(srv.urlWs, r.cuerpo.id, u.cookie);
    const parar = seguirSiempre(ws);
    await peticion(srv.url, `/api/partidas/${r.cuerpo.id}/iniciar`, { metodo: 'POST', cookie: u.cookie });
    return { partidaId: r.cuerpo.id as string, ws, parar };
  }

  it('una liga de 4 con 1 humano completa sus 6 jornadas: 12 partidos, clasificación y campeón', async () => {
    const u = await crearInvitado(srv.url);
    const { partidaId, ws, parar } = await crear(u, { modo: 'liga', numParticipantes: 4 });
    await avanzarHasta(srv, 46_000, async () => (await torneo(srv, partidaId, u)).jornadaActual === 1);
    await jugarSolo(srv, partidaId, u, async () => (await torneo(srv, partidaId, u)).campeon !== null);
    const t = await torneo(srv, partidaId, u);
    expect(t.jornadas).toHaveLength(6);
    expect(t.jornadas.every((j: any) => j.estado === 'cerrada')).toBe(true);
    const partidos = t.jornadas.flatMap((j: any) => j.partidos);
    expect(partidos).toHaveLength(12);
    expect(partidos.every((p: any) => p.estado === 'finalizado')).toBe(true);
    expect(t.clasificacion).toHaveLength(4);
    expect(t.clasificacion.every((f: any) => f.pj === 6)).toBe(true);
    expect(t.campeon.nombre).toBe(t.clasificacion[0].nombre);
    expect((await peticion(srv.url, `/api/partidas/${partidaId}`, { cookie: u.cookie })).cuerpo.estado).toBe('terminada');
    expect(ws.recibidos.some((m) => m.t === 'torneo.actualizado')).toBe(true);
    parar();
    await ws.cerrar();
  });

  it('los partidos NPC contra NPC se resuelven sin intervención y en menos de 10 s', async () => {
    const u = await crearInvitado(srv.url);
    const { partidaId, ws, parar } = await crear(u, { modo: 'liga', numParticipantes: 4 });
    await avanzarHasta(srv, 46_000, async () => (await torneo(srv, partidaId, u)).jornadaActual === 1);
    const desde = ws.recibidos.length;
    const inicio = Date.now();
    const prep = await ws.esperar('preparacion.inicio');
    await peticion(srv.url, `/api/partidos/${prep.partidoId}/abrir`, { metodo: 'POST', cookie: u.cookie });
    await ws.esperar('partido.inicio', { desde });
    await avanzarHasta(srv, 1, async () => {
      const t = await torneo(srv, partidaId, u);
      const npc = t.jornadas[0].partidos.filter((p: any) => p.local.id !== ws.recibidos.find((m) => m.t === 'partido.inicio')?.local.id && p.visitante.id !== ws.recibidos.find((m) => m.t === 'partido.inicio')?.visitante.id);
      return npc.every((p: any) => p.estado === 'finalizado');
    });
    expect(Date.now() - inicio).toBeLessThan(10_000);
    parar();
    await ws.cerrar();
  });

  it('un mixto de 8 pasa de la liga (14 jornadas) a semifinales 1.º–4.º y 2.º–3.º, y a la final', { timeout: 300_000 }, async () => {
    const u = await crearInvitado(srv.url);
    const { partidaId, ws, parar } = await crear(u, { modo: 'mixto', numParticipantes: 8 });
    await avanzarHasta(srv, 46_000, async () => (await torneo(srv, partidaId, u)).jornadaActual === 1);
    await jugarSolo(srv, partidaId, u, async () => (await torneo(srv, partidaId, u)).fase === 'eliminatoria');
    const t = await torneo(srv, partidaId, u);
    expect(t.jornadas.filter((j: any) => j.tipo === 'liga')).toHaveLength(14);
    const semis = t.jornadas.find((j: any) => j.tipo === 'semifinal');
    const c = t.clasificacion;
    expect(semis.partidos.map((p: any) => [p.local.nombre, p.visitante.nombre])).toEqual([
      [c[0].nombre, c[3].nombre],
      [c[1].nombre, c[2].nombre],
    ]);
    await jugarSolo(srv, partidaId, u, async () => (await torneo(srv, partidaId, u)).campeon !== null);
    const final = await torneo(srv, partidaId, u);
    expect(final.jornadas.at(-1).tipo).toBe('final');
    expect(final.jornadas.flatMap((j: any) => j.partidos)).toHaveLength(59);
    parar();
    await ws.cerrar();
  });

  it('quien abandona pasa a estar controlado por un NPC intermedio y el torneo sigue', async () => {
    const a = await crearRegistrado(srv.url);
    const b = await crearRegistrado(srv.url);
    const r = await peticion(srv.url, '/api/partidas', {
      cookie: a.cookie,
      cuerpo: { modo: 'liga', numParticipantes: 4, plazasHumanas: 2 },
    });
    const partidaId = r.cuerpo.id;
    await peticion(srv.url, `/api/partidas/${partidaId}/unirse`, { metodo: 'POST', cookie: b.cookie });
    const ws = await ClienteWs.conectar(srv.urlWs, partidaId, a.cookie);
    const parar = seguirSiempre(ws);
    await peticion(srv.url, `/api/partidas/${partidaId}/iniciar`, { metodo: 'POST', cookie: a.cookie });
    await avanzarHasta(srv, 46_000, async () => (await torneo(srv, partidaId, a)).jornadaActual === 1);
    const abandono = await peticion(srv.url, `/api/partidas/${partidaId}/abandonar`, { metodo: 'POST', cookie: b.cookie });
    expect(abandono.cuerpo.controladoPorNPC).toBe(true);
    // El torneo termina aunque b no vuelva. Tras el abandono, a es el único humano activo: sin plazos, juega
    // su partido y abre la siguiente jornada cuando quiere (research R9).
    await jugarSolo(srv, partidaId, a, async () => (await torneo(srv, partidaId, a)).campeon !== null);
    expect((await torneo(srv, partidaId, a)).siguienteJornada).toBe('manual');
    parar();
    await ws.cerrar();
  });

  it('un equipo con menos de 7 jugadores disponibles pierde 3-0', async () => {
    const u = await crearInvitado(srv.url);
    const { partidaId, ws, parar } = await crear(u, { modo: 'liga', numParticipantes: 4 });
    await avanzarHasta(srv, 46_000, async () => (await torneo(srv, partidaId, u)).jornadaActual === 1);
    const c = await srv.gestor.obtenerOError(partidaId);
    const yo = c.participanteDeUsuario(u.id)!.id;
    // 18 de los 24 jugadores de baja: quedan 6 disponibles.
    const plantilla = (await c.servicios.repoDraft.plantillas([yo])).get(yo)!;
    await c.ejecutar(() => {
      c.torneo!.bajas.bajas.push(
        ...plantilla.slice(0, 18).map((jugadorId) => ({ participanteId: yo, jugadorId, motivo: 'lesion' as const, gravedad: 'grave' as const, partidoOrigenId: 'x', partidosRestantes: 3 })),
      );
    });
    const desde = ws.recibidos.length;
    const prep = await ws.esperar('preparacion.inicio');
    await peticion(srv.url, `/api/partidos/${prep.partidoId}/abrir`, { metodo: 'POST', cookie: u.cookie });
    const inicio = await ws.esperar('partido.inicio', { desde });
    const fin = await ws.esperar('partido.fin', { desde });
    const soyLocal = inicio.local.id === yo;
    expect(soyLocal ? fin.marcador : { local: fin.marcador.visitante, visitante: fin.marcador.local }).toEqual({ local: 0, visitante: 3 });
    await espera(50);
    parar();
    await ws.cerrar();
  });
});
