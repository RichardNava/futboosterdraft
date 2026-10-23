# Contrato — Protocolo en tiempo real (WS)

Cambios sobre [003/contracts/realtime-protocol.md](../../003-mejoras-ux-simulacion/contracts/realtime-protocol.md).

## Mensajes modificados

| Mensaje | Cambio |
|---|---|
| `sala.actualizada` | la vista de la sala añade `modo` y `duelos: { formacion, estadoForma } \| null`. Se emite también tras `PUT /api/partidas/:id/duelos` |
| `draft.turno`, `draft.progreso` | las cartas llevan `virtudes` (antes `specials`) y `defectos` |
| `preparacion.inicio` | añade `modo` y, en duelos, `formacionFija` y `soloTitulares: true` |
| `partido.tramo`, `partido.reproduccion` | los eventos pueden ser de tipo `malestar` (`{ defecto, activo, jugadorId }`). El evento `penalti` añade `datos.resultado` cuando se resuelve el lanzamiento |
| `torneo.actualizado` | cada cruce del cuadro añade `tipo: 'futbol' \| 'duelos'`. En los cruces de duelos con visionado pendiente para el destinatario, el ganador y el marcador se ocultan, igual que en 002/FR-030 |

## Mensajes nuevos

No hay. Los cruces de duelos se resuelven en el servidor al abrirse la ronda y se consultan por HTTP
([http-api.md](./http-api.md)). No hace falta un canal en vivo: la animación es una reproducción de un resultado ya
calculado.
