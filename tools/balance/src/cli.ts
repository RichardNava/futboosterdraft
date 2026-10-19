#!/usr/bin/env tsx
/**
 * Herramienta de equilibrado (research R8): ejecuta series de partidos con semillas fijas y comprueba
 * los criterios estadísticos de la especificación. Termina con código 1 si alguno no se cumple.
 *
 *   pnpm balance --n 1000                     comprobaciones de partido de las specs 001, 002 y 003
 *   pnpm balance --n 1000 --serie todas       también las de la serie Core (plantillas draftadas por NPC)
 *   pnpm balance --solo 003/SC-001,SC-004     solo esas comprobaciones (por id o prefijo de id)
 *   pnpm balance --torneos 100                comprobaciones de NPC (003/SC-010, SC-010a y SC-010b)
 *
 * Cada ejecución genera además `tools/balance/salida/informe.html` (Principio IX, T032a).
 */
import { comprobacionesColocacion } from './checks/colocacion';
import { comprobacionesPartido, type Comprobacion } from './checks/partido';

export type Serie = 'sintetica' | 'core' | 'todas';

export interface OpcionesBalance {
  n: number;
  seed: number;
  torneos: number;
  proVsAmateur: boolean;
  /** Ids (o prefijos de id) de las comprobaciones que se ejecutan; vacío = todas. */
  solo: string[];
  serie: Serie;
}

/** Un grupo de comprobaciones que se calculan juntas (comparten series de partidos). */
export interface GrupoComprobaciones {
  /** Ids que devuelve el grupo, para poder filtrarlo con `--solo` sin ejecutarlo. */
  ids: readonly string[];
  /** Serie de partidos que usa: la sintética, la Core o los torneos de NPC. */
  serie: 'sintetica' | 'core' | 'npc';
  ejecutar: (opciones: OpcionesBalance) => Comprobacion[] | Promise<Comprobacion[]>;
}

export function leerOpciones(args: readonly string[]): OpcionesBalance {
  const opciones: OpcionesBalance = { n: 1000, seed: 1, torneos: 0, proVsAmateur: false, solo: [], serie: 'sintetica' };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const valor = args[i + 1];
    switch (arg) {
      case '--n':
        opciones.n = Number(valor);
        i++;
        break;
      case '--seed':
        opciones.seed = Number(valor);
        i++;
        break;
      case '--torneos':
        opciones.torneos = Number(valor);
        i++;
        break;
      case '--pro-vs-amateur':
        opciones.proVsAmateur = true;
        break;
      case '--solo':
        opciones.solo = (valor ?? '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        i++;
        break;
      case '--serie':
        if (valor !== 'sintetica' && valor !== 'core' && valor !== 'todas') throw new Error('--serie debe ser sintetica, core o todas');
        opciones.serie = valor;
        i++;
        break;
      default:
        throw new Error(`Argumento desconocido: ${arg}`);
    }
  }
  if (!Number.isInteger(opciones.n) || opciones.n <= 0) throw new Error('--n debe ser un entero positivo');
  return opciones;
}

/** `id` está pedido con `--solo` (coincidencia exacta o por prefijo); sin `--solo`, todos lo están. */
export function pedido(id: string, solo: readonly string[]): boolean {
  return solo.length === 0 || solo.some((s) => id === s || id.startsWith(s));
}

export function informe(comprobaciones: Comprobacion[]): string {
  return comprobaciones.map((c) => `${c.ok ? '✔' : '✘'} ${c.id.padEnd(14)} ${c.descripcion}\n              ${c.detalle}`).join('\n');
}

/** Registro de todas las comprobaciones. Las de la spec 003 se añaden en `checks/partido.ts` y `checks/npc.ts`. */
export async function grupos(): Promise<GrupoComprobaciones[]> {
  const { gruposPartido } = await import('./checks/partido');
  const { gruposPartido003 } = await import('./checks/partido003');
  const { gruposNPC } = await import('./checks/npc');
  return [
    ...gruposPartido003(),
    ...gruposPartido(),
    {
      ids: ['SC-011', 'SC-011b', '002/SC-018'],
      serie: 'sintetica',
      ejecutar: (o) => comprobacionesColocacion(o.n, o.seed),
    },
    ...gruposNPC(),
  ];
}

