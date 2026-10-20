/**
 * Auditoría de visibilidad (T141; FR-007, FR-054a): recorre todos los mensajes que recibe cada humano en
 * un torneo de prueba y comprueba que ninguno revela lo que aún no puede ver: las elecciones ajenas
 * durante el draft, la alineación del rival antes de que se resuelva el partido y, en la spec 002, el
 * resultado de un partido entre humanos "pendiente de ver" (FR-030, research R8; T035).
 */
import { abrirJornada, crearTorneo } from '@fbd/domain';
import { sql } from 'drizzle-orm';
import WebSocket from 'ws';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { programarJornada } from '../../src/actores/preparacion';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { ClienteWs } from '../helpers/clienteWs';
import { crearRegistrado, peticion, type UsuarioPrueba } from '../helpers/usuarios';

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
type Mensaje = { t: string } & Record<string, any>;

/** Claves que aparecen en cualquier nivel de un mensaje. */
function claves(valor: unknown, acumuladas = new Set<string>()): Set<string> {
  if (Array.isArray(valor)) for (const v of valor) claves(v, acumuladas);
  else if (valor && typeof valor === 'object') {
    for (const [k, v] of Object.entries(valor)) {
      acumuladas.add(k);
      claves(v, acumuladas);
    }
  }
  return acumuladas;
}

/** Partidos que una vista del torneo muestra como terminados. */
const finalizados = (vista: any): number => vista.jornadas.flatMap((j: any) => j.partidos).filter((x: any) => x.estado === 'finalizado').length;

const TIPOS_DRAFT = new Set(['estado', 'sala.actualizada', 'draft.turno', 'draft.progreso', 'draft.eleccion_auto', 'ack', 'pong']);

