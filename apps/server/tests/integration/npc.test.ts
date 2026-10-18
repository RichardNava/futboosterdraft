import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { ClienteWs } from '../helpers/clienteWs';
import { avanzarHasta, jugarSolo, seguirSiempre, torneo } from '../helpers/torneo';
import { crearInvitado, crearRegistrado, peticion } from '../helpers/usuarios';

describe('relleno con NPC por niveles (US5)', () => {
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

  it('el relleno automático nunca asigna PRO', async () => {
    for (let i = 0; i < 3; i++) {
      const u = await crearInvitado(srv.url);
      const r = await peticion(srv.url, '/api/partidas', {
        cookie: u.cookie,
        cuerpo: { modo: 'liga', numParticipantes: 8, tipoSimulacion: 'rapida' },
      });
      expect(r.estado, JSON.stringify(r.cuerpo)).toBe(201);
      const iniciada = await peticion(srv.url, `/api/partidas/${r.cuerpo.id}/iniciar`, { metodo: 'POST', cookie: u.cookie });
      const npc = iniciada.cuerpo.participantes.filter((p: any) => p.tipo === 'npc');
      expect(npc).toHaveLength(7);
      for (const p of npc) expect(['amateur', 'intermedio', 'avanzado']).toContain(p.nivelNPC);
    }
  });

  it('solo el anfitrión puede añadir un NPC PRO', async () => {
    const anfitrion = await crearRegistrado(srv.url);
    const otro = await crearRegistrado(srv.url);
    const r = await peticion(srv.url, '/api/partidas', {
      cookie: anfitrion.cookie,
      cuerpo: { modo: 'liga', numParticipantes: 6, tipoSimulacion: 'rapida' },
    });
    expect(r.estado, JSON.stringify(r.cuerpo)).toBe(201);
    const partidaId = r.cuerpo.id as string;
    expect((await peticion(srv.url, `/api/partidas/${partidaId}/unirse`, { metodo: 'POST', cookie: otro.cookie })).estado).toBe(200);

    const rechazo = await peticion(srv.url, `/api/partidas/${partidaId}/npc`, { cookie: otro.cookie, cuerpo: { nivel: 'PRO' } });
    expect(rechazo.estado).toBe(403);
    expect(rechazo.cuerpo.error.codigo).toBe('SOLO_ANFITRION');

    const ok = await peticion(srv.url, `/api/partidas/${partidaId}/npc`, { cookie: anfitrion.cookie, cuerpo: { nivel: 'PRO' } });
    expect(ok.estado, JSON.stringify(ok.cuerpo)).toBe(200);
    expect(ok.cuerpo.participantes.filter((p: any) => p.nivelNPC === 'PRO')).toHaveLength(1);
  });

  it(
    'una partida de 1 humano y 7 NPC completa el draft y el torneo, con todos los NPC eligiendo a tiempo',
    { timeout: 600_000 },
    async () => {
      const u = await crearInvitado(srv.url);
      const r = await peticion(srv.url, '/api/partidas', {
        cookie: u.cookie,
        cuerpo: { modo: 'liga', numParticipantes: 8, tipoSimulacion: 'rapida', npc: [{ nivel: 'PRO' }] },
      });
      expect(r.estado, JSON.stringify(r.cuerpo)).toBe(201);
      const partidaId = r.cuerpo.id as string;
      const ws = await ClienteWs.conectar(srv.urlWs, partidaId, u.cookie);
      const parar = seguirSiempre(ws);
      await peticion(srv.url, `/api/partidas/${partidaId}/iniciar`, { metodo: 'POST', cookie: u.cookie });
      // El draft avanza con el reloj; el torneo, al ritmo del único humano (spec 002, research R9).
      await avanzarHasta(srv, 46_000, async () => (await torneo(srv, partidaId, u)).jornadas?.length > 0, 300);
      await jugarSolo(srv, partidaId, u, async () => (await torneo(srv, partidaId, u)).campeon !== null);

      // Cada NPC eligió sus 24 cartas al abrirse cada turno (origen 'npc'), nunca por vencimiento del plazo.
      const filas = await bd.db.execute<{ tipo: string; nivel: string | null; origen: string; n: number }>(sql`
        select p.tipo, p.nivel_npc as nivel, e.origen, count(*)::int as n
        from elecciones e join participantes p on p.id = e.participante_id
        group by p.tipo, p.nivel_npc, e.origen`);
      const npc = filas.rows.filter((f) => f.tipo === 'npc');
      expect(npc.every((f) => f.origen === 'npc')).toBe(true);
      expect(npc.reduce((a, f) => a + f.n, 0)).toBe(7 * 24);
      expect(npc.some((f) => f.nivel === 'PRO')).toBe(true);

      const t = await torneo(srv, partidaId, u);
      expect(t.jornadas).toHaveLength(14);
      expect(t.jornadas.flatMap((j: any) => j.partidos).every((p: any) => p.estado === 'finalizado')).toBe(true);
      expect(t.clasificacion).toHaveLength(8);
      parar();
      await ws.cerrar();
    },
  );
});
