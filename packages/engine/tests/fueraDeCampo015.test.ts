/**
 * Balones fuera de la spec 015: despejes, desvíos y rechaces que se van del campo (córner y saque de banda), saque de
 * banda del más cercano y despeje del córner lejos del área. Todo cuelga del bloque `fueraDeCampo` de la 8.0.0.
 */
import { parametrosActuales, type ParametrosEquilibrado } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { fueraTrasDuelo, saqueDeBanda } from '../src/acciones/juego';
import { rematarBalonParado } from '../src/acciones/tiro';
import { aEquipo } from '../src/espacio/geometria';
import type { Metricas } from '../src/metricas';
import { contextoDe, partido, situar, titularEn } from './ayudas';

const con = (fueraDeCampo: Partial<NonNullable<ParametrosEquilibrado['fueraDeCampo']>>) => {
  const parametros = { ...parametrosActuales(), fueraDeCampo: { ...parametrosActuales().fueraDeCampo!, ...fueraDeCampo } };
  return { version: parametros.version, parametros };
};
/** El borde del área grande (16,5 m), en décimas. */
const AREA = 1571;

describe('balones fuera (spec 015)', () => {
  it('el saque de banda lo hace el jugador de campo más cercano, desde la línea', () => {
    const e = partido('banda015', con({}));
    const lateral = titularEn(e, 'local', 'LI');
    situar(e, lateral.id, { x: 5000, y: 300 });
    e.espacio.balon = { x: 5000, y: -250, z: 0 };
    saqueDeBanda(contextoDe(e), e.equipos.local);
    expect(e.balon.posesion).toBe('local');
    expect(e.balon.portadorId).toBe(lateral.id);
    expect(e.espacio.balon).toMatchObject({ x: 5000, y: 0 });
    expect(e.eventos.some((ev) => ev.tipo === 'interrupcion' && ev.datos.motivo === 'fuera_de_banda')).toBe(true);
  });

  it('el centro despejado sale a córner con `centroDespejado`', () => {
    for (const [parametros, esperado] of [
      [con({ centroDespejado: 1 }), true],
      [con({ centroDespejado: 0 }), false],
    ] as const) {
      const e = partido('centro015', parametros);
      const central = titularEn(e, 'visitante', 'DCI');
      situar(e, central.id, { x: 800, y: 3200 });
      e.espacio.balon = { ...e.espacio.jugadores[central.id]!, z: 0 };
      expect(fueraTrasDuelo(contextoDe(e), e.equipos.local, e.equipos.visitante, central, 'centro')).toBe(esperado);
      expect(e.cornerPendiente ?? null).toBe(esperado ? 'local' : null);
    }
  });

  it('una entrada ganada lejos de las líneas no sale; junto a la banda sale por ella', () => {
    const e = partido('desvio015', con({ desvioBanda: 1, desvio: 1 }));
    const central = titularEn(e, 'visitante', 'DCI');
    // En el centro del campo (coordenadas del local, que ataca): sigue en juego.
    situar(e, central.id, { x: 10000 - 5000, y: 6400 - 3200 });
    e.espacio.balon = { x: 5000, y: 3200, z: 0 };
    expect(fueraTrasDuelo(contextoDe(e), e.equipos.local, e.equipos.visitante, central, 'regate')).toBe(false);
    // A 5 m de la banda: saque de banda (de uno u otro equipo).
    e.espacio.balon = { x: 5000, y: 500, z: 0 };
    expect(fueraTrasDuelo(contextoDe(e), e.equipos.local, e.equipos.visitante, central, 'regate')).toBe(true);
    expect(e.eventos.some((ev) => ev.tipo === 'interrupcion' && ev.datos.motivo === 'fuera_de_banda')).toBe(true);
  });

  it('con `peligroCorner` 0 nadie remata el córner y el despeje aleja el balón del área', () => {
    const e = partido('despeje015', con({ peligroCorner: 0 }));
    const ctx = contextoDe(e);
    e.espacio.balon = { x: 10000, y: 0, z: 0 };
    rematarBalonParado(ctx, e.equipos.local, e.equipos.visitante, 'corners', parametrosActuales().acciones.duelaAereo);
    expect(e.eventos.some((ev) => ev.tipo === 'tiro' || ev.tipo === 'gol' || ev.tipo === 'parada' || ev.tipo === 'falta')).toBe(false);
    // Fuera del área del que defiende (x desde su propia portería).
    expect(aEquipo('visitante', e.espacio.balon).x).toBeGreaterThan(AREA);
  });

  it('la carrera tras el centro del córner no cuenta como balón suelto: el duelo aéreo ya decidió', () => {
    const e = partido('despeje015', con({ peligroCorner: 0 }));
    const ctx = { ...contextoDe(e), metricas: {} as Metricas };
    e.espacio.balon = { x: 10000, y: 0, z: 0 };
    rematarBalonParado(ctx, e.equipos.local, e.equipos.visitante, 'corners', parametrosActuales().acciones.duelaAereo);
    const despejador = e.acciones.find((a) => a.tipo === 'centro')?.a;
    expect(despejador).toBeDefined();
    expect(ctx.metricas[despejador!]?.sueltosDisputados ?? 0).toBe(0);
  });
});
