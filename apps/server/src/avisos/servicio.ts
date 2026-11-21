/**
 * Avisos (T112; FR-056b): se guardan en la bandeja del usuario, se envían en vivo si está conectado y,
 * a los usuarios registrados, también por correo (si hay `SMTP_URL`).
 */
import { randomUUID } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import nodemailer, { type Transporter } from 'nodemailer';
import type { Logger } from '../observabilidad/logger';
import type { BaseDatos } from '../persistencia/db';
import { avisos, usuarios } from '../persistencia/esquema/index';
import type { Reloj } from '../programador/reloj';

export type TipoAviso = 'jornada_abierta' | 'plazo_proximo' | 'partido_auto_resuelto' | 'torneo_terminado' | 'dorsal_asignado' | 'baja_sustituida';

interface NuevoAviso {
  usuarioId: string;
  tipo: TipoAviso;
  partidaId: string;
  partidoId?: string;
  texto: string;
}

/** Solo el código del error SMTP: su mensaje y sus campos pueden incluir al destinatario (spec 017, FR-035). */
const codigoSmtp = (err: unknown): string | number => {
  const e = err as { responseCode?: number; code?: string } | null;
  return e?.responseCode ?? e?.code ?? 'desconocido';
};

/** Avisos a los usuarios: en la base de datos y, si hay transporte, por correo. */
export class ServicioAvisos {
  private readonly transporte: Transporter | null;

  constructor(
    private readonly db: BaseDatos,
    private readonly reloj: Reloj,
    private readonly logger: Logger,
    smtp: { url?: string | undefined; remitente?: string | undefined },
    private readonly urlPublica: string,
    /** Envío en vivo (mensaje `aviso` por WebSocket). */
    private readonly enVivo: (aviso: NuevoAviso & { id: string }) => void,
  ) {
    const from = smtp.remitente || 'Fútboosterdraft <avisos@futboosterdraft.local>';
    this.transporte = smtp.url ? nodemailer.createTransport(smtp.url, { from }) : null;
  }

  /** Guarda los avisos en una consulta (spec 010, R13) y después envía cada uno en vivo y por correo. */
  async avisar(lista: readonly NuevoAviso[]): Promise<void> {
    if (lista.length === 0) return;
    const ahora = new Date(this.reloj.ahora());
    const filas = lista.map((a) => ({ id: randomUUID(), usuarioId: a.usuarioId, tipo: a.tipo, partidaId: a.partidaId, partidoId: a.partidoId ?? null, texto: a.texto, creadoEn: ahora }));
    await this.db.insert(avisos).values(filas);
    lista.forEach((a, i) => {
      const id = filas[i]!.id;
      this.enVivo({ ...a, id });
      // Sin esperar: se llama dentro de la cola de la partida, y esperar al SMTP la frenaba ~1 s por humano (INI-07).
      void this.enviarCorreo(id, a).catch((err: unknown) => this.logger.warn({ codigo: codigoSmtp(err), usuarioId: a.usuarioId }, 'No se pudo enviar el correo del aviso'));
    });
  }

  private async enviarCorreo(avisoId: string, a: NuevoAviso): Promise<void> {
    if (!this.transporte) return;
    const usuario = (await this.db.select().from(usuarios).where(eq(usuarios.id, a.usuarioId)).limit(1))[0];
    if (!usuario || usuario.isAnonymous) return;
    await this.transporte.sendMail({
      to: usuario.email,
      subject: `Fútboosterdraft: ${a.texto}`,
      text: `${a.texto}\n\n${this.urlPublica}/partidas/${a.partidaId}/torneo`,
    });
    await this.db.update(avisos).set({ enviadoEmailEn: new Date(this.reloj.ahora()) }).where(eq(avisos.id, avisoId));
  }

  /** Correo con el enlace para restablecer la contraseña (spec 013, FR-027). Nunca lanza: los fallos van al registro. */
  async enviarRecuperacion(email: string, enlace: string): Promise<void> {
    if (!this.transporte) {
      this.logger.warn('Sin SMTP_URL: no se envía el correo para restablecer la contraseña');
      return;
    }
    try {
      await this.transporte.sendMail({
        to: email,
        subject: 'Fútboosterdraft: restablecer la contraseña',
        text: `Para elegir una contraseña nueva, abre este enlace (caduca en una hora):

${enlace}

Si no lo has pedido tú, ignora este correo.`,
      });
    } catch (err) {
      this.logger.warn({ codigo: codigoSmtp(err) }, 'No se pudo enviar el correo para restablecer la contraseña');
    }
  }

  /**
   * Avisa a una cuenta registrada de varios intentos fallidos de acceso (SEG-032). Sin cuenta no hace nada, y se llama
   * sin esperar para que el tiempo de respuesta no lo revele. Nunca lanza.
   */
  async avisarIntentosFallidos(correo: string): Promise<void> {
    if (!this.transporte) return;
    try {
      const [cuenta] = await this.db
        .select({ email: usuarios.email })
        .from(usuarios)
        .where(and(eq(usuarios.email, correo), eq(usuarios.isAnonymous, false)))
        .limit(1);
      if (!cuenta) return;
      await this.transporte.sendMail({
        to: cuenta.email,
        subject: 'Fútboosterdraft: intentos de acceso a tu cuenta',
        text: `Hemos detectado varios intentos seguidos de entrar en tu cuenta con una contraseña incorrecta.

Si has sido tú, no tienes que hacer nada.

Si no has sido tú, tu cuenta sigue protegida, pero te recomendamos cambiar la contraseña desde la opción de recuperarla al iniciar sesión:

${this.urlPublica}/?acceso=entrar`,
      });
    } catch (err) {
      this.logger.warn({ codigo: codigoSmtp(err) }, 'No se pudo enviar el aviso de intentos de acceso');
    }
  }

  /** Avisos de un usuario (solo los no leídos si se pide). */
  async listar(usuarioId: string, soloNoLeidos: boolean) {
    const condicion = soloNoLeidos ? and(eq(avisos.usuarioId, usuarioId), eq(avisos.leido, false)) : eq(avisos.usuarioId, usuarioId);
    return this.db.select().from(avisos).where(condicion).orderBy(desc(avisos.creadoEn)).limit(100);
  }

  /** Marca un aviso del usuario como leído; `false` si no existe. */
  async marcarLeido(usuarioId: string, avisoId: string): Promise<boolean> {
    const filas = await this.db
      .update(avisos)
      .set({ leido: true })
      .where(and(eq(avisos.id, avisoId), eq(avisos.usuarioId, usuarioId)))
      .returning({ id: avisos.id });
    return filas.length > 0;
  }
}
