// Comprueba que ningún fichero de la interfaz use valores visuales literales (spec 004, FR-037, research R5).
// Colores, radios, sombras y familias tipográficas salen de `src/estilos/tokens.css`. Node puro, sin dependencias:
//   pnpm --filter @fbd/web lint:tokens
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Ficheros que pueden contener literales, con el motivo. Rutas relativas a `apps/web`. */
const EXCEPCIONES = {
  'src/estilos/tokens.css': 'fuente única de los valores visuales',
  'src/estilos/fuentes.css': 'declaración de las familias (@font-face)',
  'src/estilos/cartas.css': 'degradados y efectos internos de las cartas y los sobres (objetos de juego)',
  'src/campo2d/renderizador.ts': 'césped y líneas del campo 2D (objeto de juego); el resto se lee de los tokens',
  'src/pantallas/PruebasCartas.tsx': 'pantalla de desarrollo fuera del inventario',
  'src/componentes/colores.ts': 'conversión de los colores de equipación, que vienen de los datos',
  'src/componentes/AperturaSobre.tsx': 'partículas de la apertura de sobres (objeto de juego, 003/FR-011 a FR-015)',
  'src/componentes/SiluetaJugador.tsx': 'silueta dentro de la carta (objeto de juego, 003/FR-008)',
};

/** Carpetas cuyos ficheros pueden contener literales, con el motivo. */
const CARPETAS_EXCEPTUADAS = {
  'src/componentes/arte/': 'ilustraciones propias en SVG: escudo, sobre, trofeo y estadio (spec 004, FR-044)',
};

/**
 * Marca para una línea con colores que son datos de juego (p. ej. los colores de una equipación nueva), con el
 * motivo detrás: `// lint-tokens: datos de equipación`.
 */
const MARCA_DATOS = 'lint-tokens: datos';

const raiz = join(fileURLToPath(import.meta.url), '..', '..');
const extensiones = /\.(css|ts|tsx)$/;

/** Cada regla devuelve un mensaje si la línea (sin comentarios) la incumple. */
const REGLAS = [
  {
    nombre: 'color hexadecimal',
    // #rgb, #rgba, #rrggbb o #rrggbbaa; no las entidades HTML (&#123;) ni los anclas (#seccion).
    patron: /(?<![&\w])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/,
  },
  { nombre: 'función de color', patron: /\b(?:rgba?|hsla?)\(/ },
  {
    nombre: 'color con nombre',
    patron:
      /(?:^|[\s{;])(?:color|background(?:-color)?|border(?:-\w+)*|outline(?:-color)?|fill|stroke|accent-color)\s*:\s*[^;]*\b(?:white|black|gr[ae]y|red|green|blue|yellow|orange|gold|silver)\b/,
  },
  {
    nombre: 'border-radius literal',
    // Se permiten 0 y 50 % (formas circulares, no esquinas); el resto debe venir de --radio.
    patron: /border(?:-[a-z]+)*-radius\s*:\s*(?![^;]*var\()(?!\s*(?:0|50%|inherit)\s*[;!}]|\s*(?:0|50%|inherit)\s*$)[^;]*\d/,
  },
  { nombre: 'borderRadius literal', patron: /\bborderRadius\s*:\s*(?:\d|['"`][^'"`]*\d)/ },
  {
    nombre: 'box-shadow literal',
    // Solo `none` o un único token: `box-shadow: var(--sombra-barra)`.
    patron: /box-shadow\s*:\s*(?!\s*(?:none|var\(--[\w-]+\))\s*(?:!important)?\s*[;}]|\s*(?:none|var\(--[\w-]+\))\s*$)/,
  },
  { nombre: 'boxShadow literal', patron: /\bboxShadow\s*:\s*['"`](?!none)/ },
  {
    nombre: 'familia tipográfica literal',
    patron: /font-family\s*:\s*(?!\s*(?:var\(--[\w-]+\)|inherit)\s*(?:!important)?\s*[;}]|\s*(?:var\(--[\w-]+\)|inherit)\s*$)/,
  },
  { nombre: 'fontFamily literal', patron: /\bfontFamily\s*:\s*['"`]/ },
];

function* recorrer(dir) {
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) yield* recorrer(ruta);
    else if (extensiones.test(nombre)) yield ruta;
  }
}

/** Sustituye los comentarios por espacios, conservando los saltos de línea para no mover los números. */
function sinComentarios(texto, esCss) {
  const bloque = texto.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
  if (esCss) return bloque;
  return bloque.replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (c, previo) => previo + ' '.repeat(c.length - previo.length));
}

const fallos = [];
for (const fichero of recorrer(join(raiz, 'src'))) {
  const rel = relative(raiz, fichero).split(sep).join('/');
  if (rel in EXCEPCIONES || Object.keys(CARPETAS_EXCEPTUADAS).some((c) => rel.startsWith(c))) continue;
  const texto = readFileSync(fichero, 'utf8');
  const originales = texto.split('\n');
  const lineas = sinComentarios(texto, rel.endsWith('.css')).split('\n');
  lineas.forEach((linea, i) => {
    if (originales[i]?.includes(MARCA_DATOS)) return;
    for (const regla of REGLAS) {
      if (regla.patron.test(linea)) fallos.push(`${rel}:${i + 1}  ${regla.nombre}: ${linea.trim()}`);
    }
  });
}

if (fallos.length > 0) {
  console.error(`Valores visuales literales fuera de src/estilos/tokens.css (${fallos.length}):\n`);
  for (const f of fallos) console.error(`  ${f}`);
  console.error('\nUsa un token de tokens.css o, si es un objeto de juego, añade la excepción con su motivo.');
  process.exit(1);
}
console.log('lint:tokens: sin valores visuales literales.');
