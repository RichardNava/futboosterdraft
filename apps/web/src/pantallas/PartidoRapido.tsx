import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../api/cliente';
import { Estadisticas } from '../componentes/Estadisticas';
import { estadoJugadores, PanelCambios, type AlineacionPartido } from '../componentes/PanelCambios';
import { ResumenEventos, type EventoVista } from '../componentes/ResumenEventos';
import { useConexion, useCuentaAtras } from '../conexion/useConexion';

export interface Inicio {
  partidoId: string;
  modalidad: 'rapida' | '2d';
  local: { id: string; nombre: string };
  visitante: { id: string; nombre: string };
  alineaciones: { local: AlineacionPartido; visitante: AlineacionPartido };
  dorsales: Record<string, number>;
  equipaciones: { local: { principal: string; secundario: string }; visitante: { principal: string; secundario: string } };
}

export type Marcador = { local: number; visitante: number; penaltis?: { local: number; visitante: number } };

export const ETIQUETA_FASE: Record<string, string> = {
  primera_parte: 'Primera parte',
  descanso: 'Descanso',
  segunda_parte: 'Segunda parte',
  pre_prorroga: 'Final del tiempo reglamentario',
  prorroga: 'Prórroga',
  penaltis: 'Penaltis',
  finalizado: 'Final',
};

