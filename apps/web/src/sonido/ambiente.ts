/**
 * Ambiente de público de la 2D (spec 012, ronda 4; sustituye al sintetizado de la ronda 3): grabaciones CC0 de
 * estadios reales (`public/sonidos/LICENCIA`, montadas con `tools/sonidos/ambiente.py`). El rumor de la grada suena
 * en bucle y, de vez en cuando, entra una hinchada con bombo, un cántico o una vuvuzela. Respeta el interruptor de
 * sonido y baja en las pausas. Los ficheros se piden al entrar en la 2D, no con el resto de efectos.
 */
import { useEffect, useRef } from 'react';
import { contextoAudio, FACTOR_VOLUMEN, sonidoActivado, suscribirSonido } from './sonido';

export interface Ambiente {
  /** 1 con el balón en juego; menos en las pausas (descanso, gestión); 0 lo calla. */
  intensidad(valor: number): void;
  detener(): void;
}

const NADA: Ambiente = { intensidad: () => undefined, detener: () => undefined };

/** Volumen del ambiente: de fondo, por debajo de los efectos (pitidos, goles). Ficheros igualados a −24/−20 dBFS RMS. */
const VOLUMEN = 0.5 * FACTOR_VOLUMEN;

/** Fichero del fondo y tomas de cada momento de la grada, con su volumen relativo al fondo. */
export const GRADA = 'ambienteGrada';
export const MOMENTOS = {
  bombo: { tomas: ['ambienteBombo1', 'ambienteBombo2'], volumen: 0.75 },
  cantico: { tomas: ['ambienteCantico1', 'ambienteCantico2'], volumen: 0.75 },
  vuvuzela: { tomas: ['ambienteVuvuzela1', 'ambienteVuvuzela2'], volumen: 0.4 },
} as const;
type Momento = keyof typeof MOMENTOS;

/** Silencio entre un momento y el siguiente del mismo tipo (segundos, entre mínimo y máximo). */
export const INTERVALOS: Record<Momento, readonly [number, number]> = { bombo: [14, 30], cantico: [25, 50], vuvuzela: [9, 24] };

const entre = ([a, b]: readonly [number, number]) => a + Math.random() * (b - a);

const buferes = new Map<string, Promise<AudioBuffer | null>>();
function cargar(c: AudioContext, nombre: string): Promise<AudioBuffer | null> {
  let b = buferes.get(nombre);
  if (!b) {
    b = fetch(`/sonidos/${nombre}.mp3`)
      .then((r) => r.arrayBuffer())
      .then((d) => c.decodeAudioData(d))
      .catch(() => {
        buferes.delete(nombre);
        return null;
      });
    buferes.set(nombre, b);
  }
  return b;
}

export function iniciarAmbiente(): Ambiente {
  const c = contextoAudio();
  if (!c) return NADA;

  const general = c.createGain();
  general.gain.value = 0;
  general.connect(c.destination);

  const fuentes = new Set<AudioBufferSourceNode>();
  let detenido = false;
  const sonar = (buf: AudioBuffer, volumen: number, opciones: { bucle?: boolean; desde?: number } = {}) => {
    const f = c.createBufferSource();
    f.buffer = buf;
    f.loop = opciones.bucle ?? false;
    const g = c.createGain();
    g.gain.value = volumen;
    f.connect(g).connect(general);
    fuentes.add(f);
    f.onended = () => fuentes.delete(f);
    f.start(c.currentTime + 0.05, opciones.desde ?? 0);
    return buf.duration;
  };

  // El fondo, en bucle desde un punto al azar (así no empieza siempre igual).
  void cargar(c, GRADA).then((b) => {
    if (b && !detenido) sonar(b, 1, { bucle: true, desde: Math.random() * b.duration });
  });
  for (const m of Object.values(MOMENTOS)) for (const t of m.tomas) void cargar(c, t);

  // Momentos de la grada: el bombo y el cántico no se pisan; la vuvuzela puede sonar encima.
  const ahora0 = c.currentTime;
  const proxima: Record<Momento, number> = { bombo: ahora0 + entre([4, 10]), cantico: ahora0 + entre([14, 26]), vuvuzela: ahora0 + entre([3, 9]) };
  const ultima: Record<Momento, number> = { bombo: -1, cantico: -1, vuvuzela: -1 };
  let ocupadaHasta = 0;
  const reloj = setInterval(() => {
    const ahora = c.currentTime;
    if (c.state !== 'running' || general.gain.value < 0.001) return;
    for (const tipo of Object.keys(MOMENTOS) as Momento[]) {
      if (ahora < proxima[tipo]) continue;
      if (tipo !== 'vuvuzela' && ahora < ocupadaHasta) {
        proxima[tipo] = ocupadaHasta + 3;
        continue;
      }
      const { tomas, volumen } = MOMENTOS[tipo];
      // Nunca la misma toma dos veces seguidas.
      const i = (ultima[tipo] + 1 + Math.floor(Math.random() * (tomas.length - 1))) % tomas.length;
      ultima[tipo] = i;
      proxima[tipo] = Infinity; // hasta saber cuánto dura la toma
      if (tipo !== 'vuvuzela') ocupadaHasta = Infinity;
      void cargar(c, tomas[i]!).then((b) => {
        const dura = b && !detenido ? sonar(b, volumen) : 5;
        if (tipo !== 'vuvuzela') ocupadaHasta = c.currentTime + dura;
        proxima[tipo] = c.currentTime + dura + entre(INTERVALOS[tipo]);
      });
    }
  }, 250);

  let intensidad = 1;
  const aplicar = () => general.gain.setTargetAtTime(sonidoActivado() ? VOLUMEN * intensidad : 0, c.currentTime, 0.6);
  aplicar();
  const dejarDeOir = suscribirSonido(aplicar);

  return {
    intensidad(valor) {
      intensidad = valor;
      aplicar();
    },
    detener() {
      detenido = true;
      clearInterval(reloj);
      dejarDeOir();
      general.gain.setTargetAtTime(0, c.currentTime, 0.15);
      // Tras el fundido, se para todo y se suelta el grafo.
      setTimeout(() => {
        for (const f of fuentes) {
          try {
            f.stop();
          } catch {
            // Ya había terminado.
          }
        }
        general.disconnect();
      }, 700);
    },
  };
}

/** El ambiente mientras la pantalla está montada, con la intensidad que se le pida en cada momento. */
export function useAmbiente(intensidad: number): void {
  const ambiente = useRef<Ambiente | null>(null);
  useEffect(() => {
    const a = iniciarAmbiente();
    ambiente.current = a;
    return () => {
      a.detener();
      ambiente.current = null;
    };
  }, []);
  useEffect(() => ambiente.current?.intensidad(intensidad), [intensidad]);
}
