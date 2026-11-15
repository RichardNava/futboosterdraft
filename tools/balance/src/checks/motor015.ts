/**
 * Comprobaciones del motor 8.0.0 (spec 015; contracts/balance.md §B1): frecuencia del regateador (SC-002), Cabeceador
 * en los centrales (SC-003), Juego por las bandas (SC-011) y segunda línea (SC-012). Series A/B sintéticas con las mismas semillas: solo cambia lo que se mide.
 */
import { FORMACIONES, type Jugador, type Virtud } from '@fbd/domain';
import type { EquipoPartido, MetricasJugador } from '@fbd/engine';
import type { GrupoComprobaciones } from '../cli';
import { clonar, equipoSintetico } from '../equipos';
import { mayorSignificativo, media, serie, type ResultadoSerie } from '../series';
import { core } from './npc';
import type { Comprobacion } from './partido';

const pct = (x: number) => `${x >= 0 ? '+' : ''}${(100 * x).toFixed(1)} %`;
const rel = (con: number, sin: number) => (sin > 0 ? con / sin - 1 : Number.NaN);

/** El mismo equipo con la carta de unas casillas cambiada (mismo id: las métricas se siguen leyendo igual). */
export function cambiar(equipo: EquipoPartido, casillas: readonly string[], f: (j: Jugador) => Jugador): EquipoPartido {
  return { ...equipo, titulares: equipo.titulares.map((t) => (casillas.includes(t.casillaId) ? { ...t, jugador: f(t.jugador) } : t)) };
}

const conStat = (stat: string, valor: number) => (j: Jugador): Jugador => ({ ...j, stats: { ...j.stats, [stat]: valor } as Jugador['stats'] });
const conVirtud = (v: Virtud) => (j: Jugador): Jugador => ({ ...j, virtudes: [...j.virtudes, v] });

/** Por partido, la suma de unos contadores de los jugadores `ids` del equipo A. */
export function porPartido(r: ResultadoSerie, ids: readonly number[], campos: readonly (keyof MetricasJugador)[]): number[] {
  return r.metricasA.map((m) => ids.reduce((t, id) => t + campos.reduce((u, c) => u + (m[id]?.[c] ?? 0), 0), 0));
}

const idEn = (equipo: EquipoPartido, casilla: string) => equipo.titulares.find((t) => t.casillaId === casilla)!.jugador.id;

/** SC-002a: DEL titular con regate 95 frente a 75: intentos de regate y conducción ≥ +40 %, completados ≥ +60 %. */
export function comprobarSC002a(n: number, semilla: number): Comprobacion {
  const base = equipoSintetico({ semilla: 'motor015' });
  const rival = clonar(base, 'b');
  const id = idEn(base, 'DC');
  const medir = (regate: number) => {
    const r = serie(cambiar(base, ['DC'], conStat('regate', regate)), rival, n, semilla, 'motor015-regate', { metricas: true });
    return { intentos: media(porPartido(r, [id], ['regates', 'conducciones'])), ganados: media(porPartido(r, [id], ['regatesGanados', 'conduccionesGanadas'])) };
  };
  const bajo = medir(75);
  const alto = medir(95);
  const intentos = rel(alto.intentos, bajo.intentos);
  const ganados = rel(alto.ganados, bajo.ganados);
  return {
    id: '015/SC-002a',
    descripcion: 'Regateador: DEL con regate 95 frente a 75, intentos de regate y conducción ≥ +40 % y completados ≥ +60 %',
    ok: intentos >= 0.4 && ganados >= 0.6,
    detalle: `intentos ${pct(intentos)} (${bajo.intentos.toFixed(2)} → ${alto.intentos.toFixed(2)} por partido) · completados ${pct(ganados)} (${bajo.ganados.toFixed(2)} → ${alto.ganados.toFixed(2)})`,
  };
}

/** El delantero de Core con más regate (a igualdad, el de menor id). */
export function mejorRegateador(pool: readonly Jugador[] = core()): Jugador {
  const regate = (j: Jugador) => (j.stats as unknown as Record<string, number>).regate ?? 0;
  return [...pool].filter((j) => j.demarcacion === 'DEL').sort((a, b) => regate(b) - regate(a) || a.id - b.id)[0]!;
}

/** SC-002b: el mejor regateador de Core, titular en un equipo equilibrado, supera a algún defensor en ≥ 80 % de los partidos (objetivo rebajado del 90 %). */
export function comprobarSC002b(n: number, semilla: number): Comprobacion {
  const base = equipoSintetico({ semilla: 'motor015' });
  const rival = clonar(base, 'b');
  const carta = mejorRegateador();
  const casilla = FORMACIONES[base.formacion].casillas.find((c) => c.id !== 'POR' && c.posicionesAdmitidas.some((p) => carta.posicion.includes(p)))?.id ?? 'DC';
  const r = serie(cambiar(base, [casilla], () => carta), rival, n, semilla, 'motor015-core', { metricas: true });
  const partidos = porPartido(r, [carta.id], ['regatesGanados', 'conduccionesGanadas']);
  const tasa = partidos.filter((x) => x >= 1).length / Math.max(1, partidos.length);
  return {
    id: '015/SC-002b',
    descripcion: 'Mejor regateador de Core: regates o conducciones ganados ≥ 1 en ≥ 80 % de los partidos',
    ok: tasa >= 0.8,
    detalle: `${carta.nombre_carta} (${carta.id}, ${casilla}): ${(100 * tasa).toFixed(1)} % de ${partidos.length} partidos · media ${media(partidos).toFixed(2)} por partido`,
  };
}

