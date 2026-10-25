/**
 * Composición del servidor: une base de datos, autenticación, actores, pasarela y rutas.
 * La usan `main.ts` y las pruebas de integración (con `RelojFalso` y una base de datos de pruebas).
 */
import { MsgDraftElegir, MsgPartidaPausar, MsgPartidoDecision, MsgPartidoDecisiones, MsgPartidoFinalizar, MsgPartidoReproduccion, MsgPartidoSeguir } from '@fbd/protocol';
import { procesarPausar } from './actores/pausa';
import type { FastifyInstance } from 'fastify';
import { procesarEleccion } from './actores/draft';
import { procesarReproduccion } from './actores/partido2d';
import { procesarDecisionesLote, procesarDecisionPartido, procesarFinalizar, procesarSeguir } from './actores/partidoRapido';
import { GestorPartidas } from './actores/gestor';
import { crearAuth, type Auth } from './auth/auth';
import { construirApp } from './http/app';
import { registrarRutasCatalogo } from './http/catalogo';
import { registrarRutasColeccion } from './http/coleccion';
import { registrarRutasTienda } from './http/tienda';
import { ServicioEconomia } from './economia/servicio';
import { errores } from './http/errores';
import { registrarRutasAlineacion } from './http/alineacion';
import { registrarRutasPartidas } from './http/partidas';
import { registrarRutasPartidos } from './http/partidos';
import { crearLogger, type Logger } from './observabilidad/logger';
import { crearMetricas, type Metricas } from './observabilidad/metricas';
import type { BaseDatos } from './persistencia/db';
import { AlmacenPeticionesBD, type AlmacenPeticiones } from './persistencia/peticiones';
import { Catalogo } from './persistencia/repos/catalogo';
import { RepoDraft } from './persistencia/repos/draft';
import { RepoEquipo } from './persistencia/repos/equipo';
import { RepoPartidos } from './persistencia/repos/partidos';
import { RepoVisionados } from './persistencia/repos/visionados';
import { RepoPerfiles } from './persistencia/repos/perfiles';
import { RepoTorneo } from './persistencia/repos/torneo';
import { ServicioAvisos } from './avisos/servicio';
import { registrarRutasTorneo } from './http/torneo';
import { registrarRutasPerfil } from './http/perfil';
import { RepoPartidas } from './persistencia/repos/partidas';
import { RelojFalso, type Reloj } from './programador/reloj';
import { Temporizadores } from './programador/temporizadores';
import { Pasarela } from './ws/pasarela';
import type { OpcionesLimitador } from './http/limitador';

export interface ConfigServidor {
  db: BaseDatos;
  reloj: Reloj;
  secreto: string;
  urlPublica: string;
  logger?: Logger;
  peticiones?: AlmacenPeticiones;
  /** Si no se indica, se carga de la base de datos. */
  catalogo?: Catalogo;
  /** Servidor SMTP para los avisos por correo (opcional). */
  smtpUrl?: string;
  /** Límites de peticiones HTTP y mensajes WebSocket por sesión (por defecto, los de `http/limitador.ts`). */
  limites?: { http?: OpcionesLimitador; ws?: OpcionesLimitador };
}

export interface Servidor {
  app: FastifyInstance;
  db: BaseDatos;
  auth: Auth;
  reloj: Reloj;
  logger: Logger;
  metricas: Metricas;
  pasarela: Pasarela;
  gestor: GestorPartidas;
  temporizadores: Temporizadores;
}

