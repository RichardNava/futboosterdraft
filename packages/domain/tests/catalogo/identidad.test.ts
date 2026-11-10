/** Identidad de las cartas (spec 011, US4; T056; data-model §6). */
import { describe, expect, it } from 'vitest';
import { conIdentidad, nombreGenerico } from '../../src/catalogo/identidad';
import type { Jugador } from '../../src/catalogo/tipos';
import { validarJugador } from '../../src/catalogo/validar';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CORE = (JSON.parse(readFileSync(fileURLToPath(new URL('../../../../data/core-real.json', import.meta.url)), 'utf-8')) as { jugadores: Jugador[] }).jugadores;
const jugadoresCore = (): Jugador[] => CORE;

const INMUTABLES = ['id', 'stats', 'media', 'virtudes', 'defectos', 'nivel', 'demarcacion', 'posicion', 'nacionalidad', 'altura', 'fecha_nacimiento'] as const;

describe('conIdentidad', () => {
  const base = jugadoresCore()[0]!;
  const conAlt: Jugador = { ...base, identidad_alternativa: { nombre: 'Íker', apellidos: 'Lunar', nombre_carta: 'Íker Lunar', imagen: '/cartas/retratos-propios/iker-lunar.webp' } };

  it('real: el jugador tal cual', () => {
    expect(conIdentidad(base, 'real')).toBe(base);
  });

  it('alternativa con identidad alternativa: sus valores, sin historia ni la propia identidad alternativa', () => {
    const v = conIdentidad(conAlt, 'alternativa');
    expect(v).toMatchObject({ nombre: 'Íker', apellidos: 'Lunar', nombre_carta: 'Íker Lunar', imagen: '/cartas/retratos-propios/iker-lunar.webp', historia: '' });
    expect(v).not.toHaveProperty('identidad_alternativa');
  });

  it('alternativa sin imagen propia: la silueta de su demarcación', () => {
    const { imagen: _imagen, ...sinImagen } = conAlt.identidad_alternativa!;
    expect(conIdentidad({ ...conAlt, identidad_alternativa: sinImagen }, 'alternativa').imagen).toBe(`/cartas/siluetas/${base.demarcacion.toLowerCase()}.svg`);
  });

  it('sin identidad alternativa: nombre genérico «<Demarcación> <id>» y silueta', () => {
    const v = conIdentidad(base, 'alternativa');
    expect(nombreGenerico({ id: 40, demarcacion: 'DEF' })).toBe('Defensa 40');
    expect(nombreGenerico({ id: 7, demarcacion: 'MED' })).toBe('Centrocampista 7');
    expect(v.nombre_carta).toBe(nombreGenerico(base));
    expect(v.nombre).toBe(nombreGenerico(base));
    expect(v.apellidos).toBe('');
    expect(v.imagen).toBe(`/cartas/siluetas/${base.demarcacion.toLowerCase()}.svg`);
    expect(v.historia).toBe('');
  });

  // Spec 013, FR-006: la ilustración de Core identifica al futbolista; vuelve al fondo genérico de su demarcación.
  it('alternativa: la ilustración de Core pasa al fondo genérico; otros fondos se conservan', () => {
    const ilustrada: Jugador = { ...base, demarcacion: 'MED', imagen_bg: '/cartas/fondos/jugadores/7.webp' };
    expect(conIdentidad(ilustrada, 'alternativa').imagen_bg).toBe('/cartas/fondos/med.svg');
    expect(conIdentidad(ilustrada, 'real').imagen_bg).toBe('/cartas/fondos/jugadores/7.webp');
    const propia: Jugador = { ...base, imagen_bg: '/cartas/fondos/otra-coleccion/7.webp' };
    expect(conIdentidad(propia, 'alternativa').imagen_bg).toBe('/cartas/fondos/otra-coleccion/7.webp');
  });

  it('nunca cambia lo que usa el juego (FR-019)', () => {
    for (const j of jugadoresCore()) {
      const v = conIdentidad(j, 'alternativa');
      for (const campo of INMUTABLES) expect(v[campo], `${j.id}.${campo}`).toEqual(j[campo]);
    }
  });

  it('la identidad alternativa se valida: los tres nombres no vacíos', () => {
    expect(validarJugador(conAlt)).toEqual([]);
    const mal = { ...base, identidad_alternativa: { nombre: 'X', apellidos: '', nombre_carta: 'X' } };
    expect(validarJugador(mal).map((e) => e.regla)).toContain('identidad_alternativa');
  });
});
