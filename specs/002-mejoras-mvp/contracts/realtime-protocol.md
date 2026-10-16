# Protocolo en tiempo real — cambios de la spec 002

Sobre [001/contracts/realtime-protocol.md](../../001-draft-manager-mvp/contracts/realtime-protocol.md). Las reglas generales (autoridad, `requestId`, visibilidad, reconexión con `estado` y horas absolutas) no cambian. Se activa `permessage-deflate` en el servidor (research R5).

## Servidor → cliente

| `t` | Cambio | Detalle |
|-----|--------|---------|
| `estado` | Cambia | La `vista` del partido 2D en directo pasa a ser `{ tramos, ultimoTickInformado, pausa? }` (sin velocidades). La vista del torneo se filtra por participante ("pendiente de ver", research R8). |
| `draft.turno` | Cambia | Añade `animacion: boolean`, que vale `true` solo en el primer envío del turno 1 de cada ronda (sobre propio, FR-006, R17). En el turno 1, `venceEn` incluye el margen de la animación (FR-008). |
| `draft.progreso` | Cambia | Añade `pendientes: { id, nombre }[]`: los humanos que aún no han elegido (FR-013). Sigue sin incluir qué carta ha elegido nadie. |
| `torneo.actualizado` | Cambia | Se envía **a cada participante por separado** con su vista filtrada. Añade `goleadores` y `asistentes` (las 10 primeras filas, FR-040), `pendientesDeVer: partidoId[]` y `siguienteJornada: 'manual' \| 'automatica'`. |
| `preparacion.inicio` | Cambia | `venceEn` solo aparece si hay plazo de jornada (varios humanos). No hay temporizador de preparación (R9). |
| `partido.inicio` | Cambia | Añade `ordenJugadores: number[]` (el orden de los fotogramas v2), `dorsalesAsignados: { jugadorId, dorsal }[]` (FR-038) y `decisiones: boolean` (false al ver un partido entre humanos). Las alineaciones incluyen `colocacion`. |
| `partido.tramo` | Cambia | `fotogramas` en formato v2. Añade `acciones: AccionVisible[]` y `provisional: false`. En la 2D en directo se envía por adelantado, según el búfer de research R6. |
| `partido.pausa_decision` | Cambia | Solo hay un humano: desaparece `listos`. Se emite en el descanso y antes de la prórroga, en la rápida y en la 2D en directo. |
| `partido.velocidad` | **Se elimina** | La velocidad es solo del cliente (FR-025, R6). |
| `partido.fin` | Cambia | Añade `estadisticas` con `centros` y `precisionPase`. Tras «Finalizar», puede llegar después de varios `partido.tramo` por partes (FR-027, R7). |
| `partida.pausada` | **Nuevo** | `{ pausada: boolean }`. Confirma la pausa o la reanudación de una partida de un humano (R10). |

## Cliente → servidor

| `t` | Cambio | Validación en el servidor |
|-----|--------|---------------------------|
| `partido.seguir` | Cambia | Durante `pausa_decision`, por el único humano del partido. Reanuda de inmediato (FR-012). |
| `partido.decision` | Sin cambios de forma | 2D: se aplica en la primera interrupción aún no simulada (R6). `recolocacion` admite `colocacion`. |
| `partido.reproduccion` | Cambia | `{ partidoId, tick, velocidad: 2 \| 4 \| 8 }`. Lo usa el búfer de anticipación (R6). Ya no bloquea a ningún otro humano. Solo se acepta en un partido en directo contra un NPC. |
| `partido.velocidad` | **Se elimina** | — |
| `partido.finalizar` | **Nuevo** | `{ requestId, partidoId }`. En un partido en directo del participante, en cualquier fase menos `finalizado`: el servidor ejecuta `resolverResto` (R7) y responde con `ack`, los `partido.tramo` que falten y `partido.fin`. Es idempotente. |
| `partida.pausar` | **Nuevo** | `{ requestId }`. Se envía al navegar desde la barra. Solo tiene efecto si el participante es el único humano (FR-021, R10). Al reconectar, la partida se reanuda sola. |

Un partido entre humanos ya resuelto no usa el WebSocket para reproducirse: se pide por HTTP (ver [http-api.md](./http-api.md)).

## Garantías de orden (añadidas)

- En la 2D en directo, los `partido.tramo` llegan en orden y sin huecos de ticks. El búfer nunca adelanta un descanso ni el final del tiempo reglamentario.
- Tras `partido.finalizar`, no llega ningún `partido.pausa_decision` más de ese partido.
- `torneo.actualizado` llega después de `partido.fin` del partido que lo provoca (001/R4, `ctx.publicar`).
