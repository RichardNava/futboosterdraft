/**
 * Decisiones del participante durante el partido (T087; FR-042, FR-045, FR-050): sustituciones,
 * formación, táctica, lanzadores y recolocación. Se validan al pedirlas y se aplican al empezar el
 * siguiente tramo (o en la interrupción indicada por `aplicadaEnTick` al reproducir un partido).
 */
import { autoAlineacion, esFormacionId, FORMACIONES, Rng, validarColocacion, validarTactica, type FormacionId } from '@fbd/domain';
import { colocar, maxSustituciones, type EquipoEstado, type EstadoMotor } from '../estado/estado';
import type { DecisionPartido, DecisionRegistrada } from '../tipos';
import { emitir, type Contexto } from '../acciones/contexto';
import { sustituir } from '../acciones/plantel';

export type ResultadoDecision = { ok: true } | { ok: false; codigo: string; mensaje: string };

const error = (codigo: string, mensaje: string): ResultadoDecision => ({ ok: false, codigo, mensaje });

function equipoDe(estado: EstadoMotor, participanteId: string): EquipoEstado | undefined {
  return [estado.equipos.local, estado.equipos.visitante].find((e) => e.participanteId === participanteId);
}

function validarAsignacion(equipo: EquipoEstado, formacion: string, asignacion: { casillaId: string; jugadorId: number }[]): ResultadoDecision {
  if (!esFormacionId(formacion)) return error('FORMACION_INVALIDA', 'Formación desconocida');
  const casillas = new Set(FORMACIONES[formacion].casillas.map((c) => c.id));
  const enCampo = new Set(equipo.jugadores.filter((j) => j.enCampo).map((j) => j.id));
  if (asignacion.length !== enCampo.size) return error('DECISION_INVALIDA', 'Hay que colocar a todos los jugadores del campo');
  if (asignacion.some((a) => !casillas.has(a.casillaId) || !enCampo.has(a.jugadorId))) {
    return error('DECISION_INVALIDA', 'Casillas o jugadores no válidos');
  }
  if (new Set(asignacion.map((a) => a.casillaId)).size !== asignacion.length) return error('DECISION_INVALIDA', 'Casillas repetidas');
  if (new Set(asignacion.map((a) => a.jugadorId)).size !== asignacion.length) return error('DECISION_INVALIDA', 'Jugadores repetidos');
  return { ok: true };
}

function validarPuntos(formacion: FormacionId, asignacion: { casillaId: string; jugadorId: number }[], colocacion: { jugadorId: number; x: number; y: number }[]): ResultadoDecision {
  const motivos = validarColocacion(formacion, asignacion, colocacion);
  return motivos.length ? error('DECISION_INVALIDA', `Colocación no válida: ${motivos.join(', ')}`) : { ok: true };
}

/** Comprueba que una decisión se puede aplicar en el estado actual (contando las pendientes). */
export function validarDecision(estado: EstadoMotor, d: DecisionPartido): ResultadoDecision {
  if (estado.fase === 'finalizado' || estado.fase === 'penaltis') return error('PARTIDO_TERMINADO', 'El partido ya no admite cambios');
  const equipo = equipoDe(estado, d.participanteId);
  if (!equipo) return error('NO_PARTICIPA', 'No juegas este partido');
  switch (d.tipo) {
    case 'sustitucion': {
      const pendientes = estado.decisionesPendientes.filter((x) => x.participanteId === d.participanteId && x.tipo === 'sustitucion');
      const usadas = equipo.sustitucionesUsadas + pendientes.length;
      if (usadas >= maxSustituciones(estado)) return error('SUSTITUCIONES_AGOTADAS', 'No quedan sustituciones');
      const sale = equipo.jugadores.find((j) => j.id === d.datos.sale);
      const entra = equipo.jugadores.find((j) => j.id === d.datos.entra);
      const yaPedidos = pendientes.flatMap((x) => (x.tipo === 'sustitucion' ? [x.datos.sale, x.datos.entra] : []));
      if (!sale?.enCampo || yaPedidos.includes(sale.id)) return error('JUGADOR_NO_EN_CAMPO', 'El jugador que sale no está en el campo');
      if (!entra || entra.enCampo || entra.retirado || yaPedidos.includes(entra.id)) {
        return error('JUGADOR_NO_DISPONIBLE', 'El jugador que entra no está disponible en el banquillo');
      }
      return { ok: true };
    }
    case 'formacion': {
      if (!esFormacionId(d.datos.formacion)) return error('FORMACION_INVALIDA', 'Formación desconocida');
      const r = d.datos.asignacion ? validarAsignacion(equipo, d.datos.formacion, d.datos.asignacion) : { ok: true as const };
      if (!r.ok || !d.datos.colocacion) return r;
      if (!d.datos.asignacion) return error('DECISION_INVALIDA', 'La colocación necesita la asignación de casillas');
      return validarPuntos(d.datos.formacion, d.datos.asignacion, d.datos.colocacion);
    }
    case 'recolocacion': {
      const r = validarAsignacion(equipo, equipo.formacion, d.datos.asignacion);
      return r.ok && d.datos.colocacion ? validarPuntos(equipo.formacion, d.datos.asignacion, d.datos.colocacion) : r;
    }
    case 'tactica': {
      const errores = validarTactica(d.datos.tactica);
      return errores.length ? error(errores[0]!.codigo, errores[0]!.mensaje) : { ok: true };
    }
    case 'lanzadores': {
      const enCampo = new Set(equipo.jugadores.filter((j) => j.enCampo).map((j) => j.id));
      const l = d.datos.lanzadores;
      const ids = [l.penaltis, l.faltas, l.corners, ...l.tanda];
      if (ids.some((id) => !enCampo.has(id)) || new Set(l.tanda).size !== l.tanda.length) {
        return error('DECISION_INVALIDA', 'Los lanzadores deben estar en el campo');
      }
      return { ok: true };
    }
  }
}

