/**
 * Rutas de partidas (T051; contracts/http-api.md).
 */
import { AnadirNPC, ConfigDuelosEntrada, ConsultaMisPartidas, CrearPartida, type RespuestaNivelesRareza, CuerpoEscudoPartida, CuerpoNombreEquipo } from '@fbd/protocol';
import { accesoNivelRareza, NIVELES_RAREZA, PARAMETROS_ECONOMIA } from '@fbd/domain';
import type { FastifyInstance } from 'fastify';
import type { GestorPartidas } from '../actores/gestor';
import { cambiarEscudo, cambiarNombreEquipo } from '../actores/identidad';
import { misPartidas } from '../actores/misPartidas';
import { anadirNPC, configurarDuelos, iniciar, unirse } from '../actores/sala';
import type { Auth } from '../auth/auth';
import { crearHooksSesion } from '../auth/rutas';
import { errores } from './errores';

/** Rutas para crear, listar, ver, unirse e iniciar partidas. */
export function registrarRutasPartidas(app: FastifyInstance, auth: Auth, gestor: GestorPartidas): void {
  const { requiereSesion, requiereRegistrado } = crearHooksSesion(auth);

  app.post('/api/partidas', { preHandler: requiereSesion }, async (req, reply) => {
    const entrada = CrearPartida.parse(req.body);
    // Spec 013 (FR-033): la clave del envío del formulario hace idempotente la creación (y su cobro).
    const clave = req.headers['idempotency-key'];
    const c = await gestor.crearPartida(req.usuario!, entrada, typeof clave === 'string' && clave.length <= 200 ? clave : undefined);
    return reply.code(201).send(gestor.resumen(c, req.usuario!.id));
  });

  // Spec 013 (FR-019, FR-034): qué cuesta cada nivel de rareza a quien va a crear la partida.
  app.get('/api/partidas/niveles-rareza', { preHandler: requiereSesion }, async (req): Promise<RespuestaNivelesRareza> => {
    const usuario = req.usuario!;
    const { economia, ajustes } = gestor.servicios;
    const acceso = await ajustes.accesoNivelesRareza();
    const registrado = usuario.tipo === 'registrado';
    const premium = registrado ? await economia.premium(usuario.id) : { activo: false, cortesia: false, fin: null };
    return {
      acceso,
      premium,
      saldo: registrado ? await economia.saldoDe(usuario.id) : null,
      niveles: NIVELES_RAREZA.map((nivel) => {
        const r = accesoNivelRareza({ nivel, acceso, tipoUsuario: usuario.tipo, premiumActivo: premium.activo, precio: PARAMETROS_ECONOMIA.precioNivelRareza });
        if (!r.permitido) return { nivel, estado: 'no_disponible' as const, motivo: r.motivo };
        return r.coste > 0 ? { nivel, estado: 'pago' as const, coste: r.coste } : { nivel, estado: 'gratis' as const, coste: 0 };
      }),
    };
  });

  app.get<{ Querystring: { estado?: string } }>('/api/partidas', { preHandler: requiereRegistrado }, async (req) => {
    if (req.query.estado && req.query.estado !== 'buscando') {
      throw errores.validacion('FILTRO_INVALIDO', 'Solo se pueden listar partidas abiertas (estado=buscando)');
    }
    const filas = await gestor.servicios.repoPartidas.listarPorEstado(['buscando']);
    const resultado = [];
    for (const fila of filas) {
      const c = await gestor.obtener(fila.id);
      // Las partidas de invitado no admiten más humanos.
      if (c && !c.anfitrionEsInvitado && c.humanos().length < c.partida.plazasHumanas) {
        resultado.push(gestor.resumen(c, req.usuario!.id));
      }
    }
    return resultado;
  });

  // «Mis partidas» (FR-017): en curso y terminadas, con la acción pendiente de cada una.
  // Spec 013 (FR-024): en curso + 5 terminadas, y «Cargar más» con `antes`.
  app.get('/api/mis-partidas', { preHandler: requiereSesion }, async (req) =>
    misPartidas(gestor, req.usuario!.id, ConsultaMisPartidas.parse(req.query)),
  );

  app.get<{ Params: { id: string } }>('/api/partidas/:id', { preHandler: requiereSesion }, async (req) => {
    const c = await gestor.obtenerOError(req.params.id);
    return gestor.resumen(c, req.usuario!.id);
  });

  app.post<{ Params: { id: string } }>('/api/partidas/:id/unirse', { preHandler: requiereRegistrado }, async (req) => {
    const c = await gestor.obtenerOError(req.params.id);
    if (c.anfitrionEsInvitado) throw errores.conflicto('PARTIDA_COMPLETA', 'Esta partida no admite más jugadores');
    await c.ejecutar((ctx) => unirse(c, ctx, req.usuario!.id));
    return gestor.resumen(c, req.usuario!.id);
  });

  app.post<{ Params: { id: string } }>('/api/partidas/:id/npc', { preHandler: requiereSesion }, async (req) => {
    const { nivel } = AnadirNPC.parse(req.body);
    const c = await gestor.obtenerOError(req.params.id);
    await c.ejecutar((ctx) => anadirNPC(c, ctx, req.usuario!.id, nivel));
    return gestor.resumen(c, req.usuario!.id);
  });

  // Formación común y Estado de forma del modo duelos (spec 005, FR-061): solo el anfitrión y antes del draft.
  app.put<{ Params: { id: string } }>('/api/partidas/:id/duelos', { preHandler: requiereSesion }, async (req) => {
    const c = await gestor.obtenerOError(req.params.id);
    const cuerpo = ConfigDuelosEntrada.safeParse(req.body);
    return c.ejecutar((ctx) => configurarDuelos(c, ctx, req.usuario!.id, cuerpo.success ? cuerpo.data : null));
  });

  app.post<{ Params: { id: string } }>('/api/partidas/:id/iniciar', { preHandler: requiereSesion }, async (req) => {
    const c = await gestor.obtenerOError(req.params.id);
    await c.ejecutar((ctx) => iniciar(c, ctx, req.usuario!.id));
    return gestor.resumen(c, req.usuario!.id);
  });

  // Nombre del equipo en la partida (spec 003, FR-042, FR-043): editable hasta que se abre el primer partido.
  app.put<{ Params: { id: string } }>('/api/partidas/:id/nombre-equipo', { preHandler: requiereSesion }, async (req) => {
    const cuerpo = CuerpoNombreEquipo.safeParse(req.body);
    if (!cuerpo.success) throw errores.validacion('CUERPO_INVALIDO', 'Falta el nombre');
    const c = await gestor.obtenerOError(req.params.id);
    const participante = c.participanteDeUsuario(req.usuario!.id);
    if (!participante) throw errores.prohibido('NO_PARTICIPA', 'No participas en esta partida');
    return c.ejecutar((ctx) => cambiarNombreEquipo(c, ctx, participante.id, cuerpo.data.nombre));
  });

  // Escudo del equipo en la partida (spec 011): mismas reglas que el nombre; no cambia el del perfil.
  app.put<{ Params: { id: string } }>('/api/partidas/:id/escudo', { preHandler: requiereSesion }, async (req) => {
    const cuerpo = CuerpoEscudoPartida.safeParse(req.body);
    if (!cuerpo.success) throw errores.validacion('CUERPO_INVALIDO', 'Falta el escudo (o null)');
    const c = await gestor.obtenerOError(req.params.id);
    const participante = c.participanteDeUsuario(req.usuario!.id);
    if (!participante) throw errores.prohibido('NO_PARTICIPA', 'No participas en esta partida');
    return c.ejecutar((ctx) => cambiarEscudo(c, ctx, participante.id, cuerpo.data.escudo));
  });

  app.get<{ Params: { id: string } }>('/api/partidas/:id/plantillas', { preHandler: requiereSesion }, async (req) => {
    const c = await gestor.obtenerOError(req.params.id);
    if (!c.participanteDeUsuario(req.usuario!.id)) throw errores.prohibido('NO_PARTICIPA', 'No participas en esta partida');
    if (c.partida.estado === 'buscando' || c.partida.estado === 'en_draft') {
      throw errores.conflicto('DRAFT_EN_CURSO', 'Las plantillas se ven al terminar el draft');
    }
    return gestor.plantillasVisibles(c);
  });
}
