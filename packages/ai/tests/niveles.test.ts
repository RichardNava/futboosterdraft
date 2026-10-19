import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { derivarSemilla, FORMACIONES_IDS, NIVELES_NPC, PARAMETROS_V3, Rng, semillaDesdeTexto, validarAlineacion, type Jugador } from '@fbd/domain';
import { crearPartido, avanzar } from '@fbd/engine';
import { describe, expect, it } from 'vitest';
import { decidirAlineacion, decidirAlineacionDetallada, LIMITE_PRO_MS } from '../src/alineacion';
import { elegirCarta, elegirCartaDetallada } from '../src/draft';
import { valorCarta } from '../src/evaluador';
import { decidirEnPartido } from '../src/partido';
import { PERFILES, TODAS_LAS_FORMACIONES, type NivelIA } from '../src/perfiles';
import { equipoDesdeAlineacion } from '../src/pro/simulacionPrueba';
import { jugador, plantilla } from './ayudas';

const p = PARAMETROS_V3;

describe('niveles de los NPC (T120)', () => {
  const sobre = [jugador('MC', 84), jugador('POR', 79), jugador('DC', 82), jugador('LI', 80), jugador('DCD', 81), jugador('MCO', 83), jugador('ED', 80), jugador('MD', 78)];
  const parcial: Jugador[] = [jugador('MC'), jugador('MC'), jugador('DC'), jugador('DCI')];

  it('el PRO es determinista y elige el máximo del evaluador', () => {
    const a = elegirCarta('PRO', sobre, parcial, 1, 3, semillaDesdeTexto('a'));
    const b = elegirCarta('PRO', sobre, parcial, 1, 3, semillaDesdeTexto('otra semilla'));
    expect(a).toBe(b);
    // Sin sobre que vuelva (8 participantes), el máximo del evaluador con las necesidades del momento.
    const elegido = elegirCarta('PRO', sobre, parcial, 1, 1, semillaDesdeTexto('a'), { participantes: 8 });
    const valores = sobre.map((c) => ({ id: c.id, v: valorCarta(c, parcial, PERFILES.PRO.pesos, TODAS_LAS_FORMACIONES, p) }));
    expect(elegido).toBe(valores.sort((x, y) => y.v - x.v)[0]!.id);
  });

  it('el amateur mete ruido: con semillas distintas no siempre elige lo mismo', () => {
    const elecciones = new Set(Array.from({ length: 30 }, (_, i) => elegirCarta('amateur', sobre, parcial, 1, 1, semillaDesdeTexto(`s${i}`))));
    expect(elecciones.size).toBeGreaterThan(1);
    // Pero con la misma semilla repite.
    expect(elegirCarta('amateur', sobre, parcial, 1, 1, semillaDesdeTexto('x'))).toBe(elegirCarta('amateur', sobre, parcial, 1, 1, semillaDesdeTexto('x')));
  });

  it.each(NIVELES_NPC)('la alineación del nivel %s siempre es válida y llega antes del límite', (nivel) => {
    const propia = plantilla(80);
    const rival = plantilla(82);
    const bajas = new Set([propia[0]!.id, propia[5]!.id]);
    for (let i = 0; i < 3; i++) {
      const t0 = performance.now();
      const a = decidirAlineacion(nivel, propia, bajas, rival, semillaDesdeTexto(`${nivel}:${i}`));
      expect(performance.now() - t0).toBeLessThan(LIMITE_PRO_MS + 250);
      expect(FORMACIONES_IDS).toContain(a.formacion);
      expect(a.titulares).toHaveLength(11);
      expect(a.titulares.find((t) => t.casillaId === 'POR')).toBeDefined();
      const porId = new Map(propia.map((j) => [j.id, j]));
      expect(porId.get(a.titulares.find((t) => t.casillaId === 'POR')!.jugadorId)!.demarcacion).toBe('POR');
      expect(validarAlineacion(a, propia.map((j) => j.id), bajas)).toEqual([]);
    }
  });

  it('el PRO respeta el límite de tiempo aunque las simulaciones sean lentas', () => {
    let reloj = 0;
    // Cada lectura del reloj avanza 100 ms: el límite se alcanza enseguida.
    const a = decidirAlineacion('PRO', plantilla(80), new Set(), plantilla(82), semillaDesdeTexto('lento'), { ahora: () => (reloj += 100) });
    expect(a.titulares).toHaveLength(11);
    expect(reloj).toBeLessThan(LIMITE_PRO_MS + 1000);
  });

  it('el PRO decide igual con los mismos datos (sin ruido)', () => {
    const datos = [plantilla(80), new Set<number>(), plantilla(81)] as const;
    const a = decidirAlineacion('PRO', datos[0], datos[1], datos[2], semillaDesdeTexto('d'), { limiteMs: 60_000 });
    const b = decidirAlineacion('PRO', datos[0], datos[1], datos[2], semillaDesdeTexto('d'), { limiteMs: 60_000 });
    expect(a).toEqual(b);
  });

  it('en el partido, los cambios respetan las sustituciones disponibles y van a jugadores del banquillo', () => {
    const local = plantilla(80);
    const visitante = plantilla(80);
    const la = decidirAlineacion('intermedio', local, new Set(), null, semillaDesdeTexto('l'));
    const lv = decidirAlineacion('intermedio', visitante, new Set(), null, semillaDesdeTexto('v'));
    let estado = crearPartido({
      version: p.version,
      parametros: p,
      semilla: semillaDesdeTexto('partido'),
      eliminatoria: false,
      local: equipoDesdeAlineacion('L', la, new Map(local.map((j) => [j.id, j]))),
      visitante: equipoDesdeAlineacion('V', lv, new Map(visitante.map((j) => [j.id, j]))),
    });
    estado = avanzar(estado, 'parte').estado;
    expect(estado.fase).toBe('descanso');
    // Cansancio alto forzado en todos los de campo: el PRO pide como mucho 5 − 1 (reserva) cambios.
    for (const j of estado.equipos.local.jugadores) if (j.enCampo) j.cansancio = 0.9;
    const decisiones = decidirEnPartido('PRO', estado, 'local', semillaDesdeTexto('d'));
    const cambios = decisiones.filter((d) => d.tipo === 'sustitucion');
    expect(cambios.length).toBeLessThanOrEqual(4);
    expect(cambios.length).toBeGreaterThan(0);
    const entran = cambios.map((d) => (d.tipo === 'sustitucion' ? d.datos.entra : 0));
    expect(new Set(entran).size).toBe(entran.length);
    for (const id of entran) expect(estado.equipos.local.jugadores.find((j) => j.id === id)!.enCampo).toBe(false);
    // El amateur no hace cambios por cansancio.
    expect(decidirEnPartido('amateur', estado, 'local', semillaDesdeTexto('d')).filter((d) => d.tipo === 'sustitucion')).toHaveLength(0);
  });
});

