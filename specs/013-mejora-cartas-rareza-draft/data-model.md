# Data Model: Mejora de cartas y nivel de rareza del draft

**Fase 1 de** [plan.md](plan.md) · Decisiones en [research.md](research.md)

## 1. Migración `0016_spec013.sql`

```sql
-- Nivel de rareza del draft (FR-016, FR-018) e idempotencia de la creación (FR-033)
alter table partidas add column nivel_rareza text not null default 'moderado';
alter table partidas add constraint partidas_nivel_rareza_ck
  check (nivel_rareza in ('pobre','escaso','moderado','abundante','rico'));
alter table partidas add column cobro_rareza integer;          -- fragmentos cobrados; null = gratis
alter table partidas add column clave_creacion text;           -- clave del envío del formulario
create unique index partidas_anfitrion_clave_uq on partidas (anfitrion_id, clave_creacion)
  where clave_creacion is not null;

-- «Mis partidas» (R9)
create index participantes_usuario_idx on participantes (usuario_id);

-- Pase premium (FR-035, FR-036)
create table pases_premium (
  usuario_id text primary key references usuarios(id),
  fin timestamptz,                                -- null = nunca comprado
  cortesia boolean not null default false,
  actualizado_en timestamptz not null default now()
);

-- Compras y movimientos nuevos
alter table compras drop constraint compras_producto_tipo_ck;
alter table compras add constraint compras_producto_tipo_ck
  check (producto_tipo in ('coleccion','sobre','fragmentos','cosmetico','pack_cosmeticos','pase_premium'));
-- movimientos_fragmentos_motivo_ck: + 'nivel_rareza', 'devolucion_nivel_rareza', 'compra_pase_premium'
create unique index movimientos_devolucion_rareza_uq on movimientos_fragmentos (referencia)
  where motivo = 'devolucion_nivel_rareza';
```

La fila de `ajustes` `acceso_niveles_rareza` no se crea: sin fila vale `libre` (FR-019).

## 2. Dominio (`packages/domain`)

### 2.1 Nivel de rareza — `sobres/rareza.ts` (nuevo)

| Elemento | Definición |
|---|---|
| `NivelRareza` | `'pobre' \| 'escaso' \| 'moderado' \| 'abundante' \| 'rico'` |
| `NIVELES_RAREZA` | en ese orden (el de la interfaz) |
| `NIVEL_RAREZA_POR_DEFECTO` | `'moderado'` |
| `RepartoSobre` | `{ superclase, crack, legendario, altas, probGoatEnAlta }`; invariante `superclase + crack + legendario + altas = 8` |
| `AccesoNivel` | `'libre' \| 'restringido'` |
| `accesoNivelRareza(e)` | ver tabla §2.3 |

### 2.2 Parámetros de equilibrado — siguiente versión (`v7.json`)

`sobres` gana `niveles: Record<NivelRareza, RepartoSobre>`:

| Nivel | superclase | crack | legendario | altas | probGoatEnAlta |
|---|---|---|---|---|---|
| pobre | 5 | 2 | 0 | 1 | 0.05 |
| escaso | 5 | 2 | 0 | 1 | 0.20 |
| moderado | 4 | 2 | 1 | 1 | 0.30 |
| abundante | 3 | 2 | 1 | 2 | 0.50 |
| rico | 2 | 2 | 1 | 3 | 0.50 |

`sobres.probGoatEnAlta` sigue en 0,2 y solo lo usan los sobres de la tienda (R4). Un test valida que cada reparto
suma 8.

### 2.3 Regla de acceso (FR-019)

| Ajuste | Nivel | Invitado | Registrado sin pase | Registrado con pase (comprado o cortesía) |
|---|---|---|---|---|
| `libre` | cualquiera | gratis | gratis | gratis |
| `restringido` | moderado | gratis | gratis | gratis |
| `restringido` | otro | no disponible (`INVITADO`) | 100 fragmentos | gratis |

### 2.4 `ConfigPartida`

Gana `nivelRareza: NivelRareza` (por defecto `moderado` en `configPorDefecto()`); `validarConfigPartida` rechaza un
valor desconocido con `NIVEL_RAREZA_INVALIDO`. El acceso no se valida aquí (depende del ajuste y de la cuenta): lo
valida el servidor (FR-017).

### 2.5 Generador

`generarSobre(rng, p, reparto)` y `generarMesa(pool, n, semilla, p, reparto)`; contrato en
[contracts/generador.md](contracts/generador.md).

### 2.6 Pase premium — `economia/premium.ts` (nuevo)

| Elemento | Definición |
|---|---|
| `EstadoPremium` | `{ fin: Date \| null; cortesia: boolean }` |
| `premiumActivo(e, ahora)` | `e.cortesia \|\| (e.fin !== null && e.fin > ahora)` |
| `nuevoFin(e, ahora, dias)` | `max(ahora, e.fin ?? ahora) + dias` (FR-034: suma 30 días si está activo) |

`PARAMETROS_ECONOMIA` gana `precioNivelRareza: 100` y `pasePremium: { dias: 30, fragmentos: 2990, centimos: 299 }`.

### 2.7 Identidad (FR-006)

`conIdentidad(j, 'alternativa')` devuelve además `imagen_bg: '/cartas/fondos/<dem>.svg'` cuando
`j.imagen_bg` empieza por `/cartas/fondos/jugadores/`.

## 3. Datos

- `data/core-real.json`: las 300 fichas pasan a `imagen_bg: "/cartas/fondos/jugadores/<id>.webp"`; nada más cambia.
- `apps/web/public/cartas/fondos/jugadores/1.webp … 300.webp` (nuevos).
- `jugadores_bg/` se borra tras verificar (FR-007).

## 4. Estados y transiciones

- **Partida**: sin cambios en `transicion()`. Al pasar de `buscando` a `cancelada` con `cobro_rareza` no nulo se
  devuelve el cobro una sola vez (FR-033).
- **Pase premium**: `inactivo → activo` al comprar o con la cortesía; `activo → inactivo` cuando `fin ≤ ahora` y sin
  cortesía. Una partida ya creada conserva su nivel aunque el pase caduque o cambie el ajuste (edge case).
