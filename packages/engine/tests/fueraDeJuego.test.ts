/**
 * Fuera de juego por posición (spec 014, US3; contrato M4): `enFueraDeJuego` y `penultimoDefensor` con posiciones
 * preparadas, y la reposición desde donde estaba el infractor.
 */
import { describe, expect, it } from 'vitest';
import { fueraDeJuego } from '../src/acciones/balonParado';
import { enFueraDeJuego, penultimoDefensor } from '../src/acciones/fueraDeJuego';
import { contextoDe, darBalon, partido, situar, soloEnCampo, titularEn } from './ayudas';

/** Coordenadas del equipo local; 0,3 m ≈ 29 décimas de tolerancia. */
function escena(xReceptor: number, xBalon = 6000) {
  const e = partido('fdj');
  const pasador = titularEn(e, 'local', 'MC-1');
  const receptor = titularEn(e, 'local', 'DC');
  const portero = titularEn(e, 'visitante', 'POR');
  const central = titularEn(e, 'visitante', 'DCI');
  situar(e, pasador.id, { x: xBalon, y: 3200 });
  situar(e, receptor.id, { x: xReceptor, y: 3000 });
  // Coordenadas del visitante: el portero en su portería y el central a x = 8.000 del local.
  situar(e, portero.id, { x: 300, y: 3200 });
  situar(e, central.id, { x: 10000 - 8000, y: 3200 });
  soloEnCampo(e, [pasador.id, receptor.id, portero.id, central.id]);
  darBalon(e, 'local', pasador, 3);
  return { e, receptor, pasador };
}

describe('fuera de juego por posición (M4)', () => {
  it('penultimoDefensor cuenta al portero: con portero y un central, es el central', () => {
    const { e } = escena(8500);
    expect(penultimoDefensor(e, e.equipos.visitante, 'local')).toBe(8000);
  });

  it('M4.1: por delante del balón y del penúltimo (más de la tolerancia) ⇒ fuera de juego', () => {
    const { e, receptor } = escena(8100);
    expect(enFueraDeJuego(e, e.equipos.local, receptor, 6000)).toBe(true);
  });

  it('M4.2: a la altura del penúltimo (dentro de la tolerancia) o por detrás ⇒ legal', () => {
    expect(enFueraDeJuego(escena(8020).e, escena(8020).e.equipos.local, escena(8020).receptor, 6000)).toBe(false);
    const { e, receptor } = escena(7500);
    expect(enFueraDeJuego(e, e.equipos.local, receptor, 6000)).toBe(false);
  });

  it('M4.3: en su propio campo ⇒ legal aunque la defensa esté muy adelantada', () => {
    const { e, receptor } = escena(4800, 3000);
    situar(e, titularEn(e, 'visitante', 'DCI').id, { x: 10000 - 4000, y: 3200 });
    situar(e, titularEn(e, 'visitante', 'POR').id, { x: 10000 - 4500, y: 3200 });
    expect(enFueraDeJuego(e, e.equipos.local, receptor, 3000)).toBe(false);
  });

  it('M4.4: por detrás del balón ⇒ legal aunque pase al penúltimo', () => {
    const { e, receptor } = escena(8300, 8600);
    expect(enFueraDeJuego(e, e.equipos.local, receptor, 8600)).toBe(false);
  });

  it('M4.6: en posición correcta al salir el pase y adelantado después ⇒ la foto del pase decide (legal)', () => {
    const { e, receptor } = escena(7800);
    const enElPase = enFueraDeJuego(e, e.equipos.local, receptor, 6000);
    situar(e, receptor.id, { x: 9000, y: 3000 });
    expect(enElPase).toBe(false);
  });

  it('M4.1: el evento lleva al receptor como autor y la falta se saca desde donde estaba', () => {
    const { e, receptor } = escena(8100);
    const ctx = contextoDe(e);
    const punto = { ...e.espacio.jugadores[receptor.id]! };
    fueraDeJuego(ctx, e.equipos.local, receptor, punto, { xPenultimo: 8000, xBalon: 6000 });
    const evento = e.eventos.find((ev) => ev.tipo === 'fuera_de_juego')!;
    expect(evento.jugadores).toEqual([{ rol: 'autor', jugadorId: receptor.id }]);
    expect(e.balon.posesion).toBe('visitante');
    expect(e.estadisticas.local.fuerasDeJuego).toBe(1);
    expect(e.estadisticas.visitante.fuerasDeJuegoProvocados).toBe(1);
    expect(e.espacio.balon).toMatchObject({ x: punto.x, y: punto.y });
  });
});
