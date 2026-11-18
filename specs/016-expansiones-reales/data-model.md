# Data Model: Expansiones reales

**Spec**: [spec.md](spec.md) · **Research**: [research.md](research.md)

Los nombres de código siguen siendo `coleccion` (research R1). «Expansión» es el nombre visible.

## 1. Ficheros de datos (`data/`)

### 1.1 `expansiones-reales.json` (NUEVO)

Mismo formato y reglas que `core-real.json` (contrato de la 008): `{ "version": "1.0.0", "jugadores": Jugador[] }`.

- **95 fichas**: las 96 cartas de las cuatro expansiones menos Kimmich, que va al Core. Verratti (299) se traslada aquí
  sin cambiar nada de su ficha.
- `id` según research R2 (301–396, sin el 376).
- `imagen`: `/cartas/retratos-propios/<slug>.webp`; `imagen_bg`: `/cartas/fondos/jugadores/<id>.webp`.
- `nivel` según el número dentro de la expansión: 1–6 GOAT, 7–12 Legendario, 13–18 Crack, 19–24 Superclase (FR-004).
  Es un dato de cada ficha y no una regla del código (FR-032).

### 1.2 `core-real.json` (cambia)

Sale la ficha 299 (Verratti) y entra la 376 (Joshua Kimmich, GOAT, `MED`). Siguen siendo 300 fichas, con el mismo
recuento por demarcación y nivel (FR-007).

### 1.3 `colecciones.json` (cambia)

```jsonc
{
  "id": "estrellas-fulgurantes",
  "nombre": "Estrellas Fulgurantes",
  "descripcion": "24 jugadores: 6 GOAT, 6 Legendario, 6 Crack y 6 Superclase. Regala el sobre 28.",
  "tipo": "pago",
  "precio_fragmentos": 2400,          // sin precio_centimos (FR-020)
  "sobre_regalo": "sobre-28",          // NUEVO
  "destacadas": [373, 374, 375],
  "cartas": [ { "id": 373, "numero": 1 }, { "id": 374, "numero": 2 }, { "id": 375, "numero": 3 },
              { "id": 299, "numero": 4 }, /* … */ { "id": 396, "numero": 24 } ]
}
```

- `core`: `cartas` = 1–298, 300 y 376 (enteros sin número).
- Se quitan `all-stars` y `top-argentinos`.
- Orden de la tienda: A, B, C, D.

**Validación** (`validarCatalogo`, dominio):

- Una colección de pago necesita `precio_fragmentos > 0` (ya existía); `precio_centimos` pasa a ser opcional.
- `numero`: entero ≥ 1, sin repetir dentro de la colección. Si una carta lo lleva, todas las de la colección deben
  llevarlo, y los números van de 1 a N sin huecos.
- `sobre_regalo`: opcional. Si existe, la comprobación cruzada con los cosméticos se hace en el seed (§1.4).
- No se valida que haya 24 cartas ni 6 por nivel (FR-032). Eso lo comprueban el guion `expansiones` y las pruebas sobre
  los datos (SC-001).

### 1.4 `cosmeticos.json` (cambia)

- Campo nuevo `vendible` (opcional, `true` por defecto). `sobre-1`, `sobre-4`, `sobre-7` y `sobre-28` llevan
  `"vendible": false`.
- Sobres nuevos `sobre-25` … `sobre-33`, de pago: 250 fragmentos o 50 céntimos.
- Packs: `pack-sobres-2` y `pack-sobres-3` con su nueva composición, y `pack-sobres-7` nuevo (research R14).

**Validación** (`validarCosmeticos`, seed): a las reglas que ya había se suman dos:

- un pack solo contiene cosméticos vendibles;
- cada `sobre_regalo` de `colecciones.json` es un cosmético de tipo `sobre`, activo, de pago y no vendible, y no es el
  regalo de más de una colección.

### 1.5 `cartas-prueba.json` (SE BORRA)

Con él se borran `tools/fixtures/src/generarColeccionesPrueba.ts` y su script `generar-colecciones-prueba`.

## 2. Base de datos (migración `0017_spec016.sql`)

