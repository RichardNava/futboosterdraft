/**
 * Colocaciones a balón parado (FR-022a; research R3): saque de centro, córner, falta cerca del área y
 * penalti. Son simplificadas: los jugadores van a puntos creíbles y el balón sale desde el punto del saque,
 * sin barrera ni jugadas ensayadas.
 */
import { DURACION_PARTE, DURACION_PARTE_PRORROGA, type EquipoEstado, type EstadoMotor, type JugadorEnPartido } from '../estado/estado';
import { atributo } from '../modificadores/atributos';
import { tiene } from '../modificadores/virtudes';
import type { Lado } from '../tipos';
import { acotar, dividir } from './aritmetica';
import { aAbsoluta, anclaDe, CENTRO_Y, LARGO, lineaDe, type Punto } from './geometria';

const rival = (lado: Lado): Lado => (lado === 'local' ? 'visitante' : 'local');

/** Puntos del área rival (coordenadas del equipo que ataca) para los rematadores. */
const PUNTOS_AREA: readonly Punto[] = [
  { x: 9350, y: 2750 },
  { x: 9350, y: 3650 },
  { x: 9050, y: 3200 },
  { x: 8850, y: 2350 },
  { x: 8850, y: 4050 },
];
/** Puntos del área propia (coordenadas del equipo que defiende) para los defensores. */
const PUNTOS_AREA_PROPIA: readonly Punto[] = [
  { x: 550, y: 2900 },
  { x: 550, y: 3500 },
  { x: 900, y: 3200 },
  { x: 1050, y: 2500 },
  { x: 1050, y: 3900 },
  { x: 1300, y: 3200 },
];

const titulares = (equipo: EquipoEstado) => equipo.jugadores.filter((j) => j.enCampo);

/** Spec 015, añadidos (R14): con todos arriba, los cinco puntos de remate, la frontal y las inmediaciones del área. */
const PUNTOS_SUBIDA: readonly Punto[] = [...PUNTOS_AREA, { x: 8650, y: 3200 }, { x: 8450, y: 2550 }, { x: 8450, y: 3850 }, { x: 8150, y: 3200 }, { x: 8150, y: 2200 }, { x: 8150, y: 4200 }];
/** Y los defensores que defienden el área: los seis de siempre y dos más en la frontal del área pequeña. */
const PUNTOS_DEFENSA_SUBIDA: readonly Punto[] = [...PUNTOS_AREA_PROPIA, { x: 1500, y: 2700 }, { x: 1500, y: 3700 }];

/**
 * El portero sube a rematar (spec 015, añadidos, R14): con `subidaArea`, su equipo pierde de uno y es, presumiblemente,
 * la última jugada: los últimos `ultimaJugadaS` segundos del descuento de la segunda parte o de la prórroga (90+4 con 4
 * de descuento).
 */
export function porteroSube(estado: EstadoMotor, equipo: EquipoEstado): boolean {
  const sub = estado.parametros.subidaArea;
  const r = estado.reloj;
  if (!sub || (r.parte !== 2 && r.parte !== 4) || r.descuento === null) return false;
  const m = estado.marcador;
  const diferencia = equipo.lado === 'local' ? m.visitante - m.local : m.local - m.visitante;
  const fin = (r.parte === 2 ? DURACION_PARTE : DURACION_PARTE_PRORROGA) + r.descuento;
  return diferencia === 1 && r.segundosEnParte >= fin - sub.ultimaJugadaS;
}

/**
 * Subida al área a balón parado (spec 015, añadidos, R14; FR-028): se quedan atrás el defensa y el medio más retrasados
 * sin Cabeceador; suben todos los demás (y el portero en los últimos minutos si pierden de uno), los mejores por arriba
 * a los mejores sitios. El rival defiende el área con `defensoresArea`.
 */
