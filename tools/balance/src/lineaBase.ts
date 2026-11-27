#!/usr/bin/env tsx
/**
 * Línea base del motor (spec 018, FR-002 y SC-001): cada táctica contra un rival neutro, con las mismas semillas, mide
 * goles, victorias, energía por rol y coste. Usa los parámetros vigentes, así que sirve igual para la 8.0.0 y la 9.0.0.
 *
 *   pnpm --filter @fbd/balance linea-base -- --n 1000 --salida specs/018-rework-motor/linea-base-8.0.0.md
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEMARCACIONES, parametrosActuales, type Demarcacion, type Tactica } from '@fbd/domain';
import { energiaDe } from '@fbd/engine';
import { clonar, equipoSintetico } from './equipos';
import { errorEstandar, media, serie } from './series';

const ETIQUETA = 'linea-base';
const SEMILLA = 1;
const MUESTRA_COSTE = 100;
const RAIZ = fileURLToPath(new URL('../../../', import.meta.url));

const MOMENTOS = [
  { minuto: 45, parte: 1, segundos: 45 * 60 },
  { minuto: 75, parte: 2, segundos: 30 * 60 },
  { minuto: 90, parte: 2, segundos: 45 * 60 },
] as const;
type Minuto = (typeof MOMENTOS)[number]['minuto'];

export interface TacticaLineaBase {
  nombre: string;
  tactica: Partial<Tactica>;
}

export const TACTICAS: readonly TacticaLineaBase[] = [
  { nombre: 'Neutra', tactica: {} },
  { nombre: 'Marcaje individual', tactica: { sistemaDefensivo: 'individual' } },
  { nombre: 'Catenaccio', tactica: { alturaBloque: 'catenaccio' } },
  { nombre: 'Presión alta', tactica: { alturaBloque: 'presion_alta' } },
  { nombre: 'Línea adelantada', tactica: { lineaAdelantada: true } },
  { nombre: 'Contraataque', tactica: { estiloConBalon: 'contraataque' } },
  { nombre: 'Combinativo', tactica: { estiloConBalon: 'combinativo' } },
  { nombre: 'Bandas', tactica: { estiloConBalon: 'bandas' } },
  { nombre: 'Juego vertical', tactica: { juegoVertical: true } },
  { nombre: 'Bandas + Vertical', tactica: { estiloConBalon: 'bandas', juegoVertical: true } },
];

export interface FilaLineaBase {
  nombre: string;
  golesFavor: number;
  golesContra: number;
  diferencia: number;
  errorDiferencia: number;
  victorias: number;
  empates: number;
  derrotas: number;
  energia: Record<Minuto, Record<Demarcacion, number>>;
  msPorPartido: number;
}

// Una sola vez: los ids sintéticos son correlativos y deben ser iguales en todas las tácticas.
const BASE = equipoSintetico({ semilla: ETIQUETA });
const RIVAL = clonar(BASE, 'neutro');

/** Serie de `n` partidos de una táctica contra el rival neutro; el coste se mide aparte, sin el observador. */
export function medirTactica({ nombre, tactica }: TacticaLineaBase, n: number): FilaLineaBase {
  const equipo = { ...BASE, tactica: { ...BASE.tactica, ...tactica } };
  const titulares = new Set(BASE.titulares.map((t) => t.jugador.id));
  const acumulado = new Map<string, { suma: number; jugadores: number }>();
  const r = serie(equipo, RIVAL, n, SEMILLA, ETIQUETA, {
    observador: (e, ladoA) => {
      const momento = MOMENTOS.find((m) => m.parte === e.reloj.parte && m.segundos === e.reloj.segundosEnParte);
      if (!momento) return;
      for (const j of e.equipos[ladoA].jugadores) {
        if (!j.enCampo || !titulares.has(j.id)) continue;
        const clave = `${momento.minuto}:${j.jugador.demarcacion}`;
        const a = acumulado.get(clave) ?? { suma: 0, jugadores: 0 };
        a.suma += energiaDe(e, j).energia;
        a.jugadores += 1;
        acumulado.set(clave, a);
      }
    },
  });
  const energia = Object.fromEntries(
    MOMENTOS.map(({ minuto }) => [
      minuto,
      Object.fromEntries(
        DEMARCACIONES.map((d) => {
          const a = acumulado.get(`${minuto}:${d}`);
          return [d, a ? a.suma / a.jugadores : NaN];
        }),
      ),
    ]),
  ) as FilaLineaBase['energia'];
  const diferencias = r.golesA.map((g, i) => g - r.golesB[i]!);
  const m = Math.min(n, MUESTRA_COSTE);
  const coste = serie(equipo, RIVAL, m, SEMILLA, ETIQUETA);
  return {
    nombre,
    golesFavor: media(r.golesA),
    golesContra: media(r.golesB),
    diferencia: media(diferencias),
    errorDiferencia: errorEstandar(diferencias),
    victorias: r.victoriasA / n,
    empates: r.empates / n,
    derrotas: r.victoriasB / n,
    energia,
    msPorPartido: coste.ms / m,
  };
}

