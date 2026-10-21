import { chocan, DISENOS_CAMISETA, parametrosActuales, type DisenoCamiseta, type Equipacion, type Equipaciones } from '@fbd/domain';
import { Camiseta } from './Camiseta';

const ETIQUETA_DISENO: Record<DisenoCamiseta, string> = {
  lisa: 'Lisa',
  rayas: 'Rayas verticales',
  franjas: 'Franjas horizontales',
  banda: 'Banda diagonal',
  mitades: 'Mitades',
};

/** Colores que toma una equipación al añadirle un segundo o tercer color. */
const COLOR_NUEVO = ['#ffffff', '#202020', '#f0c000']; // lint-tokens: datos de equipación

interface Props {
  equipaciones: Equipaciones;
  onChange: (e: Equipaciones) => void;
}

/** ¿Se pueden guardar? La primera y la segunda no pueden parecerse demasiado (FR-047). */
export function equipacionesParecidas(e: Equipaciones): boolean {
  return chocan(e.primera, e.segunda, parametrosActuales());
}

/**
 * Editor de las equipaciones (spec 003, FR-045; research R24): diseño, de 1 a 3 colores y vista previa en vivo de
 * cada una. Si la primera y la segunda se parecen demasiado, lo avisa (y quien lo usa bloquea el guardado).
 */
export function EditorEquipacion({ equipaciones, onChange }: Props) {
  const cambiar = (cual: 'primera' | 'segunda', e: Equipacion) => onChange({ ...equipaciones, [cual]: e });
  const parecidas = equipacionesParecidas(equipaciones);

  return (
    <div className="editor-equipacion">
      <div className="equipaciones">
        {(['primera', 'segunda'] as const).map((cual) => {
          const e = equipaciones[cual];
          const titulo = cual === 'primera' ? 'Primera equipación' : 'Segunda equipación';
          return (
            <fieldset key={cual} data-equipacion={cual}>
              <legend>{titulo}</legend>
              <Camiseta equipacion={e} etiqueta={`Vista previa de la ${titulo.toLowerCase()}`} />
              <label>
                Diseño{' '}
                <select value={e.diseno} onChange={(ev) => cambiar(cual, { ...e, diseno: ev.target.value as DisenoCamiseta })}>
                  {DISENOS_CAMISETA.map((d) => (
                    <option key={d} value={d}>
                      {ETIQUETA_DISENO[d]}
                    </option>
                  ))}
                </select>
              </label>
              {e.colores.map((c, i) => (
                <label key={i}>
                  {`Color ${i + 1}`}{' '}
                  <input
                    type="color"
                    value={c}
                    onChange={(ev) => {
                      const colores = [...e.colores];
                      colores[i] = ev.target.value;
                      cambiar(cual, { ...e, colores: colores as Equipacion['colores'] });
                    }}
                  />
                </label>
              ))}
              <div className="acciones-colores">
                {e.colores.length < 3 && (
                  <button
                    type="button"
                    className="secundario"
                    onClick={() => cambiar(cual, { ...e, colores: [...e.colores, COLOR_NUEVO[e.colores.length]!] as Equipacion['colores'] })}
                  >
                    Añadir color
                  </button>
                )}
                {e.colores.length > 1 && (
                  <button type="button" className="secundario" onClick={() => cambiar(cual, { ...e, colores: e.colores.slice(0, -1) as Equipacion['colores'] })}>
                    Quitar color
                  </button>
                )}
              </div>
            </fieldset>
          );
        })}
      </div>
      {parecidas && (
        <p className="error" role="alert">
          La primera y la segunda equipación se parecen demasiado
        </p>
      )}
    </div>
  );
}
