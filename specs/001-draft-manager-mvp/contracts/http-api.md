# Contrato HTTP/JSON — Fútboosterdraft MVP

Operaciones que no son de tiempo real. La autenticación usa una cookie de sesión `HttpOnly`, tanto
para usuarios registrados como para invitados (research R12). Todas las respuestas son JSON y los
errores siguen el formato:

```json
{ "error": { "codigo": "TACTICA_INCOMPATIBLE", "mensaje": "Línea adelantada no es compatible con Catenaccio", "detalles": {} } }
```

Códigos HTTP: `400` validación · `401` sin sesión · `403` no permitido (p. ej. invitado) · `404` no existe · `409` conflicto de estado · `422` regla de dominio incumplida.

Las cabeceras `Idempotency-Key` en los `POST` que cambian estado permiten repetir la petición sin efectos duplicados (FR-062).

---

## Sesión y cuentas

| Método y ruta | Descripción | Notas |
|---------------|-------------|-------|
| `POST /api/auth/invitado` | Crea una sesión anónima | Devuelve `{ usuario: { id, tipo: "invitado", apodo } }`. |
| `POST /api/auth/registro` | `{ email, password, apodo }` | Si había una sesión de invitado, la convierte en cuenta registrada. |
| `POST /api/auth/login` · `POST /api/auth/logout` | — | Rutas de la librería de autenticación (R12). |
| `GET /api/me` | Usuario actual | `{ id, tipo, apodo, email? }`. |

## Catálogo

| Método y ruta | Descripción |
|---------------|-------------|
| `GET /api/catalogo/jugadores/:id` | Ficha completa de un jugador (FR-013). |
| `GET /api/catalogo/formaciones` | Las 10 formaciones con sus casillas, posiciones admitidas y zonas. |
| `GET /api/catalogo/virtudes` | Nombre, ámbito y descripción de cada virtud. |

## Partidas

| Método y ruta | Descripción | Reglas |
|---------------|-------------|--------|
| `POST /api/partidas` | Crea una partida | Cuerpo en el ejemplo de abajo. Si el usuario es invitado, solo con `ritmo: "directo"` y sin plazas humanas libres (`403 INVITADO_NO_PERMITIDO`, FR-000). |
| `GET /api/partidas?estado=buscando` | Lista de partidas abiertas | Solo para registrados. |
| `POST /api/partidas/:id/unirse` | Ocupar una plaza | `409 PARTIDA_COMPLETA` o `409 PARTIDA_INICIADA`. |
| `POST /api/partidas/:id/npc` | `{ nivel }`: el anfitrión añade un NPC | `PRO` solo por esta vía (FR-059). |
| `POST /api/partidas/:id/iniciar` | El anfitrión rellena las plazas con NPC y empieza el draft | FR-003. |
| `POST /api/partidas/:id/abandonar` | Un humano deja el torneo | Su plaza pasa a un NPC intermedio. |
| `GET /api/partidas/:id` | Estado general | Participantes, configuración, estado. |

Ejemplo de cuerpo de `POST /api/partidas`:

```json
{
  "modo": "liga",
  "numParticipantes": 6,
  "tipoSimulacion": "rapida",
  "ritmo": "asincrono",
  "plazoJornadaHoras": 24,
  "npc": [{ "nivel": "PRO" }],
  "tiempos": { "turnoDraftS": 45 }
}
```

Validación: liga 4–8; playoff ∈ {4, 8, 16}; mixto = 8 (`422 NUM_PARTICIPANTES_INVALIDO`).

## Plantilla y alineación

| Método y ruta | Descripción | Reglas |
|---------------|-------------|--------|
| `GET /api/partidas/:id/plantillas` | Las 24 cartas de **todos** los participantes, con sus bajas activas, dorsales y equipaciones | Solo después del draft (`409 DRAFT_EN_CURSO`), FR-054a. |
| `GET /api/partidas/:id/alineacion` | Alineación vigente del usuario, con los stats efectivos por casilla y los lanzadores propuestos | FR-028, FR-029a. |
| `POST /api/partidas/:id/alineacion/previsualizar` | Calcula los stats efectivos sin guardar | Para la interfaz de arrastrar y soltar. |
| `PUT /api/partidas/:id/alineacion` | Confirma la alineación (cuerpo en el ejemplo de abajo) | `422 ALINEACION_INVALIDA` (con la lista de motivos), `422 TACTICA_INCOMPATIBLE`, `422 JUGADOR_NO_DISPONIBLE`. |

Ejemplo de cuerpo de `PUT /api/partidas/:id/alineacion`:

```json
{
  "formacion": "4-3-3",
  "titulares": [{ "casillaId": "POR", "jugadorId": 12 }],
  "suplentes": [33, 41],
  "tactica": { "sistemaDefensivo": "zona", "alturaBloque": "presion_alta", "lineaAdelantada": true, "estiloConBalon": "equilibrado", "juegoVertical": true },
  "lanzadores": { "penaltis": 7, "faltas": 10, "corners": 10, "tanda": [7, 10, 9, 8, 4] }
}
```

En el ejemplo, `titulares` está abreviado: en una petición real lleva 11 elementos.

| Método y ruta | Descripción | Reglas |
|---------------|-------------|--------|
| `PUT /api/partidas/:id/dorsales` | `{ dorsales: { [jugadorId]: n } }`: edita uno o varios dorsales (FR-031a) | `422 DORSAL_REPETIDO` y `422 DORSAL_FUERA_DE_RANGO` (1–99). `409 PARTIDO_EN_CURSO` durante un partido propio. |
| `PUT /api/partidas/:id/equipaciones` | `{ primera: { principal, secundario }, segunda: { principal, secundario } }` en colores hex (FR-031b) | `422 COLOR_INVALIDO`; `422 EQUIPACIONES_IGUALES` si las dos tienen el mismo color principal. |

La alineación del **rival** no se expone por ninguna ruta hasta que empieza el partido (FR-054a).

## Torneo

| Método y ruta | Descripción |
|---------------|-------------|
| `GET /api/partidas/:id/torneo` | Calendario, jornadas con su estado y plazos, clasificación o cuadro, y campeón (FR-054). |
| `GET /api/partidos/:id` | Resumen de un partido: marcador, eventos relevantes, estadísticas y alineaciones (solo si ya empezó). |
| `POST /api/partidos/:id/listo` | Ritmo asíncrono: el participante está listo para jugar ya (FR-056). |

## Avisos

| Método y ruta | Descripción |
|---------------|-------------|
| `GET /api/avisos?noLeidos=true` | Bandeja de avisos (FR-056b). |
| `POST /api/avisos/:id/leido` | Marca un aviso como leído. |

## Operación

| Método y ruta | Descripción |
|---------------|-------------|
| `GET /healthz` | Estado del proceso y de la base de datos. |
| `GET /metrics` | Métricas de Prometheus (red interna). |
