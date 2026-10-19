/**
 * Comprobación SC-010 (T121): en series de torneos entre NPC de los cuatro niveles, el PRO termina por
 * delante del amateur en ≥ 80 % de los torneos y el avanzado en ≥ 65 %.
 *
 * Cada torneo es una liga a doble vuelta de 4 participantes (PRO, avanzado, intermedio y amateur) que
 * reproduce lo que hace el servidor: draft de la colección Core con `elegirCarta`, alineación antes de
 * cada partido con `decidirAlineacion` mirando al rival y partido con `jugarHastaElFinal`. No se
 * modelan las bajas entre jornadas: afectan a todos los niveles por igual.
 *
 * El PRO prueba sus candidatas sin límite de tiempo para que el resultado no dependa de la máquina.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  decidirAlineacion,
  decidirAlineacionDetallada,
  elegirCartaDetallada,
  equipoDesdeAlineacion,
  jugarHastaElFinal,
  type ErrorEleccion,
  type FamiliaError,
  type NivelIA,
} from '@fbd/ai';
import {
  calendarioLiga,
  clasificacion,
  crearMesa,
  derivarSemilla,
  elegir,
  generarMesa,
  parametrosActuales,
  plantillas,
  resolverTurno,
  sobreDe,
  vistaParticipante,
  type Alineacion,
  type Jugador,
  type NivelNPC,
  type ParametrosEquilibrado,
  type ResultadoLiga,
} from '@fbd/domain';
import { avanzar, crearPartido } from '@fbd/engine';
import { DIR_SALIDA } from '../informe';
import type { GrupoComprobaciones } from '../cli';
import { alineacionReferencia, elegirCartaReferencia } from '../referencia';
import { errorEstandar } from '../series';
import type { Comprobacion } from './partido';

const NIVELES: readonly NivelNPC[] = ['PRO', 'avanzado', 'intermedio', 'amateur'];
const RUTA_CORE = fileURLToPath(new URL('../../../../data/core.json', import.meta.url));

let catalogo: Jugador[] | null = null;
function core(): Jugador[] {
  catalogo ??= (JSON.parse(readFileSync(RUTA_CORE, 'utf-8')) as { jugadores: Jugador[] }).jugadores;
  return catalogo;
}

/**
 * Elector de cartas de los NPC de una mesa, como en el servidor: recuerda por participante si el PRO ya tomó
 * su decisión dudosa (FR-037b) y anota el error de cada elección (para SC-010b).
 */
export function electorNPC(semilla: string, participantes: number, p: ParametrosEquilibrado) {
  const dudosas = new Set<string>();
  const anotadas: { pid: string; ronda: number; turno: number; carta: number; error: ErrorEleccion }[] = [];
  const elegirDe = (nivel: NivelIA, pid: string, sobre: Jugador[], parcial: Jugador[], ronda: number, turno: number) => {
    const r = elegirCartaDetallada(nivel, sobre, parcial, ronda, turno, derivarSemilla(semilla, `${pid}:${ronda}:${turno}`), {
      participantes,
      parametros: p,
      semillaDraft: derivarSemilla(semilla, `${pid}:draft`),
      dudosaHecha: dudosas.has(pid),
    });
    if (r.error === 'dudosa') dudosas.add(pid);
    anotadas.push({ pid, ronda, turno, carta: r.id, error: r.error });
    return r.id;
  };
  return { elegirDe, anotadas };
}

/** Draft completo entre NPC: devuelve la plantilla de cada participante (su id es su nivel). */
export function draftNPC(semilla: string): Record<string, Jugador[]> {
  const p = parametrosActuales();
  const pool = core();
  const porId = new Map(pool.map((j) => [j.id, j]));
  const participantes = [...NIVELES];
  const sobres = generarMesa(pool, participantes.length, derivarSemilla(semilla, 'mesa'), p);
  let mesa = crearMesa({
    participantes,
    sobres,
    medias: Object.fromEntries(sobres.flatMap((s) => s.cartas).map((id) => [id, porId.get(id)!.media])),
    ahora: 0,
    turnoS: 45,
  });
  const { elegirDe } = electorNPC(semilla, participantes.length, p);
  while (mesa.estado === 'en_turno') {
    for (const pid of participantes) {
      const sobre = sobreDe(mesa, pid).restantes.map((id) => porId.get(id)!);
      const parcial = vistaParticipante(mesa, pid).misElecciones.map((id) => porId.get(id)!);
      const carta = elegirDe(pid as NivelNPC, pid, sobre, parcial, mesa.ronda, mesa.turno);
      mesa = elegir(mesa, pid, carta, 0, 'npc');
    }
    mesa = resolverTurno(mesa, 0);
  }
  return Object.fromEntries(Object.entries(plantillas(mesa)).map(([pid, ids]) => [pid, ids.map((id) => porId.get(id)!)]));
}

