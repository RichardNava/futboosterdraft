/**
 * Prueba de carga de la beta (T139; SC-017; rehecha en 002/T153 y 003/T128): 100 partidas simultáneas, unos
 * 730 humanos conectados por WebSocket, con drafts y jornadas de torneo a la vez.
 *
 * Cada usuario virtual (VU) de k6 es **un humano**, como un navegador: así una petición HTTP síncrona solo frena a
 * su propio humano, no a los 8 de la partida (el fallo del guion en la 002). `setup()` registra a todos los usuarios,
 * crea las partidas de liga de 8 y las llena; después cada VU abre su WebSocket y juega el draft y el torneo
 * respondiendo al instante: elige la primera carta, abre su partido de cada jornada con la modalidad rápida
 * (spec 003, FR-032) y pulsa «Seguir» en cada descanso tras un lote de decisiones (FR-027). El anfitrión inicia el
 * draft cuando ve a todos los humanos conectados en la sala. Los torneos son siempre asíncronos (spec 002,
 * FR-030): un partido entre humanos se resuelve al abrirlo el primero. Las últimas `PARTIDAS_NPC` partidas son de un
 * invitado contra 7 NPC, que pide «Siguiente jornada» al cerrarse cada una.
 *
 * Comprueba (umbrales al final del informe de k6):
 * - `entrega_sobre_ms` p95 < 1 s: desde que un humano elige hasta que recibe el sobre siguiente
 *   (todos eligen al instante, así que mide la resolución del turno y la difusión).
 * - SC-009 sigue cumpliéndose: `descanso_ms` (inicio → descanso) y `final_ms` («Seguir» → final), p95 < 3 s.
 * - `apertura_ms` p95 < 3 s: respuesta de `POST /api/partidos/:id/abrir` (incluye resolver un partido
 *   entre humanos de una vez).
 * - `jornada_npc_ms` p95 < 10 s: desde que empiezan los partidos de una jornada hasta que se cierra.
 * - Ningún bloqueo: las 100 partidas terminan (`partidas_terminadas`, la cuenta el anfitrión) y no hay errores.
 *
 * Uso (ver README.md): con el servidor en marcha,
 *   k6 run tools/load/beta-100.js
 *   k6 run -e PARTIDAS=10 -e BASE_URL=http://localhost:3000 tools/load/beta-100.js
 * Con `-e METRICAS_URL=http://localhost:3000/metrics`, al terminar imprime el desglose por fases del servidor
 * (spec 010, research R12).
 */
/* global __ENV, __VU -- variables globales de k6 */
import http from 'k6/http';
import { check, fail } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { setTimeout, clearTimeout } from 'k6/timers';
import { WebSocket } from 'k6/experimental/websockets';

const BASE = __ENV.BASE_URL || 'http://localhost:3000';
const WS = BASE.replace(/^http/, 'ws');
const ORIGEN = __ENV.ORIGIN || 'http://localhost:5173';
const PARTIDAS = Number(__ENV.PARTIDAS || 100);
const PARTIDAS_NPC = Number(__ENV.PARTIDAS_NPC || Math.max(1, Math.round(PARTIDAS / 10)));
const HUMANOS = 8;
const TOTAL_HUMANOS = (PARTIDAS - PARTIDAS_NPC) * HUMANOS + PARTIDAS_NPC;
/** Tiempo máximo para terminar una partida: si se pasa, cuenta como bloqueo. */
const LIMITE_PARTIDA_MS = Number(__ENV.LIMITE_PARTIDA_S || 1200) * 1000;
/** Retraso máximo (al azar) antes de abrir cada partido; 0 = todos a la vez, el peor caso. */
const APERTURA_MAX_MS = Number(__ENV.APERTURA_MAX_S || 0) * 1000;
/** `/metrics` del servidor: si se indica, `teardown()` imprime el desglose por fases (spec 010). */
const METRICAS_URL = __ENV.METRICAS_URL;
/** Peticiones simultáneas en `setup()` (registro y creación). */
const LOTE = 50;
/** Descansos cortos para que el torneo dure minutos, no horas (ya no hay tiempo de preparación, spec 002). */
const TIEMPOS = { turnoDraftS: 45, descansoS: 5 };

