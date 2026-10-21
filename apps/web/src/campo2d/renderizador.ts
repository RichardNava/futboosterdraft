/**
 * Dibujo del partido 2D en un Canvas (FR-048, FR-023): el campo, los jugadores como chapas con los colores
 * de la equipación que usa su equipo en este partido (de `partido.inicio.equipaciones`), con el dorsal
 * dentro, el nombre debajo y una muesca hacia donde corren; el balón con su sombra y un tamaño según su
 * altura; el marcador, el minuto, el rótulo breve de la acción en curso y los avisos («¡Gol!», descanso…).
 * En la tanda de penaltis solo se ven el lanzador, el portero y el balón.
 *
 * Las coordenadas del motor son 0–1000 (largo) × 0–640 (ancho); se escalan al tamaño del lienzo.
 */
import { colorDorsal, patronDiseno, principal, type Equipacion } from '@fbd/domain';
import { colorToken, necesitaContorno } from '../componentes/colores';
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
  /** Equipaciones v2 del partido (spec 003, FR-045, FR-046). */
  equipaciones: Record<'local' | 'visitante', Equipacion>;
  marcador: { local: number; visitante: number };
  nombres: { local: string; visitante: string };
  minuto: string;
  /** Texto superpuesto («¡Gol!», descanso, «Cargando…»). */
  aviso?: string | null;
  /** Rótulo breve de la acción en curso («Pase», «Centro»…). */
  accion?: string | null;
  /** Tanda de penaltis: el lanzamiento en curso, con su avance de 0 a 1. */
  tanda?: Lanzamiento | null;
  /** Colores y letra de la interfaz, leídos de los tokens al montar el lienzo (spec 004, research R6). */
  interfaz?: ColoresInterfaz;
  /** Marcador dibujado sobre el campo; sin él cuando la pantalla tiene su franja (spec 004, FR-020). */
  marcadorEnCampo?: boolean;
}

/** Lo que el lienzo pinta con los colores de la interfaz: textos, rótulos, contornos y letra. */
export interface ColoresInterfaz {
  texto: string;
  lienzo: string;
  velo: string;
  contorno: string;
  letra: string;
}

/**
 * Lee de `tokens.css` los colores y la letra de la interfaz (spec 004, research R6, FR-037). El césped y las líneas
 * son el objeto de juego y siguen como constantes del renderizador.
 */
export function leerColoresInterfaz(): ColoresInterfaz {
  const letra = typeof document === 'undefined' ? '' : getComputedStyle(document.documentElement).getPropertyValue('--letra-texto').trim();
  return {
    texto: colorToken('--color-texto'),
    lienzo: colorToken('--color-lienzo'),
    velo: colorToken('--color-velo') || 'rgb(0 0 0 / 70%)',
    contorno: colorToken('--color-borde-control'),
    letra: letra || 'system-ui, sans-serif',
  };
}

const INTERFAZ_POR_DEFECTO: ColoresInterfaz = {
  texto: '#ffffff',
  lienzo: '#111111',
  velo: 'rgb(0 0 0 / 70%)',
  contorno: '#8a8a8d',
  letra: 'system-ui, sans-serif',
};

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
/** Lado de la tesela de textura del césped, en píxeles del dispositivo. */
const TESELA = 160;

/**
 * Tesela de textura del césped (spec 004, FR-050): grano fino de luz y sombra y briznas cortas en tonos de verde,
 * con una semilla fija para que el campo sea siempre el mismo.
 */
