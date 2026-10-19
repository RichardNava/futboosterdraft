/**
 * Modo de simulación elegido en cada partido (spec 003, US3; FR-032 a FR-035; research R19; T047).
 */
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { ClienteWs } from '../helpers/clienteWs';
import { bdHasta } from '../helpers/migraciones';
import { partidaTrasDraft } from '../helpers/partidas';
import { avanzarHasta, espera, torneo } from '../helpers/torneo';
import { crearInvitado, crearRegistrado, peticion, type UsuarioPrueba } from '../helpers/usuarios';

const TURNO = 46_000;
const HORA = 3600_000;

describe('modo de simulación por partido (US3)', () => {
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

  /** Liga de 4 con un humano hasta su primera preparación. */
  async function hastaPreparacion(u: UsuarioPrueba) {
    const r = await peticion(srv.url, '/api/partidas', { cookie: u.cookie, cuerpo: { modo: 'liga', numParticipantes: 4 } });
    const partidaId: string = r.cuerpo.id;
    const ws = await ClienteWs.conectar(srv.urlWs, partidaId, u.cookie);
    await peticion(srv.url, `/api/partidas/${partidaId}/iniciar`, { metodo: 'POST', cookie: u.cookie });
    for (let i = 0; i < 30 && !ws.recibidos.some((m) => m.t === 'preparacion.inicio'); i++) {
      srv.reloj.avanzar(TURNO);
      await espera(60);
    }
    return { partidaId, ws, prep: await ws.esperar('preparacion.inicio') };
  }

  it('la preparación propone la rápida la primera vez y después la última modalidad usada; un registrado la hereda en otra partida', async () => {
    const u = await crearRegistrado(srv.url);
    const { partidaId, ws, prep } = await hastaPreparacion(u);
    expect(prep.modalidadPreferida).toBe('rapida');
    const desde = ws.recibidos.length;
    const abierto = await peticion(srv.url, `/api/partidos/${prep.partidoId}/abrir`, { metodo: 'POST', cookie: u.cookie, cuerpo: { modalidad: '2d' } });
    expect(abierto.cuerpo).toEqual({ modo: 'directo', modalidad: '2d' });
    const inicio = await ws.esperar('partido.inicio', { desde });
    expect(inicio.modalidad).toBe('2d');
    // Contra un NPC, con 2D se juega con el búfer de anticipación.
    const c = await srv.gestor.obtenerOError(partidaId);
    expect(c.partidosEnCurso.get(prep.partidoId)?.dosD).not.toBeNull();
    // Se termina el partido y se abre la jornada siguiente: viene preseleccionada la 2D.
    ws.enviar({ t: 'partido.finalizar', partidoId: prep.partidoId });
    await ws.esperar('partido.fin', { desde });
    const antes = ws.recibidos.length;
    await peticion(srv.url, `/api/partidas/${partidaId}/siguiente-jornada`, { metodo: 'POST', cookie: u.cookie });
    const prep2 = await ws.esperar('preparacion.inicio', { desde: antes });
    expect(prep2.modalidadPreferida).toBe('2d');
    const fila = await bd.db.execute<{ m: string }>(sql`select ultima_modalidad as m from participantes where usuario_id = ${u.id}`);
    expect(fila.rows[0]!.m).toBe('2d');
    await ws.cerrar();

    // Partida nueva del mismo usuario registrado: hereda la de su perfil.
    const otra = await hastaPreparacion(u);
    expect(otra.prep.modalidadPreferida).toBe('2d');
    await otra.ws.cerrar();
  });

  it('un invitado empieza siempre con la rápida y, con ella, el partido se juega por partes', async () => {
    const u = await crearInvitado(srv.url);
    const { partidaId, ws, prep } = await hastaPreparacion(u);
    expect(prep.modalidadPreferida).toBe('rapida');
    const desde = ws.recibidos.length;
    await peticion(srv.url, `/api/partidos/${prep.partidoId}/abrir`, { metodo: 'POST', cookie: u.cookie, cuerpo: { modalidad: 'rapida' } });
    const inicio = await ws.esperar('partido.inicio', { desde });
    expect(inicio.modalidad).toBe('rapida');
    const c = await srv.gestor.obtenerOError(partidaId);
    expect(c.partidosEnCurso.get(prep.partidoId)?.dosD).toBeNull();
    const perfiles = await bd.db.execute(sql`select * from perfiles_usuario where usuario_id = ${u.id}`);
    expect(perfiles.rows).toHaveLength(0);
    await ws.cerrar();
  });

  it('dos humanos con modos distintos ven el mismo partido entre ellos (SC-018)', async () => {
    const b = await crearRegistrado(srv.url);
    const { anfitrion: a, partida } = await partidaTrasDraft(srv, { cuerpo: { plazasHumanas: 2, plazoJornadaHoras: 24 }, otros: [b] });
    const c = await srv.gestor.obtenerOError(partida.id);
    const ids = [c.participanteDeUsuario(a.id)!.id, c.participanteDeUsuario(b.id)!.id].sort().join();
    let partidoId = '';
    await avanzarHasta(
      srv,
      24 * HORA + 1,
      async () => {
        const j = (await torneo(srv, partida.id, a)).jornadas.find((x: any) => x.estado === 'abierta');
        partidoId = j?.partidos.find((p: any) => [p.local.id, p.visitante.id].sort().join() === ids)?.partidoId ?? '';
        return partidoId !== '';
      },
      10,
    );
    expect((await peticion(srv.url, `/api/partidos/${partidoId}/abrir`, { metodo: 'POST', cookie: a.cookie, cuerpo: { modalidad: '2d' } })).cuerpo.modalidad).toBe('2d');
    expect((await peticion(srv.url, `/api/partidos/${partidoId}/abrir`, { metodo: 'POST', cookie: b.cookie, cuerpo: { modalidad: 'rapida' } })).cuerpo.modalidad).toBe('rapida');
    const ra = (await peticion(srv.url, `/api/partidos/${partidoId}/reproduccion`, { cookie: a.cookie })).cuerpo;
    const rb = (await peticion(srv.url, `/api/partidos/${partidoId}/reproduccion`, { cookie: b.cookie })).cuerpo;
    expect(ra.inicio.modalidad).toBe('2d');
    expect(rb.inicio.modalidad).toBe('rapida');
    expect(ra.fin).toEqual(rb.fin);
    const eventos = (r: any) => r.tramos.flatMap((t: any) => t.eventos);
    expect(eventos(ra)).toEqual(eventos(rb));
    expect(ra.tramos.some((t: any) => t.fotogramas?.length > 0)).toBe(true);
    expect(rb.tramos.some((t: any) => t.fotogramas?.length > 0)).toBe(false);
    // Con ?modalidad= se pide la otra presentación sin cambiar el resultado.
    const rb2d = (await peticion(srv.url, `/api/partidos/${partidoId}/reproduccion?modalidad=2d`, { cookie: b.cookie })).cuerpo;
    expect(rb2d.fin).toEqual(ra.fin);
  });
});

