/**
 * Repositorio de equipo: alineaciones versionadas, dorsales y equipaciones.
 */
import type { Alineacion, Dorsales, Equipaciones } from '@fbd/domain';
import { desc, eq, inArray } from 'drizzle-orm';
import type { BaseDatos } from '../db';
import { alineaciones, participantes, plantillas } from '../esquema/index';

type Tx = Parameters<Parameters<BaseDatos['transaction']>[0]>[0];
type Ejecutor = BaseDatos | Tx;

export interface AlineacionGuardada extends Alineacion {
  version: number;
  confirmadaEn: Date;
  /** Once confirmado del modo duelos: ya no se puede cambiar (spec 005, FR-063a). */
  bloqueada: boolean;
}

function alineacionGuardada(fila: typeof alineaciones.$inferSelect): AlineacionGuardada {
  return {
    formacion: fila.formacion as Alineacion['formacion'],
    titulares: fila.titulares as Alineacion['titulares'],
    suplentes: fila.suplentes,
    tactica: fila.tactica as Alineacion['tactica'],
    lanzadores: fila.lanzadores as Alineacion['lanzadores'],
    ...(fila.colocacion ? { colocacion: fila.colocacion as NonNullable<Alineacion['colocacion']> } : {}),
    version: fila.version,
    confirmadaEn: fila.confirmadaEn,
    bloqueada: fila.bloqueada,
  };
}

/** Alineaciones, dorsales y equipaciones de los participantes. */
export class RepoEquipo {
  constructor(private readonly db: BaseDatos) {}

  /** Última alineación guardada de un participante. */
  async ultimaAlineacion(participanteId: string, ejecutor: Ejecutor = this.db): Promise<AlineacionGuardada | undefined> {
    const fila = (
      await ejecutor
        .select()
        .from(alineaciones)
        .where(eq(alineaciones.participanteId, participanteId))
        .orderBy(desc(alineaciones.version))
        .limit(1)
    )[0];
    return fila && alineacionGuardada(fila);
  }

  /** Última alineación de varios participantes en una consulta (spec 010, R13); sin entrada si no tienen. */
  async ultimasAlineaciones(participanteIds: readonly string[]): Promise<Map<string, AlineacionGuardada>> {
    if (participanteIds.length === 0) return new Map();
    const filas = await this.db
      .selectDistinctOn([alineaciones.participanteId])
      .from(alineaciones)
      .where(inArray(alineaciones.participanteId, [...participanteIds]))
      .orderBy(alineaciones.participanteId, desc(alineaciones.version));
    return new Map(filas.map((f) => [f.participanteId, alineacionGuardada(f)]));
  }

  /** Guarda una alineación nueva y devuelve su versión. */
  async guardarAlineacion(participanteId: string, a: Alineacion, ahora: number, ejecutor: Ejecutor = this.db, bloqueada = false): Promise<number> {
    const anterior = await this.ultimaAlineacion(participanteId, ejecutor);
    const version = (anterior?.version ?? 0) + 1;
    await ejecutor.insert(alineaciones).values({
      participanteId,
      version,
      formacion: a.formacion,
      titulares: a.titulares,
      suplentes: a.suplentes,
      tactica: a.tactica,
      lanzadores: a.lanzadores,
      colocacion: a.colocacion ?? null,
      bloqueada,
      confirmadaEn: new Date(ahora),
    });
    return version;
  }

  /** Dorsales de la plantilla de un participante, si los tiene. */
  async dorsales(participanteId: string, ejecutor: Ejecutor = this.db): Promise<Dorsales | null> {
    const fila = (await ejecutor.select({ d: plantillas.dorsales }).from(plantillas).where(eq(plantillas.participanteId, participanteId)).limit(1))[0];
    return (fila?.d as Dorsales | null | undefined) ?? null;
  }

  /** Dorsales de varios participantes en una consulta (vista del torneo de todos los humanos, spec 010 R7). */
  async dorsalesDeVarios(participanteIds: readonly string[]): Promise<Map<string, Dorsales | null>> {
    const resultado = new Map<string, Dorsales | null>(participanteIds.map((id) => [id, null]));
    if (participanteIds.length === 0) return resultado;
    const filas = await this.db
      .select({ participanteId: plantillas.participanteId, d: plantillas.dorsales })
      .from(plantillas)
      .where(inArray(plantillas.participanteId, [...participanteIds]));
    for (const f of filas) resultado.set(f.participanteId, (f.d as Dorsales | null) ?? null);
    return resultado;
  }

  /** Guarda los dorsales de un participante. */
  async guardarDorsales(participanteId: string, dorsales: Dorsales, ejecutor: Ejecutor = this.db): Promise<void> {
    await ejecutor.update(plantillas).set({ dorsales }).where(eq(plantillas.participanteId, participanteId));
  }

  /** Guarda las equipaciones de un participante. */
  async guardarEquipaciones(participanteId: string, e: Equipaciones, ejecutor: Ejecutor = this.db): Promise<void> {
    await ejecutor.update(participantes).set({ equipaciones: e }).where(eq(participantes.id, participanteId));
  }
}
