/**
 * Dorsales (FR-035 a FR-038; research R14; T130): reasignación sin duplicados y asignación automática al
 * empezar un partido, con aviso si el partido se resolvió sin el participante.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { ClienteWs } from '../helpers/clienteWs';
import { avanzarHasta, torneo } from '../helpers/torneo';
import { crearInvitado, crearRegistrado, peticion, type UsuarioPrueba } from '../helpers/usuarios';

const TURNO = 46_000;
const HORA = 3_600_000;
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('dorsales (US8)', () => {
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

  /** Quita el dorsal a un titular: otro jugador de la plantilla se lleva su número. */
  async function dejarSinDorsal(u: UsuarioPrueba, partidaId: string) {
    const ruta = `/api/partidas/${partidaId}`;
    const { alineacion, dorsales } = (await peticion(srv.url, `${ruta}/alineacion`, { cookie: u.cookie })).cuerpo;
    // Confirma el once para que queden fijados los dorsales iniciales.
    const confirmada = await peticion(srv.url, `${ruta}/alineacion`, { metodo: 'PUT', cookie: u.cookie, cuerpo: alineacion });
    const fijados = confirmada.cuerpo.dorsales ?? dorsales;
    const titular: number = alineacion.titulares.find((t: any) => t.casillaId !== 'POR').jugadorId;
    const otro = Number(Object.keys(fijados).find((id) => Number(id) !== titular && !alineacion.titulares.some((t: any) => t.jugadorId === Number(id)) && !alineacion.suplentes.includes(Number(id))));
    const libre: number = fijados[otro];
    const r = await peticion(srv.url, `${ruta}/dorsales`, { metodo: 'PUT', cookie: u.cookie, cuerpo: { jugadorId: otro, dorsal: fijados[titular] } });
    expect(r.estado, JSON.stringify(r.cuerpo)).toBe(200);
    expect(r.cuerpo.sinDorsal).toEqual([titular]);
    return { titular, libre };
  }

  it('al empezar el partido, el convocado sin dorsal recibe el libre más bajo y llega en partido.inicio', async () => {
    const u = await crearInvitado(srv.url);
    const r = await peticion(srv.url, '/api/partidas', { cookie: u.cookie, cuerpo: { modo: 'liga', numParticipantes: 4, tipoSimulacion: 'rapida' } });
    const partidaId: string = r.cuerpo.id;
    const ws = await ClienteWs.conectar(srv.urlWs, partidaId, u.cookie);
    await peticion(srv.url, `/api/partidas/${partidaId}/iniciar`, { metodo: 'POST', cookie: u.cookie });
    for (let i = 0; i < 30 && !ws.recibidos.some((m) => m.t === 'preparacion.inicio'); i++) {
      srv.reloj.avanzar(TURNO);
      await espera(60);
    }
    const prep = await ws.esperar('preparacion.inicio');
    const { titular, libre } = await dejarSinDorsal(u, partidaId);

    const desde = ws.recibidos.length;
    await peticion(srv.url, `/api/partidos/${prep.partidoId}/abrir`, { metodo: 'POST', cookie: u.cookie });
    const inicio = await ws.esperar('partido.inicio', { desde });
    expect(inicio.dorsalesAsignados).toEqual([{ jugadorId: titular, dorsal: libre }]);
    expect(inicio.dorsales[titular]).toBe(libre);
    // Se guarda.
    await ws.esperar('partido.pausa_decision', { desde });
    const c = await srv.gestor.obtenerOError(partidaId);
    const guardados = await c.servicios.repoEquipo.dorsales(c.participanteDeUsuario(u.id)!.id);
    expect(guardados![titular]).toBe(libre);
    const valores = Object.values(guardados!);
    expect(new Set(valores).size).toBe(valores.length);
    await ws.cerrar();
  });

  it('si el partido se resolvió sin el participante (vence el plazo), recibe el aviso dorsal_asignado', async () => {
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
    await avanzarHasta(srv, TURNO, async () => (await torneo(srv, partidaId, a)).jornadaActual === 1);
    await wa.cerrar();
    await dejarSinDorsal(b, partidaId);

    // Nadie juega la jornada: al vencer el plazo, sus partidos se resuelven sin ellos.
    srv.reloj.avanzar(24 * HORA + 1);
    let aviso: any;
    for (let i = 0; i < 50 && !aviso; i++) {
      await espera(100);
      aviso = ((await peticion(srv.url, '/api/avisos', { cookie: b.cookie })).cuerpo as any[]).find((x) => x.tipo === 'dorsal_asignado');
    }
    expect(aviso).toBeDefined();
    expect(aviso.texto).toMatch(/lleva el \d+/);
  });
});
