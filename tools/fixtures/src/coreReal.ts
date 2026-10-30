/**
 * Fusión de los datos reales de Core (spec 008, research R7 y R11; contracts/datos-core-real.md).
 *
 * 1. Valida `data/core-real.json` (`validarColeccion`) y las invariantes del contrato: ids 1–N sin huecos, un
 *    retrato existente y distinto por ficha que cubra todos los de `apps/web/public/cartas/retratos/`, y el fondo
 *    genérico de su demarcación.
 * 2. Sustituye las cartas de `data/core.json` por las de `core-real.json` (ya no quedan ficticias) y pone `version: "2.0.0"`.
 * 3. Escribe `specs/008-datos-reales-core/sumario.md` con `sumarioCore` (FR-017 a FR-020).
 *
 * Si hay errores, los imprime como `[id] regla: mensaje`, sale con código 1 y no escribe nada. Es idempotente.
 *
 * Uso: `pnpm --filter @fbd/fixtures core-real`.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEMARCACIONES,
  DISTRIBUCION_CORE,
  ErrorPoolInsuficiente,
  FORMACIONES,
  generarMesa,
  NIVELES,
  parametrosActuales,
  POSICIONES,
  POSICIONES_POR_DEMARCACION,
  proporcionDefectosPorNivel,
  recuentoPorDemarcacionYNivel,
  REPARTO_DEFECTOS,
  semillaDesdeTexto,
  validarColeccion,
  type Demarcacion,
  type Jugador,
  type Nivel,
  type Posicion,
  type RecuentoCatalogo,
} from '@fbd/domain';

const RAIZ = fileURLToPath(new URL('../../../', import.meta.url));
const PARTICIPANTES = 8;
const RUTA_RETRATO = /^\/cartas\/retratos\/[a-z0-9-]+\.webp$/;

/** Bandas de media por nivel (spec 008, Contexto). GOAT no tiene techo. */
const BANDAS: Readonly<Record<Nivel, [number, number]>> = {
  Superclase: [70, 79.9],
  Crack: [78, 84.9],
  Legendario: [83, 89.9],
  GOAT: [88, 99],
};
const ETIQUETA_NIVEL: Readonly<Record<Nivel, string>> = { Superclase: 'Superclase', Crack: 'Crack', Legendario: 'Legendario', GOAT: 'GOAT' };

export interface Celda {
  actual: number;
  objetivo: number;
  /** objetivo − actual: > 0 es hueco, < 0 es exceso. */
  diferencia: number;
}

export interface CoberturaPosicion {
  principal: number;
  secundaria: number;
  cobertura: number;
  /** Máximo de casillas de la posición en una formación × participantes de una mesa. */
  necesarias: number;
  pocaCobertura: boolean;
}

export interface SumarioCore {
  tabla: Record<Demarcacion, Record<Nivel, Celda>>;
  huecos: number;
  excesos: number;
  posiciones: Record<Posicion, CoberturaPosicion>;
  nacionalidades: { codigo: string; n: number; unica: boolean; mucha: boolean }[];
  defectos: Partial<Record<Nivel, { proporcion: number; esperada: number }>>;
  recolocaciones: {
    demarcacion: Demarcacion;
    nivel: Nivel;
    sobran: number;
    candidatos: { id: number; nombre_carta: string; media: number; nivelPropuesto: Nivel }[];
  }[];
  necesidades: { demarcacion: Demarcacion; nivel: Nivel; cuantos: number; posicionPreferida: Posicion; texto: string }[];
}

