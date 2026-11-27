#!/usr/bin/env tsx
/**
 * Calibración de `referenciaAcciones` (spec 018, T056; contrato `herramientas.md`): con equipos neutros en Bloque medio,
 * mide los puntos de intensidad por minuto de tramo de un jugador de cada rol. Como la energía influye en el juego, repite
 * con las referencias medidas hasta que ninguna varíe un 1 % o más respecto a la usada.
 *
 *   pnpm --filter @fbd/balance calibrar-fatiga -- --n 1000
 */
import { parametrosActuales, semillaDesdeTexto, type ParametrosMotor, type RolFatiga } from '@fbd/domain';
import { avanzar, crearPartido, type EstadoMotor } from '@fbd/engine';
import { clonar, equipoSintetico } from './equipos';

const ETIQUETA = 'calibrar-fatiga';
const TOLERANCIA = 0.01;
const MAX_VUELTAS = 10;
export const ROLES: readonly RolFatiga[] = ['porteria', 'defensa', 'medio', 'ataque'];
const ACCIONES = ['sprint', 'presion', 'regate', 'duelo'] as const;
type Accion = (typeof ACCIONES)[number];
type Contadores = NonNullable<EstadoMotor['intensidad']>;

// Una sola vez: dos equipos iguales (4-4-2 de media 80 sin rasgos) con la táctica por defecto, que es Bloque medio.
const BASE = equipoSintetico({ semilla: ETIQUETA });
const RIVAL = clonar(BASE, 'neutro');

const vacios = (): Contadores =>
  Object.fromEntries(ROLES.map((r) => [r, { segundos: 0, sprint: 0, presion: 0, regate: 0, duelo: 0 }])) as Contadores;

/** Un partido de la serie, con o sin contadores (no cambian el partido). */
export function jugar(parametros: ParametrosMotor, i: number, contar = true) {
  const inicial = crearPartido({
    version: parametros.version,
    parametros,
    semilla: semillaDesdeTexto(`${ETIQUETA}:${i + 1}`),
    eliminatoria: false,
    local: BASE,
    visitante: RIVAL,
  });
  if (contar) inicial.intensidad = vacios();
  return avanzar(inicial, 'final');
}

export interface MedidaRol {
  /** Acciones de cada tipo por minuto de tramo de un jugador. */
  porMinuto: Record<Accion, number>;
  /** Puntos de intensidad (acciones × `pesosAccion`) por minuto de tramo: la referencia medida. */
  puntos: number;
}

/** Media de `n` partidos de los dos equipos, con los parámetros dados. */
export function medir(parametros: ParametrosMotor, n: number): Record<RolFatiga, MedidaRol> {
  const total = vacios();
  for (let i = 0; i < n; i++) {
    const contadores = jugar(parametros, i).estado.intensidad!;
    for (const r of ROLES) for (const k of ['segundos', ...ACCIONES] as const) total[r][k] += contadores[r][k];
  }
  const pesos = parametros.fatiga.pesosAccion;
  return Object.fromEntries(
    ROLES.map((r) => {
      const minutos = total[r].segundos / 60;
      if (minutos === 0) throw new Error(`Ningún minuto de tramo para el rol ${r}`);
      const porMinuto = Object.fromEntries(ACCIONES.map((a) => [a, total[r][a] / minutos])) as Record<Accion, number>;
      return [r, { porMinuto, puntos: ACCIONES.reduce((s, a) => s + porMinuto[a] * pesos[a], 0) }];
    }),
  ) as Record<RolFatiga, MedidaRol>;
}

export interface Vuelta {
  referencia: Record<RolFatiga, number>;
  medida: Record<RolFatiga, MedidaRol>;
  /** Mayor variación relativa entre la referencia medida y la usada. */
  variacion: number;
}

