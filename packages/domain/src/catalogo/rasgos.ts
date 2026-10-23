/**
 * Tabla única de rasgos: virtudes y defectos (spec 005, research R8; FR-050 a FR-055; contracts/rasgos.md).
 *
 * Es la fuente de los textos de la interfaz (`GET /api/catalogo/rasgos`), del documento de referencia
 * `docs/juego/virtudes-y-defectos.md` (que se genera a partir de ella) y del impacto con que la IA y el modo Duelo
 * de jugadores valoran cada rasgo.
 *
 * Impacto (0..1, dos decimales): en una virtud, 1 = la más beneficiosa; en un defecto, 0 = el más perjudicial.
 */
import {
  DEFECTOS,
  NIVELES,
  TODAS_LAS_VIRTUDES,
  VIRTUDES_DEF,
  VIRTUDES_DEL,
  VIRTUDES_MED,
  VIRTUDES_POR,
  type Defecto,
  type Demarcacion,
  type Nivel,
  type Rasgo,
  type Virtud,
} from './tipos';

export type TipoRasgo = 'virtud' | 'defecto';
export type AmbitoRasgo = 'generico' | Demarcacion;

export interface DefinicionRasgo {
  id: Rasgo;
  tipo: TipoRasgo;
  ambito: AmbitoRasgo;
  /** Texto de la interfaz, con tildes. */
  nombre: string;
  /** Descripción para el participante. */
  descripcion: string;
  /** Regla exacta en el partido. */
  efecto: string;
  /** Cuándo está activo. */
  activacion: string;
  /** Regla de acumulación (FR-016, 001/FR-038). */
  acumulacion: string;
  /** Rasgos que no pueden estar en la misma carta (simétrico). */
  incompatibles: readonly Rasgo[];
  impacto: number;
}

type Entrada = Omit<DefinicionRasgo, 'id' | 'tipo' | 'ambito' | 'incompatibles'>;

const EN_CAMPO = 'Mientras está en el campo.';
const SIEMPRE = 'Siempre.';
const EQUIPO_UNA_VEZ = 'Una sola vez por equipo, aunque la tengan varios jugadores en el campo.';
const PROPIA = 'Solo afecta al propio jugador.';
const DEFECTO_UNA_VEZ = 'Un mismo defecto cuenta una sola vez por equipo; defectos distintos se multiplican entre sí.';

