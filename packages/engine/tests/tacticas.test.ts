/**
 * Tácticas de la 9.0.0 (spec 018, FR-024, FR-027 a FR-033): cada una con su ventaja y su coste, todos en los parámetros.
 */
import { parametrosActuales, tacticaPorDefecto, type Tactica } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { calcularObjetivos, lineaDe } from '../src/espacio/objetivos';
import type { EstadoMotor } from '../src/index';
import {
  consumirVentajaBanda,
  desplazamientoAtaque,
  guardarVentajaBanda,
  pesosAcciones,
  probabilidadAvance,
  probabilidadBanda,
  type TipoAccion,
} from '../src/modificadores/formacionTactica';
import { darBalon, equipo, partido, situar, titularEn } from './ayudas';

const P = parametrosActuales();
const conTacticas = (semilla: string, local: Partial<Tactica> = {}, visitante: Partial<Tactica> = {}): EstadoMotor =>
  partido(semilla, { local: equipo('local', { tactica: local }), visitante: equipo('visitante', { tactica: visitante }) });

/** Lo que cambia el desplazamiento del atacante (local) por las tácticas, frente a dos equipos neutros. */
function efecto(local: Partial<Tactica>, visitante: Partial<Tactica>, accion: TipoAccion, zona: number, lejano = false, casilla = 'DC'): number {
  const e = conTacticas('efecto', local, visitante);
  const n = conTacticas('efecto', {}, {});
  const x = desplazamientoAtaque(e, e.equipos.local, e.equipos.visitante, accion, zona, titularEn(e, 'local', casilla), lejano);
  const y = desplazamientoAtaque(n, n.equipos.local, n.equipos.visitante, accion, zona, titularEn(n, 'local', casilla), lejano);
  return x - y;
}

describe('Catenaccio (FR-024)', () => {
  const CAT: Partial<Tactica> = { alturaBloque: 'catenaccio' };

  it.each(['pase_corto', 'pase_largo', 'pase_espacio', 'conduccion', 'regate'] as const)('%s: −0,50 solo en las zonas 4 y 5', (accion) => {
    expect(efecto({}, CAT, accion, 4)).toBeCloseTo(-0.5, 9);
    expect(efecto({}, CAT, accion, 5)).toBeCloseTo(-0.5, 9);
    expect(efecto({}, CAT, accion, 3)).toBeCloseTo(0, 9);
  });

  it('no afecta a los centros ni a los tiros lejanos; sí al tiro cercano', () => {
    expect(efecto({}, CAT, 'centro', 4)).toBeCloseTo(0, 9);
    expect(efecto({}, CAT, 'tiro', 4, true)).toBeCloseTo(0, 9);
    expect(efecto({}, CAT, 'tiro', 5, false)).toBeCloseTo(-0.5, 9);
  });

  it('mantiene sus costes ofensivos', () => {
    expect(efecto(CAT, {}, 'regate', 2)).toBeCloseTo(P.tacticas.catenaccio.ofensiva, 9);
  });
});

describe('Individual en el desplazamiento (FR-027, FR-028)', () => {
  const IND: Partial<Tactica> = { sistemaDefensivo: 'individual' };

  /** Efecto para un atacante concreto, con la estrella fijada en `estrella`. */
  function efectoCon(accion: TipoAccion, casilla: string, estrella: string, fuera = false): number {
    const e = conTacticas('individual', {}, IND);
    const n = conTacticas('individual', {}, {});
    const star = titularEn(e, 'local', estrella);
    e.equipos.visitante.marcajeEstrella = { estrellaId: star.id, marcadorId: titularEn(e, 'visitante', 'DCI').id, activo: !fuera };
    if (fuera) star.enCampo = false;
    const x = desplazamientoAtaque(e, e.equipos.local, e.equipos.visitante, accion, 2, titularEn(e, 'local', casilla));
    const y = desplazamientoAtaque(n, n.equipos.local, n.equipos.visitante, accion, 2, titularEn(n, 'local', casilla));
    return x - y;
  }

  it('un compañero de la estrella gana +0,05 y si regatea +0,17', () => {
    expect(efectoCon('pase_corto', 'SD', 'DC')).toBeCloseTo(0.05, 9);
    expect(efectoCon('regate', 'SD', 'DC')).toBeCloseTo(0.17, 9);
  });

  it('la estrella no gana el +0,05, pero su regate sí el +0,12', () => {
    expect(efectoCon('pase_corto', 'DC', 'DC')).toBeCloseTo(0, 9);
    expect(efectoCon('regate', 'DC', 'DC')).toBeCloseTo(0.12, 9);
  });

  it('si la estrella ha salido, +0,05 a todos los rivales de campo, pero no al portero', () => {
    expect(efectoCon('pase_corto', 'SD', 'DC', true)).toBeCloseTo(0.05, 9);
    expect(efectoCon('pase_corto', 'POR', 'DC', true)).toBeCloseTo(0, 9);
  });

  it('sustituye los ajustes antiguos: el pase al espacio ya no lleva su +0,08', () => {
    expect(efectoCon('pase_espacio', 'DC', 'DC')).toBeCloseTo(0, 9);
  });
});

