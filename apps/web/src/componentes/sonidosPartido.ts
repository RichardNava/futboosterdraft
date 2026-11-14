/**
 * Sonido de cada evento visto en la 2D (spec 012, FR-001 a FR-003; contracts/ui.md «Sonidos»): pitidos al empezar
 * cada parte, en el descanso y al final; el público según quién marca; silbato y «oooh» con las tarjetas.
 */
import type { Efecto } from '../sonido/sonido';
import type { EventoVista } from './ResumenEventos';

/**
 * `faseTras`: fase con la que acaba el tramo del evento (distingue el final de los 90 con prórroga del final del
 * partido). `miLado`: el del espectador; sin lado (no juega), cuenta como propio.
 */
export function efectoDeEvento(e: EventoVista, miLado: 'local' | 'visitante' | null, faseTras?: string): Efecto | null {
  switch (e.tipo) {
    case 'inicio_tramo':
      return 'pitidoInicio';
    case 'fin_tramo': {
      const parte = e.datos.parte;
      if (parte === 1 || parte === 3 || (parte === 2 && faseTras === 'pre_prorroga')) return 'pitidoDescanso';
      return 'pitidoFinal';
    }
    case 'gol':
      // En propia puerta, el evento ya es del equipo que suma el gol.
      return miLado === null || e.equipo === miLado ? 'golPropio' : 'golRival';
    // Spec 014 (FR-013): el árbitro pita el fuera de juego.
    case 'fuera_de_juego':
      return 'pitidoDescanso';
    case 'amarilla':
      return 'tarjetaAmarilla';
    case 'roja':
      return 'tarjetaRoja';
    default:
      return null;
  }
}

/** Nombre del goleador para la celebración («Pérez» o «Ramos (p. p.)»). */
export function goleadorDe(e: EventoVista, nombre: (id: number) => string): string {
  const autor = e.jugadores.find((j) => j.rol === 'autor') ?? e.jugadores[0];
  if (!autor) return '';
  return `${nombre(autor.jugadorId)}${e.datos.tipo === 'propia' ? ' (p. p.)' : ''}`;
}
