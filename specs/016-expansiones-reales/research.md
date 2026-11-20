# Research: Expansiones reales

**Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Fecha**: 2026-11-18

La spec no deja ninguna NEEDS CLARIFICATION (seis aclaraciones del 2026-11-18). Esta investigación fija cómo se
encajan las expansiones en lo que ya existe: las colecciones de pago de las specs 006 y 011, el guion de imágenes de la
011 y el de fondos de la 013.

---

## R1. Una expansión es una colección de pago; «expansión» es solo el nombre visible

**Decisión**: no se crea una entidad nueva. Cada expansión es una fila de `colecciones` con `tipo = 'pago'` y su
pertenencia en `colecciones_cartas`. En el código, la API y la BD sigue llamándose `coleccion`; «expansión» solo
aparece en los textos de la interfaz (FR-016).

**Razón**: la compra con fragmentos, la idempotencia por `idCompra`, la compensación por cartas ya poseídas (movimiento
`duplicado`), la entrega a los compradores si se añaden cartas, el pool del sobre de la tienda y el pool del draft ya
funcionan sobre `colecciones` de pago y están probados (006, 011). Renombrar tablas, rutas y tipos sería un cambio
grande sin efecto para la persona.

**Alternativas**: tabla `expansiones` propia (duplica la lógica de compra y del pool); renombrar `coleccion` →
`expansion` en todo el código (diff enorme y sin valor funcional).

## R2. Ids de las cartas: 300 + 24 × (expansión − 1) + número

**Decisión**:

| Expansión | Id interno | Ids | Número n → id |
|-----------|------------|-----|---------------|
| A, Remontada Histórica | `remontada-historica` | 301–324 | 300 + n |
| B, Ídolos Dorados | `idolos-dorados` | 325–348 | 324 + n |
| C, Saque Ardiente | `saque-ardiente` | 349–372 | 348 + n |
| D, Estrellas Fulgurantes | `estrellas-fulgurantes` | 373–396 | 372 + n |

Kimmich (D-4) conserva el id que le toca, **376**, pero pertenece solo al Core. El hueco D-4 lo ocupa Verratti con su
id **299**. El número dentro de la expansión se guarda en `colecciones_cartas.numero` (R6).

**Razón**: la regla es fija y se puede comprobar a mano (FR-005). Los ids 301–375 de las cartas de prueba quedan todos
cubiertos (301–396), así que no queda ninguna fila de `jugadores` con datos de prueba. Verratti no cambia de id, de modo
que quien lo tiene lo conserva (FR-008) y las plantillas y partidas que lo citan no cambian.

**Alternativas**: dar a Kimmich el id 299 y a Verratti uno nuevo (las cuentas perderían a Verratti, contra FR-008);
ids correlativos sin hueco para Kimmich (rompe la regla de un vistazo y obliga a una tabla de correspondencia).

## R3. Ficheros de datos: `core-real.json` sigue siendo el Core y nace `expansiones-reales.json`

**Decisión**:

- `data/core-real.json` contiene exactamente las 300 cartas del Core: sale Verratti (299) y entra Kimmich (376).
- `data/expansiones-reales.json` (mismo formato `{ version, jugadores }`) contiene las 95 cartas de expansión que no son
  del Core, Verratti incluido.
- `data/colecciones.json`: el Core lista 1–298, 300 y 376; las cuatro expansiones listan sus 24 cartas como
  `{ "id", "numero" }`, con `precio_fragmentos: 2400`, sin `precio_centimos`, y `sobre_regalo`.
- `data/cartas-prueba.json` y `tools/fixtures/src/generarColeccionesPrueba.ts` se borran.

La validación de `core-real` (spec 008) cambia la regla «ids 1–N sin huecos» por «300 ids únicos que coinciden con la
colección Core de `colecciones.json`». La regla de que todo retrato de `retratos-propios/` lo usa una carta pasa a mirar
los dos ficheros.

**Razón**: se mantiene la regla del proyecto («las 300 cartas de Core salen solo de `core-real.json`», memoria
*core-real-unica-fuente*) y la pertenencia sigue estando en un solo sitio, `colecciones.json`.

**Alternativas**: un fichero por expansión (cuatro ficheros casi iguales y Verratti sin sitio claro); meter las
expansiones en `core-real.json` (rompe la regla de única fuente del Core).

