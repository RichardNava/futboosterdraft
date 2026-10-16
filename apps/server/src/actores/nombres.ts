/**
 * Nombres de equipo para los NPC (ficticios).
 */
import { Rng, type Semilla } from '@fbd/domain';

const PREFIJOS = ['Atlético', 'Real', 'Unión', 'Deportivo', 'Club', 'Racing', 'Sporting', 'Celta', 'Olímpico', 'Juventud'];
const NUCLEOS = ['Bruma', 'Sierra Alta', 'Puerto Viejo', 'Los Álamos', 'Valle Claro', 'Mareas', 'Cumbre', 'Ribera', 'Faro', 'Encinar', 'Brisa', 'Pedregal'];

export function nombresNPC(cantidad: number, semilla: Semilla, usados: ReadonlySet<string> = new Set()): string[] {
  const rng = new Rng(semilla);
  const nombres: string[] = [];
  const ocupados = new Set(usados);
  while (nombres.length < cantidad) {
    let nombre = `${rng.elegir(PREFIJOS)} ${rng.elegir(NUCLEOS)}`;
    if (ocupados.has(nombre)) nombre = `${nombre} ${nombres.length + 2}`;
    if (ocupados.has(nombre)) continue;
    ocupados.add(nombre);
    nombres.push(nombre);
  }
  return nombres;
}
