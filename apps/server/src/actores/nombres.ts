/**
 * Nombres de equipo para los NPC (ficticios).
 */
import { claveNombre, Rng, type Semilla } from '@fbd/domain';

const PREFIJOS = ['Atlético', 'Real', 'Unión', 'Deportivo', 'Club', 'Racing', 'Sporting', 'Celta', 'Olímpico', 'Juventud'];
const NUCLEOS = ['Bruma', 'Sierra Alta', 'Puerto Viejo', 'Los Álamos', 'Valle Claro', 'Mareas', 'Cumbre', 'Ribera', 'Faro', 'Encinar', 'Brisa', 'Pedregal'];

export function nombresNPC(cantidad: number, semilla: Semilla, usados: ReadonlySet<string> = new Set()): string[] {
  const rng = new Rng(semilla);
  const nombres: string[] = [];
  // Sin distinguir mayúsculas, como el índice único `(partida_id, lower(nombre_equipo))` (spec 003, FR-043).
  const ocupados = new Set([...usados].map(claveNombre));
  while (nombres.length < cantidad) {
    let nombre = `${rng.elegir(PREFIJOS)} ${rng.elegir(NUCLEOS)}`;
    if (ocupados.has(claveNombre(nombre))) nombre = `${nombre} ${nombres.length + 2}`;
    if (ocupados.has(claveNombre(nombre))) continue;
    ocupados.add(claveNombre(nombre));
    nombres.push(nombre);
  }
  return nombres;
}
