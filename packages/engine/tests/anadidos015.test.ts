/**
 * Añadidos de la spec 015 (FR-025 a FR-029; research R11 a R14): buscar a la estrella, Juego por las bandas, subida al
 * área a balón parado y segunda línea. Todo cuelga de bloques de la 8.0.0: con la 7.0.0, nada. El desmarque en el pase
 * (FR-026) lo sustituyó el duelo de desmarque de la tanda 2 (`desmarque.test.ts`).
 */
import { PARAMETROS_V7, PARAMETROS_V8 } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { esManoAMano } from '../src/acciones/manoAMano';
import type { Entorno } from '../src/acciones/opciones';
import { pesosEstrella, pesosReceptor, type Candidato } from '../src/acciones/receptor';
import { porteroBajoPalos } from '../src/acciones/tiro';
import { objetivosBalonParado } from '../src/espacio/colocacion';
import { calcularObjetivos } from '../src/espacio/objetivos';
import { pesosAcciones, probabilidadBanda } from '../src/modificadores/formacionTactica';
import type { EstadoMotor } from '../src/index';
import { darBalon, equipo, partido, ponerRasgos, situar, titularEn } from './ayudas';

const V8 = { version: PARAMETROS_V8.version, parametros: PARAMETROS_V8 };
const ESTRELLA = PARAMETROS_V8.estrella!;
const M = 95.24;

/** EI (83) y ED (87 o 90) con el mismo peso de partida; el ED marcado pesa 0,6 de lo que pesaría libre. */
function escenaEstrella(mediaED: number, edMarcado: boolean): Candidato[] {
  const j = (id: number) => ({ id }) as Candidato['j'];
  return [
    { j: j(1), peso: 1000, clara: true, media: 83 },
    { j: j(2), peso: edMarcado ? 600 : 1000, clara: !edMarcado, media: mediaED },
  ];
}

describe('buscar a la estrella (FR-025, R11)', () => {
  it('1.1: con las dos líneas claras, prioriza al de más media', () => {
    const [ei, ed] = pesosEstrella(escenaEstrella(87, false), 75, ESTRELLA);
    expect(ed!).toBeGreaterThan(ei!);
  });

  it('1.2: con (visión + pase)/2 ≤ 80 y el ED marcado, prioriza al EI libre', () => {
    const [ei, ed] = pesosEstrella(escenaEstrella(87, true), 80, ESTRELLA);
    expect(ei!).toBeGreaterThan(ed!);
    expect(ed).toBe(600);
  });

  it('1.3: con más de 80 y solo 4 puntos de diferencia, se la juega al ED marcado el 40 %', () => {
    const [ei, ed] = pesosEstrella(escenaEstrella(87, true), 85, ESTRELLA);
    expect(ed! / (ei! + ed!)).toBeCloseTo(0.4, 2);
  });

  it('1.4: con más de 80 y más de 5 puntos de diferencia, prioriza al ED marcado', () => {
    const [ei, ed] = pesosEstrella(escenaEstrella(90, true), 85, ESTRELLA);
    expect(ed!).toBeGreaterThan(ei!);
    expect(ed! / ei!).toBeCloseTo(ESTRELLA.prioridadEstrella, 2);
  });
});

describe('Juego por las bandas (FR-027, R12)', () => {
  const conEstilo = (estilo: 'bandas' | 'equilibrado', parametros = V8) =>
    partido('bandas015', { ...parametros, local: equipo('local', { tactica: { estiloConBalon: estilo } }) });

  it('el balón va más por fuera y se centra más; con la 7.0.0, como el equilibrado', () => {
    const bandas = conEstilo('bandas');
    const equilibrado = conEstilo('equilibrado');
    expect(probabilidadBanda(bandas.equipos.local, PARAMETROS_V8)).toBeCloseTo(probabilidadBanda(equilibrado.equipos.local, PARAMETROS_V8) + 0.2);
    const centro = (e: EstadoMotor) => pesosAcciones(e.equipos.local, 4, 0, e.parametros).find(([a]) => a === 'centro')![1];
    expect(centro(bandas)).toBe(Math.round(centro(equilibrado) * PARAMETROS_V8.bandas!.centro));
    expect(probabilidadBanda(bandas.equipos.local, PARAMETROS_V7)).toBe(probabilidadBanda(equilibrado.equipos.local, PARAMETROS_V7));
  });

  it('laterales y extremos reciben más; el resto, igual', () => {
    const pesos = (e: EstadoMotor) => {
      const portador = titularEn(e, 'local', 'MC-1');
      situar(e, portador.id, { x: 5000, y: 3200 });
      const sitios: Record<string, { x: number; y: number }> = {
        LI: { x: 4500, y: 2400 },
        LD: { x: 4500, y: 4000 },
        EI: { x: 6200, y: 2400 },
        ED: { x: 6200, y: 4000 },
        'MC-2': { x: 5600, y: 3200 },
        DC: { x: 6500, y: 3200 },
      };
      for (const [casilla, punto] of Object.entries(sitios)) situar(e, titularEn(e, 'local', casilla).id, punto);
      darBalon(e, 'local', portador, 2);
      return new Map(pesosReceptor(e, e.equipos.local, portador, 'pase_corto').map(([j, p]) => [j.casillaId, p]));
    };
    const b = pesos(conEstilo('bandas'));
    const q = pesos(conEstilo('equilibrado'));
    expect([...q.keys()].filter((c) => ['LI', 'LD', 'EI', 'ED'].includes(c!)).length).toBeGreaterThan(0);
    expect(q.size).toBeGreaterThan(2);
    for (const [casilla, peso] of q) {
      const banda = ['LI', 'LD', 'EI', 'ED'].includes(casilla!);
      expect(b.get(casilla)! / peso).toBeCloseTo(banda ? PARAMETROS_V8.bandas!.receptorBanda : 1, 1);
    }
  });
});