describe('migración 0006 (modo de simulación)', () => {
  it('pasa tipo_simulacion a los humanos de cada partida, deja a los NPC sin modalidad y crea perfiles_usuario', async () => {
    const bd = await bdHasta('0005_colocacion');
    try {
      await bd.db.execute(sql`insert into usuarios (id, apodo, email) values ('u1', 'Ana', 'ana@x.es')`);
      const p = await bd.db.execute<{ id: string }>(
        sql`insert into partidas (anfitrion_id, modo, num_participantes, plazas_humanas, tipo_simulacion, tiempos, semilla) values ('u1', 'liga', 4, 1, 'rapida', '{}'::jsonb, 'abc') returning id`,
      );
      const partidaId = p.rows[0]!.id;
      await bd.db.execute(sql`insert into participantes (partida_id, tipo, usuario_id, nombre_equipo) values (${partidaId}, 'humano', 'u1', 'Equipo de Ana')`);
      await bd.db.execute(sql`insert into participantes (partida_id, tipo, nivel_npc, nombre_equipo) values (${partidaId}, 'npc', 'amateur', 'NPC FC')`);
      await bd.completar();
      const filas = await bd.db.execute<{ tipo: string; m: string | null }>(sql`select tipo, ultima_modalidad as m from participantes order by tipo`);
      expect(filas.rows).toEqual([
        { tipo: 'humano', m: 'rapida' },
        { tipo: 'npc', m: null },
      ]);
      const columnas = await bd.db.execute<{ column_name: string }>(sql`select column_name from information_schema.columns where table_name = 'partidas'`);
      expect(columnas.rows.map((c) => c.column_name)).not.toContain('tipo_simulacion');
      const perfil = await bd.db.execute<{ column_name: string }>(sql`select column_name from information_schema.columns where table_name = 'perfiles_usuario'`);
      expect(perfil.rows.map((c) => c.column_name)).toEqual(expect.arrayContaining(['usuario_id', 'ultima_modalidad', 'actualizado_en']));
    } finally {
      await bd.detener();
    }
  });
});