/** Encola una decisión válida; se aplicará en el próximo punto de decisión. */
export function encolarDecision(estado: EstadoMotor, d: DecisionPartido | DecisionRegistrada): ResultadoDecision {
  const r = validarDecision(estado, d);
  if (!r.ok) return r;
  const registrada: DecisionRegistrada = {
    ...(d as DecisionPartido),
    solicitadaEnTick: (d as DecisionRegistrada).solicitadaEnTick ?? estado.tick,
    aplicadaEnTick: (d as DecisionRegistrada).aplicadaEnTick,
  };
  estado.decisionesPendientes.push(registrada);
  return { ok: true };
}

export type ResultadoLote = { ok: true } | { ok: false; indice: number; codigo: string; mensaje: string };

/**
 * Lote atómico de decisiones (spec 003, research R17; FR-030): se validan en orden sobre una copia del estado,
 * aplicando cada una antes de validar la siguiente (una formación puede depender de la sustitución anterior). Si
 * alguna falla, no se encola ninguna y se devuelve su índice. Si todas valen, se encolan en el mismo orden en el
 * estado real: al aplicarse en el siguiente punto de decisión, el resultado es el mismo que en la copia.
 */
export function encolarLote(estado: EstadoMotor, decisiones: readonly DecisionPartido[]): ResultadoLote {
  const { eventos: _eventos, acciones: _acciones, ...resto } = estado;
  const copia: EstadoMotor = { ...structuredClone(resto), eventos: [], acciones: [] };
  // La copia aplica todas las pendientes que ya había: el lote se valida contra cómo quedará el equipo.
  copia.decisionesPendientes = copia.decisionesPendientes.map((d) => ({ ...d, aplicadaEnTick: undefined }));
  const ctx: Contexto = { estado: copia, rng: new Rng(copia.rng), interrupcion: false };
  aplicarPendientes(ctx);
  for (const [indice, d] of decisiones.entries()) {
    const r = validarDecision(copia, d);
    if (!r.ok) return { ok: false, indice, codigo: r.codigo, mensaje: r.mensaje };
    copia.decisionesPendientes.push({ ...d, solicitadaEnTick: copia.tick });
    aplicarPendientes(ctx);
  }
  for (const d of decisiones) estado.decisionesPendientes.push({ ...d, solicitadaEnTick: estado.tick });
  return { ok: true };
}

/** Aplica las decisiones pendientes que tocan en este punto (todas, o las de `aplicadaEnTick` ≤ tick). */
export function aplicarPendientes(ctx: Contexto): void {
  const e = ctx.estado;
  const aplicar = e.decisionesPendientes.filter((d) => d.aplicadaEnTick === undefined || d.aplicadaEnTick <= e.tick);
  e.decisionesPendientes = e.decisionesPendientes.filter((d) => !aplicar.includes(d));
  for (const d of aplicar) {
    const equipo = equipoDe(e, d.participanteId);
    if (!equipo || validarDecision(e, d).ok === false) continue;
    aplicarUna(ctx, equipo, d);
    e.decisiones.push({ ...d, aplicadaEnTick: e.tick });
  }
}

function aplicarUna(ctx: Contexto, equipo: EquipoEstado, d: DecisionRegistrada): void {
  switch (d.tipo) {
    case 'sustitucion': {
      const sale = equipo.jugadores.find((j) => j.id === d.datos.sale)!;
      const entra = equipo.jugadores.find((j) => j.id === d.datos.entra)!;
      sustituir(ctx, equipo, sale, entra);
      return;
    }
    case 'tactica':
      equipo.tactica = { ...d.datos.tactica };
      emitir(ctx, 'interrupcion', equipo.lado, [], { motivo: 'cambio_tactico' });
      return;
    case 'lanzadores':
      equipo.lanzadores = { ...d.datos.lanzadores, tanda: [...d.datos.lanzadores.tanda] };
      return;
    case 'recolocacion':
      for (const a of d.datos.asignacion) {
        const j = equipo.jugadores.find((x) => x.id === a.jugadorId)!;
        j.casillaId = a.casillaId;
      }
      // Con `colocacion`, cada uno a su punto; sin ella, a su casilla (research R13).
      colocar(equipo, d.datos.colocacion, ctx.estado.parametros);
      return;
    case 'formacion': {
      equipo.formacion = d.datos.formacion;
      const enCampo = equipo.jugadores.filter((j) => j.enCampo);
      const asignacion =
        d.datos.asignacion ??
        autoAlineacion(
          enCampo.map((j) => j.jugador),
          new Set(),
          ctx.estado.parametros,
          { formaciones: [d.datos.formacion] },
        ).titulares;
      // La nueva formación restablece las anclas a sus casillas, salvo que traiga colocación (research R13).
      for (const j of enCampo) j.casillaId = asignacion.find((a) => a.jugadorId === j.id)?.casillaId ?? null;
      colocar(equipo, d.datos.colocacion, ctx.estado.parametros);
      emitir(ctx, 'interrupcion', equipo.lado, [], { motivo: 'cambio_formacion', formacion: d.datos.formacion });
      return;
    }
  }
}
