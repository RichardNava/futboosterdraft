/**
 * Rival que entra al duelo (spec 003, research R9; FR-021; T014): el más cercano según una distancia efectiva
 * que crece con quite y anticipación, ya no "el más débil de los dos".
 */
import { describe, expect, it } from 'vitest';
import { radioIntervencion, rivalCercano } from '../src/acciones/contexto';
import type { JugadorEnPartido } from '../src/index';
import { contextoDe, darBalon, partido, situar, soloEnCampo, titularEn } from './ayudas';

function conDefensa(j: JugadorEnPartido, valor: number) {
  j.jugador = { ...j.jugador, stats: { ...j.jugador.stats, tackling: valor, anticipacion: valor } as typeof j.jugador.stats };
}

function escena(semilla: string, fuerteA: number, debilA: number) {
  const e = partido(semilla);
  const portador = titularEn(e, 'local', 'MC-1');
  const fuerte = titularEn(e, 'visitante', 'DCI');
  const debil = titularEn(e, 'visitante', 'DCD');
  conDefensa(fuerte, 90);
  conDefensa(debil, 60);
  situar(e, portador.id, { x: 6000, y: 3200 });
  // Coordenadas del visitante: el balón está en (4000, 3200).
  situar(e, fuerte.id, { x: 4000, y: 3200 - fuerteA });
  situar(e, debil.id, { x: 4000, y: 3200 + debilA });
  soloEnCampo(e, [portador.id, fuerte.id, debil.id]);
  darBalon(e, 'local', portador, 3);
  return { e, fuerte, debil };
}

describe('rival que interviene en el duelo (T014)', () => {
  it('ya no favorece al defensor más débil: a la misma distancia interviene siempre el de más quite y anticipación', () => {
    const { e, fuerte } = escena('misma-distancia', 400, 400);
    for (let i = 0; i < 1000; i++) expect(rivalCercano(contextoDe(e, `rc-${i}`), e.equipos.visitante)?.id).toBe(fuerte.id);
  });

  it('el radio de intervención crece un 4 % por punto sobre 70, acotado a ±40 %', () => {
    const { e, fuerte, debil } = escena('radio', 400, 400);
    expect(radioIntervencion(e, e.equipos.visitante, fuerte)).toBe(1400);
    expect(radioIntervencion(e, e.equipos.visitante, debil)).toBe(600);
    const medio = titularEn(e, 'visitante', 'LD');
    conDefensa(medio, 75);
    expect(radioIntervencion(e, e.equipos.visitante, medio)).toBe(1200);
  });

  it('un defensor débil mucho más cerca sigue interviniendo', () => {
    const { e, debil } = escena('mas-cerca', 1500, 100);
    expect(rivalCercano(contextoDe(e, 'cerca'), e.equipos.visitante)?.id).toBe(debil.id);
  });
});