function grupoSeleccionado(g: GrupoComprobaciones, o: OpcionesBalance): boolean {
  if (g.serie === 'npc') {
    if (!(o.torneos > 0 || o.proVsAmateur)) return false;
  } else {
    if (o.proVsAmateur || (o.torneos > 0 && o.solo.length === 0)) return false;
    if (g.serie === 'core' && o.serie === 'sintetica') return false;
    if (g.serie === 'sintetica' && o.serie === 'core') return false;
  }
  return g.ids.some((id) => pedido(id, o.solo));
}

/**
 * 003/SC-009 (FR-023): con el motor 3.0.0 siguen cumpliéndose 001/SC-004 (+5 de media gana ≥ 60 %) y los SC de
 * la 002 de `checks/partido.ts` y `checks/colocacion.ts`. Se compone con sus resultados.
 */
export const DEPENDENCIAS_SC009 = ['SC-004', '002/SC-007a', '002/SC-007b', '002/SC-008', 'SC-011', 'SC-011b', '002/SC-018'] as const;

export async function ejecutar(opciones: OpcionesBalance): Promise<Comprobacion[]> {
  const conSC009 = opciones.serie !== 'core' && !opciones.proVsAmateur && !(opciones.torneos > 0 && opciones.solo.length === 0) && pedido('003/SC-009', opciones.solo);
  const efectivas = conSC009 && opciones.solo.length > 0 ? { ...opciones, solo: [...opciones.solo, ...DEPENDENCIAS_SC009] } : opciones;
  const todos: Comprobacion[] = [];
  for (const g of await grupos()) {
    if (!grupoSeleccionado(g, efectivas)) continue;
    todos.push(...(await g.ejecutar(efectivas)).filter((c) => pedido(c.id, efectivas.solo)));
  }
  const resultados = todos.filter((c) => pedido(c.id, opciones.solo));
  if (conSC009) {
    const dependencias = DEPENDENCIAS_SC009.map((id) => todos.find((c) => c.id === id));
    resultados.push({
      id: '003/SC-009',
      descripcion: 'Sin regresiones: 001/SC-004 (+5 de media gana ≥ 60 %) y los SC de la 002 siguen cumpliéndose con el motor 3.0.0',
      ok: dependencias.every((c) => c?.ok === true),
      detalle: dependencias.map((c, i) => `${DEPENDENCIAS_SC009[i]} ${c ? (c.ok ? '✔' : '✘') : '?'}`).join(' · '),
    });
  }
  return resultados;
}

/** Compatibilidad: todas las comprobaciones de partido de las specs 001 y 002. */
export function comprobacionesBase(n: number, seed: number): Comprobacion[] {
  return [...comprobacionesPartido(n, seed), ...comprobacionesColocacion(n, seed)];
}

const esPrincipal = process.argv[1]?.replace(/\\/g, '/').endsWith('balance/src/cli.ts');
if (esPrincipal) {
  const opciones = leerOpciones(process.argv.slice(2).filter((a) => a !== '--'));
  const inicio = Date.now();
  ejecutar(opciones).then(async (resultados) => {
    console.log(informe(resultados));
    const fallos = resultados.filter((r) => !r.ok).length;
    const segundos = (Date.now() - inicio) / 1000;
    console.log(`\n${resultados.length - fallos}/${resultados.length} comprobaciones superadas en ${segundos.toFixed(1)} s`);
    const { escribirInforme } = await import('./informe');
    const ruta = escribirInforme(resultados, { fecha: new Date(), seed: opciones.seed, n: opciones.n, serie: opciones.serie, torneos: opciones.torneos, segundos });
    console.log(`Informe: ${ruta}`);
    if (fallos) process.exitCode = 1;
  });
}
