/** Rendimiento de la resolución de un cruce de duelos (spec 005, T103; plan: menos de 5 ms en el servidor). */
import { describe, expect, it } from 'vitest';
import { casillasEnOrden, PARAMETROS_V4, resolverCruce, semillaDesdeTexto, type Jugador, type OnceDuelos } from '../../src/index';
import { jugador } from '../equipo/ayudas';

function once(pid: string): OnceDuelos {
  const titulares: Record<string, Jugador> = {};
  for (const c of casillasEnOrden('4-3-3')) {
    const pos = c.posicionesAdmitidas[0]!;
    const dem = pos === 'POR' ? 'POR' : ['LI', 'LD', 'DCI', 'DCD'].includes(pos) ? 'DEF' : ['MD', 'MC', 'MII', 'MID', 'MCO'].includes(pos) ? 'MED' : 'DEL';
    titulares[c.id] = { ...jugador(dem, [pos], 82, []), defectos: ['Chupon'] };
  }
  return { participanteId: pid, titulares };
}

describe('rendimiento de resolverCruce', () => {
  it('resuelve un cruce en menos de 5 ms (media de 200)', () => {
    const [a, b] = [once('a'), once('b')];
    resolverCruce(a, b, { formacion: '4-3-3', estadoForma: true }, semillaDesdeTexto('calentamiento'), PARAMETROS_V4);
    const inicio = performance.now();
    for (let i = 0; i < 200; i++) resolverCruce(a, b, { formacion: '4-3-3', estadoForma: true }, semillaDesdeTexto(`r-${i}`), PARAMETROS_V4);
    expect((performance.now() - inicio) / 200).toBeLessThan(5);
  });
});