describe('auditoría de visibilidad (FR-054a)', () => {
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

  it('ningún mensaje revela elecciones ajenas, la alineación rival antes del partido ni un resultado pendiente de ver', { timeout: 180_000 }, async () => {
    const humanos = [await crearRegistrado(srv.url), await crearRegistrado(srv.url)];
    const r = await peticion(srv.url, '/api/partidas', {
      cookie: humanos[0]!.cookie,
      cuerpo: { modo: 'liga', numParticipantes: 4, plazasHumanas: 2 },
    });
    const partidaId: string = r.cuerpo.id;
    await peticion(srv.url, `/api/partidas/${partidaId}/unirse`, { metodo: 'POST', cookie: humanos[1]!.cookie });
    const clientes = await Promise.all(humanos.map((h) => ClienteWs.conectar(srv.urlWs, partidaId, h.cookie)));
    const [a] = clientes as [ClienteWs, ClienteWs];
    const c = await srv.gestor.obtenerOError(partidaId);
    // Los dos humanos se enfrentan en la primera jornada.
    c.programarPrimeraJornada = async (ctx) => {
      const [h1, h2] = c.participantes.filter((p) => p.tipo === 'humano').map((p) => p.id);
      const [n1, n2] = c.participantes.filter((p) => p.tipo === 'npc').map((p) => p.id);
      // Torneo con esa primera jornada, para que los resultados se registren y se emita `torneo.actualizado`.
      const ids = [h1!, h2!, n1!, n2!];
      const base = crearTorneo('liga', ids, [ids], c.partida.semilla);
      const cruces = [{ local: h1!, visitante: h2! }, { local: n1!, visitante: n2! }];
      c.torneo = abrirJornada({ ...base, jornadas: base.jornadas.map((j) => (j.numero === 1 ? { ...j, cruces } : j)) }, 1);
      await programarJornada(c, ctx, 1, cruces, { inicial: true });
    };

    // A elige a mano (la primera carta de cada sobre); B deja que venzan sus turnos.
    let activo = true;
    void (async () => {
      let visto = 0;
      while (activo) {
        for (const m of a.recibidos.slice(visto)) {
          if (m.t === 'draft.turno') a.enviar({ t: 'draft.elegir', ronda: m.ronda, turno: m.turno, jugadorId: m.sobre.cartas[0].id });
        }
        visto = a.recibidos.length;
        await espera(20);
      }
    })();
    await peticion(srv.url, `/api/partidas/${partidaId}/iniciar`, { metodo: 'POST', cookie: humanos[0]!.cookie });
    for (let i = 0; i < 40 && !clientes.every((cl) => cl.recibidos.some((m) => m.t === 'preparacion.inicio')); i++) {
      srv.reloj.avanzar(46_000);
      await espera(80);
    }
    activo = false;

    // B confirma su alineación durante la preparación.
    const { alineacion } = (await peticion(srv.url, `/api/partidas/${partidaId}/alineacion`, { cookie: humanos[1]!.cookie })).cuerpo;
    const conf = await peticion(srv.url, `/api/partidas/${partidaId}/alineacion`, { metodo: 'PUT', cookie: humanos[1]!.cookie, cuerpo: alineacion });
    expect(conf.estado, JSON.stringify(conf.cuerpo)).toBe(200);
    // Antes de empezar, A no puede ver el partido con la alineación rival.
    const prep = await a.esperar('preparacion.inicio');
    expect((await peticion(srv.url, `/api/partidos/${prep.partidoId}`, { cookie: humanos[0]!.cookie })).cuerpo.alineaciones).toBeUndefined();

    // A abre el partido: se resuelve sin B (spec 002, FR-030). Nadie lo ve en directo.
    const desdeResolucion = clientes.map((cl) => cl.recibidos.length);
    const abierto = await peticion(srv.url, `/api/partidos/${prep.partidoId}/abrir`, { metodo: 'POST', cookie: humanos[0]!.cookie });
    expect(abierto.cuerpo.modo).toBe('reproduccion');
    // Antes de verlo, ni A ni B reciben el resultado por ninguna vía.
    for (const [i, cl] of clientes.entries()) {
      await cl.esperar('torneo.actualizado', { desde: desdeResolucion[i] });
      for (const m of cl.recibidos.slice(desdeResolucion[i]) as Mensaje[]) {
        expect(m.t, `${m.t} tras resolver el partido`).not.toBe('partido.fin');
        expect(m.t).not.toBe('partido.tramo');
        if (m.t === 'torneo.actualizado') {
          const p = m.jornadas.flatMap((j: any) => j.partidos).find((x: any) => x.partidoId === prep.partidoId);
          expect(p.estado).toBe('pendiente_de_ver');
          expect(p.marcador).toBeNull();
          expect(m.pendientesDeVer).toContain(prep.partidoId);
          // La clasificación solo cuenta los partidos que se muestran terminados, no el pendiente de ver (la
          // jornada 2 puede haberse abierto ya, con sus NPC contra NPC resueltos).
          expect(m.clasificacion.reduce((s: number, f: any) => s + f.pj, 0)).toBe(2 * finalizados(m));
        }
      }
      const vista = (await peticion(srv.url, `/api/partidas/${partidaId}/torneo`, { cookie: humanos[i]!.cookie })).cuerpo;
      expect(vista.pendientesDeVer).toEqual([prep.partidoId]);
    }
    // Ningún aviso sobre ese partido incluye el marcador.
    const avisosB = (await peticion(srv.url, '/api/avisos', { cookie: humanos[1]!.cookie })).cuerpo as { texto: string; partidoId?: string }[];
    expect(avisosB.filter((x) => x.partidoId === prep.partidoId).every((x) => !/\d+\s*-\s*\d+/.test(x.texto))).toBe(true);

    // Cuando A lo marca como visto, A ve el resultado y B sigue sin verlo.
    const desdeVisto = clientes.map((cl) => cl.recibidos.length);
    expect((await peticion(srv.url, `/api/partidos/${prep.partidoId}/visto`, { metodo: 'POST', cookie: humanos[0]!.cookie })).estado).toBe(200);
    const paraA = await clientes[0]!.esperar('torneo.actualizado', { desde: desdeVisto[0] });
    const partidoA = paraA.jornadas.flatMap((j: any) => j.partidos).find((x: any) => x.partidoId === prep.partidoId);
    expect(partidoA.marcador).not.toBeNull();
    expect(paraA.clasificacion.reduce((s: number, f: any) => s + f.pj, 0)).toBe(2 * finalizados(paraA));
    const vistaB = (await peticion(srv.url, `/api/partidas/${partidaId}/torneo`, { cookie: humanos[1]!.cookie })).cuerpo;
    expect(vistaB.jornadas.flatMap((j: any) => j.partidos).find((x: any) => x.partidoId === prep.partidoId).marcador).toBeNull();
    expect(clientes[1]!.recibidos.slice(desdeVisto[1]).some((m) => m.t === 'torneo.actualizado')).toBe(false);
    // Las tablas de goleadores y asistentes (spec 002, US9) tampoco cuentan el partido que B no ha visto.
    const total = async (u: UsuarioPrueba, cual: string) =>
      ((await peticion(srv.url, `/api/partidas/${partidaId}/torneo/${cual}?todos=true`, { cookie: u.cookie })).cuerpo.filas as { total: number }[]).reduce((x, f) => x + f.total, 0);
    const eventosPartido = (await peticion(srv.url, `/api/partidos/${prep.partidoId}`, { cookie: humanos[0]!.cookie })).cuerpo.eventos as { tipo: string; jugadores: { rol: string }[] }[];
    const golesPartido = eventosPartido.filter((e) => e.tipo === 'gol').length;
    const asistenciasPartido = eventosPartido.filter((e) => e.tipo === 'gol' && e.jugadores.some((j) => j.rol === 'asistente')).length;
    expect((await total(humanos[0]!, 'goleadores')) - (await total(humanos[1]!, 'goleadores'))).toBe(golesPartido);
    expect((await total(humanos[0]!, 'asistentes')) - (await total(humanos[1]!, 'asistentes'))).toBe(asistenciasPartido);

    const filas = await bd.db.execute<{ participante_id: string; jugador_id: number; origen: string }>(
      sql`select participante_id, jugador_id, origen from elecciones`,
    );
    const ids = c.participantes.filter((p) => p.tipo === 'humano').map((p) => p.id);
    for (const [i, cl] of clientes.entries()) {
      const yo = (await cl.esperar('estado')).vista.partida.miParticipanteId as string;
      expect(ids).toContain(yo);
      const mias = new Set(filas.rows.filter((f) => f.participante_id === yo).map((f) => f.jugador_id));
      const autoMias = new Set(filas.rows.filter((f) => f.participante_id === yo && f.origen === 'auto').map((f) => f.jugador_id));
      const recibidos = cl.recibidos as Mensaje[];
      // El draft acaba con el primer mensaje del torneo: la preparación se anuncia antes que `draft.terminado`.
      const finDraft = recibidos.findIndex((m) => m.t === 'draft.terminado' || m.t === 'preparacion.inicio' || (m.t === 'estado' && m.fase === 'torneo'));
      expect(finDraft, `humano ${i}`).toBeGreaterThan(0);

      // Durante el draft: solo tipos permitidos, el progreso no dice qué se eligió y cada uno solo ve lo suyo.
      for (const m of recibidos.slice(0, finDraft)) {
        expect(TIPOS_DRAFT.has(m.t), `tipo ${m.t} durante el draft`).toBe(true);
        const k = claves(m);
        expect(k.has('elecciones') || k.has('plantillas'), `${m.t} revela elecciones`).toBe(false);
        if (m.t === 'draft.progreso') expect(Object.keys(m).filter((x) => x !== 'pendientes').sort()).toEqual(['eligieron', 'ronda', 't', 'turno']);
        if (m.t === 'draft.turno') for (const j of m.misElecciones) expect(mias.has(j.id)).toBe(true);
        if (m.t === 'draft.eleccion_auto') expect(autoMias.has(m.jugador.id)).toBe(true);
        if (m.t === 'estado' && m.vista.draft) {
          for (const j of m.vista.draft.misElecciones) expect(mias.has(j.id)).toBe(true);
          if (m.vista.draft.eleccionActual) expect(mias.has(m.vista.draft.eleccionActual.id)).toBe(true);
        }
      }
      // Ningún mensaje lleva alineaciones, titulares ni dorsales: el partido entre humanos se ve por HTTP.
      for (const m of recibidos) {
        const k = claves(m);
        for (const prohibida of ['alineacion', 'alineaciones', 'titulares', 'suplentes', 'dorsales']) {
          expect(k.has(prohibida), `${m.t} contiene "${prohibida}"`).toBe(false);
        }
        if (m.t === 'preparacion.inicio') expect(Object.keys(m.rival).sort()).toEqual(['bajas', 'humano', 'id', 'nombre']);
      }
    }
    // Ya resuelto, la reproducción muestra las dos alineaciones a sus participantes.
    const repro = (await peticion(srv.url, `/api/partidos/${prep.partidoId}/reproduccion`, { cookie: humanos[1]!.cookie })).cuerpo;
    expect(repro.inicio.alineaciones.local.titulares).toHaveLength(11);
    expect(repro.inicio.alineaciones.visitante.titulares).toHaveLength(11);
    for (const cl of clientes) await cl.cerrar();
  });

  it('el WebSocket rechaza a un navegador desde otra web (Origin) y admite la web pública', async () => {
    const u = await crearRegistrado(srv.url);
    const r = await peticion(srv.url, '/api/partidas', { cookie: u.cookie, cuerpo: { modo: 'liga', numParticipantes: 4 } });
    const abrir = (origin: string) =>
      new Promise<number | 'abierto'>((resolve) => {
        const ws = new WebSocket(`${srv.urlWs}/ws?partidaId=${r.cuerpo.id}`, { headers: { cookie: u.cookie, origin } });
        ws.once('message', () => {
          ws.close();
          resolve('abierto');
        });
        ws.once('close', (codigo) => resolve(codigo));
      });
    expect(await abrir('https://otra-web.example')).toBe(4403);
    expect(await abrir('http://localhost:5173')).toBe('abierto');
  });
});
