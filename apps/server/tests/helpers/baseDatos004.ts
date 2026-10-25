/**
 * Base de datos tal como la dejaba la spec 004 (T003; SC-002, FR-036): migraciones hasta la 0009, el catálogo Core
 * de la 004 y una liga de 4 en torneo con un partido ya jugado con parámetros 3.0.0. Sobre ella se aplica después la
 * migración 0010 para comprobar el renombrado de las cartas guardadas.
 *
 * El partido se juega con el motor actual y se guarda con las cartas en el formato de la 004, en el que la lista de
 * virtudes se llamaba de otra forma (`CLAVE_004`).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { autoAlineacion, PARAMETROS_V3, semillaDesdeTexto, type Demarcacion, type Jugador } from '@fbd/domain';
import { avanzar, crearPartido, type EquipoPartido, type EventoPartido, type Marcador } from '@fbd/engine';
import { sql } from 'drizzle-orm';
import { bdHasta, type BdParcial } from './migraciones';

/** Nombre del campo de virtudes en las cartas y en la tabla `jugadores` antes de la migración 0010. */
export const CLAVE_004 = ['spec', 'ials'].join('');

const RUTA_CORE_004 = fileURLToPath(new URL('../../../../packages/domain/tests/fixtures/core-004.json', import.meta.url));

/** Cartas Core de la 004 con el campo de virtudes del dominio actual. */
export function cartasCore004(): Jugador[] {
  const crudas = (JSON.parse(readFileSync(RUTA_CORE_004, 'utf-8')) as { jugadores: Record<string, unknown>[] }).jugadores;
  return crudas.map((c) => {
    const { [CLAVE_004]: antiguas, virtudes, ...resto } = c;
    return { ...resto, virtudes: virtudes ?? antiguas, defectos: [] } as unknown as Jugador;
  });
}

/** Pasa las cartas de un JSON al formato de la 004 (inverso del reemplazo de la migración 0010). */
function aFormato004<T>(valor: T): unknown {
  const texto = JSON.stringify(valor).replaceAll('"virtudes":', `"${CLAVE_004}":`).replaceAll(',"defectos":[]', '');
  return JSON.parse(texto);
}

/** Literal de array de PostgreSQL (`{a,b}`) para una columna `text[]`. */
const arrayPg = (valores: readonly string[]) => `{${valores.join(',')}}`;

function equipo(participanteId: string, cartas: readonly Jugador[], desplazamiento: number): EquipoPartido {
  const cupos: Record<Demarcacion, number> = { POR: 3, DEF: 8, MED: 7, DEL: 5 };
  const plantilla = (['POR', 'DEF', 'MED', 'DEL'] as const).flatMap((d) =>
    cartas.filter((j) => j.demarcacion === d).slice(desplazamiento * cupos[d], (desplazamiento + 1) * cupos[d]),
  );
  const a = autoAlineacion(plantilla, new Set(), PARAMETROS_V3, { formaciones: ['4-4-2'] });
  const porId = new Map(plantilla.map((j) => [j.id, j]));
  return {
    participanteId,
    formacion: a.formacion,
    titulares: a.titulares.map((t) => ({ casillaId: t.casillaId, jugador: porId.get(t.jugadorId)! })),
    suplentes: a.suplentes.map((id) => porId.get(id)!),
    tactica: a.tactica,
    lanzadores: a.lanzadores,
  };
}

export interface BaseDatos004 extends BdParcial {
  partidaId: string;
  partidoId: string;
  /** Eventos y marcador con que terminó el partido guardado. */
  eventos: EventoPartido[];
  marcador: Marcador;
}

export async function baseDatos004(): Promise<BaseDatos004> {
  const bd = await bdHasta('0009_dificultad');
  const cartas = cartasCore004();

  for (const c of cartas) {
    const fila = aFormato004(c) as Record<string, unknown>;
    await bd.db.execute(
      sql`insert into jugadores (id, nombre, apellidos, nacionalidad, fecha_nacimiento, altura, demarcacion, posicion, historia, stats, media, ${sql.raw(CLAVE_004)}, nivel, coleccion)
          values (${c.id}, ${c.nombre}, ${c.apellidos}, ${c.nacionalidad}, ${c.fecha_nacimiento}, ${c.altura}, ${c.demarcacion}, ${arrayPg(c.posicion)}::text[], ${c.historia},
                  ${JSON.stringify(c.stats)}::jsonb, ${c.media}, ${arrayPg(fila[CLAVE_004] as string[])}::text[], ${c.nivel}, 'Core')`,
    );
  }

  await bd.db.execute(sql`insert into usuarios (id, apodo, email) values ('u004', 'Ana', 'ana@x.es')`);
  const partida = await bd.db.execute<{ id: string }>(
    sql`insert into partidas (anfitrion_id, modo, num_participantes, plazas_humanas, tiempos, semilla, estado)
        values ('u004', 'liga', 4, 1, '{}'::jsonb, 'semilla-004', 'en_torneo') returning id`,
  );
  const partidaId = partida.rows[0]!.id;
  const ids: string[] = [];
  for (let i = 0; i < 4; i++) {
    const r = await bd.db.execute<{ id: string }>(
      i === 0
        ? sql`insert into participantes (partida_id, tipo, usuario_id, nombre_equipo) values (${partidaId}, 'humano', 'u004', 'Equipo de Ana') returning id`
        : sql`insert into participantes (partida_id, tipo, nivel_npc, nombre_equipo) values (${partidaId}, 'npc', 'avanzado', ${`NPC ${i}`}) returning id`,
    );
    ids.push(r.rows[0]!.id);
  }

  const guardada = {
    version: PARAMETROS_V3.version,
    semilla: semillaDesdeTexto('partido-004'),
    eliminatoria: false,
    local: equipo(ids[0]!, cartas, 0),
    visitante: equipo(ids[1]!, cartas, 1),
  };
  const fin = avanzar(crearPartido({ ...guardada, parametros: PARAMETROS_V3 }), 'final');
  const partido = await bd.db.execute<{ id: string }>(
    sql`insert into partidos (partida_id, jornada_numero, local_id, visitante_id, semilla, version_parametros, entrada, eventos, estadisticas, marcador, estado, resolucion, finalizado_en)
        values (${partidaId}, 1, ${ids[0]}, ${ids[1]}, ${guardada.semilla}, ${PARAMETROS_V3.version}, ${JSON.stringify(aFormato004(guardada))}::jsonb,
                ${JSON.stringify(fin.eventos)}::jsonb, ${JSON.stringify(fin.estadisticas)}::jsonb, ${JSON.stringify(fin.marcador)}::jsonb, 'finalizado', 'directo', now())
        returning id`,
  );

  return { ...bd, partidaId, partidoId: partido.rows[0]!.id, eventos: fin.eventos, marcador: fin.marcador };
}