describe('Por las bandas (FR-029)', () => {
  const pesoEspacio = (e: EstadoMotor) => pesosAcciones(e.equipos.local, 3, 0, e.parametros).find(([a]) => a === 'pase_espacio')![1];

  it('el pase al espacio propio pesa un 10 % menos', () => {
    const bandas = conTacticas('bandas', { estiloConBalon: 'bandas' });
    const neutro = conTacticas('neutro');
    expect(pesoEspacio(bandas)).toBe(Math.round(pesoEspacio(neutro) * 0.9));
  });

  function conVentaja(carrilPerdida: number): EstadoMotor {
    const e = conTacticas('ventaja', { estiloConBalon: 'bandas' });
    guardarVentajaBanda(e, e.equipos.local, 'visitante', carrilPerdida);
    return e;
  }

  it('una pérdida en el carril central no da ventaja', () => {
    const e = conVentaja(1);
    expect(e.ventajaBanda ?? null).toBeNull();
    expect(consumirVentajaBanda(e, e.equipos.visitante, 'regate', 1)).toBe(0);
  });

  it('quien no juega por las bandas no concede ventaja', () => {
    const e = conTacticas('sin-bandas');
    guardarVentajaBanda(e, e.equipos.local, 'visitante', 0);
    expect(e.ventajaBanda ?? null).toBeNull();
  });

  it.each(['pase_corto', 'pase_largo', 'pase_espacio', 'regate', 'conduccion', 'centro'] as const)('%s por ese carril gana +0,15 una sola vez', (accion) => {
    const e = conVentaja(2);
    expect(consumirVentajaBanda(e, e.equipos.visitante, accion, 2)).toBeCloseTo(0.15, 9);
    expect(consumirVentajaBanda(e, e.equipos.visitante, accion, 2)).toBe(0);
  });

  it('por otro carril la ventaja se pierde', () => {
    const e = conVentaja(2);
    expect(consumirVentajaBanda(e, e.equipos.visitante, 'pase_corto', 0)).toBe(0);
    expect(e.ventajaBanda ?? null).toBeNull();
  });

  it('solo la aprovecha el equipo que recuperó', () => {
    const e = conVentaja(2);
    expect(consumirVentajaBanda(e, e.equipos.local, 'pase_corto', 2)).toBe(0);
    expect(e.ventajaBanda ?? null).toBeNull();
  });
});

describe('Juego vertical y Bandas + Vertical (FR-030, FR-031)', () => {
  it('los pases largos y al espacio restan 0,15; el corto, no', () => {
    const v: Partial<Tactica> = { juegoVertical: true };
    expect(efecto(v, {}, 'pase_largo', 2)).toBeCloseTo(-0.15, 9);
    expect(efecto(v, {}, 'pase_espacio', 2)).toBeCloseTo(-0.15, 9);
    expect(efecto(v, {}, 'pase_corto', 2)).toBeCloseTo(0, 9);
  });

  it('Bandas + Vertical: centros ×1,8 y +0,25 de balón por banda, no el producto', () => {
    const ambas = conTacticas('ambas', { estiloConBalon: 'bandas', juegoVertical: true });
    const neutro = conTacticas('neutro-2');
    const centro = (e: EstadoMotor) => pesosAcciones(e.equipos.local, 4, 0, e.parametros).find(([a]) => a === 'centro')![1];
    expect(centro(ambas)).toBe(Math.round(centro(neutro) * 1.8));
    expect(probabilidadBanda(ambas.equipos.local, P)).toBeCloseTo(probabilidadBanda(neutro.equipos.local, P) + 0.25, 9);
  });

  it('cada una por separado conserva su valor', () => {
    const neutro = conTacticas('neutro-3');
    const centro = (e: EstadoMotor) => pesosAcciones(e.equipos.local, 4, 0, e.parametros).find(([a]) => a === 'centro')![1];
    expect(centro(conTacticas('v', { juegoVertical: true }))).toBe(Math.round(centro(neutro) * 1.6));
    expect(centro(conTacticas('b', { estiloConBalon: 'bandas' }))).toBe(Math.round(centro(neutro) * 1.3));
  });
});

