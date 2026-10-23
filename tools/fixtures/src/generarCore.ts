#!/usr/bin/env tsx
/**
 * Generador de la colección Core (T020): 300 jugadores ficticios con la distribución exacta de la
 * especificación (Assumptions, "Tamaño de la colección Core").
 *
 * Los nombres se construyen a partir de nombres de pila comunes y apellidos inventados por
 * sílabas, para no reproducir a personas reales. El resultado es determinista (semilla fija) y se
 * valida con las reglas del catálogo antes de escribirse.
 *
 * Uso: pnpm generar-core [--salida data/core.json] [--semilla texto]
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CLAVES_STATS,
  DISTRIBUCION_CORE,
  MAX_VIRTUDES,
  Rng,
  VIRTUDES_GENERICAS,
  VIRTUDES_NUEVAS_005,
  VIRTUDES_POR_DEMARCACION,
  VIRTUDES_MED,
  calcularMedia,
  semillaDesdeTexto,
  validarColeccion,
  type Demarcacion,
  type Jugador,
  type Nivel,
  type Posicion,
  type Virtud,
} from '@fbd/domain';

export { DISTRIBUCION_CORE } from '@fbd/domain';

/** Rango de media objetivo por nivel. */
const MEDIA_POR_NIVEL: Readonly<Record<Nivel, [number, number]>> = {
  Superclase: [70, 79],
  Epico: [78, 84],
  Legendario: [83, 89],
  GOAT: [88, 94],
};

/** Reparto de la posición principal dentro de cada demarcación (pesos). */
const POSICION_PRINCIPAL: Readonly<Record<Demarcacion, ReadonlyArray<[Posicion, number]>>> = {
  POR: [['POR', 1]],
  DEF: [
    ['DCI', 22],
    ['DCD', 22],
    ['LI', 14],
    ['LD', 14],
    ['CI', 14],
    ['CD', 14],
  ],
  MED: [
    ['MD', 22],
    ['MC', 26],
    ['MII', 16],
    ['MID', 16],
    ['MCO', 20],
  ],
  DEL: [
    ['DC', 22],
    ['SD', 12],
    ['EI', 17],
    ['ED', 17],
  ],
};

/** Posiciones secundarias verosímiles para cada principal, con su probabilidad. */
const SECUNDARIAS: Readonly<Partial<Record<Posicion, ReadonlyArray<[Posicion, number]>>>> = {
  DCI: [['DCD', 0.5], ['LI', 0.1]],
  DCD: [['DCI', 0.5], ['LD', 0.1]],
  LI: [['CI', 0.6], ['DCI', 0.1]],
  LD: [['CD', 0.6], ['DCD', 0.1]],
  CI: [['LI', 0.6], ['MII', 0.15]],
  CD: [['LD', 0.6], ['MID', 0.15]],
  MD: [['MC', 0.5], ['DCD', 0.1]],
  MC: [['MD', 0.35], ['MII', 0.25], ['MID', 0.25]],
  MII: [['MC', 0.4], ['EI', 0.25]],
  MID: [['MC', 0.4], ['ED', 0.25]],
  MCO: [['MC', 0.3], ['SD', 0.3]],
  DC: [['SD', 0.35]],
  SD: [['DC', 0.4], ['MCO', 0.3]],
  EI: [['ED', 0.3], ['MII', 0.15]],
  ED: [['EI', 0.3], ['MID', 0.15]],
};

