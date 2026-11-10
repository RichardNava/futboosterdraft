/**
 * Migración 0016 (spec 013, T004; data-model §1): nivel de rareza de la partida, cobro e idempotencia de la creación,
 * índice de «Mis partidas» y pase premium.
 */
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bdHasta, type BdParcial } from '../helpers/migraciones';

describe('migración 0016 (spec 013)', () => {
  let bd: BdParcial;

  beforeAll(async () => {
    bd = await bdHasta('0015_spec012');
    await bd.db.execute(sql`insert into usuarios (id, apodo, email) values ('u015', 'Ana', 'ana@x.es')`);
    await bd.db.execute(
      sql`insert into partidas (anfitrion_id, modo, num_participantes, plazas_humanas, tiempos, semilla) values ('u015', 'liga', 4, 1, '{}'::jsonb, 's')`,
    );
    await bd.completar();
  });
  afterAll(async () => {
    await bd?.detener();
  });

  it('una partida previa queda en Moderado y gratis (FR-018)', async () => {
    const r = await bd.db.execute(sql`select nivel_rareza, cobro_rareza, clave_creacion from partidas`);
    expect(r.rows).toEqual([{ nivel_rareza: 'moderado', cobro_rareza: null, clave_creacion: null }]);
  });

  it('rechaza un nivel desconocido', async () => {
    await expect(bd.db.execute(sql`update partidas set nivel_rareza = 'x'`)).rejects.toThrow();
    await bd.db.execute(sql`update partidas set nivel_rareza = 'rico'`);
  });

  it('la clave de creación es única por anfitrión', async () => {
    await bd.db.execute(sql`update partidas set clave_creacion = 'k1'`);
    await expect(
      bd.db.execute(
        sql`insert into partidas (anfitrion_id, modo, num_participantes, plazas_humanas, tiempos, semilla, clave_creacion) values ('u015', 'liga', 4, 1, '{}'::jsonb, 's', 'k1')`,
      ),
    ).rejects.toThrow();
  });

  it('existen pases_premium, los índices nuevos y los motivos nuevos', async () => {
    await bd.db.execute(sql`insert into pases_premium (usuario_id, cortesia) values ('u015', true)`);
    const indices = await bd.db.execute(
      sql`select indexname from pg_indexes where indexname in ('participantes_usuario_idx','partidas_anfitrion_clave_uq','movimientos_devolucion_rareza_uq') order by indexname`,
    );
    expect(indices.rows.map((f) => f.indexname)).toEqual([
      'movimientos_devolucion_rareza_uq',
      'participantes_usuario_idx',
      'partidas_anfitrion_clave_uq',
    ]);
    await bd.db.execute(
      sql`insert into movimientos_fragmentos (usuario_id, importe, motivo, referencia) values ('u015', 100, 'devolucion_nivel_rareza', 'p1')`,
    );
    await expect(
      bd.db.execute(
        sql`insert into movimientos_fragmentos (usuario_id, importe, motivo, referencia) values ('u015', 100, 'devolucion_nivel_rareza', 'p1')`,
      ),
    ).rejects.toThrow();
  });
});
