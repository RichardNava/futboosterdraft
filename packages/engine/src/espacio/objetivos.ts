/**
 * Objetivo de cada jugador (research R3; FR-023): su ancla táctica desplazada según
 *
 * - la fase del equipo: con balón el bloque sube y se abre; sin balón se repliega y se cierra;
 * - la posición del balón: basculación en largo y en ancho, con factores por línea;
 * - la táctica: altura del bloque, línea adelantada y marcaje individual;
 * - la distancia entre líneas, acotada a la de FR-023 (10–25 m con balón, 8–18 m sin balón);
 * - su papel en la jugada: uno o dos defensores presionan (tres en una presión coordinada) y a balón parado
 *   cada uno va a su sitio. El que lleva el balón y el receptor de un pase tienen además su destino propio
 *   (`espacio.destinos`), que se superpone en el movimiento.
 *
 * Todo con enteros (décimas de unidad) y sin consumir números del PRNG del partido. Se calcula cada pocos
 * ticks y en cada paso del movimiento: está escrito sin estructuras intermedias.
 */
import type { EquipoEstado, EstadoMotor } from '../estado/estado';
import type { Lado } from '../tipos';
import { acotar, dist2, dividir, escalar, isqrt } from './aritmetica';
import { objetivosBalonParado } from './colocacion';
import { ANCHO, CENTRO_Y, LARGO, lineaDe, type Punto } from './geometria';

export { lineaDe } from './geometria';

const rival = (lado: Lado): Lado => (lado === 'local' ? 'visitante' : 'local');
/** Margen con las líneas del campo. */
const MARGEN = 150;
/** Ticks (5 s reales a x2) que tarda en volver a la forma quien ha tenido un papel en la jugada. */
export const TICKS_VUELTA = 118;
/** Margen dentro del rango de distancia entre líneas de FR-023 al acotar los objetivos. */
const MARGEN_LINEAS = 150;
const LINEA_DEFENSA = 0;
const LINEA_MEDIO = 1;
const LINEA_ATAQUE = 2;
const LINEA_PORTERIA = 3;
const CODIGO_LINEA = { defensa: LINEA_DEFENSA, medio: LINEA_MEDIO, ataque: LINEA_ATAQUE, porteria: LINEA_PORTERIA } as const;

/** Factor (en milésimas) multiplicado con redondeo entero. */
const por = (v: number, milesimas: number) => dividir(v * milesimas, 1000);
const mil = (f: number) => Math.round(f * 1000);

