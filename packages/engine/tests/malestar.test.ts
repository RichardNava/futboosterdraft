/**
 * Aviso de efectos colectivos (spec 005, T041; FR-044): evento `malestar` al activarse y al desactivarse Polémico o
 * Rebelde, sin repetirse mientras el estado no cambia.
 */
import { describe, expect, it } from 'vitest';
import { aplicarDecision, avanzar, crearPartido, type EventoPartido } from '../src/index';
import { entrada, equipo } from './ayudas';
import { P4 } from './ayudasRasgos';

const malestar = (eventos: readonly EventoPartido[]) => eventos.filter((e) => e.tipo === 'malestar');

describe('evento malestar', () => {
  it('un Rebelde convocado activa el malestar al empezar y lo desactiva al entrar', () => {
    const local = equipo('local');
    const rebelde = local.suplentes[3]!;
    local.suplentes[3] = { ...rebelde, defectos: ['Rebelde'] };
    const e = crearPartido(entrada('malestar-rebelde', { version: P4.version, parametros: P4, local }));
    const primera = avanzar(e, 'parte');
    const antes = malestar(primera.estado.eventos);
    expect(antes).toHaveLength(1);
    expect(antes[0]).toMatchObject({ equipo: 'local', datos: { defecto: 'Rebelde', activo: true, jugadorId: rebelde.id } });

    const sale = primera.estado.equipos.local.jugadores.find((j) => j.enCampo && j.casillaId === 'MC-1')!.id;
    expect(aplicarDecision(primera.estado, { participanteId: 'local', tipo: 'sustitucion', datos: { sale, entra: rebelde.id } }).ok).toBe(true);
    const final = avanzar(primera.estado, 'final');
    const despues = malestar(final.estado.eventos);
    expect(despues).toHaveLength(2);
    expect(despues[1]).toMatchObject({ datos: { defecto: 'Rebelde', activo: false, jugadorId: rebelde.id } });
  });

  it('con parámetros 3.0.0 no hay malestar', () => {
    const local = equipo('local');
    local.suplentes[3] = { ...local.suplentes[3]!, defectos: ['Rebelde'] };
    const r = avanzar(crearPartido(entrada('malestar-v3', { local })), 'final');
    expect(malestar(r.eventos)).toHaveLength(0);
  });

  it('un Polémico en el campo avisa cada vez que su equipo pasa a ir perdiendo y cuando deja de ir perdiendo', () => {
    let comprobados = 0;
    for (let i = 0; i < 12 && comprobados < 3; i++) {
      const local = equipo('local');
      local.titulares[6]!.jugador = { ...local.titulares[6]!.jugador, defectos: ['Polemico'] };
      const r = avanzar(crearPartido(entrada(`malestar-polemico-${i}`, { version: P4.version, parametros: P4, local })), 'final');
      const avisos = malestar(r.eventos);
      // Alterna activo / inactivo, sin repetir el mismo estado dos veces seguidas.
      avisos.forEach((a, k) => expect(a.datos.activo).toBe(k % 2 === 0));
      // Cada aviso coincide con un cambio de «ir perdiendo»: tras un gol del rival o uno propio.
      const goles = r.eventos.filter((x) => x.tipo === 'gol');
      for (const a of avisos) expect(goles.some((g) => g.tick <= a.tick && a.tick - g.tick <= 2)).toBe(true);
      if (avisos.length) comprobados++;
    }
    expect(comprobados).toBeGreaterThan(0);
  });
});
