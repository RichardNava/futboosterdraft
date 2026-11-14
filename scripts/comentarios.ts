/**
 * Lo exportado sin comentario (spec 014, FR-031, SC-012; research R12): recorre con la API de TypeScript cada fichero
 * de código (no de prueba) de `apps/*\/src`, `packages/*\/src`, `tools/*\/src` y `scripts/`, y lista las funciones,
 * clases, métodos públicos, componentes y `const` de función exportados sin un comentario JSDoc delante. Sale con
 * código 1 si hay alguno.
 *
 *   pnpm tsx scripts/comentarios.ts [--resumen]
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import ts from 'typescript';

const RAIZ = join(import.meta.dirname, '..');
const CARPETAS = ['apps', 'packages', 'tools'].flatMap((g) =>
  readdirSync(join(RAIZ, g))
    .map((p) => join(RAIZ, g, p, 'src'))
    .filter((d) => statSync(d, { throwIfNoEntry: false })?.isDirectory()),
);
CARPETAS.push(join(RAIZ, 'scripts'));

const esCodigo = (f: string) => /\.(ts|tsx)$/.test(f) && !/\.(test|spec)\.tsx?$/.test(f) && !f.endsWith('.d.ts');

function ficheros(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const ruta = join(dir, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' || e.name === 'tests' ? [] : ficheros(ruta);
    return esCodigo(ruta) ? [ruta] : [];
  });
}

/** ¿Tiene el nodo un comentario `/** … *\/` justo delante? */
function conJSDoc(nodo: ts.Node, texto: string): boolean {
  const comentarios = ts.getLeadingCommentRanges(texto, nodo.getFullStart()) ?? [];
  return comentarios.some((c) => texto.startsWith('/**', c.pos));
}

const exportado = (n: ts.Node) => ts.canHaveModifiers(n) && (ts.getModifiers(n) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

const esFuncion = (e: ts.Expression | undefined): boolean => {
  if (!e) return false;
  if (ts.isArrowFunction(e) || ts.isFunctionExpression(e)) return true;
  // `memo(...)`, `forwardRef(...)` y similares que envuelven un componente.
  return ts.isCallExpression(e) && e.arguments.some((a) => ts.isArrowFunction(a) || ts.isFunctionExpression(a));
};

interface Falta {
  fichero: string;
  linea: number;
  nombre: string;
}

function revisar(ruta: string): Falta[] {
  const texto = readFileSync(ruta, 'utf-8');
  const fuente = ts.createSourceFile(ruta, texto, ts.ScriptTarget.Latest, true, ruta.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const faltas: Falta[] = [];
  const anotar = (nodo: ts.Node, nombre: string) => {
    if (!conJSDoc(nodo, texto)) faltas.push({ fichero: relative(RAIZ, ruta).split(sep).join('/'), linea: fuente.getLineAndCharacterOfPosition(nodo.getStart()).line + 1, nombre });
  };
  for (const s of fuente.statements) {
    if (!exportado(s)) continue;
    if (ts.isFunctionDeclaration(s)) anotar(s, s.name?.text ?? 'default');
    else if (ts.isClassDeclaration(s)) {
      anotar(s, s.name?.text ?? 'default');
      for (const m of s.members) {
        const privado = (ts.getModifiers(m) ?? []).some((x) => x.kind === ts.SyntaxKind.PrivateKeyword || x.kind === ts.SyntaxKind.ProtectedKeyword);
        if ((ts.isMethodDeclaration(m) || ts.isGetAccessor(m)) && !privado && m.name && ts.isIdentifier(m.name)) anotar(m, `${s.name?.text}.${m.name.text}`);
      }
    } else if (ts.isVariableStatement(s)) {
      for (const d of s.declarationList.declarations) if (ts.isIdentifier(d.name) && esFuncion(d.initializer)) anotar(s, d.name.text);
    }
  }
  return faltas;
}

const faltas = CARPETAS.flatMap(ficheros).flatMap(revisar);
if (process.argv.includes('--resumen')) {
  const porCarpeta = new Map<string, number>();
  for (const f of faltas) {
    const clave = f.fichero.split(/[\\/]/).slice(0, 2).join('/');
    porCarpeta.set(clave, (porCarpeta.get(clave) ?? 0) + 1);
  }
  for (const [c, n] of [...porCarpeta].sort()) console.log(`${String(n).padStart(5)}  ${c}`);
} else for (const f of faltas) console.log(`${f.fichero}:${f.linea}  ${f.nombre}`);
console.log(`\n${faltas.length} exportaciones sin comentario`);
process.exitCode = faltas.length > 0 ? 1 : 0;
