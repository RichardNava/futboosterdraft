/**
 * Preparación del equipo en el servidor (T072; FR-026 a FR-031b).
 */
import { decidirAlineacionDuelos } from '@fbd/ai';
import {
  asignarDorsalesIniciales,
  CONFIG_DUELOS_POR_DEFECTO,
  autoAlineacion,
  derivarSemilla,
  asignarDorsal,
  posicionesColocadas,
  sinDorsal,
  ErrorDorsales,
  parametrosActuales,
  previsualizar,
  proponerLanzadores,
  tacticaPorDefecto,
  validarAlineacion,
  validarEquipaciones,
  type Alineacion,
  type ConfigDuelos,
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

/** Partida del modo Duelo de jugadores (spec 005). */
export const esDuelos = (c: ControladorPartida): boolean => c.partida.modo === 'duelos';

/** Formación común y Estado de forma de una partida de duelos. */
export function configDuelos(c: ControladorPartida): ConfigDuelos {
  return (c.partida.configDuelos as ConfigDuelos | null) ?? { ...CONFIG_DUELOS_POR_DEFECTO };
}

/** En el modo duelos no hay dorsales ni equipaciones (spec 005, FR-063). */
function exigirNoDuelos(c: ControladorPartida): void {
  if (esDuelos(c)) throw errores.conflicto('NO_DISPONIBLE_EN_MODO', 'No disponible en el modo Duelo de jugadores');
}

export async function plantillaDe(c: ControladorPartida, participanteId: string): Promise<Jugador[]> {
  const ids = (await c.servicios.repoDraft.plantillas([participanteId])).get(participanteId) ?? [];
  return ids.map((id) => c.catalogo.jugador(id));
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
  const duelos = esDuelos(c);
  const enFormacion = !duelos || guardada?.formacion === configDuelos(c).formacion;
  const valida =
    guardada && enFormacion && validarAlineacion(guardada, plantilla.map((j) => j.id), bajas).length === 0 ? guardada : undefined;
  return {
    alineacion: valida ?? alineacionAutomatica(c, participanteId, plantilla, bajas),
    confirmada: valida !== undefined,
    bloqueada: duelos && valida?.bloqueada === true,
    version: valida?.version ?? null,
    plantilla,
    bajas,
    bajasDetalle: detalleBajas(c, participanteId),
  };
}

/** Alineación automática (FR-031), guardada en caché mientras no cambien las bajas del participante. */
export function alineacionAutomatica(c: ControladorPartida, participanteId: string, plantilla: Jugador[], bajas: Set<number>): Alineacion {
  const clave = [...bajas].sort((a, b) => a - b).join(',');
  const guardada = c.autoAlineaciones.get(participanteId);
  if (guardada && guardada.bajas === clave) return guardada.alineacion;
  // En el modo duelos, el once de más puntuación en la formación común (spec 005, T068).
  const alineacion = esDuelos(c)
    ? decidirAlineacionDuelos(plantilla, configDuelos(c).formacion, parametrosActuales(), bajas)
    : autoAlineacion(plantilla, bajas, parametrosActuales());
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
  datos: {
    alineacion: Alineacion;
    confirmada: boolean;
    bloqueada: boolean;
    version: number | null;
    plantilla: Jugador[];
    bajas: Set<number>;
    bajasDetalle: ReturnType<typeof detalleBajas>;
  },
  dorsales: Dorsales | null,
  equipaciones: Equipaciones | null,
) {
  const catalogo = c.catalogo;
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
    // Modo duelos (spec 005, contracts/http-api.md): once único en la formación común, sin banquillo.
    ...(esDuelos(c) ? { bloqueada: datos.bloqueada, soloTitulares: true as const, formacionFija: configDuelos(c).formacion } : {}),
  };
}

/** Traduce los errores de validación al primer error HTTP, con todos los motivos en los detalles. */
export function errorDeAlineacion(problemas: ReturnType<typeof validarAlineacion>) {
  const p = problemas[0]!;
  return errores.regla(p.codigo, p.mensaje, { motivos: problemas.flatMap((x) => x.motivos) });
}

/**
 * Confirmación del once en el modo duelos (spec 005, FR-063, FR-063a): solo cuentan los titulares, en la formación
 * común; el resto se guarda con valores por defecto. La primera confirmación lo bloquea y no se asignan dorsales.
 */
