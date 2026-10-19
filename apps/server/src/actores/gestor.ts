/**
 * Gestor de partidas: crea, carga y rehidrata los controladores, y conecta la autenticación y la
 * pasarela WebSocket con la lógica de cada partida.
 */
import { identidadInicial } from './identidad';
import { randomBytes } from 'node:crypto';
import {
  configPorDefecto,
  derivarSemilla,
  plazasHumanasEfectivas,
  rellenarConNPC,
  validarConfigPartida,
  type ConfigPartida,
  type NivelNPC,
} from '@fbd/domain';
import type { CrearPartida } from '@fbd/protocol';
import { inArray } from 'drizzle-orm';
import type { UsuarioSesion } from '../auth/auth';
import { errores } from '../http/errores';
import { usuarios } from '../persistencia/esquema/index';
import type { FilaPartida } from '../persistencia/repos/partidas';
import { reprogramarTurnos } from './draft';
import { enPartido } from './partidoRapido';
import { engancharTorneo, reprogramarTorneo, type DependenciasTorneo } from './torneo';
import { nombresNPC } from './nombres';
import { ControladorPartida } from './partida';
import { reanudarAlConectar } from './pausa';
import { abandonarPartidaInvitado, alCambiarConexion, programarBusqueda, resumenSala } from './sala';
import type { ServiciosPartida } from './servicios';
import { plantillasVisibles, resumenPartida, vistaEstado } from './vistas';

const ESTADOS_ACTIVOS = ['buscando', 'en_draft', 'en_torneo'] as const;

export class GestorPartidas {
  private readonly controladores = new Map<string, ControladorPartida>();
  /** Dependencias del torneo (avisos); se fijan al componer el servidor. */
  depsTorneo: DependenciasTorneo | null = null;

  constructor(readonly servicios: ServiciosPartida) {}

  private registrar(c: ControladorPartida): ControladorPartida {
    this.controladores.set(c.id, c);
    this.servicios.metricas.partidasActivas.set(this.controladores.size);
    return c;
  }

  private quitar(id: string): void {
    this.controladores.get(id)?.cerrar();
    this.controladores.delete(id);
    this.servicios.metricas.partidasActivas.set(this.controladores.size);
  }

  /** Construye un controlador a partir de la base de datos. */
  private async construir(partida: FilaPartida): Promise<ControladorPartida> {
    const { repoPartidas, repoDraft, repoTorneo, catalogo, db } = this.servicios;
    const participantes = await repoPartidas.participantes(partida.id);
    const ids = [...new Set([partida.anfitrionId, ...participantes.flatMap((p) => (p.usuarioId ? [p.usuarioId] : []))])];
    const filas = await db.select({ id: usuarios.id, apodo: usuarios.name, invitado: usuarios.isAnonymous }).from(usuarios).where(inArray(usuarios.id, ids));
    const apodos = new Map(filas.map((f) => [f.id, f.apodo]));
    const anfitrionEsInvitado = filas.find((f) => f.id === partida.anfitrionId)?.invitado ?? false;
    const mesas = await repoDraft.cargarMesas(partida.id, (cartas) => catalogo.medias(cartas));
    const c = new ControladorPartida(this.servicios, { partida, participantes, apodos, anfitrionEsInvitado, mesas });
    c.partidoEnCurso = (pid) => enPartido(c, pid);
    c.torneo = (await repoTorneo.cargar(partida.id)) ?? null;
    if (this.depsTorneo) engancharTorneo(c, this.depsTorneo);
    return c;
  }

  /** Controlador de una partida; las partidas activas quedan en memoria. */
  async obtener(id: string): Promise<ControladorPartida | undefined> {
    const enMemoria = this.controladores.get(id);
    if (enMemoria) return enMemoria;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return undefined;
    const partida = await this.servicios.repoPartidas.obtener(id);
    if (!partida) return undefined;
    const c = await this.construir(partida);
    return (ESTADOS_ACTIVOS as readonly string[]).includes(partida.estado) ? this.registrar(c) : c;
  }

  async obtenerOError(id: string): Promise<ControladorPartida> {
    const c = await this.obtener(id);
    if (!c) throw errores.noEncontrado('PARTIDA_NO_ENCONTRADA', 'No existe esa partida');
    return c;
  }

  /** Crea los controladores de las partidas activas y reprograma sus temporizadores (tras un reinicio). */
  async rehidratar(): Promise<number> {
    const activas = await this.servicios.repoPartidas.listarPorEstado([...ESTADOS_ACTIVOS]);
    for (const partida of activas) {
      if (this.controladores.has(partida.id)) continue;
      const c = this.registrar(await this.construir(partida));
      programarBusqueda(c);
      reprogramarTurnos(c);
      if (this.depsTorneo) await reprogramarTorneo(c, this.depsTorneo);
    }
    return activas.length;
  }