/** Stats que pesan más según la posición principal (+), para dar perfiles reconocibles. */
const PERFIL: Readonly<Partial<Record<Posicion, readonly string[]>>> = {
  POR: ['agilidad', 'colocacion'],
  DCI: ['tackling', 'marcaje', 'anticipacion'],
  DCD: ['tackling', 'marcaje', 'anticipacion'],
  LI: ['velocidad', 'tecnica'],
  LD: ['velocidad', 'tecnica'],
  CI: ['velocidad', 'tecnica'],
  CD: ['velocidad', 'tecnica'],
  MD: ['posicionamiento', 'pase'],
  MC: ['pase', 'vision'],
  MII: ['tecnica', 'pase'],
  MID: ['tecnica', 'pase'],
  MCO: ['vision', 'tecnica', 'disparo'],
  DC: ['finalizacion', 'desmarque'],
  SD: ['creatividad', 'regate'],
  EI: ['velocidad', 'regate'],
  ED: ['velocidad', 'regate'],
};

/** Virtudes especialmente ligadas a una posición (más probables). */
const VIRTUDES_AFINES: Readonly<Partial<Record<Posicion, readonly Virtud[]>>> = {
  POR: ['Parapenalties', 'OneToOne', 'Santo', 'Ordenabarreras', 'JugadorDeCampo'],
  DCI: ['Infranqueable', 'Jerarquia', 'Volador', 'MuroDefensivo', 'Potente'],
  DCD: ['Infranqueable', 'Jerarquia', 'Volador', 'MuroDefensivo', 'Potente'],
  LI: ['Incansable', 'Libero', 'Presionador'],
  LD: ['Incansable', 'Libero', 'Presionador'],
  CI: ['Incansable', 'BoxToBox'],
  CD: ['Incansable', 'BoxToBox'],
  MD: ['RecuperadorTrasPerdida', 'Presionador'],
  MC: ['PrimerToque', 'BoxToBox', 'Carismatico', 'Capitania'],
  MII: ['JugadorEntreLineas', 'Llegador', 'Elegante'],
  MID: ['JugadorEntreLineas', 'Llegador', 'Elegante'],
  MCO: ['JugadorEntreLineas', 'LanzadorFaltas', 'Filigranas', 'Carismatico'],
  DC: ['Matador', 'Rematador', 'Cabeceador', 'LanzadorPenalties'],
  SD: ['Matador', 'Filigranas', 'LanzadorPenalties'],
  EI: ['Desbordante', 'GuanteEnElPie', 'Filigranas'],
  ED: ['Desbordante', 'GuanteEnElPie', 'Filigranas'],
};

const NOMBRES = [
  'Adrián', 'Álvaro', 'Andrés', 'Bruno', 'Carlos', 'César', 'Dani', 'Diego', 'Eloy', 'Enzo', 'Fabio',
  'Félix', 'Gael', 'Gonzalo', 'Héctor', 'Hugo', 'Iker', 'Iván', 'Jaime', 'Joel', 'Jorge', 'Julen',
  'Leo', 'Lucas', 'Marco', 'Mateo', 'Nico', 'Óscar', 'Pablo', 'Rafa', 'Rubén', 'Saúl', 'Teo', 'Tomás',
  'Unai', 'Víctor', 'Yago', 'Aitor', 'Ander', 'Bastien', 'Callum', 'Dario', 'Emeka', 'Filipe', 'Gaspard',
  'Ilya', 'Jonas', 'Kofi', 'Lasse', 'Milo', 'Noah', 'Otto', 'Piet', 'Quim', 'Ruben', 'Sven', 'Tiago',
  'Ugo', 'Vasco', 'Wim', 'Yannick', 'Zeno',
];
const SILABAS_INICIO = ['Bar', 'Cal', 'Dor', 'Es', 'Fer', 'Gal', 'Hor', 'Ib', 'Jar', 'Lan', 'Mar', 'Nor', 'Or', 'Pal', 'Quin', 'Ros', 'Sal', 'Tor', 'Ur', 'Val', 'Zar', 'Bel', 'Cor', 'Del', 'Mon'];
const SILABAS_MEDIO = ['a', 'e', 'i', 'o', 'ar', 'en', 'il', 'or', 'u', 'an', 'el', 'ir'];
const SILABAS_FIN = ['da', 'des', 'go', 'lla', 'mos', 'nez', 'ral', 'res', 'rio', 'sa', 'tes', 'via', 'zal', 'dez', 'nas', 'ver', 'mar', 'tal'];
// Códigos ISO 3166-1 alfa-3.
const NACIONALIDADES = ['ESP', 'ARG', 'BRA', 'FRA', 'ITA', 'PRT', 'DEU', 'GBR', 'URY', 'COL', 'MEX', 'NLD', 'BEL', 'HRV', 'SEN', 'NGA', 'MAR', 'JPN', 'USA', 'CHL'];
const ALTURA: Readonly<Record<Demarcacion, [number, number]>> = {
  POR: [183, 200],
  DEF: [172, 195],
  MED: [165, 188],
  DEL: [163, 194],
};
const NIVELES_TEXTO: Readonly<Record<Nivel, string>> = {
  Superclase: 'un fijo en cualquier once',
  Epico: 'una figura de su generación',
  Legendario: 'una leyenda en activo',
  GOAT: 'uno de los mejores de todos los tiempos',
};

