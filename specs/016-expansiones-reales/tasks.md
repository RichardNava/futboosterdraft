---

description: "Tareas de la spec 016: expansiones reales"
---

# Tasks: Expansiones reales

**Input**: documentos de diseño de `specs/016-expansiones-reales/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md),
[contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: sí. El plan (Testing), la research R16 y el Principio IX los piden: dominio, seed (dos pasadas de la
retirada), integración (SC-004 con 0, 6 y 24 cartas poseídas), componentes y e2e.

**Organización**: por historia de usuario. US1 y US2 son P1, US3 es P2 y US4 es P3. US3 y US4 no dependen de US1. La
interfaz de US2 necesita los datos de US1.

**Reglas comunes a todas las tareas**:

- En código, API y BD se sigue diciendo `coleccion`. «Expansión» solo aparece en los textos visibles (research R1).
- Sin tildes en el código; textos de interfaz y documentación en español.
- El número de cartas, el reparto por nivel, el precio y el sobre de regalo son **datos** de cada expansión, nunca
  reglas del código (FR-032): nada de `24`, `6 por nivel` ni `2400` fijos fuera de `data/` y de las pruebas.
- El motor (`packages/engine`) y la IA (`packages/ai`) no se tocan; `pnpm test:equivalence` debe seguir igual.
- Los umbrales de `pnpm balance` los decide la persona: si un criterio cambia de estado, se mide, se explica y se
  propone, sin tocar umbrales.
- Los agentes no hacen `git commit` ni `git push`. Tras modificar código, `graphify update .`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (otro fichero, sin dependencias pendientes)
- **[Story]**: historia a la que pertenece (US1…US4)

---

## Phase 1: Setup

**Purpose**: partir de una suite en verde y preparar el comando del guion.

- [X] T001 Ejecutar `pnpm typecheck`, `pnpm test` y `pnpm test:equivalence` desde la raíz antes de tocar nada y anotar
  al final de este fichero (sección «Notas de implementación») cualquier fallo previo, para no confundirlo después con
  uno causado por la spec
- [X] T002 En `tools/fixtures/package.json`, añadir el script `"expansiones": "tsx src/expansiones.ts"` y quitar
  `generar-colecciones-prueba`; borrar `tools/fixtures/src/generarColeccionesPrueba.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: esquema, tipos, economía, retirada de las cartas de prueba y catálogo de cosméticos. Al acabar, la suite
pasa **sin expansiones** y la tienda sale sin productos de colección (plan, paso 1).

**⚠️ CRITICAL**: ninguna historia empieza hasta cerrar esta fase.

### Esquema y tipos

- [X] T003 Crear `apps/server/drizzle/0017_spec016.sql` y su entrada en `apps/server/drizzle/meta/_journal.json` (mismo
  formato que `0016_spec013`), con exactamente (data-model §2): `colecciones` + `sobre_regalo text null references
  cosmeticos(id)`; `colecciones` − `check colecciones_precio_ck`; `colecciones_cartas` + `numero integer null` con
  `check (numero is null or numero >= 1)`; `cosmeticos` + `vendible boolean not null default true`. La migración **no
  borra datos**
- [X] T004 [P] Reflejar T003 en el esquema Drizzle: `sobreRegalo` y `numero`, sin el *check* de precio, en
  `apps/server/src/persistencia/esquema/coleccion.ts`; `vendible` en `apps/server/src/persistencia/esquema/cosmeticos.ts`
- [X] T005 [P] En `packages/domain/src/catalogo/tipos.ts`: `Coleccion` gana `sobreRegalo?: string`, `cartas` pasa a
  `{ id, version, numero? }[]` y `precio_centimos` pasa a opcional en la forma JSON (data-model §4)
- [X] T006 En `packages/domain/src/catalogo/validar.ts` (depende de T005), las reglas de data-model §1.3: «una colección
  de pago necesita `precio_fragmentos > 0`»; «`precio_centimos` pasa a ser opcional»; «`numero`: entero ≥ 1, sin repetir
  dentro de la colección. Si una carta lo lleva, todas las de la colección deben llevarlo, y los números van de 1 a N sin
  huecos». **No** validar 24 cartas ni 6 por nivel (FR-032)
- [X] T007 [P] Pruebas de T006 en `packages/domain/tests/catalogo/validar.test.ts`: `numero` repetido, con hueco, mezcla
  con y sin número, pago sin `precio_centimos` válido, y una colección de 40 cartas con otro reparto y otro precio que
  pasa (FR-032). Quitar de este fichero cualquier dependencia de `cartas-prueba.json`
- [X] T008 [P] En `packages/protocol/src/http/tienda.ts`: `CartaExpansion` (`carta`, `numero`, `poseida`,
  `compensacion`), `ProductoColeccion` con `precioCentimos: number | null` y los campos nuevos `cartas`, `compensacion`,
  `sobreRegalo: { id, nombre, poseido } | null`, `icono`, `iconoGrande`, `cartel`; `ResumenCompra.cosmeticos: string[]`
  (contracts/http-api.md). En `packages/protocol/src/http/cosmeticos.ts`: `vendible: boolean` y `regaloDe: string | null`
- [X] T009 [P] Quitar de `packages/protocol/schemas/player-data.schema.json` las referencias a las cartas y colecciones
  de prueba

### Economía (FR-018)

