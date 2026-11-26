/**
 * Movimiento de los jugadores (research R3; FR-023 "movimiento natural"): cada chapa va hacia su objetivo
 * con una velocidad máxima que depende de su stat de velocidad y de la energía, acelera y frena de forma
 * progresiva, y se separa de las demás para no atravesarlas ni amontonarse. Enteros en décimas.
 *
 * La dirección, la velocidad y la separación se deciden cada `PASO_MOVIMIENTO` ticks, y la posición avanza a medio paso
 * (cada 2 ticks, los de los fotogramas): así la 2D no ve paradas alternas (spec 018, R7). El balón se mueve en cada tick.
 */
import type { EquipoEstado, EstadoMotor, JugadorEnPartido, PosicionMovil } from '../estado/estado';
import { atributoConBonus } from '../modificadores/atributos';
import { gastarAccion } from '../modificadores/cansancio';
import { bonusEquipo, bonusPorDemarcacion } from '../modificadores/virtudes';
import { acotar, dividir, escalar, isqrt } from './aritmetica';
import { ANCHO, LARGO, type Punto } from './geometria';

/** Ticks entre dos decisiones de movimiento de los jugadores. */
export const PASO_MOVIMIENTO = 4;
/** Ticks que avanza la posición en cada mitad del paso. */
const MEDIO_PASO = 2;

function velocidadDeStat(estado: EstadoMotor, stat: number): number {
  const p = estado.parametros.espacio;
  const s = acotar(Math.round(stat), p.statVelocidadMin, p.statVelocidadMax);
  return p.velocidadJugadorMin + dividir((s - p.statVelocidadMin) * (p.velocidadJugadorMax - p.velocidadJugadorMin), p.statVelocidadMax - p.statVelocidadMin);
}

/**
 * Velocidad máxima de un jugador, en décimas por tick: lineal con su atributo de velocidad (ya con la
 * posición y la energía), de `velocidadJugadorMin` a `velocidadJugadorMax` (FR-025: +20 → al menos +15 %).
 */
export function velocidadMaxima(estado: EstadoMotor, equipo: EquipoEstado, j: JugadorEnPartido): number {
  return velocidadDeStat(estado, atributoConBonus(estado, equipo, j, 'velocidad', bonusEquipo(estado, equipo, j)));
}

interface Movil {
  id: number;
  j: JugadorEnPartido;
  equipo: EquipoEstado;
  pos: PosicionMovil;
  vmax: number;
  /** Multiplicador de la velocidad, la aceleración y la frenada (colocación en un balón parado, spec 015). */
  escala: number;
  objetivo: Punto;
  /** Posición prevista dentro de `ANTICIPACION` ticks si sigue a la misma velocidad. */
  px: number;
  py: number;
  fx: number;
  fy: number;
}

/** Ticks hacia delante con los que se anticipan los choques: hasta la siguiente decisión de movimiento (spec 018, R7). */
const ANTICIPACION = PASO_MOVIMIENTO;

/**
 * Fuerzas de separación (barrido por x: solo se comparan los que están cerca en x). Se miden sobre las
 * posiciones previstas, para apartarse antes de cruzarse en vez de atravesarse.
 */
