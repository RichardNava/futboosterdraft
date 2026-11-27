/**
 * Efectos de la formación (FR-034) y de la táctica (FR-035) sobre las acciones (T083).
 *
 * Ofensividad: en cada duelo de ataque se suman la ofensividad del atacante (más llegada) y la del
 * defensor (más espacios a su espalda). Así una formación ofensiva genera más ocasiones propias y
 * también concede más; una defensiva, menos de ambas.
 */
import type { EquipoEstado, EstadoMotor, JugadorEnPartido } from '../estado/estado';
import type { Lado } from '../tipos';

/** Acciones con balón. `tiro` sustituye a `remate` y `tiro_lejano`: su peso sale de la distancia real (spec 003, R6). */
export type TipoAccion = 'pase_corto' | 'pase_largo' | 'conduccion' | 'regate' | 'pase_espacio' | 'centro' | 'tiro';

/** Perfil calculado con la colocación (FR-034b): el de la formación si nadie se ha movido de su zona. */
export const ofensividad = (e: EquipoEstado) => e.perfil.ofensividad;
/** Amplitud del equipo (calculada con su colocación). */
const amplitud = (e: EquipoEstado) => e.perfil.amplitud;

/**
 * Pesos de cada acción según la zona del balón, la táctica y la formación del equipo atacante. El tiro no está
 * aquí: lo añade `pesosConEspacio` con la distancia y el ángulo reales del tirador (spec 003, research R6).
 */
export function pesosAcciones(atacante: EquipoEstado, zona: number, carril: number, p: EstadoMotor['parametros']): [TipoAccion, number][] {
  const enBanda = carril !== 1;
  const base: Record<number, [TipoAccion, number][]> = {
    0: [
      ['pase_corto', 70],
      ['pase_largo', 30],
    ],
    // En el campo propio y en el centro se conduce más cuando hay espacio (spec 003, research R5).
    1: [
      ['pase_corto', 55],
      ['pase_largo', 20],
      ['conduccion', 32],
    ],
    2: [
      ['pase_corto', 45],
      ['pase_espacio', 10],
      ['conduccion', 32],
      ['regate', 10],
      ['pase_largo', 10],
    ],
    3: [
      ['pase_corto', 38],
      ['pase_espacio', 18],
      ['conduccion', 20],
      ['regate', 14],
      ['centro', enBanda ? 14 : 0],
    ],
    4: [
      ['pase_corto', 26],
      ['regate', 20],
      ['centro', enBanda ? 24 : 3],
      ['pase_espacio', 16],
    ],
    // Dentro del área no siempre hay remate: a veces hay que pasar o regatear (el tiro lo añade `pesosConEspacio`).
    5: [
      ['pase_corto', 33],
      ['regate', 27],
    ],
  };
  const t = atacante.tactica;
  const o = ofensividad(atacante);
  const pesos = p.tacticas.pesos;
  const porBandas = t.estiloConBalon === 'bandas';
  return (base[zona] ?? base[2]!).map(([accion, peso]) => {
    let f = 1;
    if (t.estiloConBalon === 'combinativo') f *= pesos.combinativo[accion] ?? 1;
    if (t.estiloConBalon === 'contraataque') f *= pesos.contraataque[accion] ?? 1;
    // Bandas + Vertical tiene su propio valor de centros: no es el producto de ambas (FR-031).
    if (porBandas && t.juegoVertical && accion === 'centro') f *= p.tacticas.bandasVertical.centro;
    else {
      if (t.juegoVertical) f *= pesos.vertical[accion] ?? 1;
      // Spec 015, añadidos (R13): por las bandas se centra más.
      if (porBandas && accion === 'centro') f *= p.bandas.centro;
    }
    if (porBandas && accion === 'pase_espacio') f *= p.tacticas.bandas.factorPaseEspacio;
    if (t.alturaBloque === 'catenaccio') f *= pesos.catenaccio[accion] ?? 1;
    // Las formaciones ofensivas buscan más el último pase (el tiro, en `pesosConEspacio`).
    if (accion === 'pase_espacio' || accion === 'regate') f *= 1 + pesos.ofensividadUltimoPase * o;
    return [accion, Math.max(0, Math.round(peso * f))];
  });
}

/** Desplazamiento (escala de la sigmoide) a favor del atacante en una acción de progresión o de tiro. */
/**
 * Relajación del que gana de mucho (parámetros 6.2.0; spec 012, ronda 2): con `ventajaMinima` goles de ventaja o más,
 * `porGol` por cada gol desde ahí, hasta `maximo`, en la escala de la sigmoide. Resta a sus tiros y, multiplicada por
 * `ataque`, a su progresión en el último tercio. No consume PRNG.
 */
export function relajacion(estado: Pick<EstadoMotor, 'parametros' | 'marcador'>, lado: Lado): number {
  const r = estado.parametros.relajacion;
  const ventaja = estado.marcador[lado] - estado.marcador[lado === 'local' ? 'visitante' : 'local'];
  return ventaja < r.ventajaMinima ? 0 : Math.min(r.maximo, r.porGol * (ventaja - r.ventajaMinima + 1));
}