/** Juega un torneo y devuelve la posición final (1 = campeón) de cada nivel. */
export function torneoNPC(semilla: string): Record<NivelNPC, number> {
  const p = parametrosActuales();
  const equipos = draftNPC(semilla);
  // Sin bajas, la alineación de un participante contra un mismo rival no cambia entre ida y vuelta.
  const alineaciones = new Map<string, Alineacion>();
  const alineacion = (pid: string, rival: string) => {
    const clave = `${pid}>${rival}`;
    let a = alineaciones.get(clave);
    if (!a) {
      a = decidirAlineacion(pid as NivelNPC, equipos[pid]!, new Set(), equipos[rival]!, derivarSemilla(semilla, `alineacion:${clave}`), {
        parametros: p,
        limiteMs: Number.POSITIVE_INFINITY,
      });
      alineaciones.set(clave, a);
    }
    return equipoDesdeAlineacion(pid, a, new Map(equipos[pid]!.map((j) => [j.id, j])));
  };

  const resultados: ResultadoLiga[] = [];
  for (const jornada of calendarioLiga([...NIVELES], derivarSemilla(semilla, 'calendario'))) {
    for (const cruce of jornada.partidos) {
      const semillaPartido = derivarSemilla(semilla, `partido:${jornada.numero}:${cruce.local}`);
      const motor = crearPartido({
        version: p.version,
        parametros: p,
        semilla: semillaPartido,
        eliminatoria: false,
        local: alineacion(cruce.local, cruce.visitante),
        visitante: alineacion(cruce.visitante, cruce.local),
      });
      const r = jugarHastaElFinal(motor, { local: cruce.local as NivelNPC, visitante: cruce.visitante as NivelNPC }, semillaPartido);
      resultados.push({ local: cruce.local, visitante: cruce.visitante, golesLocal: r.marcador.local, golesVisitante: r.marcador.visitante });
    }
  }
  const tabla = clasificacion([...NIVELES], resultados, derivarSemilla(semilla, 'desempate'));
  return Object.fromEntries(tabla.map((f, i) => [f.participanteId, i + 1])) as Record<NivelNPC, number>;
}

/**
 * Reloj simulado para el PRO (T096): avanza 25 ms en cada consulta, como si cada partido de prueba costara
 * 25 ms (el umbral del `bench`). Así el PRO prueba las mismas candidatas que en el servidor con su límite
 * de 2 s, pero el resultado no depende de la máquina.
 */
export function relojSimulado(msPorConsulta = 25): () => number {
  let t = 0;
  return () => (t += msPorConsulta);
}

/** Draft de una mesa en la que cada participante elige con su propia función. */
export function draftMesa(semilla: string, participantes: string[], elegirCartaDe: (pid: string, sobre: Jugador[], parcial: Jugador[], ronda: number, turno: number) => number): Record<string, Jugador[]> {
  const p = parametrosActuales();
  const pool = core();
  const porId = new Map(pool.map((j) => [j.id, j]));
  const sobres = generarMesa(pool, participantes.length, derivarSemilla(semilla, 'mesa'), p);
  let mesa = crearMesa({
    participantes,
    sobres,
    medias: Object.fromEntries(sobres.flatMap((s) => s.cartas).map((id) => [id, porId.get(id)!.media])),
    ahora: 0,
    turnoS: 45,
  });
  while (mesa.estado === 'en_turno') {
    for (const pid of participantes) {
      const sobre = sobreDe(mesa, pid).restantes.map((id) => porId.get(id)!);
      const parcial = vistaParticipante(mesa, pid).misElecciones.map((id) => porId.get(id)!);
      mesa = elegir(mesa, pid, elegirCartaDe(pid, sobre, parcial, mesa.ronda, mesa.turno), 0, 'npc');
    }
    mesa = resolverTurno(mesa, 0);
  }
  return Object.fromEntries(Object.entries(plantillas(mesa)).map(([pid, ids]) => [pid, ids.map((id) => porId.get(id)!)]));
}

export interface ResultadoReferencia {
  victorias: number;
  empates: number;
  derrotas: number;
  partidos: number;
}

/**
 * 003/SC-010 (research R13): liga a doble vuelta de 8 con el participante de referencia y 7 NPC de un nivel.
 * Solo se juegan (y cuentan) los 14 partidos del participante de referencia: los demás no cambian su
 * porcentaje de victorias, porque no se modelan las bajas entre jornadas.
 */
