/**
 * Textos de los rasgos tal como se muestran en la interfaz (`GET /api/catalogo/rasgos`). Salen de la tabla única de
 * rasgos del dominio (spec 005, research R8): el servidor no duplica ningún texto.
 */
import { DEFECTOS, RASGOS, TODAS_LAS_VIRTUDES, type AmbitoRasgo, type Rasgo } from '@fbd/domain';

export interface TextoRasgo {
  id: Rasgo;
  nombre: string;
  descripcion: string;
  ambito: AmbitoRasgo;
  impacto: number;
}

function texto(id: Rasgo): TextoRasgo {
  const { nombre, descripcion, ambito, impacto } = RASGOS[id];
  return { id, nombre, descripcion, ambito, impacto };
}

export const TEXTOS_RASGOS: { virtudes: TextoRasgo[]; defectos: TextoRasgo[] } = {
  virtudes: TODAS_LAS_VIRTUDES.map(texto),
  defectos: DEFECTOS.map(texto),
};
