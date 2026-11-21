/**
 * Migración 0018 (spec 017, T033): cuentas previas como `jugador`, checks, cascada del pase, índice de entregas,
 * registro inalterable y valores anteriores de los checks recreados.
 */
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bdHasta, type BdParcial } from '../helpers/migraciones';

const MOTIVOS = ['recompensa_torneo', 'desfragmentacion', 'duplicado', 'compra_fragmentos', 'compra_sobre', 'compra_cosmetico', 'compra_coleccion', 'nivel_rareza', 'devolucion_nivel_rareza', 'compra_pase_premium'];
const TIPOS_AVISO = ['jornada_abierta', 'rival_listo', 'plazo_proximo', 'partido_auto_resuelto', 'torneo_terminado', 'dorsal_asignado', 'baja_sustituida'];

describe('migración 0018', () => {
  let bd: BdParcial;
  const ejecutar = (q: ReturnType<typeof sql>) => bd.db.execute(q);
  const usuario = (id: string, invitado = false) =>
    ejecutar(sql`insert into usuarios (id, apodo, email, es_invitado) values (${id}, ${id}, ${`${id}@pruebas.test`}, ${invitado})`);

  beforeAll(async () => {
    bd = await bdHasta('0017_spec016');
    await usuario('previa');
    await ejecutar(sql`insert into pases_premium (usuario_id, fin) values ('previa', now())`);
    await bd.completar();
  });
  afterAll(() => bd.detener());

  it('las cuentas existentes quedan como jugador y sin suspender', async () => {
    const { rows } = await ejecutar(sql`select rol, suspendida_en from usuarios where id = 'previa'`);
    expect(rows[0]).toEqual({ rol: 'jugador', suspendida_en: null });
  });

  it('rechaza roles desconocidos, invitados con rol y administradores suspendidos', async () => {
    await usuario('reglas');
    await usuario('invitado', true);
    await expect(ejecutar(sql`update usuarios set rol = 'dios' where id = 'reglas'`)).rejects.toThrow();
    await expect(ejecutar(sql`update usuarios set rol = 'betatester' where id = 'invitado'`)).rejects.toThrow();
    await expect(ejecutar(sql`update usuarios set suspendida_en = now() where id = 'invitado'`)).rejects.toThrow();
    await expect(ejecutar(sql`update usuarios set rol = 'administrador', suspendida_en = now() where id = 'reglas'`)).rejects.toThrow();
  });

  it('borrar una cuenta arrastra su pase premium', async () => {
    await ejecutar(sql`delete from usuarios where id = 'previa'`);
    const { rows } = await ejecutar(sql`select 1 from pases_premium where usuario_id = 'previa'`);
    expect(rows).toHaveLength(0);
  });

  it('una entrega a betatester no se repite con la misma referencia', async () => {
    await usuario('beta');
    const entrega = () => ejecutar(sql`insert into movimientos_fragmentos (usuario_id, importe, motivo, referencia) values ('beta', 10, 'entrega_betatester', 'entrega-1')`);
    await entrega();
    await expect(entrega()).rejects.toThrow();
  });

  it('conserva los valores anteriores de los checks recreados y admite los nuevos', async () => {
    await usuario('valores');
    for (const [i, motivo] of MOTIVOS.entries()) {
      await ejecutar(sql`insert into movimientos_fragmentos (usuario_id, importe, motivo, referencia) values ('valores', 1, ${motivo}, ${`ref-${i}`})`);
    }
    for (const tipo of [...TIPOS_AVISO, 'partida_cerrada']) {
      await ejecutar(sql`insert into avisos (usuario_id, tipo, texto, creado_en) values ('valores', ${tipo}, 'aviso', now())`);
    }
    await expect(ejecutar(sql`insert into avisos (usuario_id, tipo, texto, creado_en) values ('valores', 'inventado', 'aviso', now())`)).rejects.toThrow();
  });

  it('el registro de administración rechaza cambios y borrados, y admite vaciar el motivo', async () => {
    const { rows } = await ejecutar(
      sql`insert into registro_admin (actor_id, actor_tipo, actor_rol, accion, motivo, resultado) values ('a', 'cuenta', 'administrador', 'rol.cambiar', 'texto', 'ok') returning id`,
    );
    const id = rows[0]!.id as string;
    await expect(ejecutar(sql`update registro_admin set accion = 'otra' where id = ${id}`)).rejects.toThrow();
    await expect(ejecutar(sql`update registro_admin set motivo = null, accion = 'otra' where id = ${id}`)).rejects.toThrow();
    await expect(ejecutar(sql`update registro_admin set motivo = 'otro' where id = ${id}`)).rejects.toThrow();
    await expect(ejecutar(sql`delete from registro_admin where id = ${id}`)).rejects.toThrow();
    await ejecutar(sql`update registro_admin set motivo = null where id = ${id}`);
    const fila = await ejecutar(sql`select motivo, accion from registro_admin where id = ${id}`);
    expect(fila.rows[0]).toEqual({ motivo: null, accion: 'rol.cambiar' });
  });
});
