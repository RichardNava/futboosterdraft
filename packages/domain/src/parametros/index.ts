/**
 * Parámetros de equilibrado versionados (data-model §1.5, research R7).
 *
 * Todas las magnitudes que la especificación no fija con un número concreto viven aquí. Cada
 * partido guarda la versión con la que se jugó. Cambiar un valor implica una nueva versión del
 * fichero y volver a ejecutar `pnpm balance`.
 */
import v1 from './v1.json';
import v2 from './v2.json';

export type GravedadLesion = 'leve' | 'media' | 'grave' | 'larga';

/** Rol de origen o clase de destino en la tabla de penalizaciones por posición (FR-031, FR-032; research R12). */
export type RolPenalizacion = 'DEF' | 'MED' | 'MED_MCO' | 'MED_MD' | 'DEL';

export interface ParametrosEquilibrado {
  version: string;
  /** Penalización por posición de la spec 002 (FR-031, FR-032): misma demarcación, portería y cruces. */
  penalizacionPosicion: {
    mismaDemarcacion: number;
    porteria: number;
    cruces: { origen: RolPenalizacion; destino: RolPenalizacion; valor: number }[];
  };
  /** Reloj de la reproducción 2D (research R2, R6; FR-025, FR-025a). */
  reproduccion: {
    /** Ticks de juego por segundo real a x2 (K). */
    ticksPorSegundoX2: number;
    /** Límites del descuento de cada parte reglamentaria, en segundos de juego. */
    descuentoMinS: number;
    descuentoMaxS: number;
    /** Duración real de la pausa anunciada de un gol, a cualquier velocidad. */
    pausaGolMs: number;
    /** Duración real de cada lanzamiento de la tanda a x2 (la mitad con cada duplicación). */
    tandaLanzamientoMsX2: number;
    /** Ticks simulados por delante de la reproducción en la 2D en directo. */
    anticipacionTicks: number;
  };
  /**
   * Capa espacial del motor (research R3; FR-023, FR-025). Distancias en décimas de unidad de campo
   * (1 unidad ≈ 0,105 m) y velocidades en décimas por tick, en tiempo visual a x2 (23,5 ticks por segundo real).
   */
  espacio: {
    /** Velocidad máxima de un jugador según su stat de velocidad (de `statVelocidadMin` a `statVelocidadMax`). */
    velocidadJugadorMin: number;
    velocidadJugadorMax: number;
    statVelocidadMin: number;
    statVelocidadMax: number;
    /** Con el balón en los pies se corre algo menos. */
    factorVelocidadConBalon: number;
    /** Cambio máximo de velocidad por tick al acelerar y al frenar. */
    aceleracion: number;
    frenada: number;
    /** Distancia mínima entre dos chapas. */
    radioSeparacion: number;
    velocidadBalon: Record<'raso' | 'largo' | 'centro' | 'tiro' | 'despeje' | 'suelto', number>;
    vueloMinimoTicks: number;
    /** Tiempo con el balón antes de un pase (control y preparación) y su máximo si el receptor aún llega. */
    controlMinimoTicks: number;
    controlMaximoTicks: number;
    /** Distancia máxima de una conducción o un regate (décimas). */
    conduccionMaxima: number;
    /** Ticks que se espera, además de la parada, a que quien saca llegue al punto del saque. */
    esperaSaqueMaxima: number;
    /** Ticks más que puede esperar un córner o una falta al área a que los rematadores lleguen a su sitio. */
    esperaColocacionMaxima: number;
    /** Velocidad máxima (décimas por tick) a la que la forma de los equipos sigue al balón. */
    velocidadBasculacion: number;
    /** Cuánto sigue cada línea al balón, en largo y en ancho (fracción de la distancia del balón al centro). */
    basculacionLarga: Record<'porteria' | 'defensa' | 'medio' | 'ataque', number>;
    basculacionAncha: Record<'porteria' | 'defensa' | 'medio' | 'ataque', number>;
    /** Lo que sube el equipo con balón y se repliega el que no lo tiene. */
    desplazamientoFase: { conBalon: number; sinBalon: number };
    /** Apertura del equipo con balón y cierre del que defiende (fracción de la distancia al eje). */
    aperturaConBalon: number;
    cierreSinBalon: number;
    desplazamientoBloque: Record<'catenaccio' | 'medio' | 'presion_alta', number>;
    lineaAdelantada: number;
    /** Distancia entre líneas consecutivas (FR-023): [mínima, máxima]. */
    separacionLineasConBalon: [number, number];
    separacionLineasSinBalon: [number, number];
    /** Jugadores que van a la vez al balón; en presión coordinada, más y durante un tiempo limitado. */
    presionadores: number;
    presionCoordinada: { jugadores: number; ticks: number };
    /** A partir de esta distancia nadie va al balón: se mantiene la forma. */
    distanciaPresion: number;
    /** Cuánto se pega cada defensor a su par con marcaje individual. */
    marcajeIndividual: number;
  };
  /** Colocación libre: ofensividad y amplitud calculadas y separación mínima (research R13). */
  colocacion: { beta: number; gamma: number; limite: number; separacionMinima: number };
  /** Partidos entre humanos resueltos sin ellos (research R8). */
  asincrono: { nivelDecisiones: 'amateur' | 'intermedio' | 'avanzado' | 'PRO' };
  draft: { margenAnimacionS: number };
  cansancio: {
    inicioMin: number;
    inicioMinPresionAlta: number;
    /** Fracción de stats perdida por minuto a partir del inicio. */
    degradacionPorMinuto: number;
    /** Multiplicador del ritmo de degradación del propio jugador con Incansable. */
    factorIncansable: number;
    /** Multiplicador del ritmo de los compañeros con un Motivador en el campo. */
    factorMotivador: number;
  };
  lesiones: {
    probabilidadPorEntrada: number;
    /** Reducción relativa de la probabilidad de lesión con Robusto. */
    reduccionRobusto: number;
    reparto: Record<GravedadLesion, number>;
    partidos: Record<GravedadLesion, number>;
  };
  disciplina: {
    probabilidadFaltaPorEntrada: number;
    probabilidadAmarillaPorFalta: number;
    probabilidadRojaDirectaPorFalta: number;
    probabilidadPenaltiPorFaltaEnArea: number;
  };
  sobres: {
    /** Probabilidad de que el hueco "POR o DEF" sea un portero (FR-014). */
    probPorteroEnHuecoPorDef: number;
    /** Probabilidad de que la carta alta sea GOAT en lugar de Legendario (FR-014). */
    probGoatEnAlta: number;
  };
  specials: {
    capitania: number;
    fortalezaMental: number;
    intimidante: number;
    infranqueable: number;
    infranqueableUmbralRegate: number;
    jerarquia: number;
    libero: number;
    boxToBox: number;
    bonusProbabilidadLeve: number;
    bonusProbabilidadMedio: number;
    bonusProbabilidadAlto: number;
    santoMinutoInicio: number;
  };
  duelo: {
    /** Pendiente de la logística: cuánto pesa cada punto de diferencia de stats. */
    pendiente: number;
    probabilidadMinima: number;
    probabilidadMaxima: number;
  };
  formaciones: {
    /** Cambio relativo de ocasiones (propias y concedidas) por punto de ofensividad (FR-034). */
    efectoOfensividad: number;
    /** Cambio relativo de acciones por banda por punto de amplitud. */
    efectoAmplitud: number;
  };
  tacticas: {
    individual: { recuperacion: number; cansancio: number; vulnerableDesmarque: number };
    catenaccio: { ofensiva: number; defensiva: number; posesionRival: number };
    presionAlta: { recuperacionCampoRival: number; cansancio: number; vulnerableEspalda: number };
    lineaAdelantada: { fuerasDeJuegoProvocados: number; vulnerableEspalda: number };
    contraataque: { posesion: number; peligroTransicion: number };
    combinativo: { posesion: number; perdidasPase: number };
    vertical: { accionesBanda: number; pasesLargos: number };
  };
  /** Dificultad base de cada acción en la escala de la sigmoide (más alto = más fácil). */
  acciones: {
    paseCorto: number;
    paseLargo: number;
    conduccion: number;
    regate: number;
    paseEspacio: number;
    centro: number;
    duelaAereo: number;
    despejeBalonParado: number;
    /** Base para que un tiro vaya a puerta, por tipo de tiro. */
    puerta: Record<'normal' | 'cabeza' | 'lejano' | 'manoAMano' | 'falta' | 'penalti', number>;
    /** Base para que un tiro a puerta sea gol (frente a la parada del portero). */
    gol: Record<'normal' | 'cabeza' | 'lejano' | 'manoAMano' | 'falta' | 'penalti', number>;
    probabilidadFueraDeJuegoBase: number;
    probabilidadCornerTrasParada: number;
    probabilidadCornerTrasDespeje: number;
    probabilidadBalonFuera: number;
    probabilidadFaltaDirectaTiro: number;
    /** Dificultad añadida por cada zona más allá del centro del campo (zona 3, 4 y 5). */
    dificultadZona: number;
    /** Probabilidad de quedar solo ante el portero tras un regate o un pase al espacio que llegan al área. */
    probabilidadManoAMano: number;
    /** Probabilidad base de avanzar una zona tras un pase corto, en campo propio y en campo rival. */
    avanceZonaBaja: number;
    avanceZonaAlta: number;
    /** Probabilidad de llegar al área con un pase corto desde la frontal. */
    llegadaArea: number;
    /** Cuánto crece el peso de los pases por cada 10 puntos de stat de pase sobre la referencia (SC-008). */
    pesoPasePorStat: number;
    statPaseReferencia: number;
    /** Multiplicador de la pendiente del duelo en los pases: cuánto pesa el stat de pase en completarlos. */
    pendientePase: number;
    /** El peso como receptor se multiplica por 2^(atraccionPasador × puntos de pase sobre la referencia / 10) (SC-008). */
    atraccionPasador: number;
    /** Ticks mínimos de control antes de un pase con el pase medio de los centrocampistas en la referencia. */
    controlPaseTicks: number;
    /** Ticks de control menos por cada 10 puntos de pase medio de los centrocampistas sobre la referencia. */
    controlPorStat: number;
  };
  equipaciones: {
    /** Distancia RGB mínima para considerar que dos colores principales no se confunden (FR-031b). */
    umbralDistanciaColor: number;
  };
}

