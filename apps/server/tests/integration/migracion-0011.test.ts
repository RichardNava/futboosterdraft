/**
 * Migración 0011 (spec 006, T021; data-model §3): una base en la 0010 con cartas `GBR` y partidas `'Core'` pasa a
 * colecciones sin perder datos, y los `check` nuevos protegen el saldo y los movimientos.
 */
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bdHasta, type BdParcial } from '../helpers/migraciones';

describe('migración 0011 (colecciones)', () => {
  let bd: BdParcial;

  beforeAll(async () => {
    bd = await bdHasta('0010_virtudes_defectos');
    const carta = (id: number, nacionalidad: string, demarcacion: string, historia: string) =>
      sql`insert into jugadores (id, nombre, apellidos, nacionalidad, fecha_nacimiento, altura, demarcacion, posicion, historia, stats, media, virtudes, nivel, coleccion)
          values (${id}, 'Filipe', 'Galodez Dorelzal', ${nacionalidad}, '1996-01-02', 190, ${demarcacion}, '{POR}'::text[], ${historia}, '{}'::jsonb, 74, '{}'::text[], 'Superclase', 'Core')`;
    await bd.db.execute(carta(2, 'GBR', 'POR', 'Filipe Galodez (GBR) es un fijo en cualquier once.'));
    await bd.db.execute(carta(3, 'SEN', 'DEL', 'Filipe Galodez (SEN) es un fijo en cualquier once.'));
    await bd.db.execute(sql`insert into usuarios (id, apodo, email) values ('u010', 'Ana', 'ana@x.es')`);
    await bd.db.execute(
      sql`insert into partidas (anfitrion_id, modo, num_participantes, plazas_humanas, tiempos, semilla, colecciones)
          values ('u010', 'liga', 4, 1, '{}'::jsonb, 's', ARRAY['Core']::text[])`,
    );
    await bd.completar();
  });
  afterAll(async () => {
    await bd?.detener();
  });

  it('las cartas ganan nombre_carta, imagen e imagen_bg y pierden coleccion', async () => {
    const filas = await bd.db.execute<{ id: number; nombre_carta: string; imagen: string; imagen_bg: string }>(
      sql`select id, nombre_carta, imagen, imagen_bg from jugadores order by id`,
    );
    expect(filas.rows).toEqual([
      { id: 2, nombre_carta: 'Filipe Galodez', imagen: '/cartas/siluetas/por.svg', imagen_bg: '/cartas/fondos/por.svg' },
      { id: 3, nombre_carta: 'Filipe Galodez', imagen: '/cartas/siluetas/del.svg', imagen_bg: '/cartas/fondos/del.svg' },
    ]);
    const columnas = await bd.db.execute<{ c: string }>(sql`select column_name as c from information_schema.columns where table_name = 'jugadores'`);
    expect(columnas.rows.map((c) => c.c)).not.toContain('coleccion');
  });

  it('GBR se reasigna con la tabla de data/core.json, también en la historia', async () => {
    const filas = await bd.db.execute<{ id: number; nacionalidad: string; historia: string }>(sql`select id, nacionalidad, historia from jugadores order by id`);
    expect(filas.rows[0]).toMatchObject({ id: 2, nacionalidad: 'WAL', historia: 'Filipe Galodez (WAL) es un fijo en cualquier once.' });
    expect(filas.rows[1]).toMatchObject({ id: 3, nacionalidad: 'SEN' });
  });

  it('las partidas pasan a la colección core y sin foto del pool', async () => {
    const filas = await bd.db.execute<{ colecciones: string[]; pool_cartas: number[] | null }>(sql`select colecciones, pool_cartas from partidas`);
    expect(filas.rows).toEqual([{ colecciones: ['core'], pool_cartas: null }]);
  });

  it('las tablas nuevas existen y están vacías', async () => {
    for (const tabla of ['colecciones', 'colecciones_cartas', 'cartas_usuario', 'colecciones_usuario', 'saldos_fragmentos', 'movimientos_fragmentos', 'compras']) {
      const r = await bd.db.execute<{ n: number }>(sql`select count(*)::int as n from ${sql.identifier(tabla)}`);
      expect(r.rows[0]!.n, tabla).toBe(0);
    }
  });

  it('un saldo negativo y un movimiento de importe 0 se rechazan', async () => {
    await expect(bd.db.execute(sql`insert into saldos_fragmentos (usuario_id, saldo) values ('u010', -1)`)).rejects.toThrow();
    await expect(
      bd.db.execute(sql`insert into movimientos_fragmentos (usuario_id, importe, motivo, referencia) values ('u010', 0, 'duplicado', '1')`),
    ).rejects.toThrow();
  });

  it('una recompensa de torneo repetida choca con el índice único', async () => {
    const recompensa = sql`insert into movimientos_fragmentos (usuario_id, importe, motivo, referencia) values ('u010', 10, 'recompensa_torneo', 'p1')`;
    await bd.db.execute(recompensa);
    await expect(bd.db.execute(recompensa)).rejects.toThrow();
  });
});
