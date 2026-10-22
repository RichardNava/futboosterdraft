/** Equipos y partidos de prueba para el motor. */
import {
  calcularMedia,
  CASILLA_CENTRAL,
  CLAVES_STATS,
  FORMACIONES,
  PARAMETROS_V3,
  proponerLanzadores,
  Rng,
  semillaDesdeTexto,
  tacticaPorDefecto,
  type Demarcacion,
  type FormacionId,
  type Jugador,
  type Posicion,
  type Defecto,
  type Virtud,
  type Tactica,
} from '@fbd/domain';
import type { Contexto } from '../src/acciones/contexto';
import { crearPartido, type EntradaPartido, type EquipoPartido, type EstadoMotor, type JugadorEnPartido } from '../src/index';

const DEM: Record<Posicion, Demarcacion> = {
  POR: 'POR', LI: 'DEF', LD: 'DEF', DCI: 'DEF', DCD: 'DEF', CI: 'DEF', CD: 'DEF',
  MD: 'MED', MC: 'MED', MII: 'MED', MID: 'MED', MCO: 'MED', DC: 'DEL', SD: 'DEL', EI: 'DEL', ED: 'DEL',
};

let id = 1;

export function jugador(posicion: Posicion, valor = 80, virtudes: Virtud[] = []): Jugador {
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
    virtudes,
    defectos: [],
    nivel: 'Superclase',
    coleccion: 'Core',
  };
}

export function equipo(
  participanteId: string,
  opciones: { formacion?: FormacionId; valor?: number; tactica?: Partial<Tactica>; virtudes?: Virtud[]; virtudesPortero?: Virtud[] } = {},
): EquipoPartido {
  const formacion = opciones.formacion ?? '4-4-2';
  const titulares = FORMACIONES[formacion].casillas.map((c) => {
    const pos: Posicion = c.id === CASILLA_CENTRAL ? 'DCI' : c.posicionesAdmitidas[0]!;
    const virtudes = pos === 'POR' ? (opciones.virtudesPortero ?? []) : (opciones.virtudes ?? []);
    return { casillaId: c.id, jugador: jugador(pos, opciones.valor ?? 80, virtudes) };
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
    version: PARAMETROS_V3.version,
    parametros: PARAMETROS_V3,
    semilla: semillaDesdeTexto(semilla),
    eliminatoria: false,
    local: equipo('local'),
    visitante: equipo('visitante'),
    ...cambios,
  };
}

export const partido = (semilla: string, cambios: Partial<EntradaPartido> = {}): EstadoMotor => crearPartido(entrada(semilla, cambios));

export const rngDePrueba = (texto: string) => new Rng(semillaDesdeTexto(texto));

/** Contexto de simulación sobre un estado construido a mano (pruebas de las acciones, spec 003). */
export function contextoDe(estado: EstadoMotor, semilla = 'ctx'): Contexto {
  return { estado, rng: rngDePrueba(semilla), interrupcion: false };
}

/** Sitúa a un jugador en un punto en coordenadas de su equipo (x = 0 en su portería). */
export function situar(estado: EstadoMotor, id: number, punto: { x: number; y: number }): void {
  const lado = estado.equipos.local.jugadores.some((j) => j.id === id) ? 'local' : 'visitante';
  const abs = lado === 'local' ? punto : { x: 10000 - punto.x, y: 6400 - punto.y };
  estado.espacio.jugadores[id] = { x: abs.x, y: abs.y, vx: 0, vy: 0, papel: 0 };
}

/** Deja en el campo solo a los jugadores indicados (los demás no son candidatos para nada). */
export function soloEnCampo(estado: EstadoMotor, ids: readonly number[]): void {
  const quedan = new Set(ids);
  for (const id of Object.keys(estado.espacio.jugadores)) if (!quedan.has(Number(id))) delete estado.espacio.jugadores[Number(id)];
}

/** Titular de la casilla indicada. */
export function titularEn(estado: EstadoMotor, lado: 'local' | 'visitante', casillaId: string): JugadorEnPartido {
  return estado.equipos[lado].jugadores.find((j) => j.casillaId === casillaId)!;
}

/** El balón, pegado al portador, con la posesión de su equipo en la zona y el carril de su posición. */
export function darBalon(estado: EstadoMotor, lado: 'local' | 'visitante', portador: JugadorEnPartido, zona: number, carril = 1): void {
  const p = estado.espacio.jugadores[portador.id]!;
  estado.espacio.balon = { x: p.x, y: p.y, z: 0 };
  estado.balon = { posesion: lado, zona, carril, portadorId: portador.id, transicion: false };
}

/** Cambia las virtudes y los defectos de un jugador del estado (pruebas de rasgos de la spec 005). */
export function ponerRasgos(j: JugadorEnPartido, rasgos: { virtudes?: Virtud[]; defectos?: Defecto[] }): JugadorEnPartido {
  j.jugador = { ...j.jugador, virtudes: rasgos.virtudes ?? j.jugador.virtudes, defectos: rasgos.defectos ?? j.jugador.defectos };
  return j;
}
