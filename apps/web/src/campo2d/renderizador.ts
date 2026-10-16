/**
 * Dibujo del partido 2D en un Canvas (T137; FR-048): el campo, los jugadores como círculos con los
 * colores de la equipación que usa su equipo en este partido (de `partido.inicio.equipaciones`), con el
 * dorsal dentro y el nombre debajo, el balón, el marcador y el minuto.
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
  /** Texto superpuesto (descanso, esperando al rival…). */
  aviso?: string | null;
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
  for (const [id, [x, y]] of escena.posiciones.jugadores) {
    const j = escena.jugadores.get(id);
    if (!j) continue;
    const colores = escena.equipaciones[j.lado];
    ctx.beginPath();
    ctx.arc(x * e, y * e, radio, 0, Math.PI * 2);
    ctx.fillStyle = colores.principal;
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, 3 * e);
    ctx.strokeStyle = colores.secundario;
    ctx.stroke();
    if (j.dorsal !== null) {
      ctx.font = `800 ${tamDorsal}px system-ui, sans-serif`;
      ctx.fillStyle = colores.secundario;
      ctx.fillText(String(j.dorsal), x * e, y * e + 1);
    }
    if (ancho >= 480) texto(ctx, j.nombre, x * e, y * e + radio + tamNombre * 0.8, tamNombre);
  }

  // Balón.
  const [bx, by] = escena.posiciones.balon;
  ctx.beginPath();
  ctx.arc(bx * e, by * e, Math.max(4, 7 * e), 0, Math.PI * 2);
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

  if (escena.aviso) {
    const t = Math.max(14, 26 * e);
    texto(ctx, escena.aviso, ancho / 2, (ANCHO * e) / 2, t);
  }
  ctx.restore();
}