function colocarSubida(estado: EstadoMotor, ataque: EquipoEstado, defensa: EquipoEstado, sacadorId: number, poner: (e: EquipoEstado, j: JugadorEnPartido, p: Punto) => void): void {
  const sub = estado.parametros.subidaArea!;
  const campo = titulares(ataque).filter((j) => j.id !== sacadorId && lineaDe(ataque, j) !== 'porteria');
  const atras: JugadorEnPartido[] = [];
  for (const [linea, n] of [['defensa', sub.retaguardiaDEF], ['medio', sub.retaguardiaMED]] as const) {
    atras.push(
      ...campo
        .filter((j) => lineaDe(ataque, j) === linea && !tiene(j, 'Cabeceador'))
        .sort((a, b) => anclaDe(ataque, a).x - anclaDe(ataque, b).x || a.id - b.id)
        .slice(0, n),
    );
  }
  const seleccion = estado.parametros.aereo?.seleccionCabeceador ?? 10;
  const porArriba = (j: JugadorEnPartido) =>
    atributo(estado, ataque, j, 'aereo') + (tiene(j, 'Cabeceador') ? seleccion : 0) + (lineaDe(ataque, j) === 'porteria' ? -15 : 0);
  const portero = porteroSube(estado, ataque) ? titulares(ataque).filter((j) => lineaDe(ataque, j) === 'porteria' && j.id !== sacadorId) : [];
  const candidatos = [...campo.filter((j) => !atras.includes(j)), ...portero];
  // Una vez por jugador, no en cada comparación: se recalcula en cada tick del saque (spec 015, SC-009).
  const arriba = new Map(candidatos.map((j) => [j, porArriba(j)]));
  const suben = candidatos.sort((a, b) => arriba.get(b)! - arriba.get(a)! || a.id - b.id);
  suben.forEach((j, i) => poner(ataque, j, PUNTOS_SUBIDA[i] ?? { x: 7900, y: acotar(anclaDe(ataque, j).y, 1400, 5000) }));
  atras.forEach((j) => poner(ataque, j, { x: 4800, y: anclaDe(ataque, j).y }));
  const defensores = titulares(defensa)
    .filter((j) => lineaDe(defensa, j) !== 'porteria')
    .sort((a, b) => anclaDe(defensa, a).x - anclaDe(defensa, b).x || a.id - b.id);
  const n = Math.min(sub.defensoresArea, PUNTOS_DEFENSA_SUBIDA.length);
  defensores.slice(0, n).forEach((j, i) => poner(defensa, j, PUNTOS_DEFENSA_SUBIDA[i]!));
  defensores.slice(n).forEach((j) => {
    const a = anclaDe(defensa, j);
    poner(defensa, j, { x: acotar(dividir(a.x, 2), 1500, 3000), y: a.y });
  });
  for (const j of titulares(defensa)) if (lineaDe(defensa, j) === 'porteria') poner(defensa, j, { x: 250, y: CENTRO_Y });
}

/** Posición de saque de centro de un titular, en su propio campo (coordenadas del equipo). */
function puntoSaqueCentro(equipo: EquipoEstado, j: JugadorEnPartido): Punto {
  const a = anclaDe(equipo, j);
  if (lineaDe(equipo, j) === 'porteria') return { x: 400, y: CENTRO_Y };
  return { x: acotar(dividir(a.x * 55, 100), 600, 4700), y: a.y };
}

/** Quién saca de centro: el titular de campo cuya ancla está más adelantada y centrada. */
export function sacadorDeCentro(equipo: EquipoEstado): JugadorEnPartido | undefined {
  return [...titulares(equipo)]
    .filter((j) => lineaDe(equipo, j) !== 'porteria')
    .sort((a, b) => {
      const pa = anclaDe(equipo, a);
      const pb = anclaDe(equipo, b);
      return pb.x - Math.abs(pb.y - CENTRO_Y) - (pa.x - Math.abs(pa.y - CENTRO_Y)) || a.id - b.id;
    })[0];
}

/**
 * Coloca a todos en sus posiciones de saque de centro, quietos, con el balón en el centro. Solo al
 * empezar cada parte: es el único momento en que los jugadores cambian de sitio sin moverse.
 */
export function colocarSaqueInicial(estado: EstadoMotor, saca: Lado): void {
  const esp = estado.espacio;
  esp.jugadores = {};
  esp.destinos = {};
  esp.objetivos = {};
  esp.referencia = { x: LARGO / 2, y: CENTRO_Y, tick: estado.tick };
  esp.accion = null;
  esp.velocidadBalon = { x: 0, y: 0 };
  esp.paradaPendiente = 0;
  for (const lado of ['local', 'visitante'] as const) {
    const equipo = estado.equipos[lado];
    const sacador = lado === saca ? sacadorDeCentro(equipo) : undefined;
    for (const j of titulares(equipo)) {
      const p = j === sacador ? { x: 4880, y: CENTRO_Y } : puntoSaqueCentro(equipo, j);
      const abs = aAbsoluta(lado, p);
      esp.jugadores[j.id] = { x: abs.x, y: abs.y, vx: 0, vy: 0, papel: -1000 };
    }
  }
  esp.balon = { x: LARGO / 2, y: CENTRO_Y, z: 0 };
}

