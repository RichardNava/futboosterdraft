# Contrato del motor: incidencias (spec 012)

Amplía el contrato de `packages/engine` ([001 engine-api](../../001-draft-manager-mvp/contracts/engine-api.md)).
Decisión en [research R2](../research.md#r2-parada-de-control-total-sin-cambiar-el-partido-fr-022-fr-025-sc-006).

## Estado

- `EquipoEstado.controlTotal: boolean` (por defecto `false`). Lo pone el servidor; no está en `EntradaPartido`.
- `EstadoMotor.incidencias: Incidencia[]` ([data-model §4](../data-model.md#4-incidencia-de-partido-motor)).

## `avanzar(estado, modo, opciones)`

1. Un lesionado o expulsado sale del campo **en el acto** y deja una `Incidencia` `pendiente` con su casilla.
2. Al terminar el paso:
   1. se aplican las decisiones con `aplicadaEnTick <= tick` (reproducción de un partido guardado);
   2. para cada incidencia pendiente cuyo equipo tiene `controlTotal`, quedan ≥ 7 jugadores, la fase no es
      `penaltis`/`finalizado` y el modo no es `final`: **corte** con `puntoDecision = true` y
      `resultado.incidencias` con todas las pendientes del paso (una sola parada);
   3. el resto: `resolverIncidencias()` automático.
3. Al reanudar tras un corte: `aplicarPendientes()` → `resolverIncidencias()` (lo no resuelto, automático).

## Decisiones

- `sustitucion` con `sale` = jugador de una incidencia `lesion` pendiente: válida; el que entra ocupa
  `incidencia.casillaId` y `incidencia.ancla`. Gasta un cambio.
- `sustitucion` con `sale` = expulsado: `JUGADOR_NO_EN_CAMPO` (como hoy).
- `formacion` y `recolocacion`: sin cambios (validan contra los que quedan en el campo).

## Invariantes (pruebas)

| # | Invariante |
|---|------------|
| I1 | Misma entrada y semilla: control total con parada y sin decisiones ≡ automático (resultado, eventos, estadísticas). |
| I2 | Control total con decisiones D en la parada ≡ reproducción del partido con D y su `aplicadaEnTick`. |
| I3 | Un lance del equipo sin `controlTotal` nunca corta el tramo. |
| I4 | Sin corte si el equipo queda con < 7, en la tanda o tras el final. |
| I5 | El PRNG no avanza entre el corte y la reanudación. |
