/**
 * Cliente WebSocket de pruebas: conecta con la cookie de sesión y permite esperar mensajes por tipo.
 */
import { randomUUID } from 'node:crypto';
import WebSocket from 'ws';

type Mensaje = { t: string } & Record<string, any>;

export class ClienteWs {
  readonly recibidos: Mensaje[] = [];
  private esperas: { tipo: string; desde: number; resolver: (m: Mensaje) => void }[] = [];
  private constructor(private readonly socket: WebSocket) {
    socket.on('message', (datos) => {
      const m = JSON.parse(datos.toString()) as Mensaje;
      this.recibidos.push(m);
      const indice = this.recibidos.length - 1;
      this.esperas = this.esperas.filter((e) => {
        if (e.tipo === m.t && indice >= e.desde) {
          e.resolver(m);
          return false;
        }
        return true;
      });
    });
  }

  static conectar(urlWs: string, partidaId: string, cookie: string): Promise<ClienteWs> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(`${urlWs}/ws?partidaId=${partidaId}`, { headers: { cookie } });
      const cliente = new ClienteWs(socket);
      socket.once('open', () => resolve(cliente));
      socket.once('error', reject);
    });
  }

  /** Espera el próximo mensaje de tipo `tipo` (o devuelve uno ya recibido desde `desde`). */
  esperar(tipo: string, { desde = 0, timeoutMs = 5000 } = {}): Promise<Mensaje> {
    const ya = this.recibidos.slice(desde).find((m) => m.t === tipo);
    if (ya) return Promise.resolve(ya);
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(`Timeout esperando "${tipo}"`)), timeoutMs);
      this.esperas.push({
        tipo,
        desde,
        resolver: (m) => {
          clearTimeout(t);
          resolve(m);
        },
      });
    });
  }

  /** Envía un mensaje; si no trae requestId y `conAck`, le pone uno nuevo. Devuelve el requestId. */
  enviar(mensaje: Mensaje, conAck = true): string {
    const requestId = (mensaje.requestId as string | undefined) ?? (conAck ? randomUUID() : undefined);
    this.socket.send(JSON.stringify(requestId ? { ...mensaje, requestId } : mensaje));
    return requestId ?? '';
  }

  async enviarYEsperarAck(mensaje: Mensaje): Promise<Mensaje> {
    const desde = this.recibidos.length;
    const requestId = this.enviar(mensaje);
    for (;;) {
      const ack = await this.esperar('ack', { desde });
      if (ack.requestId === requestId) return ack;
    }
  }

  cerrar(): Promise<void> {
    return new Promise((resolve) => {
      if (this.socket.readyState === WebSocket.CLOSED) return resolve();
      this.socket.once('close', () => resolve());
      this.socket.close();
    });
  }
}
