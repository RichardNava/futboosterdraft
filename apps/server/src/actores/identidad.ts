/**
 * Identidad del equipo en una partida (spec 003, US11: FR-042 a FR-047; data-model §3.1, §5).
 *
 * - Al unirse (o al crear la partida), un registrado con perfil recibe su nombre y sus equipaciones por defecto
 *   si el nombre está libre en la partida; si no, «Equipo de {apodo}» (con sufijo si hace falta) y el aviso
 *   `nombreAjustado`. Un invitado recibe siempre «Equipo de {apodo}».
 * - El nombre se puede cambiar hasta que se abre el primer partido del torneo; cambiarlo en una partida no toca
 *   el perfil.
 * - Escudo (spec 011, data-model §5): al unirse se copia el del perfil si sigue disponible; se cambia por partida
 *   con las mismas reglas que el nombre. Sin elección, `escudoDe` lo resuelve al leerlo, sin tocar la fila.
 */
import {
  claveNombre,
  desdeV1,
  escudoAsignado,
  escudoNpc,
  MODO_INCIDENCIAS_POR_DEFECTO,
  nombrePorDefecto,
  normalizarNombre,
  validarNombre,
  type Equipaciones,
  type ModoIncidencias,
} from '@fbd/domain';
import { errores } from '../http/errores';
import type { ContextoComando } from './actor';
import type { ControladorPartida } from './partida';
import type { ServiciosPartida as Servicios } from './servicios';

export interface IdentidadInicial {
  nombre: string;
  equipaciones: Equipaciones | null;
  /** Escudo elegido en el perfil, si sigue disponible; null = asignado al leerlo. */
  escudo: string | null;
  /** Celebración de gol del perfil, si sigue disponible (null = la del juego) y modo de incidencias (spec 012). */
  celebracion: string | null;
  modoIncidencias: ModoIncidencias;
  /** El nombre del perfil estaba ocupado y se le ha dado otro. */
  ajustado: boolean;
}

/** Nombre y equipaciones con los que entra un humano en una partida. */
export async function identidadInicial(
  servicios: Pick<Servicios, 'repoPerfiles' | 'cosmeticos'>,
  usuario: { id: string; apodo: string; tipo?: 'registrado' | 'invitado' },
  usados: readonly string[],
): Promise<IdentidadInicial> {
  const registrado = usuario.tipo !== 'invitado';
  const perfil = registrado ? await servicios.repoPerfiles.obtener(usuario.id) : null;
  const equipaciones = desdeV1(perfil?.equipaciones ?? null);
  const aspecto = registrado ? await servicios.repoPerfiles.obtenerAspecto(usuario.id) : null;
  const quien = { id: usuario.id, tipo: 'registrado' as const };
  const disponible = async (id: string | null | undefined, tipo: 'escudo' | 'celebracion') =>
    id && (await servicios.cosmeticos.estaDisponible(quien, id, tipo)) ? id : null;
  const escudo = await disponible(aspecto?.escudo, 'escudo');
  const celebracion = await disponible(aspecto?.celebracion, 'celebracion');
  const modoIncidencias = aspecto?.modoIncidencias ?? MODO_INCIDENCIAS_POR_DEFECTO;
  const comun = { equipaciones, escudo, celebracion, modoIncidencias };
  const propio = perfil?.nombreEquipo ? normalizarNombre(perfil.nombreEquipo) : null;
  if (propio && validarNombre(propio, usados).length === 0) return { nombre: propio, ...comun, ajustado: false };
  return { nombre: nombrePorDefecto(usuario.apodo, usados), ...comun, ajustado: propio !== null };
}

/** ¿Es el participante un invitado? Un invitado solo juega solo y es el anfitrión (FR-000). */
const esInvitado = (c: ControladorPartida, usuarioId: string | null): boolean => c.anfitrionEsInvitado && usuarioId === c.partida.anfitrionId;

/**
 * Escudo con que se pinta un equipo (data-model §5): el de la partida; si no, el asignado del registrado, el del NPC
 * por semilla o null (círculo) para el invitado. Sin consultas a la BD.
 */
export function escudoDe(c: ControladorPartida, participanteId: string): string | null {
  const p = c.participante(participanteId);
  if (!p) return null;
  if (p.escudo) return p.escudo;
  const gratuitos = c.servicios.cosmeticos.gratuitos('escudo');
  if (p.tipo === 'npc' || !p.usuarioId) return escudoNpc(c.partida.semilla, p.id, gratuitos);
  return esInvitado(c, p.usuarioId) ? null : escudoAsignado(p.usuarioId, gratuitos);
}

/** `PUT /api/partidas/:id/escudo` (spec 011): mismas reglas que el nombre; no cambia el perfil. */
export async function cambiarEscudo(c: ControladorPartida, ctx: ContextoComando, participanteId: string, escudo: string | null): Promise<{ escudo: string | null }> {
  const p = c.participante(participanteId);
  if (!p?.usuarioId) throw errores.prohibido('NO_PARTICIPA', 'No participas en esta partida');
  if (await torneoIniciado(c)) throw errores.conflicto('TORNEO_INICIADO', 'El escudo ya no se puede cambiar: el torneo ha empezado');
  const quien = { id: p.usuarioId, tipo: esInvitado(c, p.usuarioId) ? ('invitado' as const) : ('registrado' as const) };
  if (escudo !== null && !(await c.servicios.cosmeticos.estaDisponible(quien, escudo, 'escudo'))) {
    throw errores.regla('COSMETICO_NO_DISPONIBLE', 'Ese escudo no está disponible para tu cuenta');
  }
  // null vuelve al del perfil (si sigue disponible) o al asignado.
  const elegido = escudo ?? (quien.tipo === 'registrado' ? (await identidadInicial(c.servicios, { id: p.usuarioId, apodo: '' }, [])).escudo : null);
  await c.servicios.repoPartidas.cambiarEscudo(participanteId, elegido);
  p.escudo = elegido;
  if (c.partida.estado === 'buscando') {
    const { resumenSala } = await import('./sala');
    ctx.emitirATodos({ t: 'sala.actualizada', ...resumenSala(c) });
  }
  return { escudo: escudoDe(c, participanteId) };
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
