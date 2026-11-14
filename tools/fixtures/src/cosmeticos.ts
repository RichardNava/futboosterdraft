/**
 * Adapta las imágenes de los cosméticos y completa `data/cosmeticos.json` (spec 011, research R3 y R4).
 *
 * - Escudos: `apps/web/public/cosmeticos/escudos/<id>-64.webp`, `<id>-256.webp` y `<id>-512.webp` (previsualización de la tienda).
 * - Sobres: `apps/web/public/cosmeticos/sobres/<id>.webp` (512 × 768) y `<id>-mini.webp` (192 × 288).
 *
 * Los ids son *slugs* sin tildes con el prefijo del tipo (`escudo-flor-de-lis-azul-oro`, `escudo-premium-3`, que
 * corrige la errata «premiun», `sobre-cubismo`, `sobre-7`). `data/cosmeticos.json` conserva lo ya editado: solo se
 * añaden los ids nuevos (con los precios por defecto de research R10) y los packs que falten. Termina con error si
 * lo publicado pesa más del 10 % de los originales (SC-005).
 *
 * Uso: `pnpm --filter @fbd/fixtures imagenes -- --escudos <dir> --sobres <dir>`.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const RAIZ = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const PUBLICO = resolve(RAIZ, 'apps/web/public/cosmeticos');
const JSON_COSMETICOS = resolve(RAIZ, 'data/cosmeticos.json');
const CALIDAD = 80;

type Tipo = 'escudo' | 'sobre';
interface CosmeticoJson {
  id: string;
  tipo: Tipo;
  nombre: string;
  gratuito: boolean;
  precio_centimos?: number;
  precio_fragmentos?: number;
  orden: number;
}
interface PackJson {
  id: string;
  tipo: Tipo;
  nombre: string;
  precio_centimos: number;
  cosmeticos: string[];
}
interface CatalogoJson {
  version: string;
  cosmeticos: CosmeticoJson[];
  packs: PackJson[];
}

const PRECIOS: Record<Tipo, { centimos: number; fragmentos: number; pack: number }> = {
  escudo: { centimos: 25, fragmentos: 250, pack: 99 },
  sobre: { centimos: 50, fragmentos: 250, pack: 199 },
};

/** Texto en minúsculas, sin tildes y con guiones, para nombres de fichero. */
export function slug(texto: string): string {
  return texto
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

interface Origen {
  fichero: string;
  id: string;
  nombre: string;
  gratuito: boolean;
  numerado: boolean;
  n: number;
}

/** `NN_nombre.png` → gratuito o con nombre; `escudo_premiun_N.png` / `sobre_N.png` → de pago numerado. */
function leerOrigen(dir: string, tipo: Tipo): Origen[] {
  return readdirSync(dir)
    .filter((f) => extname(f).toLowerCase() === '.png')
    .map((f) => {
      const base = basename(f, extname(f));
      const numerado = /^(?:escudo_premiun|escudo_premium|sobre)_(\d+)$/.exec(base);
      if (numerado) {
        const n = Number(numerado[1]);
        const id = tipo === 'escudo' ? `escudo-premium-${n}` : `sobre-${n}`;
        return {
          fichero: join(dir, f),
          id,
          nombre: tipo === 'escudo' ? `Premium ${n}` : `Sobre ${n}`,
          gratuito: false,
          numerado: true,
          n,
        };
      }
      const conNombre = /^(\d+)_(.+)$/.exec(base);
      if (!conNombre) throw new Error(`Nombre de fichero no reconocido: ${f}`);
      const texto = conNombre[2]!.replace(/_/g, ' ');
      return {
        fichero: join(dir, f),
        id: `${tipo}-${slug(texto)}`,
        nombre: texto.charAt(0).toUpperCase() + texto.slice(1),
        // Los escudos con nombre son los gratuitos; los sobres con nombre son de pago (research R10).
        gratuito: tipo === 'escudo',
        numerado: false,
        n: Number(conNombre[1]),
      };
    })
    .sort((a, b) => Number(a.numerado) - Number(b.numerado) || a.n - b.n); // con nombre primero
}

async function generar(origen: Origen, tipo: Tipo): Promise<string[]> {
  const dir = resolve(PUBLICO, tipo === 'escudo' ? 'escudos' : 'sobres');
  mkdirSync(dir, { recursive: true });
  const salidas: [string, number, number][] =
    tipo === 'escudo'
      ? [
          [`${origen.id}-64.webp`, 64, 64],
          [`${origen.id}-256.webp`, 256, 256],
          [`${origen.id}-512.webp`, 512, 512],
        ]
      : [
          [`${origen.id}.webp`, 512, 768],
          [`${origen.id}-mini.webp`, 192, 288],
        ];
  for (const [nombre, ancho, alto] of salidas) {
    await sharp(origen.fichero)
      .resize(ancho, alto, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: CALIDAD, alphaQuality: 90, effort: 6 })
      .toFile(join(dir, nombre));
  }
  return salidas.map(([n]) => join(dir, n));
}

