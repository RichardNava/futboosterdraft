/**
 * Expansiones reales (spec 016, research R5, R7–R10; contracts/datos-expansiones.md §2).
 *
 * Siempre valida `data/expansiones-reales.json` + `data/core-real.json` + `data/colecciones.json` y escribe
 * `specs/016-expansiones-reales/sumario.md`. Con `--origen <dir>` antes genera las imágenes:
 *
 * - retratos: cada página es una rejilla de 6 columnas con filas de un tercio de su alto, leída por filas; el verde
 *   croma se quita por inundación desde el borde de cada celda (las camisetas verdes no lo tocan), con el borde
 *   suavizado y sin reflejo verde; se recorta al contenido y se escala a 139 × 181 anclado arriba, como el Core;
 * - fondos a 600 × 900, icono de tienda (256 y 512), cartel (768 × 1152) e icono del fragmento (32 y 64);
 * - la hoja de revisión `revision-retratos.webp`, con los retratos sobre magenta y su número.
 *
 * Antes de escribir nada comprueba que el origen tiene exactamente lo esperado; si no, lo lista y sale con código 1.
 * No borra el origen. El retrato de cada carta se escribe en la ruta de su ficha (`imagen`), así que las fichas tienen
 * que existir antes de generar.
 *
 * Uso: `pnpm --filter @fbd/fixtures expansiones -- [--origen ../../expansiones] [--solo A|B|C|D]`.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEMARCACIONES,
  NIVELES,
  recuentoPorDemarcacionYNivel,
  validarCatalogo,
  validarColeccion,
  type Coleccion,
  type Jugador,
  type Nivel,
} from '@fbd/domain';
import sharp from 'sharp';
import { planificarFondos } from './fondosCore';

const RAIZ = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const PUBLICO = resolve(RAIZ, 'apps/web/public');
const SPEC = resolve(RAIZ, 'specs/016-expansiones-reales');

/** Carpeta del origen → colección (research R2). El orden es el de la tienda. */
export const EXPANSIONES = [
  { letra: 'A', id: 'remontada-historica' },
  { letra: 'B', id: 'idolos-dorados' },
  { letra: 'C', id: 'saque-ardiente' },
  { letra: 'D', id: 'estrellas-fulgurantes' },
] as const;
type Letra = (typeof EXPANSIONES)[number]['letra'];

/**
 * Cartas del origen que no van a su hueco de la colección (research R2): D-4 es Kimmich, que entra en el Core con el
 * id 376; el hueco 4 lo ocupa Verratti (299), que conserva sus imágenes.
 */
export const SUSTITUCIONES: Readonly<Record<string, Readonly<Record<number, number>>>> = { 'estrellas-fulgurantes': { 4: 376 } };

/** Comprobación de datos de estas cuatro expansiones (SC-001), no una regla del dominio (FR-032). */
const CARTAS_POR_EXPANSION = 24;
const POR_NIVEL = 6;

const RETRATO = { ancho: 139, alto: 181 };
const FONDO = { ancho: 600, alto: 900, calidad: 80 };
const CARTEL = { ancho: 768, alto: 1152, calidad: 80 };
const PREFIJO_RETRATO = '/cartas/retratos-propios/';

// ---------- Rejilla de retratos ----------

/** `pagina_1A_1_18.png` → 1..18. */
export function rangoDePagina(nombre: string): { desde: number; hasta: number } | null {
  const m = /^pagina_\d+[A-Z]_(\d+)_(\d+)\.png$/i.exec(nombre);
  if (!m) return null;
  const desde = Number(m[1]);
  const hasta = Number(m[2]);
  return desde >= 1 && hasta >= desde ? { desde, hasta } : null;
}

