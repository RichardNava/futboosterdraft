/**
 * Parámetros de la economía de fragmentos (spec 006, R9; FR-019, FR-020, FR-024). Los precios en dinero van en
 * céntimos de euro.
 */
import type { Nivel } from '../catalogo/tipos';
import type { ParametrosEquilibrado } from '../parametros/index';

export interface PaqueteFragmentos {
  id: string;
  fragmentos: number;
  centimos: number;
}

export interface ParametrosEconomia {
  recompensaTorneo: number;
  desfragmentar: Readonly<Record<Nivel, number>>;
  precioSobreFragmentos: number;
  precioSobreCentimos: number;
  paquetesFragmentos: readonly PaqueteFragmentos[];
}

export const PARAMETROS_ECONOMIA: Readonly<ParametrosEconomia> = {
  recompensaTorneo: 10,
  desfragmentar: { Superclase: 25, Epico: 50, Legendario: 75, GOAT: 100 },
  precioSobreFragmentos: 1000,
  precioSobreCentimos: 99,
  paquetesFragmentos: [
    { id: 'fragmentos-1000', fragmentos: 1000, centimos: 99 },
    { id: 'fragmentos-5500', fragmentos: 5500, centimos: 499 },
    { id: 'fragmentos-12000', fragmentos: 12000, centimos: 999 },
  ],
};

export function valorDesfragmentar(nivel: Nivel, p: Readonly<ParametrosEconomia> = PARAMETROS_ECONOMIA): number {
  return p.desfragmentar[nivel];
}

/** Fragmentos esperados al desfragmentar un sobre entero: 4 Superclase, 2 Épico, 1 Legendario y la carta alta. */
export function valorEsperadoSobre(p: Readonly<ParametrosEconomia>, equilibrado: ParametrosEquilibrado): number {
  const d = p.desfragmentar;
  const goat = equilibrado.sobres.probGoatEnAlta;
  return 4 * d.Superclase + 2 * d.Epico + d.Legendario + (1 - goat) * d.Legendario + goat * d.GOAT;
}

/** Comprar un sobre y desfragmentarlo nunca puede dar más fragmentos de los que cuesta (FR-024). */
export function validarParametrosEconomia(p: Readonly<ParametrosEconomia>, equilibrado: ParametrosEquilibrado): string[] {
  const esperado = valorEsperadoSobre(p, equilibrado);
  return p.precioSobreFragmentos > esperado
    ? []
    : [`El sobre cuesta ${p.precioSobreFragmentos} fragmentos y desfragmentarlo da ${esperado}: debe costar más`];
}
