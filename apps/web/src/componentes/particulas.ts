/**
 * Partículas en Canvas 2D para la apertura de sobres (spec 003, FR-011, FR-013; research R21), sin librerías.
 *
 * - Presupuesto de 6 ms por fotograma, medido con el reloj (`performance.now()` por defecto): si un fotograma lo
 *   supera, el máximo de partículas se reduce a la mitad.
 * - Si durante 500 ms la media baja de 30 fotogramas por segundo, el sistema se desactiva: deja de pintar y no
 *   admite partículas nuevas. La aparición de las cartas nunca depende de esto.
 * - `detener()` cancela la animación y libera el canvas.
 *
 * El reloj y `requestAnimationFrame` se pueden inyectar (pruebas).
 */
export const PRESUPUESTO_MS = 6;
export const FPS_MINIMO = 30;
export const VENTANA_FPS_MS = 500;
const MAXIMO_INICIAL = 240;

export interface OpcionesParticulas {
  ahora?: () => number;
  pedirFotograma?: (cb: (t: number) => void) => number;
  cancelarFotograma?: (id: number) => void;
  maximo?: number;
}

interface Particula {
  x: number;
  y: number;
  vx: number;
  vy: number;
  vida: number;
  color: string;
}

export interface SistemaParticulas {
  emitir(x: number, y: number, color: string, n: number): void;
  detener(): void;
  /** Estado para pruebas y diagnóstico. */
  readonly estado: { activo: boolean; maximo: number; particulas: number; detenido: boolean };
}

export function iniciarParticulas(canvas: HTMLCanvasElement, opciones: OpcionesParticulas = {}): SistemaParticulas {
  const ahora = opciones.ahora ?? (() => performance.now());
  const pedir = opciones.pedirFotograma ?? ((cb) => requestAnimationFrame(cb));
  const cancelar = opciones.cancelarFotograma ?? ((id) => cancelAnimationFrame(id));
  let ctx: CanvasRenderingContext2D | null = canvas.getContext('2d');
  let particulas: Particula[] = [];
  let maximo = opciones.maximo ?? MAXIMO_INICIAL;
  let activo = ctx !== null;
  let detenido = false;
  let peticion: number | null = null;
  let anterior: number | null = null;
  // Fotogramas en la ventana actual para medir los fps.
  let inicioVentana: number | null = null;
  let fotogramasVentana = 0;

  const fotograma = () => {
    peticion = null;
    if (detenido || !activo || !ctx) return;
    const t0 = ahora();
    if (inicioVentana === null) inicioVentana = t0;
    fotogramasVentana++;
    const dt = anterior === null ? 16 : Math.min(50, t0 - anterior);
    anterior = t0;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const vivas: Particula[] = [];
    for (const p of particulas) {
      p.vida -= dt;
      if (p.vida <= 0) continue;
      p.vy += 0.0006 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      ctx.globalAlpha = Math.min(1, p.vida / 400);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 3, 3);
      vivas.push(p);
    }
    ctx.globalAlpha = 1;
    particulas = vivas;

    // Presupuesto del fotograma: si se pasa, la mitad de partículas.
    const coste = ahora() - t0;
    if (coste > PRESUPUESTO_MS) {
      maximo = Math.max(1, Math.floor(maximo / 2));
      if (particulas.length > maximo) particulas = particulas.slice(particulas.length - maximo);
    }
    // Por debajo de 30 fps durante 500 ms, se desactiva.
    const transcurrido = t0 - inicioVentana;
    if (transcurrido >= VENTANA_FPS_MS) {
      const fps = (fotogramasVentana * 1000) / transcurrido;
      if (fps < FPS_MINIMO) {
        activo = false;
        particulas = [];
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      inicioVentana = t0;
      fotogramasVentana = 0;
    }
    if (particulas.length > 0) peticion = pedir(fotograma);
  };

  const sistema: SistemaParticulas = {
    emitir(x, y, color, n) {
      if (detenido || !activo) return;
      for (let i = 0; i < n && particulas.length < maximo; i++) {
        const angulo = (2 * Math.PI * i) / Math.max(1, n) + (i % 3) * 0.3;
        const rapidez = 0.08 + ((i * 37) % 10) / 60;
        particulas.push({ x, y, vx: Math.cos(angulo) * rapidez, vy: Math.sin(angulo) * rapidez - 0.1, vida: 500 + ((i * 53) % 400), color });
      }
      if (peticion === null && particulas.length > 0) peticion = pedir(fotograma);
    },
    detener() {
      detenido = true;
      if (peticion !== null) cancelar(peticion);
      peticion = null;
      particulas = [];
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      ctx = null;
      // Libera la memoria del lienzo.
      canvas.width = 0;
      canvas.height = 0;
    },
    get estado() {
      return { activo, maximo, particulas: particulas.length, detenido };
    },
  };
  return sistema;
}
