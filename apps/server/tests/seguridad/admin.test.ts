/**
 * Ataques a las reglas de administración (spec 017, T079, FR-042 a FR-050a).
 */
import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { terminarTorneo } from '../../src/actores/torneo';
import { designarPrimerAdministrador } from '../../src/admin/servicio';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { partidaTrasDraft } from '../helpers/partidas';
import type { ServidorPruebas } from '../helpers/app';
import { crearInvitado, crearRegistrado, iniciarServidorAtaque, peticion, type ServidorAtaque, type UsuarioPrueba } from './ayudas';

const motivo = 'Prueba de administración';

describe('reglas de administración', () => {
  let bd: BdPruebas;
  let s: ServidorAtaque;

  const fijarRol = (id: string, rol: string) => bd.db.execute(sql`update usuarios set rol = ${rol} where id = ${id}`);
  const admin = async () => {
    const u = await crearRegistrado(s.url);
    await fijarRol(u.id, 'administrador');
    return u;
  };
  const betatester = async () => {
    const u = await crearRegistrado(s.url);
    await fijarRol(u.id, 'betatester');
    return u;
  };
  const cambiarRol = (actor: UsuarioPrueba, id: string, rol: string) =>
    peticion(s.url, `/api/admin/cuentas/${id}/rol`, { metodo: 'PUT', cookie: actor.cookie, cuerpo: { rol, motivo } });
  const entregar = (actor: UsuarioPrueba, id: string, cantidad: number, idEntrega: string = randomUUID()) =>
    peticion(s.url, `/api/admin/cuentas/${id}/fragmentos`, { cookie: actor.cookie, cuerpo: { idEntrega, cantidad, motivo } });
  const saldo = async (id: string) => (await s.gestor.servicios.economia.leerSaldo(id)).saldo;
  const estadoPartida = async (id: string) => (await bd.db.execute<{ estado: string }>(sql`select estado from partidas where id = ${id}`)).rows[0]!.estado;
  const crearPartida = async (u: UsuarioPrueba) => (await peticion(s.url, '/api/partidas', { cookie: u.cookie, cuerpo: { modo: 'liga', numParticipantes: 4 } })).cuerpo.id as string;

  beforeAll(async () => {
    bd = await iniciarBdPruebas();
    s = await iniciarServidorAtaque(bd);
  });
  beforeEach(() => bd.limpiar());
  afterAll(async () => {
    await s.cerrar();
    await bd.detener();
  });

  it('SEG-000: seguir con el rol anterior tras un cambio', async () => {
    const a = await admin();
    const u = await crearRegistrado(s.url);
    expect((await cambiarRol(a, u.id, 'administrador')).estado).toBe(200);
    expect((await peticion(s.url, '/api/me', { cookie: u.cookie })).cuerpo.usuario.rol).toBe('administrador');
    expect((await peticion(s.url, '/api/admin/ajustes', { cookie: u.cookie })).estado).toBe(200);
    expect((await cambiarRol(a, u.id, 'jugador')).estado).toBe(200);
    expect((await peticion(s.url, '/api/admin/ajustes', { cookie: u.cookie })).estado).toBe(403);
  });

  it('SEG-000: cambiarse el propio rol', async () => {
    const a = await admin();
    const r = await cambiarRol(a, a.id, 'jugador');
    expect(r.estado).toBe(409);
    expect(r.cuerpo.error.codigo).toBe('ROL_PROPIO');
  });

  it('SEG-000: dos administradores se quitan el rol a la vez', async () => {
    const [a, b] = [await admin(), await admin()];
    const estados = (await Promise.all([cambiarRol(a, b.id, 'jugador'), cambiarRol(b, a.id, 'jugador')])).map((r) => r.estado).sort();
    expect(estados).toEqual([200, 403]);
    const { rows } = await bd.db.execute<{ n: number }>(sql`select count(*)::int as n from usuarios where rol = 'administrador'`);
    expect(rows[0]!.n).toBe(1);
  });

  it('SEG-000: dar un rol a un invitado', async () => {
    const a = await admin();
    const i = await crearInvitado(s.url);
    const r = await cambiarRol(a, i.id, 'betatester');
    expect(r.estado).toBe(422);
    expect(r.cuerpo.error.codigo).toBe('INVITADO_SIN_ROL');
  });

  it('SEG-000: nombrar administrador a una cuenta suspendida', async () => {
    const a = await admin();
    const u = await crearRegistrado(s.url);
    await peticion(s.url, `/api/admin/cuentas/${u.id}/suspender`, { cookie: a.cookie, cuerpo: { motivo } });
    const r = await cambiarRol(a, u.id, 'administrador');
    expect(r.estado).toBe(422);
    expect(r.cuerpo.error.codigo).toBe('CUENTA_SUSPENDIDA');
  });

  it('SEG-000: seguir dentro tras ser suspendido', async () => {
    const a = await admin();
    const u = await crearRegistrado(s.url);
    const partidaId = await crearPartida(u);
    const socket = new WebSocket(`${s.urlWs}/ws?partidaId=${partidaId}`, { headers: { cookie: u.cookie } });
    await new Promise((resolve, reject) => {
      socket.once('message', resolve);
      socket.once('error', reject);
    });
    const cierre = new Promise<number | null>((resolve) => {
      const t = setTimeout(() => resolve(null), 5_000);
      socket.once('close', (codigo) => {
        clearTimeout(t);
        resolve(codigo);
      });
    });

    expect((await peticion(s.url, `/api/admin/cuentas/${u.id}/suspender`, { cookie: a.cookie, cuerpo: { motivo } })).estado).toBe(200);
    expect(await cierre).toBe(4401);
    expect((await peticion(s.url, '/api/me', { cookie: u.cookie })).estado).toBe(401);
    const login = await peticion(s.url, '/api/auth/login', { cuerpo: { email: u.email, password: 'contraseña-segura' } });
    expect(login.estado).toBe(403);
    expect(login.cuerpo.error.codigo).toBe('CUENTA_SUSPENDIDA');
    expect(login.respuesta.headers.getSetCookie()).toEqual([]);

    expect((await peticion(s.url, `/api/admin/cuentas/${u.id}/reactivar`, { cookie: a.cookie, cuerpo: { motivo } })).estado).toBe(200);
    expect((await peticion(s.url, '/api/auth/login', { cuerpo: { email: u.email, password: 'contraseña-segura' } })).estado).toBe(200);
  });

  it('SEG-000: una contraseña incorrecta no revela que la cuenta está suspendida', async () => {
    const a = await admin();
    const u = await crearRegistrado(s.url);
    await peticion(s.url, `/api/admin/cuentas/${u.id}/suspender`, { cookie: a.cookie, cuerpo: { motivo } });
    const r = await peticion(s.url, '/api/auth/login', { cuerpo: { email: u.email, password: 'contraseña-mala' } });
    expect(r.estado).toBe(401);
  });

  it('SEG-000: suspenderse a uno mismo, a un administrador o a un invitado', async () => {
    const [a, b] = [await admin(), await admin()];
    const i = await crearInvitado(s.url);
    const propia = await peticion(s.url, `/api/admin/cuentas/${a.id}/suspender`, { cookie: a.cookie, cuerpo: { motivo } });
    expect([propia.estado, propia.cuerpo.error.codigo]).toEqual([409, 'SUSPENSION_PROPIA']);
    for (const id of [b.id, i.id]) {
      const r = await peticion(s.url, `/api/admin/cuentas/${id}/suspender`, { cookie: a.cookie, cuerpo: { motivo } });
      expect([r.estado, r.cuerpo.error.codigo]).toEqual([422, 'NO_SUSPENDIBLE']);
    }
  });

  it('SEG-000: repetir una entrega de fragmentos, también a la vez', async () => {
    const a = await admin();
    const b = await betatester();
    const idEntrega = randomUUID();
    const respuestas = await Promise.all(Array.from({ length: 10 }, () => entregar(a, b.id, 1000, idEntrega)));
    for (const r of respuestas) expect(r.estado).toBe(200);
    expect((await entregar(a, b.id, 1000, idEntrega)).cuerpo).toMatchObject({ idEntrega, cantidad: 1000, saldo: 1000 });
    expect(await saldo(b.id)).toBe(1000);
    const { rows } = await bd.db.execute<{ n: number }>(sql`select count(*)::int as n from registro_admin where accion = 'fragmentos.entregar' and resultado = 'ok'`);
    expect(rows[0]!.n).toBe(1);
  });

  it('SEG-000: reutilizar un idEntrega para otra cantidad u otra cuenta', async () => {
    const a = await admin();
    const [b, c] = [await betatester(), await betatester()];
    const idEntrega = randomUUID();
    await entregar(a, b.id, 1000, idEntrega);
    for (const [id, cantidad] of [[b.id, 2000], [c.id, 1000]] as const) {
      const r = await entregar(a, id, cantidad, idEntrega);
      expect([r.estado, r.cuerpo.error.codigo]).toEqual([409, 'ID_ENTREGA_REUTILIZADO']);
    }
    expect(await saldo(b.id)).toBe(1000);
    expect(await saldo(c.id)).toBe(0);
  });

  it.each([10_001, 0, -5, 1.5])('SEG-000: entregar una cantidad no válida (%s)', async (cantidad) => {
    const a = await admin();
    const b = await betatester();
    const r = await entregar(a, b.id, cantidad);
    expect([r.estado, r.cuerpo.error.codigo]).toEqual([422, 'CANTIDAD_INVALIDA']);
    expect(await saldo(b.id)).toBe(0);
  });

  it('SEG-000: entregar fragmentos a una cuenta sin el rol betatester', async () => {
    const a = await admin();
    const u = await crearRegistrado(s.url);
    const r = await entregar(a, u.id, 100);
    expect([r.estado, r.cuerpo.error.codigo]).toEqual([422, 'NO_BETATESTER']);
    expect(await saldo(u.id)).toBe(0);
  });

  it('SEG-000: cerrar una partida en la que juega el propio administrador', async () => {
    const a = await admin();
    const id = await crearPartida(a);
    const r = await peticion(s.url, `/api/admin/partidas/${id}/cerrar`, { cookie: a.cookie, cuerpo: { motivo } });
    expect([r.estado, r.cuerpo.error.codigo]).toEqual([409, 'PARTICIPA_ADMIN']);
    expect(await estadoPartida(id)).toBe('buscando');
  });

  it('SEG-000: cerrar dos veces una partida', async () => {
    const a = await admin();
    const u = await crearRegistrado(s.url);
    const id = await crearPartida(u);
    expect((await peticion(s.url, `/api/admin/partidas/${id}/cerrar`, { cookie: a.cookie, cuerpo: { motivo } })).estado).toBe(200);
    expect(await estadoPartida(id)).toBe('abandonada');
    const r = await peticion(s.url, `/api/admin/partidas/${id}/cerrar`, { cookie: a.cookie, cuerpo: { motivo } });
    expect([r.estado, r.cuerpo.error.codigo]).toEqual([409, 'PARTIDA_NO_ACTIVA']);
    const avisos = await bd.db.execute<{ tipo: string; texto: string }>(sql`select tipo, texto from avisos where usuario_id = ${u.id}`);
    expect(avisos.rows).toHaveLength(1);
    expect(avisos.rows[0]!.tipo).toBe('partida_cerrada');
    expect(avisos.rows[0]!.texto).not.toContain(motivo);
  });

  it('SEG-000: cobrar premios de una partida cerrada', async () => {
    const a = await admin();
    const { anfitrion: u, partida } = await partidaTrasDraft(s as unknown as ServidorPruebas);
    const id: string = partida.id;
    const c = (await s.gestor.obtener(id))!;
    const humano = c.participanteDeUsuario(u.id)!;
    expect((await peticion(s.url, `/api/admin/partidas/${id}/cerrar`, { cookie: a.cookie, cuerpo: { motivo } })).estado).toBe(200);
    // Un comando que ya estaba en la cola llega al final del torneo después del cierre.
    c.torneo = { ...c.torneo!, campeon: humano.id };
    const ctx = { partidaId: id, emitirATodos: () => undefined, emitirA: () => undefined, publicar: () => undefined };
    await terminarTorneo(c, ctx, s.gestor.depsTorneo!);
    expect(await estadoPartida(id)).toBe('abandonada');
    expect(await saldo(u.id)).toBe(0);
  });

  it('SEG-000: alterar o borrar el registro de administración', async () => {
    const a = await admin();
    const b = await betatester();
    await entregar(a, b.id, 100);
    await expect(bd.db.execute(sql`update registro_admin set resultado = 'error'`)).rejects.toThrow();
    await expect(bd.db.execute(sql`delete from registro_admin`)).rejects.toThrow();
  });

  it('SEG-000: el registro conserva la acción sin el motivo de una cuenta eliminada', async () => {
    const a = await admin();
    const b = await betatester();
    await entregar(a, b.id, 100);
    expect((await peticion(s.url, '/api/cuenta', { metodo: 'DELETE', cookie: b.cookie })).estado).toBe(200);
    const r = await peticion(s.url, '/api/admin/registro?accion=fragmentos.entregar', { cookie: a.cookie });
    expect(r.cuerpo.entradas).toHaveLength(1);
    expect(r.cuerpo.entradas[0]).toMatchObject({ objeto: { tipo: 'cuenta', id: b.id, nombre: 'Cuenta eliminada' }, motivo: null, resultado: 'ok' });
  });

  it('SEG-000: designar por consola un administrador cuando ya hay uno', async () => {
    const u = await crearRegistrado(s.url);
    await designarPrimerAdministrador(bd.db, u.email!);
    expect((await peticion(s.url, '/api/me', { cookie: u.cookie })).cuerpo.usuario.rol).toBe('administrador');
    const otra = await crearRegistrado(s.url);
    await expect(designarPrimerAdministrador(bd.db, otra.email!)).rejects.toThrow(/ya hay/i);
    expect((await peticion(s.url, '/api/me', { cookie: otra.cookie })).cuerpo.usuario.rol).toBe('jugador');
    const { rows } = await bd.db.execute<{ actor_tipo: string; n: number }>(sql`select actor_tipo, count(*)::int as n from registro_admin where accion = 'rol.cambiar' and resultado = 'ok' group by 1`);
    expect(rows).toEqual([{ actor_tipo: 'consola', n: 1 }]);
  });

  it('SEG-000: ejecutar una orden de consola caducada', async () => {
    const u = await crearRegistrado(s.url);
    const [vieja, nueva] = [await crearPartida(u), await crearPartida(u)];
    const orden = async (partidaId: string, intervalo: string) =>
      (await bd.db.execute<{ id: string }>(
        sql`insert into ordenes_consola (tipo, datos, creada_en) values ('partida.cerrar', ${JSON.stringify({ partidaId, motivo })}::jsonb, now() - ${intervalo}::interval) returning id`,
      )).rows[0]!.id;
    const [caducada, valida] = [await orden(vieja, '61 seconds'), await orden(nueva, '0 seconds')];
    const estadoOrden = async (id: string) => (await bd.db.execute<{ estado: string }>(sql`select estado from ordenes_consola where id = ${id}`)).rows[0]!.estado;
    await expect.poll(() => estadoOrden(valida), { timeout: 5_000, interval: 100 }).toBe('hecha');
    expect(await estadoOrden(caducada)).toBe('caducada');
    expect(await estadoPartida(vieja)).toBe('buscando');
    expect(await estadoPartida(nueva)).toBe('abandonada');
  });

  it('SEG-000: ver datos de juego en la lista de partidas del panel', async () => {
    const a = await admin();
    const u = await crearRegistrado(s.url);
    await crearPartida(u);
    const r = await peticion(s.url, '/api/admin/partidas', { cookie: a.cookie });
    expect(Object.keys(r.cuerpo.partidas[0]).sort()).toEqual(['creadaEn', 'estado', 'humanos', 'id', 'modo', 'participaAdmin', 'participantes']);
  });

  it('SEG-000: cambiar un ajuste a un valor o una clave desconocidos', async () => {
    const a = await admin();
    for (const [clave, estado] of [['identidad_cartas', 422], ['__proto__', 404], ['no_existe', 404]] as const) {
      const r = await peticion(s.url, `/api/admin/ajustes/${clave}`, { metodo: 'PUT', cookie: a.cookie, cuerpo: { valor: 'inventado', motivo } });
      expect(r.estado, clave).toBe(estado);
    }
  });
});
