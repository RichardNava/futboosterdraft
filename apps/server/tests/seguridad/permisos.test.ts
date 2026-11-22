/**
 * Una prueba de acceso denegado por cada celda «no» de la matriz de FR-041 (spec 017, T078, SC-004), llamando directamente
 * a la API, con el intento en el registro.
 */
import { randomUUID } from 'node:crypto';
import { PERMISOS, puede, ROLES, type Permiso, type Rol } from '@fbd/domain';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { crearInvitado, crearRegistrado, iniciarServidorAtaque, peticion, type ServidorAtaque, type UsuarioPrueba } from './ayudas';

type Llamada = { metodo: string; ruta: string; cuerpo?: unknown };

const motivo = 'Prueba de permisos';
const ID = '00000000-0000-4000-8000-000000000001';

const RUTAS: Record<Exclude<Permiso, 'jugar_partidas' | 'coleccion_tienda_perfil'>, Llamada[]> = {
  entrar_panel: [
    { metodo: 'GET', ruta: '/api/admin/partidas' },
    { metodo: 'GET', ruta: '/api/admin/cuentas' },
  ],
  cerrar_partida: [{ metodo: 'POST', ruta: `/api/admin/partidas/${ID}/cerrar`, cuerpo: { motivo } }],
  suspender_cuentas: [
    { metodo: 'POST', ruta: `/api/admin/cuentas/${ID}/suspender`, cuerpo: { motivo } },
    { metodo: 'POST', ruta: `/api/admin/cuentas/${ID}/reactivar`, cuerpo: { motivo } },
  ],
  cambiar_ajustes: [
    { metodo: 'GET', ruta: '/api/admin/ajustes' },
    { metodo: 'PUT', ruta: '/api/admin/ajustes/identidad_cartas', cuerpo: { valor: 'alternativa', motivo } },
  ],
  premium_cortesia: [{ metodo: 'PUT', ruta: `/api/admin/cuentas/${ID}/premium`, cuerpo: { cortesia: true, motivo } }],
  entregar_fragmentos: [{ metodo: 'POST', ruta: `/api/admin/cuentas/${ID}/fragmentos`, cuerpo: { idEntrega: randomUUID(), cantidad: 100, motivo } }],
  asignar_roles: [{ metodo: 'PUT', ruta: `/api/admin/cuentas/${ID}/rol`, cuerpo: { rol: 'administrador', motivo } }],
  consultar_registro: [{ metodo: 'GET', ruta: '/api/admin/registro' }],
};

const celdasNo = PERMISOS.flatMap((permiso) => ROLES.filter((rol) => !puede(rol, permiso)).map((rol) => ({ permiso, rol })));

describe('matriz de permisos en la API', () => {
  let bd: BdPruebas;
  let s: ServidorAtaque;

  const cuentaCon = async (rol: Rol): Promise<UsuarioPrueba> => {
    if (rol === 'invitado') return crearInvitado(s.url);
    const u = await crearRegistrado(s.url);
    await bd.db.execute(sql`update usuarios set rol = ${rol} where id = ${u.id}`);
    return u;
  };

  beforeAll(async () => {
    bd = await iniciarBdPruebas();
    s = await iniciarServidorAtaque(bd);
  });
  beforeEach(() => bd.limpiar());
  afterAll(async () => {
    await s.cerrar();
    await bd.detener();
  });

  it('SEG-033: la matriz tiene las 25 celdas «no» de FR-041', () => {
    expect(celdasNo).toHaveLength(25);
  });

  it.each(celdasNo)('SEG-033: $rol intenta $permiso', async ({ permiso, rol }) => {
    const u = await cuentaCon(rol);
    if (permiso === 'coleccion_tienda_perfil') {
      for (const ruta of ['/api/coleccion', '/api/tienda', '/api/perfil']) {
        const r = await peticion(s.url, ruta, { cookie: u.cookie });
        expect(r.estado, ruta).toBe(403);
        expect(r.cuerpo.error.codigo, ruta).toBe('SOLO_REGISTRADOS');
      }
      return;
    }
    const llamadas = RUTAS[permiso as keyof typeof RUTAS];
    for (const { metodo, ruta, cuerpo } of llamadas) {
      const r = await peticion(s.url, ruta, { metodo, cookie: u.cookie, ...(cuerpo === undefined ? {} : { cuerpo }) });
      expect(r.estado, ruta).toBe(403);
      expect(r.cuerpo.error.codigo, ruta).toBe('SOLO_ADMINISTRADORES');
    }
    await s.registroAdmin.volcar();
    const filas = await bd.db.execute<{ actor_rol: string; resultado: string; intentos: number }>(
      sql`select actor_rol, resultado, intentos from registro_admin where actor_id = ${u.id} and accion = 'panel.acceso_denegado'`,
    );
    expect(filas.rows).toEqual([{ actor_rol: rol, resultado: 'denegado', intentos: llamadas.length }]);
  });

  it('SEG-033: llamar a la API de administración sin sesión', async () => {
    for (const { metodo, ruta, cuerpo } of Object.values(RUTAS).flat()) {
      const r = await peticion(s.url, ruta, { metodo, ...(cuerpo === undefined ? {} : { cuerpo }) });
      expect(r.estado, ruta).toBe(401);
      expect(r.cuerpo.error.codigo, ruta).toBe('SIN_SESION');
    }
    await s.registroAdmin.volcar();
    const { rows } = await bd.db.execute<{ n: number }>(sql`select count(*)::int as n from registro_admin`);
    expect(rows[0]!.n).toBe(0);
  });

  it('SEG-033: asignarse un rol al registrarse', async () => {
    const email = `${randomUUID()}@pruebas.test`;
    const r = await peticion(s.url, '/api/auth/registro', {
      cuerpo: { email, password: 'contraseña-segura', apodo: 'Atacante', rol: 'administrador', suspendidaEn: null },
    });
    expect(r.estado).toBe(200);
    expect(r.cuerpo.usuario.rol).toBe('jugador');
    const { rows } = await bd.db.execute<{ rol: string }>(sql`select rol from usuarios where email = ${email}`);
    expect(rows[0]!.rol).toBe('jugador');
  });
});
