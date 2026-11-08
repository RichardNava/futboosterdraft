/**
 * Perfil de los usuarios registrados (spec 003, data-model §5): la última modalidad usada (US3) y, desde la
 * migración 0008, el nombre de equipo y las equipaciones por defecto (US11). Los invitados no tienen perfil.
 */
import { eq, sql } from 'drizzle-orm';
import { MODO_INCIDENCIAS_POR_DEFECTO, type Equipaciones, type ModoIncidencias, type ModoSimulacion, type PreferenciasSobre } from '@fbd/domain';

/** Aspecto guardado en el perfil (specs 011 y 012): escudo, sobres, celebración y modo de incidencias. */
export type AspectoGuardado = { escudo: string | null; celebracion: string | null; modoIncidencias: ModoIncidencias } & PreferenciasSobre;
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

  /**
   * Aspecto (spec 011, data-model §4): escudo elegido (null = asignado) y preferencias de sobre, tal como están
   * guardados; quien llama descarta los ids que ya no estén disponibles. `forUpdate` bloquea la fila (carrusel).
   */
  async obtenerAspecto(usuarioId: string, ejecutor: Ejecutor = this.db, forUpdate = false): Promise<AspectoGuardado> {
    const consulta = ejecutor
      .select({
        escudo: perfilesUsuario.escudo,
        sobreFavorito: perfilesUsuario.sobreFavorito,
        sobreCarrusel: perfilesUsuario.sobreCarrusel,
        sobresMarcados: perfilesUsuario.sobresMarcados,
        sobreBaraja: perfilesUsuario.sobreBaraja,
        sobreUltimo: perfilesUsuario.sobreUltimo,
        celebracion: perfilesUsuario.celebracion,
        modoIncidencias: perfilesUsuario.modoIncidencias,
      })
      .from(perfilesUsuario)
      .where(eq(perfilesUsuario.usuarioId, usuarioId))
      .limit(1);
    const [fila] = forUpdate ? await consulta.for('update') : await consulta;
    return (
      fila ?? {
        escudo: null,
        sobreFavorito: null,
        sobreCarrusel: false,
        sobresMarcados: [],
        sobreBaraja: [],
        sobreUltimo: null,
        celebracion: null,
        modoIncidencias: MODO_INCIDENCIAS_POR_DEFECTO,
      }
    );
  }

  /** Guarda los campos de aspecto indicados, creando el perfil si no existe. */
  async guardarAspecto(
    usuarioId: string,
    datos: Partial<AspectoGuardado>,
    ahora: number,
    ejecutor: Ejecutor = this.db,
  ): Promise<void> {
    const set = { ...datos, actualizadoEn: new Date(ahora) };
    await ejecutor.insert(perfilesUsuario).values({ usuarioId, ...set }).onConflictDoUpdate({ target: perfilesUsuario.usuarioId, set });
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

  /**
   * Última modalidad en el perfil de varios usuarios, en una consulta (spec 010, R13). Los invitados no tienen
   * perfil y se saltan; si un usuario se repite, manda la última.
   */
  async fijarUltimasModalidades(lista: readonly { usuarioId: string; modalidad: ModoSimulacion }[], ahora: number, ejecutor: Ejecutor = this.db): Promise<void> {
    const ultima = new Map(lista.map((x) => [x.usuarioId, x.modalidad]));
    if (ultima.size === 0) return;
    const valores = sql.join([...ultima].map(([id, m]) => sql`(${id}, ${m})`), sql`, `);
    await ejecutor.execute(sql`
      insert into ${perfilesUsuario} (usuario_id, ultima_modalidad, actualizado_en)
      select v.id, v.m, ${new Date(ahora).toISOString()}::timestamptz
      from (values ${valores}) as v(id, m) join ${usuarios} on ${usuarios.id} = v.id
      where not ${usuarios.isAnonymous}
      on conflict (usuario_id) do update set ultima_modalidad = excluded.ultima_modalidad, actualizado_en = excluded.actualizado_en`);
  }
}