/**
 * Parámetros 1.0.0 de la spec 001. Solo se conservan como dato para leer partidos antiguos: el motor de la
 * spec 002 no puede volver a simularlos (research R12).
 */
export const PARAMETROS_V1 = v1;

export const PARAMETROS_V2: ParametrosEquilibrado = v2 as ParametrosEquilibrado;

const REGISTRO: Readonly<Record<string, ParametrosEquilibrado>> = { [PARAMETROS_V2.version]: PARAMETROS_V2 };

/** Error al pedir parámetros de una versión que el motor actual ya no puede simular. */
export class VersionNoSoportada extends Error {
  readonly codigo = 'VERSION_NO_SOPORTADA';
  constructor(readonly version: string) {
    super(`Los parámetros ${version} no se pueden simular con el motor actual`);
  }
}

/** Versión mayor de unos parámetros (`'2.0.0'` → 2). */
export function versionMayor(version: string): number {
  return Number(version.split('.')[0]);
}

/** Parámetros vigentes para partidos nuevos. */
export function parametrosActuales(): ParametrosEquilibrado {
  return PARAMETROS_V2;
}

/** Parámetros de una versión concreta, para reproducir un partido (FR-040). Las versiones 1.x lanzan `VersionNoSoportada`. */
export function parametrosPorVersion(version: string): ParametrosEquilibrado {
  const p = REGISTRO[version];
  if (p) return p;
  if (versionMayor(version) < 2) throw new VersionNoSoportada(version);
  throw new Error(`Versión de parámetros desconocida: ${version}`);
}
