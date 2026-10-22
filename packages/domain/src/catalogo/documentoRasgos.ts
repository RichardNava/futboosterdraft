/**
 * Documento de referencia de virtudes y defectos (spec 005, T097; FR-050 a FR-055; research R8).
 *
 * Se genera a partir de la tabla única de rasgos: `pnpm --filter @fbd/domain rasgos:doc` escribe
 * `docs/juego/virtudes-y-defectos.md`, y una prueba falla si el fichero no coincide con lo que genera esta función.
 */
import { PAREJAS_INCOMPATIBLES, RASGOS, rasgo, REPARTO_DEFECTOS, type DefinicionRasgo } from './rasgos';
import { DEFECTOS, MAX_DEFECTOS, MAX_VIRTUDES, NIVELES, TODAS_LAS_VIRTUDES, type Rasgo } from './tipos';

const AMBITO: Record<DefinicionRasgo['ambito'], string> = { generico: 'Genérico', POR: 'Portero', DEF: 'Defensa', MED: 'Centrocampista', DEL: 'Delantero' };
const NIVEL: Record<(typeof NIVELES)[number], string> = { Superclase: 'Superclase', Epico: 'Épico', Legendario: 'Legendario', GOAT: 'GOAT' };

/** Texto de una celda de tabla Markdown (sin barras ni saltos de línea). */
const celda = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
const decimal = (x: number) => x.toFixed(2).replace('.', ',');
const pct = (x: number) => `${Math.round(x * 100)} %`;

function tabla(ids: readonly Rasgo[]): string[] {
  const filas = [...ids].map((id) => RASGOS[id]).sort((a, b) => b.impacto - a.impacto || a.nombre.localeCompare(b.nombre, 'es'));
  return [
    '| Nombre | Id | Ámbito | Descripción | Efecto en el partido | Activación | Acumulación | Incompatible con | Impacto |',
    '|---|---|---|---|---|---|---|---|---|',
    ...filas.map(
      (r) =>
        `| ${celda(r.nombre)} | \`${r.id}\` | ${AMBITO[r.ambito]} | ${celda(r.descripcion)} | ${celda(r.efecto)} | ${celda(r.activacion)} | ${celda(r.acumulacion)} | ${
          r.incompatibles.length ? r.incompatibles.map((x) => rasgo(x).nombre).join(', ') : '—'
        } | ${decimal(r.impacto)} |`,
    ),
  ];
}

export function generarDocumentoRasgos(): string {
  const lineas = [
    '# Virtudes y defectos',
    '',
    '<!-- Documento generado a partir de packages/domain/src/catalogo/rasgos.ts: no lo edites a mano. -->',
    '<!-- Para regenerarlo: pnpm --filter @fbd/domain rasgos:doc -->',
    '',
    'Referencia única de los rasgos de las cartas de Fútboosterdraft (spec 005). Las especificaciones, la interfaz, la IA y el',
    'modo Duelo de jugadores usan estas definiciones.',
    '',
    '## Qué son',
    '',
    '- Una **virtud** es un rasgo que beneficia al jugador o a su equipo. Las genéricas las puede tener cualquier jugador;',
    '  las de una demarcación, solo los de esa demarcación (y las de centrocampista, también los defensas carrileros).',
    `- Un **defecto** es un rasgo que le perjudica. Todos son genéricos. Una carta tiene como máximo ${MAX_DEFECTOS} defectos.`,
    `- Máximo de virtudes por nivel: ${NIVELES.map((n) => `${NIVEL[n]} ${MAX_VIRTUDES[n]}`).join(', ')}.`,
    `- Proporción de cartas con defectos por nivel (y, entre ellas, con dos): ${NIVELES.map(
      (n) => `${NIVEL[n]} ${pct(REPARTO_DEFECTOS[n].conDefecto)} (${pct(REPARTO_DEFECTOS[n].conDos)})`,
    ).join(', ')}.`,
    '',
    '## Cómo se lee el impacto',
    '',
    '- Es un número de 0 a 1 que resume cuánto pesa el rasgo en el resultado.',
    '- En las **virtudes**, 1 es la más beneficiosa. En los **defectos**, 0 es el más perjudicial y 1 el que apenas perjudica.',
    '- Lo usan la IA para valorar las cartas y el modo Duelo de jugadores: cada virtud suma su impacto a la puntuación y',
    '  cada defecto resta 1 − impacto. El orden de los impactos se comprueba con partidos simulados (`balance`, 005/FR-051).',
    '',
    '## Reglas de acumulación',
    '',
    '- Las bonificaciones de equipo de una misma virtud se aplican una sola vez, aunque la tengan varios jugadores.',
    '- Un mismo defecto colectivo cuenta una sola vez por equipo; defectos distintos se multiplican entre sí.',
    '- Orden de cálculo de un stat: base → penalización por posición → bonificaciones en puntos → cansancio → multiplicadores.',
    '- «5 puntos de la penalización» (Versátil, Inflexible) son 5 puntos porcentuales: de 10 % a 5 % o a 15 %.',
    '',
    '## Todo rasgo tiene un efecto probado',
    '',
    'No basta con añadir un rasgo a este documento: debe implementarse y probarse. Cada rasgo tiene una prueba de unidad y',
    'una comprobación de `balance` registradas (`RASGOS_PROBADOS`, 005/FR-055).',
    '',
    `## Virtudes (${TODAS_LAS_VIRTUDES.length})`,
    '',
    ...tabla(TODAS_LAS_VIRTUDES),
    '',
    `## Defectos (${DEFECTOS.length})`,
    '',
    ...tabla(DEFECTOS),
    '',
    '## Incompatibilidades',
    '',
    'No pueden estar en la misma carta:',
    '',
    ...PAREJAS_INCOMPATIBLES.map(([a, b]) => `- ${rasgo(a).nombre} y ${rasgo(b).nombre}.`),
    '',
  ];
  return lineas.join('\n');
}
