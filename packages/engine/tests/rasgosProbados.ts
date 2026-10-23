/**
 * Registro de rasgos probados (spec 005, research R8; FR-055): cada rasgo de la tabla `RASGOS` apunta a su prueba de
 * unidad y a su comprobación de `balance`. No basta con añadir un rasgo al documento: debe implementarse y probarse.
 *
 * Las virtudes anteriores a la spec 005 se registran con las pruebas que ya tenían (algunas solo en una de las dos);
 * los 19 rasgos de la spec 005 necesitan las dos.
 */
import type { Rasgo } from '@fbd/domain';

export interface RasgoProbado {
  /** Fichero de prueba de unidad (relativo a la raíz del repositorio) o null si solo se mide en `balance`. */
  prueba: string | null;
  /** Id de la comprobación de `balance`, o null si solo tiene prueba de unidad. */
  balance: string | null;
}

const MOTOR = 'packages/engine/tests';
const EXISTENTES = `${MOTOR}/virtudesExistentes.test.ts`;

export const RASGOS_PROBADOS: Partial<Record<Rasgo, RasgoProbado>> = {
  // Virtudes anteriores a la spec 005.
  Incansable: { prueba: `${MOTOR}/reglas.test.ts`, balance: null },
  Motivador: { prueba: `${MOTOR}/reglas.test.ts`, balance: null },
  LanzadorFaltas: { prueba: 'packages/domain/tests/equipo/lanzadores.test.ts', balance: '003/SC-007' },
  LanzadorPenalties: { prueba: `${MOTOR}/penaltis.test.ts`, balance: null },
  Aura: { prueba: EXISTENTES, balance: null },
  Capitania: { prueba: `${MOTOR}/reglas.test.ts`, balance: null },
  Filigranas: { prueba: null, balance: '003/SC-007' },
  FortalezaMental: { prueba: `${MOTOR}/reglas.test.ts`, balance: null },
  Intimidante: { prueba: EXISTENTES, balance: null },
  Elegante: { prueba: EXISTENTES, balance: null },
  Presionador: { prueba: EXISTENTES, balance: null },
  RecuperadorTrasPerdida: { prueba: null, balance: null },
  Carismatico: { prueba: null, balance: null },
  Potente: { prueba: EXISTENTES, balance: null },
  Robusto: { prueba: null, balance: 'SC-015' },
  Parapenalties: { prueba: `${MOTOR}/penaltis.test.ts`, balance: null },
  OneToOne: { prueba: null, balance: null },
  Santo: { prueba: `${MOTOR}/reglas.test.ts`, balance: null },
  Ordenabarreras: { prueba: null, balance: null },
  JugadorDeCampo: { prueba: EXISTENTES, balance: null },
  Infranqueable: { prueba: EXISTENTES, balance: null },
  Jerarquia: { prueba: EXISTENTES, balance: null },
  Volador: { prueba: null, balance: null },
  Libero: { prueba: EXISTENTES, balance: null },
  MuroDefensivo: { prueba: null, balance: null },
  Llegador: { prueba: null, balance: '003/SC-007' },
  BoxToBox: { prueba: EXISTENTES, balance: null },
  PrimerToque: { prueba: EXISTENTES, balance: null },
  Todocampista: { prueba: 'packages/domain/tests/equipo/statsEfectivos.test.ts', balance: null },
  JugadorEntreLineas: { prueba: EXISTENTES, balance: null },
  Matador: { prueba: null, balance: '003/SC-007' },
  Rematador: { prueba: null, balance: '003/SC-007' },
  Cabeceador: { prueba: null, balance: '003/SC-007' },
  Desbordante: { prueba: EXISTENTES, balance: '003/SC-007' },
  GuanteEnElPie: { prueba: 'packages/domain/tests/equipo/lanzadores.test.ts', balance: null },

  // Defectos (spec 005, T057).
  Agresivo: { prueba: `${MOTOR}/defectosDisciplina.test.ts`, balance: '005/SC-004/Agresivo' },
  Impulsivo: { prueba: `${MOTOR}/defectosDisciplina.test.ts`, balance: '005/SC-004/Impulsivo' },
  Canchero: { prueba: `${MOTOR}/defectosDisciplina.test.ts`, balance: '005/SC-004/Canchero' },
  Fragil: { prueba: `${MOTOR}/defectosFisicos.test.ts`, balance: '005/SC-004/Fragil' },
  DeCristal: { prueba: `${MOTOR}/defectosFisicos.test.ts`, balance: '005/SC-004/DeCristal' },
  Fatigado: { prueba: `${MOTOR}/defectosFisicos.test.ts`, balance: '005/SC-004/Fatigado' },
  Indisciplinado: { prueba: `${MOTOR}/defectosFisicos.test.ts`, balance: '005/SC-004/Indisciplinado' },
  Torpe: { prueba: `${MOTOR}/defectosJuego.test.ts`, balance: '005/SC-004/Torpe' },
  Chupon: { prueba: `${MOTOR}/defectosJuego.test.ts`, balance: '005/SC-004/Chupon' },
  MalDefensor: { prueba: `${MOTOR}/defectosJuego.test.ts`, balance: '005/SC-004/MalDefensor' },
  Polemico: { prueba: `${MOTOR}/defectosMedia.test.ts`, balance: '005/SC-004/Polemico' },
  Rebelde: { prueba: `${MOTOR}/defectosMedia.test.ts`, balance: '005/SC-004/Rebelde' },
  Estrellita: { prueba: `${MOTOR}/defectosMedia.test.ts`, balance: '005/SC-004/Estrellita' },
  Provocador: { prueba: `${MOTOR}/defectosMedia.test.ts`, balance: '005/SC-004/Provocador' },
  Inflexible: { prueba: 'packages/domain/tests/equipo/statsEfectivos.test.ts', balance: '005/SC-004/Inflexible' },

  // Virtudes nuevas (spec 005, T094).
  DeAcero: { prueba: `${MOTOR}/virtudesNuevas.test.ts`, balance: '005/SC-005' },
  FairPlayer: { prueba: `${MOTOR}/virtudesNuevas.test.ts`, balance: '005/SC-005' },
  Revulsivo: { prueba: `${MOTOR}/virtudesNuevas.test.ts`, balance: '005/SC-004/Revulsivo' },
  Versatil: { prueba: 'packages/domain/tests/equipo/statsEfectivos.test.ts', balance: '005/SC-004/Versatil' },
};
