/**
 * Prueba de carga de la beta (T139; SC-017): 100 partidas simultáneas, unos 800 participantes
 * conectados por WebSocket, con drafts y jornadas de torneo a la vez.
 *
 * Cada usuario virtual (VU) de k6 es una partida: registra a sus humanos, crea una liga de 8 en
 * directo, abre un WebSocket por humano y juega el draft y el torneo completos respondiendo al
 * instante (eligen la primera carta y pulsan «Seguir» en cada descanso). Las últimas `PARTIDAS_NPC`
 * partidas son de un invitado contra 7 NPC, para medir las jornadas con partidos NPC.
 *
 * Comprueba (umbrales al final del informe de k6):
 * - `entrega_sobre_ms` p95 < 1 s: desde que un humano elige hasta que recibe el sobre siguiente
 *   (todos eligen al instante, así que mide la resolución del turno y la difusión).
 * - SC-009 sigue cumpliéndose: `descanso_ms` (inicio → descanso) y `final_ms` («Seguir» → final), p95 < 3 s.
 * - `jornada_npc_ms` p95 < 10 s: desde que empiezan los partidos de una jornada hasta que se cierra.
 * - Ningún bloqueo: las 100 partidas terminan (`partidas_terminadas`) y no hay errores.
 *
 * Uso (ver README.md): con el servidor en marcha,
 *   k6 run tools/load/beta-100.js
 *   k6 run -e PARTIDAS=10 -e BASE_URL=http://localhost:3000 tools/load/beta-100.js
 */
/* global __ENV, __VU -- variables globales de k6 */
import http from 'k6/http';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { setTimeout, clearTimeout } from 'k6/timers';
import { WebSocket } from 'k6/experimental/websockets';

const BASE = __ENV.BASE_URL || 'http://localhost:3000';
const WS = BASE.replace(/^http/, 'ws');
const ORIGEN = __ENV.ORIGIN || 'http://localhost:5173';
const PARTIDAS = Number(__ENV.PARTIDAS || 100);
const PARTIDAS_NPC = Number(__ENV.PARTIDAS_NPC || Math.max(1, Math.round(PARTIDAS / 10)));
const HUMANOS = 8;
/** Tiempo máximo para terminar una partida: si se pasa, cuenta como bloqueo. */
const LIMITE_PARTIDA_MS = Number(__ENV.LIMITE_PARTIDA_S || 1200) * 1000;
/** Tiempos cortos de preparación y descanso para que el torneo dure minutos, no horas. */
const TIEMPOS = { turnoDraftS: 45, preparacionS: 5, preparacionInicialS: 5, descansoS: 5 };

const entregaSobre = new Trend('entrega_sobre_ms', true);
const descanso = new Trend('descanso_ms', true);
const final = new Trend('final_ms', true);
const jornadaNPC = new Trend('jornada_npc_ms', true);
const terminadas = new Counter('partidas_terminadas');
const bloqueadas = new Counter('partidas_bloqueadas');
const erroresWs = new Counter('errores_ws');