const num = (x: number, decimales = 2) => x.toFixed(decimales).replace('.', ',');
const pct = (x: number) => `${num(x * 100, 1)} %`;
const conSigno = (x: number, f: (v: number) => string) => `${x > 0 ? '+' : ''}${f(x)}`;

export interface MetaLineaBase {
  version: string;
  commit: string;
  motorSinCambios: boolean;
  node: string;
  n: number;
}

/** Informe en Markdown; la primera fila es la táctica neutra, la referencia de los efectos. */
export function informe(filas: readonly FilaLineaBase[], meta: MetaLineaBase): string {
  const neutra = filas[0]!;
  const lineas = [
    `# Línea base del motor ${meta.version}`,
    '',
    '> Generado con `pnpm --filter @fbd/balance linea-base`. No editar a mano.',
    '',
    `- **Parámetros**: ${meta.version}`,
    `- **Commit**: \`${meta.commit}\` (\`packages/engine\` y \`packages/domain\` ${meta.motorSinCambios ? 'sin cambios locales' : '**con cambios locales**'})`,
    `- **Node**: ${meta.node}`,
    `- **Partidos por táctica**: ${meta.n}, alternando quién juega en casa`,
    `- **Semillas**: \`${ETIQUETA}:${SEMILLA}\` a \`${ETIQUETA}:${SEMILLA + meta.n - 1}\`, las mismas en todas las tácticas`,
    '- **Equipos**: 4-4-2 sintético de media 80 sin rasgos; el rival es un clon con la táctica neutra',
    `- **Coste**: media de ${Math.min(meta.n, MUESTRA_COSTE)} partidos sin fotogramas ni métricas en este equipo. Es orientativo: la medida oficial es la del job \`rendimiento-motor\``,
    '',
    '## Goles, victorias y coste',
    '',
    '| Táctica | GF | GC | Dif. (± e. e.) | Efecto en dif. | Victorias | Efecto | Empates | Derrotas | ms/partido |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
    ...filas.map(
      (f) =>
        `| ${f.nombre} | ${num(f.golesFavor)} | ${num(f.golesContra)} | ${conSigno(f.diferencia, num)} ± ${num(f.errorDiferencia)} | ${f === neutra ? '—' : conSigno(f.diferencia - neutra.diferencia, num)} | ${pct(f.victorias)} | ${f === neutra ? '—' : `${conSigno((f.victorias - neutra.victorias) * 100, (v) => num(v, 1))} pp`} | ${pct(f.empates)} | ${pct(f.derrotas)} | ${num(f.msPorPartido, 1)} |`,
    ),
    '',
    '## Energía media de los titulares en el campo',
    '',
    `| Táctica | ${MOMENTOS.flatMap(({ minuto }) => DEMARCACIONES.map((d) => `${d} ${minuto}'`)).join(' | ')} |`,
    `|---|${MOMENTOS.flatMap(() => DEMARCACIONES.map(() => '---:')).join('|')}|`,
    ...filas.map((f) => `| ${f.nombre} | ${MOMENTOS.flatMap(({ minuto }) => DEMARCACIONES.map((d) => num(f.energia[minuto][d], 1))).join(' | ')} |`),
    '',
  ];
  return lineas.join('\n');
}

const git = (...args: string[]) => execFileSync('git', args, { cwd: RAIZ, encoding: 'utf8' }).trim();

const esPrincipal = process.argv[1]?.replace(/\\/g, '/').endsWith('balance/src/lineaBase.ts');
if (esPrincipal) {
  const args = process.argv.slice(2);
  const valor = (bandera: string) => (args.includes(bandera) ? args[args.indexOf(bandera) + 1] : undefined);
  const n = Number(valor('--n') ?? 1000);
  if (!Number.isInteger(n) || n < 1) throw new Error('--n debe ser un entero positivo');
  const filas = TACTICAS.map((t) => {
    console.error(`Midiendo ${t.nombre}…`);
    return medirTactica(t, n);
  });
  const texto = informe(filas, {
    version: parametrosActuales().version,
    commit: git('rev-parse', '--short', 'HEAD'),
    motorSinCambios: git('status', '--porcelain', '--', 'packages/engine', 'packages/domain') === '',
    node: process.version,
    n,
  });
  const salida = valor('--salida');
  if (salida) {
    // pnpm ejecuta el script en tools/balance; la ruta del contrato es relativa a la raíz del repositorio.
    const destino = resolve(RAIZ, salida);
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, texto);
    console.error(`Informe escrito en ${destino}`);
  } else {
    console.log(texto);
  }
}
