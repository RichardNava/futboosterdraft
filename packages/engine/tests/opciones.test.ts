/**
 * Elección de acciones con datos espaciales (spec 003, research R4, R5 y R9; FR-016, FR-021; T012): pase largo
 * solo con motivo táctico, conducción proporcional al espacio y factor de stat acotado por la situación.
 */
import { PARAMETROS_V3 } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { factorConduccion, factorPaseLargo, factorStat, motivosPaseLargo, pesosConEspacio, type MotivoPaseLargo } from '../src/acciones/opciones';
import type { EstadoMotor, JugadorEnPartido } from '../src/index';
import { darBalon, partido, situar, soloEnCampo, titularEn } from './ayudas';

const M = 95.24;
const p = PARAMETROS_V3;

interface Escena {
  e: EstadoMotor;
  portador: JugadorEnPartido;
}

/** Escena con el portador y los compañeros y rivales indicados (coordenadas de su equipo). */
function escena(
  semilla: string,
  portadorEn: { x: number; y: number },
  zona: number,
  companeros: { casilla: string; en: { x: number; y: number } }[],
  rivales: { casilla: string; en: { x: number; y: number } }[],
  carril = 1,
): Escena {
  const e = partido(semilla);
  const portador = titularEn(e, 'local', 'MC-1');
  situar(e, portador.id, portadorEn);
  const ids = [portador.id];
  for (const c of companeros) {
    const j = titularEn(e, 'local', c.casilla);
    situar(e, j.id, c.en);
    ids.push(j.id);
  }
  for (const r of rivales) {
    const j = titularEn(e, 'visitante', r.casilla);
    // De coordenadas del local a las del visitante.
    situar(e, j.id, { x: 10000 - r.en.x, y: 6400 - r.en.y });
    ids.push(j.id);
  }
  soloEnCampo(e, ids);
  darBalon(e, 'local', portador, zona, carril);
  return { e, portador };
}

const pesoDe = ({ e, portador }: Escena, accion: string) => {
  const zona = e.balon.zona;
  return pesosConEspacio(e, e.equipos.local, portador, zona, e.balon.carril).find(([a]) => a === accion)?.[1] ?? 0;
};
const motivos = ({ e, portador }: Escena): MotivoPaseLargo['motivo'][] => motivosPaseLargo(e, e.equipos.local, portador).map((m) => m.motivo);

/** Defensa rival bien replegada (a 10 m de su portería): no hay espalda. */
const defensaReplegada = { casilla: 'DCI', en: { x: 9000, y: 3200 } };

describe('pase largo con motivo táctico (research R4)', () => {
  const sinMotivo = escena('sin-motivo', { x: 4200, y: 3200 }, 2, [{ casilla: 'MC-2', en: { x: 4200 + Math.round(10 * M), y: 3200 } }], [defensaReplegada]);
  const sinMotivoZona1 = escena('sin-motivo-1', { x: 2600, y: 3200 }, 1, [{ casilla: 'MC-2', en: { x: 2600 + Math.round(10 * M), y: 3200 } }], [defensaReplegada]);

  it('sin motivo, el peso del pase largo se multiplica por 0,15', () => {
    expect(motivos(sinMotivo)).toEqual([]);
    expect(factorPaseLargo([], p)).toBe(p.pases.factorSinMotivo);
    expect(factorPaseLargo([{ motivo: 'despeje', receptores: [] }], p)).toBe(p.pases.factorConMotivo);
  });

  const casos: [MotivoPaseLargo['motivo'], Escena, Escena][] = [
    [
      'cambio_orientacion',
      escena('cambio', { x: 4200, y: 600 }, 2, [{ casilla: 'ED', en: { x: 4700, y: 5800 } }], [defensaReplegada], 0),
      sinMotivo,
    ],
    [
      'espalda',
      // El último defensor rival a 35 m de su portería y un compañero por delante de él.
      escena('espalda', { x: 4200, y: 3200 }, 2, [{ casilla: 'DC', en: { x: 7000, y: 2800 } }], [{ casilla: 'DCI', en: { x: 6650, y: 3200 } }]),
      sinMotivo,
    ],
    [
      'salida_presion',
      escena(
        'presion',
        { x: 4200, y: 3200 },
        2,
        [{ casilla: 'DC', en: { x: 4200 + Math.round(30 * M), y: 3200 } }],
        [{ casilla: 'DC', en: { x: 4500, y: 3200 } }, defensaReplegada],
      ),
      sinMotivo,
    ],
    [
      'despeje',
      escena('despeje', { x: 2600, y: 3200 }, 1, [{ casilla: 'MC-2', en: { x: 2600 + Math.round(15 * M), y: 3700 } }], [{ casilla: 'DC', en: { x: 2800, y: 3300 } }, defensaReplegada]),
      sinMotivoZona1,
    ],
  ];

  for (const [motivo, con, sin] of casos) {
    it(`${motivo}: el peso es mayor que sin ningún motivo`, () => {
      expect(motivos(con)).toContain(motivo);
      expect(pesoDe(con, 'pase_largo')).toBeGreaterThan(pesoDe(sin, 'pase_largo'));
    });
  }

  it('transicion: el contraataque con espacio es un motivo', () => {
    const con = escena('transicion', { x: 4200, y: 3200 }, 2, [{ casilla: 'MC-2', en: { x: 4200 + Math.round(10 * M), y: 3200 } }], [defensaReplegada]);
    con.e.balon.transicion = true;
    expect(motivos(con)).toContain('transicion');
    expect(pesoDe(con, 'pase_largo')).toBeGreaterThan(pesoDe(sinMotivo, 'pase_largo'));
  });
});

