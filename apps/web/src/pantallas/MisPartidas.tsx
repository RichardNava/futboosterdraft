import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api, ErrorApi } from '../api/cliente';

interface PartidaResumen {
  id: string;
  modo: string;
  fase: string;
  nombreEquipo: string;
  rival?: string;
  jornadaActual?: number;
  accionPendiente?: 'elegir' | 'jugar' | 'ver' | 'siguiente_jornada';
  actualizadaEn: string;
}

const ACCION: Record<NonNullable<PartidaResumen['accionPendiente']>, { texto: string; ruta: string }> = {
  elegir: { texto: 'Elegir carta', ruta: 'draft' },
  jugar: { texto: 'Jugar el partido', ruta: 'alineacion' },
  ver: { texto: 'Ver partido', ruta: 'torneo' },
  siguiente_jornada: { texto: 'Siguiente jornada', ruta: 'torneo' },
};

const RUTA_FASE: Record<string, string> = { buscando: 'sala', en_draft: 'draft', en_torneo: 'torneo' };
const FASE: Record<string, string> = {
  buscando: 'Buscando jugadores',
  en_draft: 'Draft',
  en_torneo: 'Torneo',
  finalizada: 'Terminada',
  abandonada: 'Abandonada',
};
const MODO: Record<string, string> = { liga: 'Liga', playoff: 'Playoff' };

function Fila({ p }: { p: PartidaResumen }) {
  const accion = p.accionPendiente ? ACCION[p.accionPendiente] : null;
  const destino = `/partidas/${p.id}/${accion?.ruta ?? RUTA_FASE[p.fase] ?? 'torneo'}`;
  return (
    <li>
      <span>
        <strong>{p.nombreEquipo}</strong> · {MODO[p.modo] ?? p.modo} · {FASE[p.fase] ?? p.fase}
        {p.jornadaActual !== undefined && ` · jornada ${p.jornadaActual}`}
        {p.rival && ` · contra ${p.rival}`}
      </span>
      <Link className={accion ? 'boton' : 'boton secundario'} to={destino}>
        {accion?.texto ?? 'Abrir'}
      </Link>
    </li>
  );
}

/** «Mis partidas» (FR-017): las partidas en curso y terminadas, con un acceso a la acción pendiente. */
export function MisPartidas() {
  const [datos, setDatos] = useState<{ enCurso: PartidaResumen[]; terminadas: PartidaResumen[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ enCurso: PartidaResumen[]; terminadas: PartidaResumen[] }>('/api/mis-partidas')
      .then(setDatos)
      .catch((e: unknown) => setError(e instanceof ErrorApi ? e.message : 'No se pudieron cargar tus partidas'));
  }, []);

  if (error) return <p className="error pantalla">{error}</p>;
  if (!datos) return <p className="cargando">Cargando…</p>;
  return (
    <main className="pantalla">
      <h1>Mis partidas</h1>
      <section aria-labelledby="en-curso">
        <h2 id="en-curso">En curso</h2>
        {datos.enCurso.length === 0 ? (
          <p className="nota">
            No tienes partidas en curso. <Link to="/partidas/nueva">Crea una nueva</Link>.
          </p>
        ) : (
          <ul className="lista-partidas">
            {datos.enCurso.map((p) => (
              <Fila key={p.id} p={p} />
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="terminadas">
        <h2 id="terminadas">Terminadas</h2>
        {datos.terminadas.length === 0 ? (
          <p className="nota">Todavía no has terminado ninguna partida.</p>
        ) : (
          <ul className="lista-partidas">
            {datos.terminadas.map((p) => (
              <Fila key={p.id} p={p} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
