import { BarraPrincipal, type AccionBarra } from './BarraPrincipal';

/** Situaciones en las que el juego espera y se puede avanzar (002/FR-011; spec 003, FR-006; contracts/ui.md). */
export type SituacionAvance =
  | 'fin_draft'
  | 'preparacion'
  | 'pausa'
  | 'fin_partido'
  | 'fin_jornada'
  | 'fin_torneo'
  | 'confirmar_alineacion'
  | 'finalizar_partido'
  | 'gestionar_equipo'
  | 'simular_resto'
  | 'ver_torneo'
  | 'ver_campeon'
  | 'volver_menu';

export const ETIQUETA_AVANCE: Record<SituacionAvance, string> = {
  fin_draft: 'Preparar equipo',
  preparacion: 'Comenzar partido',
  pausa: 'Seguir',
  fin_partido: 'Siguiente',
  fin_jornada: 'Siguiente jornada',
  fin_torneo: 'Volver al menú',
  confirmar_alineacion: 'Confirmar alineación',
  finalizar_partido: 'Finalizar partido',
  gestionar_equipo: 'Gestionar equipo',
  simular_resto: 'Simular resto del torneo',
  ver_torneo: 'Ver torneo',
  ver_campeon: 'Ver campeón',
  volver_menu: 'Volver al menú',
};

interface Props {
  situacion: SituacionAvance;
  /** En la preparación, contra un humano el partido no se juega en directo: «Ver partido» (FR-030). */
  contraHumano?: boolean;
  /**
   * Acción del botón. Recibe un `requestId` nuevo en cada pulsación: el servidor descarta las repetidas
   * (FR-016). Mientras no termina, el botón queda ocupado: una sola petición a la vez.
   */
  onAvanzar: (requestId: string) => Promise<unknown> | void;
  /** Motivo por el que no se puede avanzar: el botón sigue visible, con `aria-disabled` (FR-007). */
  motivoDesactivado?: string | null;
  secundarios?: AccionBarra[];
  estado?: React.ReactNode;
}

/**
 * Botón para avanzar sin esperar a que venza un temporizador (002/US2; research R18), siempre como botón principal
 * de la `BarraPrincipal` (spec 003, FR-006, FR-007), con la etiqueta de cada situación.
 */
export function BotonAvanzar({ situacion, contraHumano, onAvanzar, motivoDesactivado, secundarios, estado }: Props) {
  const etiqueta = situacion === 'preparacion' && contraHumano ? 'Ver partido' : ETIQUETA_AVANCE[situacion];
  return <BarraPrincipal principal={{ etiqueta, onClick: () => onAvanzar(crypto.randomUUID()), motivoDesactivado: motivoDesactivado ?? null }} secundarios={secundarios} estado={estado} />;
}
