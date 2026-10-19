/**
 * Balón parado y autogoles (spec 003, research R7 y R11; FR-020; T015): penalti espacial, faltas en duelos
 * aéreos del área, falta directa según distancia y ángulo, y goles en propia puerta.
 */
import { PARAMETROS_V3, type ParametrosEquilibrado } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { falta, probabilidadTiroDirecto } from '../src/acciones/balonParado';
import { corner, probabilidadAutogolDespeje, tirar } from '../src/acciones/tiro';
import { avanzar, crearPartido, type EstadoMotor } from '../src/index';
import { contextoDe, entrada, partido, situar, titularEn } from './ayudas';

const p = PARAMETROS_V3;

function conParametros(cambios: (q: ParametrosEquilibrado) => void): ParametrosEquilibrado {
  const q = structuredClone(p);
  cambios(q);
  return q;
}

/** Equipo local ya instalado en campo rival, como cuando gana un córner (los centrales llegan al área). */
function adelantarLocal(e: EstadoMotor): void {
  for (const j of e.equipos.local.jugadores) {
    const q = e.espacio.jugadores[j.id];
    if (q && j.casillaId !== 'POR') q.x = Math.min(9300, q.x + 4500);
  }
}

/** Falta del central visitante sobre el delantero local con el balón en un punto (coordenadas del local). */
function faltaEn(semilla: string, punto: { x: number; y: number }, zona: number) {
  const e = partido(semilla);
  const victima = titularEn(e, 'local', 'DC');
  const culpable = titularEn(e, 'visitante', 'DCI');
  situar(e, victima.id, punto);
  e.espacio.balon = { x: punto.x, y: punto.y, z: 0 };
  e.balon = { posesion: 'local', zona, carril: 1, portadorId: victima.id, transicion: false };
  const ctx = contextoDe(e, semilla);
  falta(ctx, e.equipos.local, victima, e.equipos.visitante, culpable);
  return e.eventos.map((x) => x.tipo);
}

describe('penalti espacial (research R7)', () => {
  it('una falta en la zona 5 es penalti solo si el punto está dentro del área real', () => {
    expect(faltaEn('dentro', { x: 9000, y: 3200 }, 5)).toContain('penalti');
    expect(faltaEn('borde', { x: 8440, y: 1400 }, 5)).toContain('penalti');
    // Zona 5 pero fuera del área: por delante de la línea del área o pegado a la banda.
    expect(faltaEn('antes-del-area', { x: 8400, y: 3200 }, 5)).not.toContain('penalti');
    expect(faltaEn('banda', { x: 9200, y: 900 }, 5)).not.toContain('penalti');
  });

  it('los centros y los córners pueden acabar en falta dentro del área', () => {
    const q = conParametros((x) => {
      x.disciplina.probabilidadFaltaDueloAereoArea = 1;
    });
    let penaltis = 0;
    for (let i = 0; i < 10; i++) {
      const e = crearPartido(entrada(`corner-${i}`, { version: q.version, parametros: q }));
      adelantarLocal(e);
      corner(contextoDe(e, `corner-${i}`), e.equipos.local);
      const tipos = e.eventos.map((x) => x.tipo);
      if (tipos.includes('penalti')) {
        penaltis++;
        expect(tipos.indexOf('falta')).toBeLessThan(tipos.indexOf('penalti'));
      }
    }
    expect(penaltis).toBeGreaterThan(0);
    // En partidos completos, con más faltas en los duelos aéreos hay más penaltis.
    const contar = (params: ParametrosEquilibrado) => {
      let n = 0;
      for (let i = 0; i < 8; i++) {
        const r = avanzar(crearPartido(entrada(`centros-${i}`, { version: params.version, parametros: params })), 'final');
        n += r.eventos.filter((x) => x.tipo === 'penalti').length;
      }
      return n;
    };
    expect(contar(q)).toBeGreaterThan(contar(p));
  });
});