export const options = {
  scenarios: {
    partidas: {
      executor: 'per-vu-iterations',
      vus: PARTIDAS,
      iterations: 1,
      maxDuration: '40m',
      gracefulStop: '1m',
    },
  },
  thresholds: {
    entrega_sobre_ms: ['p(95)<1000'],
    descanso_ms: ['p(95)<3000'],
    final_ms: ['p(95)<3000'],
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

/** Cada usuario lleva su propio almacén de cookies: un VU maneja varios usuarios. */
function crearUsuario(invitado) {
  const jar = new http.CookieJar();
  const res = invitado
    ? http.post(`${BASE}/api/auth/invitado`, null, { headers: cabeceras(undefined, false), jar })
    : http.post(
        `${BASE}/api/auth/registro`,
        JSON.stringify({ email: `${uuid()}@carga.test`, password: 'contraseña-de-carga', apodo: `C${hex(8)}` }),
        { headers: cabeceras(), jar },
      );
  check(res, { 'usuario creado': (r) => r.status === 200 });
  return { cookie: cookieDe(res), jar };
}

const post = (u, ruta, cuerpo) =>
  http.post(`${BASE}${ruta}`, cuerpo === undefined ? null : JSON.stringify(cuerpo), { headers: cabeceras(u.cookie, cuerpo !== undefined), jar: u.jar });

/** Conecta un humano y juega por él; resuelve cuando el torneo tiene campeón. */
function jugar(partidaId, u, opciones) {
  return new Promise((resolve) => {
    const ws = new WebSocket(`${WS}/ws?partidaId=${partidaId}`, null, { headers: { cookie: u.cookie, origin: ORIGEN } });
    let yo = null;
    let eligioEn = null;
    const inicios = new Map();
    const seguidos = new Map();
    let jornadaAbierta = null;
    let jornadasCerradas = 0;
    let terminado = false;
    const enviar = (m) => ws.send(JSON.stringify(m));
    const cerrar = (ok) => {
      if (terminado) return;
      terminado = true;
      ws.close();
      resolve(ok);
    };

    ws.onopen = () => opciones.alConectar();
    ws.onerror = () => {
      erroresWs.add(1);
      cerrar(false);
    };
    ws.onmessage = (evento) => {
      const m = JSON.parse(evento.data);
      const ahora = Date.now();
      switch (m.t) {
        case 'estado':
          yo = m.vista?.partida?.miParticipanteId ?? yo;
          break;
        case 'draft.turno':
          if (eligioEn !== null) entregaSobre.add(ahora - eligioEn);
          eligioEn = ahora;
          enviar({ t: 'draft.elegir', requestId: uuid(), ronda: m.ronda, turno: m.turno, jugadorId: m.sobre.cartas[0].id });
          break;
        case 'draft.terminado':
          eligioEn = null;
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
            enviar({ t: 'partido.seguir', requestId: uuid(), partidoId: m.partidoId });
          }
          break;
        case 'torneo.actualizado': {
          const cerradas = (m.jornadas || []).filter((j) => j.estado === 'cerrada').length;
          if (cerradas > jornadasCerradas) {
            jornadasCerradas = cerradas;
            if (opciones.medirJornadas && jornadaAbierta !== null) jornadaNPC.add(ahora - jornadaAbierta);
            jornadaAbierta = null;
          }
          if (m.campeon) cerrar(true);
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
    opciones.registrarCierre(() => cerrar(false));
  });
}

export default async function () {
  const conNPC = __VU > PARTIDAS - PARTIDAS_NPC;
  const usuarios = Array.from({ length: conNPC ? 1 : HUMANOS }, () => crearUsuario(conNPC));
  const [anfitrion, ...otros] = usuarios;

  const creada = post(anfitrion, '/api/partidas', {
    modo: 'liga',
    numParticipantes: 8,
    tipoSimulacion: 'rapida',
    ritmo: 'directo',
    ...(conNPC ? {} : { plazasHumanas: HUMANOS }),
    tiempos: TIEMPOS,
  });
  if (!check(creada, { 'partida creada': (r) => r.status === 201 })) return;
  const partidaId = creada.json('id');
  for (const u of otros) check(post(u, `/api/partidas/${partidaId}/unirse`), { 'unido a la partida': (r) => r.status === 200 });

  // Se conectan todos antes de empezar el draft.
  let conectados = 0;
  let alConectarTodos;
  const todosConectados = new Promise((r) => (alConectarTodos = r));
  const cierres = [];
  const opciones = (i) => ({
    medirJornadas: conNPC && i === 0,
    alConectar: () => {
      conectados++;
      if (conectados === usuarios.length) alConectarTodos();
    },
    registrarCierre: (f) => cierres.push(f),
  });
  const partidas = usuarios.map((u, i) => jugar(partidaId, u, opciones(i)));
  await todosConectados;
  check(post(anfitrion, `/api/partidas/${partidaId}/iniciar`), { 'draft iniciado': (r) => r.status === 200 });

  // Si la partida no termina a tiempo, cuenta como bloqueo.
  const limite = setTimeout(() => {
    bloqueadas.add(1);
    for (const f of cierres) f();
  }, LIMITE_PARTIDA_MS);
  const resultados = await Promise.all(partidas);
  clearTimeout(limite);
  if (resultados.every(Boolean)) terminadas.add(1);
}
