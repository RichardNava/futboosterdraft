/**
 * Comprobaciones del motor 8.0.0 (spec 015; contracts/balance.md §B1): frecuencia del regateador (SC-002), Cabeceador
 * en los centrales (SC-003), desmarque contra marcaje (SC-004), control con presión (SC-005), Juego por las bandas
 * (SC-011) y segunda línea (SC-012). Series A/B sintéticas con las mismas semillas: solo cambia lo que se mide.
 */
import {
  ALTURAS_BLOQUE,
  ESTILOS_CON_BALON,
  FORMACIONES,
  FORMACIONES_IDS,
  SISTEMAS_DEFENSIVOS,
  type Jugador,
  type ParametrosEquilibrado,
  type Tactica,
  type Virtud,
} from '@fbd/domain';
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
const masStat = (stat: string, delta: number) => (j: Jugador): Jugador =>
  conStat(stat, Math.min(99, (j.stats as unknown as Record<string, number>)[stat]! + delta))(j);
const casillasDe = (equipo: EquipoPartido, demarcaciones: readonly string[]) =>
  equipo.titulares.filter((t) => demarcaciones.includes(t.jugador.demarcacion)).map((t) => t.casillaId);
const suma = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

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

/**
 * SC-004: el DC con +15 de desmarque recibe libre más a menudo y recibe más pases completados; con +15 de marcaje en los
 * defensas rivales, recibe libre menos veces. Las tres diferencias, significativas.
 */
export function comprobarSC004(n: number, semilla: number): Comprobacion {
  const base = equipoSintetico({ semilla: 'motor015' });
  const rival = clonar(base, 'b');
  const id = idEn(base, 'DC');
  const sin = serie(base, rival, n, semilla, 'motor015-desmarque', { metricas: true });
  const desmarque = serie(cambiar(base, ['DC'], masStat('desmarque', 15)), rival, n, semilla, 'motor015-desmarque', { metricas: true });
  const marcaje = serie(base, cambiar(rival, casillasDe(rival, ['DEF']), masStat('marcaje', 15)), n, semilla, 'motor015-desmarque', { metricas: true });
  const libre = [sin, desmarque, marcaje].map((r) => porPartido(r, [id], ['recibidoLibre']));
  const recibidos = [sin, desmarque].map((r) => porPartido(r, [id], ['pasesRecibidos']));
  const okLibre = mayorSignificativo(libre[1]!, libre[0]!);
  const okRecibidos = mayorSignificativo(recibidos[1]!, recibidos[0]!);
  const okMarcaje = mayorSignificativo(libre[0]!, libre[2]!);
  const duelos = [sin, desmarque, marcaje].map((r) => suma(porPartido(r, [id], ['duelosDesmarque'])) / r.n);
  const ns = (ok: boolean) => (ok ? '' : ' (no significativo)');
  return {
    id: '015/SC-004',
    descripcion: 'Desmarque: con +15 de desmarque se recibe libre más a menudo y se reciben más pases completados; con +15 de marcaje del rival, menos veces libre (significativas)',
    ok: okLibre && okRecibidos && okMarcaje,
    detalle:
      `DC libre ${media(libre[0]!).toFixed(2)} → ${media(libre[1]!).toFixed(2)} por partido${ns(okLibre)} · pases recibidos ${media(recibidos[0]!).toFixed(2)} → ${media(recibidos[1]!).toFixed(2)}${ns(okRecibidos)}` +
      ` · con +15 de marcaje rival, libre ${media(libre[2]!).toFixed(2)}${ns(okMarcaje)} · duelos de desmarque ${duelos.map((d) => d.toFixed(2)).join(' / ')}`,
  };
}

/** El mismo equipo con +15 de técnica en sus jugadores de campo: la stat en DEF y MED; en el DEL, regate y creatividad (su técnica es la media). */
export function conTecnica(equipo: EquipoPartido, delta = 15): EquipoPartido {
  const del = casillasDe(equipo, ['DEL']);
  return cambiar(cambiar(equipo, casillasDe(equipo, ['DEF', 'MED']), masStat('tecnica', delta)), del, (j) => masStat('creatividad', delta)(masStat('regate', delta)(j)));
}

/**
 * SC-005: con +15 de técnica en los jugadores de campo, la parte de controles con presión que pierden baja al menos un
 * 15 %. Cuentan todos: los delanteros, los más marcados, hacen la mayoría de los controles.
 */
