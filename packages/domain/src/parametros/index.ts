/**
 * Parámetros de equilibrado versionados (data-model §1.5, research R7).
 *
 * Todas las magnitudes que la especificación no fija con un número concreto viven aquí. Cada
 * partido guarda la versión con la que se jugó. Cambiar un valor implica una nueva versión del
 * fichero y volver a ejecutar `pnpm balance`.
 */
import v1 from './v1.json';

export type GravedadLesion = 'leve' | 'media' | 'grave' | 'larga';

export interface ParametrosEquilibrado {
  version: string;
  /** Penalización de stats fuera de posición (FR-027): 0,25 = −25 %. */
  penalizacionFueraPosicion: number;
  /** Penalización de un jugador de campo en la portería o un portero fuera de ella. */
  penalizacionPorteria: number;
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
  };
  equipaciones: {
    /** Distancia RGB mínima para considerar que dos colores principales no se confunden (FR-031b). */
    umbralDistanciaColor: number;
  };
}

export const PARAMETROS_V1: ParametrosEquilibrado = v1;

const REGISTRO: Readonly<Record<string, ParametrosEquilibrado>> = { [v1.version]: PARAMETROS_V1 };

/** Parámetros vigentes para partidos nuevos. */
export function parametrosActuales(): ParametrosEquilibrado {
  return PARAMETROS_V1;
}

/** Parámetros de una versión concreta, para reproducir partidos antiguos (FR-040). */
export function parametrosPorVersion(version: string): ParametrosEquilibrado {
  const p = REGISTRO[version];
  if (!p) throw new Error(`Versión de parámetros desconocida: ${version}`);
  return p;
}
