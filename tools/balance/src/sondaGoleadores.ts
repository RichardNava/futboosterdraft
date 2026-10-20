/**
 * Sonda del hallazgo H11: reparto de los goles por la posición de la casilla del goleador, en series con extremos y
 * mediapunta. `pnpm --filter @fbd/balance exec tsx src/sondaGoleadores.ts 200`
 */
import { CASILLA_CENTRAL, FORMACIONES, PARAMETROS_V3, type FormacionId } from '@fbd/domain';
import { equipoSintetico } from './equipos';
import { serie } from './series';

const n = Number(process.argv[2] ?? 200);
const semillas = Number(process.argv[3] ?? 1);
// Ajustes en memoria (JSON con las rutas a cambiar), p. ej. '{"espacio.llegadaAlArea.xExtremo":9300,"acciones.centroRaso":0.5}'.
for (const [ruta, valor] of Object.entries(JSON.parse(process.argv[4] ?? '{}') as Record<string, number>)) {
  const partes = ruta.split('.');
  let o = PARAMETROS_V3 as unknown as Record<string, unknown>;
  for (const k of partes.slice(0, -1)) o = o[k] as Record<string, unknown>;
  o[partes.at(-1)!] = valor;
}
for (const formacion of (process.argv[5] ?? '4-3-3,4-2-3-1,4-4-2').split(',') as FormacionId[]) {
  const porPosicion = new Map<string, number>();
  let total = 0;
  for (let k = 0; k < semillas; k++) {
  const a = equipoSintetico({ formacion, semilla: `h11-${formacion}-${k}`, participanteId: 'a' });
  const b = equipoSintetico({ formacion, semilla: `h11-${formacion}-b-${k}`, participanteId: 'b' });
  const r = serie(a, b, n, 1 + k, `h11-${formacion}-${k}`, { metricas: true });
  const posicionDe = new Map(
    a.titulares.map((t) => {
      const c = FORMACIONES[formacion].casillas.find((x) => x.id === t.casillaId)!;
      return [t.jugador.id, c.id === CASILLA_CENTRAL ? 'DCI' : c.posicionesAdmitidas[0]!] as const;
    }),
  );
  for (const m of r.metricasA) {
    for (const [id, met] of Object.entries(m)) {
      const goles = met.goles ?? 0;
      if (!goles) continue;
      const pos = posicionDe.get(Number(id)) ?? 'suplente';
      porPosicion.set(pos, (porPosicion.get(pos) ?? 0) + goles);
      total += goles;
    }
  }
  }
  const filas = [...porPosicion.entries()].sort((x, y) => y[1] - x[1]).map(([p, g]) => `${p} ${((100 * g) / total).toFixed(1)} %`);
  console.log(`${formacion} (${total} goles de A): ${filas.join(' · ')}`);
}
