/**
 * Comprobaciones del motor 9.0.0 (spec 018, T057): energía por rol (SC-003), rasgos (SC-004), coste de Presión alta
 * (SC-005) y efecto de las tácticas modificadas (SC-006). La energía se mide a las 90:00 y se compara con `curvaEnergia`
 * con el descuento real de la primera parte de cada partido (research R5). Los márgenes de ±3 son los de partida de la
 * spec. SC-005 solo exige una diferencia significativa y SC-006 sigue las direcciones de la US2, ambas cosas aprobadas
 * por la persona responsable (T060).
 */
import { parametrosActuales, type Defecto, type Demarcacion, type RolFatiga, type Tactica, type Virtud } from '@fbd/domain';
import { curvaEnergia, type EquipoPartido, type EstadoMotor, type PerfilEnergia } from '@fbd/engine';
import type { GrupoComprobaciones } from '../cli';
import { clonar, equipoSintetico } from '../equipos';
import { errorEstandar, mayorSignificativo, media, serie, type ResultadoSerie } from '../series';
import type { Comprobacion } from './partido';

const ETIQUETA = 'motor018';
const MARGEN = 3;
const ROLES: readonly RolFatiga[] = ['porteria', 'defensa', 'medio', 'ataque'];
// shortcut: el rol sale de la demarcación, que coincide con la línea porque los sintéticos juegan en su posición natural.
const ROL_DE: Record<Demarcacion, RolFatiga> = { POR: 'porteria', DEF: 'defensa', MED: 'medio', DEL: 'ataque' };

type Rasgo = 'Incansable' | 'Fatigado' | 'Indisciplinado';

/** Curva de un jugador de ese rol con ese rasgo (FR-010a, FR-013 a FR-015). */
function perfilDe(rol: RolFatiga, rasgo?: Rasgo): PerfilEnergia {
  const f = parametrosActuales().fatiga;
  const ritmo = f.ritmoRol[rol];
  if (rasgo === 'Incansable') return { ritmo: ritmo * f.rasgos.incansable };
  if (rasgo === 'Fatigado') return { ritmo: ritmo * f.rasgos.fatigado };
  if (rasgo === 'Indisciplinado') return { ritmo, adelantoMin: f.rasgos.indisciplinado.adelantoMin, costeAccion: f.rasgos.indisciplinado.costeAccion };
  return { ritmo };
}

/** Todos los titulares del equipo con ese rasgo y ningún otro. */
function conRasgo(base: EquipoPartido, rasgo: Rasgo): EquipoPartido {
  const virtudes: Virtud[] = rasgo === 'Incansable' ? ['Incansable'] : [];
  const defectos: Defecto[] = rasgo === 'Incansable' ? [] : [rasgo];
  return { ...base, titulares: base.titulares.map((t) => ({ ...t, jugador: { ...t.jugador, virtudes, defectos } })) };
}

interface Muestra {
  rol: RolFatiga;
  medida: number;
  referencia: number;
}

interface Medida {
  muestras: Muestra[];
  /** Energía media de los titulares de campo del equipo A, sin `excluido`, a las 90:00 de cada partido. */
  porPartido: number[];
}

/**
 * Energía a las 90:00 de los titulares que siguen en el campo, con la de su curva para el descuento de ese partido: los
 * del equipo A y, con `ambos` (cuando los dos equipos son iguales), también los del rival.
 */
function medir(equipo: EquipoPartido, rival: EquipoPartido, n: number, semilla: number, opciones: { rasgo?: Rasgo; ambos?: boolean; excluido?: number } = {}): Medida {
  const titularesA = new Set(equipo.titulares.map((t) => t.jugador.id));
  const titularesB = new Set(opciones.ambos ? rival.titulares.map((t) => t.jugador.id) : []);
  const muestras: Muestra[] = [];
  const porPartido: number[] = [];
  let finPrimera = 0;
  serie(equipo, rival, n, semilla, ETIQUETA, {
    observador: (e: EstadoMotor) => {
      const { parte, segundosEnParte } = e.reloj;
      if (parte === 1) finPrimera = segundosEnParte;
      if (parte !== 2 || segundosEnParte !== 45 * 60) return;
      const descuentoPrimeraParte = Math.max(0, finPrimera - 45 * 60) / 60;
      const delPartido: number[] = [];
      for (const j of [...e.equipos.local.jugadores, ...e.equipos.visitante.jugadores]) {
        const deA = titularesA.has(j.id);
        if (!j.enCampo || !(deA || titularesB.has(j.id))) continue;
        const rol = ROL_DE[j.jugador.demarcacion];
        muestras.push({ rol, medida: j.energia, referencia: curvaEnergia(perfilDe(rol, opciones.rasgo), { descuentoPrimeraParte }).minuto90 });
        if (deA && rol !== 'porteria' && j.id !== opciones.excluido) delPartido.push(j.energia);
      }
      porPartido.push(media(delPartido));
    },
  });
  return { muestras, porPartido };
}

