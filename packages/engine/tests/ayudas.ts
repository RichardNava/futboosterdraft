/** Equipos y partidos de prueba para el motor. */
import {
  calcularMedia,
  CASILLA_CENTRAL,
  CLAVES_STATS,
  FORMACIONES,
  PARAMETROS_V2,
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
import { crearPartido, type EntradaPartido, type EquipoPartido, type EstadoMotor } from '../src/index';

const DEM: Record<Posicion, Demarcacion> = {
  POR: 'POR', LI: 'DEF', LD: 'DEF', DCI: 'DEF', DCD: 'DEF', CI: 'DEF', CD: 'DEF',
  MD: 'MED', MC: 'MED', MII: 'MED', MID: 'MED', MCO: 'MED', DC: 'DEL', SD: 'DEL', EI: 'DEL', ED: 'DEL',
};

let id = 1;

export function jugador(posicion: Posicion, valor = 80, specials: Special[] = []): Jugador {
  const demarcacion = DEM[posicion];
  const stats = Object.fromEntries(CLAVES_STATS[demarcacion].map((c) => [c, valor])) as unknown as Jugador['stats'];
  return {
    id: id++,
    nombre: 'Prueba',
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

export function equipo(
  participanteId: string,
  opciones: { formacion?: FormacionId; valor?: number; tactica?: Partial<Tactica>; specials?: Special[]; specialsPortero?: Special[] } = {},
): EquipoPartido {
  const formacion = opciones.formacion ?? '4-4-2';
  const titulares = FORMACIONES[formacion].casillas.map((c) => {
    const pos: Posicion = c.id === CASILLA_CENTRAL ? 'DCI' : c.posicionesAdmitidas[0]!;
    const specials = pos === 'POR' ? (opciones.specialsPortero ?? []) : (opciones.specials ?? []);
    return { casillaId: c.id, jugador: jugador(pos, opciones.valor ?? 80, specials) };
  });
  const suplentes = (['POR', 'DCI', 'LD', 'MC', 'MCO', 'DC', 'EI'] as Posicion[]).map((p) => jugador(p, (opciones.valor ?? 80) - 3));
  return {
    participanteId,
    formacion,
    titulares,
    suplentes,
    tactica: { ...tacticaPorDefecto(), ...opciones.tactica },
    lanzadores: proponerLanzadores(titulares.map((t) => t.jugador)),
  };
}

export function entrada(semilla: string, cambios: Partial<EntradaPartido> = {}): EntradaPartido {
  return {
    version: PARAMETROS_V2.version,
    parametros: PARAMETROS_V2,
    semilla: semillaDesdeTexto(semilla),
    eliminatoria: false,
    local: equipo('local'),
    visitante: equipo('visitante'),
    ...cambios,
  };
}

export const partido = (semilla: string, cambios: Partial<EntradaPartido> = {}): EstadoMotor => crearPartido(entrada(semilla, cambios));

export const rngDePrueba = (texto: string) => new Rng(semillaDesdeTexto(texto));
