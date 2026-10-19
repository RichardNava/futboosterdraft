/**
 * Colores de una equipación v2 para las chapas y los marcadores (spec 003, FR-045, FR-046): el principal y el del
 * dorsal (su contraste).
 */
import { colorDorsal, principal, type Equipacion } from '@fbd/domain';

export interface ColoresChapa {
  principal: string;
  secundario: string;
}

export function coloresDe(e: Equipacion): ColoresChapa {
  return { principal: principal(e), secundario: colorDorsal(e) };
}