/** Partido en simulación rápida (T097; FR-044 a FR-047). */
export function PartidoRapido() {
  const { partidaId, partidoId } = useParams();
  const [inicio, setInicio] = useState<Inicio | null>(null);
  const [eventos, setEventos] = useState<EventoVista[]>([]);
  const [marcador, setMarcador] = useState<Marcador>({ local: 0, visitante: 0 });
  const [estadisticas, setEstadisticas] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [fase, setFase] = useState('primera_parte');
  const [pausa, setPausa] = useState<{ motivo: string; venceEn: string; listos: string[] } | null>(null);
  const [miId, setMiId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { conexion, estado, conectada } = useConexion(partidaId, (m) => {
    if (m.partidoId !== undefined && m.partidoId !== partidoId) return;
    switch (m.t) {
      case 'partido.inicio':
        setInicio(m as unknown as Inicio);
        setEventos([]);
        break;
      case 'partido.tramo':
        setEventos((ev) => [...ev, ...(m.eventos as EventoVista[])]);
        setMarcador(m.marcador as Marcador);
        setEstadisticas(m.estadisticas);
        setFase(m.fase as string);
        setPausa(null);
        break;
      case 'partido.pausa_decision':
        setPausa({ motivo: m.motivo as string, venceEn: m.venceEn as string, listos: m.listos as string[] });
        break;
      case 'partido.fin':
        setEventos(m.eventos as EventoVista[]);
        setMarcador(m.marcador as Marcador);
        setEstadisticas(m.estadisticas);
        setFase('finalizado');
        setPausa(null);
        break;
    }
  });

  // Instantánea al conectar o reconectar.
  useEffect(() => {
    if (!estado || estado.fase !== 'torneo') return;
    setMiId(estado.vista.partida.miParticipanteId);
    const p = estado.vista.partido;
    if (!p || p.inicio.partidoId !== partidoId) return;
    setInicio(p.inicio);
    setEventos(p.eventos);
    setMarcador(p.marcador);
    setEstadisticas(p.estadisticas);
    setFase(p.fase);
    setPausa(p.pausa);
  }, [estado, partidoId]);

  // Un partido ya terminado (p. ej. desde el calendario) no llega por la conexión: se carga su resumen.
  useEffect(() => {
    if (!partidoId) return;
    api<Inicio & { estado: string; marcador: Marcador; eventos: EventoVista[]; estadisticas: unknown }>(`/api/partidos/${partidoId}`)
      .then((r) => {
        if (r.estado !== 'finalizado' || !r.alineaciones) return;
        setInicio((actual) => actual ?? { ...r, partidoId });
        setEventos(r.eventos);
        setMarcador(r.marcador);
        setEstadisticas(r.estadisticas);
        setFase('finalizado');
      })
      .catch(() => undefined);
  }, [partidoId]);

  const restante = useCuentaAtras(pausa?.venceEn, conexion);
  const nombres = useMemo(() => {
    const mapa = new Map<number, string>();
    if (!inicio) return mapa;
    for (const lado of ['local', 'visitante'] as const) {
      const a = inicio.alineaciones[lado];
      for (const j of [...a.titulares.map((t) => t.jugador), ...a.suplentes]) {
        const dorsal = inicio.dorsales[j.id];
        mapa.set(j.id, `${dorsal ? `${dorsal}. ` : ''}${j.nombre} ${j.apellidos.split(' ')[0]}`);
      }
    }
    return mapa;
  }, [inicio]);

  if (!inicio) {
    return <p className="cargando">{conectada ? 'Esperando el inicio del partido…' : 'Conectando…'}</p>;
  }

  const miLado = miId === inicio.local.id ? 'local' : miId === inicio.visitante.id ? 'visitante' : null;
  const nombresEquipo = { local: inicio.local.nombre, visitante: inicio.visitante.nombre };

  // Quién está en el campo según los eventos (sustituciones, expulsiones, lesiones sin cambio).
  const jugadoresDe = (lado: 'local' | 'visitante') => estadoJugadores(inicio.alineaciones[lado], eventos, lado);

  const enviarDecision = async (tipo: 'sustitucion' | 'formacion' | 'tactica', datos: Record<string, unknown>) => {
    if (!conexion) throw new Error('Sin conexión');
    setError(null);
    return conexion.enviar({ t: 'partido.decision', partidoId: inicio.partidoId, tipo, datos });
  };

  const seguir = async () => {
    if (!conexion) return;
    const ack = await conexion.enviar({ t: 'partido.seguir', partidoId: inicio.partidoId });
    if (!ack.ok) setError(ack.error?.mensaje ?? 'No se pudo continuar');
  };

  const yaListo = miId !== null && pausa?.listos.includes(miId);
  const chapa = (lado: 'local' | 'visitante') => (
    <span className="chapa" style={{ background: inicio.equipaciones[lado].principal, color: inicio.equipaciones[lado].secundario }} aria-hidden="true" />
  );

  return (
    <main className="pantalla partido">
      <header className="marcador" aria-live="polite">
        <div className="equipo-marcador">
          {chapa('local')} <strong>{inicio.local.nombre}</strong>
        </div>
        <div className="resultado">
          <span className="goles">
            {marcador.local} – {marcador.visitante}
          </span>
          {marcador.penaltis && (
            <span className="penaltis">
              ({marcador.penaltis.local} – {marcador.penaltis.visitante} en penaltis)
            </span>
          )}
          <span className="fase">{ETIQUETA_FASE[fase] ?? fase}</span>
        </div>
        <div className="equipo-marcador derecha">
          <strong>{inicio.visitante.nombre}</strong> {chapa('visitante')}
        </div>
      </header>

      <section aria-label="Resumen de eventos">
        <h2>{fase === 'finalizado' ? 'Resumen del partido' : 'Lo más destacado'}</h2>
        <ResumenEventos eventos={eventos} nombre={(id) => nombres.get(id) ?? String(id)} nombresEquipo={nombresEquipo} />
      </section>

      {pausa && miLado && (
        <>
          <PanelCambios
            alineacion={inicio.alineaciones[miLado]}
            enCampo={jugadoresDe(miLado).enCampo}
            noDisponibles={jugadoresDe(miLado).fuera}
            enviar={enviarDecision}
            aviso="Los cambios se aplicarán al reanudarse el partido."
          />
          <div className="acciones">
            <button type="button" disabled={yaListo} onClick={() => void seguir()}>
              Seguir
            </button>
            <span className="nota">
              {yaListo ? 'Esperando al rival…' : 'Pulsa «Seguir» cuando termines tus cambios.'} El partido se reanuda en {restante ?? '–'} s.
            </span>
          </div>
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {estadisticas && (
        <section aria-label="Estadísticas">
          <h2>Estadísticas</h2>
          <Estadisticas datos={estadisticas} nombres={nombresEquipo} />
        </section>
      )}

      {fase === 'finalizado' && (
        <p>
          <Link className="boton" to={`/partidas/${partidaId}/torneo`}>
            Ver el torneo
          </Link>{' '}
          <Link className="boton secundario" to={`/partidas/${partidaId}/alineacion`}>
            Volver a mi equipo
          </Link>
        </p>
      )}
    </main>
  );
}
