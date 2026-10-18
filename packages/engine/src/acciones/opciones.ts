/**
 * Opciones del que lleva el balón vistas con datos espaciales (research R4). Los pesos de cada acción
 * (zona, táctica y formación, `pesosAcciones`) se ajustan con lo que hay a su alrededor:
 *
 * - con espacio por delante, conduce más; con un rival encima, regatea o la suelta;
 * - con compañeros en el área, centra más;
 * - cerca de la portería y con el ángulo abierto, tira más.
 */
import type { EquipoEstado, EstadoMotor, JugadorEnPartido } from '../estado/estado';
import { dist2 } from '../espacio/aritmetica';
import { aEquipo, CENTRO_Y } from '../espacio/geometria';
import { atributo } from '../modificadores/atributos';
import { pesosAcciones, type TipoAccion } from '../modificadores/formacionTactica';

/** Distancias en décimas de unidad. */
const ESPACIO_LIBRE = 1500;
const RIVAL_ENCIMA = 600;

export function pesosConEspacio(estado: EstadoMotor, atacante: EquipoEstado, portador: JugadorEnPartido, zona: number, carril: number): [TipoAccion, number][] {
  const pesos = pesosAcciones(atacante, zona, carril);
  const yo = estado.espacio.jugadores[portador.id];
  if (!yo) return pesos;
  const propio = aEquipo(atacante.lado, yo);
  const rivalLado = atacante.lado === 'local' ? 'visitante' : 'local';
  let rivalDelante = false;
  let rivalEncima = false;
  for (const j of estado.equipos[rivalLado].jugadores) {
    const q = estado.espacio.jugadores[j.id];
    if (!j.enCampo || !q) continue;
    const r = aEquipo(atacante.lado, q);
    const d = dist2(propio.x, propio.y, r.x, r.y);
    if (d <= RIVAL_ENCIMA * RIVAL_ENCIMA) rivalEncima = true;
    if (r.x > propio.x && r.x - propio.x <= ESPACIO_LIBRE && Math.abs(r.y - propio.y) <= 900) rivalDelante = true;
  }
  let enArea = 0;
  for (const j of atacante.jugadores) {
    const q = estado.espacio.jugadores[j.id];
    if (!j.enCampo || !q || j.id === portador.id) continue;
    const r = aEquipo(atacante.lado, q);
    if (r.x >= 8430 && r.y >= 1390 && r.y <= 5010) enArea++;
  }
  const cercaDePorteria = propio.x >= 8000 && Math.abs(propio.y - CENTRO_Y) <= 1500;
  // Quien pasa mejor la juega más (SC-008): el peso del pase crece con su stat de pase.
  const a = estado.parametros.acciones;
  const factorPase = Math.min(2, Math.max(0.5, 1 + (a.pesoPasePorStat * (atributo(estado, atacante, portador, 'pase') - a.statPaseReferencia)) / 10));
  return pesos.map(([accion, peso]) => {
    let f = 10;
    // Se conduce con espacio por delante y se regatea con un rival encima; si no, se juega más el pase.
    if (accion === 'conduccion') f = rivalDelante ? 6 : 19;
    if (accion === 'regate') f = rivalEncima ? 11 : 5;
    if (accion === 'pase_corto') f = 16;
    if (accion === 'centro') f = enArea >= 2 ? 26 : 17;
    if ((accion === 'remate' || accion === 'tiro_lejano') && cercaDePorteria) f = 12;
    if (accion === 'pase_corto' || accion === 'pase_largo' || accion === 'pase_espacio') f *= factorPase;
    return [accion, Math.round((peso * f) / 10)];
  });
}
