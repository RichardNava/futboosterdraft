# Data Model (Fase 1): Rework de la tienda

**Fecha**: 2026-11-05 · **Spec**: [spec.md](spec.md) · **Research**: [research.md](research.md)

Todos los cambios de esquema van en la migración `apps/server/drizzle/0014_cosmeticos.sql`. Los identificadores van sin
tildes (CLAUDE.md).

## 1. Catálogo de cosméticos (`data/cosmeticos.json` → tablas)

```jsonc
{
  "version": "1.0.0",
  "cosmeticos": [
    { "id": "escudo-flor-de-lis-azul-oro", "tipo": "escudo", "nombre": "Flor de lis azul y oro", "gratuito": true, "orden": 1 },
    { "id": "escudo-premium-1", "tipo": "escudo", "nombre": "Premium 1", "gratuito": false,
      "precio_centimos": 25, "precio_fragmentos": 250, "orden": 19 },
    { "id": "sobre-original", "tipo": "sobre", "nombre": "Original", "gratuito": true, "orden": 0 },
    { "id": "sobre-cubismo", "tipo": "sobre", "nombre": "Cubismo", "gratuito": false,
      "precio_centimos": 50, "precio_fragmentos": 250, "orden": 1 }
  ],
  "packs": [
    { "id": "pack-escudos-1", "tipo": "escudo", "nombre": "Pack de escudos 1", "precio_centimos": 99,
      "cosmeticos": ["escudo-premium-1", "escudo-premium-2", "escudo-premium-3", "escudo-premium-4", "escudo-premium-5"] }
  ]
}
```

### Tabla `cosmeticos`

| Columna | Tipo | Reglas |
|---|---|---|
| `id` | text PK | *slug* con prefijo del tipo (research R3) |
| `tipo` | text | check `in ('escudo','sobre')` (se amplía con cada tipo nuevo, FR-022) |
| `nombre` | text | visible en la interfaz (con tildes) |
| `gratuito` | boolean | |
| `precio_centimos` | integer null | obligatorio y > 0 si `gratuito = false` |
| `precio_fragmentos` | integer null | obligatorio y > 0 si `gratuito = false` |
| `activo` | boolean, por defecto true | `false` = retirado: no se vende ni sale en el selector a quien no lo tiene |
| `orden` | integer | orden en el selector y en la tienda |

### Tabla `packs_cosmeticos`

| Columna | Tipo | Reglas |
|---|---|---|
| `id` | text PK | `pack-escudos-N`, `pack-sobres-N` |
| `tipo` | text | mismo check que `cosmeticos.tipo` |
| `nombre` | text | |
| `cosmeticos` | text[] | exactamente 5 ids de pago del mismo `tipo` (validado en el seed) |
| `precio_centimos` | integer | > 0; los packs solo se pagan con euros |
| `activo` | boolean | |

Contenido inicial: 38 escudos (18 gratuitos, 20 de pago), 31 sobres (`sobre-original` gratuito y 30 de pago), 4 packs
de escudos y 6 de sobres. El seed comprueba que cada pack tiene 5 cosméticos activos, de pago y del tipo del pack, y que
no hay ids repetidos.

## 2. Posesión: `cosmeticos_usuario`

| Columna | Tipo | Reglas |
|---|---|---|
| `usuario_id` | text FK `usuarios` (cascade) | |
| `cosmetico_id` | text FK `cosmeticos` | |
| `compra_id` | uuid FK `compras` | la compra que lo dio (suelta o pack) |
| `adquirido_en` | timestamptz | |

PK (`usuario_id`, `cosmetico_id`). Nunca se borra una fila al retirar un cosmético. Los gratuitos **no** se guardan:
están disponibles para todos.

**Disponibles para una cuenta registrada** = gratuitos activos ∪ poseídos (activos o retirados). **Para un invitado**
= escudos gratuitos activos y solo `sobre-original`.

## 3. Compras y movimientos (cambios en tablas de la 006)

- `compras.producto_tipo`: check `in ('coleccion','sobre','fragmentos','cosmetico','pack_cosmeticos')`.
  `producto_id` es el id del cosmético o del pack. El `resultado` jsonb añade `cosmeticos: string[]` (opcional en las
  filas antiguas).
- `movimientos_fragmentos.motivo`: el check añade `'compra_cosmetico'` y `'compra_coleccion'`.
- `colecciones`: nueva columna `precio_fragmentos integer null` (check: > 0 si `tipo = 'pago'`, rellenada por el seed
  desde `data/colecciones.json`).

Estados de compra: igual que en la 006, la compra se crea `completada` dentro de la misma transacción que entrega el
producto, así que no hay estados intermedios.

## 4. Preferencias de aspecto: columnas nuevas de `perfiles_usuario`

