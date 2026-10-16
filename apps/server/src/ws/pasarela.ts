/**
 * Pasarela WebSocket (T030; contracts/realtime-protocol.md).
 *
 * - `GET /ws?partidaId=…`, autenticada con la cookie de sesión; solo para participantes de la partida.
 * - Valida cada mensaje entrante con su esquema Zod.
 * - Descarta duplicados por `requestId`: una repetición recibe el mismo `ack` sin repetir el efecto.
 * - Al conectar envía `estado` con la vista filtrada que proporciona la partida.
 * - Implementa `Difusor`: entrega a cada participante solo los mensajes dirigidos a él.
 */
import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import { z, type ZodType } from 'zod';
import type { Difusor, MensajeSaliente } from '../actores/actor';
import type { Auth, UsuarioSesion } from '../auth/auth';
import { usuarioDeLaPeticion } from '../auth/rutas';
import type { Logger } from '../observabilidad/logger';
import type { Metricas } from '../observabilidad/metricas';
import type { AlmacenPeticiones } from '../persistencia/peticiones';
import type { Reloj } from '../programador/reloj';
import { Limitador, LIMITE_WS, type OpcionesLimitador } from '../http/limitador';

export interface ContextoConexion {
  partidaId: string;
  participanteId: string;
  usuario: UsuarioSesion;
}

export type ResultadoComando = { ok: true } | { ok: false; error: { codigo: string; mensaje: string } };

export interface Manejador<T> {
  esquema: ZodType<T>;
  /** `true` si el mensaje cambia estado: lleva requestId, se deduplica y se responde con ack. */
  conAck: boolean;
  manejar(ctx: ContextoConexion, mensaje: T): Promise<ResultadoComando | void>;
}

export interface OpcionesPasarela {
  auth: Auth;
  reloj: Reloj;
  logger: Logger;
  metricas: Metricas;
  peticiones: AlmacenPeticiones;
  /** Devuelve el participante del usuario en la partida, o `undefined` si no participa. */
  resolverParticipante(partidaId: string, usuarioId: string): Promise<string | undefined>;
  /** Instantánea visible para el participante (fase y vista), para el mensaje `estado`. */
  estadoVisible(partidaId: string, participanteId: string): Promise<{ fase: string; vista: unknown }>;
  alConectar?(ctx: ContextoConexion): void;
  alDesconectar?(ctx: ContextoConexion, quedanConexiones: boolean): void;
  /**
   * Orígenes desde los que un navegador puede abrir el WebSocket (la web pública). Un cliente sin
   * cabecera `Origin` no es un navegador y no puede aprovechar la cookie de otra web, así que se admite.
   */
  origenesPermitidos?: readonly string[];
  /** Límite de mensajes por participante (por defecto, `LIMITE_WS`). */
  limite?: OpcionesLimitador;
}

const MensajeEntrante = z.object({ t: z.string().min(1) }).passthrough();
const ConRequestId = z.object({ requestId: z.string().uuid() }).passthrough();

export class Pasarela implements Difusor {
  /** partidaId → participanteId → sockets abiertos (una persona puede tener varias pestañas). */
  private readonly conexiones = new Map<string, Map<string, Set<WebSocket>>>();
  private readonly manejadores = new Map<string, Manejador<unknown>>();

  private readonly limitador: Limitador;

  constructor(private readonly opciones: OpcionesPasarela) {
    this.limitador = new Limitador(opciones.limite ?? LIMITE_WS);
  }

  registrarManejador<T>(tipo: string, manejador: Manejador<T>): void {
    this.manejadores.set(tipo, manejador as Manejador<unknown>);
  }

  enviar(partidaId: string, salida: MensajeSaliente): void {
    const porParticipante = this.conexiones.get(partidaId);
    if (!porParticipante) return;
    const texto = JSON.stringify(salida.mensaje);
    if (salida.destino.tipo === 'todos') {
      for (const sockets of porParticipante.values()) for (const s of sockets) this.enviarTexto(s, texto);
    } else {
      for (const s of porParticipante.get(salida.destino.participanteId) ?? []) this.enviarTexto(s, texto);
    }
  }

  estaConectado(partidaId: string, participanteId: string): boolean {
    return (this.conexiones.get(partidaId)?.get(participanteId)?.size ?? 0) > 0;
  }

  /** Envía a un participante su instantánea actual (p. ej. tras un cambio de fase). */
  async enviarEstado(partidaId: string, participanteId: string): Promise<void> {
    const { fase, vista } = await this.opciones.estadoVisible(partidaId, participanteId);
    this.enviar(partidaId, {
      destino: { tipo: 'participante', participanteId },
      mensaje: { t: 'estado', serverTime: new Date(this.opciones.reloj.ahora()).toISOString(), fase, vista },
    });
  }