const entregaSobre = new Trend('entrega_sobre_ms', true);
const descanso = new Trend('descanso_ms', true);
const final = new Trend('final_ms', true);
const apertura = new Trend('apertura_ms', true);
const jornadaNPC = new Trend('jornada_npc_ms', true);
const terminadas = new Counter('partidas_terminadas');
const bloqueadas = new Counter('partidas_bloqueadas');
const erroresWs = new Counter('errores_ws');

export const options = {
  setupTimeout: '10m',
  scenarios: {
    humanos: {
      executor: 'per-vu-iterations',
      vus: TOTAL_HUMANOS,
      iterations: 1,
      maxDuration: '40m',
      gracefulStop: '1m',
    },
  },
  thresholds: {
    entrega_sobre_ms: ['p(95)<1000'],
    descanso_ms: ['p(95)<3000'],
    final_ms: ['p(95)<3000'],
    apertura_ms: ['p(95)<3000'],
    jornada_npc_ms: ['p(95)<10000'],
    partidas_terminadas: [`count>=${PARTIDAS}`],
    partidas_bloqueadas: ['count==0'],
    errores_ws: ['count==0'],
    http_req_failed: ['rate<0.01'],
  },
};

const hex = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
const uuid = () => `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(12)}`;
const cabeceras = (cookie, conCuerpo = true) => ({ ...(conCuerpo ? { 'content-type': 'application/json' } : {}), origin: ORIGEN, ...(cookie ? { cookie } : {}) });
const cookieDe = (res) =>
  Object.entries(res.cookies)
    .map(([nombre, valores]) => `${nombre}=${valores[0].value}`)
    .join('; ');
/** Un almacén de cookies vacío por petición: la sesión va siempre en la cabecera `cookie` explícita. */
const peticion = (ruta, cuerpo, cookie) => ({
  method: 'POST',
  url: `${BASE}${ruta}`,
  body: cuerpo === undefined ? null : JSON.stringify(cuerpo),
  params: { headers: cabeceras(cookie, cuerpo !== undefined), jar: new http.CookieJar() },
});
const post = (cookie, ruta, cuerpo) => {
  const p = peticion(ruta, cuerpo, cookie);
  return http.post(p.url, p.body, p.params);
};

/** `http.batch` en lotes de `LOTE` para no abrir cientos de conexiones de golpe. */
function enLotes(peticiones) {
  const respuestas = [];
  for (let i = 0; i < peticiones.length; i += LOTE) respuestas.push(...http.batch(peticiones.slice(i, i + LOTE)));
  return respuestas;
}

/** Registra a los usuarios y crea y llena las partidas. Devuelve un humano por VU, en orden. */
/** Desglose por fases acumulado desde el arranque del servidor (reiniciarlo entre escenarios). */
export function teardown() {
  if (!METRICAS_URL) return;
  const r = http.get(METRICAS_URL);
  const lineas = String(r.body || '').split('\n').filter((l) => l.startsWith('operacion_fase_ms') || l.startsWith('operacion_consultas'));
  console.log(`Desglose por fases (${METRICAS_URL}):\n${lineas.join('\n')}`);
}

