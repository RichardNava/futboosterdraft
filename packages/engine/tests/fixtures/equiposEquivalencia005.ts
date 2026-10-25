/**
 * Partidos de la línea base de la spec 005 (T001, T005; SC-003): 20 semillas fijas con parámetros 3.0.0,
 * 10 con equipos sintéticos (con virtudes repartidas para que el renombrado toque el motor) y 10 con
 * equipos de las cartas Core de la spec 004 (`packages/domain/tests/fixtures/core-004.json`).
 *
 * Los ids de los jugadores son explícitos (no dependen de un contador global), de modo que el generador
 * y la prueba construyen exactamente los mismos partidos.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  autoAlineacion,
  calcularMedia,
  CASILLA_CENTRAL,
  CLAVES_STATS,
  FORMACIONES,
  PARAMETROS_V3,
  proponerLanzadores,
  semillaDesdeTexto,
  tacticaPorDefecto,
  type Demarcacion,
  type FormacionId,
  type Jugador,
  type Posicion,
  type Virtud,
} from '@fbd/domain';
import { avanzar, crearPartido, type EntradaPartido, type EquipoPartido, type EventoPartido } from '../../src/index';

const DEM: Record<Posicion, Demarcacion> = {
  POR: 'POR', LI: 'DEF', LD: 'DEF', DCI: 'DEF', DCD: 'DEF', CI: 'DEF', CD: 'DEF',
  MD: 'MED', MC: 'MED', MII: 'MED', MID: 'MED', MCO: 'MED', DC: 'DEL', SD: 'DEL', EI: 'DEL', ED: 'DEL',
};

/** Virtudes que reciben los jugadores sintéticos, por demarcación y en rotación por semilla. */
const VIRTUDES_SINTETICAS: Record<Demarcacion, Virtud[][]> = {
  POR: [['Santo'], ['OneToOne', 'Parapenalties'], ['Ordenabarreras'], ['JugadorDeCampo'], []],
  DEF: [['Jerarquia'], ['Infranqueable', 'Robusto'], ['Libero'], ['MuroDefensivo', 'Volador'], ['Intimidante']],
  MED: [['BoxToBox'], ['Llegador', 'Capitania'], ['PrimerToque'], ['JugadorEntreLineas', 'Motivador'], ['Todocampista']],
  DEL: [['Matador'], ['Rematador', 'Filigranas'], ['Cabeceador'], ['Desbordante', 'Aura'], ['GuanteEnElPie', 'LanzadorPenalties']],
};

const FORMACIONES_SINTETICAS: FormacionId[] = ['4-4-2', '4-3-3', '3-5-2', '4-2-3-1', '5-3-2'];

function sintetico(id: number, posicion: Posicion, valor: number, virtudes: Virtud[]): Jugador {
  const demarcacion = DEM[posicion];
  const stats = Object.fromEntries(CLAVES_STATS[demarcacion].map((c, i) => [c, valor + ((id + i) % 7) - 3])) as unknown as Jugador['stats'];
  return {
    id,
    nombre: 'Base',
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

function equipoSintetico(lado: 'local' | 'visitante', semilla: number): EquipoPartido {
  const base = (lado === 'local' ? 1 : 2) * 1000 + semilla * 50;
  const formacion = FORMACIONES_SINTETICAS[(semilla + (lado === 'local' ? 0 : 2)) % FORMACIONES_SINTETICAS.length]!;
  const valor = 74 + ((semilla * 3 + (lado === 'local' ? 0 : 5)) % 12);
  const titulares = FORMACIONES[formacion].casillas.map((c, i) => {
    const pos: Posicion = c.id === CASILLA_CENTRAL ? 'DCI' : c.posicionesAdmitidas[0]!;
    const rotacion = VIRTUDES_SINTETICAS[DEM[pos]];
    return { casillaId: c.id, jugador: sintetico(base + i, pos, valor, rotacion[(semilla + i) % rotacion.length]!) };
  });
  const suplentes = (['POR', 'DCI', 'LD', 'MC', 'MCO', 'DC', 'EI'] as Posicion[]).map((p, i) => sintetico(base + 20 + i, p, valor - 3, []));
  return {
    participanteId: lado,
    formacion,
    titulares,
    suplentes,
    tactica: tacticaPorDefecto(),
    lanzadores: proponerLanzadores(titulares.map((t) => t.jugador)),
  };
}

let core: Jugador[] | undefined;

function cartasCore(): Jugador[] {
  if (!core) {
    const ruta = fileURLToPath(new URL('../../../domain/tests/fixtures/core-004.json', import.meta.url));
    core = (JSON.parse(readFileSync(ruta, 'utf-8')) as { jugadores: Jugador[] }).jugadores;
  }
  return core;
}

/** Plantilla de 23 cartas Core (3 POR, 8 DEF, 7 MED, 5 DEL) elegidas por desplazamiento según la semilla. */
function plantillaCore(lado: 'local' | 'visitante', semilla: number): Jugador[] {
  const cartas = cartasCore();
  const cupos: Record<Demarcacion, number> = { POR: 3, DEF: 8, MED: 7, DEL: 5 };
  const desplazamiento = semilla * 2 + (lado === 'local' ? 0 : 1);
  const plantilla: Jugador[] = [];
  for (const d of ['POR', 'DEF', 'MED', 'DEL'] as const) {
    const deLaLinea = cartas.filter((j) => j.demarcacion === d);
    for (let k = 0; k < cupos[d]; k++) plantilla.push(deLaLinea[(desplazamiento + k * 2 * 10) % deLaLinea.length]!);
  }
  return plantilla;
}

function equipoCore(lado: 'local' | 'visitante', semilla: number): EquipoPartido {
  const plantilla = plantillaCore(lado, semilla);
  const a = autoAlineacion(plantilla, new Set(), PARAMETROS_V3, { formaciones: ['4-4-2', '4-3-3', '4-2-3-1'] });
  const porId = new Map(plantilla.map((j) => [j.id, j]));
  return {
    participanteId: lado,
    formacion: a.formacion,
    titulares: a.titulares.map((t) => ({ casillaId: t.casillaId, jugador: porId.get(t.jugadorId)! })),
    suplentes: a.suplentes.map((id) => porId.get(id)!),
    tactica: a.tactica,
    lanzadores: a.lanzadores,
  };
}

export const SEMILLAS_EQUIVALENCIA_005 = Array.from({ length: 20 }, (_, i) => i);

export function entradaEquivalencia005(i: number): EntradaPartido {
  const deCore = i >= 10;
  const semilla = deCore ? i - 10 : i;
  return {
    version: PARAMETROS_V3.version,
    parametros: PARAMETROS_V3,
    semilla: semillaDesdeTexto(`equivalencia-005-${i}`),
    eliminatoria: i % 5 === 4,
    local: deCore ? equipoCore('local', semilla) : equipoSintetico('local', semilla),
    visitante: deCore ? equipoCore('visitante', semilla) : equipoSintetico('visitante', semilla),
  };
}

/** Lo que se compara de cada evento: tipo, tick, equipo y los participantes. */
export type EventoResumido = [tipo: string, tick: number, equipo: string, jugadores: number[]];

export function resumir(eventos: readonly EventoPartido[]): EventoResumido[] {
  return eventos.map((e) => [e.tipo, e.tick, e.equipo, e.jugadores.map((j) => j.jugadorId)]);
}

export function jugarEquivalencia005(i: number): EventoResumido[] {
  return resumir(avanzar(crearPartido(entradaEquivalencia005(i)), 'final').eventos);
}
