/**
 * Nivel de rareza con el acceso `restringido`: cobro único e idempotente, saldo insuficiente, invitados, premium de
 * cortesía, pool insuficiente y devolución (spec 013, US3 paso b; FR-019, FR-020, FR-033).
 */
import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cancelarPartida } from '../../src/actores/sala';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { crearRegistradoConColeccion, fijarSaldo, saldoYSuma } from '../helpers/economia';
import { crearInvitado, peticion, type UsuarioPrueba } from '../helpers/usuarios';

describe('nivel de rareza con acceso restringido', () => {
  let bd: BdPruebas;
  let srv: ServidorPruebas;

  beforeAll(async () => {
    bd = await iniciarBdPruebas();
  });
  beforeEach(async () => {
    await srv?.cerrar();
    await bd.limpiar();
    await bd.db.execute(sql`insert into ajustes (clave, valor) values ('acceso_niveles_rareza', '"restringido"'::jsonb)`);
    srv = await iniciarServidorPruebas(bd);
  });
  afterAll(async () => {
    await srv?.cerrar();
    await bd?.detener();
  });

  const crear = (u: UsuarioPrueba, nivelRareza: string, clave?: string) =>
    peticion(srv.url, '/api/partidas', {
      cookie: u.cookie,
      cuerpo: { modo: 'liga', numParticipantes: 4, nivelRareza },
      ...(clave ? { cabeceras: { 'idempotency-key': clave } } : {}),
    });
  const cobros = async (usuarioId: string) =>
    (await bd.db.execute<{ referencia: string; importe: number }>(
      sql`select referencia, importe from movimientos_fragmentos where usuario_id = ${usuarioId} and motivo in ('nivel_rareza','devolucion_nivel_rareza') order by creado_en`,
    )).rows;

  it('registrado sin pase: Rico cuesta 100, se cobra una vez con la partida de referencia; Moderado es gratis', async () => {
    const u = await crearRegistradoConColeccion(srv);
    await fijarSaldo(bd.db, u.id, 250);
    const niveles = await peticion(srv.url, '/api/partidas/niveles-rareza', { cookie: u.cookie });
    expect(niveles.cuerpo).toMatchObject({ acceso: 'restringido', saldo: 250, premium: { activo: false } });
    expect(niveles.cuerpo.niveles).toContainEqual({ nivel: 'rico', estado: 'pago', coste: 100 });
    expect(niveles.cuerpo.niveles).toContainEqual({ nivel: 'moderado', estado: 'gratis', coste: 0 });

    const r = await crear(u, 'rico');
    expect(r.estado, JSON.stringify(r.cuerpo)).toBe(201);
    expect(r.cuerpo).toMatchObject({ nivelRareza: 'rico', cobroRareza: 100 });
    expect(await cobros(u.id)).toEqual([{ referencia: r.cuerpo.id, importe: -100 }]);
    expect((await crear(u, 'moderado')).cuerpo.cobroRareza).toBeNull();
    const { saldo, suma } = await saldoYSuma(bd.db, u.id);
    expect([saldo, suma]).toEqual([150, 150]);
  });

  it('doble envío a la vez con la misma Idempotency-Key ⇒ una partida y un cobro', async () => {
    const u = await crearRegistradoConColeccion(srv);
    await fijarSaldo(bd.db, u.id, 500);
    const clave = randomUUID();
    const [a, b] = await Promise.all([crear(u, 'abundante', clave), crear(u, 'abundante', clave)]);
    expect([a.estado, b.estado]).toEqual([201, 201]);
    expect(a.cuerpo.id).toBe(b.cuerpo.id);
    expect(await cobros(u.id)).toHaveLength(1);
    const n = await bd.db.execute<{ n: number }>(sql`select count(*)::int as n from partidas where anfitrion_id = ${u.id}`);
    expect(n.rows[0]!.n).toBe(1);
    expect((await saldoYSuma(bd.db, u.id)).saldo).toBe(400);
  });

  it('saldo < 100 ⇒ 422 SALDO_INSUFICIENTE con saldo, precio y lo que falta, y sin partida', async () => {
    const u = await crearRegistradoConColeccion(srv);
    await fijarSaldo(bd.db, u.id, 30);
    const r = await crear(u, 'pobre');
    expect(r.estado).toBe(422);
    expect(r.cuerpo.error).toMatchObject({ codigo: 'SALDO_INSUFICIENTE', detalles: { saldo: 30, precio: 100, faltan: 70 } });
    const n = await bd.db.execute<{ n: number }>(sql`select count(*)::int as n from partidas where anfitrion_id = ${u.id}`);
    expect(n.rows[0]!.n).toBe(0);
  });

  it('invitado: solo Moderado; Rico ⇒ 403 NIVEL_RAREZA_NO_DISPONIBLE', async () => {
    const u = await crearInvitado(srv.url);
    const niveles = await peticion(srv.url, '/api/partidas/niveles-rareza', { cookie: u.cookie });
    expect(niveles.cuerpo.saldo).toBeNull();
    expect(niveles.cuerpo.niveles).toContainEqual({ nivel: 'rico', estado: 'no_disponible', motivo: 'INVITADO' });
    const r = await crear(u, 'rico');
    expect(r.estado).toBe(403);
    expect(r.cuerpo.error.codigo).toBe('NIVEL_RAREZA_NO_DISPONIBLE');
    expect((await crear(u, 'moderado')).estado).toBe(201);
  });

  it('con premium de cortesía, todos gratis', async () => {
    const u = await crearRegistradoConColeccion(srv);
    await bd.db.execute(sql`insert into pases_premium (usuario_id, cortesia) values (${u.id}, true)`);
    const r = await crear(u, 'rico');
    expect(r.estado).toBe(201);
    expect(r.cuerpo.cobroRareza).toBeNull();
    expect(await cobros(u.id)).toEqual([]);
  });

  it('pool que no completa los sobres ⇒ 422 POOL_INSUFICIENTE, sin partida ni cobro', async () => {
    const u = await crearRegistradoConColeccion(srv);
    await fijarSaldo(bd.db, u.id, 500);
    const catalogo = srv.gestor.servicios.catalogo;
    const poco = catalogo.poolPartida({ colecciones: ['core'] }).slice(0, 40);
    const espia = vi.spyOn(catalogo, 'poolPartida').mockReturnValue(poco);
    const r = await crear(u, 'rico');
    espia.mockRestore();
    expect(r.estado).toBe(422);
    expect(r.cuerpo.error.codigo).toBe('POOL_INSUFICIENTE');
    expect(await cobros(u.id)).toEqual([]);
  });

  it('cancelada antes del draft ⇒ se devuelve una sola vez; cambiar el ajuste después no cobra más', async () => {
    const u = await crearRegistradoConColeccion(srv);
    await fijarSaldo(bd.db, u.id, 100);
    const r = await crear(u, 'rico');
    expect(r.estado).toBe(201);
    await bd.db.execute(sql`update ajustes set valor = '"libre"'::jsonb where clave = 'acceso_niveles_rareza'`);
    const c = await srv.gestor.obtenerOError(r.cuerpo.id);
    await c.ejecutar((ctx) => cancelarPartida(c, ctx));
    await c.ejecutar((ctx) => cancelarPartida(c, ctx));
    expect(await srv.gestor.servicios.economia.devolverCobroRareza(r.cuerpo.id)).toBe(false);
    expect(await cobros(u.id)).toEqual([
      { referencia: r.cuerpo.id, importe: -100 },
      { referencia: r.cuerpo.id, importe: 100 },
    ]);
    expect(await saldoYSuma(bd.db, u.id)).toEqual({ saldo: 100, suma: 100 });
  });
});
