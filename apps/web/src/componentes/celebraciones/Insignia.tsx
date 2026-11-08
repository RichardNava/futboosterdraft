import { Chapa } from '../Marcador';
import type { EquipoCelebracion } from './tipos';

/** Escudo (o círculo de color) del equipo que marca, en grande. */
export function Insignia({ equipo }: { equipo: EquipoCelebracion }) {
  return (
    <span className="celebracion-insignia">
      <Chapa color={equipo.color} escudo={equipo.escudo ?? null} nombre={equipo.nombre} grande />
    </span>
  );
}