export function setup() {
  const conNPC = (p) => p >= PARTIDAS - PARTIDAS_NPC;
  const altas = [];
  for (let p = 0; p < PARTIDAS; p++) {
    for (let h = 0; h < (conNPC(p) ? 1 : HUMANOS); h++) {
      altas.push({ partida: p, anfitrion: h === 0, conNPC: conNPC(p) });
    }
  }
  const usuarios = enLotes(
    altas.map((a) =>
      a.conNPC
        ? peticion('/api/auth/invitado')
        : peticion('/api/auth/registro', { email: `${uuid()}@carga.test`, password: 'contraseña-de-carga', apodo: `C${hex(8)}` }),
    ),
  );
  usuarios.forEach((r, i) => {
    if (!check(r, { 'usuario creado': (x) => x.status === 200 })) fail(`registro ${i}: ${r.status} ${r.body}`);
    altas[i].cookie = cookieDe(r);
  });

  const anfitriones = altas.filter((a) => a.anfitrion);
  const creadas = enLotes(
    anfitriones.map((a) =>
      peticion('/api/partidas', { modo: 'liga', numParticipantes: 8, ...(a.conNPC ? {} : { plazasHumanas: HUMANOS }), tiempos: TIEMPOS }, a.cookie),
    ),
  );
  const ids = creadas.map((r, p) => {
    if (!check(r, { 'partida creada': (x) => x.status === 201 })) fail(`crear partida ${p}: ${r.status} ${r.body}`);
    return r.json('id');
  });
  for (const a of altas) a.partidaId = ids[a.partida];

  const invitados = altas.filter((a) => !a.anfitrion);
  enLotes(invitados.map((a) => peticion(`/api/partidas/${a.partidaId}/unirse`, undefined, a.cookie))).forEach((r) => {
    if (!check(r, { 'unido a la partida': (x) => x.status === 200 })) fail(`unirse: ${r.status} ${r.body}`);
  });
  return altas;
}

