/**
 * Cierre único de las partidas activas al desplegar el motor 9.0.0 (spec 018, FR-046 a FR-049; contracts/cierre-partidas.md).
 * Los partidos 8.x a medias no se pueden reconstruir con la 9.0.0: las partidas en draft o en torneo pasan a `abandonada`,
 * con aviso en la bandeja y devolución del nivel de rareza. Todo va en una transacción; la marca `cierre_motor_9` en
 * `ajustes` impide repetirlo, y si algo falla no queda ningún cambio y el siguiente arranque lo reintenta.
 */
import { transicion, type EstadoPartida } from '@fbd/domain';
import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { devolverCobroRarezaEn } from '../economia/servicio';
import type { BaseDatos } from '../persistencia/db';
import { ajustes, avisos, participantes, partidas, partidos } from '../persistencia/esquema/index';
import type { Reloj } from '../programador/reloj';

export const MARCA_CIERRE_MOTOR_9 = 'cierre_motor_9';

const PARTIDOS_EN_JUEGO = ['primera_parte', 'descanso', 'segunda_parte', 'pre_prorroga', 'prorroga', 'penaltis'];
const MOTIVO = 'Hemos actualizado el motor de partidos y esta partida se ha cerrado.';
const RESUMEN = 'Los partidos ya jugados conservan su resumen.';

export interface ResultadoCierreMotor9 {
  /** `false` si ya estaba hecho. */
  ejecutado: boolean;
  partidas: number;
  partidosReiniciados: number;
  avisos: number;
  devoluciones: number;
}

export async function cerrarPartidasMotor9(db: BaseDatos, reloj: Reloj): Promise<ResultadoCierreMotor9> {
  return db.transaction(async (tx) => {
    // Dos instancias arrancando a la vez: la segunda espera y encuentra la marca.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${MARCA_CIERRE_MOTOR_9}))`);
    const resultado: ResultadoCierreMotor9 = { ejecutado: false, partidas: 0, partidosReiniciados: 0, avisos: 0, devoluciones: 0 };
    const [hecho] = await tx.select({ clave: ajustes.clave }).from(ajustes).where(eq(ajustes.clave, MARCA_CIERRE_MOTOR_9));
    if (hecho) return resultado;

    const ahora = new Date(reloj.ahora());
    const activas = await tx
      .select({ id: partidas.id, estado: partidas.estado, anfitrionId: partidas.anfitrionId })
      .from(partidas)
      .where(inArray(partidas.estado, ['en_draft', 'en_torneo']))
      .for('update');

    for (const p of activas) {
      await tx
        .update(partidas)
        .set({ estado: transicion(p.estado as EstadoPartida, 'cerrar_version'), actualizadaEn: ahora })
        .where(eq(partidas.id, p.id));
      const devuelto = await devolverCobroRarezaEn(tx, p.id);
      if (devuelto) resultado.devoluciones++;
      // Los `finalizado` no se tocan: conservan su resumen (FR-049). Los `programado` ya no se pueden abrir (`errorAlAbrir`).
      const reiniciados = await tx
        .update(partidos)
        .set({ estado: 'programado', entrada: null, decisiones: [], eventos: [], estadisticas: null, marcador: null, iniciadoEn: null })
        .where(and(eq(partidos.partidaId, p.id), inArray(partidos.estado, PARTIDOS_EN_JUEGO)))
        .returning({ id: partidos.id });
      resultado.partidosReiniciados += reiniciados.length;
      const humanos = await tx
        .selectDistinct({ usuarioId: participantes.usuarioId })
        .from(participantes)
        .where(and(eq(participantes.partidaId, p.id), isNotNull(participantes.usuarioId)));
      // Solo en la bandeja: el correo lo envía `ServicioAvisos`, que aún no existe en este punto del arranque.
      if (humanos.length) {
        await tx.insert(avisos).values(
          humanos.map((h) => ({
            usuarioId: h.usuarioId!,
            tipo: 'partida_cerrada',
            partidaId: p.id,
            texto: devuelto && h.usuarioId === p.anfitrionId ? `${MOTIVO} Te hemos devuelto los ${devuelto} fragmentos del nivel de rareza. ${RESUMEN}` : `${MOTIVO} ${RESUMEN}`,
            creadoEn: ahora,
          })),
        );
      }
      resultado.avisos += humanos.length;
    }

    resultado.ejecutado = true;
    resultado.partidas = activas.length;
    await tx.insert(ajustes).values({ clave: MARCA_CIERRE_MOTOR_9, valor: { fecha: ahora.toISOString(), ...resultado }, actualizadoEn: ahora });
    return resultado;
  });
}
