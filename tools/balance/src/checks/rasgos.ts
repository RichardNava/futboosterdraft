/**
 * Efecto de cada rasgo de la spec 005 en partidos reales (T043, T089; SC-004, SC-005; research R13).
 *
 * Series A/B: el mismo equipo sintético con y sin el rasgo en unos jugadores, contra el mismo rival, con las mismas
 * semillas. Se mide la métrica de cada rasgo en los jugadores que lo tienen y se compara con su magnitud objetivo
 * ±20 % (`005/SC-004/<Rasgo>`). De acero, Fair player y De cristal se comprueban al 100 % (`005/SC-005`).
 *
 * Los sucesos raros (tarjetas, lesiones y autogoles) se miden con su probabilidad base forzada al alza, para que la
 * serie tenga potencia estadística: lo que se comprueba es el multiplicador del rasgo, no la frecuencia base (esa la
 * mide `disciplina`, SC-011).
 */
import { casilla, PARAMETROS_V4, penalizacionPorPosicion, type Defecto, type ParametrosEquilibrado, type Rasgo, type Virtud } from '@fbd/domain';
import {
  bonusProvocador,
  minutoDeJuego,
  multiplicadorEquipo,
  multiplicadorIndividual,
  type EquipoPartido,
  type EstadoMotor,
  type EventoPartido,
} from '@fbd/engine';
import { equipoSintetico } from '../equipos';
import { serie } from '../series';
import type { GrupoComprobaciones } from '../cli';
import type { Comprobacion } from './partido';

type Lado = 'local' | 'visitante';
const P = PARAMETROS_V4;
const TOLERANCIA = 0.2;

/** Copia de unos parámetros con cambios. */
function con(cambios: (q: ParametrosEquilibrado) => void, base: ParametrosEquilibrado = P): ParametrosEquilibrado {
  const q = structuredClone(base);
  cambios(q);
  return q;
}

/** Disciplina con más tarjetas por falta, para medir los multiplicadores de los defectos con potencia. */
const P_DISCIPLINA = con((q) => {
  q.disciplina.probabilidadAmarillaPorFalta = 0.15;
  q.disciplina.probabilidadRojaDirectaPorFalta = 0.08;
});
const P_LESIONES = con((q) => {
  q.lesiones.probabilidadPorEntrada = 0.02;
});
const P_AUTOGOLES = con((q) => {
  q.tiro.autogol.despejeCentro = 0.1;
  q.tiro.autogol.desvio = 0.1;
});

/** Pone rasgos a los jugadores de las casillas indicadas (y a los suplentes indicados por índice). */
function conRasgos(
  equipo: EquipoPartido,
  asignacion: { casillas?: Record<string, { virtudes?: Virtud[]; defectos?: Defecto[] }>; suplentes?: Record<number, { virtudes?: Virtud[]; defectos?: Defecto[] }>; todos?: { virtudes?: Virtud[]; defectos?: Defecto[] } },
): EquipoPartido {
  const aplicar = <J extends EquipoPartido['suplentes'][number]>(j: J, r: { virtudes?: Virtud[]; defectos?: Defecto[] } | undefined): J =>
    r ? { ...j, virtudes: [...j.virtudes, ...(r.virtudes ?? [])], defectos: [...j.defectos, ...(r.defectos ?? [])] } : j;
  return {
    ...equipo,
    titulares: equipo.titulares.map((t) => ({ ...t, jugador: aplicar(aplicar(t.jugador, asignacion.todos), asignacion.casillas?.[t.casillaId]) })),
    suplentes: equipo.suplentes.map((j, i) => aplicar(aplicar(j, asignacion.todos), asignacion.suplentes?.[i])),
  };
}

const idsDe = (e: EquipoPartido, casillas: readonly string[]) => new Set(e.titulares.filter((t) => casillas.includes(t.casillaId)).map((t) => t.jugador.id));
const autor = (ev: EventoPartido) => ev.jugadores.find((j) => j.rol === 'autor')?.jugadorId ?? -1;