const VIRTUDES: Readonly<Record<Virtud, Entrada>> = {
  Incansable: {
    nombre: 'Incansable',
    descripcion: 'Gran capacidad aeróbica: su nivel se degrada menos por el cansancio y puede presionar y sumarse al ataque constantemente.',
    efecto: 'Su ritmo de degradación por cansancio se multiplica por `cansancio.factorIncansable` (0,5).',
    activacion: 'Desde el inicio del cansancio.',
    acumulacion: PROPIA,
    impacto: 0.45,
  },
  Motivador: {
    nombre: 'Motivador',
    descripcion: 'La degradación por cansancio de sus compañeros es más lenta mientras está en el campo.',
    efecto: 'El ritmo de degradación de sus compañeros se multiplica por `cansancio.factorMotivador` (0,75).',
    activacion: EN_CAMPO,
    acumulacion: EQUIPO_UNA_VEZ,
    impacto: 0.55,
  },
  LanzadorFaltas: {
    nombre: 'Lanzador de faltas',
    descripcion: 'Aumenta el disparo y la probabilidad de gol lanzando faltas.',
    efecto: 'Más probabilidad de gol de falta directa (+30 %) y más tiros directos (× 1,3). Es el lanzador de faltas propuesto.',
    activacion: 'Al lanzar una falta directa.',
    acumulacion: PROPIA,
    impacto: 0.4,
  },
  LanzadorPenalties: {
    nombre: 'Lanzador de penalties',
    descripcion: 'Aumenta el disparo y la probabilidad de gol lanzando penaltis.',
    efecto: 'Más probabilidad de gol de penalti. Es el lanzador de penaltis propuesto.',
    activacion: 'Al lanzar un penalti, también en la tanda.',
    acumulacion: PROPIA,
    impacto: 0.35,
  },
  Aura: {
    nombre: 'Aura',
    descripcion: 'Aumenta la probabilidad de acciones exitosas mientras está en el campo.',
    efecto: '+`virtudes.bonusProbabilidadLeve` (0,04) a la probabilidad de éxito de sus duelos, y lo mismo en contra de quien le defiende.',
    activacion: EN_CAMPO,
    acumulacion: PROPIA,
    impacto: 0.7,
  },
  Capitania: {
    nombre: 'Capitanía',
    descripcion: 'Aumenta en +1 la media de todos los jugadores del campo mientras está jugando.',
    efecto: '+`virtudes.capitania` (1) a todos los stats de los jugadores de su equipo en el campo.',
    activacion: EN_CAMPO,
    acumulacion: EQUIPO_UNA_VEZ,
    impacto: 0.8,
  },
  Filigranas: {
    nombre: 'Filigranas',
    descripcion: 'Repite la tirada (y se queda con la mejor) cuando intenta regatear a un defensor.',
    efecto: 'Repite la tirada de sus regates y se queda con la mejor.',
    activacion: 'Al regatear.',
    acumulacion: PROPIA,
    impacto: 0.5,
  },
  FortalezaMental: {
    nombre: 'Fortaleza mental',
    descripcion: 'Aumenta en +2 la media de todos los jugadores del campo cuando su equipo va por detrás en el marcador.',
    efecto: '+`virtudes.fortalezaMental` (2) a todos los stats de los jugadores de su equipo en el campo.',
    activacion: 'Mientras está en el campo y su equipo va perdiendo.',
    acumulacion: EQUIPO_UNA_VEZ,
    impacto: 0.6,
  },
  Intimidante: {
    nombre: 'Intimidante',
    descripcion: 'Reduce en −1 los atributos enfrentados del rival más cercano.',
    efecto: '−`virtudes.intimidante` (1) a los stats del rival en cada duelo en que participa.',
    activacion: 'En sus duelos.',
    acumulacion: PROPIA,
    impacto: 0.45,
  },
  Elegante: {
    nombre: 'Elegante',
    descripcion: 'Mayor probabilidad de salir de la presión y de las acciones defensivas rivales.',
    efecto: 'Más probabilidad de completar sus pases y de superar la presión.',
    activacion: 'Con el balón.',
    acumulacion: PROPIA,
    impacto: 0.4,
  },
  Presionador: {
    nombre: 'Presionador',
    descripcion: 'Ejerce más presión sin balón, aumentando sus labores defensivas.',
    efecto: 'Provoca más pérdidas del rival cuando presiona.',
    activacion: 'Sin el balón.',
    acumulacion: PROPIA,
    impacto: 0.45,
  },
  RecuperadorTrasPerdida: {
    nombre: 'Recuperador tras pérdida',
    descripcion: 'Cuando pierde el balón, presiona con mucha intensidad para recuperarlo.',
    efecto: 'Más probabilidad de recuperar el balón justo después de perderlo.',
    activacion: 'Tras una pérdida propia.',
    acumulacion: PROPIA,
    impacto: 0.4,
  },
  Carismatico: {
    nombre: 'Carismático',
    descripcion: 'Sus compañeros le buscan con más frecuencia para asociarse con él.',
    efecto: 'Más peso como receptor de los pases de sus compañeros.',
    activacion: EN_CAMPO,
    acumulacion: PROPIA,
    impacto: 0.3,
  },
  Potente: {
    nombre: 'Potente',
    descripcion: 'Mayor probabilidad de salir airoso de duelos y choques con rivales.',
    efecto: 'Más probabilidad de ganar los duelos de regate y conducción.',
    activacion: 'En sus duelos.',
    acumulacion: PROPIA,
    impacto: 0.45,
  },
  Robusto: {
    nombre: 'Robusto',
    descripcion: 'Menor probabilidad de lesionarse, y lesiones menos graves.',
    efecto: 'Su probabilidad de lesión se reduce un `lesiones.reduccionRobusto` (45 %).',
    activacion: SIEMPRE,
    acumulacion: PROPIA,
    impacto: 0.3,
  },
  DeAcero: {
    nombre: 'De acero',
    descripcion: 'Nunca se lesiona.',
    efecto: 'Su probabilidad de lesión es 0. Se comprueba antes que cualquier otro factor.',
    activacion: SIEMPRE,
    acumulacion: PROPIA,
    impacto: 0.4,
  },
  Versatil: {
    nombre: 'Versátil',
    descripcion: 'Jugando fuera de su posición, su penalización es 5 puntos menor.',
    efecto:
      'Si su penalización por posición es mayor que 0, se le restan `virtudes.versatil` (0,05, es decir, 5 puntos porcentuales), con un mínimo de 0.',
    activacion: 'Jugando fuera de su posición.',
    acumulacion: PROPIA,
    impacto: 0.25,
  },
  FairPlayer: {
    nombre: 'Fair player',
    descripcion: 'Nunca ve la tarjeta roja.',
    efecto: 'No recibe rojas directas. La segunda amarilla queda registrada, pero no le expulsa.',
    activacion: SIEMPRE,
    acumulacion: PROPIA,
    impacto: 0.3,
  },
  Revulsivo: {
    nombre: 'Revulsivo',
    descripcion: 'Si entra desde el banquillo, su media sube un 5 % el resto del partido.',
    efecto: 'Sus stats se multiplican por 1 + `virtudes.revulsivo` (1,05) si entró desde el banquillo, también al sustituir a un lesionado.',
    activacion: 'Desde que entra desde el banquillo hasta el final del partido.',
    acumulacion: PROPIA,
    impacto: 0.3,
  },
  Parapenalties: {
    nombre: 'Parapenalties',
    descripcion: 'Aumenta considerablemente su porcentaje de paradas en penaltis.',
    efecto: 'Más probabilidad de parar los penaltis, también en la tanda.',
    activacion: 'Ante un penalti.',
    acumulacion: PROPIA,
    impacto: 0.35,
  },
  OneToOne: {
    nombre: 'One-to-One',
    descripcion: 'Especialista en el uno contra uno, sobre todo ante atacantes con mucho regate.',
    efecto: 'Más probabilidad de parar los mano a mano.',
    activacion: 'Ante un mano a mano.',
    acumulacion: PROPIA,
    impacto: 0.55,
  },
  Santo: {
    nombre: 'Santo',
    descripcion:
      'Providencial en los momentos clave: desde el minuto 80, en la prórroga y en eliminatorias defendiendo un resultado, repite la tirada ante los disparos rivales.',
    efecto: 'Repite la tirada de parada y se queda con la mejor.',
    activacion: 'Desde el minuto `virtudes.santoMinutoInicio` (80), en la prórroga, en la tanda y en eliminatorias sin ir perdiendo.',
    acumulacion: PROPIA,
    impacto: 0.6,
  },
  Ordenabarreras: {
    nombre: 'Ordenabarreras',
    descripcion: 'Aumenta la probabilidad de parada en disparos a balón parado.',
    efecto: 'Más probabilidad de parar las faltas directas.',
    activacion: 'Ante una falta directa.',
    acumulacion: PROPIA,
    impacto: 0.35,
  },
  JugadorDeCampo: {
    nombre: 'Jugador de campo',
    descripcion: 'Sale con el balón jugado y tiene un regate casi infalible en su propia área.',
    efecto: 'Mejor salida de balón y regate casi seguro en su propia área.',
    activacion: 'Con el balón en su área.',
    acumulacion: PROPIA,
    impacto: 0.3,
  },
  Infranqueable: {
    nombre: 'Infranqueable',
    descripcion: 'Aumenta en +2 el tackling y el marcaje frente a jugadores con regate de 95 o más.',
    efecto: '+`virtudes.infranqueable` (2) a tackling y marcaje frente a regate ≥ `virtudes.infranqueableUmbralRegate` (95).',
    activacion: 'En sus duelos defensivos.',
    acumulacion: PROPIA,
    impacto: 0.45,
  },
  Jerarquia: {
    nombre: 'Jerarquía',
    descripcion: 'Aumenta en +1 la media defensiva del equipo.',
    efecto: '+`virtudes.jerarquia` (1) a los stats de los defensas de su equipo.',
    activacion: EN_CAMPO,
    acumulacion: EQUIPO_UNA_VEZ,
    impacto: 0.55,
  },
  Volador: {
    nombre: 'Volador',
    descripcion: 'Aumenta mucho su probabilidad de despeje en balones parados.',
    efecto: 'Más probabilidad de despejar los centros y los balones parados rivales.',
    activacion: 'En los balones parados rivales.',
    acumulacion: PROPIA,
    impacto: 0.4,
  },
  Libero: {
    nombre: 'Líbero',
    descripcion: 'Aumenta en +2 la media del centro del campo.',
    efecto: '+`virtudes.libero` (2) a los stats de los centrocampistas de su equipo.',
    activacion: EN_CAMPO,
    acumulacion: EQUIPO_UNA_VEZ,
    impacto: 0.65,
  },
  MuroDefensivo: {
    nombre: 'Muro defensivo',
    descripcion: 'En las intercepciones dentro del área, repite la tirada y se queda con la mejor.',
    efecto: 'Repite la tirada de sus intercepciones en el área.',
    activacion: 'Defendiendo en su área.',
    acumulacion: PROPIA,
    impacto: 0.5,
  },
  Llegador: {
    nombre: 'Llegador',
    descripcion: 'Se incorpora al ataque con frecuencia: más probabilidad de gol cerca del área.',
    efecto: 'Entra entre los rematadores de los centros y tiene más probabilidad de gol.',
    activacion: 'En ataque.',
    acumulacion: PROPIA,
    impacto: 0.5,
  },
  BoxToBox: {
    nombre: 'Box-to-Box',
    descripcion: 'Abarca mucho campo: otorga +1 a la media de la defensa y del ataque.',
    efecto: '+`virtudes.boxToBox` (1) a los stats de los defensas y los delanteros de su equipo.',
    activacion: EN_CAMPO,
    acumulacion: EQUIPO_UNA_VEZ,
    impacto: 0.7,
  },
  PrimerToque: {
    nombre: 'Primer toque',
    descripcion: 'Distribuye el balón al primer toque con menos probabilidad de pérdida.',
    efecto: 'Más probabilidad de completar sus pases.',
    activacion: 'Con el balón.',
    acumulacion: PROPIA,
    impacto: 0.45,
  },
  Todocampista: {
    nombre: 'Todocampista',
    descripcion: 'Cubre más zonas del campo: no tiene penalización por jugar fuera de posición (salvo en la portería).',
    efecto: 'Su penalización por posición es 0, salvo en la portería.',
    activacion: 'Jugando fuera de su posición.',
    acumulacion: PROPIA,
    impacto: 0.5,
  },
  JugadorEntreLineas: {
    nombre: 'Jugador entre líneas',
    descripcion: 'Más probabilidad de éxito cuando juega entre líneas.',
    efecto: 'Más probabilidad de completar sus pases entre líneas.',
    activacion: 'Con el balón entre líneas.',
    acumulacion: PROPIA,
    impacto: 0.45,
  },
  Matador: {
    nombre: 'Matador',
    descripcion: 'Más probabilidad de gol cuando es el último jugador delante del portero.',
    efecto: 'Más probabilidad de gol en el mano a mano; en esa jugada siempre tira.',
    activacion: 'En un mano a mano.',
    acumulacion: PROPIA,
    impacto: 0.65,
  },
  Rematador: {
    nombre: 'Rematador',
    descripcion: 'Más probabilidad de gol cuando le centran un balón.',
    efecto: 'Más probabilidad de gol en los remates tras centro.',
    activacion: 'Al rematar un centro.',
    acumulacion: PROPIA,
    impacto: 0.55,
  },
  Cabeceador: {
    nombre: 'Cabeceador',
    descripcion: 'Más probabilidad de gol en remates de cabeza.',
    efecto: 'Más probabilidad de gol de cabeza.',
    activacion: 'Al rematar de cabeza.',
    acumulacion: PROPIA,
    impacto: 0.5,
  },
  Desbordante: {
    nombre: 'Desbordante',
    descripcion: 'Más probabilidad de éxito en los regates por las bandas.',
    efecto: 'Más regates ganados por banda y más peso del regate por banda (× 1,3).',
    activacion: 'Con el balón en una banda.',
    acumulacion: PROPIA,
    impacto: 0.45,
  },
  GuanteEnElPie: {
    nombre: 'Guante en el pie',
    descripcion: 'Repite la tirada (y se queda con la mejor) cuando centra balones al área.',
    efecto: 'Repite la tirada de sus centros. Es el lanzador de córners propuesto.',
    activacion: 'Al centrar.',
    acumulacion: PROPIA,
    impacto: 0.5,
  },
};

