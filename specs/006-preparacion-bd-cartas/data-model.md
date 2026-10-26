# Modelo de datos — Spec 006

Las decisiones de este modelo están razonadas en [research.md](./research.md). Los nombres siguen la convención del
proyecto: español y sin tildes.

## 1. Ficheros de datos

### 1.1 Carta (`data/core.json`, `data/cartas-prueba.json`)

Raíz: `{ version: string, jugadores: Carta[] }`. Desaparece la clave raíz `coleccion`.

| Campo | Cambio | Regla |
|---|---|---|
| `id` … `nivel` | sin cambios | reglas actuales (`validarJugador`) |
| `coleccion` | **se elimina** | la pertenencia va en `colecciones.json` (R1) |
| `nacionalidad` | redefinido | código de `SELECCIONES` (R6); `GBR` no es válido |
| `nombre_carta` | **nuevo**, obligatorio | texto no vacío, ≤ 24 caracteres |
| `imagen` | **nuevo**, obligatorio | ruta que empieza por `/cartas/` |
| `imagen_bg` | **nuevo**, obligatorio | ruta que empieza por `/cartas/` |

Las rutas genéricas son `/cartas/siluetas/{por|def|med|del}.svg` y `/cartas/fondos/{por|def|med|del}.svg`.

### 1.2 Colecciones (`data/colecciones.json`)

```json
{
  "version": "1.0.0",
  "colecciones": [
    { "id": "core", "nombre": "Core", "descripcion": "…", "tipo": "basica", "cartas": [1, 2, 3] },
    {
      "id": "all-stars",
      "nombre": "All Stars",
      "descripcion": "…",
      "tipo": "pago",
      "precio_centimos": 499,
      "destacadas": [301, 302, 303],
      "cartas": [1, 301, { "id": 302, "version": "normal" }]
    }
  ]
}
```

**Reglas de `validarCatalogo(cartas, colecciones)`**, en `packages/domain/src/catalogo/validar.ts`:

- `id` de colección único, en formato kebab-case sin tildes;
- exactamente una colección `basica`, con `id` `core`, que cumple `DISTRIBUCION_CORE` exacta;
- colecciones de `pago` con `precio_centimos > 0`;
- cada carta referenciada existe y aparece una sola vez por colección;
- `version` ∈ `VERSIONES_CARTA` (`['normal']`);
- toda carta pertenece al menos a una colección;
- `destacadas` ⊆ `cartas` (opcional; si falta, se muestran las 3 de mayor nivel y media).

## 2. Dominio (`packages/domain`)

| Módulo | Contenido |
|---|---|
| `catalogo/tipos.ts` | `Jugador`: se quita `coleccion` y se añaden `nombre_carta`, `imagen` e `imagen_bg`. Nuevos tipos `VersionCarta = 'normal'`, `TipoColeccion = 'basica' \| 'pago'`, `Coleccion { id, nombre, descripcion, tipo, precioCentimos?, destacadas?, cartas: { id, version }[] }` |
| `catalogo/selecciones.ts` | **nuevo**: `SELECCIONES` y `esSeleccion(codigo)` |
| `catalogo/validar.ts` | nuevas reglas de 1.1 y `validarCatalogo` (1.2) |
| `coleccion/minimo.ts` | **nuevo**: `comprobarMinimoActivo` (R11) |
| `economia/parametros.ts` | **nuevo**: `PARAMETROS_ECONOMIA`, `valorDesfragmentar(nivel)`, `valorEsperadoSobre(p)` y `validarParametrosEconomia` (R9) |
| `sobres/tienda.ts` | **nuevo**: `generarSobreTienda` (R13) |

## 3. Base de datos — migración `0011_colecciones`

### 3.1 Tablas modificadas

**`jugadores`**:

- se elimina `coleccion` y su índice `jugadores_coleccion_idx`;
- se añaden `nombre_carta text not null`, `imagen text not null` e `imagen_bg text not null`. La migración rellena las
  filas existentes con los mismos valores que R4 y después quita los `default`;
- `nacionalidad`: la migración reasigna `GBR` con la misma tabla `id → código` que `data/core.json`, para que la base y
  el fichero coincidan.

**`partidas`**:

- se añade `pool_cartas integer[]` (admite `null`): la foto de la colección activa del anfitrión al crear la partida
  (R12);
- `colecciones text[]` se mantiene; su valor `'Core'` pasa a `'core'` en la migración (`update … set colecciones =
  array['core']`).

### 3.2 Tablas nuevas

