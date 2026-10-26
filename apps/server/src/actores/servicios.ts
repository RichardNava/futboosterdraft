/**
 * Dependencias compartidas por los controladores de partida.
 */
import type { ServicioEconomia } from '../economia/servicio';
import type { BaseDatos } from '../persistencia/db';
import type { Catalogo } from '../persistencia/repos/catalogo';
import type { RepoDraft } from '../persistencia/repos/draft';
import type { RepoEquipo } from '../persistencia/repos/equipo';
import type { RepoPartidas } from '../persistencia/repos/partidas';
import type { RepoPartidos } from '../persistencia/repos/partidos';
import type { RepoPerfiles } from '../persistencia/repos/perfiles';
import type { RepoTorneo } from '../persistencia/repos/torneo';
import type { RepoVisionados } from '../persistencia/repos/visionados';
import type { Logger } from '../observabilidad/logger';
import type { Metricas } from '../observabilidad/metricas';
import type { Reloj } from '../programador/reloj';
import type { Temporizadores } from '../programador/temporizadores';
import type { Difusor } from './actor';

export interface ServiciosPartida {
  db: BaseDatos;
  repoPartidas: RepoPartidas;
  repoDraft: RepoDraft;
  repoEquipo: RepoEquipo;
  repoPartidos: RepoPartidos;
  repoTorneo: RepoTorneo;
  repoVisionados: RepoVisionados;
  repoPerfiles: RepoPerfiles;
  catalogo: Catalogo;
  /** Colección propia, fragmentos y recompensas (spec 006). */
  economia: ServicioEconomia;
  reloj: Reloj;
  temporizadores: Temporizadores;
  difusor: Difusor & { estaConectado(partidaId: string, participanteId: string): boolean };
  logger: Logger;
  metricas: Metricas;
}
