/**
 * Simulaciones de prueba del NPC PRO (T126; research R9): juega partidos rápidos con el propio motor
 * entre una alineación candidata y la alineación probable del rival, y devuelve el rendimiento medio.
 */
import { derivarSemilla, type Alineacion, type Jugador, type ParametrosEquilibrado, type Semilla } from '@fbd/domain';
import { avanzar, crearPartido, type EquipoPartido } from '@fbd/engine';

export function equipoDesdeAlineacion(participanteId: string, a: Alineacion, porId: ReadonlyMap<number, Jugador>): EquipoPartido {
  return {
    participanteId,
    formacion: a.formacion,
    titulares: a.titulares.map((t) => ({ casillaId: t.casillaId, jugador: porId.get(t.jugadorId)! })),
    suplentes: a.suplentes.map((id) => porId.get(id)!),
    tactica: a.tactica,
    lanzadores: a.lanzadores,
  };
}

export interface Rendimiento {
  /** Puntos medios por partido (3/1/0). */
  puntos: number;
  /** Diferencia de goles media. */
  diferencia: number;
  jugados: number;
}

/**
 * Juega hasta `n` partidos alternando campo. Para antes si `seguir()` devuelve `false` (límite de
 * tiempo). Las semillas dependen solo de `semilla` y del índice: todas las candidatas se prueban en
 * las mismas condiciones.
 */
export function simularCandidata(
  propio: EquipoPartido,
  rival: EquipoPartido,
  n: number,
  semilla: Semilla,
  p: ParametrosEquilibrado,
  seguir: () => boolean = () => true,
): Rendimiento {
  let puntos = 0;
  let diferencia = 0;
  let jugados = 0;
  for (let i = 0; i < n && seguir(); i++) {
    const enCasa = i % 2 === 0;
    const motor = crearPartido({
      version: p.version,
      parametros: p,
      semilla: derivarSemilla(semilla, `prueba:${i}`),
      eliminatoria: false,
      local: enCasa ? propio : rival,
      visitante: enCasa ? rival : propio,
    });
    const { marcador } = avanzar(motor, 'final');
    const mios = enCasa ? marcador.local : marcador.visitante;
    const suyos = enCasa ? marcador.visitante : marcador.local;
    puntos += mios > suyos ? 3 : mios === suyos ? 1 : 0;
    diferencia += mios - suyos;
    jugados++;
  }
  return jugados ? { puntos: puntos / jugados, diferencia: diferencia / jugados, jugados } : { puntos: 0, diferencia: 0, jugados: 0 };
}