- [X] T010 [P] En `packages/domain/src/economia/parametros.ts`, `desfragmentar = { Superclase: 25, Crack: 75,
  Legendario: 125, GOAT: 175 }`; en `packages/domain/tests/economia/parametros.test.ts`, probar los cuatro valores y que
  el valor esperado de desfragmentar un sobre de la tienda es 510 < 1000 (`validarParametrosEconomia` sigue pasando,
  research R13)
- [X] T011 [P] Actualizar los textos y documentos que citan 25 / 50 / 75 / 100 o «≈ 350» (localizar con
  `git grep -n -i "desfragment" apps/web/src docs`) a 25 / 75 / 125 / 175 y «≈ 500»

### Datos sin cartas de prueba

- [X] T012 Crear `data/expansiones-reales.json` con `{ "version": "1.0.0", "jugadores": [] }`; quitar `all-stars` y
  `top-argentinos` de `data/colecciones.json`; borrar `data/cartas-prueba.json`
- [X] T013 Generar los sobres 25–33 con `pnpm --filter @fbd/fixtures imagenes -- --sobres ../../expansiones/sobres`
  (WebP en `apps/web/public/cosmeticos/sobres/`) y completar `data/cosmeticos.json` (research R14): `"vendible": false`
  en `sobre-1`, `sobre-4`, `sobre-7` y `sobre-28` (conservan el precio); `sobre-25`…`sobre-27` y `sobre-29`…`sobre-33`
  a 250 fragmentos o 50 céntimos; `pack-sobres-2` = `sobre-tinta-y-trama`, `sobre-2`, `sobre-3`, `sobre-25`,
  `sobre-26`; `pack-sobres-3` = `sobre-5`, `sobre-6`, `sobre-8`, `sobre-9`, `sobre-27`; `pack-sobres-7` nuevo =
  `sobre-29`…`sobre-33` a 199 céntimos. Va aquí y no en US3 porque `sobre_regalo` (US1, US2) exige que `sobre-28` exista
  y no sea vendible

### Seed y retirada (FR-009 a FR-012)

- [X] T014 En `apps/server/src/persistencia/seed.ts`, función `retirarColeccionesPrueba(tx)` con el algoritmo exacto de
  data-model §3 (partidas → `cartas_usuario` → `movimientos_fragmentos` → `colecciones_usuario` y `compras` →
  `colecciones`), identificando las cartas por `colecciones_cartas` de `all-stars` y `top-argentinos`, nunca por rango
  de ids; si no queda ninguna de las dos, no hace nada; `saldos_fragmentos` no se toca (FR-011). Llamarla al principio
  de la transacción de `cargarCatalogo`, antes de insertar cartas, y devolver un recuento por paso
- [X] T015 En `apps/server/src/persistencia/seed.ts` (depende de T004, T014): `cargarCatalogo` escribe `numero` y
  `sobre_regalo`; `cargarCosmeticos` escribe `vendible`; `principal()` carga los cosméticos **antes** que el catálogo
  (por la FK de `sobre_regalo`), lee por defecto `core-real.json` + `expansiones-reales.json` (sin `cartas-prueba.json`)
  e imprime el recuento de la retirada
- [X] T016 En `validarCosmeticos` de `apps/server/src/persistencia/seed.ts`, las dos reglas de data-model §1.4: «un pack
  solo contiene cosméticos vendibles»; «cada `sobre_regalo` de `colecciones.json` es un cosmético de tipo `sobre`,
  activo, de pago y no vendible, y no es el regalo de más de una colección»
- [X] T017 Pruebas en `apps/server/tests/unit/seed.test.ts`: retirada en dos pasadas (la primera borra partidas,
  plantillas, posesión, movimientos y compras de prueba; la segunda devuelve 0 en todo y no cambia nada, SC-007), y las
  dos reglas de T016 (pack con no vendible y `sobre_regalo` vendible fallan). Sustituir los usos de las colecciones de
  prueba

### Pruebas que usaban las cartas de prueba (research R16)

Donde una prueba solo necesite «una colección de pago cualquiera», montarla en memoria con cartas del Core.

- [X] T018 [P] Adaptar `apps/server/tests/integration/coleccion.test.ts`
- [X] T019 [P] Adaptar `apps/server/tests/integration/tienda.test.ts`
- [X] T020 [P] Adaptar `apps/server/tests/integration/identidad-cartas.test.ts`
- [X] T021 [P] Adaptar `apps/web/tests/unit/cartasPortada.test.ts` y `apps/web/tests/unit/filtradoColeccion.test.ts`
- [X] T022 [P] Adaptar `packages/domain/tests/catalogo/datos006.test.ts` y `packages/domain/tests/sobres/tienda.test.ts`
- [X] T023 [P] `tools/balance/src/checks/colecciones.ts` lee `data/expansiones-reales.json` en lugar de
  `cartas-prueba.json`
- [X] T024 [P] En `apps/web/tests/e2e/tienda.spec.ts`, quitar el caso que compra `all-stars` o `top-argentinos`; lo
  sustituye el de T056

### Componente compartido

- [X] T025 [P] Crear `apps/web/src/componentes/Fragmentos.tsx` según contracts/ui.md §1: props `cantidad`, `signo?`,
  `tamano?` (16 por defecto, 18 barra, 24 botones grandes); `<img src="/iconos/fragmento-32.webp"
  srcset="/iconos/fragmento-32.webp 1x, /iconos/fragmento-64.webp 2x" alt="" aria-hidden="true">`, cantidad con
  `formatoFragmentos` y `<span class="solo-lector">fragmentos</span>`; icono nunca por debajo de 16 px, alineado a la
  línea base. La imagen la genera T031 (US1); hasta entonces el texto accesible ya funciona
