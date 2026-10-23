/**
 * Opciones del que lleva el balón vistas con datos espaciales (002/R4; spec 003, research R4 a R10). Los pesos de
 * cada acción (zona, táctica y formación, `pesosAcciones`) se ajustan con lo que hay a su alrededor:
 *
 * - **Conducción** proporcional al espacio libre por delante (R5): de `factorMin` con menos de 3 m a `factorMax`
 *   con 15 m o más.
 * - **Pase largo** solo con motivo táctico (R4): cambio de orientación, espalda, salida bajo presión, despeje o
 *   transición; sin motivo, ×`pases.factorSinMotivo`.
 * - **Tiro** por distancia y ángulo reales (R6): una única acción `tiro` con `pesoTiro`.
 * - **Stats** (R9): `factorStat` acotado, y solo cuando la situación permite la acción.
 * - **Virtudes** (R10): Desbordante regatea más por banda.
 * - **Defectos** (spec 005): un Chupón pasa la mitad.
 *
 * Distancias en décimas y coordenadas del equipo que ataca.
 */
import type { EquipoEstado, EstadoMotor, JugadorEnPartido } from '../estado/estado';
import { dist2, isqrt } from '../espacio/aritmetica';
import { anguloTiro, decimasDeMetros, distanciaPorteria, enAreaRival } from '../espacio/campo';
import { aEquipo, type Punto } from '../espacio/geometria';
import { atributo } from '../modificadores/atributos';
import { ofensividad, pesosAcciones, type TipoAccion } from '../modificadores/formacionTactica';
import { factorPase } from '../modificadores/defectos';
import { tiene } from '../modificadores/virtudes';
import { esPortero, holgura } from './contexto';
import { pesoTiro } from './pesoTiro';
import { distanciaASegmento } from './receptor';

/** Rival encima (6 m), compañero libre (3 m), nadie en la línea de tiro (3 m) y el cono de ±30° (tan 30° ≈ 0,577). */
const RIVAL_ENCIMA = 571;
const LIBRE = 286;
const LINEA_TIRO = 286;
const TAN30_MILESIMAS = 577;
/** Hasta dónde se mide el espacio libre por delante: 25 m. */
const ESPACIO_MAXIMO = 2381;
/** Punto de remate de los centros (entre el penalti y el área pequeña) y distancia para atacarlo (21 m). */
export const PUNTO_REMATE = { x: 9200, y: 3200 } as const;
export const CERCA_REMATE = 2400;
/** Carriles por el ancho: banda izquierda (y < 2.133) y derecha (y > 4.267). */
const CARRIL_IZQUIERDO = 2133;
const CARRIL_DERECHO = 4267;

export type MotivoPaseLargo = {
  motivo: 'cambio_orientacion' | 'espalda' | 'salida_presion' | 'despeje' | 'transicion';
  /** Compañeros que cumplen el motivo: el pase largo va a uno de ellos. */
  receptores: JugadorEnPartido[];
};

/** Lo que ve el portador a su alrededor, en coordenadas de su equipo. */
export interface Entorno {
  yo: Punto;
  rivales: { j: JugadorEnPartido; p: Punto }[];
  companeros: { j: JugadorEnPartido; p: Punto }[];
  rivalEncima: boolean;
  /** Distancia al rival más cercano en un cono de ±30° hacia la portería rival, acotada a 25 m. */
  espacio: number;
  /** Compañeros en el área rival. */
  enArea: number;
  /** Compañeros a 21 m o menos del punto de remate de los centros (sin ellos no se centra). */
  cercaRemate: number;
}

export function entorno(estado: EstadoMotor, atacante: EquipoEstado, portador: JugadorEnPartido): Entorno | null {
  const q = estado.espacio.jugadores[portador.id];
  if (!q) return null;
  const yo = aEquipo(atacante.lado, q);
  const rivalLado = atacante.lado === 'local' ? 'visitante' : 'local';
  const rivales: Entorno['rivales'] = [];
  const companeros: Entorno['companeros'] = [];
  let rivalEncima = false;
  let espacio = ESPACIO_MAXIMO;
  for (const j of estado.equipos[rivalLado].jugadores) {
    const r = j.enCampo ? estado.espacio.jugadores[j.id] : undefined;
    if (!r) continue;
    const p = aEquipo(atacante.lado, r);
    rivales.push({ j, p });
    const d2 = dist2(yo.x, yo.y, p.x, p.y);
    if (d2 <= RIVAL_ENCIMA * RIVAL_ENCIMA) rivalEncima = true;
    const dx = p.x - yo.x;
    if (dx > 0 && Math.abs(p.y - yo.y) * 1000 <= dx * TAN30_MILESIMAS && d2 < espacio * espacio) espacio = isqrt(d2);
  }
  let enArea = 0;
  let cercaRemate = 0;
  for (const j of atacante.jugadores) {
    const r = j.enCampo && j.id !== portador.id ? estado.espacio.jugadores[j.id] : undefined;
    if (!r) continue;
    const p = aEquipo(atacante.lado, r);
    companeros.push({ j, p });
    if (enAreaRival(p)) enArea++;
    if (!esPortero(j) && dist2(p.x, p.y, PUNTO_REMATE.x, PUNTO_REMATE.y) <= CERCA_REMATE * CERCA_REMATE) cercaRemate++;
  }
  return { yo, rivales, companeros, rivalEncima, espacio, enArea, cercaRemate };
}

