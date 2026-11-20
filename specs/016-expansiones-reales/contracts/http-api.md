# Contrato HTTP: Expansiones reales

**Fecha**: 2026-11-18 · Amplía [011/contracts/http-api.md](../../011-rework-tienda/contracts/http-api.md) y
[006/contracts/http-api.md](../../006-preparacion-bd-cartas/contracts/http-api.md). No hay rutas nuevas. Los errores
siguen el formato `{ codigo, mensaje, detalles? }`.

## `GET /api/tienda` (registrados)

`ProductoColeccion` (una por expansión, en el orden de `colecciones.json`) cambia así:

```ts
interface CartaExpansion {
  carta: CartaResumen;          // con la identidad de la cuenta (plan B, spec 011)
  numero: number;               // 1..N dentro de la expansión
  poseida: boolean;
  /** Fragmentos que daría al comprar la expansión si `poseida` (valorDesfragmentar del nivel); 0 si no. */
  compensacion: number;
}

interface ProductoColeccion {
  id: string;
  nombre: string;
  descripcion: string;
  precioCentimos: number | null;     // CAMBIA: null en las expansiones (FR-020)
  precioFragmentos: number;
  numCartas: number;
  porNivel: Record<Nivel, number>;
  muestra: CartaResumen[];
  poseidas: number;
  adquirida: boolean;
  soloFragmentos: number | null;
  // NUEVO (spec 016)
  cartas: CartaExpansion[];          // ordenadas por `numero`
  compensacion: number;              // Σ cartas[].compensacion
  sobreRegalo: { id: string; nombre: string; poseido: boolean } | null;
  icono: string;                     // '/expansiones/<id>/icono-256.webp'
  iconoGrande: string;               // '/expansiones/<id>/icono-512.webp'
  cartel: string;                    // '/expansiones/<id>/cartel.webp'
}
```

`ProductoSobre.motivoNoDisponible` cambia el texto a «Ya tienes casi todas las cartas de las expansiones: quedan menos
de 8 por conseguir». El pool del sobre de la tienda sigue siendo la unión de las colecciones de pago (FR-024).

## `POST /api/tienda/colecciones/:id/comprar` (registrados)

Cuerpo: `{ idCompra: uuid }`, como hasta ahora.

Respuesta `ResumenCompra`:

```ts
interface ResumenCompra {
  idCompra: string;
  cartas: CartaResumen[];                                                  // las que no tenía
  fragmentos: number;                                                      // compensación total
  duplicados: { id: number; nivel: Nivel; nombreCarta: string; fragmentos: number }[];
  saldo: number;                                                           // saldo final
  cosmeticos: string[];                                                    // NUEVO: [sobre_regalo] (vacío si no tiene)
}
```

Invariante (SC-004): `saldo = saldoInicial − precioFragmentos + fragmentos`.

| Caso | Respuesta |
|------|-----------|
| Compra correcta | 200 `ResumenCompra` |
| Mismo `idCompra` otra vez | 200 con el mismo `ResumenCompra`; no se cobra dos veces (FR-022, US2-7) |
| Ya adquirida con otro `idCompra` | 409 `COLECCION_ADQUIRIDA` |
| Saldo insuficiente | 422 `SALDO_INSUFICIENTE`, `detalles: { saldo, precio, faltan }` (US2-5) |
| Id inexistente (incluidas `all-stars` y `top-argentinos`) | 404 `PRODUCTO_NO_ENCONTRADO` |
| Invitado | 403, como hasta ahora |

El sobre de regalo ya poseído no es un error: se conserva y `cosmeticos` lo sigue incluyendo (US3-4).

## `POST /api/coleccion/cartas/:id/desfragmentar` (registrados)

Sin cambios de forma. El importe pasa a 25 / 75 / 125 / 175 (FR-018). Verratti (299) ya no es del Core, así que se
puede desfragmentar. Kimmich (376) sí es del Core y no se puede: 422 `CARTA_CORE`.

## `GET /api/cosmeticos` (público)

```ts
interface Cosmetico {
  // …campos de la 011
  /** NUEVO: false en los sobres de regalo de una expansión. */
  vendible: boolean;
  /** NUEVO: id de la expansión que lo regala, si `vendible` es false. */
  regaloDe: string | null;
}
```

Los packs nunca contienen cosméticos no vendibles.

## `POST /api/tienda/cosmeticos/:id/comprar` (registrados)

Error nuevo: 422 `COSMETICO_NO_VENDIBLE`, «Este sobre solo se consigue con su expansión». Si ya se posee, el 409
`COSMETICO_POSEIDO` de siempre tiene prioridad.

`POST /api/tienda/packs/:id/comprar` no cambia: los packs solo contienen cosméticos vendibles (validación del seed).

## Historial de fragmentos

`GET /api/fragmentos/movimientos` no cambia. Los movimientos de las cartas de prueba desaparecen con la retirada
(data-model §3).
