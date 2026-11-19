/**
 * Retirada de las colecciones de prueba en el seed (spec 016, T014, T017; data-model §3; FR-009 a FR-012, SC-007).
 *
 * Simula una BD de antes de la spec: `all-stars` y `top-argentinos` con dos cartas propias, una cuenta que las compró,
 * movimientos, un sobre de la tienda y partidas que las citan. La primera pasada lo retira todo sin tocar el saldo;
 * la segunda no encuentra nada.
 */
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cargarCatalogo, FICHEROS_POR_DEFECTO, leerLote } from '../../src/persistencia/seed';
import { jugadores } from '../../src/persistencia/esquema/index';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';

const RAIZ = new URL('../../../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const COMPRA_COLECCION = '00000000-0000-4000-8000-000000000001';
const COMPRA_SOBRE = '00000000-0000-4000-8000-000000000002';

describe('seed: retirada de las colecciones de prueba (spec 016)', () => {
  let bd: BdPruebas;
  const partidas: Record<string, string> = {};
  const contar = async (consulta: ReturnType<typeof sql>) => Number((await bd.db.execute<{ n: string }>(consulta)).rows[0]!.n);

  /** Una partida con un participante; con `plantilla` o con una mesa y una elección de `eleccion`. */
  async function partida(nombre: string, plantilla: number[] | null, eleccion: number | null): Promise<void> {
    const [p] = (
      await bd.db.execute<{ id: string }>(
        sql`insert into partidas (anfitrion_id, modo, num_participantes, plazas_humanas, tiempos, semilla) values ('ana', 'liga', 4, 1, '{}'::jsonb, 's') returning id`,
      )
    ).rows;
    const [pa] = (
      await bd.db.execute<{ id: string }>(
        sql`insert into participantes (partida_id, tipo, usuario_id, nombre_equipo) values (${p!.id}, 'humano', 'ana', 'Ana FC') returning id`,
      )
    ).rows;
    if (plantilla) await bd.db.execute(sql`insert into plantillas (participante_id, jugadores) values (${pa!.id}, ${sql.raw(`array[${plantilla.join(',')}]::integer[]`)})`);
    if (eleccion !== null) {
      const [m] = (
        await bd.db.execute<{ id: string }>(
          sql`insert into mesas (partida_id, indice, semilla, participantes, ronda, turno, turno_s, vence_en, estado, sobres)
              values (${p!.id}, 0, 's', array[${pa!.id}]::text[], 1, 1, 30, now(), 'en_turno', '[]'::jsonb) returning id`,
        )
      ).rows;
      await bd.db.execute(
        sql`insert into elecciones (mesa_id, ronda, turno, participante_id, sobre_id, jugador_id, origen, registrada_en)
            values (${m!.id}, 1, 1, ${pa!.id}, 'x', ${eleccion}, 'manual', now())`,
      );
    }
    partidas[nombre] = p!.id;
  }

  async function cargar() {
    const lote = leerLote(RAIZ, FICHEROS_POR_DEFECTO.cartas, FICHEROS_POR_DEFECTO.colecciones);
    return cargarCatalogo(bd.db, lote.jugadores, lote.colecciones);
  }

  beforeAll(async () => {
    bd = await iniciarBdPruebas();
    // Dos cartas de prueba con ids que no usa ninguna carta real.
    const [modelo] = await bd.db.select().from(jugadores).where(sql`id = 1`);
    for (const id of [9001, 9002]) await bd.db.insert(jugadores).values({ ...modelo!, id });
    await bd.db.execute(sql`insert into colecciones (id, nombre, descripcion, tipo, precio_centimos, precio_fragmentos, orden)
      values ('all-stars', 'All Stars', 'Prueba', 'pago', 499, 5000, 90), ('top-argentinos', 'Top Argentinos', 'Prueba', 'pago', 399, 4000, 91)`);
    await bd.db.execute(
      sql`insert into colecciones_cartas (coleccion_id, jugador_id) values ('all-stars', 9001), ('all-stars', 9002), ('top-argentinos', 9002)`,
    );
    await bd.db.execute(sql`insert into usuarios (id, apodo, email) values ('ana', 'Ana', 'ana@x.es')`);
    await bd.db.execute(sql`insert into saldos_fragmentos (usuario_id, saldo) values ('ana', 777)`);
    await bd.db.execute(sql`insert into cartas_usuario (usuario_id, jugador_id, via) values ('ana', 1, 'registro'), ('ana', 9001, 'coleccion'), ('ana', 9002, 'sobre')`);
    await bd.db.execute(sql`insert into compras (id, usuario_id, producto_tipo, producto_id, moneda, importe, estado, resultado) values
      (${COMPRA_COLECCION}, 'ana', 'coleccion', 'all-stars', 'fragmentos', 5000, 'completada', '{"cartas":[9001],"fragmentos":0,"duplicados":[]}'::jsonb),
      (${COMPRA_SOBRE}, 'ana', 'sobre', 'sobre', 'fragmentos', 1000, 'completada', '{"cartas":[9002],"fragmentos":0,"duplicados":[]}'::jsonb)`);
    await bd.db.execute(sql`insert into colecciones_usuario (usuario_id, coleccion_id, compra_id) values ('ana', 'all-stars', ${COMPRA_COLECCION})`);
    await bd.db.execute(sql`insert into movimientos_fragmentos (usuario_id, importe, motivo, referencia) values
      ('ana', -5000, 'compra_coleccion', ${COMPRA_COLECCION}),
      ('ana', -1000, 'compra_sobre', ${COMPRA_SOBRE}),
      ('ana', 25, 'duplicado', '9001'),
      ('ana', 75, 'desfragmentacion', '9002'),
      ('ana', 10, 'recompensa_torneo', 'una-partida'),
      ('ana', 25, 'duplicado', '5')`);
    await partida('conPlantilla', [1, 9001], null);
    await partida('conEleccion', null, 9002);
    await partida('sinPrueba', [1, 2], null);
  }, 180_000);

  afterAll(async () => {
    await bd?.detener();
  });

  it('la primera pasada borra partidas, posesión, movimientos, compras y colecciones de prueba, sin tocar el saldo', async () => {
    const { retirada } = await cargar();
    expect(retirada).toEqual({ partidas: 2, cartasUsuario: 2, movimientos: 4, coleccionesUsuario: 1, compras: 2, colecciones: 2 });

    const quedan = (await bd.db.execute<{ id: string }>(sql`select id from partidas`)).rows.map((f) => f.id);
    expect(quedan).toEqual([partidas.sinPrueba]);
    expect(await contar(sql`select count(*) as n from cartas_usuario where jugador_id in (9001, 9002)`)).toBe(0);
    expect(await contar(sql`select count(*) as n from cartas_usuario where usuario_id = 'ana' and jugador_id = 1`)).toBe(1);
    const movimientos = (await bd.db.execute<{ motivo: string; referencia: string }>(sql`select motivo, referencia from movimientos_fragmentos order by referencia`)).rows;
    expect(movimientos).toEqual([
      { motivo: 'duplicado', referencia: '5' },
      { motivo: 'recompensa_torneo', referencia: 'una-partida' },
    ]);
    expect(await contar(sql`select count(*) as n from compras`)).toBe(0);
    expect(await contar(sql`select count(*) as n from colecciones where id in ('all-stars', 'top-argentinos')`)).toBe(0);
    expect(await contar(sql`select count(*) as n from colecciones_cartas where jugador_id in (9001, 9002)`)).toBe(0);
    // FR-011: el saldo no se compensa ni se retira.
    expect(await contar(sql`select saldo as n from saldos_fragmentos where usuario_id = 'ana'`)).toBe(777);
  });

  it('la segunda pasada no encuentra nada y no cambia nada (FR-012, SC-007)', async () => {
    const antes = await contar(sql`select count(*) as n from movimientos_fragmentos`);
    const { retirada } = await cargar();
    expect(retirada).toEqual({ partidas: 0, cartasUsuario: 0, movimientos: 0, coleccionesUsuario: 0, compras: 0, colecciones: 0 });
    expect(await contar(sql`select count(*) as n from movimientos_fragmentos`)).toBe(antes);
    expect(await contar(sql`select count(*) as n from partidas`)).toBe(1);
  });
});