## R4. Datos de cada jugador: los mismos criterios que la 008

**Decisión**: las fichas se redactan con el contrato de la 008
([datos-core-real.md](../008-datos-reales-core/contracts/datos-core-real.md)): los datos personales salen de las
fuentes de la lista de `./expansiones` (Wikipedia en primer lugar) y la historia, las estadísticas, la media, las
virtudes y los defectos siguen las bandas de media por nivel y el reparto de rasgos de las cartas del Core del mismo
nivel y demarcación. Se hace por expansión, en cuatro lotes, y cada lote se valida con el guion de R5 antes de pasar al
siguiente. Las erratas de nombre se corrigen en la ficha («Roméo Lavia», «Keylor Navas»…) y se anotan en el sumario.

La ficha de Kimmich se hace igual, con una condición que fijó la persona: su **media debe ser de 88 como mínimo**, la
misma que la de Verratti, al que sustituye en el Core (los dos son GOAT de `MED`). La media es el promedio de las seis
estadísticas, y los GOAT del Core van hoy de 87,67 a 96,67. El guion `core-real` lo comprueba. Con eso, la sustitución
apenas toca el Core. Aun así se pasa `pnpm balance` tras el cambio. Si algún criterio cambia de estado, se informa a
la persona con el valor medido y una propuesta, sin tocar umbrales (memoria *umbrales-decide-persona*).

**Razón**: FR-003 pide los mismos criterios, y SC-003 exige datos personales verificables.

**Alternativas**: generar estadísticas por fórmula a partir de la media (no respeta los criterios a mano de la 008).

## R5. Guion `expansiones` en `@fbd/fixtures`

**Decisión**: nuevo comando `pnpm --filter @fbd/fixtures expansiones -- [--origen <dir>]`, basado en sharp (ya es
dependencia de desarrollo de fixtures desde la 011). Hace:

1. **Validar** (siempre): `expansiones-reales.json` y `colecciones.json` con las reglas del catálogo (FR-006); cada
   expansión con sus cartas, sus números 1..N sin huecos, su `sobre_regalo` existente y no vendible; cada carta con
   retrato y fondo existentes y ningún fichero sobrante (FR-015). Escribe `specs/016-expansiones-reales/sumario.md`
   (recuento por nivel y demarcación, erratas corregidas y peso medio de las imágenes frente al Core, SC-009).
2. **Generar** (con `--origen`): retratos (R7), fondos (R8), icono y cartel de cada expansión (R9) y el icono del
   fragmento (R10). Antes de escribir nada, comprueba que el origen tiene exactamente lo esperado, como `fondos-core`.
   No borra el origen.

Reutiliza `planificarFondos` de `fondosCore.ts` y exporta su `ID_EN_NOMBRE`, que hoy no se exporta. `/^(\d+)[_.-]/` ya admite el `01_` de B y los
nombres largos con tildes de C, porque solo lee el número inicial. Las carpetas `imagen_bg` y `jugadores_bg` se aceptan
las dos.

**Razón**: FR-015 pide una herramienta repetible, y el proyecto ya tiene este patrón (`core-real`, `fondos-core`,
`imagenes`).

**Alternativas**: retocar las imágenes a mano (no repetible); un guion de Python (otra pila de herramientas en el
monorepo).

## R6. Esquema: tres cambios pequeños en la migración `0017_spec016.sql`

**Decisión**:

- `colecciones.sobre_regalo text null references cosmeticos(id)`: el sobre que regala la expansión.
- `colecciones_cartas.numero integer null`: número dentro de la colección (1..N); null en el Core.
- `cosmeticos.vendible boolean not null default true`: los sobres 1, 4, 7 y 28 pasan a `false`.
- Se retira el *check* `colecciones_precio_ck` (`precio_centimos > 0` en las de pago): las expansiones solo tienen
  precio en fragmentos (FR-020, Principio VII).

El icono de tienda y el cartel no se guardan en BD: se sirven por convención desde
`/expansiones/<id>/icono-256.webp`, `icono-512.webp` y `cartel.webp`.

**Razón**: es el mínimo para FR-005, FR-025, FR-026 y FR-032. El número, el precio, el reparto y el regalo son datos
de cada expansión, así que una de 40 cartas solo añade filas.

