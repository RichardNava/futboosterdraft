---

description: "Lista de tareas de la spec 006: colecciones, fragmentos y tienda"
---

# Tasks: Preparación de la base de datos de las cartas, colecciones, fragmentos y tienda

**Input**: documentos de diseño en `specs/006-preparacion-bd-cartas/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: se incluyen. El plan («Testing») y la constitución (Principio IX) las exigen: Vitest de dominio e
integración, Playwright (`coleccion.spec.ts`, `tienda.spec.ts`) y la comprobación `colecciones` de `tools/balance`.

**Organization**: tareas agrupadas por historia de usuario para implementarlas y probarlas por separado.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (ficheros distintos, sin dependencias pendientes)
- **[Story]**: historia a la que pertenece (US1 … US7)
- Convenciones del proyecto: **pnpm** siempre, **sin tildes en el código** (solo en textos de interfaz), los agentes
  **no** hacen `git commit` ni `git push`, y tras modificar código se ejecuta `graphify update .`.

---

## Phase 1: Setup (infraestructura compartida)

**Purpose**: partir de una base verde y con las herramientas de prueba disponibles.

- [ ] T001 Comprobar la línea base en la raíz del monorepo con `pnpm typecheck && pnpm lint && pnpm test` y anotar en la respuesta cualquier fallo previo (no se corrige aquí)
- [ ] T002 [P] Comprobar que `fast-check` está en `devDependencies` de `packages/domain/package.json`; si falta, añadirlo con `pnpm --filter @fbd/domain add -D fast-check`

---

## Phase 2: Foundational (prerrequisitos bloqueantes)

**Purpose**: «Orden de entrega» punto 1 del plan. Datos y catálogo en colecciones, migración `0011`, seed, pool por
pertenencia y piezas del servidor que comparten US1, US2, US3, US4, US5 y US7. Al terminar, las partidas existentes
siguen funcionando con Core.

**⚠️ CRITICAL**: ninguna historia empieza antes de terminar esta fase.

### Dominio: selecciones, tipos y validación

- [ ] T003 [P] Crear `packages/domain/src/catalogo/selecciones.ts` con `SELECCIONES: Record<CodigoSeleccion, { nombre: string }>` (códigos ISO 3166-1 alfa-3 de las nacionalidades actuales de `data/core.json` más `ARG` si falta, más `ENG`, `SCO`, `WAL` y `NIR`; **sin `GBR`**), el tipo `CodigoSeleccion` y `esSeleccion(codigo)`; exportarlo en `packages/domain/src/index.ts` (R6)
- [ ] T004 Actualizar `packages/domain/src/catalogo/tipos.ts`: `Jugador` pierde `coleccion` y gana `nombre_carta`, `imagen` e `imagen_bg`; nuevos `VersionCarta = 'normal'`, `VERSIONES_CARTA = ['normal']`, `TipoColeccion = 'basica' | 'pago'` y `Coleccion { id, nombre, descripcion, tipo, precioCentimos?, destacadas?, cartas: { id, version }[] }` (data-model §2)
- [ ] T005 Actualizar `validarJugador` en `packages/domain/src/catalogo/validar.ts`: eliminar `COLECCIONES_VALIDAS` y la regla de `coleccion`; `nacionalidad` debe cumplir `esSeleccion` (`GBR` no es válido); `nombre_carta` «texto no vacío, ≤ 24 caracteres»; `imagen` e `imagen_bg` obligatorias, «ruta que empieza por `/cartas/`» y con el patrón `^/cartas/[a-z0-9/_-]+\.(svg|png|webp|jpg)$` (data-model §1.1, contracts/datos-cartas.md)
- [ ] T006 Añadir `validarCatalogo(cartas, colecciones)` en `packages/domain/src/catalogo/validar.ts` con las reglas de data-model §1.2: «`id` de colección único, en formato kebab-case sin tildes»; «exactamente una colección `basica`, con `id` `core`, que cumple `DISTRIBUCION_CORE` exacta»; «colecciones de `pago` con `precio_centimos > 0`»; «cada carta referenciada existe y aparece una sola vez por colección»; «`version` ∈ `VERSIONES_CARTA`»; «toda carta pertenece al menos a una colección»; «`destacadas` ⊆ `cartas`»; normalizar cada entrada `id` a `{ id, version: 'normal' }` (R3)
- [ ] T007 Actualizar `packages/domain/tests/catalogo/validar.test.ts`: casos de rechazo de cada regla de T005 y T006 (carta con `coleccion`, sin `imagen`, sin `imagen_bg`, `nombre_carta` vacío o de 25 caracteres, `GBR`, colección con carta inexistente, carta huérfana, dos `basica`, pago sin precio, `destacadas` fuera de `cartas`) y un caso válido mínimo
- [ ] T008 Crear `packages/domain/src/coleccion/minimo.ts` con `comprobarMinimoActivo(activas, cambio)`: recibe el recuento de activas por demarcación × nivel (reutilizar `recuentoPorDemarcacionYNivel`) y la carta que se retira, y devuelve `{ ok: true }` o `{ ok: false, demarcacion, nivel, minimo, activas }` comparando con `DISTRIBUCION_CORE`; añadir `estadoMinimo(activas)` que devuelve `EstadoMinimo { cumple, incumplidas[] }`; exportar en `packages/domain/src/index.ts` (R11)
- [ ] T009 [P] Crear `packages/domain/src/economia/parametros.ts` con `PARAMETROS_ECONOMIA` exactamente como en R9 (`recompensaTorneo: 10`, `desfragmentar { Superclase: 25, Epico: 50, Legendario: 75, GOAT: 100 }`, `precioSobreFragmentos: 1000`, `precioSobreCentimos: 99`, paquetes `fragmentos-1000`/`5500`/`12000` a 99/499/999 céntimos), `valorDesfragmentar(nivel)`, `valorEsperadoSobre(p, parametrosEquilibrado)` (cupos del sobre y `sobres.probGoatEnAlta`) y `validarParametrosEconomia` que rechaza `precioSobreFragmentos ≤ valorEsperadoSobre`; exportar en `packages/domain/src/index.ts`
- [ ] T010 [P] Crear `packages/domain/tests/economia/parametros.test.ts`: `valorEsperadoSobre` de los parámetros vigentes = 355, `validarParametrosEconomia(PARAMETROS_ECONOMIA)` pasa y un precio de 355 se rechaza (FR-024)

### Esquemas del protocolo

- [ ] T011 [P] Actualizar `packages/protocol/schemas/player-data.schema.json`: raíz `{ version, jugadores }` sin `coleccion`; carta con `additionalProperties: false`, sin `coleccion`, con `nombre_carta` (`minLength: 1`, `maxLength: 24`), `imagen` e `imagen_bg` con `pattern: "^/cartas/[a-z0-9/_-]+\\.(svg|png|webp|jpg)$"` y `nacionalidad` como enumeración de los códigos de `SELECCIONES`
- [ ] T012 [P] Crear `packages/protocol/schemas/colecciones.schema.json` con `{ version, colecciones: [{ id, nombre, descripcion, tipo, precio_centimos?, destacadas?, cartas }] }`; `cartas` admite `integer` o `{ id, version }` con `version` en `["normal"]`; `tipo: 'basica'` sin `precio_centimos` y `tipo: 'pago'` lo exige (`if/then`)
- [ ] T013 [P] Crear `packages/domain/tests/catalogo/selecciones.test.ts` que compare la enumeración `nacionalidad` de `player-data.schema.json` con las claves de `SELECCIONES` (igual que la prueba existente de los rasgos) y compruebe que `GBR` no está

### Datos

- [ ] T014 Crear `tools/fixtures/src/migrarCartas006.ts` (R4) y ejecutarlo una vez para reescribir `data/core.json`: quita la clave raíz `coleccion` y el campo `coleccion` de cada carta; `nombre_carta` = nombre + primer apellido; las 19 cartas `GBR` se reparten con semilla fija entre `ENG`/`SCO`/`WAL`/`NIR` en proporción 10/4/3/2 y se reescribe `"(GBR)"` en `historia`; `imagen` = `/cartas/siluetas/{por|def|med|del}.svg` e `imagen_bg` = `/cartas/fondos/{por|def|med|del}.svg` según `demarcacion`; exportar la tabla `id → código` resultante para la migración SQL (T019); añadir el script en `tools/fixtures/package.json`
- [ ] T015 Ajustar `tools/fixtures/src/generarCore.ts` para que no emita `coleccion`, emita `nombre_carta`, `imagen` e `imagen_bg`, y exporte el generador de jugadores reutilizable por T016
- [ ] T016 Crear `tools/fixtures/src/generarColeccionesPrueba.ts` (R5) con semilla fija que escribe `data/cartas-prueba.json` (75 cartas ficticias, `id` 301–375, mismo formato que Core) y `data/colecciones.json`: `core` (`tipo: basica`, las 300 de Core), `all-stars` (45: 3 de Core + `id` 301–342, `precio_centimos: 499`) y `top-argentinos` (42: 3 de Core `ARG` + 6 de *All Stars* + `id` 343–375 `ARG`, `precio_centimos: 399`); las cartas nuevas cubren cada demarcación × nivel con ≥ 2 cartas; con `destacadas`; añadir el script en `tools/fixtures/package.json`
- [ ] T017 Crear `packages/domain/tests/catalogo/datos006.test.ts`: los tres ficheros de `data/` pasan `validarJugador` y `validarCatalogo`; `core` tiene 300 cartas con `DISTRIBUCION_CORE`, `all-stars` 45 y `top-argentinos` 42; comparten ≥ 5 cartas entre sí y cada una ≥ 3 con Core; ninguna carta tiene `GBR`; las cartas 301–375 cubren cada demarcación × nivel con ≥ 2 (FR-005, FR-006)
- [ ] T018 Actualizar los fixtures que construyen `Jugador` en `packages/domain/tests/fixtures/` y `tools/balance/src/equipos.ts` (y cualquier otro que falle en `pnpm typecheck`) con los campos nuevos y sin `coleccion`

### Base de datos

- [ ] T019 Crear `apps/server/drizzle/0011_colecciones.sql` (y su entrada en `apps/server/drizzle/meta/`) según data-model §3: en `jugadores` añadir `nombre_carta`, `imagen`, `imagen_bg` `text not null` rellenados como en R4 y quitar los `default`, reasignar `GBR` con la tabla `id → código` de T014, eliminar `coleccion` y `jugadores_coleccion_idx`; en `partidas` añadir `pool_cartas integer[]` (admite `null`) y `update … set colecciones = array['core']`; crear `colecciones`, `colecciones_cartas`, `cartas_usuario`, `colecciones_usuario`, `saldos_fragmentos`, `movimientos_fragmentos` y `compras` con **todos** los `check`, claves, índices y `on delete cascade` de data-model §3.2 (en particular `check (saldo >= 0)`, `check (importe <> 0)`, `pk (usuario_id, jugador_id)` en `cartas_usuario`, `pk (usuario_id, coleccion_id)` en `colecciones_usuario` y el índice único parcial `(usuario_id, motivo, referencia) where motivo = 'recompensa_torneo'`)
- [ ] T020 Crear `apps/server/src/persistencia/esquema/coleccion.ts` con las siete tablas en Drizzle, idénticas a T019; actualizar `jugadores` y `partidas` en `apps/server/src/persistencia/esquema/base.ts` / `torneo.ts` (donde estén definidas) y exportar en `apps/server/src/persistencia/esquema/index.ts`
- [ ] T021 Crear `apps/server/tests/integration/migracion-0011.test.ts` (patrón de `migracion-0010.test.ts` y `tests/helpers/migraciones.ts`): una base en 0010 con cartas `GBR` y partidas `'Core'` migra a 0011 con `nombre_carta`/`imagen`/`imagen_bg` rellenos, sin `GBR`, `colecciones = {core}`, `pool_cartas` nulo y las tablas nuevas vacías; `saldo` negativo y `importe = 0` son rechazados por los `check`

### Seed y catálogo del servidor

- [ ] T022 Actualizar `apps/server/src/persistencia/seed.ts`: lee por defecto `data/core.json`, `data/cartas-prueba.json` y `data/colecciones.json`; admite `--file` repetido y `--colecciones`; valida con los esquemas de T011/T012, `validarJugador` y `validarCatalogo`, y rechaza **todo** el lote ante un solo error; hace upsert de `jugadores` (con los campos nuevos), `colecciones` (con `orden`) y `colecciones_cartas` en una transacción; informa del recuento por demarcación × nivel de cada colección (contracts/datos-cartas.md)
- [ ] T023 Actualizar `apps/server/tests/unit/seed.test.ts`: el seed por defecto carga 375 cartas y 3 colecciones; un fichero con `coleccion` o con una carta huérfana rechaza el lote entero
- [ ] T024 Actualizar `apps/server/src/persistencia/repos/catalogo.ts`: `cargar()` lee también `colecciones_cartas`; `pool(colecciones)` filtra por pertenencia en lugar de `jugador.coleccion`; nuevos `coleccionesDe(jugadorId): string[]`, `esCore(jugadorId)` y `poolPartida(partida)` (`pool_cartas` si existe; si no, `pool(partida.colecciones)`); `resumen` rellena `nombreCarta`, `nacionalidad`, `imagen` e `imagenBg` (R12)
- [ ] T025 Sustituir el valor de colección `'Core'` por `'core'` en el código del servidor y de las herramientas (`apps/server/src/http/partidas.ts`, `apps/server/src/persistencia/repos/partidas.ts`, `tools/balance/src/`, helpers de `apps/server/tests/helpers/`); localizar los usos con `graphify query` y después grep
- [ ] T026 Ampliar `JugadorResumen` en `packages/protocol/src/ws/draft.ts` con `nombreCarta`, `nacionalidad`, `imagen` e `imagenBg`, y actualizar los datos de muestra de `apps/web/src/textos/cartasMuestra.ts` y los fixtures web/servidor que fallen en `pnpm typecheck`
- [ ] T027 Actualizar `apps/server/src/http/catalogo.ts`: `GET /api/catalogo/jugadores` y `/:id` quitan `coleccion` y añaden `nombreCarta`, `imagen`, `imagenBg` y `colecciones: string[]`; ajustar `apps/server/tests/contract/` si alguna prueba lo cubre

### Piezas comunes del servidor (colección y economía)

- [ ] T028 [P] Crear los tipos HTTP en `packages/protocol/src/http/coleccion.ts` (`CartaResumen`, `CartaPoseida`, `EstadoMinimo`, respuestas de `GET/PUT /api/coleccion`, desfragmentar y movimientos) y `packages/protocol/src/http/tienda.ts` (`ResumenCompra`, `ProductoColeccion`, `ProductoSobre`, `ProductoFragmentos`, cuerpos de compra) exactamente como en contracts/http-api.md «Tipos» y «Tienda»; exportarlos en `packages/protocol/src/index.ts`
- [ ] T029 [P] Crear el `preHandler` `requiereRegistrado` en `apps/server/src/auth/requiereRegistrado.ts` usando `usuarioDeLaPeticion`: sin sesión `401 SIN_SESION`, invitado (`es_invitado = true`) `403 SOLO_REGISTRADOS`, con el formato de `apps/server/src/http/errores.ts`
- [ ] T030 Crear `apps/server/src/economia/servicio.ts` con la clase `ServicioEconomia` (recibe `db` y `Catalogo`), un ayudante de transacción y `asegurarColeccion(usuarioId)`: inserta las cartas de `colecciones_cartas` con `coleccion_id = 'core'` que falten en `cartas_usuario` con `via = 'registro'` y la fila de `saldos_fragmentos` con 0, ambas con `on conflict do nothing` (R8); registrarlo en `apps/server/src/servidor.ts` y en `ServiciosPartida` (`apps/server/src/actores/servicios.ts`)
- [ ] T031 Añadir a `apps/server/tests/helpers/` un ayudante para fijar el saldo de un usuario y otro para crear un usuario registrado con colección asegurada, reutilizando `tests/helpers/usuarios.ts`

**Checkpoint**: `pnpm typecheck && pnpm test && pnpm test:integration` en verde; `pnpm db:migrate && pnpm seed` carga 375 cartas y 3 colecciones; una partida de invitado se juega con Core como antes.

---

## Phase 3: User Story 1 - Consultar mi colección (Priority: P1) 🎯 MVP

**Goal**: un usuario registrado abre «Colección» y explora sus 300 cartas Core con tamaños, paginador, buscador,
ordenación, filtros y ficha ampliada.

**Independent Test**: con una cuenta recién registrada, abrir «Colección», ver las 300 cartas Core, cambiar el
tamaño, buscar «valotal», ordenar por nacionalidad y abrir la ficha de una carta (quickstart A–D).

### Tests for User Story 1

- [ ] T032 [P] [US1] Crear `apps/server/tests/integration/coleccion.test.ts` con los casos de `GET /api/coleccion`: sin sesión `401 SIN_SESION`, invitado `403 SOLO_REGISTRADOS`, usuario nuevo recibe 300 `CartaPoseida` activas con `via = 'registro'`, `esCore = true`, `valorFragmentos = null`, `colecciones` incluye `core`, `minimo.cumple = true` y `saldo = 0`; dos llamadas seguidas no duplican filas
- [ ] T033 [P] [US1] Crear `apps/web/tests/unit/filtradoColeccion.test.ts` para las funciones de T036: búsqueda sin mayúsculas ni tildes sobre `nombreCarta`, `nombre` y `apellidos`; ordenación por cada criterio y sentido sobre la lista entera; filtros por estado, nivel, demarcación y colección; recálculo de página que mantiene visible la primera carta al cambiar el tamaño
- [ ] T034 [P] [US1] Crear `apps/web/tests/e2e/coleccion.spec.ts` (US1): el enlace «Colección» aparece en la barra y en el inicio solo para registrados; `/coleccion` sin sesión lleva al diálogo de inicio de sesión; 300 cartas; buscar «valotal»; ordenar por nacionalidad descendente; última página; recargar conserva tamaño y orden; la ficha se abre y se cierra con Escape

### Implementation for User Story 1

- [ ] T035 [US1] Añadir `leerColeccion(usuarioId)` a `apps/server/src/economia/servicio.ts`: une `cartas_usuario` con el catálogo y devuelve `CartaPoseida[]` (con `colecciones`, `esCore`, `valorFragmentos` con `valorDesfragmentar` o `null` si es Core, e `historia`), la lista `{ id, nombre, tipo }` de colecciones, `estadoMinimo` de las activas y el saldo
- [ ] T036 [P] [US1] Crear `apps/web/src/pantallas/coleccion/filtrado.ts` con funciones puras: `normalizar` (`normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()`), `filtrarCartas`, `ordenarCartas` (nombre por `nombreCarta`, nacionalidad, colección, nivel, demarcación, media; asc/desc), `paginar` y `paginaQueContiene(indice, porPagina)` (R15)
- [ ] T037 [US1] Crear `apps/server/src/http/coleccion.ts` con `GET /api/coleccion` (preHandler `requiereRegistrado`, llama a `asegurarColeccion` y a `leerColeccion`) y registrarlo en `apps/server/src/http/app.ts`
- [ ] T038 [P] [US1] Añadir las llamadas de colección al cliente en `apps/web/src/api/` siguiendo el patrón existente de `api` (`obtenerColeccion()`)
- [ ] T039 [US1] Crear el envoltorio `ConSesionRegistrada` (en `apps/web/src/app/Rutas.tsx` o un componente junto a él): sin sesión redirige al inicio con el diálogo de iniciar sesión o registrarse abierto; invitado ve la invitación a registrarse; añadir la ruta `/coleccion`
- [ ] T040 [P] [US1] Añadir el enlace «Colección» en `apps/web/src/componentes/BarraPrincipal.tsx` y la tarjeta de acceso en `apps/web/src/pantallas/Inicio.tsx`, solo si `usuario` existe y no es invitado (FR-034)
- [ ] T041 [US1] Crear `apps/web/src/pantallas/Coleccion.tsx`: cabecera con cartas poseídas, activas y saldo; barra con buscador (y botón de borrar), ordenación con sentido, filtros (estado, nivel, demarcación, colección) y control segmentado de tamaño pequeño/mediano/grande; cuadrícula con columnas según `ResizeObserver` y filas fijas por tamaño; paginador «Primera», «Anterior», «Página X de Y», «Siguiente», «Última»; estado vacío «No hay cartas que coincidan» con «Borrar búsqueda»; preferencias en `localStorage['fbd.coleccion.<usuarioId>']` con `try/catch`; tokens de `docs/diseno/DESIGN.md` y 360 px de ancho (contracts/ui.md)
- [ ] T042 [US1] Crear `apps/web/src/componentes/FichaCartaColeccion.tsx` dentro de `Dialogo`: carta ampliada, historia, colecciones como chips, estadísticas, virtudes y defectos; se cierra con botón, Escape o pulsando fuera; abrirla al pulsar una carta en `Coleccion.tsx`

**Checkpoint**: US1 funcional y comprobable por sí sola (quickstart A–D).

---

## Phase 4: User Story 2 - Elegir qué cartas uso al jugar (Priority: P1)

**Goal**: activar y desactivar cartas respetando el mínimo, y que los torneos usen la foto de la colección activa del
anfitrión.

**Independent Test**: desactivar cartas sobrantes, crear un torneo como anfitrión y comprobar que ninguna inactiva sale
en los sobres; intentar bajar del mínimo y ver la explicación (quickstart E y M).

### Tests for User Story 2

- [ ] T043 [P] [US2] Crear `packages/domain/tests/coleccion/minimo.test.ts` con fast-check: secuencias aleatorias de desactivaciones y desfragmentaciones aplicadas solo si `comprobarMinimoActivo` da `ok` nunca dejan una combinación por debajo de `DISTRIBUCION_CORE`, y un rechazo informa de `demarcacion`, `nivel`, `minimo` y `activas` correctos (SC-004)
- [ ] T044 [P] [US2] Añadir a `apps/server/tests/integration/coleccion.test.ts` los casos de `PUT /api/coleccion/cartas/:id`: con solo Core, desactivar da `422 MINIMO_ACTIVO` con `detalles { demarcacion, nivel, minimo, activas }`; con cartas de sobra se desactiva y se reactiva; el mismo valor dos veces devuelve `200` sin cambios; carta no poseída `404 CARTA_NO_POSEIDA`; dos desactivaciones simultáneas de la última carta sobrante solo aplican una
- [ ] T045 [P] [US2] Crear `apps/server/tests/integration/pool-anfitrion.test.ts`: un registrado con cartas desactivadas crea una partida y `pool_cartas` guarda solo sus activas; ninguna carta inactiva aparece en la mesa al iniciar el draft; reactivar cartas después no cambia `pool_cartas`; un invitado crea una partida con `pool_cartas = null` y juega con Core

### Implementation for User Story 2

- [ ] T046 [US2] Añadir `cambiarActiva(usuarioId, jugadorId, activa)` a `apps/server/src/economia/servicio.ts`: en una transacción, `select … for update` de las cartas del usuario; si `activa = false`, aplica `comprobarMinimoActivo` y lanza `MINIMO_ACTIVO` con sus datos; actualiza y devuelve la carta y `estadoMinimo` (data-model §4.2)
- [ ] T047 [US2] Añadir `PUT /api/coleccion/cartas/:id` con cuerpo `{ activa: boolean }` validado en `apps/server/src/http/coleccion.ts`
- [ ] T048 [US2] En `POST /api/partidas` (`apps/server/src/http/partidas.ts`) y `apps/server/src/persistencia/repos/partidas.ts`: si el anfitrión es registrado, `asegurarColeccion` y guardar en `pool_cartas` los `id` de sus cartas activas; si no cumple el mínimo, `422 MINIMO_ACTIVO`; si es invitado, `pool_cartas = null` (FR-014, FR-015)
- [ ] T049 [US2] Cambiar `iniciarDraft` en `apps/server/src/actores/draft.ts` para usar `catalogo.poolPartida(partida)`; `generarMesa` no cambia (R12, FR-016)
- [ ] T050 [P] [US2] Añadir `cambiarActiva()` al cliente en `apps/web/src/api/`
- [ ] T051 [US2] En `apps/web/src/pantallas/Coleccion.tsx` y `apps/web/src/componentes/FichaCartaColeccion.tsx`: interruptor «Activa» (`role="switch"`) fuera del cuerpo de la carta; si desactivarla incumpliría el mínimo (comprobado en el cliente con `comprobarMinimoActivo`), `aria-disabled` y `title` con «Mínimo de DEF Épico: N; tienes N activas», y aviso con el mismo texto si se pulsa; cartas inactivas atenuadas con la etiqueta «Inactiva»; la respuesta del servidor manda (FR-040, FR-013)
- [ ] T052 [US2] Añadir a la cabecera de `apps/web/src/pantallas/Coleccion.tsx` el indicador del mínimo: «Cumple el mínimo» o «Faltan N cartas activas en DEF Épico» (FR-041)
- [ ] T053 [US2] Añadir a `apps/web/tests/e2e/coleccion.spec.ts` el caso de intentar desactivar una carta con solo Core y ver la explicación del mínimo

**Checkpoint**: US1 y US2 funcionan juntas; los torneos de registrados usan su colección activa.

---

## Phase 5: User Story 3 - Ganar y gastar fragmentos (Priority: P1)

**Goal**: saldo visible, recompensa de 10 por torneo ganado, desfragmentar cartas no Core e historial de movimientos.

**Independent Test**: ganar un torneo contra la IA (+10), desfragmentar una Épica no Core (+50) y comprobar que una
carta Core no se puede desfragmentar (quickstart F, L y O).

### Tests for User Story 3

- [ ] T054 [P] [US3] Crear `apps/server/tests/integration/recompensa.test.ts`: un registrado que gana un torneo contra la IA recibe un movimiento `recompensa_torneo` de 10 con referencia `partida_id` y saldo 10; llamar dos veces a `recompensarTorneo` o recargar la vista no duplica; un invitado campeón no recibe nada; una partida cancelada no recompensa; la vista del torneo devuelve `recompensaFragmentos` 10 para el campeón y `null` para el resto
- [ ] T055 [P] [US3] Añadir a `apps/server/tests/integration/coleccion.test.ts` los casos de `POST /api/coleccion/cartas/:id/desfragmentar`: carta Core `422 CARTA_CORE`; carta no Core (insertada con el helper) suma 25/50/75/100 según nivel, desaparece y registra `desfragmentacion`; un reintento da `404 CARTA_NO_POSEIDA` sin sumar; una activa que rompería el mínimo da `422 MINIMO_ACTIVO`; `GET /api/fragmentos/movimientos` lista del más reciente al más antiguo con `descripcion` y pagina con `antes` y `limite`

### Implementation for User Story 3

- [ ] T056 [US3] Añadir a `apps/server/src/economia/servicio.ts`: `desfragmentar(usuarioId, jugadorId)` (bloqueo de filas; rechaza Core con `CARTA_CORE`; aplica el mínimo si está activa; `delete … returning`, si no hay fila `CARTA_NO_POSEIDA`; suma al saldo e inserta el movimiento `desfragmentacion` con referencia `jugadorId`), `recompensarTorneo(usuarioId, partidaId, cantidad)` (insert del movimiento con `on conflict do nothing`; solo si se insertó, suma al saldo) y `movimientos(usuarioId, antes, limite)`; saldo y movimiento siempre en la misma transacción (R10)
- [ ] T057 [US3] Añadir en `apps/server/src/http/coleccion.ts` `POST /api/coleccion/cartas/:id/desfragmentar` y `GET /api/fragmentos/movimientos?antes=<iso>&limite=50` (con `descripcion` legible por motivo)
- [ ] T058 [US3] En `terminarTorneo` (`apps/server/src/actores/torneo.ts`), tras marcar la partida `terminada`, si el campeón es un participante `humano` con usuario no invitado, llamar a `servicioEconomia.recompensarTorneo(usuarioId, partidaId, PARAMETROS_ECONOMIA.recompensaTorneo)` (R14)
- [ ] T059 [US3] Añadir `recompensaFragmentos: number | null` a la vista del torneo para el participante que consulta, leída del movimiento guardado: `packages/protocol/src/ws/torneo.ts`, `apps/server/src/actores/vistas.ts` y `apps/server/src/http/torneo.ts`
- [ ] T060 [P] [US3] Añadir `desfragmentar()` y `obtenerMovimientos()` al cliente en `apps/web/src/api/`
- [ ] T061 [US3] En `apps/web/src/componentes/FichaCartaColeccion.tsx`: botón «Desfragmentar (+N)» solo si `!esCore`; si es Core, el texto «Las cartas de Core no se pueden desfragmentar»; confirmación con `Dialogo` «Recibirás N fragmentos. Esta acción no se puede deshacer» con «Cancelar» y «Desfragmentar»; al confirmar, quitar la carta y actualizar saldo y mínimo (FR-022)
- [ ] T062 [US3] En `apps/web/src/pantallas/Coleccion.tsx`: el saldo de la cabecera abre un `Dialogo` con el historial de movimientos (fecha, motivo, importe) y «Cargar más» con `antes` (FR-018)
- [ ] T063 [US3] En `apps/web/src/pantallas/PantallaCampeon.tsx`: registrado con `recompensaFragmentos` muestra «+10 fragmentos» con enlace a «Colección»; invitado ve «Regístrate para ganar fragmentos con tus victorias»

**Checkpoint**: el bucle de progresión jugando funciona sin dinero real.

---

## Phase 6: User Story 4 - Comprar un sobre en la tienda (Priority: P2)

**Goal**: comprar un sobre de 8 cartas no poseídas con fragmentos o pago simulado, con apertura animada, de forma
idempotente.

**Independent Test**: con 1.000 fragmentos, comprar un sobre, ver la apertura y recibir 8 cartas nuevas, activas y con
los cupos del draft (quickstart H e I).

### Tests for User Story 4

- [ ] T064 [P] [US4] Crear `packages/domain/tests/sobres/tienda.test.ts`: `generarSobreTienda` da 8 cartas distintas, todas de `disponibles`, con los cupos del draft cuando hay de todo; sustitución mismo nivel → nivel inferior → superior cuando se agota una combinación; `ErrorPoolInsuficiente` con menos de 8; misma semilla, mismas cartas
- [ ] T065 [P] [US4] Crear `apps/server/tests/integration/tienda.test.ts` (sobre): con 1.000 de saldo, `POST /api/tienda/sobre/comprar` con `moneda: 'fragmentos'` descuenta 1.000, entrega 8 cartas activas (`via = 'sobre'`) no poseídas y movimiento `compra_sobre` negativo; saldo insuficiente `422 SALDO_INSUFICIENTE` con `{ saldo, precio, faltan }`; `moneda: 'eur'` entrega sin cargo y `simulada = true`; 50 repeticiones del mismo `idCompra` (secuenciales y concurrentes) cobran y entregan una vez (SC-007); dos `idCompra` distintos simultáneos con saldo para uno solo: uno falla y el saldo no es negativo; `idCompra` reutilizado con otra moneda `409 ID_COMPRA_REUTILIZADO`; cuerpo sin UUID `400 CUERPO_INVALIDO`; con menos de 8 restantes `409 SOBRE_NO_DISPONIBLE` y `GET /api/tienda` marca `disponible: false`

### Implementation for User Story 4

- [ ] T066 [P] [US4] Crear `packages/domain/src/sobres/tienda.ts` con `generarSobreTienda(disponibles, semilla, parametros)`: reutiliza `generarSobre` para el plan de cupos y cubre cada casilla con la combinación pedida, si no con el mismo nivel y otra demarcación, si no con el nivel inmediatamente inferior y, si no hay, con el superior; lanza `ErrorPoolInsuficiente` si `disponibles.length < 8`; exportar en `packages/domain/src/index.ts` (R13)
- [ ] T067 [US4] Añadir a `apps/server/src/economia/servicio.ts` `comprarSobre(usuarioId, moneda, idCompra)` según data-model §4.2: compra existente → su resultado (o `ID_COMPRA_REUTILIZADO` si cambia producto o moneda); `disponibles` = cartas de colecciones de `pago` no poseídas; < 8 → `SOBRE_NO_DISPONIBLE`; con fragmentos, cargo condicional `update … set saldo = saldo - $precio where … and saldo >= $precio returning saldo` (sin fila → `SALDO_INSUFICIENTE`) y movimiento `compra_sobre`; semilla con `derivarSemilla` de `idCompra`; insertar cartas (`via = 'sobre'`) y la compra con `resultado`; todo en una transacción; el `insert` de `compras` por `id` resuelve las carreras (R10)
- [ ] T068 [US4] Crear `apps/server/src/http/tienda.ts` con `GET /api/tienda` (`saldo` y `sobre: ProductoSobre` con `disponible`, `motivoNoDisponible` y `faltan`; `colecciones` y `paquetes` vacíos hasta US5/US7) y `POST /api/tienda/sobre/comprar` (cuerpo `{ idCompra: uuid, moneda: 'eur' | 'fragmentos' }` validado); preHandler `requiereRegistrado` y `asegurarColeccion`; registrarlo en `apps/server/src/http/app.ts`
- [ ] T069 [P] [US4] Añadir `obtenerTienda()` y `comprarSobre()` al cliente en `apps/web/src/api/`
- [ ] T070 [P] [US4] Crear `apps/web/src/componentes/DialogoPagoPrueba.tsx` sobre `Dialogo`: resumen del producto, precio con `Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })`, cinta visible «PAGO DE PRUEBA — no se cobra nada», «Confirmar compra» y «Cancelar», sin campos de tarjeta; genera el `idCompra` (`crypto.randomUUID()`) al abrirse; deshabilita el botón durante la petición y ofrece «Reintentar» con el mismo `idCompra` si falla la conexión (FR-031)
- [ ] T071 [US4] Crear `apps/web/src/pantallas/Tienda.tsx` con cabecera (saldo y enlace a «Colección») y el producto sobre: `SobreArte`, precios en fragmentos y euros, botón de fragmentos deshabilitado con «Te faltan N» si no hay saldo, producto no disponible con su motivo; la compra con fragmentos también genera y conserva un `idCompra` por intento; añadir la ruta `/tienda` con `ConSesionRegistrada` en `apps/web/src/app/Rutas.tsx`
- [ ] T072 [US4] Tras comprar un sobre, en `apps/web/src/pantallas/Tienda.tsx`: `AperturaSobre` del draft, después la cuadrícula de 8 cartas con el conmutador «Revelar una a una / Todas», botón «Saltar» y `prefers-reduced-motion` (resultado directo); termina con «Ver en mi colección» y «Seguir comprando» (FR-030, R16)
- [ ] T073 [P] [US4] Añadir el enlace «Tienda» en `apps/web/src/componentes/BarraPrincipal.tsx` (solo registrados) y el botón «Tienda» en la cabecera de `apps/web/src/pantallas/Coleccion.tsx` (FR-025, FR-041)
- [ ] T074 [US4] Crear `apps/web/tests/e2e/tienda.spec.ts` (sobre): con saldo preparado por API o helper, comprar un sobre con fragmentos desde «Colección» → «Tienda», ver la apertura, revelar las 8 cartas y encontrarlas en «Colección»; el saldo baja 1.000; la cinta de pago de prueba aparece al pagar en euros

**Checkpoint**: el sobre se compra de punta a punta y es idempotente.

---

## Phase 7: User Story 5 - Comprar una colección en la tienda (Priority: P2)

**Goal**: comprar *All Stars* o *Top Argentinos* una sola vez, recibiendo las cartas que faltan y fragmentos por las
repetidas.

**Independent Test**: con alguna carta de *Top Argentinos* ya poseída, comprarla y comprobar cartas recibidas, activas,
y fragmentos por duplicados; la tarjeta queda «Adquirida» (quickstart J y K).

### Tests for User Story 5

- [ ] T075 [P] [US5] Añadir a `apps/server/tests/integration/tienda.test.ts` (colecciones): comprar `top-argentinos` con 3 cartas ya poseídas (Superclase, Épica, GOAT) entrega el resto activas (`via = 'coleccion'`) y 175 fragmentos en movimientos `duplicado`; repetir el `idCompra` devuelve el mismo `ResumenCompra`; otro `idCompra` `409 COLECCION_ADQUIRIDA`; `core` o id inexistente `404 PRODUCTO_NO_ENCONTRADO`; comprar después `all-stars` da fragmentos por las 6 compartidas; `GET /api/tienda` devuelve `adquirida`, `poseidas`, `porNivel`, `muestra` y `soloFragmentos`; tras una serie aleatoria de compras, desfragmentaciones y recompensas, `sum(importe) = saldo` (SC-006)
- [ ] T076 [P] [US5] Añadir a `apps/server/tests/unit/seed.test.ts` (o a un test de integración) el caso de data-model §4.3: re-sembrar con una carta añadida a una colección ya comprada la entrega activa al comprador, o un movimiento `duplicado` si ya la tenía

### Implementation for User Story 5

- [ ] T077 [US5] Añadir a `apps/server/src/economia/servicio.ts` `comprarColeccion(usuarioId, coleccionId, idCompra)` según data-model §4.2: compra existente → su resultado; colección `basica` o inexistente → `PRODUCTO_NO_ENCONTRADO`; `colecciones_usuario` existente → `COLECCION_ADQUIRIDA`; si no, inserta la compra (`moneda: 'eur'`, `simulada: true`), la fila de `colecciones_usuario`, las cartas que faltan (activas, `via = 'coleccion'`) y un movimiento `duplicado` con `valorDesfragmentar(nivel)` por cada carta ya poseída, sumando al saldo; todo en una transacción
- [ ] T078 [US5] Añadir a `apps/server/src/economia/servicio.ts` el cálculo de `ProductoColeccion` (`numCartas`, `porNivel`, `muestra` desde `destacadas` o las 3 de mayor nivel y media, `poseidas`, `adquirida`, `soloFragmentos` si ya se tienen todas) y completarlo en `GET /api/tienda`; añadir `POST /api/tienda/colecciones/:id/comprar` en `apps/server/src/http/tienda.ts`
- [ ] T079 [US5] Implementar en `apps/server/src/persistencia/seed.ts` la entrega de data-model §4.3: comparar pertenencia anterior y nueva de cada colección de pago en la misma transacción y, por cada comprador, insertar las cartas añadidas que no posea (activas, `via = 'coleccion'`) o registrar un movimiento `duplicado`; informar de las entregas
- [ ] T080 [P] [US5] Añadir `comprarColeccion()` al cliente en `apps/web/src/api/`
- [ ] T081 [US5] En `apps/web/src/pantallas/Tienda.tsx`: una tarjeta por colección con nombre, descripción, precio, número de cartas, reparto por nivel, muestra de 3 cartas y «Tienes X de N»; bloqueada con el sello «Adquirida» y sin botón si ya se compró; aviso «Solo recibirías N fragmentos» si se tienen todas; compra con `DialogoPagoPrueba` (FR-027)
- [ ] T082 [US5] Crear `apps/web/src/componentes/ConfirmacionCompra.tsx`: animación de unos 1,2 s con `Trofeo` o el sello «Adquirida» (transform y opacity con la Web Animations API), botón «Saltar» y `prefers-reduced-motion`; después, resumen con las cartas recibidas y la lista de duplicados con sus fragmentos y el total; usarla en `apps/web/src/pantallas/Tienda.tsx` (FR-028a)
- [ ] T083 [US5] Añadir a `apps/web/tests/e2e/tienda.spec.ts` la compra de *Top Argentinos*: confirmación, resumen y tarjeta «Adquirida» al volver

**Checkpoint**: las dos vías de monetización (sobre y colección) funcionan.

---

## Phase 8: User Story 6 - Cartas con bandera, escudo e imagen de fondo (Priority: P2)

**Goal**: todas las cartas muestran bandera, escudo, imagen superior y fondo de acción por demarcación, con
alternativas sin iconos rotos.

**Independent Test**: en `/_pruebas/cartas` y en «Colección», una carta de cada demarcación muestra bandera, escudo y
fondo correcto, y una GOAT su imagen propia (quickstart N).

> Independiente de US1–US5: puede empezar justo después de la Fase 2 (plan, «Orden de entrega» punto 2).

### Implementation for User Story 6

- [ ] T084 [P] [US6] Crear `apps/web/public/cartas/siluetas/{por,def,med,del}.svg` exportando la figura actual de `apps/web/src/componentes/SiluetaJugador.tsx` a un solo color, con el emblema como hueco (`fill-rule="evenodd"`) (R7)
- [ ] T085 [P] [US6] Crear `apps/web/public/cartas/fondos/{por,def,med,del}.svg`: siluetas vectoriales planas de un color, con la misma línea gráfica, para parada (POR), entrada o despeje (DEF), pase (MED) y disparo (DEL), sin derechos de terceros (FR-046)
- [ ] T086 [P] [US6] Copiar en `apps/web/public/banderas/{CODIGO}.svg` las banderas de `flag-icons` (MIT) de todos los códigos de `SELECCIONES` (con `gb-eng`, `gb-sct`, `gb-wls` y `gb-nir` renombradas a `ENG`, `SCO`, `WAL`, `NIR`), sin añadir la dependencia, y dejar la licencia en `apps/web/public/banderas/LICENSE`
- [ ] T087 [P] [US6] **Tarea manual**: obtener los escudos oficiales en `apps/web/public/escudos/{CODIGO}.svg` (o `.png`) para los códigos de `SELECCIONES`; registrar en `docs/despliegue.md` el riesgo abierto de licencia que bloquea producción (FR-044)
- [ ] T088 [P] [US6] Crear `apps/web/src/textos/selecciones.ts` con `ESCUDOS_ACTIVOS`, `rutaBandera(codigo)`, `rutaEscudo(codigo)` (`null` si `ESCUDOS_ACTIVOS` es `false`) y `nombreSeleccion(codigo)` desde `SELECCIONES` (R6)
- [ ] T089 [US6] Actualizar `apps/web/src/componentes/CartaJugador.tsx`: bajo la media y la demarcación, bandera (con `alt` = nombre de la selección) y escudo (`alt=""`) en un bloque de unos 16 px, solo bandera en la variante `compacta` y en el tamaño pequeño; `imagen` y fondo `imagen_bg` pintados como máscara CSS con `currentColor` si son `.svg` y con `<img>` si no; fondo con `opacity: 0.25` y `pointer-events: none`; `nombreCarta` grande y en negrita con `nombre apellidos` debajo en pequeño, y solo `nombreCarta` con `NombreRecortado` en `compacta`; `aria-label` con el nombre de la selección (contracts/ui.md)
- [ ] T090 [US6] Alternativas en `apps/web/src/componentes/CartaJugador.tsx` (FR-048): bandera que no carga → código del país en texto pequeño; escudo que no carga → se oculta; `<img>` propia que falla → ruta genérica de su demarcación; máscara propia que falla → sin fondo
- [ ] T091 [US6] Revisar las vistas compactas y listas que muestran el nombre (`CartaMesa.tsx`, `VistaCarta.tsx` y las que use `graphify query "nombre jugador compacto"`) para que usen `nombreCarta` (FR-047b); eliminar `apps/web/src/componentes/SiluetaJugador.tsx` si ya no tiene usos
- [ ] T092 [US6] Actualizar `apps/web/src/pantallas/PruebasCartas.tsx` y `apps/web/src/textos/cartasMuestra.ts` para mostrar una carta de cada demarcación y una GOAT con `imagenBg` propia (una imagen de prueba en `apps/web/public/cartas/propias/`) (SC-009)
- [ ] T093 [US6] Ampliar `apps/web/tests/e2e/cartas.spec.ts`: en `/_pruebas/cartas`, cada carta muestra bandera y fondo sin imágenes rotas (ninguna `<img>` con `naturalWidth = 0` visible), la GOAT muestra su imagen propia y la variante compacta no muestra escudo

**Checkpoint**: las cartas tienen su identidad visual en todas las pantallas.

---

## Phase 9: User Story 7 - Comprar fragmentos con dinero real (Priority: P3)

**Goal**: comprar paquetes de fragmentos con el pago simulado.

**Independent Test**: comprar el paquete de 1.000 fragmentos y ver el saldo +1.000 y el movimiento `compra_fragmentos`
en el historial (quickstart G).

- [ ] T094 [P] [US7] Añadir a `apps/server/tests/integration/tienda.test.ts` (paquetes): `POST /api/tienda/fragmentos/fragmentos-1000/comprar` suma 1.000, registra `compra_fragmentos` y `simulada = true`; el mismo `idCompra` no suma dos veces; paquete inexistente `404 PRODUCTO_NO_ENCONTRADO`
- [ ] T095 [US7] Añadir `comprarFragmentos(usuarioId, paqueteId, idCompra)` a `apps/server/src/economia/servicio.ts` (compra existente → su resultado; si no, suma al saldo, movimiento `compra_fragmentos` y compra con `cartas: []`, en una transacción), los `paquetes` de `PARAMETROS_ECONOMIA` en `GET /api/tienda` y `POST /api/tienda/fragmentos/:paquete/comprar` en `apps/server/src/http/tienda.ts`
- [ ] T096 [US7] Añadir `comprarFragmentos()` en `apps/web/src/api/` y en `apps/web/src/pantallas/Tienda.tsx` una tarjeta por paquete (cantidad y precio) que compra con `DialogoPagoPrueba` y actualiza el saldo
- [ ] T097 [US7] Añadir a `apps/web/tests/e2e/tienda.spec.ts` la compra del paquete de 1.000 con la cinta «PAGO DE PRUEBA» visible

**Checkpoint**: las cuatro vías de obtención de fragmentos funcionan.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [ ] T098 [P] Crear `tools/balance/src/checks/colecciones.ts` (R17) y registrarlo en `tools/balance/src/cli.ts` (`--solo colecciones`): SC-003 con 100 mesas sobre pools de colecciones activas aleatorias que cumplen el mínimo (ninguna carta fuera del pool, todos los sobres con sus cupos) y SC-005 con 1.000 sobres de tienda sobre colecciones poseídas aleatorias (sin repetidas, sin poseídas, reparto de niveles del draft); ambos con «Cumple» en el informe
- [ ] T099 [P] Actualizar `.specify/memory/constitution.md` (R18): mover «Colecciones adicionales a "Core"» de «Decisiones aún pendientes» a «Decisiones resueltas» con la referencia a `specs/006-preparacion-bd-cartas/`, y subir la versión PATCH (1.1.1, o 1.2.1 si ya se aplicó la 1.2.0) (FR-008)
- [ ] T100 [P] Actualizar la documentación afectada: formato de datos y comando `pnpm seed` en `docs/` (donde se describa el catálogo), y `CLAUDE.md` si cambia la spec en curso o alguna convención
- [ ] T101 Ejecutar `pnpm typecheck && pnpm lint && pnpm --filter @fbd/web lint:tokens && pnpm test && pnpm test:integration && pnpm e2e -- coleccion tienda cartas` y corregir lo que falle
- [ ] T102 Ejecutar `pnpm balance -- --solo colecciones` y comprobar SC-003 y SC-005 con «Cumple»
- [ ] T103 Recorrer los escenarios manuales A–O de `specs/006-preparacion-bd-cartas/quickstart.md`, incluido el ancho de 360 px en «Colección» y «Tienda» (FR-042), y anotar los resultados
- [ ] T104 Ejecutar `graphify update .` en la raíz del repositorio

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Fase 1)**: sin dependencias.
- **Foundational (Fase 2)**: depende de Setup y **bloquea todas las historias**. Orden interno: T003–T006 → T011–T013 y T014–T016 → T017–T018 → T019–T021 → T022–T027 → T028–T031.
- **US1 (Fase 3)**: tras la Fase 2.
- **US2 (Fase 4)**: tras US1 (amplía `Coleccion.tsx`, `FichaCartaColeccion.tsx` y `http/coleccion.ts`).
- **US3 (Fase 5)**: tras US1 (ficha y cabecera); el servidor (T056–T059) puede empezar tras la Fase 2.
- **US4 (Fase 6)**: tras la Fase 2; la parte web enlaza desde `Coleccion.tsx` (US1). Las pruebas con fragmentos usan el helper de saldo (T031), no US3 ni US7.
- **US5 (Fase 7)**: tras US4 (reutiliza `Tienda.tsx`, `http/tienda.ts` y `DialogoPagoPrueba`).
- **US6 (Fase 8)**: solo tras la Fase 2; independiente del resto.
- **US7 (Fase 9)**: tras US4 (`Tienda.tsx` y `DialogoPagoPrueba`).
- **Polish (Fase 10)**: tras las historias que se vayan a entregar; T098 solo necesita T008 y T066.

### Grafo de historias

```text
Fase 2 ──┬─▶ US1 ──┬─▶ US2
         │         └─▶ US3
         ├─▶ US4 ──┬─▶ US5
         │         └─▶ US7
         └─▶ US6
