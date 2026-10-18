# Protocolo en tiempo real — cambios de la spec 003

Cambios sobre [001/contracts/realtime-protocol.md](../../001-draft-manager-mvp/contracts/realtime-protocol.md) y [002/contracts/realtime-protocol.md](../../002-mejoras-mvp/contracts/realtime-protocol.md). Esquemas Zod en `packages/protocol/src/ws/`.

## Servidor → cliente

### `preparacion.inicio` (✎)

```ts
{ t: 'preparacion.inicio', jornada, partidoId, rival: { id, nombre, bajas, humano }, venceEn?,
  modalidadPreferida: 'rapida' | '2d' }   // ✚ participantes.ultima_modalidad ?? perfiles_usuario.ultima_modalidad ?? 'rapida' (FR-032)
```

### `partido.inicio` (✎)

- `modalidad`: **la del participante que recibe el mensaje** (`partidos.modalidades[participanteId]`), no la de la partida (FR-033).
- `alineaciones[ladoPropio]` (✚): solo para el equipo del receptor, cada titular añade `casillaId`, `ancla` (`{x, y}` en unidades de campo) y `lanzadores`. Así el cliente puede derivar el estado del equipo para `GestionEquipo` (research R17). La alineación rival se sigue mostrando como hoy (001/FR-054a).
- `equipaciones` (✎): `{ local: Equipacion, visitante: Equipacion }` en formato v2, ya resueltas con `equipacionEnPartido` (FR-047).
- `gestionDisponible` (✚): `true` solo si el rival es un NPC. En los partidos entre humanos, que se juegan con decisiones automáticas (002/FR-030), es `false` y el cliente no muestra «Gestionar equipo» (FR-027, FR-031).

### `partido.decision_aplicada` (sin cambios de forma)

Se emite una por cada decisión de un lote, en orden y con el mismo `aplicadaEnTick`.

### `torneo.actualizado` (✎)

La vista por participante añade `miEliminacion`, `puedeSimularResto` y `pantallas` ([data-model.md](../data-model.md) §8.2). Tras `simular-resto`, se emite **una sola vez** al terminar el bucle (research R22).

### `estado` (✎)

`vista.partida` deja de incluir `tipoSimulacion`. La vista del partido en curso (`vistaPartido`) incluye `modalidad`, la del receptor.

## Cliente → servidor

### `partido.decisiones` (✚)

```ts
{
  t: 'partido.decisiones',
  requestId: string,          // idempotencia: el mismo requestId devuelve el mismo ack sin volver a aplicar
  partidoId: string,
  decisiones: { tipo: 'sustitucion' | 'formacion' | 'recolocacion' | 'tactica' | 'lanzadores'; datos: Record<string, unknown> }[]  // 1..20, en orden
}
```

**Semántica** (research R17):

- **Todo o nada**: el servidor valida en orden sobre una copia del estado del motor. Si alguna falla, no aplica ninguna.
- **Ventana**:
  - en un partido entre humanos, nunca: `SIN_PAUSA`;
  - en la rápida, solo con una pausa abierta (descanso o antes de la prórroga); si no, `SIN_PAUSA`;
  - en la 2D, en cualquier fase menos `finalizado` y `penaltis`.

  Las decisiones pedidas con el balón en juego se aplican en la siguiente interrupción, como mucho 1 minuto de juego después (002/FR-025a).

**Respuestas**:

- `ack { ok: true }`;
- o `ack { ok: false, error: { codigo, mensaje, indice } }`, donde `indice` es la posición de la decisión que falló y `codigo` uno de estos:
  - los de `validarDecision`: `SIN_SUSTITUCIONES`, `JUGADOR_NO_DISPONIBLE`, `ALINEACION_INVALIDA`, `TACTICA_INVALIDA`…;
  - `SIN_PAUSA` y `PARTIDO_NO_ENCONTRADO`.

`partido.decision` (una sola decisión) **se mantiene** por compatibilidad. Es equivalente a un lote de una decisión. El cliente nuevo usa solo `partido.decisiones`.

### `partido.reproduccion` (sin cambios)

Al abrir `GestionEquipo` en la 2D, el cliente deja de enviar avances de reproducción mientras está pausado. El búfer del servidor no pasa de 60 ticks por delante del último tick informado (002/R6).

## Garantías de orden (añadidas)

- Las `partido.decision_aplicada` de un lote se emiten antes del siguiente `partido.tramo` que incluya su `aplicadaEnTick`.
- El servidor no envía ninguna instantánea del equipo para la gestión. El cliente deriva el estado que muestra `GestionEquipo` solo con los eventos de tick ≤ el tick de reproducción actual. Los tramos del búfer que ya tiene en memoria (002/R6) no se usan para esa vista. Así la gestión no adelanta información.