/** Recuentos por jugador de los eventos de una serie. */
interface Recuento {
  faltas: Map<number, number>;
  /** Faltas cometidas sin tener aún amarilla. */
  faltasSinAmarilla: Map<number, number>;
  primerasAmarillas: Map<number, number>;
  rojasDirectas: Map<number, number>;
  lesiones: Map<number, number>;
  lesionesLargas: Map<number, number>;
  autogoles: number;
}

function recuentoVacio(): Recuento {
  return { faltas: new Map(), faltasSinAmarilla: new Map(), primerasAmarillas: new Map(), rojasDirectas: new Map(), lesiones: new Map(), lesionesLargas: new Map(), autogoles: 0 };
}

const sumar = (m: Map<number, number>, id: number, n = 1) => m.set(id, (m.get(id) ?? 0) + n);
const total = (m: Map<number, number>, ids: ReadonlySet<number>) => [...m].reduce((s, [id, n]) => s + (ids.has(id) ? n : 0), 0);

function contarEventos(r: Recuento, eventos: readonly EventoPartido[], ladoA: Lado): void {
  const amonestados = new Set<number>();
  for (const ev of eventos) {
    const id = autor(ev);
    if (ev.tipo === 'falta' && ev.equipo === ladoA) {
      sumar(r.faltas, id);
      if (!amonestados.has(id)) sumar(r.faltasSinAmarilla, id);
    } else if (ev.tipo === 'amarilla' && ev.equipo === ladoA) {
      if (ev.datos.numero === 1) sumar(r.primerasAmarillas, id);
      amonestados.add(id);
    } else if (ev.tipo === 'roja' && ev.equipo === ladoA && ev.datos.motivo === 'directa') sumar(r.rojasDirectas, id);
    else if (ev.tipo === 'lesion' && ev.equipo === ladoA) {
      sumar(r.lesiones, id);
      if (ev.datos.gravedad === 'larga') sumar(r.lesionesLargas, id);
    } else if (ev.tipo === 'gol' && ev.datos.enPropia && ev.equipo !== ladoA) r.autogoles++;
  }
}

/** Serie con recuento de eventos (y métricas por jugador) y los minutos en el campo de cada jugador del equipo A. */
function serieContada(a: EquipoPartido, b: EquipoPartido, n: number, semilla: number, etiqueta: string, parametros: ParametrosEquilibrado) {
  const r = recuentoVacio();
  const minutos = new Map<number, number>();
  const s = serie(a, b, n, semilla, etiqueta, {
    metricas: true,
    parametros,
    alTerminar: (final, ladoA) => contarEventos(r, final.eventos, ladoA),
    observador: (e, ladoA) => {
      if (e.tick % 60 === 0) for (const j of e.equipos[ladoA].jugadores) if (j.enCampo) sumar(minutos, j.id);
    },
  });
  return { r, s, minutos };
}

function comprobacion(rasgoId: Rasgo, nombre: string, medido: number, objetivo: number, detalle: string): Comprobacion {
  const ok = Number.isFinite(medido) && Math.abs(medido - objetivo) <= TOLERANCIA * Math.abs(objetivo);
  return {
    id: `005/SC-004/${rasgoId}`,
    descripcion: `${nombre}: magnitud medida dentro de ±20 % del objetivo (${objetivo})`,
    ok,
    detalle: `${detalle} → ${Number.isFinite(medido) ? medido.toFixed(3) : 'sin datos'} (objetivo ${objetivo})`,
  };
}

const razon = (a: number, b: number) => (b > 0 ? a / b : Number.NaN);

/**
 * Defectos de disciplina, cada uno en su serie (así la serie con el defecto y la de referencia comparten semillas y
 * sucesos hasta la primera diferencia): Agresivo e Impulsivo en la defensa y los medios centro, y Canchero en los medios.
 */