/** Recuento de los jugadores reales frente a la distribución objetivo de Core (data-model §5). */
export function sumarioCore(jugadores: readonly Jugador[], distribucion: RecuentoCatalogo = DISTRIBUCION_CORE): SumarioCore {
  const recuento = recuentoPorDemarcacionYNivel(jugadores);
  const tabla = {} as SumarioCore['tabla'];
  let huecos = 0;
  let excesos = 0;
  for (const d of DEMARCACIONES) {
    tabla[d] = {} as Record<Nivel, Celda>;
    for (const n of NIVELES) {
      const celda = { actual: recuento[d][n], objetivo: distribucion[d][n], diferencia: distribucion[d][n] - recuento[d][n] };
      tabla[d][n] = celda;
      if (celda.diferencia > 0) huecos += celda.diferencia;
      else excesos -= celda.diferencia;
    }
  }

  const formaciones = Object.values(FORMACIONES);
  const posiciones = {} as SumarioCore['posiciones'];
  for (const p of POSICIONES) {
    const principal = jugadores.filter((j) => j.posicion[0] === p).length;
    const secundaria = jugadores.filter((j) => j.posicion.indexOf(p) > 0).length;
    const necesarias = Math.max(...formaciones.map((f) => f.casillas.filter((c) => c.posicionesAdmitidas.includes(p)).length)) * PARTICIPANTES;
    posiciones[p] = { principal, secundaria, cobertura: principal + secundaria, necesarias, pocaCobertura: principal + secundaria < necesarias };
  }

  const porPais = new Map<string, number>();
  for (const j of jugadores) porPais.set(j.nacionalidad, (porPais.get(j.nacionalidad) ?? 0) + 1);
  const nacionalidades = [...porPais]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([codigo, n]) => ({ codigo, n, unica: n === 1, mucha: n / jugadores.length > 0.1 }));

  const proporcion = proporcionDefectosPorNivel(jugadores);
  const defectos: SumarioCore['defectos'] = {};
  for (const n of NIVELES) if (proporcion[n] !== undefined) defectos[n] = { proporcion: proporcion[n]!, esperada: REPARTO_DEFECTOS[n].conDefecto };

  // Excesos: los más cercanos al borde de su banda que dan al nivel vecino con hueco.
  const recolocaciones: SumarioCore['recolocaciones'] = [];
  for (const d of DEMARCACIONES) {
    NIVELES.forEach((n, i) => {
      const sobran = -tabla[d][n].diferencia;
      if (sobran <= 0) return;
      const vecinos = [NIVELES[i - 1], NIVELES[i + 1]].filter((v): v is Nivel => v !== undefined && tabla[d][v].diferencia > 0);
      const candidatos = jugadores
        .filter((j) => j.demarcacion === d && j.nivel === n)
        .flatMap((j) =>
          vecinos.map((v) => ({ j, v, distancia: NIVELES.indexOf(v) < i ? j.media - BANDAS[n][0] : BANDAS[v][0] - j.media })),
        )
        .sort((a, b) => a.distancia - b.distancia || a.j.id - b.j.id);
      const elegidos = new Set<number>();
      const lista: SumarioCore['recolocaciones'][number]['candidatos'] = [];
      for (const { j, v } of candidatos) {
        if (lista.length >= sobran || elegidos.has(j.id)) continue;
        elegidos.add(j.id);
        lista.push({ id: j.id, nombre_carta: j.nombre_carta, media: j.media, nivelPropuesto: v });
      }
      recolocaciones.push({ demarcacion: d, nivel: n, sobran, candidatos: lista });
    });
  }

  const necesidades: SumarioCore['necesidades'] = [];
  for (const d of DEMARCACIONES) {
    const posicionPreferida = [...POSICIONES_POR_DEMARCACION[d]].sort(
      (a, b) => posiciones[a].cobertura - posiciones[a].necesarias - (posiciones[b].cobertura - posiciones[b].necesarias),
    )[0]!;
    for (const n of NIVELES) {
      const cuantos = tabla[d][n].diferencia;
      if (cuantos <= 0) continue;
      const pref = d === 'POR' ? '' : `, preferiblemente ${posicionPreferida}`;
      const faltan = cuantos === 1 ? 'Falta' : 'Faltan';
      necesidades.push({ demarcacion: d, nivel: n, cuantos, posicionPreferida, texto: `${faltan} ${cuantos} ${d} ${ETIQUETA_NIVEL[n]}${pref}` });
    }
  }
  necesidades.sort((a, b) => b.cuantos - a.cuantos || DEMARCACIONES.indexOf(a.demarcacion) - DEMARCACIONES.indexOf(b.demarcacion));

  return { tabla, huecos, excesos, posiciones, nacionalidades, defectos, recolocaciones, necesidades };
}

const pct = (x: number) => `${Math.round(x * 100)} %`;

/** Mesas de 8 que el generador de sobres no puede completar con el pool dado (research R8). */
export function mesasFallidas(pool: readonly Jugador[], mesas = 200): number {
  let fallos = 0;
  for (let i = 0; i < mesas; i++) {
    try {
      generarMesa(pool, PARTICIPANTES, semillaDesdeTexto(`core-real-${i}`), parametrosActuales());
    } catch (e) {
      if (!(e instanceof ErrorPoolInsuficiente)) throw e;
      fallos++;
    }
  }
  return fallos;
}

