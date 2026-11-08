/**
 * Alineación respetada y bajas a la vista (spec 012, US5; T059; FR-026 a FR-030, SC-007, SC-008): la confirmada no
 * cambia entre jornadas; una baja pendiente evitable bloquea con 409 en el servidor; al vencer el plazo, o sin nadie
 * con quien cubrirla, solo se sustituye la baja y se avisa; las plantillas llevan nombre, escudo y color.
 */
import type { Baja } from '@fbd/domain';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { ControladorPartida } from '../../src/actores/partida';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { ClienteWs } from '../helpers/clienteWs';
import { avanzarHasta, espera, seguirSiempre, torneo } from '../helpers/torneo';
import { crearRegistrado, peticion, type UsuarioPrueba } from '../helpers/usuarios';

const HORA = 3600_000;

describe('bajas pendientes en la alineación confirmada (spec 012, US5)', () => {
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

  const vista = async (u: UsuarioPrueba, id: string) => (await peticion(srv.url, `/api/partidas/${id}/alineacion`, { cookie: u.cookie })).cuerpo;
  const confirmar = (u: UsuarioPrueba, id: string, alineacion: unknown) =>
    peticion(srv.url, `/api/partidas/${id}/alineacion`, { metodo: 'PUT', cookie: u.cookie, cuerpo: alineacion });
  const avisos = async (u: UsuarioPrueba) => (await peticion(srv.url, '/api/avisos', { cookie: u.cookie })).cuerpo as { tipo: string; texto: string }[];
  const baja = (participanteId: string, jugadorId: number): Baja => ({
    participanteId,
    jugadorId,
    motivo: 'lesion',
    gravedad: 'media',
    partidoOrigenId: 'x',
    partidosRestantes: 2,
  });
  const ponerBajas = (c: ControladorPartida, lista: Baja[]) => c.ejecutar(() => void c.torneo!.bajas.bajas.push(...lista));
  const quitarBajas = (c: ControladorPartida, pid: string) =>
    c.ejecutar(() => {
      c.torneo!.bajas.bajas = c.torneo!.bajas.bajas.filter((b) => b.participanteId !== pid);
    });

  /** Liga de 4 con un humano registrado, ya en la jornada 1, con la alineación automática confirmada. */
  async function ligaConfirmada() {
    const u = await crearRegistrado(srv.url);
    const r = await peticion(srv.url, '/api/partidas', { cookie: u.cookie, cuerpo: { modo: 'liga', numParticipantes: 4, plazasHumanas: 1 } });
    const partidaId = r.cuerpo.id as string;
    const ws = await ClienteWs.conectar(srv.urlWs, partidaId, u.cookie);
    const parar = seguirSiempre(ws);
    await peticion(srv.url, `/api/partidas/${partidaId}/iniciar`, { metodo: 'POST', cookie: u.cookie });
    await avanzarHasta(srv, 46_000, async () => (await torneo(srv, partidaId, u)).jornadaActual === 1);
    const c = await srv.gestor.obtenerOError(partidaId);
    const yo = c.participanteDeUsuario(u.id)!.id;
    const { alineacion } = await vista(u, partidaId);
    const ok = await confirmar(u, partidaId, alineacion);
    expect(ok.estado, JSON.stringify(ok.cuerpo)).toBe(200);
    return { u, partidaId, ws, parar, c, yo, alineacion };
  }

  /** Abre y juega el partido propio de la jornada abierta. */
  async function jugarMiPartido(u: UsuarioPrueba, partidaId: string) {
    const t = await torneo(srv, partidaId, u);
    const mio = t.jornadas.find((j: any) => j.estado === 'abierta')!.partidos.find((p: any) => p.estado === 'programado');
    const r = await peticion(srv.url, `/api/partidos/${mio.partidoId}/abrir`, { metodo: 'POST', cookie: u.cookie });
    expect(r.estado, JSON.stringify(r.cuerpo)).toBe(200);
    for (let i = 0; i < 400; i++) {
      if ((await torneo(srv, partidaId, u)).jornadas.every((j: any) => j.estado !== 'abierta')) return;
      await espera(25);
    }
    throw new Error('La jornada no se cerró');
  }

  it('la confirmada se mantiene 3 jornadas sin bajas (SC-007)', async () => {
    const { u, partidaId, ws, parar, c, yo, alineacion } = await ligaConfirmada();
    for (let j = 0; j < 3; j++) {
      await quitarBajas(c, yo);
      await jugarMiPartido(u, partidaId);
      await quitarBajas(c, yo);
      const v = await vista(u, partidaId);
      expect(v.confirmada).toBe(true);
      expect(v.alineacion.titulares).toEqual(alineacion.titulares);
      expect(v.alineacion.suplentes).toEqual(alineacion.suplentes);
      expect(v.alineacion.formacion).toBe(alineacion.formacion);
      if (j < 2) expect((await peticion(srv.url, `/api/partidas/${partidaId}/siguiente-jornada`, { metodo: 'POST', cookie: u.cookie })).estado).toBe(200);
    }
    parar();
    await ws.cerrar();
  });

  it('un titular de baja: 409 BAJA_PENDIENTE al abrir y al avanzar; tras sustituirlo, el resto igual (SC-008)', async () => {
    const { u, partidaId, ws, parar, c, yo, alineacion } = await ligaConfirmada();
    const lesionado = alineacion.titulares[5].jugadorId as number;
    await quitarBajas(c, yo);
    await ponerBajas(c, [baja(yo, lesionado)]);

    const v = await vista(u, partidaId);
    expect(v.confirmada).toBe(true);
    expect(v.alineacion.titulares).toEqual(alineacion.titulares);
    expect(v.bajasPendientes).toEqual([{ jugadorId: lesionado, motivo: 'lesion', partidosRestantes: 2 }]);
    expect(v.sinSuplentes).toBe(false);
    expect(v.avisosEquipo).toContainEqual(expect.objectContaining({ nivel: 'intervencion', tipo: 'baja_pendiente', jugadorId: lesionado, enlace: 'formacion' }));

    const t = await torneo(srv, partidaId, u);
    const mio = t.jornadas.find((j: any) => j.estado === 'abierta')!.partidos.find((p: any) => p.estado === 'programado');
    const abrir = await peticion(srv.url, `/api/partidos/${mio.partidoId}/abrir`, { metodo: 'POST', cookie: u.cookie });
    expect(abrir.estado).toBe(409);
    expect(abrir.cuerpo.error.codigo).toBe('BAJA_PENDIENTE');
    expect(abrir.cuerpo.error.detalles.jugadores).toEqual([{ jugadorId: lesionado, motivo: 'lesion' }]);

    // Sustituir solo al lesionado por el primer suplente.
    const entra = alineacion.suplentes[0] as number;
    const nueva = {
      ...alineacion,
      titulares: alineacion.titulares.map((x: any) => (x.jugadorId === lesionado ? { ...x, jugadorId: entra } : x)),
      suplentes: alineacion.suplentes.filter((id: number) => id !== entra),
      lanzadores: JSON.parse(JSON.stringify(alineacion.lanzadores).replaceAll(String(lesionado), String(entra))),
    };
    const ok = await confirmar(u, partidaId, nueva);
    expect(ok.estado, JSON.stringify(ok.cuerpo)).toBe(200);
    const tras = await vista(u, partidaId);
    expect(tras.bajasPendientes).toEqual([]);
    expect(tras.alineacion.titulares.filter((x: any) => x.jugadorId !== entra)).toEqual(alineacion.titulares.filter((x: any) => x.jugadorId !== lesionado));

    // Jornada jugada; con otra baja pendiente, «Siguiente jornada» también da 409.
    await jugarMiPartido(u, partidaId);
    await quitarBajas(c, yo);
    await ponerBajas(c, [baja(yo, entra)]);
    const siguiente = await peticion(srv.url, `/api/partidas/${partidaId}/siguiente-jornada`, { metodo: 'POST', cookie: u.cookie });
    expect(siguiente.estado).toBe(409);
    expect(siguiente.cuerpo.error.codigo).toBe('BAJA_PENDIENTE');
    parar();
    await ws.cerrar();
  });

  it('sin nadie con quien sustituir: no bloquea, se juega con menos y se avisa (baja_sustituida)', async () => {
    const { u, partidaId, ws, parar, c, yo, alineacion } = await ligaConfirmada();
    const plantilla = (await c.servicios.repoDraft.plantillas([yo])).get(yo)!;
    const titulares = new Set<number>(alineacion.titulares.map((x: any) => x.jugadorId));
    const lesionado = alineacion.titulares[7].jugadorId as number;
    await quitarBajas(c, yo);
    await ponerBajas(c, [lesionado, ...plantilla.filter((id) => !titulares.has(id))].map((id) => baja(yo, id)));
    const v = await vista(u, partidaId);
    expect(v.sinSuplentes).toBe(true);
    expect(v.bajasPendientes.map((b: any) => b.jugadorId)).toContain(lesionado);
    await jugarMiPartido(u, partidaId);
    for (let i = 0; i < 40 && !(await avisos(u)).some((a) => a.tipo === 'baja_sustituida'); i++) await espera(50);
    const aviso = (await avisos(u)).find((a) => a.tipo === 'baja_sustituida');
    expect(aviso?.texto).toContain('no había nadie para sustituirlo');
    parar();
    await ws.cerrar();
  });

  it('con dos humanos, al vencer el plazo se sustituye solo la baja y se avisa', async () => {
    const a = await crearRegistrado(srv.url);
    const b = await crearRegistrado(srv.url);
    const r = await peticion(srv.url, '/api/partidas', { cookie: a.cookie, cuerpo: { modo: 'liga', numParticipantes: 4, plazoJornadaHoras: 24, plazasHumanas: 2 } });
    const partidaId = r.cuerpo.id as string;
    await peticion(srv.url, `/api/partidas/${partidaId}/unirse`, { metodo: 'POST', cookie: b.cookie });
    const wa = await ClienteWs.conectar(srv.urlWs, partidaId, a.cookie);
    await wa.esperar('estado');
    await peticion(srv.url, `/api/partidas/${partidaId}/iniciar`, { metodo: 'POST', cookie: a.cookie });
    await avanzarHasta(srv, 46_000, async () => (await torneo(srv, partidaId, a)).jornadaActual === 1);
    const c = await srv.gestor.obtenerOError(partidaId);
    const ia = c.participanteDeUsuario(a.id)!.id;
    const { alineacion } = await vista(a, partidaId);
    expect((await confirmar(a, partidaId, alineacion)).estado).toBe(200);
    const lesionado = alineacion.titulares[3].jugadorId as number;
    await ponerBajas(c, [baja(ia, lesionado)]);
    await avanzarHasta(srv, 24 * HORA + 1, async () => (await avisos(a)).some((x) => x.tipo === 'baja_sustituida'), 10);
    const aviso = (await avisos(a)).find((x) => x.tipo === 'baja_sustituida')!;
    expect(aviso.texto).toMatch(/no jugaba: entró .+ en su lugar\./);
    await wa.cerrar();
  });

  it('las plantillas llevan el nombre, el escudo y el color de cada equipo', async () => {
    const { u, partidaId, ws, parar } = await ligaConfirmada();
    const r = await peticion(srv.url, `/api/partidas/${partidaId}/plantillas`, { cookie: u.cookie });
    expect(r.estado).toBe(200);
    for (const p of r.cuerpo as { nombreEquipo: string; escudo: string | null; color: string | null }[]) {
      expect(p.nombreEquipo).toBeTruthy();
      expect(p.color).toMatch(/^#/);
      expect('escudo' in p).toBe(true);
    }
    parar();
    await ws.cerrar();
  });
});