- [X] T026 [P] Prueba `apps/web/tests/unit/fragmentos.test.tsx`: el lector lee «2.400 fragmentos», el icono tiene
  `alt=""` y `aria-hidden`, y `signo` pinta «+175» (FR-031, US4-2)

- [X] T027 Checkpoint: `pnpm db:migrate`, `pnpm seed` dos veces (la segunda informa 0 en la retirada), `pnpm typecheck`,
  `pnpm test` y `pnpm test:equivalence` en verde

**Checkpoint**: base lista. US3 y US4 pueden empezar en paralelo con US1.

---

## Phase 3: User Story 1 - Las cartas de las expansiones existen y se juegan (Priority: P1) 🎯 MVP

**Goal**: 96 cartas reales válidas (95 en `expansiones-reales.json` + Kimmich en el Core), cada una con retrato sin
fondo e ilustración de fondo, y el intercambio Kimmich ↔ Verratti hecho.

**Independent Test**: `pnpm seed` imprime «Cargadas 395 cartas, 5 colecciones…»; `expansiones` termina con todas las
comprobaciones en ✅; cada expansión tiene 24 cartas, 6 por nivel; una partida con una expansión activa usa sus cartas
sin errores (quickstart, recorridos 1–7 y 21–22).

### Tests de US1

- [X] T028 [P] [US1] `tools/fixtures/tests/expansiones.test.ts`: rango y filas desde el nombre de la página
  (`pagina_1A_1_18` → 1..18 en 3 filas; `pagina_1C_1_6` → 1..6 en 1 fila); la inundación desde el borde vuelve
  transparente el verde croma conectado al borde y **conserva** un verde de camiseta que toca el borde de la celda;
  el *despill* deja G ≤ max(R, B) en el borde; un origen con un retrato o un fondo de más o de menos falla sin escribir
  nada (imágenes sintéticas pequeñas creadas con sharp en la prueba)
- [X] T029 [P] [US1] `packages/domain/tests/catalogo/datos016.test.ts` sobre los ficheros reales de `data/`: 4
  expansiones de pago, 24 cartas cada una, 6 por nivel y números 1..24 (SC-001); `precio_fragmentos` 2400 y su
  `sobre_regalo`; Core con 300 cartas, Kimmich (376) dentro con media ≥ 88 y Verratti (299) fuera; Verratti es el
  número 4 de `estrellas-fulgurantes`; `validarCatalogo` sin errores (FR-006)

### Guion `expansiones` (FR-013 a FR-015)

- [X] T030 [P] [US1] Exportar `ID_EN_NOMBRE` en `tools/fixtures/src/fondosCore.ts` (`planificarFondos` ya se exporta)
- [X] T031 [US1] Crear `tools/fixtures/src/expansiones.ts`, parte 1: argumentos `--origen <dir>` y `--solo <A|B|C|D>`;
  lectura de `jugadores_expansionX.json` y `rareza_X.txt`; comprobación del origen de contracts/datos-expansiones.md §2
  (la unión de los rangos de las páginas es 1..N sin solapes, N fondos en `imagen_bg/` o `jugadores_bg/`, ningún
  fichero sobrante o repetido, los dos carteles y `icono/fragmento.png`); si algo falla, lo lista y sale con código ≠ 0
  sin escribir nada
- [X] T032 [US1] `tools/fixtures/src/expansiones.ts`, parte 2, retratos (research R7): rejilla de 6 columnas leída por
  filas con el tamaño de celda sacado de la página; inundación desde el borde con el verde croma muestreado en las
  esquinas; suavizado del alfa y *despill*; recorte al contenido; escala a lo ancho a 139 × 181 anclada arriba; WebP con
  alfa en `apps/web/public/cartas/retratos-propios/<slug>.webp` (slug = nombre de carta sin tildes, en minúsculas y con
  guiones, sin colisión con el Core); tolerancia por carta opcional desde `data/expansiones-ajustes.json` (solo se crea
  si hace falta)
- [X] T033 [US1] `tools/fixtures/src/expansiones.ts`, parte 3 (research R8–R10): fondos con `planificarFondos` e
  `ID_EN_NOMBRE` a 600 × 900, WebP calidad 80, en `apps/web/public/cartas/fondos/jugadores/<id>.webp` con el id de
  research R2 (D-4 Kimmich → `376.webp`; Verratti conserva `299.webp`); `icono_shop_X.png` → `icono-256.webp` e
  `icono-512.webp` con alfa y `cartel_shop_X.png` → `cartel.webp` 768 × 1152 calidad 80, en
  `apps/web/public/expansiones/<id>/`; `icono/fragmento.png` recortado, fondo casi negro a alfa por inundación con
  umbral de luminancia → `apps/web/public/iconos/fragmento-32.webp` y `fragmento-64.webp`
- [X] T034 [US1] `tools/fixtures/src/expansiones.ts`, parte 4: hoja de revisión
  `specs/016-expansiones-reales/revision-retratos.webp` con los 96 retratos sobre magenta y su número
- [X] T035 [US1] `tools/fixtures/src/expansiones.ts`, parte 5, validación siempre (contracts/datos-expansiones.md, las
  5 comprobaciones): `validarLote` sobre `core-real.json` + `expansiones-reales.json` + `colecciones.json`; por
  expansión, números 1..N, `sobre_regalo` presente y, en estas cuatro, 24 cartas y 6 por nivel; Core con 300, Kimmich
  con media ≥ 88, sin Verratti y con el mismo recuento por demarcación y nivel; retrato y fondo en disco para cada carta
  y ningún `.webp` de `retratos-propios/` sin ficha; peso medio retrato + fondo ≤ 1,10 × el del Core (SC-009). Escribe
  `specs/016-expansiones-reales/sumario.md` (tabla por expansión, recuentos, erratas corregidas, pesos y ✅/❌) y sale
  con código ≠ 0 si alguna comprobación falla
