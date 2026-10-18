/**
 * Movimiento de los jugadores (research R3; FR-023 "movimiento natural"): cada chapa va hacia su objetivo
 * con una velocidad máxima que depende de su stat de velocidad y del cansancio, acelera y frena de forma
 * progresiva, y se separa de las demás para no atravesarlas ni amontonarse. Enteros en décimas.
 *
 * Los jugadores se mueven cada `PASO_MOVIMIENTO` ticks (los mismos en que se toman los fotogramas), con
 * el desplazamiento y el cambio de velocidad de esos ticks; el balón se mueve en cada tick.
 */
import type { EquipoEstado, EstadoMotor, JugadorEnPartido, PosicionMovil } from '../estado/estado';
import { atributoConBonus } from '../modificadores/atributos';
import { bonusEquipo, bonusPorDemarcacion } from '../modificadores/specials';
import { acotar, dividir, escalar, isqrt } from './aritmetica';
import { ANCHO, LARGO, type Punto } from './geometria';

/** Ticks entre dos pasos de movimiento de los jugadores. */
export const PASO_MOVIMIENTO = 2;

function velocidadDeStat(estado: EstadoMotor, stat: number): number {
  const p = estado.parametros.espacio;
  const s = acotar(Math.round(stat), p.statVelocidadMin, p.statVelocidadMax);
  return p.velocidadJugadorMin + dividir((s - p.statVelocidadMin) * (p.velocidadJugadorMax - p.velocidadJugadorMin), p.statVelocidadMax - p.statVelocidadMin);
}

/**
 * Velocidad máxima de un jugador, en décimas por tick: lineal con su atributo de velocidad (ya con la
 * posición y el cansancio), de `velocidadJugadorMin` a `velocidadJugadorMax` (FR-025: +20 → al menos +15 %).
 */
export function velocidadMaxima(estado: EstadoMotor, equipo: EquipoEstado, j: JugadorEnPartido): number {
  return velocidadDeStat(estado, atributoConBonus(estado, equipo, j, 'velocidad', bonusEquipo(estado, equipo, j)));
}

interface Movil {
  id: number;
  pos: PosicionMovil;
  vmax: number;
  objetivo: Punto;
  /** Posición prevista dentro de `ANTICIPACION` ticks si sigue a la misma velocidad. */
  px: number;
  py: number;
  fx: number;
  fy: number;
}

/** Ticks hacia delante con los que se anticipan los choques: da tiempo a apartarse con la aceleración. */
const ANTICIPACION = 6;

/**
 * Fuerzas de separación (barrido por x: solo se comparan los que están cerca en x). Se miden sobre las
 * posiciones previstas, para apartarse antes de cruzarse en vez de atravesarse.
 */
function separar(moviles: Movil[], radio: number): void {
  const alcance = radio * 2;
  moviles.sort((a, b) => a.px - b.px || a.id - b.id);
  for (let i = 0; i < moviles.length; i++) {
    const a = moviles[i]!;
    for (let k = i + 1; k < moviles.length; k++) {
      const b = moviles[k]!;
      const dx = b.px - a.px;
      if (dx > alcance) break;
      const dy = b.py - a.py;
      if (dy > alcance || dy < -alcance) continue;
      const d = isqrt(dx * dx + dy * dy);
      if (d >= alcance) continue;
      // Empuje proporcional a cuánto se meten en el radio de cada uno; si coinciden, se separan en y.
      const intensidad = (alcance - d) * 3;
      const [ex, ey] = d === 0 ? [0, a.id < b.id ? -intensidad : intensidad] : escalar(dx, dy, intensidad);
      a.fx -= ex;
      a.fy -= ey;
      b.fx += ex;
      b.fy += ey;
    }
  }
}

