/**
 * Repositorio del draft: mesas, elecciones y plantillas.
 */
import type { Eleccion, Mesa, Ronda, SobreEnJuego } from '@fbd/domain';
import { asc, eq, inArray } from 'drizzle-orm';
import type { BaseDatos } from '../db';
import { elecciones, mesas, plantillas } from '../esquema/index';

type Tx = Parameters<Parameters<BaseDatos['transaction']>[0]>[0];
type Ejecutor = BaseDatos | Tx;

export interface MesaPersistida {
  id: string;
  indice: number;
  semilla: string;
  mesa: Mesa;
}

export class RepoDraft {
  constructor(private readonly db: BaseDatos) {}

  async crearMesa(
    datos: { partidaId: string; indice: number; semilla: string; mesa: Mesa },
    ejecutor: Ejecutor = this.db,
  ): Promise<string> {
    const [fila] = await ejecutor
      .insert(mesas)
      .values({
        partidaId: datos.partidaId,
        indice: datos.indice,
        semilla: datos.semilla,
        participantes: datos.mesa.participantes,
        ronda: datos.mesa.ronda,
        turno: datos.mesa.turno,
        turnoS: datos.mesa.turnoS,
        venceEn: new Date(datos.mesa.venceEn),
        estado: datos.mesa.estado,
        sobres: datos.mesa.sobres,
      })
      .returning({ id: mesas.id });
    return fila!.id;
  }

  /** Guarda el estado de la mesa tras resolver un turno. */
  async actualizarMesa(mesaId: string, mesa: Mesa, ejecutor: Ejecutor = this.db): Promise<void> {
    await ejecutor
      .update(mesas)
      .set({ ronda: mesa.ronda, turno: mesa.turno, venceEn: new Date(mesa.venceEn), estado: mesa.estado, sobres: mesa.sobres })
      .where(eq(mesas.id, mesaId));
  }

  async guardarElecciones(mesaId: string, nuevas: Eleccion[], ahora: number, ejecutor: Ejecutor = this.db): Promise<void> {
    if (nuevas.length === 0) return;
    await ejecutor.insert(elecciones).values(
      nuevas.map((e) => ({
        mesaId,
        ronda: e.ronda,
        turno: e.turno,
        participanteId: e.participanteId,
        sobreId: e.sobreId,
        jugadorId: e.jugadorId,
        origen: e.origen,
        registradaEn: new Date(ahora),
      })),
    );
  }

  /** Reconstruye las mesas de una partida (rehidratación tras un reinicio). */
  async cargarMesas(partidaId: string, medias: (ids: number[]) => Record<number, number>): Promise<MesaPersistida[]> {
    const filas = await this.db.select().from(mesas).where(eq(mesas.partidaId, partidaId)).orderBy(asc(mesas.indice));
    if (filas.length === 0) return [];
    const todas = await this.db
      .select()
      .from(elecciones)
      .where(inArray(elecciones.mesaId, filas.map((f) => f.id)))
      .orderBy(asc(elecciones.ronda), asc(elecciones.turno), asc(elecciones.registradaEn));
    return filas.map((f) => {
      const sobres = f.sobres as SobreEnJuego[];
      const mesa: Mesa = {
        participantes: f.participantes,
        ronda: f.ronda as Ronda,
        turno: f.turno,
        sobres,
        elecciones: todas
          .filter((e) => e.mesaId === f.id)
          .map((e) => ({
            ronda: e.ronda as Ronda,
            turno: e.turno,
            participanteId: e.participanteId,
            sobreId: e.sobreId,
            jugadorId: e.jugadorId,
            origen: e.origen as Eleccion['origen'],
          })),
        medias: medias(sobres.flatMap((s) => s.cartas)),
        turnoS: f.turnoS,
        venceEn: f.venceEn.getTime(),
        estado: f.estado as Mesa['estado'],
      };
      return { id: f.id, indice: f.indice, semilla: f.semilla, mesa };
    });
  }

  async guardarPlantillas(porParticipante: Record<string, number[]>, ejecutor: Ejecutor = this.db): Promise<void> {
    for (const [participanteId, jugadores] of Object.entries(porParticipante)) {
      await ejecutor.insert(plantillas).values({ participanteId, jugadores }).onConflictDoUpdate({
        target: plantillas.participanteId,
        set: { jugadores },
      });
    }
  }

  async plantillas(participanteIds: string[]): Promise<Map<string, number[]>> {
    if (participanteIds.length === 0) return new Map();
    const filas = await this.db.select().from(plantillas).where(inArray(plantillas.participanteId, participanteIds));
    return new Map(filas.map((f) => [f.participanteId, f.jugadores]));
  }
}