- [X] T036 [US1] En `tools/fixtures/src/coreReal.ts`: cambiar «ids 1–N sin huecos» por «300 ids únicos que coinciden con
  la colección `core` de `colecciones.json`»; la regla de retratos usados mira `core-real.json` y
  `expansiones-reales.json`; comprobar que Kimmich (376) tiene media ≥ 88 (research R3, R4)

### Datos (FR-001 a FR-008)

- [X] T037 [US1] En `data/colecciones.json`: `core` con `cartas` = 1–298, 300 y 376; las cuatro expansiones en orden A,
  B, C, D (`remontada-historica` 301–324 → `sobre-7`, `idolos-dorados` 325–348 → `sobre-1`, `saque-ardiente` 349–372
  → `sobre-4`, `estrellas-fulgurantes` 373–396 → `sobre-28`, con Verratti `{ "id": 299, "numero": 4 }` y sin 376), cada
  una con `nombre` visible, `descripcion`, `"tipo": "pago"`, `"precio_fragmentos": 2400`, **sin** `precio_centimos`,
  `sobre_regalo`, `destacadas` y `cartas` como `{ "id", "numero" }` (data-model §1.3)
- [ ] T038 [US1] Generar imágenes: `pnpm --filter @fbd/fixtures expansiones -- --origen ../../expansiones`. **Parar** y
  pedir a la persona que revise `revision-retratos.webp` (SC-002) y que el sobre de cada cartel coincide con su
  `sobre_regalo` (US3-5). Si un retrato sale mal, ajustar su tolerancia en `data/expansiones-ajustes.json` o pedir el
  retrato suelto
- [X] T039 [US1] Lote A: 24 fichas 301–324 en `data/expansiones-reales.json` con el contrato de la 008 (datos personales
  reales contrastados con los enlaces de la lista, historia, seis estadísticas, media en la banda del nivel, virtudes y
  defectos según los del Core del mismo nivel y demarcación; nivel por número: 1–6 GOAT, 7–12 Legendario, 13–18 Crack,
  19–24 Superclase; `imagen` = `/cartas/retratos-propios/<slug>.webp`, `imagen_bg` = `/cartas/fondos/jugadores/<id>.webp`;
  erratas de nombre corregidas). Validar con `pnpm --filter @fbd/fixtures expansiones -- --solo A`
- [X] T040 [US1] Lote B: fichas 325–348 en `data/expansiones-reales.json`, mismos criterios; validar con `--solo B`
- [X] T041 [US1] Lote C: fichas 349–372 en `data/expansiones-reales.json`, mismos criterios; validar con `--solo C`
- [X] T042 [US1] Lote D: fichas 373–396 sin la 376 en `data/expansiones-reales.json`, y mover a este fichero la ficha
  299 (Verratti) de `data/core-real.json` **sin cambiar nada**; validar con `--solo D`
- [X] T043 [US1] Ficha de Joshua Kimmich (376, GOAT, `MED`, media ≥ 88) en `data/core-real.json` con los mismos
  criterios; `pnpm --filter @fbd/fixtures core-real` y `pnpm --filter @fbd/fixtures expansiones` en verde
- [X] T044 [US1] `pnpm seed` («Cargadas 395 cartas, 5 colecciones…») y `pnpm balance`. Si algún criterio de la 015
  cambia de estado, informar a la persona con el valor medido y una propuesta, sin tocar umbrales (research R4)

**Checkpoint**: las 96 cartas existen, se validan y se juegan (quickstart, recorridos 1–7, 21, 22 y 25).

---

## Phase 4: User Story 2 - Ver y comprar una expansión en la tienda (Priority: P1)

**Goal**: la sección «Expansiones» con tarjeta y modal de detalle, compra con fragmentos, compensación por cartas ya
poseídas y sobre de regalo, todo en una transacción.

**Independent Test**: un usuario con 2400 fragmentos y 1 GOAT, 2 Crack y 3 Superclase de una expansión la compra y
acaba con saldo − 2400 + 400, 18 cartas nuevas y el sobre de regalo (quickstart, recorridos 8–14, 17, 18, 23 y 24).

**Depende de**: US1 (datos) y T025 (`Fragmentos`).

### Tests de US2

- [X] T045 [P] [US2] En `apps/server/tests/integration/tienda.test.ts`: compra con 0, 6 y 24 cartas poseídas con
  `saldo = saldoInicial − precioFragmentos + fragmentos` (SC-004), el caso US2-4 (175 + 2 × 75 + 3 × 25 = 400), mismo
  `idCompra` dos veces → mismo `ResumenCompra` y un solo cobro, otro `idCompra` → 409 `COLECCION_ADQUIRIDA`, saldo
  insuficiente → 422 `SALDO_INSUFICIENTE` con `detalles: { saldo, precio, faltan }`, `all-stars` → 404
  `PRODUCTO_NO_ENCONTRADO`, sobre de regalo entregado y en `cosmeticos`, sobre ya poseído conservado sin error (US3-4);
  `GET /api/tienda` con `cartas` ordenadas por `numero`, `compensacion`, `sobreRegalo`, `icono`, `iconoGrande`, `cartel`
  y `precioCentimos: null`, y un cuerpo como mucho 25 KB mayor que antes