/** Un paso de movimiento (de `PASO_MOVIMIENTO` ticks) de todos los titulares hacia sus objetivos. */
export function moverJugadores(estado: EstadoMotor): void {
  const p = estado.parametros.espacio;
  const esp = estado.espacio;
  const dt = PASO_MOVIMIENTO;
  const moviles: Movil[] = [];
  const tick = estado.tick;
  const presionadores = esp.presion.presionadores;
  // En un córner, una falta al área o un penalti todos van a un sitio especial: todos tienen papel.
  const motivo = esp.accion?.tipo === 'saque' ? esp.accion.motivo : undefined;
  const balonParado = motivo === 'corner' || motivo === 'falta_area' || motivo === 'penalti';
  for (const lado of ['local', 'visitante'] as const) {
    const equipo = estado.equipos[lado];
    // La bonificación de equipo depende solo de la demarcación: una vez por equipo y paso.
    const bonus = bonusPorDemarcacion(estado, equipo);
    for (const j of equipo.jugadores) {
      if (!j.enCampo) continue;
      const pos = esp.jugadores[j.id];
      // Papeles en la jugada (receptor, el que conduce) por encima de la forma; sin objetivo aún, quieto.
      const destino = esp.destinos[j.id];
      const objetivo = destino ?? esp.objetivos[j.id];
      if (!pos) continue;
      // Quién tiene un papel en la jugada (para saber quién vuelve después a la forma).
      if (balonParado || destino || j.id === estado.balon.portadorId || presionadores.includes(j.id)) pos.papel = tick;
      if (!objetivo) continue;
      let vmax = velocidadDeStat(estado, atributoConBonus(estado, equipo, j, 'velocidad', bonus[j.jugador.demarcacion]));
      if (estado.balon.portadorId === j.id && estado.balon.posesion === lado) vmax = Math.round(vmax * p.factorVelocidadConBalon);
      moviles.push({ id: j.id, pos, vmax, objetivo, px: pos.x + pos.vx * ANTICIPACION, py: pos.y + pos.vy * ANTICIPACION, fx: 0, fy: 0 });
    }
  }
  separar(moviles, p.radioSeparacion);
  const radioFrenada = 2 * p.frenada;
  for (const m of moviles) {
    const pos = m.pos;
    const dx = m.objetivo.x - pos.x;
    const dy = m.objetivo.y - pos.y;
    const d = isqrt(dx * dx + dy * dy);
    // Llegada suave: la velocidad deseada baja al acercarse, para frenar a tiempo.
    const rapidez = Math.min(m.vmax, isqrt(dividir(radioFrenada * d, dt)));
    let deseadaX = m.fx;
    let deseadaY = m.fy;
    if (d > 0) {
      deseadaX += dividir(dx * rapidez, d);
      deseadaY += dividir(dy * rapidez, d);
    }
    // Frena antes de las líneas del campo, con margen, en vez de chocar con ellas.
    if (deseadaX > 0) deseadaX = Math.min(deseadaX, isqrt(dividir(p.frenada * (LARGO - pos.x), dt)));
    else if (deseadaX < 0) deseadaX = Math.max(deseadaX, -isqrt(dividir(p.frenada * pos.x, dt)));
    if (deseadaY > 0) deseadaY = Math.min(deseadaY, isqrt(dividir(p.frenada * (ANCHO - pos.y), dt)));
    else if (deseadaY < 0) deseadaY = Math.max(deseadaY, -isqrt(dividir(p.frenada * pos.y, dt)));
    const vmax2 = m.vmax * m.vmax;
    let n2 = deseadaX * deseadaX + deseadaY * deseadaY;
    if (n2 > vmax2) {
      const n = isqrt(n2);
      deseadaX = dividir(deseadaX * m.vmax, n);
      deseadaY = dividir(deseadaY * m.vmax, n);
      n2 = deseadaX * deseadaX + deseadaY * deseadaY;
    }
    // Aceleración o frenada máximas por tick (por `dt` ticks en este paso).
    const frenando = n2 < pos.vx * pos.vx + pos.vy * pos.vy;
    const maxCambio = (frenando ? p.frenada : p.aceleracion) * dt;
    let cx = deseadaX - pos.vx;
    let cy = deseadaY - pos.vy;
    const c2 = cx * cx + cy * cy;
    if (c2 > maxCambio * maxCambio) {
      const c = isqrt(c2);
      cx = dividir(cx * maxCambio, c);
      cy = dividir(cy * maxCambio, c);
    }
    let vx = pos.vx + cx;
    let vy = pos.vy + cy;
    const v2 = vx * vx + vy * vy;
    // Si baja su velocidad máxima (al recibir el balón, con el cansancio), el freno del paso ya lo acerca a
    // ella; solo se evita que acelere por encima de la que llevaba.
    const vAntes2 = pos.vx * pos.vx + pos.vy * pos.vy;
    if (v2 > vmax2 && v2 > vAntes2) {
      const v = isqrt(v2);
      const objetivo = Math.max(m.vmax, isqrt(vAntes2));
      vx = dividir(vx * objetivo, v);
      vy = dividir(vy * objetivo, v);
    }
    const x = acotar(pos.x + vx * dt, 0, LARGO);
    const y = acotar(pos.y + vy * dt, 0, ANCHO);
    // Si la línea del campo lo frena, su velocidad real es la que ha podido recorrer.
    pos.vx = dividir(x - pos.x, dt);
    pos.vy = dividir(y - pos.y, dt);
    pos.x = x;
    pos.y = y;
  }
}
