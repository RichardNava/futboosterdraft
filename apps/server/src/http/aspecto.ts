/**
 * Aspecto del perfil: escudo y diseño del sobre (spec 011, contracts/http-api.md «Aspecto»; data-model §4).
 *
 * - `GET /api/perfil/aspecto` (sesión): un invitado recibe la respuesta fija del contrato.
 * - `PUT /api/perfil/aspecto` (registrados): cada id debe estar disponible y ser del tipo correcto (FR-009).
 * - `POST /api/perfil/aspecto/sobre-siguiente` (sesión): avanza la baraja del carrusel con la fila del perfil
 *   bloqueada, así que dos aperturas a la vez no sacan el mismo diseño de la misma vuelta.
 */
import { randomUUID } from 'node:crypto';
import {
  escudoAsignado,
  limpiarPreferenciasSobre,
  Rng,
  semillaDesdeTexto,
  siguienteSobre,
  SOBRE_ORIGINAL,
  sobreActual,
  type PreferenciasSobre,
} from '@fbd/domain';
import { CuerpoAspecto, type Aspecto, type RespuestaSobreSiguiente } from '@fbd/protocol';
import type { FastifyInstance } from 'fastify';
import type { ServiciosPartida as Servicios } from '../actores/servicios';
import type { Auth } from '../auth/auth';
import { crearHooksSesion } from '../auth/rutas';
import type { Ejecutor } from '../persistencia/db';
import { errores } from './errores';

type Deps = Pick<Servicios, 'db' | 'repoPerfiles' | 'cosmeticos' | 'reloj'>;

const ASPECTO_INVITADO: Aspecto = {
  escudo: null,
  escudoAsignado: false,
  sobreFavorito: SOBRE_ORIGINAL,
  sobreCarrusel: false,
  sobresMarcados: [],
  sobreActual: SOBRE_ORIGINAL,
};

/** Aspecto guardado con los ids que ya no están disponibles descartados (retirados sin poseerlos). */
async function leer(deps: Deps, usuarioId: string, ejecutor: Ejecutor = deps.db, forUpdate = false) {
  const quien = { id: usuarioId, tipo: 'registrado' as const };
  const guardado = await deps.repoPerfiles.obtenerAspecto(usuarioId, ejecutor, forUpdate);
  const disponibles = await deps.cosmeticos.disponibles(quien, undefined, ejecutor);
  const escudo = guardado.escudo !== null && disponibles.has(guardado.escudo) ? guardado.escudo : null;
  return { escudo, sobre: limpiarPreferenciasSobre(guardado, disponibles), disponibles };
}

function respuesta(deps: Deps, usuarioId: string, escudo: string | null, sobre: PreferenciasSobre): Aspecto {
  return {
    escudo: escudo ?? escudoAsignado(usuarioId, deps.cosmeticos.gratuitos('escudo')),
    escudoAsignado: escudo === null,
    sobreFavorito: sobre.sobreFavorito ?? SOBRE_ORIGINAL,
    sobreCarrusel: sobre.sobreCarrusel,
    sobresMarcados: sobre.sobresMarcados,
    sobreActual: sobreActual(sobre),
  };
}

export function registrarRutasAspecto(app: FastifyInstance, auth: Auth, deps: Deps): void {
  const { requiereSesion } = crearHooksSesion(auth);

  app.get('/api/perfil/aspecto', { preHandler: requiereSesion }, async (req): Promise<Aspecto> => {
    if (req.usuario!.tipo !== 'registrado') return ASPECTO_INVITADO;
    const { escudo, sobre } = await leer(deps, req.usuario!.id);
    return respuesta(deps, req.usuario!.id, escudo, sobre);
  });

  app.put('/api/perfil/aspecto', { preHandler: requiereSesion }, async (req): Promise<Aspecto> => {
    if (req.usuario!.tipo !== 'registrado') throw errores.prohibido('SOLO_REGISTRADOS', 'El perfil es solo para usuarios registrados');
    const cuerpo = CuerpoAspecto.safeParse(req.body);
    if (!cuerpo.success) throw errores.validacion('CUERPO_INVALIDO', 'Aspecto mal formado');
    const usuarioId = req.usuario!.id;
    const { escudo, sobreFavorito, sobreCarrusel, sobresMarcados } = cuerpo.data;
    const { disponibles } = await leer(deps, usuarioId);
    const tipoDe = (id: string) => deps.cosmeticos.cosmetico(id)?.tipo;
    const exigir = (id: string, tipo: 'escudo' | 'sobre') => {
      if (tipoDe(id) !== tipo || !disponibles.has(id)) throw errores.regla('COSMETICO_NO_DISPONIBLE', `El cosmético ${id} no está disponible para tu cuenta`, { id });
    };
    if (escudo) exigir(escudo, 'escudo');
    if (sobreFavorito !== undefined) exigir(sobreFavorito, 'sobre');
    for (const id of sobresMarcados ?? []) exigir(id, 'sobre');

    await deps.repoPerfiles.guardarAspecto(
      usuarioId,
      {
        ...(escudo !== undefined ? { escudo } : {}),
        ...(sobreFavorito !== undefined ? { sobreFavorito } : {}),
        ...(sobreCarrusel !== undefined ? { sobreCarrusel } : {}),
        ...(sobresMarcados !== undefined ? { sobresMarcados: [...new Set(sobresMarcados)] } : {}),
        // Cambiar el carrusel o los marcados empieza una vuelta nueva.
        ...(sobreCarrusel !== undefined || sobresMarcados !== undefined ? { sobreBaraja: [] } : {}),
      },
      deps.reloj.ahora(),
    );
    const leido = await leer(deps, usuarioId);
    return respuesta(deps, usuarioId, leido.escudo, leido.sobre);
  });

  app.post('/api/perfil/aspecto/sobre-siguiente', { preHandler: requiereSesion }, async (req): Promise<RespuestaSobreSiguiente> => {
    if (req.usuario!.tipo !== 'registrado') return { diseno: SOBRE_ORIGINAL };
    const usuarioId = req.usuario!.id;
    return deps.db.transaction(async (tx) => {
      const { sobre } = await leer(deps, usuarioId, tx, true);
      // Cosmético personal (FR-013): no influye en el juego, así que basta un azar no reproducible.
      const { diseno, preferencias } = siguienteSobre(sobre, new Rng(semillaDesdeTexto(randomUUID())));
      if (preferencias !== sobre) {
        await deps.repoPerfiles.guardarAspecto(usuarioId, { sobreBaraja: preferencias.sobreBaraja, sobreUltimo: preferencias.sobreUltimo }, deps.reloj.ahora(), tx);
      }
      return { diseno };
    });
  });
}
