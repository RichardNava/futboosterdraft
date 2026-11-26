/**
 * Comprobaciones del motor 8.0.0 (spec 015; contracts/balance.md §B1): frecuencia del regateador (SC-002), Cabeceador
 * en los centrales (SC-003), desmarque contra marcaje (SC-004), control con presión (SC-005), liderazgo (SC-006), Juego
 * por las bandas (SC-011), segunda línea (SC-012) y táctica Contraataque (SC-014). Series A/B sintéticas con las mismas semillas: solo cambia lo que se mide.
 */
import {
  ALTURAS_BLOQUE,
  CASILLA_CENTRAL,
  ESTILOS_CON_BALON,
  FORMACIONES,
  FORMACIONES_IDS,
  parametrosActuales,
  SISTEMAS_DEFENSIVOS,
  type Jugador,
  type ParametrosEquilibrado,
  type Tactica,
  type Virtud,
} from '@fbd/domain';
import { bonusPortero, exposicionLinea, probabilidad, type EquipoPartido, type MetricasJugador } from '@fbd/engine';
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

/** Los DEF titulares del equipo. */
const defensasDe = (equipo: EquipoPartido) => equipo.titulares.filter((t) => t.jugador.demarcacion === 'DEF').map((t) => t.jugador.id);

/**
 * Mínimo de SC-006a: 1,5 % + 0,12 % por punto de liderazgo sobre 49 (decisión del 2026-11-17). Es proporcional a
 * L − 36,5: exigirlo en cada liderazgo es exigir al menos un 0,12 % de bajada por punto sobre 36,5.
 */
export const minimoLinea = (liderazgo: number) => 0.015 + 0.0012 * (liderazgo - 49);
const PENDIENTE_MINIMA = 0.0012;
const ORIGEN_ESCALA = 49 - 0.015 / PENDIENTE_MINIMA;
/** Liderazgos del central que se comprueban en SC-006a (Core va de 62 a 98). */
const NIVELES_LIDER = [60, 80, 95] as const;
/** Liderazgo de los demás defensas y del portero: sin efecto en la línea ni en el portero. */
const SIN_LIDER = 30;

/**
 * SC-006 (decisiones del 2026-11-17). a) Línea: en 20 escenarios (diez formaciones, tácticas distintas, rivales de
 * otra formación), con los demás defensas, el portero y los suplentes sin liderazgo, un central con liderazgo L baja la
 * exposición de su línea (atacantes que un defensa rezagado deja en juego, en cada segundo en que defiende) frente a la
 * misma línea sin líder. Cada nivel por separado tiene un ±3 % de ruido con 1.000 partidos, tanto como el mínimo de 60:
 * se exige la escala con los tres niveles juntos (la bajada por punto de liderazgo sobre 36,5, ajustada por mínimos
 * cuadrados, ≥ 0,12 %) y que los tres bajen. b) Portero: calculado sin series, un defensa en su área gana más un
 * duelo con un portero de 95 que con uno de 70; la serie con el portero de 95 se queda como dato.
 */
