/**
 * Equipos sintéticos para el equilibrado: un jugador por casilla en su posición natural, con stats
 * alrededor de una media dada. Así cada comprobación aísla el efecto que mide (media, posición,
 * formación, táctica o special).
 */
import {
  calcularMedia,
  CASILLA_CENTRAL,
  CLAVES_STATS,
  FORMACIONES,
  proponerLanzadores,
  Rng,
  semillaDesdeTexto,
  tacticaPorDefecto,
  type Demarcacion,
  type FormacionId,
  type Jugador,
  type Posicion,
  type Special,
  type Tactica,
} from '@fbd/domain';
import type { EquipoPartido } from '@fbd/engine';

const DEMARCACION_DE: Record<Posicion, Demarcacion> = {
  POR: 'POR',
  LI: 'DEF',
  LD: 'DEF',
  DCI: 'DEF',
  DCD: 'DEF',
  CI: 'DEF',
  CD: 'DEF',
  MD: 'MED',
  MC: 'MED',
  MII: 'MED',
  MID: 'MED',
  MCO: 'MED',
  DC: 'DEL',
  SD: 'DEL',
  EI: 'DEL',
  ED: 'DEL',
};

let siguienteId = 1_000_000;

export function jugadorSintetico(posicion: Posicion, media: number, rng: Rng, specials: Special[] = []): Jugador {
  const demarcacion = DEMARCACION_DE[posicion];
  const stats = Object.fromEntries(
    CLAVES_STATS[demarcacion].map((c) => [c, Math.max(1, Math.min(99, media + rng.entero(-3, 3)))]),
  ) as unknown as Jugador['stats'];
  return {
    id: siguienteId++,
    nombre: 'Sintético',
    apellidos: posicion,
    nacionalidad: 'ESP',
    fecha_nacimiento: '1995-01-01',
    altura: 180,
    demarcacion,
    posicion: [posicion],
    historia: '',
    stats,
    media: calcularMedia({ demarcacion, stats }),
    specials,
    nivel: 'Superclase',
    coleccion: 'Core',
  };
}

export interface OpcionesEquipo {
  formacion?: FormacionId;
  media?: number;
  tactica?: Partial<Tactica>;
  specials?: Special[];
  semilla?: string;
  participanteId?: string;
}

export function equipoSintetico(opciones: OpcionesEquipo = {}): EquipoPartido {
  const formacion = opciones.formacion ?? '4-4-2';
  const media = opciones.media ?? 80;
  const rng = new Rng(semillaDesdeTexto(opciones.semilla ?? `equipo-${formacion}-${media}`));
  const titulares = FORMACIONES[formacion].casillas.map((c) => {
    const posicion: Posicion = c.id === CASILLA_CENTRAL ? 'DCI' : c.posicionesAdmitidas[0]!;
    return { casillaId: c.id, jugador: jugadorSintetico(posicion, media, rng, opciones.specials ?? []) };
  });
  const suplentes = (['POR', 'DCI', 'LD', 'MC', 'MCO', 'DC', 'EI'] as Posicion[]).map((p) =>
    jugadorSintetico(p, media - 3, rng, opciones.specials ?? []),
  );
  return {
    participanteId: opciones.participanteId ?? 'sintetico',
    formacion,
    titulares,
    suplentes,
    tactica: { ...tacticaPorDefecto(), ...opciones.tactica },
    lanzadores: proponerLanzadores(titulares.map((t) => t.jugador)),
  };
}

/** Mismo equipo con todos los stats de los titulares desplazados (SC-004). */
export function conStatsDesplazados(equipo: EquipoPartido, delta: number): EquipoPartido {
  const ajustar = (j: Jugador): Jugador => {
    const stats = Object.fromEntries(
      Object.entries(j.stats as unknown as Record<string, number>).map(([k, v]) => [k, Math.max(1, Math.min(99, v + delta))]),
    ) as unknown as Jugador['stats'];
    return { ...j, id: siguienteId++, stats, media: calcularMedia({ demarcacion: j.demarcacion, stats }) };
  };
  const titulares = equipo.titulares.map((t) => ({ ...t, jugador: ajustar(t.jugador) }));
  return { ...equipo, titulares, suplentes: equipo.suplentes.map(ajustar), lanzadores: proponerLanzadores(titulares.map((t) => t.jugador)) };
}

/** Mismo equipo con 3 titulares rotados entre líneas: un defensa, un medio y un delantero fuera de posición (SC-005). */
export function conTresFueraDePosicion(equipo: EquipoPartido): EquipoPartido {
  const titulares = equipo.titulares.map((t) => ({ ...t }));
  const indice = (dem: Demarcacion) => titulares.findIndex((t) => t.jugador.demarcacion === dem && t.casillaId !== 'POR');
  const [d, m, a] = [indice('DEF'), indice('MED'), indice('DEL')];
  const casillas = [titulares[d]!.casillaId, titulares[m]!.casillaId, titulares[a]!.casillaId];
  titulares[d]!.casillaId = casillas[1]!;
  titulares[m]!.casillaId = casillas[2]!;
  titulares[a]!.casillaId = casillas[0]!;
  return { ...equipo, titulares };
}

/** Clona un equipo con ids nuevos (para enfrentar un equipo contra sí mismo). */
export function clonar(equipo: EquipoPartido, participanteId: string): EquipoPartido {
  const nuevo = (j: Jugador): Jugador => ({ ...j, id: siguienteId++ });
  const titulares = equipo.titulares.map((t) => ({ ...t, jugador: nuevo(t.jugador) }));
  return { ...equipo, participanteId, titulares, suplentes: equipo.suplentes.map(nuevo), lanzadores: proponerLanzadores(titulares.map((t) => t.jugador)) };
}
