/**
 * Series del modo Duelo de jugadores (spec 005, T061; SC-010; research R9).
 *
 * Por torneo, 8 NPC avanzados draftan la colección Core y cada uno elige su once en la formación común con
 * `decidirAlineacionDuelos`; se juegan los 28 cruces entre ellos con el Estado de forma activado y desactivado. Se mide:
 * - duelos nulos: < 2 %;
 * - victorias del equipo con mayor suma de medias: entre el 60 % y el 85 %;
 * - duelos remontados con el Estado de forma cuya diferencia sin él pasaba de 4 puntos: 0;
 * - sin el Estado de forma, duelos ganados por el jugador de menor puntuación: 0.
 */
import { decidirAlineacionDuelos, elegirCarta } from '@fbd/ai';
import { CONFIG_DUELOS_POR_DEFECTO, derivarSemilla, parametrosActuales, resolverCruce, type Jugador, type OnceDuelos } from '@fbd/domain';
import type { GrupoComprobaciones } from '../cli';
import { draftMesa } from './npc';
import type { Comprobacion } from './partido';

function once(pid: string, plantilla: readonly Jugador[]): { once: OnceDuelos; sumaMedias: number } {
  const p = parametrosActuales();
  const a = decidirAlineacionDuelos(plantilla, CONFIG_DUELOS_POR_DEFECTO.formacion, p);
  const porId = new Map(plantilla.map((j) => [j.id, j]));
  return {
    once: { participanteId: pid, titulares: Object.fromEntries(a.titulares.map((t) => [t.casillaId, porId.get(t.jugadorId)!])) },
    sumaMedias: a.titulares.reduce((s, t) => s + porId.get(t.jugadorId)!.media, 0),
  };
}

export function comprobarSC010Duelos(torneos: number, semilla: number): Comprobacion {
  const p = parametrosActuales();
  const participantes = Array.from({ length: 8 }, (_, i) => `npc${i + 1}`);
  let cruces = 0;
  let duelos = 0;
  let nulos = 0;
  let ganaMejor = 0;
  let decididos = 0;
  let remontadas = 0;
  let ganaPeorSinForma = 0;
  for (let t = 0; t < torneos; t++) {
    const raiz = `duelos:${semilla}:${t}`;
    const equipos = draftMesa(raiz, participantes, (pid, sobre, parcial, ronda, turno) =>
      elegirCarta('avanzado', sobre, parcial, ronda, turno, derivarSemilla(raiz, `${pid}:${ronda}:${turno}`), { participantes: participantes.length, parametros: p }),
    );
    const onces = participantes.map((pid) => once(pid, equipos[pid]!));
    for (let a = 0; a < onces.length; a++) {
      for (let b = a + 1; b < onces.length; b++) {
        const local = onces[a]!;
        const visitante = onces[b]!;
        const s = derivarSemilla(raiz, `cruce:${a}:${b}`);
        const con = resolverCruce(local.once, visitante.once, { formacion: CONFIG_DUELOS_POR_DEFECTO.formacion, estadoForma: true }, s, p);
        const sin = resolverCruce(local.once, visitante.once, { formacion: CONFIG_DUELOS_POR_DEFECTO.formacion, estadoForma: false }, s, p);
        cruces++;
        for (const [i, d] of con.duelos.entries()) {
          duelos++;
          if (d.ganador === 'nulo') nulos++;
          const base = sin.duelos[i]!;
          const diferencia = base.local.puntuacion - base.visitante.puntuacion;
          if (Math.abs(diferencia) > 400 && d.ganador !== (diferencia > 0 ? 'local' : 'visitante')) remontadas++;
          if (base.ganador !== 'nulo' && base.ganador !== (diferencia > 0 ? 'local' : 'visitante')) ganaPeorSinForma++;
        }
        if (local.sumaMedias !== visitante.sumaMedias) {
          decididos++;
          const mejor = local.sumaMedias > visitante.sumaMedias ? 'local' : 'visitante';
          if (con.ganador === mejor) ganaMejor++;
        }
      }
    }
  }
  const pctNulos = (100 * nulos) / Math.max(1, duelos);
  const pctMejor = (100 * ganaMejor) / Math.max(1, decididos);
  const ok = pctNulos < 2 && pctMejor >= 60 && pctMejor <= 85 && remontadas === 0 && ganaPeorSinForma === 0;
  return {
    id: '005/SC-010',
    descripcion: 'Duelos: < 2 % nulos; el de mayor suma de medias gana el 60–85 %; 0 remontadas de más de 4 puntos; sin Estado de forma, el peor nunca gana',
    ok,
    detalle: `${cruces} cruces (${duelos} duelos): nulos ${pctNulos.toFixed(2)} % · gana el de mayor suma ${pctMejor.toFixed(1)} % · remontadas > 4 puntos ${remontadas} · sin Estado de forma, gana el peor ${ganaPeorSinForma}`,
  };
}

export function gruposDuelos(): GrupoComprobaciones[] {
  return [{ ids: ['005/SC-010'], serie: 'npc', ejecutar: (o) => [comprobarSC010Duelos(o.torneos || 36, o.seed)] }];
}
