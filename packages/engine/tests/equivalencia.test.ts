/**
 * Equivalencia entre modalidades (T130; SC-008, `pnpm test:equivalence`): el 2D avanza de interrupción en
 * interrupción y la rápida de parte en parte, pero con las mismas decisiones en los mismos ticks el
 * partido es exactamente el mismo. Pedir fotogramas tampoco lo cambia.
 */
import { describe, expect, it } from 'vitest';
import {
  aplicarDecision,
  avanzar,
  crearPartido,
  type DecisionRegistrada,
  type EntradaPartido,
  type EstadoMotor,
  type EventoPartido,
  type ResultadoTramo,
} from '../src/index';
import { entrada } from './ayudas';

const SEMILLAS = 200;

/** Decisiones de prueba: un cambio del local hacia el minuto 30 y un cambio de táctica del visitante hacia el 70. */
function decidir(estado: EstadoMotor, hechas: Set<string>): void {
  if (!hechas.has('sustitucion') && estado.tick >= 1800 && estado.fase !== 'descanso') {
    const eq = estado.equipos.local;
    const sale = eq.jugadores.find((j) => j.enCampo && j.casillaId !== 'POR');
    const entra = eq.jugadores.find((j) => !j.enCampo && !j.retirado);
    if (sale && entra && aplicarDecision(estado, { participanteId: 'local', tipo: 'sustitucion', datos: { sale: sale.id, entra: entra.id } }).ok) {
      hechas.add('sustitucion');
    }
  }
  if (!hechas.has('tactica') && estado.tick >= 4200) {
    const tactica = { ...estado.equipos.visitante.tactica, alturaBloque: 'presion_alta' as const };
    if (aplicarDecision(estado, { participanteId: 'visitante', tipo: 'tactica', datos: { tactica } }).ok) hechas.add('tactica');
  }
}

/** Partido en 2D: de interrupción en interrupción, decidiendo con el balón parado. */
function jugar2D(e: EntradaPartido, opciones: { fotogramas?: boolean; decisiones?: boolean } = {}) {
  let estado = crearPartido(e);
  const eventos: EventoPartido[] = [];
  const hechas = new Set<string>();
  let r: ResultadoTramo | null = null;
  for (let i = 0; i < 5000 && estado.fase !== 'finalizado'; i++) {
    if (opciones.decisiones) decidir(estado, hechas);
    r = avanzar(estado, 'interrupcion', { fotogramas: opciones.fotogramas ?? false });
    eventos.push(...r.eventos);
    estado = r.estado;
  }
  return { eventos, marcador: r!.marcador, decisiones: estado.decisiones, fase: estado.fase };
}

/** Partido en rápida: de parte en parte, reproduciendo las decisiones con su `aplicadaEnTick`. */
function jugarRapida(e: EntradaPartido, decisiones: readonly DecisionRegistrada[] = []) {
  let estado = crearPartido(e);
  for (const d of decisiones) aplicarDecision(estado, d);
  const eventos: EventoPartido[] = [];
  let r: ResultadoTramo | null = null;
  for (let i = 0; i < 10 && estado.fase !== 'finalizado'; i++) {
    r = avanzar(estado, 'parte');
    eventos.push(...r.eventos);
    estado = r.estado;
  }
  return { eventos, marcador: r!.marcador, decisiones: estado.decisiones, fase: estado.fase };
}

describe('equivalencia entre modalidades (SC-008)', () => {
  it(`sin decisiones, 'interrupcion' encadenado da lo mismo que 'parte' y que 'final' (${SEMILLAS} semillas)`, () => {
    for (let i = 0; i < SEMILLAS; i++) {
      // Una sola entrada por semilla: los jugadores de prueba reciben ids nuevos en cada llamada.
      const e = entrada(`eq-${i}`);
      const d2 = jugar2D(e);
      const rapida = jugarRapida(e);
      const final = avanzar(crearPartido(e), 'final');
      expect(d2.fase).toBe('finalizado');
      expect(d2.eventos).toEqual(rapida.eventos);
      expect(d2.marcador).toEqual(rapida.marcador);
      expect(d2.eventos).toEqual(final.eventos);
    }
  });

  it(`con decisiones en juego, la rápida que las reproduce en los mismos ticks da el mismo partido (${SEMILLAS} semillas)`, () => {
    let conDecisiones = 0;
    for (let i = 0; i < SEMILLAS; i++) {
      const e = entrada(`eq-dec-${i}`);
      const d2 = jugar2D(e, { decisiones: true });
      const rapida = jugarRapida(e, d2.decisiones);
      expect(rapida.decisiones.map((d) => [d.tipo, d.aplicadaEnTick])).toEqual(d2.decisiones.map((d) => [d.tipo, d.aplicadaEnTick]));
      expect(rapida.eventos).toEqual(d2.eventos);
      expect(rapida.marcador).toEqual(d2.marcador);
      if (d2.decisiones.length > 0) conDecisiones++;
    }
    // La prueba solo vale si de verdad se aplicaron decisiones.
    expect(conDecisiones).toBeGreaterThan(SEMILLAS * 0.9);
  });

  it('pedir fotogramas no altera el resultado', () => {
    for (let i = 0; i < SEMILLAS; i++) {
      const e = entrada(`eq-fot-${i}`);
      const sin = jugar2D(e, { decisiones: true });
      const con = jugar2D(e, { decisiones: true, fotogramas: true });
      expect(con.eventos).toEqual(sin.eventos);
      expect(con.marcador).toEqual(sin.marcador);
    }
  });
});
