import { poner, useApi } from '../api/cache';
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
import { SelectorEscudo } from '../componentes/SelectorEscudo';
import { SelectorCelebracion } from '../componentes/SelectorCelebracion';
import { SelectorSobre } from '../componentes/SelectorSobre';
import { useAspecto } from '../estado/aspecto';
import type { CuerpoAspecto, EstadoPremium } from '@fbd/protocol';

interface PerfilVista {
  nombreEquipo: string | null;
  equipaciones: Equipaciones | null;
}

/**
 * «Mi perfil» (spec 003, FR-042a, FR-045; contracts/ui.md): nombre de equipo y equipaciones por defecto para las
 * partidas nuevas. Solo para usuarios registrados. «Guardar» es el botón principal.
 *
 * Spec 011 (US1, US2): el escudo y el diseño del sobre se guardan al elegirlos, sin pasar por «Guardar».
 */
export function Perfil() {
  const usuario = useSesion((s) => s.usuario);
  // Spec 014 (US6): el perfil sale de la caché (lo carga el loader); el formulario se rellena una sola vez con él.
  const perfil = useApi<PerfilVista>(usuario?.tipo === 'registrado' ? '/api/perfil' : null);
  const [editado, setEditado] = useState<{ nombre: string; equipaciones: Equipaciones } | null>(null);
  const base = perfil.datos && usuario
    ? { nombre: perfil.datos.nombreEquipo ?? '', equipaciones: perfil.datos.equipaciones ?? equipacionesAleatorias(semillaDesdeTexto(usuario.id), parametrosActuales()) }
    : null;
  const nombre = editado?.nombre ?? base?.nombre ?? '';
  const equipaciones = editado?.equipaciones ?? base?.equipaciones ?? null;
  const setNombre = (n: string) => base && setEditado({ nombre: n, equipaciones: equipaciones! });
  const setEquipaciones = (e: Equipaciones) => base && setEditado({ nombre, equipaciones: e });
  const cargado = base !== null;
  const mensaje = perfil.error ? (perfil.error instanceof ErrorApi ? perfil.error.message : 'No se pudo cargar el perfil') : null;

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
      <header className="perfil-cabecera">
        <h1>Mi perfil</h1>
        <EstadoPase />
      </header>
      <p className="nota">Se usan como valores por defecto al crear o unirte a una partida.</p>
      {/* Spec 013 (FR-031): [equipaciones] | [escudo + sobre] y la celebración debajo; una columna en estrecho. */}
      <div className="perfil-rejilla">
        <section className="perfil-equipaciones" aria-label="Nombre y equipaciones">
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
        </section>
        <AspectoPerfil />
      </div>
      <EliminarCuenta />
      <BarraPrincipal
        principal={{
          etiqueta: 'Guardar',
          motivoDesactivado: motivo,
          onClick: async () => {
            await api('/api/perfil', { metodo: 'PUT', cuerpo: { nombreEquipo: normalizarNombre(nombre) || null, equipaciones } });
            poner<PerfilVista>('/api/perfil', { ...perfil.datos!, nombreEquipo: normalizarNombre(nombre) || null, equipaciones: equipaciones! });
            mostrarAviso('exito', 'Perfil guardado');
          },
        }}
      />
    </main>
  );
}

/** Escudo, sobre y celebración de gol de la cuenta (specs 011 y 012): cada elección se guarda al momento. */
function AspectoPerfil() {
  const { aspecto, cargar, actualizar } = useAspecto();
  const [guardando, setGuardando] = useState(false);
  useEffect(() => {
    void cargar();
  }, [cargar]);
  if (!aspecto) return null;
  const guardar = async (cambios: CuerpoAspecto) => {
    setGuardando(true);
    try {
      await actualizar(cambios);
    } catch (e) {
      mostrarAviso('error', e instanceof ErrorApi ? e.message : 'No se ha podido guardar');
    } finally {
      setGuardando(false);
    }
  };
  return (
    <>
      <section className="perfil-escudo" aria-labelledby="titulo-escudo">
        <h2 id="titulo-escudo">Escudo</h2>
        {aspecto.escudoAsignado && <p className="nota">Te hemos asignado este escudo: elige otro cuando quieras.</p>}
        <SelectorEscudo elegido={aspecto.escudo} onElegir={(escudo) => void guardar({ escudo })} desactivado={guardando} />
      </section>
      <section className="perfil-sobre" aria-labelledby="titulo-sobre">
        <h2 id="titulo-sobre">Sobre</h2>
        <SelectorSobre aspecto={aspecto} onCambiar={(cambios) => void guardar(cambios)} desactivado={guardando} />
      </section>
      <section className="perfil-celebracion" aria-labelledby="titulo-celebracion">
        <h2 id="titulo-celebracion">Celebración de gol</h2>
        <p className="nota">Se ve en el campo cada vez que marcas en la simulación 2D. Vale para las partidas nuevas.</p>
        <SelectorCelebracion
          elegida={aspecto.celebracion}
          escudo={aspecto.escudo}
          onElegir={(celebracion) => void guardar({ celebracion })}
          desactivado={guardando}
        />
      </section>
    </>
  );
}

/** Fecha de fin del pase premium, o «Activo» con cortesía (spec 013, FR-034). Nada si no está activo. */
function EstadoPase() {
  const [premium, setPremium] = useState<EstadoPremium | null>(null);
  useEffect(() => {
    api<EstadoPremium>('/api/premium').then(setPremium).catch(() => setPremium(null));
  }, []);
  if (!premium?.activo) return null;
  return (
    <p className="insignia perfil-pase" data-testid="perfil-pase">
      Pase premium:{' '}
      {premium.cortesia || !premium.fin
        ? 'activo'
        : `activo hasta el ${new Date(premium.fin).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}`}
    </p>
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