```text
colecciones
  id              text pk
  nombre          text not null
  descripcion     text not null
  tipo            text not null            check in ('basica','pago')
  precio_centimos integer                  check (tipo = 'basica' or precio_centimos > 0)
  destacadas      integer[] not null default '{}'
  orden           integer not null         -- orden en la tienda

colecciones_cartas
  coleccion_id    text  fk → colecciones.id on delete cascade
  jugador_id      integer fk → jugadores.id
  version         text not null default 'normal'  check in ('normal')
  pk (coleccion_id, jugador_id)
  index (jugador_id)                        -- «en qué colecciones está esta carta»

cartas_usuario
  usuario_id      text fk → usuarios.id on delete cascade
  jugador_id      integer fk → jugadores.id
  version         text not null default 'normal'  check in ('normal')
  activa          boolean not null default true
  via             text not null            check in ('registro','coleccion','sobre')
  obtenida_en     timestamptz not null default now()
  pk (usuario_id, jugador_id)               -- FR-010 y FR-004: una fila por carta

colecciones_usuario
  usuario_id      text fk → usuarios.id on delete cascade
  coleccion_id    text fk → colecciones.id
  compra_id       uuid fk → compras.id
  adquirida_en    timestamptz not null default now()
  pk (usuario_id, coleccion_id)             -- FR-027: una sola compra por colección

saldos_fragmentos
  usuario_id      text pk fk → usuarios.id on delete cascade
  saldo           integer not null default 0  check (saldo >= 0)   -- FR-017
  actualizado_en  timestamptz not null default now()

movimientos_fragmentos
  id              uuid pk default random
  usuario_id      text fk → usuarios.id on delete cascade
  importe         integer not null         check (importe <> 0)
  motivo          text not null            check in ('recompensa_torneo','desfragmentacion','duplicado','compra_fragmentos','compra_sobre')
  referencia      text not null            -- partida_id, jugador_id, compra_id
  creado_en       timestamptz not null default now()
  index (usuario_id, creado_en desc)
  unique (usuario_id, motivo, referencia) where motivo = 'recompensa_torneo'   -- R10, FR-019

compras
  id              uuid pk                  -- idCompra del cliente (R10)
  usuario_id      text fk → usuarios.id on delete cascade
  producto_tipo   text not null            check in ('coleccion','sobre','fragmentos')
  producto_id     text not null            -- id de colección, 'sobre' o id de paquete
  moneda          text not null            check in ('eur','fragmentos')
  importe         integer not null         -- céntimos o fragmentos
  simulada        boolean not null default true   -- FR-031: siempre true en el MVP
  estado          text not null            check in ('completada')
  resultado       jsonb not null           -- { cartas: number[], fragmentos: number, duplicados: {id, fragmentos}[] }
  creada_en       timestamptz not null default now()
  index (usuario_id, creada_en desc)
```

**Por qué `compras.estado` solo admite `completada`**: la compra se inserta en la misma transacción que la entrega, así
que no hay estados intermedios mientras no exista una pasarela real. Cuando llegue, se añadirán `pendiente` y `fallida`
sin cambiar el resto (FR-033).

### 3.3 Invariantes

| Invariante | Cómo se garantiza |
|---|---|
| `saldo = sum(importe)` de los movimientos del usuario (SC-006) | saldo y movimiento se escriben en la misma transacción |
| Recuento de cartas activas por combinación ≥ `DISTRIBUCION_CORE` (FR-012) | se comprueba en el servidor antes de desactivar o desfragmentar, con bloqueo de filas (R11) |
| Una carta de Core no se puede desfragmentar (FR-021) | se comprueba contra `colecciones_cartas` con `coleccion_id = 'core'` |

## 4. Operaciones y transiciones

### 4.1 Carta poseída

```text
(no poseída) ──registro/coleccion/sobre──▶ activa ◀──activar / desactivar──▶ inactiva
activa | inactiva ──desfragmentar (no Core, respeta el mínimo)──▶ (no poseída)
```

### 4.2 Operaciones

Cada operación se ejecuta en una transacción del `ServicioEconomia`.

| Operación | Pasos |
|---|---|
| `asegurarColeccion(u)` | inserta las cartas de Core que falten con `via = 'registro'` y el saldo con 0 (`on conflict do nothing`) |
| `cambiarActiva(u, j, activa)` | bloquea las cartas del usuario (`for update`); si `activa = false`, aplica `comprobarMinimoActivo`; actualiza |
| `desfragmentar(u, j)` | bloquea las cartas; comprueba que no es de Core; si está activa, aplica el mínimo; `delete … returning`; suma al saldo; inserta el movimiento `desfragmentacion` con referencia `j` |
| `comprarColeccion(u, c, idCompra)` | si `compras[idCompra]` ya existe, devuelve su resultado; si `colecciones_usuario(u, c)` existe, devuelve `409 COLECCION_ADQUIRIDA`; si no, inserta la compra, la colección comprada, las cartas que faltan (`via = 'coleccion'`, activas) y un movimiento `duplicado` por cada carta ya poseída |
| `comprarSobre(u, moneda, idCompra)` | si el `idCompra` ya existe, devuelve su resultado; calcula `disponibles`; si son menos de 8, devuelve `409 SOBRE_NO_DISPONIBLE`; si la moneda es `fragmentos`, hace el cargo condicional (R10) y el movimiento `compra_sobre` negativo; genera el sobre con la semilla de `idCompra`; inserta las cartas (`via = 'sobre'`) y la compra |
| `comprarFragmentos(u, paquete, idCompra)` | si el `idCompra` ya existe, devuelve su resultado; si no, suma al saldo e inserta el movimiento `compra_fragmentos` y la compra |
| `recompensarTorneo(u, partida)` | inserta el movimiento `recompensa_torneo` (`on conflict do nothing`); si se insertó, suma al saldo |

### 4.3 Cartas nuevas en una colección ya vendida (Edge Cases)

El seed compara la pertenencia anterior y la nueva de cada colección de pago, en la misma transacción que la carga. Por
cada comprador de la colección:

- inserta las cartas añadidas que no posea, activas y con `via = 'coleccion'`;
- y, por las que ya posea, registra un movimiento `duplicado`.
