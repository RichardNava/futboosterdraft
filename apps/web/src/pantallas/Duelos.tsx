import { FORMACIONES, type FormacionId } from '@fbd/domain';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { api, ErrorApi } from '../api/cliente';
import { Aviso } from '../componentes/Aviso';
import { RingDuelo } from '../componentes/arte/RingDuelo';
import { BarraPrincipal } from '../componentes/BarraPrincipal';
import { CartaJugador, type CartaResumen } from '../componentes/CartaJugador';
import { PantallaCargando } from '../componentes/Esqueleto';
import { Icono } from '../componentes/Icono';
import { NombreRecortado } from '../componentes/NombreRecortado';
import { instante, marcadorEn, puntos, valorContado, type Instante, type Velocidad } from '../componentes/secuenciaDuelos';
import { reproducir } from '../sonido/sonido';

interface LadoDuelo {
  jugadorId: number;
  media: number;
  penalizacion: number;
  bonusVirtudes: number;
  malusDefectos: number;
  forma: number;
  puntuacion: number;
}

interface ResultadoCruce {
  formacion: FormacionId;
  estadoForma: boolean;
  duelos: { casillaId: string; local: LadoDuelo; visitante: LadoDuelo; ganador: 'local' | 'visitante' | 'nulo' }[];
  ganados: { local: number; visitante: number };
  sumas: { local: number; visitante: number };
  desempate: 'duelos' | 'suma' | 'sorteo';
  ganador: 'local' | 'visitante';
}

interface Datos {
  duelos: ResultadoCruce;
  cartas: Record<number, CartaResumen>;
  nombres: { local: string; visitante: string };
}

const movimientoReducido = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

const TEXTO_DESEMPATE = {
  duelos: null,
  suma: 'Empate a duelos: gana por suma de puntuaciones',
  sorteo: 'Empate a duelos y a puntuación: gana por sorteo',
} as const;

/** Estilo de una carta en el instante actual: solo `transform` y `opacity` (contracts/ui.md). */
function estiloCarta(lado: 'local' | 'visitante', i: Instante, ganador: 'local' | 'visitante' | 'nulo', reducido: boolean): React.CSSProperties {
  if (reducido) return { opacity: i.fase === 'entrada' ? i.progreso : ganador === 'nulo' || ganador === lado ? 1 : 0.45 };
  const signo = lado === 'local' ? -1 : 1;
  switch (i.fase) {
    case 'entrada':
      return { transform: `translateX(${signo * (1 - i.progreso) * 60}%)`, opacity: i.progreso };
    case 'choque': {
      // Las dos cartas se empujan hacia el centro y rebotan.
      const golpe = Math.sin(Math.PI * i.progreso);
      return { transform: `translateX(${-signo * 3 * golpe}%) scale(${1 + 0.06 * golpe})`, opacity: 1 };
    }
    case 'recuento':
      return { transform: 'none', opacity: 1 };
    default:
      if (ganador === 'nulo') return { transform: 'none', opacity: 1 };
      return ganador === lado ? { transform: 'scale(1.04)', opacity: 1 } : { transform: 'scale(0.96)', opacity: 0.45 };
  }
}

