/** Nombre y equipaciones del equipo (spec 003, US11: FR-042 a FR-047; T111). */
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { iniciarServidorPruebas, type ServidorPruebas } from '../helpers/app';
import { iniciarBdPruebas, type BdPruebas } from '../helpers/bd';
import { bdHasta } from '../helpers/migraciones';
import { crearInvitado, crearRegistrado, peticion, type UsuarioPrueba } from '../helpers/usuarios';

describe('identidad del equipo (T111)', () => {
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

  const equipaciones = { primera: { diseno: 'rayas', colores: ['#ffffff', '#d01010'] }, segunda: { diseno: 'lisa', colores: ['#1030d0'] } };
  const perfil = (u: UsuarioPrueba, nombreEquipo: string | null) =>
    peticion(srv.url, '/api/perfil', { metodo: 'PUT', cookie: u.cookie, cuerpo: { nombreEquipo, equipaciones } });
  const nombres = async (id: string) =>
    (await bd.db.execute<{ nombre_equipo: string }>(sql`select nombre_equipo from participantes where partida_id = ${id} order by unido_en`)).rows.map((r) => r.nombre_equipo);
  const equipacionesDe = async (id: string, usuarioId: string) =>
    (await bd.db.execute<{ equipaciones: unknown }>(sql`select equipaciones from participantes where partida_id = ${id} and usuario_id = ${usuarioId}`)).rows[0]?.equipaciones;

  async function crear(u: UsuarioPrueba, cuerpo: Record<string, unknown> = {}) {
    const r = await peticion(srv.url, '/api/partidas', { cookie: u.cookie, cuerpo: { modo: 'liga', numParticipantes: 4, plazasHumanas: 3, ...cuerpo } });
    expect(r.estado, JSON.stringify(r.cuerpo)).toBe(201);
    return r.cuerpo.id as string;
  }

  it('un registrado con perfil recibe su nombre y sus equipaciones; si el nombre está ocupado, el de por defecto y nombreAjustado', async () => {
    const a = await crearRegistrado(srv.url, 'Ana');
    const b = await crearRegistrado(srv.url, 'Bea');
    await perfil(a, 'Los Halcones');
    await perfil(b, 'LOS HALCONES');
    const id = await crear(a);
    expect((await nombres(id))[0]).toBe('Los Halcones');
    expect(await equipacionesDe(id, a.id)).toEqual(equipaciones);
    await peticion(srv.url, `/api/partidas/${id}/unirse`, { metodo: 'POST', cookie: b.cookie });
    expect(await nombres(id)).toContain('Equipo de Bea');
    expect(await equipacionesDe(id, b.id)).toEqual(equipaciones);
    // La vista de la sala avisa del ajuste.
    const ws = await import('../helpers/clienteWs');
    const cliente = await ws.ClienteWs.conectar(srv.urlWs, id, b.cookie);
    const estado = await cliente.esperar('estado');
    const bea = estado.vista.sala.participantes.find((p: any) => p.nombre === 'Equipo de Bea');
    expect(bea.nombreAjustado).toBe(true);
    await cliente.cerrar();
  });

  it('cambiar el nombre en la partida no cambia el perfil', async () => {
    const a = await crearRegistrado(srv.url, 'Carla');
    await perfil(a, 'Las Águilas');
    const id = await crear(a);
    const r = await peticion(srv.url, `/api/partidas/${id}/nombre-equipo`, { metodo: 'PUT', cookie: a.cookie, cuerpo: { nombre: 'Las Panteras' } });
    expect(r.estado, JSON.stringify(r.cuerpo)).toBe(200);
    expect((await nombres(id))[0]).toBe('Las Panteras');
    expect((await peticion(srv.url, '/api/perfil', { cookie: a.cookie })).cuerpo.nombreEquipo).toBe('Las Águilas');
  });

  it('un invitado recibe «Equipo de {apodo}» y en ninguna partida hay dos nombres iguales (también con NPC)', async () => {
    const g = await crearInvitado(srv.url);
    const id = await crear(g, { plazasHumanas: 1, numParticipantes: 8 });
    const n = await nombres(id);
    const humano = (await bd.db.execute<{ n: string }>(sql`select nombre_equipo as n from participantes where partida_id = ${id} and tipo = 'humano'`)).rows[0]!.n;
    expect(humano).toBe(`Equipo de ${g.apodo}`.slice(0, 24).trim());
    expect(new Set(n.map((x) => x.toLowerCase())).size).toBe(n.length);
  });

  it('un NPC añadido cuando un humano usa el mismo nombre con otras mayúsculas recibe otro', async () => {
    const a = await crearRegistrado(srv.url, 'Dani');
    const id = await crear(a);
    // El humano toma el nombre que el sorteo daría al próximo NPC, en minúsculas.
    const { nombresNPC } = await import('../../src/actores/nombres');
    const { derivarSemilla } = await import('@fbd/domain');
    const semilla = (await bd.db.execute<{ semilla: string }>(sql`select semilla from partidas where id = ${id}`)).rows[0]!.semilla;
    const siguiente = nombresNPC(1, derivarSemilla(semilla, 'npc:1'), new Set())[0]!;
    expect((await peticion(srv.url, `/api/partidas/${id}/nombre-equipo`, { metodo: 'PUT', cookie: a.cookie, cuerpo: { nombre: siguiente.toLowerCase() } })).estado).toBe(200);
    const r = await peticion(srv.url, `/api/partidas/${id}/npc`, { cuerpo: { nivel: 'amateur' }, cookie: a.cookie });
    expect(r.estado, JSON.stringify(r.cuerpo)).toBe(200);
    const n = await nombres(id);
    expect(n).toHaveLength(2);
    expect(n[1]!.toLowerCase()).not.toBe(n[0]!.toLowerCase());
  });
});