- [X] T046 [P] [US2] En `apps/server/tests/integration/coleccion.test.ts`: desfragmentar Verratti (299) da 175; Kimmich
  (376) da 422 `CARTA_CORE`; una Superclase, un Crack y un Legendario de expansión dan 25, 75 y 125 (FR-018, FR-007)
- [X] T047 [P] [US2] `apps/web/tests/unit/detalleExpansion.test.tsx`: el modal tiene el nombre como título, el cartel,
  la lista agrupada por nivel en orden de `numero`, «Tienes» y la compensación en las poseídas, el pie con la compra;
  el foco entra en el título, `Esc` cierra y el foco vuelve a «Ver detalle»; la tarjeta con `adquirida` muestra el sello
  «Adquirida» y sin saldo dice «Te faltan … fragmentos»

### Servidor

- [X] T048 [US2] En `apps/server/src/persistencia/repos/catalogo.ts`, exponer el `numero` de cada carta en cada colección
  y el `sobre_regalo` de cada colección (data-model §4)
- [X] T049 [US2] En `apps/server/src/economia/servicio.ts`, ampliar `productoColeccion` con `cartas` (cada una con la
  identidad de la cuenta, `numero`, `poseida` y `compensacion = valorDesfragmentar(nivel)` si poseída, 0 si no),
  `compensacion` total, `sobreRegalo { id, nombre, poseido }`, `icono` `/expansiones/<id>/icono-256.webp`, `iconoGrande`
  `/expansiones/<id>/icono-512.webp`, `cartel` `/expansiones/<id>/cartel.webp` y `precioCentimos` `null` si no hay
  precio en euros; cambiar `ProductoSobre.motivoNoDisponible` a «Ya tienes casi todas las cartas de las expansiones:
  quedan menos de 8 por conseguir»
- [X] T050 [US2] En `comprarColeccion` de `apps/server/src/economia/servicio.ts`, dentro de la misma transacción:
  `insert into cosmeticos_usuario … on conflict do nothing` con el `sobre_regalo`, `cosmeticos: [sobre_regalo]` en el
  resultado guardado y en `ResumenCompra` (vacío si no hay regalo); ajustar el mapeo en
  `apps/server/src/http/tienda.ts` si hace falta (research R12)

### Interfaz

- [X] T051 [P] [US2] Crear `apps/web/src/componentes/TarjetaExpansion.tsx` según contracts/ui.md §2: tarjeta apaisada
  W ≈ 2,5 H; nombre arriba a la izquierda en ≈ 54 % W, es el texto más grande, y pasa a dos líneas antes que meterse
  bajo el icono; descripción debajo («24 jugadores · 6 GOAT · … · Regala el sobre 7», más «Tienes 3 de 24 · te
  devolvemos [◆] 225» o «Ya tienes todas: recibirás [◆] 2.400 y el sobre»); fila inferior `grid-template-columns: 1fr
  1fr` con altura común: «Comprar» + `Fragmentos` (primario) y «Ver detalle» + lupa detrás (`boton secundario`,
  `aria-label="Ver detalle de <nombre>"`); estados «Adquirida» (mismo tamaño, sin acción) y «Te faltan [◆] N»; icono de
  tienda `alt=""` cuadrado ≈ 0,94 H por delante, borde izquierdo ≈ 60 % W, asomando ≈ 1/3 por arriba y ≈ 5 % W por la
  derecha, acabando encima de los botones; a 360 px icono ≈ 40 % W y botones apilados si no caben, con el mismo tamaño
- [X] T052 [P] [US2] Crear `apps/web/src/componentes/DetalleExpansion.tsx` con `Dialogo` según contracts/ui.md §2
  (modal): título el nombre; escritorio cartel 2:3 a la izquierda y lista a la derecha con desplazamiento interno solo
  en la lista; móvil cartel arriba (máx. 40 vh); filas con número, `CartaResumen`, nombre de carta y demarcación,
  agrupadas por nivel, «Tienes» + `<Fragmentos signo>`; pie siempre visible con «Te devolvemos [◆] N por M cartas ·
  Regala «<sobre>»» y el botón de compra, que cierra el modal y abre la confirmación
- [X] T053 [US2] En `apps/web/src/pantallas/Tienda.tsx` (depende de T051, T052): sección y filtro «Expansiones» con la
  descripción «Jugadores reales para tu colección, siempre con fragmentos»; las tarjetas en 2 columnas desde 1024 px,
  con `margin-top` ≈ 0,3 H y sitio a la derecha para que el icono no pise la tarjeta vecina ni el título (Principio XI);
  sobre de cartas «…de las expansiones»; invitado «…comprar sobres, expansiones y cosméticos»; abrir y cerrar el modal
  devolviendo el foco
- [X] T054 [P] [US2] En `apps/web/src/componentes/ConfirmacionCompra.tsx`: título «Expansión adquirida»; total devuelto
  con `Fragmentos`; bloque «Sobre de regalo» con `SobreArte` y su nombre, o «Ya tenías este sobre» (FR-023,
  contracts/ui.md §3)
- [X] T055 [P] [US2] Revisar `git grep -n -i "colecci" apps/web/src` y cambiar a «expansión/expansiones» solo los
  textos visibles que hablan de colecciones **de pago** (contracts/ui.md §5); «Mi colección» y el filtro de la
  colección («Core» y el nombre de cada expansión) no cambian
