/**
 * Máximos goleadores y asistentes (FR-039 a FR-042, SC-015; T137): las tablas del torneo coinciden con la
 * suma de los resúmenes de los partidos y ya están al día al llegar `partido.fin`.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { ClienteWs } from '../helpers/clienteWs';
import { avanzarHasta, jugarSolo, seguirSiempre, torneo } from '../helpers/torneo';
import { crearInvitado, peticion, type UsuarioPrueba } from '../helpers/usuarios';

describe('goleadores y asistentes (US9)', () => {
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

  /** Totales por jugador sumando los eventos de los resúmenes de todos los partidos terminados. */
  async function sumaDeResumenes(u: UsuarioPrueba, partidaId: string) {
    const t = await torneo(srv, partidaId, u);
    const goles = new Map<number, number>();
    const asistencias = new Map<number, number>();
    for (const j of t.jornadas) {
      for (const p of j.partidos) {
        if (p.estado !== 'finalizado' || !p.partidoId) continue;
        const r = await peticion(srv.url, `/api/partidos/${p.partidoId}`, { cookie: u.cookie });
        for (const e of r.cuerpo.eventos as { tipo: string; jugadores: { rol: string; jugadorId: number }[]; datos: { enPropia?: boolean } }[]) {
          if (e.tipo !== 'gol' || e.datos.enPropia) continue;
          for (const x of e.jugadores) {
            const m = x.rol === 'autor' ? goles : x.rol === 'asistente' ? asistencias : null;
            m?.set(x.jugadorId, (m.get(x.jugadorId) ?? 0) + 1);
          }
        }
      }
    }
    return { goles, asistencias };
  }

  const comoMapa = (filas: { jugador: { id: number }; total: number }[]) => new Map(filas.map((f) => [f.jugador.id, f.total]));

  it('tras cada jornada, las tablas coinciden con la suma de los resúmenes; ordenadas; ?todos=true da la tabla completa', async () => {
    const u = await crearInvitado(srv.url);
    const r = await peticion(srv.url, '/api/partidas', { cookie: u.cookie, cuerpo: { modo: 'liga', numParticipantes: 4 } });
    const partidaId: string = r.cuerpo.id;
    const ws = await ClienteWs.conectar(srv.urlWs, partidaId, u.cookie);
    const parar = seguirSiempre(ws);
    await peticion(srv.url, `/api/partidas/${partidaId}/iniciar`, { metodo: 'POST', cookie: u.cookie });
    await avanzarHasta(srv, 46_000, async () => (await torneo(srv, partidaId, u)).jornadas?.length > 0, 300);

    for (const jornada of [1, 2, 3]) {
      const desde = ws.recibidos.length;
      await jugarSolo(srv, partidaId, u, async () => (await torneo(srv, partidaId, u)).jornadas[jornada - 1].estado === 'cerrada');
      // Al llegar el final del partido propio, las tablas ya lo incluyen.
      await ws.esperar('partido.fin', { desde });
      const esperado = await sumaDeResumenes(u, partidaId);
      const goleadores = (await peticion(srv.url, `/api/partidas/${partidaId}/torneo/goleadores?todos=true`, { cookie: u.cookie })).cuerpo.filas;
      const asistentes = (await peticion(srv.url, `/api/partidas/${partidaId}/torneo/asistentes?todos=true`, { cookie: u.cookie })).cuerpo.filas;
      expect(comoMapa(goleadores)).toEqual(esperado.goles);
      expect(comoMapa(asistentes)).toEqual(esperado.asistencias);
      for (const tabla of [goleadores, asistentes]) {
        expect(tabla.every((f: any) => f.total >= 1)).toBe(true);
        expect(tabla.map((f: any) => f.posicion)).toEqual(tabla.map((_: unknown, i: number) => i + 1));
        for (let i = 1; i < tabla.length; i++) {
          const [a, b] = [tabla[i - 1], tabla[i]];
          const orden = b.total - a.total || a.partidosJugados - b.partidosJugados || `${a.jugador.nombre} ${a.jugador.apellidos}`.localeCompare(`${b.jugador.nombre} ${b.jugador.apellidos}`, 'es');
          expect(orden).toBeLessThanOrEqual(0);
          expect(a.partidosJugados).toBeGreaterThanOrEqual(1);
        }
        expect(tabla[0]?.equipo.nombre).toBeTruthy();
      }
      // La vista del torneo trae las 10 primeras filas.
      const t = await torneo(srv, partidaId, u);
      expect(t.goleadores).toEqual(goleadores.slice(0, 10));
      expect(t.asistentes).toEqual(asistentes.slice(0, 10));
    }
    parar();
    await ws.cerrar();
  });
});