describe('falta directa (research R7)', () => {
  const M = 95.24;
  const central = { x: 10000 - Math.round(25 * M), y: 3200 };
  const lateral = { x: 8400, y: 1100 };

  it('a 17–30 m y con ángulo central se tira directa con más probabilidad que desde un lateral', () => {
    expect(probabilidadTiroDirecto(p, central, false)).toBeGreaterThan(probabilidadTiroDirecto(p, lateral, false));
    expect(probabilidadTiroDirecto(p, central, false)).toBe(Math.round(p.tiro.faltaDirectaTiro.probabilidad * 1000));
  });

  it('Lanzador de faltas aumenta la elección del tiro directo', () => {
    expect(probabilidadTiroDirecto(p, central, true)).toBeGreaterThan(probabilidadTiroDirecto(p, central, false));
    expect(probabilidadTiroDirecto(p, lateral, true)).toBeGreaterThan(probabilidadTiroDirecto(p, lateral, false));
  });
});

describe('goles en propia puerta (FR-020, SC-003)', () => {
  it('la probabilidad de autogol en un despeje baja de forma monótona con la defensa del que despeja', () => {
    let anterior = Infinity;
    for (let d = 40; d <= 99; d++) {
      const x = probabilidadAutogolDespeje(p, d);
      expect(x).toBeLessThanOrEqual(anterior);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(Math.round(2 * p.tiro.autogol.despejeCentro * 1000));
      anterior = x;
    }
    // En milésimas, con la probabilidad calibrada (0,008) la diferencia se ve entre extremos.
    expect(probabilidadAutogolDespeje(p, 99)).toBeLessThan(probabilidadAutogolDespeje(p, 40));
  });

  const golesEnPropia = (e: EstadoMotor) => e.eventos.filter((x) => x.tipo === 'gol' && x.datos.tipo === 'propia');

  it('el despeje de un córner dentro del área puede acabar en gol en propia puerta del defensor', () => {
    const q = conParametros((x) => {
      x.tiro.autogol.despejeCentro = 0.5;
      // El centro nunca llega al rematador: siempre despeja la defensa.
      x.acciones.duelaAereo = -50;
      x.disciplina.probabilidadFaltaDueloAereoArea = 0;
    });
    let vistos = 0;
    for (let i = 0; i < 20; i++) {
      const e = crearPartido(entrada(`autogol-${i}`, { version: q.version, parametros: q }));
      adelantarLocal(e);
      corner(contextoDe(e, `autogol-${i}`), e.equipos.local);
      for (const g of golesEnPropia(e)) {
        vistos++;
        expect(g.equipo).toBe('local');
        const autor = g.jugadores.find((j) => j.rol === 'autor')!;
        expect(e.equipos.visitante.jugadores.some((j) => j.id === autor.jugadorId)).toBe(true);
        expect(g.jugadores.some((j) => j.rol === 'asistente')).toBe(false);
        expect(e.marcador.local).toBeGreaterThan(0);
        expect(typeof g.datos.distancia).toBe('number');
        expect(['area', 'frontal', 'lejos']).toContain(g.datos.zonaRemate);
      }
    }
    expect(vistos).toBeGreaterThan(0);
  });

  it('un tiro a puerta desviado por un defensor puede acabar en gol en propia puerta', () => {
    const q = conParametros((x) => {
      x.tiro.autogol.desvio = 1;
      x.acciones.puerta.normal = 50;
    });
    const e = crearPartido(entrada('desvio', { version: q.version, parametros: q }));
    const tirador = titularEn(e, 'local', 'DC');
    situar(e, tirador.id, { x: 9000, y: 3200 });
    e.espacio.balon = { x: 9000, y: 3200, z: 0 };
    e.balon = { posesion: 'local', zona: 5, carril: 1, portadorId: tirador.id, transicion: false };
    tirar(contextoDe(e, 'desvio'), e.equipos.local, tirador, 'normal');
    const [g] = golesEnPropia(e);
    expect(g).toBeDefined();
    expect(g!.equipo).toBe('local');
    expect(e.marcador.local).toBe(1);
    const autor = g!.jugadores.find((j) => j.rol === 'autor')!;
    expect(e.equipos.visitante.jugadores.some((j) => j.id === autor.jugadorId)).toBe(true);
  });
});
