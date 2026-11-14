/**
 * Cansancio y energía (spec 014, US4; contrato M5): el ritmo de la 7.0.0 deja a un jugador sin rasgos con ≈ 50 % de
 * energía al 90', y `energiaDe` es la única fuente de la energía que pinta la interfaz.
 */
import { describe, expect, it } from 'vitest';
import { acumularCansancio } from '../src/modificadores/cansancio';
import { avanzar, crearPartido, energiaDe, type EstadoMotor, type JugadorEnPartido } from '../src/index';
import { entrada, partido, ponerRasgos } from './ayudas';

/** Juega los minutos [desde, hasta) segundo a segundo, solo el cansancio (sin simular el partido). */
function cansar(e: EstadoMotor, desde: number, hasta: number): void {
  for (let s = desde * 60; s < hasta * 60; s++) {
    const m = s / 60;
    const parte = m < 45 ? 1 : m < 90 ? 2 : m < 105 ? 3 : 4;
    e.reloj = { ...e.reloj, parte, segundosEnParte: s - [0, 0, 45, 90, 105][parte]! * 60 };
    acumularCansancio(e, e.equipos.local, 1);
    acumularCansancio(e, e.equipos.visitante, 1);
  }
}

const enCampo = (e: EstadoMotor) => e.equipos.local.jugadores.filter((j) => j.enCampo && j.casillaId !== null);
const energia = (e: EstadoMotor, j: JugadorEnPartido) => energiaDe(e, j).energia;

describe('cansancio y energía (M5)', () => {
  it('M5.1: sin rasgos, antes del inicio (65; 55 con Presión alta) energía 100 y penalización 0', () => {
    const e = partido('m51');
    cansar(e, 0, 64);
    for (const j of enCampo(e)) expect(energiaDe(e, j)).toEqual({ energia: 100, penalizacion: 0 });
    const p = partido('m51-presion', { local: { ...entrada('x').local, tactica: { ...entrada('x').local.tactica, alturaBloque: 'presion_alta' } } });
    cansar(p, 0, 54);
    for (const j of enCampo(p)) expect(energia(p, j)).toBe(100);
  });

  it('M5.2: sin rasgos, al final de un partido de 90 minutos (descuento incluido) energía 45–55 y penalización 27–33', () => {
    const final = avanzar(crearPartido(entrada('m52')), 'final').estado;
    const completos = final.equipos.local.jugadores.filter((j) => j.enCampo && !j.entroDesdeBanquillo && j.casillaId !== null);
    expect(completos.length).toBeGreaterThan(8);
    for (const j of completos) {
      const { energia: en, penalizacion } = energiaDe(final, j);
      expect(en).toBeGreaterThanOrEqual(45);
      expect(en).toBeLessThanOrEqual(55);
      expect(penalizacion).toBeGreaterThanOrEqual(27);
      expect(penalizacion).toBeLessThanOrEqual(33);
    }
  }, 60_000);

  it('M5.3 y M5.6: tras una prórroga completa energía < 40, sin pasar del tope', () => {
    const e = partido('m53');
    cansar(e, 0, 120);
    for (const j of enCampo(e)) {
      expect(energia(e, j)).toBeLessThan(40);
      expect(j.cansancio).toBeLessThanOrEqual(e.parametros.cansancio.maximo!);
      expect(energia(e, j)).toBeGreaterThanOrEqual(0);
    }
  });

  it('M5.4: un sustituto entra con energía 100 y se cansa desde su entrada', () => {
    const e = partido('m54');
    cansar(e, 0, 75);
    const titular = enCampo(e)[3]!;
    const sustituto = { ...titular, id: 9999, cansancio: 0, entroDesdeBanquillo: true };
    e.equipos.local.jugadores[e.equipos.local.jugadores.indexOf(titular)] = sustituto;
    expect(energia(e, sustituto)).toBe(100);
    cansar(e, 75, 90);
    expect(energia(e, sustituto)).toBeLessThan(100);
    expect(energia(e, sustituto)).toBeGreaterThan(energia(e, enCampo(e)[4]!));
  });

  it('M5.5: Incansable, Fatigado y Presión alta cambian la energía como cambian el cansancio', () => {
    const e = partido('m55');
    const [normal, incansable, fatigado] = enCampo(e).slice(1, 4);
    ponerRasgos(incansable!, { virtudes: ['Incansable'] });
    ponerRasgos(fatigado!, { defectos: ['Fatigado'] });
    cansar(e, 0, 90);
    for (const j of [normal!, incansable!, fatigado!]) expect(energia(e, j)).toBe(Math.round(100 * (1 - j.cansancio / e.parametros.cansancio.maximo!)));
    expect(energia(e, incansable!)).toBeGreaterThan(energia(e, normal!));
    expect(energia(e, fatigado!)).toBeLessThan(energia(e, normal!));
    const p = partido('m55-presion', { local: { ...entrada('x').local, tactica: { ...entrada('x').local.tactica, alturaBloque: 'presion_alta' } } });
    cansar(p, 0, 90);
    expect(energia(p, enCampo(p)[2]!)).toBeLessThan(energia(e, normal!));
  });
});