- [X] T056 [US2] Caso e2e en `apps/web/tests/e2e/tienda.spec.ts`: abrir «Ver detalle» de una expansión, comprar desde
  el modal, ver la confirmación con las cartas y el sobre, y volver a la tienda con la tarjeta «Adquirida»

**Checkpoint**: las expansiones se ven y se compran; US1 + US2 son el MVP vendible.

---

## Phase 5: User Story 3 - Sobres de regalo y ocho diseños nuevos a la venta (Priority: P2)

**Goal**: los sobres 1, 4, 7 y 28 solo se consiguen con su expansión; los 25–27 y 29–33 se venden; todos los packs
tienen 5 sobres vendibles. Los datos ya están desde T013; aquí van el servidor y la interfaz.

**Independent Test**: `GET /api/cosmeticos` y la tienda de cosméticos no ofrecen 1, 4, 7 ni 28 y sí los ocho nuevos;
comprar `sobre-28` suelto da 422; los packs 2, 3 y 7 tienen su composición (quickstart, recorridos 15 y 16).

### Tests de US3

- [X] T057 [P] [US3] En `apps/server/tests/integration/cosmeticos.test.ts`: `GET /api/cosmeticos` con `vendible` y
  `regaloDe` (`sobre-28` → `estrellas-fulgurantes`); comprar `sobre-28` → 422 `COSMETICO_NO_VENDIBLE` «Este sobre solo se
  consigue con su expansión»; si ya se posee, 409 `COSMETICO_POSEIDO` tiene prioridad; los packs tienen 5 sobres y
  ninguno no vendible (SC-006)

### Implementación de US3

- [X] T058 [P] [US3] En `apps/server/src/http/cosmeticos.ts`: devolver `vendible` y `regaloDe` (id de la colección
  cuyo `sobre_regalo` es ese cosmético, `null` si es vendible)
- [X] T059 [US3] En `comprarCosmetico` de `apps/server/src/economia/servicio.ts`: tras la comprobación de poseído,
  rechazar los no vendibles con 422 `COSMETICO_NO_VENDIBLE` y el mensaje «Este sobre solo se consigue con su expansión»
- [X] T060 [P] [US3] En `apps/web/src/componentes/TiendaCosmeticos.tsx`: ocultar los `vendible: false` de la venta
  suelta; los packs muestran su composición y aparece el pack 7
- [X] T061 [P] [US3] En `apps/web/src/componentes/SelectorSobre.tsx`: el sobre no vendible y no poseído sale bloqueado
  con «Se consigue con la expansión <nombre>» (contracts/ui.md §4)

**Checkpoint**: sobres de regalo y nuevos sobres funcionan por separado de las expansiones.

---

## Phase 6: User Story 4 - Nuevo icono del fragmento en toda la interfaz (Priority: P3)

**Goal**: toda cantidad de fragmentos se pinta con `Fragmentos` (T025), con el icono nuevo (T033) y el texto accesible.

**Independent Test**: recorrer barra, tienda, confirmaciones, colección, perfil, crear partida y campeón en los dos
temas; `git grep -n 'nombre="cristal"' apps/web/src` no devuelve nada (quickstart, recorridos 19 y 20).

- [X] T062 [P] [US4] `apps/web/src/app/Marco.tsx`: saldo con `<Fragmentos tamano={18}>`, conservando el
  `aria-label` «Fragmentos: N»
- [X] T063 [P] [US4] `apps/web/src/pantallas/Tienda.tsx`: todos los botones y precios en fragmentos con `Fragmentos`
  (tras T053)
- [X] T064 [P] [US4] `apps/web/src/componentes/DialogoPagoPrueba.tsx` y `apps/web/src/componentes/ConfirmacionCompra.tsx`
  (tras T054)
- [X] T065 [P] [US4] `apps/web/src/componentes/TiendaCosmeticos.tsx` (tras T060)
- [X] T066 [P] [US4] `apps/web/src/componentes/FichaCartaColeccion.tsx` (desfragmentar) y el historial de movimientos en
  `apps/web/src/pantallas/Coleccion.tsx`
- [X] T067 [P] [US4] `apps/web/src/pantallas/Perfil.tsx`, `apps/web/src/pantallas/CrearPartida.tsx` (nivel de rareza) y
  `apps/web/src/pantallas/PantallaCampeon.tsx` (recompensa)
- [X] T068 [US4] Quitar el icono `cristal` de `apps/web/src/componentes/Icono.tsx` si ya no lo usa nadie y comprobar con
  `git grep -n -i "fragmentos" apps/web/src` que no queda ninguna cantidad pintada sin `Fragmentos` (SC-008)

**Checkpoint**: el fragmento tiene icono propio en toda la interfaz.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T069 Suite completa desde la raíz: `pnpm typecheck`, `pnpm test`, `pnpm test:equivalence` (sin cambios),
  `pnpm balance` y `pnpm e2e`
- [ ] T070 Pedir a la persona los recorridos a mano de [quickstart.md](quickstart.md) §2 (1–25), en especial el 2
  (retratos), el 3 (10 fichas al azar), el 23 (360 px y 1366 × 768) y el 24 (cronometrado, SC-005)
- [ ] T071 [P] Copiar las cuatro `jugadores_expansionX.json` y los `rareza_X.txt` a
  `specs/016-expansiones-reales/fuentes/`; borrar `./expansiones/` solo cuando la persona dé por buenas las imágenes
