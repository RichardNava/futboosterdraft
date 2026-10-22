/**
 * Perfiles de nivel de los NPC (T124; research R9): cuánto ruido meten en la evaluación y hasta dónde
 * miran. El ruido sale siempre del PRNG con semilla, así que cada decisión es reproducible.
 *
 * Spec 003 (FR-037 a FR-037b; research R12): cada nivel comete además errores creíbles con la probabilidad y el
 * coste máximo de `parametros.npc.errores` (ver `errores.ts`). El perfil `automatico` (decisiones de los humanos
 * ausentes) usa los valores del avanzado sin errores; no es un nivel de NPC del dominio.
 */
import {
  FORMACIONES_IDS,
  parametrosActuales,
  type FamiliaErrorNPC,
  type FormacionId,
  type NivelDecisiones,
  type ParametrosEquilibrado,
  type ParametrosErroresNPC,
} from '@fbd/domain';
import type { PesosEvaluacion } from './evaluador';

/** Niveles que entiende la IA: los cuatro de los NPC y `automatico`. */
export type NivelIA = NivelDecisiones;
export type FamiliaError = FamiliaErrorNPC;
export type PerfilErrores = ParametrosErroresNPC;
export const FAMILIAS_ERROR: readonly FamiliaError[] = ['draft', 'alineacion', 'colocacion', 'formacion', 'tactica', 'lanzadores', 'partido'];

export interface PerfilNPC {
  /** Amplitud del ruido sumado al valor de cada opción del draft, en puntos de media (±). */
  ruido: number;
  pesos: PesosEvaluacion;
  /** Formaciones que tiene en cuenta: todas, unas básicas o una objetivo (la elige al empezar). */
  alcanceFormaciones: 'basicas' | 'objetivo' | 'todas';
  /** En el draft, descuenta las cartas que probablemente vuelvan en el mismo sobre. */
  anticipacion: boolean;
  /** Prueba alineaciones y tácticas candidatas con partidos simulados contra el rival. */
  simulaciones: number;
  /** Probabilidad (milésimas) de no elegir la mejor formación sino otra al azar de su alcance. */
  despisteFormacion: number;
  partido: {
    /** Cansancio a partir del cual cambia a un jugador (fracción de stats perdida). */
    umbralCansancio: number;
    /** Cambia a defensas con amarilla en el descanso para evitar la expulsión. */
    protegeAmonestados: boolean;
    /** Ajusta la táctica según el marcador; 0 = nunca, 1 = en cuanto va perdiendo o ganando. */
    reaccionTactica: number;
    /** Sustituciones que se guarda para lesiones. */
    reservaCambios: number;
  };
}

export const FORMACIONES_BASICAS: readonly FormacionId[] = ['4-4-2', '4-3-3', '4-2-3-1'];

const AVANZADO: PerfilNPC = {
  ruido: 1.5,
  pesos: { media: 1, cobertura: 6, porteros: 8, sinergia: 2, rasgos: 2 },
  alcanceFormaciones: 'objetivo',
  anticipacion: false,
  simulaciones: 0,
  despisteFormacion: 0,
  partido: { umbralCansancio: 0.28, protegeAmonestados: true, reaccionTactica: 0.8, reservaCambios: 1 },
};

export const PERFILES: Readonly<Record<NivelIA, PerfilNPC>> = {
  amateur: {
    ruido: 8,
    pesos: { media: 1, cobertura: 0, porteros: 0, sinergia: 0, rasgos: 0.5 },
    alcanceFormaciones: 'basicas',
    anticipacion: false,
    simulaciones: 0,
    despisteFormacion: 500,
    partido: { umbralCansancio: 1, protegeAmonestados: false, reaccionTactica: 0, reservaCambios: 0 },
  },
  intermedio: {
    ruido: 4,
    pesos: { media: 1, cobertura: 4, porteros: 6, sinergia: 0, rasgos: 1 },
    alcanceFormaciones: 'basicas',
    anticipacion: false,
    simulaciones: 0,
    despisteFormacion: 200,
    partido: { umbralCansancio: 0.35, protegeAmonestados: false, reaccionTactica: 0.4, reservaCambios: 0 },
  },
  avanzado: AVANZADO,
  PRO: {
    ruido: 0,
    pesos: { media: 1, cobertura: 7, porteros: 10, sinergia: 3, rasgos: 3 },
    alcanceFormaciones: 'todas',
    anticipacion: true,
    simulaciones: 20,
    despisteFormacion: 0,
    partido: { umbralCansancio: 0.22, protegeAmonestados: true, reaccionTactica: 1, reservaCambios: 1 },
  },
  automatico: AVANZADO,
};

/** Errores del nivel (de los parámetros, para poder calibrarlos sin tocar el código). */
export function erroresDe(nivel: NivelIA, p: ParametrosEquilibrado = parametrosActuales()): PerfilErrores {
  return p.npc.errores[nivel];
}

export const TODAS_LAS_FORMACIONES: readonly FormacionId[] = FORMACIONES_IDS;