  registrarRuta(app: FastifyInstance): void {
    app.get<{ Querystring: { partidaId?: string } }>('/ws', { websocket: true }, async (socket, req) => {
      const partidaId = req.query.partidaId;
      const origen = req.headers.origin;
      if (origen && this.opciones.origenesPermitidos && !this.opciones.origenesPermitidos.includes(origen)) {
        return socket.close(4403, 'ORIGEN_NO_PERMITIDO');
      }
      const usuario = await usuarioDeLaPeticion(this.opciones.auth, req).catch(() => undefined);
      if (!usuario) return socket.close(4401, 'SIN_SESION');
      if (!partidaId) return socket.close(4400, 'FALTA_PARTIDA');
      const participanteId = await this.opciones.resolverParticipante(partidaId, usuario.id);
      if (!participanteId) return socket.close(4403, 'NO_PARTICIPA');

      const ctx: ContextoConexion = { partidaId, participanteId, usuario };
      this.anadir(ctx, socket);
      this.opciones.alConectar?.(ctx);

      socket.on('message', (datos) => {
        void this.procesar(ctx, socket, datos.toString()).catch((err: unknown) => {
          this.opciones.logger.error({ err, partidaId }, 'Error procesando mensaje WebSocket');
          this.enviarTexto(socket, JSON.stringify({ t: 'error', codigo: 'ERROR_INTERNO', mensaje: 'Error interno' }));
        });
      });
      // Un cliente que cierra a mitad de un envío (p. ej. al cambiar de pantalla) no es un error del servidor.
      socket.on('error', (err) => this.opciones.logger.debug({ err, partidaId }, 'Error de socket WebSocket'));
      socket.on('close', () => {
        this.quitar(ctx, socket);
        this.opciones.metricas.desconexionesTotal.inc();
        this.opciones.alDesconectar?.(ctx, this.estaConectado(partidaId, participanteId));
      });

      await this.enviarEstado(partidaId, participanteId);
    });
  }

  private async procesar(ctx: ContextoConexion, socket: WebSocket, texto: string): Promise<void> {
    if (!this.limitador.permitir(`${ctx.partidaId}:${ctx.participanteId}`)) {
      return this.error(socket, 'DEMASIADOS_MENSAJES', 'Demasiados mensajes; espera un momento');
    }
    let crudo: unknown;
    try {
      crudo = JSON.parse(texto);
    } catch {
      return this.error(socket, 'JSON_INVALIDO', 'El mensaje no es JSON válido');
    }
    const base = MensajeEntrante.safeParse(crudo);
    if (!base.success) return this.error(socket, 'MENSAJE_INVALIDO', 'Falta el campo "t"');
    if (base.data.t === 'ping') return this.enviarTexto(socket, JSON.stringify({ t: 'pong' }));

    const manejador = this.manejadores.get(base.data.t);
    if (!manejador) return this.error(socket, 'TIPO_DESCONOCIDO', `Tipo de mensaje desconocido: ${base.data.t}`);

    let requestId: string | undefined;
    if (manejador.conAck) {
      const r = ConRequestId.safeParse(crudo);
      if (!r.success) return this.error(socket, 'FALTA_REQUEST_ID', 'El mensaje necesita un requestId (UUID)');
      requestId = r.data.requestId;
      const previo = await this.opciones.peticiones.obtener(ctx.partidaId, requestId);
      if (previo) return this.enviarTexto(socket, JSON.stringify(previo));
    }

    const mensaje = manejador.esquema.safeParse(crudo);
    if (!mensaje.success) {
      const error = { codigo: 'MENSAJE_INVALIDO', mensaje: mensaje.error.issues.map((i) => i.message).join('; ') };
      if (requestId) return this.responderAck(ctx, socket, requestId, { ok: false, error });
      return this.error(socket, error.codigo, error.mensaje);
    }

    const resultado = (await manejador.manejar(ctx, mensaje.data)) ?? { ok: true as const };
    if (requestId) await this.responderAck(ctx, socket, requestId, resultado);
  }

  private async responderAck(ctx: ContextoConexion, socket: WebSocket, requestId: string, r: ResultadoComando) {
    const ack = r.ok ? { t: 'ack', requestId, ok: true } : { t: 'ack', requestId, ok: false, error: r.error };
    await this.opciones.peticiones.guardar(ctx.partidaId, requestId, ack);
    this.enviarTexto(socket, JSON.stringify(ack));
  }

  private error(socket: WebSocket, codigo: string, mensaje: string): void {
    this.enviarTexto(socket, JSON.stringify({ t: 'error', codigo, mensaje }));
  }

  private enviarTexto(socket: WebSocket, texto: string): void {
    if (socket.readyState === socket.OPEN) socket.send(texto, () => undefined);
  }

  private anadir(ctx: ContextoConexion, socket: WebSocket): void {
    let porParticipante = this.conexiones.get(ctx.partidaId);
    if (!porParticipante) this.conexiones.set(ctx.partidaId, (porParticipante = new Map()));
    let sockets = porParticipante.get(ctx.participanteId);
    if (!sockets) porParticipante.set(ctx.participanteId, (sockets = new Set()));
    sockets.add(socket);
  }

  private quitar(ctx: ContextoConexion, socket: WebSocket): void {
    const porParticipante = this.conexiones.get(ctx.partidaId);
    const sockets = porParticipante?.get(ctx.participanteId);
    sockets?.delete(socket);
    if (sockets && sockets.size === 0) porParticipante?.delete(ctx.participanteId);
    if (porParticipante && porParticipante.size === 0) this.conexiones.delete(ctx.partidaId);
  }
}
