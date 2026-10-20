import { useEffect, useMemo, useState } from 'react';
import { coloresDe } from '../componentes/colores';
import type { Equipacion } from '@fbd/domain';
import { useParams } from 'react-router';
import { api } from '../api/cliente';
import { AvisoDorsales } from '../componentes/AvisoDorsales';
import { BarraPrincipal, type AccionBarra } from '../componentes/BarraPrincipal';
import { Estadisticas } from '../componentes/Estadisticas';
import { estadoEquipoEnPartido, type AlineacionPartido, type DecisionAplicada } from '../componentes/estadoEquipoEnPartido';
import { GestionEquipo, type DecisionGestion } from '../componentes/GestionEquipo';
import { ResultadoPartido } from '../componentes/ResultadoPartido';
import { ResumenEventos, type EventoVista } from '../componentes/ResumenEventos';
import { useConexion, useCuentaAtras } from '../conexion/useConexion';

export type { AlineacionPartido };

export interface Inicio {
  partidoId: string;
  modalidad: 'rapida' | '2d';
  local: { id: string; nombre: string };
  visitante: { id: string; nombre: string };
  alineaciones: { local: AlineacionPartido; visitante: AlineacionPartido };
  dorsales: Record<string, number>;
  /** Equipaciones v2 del partido (spec 003, FR-045). */
  equipaciones: { local: Equipacion; visitante: Equipacion };
  /** Orden de los jugadores en los fotogramas v2. */
  ordenJugadores?: number[];
  /** Dorsales dados al empezar a convocados que no tenían (FR-038). */
  dorsalesAsignados?: { jugadorId: number; dorsal: number }[];
  /** Se puede gestionar el equipo: solo contra un NPC (spec 003, FR-027, FR-031). */
  gestionDisponible?: boolean;
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

/** Nombre de cada jugador del partido, con su dorsal. */
export function nombresDePartido(inicio: Inicio): Map<number, string> {
  const mapa = new Map<number, string>();
  for (const lado of ['local', 'visitante'] as const) {
    const a = inicio.alineaciones[lado];
    for (const j of [...a.titulares.map((t) => t.jugador), ...a.suplentes]) {
      const dorsal = inicio.dorsales[j.id];
      mapa.set(j.id, `${dorsal ? `${dorsal}. ` : ''}${j.nombre} ${j.apellidos.split(' ')[0]}`);
    }
  }
  return mapa;
}

/**
 * Partido en simulación rápida (001/FR-044 a FR-047; spec 003, US5 y US6): resumen por partes. En el descanso y
 * antes de la prórroga, contra un NPC, «Gestionar equipo» es el botón principal; al terminar, la pantalla de
 * resultado común con la 2D.
 */
export function PartidoRapido() {
  const { partidaId, partidoId } = useParams();
  const [inicio, setInicio] = useState<Inicio | null>(null);
  const [eventos, setEventos] = useState<EventoVista[]>([]);
  const [marcador, setMarcador] = useState<Marcador>({ local: 0, visitante: 0 });
  const [estadisticas, setEstadisticas] = useState<unknown>(null);
  const [fase, setFase] = useState('primera_parte');
  const [pausa, setPausa] = useState<{ motivo: string; venceEn: string } | null>(null);
  const [miId, setMiId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gestion, setGestion] = useState(false);
  const [aplicadas, setAplicadas] = useState<DecisionAplicada[]>([]);

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
        setPausa({ motivo: m.motivo as string, venceEn: m.venceEn as string });
        break;
      case 'partido.decision_aplicada':
        if (m.participanteId === miId) setAplicadas((a) => [...a, { aplicadaEnTick: m.aplicadaEnTick as number, tipo: m.tipo as string, datos: m.datos as Record<string, unknown> }]);
        break;
      case 'partido.fin':
        setEventos(m.eventos as EventoVista[]);
        setMarcador(m.marcador as Marcador);
        setEstadisticas(m.estadisticas);
        setFase('finalizado');
        setPausa(null);
        setGestion(false);
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
  const nombres = useMemo(() => (inicio ? nombresDePartido(inicio) : new Map<number, string>()), [inicio]);

  if (!inicio) {
    return <p className="cargando">{conectada ? 'Esperando el inicio del partido…' : 'Conectando…'}</p>;
  }
  const nombre = (id: number) => nombres.get(id) ?? String(id);

  if (fase === 'finalizado') {
    return (
      <ResultadoPartido
        partidaId={partidaId!}
        local={{ nombre: inicio.local.nombre, color: coloresDe(inicio.equipaciones.local).principal }}
        visitante={{ nombre: inicio.visitante.nombre, color: coloresDe(inicio.equipaciones.visitante).principal }}
        marcador={marcador}
        eventos={eventos}
        estadisticas={estadisticas}
        nombre={nombre}
      />
    );
  }

  const miLado = miId === inicio.local.id ? 'local' : miId === inicio.visitante.id ? 'visitante' : null;
  const nombresEquipo = { local: inicio.local.nombre, visitante: inicio.visitante.nombre };
  const gestionDisponible = inicio.gestionDisponible === true && miLado !== null;

  // `conexion.enviar` pone un `requestId` nuevo en cada envío: el servidor descarta los repetidos (FR-016).
  const seguir = async () => {
    if (!conexion) return;
    const ack = await conexion.enviar({ t: 'partido.seguir', partidoId: inicio.partidoId });
    if (!ack.ok) setError(ack.error?.mensaje ?? 'No se pudo continuar');
  };
  const finalizar = async () => {
    if (!conexion) throw new Error('Sin conexión');
    const ack = await conexion.enviar({ t: 'partido.finalizar', partidoId: inicio.partidoId });
    if (!ack.ok) throw new Error(ack.error?.mensaje ?? 'No se pudo finalizar el partido');
  };
  const enviarLote = (decisiones: DecisionGestion[]) => {
    if (!conexion) throw new Error('Sin conexión');
    return conexion.enviar({ t: 'partido.decisiones', partidoId: inicio.partidoId, decisiones });
  };
  const chapa = (lado: 'local' | 'visitante') => (
    <span className="chapa" style={{ background: coloresDe(inicio.equipaciones[lado]).principal, color: coloresDe(inicio.equipaciones[lado]).secundario }} aria-hidden="true" />
  );

  // Botones (contracts/ui.md): en juego, «Finalizar partido»; en una pausa, «Seguir» y, contra un NPC, «Gestionar
  // equipo» con la misma importancia a su izquierda (FR-006a).
  const abrirGestion: AccionBarra = { etiqueta: 'Gestionar equipo', onClick: () => setGestion(true) };
  const accionSeguir: AccionBarra = { etiqueta: 'Seguir', onClick: seguir };
  const accionFinalizar: AccionBarra = { etiqueta: 'Finalizar partido', onClick: finalizar };
  const enPausa = pausa !== null && miLado !== null;
  const principal = enPausa ? accionSeguir : miLado ? accionFinalizar : null;
  const principalIzquierda = enPausa && gestionDisponible ? abrirGestion : null;
  const secundarios = enPausa ? [accionFinalizar] : [];

  if (gestion && miLado) {
    const estadoEquipo = estadoEquipoEnPartido(inicio.alineaciones[miLado], eventos, miLado, Number.POSITIVE_INFINITY, aplicadas, fase === 'pre_prorroga' || fase === 'prorroga');
    const jugadores = new Map([...inicio.alineaciones[miLado].titulares.map((t) => t.jugador), ...inicio.alineaciones[miLado].suplentes].map((j) => [j.id, j]));
    return (
      <GestionEquipo
        estado={estadoEquipo}
        jugadores={jugadores}
        dorsales={inicio.dorsales as Record<number, number>}
        colores={coloresDe(inicio.equipaciones[miLado])}
        enviar={enviarLote}
        onCerrar={() => setGestion(false)}
      />
    );
  }

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

      <AvisoDorsales inicio={inicio} miId={miId} />

      <section aria-label="Resumen de eventos">
        <h2>Lo más destacado</h2>
        <ResumenEventos eventos={eventos} nombre={nombre} nombresEquipo={nombresEquipo} />
      </section>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {estadisticas !== null && (
        <section aria-label="Estadísticas">
          <h2>Estadísticas</h2>
          <Estadisticas datos={estadisticas as never} nombres={nombresEquipo} />
        </section>
      )}

      <BarraPrincipal
        principal={principal}
        principalIzquierda={principalIzquierda}
        secundarios={secundarios}
        estado={enPausa ? `${ETIQUETA_FASE[fase] ?? 'Pausa'}: el partido se reanuda en ${restante ?? '–'} s si no pulsas «Seguir».` : undefined}
      />
    </main>
  );
}
