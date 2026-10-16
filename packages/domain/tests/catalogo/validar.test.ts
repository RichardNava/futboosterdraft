import { describe, expect, it } from 'vitest';
import type { Jugador } from '../../src/catalogo/tipos';
import { validarColeccion, validarJugador, type ReglaCatalogo } from '../../src/catalogo/validar';

const base = {
  nombre: 'Prueba',
  apellidos: 'Ficticio',
  nacionalidad: 'ESP',
  fecha_nacimiento: '1995-02-28',
  altura: 180,
  historia: '',
  coleccion: 'Core',
};

const portero: Jugador = {
  ...base,
  id: 1,
  demarcacion: 'POR',
  posicion: ['POR'],
  stats: { agilidad: 80, colocacion: 80, distribucion: 70, aereo: 75, defensa: 75, liderazgo: 70 },
  media: 75,
  specials: ['Parapenalties'],
  nivel: 'Superclase',
};
const defensa: Jugador = {
  ...base,
  id: 2,
  demarcacion: 'DEF',
  posicion: ['CD', 'LD'],
  stats: { velocidad: 80, tecnica: 70, tackling: 80, anticipacion: 75, marcaje: 75, liderazgo: 70 },
  media: 75,
  specials: ['Infranqueable', 'BoxToBox'], // BoxToBox permitido por ser carrilero (FR-023)
  nivel: 'Epico',
};
const medio: Jugador = {
  ...base,
  id: 3,
  demarcacion: 'MED',
  posicion: ['MC', 'EI'],
  stats: { velocidad: 70, tecnica: 80, pase: 85, posicionamiento: 80, vision: 85, disparo: 70 },
  media: 78.33,
  specials: ['Todocampista', 'Capitania', 'Aura'],
  nivel: 'Legendario',
};
const delantero: Jugador = {
  ...base,
  id: 4,
  demarcacion: 'DEL',
  posicion: ['DC'],
  stats: { velocidad: 90, regate: 92, finalizacion: 94, desmarque: 90, creatividad: 88, agresividad: 80 },
  media: 89,
  specials: ['Matador', 'Rematador', 'Cabeceador', 'Robusto'],
  nivel: 'GOAT',
};

const reglas = (j: unknown): ReglaCatalogo[] => validarJugador(j).map((e) => e.regla);

describe('validarJugador', () => {
  it.each([portero, defensa, medio, delantero])('acepta un $demarcacion válido', (j) => {
    expect(validarJugador(j)).toEqual([]);
  });

  it.each<[string, unknown, ReglaCatalogo]>([
    ['faltan campos', (({ historia: _h, nivel: _n, ...resto }) => resto)(portero), 'campos'],
    ['sobran campos', { ...portero, extra: 1 }, 'campos'],
    ['id no entero', { ...portero, id: 1.5 }, 'id'],
    ['nombre vacío', { ...portero, nombre: '  ' }, 'texto_vacio'],
    ['nacionalidad corta', { ...portero, nacionalidad: 'E' }, 'nacionalidad'],
    ['fecha imposible', { ...portero, fecha_nacimiento: '1995-02-30' }, 'fecha_nacimiento'],
    ['fecha mal formada', { ...portero, fecha_nacimiento: '28/02/1995' }, 'fecha_nacimiento'],
    ['altura fuera de rango', { ...portero, altura: 230 }, 'altura'],
    ['colección distinta', { ...portero, coleccion: 'Otra' }, 'coleccion'],
    ['demarcación desconocida', { ...portero, demarcacion: 'XXX' }, 'demarcacion'],
    ['sin posiciones', { ...medio, posicion: [] }, 'posicion_vacia'],
    ['posiciones repetidas', { ...medio, posicion: ['MC', 'MC'] }, 'posicion_repetida'],
    ['posición desconocida', { ...medio, posicion: ['MC', 'XX'] }, 'posicion_invalida'],
    ['portero con posición de campo', { ...portero, posicion: ['POR', 'LI'] }, 'portero_posiciones'],
    ['jugador de campo con POR', { ...medio, posicion: ['MC', 'POR'] }, 'campo_en_porteria'],
    ['stats de otra demarcación', { ...medio, stats: portero.stats }, 'stats_claves'],
    ['stat fuera de rango', { ...medio, stats: { ...medio.stats, pase: 100 } }, 'stats_rango'],
    ['stat no entero', { ...medio, stats: { ...medio.stats, pase: 80.5 } }, 'stats_rango'],
    ['media incorrecta', { ...medio, media: 80 }, 'media'],
    ['nivel desconocido', { ...medio, nivel: 'Épico' }, 'nivel'],
    ['specials repetidos', { ...delantero, specials: ['Matador', 'Matador'] }, 'specials_repetidos'],
    ['demasiados specials (Superclase)', { ...portero, specials: ['Parapenalties', 'Santo'] }, 'specials_maximo'],
    ['demasiados specials (Épico)', { ...defensa, specials: ['Infranqueable', 'Jerarquia', 'Volador'] }, 'specials_maximo'],
    ['special desconocido', { ...delantero, specials: ['Volar'] }, 'special_desconocido'],
    ['special de otra demarcación', { ...medio, specials: ['Matador'] }, 'special_no_permitido'],
    ['special de MED en defensa no carrilero', { ...defensa, posicion: ['DCI'] }, 'special_no_permitido'],
  ])('rechaza: %s', (_titulo, jugador, regla) => {
    expect(reglas(jugador)).toContain(regla);
  });

  it('el valor "Épico" con tilde no es válido en los datos: se escribe "Epico"', () => {
    expect(reglas({ ...defensa, nivel: 'Épico' })).toContain('nivel');
  });
});

describe('validarColeccion', () => {
  it('acepta una colección válida', () => {
    expect(validarColeccion([portero, defensa, medio, delantero])).toEqual([]);
  });

  it('detecta ids repetidos', () => {
    const errores = validarColeccion([portero, { ...defensa, id: portero.id }]);
    expect(errores.map((e) => e.regla)).toContain('id_repetido');
  });

  it('rechaza algo que no es una lista', () => {
    expect(validarColeccion({})[0]?.regla).toBe('campos');
  });
});
