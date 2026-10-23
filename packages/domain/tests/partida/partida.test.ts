import { describe, expect, it } from 'vitest';
import {
  configPorDefecto,
  debeAbandonarsePorDesconexion,
  humanosActivos,
  rellenarConNPC,
  soloUnHumano,
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
    expect(c.tiempos).toEqual({ busquedaS: 180, turnoDraftS: 45, descansoS: 120 });
    expect(c).not.toHaveProperty('ritmo');
    expect(c.colecciones).toEqual(['Core']);
  });

  it('invitado: sin plazas humanas libres (FR-000)', () => {
    expect(codigos(conf({ plazasHumanas: 2 }), 'invitado')).toContain('INVITADO_NO_PERMITIDO');
    expect(codigos(conf({ plazasHumanas: 1 }), 'invitado')).toEqual([]);
  });

  it('ritmo deducido: sin plazos con un solo humano activo, contando los abandonos (research R9, T008)', () => {
    const h = (controladoPorNPC = false) => ({ tipo: 'humano' as const, controladoPorNPC });
    const npc = { tipo: 'npc' as const, controladoPorNPC: false };
    expect(humanosActivos([h(), h(), npc])).toBe(2);
    expect(soloUnHumano([h(), npc, npc])).toBe(true);
    expect(soloUnHumano([h(), h(), npc])).toBe(false);
    // Un humano que abandona pasa a estar controlado por un NPC y deja de contar.
    expect(soloUnHumano([h(), h(true), npc])).toBe(true);
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

  it('la dificultad por defecto es «Normal» y una desconocida no es válida (003/FR-038a)', () => {
    expect(configPorDefecto().dificultad).toBe('normal');
    expect(codigos(conf({ dificultad: 'imposible' as never }))).toContain('CONFIG_INVALIDA');
  });

  it('«Normal» reparte el relleno igual que antes de la dificultad (001/FR-059)', () => {
    const semilla = semillaDesdeTexto('relleno-normal');
    expect(rellenarConNPC(7, semilla, 'normal')).toEqual(rellenarConNPC(7, semilla));
  });

  it.each([
    ['facil', ['amateur', 'intermedio']],
    ['dificil', ['intermedio', 'avanzado']],
  ] as const)('«%s» reparte el relleno a partes iguales entre %j, nunca PRO (003/FR-038a)', (dificultad, permitidos) => {
    for (let cantidad = 1; cantidad <= 15; cantidad++) {
      for (let s = 0; s < 20; s++) {
        const niveles = rellenarConNPC(cantidad, semillaDesdeTexto(`relleno-${dificultad}-${cantidad}-${s}`), dificultad);
        expect(niveles).toHaveLength(cantidad);
        expect(niveles.every((n) => (permitidos as readonly string[]).includes(n))).toBe(true);
        const [a, b] = permitidos.map((p) => niveles.filter((n) => n === p).length);
        expect(Math.abs(a! - b!)).toBeLessThanOrEqual(1);
      }
    }
  });

  it('con un número impar de NPC, el nivel sobrante se sortea con la semilla (003/FR-038a)', () => {
    const sobrantes = new Set<string>();
    for (let s = 0; s < 50; s++) {
      const niveles = rellenarConNPC(3, semillaDesdeTexto(`impar-${s}`), 'dificil');
      sobrantes.add(niveles.filter((n) => n === 'avanzado').length === 2 ? 'avanzado' : 'intermedio');
      expect(rellenarConNPC(3, semillaDesdeTexto(`impar-${s}`), 'dificil')).toEqual(niveles);
    }
    expect(sobrantes).toEqual(new Set(['avanzado', 'intermedio']));
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

describe('modo Duelo de jugadores (spec 005, T059)', () => {
  it('solo admite 4, 8 o 16 participantes', async () => {
    const { numParticipantesValido } = await import('../../src/index');
    for (const n of [4, 8, 16]) expect(numParticipantesValido('duelos', n)).toBe(true);
    for (const n of [2, 5, 6, 7, 12, 32]) expect(numParticipantesValido('duelos', n)).toBe(false);
  });

  it('la configuración por defecto es 4-3-3 con Estado de forma, y se valida', async () => {
    const { CONFIG_DUELOS_POR_DEFECTO, configDuelosValida, configPorDefecto, validarConfigPartida } = await import('../../src/index');
    expect(CONFIG_DUELOS_POR_DEFECTO).toEqual({ formacion: '4-3-3', estadoForma: true });
    expect(configDuelosValida({ formacion: '4-4-2', estadoForma: false })).toBe(true);
    expect(configDuelosValida({ formacion: '9-9-9', estadoForma: true })).toBe(false);
    const base = { ...configPorDefecto(), modo: 'duelos' as const, numParticipantes: 8 };
    expect(validarConfigPartida({ ...base, duelos: { formacion: '4-3-3', estadoForma: true } }, 'registrado')).toEqual([]);
    expect(validarConfigPartida({ ...base, duelos: { formacion: 'x' as never, estadoForma: true } }, 'registrado').map((e) => e.codigo)).toContain('CONFIG_INVALIDA');
    // La configuración de duelos solo tiene sentido en el modo duelos.
    expect(validarConfigPartida({ ...base, modo: 'liga', duelos: { formacion: '4-3-3', estadoForma: true } }, 'registrado').map((e) => e.codigo)).toContain('CONFIG_INVALIDA');
  });
});
