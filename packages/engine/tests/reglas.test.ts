import { PARAMETROS_V3 } from '@fbd/domain';
import { describe, expect, it } from 'vitest';
import { expulsar } from '../src/acciones/plantel';
import type { Contexto } from '../src/acciones/contexto';
import { atributo } from '../src/modificadores/atributos';
import { acumularCansancio } from '../src/modificadores/cansancio';
import { bonusEquipo, santoActivo } from '../src/modificadores/virtudes';
import { aplicarDecision, avanzar, crearPartido, type EstadoMotor } from '../src/index';
import { entrada, equipo, partido, rngDePrueba } from './ayudas';

const ctxDe = (estado: EstadoMotor): Contexto => ({ estado, rng: rngDePrueba('ctx'), interrupcion: false });
const local = (estado: EstadoMotor) => estado.equipos.local;

/** Estado en el descanso de un partido de prueba. */
function enDescanso(semilla = 'reglas', eliminatoria = false) {
  const r = avanzar(partido(semilla, { eliminatoria }), 'parte');
  expect(r.fase).toBe('descanso');
  return r.estado;
}

describe('reglas del motor', () => {
  it('como máximo 5 sustituciones (y una más en la prórroga); un sustituido no vuelve', () => {
    const e = enDescanso();
    const eq = local(e);
    const titulares = eq.jugadores.filter((j) => j.enCampo && j.casillaId !== 'POR');
    const banquillo = eq.jugadores.filter((j) => !j.enCampo && !j.retirado);
    // Si en la primera parte ya hubo un cambio (por una lesión), quedan menos.
    const quedan = 5 - eq.sustitucionesUsadas;
    for (let i = 0; i < quedan; i++) {
      const r = aplicarDecision(e, { participanteId: 'local', tipo: 'sustitucion', datos: { sale: titulares[i]!.id, entra: banquillo[i]!.id } });
      expect(r.ok).toBe(true);
    }
    const sexta = aplicarDecision(e, { participanteId: 'local', tipo: 'sustitucion', datos: { sale: titulares[quedan]!.id, entra: banquillo[quedan]!.id } });
    expect(sexta).toMatchObject({ ok: false, codigo: 'SUSTITUCIONES_AGOTADAS' });

    const tras = avanzar(e, 'interrupcion').estado;
    expect(local(tras).sustitucionesUsadas).toBe(5);
    // El que salió no puede volver a entrar.
    const vuelve = aplicarDecision(tras, { participanteId: 'local', tipo: 'sustitucion', datos: { sale: banquillo[0]!.id, entra: titulares[0]!.id } });
    expect(vuelve.ok).toBe(false);

    // En la prórroga hay una sustitución más (sale uno que siga en el campo: en el tramo jugado puede haber bajas).
    tras.fase = 'pre_prorroga';
    const sale = local(tras).jugadores.find((j) => j.enCampo && j.casillaId !== 'POR')!;
    const entra = local(tras).jugadores.find((j) => !j.enCampo && !j.retirado)!;
    const enProrroga = aplicarDecision(tras, { participanteId: 'local', tipo: 'sustitucion', datos: { sale: sale.id, entra: entra.id } });
    expect(enProrroga.ok).toBe(true);
  });

  it('un expulsado no vuelve al campo', () => {
    const e = enDescanso();
    const eq = local(e);
    const titular = eq.jugadores.find((j) => j.enCampo && j.casillaId === 'DC')!;
    expulsar(ctxDe(e), eq, titular);
    const suplente = eq.jugadores.find((j) => !j.enCampo && !j.retirado)!;
    const r = aplicarDecision(e, { participanteId: 'local', tipo: 'sustitucion', datos: { sale: suplente.id, entra: titular.id } });
    expect(r.ok).toBe(false);
    expect(titular.retirado).toBe(true);
  });

  it('con menos de 7 jugadores el equipo pierde 3-0, o se mantiene un resultado peor para él', () => {
    const e = partido('siete');
    const eq = local(e);
    const ctx = ctxDe(e);
    const campo = eq.jugadores.filter((j) => j.enCampo && j.casillaId !== 'POR');
    for (let i = 0; i < 5; i++) expulsar(ctx, eq, campo[i]!);
    expect(e.fase).toBe('finalizado');
    expect(e.marcador).toEqual({ local: 0, visitante: 3 });
    expect(e.derrotaPorInferioridad).toBe('local');

    const peor = partido('siete-b');
    peor.marcador = { local: 0, visitante: 4 };
    const ctx2 = ctxDe(peor);
    const campo2 = local(peor).jugadores.filter((j) => j.enCampo && j.casillaId !== 'POR');
    for (let i = 0; i < 5; i++) expulsar(ctx2, local(peor), campo2[i]!);
    expect(peor.marcador).toEqual({ local: 0, visitante: 4 });
  });

  it('si expulsan al portero sin cambios, un jugador de campo pasa a la portería con −60 %', () => {
    const e = partido('portero');
    const eq = local(e);
    eq.sustitucionesUsadas = 5;
    const arquero = eq.jugadores.find((j) => j.casillaId === 'POR')!;
    expulsar(ctxDe(e), eq, arquero);
    const relevo = eq.jugadores.find((j) => j.enCampo && j.casillaId === 'POR')!;
    expect(relevo.jugador.demarcacion).not.toBe('POR');
    const enSuSitio = atributo(e, eq, { ...relevo, casillaId: null }, 'parada');
    expect(atributo(e, eq, relevo, 'parada')).toBeLessThan(enSuSitio * 0.5);
  });

  it('si expulsan al portero y quedan cambios, entra el portero suplente', () => {
    const e = partido('portero-2');
    const eq = local(e);
    const arquero = eq.jugadores.find((j) => j.casillaId === 'POR')!;
    expulsar(ctxDe(e), eq, arquero);
    const nuevo = eq.jugadores.find((j) => j.enCampo && j.casillaId === 'POR')!;
    expect(nuevo.jugador.demarcacion).toBe('POR');
    expect(eq.jugadores.filter((j) => j.enCampo)).toHaveLength(10);
  });

  it('el cansancio empieza en el minuto 65, o en el 55 con Presión alta', () => {
    const e = partido('cansancio');
    const normal = local(e);
    const presion = e.equipos.visitante;
    presion.tactica = { ...presion.tactica, alturaBloque: 'presion_alta' };
    e.reloj = { parte: 2, segundosEnParte: 14 * 60, paradas: 0, descuento: null }; // minuto 59
    acumularCansancio(e, normal, 60);
    acumularCansancio(e, presion, 60);
    expect(normal.jugadores.every((j) => j.cansancio === 0)).toBe(true);
    expect(presion.jugadores.filter((j) => j.enCampo).every((j) => j.cansancio > 0)).toBe(true);
    e.reloj.segundosEnParte = 21 * 60; // minuto 66
    acumularCansancio(e, normal, 60);
    expect(normal.jugadores.filter((j) => j.enCampo).every((j) => j.cansancio > 0)).toBe(true);
  });

  it('Incansable y Motivador ralentizan el cansancio', () => {
    const base = crearPartido(entrada('fatiga', { local: equipo('local'), visitante: equipo('visitante', { virtudes: ['Incansable'] }) }));
    base.reloj = { parte: 2, segundosEnParte: 30 * 60, paradas: 0, descuento: null };
    acumularCansancio(base, base.equipos.local, 600);
    acumularCansancio(base, base.equipos.visitante, 600);
    const normal = base.equipos.local.jugadores.find((j) => j.enCampo)!.cansancio;
    const incansable = base.equipos.visitante.jugadores.find((j) => j.enCampo && j.casillaId !== 'POR')!.cansancio;
    expect(incansable).toBeLessThan(normal);

    const conMotivador = crearPartido(entrada('fatiga-2'));
    const eq = conMotivador.equipos.local;
    eq.jugadores.find((j) => j.casillaId === 'MC-1')!.jugador = { ...eq.jugadores.find((j) => j.casillaId === 'MC-1')!.jugador, virtudes: ['Motivador'] };
    conMotivador.reloj = { parte: 2, segundosEnParte: 30 * 60, paradas: 0, descuento: null };
    acumularCansancio(conMotivador, eq, 600);
    const companero = eq.jugadores.find((j) => j.casillaId === 'DC')!.cansancio;
    expect(companero).toBeLessThan(normal);
  });

  it('las virtudes de equipo no se acumulan: dos Capitanía siguen dando +1', () => {
    const e = crearPartido(entrada('capitania', { local: equipo('local', { virtudes: ['Capitania'] }) }));
    const eq = local(e);
    const j = eq.jugadores.find((x) => x.enCampo && x.casillaId === 'DC')!;
    expect(bonusEquipo(e, eq, j)).toBe(PARAMETROS_V3.virtudes.capitania);
  });

  it('Fortaleza mental solo actúa yendo por detrás', () => {
    const e = crearPartido(entrada('fortaleza', { local: equipo('local', { virtudes: ['FortalezaMental'] }) }));
    const eq = local(e);
    const j = eq.jugadores.find((x) => x.enCampo && x.casillaId === 'DC')!;
    expect(bonusEquipo(e, eq, j)).toBe(0);
    e.marcador = { local: 0, visitante: 1 };
    expect(bonusEquipo(e, eq, j)).toBe(PARAMETROS_V3.virtudes.fortalezaMental);
  });

  it('Santo: desde el minuto 80, en la prórroga y en eliminatoria yendo ganando o empatado; en liga antes del 80, no', () => {
    const e = partido('santo');
    const eq = local(e);
    e.reloj = { parte: 2, segundosEnParte: 30 * 60, paradas: 0, descuento: null }; // minuto 75
    expect(santoActivo(e, eq)).toBe(false);
    e.reloj.segundosEnParte = 36 * 60; // minuto 81
    expect(santoActivo(e, eq)).toBe(true);
    e.reloj = { parte: 3, segundosEnParte: 60, paradas: 0, descuento: null };
    expect(santoActivo(e, eq)).toBe(true);
    const elim = partido('santo-2', { eliminatoria: true });
    elim.reloj = { parte: 1, segundosEnParte: 600, paradas: 0, descuento: null };
    expect(santoActivo(elim, local(elim))).toBe(true);
    elim.marcador = { local: 0, visitante: 1 };
    expect(santoActivo(elim, local(elim))).toBe(false);
  });

  it('en liga el empate termina a los 90; en eliminatoria hay prórroga de 2 × 15 y penaltis', () => {
    let ligaEmpatada = false;
    let conPenaltis = false;
    for (let i = 0; i < 60 && !(ligaEmpatada && conPenaltis); i++) {
      const liga = avanzar(partido(`empate-${i}`), 'final');
      if (liga.marcador.local === liga.marcador.visitante) {
        ligaEmpatada = true;
        expect(liga.marcador.penaltis).toBeUndefined();
        expect(liga.estado.reloj.parte).toBe(2);
      }
      const elim = avanzar(partido(`empate-${i}`, { eliminatoria: true }), 'parte');
      const segunda = avanzar(elim.estado, 'parte');
      if (segunda.fase === 'pre_prorroga') {
        const prorroga = avanzar(segunda.estado, 'parte');
        expect(prorroga.estado.reloj.parte).toBe(4);
        if (prorroga.fase === 'penaltis') {
          const tanda = avanzar(prorroga.estado, 'parte');
          expect(tanda.fase).toBe('finalizado');
          expect(tanda.marcador.penaltis).toBeDefined();
          expect(tanda.marcador.penaltis!.local).not.toBe(tanda.marcador.penaltis!.visitante);
          conPenaltis = true;
        } else {
          expect(prorroga.fase).toBe('finalizado');
          expect(prorroga.marcador.local).not.toBe(prorroga.marcador.visitante);
        }
      }
    }
    expect(ligaEmpatada).toBe(true);
    expect(conPenaltis).toBe(true);
  });

  it('una decisión inválida se rechaza con su código', () => {
    const e = enDescanso();
    expect(aplicarDecision(e, { participanteId: 'nadie', tipo: 'tactica', datos: { tactica: local(e).tactica } })).toMatchObject({ ok: false, codigo: 'NO_PARTICIPA' });
    expect(
      aplicarDecision(e, { participanteId: 'local', tipo: 'tactica', datos: { tactica: { ...local(e).tactica, alturaBloque: 'catenaccio', lineaAdelantada: true } } }),
    ).toMatchObject({ ok: false, codigo: 'TACTICA_INCOMPATIBLE' });
  });
});

describe('partido con menos de 7 jugadores disponibles', () => {
  it('el equipo que no llega a 7 pierde 3-0 sin jugar', () => {
    const corto = equipo('local');
    corto.titulares = corto.titulares.slice(0, 6);
    const r = avanzar(crearPartido(entrada('corto', { local: corto })), 'final');
    expect(r.fase).toBe('finalizado');
    expect(r.marcador).toEqual({ local: 0, visitante: 3 });
  });
});