- [X] T072 [P] Actualizar `CLAUDE.md` (spec en curso, `data/expansiones-reales.json` en los datos del catálogo, comando
  `pnpm --filter @fbd/fixtures expansiones`, sin `cartas-prueba.json`), `docs/despliegue.md` (sin cartas de prueba) y
  `ROADMAP.md` (estado de la 016 y la nota de economía: un sobre de la tienda devuelve 510 de 1000)
- [X] T073 `graphify update .`

---

## Phase 8: Ronda 2 (revisión de la persona, 2026-11-19)

**Propósito**: ajustes pedidos tras probar la tienda de expansiones, más cuatro arreglos de la 2D que no son de esta spec.

- [X] T074 [US2] Sonido `cajaRegistradora` al comprar una expansión (`apps/web/src/pantallas/Tienda.tsx`) y su fila en
  [docs/juego/sonidos.md](../../docs/juego/sonidos.md)
- [X] T075 [US2] «Ver detalle»: cada jugador es un botón que abre su carta completa (`CartaJugador`) en la vista previa
  de la tienda (`Previsualizacion`, exportada de `TiendaCosmeticos.tsx`), en un portal al `body` para no anidar modales;
  `Esc` cierra solo la carta y el foco vuelve a la fila (`DetalleExpansion.tsx`, `coleccion.css`)
- [X] T076 [US3] «Regala «Sobre 7»» pasa a «De regalo» con el sobre en pequeño (`-mini.webp`); al pulsarlo se amplía,
  cerrado y abierto (`ArteGrande`), en la tarjeta y en el pie del detalle (`RegaloExpansion` en `TarjetaExpansion.tsx`);
  `descripcionExpansion` ya no lleva el regalo
- [X] T077 [P] Pruebas: `detalleExpansion.test.ts` (filas como botones, «De regalo», miniatura) y el e2e de la tienda
  (abrir y cerrar la carta, ampliar el sobre)
- [X] T078 [P] 2D, indicador de energía: el porcentaje en una línea (`white-space: nowrap`) y la cara debajo, centrados
  sobre el círculo de posición y apoyados justo encima de él (`translate(-50%, -100%)`); la penalización, encima del
  porcentaje (`base.css`)
- [X] T079 2D, energía también en «Gestionar equipo» con el balón en juego: cada `partido.tramo` 2D lleva la energía con
  que acaba (`registrarTramo`, esquema `EnergiaEnCampoSchema` compartido con `partido.pausa_decision`); el cliente usa la
  de la pausa si la hay y, si no, la del último tramo ya visto (`Partido2D.tsx`). E2e en `gestion-equipo.spec.ts`
- [X] T080 Aviso de parada con el icono del lance: balón en un gol, cruz roja en una lesión, tarjeta roja en una
  expulsión (`iconosParada` en `textoParada.ts`; `aviso` de `GestionEquipo` pasa a `{ texto, iconos }`), con su prueba
  unitaria
- [ ] T081 Nueva curva de fatiga (30' a 85 %, +10 % en el descanso, desde el 55') — **aplazada** a la próxima versión
  del motor: cambia `packages/engine`, que esta spec no toca. Apuntada en [ROADMAP.md](../../ROADMAP.md) (INI-05)

**Notas de la ronda 2**:

- La amarilla no para el partido (las paradas de «control total» son por lesión o expulsión), y una doble amarilla llega
  como expulsión: el aviso enseña la tarjeta roja.
- El peso de cada tramo 2D crece en la lista de energías de los jugadores en el campo (≈ 1 KB sin comprimir); la rápida
  no la lleva.
- `pnpm test` (144 ficheros) en verde; e2e de tienda, control total y gestión de equipo en verde; integración de 2D,
  gestión y visibilidad en verde (`gestion-equipo.test.ts` falló una vez en la rápida, que no cambia, y pasa al repetir).

---

## Dependencies & Execution Order

### Fases

- **Setup (1)** → **Foundational (2)** → historias.
- **US1 (3)**: tras la fase 2.
- **US2 (4)**: servidor (T048–T050) tras la fase 2 y T037; interfaz (T051–T056) tras US1 completa (necesita cartas,
  imágenes y carteles).
- **US3 (5)**: tras la fase 2; no depende de US1 ni de US2.
- **US4 (6)**: tras la fase 2 y T033 (icono generado). T063–T065 van después de las tareas de US2 y US3 que tocan el
  mismo fichero.
- **Polish (7)**: tras todas las historias.

### Dentro de cada historia

- Tests primero; deben fallar antes de implementar.
- `expansiones.ts` (T031–T035) es un solo fichero: partes en orden.
- `data/expansiones-reales.json` (T039–T042) y `seed.ts` (T014–T016) son un solo fichero cada uno: tareas en orden.
- T038 es una parada: la persona revisa las imágenes antes de los lotes de fichas.

### Oportunidades en paralelo

- Fase 2: T004, T005, T008, T009, T010, T011 a la vez; luego T018–T026 a la vez.
- Tras la fase 2: US1, US3 y US4 (T062, T066, T067) en paralelo.
- US2: T045, T046 y T047 a la vez; T051, T052, T054 y T055 a la vez.

## Parallel Example: User Story 2

```bash
# Tests a la vez:
Task: "T045 tienda.test.ts: SC-004 con 0, 6 y 24 poseídas, idempotencia, 409, 422, 404 y sobre de regalo"
Task: "T046 coleccion.test.ts: desfragmentar Verratti 175 y Kimmich 422 CARTA_CORE"
Task: "T047 detalleExpansion.test.tsx: modal, foco y estados de la tarjeta"

# Componentes a la vez:
Task: "T051 TarjetaExpansion.tsx"
Task: "T052 DetalleExpansion.tsx"
Task: "T054 ConfirmacionCompra.tsx"
```