**Alternativas**: guardar el número solo en el JSON (el modal no podría ordenar por número sin releer el fichero);
reutilizar `activo = false` para los sobres de regalo (`activo = false` ya significa «retirado», y el selector solo lo
muestra a quien lo posee, pero `GET /api/cosmeticos` y los packs lo tratarían igual que un cosmético retirado).

## R7. Retratos: rejilla, chroma por inundación desde el borde y mismo encuadre que el Core

**Decisión**:

- Cada página es una rejilla de 6 columnas y N/6 filas, leída por filas. El nombre da el rango
  (`pagina_1A_1_18` → 1..18, 3 filas; `pagina_1C_1_6` → 1..6, 1 fila). El tamaño de cada celda sale del de la página
  (1536 × 1024 o 1448 × 1086).
- El fondo se quita por **inundación desde el borde de la celda**: solo se vuelven transparentes los píxeles
  conectados al borde y cercanos al verde croma (muestreado en las esquinas de la página). Después se suaviza el borde
  alfa y se quita el reflejo verde (*despill*: G ≤ max(R, B) en los píxeles del borde).
- Se recorta al contenido, se escala a lo ancho a **139 × 181** (el tamaño de los retratos de `retratos-propios/`),
  anclado arriba, y se guarda en WebP con alfa en `apps/web/public/cartas/retratos-propios/<slug>.webp`.
- El guion genera además una **hoja de revisión** (`specs/016-expansiones-reales/revision-retratos.webp`, las 96 sobre
  un fondo magenta) para la revisión visual de SC-002. Si un retrato sale mal, `data/expansiones-ajustes.json` admite
  una tolerancia propia por carta (solo se crea si hace falta).

**Razón**: un chroma global se comería las camisetas verdes; por ejemplo, el portero de A-16 lleva una camiseta verde
que toca el borde de la celda. La inundación solo entra en el verde croma saturado (≈ (3, 252, 3)), que no se parece al
verde de las camisetas. El encuadre del Core es un primer plano cortado a la altura del pecho, y las celdas
(≈ 256 × 341, proporción 0,75) ya tienen ese encuadre (0,77).

**Alternativas**: separar los retratos a mano; chroma global por tono (pierde las camisetas verdes); un modelo de
segmentación (dependencia pesada para 96 imágenes).

## R8. Fondos: los mismos parámetros que `fondos-core`

**Decisión**: 600 × 900, WebP de calidad 80, en `apps/web/public/cartas/fondos/jugadores/<id>.webp`, con el id global
de R2. Se usa el mismo límite de peso medio (≤ 120 KB) y el `imagen_bg` se escribe en la ficha. El fondo de Kimmich va
a `376.webp`, y el de Verratti sigue en `299.webp` (no hay fondo nuevo para él: su ilustración del Core se queda).

**Razón**: FR-014 y SC-009 piden el mismo formato y peso. Hoy los fondos del Core pesan ≈ 60 KB de media y los retratos
≈ 14 KB.

## R9. Icono de tienda y cartel de cada expansión

**Decisión**: `icono_shop_X.png` (1254², RGBA) → `icono-256.webp` y `icono-512.webp`; `cartel_shop_X.png`
(1024 × 1536) → `cartel.webp` a 768 × 1152, calidad 80, en `apps/web/public/expansiones/<id>/`. Antes de dar por buena
la expansión, la persona comprueba que el sobre que aparece en el cartel es el de `sobre_regalo` (US3-5; recorrido del
quickstart).

## R10. Icono del fragmento: componente `Fragmentos`

**Decisión**:

- `expansiones/icono/fragmento.png` es RGB sobre fondo casi negro. El guion lo recorta al contenido, convierte el fondo
  en alfa (inundación desde el borde con un umbral de luminancia) y genera `apps/web/public/iconos/fragmento-32.webp` y
  `fragmento-64.webp`.
- En la web, un componente `Fragmentos` (`componentes/Fragmentos.tsx`) pinta el icono (`<img alt="" aria-hidden>`,
  `srcset` 1x/2x) y la cantidad con `formatoFragmentos`, y añade «fragmentos» en texto solo para lectores de pantalla.
  Sustituye a los 4 usos de `<Icono nombre="cristal">` y a los textos «N fragmentos» de los 11 ficheros que formatean
  fragmentos (barra de navegación, tienda, resúmenes de compra, colección, historial, perfil, crear partida, campeón).
