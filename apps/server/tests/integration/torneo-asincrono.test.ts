import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { ClienteWs } from '../helpers/clienteWs';
import { avanzarHasta, espera, torneo } from '../helpers/torneo';
import { crearRegistrado, peticion, type UsuarioPrueba } from '../helpers/usuarios';

const HORA = 3600_000;

describe('torneo asíncrono (US4; FR-056 a FR-056c)', () => {
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
      cuerpo: { modo: 'liga', numParticipantes: 4, tipoSimulacion: 'rapida', ritmo: 'asincrono', plazoJornadaHoras: 24, plazasHumanas: 2 },
    });
    const partidaId: string = r.cuerpo.id;
    await peticion(srv.url, `/api/partidas/${partidaId}/unirse`, { metodo: 'POST', cookie: b.cookie });
    const wa = await ClienteWs.conectar(srv.urlWs, partidaId, a.cookie);
    await wa.esperar('estado');
    await peticion(srv.url, `/api/partidas/${partidaId}/iniciar`, { metodo: 'POST', cookie: a.cookie });
    // El draft de una partida asíncrona se juega en directo, con turnos de 45 s (FR-056c).
    const turno = await wa.esperar('draft.turno');
    expect(Date.parse(turno.venceEn) - srv.reloj.ahora()).toBe(45_000);
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

  it('un partido entre humanos empieza cuando los dos están listos; el rival recibe "rival listo"', async () => {
    const { a, b, partidaId, wa } = await ligaAsincrona();
    const c = await srv.gestor.obtenerOError(partidaId);
    const ia = c.participanteDeUsuario(a.id)!.id;
    const ib = c.participanteDeUsuario(b.id)!.id;
    // Avanzar jornadas (vencen los plazos) hasta la que enfrenta a los dos humanos.
    let partidoId: string | undefined;
    await avanzarHasta(srv, 24 * HORA + 1, async () => {
      const t = await torneo(srv, partidaId, a);
      const j = t.jornadas.find((x: any) => x.estado === 'abierta');
      partidoId = j?.partidos.find((p: any) => [p.local.id, p.visitante.id].sort().join() === [ia, ib].sort().join())?.partidoId;
      return partidoId !== undefined;
    }, 10);
    const wb = await ClienteWs.conectar(srv.urlWs, partidaId, b.cookie);
    await wb.esperar('estado');
    const r = await peticion(srv.url, `/api/partidos/${partidoId}/listo`, { metodo: 'POST', cookie: a.cookie });
    expect(r.cuerpo.iniciado).toBe(false);
    expect(await hayAviso(b, 'rival_listo')).toBe(true);
    const desde = wb.recibidos.length;
    const r2 = await peticion(srv.url, `/api/partidos/${partidoId}/listo`, { metodo: 'POST', cookie: b.cookie });
    expect(r2.cuerpo.iniciado).toBe(true);
    await wb.esperar('partido.inicio', { desde });
    await wa.cerrar();
    await wb.cerrar();
  });

  it('avisa 2 h antes del plazo; al vencer, los partidos pendientes se simulan solos y se abre la siguiente jornada', async () => {
    const { a, partidaId, wa } = await ligaAsincrona();
    srv.reloj.avanzar(22 * HORA + 1);
    expect(await hayAviso(a, 'plazo_proximo')).toBe(true);
    srv.reloj.avanzar(2 * HORA);
    await avanzarHasta(srv, 1000, async () => (await torneo(srv, partidaId, a)).jornadaActual === 2);
    const t = await torneo(srv, partidaId, a);
    expect(t.jornadas[0].estado).toBe('cerrada');
    expect(t.jornadas[0].partidos.some((p: any) => p.resueltoAutomaticamente)).toBe(true);
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
