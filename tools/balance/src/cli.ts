#!/usr/bin/env tsx
/**
 * Herramienta de equilibrado (research R8): ejecuta series de partidos con semillas fijas y comprueba
 * los criterios estadísticos de la especificación. Termina con código 1 si alguno no se cumple.
 *
 *   pnpm balance --n 1000          comprobaciones de partido (SC-004 a SC-007, SC-015)
 *   pnpm balance --torneos 100 --pro-vs-amateur   comprobación de NPC (SC-010, fase US5)
 */
import { comprobacionesPartido, type Comprobacion } from './checks/partido';

export interface OpcionesBalance {
  n: number;
  seed: number;
  torneos: number;
  proVsAmateur: boolean;
}

export function leerOpciones(args: readonly string[]): OpcionesBalance {
  const opciones: OpcionesBalance = { n: 1000, seed: 1, torneos: 0, proVsAmateur: false };
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
      default:
        throw new Error(`Argumento desconocido: ${arg}`);
    }
  }
  if (!Number.isInteger(opciones.n) || opciones.n <= 0) throw new Error('--n debe ser un entero positivo');
  return opciones;
}

export function informe(comprobaciones: Comprobacion[]): string {
  return comprobaciones.map((c) => `${c.ok ? '✔' : '✘'} ${c.id.padEnd(8)} ${c.descripcion}\n            ${c.detalle}`).join('\n');
}

export async function ejecutar(opciones: OpcionesBalance): Promise<Comprobacion[]> {
  const resultados: Comprobacion[] = [];
  if (!opciones.proVsAmateur) resultados.push(...comprobacionesPartido(opciones.n, opciones.seed));
  if (opciones.torneos > 0 || opciones.proVsAmateur) {
    const { comprobacionesNPC } = await import('./checks/npc');
    resultados.push(...comprobacionesNPC(opciones.torneos || 100, opciones.seed));
  }
  return resultados;
}

const esPrincipal = process.argv[1]?.replace(/\\/g, '/').endsWith('balance/src/cli.ts');
if (esPrincipal) {
  const opciones = leerOpciones(process.argv.slice(2).filter((a) => a !== '--'));
  const inicio = Date.now();
  ejecutar(opciones).then((resultados) => {
    console.log(informe(resultados));
    const fallos = resultados.filter((r) => !r.ok).length;
    console.log(`\n${resultados.length - fallos}/${resultados.length} comprobaciones superadas en ${((Date.now() - inicio) / 1000).toFixed(1)} s`);
    if (fallos) process.exitCode = 1;
  });
}
