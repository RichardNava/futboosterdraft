/**
 * Equivalencia hilo / en proceso (spec 009, SC-004): con la misma semilla, cada cálculo da exactamente lo mismo
 * en un hilo de trabajo que en el hilo principal. `MUESTRA_EQUIVALENCIA=1000` para la muestra de SC-004.
 */
import { parametrosActuales, semillaDesdeTexto, type NivelDecisiones } from '@fbd/domain';
import { crearPartido, type EquipoPartido, type EstadoMotor } from '@fbd/engine';
import { afterAll, describe, expect, it } from 'vitest';
import { equipoSintetico } from '../../../../tools/balance/src/equipos';
import { crearCalculo, type Calculo } from '../../src/simulacion/grupo';

const N = Number(process.env.MUESTRA_EQUIVALENCIA ?? 50);
const enProceso = crearCalculo(0);
const enHilos = crearCalculo(2);
afterAll(() => enHilos.cerrar());

function partido(i: number): { estado: EstadoMotor; local: EquipoPartido; visitante: EquipoPartido } {
  const parametros = parametrosActuales();
  const media = 70 + (i % 15);
  const local = equipoSintetico({ participanteId: 'local', media, semilla: `local-${i}` });
  const visitante = equipoSintetico({ participanteId: 'visitante', media: 155 - media, formacion: '4-3-3', semilla: `visitante-${i}` });
  const estado = crearPartido({ version: parametros.version, parametros, semilla: semillaDesdeTexto(`equivalencia-${i}`), eliminatoria: i % 3 === 0, local, visitante });
  return { estado, local, visitante };
}

const plantillaDe = (e: EquipoPartido) => [...e.titulares.map((t) => t.jugador), ...e.suplentes];

const NIVELES: NivelDecisiones[] = ['amateur', 'intermedio', 'avanzado'];
const ejecutar = (c: Calculo, nombre: string, args: readonly unknown[]) => (c.ejecutar as unknown as (n: string, a: readonly unknown[], p: 'npc') => Promise<unknown>)(nombre, args, 'npc');

describe('equivalencia hilo / en proceso', () => {
  it(`${N} partidos dan lo mismo en los dos modos`, { timeout: 60_000 + N * 3_000 }, async () => {
    for (let i = 0; i < N; i++) {
      const { estado, local, visitante } = partido(i);
      const nivel = NIVELES[i % NIVELES.length]!;
      const niveles = { local: nivel, visitante: 'intermedio' as const };
      const semilla = semillaDesdeTexto(`s-${i}`);
      const plantilla = plantillaDe(local);
      const rival = plantillaDe(visitante);
      const casos: [string, unknown[]][] = [
        ['jugarHastaElFinal', [estado, niveles, semilla]],
        ['resolverResto', [estado, niveles, semilla]],
        ['resolverRestoPorTramos', [estado, niveles, semilla]],
        ['avanzar', [estado, 'parte']],
        ['decidirAlineacion', [nivel, plantilla, new Set([plantilla[i % plantilla.length]!.id]), rival, semilla, { parametros: estado.parametros }]],
      ];
      for (const [nombre, args] of casos) {
        const [a, b] = await Promise.all([ejecutar(enProceso, nombre, args), ejecutar(enHilos, nombre, args)]);
        expect(b, `${nombre} #${i}`).toEqual(a);
      }
    }
  });
});
