/**
 * Acciones con balón (T085; FR-033): en cada paso, quien lleva el balón elige una acción según la
 * zona, la táctica y la formación, y la resuelve en un duelo contra el rival más cercano.
 */
import { rival, type EquipoEstado, type JugadorEnPartido } from '../estado/estado';
import { atributo, type Atributo } from '../modificadores/atributos';
import {
  desplazamientoAtaque,
  pesosAcciones,
  probabilidadAvance,
  probabilidadBanda,
  type TipoAccion,
} from '../modificadores/formacionTactica';
import { ajusteDuelo, bonusInfranqueable, tiene } from '../modificadores/specials';
import { falta, fueraDeJuego } from './balonParado';
import { elegirPonderado, esPortero, interrumpir, jugadorPorId, pasarTiempo, receptor, rivalCercano, type Contexto } from './contexto';
import { probabilidad, resolver } from './duelo';
import { comprobarLesion } from './lesiones';
import { saqueDePuerta, tirar } from './tiro';

const DURACION: Record<TipoAccion, [number, number]> = {
  pase_corto: [2, 4],
  pase_largo: [3, 5],
  conduccion: [4, 6],
  regate: [2, 4],
  pase_espacio: [3, 5],
  centro: [2, 4],
  tiro_lejano: [2, 3],
  remate: [1, 2],
};

/** Atributo del atacante y del defensor en cada acción. */
const ENFRENTAMIENTO: Record<TipoAccion, [Atributo, Atributo]> = {
  pase_corto: ['pase', 'anticipacion'],
  pase_largo: ['vision', 'anticipacion'],
  conduccion: ['velocidad', 'quite'],
  regate: ['regate', 'quite'],
  pase_espacio: ['vision', 'anticipacion'],
  centro: ['centro', 'anticipacion'],
  tiro_lejano: ['remate', 'anticipacion'],
  remate: ['remate', 'anticipacion'],
};

function portadorActual(ctx: Contexto, atacante: EquipoEstado): JugadorEnPartido | undefined {
  const b = ctx.estado.balon;
  const actual = jugadorPorId(atacante, b.portadorId);
  if (actual?.enCampo) return actual;
  const nuevo = receptor(ctx, atacante, b.zona, b.carril, -1);
  if (nuevo) b.portadorId = nuevo.id;
  return nuevo;
}

/** El defensor recupera el balón. */
function perder(ctx: Contexto, atacante: EquipoEstado, perdedor: JugadorEnPartido, recuperador: JugadorEnPartido | undefined): void {
  const e = ctx.estado;
  const defensor = e.equipos[rival(atacante.lado)];
  const zonaRecuperacion = 5 - e.balon.zona;
  const s = e.parametros.specials;

  // Recuperador tras pérdida: presiona de inmediato para volver a robarla.
  if (tiene(perdedor, 'RecuperadorTrasPerdida') && recuperador) {
    const p = probabilidad({ base: -0.6, atacante: atributo(e, atacante, perdedor, 'quite'), defensor: atributo(e, defensor, recuperador, 'regate'), ajuste: s.bonusProbabilidadAlto }, e.parametros);
    if (resolver(ctx.rng, p)) {
      e.estadisticas[atacante.lado].recuperaciones++;
      if (e.balon.zona >= 3) e.estadisticas[atacante.lado].recuperacionesCampoRival++;
      pasarTiempo(ctx, 2);
      return;
    }
  }

  e.estadisticas[defensor.lado].recuperaciones++;
  if (zonaRecuperacion >= 3) e.estadisticas[defensor.lado].recuperacionesCampoRival++;
  const nuevo = recuperador ?? receptor(ctx, defensor, zonaRecuperacion, 2 - e.balon.carril, -1);
  // Un equipo que juega al contraataque busca la espalda rival nada más recuperar.
  const transicion =
    defensor.tactica.estiloConBalon === 'contraataque' &&
    ctx.rng.probabilidad(Math.round((0.35 + e.parametros.tacticas.contraataque.peligroTransicion) * 1000));
  e.balon = { posesion: defensor.lado, zona: zonaRecuperacion, carril: 2 - e.balon.carril, portadorId: nuevo?.id ?? 0, transicion };
  pasarTiempo(ctx, 2);
}

/** El balón sale del campo tras un pase fallido. */
function balonFuera(ctx: Contexto, atacante: EquipoEstado, zona: number): void {
  const e = ctx.estado;
  const defensor = e.equipos[rival(atacante.lado)];
  if (zona >= 5) {
    saqueDePuerta(ctx, defensor);
    return;
  }
  interrumpir(ctx, 'fuera_de_banda', 12, defensor.lado);
  const sacador = receptor(ctx, defensor, 5 - zona, 2 - e.balon.carril, -1);
  e.balon = { posesion: defensor.lado, zona: 5 - zona, carril: e.balon.carril === 1 ? 0 : 2 - e.balon.carril, portadorId: sacador?.id ?? 0, transicion: false };
}

