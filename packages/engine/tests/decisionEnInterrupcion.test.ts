/**
 * Una decisión pedida con el balón en juego se aplica al pitarse la primera interrupción (002/FR-025a), aunque el
 * balón parado encadene saque, tiro y otro saque en la misma jugada, y al reproducir el partido cae en el mismo punto.
 * También: quien va a sacar llega al balón aunque otro jugador le tape en línea recta.
 */
import { parametrosActuales } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { reponer } from '../src/acciones/animaciones';
import { calcularObjetivos } from '../src/espacio/objetivos';
import { aplicarDecision, avanzar, crearPartido, type DecisionPartido, type EntradaPartido, type EstadoMotor, type EventoPartido } from '../src/index';
import { contextoDe, entrada, equipo, partido, situar, soloEnCampo, titularEn } from './ayudas';

const CON_LESIONES = { ...parametrosActuales(), lesiones: { ...parametrosActuales().lesiones, probabilidadPorEntrada: 0.04 } };
const PEDIDOS = [300, 1500, 3600];

const tactica = (e: EstadoMotor): DecisionPartido => ({
  participanteId: 'local',
  tipo: 'tactica',
  datos: { tactica: { ...e.equipos.local.tactica, estiloConBalon: 'combinativo' } },
});

/** Sustitución de quien lleva el balón (si es del local): el caso en que el sacador de la jugada puede irse. */
function cambioDelPortador(e: EstadoMotor): DecisionPartido {
  const eq = e.equipos.local;
  const sale = eq.jugadores.find((j) => j.id === e.balon.portadorId && j.enCampo && j.casillaId !== 'POR') ?? eq.jugadores.find((j) => j.enCampo && j.casillaId !== 'POR')!;
  const entra = eq.jugadores.find((j) => !j.enCampo && !j.retirado)!;
  return { participanteId: 'local', tipo: 'sustitucion', datos: { sale: sale.id, entra: entra.id } };
}

/** Juega por tramos como la 2D en directo y pide la decisión con el balón en juego a partir de `desde`. */
function jugar(e: EntradaPartido, desde: number, decision: (x: EstadoMotor) => DecisionPartido, controlTotal = false) {
  let estado = crearPartido(e);
  if (controlTotal) estado.equipos.local.controlTotal = true;
  const eventos: EventoPartido[] = [];
  let pedido: number | undefined;
  for (let i = 0; i < 20000 && estado.fase !== 'finalizado'; i++) {
    if (pedido === undefined && estado.tick >= desde && !estado.puntoDecision && estado.fase !== 'descanso') {
      expect(aplicarDecision(estado, decision(estado)).ok).toBe(true);
      pedido = estado.tick;
    }
    const r = avanzar(estado, 'ticks', { hastaTick: estado.tick + 60 });
    eventos.push(...r.eventos);
    estado = r.estado;
  }
  return { estado, eventos, pedido: pedido! };
}

/** Reproduce un partido con sus decisiones registradas, de parte en parte. */
function reproducir(e: EntradaPartido, estadoFinal: EstadoMotor) {
  let estado = crearPartido(e);
  for (const d of estadoFinal.decisiones) aplicarDecision(estado, d);
  const eventos: EventoPartido[] = [];
  for (let i = 0; i < 10 && estado.fase !== 'finalizado'; i++) {
    const r = avanzar(estado, 'parte');
    eventos.push(...r.eventos);
    estado = r.estado;
  }
  return { estado, eventos };
}

const esParada = (x: EventoPartido) => x.tipo === 'interrupcion' && !String(x.datos.motivo).startsWith('cambio_');

describe('decisión con el balón en juego (002/FR-025a)', () => {
  it('se aplica en la primera interrupción tras pedirla, también si la jugada a balón parado sigue', () => {
    let encadenadas = 0;
    for (let s = 0; s < 20; s++) {
      for (const desde of PEDIDOS) {
        const { estado, eventos, pedido } = jugar(entrada(`decision-${s}`), desde, tactica);
        const aplicada = estado.decisiones[0]!.aplicadaEnTick!;
        const primera = eventos.find((x) => esParada(x) && x.tick >= pedido)!;
        expect(aplicada, `semilla ${s}, pedido ${pedido}`).toBe(primera.tick);
        if (estado.acciones.some((a) => a.tipo === 'saque' && a.inicioTick >= aplicada && a.inicioTick <= aplicada + 1 && a.finTick > aplicada + 20)) encadenadas++;
      }
    }
    expect(encadenadas).toBeGreaterThan(0);
  });

  it('al reproducir cae en el mismo punto, con sustituciones, lesiones y control total', () => {
    for (let s = 0; s < 16; s++) {
      for (const controlTotal of [false, true]) {
        const e = entrada(`decision-rep-${s}`, { parametros: CON_LESIONES });
        const directo = jugar(e, PEDIDOS[s % PEDIDOS.length]!, cambioDelPortador, controlTotal);
        const repetido = reproducir(e, directo.estado);
        expect(repetido.eventos, `semilla ${s}`).toEqual(directo.eventos);
        expect(repetido.estado.marcador).toEqual(directo.estado.marcador);
        expect(repetido.estado.decisiones.map((d) => [d.tipo, d.aplicadaEnTick, d.enIncidencia])).toEqual(directo.estado.decisiones.map((d) => [d.tipo, d.aplicadaEnTick, d.enIncidencia]));
      }
    }
  });

  it('el jugador sustituido no saca ni toca el balón después de irse', () => {
    for (let s = 0; s < 20; s++) {
      const { estado } = jugar(entrada(`decision-sale-${s}`), PEDIDOS[s % PEDIDOS.length]!, cambioDelPortador);
      const d = estado.decisiones.find((x) => x.tipo === 'sustitucion');
      if (d?.tipo !== 'sustitucion') continue;
      const despues = estado.acciones.filter((a) => a.inicioTick > d.aplicadaEnTick!);
      expect(despues.filter((a) => a.de === d.datos.sale)).toEqual([]);
    }
  });
});

describe('saque con otro jugador en la misma línea (spec 014, FR-001)', () => {
  it('el sacador rodea a quien le tapa de frente y llega al balón', () => {
    const e = partido('saque-tapado', { local: equipo('local', { formacion: '4-2-3-1' }) });
    const tapa = titularEn(e, 'local', 'MCO');
    const sacador = titularEn(e, 'local', 'DC');
    e.espacio.balon = { x: 5200, y: 3200, z: 0 };
    e.espacio.referencia = { x: 5200, y: 3200, tick: e.tick };
    e.balon = { posesion: 'local', zona: 2, carril: 1, portadorId: sacador.id, transicion: false };
    soloEnCampo(e, [tapa.id, sacador.id]);
    const sitio = calcularObjetivos(e)[tapa.id]!;
    expect(sitio.y).toBe(3200);
    situar(e, tapa.id, sitio);
    situar(e, sacador.id, { x: sitio.x + 500, y: 3200 });
    const ctx = contextoDe(e);
    reponer(ctx, 'falta', { x: 5200, y: 3200 }, sacador.id);
    const a = e.acciones.at(-1)!;
    expect(a.finTick - a.inicioTick).toBeLessThan(120);
  });
});
