/**
 * Colocación libre en el motor (FR-034; research R13; T117).
 */
import { FORMACIONES } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { aplicarDecision, avanzar, crearPartido, type EquipoPartido, type EstadoMotor } from '../src/index';
import { lineaDe } from '../src/espacio/geometria';
import { atributo } from '../src/modificadores/atributos';
import { entrada, equipo } from './ayudas';

/** 4-4-2 con el MC-1 adelantado a la zona de delanteros. */
function conMCArriba(): EquipoPartido {
  const e = equipo('local');
  return { ...e, titulares: e.titulares.map((t) => (t.casillaId === 'MC-1' ? { ...t, ancla: { x: 770, y: 300 } } : t)) };
}

const mc = (e: EstadoMotor) => e.equipos.local.jugadores.find((j) => j.casillaId === 'MC-1')!;

describe('colocación libre en el motor (T117)', () => {
  it('con ancla, el jugador juega desde ese punto y con la posición efectiva de su zona', () => {
    const e = crearPartido(entrada('colocacion', { local: conMCArriba() }));
    const j = mc(e);
    expect(j.ancla).toEqual({ x: 770, y: 300 });
    expect(j.posicion).toBe('DC');
    expect(lineaDe(e.equipos.local, j)).toBe('ataque');
    // Un MC en la zona de DC está fuera de posición: sus atributos bajan.
    const normal = crearPartido(entrada('colocacion'));
    expect(atributo(e, e.equipos.local, j, 'pase')).toBeLessThan(atributo(normal, normal.equipos.local, mc(normal), 'pase'));
    // Los demás, en su casilla, sin posición efectiva propia.
    expect(e.equipos.local.jugadores.filter((x) => x.enCampo && x !== j).every((x) => x.posicion === undefined)).toBe(true);
  });

  it('el perfil es el calculado con la colocación; sin moverse, el de la formación', () => {
    const e = crearPartido(entrada('colocacion', { local: conMCArriba() }));
    expect(e.equipos.local.perfil.ofensividad).toBe(FORMACIONES['4-4-2'].perfil.ofensividad + 1);
    expect(e.equipos.visitante.perfil).toEqual(FORMACIONES['4-4-2'].perfil);
  });

  it('una sustitución hereda el ancla (y la posición efectiva) del que sale', () => {
    const e = crearPartido(entrada('colocacion', { local: conMCArriba() }));
    const sale = mc(e);
    const entra = e.equipos.local.jugadores.find((j) => !j.enCampo && j.jugador.demarcacion === 'MED')!;
    expect(aplicarDecision(e, { participanteId: 'local', tipo: 'sustitucion', datos: { sale: sale.id, entra: entra.id } }).ok).toBe(true);
    const r = avanzar(e, 'interrupcion').estado;
    const nuevo = r.equipos.local.jugadores.find((j) => j.id === entra.id)!;
    expect(nuevo.enCampo).toBe(true);
    expect(nuevo.ancla).toEqual({ x: 770, y: 300 });
    expect(nuevo.posicion).toBe('DC');
  });

  it('cambiar de formación restablece las anclas salvo que traiga colocación; recolocacion admite colocación', () => {
    let e = crearPartido(entrada('colocacion', { local: conMCArriba() }));
    expect(aplicarDecision(e, { participanteId: 'local', tipo: 'formacion', datos: { formacion: '4-3-3' } }).ok).toBe(true);
    e = avanzar(e, 'interrupcion').estado;
    const casillas = FORMACIONES['4-3-3'].casillas;
    for (const j of e.equipos.local.jugadores.filter((x) => x.enCampo)) {
      const c = casillas.find((x) => x.id === j.casillaId)!;
      expect(j.ancla).toEqual({ x: c.zona.x, y: c.zona.y });
      expect(j.posicion).toBeUndefined();
    }
    expect(e.equipos.local.perfil).toEqual(FORMACIONES['4-3-3'].perfil);

    // Recolocación con colocación: el MD sube a la zona de MCO.
    const asignacion = e.equipos.local.jugadores.filter((x) => x.enCampo).map((j) => ({ casillaId: j.casillaId!, jugadorId: j.id }));
    const md = e.equipos.local.jugadores.find((j) => j.casillaId === 'MD')!;
    const colocacion = [{ jugadorId: md.id, x: 600, y: 320 }];
    expect(aplicarDecision(e, { participanteId: 'local', tipo: 'recolocacion', datos: { asignacion, colocacion } }).ok).toBe(true);
    e = avanzar(e, 'interrupcion').estado;
    const movido = e.equipos.local.jugadores.find((j) => j.id === md.id)!;
    expect(movido.ancla).toEqual({ x: 600, y: 320 });
    expect(movido.posicion).toBe('MCO');

    // Una colocación con el portero fuera de su zona no se admite.
    const portero = e.equipos.local.jugadores.find((j) => j.casillaId === 'POR')!;
    const mala = aplicarDecision(e, { participanteId: 'local', tipo: 'recolocacion', datos: { asignacion, colocacion: [{ jugadorId: portero.id, x: 500, y: 320 }] } });
    expect(mala.ok).toBe(false);
  });
});
