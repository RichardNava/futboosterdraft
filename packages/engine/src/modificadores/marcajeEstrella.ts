/**
 * Estrella y marcador con marcaje Individual (spec 018, FR-025 a FR-028, R11). La pareja se fija una sola vez, la primera
 * vez que el equipo juega en Individual. Si deja la táctica se suspende; si sale uno de los dos, termina sin nueva elección.
 */
import { rival, type EquipoEstado, type EstadoMotor, type JugadorEnPartido } from '../estado/estado';
import { lineaDe } from '../espacio/geometria';
import { atributo, mediaEfectiva } from './atributos';

export interface MarcajeEstrella {
  estrellaId: number;
  marcadorId: number;
  /** `false` cuando uno de los dos ha salido del campo: ya no se vuelve a elegir. */
  activo: boolean;
}

const enIndividual = (equipo: EquipoEstado) => equipo.tactica.sistemaDefensivo === 'individual';
const deCampo = (equipo: EquipoEstado) => equipo.jugadores.filter((j) => j.enCampo && j.casillaId !== 'POR');

/** El de mayor `valor`; en empate, el de `id` menor. */
function mejor(js: readonly JugadorEnPartido[], valor: (j: JugadorEnPartido) => number): JugadorEnPartido {
  return js.reduce((a, b) => {
    const d = valor(b) - valor(a);
    return d > 0 || (d === 0 && b.id < a.id) ? b : a;
  });
}

/** Elige la pareja: la estrella rival por media efectiva y el marcador por línea (defensa, medio, ataque) y marcaje. */
export function elegirMarcaje(estado: EstadoMotor, equipo: EquipoEstado): MarcajeEstrella | null {
  const rivales = estado.equipos[rival(equipo.lado)];
  const candidatas = deCampo(rivales);
  const propios = deCampo(equipo);
  if (candidatas.length === 0 || propios.length === 0) return null;
  const estrella = mejor(candidatas, (j) => mediaEfectiva(estado, rivales, j));
  for (const linea of ['defensa', 'medio', 'ataque'] as const) {
    const grupo = propios.filter((j) => lineaDe(equipo, j) === linea);
    if (grupo.length > 0) return { estrellaId: estrella.id, marcadorId: mejor(grupo, (j) => atributo(estado, equipo, j, 'marcaje')).id, activo: true };
  }
  return null;
}

/** Fija la pareja de los equipos que juegan en Individual y aún no la tienen. */
export function fijarMarcajes(estado: EstadoMotor): void {
  for (const equipo of [estado.equipos.local, estado.equipos.visitante]) {
    if (enIndividual(equipo) && equipo.marcajeEstrella === undefined) equipo.marcajeEstrella = elegirMarcaje(estado, equipo);
  }
}

/** Un jugador ha salido del campo: termina el marcaje en el que participe. */
export function terminarMarcaje(estado: EstadoMotor, jugadorId: number): void {
  for (const equipo of [estado.equipos.local, estado.equipos.visitante]) {
    const m = equipo.marcajeEstrella;
    if (m?.activo && (m.estrellaId === jugadorId || m.marcadorId === jugadorId)) m.activo = false;
  }
}

/** Marcaje en curso del equipo: fijado, sin terminar y con la táctica activa. */
export function marcajeVigente(equipo: EquipoEstado): MarcajeEstrella | null {
  const m = equipo.marcajeEstrella;
  return m?.activo && enIndividual(equipo) ? m : null;
}

/** −`malusEstrella` a la estrella cuando se enfrenta a su marcador, en cualquier sentido. */
export function ajusteEstrella(estado: EstadoMotor, atacante: JugadorEnPartido, defensor: JugadorEnPartido | undefined): { atacante: number; defensor: number } {
  const salida = { atacante: 0, defensor: 0 };
  if (!defensor) return salida;
  const malus = estado.parametros.tacticas.individual.malusEstrella;
  for (const equipo of [estado.equipos.local, estado.equipos.visitante]) {
    const m = marcajeVigente(equipo);
    if (!m) continue;
    if (atacante.id === m.estrellaId && defensor.id === m.marcadorId) salida.atacante -= malus;
    if (defensor.id === m.estrellaId && atacante.id === m.marcadorId) salida.defensor -= malus;
  }
  return salida;
}

/** Valores del duelo de desmarque: con Individual, +`bonusMarcaje` al marcaje, y el −5 de la estrella contra su marcador. */
export function valoresDesmarque(
  estado: EstadoMotor,
  atacante: EquipoEstado,
  defensor: EquipoEstado,
  receptor: JugadorEnPartido,
  marcador: JugadorEnPartido,
): { desmarque: number; marcaje: number } {
  const a = ajusteEstrella(estado, receptor, marcador);
  const bonus = enIndividual(defensor) ? estado.parametros.tacticas.individual.bonusMarcaje : 0;
  return { desmarque: atributo(estado, atacante, receptor, 'desmarque') + a.atacante, marcaje: atributo(estado, defensor, marcador, 'marcaje') + bonus + a.defensor };
}
