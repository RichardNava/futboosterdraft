# Contrato — HTTP

Cambios sobre [005/contracts/http-api.md](../../005-virtudes-defectos/contracts/http-api.md). Los errores siguen el
formato común `{ error: { codigo, mensaje, detalles } }` (`apps/server/src/http/errores.ts`).

**Acceso**: todos los endpoints nuevos exigen un usuario **registrado**, con el `preHandler` nuevo `requiereRegistrado`:

- sin sesión: `401 SIN_SESION`;
- invitado: `403 SOLO_REGISTRADOS`.

Cada endpoint llama primero a `asegurarColeccion` (data-model §4.2).

## Tipos

```ts
CartaResumen = JugadorResumen & {          // JugadorResumen del protocolo, ampliado (ver más abajo)
  nombreCarta: string; nacionalidad: string; imagen: string; imagenBg: string;
}
CartaPoseida = CartaResumen & {
  activa: boolean; via: 'registro' | 'coleccion' | 'sobre'; obtenidaEn: string;
  colecciones: string[];                    // id de colección
  esCore: boolean;                          // no desfragmentable (FR-021)
  valorFragmentos: number | null;           // null si esCore
  historia: string;
}
EstadoMinimo = { cumple: boolean; incumplidas: { demarcacion, nivel, minimo, activas }[] }
ResumenCompra = { idCompra: string; cartas: CartaResumen[]; fragmentos: number;
                  duplicados: { id: number; nivel: Nivel; fragmentos: number }[]; saldo: number }
```

**Cambio en el protocolo**: `JugadorResumen` (`packages/protocol/src/ws/draft.ts`) añade los campos `nombreCarta`,
`nacionalidad`, `imagen` e `imagenBg`. `Catalogo.resumen` los rellena, y así llegan a todas las vistas que ya usan la
carta (draft, plantillas, alineación).

## Colección

| Método y ruta | Respuesta |
|---|---|
| `GET /api/coleccion` | `200 { cartas: CartaPoseida[], colecciones: { id, nombre, tipo }[], minimo: EstadoMinimo, saldo: number }` |
| `PUT /api/coleccion/cartas/:id` cuerpo `{ activa: boolean }` | `200 { carta: CartaPoseida, minimo: EstadoMinimo }` |
| `POST /api/coleccion/cartas/:id/desfragmentar` | `200 { fragmentos: number, saldo: number, minimo: EstadoMinimo }` |
| `GET /api/fragmentos/movimientos?antes=<iso>&limite=50` | `200 { saldo, movimientos: { id, importe, motivo, referencia, descripcion, creadoEn }[] }`, del más reciente al más antiguo (FR-018) |

**Errores**:

| Código | Cuándo |
|---|---|
| `404 CARTA_NO_POSEIDA` | el usuario no tiene la carta (incluye un reintento de desfragmentar ya aplicado) |
| `422 MINIMO_ACTIVO` | la operación dejaría la colección activa bajo el mínimo; `detalles: { demarcacion, nivel, minimo, activas }` (FR-013) |
| `422 CARTA_CORE` | se intenta desfragmentar una carta de Core (FR-021) |

`PUT` con el mismo valor que ya tiene la carta es idempotente: devuelve `200` sin cambios.

## Tienda

| Método y ruta | Respuesta |
|---|---|
| `GET /api/tienda` | `200 { saldo, colecciones: ProductoColeccion[], sobre: ProductoSobre, paquetes: ProductoFragmentos[] }` |
| `POST /api/tienda/colecciones/:id/comprar` cuerpo `{ idCompra: uuid }` | `200 ResumenCompra` |
| `POST /api/tienda/sobre/comprar` cuerpo `{ idCompra: uuid, moneda: 'eur' \| 'fragmentos' }` | `200 ResumenCompra` |
| `POST /api/tienda/fragmentos/:paquete/comprar` cuerpo `{ idCompra: uuid }` | `200 ResumenCompra` (`cartas: []`) |

```ts
ProductoColeccion = { id, nombre, descripcion, precioCentimos, numCartas,
                      porNivel: Record<Nivel, number>, muestra: CartaResumen[],
                      poseidas: number, adquirida: boolean,
                      soloFragmentos: number | null }   // fragmentos si ya se tienen todas (US5, escenario 4)
ProductoSobre = { precioFragmentos: 1000, precioCentimos: number, disponible: boolean,
                  motivoNoDisponible?: string, faltan?: number /* fragmentos para el saldo actual */ }
ProductoFragmentos = { id, fragmentos, precioCentimos }
```

**Idempotencia (FR-032, SC-007)**: si se repite la petición con el mismo `idCompra`, se devuelve la misma
`ResumenCompra` con `200`. El cliente genera el `idCompra` al abrir el diálogo de pago y lo conserva en los reintentos.
Si un `idCompra` ya usado llega con otro producto o con otra moneda, la respuesta es `409 ID_COMPRA_REUTILIZADO`.

**Errores**:

| Código | Cuándo |
|---|---|
| `400 CUERPO_INVALIDO` | falta el `idCompra` o no es un UUID; moneda desconocida |
| `404 PRODUCTO_NO_ENCONTRADO` | colección o paquete inexistente, o la colección es Core |
| `409 COLECCION_ADQUIRIDA` | la colección ya está comprada, con otro `idCompra` (FR-027) |
| `409 SOBRE_NO_DISPONIBLE` | quedan menos de 8 cartas por conseguir (FR-029); `detalles: { restantes }` |
| `422 SALDO_INSUFICIENTE` | `detalles: { saldo, precio, faltan }` (US4, escenario 2) |

Todas las compras con `moneda: 'eur'` son simuladas (`compras.simulada = true`, FR-031).

## Partidas

### `POST /api/partidas`

Sin cambios en el cuerpo.

- Si el anfitrión es un usuario registrado, el servidor guarda `pool_cartas` con sus cartas activas (FR-014). Si su
  colección activa no cumple el mínimo (no debería ocurrir), la respuesta es `422 MINIMO_ACTIVO`.
- Si el anfitrión es un invitado, `pool_cartas` queda `null` y se juega con Core (FR-015).

### Vista del torneo

`GET /api/partidas/:id/torneo` y el mensaje WS de estado del torneo añaden `recompensaFragmentos: number | null` para el
participante que hace la consulta: `10` si es el campeón registrado, y `null` en el resto de casos (R14).

## Catálogo

`GET /api/catalogo/jugadores` y `GET /api/catalogo/jugadores/:id`:

- cada carta pierde `coleccion` y gana `nombreCarta`, `imagen`, `imagenBg` y `colecciones: string[]`;
- `nacionalidad` usa los códigos nuevos.