- Contraste: el icono es verde brillante con brillo propio y se lee sobre fondo claro y oscuro. Se comprueba a 16 px y
  a 32 px en los dos temas (recorrido del quickstart).

**Razón**: un solo componente cumple FR-030 y FR-031 a la vez y evita que cada pantalla repita el `aria-label`.

**Alternativas**: dibujar el icono en SVG dentro de `Icono` (no es el arte que entrega la persona).

## R11. Retirada de las colecciones de prueba dentro del seed

**Decisión**: la retirada es una función `retirarColeccionesPrueba(tx)` que `cargarCatalogo` llama **al principio de
su transacción, antes de insertar ninguna carta**. Las colecciones se identifican por su id (`all-stars`,
`top-argentinos`) y sus cartas, por `colecciones_cartas` de esas dos colecciones. Si no queda ninguna de las dos en la
BD, no hace nada (FR-012). Si quedan, borra en este orden:

1. Las **partidas** en las que alguna carta de prueba aparece en `plantillas.jugadores` o en `elecciones` (en cascada
   se van participantes, mesas, alineaciones, partidos, torneos y avisos). Así no se reproduce ninguna partida con
   jugadores distintos.
2. Las filas de `cartas_usuario` de esas cartas.
3. Los `movimientos_fragmentos` que citan una carta de prueba (`desfragmentacion` y `duplicado`) o una compra de
   prueba. No se toca el saldo: no hay compensación ni retirada de saldo (FR-011).
4. `colecciones_usuario` y `compras` de las colecciones de prueba, y las compras de sobres de la tienda (todas sacaron
   cartas de prueba, porque eran el único pool de pago).
5. Las dos colecciones y su pertenencia.

Las filas de `jugadores` 301–375 no se borran: el *upsert* de la misma transacción las sobrescribe con las cartas de
expansión, y no existe ningún id de prueba fuera de 301–396.

**Razón**: la retirada tiene que ocurrir antes de que los ids 301+ pasen a ser cartas de expansión (FR-010). Hacerla
dentro del seed lo garantiza siempre, también en una BD de desarrollo que no se migra de nuevo. Identificar las cartas
por colección y no por id es lo que la hace repetible: en una segunda pasada, los ids 301+ ya son de expansión y no se
tocan. Exige que no haya partidas en curso: el quickstart lo pide (servidor parado).

**Alternativas**: una migración SQL (corre una sola vez, no se puede probar dos veces y depende de que el seed vaya
detrás); borrar por rango de ids (no es repetible tras cargar las expansiones).

## R12. Compra de una expansión: lo que ya hay más el sobre de regalo

**Decisión**: `comprarColeccion` se queda como está (cobro, cartas nuevas y un movimiento `duplicado` por carta ya
poseída, con `valorDesfragmentar`) y añade, dentro de la misma transacción, el sobre de regalo:
`insert into cosmeticos_usuario … on conflict do nothing` (US3-4). El resultado guarda `cosmeticos: [sobre_regalo]`,
que ya existe en `ResultadoCompraGuardado`. `ResumenCompra` gana `cosmeticos` para que la confirmación muestre el sobre.

Los invitados siguen sin poder comprar (`soloRegistrados`). Con todas las cartas en la colección, la compra sigue
permitida y compensa 2400 (caso límite de la spec). Ya lo cubre `soloFragmentos`.

## R13. Desfragmentar a 25 / 75 / 125 / 175

**Decisión**: `PARAMETROS_ECONOMIA.desfragmentar = { Superclase: 25, Crack: 75, Legendario: 125, GOAT: 175 }`. El valor
esperado de desfragmentar un sobre de la tienda pasa a 4 × 25 + 2 × 75 + 125 + 0,8 × 125 + 0,2 × 175 = **510**, por
debajo de los 1000 que cuesta, así que `validarParametrosEconomia` sigue pasando (FR-018). Se actualizan los textos y
documentos que citan los valores antiguos (`grep` de «desfragment» en `apps/web` y `docs/`).

Verratti deja de ser del Core y se comporta como cualquier carta de expansión (confirmado por la persona): quien lo
tiene puede desfragmentarlo (175), y si lo hace y luego compra Estrellas Fulgurantes, lo recibe como carta nueva. No
hace falta código específico: `desfragmentar` ya solo bloquea las cartas del Core.

## R14. Sobres: catálogo, regalo y packs

