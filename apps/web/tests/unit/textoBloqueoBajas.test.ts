/** Texto del botón bloqueado por bajas y de los avisos del equipo (spec 012, T060; FR-027, FR-029). */
import { describe, expect, it } from 'vitest';
import { textoAvisoEquipo, textoBloqueoBajas } from '../../src/componentes/textoBloqueoBajas';
import { textoParada } from '../../src/componentes/textoParada';

const nombres: Record<number, string> = { 1: 'Pérez', 2: 'García', 3: 'López' };
const nombre = (id: number) => nombres[id] ?? String(id);

describe('textoBloqueoBajas', () => {
  it('sin bajas, ni motivo ni nota', () => {
    expect(textoBloqueoBajas([], nombre, { sinSuplentes: false })).toEqual({ motivoDesactivado: null, nota: null });
  });

  it('una baja: «Sustituye a Pérez (lesionado) para continuar»', () => {
    expect(textoBloqueoBajas([{ jugadorId: 1, motivo: 'lesion' }], nombre, { sinSuplentes: false }).motivoDesactivado).toBe(
      'Sustituye a Pérez (lesionado) para continuar',
    );
  });

  it('varias: «… y N más …»; una sanción dice «sancionado»', () => {
    const r = textoBloqueoBajas(
      [
        { jugadorId: 2, motivo: 'sancion' },
        { jugadorId: 1, motivo: 'lesion' },
        { jugadorId: 3, motivo: 'lesion' },
      ],
      nombre,
      { sinSuplentes: false },
    );
    expect(r.motivoDesactivado).toBe('Sustituye a García (sancionado) y 2 más para continuar');
  });

  it('sin suplentes no bloquea y avisa de con cuántos se jugará', () => {
    expect(textoBloqueoBajas([{ jugadorId: 1, motivo: 'lesion' }], nombre, { sinSuplentes: true, jugaras: 10 })).toEqual({
      motivoDesactivado: null,
      nota: 'No tienes con quién sustituir a los jugadores de baja: jugarás con 10.',
    });
  });
});

describe('textoAvisoEquipo', () => {
  it('cada tipo con su texto', () => {
    expect(textoAvisoEquipo({ nivel: 'intervencion', tipo: 'baja_pendiente', jugadorId: 1, motivo: 'lesion', partidosRestantes: 2, enlace: 'formacion' }, nombre)).toBe(
      'Pérez está lesionado (2 partidos) y sigue en tu alineación: sustitúyelo en Formación.',
    );
    expect(textoAvisoEquipo({ nivel: 'informativo', tipo: 'sancionado', jugadorId: 2, partidosRestantes: 1 }, nombre)).toBe('García está sancionado (1 partido).');
    expect(textoAvisoEquipo({ nivel: 'informativo', tipo: 'disponible', jugadorId: 3 }, nombre)).toBe('López vuelve a estar disponible.');
  });
});

describe('textoParada (spec 012, FR-022)', () => {
  it('lesión con cambios, sin cambios y varias incidencias', () => {
    expect(textoParada([{ jugadorId: 1, motivo: 'lesion', minuto: "34'", tick: 1 }], nombre, 2)).toBe("Lesión de Pérez (34'). Te quedan 2 cambios.");
    expect(textoParada([{ jugadorId: 1, motivo: 'lesion', minuto: "34'", tick: 1 }], nombre, 0)).toBe("Lesión de Pérez (34'). No te quedan cambios.");
    expect(
      textoParada(
        [
          { jugadorId: 1, motivo: 'lesion', minuto: "34'", tick: 1 },
          { jugadorId: 2, motivo: 'expulsion', minuto: "34'", tick: 1 },
        ],
        nombre,
        1,
      ),
    ).toBe("Lesión de Pérez (34') y expulsión de García (34'). Te queda 1 cambio.");
  });
});
