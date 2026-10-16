import type { Tactica } from '@fbd/domain';

interface Props {
  tactica: Tactica;
  onCambiar: (t: Tactica) => void;
}

/** Opciones tácticas agrupadas (FR-029): las incompatibles se deshabilitan. */
export function PanelTactica({ tactica, onCambiar }: Props) {
  const cambiar = (cambios: Partial<Tactica>) => onCambiar({ ...tactica, ...cambios });
  return (
    <div className="panel-tactica">
      <fieldset>
        <legend>Sistema defensivo</legend>
        <label className="opcion">
          <input type="radio" checked={tactica.sistemaDefensivo === 'zona'} onChange={() => cambiar({ sistemaDefensivo: 'zona' })} />
          Defensa en zona
        </label>
        <label className="opcion">
          <input
            type="radio"
            checked={tactica.sistemaDefensivo === 'individual'}
            onChange={() => cambiar({ sistemaDefensivo: 'individual' })}
          />
          Marcaje individual
        </label>
      </fieldset>

      <fieldset>
        <legend>Altura del bloque</legend>
        {(
          [
            ['catenaccio', 'Catenaccio'],
            ['medio', 'Bloque medio'],
            ['presion_alta', 'Presión alta'],
          ] as const
        ).map(([valor, texto]) => (
          <label key={valor} className="opcion">
            <input
              type="radio"
              checked={tactica.alturaBloque === valor}
              onChange={() => cambiar({ alturaBloque: valor, ...(valor === 'catenaccio' ? { lineaAdelantada: false } : {}) })}
            />
            {texto}
          </label>
        ))}
        <label className="opcion">
          <input
            type="checkbox"
            checked={tactica.lineaAdelantada}
            disabled={tactica.alturaBloque === 'catenaccio'}
            onChange={(e) => cambiar({ lineaAdelantada: e.target.checked })}
          />
          Línea adelantada
          {tactica.alturaBloque === 'catenaccio' && <span className="nota"> (no compatible con Catenaccio)</span>}
        </label>
      </fieldset>

      <fieldset>
        <legend>Estilo con balón</legend>
        {(
          [
            ['equilibrado', 'Equilibrado'],
            ['contraataque', 'Contraataque'],
            ['combinativo', 'Juego combinativo'],
          ] as const
        ).map(([valor, texto]) => (
          <label key={valor} className="opcion">
            <input
              type="radio"
              checked={tactica.estiloConBalon === valor}
              onChange={() => cambiar({ estiloConBalon: valor, ...(valor === 'combinativo' ? { juegoVertical: false } : {}) })}
            />
            {texto}
          </label>
        ))}
        <label className="opcion">
          <input
            type="checkbox"
            checked={tactica.juegoVertical}
            disabled={tactica.estiloConBalon === 'combinativo'}
            onChange={(e) => cambiar({ juegoVertical: e.target.checked })}
          />
          Juego vertical
          {tactica.estiloConBalon === 'combinativo' && <span className="nota"> (no compatible con Juego combinativo)</span>}
        </label>
      </fieldset>
    </div>
  );
}
