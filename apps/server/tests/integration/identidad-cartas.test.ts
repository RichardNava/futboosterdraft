/**
 * Plan B de identidad de las cartas (spec 011, US4; T057, T058; research R12): el ajuste sin reinicio, la identidad
 * fijada por partida, las vistas fuera de partida y el mismo partido con la misma semilla en los dos modos (FR-019).
 */
import { readFileSync } from 'node:fs';
import { parametrosPorVersion, type Jugador } from '@fbd/domain';
import { aplicarDecision, avanzar, crearPartido, type DecisionRegistrada, type EntradaPartido, type EstadoMotor } from '@fbd/engine';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CADUCIDAD_MS, ServicioAjustes } from '../../src/ajustes/servicio';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { crearRegistradoConColeccion } from '../helpers/economia';
import { esperarEstado } from '../helpers/partidas';
import { avanzarHasta } from '../helpers/torneo';
import { peticion, type UsuarioPrueba } from '../helpers/usuarios';

const leer = (f: string) => (JSON.parse(readFileSync(new URL(`../../../../data/${f}`, import.meta.url), 'utf8')) as { jugadores: Jugador[] }).jugadores;
const REALES = [...leer('core-real.json'), ...leer('cartas-prueba.json')];

describe('identidad de las cartas (spec 011, US4)', () => {
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

  const fijarAjuste = (valor: string) =>
    bd.db.execute(sql`insert into ajustes (clave, valor) values ('identidad_cartas', ${JSON.stringify(valor)}::jsonb)
                      on conflict (clave) do update set valor = excluded.valor, actualizado_en = now()`);
  const identidadDe = async (id: string) => (await bd.db.execute<{ identidad: string }>(sql`select identidad from partidas where id = ${id}`)).rows[0]!.identidad;
  async function crear(u: UsuarioPrueba): Promise<string> {
    const r = await peticion(srv.url, '/api/partidas', { cookie: u.cookie, cuerpo: { modo: 'liga', numParticipantes: 4, plazasHumanas: 1 } });
    expect(r.estado, JSON.stringify(r.cuerpo)).toBe(201);
    return r.cuerpo.id as string;
  }
  /** ¿Aparece el nombre de alguna carta real en el texto? */
  const conNombresReales = (texto: string) => REALES.filter((j) => texto.includes(`"${j.nombre_carta}"`) || texto.includes(`"${j.apellidos}"`));

  it('caché de 30 s: sin fila «real»; el valor nuevo llega al caducar, sin reiniciar (T058)', async () => {
    let ahora = 0;
    const ajustes = new ServicioAjustes(bd.db, () => ahora);
    expect(await ajustes.identidadCartas()).toBe('real');
    await fijarAjuste('alternativa');
    expect(await ajustes.identidadCartas()).toBe('real');
    ahora += CADUCIDAD_MS;
    expect(await ajustes.identidadCartas()).toBe('alternativa');
    expect(ajustes.actual()).toBe('alternativa');
  });

  it('cada partida fija la identidad del ajuste al crearse; la anterior conserva «real»', async () => {
    const u = await crearRegistradoConColeccion(srv);
    const antes = await crear(u);
    await fijarAjuste('alternativa');
    srv.reloj.avanzar(CADUCIDAD_MS);
    const despues = await crear(u);
    expect(await identidadDe(antes)).toBe('real');
    expect(await identidadDe(despues)).toBe('alternativa');
  });

  it('en «alternativa», catálogo, colección, tienda e historial no llevan nombres reales ni las dos identidades', async () => {
    const u = await crearRegistradoConColeccion(srv);
    await fijarAjuste('alternativa');
    srv.reloj.avanzar(CADUCIDAD_MS);
    await bd.db.execute(sql`insert into movimientos_fragmentos (usuario_id, importe, motivo, referencia) values (${u.id}, 50, 'duplicado', '301')`);
    const respuestas = {
      catalogo: await peticion(srv.url, '/api/catalogo/jugadores'),
      ficha: await peticion(srv.url, '/api/catalogo/jugadores/1'),
      coleccion: await peticion(srv.url, '/api/coleccion', { cookie: u.cookie }),
      tienda: await peticion(srv.url, '/api/tienda', { cookie: u.cookie }),
      movimientos: await peticion(srv.url, '/api/fragmentos/movimientos', { cookie: u.cookie }),
    };
    for (const [nombre, r] of Object.entries(respuestas)) {
      expect(r.estado, nombre).toBe(200);
      const texto = JSON.stringify(r.cuerpo);
      expect(conNombresReales(texto).map((j) => j.nombre_carta), nombre).toEqual([]);
      expect(texto, nombre).not.toContain('identidad_alternativa');
      expect(texto, nombre).not.toContain('/cartas/retratos');
    }
    expect(respuestas.ficha.cuerpo).toMatchObject({ nombre_carta: expect.stringMatching(/^(Portero|Defensa|Centrocampista|Delantero) 1$/), historia: '' });
    expect(respuestas.movimientos.cuerpo.movimientos[0].descripcion).toMatch(/^Carta repetida: (Portero|Defensa|Centrocampista|Delantero) 301$/);
    // De vuelta a «real», los nombres vuelven.
    await fijarAjuste('real');
    srv.reloj.avanzar(CADUCIDAD_MS);
    expect((await peticion(srv.url, '/api/catalogo/jugadores/1')).cuerpo.nombre_carta).toBe(REALES.find((j) => j.id === 1)!.nombre_carta);
  });

  it('una partida en «alternativa»: plantilla y partidos sin nombres reales; el mismo partido da lo mismo en los dos modos (FR-019)', async () => {
    const u = await crearRegistradoConColeccion(srv);
    await fijarAjuste('alternativa');
    srv.reloj.avanzar(CADUCIDAD_MS);
    const id = await crear(u);
    await peticion(srv.url, `/api/partidas/${id}/iniciar`, { metodo: 'POST', cookie: u.cookie });
    await esperarEstado(srv, id, u, 'en_torneo', 54_000);

    const alineacion = await peticion(srv.url, `/api/partidas/${id}/alineacion`, { cookie: u.cookie });
    expect(conNombresReales(JSON.stringify(alineacion.cuerpo.plantilla))).toEqual([]);

    // El NPC contra NPC de la primera jornada se resuelve solo al abrirla.
    const c = await srv.gestor.obtenerOError(id);
    let jugado: string | undefined;
    await avanzarHasta(srv, 1000, async () => {
      jugado = (await c.servicios.repoPartidos.resumenesDePartida(id)).find((p) => p.estado === 'finalizado')?.id;
      return jugado !== undefined;
    });
    const fila = (await c.servicios.repoPartidos.obtener(jugado!))!;
    const entrada = fila.entrada as Omit<EntradaPartido, 'parametros'>;
    expect(conNombresReales(JSON.stringify(entrada))).toEqual([]);

    // La misma entrada con las cartas reales (mismas stats y rasgos) da el mismo partido.
    const reales = srv.gestor.servicios.catalogo.enVersion(c.partida.versionCatalogo);
    const conReales = (e: EntradaPartido['local']) => ({
      ...e,
      titulares: e.titulares.map((t) => ({ ...t, jugador: reales.jugador(t.jugador.id) })),
      suplentes: e.suplentes.map((j) => reales.jugador(j.id)),
    });
    const jugar = (e: Omit<EntradaPartido, 'parametros'>) => {
      let estado: EstadoMotor = crearPartido({ ...e, parametros: parametrosPorVersion(fila.versionParametros) } as EntradaPartido);
      for (const d of fila.decisiones as DecisionRegistrada[]) aplicarDecision(estado, d);
      for (let i = 0; i < 5000 && estado.fase !== 'finalizado'; i++) estado = avanzar(estado, 'parte').estado;
      return { marcador: estado.marcador, eventos: estado.eventos.map((ev) => ({ ...ev })) };
    };
    const alternativa = jugar(entrada);
    const real = jugar({ ...entrada, local: conReales(entrada.local), visitante: conReales(entrada.visitante) });
    expect(real).toEqual(alternativa);
    expect(alternativa.marcador).toEqual(fila.marcador);
  });
});
