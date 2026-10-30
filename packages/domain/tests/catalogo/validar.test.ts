import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DISTRIBUCION_CORE } from '../../src/catalogo/coleccionCore';
import type { Jugador } from '../../src/catalogo/tipos';
import { avisosColeccion, validarCatalogo, validarColeccion, validarJugador, type ReglaCatalogo } from '../../src/catalogo/validar';

const base = {
  nombre: 'Prueba',
  apellidos: 'Ficticio',
  nacionalidad: 'ESP',
  fecha_nacimiento: '1995-02-28',
  altura: 180,
  historia: '',
  defectos: [],
  nombre_carta: 'Prueba Ficticio',
  imagen: '/cartas/siluetas/por.svg',
  imagen_bg: '/cartas/fondos/por.svg',
};

const portero: Jugador = {
  ...base,
  id: 1,
  demarcacion: 'POR',
  posicion: ['POR'],
  stats: { agilidad: 80, colocacion: 80, distribucion: 70, aereo: 75, defensa: 75, liderazgo: 70 },
  media: 75,
  virtudes: ['Parapenalties'],
  nivel: 'Superclase',
};
const defensa: Jugador = {
  ...base,
  id: 2,
  demarcacion: 'DEF',
  posicion: ['CD', 'LD'],
  stats: { velocidad: 80, tecnica: 70, tackling: 80, anticipacion: 75, marcaje: 75, liderazgo: 70 },
  media: 75,
  virtudes: ['Infranqueable', 'BoxToBox'], // BoxToBox permitido por ser carrilero (FR-023)
  nivel: 'Crack',
};
const medio: Jugador = {
  ...base,
  id: 3,
  demarcacion: 'MED',
  posicion: ['MC', 'EI'],
  stats: { velocidad: 70, tecnica: 80, pase: 85, posicionamiento: 80, vision: 85, disparo: 70 },
  media: 78.33,
  virtudes: ['Todocampista', 'Capitania', 'Aura'],
  nivel: 'Legendario',
};
const delantero: Jugador = {
  ...base,
  id: 4,
  demarcacion: 'DEL',
  posicion: ['DC'],
  stats: { velocidad: 90, regate: 92, finalizacion: 94, desmarque: 90, creatividad: 88, agresividad: 80 },
  media: 89,
  virtudes: ['Matador', 'Rematador', 'Cabeceador', 'Robusto'],
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
    ['nacionalidad GBR (spec 006)', { ...portero, nacionalidad: 'GBR' }, 'nacionalidad'],
    ['con el campo coleccion (spec 006)', { ...portero, coleccion: 'Core' }, 'campos'],
    ['sin imagen', (({ imagen: _i, ...resto }) => resto)(portero), 'campos'],
    ['sin imagen_bg', (({ imagen_bg: _i, ...resto }) => resto)(portero), 'campos'],
    ['imagen fuera de /cartas/', { ...portero, imagen: '/otra/por.svg' }, 'imagen'],
    ['imagen_bg con extensión desconocida', { ...portero, imagen_bg: '/cartas/fondos/por.gif' }, 'imagen'],
    ['nombre_carta vacío', { ...portero, nombre_carta: ' ' }, 'nombre_carta'],
    ['nombre_carta de 25 caracteres', { ...portero, nombre_carta: 'x'.repeat(25) }, 'nombre_carta'],
    ['fecha imposible', { ...portero, fecha_nacimiento: '1995-02-30' }, 'fecha_nacimiento'],
    ['fecha mal formada', { ...portero, fecha_nacimiento: '28/02/1995' }, 'fecha_nacimiento'],
    ['altura fuera de rango', { ...portero, altura: 230 }, 'altura'],
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
    ['nivel desconocido', { ...medio, nivel: 'Epico' }, 'nivel'],
    ['virtudes repetidas', { ...delantero, virtudes: ['Matador', 'Matador'] }, 'virtudes_repetidas'],
    ['demasiadas virtudes (Superclase)', { ...portero, virtudes: ['Parapenalties', 'Santo'] }, 'virtudes_maximo'],
    ['demasiadas virtudes (Crack)', { ...defensa, virtudes: ['Infranqueable', 'Jerarquia', 'Volador'] }, 'virtudes_maximo'],
    ['virtud desconocida', { ...delantero, virtudes: ['Volar'] }, 'virtud_desconocida'],
    ['virtud de otra demarcación', { ...medio, virtudes: ['Matador'] }, 'virtud_no_permitida'],
    ['virtud de MED en defensa no carrilero', { ...defensa, posicion: ['DCI'] }, 'virtud_no_permitida'],
    ['defecto desconocido', { ...delantero, defectos: ['Vago'] }, 'defecto_desconocido'],
    ['defectos repetidos', { ...delantero, defectos: ['Chupon', 'Chupon'] }, 'defectos_repetidos'],
    ['más de 2 defectos', { ...delantero, defectos: ['Chupon', 'Torpe', 'Fragil'] }, 'defectos_maximo'],
    ['virtud y defecto incompatibles', { ...delantero, virtudes: ['DeAcero'], defectos: ['DeCristal'] }, 'rasgos_incompatibles'],
    ['virtud de resistencia y Fatigado', { ...medio, virtudes: ['Incansable'], defectos: ['Fatigado'] }, 'rasgos_incompatibles'],
    ['sin lista de defectos', { ...delantero, defectos: 'Chupon' }, 'defecto_desconocido'],
  ])('rechaza: %s', (_titulo, jugador, regla) => {
    expect(reglas(jugador)).toContain(regla);
  });

  it('un GOAT con 4 virtudes y 2 defectos compatibles es válido (FR-011)', () => {
    expect(validarJugador({ ...delantero, nivel: 'GOAT', virtudes: ['Matador', 'Aura', 'Capitania', 'DeAcero'], defectos: ['Chupon', 'Estrellita'] })).toEqual([]);
  });

  it('el mensaje del máximo de defectos es «Como máximo 2 defectos»', () => {
    expect(validarJugador({ ...delantero, defectos: ['Chupon', 'Torpe', 'Fragil'] }).find((e) => e.regla === 'defectos_maximo')?.mensaje).toBe(
      'Como máximo 2 defectos',
    );
  });

  it('el antiguo valor "Epico" ya no es válido: el nivel se llama "Crack"', () => {
    expect(reglas({ ...defensa, nivel: 'Epico' })).toContain('nivel');
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

describe('avisosColeccion (reparto de defectos)', () => {
  const cartas = (nivel: Jugador['nivel'], n: number, conDefecto: number): Jugador[] =>
    Array.from({ length: n }, (_, i) => ({ ...delantero, id: 1000 + i, nivel, virtudes: [], defectos: i < conDefecto ? ['Torpe'] : [] }));

  it('sin aviso si la proporción crece con el nivel y se acerca a REPARTO_DEFECTOS', () => {
    const coleccion = [...cartas('Superclase', 20, 3), ...cartas('Crack', 20, 5), ...cartas('Legendario', 20, 7), ...cartas('GOAT', 20, 10)];
    expect(avisosColeccion(coleccion)).toEqual([]);
  });

  it('avisa si un nivel alto tiene menos cartas con defectos que uno bajo', () => {
    const coleccion = [...cartas('Superclase', 20, 6), ...cartas('Crack', 20, 1)];
    expect(avisosColeccion(coleccion).map((a) => a.regla)).toContain('reparto_defectos');
  });
});

describe('data/core.json con rasgos (spec 005, T050; SC-008)', () => {
  const core = (JSON.parse(readFileSync(fileURLToPath(new URL('../../../../data/core.json', import.meta.url)), 'utf-8')) as { jugadores: Jugador[] }).jugadores;

  it('es válida: ninguna carta con más de 2 defectos ni con rasgos incompatibles', () => {
    expect(validarColeccion(core)).toEqual([]);
    expect(Math.max(...core.map((j) => j.defectos.length))).toBeLessThanOrEqual(2);
  });

  // Con los datos reales (spec 008) la cercanía a REPARTO_DEFECTOS la informa el sumario (FR-011); la tendencia se exige.
  it('la proporción de cartas con defectos crece con el nivel', () => {
    expect(avisosColeccion(core).filter((a) => a.mensaje.startsWith('Hay menos cartas con defectos'))).toEqual([]);
  });
});

describe('validarCatalogo (spec 006, data-model §1.2)', () => {
  // Una Core mínima que cumple DISTRIBUCION_CORE: 300 cartas con la demarcación y el nivel de cada celda.
  const core: Pick<Jugador, 'id' | 'demarcacion' | 'nivel'>[] = [];
  for (const [demarcacion, niveles] of Object.entries(DISTRIBUCION_CORE)) {
    for (const [nivel, n] of Object.entries(niveles)) {
      for (let i = 0; i < n; i++) core.push({ id: core.length + 1, demarcacion: demarcacion as Jugador['demarcacion'], nivel: nivel as Jugador['nivel'] });
    }
  }
  const extra = { id: 301, demarcacion: 'DEL' as const, nivel: 'GOAT' as const };
  const cartas = [...core, extra];
  const colCore = { id: 'core', nombre: 'Core', descripcion: 'Básica', tipo: 'basica', cartas: core.map((c) => c.id) };
  const pago = { id: 'all-stars', nombre: 'All Stars', descripcion: 'Pago', tipo: 'pago', precio_centimos: 499, destacadas: [301], cartas: [1, { id: 301, version: 'normal' }] };
  const mensajes = (colecciones: unknown, lista = cartas) => validarCatalogo(lista, colecciones).errores.map((e) => e.mensaje).join(' | ');

  it('acepta un catálogo válido y normaliza las entradas', () => {
    const r = validarCatalogo(cartas, [colCore, pago]);
    expect(r.errores).toEqual([]);
    expect(r.colecciones[1]).toMatchObject({ id: 'all-stars', precioCentimos: 499, cartas: [{ id: 1, version: 'normal' }, { id: 301, version: 'normal' }] });
  });

  it.each<[string, unknown[], RegExp]>([
    ['carta inexistente', [colCore, { ...pago, cartas: [301, 999] }], /999 no existe/],
    ['carta repetida', [colCore, { ...pago, cartas: [301, 301] }], /dos veces/],
    ['versión desconocida', [colCore, { ...pago, cartas: [{ id: 301, version: 'premium' }] }], /Versión desconocida/],
    ['carta huérfana', [colCore], /301 no pertenece/],
    ['dos básicas', [colCore, { ...pago, tipo: 'basica', precio_centimos: undefined }], /exactamente una colección básica/],
    ['pago sin precio', [colCore, { ...pago, precio_centimos: undefined }], /precio_centimos > 0/],
    ['destacadas fuera de cartas', [colCore, { ...pago, destacadas: [2] }], /destacadas/],
    ['id repetido', [colCore, pago, { ...pago }], /repetido/],
    ['id con mayúsculas', [colCore, { ...pago, id: 'All-Stars' }], /kebab-case/],
  ])('rechaza: %s', (_t, colecciones, mensaje) => {
    expect(mensajes(colecciones)).toMatch(mensaje);
  });

  it('acepta una Core que no cumple DISTRIBUCION_CORE (spec 008, R8)', () => {
    expect(validarCatalogo(cartas, [{ ...colCore, cartas: core.slice(1).map((c) => c.id) }, { ...pago, cartas: [1, 301] }]).errores).toEqual([]);
  });
});
