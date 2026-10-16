/**
 * Jornadas en el servidor (T094): creación de los partidos y, en directo, la preparación: cada humano
 * recibe `preparacion.inicio` con su rival y el plazo; al vencer, empiezan los partidos con la última
 * alineación válida de cada uno (o la automática).
 */
import { derivarSemilla, parametrosActuales, type Emparejamiento } from '@fbd/domain';
import type { ContextoComando } from './actor';
import type { ControladorPartida } from './partida';
import { iniciarPartido } from './partidoRapido';

export interface OpcionesJornada {
  eliminatoria?: boolean;
  jornadaId?: string | null;
  inicial?: boolean;
}

/** Crea los partidos de la jornada (en estado "programado") y la deja como jornada actual. */
export async function crearPartidosJornada(
  c: ControladorPartida,
  numero: number,
  emparejamientos: Emparejamiento[],
  opciones: OpcionesJornada,
  preparacionVenceEn: number | null,
): Promise<void> {
  const cruces: { partidoId: string; local: string; visitante: string }[] = [];
  for (const [i, e] of emparejamientos.entries()) {
    const fila = await c.servicios.repoPartidos.crear({
      partidaId: c.id,
      jornadaId: opciones.jornadaId ?? null,
      jornadaNumero: numero,
      localId: e.local,
      visitanteId: e.visitante,
      eliminatoria: opciones.eliminatoria ?? false,
      semilla: derivarSemilla(c.partida.semilla, `partido:${numero}:${i}`),
      versionParametros: parametrosActuales().version,
    });
    cruces.push({ partidoId: fila.id, local: e.local, visitante: e.visitante });
  }
  c.partidosEnCurso.clear();
  c.jornada = { numero, partidoIds: cruces.map((x) => x.partidoId), cruces, preparacionVenceEn };
}

/** Jornada en directo: partidos, avisos de preparación y temporizador de inicio. */
export async function programarJornada(
  c: ControladorPartida,
  ctx: ContextoComando,
  numero: number,
  emparejamientos: Emparejamiento[],
  opciones: OpcionesJornada = {},
): Promise<number> {
  const tiempos = c.partida.tiempos as { preparacionS: number; preparacionInicialS: number };
  const venceEn = c.servicios.reloj.ahora() + (opciones.inicial ? tiempos.preparacionInicialS : tiempos.preparacionS) * 1000;
  await crearPartidosJornada(c, numero, emparejamientos, opciones, venceEn);
  emitirPreparacion(c, ctx, venceEn);
  programarInicio(c, numero, venceEn);
  return venceEn;
}

export function emitirPreparacion(c: ControladorPartida, ctx: ContextoComando, venceEn: number): void {
  for (const cruce of c.jornada?.cruces ?? []) {
    for (const [pid, rival] of [
      [cruce.local, cruce.visitante],
      [cruce.visitante, cruce.local],
    ] as const) {
      if (c.participante(pid)?.tipo !== 'humano') continue;
      const r = c.participante(rival);
      ctx.emitirA(pid, {
        t: 'preparacion.inicio',
        partidoId: cruce.partidoId,
        rival: { id: rival, nombre: r ? c.nombreDe(r) : rival, bajas: [...(c.bajasActivas?.(rival) ?? [])] },
        venceEn: new Date(venceEn).toISOString(),
      });
    }
  }
}

export function programarInicio(c: ControladorPartida, numero: number, venceEn: number): void {
  c.servicios.temporizadores.programar(c.clave(`preparacion:${numero}`), venceEn, () => {
    void c
      .ejecutar((ctx2) => iniciarJornada(c, ctx2, numero))
      .catch((err: unknown) => c.servicios.logger.error({ err, partidaId: c.id }, 'Error al iniciar la jornada'));
  });
}

export async function iniciarJornada(c: ControladorPartida, ctx: ContextoComando, numero: number): Promise<void> {
  if (!c.jornada || c.jornada.numero !== numero || c.jornada.preparacionVenceEn === null) return;
  c.jornada.preparacionVenceEn = null;
  for (const id of c.jornada.partidoIds) {
    const fila = await c.servicios.repoPartidos.obtener(id);
    if (fila && fila.estado === 'programado') await iniciarPartido(c, ctx, fila);
  }
}
