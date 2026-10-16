/**
 * Tiros (T085): precisión frente al bloqueo y gol frente a la parada del portero, con los specials de
 * remate (Matador, Rematador, Cabeceador, Llegador, lanzadores) y de portero (Parapenalties,
 * One-to-One, Ordenabarreras y el reroll de Santo).
 */
import { rival, type EquipoEstado, type JugadorEnPartido } from '../estado/estado';
import { atributo } from '../modificadores/atributos';
import { desplazamientoAtaque } from '../modificadores/formacionTactica';
import { ajusteDuelo, santoActivo, tiene } from '../modificadores/specials';
import { emitir, interrumpir, pasarTiempo, portero, rivalCercano, type Contexto } from './contexto';
import { probabilidad, resolver } from './duelo';

export type TipoTiro = 'normal' | 'cabeza' | 'lejano' | 'manoAMano' | 'falta' | 'penalti';

export type ResultadoTiro = 'gol' | 'parada' | 'fuera' | 'bloqueado';

export interface OpcionesTiro {
  asistente?: JugadorEnPartido;
  /** Tras un centro (Rematador). */
  trasCentro?: boolean;
}

export function tirar(ctx: Contexto, atacante: EquipoEstado, tirador: JugadorEnPartido, tipo: TipoTiro, opciones: OpcionesTiro = {}): ResultadoTiro {
  const e = ctx.estado;
  const p = e.parametros;
  const s = p.specials;
  const defensor = e.equipos[rival(atacante.lado)];
  const stats = e.estadisticas[atacante.lado];
  stats.tiros++;
  pasarTiempo(ctx, 2);

  const remate = atributo(e, atacante, tirador, tipo === 'cabeza' ? 'aereo' : 'remate');
  const cercania = tipo === 'normal' || tipo === 'cabeza' || tipo === 'manoAMano';
  let bonusRemate = 0;
  if (tiene(tirador, 'Matador') && tipo === 'manoAMano') bonusRemate += s.bonusProbabilidadAlto;
  if (tiene(tirador, 'Rematador') && opciones.trasCentro) bonusRemate += s.bonusProbabilidadMedio;
  if (tiene(tirador, 'Cabeceador') && tipo === 'cabeza') bonusRemate += s.bonusProbabilidadAlto;
  if (tiene(tirador, 'Llegador') && tirador.jugador.demarcacion === 'MED' && cercania) bonusRemate += s.bonusProbabilidadMedio;
  if (tiene(tirador, 'LanzadorFaltas') && tipo === 'falta') bonusRemate += s.bonusProbabilidadAlto;
  if (tiene(tirador, 'LanzadorPenalties') && tipo === 'penalti') bonusRemate += s.bonusProbabilidadAlto;

  // 1. ¿Va a puerta? (los tiros a balón parado y los mano a mano no tienen bloqueo).
  let bloqueador: JugadorEnPartido | undefined;
  let defensaBloqueo = 70;
  if (tipo === 'normal' || tipo === 'cabeza' || tipo === 'lejano') {
    bloqueador = rivalCercano(ctx, defensor);
    if (bloqueador) defensaBloqueo = atributo(e, defensor, bloqueador, tipo === 'cabeza' ? 'aereo' : 'anticipacion');
  }
  const aj = ajusteDuelo(e, tirador, bloqueador);
  const puerta = probabilidad(
    {
      base: p.acciones.puerta[tipo],
      atacante: remate + aj.atacante,
      defensor: defensaBloqueo + aj.defensor,
      desplazamiento: tipo === 'penalti' ? 0 : desplazamientoAtaque(e, atacante, defensor, 'remate', e.balon.zona) * 0.5,
      ajuste: aj.probabilidad + bonusRemate / 2,
    },
    p,
  );
  const arquero = portero(defensor);
  const autor = [{ rol: 'autor' as const, jugadorId: tirador.id }];
  if (!resolver(ctx.rng, puerta)) {
    const bloqueado = bloqueador !== undefined && ctx.rng.probabilidad(450);
    emitir(ctx, 'tiro', atacante.lado, autor, { tipo, resultado: bloqueado ? 'bloqueado' : 'fuera' });
    if (bloqueado && ctx.rng.probabilidad(Math.round(p.acciones.probabilidadCornerTrasDespeje * 1000))) {
      corner(ctx, atacante);
    } else {
      saqueDePuerta(ctx, defensor);
    }
    return bloqueado ? 'bloqueado' : 'fuera';
  }
  e.estadisticas[atacante.lado].tirosPuerta++;

  // 2. ¿Gol? Frente a la parada del portero (o de quien esté en la portería).
  let parada = arquero ? atributo(e, defensor, arquero, 'parada') : 10;
  let bonusPortero = 0;
  if (arquero) {
    if (tiene(arquero, 'Parapenalties') && tipo === 'penalti') bonusPortero += s.bonusProbabilidadAlto;
    if (tiene(arquero, 'Ordenabarreras') && tipo === 'falta') bonusPortero += s.bonusProbabilidadMedio;
    const regate = (tirador.jugador.stats as unknown as Record<string, number>).regate ?? 0;
    if (tiene(arquero, 'OneToOne') && (tipo === 'manoAMano' || regate >= 88)) bonusPortero += s.bonusProbabilidadMedio;
    if (tiene(arquero, 'Aura')) parada += 1;
  }
  const ajp = ajusteDuelo(e, tirador, arquero);
  const gol = probabilidad(
    {
      base: p.acciones.gol[tipo],
      atacante: remate + ajp.atacante,
      defensor: parada + ajp.defensor,
      ajuste: bonusRemate - bonusPortero,
    },
    p,
  );
  const santo = arquero !== undefined && tiene(arquero, 'Santo') && santoActivo(e, defensor);
  const marca = resolver(ctx.rng, gol, { rerollDefensor: santo });

  if (marca) {
    e.marcador[atacante.lado]++;
    const jugadores = opciones.asistente ? [...autor, { rol: 'asistente' as const, jugadorId: opciones.asistente.id }] : autor;
    emitir(ctx, 'gol', atacante.lado, jugadores, { tipo, marcador: { ...e.marcador } }, true);
    interrumpir(ctx, 'gol', 60, defensor.lado);
    saqueDeCentro(ctx, defensor);
    return 'gol';
  }

  // Ocasión clara: mano a mano, penalti o remate cercano con muchas opciones de gol.
  const clara = tipo === 'manoAMano' || tipo === 'penalti' || (cercania && gol >= 330);
  if (clara) emitir(ctx, 'ocasion', atacante.lado, autor, { tipo }, true);
  emitir(ctx, 'parada', defensor.lado, arquero ? [{ rol: 'portero', jugadorId: arquero.id }, ...autor] : autor, { tipo });
  if (ctx.rng.probabilidad(Math.round(p.acciones.probabilidadCornerTrasParada * 1000))) {
    corner(ctx, atacante);
  } else {
    e.balon = { posesion: defensor.lado, zona: 0, carril: 1, portadorId: arquero?.id ?? 0, transicion: false };
    pasarTiempo(ctx, 4);
  }
  return 'parada';
}

