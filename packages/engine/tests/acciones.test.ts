/**
 * Acciones visibles, duraciones físicas y estadísticas nuevas (research R4; FR-024, FR-025; T067).
 */
import { describe, expect, it } from 'vitest';
import { avanzar, crearPartido, type AccionVisible, type EstadoMotor } from '../src/index';
import { entrada, equipo } from './ayudas';

const TIPOS = new Set(['pase_corto', 'pase_largo', 'pase_espacio', 'conduccion', 'regate', 'centro', 'tiro', 'despeje', 'saque', 'control']);
/** Décimas de unidad por metro (1 unidad ≈ 0,105 m). */
const DECIMAS_POR_METRO = 1 / 0.0105;
/** Ticks por segundo real a x2 (research R2). */
const K = 23.5;

function jugar(semilla: string, cambios: Parameters<typeof entrada>[1] = {}) {
  let estado: EstadoMotor = crearPartido(entrada(semilla, cambios));
  const acciones: AccionVisible[] = [];
  const posiciones = new Map<number, { x: number; y: number }>();
  const recorrido: { tick: number; x: number; y: number }[] = [];
  const observador = (e: EstadoMotor) => {
    recorrido.push({ tick: e.tick, x: e.espacio.balon.x, y: e.espacio.balon.y });
    for (const [id, p] of Object.entries(e.espacio.jugadores)) posiciones.set(Number(id), p);
  };
  for (let i = 0; i < 10 && estado.fase !== 'finalizado'; i++) {
    const r = avanzar(estado, 'final', { observador });
    acciones.push(...r.acciones);
    estado = r.estado;
  }
  return { estado, acciones, recorrido };
}

