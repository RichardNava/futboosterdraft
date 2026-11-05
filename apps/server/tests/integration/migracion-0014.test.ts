/**
 * Migración 0014 (spec 011, T009; data-model §1–§6): una base en la 0013 con partidas y perfiles pasa a cosméticos e
 * identidad sin perder datos, y los `check` nuevos protegen el catálogo de cosméticos y la identidad alternativa.
 */
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bdHasta, type BdParcial } from '../helpers/migraciones';

describe('migración 0014 (cosméticos e identidad)', () => {
  let bd: BdParcial;

  beforeAll(async () => {
    bd = await bdHasta('0013_dificultad_extrema');
    await bd.db.execute(sql`insert into usuarios (id, apodo, email) values ('u013', 'Ana', 'ana@x.es')`);
    await bd.db.execute(sql`insert into perfiles_usuario (usuario_id, nombre_equipo, actualizado_en) values ('u013', 'Los Ana', now())`);
    await bd.db.execute(
      sql`insert into partidas (anfitrion_id, modo, num_participantes, plazas_humanas, tiempos, semilla) values ('u013', 'liga', 4, 1, '{}'::jsonb, 's')`,
    );
    await bd.db.execute(
      sql`insert into participantes (partida_id, tipo, usuario_id, nombre_equipo) select id, 'humano', 'u013', 'Los Ana' from partidas`,
    );
    await bd.completar();
  });
  afterAll(async () => {
    await bd?.detener();
  });

  it('valores por defecto en las filas existentes', async () => {
    const partida = await bd.db.execute<{ identidad: string }>(sql`select identidad from partidas`);
    expect(partida.rows).toEqual([{ identidad: 'real' }]);
    const perfil = await bd.db.execute(
      sql`select escudo, sobre_favorito, sobre_carrusel, sobres_marcados, sobre_baraja, sobre_ultimo, nombre_equipo from perfiles_usuario`,
    );
    expect(perfil.rows).toEqual([
      { escudo: null, sobre_favorito: null, sobre_carrusel: false, sobres_marcados: [], sobre_baraja: [], sobre_ultimo: null, nombre_equipo: 'Los Ana' },
    ]);
    const participante = await bd.db.execute<{ escudo: string | null }>(sql`select escudo from participantes`);
    expect(participante.rows).toEqual([{ escudo: null }]);
  });

  it('las tablas nuevas existen y están vacías', async () => {
    for (const tabla of ['cosmeticos', 'packs_cosmeticos', 'cosmeticos_usuario', 'ajustes']) {
      const r = await bd.db.execute<{ n: number }>(sql`select count(*)::int as n from ${sql.identifier(tabla)}`);
      expect(r.rows[0]!.n, tabla).toBe(0);
    }
  });

  it('rechaza un tipo inválido y un cosmético de pago sin precio', async () => {
    await expect(bd.db.execute(sql`insert into cosmeticos (id, tipo, nombre, gratuito, orden) values ('x', 'gorra', 'X', true, 1)`)).rejects.toThrow();
    await expect(bd.db.execute(sql`insert into cosmeticos (id, tipo, nombre, gratuito, orden) values ('y', 'escudo', 'Y', false, 1)`)).rejects.toThrow();
    await expect(
      bd.db.execute(sql`insert into cosmeticos (id, tipo, nombre, gratuito, precio_centimos, orden) values ('z', 'escudo', 'Z', false, 25, 1)`),
    ).rejects.toThrow();
    await bd.db.execute(
      sql`insert into cosmeticos (id, tipo, nombre, gratuito, precio_centimos, precio_fragmentos, orden) values ('ok', 'escudo', 'Ok', false, 25, 250, 1)`,
    );
  });

  it('rechaza una identidad de partida desconocida y un jugador con solo uno de los nombres alternativos', async () => {
    await expect(bd.db.execute(sql`update partidas set identidad = 'otra'`)).rejects.toThrow();
    await bd.db.execute(
      sql`insert into jugadores (id, nombre, apellidos, nombre_carta, nacionalidad, fecha_nacimiento, altura, demarcacion, posicion, historia, stats, media, virtudes, nivel, imagen, imagen_bg)
          values (1, 'A', 'B', 'A B', 'ESP', '1990-01-01', 180, 'POR', '{POR}'::text[], '', '{}'::jsonb, 70, '{}'::text[], 'Superclase', '/i', '/f')`,
    );
    await expect(bd.db.execute(sql`update jugadores set nombre_alt = 'Solo'`)).rejects.toThrow();
    await bd.db.execute(sql`update jugadores set nombre_alt = 'C', apellidos_alt = 'D', nombre_carta_alt = 'C D'`);
  });

  it('las compras y los movimientos admiten los productos y motivos nuevos', async () => {
    await bd.db.execute(
      sql`insert into compras (id, usuario_id, producto_tipo, producto_id, moneda, importe, estado, resultado)
          values ('00000000-0000-4000-8000-000000000001', 'u013', 'cosmetico', 'ok', 'fragmentos', 250, 'completada', '{}'::jsonb)`,
    );
    await bd.db.execute(
      sql`insert into movimientos_fragmentos (usuario_id, importe, motivo, referencia) values ('u013', -250, 'compra_cosmetico', 'x'), ('u013', -4000, 'compra_coleccion', 'y')`,
    );
  });
});