export async function crearServidor(config: ConfigServidor): Promise<Servidor> {
  const logger = config.logger ?? crearLogger();
  const metricas = crearMetricas();
  const peticiones = config.peticiones ?? new AlmacenPeticionesBD(config.db);
  const catalogo = config.catalogo ?? (await Catalogo.cargar(config.db));
  const temporizadores = new Temporizadores(config.reloj);
  const economia = new ServicioEconomia(config.db, catalogo);

  // El gestor se crea después de la autenticación y la pasarela, que lo usan a través de esta referencia.
  const ref: { gestor?: GestorPartidas } = {};
  const g = (): GestorPartidas => ref.gestor!;
  const auth = crearAuth(config.db, {
    secreto: config.secreto,
    urlPublica: config.urlPublica,
    alVincularInvitado: (invitadoId, nuevoId) => g().alVincularInvitado(invitadoId, nuevoId),
  });

  const pasarela = new Pasarela({
    auth,
    reloj: config.reloj,
    logger,
    metricas,
    peticiones,
    origenesPermitidos: [new URL(config.urlPublica).origin],
    ...(config.limites?.ws ? { limite: config.limites.ws } : {}),
    resolverParticipante: (partidaId, usuarioId) => g().resolverParticipante(partidaId, usuarioId),
    estadoVisible: (partidaId, participanteId) => g().estadoVisible(partidaId, participanteId),
    alConectar: (ctx) => g().alCambiarConexion(ctx.partidaId, ctx.participanteId, true),
    alDesconectar: (ctx, quedan) => {
      if (!quedan) g().alCambiarConexion(ctx.partidaId, ctx.participanteId, false);
    },
  });

  const gestor = new GestorPartidas({
    db: config.db,
    repoPartidas: new RepoPartidas(config.db),
    repoDraft: new RepoDraft(config.db),
    repoEquipo: new RepoEquipo(config.db),
    repoPartidos: new RepoPartidos(config.db),
    repoTorneo: new RepoTorneo(config.db),
    repoVisionados: new RepoVisionados(config.db),
    repoPerfiles: new RepoPerfiles(config.db),
    catalogo,
    economia,
    reloj: config.reloj,
    temporizadores,
    difusor: pasarela,
    logger,
    metricas,
  });
  ref.gestor = gestor;
  const avisos = new ServicioAvisos(config.db, config.reloj, logger, config.smtpUrl, config.urlPublica, (aviso) => {
    // Envío en vivo al participante del usuario en esa partida, si está conectado.
    void gestor.obtener(aviso.partidaId).then((c) => {
      const p = c?.participanteDeUsuario(aviso.usuarioId);
      if (p) pasarela.enviar(aviso.partidaId, { destino: { tipo: 'participante', participanteId: p.id }, mensaje: { t: 'aviso', ...aviso } });
    });
  });
  gestor.depsTorneo = { avisos };

  pasarela.registrarManejador('draft.elegir', {
    esquema: MsgDraftElegir,
    conAck: true,
    manejar: async (ctx, msg) => {
      const c = await gestor.obtenerOError(ctx.partidaId);
      return c.ejecutar((cmd) => procesarEleccion(c, cmd, ctx.participanteId, msg));
    },
  });

  pasarela.registrarManejador('partido.seguir', {
    esquema: MsgPartidoSeguir,
    conAck: true,
    manejar: async (ctx, msg) => {
      const c = await gestor.obtenerOError(ctx.partidaId);
      return c.ejecutar((cmd) => procesarSeguir(c, cmd, ctx.participanteId, msg.partidoId));
    },
  });
  // Salir desde la barra en una partida de un humano: se pausa hasta volver (research R10).
  pasarela.registrarManejador('partida.pausar', {
    esquema: MsgPartidaPausar,
    conAck: true,
    manejar: async (ctx) => {
      const c = await gestor.obtenerOError(ctx.partidaId);
      return c.ejecutar((cmd) => procesarPausar(c, cmd, ctx.participanteId));
    },
  });
  pasarela.registrarManejador('partido.finalizar', {
    esquema: MsgPartidoFinalizar,
    conAck: true,
    manejar: async (ctx, msg) => {
      const c = await gestor.obtenerOError(ctx.partidaId);
      return c.ejecutar((cmd) => procesarFinalizar(c, cmd, ctx.participanteId, msg.partidoId));
    },
  });
  pasarela.registrarManejador('partido.decision', {
    esquema: MsgPartidoDecision,
    conAck: true,
    manejar: async (ctx, msg) => {
      const c = await gestor.obtenerOError(ctx.partidaId);
      return c.ejecutar(() => procesarDecisionPartido(c, ctx.participanteId, msg.partidoId, { tipo: msg.tipo, datos: msg.datos }));
    },
  });
  pasarela.registrarManejador('partido.decisiones', {
    esquema: MsgPartidoDecisiones,
    conAck: true,
    manejar: async (ctx, msg) => {
      const c = await gestor.obtenerOError(ctx.partidaId);
      return c.ejecutar(() => procesarDecisionesLote(c, ctx.participanteId, msg.partidoId, msg.decisiones));
    },
  });
  // 2D en directo: reloj de reproducción del cliente (sin requestId: se repite y no cambia el partido).
  pasarela.registrarManejador('partido.reproduccion', {
    esquema: MsgPartidoReproduccion,
    conAck: false,
    manejar: async (ctx, msg) => {
      const c = await gestor.obtenerOError(ctx.partidaId);
      return c.ejecutar((cmd) => procesarReproduccion(c, cmd, ctx.participanteId, msg.partidoId, msg.tick, msg.velocidad));
    },
  });

  const app = await construirApp({
    db: config.db,
    auth,
    reloj: config.reloj,
    logger,
    metricas,
    peticiones,
    opcionesAuth: { alCerrarSesion: (u) => gestor.alCerrarSesion(u), alEliminarCuenta: (u) => gestor.eliminarCuenta(u.id) },
    ...(config.limites?.http ? { limiteHttp: config.limites.http } : {}),
  });
  pasarela.registrarRuta(app);
  registrarRutasCatalogo(app, config.db);
  registrarRutasPartidas(app, auth, gestor);
  registrarRutasAlineacion(app, auth, gestor);
  registrarRutasPartidos(app, auth, gestor);
  registrarRutasTorneo(app, auth, gestor, { avisos });
  registrarRutasPerfil(app, auth, gestor.servicios);
  registrarRutasColeccion(app, auth, economia);
  registrarRutasTienda(app, auth, economia);

  // Reloj simulado en desarrollo (quickstart, escenario E): permite adelantar plazos.
  if (config.reloj instanceof RelojFalso) {
    const reloj = config.reloj;
    app.post<{ Body: { ms?: number } }>('/api/dev/reloj/avanzar', async (req) => {
      const ms = req.body?.ms;
      if (typeof ms !== 'number' || ms < 0) throw errores.validacion('MS_INVALIDO', 'Indica "ms" ≥ 0');
      reloj.avanzar(ms);
      return { ahora: new Date(reloj.ahora()).toISOString() };
    });
  }

  app.addHook('onClose', async () => {
    temporizadores.cancelarTodos();
    gestor.cerrarTodo();
  });

  return { app, db: config.db, auth, reloj: config.reloj, logger, metricas, pasarela, gestor, temporizadores };
}
