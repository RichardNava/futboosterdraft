/**
 * Estado del equipo propio durante el partido, derivado en el cliente con lo que ya se ha visto (spec 003,
 * research R17): la alineación de `partido.inicio`, los eventos reproducidos hasta el tick actual y las
 * `partido.decision_aplicada` propias. No usa nada posterior al tick de reproducción, así que la gestión del
 * equipo no adelanta información del búfer de la 2D.
 */
import type { FormacionId, Lanzadores, Tactica } from '@fbd/domain';
import type { CartaResumen } from './CartaJugador';

export interface AlineacionPartido {
  formacion: FormacionId;
  titulares: { casillaId: string; jugador: CartaResumen; ancla?: { x: number; y: number } }[];
  suplentes: CartaResumen[];
  tactica: Tactica;
  colocacion?: { jugadorId: number; x: number; y: number }[];
  lanzadores?: Lanzadores;
}

export interface EventoEquipo {
  tick: number;
  equipo: string;
  tipo: string;
  jugadores: { rol: string; jugadorId: number }[];
  datos?: Record<string, unknown>;
}

export interface DecisionAplicada {
  aplicadaEnTick: number;
  tipo: string;
  datos: Record<string, unknown>;
}

export interface EstadoEquipo {
  formacion: FormacionId;
  /** Casilla → jugador en el campo. */
  asignacion: Record<string, number | undefined>;
  /** Colocación libre de los titulares que la tienen (unidades de campo). */
  puntos: Record<number, { x: number; y: number }>;
  /** Suplentes disponibles (sin los que ya entraron, los sustituidos ni los expulsados). */
  banquillo: number[];
  tactica: Tactica;
  lanzadores: Lanzadores | null;
  sustitucionesUsadas: number;
  sustitucionesRestantes: number;
  amarillas: Map<number, number>;
  lesionados: Set<number>;
  expulsados: Set<number>;
  /** Ya jugaron y salieron: no pueden volver a entrar. */
  sustituidos: Set<number>;
}

/** Sustituciones por partido (5) y una más en la prórroga, como el motor (`maxSustituciones`). */
export const MAX_SUSTITUCIONES = 5;

export function estadoEquipoEnPartido(
  alineacion: AlineacionPartido,
  eventos: readonly EventoEquipo[],
  lado: 'local' | 'visitante',
  tickActual: number,
  decisiones: readonly DecisionAplicada[] = [],
  prorroga = false,
): EstadoEquipo {
  const asignacion: Record<string, number | undefined> = Object.fromEntries(alineacion.titulares.map((t) => [t.casillaId, t.jugador.id]));
  const puntos: Record<number, { x: number; y: number }> = Object.fromEntries(
    (alineacion.colocacion ?? alineacion.titulares.flatMap((t) => (t.ancla ? [{ jugadorId: t.jugador.id, ...t.ancla }] : []))).map((c) => [c.jugadorId, { x: c.x, y: c.y }]),
  );
  const estado: EstadoEquipo = {
    formacion: alineacion.formacion,
    asignacion,
    puntos,
    banquillo: alineacion.suplentes.map((j) => j.id),
    tactica: alineacion.tactica,
    lanzadores: alineacion.lanzadores ?? null,
    sustitucionesUsadas: 0,
    sustitucionesRestantes: 0,
    amarillas: new Map(),
    lesionados: new Set(),
    expulsados: new Set(),
    sustituidos: new Set(),
  };
  /** Casilla que dejó libre un jugador que salió sin cambio (expulsado o lesionado). */
  const libres = new Map<number, string>();
  const casillaDe = (id: number) => Object.entries(estado.asignacion).find(([, j]) => j === id)?.[0];
  const quitarDelCampo = (id: number) => {
    const c = casillaDe(id);
    if (c) {
      estado.asignacion[c] = undefined;
      libres.set(id, c);
    }
    delete estado.puntos[id];
  };

  // Eventos y decisiones propias, en orden de tick, hasta lo que se está viendo.
  type Paso = { tick: number; orden: number; aplicar: () => void };
  const pasos: Paso[] = [];
  eventos.forEach((e, i) => {
    if (e.equipo !== lado || e.tick > tickActual) return;
    const id = (rol: string) => e.jugadores.find((j) => j.rol === rol)?.jugadorId;
    pasos.push({
      tick: e.tick,
      orden: i,
      aplicar: () => {
        if (e.tipo === 'sustitucion') {
          const sale = id('sale')!;
          const entra = id('entra')!;
          const casilla = casillaDe(sale) ?? libres.get(sale);
          const punto = estado.puntos[sale];
          if (casillaDe(sale)) estado.asignacion[casillaDe(sale)!] = undefined;
          delete estado.puntos[sale];
          if (casilla) estado.asignacion[casilla] = entra;
          if (punto) estado.puntos[entra] = punto;
          estado.banquillo = estado.banquillo.filter((x) => x !== entra);
          estado.sustituidos.add(sale);
          estado.sustitucionesUsadas++;
        } else if (e.tipo === 'roja') {
          const autor = id('autor')!;
          estado.expulsados.add(autor);
          quitarDelCampo(autor);
        } else if (e.tipo === 'lesion') {
          const autor = id('autor')!;
          estado.lesionados.add(autor);
          quitarDelCampo(autor);
        } else if (e.tipo === 'amarilla') {
          const autor = id('autor')!;
          estado.amarillas.set(autor, (estado.amarillas.get(autor) ?? 0) + 1);
        }
      },
    });
  });
  decisiones.forEach((d, i) => {
    if (d.aplicadaEnTick > tickActual || d.tipo === 'sustitucion') return;
    pasos.push({
      tick: d.aplicadaEnTick,
      orden: 100_000 + i,
      aplicar: () => {
        const datos = d.datos as {
          formacion?: FormacionId;
          asignacion?: { casillaId: string; jugadorId: number }[];
          colocacion?: { jugadorId: number; x: number; y: number }[];
          tactica?: Tactica;
          lanzadores?: Lanzadores;
        };
        if ((d.tipo === 'formacion' || d.tipo === 'recolocacion') && datos.asignacion) {
          if (datos.formacion) estado.formacion = datos.formacion;
          estado.asignacion = Object.fromEntries(datos.asignacion.map((a) => [a.casillaId, a.jugadorId]));
          estado.puntos = Object.fromEntries((datos.colocacion ?? []).map((c) => [c.jugadorId, { x: c.x, y: c.y }]));
        } else if (d.tipo === 'formacion' && datos.formacion) {
          estado.formacion = datos.formacion;
          estado.puntos = {};
        } else if (d.tipo === 'tactica' && datos.tactica) estado.tactica = datos.tactica;
        else if (d.tipo === 'lanzadores' && datos.lanzadores) estado.lanzadores = datos.lanzadores;
      },
    });
  });
  pasos.sort((a, b) => a.tick - b.tick || a.orden - b.orden).forEach((p) => p.aplicar());

  estado.banquillo = estado.banquillo.filter((id) => !estado.sustituidos.has(id) && !estado.expulsados.has(id));
  estado.sustitucionesRestantes = Math.max(0, MAX_SUSTITUCIONES + (prorroga ? 1 : 0) - estado.sustitucionesUsadas);
  return estado;
}