export function torneoReferencia(nivel: NivelNPC, semilla: string): ResultadoReferencia {
  const p = parametrosActuales();
  const npcs = Array.from({ length: 7 }, (_, i) => `npc${i + 1}`);
  const participantes = ['referencia', ...npcs];
  const { elegirDe } = electorNPC(semilla, participantes.length, p);
  const equipos = draftMesa(semilla, participantes, (pid, sobre, parcial, ronda, turno) =>
    pid === 'referencia' ? elegirCartaReferencia(sobre, parcial, ronda, turno, p) : elegirDe(nivel, pid, sobre, parcial, ronda, turno),
  );
  const porIdDe = (pid: string) => new Map(equipos[pid]!.map((j) => [j.id, j]));
  const referencia = equipoDesdeAlineacion('referencia', alineacionReferencia(equipos.referencia!, new Set(), p), porIdDe('referencia'));
  const r: ResultadoReferencia = { victorias: 0, empates: 0, derrotas: 0, partidos: 0 };
  for (const npc of npcs) {
    const a = decidirAlineacion(nivel, equipos[npc]!, new Set(), equipos.referencia!, derivarSemilla(semilla, `alineacion:${npc}`), {
      parametros: p,
      ahora: relojSimulado(),
    });
    const rival = equipoDesdeAlineacion(npc, a, porIdDe(npc));
    for (const enCasa of [true, false]) {
      const semillaPartido = derivarSemilla(semilla, `partido:${npc}:${enCasa ? 'ida' : 'vuelta'}`);
      const motor = crearPartido({
        version: p.version,
        parametros: p,
        semilla: semillaPartido,
        eliminatoria: false,
        local: enCasa ? referencia : rival,
        visitante: enCasa ? rival : referencia,
      });
      const fin = jugarHastaElFinal(motor, enCasa ? { visitante: nivel } : { local: nivel }, semillaPartido);
      const mios = enCasa ? fin.marcador.local : fin.marcador.visitante;
      const suyos = enCasa ? fin.marcador.visitante : fin.marcador.local;
      r.partidos++;
      if (mios > suyos) r.victorias++;
      else if (mios === suyos) r.empates++;
      else r.derrotas++;
    }
  }
  return r;
}

/** Porcentaje de victorias del participante de referencia por nivel, con su error estándar (por torneo). */
export function victoriasReferencia(torneos: number, semilla: number, niveles: readonly NivelNPC[] = ['amateur', 'intermedio', 'avanzado', 'PRO']) {
  return niveles.map((nivel) => {
    const porTorneo: number[] = [];
    const total: ResultadoReferencia = { victorias: 0, empates: 0, derrotas: 0, partidos: 0 };
    for (let i = 0; i < torneos; i++) {
      const t = torneoReferencia(nivel, `003-sc010:${nivel}:${semilla + i}`);
      porTorneo.push(t.victorias / t.partidos);
      total.victorias += t.victorias;
      total.empates += t.empates;
      total.derrotas += t.derrotas;
      total.partidos += t.partidos;
    }
    return { nivel, ...total, pctVictorias: (100 * total.victorias) / total.partidos, errorEstandar: 100 * errorEstandar(porTorneo) };
  });
}

/** Grupos del registro de `cli.ts` (T001). */
export function gruposNPC(): GrupoComprobaciones[] {
  return [
    { ids: ['SC-010'], serie: 'npc', ejecutar: (o) => comprobacionesNPC(o.torneos || 100, o.seed) },
    { ids: ['003/SC-010'], serie: 'npc', ejecutar: (o) => [comprobarSC010(o.torneos || 100, o.seed)] },
    { ids: ['003/SC-010a'], serie: 'npc', ejecutar: (o) => [comprobarSC010a(10 * (o.torneos || 100), o.seed)] },
    { ids: ['003/SC-010b'], serie: 'npc', ejecutar: (o) => [comprobarSC010b(20, o.seed)] },
  ];
}

/** Línea base de SC-010 con el motor 2.0.0 y los NPC de la 002 (T091, checklists/linea-base.md). */
export const LINEA_BASE_SC010: Readonly<Record<NivelNPC, number>> = { amateur: 58.3, intermedio: 41.9, avanzado: 40.4, PRO: 36.7 };

