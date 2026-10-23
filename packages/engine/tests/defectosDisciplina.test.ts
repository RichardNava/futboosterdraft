/**
 * Defectos de disciplina (spec 005, T036; FR-014; research R6): Canchero, Impulsivo y Agresivo, con semillas fijas y
 * probabilidades forzadas en los parámetros.
 */
import { PARAMETROS_V3 } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { falta } from '../src/acciones/balonParado';
import { factorAmarilla, factorFalta, factorRoja } from '../src/modificadores/defectos';
import { avanzar, crearPartido } from '../src/index';
import { contextoDe, entrada, equipo, ponerRasgos, situar, titularEn } from './ayudas';
import { conParametros, P4, partido4, razon } from './ayudasRasgos';

/** Cuenta las tarjetas del central visitante en `n` faltas suyas en el centro del campo. */
function tarjetas(n: number, defecto: 'Impulsivo' | 'Agresivo' | null, q = P4) {
  let amarillas = 0;
  let rojas = 0;
  for (let i = 0; i < n; i++) {
    const e = partido4(`tarjetas-${i}`, q);
    const victima = titularEn(e, 'local', 'DC');
    const culpable = ponerRasgos(titularEn(e, 'visitante', 'DCI'), { defectos: defecto ? [defecto] : [] });
    situar(e, victima.id, { x: 5000, y: 3200 });
    e.espacio.balon = { x: 5000, y: 3200, z: 0 };
    e.balon = { posesion: 'local', zona: 2, carril: 1, portadorId: victima.id, transicion: false };
    falta(contextoDe(e, `tarjetas-${i}`), e.equipos.local, victima, e.equipos.visitante, culpable);
    amarillas += e.eventos.filter((x) => x.tipo === 'amarilla').length;
    rojas += e.eventos.filter((x) => x.tipo === 'roja' && x.datos.motivo === 'directa').length;
  }
  return { amarillas, rojas };
}

describe('Canchero (falta por entrada)', () => {
  it('multiplica la probabilidad de falta por defectos.canchero; con 3.0.0, por 1', () => {
    const e = partido4('canchero');
    const j = ponerRasgos(titularEn(e, 'visitante', 'DCI'), { defectos: ['Canchero'] });
    expect(factorFalta(e, j)).toBe(P4.defectos!.canchero);
    expect(factorFalta(e, titularEn(e, 'visitante', 'DCD'))).toBe(1);
    const v3 = crearPartido(entrada('canchero-v3'));
    expect(factorFalta(v3, ponerRasgos(titularEn(v3, 'visitante', 'DCI'), { defectos: ['Canchero'] }))).toBe(1);
  });

  it('un equipo de Cancheros comete más faltas en partidos completos (la magnitud la mide balance, 005/SC-004)', () => {
    const faltas = (cancheros: boolean) => {
      let n = 0;
      for (let i = 0; i < 20; i++) {
        const visitante = equipo('visitante');
        if (cancheros) for (const t of visitante.titulares) t.jugador = { ...t.jugador, defectos: ['Canchero'] };
        const r = avanzar(crearPartido(entrada(`cancheros-${i}`, { version: P4.version, parametros: P4, visitante })), 'final');
        n += r.estadisticas.visitante.faltas;
      }
      return n;
    };
    expect(razon(faltas(true), faltas(false))).toBeGreaterThan(1.1);
  });
});

describe('Impulsivo y Agresivo (tarjetas)', () => {
  const forzadas = conParametros((q) => {
    q.disciplina.probabilidadAmarillaPorFalta = 0.3;
    q.disciplina.probabilidadRojaDirectaPorFalta = 0;
    q.lesiones.probabilidadPorEntrada = 0;
  });

  it('Impulsivo multiplica por 2 la probabilidad de amarilla', () => {
    expect(factorAmarilla(partido4('i'), ponerRasgos(titularEn(partido4('i'), 'visitante', 'DCI'), { defectos: ['Impulsivo'] }))).toBe(2);
    const con = tarjetas(400, 'Impulsivo', forzadas).amarillas;
    const sin = tarjetas(400, null, forzadas).amarillas;
    expect(razon(con, sin)).toBeGreaterThan(1.7);
    expect(razon(con, sin)).toBeLessThan(2.3);
  });

  it('Agresivo multiplica por 2 la probabilidad de roja directa', () => {
    const rojas = conParametros((q) => {
      q.disciplina.probabilidadRojaDirectaPorFalta = 0.2;
      q.disciplina.probabilidadAmarillaPorFalta = 0;
      q.lesiones.probabilidadPorEntrada = 0;
    });
    expect(factorRoja(partido4('a'), ponerRasgos(titularEn(partido4('a'), 'visitante', 'DCI'), { defectos: ['Agresivo'] }))).toBe(2);
    const con = tarjetas(400, 'Agresivo', rojas).rojas;
    const sin = tarjetas(400, null, rojas).rojas;
    expect(razon(con, sin)).toBeGreaterThan(1.6);
    expect(razon(con, sin)).toBeLessThan(2.4);
  });

  it('con parámetros 3.0.0 los defectos de disciplina no cambian nada', () => {
    const v3 = crearPartido(entrada('v3'));
    const j = ponerRasgos(titularEn(v3, 'visitante', 'DCI'), { defectos: ['Impulsivo', 'Agresivo'] });
    expect([factorAmarilla(v3, j), factorRoja(v3, j)]).toEqual([1, 1]);
    expect(PARAMETROS_V3.defectos).toBeUndefined();
  });
});
