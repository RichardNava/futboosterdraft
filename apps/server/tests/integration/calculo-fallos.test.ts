/**
 * Fallos del cálculo de partidos (spec 009, FR-008, SC-005; research R6).
 *
 * - Un partido NPC cuyo cálculo falla no impide guardar los demás de la jornada; sigue programado y se juega
 *   al terminar otro partido de la jornada, que entonces se cierra.
 * - Con un solo hilo, si el hilo muere mientras calcula la apertura de un partido entre humanos, el cálculo se
 *   repite en un hilo nuevo con el mismo resultado que en proceso, y la partida sigue atendiendo comandos.
 */
import { parametrosActuales, parametrosPorVersion } from '@fbd/domain';
import { crearPartido, type EntradaPartido } from '@fbd/engine';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FUNCIONES } from '../../src/simulacion/funciones';
import { ErrorCalculo, type Calculo, type GrupoHilos } from '../../src/simulacion/grupo';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { ClienteWs } from '../helpers/clienteWs';
import { avanzarHasta, espera, seguirSiempre, torneo } from '../helpers/torneo';
import { crearInvitado, crearRegistrado, peticion } from '../helpers/usuarios';

const HORA = 3600_000;

describe('fallos del cálculo de partidos (spec 009)', () => {
  let bd: BdPruebas;
  let srv: ServidorPruebas | undefined;

  beforeAll(async () => {
    bd = await iniciarBdPruebas();
  });
  beforeEach(async () => {
    await srv?.cerrar();
    srv = undefined;
    await bd.limpiar();
  });
  afterAll(async () => {
    await srv?.cerrar();
    await bd?.detener();
  });

  it('un partido NPC que falla no impide guardar los demás y se juega al terminar otro de la jornada', async () => {
    const s = (srv = await iniciarServidorPruebas(bd));
    // El primer partido NPC que se calcula falla mientras `fallar` esté activo.
    const real = s.gestor.servicios.calculo;
    let fallar = true;
    let objetivo: unknown = null;
    s.gestor.servicios.calculo = {
      hilos: real.hilos,
      cerrar: () => real.cerrar(),
      ejecutar: ((nombre: string, args: unknown[], prioridad: 'humano' | 'npc') => {
        if (fallar && nombre === 'jugarHastaElFinal') {
          objetivo ??= args[2];
          if (args[2] === objetivo) return Promise.reject(new ErrorCalculo(nombre, 'caida', 3));
        }
        return (real.ejecutar as (n: string, a: unknown[], p: string) => Promise<unknown>)(nombre, args, prioridad);
      }) as Calculo['ejecutar'],
    };

    const u = await crearInvitado(s.url);
    const r = await peticion(s.url, '/api/partidas', { cookie: u.cookie, cuerpo: { modo: 'liga', numParticipantes: 6 } });
    const partidaId: string = r.cuerpo.id;
    const ws = await ClienteWs.conectar(s.urlWs, partidaId, u.cookie);
    const parar = seguirSiempre(ws);
    await peticion(s.url, `/api/partidas/${partidaId}/iniciar`, { metodo: 'POST', cookie: u.cookie });
    await avanzarHasta(s, 46_000, async () => (await torneo(s, partidaId, u)).jornadaActual === 1);
    const mio: string = (await ws.esperar('preparacion.inicio')).partidoId;

    const npc = (await torneo(s, partidaId, u)).jornadas[0].partidos.filter((p: any) => p.partidoId !== mio);
    expect(npc).toHaveLength(2);
    expect(npc.map((p: any) => p.estado).sort()).toEqual(['finalizado', 'programado']);

    fallar = false;
    await peticion(s.url, `/api/partidos/${mio}/abrir`, { metodo: 'POST', cookie: u.cookie });
    await avanzarHasta(s, 1, async () => (await torneo(s, partidaId, u)).jornadas[0].estado === 'cerrada', 500);
    const j = (await torneo(s, partidaId, u)).jornadas[0];
    expect(j.partidos.every((p: any) => p.estado === 'finalizado')).toBe(true);
    parar();
    await ws.cerrar();
  });

  it('con un hilo, si muere durante la apertura entre humanos, se repite con el mismo resultado (SC-005)', async () => {
    const s = (srv = await iniciarServidorPruebas(bd, undefined, { hilosSimulacion: 1 }));
    const a = await crearRegistrado(s.url);
    const b = await crearRegistrado(s.url);
    const r = await peticion(s.url, '/api/partidas', {
      cookie: a.cookie,
      cuerpo: { modo: 'liga', numParticipantes: 4, plazoJornadaHoras: 24, plazasHumanas: 2 },
    });
    const partidaId: string = r.cuerpo.id;
    await peticion(s.url, `/api/partidas/${partidaId}/unirse`, { metodo: 'POST', cookie: b.cookie });
    const wa = await ClienteWs.conectar(s.urlWs, partidaId, a.cookie);
    await wa.esperar('estado');
    await peticion(s.url, `/api/partidas/${partidaId}/iniciar`, { metodo: 'POST', cookie: a.cookie });
    await avanzarHasta(s, 46_000, async () => (await torneo(s, partidaId, a)).jornadaActual === 1);

    // Se adelantan jornadas por plazo hasta la que enfrenta a los dos humanos.
    const c = await s.gestor.obtenerOError(partidaId);
    const pareja = [c.participanteDeUsuario(a.id)!.id, c.participanteDeUsuario(b.id)!.id].sort().join();
    let partidoId: string | undefined;
    await avanzarHasta(s, 24 * HORA + 1, async () => {
      const j = (await torneo(s, partidaId, a)).jornadas.find((x: any) => x.estado === 'abierta');
      partidoId = j?.partidos.find((p: any) => [p.local.id, p.visitante.id].sort().join() === pareja)?.partidoId;
      return partidoId !== undefined;
    }, 10);

    const grupo = c.servicios.calculo as GrupoHilos;
    const reintentosAntes = (await s.metricas.calculoReintentosTotal.get()).values[0]?.value ?? 0;
    const abrir = peticion(s.url, `/api/partidos/${partidoId}/abrir`, { metodo: 'POST', cookie: a.cookie });
    let muerto = false;
    for (let i = 0; i < 5000 && !muerto; i++) {
      const hilo = grupo.hilosParaPruebas().find((h) => h.tarea === 'resolverResto');
      if (hilo) {
        await hilo.worker.terminate();
        muerto = true;
      } else await espera(1);
    }
    expect(muerto).toBe(true);
    expect((await abrir).estado).toBe(200);
    expect((await s.metricas.calculoReintentosTotal.get()).values[0]?.value).toBe(reintentosAntes + 1);

    // El mismo marcador que en proceso con la misma semilla y las mismas alineaciones.
    const fila = (await c.servicios.repoPartidos.obtener(partidoId!))!;
    expect(fila.estado).toBe('finalizado');
    const entrada = { ...(fila.entrada as Omit<EntradaPartido, 'parametros'>), parametros: parametrosPorVersion(fila.versionParametros) };
    const nivel = parametrosActuales().asincrono.nivelDecisiones;
    const enProceso = FUNCIONES.resolverResto(crearPartido(entrada), { local: nivel, visitante: nivel }, fila.semilla);
    expect(fila.marcador).toEqual(enProceso.tramos.at(-1)!.marcador);

    // La partida sigue atendiendo comandos.
    const otra = await peticion(s.url, `/api/partidos/${partidoId}/abrir`, { metodo: 'POST', cookie: b.cookie });
    expect(otra.estado).toBe(200);
    expect(otra.cuerpo.modo).toBe('reproduccion');
    await wa.cerrar();
  });
});
