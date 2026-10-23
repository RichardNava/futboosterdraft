/**
 * Serie Core (spec 003, research R8; T030): torneos en los que 8 NPC avanzados draftan la colección Core
 * (`data/core.json`, la misma que genera `generarCore()` de `tools/fixtures`) con la semilla de la serie y
 * juegan una liga a doble vuelta con sus alineaciones de `decidirAlineacion`. Es la medida más cercana a los
 * partidos que juzgaron las personas.
 *
 * Devuelve un `ResultadoSerie` agregado por partido (A = local, B = visitante) y la media de goles de cada torneo.
 */
import { decidirAlineacion, elegirCarta, equipoDesdeAlineacion, jugarHastaElFinal } from '@fbd/ai';
import { calendarioLiga, derivarSemilla, parametrosActuales, type Alineacion, type ParametrosEquilibrado } from '@fbd/domain';
import { crearPartido } from '@fbd/engine';
import { draftMesa } from './checks/npc';
import type { ResultadoSerie } from './series';

export interface ResultadoCore {
  serie: ResultadoSerie;
  /** Media de goles por partido de cada torneo. */
  porTorneo: number[];
}

const PARTIDOS_POR_TORNEO = 56;

/** Juega torneos Core hasta sumar al menos `n` partidos. */
export function serieCore(n: number, semilla: number, p: ParametrosEquilibrado = parametrosActuales()): ResultadoCore {
  const r: ResultadoSerie = {
    n: 0,
    victoriasA: 0,
    victoriasB: 0,
    empates: 0,
    golesA: [],
    golesB: [],
    estadisticasA: [],
    estadisticasB: [],
    lesionesA: 0,
    lesionesB: 0,
    ms: 0,
    resultados: [],
    goles: [],
    metricasA: [],
    penaltis: 0,
  };
  const porTorneo: number[] = [];
  const inicio = Date.now();
  const participantes = Array.from({ length: 8 }, (_, i) => `npc${i + 1}`);
  for (let t = 0; r.n < n; t++) {
    const raiz = `core:${semilla}:${t}`;
    const equipos = draftMesa(raiz, participantes, (pid, sobre, parcial, ronda, turno) =>
      elegirCarta('avanzado', sobre, parcial, ronda, turno, derivarSemilla(raiz, `${pid}:${ronda}:${turno}`), { participantes: participantes.length, parametros: p }),
    );
    const alineaciones = new Map<string, Alineacion>();
    const alineacion = (pid: string, rival: string) => {
      const clave = `${pid}>${rival}`;
      let a = alineaciones.get(clave);
      if (!a) {
        a = decidirAlineacion('avanzado', equipos[pid]!, new Set(), equipos[rival]!, derivarSemilla(raiz, `alineacion:${clave}`), { parametros: p });
        alineaciones.set(clave, a);
      }
      return equipoDesdeAlineacion(pid, a, new Map(equipos[pid]!.map((j) => [j.id, j])));
    };
    let golesTorneo = 0;
    let partidos = 0;
    for (const jornada of calendarioLiga(participantes, derivarSemilla(raiz, 'calendario'))) {
      for (const cruce of jornada.partidos) {
        const semillaPartido = derivarSemilla(raiz, `partido:${jornada.numero}:${cruce.local}`);
        const motor = crearPartido({
          version: p.version,
          parametros: p,
          semilla: semillaPartido,
          eliminatoria: false,
          local: alineacion(cruce.local, cruce.visitante),
          visitante: alineacion(cruce.visitante, cruce.local),
        });
        const fin = jugarHastaElFinal(motor, { local: 'avanzado', visitante: 'avanzado' }, semillaPartido);
        const { local, visitante } = fin.marcador;
        r.n++;
        partidos++;
        golesTorneo += local + visitante;
        r.golesA.push(local);
        r.golesB.push(visitante);
        if (local > visitante) r.victoriasA++;
        else if (visitante > local) r.victoriasB++;
        else r.empates++;
        r.resultados.push(`${local}-${visitante}`);
        r.estadisticasA.push(fin.estadisticas.local);
        r.estadisticasB.push(fin.estadisticas.visitante);
        r.penaltis += fin.eventos.filter((ev) => ev.tipo === 'penalti').length;
        for (const ev of fin.eventos) {
          if (ev.tipo !== 'gol') continue;
          r.goles.push({
            equipo: ev.equipo === 'local' ? 'A' : 'B',
            tipo: String(ev.datos.tipo),
            distancia: Number(ev.datos.distancia ?? 0),
            zonaRemate: String(ev.datos.zonaRemate ?? ''),
            autorId: ev.jugadores.find((j) => j.rol === 'autor')?.jugadorId ?? 0,
          });
        }
      }
    }
    porTorneo.push(golesTorneo / Math.max(1, partidos));
  }
  r.ms = Date.now() - inicio;
  return { serie: r, porTorneo };
}

export { PARTIDOS_POR_TORNEO };
