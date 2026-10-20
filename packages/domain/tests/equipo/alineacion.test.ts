import { describe, expect, it } from 'vitest';
import { previsualizar, validarAlineacion, type Alineacion } from '../../src/equipo/alineacion';
import { autoAlineacion } from '../../src/equipo/autoAlineacion';
import { FORMACIONES } from '../../src/equipo/formaciones';
import { tacticaPorDefecto } from '../../src/equipo/tactica';
import { PARAMETROS_V3 } from '../../src/parametros/index';
import { jugador, plantillaEquilibrada } from './ayudas';

const plantilla = plantillaEquilibrada();
const porId = new Map(plantilla.map((j) => [j.id, j]));
const buscar = (id: number) => porId.get(id)!;

function alineacionValida(): Alineacion {
  return autoAlineacion(plantilla, new Set(), PARAMETROS_V3);
}
const codigos = (a: Alineacion, bajas = new Set<number>()) =>
  validarAlineacion(a, plantilla.map((j) => j.id), bajas).map((e) => e.codigo);

describe('validarAlineacion (FR-026, FR-030)', () => {
  it('acepta una alineación automática', () => {
    expect(codigos(alineacionValida())).toEqual([]);
  });

  it('11 titulares distintos, uno por casilla', () => {
    const a = alineacionValida();
    const repetido = { ...a, titulares: a.titulares.map((t, i) => (i === 1 ? { ...t, jugadorId: a.titulares[0]!.jugadorId } : t)) };
    expect(codigos(repetido)).toContain('ALINEACION_INVALIDA');
    const casillaInventada = { ...a, titulares: a.titulares.map((t, i) => (i === 0 ? { ...t, casillaId: 'XX' } : t)) };
    expect(codigos(casillaInventada)).toContain('ALINEACION_INVALIDA');
    expect(codigos({ ...a, titulares: a.titulares.slice(0, 10) })).toContain('ALINEACION_INVALIDA');
  });

  it('hasta 7 suplentes, de la plantilla y que no sean titulares', () => {
    const a = alineacionValida();
    const titularesIds = new Set(a.titulares.map((t) => t.jugadorId));
    const resto = plantilla.map((j) => j.id).filter((id) => !titularesIds.has(id));
    expect(codigos({ ...a, suplentes: resto.slice(0, 8) })).toContain('ALINEACION_INVALIDA');
    expect(codigos({ ...a, suplentes: [a.titulares[0]!.jugadorId] })).toContain('ALINEACION_INVALIDA');
    expect(codigos({ ...a, suplentes: [123_456_789] })).toContain('ALINEACION_INVALIDA');
    expect(codigos({ ...a, suplentes: [] })).toEqual([]);
  });

  it('un jugador de baja no se puede alinear (JUGADOR_NO_DISPONIBLE)', () => {
    const a = alineacionValida();
    expect(codigos(a, new Set([a.titulares[3]!.jugadorId]))).toContain('JUGADOR_NO_DISPONIBLE');
    expect(codigos(a, new Set([a.suplentes[0]!]))).toContain('JUGADOR_NO_DISPONIBLE');
  });

  it('una táctica incompatible se rechaza (TACTICA_INCOMPATIBLE)', () => {
    const a = { ...alineacionValida(), tactica: { ...tacticaPorDefecto(), alturaBloque: 'catenaccio' as const, lineaAdelantada: true } };
    expect(codigos(a)).toContain('TACTICA_INCOMPATIBLE');
  });

  it('los lanzadores deben ser titulares y la tanda, 5 titulares distintos', () => {
    const a = alineacionValida();
    const suplente = a.suplentes[0]!;
    expect(codigos({ ...a, lanzadores: { ...a.lanzadores, penaltis: suplente } })).toContain('ALINEACION_INVALIDA');
    const t = a.lanzadores.tanda;
    expect(codigos({ ...a, lanzadores: { ...a.lanzadores, tanda: [t[0]!, t[0]!, t[1]!, t[2]!, t[3]!] } })).toContain(
      'ALINEACION_INVALIDA',
    );
  });

  it('acumula todos los motivos en los detalles', () => {
    const a = alineacionValida();
    const errores = validarAlineacion({ ...a, titulares: a.titulares.slice(0, 9), suplentes: [999] }, plantilla.map((j) => j.id), new Set());
    const invalida = errores.find((e) => e.codigo === 'ALINEACION_INVALIDA');
    expect(invalida?.motivos.length).toBeGreaterThanOrEqual(2);
  });

  it('con menos de 11 disponibles se juega con los que haya', () => {
    const bajas = new Set(plantilla.slice(9).map((j) => j.id));
    const corta = autoAlineacion(plantilla, bajas, PARAMETROS_V3);
    expect(corta.titulares).toHaveLength(9);
    expect(corta.suplentes).toEqual([]);
    expect(validarAlineacion(corta, plantilla.map((j) => j.id), bajas).map((e) => e.codigo)).toEqual([]);
    // Con 9 disponibles, una alineación de 11 no es posible.
    expect(codigos(alineacionValida(), bajas)).toContain('ALINEACION_INVALIDA');
  });

  it('previsualizar devuelve stats efectivos por casilla y marca los fuera de posición', () => {
    const a = alineacionValida();
    const portero = a.titulares.find((t) => t.casillaId === 'POR')!;
    const campo = a.titulares.find((t) => t.casillaId !== 'POR')!;
    const cambiado = {
      ...a,
      titulares: a.titulares.map((t) =>
        t === portero ? { ...t, jugadorId: campo.jugadorId } : t === campo ? { ...t, jugadorId: portero.jugadorId } : t,
      ),
    };
    const vista = previsualizar(cambiado, buscar, PARAMETROS_V3).titulares;
    expect(vista).toHaveLength(11);
    expect(vista.find((c) => c.casillaId === 'POR')).toMatchObject({ fueraDePosicion: true, penalizacion: 0.6 });
    expect(vista.every((c) => FORMACIONES[a.formacion].casillas.some((x) => x.id === c.casillaId))).toBe(true);
  });
});