/** `acotar(1 + k·(valor − 70)/10, min, max)` en milésimas enteras (research R9). */
export function factorStat(valor: number, f: { k: number; min: number; max: number }): number {
  const x = 1 + (f.k * (valor - 70)) / 10;
  return Math.round(1000 * Math.min(f.max, Math.max(f.min, x)));
}

/** Factor espacial de la conducción (escala 10 = neutro): lineal entre `factorMin` y `factorMax` (research R5). */
export function factorConduccion(espacio: number, p: EstadoMotor['parametros']): number {
  const c = p.decision.conduccion;
  if (espacio < c.espacioMin) return c.factorMin;
  if (espacio >= c.espacioMax) return c.factorMax;
  return c.factorMin + ((c.factorMax - c.factorMin) * (espacio - c.espacioMin)) / (c.espacioMax - c.espacioMin);
}

/** Motivos tácticos de un pase largo (research R4), todos con posiciones reales. */
export function motivosPaseLargo(estado: EstadoMotor, atacante: EquipoEstado, portador: JugadorEnPartido, en: Entorno | null = entorno(estado, atacante, portador)): MotivoPaseLargo[] {
  if (!en) return [];
  const rivalLado = atacante.lado === 'local' ? 'visitante' : 'local';
  const libreDe = (j: JugadorEnPartido) => holgura(estado, rivalLado, estado.espacio.jugadores[j.id]!);
  const deCampo = en.companeros.filter((c) => !esPortero(c.j));
  const motivos: MotivoPaseLargo[] = [];
  const anadir = (motivo: MotivoPaseLargo['motivo'], receptores: JugadorEnPartido[]) => {
    if (receptores.length > 0) motivos.push({ motivo, receptores });
  };
  const yo = en.yo;
  const quince = decimasDeMetros(15);
  // 1. Cambio de orientación: un compañero en el carril opuesto con 15 m libres.
  if (yo.y < CARRIL_IZQUIERDO || yo.y > CARRIL_DERECHO) {
    const opuesto = (p: Punto) => (yo.y < CARRIL_IZQUIERDO ? p.y > CARRIL_DERECHO : p.y < CARRIL_IZQUIERDO);
    anadir('cambio_orientacion', deCampo.filter((c) => opuesto(c.p) && libreDe(c.j) >= quince * quince).map((c) => c.j));
  }
  // 2. Espalda: el defensor rival más retrasado a más de 30 m de su portería y un compañero por delante de él.
  const defensas = en.rivales.filter((r) => !esPortero(r.j));
  if (defensas.length > 0) {
    const ultimo = Math.max(...defensas.map((r) => r.p.x));
    if (10000 - ultimo > decimasDeMetros(30)) anadir('espalda', deCampo.filter((c) => c.p.x > ultimo).map((c) => c.j));
  }
  // 3. Salida bajo presión: rival encima y ningún compañero libre a 20 m o menos.
  const corto = estado.parametros.pases.distanciaCorto;
  if (en.rivalEncima) {
    const cerca = en.companeros.some((c) => dist2(yo.x, yo.y, c.p.x, c.p.y) <= corto * corto && libreDe(c.j) >= LIBRE * LIBRE);
    if (!cerca) anadir('salida_presion', deCampo.filter((c) => dist2(yo.x, yo.y, c.p.x, c.p.y) > corto * corto && libreDe(c.j) >= LIBRE * LIBRE).map((c) => c.j));
  }
  // 4. Despeje: en las zonas 0 y 1 con un rival encima, el balón va lejos, hacia delante.
  if (estado.balon.zona <= 1 && en.rivalEncima) anadir('despeje', deCampo.filter((c) => c.p.x > yo.x + decimasDeMetros(10)).map((c) => c.j));
  // 5. Transición: contraataque con espacio.
  if (estado.balon.transicion) anadir('transicion', deCampo.filter((c) => c.p.x > yo.x).map((c) => c.j));
  return motivos;
}

