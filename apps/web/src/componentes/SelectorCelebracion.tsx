/**
 * Selector de la celebración de gol (spec 012, FR-011; contracts/ui.md «Mi perfil»): las celebraciones disponibles
 * por nombre y una vista previa con la propia `CapaCelebracion` a escala. Elegir una la guarda y la reproduce.
 */
import { CELEBRACION_DEL_JUEGO } from '@fbd/domain';
import { useState } from 'react';
import { Link } from 'react-router';
import { useCatalogoCosmeticos } from '../estado/cosmeticos';
import { CapaCelebracion } from './celebraciones/CapaCelebracion';
import { moverFoco } from './SelectorEscudo';

interface Props {
  /** null = la del juego. */
  elegida: string | null;
  onElegir: (id: string) => void;
  /** Escudo de la cuenta, para la vista previa. */
  escudo?: string | null;
  desactivado?: boolean;
}

/** Selector de la celebración de gol entre las que tiene la cuenta, con vista previa. */
export function SelectorCelebracion({ elegida, onElegir, escudo = null, desactivado = false }: Props) {
  const { catalogo, error } = useCatalogoCosmeticos();
  // Cada reproducción de la vista previa es una capa nueva.
  const [vista, setVista] = useState<{ id: string; n: number } | null>(null);
  if (error && !catalogo) return <p className="nota">No se han podido cargar las celebraciones.</p>;
  if (!catalogo) return <p className="nota">Cargando celebraciones…</p>;
  const lista = catalogo.cosmeticos.filter((c) => c.tipo === 'celebracion' && c.datos && (c.gratuito || c.poseido === true));
  const actual = elegida ?? CELEBRACION_DEL_JUEGO;
  const ver = (id: string) => setVista((v) => ({ id, n: (v?.n ?? 0) + 1 }));
  const enVista = vista && lista.find((c) => c.id === vista.id);
  return (
    <div className="selector-celebracion">
      <div className="selector-cosmeticos" role="group" aria-label="Celebración de gol" onKeyDown={moverFoco}>
        <ul className="opciones-celebracion">
          {lista.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="secundario"
                data-cosmetico={c.id}
                aria-pressed={c.id === actual}
                disabled={desactivado}
                onClick={() => {
                  if (c.id !== actual) onElegir(c.id);
                  ver(c.id);
                }}
              >
                {c.nombre}
              </button>
            </li>
          ))}
        </ul>
        {/* Las de pago que faltan, en la tienda (spec 012, ronda 3). */}
        {catalogo.cosmeticos.some((c) => c.tipo === 'celebracion' && !c.gratuito && !c.poseido) && (
          <Link className="nota" to="/tienda?seccion=cosmeticos&sub=celebraciones">
            Más celebraciones en la tienda
          </Link>
        )}
      </div>
      <div className="vista-previa-celebracion" aria-label="Vista previa de la celebración">
        {enVista ? (
          <CapaCelebracion
            key={vista.n}
            celebracion={{ id: enVista.id, datos: enVista.datos! }}
            equipo={{ nombre: 'Tu equipo', escudo, color: 'var(--color-accion)' }}
            goleador="Tu goleador"
            vistaPrevia
            onFin={() => setVista(null)}
          />
        ) : (
          <button type="button" className="secundario" onClick={() => ver(actual)}>
            Ver la celebración
          </button>
        )}
      </div>
    </div>
  );
}