describe('acciones visibles y duraciones físicas (T067)', () => {
  const partidos = Array.from({ length: 20 }, (_, i) => jugar(`acciones-${i}`));

  it('cada acción tiene tipo, inicio, fin, autor y éxito, y las acciones no se solapan', () => {
    for (const { acciones } of partidos) {
      expect(acciones.length).toBeGreaterThan(150);
      for (let i = 0; i < acciones.length; i++) {
        const a = acciones[i]!;
        expect(TIPOS.has(a.tipo)).toBe(true);
        expect(a.finTick).toBeGreaterThanOrEqual(a.inicioTick);
        expect(typeof a.exito).toBe('boolean');
        expect(Number.isInteger(a.de)).toBe(true);
        if (i > 0) expect(a.inicioTick).toBeGreaterThanOrEqual(acciones[i - 1]!.finTick);
      }
    }
  });

  it('las duraciones respetan los límites visuales de FR-025 a x2', () => {
    const limites: Partial<Record<AccionVisible['tipo'], { metros: number; maxS: number }>> = {
      pase_largo: { metros: 40, maxS: 1.5 },
      centro: { metros: 30, maxS: 1.3 },
      tiro: { metros: 20, maxS: 0.7 },
      despeje: { metros: 40, maxS: 1.5 },
    };
    for (const { acciones, recorrido } of partidos) {
      const posicion = new Map(recorrido.map((r) => [r.tick, r]));
      for (const a of acciones) {
        const desde = posicion.get(a.inicioTick);
        const hasta = posicion.get(a.finTick);
        if (!desde || !hasta || a.finTick === a.inicioTick) continue;
        const metros = Math.hypot(hasta.x - desde.x, hasta.y - desde.y) / DECIMAS_POR_METRO;
        // El control previo es una acción aparte: la duración de un pase es su vuelo.
        const segundos = (a.finTick - a.inicioTick) / K;
        // Pase raso de unos 25 m: entre 0,5 y 0,9 s.
        if (a.tipo === 'pase_corto' && metros >= 22 && metros <= 28) {
          expect(segundos, `pase de ${metros.toFixed(1)} m`).toBeGreaterThanOrEqual(0.45);
          expect(segundos, `pase de ${metros.toFixed(1)} m`).toBeLessThanOrEqual(0.95);
        }
        const l = limites[a.tipo];
        if (l && metros <= l.metros * 1.05) expect(segundos, `${a.tipo} de ${metros.toFixed(1)} m`).toBeLessThanOrEqual(l.maxS + 0.05);
      }
    }
  });

  it('un jugador con 20 puntos más de velocidad corre al menos un 15 % más rápido', () => {
    const p = crearPartido(entrada('velocidad')).parametros.espacio;
    const v = (stat: number) =>
      p.velocidadJugadorMin + ((Math.min(Math.max(stat, p.statVelocidadMin), p.statVelocidadMax) - p.statVelocidadMin) * (p.velocidadJugadorMax - p.velocidadJugadorMin)) / (p.statVelocidadMax - p.statVelocidadMin);
    for (const stat of [55, 65, 75]) expect(v(stat + 20) / v(stat)).toBeGreaterThanOrEqual(1.15);
    expect(v(99) / DECIMAS_POR_METRO * K).toBeLessThanOrEqual(9.05);
  });

  it('pases, centros y precisión son coherentes con las acciones; las secuencias suman las posesiones', () => {
    for (const { estado, acciones } of partidos) {
      for (const lado of ['local', 'visitante'] as const) {
        const s = estado.estadisticas[lado];
        const ids = new Set(estado.equipos[lado].jugadores.map((j) => j.id));
        const propias = acciones.filter((a) => ids.has(a.de));
        const pases = propias.filter((a) => a.tipo === 'pase_corto' || a.tipo === 'pase_largo' || a.tipo === 'pase_espacio');
        expect(s.pases).toBe(pases.length);
        expect(s.pasesCompletados).toBe(pases.filter((a) => a.exito).length);
        expect(s.centros).toBe(propias.filter((a) => a.tipo === 'centro').length);
        expect(Object.values(s.secuencias).reduce((x, y) => x + y, 0)).toBeGreaterThan(0);
        for (const clave of ['conducciones', 'paredes', 'cambiosOrientacion', 'contraataques'] as const) expect(s[clave]).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('la salida del motor calcula la precisión de pase en porcentaje entero', () => {
    let estado = crearPartido(entrada('precision'));
    let r = avanzar(estado, 'final');
    for (let i = 0; i < 5 && r.fase !== 'finalizado'; i++) r = avanzar(r.estado, 'final');
    estado = r.estado;
    for (const lado of ['local', 'visitante'] as const) {
      const s = r.estadisticas[lado];
      expect(s.precisionPase).toBe(s.pases ? Math.round((100 * s.pasesCompletados) / s.pases) : 0);
    }
  });

  it('al sacar un córner hay al menos 3 rematadores del equipo atacante en el área (FR-022a)', () => {
    let comprobados = 0;
    for (let i = 0; i < 10; i++) {
      let estado = crearPartido(entrada(`balon-parado-${i}`, { local: equipo('local'), visitante: equipo('visitante') }));
      // Rematadores en el área en el último tick del saque de esquina (cuando el balón ya está en el banderín).
      let ultimo: number | null = null;
      const observador = (e: EstadoMotor) => {
        const a = e.espacio.accion;
        if (a?.tipo === 'saque' && a.motivo === 'corner') {
          const atacante = e.equipos[e.balon.posesion];
          ultimo = atacante.jugadores.filter((j) => {
            const p = e.espacio.jugadores[j.id];
            if (!j.enCampo || !p) return false;
            const x = atacante.lado === 'local' ? p.x : 10000 - p.x;
            return x >= 8430 && p.y >= 1390 && p.y <= 5010;
          }).length;
        } else if (ultimo !== null) {
          expect(ultimo).toBeGreaterThanOrEqual(3);
          comprobados++;
          ultimo = null;
        }
      };
      for (let k = 0; k < 10 && estado.fase !== 'finalizado'; k++) estado = avanzar(estado, 'final', { observador }).estado;
    }
    expect(comprobados).toBeGreaterThan(0);
  });
});
