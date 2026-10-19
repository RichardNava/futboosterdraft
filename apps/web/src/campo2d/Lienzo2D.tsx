import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { firmaPatron } from '@fbd/domain';
import type { Inicio, Marcador } from '../pantallas/PartidoRapido';
import { posicionesEn, type Fotograma } from './interpolacion';
import { ANCHO, dibujar, LARGO, type JugadorDibujo, type Lanzamiento } from './renderizador';
import type { RelojReproduccion } from './relojReproduccion';
import { TICKS_LANZAMIENTO } from './relojReproduccion';

/** Acción con balón visible (research R4). */
export interface AccionVista {
  tipo: string;
  inicioTick: number;
  finTick: number;
  de: number;
  a?: number;
  exito: boolean;
}

/** Un lanzamiento de la tanda (evento `tanda_lanzamiento`). */
export interface LanzamientoVista {
  tick: number;
  lado: 'local' | 'visitante';
  lanzadorId: number;
  gol: boolean;
}

/** Lo que se reproduce: se amplía según llegan los tramos (se lee en cada fotograma de animación). */
export interface DatosReproduccion {
  fotogramas: Fotograma[];
  acciones: AccionVista[];
  tanda: LanzamientoVista[];
}

/** Lo que cambia con el estado de React: se lee en cada fotograma de animación. */
export interface Superposicion {
  marcador: Marcador;
  minuto: string;
  aviso: string | null;
}

const ETIQUETA_ACCION: Record<string, string> = {
  pase_corto: 'Pase',
  pase_largo: 'Pase largo',
  pase_espacio: 'Pase al espacio',
  conduccion: 'Conducción',
  regate: 'Regate',
  centro: 'Centro',
  tiro: 'Tiro',
  despeje: 'Despeje',
  saque: 'Saque',
};

/** Acción en curso en el tick `t` (las acciones van ordenadas y no se solapan). */
export function accionEn(acciones: readonly AccionVista[], t: number): AccionVista | null {
  let bajo = 0;
  let alto = acciones.length - 1;
  while (bajo <= alto) {
    const medio = (bajo + alto) >> 1;
    const a = acciones[medio]!;
    if (t < a.inicioTick) alto = medio - 1;
    else if (t > a.finTick) bajo = medio + 1;
    else return a;
  }
  return null;
}

/** Jugadores del partido con su lado, dorsal y nombre corto. */
export function jugadoresDe(inicio: Inicio): Map<number, JugadorDibujo> {
  const mapa = new Map<number, JugadorDibujo>();
  for (const lado of ['local', 'visitante'] as const) {
    const a = inicio.alineaciones[lado];
    for (const j of [...a.titulares.map((t) => t.jugador), ...a.suplentes]) {
      mapa.set(j.id, { lado, dorsal: inicio.dorsales[j.id] ?? null, nombre: j.apellidos.split(' ')[0] ?? j.nombre });
    }
  }
  return mapa;
}

/** Orden de los jugadores en los fotogramas v2 (el de `partido.inicio`, o el de las alineaciones). */
export function ordenDe(inicio: Inicio): number[] {
  if (inicio.ordenJugadores) return inicio.ordenJugadores;
  return (['local', 'visitante'] as const).flatMap((lado) => {
    const a = inicio.alineaciones[lado];
    return [...a.titulares.map((t) => t.jugador.id), ...a.suplentes.map((j) => j.id)];
  });
}

interface Props {
  inicio: Inicio;
  reloj: RelojReproduccion;
  datos: MutableRefObject<DatosReproduccion>;
  superposicion: MutableRefObject<Superposicion>;
  /** Tick que se está mostrando, unas 4 veces por segundo (para el estado de React). */
  alAvanzar: (tick: number) => void;
  etiqueta: string;
  /** Sin rótulos de la acción en curso (movimiento reducido). */
  sinRotulos?: boolean;
}

/**
 * Campo 2D: dibuja a 60 fps la posición interpolada en el tick del reloj de reproducción, con el rótulo de
 * la acción en curso, los avisos y la tanda de penaltis en el propio campo.
 */
export function Lienzo2D({ inicio, reloj, datos, superposicion, alAvanzar, etiqueta, sinRotulos = false }: Props) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const jugadores = useMemo(() => jugadoresDe(inicio), [inicio]);
  const orden = useMemo(() => ordenDe(inicio), [inicio]);
  const porteros = useMemo(
    () => ({
      local: inicio.alineaciones.local.titulares.find((t) => t.casillaId === 'POR')?.jugador.id ?? null,
      visitante: inicio.alineaciones.visitante.titulares.find((t) => t.casillaId === 'POR')?.jugador.id ?? null,
    }),
    [inicio],
  );
  const alAvanzarRef = useRef(alAvanzar);
  alAvanzarRef.current = alAvanzar;

  useEffect(() => {
    let id = 0;
    let ultimaActualizacion = 0;
    const cuadro = (ahora: number) => {
      const canvas = lienzo.current;
      const t = reloj.paso(ahora);
      const d = datos.current;
      const posiciones = posicionesEn(d.fotogramas, orden, t);
      const ctx = canvas?.getContext('2d');
      const ancho = canvas?.clientWidth ?? 0;
      if (canvas && ctx && posiciones && ancho > 0) {
        const ratio = window.devicePixelRatio || 1;
        if (canvas.width !== Math.round(ancho * ratio)) {
          canvas.width = Math.round(ancho * ratio);
          canvas.height = Math.round(((ancho * ANCHO) / LARGO) * ratio);
        }
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        const l = d.tanda.find((x) => t >= x.tick && t < x.tick + TICKS_LANZAMIENTO);
        const tanda: Lanzamiento | null = l
          ? { lanzadorId: l.lanzadorId, porteroId: porteros[l.lado === 'local' ? 'visitante' : 'local'], haciaDerecha: true, gol: l.gol, progreso: (t - l.tick) / TICKS_LANZAMIENTO }
          : null;
        const accion = tanda || sinRotulos ? null : accionEn(d.acciones, t);
        const s = superposicion.current;
        dibujar(ctx, ancho, {
          posiciones,
          jugadores,
          equipaciones: inicio.equipaciones,
          marcador: s.marcador,
          nombres: { local: inicio.local.nombre, visitante: inicio.visitante.nombre },
          minuto: s.minuto,
          aviso: s.aviso,
          accion: accion ? (ETIQUETA_ACCION[accion.tipo] ?? null) : null,
          tanda,
        });
      }
      if (ahora - ultimaActualizacion > 250) {
        ultimaActualizacion = ahora;
        alAvanzarRef.current(t);
      }
      id = requestAnimationFrame(cuadro);
    };
    id = requestAnimationFrame(cuadro);
    // Al volver a la pestaña no se recupera de golpe el tiempo en segundo plano.
    const alVolver = () => reloj.reanudar();
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [reloj, datos, superposicion, jugadores, orden, porteros, inicio, sinRotulos]);

  return (
    <div className="campo-2d" data-patron-local={firmaPatron(inicio.equipaciones.local)} data-patron-visitante={firmaPatron(inicio.equipaciones.visitante)}>
      <canvas ref={lienzo} role="img" aria-label={etiqueta} />
    </div>
  );
}
