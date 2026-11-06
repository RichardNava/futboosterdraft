/**
 * Selector del diseño del sobre (spec 011, US2; contracts/ui.md §4; solo en «Mi perfil»): un interruptor
 * «Carrusel»; apagado, se elige un favorito; encendido, se marcan varios que se alternan sin repetirse. Cada
 * miniatura muestra la versión rasgada al pasar el ratón o al enfocarla. Los bloqueados llevan candado y «Ver en
 * la tienda».
 */
import type { Aspecto, Cosmetico } from '@fbd/protocol';
import { Link } from 'react-router';
import { useCatalogoCosmeticos } from '../estado/cosmeticos';
import { SobreArte } from './arte/SobreArte';
import { Icono } from './Icono';
import { moverFoco, ordenarCosmeticos as ordenar } from './SelectorEscudo';

interface Props {
  aspecto: Aspecto;
  onCambiar: (cambios: Partial<Pick<Aspecto, 'sobreFavorito' | 'sobreCarrusel' | 'sobresMarcados'>>) => void;
  desactivado?: boolean;
}

function Miniatura({ c }: { c: Cosmetico }) {
  return (
    <span className="miniatura-sobre">
      <SobreArte diseno={c.id} mini className="sobre-cerrado-mini" />
      <SobreArte diseno={c.id} mini rasgado className="sobre-rasgado-mini" />
    </span>
  );
}

export function SelectorSobre({ aspecto, onCambiar, desactivado = false }: Props) {
  const { catalogo, error } = useCatalogoCosmeticos();
  if (error && !catalogo) return <p className="nota">No se han podido cargar los sobres.</p>;
  if (!catalogo) return <p className="nota">Cargando sobres…</p>;
  const { sobreCarrusel: carrusel, sobresMarcados: marcados, sobreFavorito: favorito } = aspecto;
  const { disponibles, bloqueados } = ordenar(
    catalogo.cosmeticos.filter((c) => c.tipo === 'sobre'),
    carrusel ? null : favorito,
    false,
  );
  const alternar = (id: string) =>
    onCambiar({
      sobresMarcados: marcados.includes(id) ? marcados.filter((x) => x !== id) : [...marcados, id],
    });
  return (
    <div className="selector-cosmeticos selector-sobres">
      <label className="interruptor">
        <input
          type="checkbox"
          role="switch"
          checked={carrusel}
          disabled={desactivado}
          onChange={(e) => onCambiar({ sobreCarrusel: e.target.checked })}
        />
        Carrusel
      </label>
      {carrusel && <p className="nota">Se alternan sin repetirse. Marca los que quieras.</p>}
      <div
        role="group"
        aria-label={carrusel ? 'Sobres del carrusel' : 'Sobre favorito'}
        onKeyDown={moverFoco}
      >
        <ul className="rejilla-cosmeticos">
          {disponibles.map((c) => {
            const activo = carrusel ? marcados.includes(c.id) : c.id === favorito;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  className="opcion-cosmetico"
                  data-cosmetico={c.id}
                  {...(carrusel ? { role: 'checkbox', 'aria-checked': activo } : { 'aria-pressed': activo })}
                  aria-label={c.nombre}
                  title={c.nombre}
                  disabled={desactivado}
                  onClick={() => (carrusel ? alternar(c.id) : onCambiar({ sobreFavorito: c.id }))}
                >
                  <Miniatura c={c} />
                </button>
              </li>
            );
          })}
          {bloqueados.map((c) => (
            <li key={c.id} className="cosmetico-bloqueado">
              <span className="opcion-cosmetico" title={`${c.nombre}: bloqueado`}>
                <Miniatura c={c} />
                <Icono nombre="candado" etiqueta={`${c.nombre} (bloqueado)`} className="candado" />
              </span>
            </li>
          ))}
        </ul>
      </div>
      {bloqueados.length > 0 && (
        <Link className="enlace-tienda" to="/tienda#sobres">
          Ver en la tienda
        </Link>
      )}
    </div>
  );
}