/**
 * Desplazamiento de la sigmoide de una acción de ataque por formación, zona, relajación y tácticas de los dos equipos
 * (positivo = más fácil para el atacante). `portador` y `lejano` (tiro desde fuera del área) deciden los efectos de
 * Catenaccio e Individual (spec 018, R10).
 */
export function desplazamientoAtaque(
  estado: EstadoMotor,
  atacante: EquipoEstado,
  defensor: EquipoEstado,
  accion: TipoAccion,
  zona: number,
  portador?: JugadorEnPartido,
  lejano = false,
): number {
  const p = estado.parametros;
  let x = p.formaciones.efectoOfensividad * (ofensividad(atacante) + ofensividad(defensor));
  // Cuanto más cerca del área rival, más cuesta progresar.
  if (zona >= 3 && accion !== 'pase_corto') x -= p.acciones.dificultadZona * (zona - 2);
  if (zona >= 4 && accion === 'pase_corto') x -= p.acciones.dificultadZona;
  if (zona >= 3) x -= p.relajacion.ataque * relajacion(estado, atacante.lado);
  const ta = atacante.tactica;
  const td = defensor.tactica;
  const progresion = accion !== 'pase_corto' || zona >= 3;
  if (ta.alturaBloque === 'catenaccio' && progresion) x += p.tacticas.catenaccio.ofensiva;
  // Catenaccio cierra el área: ni los centros ni los tiros lejanos lo notan (FR-024).
  if (td.alturaBloque === 'catenaccio' && zona >= p.tacticas.catenaccio.zonaMinima && accion !== 'centro' && !(accion === 'tiro' && lejano)) {
    x -= p.tacticas.catenaccio.defensiva;
  }
  // Individual abre huecos: al regate rival y a los compañeros de la estrella, o a todos si ella ha salido (FR-027).
  if (td.sistemaDefensivo === 'individual') {
    if (accion === 'regate') x += p.tacticas.individual.regate;
    const m = defensor.marcajeEstrella;
    if (m && portador && portador.casillaId !== 'POR' && portador.id !== m.estrellaId) x += p.tacticas.individual.companeros;
  }
  if (ta.juegoVertical && (accion === 'pase_largo' || accion === 'pase_espacio')) x -= p.tacticas.vertical.costePase;
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
  const av = estado.parametros.tacticas.avance;
  let p = zona >= 3 ? a.avanceZonaAlta : a.avanceZonaBaja;
  if (t.estiloConBalon === 'combinativo') p += av.combinativo;
  if (t.estiloConBalon === 'contraataque') p += av.contraataque;
  if (t.alturaBloque === 'catenaccio') p += av.catenaccio;
  // El catenaccio no instala el juego en campo rival: le cuesta más pisarlo y quedarse en él.
  if (t.alturaBloque === 'catenaccio' && zona >= 2) p -= estado.parametros.tacticas.catenaccio.posesionRival;
  // Más ofensividad propia, más llegada; más ofensividad del rival, más espacios a su espalda.
  p += av.ofensividad * (ofensividad(atacante) + ofensividad(defensor));
  if (defensor.tactica.alturaBloque === 'catenaccio' && zona >= 2) p += av.rivalCatenaccio;
  return Math.min(av.maximo, Math.max(av.minimo, p));
}

/** Probabilidad (0–1) de que el balón vaya a una banda tras avanzar (amplitud, juego vertical y por las bandas). */
export function probabilidadBanda(atacante: EquipoEstado, p: EstadoMotor['parametros']): number {
  const a = p.tacticas.avance;
  const porBandas = atacante.tactica.estiloConBalon === 'bandas';
  const vertical = atacante.tactica.juegoVertical;
  // Spec 015 (R13): por las bandas el balón va más por fuera. Spec 018 (FR-031): con Vertical, su valor propio.
  const extra = porBandas && vertical ? p.tacticas.bandasVertical.probabilidadBanda : (porBandas ? p.bandas.probabilidadBanda : 0) + (vertical ? a.bandaVertical : 0);
  return Math.min(a.bandaMaxima, Math.max(a.bandaMinima, a.bandaBase + a.bandaAmplitud * amplitud(atacante) + extra));
}

/** Quien juega por las bandas y pierde el balón en un carril exterior deja una ventaja al que lo recupera (FR-029, R12). */
export function guardarVentajaBanda(estado: EstadoMotor, pierde: EquipoEstado, recupera: Lado, carril: number): void {
  estado.ventajaBanda = pierde.tactica.estiloConBalon === 'bandas' && carril !== 1 ? { lado: recupera, carril } : null;
}

/** La primera acción tras recuperar consume siempre la ventaja: +`ventajaPerdida` si sigue por ese carril (FR-029). */
export function consumirVentajaBanda(estado: EstadoMotor, atacante: EquipoEstado, accion: TipoAccion, carril: number): number {
  const v = estado.ventajaBanda;
  if (!v) return 0;
  estado.ventajaBanda = null;
  return v.lado === atacante.lado && accion !== 'tiro' && carril === v.carril ? estado.parametros.tacticas.bandas.ventajaPerdida : 0;
}
