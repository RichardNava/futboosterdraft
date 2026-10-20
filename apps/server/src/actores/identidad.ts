/**
 * Identidad del equipo en una partida (spec 003, US11: FR-042 a FR-047; data-model §3.1, §5).
 *
 * - Al unirse (o al crear la partida), un registrado con perfil recibe su nombre y sus equipaciones por defecto
 *   si el nombre está libre en la partida; si no, «Equipo de {apodo}» (con sufijo si hace falta) y el aviso
 *   `nombreAjustado`. Un invitado recibe siempre «Equipo de {apodo}».
 * - El nombre se puede cambiar hasta que se abre el primer partido del torneo; cambiarlo en una partida no toca
 *   el perfil.
 */
import { claveNombre, desdeV1, nombrePorDefecto, normalizarNombre, validarNombre, type Equipaciones } from '@fbd/domain';
import { errores } from '../http/errores';
import type { ContextoComando } from './actor';
import type { ControladorPartida } from './partida';
import type { ServiciosPartida as Servicios } from './servicios';

export interface IdentidadInicial {
  nombre: string;
  equipaciones: Equipaciones | null;
  /** El nombre del perfil estaba ocupado y se le ha dado otro. */
  ajustado: boolean;
}

/** Nombre y equipaciones con los que entra un humano en una partida. */
export async function identidadInicial(
  servicios: Pick<Servicios, 'repoPerfiles'>,
  usuario: { id: string; apodo: string; tipo?: 'registrado' | 'invitado' },
  usados: readonly string[],
): Promise<IdentidadInicial> {
  const perfil = usuario.tipo === 'invitado' ? null : await servicios.repoPerfiles.obtener(usuario.id);
  const equipaciones = desdeV1(perfil?.equipaciones ?? null);
  const propio = perfil?.nombreEquipo ? normalizarNombre(perfil.nombreEquipo) : null;
  if (propio && validarNombre(propio, usados).length === 0) return { nombre: propio, equipaciones, ajustado: false };
  return { nombre: nombrePorDefecto(usuario.apodo, usados), equipaciones, ajustado: propio !== null };
}

/** Nombres ya usados en la partida (para comparar con la clave del índice único). */
export const nombresUsados = (c: ControladorPartida, salvo?: string): string[] =>
  c.participantes.filter((p) => p.id !== salvo).map((p) => p.nombreEquipo);

export const clavesUsadas = (c: ControladorPartida): Set<string> => new Set(nombresUsados(c).map(claveNombre));

/**
 * ¿Se ha abierto ya algún partido del torneo (o ha terminado la partida)? (FR-042) Cuentan los partidos con algún
 * humano: los NPC contra NPC se resuelven solos al abrir la jornada, sin que nadie los abra.
 */
export async function torneoIniciado(c: ControladorPartida): Promise<boolean> {
  if (c.partida.estado === 'terminada' || c.partida.estado === 'abandonada') return true;
  if (c.partida.estado !== 'en_torneo') return false;
  const humano = (pid: string) => c.participante(pid)?.tipo === 'humano';
  const partidos = await c.servicios.repoPartidos.resumenesDePartida(c.id);
  return partidos.some((p) => p.estado !== 'programado' && (humano(p.localId) || humano(p.visitanteId)));
}

/** `PUT /api/partidas/:id/nombre-equipo` (FR-042, FR-043). */
export async function cambiarNombreEquipo(c: ControladorPartida, ctx: ContextoComando, participanteId: string, entrada: string): Promise<{ nombreEquipo: string }> {
  const p = c.participante(participanteId);
  if (!p) throw errores.prohibido('NO_PARTICIPA', 'No participas en esta partida');
  if (await torneoIniciado(c)) throw errores.conflicto('TORNEO_INICIADO', 'El nombre ya no se puede cambiar: el torneo ha empezado');
  const nombre = normalizarNombre(entrada);
  const problemas = validarNombre(nombre, nombresUsados(c, participanteId));
  const repetido = problemas.find((x) => x.codigo === 'NOMBRE_REPETIDO');
  const formato = problemas.find((x) => x.codigo !== 'NOMBRE_REPETIDO');
  if (formato) throw errores.regla(formato.codigo, formato.mensaje);
  if (repetido) throw errores.conflicto(repetido.codigo, repetido.mensaje);
  await c.servicios.repoPartidas.cambiarNombreEquipo(participanteId, nombre);
  p.nombreEquipo = nombre;
  nombresAjustados.get(c)?.delete(participanteId);
  if (c.partida.estado === 'buscando') {
    const { resumenSala } = await import('./sala');
    ctx.emitirATodos({ t: 'sala.actualizada', ...resumenSala(c) });
  } else {
    const { emitirEstadoATodos } = await import('./vistas');
    await emitirEstadoATodos(c, ctx);
  }
  return { nombreEquipo: nombre };
}

/** Participantes cuyo nombre del perfil estaba ocupado al unirse (aviso en la sala). */
export const nombresAjustados = new WeakMap<ControladorPartida, Set<string>>();

export function marcarNombreAjustado(c: ControladorPartida, participanteId: string): void {
  let s = nombresAjustados.get(c);
  if (!s) nombresAjustados.set(c, (s = new Set()));
  s.add(participanteId);
}
