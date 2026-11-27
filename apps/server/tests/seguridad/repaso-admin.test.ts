/**
 * Ataques de la segunda pasada de la auditoría sobre los roles y el panel (spec 017, T103, FR-007).
 */
import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RelojFalso } from '../../src/programador/reloj';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { crearRegistrado, iniciarServidorAtaque, peticion, type ServidorAtaque, type UsuarioPrueba } from './ayudas';

const motivo = 'Prueba de la segunda pasada';

describe('segunda pasada sobre roles y panel', () => {
  let bd: BdPruebas;
  let s: ServidorAtaque;

  const cuenta = async (rol: 'jugador' | 'betatester' | 'administrador') => {
    const u = await crearRegistrado(s.url);
    await bd.db.execute(sql`update usuarios set rol = ${rol} where id = ${u.id}`);
    return u;
  };
  const administradores = async () => (await bd.db.execute<{ n: number }>(sql`select count(*)::int as n from usuarios where rol = 'administrador'`)).rows[0]!.n;
  const eliminar = (u: UsuarioPrueba) => peticion(s.url, '/api/cuenta', { metodo: 'DELETE', cookie: u.cookie });
  const cerrar = (a: UsuarioPrueba, id: string) => peticion(s.url, `/api/admin/partidas/${id}/cerrar`, { cookie: a.cookie, cuerpo: { motivo } });
  const entregar = (a: UsuarioPrueba, id: string, cantidad: number, idEntrega: string = randomUUID()) =>
    peticion(s.url, `/api/admin/cuentas/${id}/fragmentos`, { cookie: a.cookie, cuerpo: { idEntrega, cantidad, motivo } });
  const crearPartida = async (u: UsuarioPrueba, extra: Record<string, unknown> = {}) => {
    const r = await peticion(s.url, '/api/partidas', { cookie: u.cookie, cuerpo: { modo: 'liga', numParticipantes: 4, ...extra } });
    expect(r.estado).toBe(201);
    return r.cuerpo.id as string;
  };
  const estadoPartida = async (id: string) => (await bd.db.execute<{ estado: string }>(sql`select estado from partidas where id = ${id}`)).rows[0]!.estado;
  const saldo = async (id: string) => (await s.gestor.servicios.economia.leerSaldo(id)).saldo;

  beforeAll(async () => {
    bd = await iniciarBdPruebas();
    s = await iniciarServidorAtaque(bd);
  });
  beforeEach(() => bd.limpiar());
  afterEach(() => vi.restoreAllMocks());
  afterAll(async () => {
    await s.cerrar();
    await bd.detener();
  });

  it('SEG-033: la última cuenta administradora se elimina y deja el juego sin administradores', async () => {
    const a = await cuenta('administrador');
    const r = await eliminar(a);
    expect([r.estado, r.cuerpo.error?.codigo]).toEqual([409, 'ULTIMO_ADMINISTRADOR']);
    expect(await administradores()).toBe(1);
    expect((await peticion(s.url, '/api/me', { cookie: a.cookie })).estado).toBe(200);
    await cuenta('administrador');
    expect((await eliminar(a)).estado).toBe(200);
    expect(await administradores()).toBe(1);
  });

  it('SEG-033: dos administradores eliminan su cuenta a la vez', async () => {
    const [a, b] = [await cuenta('administrador'), await cuenta('administrador')];
    const estados = (await Promise.all([eliminar(a), eliminar(b)])).map((r) => r.estado).sort();
    expect(estados).toEqual([200, 409]);
    expect(await administradores()).toBe(1);
  });

  it('SEG-034: cerrar una partida sin que el cierre quede en el registro', async () => {
    const a = await cuenta('administrador');
    const u = await crearRegistrado(s.url);
    await peticion(s.url, '/api/dev/fragmentos', { cookie: u.cookie, cuerpo: { fragmentos: 100 } });
    await bd.db.execute(sql`insert into ajustes (clave, valor) values ('acceso_niveles_rareza', '"restringido"'::jsonb)`);
    (s.reloj as RelojFalso).avanzar(31_000); // caduca la caché del ajuste
    const id = await crearPartida(u, { nivelRareza: 'rico' });
    expect(await saldo(u.id)).toBe(0);
    await bd.db.execute(sql`alter table registro_admin add constraint prueba_sin_cierre check (accion <> 'partida.cerrar') not valid`);
    try {
      expect((await cerrar(a, id)).estado).toBe(500);
      expect(await estadoPartida(id)).toBe('buscando');
      expect(await saldo(u.id)).toBe(0);
      expect((await bd.db.execute(sql`select 1 from avisos where usuario_id = ${u.id}`)).rows).toHaveLength(0);
    } finally {
      await bd.db.execute(sql`alter table registro_admin drop constraint prueba_sin_cierre`);
    }
    expect((await cerrar(a, id)).estado).toBe(200);
    expect(await estadoPartida(id)).toBe('abandonada');
    expect(await saldo(u.id)).toBe(100);
    const { rows } = await bd.db.execute<{ n: number }>(sql`select count(*)::int as n from registro_admin where accion = 'partida.cerrar' and resultado = 'ok' and objeto_id = ${id}`);
    expect(rows[0]!.n).toBe(1);
  });

  it('SEG-035: una orden de consola retirada se ejecuta igualmente', async () => {
    const u = await crearRegistrado(s.url);
    const id = await crearPartida(u);
    const original = s.gestor.cerrarPorAdmin.bind(s.gestor);
    let soltar!: () => void;
    const espera = new Promise<void>((r) => (soltar = r));
    let avisarDentro!: () => void;
    const dentro = new Promise<void>((r) => (avisarDentro = r));
    vi.spyOn(s.gestor, 'cerrarPorAdmin').mockImplementation(async (...args) => {
      avisarDentro();
      await espera;
      return original(...args);
    });
    const orden = (
      await bd.db.execute<{ id: string }>(sql`insert into ordenes_consola (tipo, datos) values ('partida.cerrar', ${JSON.stringify({ partidaId: id, motivo })}::jsonb) returning id`)
    ).rows[0]!.id;
    await dentro;
    // La consola se cansa de esperar justo cuando el servidor ya la está ejecutando.
    const retirada = bd.db.execute(sql`update ordenes_consola set estado = 'caducada' where id = ${orden} and estado = 'pendiente' returning id`);
    await new Promise((r) => setTimeout(r, 150));
    soltar();
    expect((await retirada).rows).toEqual([]);
    const { rows } = await bd.db.execute<{ estado: string }>(sql`select estado from ordenes_consola where id = ${orden}`);
    expect(rows[0]!.estado).toBe('hecha');
    expect(await estadoPartida(id)).toBe('abandonada');
  });

  it('SEG-036: ocultar qué acción de administración se intentó', async () => {
    const u = await cuenta('jugador');
    const objetivo = randomUUID();
    await peticion(s.url, '/api/admin/cuentas', { cookie: u.cookie });
    for (let i = 0; i < 2; i++) {
      await peticion(s.url, `/api/admin/cuentas/${objetivo}/rol`, { metodo: 'PUT', cookie: u.cookie, cuerpo: { rol: 'administrador', motivo } });
    }
    await s.registroAdmin.volcar();
    const { rows } = await bd.db.execute<{ ruta: string; intentos: number }>(
      sql`select valor_nuevo->>'ruta' as ruta, intentos from registro_admin where actor_id = ${u.id} and accion = 'panel.acceso_denegado' order by 1`,
    );
    expect(rows).toEqual([
      { ruta: 'GET /api/admin/cuentas', intentos: 1 },
      { ruta: 'PUT /api/admin/cuentas/:id/rol', intentos: 2 },
    ]);
  });

  it('SEG-037: repetir una entrega devuelve un saldo distinto del original', async () => {
    const a = await cuenta('administrador');
    const b = await cuenta('betatester');
    const idEntrega = randomUUID();
    expect((await entregar(a, b.id, 1000, idEntrega)).cuerpo.saldo).toBe(1000);
    expect((await entregar(a, b.id, 500)).cuerpo.saldo).toBe(1500);
    const repetida = await entregar(a, b.id, 1000, idEntrega);
    expect(repetida.cuerpo).toEqual({ idEntrega, cantidad: 1000, saldo: 1000 });
    expect(await saldo(b.id)).toBe(1500);
  });

  it('SEG-038: el texto escrito por una cuenta sigue en el registro después de eliminarla', async () => {
    const [a, b] = [await cuenta('administrador'), await cuenta('administrador')];
    const [x, y] = [await cuenta('jugador'), await cuenta('jugador')];
    const cambiar = (actor: UsuarioPrueba, id: string) => peticion(s.url, `/api/admin/cuentas/${id}/rol`, { metodo: 'PUT', cookie: actor.cookie, cuerpo: { rol: 'betatester', motivo } });
    expect((await cambiar(b, x.id)).estado).toBe(200);
    expect((await cambiar(a, y.id)).estado).toBe(200);
    expect((await eliminar(b)).estado).toBe(200);
    const r = await peticion(s.url, '/api/admin/registro?accion=rol.cambiar', { cookie: a.cookie });
    const de = (id: string) => r.cuerpo.entradas.find((e: { objeto: { id: string } }) => e.objeto.id === id);
    expect(de(x.id)).toMatchObject({ actor: { id: b.id, nombre: 'Cuenta eliminada' }, motivo: null, valorNuevo: { rol: 'betatester' }, resultado: 'ok' });
    expect(de(y.id)).toMatchObject({ actor: { id: a.id }, motivo });
  });

  it('SEG-039: los datos de las cuentas del panel quedan en la caché del navegador', async () => {
    const a = await cuenta('administrador');
    for (const ruta of ['/api/admin/cuentas', '/api/admin/partidas', '/api/admin/ajustes', '/api/admin/registro']) {
      const r = await peticion(s.url, ruta, { cookie: a.cookie });
      expect(r.estado, ruta).toBe(200);
      expect(r.respuesta.headers.get('cache-control'), ruta).toBe('no-store');
    }
  });

  it('SEG-040: pedir una carta con un id fuera de rango para tirar la consulta', async () => {
    const u = await crearRegistrado(s.url);
    const id = '3028815426685371253';
    for (const [metodo, ruta, cuerpo] of [
      ['GET', `/api/catalogo/jugadores/${id}`, undefined],
      ['GET', '/api/catalogo/jugadores/2147483648', undefined],
      ['PUT', `/api/coleccion/cartas/${id}`, { activa: false }],
      ['POST', `/api/coleccion/cartas/${id}/desfragmentar`, undefined],
    ] as const) {
      const r = await peticion(s.url, ruta, { metodo, cookie: u.cookie, ...(cuerpo ? { cuerpo } : {}) });
      expect([ruta, r.estado, r.cuerpo.error?.codigo]).toEqual([ruta, 400, 'ID_INVALIDO']);
    }
  });

  it('SEG-000: inyectar SQL en el motivo y en los filtros del panel', async () => {
    const a = await cuenta('administrador');
    const b = await cuenta('jugador');
    const ataque = "x' OR '1'='1' --";
    const r = await peticion(s.url, `/api/admin/cuentas/${b.id}/rol`, { metodo: 'PUT', cookie: a.cookie, cuerpo: { rol: 'betatester', motivo: ataque } });
    expect(r.estado).toBe(200);
    const registro = await peticion(s.url, '/api/admin/registro?accion=rol.cambiar', { cookie: a.cookie });
    expect(registro.cuerpo.entradas.map((e: { motivo: string }) => e.motivo)).toEqual([ataque]);
    for (const filtro of ['q', 'actor', 'objeto']) {
      const ruta = filtro === 'q' ? '/api/admin/cuentas' : '/api/admin/registro';
      const lista = await peticion(s.url, `${ruta}?${filtro}=${encodeURIComponent(ataque)}`, { cookie: a.cookie });
      expect(lista.estado, filtro).toBe(200);
      expect(lista.cuerpo.cuentas ?? lista.cuerpo.entradas, filtro).toEqual([]);
    }
    // La pareja booleana con la que ZAP señala inyección en `motivo`: si se interpretara, las respuestas diferirían.
    const suspender = (m: string) => peticion(s.url, `/api/admin/cuentas/${randomUUID()}/suspender`, { cookie: a.cookie, cuerpo: { motivo: m } });
    const [cierta, falsa] = [await suspender("Escaneo ZAP' AND '1'='1' -- "), await suspender("Escaneo ZAP' AND '1'='2' -- ")];
    expect([cierta.estado, falsa.estado]).toEqual([404, 404]);
    expect(falsa.cuerpo).toEqual(cierta.cuerpo);
  });
});