export interface Celda {
  numero: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Celdas de una página: 6 columnas y filas de un tercio del alto (las páginas de 1 o 2 filas dejan el resto vacío). */
export function celdasDePagina(ancho: number, alto: number, desde: number, hasta: number): Celda[] {
  const celdas: Celda[] = [];
  for (let n = desde; n <= hasta; n++) {
    const i = n - desde;
    const col = i % 6;
    const fila = Math.floor(i / 6);
    const left = Math.round((col * ancho) / 6);
    const top = Math.round((fila * alto) / 3);
    celdas.push({ numero: n, left, top, width: Math.round(((col + 1) * ancho) / 6) - left, height: Math.round(((fila + 1) * alto) / 3) - top });
  }
  return celdas;
}

// ---------- Croma ----------

export interface OpcionesCroma {
  /** Verdor (G − max(R, B)) a partir del cual un píxel conectado al borde es fondo. */
  umbral: number;
  /** Verdor por debajo del cual un píxel es opaco del todo; entre los dos, el borde suavizado. */
  suave: number;
}
export const CROMA_POR_DEFECTO: OpcionesCroma = { umbral: 140, suave: 60 };

const verdor = (p: Buffer | Uint8Array, i: number) => p[i + 1]! - Math.max(p[i]!, p[i + 2]!);

/**
 * Quita el fondo croma de una imagen RGBA en su sitio: inundación desde el borde por los píxeles con verdor ≥ `umbral`
 * (un verde de camiseta no llega), un anillo de 2 px con alfa proporcional al verdor y sin reflejo verde
 * (G ≤ max(R, B)), y fuera los bolsillos de verde croma puro que la inundación no alcanza (entre el pelo y la oreja).
 */
export function quitarCroma(pixeles: Buffer | Uint8Array, ancho: number, alto: number, o: OpcionesCroma = CROMA_POR_DEFECTO): void {
  const total = ancho * alto;
  const fondo = new Uint8Array(total);
  const pila: number[] = [];
  const empujar = (k: number) => {
    if (!fondo[k] && verdor(pixeles, k * 4) >= o.umbral) {
      fondo[k] = 1;
      pila.push(k);
    }
  };
  for (let x = 0; x < ancho; x++) {
    empujar(x);
    empujar((alto - 1) * ancho + x);
  }
  for (let y = 0; y < alto; y++) {
    empujar(y * ancho);
    empujar(y * ancho + ancho - 1);
  }
  while (pila.length) {
    const k = pila.pop()!;
    const x = k % ancho;
    if (x > 0) empujar(k - 1);
    if (x < ancho - 1) empujar(k + 1);
    if (k >= ancho) empujar(k - ancho);
    if (k < total - ancho) empujar(k + ancho);
  }
  // Croma puro encerrado: ninguna camiseta llega a este verdor.
  for (let k = 0; k < total; k++) if (verdor(pixeles, k * 4) >= 215) fondo[k] = 1;

  // Distancia (en px, hasta 2) al fondo, para el anillo del borde.
  const cerca = new Uint8Array(total);
  for (let k = 0; k < total; k++) {
    if (fondo[k]) continue;
    const x = k % ancho;
    const y = Math.floor(k / ancho);
    let d = 0;
    for (let r = 1; r <= 2 && !d; r++) {
      for (let dy = -r; dy <= r && !d; dy++) {
        for (let dx = -r; dx <= r && !d; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < ancho && yy < alto && fondo[yy * ancho + xx]) d = r;
        }
      }
    }
    cerca[k] = d;
  }
  for (let k = 0; k < total; k++) {
    const i = k * 4;
    if (fondo[k]) {
      pixeles[i + 3] = 0;
      continue;
    }
    if (!cerca[k]) continue;
    const v = verdor(pixeles, i);
    if (v > o.suave) {
      const alfa = Math.max(0, Math.min(1, (o.umbral - v) / (o.umbral - o.suave)));
      pixeles[i + 3] = Math.round(pixeles[i + 3]! * (cerca[k] === 1 ? alfa : (1 + alfa) / 2));
    }
    pixeles[i + 1] = Math.min(pixeles[i + 1]!, Math.max(pixeles[i]!, pixeles[i + 2]!));
  }
}

/**
 * Deja solo la mayor mancha opaca (4-vecindad): en las páginas cuyas filas pasan un poco del tercio, la celda de
 * abajo se lleva una tira de la camiseta de arriba, separada del retrato por el croma.
 */
export function soloMayorMancha(pixeles: Buffer | Uint8Array, ancho: number, alto: number): void {
  const total = ancho * alto;
  const mancha = new Int32Array(total).fill(-1);
  const tamanos: number[] = [];
  for (let inicio = 0; inicio < total; inicio++) {
    if (mancha[inicio] !== -1 || pixeles[inicio * 4 + 3]! === 0) continue;
    const id = tamanos.length;
    let n = 0;
    const pila = [inicio];
    mancha[inicio] = id;
    while (pila.length) {
      const k = pila.pop()!;
      n++;
      const x = k % ancho;
      for (const v of [x > 0 ? k - 1 : -1, x < ancho - 1 ? k + 1 : -1, k - ancho, k + ancho]) {
        if (v >= 0 && v < total && mancha[v] === -1 && pixeles[v * 4 + 3]! > 0) {
          mancha[v] = id;
          pila.push(v);
        }
      }
    }
    tamanos.push(n);
  }
  const mayor = tamanos.indexOf(Math.max(...tamanos));
  for (let k = 0; k < total; k++) if (mancha[k] !== -1 && mancha[k] !== mayor) pixeles[k * 4 + 3] = 0;
}

