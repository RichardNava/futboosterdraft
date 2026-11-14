/**
 * Mano a mano por posición (spec 014, research R2; FR-004, FR-005, FR-007): un atacante en campo rival sin ningún
 * rival de campo en el pasillo hacia la portería sigue la directriz «tiro a distancia de disparo; pase solo con un
 * rival encima y un compañero mejor situado; si no, conducción hacia la portería». Funciones puras; coordenadas del
 * equipo que ataca.
 */
import type { EquipoEstado, EstadoMotor, JugadorEnPartido } from '../estado/estado';
import { anguloTiro, decimasDeMetros, distanciaPorteria } from '../espacio/campo';
import { CENTRO_Y, LARGO, type Punto } from '../espacio/geometria';
import { atributo } from '../modificadores/atributos';
import { tiene } from '../modificadores/virtudes';
import { esPortero, holgura } from './contexto';
import { enFueraDeJuego } from './fueraDeJuego';
import { porteroAdelantado, type Entorno } from './opciones';
import { distanciaASegmento, LIBRE } from './receptor';

export type DecisionManoAMano = 'tiro' | { pase: JugadorEnPartido } | 'conduccion';

const PORTERIA: Punto = { x: LARGO, y: CENTRO_Y };

/** Portador en campo rival con solo el portero por delante (un rival a su altura cuenta si está en el pasillo). */
export function esManoAMano(estado: EstadoMotor, _atacante: EquipoEstado, _portador: JugadorEnPartido, en: Entorno | null): en is Entorno {
  if (!en || en.yo.x <= LARGO / 2) return false;
  const m = estado.parametros.manoAMano!;
  const pasillo = decimasDeMetros(m.pasilloM);
  const desde = en.yo.x - decimasDeMetros(m.margenAtrasM);
  // Solo el portero puede estar delante: un rival de campo por delante descarta el mano a mano; uno a su altura (hasta
  // `margenAtrasM` por detrás), solo si está en el pasillo hacia la portería.
  return !en.rivales.some((r) => !esPortero(r.j) && r.p.x > desde && (r.p.x > en.yo.x || distanciaASegmento(r.p, en.yo, PORTERIA) <= pasillo));
}

/** Distancia de disparo (décimas): crece con el remate y, con el portero adelantado, con lo que se ha salido. */
export function distanciaDisparo(estado: EstadoMotor, atacante: EquipoEstado, portador: JugadorEnPartido, en: Entorno): number {
  const m = estado.parametros.manoAMano!;
  let d = decimasDeMetros(m.distanciaBaseM + (m.distanciaPorRemateM * (atributo(estado, atacante, portador, 'remate') - 70)) / 10);
  if (porteroAdelantado(estado, atacante, en)) {
    const portero = en.rivales.find((r) => esPortero(r.j));
    if (portero) d += LARGO - portero.p.x;
  }
  return d;
}

/** Decisión del mano a mano en el orden de FR-004. */
export function decisionManoAMano(estado: EstadoMotor, atacante: EquipoEstado, portador: JugadorEnPartido, en: Entorno): DecisionManoAMano {
  const miDistancia = distanciaPorteria(en.yo);
  if (miDistancia <= distanciaDisparo(estado, atacante, portador, en)) return 'tiro';
  // Matador nunca la pasa en un mano a mano: conduce hasta tirar (texto del rasgo).
  if (en.rivalEncima && !tiene(portador, 'Matador')) {
    const m = estado.parametros.manoAMano!;
    const rivalLado = atacante.lado === 'local' ? 'visitante' : 'local';
    const miAngulo = anguloTiro(en.yo);
    let mejor: { j: JugadorEnPartido; d: number } | null = null;
    for (const c of en.companeros) {
      if (esPortero(c.j) || c.p.x < en.yo.x - decimasDeMetros(m.paraleloM)) continue;
      if (enFueraDeJuego(estado, atacante, c.j, en.yo.x)) continue;
      if (holgura(estado, rivalLado, estado.espacio.jugadores[c.j.id]!) < LIBRE * LIBRE) continue;
      const d = distanciaPorteria(c.p);
      if (d >= miDistancia && anguloTiro(c.p) <= miAngulo) continue;
      if (!mejor || d < mejor.d || (d === mejor.d && c.j.id < mejor.j.id)) mejor = { j: c.j, d };
    }
    if (mejor) return { pase: mejor.j };
  }
  return 'conduccion';
}
