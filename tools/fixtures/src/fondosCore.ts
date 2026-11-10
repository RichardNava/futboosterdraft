/**
 * Ilustraciones de fondo de las cartas de Core (spec 013, US1; research R1).
 *
 * 1. Lee `--origen <dir>` y saca el id del principio de cada nombre (`100_Guido_Rodriguez.png`; el resto se ignora).
 * 2. Antes de escribir nada comprueba que hay exactamente un fichero por cada id de `data/core-real.json`: si falta,
 *    sobra o se repite alguno, lo dice y termina con código ≠ 0 sin tocar datos ni origen (FR-003).
 * 3. Convierte cada imagen a `apps/web/public/cartas/fondos/jugadores/<id>.webp` a su tamaño, calidad 80, y falla si
 *    el peso medio pasa de 120 KB (SC-002).
 * 4. Escribe `imagen_bg: "/cartas/fondos/jugadores/<id>.webp"` en cada ficha sin tocar nada más (ni el formato).
 *
 * No borra el origen (FR-007: se borra a mano tras revisar). Uso:
 * `pnpm --filter @fbd/fixtures fondos-core -- --origen ../../jugadores_bg`.
 */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const RAIZ = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const CALIDAD = 80;
const PESO_MEDIO_MAXIMO = 120 * 1024;
// Algún nombre usa punto en lugar de guion bajo («134.matheus_nunes.png»).
const ID_EN_NOMBRE = /^(\d+)[_.-]/;

export const rutaFondo = (id: number): string => `/cartas/fondos/jugadores/${id}.webp`;

export interface PlanFondos {
  porId: Map<number, string>;
  faltan: number[];
  sobran: string[];
  repetidos: { id: number; ficheros: string[] }[];
}

/** Empareja los ficheros con los ids de Core; un plan con `faltan`, `sobran` o `repetidos` no se aplica. */
export function planificarFondos(ficheros: readonly string[], ids: readonly number[]): PlanFondos {
  const esperados = new Set(ids);
  const encontrados = new Map<number, string[]>();
  const sobran: string[] = [];
  for (const f of [...ficheros].sort()) {
    const m = ID_EN_NOMBRE.exec(f);
    const id = m ? Number(m[1]) : NaN;
    if (!esperados.has(id)) sobran.push(f);
    else encontrados.set(id, [...(encontrados.get(id) ?? []), f]);
  }
  return {
    porId: new Map([...encontrados].filter(([, fs]) => fs.length === 1).map(([id, fs]) => [id, fs[0]!])),
    faltan: [...esperados].filter((id) => !encontrados.has(id)).sort((a, b) => a - b),
    sobran,
    repetidos: [...encontrados].filter(([, fs]) => fs.length > 1).map(([id, fs]) => ({ id, ficheros: fs })),
  };
}

/** Cambia el `imagen_bg` de cada ficha en el texto del JSON, conservando el resto del formato. */
export function escribirImagenBg(texto: string): string {
  const nuevo = texto.replace(/("id": (\d+),[\s\S]*?"imagen_bg": )"[^"]*"/g, (_, previo: string, id: string) => `${previo}"${rutaFondo(Number(id))}"`);
  // Comprobación: cada ficha queda con su propio fondo y nada más cambia.
  const antes = JSON.parse(texto) as { jugadores: { id: number; imagen_bg: string }[] };
  const despues = JSON.parse(nuevo) as typeof antes;
  for (const [i, j] of despues.jugadores.entries()) {
    if (j.imagen_bg !== rutaFondo(j.id) || JSON.stringify({ ...j, imagen_bg: '' }) !== JSON.stringify({ ...antes.jugadores[i], imagen_bg: '' })) {
      throw new Error(`No se ha podido escribir el fondo de la ficha ${j.id}`);
    }
  }
  return nuevo;
}

export interface OpcionesFondos {
  origen: string;
  rutaJson?: string;
  destino?: string;
  log?: (m: string) => void;
}

/** Devuelve los errores (vacío si todo fue bien). Con errores de emparejamiento no escribe nada. */
export async function fondosCore(o: OpcionesFondos): Promise<string[]> {
  const rutaJson = o.rutaJson ?? resolve(RAIZ, 'data/core-real.json');
  const destino = o.destino ?? resolve(RAIZ, 'apps/web/public/cartas/fondos/jugadores');
  const log = o.log ?? console.log;
  const texto = readFileSync(rutaJson, 'utf-8');
  const ids = (JSON.parse(texto) as { jugadores: { id: number }[] }).jugadores.map((j) => j.id);
  const plan = planificarFondos(readdirSync(o.origen).filter((f) => statSync(join(o.origen, f)).isFile()), ids);
  const errores = [
    ...plan.faltan.map((id) => `Falta la ilustración del id ${id}`),
    ...plan.sobran.map((f) => `Sobra ${f}: su id no está en Core`),
    ...plan.repetidos.map((r) => `Id ${r.id} repetido: ${r.ficheros.join(', ')}`),
  ];
  if (errores.length) return errores;

  mkdirSync(destino, { recursive: true });
  let total = 0;
  for (const [id, fichero] of plan.porId) {
    const salida = join(destino, `${id}.webp`);
    await sharp(join(o.origen, fichero)).webp({ quality: CALIDAD, alphaQuality: CALIDAD }).toFile(salida);
    total += statSync(salida).size;
  }
  const media = total / plan.porId.size;
  log(`fondos-core: ${plan.porId.size} ilustraciones en ${destino}; peso medio ${(media / 1024).toFixed(1)} KB.`);
  if (media > PESO_MEDIO_MAXIMO) return [`El peso medio (${(media / 1024).toFixed(1)} KB) supera 120 KB (SC-002)`];

  const nuevo = escribirImagenBg(texto);
  if (nuevo !== texto) writeFileSync(rutaJson, nuevo, 'utf-8');
  log(nuevo === texto ? 'fondos-core: core-real.json ya estaba al día.' : `fondos-core: imagen_bg escrito en ${rutaJson}.`);
  return [];
}

async function principal(): Promise<void> {
  const i = process.argv.indexOf('--origen');
  const origen = i >= 0 ? process.argv[i + 1] : undefined;
  if (!origen) {
    console.error('Uso: pnpm --filter @fbd/fixtures fondos-core -- --origen <dir>');
    process.exit(2);
  }
  const errores = await fondosCore({ origen: resolve(process.cwd(), origen) });
  if (errores.length) {
    for (const e of errores) console.error(`fondos-core: ${e}`);
    console.error(`fondos-core: ${errores.length} errores; no se ha cambiado core-real.json.`);
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await principal();
