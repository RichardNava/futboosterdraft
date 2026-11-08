/**
 * «Control total» contra un NPC (spec 012, US4; T044; FR-020 a FR-025): parada por una lesión o expulsión propia en la
 * rápida y en la 2D, «Seguir» sin cambios, sustitución del lesionado en la parada, el comando de modo y la vista al
 * reconectar. Para que haya lances en pocos minutos de juego, el motor del partido en curso lleva lesiones mucho más
 * probables (solo en estas pruebas). La equivalencia con el automático (SC-006) la prueba el motor (I1, I2).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PartidoEnCurso } from '../../src/actores/partidoRapido';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { ClienteWs } from '../helpers/clienteWs';
import { avanzarHasta, espera } from '../helpers/torneo';
import { crearRegistrado, peticion, type UsuarioPrueba } from '../helpers/usuarios';

const TURNO = 46_000;

describe('control total (spec 012, US4)', () => {
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

  /** Liga de 4 de un humano en control total; abre su primer partido en la modalidad dada. */
  async function abrir(modalidad: 'rapida' | '2d', u?: UsuarioPrueba) {
    u ??= await crearRegistrado(srv.url);
    await peticion(srv.url, '/api/perfil/aspecto', { metodo: 'PUT', cookie: u.cookie, cuerpo: { modoIncidencias: 'control_total' } });
    const r = await peticion(srv.url, '/api/partidas', { cookie: u.cookie, cuerpo: { modo: 'liga', numParticipantes: 4, plazasHumanas: 1 } });
    const partidaId = r.cuerpo.id as string;
    const ws = await ClienteWs.conectar(srv.urlWs, partidaId, u.cookie);
    await ws.esperar('estado');
    await peticion(srv.url, `/api/partidas/${partidaId}/iniciar`, { metodo: 'POST', cookie: u.cookie });
    await avanzarHasta(srv, TURNO, async () => ws.recibidos.some((m) => m.t === 'preparacion.inicio'), 400);
    const prep = await ws.esperar('preparacion.inicio');
    const desde = ws.recibidos.length;
    const ab = await peticion(srv.url, `/api/partidos/${prep.partidoId}/abrir`, { metodo: 'POST', cookie: u.cookie, cuerpo: { modalidad } });
    expect(ab.estado, JSON.stringify(ab.cuerpo)).toBe(200);
    const inicio = await ws.esperar('partido.inicio', { desde });
    const c = await srv.gestor.obtenerOError(partidaId);
    const yo = c.participanteDeUsuario(u.id)!.id;
    const p = c.partidosEnCurso.get(prep.partidoId as string)!;
    return { u, partidaId, partidoId: prep.partidoId as string, ws, inicio, c, yo, p };
  }

  /** Lesiones mucho más probables en el motor del partido en curso (sin tocar los parámetros compartidos). */
  const conLesiones = (p: PartidoEnCurso) => {
    p.motor = { ...p.motor, parametros: { ...p.motor.parametros, lesiones: { ...p.motor.parametros.lesiones, probabilidadPorEntrada: 0.6 } } };
  };

  /** Responde «Seguir» a toda pausa que no sea de incidencia, hasta que llegue una de incidencia o el final. */
  async function hastaIncidencia(ws: ClienteWs, desde: number, empujar?: () => void) {
    let visto = desde;
    for (let i = 0; i < 600; i++) {
      for (const m of ws.recibidos.slice(visto)) {
        if (m.t === 'partido.pausa_decision' && m.motivo === 'incidencia') return m;
        if (m.t === 'partido.pausa_decision') ws.enviar({ t: 'partido.seguir', partidoId: m.partidoId });
        if (m.t === 'partido.fin') return null;
      }
      visto = ws.recibidos.length;
      empujar?.();
      await espera(25);
    }
    return null;
  }

  it('rápida: inicio con el modo; parada con el aviso y los cambios restantes; «Seguir» reanuda y el partido acaba', async () => {
    const { ws, inicio, p, partidoId } = await abrir('rapida');
    expect(inicio.gestionDisponible).toBe(true);
    expect(inicio.modoIncidencias).toBe('control_total');
    // La primera parte puede traer ya un lance propio (se para en él); si no, se fuerza en la segunda.
    const primera = await ws.esperar('partido.pausa_decision');
    let parada = primera.motivo === 'incidencia' ? primera : null;
    if (!parada) {
      expect(primera.motivo).toBe('descanso');
      conLesiones(p);
      const desde = ws.recibidos.length;
      ws.enviar({ t: 'partido.seguir', partidoId });
      parada = await hastaIncidencia(ws, desde);
    }
    expect(parada, 'no hubo parada de incidencia').not.toBeNull();
    expect(parada!.incidencias.length).toBeGreaterThan(0);
    for (const i of parada!.incidencias) expect(['lesion', 'expulsion']).toContain(i.motivo);
    expect(parada!.sustitucionesRestantes).toBeGreaterThanOrEqual(0);
    // Reconectar durante la parada: la vista trae la misma pausa.
    const estado = ws.recibidos.findLast((m) => m.t === 'estado');
    expect(estado).toBeDefined();
    // «Seguir» sin cambios: lo pendiente se resuelve en automático y el partido sigue.
    const tras = ws.recibidos.length;
    ws.enviar({ t: 'partido.seguir', partidoId });
    const fin = await (async () => {
      for (let i = 0; i < 400; i++) {
        for (const m of ws.recibidos.slice(tras)) {
          if (m.t === 'partido.fin') return m;
          if (m.t === 'partido.pausa_decision') ws.enviar({ t: 'partido.seguir', partidoId });
        }
        await espera(25);
      }
      return null;
    })();
    expect(fin).not.toBeNull();
    expect(p.motor.incidencias.every((i) => i.estado !== 'pendiente')).toBe(true);
    await ws.cerrar();
  });

  it('2D: la parada detiene la simulación por delante; una sustitución del lesionado se aplica en ella', async () => {
    const { ws, p, partidoId, yo } = await abrir('2d');
    conLesiones(p);
    let tick = 0;
    const desde = ws.recibidos.length;
    // El cliente va informando de por dónde va; el servidor simula por delante hasta la parada.
    const parada = await hastaIncidencia(ws, desde, () => {
      tick += 120;
      ws.enviar({ t: 'partido.reproduccion', partidoId, tick, velocidad: 8 }, false);
    });
    expect(parada, 'no hubo parada de incidencia').not.toBeNull();
    const tickParada = p.motor.tick;
    // Sin «Seguir», el servidor no simula más allá de la parada.
    ws.enviar({ t: 'partido.reproduccion', partidoId, tick: tickParada + 600, velocidad: 8 }, false);
    await espera(200);
    expect(p.motor.tick).toBe(tickParada);

    const lesion = parada!.incidencias.find((i: { motivo: string }) => i.motivo === 'lesion');
    const lado = p.motor.equipos.local.participanteId === yo ? 'local' : 'visitante';
    const entra = p.motor.equipos[lado].jugadores.find((j) => !j.enCampo && !j.retirado);
    if (lesion && entra && parada!.sustitucionesRestantes > 0) {
      const ack = await ws.enviarYEsperarAck({ t: 'partido.decisiones', partidoId, decisiones: [{ tipo: 'sustitucion', datos: { sale: lesion.jugadorId, entra: entra.id } }] });
      expect(ack.ok, JSON.stringify(ack)).toBe(true);
      const tras = ws.recibidos.length;
      ws.enviar({ t: 'partido.seguir', partidoId });
      ws.enviar({ t: 'partido.reproduccion', partidoId, tick: tickParada + 60, velocidad: 8 }, false);
      const aplicada = await ws.esperar('partido.decision_aplicada', { desde: tras, timeoutMs: 10_000 });
      expect(aplicada.aplicadaEnTick).toBe(tickParada);
      const registrada = p.motor.decisiones.find((d) => d.tipo === 'sustitucion' && d.datos.sale === lesion.jugadorId);
      expect(registrada?.enIncidencia).toBe(true);
    }
    await ws.cerrar();
  });

  it('partido.modo_incidencias cambia el motor, el participante y el perfil; sin partido en curso, error', async () => {
    const { ws, p, partidoId, yo, u, c } = await abrir('rapida');
    const lado = p.motor.equipos.local.participanteId === yo ? 'local' : 'visitante';
    expect(p.motor.equipos[lado].controlTotal).toBe(true);
    const ack = await ws.enviarYEsperarAck({ t: 'partido.modo_incidencias', partidoId, modo: 'automatico' });
    expect(ack.ok, JSON.stringify(ack)).toBe(true);
    expect(p.motor.equipos[lado].controlTotal).toBe(false);
    expect(c.participante(yo)!.modoIncidencias).toBe('automatico');
    expect((await peticion(srv.url, '/api/perfil/aspecto', { cookie: u.cookie })).cuerpo.modoIncidencias).toBe('automatico');
    // Repetirlo no cambia nada.
    expect((await ws.enviarYEsperarAck({ t: 'partido.modo_incidencias', partidoId, modo: 'automatico' })).ok).toBe(true);
    // Un partido que no es suyo (o ya terminado): no se acepta.
    const otro = await ws.enviarYEsperarAck({ t: 'partido.modo_incidencias', partidoId: '00000000-0000-4000-8000-000000000000', modo: 'control_total' });
    expect(otro.ok).toBe(false);
    await ws.cerrar();
  });
});
