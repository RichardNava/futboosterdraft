import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api, ErrorApi } from '../api/cliente';
import { EstadoVacio } from '../componentes/EstadoVacio';
import { Insignia } from '../componentes/Insignia';
import { NombreRecortado } from '../componentes/NombreRecortado';
import { PantallaCargando } from '../componentes/Esqueleto';
import { PantallaError } from '../componentes/Aviso';

export interface PartidaResumen {
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

/** Pantalla en la que sigue una partida: la de su acción pendiente o la de su fase (sala, draft o torneo). */
export function destinoPartida(p: PartidaResumen): string {
  const accion = p.accionPendiente ? ACCION[p.accionPendiente] : null;
  return `/partidas/${p.id}/${accion?.ruta ?? RUTA_FASE[p.fase] ?? 'torneo'}`;
}

function Fila({ p }: { p: PartidaResumen }) {
  const accion = p.accionPendiente ? ACCION[p.accionPendiente] : null;
  const destino = destinoPartida(p);
  return (
    <li>
      <span className="partida-resumen">
        <NombreRecortado texto={p.nombreEquipo} como="strong" className="nombre-equipo" />
        <Insignia texto={MODO[p.modo] ?? p.modo} suave />
        <Insignia texto={FASE[p.fase] ?? p.fase} />
        {p.jornadaActual !== undefined && <Insignia texto={`Jornada ${p.jornadaActual}`} suave />}
        {p.rival && (
          <span className="nota">
            contra <NombreRecortado texto={p.rival} />
          </span>
        )}
      </span>
      <Link className="boton secundario" to={destino}>
        {accion?.texto ?? 'Abrir'}
      </Link>
    </li>
  );
}

/**
 * «Mis partidas» (FR-017; spec 004, FR-023 a FR-025): las partidas en curso y terminadas, con un acceso a la acción
 * pendiente. Sin partidas, el estado vacío lleva a «Nueva partida».
 */
export function MisPartidas() {
  const [datos, setDatos] = useState<{ enCurso: PartidaResumen[]; terminadas: PartidaResumen[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ enCurso: PartidaResumen[]; terminadas: PartidaResumen[] }>('/api/mis-partidas')
      .then(setDatos)
      .catch((e: unknown) => setError(e instanceof ErrorApi ? e.message : 'No se han podido cargar tus partidas. Comprueba la conexión y vuelve a intentarlo.'));
  }, []);

  if (error) return <PantallaError mensaje={error} />;
  if (!datos) return <PantallaCargando forma="filas" texto="Cargando tus partidas…" />;
  const nueva = (
    <Link className="boton boton-principal" data-principal="" to="/partidas/nueva">
      Nueva partida
    </Link>
  );
  if (datos.enCurso.length === 0 && datos.terminadas.length === 0) {
    return (
      <main className="pantalla">
        <h1>Mis partidas</h1>
        <EstadoVacio mensaje="Todavía no tienes partidas. Crea una para abrir tus primeros sobres." accion={nueva} />
      </main>
    );
  }
  return (
    <main className="pantalla">
      <h1>Mis partidas</h1>
      <section aria-labelledby="en-curso">
        <h2 id="en-curso">En curso</h2>
        {datos.enCurso.length === 0 ? (
          <EstadoVacio mensaje="No tienes partidas en curso." accion={nueva} />
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
          <EstadoVacio mensaje="No has terminado ninguna partida." />
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
