/**
 * Nivel de rareza del draft, paso (a) con acceso `libre` (spec 013, US3; FR-016 a FR-018, FR-020, FR-021).
 */
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { ClienteWs } from '../helpers/clienteWs';
import { crearInvitado, peticion } from '../helpers/usuarios';

describe('nivel de rareza (acceso libre)', () => {
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

  it('cada nivel se guarda y lo devuelven el resumen y la sala; sin nivel, Moderado y gratis', async () => {
    for (const nivelRareza of ['pobre', 'escaso', 'moderado', 'abundante', 'rico', undefined]) {
      const u = await crearInvitado(srv.url);
      const r = await peticion(srv.url, '/api/partidas', { cookie: u.cookie, cuerpo: { modo: 'liga', numParticipantes: 4, ...(nivelRareza ? { nivelRareza } : {}) } });
      expect(r.estado, JSON.stringify(r.cuerpo)).toBe(201);
      expect(r.cuerpo).toMatchObject({ nivelRareza: nivelRareza ?? 'moderado', cobroRareza: null });
      const ws = await ClienteWs.conectar(srv.urlWs, r.cuerpo.id, u.cookie);
      const sala = await ws.esperar('sala.actualizada');
      expect(sala.nivelRareza).toBe(nivelRareza ?? 'moderado');
      await ws.cerrar();
    }
  });

  it('un nivel desconocido ⇒ 400 NIVEL_RAREZA_INVALIDO', async () => {
    const u = await crearInvitado(srv.url);
    const r = await peticion(srv.url, '/api/partidas', { cookie: u.cookie, cuerpo: { modo: 'liga', numParticipantes: 4, nivelRareza: 'legendario' } });
    expect(r.estado).toBe(400);
    expect(r.cuerpo.error.codigo).toBe('NIVEL_RAREZA_INVALIDO');
  });

  it('Rico con Core en una mesa de 8: el draft arranca con las 90 Legendario y GOAT y sin repetidos', async () => {
    const u = await crearInvitado(srv.url);
    const r = await peticion(srv.url, '/api/partidas', { cookie: u.cookie, cuerpo: { modo: 'liga', numParticipantes: 8, nivelRareza: 'rico' } });
    expect(r.estado, JSON.stringify(r.cuerpo)).toBe(201);
    const ws = await ClienteWs.conectar(srv.urlWs, r.cuerpo.id, u.cookie);
    await peticion(srv.url, `/api/partidas/${r.cuerpo.id}/iniciar`, { metodo: 'POST', cookie: u.cookie });
    await ws.esperar('draft.turno');
    const filas = await bd.db.execute<{ sobres: { cartas: number[] }[] }>(sql`select sobres from mesas where partida_id = ${r.cuerpo.id}`);
    const ids = filas.rows.flatMap((f) => f.sobres.flatMap((s) => s.cartas));
    expect(ids).toHaveLength(8 * 3 * 8);
    expect(new Set(ids).size).toBe(ids.length);
    const altas = await bd.db.execute<{ n: number }>(
      sql`select count(*)::int as n from jugadores where id in (${sql.join(ids.map((i) => sql`${i}`), sql`, `)}) and nivel in ('Legendario','GOAT')`,
    );
    expect(altas.rows[0]!.n).toBe(90);
    await ws.cerrar();
  });

  it('una partida anterior sin nivel se reanuda como Moderado (FR-018)', async () => {
    const u = await crearInvitado(srv.url);
    const r = await peticion(srv.url, '/api/partidas', { cookie: u.cookie, cuerpo: { modo: 'liga', numParticipantes: 4 } });
    // La columna tiene `default 'moderado'`: es lo que reciben las filas creadas antes de la 0016.
    await bd.db.execute(sql`update partidas set nivel_rareza = default where id = ${r.cuerpo.id}`);
    await srv.cerrar();
    srv = await iniciarServidorPruebas(bd);
    const g = await peticion(srv.url, `/api/partidas/${r.cuerpo.id}`, { cookie: u.cookie });
    expect(g.cuerpo.nivelRareza).toBe('moderado');
  });
});
