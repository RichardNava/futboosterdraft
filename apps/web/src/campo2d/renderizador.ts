/**
 * Dibujo del partido 2D en un Canvas (FR-048, FR-023): el campo, los jugadores como chapas con los colores
 * de la equipación que usa su equipo en este partido (de `partido.inicio.equipaciones`), con el dorsal
 * dentro, el nombre debajo y una muesca hacia donde corren; el balón con su sombra y un tamaño según su
 * altura; el marcador, el minuto, el rótulo breve de la acción en curso y los avisos («¡GOL!», descanso…).
 * En la tanda de penaltis solo se ven el lanzador, el portero y el balón.
 *
 * Las coordenadas del motor son 0–1000 (largo) × 0–640 (ancho); se escalan al tamaño del lienzo.
 */
import type { Posiciones } from './interpolacion';

export const LARGO = 1000;
export const ANCHO = 640;

export interface JugadorDibujo {
  lado: 'local' | 'visitante';
  dorsal: number | null;
  nombre: string;
}

export interface Escena {
  posiciones: Posiciones;
  jugadores: ReadonlyMap<number, JugadorDibujo>;
  equipaciones: Record<'local' | 'visitante', { principal: string; secundario: string }>;
  marcador: { local: number; visitante: number };
  nombres: { local: string; visitante: string };
  minuto: string;
  /** Texto superpuesto («¡GOL!», descanso, «Cargando…»). */
  aviso?: string | null;
  /** Rótulo breve de la acción en curso («Pase», «Centro»…). */
  accion?: string | null;
  /** Tanda de penaltis: el lanzamiento en curso, con su avance de 0 a 1. */
  tanda?: Lanzamiento | null;
}

export interface Lanzamiento {
  lanzadorId: number;
  porteroId: number | null;
  /** Hacia qué portería se tira (la de x = 1000 o la de x = 0). */
  haciaDerecha: boolean;
  gol: boolean;
  progreso: number;
}

const CESPED = '#2f7d3b';
const CESPED_FRANJA = '#2b7336';
const LINEAS = 'rgb(255 255 255 / 85%)';

function campo(ctx: CanvasRenderingContext2D, e: number): void {
  const ancho = LARGO * e;
  const alto = ANCHO * e;
  ctx.fillStyle = CESPED;
  ctx.fillRect(0, 0, ancho, alto);
  ctx.fillStyle = CESPED_FRANJA;
  for (let i = 0; i < 10; i += 2) ctx.fillRect((i * ancho) / 10, 0, ancho / 10, alto);

  ctx.strokeStyle = LINEAS;
  ctx.lineWidth = Math.max(1, 2 * e);
  const m = 8 * e;
  ctx.strokeRect(m, m, ancho - 2 * m, alto - 2 * m);
  ctx.beginPath();
  ctx.moveTo(ancho / 2, m);
  ctx.lineTo(ancho / 2, alto - m);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(ancho / 2, alto / 2, 70 * e, 0, Math.PI * 2);
  ctx.stroke();
  // Áreas grande y pequeña de cada lado.
  for (const x of [m, ancho - m]) {
    const dir = x === m ? 1 : -1;
    const grande = { largo: 160 * e, ancho: 380 * e };
    const pequena = { largo: 55 * e, ancho: 180 * e };
    ctx.strokeRect(dir === 1 ? x : x - grande.largo, (alto - grande.ancho) / 2, grande.largo, grande.ancho);
    ctx.strokeRect(dir === 1 ? x : x - pequena.largo, (alto - pequena.ancho) / 2, pequena.largo, pequena.ancho);
    ctx.fillStyle = LINEAS;
    ctx.fillRect(dir === 1 ? x - 6 * e : x, alto / 2 - 40 * e, 6 * e, 80 * e);
  }
}

/** Texto con borde oscuro para que se lea sobre el césped y sobre cualquier color de equipación. */
function texto(ctx: CanvasRenderingContext2D, t: string, x: number, y: number, tam: number, color = '#ffffff'): void {
  ctx.font = `700 ${tam}px system-ui, sans-serif`;
  ctx.lineWidth = Math.max(2, tam / 4);
  ctx.strokeStyle = 'rgb(0 0 0 / 70%)';
  ctx.strokeText(t, x, y);
  ctx.fillStyle = color;
  ctx.fillText(t, x, y);
}