| Tabla | Cambio | Uso |
|-------|--------|-----|
| `colecciones` | `+ sobre_regalo text null references cosmeticos(id)` | Regalo de la expansión (FR-025). |
| `colecciones` | `− check colecciones_precio_ck` | Las expansiones no tienen precio en euros (FR-020). |
| `colecciones_cartas` | `+ numero integer null` + `check (numero is null or numero >= 1)` | Número dentro de la expansión (FR-005). |
| `cosmeticos` | `+ vendible boolean not null default true` | Sobres de regalo (FR-026). |

No hay tablas nuevas. La migración no borra datos: la retirada la hace el seed (§3).

`cargarCatalogo` escribe `sobre_regalo` y `numero`, y `cargarCosmeticos` escribe `vendible`.

## 3. Retirada de las colecciones de prueba (seed)

`retirarColeccionesPrueba(tx)` se ejecuta al principio de la transacción de `cargarCatalogo` (research R11).

```text
prueba = colecciones ∩ {'all-stars', 'top-argentinos'}
si prueba = ∅ → no hace nada                                     (FR-012)
cartasPrueba = colecciones_cartas.jugador_id where coleccion_id ∈ prueba
comprasPrueba = colecciones_usuario.compra_id where coleccion_id ∈ prueba
              ∪ compras.id where producto_tipo = 'sobre'
1. delete partidas where id ∈ participantes(plantillas.jugadores && cartasPrueba)
                       ∪ mesas(elecciones.jugador_id ∈ cartasPrueba)      -- en cascada, todo lo demás
2. delete cartas_usuario where jugador_id ∈ cartasPrueba
3. delete movimientos_fragmentos where (motivo ∈ {desfragmentacion, duplicado} and referencia ∈ cartasPrueba)
                                    or referencia ∈ comprasPrueba
4. delete colecciones_usuario where coleccion_id ∈ prueba; delete compras where id ∈ comprasPrueba
5. delete colecciones where id ∈ prueba                           -- colecciones_cartas en cascada
```

`saldos_fragmentos` no se toca (FR-011). Devuelve un recuento por paso, que `pnpm seed` imprime.

## 4. Dominio (`packages/domain`)

- `economia/parametros.ts`: `desfragmentar = { Superclase: 25, Crack: 75, Legendario: 125, GOAT: 175 }` (FR-018).
- `catalogo/tipos.ts`: `Coleccion` gana `sobreRegalo?: string` y `cartas: { id, version, numero? }[]`.
- `catalogo/validar.ts`: reglas de `numero` y `precio_centimos` opcional (§1.3).
- `Catalogo` (servidor) expone el número de cada carta en cada colección para ordenar el detalle.

## 5. Entidades de la spec → modelo

| Entidad (spec) | Dónde vive |
|----------------|-----------|
| Expansión | Fila de `colecciones` con `tipo = 'pago'` y su entrada en `colecciones.json`; icono y cartel en `apps/web/public/expansiones/<id>/`. |
| Carta de expansión | Ficha de `expansiones-reales.json` → `jugadores` + `colecciones_cartas (numero)`; puede estar en varias colecciones (US1-3, ya lo permite la PK `(coleccion_id, jugador_id)`). |
| Sobre de regalo | `cosmeticos` con `tipo = 'sobre'` y `vendible = false`, referenciado por `colecciones.sobre_regalo`. |
| Compensación | Movimientos `duplicado` de `movimientos_fragmentos`, por `valorDesfragmentar(nivel)`, que se guardan en `compras.resultado.duplicados`. |

## 6. Transiciones de estado

Una expansión, para cada usuario registrado:

```text
no adquirida ──comprar (saldo ≥ precio)──▶ adquirida            (definitivo; una segunda compra → 409 COLECCION_ADQUIRIDA)
     │
     └─comprar (saldo < precio)──▶ 422 SALDO_INSUFICIENTE con `faltan`, sin cambios
```

Lo que cambia la compra, en una sola transacción e idempotente por `idCompra`:

- saldo − precio + Σ compensación;
- cartas nuevas en `cartas_usuario` (`via = 'coleccion'`);
- sobre de regalo en `cosmeticos_usuario` (si ya se tenía, no cambia);
- una fila en `colecciones_usuario`.
