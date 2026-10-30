/** Jugadores y plantillas sintéticos para las pruebas de los NPC. */
import {
  calcularMedia,
  CLAVES_STATS,
  POSICIONES_POR_DEMARCACION,
  type Demarcacion,
  type Jugador,
  type Nivel,
  type Posicion,
  type Virtud,
} from '@fbd/domain';

const DEM: Record<Posicion, Demarcacion> = Object.fromEntries(
  (Object.entries(POSICIONES_POR_DEMARCACION) as [Demarcacion, readonly Posicion[]][]).flatMap(([d, ps]) => ps.map((p) => [p, d])),
) as Record<Posicion, Demarcacion>;

let id = 1;

export function jugador(posicion: Posicion, valor = 80, virtudes: Virtud[] = [], otras: Posicion[] = []): Jugador {
  const demarcacion = DEM[posicion];
  const stats = Object.fromEntries(CLAVES_STATS[demarcacion].map((c) => [c, valor])) as unknown as Jugador['stats'];
  const nivel: Nivel = valor >= 88 ? 'GOAT' : valor >= 83 ? 'Legendario' : valor >= 78 ? 'Crack' : 'Superclase';
  const j: Jugador = {
    id: id++,
    nombre: 'Prueba',
    apellidos: posicion,
    nacionalidad: 'ESP',
    fecha_nacimiento: '1995-01-01',
    altura: 180,
    demarcacion,
    posicion: [posicion, ...otras],
    historia: '',
    stats,
    media: 0,
    nivel,
    virtudes,
    defectos: [],
    nombre_carta: 'Prueba',
    imagen: '/cartas/siluetas/med.svg',
    imagen_bg: '/cartas/fondos/med.svg',
  } as Jugador;
  j.media = calcularMedia(j);
  return j;
}

/** Plantilla completa de 24 (3 POR, 8 DEF, 8 MED, 5 DEL) con valores alrededor de `valor`. */
export function plantilla(valor = 80): Jugador[] {
  const pos: Posicion[] = [
    'POR', 'POR', 'POR',
    'LI', 'LD', 'DCI', 'DCD', 'DCI', 'DCD', 'LI', 'LD',
    'MC', 'MC', 'MD', 'MCO', 'MII', 'MID', 'MC', 'MD',
    'DC', 'DC', 'EI', 'ED', 'SD',
  ];
  return pos.map((p, i) => jugador(p, valor + ((i * 7) % 5) - 2));
}
