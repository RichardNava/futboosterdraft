/**
 * Insignia de estado (spec 004, FR-023; contracts/ui.md §6): fase, jornada, partidos sin ver… en blanco y grises.
 * Solo `advertencia` («Sin conexión») usa el ámbar, siempre con icono.
 */
import { Icono } from './Icono';

export function Insignia({ texto, tipo = 'normal', suave = false }: { texto: string; tipo?: 'normal' | 'advertencia'; suave?: boolean }) {
  // «etiqueta»: la clase que ya usaban las pantallas y las pruebas de la spec 003 para estas marcas (FR-038).
  const clases = ['insignia', 'etiqueta', suave ? 'suave' : '', tipo === 'advertencia' ? 'advertencia' : ''].filter(Boolean).join(' ');
  return (
    <span className={clases}>
      {tipo === 'advertencia' && <Icono nombre="advertencia" />}
      {texto}
    </span>
  );
}
