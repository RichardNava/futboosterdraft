import { describe, expect, it } from 'vitest';
import { avanzar, type EstadoMotor } from '../src/index';
import { equipo, partido } from './ayudas';

function tanda(semilla: string, cambios: Parameters<typeof partido>[1] = {}) {
  const e: EstadoMotor = partido(semilla, { eliminatoria: true, ...cambios });
  e.fase = 'penaltis';
  return avanzar(e, 'parte');
}

describe('tanda de penaltis (FR-041, FR-029a)', () => {
  it('5 lanzamientos por equipo (salvo si se decide antes) y muerte súbita; alternos', () => {
    for (let i = 0; i < 40; i++) {
      const r = tanda(`tanda-${i}`);
      expect(r.fase).toBe('finalizado');
      const lanz = r.eventos.filter((e) => e.tipo === 'tanda_lanzamiento');
      const p = r.marcador.penaltis!;
      expect(p.local).not.toBe(p.visitante);
      // Alternan local y visitante.
      lanz.forEach((e, k) => expect(e.equipo).toBe(k % 2 === 0 ? 'local' : 'visitante'));
      const porLado = (lado: string) => lanz.filter((e) => e.equipo === lado).length;
      expect(porLado('local') - porLado('visitante')).toBeGreaterThanOrEqual(0);
      expect(porLado('local') - porLado('visitante')).toBeLessThanOrEqual(1);
      if (porLado('local') > 5) expect(porLado('local')).toBe(porLado('visitante'));
    }
  });

  it('el orden respeta lanzadores.tanda y solo lanzan jugadores en el campo', () => {
    const local = equipo('local');
    const orden = [...local.lanzadores.tanda].reverse();
    local.lanzadores = { ...local.lanzadores, tanda: orden };
    const e = partido('orden', { eliminatoria: true, local });
    // Un designado ya no está en el campo: se salta.
    const fuera = e.equipos.local.jugadores.find((j) => j.id === orden[1])!;
    fuera.enCampo = false;
    fuera.retirado = true;
    e.fase = 'penaltis';
    const r = avanzar(e, 'parte');
    const lanzadoresLocal = r.eventos.filter((x) => x.tipo === 'tanda_lanzamiento' && x.equipo === 'local').map((x) => x.jugadores[0]!.jugadorId);
    expect(lanzadoresLocal[0]).toBe(orden[0]);
    expect(lanzadoresLocal[1]).toBe(orden[2]);
    expect(lanzadoresLocal).not.toContain(fuera.id);
    const enCampo = new Set(r.estado.equipos.local.jugadores.filter((j) => j.enCampo).map((j) => j.id));
    expect(lanzadoresLocal.every((id) => enCampo.has(id))).toBe(true);
  });

  it('Parapenalties y Lanzador de penalties cambian la probabilidad', () => {
    const tasa = (cambios: Parameters<typeof partido>[1]) => {
      let goles = 0;
      let tiros = 0;
      for (let i = 0; i < 150; i++) {
        const r = tanda(`tasa-${i}`, cambios);
        const visitante = r.eventos.filter((e) => e.tipo === 'tanda_lanzamiento' && e.equipo === 'visitante');
        tiros += visitante.length;
        goles += visitante.filter((e) => e.datos.resultado === 'gol').length;
      }
      return goles / tiros;
    };
    const base = tasa({});
    const conParapenalties = tasa({ local: equipo('local', { specialsPortero: ['Parapenalties'] }) });
    const conLanzadores = tasa({ visitante: equipo('visitante', { specials: ['LanzadorPenalties'] }) });
    expect(conParapenalties).toBeLessThan(base);
    expect(conLanzadores).toBeGreaterThan(base);
  });
});