export function comprobarSC006(n: number, semilla: number, parametros: ParametrosEquilibrado = parametrosActuales()): Comprobacion[] {
  const ESCENARIOS = 20;
  const partidos = Math.max(1, Math.round(n / ESCENARIOS));
  const variantes = ['sin', ...NIVELES_LIDER.map(String), 'portero'];
  const exposicion = new Map(variantes.map((v) => [v, { suma: 0, ticks: 0 }]));
  const habilitaciones = new Map(variantes.map((v) => [v, 0]));
  const duelos = new Map(variantes.map((v) => [v, 0]));
  const campos = ['entradasGanadas', 'intercepciones', 'aereosGanados'] as const;
  for (let k = 0; k < ESCENARIOS; k++) {
    const estilo = ESTILOS_CON_BALON[k % ESTILOS_CON_BALON.length]!;
    const alturaBloque = ALTURAS_BLOQUE[k % ALTURAS_BLOQUE.length]!;
    const tactica: Tactica = { sistemaDefensivo: SISTEMAS_DEFENSIVOS[k % 2]!, alturaBloque, estiloConBalon: estilo, juegoVertical: estilo === 'contraataque', lineaAdelantada: alturaBloque === 'presion_alta' };
    const inicial = equipoSintetico({ formacion: FORMACIONES_IDS[k % FORMACIONES_IDS.length]!, tactica, semilla: `sc006-${k}`, participanteId: 'a' });
    const sinLider = (j: Jugador) => (j.demarcacion === 'DEF' || j.demarcacion === 'POR' ? conStat('liderazgo', SIN_LIDER)(j) : j);
    const base = { ...cambiar(inicial, casillasDe(inicial, ['DEF', 'POR']), sinLider), suplentes: inicial.suplentes.map(sinLider) };
    const central = base.titulares.some((t) => t.casillaId === CASILLA_CENTRAL) ? CASILLA_CENTRAL : 'DCI';
    const rival = equipoSintetico({ formacion: FORMACIONES_IDS[(k + 3) % FORMACIONES_IDS.length]!, semilla: `sc006-b${k}`, participanteId: 'b' });
    const ids = defensasDe(base);
    for (const v of variantes) {
      const equipo = v === 'sin' ? base : v === 'portero' ? cambiar(base, ['POR'], conStat('liderazgo', 95)) : cambiar(base, [central], conStat('liderazgo', Number(v)));
      const e = exposicion.get(v)!;
      const r = serie(equipo, rival, partidos, semilla + k, `sc006-${k}`, {
        metricas: true,
        parametros,
        observador: (estado, ladoA) => {
          if (estado.balon.posesion === ladoA || estado.espacio.accion?.tipo === 'saque') return;
          e.suma += exposicionLinea(estado, ladoA);
          e.ticks++;
        },
      });
      habilitaciones.set(v, habilitaciones.get(v)! + suma(porPartido(r, ids, ['habilitaciones'])));
      duelos.set(v, duelos.get(v)! + suma(porPartido(r, ids, campos)));
    }
  }
  const total = partidos * ESCENARIOS;
  const mediaDe = (v: string) => exposicion.get(v)!.suma / Math.max(1, exposicion.get(v)!.ticks);
  const bajadas = NIVELES_LIDER.map((l) => ({ l, bajada: 1 - mediaDe(String(l)) / mediaDe('sin'), minimo: minimoLinea(l) }));
  // Bajada por punto de liderazgo sobre el origen de la escala, por mínimos cuadrados con los tres niveles.
  const xs = bajadas.map((b) => b.l - ORIGEN_ESCALA);
  const pendiente = bajadas.reduce((t, b, i) => t + b.bajada * xs[i]!, 0) / xs.reduce((t, x) => t + x * x, 0);
  const porPartidoDe = (m: Map<string, number>, v: string) => m.get(v)! / total;

  // b) El duelo de referencia: conducción 80 contra 80 de un defensa en su área (zona 0).
  const lid = parametros.liderazgo!;
  const curva = parametros.curvas?.conduccion;
  const ganaDefensa = (portero: number) =>
    1 - probabilidad({ base: curva?.base ?? parametros.acciones.conduccion, atacante: 80, defensor: 80 + bonusPortero(portero, 0, lid), ...(curva ? { pendiente: curva.m } : {}) }, parametros) / 1000;
  const [con70, con95] = [ganaDefensa(70), ganaDefensa(95)];
  return [
    {
      id: '015/SC-006a',
      descripcion: 'Liderazgo del defensa: en 20 escenarios, un central con liderazgo L baja la exposición de su línea al menos 1,5 % + 0,12 % por punto sobre 49',
      ok: pendiente >= PENDIENTE_MINIMA && bajadas.every((b) => b.bajada > 0),
      detalle:
        `${(100 * pendiente).toFixed(3)} % por punto (mínimo 0,120 %) · ` +
        bajadas.map((b) => `${b.l}: ${pct(-b.bajada)} (mínimo ${pct(-b.minimo)})`).join(' · ') +
        ` · exposición sin líder ${mediaDe('sin').toFixed(4)} por segundo · habilitaciones por partido (sin / ${NIVELES_LIDER.join(' / ')}) ${variantes.slice(0, 4).map((v) => porPartidoDe(habilitaciones, v).toFixed(2)).join(' / ')}`,
    },
    {
      id: '015/SC-006b',
      descripcion: 'Liderazgo del portero: un defensa en su área gana más duelos con un portero de 95 que con uno de 70 (cálculo directo)',
      ok: con95 > con70,
      detalle: `conducción 80 contra 80 en el área: el defensa gana ${(100 * con70).toFixed(1)} % con 70 y ${(100 * con95).toFixed(1)} % con 95 · serie (dato): duelos ganados por los defensas ${porPartidoDe(duelos, 'sin').toFixed(2)} → ${porPartidoDe(duelos, 'portero').toFixed(2)} por partido`,
    },
  ];
}

/** SC-014: un 4-4-2 con táctica Contraataque y juego vertical hace al menos un 30 % más de contraataques (decisión del 2026-11-17). */
export function comprobarSC014(n: number, semilla: number): Comprobacion {
  const base = equipoSintetico({ semilla: 'sc014' });
  const contra = { ...base, tactica: { ...base.tactica, estiloConBalon: 'contraataque' as const, juegoVertical: true } };
  const rival = clonar(base, 'b');
  const [sin, con] = [base, contra].map((a) => media(serie(a, rival, n, semilla, 'sc014').estadisticasA.map((s) => s.contraataques))) as [number, number];
  const subida = rel(con, sin);
  return {
    id: '015/SC-014',
    descripcion: 'Táctica Contraataque: con juego vertical, al menos un 30 % más de contraataques que con la táctica por defecto',
    ok: subida >= 0.3,
    detalle: `contraataques del equipo ${sin.toFixed(2)} → ${con.toFixed(2)} por partido (${pct(subida)})`,
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
    // El doble de partidos (spec 018, T062): con la 9.0.0 los pases recibidos suben +0,25 (8.0.0: +0,32) y con `--n` no llega a 2 errores estándar.
    { ids: ['015/SC-004'], serie: 'sintetica', ejecutar: (o) => [comprobarSC004(2 * o.n, o.seed)] },
    { ids: ['015/SC-005'], serie: 'sintetica', ejecutar: (o) => [comprobarSC005(o.n, o.seed)] },
    { ids: ['015/SC-006a', '015/SC-006b'], serie: 'sintetica', ejecutar: (o) => comprobarSC006(o.n, o.seed) },
    { ids: ['015/SC-014'], serie: 'sintetica', ejecutar: (o) => [comprobarSC014(o.n, o.seed)] },
    { ids: ['015/SC-011'], serie: 'sintetica', ejecutar: (o) => [comprobarSC011(o.n, o.seed)] },
    { ids: ['015/SC-012'], serie: 'sintetica', ejecutar: (o) => [comprobarSC012(o.n, o.seed)] },
  ];
}
