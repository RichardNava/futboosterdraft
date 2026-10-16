import { FORMACIONES, FORMACIONES_IDS, validarTactica, type FormacionId, type Tactica } from '@fbd/domain';
import { useState } from 'react';
import type { Ack } from '../conexion/ws';
import type { CartaResumen } from './CartaJugador';
import { PanelTactica } from './PanelTactica';

export interface AlineacionPartido {
  formacion: FormacionId;
  titulares: { casillaId: string; jugador: CartaResumen }[];
  suplentes: CartaResumen[];
  tactica: Tactica;
}

interface Props {
  alineacion: AlineacionPartido;
  /** Jugadores que ya no pueden jugar (sustituidos, lesionados o expulsados). */
  noDisponibles: Set<number>;
  /** Jugadores en el campo ahora mismo. */
  enCampo: Set<number>;
  enviar: (tipo: 'sustitucion' | 'formacion' | 'tactica', datos: Record<string, unknown>) => Promise<Ack>;
  /** Mensaje de estado (p. ej. "se aplicará en la próxima interrupción"). */
  aviso?: string;
}

/** Quién está en el campo y quién ya no puede jugar, según los eventos (sustituciones, rojas y lesiones). */
export function estadoJugadores(
  alineacion: AlineacionPartido,
  eventos: readonly { equipo: string; tipo: string; jugadores: { rol: string; jugadorId: number }[] }[],
  lado: 'local' | 'visitante',
): { enCampo: Set<number>; fuera: Set<number> } {
  const enCampo = new Set(alineacion.titulares.map((t) => t.jugador.id));
  const fuera = new Set<number>();
  for (const e of eventos) {
    if (e.equipo !== lado) continue;
    const id = (rol: string) => e.jugadores.find((j) => j.rol === rol)?.jugadorId;
    if (e.tipo === 'sustitucion') {
      enCampo.delete(id('sale')!);
      fuera.add(id('sale')!);
      enCampo.add(id('entra')!);
    } else if (e.tipo === 'roja' || e.tipo === 'lesion') {
      enCampo.delete(id('autor')!);
      fuera.add(id('autor')!);
    }
  }
  return { enCampo, fuera };
}

/** Sustituciones, formación y táctica durante el partido (FR-045, FR-050). */
export function PanelCambios({ alineacion, noDisponibles, enCampo, enviar, aviso }: Props) {
  const todos = [...alineacion.titulares.map((t) => t.jugador), ...alineacion.suplentes];
  const enCampoLista = todos.filter((j) => enCampo.has(j.id));
  const banquillo = todos.filter((j) => !enCampo.has(j.id) && !noDisponibles.has(j.id));
  const [sale, setSale] = useState<number | ''>('');
  const [entra, setEntra] = useState<number | ''>('');
  const [formacion, setFormacion] = useState<FormacionId>(alineacion.formacion);
  const [tactica, setTactica] = useState<Tactica>(alineacion.tactica);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);

  const ejecutar = async (tipo: 'sustitucion' | 'formacion' | 'tactica', datos: Record<string, unknown>, exito: string) => {
    try {
      const ack = await enviar(tipo, datos);
      setMensaje(ack.ok ? { ok: true, texto: exito } : { ok: false, texto: ack.error?.mensaje ?? 'No se pudo aplicar' });
    } catch (e) {
      setMensaje({ ok: false, texto: (e as Error).message });
    }
  };

  const nombre = (j: CartaResumen) => `${j.nombre} ${j.apellidos.split(' ')[0]} (${j.demarcacion} ${Math.round(j.media)})`;

  return (
    <section className="panel-cambios" aria-label="Cambios">
      <h2>Cambios</h2>
      {aviso && <p className="nota">{aviso}</p>}
      <div className="fila-cambio">
        <label>
          Sale{' '}
          <select value={sale} onChange={(e) => setSale(e.target.value ? Number(e.target.value) : '')}>
            <option value="">—</option>
            {enCampoLista.map((j) => (
              <option key={j.id} value={j.id}>
                {nombre(j)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Entra{' '}
          <select value={entra} onChange={(e) => setEntra(e.target.value ? Number(e.target.value) : '')}>
            <option value="">—</option>
            {banquillo.map((j) => (
              <option key={j.id} value={j.id}>
                {nombre(j)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={sale === '' || entra === ''}
          onClick={() => void ejecutar('sustitucion', { sale, entra }, 'Sustitución pedida.')}
        >
          Hacer el cambio
        </button>
      </div>
      <div className="fila-cambio">
        <label>
          Formación{' '}
          <select value={formacion} onChange={(e) => setFormacion(e.target.value as FormacionId)}>
            {FORMACIONES_IDS.map((id) => (
              <option key={id} value={id}>
                {FORMACIONES[id].nombre}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="secundario" disabled={formacion === alineacion.formacion} onClick={() => void ejecutar('formacion', { formacion }, 'Cambio de formación pedido.')}>
          Cambiar formación
        </button>
      </div>
      <details>
        <summary>Táctica</summary>
        <PanelTactica tactica={tactica} onCambiar={setTactica} />
        <button
          type="button"
          className="secundario"
          disabled={validarTactica(tactica).length > 0}
          onClick={() => void ejecutar('tactica', { tactica }, 'Cambio táctico pedido.')}
        >
          Aplicar táctica
        </button>
      </details>
      {mensaje && (
        <p className={mensaje.ok ? 'exito' : 'error'} role={mensaje.ok ? 'status' : 'alert'}>
          {mensaje.texto}
        </p>
      )}
    </section>
  );
}