describe('errores por nivel (spec 003, T088)', () => {
  const CORE = (JSON.parse(readFileSync(fileURLToPath(new URL('../../../data/core.json', import.meta.url)), 'utf-8')) as { jugadores: Jugador[] }).jugadores;

  /** Draft simplificado de un NPC: 3 sobres de 8 cartas Core, elige las 8 de cada uno. */
  function draft(nivel: NivelIA, i: number) {
    const raiz = semillaDesdeTexto(`draft:${nivel}:${i}`);
    const rng = new Rng(derivarSemilla(raiz, 'sobres'));
    const parcial: Jugador[] = [];
    let errores = 0;
    let dudosas = 0;
    for (let ronda = 1; ronda <= 3; ronda++) {
      const sobre = rng.barajar(CORE).slice(0, 8);
      for (let turno = 1; turno <= 8; turno++) {
        const r = elegirCartaDetallada(nivel, sobre, parcial, ronda, turno, derivarSemilla(raiz, `${ronda}:${turno}`), { participantes: 8, semillaDraft: raiz, parametros: p, dudosaHecha: dudosas > 0 });
        if (r.error === 'draft') errores++;
        if (r.error === 'dudosa') dudosas++;
        const k = sobre.findIndex((c) => c.id === r.id);
        parcial.push(sobre.splice(k, 1)[0]!);
      }
    }
    errores += decidirAlineacionDetallada(nivel, parcial, new Set(), null, derivarSemilla(raiz, 'alineacion'), { parametros: p, limiteMs: 0 }).errores.length;
    return { errores, dudosas };
  }

  const DRAFTS = 200;
  const resumen = Object.fromEntries(
    (['amateur', 'intermedio', 'avanzado', 'PRO', 'automatico'] as const).map((nivel) => {
      const r = Array.from({ length: DRAFTS }, (_, i) => draft(nivel, i));
      return [nivel, { media: r.reduce((s, x) => s + x.errores, 0) / DRAFTS, dudosas: r.map((x) => x.dudosas) }];
    }),
  ) as Record<NivelIA, { media: number; dudosas: number[] }>;

  it('la media de errores aplicados baja estrictamente de amateur a PRO', () => {
    const medias = NIVELES_NPC.map((n) => resumen[n].media);
    for (let i = 1; i < medias.length; i++) expect(medias[i]!).toBeLessThan(medias[i - 1]!);
  });

  it('el PRO tiene como mucho una decisión dudosa por draft, y la tiene en la mayoría', () => {
    expect(Math.max(...resumen.PRO.dudosas)).toBeLessThanOrEqual(1);
    expect(resumen.PRO.dudosas.filter((d) => d === 1).length / DRAFTS).toBeGreaterThan(0.5);
    for (const n of ['amateur', 'intermedio', 'avanzado'] as const) expect(Math.max(...resumen[n].dudosas)).toBe(0);
  });

  it('el perfil automatico no comete errores', () => {
    expect(resumen.automatico.media).toBe(0);
    expect(Math.max(...resumen.automatico.dudosas)).toBe(0);
  });
});