/** Sumario en Markdown (T025). `generador`: mesas de 8 fallidas sobre las probadas con el core.json fusionado. */
export function sumarioMarkdown(s: SumarioCore, total: number, generador?: { fallos: number; mesas: number }): string {
  const l: string[] = [
    '# Sumario — Colección Core real (spec 008, fase 0.1)',
    '',
    `Generado por \`pnpm --filter @fbd/fixtures core-real\` a partir de \`data/core-real.json\` (${total} jugadores). No se edita a mano.`,
    '',
    '## 1. Demarcación × nivel',
    '',
    'Cada celda: actual / objetivo (diferencia; + es hueco, − es exceso).',
    '',
    `| Demarcación | ${NIVELES.map((n) => ETIQUETA_NIVEL[n]).join(' | ')} | Total |`,
    `|---|${NIVELES.map(() => '---:').join('|')}|---:|`,
  ];
  for (const d of DEMARCACIONES) {
    const celdas = NIVELES.map((n) => {
      const c = s.tabla[d][n];
      return `${c.actual} / ${c.objetivo} (${c.diferencia > 0 ? '+' : ''}${c.diferencia})`;
    });
    const actual = NIVELES.reduce((a, n) => a + s.tabla[d][n].actual, 0);
    const objetivo = NIVELES.reduce((a, n) => a + s.tabla[d][n].objetivo, 0);
    l.push(`| ${d} | ${celdas.join(' | ')} | ${actual} / ${objetivo} |`);
  }
  l.push('', `Huecos: **${s.huecos}**. Excesos: **${s.excesos}**. Huecos − excesos = **${s.huecos - s.excesos}** (lo que falta para la distribución objetivo; negativo si sobran cartas).`, '');

  l.push('## 2. Posiciones', '', `«Necesarias»: el máximo de casillas de la posición en una formación del juego × ${PARTICIPANTES} participantes.`, '');
  l.push('| Posición | Principal | Secundaria | Cobertura | Necesarias | |', '|---|---:|---:|---:|---:|---|');
  for (const p of POSICIONES) {
    const c = s.posiciones[p];
    l.push(`| ${p} | ${c.principal} | ${c.secundaria} | ${c.cobertura} | ${c.necesarias} | ${c.pocaCobertura ? '⚠ poca cobertura' : ''} |`);
  }

  l.push('', '## 3. Nacionalidades', '', '| Selección | Jugadores | |', '|---|---:|---|');
  for (const n of s.nacionalidades) l.push(`| ${n.codigo} | ${n.n} | ${n.mucha ? 'más del 10 %' : n.unica ? 'solo 1' : ''} |`);

  l.push('', '## 4. Reparto de defectos por nivel', '', '| Nivel | Con defecto | Esperado | Desviación |', '|---|---:|---:|---:|');
  for (const n of NIVELES) {
    const d = s.defectos[n];
    if (d) l.push(`| ${ETIQUETA_NIVEL[n]} | ${pct(d.proporcion)} | ${pct(d.esperada)} | ${d.proporcion >= d.esperada ? '+' : ''}${Math.round((d.proporcion - d.esperada) * 100)} pts |`);
  }
  l.push('', 'Los defectos reflejan la valoración honesta de cada jugador (FR-011); una desviación grande se corrige revisando fichas.');

  l.push('', '## 5. Excesos y propuestas de recolocación', '');
  if (s.recolocaciones.length === 0) l.push('Ningún cupo se sobrepasa.');
  for (const r of s.recolocaciones) {
    l.push(`- **${r.demarcacion} ${ETIQUETA_NIVEL[r.nivel]}**: sobran ${r.sobran}.`);
    if (r.candidatos.length === 0) l.push('  - Ningún nivel vecino tiene hueco: el exceso se compensa eligiendo menos cartas de otro nivel.');
    for (const c of r.candidatos) l.push(`  - [${c.id}] ${c.nombre_carta} (media ${c.media}) → ${ETIQUETA_NIVEL[c.nivelPropuesto]}`);
  }

  l.push('', '## 6. Necesidades para la distribución objetivo', '');
  if (generador && generador.fallos > 0) {
    l.push(
      `**Prioridad 0 — el draft de 8 no siempre se puede generar.** Con el \`core.json\` actual, ` +
        `${generador.fallos} de ${generador.mesas} mesas de 8 se quedan sin cartas (\`generador.test\` falla). ` +
        'Se agotan primero las celdas con más hueco de POR, DEF y MED, sobre todo los Superclase: hay que cubrir antes ' +
        'las primeras necesidades de la lista y volver a lanzar este comando para comprobarlo.',
      '',
    );
  }
  l.push('Por orden de prioridad (tamaño del hueco). La posición preferida es la de menor cobertura de la demarcación.', '');
  for (const n of s.necesidades) l.push(`1. ${n.texto}.`);
  if (s.excesos > 0) l.push('', `Como hay ${s.excesos} cartas de más en otras celdas, los huecos suman ${s.huecos}: cuadrar la distribución obliga a recolocar o sustituir ${s.excesos} (sección 5).`);
  return l.join('\n') + '\n';
}