function apellido(rng: Rng): string {
  return rng.elegir(SILABAS_INICIO) + rng.elegir(SILABAS_MEDIO) + rng.elegir(SILABAS_FIN);
}

function eleccionPonderada<T>(rng: Rng, opciones: ReadonlyArray<[T, number]>): T {
  const total = opciones.reduce((a, [, p]) => a + p, 0);
  let x = rng.entero(1, total);
  for (const [valor, peso] of opciones) {
    x -= peso;
    if (x <= 0) return valor;
  }
  return opciones[opciones.length - 1]![0];
}

function generarStats(rng: Rng, demarcacion: Demarcacion, principal: Posicion, nivel: Nivel): Jugador['stats'] {
  const [min, max] = MEDIA_POR_NIVEL[nivel];
  const claves = CLAVES_STATS[demarcacion];
  const destacadas = new Set(PERFIL[principal] ?? []);
  // Reintenta hasta que la media exacta caiga dentro del rango del nivel.
  for (let intento = 0; intento < 1000; intento++) {
    const objetivo = rng.entero(min, max);
    const stats: Record<string, number> = {};
    for (const clave of claves) {
      const sesgo = destacadas.has(clave) ? rng.entero(3, 8) : rng.entero(-7, 2);
      stats[clave] = Math.max(1, Math.min(99, objetivo + sesgo + rng.entero(-3, 3)));
    }
    const media = calcularMedia({ demarcacion, stats: stats as Jugador['stats'] });
    if (media >= min && media <= max + 0.99) return stats as Jugador['stats'];
  }
  throw new Error(`No se pudieron generar stats para ${demarcacion}/${nivel}`);
}

function generarVirtudes(rng: Rng, jugador: Pick<Jugador, 'demarcacion' | 'posicion' | 'nivel'>): Virtud[] {
  const maximo = MAX_VIRTUDES[jugador.nivel];
  // Los niveles altos suelen llenar sus huecos; un Superclase puede no tener ninguno.
  const cantidad = jugador.nivel === 'Superclase' ? rng.entero(0, 1) : rng.entero(Math.max(1, maximo - 1), maximo);
  // Las virtudes de la spec 005 no las reparte el generador original, sino la pasada de `asignarRasgos` (research R5).
  const genericas = VIRTUDES_GENERICAS.filter((v) => !VIRTUDES_NUEVAS_005.includes(v));
  const permitidos = new Set<Virtud>([...genericas, ...VIRTUDES_POR_DEMARCACION[jugador.demarcacion]]);
  if (jugador.demarcacion === 'DEF' && (jugador.posicion.includes('CI') || jugador.posicion.includes('CD'))) {
    for (const s of VIRTUDES_MED) permitidos.add(s);
  }
  const afines = (VIRTUDES_AFINES[jugador.posicion[0]!] ?? []).filter((s) => permitidos.has(s));
  const elegidos = new Set<Virtud>();
  while (elegidos.size < cantidad) {
    const pool = rng.probabilidad(650) && afines.length ? afines : [...permitidos];
    elegidos.add(rng.elegir(pool));
  }
  return [...elegidos];
}

