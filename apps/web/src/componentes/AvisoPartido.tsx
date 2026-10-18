import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { abrirPartido } from '../api/cliente';
import { useConexion, useCuentaAtras } from '../conexion/useConexion';
import { BotonAvanzar } from './BotonAvanzar';

interface Preparacion {
  jornada: number | null;
  partidoId: string | null;
  rival: { id: string; nombre: string; humano?: boolean } | null;
  venceEn: string | null;
}

/**
 * Aviso del próximo partido: rival, plazo de la jornada si lo hay, y «Comenzar partido» (contra un NPC) o
 * «Ver partido» (contra un humano, que se resuelve al abrirlo; spec 002, FR-030). Cuando empieza el
 * partido, lleva a su pantalla.
 */
export function AvisoPartido({ partidaId }: { partidaId: string }) {
  const navegar = useNavigate();
  /** Preparación anunciada después de conectar (al abrirse una jornada nueva). */
  const [anunciada, setAnunciada] = useState<Preparacion | null>(null);
  const { conexion, estado } = useConexion(partidaId, (m) => {
    if (m.t === 'partido.inicio') navegar(`/partidas/${partidaId}/partido/${String(m.partidoId)}`);
    else if (m.t === 'preparacion.inicio') {
      const jornada = (m.jornada as number | undefined) ?? null;
      setAnunciada({ jornada, partidoId: m.partidoId as string, rival: m.rival as Preparacion['rival'], venceEn: (m.venceEn as string | undefined) ?? null });
    }
  });

  // Si al conectar ya hay un partido en juego (no terminado), se va directamente a él.
  useEffect(() => {
    const p = estado?.vista?.partido;
    if (p && p.fase !== 'finalizado') navegar(`/partidas/${partidaId}/partido/${p.inicio.partidoId}`);
  }, [estado, navegar, partidaId]);

  const prep: Preparacion | null = anunciada ?? (estado?.fase === 'torneo' ? estado.vista.preparacion : null);
  const restante = useCuentaAtras(prep?.venceEn ?? null, conexion);
  if (!prep?.rival || !prep.partidoId) return null;

  const contraHumano = prep.rival.humano === true;
  const partidoId = prep.partidoId;
  const abrir = async () => {
    const { modo } = await abrirPartido(partidoId);
    navegar(modo === 'directo' ? `/partidas/${partidaId}/partido/${partidoId}` : `/partidas/${partidaId}/reproduccion/${partidoId}`);
  };
  const horas = Math.floor((restante ?? 0) / 3600);
  const minutos = Math.floor(((restante ?? 0) % 3600) / 60);
  return (
    <div className="aviso" role="status">
      <p>
        {prep.jornada !== null && `Jornada ${prep.jornada}: `}próximo partido contra <strong>{prep.rival.nombre}</strong>.{' '}
        {prep.venceEn && restante !== null && `Tienes ${horas} h ${minutos} min para jugarlo. `}
        {contraHumano
          ? 'Se jugará con la alineación que tengas guardada al abrirlo.'
          : 'Confirma tu alineación antes de empezar.'}
      </p>
      <BotonAvanzar situacion="preparacion" contraHumano={contraHumano} onAvanzar={abrir} />
    </div>
  );
}