describe('migración 0008 (identidad)', () => {
  it('convierte las equipaciones a lisas, renombra los duplicados con sufijo y crea el índice único', async () => {
    const bd = await bdHasta('0007_pantallas_torneo');
    try {
      await bd.db.execute(sql`insert into usuarios (id, apodo, email) values ('u1', 'Ana', 'ana@x.es')`);
      const p = await bd.db.execute<{ id: string }>(
        sql`insert into partidas (anfitrion_id, modo, num_participantes, plazas_humanas, tiempos, semilla) values ('u1', 'liga', 4, 1, '{}'::jsonb, 'abc') returning id`,
      );
      const partidaId = p.rows[0]!.id;
      const v1 = { primera: { principal: '#d01010', secundario: '#ffffff' }, segunda: { principal: '#1030d0', secundario: '#ffffff' } };
      await bd.db.execute(
        sql`insert into participantes (partida_id, tipo, usuario_id, nombre_equipo, equipaciones) values (${partidaId}, 'humano', 'u1', 'Atlético Faro', ${JSON.stringify(v1)}::jsonb)`,
      );
      await bd.db.execute(sql`insert into participantes (partida_id, tipo, nivel_npc, nombre_equipo) values (${partidaId}, 'npc', 'amateur', 'atlético faro')`);
      await bd.completar();
      const filas = await bd.db.execute<{ nombre_equipo: string; equipaciones: unknown }>(sql`select nombre_equipo, equipaciones from participantes order by id`);
      const nombres = filas.rows.map((f) => f.nombre_equipo).sort();
      expect(new Set(nombres.map((n) => n.toLowerCase())).size).toBe(2);
      expect(nombres.some((n) => / 2$/.test(n))).toBe(true);
      expect(filas.rows.find((f) => f.equipaciones)?.equipaciones).toEqual({
        primera: { diseno: 'lisa', colores: ['#d01010', '#ffffff'] },
        segunda: { diseno: 'lisa', colores: ['#1030d0', '#ffffff'] },
      });
      await expect(
        bd.db.execute(sql`insert into participantes (partida_id, tipo, nivel_npc, nombre_equipo) values (${partidaId}, 'npc', 'amateur', 'ATLÉTICO FARO')`),
      ).rejects.toThrow();
      const perfil = await bd.db.execute<{ column_name: string }>(sql`select column_name from information_schema.columns where table_name = 'perfiles_usuario'`);
      expect(perfil.rows.map((c) => c.column_name)).toEqual(expect.arrayContaining(['nombre_equipo', 'equipaciones']));
    } finally {
      await bd.detener();
    }
  });
});