## Implementation Strategy

### MVP (US1 + US2)

1. Fases 1 y 2: la suite pasa sin cartas de prueba.
2. US1: guion, revisión de imágenes por la persona, fichas en cuatro lotes, Kimmich ↔ Verratti, `pnpm balance`.
3. US2: servidor, tarjeta, modal y confirmación. **Parar y validar**: las expansiones se compran.

US1 sola se puede comprobar (cartas en el draft y en la colección), pero no tiene valor de negocio sin la tienda.

### Incremental

- US3 y US4 se pueden entregar antes o después del MVP; cada una se valida por su recorrido del quickstart.
- Cada lote de fichas (T039–T042) se valida con el guion antes del siguiente, para no acumular errores.

## Notas de implementación

- **T001**: `pnpm typecheck` y `pnpm test` en verde antes de empezar (140 ficheros, 1388 pruebas). La primera pasada de
  `pnpm test:integration` no vale como referencia: corrió mientras se borraba `cartas-prueba.json`.
- **Recuento**: el catálogo queda en **396 cartas**, no 395. Las cuatro expansiones suman 96 cartas (95 jugadores
  nuevos y Verratti) y Kimmich entra en el Core, así que `expansiones-reales.json` tiene 96 fichas (Verratti incluido)
  y `pnpm seed` dice «Cargadas 396 cartas, 5 colecciones…». La spec y el plan decían 95 / 395.
- **Selecciones nuevas**: AUT, CRI, ISL, KOR, PER, PRY y XKX (Kosovo, sin código ISO oficial), con sus banderas de
  `flag-icons` (MIT, la misma fuente que las demás), en `SELECCIONES`, en el esquema y en `public/banderas/`.
- **Esquema de jugadores**: `jugadores` admite una lista vacía (fase 2: `expansiones-reales.json` empezó vacío).
- **Retratos**: celdas de W/6 × H/3 en todas las páginas (las de 1 o 2 filas dejan el resto vacío). Algunas filas pasan
  un poco del tercio y la celda de abajo se llevaba una tira de la camiseta de arriba: se queda solo la mayor mancha.
  Sin ajustes por carta (`data/expansiones-ajustes.json` no hizo falta). El retrato de cada carta se escribe en la ruta
  de su ficha (`imagen`, slug del nombre conocido, como en el Core), así que las fichas se escribieron antes de generar.
- **T013**: el guion `imagenes` numeró los sobres nuevos con `orden` 1–9 y sale con código 1 por su comprobación de
  peso (compara todo lo publicado con los originales de esa tanda). Se corrigió el orden a 31–39 a mano; los pesos
  (≈ 90 + 21 KB por sobre) son como los de los demás.
- **T014/T017**: la retirada en dos pasadas se prueba en `apps/server/tests/integration/retirada-prueba.test.ts` (necesita
  PostgreSQL); en `tests/unit/seed.test.ts` quedan las reglas de los cosméticos. En la BD de desarrollo, la primera pasada
  borró 2420 partidas, 6267 cartas de usuario, 166 movimientos, 27 colecciones de usuario, 96 compras y 2 colecciones; la
  segunda, 0 (copia previa en el directorio temporal de la sesión).
- **Pruebas sin datos de expansiones (R16)**: `montarColeccionPago` (tests/helpers/economia.ts) monta colecciones de pago
  con copias de cartas del Core (ids 9001+). Las pruebas que daban por hecho que el Core son los ids 1–300 usan ahora la
  pertenencia a `core` (Kimmich es la 376). La regresión G4 del generador se graba con el Core de antes (Verratti).
- **Peso de `GET /api/tienda`**: ≈ 11,7 KB más por expansión sin comprimir (≈ 47 KB las cuatro); la respuesta va
  comprimida y el aumento comprimido queda por debajo de 25 KB, que es lo que se comprueba.
- **`regaloDe`** de `GET /api/cosmeticos` es `{ id, nombre }` y no solo el id: el selector de sobres dice «Se consigue con
  la expansión <nombre>» sin otra petición.
- **Interfaz**: «Te faltan» es un botón desactivado con lo que falta y una pista para lectores; no hay una sección de
  «cómo conseguir fragmentos». A 1366 × 768, las cuatro tarjetas no caben enteras junto a la cabecera de la tienda: hay
  que desplazarse para ver la segunda fila (recorrido 23).
- **T038**: imágenes generadas y comprobadas (las 5 comprobaciones en ✅); falta que la persona revise
  `revision-retratos.webp` y los carteles.
- **T044**: `pnpm balance` con el catálogo nuevo: 76 de 76 comprobaciones superadas (9528 s), las mismas que en la 015;
  ningún criterio cambia de estado.
- **T069**: `pnpm test` en verde tras grabar las huellas de draft de las specs 014 y 015 con el Core de antes (como G4;
  fallaban los 5 drafts con Verratti o Kimmich). `pnpm e2e`: 121 pruebas; el botón «100 fragmentos: desbloquear» de
  Crear partida lleva `aria-label` (el icono partía su nombre accesible), y `draft-varios` falló una vez por tiempo y pasa
  al repetirla.
- **T071**: listas y rarezas copiadas en `fuentes/`; `./expansiones/` sigue en su sitio hasta que la persona lo apruebe.
