/**
 * Efectos de la formación (FR-034) y de la táctica (FR-035) sobre las acciones (T083).
 *
 * Ofensividad: en cada duelo de ataque se suman la ofensividad del atacante (más llegada) y la del
 * defensor (más espacios a su espalda). Así una formación ofensiva genera más ocasiones propias y
 * también concede más; una defensiva, menos de ambas.
 */
import type { EquipoEstado, EstadoMotor } from '../estado/estado';

export type TipoAccion = 'pase_corto' | 'pase_largo' | 'conduccion' | 'regate' | 'pase_espacio' | 'centro' | 'tiro_lejano' | 'remate';

/** Perfil calculado con la colocación (FR-034b): el de la formación si nadie se ha movido de su zona. */
export const ofensividad = (e: EquipoEstado) => e.perfil.ofensividad;
export const amplitud = (e: EquipoEstado) => e.perfil.amplitud;

/** Pesos de cada acción según la zona del balón, la táctica y la formación del equipo atacante. */
export function pesosAcciones(atacante: EquipoEstado, zona: number, carril: number): [TipoAccion, number][] {
  const enBanda = carril !== 1;
  const base: Record<number, [TipoAccion, number][]> = {
    0: [
      ['pase_corto', 70],
      ['pase_largo', 30],
    ],
    1: [
      ['pase_corto', 55],
      ['pase_largo', 20],
      ['conduccion', 25],
    ],
    2: [
      ['pase_corto', 45],
      ['pase_espacio', 10],
      ['conduccion', 25],
      ['regate', 10],
      ['pase_largo', 10],
    ],
    3: [
      ['pase_corto', 38],
      ['pase_espacio', 18],
      ['conduccion', 20],
      ['regate', 14],
      ['tiro_lejano', 1],
      ['centro', enBanda ? 8 : 0],
    ],
    4: [
      ['pase_corto', 26],
      ['regate', 20],
      ['centro', enBanda ? 13 : 2],
      ['tiro_lejano', 3],
      ['pase_espacio', 16],
    ],
    // Dentro del área no siempre hay remate: a veces hay que pasar o regatear.
    5: [
      ['remate', 40],
      ['pase_corto', 33],
      ['regate', 27],
    ],
  };
  const t = atacante.tactica;
  const o = ofensividad(atacante);
  return (base[zona] ?? base[2]!).map(([accion, peso]) => {
    let f = 1;
    if (t.estiloConBalon === 'combinativo') f *= { pase_corto: 1.4, pase_largo: 0.5, regate: 0.9 }[accion as string] ?? 1;
    if (t.estiloConBalon === 'contraataque') f *= { pase_largo: 1.6, pase_espacio: 1.5, pase_corto: 0.8 }[accion as string] ?? 1;
    if (t.juegoVertical) f *= { centro: 1.6, pase_largo: 1.3, pase_espacio: 1.3 }[accion as string] ?? 1;
    if (t.alturaBloque === 'catenaccio') f *= { pase_largo: 1.3, pase_espacio: 1.2, regate: 0.8 }[accion as string] ?? 1;
    // Las formaciones ofensivas buscan más el último pase y el tiro.
    if (accion === 'pase_espacio' || accion === 'tiro_lejano' || accion === 'regate') f *= 1 + 0.08 * o;
    return [accion, Math.max(0, Math.round(peso * f))];
  });
}

/** Desplazamiento (escala de la sigmoide) a favor del atacante en una acción de progresión o de tiro. */
export function desplazamientoAtaque(estado: EstadoMotor, atacante: EquipoEstado, defensor: EquipoEstado, accion: TipoAccion, zona: number): number {
  const p = estado.parametros;
  let x = p.formaciones.efectoOfensividad * (ofensividad(atacante) + ofensividad(defensor));
  // Cuanto más cerca del área rival, más cuesta progresar.
  if (zona >= 3 && accion !== 'pase_corto') x -= p.acciones.dificultadZona * (zona - 2);
  if (zona >= 4 && accion === 'pase_corto') x -= p.acciones.dificultadZona;
  const ta = atacante.tactica;
  const td = defensor.tactica;
  const progresion = accion !== 'pase_corto' || zona >= 3;
  if (ta.alturaBloque === 'catenaccio' && progresion) x += p.tacticas.catenaccio.ofensiva;
  if (td.alturaBloque === 'catenaccio' && zona >= 3) x -= p.tacticas.catenaccio.defensiva;
  if (td.sistemaDefensivo === 'individual') {
    x -= p.tacticas.individual.recuperacion;
    if (accion === 'pase_espacio') x += p.tacticas.individual.vulnerableDesmarque * 2;
  }
  // La presión alta recupera en campo rival, pero deja la espalda expuesta a balones largos.
  if (td.alturaBloque === 'presion_alta') {
    if (zona <= 2) x -= p.tacticas.presionAlta.recuperacionCampoRival;
    if (accion === 'pase_largo' || accion === 'pase_espacio') x += p.tacticas.presionAlta.vulnerableEspalda * 2;
  }
  if (td.lineaAdelantada && accion === 'pase_espacio') x += p.tacticas.lineaAdelantada.vulnerableEspalda * 2;
  if (ta.estiloConBalon === 'combinativo' && accion === 'pase_corto') x -= p.tacticas.combinativo.perdidasPase * 4;
  if (ta.estiloConBalon === 'contraataque' && (accion === 'pase_corto' || accion === 'conduccion') && zona <= 2) {
    x += p.tacticas.contraataque.posesion;
  }
  return x;
}

/** Probabilidad (0–1) de avanzar una zona tras un pase corto completado. */
export function probabilidadAvance(estado: EstadoMotor, atacante: EquipoEstado, defensor: EquipoEstado, zona: number): number {
  const t = atacante.tactica;
  const a = estado.parametros.acciones;
  let p = zona >= 3 ? a.avanceZonaAlta : a.avanceZonaBaja;
  if (t.estiloConBalon === 'combinativo') p -= 0.1;
  if (t.estiloConBalon === 'contraataque') p += 0.08;
  if (t.alturaBloque === 'catenaccio') p -= 0.15;
  // Más ofensividad propia, más llegada; más ofensividad del rival, más espacios a su espalda.
  p += 0.04 * (ofensividad(atacante) + ofensividad(defensor));
  if (defensor.tactica.alturaBloque === 'catenaccio' && zona >= 2) p -= 0.08;
  return Math.min(0.85, Math.max(0.15, p));
}

/** Probabilidad (0–1) de que el balón vaya a una banda tras avanzar (amplitud y juego vertical). */
export function probabilidadBanda(atacante: EquipoEstado): number {
  return Math.min(0.85, Math.max(0.2, 0.45 + 0.08 * amplitud(atacante) + (atacante.tactica.juegoVertical ? 0.15 : 0)));
}
