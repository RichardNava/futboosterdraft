# Contrato: HTTP y CLI

Tipos en `packages/protocol/src/http/`. Errores con el formato común `{ error: { codigo, mensaje, detalles } }`.

## Crear partida — `POST /api/partidas` (cambia)

Cuerpo (`CrearPartida`, zod): campo nuevo opcional `nivelRareza` (por defecto `moderado`).
Cabecera `Idempotency-Key`: **una por envío del formulario**; el servidor la guarda como `clave_creacion`.

| Caso | Respuesta |
|---|---|
| Correcto | `201` con el resumen, que incluye `nivelRareza` y `cobroRareza` (`number \| null`) |
| Misma clave repetida (también concurrente) | `201` con la misma partida; no se cobra otra vez |
| Nivel desconocido | `400 NIVEL_RAREZA_INVALIDO` |
| Invitado, ajuste `restringido`, nivel ≠ moderado | `403 NIVEL_RAREZA_NO_DISPONIBLE` |
| Saldo insuficiente | `422 SALDO_INSUFICIENTE`, `detalles: { saldo, precio, faltan }`; no se crea la partida |
| Pool que no completa los sobres | `422 POOL_INSUFICIENTE`; no se crea ni se cobra |

## Niveles disponibles — `GET /api/partidas/niveles-rareza` (nuevo, `requiereSesion`)

```json
{
  "acceso": "libre",
  "premium": { "activo": false, "cortesia": false, "fin": null },
  "saldo": 340,
  "niveles": [
    { "nivel": "pobre", "estado": "pago", "coste": 100 },
    { "nivel": "moderado", "estado": "gratis", "coste": 0 },
    { "nivel": "rico", "estado": "no_disponible", "motivo": "INVITADO" }
  ]
}
```

`estado`: `gratis` | `pago` | `no_disponible`. La pantalla de crear partida pinta junto a cada nivel «Gratis»,
«100 fragmentos» o el motivo (FR-034). `saldo` es `null` para invitados.

## Sala y resumen

`PartidaResumen` y la vista de sala ganan `nivelRareza` (FR-016, US3-4).

## Mis partidas — `GET /api/mis-partidas?antes=<cursor>&limite=5` (cambia)

```json
{ "enCurso": [ … ], "terminadas": [ … ], "siguiente": "2026-11-09T18:22:01.000Z|<uuid>" }
```

- Sin `antes`: `enCurso` completo y las 5 terminadas más recientes.
- Con `antes`: `enCurso: []` y las 5 siguientes.
- `siguiente: null` cuando no hay más. `limite` entre 1 y 20 (por defecto 5).
- Orden `(actualizada_en desc, id desc)`; el cursor es la clave de la última fila devuelta.

## Pase premium

| Ruta | Descripción |
|---|---|
| `GET /api/premium` (`requiereRegistrado`) | `{ activo, cortesia, fin }` |
| `POST /api/tienda/pase-premium` (`requiereRegistrado`) | cuerpo `{ moneda: 'fragmentos' \| 'eur', idCompra }`; idempotente por `idCompra` como el resto de compras; responde `{ idCompra, saldo, premium: { activo, cortesia, fin } }`. `422 SALDO_INSUFICIENTE` si no alcanza |
| `GET /api/tienda` | gana `pasePremium: { precioFragmentos, precioCentimos, dias, estado: { activo, cortesia, fin } \| null }` |

## Movimientos de fragmentos

`MotivoMovimiento` gana `nivel_rareza`, `devolucion_nivel_rareza` y `compra_pase_premium`, con sus textos en el historial.

## CLI

```bash
pnpm --filter @fbd/server ajuste acceso_niveles_rareza <libre|restringido>   # ≤ 30 s, solo partidas nuevas
pnpm --filter @fbd/server ajuste identidad_cartas <real|alternativa>        # sin cambios
pnpm --filter @fbd/server premium <email> <si|no>                            # premium de cortesía
pnpm --filter @fbd/fixtures fondos-core -- --origen ../../jugadores_bg       # ilustraciones de Core
```
