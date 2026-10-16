/**
 * Avisos (T112; FR-056b): se guardan en la bandeja del usuario, se envían en vivo si está conectado y,
 * a los usuarios registrados, también por correo (si hay `SMTP_URL`).
 */
import { and, desc, eq } from 'drizzle-orm';
import nodemailer, { type Transporter } from 'nodemailer';
import type { Logger } from '../observabilidad/logger';
import type { BaseDatos } from '../persistencia/db';
import { avisos, usuarios } from '../persistencia/esquema/index';
import type { Reloj } from '../programador/reloj';

export type TipoAviso = 'jornada_abierta' | 'rival_listo' | 'plazo_proximo' | 'partido_auto_resuelto' | 'torneo_terminado';

export interface NuevoAviso {
  usuarioId: string;
  tipo: TipoAviso;
  partidaId: string;
  partidoId?: string;
  texto: string;
}

export class ServicioAvisos {
  private readonly transporte: Transporter | null;

  constructor(
    private readonly db: BaseDatos,
    private readonly reloj: Reloj,
    private readonly logger: Logger,
    smtpUrl: string | undefined,
    private readonly urlPublica: string,
    /** Envío en vivo (mensaje `aviso` por WebSocket). */
    private readonly enVivo: (aviso: NuevoAviso & { id: string }) => void,
  ) {
    this.transporte = smtpUrl ? nodemailer.createTransport(smtpUrl) : null;
  }

  async avisar(a: NuevoAviso): Promise<void> {
    const ahora = new Date(this.reloj.ahora());
    const [fila] = await this.db
      .insert(avisos)
      .values({ usuarioId: a.usuarioId, tipo: a.tipo, partidaId: a.partidaId, partidoId: a.partidoId ?? null, texto: a.texto, creadoEn: ahora })
      .returning({ id: avisos.id });
    this.enVivo({ ...a, id: fila!.id });
    await this.enviarCorreo(fila!.id, a).catch((err: unknown) => this.logger.warn({ err, usuarioId: a.usuarioId }, 'No se pudo enviar el correo del aviso'));
  }

  private async enviarCorreo(avisoId: string, a: NuevoAviso): Promise<void> {
    if (!this.transporte) return;
    const usuario = (await this.db.select().from(usuarios).where(eq(usuarios.id, a.usuarioId)).limit(1))[0];
    if (!usuario || usuario.isAnonymous) return;
    await this.transporte.sendMail({
      from: 'Fútboosterdraft <avisos@futboosterdraft.local>',
      to: usuario.email,
      subject: `Fútboosterdraft: ${a.texto}`,
      text: `${a.texto}\n\n${this.urlPublica}/partidas/${a.partidaId}/torneo`,
    });
    await this.db.update(avisos).set({ enviadoEmailEn: new Date(this.reloj.ahora()) }).where(eq(avisos.id, avisoId));
  }

  async listar(usuarioId: string, soloNoLeidos: boolean) {
    const condicion = soloNoLeidos ? and(eq(avisos.usuarioId, usuarioId), eq(avisos.leido, false)) : eq(avisos.usuarioId, usuarioId);
    return this.db.select().from(avisos).where(condicion).orderBy(desc(avisos.creadoEn)).limit(100);
  }

  async marcarLeido(usuarioId: string, avisoId: string): Promise<boolean> {
    const filas = await this.db
      .update(avisos)
      .set({ leido: true })
      .where(and(eq(avisos.id, avisoId), eq(avisos.usuarioId, usuarioId)))
      .returning({ id: avisos.id });
    return filas.length > 0;
  }
}