/** Ajustes de probabilidad por specials del atacante en una acción concreta. */
function ajusteSpecialsAccion(ctx: Contexto, accion: TipoAccion, j: JugadorEnPartido, zona: number, carril: number, defensor: JugadorEnPartido | undefined): number {
  const s = ctx.estado.parametros.specials;
  let a = 0;
  if (tiene(j, 'PrimerToque') && (accion === 'pase_corto' || accion === 'pase_espacio')) a += s.bonusProbabilidadMedio;
  if (tiene(j, 'Elegante') && (accion === 'pase_corto' || accion === 'conduccion') && zona <= 3) a += s.bonusProbabilidadMedio;
  if (tiene(j, 'JugadorEntreLineas') && (zona === 3 || zona === 4)) a += s.bonusProbabilidadMedio;
  if (tiene(j, 'Desbordante') && accion === 'regate' && carril !== 1) a += s.bonusProbabilidadAlto;
  if (tiene(j, 'Potente') && (accion === 'regate' || accion === 'conduccion')) a += s.bonusProbabilidadLeve;
  if (tiene(j, 'JugadorDeCampo') && esPortero(j) && zona === 0) a += s.bonusProbabilidadAlto;
  if (defensor) {
    if (tiene(defensor, 'Presionador')) a -= s.bonusProbabilidadMedio;
    if (tiene(defensor, 'Potente') && (accion === 'regate' || accion === 'conduccion')) a -= s.bonusProbabilidadLeve;
  }
  return a;
}

