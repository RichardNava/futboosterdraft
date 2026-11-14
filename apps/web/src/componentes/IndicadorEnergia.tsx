/**
 * Indicador de energía de un jugador en «Gestionar equipo» (spec 014, research R6; contrato U1): cara, porcentaje y,
 * con energía < 80, la penalización de rendimiento en rojo. La energía la calcula el motor; aquí solo se pinta.
 */
type TramoEnergia = 'fresco' | 'bien' | 'medio' | 'cansado' | 'agotado';

/** Tramos de energía (data-model §4): los límites 80, 60, 40 y 20 pertenecen al tramo superior. */
export const TRAMOS_ENERGIA: readonly { tramo: TramoEnergia; desde: number; hasta: number; texto: string }[] = [
  { tramo: 'fresco', desde: 80, hasta: 100, texto: 'Fresco' },
  { tramo: 'bien', desde: 60, hasta: 79, texto: 'Bien' },
  { tramo: 'medio', desde: 40, hasta: 59, texto: 'Tocado' },
  { tramo: 'cansado', desde: 20, hasta: 39, texto: 'Cansado' },
  { tramo: 'agotado', desde: 0, hasta: 19, texto: 'Agotado' },
];

/** Tramo de una energía de 0 a 100. */
export function tramoEnergia(energia: number): TramoEnergia {
  return (TRAMOS_ENERGIA.find((t) => energia >= t.desde) ?? TRAMOS_ENERGIA[TRAMOS_ENERGIA.length - 1]!).tramo;
}

/** La penalización solo se muestra por debajo del tramo «fresco». */
export const muestraPenalizacion = (energia: number): boolean => energia < 80;

/** Texto para lectores de pantalla (contrato U1). */
export function etiquetaEnergia(energia: number, penalizacion: number): string {
  return muestraPenalizacion(energia) && penalizacion > 0 ? `Energía ${energia} %, rinde un ${penalizacion} % menos` : `Energía ${energia} %`;
}

/** Boca de cada cara: de la sonrisa amplia a la muy triste (curva cuadrática en un círculo de 24 × 24). */
const BOCA: Record<TramoEnergia, string> = {
  fresco: 'M7 14 Q12 19 17 14',
  bien: 'M7.5 14.5 Q12 17 16.5 14.5',
  medio: 'M8 15.5 L16 15.5',
  cansado: 'M8 17 Q12 14.5 16 17',
  agotado: 'M7 18 Q12 13 17 18',
};

/** Cara SVG propia de un tramo. */
export function CaraEnergia({ tramo }: { tramo: TramoEnergia }) {
  return (
    <svg className={`cara-energia cara-energia-${tramo}`} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10.5" className="cara-energia-fondo" />
      {tramo === 'agotado' ? (
        <>
          <path d="M7 9 L10 10.5 M17 9 L14 10.5" className="cara-energia-trazo" />
        </>
      ) : (
        <>
          <circle cx="8.5" cy="9.5" r="1.3" className="cara-energia-ojo" />
          <circle cx="15.5" cy="9.5" r="1.3" className="cara-energia-ojo" />
        </>
      )}
      <path d={BOCA[tramo]} className="cara-energia-trazo" />
    </svg>
  );
}

/** Indicador completo: porcentaje encima, cara y penalización debajo. */
export function IndicadorEnergia({ energia, penalizacion }: { energia: number; penalizacion: number }) {
  const tramo = tramoEnergia(energia);
  const etiqueta = etiquetaEnergia(energia, penalizacion);
  return (
    <span className={`indicador-energia energia-${tramo}`} role="img" aria-label={etiqueta} title={etiqueta}>
      <span className="indicador-energia-porcentaje">{energia} %</span>
      <CaraEnergia tramo={tramo} />
      {muestraPenalizacion(energia) && penalizacion > 0 && <span className="indicador-energia-penalizacion">−{penalizacion} %</span>}
    </span>
  );
}

/** Energía de un jugador tal como llega en `partido.pausa_decision`. */
export interface EnergiaJugador {
  jugadorId: number;
  energia: number;
  penalizacion: number;
}

/** Mapa por jugador para `CampoEquipo`. */
export const mapaEnergia = (lista: readonly EnergiaJugador[]) => new Map(lista.map((e) => [e.jugadorId, { energia: e.energia, penalizacion: e.penalizacion }]));
