/**
 * Opciones tácticas (FR-029, FR-030; data-model §4.2).
 */
export const SISTEMAS_DEFENSIVOS = ['zona', 'individual'] as const;
export const ALTURAS_BLOQUE = ['catenaccio', 'medio', 'presion_alta'] as const;
export const ESTILOS_CON_BALON = ['equilibrado', 'contraataque', 'combinativo'] as const;

export interface Tactica {
  sistemaDefensivo: (typeof SISTEMAS_DEFENSIVOS)[number];
  alturaBloque: (typeof ALTURAS_BLOQUE)[number];
  lineaAdelantada: boolean;
  estiloConBalon: (typeof ESTILOS_CON_BALON)[number];
  juegoVertical: boolean;
}

export function tacticaPorDefecto(): Tactica {
  return {
    sistemaDefensivo: 'zona',
    alturaBloque: 'medio',
    lineaAdelantada: false,
    estiloConBalon: 'equilibrado',
    juegoVertical: false,
  };
}

export interface ErrorTactica {
  codigo: 'TACTICA_INCOMPATIBLE' | 'TACTICA_INVALIDA';
  mensaje: string;
}

export function validarTactica(t: Tactica): ErrorTactica[] {
  const errores: ErrorTactica[] = [];
  if (!SISTEMAS_DEFENSIVOS.includes(t.sistemaDefensivo)) errores.push({ codigo: 'TACTICA_INVALIDA', mensaje: 'Sistema defensivo desconocido' });
  if (!ALTURAS_BLOQUE.includes(t.alturaBloque)) errores.push({ codigo: 'TACTICA_INVALIDA', mensaje: 'Altura del bloque desconocida' });
  if (!ESTILOS_CON_BALON.includes(t.estiloConBalon)) errores.push({ codigo: 'TACTICA_INVALIDA', mensaje: 'Estilo con balón desconocido' });
  if (typeof t.lineaAdelantada !== 'boolean' || typeof t.juegoVertical !== 'boolean') {
    errores.push({ codigo: 'TACTICA_INVALIDA', mensaje: 'Opciones tácticas mal formadas' });
  }
  if (t.alturaBloque === 'catenaccio' && t.lineaAdelantada) {
    errores.push({ codigo: 'TACTICA_INCOMPATIBLE', mensaje: 'Línea adelantada no es compatible con Catenaccio' });
  }
  if (t.estiloConBalon === 'combinativo' && t.juegoVertical) {
    errores.push({ codigo: 'TACTICA_INCOMPATIBLE', mensaje: 'Juego vertical no es compatible con Juego combinativo' });
  }
  return errores;
}