/** Conecta al humano de este VU y juega por él; resuelve cuando el torneo tiene campeón. */
function jugar({ partidaId, cookie, anfitrion, conNPC }) {
  return new Promise((resolve) => {
    let ws;
    let iniciada = false;
    let eligioEn = null;
    const inicios = new Map();
    const seguidos = new Map();
    let jornadaAbierta = null;
    let jornadasCerradas = 0;
    const abiertos = new Set();
    let pedidaSiguiente = 0;
    let terminado = false;
    const enviar = (m) => ws.send(JSON.stringify(m));
    const cerrar = (ok) => {
      if (terminado) return;
      terminado = true;
      clearTimeout(limite);
      ws.close();
      resolve(ok);
    };
    // Si la partida no termina a tiempo, cuenta como bloqueo (una vez por partida: lo cuenta el anfitrión).
    const limite = setTimeout(() => {
      if (anfitrion) bloqueadas.add(1);
      cerrar(false);
    }, LIMITE_PARTIDA_MS);

    const alError = (e) => {
      erroresWs.add(1);
      console.warn(`error de WebSocket en ${partidaId}: ${e.error}`);
      cerrar(false);
    };
    const alMensaje = (evento) => {
      const m = JSON.parse(evento.data);
      const ahora = Date.now();
      switch (m.t) {
        case 'sala.actualizada':
          // El anfitrión empieza el draft cuando están todos los humanos conectados.
          if (anfitrion && !iniciada && m.participantes.filter((p) => p.tipo === 'humano').every((p) => p.conectado)) {
            const plazas = m.participantes.filter((p) => p.tipo === 'humano').length;
            if (plazas === (conNPC ? 1 : HUMANOS)) {
              iniciada = true;
              check(post(cookie, `/api/partidas/${partidaId}/iniciar`), { 'draft iniciado': (r) => r.status === 200 });
            }
          }
          break;
        case 'draft.turno':
          if (eligioEn !== null) entregaSobre.add(ahora - eligioEn);
          eligioEn = ahora;
          enviar({ t: 'draft.elegir', requestId: uuid(), ronda: m.ronda, turno: m.turno, jugadorId: m.sobre.cartas[0].id });
          break;
        case 'draft.terminado':
          eligioEn = null;
          break;
        case 'preparacion.inicio':
          // «Comenzar partido» (rival NPC) o «Ver partido» (rival humano): ya no hay temporizador de preparación.
          if (!abiertos.has(m.partidoId)) {
            abiertos.add(m.partidoId);
            const abrir = () => {
              if (terminado) return;
              const r = post(cookie, `/api/partidos/${m.partidoId}/abrir`, { modalidad: 'rapida' });
              apertura.add(r.timings.duration);
              if (r.status !== 200) {
                erroresWs.add(1, { codigo: `abrir_${r.status}` });
                console.warn(`abrir ${m.partidoId} en ${partidaId}: ${r.status} ${r.body}`);
              }
            };
            // Con `APERTURA_MAX_S`, cada humano tarda un tiempo al azar en abrir, como en un torneo asíncrono real.
            if (APERTURA_MAX_MS > 0) setTimeout(abrir, Math.random() * APERTURA_MAX_MS);
            else abrir();
          }
          break;
        case 'partido.inicio':
          inicios.set(m.partidoId, ahora);
          // Todos los partidos de una jornada empiezan a la vez: el propio marca el inicio.
          jornadaAbierta = ahora;
          break;
        case 'partido.tramo':
          if (m.fase === 'descanso' && inicios.has(m.partidoId)) descanso.add(ahora - inicios.get(m.partidoId));
          if (m.fase === 'finalizado' && seguidos.has(m.partidoId)) final.add(ahora - seguidos.get(m.partidoId));
          break;
        case 'partido.pausa_decision':
          if (!seguidos.has(m.partidoId) || m.motivo === 'pre_prorroga') {
            seguidos.set(m.partidoId, ahora);
            // Spec 003 (FR-027): un lote de decisiones en el descanso (un cambio de táctica) antes de seguir.
            if (m.motivo === 'descanso') {
              enviar({
                t: 'partido.decisiones',
                requestId: uuid(),
                partidoId: m.partidoId,
                decisiones: [{ tipo: 'tactica', datos: { tactica: { sistemaDefensivo: 'zona', alturaBloque: 'medio', lineaAdelantada: false, estiloConBalon: 'combinativo', juegoVertical: false } } }],
              });
            }
            enviar({ t: 'partido.seguir', requestId: uuid(), partidoId: m.partidoId });
          }
          break;
        case 'torneo.actualizado': {
          const cerradas = (m.jornadas || []).filter((j) => j.estado === 'cerrada').length;
          if (cerradas > jornadasCerradas) {
            jornadasCerradas = cerradas;
            if (conNPC && jornadaAbierta !== null) jornadaNPC.add(ahora - jornadaAbierta);
            jornadaAbierta = null;
          }
          if (m.campeon) {
            cerrar(true);
            break;
          }
          // Con un solo humano la siguiente jornada se abre a mano (spec 002, research R9). `jornadaActual` es la
          // primera sin cerrar: se pide cuando sigue pendiente tras cerrarse otra.
          const actual = (m.jornadas || []).find((j) => j.numero === m.jornadaActual);
          if (m.siguienteJornada === 'manual' && actual?.estado === 'pendiente' && pedidaSiguiente < cerradas) {
            pedidaSiguiente = cerradas;
            post(cookie, `/api/partidas/${partidaId}/siguiente-jornada`);
          }
          break;
        }
        case 'ack':
          // Una elección que llega con el turno ya resuelto no es un fallo del servidor.
          if (!m.ok && m.error?.codigo !== 'TURNO_CERRADO' && m.error?.codigo !== 'SIN_PAUSA') {
            erroresWs.add(1, { codigo: m.error?.codigo ?? 'desconocido' });
            console.warn(`ack con error en ${partidaId}: ${m.error?.codigo} ${m.error?.mensaje}`);
          }
          break;
        case 'error':
          erroresWs.add(1, { codigo: m.codigo });
          console.warn(`error en ${partidaId}: ${m.codigo} ${m.mensaje}`);
          break;
      }
    };
    // Un turno fijo por VU (1 conexión cada 4 ms, las 730 en ~3 s): todas a la vez desbordan la cola de listen de Windows.
    setTimeout(() => {
      ws = new WebSocket(`${WS}/ws?partidaId=${partidaId}`, null, { headers: { cookie, origin: ORIGEN } });
      ws.onerror = alError;
      ws.onmessage = alMensaje;
    }, (__VU - 1) * 4);
  });
}

export default async function (humanos) {
  const humano = humanos[__VU - 1];
  const ok = await jugar(humano);
  if (ok && humano.anfitrion) terminadas.add(1);
}