const DEFINICION_DEFECTOS: Readonly<Record<Defecto, Entrada>> = {
  Agresivo: {
    nombre: 'Agresivo',
    descripcion: 'Duplica su probabilidad de ver la roja directa.',
    efecto: 'Su probabilidad de roja directa por falta se multiplica por `defectos.agresivo` (2).',
    activacion: SIEMPRE,
    acumulacion: PROPIA,
    impacto: 0.4,
  },
  Impulsivo: {
    nombre: 'Impulsivo',
    descripcion: 'Duplica su probabilidad de ver la amarilla.',
    efecto: 'Su probabilidad de amarilla por falta se multiplica por `defectos.impulsivo` (2).',
    activacion: SIEMPRE,
    acumulacion: PROPIA,
    impacto: 0.65,
  },
  Fragil: {
    nombre: 'Frágil',
    descripcion: 'Se lesiona con mucha más facilidad.',
    efecto: 'Su probabilidad de lesión se multiplica por `defectos.fragil` (3).',
    activacion: SIEMPRE,
    acumulacion: PROPIA,
    impacto: 0.5,
  },
  Fatigado: {
    nombre: 'Fatigado',
    descripcion: 'Empieza a cansarse al comenzar la segunda parte.',
    efecto: 'Su cansancio empieza en el minuto 46 si el inicio general es más tarde (el menor de los dos).',
    activacion: 'Desde el comienzo de la segunda parte.',
    acumulacion: PROPIA,
    impacto: 0.4,
  },
  Polemico: {
    nombre: 'Polémico',
    descripcion: 'Si su equipo va perdiendo, su actitud baja un 5 % la media de todo el equipo.',
    efecto: 'Los stats de todos los jugadores de su equipo en el campo se multiplican por 1 − `defectos.polemico` (0,95).',
    activacion: 'Mientras está en el campo y su equipo va perdiendo; se recupera al empatar.',
    acumulacion: DEFECTO_UNA_VEZ,
    impacto: 0.25,
  },
  Indisciplinado: {
    nombre: 'Indisciplinado',
    descripcion: 'Se cansa más rápido.',
    efecto: 'Su ritmo de degradación por cansancio se multiplica por `defectos.indisciplinado` (1,5).',
    activacion: 'Desde el inicio del cansancio.',
    acumulacion: PROPIA,
    impacto: 0.6,
  },
  Canchero: {
    nombre: 'Canchero',
    descripcion: 'Comete faltas y penaltis con más frecuencia.',
    efecto: 'Su probabilidad de cometer falta en una entrada se multiplica por `defectos.canchero` (1,5); dentro del área, la falta es penalti.',
    activacion: SIEMPRE,
    acumulacion: PROPIA,
    impacto: 0.6,
  },
  Rebelde: {
    nombre: 'Rebelde',
    descripcion: 'Desde el banquillo, su malestar baja un 5 % la media de todo el equipo.',
    efecto: 'Los stats de todos los jugadores de su equipo en el campo se multiplican por 1 − `defectos.rebelde` (0,95).',
    activacion:
      'Mientras está convocado en el banquillo; no cuenta si está retirado, expulsado, lesionado o no convocado, y desaparece al entrar.',
    acumulacion: DEFECTO_UNA_VEZ,
    impacto: 0.15,
  },
  Torpe: {
    nombre: 'Torpe',
    descripcion: 'Marca en propia puerta con más frecuencia.',
    efecto: 'Su probabilidad de autogol (despeje de un centro o desvío de un tiro) se multiplica por `defectos.torpe` (2).',
    activacion: 'Al despejar o desviar.',
    acumulacion: PROPIA,
    impacto: 0.7,
  },
  Provocador: {
    nombre: 'Provocador',
    descripcion: 'Motiva a los rivales GOAT: +1 a su media mientras está en el campo.',
    efecto: '+`defectos.provocador` (1) a todos los stats de cada jugador GOAT del rival en el campo.',
    activacion: EN_CAMPO,
    acumulacion: 'Una sola vez por equipo, aunque haya varios Provocadores en el campo.',
    impacto: 0.85,
  },
  DeCristal: {
    nombre: 'De cristal',
    descripcion: 'Cuando se lesiona, siempre es de larga duración.',
    efecto: 'La gravedad de sus lesiones es siempre `larga`.',
    activacion: 'Al lesionarse.',
    acumulacion: PROPIA,
    impacto: 0.55,
  },
  Estrellita: {
    nombre: 'Estrellita',
    descripcion: 'Si no es el mejor de su equipo en el campo, se desmotiva: −10 % a su media.',
    efecto:
      'Sus stats se multiplican por 1 − `defectos.estrellita` (0,90) si su media efectiva (sin este efecto) no es la mayor de su equipo en el campo; con un empate en la mayor, no se aplica.',
    activacion: 'Mientras está en el campo y otro compañero en el campo tiene más media efectiva.',
    acumulacion: PROPIA,
    impacto: 0.35,
  },
  Chupon: {
    nombre: 'Chupón',
    descripcion: 'Apenas pasa el balón a sus compañeros.',
    efecto: 'El peso de la opción «pase» en sus decisiones se multiplica por `defectos.chupon` (0,5). Un portero conserva sus acciones.',
    activacion: 'Con el balón.',
    acumulacion: PROPIA,
    impacto: 0.45,
  },
  Inflexible: {
    nombre: 'Inflexible',
    descripcion: 'Jugando fuera de su posición, su penalización es 5 puntos mayor.',
    efecto: 'Si su penalización por posición es mayor que 0, se le suman `defectos.inflexible` (0,05, es decir, 5 puntos porcentuales).',
    activacion: 'Jugando fuera de su posición.',
    acumulacion: PROPIA,
    impacto: 0.75,
  },
  MalDefensor: {
    nombre: 'Mal defensor',
    descripcion: 'Apenas participa en las acciones defensivas.',
    efecto:
      'Su peso como candidato a defender se multiplica por `defectos.malDefensor` (0,5): si le toca un duelo o cortar un pase, se lo cede al siguiente candidato con probabilidad 0,5, y en la presión cuenta como si estuviera al doble de distancia. Si es el único candidato, defiende igual. Un portero conserva sus acciones.',
    activacion: 'Sin el balón.',
    acumulacion: PROPIA,
    impacto: 0.4,
  },
};