/** Caja del contenido (alfa > 8), o null si no hay. */
export function cajaContenido(pixeles: Buffer | Uint8Array, ancho: number, alto: number): { left: number; top: number; width: number; height: number } | null {
  let x0 = ancho;
  let y0 = alto;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      if (pixeles[(y * ancho + x) * 4 + 3]! > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

/** Retrato listo: croma fuera, recortado al contenido y escalado a lo ancho a 139 × 181 anclado arriba. */
export async function retratoDeCelda(pagina: string, celda: Celda, croma: OpcionesCroma = CROMA_POR_DEFECTO): Promise<Buffer> {
  const { data, info } = await sharp(pagina)
    .extract({ left: celda.left, top: celda.top, width: celda.width, height: celda.height })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  quitarCroma(data, info.width, info.height, croma);
  soloMayorMancha(data, info.width, info.height);
  const caja = cajaContenido(data, info.width, info.height);
  if (!caja) throw new Error(`La celda ${celda.numero} está vacía`);
  // Anclado arriba: lo que sobra por abajo (o por los lados, si el retrato es bajo) se corta, como en el Core.
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract(caja)
    .resize(RETRATO.ancho, RETRATO.alto, { fit: 'cover', position: 'top' })
    .webp({ quality: 85, alphaQuality: 90, effort: 6 })
    .toBuffer();
}

/** Icono del fragmento: lo conectado al borde y oscuro pasa a alfa según su brillo (el halo verde se conserva). */
export function fondoNegroAAlfa(pixeles: Buffer | Uint8Array, ancho: number, alto: number, umbral = 90): void {
  const total = ancho * alto;
  const visto = new Uint8Array(total);
  const brillo = (k: number) => Math.max(pixeles[k * 4]!, pixeles[k * 4 + 1]!, pixeles[k * 4 + 2]!);
  const pila: number[] = [];
  const empujar = (k: number) => {
    if (!visto[k] && brillo(k) < umbral) {
      visto[k] = 1;
      pila.push(k);
    }
  };
  for (let x = 0; x < ancho; x++) {
    empujar(x);
    empujar((alto - 1) * ancho + x);
  }
  for (let y = 0; y < alto; y++) {
    empujar(y * ancho);
    empujar(y * ancho + ancho - 1);
  }
  while (pila.length) {
    const k = pila.pop()!;
    const x = k % ancho;
    if (x > 0) empujar(k - 1);
    if (x < ancho - 1) empujar(k + 1);
    if (k >= ancho) empujar(k - ancho);
    if (k < total - ancho) empujar(k + ancho);
  }
  for (let k = 0; k < total; k++) {
    if (!visto[k]) continue;
    const i = k * 4;
    // El negro de fondo (brillo ≤ 20) desaparece; el halo queda con alfa por brillo y el color sin oscurecer.
    const alfa = Math.max(0, (brillo(k) - 20) / (umbral - 20));
    pixeles[i + 3] = Math.round(255 * alfa);
    if (alfa > 0) for (let c = 0; c < 3; c++) pixeles[i + c] = Math.min(255, Math.round(pixeles[i + c]! / Math.max(alfa, 0.35)));
  }
}

// ---------- Origen ----------

export interface PlanExpansion {
  letra: Letra;
  dir: string;
  retratos: { pagina: string; celda: Celda }[];
  fondos: Map<number, string>;
  cartel: string;
  icono: string;
  nombresLista: Map<number, string>;
}

/** Comprueba el origen de una expansión sin escribir nada; las cartas que debe tener son las de su lista. */
export async function planificarExpansion(raiz: string, letra: Letra): Promise<{ plan: PlanExpansion | null; errores: string[] }> {
  const dir = join(raiz, `Expansion ${letra}`);
  const errores: string[] = [];
  const e = (m: string) => errores.push(`${letra}: ${m}`);
  if (!existsSync(dir)) return { plan: null, errores: [`${letra}: no existe ${dir}`] };
  const rutaLista = join(dir, `jugadores_expansion${letra}.json`);
  const rutaRareza = join(dir, `rareza_${letra}.txt`);
  if (!existsSync(rutaLista)) e(`falta jugadores_expansion${letra}.json`);
  if (!existsSync(rutaRareza)) e(`falta rareza_${letra}.txt`);
  const lista = existsSync(rutaLista) ? (JSON.parse(readFileSync(rutaLista, 'utf-8')) as { id: number; nombre: string }[]) : [];
  const n = lista.length;
  if (n === 0) e('la lista de jugadores está vacía');
  const nombresLista = new Map(lista.map((j) => [j.id, j.nombre]));

  const dirRetratos = join(dir, 'retratos');
  const retratos: PlanExpansion['retratos'] = [];
  const cubiertos = new Map<number, string>();
  for (const f of existsSync(dirRetratos) ? readdirSync(dirRetratos).sort() : []) {
    const rango = rangoDePagina(f);
    if (!rango) {
      e(`sobra retratos/${f}: no es una página pagina_<n>${letra}_<desde>_<hasta>.png`);
      continue;
    }
    const pagina = join(dirRetratos, f);
    const m = await sharp(pagina).metadata();
    for (const celda of celdasDePagina(m.width!, m.height!, rango.desde, rango.hasta)) {
      if (cubiertos.has(celda.numero)) e(`el retrato ${celda.numero} está en ${cubiertos.get(celda.numero)} y en ${f}`);
      else if (celda.numero > n) e(`${f} llega al ${celda.numero}, pero la lista tiene ${n} jugadores`);
      else {
        cubiertos.set(celda.numero, f);
        retratos.push({ pagina, celda });
      }
    }
  }
  for (let i = 1; i <= n; i++) if (!cubiertos.has(i)) e(`falta el retrato ${i}`);

  const dirFondos = ['imagen_bg', 'jugadores_bg'].map((d) => join(dir, d)).find(existsSync);
  const fondos = new Map<number, string>();
  if (!dirFondos) e('falta la carpeta imagen_bg/ o jugadores_bg/');
  else {
    const p = planificarFondos(readdirSync(dirFondos).filter((f) => statSync(join(dirFondos, f)).isFile()), Array.from({ length: n }, (_, i) => i + 1));
    for (const id of p.faltan) e(`falta el fondo ${id}`);
    for (const f of p.sobran) e(`sobra el fondo ${f}`);
    for (const r of p.repetidos) e(`fondo ${r.id} repetido: ${r.ficheros.join(', ')}`);
    for (const [id, f] of p.porId) fondos.set(id, join(dirFondos, f));
  }
  const cartel = join(dir, 'cartel', `cartel_shop_${letra}.png`);
  const icono = join(dir, 'cartel', `icono_shop_${letra}.png`);
  if (!existsSync(cartel)) e(`falta cartel/cartel_shop_${letra}.png`);
  if (!existsSync(icono)) e(`falta cartel/icono_shop_${letra}.png`);
  return { plan: errores.length ? null : { letra, dir, retratos, fondos, cartel, icono, nombresLista }, errores };
}

// ---------- Datos ----------

interface Datos {
  core: Jugador[];
  expansiones: Jugador[];
  colecciones: Coleccion[];
  erroresCatalogo: string[];
}

function leerDatos(): Datos {
  const leer = <T>(f: string) => JSON.parse(readFileSync(resolve(RAIZ, 'data', f), 'utf-8')) as T;
  const core = leer<{ jugadores: Jugador[] }>('core-real.json').jugadores;
  const expansiones = leer<{ jugadores: Jugador[] }>('expansiones-reales.json').jugadores;
  // shortcut: sin el esquema JSON (ajv solo está en apps/server); validarColeccion aplica las mismas reglas de campos y
  // `pnpm seed` valida además el esquema.
  const errores = validarColeccion([...core, ...expansiones]).map((x) => `[${String(x.id ?? '-')}] ${x.regla}: ${x.mensaje}`);
  const ids = new Set<number>();
  for (const j of [...core, ...expansiones]) {
    if (ids.has(j.id)) errores.push(`[${j.id}] id repetido entre core-real.json y expansiones-reales.json`);
    ids.add(j.id);
  }
  const catalogo = validarCatalogo([...core, ...expansiones], leer<{ colecciones: unknown }>('colecciones.json').colecciones);
  errores.push(...catalogo.errores.map((x) => `[${String(x.id ?? '-')}] ${x.regla}: ${x.mensaje}`));
  return { core, expansiones, colecciones: catalogo.colecciones, erroresCatalogo: errores };
}

/** Id de la carta del número `n` de la colección en el origen (con las sustituciones de R2). */
function idDestino(coleccion: Coleccion, n: number): number | undefined {
  return SUSTITUCIONES[coleccion.id]?.[n] ?? coleccion.cartas.find((c) => c.numero === n)?.id;
}

// ---------- Generación ----------

async function generar(origen: string, letras: readonly Letra[], datos: Datos, log: (m: string) => void): Promise<string[]> {
  const planes: PlanExpansion[] = [];
  const errores: string[] = [];
  for (const letra of letras) {
    const r = await planificarExpansion(origen, letra);
    errores.push(...r.errores);
    if (r.plan) planes.push(r.plan);
  }
  const fragmento = join(origen, 'icono', 'fragmento.png');
  if (!existsSync(fragmento)) errores.push('falta icono/fragmento.png');

  // Cada número del origen tiene que tener su ficha (para saber dónde va su retrato).
  const porId = new Map([...datos.core, ...datos.expansiones].map((j) => [j.id, j]));
  const ajustes = leerAjustes();
  const trabajos: { plan: PlanExpansion; numero: number; id: number; ficha: Jugador }[] = [];
  for (const plan of planes) {
    const col = datos.colecciones.find((c) => c.id === EXPANSIONES.find((x) => x.letra === plan.letra)!.id);
    if (!col) {
      errores.push(`${plan.letra}: la colección no está en colecciones.json`);
      continue;
    }
    for (let n = 1; n <= plan.nombresLista.size; n++) {
      const id = idDestino(col, n);
      const ficha = id === undefined ? undefined : porId.get(id);
      if (id === undefined || !ficha) errores.push(`${plan.letra}-${n}: falta su ficha${id === undefined ? '' : ` (id ${id})`}`);
      else trabajos.push({ plan, numero: n, id, ficha });
    }
  }
  if (errores.length) return errores;

  const dirRetratos = resolve(PUBLICO, 'cartas/retratos-propios');
  const dirFondos = resolve(PUBLICO, 'cartas/fondos/jugadores');
  mkdirSync(dirFondos, { recursive: true });
  for (const t of trabajos) {
    const { pagina, celda } = t.plan.retratos.find((r) => r.celda.numero === t.numero)!;
    const ajuste = ajustes[String(t.id)];
    const retrato = await retratoDeCelda(pagina, celda, { ...CROMA_POR_DEFECTO, ...ajuste });
    writeFileSync(join(dirRetratos, t.ficha.imagen.slice(PREFIJO_RETRATO.length)), retrato);
    await sharp(t.plan.fondos.get(t.numero)!)
      .resize(FONDO.ancho, FONDO.alto, { fit: 'cover' })
      .webp({ quality: FONDO.calidad, alphaQuality: FONDO.calidad })
      .toFile(join(dirFondos, `${t.id}.webp`));
  }
  for (const plan of planes) {
    const dir = resolve(PUBLICO, 'expansiones', EXPANSIONES.find((x) => x.letra === plan.letra)!.id);
    mkdirSync(dir, { recursive: true });
    for (const lado of [256, 512]) await sharp(plan.icono).resize(lado, lado).webp({ quality: 85, alphaQuality: 90 }).toFile(join(dir, `icono-${lado}.webp`));
    await sharp(plan.cartel).resize(CARTEL.ancho, CARTEL.alto, { fit: 'cover' }).webp({ quality: CARTEL.calidad }).toFile(join(dir, 'cartel.webp'));
  }
  await iconoFragmento(fragmento);
  log(`expansiones: ${trabajos.length} retratos y fondos, ${planes.length} iconos y carteles, e icono del fragmento.`);
  await hojaRevision(trabajos.map((t) => ({ etiqueta: `${t.plan.letra}-${t.numero}`, ruta: join(dirRetratos, t.ficha.imagen.slice(PREFIJO_RETRATO.length)) })));
  log(`expansiones: hoja de revisión en ${join(SPEC, 'revision-retratos.webp')}.`);
  return [];
}

/** Tolerancia de croma por carta (research R7): `data/expansiones-ajustes.json`, `{ "<id>": { "umbral": 170 } }`. */
function leerAjustes(): Record<string, Partial<OpcionesCroma>> {
  const ruta = resolve(RAIZ, 'data/expansiones-ajustes.json');
  return existsSync(ruta) ? (JSON.parse(readFileSync(ruta, 'utf-8')) as Record<string, Partial<OpcionesCroma>>) : {};
}

async function iconoFragmento(origen: string): Promise<void> {
  const { data, info } = await sharp(origen).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  fondoNegroAAlfa(data, info.width, info.height);
  const caja = cajaContenido(data, info.width, info.height)!;
  const lado = Math.max(caja.width, caja.height);
  const recortado = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract(caja)
    .extend({
      left: Math.floor((lado - caja.width) / 2),
      right: Math.ceil((lado - caja.width) / 2),
      top: Math.floor((lado - caja.height) / 2),
      bottom: Math.ceil((lado - caja.height) / 2),
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  const dir = resolve(PUBLICO, 'iconos');
  mkdirSync(dir, { recursive: true });
  for (const l of [32, 64]) await sharp(recortado).resize(l, l).webp({ quality: 90, alphaQuality: 100 }).toFile(join(dir, `fragmento-${l}.webp`));
}

/** Hoja de revisión (SC-002): los retratos sobre magenta, 12 por fila, con su número debajo. */
async function hojaRevision(retratos: { etiqueta: string; ruta: string }[]): Promise<void> {
  const columnas = 12;
  const celda = { ancho: RETRATO.ancho + 8, alto: RETRATO.alto + 24 };
  const filas = Math.ceil(retratos.length / columnas);
  const capas = retratos.flatMap((r, i) => {
    const left = (i % columnas) * celda.ancho + 4;
    const top = Math.floor(i / columnas) * celda.alto + 4;
    const texto = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${RETRATO.ancho}" height="18"><text x="50%" y="14" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle" fill="#fff">${r.etiqueta}</text></svg>`,
    );
    return [
      { input: r.ruta, left, top },
      { input: texto, left, top: top + RETRATO.alto + 2 },
    ];
  });
  mkdirSync(SPEC, { recursive: true });
  await sharp({ create: { width: columnas * celda.ancho, height: filas * celda.alto, channels: 4, background: { r: 255, g: 0, b: 255, alpha: 1 } } })
    .composite(capas)
    .webp({ quality: 85 })
    .toFile(join(SPEC, 'revision-retratos.webp'));
}

// ---------- Validación y sumario ----------

interface Comprobacion {
  titulo: string;
  errores: string[];
}

const peso = (ruta: string) => (existsSync(ruta) ? statSync(ruta).size : 0);
const enDisco = (rutaPublica: string) => resolve(PUBLICO, rutaPublica.slice(1));

export function validar(datos: Datos, letras: readonly Letra[]): { comprobaciones: Comprobacion[]; pesos: { core: number; expansiones: number } } {
  const porId = new Map([...datos.core, ...datos.expansiones].map((j) => [j.id, j]));
  const elegidas = EXPANSIONES.filter((x) => letras.includes(x.letra));

  const c2: string[] = [];
  for (const x of elegidas) {
    const col = datos.colecciones.find((c) => c.id === x.id);
    if (!col) {
      c2.push(`${x.letra}: falta la colección ${x.id}`);
      continue;
    }
    if (col.tipo !== 'pago') c2.push(`${x.id}: debe ser de pago`);
    if (!col.sobreRegalo) c2.push(`${x.id}: falta sobre_regalo`);
    const numeros = col.cartas.map((c) => c.numero).sort((a, b) => (a ?? 0) - (b ?? 0));
    if (numeros.some((n, i) => n !== i + 1)) c2.push(`${x.id}: los números deben ir de 1 a ${col.cartas.length}`);
    if (col.cartas.length !== CARTAS_POR_EXPANSION) c2.push(`${x.id}: tiene ${col.cartas.length} cartas y debe tener ${CARTAS_POR_EXPANSION}`);
    for (const n of NIVELES) {
      const cuantas = col.cartas.filter((c) => porId.get(c.id)?.nivel === n).length;
      if (cuantas !== POR_NIVEL) c2.push(`${x.id}: ${cuantas} ${n} y debe tener ${POR_NIVEL}`);
    }
  }

  const c3: string[] = [];
  const core = datos.colecciones.find((c) => c.id === 'core');
  const idsCore = new Set(core?.cartas.map((c) => c.id) ?? []);
  if (idsCore.size !== 300) c3.push(`El Core tiene ${idsCore.size} cartas y debe tener 300`);
  const kimmich = porId.get(376);
  const verratti = porId.get(299);
  if (!idsCore.has(376) || !kimmich) c3.push('Kimmich (376) debe estar en el Core');
  else if (kimmich.media < 88) c3.push(`Kimmich tiene media ${kimmich.media} y debe ser ≥ 88`);
  if (idsCore.has(299)) c3.push('Verratti (299) no debe estar en el Core');
  if (kimmich && verratti && (kimmich.demarcacion !== verratti.demarcacion || kimmich.nivel !== verratti.nivel)) {
    c3.push('Kimmich y Verratti deben tener la misma demarcación y nivel, para que el recuento del Core no cambie');
  }
  if (datos.core.some((j) => !idsCore.has(j.id))) c3.push('core-real.json tiene cartas que no están en la colección core');

  const c4: string[] = [];
  const deExpansion = [...new Set(elegidas.flatMap((x) => datos.colecciones.find((c) => c.id === x.id)?.cartas.map((c) => c.id) ?? []))];
  for (const id of deExpansion) {
    const j = porId.get(id);
    if (!j) continue;
    if (!j.imagen.startsWith(PREFIJO_RETRATO) || !existsSync(enDisco(j.imagen))) c4.push(`[${id}] no existe el retrato ${j.imagen}`);
    if (j.imagen_bg !== `/cartas/fondos/jugadores/${id}.webp`) c4.push(`[${id}] imagen_bg debe ser /cartas/fondos/jugadores/${id}.webp`);
    else if (!existsSync(enDisco(j.imagen_bg))) c4.push(`[${id}] no existe el fondo ${j.imagen_bg}`);
  }
  const usados = new Map<string, number>();
  for (const j of [...datos.core, ...datos.expansiones]) {
    if (usados.has(j.imagen)) c4.push(`[${j.id}] retrato repetido con el ${usados.get(j.imagen)}`);
    usados.set(j.imagen, j.id);
  }
  const dirRetratos = resolve(PUBLICO, 'cartas/retratos-propios');
  for (const f of readdirSync(dirRetratos).filter((x) => x.endsWith('.webp'))) {
    if (!usados.has(`${PREFIJO_RETRATO}${f}`)) c4.push(`retratos-propios/${f} no lo usa ninguna ficha`);
  }

  const media = (js: Jugador[]) => (js.length ? js.reduce((a, j) => a + peso(enDisco(j.imagen)) + peso(enDisco(j.imagen_bg)), 0) / js.length : 0);
  const pesos = {
    core: media(datos.core),
    expansiones: media(deExpansion.map((id) => porId.get(id)).filter((j): j is Jugador => j !== undefined && !idsCore.has(j.id))),
  };
  const c5 = pesos.expansiones <= 1.1 * pesos.core ? [] : [`Retrato + fondo medio ${kb(pesos.expansiones)} > 1,10 × ${kb(pesos.core)} del Core`];

  return {
    comprobaciones: [
      { titulo: '1. Catálogo válido (FR-006)', errores: datos.erroresCatalogo },
      { titulo: '2. Cada expansión: 24 cartas, 6 por nivel, números 1..24 y sobre de regalo (SC-001)', errores: c2 },
      { titulo: '3. Core: 300 cartas, Kimmich dentro con media ≥ 88 y Verratti fuera (FR-007)', errores: c3 },
      { titulo: '4. Retrato y fondo en disco para cada carta y ningún retrato sin ficha (FR-015)', errores: c4 },
      { titulo: '5. Peso medio de retrato + fondo ≤ 1,10 × el del Core (SC-009)', errores: c5 },
    ],
    pesos,
  };
}

const kb = (b: number) => `${(b / 1024).toFixed(1)} KB`;
const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');

/** Nombres de las listas del origen (o de su copia en `fuentes/`), por letra y número, para anotar las erratas. */
function nombresDeLista(origen: string | undefined): Map<string, string> {
  const nombres = new Map<string, string>();
  for (const { letra } of EXPANSIONES) {
    const ruta = [origen && join(origen, `Expansion ${letra}`, `rareza_${letra}.txt`), join(SPEC, 'fuentes', `rareza_${letra}.txt`)].find(
      (r): r is string => !!r && existsSync(r),
    );
    if (!ruta) continue;
    for (const linea of readFileSync(ruta, 'utf-8').split(/\r?\n/)) {
      const m = /^(\d+)[,.](.+)$/.exec(linea.trim());
      if (m) nombres.set(`${letra}-${Number(m[1])}`, m[2]!.trim());
    }
  }
  return nombres;
}

function sumario(datos: Datos, r: ReturnType<typeof validar>, origen: string | undefined): string {
  const porId = new Map([...datos.core, ...datos.expansiones].map((j) => [j.id, j]));
  const lista = nombresDeLista(origen);
  const l = [
    '# Sumario — Expansiones reales (spec 016)',
    '',
    'Generado por `pnpm --filter @fbd/fixtures expansiones` a partir de `data/expansiones-reales.json`, `data/core-real.json` y `data/colecciones.json`. No se edita a mano.',
    '',
    '## Comprobaciones',
    '',
  ];
  for (const c of r.comprobaciones) {
    l.push(`- ${c.errores.length ? '❌' : '✅'} ${c.titulo}`);
    for (const e of c.errores.slice(0, 30)) l.push(`  - ${e}`);
    if (c.errores.length > 30) l.push(`  - … y ${c.errores.length - 30} más`);
  }
  l.push('', `Peso medio de retrato + fondo: expansiones ${kb(r.pesos.expansiones)}, Core ${kb(r.pesos.core)} (límite ${kb(1.1 * r.pesos.core)}).`, '');
  const erratas: string[] = [];
  for (const x of EXPANSIONES) {
    const col = datos.colecciones.find((c) => c.id === x.id);
    if (!col) continue;
    l.push(`## ${x.letra}. ${col.nombre} (\`${col.id}\`, regala \`${col.sobreRegalo ?? '—'}\`)`, '');
    l.push('| Nº | Id | Carta | Nivel | Demarcación | Media | Virtudes | Defectos |', '|---:|---:|---|---|---|---:|---|---|');
    for (const c of [...col.cartas].sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0))) {
      const j = porId.get(c.id);
      if (!j) continue;
      l.push(`| ${c.numero} | ${j.id} | ${j.nombre_carta} | ${j.nivel} | ${j.demarcacion} | ${j.media} | ${j.virtudes.join(', ')} | ${j.defectos.join(', ')} |`);
    }
    for (let n = 1; n <= col.cartas.length; n++) {
      const enLista = lista.get(`${x.letra}-${n}`);
      const id = idDestino(col, n);
      const j = id === undefined ? undefined : porId.get(id);
      if (!enLista || !j) continue;
      const candidatos = [j.nombre_carta, `${j.nombre} ${j.apellidos}`].map(normalizar);
      const limpio = normalizar(enLista.replace(/\(.*\)/, ''));
      if (!candidatos.some((c) => c.includes(limpio) || limpio.includes(c))) erratas.push(`${x.letra}-${n}: «${enLista}» → ${j.nombre} ${j.apellidos} («${j.nombre_carta}»)`);
    }
    const cartas = col.cartas.map((c) => porId.get(c.id)).filter((j): j is Jugador => !!j);
    const recuento = recuentoPorDemarcacionYNivel(cartas);
    l.push('', `| | ${NIVELES.join(' | ')} |`, `|---|${NIVELES.map(() => '---:').join('|')}|`);
    for (const d of DEMARCACIONES) l.push(`| ${d} | ${NIVELES.map((n: Nivel) => recuento[d][n]).join(' | ')} |`);
    l.push('');
  }
  l.push('## Nombres de la lista corregidos', '');
  if (lista.size === 0) l.push('Sin listas del origen a mano (`--origen` o `fuentes/`).');
  else if (erratas.length === 0) l.push('Ninguno.');
  for (const e of erratas) l.push(`- ${e}`);
  return l.join('\n') + '\n';
}

async function principal(): Promise<void> {
  const args = process.argv.slice(2).filter((a) => a !== '--');
  const valor = (k: string) => {
    const i = args.indexOf(k);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const origen = valor('--origen') ? resolve(process.cwd(), valor('--origen')!) : undefined;
  const solo = valor('--solo')?.toUpperCase();
  if (solo && !EXPANSIONES.some((x) => x.letra === solo)) {
    console.error('Uso: pnpm --filter @fbd/fixtures expansiones -- [--origen <dir>] [--solo A|B|C|D]');
    process.exit(2);
  }
  const letras = solo ? [solo as Letra] : EXPANSIONES.map((x) => x.letra);
  const datos = leerDatos();
  if (origen) {
    const errores = await generar(origen, letras, datos, console.log);
    if (errores.length) {
      for (const e of errores) console.error(`expansiones: ${e}`);
      console.error(`expansiones: ${errores.length} errores en el origen; no se ha escrito nada.`);
      process.exit(1);
    }
  }
  const r = validar(datos, letras);
  writeFileSync(join(SPEC, 'sumario.md'), sumario(datos, r, origen), 'utf-8');
  for (const c of r.comprobaciones) console.log(`${c.errores.length ? '❌' : '✅'} ${c.titulo}${c.errores.length ? ` (${c.errores.length})` : ''}`);
  console.log(`expansiones: sumario en ${join(SPEC, 'sumario.md')}.`);
  if (r.comprobaciones.some((c) => c.errores.length)) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await principal();

