/**
 * Partidas de prueba ya avanzadas: crea, inicia y completa el draft adelantando el reloj simulado
 * (todas las elecciones de los humanos se hacen automáticamente al vencer cada turno).
 */
import type { ServidorPruebas } from './app';
import { crearInvitado, crearRegistrado, peticion, type UsuarioPrueba } from './usuarios';

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function esperarEstado(srv: ServidorPruebas, partidaId: string, usuario: UsuarioPrueba, estado: string, avanzarMs = 46_000) {
  for (let i = 0; i < 60; i++) {
    const r = await peticion(srv.url, `/api/partidas/${partidaId}`, { cookie: usuario.cookie });
    if (r.cuerpo?.estado === estado) return r.cuerpo;
    srv.reloj.avanzar(avanzarMs);
    await espera(60);
  }
  throw new Error(`La partida no llegó al estado ${estado}`);
}

export async function partidaTrasDraft(
  srv: ServidorPruebas,
  opciones: { invitado?: boolean; cuerpo?: Record<string, unknown>; otros?: UsuarioPrueba[] } = {},
) {
  const anfitrion = opciones.invitado ? await crearInvitado(srv.url) : await crearRegistrado(srv.url);
  const r = await peticion(srv.url, '/api/partidas', {
    cookie: anfitrion.cookie,
    cuerpo: { modo: 'liga', numParticipantes: 4, tipoSimulacion: 'rapida', ritmo: 'directo', ...opciones.cuerpo },
  });
  if (r.estado !== 201) throw new Error(`No se pudo crear la partida: ${JSON.stringify(r.cuerpo)}`);
  for (const otro of opciones.otros ?? []) {
    await peticion(srv.url, `/api/partidas/${r.cuerpo.id}/unirse`, { metodo: 'POST', cookie: otro.cookie });
  }
  await peticion(srv.url, `/api/partidas/${r.cuerpo.id}/iniciar`, { metodo: 'POST', cookie: anfitrion.cookie });
  const partida = await esperarEstado(srv, r.cuerpo.id, anfitrion, 'en_torneo');
  return { anfitrion, partida };
}