async function confirmarOnceDuelos(c: ControladorPartida, participanteId: string, a: Alineacion) {
  const { repoEquipo, reloj } = c.servicios;
  const anterior = await repoEquipo.ultimaAlineacion(participanteId);
  if (anterior?.bloqueada) throw errores.conflicto('ALINEACION_BLOQUEADA', 'El once ya está confirmado para todo el torneo');
  const fija = configDuelos(c).formacion;
  if (a.formacion !== fija) throw errores.validacion('FORMACION_FIJA', `En este torneo se juega con el ${fija}`);
  const plantilla = await plantillaDe(c, participanteId);
  const porId = new Map(plantilla.map((j) => [j.id, j]));
  const once: Alineacion = {
    formacion: fija,
    titulares: a.titulares,
    suplentes: [],
    tactica: tacticaPorDefecto(),
    lanzadores: proponerLanzadores(a.titulares.flatMap((t) => (porId.has(t.jugadorId) ? [porId.get(t.jugadorId)!] : []))),
  };
  const problemas = validarAlineacion(once, plantilla.map((j) => j.id), bajasActivas(c, participanteId));
  if (problemas.length) throw errorDeAlineacion(problemas);
  const version = await repoEquipo.guardarAlineacion(participanteId, once, reloj.ahora(), undefined, true);
  return { version, dorsales: null };
}

/** Bloquea el once vigente de un participante del modo duelos (al resolverse su primer cruce sin haberlo confirmado). */
export async function bloquearOnceDuelos(c: ControladorPartida, participanteId: string, a: Alineacion): Promise<void> {
  const { repoEquipo, reloj } = c.servicios;
  if ((await repoEquipo.ultimaAlineacion(participanteId))?.bloqueada) return;
  await repoEquipo.guardarAlineacion(participanteId, a, reloj.ahora(), undefined, true);
}

export async function confirmarAlineacion(c: ControladorPartida, participanteId: string, a: Alineacion) {
  exigirEquipoEditable(c);
  if (esDuelos(c)) return confirmarOnceDuelos(c, participanteId, a);
  const { repoEquipo, reloj, db } = c.servicios;
  const plantilla = await plantillaDe(c, participanteId);
  const bajas = bajasActivas(c, participanteId);
  const problemas = validarAlineacion(a, plantilla.map((j) => j.id), bajas);
  if (problemas.length) throw errorDeAlineacion(problemas);

  return db.transaction(async (tx) => {
    const version = await repoEquipo.guardarAlineacion(participanteId, a, reloj.ahora(), tx);
    // Los dorsales se asignan al terminar el draft (spec 003, FR-001b) y confirmar el once no los cambia. Solo una
    // partida anterior a ese cambio puede llegar aquí sin dorsales: se le asignan como antes.
    let dorsales = await repoEquipo.dorsales(participanteId, tx);
    if (!dorsales) {
      dorsales = dorsalesIniciales(c, participanteId, plantilla, a);
      await repoEquipo.guardarDorsales(participanteId, dorsales, tx);
    }
    return { version, dorsales };
  });
}

/**
 * Dorsales iniciales de un participante (spec 003, FR-001b): por la posición de cada jugador en la alineación dada,
 * con los dorsales fijos por casilla para los titulares y del 1 al 24 sin repetir para el resto (002/FR-035).
 */
export function dorsalesIniciales(c: ControladorPartida, participanteId: string, plantilla: readonly Jugador[], a: Alineacion): Dorsales {
  return asignarDorsalesIniciales(
    plantilla.map((j) => j.id),
    a.titulares,
    a.formacion,
    derivarSemilla(c.partida.semilla, `dorsales:${participanteId}`),
    posicionesColocadas(a.formacion, a.titulares, a.colocacion, parametrosActuales()),
  );
}

/** Reasigna un dorsal (FR-037): si otro jugador lo llevaba, se queda sin dorsal. */
export async function cambiarDorsal(c: ControladorPartida, participanteId: string, jugadorId: number, dorsal: number) {
  exigirEquipoEditable(c);
  exigirNoDuelos(c);
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
      posicionesColocadas(alineacion.formacion, alineacion.titulares, alineacion.colocacion, parametrosActuales()),
    );
  }
  try {
    const ids = (await plantillaDe(c, participanteId)).map((j) => j.id);
    const nuevos = asignarDorsal(actuales, jugadorId, dorsal, ids);
    await repoEquipo.guardarDorsales(participanteId, nuevos);
    return { dorsales: nuevos, sinDorsal: sinDorsal(nuevos, ids) };
  } catch (e) {
    if (e instanceof ErrorDorsales) throw errores.regla(e.codigo, e.message);
    throw e;
  }
}

export async function cambiarEquipaciones(c: ControladorPartida, participanteId: string, e: Equipaciones) {
  exigirEquipoEditable(c);
  exigirNoDuelos(c);
  const problemas = validarEquipaciones(e, parametrosActuales());
  if (problemas.length) throw errores.regla(problemas[0]!.codigo, problemas[0]!.mensaje);
  await c.servicios.repoEquipo.guardarEquipaciones(participanteId, e);
  const p = c.participante(participanteId);
  if (p) p.equipaciones = e;
  return e;
}
