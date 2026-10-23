/**
 * Modo Duelo de jugadores (spec 005, T060; FR-060 a FR-069; contracts/http-api.md).
 */
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { ClienteWs } from '../helpers/clienteWs';
import { esperarEstado } from '../helpers/partidas';
import { espera, torneo } from '../helpers/torneo';
import { crearInvitado, crearRegistrado, peticion, type UsuarioPrueba } from '../helpers/usuarios';

describe('modo Duelo de jugadores (spec 005, US3)', () => {
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

  async function crearDuelos(u: UsuarioPrueba, cuerpo: Record<string, unknown> = {}) {
    const r = await peticion(srv.url, '/api/partidas', { cookie: u.cookie, cuerpo: { modo: 'duelos', numParticipantes: 4, ...cuerpo } });
    expect(r.estado, JSON.stringify(r.cuerpo)).toBe(201);
    return r.cuerpo as { id: string; duelos: { formacion: string; estadoForma: boolean }; versionCatalogo: number };
  }

  it('solo admite 4, 8 o 16 participantes y por defecto juega en 4-3-3 con Estado de forma', async () => {
    const u = await crearInvitado(srv.url);
    for (const n of [5, 6]) {
      const r = await peticion(srv.url, '/api/partidas', { cookie: u.cookie, cuerpo: { modo: 'duelos', numParticipantes: n } });
      expect(r.estado).toBe(422);
      expect(r.cuerpo.error.codigo).toBe('NUM_PARTICIPANTES_INVALIDO');
    }
    const p = await crearDuelos(u);
    expect(p.duelos).toEqual({ formacion: '4-3-3', estadoForma: true });
    expect(p.versionCatalogo).toBe(2);
  });

  it('PUT /duelos: solo el anfitrión, solo en duelos, idempotente, validado y fijo al empezar el draft', async () => {
    const anfitrion = await crearRegistrado(srv.url);
    const otro = await crearRegistrado(srv.url);
    const p = await crearDuelos(anfitrion, { plazasHumanas: 2 });
    await peticion(srv.url, `/api/partidas/${p.id}/unirse`, { metodo: 'POST', cookie: otro.cookie });
    const ws = await ClienteWs.conectar(srv.urlWs, p.id, otro.cookie);
    const cuerpo = { formacion: '4-4-2', estadoForma: false };

    const prohibido = await peticion(srv.url, `/api/partidas/${p.id}/duelos`, { metodo: 'PUT', cookie: otro.cookie, cuerpo });
    expect(prohibido.estado).toBe(403);
    expect(prohibido.cuerpo.error.codigo).toBe('SOLO_ANFITRION');

    const invalido = await peticion(srv.url, `/api/partidas/${p.id}/duelos`, { metodo: 'PUT', cookie: anfitrion.cookie, cuerpo: { formacion: '9-9-9', estadoForma: true } });
    expect(invalido.estado).toBe(400);
    expect(invalido.cuerpo.error.codigo).toBe('CONFIG_INVALIDA');

    const desde = ws.recibidos.length;
    for (let i = 0; i < 2; i++) {
      const ok = await peticion(srv.url, `/api/partidas/${p.id}/duelos`, { metodo: 'PUT', cookie: anfitrion.cookie, cuerpo });
      expect(ok.estado).toBe(200);
      expect(ok.cuerpo).toEqual({ duelos: cuerpo });
    }
    const sala = await ws.esperar('sala.actualizada', { desde });
    expect(sala.duelos).toEqual(cuerpo);
    expect((await peticion(srv.url, `/api/partidas/${p.id}`, { cookie: otro.cookie })).cuerpo.duelos).toEqual(cuerpo);

    const liga = await peticion(srv.url, '/api/partidas', { cookie: anfitrion.cookie, cuerpo: { modo: 'liga', numParticipantes: 4 } });
    const noDuelos = await peticion(srv.url, `/api/partidas/${liga.cuerpo.id}/duelos`, { metodo: 'PUT', cookie: anfitrion.cookie, cuerpo });
    expect(noDuelos.estado).toBe(409);
    expect(noDuelos.cuerpo.error.codigo).toBe('MODO_NO_DUELOS');

    await peticion(srv.url, `/api/partidas/${p.id}/iniciar`, { metodo: 'POST', cookie: anfitrion.cookie });
    const fijada = await peticion(srv.url, `/api/partidas/${p.id}/duelos`, { metodo: 'PUT', cookie: anfitrion.cookie, cuerpo });
    expect(fijada.estado).toBe(409);
    expect(fijada.cuerpo.error.codigo).toBe('CONFIG_FIJADA');
    await ws.cerrar();
  });

  it('torneo de 4 completo con un humano: once bloqueado, cruces resueltos y ocultos hasta verlos, y campeón', async () => {
    const u = await crearInvitado(srv.url);
    const p = await crearDuelos(u);
    await peticion(srv.url, `/api/partidas/${p.id}/iniciar`, { metodo: 'POST', cookie: u.cookie });
    await esperarEstado(srv, p.id, u, 'en_torneo');

    // Formación: solo titulares en la formación común, sin dorsales ni equipaciones.
    const vista = (await peticion(srv.url, `/api/partidas/${p.id}/alineacion`, { cookie: u.cookie })).cuerpo;
    expect(vista).toMatchObject({ bloqueada: false, soloTitulares: true, formacionFija: '4-3-3' });
    expect(vista.alineacion.formacion).toBe('4-3-3');
    expect(vista.alineacion.suplentes).toEqual([]);
    expect(vista.dorsales).toBeNull();
    for (const ruta of ['dorsales', 'equipaciones']) {
      const r = await peticion(srv.url, `/api/partidas/${p.id}/${ruta}`, { metodo: 'PUT', cookie: u.cookie, cuerpo: ruta === 'dorsales' ? { jugadorId: 1, dorsal: 9 } : vista.equipaciones ?? {} });
      expect(r.estado, ruta).toBe(ruta === 'dorsales' ? 409 : r.estado);
      if (ruta === 'dorsales') expect(r.cuerpo.error.codigo).toBe('NO_DISPONIBLE_EN_MODO');
    }
    const otraFormacion = await peticion(srv.url, `/api/partidas/${p.id}/alineacion`, { metodo: 'PUT', cookie: u.cookie, cuerpo: { ...vista.alineacion, formacion: '4-4-2' } });
    expect(otraFormacion.estado).toBe(400);
    expect(otraFormacion.cuerpo.error.codigo).toBe('FORMACION_FIJA');

    // Las semifinales sin humanos ya están resueltas; la propia espera al once.
    let t = await torneo(srv, p.id, u);
    const semis = t.jornadas.find((j: any) => j.estado === 'abierta');
    expect(semis.partidos.every((x: any) => x.tipo === 'duelos')).toBe(true);
    const mio = semis.partidos.find((x: any) => x.estado === 'programado');
    expect(mio).toBeDefined();

    const confirmada = await peticion(srv.url, `/api/partidas/${p.id}/alineacion`, { metodo: 'PUT', cookie: u.cookie, cuerpo: vista.alineacion });
    expect(confirmada.estado, JSON.stringify(confirmada.cuerpo)).toBe(200);
    expect(confirmada.cuerpo.bloqueada).toBe(true);
    const segunda = await peticion(srv.url, `/api/partidas/${p.id}/alineacion`, { metodo: 'PUT', cookie: u.cookie, cuerpo: vista.alineacion });
    expect(segunda.estado).toBe(409);
    expect(segunda.cuerpo.error.codigo).toBe('ALINEACION_BLOQUEADA');

    // Confirmar el once resuelve su cruce, que no se revela hasta verlo.
    const oculto = (await peticion(srv.url, `/api/partidos/${mio.partidoId}`, { cookie: u.cookie })).cuerpo;
    expect(oculto).toMatchObject({ estado: 'pendiente_de_ver', tipo: 'duelos', duelos: null, marcador: null });
    t = await torneo(srv, p.id, u);
    expect(t.jornadas.flatMap((j: any) => j.partidos).find((x: any) => x.partidoId === mio.partidoId).estado).toBe('pendiente_de_ver');
    const repro = await peticion(srv.url, `/api/partidos/${mio.partidoId}/reproduccion`, { cookie: u.cookie });
    expect(repro.estado).toBe(409);
    expect(repro.cuerpo.error.codigo).toBe('NO_APLICA');

    const abierto = (await peticion(srv.url, `/api/partidos/${mio.partidoId}/abrir`, { metodo: 'POST', cookie: u.cookie, cuerpo: { modalidad: 'rapida' } })).cuerpo;
    expect(abierto.modo).toBe('duelos');
    expect(abierto.duelos.duelos).toHaveLength(11);
    expect(Object.keys(abierto.cartas)).toHaveLength(22);
    for (let i = 0; i < 2; i++) expect((await peticion(srv.url, `/api/partidos/${mio.partidoId}/visto`, { metodo: 'POST', cookie: u.cookie })).cuerpo).toEqual({ ok: true });
    const visto = (await peticion(srv.url, `/api/partidos/${mio.partidoId}`, { cookie: u.cookie })).cuerpo;
    expect(visto.tipo).toBe('duelos');
    expect(visto.duelos.ganados.local + visto.duelos.ganados.visitante).toBeLessThanOrEqual(11);
    expect(visto.marcador).toEqual(visto.duelos.ganados);

    // El resto del torneo: «Siguiente jornada» abre la final, que se resuelve sola con el once ya bloqueado.
    for (let i = 0; i < 10 && !(await torneo(srv, p.id, u)).campeon; i++) {
      const actual = await torneo(srv, p.id, u);
      for (const id of actual.pendientesDeVer) await peticion(srv.url, `/api/partidos/${id}/visto`, { metodo: 'POST', cookie: u.cookie });
      if (!actual.jornadas.some((j: any) => j.estado === 'abierta')) {
        await peticion(srv.url, `/api/partidas/${p.id}/siguiente-jornada`, { metodo: 'POST', cookie: u.cookie });
      }
      // Eliminado: el resto se simula.
      if (actual.puedeSimularResto) await peticion(srv.url, `/api/partidas/${p.id}/simular-resto`, { metodo: 'POST', cookie: u.cookie });
      await espera(50);
    }
    t = await torneo(srv, p.id, u);
    expect(t.campeon).not.toBeNull();
    expect(t.cuadro.rondas).toHaveLength(2);
    const filas = await bd.db.execute<{ tipo: string; estado: string; duelos: unknown }>(sql`select tipo, estado, duelos from partidos where partida_id = ${p.id}`);
    expect(filas.rows).toHaveLength(3);
    for (const f of filas.rows) expect(f).toMatchObject({ tipo: 'duelos', estado: 'finalizado' });
    // Sin bajas ni amarillas acumuladas.
    const bajas = await bd.db.execute<{ n: number }>(sql`select count(*)::int as n from bajas where partida_id = ${p.id}`);
    const amarillas = await bd.db.execute<{ n: number }>(sql`select count(*)::int as n from contadores_amarillas where partida_id = ${p.id}`);
    expect([bajas.rows[0]!.n, amarillas.rows[0]!.n]).toEqual([0, 0]);
  });
});
