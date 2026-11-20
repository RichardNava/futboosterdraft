import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router';
import { api } from '../api/cliente';
import { usePartidaActiva } from '../estado/partidaActiva';
import { Partido2D } from './Partido2D';
import { PartidoRapido } from './PartidoRapido';
import { PantallaCargando } from '../componentes/Esqueleto';

/**
 * Pantalla de partido (T138; spec 003, FR-033): elige entre `PartidoRapido` y `Partido2D` según la modalidad con
 * la que el participante abrió este partido (no la de la partida). Un partido ya terminado se ve siempre como
 * resumen (`PartidoRapido`).
 */
export function Partido() {
  const { partidaId, partidoId } = useParams();
  // La elegida al pulsar «Comenzar partido» (AvisoPartido), si la hay; la API la confirma igualmente.
  const [modalidad, setModalidad] = useState<'rapida' | '2d' | 'reproduccion' | null>(() => usePartidaActiva.getState().modalidadPartido);
  const actualizar = usePartidaActiva((s) => s.actualizar);

  useEffect(() => {
    let vigente = true;
    api<{ estado: string; modalidad?: 'rapida' | '2d' | null }>(`/api/partidos/${partidoId}`)
      .then((partido) => {
        if (!vigente) return;
        // Partido entre humanos que aún no has visto: se ve en su reproducción (spec 002, FR-030).
        if (partido.estado === 'pendiente_de_ver') return setModalidad('reproduccion');
        const m = partido.modalidad === '2d' && partido.estado !== 'finalizado' ? '2d' : 'rapida';
        setModalidad(m);
        actualizar({ modalidadPartido: m });
      })
      .catch(() => vigente && setModalidad('rapida'));
    return () => {
      vigente = false;
      actualizar({ modalidadPartido: null });
    };
  }, [partidoId, actualizar]);

  if (modalidad === null) return <PantallaCargando forma="campo" texto="Cargando el partido…" diferida />;
  if (modalidad === 'reproduccion') return <Navigate to={`/partidas/${partidaId}/reproduccion/${partidoId}`} replace />;
  return modalidad === '2d' ? <Partido2D /> : <PartidoRapido />;
}