export function comprobarSC005(n: number, semilla: number, parametros?: ParametrosEquilibrado): Comprobacion {
  const base = equipoSintetico({ semilla: 'motor015' });
  const rival = clonar(base, 'b');
  const ids = base.titulares.filter((t) => t.jugador.demarcacion !== 'POR').map((t) => t.jugador.id);
  const tasa = (r: ResultadoSerie) => {
    const controles = suma(porPartido(r, ids, ['controlesPresion']));
    return { controles, perdidos: suma(porPartido(r, ids, ['controlesPerdidos'])) / Math.max(1, controles) };
  };
  const opciones = { metricas: true, ...(parametros ? { parametros } : {}) };
  const sin = tasa(serie(base, rival, n, semilla, 'motor015-tecnica', opciones));
  const con = tasa(serie(conTecnica(base), rival, n, semilla, 'motor015-tecnica', opciones));
  const reduccion = sin.perdidos > 0 ? 1 - con.perdidos / sin.perdidos : Number.NaN;
  return {
    id: '015/SC-005',
    descripcion: 'Control con presión: con +15 de técnica, al menos un 15 % menos de controles perdidos',
    ok: reduccion >= 0.15,
    detalle: `perdidos ${(100 * sin.perdidos).toFixed(1)} % → ${(100 * con.perdidos).toFixed(1)} % de ${sin.controles} y ${con.controles} controles (${pct(-reduccion)})`,
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

/**
 * SC-012: los que no son delanteros (defensas y medios) marcan entre el 15 % y el 30 % de los goles del equipo (máximo
 * del 40 % hasta el 2026-11-15). La cuota cambia mucho de un equipo a otro (quién tira los penaltis y las faltas, quién
 * gana por arriba, cuántos delanteros pone la formación): se mide sobre 20 equipos, uno por formación y táctica, contra
 * rivales de otra formación, con los mismos partidos en total (decisión del 2026-11-15).
 */
export function comprobarSC012(n: number, semilla: number): Comprobacion {
  const EQUIPOS = 20;
  let suyos = 0;
  let todos = 0;
  const cuotas: number[] = [];
  for (let k = 0; k < EQUIPOS; k++) {
    const estilo = ESTILOS_CON_BALON[k % ESTILOS_CON_BALON.length]!;
    const alturaBloque = ALTURAS_BLOQUE[k % ALTURAS_BLOQUE.length]!;
    // Combinaciones válidas: el juego vertical solo con contraataque y la línea adelantada solo con presión alta.
    const tactica: Tactica = { sistemaDefensivo: SISTEMAS_DEFENSIVOS[k % 2]!, alturaBloque, estiloConBalon: estilo, juegoVertical: estilo === 'contraataque', lineaAdelantada: alturaBloque === 'presion_alta' };
    const a = equipoSintetico({ formacion: FORMACIONES_IDS[k % FORMACIONES_IDS.length]!, tactica, semilla: `sc012-${k}`, participanteId: 'a' });
    const b = equipoSintetico({ formacion: FORMACIONES_IDS[(k + 3) % FORMACIONES_IDS.length]!, semilla: `sc012-b${k}`, participanteId: 'b' });
    const r = serie(a, b, Math.max(1, Math.round(n / EQUIPOS)), semilla + k, `sc012-${k}`, { metricas: true });
    const noDelanteros = a.titulares.filter((t) => t.jugador.demarcacion === 'DEF' || t.jugador.demarcacion === 'MED').map((t) => t.jugador.id);
    const s = porPartido(r, noDelanteros, ['goles']).reduce((x, y) => x + y, 0);
    const t = r.metricasA.reduce((x, m) => x + Object.values(m).reduce((u, v) => u + (v?.goles ?? 0), 0), 0);
    suyos += s;
    todos += t;
    if (t > 0) cuotas.push(s / t);
  }
  const cuota = todos > 0 ? suyos / todos : 0;
  const [min, max] = [Math.min(...cuotas), Math.max(...cuotas)];
  return {
    id: '015/SC-012',
    descripcion: 'Segunda línea: defensas y medios marcan entre el 15 % y el 30 % de los goles de su equipo (20 equipos, formaciones y tácticas distintas)',
    ok: cuota >= 0.15 && cuota <= 0.3,
    detalle: `${(100 * cuota).toFixed(1)} % de ${todos} goles (${suyos} de defensas y medios); por equipo, entre ${(100 * min).toFixed(1)} % y ${(100 * max).toFixed(1)} %`,
  };
}

export function gruposMotor015(): GrupoComprobaciones[] {
  return [
    { ids: ['015/SC-002a'], serie: 'sintetica', ejecutar: (o) => [comprobarSC002a(o.n, o.seed)] },
    { ids: ['015/SC-002b'], serie: 'sintetica', ejecutar: (o) => [comprobarSC002b(o.n, o.seed)] },
    { ids: ['015/SC-003'], serie: 'sintetica', ejecutar: (o) => [comprobarSC003(o.n, o.seed)] },
    { ids: ['015/SC-004'], serie: 'sintetica', ejecutar: (o) => [comprobarSC004(o.n, o.seed)] },
    { ids: ['015/SC-005'], serie: 'sintetica', ejecutar: (o) => [comprobarSC005(o.n, o.seed)] },
    { ids: ['015/SC-011'], serie: 'sintetica', ejecutar: (o) => [comprobarSC011(o.n, o.seed)] },
    { ids: ['015/SC-012'], serie: 'sintetica', ejecutar: (o) => [comprobarSC012(o.n, o.seed)] },
  ];
}