describe('subida al área a balón parado (FR-028, R13)', () => {
  /** Córner del local: cuántos de sus jugadores van al área rival (x ≥ 7.900) y cuántos se quedan en la retaguardia. */
  function corner(parametros: typeof V8 | Record<string, never>, ajustar: (e: EstadoMotor) => void = () => {}) {
    const e = partido('subida015', parametros);
    ajustar(e);
    const sacador = titularEn(e, 'local', 'ED');
    const objetivos = objetivosBalonParado(e, 'corner', 'local', sacador.id);
    const local = e.equipos.local.jugadores.filter((j) => j.enCampo && objetivos.has(j.id));
    return {
      e,
      arriba: local.filter((j) => objetivos.get(j.id)!.x >= 7900),
      atras: local.filter((j) => objetivos.get(j.id)!.x < 7900),
    };
  }

  it('suben todos menos un defensa y un medio; los Cabeceador siempre suben', () => {
    const { arriba, atras } = corner(V8, (e) => {
      ponerRasgos(titularEn(e, 'local', 'DCI'), { virtudes: ['Cabeceador'] });
      ponerRasgos(titularEn(e, 'local', 'DCD'), { virtudes: ['Cabeceador'] });
    });
    expect(arriba).toHaveLength(7);
    expect(atras).toHaveLength(2);
    expect(arriba.map((j) => j.casillaId)).toEqual(expect.arrayContaining(['DCI', 'DCD']));
    expect(arriba.some((j) => j.casillaId === 'POR')).toBe(false);
  });

  it('el portero sube solo en la última jugada (último minuto del descuento) si pierden de uno', () => {
    // 4 minutos de descuento: el último minuto empieza en el 90+3.
    const final = (local: number, visitante: number, segundos: number, parte = 2) =>
      corner(V8, (e) => {
        e.marcador = { local, visitante };
        e.reloj = { ...e.reloj, parte, segundosEnParte: segundos, descuento: 240 };
      }).arriba.some((j) => j.casillaId === 'POR');
    expect(final(0, 1, 45 * 60 + 200)).toBe(true);
    expect(final(0, 1, 45 * 60 + 100)).toBe(false);
    expect(final(0, 1, 44 * 60)).toBe(false);
    expect(final(0, 0, 45 * 60 + 200)).toBe(false);
    expect(final(0, 2, 45 * 60 + 200)).toBe(false);
    expect(final(0, 1, 45 * 60 + 200, 1)).toBe(false);
    expect(final(1, 2, 15 * 60 + 200, 4)).toBe(true);
  });

  it('con el portero lejos de su portería, se tira a puerta vacía', () => {
    const e = partido('vacia015', V8);
    const arquero = titularEn(e, 'visitante', 'POR');
    situar(e, arquero.id, { x: 500, y: 3200 });
    expect(porteroBajoPalos(e, e.equipos.visitante)?.id).toBe(arquero.id);
    situar(e, arquero.id, { x: 9000, y: 3200 });
    expect(porteroBajoPalos(e, e.equipos.visitante)).toBeUndefined();
    const v7 = partido('vacia015');
    const a7 = titularEn(v7, 'visitante', 'POR');
    situar(v7, a7.id, { x: 9000, y: 3200 });
    expect(porteroBajoPalos(v7, v7.equipos.visitante)?.id).toBe(a7.id);
  });

  it('con la 7.0.0 suben cinco, como siempre', () => {
    expect(corner({}).arriba).toHaveLength(5);
  });
});

describe('segunda línea (FR-029, R14)', () => {
  it('el mano a mano empieza ya unos metros dentro del campo propio', () => {
    const escena = (parametros: typeof V8 | Record<string, never>) => {
      const e = partido('segunda015', parametros);
      const portador = titularEn(e, 'local', 'DCI');
      const portero = titularEn(e, 'visitante', 'POR');
      const en = {
        yo: { x: 5000 - Math.round(5 * M), y: 3200 },
        rivales: [{ j: portero, p: { x: 9900, y: 3200 } }],
        companeros: [],
        rivalEncima: false,
        espacio: 2381,
        enArea: 0,
        cercaRemate: 0,
      } satisfies Entorno;
      return esManoAMano(e, e.equipos.local, portador, en);
    };
    expect(escena(V8)).toBe(true);
    expect(escena({})).toBe(false);
  });

  it('con el balón en el último tercio, el medio centro llega a la frontal', () => {
    const xMedio = (parametros: typeof V8 | Record<string, never>) => {
      const e = partido('llegada015', parametros);
      const medio = titularEn(e, 'local', 'MC-1');
      e.balon = { ...e.balon, posesion: 'local' };
      e.espacio.referencia = { x: 8500, y: 3200, tick: e.tick };
      return calcularObjetivos(e)[medio.id]!.x;
    };
    expect(xMedio(V8)).toBeGreaterThan(xMedio({}) + 500);
  });
});
