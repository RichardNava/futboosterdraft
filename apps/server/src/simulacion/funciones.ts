/**
 * Cálculos del motor y de la IA que el servidor saca del hilo principal (spec 009; contracts/calculo.md §2).
 *
 * Funciones puras, sin E/S ni acceso a la partida: argumentos y resultados son datos planos que se copian al
 * hilo y de vuelta (*structured clone*). Las mismas funciones se ejecutan en un hilo o en proceso (`hilos = 0`).
 */
import { decidirAlineacion, jugarHastaElFinal, resolverResto, type NivelesPartido, type NivelIA, type ResultadoResolverResto } from '@fbd/ai';
import { parametrosPorVersion, type Alineacion, type Jugador, type ParametrosEquilibrado, type Semilla } from '@fbd/domain';
import { aplicarDecision, avanzar, crearPartido, minutoMostrable, type DecisionRegistrada, type EstadoMotor, type ResultadoTramo } from '@fbd/engine';
import type { EntradaGuardada } from '../actores/partidoRapido';
import type { FilaPartido } from '../persistencia/repos/partidos';

export type Tramos = { desdeTick: number; hastaTick: number; fase: string; minuto: string; eventos: unknown[]; marcador: unknown; acciones: unknown[]; fotogramas?: unknown[] }[];

/** Vuelve a jugar el partido guardado con sus decisiones registradas (FR-040). */
function rehacer(fila: Pick<FilaPartido, 'entrada' | 'versionParametros' | 'decisiones'>, conFotogramas: boolean): Tramos {
  const guardada = fila.entrada as EntradaGuardada;
  let estado: EstadoMotor = crearPartido({ ...guardada, parametros: parametrosPorVersion(fila.versionParametros) });
  for (const d of fila.decisiones as DecisionRegistrada[]) aplicarDecision(estado, d);
  const tramos: Tramos = [];
  for (let i = 0; i < 5000 && estado.fase !== 'finalizado'; i++) {
    const r = avanzar(estado, conFotogramas ? 'interrupcion' : 'parte', { fotogramas: conFotogramas });
    estado = r.estado;
    tramos.push({
      desdeTick: r.desdeTick,
      hastaTick: r.hastaTick,
      fase: r.fase,
      minuto: minutoMostrable(r.estado.reloj),
      eventos: r.eventos.filter((e) => e.relevante),
      marcador: r.marcador,
      acciones: r.acciones,
      ...(r.fotogramas ? { fotogramas: r.fotogramas } : {}),
    });
  }
  return tramos;
}

export const FUNCIONES = {
  avanzar,
  jugarHastaElFinal,
  resolverResto: (estado: EstadoMotor, niveles: NivelesPartido, semilla: Semilla): ResultadoResolverResto => resolverResto(estado, niveles, semilla),
  /** `resolverResto` con los tramos completos (con su estado), en lugar del callback `alTramo` («Finalizar partido»). */
  resolverRestoPorTramos: (estado: EstadoMotor, niveles: NivelesPartido, semilla: Semilla): ResultadoTramo[] => {
    const tramos: ResultadoTramo[] = [];
    resolverResto(estado, niveles, semilla, (t) => tramos.push(t));
    return tramos;
  },
  // Sin `opciones.ahora`: una función no se copia al hilo; el PRO usa el reloj del hilo (research R8).
  decidirAlineacion: (
    nivel: NivelIA,
    plantilla: readonly Jugador[],
    bajas: ReadonlySet<number>,
    rivalPlantilla: readonly Jugador[] | null,
    semilla: Semilla,
    opciones: { parametros?: ParametrosEquilibrado; limiteMs?: number } = {},
  ): Alineacion => decidirAlineacion(nivel, plantilla, bajas, rivalPlantilla, semilla, opciones),
  rehacer,
};

export type Funciones = typeof FUNCIONES;
export type NombreCalculo = keyof Funciones;
