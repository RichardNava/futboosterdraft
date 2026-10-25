/**
 * Pool del torneo (spec 006, US2; T045; R12, FR-014 a FR-016): la partida de un registrado guarda la foto de sus
 * cartas activas y el draft solo reparte esas; la de un invitado juega con Core.
 */
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { crearRegistradoConColeccion, darCartas } from '../helpers/economia';
import { esperarEstado } from '../helpers/partidas';
import { crearInvitado, peticion, type UsuarioPrueba } from '../helpers/usuarios';

describe('pool del anfitrión (spec 006)', () => {
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

  async function jugarDraft(u: UsuarioPrueba) {
    const r = await peticion(srv.url, '/api/partidas', { cookie: u.cookie, cuerpo: { modo: 'liga', numParticipantes: 4 } });
    expect(r.estado, JSON.stringify(r.cuerpo)).toBe(201);
    const partidaId: string = r.cuerpo.id;
    await peticion(srv.url, `/api/partidas/${partidaId}/iniciar`, { metodo: 'POST', cookie: u.cookie });
    await esperarEstado(srv, partidaId, u, 'en_torneo');
    const pool = (await bd.db.execute<{ p: number[] | null }>(sql`select pool_cartas as p from partidas where id = ${partidaId}`)).rows[0]!.p;
    const elegidas = (
      await bd.db.execute<{ id: number }>(sql`select e.jugador_id as id from elecciones e join mesas m on m.id = e.mesa_id where m.partida_id = ${partidaId}`)
    ).rows.map((f) => f.id);
    return { partidaId, pool, elegidas };
  }

  it('el registrado juega con la foto de sus activas: ninguna inactiva sale en la mesa y reactivar no cambia la foto', { timeout: 120_000 }, async () => {
    const u = await crearRegistradoConColeccion(srv);
    const prueba = Array.from({ length: 75 }, (_, i) => 301 + i);
    await darCartas(bd.db, u.id, prueba);
    // Por cada carta de prueba se desactiva una de Core de su misma combinación: el mínimo sigue cumpliéndose.
    await bd.db.execute(sql`
      update cartas_usuario cu set activa = false
      from (
        select core.id from (
          select j.id, j.demarcacion, j.nivel, row_number() over (partition by j.demarcacion, j.nivel order by j.id) as n
          from jugadores j where j.id <= 300
        ) core
        join (select demarcacion, nivel, count(*) as extra from jugadores where id > 300 group by demarcacion, nivel) p
          on p.demarcacion = core.demarcacion and p.nivel = core.nivel
        where core.n <= p.extra
      ) d
      where cu.usuario_id = ${u.id} and cu.jugador_id = d.id`);
    const coleccion = (await peticion(srv.url, '/api/coleccion', { cookie: u.cookie })).cuerpo;
    expect(coleccion.minimo.cumple).toBe(true);
    const inactivas = new Set<number>(coleccion.cartas.filter((c: any) => !c.activa).map((c: any) => c.id));
    expect(inactivas.size).toBeGreaterThan(60);

    const { partidaId, pool, elegidas } = await jugarDraft(u);
    expect(pool).toHaveLength(375 - inactivas.size);
    expect(pool!.some((id) => inactivas.has(id))).toBe(false);
    expect(elegidas.length).toBeGreaterThan(0);
    expect(elegidas.every((id) => pool!.includes(id))).toBe(true);

    for (const id of [...inactivas].slice(0, 3)) await peticion(srv.url, `/api/coleccion/cartas/${id}`, { metodo: 'PUT', cookie: u.cookie, cuerpo: { activa: true } });
    const despues = (await bd.db.execute<{ p: number[] }>(sql`select pool_cartas as p from partidas where id = ${partidaId}`)).rows[0]!.p;
    expect(despues).toEqual(pool);
  });

  it('el invitado crea la partida sin foto y juega con Core', { timeout: 120_000 }, async () => {
    const u = await crearInvitado(srv.url);
    const { pool, elegidas } = await jugarDraft(u);
    expect(pool).toBeNull();
    expect(elegidas.every((id) => id <= 300)).toBe(true);
  });
});
