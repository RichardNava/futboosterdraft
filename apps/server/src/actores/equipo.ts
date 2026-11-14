/**
 * Preparación del equipo en el servidor (T072; FR-026 a FR-031b).
 */
import { decidirAlineacionDuelos } from '@fbd/ai';
import {
  asignarDorsalesIniciales,
  CONFIG_DUELOS_POR_DEFECTO,
  autoAlineacion,
  bajasPendientes,
  derivarSemilla,
  haySuplenteDisponible,
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
import type { AvisoEquipo } from '@fbd/protocol';
import { errores } from '../http/errores';
import type { AlineacionGuardada } from '../persistencia/repos/equipo';
import type { ControladorPartida } from './partida';

/** Lecturas de varios participantes hechas de una vez, para un grupo de aperturas (spec 010, R13). */
export interface Precarga {
  alineaciones: Map<string, AlineacionGuardada>;
  plantillas: Map<string, number[]>;
  dorsales: Map<string, Dorsales | null>;
}

/** Plantillas y alineaciones de varios participantes en una sola lectura. */
export async function precargar(c: ControladorPartida, participanteIds: readonly string[]): Promise<Precarga> {
  const { repoEquipo, repoDraft } = c.servicios;
  const [alineaciones, plantillas, dorsales] = await Promise.all([
    repoEquipo.ultimasAlineaciones(participanteIds),
    repoDraft.plantillas([...participanteIds]),
    repoEquipo.dorsalesDeVarios(participanteIds),
  ]);
  return { alineaciones, plantillas, dorsales };
}

/** Lanza si la partida aún no permite editar el equipo (en sala o en el draft). */
export function exigirEquipoEditable(c: ControladorPartida): void {
  if (c.partida.estado === 'buscando' || c.partida.estado === 'en_draft') {
    throw errores.conflicto('DRAFT_EN_CURSO', 'Podrás preparar el equipo cuando termine el draft');
  }
  if (c.partida.estado !== 'en_torneo') throw errores.conflicto('PARTIDA_TERMINADA', 'La partida ya ha terminado');
}

/** Partida del modo Duelo de jugadores (spec 005). */
const esDuelos = (c: ControladorPartida): boolean => c.partida.modo === 'duelos';

/** Formación común y Estado de forma de una partida de duelos. */
export function configDuelos(c: ControladorPartida): ConfigDuelos {
  return (c.partida.configDuelos as ConfigDuelos | null) ?? { ...CONFIG_DUELOS_POR_DEFECTO };
}

/** En el modo duelos no hay dorsales ni equipaciones (spec 005, FR-063). */
function exigirNoDuelos(c: ControladorPartida): void {
  if (esDuelos(c)) throw errores.conflicto('NO_DISPONIBLE_EN_MODO', 'No disponible en el modo Duelo de jugadores');
}

/** Cartas de la plantilla de un participante (de la precarga si se da). */
export async function plantillaDe(c: ControladorPartida, participanteId: string, precarga?: Precarga): Promise<Jugador[]> {
  const ids = (precarga?.plantillas ?? (await c.servicios.repoDraft.plantillas([participanteId]))).get(participanteId) ?? [];
  return ids.map((id) => c.catalogo.jugador(id));
}

/** Jugadores de baja (lesión o sanción). Las bajas se implementan con el torneo (US4). */
export function bajasActivas(c: ControladorPartida, participanteId: string): Set<number> {
  return c.bajasActivas?.(participanteId) ?? new Set();
}

/**
 * Alineación vigente o, si no hay ninguna confirmada, la automática (FR-031).
 *
 * Spec 012 (FR-028, research R11): fuera del modo duelos, la confirmada se respeta aunque un convocado esté de baja;
 * se devuelve con sus `bajasPendientes` y `sinSuplentes` (no queda nadie con quien sustituirlo). En el modo duelos el
 * once está bloqueado para todo el torneo y no se puede editar: con una baja, como antes, la automática.
 */
export async function alineacionVigente(c: ControladorPartida, participanteId: string, precarga?: Precarga) {
  const guardada = precarga ? precarga.alineaciones.get(participanteId) : await c.servicios.repoEquipo.ultimaAlineacion(participanteId);
  const plantilla = await plantillaDe(c, participanteId, precarga);
  const ids = plantilla.map((j) => j.id);
  const bajas = bajasActivas(c, participanteId);
  const duelos = esDuelos(c);
  const enFormacion = !duelos || guardada?.formacion === configDuelos(c).formacion;
  // Se valida como si sus convocados no estuvieran de baja: las bajas pendientes no la invalidan.
  const convocados = new Set(guardada ? [...guardada.titulares.map((t) => t.jugadorId), ...guardada.suplentes] : []);
  const bajasValidacion = duelos ? bajas : new Set([...bajas].filter((id) => !convocados.has(id)));
  const valida = guardada && enFormacion && validarAlineacion(guardada, ids, bajasValidacion).length === 0 ? guardada : undefined;
  const alineacion = valida ?? alineacionAutomatica(c, participanteId, plantilla, bajas);
  const bajasDetalle = detalleBajas(c, participanteId);
  return {
    alineacion,
    confirmada: valida !== undefined,
    bloqueada: duelos && valida?.bloqueada === true,
    version: valida?.version ?? null,
    plantilla,
    bajas,
    bajasDetalle,
    bajasPendientes: bajasPendientes(alineacion, bajas).map((jugadorId) => {
      const b = bajasDetalle.find((x) => x.jugadorId === jugadorId);
      return { jugadorId, motivo: b?.motivo === 'lesion' ? ('lesion' as const) : ('sancion' as const), partidosRestantes: b?.partidosRestantes ?? 1 };
    }),
    sinSuplentes: !haySuplenteDisponible(alineacion, ids, bajas),
  };
}

/** Alineación vigente de un participante. */
type AlineacionVigente = Awaited<ReturnType<typeof alineacionVigente>>;

/** Hay que sustituir a alguien antes de jugar (FR-029): bajas pendientes y alguien con quien cubrirlas. */
const bloqueoPorBajas = (v: Pick<AlineacionVigente, 'bajasPendientes' | 'sinSuplentes'>): boolean => v.bajasPendientes.length > 0 && !v.sinSuplentes;

/**
 * Bloqueo en el servidor (spec 012, FR-029, SC-008): con un convocado de baja en la alineación confirmada y alguien
 * con quien sustituirlo, no se juega ni se avanza: `409 BAJA_PENDIENTE`. El modo duelos no se bloquea (once fijo).
 */
export async function exigirSinBajasPendientes(c: ControladorPartida, participanteId: string): Promise<void> {
  if (esDuelos(c)) return;
  const v = await alineacionVigente(c, participanteId);
  if (!bloqueoPorBajas(v)) return;
  throw errores.conflicto('BAJA_PENDIENTE', 'Sustituye a los jugadores de baja de tu alineación para continuar', {
    jugadores: v.bajasPendientes.map(({ jugadorId, motivo }) => ({ jugadorId, motivo })),
  });
}

/** Avisos del equipo (spec 012, FR-027): derivados de las bajas, sin guardarse. */
function avisosEquipo(c: ControladorPartida, participanteId: string, v: Pick<AlineacionVigente, 'bajasPendientes' | 'bajasDetalle'>): AvisoEquipo[] {
  const pendientes = new Set(v.bajasPendientes.map((b) => b.jugadorId));
  return [
    ...v.bajasPendientes.map((b) => ({
      nivel: 'intervencion' as const,
      tipo: 'baja_pendiente' as const,
      jugadorId: b.jugadorId,
      motivo: b.motivo,
      partidosRestantes: b.partidosRestantes,
      enlace: 'formacion' as const,
    })),
    ...v.bajasDetalle
      .filter((b) => !pendientes.has(b.jugadorId))
      .map((b) => ({
        nivel: 'informativo' as const,
        tipo: b.motivo === 'lesion' ? ('lesionado' as const) : ('sancionado' as const),
        jugadorId: b.jugadorId,
        motivo: b.gravedad ?? b.motivo,
        partidosRestantes: b.partidosRestantes,
      })),
    ...(c.disponiblesRecientes.get(participanteId) ?? []).map((jugadorId) => ({ nivel: 'informativo' as const, tipo: 'disponible' as const, jugadorId })),
  ];
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
    .map((b) => ({ jugadorId: b.jugadorId, motivo: b.motivo, gravedad: b.gravedad, partidosRestantes: b.partidosRestantes }));
}

/** Vista del equipo para la pantalla de alineación: plantilla, alineación, bajas, dorsales y equipaciones. */
export function vistaEquipo(c: ControladorPartida, participanteId: string, datos: AlineacionVigente, dorsales: Dorsales | null, equipaciones: Equipaciones | null) {
  const catalogo = c.catalogo;
  return {
    alineacion: datos.alineacion,
    confirmada: datos.confirmada,
    version: datos.version,
    previsualizacion: previsualizar(datos.alineacion, (id) => catalogo.jugador(id), parametrosActuales()),
    plantilla: datos.plantilla.map((j) => catalogo.resumen(j.id)),
    bajas: [...datos.bajas],
    bajasDetalle: datos.bajasDetalle,
    // Spec 012 (FR-027 a FR-029): bajas de la alineación confirmada y avisos del equipo.
    bajasPendientes: datos.bajasPendientes,
    sinSuplentes: datos.sinSuplentes,
    avisosEquipo: avisosEquipo(c, participanteId, datos),
    dorsales,
    equipaciones,
    // Modo duelos (spec 005, contracts/http-api.md): once único en la formación común, sin banquillo.
    ...(esDuelos(c) ? { bloqueada: datos.bloqueada, soloTitulares: true as const, formacionFija: configDuelos(c).formacion } : {}),
  };
}

/** Traduce los errores de validación al primer error HTTP, con todos los motivos en los detalles. */
function errorDeAlineacion(problemas: ReturnType<typeof validarAlineacion>) {
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

/** Valida y guarda la alineación de un participante. */
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

/** Valida y guarda las equipaciones de un participante para la partida. */
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
