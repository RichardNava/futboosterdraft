/**
 * Defectos de juego (spec 005, T038; FR-014; research R6): Torpe (autogoles), Chupón (pases) y Mal defensor
 * (candidato defensivo). Un portero Chupón o Mal defensor conserva sus acciones de portero.
 */
import { describe, expect, it } from 'vitest';
import { rivalCercano } from '../src/acciones/contexto';
import { pesosConEspacio } from '../src/acciones/opciones';
import { interceptorDePase } from '../src/acciones/receptor';
import { despejeEnPropia, tirar } from '../src/acciones/tiro';
import { factorAutogol, factorDefensivo, factorPase } from '../src/modificadores/defectos';
import { contextoDe, darBalon, ponerRasgos, situar, soloEnCampo, titularEn } from './ayudas';
import { conParametros, P4, partido4, razon } from './ayudasRasgos';

describe('Torpe (autogoles)', () => {
  it('multiplica por 2 la probabilidad de autogol en el despeje de un centro', () => {
    expect(factorAutogol(partido4('t'), ponerRasgos(titularEn(partido4('t'), 'visitante', 'DCI'), { defectos: ['Torpe'] }))).toBe(2);
    const q = conParametros((x) => {
      x.tiro.autogol.despejeCentro = 0.1;
    });
    const autogoles = (torpe: boolean) => {
      let n = 0;
      for (let i = 0; i < 500; i++) {
        const e = partido4(`despeje-${i}`, q);
        const despejador = ponerRasgos(titularEn(e, 'visitante', 'DCI'), { defectos: torpe ? ['Torpe'] : [] });
        situar(e, despejador.id, { x: 600, y: 3200 });
        if (despejeEnPropia(contextoDe(e, `despeje-${i}`), e.equipos.local, e.equipos.visitante, despejador)) n++;
      }
      return n;
    };
    const r = razon(autogoles(true), autogoles(false));
    expect(r).toBeGreaterThan(1.6);
    expect(r).toBeLessThan(2.4);
  });

  it('multiplica por 2 la probabilidad de autogol en el desvío de un tiro', () => {
    const q = conParametros((x) => {
      x.tiro.autogol.desvio = 0.15;
      x.acciones.puerta.normal = 6;
    });
    const autogoles = (torpe: boolean) => {
      let n = 0;
      for (let i = 0; i < 400; i++) {
        const e = partido4(`desvio-${i}`, q);
        for (const j of e.equipos.visitante.jugadores) ponerRasgos(j, { defectos: torpe ? ['Torpe'] : [] });
        const tirador = titularEn(e, 'local', 'DC');
        situar(e, tirador.id, { x: 8800, y: 3200 });
        situar(e, titularEn(e, 'visitante', 'DCI').id, { x: 1500, y: 3200 });
        darBalon(e, 'local', tirador, 5);
        tirar(contextoDe(e, `desvio-${i}`), e.equipos.local, tirador, 'normal');
        if (e.eventos.some((x) => x.tipo === 'gol' && x.datos.enPropia)) n++;
      }
      return n;
    };
    const r = razon(autogoles(true), autogoles(false));
    expect(r).toBeGreaterThan(1.5);
    expect(r).toBeLessThan(2.5);
  });
});

