# Contrato HTTP y WS: Rework de la tienda

**Fecha**: 2026-11-05 · Amplía [006/contracts/http-api.md](../../006-preparacion-bd-cartas/contracts/http-api.md).
Los errores siguen el formato actual de `apps/server/src/http/errores.ts` (`{ codigo, mensaje, detalles? }`).

## Cosméticos

### `GET /api/cosmeticos` (público)

Catálogo para la tienda y los selectores. Si la petición tiene la sesión de un usuario registrado, se añade la
posesión.

```ts
interface Cosmetico {
  id: string;
  tipo: 'escudo' | 'sobre';
  nombre: string;
  gratuito: boolean;
  precioCentimos: number | null;
  precioFragmentos: number | null;
  /** Solo con sesión registrada; los gratuitos siempre `true`. */
  poseido?: boolean;
}
interface PackCosmeticos {
  id: string;
  tipo: 'escudo' | 'sobre';
  nombre: string;
  cosmeticos: string[];
  precioCentimos: number;
  /** Solo con sesión registrada: false si ya tiene alguno (research R10). */
  disponible?: boolean;
}
interface RespuestaCosmeticos { cosmeticos: Cosmetico[]; packs: PackCosmeticos[]; saldo?: number }
```

Solo incluye cosméticos activos, más los retirados que el usuario posee.

### `POST /api/tienda/cosmeticos/:id/comprar` (registrados)

Cuerpo: `{ idCompra: uuid, moneda: 'eur' | 'fragmentos' }`.

Respuesta 200: `{ idCompra, cosmeticos: string[], saldo }`. Repetir la petición con el mismo `idCompra` devuelve la
misma respuesta sin cobrar de nuevo.

| Error | Cuándo |
|---|---|
| 404 `PRODUCTO_NO_ENCONTRADO` | el id no existe o está retirado |
| 422 `COSMETICO_GRATUITO` | el cosmético es gratuito |
| 409 `COSMETICO_POSEIDO` | ya lo tiene |
| 422 `SALDO_INSUFICIENTE` | moneda `fragmentos` sin saldo suficiente (detalles `{ saldo, precio, faltan }`) |
| 409 `ID_COMPRA_REUTILIZADO` | el `idCompra` se usó para otro producto |
| 403 `SOLO_REGISTRADOS` | invitado |

### `POST /api/tienda/packs/:id/comprar` (registrados)

Cuerpo: `{ idCompra: uuid }`. Solo con euros (pago simulado).

Respuesta y errores como la compra suelta, más 409 `PACK_CON_POSEIDOS` (detalles `{ poseidos: string[] }`).

## Cambios en la tienda de la 006 (FR-002)

- `GET /api/tienda`: `paquetes` siempre `[]`. `ProductoColeccion` añade `precioFragmentos`. `ProductoSobre` mantiene
  `precioCentimos` (se puede ignorar), pero `precioCentimos` de las colecciones ya no se ofrece en la interfaz.
- `POST /api/tienda/sobre/comprar`: `moneda` solo admite `'fragmentos'`; `'eur'` da 422 `MONEDA_NO_ADMITIDA`.
- `POST /api/tienda/colecciones/:id/comprar`: se cobra en fragmentos (`precioFragmentos`), con 422
  `SALDO_INSUFICIENTE` si no llega. El cuerpo no cambia.
- `POST /api/tienda/fragmentos/:paquete/comprar`: 410 `PRODUCTO_RETIRADO`.

## Aspecto (perfil)

### `GET /api/perfil/aspecto` (sesión)

```ts
interface Aspecto {
  /** Elegido o asignado; null solo para invitados. */
  escudo: string | null;
  /** true si `escudo` es el asignado por defecto (la cuenta no ha elegido). */
  escudoAsignado: boolean;
  sobreFavorito: string;          // 'sobre-original' por defecto
  sobreCarrusel: boolean;
  sobresMarcados: string[];
  /** Diseño para los sobres decorativos (no avanza la baraja). */
  sobreActual: string;
}
```

Para un invitado: `{ escudo: null, escudoAsignado: false, sobreFavorito: 'sobre-original', sobreCarrusel: false,
sobresMarcados: [], sobreActual: 'sobre-original' }`.

### `PUT /api/perfil/aspecto` (registrados)

Cuerpo (todos los campos opcionales; solo cambia lo que se envía):
`{ escudo?: string | null, sobreFavorito?: string, sobreCarrusel?: boolean, sobresMarcados?: string[] }`.

- Cada id DEBE estar disponible para la cuenta y ser del tipo correcto; si no, 422 `COSMETICO_NO_DISPONIBLE` (FR-009).
- `escudo: null` vuelve al asignado.
- Cambiar `sobreCarrusel` o `sobresMarcados` vacía la baraja.

Respuesta: `Aspecto`.

### `POST /api/perfil/aspecto/sobre-siguiente` (sesión)

Sin cuerpo. Avanza la baraja (research R9) y devuelve `{ diseno: string }`. Para un invitado devuelve
`{ diseno: 'sobre-original' }` sin guardar nada. El cliente lo llama una vez por cada apertura de sobre: al empezar
cada ronda del draft y en cada compra de sobre en la tienda.

## Escudo por partida

### `PUT /api/partidas/:id/escudo` (sesión, participante)

Cuerpo: `{ escudo: string | null }`. `null` vuelve al del perfil o al asignado (en un invitado, al círculo).

Valida la disponibilidad como `PUT /api/perfil/aspecto`: los invitados solo pueden elegir escudos gratuitos. Responde
409 `TORNEO_INICIADO` si el torneo ya empezó, igual que `nombre-equipo`. Respuesta: `{ escudo: string | null }`.

`GET /api/partidas/:id/alineacion` añade `escudo: string | null` a su respuesta.

## WS: `partido.inicio`

`MsgPartidoInicio` (`packages/protocol/src/ws/partido.ts`) añade el campo opcional
`escudos: { local: string | null, visitante: string | null }`, ya resuelto con `escudosEnPartido` (null en los dos
lados si coinciden, FR-008). Un cliente o una reproducción sin `escudos` pinta los círculos como hasta ahora.

## Catálogo de cartas e identidad

- `/api/catalogo/jugadores` y `/api/catalogo/jugadores/:id` devuelven la identidad del ajuste vigente (research R12).
- `GET /api/coleccion`, `GET /api/tienda` y `GET /api/fragmentos/movimientos` también.
- Todo lo que sale de una partida (draft, alineación, partido, torneo y avisos) usa `partidas.identidad`.
- Ninguna respuesta incluye las dos identidades a la vez.

## Guion del ajuste

`pnpm --filter @fbd/server ajuste identidad_cartas <real|alternativa>`: escribe la fila de `ajustes` y muestra el valor
anterior y el nuevo. Los servidores lo aplican en ≤ 30 s (caché) sin reiniciar.