function teselaCesped(): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const tesela = document.createElement('canvas');
  tesela.width = TESELA;
  tesela.height = TESELA;
  const ctx = tesela.getContext('2d');
  if (!ctx) return null;
  let semilla = 0x2f7d3b;
  const azar = () => {
    semilla = (semilla * 1664525 + 1013904223) >>> 0;
    return semilla / 2 ** 32;
  };
  const grano = ctx.createImageData(TESELA, TESELA);
  for (let i = 0; i < grano.data.length; i += 4) {
    const claro = azar() < 0.5;
    grano.data[i] = claro ? 210 : 0;
    grano.data[i + 1] = claro ? 255 : 20;
    grano.data[i + 2] = claro ? 190 : 0;
    grano.data[i + 3] = Math.round(azar() * 26);
  }
  ctx.putImageData(grano, 0, 0);
  // Briznas: trazos cortos casi verticales, unos más claros y otros más oscuros que el césped.
  ctx.lineCap = 'round';
  for (let i = 0; i < 900; i++) {
    const x = azar() * TESELA;
    const y = azar() * TESELA;
    const largo = 2 + azar() * 4;
    const giro = (azar() - 0.5) * 0.9;
    ctx.strokeStyle = azar() < 0.5 ? `rgb(190 240 170 / ${4 + azar() * 9}%)` : `rgb(0 30 8 / ${8 + azar() * 14}%)`;
    ctx.lineWidth = 0.6 + azar() * 0.8;
    ctx.beginPath();
    // Repetida en los bordes para que la tesela empalme sin costuras.
    for (const [dx, dy] of [[0, 0], [-TESELA, 0], [0, -TESELA], [-TESELA, -TESELA]] as const) {
      ctx.moveTo(x + dx, y + dy);
      ctx.lineTo(x + dx + Math.sin(giro) * largo, y + dy - Math.cos(giro) * largo);
    }
    ctx.stroke();
  }
  return tesela;
}

let tesela: HTMLCanvasElement | null | undefined;