**Decisión**: los sobres 25–33 se procesan con el comando `imagenes` que ya existe
(`--sobres expansiones/sobres`, `sobre_N.png` → `sobre-N`, 512 × 768 y mini). En `data/cosmeticos.json`:

- `sobre-1`, `sobre-4`, `sobre-7` y `sobre-28` pasan a `"vendible": false`. Conservan el precio para poder mostrarlos
  como «se consigue con la expansión X», aunque no se puedan comprar.
- `sobre-25`…`sobre-27` y `sobre-29`…`sobre-33`: 250 fragmentos o 50 céntimos, como los demás sobres de pago.
- `pack-sobres-2`: `sobre-tinta-y-trama`, `sobre-2`, `sobre-3`, `sobre-25`, `sobre-26`.
- `pack-sobres-3`: `sobre-5`, `sobre-6`, `sobre-8`, `sobre-9`, `sobre-27`.
- `pack-sobres-7`, nuevo: `sobre-29`…`sobre-33`, a 199 céntimos.

`validarCosmeticos` exige además que los packs solo contengan cosméticos vendibles y que cada `sobre_regalo` de
`colecciones.json` sea un sobre no vendible. `comprarCosmetico` rechaza uno no vendible con 422 `COSMETICO_NO_VENDIBLE`.
La tienda de cosméticos filtra `vendible`.

**Razón**: FR-025 a FR-029 y SC-006. Los packs siguen siendo de euros: son cosméticos, y el Principio VII lo permite.

## R15. Tienda: tarjeta y modal de detalle

**Decisión**:

- La sección «Colecciones» pasa a llamarse **«Expansiones»**. El sobre de cartas se queda en la misma sección, con el
  texto «8 cartas que aún no tienes de las expansiones».
- `ProductoColeccion` gana `cartas` (las N cartas en orden de número, cada una con `poseida` y su valor de
  compensación), `compensacion` (total si se compra ahora), `sobreRegalo`, `icono` y `cartel`. Se envía en el mismo
  `GET /api/tienda`, sin ruta nueva: son 96 resúmenes de carta (≈ 20 KB), y el modal se abre sin esperar.
- La tarjeta y el modal se hacen con los componentes de la casa (`Dialogo`, `Icono` con la lupa y `CartaResumen`). El
  detalle va a dos columnas en escritorio (cartel | lista) y apilado en móvil (Principio XI).
- **Esquema de la tarjeta**: la persona lo entregó como imagen de guía y no se guarda en el proyecto. La disposición
  queda escrita en FR-017 y, con proporciones, en [contracts/ui.md §2](contracts/ui.md):
  - nombre y descripción en la columna izquierda;
  - «Comprar + precio» a la izquierda y «Ver detalle + lupa» a la derecha, en la fila inferior y con el mismo ancho
    y alto;
  - el icono de tienda, cuadrado y grande, por delante de la esquina superior derecha, sobresaliendo por arriba y un
    poco por la derecha.

## R16. Pruebas que usaban las cartas de prueba

**Decisión**: las pruebas que hoy leen `cartas-prueba.json` o las colecciones `all-stars` y `top-argentinos` pasan a
usar las expansiones reales de `data/`. Son 11 ficheros: integración del servidor (`coleccion`, `tienda`,
`identidad-cartas`, `seed`), web (`cartasPortada`, `filtradoColeccion`, e2e `tienda.spec.ts`), dominio (`datos006`,
`validar`, `sobres/tienda`), el esquema `player-data.schema.json` y la comprobación `colecciones` de `tools/balance`.
Donde una prueba solo necesita «una colección de pago cualquiera», monta una en memoria con cartas del Core, en lugar
de depender del contenido de una expansión.

Pruebas nuevas:

- dominio: valores de desfragmentar y valor esperado del sobre;
- seed: retirada (dos pasadas, la segunda sin cambios; partidas, plantillas y compras borradas), pertenencia de
  Kimmich y Verratti, y validación de `sobre_regalo` y `vendible`;
- integración de la tienda: compra con 0, 6 y 24 cartas ya poseídas (SC-004, con la cuenta 175 + 2 × 75 + 3 × 25 = 400
  de US2-4), sobre de regalo ya poseído, doble envío, saldo insuficiente con `faltan`, sobre no vendible rechazado y
  packs;
- web: componente `Fragmentos` (texto accesible) y modal de detalle;
- e2e: comprar una expansión desde el detalle.
