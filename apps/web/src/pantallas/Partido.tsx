import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { api } from '../api/cliente';
import { Partido2D } from './Partido2D';
import { PartidoRapido } from './PartidoRapido';

/**
 * Pantalla de partido (T138): elige entre `PartidoRapido` y `Partido2D` según `tipoSimulacion`. Un
 * partido ya terminado se ve siempre como resumen (`PartidoRapido`).
 */
export function Partido() {
  const { partidaId, partidoId } = useParams();
  const [modalidad, setModalidad] = useState<'rapida' | '2d' | null>(null);

  useEffect(() => {
    let vigente = true;
    Promise.all([
      api<{ tipoSimulacion: 'rapida' | '2d' }>(`/api/partidas/${partidaId}`),
      api<{ estado: string }>(`/api/partidos/${partidoId}`).catch(() => null),
    ])
      .then(([partida, partido]) => {
        if (vigente) setModalidad(partida.tipoSimulacion === '2d' && partido?.estado !== 'finalizado' ? '2d' : 'rapida');
      })
      .catch(() => vigente && setModalidad('rapida'));
    return () => {
      vigente = false;
    };
  }, [partidaId, partidoId]);

  if (modalidad === null) return <p className="cargando">Cargando partido…</p>;
  return modalidad === '2d' ? <Partido2D /> : <PartidoRapido />;
}
