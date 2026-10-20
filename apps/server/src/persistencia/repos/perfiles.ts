/**
 * Perfil de los usuarios registrados (spec 003, data-model §5): la última modalidad usada (US3) y, desde la
 * migración 0008, el nombre de equipo y las equipaciones por defecto (US11). Los invitados no tienen perfil.
 */
import { and, eq, sql } from 'drizzle-orm';
import type { Equipaciones, ModoSimulacion } from '@fbd/domain';
import type { BaseDatos } from '../db';
import { perfilesUsuario, usuarios } from '../esquema/index';

type Tx = Parameters<Parameters<BaseDatos['transaction']>[0]>[0];
type Ejecutor = BaseDatos | Tx;

export class RepoPerfiles {
  constructor(private readonly db: BaseDatos) {}

  async obtenerUltimaModalidad(usuarioId: string, ejecutor: Ejecutor = this.db): Promise<ModoSimulacion | null> {
    const [fila] = await ejecutor.select({ m: perfilesUsuario.ultimaModalidad }).from(perfilesUsuario).where(eq(perfilesUsuario.usuarioId, usuarioId)).limit(1);
    return (fila?.m as ModoSimulacion | null | undefined) ?? null;
  }

  /** Nombre y equipaciones por defecto (spec 003, FR-042a, FR-045); `null` si no tiene perfil. */
  async obtener(usuarioId: string, ejecutor: Ejecutor = this.db): Promise<{ nombreEquipo: string | null; equipaciones: unknown } | null> {
    const [fila] = await ejecutor
      .select({ nombreEquipo: perfilesUsuario.nombreEquipo, equipaciones: perfilesUsuario.equipaciones })
      .from(perfilesUsuario)
      .where(eq(perfilesUsuario.usuarioId, usuarioId))
      .limit(1);
    return fila ?? null;
  }

  /** Guarda el nombre y las equipaciones por defecto, creando el perfil si no existe; no toca la última modalidad. */
  async guardar(usuarioId: string, datos: { nombreEquipo: string | null; equipaciones: Equipaciones | null }, ahora: number, ejecutor: Ejecutor = this.db): Promise<void> {
    await ejecutor
      .insert(perfilesUsuario)
      .values({ usuarioId, nombreEquipo: datos.nombreEquipo, equipaciones: datos.equipaciones, actualizadoEn: new Date(ahora) })
      .onConflictDoUpdate({
        target: perfilesUsuario.usuarioId,
        set: { nombreEquipo: datos.nombreEquipo, equipaciones: datos.equipaciones, actualizadoEn: sql`excluded.actualizado_en` },
      });
  }

  /** Guarda la última modalidad de un usuario registrado, creando su perfil si no existe. A un invitado no le hace nada. */
  async fijarUltimaModalidad(usuarioId: string, modalidad: ModoSimulacion, ahora: number, ejecutor: Ejecutor = this.db): Promise<void> {
    const [u] = await ejecutor.select({ invitado: usuarios.isAnonymous }).from(usuarios).where(and(eq(usuarios.id, usuarioId))).limit(1);
    if (!u || u.invitado) return;
    await ejecutor
      .insert(perfilesUsuario)
      .values({ usuarioId, ultimaModalidad: modalidad, actualizadoEn: new Date(ahora) })
      .onConflictDoUpdate({ target: perfilesUsuario.usuarioId, set: { ultimaModalidad: modalidad, actualizadoEn: sql`excluded.actualizado_en` } });
  }
}
