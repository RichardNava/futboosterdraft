export interface BajaVista {
  jugadorId: number;
  motivo: 'roja' | 'acumulacion_amarillas' | 'lesion';
  partidosRestantes: number;
}

const ETIQUETA_MOTIVO: Record<BajaVista['motivo'], string> = {
  lesion: 'Lesionado',
  roja: 'Sancionado (roja)',
  acumulacion_amarillas: 'Sancionado (amarillas)',
};

/** Distintivo de un jugador de baja: motivo y partidos que le quedan (T117). */
export function DistintivoBaja({ baja }: { baja: BajaVista | undefined }) {
  if (!baja) return <span className="etiqueta baja">De baja</span>;
  const partidos = baja.partidosRestantes === 1 ? '1 partido' : `${baja.partidosRestantes} partidos`;
  return (
    <span className={`etiqueta baja ${baja.motivo === 'lesion' ? 'lesion' : 'sancion'}`} title={`${ETIQUETA_MOTIVO[baja.motivo]}: ${partidos}`}>
      {baja.motivo === 'lesion' ? '✚' : '■'} {ETIQUETA_MOTIVO[baja.motivo]} · {partidos}
    </span>
  );
}