/** Un paso de juego: una acción de quien lleva el balón. */
export function paso(ctx: Contexto): void {
  const e = ctx.estado;
  const p = e.parametros;
  const atacante = e.equipos[e.balon.posesion];
  const defensor = e.equipos[rival(atacante.lado)];
  const portador = portadorActual(ctx, atacante);
  if (!portador) {
    pasarTiempo(ctx, 3);
    return;
  }
  const { zona, carril } = e.balon;

  let accion: TipoAccion;
  if (e.balon.transicion && zona <= 3) {
    accion = 'pase_espacio';
  } else {
    accion = elegirPonderado(ctx.rng, pesosAcciones(atacante, zona, carril));
  }
  const transicion = e.balon.transicion;
  e.balon.transicion = false;
  const [min, max] = DURACION[accion];
  pasarTiempo(ctx, ctx.rng.entero(min, max));

  if (accion === 'remate') {
    tirar(ctx, atacante, portador, 'normal');
    return;
  }
  if (accion === 'tiro_lejano') {
    tirar(ctx, atacante, portador, 'lejano');
    return;
  }

  const [atA, atD] = ENFRENTAMIENTO[accion];
  // El atacante busca el punto débil: el más flojo de los dos rivales más cercanos en esa acción.
  const rivalDuelo = rivalCercano(ctx, defensor, zona >= 5, (j) => atributo(e, defensor, j, atD));
  const aj = ajusteDuelo(e, portador, rivalDuelo);
  const infranqueable = rivalDuelo ? bonusInfranqueable(e, portador, rivalDuelo) : 0;
  const valorDefensor = rivalDuelo ? atributo(e, defensor, rivalDuelo, atD) + infranqueable : 40;
  const base = {
    pase_corto: p.acciones.paseCorto,
    pase_largo: p.acciones.paseLargo,
    conduccion: p.acciones.conduccion,
    regate: p.acciones.regate,
    pase_espacio: p.acciones.paseEspacio + (transicion ? 0.4 : 0),
    centro: p.acciones.centro,
  }[accion];

  // Pase al espacio: la defensa con línea adelantada provoca más fueras de juego.
  if (accion === 'pase_espacio') {
    const fdj = p.acciones.probabilidadFueraDeJuegoBase + (defensor.tactica.lineaAdelantada ? p.tacticas.lineaAdelantada.fuerasDeJuegoProvocados : 0);
    if (ctx.rng.probabilidad(Math.round(fdj * 1000))) {
      const desmarcado = receptor(ctx, atacante, Math.min(5, zona + 2), carril, portador.id) ?? portador;
      fueraDeJuego(ctx, atacante, desmarcado);
      return;
    }
  }

  const exito = probabilidad(
    {
      base,
      atacante: atributo(e, atacante, portador, atA) + aj.atacante,
      defensor: valorDefensor + aj.defensor,
      desplazamiento: desplazamientoAtaque(e, atacante, defensor, accion, zona),
      ajuste: aj.probabilidad + ajusteSpecialsAccion(ctx, accion, portador, zona, carril, rivalDuelo),
    },
    p,
  );
  const ok = resolver(ctx.rng, exito, {
    rerollAtacante: (accion === 'regate' && tiene(portador, 'Filigranas')) || (accion === 'centro' && tiene(portador, 'GuanteEnElPie')),
    rerollDefensor: zona >= 4 && rivalDuelo !== undefined && tiene(rivalDuelo, 'MuroDefensivo') && accion !== 'regate',
  });
  e.estadisticas[atacante.lado].pases += accion.startsWith('pase') || accion === 'centro' ? 1 : 0;

  if (!ok) {
    // Regates y conducciones frenados con falta; pases que salen del campo; el resto, pérdida.
    if ((accion === 'regate' || accion === 'conduccion') && rivalDuelo && ctx.rng.probabilidad(Math.round(p.disciplina.probabilidadFaltaPorEntrada * 1000 * 1.6))) {
      falta(ctx, atacante, portador, defensor, rivalDuelo);
      return;
    }
    if ((accion === 'pase_largo' || accion === 'centro' || accion === 'pase_espacio') && ctx.rng.probabilidad(Math.round(p.acciones.probabilidadBalonFuera * 2000))) {
      balonFuera(ctx, atacante, accion === 'centro' ? 5 : zona + 1);
      return;
    }
    if (accion === 'regate' || accion === 'conduccion') comprobarLesion(ctx, atacante, portador);
    if (e.fase === 'finalizado') return;
    perder(ctx, atacante, portador, rivalDuelo);
    return;
  }

  e.estadisticas[atacante.lado].pasesCompletados += accion.startsWith('pase') || accion === 'centro' ? 1 : 0;
  // Un duelo ganado con regate o conducción también puede acabar en falta del defensor.
  if ((accion === 'regate' || accion === 'conduccion') && rivalDuelo && ctx.rng.probabilidad(Math.round(p.disciplina.probabilidadFaltaPorEntrada * 1000 * 0.5))) {
    falta(ctx, atacante, portador, defensor, rivalDuelo);
    return;
  }

  switch (accion) {
    case 'pase_corto': {
      const avanza = ctx.rng.probabilidad(Math.round(probabilidadAvance(atacante, defensor, zona) * 1000));
      const nuevaZona = Math.min(5, zona + (avanza ? 1 : 0));
      // Llegar al área con un pase corto exige superar una línea más.
      const destino = nuevaZona === 5 && !ctx.rng.probabilidad(300) ? 4 : nuevaZona;
      const nuevoCarril = avanza ? (ctx.rng.probabilidad(Math.round(probabilidadBanda(atacante) * 1000)) ? (ctx.rng.probabilidad(500) ? 0 : 2) : 1) : carril;
      const r = receptor(ctx, atacante, destino, nuevoCarril, portador.id);
      e.balon = { ...e.balon, zona: destino, carril: nuevoCarril, portadorId: r?.id ?? portador.id };
      return;
    }
    case 'pase_largo': {
      const destino = Math.min(4, zona + 2);
      const nuevoCarril = ctx.rng.entero(0, 2);
      const r = receptor(ctx, atacante, destino, nuevoCarril, portador.id);
      e.balon = { ...e.balon, zona: destino, carril: nuevoCarril, portadorId: r?.id ?? portador.id };
      return;
    }
    case 'conduccion':
    case 'regate': {
      const destino = Math.min(5, zona + 1);
      e.balon = { ...e.balon, zona: destino };
      // Un regate ganado en la frontal puede dejar al jugador solo ante el portero.
      if (accion === 'regate' && zona >= 4 && ctx.rng.probabilidad(Math.round(p.acciones.probabilidadManoAMano * 1000))) {
        tirar(ctx, atacante, portador, 'manoAMano');
      }
      return;
    }
    case 'pase_espacio': {
      const destino = Math.min(5, zona + (zona >= 3 ? 2 : 1));
      const r = receptor(ctx, atacante, destino, carril, portador.id) ?? portador;
      e.balon = { ...e.balon, zona: destino, portadorId: r.id };
      if (destino === 5 && ctx.rng.probabilidad(Math.round(p.acciones.probabilidadManoAMano * 1000))) {
        tirar(ctx, atacante, r, 'manoAMano', { asistente: portador });
      }
      return;
    }
    case 'centro': {
      const candidatos = atacante.jugadores.filter((j) => j.enCampo && j !== portador && !esPortero(j));
      const rematador = [...candidatos].sort((a, b) => atributo(e, atacante, b, 'aereo') - atributo(e, atacante, a, 'aereo'))[ctx.rng.probabilidad(600) ? 0 : 1] ?? candidatos[0];
      if (!rematador) return;
      e.balon = { ...e.balon, zona: 5, carril: 1, portadorId: rematador.id };
      const cabeza = ctx.rng.probabilidad(600);
      tirar(ctx, atacante, rematador, cabeza ? 'cabeza' : 'normal', { asistente: portador, trasCentro: true });
      return;
    }
  }
}
