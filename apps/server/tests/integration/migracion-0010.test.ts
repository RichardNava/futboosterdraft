/**
 * Migración 0010 (spec 005, T006; SC-002, FR-003, FR-036) sobre una base de datos de la spec 004: las virtudes de
 * `jugadores` y de las cartas guardadas en `partidos.entrada` cambian de nombre sin perder valores, y un partido
 * jugado con parámetros 3.0.0 se sigue reproduciendo igual.
 */
import { PARAMETROS_V3, parametrosPorVersion } from '@fbd/domain';
import { avanzar, crearPartido, type EntradaPartido } from '@fbd/engine';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { baseDatos004, CLAVE_004, type BaseDatos004 } from '../helpers/baseDatos004';

describe('migración 0010 (virtudes y defectos)', () => {
  let bd: BaseDatos004;
  let antes: Map<number, string[]>;

  beforeAll(async () => {
    bd = await baseDatos004();
    const filas = await bd.db.execute<{ id: number; v: string[] }>(sql`select id, ${sql.raw(CLAVE_004)} as v from jugadores`);
    antes = new Map(filas.rows.map((f) => [f.id, f.v]));
    await bd.completar();
  });
  afterAll(async () => {
    await bd?.detener();
  });

  it('jugadores.virtudes conserva los valores de la columna antigua y los defectos empiezan vacíos', async () => {
    const filas = await bd.db.execute<{ id: number; virtudes: string[]; defectos: string[] }>(sql`select id, virtudes, defectos from jugadores`);
    expect(filas.rows).toHaveLength(antes.size);
    for (const f of filas.rows) {
      expect(f.virtudes).toEqual(antes.get(f.id));
      expect(f.defectos).toEqual([]);
    }
    const columnas = await bd.db.execute<{ c: string }>(sql`select column_name as c from information_schema.columns where table_name = 'jugadores'`);
    expect(columnas.rows.map((c) => c.c)).not.toContain(CLAVE_004);
  });

  it('partidos.entrada ya no contiene la clave antigua y sus cartas tienen virtudes', async () => {
    const filas = await bd.db.execute<{ e: string }>(sql`select entrada::text as e from partidos`);
    expect(filas.rows).toHaveLength(1);
    const texto = filas.rows[0]!.e;
    expect(texto).not.toContain(`"${CLAVE_004}":`);
    const entrada = JSON.parse(texto) as EntradaPartido;
    for (const t of entrada.local.titulares) expect(Array.isArray(t.jugador.virtudes)).toBe(true);
  });

  it('la reproducción del partido 3.0.0 da los mismos eventos y el mismo marcador', async () => {
    const fila = await bd.db.execute<{ entrada: Omit<EntradaPartido, 'parametros'>; v: string; tipo: string }>(
      sql`select entrada, version_parametros as v, tipo from partidos where id = ${bd.partidoId}`,
    );
    const { entrada, v, tipo } = fila.rows[0]!;
    expect(v).toBe(PARAMETROS_V3.version);
    expect(tipo).toBe('futbol');
    const fin = avanzar(crearPartido({ ...entrada, parametros: parametrosPorVersion(v) }), 'final');
    expect(fin.eventos).toEqual(bd.eventos);
    expect(fin.marcador).toEqual(bd.marcador);
  });

  it('la partida de la 004 queda en la versión 1 del catálogo (FR-036)', async () => {
    const fila = await bd.db.execute<{ v: number }>(sql`select version_catalogo as v from partidas where id = ${bd.partidaId}`);
    expect(fila.rows[0]!.v).toBe(1);
  });
});
