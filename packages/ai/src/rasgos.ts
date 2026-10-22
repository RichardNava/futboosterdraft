/**
 * Rasgos en las decisiones de los NPC (spec 005, research R12; FR-043), sobre la alineación ya elegida:
 *
 * - **Rebelde**: si no va de titular, no se convoca (el banquillo admite 7 de los restantes).
 * - **Estrellita**: se evita de titular si no es la mejor media del once, salvo que, aun con su −10 %, siga siendo la
 *   mejor opción de su casilla.
 * - **Fatigado e Indisciplinado**: se sustituyen antes (`umbralCansancioDe`).
 * - **Revulsivo**: si la diferencia con el titular alternativo es pequeña (`MARGEN_REVULSIVO`), se reserva en el
 *   banquillo, y entra en el descanso (`revulsivoParaEntrar`).
 *
 * Con parámetros sin defectos (1.x a 3.x) no cambia nada.
 */
import {
  FORMACIONES,
  MAX_SUPLENTES,
  parametrosEfectivos,
  proponerLanzadores,
  statsEfectivos,
  type Alineacion,
  type Jugador,
  type ParametrosEquilibrado,
} from '@fbd/domain';
import type { EstadoMotor, JugadorEnPartido, Lado } from '@fbd/engine';

/** Puntos de media que se aceptan de menos en el titular alternativo para reservar a un Revulsivo. */
export const MARGEN_REVULSIVO = 2;

/** Fracción del umbral de cansancio a la que se cambia a un Fatigado o un Indisciplinado. */
export const FACTOR_UMBRAL_CANSANCIO = 0.75;

const tieneDefecto = (j: Pick<Jugador, 'defectos'>, d: Jugador['defectos'][number]) => j.defectos.includes(d);

/** Umbral de cansancio para cambiar a un jugador: menor si se cansa antes o más deprisa. */
export function umbralCansancioDe(j: Pick<Jugador, 'defectos'>, umbral: number): number {
  return tieneDefecto(j, 'Fatigado') || tieneDefecto(j, 'Indisciplinado') ? umbral * FACTOR_UMBRAL_CANSANCIO : umbral;
}