/**
 * Objetivos a balón parado para la reanudación `motivo` del equipo `lado` (el que saca), en coordenadas
 * absolutas. Devuelve solo los jugadores que tienen un sitio especial; el resto sigue su objetivo normal.
 */
export function objetivosBalonParado(estado: EstadoMotor, motivo: string, lado: Lado, sacadorId: number): Map<number, Punto> {
  const objetivos = new Map<number, Punto>();
  const ataque = estado.equipos[lado];
  const defensa = estado.equipos[rival(lado)];
  const poner = (equipo: EquipoEstado, j: JugadorEnPartido, p: Punto) => objetivos.set(j.id, aAbsoluta(equipo.lado, p));

  if (motivo === 'saque_centro') {
    for (const equipo of [ataque, defensa]) {
      for (const j of titulares(equipo)) if (j.id !== sacadorId) poner(equipo, j, puntoSaqueCentro(equipo, j));
    }
    return objetivos;
  }

  const enArea = motivo === 'corner' || motivo === 'falta_area';
  if (enArea && estado.parametros.subidaArea) {
    colocarSubida(estado, ataque, defensa, sacadorId, poner);
    return objetivos;
  }
  if (enArea) {
    // Los que están más adelantados al empezar el saque atacan el área; el resto se queda atrás. El orden se
    // fija al principio para que nadie cambie de sitio a mitad de camino.
    const accion = estado.espacio.accion;
    if (accion && !accion.orden) {
      const x = (j: JugadorEnPartido) => {
        const q = estado.espacio.jugadores[j.id];
        return q ? (lado === 'local' ? q.x : LARGO - q.x) : anclaDe(ataque, j).x;
      };
      accion.orden = [...titulares(ataque)].sort((a, b) => x(b) - x(a) || a.id - b.id).map((j) => j.id);
    }
    const orden = accion?.orden ?? [];
    const candidatos = titulares(ataque)
      .filter((j) => j.id !== sacadorId && lineaDe(ataque, j) !== 'porteria')
      .sort((a, b) => orden.indexOf(a.id) - orden.indexOf(b.id) || a.id - b.id);
    const rematadores = candidatos.slice(0, motivo === 'corner' ? 5 : 4);
    rematadores.forEach((j, i) => poner(ataque, j, PUNTOS_AREA[i]!));
    candidatos.slice(rematadores.length).forEach((j, i) => {
      const a = anclaDe(ataque, j);
      poner(ataque, j, { x: i < 2 ? 4800 : acotar(a.x + 2500, 6200, 7800), y: a.y });
    });
    const defensores = titulares(defensa)
      .filter((j) => lineaDe(defensa, j) !== 'porteria')
      .sort((a, b) => anclaDe(defensa, a).x - anclaDe(defensa, b).x || a.id - b.id);
    defensores.slice(0, 6).forEach((j, i) => poner(defensa, j, PUNTOS_AREA_PROPIA[i]!));
    defensores.slice(6).forEach((j) => {
      const a = anclaDe(defensa, j);
      poner(defensa, j, { x: acotar(dividir(a.x, 2), 1500, 3000), y: a.y });
    });
    for (const j of titulares(defensa)) if (lineaDe(defensa, j) === 'porteria') poner(defensa, j, { x: 250, y: CENTRO_Y });
    return objetivos;
  }

  if (motivo === 'penalti') {
    for (const equipo of [ataque, defensa]) {
      for (const j of titulares(equipo)) {
        if (j.id === sacadorId) continue;
        if (lineaDe(equipo, j) === 'porteria') {
          poner(equipo, j, equipo === defensa ? { x: 80, y: CENTRO_Y } : { x: 400, y: CENTRO_Y });
          continue;
        }
        // Todos fuera del área, en la frontal.
        const a = anclaDe(equipo, j);
        const x = equipo === ataque ? 8150 : 1850;
        poner(equipo, j, { x, y: acotar(a.y, 1400, 5000) });
      }
    }
  }
  return objetivos;
}