function disciplina(n: number, semilla: number, base: EquipoPartido, rival: EquipoPartido): Comprobacion[] {
  const serieCon = (casillas: Record<string, { defectos: Defecto[] }>) =>
    serieContada(conRasgos(base, { casillas }), rival, n, semilla, 'rasgos-disciplina', P_DISCIPLINA).r;
  const sin = serieContada(base, rival, n, semilla, 'rasgos-disciplina', P_DISCIPLINA).r;
  const zaga = ['DCI', 'DCD', 'LI', 'LD', 'MC-1', 'MC-2'];
  const en = (d: Defecto) => Object.fromEntries(zaga.map((c) => [c, { defectos: [d] }]));
  const conAgresivo = serieCon(en('Agresivo'));
  const conImpulsivo = serieCon(en('Impulsivo'));
  const conCanchero = serieCon({ 'MC-1': { defectos: ['Canchero'] }, 'MC-2': { defectos: ['Canchero'] } });
  const centrales = idsDe(base, zaga);
  const laterales = centrales;
  const medios = idsDe(base, ['MC-1', 'MC-2']);
  const rojaPorFalta = (x: Recuento) => razon(total(x.rojasDirectas, centrales), total(x.faltas, centrales));
  const amarillaPorFalta = (x: Recuento) => razon(total(x.primerasAmarillas, laterales), total(x.faltasSinAmarilla, laterales));
  return [
    comprobacion(
      'Agresivo',
      'Agresivo (rojas directas por falta)',
      razon(rojaPorFalta(conAgresivo), rojaPorFalta(sin)),
      P.defectos!.agresivo,
      `${total(sin.rojasDirectas, centrales)}/${total(sin.faltas, centrales)} → ${total(conAgresivo.rojasDirectas, centrales)}/${total(conAgresivo.faltas, centrales)} rojas por falta`,
    ),
    comprobacion(
      'Impulsivo',
      'Impulsivo (amarillas por falta)',
      razon(amarillaPorFalta(conImpulsivo), amarillaPorFalta(sin)),
      P.defectos!.impulsivo,
      `por falta ${amarillaPorFalta(sin).toFixed(3)} → ${amarillaPorFalta(conImpulsivo).toFixed(3)}`,
    ),
    comprobacion(
      'Canchero',
      'Canchero (faltas cometidas)',
      razon(total(conCanchero.faltas, medios), total(sin.faltas, medios)),
      P.defectos!.canchero,
      `faltas ${total(sin.faltas, medios)} → ${total(conCanchero.faltas, medios)}`,
    ),
  ];
}

/**
 * Lesiones: Frágil en los delanteros (los que más entradas reciben) y De cristal en los medios. Las lesiones se cuentan
 * por minuto en el campo: un Frágil lesionado deja de jugar y de exponerse.
 */
function lesiones(n: number, semilla: number, base: EquipoPartido, rival: EquipoPartido): Comprobacion[] {
  const atacantes = base.titulares.filter((t) => t.jugador.demarcacion === 'DEL').map((t) => t.casillaId);
  const medios = base.titulares.filter((t) => t.jugador.demarcacion === 'MED').map((t) => t.casillaId);
  const asignar = (casillas: string[], r: { defectos?: Defecto[]; virtudes?: Virtud[] }) => Object.fromEntries(casillas.map((c) => [c, r]));
  const conDefectos = conRasgos(base, { casillas: { ...asignar(atacantes, { defectos: ['Fragil'] }), ...asignar(medios, { defectos: ['DeCristal'] }) } });
  const sin = serieContada(base, rival, n, semilla, 'rasgos-lesiones', P_LESIONES);
  const conR = serieContada(conDefectos, rival, n, semilla, 'rasgos-lesiones', P_LESIONES);
  const idsAtacantes = idsDe(base, atacantes);
  const idsMedios = idsDe(base, medios);
  const porMinuto = (x: typeof sin) => razon(total(x.r.lesiones, idsAtacantes), total(x.minutos, idsAtacantes));
  const largas = razon(total(conR.r.lesionesLargas, idsMedios), total(conR.r.lesiones, idsMedios));
  return [
    comprobacion(
      'Fragil',
      'Frágil (lesiones por minuto en el campo)',
      razon(porMinuto(conR), porMinuto(sin)),
      P.defectos!.fragil,
      `lesiones ${total(sin.r.lesiones, idsAtacantes)} → ${total(conR.r.lesiones, idsAtacantes)}`,
    ),
    comprobacion('DeCristal', 'De cristal (proporción de lesiones largas)', largas, 1, `${total(conR.r.lesionesLargas, idsMedios)} de ${total(conR.r.lesiones, idsMedios)} lesiones`),
  ];
}