/** Repite `medir` con la referencia de la vuelta anterior hasta que ninguna varíe un 1 % o más. */
export function calibrar(n: number, alAcabarVuelta?: (v: Vuelta) => void): { vueltas: Vuelta[]; convergida: boolean } {
  const parametros = structuredClone(parametrosActuales());
  const vueltas: Vuelta[] = [];
  for (let k = 0; k < MAX_VUELTAS; k++) {
    const referencia = { ...parametros.fatiga.referenciaAcciones };
    const medida = medir(parametros, n);
    for (const r of ROLES) if (medida[r].puntos === 0) throw new Error(`El rol ${r} no hace ninguna acción intensa: su referencia sería 0`);
    const variacion = Math.max(...ROLES.map((r) => Math.abs(medida[r].puntos - referencia[r]) / referencia[r]));
    const vuelta = { referencia, medida, variacion };
    vueltas.push(vuelta);
    alAcabarVuelta?.(vuelta);
    if (variacion < TOLERANCIA) return { vueltas, convergida: true };
    parametros.fatiga.referenciaAcciones = Object.fromEntries(ROLES.map((r) => [r, medida[r].puntos])) as Record<RolFatiga, number>;
  }
  return { vueltas, convergida: false };
}

const num = (x: number, decimales = 3) => x.toFixed(decimales).replace('.', ',');

/** Informe en Markdown: una tabla por vuelta y la propuesta final. */
export function informe(n: number, { vueltas, convergida }: { vueltas: Vuelta[]; convergida: boolean }): string {
  const f = parametrosActuales().fatiga;
  const ultima = vueltas[vueltas.length - 1]!;
  const lineas = [
    '# Calibración de las referencias de intensidad',
    '',
    `- **Parámetros**: ${parametrosActuales().version}, con \`pesosAccion\` ${JSON.stringify(f.pesosAccion)} y \`umbralSprint\` ${f.umbralSprint}`,
    `- **Partidos por vuelta**: ${n}; semillas \`${ETIQUETA}:1\` a \`${ETIQUETA}:${n}\`, las mismas en cada vuelta`,
    '- **Equipos**: 4-4-2 sintético de media 80 sin rasgos contra un clon, los dos con la táctica por defecto (Bloque medio)',
    '- **Medida**: acciones por minuto de tramo de un jugador de cada rol, de los dos equipos',
    '',
  ];
  vueltas.forEach((v, i) => {
    lineas.push(
      `## Vuelta ${i + 1}: variación máxima ${num(v.variacion * 100, 1)} %`,
      '',
      '| Rol | Referencia usada | Sprints/min | Presiones/min | Regates/min | Duelos/min | Puntos/min medidos |',
      '|---|---:|---:|---:|---:|---:|---:|',
      ...ROLES.map((r) => {
        const m = v.medida[r];
        return `| ${r} | ${num(v.referencia[r])} | ${ACCIONES.map((a) => num(m.porMinuto[a])).join(' | ')} | ${num(m.puntos)} |`;
      }),
      '',
    );
  });
  const propuesta = ROLES.map((r) => `${r}: ${Number(ultima.medida[r].puntos.toFixed(3))}`).join(', ');
  lineas.push(
    convergida
      ? `**Propuesta** (converge en ${vueltas.length} vueltas): \`referenciaAcciones: { ${propuesta} }\``
      : `**No converge en ${MAX_VUELTAS} vueltas**: la última medida es \`{ ${propuesta} }\``,
    '',
  );
  return lineas.join('\n');
}

const esPrincipal = process.argv[1]?.replace(/\\/g, '/').endsWith('balance/src/calibrarFatiga.ts');
if (esPrincipal) {
  const args = process.argv.slice(2);
  const n = Number(args.includes('--n') ? args[args.indexOf('--n') + 1] : 1000);
  if (!Number.isInteger(n) || n < 1) throw new Error('--n debe ser un entero positivo');
  const resultado = calibrar(n, (v) => console.error(`Vuelta: variación máxima ${num(v.variacion * 100, 1)} %`));
  console.log(informe(n, resultado));
  if (!resultado.convergida) process.exitCode = 1;
}
