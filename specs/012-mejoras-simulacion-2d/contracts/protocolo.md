# Contrato cliente-servidor (spec 012)

Cambios sobre `packages/protocol` (WebSocket `ws/partido.ts` y HTTP). Todo lo nuevo se valida con zod en el servidor.

## WebSocket

### `partido.inicio` (servidor → cliente) — amplía

```ts
celebraciones: Record<'local' | 'visitante', { id: string; datos: DatosCelebracion }>;
modoIncidencias?: 'automatico' | 'control_total';   // solo si gestionDisponible: el del espectador
```

NPC → `celebracion-clasica`.

### `partido.pausa_decision` (servidor → cliente) — amplía

```ts
motivo: 'descanso' | 'pre_prorroga' | 'incidencia';
// solo con motivo 'incidencia':
incidencias?: { jugadorId: number; motivo: 'lesion' | 'expulsion'; minuto: string; tick: number }[];
sustitucionesRestantes?: number;
```

La ventana es la de siempre (`venceEn`). «Seguir» (`partido.seguir`) o el vencimiento reanudan; lo no resuelto se
aplica en automático (FR-023).

### `partido.modo_incidencias` (cliente → servidor) — nuevo

```ts
{ t: 'partido.modo_incidencias', requestId: string, partidoId: string, modo: 'automatico' | 'control_total' }
```

- Solo si el partido está en curso, `gestionDisponible` y el emisor juega ese partido; si no, `SIN_GESTION`.
- Actualiza `EquipoEstado.controlTotal` del motor en memoria, `participantes.modo_incidencias` y
  `perfiles_usuario.modo_incidencias`. Respuesta `partido.modo_incidencias_ok { modo }`. Idempotente por `requestId`.

## HTTP

### `GET/PUT /api/perfil/aspecto` — amplía (011)

Añade `celebracion: string | null` (debe ser un cosmético `celebracion` activo o gratuito) y
`modoIncidencias`. Error `COSMETICO_NO_DISPONIBLE` como con el escudo.

### `GET /api/cosmeticos` — amplía

Devuelve también las celebraciones activas con `datos`. La tienda las pinta en «Próximamente» sin precio.

### `GET /api/partidas/:id/equipo` — amplía la vista de equipo

`bajasPendientes`, `sinSuplentes`, `avisosEquipo` ([data-model §5](../data-model.md#5-alineación-confirmada-y-bajas-pendientes)).

### `POST /api/partidos/:id/abrir` y avance de jornada — nuevo error

`409 BAJA_PENDIENTE` `{ jugadores: [{ jugadorId, motivo }] }` si la alineación confirmada tiene bajas pendientes y
queda algún suplente. Con `sinSuplentes` no hay error.

### `GET /api/partidas/:id/plantillas` — amplía

Cada plantilla: `nombreEquipo`, `escudo`, `color`.

### `GET /api/avisos` — amplía

`tipo` admite `baja_sustituida`.
