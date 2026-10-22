/**
 * Virtudes nuevas de la spec 005 (T087; FR-030 a FR-034): De acero, Fair player y Revulsivo en el motor (Versátil se
 * prueba en la penalización por posición del dominio).
 */
import { describe, expect, it } from 'vitest';
import { amarilla, falta } from '../src/acciones/balonParado';
import { comprobarLesion } from '../src/acciones/lesiones';
import { multiplicadorIndividual } from '../src/modificadores/defectos';
import { aplicarDecision, avanzar, crearPartido } from '../src/index';
import { contextoDe, entrada, ponerRasgos, situar, titularEn } from './ayudas';
import { conParametros, P4, partido4 } from './ayudasRasgos';

describe('De acero', () => {
  it('no se lesiona aunque la probabilidad esté forzada a 1', () => {
    const q = conParametros((x) => {
      x.lesiones.probabilidadPorEntrada = 1;
    });
    for (let i = 0; i < 30; i++) {
      const e = partido4(`de-acero-${i}`, q);
      const j = ponerRasgos(titularEn(e, 'local', 'DC'), { virtudes: ['DeAcero'] });
      expect(comprobarLesion(contextoDe(e, `de-acero-${i}`), e.equipos.local, j)).toBe(false);
      expect(j.lesionado).toBe(false);
      expect(e.eventos.some((x) => x.tipo === 'lesion')).toBe(false);
      // Sin la virtud, con la probabilidad a 1 se lesiona siempre.
      const otro = titularEn(e, 'local', 'SD');
      expect(comprobarLesion(contextoDe(e, `de-acero-otro-${i}`), e.equipos.local, otro)).toBe(true);
    }
  });
});

describe('Fair player', () => {
  it('no recibe roja directa aunque la probabilidad esté forzada a 1', () => {
    const q = conParametros((x) => {
      x.disciplina.probabilidadRojaDirectaPorFalta = 1;
      x.lesiones.probabilidadPorEntrada = 0;
    });
    for (let i = 0; i < 20; i++) {
      const e = partido4(`fair-${i}`, q);
      const victima = titularEn(e, 'local', 'DC');
      const culpable = ponerRasgos(titularEn(e, 'visitante', 'DCI'), { virtudes: ['FairPlayer'] });
      situar(e, victima.id, { x: 5000, y: 3200 });
      e.espacio.balon = { x: 5000, y: 3200, z: 0 };
      e.balon = { posesion: 'local', zona: 2, carril: 1, portadorId: victima.id, transicion: false };
      falta(contextoDe(e, `fair-${i}`), e.equipos.local, victima, e.equipos.visitante, culpable);
      expect(e.eventos.some((x) => x.tipo === 'roja')).toBe(false);
      expect(culpable.expulsado).toBe(false);
    }
  });

  it('con dos amarillas sigue en el campo con amarillas = 2', () => {
    const e = partido4('fair-dos-amarillas');
    const j = ponerRasgos(titularEn(e, 'visitante', 'DCI'), { virtudes: ['FairPlayer'] });
    const ctx = contextoDe(e);
    amarilla(ctx, e.equipos.visitante, j);
    amarilla(ctx, e.equipos.visitante, j);
    expect(j.amarillas).toBe(2);
    expect(j.enCampo).toBe(true);
    expect(e.eventos.filter((x) => x.tipo === 'amarilla')).toHaveLength(2);
    expect(e.eventos.some((x) => x.tipo === 'roja')).toBe(false);
    // Sin la virtud, la segunda amarilla expulsa.
    const otro = titularEn(e, 'visitante', 'DCD');
    amarilla(ctx, e.equipos.visitante, otro);
    amarilla(ctx, e.equipos.visitante, otro);
    expect(otro.expulsado).toBe(true);
  });
});

describe('Revulsivo', () => {
  it('× 1,05 a sus stats solo si entró desde el banquillo; un titular no recibe nada', () => {
    const e = partido4('revulsivo');
    const eq = e.equipos.local;
    const titular = ponerRasgos(titularEn(e, 'local', 'DC'), { virtudes: ['Revulsivo'] });
    expect(multiplicadorIndividual(e, eq, titular)).toBe(1);
    const suplente = ponerRasgos(eq.jugadores.find((j) => !j.enCampo && j.jugador.demarcacion === 'DEL')!, { virtudes: ['Revulsivo'] });
    expect(suplente.entroDesdeBanquillo).toBe(false);
    expect(aplicarDecision(e, { participanteId: 'local', tipo: 'sustitucion', datos: { sale: titularEn(e, 'local', 'SD').id, entra: suplente.id } }).ok).toBe(true);
    const tras = avanzar(e, 'interrupcion').estado;
    const entro = tras.equipos.local.jugadores.find((j) => j.id === suplente.id)!;
    expect(entro.enCampo).toBe(true);
    expect(entro.entroDesdeBanquillo).toBe(true);
    expect(multiplicadorIndividual(tras, tras.equipos.local, entro)).toBeCloseTo(1 + P4.virtudes.revulsivo!);
  });

  it('también al entrar por un lesionado', () => {
    const q = conParametros((x) => {
      x.lesiones.probabilidadPorEntrada = 1;
    });
    const e = partido4('revulsivo-lesion', q);
    const eq = e.equipos.local;
    for (const j of eq.jugadores) if (!j.enCampo) ponerRasgos(j, { virtudes: ['Revulsivo'] });
    comprobarLesion(contextoDe(e), eq, titularEn(e, 'local', 'DC'));
    const entro = eq.jugadores.find((j) => j.enCampo && j.entroDesdeBanquillo)!;
    expect(entro).toBeDefined();
    expect(multiplicadorIndividual(e, eq, entro)).toBeCloseTo(1 + P4.virtudes.revulsivo!);
  });

  it('con parámetros 3.0.0 no hace nada', () => {
    const e = crearPartido(entrada('revulsivo-v3'));
    const j = ponerRasgos(titularEn(e, 'local', 'DC'), { virtudes: ['Revulsivo'] });
    j.entroDesdeBanquillo = true;
    expect(multiplicadorIndividual(e, e.equipos.local, j)).toBe(1);
  });
});
