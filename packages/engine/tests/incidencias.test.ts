/**
 * Incidencias y «control total» (spec 012, T038; contracts/motor.md, invariantes I1 a I5; research R2).
 *
 * Con lesiones más probables que en un partido normal para que aparezcan en pocas semillas.
 */
import { PARAMETROS_V7 } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { aplicarDecision, avanzar, crearPartido, validarDecision, type DecisionRegistrada, type EstadoMotor, type Incidencia, type ResultadoTramo } from '../src/index';
import { entrada } from './ayudas';

const PARAMETROS = { ...PARAMETROS_V7, lesiones: { ...PARAMETROS_V7.lesiones, probabilidadPorEntrada: 0.04 } };
const conLesiones = (semilla: string) => entrada(semilla, { parametros: PARAMETROS });
const SEMILLAS = Array.from({ length: 16 }, (_, i) => `incidencias-${i}`);

interface Jugado {
  final: ResultadoTramo;
  eventos: ResultadoTramo['eventos'];
  cortes: { incidencias: Incidencia[]; estado: EstadoMotor }[];
}

/** Encadena tramos en el modo dado hasta el final; en cada corte, `decidir` puede encolar decisiones. */
function jugar(estado: EstadoMotor, modo: 'parte' | 'interrupcion', decidir?: (e: EstadoMotor, incidencias: Incidencia[]) => void): Jugado {
  let actual = estado;
  const eventos: ResultadoTramo['eventos'] = [];
  const cortes: Jugado['cortes'] = [];
  for (let i = 0; i < 5000; i++) {
    const r = avanzar(actual, modo);
    eventos.push(...r.eventos);
    actual = r.estado;
    if (r.incidencias) {
      cortes.push({ incidencias: r.incidencias, estado: structuredClone(r.estado) });
      decidir?.(actual, r.incidencias);
    }
    if (r.fase === 'finalizado') return { final: r, eventos, cortes };
  }
  throw new Error('El partido no terminó');
}

const controlTotal = (e: EstadoMotor, lado: 'local' | 'visitante' = 'local') => {
  e.equipos[lado].controlTotal = true;
  return e;
};

describe('incidencias y control total (spec 012)', () => {
  it('I1: control total con paradas y sin decisiones ≡ automático (eventos, marcador y estadísticas)', () => {
    let paradas = 0;
    for (const s of SEMILLAS) {
      const e = conLesiones(s);
      for (const modo of ['parte', 'interrupcion'] as const) {
        const automatico = jugar(crearPartido(e), modo);
        const control = jugar(controlTotal(crearPartido(e)), modo);
        paradas += control.cortes.length;
        expect(automatico.cortes).toHaveLength(0);
        expect(control.eventos, `${s} ${modo}`).toEqual(automatico.eventos);
        expect(control.final.marcador).toEqual(automatico.final.marcador);
        expect(control.final.estadisticas).toEqual(automatico.final.estadisticas);
        // I5: en la parada no se consume PRNG; si no, el resto del partido sería otro.
        expect(control.final.estado.rng).toEqual(automatico.final.estado.rng);
      }
    }
    expect(paradas).toBeGreaterThan(0);
  });

  it('I3: solo paran los lances del equipo con control total; todas las incidencias de un paso, una sola parada', () => {
    for (const s of SEMILLAS) {
      const control = jugar(controlTotal(crearPartido(conLesiones(s))), 'parte');
      for (const c of control.cortes) {
        expect(c.incidencias.some((i) => i.lado === 'local')).toBe(true);
        expect(new Set(c.incidencias.map((i) => i.tick)).size).toBe(1);
        expect(c.incidencias.every((i) => i.estado === 'pendiente')).toBe(true);
      }
    }
  });

  it('I4: sin parada en el modo final (ni, por tanto, en la tanda o tras el final)', () => {
    for (const s of SEMILLAS.slice(0, 6)) {
      const r = avanzar(controlTotal(crearPartido(conLesiones(s))), 'final');
      expect(r.fase).toBe('finalizado');
      expect(r.incidencias).toBeUndefined();
      expect(r.estado.incidencias.every((i) => i.estado !== 'pendiente')).toBe(true);
    }
  });

  it('I2: con una sustitución del lesionado en la parada ≡ reproducir el partido con esa decisión', () => {
    let probadas = 0;
    for (const s of SEMILLAS) {
      const entradaPartido = conLesiones(s);
      const control = jugar(controlTotal(crearPartido(entradaPartido)), 'parte', (e, incidencias) => {
        const lesion = incidencias.find((i) => i.lado === 'local' && i.motivo === 'lesion');
        const eq = e.equipos.local;
        const entra = eq.jugadores.filter((j) => !j.enCampo && !j.retirado).sort((a, b) => a.jugador.media - b.jugador.media)[0];
        if (!lesion || !entra) return;
        // El que entra ocupa la casilla del lesionado; gasta un cambio.
        expect(aplicarDecision(e, { participanteId: eq.participanteId, tipo: 'sustitucion', datos: { sale: lesion.jugadorId, entra: entra.id } }).ok).toBe(true);
      });
      const tomadas = control.final.estado.decisiones.filter((d) => d.enIncidencia);
      if (tomadas.length === 0) continue;
      probadas++;
      // La sustitución ocupó la casilla del lesionado.
      for (const d of tomadas) {
        if (d.tipo !== 'sustitucion') continue;
        const inc = control.final.estado.incidencias.find((i) => i.jugadorId === d.datos.sale)!;
        expect(inc.estado).toBe('resuelta_participante');
      }

      // Reproducción: partido nuevo (sin control total) con las decisiones registradas y su `aplicadaEnTick`.
      const repro = crearPartido(entradaPartido);
      for (const d of control.final.estado.decisiones as DecisionRegistrada[]) aplicarDecision(repro, d);
      const reproducido = jugar(repro, 'parte');
      expect(reproducido.eventos).toEqual(control.eventos);
      expect(reproducido.final.marcador).toEqual(control.final.marcador);
    }
    expect(probadas).toBeGreaterThan(0);
  });

  it('el lesionado de una incidencia se puede sustituir; el expulsado no', () => {
    for (const s of SEMILLAS) {
      const control = jugar(controlTotal(crearPartido(conLesiones(s))), 'parte');
      for (const c of control.cortes) {
        const eq = c.estado.equipos.local;
        const entra = eq.jugadores.find((j) => !j.enCampo && !j.retirado);
        if (!entra) continue;
        for (const i of c.incidencias.filter((x) => x.lado === 'local')) {
          const r = validarDecision(c.estado, { participanteId: eq.participanteId, tipo: 'sustitucion', datos: { sale: i.jugadorId, entra: entra.id } });
          if (i.motivo === 'lesion') expect(r.ok).toBe(true);
          else expect(r).toMatchObject({ ok: false, codigo: 'JUGADOR_NO_EN_CAMPO' });
        }
      }
    }
  });
});
