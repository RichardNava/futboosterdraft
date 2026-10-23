# Contrato — HTTP

Cambios sobre [003/contracts/http-api.md](../../003-mejoras-ux-simulacion/contracts/http-api.md). Los errores siguen el
formato común `{ error: { codigo, mensaje } }`.

## Catálogo

| Método y ruta | Cambio |
|---|---|
| `GET /api/catalogo/specials` | **se elimina** |
| `GET /api/catalogo/rasgos` | **nueva**. `200 { virtudes: TextoRasgo[], defectos: TextoRasgo[] }`, con `TextoRasgo = { id, nombre, descripcion, ambito, impacto }`. Sale de `RASGOS` (research R8) |
| `GET /api/catalogo/jugadores`, `GET /api/catalogo/jugadores/:id` | cada carta trae `virtudes` (antes `specials`) y `defectos`. Admiten `?version=1` para las vistas de partidas antiguas (research R4). Sin el parámetro, devuelven la versión actual |
| `GET /api/partidas/:id/plantillas` | las cartas se sirven en la `version_catalogo` de la partida |

## Partidas

### `POST /api/partidas`

- `modo` admite `'duelos'`, con `numParticipantes ∈ {4, 8, 16}`. Si no, `400 NUM_PARTICIPANTES_INVALIDO`.
- Con `modo = 'duelos'` se puede enviar `duelos?: { formacion, estadoForma }`; si no se envía, se usa `{ '4-3-3', true }`.
  Si la formación no existe, `400 CONFIG_INVALIDA`.
- La partida se crea con `version_catalogo = 2`.

### `PUT /api/partidas/:id/duelos` (nueva)

Cuerpo `{ formacion: FormacionId, estadoForma: boolean }`.

| Respuesta | Cuándo |
|---|---|
| `200 { duelos }` | cambio aplicado; se difunde `sala.actualizada` |
| `403 SOLO_ANFITRION` | lo envía alguien que no es el anfitrión |
| `409 MODO_NO_DUELOS` | la partida no es de duelos |
| `409 CONFIG_FIJADA` | la partida ya no está en `buscando` |
| `400 CONFIG_INVALIDA` | formación desconocida o cuerpo inválido |

Es idempotente: el mismo cuerpo dos veces devuelve el mismo resultado.

### `GET /api/partidas/:id`

Añade `modo: 'duelos'` (si aplica), `duelos: ConfigDuelos | null` y `versionCatalogo`.

## Alineación (modo `duelos`)

### `GET /api/partidas/:id/alineacion`

Añade:

- `bloqueada: boolean`;
- `soloTitulares: true`;
- `formacionFija: FormacionId`.

### `PUT /api/partidas/:id/alineacion`

- Solo se tienen en cuenta `titulares` (casilla → jugador). `formacion` debe ser la común; si no, `400 FORMACION_FIJA`.
- `suplentes`, `tactica`, `lanzadores` y `colocacion` se ignoran.
- La primera confirmación válida guarda `bloqueada = true`. Las siguientes reciben `409 ALINEACION_BLOQUEADA`.
- No se exigen dorsales.

### `PUT /api/partidas/:id/dorsales` y `PUT /api/partidas/:id/equipaciones`

En el modo `duelos` responden `409 NO_DISPONIBLE_EN_MODO`.

## Partidos y cruces

### `GET /api/partidos/:id`

Añade `tipo: 'futbol' | 'duelos'`. Con `tipo = 'duelos'` y el visionado ya hecho (o un cruce solo de NPC), incluye
`duelos: ResultadoCruce` (ver [duelos-api.md](./duelos-api.md)) y las cartas de los 22 jugadores. Mientras el visionado
esté pendiente para quien pregunta, `duelos` es `null` y `marcador` se oculta, como en los partidos entre humanos.

### `POST /api/partidos/:id/abrir`

- Con `tipo = 'duelos'` responde `200 { modo: 'duelos' }` y entrega el `ResultadoCruce` completo para la animación. El
  visionado se marca al recibir `POST /api/partidos/:id/visto` (nueva, idempotente), que el cliente envía al terminar o
  saltar la animación.
- El cuerpo `modalidad` se ignora en los cruces de duelos.

### `GET /api/partidos/:id/reproduccion`

Con `tipo = 'duelos'` responde `409 NO_APLICA`, porque la animación se sirve con `abrir`.