/** Medida y referencia medias de un rol (o de todos), y su diferencia. */
function resumen(muestras: Muestra[], rol?: RolFatiga) {
  const de = rol ? muestras.filter((m) => m.rol === rol) : muestras;
  const medida = media(de.map((m) => m.medida));
  const referencia = media(de.map((m) => m.referencia));
  return { medida, referencia, diferencia: medida - referencia };
}

const num = (x: number) => x.toFixed(1);
const conSigno = (x: number) => `${x > 0 ? '+' : ''}${num(x)}`;
const textoRol = (muestras: Muestra[], rol: RolFatiga) => {
  const r = resumen(muestras, rol);
  return `${rol} ${num(r.medida)} (ref. ${num(r.referencia)}, ${conSigno(r.diferencia)})`;
};

export function comprobacionesMotor018(n: number, semilla: number): Comprobacion[] {
  const base = equipoSintetico({ semilla: ETIQUETA });
  const rival = clonar(base, 'neutro');
  // Un medio para Motivador. Para comparar igual, SC-004b y SC-005 miden a sus compañeros de campo, sin él.
  const motivador = base.titulares.find((t) => t.jugador.demarcacion === 'MED')!.jugador;
  const excluido = motivador.id;

  const neutros = medir(base, rival, n, semilla, { ambos: true, excluido });
  const roles = ROLES.map((rol) => ({ rol, ...resumen(neutros.muestras, rol) }));

  const rasgos = (['Incansable', 'Fatigado', 'Indisciplinado'] as const).map((rasgo) => {
    const { muestras } = medir(conRasgo(base, rasgo), rival, n, semilla, { rasgo });
    return { rasgo, muestras, ...resumen(muestras) };
  });

  const conMotivador = {
    ...base,
    titulares: base.titulares.map((t) => (t.jugador.id === excluido ? { ...t, jugador: { ...t.jugador, virtudes: ['Motivador' as Virtud] } } : t)),
  };
  // El equipo base sin el Motivador, con Bloque medio (la táctica por defecto).
  const sinMotivador = neutros.porPartido;
  const companeros = medir(conMotivador, rival, n, semilla, { excluido }).porPartido;

  const bloqueMedio = neutros.porPartido;
  const presionAlta = medir({ ...base, tactica: { ...base.tactica, alturaBloque: 'presion_alta' } }, rival, n, semilla, { excluido }).porPartido;
  const costePresion = media(bloqueMedio) - media(presionAlta);

  return [
    {
      id: '018/SC-003',
      descripcion: `Energía media al 90' de cada rol a ±${MARGEN} de su curva con el descuento real (equipos neutros)`,
      ok: roles.every((r) => Math.abs(r.diferencia) <= MARGEN),
      detalle: ROLES.map((rol) => textoRol(neutros.muestras, rol)).join(' · '),
    },
    {
      id: '018/SC-004',
      descripcion: `Incansable, Fatigado e Indisciplinado: energía media al 90' a ±${MARGEN} de su curva con el descuento real`,
      ok: rasgos.every((r) => Math.abs(r.diferencia) <= MARGEN),
      detalle: rasgos
        .map((r) => `${r.rasgo} ${num(r.medida)} (ref. ${num(r.referencia)}, ${conSigno(r.diferencia)}; ${ROLES.map((rol) => textoRol(r.muestras, rol)).join(', ')})`)
        .join(' · '),
    },
    {
      id: '018/SC-004b',
      descripcion: "Motivador: sus compañeros de campo llegan al 90' con más energía que sin él",
      ok: mayorSignificativo(companeros, sinMotivador),
      detalle: `con Motivador ${num(media(companeros))} · sin él ${num(media(sinMotivador))} (${conSigno(media(companeros) - media(sinMotivador))})`,
    },
    {
      id: '018/SC-005',
      descripcion: "Presión alta: el mismo equipo llega al 90' con menos energía que con Bloque medio (diferencia significativa)",
      ok: mayorSignificativo(bloqueMedio, presionAlta),
      detalle: `Bloque medio ${num(media(bloqueMedio))} · Presión alta ${num(media(presionAlta))} (coste ${num(costePresion)} puntos)`,
    },
  ];
}

/** Efecto en la diferencia de goles de la 8.0.0 y su error estándar (`linea-base-8.0.0.md`, 1000 partidos). */
const EFECTO_800 = { catenaccio: { valor: -0.65, error: 0.064 }, bandasVertical: { valor: 0.13, error: 0.071 } };

