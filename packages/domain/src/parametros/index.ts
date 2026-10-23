/**
 * Parámetros de equilibrado versionados (data-model §1.5, research R7).
 *
 * Todas las magnitudes que la especificación no fija con un número concreto viven aquí. Cada
 * partido guarda la versión con la que se jugó. Cambiar un valor implica una nueva versión del
 * fichero y volver a ejecutar `pnpm balance`.
 */
import v1 from './v1.json';
import v2 from './v2.json';
import v3 from './v3.json';
import v4 from './v4.json';

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
    /**
     * Segundos de juego que como mucho espera una decisión pedida con el balón en juego (002/FR-025a; spec 003, US5):
     * si no hay antes ninguna interrupción, el árbitro detiene el juego para el cambio.
     */
    esperaMaximaCambioS: number;
  };
  /**
   * Capa espacial del motor (research R3; FR-023, FR-025). Distancias en décimas de unidad de campo
   * (1 unidad ≈ 0,105 m) y velocidades en décimas por tick, en tiempo visual a x2 (23,5 ticks por segundo real).
   */
  espacio: {
    /**
     * Llegada al área con el balón en el último tercio (hallazgo H11): el extremo del lado contrario al balón se mete
     * hacia el segundo palo (`xExtremo`, acercándose al eje en `factorAncho`) y el mediapunta llega a la frontal
     * (`xMediapunta`). Coordenadas del equipo, en décimas de unidad.
     */
    llegadaAlArea: {
      xExtremo: number;
      xMediapunta: number;
      factorAncho: number;
      /** La llegada empieza ya en campo rival si el compañero progresa conduciendo o regateando (x del balón). */
      xProgresion: number;
      /** Intensidad según el desmarque (delanteros) o el posicionamiento (medios): 1 + (stat − 70) / pendienteStat. */
      pendienteStat: number;
    };
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
  asincrono: { nivelDecisiones: NivelDecisiones };
  /** Errores creíbles de los NPC por nivel (spec 003, FR-037 a FR-037b; research R12, data-model §6). */
  npc: { errores: Record<NivelDecisiones, ParametrosErroresNPC> };
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
    /**
     * Falta (agarrón) en un duelo aéreo dentro del área tras un centro o un córner (research R7). El penalti ya
     * no es una probabilidad fija: lo es toda falta cuyo punto está dentro del área real.
     */
    probabilidadFaltaDueloAereoArea: number;
    /** Multiplicador de la falta en un regate o una conducción frenados en el último tercio rival (research R7). */
    factorFaltaUltimoTercio: number;
    /**
     * Multiplicador de la probabilidad de falta dentro del área rival (spec 005, research R2): mantiene los penaltis
     * al subir las faltas. Neutro (1) en las versiones 1.x a 3.x.
     */
    factorFaltaArea?: number;
    /**
     * Multiplicador de la amarilla para quien ya tiene una (se arriesga menos; spec 005, research R2). En las versiones
     * 1.x a 3.x era la constante 0,4 del motor.
     */
    factorSegundaAmarilla?: number;
  };
  sobres: {
    /** Probabilidad de que el hueco "POR o DEF" sea un portero (FR-014). */
    probPorteroEnHuecoPorDef: number;
    /** Probabilidad de que la carta alta sea GOAT en lugar de Legendario (FR-014). */
    probGoatEnAlta: number;
  };
  virtudes: {
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
    /** Spec 005: Revulsivo multiplica sus stats por 1 + revulsivo; Versátil resta este tanto a su penalización. */
    revulsivo?: number;
    versatil?: number;
  };
  /** Defectos (spec 005, research R6 y R7): factores (neutro 1) y sumandos (neutro 0). */
  defectos?: ParametrosDefectos;
  /** Modo Duelo de jugadores (spec 005, research R9): peso de los rasgos y amplitud del Estado de forma en puntos. */
  duelos?: ParametrosDuelos;
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
    /** Dificultad añadida por cada zona más allá del centro del campo (zona 3, 4 y 5). */
    dificultadZona: number;
    /** Probabilidad de quedar solo ante el portero tras un regate o un pase al espacio que llegan al área. */
    probabilidadManoAMano: number;
    /** Probabilidad de que un centro vaya raso o atrás: lo remata, con el pie, el mejor colocado (H11). */
    centroRaso: number;
    /** Factor del peso como receptor del extremo o el mediapunta que ya está en el área rival (H11). */
    bonusLlegada: number;
    /** Probabilidad de que un regate ganado en campo rival lleve hacia dentro, en diagonal hacia el área (H11). */
    regateHaciaDentro: number;
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
  /** Receptor y tipo de pase por distancia y dirección reales (spec 003, research R3 y R4). */
  pases: {
    /** Pase corto: hasta esta distancia (décimas; 20 m). */
    distanciaCorto: number;
    /** Pase largo: más de esta distancia (décimas; 35 m). Entre las dos, pase medio. */
    distanciaLargo: number;
    /** Factor del receptor según su avance respecto al portador. */
    factorDireccion: { adelante: number; lateral: number; atrasCorto: number; atrasLargo: number };
    /** Peso del pase largo sin ningún motivo táctico y con alguno (R4). */
    factorSinMotivo: number;
    factorConMotivo: number;
    /** Cota del factor del pasador como receptor, `2^(atraccionPasador·(pase − 70)/10)`. */
    atraccionPasadorAcotada: [number, number];
  };
  /** Influencia de los stats en la elección de acciones y en la defensa (spec 003, research R5 y R9). */
  decision: {
    /** `factorStat(valor) = acotar(1 + k·(valor − 70)/10, min, max)`. */
    factores: Record<FactorDecision, { k: number; min: number; max: number }>;
    /** El radio de intervención de un defensor crece este tanto por cada punto de quite y anticipación sobre 70. */
    radioIntervencionPorPunto: number;
    /** Cota (±) del cambio del radio de intervención. */
    radioIntervencionMax: number;
    /** Conducción proporcional al espacio libre por delante (décimas y factores en la escala de `pesosConEspacio`). */
    conduccion: { espacioMin: number; espacioMax: number; factorMin: number; factorMax: number; distanciaMin: number; distanciaMax: number };
  };
  /** Tiro decidido y resuelto con la distancia y el ángulo reales (spec 003, research R6 y R7). */
  tiro: {
    /** Peso de tirar por tramos de distancia a la portería (metros); más allá del último, 0. */
    pesoPorTramo: { hastaM: number; peso: number }[];
    /** Por debajo de este ángulo de tiro no se tira; por debajo del reducido, peso a la mitad. */
    anguloMinimoGrados: number;
    anguloReducidoGrados: number;
    /** Término de la sigmoide de puerta y gol por cada 10 m por encima de 11 m. */
    pendienteDistancia: number;
    /** Término de la sigmoide por cada 10° de ángulo de tiro por debajo de `anguloReducidoGrados`. */
    pendienteAngulo: number;
    /** Con el portero rival a esta distancia de su línea (m), se puede tirar desde más de 35 m. */
    porteroAdelantadoM: number;
    /** Falta directa: se tira directo con esta probabilidad entre estas distancias y con ángulo central. */
    faltaDirectaTiro: { distanciaMinM: number; distanciaMaxM: number; probabilidad: number };
    /** Goles en propia puerta (FR-020, SC-003): despeje de centros (baja con la defensa) y tiros desviados. */
    autogol: { despejeCentro: number; despejeCentroPorPuntoDefensa: number; desvio: number };
  };
}

