/**
 * Lote atómico de decisiones (spec 003, research R17; FR-030; T062).
 */
import { calcularMedia, CLAVES_STATS, FORMACIONES, PARAMETROS_V3, proponerLanzadores, semillaDesdeTexto, tacticaPorDefecto, type Demarcacion, type Jugador, type Posicion } from '@fbd/domain';
import { aplicarDecision, avanzar, crearPartido, type DecisionPartido, type EquipoPartido, type EstadoMotor } from '@fbd/engine';
import { describe, expect, it } from 'vitest';
import { aplicarLote, type DecisionLote } from '../../src/actores/loteDecisiones';

const DEM: Record<string, Demarcacion> = { POR: 'POR', LD: 'DEF', DCD: 'DEF', DCI: 'DEF', LI: 'DEF', ED: 'DEL', MC: 'MED', EI: 'DEL', DC: 'DEL', SD: 'DEL', MCO: 'MED' };
let siguiente = 1;
function jugador(posicion: Posicion): Jugador {
  const demarcacion = DEM[posicion]!;
  const stats = Object.fromEntries(CLAVES_STATS[demarcacion].map((c) => [c, 78])) as unknown as Jugador['stats'];
  return { id: siguiente++, nombre: 'J', apellidos: posicion, nacionalidad: 'ESP', fecha_nacimiento: '1995-01-01', altura: 180, demarcacion, posicion: [posicion], historia: '', stats, media: calcularMedia({ demarcacion, stats }), virtudes: [], defectos: [], nivel: 'Superclase', coleccion: 'Core' };
}
function equipo(participanteId: string): EquipoPartido {
  const titulares = FORMACIONES['4-4-2'].casillas.map((c) => ({ casillaId: c.id, jugador: jugador(c.id === 'CENTRAL' ? 'DCI' : c.posicionesAdmitidas[0]!) }));
  const suplentes = (['POR', 'DCI', 'LD', 'MC', 'MCO', 'DC', 'EI'] as Posicion[]).map(jugador);
  return { participanteId, formacion: '4-4-2', titulares, suplentes, tactica: tacticaPorDefecto(), lanzadores: proponerLanzadores(titulares.map((t) => t.jugador)) };
}

/** Partido en el descanso. */
function enDescanso(semilla: string): EstadoMotor {
  const p = PARAMETROS_V3;
  const e = crearPartido({ version: p.version, parametros: p, semilla: semillaDesdeTexto(semilla), eliminatoria: false, local: equipo('yo'), visitante: equipo('npc') });
  return avanzar(e, 'parte').estado;
}

function lote(e: EstadoMotor): DecisionLote[] {
  const yo = e.equipos.local;
  const sale = yo.jugadores.find((j) => j.enCampo && j.casillaId === 'DC')!;
  const entra = yo.jugadores.find((j) => !j.enCampo && !j.retirado && j.jugador.demarcacion === 'DEL')!;
  // Formación 4-3-3 con el que entra ya en el campo (depende de la sustitución anterior).
  const enCampo = yo.jugadores.filter((j) => j.enCampo && j.id !== sale.id).map((j) => j.id).concat(entra.id);
  const casillas = FORMACIONES['4-3-3'].casillas.map((c) => c.id);
  const porId = new Map(yo.jugadores.map((j) => [j.id, j]));
  const portero = enCampo.find((id) => porId.get(id)!.jugador.demarcacion === 'POR')!;
  const resto = enCampo.filter((id) => id !== portero);
  const asignacion = [{ casillaId: 'POR', jugadorId: portero }, ...casillas.filter((c) => c !== 'POR').map((casillaId, i) => ({ casillaId, jugadorId: resto[i]! }))];
  return [
    { tipo: 'sustitucion', datos: { sale: sale.id, entra: entra.id } },
    { tipo: 'formacion', datos: { formacion: '4-3-3', asignacion } },
    { tipo: 'tactica', datos: { tactica: { ...tacticaPorDefecto(), alturaBloque: 'presion_alta' } } },
  ];
}

describe('lote de decisiones (T062)', () => {
  it('un lote válido se aplica y da el mismo partido que las mismas decisiones aplicadas una a una en el mismo tick', () => {
    const base = enDescanso('lote');
    const decisiones = lote(base);

    const conLote = structuredClone(base);
    expect(aplicarLote(conLote, 'yo', decisiones)).toEqual({ ok: true });
    const finLote = avanzar(conLote, 'final');

    // Una a una: cada decisión se encola cuando la anterior ya está aplicada (en el mismo tick).
    let unaAUna = structuredClone(base);
    for (const d of decisiones) {
      unaAUna.decisionesPendientes.push({ participanteId: 'yo', ...d, solicitadaEnTick: unaAUna.tick, aplicadaEnTick: unaAUna.tick } as never);
    }
    const finUno = avanzar(unaAUna, 'final');
    unaAUna = finUno.estado;
    expect(finLote.eventos).toEqual(finUno.eventos);
    expect(finLote.marcador).toEqual(finUno.marcador);
    expect(finLote.estado.equipos).toEqual(finUno.estado.equipos);
    expect(finLote.estado.equipos.local.formacion).toBe('4-3-3');
    expect(finLote.estado.equipos.local.tactica.alturaBloque).toBe('presion_alta');
  });

  it('con la tercera decisión inválida no se aplica ninguna y se indica su índice', () => {
    const e = enDescanso('invalida');
    const decisiones = lote(e);
    decisiones[2] = { tipo: 'tactica', datos: { tactica: { ...tacticaPorDefecto(), alturaBloque: 'catenaccio', lineaAdelantada: true } } };
    const antes = structuredClone(e.decisionesPendientes);
    const r = aplicarLote(e, 'yo', decisiones);
    expect(r).toMatchObject({ ok: false, indice: 2 });
    expect(e.decisionesPendientes).toEqual(antes);
  });

  it('una sexta sustitución no se admite', () => {
    const e = enDescanso('sexta');
    const yo = e.equipos.local;
    const enCampo = yo.jugadores.filter((j) => j.enCampo && j.casillaId !== 'POR');
    const banquillo = yo.jugadores.filter((j) => !j.enCampo && !j.retirado);
    const decisiones: DecisionLote[] = banquillo.slice(0, 6).map((entra, i) => ({ tipo: 'sustitucion', datos: { sale: enCampo[i]!.id, entra: entra.id } }));
    const r = aplicarLote(e, 'yo', decisiones);
    expect(r).toMatchObject({ ok: false, indice: 5, codigo: 'SUSTITUCIONES_AGOTADAS' });
  });

  it('un jugador ya sustituido no puede volver a entrar', () => {
    const e = enDescanso('sustituido');
    const yo = e.equipos.local;
    const sale = yo.jugadores.find((j) => j.enCampo && j.casillaId === 'DC')!;
    const entra = yo.jugadores.find((j) => !j.enCampo && !j.retirado)!;
    expect(aplicarDecision(e, { participanteId: 'yo', tipo: 'sustitucion', datos: { sale: sale.id, entra: entra.id } } as DecisionPartido).ok).toBe(true);
    const tras = avanzar(e, 'interrupcion').estado;
    const otro = tras.equipos.local.jugadores.find((j) => j.enCampo && j.casillaId !== 'POR' && j.id !== entra.id)!;
    const r = aplicarLote(tras, 'yo', [{ tipo: 'sustitucion', datos: { sale: otro.id, entra: sale.id } }]);
    expect(r).toMatchObject({ ok: false, indice: 0, codigo: 'JUGADOR_NO_DISPONIBLE' });
  });
});