/**
 * SC-006: las tácticas modificadas frente a la neutra, con el equipo y las semillas de `linea-base`, en la dirección de
 * la US2. «Medible» = más de 2 errores estándar (contra la 8.0.0, sumando el error de las dos medidas); Bandas + Vertical,
 * solo en la dirección (T062).
 */
export function comprobarSC006(n: number, semilla: number): Comprobacion {
  const base = equipoSintetico({ semilla: 'linea-base' });
  const rival = clonar(base, 'neutro');
  const jugar = (t: Partial<Tactica>) => serie({ ...base, tactica: { ...base.tactica, ...t } }, rival, n, semilla, 'linea-base');
  const neutra = jugar({});
  const catenaccio = jugar({ alturaBloque: 'catenaccio' });
  const individual = jugar({ sistemaDefensivo: 'individual' });
  const bandasVertical = jugar({ estiloConBalon: 'bandas', juegoVertical: true });
  const vertical = jugar({ juegoVertical: true });
  const adelantada = jugar({ lineaAdelantada: true });

  const dif = (r: ResultadoSerie) => r.golesA.map((g, i) => g - r.golesB[i]!);
  const efecto = (r: ResultadoSerie) => ({ valor: media(dif(r)) - media(dif(neutra)), error: Math.hypot(errorEstandar(dif(r)), errorEstandar(dif(neutra))) });
  /** `e` está por encima (signo 1) o por debajo (−1) del efecto de la 8.0.0, de forma medible. */
  const frente800 = (e: { valor: number; error: number }, de800: { valor: number; error: number }, signo: 1 | -1) => signo * (e.valor - de800.valor) > 2 * Math.hypot(e.error, de800.error);
  const fdj = (r: ResultadoSerie) => r.estadisticasA.map((s) => s.fuerasDeJuegoProvocados);

  const efCatenaccio = efecto(catenaccio);
  const efBandasVertical = efecto(bandasVertical);
  const efVertical = efecto(vertical);
  const partes = [
    { nombre: 'Catenaccio: menos GC que la neutra', ok: mayorSignificativo(neutra.golesB, catenaccio.golesB), detalle: `GC ${num2(media(catenaccio.golesB))} vs ${num2(media(neutra.golesB))}` },
    { nombre: 'Catenaccio: efecto en dif. mayor que en la 8.0.0', ok: frente800(efCatenaccio, EFECTO_800.catenaccio, 1), detalle: `${conSigno2(efCatenaccio.valor)} vs ${conSigno2(EFECTO_800.catenaccio.valor)}` },
    { nombre: 'Individual: menos GC que la neutra', ok: mayorSignificativo(neutra.golesB, individual.golesB), detalle: `GC ${num2(media(individual.golesB))} vs ${num2(media(neutra.golesB))}` },
    // Solo la dirección (T062): bajar de forma medible pediría dejarla por debajo de la neutra (2 e. e. ≈ 0,17 con 1.000).
    {
      nombre: 'Bandas + Vertical: efecto en dif. no mayor que en la 8.0.0 ni que Vertical sola',
      ok: efBandasVertical.valor <= EFECTO_800.bandasVertical.valor && efBandasVertical.valor <= efVertical.valor,
      detalle: `${conSigno2(efBandasVertical.valor)} vs ${conSigno2(EFECTO_800.bandasVertical.valor)} y Vertical ${conSigno2(efVertical.valor)}`,
    },
    { nombre: 'Línea adelantada: más fueras de juego provocados', ok: mayorSignificativo(fdj(adelantada), fdj(neutra)), detalle: `${num2(media(fdj(adelantada)))} vs ${num2(media(fdj(neutra)))}` },
  ];
  return {
    id: '018/SC-006',
    descripcion: 'Tácticas modificadas: efecto en la dirección de la US2 frente a la neutra y a la 8.0.0 (001/SC-006 se comprueba aparte)',
    ok: partes.every((p) => p.ok),
    detalle: partes.map((p) => `${p.ok ? '✔' : '✘'} ${p.nombre} (${p.detalle})`).join(' · '),
  };
}

const num2 = (x: number) => x.toFixed(2);
const conSigno2 = (x: number) => `${x > 0 ? '+' : ''}${num2(x)}`;

export function gruposMotor018(): GrupoComprobaciones[] {
  return [
    { ids: ['018/SC-003', '018/SC-004', '018/SC-004b', '018/SC-005'], serie: 'sintetica', ejecutar: (o) => comprobacionesMotor018(o.n, o.seed) },
    { ids: ['018/SC-006'], serie: 'sintetica', ejecutar: (o) => [comprobarSC006(o.n, o.seed)] },
  ];
}
