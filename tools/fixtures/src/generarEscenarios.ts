/**
 * Busca semillas que provoquen cada evento y escribe los escenarios en `tools/fixtures/escenarios/`.
 *
 * Uso: pnpm --filter @fbd/fixtures generar-escenarios
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { semillaDesdeTexto } from '@fbd/domain';
import type { EventoPartido } from '@fbd/engine';
import { cumpleEscenario, entradaEscenario, jugar, plantillasEscenario, VERSION_ESCENARIOS, type Escenario, type NombreEscenario } from './escenarios';
import { generarCore } from './generarCore';

const MAX_INTENTOS = 20_000;

const DESCRIPCIONES: Record<NombreEscenario, string> = {
  roja: 'Un jugador ve una tarjeta roja: queda sancionado 1 partido.',
  'tres-amarillas': 'El mismo jugador ve una amarilla en cada uno de los tres partidos: en liga, la tercera acumulada supone 1 partido de sanción.',
  'lesion-grave': 'Un jugador sufre una lesión grave (baja de varios partidos).',
  'lesion-larga': 'Un jugador sufre una lesión de larga duración (5 partidos; muy poco probable).',
  'empate-eliminatoria': 'Partido de eliminatoria que acaba en empate tras la prórroga y se decide en la tanda de penaltis.',
};

const autor = (ev: EventoPartido) => ev.jugadores.find((j) => j.rol === 'autor')?.jugadorId;

export function generarEscenarios(): Escenario[] {
  const core = generarCore();
  const plantillas = plantillasEscenario(core);
  const base = {
    version: VERSION_ESCENARIOS,
    local: { participanteId: 'local', jugadores: plantillas.local },
    visitante: { participanteId: 'visitante', jugadores: plantillas.visitante },
  };
  const semilla = (nombre: string, i: number) => semillaDesdeTexto(`escenario:${nombre}:${i}`);

  /** Primera semilla cuyo partido cumple `condicion`; devuelve la semilla y lo esperado. */
  function buscar(nombre: NombreEscenario, eliminatoria: boolean, condicion: (eventos: EventoPartido[], penaltis: boolean) => Escenario['esperado'] | null): Escenario {
    for (let i = 0; i < MAX_INTENTOS; i++) {
      const s = semilla(nombre, i);
      const { eventos, marcador } = jugar(entradaEscenario({ ...base, eliminatoria }, s, core));
      const esperado = condicion(eventos, marcador.penaltis !== undefined);
      if (esperado) return { nombre, descripcion: DESCRIPCIONES[nombre], ...base, eliminatoria, semillas: [s], esperado };
    }
    throw new Error(`No se encontró semilla para "${nombre}" en ${MAX_INTENTOS} intentos`);
  }

  const lesion = (gravedad: string) => (eventos: EventoPartido[]) => {
    const ev = eventos.find((e) => e.tipo === 'lesion' && e.datos.gravedad === gravedad);
    return ev ? { jugadorId: autor(ev), lado: ev.equipo } : null;
  };

  const escenarios: Escenario[] = [
    buscar('roja', false, (eventos) => {
      const ev = eventos.find((e) => e.tipo === 'roja');
      return ev ? { jugadorId: autor(ev), lado: ev.equipo } : null;
    }),
    buscar('lesion-grave', false, lesion('grave')),
    buscar('lesion-larga', false, lesion('larga')),
    buscar('empate-eliminatoria', true, (_e, penaltis) => (penaltis ? {} : null)),
  ];

  // Tres amarillas: el primer jugador que ve exactamente una amarilla (sin roja ni lesión) en tres partidos.
  const vistas = new Map<number, string[]>();
  let tres: Escenario | null = null;
  for (let i = 0; i < MAX_INTENTOS && !tres; i++) {
    const s = semilla('tres-amarillas', i);
    const { eventos } = jugar(entradaEscenario({ ...base, eliminatoria: false }, s, core));
    const fuera = new Set(eventos.filter((e) => e.tipo === 'roja' || e.tipo === 'lesion').map(autor));
    const cuenta = new Map<number, number>();
    for (const e of eventos) if (e.tipo === 'amarilla') cuenta.set(autor(e)!, (cuenta.get(autor(e)!) ?? 0) + 1);
    for (const [id, n] of cuenta) {
      if (n !== 1 || fuera.has(id)) continue;
      const semillas = [...(vistas.get(id) ?? []), s];
      vistas.set(id, semillas);
      if (semillas.length === 3) {
        tres = { nombre: 'tres-amarillas', descripcion: DESCRIPCIONES['tres-amarillas'], ...base, eliminatoria: false, semillas, esperado: { jugadorId: id } };
        break;
      }
    }
  }
  if (!tres) throw new Error('No se encontraron tres partidos con amarilla al mismo jugador');
  escenarios.splice(1, 0, tres);

  for (const e of escenarios) if (!cumpleEscenario(e, core)) throw new Error(`El escenario "${e.nombre}" no se reproduce`);
  return escenarios;
}

function principal(): void {
  const carpeta = resolve(dirname(fileURLToPath(import.meta.url)), '../escenarios');
  mkdirSync(carpeta, { recursive: true });
  for (const e of generarEscenarios()) {
    writeFileSync(resolve(carpeta, `${e.nombre}.json`), JSON.stringify(e, null, 2) + '\n', 'utf-8');
    console.log(`${e.nombre}: ${e.semillas.length} semilla(s)`);
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('fixtures/src/generarEscenarios.ts')) principal();
