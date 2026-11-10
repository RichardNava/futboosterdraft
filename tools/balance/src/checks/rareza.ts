/**
 * Rareza del draft (spec 013, SC-004; contracts/generador.md G8): por cada nivel, 1.000 mesas de 8 con el pool de solo
 * Core. La media de Superclase, Crack, Legendario y GOAT por participante debe quedar a menos del 5 % de la tabla de
 * FR-012 (Rico, frente a su fila «pool de solo Core»). Informa también de la probabilidad de que un GOAT concreto
 * (el de más media) salga en la mesa.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  derivarSemilla,
  generarMesa,
  NIVELES_RAREZA,
  parametrosActuales,
  repartoDe,
  semillaDesdeTexto,
  type Jugador,
  type Nivel,
  type NivelRareza,
} from '@fbd/domain';
import type { GrupoComprobaciones } from '../cli';
import type { Comprobacion } from './partido';

const NIVELES: readonly Nivel[] = ['Superclase', 'Crack', 'Legendario', 'GOAT'];
const PARTICIPANTES = 8;
const UMBRAL = 0.05;

/** Tabla de FR-012: media por participante (S / C / L / G). */
const TABLA: Record<NivelRareza, readonly number[]> = {
  pobre: [15, 6, 2.85, 0.15],
  escaso: [15, 6, 2.4, 0.6],
  moderado: [12, 6, 5.1, 0.9],
  abundante: [9, 6, 6, 3],
  // Con pool de solo Core: las 54 Legendario y 36 GOAT una vez por mesa y 6 Crack de sustitución.
  rico: [6, 6.75, 6.75, 4.5],
};

export function comprobarRareza(mesas: number, semilla: number): Comprobacion[] {
  const core = (
    JSON.parse(readFileSync(fileURLToPath(new URL('../../../../data/core-real.json', import.meta.url)), 'utf-8')) as {
      jugadores: Jugador[];
    }
  ).jugadores;
  const nivelDe = new Map(core.map((j) => [j.id, j.nivel]));
  const estrella = core.filter((j) => j.nivel === 'GOAT').sort((a, b) => b.media - a.media)[0]!;
  const p = parametrosActuales();
  return NIVELES_RAREZA.map((nivel) => {
    const totales = [0, 0, 0, 0];
    let conEstrella = 0;
    for (let m = 0; m < mesas; m++) {
      const s = derivarSemilla(semillaDesdeTexto(`rareza:${semilla}`), `${nivel}:${m}`);
      const ids = generarMesa(core, PARTICIPANTES, s, p, repartoDe(p, nivel)).flatMap((x) => x.cartas);
      for (const id of ids) totales[NIVELES.indexOf(nivelDe.get(id)!)]! += 1;
      if (ids.includes(estrella.id)) conEstrella++;
    }
    const medias = totales.map((t) => t / (mesas * PARTICIPANTES));
    const desvios = medias.map((v, i) => Math.abs(v - TABLA[nivel][i]!) / TABLA[nivel][i]!);
    const f = (x: number) => x.toFixed(2).replace('.', ',');
    return {
      id: `rareza/${nivel}`,
      descripcion: `Rareza «${nivel}»: media S/C/L/G por participante a menos del 5 % de la tabla de FR-012 (SC-004)`,
      ok: desvios.every((d) => d < UMBRAL),
      detalle:
        `${mesas} mesas de ${PARTICIPANTES}: ${medias.map(f).join(' / ')} frente a ${TABLA[nivel].map(f).join(' / ')} ` +
        `(desvío máximo ${(100 * Math.max(...desvios)).toFixed(1)} %) · ${estrella.nombre_carta} en la mesa: ` +
        `${((100 * conEstrella) / mesas).toFixed(1)} %`,
    };
  });
}

export function gruposRareza(): GrupoComprobaciones[] {
  return [
    {
      ids: NIVELES_RAREZA.map((n) => `rareza/${n}`),
      serie: 'sintetica',
      ejecutar: (o) => comprobarRareza(1000, o.seed),
    },
  ];
}
