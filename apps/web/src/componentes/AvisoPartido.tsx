import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { abrirPartido } from '../api/cliente';
import { useConexion, useCuentaAtras } from '../conexion/useConexion';
import { BarraPrincipal, type AccionBarra } from './BarraPrincipal';
import { SelectorModo, type Modalidad } from './SelectorModo';

interface Preparacion {
  jornada: number | null;
  partidoId: string | null;
  rival: { id: string; nombre: string; humano?: boolean } | null;
  venceEn: string | null;
  /** Última modalidad usada por el participante (spec 003, FR-032). */
  modalidadPreferida?: Modalidad;
}

export interface EstadoPreparacion {
  prep: Preparacion & { partidoId: string; rival: NonNullable<Preparacion['rival']> };
  contraHumano: boolean;
  modalidad: Modalidad;
  setModalidad: (m: Modalidad) => void;
  /** Segundos que quedan del plazo de la jornada, si lo hay. */
  restante: number | null;
  /** Acción principal: «Comenzar partido» o «Ver partido». */
  accion: AccionBarra;
}

/**
 * Preparación del próximo partido (spec 002 y 003): rival, plazo, modalidad elegida y la acción de abrirlo. Cuando
 * empieza el partido, lleva a su pantalla. Devuelve `null` si no hay ningún partido por jugar.
 */
export function usePreparacionPartido(partidaId: string): EstadoPreparacion | null {
  const navegar = useNavigate();
  const [anunciada, setAnunciada] = useState<Preparacion | null>(null);
  const [elegida, setElegida] = useState<Modalidad | null>(null);
  const { conexion, estado } = useConexion(partidaId, (m) => {
    if (m.t === 'partido.inicio') navegar(`/partidas/${partidaId}/partido/${String(m.partidoId)}`);
    else if (m.t === 'preparacion.inicio') {
      const jornada = (m.jornada as number | undefined) ?? null;
      setAnunciada({
        jornada,
        partidoId: m.partidoId as string,
        rival: m.rival as Preparacion['rival'],
        venceEn: (m.venceEn as string | undefined) ?? null,
        ...(m.modalidadPreferida ? { modalidadPreferida: m.modalidadPreferida as Modalidad } : {}),
      });
      setElegida(null);
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
  const modalidad = elegida ?? prep.modalidadPreferida ?? 'rapida';
  const abrir = async () => {
    const { modo } = await abrirPartido(partidoId, modalidad);
    navegar(modo === 'directo' ? `/partidas/${partidaId}/partido/${partidoId}` : `/partidas/${partidaId}/reproduccion/${partidoId}`);
  };
  return {
    prep: prep as EstadoPreparacion['prep'],
    contraHumano,
    modalidad,
    setModalidad: setElegida,
    restante,
    accion: { etiqueta: contraHumano ? 'Ver partido' : 'Comenzar partido', onClick: abrir },
  };
}

/** Tarjeta de la preparación: rival, plazo y selector de modo (sin el botón, que va en la barra principal). */
export function TarjetaPreparacion({ preparacion }: { preparacion: EstadoPreparacion }) {
  const { prep, contraHumano, restante, modalidad, setModalidad } = preparacion;
  const horas = Math.floor((restante ?? 0) / 3600);
  const minutos = Math.floor(((restante ?? 0) % 3600) / 60);
  return (
    <div className="aviso tarjeta-preparacion" role="status">
      <p>
        {prep.jornada !== null && `Jornada ${prep.jornada}: `}próximo partido contra <strong>{prep.rival.nombre}</strong>.{' '}
        {prep.venceEn && restante !== null && `Tienes ${horas} h ${minutos} min para jugarlo. `}
        {contraHumano ? 'Se jugará con la alineación que tengas guardada al abrirlo.' : 'Confirma tu alineación antes de empezar.'}
      </p>
      <SelectorModo valor={modalidad} onCambiar={setModalidad} />
    </div>
  );
}

/**
 * Aviso del próximo partido con su botón principal («Comenzar partido» contra un NPC o «Ver partido» contra un
 * humano; spec 002, FR-030) en la `BarraPrincipal`.
 */
export function AvisoPartido({ partidaId }: { partidaId: string }) {
  const preparacion = usePreparacionPartido(partidaId);
  if (!preparacion) return null;
  return (
    <>
      <TarjetaPreparacion preparacion={preparacion} />
      <BarraPrincipal principal={preparacion.accion} />
    </>
  );
}
