/**
 * Acciones de administración (spec 017, FR-042 a FR-049, R17, R19): cada cambio y su registro van en la misma transacción.
 * Son funciones sobre la base de datos para que el panel y las órdenes de consola compartan las mismas reglas.
 */
import type { RolAsignable } from '@fbd/domain';
import type { AjusteAdmin, PartidaAdmin, RespuestaCuentasAdmin, RespuestaPartidasAdmin } from '@fbd/protocol';
import { and, asc, count, desc, eq, gt, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import type { GestorPartidas } from '../actores/gestor';
import { AJUSTES_CONOCIDOS, type ClaveAjuste } from '../ajustes/servicio';
import { errores } from '../http/errores';
import type { BaseDatos } from '../persistencia/db';
import { ajustes, participantes, partidas, pasesPremium, saldosFragmentos, sesiones, usuarios } from '../persistencia/esquema/index';
import { ACTOR_CONSOLA, anotarRegistro, conRegistro, type Actor, type Tx } from './registro';

const ESTADOS_ACTIVOS = ['buscando', 'en_draft', 'en_torneo'] as const;

/** Serializa los cambios de rol y suspensión: dos administradores no pueden quitarse el rol a la vez (R17). */
const bloquearRoles = (tx: Tx) => tx.execute(sql`select pg_advisory_xact_lock(hashtextextended('admin-roles', 0))`);

async function leerCuenta(tx: Tx, id: string) {
  const [c] = await tx
    .select({ rol: usuarios.rol, invitado: usuarios.isAnonymous, suspendidaEn: usuarios.suspendidaEn })
    .from(usuarios)
    .where(eq(usuarios.id, id));
  if (!c) throw errores.noEncontrado('CUENTA_NO_ENCONTRADA', 'No existe esa cuenta');
  return c;
}

const administradoresActivos = async (tx: Tx) =>
  (await tx.select({ n: count() }).from(usuarios).where(and(eq(usuarios.rol, 'administrador'), isNull(usuarios.suspendidaEn))))[0]!.n;

/** Cambia el rol de otra cuenta, releyendo actor y objetivo con el bloqueo tomado. */
export function cambiarRol(db: BaseDatos, actor: Actor, id: string, rol: RolAsignable, motivo: string): Promise<{ id: string; rol: RolAsignable }> {
  return conRegistro(db, { actor, accion: 'rol.cambiar', objetoTipo: 'cuenta', objetoId: id, valorNuevo: { rol }, motivo }, async (tx) => {
    await bloquearRoles(tx);
    if (actor.id === id) throw errores.conflicto('ROL_PROPIO', 'No puedes cambiar tu propio rol');
    if (actor.id && (await leerCuenta(tx, actor.id)).rol !== 'administrador') throw errores.prohibido('SOLO_ADMINISTRADORES', 'Esta acción es solo para administradores');
    const objetivo = await leerCuenta(tx, id);
    if (objetivo.invitado) throw errores.regla('INVITADO_SIN_ROL', 'Un invitado no puede tener otro rol');
    if (rol === 'administrador' && objetivo.suspendidaEn) throw errores.regla('CUENTA_SUSPENDIDA', 'Una cuenta suspendida no puede ser administradora');
    if (objetivo.rol === rol) return { id, rol };
    if (objetivo.rol === 'administrador' && (await administradoresActivos(tx)) <= 1) throw errores.conflicto('ULTIMO_ADMINISTRADOR', 'Debe quedar al menos un administrador');
    await tx.update(usuarios).set({ rol }).where(eq(usuarios.id, id));
    await anotarRegistro(tx, { actor, accion: 'rol.cambiar', objetoTipo: 'cuenta', objetoId: id, valorAnterior: { rol: objetivo.rol }, valorNuevo: { rol }, motivo, resultado: 'ok' });
    return { id, rol };
  });
}

/** Suspende una cuenta y termina sus sesiones; las conexiones abiertas caen en la siguiente revisión (≤ 3 s). */
export function suspender(db: BaseDatos, actor: Actor, id: string, motivo: string): Promise<{ id: string; suspendida: true }> {
  return conRegistro(db, { actor, accion: 'cuenta.suspender', objetoTipo: 'cuenta', objetoId: id, motivo }, async (tx) => {
    await bloquearRoles(tx);
    if (actor.id === id) throw errores.conflicto('SUSPENSION_PROPIA', 'No puedes suspender tu propia cuenta');
    const objetivo = await leerCuenta(tx, id);
    if (objetivo.invitado || objetivo.rol === 'administrador') throw errores.regla('NO_SUSPENDIBLE', 'Solo se puede suspender a jugadores y betatesters');
    if (objetivo.suspendidaEn) return { id, suspendida: true };
    await tx.update(usuarios).set({ suspendidaEn: new Date() }).where(eq(usuarios.id, id));
    await tx.delete(sesiones).where(eq(sesiones.userId, id));
    await anotarRegistro(tx, { actor, accion: 'cuenta.suspender', objetoTipo: 'cuenta', objetoId: id, valorAnterior: { suspendida: false }, valorNuevo: { suspendida: true }, motivo, resultado: 'ok' });
    return { id, suspendida: true };
  });
}

/** Levanta la suspensión de una cuenta. */
export function reactivar(db: BaseDatos, actor: Actor, id: string, motivo: string): Promise<{ id: string; suspendida: false }> {
  return conRegistro(db, { actor, accion: 'cuenta.reactivar', objetoTipo: 'cuenta', objetoId: id, motivo }, async (tx) => {
    await bloquearRoles(tx);
    const objetivo = await leerCuenta(tx, id);
    if (!objetivo.suspendidaEn) return { id, suspendida: false };
    await tx.update(usuarios).set({ suspendidaEn: null }).where(eq(usuarios.id, id));
    await anotarRegistro(tx, { actor, accion: 'cuenta.reactivar', objetoTipo: 'cuenta', objetoId: id, valorAnterior: { suspendida: true }, valorNuevo: { suspendida: false }, motivo, resultado: 'ok' });
    return { id, suspendida: false };
  });
}

/** Concede o retira el premium de cortesía (también desde la consola, sin motivo). */
export function cambiarPremium(db: BaseDatos, actor: Actor, id: string, cortesia: boolean, motivo: string | null): Promise<{ id: string; cortesia: boolean }> {
  const accion = cortesia ? 'premium.conceder' : 'premium.retirar';
  return conRegistro(db, { actor, accion, objetoTipo: 'cuenta', objetoId: id, motivo }, async (tx) => {
    if ((await leerCuenta(tx, id)).invitado) throw errores.regla('INVITADO_SIN_PREMIUM', 'Un invitado no puede tener premium');
    const [previo] = await tx.select({ cortesia: pasesPremium.cortesia }).from(pasesPremium).where(eq(pasesPremium.usuarioId, id)).for('update');
    const ahora = new Date();
    await tx.insert(pasesPremium).values({ usuarioId: id, cortesia, actualizadoEn: ahora }).onConflictDoUpdate({ target: pasesPremium.usuarioId, set: { cortesia, actualizadoEn: ahora } });
    await anotarRegistro(tx, { actor, accion, objetoTipo: 'cuenta', objetoId: id, valorAnterior: { cortesia: previo?.cortesia ?? false }, valorNuevo: { cortesia }, motivo, resultado: 'ok' });
    return { id, cortesia };
  });
}

const esClaveAjuste = (clave: string): clave is ClaveAjuste => Object.hasOwn(AJUSTES_CONOCIDOS, clave);

/** Cambia un ajuste conocido; los servidores lo aplican en ≤ 30 s y solo a las partidas nuevas. */
export function cambiarAjuste(db: BaseDatos, actor: Actor, clave: string, valor: string, motivo: string | null): Promise<{ clave: string; valor: string; anterior: unknown }> {
  if (!esClaveAjuste(clave)) throw errores.noEncontrado('AJUSTE_NO_ENCONTRADO', 'No existe ese ajuste');
  return conRegistro(db, { actor, accion: 'ajuste.cambiar', objetoTipo: 'ajuste', objetoId: clave, motivo }, async (tx) => {
    const admitidos: readonly string[] = AJUSTES_CONOCIDOS[clave];
    if (!admitidos.includes(valor)) throw errores.regla('VALOR_NO_ADMITIDO', 'Ese valor no está admitido');
    const [antes] = await tx.select({ valor: ajustes.valor }).from(ajustes).where(eq(ajustes.clave, clave)).for('update');
    const ahora = new Date();
    await tx.insert(ajustes).values({ clave, valor, actualizadoEn: ahora }).onConflictDoUpdate({ target: ajustes.clave, set: { valor, actualizadoEn: ahora } });
    await anotarRegistro(tx, { actor, accion: 'ajuste.cambiar', objetoTipo: 'ajuste', objetoId: clave, valorAnterior: { valor: antes?.valor ?? null }, valorNuevo: { valor }, motivo, resultado: 'ok' });
    return { clave, valor, anterior: antes?.valor };
  });
}

/** Ajustes con su valor vigente, sin la caché de 30 s: quien acaba de cambiar uno lo ve al momento. */
export async function leerAjustes(db: BaseDatos): Promise<AjusteAdmin[]> {
  const filas = await db.select().from(ajustes);
  return Object.entries(AJUSTES_CONOCIDOS).map(([clave, lista]) => {
    const admitidos: readonly string[] = lista;
    const leido = filas.find((f) => f.clave === clave)?.valor;
    return { clave, valor: typeof leido === 'string' && admitidos.includes(leido) ? leido : admitidos[0]!, admitidos: [...admitidos] };
  });
}

/** Cierra una partida: sin premios, con aviso genérico; el motivo queda solo en el registro (FR-049). */
export async function cerrarPartida(db: BaseDatos, gestor: GestorPartidas, actor: Actor, id: string, motivo: string): Promise<{ id: string; estado: 'abandonada' }> {
  const base = { actor, accion: 'partida.cerrar', objetoTipo: 'partida', objetoId: id, motivo } as const;
  let anterior: string;
  try {
    anterior = await gestor.cerrarPorAdmin(id, actor.id);
  } catch (e) {
    await anotarRegistro(db, { ...base, valorNuevo: { codigo: (e as { codigo?: string }).codigo ?? 'ERROR_INTERNO' }, resultado: (e as { codigo?: string }).codigo ? 'denegado' : 'error' }).catch(() => undefined);
    throw e;
  }
  await anotarRegistro(db, { ...base, valorAnterior: { estado: anterior }, valorNuevo: { estado: 'abandonada' }, resultado: 'ok' });
  return { id, estado: 'abandonada' };
}

/** Busca por correo o apodo entre las cuentas registradas. */
export async function listarCuentas(db: BaseDatos, f: { q?: string | undefined; cursor?: string | undefined; limite: number }): Promise<RespuestaCuentasAdmin> {
  const patron = f.q ? `%${f.q.replace(/[\\%_]/g, '\\$&')}%` : null;
  const filas = await db
    .select({
      id: usuarios.id,
      apodo: usuarios.name,
      email: usuarios.email,
      rol: usuarios.rol,
      suspendidaEn: usuarios.suspendidaEn,
      cortesia: pasesPremium.cortesia,
      saldo: saldosFragmentos.saldo,
    })
    .from(usuarios)
    .leftJoin(pasesPremium, eq(pasesPremium.usuarioId, usuarios.id))
    .leftJoin(saldosFragmentos, eq(saldosFragmentos.usuarioId, usuarios.id))
    .where(and(eq(usuarios.isAnonymous, false), patron ? or(ilike(usuarios.email, patron), ilike(usuarios.name, patron)) : undefined, f.cursor ? gt(usuarios.id, f.cursor) : undefined))
    .orderBy(asc(usuarios.id))
    .limit(f.limite + 1);
  const pagina = filas.slice(0, f.limite);
  return {
    cuentas: pagina.map((c) => ({ id: c.id, apodo: c.apodo, email: c.email, rol: c.rol, suspendida: c.suspendidaEn !== null, premiumCortesia: c.cortesia ?? false, saldo: c.saldo ?? 0 })),
    cursor: filas.length > f.limite ? pagina.at(-1)!.id : null,
  };
}

/** Partidas activas, sin cartas, elecciones, alineaciones ni tácticas (FR-024). */
export async function listarPartidas(db: BaseDatos, adminId: string, f: { cursor?: string | undefined; limite: number }): Promise<RespuestaPartidasAdmin> {
  const filas = await db
    .select({
      id: partidas.id,
      estado: partidas.estado,
      modo: partidas.modo,
      creadaEn: partidas.creadaEn,
      participantes: sql<number>`count(${participantes.id})::int`,
      humanos: sql<number>`(count(*) filter (where ${participantes.tipo} = 'humano'))::int`,
      participaAdmin: sql<boolean>`(${partidas.anfitrionId} = ${adminId} or coalesce(bool_or(${participantes.usuarioId} = ${adminId}), false))`,
    })
    .from(partidas)
    .leftJoin(participantes, eq(participantes.partidaId, partidas.id))
    .where(and(inArray(partidas.estado, [...ESTADOS_ACTIVOS]), f.cursor ? sql`(${partidas.creadaEn}, ${partidas.id}) < (select creada_en, id from partidas where id = ${f.cursor}::uuid)` : undefined))
    .groupBy(partidas.id)
    .orderBy(desc(partidas.creadaEn), desc(partidas.id))
    .limit(f.limite + 1);
  const pagina = filas.slice(0, f.limite);
  return {
    partidas: pagina.map((p) => ({ ...p, estado: p.estado as PartidaAdmin['estado'], creadaEn: p.creadaEn.toISOString() })),
    cursor: filas.length > f.limite ? pagina.at(-1)!.id : null,
  };
}

/** Primer administrador, solo por consola y solo si no hay ninguno activo (FR-044). */
export async function designarPrimerAdministrador(db: BaseDatos, email: string): Promise<void> {
  await db.transaction(async (tx) => {
    await bloquearRoles(tx);
    if ((await administradoresActivos(tx)) > 0) throw new Error('Ya hay un administrador activo: asigna el rol desde el panel.');
    const [cuenta] = await tx
      .select({ id: usuarios.id, rol: usuarios.rol, invitado: usuarios.isAnonymous, suspendidaEn: usuarios.suspendidaEn })
      .from(usuarios)
      .where(eq(sql`lower(${usuarios.email})`, email.toLowerCase()));
    if (!cuenta || cuenta.invitado) throw new Error('No hay ninguna cuenta registrada con ese correo.');
    if (cuenta.suspendidaEn) throw new Error('Esa cuenta está suspendida: reactívala antes de designarla.');
    await tx.update(usuarios).set({ rol: 'administrador' }).where(eq(usuarios.id, cuenta.id));
    await anotarRegistro(tx, { actor: ACTOR_CONSOLA, accion: 'rol.cambiar', objetoTipo: 'cuenta', objetoId: cuenta.id, valorAnterior: { rol: cuenta.rol }, valorNuevo: { rol: 'administrador' }, resultado: 'ok' });
  });
}
