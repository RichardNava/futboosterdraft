/**
 * Colecciones y tienda (spec 006, R17; SC-003 y SC-005), sobre los datos reales de `data/`:
 * - SC-003: 100 mesas de 8 sobre colecciones activas al azar que cumplen el mínimo: ninguna carta fuera del pool y
 *   todos los sobres con sus cupos de demarcación y nivel.
 * - SC-005: 1.000 sobres de la tienda sobre colecciones poseídas al azar: sin repetidas, sin cartas ya poseídas y con
 *   el reparto de niveles del draft.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  comprobarMinimoActivo,
  derivarSemilla,
  generarMesa,
  generarSobreTienda,
  parametrosActuales,
  recuentoPorDemarcacionYNivel,
  Rng,
  semillaDesdeTexto,
  validarCatalogo,
  type Jugador,
} from '@fbd/domain';
import type { GrupoComprobaciones } from '../cli';
import type { Comprobacion } from './partido';

const leer = <T>(fichero: string): T => JSON.parse(readFileSync(fileURLToPath(new URL(`../../../../data/${fichero}`, import.meta.url)), 'utf-8')) as T;

function catalogo() {
  const cartas = [...leer<{ jugadores: Jugador[] }>('core.json').jugadores, ...leer<{ jugadores: Jugador[] }>('cartas-prueba.json').jugadores];
  const { colecciones } = validarCatalogo(cartas, leer<{ colecciones: unknown }>('colecciones.json').colecciones);
  const ids = (tipo: 'basica' | 'pago') => [...new Set(colecciones.filter((c) => c.tipo === tipo).flatMap((c) => c.cartas.map((x) => x.id)))];
  return { porId: new Map(cartas.map((j) => [j.id, j])), core: ids('basica'), pago: ids('pago') };
}

/** Cupos de un sobre del draft: 3 POR/DEF (≤ 1 POR), 3 MED, 2 DEL; 4 Superclase, 2 Crack, 2 Legendario/GOAT (≥ 1 Legendario). */
function cumpleCupos(cartas: readonly Jugador[]): boolean {
  const n = (f: (j: Jugador) => boolean) => cartas.filter(f).length;
  return (
    cartas.length === 8 &&
    n((j) => j.demarcacion === 'POR') <= 1 &&
    n((j) => j.demarcacion === 'POR' || j.demarcacion === 'DEF') === 3 &&
    n((j) => j.demarcacion === 'MED') === 3 &&
    n((j) => j.demarcacion === 'DEL') === 2 &&
    cumpleNiveles(cartas)
  );
}

const cumpleNiveles = (cartas: readonly Jugador[]) => {
  const n = (nivel: string) => cartas.filter((j) => j.nivel === nivel).length;
  return n('Superclase') === 4 && n('Crack') === 2 && n('Legendario') >= 1 && n('Legendario') + n('GOAT') === 2;
};

export function comprobarSC003(mesas: number, semilla: number): Comprobacion {
  const { porId, core, pago } = catalogo();
  const p = parametrosActuales();
  let fuera = 0;
  let sinCupos = 0;
  let tamanos = 0;
  const minimos = recuentoPorDemarcacionYNivel(core.map((id) => porId.get(id)!));
  for (let m = 0; m < mesas; m++) {
    const rng = new Rng(derivarSemilla(semillaDesdeTexto(`colecciones:${semilla}`), `mesa:${m}`));
    // Colección activa: Core más cartas de pago al azar; después se desactivan al azar las que el mínimo permite.
    let activas = [...core, ...pago.filter(() => rng.probabilidad(500))].map((id) => porId.get(id)!);
    for (const j of rng.barajar([...activas])) {
      if (rng.probabilidad(500) && comprobarMinimoActivo(recuentoPorDemarcacionYNivel(activas), j, minimos).ok) activas = activas.filter((x) => x !== j);
    }
    tamanos += activas.length;
    const enPool = new Set(activas.map((j) => j.id));
    for (const sobre of generarMesa(activas, 8, derivarSemilla(semillaDesdeTexto(`colecciones:${semilla}`), `generar:${m}`), p)) {
      if (sobre.cartas.some((id) => !enPool.has(id))) fuera++;
      if (!cumpleCupos(sobre.cartas.map((id) => porId.get(id)!))) sinCupos++;
    }
  }
  return {
    id: 'colecciones/SC-003',
    descripcion: 'Mesas de 8 sobre colecciones activas al azar que cumplen el mínimo: ninguna carta fuera del pool y todos los sobres con sus cupos',
    ok: fuera === 0 && sinCupos === 0,
    detalle: `${mesas} mesas (pool medio ${Math.round(tamanos / mesas)} cartas): sobres con cartas fuera del pool ${fuera} · sobres sin sus cupos ${sinCupos}`,
  };
}

export function comprobarSC005(sobres: number, semilla: number): Comprobacion {
  const { porId, pago } = catalogo();
  const p = parametrosActuales();
  let repetidas = 0;
  let poseidas = 0;
  let sinNiveles = 0;
  for (let s = 0; s < sobres; s++) {
    const rng = new Rng(derivarSemilla(semillaDesdeTexto(`tienda:${semilla}`), `sobre:${s}`));
    // Hasta la mitad de las cartas de pago ya poseídas: siempre quedan de todos los niveles.
    const mias = new Set(pago.filter(() => rng.probabilidad(rng.entero(0, 500))));
    const disponibles = pago.filter((id) => !mias.has(id)).map((id) => porId.get(id)!);
    const ids = generarSobreTienda(disponibles, derivarSemilla(semillaDesdeTexto(`tienda:${semilla}`), `generar:${s}`), p);
    if (new Set(ids).size !== ids.length) repetidas++;
    if (ids.some((id) => mias.has(id))) poseidas++;
    if (!cumpleNiveles(ids.map((id) => porId.get(id)!))) sinNiveles++;
  }
  return {
    id: 'colecciones/SC-005',
    descripcion: 'Sobres de la tienda sobre colecciones poseídas al azar: sin repetidas, sin cartas ya poseídas y con el reparto de niveles del draft',
    ok: repetidas === 0 && poseidas === 0 && sinNiveles === 0,
    detalle: `${sobres} sobres: con repetidas ${repetidas} · con cartas poseídas ${poseidas} · sin el reparto de niveles ${sinNiveles}`,
  };
}

export function gruposColecciones(): GrupoComprobaciones[] {
  return [
    {
      ids: ['colecciones/SC-003', 'colecciones/SC-005'],
      serie: 'sintetica',
      ejecutar: (o) => [comprobarSC003(100, o.seed), comprobarSC005(1000, o.seed)],
    },
  ];
}
