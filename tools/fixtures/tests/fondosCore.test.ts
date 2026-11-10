import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { beforeEach, describe, expect, it } from 'vitest';
import { fondosCore } from '../src/fondosCore';

// Ficha mínima con el formato a mano de core-real.json (arrays en una línea) para comprobar que no se reformatea.
const ficha = (id: number) => `    {
      "id": ${id},
      "demarcacion": "DEF",
      "defectos": ["Canchero"],
      "imagen_bg": "/cartas/fondos/def.svg"
    }`;
const JSON_CORE = `{\n  "version": "2.0.0",\n  "jugadores": [\n${[1, 2, 3].map(ficha).join(',\n')}\n  ]\n}\n`;

let dir: string;
let origen: string;
let rutaJson: string;
let destino: string;

async function png(nombre: string) {
  await sharp({ create: { width: 6, height: 9, channels: 4, background: { r: 200, g: 50, b: 50, alpha: 0.5 } } })
    .png()
    .toFile(join(origen, nombre));
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'fbd-fondos-'));
  origen = join(dir, 'origen');
  destino = join(dir, 'destino');
  rutaJson = join(dir, 'core-real.json');
  mkdirSync(origen);
  writeFileSync(rutaJson, JSON_CORE);
});

const ejecutar = () => fondosCore({ origen, rutaJson, destino, log: () => {} });

describe('fondos-core (spec 013, FR-003)', () => {
  it('falta, sobra o se repite un id ⇒ errores con los ids y nada cambia', async () => {
    await png('1_Uno.png');
    await png('1_Otro.png');
    await png('4_Ajeno.png');
    const errores = await ejecutar();
    expect(errores.join('\n')).toMatch(/Falta la ilustración del id 2/);
    expect(errores.join('\n')).toMatch(/Falta la ilustración del id 3/);
    expect(errores.join('\n')).toMatch(/Sobra 4_Ajeno\.png/);
    expect(errores.join('\n')).toMatch(/Id 1 repetido/);
    expect(readFileSync(rutaJson, 'utf-8')).toBe(JSON_CORE);
    expect(readdirSync(origen).sort()).toEqual(['1_Otro.png', '1_Uno.png', '4_Ajeno.png']);
  });

  it('caso correcto: WebP por id, imagen_bg escrito sin reformatear, origen intacto y repetible', async () => {
    await png('1_Uno.png');
    await png('2_Dos_Apellidos.png');
    await png('3.tres.png');
    expect(await ejecutar()).toEqual([]);
    expect(readdirSync(destino).sort()).toEqual(['1.webp', '2.webp', '3.webp']);
    const texto = readFileSync(rutaJson, 'utf-8');
    let n = 0;
    expect(texto).toBe(JSON_CORE.replace(/"imagen_bg": "[^"]*"/g, () => `"imagen_bg": "/cartas/fondos/jugadores/${++n}.webp"`));
    const jugadores = (JSON.parse(texto) as { jugadores: { id: number; imagen_bg: string }[] }).jugadores;
    expect(jugadores.map((j) => j.imagen_bg)).toEqual([1, 2, 3].map((id) => `/cartas/fondos/jugadores/${id}.webp`));
    expect(texto).toContain('"defectos": ["Canchero"]');
    expect(readdirSync(origen)).toHaveLength(3);
    expect(await ejecutar()).toEqual([]);
    expect(readFileSync(rutaJson, 'utf-8')).toBe(texto);
  });
});
