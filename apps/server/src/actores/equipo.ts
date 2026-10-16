/**
 * Preparación del equipo en el servidor (T072; FR-026 a FR-031b).
 */
import {
  asignarDorsalesIniciales,
  autoAlineacion,
  derivarSemilla,
  editarDorsales,
  ErrorDorsales,
  parametrosActuales,
  previsualizar,
  validarAlineacion,
  validarEquipaciones,
  type Alineacion,
  type Dorsales,
  type Equipaciones,
  type Jugador,
} from '@fbd/domain';
import { errores } from '../http/errores';
import type { ControladorPartida } from './partida';

export function exigirEquipoEditable(c: ControladorPartida): void {
  if (c.partida.estado === 'buscando' || c.partida.estado === 'en_draft') {
    throw errores.conflicto('DRAFT_EN_CURSO', 'Podrás preparar el equipo cuando termine el draft');
  }
  if (c.partida.estado !== 'en_torneo') throw errores.conflicto('PARTIDA_TERMINADA', 'La partida ya ha terminado');
}

export async function plantillaDe(c: ControladorPartida, participanteId: string): Promise<Jugador[]> {
  const ids = (await c.servicios.repoDraft.plantillas([participanteId])).get(participanteId) ?? [];
  return ids.map((id) => c.servicios.catalogo.jugador(id));
}

/** Jugadores de baja (lesión o sanción). Las bajas se implementan con el torneo (US4). */
export function bajasActivas(c: ControladorPartida, participanteId: string): Set<number> {
  return c.bajasActivas?.(participanteId) ?? new Set();
}

/** Alineación vigente o, si no hay ninguna confirmada, la automática (FR-031). */
export async function alineacionVigente(c: ControladorPartida, participanteId: string) {
  const guardada = await c.servicios.repoEquipo.ultimaAlineacion(participanteId);
  const plantilla = await plantillaDe(c, participanteId);
  const bajas = bajasActivas(c, participanteId);
  const valida =
    guardada && validarAlineacion(guardada, plantilla.map((j) => j.id), bajas).length === 0 ? guardada : undefined;
  return {
    alineacion: valida ?? alineacionAutomatica(c, participanteId, plantilla, bajas),
    confirmada: valida !== undefined,
    version: valida?.version ?? null,
    plantilla,
    bajas,
    bajasDetalle: detalleBajas(c, participanteId),
  };
}

/** Alineación automática (FR-031), guardada en caché mientras no cambien las bajas del participante. */
function alineacionAutomatica(c: ControladorPartida, participanteId: string, plantilla: Jugador[], bajas: Set<number>): Alineacion {
  const clave = [...bajas].sort((a, b) => a - b).join(',');
  const guardada = c.autoAlineaciones.get(participanteId);
  if (guardada && guardada.bajas === clave) return guardada.alineacion;
  const alineacion = autoAlineacion(plantilla, bajas, parametrosActuales());
  c.autoAlineaciones.set(participanteId, { bajas: clave, alineacion });
  return alineacion;
}

/** Bajas vigentes de un participante (lesión o sanción) con los partidos que le quedan. */
export function detalleBajas(c: ControladorPartida, participanteId: string) {
  return (c.torneo?.bajas.bajas ?? [])
    .filter((b) => b.participanteId === participanteId && b.partidosRestantes > 0)
    .map((b) => ({ jugadorId: b.jugadorId, motivo: b.motivo, partidosRestantes: b.partidosRestantes }));
}

export function vistaEquipo(
  c: ControladorPartida,
  datos: { alineacion: Alineacion; confirmada: boolean; version: number | null; plantilla: Jugador[]; bajas: Set<number>; bajasDetalle: ReturnType<typeof detalleBajas> },
  dorsales: Dorsales | null,
  equipaciones: Equipaciones | null,
) {
  const { catalogo } = c.servicios;
  return {
    alineacion: datos.alineacion,
    confirmada: datos.confirmada,
    version: datos.version,
    previsualizacion: previsualizar(datos.alineacion, (id) => catalogo.jugador(id), parametrosActuales()),
    plantilla: datos.plantilla.map((j) => catalogo.resumen(j.id)),
    bajas: [...datos.bajas],
    bajasDetalle: datos.bajasDetalle,
    dorsales,
    equipaciones,
  };
}

/** Traduce los errores de validación al primer error HTTP, con todos los motivos en los detalles. */
export function errorDeAlineacion(problemas: ReturnType<typeof validarAlineacion>) {
  const p = problemas[0]!;
  return errores.regla(p.codigo, p.mensaje, { motivos: problemas.flatMap((x) => x.motivos) });
}

export async function confirmarAlineacion(c: ControladorPartida, participanteId: string, a: Alineacion) {
  exigirEquipoEditable(c);
  const { repoEquipo, reloj, db } = c.servicios;
  const plantilla = await plantillaDe(c, participanteId);
  const bajas = bajasActivas(c, participanteId);
  const problemas = validarAlineacion(a, plantilla.map((j) => j.id), bajas);
  if (problemas.length) throw errorDeAlineacion(problemas);

  return db.transaction(async (tx) => {
    const version = await repoEquipo.guardarAlineacion(participanteId, a, reloj.ahora(), tx);
    // Los dorsales se asignan al definir por primera vez el once y quedan fijos (FR-031a).
    let dorsales = await repoEquipo.dorsales(participanteId, tx);
    if (!dorsales) {
      dorsales = asignarDorsalesIniciales(
        plantilla.map((j) => j.id),
        a.titulares,
        a.formacion,
        derivarSemilla(c.partida.semilla, `dorsales:${participanteId}`),
      );
      await repoEquipo.guardarDorsales(participanteId, dorsales, tx);
    }
    return { version, dorsales };
  });
}

export async function cambiarDorsales(c: ControladorPartida, participanteId: string, cambios: Record<number, number>) {
  exigirEquipoEditable(c);
  if (c.partidoEnCurso?.(participanteId)) throw errores.conflicto('PARTIDO_EN_CURSO', 'No se pueden cambiar dorsales durante un partido');
  const { repoEquipo } = c.servicios;
  let actuales = await repoEquipo.dorsales(participanteId);
  if (!actuales) {
    // Aún no hay once confirmado: se parte de la asignación de la alineación vigente.
    const { alineacion, plantilla } = await alineacionVigente(c, participanteId);
    actuales = asignarDorsalesIniciales(
      plantilla.map((j) => j.id),
      alineacion.titulares,
      alineacion.formacion,
      derivarSemilla(c.partida.semilla, `dorsales:${participanteId}`),
    );
  }
  try {
    const nuevos = editarDorsales(actuales, cambios);
    await repoEquipo.guardarDorsales(participanteId, nuevos);
    return nuevos;
  } catch (e) {
    if (e instanceof ErrorDorsales) throw errores.regla(e.codigo, e.message);
    throw e;
  }
}

export async function cambiarEquipaciones(c: ControladorPartida, participanteId: string, e: Equipaciones) {
  exigirEquipoEditable(c);
  const problemas = validarEquipaciones(e);
  if (problemas.length) throw errores.regla(problemas[0]!.codigo, problemas[0]!.mensaje);
  await c.servicios.repoEquipo.guardarEquipaciones(participanteId, e);
  const p = c.participante(participanteId);
  if (p) p.equipaciones = e;
  return e;
}
