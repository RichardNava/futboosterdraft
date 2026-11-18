# Contrato de datos y del guion `expansiones`

**Fecha**: 2026-11-18 · Amplía [008/contracts/datos-core-real.md](../../008-datos-reales-core/contracts/datos-core-real.md).

## 1. Fichas (`data/expansiones-reales.json`)

Cada ficha cumple el contrato de la 008 (campos, formatos, bandas de media por nivel, rasgos permitidos,
`posicion[0]` coherente con la demarcación…) y además:

| Regla | Detalle |
|-------|---------|
| Id | 301–396 según research R2; Verratti, 299. El 376 no aparece (Kimmich está en `core-real.json`). |
| Nivel | El del bloque de su número en `rareza_X.txt`: 1–6 GOAT, 7–12 Legendario, 13–18 Crack, 19–24 Superclase. |
| Datos personales | Nombre completo, nacionalidad, fecha de nacimiento, altura, demarcación y posiciones reales, contrastados con las fuentes de su lista (SC-003). |
| Nombre | El real. Las erratas de la lista se corrigen y se anotan en el sumario. |
| `imagen` | `/cartas/retratos-propios/<slug>.webp`, con `slug` = nombre de carta sin tildes, en minúsculas y con guiones; sin colisión con los del Core. |
| `imagen_bg` | `/cartas/fondos/jugadores/<id>.webp`. Verratti conserva `299.webp`. |
| Identidad alternativa | Igual que en el Core: el plan B se aplica a todas las cartas (supuesto de la spec). |

## 2. Guion `pnpm --filter @fbd/fixtures expansiones`

```text
pnpm --filter @fbd/fixtures expansiones                       # solo valida y regenera el sumario
pnpm --filter @fbd/fixtures expansiones -- --origen ../../expansiones   # genera imágenes y valida
pnpm --filter @fbd/fixtures expansiones -- --origen ../../expansiones --solo A   # una expansión (lotes)
```

### Entrada esperada en `--origen`

```text
Expansion X/
  jugadores_expansionX.json      # [{ id: 1..24, nombre, web[] }]
  rareza_X.txt
  retratos/pagina_1X_<a>_<b>.png # rejilla de 6 columnas, ids a..b por filas
  imagen_bg/ o jugadores_bg/     # <n>_<nombre>.png, con n con o sin cero a la izquierda
  cartel/cartel_shop_X.png, cartel/icono_shop_X.png
icono/fragmento.png
```

Antes de escribir nada, el guion comprueba que cada expansión tiene sus N retratos (la unión de los rangos de las
páginas es 1..N sin solapes) y N fondos, que no sobra ni se repite ningún fichero, y que los dos carteles existen. Si
algo falla, lo lista y termina con código ≠ 0 sin tocar nada.

Correspondencia del número con la carta: `colecciones.json` (`{ id, numero }`). En D, el número 4 es Kimmich en el
origen. Su retrato y su fondo se escriben para el id 376 (Core), y el hueco 4 de la colección lo ocupa Verratti (299), que
ya tiene los suyos.

### Salida

| Origen | Destino | Formato |
|--------|---------|---------|
| Celda de retrato | `apps/web/public/cartas/retratos-propios/<slug>.webp` | 139 × 181, WebP con alfa (research R7) |
| Fondo | `apps/web/public/cartas/fondos/jugadores/<id>.webp` | 600 × 900, calidad 80 (R8) |
| `icono_shop_X.png` | `apps/web/public/expansiones/<id>/icono-256.webp`, `icono-512.webp` | con alfa (R9) |
| `cartel_shop_X.png` | `apps/web/public/expansiones/<id>/cartel.webp` | 768 × 1152, calidad 80 |
| `icono/fragmento.png` | `apps/web/public/iconos/fragmento-32.webp`, `fragmento-64.webp` | fondo a alfa (R10) |
| — | `specs/016-expansiones-reales/revision-retratos.webp` | hoja de las 96 sobre magenta, con su número |

Los sobres 25–33 no los procesa este guion, sino `imagenes --sobres` (research R14).

### Validación (siempre)

1. `validarLote` sobre `core-real.json` + `expansiones-reales.json` + `colecciones.json`, sin errores (FR-006).
2. Por expansión: números 1..N sin huecos, `sobre_regalo` presente y, en las cuatro de esta spec, 24 cartas y 6 por
   nivel (SC-001; es una comprobación de datos, no una regla del dominio).
3. Core: 300 cartas, Kimmich (376) dentro y Verratti (299) fuera, y el mismo recuento por demarcación y nivel que antes
   del cambio (FR-007).
4. Cada carta de expansión tiene su retrato y su fondo en disco. Ningún `.webp` de `retratos-propios/` queda sin ficha
   en los dos ficheros.
5. Peso medio de retrato + fondo de las cartas de expansión ≤ 1,10 × el del Core (SC-009).

### Sumario (`specs/016-expansiones-reales/sumario.md`)

Tabla por expansión: número, id, nombre de carta, nivel, demarcación, media y rasgos. Recuento por nivel y demarcación,
erratas corregidas, pesos medios frente al Core y el resultado de cada comprobación (✅/❌), legible sin abrir código
(Principio IX).