/**
 * 003/SC-010 (FR-036, FR-037): el participante de referencia contra 7 NPC de cada nivel. Contra amateur e
 * intermedio, más victorias que derrotas y ≥ 15 puntos por encima de la línea base; descenso ordenado de
 * amateur a PRO (cada paso, más de 2 errores estándar); contra PRO, ≥ 10 % de victorias.
 */
export function comprobarSC010(torneos: number, semilla: number): Comprobacion {
  const inicio = Date.now();
  const r = victoriasReferencia(torneos, semilla);
  const de = (n: NivelNPC) => r.find((x) => x.nivel === n)!;
  const fallos: string[] = [];
  for (const n of ['amateur', 'intermedio'] as const) {
    const x = de(n);
    if (x.victorias <= x.derrotas) fallos.push(`${n}: victorias ≤ derrotas`);
    if (x.pctVictorias < LINEA_BASE_SC010[n] + 15) fallos.push(`${n}: < línea base + 15`);
  }
  for (let i = 1; i < r.length; i++) {
    const a = r[i - 1]!;
    const b = r[i]!;
    if (a.pctVictorias - b.pctVictorias <= 2 * Math.hypot(a.errorEstandar, b.errorEstandar)) fallos.push(`${a.nivel} → ${b.nivel} sin descenso significativo`);
  }
  if (de('PRO').pctVictorias < 10) fallos.push('PRO: < 10 %');
  return {
    id: '003/SC-010',
    descripcion: 'Referencia contra 7 NPC: amateur e intermedio, más victorias que derrotas y +15 pp sobre la línea base; descenso ordenado; PRO ≥ 10 %',
    ok: fallos.length === 0,
    detalle:
      r.map((x) => `${x.nivel} ${x.pctVictorias.toFixed(1)} % ± ${x.errorEstandar.toFixed(1)} (V ${x.victorias} / E ${x.empates} / D ${x.derrotas}; base ${LINEA_BASE_SC010[x.nivel]} %)`).join(' · ') +
      (fallos.length ? ` — ${fallos.join('; ')}` : '') +
      ` (${torneos} torneos por nivel, ${((Date.now() - inicio) / 1000).toFixed(1)} s)`,
  };
}

/**
 * 003/SC-010a (FR-038): el motor no distingue humanos de NPC. Con las mismas entradas y semillas, y sin
 * decisiones durante el partido, el resultado es idéntico con cada lado etiquetado como humano o como NPC.
 */
export function comprobarSC010a(partidos: number, semilla: number): Comprobacion {
  const p = parametrosActuales();
  const etiquetas = ['npc-amateur', 'npc-intermedio', 'npc-avanzado', 'npc-PRO'];
  let distintos = 0;
  let equipos: Record<string, Jugador[]> = {};
  const alineaciones = new Map<string, Alineacion>();
  for (let i = 0; i < partidos; i++) {
    if (i % 50 === 0) {
      equipos = draftNPC(`003-sc010a:${semilla + i}`);
      alineaciones.clear();
    }
    const l = NIVELES[i % 4]!;
    const v = NIVELES[(i + 1) % 4]!;
    const alineacion = (pid: string, rival: string) => {
      const clave = `${pid}>${rival}`;
      let a = alineaciones.get(clave);
      if (!a) {
        a = decidirAlineacion(pid as NivelNPC, equipos[pid]!, new Set(), equipos[rival]!, derivarSemilla(`003-sc010a:${semilla}`, clave), { parametros: p, ahora: relojSimulado() });
        alineaciones.set(clave, a);
      }
      return a;
    };
    const semillaPartido = derivarSemilla(`003-sc010a:${semilla}`, `partido:${i}`);
    const jugar = (local: string, visitante: string) => {
      const fin = avanzar(
        crearPartido({
          version: p.version,
          parametros: p,
          semilla: semillaPartido,
          eliminatoria: false,
          local: equipoDesdeAlineacion(local, alineacion(l, v), new Map(equipos[l]!.map((j) => [j.id, j]))),
          visitante: equipoDesdeAlineacion(visitante, alineacion(v, l), new Map(equipos[v]!.map((j) => [j.id, j]))),
        }),
        'final',
      );
      return JSON.stringify({ m: fin.marcador, e: fin.estadisticas, n: fin.eventos.map((e) => [e.tick, e.tipo]) });
    };
    if (jugar('humano-local', 'humano-visitante') !== jugar(etiquetas[i % 4]!, etiquetas[(i + 2) % 4]!)) distintos++;
  }
  return {
    id: '003/SC-010a',
    descripcion: 'Mismas entradas y semillas, cada lado etiquetado como humano o NPC: resultados idénticos',
    ok: distintos === 0,
    detalle: `${partidos - distintos} de ${partidos} partidos idénticos`,
  };
}

