import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useConexion, useCuentaAtras } from '../conexion/useConexion';

/**
 * Aviso del próximo partido (rival y cuenta atrás de la preparación). Cuando empieza el partido, lleva
 * a su pantalla.
 */
export function AvisoPartido({ partidaId }: { partidaId: string }) {
  const navegar = useNavigate();
  const { conexion, estado } = useConexion(partidaId, (m) => {
    if (m.t === 'partido.inicio') navegar(`/partidas/${partidaId}/partido/${String(m.partidoId)}`);
  });

  // Si al conectar ya hay un partido en juego (no terminado), se va directamente a él.
  useEffect(() => {
    const p = estado?.vista?.partido;
    if (p && p.fase !== 'finalizado') navegar(`/partidas/${partidaId}/partido/${p.inicio.partidoId}`);
  }, [estado, navegar, partidaId]);

  const prep = estado?.fase === 'torneo' ? estado.vista.preparacion : null;
  const restante = useCuentaAtras(prep?.venceEn, conexion);
  if (!prep?.rival) return null;
  const min = Math.floor((restante ?? 0) / 60);
  const seg = String((restante ?? 0) % 60).padStart(2, '0');
  return (
    <p className="aviso" role="status">
      Jornada {prep.jornada}: próximo partido contra <strong>{prep.rival.nombre}</strong>. Empieza en {min}:{seg}. Confirma tu alineación antes.
    </p>
  );
}
