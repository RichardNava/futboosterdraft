/**
 * Repositorio de partidas y participantes.
 */
import { plazasHumanasEfectivas, VERSION_CATALOGO_ACTUAL, type ConfigDuelos, type ConfigPartida, type Equipaciones, type EstadoPartida, type ModoSimulacion, type NivelNPC } from '@fbd/domain';
import { errores } from '../../http/errores';
import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';
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
        plazoJornadaHoras: config.plazoJornadaHoras,
        npcConfig: config.npc,
        dificultad: config.dificultad,
        tiempos: config.tiempos,
        colecciones: config.colecciones,
        semilla: datos.semilla,
        // Las partidas nuevas juegan con el catálogo actual (spec 005, FR-036).
        versionCatalogo: VERSION_CATALOGO_ACTUAL,
        configDuelos: config.modo === 'duelos' ? (config.duelos ?? null) : null,
        // La lógica de juego usa siempre el reloj del servidor, nunca la hora de la base de datos.
        creadaEn: new Date(datos.ahora),
        actualizadaEn: new Date(datos.ahora),
      })
      .returning();
    return fila!;
  }

  /** Formación común y Estado de forma del modo duelos (spec 005, FR-061). */
  async guardarConfigDuelos(partidaId: string, duelos: ConfigDuelos, ejecutor: Ejecutor = this.db): Promise<void> {
    await ejecutor.update(partidas).set({ configDuelos: duelos }).where(eq(partidas.id, partidaId));
  }

  /** Última modalidad con la que el participante abrió un partido (spec 003, FR-032). */
  async fijarUltimaModalidad(participanteId: string, modalidad: ModoSimulacion, ejecutor: Ejecutor = this.db): Promise<void> {
    await ejecutor.update(participantes).set({ ultimaModalidad: modalidad }).where(eq(participantes.id, participanteId));
  }

  /** Marca vista la pantalla de derrota o la del campeón (spec 003, FR-041); solo escribe la primera vez. */
  async marcarPantallaVista(participanteId: string, pantalla: 'derrota' | 'campeon', ahora: number, ejecutor: Ejecutor = this.db): Promise<void> {
    const columna = pantalla === 'derrota' ? participantes.derrotaVistaEn : participantes.campeonVistoEn;
    const valor = pantalla === 'derrota' ? { derrotaVistaEn: new Date(ahora) } : { campeonVistoEn: new Date(ahora) };
    await ejecutor.update(participantes).set(valor).where(and(eq(participantes.id, participanteId), isNull(columna)));
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
    equipaciones: Equipaciones | null = null,
  ): Promise<FilaParticipante> {
    const [fila] = await ejecutor
      .insert(participantes)
      .values({ partidaId, tipo: 'humano', usuarioId, nombreEquipo, equipaciones })
      .returning();
    return fila!;
  }

  /** Cambia el nombre del equipo (spec 003, FR-042); la violación del índice único es `NOMBRE_REPETIDO`. */
  async cambiarNombreEquipo(participanteId: string, nombreEquipo: string, ejecutor: Ejecutor = this.db): Promise<void> {
    try {
      await ejecutor.update(participantes).set({ nombreEquipo }).where(eq(participantes.id, participanteId));
    } catch (e) {
      const causa = (e as { cause?: { code?: string; constraint?: string }; code?: string; constraint?: string });
      const pg = causa.cause ?? causa;
      if (pg.code === '23505' && pg.constraint === 'participantes_nombre_equipo_uq') {
        throw errores.conflicto('NOMBRE_REPETIDO', 'Ese nombre ya lo usa otro equipo');
      }
      throw e;
    }
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