export function saqueDePuerta(ctx: Contexto, equipo: EquipoEstado): void {
  interrumpir(ctx, 'saque_puerta', 20, equipo.lado);
  ctx.estado.balon = { posesion: equipo.lado, zona: 0, carril: 1, portadorId: portero(equipo)?.id ?? 0, transicion: false };
}

export function saqueDeCentro(ctx: Contexto, equipo: EquipoEstado): void {
  const mc = equipo.jugadores.find((j) => j.enCampo && j.jugador.demarcacion === 'MED') ?? equipo.jugadores.find((j) => j.enCampo);
  ctx.estado.balon = { posesion: equipo.lado, zona: 2, carril: 1, portadorId: mc?.id ?? 0, transicion: false };
}

/** Córner: el lanzador designado centra y se disputa el balón aéreo (Volador, Cabeceador). */
export function corner(ctx: Contexto, atacante: EquipoEstado): void {
  const e = ctx.estado;
  const p = e.parametros;
  const defensor = e.equipos[rival(atacante.lado)];
  e.estadisticas[atacante.lado].corners++;
  emitir(ctx, 'corner', atacante.lado);
  interrumpir(ctx, 'corner', 25, atacante.lado);
  rematarBalonParado(ctx, atacante, defensor, 'corners', p.acciones.duelaAereo);
}

/**
 * Balón colgado al área (córner o falta lateral): el lanzador centra (Guante en el pie repite),
 * el mejor rematador de cabeza disputa el balón al mejor defensor aéreo (Volador).
 */
export function rematarBalonParado(
  ctx: Contexto,
  atacante: EquipoEstado,
  defensor: EquipoEstado,
  tipo: 'corners' | 'faltas',
  base: number,
): void {
  const e = ctx.estado;
  const p = e.parametros;
  const s = p.specials;
  const enCampoAtk = atacante.jugadores.filter((j) => j.enCampo);
  const lanzador =
    enCampoAtk.find((j) => j.id === atacante.lanzadores[tipo]) ??
    [...enCampoAtk].sort((a, b) => atributo(e, atacante, b, 'centro') - atributo(e, atacante, a, 'centro'))[0];
  if (!lanzador) return;
  const rematadores = enCampoAtk.filter((j) => j !== lanzador && j.casillaId !== 'POR');
  const rematador = [...rematadores].sort(
    (a, b) =>
      atributo(e, atacante, b, 'aereo') + (tiene(b, 'Cabeceador') ? 6 : 0) - (atributo(e, atacante, a, 'aereo') + (tiene(a, 'Cabeceador') ? 6 : 0)),
  )[0];
  const defensores = defensor.jugadores.filter((j) => j.enCampo && j.casillaId !== 'POR');
  const marcador = [...defensores].sort(
    (a, b) =>
      atributo(e, defensor, b, 'aereo') + (tiene(b, 'Volador') ? 6 : 0) - (atributo(e, defensor, a, 'aereo') + (tiene(a, 'Volador') ? 6 : 0)),
  )[0];
  if (!rematador) return;
  let ajuste = 0;
  if (marcador && tiene(marcador, 'Volador')) ajuste -= s.bonusProbabilidadAlto;
  const centro = probabilidad(
    {
      base,
      atacante: (atributo(e, atacante, lanzador, 'centro') + atributo(e, atacante, rematador, 'aereo')) / 2,
      defensor: marcador ? atributo(e, defensor, marcador, 'aereo') : 50,
      ajuste,
    },
    p,
  );
  e.balon = { posesion: atacante.lado, zona: 5, carril: 1, portadorId: rematador.id, transicion: false };
  if (resolver(ctx.rng, centro, { rerollAtacante: tiene(lanzador, 'GuanteEnElPie') })) {
    tirar(ctx, atacante, rematador, 'cabeza', { asistente: lanzador, trasCentro: true });
  } else {
    // Despeje: la defensa se hace con el balón cerca de su área.
    pasarTiempo(ctx, 3);
    e.balon = { posesion: defensor.lado, zona: 1, carril: ctx.rng.entero(0, 2), portadorId: marcador?.id ?? defensores[0]?.id ?? 0, transicion: false };
  }
}