interface ErrorFusion {
  id: unknown;
  regla: string;
  mensaje: string;
}

/** Comprobaciones del contrato §1 además de `validarColeccion`. */
export function validarCoreReal(jugadores: readonly Jugador[], retratos: readonly string[]): ErrorFusion[] {
  const errores: ErrorFusion[] = validarColeccion(jugadores);
  const ids = new Set(jugadores.map((j) => j.id));
  for (let id = 1; id <= jugadores.length; id++) if (!ids.has(id)) errores.push({ id, regla: 'id', mensaje: `Falta el id ${id}` });
  for (const j of jugadores) {
    if (!Number.isInteger(j.id) || j.id < 1 || j.id > jugadores.length) errores.push({ id: j.id, regla: 'id', mensaje: `El id debe estar entre 1 y ${jugadores.length}` });
    if (!RUTA_RETRATO.test(j.imagen)) errores.push({ id: j.id, regla: 'imagen', mensaje: `"imagen" debe ser /cartas/retratos/<slug>.webp` });
    else if (!retratos.includes(j.imagen.slice('/cartas/retratos/'.length))) errores.push({ id: j.id, regla: 'imagen', mensaje: `No existe ${j.imagen}` });
    const fondo = `/cartas/fondos/${String(j.demarcacion).toLowerCase()}.svg`;
    if (j.imagen_bg !== fondo) errores.push({ id: j.id, regla: 'imagen_bg', mensaje: `"imagen_bg" debe ser ${fondo}` });
  }
  const usadas = new Map<string, number>();
  for (const j of jugadores) {
    if (usadas.has(j.imagen)) errores.push({ id: j.id, regla: 'imagen', mensaje: `Retrato repetido con el id ${usadas.get(j.imagen)}` });
    usadas.set(j.imagen, j.id);
  }
  for (const r of retratos) {
    if (!usadas.has(`/cartas/retratos/${r}`)) errores.push({ id: undefined, regla: 'imagen', mensaje: `El retrato ${r} no lo usa ninguna ficha` });
  }
  return errores;
}

function principal(): void {
  const rutaReal = resolve(RAIZ, 'data/core-real.json');
  const rutaCore = resolve(RAIZ, 'data/core.json');
  const dirRetratos = resolve(RAIZ, 'apps/web/public/cartas/retratos');
  const rutaSumario = resolve(RAIZ, 'specs/008-datos-reales-core/sumario.md');

  // shortcut: el esquema JSON no se comprueba aquí (ajv solo está en apps/server); validarColeccion aplica las mismas
  // reglas de campos y valores, y `pnpm seed` valida el esquema de core.json.
  const real = JSON.parse(readFileSync(rutaReal, 'utf-8')) as { version: string; jugadores: Jugador[] };
  const retratos = existsSync(dirRetratos) ? readdirSync(dirRetratos).filter((f) => f.endsWith('.webp')) : [];
  const errores = Array.isArray(real.jugadores)
    ? validarCoreReal(real.jugadores, retratos)
    : [{ id: undefined, regla: 'campos', mensaje: '"jugadores" debe ser una lista' }];

  const textoCore = readFileSync(rutaCore, 'utf-8');
  const core = JSON.parse(textoCore) as { version: string; jugadores: Jugador[] };
  const jugadores = [...real.jugadores].sort((a, b) => a.id - b.id);

  if (errores.length) {
    for (const e of errores) console.error(`[${String(e.id ?? '-')}] ${e.regla}: ${e.mensaje}`);
    console.error(`core-real: ${errores.length} errores; no se ha escrito nada.`);
    process.exit(1);
  }

  const salto = textoCore.includes('\r\n') ? '\r\n' : '\n';
  writeFileSync(rutaCore, JSON.stringify({ ...core, version: '2.0.0', jugadores }, null, 2).replace(/\n/g, salto) + salto, 'utf-8');
  const sumario = sumarioCore(real.jugadores, DISTRIBUCION_CORE);
  const generador = { fallos: mesasFallidas(jugadores), mesas: 200 };
  writeFileSync(rutaSumario, sumarioMarkdown(sumario, real.jugadores.length, generador), 'utf-8');
  console.log(`core-real: ${real.jugadores.length} cartas reales fusionadas en ${rutaCore} (${jugadores.length} en total, versión 2.0.0).`);
  console.log(`core-real: sumario en ${rutaSumario} (huecos ${sumario.huecos}, excesos ${sumario.excesos}).`);
  if (generador.fallos) console.warn(`core-real: AVISO: ${generador.fallos} de ${generador.mesas} mesas de 8 no se pueden generar.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) principal();