describe('conducción proporcional al espacio (research R5)', () => {
  it('el factor crece de forma monótona con el espacio libre: el mínimo con < 3 m y el máximo con ≥ 15 m', () => {
    let anterior = 0;
    for (let espacio = 0; espacio <= 2500; espacio += 25) {
      const f = factorConduccion(espacio, p);
      expect(f).toBeGreaterThanOrEqual(anterior);
      anterior = f;
    }
    const c = p.decision.conduccion;
    expect(factorConduccion(0, p)).toBe(c.factorMin);
    expect(factorConduccion(284, p)).toBe(c.factorMin);
    expect(factorConduccion(1430, p)).toBe(c.factorMax);
    expect(factorConduccion(2381, p)).toBe(c.factorMax);
  });
});

describe('factor de stat (research R9)', () => {
  it('es monótono, vale 1 en la referencia y queda acotado', () => {
    for (const [nombre, f] of Object.entries(p.decision.factores)) {
      let anterior = 0;
      for (let v = 30; v <= 99; v++) {
        const x = factorStat(v, f);
        expect(x, nombre).toBeGreaterThanOrEqual(anterior);
        expect(x, nombre).toBeGreaterThanOrEqual(Math.round(f.min * 1000));
        expect(x, nombre).toBeLessThanOrEqual(Math.round(f.max * 1000));
        anterior = x;
      }
      expect(factorStat(70, f)).toBe(1000);
    }
    // +15 de regate: 1 + 1,5·k, acotado al máximo.
    const r = p.decision.factores.regate;
    expect(factorStat(85, r)).toBe(Math.round(1000 * Math.min(r.max, 1 + 1.5 * r.k)));
  });

  it('sin rival a ≤ 6 m y con espacio de más de 15 m, el regate no recibe el factor de stat', () => {
    const conRegate = (valor: number) => {
      const s = escena(`regate-${valor}`, { x: 4200, y: 3200 }, 2, [], [defensaReplegada]);
      s.portador.jugador = { ...s.portador.jugador, stats: { ...s.portador.jugador.stats, tecnica: valor } as typeof s.portador.jugador.stats };
      return s;
    };
    expect(pesoDe(conRegate(85), 'regate')).toBe(pesoDe(conRegate(70), 'regate'));
  });

  it('con un rival encima, más regate sí sube el peso del regate', () => {
    const conRegate = (valor: number) => {
      const s = escena(`regate-encima-${valor}`, { x: 4200, y: 3200 }, 2, [], [{ casilla: 'DC', en: { x: 4500, y: 3200 } }, defensaReplegada]);
      s.portador.jugador = { ...s.portador.jugador, stats: { ...s.portador.jugador.stats, tecnica: valor } as typeof s.portador.jugador.stats };
      return s;
    };
    expect(pesoDe(conRegate(85), 'regate')).toBeGreaterThan(pesoDe(conRegate(70), 'regate'));
  });
});
