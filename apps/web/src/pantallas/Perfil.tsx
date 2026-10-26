import { Link, useNavigate } from 'react-router';
import { EstadoVacio } from '../componentes/EstadoVacio';
import { useEffect, useState } from 'react';
import { equipacionesAleatorias, NOMBRE_MAX, normalizarNombre, parametrosActuales, semillaDesdeTexto, type Equipaciones } from '@fbd/domain';
import { api, ErrorApi } from '../api/cliente';
import { BarraPrincipal } from '../componentes/BarraPrincipal';
import { errorNombre as mensajeNombre } from '../componentes/CampoNombreEquipo';
import { EditorEquipacion, equipacionesParecidas } from '../componentes/EditorEquipacion';
import { mostrarAviso } from '../estado/avisos';
import { useSesion } from '../estado/sesion';
import { PantallaCargando } from '../componentes/Esqueleto';
import { Aviso } from '../componentes/Aviso';
import { Dialogo } from '../componentes/Dialogo';

interface PerfilVista {
  nombreEquipo: string | null;
  equipaciones: Equipaciones | null;
}

/**
 * «Mi perfil» (spec 003, FR-042a, FR-045; contracts/ui.md): nombre de equipo y equipaciones por defecto para las
 * partidas nuevas. Solo para usuarios registrados. «Guardar» es el botón principal.
 */
export function Perfil() {
  const usuario = useSesion((s) => s.usuario);
  const [nombre, setNombre] = useState('');
  const [equipaciones, setEquipaciones] = useState<Equipaciones | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    if (usuario?.tipo !== 'registrado') return;
    api<PerfilVista>('/api/perfil')
      .then((p) => {
        setNombre(p.nombreEquipo ?? '');
        setEquipaciones(p.equipaciones ?? equipacionesAleatorias(semillaDesdeTexto(usuario.id), parametrosActuales()));
        setCargado(true);
      })
      .catch((e: unknown) => setMensaje(e instanceof ErrorApi ? e.message : 'No se pudo cargar el perfil'));
  }, [usuario]);

  if (usuario?.tipo !== 'registrado') {
    return (
      <main className="pantalla">
        <header className="cabecera-pantalla">
          <h1>Mi perfil</h1>
        </header>
        <EstadoVacio
          mensaje="El perfil es para usuarios registrados. Crea una cuenta para guardar tu nombre y tus equipaciones."
          accion={
            <Link className="boton secundario" to="/?acceso=registro">
              Crear cuenta
            </Link>
          }
        />
      </main>
    );
  }
  if (!cargado || !equipaciones) {
    if (mensaje)
      return (
        <main className="pantalla">
          <h1>Mi perfil</h1>
          <Aviso tipo="error">
            <p>{mensaje}</p>
          </Aviso>
        </main>
      );
    return <PantallaCargando forma="filas" texto="Cargando el perfil…" />;
  }

  const errorNombre = normalizarNombre(nombre) === '' ? null : mensajeNombre(nombre, []);
  const motivo = errorNombre ?? (equipacionesParecidas(equipaciones) ? 'La primera y la segunda equipación se parecen demasiado' : null);

  return (
    <main className="pantalla perfil">
      <h1>Mi perfil</h1>
      <p className="nota">Se usan como valores por defecto al crear o unirte a una partida.</p>
      <div className="perfil-nombre">
        <label htmlFor="perfil-nombre">Nombre del equipo</label>
        <input
          id="perfil-nombre"
          value={nombre}
          maxLength={40}
          onChange={(e) => setNombre(e.target.value)}
          aria-invalid={errorNombre ? true : undefined}
          aria-describedby="perfil-nombre-ayuda"
        />
        <p id="perfil-nombre-ayuda" className={errorNombre ? 'error ayuda-campo' : 'nota ayuda-campo'}>
          {errorNombre ?? `${normalizarNombre(nombre).length}/${NOMBRE_MAX} caracteres`}
        </p>
      </div>
      <EditorEquipacion equipaciones={equipaciones} onChange={setEquipaciones} />
      <EliminarCuenta />
      <BarraPrincipal
        principal={{
          etiqueta: 'Guardar',
          motivoDesactivado: motivo,
          onClick: async () => {
            await api('/api/perfil', { metodo: 'PUT', cuerpo: { nombreEquipo: normalizarNombre(nombre) || null, equipaciones } });
            mostrarAviso('exito', 'Perfil guardado');
          },
        }}
      />
    </main>
  );
}

/** Eliminar la cuenta, con confirmación: borra la colección, los fragmentos y las partidas creadas, y cierra la sesión. */
function EliminarCuenta() {
  const navegar = useNavigate();
  const [confirmando, setConfirmando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const eliminar = async () => {
    setBorrando(true);
    try {
      await api('/api/cuenta', { metodo: 'DELETE' });
      useSesion.setState({ usuario: null });
      mostrarAviso('exito', 'Cuenta eliminada');
      navegar('/');
    } catch (e) {
      mostrarAviso('error', e instanceof ErrorApi ? e.message : 'No se ha podido eliminar la cuenta');
      setBorrando(false);
    }
  };
  return (
    <section className="perfil-eliminar" aria-labelledby="titulo-eliminar-cuenta">
      <h2 id="titulo-eliminar-cuenta">Eliminar la cuenta</h2>
      <p className="nota">Se borran tu colección, tus fragmentos, tus compras y las partidas que has creado. No se puede deshacer.</p>
      <button type="button" className="peligro" onClick={() => setConfirmando(true)}>
        Eliminar la cuenta
      </button>
      {confirmando && (
        <Dialogo etiquetadoPor="titulo-confirmar-eliminar" alEscape={() => setConfirmando(false)}>
          <h2 id="titulo-confirmar-eliminar">¿Eliminar la cuenta?</h2>
          <p>Perderás tu colección, tus fragmentos y tus partidas. En las partidas de otros, un NPC ocupará tu plaza.</p>
          <div className="acciones">
            <button type="button" className="secundario" onClick={() => setConfirmando(false)} autoFocus>
              Cancelar
            </button>
            <button type="button" className="peligro" onClick={() => void eliminar()} disabled={borrando}>
              Eliminar definitivamente
            </button>
          </div>
        </Dialogo>
      )}
    </section>
  );
}
