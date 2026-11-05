/**
 * Selector de escudos (spec 011, US1; contracts/ui.md §3): primero el elegido y los disponibles; después los
 * bloqueados, con candado y «Ver en la tienda». Los invitados solo ven los gratuitos. Se usa en «Mi perfil» y en la
 * Alineación. Rejilla con desplazamiento propio (Principio XI) y flechas para moverse entre escudos.
 */
import type { Cosmetico } from '@fbd/protocol';
import type { KeyboardEvent } from 'react';
import { Link } from 'react-router';
import { useCatalogoCosmeticos } from '../estado/cosmeticos';
import { urlEscudo } from './chapa';
import { Icono } from './Icono';

interface Props {
  /** Escudo mostrado como elegido. */
  elegido: string | null;
  onElegir: (id: string) => void;
  /** Sin cuenta registrada: solo los gratuitos, sin bloqueados. */
  invitado?: boolean;
  desactivado?: boolean;
  etiqueta?: string;
}

/** Disponibles (con el elegido primero) y bloqueados, en el orden del catálogo. */
export function ordenarCosmeticos(lista: readonly Cosmetico[], elegido: string | null, invitado: boolean) {
  const disponible = (c: Cosmetico) => c.gratuito || c.poseido === true;
  const disponibles = lista.filter(disponible);
  return {
    disponibles: [...disponibles.filter((c) => c.id === elegido), ...disponibles.filter((c) => c.id !== elegido)],
    bloqueados: invitado ? [] : lista.filter((c) => !disponible(c)),
  };
}

/** Flechas: mueven el foco al escudo anterior o siguiente de la rejilla (Enter y espacio eligen, como en un botón). */
export function moverFoco(e: KeyboardEvent<HTMLElement>): void {
  const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
  if (!delta) return;
  const botones = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('button[data-cosmetico]')];
  const i = botones.indexOf(document.activeElement as HTMLButtonElement);
  const siguiente = botones[Math.min(botones.length - 1, Math.max(0, i + delta))];
  if (siguiente) {
    e.preventDefault();
    siguiente.focus();
  }
}

export function SelectorEscudo({ elegido, onElegir, invitado = false, desactivado = false, etiqueta = 'Escudo' }: Props) {
  const { catalogo, error } = useCatalogoCosmeticos();
  if (error && !catalogo) return <p className="nota">No se han podido cargar los escudos.</p>;
  if (!catalogo) return <p className="nota">Cargando escudos…</p>;
  const { disponibles, bloqueados } = ordenarCosmeticos(
    catalogo.cosmeticos.filter((c) => c.tipo === 'escudo'),
    elegido,
    invitado,
  );
  return (
    <div className="selector-cosmeticos selector-escudos" role="group" aria-label={etiqueta} onKeyDown={moverFoco}>
      <ul className="rejilla-cosmeticos">
        {disponibles.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className="opcion-cosmetico"
              data-cosmetico={c.id}
              aria-pressed={c.id === elegido}
              aria-label={c.nombre}
              title={c.nombre}
              disabled={desactivado}
              onClick={() => onElegir(c.id)}
            >
              <img src={urlEscudo(c.id, 256)} alt="" width={64} height={64} loading="lazy" />
            </button>
          </li>
        ))}
        {bloqueados.map((c) => (
          <li key={c.id} className="cosmetico-bloqueado">
            <span className="opcion-cosmetico" title={`${c.nombre}: bloqueado`}>
              <img src={urlEscudo(c.id, 256)} alt={`${c.nombre} (bloqueado)`} width={64} height={64} loading="lazy" />
              <Icono nombre="candado" etiqueta="Bloqueado" className="candado" />
            </span>
          </li>
        ))}
      </ul>
      {bloqueados.length > 0 && (
        <Link className="enlace-tienda" to="/tienda#escudos">
          Ver en la tienda
        </Link>
      )}
    </div>
  );
}