function campo(ctx: CanvasRenderingContext2D, e: number, ratio: number): void {
  const ancho = LARGO * e;
  const alto = ANCHO * e;
  // Franjas del corte, cada una con un brillo hacia un lado, como el césped segado en sentidos opuestos.
  for (let i = 0; i < 10; i++) {
    const x0 = (i * ancho) / 10;
    const brillo = ctx.createLinearGradient(x0, 0, x0 + ancho / 10, 0);
    const [base, claro] = i % 2 === 0 ? [CESPED_FRANJA, '#2e7a39'] : [CESPED, '#32833f'];
    brillo.addColorStop(i % 2 === 0 ? 0 : 1, base);
    brillo.addColorStop(i % 2 === 0 ? 1 : 0, claro);
    ctx.fillStyle = brillo;
    ctx.fillRect(x0, 0, ancho / 10 + 0.5, alto);
  }
  // Grano y briznas, a un píxel del dispositivo por píxel de la tesela.
  if (tesela === undefined) tesela = teselaCesped();
  const patron = tesela ? ctx.createPattern(tesela, 'repeat') : null;
  if (patron) {
    patron.setTransform(new DOMMatrix([1 / ratio, 0, 0, 1 / ratio, 0, 0]));
    ctx.fillStyle = patron;
    ctx.fillRect(0, 0, ancho, alto);
  }
  // Luz de los focos desde arriba y viñeta hacia las esquinas.
  const foco = ctx.createLinearGradient(0, 0, 0, alto);
  foco.addColorStop(0, 'rgb(255 241 201 / 7%)');
  foco.addColorStop(0.45, 'rgb(255 241 201 / 0%)');
  ctx.fillStyle = foco;
  ctx.fillRect(0, 0, ancho, alto);
  const vineta = ctx.createRadialGradient(ancho / 2, alto / 2, alto * 0.35, ancho / 2, alto / 2, ancho * 0.62);
  vineta.addColorStop(0, 'rgb(0 0 0 / 0%)');
  vineta.addColorStop(1, 'rgb(0 0 0 / 30%)');
  ctx.fillStyle = vineta;
  ctx.fillRect(0, 0, ancho, alto);

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

/** El campo se dibuja una vez por tamaño en un lienzo aparte y en cada fotograma solo se copia. */
let fondo: { lienzo: HTMLCanvasElement; ancho: number; ratio: number } | null = null;

function fondoCampo(ctx: CanvasRenderingContext2D, ancho: number): void {
  const ratio = ctx.getTransform().a || 1;
  const e = ancho / LARGO;
  if (typeof document === 'undefined') return campo(ctx, e, ratio);
  if (!fondo || fondo.ancho !== ancho || fondo.ratio !== ratio) {
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(ancho * ratio);
    lienzo.height = Math.round(ANCHO * e * ratio);
    const octx = lienzo.getContext('2d');
    if (!octx) return campo(ctx, e, ratio);
    octx.scale(ratio, ratio);
    campo(octx, e, ratio);
    fondo = { lienzo, ancho, ratio };
  }
  ctx.drawImage(fondo.lienzo, 0, 0, ancho, ANCHO * e);
}

/** Texto con borde oscuro para que se lea sobre el césped y sobre cualquier color de equipación. */
function texto(ctx: CanvasRenderingContext2D, t: string, x: number, y: number, tam: number, interfaz: ColoresInterfaz): void {
  ctx.font = `600 ${tam}px ${interfaz.letra}`;
  ctx.lineWidth = Math.max(2, tam / 4);
  ctx.strokeStyle = interfaz.velo;
  ctx.strokeText(t, x, y);
  ctx.fillStyle = interfaz.texto;
  ctx.fillText(t, x, y);
}

/** Dibuja la escena completa. `ancho` es el ancho en píxeles CSS del lienzo; el alto se deduce. */
export function dibujar(ctx: CanvasRenderingContext2D, ancho: number, escena: Escena): void {
  const e = ancho / LARGO;
  const interfaz = escena.interfaz ?? INTERFAZ_POR_DEFECTO;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fondoCampo(ctx, ancho);

  const radio = Math.max(7, 15 * e);
  const tamDorsal = Math.max(8, radio * 0.95);
  const tamNombre = Math.max(8, 11 * e);
  const chapa = (id: number, x: number, y: number, vx: number, vy: number) => {
    const j = escena.jugadores.get(id);
    if (!j) return;
    const equipacion = escena.equipaciones[j.lado];
    const colores = { principal: principal(equipacion), secundario: colorDorsal(equipacion) };
    // Círculo con el patrón del diseño recortado dentro (el mismo de la vista previa, `patronDiseno`).
    ctx.save();
    ctx.beginPath();
    ctx.arc(x * e, y * e, radio, 0, Math.PI * 2);
    ctx.clip();
    const [x0, y0, lado] = [x * e - radio, y * e - radio, radio * 2];
    for (const r of patronDiseno(equipacion)) {
      ctx.beginPath();
      r.puntos.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(x0 + px * lado, y0 + py * lado) : ctx.lineTo(x0 + px * lado, y0 + py * lado)));
      ctx.closePath();
      ctx.fillStyle = r.color;
      ctx.fill();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(x * e, y * e, radio, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(1.5, 3 * e);
    ctx.strokeStyle = colores.secundario;
    ctx.stroke();
    // Equipación que se confunde con el césped: contorno claro por fuera (FR-034, research R11).
    if (necesitaContorno(colores.principal, CESPED)) {
      ctx.beginPath();
      ctx.arc(x * e, y * e, radio + Math.max(1, 1.5 * e), 0, Math.PI * 2);
      ctx.lineWidth = Math.max(1, 2 * e);
      ctx.strokeStyle = interfaz.contorno;
      ctx.stroke();
    }
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
      ctx.font = `600 ${tamDorsal}px ${interfaz.letra}`;
      // Contorno con el principal: el dorsal se lee también sobre las rayas o franjas del segundo color (T129).
      ctx.lineWidth = Math.max(2, tamDorsal * 0.18);
      ctx.strokeStyle = colores.principal;
      ctx.strokeText(String(j.dorsal), x * e, y * e + 1);
      ctx.fillStyle = colores.secundario;
      ctx.fillText(String(j.dorsal), x * e, y * e + 1);
    }
    if (ancho >= 480) texto(ctx, j.nombre, x * e, y * e + radio + tamNombre * 0.8, tamNombre, interfaz);
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
  ctx.fillStyle = interfaz.texto;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = interfaz.lienzo;
  ctx.stroke();

  // Marcador y minuto, arriba en el centro (solo si la pantalla no tiene su franja).
  if (escena.marcadorEnCampo !== false) {
    const tam = Math.max(12, 20 * e);
    const marcador = `${escena.nombres.local} ${escena.marcador.local} – ${escena.marcador.visitante} ${escena.nombres.visitante}`;
    ctx.font = `600 ${tam}px ${interfaz.letra}`;
    const w = ctx.measureText(marcador).width + 140 * e;
    ctx.fillStyle = interfaz.velo;
    ctx.fillRect((ancho - w) / 2, 10 * e, w, tam * 1.6);
    texto(ctx, `${marcador}   ${escena.minuto}`, ancho / 2, 10 * e + tam * 0.8, tam, interfaz);
  }

  if (escena.accion) {
    ctx.textAlign = 'left';
    texto(ctx, escena.accion, 16 * e, ANCHO * e - 22 * e, Math.max(10, 16 * e), interfaz);
    ctx.textAlign = 'center';
  }

  if (escena.aviso) {
    const t = Math.max(14, 26 * e);
    texto(ctx, escena.aviso, ancho / 2, (ANCHO * e) / 2, t, interfaz);
  }
  ctx.restore();
}