describe('Chupón (pases)', () => {
  it('multiplica por 0,5 el peso de las opciones de pase', () => {
    const e = partido4('chupon');
    const medio = titularEn(e, 'local', 'MC-1');
    darBalon(e, 'local', medio, 2);
    const antes = new Map(pesosConEspacio(e, e.equipos.local, medio, 2, 1));
    ponerRasgos(medio, { defectos: ['Chupon'] });
    expect(factorPase(e, medio)).toBe(P4.defectos!.chupon);
    const despues = new Map(pesosConEspacio(e, e.equipos.local, medio, 2, 1));
    let comprobados = 0;
    for (const [accion, peso] of antes) {
      if (accion.startsWith('pase_') && peso > 0) {
        expect(Math.abs(despues.get(accion)! - peso * 0.5)).toBeLessThanOrEqual(1);
        comprobados++;
      } else expect(despues.get(accion)).toBe(peso);
    }
    expect(comprobados).toBeGreaterThan(0);
  });

  it('un portero Chupón conserva sus acciones de portero', () => {
    const e = partido4('chupon-portero');
    const portero = titularEn(e, 'local', 'POR');
    darBalon(e, 'local', portero, 0);
    const antes = pesosConEspacio(e, e.equipos.local, portero, 0, 1);
    ponerRasgos(portero, { defectos: ['Chupon', 'MalDefensor'] });
    expect(factorPase(e, portero)).toBe(1);
    expect(factorDefensivo(e, portero)).toBe(1);
    expect(pesosConEspacio(e, e.equipos.local, portero, 0, 1)).toEqual(antes);
  });
});

describe('Mal defensor (candidato defensivo)', () => {
  /** Dos centrales visitantes cerca del balón, fuera de la línea de pase: el Mal defensor algo más cerca que el otro. */
  function escena(malDefensor: boolean) {
    const e = partido4('mal-defensor');
    const portador = titularEn(e, 'local', 'DC');
    const cerca = ponerRasgos(titularEn(e, 'visitante', 'DCI'), { defectos: malDefensor ? ['MalDefensor'] : [] });
    const lejos = titularEn(e, 'visitante', 'DCD');
    situar(e, portador.id, { x: 7000, y: 3200 });
    darBalon(e, 'local', portador, 4);
    // En coordenadas del visitante: x absoluta 7.380 y 7.476; y absoluta 3.400 y 3.500.
    situar(e, cerca.id, { x: 10000 - 7380, y: 6400 - 3400 });
    situar(e, lejos.id, { x: 10000 - 7476, y: 6400 - 3500 });
    soloEnCampo(e, [portador.id, cerca.id, lejos.id, titularEn(e, 'visitante', 'POR').id]);
    return { e, cerca, lejos };
  }

  /** Veces que entra al duelo (o corta el pase) el más cercano, el Mal defensor, en `n` sorteos. */
  function vecesCerca(malDefensor: boolean, elegir: 'duelo' | 'pase', n = 400) {
    const { e, cerca } = escena(malDefensor);
    let veces = 0;
    for (let i = 0; i < n; i++) {
      const ctx = contextoDe(e, `mal-defensor-${i}`);
      const j =
        elegir === 'duelo'
          ? rivalCercano(ctx, e.equipos.visitante)
          : interceptorDePase(ctx, e.equipos.visitante, { x: 7000, y: 3200 }, { x: 8000, y: 3200 });
      if (j?.id === cerca.id) veces++;
    }
    return veces / n;
  }

  it('multiplica por 0,5 su peso como candidato: la mitad de las veces le cede el duelo al siguiente', () => {
    expect(factorDefensivo(escena(true).e, escena(true).cerca)).toBe(P4.defectos!.malDefensor);
    expect(vecesCerca(false, 'duelo')).toBe(1);
    expect(vecesCerca(true, 'duelo')).toBeGreaterThan(0.4);
    expect(vecesCerca(true, 'duelo')).toBeLessThan(0.6);
  });

  it('también en la intercepción de un pase', () => {
    expect(vecesCerca(false, 'pase')).toBe(1);
    expect(vecesCerca(true, 'pase')).toBeGreaterThan(0.4);
    expect(vecesCerca(true, 'pase')).toBeLessThan(0.6);
  });

  it('si es el único candidato, defiende igual', () => {
    const { e, cerca, lejos } = escena(true);
    soloEnCampo(e, [cerca.id, titularEn(e, 'local', 'DC').id]);
    expect(lejos).toBeDefined();
    expect(rivalCercano(contextoDe(e), e.equipos.visitante)?.id).toBe(cerca.id);
  });
});
