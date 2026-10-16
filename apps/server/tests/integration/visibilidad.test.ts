/**
 * Auditoría de visibilidad (T141; FR-007, FR-054a): recorre todos los mensajes que recibe cada humano en
 * un torneo de prueba y comprueba que ninguno revela lo que aún no puede ver: las elecciones ajenas
 * durante el draft y la alineación del rival antes de que empiece el partido.
 */
import { sql } from 'drizzle-orm';
import WebSocket from 'ws';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { programarJornada } from '../../src/actores/preparacion';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { ClienteWs } from '../helpers/clienteWs';
import { crearRegistrado, peticion } from '../helpers/usuarios';

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

  it('ningún mensaje revela elecciones ajenas en el draft ni la alineación rival antes del partido', { timeout: 180_000 }, async () => {
    const humanos = [await crearRegistrado(srv.url), await crearRegistrado(srv.url)];
    const r = await peticion(srv.url, '/api/partidas', {
      cookie: humanos[0]!.cookie,
      cuerpo: { modo: 'liga', numParticipantes: 4, tipoSimulacion: 'rapida', ritmo: 'directo', plazasHumanas: 2 },
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
      await programarJornada(c, ctx, 1, [{ local: h1!, visitante: h2! }, { local: n1!, visitante: n2! }], { inicial: true });
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

    srv.reloj.avanzar(300_001);
    for (const cl of clientes) await cl.esperar('partido.pausa_decision');
    for (const cl of clientes) await cl.enviarYEsperarAck({ t: 'partido.seguir', partidoId: prep.partidoId });
    for (const cl of clientes) await cl.esperar('partido.fin');

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
      const inicioPartido = recibidos.findIndex((m) => m.t === 'partido.inicio');
      expect(finDraft, `humano ${i}`).toBeGreaterThan(0);
      expect(inicioPartido).toBeGreaterThan(finDraft);

      // Durante el draft: solo tipos permitidos, el progreso no dice qué se eligió y cada uno solo ve lo suyo.
      for (const m of recibidos.slice(0, finDraft)) {
        expect(TIPOS_DRAFT.has(m.t), `tipo ${m.t} durante el draft`).toBe(true);
        const k = claves(m);
        expect(k.has('elecciones') || k.has('plantillas'), `${m.t} revela elecciones`).toBe(false);
        if (m.t === 'draft.progreso') expect(Object.keys(m).sort()).toEqual(['eligieron', 'ronda', 't', 'turno']);
        if (m.t === 'draft.turno') for (const j of m.misElecciones) expect(mias.has(j.id)).toBe(true);
        if (m.t === 'draft.eleccion_auto') expect(autoMias.has(m.jugador.id)).toBe(true);
        if (m.t === 'estado' && m.vista.draft) {
          for (const j of m.vista.draft.misElecciones) expect(mias.has(j.id)).toBe(true);
          if (m.vista.draft.eleccionActual) expect(mias.has(m.vista.draft.eleccionActual.id)).toBe(true);
        }
      }
      // Hasta que empieza el partido: ni alineaciones, ni titulares, ni dorsales de nadie.
      for (const m of recibidos.slice(0, inicioPartido)) {
        const k = claves(m);
        for (const prohibida of ['alineacion', 'alineaciones', 'titulares', 'suplentes', 'dorsales']) {
          expect(k.has(prohibida), `${m.t} contiene "${prohibida}" antes del partido`).toBe(false);
        }
        if (m.t === 'preparacion.inicio') expect(Object.keys(m.rival).sort()).toEqual(['bajas', 'id', 'nombre']);
      }
      // Al empezar, las dos alineaciones son visibles.
      const inicio = recibidos[inicioPartido]!;
      expect(inicio.alineaciones.local.titulares).toHaveLength(11);
      expect(inicio.alineaciones.visitante.titulares).toHaveLength(11);
    }
    for (const cl of clientes) await cl.cerrar();
  });

  it('el WebSocket rechaza a un navegador desde otra web (Origin) y admite la web pública', async () => {
    const u = await crearRegistrado(srv.url);
    const r = await peticion(srv.url, '/api/partidas', { cookie: u.cookie, cuerpo: { modo: 'liga', numParticipantes: 4, tipoSimulacion: 'rapida', ritmo: 'directo' } });
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