/** Parejas de rasgos que no pueden estar en la misma carta (contracts/rasgos.md). */
export const PAREJAS_INCOMPATIBLES: readonly (readonly [Rasgo, Rasgo])[] = [
  ['DeAcero', 'Fragil'],
  ['DeAcero', 'DeCristal'],
  ['Robusto', 'Fragil'],
  ['FairPlayer', 'Agresivo'],
  ['Versatil', 'Inflexible'],
  ['Todocampista', 'Inflexible'],
  ['Incansable', 'Fatigado'],
  ['Incansable', 'Indisciplinado'],
  ['Versatil', 'Todocampista'],
];

function incompatiblesDe(id: Rasgo): Rasgo[] {
  return PAREJAS_INCOMPATIBLES.flatMap(([a, b]) => (a === id ? [b] : b === id ? [a] : []));
}

function ambitoVirtud(v: Virtud): AmbitoRasgo {
  if ((VIRTUDES_POR as readonly Virtud[]).includes(v)) return 'POR';
  if ((VIRTUDES_DEF as readonly Virtud[]).includes(v)) return 'DEF';
  if ((VIRTUDES_MED as readonly Virtud[]).includes(v)) return 'MED';
  if ((VIRTUDES_DEL as readonly Virtud[]).includes(v)) return 'DEL';
  return 'generico';
}