export interface ParametrosDefectos {
  /** Multiplicadores de probabilidad o de peso. */
  canchero: number;
  impulsivo: number;
  agresivo: number;
  fragil: number;
  indisciplinado: number;
  torpe: number;
  chupon: number;
  malDefensor: number;
  /** Puntos porcentuales sumados a la penalización por posición. */
  inflexible: number;
  /** Fracción restada a los stats (0,05 = −5 %). */
  polemico: number;
  rebelde: number;
  estrellita: number;
  /** Puntos sumados a cada GOAT rival en el campo. */
  provocador: number;
}

export interface ParametrosDuelos {
  pesoVirtud: number;
  pesoDefecto: number;
  /** El Estado de forma suma o resta hasta este número de puntos. */
  estadoForma: number;
}

/** Parámetros con las secciones de la spec 005 siempre presentes. */
export type ParametrosCompletos = ParametrosEquilibrado & {
  disciplina: ParametrosEquilibrado['disciplina'] & { factorFaltaArea: number; factorSegundaAmarilla: number };
  virtudes: ParametrosEquilibrado['virtudes'] & { revulsivo: number; versatil: number };
  defectos: ParametrosDefectos;
  duelos: ParametrosDuelos;
};

/** Valores neutros de los defectos: con ellos, un defecto no cambia nada (versiones 1.x a 3.x). */
export const DEFECTOS_NEUTROS: Readonly<ParametrosDefectos> = {
  canchero: 1,
  impulsivo: 1,
  agresivo: 1,
  fragil: 1,
  indisciplinado: 1,
  torpe: 1,
  chupon: 1,
  malDefensor: 1,
  inflexible: 0,
  polemico: 0,
  rebelde: 0,
  estrellita: 0,
  provocador: 0,
};