/** Objetivos de un equipo por su forma, escritos en `salida` en coordenadas absolutas. */
function objetivosDeForma(estado: EstadoMotor, equipo: EquipoEstado, salida: Record<number, Punto>, fuera: readonly number[]): void {
  const p = estado.parametros.espacio;
  const conBalon = estado.balon.posesion === equipo.lado;
  const local = equipo.lado === 'local';
  const b = estado.espacio.referencia;
  const bx = local ? b.x : LARGO - b.x;
  const by = local ? b.y : ANCHO - b.y;
  const t = equipo.tactica;
  const bl = p.basculacionLarga;
  const ba = p.basculacionAncha;
  const largo = [mil(bl.defensa), mil(bl.medio), mil(bl.ataque), mil(bl.porteria)];
  const ancho = [mil(ba.defensa), mil(ba.medio), mil(ba.ataque), mil(ba.porteria)];
  const abrir = conBalon ? mil(p.aperturaConBalon) : -mil(p.cierreSinBalon);
  const desplazamiento = (conBalon ? p.desplazamientoFase.conBalon : p.desplazamientoFase.sinBalon) + p.desplazamientoBloque[t.alturaBloque];
  const adelantada = t.lineaAdelantada && conBalon ? p.lineaAdelantada : 0;

  const ids: number[] = [];
  const xs: number[] = [];
  const ys: number[] = [];
  const lineas: number[] = [];
  const anclasX: number[] = [];
  const suma = [0, 0, 0];
  const cuenta = [0, 0, 0];
  const sumaAncla = [0, 0, 0];
  for (const j of equipo.jugadores) {
    if (!j.enCampo) continue;
    const linea = CODIGO_LINEA[lineaDe(equipo, j)];
    const ax = j.ancla ? j.ancla.x * 10 : 4500;
    const ay = j.ancla ? j.ancla.y * 10 : CENTRO_Y;
    let x = ax + por(bx - LARGO / 2, largo[linea]!);
    let y = ay + por(by - CENTRO_Y, ancho[linea]!);
    if (linea === LINEA_PORTERIA) {
      x = acotar(x, 200, 1600);
      y = acotar(y, 2300, 4100);
    } else {
      x += desplazamiento + (linea === LINEA_DEFENSA ? adelantada : 0);
      // Con balón el equipo se abre; sin balón se cierra hacia el eje.
      y += por(ay - CENTRO_Y, abrir);
      suma[linea]! += x;
      cuenta[linea]!++;
      sumaAncla[linea]! += ax;
    }
    ids.push(j.id);
    anclasX.push(ax);
    xs.push(x);
    ys.push(y);
    lineas.push(linea);
  }

  // Distancia entre líneas acotada (FR-023): la defensa y el ataque se mueven respecto al medio.
  // Con un margen hacia dentro del rango: los jugadores siguen a sus objetivos con algo de retraso.
  const [minimo, maximo] = conBalon ? p.separacionLineasConBalon : p.separacionLineasSinBalon;
  const min = minimo + MARGEN_LINEAS;
  const max = maximo - MARGEN_LINEAS;
  const media = (l: number) => (cuenta[l]! > 0 ? dividir(suma[l]!, cuenta[l]!) : null);
  const md = media(LINEA_DEFENSA);
  const mm = media(LINEA_MEDIO);
  const ma = media(LINEA_ATAQUE);
  // Las otras líneas se acotan respecto a donde está el medio de verdad (los que están en la forma, cada
  // uno descontando su escalón dentro de la línea), no a donde va: el bloque se mueve junto aunque el medio
  // aún esté llegando a su sitio.
  let sumaReal = 0;
  let cuentaReal = 0;
  if (mm !== null) {
    const anclaMedia = dividir(sumaAncla[LINEA_MEDIO]!, cuenta[LINEA_MEDIO]!);
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i]!;
      const q = estado.espacio.jugadores[id];
      if (lineas[i] !== LINEA_MEDIO || !q || fuera.includes(id) || estado.espacio.destinos[id] !== undefined) continue;
      if (estado.tick - q.papel < TICKS_VUELTA) continue;
      sumaReal += (local ? q.x : LARGO - q.x) - (anclasX[i]! - anclaMedia);
      cuentaReal++;
    }
  }
  const medio = cuentaReal > 0 ? dividir(sumaReal, cuentaReal) : (mm ?? (md !== null && ma !== null ? dividir(md + ma, 2) : null));
  let deltaDefensa = 0;
  let deltaAtaque = 0;
  if (medio !== null) {
    if (md !== null) {
      const gap = medio - md;
      deltaDefensa = -(acotar(gap, min, max) - gap);
    }
    if (ma !== null) {
      const gap = ma - medio;
      deltaAtaque = acotar(gap, min, max) - gap;
    }
  }

  // Las líneas pegadas a una portería se acotan al campo: si eso estrecha un hueco, se desplaza el resto
  // del bloque para mantenerlo.
  let alto = 0;
  let bajo = 0;
  if (medio !== null) {
    let maxAtaque = -Infinity;
    let minDefensa = Infinity;
    for (let i = 0; i < ids.length; i++) {
      if (lineas[i] === LINEA_ATAQUE) maxAtaque = Math.max(maxAtaque, xs[i]! + deltaAtaque);
      else if (lineas[i] === LINEA_DEFENSA) minDefensa = Math.min(minDefensa, xs[i]! + deltaDefensa);
    }
    if (maxAtaque > LARGO - MARGEN) alto = LARGO - MARGEN - maxAtaque;
    if (minDefensa < MARGEN) bajo = MARGEN - minDefensa;
  }

  for (let i = 0; i < ids.length; i++) {
    let x = xs[i]!;
    if (lineas[i] === LINEA_DEFENSA) x += deltaDefensa;
    else if (lineas[i] === LINEA_ATAQUE) x += deltaAtaque;
    if (lineas[i] !== LINEA_PORTERIA) x += alto + bajo;
    // Todo dentro del campo.
    x = acotar(x, MARGEN, LARGO - MARGEN);
    const y = acotar(ys[i]!, MARGEN, ANCHO - MARGEN);
    salida[ids[i]!] = local ? { x, y } : { x: LARGO - x, y: ANCHO - y };
  }
}

/**
 * Presión sobre el balón (FR-023): los defensores más cercanos (sin el portero) dentro de
 * `distanciaPresion`; 2 como mucho, o 3 en una presión coordinada (Presión alta, ≤ 5 s reales tras una
 * pérdida del rival en su propio campo).
 */
