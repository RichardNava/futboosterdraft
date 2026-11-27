/**
 * Registro de administración (spec 017, FR-047, R18): solo inserción y lectura. Guarda ids, nunca correos ni apodos.
 */
import type { Rol } from '@fbd/domain';
import type { AccionRegistro, EntradaRegistroAdmin, RespuestaRegistroAdmin } from '@fbd/protocol';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import type { UsuarioSesion } from '../auth/auth';
import { ErrorApi } from '../http/errores';
import type { Logger } from '../observabilidad/logger';
import type { BaseDatos } from '../persistencia/db';
import { registroAdmin, usuarios } from '../persistencia/esquema/index';

export type Tx = Parameters<Parameters<BaseDatos['transaction']>[0]>[0];
type Ejecutor = BaseDatos | Tx;

export interface Actor {
  id: string | null;
  tipo: 'cuenta' | 'consola';
  rol: Rol | 'consola';
}

export const ACTOR_CONSOLA: Actor = { id: null, tipo: 'consola', rol: 'consola' };
export const actorDe = (u: UsuarioSesion): Actor => ({ id: u.id, tipo: 'cuenta', rol: u.rol });

export interface EntradaRegistro {
  actor: Actor;
  accion: AccionRegistro;
  objetoTipo?: 'cuenta' | 'partida' | 'ajuste';
  objetoId?: string;
  valorAnterior?: unknown;
  valorNuevo?: unknown;
  motivo?: string | null;
  resultado: 'ok' | 'denegado' | 'error';
  intentos?: number;
}

const fila = (e: EntradaRegistro) => ({
  actorId: e.actor.id,
  actorTipo: e.actor.tipo,
  actorRol: e.actor.rol,
  accion: e.accion,
  objetoTipo: e.objetoTipo ?? null,
  objetoId: e.objetoId ?? null,
  valorAnterior: e.valorAnterior ?? null,
  valorNuevo: e.valorNuevo ?? null,
  motivo: e.motivo ?? null,
  resultado: e.resultado,
  intentos: e.intentos ?? 1,
});

/** Añade una entrada, dentro de la transacción de la acción si se le pasa. */
export async function anotarRegistro(ejecutor: Ejecutor, e: EntradaRegistro): Promise<void> {
  await ejecutor.insert(registroAdmin).values(fila(e));
}

/**
 * Ejecuta una acción en una transacción. Quien la completa anota su entrada `ok` dentro; si se rechaza, la transacción se
 * deshace y el intento queda registrado aparte.
 */
export async function conRegistro<T>(db: BaseDatos, base: Omit<EntradaRegistro, 'resultado'>, accion: (tx: Tx) => Promise<T>): Promise<T> {
  try {
    return await db.transaction(accion);
  } catch (e) {
    const rechazo = e instanceof ErrorApi;
    await anotarRegistro(db, { ...base, valorNuevo: { codigo: rechazo ? e.codigo : 'ERROR_INTERNO' }, resultado: rechazo ? 'denegado' : 'error' }).catch(() => undefined);
    throw e;
  }
}

const ESPERA_VOLCADO_MS = 10_000;
const MAXIMO_PENDIENTES = 500;

/** Lectura del registro y acumulación de los accesos denegados. */
export class RegistroAdmin {
  private readonly denegados = new Map<string, { actorId: string; rol: Rol; ruta: string; intentos: number }>();
  private temporizador: NodeJS.Timeout | null = null;

  constructor(
    private readonly db: BaseDatos,
    private readonly logger: Logger,
  ) {}

  /** Acumula el intento 10 s: el trigger impide incrementar una fila, y así nadie llena la tabla llamando en bucle. */
  denegado(u: UsuarioSesion, ruta: string): void {
    this.acumular(u.id, u.rol, ruta, 1);
    if (this.denegados.size >= MAXIMO_PENDIENTES) void this.volcar();
    else this.programar();
  }

  private acumular(actorId: string, rol: Rol, ruta: string, intentos: number): void {
    const clave = `${actorId}:${rol}:${ruta}`;
    const previo = this.denegados.get(clave);
    this.denegados.set(clave, { actorId, rol, ruta, intentos: (previo?.intentos ?? 0) + intentos });
  }

  private programar(): void {
    if (this.temporizador) return;
    this.temporizador = setTimeout(() => void this.volcar(), ESPERA_VOLCADO_MS);
    this.temporizador.unref();
  }

  /** Inserta lo acumulado, una fila por actor y acción intentada. Si falla, lo conserva para el siguiente intento. */
  async volcar(): Promise<void> {
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = null;
    const lote = [...this.denegados.values()];
    if (!lote.length) return;
    this.denegados.clear();
    try {
      await this.db.insert(registroAdmin).values(
        lote.map((d) => fila({ actor: { id: d.actorId, tipo: 'cuenta', rol: d.rol }, accion: 'panel.acceso_denegado', valorNuevo: { ruta: d.ruta }, resultado: 'denegado', intentos: d.intentos })),
      );
    } catch (err) {
      this.logger.error({ err }, 'No se pudieron guardar los accesos denegados');
      for (const d of lote) this.acumular(d.actorId, d.rol, d.ruta, d.intentos);
      this.programar();
    }
  }

  /** Entradas de la más reciente a la más antigua. */
  async listar(f: { accion?: AccionRegistro | undefined; actor?: string | undefined; objeto?: string | undefined; cursor?: string | undefined; limite: number }): Promise<RespuestaRegistroAdmin> {
    const filas = await this.db
      .select()
      .from(registroAdmin)
      .where(
        and(
          f.accion ? eq(registroAdmin.accion, f.accion) : undefined,
          f.actor ? eq(registroAdmin.actorId, f.actor) : undefined,
          f.objeto ? eq(registroAdmin.objetoId, f.objeto) : undefined,
          f.cursor ? sql`(${registroAdmin.creadoEn}, ${registroAdmin.id}) < (select creado_en, id from registro_admin where id = ${f.cursor}::uuid)` : undefined,
        ),
      )
      .orderBy(desc(registroAdmin.creadoEn), desc(registroAdmin.id))
      .limit(f.limite + 1);
    const pagina = filas.slice(0, f.limite);
    const ids = [...new Set(pagina.flatMap((e) => [e.actorId, e.objetoTipo === 'cuenta' ? e.objetoId : null]).filter((id): id is string => id !== null))];
    const cuentas = ids.length ? await this.db.select({ id: usuarios.id, apodo: usuarios.name }).from(usuarios).where(inArray(usuarios.id, ids)) : [];
    const apodos = new Map(cuentas.map((c) => [c.id, c.apodo]));
    const nombre = (id: string) => apodos.get(id) ?? 'Cuenta eliminada';
    const entradas: EntradaRegistroAdmin[] = pagina.map((e) => ({
      id: e.id,
      actor: { tipo: e.actorTipo, id: e.actorId, nombre: e.actorId ? nombre(e.actorId) : 'Consola', rol: e.actorRol as Rol | 'consola' },
      accion: e.accion as AccionRegistro,
      objeto: e.objetoTipo && e.objetoId ? { tipo: e.objetoTipo, id: e.objetoId, nombre: e.objetoTipo === 'cuenta' ? nombre(e.objetoId) : e.objetoId } : null,
      valorAnterior: e.valorAnterior,
      valorNuevo: e.valorNuevo,
      motivo: e.motivo,
      resultado: e.resultado,
      intentos: e.intentos,
      creadoEn: e.creadoEn.toISOString(),
    }));
    return { entradas, cursor: filas.length > f.limite ? pagina.at(-1)!.id : null };
  }
}
