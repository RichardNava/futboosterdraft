---

description: "Tareas de la spec 013: mejora de cartas y nivel de rareza del draft"
---

# Tasks: Mejora de cartas y nivel de rareza del draft

**Input**: documentos de diseño en `specs/013-mejora-cartas-rareza-draft/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: sí. La spec y el plan los piden (Principio IX; [research R14](research.md#r14-pruebas)): regresión del generador (SC-005), informe de `pnpm balance` (SC-004), contraste (SC-003), integración del cobro y de «Mis partidas», y e2e de login, tooltip, media y perfil.

**Organization**: una fase por historia, en orden de prioridad (P1: US1, US2, US4; P2: US3, US5; P3: US6, US7). Las etiquetas `[USn]` conservan la numeración de la spec.

**Recordatorios del proyecto**: pnpm sin excepciones; sin tildes en identificadores ni datos; los agentes no hacen `git commit` ni `git push`; tras tocar código, `graphify update .`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (ficheros distintos, sin depender de tareas pendientes)
- **[Story]**: historia de la spec (US1…US7)

---

## Phase 1: Setup

**Purpose**: nada que instalar (sin dependencias nuevas; `sharp` ya está en `@fbd/fixtures`). Solo se fija la línea base del generador antes de tocarlo.

- [X] T001 Capturar la fixture de regresión del generador ANTES de cambiar `generador.ts`: script de test que guarda la salida de `generarMesa` (pool de solo Core, parámetros actuales) para 50 semillas × {4, 8} participantes en `packages/domain/tests/sobres/fixtures/regresion-e9aca5d.json` (G4, SC-005); se ejecuta una vez en `main` sin cambios y el JSON se deja versionado

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: migración y esquema compartidos por US3 (nivel, cobro, pase) y US4 (índice de «Mis partidas»).

**⚠️ CRITICAL**: US3 y US4 no pueden empezar sin esta fase. US1, US2, US5, US6 y US7 no dependen de ella.

- [X] T002 Crear `apps/server/drizzle/0016_spec013.sql` con exactamente el SQL de [data-model §1](data-model.md#1-migración-0016_spec013sql): `partidas.nivel_rareza text not null default 'moderado'` con `check (nivel_rareza in ('pobre','escaso','moderado','abundante','rico'))`; `partidas.cobro_rareza integer` (null = gratis); `partidas.clave_creacion text` con índice único parcial `partidas_anfitrion_clave_uq on partidas (anfitrion_id, clave_creacion) where clave_creacion is not null`; índice `participantes_usuario_idx (usuario_id)`; tabla `pases_premium (usuario_id text primary key references usuarios(id), fin timestamptz null, cortesia boolean not null default false, actualizado_en timestamptz not null default now())`; `compras_producto_tipo_ck` con `'pase_premium'` añadido; `movimientos_fragmentos_motivo_ck` con `'nivel_rareza'`, `'devolucion_nivel_rareza'` y `'compra_pase_premium'` añadidos (copiar los valores actuales de la 0015/0014 antes de recrearla); índice único `movimientos_devolucion_rareza_uq on movimientos_fragmentos (referencia) where motivo = 'devolucion_nivel_rareza'`. Registrar la entrada en `apps/server/drizzle/meta/_journal.json` como las anteriores
- [X] T003 Reflejar la migración en el esquema Drizzle: columnas `nivelRareza`, `cobroRareza`, `claveCreacion` e índices en `apps/server/src/persistencia/esquema/base.ts`; tabla `pasesPremium` y valores nuevos de tipo de compra y motivo en `apps/server/src/persistencia/esquema/coleccion.ts` (exportar desde `esquema/index.ts` si hace falta)
- [X] T004 [P] Test de migración `apps/server/tests/integration/migracion-0016.test.ts` (patrón de `migracion-0015.test.ts`): una partida previa queda con `nivel_rareza = 'moderado'` (FR-018), el `check` rechaza `'x'`, y existen `pases_premium` y los índices nuevos

**Checkpoint**: `pnpm db:migrate` aplica la 0016 y `pnpm typecheck` pasa.

---

## Phase 3: User Story 1 - Fondos ilustrados en las cartas de Core (Priority: P1) 🎯 MVP

**Goal**: cada carta de Core muestra su ilustración anime propia como fondo; con identidad `alternativa`, el fondo genérico.

**Independent Test**: `pnpm --filter @fbd/fixtures fondos-core -- --origen ../../jugadores_bg` y `pnpm --filter @fbd/fixtures core-real` en verde; 20 cartas al azar en la colección con su jugador; identidad `alternativa` ⇒ fondos genéricos.

### Tests for User Story 1

- [X] T005 [P] [US1] Test de `fondosCore` en `tools/fixtures/tests/fondosCore.test.ts` con un directorio temporal de PNG mínimos: id que falta, id que sobra (no está en Core) e id repetido con dos nombres distintos ⇒ error con los ids afectados, código ≠ 0, `core-real.json` intacto y origen intacto (FR-003, edge cases); caso correcto ⇒ `imagen_bg` escrito y segunda ejecución sin cambios (repetible). Si `tools/fixtures` no tiene Vitest configurado, añadir el script `test` como en `packages/domain/package.json`
- [X] T006 [P] [US1] Caso nuevo en `packages/domain/tests/catalogo/identidad.test.ts`: `conIdentidad(j, 'alternativa')` con `imagen_bg: '/cartas/fondos/jugadores/7.webp'` devuelve `imagen_bg: '/cartas/fondos/<dem>.svg'` de su demarcación; con un `imagen_bg` que no empieza por `/cartas/fondos/jugadores/` lo conserva; con `'real'` no cambia nada (FR-006)

### Implementation for User Story 1

- [X] T007 [US1] Crear `tools/fixtures/src/fondosCore.ts` (script `"fondos-core": "tsx src/fondosCore.ts"` en `tools/fixtures/package.json`) según [research R1](research.md#r1-incorporación-de-las-300-ilustraciones-fr-001-a-fr-004-fr-007-sc-001-sc-002): arg `--origen <dir>`; id con `^(\d+)_`; verificar ANTES de escribir que hay exactamente un fichero por cada id de `data/core-real.json` (informa faltan/sobran/repetidos y sale con código ≠ 0 sin tocar nada); convertir con `sharp` a `apps/web/public/cartas/fondos/jugadores/<id>.webp` a tamaño original (600 × 900, alfa), calidad 80; error si el peso medio supera 120 KB (SC-002) e informar del peso medio; escribir `imagen_bg: "/cartas/fondos/jugadores/<id>.webp"` en cada ficha sin tocar ningún otro campo ni el formato del JSON; NO borrar el origen
- [X] T008 [US1] Cambiar la regla de `imagen_bg` en `validarCoreReal` (`tools/fixtures/src/coreReal.ts`, ~línea 288): debe ser exactamente `/cartas/fondos/jugadores/<id de la propia ficha>.webp` y el fichero debe existir en `apps/web/public` (comprobación automática de SC-001)
- [X] T009 [US1] Ejecutar `pnpm --filter @fbd/fixtures fondos-core -- --origen ../../jugadores_bg` y después `pnpm --filter @fbd/fixtures core-real` (regenera `specs/008-datos-reales-core/sumario.md`); ambos en verde; resultado: 300 WebP en `apps/web/public/cartas/fondos/jugadores/` y `data/core-real.json` actualizado
- [X] T010 [US1] En `conIdentidad()` (`packages/domain/src/catalogo/identidad.ts`), con identidad `alternativa`, devolver `imagen_bg: '/cartas/fondos/<dem>.svg'` solo si el `imagen_bg` empieza por `/cartas/fondos/jugadores/` (R2; hace pasar T006)
- [X] T011 [US1] Comprobar que `fondoDe()` (`apps/web/src/componentes/CartaJugador.tsx:52`) pinta la ilustración con la transparencia, máscara y `onError` → genérico actuales; añadir en `apps/web/tests/unit/fondoCarta.test.ts` un caso con `/cartas/fondos/jugadores/1.webp` (sin cambios de componente salvo que el test falle)
- [X] T012 [US1] `pnpm seed` y revisión visual de 20 cartas al azar en colección, draft, ficha, plantilla y tienda (SC-001, US1-2); anotar el resultado en la respuesta a la persona
- [X] T013 [US1] Borrar `jugadores_bg/` de la raíz (FR-007) SOLO tras T009 y T012 en verde y con confirmación explícita de la persona: no está en git y el borrado es irreversible

**Checkpoint**: US1 entregable sola.

---

## Phase 4: User Story 2 - Virtudes, defectos y stats legibles (Priority: P1)

**Goal**: rasgos y cifras de stats con contraste ≥ 4,5:1 sobre cualquier fondo, sin tapar la ilustración.

**Independent Test**: `pnpm --filter @fbd/web test -- contrasteCarta` y revisión en `/pruebas/cartas` de cartas con 4, 5 y 6 rasgos.

### Tests for User Story 2

- [X] T014 [P] [US2] Crear `apps/web/tests/unit/contrasteCarta.test.ts`: calcula el contraste WCAG del color del texto frente al recuadro con su alfa compuesto sobre blanco puro (peor caso, R3) para virtudes, defectos y cifras de stats, leyendo los mismos valores que usa `apps/web/src/estilos/cartas.css` (exportarlos como tokens si hoy están escritos a mano en el CSS); falla si alguno baja de 4,5 (FR-008, FR-009, SC-003). La sombra no cuenta

### Implementation for User Story 2

- [X] T015 [US2] En `apps/web/src/estilos/cartas.css`: subir el alfa del recuadro de `.carta-virtudes` / `.carta-defectos` al mínimo que da 4,5:1 en T014; `text-shadow` oscuro fino (`0 0 2px`) en el texto de los rasgos y en las cifras de stats; si las cifras caen hoy directamente sobre el fondo, banda translúcida propia. Sin `-webkit-text-stroke` ni bloques opacos (FR-010); una carta con 0 o 1 rasgos no deja un recuadro vacío visible
- [X] T016 [US2] Validación visual en `/pruebas/cartas` (`apps/web/src/pantallas/PruebasCartas.tsx`) con cartas de 4, 5 y 6 rasgos sobre las ilustraciones más claras; si el contorno de los stats queda feo, dejar solo recuadro + sombra suave siempre que T014 siga en verde (Assumptions)

**Checkpoint**: US1 + US2 entregables.

---

## Phase 5: User Story 4 - Arranque solo y «Mis partidas» rápida (Priority: P1)

**Goal**: la pestaña abierta se recupera sola cuando vuelve el servidor (con aviso a los 3 s) y «Mis partidas» carga en curso + 5 terminadas con «Cargar más».

**Independent Test**: parar y arrancar el servidor con una pestaña abierta ⇒ recupera sola en < 5 s; cuenta con 50 terminadas ⇒ en curso + 5, «Cargar más» de 5 en 5, < 1 s.

**Depende de**: Fase 2 (índice `participantes_usuario_idx`).

### Tests for User Story 4

- [X] T017 [P] [US4] Test unitario `apps/web/tests/unit/clienteReintento.test.ts` (con `fetch` simulado): un GET reintenta ante `TypeError` de red, cuerpo no JSON y 500/502/503/504 sin cuerpo de error, con esperas 0,5 → 1 → 2 s (tope 2 s), y resuelve cuando el servidor responde; un POST no se reintenta; un 401 o un 4xx con cuerpo de error no se reintenta; el estado `conectando` se activa y se desactiva
- [X] T018 [P] [US4] Test de integración `apps/server/tests/integration/mis-partidas.test.ts`: cuenta con 1 en curso + 50 terminadas ⇒ primera página con `enCurso` y 5 `terminadas` en orden `(actualizada_en desc, id desc)` y `siguiente` no nulo; con `antes=<siguiente>` ⇒ `enCurso: []` y las 5 siguientes; al final `siguiente: null`; terminar una partida entre páginas no duplica ni salta filas; 0 partidas, solo en curso o exactamente 5 terminadas ⇒ `siguiente: null`; `limite` fuera de 1–20 ⇒ 400; con 200 terminadas la respuesta tarda < 1 s (SC-007)

### Implementation for User Story 4

- [X] T019 [P] [US4] Crear el store zustand `apps/web/src/estado/conexionServidor.ts` con `conectando: boolean` y `desde: number | null` (inicio de la espera)
- [X] T020 [US4] En `api()` (`apps/web/src/api/cliente.ts`): reintento solo de GET ante error de red, cuerpo no JSON o 500/502/503/504 sin cuerpo de error, esperas 0,5 s → 1 s → 2 s (tope 2 s, sin límite de intentos), activando y desactivando `conectando` en `conexionServidor` (R8, FR-022); el resto de métodos no se reintenta
- [X] T021 [US4] Revisar `useSesion.cargar()` (`apps/web/src/estado/sesion.ts`) para que, con el reintento de `api()`, nunca se quede en `cargando` para siempre: un error no recuperable deja `cargando = false` y un 401 lleva a iniciar sesión (edge case de sesión caducada)
- [X] T022 [US4] Aviso «Conectando con el servidor…» con `role="status"` cuando `conectando` dura más de 3 s, en `PantallaCargando` (`apps/web/src/componentes/Esqueleto.tsx`) y en `apps/web/src/app/Marco.tsx`; desaparece solo al recuperar la conexión (FR-023, contrato UI)
- [X] T023 [P] [US4] Tipos de `GET /api/mis-partidas` en `packages/protocol/src/http/`: query `{ antes?: string; limite?: number }` (zod, `limite` entero 1–20, por defecto 5) y respuesta `{ enCurso, terminadas, siguiente: string | null }`; cursor con formato `"<actualizada_en ISO>|<id>"`
- [X] T024 [US4] Consulta paginada por clave en `apps/server/src/persistencia/repos/partidas.ts`: terminadas del usuario por `participantes.usuario_id`, orden `(actualizada_en desc, id desc)`, `where (actualizada_en, id) < (cursor)`, `limit limite + 1` para saber si hay `siguiente`; trae `nombreEquipo` y `controladoPorNPC` de la fila de `participantes`
- [X] T025 [US4] Reescribir `misPartidas()` (`apps/server/src/actores/misPartidas.ts`): `enCurso` como hoy y solo sin `antes`; `terminadas` desde T024 sin llamar a `gestor.obtener()` (R9, FR-025)
- [X] T026 [US4] Ruta `GET /api/mis-partidas?antes=&limite=` en `apps/server/src/http/partidas.ts` con validación de T023 (400 si no es válida)
- [X] T027 [US4] `apps/web/src/pantallas/MisPartidas.tsx`: en curso arriba, 5 terminadas y botón «Cargar más» que añade las 5 siguientes al final sin recargar las mostradas y se oculta con `siguiente === null` (FR-024, contrato UI)

**Checkpoint**: US1, US2 y US4 (todas las P1) entregables.

---

## Phase 6: User Story 3 - Nivel de rareza del draft (Priority: P2)

**Goal**: quien crea la partida elige entre 5 niveles (Moderado por defecto), el draft reparte con ese nivel y, en modo `restringido`, se cobra o se exige pase premium.

**Independent Test**: `pnpm --filter @fbd/domain test -- generador` (G1–G7 y regresión), `pnpm balance` (sección «Rareza del draft» dentro del 5 %), y el recorrido de [quickstart US3](quickstart.md#us3--rareza-del-draft-sc-004-sc-005).

**Depende de**: Fase 1 (T001, fixture de regresión) y Fase 2 (migración).

### Paso (a): niveles, generador y selector con acceso `libre`

#### Tests

- [X] T028 [P] [US3] Test `packages/domain/tests/sobres/rareza.test.ts`: `NIVELES_RAREZA` en orden `['pobre','escaso','moderado','abundante','rico']`, `NIVEL_RAREZA_POR_DEFECTO = 'moderado'`, y cada `RepartoSobre` de `parametros.sobres.niveles` cumple `superclase + crack + legendario + altas = 8` y coincide con la tabla de [data-model §2.2](data-model.md#22-parámetros-de-equilibrado--siguiente-versión-v7json)
- [X] T029 [P] [US3] Ampliar `packages/domain/tests/sobres/generador.test.ts` con el contrato [generador.md](contracts/generador.md): G4 (con reparto `{ superclase: 4, crack: 2, legendario: 1, altas: 1, probGoatEnAlta: 0.2 }` la salida es idéntica byte a byte a la fixture de T001); G1 (cupos 1 «POR o DEF», 2 DEF, 3 MED, 2 DEL y 8 cartas) para los 5 niveles; G2/FR-021 (ninguna carta repetida en la mesa); G3 (determinismo); G5 (un hueco alto sin existencias pasa al otro nivel alto y luego a Crack, nunca a Superclase); G6 (Rico, 8 participantes, pool de solo Core ⇒ las 90 L + G aparecen exactamente una vez y 6 sustituciones por Crack; con un pool de ≥ 96 L + G ⇒ 0 sustituciones); G7 (pool imposible ⇒ `ErrorPoolInsuficiente`)
- [X] T030 [P] [US3] Casos nuevos en `packages/domain/tests/partida/` para `ConfigPartida`: `configPorDefecto().nivelRareza === 'moderado'` y `validarConfigPartida` rechaza un nivel desconocido con `NIVEL_RAREZA_INVALIDO`

#### Implementation

- [X] T031 [P] [US3] Crear `packages/domain/src/sobres/rareza.ts` con `NivelRareza = 'pobre' | 'escaso' | 'moderado' | 'abundante' | 'rico'`, `NIVELES_RAREZA` (ese orden), `NIVEL_RAREZA_POR_DEFECTO = 'moderado'`, `RepartoSobre = { superclase, crack, legendario, altas, probGoatEnAlta }` (invariante: suma 8), `AccesoNivel = 'libre' | 'restringido'`, y exportarlo desde el índice del paquete
- [X] T032 [US3] Nueva versión de parámetros `packages/domain/src/parametros/v7.json` (copia de `v6.json`) con `sobres.niveles` exactamente: pobre `{5,2,0,1,0.05}`, escaso `{5,2,0,1,0.20}`, moderado `{4,2,1,1,0.30}`, abundante `{3,2,1,2,0.50}`, rico `{2,2,1,3,0.50}` (orden superclase, crack, legendario, altas, probGoatEnAlta); `sobres.probGoatEnAlta` sigue en 0,2 (solo tienda). Registrar v7 como actual en `packages/domain/src/parametros/index.ts` y su tipo; actualizar `packages/domain/tests/parametros/` si comprueba la versión vigente
- [X] T033 [US3] Refactorizar `packages/domain/src/sobres/generador.ts`: `generarSobre(rng, p, reparto)` construye la lista de niveles desde el reparto consumiendo el RNG en el mismo orden que hoy (primero sorteo POR/DEF, luego un sorteo por carta alta, en orden) y `generarMesa(pool, n, semilla, p, reparto)`; degradación hueco a hueco antes de asignar demarcaciones según [R5](research.md#r5-rico-y-huecos-sin-cartas-altas-fr-020-fr-021) (contar `restantes[nivel]` en la mesa; L/G sin existencias → el otro alto → Crack; si `asignar()` agota sus 500 reintentos, degradar un hueco alto más, empezando por el último, y reintentar; solo entonces `ErrorPoolInsuficiente`), sin consumir RNG cuando hay existencias. Exponer el número de sustituciones si hace falta para G6. Hace pasar T029
- [X] T034 [US3] `packages/domain/src/sobres/tienda.ts`: `generarSobreTienda` pasa el reparto de hoy `{4, 2, 1, 1, p.sobres.probGoatEnAlta}`; `packages/domain/tests/sobres/tienda.test.ts` sigue en verde (la economía no cambia)
- [X] T035 [US3] `ConfigPartida.nivelRareza: NivelRareza` en `packages/domain/src/partida/partida.ts`, por defecto `'moderado'` en `configPorDefecto()`; `validarConfigPartida` rechaza valores desconocidos con `NIVEL_RAREZA_INVALIDO` (hace pasar T030)
- [X] T036 [US3] Sección «Rareza del draft» en `tools/balance/src/` (nuevo `tools/balance/src/checks/rareza.ts` registrado en `informe.ts`): 1.000 mesas de 8 por nivel con pool de solo Core; media S/C/L/G por participante frente a la tabla de FR-012 (Rico frente a la fila «pool de solo Core»: 6 / 6,75 / 6,75 / 4,5) con umbral 5 % (SC-004, G8); probabilidad de que un GOAT concreto salga en la mesa; falla el check si un nivel se sale
- [X] T037 [P] [US3] Protocolo en `packages/protocol/src/http/`: `CrearPartida` gana `nivelRareza` opcional (zod enum de los 5 niveles, por defecto `moderado`); `PartidaResumen` y la vista de sala ganan `nivelRareza` y `cobroRareza: number | null`; tipo de respuesta de `GET /api/partidas/niveles-rareza` (`{ acceso, premium: { activo, cortesia, fin }, saldo: number | null, niveles: { nivel, estado: 'gratis' | 'pago' | 'no_disponible', coste?, motivo? }[] }`); códigos de error `NIVEL_RAREZA_INVALIDO`, `NIVEL_RAREZA_NO_DISPONIBLE`, `POOL_INSUFICIENTE`
- [X] T038 [US3] Persistir `nivel_rareza` al crear la partida y leerlo al reanudar en `apps/server/src/persistencia/repos/partidas.ts` (partidas sin valor ⇒ `moderado`, FR-018); incluirlo en `resumenPartida` / `resumenSala` (`apps/server/src/actores/`)
- [X] T039 [US3] `iniciarDraft` (`apps/server/src/actores/draft.ts`) pasa `parametros.sobres.niveles[partida.nivelRareza]` a `generarMesa` en cada mesa (FR-016; varias mesas con el mismo reparto)
- [X] T040 [US3] Ensayo en `crearPartida` (`apps/server/src/actores/gestor.ts`): antes de guardar, ejecutar `generarMesa` con el pool fijado, el número de participantes, `derivarSemilla(semilla, 'mesa:<i>')` y el reparto del nivel; `ErrorPoolInsuficiente` ⇒ `422 POOL_INSUFICIENTE` sin crear ni cobrar (FR-020)
- [X] T041 [US3] Integración `apps/server/tests/integration/rareza.test.ts` (paso a): crear con cada nivel ⇒ el resumen y la sala devuelven `nivelRareza`; nivel desconocido ⇒ `400 NIVEL_RAREZA_INVALIDO`; Rico con Core en una mesa de 8 arranca el draft sin repetidos; partida previa sin nivel se reanuda como `moderado`
- [X] T042 [US3] Selector «Rareza del draft» en `apps/web/src/pantallas/CrearPartida.tsx`, en todos los modos: 5 niveles en orden, Moderado preseleccionado, una línea de descripción por nivel (Pobre: «Casi sin estrellas: mandan Superclase y Crack.»; Escaso: «Pocas Legendario; algún GOAT suelto.»; Moderado: «El estándar.»; Abundante: «Muchas Legendario y GOAT.»; Rico: «Todas las Legendario y GOAT de la colección en la mesa.»), cumpliendo el Principio XI (sin desplazarse)
- [X] T043 [P] [US3] Etiqueta «Rareza: <Nivel>» junto al modo y la dificultad en `apps/web/src/pantallas/Sala.tsx` y en el resumen de partida (`PartidaResumen`, `apps/web/src/pantallas/`) (US3-4)

### Paso (b): ajuste `restringido`, cobro, pase premium y tienda

#### Tests

- [X] T044 [P] [US3] Test `packages/domain/tests/sobres/accesoNivelRareza.test.ts` con toda la tabla de [data-model §2.3](data-model.md#23-regla-de-acceso-fr-019): `libre` ⇒ gratis para todos; `restringido` + moderado ⇒ gratis; `restringido` + otro nivel ⇒ invitado `{ permitido: false, motivo: 'INVITADO' }`, registrado sin pase `coste: 100`, con pase (comprado o cortesía) `coste: 0`
- [X] T045 [P] [US3] Test `packages/domain/tests/economia/premium.test.ts`: `premiumActivo` (`cortesia || (fin !== null && fin > ahora)`) y `nuevoFin` (`max(ahora, fin ?? ahora) + dias`: activo suma 30 días a la fecha de fin; caducado o nunca comprado cuenta desde ahora)
- [X] T046 [P] [US3] Integración `apps/server/tests/integration/rareza-cobro.test.ts`: con `acceso_niveles_rareza = restringido`, registrado sin pase con saldo ⇒ cobro de 100 una sola vez (movimiento `nivel_rareza` con referencia = id de partida); doble envío concurrente con la misma `Idempotency-Key` ⇒ una partida y un cobro; saldo < 100 ⇒ `422 SALDO_INSUFICIENTE` con `detalles: { saldo, precio, faltan }` y sin partida; invitado + Rico ⇒ `403 NIVEL_RAREZA_NO_DISPONIBLE`; con cortesía ⇒ gratis; `POOL_INSUFICIENTE` no cobra; cancelación antes del draft ⇒ devolución una sola vez (`devolucion_nivel_rareza`) aunque se llame dos veces; cambiar el ajuste o caducar el pase después de crear no cobra más
- [X] T047 [P] [US3] Integración `apps/server/tests/integration/pase-premium.test.ts`: compra con fragmentos ⇒ `fin = ahora + 30 días`, saldo −2.990 y fila en `compras` con `producto_tipo = 'pase_premium'`; segunda compra ⇒ +30 días sobre el `fin`; mismo `idCompra` ⇒ una sola compra; invitado ⇒ rechazado; `GET /api/premium` y `GET /api/tienda` devuelven el estado; CLI de cortesía activa y desactiva

#### Implementation

- [X] T048 [P] [US3] `accesoNivelRareza({ nivel, acceso, tipoUsuario, premiumActivo, precio })` en `packages/domain/src/sobres/rareza.ts` → `{ permitido: true, coste: 0 | precio } | { permitido: false, motivo: 'INVITADO' }` (hace pasar T044)
- [X] T049 [P] [US3] Crear `packages/domain/src/economia/premium.ts` con `EstadoPremium = { fin: Date | null; cortesia: boolean }`, `premiumActivo(e, ahora)` y `nuevoFin(e, ahora, dias)`; en `packages/domain/src/economia/parametros.ts`, `PARAMETROS_ECONOMIA.precioNivelRareza = 100` y `pasePremium = { dias: 30, fragmentos: 2990, centimos: 299 }` (hace pasar T045)
- [X] T050 [US3] `ServicioAjustes` (`apps/server/src/ajustes/servicio.ts`) pasa a un mapa de claves conocidas con valor por defecto: `identidad_cartas` → `real`, `acceso_niveles_rareza` → `libre` (sin fila ⇒ `libre`), misma caché de 30 s; el CLI `apps/server/src/ajustes/cli.ts` acepta las dos claves y valida sus valores; `identidad-cartas.test.ts` sigue en verde
- [X] T051 [P] [US3] Protocolo del pase y motivos en `packages/protocol/src/http/`: `GET /api/premium` → `{ activo, cortesia, fin }`; `POST /api/tienda/pase-premium` cuerpo `{ moneda: 'fragmentos' | 'eur', idCompra }` y respuesta `{ idCompra, saldo, premium }`; `GET /api/tienda` gana `pasePremium: { precioFragmentos, precioCentimos, dias, estado: { activo, cortesia, fin } | null }`; `MotivoMovimiento` gana `nivel_rareza`, `devolucion_nivel_rareza` y `compra_pase_premium`
- [X] T052 [US3] En `apps/server/src/economia/servicio.ts`: lectura del estado premium (`pases_premium`, sin fila ⇒ inactivo); compra del pase con `comprar()` (producto `{ tipo: 'pase_premium', id: 'pase-30', moneda, importe }`) que al entregar hace `fin = nuevoFin(...)`; `cobrarRareza(tx, usuarioId, partidaId, precio)` con `cobrar()` y motivo `nivel_rareza`; `devolverCobroRareza(partidaId)` idempotente por el índice `movimientos_devolucion_rareza_uq`
- [X] T053 [US3] Crear el CLI `apps/server/src/premium/cli.ts` (script `"premium"` en `apps/server/package.json`, patrón de `ajustes/cli.ts`): `pnpm --filter @fbd/server premium <email> <si|no>` activa o desactiva `cortesia` (FR-035)
- [X] T054 [US3] Validación de acceso y cobro idempotente en `crearPartida` (`apps/server/src/actores/gestor.ts`) según [R6](research.md#r6-acceso-ajuste-acceso_niveles_rareza-y-cobro-fr-016-fr-017-fr-019-fr-033): leer el ajuste y el estado premium; `accesoNivelRareza` ⇒ `403 NIVEL_RAREZA_NO_DISPONIBLE` si no está permitido; en una transacción: `bloquear` el saldo del anfitrión, buscar partida con `(anfitrion_id, clave_creacion)` y devolverla si existe, comprobar saldo (`422 SALDO_INSUFICIENTE` con `{ saldo, precio, faltan }`), crear la partida con `nivel_rareza`, `cobro_rareza` y `clave_creacion`, y cobrar con referencia = id de partida. El ensayo de T040 va antes de la transacción
- [X] T055 [US3] Llamar a `devolverCobroRareza` en el único punto donde una partida pasa de `buscando` a `cancelada` sin draft (localizarlo en `apps/server/src/actores/`; si no existe ninguno para registrados, en la transición `cancelar`), solo si `cobro_rareza` no es nulo (FR-033)
- [X] T056 [US3] Rutas en `apps/server/src/http/partidas.ts`: `GET /api/partidas/niveles-rareza` (`requiereSesion`; `acceso`, `premium`, `saldo` o `null` para invitados, y estado por nivel con `accesoNivelRareza`); `POST /api/partidas` lee la cabecera `Idempotency-Key` y la pasa como `clave_creacion`
- [X] T057 [US3] Rutas en `apps/server/src/http/tienda.ts`: `GET /api/premium` y `POST /api/tienda/pase-premium` (`requiereRegistrado`, idempotente por `idCompra`), y `pasePremium` en `GET /api/tienda`
- [X] T058 [US3] Textos de los motivos nuevos en el historial de fragmentos de la web (donde hoy se traducen los motivos de `MotivoMovimiento` en `apps/web/src/`): «Nivel de rareza», «Devolución del nivel de rareza», «Pase premium»
- [X] T059 [US3] `CrearPartida.tsx`: cargar `GET /api/partidas/niveles-rareza` y pintar junto a cada nivel «Gratis», «100 fragmentos» o «Solo con cuenta registrada» (deshabilitado); generar UNA `Idempotency-Key` al pulsar «Crear» y reutilizarla en los reintentos de ese envío (no usar `api({ idempotente: true })`, que genera una por petición); botón deshabilitado mientras envía; con `SALDO_INSUFICIENTE`, aviso con saldo y lo que falta sin salir del formulario; con `POOL_INSUFICIENTE`, mensaje claro
- [X] T060 [US3] Tarjeta «Pase premium · 30 días» en `apps/web/src/pantallas/Tienda.tsx`: precio en fragmentos y en euros, compra con el flujo de confirmación existente (`ConfirmacionCompra`), «Activo hasta el dd/mm/aaaa» si está activo y «Activo» con cortesía; oculta para invitados
- [X] T061 [US3] Fecha de fin del pase (o «Activo» con cortesía) en la cabecera de `apps/web/src/pantallas/Perfil.tsx` (FR-034)
- [X] T062 [US3] e2e `apps/web/tests/e2e/rareza.spec.ts`: crear partida ⇒ Moderado preseleccionado; elegir Rico ⇒ la sala muestra «Rareza: Rico»; doble clic en «Crear» ⇒ una sola partida

**Checkpoint**: US3 completa con acceso `libre` tras el paso (a) y con venta tras el paso (b).

---

## Phase 7: User Story 5 - Aviso claro al fallar el inicio de sesión (Priority: P2)

**Goal**: aviso arriba del formulario, distinto por causa, sin mover la animación de la portada.

**Independent Test**: `pnpm --filter @fbd/web e2e -- acceso`.

- [X] T063 [P] [US5] e2e `apps/web/tests/e2e/acceso.spec.ts`: contraseña mala ⇒ aviso dentro del viewport sin desplazar, texto «El email o la contraseña no son correctos.» y enlace «¿Has olvidado la contraseña?»; 429 simulado ⇒ «Demasiados intentos. Espera un minuto y vuelve a probar.»; red caída simulada (`page.route` abortando) ⇒ «No hay conexión con el servidor. Inténtalo en unos segundos.»; el `boundingBox` del contenedor de la animación de la portada es idéntico antes y después del aviso (SC-008)
- [X] T064 [US5] Crear `apps/web/src/componentes/AvisoAcceso.tsx` (`role="alert"`) que traduce el error: 401 / `INVALID_EMAIL_OR_PASSWORD` ⇒ credenciales (sin decir si falla el email o la contraseña) + enlace de recuperar contraseña; error de red o 5xx ⇒ sin conexión; 429 ⇒ demasiados intentos (FR-027)
- [X] T065 [US5] En `apps/web/src/pantallas/Inicio.tsx` sustituir los `<p className="error">` del final de los formularios (líneas ~130 y ~171) por `AvisoAcceso` arriba del formulario, en una ranura con `position: absolute` sobre la cabecera de la tarjeta para que la altura del bloque no cambie; `contain: layout` en el contenedor de la animación de cartas (CSS en `apps/web/src/estilos/base.css` o el de la portada) (FR-026, FR-028)

**Checkpoint**: US5 entregable.

---

## Phase 8: User Story 6 - Tooltips y media del equipo sin fallos visuales (Priority: P3)

**Goal**: la descripción del rasgo solo se ve en su posición final; la media del equipo completa y sobre la estrella del 50 % al 200 % de zoom.

**Independent Test**: `pnpm --filter @fbd/web e2e -- retoques-013`.

- [X] T066 [P] [US6] e2e `apps/web/tests/e2e/retoques-013.spec.ts`: (1) pasar el cursor rápido sobre varios rasgos y comprobar que la descripción nunca es visible (`visibility` distinta de `hidden`) sin `data-colocada`, ni con su caja en (0, 0); (2) con `document.body.style.zoom` a 50 %, 100 %, 150 % y 200 % en Formación, la caja de `.media-equipo-valor` queda dentro de su contenedor y `elementFromPoint` en su centro es la cifra, no la estrella (SC-009, FR-030)
- [X] T067 [US6] Tooltip en `apps/web/src/componentes/CartaJugador.tsx` (rasgos, ~línea 340) con el patrón de `VistaCarta.tsx`: CSS `.carta-descripcion:popover-open:not([data-colocada]) { visibility: hidden }` en `apps/web/src/estilos/cartas.css`; colocar en `onBeforeToggle` cuando se pueda y, en todo caso, marcar `data-colocada` en `onToggle` tras `colocarJunto()`; quitarlo al cerrar; en `conPuntero`, colocar de forma síncrona justo tras `showPopover()` (R11, FR-029)
- [X] T068 [US6] Media del equipo en `apps/web/src/componentes/MediaEquipo.tsx` y su CSS: quitar las cajas fijas en px (`.media-equipo-cifra { width: 140px }`), tamaños en `em` relativos a la cifra, `line-height: 1` con `padding-block` propio, `overflow: visible` y la cifra con `z-index` sobre la estrella (R12)

**Checkpoint**: US6 entregable.

---

## Phase 9: User Story 7 - Mi perfil más compacto (Priority: P3)

**Goal**: [equipación local + visitante] | [escudo + sobre] en dos columnas, celebración debajo; una columna en pantallas estrechas.

**Independent Test**: «Mi perfil» a 1366 × 768 sin desplazarse; a 375 px apilado; el guardado funciona igual.

- [X] T069 [P] [US7] e2e en `apps/web/tests/e2e/cosmeticos.spec.ts` (o `perfil.spec.ts` nuevo): a 1366 × 768 las dos equipaciones, el escudo y el sobre están dentro del viewport sin desplazar (SC-010); a 375 px los contenedores se apilan; guardar una equipación con «Guardar» y elegir escudo o sobre persiste igual que antes (FR-032)
- [X] T070 [US7] Maquetación de `apps/web/src/pantallas/Perfil.tsx` y su CSS: rejilla de dos columnas en escritorio, contenedor con equipación local + visitante y contenedor contiguo con escudo + sobre, celebración debajo; una columna por debajo de ~760 px. Sin tocar los manejadores de guardado (FR-031, FR-032)

**Checkpoint**: las 7 historias entregables.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [X] T071 [P] Actualizar `CLAUDE.md`: comando `pnpm --filter @fbd/fixtures fondos-core -- --origen <dir>`, ajuste `acceso_niveles_rareza <libre|restringido>` y CLI `pnpm --filter @fbd/server premium <email> <si|no>`
- [X] T072 [P] Actualizar el estado de la spec 013 en `ROADMAP.md`
- [ ] T073 Recorrer [quickstart.md](quickstart.md) completo, incluido volver el ajuste a `libre` al final
- [ ] T074 Cierre: `pnpm typecheck && pnpm test && pnpm test:integration && pnpm --filter @fbd/web e2e && pnpm balance` en verde, y `graphify update .`
- [X] T075 Proponer a la persona el commit (sin ejecutarlo) con el comando exacto listo para copiar

---

## Phase 11: Ronda 2 (revisión de la persona, 2026-11-11)

- [X] T076 `pnpm balance`: dar por buena la magnitud medida de Frágil (4,96 veces más lesiones por minuto; el parámetro `fragil` sigue en 3) con `OBJETIVO_FRAGIL_MEDIDO` en `tools/balance/src/checks/rasgos.ts`; se revisará si resulta problemático
- [X] T077 Nueva partida sin desplazamiento: Dificultad y Rareza del draft pasan a un deslizador por tramos (`apps/web/src/componentes/SelectorTramos.tsx`); al moverlo, la barra principal muestra el nombre en negrita y la descripción (`data-ayuda-titulo`, `BarraPrincipal.tsx`); rareza en la columna derecha (`base.css`); e2e `dificultad.spec.ts` y `rareza.spec.ts` adaptados
- [X] T078 `fondos-core --parcial`: sustituye solo las ilustraciones del origen y solo toca su `imagen_bg` (`tools/fixtures/src/fondosCore.ts`, test en `fondosCore.test.ts`)
- [X] T080 Nueva partida sin desplazar (corrección de la ronda 2): dos columnas con altura propia (`.crear-columna`: modo y rivales; equipos, rareza y ritmo), Equipos y Ritmo en filas compactas y, en pantallas de hasta 820 px de alto, cabecera y sobre más pequeños; medido sin scroll a 1874×905, 1440×800 y 1280×720, con invitado y con cuenta registrada
- [X] T079 Retoques de porteros y defensas: 51 ilustraciones de `retoques/` convertidas a WebP (media 58,5 KB) sobre las actuales con `fondos-core -- --origen ../../retoques --parcial`; centrocampistas y delanteros, en la ronda 3

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Fase 1)**: T001 antes de cualquier cambio en `packages/domain/src/sobres/generador.ts` (T033).
- **Foundational (Fase 2)**: bloquea US3 (Fase 6) y US4 (Fase 5).
- **US1, US2, US5, US6, US7**: no dependen de la Fase 2; pueden empezar en cuanto se quiera.
- **Polish (Fase 10)**: después de todas las historias que se vayan a entregar.

### User Story Dependencies

- **US1 (P1)**: independiente. T013 (borrar `jugadores_bg/`) es lo último y requiere confirmación.
- **US2 (P1)**: independiente; conviene después de US1 para validar sobre las ilustraciones reales (T016).
- **US4 (P1)**: depende de la Fase 2 (índice).
- **US3 (P2)**: depende de T001 y de la Fase 2. Paso (b) depende del paso (a). Comparte `CrearPartida.tsx` (T042, T059), `gestor.ts` (T040, T054) y `Perfil.tsx` con US7 (T061, T070): hacerlos en secuencia.
- **US5 (P2)**, **US6 (P3)**: independientes. T067 y T015 tocan `cartas.css`: en secuencia.
- **US7 (P3)**: independiente; T070 y T061 tocan `Perfil.tsx`.

### Within Each User Story

- Tests primero (deben fallar), luego dominio → protocolo → servidor → web.
- US3: T031 → T032 → T033 → T034/T035 → T038–T040 → T042; paso (b): T048/T049 → T050–T053 → T054–T057 → T058–T061.

### Parallel Opportunities

- Fase 2: T004 en paralelo con T003 una vez escrita la migración.
- US1: T005 y T006 en paralelo; T007/T008 (fixtures) en paralelo con T010 (dominio).
- US4: T017, T018, T019 y T023 en paralelo; la parte web (T019–T022, T027) y la de servidor (T024–T026) en paralelo.
- US3: T028, T029, T030, T031 y T037 en paralelo; en el paso (b), T044–T049 y T051 en paralelo.
- Entre historias: US1, US2, US5, US6 y US7 se pueden repartir en paralelo (cuidando `cartas.css` y `Perfil.tsx`).

---

## Parallel Example: User Story 3 (paso a)

```text
T028 rareza.test.ts               (packages/domain/tests/sobres/)
T029 generador.test.ts G1–G7      (packages/domain/tests/sobres/)
T030 config de partida            (packages/domain/tests/partida/)
T031 rareza.ts                    (packages/domain/src/sobres/)
T037 protocolo de crear partida   (packages/protocol/src/http/)
```

## Parallel Example: User Story 4

```text
T017 clienteReintento.test.ts     (apps/web/tests/unit/)
T018 mis-partidas.test.ts         (apps/server/tests/integration/)
T019 conexionServidor.ts          (apps/web/src/estado/)
T023 protocolo de mis-partidas    (packages/protocol/src/http/)
```

---

## Implementation Strategy

### MVP First (US1)

1. Fase 1 (T001, fixture de regresión; barata y protege SC-005).
2. Fase 3 (US1): fondos ilustrados con `core-real` en verde.
3. **Parar y validar**: muestreo de 20 cartas; borrar `jugadores_bg/` solo con confirmación.

### Incremental Delivery (orden del plan)

1. US1 + US2 (fondos y legibilidad) y, con la Fase 2, US4 (arranque y Mis partidas): todas las P1.
2. US3 paso (a): niveles con acceso `libre` (ya jugable y probable con `pnpm balance`).
3. US3 paso (b): ajuste `restringido`, cobro, pase premium y tienda.
4. US5, US6 y US7.
5. Polish y cierre.

### Notes

- `[P]` = ficheros distintos y sin dependencias pendientes.
- Cada historia se cierra en su checkpoint antes de pasar a la siguiente.
- Ninguna tarea ejecuta `git commit` ni `git push`.
