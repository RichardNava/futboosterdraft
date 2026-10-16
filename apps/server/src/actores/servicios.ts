/**
 * Dependencias compartidas por los controladores de partida.
 */
import type { BaseDatos } from '../persistencia/db';
import type { Catalogo } from '../persistencia/repos/catalogo';
import type { RepoDraft } from '../persistencia/repos/draft';
import type { RepoEquipo } from '../persistencia/repos/equipo';
import type { RepoPartidas } from '../persistencia/repos/partidas';
import type { RepoPartidos } from '../persistencia/repos/partidos';
import type { RepoTorneo } from '../persistencia/repos/torneo';
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
  catalogo: Catalogo;
  reloj: Reloj;
  temporizadores: Temporizadores;
  difusor: Difusor & { estaConectado(partidaId: string, participanteId: string): boolean };
  logger: Logger;
  metricas: Metricas;
}
