/**
 * Avisos (spec 004, FR-003, FR-026, FR-027; data-model §2; contracts/ui.md §8 y §9): superficie de panel, borde
 * izquierdo e icono por tipo y siempre con texto. Ninguno usa el lima. `RegionAvisos` apila los emergentes sobre
 * la barra principal: como mucho 3 a la vista, los nuevos arriba.
 */
import { useState, type ReactNode } from 'react';
import { cerrarAviso, useAvisos } from '../estado/avisos';
import { Icono } from './Icono';

export type TipoAviso = 'informacion' | 'exito' | 'advertencia' | 'error';

const ETIQUETA_TIPO: Record<TipoAviso, string> = {
  informacion: 'Información',
  exito: 'Hecho',
  advertencia: 'Advertencia',
  error: 'Error',
};

interface Props {
  tipo: TipoAviso;
  children: ReactNode;
  /** Botones o enlaces bajo el texto («Reintentar ahora», «Entendido»…). */
  acciones?: ReactNode;
  onCerrar?: () => void;
  className?: string;
  /** Rol de región viva; por defecto `alert` para los errores y `status` para el resto. */
  rol?: 'status' | 'alert' | 'none';
  id?: string;
}

export function Aviso({ tipo, children, acciones, onCerrar, className, rol, id }: Props) {
  const role = rol ?? (tipo === 'error' ? 'alert' : 'status');
  return (
    <div id={id} className={['aviso', tipo, className].filter(Boolean).join(' ')} role={role === 'none' ? undefined : role} data-tipo={tipo}>
      <Icono nombre={tipo} etiqueta={ETIQUETA_TIPO[tipo]} />
      <div className="aviso-texto">
        {children}
        {acciones && <div className="aviso-acciones">{acciones}</div>}
      </div>
      {onCerrar && (
        <button type="button" className="texto" aria-label="Cerrar aviso" onClick={onCerrar}>
          <Icono nombre="cerrar" />
        </button>
      )}
    </div>
  );
}

const MAX_VISIBLES = 3;

/** Región fija de avisos emergentes, montada una vez en el `Marco` (research R12). */
export function RegionAvisos() {
  const avisos = useAvisos((s) => s.avisos);
  const [todos, setTodos] = useState(false);
  const visibles = todos ? avisos : avisos.slice(0, MAX_VISIBLES);
  const ocultos = avisos.length - visibles.length;
  const hayError = avisos.some((a) => a.tipo === 'error');
  return (
    <div className="region-avisos" aria-live={hayError ? 'assertive' : 'polite'} aria-label="Avisos" role="region">
      {visibles.map((a) => (
        <Aviso
          key={a.id}
          tipo={a.tipo}
          onCerrar={a.persistente ? undefined : () => cerrarAviso(a.id)}
          acciones={
            a.accion && (
              <button type="button" className="secundario" onClick={a.accion.onClick}>
                {a.accion.etiqueta}
              </button>
            )
          }
        >
          <p>{a.texto}</p>
        </Aviso>
      ))}
      {ocultos > 0 && (
        <button type="button" className="texto mas-avisos" onClick={() => setTodos(true)}>
          y {ocultos} {ocultos === 1 ? 'aviso más' : 'avisos más'}
        </button>
      )}
      {todos && avisos.length > MAX_VISIBLES && (
        <button type="button" className="texto mas-avisos" onClick={() => setTodos(false)}>
          Mostrar menos
        </button>
      )}
    </div>
  );
}

/** Pantalla que no ha podido cargar sus datos: qué ha pasado y cómo reintentarlo (data-model §4). */
export function PantallaError({ mensaje }: { mensaje: string }) {
  return (
    <main className="pantalla">
      <Aviso
        tipo="error"
        acciones={
          <button type="button" className="secundario" onClick={() => window.location.reload()}>
            Volver a intentarlo
          </button>
        }
      >
        <p>{mensaje}</p>
      </Aviso>
    </main>
  );
}