/** Torpe en todo el equipo: autogoles. */
function autogoles(n: number, semilla: number, base: EquipoPartido, rival: EquipoPartido): Comprobacion[] {
  const sin = serieContada(base, rival, n, semilla, 'rasgos-autogoles', P_AUTOGOLES).r;
  const conR = serieContada(conRasgos(base, { todos: { defectos: ['Torpe'] } }), rival, n, semilla, 'rasgos-autogoles', P_AUTOGOLES).r;
  return [comprobacion('Torpe', 'Torpe (autogoles)', razon(conR.autogoles, sin.autogoles), P.defectos!.torpe, `autogoles ${sin.autogoles} → ${conR.autogoles}`)];
}

/** Muestras del estado cada 60 ticks: medias de los multiplicadores y el minuto en que empieza el cansancio. */
function serieMuestreada(
  a: EquipoPartido,
  b: EquipoPartido,
  n: number,
  semilla: number,
  etiqueta: string,
  muestrear: (e: EstadoMotor, ladoA: Lado) => void,
) {
  return serie(a, b, n, semilla, etiqueta, { metricas: true, parametros: P, observador: (e, ladoA) => muestrear(e, ladoA) });
}

const mediaDe = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : Number.NaN);

/** Fatigado, Indisciplinado, Polémico, Rebelde, Estrellita y Provocador. */
function medias(n: number, semilla: number, base: EquipoPartido, rival: EquipoPartido): Comprobacion[] {
  const conDefectos = conRasgos(base, {
    casillas: { 'MC-1': { defectos: ['Fatigado'] }, 'MC-2': { defectos: ['Indisciplinado'] }, DC: { defectos: ['Polemico'] }, LI: { defectos: ['Estrellita'] }, DCI: { defectos: ['Provocador'] } },
    suplentes: { 3: { defectos: ['Rebelde'] } },
  });
  const mc1 = base.titulares.find((t) => t.casillaId === 'MC-1')!.jugador.id;
  const mc2 = base.titulares.find((t) => t.casillaId === 'MC-2')!.jugador.id;
  const li = base.titulares.find((t) => t.casillaId === 'LI')!.jugador.id;
  const rebelde = base.suplentes[3]!.id;
  const goatRival = rival.titulares.find((t) => t.jugador.nivel === 'GOAT')!.jugador.id;
  const inicio: number[] = [];
  const cansancioFinal: { mc1: number[]; mc2: number[] } = { mc1: [], mc2: [] };
  const polemico: number[] = [];
  const rebeldeFactor: number[] = [];
  const estrellita: number[] = [];
  const provocador: number[] = [];
  let visto = false;
  serieMuestreada(conDefectos, rival, n, semilla, 'rasgos-medias', (e, ladoA) => {
    const eq = e.equipos[ladoA];
    const j1 = eq.jugadores.find((j) => j.id === mc1)!;
    if (e.tick === 1) visto = false;
    if (!visto && j1.enCampo && j1.cansancio > 0) {
      inicio.push(minutoDeJuego(e.reloj) + 1);
      visto = true;
    }
    if (e.tick % 60 !== 0) return;
    if (e.fase === 'segunda_parte' && e.reloj.segundosEnParte >= 44 * 60 && e.reloj.segundosEnParte < 45 * 60) {
      const j2 = eq.jugadores.find((j) => j.id === mc2)!;
      const otro = eq.jugadores.find((j) => j.casillaId === 'LD' && j.enCampo);
      if (j2.enCampo && otro && otro.cansancio > 0) {
        cansancioFinal.mc2.push(j2.cansancio);
        cansancioFinal.mc1.push(otro.cansancio);
      }
    }
    const rival = e.equipos[ladoA === 'local' ? 'visitante' : 'local'];
    const perdiendo = e.marcador[ladoA] < e.marcador[rival.lado];
    const dc = eq.jugadores.find((j) => j.casillaId === 'DC' && j.enCampo && j.jugador.defectos.includes('Polemico'));
    const enBanquillo = eq.jugadores.find((j) => j.id === rebelde && !j.enCampo && !j.retirado && !j.expulsado && !j.lesionado);
    const quitarRebelde = enBanquillo ? 1 - P.defectos!.rebelde : 1;
    if (perdiendo && dc) polemico.push(multiplicadorEquipo(e, eq) / quitarRebelde);
    if (enBanquillo) rebeldeFactor.push(multiplicadorEquipo(e, eq) / (perdiendo && dc ? 1 - P.defectos!.polemico : 1));
    const jli = eq.jugadores.find((j) => j.id === li && j.enCampo);
    if (jli) {
      const m = multiplicadorIndividual(e, eq, jli);
      if (m < 1) estrellita.push(m);
    }
    const goat = rival.jugadores.find((j) => j.id === goatRival && j.enCampo);
    if (goat) provocador.push(bonusProvocador(e, rival, goat));
  });
  const pct = (xs: number[]) => 1 - mediaDe(xs);
  return [
    comprobacion('Fatigado', 'Fatigado (minuto en que empieza a cansarse)', mediaDe(inicio), 46, `${inicio.length} partidos; inicio general ${P.cansancio.inicioMin}`),
    comprobacion('Indisciplinado', 'Indisciplinado (cansancio acumulado frente a un compañero)', razon(mediaDe(cansancioFinal.mc2), mediaDe(cansancioFinal.mc1)), P.defectos!.indisciplinado, `${cansancioFinal.mc2.length} muestras al minuto 89`),
    comprobacion('Polemico', 'Polémico (bajada de la media del equipo yendo por detrás)', pct(polemico), P.defectos!.polemico, `${polemico.length} muestras`),
    comprobacion('Rebelde', 'Rebelde (bajada de la media del equipo desde el banquillo)', pct(rebeldeFactor), P.defectos!.rebelde, `${rebeldeFactor.length} muestras`),
    comprobacion('Estrellita', 'Estrellita (bajada de su media sin ser el mejor)', pct(estrellita), P.defectos!.estrellita, `${estrellita.length} muestras`),
    comprobacion('Provocador', 'Provocador (puntos que gana un GOAT rival)', mediaDe(provocador), P.defectos!.provocador, `${provocador.length} muestras`),
  ];
}

