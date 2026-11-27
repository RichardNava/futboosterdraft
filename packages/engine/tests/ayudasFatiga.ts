/** Recorrido sintético de la energía, sin simular el partido (spec 018, pruebas exactas de SC-002). */
import type { ParametrosMotor } from '@fbd/domain';
import { acumularCansancio, gastarAccion, recuperarEnPausa } from '../src/modificadores/cansancio';
import type { EstadoMotor } from '../src/index';

/** Referencia y pesos a 1: una acción por minuto de tramo es exactamente la referencia de cualquier rol. */
export function accionesUnitarias(x: ParametrosMotor): void {
  x.fatiga.referenciaAcciones = { porteria: 1, defensa: 1, medio: 1, ataque: 1 };
  x.fatiga.pesosAccion = { sprint: 1, presion: 1, regate: 1, duelo: 1 };
}

const PARTES = [
  { parte: 1, desde: 0, duracion: 2700, pausa: 'descanso' },
  { parte: 2, desde: 45, duracion: 2700, pausa: 'preProrroga' },
  { parte: 3, desde: 90, duracion: 900, pausa: 'descansoProrroga' },
  { parte: 4, desde: 105, duracion: 900, pausa: null },
] as const;

/**
 * Lleva el partido hasta `minuto`, tick a tick, con las recuperaciones de las pausas ya superadas. Con `accionesPorMinuto`,
 * cada jugador en el campo hace esa cantidad de duelos por minuto (solo gastan dentro de su tramo).
 */
export function jugarHasta(e: EstadoMotor, minuto: number, accionesPorMinuto = 0): void {
  for (const { parte, desde, duracion, pausa } of PARTES) {
    if (minuto <= desde) return;
    const ticks = Math.min(duracion, (minuto - desde) * 60);
    for (let s = 1; s <= ticks; s++) {
      e.reloj = { parte, segundosEnParte: s, paradas: 0, descuento: null };
      for (const equipo of [e.equipos.local, e.equipos.visitante]) {
        acumularCansancio(e, equipo, 1);
        if (accionesPorMinuto > 0 && s % 60 === 0) {
          for (const j of equipo.jugadores) if (j.enCampo) for (let a = 0; a < accionesPorMinuto; a++) gastarAccion(e, equipo, j, 'duelo');
        }
      }
    }
    if (pausa && minuto > desde + duracion / 60) recuperarEnPausa(e, pausa);
  }
}
