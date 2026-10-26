/**
 * Reductor del campo único de «Formación» (spec 003, research R14; T038).
 */
import { autoAlineacion, calcularMedia, CLAVES_STATS, FORMACIONES, PARAMETROS_V3, type Demarcacion, type Jugador, type Posicion } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { cambiarFormacion, colocacionDe, RADIO_FICHA, soltar, type EstadoCampo, type OpcionesSoltar } from '../../src/componentes/campoEquipoEstado';

const DEM: Record<string, Demarcacion> = { POR: 'POR', LI: 'DEF', LD: 'DEF', DCI: 'DEF', DCD: 'DEF', MC: 'MED', EI: 'DEL', ED: 'DEL', DC: 'DEL', SD: 'DEL', MCO: 'MED' };
let siguiente = 1;
function jugador(posicion: Posicion): Jugador {
  const demarcacion = DEM[posicion]!;
  const stats = Object.fromEntries(CLAVES_STATS[demarcacion].map((c) => [c, 75])) as unknown as Jugador['stats'];
  return {
    id: siguiente++,
    nombre: 'J',
    apellidos: posicion,
    nacionalidad: 'ESP',
    fecha_nacimiento: '1995-01-01',
    altura: 180,
    demarcacion,
    posicion: [posicion],
    historia: '',
    stats,
    media: calcularMedia({ demarcacion, stats }),
    virtudes: [],
    defectos: [],
    nivel: 'Superclase',
    nombre_carta: 'Prueba',
    imagen: '/cartas/siluetas/med.svg',
    imagen_bg: '/cartas/fondos/med.svg',
  };
}
const plantilla = (['POR', 'LD', 'DCD', 'DCI', 'LI', 'ED', 'MC', 'MC', 'EI', 'DC', 'SD', 'POR', 'DCI', 'MC', 'DC', 'EI', 'MCO', 'LD'] as Posicion[]).map(jugador);
const p = PARAMETROS_V3;
const o: OpcionesSoltar = { parametros: p, radioFicha: RADIO_FICHA, posicionesDe: (id) => plantilla.find((j) => j.id === id)!.posicion };

function inicial(): EstadoCampo {
  const a = autoAlineacion(plantilla, new Set(), p, { formaciones: ['4-4-2'] });
  return { formacion: '4-4-2', asignacion: Object.fromEntries(a.titulares.map((t) => [t.casillaId, t.jugadorId])), puntos: {}, banquillo: a.suplentes.slice(0, 7) };
}
const posicionDe = (e: EstadoCampo, id: number) => colocacionDe(e, p, o.posicionesDe).titulares.find((t) => t.jugadorId === id)!;
const casilla = (e: EstadoCampo, id: number) => Object.entries(e.asignacion).find(([, j]) => j === id)?.[0];

describe('soltar en el campo (T038)', () => {
  it('un titular en una zona libre se recoloca', () => {
    const e = inicial();
    const dc = e.asignacion.DC!;
    const r = soltar(e, dc, { tipo: 'campo', punto: { x: 900, y: 100 } }, o);
    expect(r.puntos[dc]).toEqual({ x: 900, y: 100 });
    expect(casilla(r, dc)).toBe('DC');
  });

  it('sobre otro titular intercambian casillas y puntos', () => {
    let e = inicial();
    const dc = e.asignacion.DC!;
    const ld = e.asignacion.LD!;
    e = soltar(e, dc, { tipo: 'campo', punto: { x: 900, y: 120 } }, o);
    const destino = posicionDe(e, ld);
    const r = soltar(e, dc, { tipo: 'campo', punto: { x: destino.x + 5, y: destino.y } }, o);
    expect(casilla(r, dc)).toBe('LD');
    expect(casilla(r, ld)).toBe('DC');
    expect(r.puntos[ld]).toEqual({ x: 900, y: 120 });
    expect(r.puntos[dc]).toBeUndefined();
  });

  it('un suplente sobre un titular hace el intercambio con el banquillo', () => {
    const e = inicial();
    const suplente = e.banquillo[0]!;
    const sale = e.asignacion['MC-1']!;
    const punto = posicionDe(e, sale);
    const r = soltar(e, suplente, { tipo: 'campo', punto: { x: punto.x, y: punto.y } }, o);
    expect(casilla(r, suplente)).toBe('MC-1');
    expect(r.banquillo[0]).toBe(sale);
    expect(casilla(r, sale)).toBeUndefined();
  });

  it('soltar fuera del campo y del banquillo no cambia nada', () => {
    const e = inicial();
    expect(soltar(e, e.asignacion.DC!, { tipo: 'fuera' }, o)).toBe(e);
  });

  it('a menos del radio de una ficha cuenta como "encima"', () => {
    const e = inicial();
    const dc = e.asignacion.DC!;
    const sd = e.asignacion.SD!;
    const q = posicionDe(e, sd);
    const r = soltar(e, dc, { tipo: 'campo', punto: { x: q.x + RADIO_FICHA - 2, y: q.y } }, o);
    expect(casilla(r, dc)).toBe('SD');
  });

  it('muy cerca (fuera del radio) ocupa el punto libre más cercano a ≥ separacionMinima', () => {
    const e = inicial();
    const dc = e.asignacion.DC!;
    const ld = e.asignacion.LD!;
    const q = posicionDe(e, ld);
    const r = soltar(e, dc, { tipo: 'campo', punto: { x: q.x + RADIO_FICHA + 1, y: q.y } }, o);
    const nuevo = r.puntos[dc]!;
    expect(casilla(r, dc)).toBe('DC');
    for (const t of colocacionDe(r, p, o.posicionesDe).titulares) {
      if (t.jugadorId === dc) continue;
      expect(Math.hypot(t.x - nuevo.x, t.y - nuevo.y)).toBeGreaterThanOrEqual(p.colocacion.separacionMinima - 1e-9);
    }
  });
});