/**
 * SC-003: centrales con Cabeceador frente a sin ella: más duelos aéreos ganados y más goles de cabeza de los propios
 * centrales, significativos. Se mide donde actúa la virtud: los goles de cabeza del equipo se diluyen con los del resto
 * (decisión del 2026-11-15).
 */
export function comprobarSC003(n: number, semilla: number): Comprobacion {
  const base = equipoSintetico({ semilla: 'motor015' });
  const rival = clonar(base, 'b');
  const centrales = ['DCI', 'DCD'];
  const ids = centrales.map((c) => idEn(base, c));
  const sin = serie(base, rival, n, semilla, 'motor015-cabeceador', { metricas: true });
  const con = serie(cambiar(base, centrales, conVirtud('Cabeceador')), rival, n, semilla, 'motor015-cabeceador', { metricas: true });
  const aereos = [porPartido(sin, ids, ['aereosGanados']), porPartido(con, ids, ['aereosGanados'])] as const;
  const goles = [porPartido(sin, ids, ['golesCabeza']), porPartido(con, ids, ['golesCabeza'])] as const;
  const okAereos = mayorSignificativo(aereos[1], aereos[0]);
  const okGoles = mayorSignificativo(goles[1], goles[0]);
  return {
    id: '015/SC-003',
    descripcion: 'Cabeceador en los centrales: más duelos aéreos ganados y más goles de cabeza, con diferencia significativa',
    ok: okAereos && okGoles,
    detalle: `aéreos ganados ${media(aereos[0]).toFixed(2)} → ${media(aereos[1]).toFixed(2)} por partido${okAereos ? '' : ' (no significativo)'} · goles de cabeza de los centrales ${media(goles[0]).toFixed(3)} → ${media(goles[1]).toFixed(3)}${okGoles ? '' : ' (no significativo)'}`,
  };
}

/** SC-011: con Juego por las bandas, laterales y extremos tocan más el balón y el equipo centra más, significativo. */
export function comprobarSC011(n: number, semilla: number): Comprobacion {
  const base = equipoSintetico({ semilla: 'motor015' });
  const rival = clonar(base, 'b');
  const bandas = { ...base, tactica: { ...base.tactica, estiloConBalon: 'bandas' as const } };
  const ids = base.titulares.filter((t) => ['LI', 'LD', 'EI', 'ED'].includes(t.casillaId)).map((t) => t.jugador.id);
  const campos = ['pases', 'conducciones', 'regates'] as const;
  const sin = serie(base, rival, n, semilla, 'motor015-bandas', { metricas: true });
  const con = serie(bandas, rival, n, semilla, 'motor015-bandas', { metricas: true });
  const toques = [porPartido(sin, ids, campos), porPartido(con, ids, campos)] as const;
  const centros = [sin.estadisticasA.map((x) => x.centros), con.estadisticasA.map((x) => x.centros)] as const;
  const okToques = mayorSignificativo(toques[1], toques[0]);
  const okCentros = mayorSignificativo(centros[1], centros[0]);
  return {
    id: '015/SC-011',
    descripcion: 'Juego por las bandas: laterales y extremos tocan más el balón y el equipo centra más, con diferencia significativa',
    ok: okToques && okCentros,
    detalle: `toques de laterales y extremos ${media(toques[0]).toFixed(1)} → ${media(toques[1]).toFixed(1)}${okToques ? '' : ' (no significativo)'} · centros ${media(centros[0]).toFixed(2)} → ${media(centros[1]).toFixed(2)}${okCentros ? '' : ' (no significativo)'}`,
  };
}

/** SC-012: los que no son delanteros (defensas y medios) marcan entre el 15 % y el 40 % de los goles del equipo. */
export function comprobarSC012(n: number, semilla: number): Comprobacion {
  const base = equipoSintetico({ semilla: 'motor015' });
  const r = serie(base, clonar(base, 'b'), n, semilla, 'motor015-segunda', { metricas: true });
  const noDelanteros = base.titulares.filter((t) => t.jugador.demarcacion === 'DEF' || t.jugador.demarcacion === 'MED').map((t) => t.jugador.id);
  const suyos = porPartido(r, noDelanteros, ['goles']).reduce((a, b) => a + b, 0);
  const todos = r.metricasA.reduce((t, m) => t + Object.values(m).reduce((u, x) => u + (x?.goles ?? 0), 0), 0);
  const cuota = todos > 0 ? suyos / todos : 0;
  return {
    id: '015/SC-012',
    descripcion: 'Segunda línea: defensas y medios marcan entre el 15 % y el 40 % de los goles de su equipo',
    ok: cuota >= 0.15 && cuota <= 0.4,
    detalle: `${(100 * cuota).toFixed(1)} % de ${todos} goles (${suyos} de defensas y medios)`,
  };
}

export function gruposMotor015(): GrupoComprobaciones[] {
  return [
    { ids: ['015/SC-002a'], serie: 'sintetica', ejecutar: (o) => [comprobarSC002a(o.n, o.seed)] },
    { ids: ['015/SC-002b'], serie: 'sintetica', ejecutar: (o) => [comprobarSC002b(o.n, o.seed)] },
    { ids: ['015/SC-003'], serie: 'sintetica', ejecutar: (o) => [comprobarSC003(o.n, o.seed)] },
    { ids: ['015/SC-011'], serie: 'sintetica', ejecutar: (o) => [comprobarSC011(o.n, o.seed)] },
    { ids: ['015/SC-012'], serie: 'sintetica', ejecutar: (o) => [comprobarSC012(o.n, o.seed)] },
  ];
}
