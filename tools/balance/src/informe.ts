/**
 * Informe HTML de las comprobaciones de equilibrado (Principio IX, T032a): una tabla legible por una
 * persona no técnica con cada comprobación, su objetivo, el valor medido y si se cumple. HTML estático,
 * sin dependencias, en `tools/balance/salida/informe.html`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Comprobacion } from './checks/partido';

export interface CabeceraInforme {
  fecha: Date;
  seed: number;
  n: number;
  serie: string;
  torneos?: number;
  segundos?: number;
}

export const DIR_SALIDA = join(dirname(fileURLToPath(import.meta.url)), '..', 'salida');

const escapar = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Separa la descripción en "qué se mide" y "objetivo" cuando la descripción lleva el objetivo tras «:». */
function objetivoDe(c: Comprobacion): { descripcion: string; objetivo: string } {
  const i = c.descripcion.indexOf(': ');
  if (i < 0) return { descripcion: c.descripcion, objetivo: '—' };
  return { descripcion: c.descripcion.slice(0, i), objetivo: c.descripcion.slice(i + 2) };
}

export function htmlInforme(comprobaciones: readonly Comprobacion[], cabecera: CabeceraInforme): string {
  const superadas = comprobaciones.filter((c) => c.ok).length;
  const filas = comprobaciones
    .map((c) => {
      const { descripcion, objetivo } = objetivoDe(c);
      return `<tr class="${c.ok ? 'ok' : 'ko'}" data-id="${escapar(c.id)}"><td>${escapar(c.id)}</td><td>${escapar(descripcion)}</td><td>${escapar(objetivo)}</td><td>${escapar(c.detalle)}</td><td>${c.ok ? '✅' : '❌'}</td></tr>`;
    })
    .join('\n');
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Informe de equilibrado</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 24px; color: #1c1c1c; background: #fafafa; }
  h1 { font-size: 1.4rem; margin: 0 0 8px; }
  .cabecera { color: #555; margin-bottom: 16px; }
  .resumen { font-weight: 600; margin-bottom: 16px; }
  table { border-collapse: collapse; width: 100%; background: #fff; }
  th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; vertical-align: top; font-size: 0.95rem; }
  th { background: #eee; }
  tr.ko td { background: #fdecec; }
  td:last-child { text-align: center; font-size: 1.1rem; }
</style>
</head>
<body>
<h1>Informe de equilibrado</h1>
<div class="cabecera">Fecha: ${escapar(cabecera.fecha.toISOString())} · Semilla: ${cabecera.seed} · Partidos por serie (n): ${cabecera.n} · Serie: ${escapar(cabecera.serie)}${cabecera.torneos ? ` · Torneos: ${cabecera.torneos}` : ''}${cabecera.segundos !== undefined ? ` · Duración: ${cabecera.segundos.toFixed(1)} s` : ''}</div>
<div class="resumen">${superadas} de ${comprobaciones.length} comprobaciones superadas</div>
<table>
<thead><tr><th>Id</th><th>Qué se comprueba</th><th>Objetivo</th><th>Valor medido</th><th>Resultado</th></tr></thead>
<tbody>
${filas}
</tbody>
</table>
</body>
</html>
`;
}

/** Escribe el informe y devuelve su ruta. */
export function escribirInforme(comprobaciones: readonly Comprobacion[], cabecera: CabeceraInforme, dir = DIR_SALIDA): string {
  mkdirSync(dir, { recursive: true });
  const ruta = join(dir, 'informe.html');
  writeFileSync(ruta, htmlInforme(comprobaciones, cabecera), 'utf-8');
  return ruta;
}