/** Factor del peso del pase largo: con algún motivo, `factorConMotivo`; sin motivo, `factorSinMotivo`. */
export function factorPaseLargo(motivos: readonly MotivoPaseLargo[], p: EstadoMotor['parametros']): number {
  if (motivos.length === 0) return p.pases.factorSinMotivo;
  // Un cambio de orientación con espacio es la mejor razón para un pase largo.
  return p.pases.factorConMotivo * (motivos.some((m) => m.motivo === 'cambio_orientacion') ? 1.5 : 1);
}

/** El portero rival está a 15 m o más de su línea de gol (permite tirar desde más de 35 m). */
export function porteroAdelantado(estado: EstadoMotor, atacante: EquipoEstado, en: Entorno): boolean {
  const portero = en.rivales.find((r) => esPortero(r.j));
  return portero !== undefined && 10000 - portero.p.x >= decimasDeMetros(estado.parametros.tiro.porteroAdelantadoM);
}

/** Peso de tirar desde la posición del portador (research R6), sin los factores de stat. */
export function pesoTiroDesde(estado: EstadoMotor, atacante: EquipoEstado, en: Entorno): number {
  return pesoTiro(estado.parametros, distanciaPorteria(en.yo), anguloTiro(en.yo), porteroAdelantado(estado, atacante, en));
}

/** Nadie a 3 m o menos de la línea entre el tirador y el centro de la portería. */
export function lineaDeTiroDespejada(en: Entorno): boolean {
  const porteria = { x: 10000, y: 3200 };
  return !en.rivales.some((r) => !esPortero(r.j) && distanciaASegmento(r.p, en.yo, porteria) <= LINEA_TIRO);
}

export function pesosConEspacio(
  estado: EstadoMotor,
  atacante: EquipoEstado,
  portador: JugadorEnPartido,
  zona: number,
  carril: number,
  en: Entorno | null = entorno(estado, atacante, portador),
): [TipoAccion, number][] {
  const pesos = pesosAcciones(atacante, zona, carril);
  if (!en) return pesos;
  const p = estado.parametros;
  const f = p.decision.factores;
  const attr = (n: Parameters<typeof atributo>[3]) => atributo(estado, atacante, portador, n);
  const quince = p.decision.conduccion.espacioMax;
  // El factor de regate solo cuenta con un rival encima o poco espacio; el físico, con espacio abierto (R9).
  const conRegate = en.rivalEncima || en.espacio < quince;
  const fRegate = conRegate ? factorStat(attr('regate'), f.regate) / 1000 : 1;
  const fFisico = en.espacio >= quince ? factorStat((attr('velocidad') + attr('fisico')) / 2, f.fisico) / 1000 : 1;
  const fPase = factorStat(attr('pase'), f.pase) / 1000;
  const chupon = factorPase(estado, portador);
  const fVision = factorStat(attr('vision'), f.vision) / 1000;
  const motivos = pesos.some(([a]) => a === 'pase_largo') ? motivosPaseLargo(estado, atacante, portador, en) : [];
  const salida: [TipoAccion, number][] = pesos.map(([accion, peso]) => {
    let x = 1;
    switch (accion) {
      case 'conduccion':
        x = (factorConduccion(en.espacio, p) / 10) * fRegate * fFisico;
        break;
      case 'regate':
        x = (en.rivalEncima ? 1.1 : 0.5) * fRegate * (tiene(portador, 'Desbordante') && carril !== 1 ? 1.6 : 1);
        break;
      case 'pase_corto':
        x = 1.6 * fPase * chupon;
        break;
      case 'pase_espacio':
        x = fPase * fVision * chupon;
        break;
      case 'pase_largo':
        x = fPase * factorPaseLargo(motivos, p) * chupon;
        break;
      case 'centro':
        // Sin nadie que pueda atacar el punto de remate no se centra.
        x = en.cercaRemate === 0 ? 0 : en.enArea >= 2 ? 3.6 : 2.6;
        break;
    }
    return [accion, Math.round(peso * x)];
  });
  // Tiro: por distancia y ángulo reales; el stat de remate solo pesa fuera del área, con ángulo y línea despejada.
  let tiro = pesoTiroDesde(estado, atacante, en);
  if (tiro > 0) {
    const despejada = lineaDeTiroDespejada(en);
    if (!enAreaRival(en.yo) && anguloTiro(en.yo) >= p.tiro.anguloReducidoGrados && despejada) tiro *= factorStat(attr('remate'), f.remate) / 1000;
    // Las formaciones ofensivas buscan más el tiro; con la línea tapada, se tira menos.
    tiro *= (1 + 0.35 * ofensividad(atacante)) * (despejada ? 1.2 : 0.6);
    salida.push(['tiro', Math.round(tiro)]);
  }
  return salida;
}
