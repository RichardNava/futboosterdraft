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
        if (m.t === 'partido.pausa_decision' && !m.listos.includes('__')) {
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
