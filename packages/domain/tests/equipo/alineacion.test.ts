import { describe, expect, it } from 'vitest';
import { previsualizar, validarAlineacion, type Alineacion } from '../../src/equipo/alineacion';
import { autoAlineacion } from '../../src/equipo/autoAlineacion';
import { FORMACIONES } from '../../src/equipo/formaciones';
import { tacticaPorDefecto } from '../../src/equipo/tactica';
import { PARAMETROS_V1 } from '../../src/parametros/index';
import { plantillaEquilibrada } from './ayudas';

const plantilla = plantillaEquilibrada();
const porId = new Map(plantilla.map((j) => [j.id, j]));
const buscar = (id: number) => porId.get(id)!;

function alineacionValida(): Alineacion {
  return autoAlineacion(plantilla, new Set(), PARAMETROS_V1);
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
    const corta = autoAlineacion(plantilla, bajas, PARAMETROS_V1);
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
    const vista = previsualizar(cambiado, buscar, PARAMETROS_V1);
    expect(vista).toHaveLength(11);
    expect(vista.find((c) => c.casillaId === 'POR')).toMatchObject({ fueraDePosicion: true, penalizacion: 0.6 });
    expect(vista.every((c) => FORMACIONES[a.formacion].casillas.some((x) => x.id === c.casillaId))).toBe(true);
  });
});
