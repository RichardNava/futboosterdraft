import { useEffect, useState } from 'react';
import { equipacionesAleatorias, NOMBRE_MAX, normalizarNombre, parametrosActuales, semillaDesdeTexto, validarNombre, type Equipaciones } from '@fbd/domain';
import { api, ErrorApi } from '../api/cliente';
import { BarraPrincipal } from '../componentes/BarraPrincipal';
import { EditorEquipacion, equipacionesParecidas } from '../componentes/EditorEquipacion';
import { useSesion } from '../estado/sesion';

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
        <h1>Mi perfil</h1>
        <p>El perfil es para usuarios registrados. Crea una cuenta para guardar tu nombre y tus equipaciones.</p>
      </main>
    );
  }
  if (!cargado || !equipaciones) return <p className="cargando">{mensaje ?? 'Cargando perfil…'}</p>;

  const errorNombre = normalizarNombre(nombre) === '' ? null : (validarNombre(nombre, [])[0]?.mensaje ?? null);
  const motivo = errorNombre ?? (equipacionesParecidas(equipaciones) ? 'La primera y la segunda equipación se parecen demasiado' : null);

  return (
    <main className="pantalla perfil">
      <h1>Mi perfil</h1>
      <p className="nota">Se usan como valores por defecto al crear o unirte a una partida.</p>
      <label>
        Nombre del equipo{' '}
        <input value={nombre} maxLength={40} onChange={(e) => setNombre(e.target.value)} aria-invalid={errorNombre ? true : undefined} />
      </label>
      <p className={errorNombre ? 'error' : 'nota'}>{errorNombre ?? `${normalizarNombre(nombre).length}/${NOMBRE_MAX} caracteres`}</p>
      <EditorEquipacion equipaciones={equipaciones} onChange={setEquipaciones} />
      <BarraPrincipal
        principal={{
          etiqueta: 'Guardar',
          motivoDesactivado: motivo,
          onClick: async () => {
            await api('/api/perfil', { metodo: 'PUT', cuerpo: { nombreEquipo: normalizarNombre(nombre) || null, equipaciones } });
            setMensaje('Perfil guardado.');
          },
        }}
        estado={mensaje}
      />
    </main>
  );
}