```

### Dentro de cada historia

- Las pruebas se escriben primero y deben fallar antes de implementar.
- Dominio → servicio → HTTP → cliente API → pantallas → e2e.

### Parallel Opportunities

- Fase 2: T003, T009/T010, T011, T012 y T013 en paralelo; T028 y T029 en paralelo.
- US6 entera en paralelo con US1–US5 (otra persona o agente).
- Dentro de cada historia, las tareas [P] de pruebas y de cliente API.

---

## Parallel Example: User Story 1

```text
T032 [US1] apps/server/tests/integration/coleccion.test.ts
T033 [US1] apps/web/tests/unit/filtradoColeccion.test.ts
T034 [US1] apps/web/tests/e2e/coleccion.spec.ts
T036 [US1] apps/web/src/pantallas/coleccion/filtrado.ts
T038 [US1] apps/web/src/api/ (obtenerColeccion)
T040 [US1] BarraPrincipal.tsx + Inicio.tsx
```

## Parallel Example: User Story 4

```text
T064 [US4] packages/domain/tests/sobres/tienda.test.ts
T065 [US4] apps/server/tests/integration/tienda.test.ts
T066 [US4] packages/domain/src/sobres/tienda.ts
T070 [US4] apps/web/src/componentes/DialogoPagoPrueba.tsx
```

## Parallel Example: User Story 6

```text
T084 siluetas · T085 fondos · T086 banderas · T087 escudos (manual) · T088 textos/selecciones.ts
```

---

## Implementation Strategy

### MVP First (Fase 2 + US1)

1. Fase 1 y Fase 2: catálogo en colecciones, migración `0011`, seed y pool por pertenencia.
2. Fase 3 (US1): «Colección» de solo lectura.
3. **Parar y validar** con quickstart A–D.

### Entrega incremental (plan, «Orden de entrega»)

1. Fase 2 → partidas existentes intactas con Core.
2. US6 (presentación de la carta), en paralelo si hay capacidad.
3. US1 + US2 → la colección influye en los torneos.
4. US3 → fragmentos jugando y desfragmentando.
5. US4 + US5 + US7 → tienda completa.
6. Fase 10 → balance, constitución, documentación y quickstart.

### Notes

- [P] = ficheros distintos, sin dependencias pendientes.
- Cada historia es comprobable por separado con su «Independent Test».
- Los agentes no confirman ni publican cambios; al cerrar cada fase, sugerir el `git commit` correspondiente.
