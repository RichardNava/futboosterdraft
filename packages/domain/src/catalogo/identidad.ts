/**
 * Identidad de las cartas (spec 011, US4; data-model §6): la real o una alternativa sin nombres ni retratos de
 * futbolistas reales. Solo cambia la presentación (`nombre`, `apellidos`, `nombre_carta`, `imagen` e `historia`);
 * nunca el id, las stats, los rasgos ni nada que use el motor (FR-019).
 */
import type { Demarcacion, Jugador } from './tipos';

export type Identidad = 'real' | 'alternativa';
export const IDENTIDADES: readonly Identidad[] = ['real', 'alternativa'];

const NOMBRE_DEMARCACION: Record<Demarcacion, string> = { POR: 'Portero', DEF: 'Defensa', MED: 'Centrocampista', DEL: 'Delantero' };

export const siluetaDe = (demarcacion: Demarcacion): string => `/cartas/siluetas/${demarcacion.toLowerCase()}.svg`;

/** «Defensa 40»: el nombre genérico de una carta sin identidad alternativa. */
export const nombreGenerico = (j: Pick<Jugador, 'id' | 'demarcacion'>): string => `${NOMBRE_DEMARCACION[j.demarcacion]} ${j.id}`;

export function conIdentidad(jugador: Jugador, identidad: Identidad): Jugador {
  if (identidad === 'real') return jugador;
  const { identidad_alternativa: alt, ...resto } = jugador;
  const generico = nombreGenerico(jugador);
  return {
    ...resto,
    nombre: alt?.nombre ?? generico,
    apellidos: alt?.apellidos ?? '',
    nombre_carta: alt?.nombre_carta ?? generico,
    imagen: alt?.imagen ?? siluetaDe(jugador.demarcacion),
    // Spec 013 (FR-006): la ilustración de Core también identifica al futbolista; vuelve al fondo de su demarcación.
    imagen_bg: jugador.imagen_bg.startsWith('/cartas/fondos/jugadores/')
      ? `/cartas/fondos/${jugador.demarcacion.toLowerCase()}.svg`
      : jugador.imagen_bg,
    // La historia cuenta la carrera del futbolista real: lo identifica tanto como el nombre.
    historia: '',
  };
}
