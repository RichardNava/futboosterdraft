/**
 * Perfil de usuario (spec 003, FR-042a, FR-045; contracts/http-api.md): nombre de equipo y equipaciones por
 * defecto para las partidas nuevas. Solo los usuarios registrados.
 */
import { desdeV1, normalizarNombre, parametrosActuales, validarEquipaciones, validarNombre } from '@fbd/domain';
import { CuerpoPerfil } from '@fbd/protocol';
import type { FastifyInstance } from 'fastify';
import type { ServiciosPartida as Servicios } from '../actores/servicios';
import type { Auth } from '../auth/auth';
import { crearHooksSesion } from '../auth/rutas';
import { errores } from './errores';

export function registrarRutasPerfil(app: FastifyInstance, auth: Auth, servicios: Pick<Servicios, 'repoPerfiles' | 'reloj'>): void {
  const { requiereSesion } = crearHooksSesion(auth);

  const soloRegistrados = (tipo: string) => {
    if (tipo !== 'registrado') throw errores.prohibido('SOLO_REGISTRADOS', 'El perfil es solo para usuarios registrados');
  };

  app.get('/api/perfil', { preHandler: requiereSesion }, async (req) => {
    soloRegistrados(req.usuario!.tipo);
    const perfil = await servicios.repoPerfiles.obtener(req.usuario!.id);
    return { nombreEquipo: perfil?.nombreEquipo ?? null, equipaciones: desdeV1(perfil?.equipaciones ?? null) };
  });

  app.put('/api/perfil', { preHandler: requiereSesion }, async (req) => {
    soloRegistrados(req.usuario!.tipo);
    const cuerpo = CuerpoPerfil.safeParse(req.body);
    if (!cuerpo.success) throw errores.validacion('CUERPO_INVALIDO', 'Perfil mal formado');
    const nombre = cuerpo.data.nombreEquipo === null ? null : normalizarNombre(cuerpo.data.nombreEquipo);
    if (nombre !== null) {
      const problema = validarNombre(nombre, [])[0];
      if (problema) throw errores.regla(problema.codigo, problema.mensaje);
    }
    const equipaciones = cuerpo.data.equipaciones === null ? null : desdeV1(cuerpo.data.equipaciones);
    if (equipaciones) {
      const problema = validarEquipaciones(equipaciones, parametrosActuales())[0];
      if (problema) throw errores.regla(problema.codigo, problema.mensaje);
    }
    await servicios.repoPerfiles.guardar(req.usuario!.id, { nombreEquipo: nombre, equipaciones }, servicios.reloj.ahora());
    return { nombreEquipo: nombre, equipaciones };
  });
}
