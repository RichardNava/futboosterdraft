/**
 * Reproducción de un partido entre humanos ya resuelto (research R8; contracts/http-api.md; T036): los dos
 * participantes reciben exactamente el mismo partido, los fotogramas se recalculan de forma determinista y
 * la respuesta va comprimida.
 */
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cacheReproducciones } from '../../src/actores/partidoEntreHumanos';
import { partidos } from '../../src/persistencia/esquema/index';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { partidaTrasDraft } from '../helpers/partidas';
import { avanzarHasta, torneo } from '../helpers/torneo';
import { crearRegistrado, peticion, type UsuarioPrueba } from '../helpers/usuarios';

const HORA = 3600_000;

describe('reproducción de un partido entre humanos (US11)', () => {
  let bd: BdPruebas;
  let srv: ServidorPruebas;
  let a: UsuarioPrueba;
  let b: UsuarioPrueba;
  let partidoId: string;

  beforeAll(async () => {
    bd = await iniciarBdPruebas();
    srv = await iniciarServidorPruebas(bd);
    b = await crearRegistrado(srv.url);
    const r = await partidaTrasDraft(srv, { cuerpo: { tipoSimulacion: '2d', plazasHumanas: 2, plazoJornadaHoras: 24 }, otros: [b] });
    a = r.anfitrion;
    const partidaId = r.partida.id;
    const c = await srv.gestor.obtenerOError(partidaId);
    const ids = [c.participanteDeUsuario(a.id)!.id, c.participanteDeUsuario(b.id)!.id].sort().join();
    await avanzarHasta(srv, 24 * HORA + 1, async () => {
      const j = (await torneo(srv, partidaId, a)).jornadas.find((x: any) => x.estado === 'abierta');
      partidoId = j?.partidos.find((p: any) => [p.local.id, p.visitante.id].sort().join() === ids)?.partidoId;
      return partidoId !== undefined;
    }, 10);
    await peticion(srv.url, `/api/partidos/${partidoId}/abrir`, { metodo: 'POST', cookie: a.cookie });
  });
  afterAll(async () => {
    await srv?.cerrar();
    await bd?.detener();
  });

  it('A y B reciben exactamente los mismos eventos, tramos y resultado', async () => {
    const ra = await peticion(srv.url, `/api/partidos/${partidoId}/reproduccion`, { cookie: a.cookie });
    const rb = await peticion(srv.url, `/api/partidos/${partidoId}/reproduccion`, { cookie: b.cookie });
    expect(ra.estado).toBe(200);
    expect(rb.cuerpo).toEqual(ra.cuerpo);
    expect(ra.cuerpo.inicio.decisiones).toBe(false);
    expect(ra.cuerpo.tramos.length).toBeGreaterThan(1);
    const eventos = ra.cuerpo.tramos.flatMap((t: any) => t.eventos);
    const goles = eventos.filter((e: any) => e.tipo === 'gol');
    expect(goles.length).toBe(ra.cuerpo.fin.marcador.local + ra.cuerpo.fin.marcador.visitante);
  });

  it('los fotogramas recalculados son idénticos en dos peticiones (con o sin caché)', async () => {
    const primera = (await peticion(srv.url, `/api/partidos/${partidoId}/reproduccion`, { cookie: a.cookie })).cuerpo;
    cacheReproducciones.vaciar();
    const segunda = (await peticion(srv.url, `/api/partidos/${partidoId}/reproduccion`, { cookie: a.cookie })).cuerpo;
    expect(primera.tramos.some((t: any) => Array.isArray(t.fotogramas) && t.fotogramas.length > 0)).toBe(true);
    expect(segunda).toEqual(primera);
  });

  it('la respuesta llega comprimida', async () => {
    const r = await fetch(`${srv.url}/api/partidos/${partidoId}/reproduccion`, { headers: { cookie: a.cookie, 'accept-encoding': 'gzip, br' } });
    expect(r.status).toBe(200);
    expect(['gzip', 'br']).toContain(r.headers.get('content-encoding'));
  });

  it('un partido de parámetros 1.x responde 409 VERSION_NO_REPRODUCIBLE', async () => {
    await bd.db.update(partidos).set({ versionParametros: '1.0.0' }).where(eq(partidos.id, partidoId));
    const r = await peticion(srv.url, `/api/partidos/${partidoId}/reproduccion`, { cookie: b.cookie });
    expect(r.estado).toBe(409);
    expect(r.cuerpo.error.codigo).toBe('VERSION_NO_REPRODUCIBLE');
    await bd.db.update(partidos).set({ versionParametros: '2.0.0' }).where(eq(partidos.id, partidoId));
  });
});
