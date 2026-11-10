/**
 * «Mis partidas» paginada (spec 013, US4; FR-024, FR-025, SC-007; research R9).
 */
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { crearRegistrado, peticion, type UsuarioPrueba } from '../helpers/usuarios';

describe('GET /api/mis-partidas paginada', () => {
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

  /** `n` terminadas, de dos en dos con la misma `actualizada_en` (el desempate es el id). */
  async function terminadas(u: UsuarioPrueba, n: number): Promise<string[]> {
    const r = await bd.db.execute<{ id: string }>(sql`
      with p as (
        insert into partidas (anfitrion_id, modo, num_participantes, plazas_humanas, tiempos, semilla, estado, actualizada_en)
        select ${u.id}, 'liga', 4, 1, '{}'::jsonb, 's', 'terminada', now() - make_interval(mins => g / 2) - interval '1 hour'
        from generate_series(1, ${n}) g
        returning id
      )
      insert into participantes (partida_id, tipo, usuario_id, nombre_equipo)
      select id, 'humano', ${u.id}, 'Los de prueba' from p
      returning partida_id as id`);
    return r.rows.map((f) => f.id);
  }

  const pedir = (u: UsuarioPrueba, consulta = '') => peticion(srv.url, `/api/mis-partidas${consulta}`, { cookie: u.cookie });

  it('1 en curso + 50 terminadas: en curso y 5 por página, sin duplicados ni huecos aunque termine otra entre páginas', async () => {
    const u = await crearRegistrado(srv.url);
    const enCurso = await peticion(srv.url, '/api/partidas', { cookie: u.cookie, cuerpo: { modo: 'liga', numParticipantes: 4 } });
    expect(enCurso.estado, JSON.stringify(enCurso.cuerpo)).toBe(201);
    const ids = await terminadas(u, 50);

    const primera = await pedir(u);
    expect(primera.estado).toBe(200);
    expect(primera.cuerpo.enCurso.map((p: { id: string }) => p.id)).toEqual([enCurso.cuerpo.id]);
    expect(primera.cuerpo.terminadas).toHaveLength(5);
    expect(primera.cuerpo.terminadas[0]).toMatchObject({ modo: 'liga', fase: 'terminada', nombreEquipo: 'Los de prueba' });
    expect(primera.cuerpo.siguiente).not.toBeNull();

    // Termina la que estaba en curso: queda la más reciente, antes del cursor; no se repite ni desplaza nada.
    await bd.db.execute(sql`update partidas set estado = 'terminada', actualizada_en = now() where id = ${enCurso.cuerpo.id}`);

    const vistas: string[] = primera.cuerpo.terminadas.map((p: { id: string }) => p.id);
    let siguiente: string | null = primera.cuerpo.siguiente;
    while (siguiente) {
      const r = await pedir(u, `?antes=${encodeURIComponent(siguiente)}`);
      expect(r.estado).toBe(200);
      expect(r.cuerpo.enCurso).toEqual([]);
      vistas.push(...r.cuerpo.terminadas.map((p: { id: string }) => p.id));
      siguiente = r.cuerpo.siguiente;
    }
    expect(vistas).toHaveLength(50);
    expect(new Set(vistas)).toEqual(new Set(ids));
    // Orden (actualizada_en desc, id desc).
    const orden = await bd.db.execute<{ id: string }>(
      sql`select id from partidas where id in (${sql.join(ids.map((i) => sql`${i}::uuid`), sql`, `)}) order by actualizada_en desc, id desc`,
    );
    expect(vistas).toEqual(orden.rows.map((f) => f.id));
  });

  it('sin partidas, solo en curso o exactamente 5 terminadas ⇒ siguiente null', async () => {
    const u = await crearRegistrado(srv.url);
    expect((await pedir(u)).cuerpo).toEqual({ enCurso: [], terminadas: [], siguiente: null });
    await peticion(srv.url, '/api/partidas', { cookie: u.cookie, cuerpo: { modo: 'liga', numParticipantes: 4 } });
    expect((await pedir(u)).cuerpo.siguiente).toBeNull();
    await terminadas(u, 5);
    const r = await pedir(u);
    expect(r.cuerpo.terminadas).toHaveLength(5);
    expect(r.cuerpo.siguiente).toBeNull();
  });

  it('limite fuera de 1–20 o cursor mal formado ⇒ 400', async () => {
    const u = await crearRegistrado(srv.url);
    for (const q of ['?limite=0', '?limite=21', '?antes=x']) expect((await pedir(u, q)).estado, q).toBe(400);
    expect((await pedir(u, '?limite=20')).estado).toBe(200);
  });

  it('con 200 terminadas responde en menos de 1 s (SC-007)', async () => {
    const u = await crearRegistrado(srv.url);
    await terminadas(u, 200);
    const t0 = performance.now();
    const r = await pedir(u);
    expect(r.cuerpo.terminadas).toHaveLength(5);
    expect(performance.now() - t0).toBeLessThan(1000);
  });
});
