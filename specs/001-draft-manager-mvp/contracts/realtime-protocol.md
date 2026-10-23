# Protocolo en tiempo real (WebSocket) — Fútboosterdraft MVP

**Conexión**: `GET /ws?partidaId=<uuid>`, que se autentica con la cookie de sesión. Hay una conexión por pestaña y partida.

**Formato**: mensajes JSON `{ "t": "<tipo>", ...datos }`. Los esquemas se definen con Zod en
`packages/protocol` y se validan en ambos extremos. Cualquier mensaje inválido del cliente recibe `error`
y se descarta.

**Reglas generales**:

1. **Autoridad**: el cliente solo envía *intenciones*. El servidor valida y decide (FR-061).
2. **Duplicados**: todo mensaje del cliente que cambia estado lleva `requestId` (UUID). El servidor guarda los `requestId` ya procesados por partida y responde `ack` con el mismo resultado si se repite (FR-062).
3. **Visibilidad**: el servidor solo envía a cada participante lo que puede ver (FR-007, FR-054a). No existe ningún mensaje que difunda la elección de otro participante durante el turno ni la alineación del rival antes del partido.
4. **Reconexión**: al conectar o reconectar, el servidor envía `estado` con la instantánea completa visible para ese participante. Al cliente no le hace falta ningún historial.
5. **Tiempos**: todos los plazos se envían como hora absoluta del servidor (`venceEn`, ISO-8601). El cliente corrige el desfase de su reloj con `serverTime`, que va en cada `estado`.

---

## Servidor → cliente

| `t` | Datos | Cuándo |
|-----|-------|--------|
| `estado` | `{ serverTime, fase: 'sala' \| 'draft' \| 'preparacion' \| 'partido' \| 'torneo', vista: <instantánea filtrada> }` | Al conectar, al reconectar y en cada cambio de fase. |
| `ack` | `{ requestId, ok: true }` o `{ requestId, ok: false, error: { codigo, mensaje } }` | Respuesta a cada mensaje del cliente que cambia estado. |
| `error` | `{ codigo, mensaje }` | Mensaje mal formado o sin permisos. |
| `sala.actualizada` | `{ participantes: [{ id, nombre, tipo, nivelNPC?, conectado }], venceBusquedaEn }` | Alguien entra o sale, o se añade un NPC. |
| `draft.turno` | `{ ronda, turno, direccion: 'izquierda' \| 'derecha', sobre: { id, cartas: JugadorResumen[] }, venceEn, misElecciones: JugadorResumen[] }` | Empieza un turno. Solo el sobre propio. |
| `draft.progreso` | `{ ronda, turno, eligieron: participanteId[] }` | Alguien confirma. **No** incluye qué carta eligió. |
| `draft.eleccion_auto` | `{ ronda, turno, jugador: JugadorResumen }` | Solo al afectado, cuando vence su turno (FR-009). |
| `draft.terminado` | `{ plantillas: { participanteId, jugadores: JugadorResumen[] }[] }` | Fin del draft: las plantillas de todos pasan a ser visibles. |
| `torneo.actualizado` | `{ jornadaActual, clasificacion? , cuadro?, resultados: PartidoResumen[] }` | Se cierra un partido o una jornada. |
| `preparacion.inicio` | `{ partidoId, rival: { id, nombre, bajas }, venceEn }` | Abre la ventana de preparación. |
| `partido.inicio` | `{ partidoId, modalidad: 'rapida' \| '2d', local, visitante, alineaciones: { local, visitante }, dorsales: { [jugadorId]: n }, equipaciones: { local: Equipacion, visitante: Equipacion } }` (la equipación que usa cada uno en este partido, FR-031b) | Empieza el partido. Aquí se revelan las alineaciones (FR-054a). |
| `partido.tramo` | `{ desdeTick, hastaTick, eventos: EventoPartido[], marcador, estadisticas, fotogramas?: Fotograma[] }` | Simulación de un tramo: hasta el descanso o el final en la rápida, hasta la siguiente interrupción en 2D. |
| `partido.pausa_decision` | `{ motivo: 'descanso' \| 'pre_prorroga', venceEn, listos: participanteId[] }` | Descanso o antes de la prórroga en la modalidad rápida (FR-045, FR-046). |
| `partido.decision_aplicada` | `{ participanteId, tipo, datos, aplicadaEnTick }` | A ambos participantes, cuando la decisión se hace efectiva (FR-050). |
| `partido.velocidad` | `{ velocidadEfectiva: 2 \| 4 \| 8 \| 16 \| 32 }` | 2D: cambia la mínima entre los dos humanos (FR-049). |
| `partido.fin` | `{ marcador, penaltis?, eventos: EventoPartido[] (relevantes), estadisticas, bajasNuevas: Baja[] }` | Final del partido (FR-047, FR-043). |
| `aviso` | `{ tipo, partidaId, partidoId?, texto }` | Avisos en vivo (FR-056b). |

`JugadorResumen` = `{ id, nombre, apellidos, demarcacion, posicion, media, nivel, virtudes, stats }`. La ficha completa (historia, etc.) se pide por HTTP.

`Fotograma` = `{ tick, balon: [x, y], j: { [jugadorId]: [x, y] } }`, con coordenadas normalizadas 0–1000 (longitud) y 0–640 (anchura), y un fotograma por segundo de juego.

## Cliente → servidor

| `t` | Datos | Validación en el servidor |
|-----|-------|---------------------------|
| `draft.elegir` | `{ requestId, ronda, turno, jugadorId }` | El turno está abierto y `ahora ≤ venceEn`; es el sobre del participante en ese turno; es su primera elección del turno (FR-010). Una elección tardía o repetida devuelve `ack` con `ok: false` y `TURNO_CERRADO` o `YA_ELEGIDO`. Una carta que no está en el sobre devuelve `CARTA_NO_EN_SOBRE`, y se puede volver a elegir. |
| `partido.seguir` | `{ requestId, partidoId }` | Durante `pausa_decision` (FR-046). |
| `partido.decision` | `{ requestId, partidoId, tipo, datos }` | Reglas de FR-042 y FR-030. Rápida: solo durante `pausa_decision`. 2D: en cualquier momento, y queda pendiente hasta la siguiente interrupción. |
| `partido.velocidad` | `{ partidoId, velocidad: 2 \| 4 \| 8 \| 16 \| 32 }` | 2D. |
| `partido.reproduccion` | `{ partidoId, tick }` | 2D: reloj de reproducción del cliente, enviado cada ~500 ms. El servidor solo simula el siguiente tramo cuando todos los humanos han llegado a la interrupción (research R11). |
| `ping` | `{ }` | Mantiene viva la conexión; el servidor responde `pong`. |

## Garantías de orden

- Dentro de una partida, el servidor procesa los mensajes en el orden en que llegan (actor en serie, research R4) y emite los mensajes de salida en orden causal.
- `partido.tramo` se emite una sola vez por tramo. Si el cliente reconecta, recibe en `estado` los tramos ya simulados del partido en curso.
- En la modalidad rápida, el primer `partido.tramo` (hasta el descanso) se emite como mucho 3 s después de `partido.inicio` (SC-009).
