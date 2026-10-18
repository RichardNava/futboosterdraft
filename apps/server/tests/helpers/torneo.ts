/**
 * Utilidades para jugar torneos en las pruebas: avanzar el reloj y responder «Seguir» automáticamente.
 */
import type { ServidorPruebas } from './app';
import type { ClienteWs } from './clienteWs';
import { peticion, type UsuarioPrueba } from './usuarios';

export const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Responde «Seguir» a cada pausa que reciba el cliente (como un humano que no hace cambios). */
export function seguirSiempre(ws: ClienteWs): () => void {
  let activo = true;
  let visto = 0;
  const bucle = async () => {
    while (activo) {
      const nuevos = ws.recibidos.slice(visto);
      visto = ws.recibidos.length;
      for (const m of nuevos) {
        if (m.t === 'partido.pausa_decision') {
          ws.enviar({ t: 'partido.seguir', partidoId: m.partidoId });
        }
      }
      await espera(30);
    }
  };
  void bucle();
  return () => {
    activo = false;
  };
}

export async function torneo(srv: ServidorPruebas, partidaId: string, u: UsuarioPrueba) {
  return (await peticion(srv.url, `/api/partidas/${partidaId}/torneo`, { cookie: u.cookie })).cuerpo;
}

/** Avanza el reloj en pasos hasta que se cumpla la condición. */
export async function avanzarHasta(srv: ServidorPruebas, paso: number, condicion: () => Promise<boolean>, maxPasos = 200): Promise<void> {
  for (let i = 0; i < maxPasos; i++) {
    if (await condicion()) return;
    srv.reloj.avanzar(paso);
    await espera(40);
  }
  throw new Error('La condición no se cumplió');
}

/**
 * Torneo con un solo humano (spec 002, research R9): no hay temporizadores de preparación ni plazos. Abre
 * su partido («Comenzar partido») y pide «Siguiente jornada» al cerrarse cada una, hasta que se cumple la
 * condición. Los descansos los resuelve `seguirSiempre`.
 */
export async function jugarSolo(srv: ServidorPruebas, partidaId: string, u: UsuarioPrueba, condicion: () => Promise<boolean>, maxPasos = 3000): Promise<void> {
  for (let i = 0; i < maxPasos; i++) {
    if (await condicion()) return;
    const t = await torneo(srv, partidaId, u);
    const abierta = t.jornadas.find((j: any) => j.estado === 'abierta');
    if (abierta) {
      // Con un solo humano, los NPC contra NPC ya están resueltos: lo programado es el partido propio.
      const mio = abierta.partidos.find((p: any) => p.estado === 'programado');
      if (mio) await peticion(srv.url, `/api/partidos/${mio.partidoId}/abrir`, { metodo: 'POST', cookie: u.cookie });
    } else if (t.jornadaActual !== null && !t.campeon) {
      await peticion(srv.url, `/api/partidas/${partidaId}/siguiente-jornada`, { metodo: 'POST', cookie: u.cookie });
    }
    await espera(30);
  }
  throw new Error('La condición no se cumplió');
}