/** Chupón y Mal defensor: cuánto pasa y cuánto defiende el jugador con el defecto. */
function juego(n: number, semilla: number, base: EquipoPartido, rival: EquipoPartido): Comprobacion[] {
  // Mal defensor en un solo central: si lo tuvieran los dos, el que cede la acción se la cedería al otro.
  const conDefectos = conRasgos(base, { casillas: { 'MC-1': { defectos: ['Chupon'] }, DCI: { defectos: ['MalDefensor'] } } });
  const sin = serie(base, rival, n, semilla, 'rasgos-juego', { metricas: true, parametros: P });
  const conR = serie(conDefectos, rival, n, semilla, 'rasgos-juego', { metricas: true, parametros: P });
  const mc = base.titulares.find((t) => t.casillaId === 'MC-1')!.jugador.id;
  const centrales = [...idsDe(base, ['DCI'])];
  const suma = (s: typeof sin, ids: readonly number[], f: (m: NonNullable<(typeof sin.metricasA)[number][number]>) => number) =>
    s.metricasA.reduce((acc, m) => acc + ids.reduce((a, id) => a + (m[id] ? f(m[id]!) : 0), 0), 0);
  // Peso de las opciones de pase frente al resto de sus acciones con balón: con un peso × 0,5, la razón de momios × 0,5.
  const momios = (s: typeof sin) => razon(suma(s, [mc], (m) => m.pases), suma(s, [mc], (m) => m.regates + m.conducciones + m.tirosArea + m.tirosFrontal + m.tirosLejos));
  const defensivas = (s: typeof sin) => suma(s, centrales, (m) => m.intercepciones + m.entradasGanadas);
  return [
    comprobacion('Chupon', 'Chupón (peso de los pases frente al resto de acciones)', razon(momios(conR), momios(sin)), P.defectos!.chupon, `momios ${momios(sin).toFixed(2)} → ${momios(conR).toFixed(2)}`),
    comprobacion('MalDefensor', 'Mal defensor (intercepciones y entradas ganadas)', razon(defensivas(conR), defensivas(sin)), P.defectos!.malDefensor, `acciones ${defensivas(sin)} → ${defensivas(conR)}`),
  ];
}

