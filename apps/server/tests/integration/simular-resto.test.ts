/**
 * Eliminación, pantallas de final de torneo y «Simular resto del torneo» (spec 003, US10: FR-039 a FR-041b,
 * SC-020a; T099).
 */
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { ClienteWs } from '../helpers/clienteWs';
import { bdHasta } from '../helpers/migraciones';
import { avanzarHasta, espera, seguirSiempre, torneo } from '../helpers/torneo';
import { crearInvitado, crearRegistrado, peticion, type UsuarioPrueba } from '../helpers/usuarios';

describe('simular el resto del torneo (T099)', () => {
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

  async function crear(u: UsuarioPrueba, cuerpo: Record<string, unknown>, otros: UsuarioPrueba[] = []) {
    const r = await peticion(srv.url, '/api/partidas', { cookie: u.cookie, cuerpo });
    expect(r.estado, JSON.stringify(r.cuerpo)).toBe(201);
    const partidaId: string = r.cuerpo.id;
    for (const o of otros) await peticion(srv.url, `/api/partidas/${partidaId}/unirse`, { metodo: 'POST', cookie: o.cookie });
    const sockets = await Promise.all([u, ...otros].map((x) => ClienteWs.conectar(srv.urlWs, partidaId, x.cookie)));
    await sockets[0]!.esperar('estado');
    const paradas = sockets.map((ws) => seguirSiempre(ws));
    await peticion(srv.url, `/api/partidas/${partidaId}/iniciar`, { metodo: 'POST', cookie: u.cookie });
    await avanzarHasta(srv, 46_000, async () => (await torneo(srv, partidaId, u)).jornadaActual === 1);
    return {
      partidaId,
      async cerrar() {
        paradas.forEach((p) => p());
        for (const ws of sockets) await ws.cerrar();
      },
    };
  }

  /** Alineación saboteada (portero de jugador de campo y un delantero en la portería) para perder casi seguro. */
  async function sabotear(partidaId: string, u: UsuarioPrueba) {
    const { alineacion, plantilla } = (await peticion(srv.url, `/api/partidas/${partidaId}/alineacion`, { cookie: u.cookie })).cuerpo;
    const dem = (id: number) => plantilla.find((j: any) => j.id === id)?.demarcacion;
    const portero = alineacion.titulares.find((t: any) => t.casillaId === 'POR');
    const delantero = alineacion.titulares.find((t: any) => dem(t.jugadorId) === 'DEL') ?? alineacion.titulares.find((t: any) => t.casillaId !== 'POR');
    const titulares = alineacion.titulares.map((t: any) =>
      t === portero ? { ...t, jugadorId: delantero.jugadorId } : t === delantero ? { ...t, jugadorId: portero.jugadorId } : t,
    );
    await peticion(srv.url, `/api/partidas/${partidaId}/alineacion`, { metodo: 'PUT', cookie: u.cookie, cuerpo: { ...alineacion, titulares, colocacion: undefined } });
  }

  /** Juega los partidos de los humanos (saboteados) hasta que todos estén eliminados o haya campeón. */
  async function jugarHastaCaer(partidaId: string, humanos: UsuarioPrueba[]) {
    for (let i = 0; i < 4000; i++) {
      const vistas = await Promise.all(humanos.map((u) => torneo(srv, partidaId, u)));
      if (vistas.every((t) => t.miEliminacion) || vistas[0].campeon) return vistas;
      for (const [k, u] of humanos.entries()) {
        const t = vistas[k];
        if (t.miEliminacion) continue;
        const abierta = t.jornadas.find((j: any) => j.estado === 'abierta');
        const mio = abierta?.partidos.find((p: any) => p.estado === 'programado');
        if (abierta && mio) {
          await sabotear(partidaId, u);
          await peticion(srv.url, `/api/partidos/${mio.partidoId}/abrir`, { metodo: 'POST', cookie: u.cookie });
        } else if (!abierta && humanos.length === 1 && t.jornadaActual !== null && !t.campeon) {
          await peticion(srv.url, `/api/partidas/${partidaId}/siguiente-jornada`, { metodo: 'POST', cookie: u.cookie });
        }
      }
      srv.reloj.avanzar(1000);
      await espera(30);
    }
    throw new Error('No se llegó a la eliminación');
  }

  const simular = (partidaId: string, u: UsuarioPrueba, clave: string) =>
    peticion(srv.url, `/api/partidas/${partidaId}/simular-resto`, { metodo: 'POST', cookie: u.cookie, cabeceras: { 'idempotency-key': clave } });

  it('playoff de 8 en solitario: al caer, puede simular el resto; la respuesta trae el campeón y es idempotente', { timeout: 300_000 }, async () => {
    const u = await crearInvitado(srv.url);
    const p = await crear(u, { modo: 'playoff', numParticipantes: 8 });
    const [t] = await jugarHastaCaer(p.partidaId, [u]);
    // Aun saboteado puede llegar a la final (o ganarla): entonces ya hay campeón y no queda nada que simular.
    if (t.campeon) {
      expect(t.puedeSimularResto).toBe(false);
      return p.cerrar();
    }
    expect(['cuartos', 'semifinal']).toContain(t.miEliminacion.fase);
    expect(t.miEliminacion.etiqueta).toBe({ cuartos: 'Cuartos de final', semifinal: 'Semifinales' }[t.miEliminacion.fase as string]);
    expect(t.puedeSimularResto).toBe(true);
    expect(t.pantallas).toEqual({ derrotaVista: false, campeonVisto: false });

    // Sin la cabecera de idempotencia, 400.
    expect((await peticion(srv.url, `/api/partidas/${p.partidaId}/simular-resto`, { metodo: 'POST', cookie: u.cookie })).estado).toBe(400);
    const r = await simular(p.partidaId, u, 'clave-1');
    expect(r.estado, JSON.stringify(r.cuerpo)).toBe(200);
    expect(r.cuerpo.ok).toBe(true);
    expect(r.cuerpo.campeon.id).toBeTruthy();
    const fin = await torneo(srv, p.partidaId, u);
    expect(fin.campeon.id).toBe(r.cuerpo.campeon.id);
    expect(fin.cuadro.rondas.flatMap((x: any) => x.cruces).every((c: any) => c.ganador)).toBe(true);
    expect(fin.jornadas.flatMap((j: any) => j.partidos).every((x: any) => x.estado === 'finalizado')).toBe(true);
    expect(fin.goleadores.length).toBeGreaterThan(0);
    expect(fin.puedeSimularResto).toBe(false);
    // Repetir con la misma clave da la misma respuesta; con otra, el torneo ya ha terminado.
    const otra = await simular(p.partidaId, u, 'clave-1');
    expect(otra.estado).toBe(200);
    expect(otra.cuerpo).toEqual(r.cuerpo);
    const terminado = await simular(p.partidaId, u, 'clave-2');
    expect(terminado.estado).toBe(409);
    expect(terminado.cuerpo.error.codigo).toBe('TORNEO_TERMINADO');

    // Pantallas vistas: fija las fechas y es idempotente.
    for (const pantalla of ['derrota', 'campeon', 'derrota']) {
      const v = await peticion(srv.url, `/api/partidas/${p.partidaId}/pantalla-vista`, { metodo: 'POST', cookie: u.cookie, cuerpo: { pantalla } });
      expect(v.estado).toBe(200);
    }
    expect((await torneo(srv, p.partidaId, u)).pantallas).toEqual({ derrotaVista: true, campeonVisto: true });
    expect((await peticion(srv.url, `/api/partidas/${p.partidaId}/pantalla-vista`, { metodo: 'POST', cookie: u.cookie, cuerpo: { pantalla: 'otra' } })).estado).toBe(400);
    await p.cerrar();
  });

  it('sin estar eliminado, 409 NO_ELIMINADO', async () => {
    const u = await crearInvitado(srv.url);
    const p = await crear(u, { modo: 'playoff', numParticipantes: 8 });
    const r = await simular(p.partidaId, u, 'k');
    expect(r.estado).toBe(409);
    expect(r.cuerpo.error.codigo).toBe('NO_ELIMINADO');
    expect((await torneo(srv, p.partidaId, u)).miEliminacion).toBeNull();
    await p.cerrar();
  });

  it('playoff de 16 con caída en octavos: de extremo a extremo en < 5 s (SC-020a)', { timeout: 300_000 }, async () => {
    const u = await crearInvitado(srv.url);
    const p = await crear(u, { modo: 'playoff', numParticipantes: 16 });
    const [t] = await jugarHastaCaer(p.partidaId, [u]);
    if (t.miEliminacion?.fase === 'final' || t.campeon) return p.cerrar();
    const inicio = Date.now();
    const r = await simular(p.partidaId, u, 'k16');
    expect(r.estado, JSON.stringify(r.cuerpo)).toBe(200);
    expect(Date.now() - inicio).toBeLessThan(5000);
    await p.cerrar();
  });

  it('varios humanos: con otro en competición, 409 HAY_HUMANOS_EN_COMPETICION; todos fuera, se permite sin plazos', { timeout: 600_000 }, async () => {
    const a = await crearRegistrado(srv.url);
    const b = await crearRegistrado(srv.url);
    const p = await crear(a, { modo: 'playoff', numParticipantes: 8, plazasHumanas: 2, plazoJornadaHoras: 24 }, [b]);
    let comprobado409 = false;
    for (let i = 0; i < 4000; i++) {
      const [ta, tb] = await Promise.all([torneo(srv, p.partidaId, a), torneo(srv, p.partidaId, b)]);
      if (ta.campeon) break;
      // Uno eliminado y el otro en competición: no se puede simular.
      for (const [yo, otro, u] of [[ta, tb, a], [tb, ta, b]] as const) {
        if (yo.miEliminacion && !otro.miEliminacion && !comprobado409) {
          expect(yo.puedeSimularResto).toBe(false);
          const r = await simular(p.partidaId, u, `k409-${i}`);
          expect(r.estado).toBe(409);
          expect(r.cuerpo.error.codigo).toBe('HAY_HUMANOS_EN_COMPETICION');
          comprobado409 = true;
        }
      }
      if (ta.miEliminacion && tb.miEliminacion) {
        expect(ta.puedeSimularResto).toBe(true);
        const abierta = ta.jornadas.find((j: any) => j.estado === 'abierta');
        if (abierta) expect(abierta.venceEn).toBeNull();
        const r = await simular(p.partidaId, a, 'k-todos');
        expect(r.estado, JSON.stringify(r.cuerpo)).toBe(200);
        break;
      }
      for (const [t, u] of [[ta, a], [tb, b]] as const) {
        if (t.miEliminacion) continue;
        const mio = t.jornadas.find((j: any) => j.estado === 'abierta')?.partidos.find((x: any) => x.estado === 'programado');
        if (mio) {
          await sabotear(p.partidaId, u);
          await peticion(srv.url, `/api/partidos/${mio.partidoId}/abrir`, { metodo: 'POST', cookie: u.cookie });
        }
      }
      srv.reloj.avanzar(1000);
      await espera(30);
    }
    await p.cerrar();
  });

  it('liga pura: nunca hay eliminación', async () => {
    const u = await crearInvitado(srv.url);
    const p = await crear(u, { modo: 'liga', numParticipantes: 4 });
    const t = await torneo(srv, p.partidaId, u);
    expect(t.miEliminacion).toBeNull();
    expect(t.puedeSimularResto).toBe(false);
    await p.cerrar();
  });
});

describe('migración 0007 (pantallas del torneo)', () => {
  it('añade derrota_vista_en y campeon_visto_en, nulas, sobre una base con datos', async () => {
    const bd = await bdHasta('0006_modo_simulacion');
    try {
      await bd.db.execute(sql`insert into usuarios (id, apodo, email) values ('u1', 'Ana', 'ana@x.es')`);
      const p = await bd.db.execute<{ id: string }>(
        sql`insert into partidas (anfitrion_id, modo, num_participantes, plazas_humanas, tiempos, semilla) values ('u1', 'playoff', 8, 1, '{}'::jsonb, 'abc') returning id`,
      );
      await bd.db.execute(sql`insert into participantes (partida_id, tipo, usuario_id, nombre_equipo) values (${p.rows[0]!.id}, 'humano', 'u1', 'Equipo de Ana')`);
      await bd.completar();
      const filas = await bd.db.execute<{ d: Date | null; c: Date | null }>(sql`select derrota_vista_en as d, campeon_visto_en as c from participantes`);
      expect(filas.rows).toEqual([{ d: null, c: null }]);
    } finally {
      await bd.detener();
    }
  });
});