  async crearPartida(usuario: UsuarioSesion, entrada: CrearPartida): Promise<ControladorPartida> {
    const base = configPorDefecto();
    const config: ConfigPartida = {
      ...base,
      modo: entrada.modo,
      numParticipantes: entrada.numParticipantes,
      plazoJornadaHoras: entrada.plazoJornadaHoras ?? base.plazoJornadaHoras,
      npc: entrada.npc ?? [],
      dificultad: entrada.dificultad ?? base.dificultad,
      tiempos: { ...base.tiempos, ...entrada.tiempos },
      // Un invitado solo juega contra la IA: una única plaza humana (FR-000).
      plazasHumanas: usuario.tipo === 'invitado' ? (entrada.plazasHumanas ?? 1) : entrada.plazasHumanas,
    };
    const problemas = validarConfigPartida(config, usuario.tipo);
    const prohibido = problemas.find((p) => p.codigo === 'INVITADO_NO_PERMITIDO');
    if (prohibido) throw errores.prohibido(prohibido.codigo, prohibido.mensaje);
    if (problemas.length) {
      throw errores.regla(problemas[0]!.codigo, problemas[0]!.mensaje, { problemas });
    }

    const { db, repoPartidas } = this.servicios;
    const semilla = randomBytes(16).toString('hex');
    const partidaId = await db.transaction(async (tx) => {
      const partida = await repoPartidas.crear({ anfitrionId: usuario.id, config, semilla, ahora: this.servicios.reloj.ahora() }, tx);
      // Nombre y equipaciones del perfil, o «Equipo de {apodo}» (spec 003, FR-042a).
      const identidad = await identidadInicial(this.servicios, usuario, []);
      await repoPartidas.anadirHumano(partida.id, usuario.id, identidad.nombre, tx, identidad.equipaciones);
      const niveles: NivelNPC[] = config.npc.map((n) => n.nivel);
      // En una partida de invitado, el resto de plazas se rellenan con NPC desde el principio.
      const libres = config.numParticipantes - 1 - niveles.length;
      if (plazasHumanasEfectivas(config) === 1 && libres > 0) {
        niveles.push(...rellenarConNPC(libres, derivarSemilla(semilla, 'relleno-inicial'), config.dificultad));
      }
      const nombres = nombresNPC(niveles.length, derivarSemilla(semilla, 'nombres-iniciales'), new Set([identidad.nombre]));
      for (const [i, nivel] of niveles.entries()) await repoPartidas.anadirNPC(partida.id, nivel, nombres[i]!, tx);
      return partida.id;
    });

    const c = this.registrar(await this.construir((await repoPartidas.obtener(partidaId))!));
    programarBusqueda(c);
    return c;
  }

  /** Resumen de la partida para un usuario (`GET /api/partidas/:id`). */
  resumen(c: ControladorPartida, usuarioId: string | undefined) {
    return resumenPartida(c, usuarioId);
  }

  // ---------- Pasarela WebSocket ----------

  async resolverParticipante(partidaId: string, usuarioId: string): Promise<string | undefined> {
    const c = await this.obtener(partidaId);
    return c?.participanteDeUsuario(usuarioId)?.id;
  }

  async estadoVisible(partidaId: string, participanteId: string): Promise<{ fase: string; vista: unknown }> {
    const c = await this.obtenerOError(partidaId);
    return c.ejecutar(() => vistaEstado(c, participanteId));
  }

  alCambiarConexion(partidaId: string, participanteId: string, conectado: boolean): void {
    const c = this.controladores.get(partidaId);
    if (!c) return;
    alCambiarConexion(c, participanteId, conectado, () => {
      if (c.partida.estado === 'abandonada') this.quitar(c.id);
    });
    // Al volver, lo que se pausó al salir desde la barra sigue con el tiempo que quedaba (research R10). Va en
    // la cola del actor antes que la instantánea `estado` de la conexión, que ya lo ve reanudado.
    if (conectado) {
      void c
        .ejecutar((ctx) => reanudarAlConectar(c, ctx, participanteId))
        .catch((err: unknown) => this.servicios.logger.error({ err, partidaId }, 'Error al reanudar la partida'));
    }
    // Los demás ven en la sala quién está conectado.
    if (c.partida.estado === 'buscando') {
      void c.ejecutar((ctx) => ctx.emitirATodos({ t: 'sala.actualizada', ...resumenSala(c) }));
    }
  }

  // ---------- Autenticación ----------

  /** Un invitado se registra: sus partidas pasan a su nueva cuenta (ya no se abandonan por desconexión). */
  async alVincularInvitado(invitadoId: string, nuevoUsuarioId: string): Promise<void> {
    await this.servicios.repoPartidas.transferirParticipaciones(invitadoId, nuevoUsuarioId);
    for (const c of this.controladores.values()) {
      let cambia = false;
      for (const p of c.participantes) {
        if (p.usuarioId === invitadoId) {
          p.usuarioId = nuevoUsuarioId;
          cambia = true;
        }
      }
      if (c.partida.anfitrionId === invitadoId) {
        c.partida = { ...c.partida, anfitrionId: nuevoUsuarioId };
        c.anfitrionEsInvitado = false;
        cambia = true;
      }
      if (cambia) {
        const apodo = c.apodos.get(invitadoId);
        if (apodo) c.apodos.set(nuevoUsuarioId, apodo);
        for (const p of c.participantes) this.servicios.temporizadores.cancelar(c.clave(`abandono:${p.id}`));
      }
    }
  }

  /** Un invitado que cierra sesión pierde sus partidas (FR-000). */
  async alCerrarSesion(usuario: UsuarioSesion): Promise<void> {
    if (usuario.tipo !== 'invitado') return;
    for (const c of [...this.controladores.values()]) {
      if (c.partida.anfitrionId !== usuario.id) continue;
      await c.ejecutar((ctx) => abandonarPartidaInvitado(c, ctx));
      this.quitar(c.id);
    }
  }

  async plantillasVisibles(c: ControladorPartida) {
    return plantillasVisibles(c);
  }

  get activas(): number {
    return this.controladores.size;
  }

  cerrarTodo(): void {
    for (const c of this.controladores.values()) c.cerrar();
    this.controladores.clear();
  }
}
