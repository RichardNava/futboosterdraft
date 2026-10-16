/**
 * Tanda de penaltis (T088; FR-041, FR-029a): 5 lanzamientos por equipo y muerte súbita. Lanzan los
 * jugadores que estaban en el campo al final, en el orden designado y después el resto, por su valor.
 */
import { candidatos } from '@fbd/domain';
import type { EquipoEstado, JugadorEnPartido } from '../estado/estado';
import { atributo } from '../modificadores/atributos';
import { santoActivo, tiene } from '../modificadores/specials';
import { emitir, portero, type Contexto } from '../acciones/contexto';
import { probabilidad, resolver } from '../acciones/duelo';
import type { Lado } from '../tipos';

export function ordenTanda(equipo: EquipoEstado): JugadorEnPartido[] {
  const enCampo = equipo.jugadores.filter((j) => j.enCampo);
  const designados = equipo.lanzadores.tanda.map((id) => enCampo.find((j) => j.id === id)).filter((j): j is JugadorEnPartido => !!j);
  const resto = candidatos(
    enCampo.filter((j) => !designados.includes(j)).map((j) => j.jugador),
    'penaltis',
  ).map((jg) => enCampo.find((j) => j.jugador === jg)!);
  return [...designados, ...resto];
}

function lanzar(ctx: Contexto, tirador: EquipoEstado, j: JugadorEnPartido, arqueroEquipo: EquipoEstado): boolean {
  const e = ctx.estado;
  const s = e.parametros.specials;
  const arquero = portero(arqueroEquipo);
  let ajuste = 0;
  if (tiene(j, 'LanzadorPenalties')) ajuste += s.bonusProbabilidadAlto;
  if (arquero && tiene(arquero, 'Parapenalties')) ajuste -= s.bonusProbabilidadAlto;
  const p = probabilidad(
    {
      base: e.parametros.acciones.gol.penalti + 0.4,
      atacante: atributo(e, tirador, j, 'remate'),
      defensor: arquero ? atributo(e, arqueroEquipo, arquero, 'parada') : 10,
      ajuste,
    },
    e.parametros,
  );
  const santo = arquero !== undefined && tiene(arquero, 'Santo') && santoActivo(e, arqueroEquipo);
  return resolver(ctx.rng, p, { rerollDefensor: santo });
}

export function jugarTanda(ctx: Contexto): void {
  const e = ctx.estado;
  const local = e.equipos.local;
  const visitante = e.equipos.visitante;
  const orden: Record<Lado, JugadorEnPartido[]> = { local: ordenTanda(local), visitante: ordenTanda(visitante) };
  const goles: Record<Lado, number> = { local: 0, visitante: 0 };
  const tiros: Record<Lado, number> = { local: 0, visitante: 0 };

  const decidida = (): boolean => {
    const restantes = (lado: Lado) => Math.max(0, 5 - tiros[lado]);
    if (tiros.local < 5 || tiros.visitante < 5) {
      return goles.local + restantes('local') < goles.visitante || goles.visitante + restantes('visitante') < goles.local;
    }
    return tiros.local === tiros.visitante && goles.local !== goles.visitante;
  };

  for (let ronda = 0; ronda < 200 && !decidida(); ronda++) {
    for (const lado of ['local', 'visitante'] as const) {
      if (decidida()) break;
      const equipo = e.equipos[lado];
      const otro = lado === 'local' ? visitante : local;
      const lista = orden[lado];
      if (lista.length === 0) continue;
      const j = lista[tiros[lado] % lista.length]!;
      const gol = lanzar(ctx, equipo, j, otro);
      tiros[lado]++;
      if (gol) goles[lado]++;
      emitir(ctx, 'tanda_lanzamiento', lado, [{ rol: 'autor', jugadorId: j.id }], { orden: tiros[lado], resultado: gol ? 'gol' : 'parado', marcador: { ...goles } }, true);
      e.tick += 60;
    }
  }
  e.marcador.penaltis = { ...goles };
}
