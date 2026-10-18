# Contrato HTTP/JSON — cambios de la spec 003

Cambios sobre [001/contracts/http-api.md](../../001-draft-manager-mvp/contracts/http-api.md) y [002/contracts/http-api.md](../../002-mejoras-mvp/contracts/http-api.md). Esquemas Zod en `packages/protocol/src/http/`. Todas las rutas requieren sesión, salvo que se indique otra cosa. Los errores siguen el formato común `{ codigo, mensaje }`.

## Partidas

### `POST /api/partidas` (✎)

- `tipoSimulacion` **se elimina** del cuerpo (FR-034). Si un cliente antiguo lo envía, se ignora (Zod sin `strict`).
- La respuesta y `GET /api/partidas/:id` dejan de incluir `tipoSimulacion`.

### `PUT /api/partidas/:id/nombre-equipo` (✚)

```ts
// Cuerpo
{ nombre: string }
// 200
{ nombre: string }   // normalizado
```

| Código | Cuándo |
|---|---|
| 422 `NOMBRE_CORTO` / `NOMBRE_LARGO` / `NOMBRE_VACIO` | `validarNombre` (FR-043) |
| 409 `NOMBRE_REPETIDO` | otro equipo de la partida ya lo usa (sin distinguir mayúsculas) |
| 409 `TORNEO_INICIADO` | ya se ha abierto algún partido de la partida (algún partido con estado distinto de `pendiente`) o la partida ha terminado (FR-042). Durante la sala, el draft y la preparación del primer partido se puede cambiar. |
| 403 `NO_PARTICIPA` | el usuario no participa en la partida |

Si la operación cambia algo, emite `sala.actualizada` o `estado` a los participantes.

### `POST /api/partidas/:id/simular-resto` (✚)

Cabecera `Idempotency-Key` obligatoria (patrón de 002/R18).

- **200** `{ ok: true, campeon: { id, nombre } }`: el torneo ha terminado. Todos los partidos pendientes quedan registrados (FR-041a y FR-041b).
- **409** `HAY_HUMANOS_EN_COMPETICION`: queda algún humano activo sin eliminar (FR-041b).
- **409** `NO_ELIMINADO`: quien lo pide no está eliminado.
- **409** `TORNEO_TERMINADO`: ya hay campeón. Con la misma `Idempotency-Key` se devuelve la respuesta original.

### `POST /api/partidas/:id/pantalla-vista` (✚)

```ts
{ pantalla: 'derrota' | 'campeon' }  →  200 { ok: true }
```

Fija `derrota_vista_en` o `campeon_visto_en` si eran nulos (FR-041). Es idempotente.

### `GET /api/partidas/:id/torneo` (✎)

Añade `miEliminacion`, `puedeSimularResto` y `pantallas` ([data-model.md](../data-model.md) §8.2).

## Plantilla, alineación y equipaciones

### `GET /api/partidas/:id/alineacion` (✎)

`equipaciones` en formato v2 (`{ primera: { diseno, colores }, segunda: … }`).

### `PUT /api/partidas/:id/equipaciones` (✎)

- **Cuerpo**: `Equipaciones` v2.
- **Errores** 422: `COLOR_INVALIDO`, `DISENO_INVALIDO`, `NUM_COLORES_INVALIDO` y `EQUIPACIONES_PARECIDAS` (sustituye a `EQUIPACIONES_IGUALES`).
- **Compatibilidad**: un cuerpo v1 (`{ principal, secundario }`) se convierte con `desdeV1` antes de validarlo, durante un periodo de compatibilidad.

## Perfil de usuario (✚)

### `GET /api/perfil`

`200 { nombreEquipo: string | null, equipaciones: Equipaciones | null }`. Si no hay perfil guardado, devuelve `null` en los dos campos.

### `PUT /api/perfil`

- **Cuerpo**: `{ nombreEquipo?: string | null, equipaciones?: Equipaciones | null }`.
- **Respuesta**: 200 con el perfil guardado.
- **Errores**:
  - 422: los de `validarNombre` (sin la unicidad) y los de `validarEquipaciones`;
  - 403 `SOLO_REGISTRADOS`: el usuario es invitado (FR-042b).

## Partidos

### `POST /api/partidos/:id/abrir` (✎)

```ts
// Cuerpo (✚)
{ modalidad: 'rapida' | '2d' }
// 200
{ modo: 'directo' | 'reproduccion', modalidad: 'rapida' | '2d' }   // modalidad ✚: la fijada para este participante
```

1. **Primera apertura** de este participante: fija `partidos.modalidades[participanteId] = modalidad` y `participantes.ultima_modalidad = modalidad` y, si es un usuario registrado, `perfiles_usuario.ultima_modalidad = modalidad` (FR-032).
2. **Aperturas siguientes**: devuelven la `modalidad` ya fijada e ignoran la que se envía (FR-035).
3. **Contra un NPC**: inicia el partido en directo en la modalidad elegida.
4. **Contra un humano**: lo resuelve si aún no lo está (002/R8) y devuelve `reproduccion`.

Cada humano elige su modalidad por separado (FR-033). Los errores no cambian.

### `GET /api/partidos/:id/reproduccion?modalidad=rapida|2d` (✎)

- `modalidad` es opcional. Por defecto vale `partidos.modalidades[participanteId]` y, si no existe, `rapida`.
- Con `2d` incluye los fotogramas; con `rapida`, solo los tramos y los eventos.
- El resultado, los eventos y las estadísticas son idénticos para los dos modos (SC-018).
- La caché se indexa por `partidoId:modalidad`.
- Los partidos con parámetros < 3 devuelven 409 `VERSION_NO_REPRODUCIBLE` (research R2).

### `GET /api/partidos/:id` (✎)

`modalidad` es la del participante que pregunta. `equipaciones` va en formato v2, ya resuelta para el partido.
