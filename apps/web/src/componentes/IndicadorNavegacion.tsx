import { useEffect, useMemo, useState } from 'react';
import { useNavigation } from 'react-router';

/** Una navegación que tarda menos que esto no muestra nada (spec 014, FR-027). */
const RETARDO_INDICADOR_MS = 2000;

/**
 * Retardo del indicador (FR-027, FR-028): `seguir(clave)` con la navegación en curso (`null` = ninguna). El indicador
 * aparece si la misma navegación sigue en curso a los `ms`; una navegación nueva reinicia la cuenta y una abandonada no
 * deja indicador.
 */
export function crearRetardoIndicador(mostrar: (visible: boolean) => void, ms = RETARDO_INDICADOR_MS) {
  let actual: string | null = null;
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const parar = () => {
    clearTimeout(temporizador);
    temporizador = undefined;
  };
  return {
    seguir(clave: string | null) {
      if (clave === actual) return;
      actual = clave;
      parar();
      mostrar(false);
      if (clave !== null) temporizador = setTimeout(() => mostrar(true), ms);
    },
    parar,
  };
}

/** Barra fina bajo la navegación cuando cambiar de pantalla tarda más de 2 s (research R8; contrato U2). */
export function IndicadorNavegacion() {
  const navegacion = useNavigation();
  const [visible, setVisible] = useState(false);
  const retardo = useMemo(() => crearRetardoIndicador(setVisible), []);
  const clave = navegacion.state === 'idle' ? null : `${navegacion.location?.pathname ?? ''}${navegacion.location?.search ?? ''}#${navegacion.location?.key ?? ''}`;
  useEffect(() => retardo.seguir(clave), [retardo, clave]);
  useEffect(() => retardo.parar, [retardo]);
  if (!visible) return null;
  return (
    <div className="indicador-navegacion" role="status">
      <span className="solo-lectores">Cargando…</span>
    </div>
  );
}
