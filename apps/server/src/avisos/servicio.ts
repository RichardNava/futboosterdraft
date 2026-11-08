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
      void this.enviarCorreo(id, a).catch((err: unknown) => this.logger.warn({ err, usuarioId: a.usuarioId }, 'No se pudo enviar el correo del aviso'));
    });
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
