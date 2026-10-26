/** Utilidades compartidas por las pruebas de equipo: jugadores sintéticos y el catálogo Core. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { calcularMedia, CLAVES_STATS, type Demarcacion, type Jugador, type Posicion, type Virtud } from '../../src/catalogo/tipos';

let siguienteId = 10_000;

export function jugador(
  demarcacion: Demarcacion,
  posicion: Posicion[],
  valor = 80,
  virtudes: Virtud[] = [],
  ajustes: Record<string, number> = {},
): Jugador {
  const stats = Object.fromEntries(CLAVES_STATS[demarcacion].map((c) => [c, ajustes[c] ?? valor])) as unknown as Jugador['stats'];
  return {
    id: siguienteId++,
    nombre: 'Prueba',
    apellidos: `${demarcacion} ${posicion.join('/')}`,
    nacionalidad: 'ESP',
    fecha_nacimiento: '1995-01-01',
    altura: 180,
    demarcacion,
    posicion,
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

export function catalogoCore(): Jugador[] {
  return (
    JSON.parse(readFileSync(fileURLToPath(new URL('../../../../data/core.json', import.meta.url)), 'utf-8')) as {
      jugadores: Jugador[];
    }
  ).jugadores;
}

/** Plantilla de 24 equilibrada: 3 POR, 8 DEF, 8 MED, 5 DEL con todas las posiciones cubiertas. */
export function plantillaEquilibrada(): Jugador[] {
  return [
    jugador('POR', ['POR'], 82),
    jugador('POR', ['POR'], 75),
    jugador('POR', ['POR'], 70),
    jugador('DEF', ['LI', 'CI'], 80),
    jugador('DEF', ['LD', 'CD'], 80),
    jugador('DEF', ['DCI'], 82),
    jugador('DEF', ['DCD'], 82),
    jugador('DEF', ['DCI', 'DCD'], 78),
    jugador('DEF', ['CI'], 76),
    jugador('DEF', ['CD'], 76),
    jugador('DEF', ['LI'], 72),
    jugador('MED', ['MD'], 81),
    jugador('MED', ['MC'], 83),
    jugador('MED', ['MC', 'MD'], 79),
    jugador('MED', ['MII'], 80),
    jugador('MED', ['MID'], 80),
    jugador('MED', ['MCO'], 84),
    jugador('MED', ['MC'], 74),
    jugador('MED', ['MII', 'MID'], 73),
    jugador('DEL', ['DC'], 85, ['LanzadorPenalties']),
    jugador('DEL', ['EI'], 82, [], { creatividad: 90 }),
    jugador('DEL', ['ED'], 82, ['GuanteEnElPie']),
    jugador('DEL', ['SD', 'DC'], 79),
    jugador('DEL', ['EI', 'ED'], 74),
  ];
}
