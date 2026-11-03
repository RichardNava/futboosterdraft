/**
 * Grupo de aperturas de partidos entre humanos (spec 010, US2; research R4 a R7 y R10).
 *
 * Partida de 8 humanos: en la jornada 1 hay 4 partidos entre humanos. Para juntar aperturas en un grupo de forma
 * determinista, un comando que bloquea el actor las retiene hasta que todas han llegado al buzón.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { clasificacionActual, type EstadoTorneo } from '@fbd/domain';
import { inArray } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { aperturasEnBuzon } from '../../src/actores/aperturas';
import type { ControladorPartida } from '../../src/actores/partida';
import { abrirPartido } from '../../src/actores/torneo';
import { partidos, visionados } from '../../src/persistencia/esquema/index';
import type { Metricas } from '../../src/observabilidad/metricas';
import type { Calculo } from '../../src/simulacion/grupo';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { ClienteWs } from '../helpers/clienteWs';
import { avanzarHasta, espera, torneo } from '../helpers/torneo';
import { crearRegistrado, peticion, type UsuarioPrueba } from '../helpers/usuarios';

type Cruce = { partidoId: string; local: string; visitante: string };

describe('grupo de aperturas (spec 010, US2)', () => {
  let bd: BdPruebas;
  let srv: ServidorPruebas;
  const sockets: ClienteWs[] = [];

  beforeAll(async () => {
    bd = await iniciarBdPruebas();
  });
  beforeEach(async () => {
    for (const ws of sockets.splice(0)) await ws.cerrar();
    await srv?.cerrar();
    await bd.limpiar();
    srv = await iniciarServidorPruebas(bd);
  });
  afterAll(async () => {
    for (const ws of sockets.splice(0)) await ws.cerrar();
    await srv?.cerrar();
    await bd?.detener();
  });

  /** Liga de 8 humanos conectados, ya en la jornada 1 (4 partidos entre humanos). */
  async function partidaDeOcho() {
    const usuarios: UsuarioPrueba[] = [];
    for (let i = 0; i < 8; i++) usuarios.push(await crearRegistrado(srv.url));
    const r = await peticion(srv.url, '/api/partidas', {
      cookie: usuarios[0]!.cookie,
      cuerpo: { modo: 'liga', numParticipantes: 8, plazoJornadaHoras: 24, plazasHumanas: 8 },
    });
    expect(r.estado, JSON.stringify(r.cuerpo)).toBe(201);
    const partidaId: string = r.cuerpo.id;
    for (const u of usuarios.slice(1)) await peticion(srv.url, `/api/partidas/${partidaId}/unirse`, { metodo: 'POST', cookie: u.cookie });
    const ws = new Map<string, ClienteWs>();
    for (const u of usuarios) {
      const s = await ClienteWs.conectar(srv.urlWs, partidaId, u.cookie);
      sockets.push(s);
      ws.set(u.id, s);
      await s.esperar('estado');
    }
    await peticion(srv.url, `/api/partidas/${partidaId}/iniciar`, { metodo: 'POST', cookie: usuarios[0]!.cookie });
    await avanzarHasta(srv, 46_000, async () => (await torneo(srv, partidaId, usuarios[0]!)).jornadaActual === 1);
    const c = await srv.gestor.obtenerOError(partidaId);
    const cruces: Cruce[] = [...c.jornada!.cruces];
    expect(cruces).toHaveLength(4);
    const usuarioDe = (pid: string) => usuarios.find((u) => c.participanteDeUsuario(u.id)!.id === pid)!;
    return { c, partidaId, cruces, usuarios, ws, usuarioDe };
  }

  const abrir = (u: UsuarioPrueba, partidoId: string, modalidad: 'rapida' | '2d' = 'rapida') =>
    peticion(srv.url, `/api/partidos/${partidoId}/abrir`, { metodo: 'POST', cookie: u.cookie, cuerpo: { modalidad } });

  /** Ocupa el actor de la partida hasta `soltar()`: lo que llegue mientras tanto espera en la cola. */
  function bloquear(c: ControladorPartida) {
    let liberar!: () => void;
    const hecho = c.ejecutar(() => new Promise<void>((r) => (liberar = r)));
    return async () => {
      liberar();
      await hecho;
    };
  }

  async function esperarBuzon(c: ControladorPartida, n: number) {
    for (let i = 0; i < 400 && aperturasEnBuzon(c) < n; i++) await espera(5);
    expect(aperturasEnBuzon(c)).toBe(n);
  }

  const resultadosDe = (c: ControladorPartida, partidoId: string) => c.torneo!.resultados.filter((x) => x.partidoId === partidoId);
  const guardadosDe = (spy: { mock: { calls: unknown[][] } }, partidoId: string) => spy.mock.calls.filter((a) => a[0] === partidoId && (a[1] as { estado?: string }).estado === 'finalizado').length;

  async function sumasApertura(m: Metricas) {
    const r: Record<string, number> = {};
    for (const v of (await m.operacionFaseMs.get()).values) {
      if (v.labels.operacion !== 'apertura') continue;
      if (v.metricName === 'operacion_fase_ms_sum') r[`suma_${v.labels.fase}`] = v.value;
      if ((v.labels as Record<string, unknown>).quantile === 0.95) r[`p95_${v.labels.fase}`] = v.value;
    }
    return r;
  }

  it('8 aperturas a la vez: cada partido se resuelve una vez y cada humano recibe su modalidad (SC-005)', async () => {
    const { c, cruces, usuarioDe } = await partidaDeOcho();
    const actualizar = vi.spyOn(c.servicios.repoPartidos, 'actualizar');
    const pedidas = cruces.flatMap((x) => [
      { u: usuarioDe(x.local), partidoId: x.partidoId, modalidad: 'rapida' as const },
      { u: usuarioDe(x.visitante), partidoId: x.partidoId, modalidad: '2d' as const },
    ]);
    const respuestas = await Promise.all(pedidas.map((p) => abrir(p.u, p.partidoId, p.modalidad)));
    respuestas.forEach((r, i) => {
      expect(r.estado, JSON.stringify(r.cuerpo)).toBe(200);
      expect(r.cuerpo).toEqual({ modo: 'reproduccion', modalidad: pedidas[i]!.modalidad });
    });
    for (const x of cruces) {
      expect((await c.servicios.repoPartidos.obtener(x.partidoId))!.estado).toBe('finalizado');
      expect(guardadosDe(actualizar, x.partidoId)).toBe(1);
      expect(resultadosDe(c, x.partidoId)).toHaveLength(1);
    }
    // SC-005: la última no espera el servicio entero de las demás (tiempo de servicio = total − cola).
    const m = await sumasApertura(srv.metricas);
    expect(m.p95_cola!, JSON.stringify(m)).toBeLessThan(0.5 * (m.suma_total! - m.suma_cola!));
    actualizar.mockRestore();
  });

  it('duplicados: el mismo partido por los dos humanos y dos veces por uno se resuelve una vez (FR-007)', async () => {
    const { c, cruces, usuarioDe } = await partidaDeOcho();
    const x = cruces[0]!;
    const local = usuarioDe(x.local);
    const visitante = usuarioDe(x.visitante);
    const actualizar = vi.spyOn(c.servicios.repoPartidos, 'actualizar');
    const soltar = bloquear(c);
    const pedidas = [abrir(local, x.partidoId, 'rapida')];
    await esperarBuzon(c, 1);
    pedidas.push(abrir(local, x.partidoId, '2d'));
    await esperarBuzon(c, 2);
    pedidas.push(abrir(visitante, x.partidoId, '2d'));
    await esperarBuzon(c, 3);
    await soltar();
    const [r1, r2, r3] = await Promise.all(pedidas);
    // La modalidad la fija la primera apertura de cada humano (FR-035).
    expect(r1!.cuerpo).toEqual({ modo: 'reproduccion', modalidad: 'rapida' });
    expect(r2!.cuerpo).toEqual({ modo: 'reproduccion', modalidad: 'rapida' });
    expect(r3!.cuerpo).toEqual({ modo: 'reproduccion', modalidad: '2d' });
    expect(guardadosDe(actualizar, x.partidoId)).toBe(1);
    expect(resultadosDe(c, x.partidoId)).toHaveLength(1);
    expect((await c.servicios.repoPartidos.obtener(x.partidoId))!.abiertoPorId).toBe(x.local);
    // Después de finalizado responde igual sin recalcular.
    const otra = await abrir(visitante, x.partidoId, 'rapida');
    expect(otra.cuerpo).toEqual({ modo: 'reproduccion', modalidad: '2d' });
    expect(guardadosDe(actualizar, x.partidoId)).toBe(1);
    actualizar.mockRestore();
  });

  it('si falla el cálculo de un partido, los demás se guardan y el fallido sigue programado (FR-010)', async () => {
    const { c, cruces, usuarioDe } = await partidaDeOcho();
    const [x, y] = cruces as [Cruce, Cruce];
    const semillaX = (await c.servicios.repoPartidos.obtener(x.partidoId))!.semilla;
    const real = c.servicios.calculo;
    c.servicios.calculo = {
      hilos: real.hilos,
      cerrar: () => real.cerrar(),
      ejecutar: ((nombre: string, args: unknown[], prioridad: 'humano' | 'npc') => {
        if (nombre === 'resolverResto' && args[2] === semillaX) return Promise.reject(new Error('cálculo forzado a fallar'));
        return (real.ejecutar as (n: string, a: unknown[], p: string) => Promise<unknown>)(nombre, args, prioridad);
      }) as Calculo['ejecutar'],
    };
    const errorLog = vi.spyOn(c.servicios.logger, 'error');
    const soltar = bloquear(c);
    const pedidas = [abrir(usuarioDe(x.local), x.partidoId), abrir(usuarioDe(y.local), y.partidoId)];
    await esperarBuzon(c, 2);
    await soltar();
    const [rx, ry] = await Promise.all(pedidas);
    expect(rx!.estado).toBe(500);
    expect(ry!.estado).toBe(200);
    expect((await c.servicios.repoPartidos.obtener(x.partidoId))!.estado).toBe('programado');
    expect((await c.servicios.repoPartidos.obtener(y.partidoId))!.estado).toBe('finalizado');
    expect(errorLog).toHaveBeenCalledWith(expect.objectContaining({ partidoId: x.partidoId, semilla: semillaX }), 'Cálculo de partido fallido');
    errorLog.mockRestore();
    // Reabrirlo lo resuelve.
    c.servicios.calculo = real;
    const otra = await abrir(usuarioDe(x.visitante), x.partidoId);
    expect(otra.estado).toBe(200);
    expect((await c.servicios.repoPartidos.obtener(x.partidoId))!.estado).toBe('finalizado');
    expect(resultadosDe(c, x.partidoId)).toHaveLength(1);
  });

  it('si falla la transacción, nada queda guardado ni cambia en memoria; repetir lo resuelve una vez (FR-008)', async () => {
    const { c, cruces, usuarioDe } = await partidaDeOcho();
    const [x, y] = cruces as [Cruce, Cruce];
    const { repoTorneo, repoEquipo, repoPartidos, repoVisionados } = c.servicios;
    const jugadores = [x.local, x.visitante, y.local, y.visitante];
    const dorsalesAntes = await Promise.all(jugadores.map((pid) => repoEquipo.dorsales(pid)));
    const torneoBd = await repoTorneo.cargar(c.id);
    const enMemoria = c.torneo;
    const copia = structuredClone(c.torneo);
    const ultimas = jugadores.map((pid) => c.participante(pid)!.ultimaModalidad);
    const guardar = repoTorneo.guardar.bind(repoTorneo);
    repoTorneo.guardar = async (...a: Parameters<typeof guardar>) => {
      if (a[2]) throw new Error('transacción forzada a fallar');
      return guardar(...a);
    };
    const soltar = bloquear(c);
    const pedidas = [abrir(usuarioDe(x.local), x.partidoId, '2d'), abrir(usuarioDe(y.visitante), y.partidoId, '2d')];
    await esperarBuzon(c, 2);
    await soltar();
    for (const r of await Promise.all(pedidas)) expect(r.estado).toBe(500);
    for (const id of [x.partidoId, y.partidoId]) {
      const fila = (await repoPartidos.obtener(id))!;
      expect(fila.estado).toBe('programado');
      expect(fila.modalidades ?? {}).toEqual({});
    }
    expect(await repoVisionados.estado(x.partidoId, x.local)).toBeNull();
    expect(await Promise.all(jugadores.map((pid) => repoEquipo.dorsales(pid)))).toEqual(dorsalesAntes);
    expect(await repoTorneo.cargar(c.id)).toEqual(torneoBd);
    expect(c.torneo).toBe(enMemoria);
    expect(c.torneo).toEqual(copia);
    expect(jugadores.map((pid) => c.participante(pid)!.ultimaModalidad)).toEqual(ultimas);

    repoTorneo.guardar = guardar;
    const otra = await Promise.all([abrir(usuarioDe(x.local), x.partidoId), abrir(usuarioDe(y.visitante), y.partidoId)]);
    for (const r of otra) expect(r.estado).toBe(200);
    expect(resultadosDe(c, x.partidoId)).toHaveLength(1);
    expect(resultadosDe(c, y.partidoId)).toHaveLength(1);
  });

  it('una alineación encolada entre dos aperturas se procesa entre ellas: la segunda va a otro grupo (FR-009)', async () => {
    const { c, partidaId, cruces, usuarioDe } = await partidaDeOcho();
    const [x, y] = cruces as [Cruce, Cruce];
    const u = usuarioDe(y.local);
    const actual = (await peticion(srv.url, `/api/partidas/${partidaId}/alineacion`, { cookie: u.cookie })).cuerpo;
    const otraFormacion = actual.alineacion.formacion === '4-4-2' ? '4-3-3' : '4-4-2';
    const auto = await c.ejecutar(async () => {
      const { autoAlineacion, parametrosActuales } = await import('@fbd/domain');
      const { plantillaDe, bajasActivas } = await import('../../src/actores/equipo');
      return autoAlineacion(await plantillaDe(c, y.local), bajasActivas(c, y.local), parametrosActuales(), { formaciones: [otraFormacion] });
    });

    const soltar = bloquear(c);
    const ra = abrir(usuarioDe(x.local), x.partidoId);
    await esperarBuzon(c, 1);
    const antes = c.actor.secuencia;
    const put = peticion(srv.url, `/api/partidas/${partidaId}/alineacion`, { metodo: 'PUT', cookie: u.cookie, cuerpo: auto });
    for (let i = 0; i < 400 && c.actor.secuencia === antes; i++) await espera(5);
    expect(c.actor.secuencia).toBe(antes + 1);
    const rb = abrir(u, y.partidoId);
    // Un grupo nuevo con una sola apertura: no se ha unido al anterior.
    await esperarBuzon(c, 1);
    await soltar();
    expect((await put).estado).toBe(200);
    expect((await ra).estado).toBe(200);
    expect((await rb).estado).toBe(200);
    const entrada = (await c.servicios.repoPartidos.obtener(y.partidoId))!.entrada as { local: { participanteId: string; formacion: string } };
    expect(entrada.local.participanteId).toBe(y.local);
    expect(entrada.local.formacion).toBe(otraFormacion);
  });

  it('el grupo da lo mismo que abrir de uno en uno y envía un solo torneo.actualizado a cada humano (SC-006, FR-013)', async () => {
    const { c, partidaId, cruces, usuarios, ws, usuarioDe } = await partidaDeOcho();
    // Tres de los cuatro partidos: la jornada sigue abierta y no hay más emisiones que la del grupo.
    const tres = cruces.slice(0, 3);
    const antes = structuredClone(c.torneo!);
    const desde = new Map(usuarios.map((u) => [u.id, ws.get(u.id)!.recibidos.length]));
    const soltar = bloquear(c);
    const pedidas: ReturnType<typeof abrir>[] = [];
    for (const x of tres) for (const pid of [x.local, x.visitante]) pedidas.push(abrir(usuarioDe(pid), x.partidoId));
    await esperarBuzon(c, 6);
    await soltar();
    for (const r of await Promise.all(pedidas)) expect(r.estado).toBe(200);

    // FR-013: una emisión por humano, con la vista que tendría tras la última apertura aplicada.
    for (const u of usuarios) await ws.get(u.id)!.esperar('torneo.actualizado', { desde: desde.get(u.id)! });
    await espera(100);
    for (const u of usuarios) {
      const recibidos = ws.get(u.id)!.recibidos.slice(desde.get(u.id)!).filter((m) => m.t === 'torneo.actualizado');
      expect(recibidos).toHaveLength(1);
      const { t: _t, ...vista } = recibidos[0]!;
      expect(vista).toEqual(await torneo(srv, partidaId, u));
    }

    // SC-006: se deshace y se abren de uno en uno (en orden inverso, por el camino de siempre).
    const agrupado = structuredClone(c.torneo!);
    const ids = tres.map((x) => x.partidoId);
    const marcadores = await Promise.all(ids.map(async (id) => (await c.servicios.repoPartidos.obtener(id))!.marcador));
    await bd.db.delete(visionados).where(inArray(visionados.partidoId, ids));
    await bd.db.update(partidos).set({ estado: 'programado' }).where(inArray(partidos.id, ids));
    await c.ejecutar(async () => {
      c.torneo = structuredClone(antes);
      await c.servicios.repoTorneo.guardar(c.id, c.torneo);
    });
    for (const x of [...tres].reverse()) await c.ejecutar((ctx) => abrirPartido(c, ctx, x.local, x.partidoId, 'rapida'));
    const deUnoEnUno = c.torneo!;
    expect(await Promise.all(ids.map(async (id) => (await c.servicios.repoPartidos.obtener(id))!.marcador))).toEqual(marcadores);
    const ordenar = (t: EstadoTorneo) => ({
      clasificacion: clasificacionActual(t),
      resultados: [...t.resultados].sort((a, b) => a.partidoId!.localeCompare(b.partidoId!)),
      bajas: [...t.bajas.bajas].sort((a, b) => `${a.participanteId}|${a.jugadorId}`.localeCompare(`${b.participanteId}|${b.jugadorId}`)),
      amarillas: t.bajas.amarillas,
    });
    expect(ordenar(deUnoEnUno)).toEqual(ordenar(agrupado));
  });

  /**
   * Cuenta las consultas mientras `activo`: cada una se atribuye al método de repositorio más externo que la hace
   * o, fuera de los repositorios, a su SQL. Usa su propio `AsyncLocalStorage`, así que el cálculo en paralelo de los
   * partidos del grupo no mezcla atribuciones.
   */
  function trazarConsultas(c: ControladorPartida) {
    const als = new AsyncLocalStorage<string>();
    const cuenta: Record<string, number> = {};
    const llamadas: Record<string, number> = {};
    const traza = { activo: false, cuenta, llamadas };
    for (const [nombre, repo] of Object.entries(c.servicios)) {
      if (!nombre.startsWith('repo')) continue;
      const proto = Object.getPrototypeOf(repo) as Record<string, unknown>;
      for (const m of Object.getOwnPropertyNames(proto)) {
        const original = (repo as Record<string, unknown>)[m];
        if (m === 'constructor' || typeof original !== 'function') continue;
        const k = `${nombre}.${m}`;
        (repo as Record<string, unknown>)[m] = (...a: unknown[]) => {
          if (als.getStore()) return original.apply(repo, a);
          if (traza.activo) llamadas[k] = (llamadas[k] ?? 0) + 1;
          return als.run(k, () => original.apply(repo, a));
        };
      }
    }
    const anotar = (consulta: unknown) => {
      if (!traza.activo) return;
      const texto = typeof consulta === 'string' ? consulta : String((consulta as { text?: string }).text ?? '?');
      const k = als.getStore() ?? `sql: ${texto.replace(/\s+/g, ' ').slice(0, 60)}`;
      cuenta[k] = (cuenta[k] ?? 0) + 1;
    };
    const query = bd.pool.query.bind(bd.pool) as (...a: unknown[]) => unknown;
    bd.pool.query = ((...a: unknown[]) => (anotar(a[0]), query(...a))) as typeof bd.pool.query;
    const connect = bd.pool.connect.bind(bd.pool) as (...a: unknown[]) => unknown;
    bd.pool.connect = ((...a: unknown[]) => {
      if (a.length) return connect(...a);
      return (connect() as Promise<{ query: (...q: unknown[]) => unknown }>).then((cliente) => {
        const q = cliente.query.bind(cliente);
        return new Proxy(cliente, { get: (o, p) => (p === 'query' ? (...x: unknown[]) => (anotar(x[0]), q(...x)) : Reflect.get(o, p, o)) });
      });
    }) as typeof bd.pool.connect;
    return traza;
  }

  it('reparto de las consultas de un grupo de 8 aperturas que cierra la jornada (spec 010, US4)', async () => {
    const { c, cruces, usuarioDe } = await partidaDeOcho();
    const traza = trazarConsultas(c);
    const soltar = bloquear(c);
    const pedidas = cruces.flatMap((x) => [abrir(usuarioDe(x.local), x.partidoId), abrir(usuarioDe(x.visitante), x.partidoId)]);
    await esperarBuzon(c, 8);
    traza.activo = true;
    await soltar();
    for (const r of await Promise.all(pedidas)) expect(r.estado, JSON.stringify(r.cuerpo)).toBe(200);
    await c.actor.drenar();
    traza.activo = false;
    expect(c.jornada!.numero).toBe(2);
    // Lo guardado coincide con la memoria aunque no se reescriban las bajas sin cambios (T044).
    const cargado = (await c.servicios.repoTorneo.cargar(c.id))!;
    const orden = (b: EstadoTorneo['bajas']) => ({ ...b, bajas: [...b.bajas].sort((x, y) => `${x.participanteId}|${x.jugadorId}`.localeCompare(`${y.participanteId}|${y.jugadorId}`)) });
    expect(orden(cargado.bajas)).toEqual(orden(c.torneo!.bajas));
    const filas = Object.entries(traza.cuenta).sort((a, b) => b[1] - a[1]);
    const total = filas.reduce((s, [, n]) => s + n, 0);
    const reparto = filas.map(([k, n]) => `${String(n).padStart(4)}  ${k} (${traza.llamadas[k] ?? '-'} llamadas)`).join('\n');
    // Reparto por tramos en diagnostico.md («Consultas del grupo de aperturas»). Al recortar, se baja esta cifra:
    // 115 al empezar (T039); 78 con `fijarModalidades` por lotes (T043); 70 sin reescribir bajas sin cambios (T044);
    // 49 con la precarga de alineaciones, plantillas y dorsales (T045); 39 con avisos y partidos de la jornada
    // siguiente en una consulta cada uno (T046). Puede salir 1 o 2 menos: el guardado del torneo solo inserta bajas
    // y amarillas si los partidos (con la semilla aleatoria de la partida) las producen.
    expect(total, `consultas del grupo:\n${reparto}`).toBeLessThanOrEqual(39);
  });
});
