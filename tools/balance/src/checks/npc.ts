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
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { decidirAlineacion, elegirCarta, equipoDesdeAlineacion, jugarHastaElFinal } from '@fbd/ai';
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
  type ResultadoLiga,
} from '@fbd/domain';
import { crearPartido } from '@fbd/engine';
import type { Comprobacion } from './partido';

const NIVELES: readonly NivelNPC[] = ['PRO', 'avanzado', 'intermedio', 'amateur'];
const RUTA_CORE = fileURLToPath(new URL('../../../../data/core.json', import.meta.url));

let catalogo: Jugador[] | null = null;
function core(): Jugador[] {
  catalogo ??= (JSON.parse(readFileSync(RUTA_CORE, 'utf-8')) as { jugadores: Jugador[] }).jugadores;
  return catalogo;
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
  while (mesa.estado === 'en_turno') {
    for (const pid of participantes) {
      const sobre = sobreDe(mesa, pid).restantes.map((id) => porId.get(id)!);
      const parcial = vistaParticipante(mesa, pid).misElecciones.map((id) => porId.get(id)!);
      const carta = elegirCarta(pid as NivelNPC, sobre, parcial, mesa.ronda, mesa.turno, derivarSemilla(semilla, `${pid}:${mesa.ronda}:${mesa.turno}`), {
        participantes: participantes.length,
        parametros: p,
      });
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
