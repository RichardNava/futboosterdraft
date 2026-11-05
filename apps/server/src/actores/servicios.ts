/**
 * Dependencias compartidas por los controladores de partida.
 */
import type { ServicioAjustes } from '../ajustes/servicio';
import type { ServicioEconomia } from '../economia/servicio';
import type { BaseDatos } from '../persistencia/db';
import type { Catalogo } from '../persistencia/repos/catalogo';
import type { RepoCosmeticos } from '../persistencia/repos/cosmeticos';
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
import type { Calculo } from '../simulacion/grupo';
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
  /** Identidad de las cartas y otros ajustes sin reinicio (spec 011). */
  ajustes: ServicioAjustes;
  /** Escudos y sobres: catálogo y disponibilidad (spec 011). */
  cosmeticos: RepoCosmeticos;
  /** Colección propia, fragmentos y recompensas (spec 006). */
  economia: ServicioEconomia;
  reloj: Reloj;
  temporizadores: Temporizadores;
  difusor: Difusor & { estaConectado(partidaId: string, participanteId: string): boolean };
  logger: Logger;
  metricas: Metricas;
  /** Cálculos del motor y de la IA, en hilos de trabajo o en proceso (spec 009). */
  calculo: Calculo;
}