export const RASGOS: Readonly<Record<Rasgo, DefinicionRasgo>> = Object.freeze({
  ...Object.fromEntries(
    TODAS_LAS_VIRTUDES.map((v) => [v, { id: v, tipo: 'virtud', ambito: ambitoVirtud(v), incompatibles: incompatiblesDe(v), ...VIRTUDES[v] }]),
  ),
  ...Object.fromEntries(
    DEFECTOS.map((d) => [d, { id: d, tipo: 'defecto', ambito: 'generico', incompatibles: incompatiblesDe(d), ...DEFINICION_DEFECTOS[d] }]),
  ),
}) as unknown as Readonly<Record<Rasgo, DefinicionRasgo>>;

export function rasgo(id: Rasgo): DefinicionRasgo {
  const r = RASGOS[id];
  if (!r) throw new Error(`Rasgo desconocido: ${String(id)}`);
  return r;
}

const VIRTUDES_SET: ReadonlySet<unknown> = new Set(TODAS_LAS_VIRTUDES);
const DEFECTOS_SET: ReadonlySet<unknown> = new Set(DEFECTOS);

export function esVirtud(id: unknown): id is Virtud {
  return VIRTUDES_SET.has(id);
}

export function esDefecto(id: unknown): id is Defecto {
  return DEFECTOS_SET.has(id);
}

/** Impacto de un rasgo (0..1). */
export const impacto = (id: Rasgo): number => rasgo(id).impacto;

/**
 * Reparto de defectos por nivel (research R5; FR-012): `conDefecto` es la proporción de cartas con al menos un
 * defecto; `conDos`, la proporción con dos dentro de las que tienen alguno. Vale para cualquier catálogo (FR-037).
 */
export const REPARTO_DEFECTOS: Readonly<Record<Nivel, { conDefecto: number; conDos: number }>> = {
  Superclase: { conDefecto: 0.15, conDos: 0 },
  Epico: { conDefecto: 0.25, conDos: 0.2 },
  Legendario: { conDefecto: 0.35, conDos: 0.3 },
  GOAT: { conDefecto: 0.5, conDos: 0.4 },
};

/** Niveles en orden creciente (para comprobar que la proporción de defectos crece con el nivel). */
export const NIVELES_ORDENADOS: readonly Nivel[] = NIVELES;
