#!/usr/bin/env tsx
/**
 * Diagnóstico para la calibración del motor (T033): reparto de tiros y goles por tipo y zona del remate,
 * distancias y tasa de conversión. No es una comprobación: solo ayuda a ajustar `v3.json`.
 *
 *   pnpm --filter @fbd/balance exec tsx src/diagnostico.ts --n 200
 */
import { parametrosActuales, semillaDesdeTexto } from '@fbd/domain';
import { avanzar, crearPartido } from '@fbd/engine';
import { clonar, equipoSintetico } from './equipos';

export function diagnostico(n: number, semilla = 1, cambios: Record<string, number> = {}) {
  const base = equipoSintetico({ semilla: 'medir' });
  const otro = clonar(base, 'b');
  const parametros = structuredClone(parametrosActuales());
  for (const [ruta, valor] of Object.entries(cambios)) {
    const partes = ruta.split('.');
    let o = parametros as unknown as Record<string, unknown>;
    for (const k of partes.slice(0, -1)) o = o[k] as Record<string, unknown>;
    o[partes[partes.length - 1]!] = valor;
  }
  const tiros = new Map<string, { tiros: number; goles: number }>();
  const distancias: Record<string, number[]> = {};
  let goles = 0;
  const acciones: Record<string, { n: number; ok: number }> = {};
  const extra: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    const aEnCasa = i % 2 === 0;
    const r = avanzar(
      crearPartido({
        version: parametros.version,
        parametros,
        semilla: semillaDesdeTexto(`medir:${semilla + i}`),
        eliminatoria: false,
        local: aEnCasa ? base : otro,
        visitante: aEnCasa ? otro : base,
      }),
      'final',
    );
    goles += r.marcador.local + r.marcador.visitante;
    for (const a of r.acciones) {
      const f = (acciones[a.tipo] ??= { n: 0, ok: 0 });
      f.n++;
      if (a.exito) f.ok++;
    }
    for (const lado of ['local', 'visitante'] as const) {
      const s = r.estadisticas[lado];
      for (const k of ['pases', 'pasesCortos', 'pasesLargos', 'pasesLargosAtras', 'conducciones', 'centros', 'faltas', 'corners', 'tirosPuerta', 'posesionCampoRival'] as const) extra[k] = (extra[k] ?? 0) + s[k];
    }
    for (const ev of r.eventos) if (ev.tipo === 'penalti' || ev.tipo === 'fuera_de_juego' || ev.tipo === 'falta') extra[`ev_${ev.tipo}`] = (extra[`ev_${ev.tipo}`] ?? 0) + 1;
    for (const ev of r.eventos) {
      if (ev.tipo !== 'tiro' && ev.tipo !== 'gol' && ev.tipo !== 'parada') continue;
      const clave = `${String(ev.datos.tipo).padEnd(9)} ${String(ev.datos.zonaRemate).padEnd(7)}`;
      const f = tiros.get(clave) ?? { tiros: 0, goles: 0 };
      // Cada tiro emite exactamente uno de `tiro` (fuera o bloqueado), `parada` o `gol`.
      if (ev.tipo !== 'tiro' || ev.datos.resultado !== 'desviado') f.tiros++;
      if (ev.tipo === 'gol') {
        f.goles++;
        (distancias[String(ev.datos.tipo)] ??= []).push(ev.datos.distancia as number);
      }
      tiros.set(clave, f);
    }
  }
  const filas = [...tiros.entries()].sort((a, b) => b[1].goles - a[1].goles);
  console.log(`${n} partidos · ${(goles / n).toFixed(2)} goles por partido`);
  console.log('tipo      zona     tiros/p  goles/p  conv   %goles');
  for (const [k, f] of filas) {
    console.log(`${k}  ${(f.tiros / n).toFixed(2).padStart(6)}  ${(f.goles / n).toFixed(3).padStart(6)}  ${((100 * f.goles) / Math.max(1, f.tiros)).toFixed(0).padStart(3)} %  ${((100 * f.goles) / Math.max(1, goles)).toFixed(1).padStart(5)} %`);
  }
  console.log('acciones por partido (éxito): ' + Object.entries(acciones).map(([k, f]) => `${k} ${(f.n / n).toFixed(1)} (${((100 * f.ok) / f.n).toFixed(0)} %)`).join(' · '));
  console.log('por equipo: ' + Object.entries(extra).map(([k, v]) => `${k} ${(v / (k.startsWith('ev_') ? n : 2 * n)).toFixed(2)}`).join(' · '));
  for (const [t, ds] of Object.entries(distancias)) {
    ds.sort((a, b) => a - b);
    console.log(`distancia de los goles de ${t}: mediana ${ds[Math.floor(ds.length / 2)]} m, p10 ${ds[Math.floor(ds.length / 10)]} m, p90 ${ds[Math.floor((ds.length * 9) / 10)]} m`);
  }
}

const esPrincipal = process.argv[1]?.replace(/\\/g, '/').endsWith('balance/src/diagnostico.ts');
if (esPrincipal) {
  const args = process.argv.slice(2);
  const i = args.indexOf('--n');
  const cambios: Record<string, number> = {};
  args.forEach((a, k) => {
    if (a === '--set') {
      const [ruta, valor] = args[k + 1]!.split('=');
      cambios[ruta!] = Number(valor);
    }
  });
  diagnostico(i >= 0 ? Number(args[i + 1]) : 200, 1, cambios);
}
