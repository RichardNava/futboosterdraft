# Contrato HTTP/JSON — cambios de la spec 002

Sobre [001/contracts/http-api.md](../../001-draft-manager-mvp/contracts/http-api.md). Los formatos de error, los códigos HTTP y `Idempotency-Key` no cambian. Las respuestas grandes se comprimen con `@fastify/compress` (research R5).

## Partidas

| Método y ruta | Cambio | Reglas |
|---------------|--------|--------|
| `POST /api/partidas` | Cambia | El cuerpo pierde `ritmo` y `tiempos.preparacionS` y `tiempos.preparacionInicialS`. `plazoJornadaHoras` solo se usa con varios humanos (R9). Si llega `ritmo`, se responde `400`. |
| `GET /api/mis-partidas` | **Nuevo** | Partidas del usuario: `{ enCurso: PartidaResumen[], terminadas: PartidaResumen[] }`, con `PartidaResumen = { id, modo, fase, nombreEquipo, rival?, jornadaActual?, accionPendiente?: 'elegir' \| 'jugar' \| 'ver' \| 'siguiente_jornada', actualizadaEn }`. Para la pantalla «Mis partidas» (FR-017). |
| `POST /api/partidas/:id/abandonar` | Cambia | También en la fase de draft: la plaza pasa a un NPC intermedio y, si no ha elegido en el turno abierto, el NPC elige al instante (FR-019, R11). |
| `POST /api/partidas/:id/siguiente-jornada` | **Nuevo** | Solo en una partida de un humano, con la jornada actual `cerrada`. Abre la siguiente y resuelve los partidos NPC contra NPC (FR-030). Errores: `409 JORNADA_ABIERTA`, `409 TORNEO_TERMINADO` y `403 HAY_VARIOS_HUMANOS`. Es idempotente. |

## Plantilla y alineación

| Método y ruta | Cambio | Reglas |
|---------------|--------|--------|
| `PUT /api/partidas/:id/alineacion` | Cambia | El cuerpo admite `colocacion?: { jugadorId, x, y }[]`. Nuevos motivos de `422 ALINEACION_INVALIDA`: `PORTERO_FUERA_DE_PORTERIA`, `JUGADOR_EN_PORTERIA` y `COLOCACION_FUERA_DEL_CAMPO` (FR-034a). |
| `POST /api/partidas/:id/alineacion/previsualizar` | Cambia | Devuelve la `Previsualizacion` de [engine-api.md](./engine-api.md): posición efectiva, penalización, stats efectivos, `personalizada`, `reparto`, `ofensividad`, `amplitud` y `avisos`. La interfaz calcula lo mismo en el cliente para responder al instante (SC-016), y esta ruta es la referencia. |
| `GET /api/partidas/:id/alineacion` | Cambia | Incluye `colocacion` y la previsualización. |
| `PUT /api/partidas/:id/dorsales` | Cambia | Cuerpo `{ jugadorId, dorsal }` (un cambio por petición). Si otro jugador tenía ese dorsal, se queda sin dorsal (FR-037). Respuesta: `{ dorsales, sinDorsal: jugadorId[] }`. Desaparece `DORSAL_REPETIDO` y se mantiene `422 DORSAL_FUERA_DE_RANGO` (1–99). |
| `GET /api/partidas/:id/plantillas` | Cambia | Los dorsales pueden faltar ("sin dorsal"). |

## Partidos y torneo

| Método y ruta | Cambio | Reglas |
|---------------|--------|--------|
| `POST /api/partidos/:id/listo` | **Se elimina** | La sustituye `abrir`. |
| `POST /api/partidos/:id/abrir` | **Nuevo** | «Comenzar partido» o «Ver partido». Si el rival es un NPC: empieza el partido en directo y la respuesta es `{ modo: 'directo' }`; después se sigue por WebSocket. Si es un humano: resuelve el partido si aún está `programado` (una sola vez, R8) y responde `{ modo: 'reproduccion' }`. Errores: `404 PARTIDO_NO_ENCONTRADO` y `409 JORNADA_NO_ABIERTA`. Es idempotente. |
| `GET /api/partidos/:id/reproduccion` | **Nuevo** | Partido ya resuelto en el que participa el usuario: `{ inicio (como partido.inicio), tramos: [{ desdeTick, hastaTick, fase, eventos, acciones, fotogramas? }], fin }`. Los fotogramas se recalculan y se guardan en caché (R8). Sin `fotogramas` si la partida es de simulación rápida. `409 VERSION_NO_REPRODUCIBLE` con un partido de parámetros 1.x. |
| `POST /api/partidos/:id/visto` | **Nuevo** | Marca el visionado del participante como `visto`. Lo envía el cliente al llegar al final o al pulsar «Finalizar» en una reproducción. Es idempotente. |
| `POST /api/partidos/:id/revelar` | **Nuevo** | «Mostrar resultado» sin verlo: el visionado pasa a `revelado`. |
| `GET /api/partidos/:id` | Cambia | Con el visionado `pendiente`, devuelve `{ estado: 'pendiente_de_ver' }` sin marcador ni eventos. Las estadísticas incluyen `centros` y `precisionPase`. |
| `GET /api/partidas/:id/torneo` | Cambia | Vista filtrada por participante (R8). Añade `goleadores`, `asistentes` (las 10 primeras filas), `pendientesDeVer` y `siguienteJornada`. |
| `GET /api/partidas/:id/torneo/goleadores?todos=true` | **Nuevo** | Tabla completa de goleadores, con la misma exclusión. |
| `GET /api/partidas/:id/torneo/asistentes?todos=true` | **Nuevo** | Tabla completa de asistentes. |

Fila de las tablas (FR-040): `{ posicion, jugador: { id, nombre, apellidos, dorsal? }, equipo: { id, nombre }, total, partidosJugados }`.
