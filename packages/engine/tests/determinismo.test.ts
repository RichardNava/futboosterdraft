import { describe, expect, it } from 'vitest';
import { aplicarDecision, avanzar, crearPartido, type DecisionRegistrada } from '../src/index';
import { entrada } from './ayudas';

describe('determinismo (FR-040)', () => {
  it('la misma entrada produce exactamente los mismos eventos y marcador (100 semillas)', () => {
    for (let i = 0; i < 100; i++) {
      const e = entrada(`det-${i}`);
      const a = avanzar(crearPartido(e), 'final');
      const b = avanzar(crearPartido(e), 'final');
      expect(b.eventos).toEqual(a.eventos);
      expect(b.marcador).toEqual(a.marcador);
      expect(a.fase).toBe('finalizado');
    }
  });

  it('semillas distintas producen partidos distintos', () => {
    const marcadores = new Set(
      Array.from({ length: 30 }, (_, i) => {
        const r = avanzar(crearPartido(entrada(`dist-${i}`)), 'final');
        return `${r.marcador.local}-${r.marcador.visitante}-${r.eventos.length}`;
      }),
    );
    expect(marcadores.size).toBeGreaterThan(5);
  });

  it("encadenar 'parte' con decisiones da lo mismo que reproducir las decisiones registradas", () => {
    for (let i = 0; i < 20; i++) {
      const e = entrada(`rep-${i}`);
      const local = e.local;
      // Primera parte, decisiones en el descanso y segunda parte.
      const primera = avanzar(crearPartido(e), 'parte');
      expect(primera.fase).toBe('descanso');
      const estado = primera.estado;
      // Jugadores tal como están en el descanso (puede haber habido lesiones con cambio automático).
      const eq = estado.equipos.local;
      const sale = eq.jugadores.find((j) => j.enCampo && j.casillaId !== 'POR')!.id;
      const entra = eq.jugadores.find((j) => !j.enCampo && !j.retirado)!.id;
      expect(aplicarDecision(estado, { participanteId: 'local', tipo: 'sustitucion', datos: { sale, entra } }).ok).toBe(true);
      expect(
        aplicarDecision(estado, {
          participanteId: 'local',
          tipo: 'tactica',
          datos: { tactica: { ...local.tactica, alturaBloque: 'presion_alta' } },
        }).ok,
      ).toBe(true);
      const final = avanzar(estado, 'parte');
      expect(final.fase).toBe('finalizado');
      const registradas: DecisionRegistrada[] = final.estado.decisiones;
      expect(registradas).toHaveLength(2);

      // Reproducción: mismas decisiones en los mismos ticks.
      const replay = crearPartido(e);
      for (const d of registradas) aplicarDecision(replay, d);
      const r = avanzar(replay, 'final');
      expect(r.estado.eventos).toEqual(final.estado.eventos);
      expect(r.marcador).toEqual(final.marcador);
    }
  });

  it('avanzar no modifica el estado de entrada', () => {
    const estado = crearPartido(entrada('inmutable'));
    const copia = structuredClone(estado);
    avanzar(estado, 'final');
    expect(estado).toEqual(copia);
  });
});
