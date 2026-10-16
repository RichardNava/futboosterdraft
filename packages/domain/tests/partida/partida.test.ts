import { describe, expect, it } from 'vitest';
import {
  configPorDefecto,
  debeAbandonarsePorDesconexion,
  rellenarConNPC,
  sortearAsientos,
  transicion,
  validarConfigPartida,
  type ConfigPartida,
} from '../../src/partida/partida';
import { semillaDesdeTexto } from '../../src/rng/xoshiro';

const conf = (cambios: Partial<ConfigPartida>): ConfigPartida => ({ ...configPorDefecto(), ...cambios });
const codigos = (c: ConfigPartida, anfitrion: 'registrado' | 'invitado' = 'registrado') =>
  validarConfigPartida(c, anfitrion).map((e) => e.codigo);

describe('Partida', () => {
  it('numParticipantes: "Liga 4–8; playoff ∈ {4, 8, 16}; mixto = 8"', () => {
    for (const n of [4, 5, 6, 7, 8]) expect(codigos(conf({ modo: 'liga', numParticipantes: n }))).toEqual([]);
    for (const n of [3, 9]) expect(codigos(conf({ modo: 'liga', numParticipantes: n }))).toContain('NUM_PARTICIPANTES_INVALIDO');
    for (const n of [4, 8, 16]) expect(codigos(conf({ modo: 'playoff', numParticipantes: n }))).toEqual([]);
    for (const n of [5, 6, 12]) expect(codigos(conf({ modo: 'playoff', numParticipantes: n }))).toContain('NUM_PARTICIPANTES_INVALIDO');
    expect(codigos(conf({ modo: 'mixto', numParticipantes: 8 }))).toEqual([]);
    expect(codigos(conf({ modo: 'mixto', numParticipantes: 6 }))).toContain('NUM_PARTICIPANTES_INVALIDO');
  });

  it('valores por defecto: plazo 24 h, tiempos y colecciones Core (FR-015)', () => {
    const c = configPorDefecto();
    expect(c.plazoJornadaHoras).toBe(24);
    expect(c.tiempos).toEqual({ busquedaS: 180, turnoDraftS: 45, preparacionS: 180, preparacionInicialS: 300, descansoS: 120 });
    expect(c.colecciones).toEqual(['Core']);
  });

  it('invitado: solo ritmo directo y sin plazas humanas libres (FR-000)', () => {
    expect(codigos(conf({ ritmo: 'asincrono' }), 'invitado')).toContain('INVITADO_NO_PERMITIDO');
    expect(codigos(conf({ ritmo: 'directo', plazasHumanas: 2 }), 'invitado')).toContain('INVITADO_NO_PERMITIDO');
    expect(codigos(conf({ ritmo: 'directo', plazasHumanas: 1 }), 'invitado')).toEqual([]);
  });

  it('PRO solo lo puede añadir el anfitrión y no supera las plazas', () => {
    expect(codigos(conf({ numParticipantes: 4, npc: [{ nivel: 'PRO' }, { nivel: 'amateur' }] }))).toEqual([]);
    expect(codigos(conf({ numParticipantes: 4, plazasHumanas: 2, npc: [{ nivel: 'PRO' }, { nivel: 'PRO' }, { nivel: 'PRO' }] }))).toContain(
      'DEMASIADOS_NPC',
    );
  });

  it('transiciones permitidas', () => {
    expect(transicion('buscando', 'iniciar_draft')).toBe('en_draft');
    expect(transicion('en_draft', 'terminar_draft')).toBe('en_torneo');
    expect(transicion('en_torneo', 'terminar_torneo')).toBe('terminada');
    expect(transicion('buscando', 'cancelar')).toBe('cancelada');
    expect(transicion('en_draft', 'abandonar_invitado')).toBe('abandonada');
    expect(() => transicion('terminada', 'iniciar_draft')).toThrow();
    expect(() => transicion('en_torneo', 'cancelar')).toThrow();
  });

  it('el relleno automático asigna amateur, intermedio o avanzado al azar, nunca PRO (FR-059)', () => {
    const niveles = rellenarConNPC(10_000, semillaDesdeTexto('relleno'));
    expect(niveles).not.toContain('PRO');
    for (const nivel of ['amateur', 'intermedio', 'avanzado'] as const) {
      const proporcion = niveles.filter((n) => n === nivel).length / niveles.length;
      expect(proporcion).toBeGreaterThan(0.3);
    }
  });

  it('los asientos se sortean con la semilla: misma semilla, mismo orden (FR-005)', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
    const semilla = semillaDesdeTexto('asientos');
    expect(sortearAsientos(ids, semilla)).toEqual(sortearAsientos(ids, semilla));
    expect([...sortearAsientos(ids, semilla)].sort()).toEqual(ids);
    const distintos = new Set(Array.from({ length: 20 }, (_, i) => sortearAsientos(ids, semillaDesdeTexto(`s${i}`)).join()));
    expect(distintos.size).toBeGreaterThan(1);
  });

  it('una partida de invitado se abandona tras 10 min seguidos sin conexión, y no antes', () => {
    const desconectadoDesde = 1_000_000;
    expect(debeAbandonarsePorDesconexion(desconectadoDesde, desconectadoDesde + 9 * 60_000)).toBe(false);
    expect(debeAbandonarsePorDesconexion(desconectadoDesde, desconectadoDesde + 10 * 60_000)).toBe(true);
    expect(debeAbandonarsePorDesconexion(null, desconectadoDesde + 60 * 60_000)).toBe(false);
  });
});
