/**
 * Cansancio (T083; FR-036): desde el minuto 65 (55 con Presión alta) los stats bajan de forma
 * progresiva. Incansable ralentiza el del propio jugador; un Motivador en el campo, el de sus
 * compañeros. Presión alta y marcaje individual aceleran el desgaste.
 */
import { minutoDeJuego, type EquipoEstado, type EstadoMotor } from '../estado/estado';
import { factorCansancio, fatigado } from './defectos';
import { tiene } from './virtudes';

/** Minuto de juego en que empieza la segunda parte: el inicio del cansancio de un Fatigado (spec 005). */
const INICIO_SEGUNDA_PARTE = 45;

export function minutoInicioCansancio(estado: EstadoMotor, equipo: EquipoEstado): number {
  const c = estado.parametros.cansancio;
  return equipo.tactica.alturaBloque === 'presion_alta' ? c.inicioMinPresionAlta : c.inicioMin;
}

/** Acumula el cansancio de `segundos` de juego para los jugadores en el campo. */
export function acumularCansancio(estado: EstadoMotor, equipo: EquipoEstado, segundos: number): void {
  const minuto = minutoDeJuego(estado.reloj);
  const general = minuto >= minutoInicioCansancio(estado, equipo);
  // Antes del inicio general solo se cansan los Fatigados, y desde la segunda parte (spec 005).
  if (!general && (minuto < INICIO_SEGUNDA_PARTE || !equipo.jugadores.some((j) => j.enCampo && fatigado(estado, j)))) return;
  const p = estado.parametros;
  const t = equipo.tactica;
  let ritmo = p.cansancio.degradacionPorMinuto;
  if (t.alturaBloque === 'presion_alta') ritmo *= 1 + p.tacticas.presionAlta.cansancio;
  if (t.sistemaDefensivo === 'individual') ritmo *= 1 + p.tacticas.individual.cansancio;
  // Motivadores en el campo: ralentizan el cansancio de sus compañeros (no el suyo propio).
  let motivadores = 0;
  for (const o of equipo.jugadores) if (o.enCampo && tiene(o, 'Motivador')) motivadores++;
  for (const j of equipo.jugadores) {
    if (!j.enCampo || (!general && !fatigado(estado, j))) continue;
    let r = ritmo * factorCansancio(estado, j);
    if (tiene(j, 'Incansable')) r *= p.cansancio.factorIncansable;
    if (motivadores - (tiene(j, 'Motivador') ? 1 : 0) > 0) r *= p.cansancio.factorMotivador;
    j.cansancio = Math.min(0.6, j.cansancio + (r * segundos) / 60);
  }
}