/** Inflexible: puntos de penalización fuera de posición (misma demarcación, de 10 a 15 puntos). */
function inflexible(base: EquipoPartido): Comprobacion[] {
  const medio = base.titulares.find((t) => t.casillaId === 'MC-1')!.jugador;
  const destino = casilla('4-4-2', 'ED')!;
  const sin = penalizacionPorPosicion({ ...medio, defectos: [] }, destino, P);
  const conI = penalizacionPorPosicion({ ...medio, defectos: ['Inflexible'] }, destino, P);
  return [comprobacion('Inflexible', 'Inflexible (puntos de penalización fuera de posición)', 100 * (conI - sin), 100 * P.defectos!.inflexible, `penalización ${(100 * sin).toFixed(0)} → ${(100 * conI).toFixed(0)} puntos`)];
}

/** Equipos de la comprobación: el rival tiene un GOAT en la punta, para Provocador. */
function equiposRasgos() {
  const base = equipoSintetico({ semilla: 'rasgos-005', participanteId: 'a' });
  const rival = equipoSintetico({ semilla: 'referencia', participanteId: 'rival' });
  rival.titulares = rival.titulares.map((t) => (t.casillaId === 'DC' ? { ...t, jugador: { ...t.jugador, nivel: 'GOAT' } } : t));
  return { base, rival };
}

/**
 * Virtudes nuevas (T089): De acero y Fair player al 100 % (`005/SC-005`, junto con De cristal); Versátil (puntos de
 * penalización) y Revulsivo (subida de sus stats al entrar desde el banquillo) por su magnitud (`005/SC-004`).
 */
