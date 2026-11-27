/**
 * Cierre de las partidas activas al desplegar el motor 9.0.0 (spec 018, US5, T074; FR-046 a FR-049, SC-011): partidas
 * en cada estado, con y sin cobro, cierre ejecutado dos veces, avisos, devoluciones, partidos y reversión ante un fallo.
 */
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { cerrarPartidasMotor9 } from '../../src/actores/cierreMotor9';
import { errorAlAbrir } from '../../src/actores/torneo';
import { RelojFalso } from '../../src/programador/reloj';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { saldoYSuma } from '../helpers/economia';

const TIPOS_AVISO_0017 = ['jornada_abierta', 'rival_listo', 'plazo_proximo', 'partido_auto_resuelto', 'torneo_terminado', 'dorsal_asignado', 'baja_sustituida'];
const TIPOS_AVISO = [...TIPOS_AVISO_0017, 'partida_cerrada'];
const RESULTADO = { estadisticas: { tiros: [3, 1] }, marcador: { local: 2, visitante: 1 }, eventos: [{ tipo: 'gol', minuto: 10 }] };

describe('cierre de partidas del motor 9.0.0', () => {
  let bd: BdPruebas;
  const reloj = new RelojFalso(Date.parse('2026-12-01T10:00:00Z'));
  const filas = async <T extends Record<string, unknown>>(q: ReturnType<typeof sql>) => (await bd.db.execute<T>(q)).rows;

  const usuario = async (id: string) => {
    await bd.db.execute(sql`insert into usuarios (id, apodo, email) values (${id}, ${id}, ${`${id}@pruebas.test`})`);
    await bd.db.execute(sql`insert into saldos_fragmentos (usuario_id, saldo) values (${id}, 0)`);
  };
  const partida = async (anfitrion: string, estado: string, cobro: number | null = null) => {
    const [p] = await filas<{ id: string }>(
      sql`insert into partidas (anfitrion_id, modo, num_participantes, plazas_humanas, tiempos, semilla, estado, nivel_rareza, cobro_rareza)
          values (${anfitrion}, 'liga', 4, 2, '{}'::jsonb, 's', ${estado}, ${cobro ? 'rico' : 'moderado'}, ${cobro}) returning id`,
    );
    if (cobro) {
      // Compró los fragmentos y los pagó: saldo 0 y un historial que lo suma.
      await bd.db.execute(sql`insert into movimientos_fragmentos (usuario_id, importe, motivo, referencia) values (${anfitrion}, ${cobro}, 'compra_fragmentos', 'prueba')`);
      await bd.db.execute(sql`insert into movimientos_fragmentos (usuario_id, importe, motivo, referencia) values (${anfitrion}, ${-cobro}, 'nivel_rareza', ${p!.id})`);
    }
    return p!.id;
  };
  let npcs = 0;
  const participante = async (partidaId: string, usuarioId: string | null) => {
    const [p] = await filas<{ id: string }>(
      usuarioId
        ? sql`insert into participantes (partida_id, tipo, usuario_id, nombre_equipo) values (${partidaId}, 'humano', ${usuarioId}, ${usuarioId}) returning id`
        : sql`insert into participantes (partida_id, tipo, nivel_npc, nombre_equipo) values (${partidaId}, 'npc', 'amateur', ${`NPC ${++npcs}`}) returning id`,
    );
    return p!.id;
  };
  const partido = async (partidaId: string, local: string, visitante: string, estado: string) => {
    const jugado = estado !== 'programado';
    const [p] = await filas<{ id: string }>(
      sql`insert into partidos (partida_id, jornada_numero, local_id, visitante_id, semilla, version_parametros, estado, entrada, eventos, decisiones, estadisticas, marcador, iniciado_en)
          values (${partidaId}, 1, ${local}, ${visitante}, 's', '8.0.0', ${estado},
                  ${jugado ? sql`'{"equipos":[]}'::jsonb` : null}, ${jugado ? JSON.stringify(RESULTADO.eventos) : '[]'}::jsonb,
                  ${jugado ? '[{"minuto":5}]' : '[]'}::jsonb, ${jugado ? JSON.stringify(RESULTADO.estadisticas) : null}::jsonb,
                  ${jugado ? JSON.stringify(RESULTADO.marcador) : null}::jsonb, ${jugado ? sql`now()` : null}) returning id`,
    );
    return p!.id;
  };
  const estadoPartida = async (id: string) => (await filas<{ estado: string }>(sql`select estado from partidas where id = ${id}`))[0]!.estado;
  const filaPartido = async (id: string) =>
    (await filas<Record<string, unknown>>(sql`select estado, entrada, decisiones, eventos, estadisticas, marcador, iniciado_en from partidos where id = ${id}`))[0]!;
  const avisosDe = (partidaId: string) =>
    filas<{ usuario_id: string; tipo: string; texto: string; enviado_email_en: Date | null }>(
      sql`select usuario_id, tipo, texto, enviado_email_en from avisos where partida_id = ${partidaId} order by usuario_id`,
    );
  const devoluciones = (usuarioId: string) =>
    filas<{ referencia: string; importe: number }>(sql`select referencia, importe from movimientos_fragmentos where usuario_id = ${usuarioId} and motivo = 'devolucion_nivel_rareza'`);

  /** Torneo con cobro (finalizado, en juego y programado), draft sin cobro, búsqueda con cobro y una terminada. */
  const sembrar = async () => {
    for (const u of ['ana', 'beto', 'carla', 'dani']) await usuario(u);
    const torneo = await partida('ana', 'en_torneo', 100);
    const [pa, pb, n1, n2] = [await participante(torneo, 'ana'), await participante(torneo, 'beto'), await participante(torneo, null), await participante(torneo, null)];
    const partidos = {
      finalizado: await partido(torneo, pa, n1, 'finalizado'),
      enJuego: await partido(torneo, pb, n2, 'segunda_parte'),
      programado: await partido(torneo, pa, pb, 'programado'),
    };
    const draft = await partida('beto', 'en_draft');
    await participante(draft, 'beto');
    await participante(draft, 'ana');
    await participante(draft, null);
    const buscando = await partida('carla', 'buscando', 100);
    await participante(buscando, 'carla');
    const terminada = await partida('dani', 'terminada');
    const dp = await participante(terminada, 'dani');
    const finalTerminada = await partido(terminada, dp, await participante(terminada, null), 'finalizado');
    return { torneo, draft, buscando, terminada, partidos, finalTerminada };
  };

  beforeAll(async () => {
    bd = await iniciarBdPruebas();
  });
  beforeEach(() => bd.limpiar());
  afterAll(() => bd?.detener());

  it('dos ejecuciones: cierra draft y torneo una sola vez, con avisos, devolución y partidos sin nada a medias (SC-011)', async () => {
    const s = await sembrar();
    const terminadoAntes = await filaPartido(s.finalTerminada);
    const finalizadoAntes = await filaPartido(s.partidos.finalizado);

    expect(await cerrarPartidasMotor9(bd.db, reloj)).toEqual({ ejecutado: true, partidas: 2, partidosReiniciados: 1, avisos: 4, devoluciones: 1 });
    expect(await cerrarPartidasMotor9(bd.db, reloj)).toEqual({ ejecutado: false, partidas: 0, partidosReiniciados: 0, avisos: 0, devoluciones: 0 });

    // Estados: solo draft y torneo; `buscando` jugará con la 9.0.0 y las terminadas no se tocan.
    expect(await estadoPartida(s.torneo)).toBe('abandonada');
    expect(await estadoPartida(s.draft)).toBe('abandonada');
    expect(await estadoPartida(s.buscando)).toBe('buscando');
    expect(await estadoPartida(s.terminada)).toBe('terminada');

    // Un aviso por humano y partida, solo en la bandeja; el anfitrión que pagó lee la devolución.
    const avisosTorneo = await avisosDe(s.torneo);
    expect(avisosTorneo.map((a) => [a.usuario_id, a.tipo, a.enviado_email_en])).toEqual([['ana', 'partida_cerrada', null], ['beto', 'partida_cerrada', null]]);
    expect(avisosTorneo[0]!.texto).toBe(
      'Hemos actualizado el motor de partidos y esta partida se ha cerrado. Te hemos devuelto los 100 fragmentos del nivel de rareza. Los partidos ya jugados conservan su resumen.',
    );
    expect(avisosTorneo[1]!.texto).toBe('Hemos actualizado el motor de partidos y esta partida se ha cerrado. Los partidos ya jugados conservan su resumen.');
    expect((await avisosDe(s.draft)).map((a) => a.usuario_id)).toEqual(['ana', 'beto']);
    expect(await avisosDe(s.buscando)).toEqual([]);

    // Cada cobro se devuelve una vez; el de `buscando` no.
    expect(await devoluciones('ana')).toEqual([{ referencia: s.torneo, importe: 100 }]);
    expect(await saldoYSuma(bd.db, 'ana')).toEqual({ saldo: 100, suma: 100 });
    expect(await devoluciones('carla')).toEqual([]);

    // Partidos: el que estaba en juego vuelve a `programado` vacío; los terminados conservan su resumen.
    expect(await filaPartido(s.partidos.enJuego)).toEqual({ estado: 'programado', entrada: null, decisiones: [], eventos: [], estadisticas: null, marcador: null, iniciado_en: null });
    expect((await filaPartido(s.partidos.programado)).estado).toBe('programado');
    expect(await filaPartido(s.partidos.finalizado)).toEqual(finalizadoAntes);
    expect(await filaPartido(s.finalTerminada)).toEqual(terminadoAntes);

    // Sin premios ni fragmentos de torneo.
    expect(await filas(sql`select 1 from movimientos_fragmentos where motivo = 'recompensa_torneo'`)).toEqual([]);

    // La marca guarda el recuento.
    const [marca] = await filas<{ valor: Record<string, unknown> }>(sql`select valor from ajustes where clave = 'cierre_motor_9'`);
    expect(marca!.valor).toMatchObject({ fecha: '2026-12-01T10:00:00.000Z', partidas: 2, devoluciones: 1 });
  });

  it('una partida creada después del cierre sigue activa aunque el cierre se repita', async () => {
    await usuario('eva');
    await cerrarPartidasMotor9(bd.db, reloj);
    const nueva = await partida('eva', 'en_draft', 100);
    await participante(nueva, 'eva');
    expect((await cerrarPartidasMotor9(bd.db, reloj)).ejecutado).toBe(false);
    expect(await estadoPartida(nueva)).toBe('en_draft');
    expect(await devoluciones('eva')).toEqual([]);
    expect(await avisosDe(nueva)).toEqual([]);
  });

  it('si algo falla no queda ningún cambio, y el siguiente arranque lo completa', async () => {
    const s = await sembrar();
    // Sin la migración 0018 el aviso incumple `avisos_tipo_ck` (contracts/cierre-partidas.md, requisito previo).
    const check = (tipos: string[]) =>
      bd.db.execute(sql.raw(`alter table avisos drop constraint avisos_tipo_ck, add constraint avisos_tipo_ck check (tipo in (${tipos.map((t) => `'${t}'`).join(',')}))`));
    await check(TIPOS_AVISO_0017);
    try {
      await expect(cerrarPartidasMotor9(bd.db, reloj)).rejects.toThrow();
    } finally {
      await check(TIPOS_AVISO);
    }
    expect(await estadoPartida(s.torneo)).toBe('en_torneo');
    expect(await estadoPartida(s.draft)).toBe('en_draft');
    expect(await devoluciones('ana')).toEqual([]);
    expect((await filaPartido(s.partidos.enJuego)).estado).toBe('segunda_parte');
    expect(await filas(sql`select 1 from avisos`)).toEqual([]);
    expect(await filas(sql`select 1 from ajustes where clave = 'cierre_motor_9'`)).toEqual([]);

    expect((await cerrarPartidasMotor9(bd.db, reloj)).ejecutado).toBe(true);
    expect(await estadoPartida(s.torneo)).toBe('abandonada');
  });

  it('un partido no terminado de una partida cerrada no se puede abrir; uno terminado, sí', async () => {
    const s = await sembrar();
    await cerrarPartidasMotor9(bd.db, reloj);
    const [fila] = await filas<{ local_id: string }>(sql`select local_id from partidos where id = ${s.partidos.programado}`);
    const leer = async (id: string) => {
      const [f] = await filas<{ id: string; partida_id: string; local_id: string; visitante_id: string; estado: string }>(
        sql`select id, partida_id, local_id, visitante_id, estado from partidos where id = ${id}`,
      );
      return { id: f!.id, partidaId: f!.partida_id, localId: f!.local_id, visitanteId: f!.visitante_id, estado: f!.estado };
    };
    // Controlador mínimo: la jornada sigue abierta en memoria, como si la partida se hubiera cerrado con ella en curso.
    const c = {
      id: s.torneo,
      partida: { estado: await estadoPartida(s.torneo) },
      jornada: { cruces: [s.partidos.programado, s.partidos.enJuego].map((partidoId) => ({ partidoId })) },
    } as unknown as Parameters<typeof errorAlAbrir>[0];
    type Fila = Parameters<typeof errorAlAbrir>[1];
    expect(errorAlAbrir(c, (await leer(s.partidos.programado)) as Fila, fila!.local_id)).toBe('JORNADA_NO_ABIERTA');
    expect(errorAlAbrir(c, (await leer(s.partidos.enJuego)) as Fila, (await leer(s.partidos.enJuego)).localId)).toBe('JORNADA_NO_ABIERTA');
    expect(errorAlAbrir(c, (await leer(s.partidos.finalizado)) as Fila, fila!.local_id)).toBeNull();
  });
});