describe('validación de la colocación libre (FR-034a, T116)', () => {
  const motivos = (a: Alineacion) => validarAlineacion(a, plantilla.map((j) => j.id), new Set()).flatMap((e) => e.motivos);
  const punto = (a: Alineacion, casillaId: string) => a.titulares.find((t) => t.casillaId === casillaId)!.jugadorId;

  it('acepta una colocación dentro del campo con el portero en su zona', () => {
    const a = alineacionValida();
    const delantero = a.titulares.find((t) => t.casillaId !== 'POR')!;
    expect(codigos({ ...a, colocacion: [{ jugadorId: delantero.jugadorId, x: 700, y: 320 }, { jugadorId: punto(a, 'POR'), x: 50, y: 320 }] })).toEqual([]);
  });

  it('cada jugador de la colocación es titular y aparece una sola vez', () => {
    const a = alineacionValida();
    const titular = a.titulares[3]!.jugadorId;
    expect(motivos({ ...a, colocacion: [{ jugadorId: a.suplentes[0]!, x: 500, y: 300 }] })).toContain('COLOCACION_INVALIDA');
    expect(motivos({ ...a, colocacion: [{ jugadorId: titular, x: 500, y: 300 }, { jugadorId: titular, x: 600, y: 300 }] })).toContain('COLOCACION_INVALIDA');
  });

  it('coordenadas enteras dentro del campo', () => {
    const a = alineacionValida();
    const j = a.titulares[3]!.jugadorId;
    for (const [x, y] of [
      [1001, 300],
      [500, -1],
      [500.5, 300],
    ]) {
      expect(motivos({ ...a, colocacion: [{ jugadorId: j, x: x!, y: y! }] })).toContain('COLOCACION_FUERA_DEL_CAMPO');
    }
  });

  it('el portero en la zona de portería y ningún otro en ella', () => {
    const a = alineacionValida();
    expect(motivos({ ...a, colocacion: [{ jugadorId: punto(a, 'POR'), x: 300, y: 320 }] })).toContain('PORTERO_FUERA_DE_PORTERIA');
    const otro = a.titulares.find((t) => t.casillaId !== 'POR')!.jugadorId;
    expect(motivos({ ...a, colocacion: [{ jugadorId: otro, x: 60, y: 300 }] })).toContain('JUGADOR_EN_PORTERIA');
  });
});

describe('autoAlineacion con la penalización graduada (US4, T025)', () => {
  it('para un hueco sin jugador natural prefiere al de su misma demarcación (−10 %) frente a otro mejor de otra (−40 %)', () => {
    // 4-4-2 sin LD: un LI (75) pierde un 10 % y queda en 67,5; un DC (80) perdería un 40 % y quedaría en 48.
    const lateralIzquierdo = jugador('DEF', ['LI'], 75);
    const delanteroSobrante = jugador('DEL', ['DC'], 80);
    const plantillaSinLd = [
      jugador('POR', ['POR'], 80),
      jugador('DEF', ['LI'], 75),
      lateralIzquierdo,
      jugador('DEF', ['DCI'], 80),
      jugador('DEF', ['DCD'], 80),
      jugador('MED', ['MC'], 80),
      jugador('MED', ['MC'], 80),
      jugador('DEL', ['ED'], 80),
      jugador('DEL', ['EI'], 80),
      jugador('DEL', ['DC'], 80),
      jugador('DEL', ['SD'], 80),
      delanteroSobrante,
    ];
    const a = autoAlineacion(plantillaSinLd, new Set(), PARAMETROS_V3, { formaciones: ['4-4-2'] });
    const enLd = plantillaSinLd.find((j) => j.id === a.titulares.find((t) => t.casillaId === 'LD')!.jugadorId)!;
    expect(enLd.demarcacion).toBe('DEF');
  });
});