export function ajustarAlineacionPorRasgos(
  a: Alineacion,
  plantilla: readonly Jugador[],
  bajas: ReadonlySet<number>,
  p: ParametrosEquilibrado,
): Alineacion {
  const efectivos = parametrosEfectivos(p);
  const d = efectivos.defectos;
  const revulsivo = efectivos.virtudes.revulsivo > 0;
  if (d.estrellita <= 0 && d.rebelde <= 0 && !revulsivo) return a;
  const porId = new Map(plantilla.map((j) => [j.id, j]));
  const casillas = new Map(FORMACIONES[a.formacion].casillas.map((c) => [c.id, c]));
  const titulares = a.titulares.map((t) => ({ ...t }));
  const mediaEn = (j: Jugador, casillaId: string) => statsEfectivos(j, casillas.get(casillaId)!, p).media;
  let cambiado = false;

  // Estrellita: si no es el mejor del once y hay en la plantilla alguien mejor que él con su −10 %, va al banquillo.
  if (d.estrellita > 0) {
    for (const t of titulares) {
      const j = porId.get(t.jugadorId)!;
      if (!tieneDefecto(j, 'Estrellita')) continue;
      const propia = mediaEn(j, t.casillaId);
      const mejorDelOnce = Math.max(...titulares.map((x) => mediaEn(porId.get(x.jugadorId)!, x.casillaId)));
      if (propia >= mejorDelOnce) continue;
      const enOnce = new Set(titulares.map((x) => x.jugadorId));
      const alternativa = plantilla
        .filter((o) => !enOnce.has(o.id) && !bajas.has(o.id) && !tieneDefecto(o, 'Estrellita'))
        .map((o) => ({ o, media: mediaEn(o, t.casillaId) }))
        .sort((x, y) => y.media - x.media || x.o.id - y.o.id)[0];
      if (alternativa && alternativa.media > propia * (1 - d.estrellita)) {
        t.jugadorId = alternativa.o.id;
        cambiado = true;
      }
    }
  }

  // Revulsivo: si hay en la plantilla un titular casi igual de bueno para su casilla, va al banquillo.
  const reservados: number[] = [];
  if (revulsivo) {
    for (const t of titulares) {
      const j = porId.get(t.jugadorId)!;
      if (t.casillaId === 'POR' || !j.virtudes.includes('Revulsivo')) continue;
      const propia = mediaEn(j, t.casillaId);
      const enOnce = new Set(titulares.map((x) => x.jugadorId));
      const alternativa = plantilla
        .filter((o) => !enOnce.has(o.id) && !bajas.has(o.id) && !o.virtudes.includes('Revulsivo') && !tieneDefecto(o, 'Estrellita'))
        .map((o) => ({ o, media: mediaEn(o, t.casillaId) }))
        .sort((x, y) => y.media - x.media || x.o.id - y.o.id)[0];
      if (alternativa && alternativa.media >= propia - MARGEN_REVULSIVO) {
        reservados.push(j.id);
        t.jugadorId = alternativa.o.id;
        cambiado = true;
      }
    }
  }

  // Banquillo: los Revulsivos reservados primero, sin Rebeldes, completado con los mejores restantes.
  const enOnce = new Set(titulares.map((t) => t.jugadorId));
  const vale = (id: number) => !enOnce.has(id) && !bajas.has(id) && !(d.rebelde > 0 && tieneDefecto(porId.get(id)!, 'Rebelde'));
  let suplentes = [...reservados, ...a.suplentes.filter((id) => vale(id) && !reservados.includes(id))];
  if (suplentes.length !== a.suplentes.length || cambiado) {
    const resto = plantilla
      .filter((j) => vale(j.id) && !suplentes.includes(j.id))
      .sort((x, y) => y.media - x.media || x.id - y.id)
      .map((j) => j.id);
    suplentes = [...suplentes, ...resto].slice(0, MAX_SUPLENTES);
  }
  if (!cambiado && suplentes.length === a.suplentes.length && suplentes.every((id, i) => id === a.suplentes[i])) return a;
  const colocacion = a.colocacion?.filter((c) => enOnce.has(c.jugadorId));
  return {
    ...a,
    titulares,
    suplentes,
    lanzadores: cambiado ? proponerLanzadores(titulares.map((t) => porId.get(t.jugadorId)!)) : a.lanzadores,
    ...(colocacion ? { colocacion } : {}),
  };
}

/**
 * Revulsivo del banquillo que debería entrar ahora (spec 005, research R12): en el descanso, el de más media, por el
 * jugador de campo de su demarcación con menos media. Devuelve null si no hay o no toca.
 */
export function revulsivoParaEntrar(
  estado: EstadoMotor,
  lado: Lado,
  usados: ReadonlySet<number>,
): { sale: JugadorEnPartido; entra: JugadorEnPartido } | null {
  if (estado.fase !== 'descanso' || parametrosEfectivos(estado.parametros).virtudes.revulsivo <= 0) return null;
  const equipo = estado.equipos[lado];
  const entra = equipo.jugadores
    .filter((j) => !j.enCampo && !j.retirado && !usados.has(j.id) && j.jugador.virtudes.includes('Revulsivo'))
    .sort((a, b) => b.jugador.media - a.jugador.media || a.id - b.id)[0];
  if (!entra) return null;
  const sale = equipo.jugadores
    .filter((j) => j.enCampo && j.casillaId !== 'POR' && !usados.has(j.id) && j.jugador.demarcacion === entra.jugador.demarcacion)
    .sort((a, b) => a.jugador.media - b.jugador.media || a.id - b.id)[0];
  return sale ? { sale, entra } : null;
}