describe('cambio de formación (FR-002a)', () => {
  it('sin recolocaciones se aplica sin confirmación', () => {
    const r = cambiarFormacion(inicial(), '4-3-3', plantilla, p);
    expect(r.requiereConfirmacion).toBe(false);
    expect(r.estado.formacion).toBe('4-3-3');
    expect(Object.values(r.estado.asignacion).filter((x) => x !== undefined)).toHaveLength(11);
  });

  it('con recolocaciones pide confirmación y, al aceptar, vacía los puntos y conserva a los 11 titulares', () => {
    let e = inicial();
    const titulares = new Set(Object.values(e.asignacion));
    e = soltar(e, e.asignacion.DC!, { tipo: 'campo', punto: { x: 880, y: 300 } }, o);
    const r = cambiarFormacion(e, '4-3-3', plantilla, p);
    expect(r.requiereConfirmacion).toBe(true);
    expect(r.estado.puntos).toEqual({});
    expect(new Set(Object.values(r.estado.asignacion))).toEqual(titulares);
    expect(Object.keys(r.estado.asignacion).sort()).toEqual(FORMACIONES['4-3-3'].casillas.map((c) => c.id).sort());
  });
});

describe('banquillo y resto de la plantilla (hallazgo H4)', () => {
  const resto = jugador('MC');
  const conHueco = (): EstadoCampo => {
    const e = inicial();
    return { ...e, banquillo: e.banquillo.slice(0, 6) };
  };

  it('un jugador del resto entra en un hueco del banquillo', () => {
    const e = conHueco();
    const r = soltar(e, resto.id, { tipo: 'banquillo' }, o);
    expect(r.banquillo).toEqual([...e.banquillo, resto.id]);
  });

  it('con el banquillo lleno, el del resto soltado sobre un suplente se intercambia con él', () => {
    const e = inicial();
    const sale = e.banquillo[2]!;
    expect(soltar(e, resto.id, { tipo: 'banquillo' }, o)).toBe(e);
    const r = soltar(e, resto.id, { tipo: 'banquillo', sobre: sale }, o);
    expect(r.banquillo[2]).toBe(resto.id);
    expect(r.banquillo).not.toContain(sale);
  });

  it('un suplente vuelve al resto de la plantilla; sobre un jugador del resto, este ocupa su sitio', () => {
    const e = inicial();
    const suplente = e.banquillo[0]!;
    expect(soltar(e, suplente, { tipo: 'reserva' }, o).banquillo).not.toContain(suplente);
    const r = soltar(e, suplente, { tipo: 'reserva', sobre: resto.id }, o);
    expect(r.banquillo[0]).toBe(resto.id);
    expect(r.banquillo).not.toContain(suplente);
  });

  it('un titular soltado sobre un suplente se intercambia con él aunque el banquillo esté lleno', () => {
    const e = inicial();
    const titular = e.asignacion.DC1 ?? Object.values(e.asignacion).find((x) => x !== undefined)!;
    const cas = casilla(e, titular)!;
    const suplente = e.banquillo[1]!;
    const r = soltar(e, titular, { tipo: 'banquillo', sobre: suplente }, o);
    expect(r.asignacion[cas]).toBe(suplente);
    expect(r.banquillo[1]).toBe(titular);
  });

  it('un jugador no disponible no entra al banquillo', () => {
    const e = conHueco();
    expect(soltar(e, resto.id, { tipo: 'banquillo' }, { ...o, bloqueados: new Set([resto.id]) })).toBe(e);
  });
});