function separar(moviles: Movil[], radio: number): void {
  const alcance = radio * 2;
  // Inserción (ids únicos: el mismo orden que `sort`), más barata que `sort` con 22 elementos.
  for (let i = 1; i < moviles.length; i++) {
    const m = moviles[i]!;
    let k = i - 1;
    while (k >= 0 && (moviles[k]!.px > m.px || (moviles[k]!.px === m.px && moviles[k]!.id > m.id))) {
      moviles[k + 1] = moviles[k]!;
      k--;
    }
    moviles[k + 1] = m;
  }
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
  const umbralSprint = estado.parametros.fatiga.umbralSprint;
  const moviles: Movil[] = [];
  const tick = estado.tick;
  const presionadores = esp.presion.presionadores;
  // En un córner, una falta al área o un penalti todos van a un sitio especial: todos tienen papel.
  const motivo = esp.accion?.tipo === 'saque' ? esp.accion.motivo : undefined;
  const balonParado = motivo === 'corner' || motivo === 'falta_area' || motivo === 'penalti';
  // Spec 015 (balones fuera): en el córner todos se colocan más deprisa, a la escala del reloj (acelerar y frenar también),
  // y en el saque de banda, el que saca.
  const colocacion = estado.parametros.fueraDeCampo.velocidadColocacion;
  const sacadorBanda = motivo === 'banda' ? esp.accion?.deId : undefined;
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
      if (!objetivo) {
        // Sin objetivo se queda quieto: el medio paso no debe arrastrar una velocidad antigua.
        pos.vx = 0;
        pos.vy = 0;
        continue;
      }
      let vmax = velocidadDeStat(estado, atributoConBonus(estado, equipo, j, 'velocidad', bonus[j.jugador.demarcacion]));
      if (estado.balon.portadorId === j.id && estado.balon.posesion === lado) vmax = Math.round(vmax * p.factorVelocidadConBalon);
      // El que va a sacar una reanudación acude a la carrera (spec 014, FR-001): el saque espera a que llegue.
      if (esp.accion?.tipo === 'saque' && esp.accion.deId === j.id) vmax = p.velocidadJugadorMax;
      const escala = motivo === 'corner' || sacadorBanda === j.id ? colocacion : 1;
      if (escala !== 1) vmax = Math.round(vmax * escala);
      moviles.push({ id: j.id, j, equipo, pos, vmax, escala, objetivo, px: pos.x + pos.vx * ANTICIPACION, py: pos.y + pos.vy * ANTICIPACION, fx: 0, fy: 0 });
    }
  }
  separar(moviles, p.radioSeparacion);
  for (const m of moviles) {
    const pos = m.pos;
    const dx = m.objetivo.x - pos.x;
    const dy = m.objetivo.y - pos.y;
    const d = isqrt(dx * dx + dy * dy);
    // Llegada suave: la velocidad deseada baja al acercarse, para frenar a tiempo.
    const radioFrenada = Math.round(2 * p.frenada * m.escala);
    const rapidez = Math.min(m.vmax, isqrt(dividir(radioFrenada * d, dt)));
    let deseadaX = m.fx;
    let deseadaY = m.fy;
    if (d > 0) {
      deseadaX += dividir(dx * rapidez, d);
      deseadaY += dividir(dy * rapidez, d);
    }
    // Quien va a sacar rodea, hacia el centro del campo, a quien le tapa en línea recta: ahí la separación no tiene
    // componente lateral y se quedaría parado hasta agotar la espera.
    if (d > 0 && esp.accion?.tipo === 'saque' && esp.accion.deId === m.id && dx * m.fy === dy * m.fx && dx * m.fx + dy * m.fy < 0) {
      const lado = dx * (ANCHO / 2 - pos.y) - dy * (LARGO / 2 - pos.x) >= 0 ? 1 : -1;
      deseadaX -= lado * dividir(dy * rapidez, d);
      deseadaY += lado * dividir(dx * rapidez, d);
    }
    // Frena antes de las líneas del campo, con margen, en vez de chocar con ellas.
    const frenada = Math.round(p.frenada * m.escala);
    if (deseadaX > 0) deseadaX = Math.min(deseadaX, isqrt(dividir(frenada * (LARGO - pos.x), dt)));
    else if (deseadaX < 0) deseadaX = Math.max(deseadaX, -isqrt(dividir(frenada * pos.x, dt)));
    if (deseadaY > 0) deseadaY = Math.min(deseadaY, isqrt(dividir(frenada * (ANCHO - pos.y), dt)));
    else if (deseadaY < 0) deseadaY = Math.max(deseadaY, -isqrt(dividir(frenada * pos.y, dt)));
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
    const maxCambio = Math.round((frenando ? p.frenada : p.aceleracion) * dt * m.escala);
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
    // Si baja su velocidad máxima (al recibir el balón, con la energía), el freno del paso ya lo acerca a
    // ella; solo se evita que acelere por encima de la que llevaba.
    const vAntes2 = pos.vx * pos.vx + pos.vy * pos.vy;
    if (v2 > vmax2 && v2 > vAntes2) {
      const v = isqrt(v2);
      const objetivo = Math.max(m.vmax, isqrt(vAntes2));
      vx = dividir(vx * objetivo, v);
      vy = dividir(vy * objetivo, v);
    }
    // Sprint: cuenta al entrar en él, para que el coste no dependa de la cadencia (spec 018, R4).
    const umbral = umbralSprint * m.vmax;
    const sprint = umbral > 0 && vx * vx + vy * vy >= umbral * umbral;
    if (sprint && !pos.sprint) gastarAccion(estado, m.equipo, m.j, 'sprint');
    if (sprint !== (pos.sprint ?? false)) pos.sprint = sprint;
    pos.vx = vx;
    pos.vy = vy;
    avanzarPosicion(pos);
  }
}

/** Avanza `MEDIO_PASO` ticks; si la línea del campo lo frena, su velocidad real es la que ha podido recorrer. */
function avanzarPosicion(pos: PosicionMovil): void {
  const x = acotar(pos.x + pos.vx * MEDIO_PASO, 0, LARGO);
  const y = acotar(pos.y + pos.vy * MEDIO_PASO, 0, ANCHO);
  pos.vx = dividir(x - pos.x, MEDIO_PASO);
  pos.vy = dividir(y - pos.y, MEDIO_PASO);
  pos.x = x;
  pos.y = y;
}

/** Segunda mitad del paso: avanza con la velocidad ya decidida, sin recalcular nada. */
export function avanzarMedioPaso(estado: EstadoMotor): void {
  const posiciones = estado.espacio.jugadores;
  for (const equipo of [estado.equipos.local, estado.equipos.visitante]) {
    for (const j of equipo.jugadores) {
      const pos = posiciones[j.id];
      if (pos && (pos.vx !== 0 || pos.vy !== 0)) avanzarPosicion(pos);
    }
  }
}