const DUELOS_NEUTROS: Readonly<ParametrosDuelos> = { pesoVirtud: 1, pesoDefecto: 1, estadoForma: 2 };

const completos = new WeakMap<ParametrosEquilibrado, ParametrosCompletos>();

/**
 * Parámetros con las secciones nuevas de la spec 005 rellenas con valores neutros cuando faltan (research R7): así
 * un partido 3.0.0 se juega exactamente igual con el motor de la spec 005. El resultado se guarda por objeto.
 */
export function parametrosEfectivos(p: ParametrosEquilibrado): ParametrosCompletos {
  let c = completos.get(p);
  if (!c) {
    c = {
      ...p,
      disciplina: { ...p.disciplina, factorFaltaArea: p.disciplina.factorFaltaArea ?? 1, factorSegundaAmarilla: p.disciplina.factorSegundaAmarilla ?? 0.4 },
      virtudes: { ...p.virtudes, revulsivo: p.virtudes.revulsivo ?? 0, versatil: p.virtudes.versatil ?? 0 },
      defectos: { ...DEFECTOS_NEUTROS, ...p.defectos },
      duelos: { ...DUELOS_NEUTROS, ...p.duelos },
    };
    completos.set(p, c);
  }
  return c;
}

/** Stats que influyen en la elección de acciones (research R9). */
export type FactorDecision = 'regate' | 'remate' | 'pase' | 'vision' | 'fisico';

/**
 * Parámetros 1.0.0 de la spec 001. Solo se conservan como dato para leer partidos antiguos: el motor de la
 * spec 002 no puede volver a simularlos (research R12).
 */
export const PARAMETROS_V1 = v1;

/**
 * Parámetros 2.0.0 de la spec 002. Solo se conservan como dato: el motor de la spec 003 no puede volver a
 * simular sus partidos (research R2). Se tipan como la versión actual para las pruebas que comprueban el rechazo.
 */
export const PARAMETROS_V2: ParametrosEquilibrado = v2 as unknown as ParametrosEquilibrado;

/** Niveles de los NPC y `automatico` (decisiones de los humanos ausentes, sin errores). */
export type NivelDecisiones = 'amateur' | 'intermedio' | 'avanzado' | 'PRO' | 'automatico';
export type FamiliaErrorNPC = 'draft' | 'alineacion' | 'colocacion' | 'formacion' | 'tactica' | 'lanzadores' | 'partido';

export interface ParametrosErroresNPC {
  /** Probabilidad (milésimas) de cometer un error en cada decisión de la familia. */
  probabilidad: Record<FamiliaErrorNPC, number>;
  /** Coste máximo de un error en puntos de fuerza de alineación (o de valor de carta en el draft). */
  costeMaximo: number;
  /** PRO: una decisión dudosa por draft (FR-037b). */
  dudosaPorDraft: boolean;
}

export const PARAMETROS_V3: ParametrosEquilibrado = v3 as ParametrosEquilibrado;

/** Parámetros 4.0.0 de la spec 005: defectos, virtudes nuevas, duelos y frecuencias de disciplina y lesiones. */
export const PARAMETROS_V4: ParametrosEquilibrado = v4 as ParametrosEquilibrado;

const REGISTRO: Readonly<Record<string, ParametrosEquilibrado>> = {
  [PARAMETROS_V3.version]: PARAMETROS_V3,
  [PARAMETROS_V4.version]: PARAMETROS_V4,
};

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
  return PARAMETROS_V4;
}

/** Versión mayor mínima que el motor actual puede simular (las 3.x y 4.x se reproducen). */
export const VERSION_MAYOR_SOPORTADA = 3;

/** Parámetros de una versión concreta, para reproducir un partido (FR-040). Las versiones 1.x y 2.x lanzan `VersionNoSoportada`. */
export function parametrosPorVersion(version: string): ParametrosEquilibrado {
  const p = REGISTRO[version];
  if (p) return p;
  if (versionMayor(version) < VERSION_MAYOR_SOPORTADA) throw new VersionNoSoportada(version);
  throw new Error(`Versión de parámetros desconocida: ${version}`);
}