describe('Línea adelantada (FR-032)', () => {
  // Sin el acotado de la distancia entre líneas, que depende de dónde esté el medio en ese instante.
  const LIBRE = { ...P, espacio: { ...P.espacio, separacionLineasConBalon: [0, 10000] as [number, number], separacionLineasSinBalon: [0, 10000] as [number, number] } };

  function xDefensa(linea: boolean, conBalon: boolean): number {
    const e = partido(`linea-${linea}-${conBalon}`, { parametros: LIBRE, local: equipo('local', { tactica: { lineaAdelantada: linea } }) });
    // Los medios con un papel reciente no cuentan como línea real: la distancia se mide entre las formas de cada línea.
    for (const j of e.equipos.local.jugadores) if (j.enCampo && lineaDe(e.equipos.local, j) === 'medio') situar(e, j.id, { x: 5000, y: 3200 });
    const portador = titularEn(e, conBalon ? 'local' : 'visitante', 'MC-1');
    situar(e, portador.id, { x: 5000, y: 3200 });
    darBalon(e, conBalon ? 'local' : 'visitante', portador, 2);
    e.espacio.referencia = { x: 5000, y: 3200, tick: e.tick };
    return calcularObjetivos(e)[titularEn(e, 'local', 'LI').id]!.x;
  }

  it('sube con balón y sin balón', () => {
    expect(xDefensa(true, true) - xDefensa(false, true)).toBe(P.espacio.lineaAdelantada);
    expect(xDefensa(true, false)).toBeGreaterThan(xDefensa(false, false));
  });

  it('mantiene el riesgo del pase al espacio', () => {
    expect(efecto({}, { lineaAdelantada: true }, 'pase_espacio', 2)).toBeCloseTo(P.tacticas.lineaAdelantada.vulnerableEspalda * 2, 9);
  });
});

describe('sin cambios (FR-033, FR-034)', () => {
  it('Contraataque y Combinativo pesan lo mismo que en la 8.0.0', () => {
    const neutro = conTacticas('n');
    const peso = (e: EstadoMotor, a: TipoAccion) => pesosAcciones(e.equipos.local, 2, 1, e.parametros).find(([x]) => x === a)![1];
    const contra = conTacticas('c', { estiloConBalon: 'contraataque' });
    const combi = conTacticas('m', { estiloConBalon: 'combinativo' });
    expect(peso(contra, 'pase_largo')).toBe(Math.round(peso(neutro, 'pase_largo') * 1.6));
    expect(peso(contra, 'pase_corto')).toBe(Math.round(peso(neutro, 'pase_corto') * 0.8));
    expect(peso(combi, 'pase_corto')).toBe(Math.round(peso(neutro, 'pase_corto') * 1.4));
    expect(peso(combi, 'regate')).toBe(Math.round(peso(neutro, 'regate') * 0.9));
  });

  it('el avance de zona sale de los parámetros', () => {
    const neutro = conTacticas('avance');
    const combi = conTacticas('avance-c', { estiloConBalon: 'combinativo' });
    const base = probabilidadAvance(neutro, neutro.equipos.local, neutro.equipos.visitante, 1);
    expect(probabilidadAvance(combi, combi.equipos.local, combi.equipos.visitante, 1)).toBeCloseTo(base + P.tacticas.avance.combinativo, 9);
  });

  it('la táctica por defecto no añade desplazamiento', () => {
    expect(efecto(tacticaPorDefecto(), tacticaPorDefecto(), 'regate', 4)).toBeCloseTo(0, 9);
  });
});
