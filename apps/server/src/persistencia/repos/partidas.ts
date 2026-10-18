/**
 * Repositorio de partidas y participantes.
 */
import { plazasHumanasEfectivas, type ConfigPartida, type EstadoPartida, type NivelNPC } from '@fbd/domain';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import type { BaseDatos } from '../db';
import { participantes, partidas, usuarios } from '../esquema/index';

export type FilaPartida = typeof partidas.$inferSelect;
export type FilaParticipante = typeof participantes.$inferSelect;
type Tx = Parameters<Parameters<BaseDatos['transaction']>[0]>[0];
type Ejecutor = BaseDatos | Tx;

export class RepoPartidas {
  constructor(private readonly db: BaseDatos) {}

  async crear(
    datos: { anfitrionId: string; config: ConfigPartida; semilla: string; ahora: number },
    ejecutor: Ejecutor = this.db,
  ): Promise<FilaPartida> {
    const { config } = datos;
    const [fila] = await ejecutor
      .insert(partidas)
      .values({
        anfitrionId: datos.anfitrionId,
        modo: config.modo,
        numParticipantes: config.numParticipantes,
        plazasHumanas: plazasHumanasEfectivas(config),
        tipoSimulacion: config.tipoSimulacion,
        plazoJornadaHoras: config.plazoJornadaHoras,
        npcConfig: config.npc,
        tiempos: config.tiempos,
        colecciones: config.colecciones,
        semilla: datos.semilla,
        // La lógica de juego usa siempre el reloj del servidor, nunca la hora de la base de datos.
        creadaEn: new Date(datos.ahora),
        actualizadaEn: new Date(datos.ahora),
      })
      .returning();
    return fila!;
  }

  async obtener(id: string, ejecutor: Ejecutor = this.db): Promise<FilaPartida | undefined> {
    return (await ejecutor.select().from(partidas).where(eq(partidas.id, id)).limit(1))[0];
  }

  async listarPorEstado(estados: EstadoPartida[]): Promise<FilaPartida[]> {
    return this.db.select().from(partidas).where(inArray(partidas.estado, estados)).orderBy(asc(partidas.creadaEn));
  }

  async actualizarEstado(id: string, estado: EstadoPartida, ejecutor: Ejecutor = this.db): Promise<void> {
    await ejecutor.update(partidas).set({ estado, actualizadaEn: new Date() }).where(eq(partidas.id, id));
  }

  async participantes(partidaId: string, ejecutor: Ejecutor = this.db): Promise<FilaParticipante[]> {
    return ejecutor
      .select()
      .from(participantes)
      .where(eq(participantes.partidaId, partidaId))
      // Con la misma hora (misma transacción), los humanos primero: el anfitrión encabeza la lista.
      .orderBy(asc(participantes.unidoEn), asc(participantes.tipo), asc(participantes.id));
  }

  async anadirHumano(
    partidaId: string,
    usuarioId: string,
    nombreEquipo: string,
    ejecutor: Ejecutor = this.db,
  ): Promise<FilaParticipante> {
    const [fila] = await ejecutor
      .insert(participantes)
      .values({ partidaId, tipo: 'humano', usuarioId, nombreEquipo })
      .returning();
    return fila!;
  }

  async anadirNPC(
    partidaId: string,
    nivelNPC: NivelNPC,
    nombreEquipo: string,
    ejecutor: Ejecutor = this.db,
  ): Promise<FilaParticipante> {
    const [fila] = await ejecutor
      .insert(participantes)
      .values({ partidaId, tipo: 'npc', nivelNPC, nombreEquipo })
      .returning();
    return fila!;
  }

  async asignarAsientos(asientos: { participanteId: string; mesaIndice: number; asiento: number }[], ejecutor: Ejecutor = this.db) {
    for (const a of asientos) {
      await ejecutor
        .update(participantes)
        .set({ mesaIndice: a.mesaIndice, asiento: a.asiento })
        .where(eq(participantes.id, a.participanteId));
    }
  }

  /** Un humano que abandona pasa a estar controlado por un NPC intermedio. */
  async pasarANPC(participanteId: string): Promise<void> {
    await this.db.update(participantes).set({ controladoPorNPC: true, nivelNPC: 'intermedio' }).where(eq(participantes.id, participanteId));
  }

  async participanteDeUsuario(partidaId: string, usuarioId: string): Promise<FilaParticipante | undefined> {
    return (
      await this.db
        .select()
        .from(participantes)
        .where(and(eq(participantes.partidaId, partidaId), eq(participantes.usuarioId, usuarioId)))
        .limit(1)
    )[0];
  }

  /** Apodos de los usuarios humanos, para mostrar nombres. */
  async apodos(usuarioIds: string[]): Promise<Map<string, string>> {
    if (usuarioIds.length === 0) return new Map();
    const filas = await this.db.select({ id: usuarios.id, apodo: usuarios.name }).from(usuarios).where(inArray(usuarios.id, usuarioIds));
    return new Map(filas.map((f) => [f.id, f.apodo]));
  }

  /** Al registrarse un invitado, sus participaciones pasan al nuevo usuario. */
  async transferirParticipaciones(deUsuarioId: string, aUsuarioId: string): Promise<void> {
    await this.db.update(participantes).set({ usuarioId: aUsuarioId }).where(eq(participantes.usuarioId, deUsuarioId));
    await this.db.update(partidas).set({ anfitrionId: aUsuarioId }).where(eq(partidas.anfitrionId, deUsuarioId));
  }

  /** Todas las partidas de un usuario con su participante, de la más reciente a la más antigua («Mis partidas»). */
  async partidasDeUsuario(usuarioId: string): Promise<{ partida: FilaPartida; participanteId: string }[]> {
    return this.db
      .select({ partida: partidas, participanteId: participantes.id })
      .from(partidas)
      .innerJoin(participantes, eq(participantes.partidaId, partidas.id))
      .where(eq(participantes.usuarioId, usuarioId))
      .orderBy(desc(partidas.actualizadaEn));
  }

  async partidasActivasDeUsuario(usuarioId: string): Promise<FilaPartida[]> {
    const filas = await this.db
      .select({ partida: partidas })
      .from(partidas)
      .innerJoin(participantes, eq(participantes.partidaId, partidas.id))
      .where(and(eq(participantes.usuarioId, usuarioId), inArray(partidas.estado, ['buscando', 'en_draft', 'en_torneo'])));
    return filas.map((f) => f.partida);
  }
}