function generarPosiciones(rng: Rng, demarcacion: Demarcacion): Posicion[] {
  const principal = eleccionPonderada(rng, POSICION_PRINCIPAL[demarcacion]);
  const posiciones: Posicion[] = [principal];
  for (const [secundaria, prob] of SECUNDARIAS[principal] ?? []) {
    if (rng.probabilidad(Math.round(prob * 1000)) && !posiciones.includes(secundaria)) posiciones.push(secundaria);
  }
  return posiciones;
}

export function generarCore(semillaTexto = 'futboosterdraft-core-v1'): Jugador[] {
  const rng = new Rng(semillaDesdeTexto(semillaTexto));
  const jugadores: Jugador[] = [];
  const nombresUsados = new Set<string>();
  let id = 1;
  for (const demarcacion of ['POR', 'DEF', 'MED', 'DEL'] as const) {
    for (const nivel of ['Superclase', 'Epico', 'Legendario', 'GOAT'] as const) {
      for (let n = 0; n < DISTRIBUCION_CORE[demarcacion][nivel]; n++) {
        let nombre: string;
        let apellidos: string;
        do {
          nombre = rng.elegir(NOMBRES);
          apellidos = `${apellido(rng)} ${apellido(rng)}`;
        } while (nombresUsados.has(`${nombre} ${apellidos}`));
        nombresUsados.add(`${nombre} ${apellidos}`);

        const posicion = generarPosiciones(rng, demarcacion);
        const stats = generarStats(rng, demarcacion, posicion[0]!, nivel);
        const media = Math.round(calcularMedia({ demarcacion, stats }) * 100) / 100;
        const anio = rng.entero(1986, 2006);
        const mes = String(rng.entero(1, 12)).padStart(2, '0');
        const dia = String(rng.entero(1, 28)).padStart(2, '0');
        const [altMin, altMax] = ALTURA[demarcacion];
        const nacionalidad = rng.elegir(NACIONALIDADES);
        const base = { demarcacion, posicion, nivel };
        jugadores.push({
          id: id++,
          nombre,
          apellidos,
          nacionalidad,
          fecha_nacimiento: `${anio}-${mes}-${dia}`,
          altura: rng.entero(altMin, altMax),
          demarcacion,
          posicion,
          historia: `${nombre} ${apellidos.split(' ')[0]} (${nacionalidad}) es ${NIVELES_TEXTO[nivel]}. Destaca como ${posicion[0]}.`,
          stats,
          media,
          virtudes: generarVirtudes(rng, base),
          defectos: [],
          nivel,
          coleccion: 'Core',
        });
      }
    }
  }
  return jugadores;
}

function principal(): void {
  const args = process.argv.slice(2).filter((a) => a !== '--');
  const salidaIdx = args.indexOf('--salida');
  const semillaIdx = args.indexOf('--semilla');
  const salida = resolve(
    process.env.INIT_CWD ?? process.cwd(),
    salidaIdx >= 0 ? args[salidaIdx + 1]! : 'data/core.json',
  );
  const jugadores = generarCore(semillaIdx >= 0 ? args[semillaIdx + 1] : undefined);
  const errores = validarColeccion(jugadores);
  if (errores.length) {
    console.error(errores.slice(0, 20));
    throw new Error(`La colección generada tiene ${errores.length} errores`);
  }
  const fichero = { coleccion: 'Core', version: '1.0.0', jugadores };
  writeFileSync(salida, JSON.stringify(fichero, null, 2) + '\n', 'utf-8');
  console.log(`Escritos ${jugadores.length} jugadores en ${salida}`);
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('fixtures/src/generarCore.ts')) principal();
