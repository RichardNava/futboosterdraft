/**
 * Mano a mano por posición (spec 014, US2; contrato M2): detección y directriz de FR-004 con posiciones preparadas.
 */
import { describe, expect, it } from 'vitest';
import { decisionManoAMano, esManoAMano } from '../src/acciones/manoAMano';
import { entorno } from '../src/acciones/opciones';
import type { EstadoMotor, JugadorEnPartido } from '../src/index';
import { darBalon, partido, situar, soloEnCampo, titularEn } from './ayudas';

/** Coordenadas del equipo local: 1 m ≈ 95 décimas; la portería rival en x = 10.000. */
const M = 95.24;
const xA = (metros: number) => Math.round(10000 - metros * M);

/** Sustituye al jugador por una copia con otro remate (los atributos se guardan en caché por jugador). */
function conRemate(e: EstadoMotor, j: JugadorEnPartido, remate: number): JugadorEnPartido {
  const nuevo = { ...j, jugador: { ...j.jugador, stats: { ...j.jugador.stats, finalizacion: remate } as typeof j.jugador.stats } };
  const lista = e.equipos.local.jugadores;
  lista[lista.indexOf(j)] = nuevo;
  return nuevo;
}

/** Delantero local solo a `metros` de la portería, con el portero rival en su línea (o adelantado). */
function escena(
  metros: number,
  opciones: { remate?: number; porteroM?: number; encima?: boolean; companero?: { x: number; y: number }; defensaEnPasillo?: boolean; y?: number } = {},
) {
  const e = partido('mano-a-mano');
  const portador = conRemate(e, titularEn(e, 'local', 'DC'), opciones.remate ?? 70);
  const y = opciones.y ?? 3200;
  const companero = titularEn(e, 'local', 'SD');
  const portero = titularEn(e, 'visitante', 'POR');
  const central = titularEn(e, 'visitante', 'DCI');
  const zaguero = titularEn(e, 'visitante', 'DCD');
  situar(e, portador.id, { x: xA(metros), y });
  // Coordenadas del visitante para los rivales.
  situar(e, portero.id, { x: Math.round((opciones.porteroM ?? 1) * M), y: 3200 });
  // Un central por detrás del portador (ya superado) o dentro del pasillo, por delante.
  situar(e, central.id, opciones.defensaEnPasillo ? { x: 10000 - (xA(metros) + 400), y: 3200 } : { x: 10000 - (xA(metros) - 1200), y: 3200 });
  // Con `encima`, un rival a 3 m por detrás del portador.
  situar(e, zaguero.id, opciones.encima ? { x: 10000 - (xA(metros) - 290), y: 6400 - (y + 50) } : { x: 10000 - 2000, y: 600 });
  const ids = [portador.id, portero.id, central.id, zaguero.id];
  if (opciones.companero) {
    situar(e, companero.id, opciones.companero);
    ids.push(companero.id);
  }
  soloEnCampo(e, ids);
  darBalon(e, 'local', portador, 5);
  const en = entorno(e, e.equipos.local, portador)!;
  return { e, portador, companero, en, decidir: () => decisionManoAMano(e, e.equipos.local, portador, en) };
}

describe('mano a mano por posición (M2)', () => {
  it('M2.1: lejos y sin presión ⇒ conducción', () => {
    const { e, portador, en, decidir } = escena(30);
    expect(esManoAMano(e, e.equipos.local, portador, en)).toBe(true);
    expect(decidir()).toBe('conduccion');
  });

  it('M2.2: a distancia de disparo ⇒ tiro', () => {
    expect(escena(12).decidir()).toBe('tiro');
  });

  it('M2.3: a la misma distancia límite, remate 90 tira y remate 60 conduce', () => {
    expect(escena(16, { remate: 90 }).decidir()).toBe('tiro');
    expect(escena(16, { remate: 60 }).decidir()).toBe('conduccion');
  });

  it('M2.4: con el portero adelantado tira desde más lejos', () => {
    expect(escena(24).decidir()).toBe('conduccion');
    expect(escena(24, { porteroM: 16 }).decidir()).toBe('tiro');
  });

  it('M2.5: rival encima y compañero en paralelo, libre, en posición correcta y mejor situado ⇒ pase', () => {
    // Escorado, con un compañero centrado y algo por detrás del balón (en posición correcta): mejor ocasión.
    const { companero, decidir } = escena(25, { encima: true, y: 1500, companero: { x: xA(25.5), y: 3200 } });
    expect(decidir()).toEqual({ pase: companero });
  });

  it('M2.6: compañero en fuera de juego, atrasado o sin compañero ⇒ nunca pase atrás', () => {
    // Por delante del penúltimo (el portero y el central ya superado no cuentan: el penúltimo es el central).
    expect(escena(25, { encima: true, companero: { x: xA(10), y: 3800 } }).decidir()).not.toHaveProperty('pase');
    expect(escena(25, { encima: true, companero: { x: xA(35), y: 3800 } }).decidir()).toBe('conduccion');
    expect(escena(25, { encima: true }).decidir()).toBe('conduccion');
  });

  it('M2.7: un defensa de campo dentro del pasillo por delante ⇒ no es mano a mano', () => {
    const { e, portador, en } = escena(25, { defensaEnPasillo: true });
    expect(esManoAMano(e, e.equipos.local, portador, en)).toBe(false);
  });
});
