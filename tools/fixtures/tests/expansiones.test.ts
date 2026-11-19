/** Guion `expansiones` (spec 016, T028; research R7; contracts/datos-expansiones.md §2). */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { celdasDePagina, planificarExpansion, quitarCroma, rangoDePagina, soloMayorMancha } from '../src/expansiones';

const CROMA = [3, 252, 3];

describe('rejilla de retratos', () => {
  it('el rango sale del nombre de la página', () => {
    expect(rangoDePagina('pagina_1A_1_18.png')).toEqual({ desde: 1, hasta: 18 });
    expect(rangoDePagina('pagina_1C_1_6.png')).toEqual({ desde: 1, hasta: 6 });
    expect(rangoDePagina('pagina_1B_13_24.png')).toEqual({ desde: 13, hasta: 24 });
    expect(rangoDePagina('otra.png')).toBeNull();
    expect(rangoDePagina('pagina_1A_9_3.png')).toBeNull();
  });

  it('6 columnas y filas de un tercio del alto, leídas por filas: 18 → 3 filas, 6 → 1 fila', () => {
    const tres = celdasDePagina(1536, 1024, 1, 18);
    expect(tres).toHaveLength(18);
    expect(new Set(tres.map((c) => c.top))).toEqual(new Set([0, 341, 683]));
    expect(tres[6]).toMatchObject({ numero: 7, left: 0, top: 341 });
    expect(tres[5]).toMatchObject({ numero: 6, left: 1280, width: 256 });
    const una = celdasDePagina(1448, 1086, 19, 24);
    expect(una.map((c) => c.numero)).toEqual([19, 20, 21, 22, 23, 24]);
    expect(una.every((c) => c.top === 0 && c.height === 362)).toBe(true);
    // Las celdas cubren todo el ancho sin solaparse aunque no sea divisible entre 6.
    expect(una.reduce((a, c) => a + c.width, 0)).toBe(1448);
  });
});

describe('croma por inundación desde el borde', () => {
  /** 20 × 20 de croma con una «camiseta» verde (40, 170, 60) que toca el borde inferior y una cara en el centro. */
  function imagen(): Buffer {
    const ancho = 20;
    const p = Buffer.alloc(ancho * ancho * 4);
    for (let y = 0; y < ancho; y++) {
      for (let x = 0; x < ancho; x++) {
        const i = (y * ancho + x) * 4;
        const camiseta = y >= 15;
        const cara = !camiseta && x >= 6 && x < 14 && y >= 5;
        const borde = !camiseta && !cara && x >= 5 && x < 15 && y >= 4;
        const c = camiseta ? [40, 170, 60] : cara ? [220, 170, 140] : borde ? [140, 200, 90] : CROMA;
        p.set([...c, 255], i);
      }
    }
    return p;
  }
  const alfa = (p: Buffer, x: number, y: number) => p[(y * 20 + x) * 4 + 3];

  it('vuelve transparente el croma conectado al borde y conserva la camiseta verde que toca el borde', () => {
    const p = imagen();
    quitarCroma(p, 20, 20);
    expect(alfa(p, 0, 0)).toBe(0);
    expect(alfa(p, 19, 3)).toBe(0);
    expect(alfa(p, 2, 19)).toBe(255);
    expect(alfa(p, 10, 10)).toBe(255);
    expect(p[(19 * 20 + 2) * 4 + 1]).toBeLessThanOrEqual(170);
  });

  it('el despill deja G ≤ max(R, B) en el borde del recorte', () => {
    const p = imagen();
    quitarCroma(p, 20, 20);
    for (const [x, y] of [
      [5, 8],
      [14, 8],
      [10, 4],
    ] as const) {
      const i = (y * 20 + x) * 4;
      expect(p[i + 3]).toBeGreaterThan(0);
      expect(p[i + 1]!).toBeLessThanOrEqual(Math.max(p[i]!, p[i + 2]!));
    }
  });
});

describe('soloMayorMancha', () => {
  it('quita la tira de la fila de arriba que queda separada del retrato', () => {
    const p = Buffer.alloc(10 * 10 * 4);
    // Tira de 1 px arriba (y = 0) y retrato de 6 × 6 abajo, separados por una fila transparente.
    for (let x = 0; x < 10; x++) p[x * 4 + 3] = 255;
    for (let y = 3; y < 9; y++) for (let x = 2; x < 8; x++) p[(y * 10 + x) * 4 + 3] = 255;
    soloMayorMancha(p, 10, 10);
    expect(p[3]).toBe(0);
    expect(p[(5 * 10 + 5) * 4 + 3]).toBe(255);
  });
});

describe('comprobación del origen', () => {
  let dir: string;
  const png = (ruta: string, ancho: number, alto: number) =>
    sharp({ create: { width: ancho, height: alto, channels: 3, background: { r: 3, g: 252, b: 3 } } })
      .png()
      .toFile(ruta);

  /** Origen de 12 jugadores: una página de 12 retratos, 12 fondos y los carteles. */
  async function origen(fondos: number[]): Promise<string> {
    const raiz = mkdtempSync(join(dir, 'origen-'));
    const exp = join(raiz, 'Expansion A');
    for (const d of ['retratos', 'imagen_bg', 'cartel']) mkdirSync(join(exp, d), { recursive: true });
    writeFileSync(join(exp, 'jugadores_expansionA.json'), JSON.stringify(Array.from({ length: 12 }, (_, i) => ({ id: i + 1, nombre: `J${i + 1}`, web: [] }))));
    writeFileSync(join(exp, 'rareza_A.txt'), '');
    await png(join(exp, 'retratos', 'pagina_1A_1_12.png'), 60, 30);
    for (const n of fondos) await png(join(exp, 'imagen_bg', `${n}_Jugador_A.png`), 6, 9);
    await png(join(exp, 'cartel', 'cartel_shop_A.png'), 4, 6);
    await png(join(exp, 'cartel', 'icono_shop_A.png'), 4, 4);
    return raiz;
  }

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'fbd-expansiones-'));
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('un origen completo no da errores', async () => {
    const r = await planificarExpansion(await origen(Array.from({ length: 12 }, (_, i) => i + 1)), 'A');
    expect(r.errores).toEqual([]);
    expect(r.plan!.retratos).toHaveLength(12);
    expect(r.plan!.fondos.size).toBe(12);
  });

  it('con un fondo de menos, uno de más o un retrato de más, lo lista y no da plan', async () => {
    const menos = await planificarExpansion(await origen(Array.from({ length: 11 }, (_, i) => i + 1)), 'A');
    expect(menos.plan).toBeNull();
    expect(menos.errores).toContain('A: falta el fondo 12');

    const mas = await planificarExpansion(await origen(Array.from({ length: 13 }, (_, i) => i + 1)), 'A');
    expect(mas.errores).toContain('A: sobra el fondo 13_Jugador_A.png');

    const raiz = await origen(Array.from({ length: 12 }, (_, i) => i + 1));
    await png(join(raiz, 'Expansion A', 'retratos', 'pagina_1A_12_13.png'), 60, 30);
    const r = await planificarExpansion(raiz, 'A');
    expect(r.plan).toBeNull();
    expect(r.errores.some((e) => e.includes('el retrato 12 está en'))).toBe(true);
    expect(r.errores.some((e) => e.includes('llega al 13'))).toBe(true);
  });
});
