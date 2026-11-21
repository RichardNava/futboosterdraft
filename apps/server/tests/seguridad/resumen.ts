/**
 * Resumen de `pnpm seguridad` (spec 017, FR-011): convierte el resultado de Vitest en `verificacion.md`, legible por
 * una persona no técnica, y termina con error si algún ataque no queda demostrado como bloqueado.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface ResultadoVitest {
  testResults?: {
    name: string;
    status?: string;
    assertionResults: { title: string; status: string }[];
  }[];
}

export interface FilaVerificacion {
  ataque: string;
  hallazgo: string;
  resultado: 'Bloqueado' | 'NO bloqueado' | 'Sin ejecutar';
}

const NOMBRE_ATAQUE = /^(SEG-\d{3,}): (\S.*)$/;

/** Filas de la tabla y motivos por los que la verificación no puede darse por buena. */
export function generarResumen(json: ResultadoVitest): { filas: FilaVerificacion[]; errores: string[]; markdown: string } {
  const filas: FilaVerificacion[] = [];
  const errores: string[] = [];

  for (const fichero of json.testResults ?? []) {
    const nombreFichero = basename(fichero.name);
    // Un fichero que no carga o cuyo `afterAll` falla no deja ningún test en rojo que lo delate.
    if (fichero.status === 'failed' && !fichero.assertionResults.some((a) => a.status === 'failed')) {
      errores.push(`No se pudo ejecutar ${nombreFichero}`);
    }
    for (const { title, status } of fichero.assertionResults) {
      const partes = NOMBRE_ATAQUE.exec(title);
      if (!partes) {
        errores.push(`Nombre sin el formato «SEG-NNN: ataque» en ${nombreFichero}: ${title}`);
        continue;
      }
      const [, hallazgo, ataque] = partes as unknown as [string, string, string];
      // Un ataque omitido no demuestra nada: cuenta como fallo.
      const resultado = status === 'passed' ? 'Bloqueado' : status === 'failed' ? 'NO bloqueado' : 'Sin ejecutar';
      if (resultado !== 'Bloqueado') errores.push(`${hallazgo}: ${ataque} (${resultado})`);
      filas.push({ ataque, hallazgo, resultado });
    }
  }
  if (filas.length === 0 && errores.length === 0) errores.push('No hay ningún ataque que verificar');

  const bloqueados = filas.filter((f) => f.resultado === 'Bloqueado').length;
  const markdown = [
    '# Verificación de seguridad',
    '',
    'Generado por `pnpm seguridad`. Cada fila es un ataque que se repite contra el sistema.',
    '',
    `**${bloqueados} de ${filas.length} ataques bloqueados.**`,
    '',
    '| Ataque | Hallazgo | Resultado |',
    '|---|---|---|',
    ...filas.map((f) => `| ${f.ataque.replaceAll('|', '\\|')} | ${f.hallazgo} | ${f.resultado} |`),
    '',
  ].join('\n');
  return { filas, errores, markdown };
}

function principal(): void {
  const entrada = fileURLToPath(new URL('../../test-results/seguridad.json', import.meta.url));
  const salida = fileURLToPath(new URL('../../../../specs/017-auditoria-seguridad-roles/verificacion.md', import.meta.url));
  if (!existsSync(entrada)) {
    console.error('Verificación fallida: Vitest no ha generado resultados (¿no hay ataques o no arrancó Docker?).');
    process.exit(1);
  }
  const { filas, errores, markdown } = generarResumen(JSON.parse(readFileSync(entrada, 'utf8')) as ResultadoVitest);
  // Sin ataques no se pisa la última verificación válida.
  if (filas.length > 0) writeFileSync(salida, markdown);
  if (errores.length > 0) {
    console.error(`Verificación fallida:\n- ${errores.join('\n- ')}`);
    process.exit(1);
  }
  console.log(`Verificación correcta: ${filas.length} ataques bloqueados. Resumen en specs/017-auditoria-seguridad-roles/verificacion.md`);
}

if (basename(process.argv[1] ?? '') === 'resumen.ts') principal();
