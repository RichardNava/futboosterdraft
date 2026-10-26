/**
 * Equipos sintéticos para el equilibrado: un jugador por casilla en su posición natural, con stats
 * alrededor de una media dada. Así cada comprobación aísla el efecto que mide (media, posición,
 * formación, táctica o virtud).
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
  type Virtud,
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

export function jugadorSintetico(posicion: Posicion, media: number, rng: Rng, virtudes: Virtud[] = []): Jugador {
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
    virtudes,
    defectos: [],
    nivel: 'Superclase',
    nombre_carta: 'Prueba',
    imagen: '/cartas/siluetas/med.svg',
    imagen_bg: '/cartas/fondos/med.svg',
  };
}

export interface OpcionesEquipo {
  formacion?: FormacionId;
  media?: number;
  tactica?: Partial<Tactica>;
  virtudes?: Virtud[];
  semilla?: string;
  participanteId?: string;
}

export function equipoSintetico(opciones: OpcionesEquipo = {}): EquipoPartido {
  const formacion = opciones.formacion ?? '4-4-2';
  const media = opciones.media ?? 80;
  const rng = new Rng(semillaDesdeTexto(opciones.semilla ?? `equipo-${formacion}-${media}`));
  const titulares = FORMACIONES[formacion].casillas.map((c) => {
    const posicion: Posicion = c.id === CASILLA_CENTRAL ? 'DCI' : c.posicionesAdmitidas[0]!;
    return { casillaId: c.id, jugador: jugadorSintetico(posicion, media, rng, opciones.virtudes ?? []) };
  });
  const suplentes = (['POR', 'DCI', 'LD', 'MC', 'MCO', 'DC', 'EI'] as Posicion[]).map((p) =>
    jugadorSintetico(p, media - 3, rng, opciones.virtudes ?? []),
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

/** Mismo equipo con `delta` puntos más en el stat de pase de sus centrocampistas titulares (002/SC-008). */
export function conPaseDeMedios(equipo: EquipoPartido, delta: number): EquipoPartido {
  const titulares = equipo.titulares.map((t) => {
    const j = t.jugador;
    if (j.demarcacion !== 'MED') return t;
    const stats = { ...(j.stats as unknown as Record<string, number>) };
    stats.pase = Math.max(1, Math.min(99, stats.pase! + delta));
    const nuevos = stats as unknown as Jugador['stats'];
    return { ...t, jugador: { ...j, id: siguienteId++, stats: nuevos, media: calcularMedia({ demarcacion: j.demarcacion, stats: nuevos }) } };
  });
  return { ...equipo, titulares, lanzadores: proponerLanzadores(titulares.map((t) => t.jugador)) };
}

/**
 * Mismo equipo con 3 titulares de una demarcación sustituidos por jugadores sintéticos de la misma media en
 * otra posición, que juegan en las casillas de los sustituidos (SC-011).
 */
export function conTresSustituidos(equipo: EquipoPartido, de: Demarcacion, demarcacion: Demarcacion, posicion: Posicion): EquipoPartido {
  const rng = new Rng(semillaDesdeTexto(`sustituidos-${de}-${posicion}`));
  let pendientes = 3;
  const titulares = equipo.titulares.map((t) => {
    if (pendientes === 0 || t.jugador.demarcacion !== de || t.casillaId === 'POR') return t;
    pendientes--;
    const media = Math.round(t.jugador.media);
    const j = jugadorSintetico(posicion, media, rng);
    if (j.demarcacion !== demarcacion) throw new Error(`${posicion} no es de ${demarcacion}`);
    return { ...t, jugador: j };
  });
  return { ...equipo, titulares, lanzadores: proponerLanzadores(titulares.map((t) => t.jugador)) };
}

/** Clona un equipo con ids nuevos (para enfrentar un equipo contra sí mismo). */
export function clonar(equipo: EquipoPartido, participanteId: string): EquipoPartido {
  const nuevo = (j: Jugador): Jugador => ({ ...j, id: siguienteId++ });
  const titulares = equipo.titulares.map((t) => ({ ...t, jugador: nuevo(t.jugador) }));
  return { ...equipo, participanteId, titulares, suplentes: equipo.suplentes.map(nuevo), lanzadores: proponerLanzadores(titulares.map((t) => t.jugador)) };
}