/** Revisión guardada de un draft y su preparación (SC-010b). */
interface RevisionNPC {
  nivel: NivelNPC;
  semilla: string;
  draft: { ronda: number; turno: number; carta: number; jugador: string; error: ErrorEleccion }[];
  preparacion: { formacion: string; tactica: unknown; errores: FamiliaError[] };
}

/**
 * 003/SC-010b (FR-037, FR-037b): 20 drafts y preparaciones por nivel guardados en
 * `tools/balance/salida/npc-revision/<nivel>/*.json` con los errores aplicados. Los errores bajan con el nivel y
 * el PRO tiene al menos una decisión dudosa en más del 50 % de los drafts.
 */
export function comprobarSC010b(drafts: number, semilla: number): Comprobacion {
  const p = parametrosActuales();
  const porId = new Map(core().map((j) => [j.id, j]));
  const medias: Partial<Record<NivelNPC, number>> = {};
  let proConDudosa = 0;
  const niveles = ['amateur', 'intermedio', 'avanzado', 'PRO'] as const;
  for (const nivel of niveles) {
    const dir = join(DIR_SALIDA, 'npc-revision', nivel);
    mkdirSync(dir, { recursive: true });
    let errores = 0;
    for (let i = 0; i < drafts; i++) {
      const s = `003-sc010b:${nivel}:${semilla + i}`;
      const participantes = Array.from({ length: 8 }, (_, k) => `npc${k + 1}`);
      const elector = electorNPC(s, participantes.length, p);
      const equipos = draftMesa(s, participantes, (pid, sobre, parcial, ronda, turno) => elector.elegirDe(nivel, pid, sobre, parcial, ronda, turno));
      const draft = elector.anotadas
        .filter((x) => x.pid === 'npc1')
        .map(({ ronda, turno, carta, error }) => {
          const j = porId.get(carta);
          return { ronda, turno, carta, jugador: j ? `${j.nombre} ${j.apellidos} (${j.demarcacion} ${j.media})` : String(carta), error };
        });
      const prep = decidirAlineacionDetallada(nivel, equipos.npc1!, new Set(), equipos.npc2!, derivarSemilla(s, 'alineacion'), { parametros: p, ahora: relojSimulado() });
      const revision: RevisionNPC = { nivel, semilla: s, draft, preparacion: { formacion: prep.alineacion.formacion, tactica: prep.alineacion.tactica, errores: prep.errores } };
      writeFileSync(join(dir, `${String(i + 1).padStart(2, '0')}.json`), JSON.stringify(revision, null, 2));
      errores += draft.filter((d) => d.error === 'draft').length + prep.errores.length;
      if (nivel === 'PRO' && draft.some((d) => d.error === 'dudosa')) proConDudosa++;
    }
    medias[nivel] = errores / drafts;
  }
  const orden = niveles.map((n) => medias[n]!);
  const bajan = orden.every((m, i) => i === 0 || m < orden[i - 1]!);
  const pctDudosa = proConDudosa / drafts;
  return {
    id: '003/SC-010b',
    descripcion: 'Revisión de 20 drafts por nivel: los errores bajan con el nivel y el PRO tiene una decisión dudosa en > 50 % de los drafts',
    ok: bajan && pctDudosa > 0.5,
    detalle: `errores por draft: ${niveles.map((n) => `${n} ${medias[n]!.toFixed(2)}`).join(' · ')}; PRO con dudosa ${(100 * pctDudosa).toFixed(0)} %; en salida/npc-revision/`,
  };
}


export function comprobacionesNPC(torneos: number, semilla: number): Comprobacion[] {
  let proDelante = 0;
  let avanzadoDelante = 0;
  const inicio = Date.now();
  for (let i = 0; i < torneos; i++) {
    const pos = torneoNPC(`sc010:${semilla + i}`);
    if (pos.PRO < pos.amateur) proDelante++;
    if (pos.avanzado < pos.amateur) avanzadoDelante++;
  }
  const pct = (x: number) => `${((100 * x) / torneos).toFixed(1)} %`;
  return [
    {
      id: 'SC-010',
      descripcion: 'PRO por delante de amateur en ≥ 80 % de los torneos; avanzado en ≥ 65 %',
      ok: proDelante / torneos >= 0.8 && avanzadoDelante / torneos >= 0.65,
      detalle: `PRO ${pct(proDelante)}, avanzado ${pct(avanzadoDelante)} (${torneos} torneos, ${((Date.now() - inicio) / 1000).toFixed(1)} s)`,
    },
  ];
}
