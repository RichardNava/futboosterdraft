/**
 * Celebración de un gol sobre el campo (spec 012, FR-009 a FR-014; contracts/ui.md «CapaCelebracion»): capa absoluta
 * encima del lienzo que reproduce una celebración de juego (registro) o una secuencia de vídeo con alfa; si el vídeo
 * no se puede ver, la del juego. Dura lo suyo a cualquier velocidad (el reloj espera), un clic la cierra y un gol
 * nuevo la reemplaza (quien la monta le da el `key` del gol). Con movimiento reducido, solo fundido.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { reproducir, type Efecto } from '../../sonido/sonido';
import { CELEBRACIONES_JUEGO, IDS_CELEBRACIONES_JUEGO } from './registro';
import { duracionCelebracion, fuentesSecuencia, planCelebracion, type CelebracionElegida, type EquipoCelebracion } from './tipos';

export interface PropsCapaCelebracion {
  celebracion: CelebracionElegida;
  equipo: EquipoCelebracion;
  goleador: string;
  onFin: () => void;
  /** Vista previa (perfil, pruebas): sin aviso a lectores de pantalla. */
  vistaPrevia?: boolean;
}

const movimientoReducido = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

export function CapaCelebracion({ celebracion, equipo, goleador, onFin, vistaPrevia = false }: PropsCapaCelebracion) {
  const [falloVideo, setFalloVideo] = useState(false);
  const [reducido] = useState(movimientoReducido);
  const plan = planCelebracion(celebracion, IDS_CELEBRACIONES_JUEGO, falloVideo);
  const duracion = duracionCelebracion(celebracion.datos, plan.clase);
  const fin = useRef(onFin);
  fin.current = onFin;

  useEffect(() => {
    const t = setTimeout(() => fin.current(), duracion);
    return () => clearTimeout(t);
  }, [duracion]);

  // Sonido propio de una secuencia (respeta 🔊 porque va por `reproducir`), a su velocidad natural.
  const sonido = plan.clase === 'secuencia' ? celebracion.datos.sonido : undefined;
  useEffect(() => (sonido ? reproducir(sonido as Efecto) : undefined), [sonido]);

  const Juego = plan.clase === 'juego' ? (CELEBRACIONES_JUEGO[plan.id] ?? CELEBRACIONES_JUEGO['celebracion-clasica']!) : null;
  const estilo = { '--duracion-celebracion': `${duracion}ms`, '--color-equipo': equipo.color } as CSSProperties;

  return (
    <div
      className={['capa-celebracion', reducido ? 'reducido' : ''].filter(Boolean).join(' ')}
      style={estilo}
      data-celebracion={plan.id}
      data-testid="capa-celebracion"
      onClick={onFin}
    >
      {!vistaPrevia && (
        <p className="solo-lectores" aria-live="polite">
          Gol de {goleador} ({equipo.nombre})
        </p>
      )}
      {Juego ? (
        <Juego equipo={equipo} goleador={goleador} />
      ) : (
        <video
          className="celebracion-video"
          muted
          playsInline
          autoPlay
          aria-hidden="true"
          onError={() => setFalloVideo(true)}
        >
          {fuentesSecuencia(plan.id).map((f, i, todas) => (
            // El error de carga llega a la última fuente, no al vídeo.
            <source key={f.src} src={f.src} type={f.type} onError={i === todas.length - 1 ? () => setFalloVideo(true) : undefined} />
          ))}
        </video>
      )}
    </div>
  );
}