| Columna | Tipo | Reglas |
|---|---|---|
| `escudo` | text null FK `cosmeticos` | null = usa `escudoAsignado(usuarioId)` |
| `sobre_favorito` | text null FK `cosmeticos` | null = `sobre-original` |
| `sobre_carrusel` | boolean, por defecto false | |
| `sobres_marcados` | text[], por defecto `{}` | ids de tipo `sobre` disponibles para la cuenta |
| `sobre_baraja` | text[], por defecto `{}` | lo que queda por salir en la vuelta actual |
| `sobre_ultimo` | text null | último diseño servido (para no repetirlo al cambiar de vuelta) |

Reglas (dominio, `packages/domain/src/cosmeticos/carrusel.ts`):

- `sobreActual(p)`: con el carrusel activo y al menos un marcado, la cabeza de la baraja o, si está vacía,
  `sobre_ultimo` o el primer marcado. Sin carrusel, `sobre_favorito ?? 'sobre-original'`. No modifica nada.
- `siguienteSobre(p, rng)`: sin carrusel, devuelve el favorito. Con el carrusel, si la baraja está vacía, la rellena
  con los marcados barajados (Fisher–Yates) y, si el primero es igual a `sobre_ultimo` y hay más de uno, lo cambia por
  el segundo. Después saca la cabeza y actualiza `sobre_ultimo`.
- Con un solo marcado, equivale a favorito. Sin marcados, `sobre-original` (casos límite de la spec).
- Cambiar `sobres_marcados` o `sobre_carrusel` vacía `sobre_baraja`.
- Un id que ya no está disponible (retirado sin poseerlo) se descarta al leer.

## 5. Escudo del participante: `participantes.escudo`

| Columna | Tipo | Reglas |
|---|---|---|
| `escudo` | text null | sin FK, para que retirar un cosmético nunca falle en partidas viejas |

Resolución (`escudoDe(c, pid)` en el servidor; funciones puras en `packages/domain/src/cosmeticos/escudos.ts`):

1. `participantes.escudo` si no es null.
2. Humano registrado: `escudoAsignado(usuarioId)` = `GRATUITOS[hash(usuarioId) mod 18]` (FNV-1a de 32 bits; el
   orden de la lista es fijo por `orden`).
3. NPC: `GRATUITOS[derivarSemilla(semilla, 'escudo:' + pid) mod 18]`.
4. Invitado sin elección: `null` (círculo de color).

`escudosEnPartido(local, visitante)` devuelve `{ local, visitante }`, o `{ null, null }` si los dos ids coinciden
(FR-008).

Transiciones: se fija al unirse (desde el perfil, validado). Se puede cambiar con
`PUT /api/partidas/:id/escudo` hasta que empieza el torneo, igual que el nombre (`nombreEditable`). Después ya no
cambia, aunque el cosmético se retire o se reembolse (caso límite de la spec).

## 6. Identidad de las cartas

### `jugadores`: columnas nuevas (nulables)

`nombre_alt`, `apellidos_alt`, `nombre_carta_alt` e `imagen_alt`. Las carga el seed desde el campo opcional
`identidad_alternativa` de `data/core-real.json` y `data/cartas-prueba.json`. El check pide que `nombre_alt`,
`apellidos_alt` y `nombre_carta_alt` estén los tres o ninguno.

### `partidas.identidad`

text, no nulo, por defecto `'real'`, con check `in ('real','alternativa')`. Se copia del ajuste al crear la partida y
no cambia nunca.

### Tabla `ajustes`

| Columna | Tipo | Reglas |
|---|---|---|
| `clave` | text PK | de momento solo `identidad_cartas` |
| `valor` | jsonb | `"real"` o `"alternativa"` |
| `actualizado_en` | timestamptz | |

Sin fila, vale `"real"`.

### Vista de identidad (dominio, `packages/domain/src/catalogo/identidad.ts`)

`conIdentidad(jugador, 'real')` devuelve el jugador tal cual. `conIdentidad(jugador, 'alternativa')` sustituye
`nombre`, `apellidos`, `nombre_carta` e `imagen`:

- con identidad alternativa: sus valores; si no tiene `imagen_alt`, la silueta de su demarcación;
- sin ella: `nombre_carta = "<Demarcación> <id>"` (`Portero`, `Defensa`, `Centrocampista`, `Delantero`), `nombre`
  igual, `apellidos = ""` e `imagen = /cartas/siluetas/<dem>.svg`.

No toca `id`, `stats`, `media`, `virtudes`, `defectos`, `nivel`, `demarcacion`, `posicion`, `nacionalidad`,
`altura` ni `fecha_nacimiento` (FR-019). `historia` se vacía en «alternativa», porque cuenta la carrera del futbolista
real y lo identifica tanto como el nombre.

### Retrato propio

Es «propio» si `imagen` empieza por `/cartas/retratos-propios/` y «de terceros» si empieza por `/cartas/retratos/`
(research R5).

## 7. Parámetros de economía (cambios)

`PARAMETROS_ECONOMIA.paquetesFragmentos = []`. La constante `VENTA_CARTAS_CON_DINERO = false` va en
`packages/domain/src/economia/parametros.ts`. El resto no cambia.
