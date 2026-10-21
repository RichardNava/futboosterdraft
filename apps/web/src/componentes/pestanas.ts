/**
 * Teclado en una lista de pestañas (spec 004, FR-030): flechas izquierda y derecha, Inicio y Fin mueven el foco y
 * activan la pestaña (como un clic). Se pone en el `onKeyDown` del contenedor `role="tablist"`.
 */
import type { KeyboardEvent } from 'react';

export function alTeclaPestanas(e: KeyboardEvent<HTMLElement>): void {
  const pestanas = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]'));
  const actual = pestanas.indexOf(e.target as HTMLElement);
  if (actual < 0) return;
  const destino =
    e.key === 'ArrowRight' ? (actual + 1) % pestanas.length : e.key === 'ArrowLeft' ? (actual - 1 + pestanas.length) % pestanas.length : e.key === 'Home' ? 0 : e.key === 'End' ? pestanas.length - 1 : -1;
  if (destino < 0) return;
  e.preventDefault();
  pestanas[destino]!.focus();
  pestanas[destino]!.click();
}