function elegirPresionadores(estado: EstadoMotor, defensor: EquipoEstado): { ids: number[]; coordinada: boolean } {
  const p = estado.parametros.espacio;
  const b = estado.espacio.balon;
  const bxAtacante = estado.balon.posesion === 'local' ? b.x : LARGO - b.x;
  const coordinada =
    defensor.tactica.alturaBloque === 'presion_alta' &&
    estado.posesion.enCampoPropio &&
    bxAtacante < LARGO / 2 &&
    estado.tick - estado.posesion.inicioTick <= p.presionCoordinada.ticks;
  const cantidad = coordinada ? p.presionCoordinada.jugadores : p.presionadores;
  // Un solo presionador si el balón está en el campo rival y el equipo juega en bloque bajo.
  const n = defensor.tactica.alturaBloque === 'catenaccio' && LARGO - bxAtacante > LARGO / 2 ? 1 : cantidad;
  const limite = p.distanciaPresion * p.distanciaPresion;
  const candidatos: { id: number; d: number }[] = [];
  for (const j of defensor.jugadores) {
    if (!j.enCampo || j.casillaId === 'POR') continue;
    const q = estado.espacio.jugadores[j.id];
    if (!q) continue;
    const d = dist2(q.x, q.y, b.x, b.y);
    if (d <= limite) candidatos.push({ id: j.id, d });
  }
  candidatos.sort((a, c) => a.d - c.d || a.id - c.id);
  return { ids: candidatos.slice(0, n).map((c) => c.id), coordinada: coordinada && n > p.presionadores };
}

/** Mueve la referencia de la forma hacia el balón, como mucho `velocidadBasculacion` por tick. */
function seguirBalon(estado: EstadoMotor): void {
  const esp = estado.espacio;
  const r = esp.referencia;
  const paso = estado.parametros.espacio.velocidadBasculacion * Math.max(0, estado.tick - r.tick);
  const dx = esp.balon.x - r.x;
  const dy = esp.balon.y - r.y;
  const d = isqrt(dx * dx + dy * dy);
  if (d <= paso) esp.referencia = { x: esp.balon.x, y: esp.balon.y, tick: estado.tick };
  else {
    const [mx, my] = escalar(dx, dy, paso);
    esp.referencia = { x: r.x + mx, y: r.y + my, tick: estado.tick };
  }
}

/** Objetivos de todos los titulares, en coordenadas absolutas (sin los destinos de la jugada en curso). */
export function calcularObjetivos(estado: EstadoMotor): Record<number, Punto> {
  const esp = estado.espacio;
  const p = estado.parametros.espacio;
  const objetivos: Record<number, Punto> = {};
  seguirBalon(estado);
  const atacante = estado.equipos[estado.balon.posesion];
  const defensor = estado.equipos[rival(atacante.lado)];
  const accion = esp.accion;
  const balonParado = accion?.tipo === 'saque' ? accion.motivo : undefined;
  const presion = balonParado ? { ids: [], coordinada: false } : elegirPresionadores(estado, defensor);
  objetivosDeForma(estado, atacante, objetivos, [estado.balon.portadorId]);
  objetivosDeForma(estado, defensor, objetivos, presion.ids);

  // Marcaje individual: cada defensor de campo se acerca a su par (el rival más cercano a su objetivo).
  if (defensor.tactica.sistemaDefensivo === 'individual') {
    const marcaje = mil(p.marcajeIndividual);
    for (const j of defensor.jugadores) {
      if (!j.enCampo || j.casillaId === 'POR') continue;
      const o = objetivos[j.id];
      if (!o) continue;
      let mejor: Punto | null = null;
      let dm = 2000 * 2000;
      for (const r of atacante.jugadores) {
        if (!r.enCampo || r.casillaId === 'POR') continue;
        const q = esp.jugadores[r.id];
        if (!q) continue;
        const d = dist2(o.x, o.y, q.x, q.y);
        if (d < dm) {
          dm = d;
          mejor = q;
        }
      }
      if (mejor) objetivos[j.id] = { x: o.x + por(mejor.x - o.x, marcaje), y: o.y + por(mejor.y - o.y, marcaje) };
    }
  }

  // Balón parado: cada uno a su sitio mientras se recoloca el balón.
  if (balonParado) {
    for (const [id, q] of objetivosBalonParado(estado, balonParado, atacante.lado, accion!.deId)) objetivos[id] = q;
    esp.presion = { lado: null, presionadores: [], coordinada: false };
  } else {
    // Presión sobre el balón: se colocan entre el balón y su portería, sin pisar al que lo lleva.
    const haciaPropia = defensor.lado === 'local' ? -1 : 1;
    for (const id of presion.ids) objetivos[id] = { x: acotar(esp.balon.x + haciaPropia * (p.radioSeparacion + 30), 0, LARGO), y: acotar(esp.balon.y, 0, ANCHO) };
    esp.presion = { lado: defensor.lado, presionadores: presion.ids, coordinada: presion.coordinada };
  }
  return objetivos;
}