/** Dibuja la escena completa. `ancho` es el ancho en píxeles CSS del lienzo; el alto se deduce. */
export function dibujar(ctx: CanvasRenderingContext2D, ancho: number, escena: Escena): void {
  const e = ancho / LARGO;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  campo(ctx, e);

  const radio = Math.max(7, 15 * e);
  const tamDorsal = Math.max(8, radio * 0.95);
  const tamNombre = Math.max(8, 11 * e);
  const chapa = (id: number, x: number, y: number, vx: number, vy: number) => {
    const j = escena.jugadores.get(id);
    if (!j) return;
    const colores = escena.equipaciones[j.lado];
    ctx.beginPath();
    ctx.arc(x * e, y * e, radio, 0, Math.PI * 2);
    ctx.fillStyle = colores.principal;
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, 3 * e);
    ctx.strokeStyle = colores.secundario;
    ctx.stroke();
    // Muesca hacia donde corre (solo si se mueve de verdad, para que no baile parado).
    const rapidez = Math.hypot(vx, vy);
    if (rapidez > 0.4) {
      const [ux, uy] = [vx / rapidez, vy / rapidez];
      const [cx, cy] = [x * e + ux * radio, y * e + uy * radio];
      const w = radio * 0.45;
      ctx.beginPath();
      ctx.moveTo(cx + ux * w * 0.9, cy + uy * w * 0.9);
      ctx.lineTo(cx - uy * w, cy + ux * w);
      ctx.lineTo(cx + uy * w, cy - ux * w);
      ctx.closePath();
      ctx.fillStyle = colores.secundario;
      ctx.fill();
    }
    if (j.dorsal !== null) {
      ctx.font = `800 ${tamDorsal}px system-ui, sans-serif`;
      ctx.fillStyle = colores.secundario;
      ctx.fillText(String(j.dorsal), x * e, y * e + 1);
    }
    if (ancho >= 480) texto(ctx, j.nombre, x * e, y * e + radio + tamNombre * 0.8, tamNombre);
  };

  let [bx, by, bz] = escena.posiciones.balon;
  if (escena.tanda) {
    // Tanda: el lanzador en el punto de penalti, el portero en su línea y el balón hacia la portería.
    const l = escena.tanda;
    const meta = l.haciaDerecha ? LARGO - 8 : 8;
    const punto = l.haciaDerecha ? LARGO - 110 : 110;
    const p = Math.min(1, Math.max(0, l.progreso));
    // El portero se lanza a un lado; el balón entra por el otro (gol) o acaba en sus manos (parada).
    const vuelo = Math.min(1, Math.max(0, (p - 0.3) / 0.4));
    const lado = l.gol ? -1 : 1;
    const porteroY = ANCHO / 2 + lado * 35 * vuelo;
    const destinoY = l.gol ? ANCHO / 2 + 30 : porteroY;
    const destinoX = l.gol ? meta + (l.haciaDerecha ? 4 : -4) : meta + (l.haciaDerecha ? -12 : 12);
    chapa(l.lanzadorId, punto + (l.haciaDerecha ? -30 : 30) * (1 - Math.min(1, p / 0.3)), ANCHO / 2, 0, 0);
    if (l.porteroId !== null) chapa(l.porteroId, meta + (l.haciaDerecha ? -10 : 10), porteroY, 0, 0);
    [bx, by, bz] = [punto + (destinoX - punto) * vuelo, ANCHO / 2 + (destinoY - ANCHO / 2) * vuelo, 0];
  } else {
    for (const [id, [x, y]] of escena.posiciones.jugadores) {
      const [vx, vy] = escena.posiciones.velocidades.get(id) ?? [0, 0];
      chapa(id, x, y, vx, vy);
    }
  }

  // Balón: la sombra en el suelo y el balón más arriba y más grande cuanto más alto va.
  const radioBalon = Math.max(4, 7 * e) * (1 + Math.min(bz, 60) / 60);
  ctx.beginPath();
  ctx.ellipse(bx * e, by * e, Math.max(3, 6 * e), Math.max(2, 3.5 * e), 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgb(0 0 0 / 35%)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bx * e, (by - bz * 0.6) * e, radioBalon, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#111111';
  ctx.stroke();

  // Marcador y minuto, arriba en el centro.
  const tam = Math.max(12, 20 * e);
  const marcador = `${escena.nombres.local} ${escena.marcador.local} – ${escena.marcador.visitante} ${escena.nombres.visitante}`;
  ctx.font = `700 ${tam}px system-ui, sans-serif`;
  const w = ctx.measureText(marcador).width + 140 * e;
  ctx.fillStyle = 'rgb(0 0 0 / 55%)';
  ctx.fillRect((ancho - w) / 2, 10 * e, w, tam * 1.6);
  texto(ctx, `${marcador}   ${escena.minuto}`, ancho / 2, 10 * e + tam * 0.8, tam);

  if (escena.accion) {
    ctx.textAlign = 'left';
    texto(ctx, escena.accion, 16 * e, ANCHO * e - 22 * e, Math.max(10, 16 * e));
    ctx.textAlign = 'center';
  }

  if (escena.aviso) {
    const t = Math.max(14, 26 * e);
    texto(ctx, escena.aviso, ancho / 2, (ANCHO * e) / 2, t);
  }
  ctx.restore();
}
