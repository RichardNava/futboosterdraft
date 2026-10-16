/**
 * Escenarios reproducibles de partido (T118; quickstart, escenario E). Cada escenario fija dos
 * plantillas de la colección Core (por id) y una o varias semillas con las que el motor provoca un
 * evento concreto: una roja, una lesión grave, una tanda de penaltis, etc.
 *
 * Los JSON viven en `tools/fixtures/escenarios/` y se regeneran con `pnpm --filter @fbd/fixtures
 * generar-escenarios` si cambian los parámetros del motor.
 */
import { autoAlineacion, parametrosPorVersion, PARAMETROS_V1, type Demarcacion, type Jugador } from '@fbd/domain';
import { avanzar, crearPartido, type EntradaPartido, type EquipoPartido, type EventoPartido, type Marcador } from '@fbd/engine';
import { generarCore } from './generarCore';

export type NombreEscenario = 'roja' | 'tres-amarillas' | 'lesion-grave' | 'lesion-larga' | 'empate-eliminatoria';

export interface Escenario {
  nombre: NombreEscenario;
  descripcion: string;
  /** Versión de los parámetros de equilibrado con que se buscaron las semillas. */
  version: string;
  eliminatoria: boolean;
  local: { participanteId: string; jugadores: number[] };
  visitante: { participanteId: string; jugadores: number[] };
  /** Una semilla por partido (tres para la acumulación de amarillas). */
  semillas: string[];
  /** Lo que debe pasar, para comprobarlo: el jugador afectado si lo hay. */
  esperado: { jugadorId?: number; lado?: 'local' | 'visitante' };
}

/** Plantillas fijas de 18 jugadores (2 POR, 6 DEF, 6 MED, 4 DEL) tomadas en orden de la colección Core. */
export function plantillasEscenario(core: readonly Jugador[] = generarCore()): { local: number[]; visitante: number[] } {
  const cupo: Record<Demarcacion, number> = { POR: 2, DEF: 6, MED: 6, DEL: 4 };
  const tomar = (desde: number) =>
    (Object.keys(cupo) as Demarcacion[]).flatMap((d) =>
      core
        .filter((j) => j.demarcacion === d)
        .slice(desde * cupo[d], (desde + 1) * cupo[d])
        .map((j) => j.id),
    );
  return { local: tomar(0), visitante: tomar(1) };
}

function equipo(participanteId: string, ids: readonly number[], porId: ReadonlyMap<number, Jugador>, version: string): EquipoPartido {
  const plantilla = ids.map((id) => {
    const j = porId.get(id);
    if (!j) throw new Error(`El jugador ${id} no está en la colección`);
    return j;
  });
  const a = autoAlineacion(plantilla, new Set(), parametrosPorVersion(version));
  return {
    participanteId,
    formacion: a.formacion,
    titulares: a.titulares.map((t) => ({ casillaId: t.casillaId, jugador: porId.get(t.jugadorId)! })),
    suplentes: a.suplentes.map((id) => porId.get(id)!),
    tactica: a.tactica,
    lanzadores: a.lanzadores,
  };
}

/** Entrada del motor del partido `indice` del escenario. */
export function entradaEscenario(e: Pick<Escenario, 'version' | 'eliminatoria' | 'local' | 'visitante'>, semilla: string, core: readonly Jugador[] = generarCore()): EntradaPartido {
  const porId = new Map(core.map((j) => [j.id, j]));
  return {
    version: e.version,
    parametros: parametrosPorVersion(e.version),
    semilla,
    eliminatoria: e.eliminatoria,
    local: equipo(e.local.participanteId, e.local.jugadores, porId, e.version),
    visitante: equipo(e.visitante.participanteId, e.visitante.jugadores, porId, e.version),
  };
}

/** Juega el partido de principio a fin y devuelve sus eventos y el marcador. */
export function jugar(entrada: EntradaPartido): { eventos: EventoPartido[]; marcador: Marcador } {
  let estado = crearPartido(entrada);
  const eventos: EventoPartido[] = [];
  for (let i = 0; i < 10 && estado.fase !== 'finalizado'; i++) {
    const r = avanzar(estado, 'final');
    eventos.push(...r.eventos);
    estado = r.estado;
  }
  return { eventos, marcador: estado.marcador };
}

/** Comprueba que el escenario sigue provocando su evento con el motor actual. */
export function cumpleEscenario(e: Escenario, core: readonly Jugador[] = generarCore()): boolean {
  const partidos = e.semillas.map((s) => jugar(entradaEscenario(e, s, core)));
  const autor = (ev: EventoPartido) => ev.jugadores.find((j) => j.rol === 'autor')?.jugadorId;
  switch (e.nombre) {
    case 'roja':
      return partidos[0]!.eventos.some((ev) => ev.tipo === 'roja' && ev.equipo === e.esperado.lado && autor(ev) === e.esperado.jugadorId);
    case 'tres-amarillas':
      return (
        partidos.length === 3 &&
        partidos.every((p) => p.eventos.filter((ev) => ev.tipo === 'amarilla' && autor(ev) === e.esperado.jugadorId).length === 1) &&
        partidos.every((p) => !p.eventos.some((ev) => (ev.tipo === 'roja' || ev.tipo === 'lesion') && autor(ev) === e.esperado.jugadorId))
      );
    case 'lesion-grave':
    case 'lesion-larga': {
      const gravedad = e.nombre === 'lesion-grave' ? 'grave' : 'larga';
      return partidos[0]!.eventos.some((ev) => ev.tipo === 'lesion' && ev.datos.gravedad === gravedad && autor(ev) === e.esperado.jugadorId);
    }
    case 'empate-eliminatoria':
      return partidos[0]!.marcador.penaltis !== undefined;
  }
}

export const VERSION_ESCENARIOS = PARAMETROS_V1.version;
