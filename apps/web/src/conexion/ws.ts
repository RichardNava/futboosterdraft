/**
 * Cliente WebSocket de una partida (contracts/realtime-protocol.md):
 * - reconexión con espera exponencial; al reconectar, el servidor reenvía `estado`;
 * - corrección del desfase de reloj con `serverTime` (para mostrar cuentas atrás exactas);
 * - envío con `requestId` y espera del `ack` correspondiente.
 */

export type MensajeServidor = { t: string } & Record<string, unknown>;
export type Ack = { t: 'ack'; requestId: string; ok: boolean; error?: { codigo: string; mensaje: string } };

type Oyente = (m: MensajeServidor) => void;

export class ConexionPartida {
  private socket: WebSocket | null = null;
  private intentos = 0;
  private cerradaAMano = false;
  private readonly oyentes = new Set<Oyente>();
  private readonly acksPendientes = new Map<string, (a: Ack) => void>();
  private temporizadorPing: number | undefined;
  private temporizadorReintento: number | undefined;
  /** El servidor rechazó la conexión (sin sesión o sin permiso): ya no se reintenta sola. */
  sinReintento = false;
  /** Diferencia servidor − cliente en ms. */
  desfaseMs = 0;
  conectada = false;
  private readonly oyentesConexion = new Set<(conectada: boolean) => void>();

  constructor(private readonly partidaId: string) {}

  conectar(): void {
    this.cerradaAMano = false;
    this.sinReintento = false;
    window.clearTimeout(this.temporizadorReintento);
    const protocolo = location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(`${protocolo}://${location.host}/ws?partidaId=${encodeURIComponent(this.partidaId)}`);
    this.socket = socket;
    socket.onopen = () => {
      this.intentos = 0;
      this.cambiarConexion(true);
      this.temporizadorPing = window.setInterval(() => this.enviarSinAck({ t: 'ping' }), 25_000);
    };
    socket.onmessage = (evento) => {
      const m = JSON.parse(String(evento.data)) as MensajeServidor;
      if (m.t === 'estado' && typeof m.serverTime === 'string') {
        this.desfaseMs = Date.parse(m.serverTime) - Date.now();
      }
      if (m.t === 'ack') {
        const ack = m as unknown as Ack;
        this.acksPendientes.get(ack.requestId)?.(ack);
        this.acksPendientes.delete(ack.requestId);
      }
      for (const o of this.oyentes) o(m);
    };
    socket.onclose = (evento) => {
      window.clearInterval(this.temporizadorPing);
      // 4401/4403: sin sesión o sin permiso → no tiene sentido reintentar.
      this.sinReintento = evento.code === 4401 || evento.code === 4403;
      this.cambiarConexion(false);
      if (this.cerradaAMano || this.sinReintento) return;
      const espera = Math.min(30_000, 500 * 2 ** this.intentos++);
      this.temporizadorReintento = window.setTimeout(() => this.conectar(), espera);
    };
  }

  cerrar(): void {
    this.cerradaAMano = true;
    window.clearTimeout(this.temporizadorReintento);
    this.socket?.close();
  }

  /** «Reintentar ahora» (spec 004, contracts/ui.md §8): conecta ya, sin esperar al siguiente reintento. */
  reintentarAhora(): void {
    if (this.conectada || this.cerradaAMano) return;
    this.intentos = 0;
    this.conectar();
  }

  /** Hora actual del servidor estimada (ms). */
  ahoraServidor(): number {
    return Date.now() + this.desfaseMs;
  }

  alRecibir(oyente: Oyente): () => void {
    this.oyentes.add(oyente);
    return () => this.oyentes.delete(oyente);
  }

  alCambiarConexion(oyente: (conectada: boolean) => void): () => void {
    this.oyentesConexion.add(oyente);
    return () => this.oyentesConexion.delete(oyente);
  }

  /** Envía un mensaje que cambia estado y espera su `ack`. */
  enviar(mensaje: MensajeServidor): Promise<Ack> {
    const requestId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        reject(new Error('Sin conexión con el servidor'));
        return;
      }
      this.acksPendientes.set(requestId, resolve);
      this.socket.send(JSON.stringify({ ...mensaje, requestId }));
    });
  }

  enviarSinAck(mensaje: MensajeServidor): void {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(mensaje));
  }

  private cambiarConexion(conectada: boolean): void {
    this.conectada = conectada;
    for (const o of this.oyentesConexion) o(conectada);
  }
}