function pesoDir(dir: string): number {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir, { withFileTypes: true }).reduce(
    (t, e) => t + (e.isDirectory() ? pesoDir(join(dir, e.name)) : statSync(join(dir, e.name)).size),
    0,
  );
}

function argumento(nombre: string): string | undefined {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const dirs: Partial<Record<Tipo, string>> = { escudo: argumento('escudos'), sobre: argumento('sobres') };
  const catalogo: CatalogoJson = existsSync(JSON_COSMETICOS)
    ? (JSON.parse(readFileSync(JSON_COSMETICOS, 'utf8')) as CatalogoJson)
    : {
        version: '1.0.0',
        cosmeticos: [{ id: 'sobre-original', tipo: 'sobre', nombre: 'Original', gratuito: true, orden: 0 }],
        packs: [],
      };
  const existentes = new Set(catalogo.cosmeticos.map((c) => c.id));
  let pesoOrigen = 0;

  for (const tipo of ['escudo', 'sobre'] as const) {
    const dir = dirs[tipo];
    if (!dir) continue;
    const origenes = leerOrigen(resolve(process.cwd(), dir), tipo);
    const ids = new Set<string>();
    let orden = 1;
    for (const o of origenes) {
      if (ids.has(o.id)) throw new Error(`Id repetido: ${o.id}`);
      ids.add(o.id);
      pesoOrigen += statSync(o.fichero).size;
      await generar(o, tipo);
      if (!existentes.has(o.id)) {
        catalogo.cosmeticos.push({
          id: o.id,
          tipo,
          nombre: o.nombre,
          gratuito: o.gratuito,
          ...(o.gratuito
            ? {}
            : { precio_centimos: PRECIOS[tipo].centimos, precio_fragmentos: PRECIOS[tipo].fragmentos }),
          orden,
        });
        existentes.add(o.id);
      }
      orden++;
    }
    // Packs fijos de 5 en 5 en el orden del catálogo (research R10), solo si aún no hay packs de este tipo.
    if (!catalogo.packs.some((p) => p.tipo === tipo)) {
      const dePago = catalogo.cosmeticos
        .filter((c) => c.tipo === tipo && !c.gratuito)
        .sort((a, b) => a.orden - b.orden);
      for (let i = 0; i + 5 <= dePago.length; i += 5) {
        const n = i / 5 + 1;
        catalogo.packs.push({
          id: `pack-${tipo}s-${n}`,
          tipo,
          nombre: `Pack de ${tipo}s ${n}`,
          precio_centimos: PRECIOS[tipo].pack,
          cosmeticos: dePago.slice(i, i + 5).map((c) => c.id),
        });
      }
    }
    console.log(`imagenes: ${origenes.length} ${tipo}s procesados.`);
  }

  writeFileSync(JSON_COSMETICOS, `${JSON.stringify(catalogo, null, 2)}\n`);
  // Solo los tipos procesados en esta ejecución: con --escudos solo, los sobres no tienen originales con que compararse.
  const publicado = (['escudo', 'sobre'] as const)
    .filter((t) => dirs[t])
    .reduce((t, tipo) => t + pesoDir(resolve(PUBLICO, tipo === 'escudo' ? 'escudos' : 'sobres')), 0);
  const mb = (b: number): string => `${(b / 1024 / 1024).toFixed(2)} MB`;
  console.log(`imagenes: publicado ${mb(publicado)} frente a ${mb(pesoOrigen)} de originales.`);
  if (pesoOrigen > 0 && publicado > pesoOrigen * 0.1) {
    console.error('imagenes: lo publicado supera el 10 % de los originales (SC-005).');
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
}
