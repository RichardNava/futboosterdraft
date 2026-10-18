import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { ClienteWs } from '../helpers/clienteWs';
import { avanzarHasta, espera, torneo } from '../helpers/torneo';
import { crearRegistrado, peticion, type UsuarioPrueba } from '../helpers/usuarios';

const HORA = 3600_000;

describe('torneo asíncrono (spec 001/US4 y spec 002/US11; FR-030)', () => {
  let bd: BdPruebas;
  let srv: ServidorPruebas;
  let mailpit: StartedTestContainer;
  let urlMailpit: string;

  beforeAll(async () => {
    bd = await iniciarBdPruebas();
    mailpit = await new GenericContainer('axllent/mailpit').withExposedPorts(1025, 8025).start();
    urlMailpit = `http://${mailpit.getHost()}:${mailpit.getMappedPort(8025)}`;
  });
  beforeEach(async () => {
    await srv?.cerrar();
    await bd.limpiar();
    await fetch(`${urlMailpit}/api/v1/messages`, { method: 'DELETE' });
    srv = await iniciarServidorPruebas(bd, undefined, { smtpUrl: `smtp://${mailpit.getHost()}:${mailpit.getMappedPort(1025)}` });
  });
  afterAll(async () => {
    await srv?.cerrar();
    await bd?.detener();
    await mailpit?.stop();
  });

  async function correos(): Promise<{ To: { Address: string }[]; Subject: string }[]> {
    return ((await (await fetch(`${urlMailpit}/api/v1/messages`)).json()) as { messages: { To: { Address: string }[]; Subject: string }[] }).messages;
  }

  async function avisos(u: UsuarioPrueba) {
    return (await peticion(srv.url, '/api/avisos', { cookie: u.cookie })).cuerpo as { tipo: string; texto: string }[];
  }

  /** Espera (en tiempo real, sin mover el reloj) a que el usuario tenga un aviso del tipo dado. */
  async function hayAviso(u: UsuarioPrueba, tipo: string): Promise<boolean> {
    for (let i = 0; i < 50; i++) {
      if ((await avisos(u)).some((x) => x.tipo === tipo)) return true;
      await espera(100);
    }
    return false;
  }

  /** Liga de 4 asíncrona con dos humanos registrados; completa el draft (que siempre es en directo). */
  async function ligaAsincrona() {
    const a = await crearRegistrado(srv.url);
    const b = await crearRegistrado(srv.url);
    const r = await peticion(srv.url, '/api/partidas', {
      cookie: a.cookie,
      cuerpo: { modo: 'liga', numParticipantes: 4, tipoSimulacion: 'rapida', plazoJornadaHoras: 24, plazasHumanas: 2 },
    });
    const partidaId: string = r.cuerpo.id;
    await peticion(srv.url, `/api/partidas/${partidaId}/unirse`, { metodo: 'POST', cookie: b.cookie });
    const wa = await ClienteWs.conectar(srv.urlWs, partidaId, a.cookie);
    await wa.esperar('estado');
    await peticion(srv.url, `/api/partidas/${partidaId}/iniciar`, { metodo: 'POST', cookie: a.cookie });
    // El draft de una partida asíncrona se juega en directo, con turnos de 45 s (FR-056c); el primero de cada
    // ronda, con los 6 s de margen de la animación de apertura (FR-008).
    const turno = await wa.esperar('draft.turno');
    expect(Date.parse(turno.venceEn) - srv.reloj.ahora()).toBe(45_000 + 6_000);
    await avanzarHasta(srv, 46_000, async () => (await torneo(srv, partidaId, a)).jornadaActual === 1);
    return { a, b, partidaId, wa };
  }

  it('abre la jornada con plazo de 24 h y avisa en la aplicación y por correo', async () => {
    const { a, b, partidaId, wa } = await ligaAsincrona();
    const t = await torneo(srv, partidaId, a);
    const j = t.jornadas[0];
    expect(j.estado).toBe('abierta');
    expect(Date.parse(j.venceEn) - Date.parse(j.abreEn)).toBe(24 * HORA);
    expect(await hayAviso(a, 'jornada_abierta')).toBe(true);
    expect(await hayAviso(b, 'jornada_abierta')).toBe(true);
    let mails = await correos();
    for (let i = 0; i < 50 && mails.length < 2; i++) {
      await espera(100);
      mails = await correos();
    }
    expect(mails.length).toBeGreaterThanOrEqual(2);
    expect(mails.some((m) => m.Subject.includes('jornada 1'))).toBe(true);
    await wa.cerrar();
  });

  /** Ids de participante de los dos humanos y el partido que los enfrenta (adelantando jornadas por plazo). */
  async function partidoEntreHumanos(partidaId: string, a: UsuarioPrueba, b: UsuarioPrueba) {
    const c = await srv.gestor.obtenerOError(partidaId);
    const ia = c.participanteDeUsuario(a.id)!.id;
    const ib = c.participanteDeUsuario(b.id)!.id;
    let partidoId: string | undefined;
    await avanzarHasta(srv, 24 * HORA + 1, async () => {
      const t = await torneo(srv, partidaId, a);
      const j = t.jornadas.find((x: any) => x.estado === 'abierta');
      partidoId = j?.partidos.find((p: any) => [p.local.id, p.visitante.id].sort().join() === [ia, ib].sort().join())?.partidoId;
      return partidoId !== undefined;
    }, 10);
    return { c, ia, ib, partidoId: partidoId! };
  }

  it('un partido entre humanos se resuelve al abrirlo uno de ellos, sin que el otro esté conectado (US11, T034)', async () => {
    const { a, b, partidaId, wa } = await ligaAsincrona();
    const { c, ia, partidoId } = await partidoEntreHumanos(partidaId, a, b);
    const r = await peticion(srv.url, `/api/partidos/${partidoId}/abrir`, { metodo: 'POST', cookie: a.cookie });
    expect(r.estado).toBe(200);
    expect(r.cuerpo.modo).toBe('reproduccion');
    const fila = (await c.servicios.repoPartidos.obtener(partidoId))!;
    expect(fila.estado).toBe('finalizado');
    expect(fila.resolucion).toBe('apertura');
    expect(fila.abiertoPorId).toBe(ia);
    // Decisiones automáticas con el mismo nivel para los dos (research R8): el registro solo tiene decisiones de los dos lados.
    expect(c.torneo!.resultados.filter((x) => x.partidoId === partidoId)).toHaveLength(1);
    // Abrirlo otra vez no lo vuelve a resolver.
    const otra = await peticion(srv.url, `/api/partidos/${partidoId}/abrir`, { metodo: 'POST', cookie: b.cookie });
    expect(otra.cuerpo.modo).toBe('reproduccion');
    expect(c.torneo!.resultados.filter((x) => x.partidoId === partidoId)).toHaveLength(1);
    await wa.cerrar();
  });

  it('dos aperturas simultáneas resuelven el partido una sola vez (Edge Case)', async () => {
    const { a, b, partidaId, wa } = await ligaAsincrona();
    const { c, partidoId } = await partidoEntreHumanos(partidaId, a, b);
    const [ra, rb] = await Promise.all([
      peticion(srv.url, `/api/partidos/${partidoId}/abrir`, { metodo: 'POST', cookie: a.cookie }),
      peticion(srv.url, `/api/partidos/${partidoId}/abrir`, { metodo: 'POST', cookie: b.cookie }),
    ]);
    expect([ra.estado, rb.estado]).toEqual([200, 200]);
    expect(c.torneo!.resultados.filter((x) => x.partidoId === partidoId)).toHaveLength(1);
    await wa.cerrar();
  });

  it('la alineación que vale es la guardada al resolverse; después ya no cambia el partido', async () => {
    const { a, b, partidaId, wa } = await ligaAsincrona();
    const { c, ib, partidoId } = await partidoEntreHumanos(partidaId, a, b);
    const actual = (await peticion(srv.url, `/api/partidas/${partidaId}/alineacion`, { cookie: b.cookie })).cuerpo;
    const otraFormacion = actual.alineacion.formacion === '4-4-2' ? '4-3-3' : '4-4-2';
    const auto = await c.ejecutar(async () => {
      const { autoAlineacion, parametrosActuales } = await import('@fbd/domain');
      const { plantillaDe, bajasActivas } = await import('../../src/actores/equipo');
      return autoAlineacion(await plantillaDe(c, ib), bajasActivas(c, ib), parametrosActuales(), { formaciones: [otraFormacion] });
    });
    const put = await peticion(srv.url, `/api/partidas/${partidaId}/alineacion`, { metodo: 'PUT', cookie: b.cookie, cuerpo: auto });
    expect(put.estado, JSON.stringify(put.cuerpo)).toBe(200);
    await peticion(srv.url, `/api/partidos/${partidoId}/abrir`, { metodo: 'POST', cookie: a.cookie });
    const fila = (await c.servicios.repoPartidos.obtener(partidoId))!;
    const entrada = fila.entrada as { local: { participanteId: string; formacion: string }; visitante: { participanteId: string; formacion: string } };
    const deB = entrada.local.participanteId === ib ? entrada.local : entrada.visitante;
    expect(deB.formacion).toBe(otraFormacion);
    await wa.cerrar();
  });

  it('un partido contra un NPC se juega en directo cuando el humano lo abre, con decisiones', async () => {
    const { a, partidaId, wa } = await ligaAsincrona();
    const c = await srv.gestor.obtenerOError(partidaId);
    const ia = c.participanteDeUsuario(a.id)!.id;
    const t = await torneo(srv, partidaId, a);
    const mio = t.jornadas[0].partidos.find((p: any) => p.local.id === ia || p.visitante.id === ia);
    const rival = mio.local.id === ia ? mio.visitante : mio.local;
    if (rival.nivelNPC === null) return; // En esta jornada A juega contra B: lo cubren las otras pruebas.
    const desde = wa.recibidos.length;
    const r = await peticion(srv.url, `/api/partidos/${mio.partidoId}/abrir`, { metodo: 'POST', cookie: a.cookie });
    expect(r.cuerpo.modo).toBe('directo');
    const inicio = await wa.esperar('partido.inicio', { desde });
    expect(inicio.decisiones).toBe(true);
    await wa.esperar('partido.pausa_decision', { desde });
    await wa.cerrar();
  });

  it('con un solo humano no hay plazos y los NPC contra NPC se resuelven al abrir la jornada', async () => {
    const u = await crearRegistrado(srv.url);
    const r = await peticion(srv.url, '/api/partidas', { cookie: u.cookie, cuerpo: { modo: 'liga', numParticipantes: 4, tipoSimulacion: 'rapida' } });
    const partidaId: string = r.cuerpo.id;
    await peticion(srv.url, `/api/partidas/${partidaId}/iniciar`, { metodo: 'POST', cookie: u.cookie });
    await avanzarHasta(srv, 46_000, async () => (await torneo(srv, partidaId, u)).jornadaActual === 1);
    const ver = async () => (await torneo(srv, partidaId, u)).jornadas[0];
    let j = await ver();
    for (let i = 0; i < 50 && !j.partidos.some((p: any) => p.estado === 'finalizado'); i++) {
      await espera(100);
      j = await ver();
    }
    expect(j.venceEn).toBeNull();
    const c = await srv.gestor.obtenerOError(partidaId);
    const yo = c.participanteDeUsuario(u.id)!.id;
    for (const p of j.partidos) {
      const mio = p.local.id === yo || p.visitante.id === yo;
      expect(p.estado).toBe(mio ? 'programado' : 'finalizado');
    }
    // Pasa el tiempo y nada cambia: el partido del humano espera a que lo abra.
    srv.reloj.avanzar(48 * HORA);
    await espera(200);
    expect((await ver()).partidos.find((p: any) => p.local.id === yo || p.visitante.id === yo).estado).toBe('programado');
  });

  it('al rehidratar, una jornada con varios humanos sin plazo de jornada (antiguo "directo") recibe un plazo completo (research R9)', async () => {
    const { a, partidaId, wa } = await ligaAsincrona();
    await wa.cerrar();
    // Simula una jornada abierta con el temporizador de preparación de la spec 001 (5 min).
    const { jornadas } = await import('../../src/persistencia/esquema/index');
    const { eq } = await import('drizzle-orm');
    const ahora = srv.reloj.ahora();
    await bd.db.update(jornadas).set({ abreEn: new Date(ahora), venceEn: new Date(ahora + 5 * 60_000) }).where(eq(jornadas.partidaId, partidaId));
    const reloj = srv.reloj.ahora();
    await srv.cerrar();
    srv = await iniciarServidorPruebas(bd, reloj);
    await srv.gestor.rehidratar();
    const j = (await torneo(srv, partidaId, a)).jornadas[0];
    expect(Date.parse(j.venceEn) - srv.reloj.ahora()).toBe(24 * HORA);
  });

  it('avisa 2 h antes del plazo; al vencer, los partidos pendientes se simulan solos y se abre la siguiente jornada', async () => {
    const { a, partidaId, wa } = await ligaAsincrona();
    srv.reloj.avanzar(22 * HORA + 1);
    expect(await hayAviso(a, 'plazo_proximo')).toBe(true);
    srv.reloj.avanzar(2 * HORA);
    await avanzarHasta(srv, 1000, async () => (await torneo(srv, partidaId, a)).jornadaActual === 2);
    const t = await torneo(srv, partidaId, a);
    expect(t.jornadas[0].estado).toBe('cerrada');
    expect(t.jornadas[0].partidos.some((p: any) => p.resueltoAutomaticamente && p.resolucion === 'plazo')).toBe(true);
    expect(t.jornadas[1].estado).toBe('abierta');
    await wa.cerrar();
  });

  it('aunque ningún humano se conecte, el torneo termina en como mucho (jornadas × plazo) (SC-016)', async () => {
    const { a, partidaId, wa } = await ligaAsincrona();
    await wa.cerrar();
    const inicio = srv.reloj.ahora();
    await avanzarHasta(srv, 24 * HORA + 1, async () => (await torneo(srv, partidaId, a)).campeon !== null, 10);
    expect(srv.reloj.ahora() - inicio).toBeLessThanOrEqual(6 * 24 * HORA + 6 * 1000);
    expect((await peticion(srv.url, `/api/partidas/${partidaId}`, { cookie: a.cookie })).cuerpo.estado).toBe('terminada');
    expect(await hayAviso(a, 'torneo_terminado')).toBe(true);
  });
});