/** Chispas del estallido del choque: una estrella cada 45°. */
const CHISPAS = Array.from({ length: 8 }, (_, k) => (k * Math.PI) / 4);
/** Puntas del estallido (estrella de 12 puntas). */
const ESTALLIDO = Array.from({ length: 24 }, (_, k) => {
  const a = (k * Math.PI) / 12;
  const r = k % 2 === 0 ? 48 : 22;
  return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`;
}).join(' ');

/** Estallido con estrellas cuando chocan las cartas (Web Animations API; nada con movimiento reducido). */
function animarChoque(el: HTMLElement, velocidad: Velocidad): void {
  const centro = 'translate(-50%, -50%)';
  el.querySelector('.duelo-estallido')?.animate(
    [
      { opacity: 1, transform: `${centro} scale(0.2) rotate(0deg)` },
      { opacity: 1, transform: `${centro} scale(1.1) rotate(10deg)`, offset: 0.35 },
      { opacity: 0, transform: `${centro} scale(1.35) rotate(18deg)` },
    ],
    { duration: 520 / velocidad, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
  );
  el.querySelectorAll('.duelo-chispa').forEach((chispa, k) => {
    const a = CHISPAS[k] ?? 0;
    chispa.animate(
      [
        { opacity: 1, transform: `${centro} scale(0.4)` },
        { opacity: 0, transform: `${centro} translate(${Math.cos(a) * 110}px, ${Math.sin(a) * 80}px) scale(1) rotate(120deg)` },
      ],
      { duration: 640 / velocidad, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
    );
  });
}

function Desglose({ lado, i, estadoForma }: { lado: LadoDuelo; i: Instante; estadoForma: boolean }) {
  const fila = (etiqueta: string, valor: number, signo: '' | '+' | '−') => (
    <div>
      <dt>{etiqueta}</dt>
      <dd>
        {signo}
        {puntos(Math.abs(valor))}
      </dd>
    </div>
  );
  // Aparece a su lado de la carta cuando las cartas ya han chocado (ronda 2).
  return (
    <dl className={['duelo-desglose', i.fase === 'entrada' || i.fase === 'choque' ? '' : 'visible'].filter(Boolean).join(' ')}>
      {fila('Media', lado.media, '')}
      {lado.penalizacion > 0 && fila('Posición', lado.penalizacion, '−')}
      {lado.bonusVirtudes > 0 && fila('Virtudes', lado.bonusVirtudes, '+')}
      {lado.malusDefectos > 0 && fila('Defectos', lado.malusDefectos, '−')}
      {estadoForma && i.fase === 'resultado' && fila('Estado de forma', lado.forma, lado.forma < 0 ? '−' : '+')}
      <div className="duelo-total">
        <dt>Puntuación</dt>
        <dd>{puntos(valorContado(i.fase === 'resultado' ? lado.puntuacion : lado.puntuacion - lado.forma, i))}</dd>
      </div>
    </dl>
  );
}

/**
 * Cruce del modo Duelo de jugadores (spec 005, T075; FR-067; research R11; contracts/ui.md): los 11 duelos de portero a
 * delanteros, animados, con el marcador de duelos, ×1, ×2 y «Saltar al resultado», y el resumen final. El visionado se
 * marca al terminar o al saltar. Con `prefers-reduced-motion`, fundidos de 150 ms sin desplazamientos ni choque.
 */
export function Duelos() {
  const { partidaId, partidoId } = useParams();
  const navegar = useNavigate();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [velocidad, setVelocidad] = useState<Velocidad>(1);
  const [tiempo, setTiempo] = useState(0);
  const [saltado, setSaltado] = useState(false);
  const reducido = useRef(movimientoReducido()).current;
  const visto = useRef(false);
  const destello = useRef<HTMLDivElement>(null);
  const choque = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vigente = true;
    Promise.all([
      api<{ modo: 'duelos'; duelos: ResultadoCruce; cartas: Record<number, CartaResumen> }>(`/api/partidos/${partidoId}/abrir`, { metodo: 'POST', cuerpo: { modalidad: 'rapida' } }),
      api<{ local: { nombre: string }; visitante: { nombre: string } }>(`/api/partidos/${partidoId}`),
    ])
      .then(([abierto, partido]) => {
        if (vigente) setDatos({ duelos: abierto.duelos, cartas: abierto.cartas, nombres: { local: partido.local.nombre, visitante: partido.visitante.nombre } });
      })
      .catch((e: unknown) => vigente && setError(e instanceof ErrorApi ? e.message : 'No se pudo cargar el cruce'));
    return () => {
      vigente = false;
    };
  }, [partidoId]);

  const n = datos?.duelos.duelos.length ?? 0;
  const ahora = instante(saltado ? Number.MAX_SAFE_INTEGER : tiempo, n, 1, reducido);

  // Reloj de la animación: el tiempo avanza a la velocidad elegida.
  useEffect(() => {
    if (!datos || ahora.terminado) return;
    let anterior = performance.now();
    let id = requestAnimationFrame(function paso(t) {
      setTiempo((x) => x + (t - anterior) * velocidad);
      anterior = t;
      id = requestAnimationFrame(paso);
    });
    return () => cancelAnimationFrame(id);
  }, [datos, ahora.terminado, velocidad]);

  // Destello (120 ms), estallido de estrellas y sonidos de la entrada y del choque, con la Web Animations API.
  useEffect(() => {
    if (reducido || saltado || !datos) return;
    if (ahora.fase === 'entrada') reproducir('entradaDuelo');
    if (ahora.fase !== 'choque') return;
    reproducir('choqueDuelo');
    destello.current?.animate([{ opacity: 0.9 }, { opacity: 0 }], { duration: 120 / velocidad, easing: 'ease-out' });
    if (choque.current) animarChoque(choque.current, velocidad);
  }, [ahora.indice, ahora.fase, reducido, saltado, datos]);

  // El visionado se marca al terminar o al saltar (contracts/http-api.md).
  useEffect(() => {
    if (!ahora.terminado || visto.current) return;
    visto.current = true;
    void api(`/api/partidos/${partidoId}/visto`, { metodo: 'POST' }).catch(() => undefined);
  }, [ahora.terminado, partidoId]);

  if (error)
    return (
      <main className="pantalla">
        <Aviso tipo="error">
          <p>{error}</p>
        </Aviso>
      </main>
    );
  if (!datos) return <PantallaCargando forma="cartas" texto="Preparando los duelos…" />;

  const r = datos.duelos;
  const marcador = marcadorEn(
    r.duelos.map((d) => d.ganador),
    ahora,
  );
  const etiqueta = (casillaId: string) => FORMACIONES[r.formacion].casillas.find((c) => c.id === casillaId)?.etiqueta ?? casillaId;
  const nombre = (id: number) => {
    const c = datos.cartas[id];
    return c ? `${c.nombre} ${c.apellidos.split(' ')[0]}` : String(id);
  };
  const actual = ahora.terminado ? null : r.duelos[ahora.indice]!;

  return (
    <main className="pantalla duelos">
      <header className="duelos-cabecera">
        <div className="duelos-equipo">
          <NombreRecortado texto={datos.nombres.local} como="strong" />
        </div>
        <p className="duelos-marcador" aria-live="polite" aria-label={`Duelos ${marcador.local} a ${marcador.visitante}`}>
          Duelos {marcador.local}–{marcador.visitante}
        </p>
        <div className="duelos-equipo visitante">
          <NombreRecortado texto={datos.nombres.visitante} como="strong" />
        </div>
      </header>

      {actual ? (
        <section className="duelo-escenario" aria-label={`Duelo ${ahora.indice + 1} de ${n}: ${etiqueta(actual.casillaId)}`}>
          <RingDuelo className="duelo-ring" />
          <header className="duelo-titulo">
            <p className="duelo-puesto">
              {etiqueta(actual.casillaId)} · {ahora.indice + 1}/{n}
            </p>
            <h1 className="duelo-enfrentamiento" aria-label={`${nombre(actual.local.jugadorId)} contra ${nombre(actual.visitante.jugadorId)}`}>
              <span className="duelo-rival">{nombre(actual.local.jugadorId)}</span>
              <span className="duelo-vs" aria-hidden="true">
                VS
              </span>
              <span className="duelo-rival">{nombre(actual.visitante.jugadorId)}</span>
            </h1>
          </header>
          <div className="duelo-pareja">
            {(['local', 'visitante'] as const).map((lado) => (
              <div key={lado} className={`duelo-lado ${lado}`} style={estiloCarta(lado, ahora, actual.ganador, reducido)}>
                <div className="duelo-carta">{datos.cartas[actual[lado].jugadorId] && <CartaJugador jugador={datos.cartas[actual[lado].jugadorId]!} />}</div>
                <Desglose lado={actual[lado]} i={ahora} estadoForma={r.estadoForma} />
              </div>
            ))}
            <div ref={destello} className="duelo-destello" aria-hidden="true" />
            <div ref={choque} className="duelo-choque" aria-hidden="true">
              <svg className="duelo-estallido" viewBox="-50 -50 100 100">
                <polygon points={ESTALLIDO} />
                <circle r="14" />
              </svg>
              {CHISPAS.map((a) => (
                <span key={a} className="duelo-chispa">
                  <Icono nombre="estrella" />
                </span>
              ))}
            </div>
            {ahora.fase === 'resultado' && (
              <p className="duelo-veredicto" role="status">
                {actual.ganador === 'nulo' ? 'Empate' : `Gana ${nombre(actual[actual.ganador].jugadorId)}`}
              </p>
            )}
          </div>
        </section>
      ) : (
        <section className="duelos-resumen" aria-label="Resumen de los duelos">
          <h1>{r.ganador === 'local' ? datos.nombres.local : datos.nombres.visitante} pasa de ronda</h1>
          {TEXTO_DESEMPATE[r.desempate] && <p className="nota">{TEXTO_DESEMPATE[r.desempate]}</p>}
          <div className="tabla-desplazable" tabIndex={0} aria-label="Duelos del cruce">
          <table className="duelos-tabla">
            <thead>
              <tr>
                <th scope="col">Puesto</th>
                <th scope="col">{datos.nombres.local}</th>
                <th scope="col">Puntos</th>
                <th scope="col">Puntos</th>
                <th scope="col">{datos.nombres.visitante}</th>
              </tr>
            </thead>
            <tbody>
              {r.duelos.map((d) => (
                <tr key={d.casillaId} className={`duelo-fila gana-${d.ganador}`}>
                  <th scope="row">{etiqueta(d.casillaId)}</th>
                  {/* El ganador de cada duelo, en ámbar y con una estrella en su lateral (ronda 2). */}
                  <td>
                    {d.ganador === 'local' && <Icono nombre="estrella" etiqueta="Ganador" className="duelo-estrella" />}
                    {nombre(d.local.jugadorId)}
                  </td>
                  <td>{puntos(d.local.puntuacion)}</td>
                  <td>{puntos(d.visitante.puntuacion)}</td>
                  <td>
                    {nombre(d.visitante.jugadorId)}
                    {d.ganador === 'visitante' && <Icono nombre="estrella" etiqueta="Ganador" className="duelo-estrella" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </section>
      )}
      {/* Los controles de la animación van en la barra, siempre a la vista sin desplazarse (ronda 2). */}
      <BarraPrincipal
        principal={ahora.terminado ? { etiqueta: 'Volver al torneo', onClick: () => navegar(`/partidas/${partidaId}/torneo`) } : null}
        secundarios={ahora.terminado ? [] : [{ etiqueta: 'Saltar al resultado', onClick: () => setSaltado(true) }]}
        estado={
          ahora.terminado ? (
            `Duelos ${r.ganados.local}–${r.ganados.visitante}`
          ) : (
            <div className="velocidades segmentado" role="group" aria-label="Velocidad de los duelos">
              {([1, 2] as const).map((v) => (
                <button key={v} type="button" aria-pressed={v === velocidad} onClick={() => setVelocidad(v)}>
                  ×{v}
                </button>
              ))}
            </div>
          )
        }
      />
    </main>
  );
}
