/**
 * Controlador de una partida: su estado en memoria y su actor (research R4).
 *
 * Todo cambio de estado pasa por `ejecutar`, que lo encola en el actor de la partida. La lógica de
 * cada fase vive en `sala.ts` y `draft.ts`.
 */
import type { MesaPersistida } from '../persistencia/repos/draft';
import type { FilaParticipante, FilaPartida } from '../persistencia/repos/partidas';
import { ActorPartida, type ContextoComando } from './actor';
import type { PartidoEnCurso } from './partidoRapido';
import type { Alineacion, Baja, EstadoTorneo } from '@fbd/domain';
import type { ServiciosPartida } from './servicios';

export class ControladorPartida {
  readonly actor: ActorPartida;
  partida: FilaPartida;
  participantes: FilaParticipante[];
  /** usuarioId → apodo. */
  apodos: Map<string, string>;
  mesas: MesaPersistida[] = [];
  anfitrionEsInvitado: boolean;
  /** Bajas activas por participante (lesiones y sanciones); se conecta con el torneo (US4). */
  bajasActivas?: (participanteId: string) => Set<number>;
  /** Si el participante está jugando un partido ahora mismo (US3). */
  partidoEnCurso?: (participanteId: string) => boolean;
  /** Participantes humanos sin ninguna conexión abierta, con el instante en que se desconectaron. */
  readonly desconectados = new Map<string, number>();
  /** Partidos en juego (o recién terminados) de la jornada actual. */
  readonly partidosEnCurso = new Map<string, PartidoEnCurso>();
  /** Jornada abierta: sus partidos y su plazo (null con un solo humano, research R9). */
  jornada: {
    numero: number;
    partidoIds: string[];
    cruces: { partidoId: string; local: string; visitante: string }[];
    venceEn: number | null;
  } | null = null;
  /** Se llama al terminar cada partido, antes de anunciarlo: el torneo registra el resultado y devuelve las bajas nuevas. */
  alTerminarPartido?: (ctx: ContextoComando, p: PartidoEnCurso) => Promise<Baja[]>;
  /** Dorsales dados al empezar un partido que se resolvió sin el participante (aviso `dorsal_asignado`). */
  alAsignarDorsales?: (participanteId: string, asignados: { jugadorId: number; dorsal: number }[]) => Promise<void>;
  /** Se llama después de anunciar el final: el torneo cierra la jornada y abre la siguiente. */
  trasTerminarPartido?: (ctx: ContextoComando, p: PartidoEnCurso) => Promise<void>;
  /** Estado del torneo (null hasta que termina el draft). */
  torneo: EstadoTorneo | null = null;
  /**
   * Alineación automática por participante y conjunto de bajas: la plantilla no cambia tras el draft, y
   * calcularla en cada partido era de lo más caro con carga (T140).
   */
  readonly autoAlineaciones = new Map<string, { bajas: string; alineacion: Alineacion }>();
  /** Crea el torneo y abre la primera jornada (las pruebas pueden sustituirlo para fijar los cruces). */
  programarPrimeraJornada?: (ctx: ContextoComando) => Promise<void>;

  constructor(
    readonly servicios: ServiciosPartida,
    datos: {
      partida: FilaPartida;
      participantes: FilaParticipante[];
      apodos: Map<string, string>;
      anfitrionEsInvitado: boolean;
      mesas?: MesaPersistida[];
    },
  ) {
    this.partida = datos.partida;
    this.participantes = datos.participantes;
    this.apodos = datos.apodos;
    this.anfitrionEsInvitado = datos.anfitrionEsInvitado;
    this.mesas = datos.mesas ?? [];
    this.actor = new ActorPartida(datos.partida.id, servicios.difusor);
  }

  get id(): string {
    return this.partida.id;
  }

  get partidaId(): string {
    return this.partida.id;
  }

  ejecutar<T>(comando: (ctx: ContextoComando) => Promise<T> | T): Promise<T> {
    return this.actor.ejecutar(comando);
  }

  cerrar(): void {
    this.cancelarTemporizadores();
    this.actor.cerrar();
  }

  clave(nombre: string): string {
    return `${this.partida.id}:${nombre}`;
  }

  /** Cancela todos los temporizadores de esta partida. */
  cancelarTemporizadores(): void {
    const t = this.servicios.temporizadores;
    t.cancelar(this.clave('busqueda'));
    for (const m of this.mesas) t.cancelar(this.clave(`turno:${m.indice}`));
    for (const p of this.participantes) t.cancelar(this.clave(`abandono:${p.id}`));
    for (const id of this.partidosEnCurso.keys()) {
      t.cancelar(this.clave(`pausa:${id}`));
      t.cancelar(this.clave(`2d:${id}`));
    }
    if (this.jornada) t.cancelar(this.clave(`preparacion:${this.jornada.numero}`));
  }

  participante(participanteId: string): FilaParticipante | undefined {
    return this.participantes.find((p) => p.id === participanteId);
  }

  participanteDeUsuario(usuarioId: string): FilaParticipante | undefined {
    return this.participantes.find((p) => p.usuarioId === usuarioId);
  }

  humanos(): FilaParticipante[] {
    return this.participantes.filter((p) => p.tipo === 'humano');
  }

  nombreDe(p: FilaParticipante): string {
    return p.nombreEquipo;
  }

  esAnfitrion(usuarioId: string): boolean {
    return this.partida.anfitrionId === usuarioId;
  }

  /** Mesa en la que se sienta un participante. */
  mesaDe(participanteId: string): MesaPersistida | undefined {
    return this.mesas.find((m) => m.mesa.participantes.includes(participanteId));
  }
}
