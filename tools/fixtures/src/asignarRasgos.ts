/**
 * Pasada de rasgos sobre Core (spec 005, research R5; FR-012, FR-035, FR-037; T049 y T092).
 *
 * Añade defectos y las cuatro virtudes nuevas a las cartas de `data/core.json` sin tocar ids, nombres, stats, medias
 * ni las virtudes que ya tenían: así `cartaEnVersion(carta, 1)` devuelve exactamente la carta anterior (research R4).
 * Es determinista (semilla `rasgos-005`) e idempotente: parte siempre de las cartas en la versión 1.
 *
 * 1. Defectos por nivel según `REPARTO_DEFECTOS`, con pesos que favorecen los coherentes con la demarcación.
 * 2. Virtudes nuevas solo en cartas con un hueco libre según `MAX_VIRTUDES`, unas 12 por virtud, repartidas por nivel.
 * 3. Ninguna carta con rasgos incompatibles: si un sorteo lo produce, se vuelve a sortear entre los compatibles.
 *
 * Uso: `pnpm --filter @fbd/fixtures asignar-rasgos [--fichero data/core.json]`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  avisosColeccion,
  cartaEnVersion,
  DEFECTOS,
  MAX_VIRTUDES,
  NIVELES,
  PAREJAS_INCOMPATIBLES,
  REPARTO_DEFECTOS,
  Rng,
  semillaDesdeTexto,
  validarColeccion,
  VIRTUDES_NUEVAS_005,
  type Defecto,
  type Jugador,
  type Nivel,
  type Rasgo,
} from '@fbd/domain';

export const SEMILLA_RASGOS = 'rasgos-005';

/** Cartas por virtud nueva en cada nivel (≈ 12 por virtud). */
const VIRTUDES_NUEVAS_POR_NIVEL = 3;

const incompatibles = (a: Rasgo, b: Rasgo) => PAREJAS_INCOMPATIBLES.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
const compatibleCon = (carta: Jugador, r: Rasgo) => ![...carta.virtudes, ...carta.defectos].some((otro) => otro === r || incompatibles(otro, r));

/** Peso de un defecto para una carta (research R5): base 10 y más los coherentes con su demarcación y su nivel. */
function pesoDefecto(carta: Jugador, d: Defecto): number {
  const dem = carta.demarcacion;
  const alto = carta.nivel === 'Legendario' || carta.nivel === 'GOAT';
  const ofensivo = carta.posicion.some((p) => p === 'MCO' || p === 'EI' || p === 'ED' || p === 'MII' || p === 'MID');
  const defensivo = carta.posicion.some((p) => p === 'MD' || p === 'MC');
  switch (d) {
    case 'MalDefensor':
      return dem === 'DEL' ? 30 : dem === 'MED' && ofensivo ? 25 : dem === 'POR' ? 2 : 6;
    case 'Chupon':
      return dem === 'DEL' ? 30 : dem === 'MED' ? 10 : 3;
    case 'Torpe':
      return dem === 'DEF' ? 30 : dem === 'POR' ? 8 : 6;
    case 'Agresivo':
    case 'Impulsivo':
      return dem === 'DEF' ? 25 : dem === 'MED' && defensivo ? 20 : 8;
    case 'Estrellita':
    case 'Polemico':
    case 'Provocador':
      return alto ? 25 : 5;
    case 'Inflexible':
      return carta.posicion.length === 1 ? 12 : 4;
    default:
      return 10;
  }
}

function elegirPonderado<T>(rng: Rng, opciones: readonly [T, number][]): T {
  const total = opciones.reduce((a, [, p]) => a + p, 0);
  let x = rng.entero(0, total - 1);
  for (const [valor, peso] of opciones) {
    x -= peso;
    if (x < 0) return valor;
  }
  return opciones[opciones.length - 1]![0];
}

function sortearDefecto(rng: Rng, carta: Jugador): Defecto | undefined {
  const opciones = DEFECTOS.filter((d) => compatibleCon(carta, d)).map((d) => [d, pesoDefecto(carta, d)] as [Defecto, number]);
  return opciones.length ? elegirPonderado(rng, opciones) : undefined;
}

export function asignarRasgos(cartas: readonly Jugador[]): Jugador[] {
  const rng = new Rng(semillaDesdeTexto(SEMILLA_RASGOS));
  const resultado = new Map<number, Jugador>(cartas.map((c) => [c.id, cartaEnVersion(c, 1)]));
  const porNivel = (n: Nivel) => [...resultado.values()].filter((c) => c.nivel === n).sort((a, b) => a.id - b.id);

  // 1. Defectos.
  for (const nivel of NIVELES) {
    const delNivel = porNivel(nivel);
    const { conDefecto, conDos } = REPARTO_DEFECTOS[nivel];
    const conAlguno = rng.barajar(delNivel).slice(0, Math.round(conDefecto * delNivel.length));
    const dos = Math.round(conDos * conAlguno.length);
    conAlguno.forEach((c, i) => {
      const carta = resultado.get(c.id)!;
      for (let k = 0; k < (i < dos ? 2 : 1); k++) {
        const d = sortearDefecto(rng, carta);
        if (d) carta.defectos = [...carta.defectos, d];
      }
    });
  }

  // 2. Virtudes nuevas, solo con hueco libre.
  for (const virtud of VIRTUDES_NUEVAS_005) {
    for (const nivel of NIVELES) {
      const libres = porNivel(nivel).filter((c) => c.virtudes.length < MAX_VIRTUDES[nivel] && compatibleCon(c, virtud));
      for (const c of rng.barajar(libres).slice(0, VIRTUDES_NUEVAS_POR_NIVEL)) {
        const carta = resultado.get(c.id)!;
        carta.virtudes = [...carta.virtudes, virtud];
      }
    }
  }
  return cartas.map((c) => resultado.get(c.id)!);
}

function principal(): void {
  const args = process.argv.slice(2).filter((a) => a !== '--');
  const i = args.indexOf('--fichero');
  const ruta = resolve(process.env.INIT_CWD ?? process.cwd(), i >= 0 ? args[i + 1]! : 'data/core.json');
  const texto = readFileSync(ruta, 'utf-8');
  const fichero = JSON.parse(texto) as { coleccion: string; version: string; jugadores: Jugador[] };
  const jugadores = asignarRasgos(fichero.jugadores);
  const errores = validarColeccion(jugadores);
  if (errores.length) {
    console.error(errores.slice(0, 20));
    throw new Error(`La colección con rasgos tiene ${errores.length} errores`);
  }
  for (const aviso of avisosColeccion(jugadores)) console.warn(`Aviso: ${aviso.mensaje}`);
  const salto = texto.includes('\r\n') ? '\r\n' : '\n';
  writeFileSync(ruta, JSON.stringify({ ...fichero, jugadores }, null, 2).replace(/\n/g, salto) + salto, 'utf-8');
  const conDefectos = jugadores.filter((j) => j.defectos.length > 0).length;
  const conNuevas = jugadores.filter((j) => j.virtudes.some((v) => VIRTUDES_NUEVAS_005.includes(v))).length;
  console.log(`Rasgos asignados en ${ruta}: ${conDefectos} cartas con defectos y ${conNuevas} con virtudes nuevas.`);
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('fixtures/src/asignarRasgos.ts')) principal();