function virtudesNuevas(n: number, semilla: number, base: EquipoPartido, rival: EquipoPartido, deCristal: Comprobacion): Comprobacion[] {
  const deAcero = serieContada(conRasgos(base, { todos: { virtudes: ['DeAcero'] } }), rival, n, semilla, 'rasgos-lesiones', P_LESIONES).r;
  const referenciaLesiones = serieContada(base, rival, n, semilla, 'rasgos-lesiones', P_LESIONES).r;
  const fair = serieContada(conRasgos(base, { todos: { virtudes: ['FairPlayer'] } }), rival, n, semilla, 'rasgos-disciplina', P_DISCIPLINA);
  const referenciaRojas = serieContada(base, rival, n, semilla, 'rasgos-disciplina', P_DISCIPLINA).s;
  const rojas = (s: ReturnType<typeof serie>) => s.estadisticasA.reduce((a, e) => a + e.rojas, 0);
  const lesionesDeAcero = [...deAcero.lesiones.values()].reduce((a, b) => a + b, 0);
  const lesionesReferencia = [...referenciaLesiones.lesiones.values()].reduce((a, b) => a + b, 0);
  const ok = lesionesDeAcero === 0 && lesionesReferencia > 0 && rojas(fair.s) === 0 && rojas(referenciaRojas) > 0 && deCristal.ok;
  const sc005: Comprobacion = {
    id: '005/SC-005',
    descripcion: 'De acero: 0 lesiones; Fair player: 0 rojas; De cristal: 100 % de lesiones largas',
    ok,
    detalle: `De acero ${lesionesDeAcero} lesiones (sin la virtud, ${lesionesReferencia}) · Fair player ${rojas(fair.s)} rojas (sin la virtud, ${rojas(referenciaRojas)}) · De cristal: ${deCristal.detalle}`,
  };

  // Revulsivo en todo el banquillo; los lesionados (con lesiones forzadas al alza) hacen entrar a los suplentes.
  const subida: number[] = [];
  serie(conRasgos(base, { suplentes: Object.fromEntries(base.suplentes.map((_, i) => [i, { virtudes: ['Revulsivo'] as Virtud[] }])) }), rival, n, semilla, 'rasgos-revulsivo', {
    parametros: P_LESIONES,
    observador: (e, ladoA) => {
      if (e.tick % 60 !== 0) return;
      const eq = e.equipos[ladoA];
      for (const j of eq.jugadores) if (j.enCampo && j.entroDesdeBanquillo && j.jugador.virtudes.includes('Revulsivo')) subida.push(multiplicadorIndividual(e, eq, j) - 1);
    },
  });

  const medio = base.titulares.find((t) => t.casillaId === 'MC-1')!.jugador;
  const destino = casilla('4-4-2', 'ED')!;
  const sinV = penalizacionPorPosicion({ ...medio, virtudes: [] }, destino, P);
  const conV = penalizacionPorPosicion({ ...medio, virtudes: ['Versatil'] }, destino, P);
  return [
    sc005,
    comprobacion('Versatil', 'Versátil (puntos de penalización fuera de posición)', 100 * (sinV - conV), 100 * P.virtudes.versatil!, `penalización ${(100 * sinV).toFixed(0)} → ${(100 * conV).toFixed(0)} puntos`),
    comprobacion('Revulsivo', 'Revulsivo (subida de sus stats al entrar desde el banquillo)', mediaDe(subida), P.virtudes.revulsivo!, `${subida.length} muestras`),
  ];
}

export const IDS_RASGOS_DEFECTOS = [
  'Agresivo', 'Impulsivo', 'Canchero', 'Fragil', 'DeCristal', 'Torpe', 'Fatigado', 'Indisciplinado', 'Polemico', 'Rebelde', 'Estrellita', 'Provocador', 'Chupon', 'MalDefensor', 'Inflexible',
].map((r) => `005/SC-004/${r}`);
export const IDS_RASGOS_VIRTUDES = ['005/SC-005', '005/SC-004/Versatil', '005/SC-004/Revulsivo'];

/** Defectos (T043) y virtudes nuevas (T089). Cada serie juega `n` partidos con el rasgo y `n` sin él. */
export function comprobacionesDefectos(n: number, semilla: number): Comprobacion[] {
  const { base, rival } = equiposRasgos();
  const deLesiones = lesiones(n, semilla, base, rival);
  return [
    ...disciplina(n, semilla, base, rival),
    ...deLesiones,
    ...autogoles(n, semilla, base, rival),
    ...medias(Math.max(20, Math.round(n / 2)), semilla, base, rival),
    ...juego(n, semilla, base, rival),
    ...inflexible(base),
    ...virtudesNuevas(n, semilla, base, rival, deLesiones.find((c) => c.id === '005/SC-004/DeCristal')!),
  ];
}

/** Grupos de la spec 005 para `cli.ts`. Las series de rasgos usan la quinta parte de `--n` (son muchas y A/B). */
export function gruposRasgos(): GrupoComprobaciones[] {
  return [
    {
      ids: [...IDS_RASGOS_DEFECTOS, ...IDS_RASGOS_VIRTUDES],
      serie: 'sintetica',
      ejecutar: (o) => comprobacionesDefectos(Math.max(40, Math.round(o.n / 5)), o.seed),
    },
  ];
}

export { conRasgos, equiposRasgos, serieContada, P_DISCIPLINA, P_LESIONES, comprobacion, total, idsDe };
