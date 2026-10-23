---

description: "Lista de tareas de las mejoras del MVP de Fútboosterdraft"
---

# Tasks: Mejoras del MVP — cartas, ritmo de juego, navegación, simulación 2D y reglas

**Input**: Documentos de diseño en `/specs/002-mejoras-mvp/`: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md).

**Tests**: SE INCLUYEN. El Principio IX de la constitución exige pruebas automatizadas, y plan.md y quickstart.md asignan una comprobación a cada SC. En cada historia, las pruebas se escriben **antes** que la implementación y deben fallar primero.

**Organization**: tareas agrupadas por historia de usuario. Gestor de paquetes: **pnpm**, siempre ([CLAUDE.md](../../CLAUDE.md)). Nunca npm, yarn ni bun. Identificadores y datos sin tildes; las tildes solo en los textos que se muestran.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede ejecutar en paralelo (ficheros distintos, sin dependencias pendientes).
- **[Story]**: historia a la que pertenece (US1 a US11, ver spec.md).
- Todas las rutas son relativas a la raíz del repositorio.

## Path Conventions (monorepo de la spec 001)

- Reglas puras: `packages/domain/src/`, `packages/engine/src/`, `packages/ai/src/`; sus pruebas, en `packages/<paquete>/tests/` (no en `src/tests/`, aunque plan.md lo abrevie así).
- Contratos compartidos: `packages/protocol/src/`.
- Servidor: `apps/server/src/`; pruebas en `apps/server/tests/{unit,integration,contract}/`.
- Cliente: `apps/web/src/`; pruebas unitarias en `apps/web/tests/unit/` (nuevo, T003) y de principio a fin en `apps/web/tests/e2e/`.
- Herramientas: `tools/balance/`, `tools/load/`, `tools/fixtures/`.
- La tabla de mesas del draft se llama `mesas` en `apps/server/src/persistencia/esquema/draft.ts` (data-model.md la llama `mesas_draft`).
- **Prohibido en `packages/domain` y `packages/engine`**: `Math.random`, `Date`, `performance.now`, E/S. En `packages/engine/src/espacio/`, además, nada de coma flotante en las decisiones (research R3).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: dependencias y herramientas nuevas que usan varias historias.

- [X] T001 [P] Añadir `@fastify/compress` con `pnpm --filter @fbd/server add @fastify/compress` y registrarlo en `apps/server/src/http/app.ts` (global, `threshold: 1024`, codificaciones `br` y `gzip`) (research R5).
- [X] T002 [P] Activar `permessage-deflate` en las opciones de `@fastify/websocket` de `apps/server/src/http/app.ts` (`perMessageDeflate: { threshold: 1024 }`) (research R5).
- [X] T003 [P] Añadir el proyecto `web` a `vitest.workspace.ts` (`root: './apps/web'`, `include: ['tests/unit/**/*.test.ts']`) y crear `apps/web/tests/unit/`. Así `pnpm test` ejecuta las pruebas del reloj de reproducción (quickstart).
- [X] T004 [P] Añadir el script `"bench": "vitest bench --run"` a `packages/engine/package.json` y crear `packages/engine/bench/partido.bench.ts`, que de momento mide un partido completo con y sin fotogramas con el motor actual (línea base para R3).
- [X] T005 Añadir a `.github/workflows/ci.yml` el paso `pnpm --filter @fbd/engine bench` (sin umbral todavía; el umbral llega en T158).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: parámetros 2.0.0, esquema de base de datos, ritmo deducido y `resolverResto`, que usan varias historias.

**⚠️ CRITICAL**: ninguna historia empieza antes de terminar esta fase.

### Tests (escribir primero; deben fallar)

- [X] T006 [P] Pruebas de los parámetros en `packages/domain/tests/parametros/parametros.test.ts`:
  - `parametrosActuales().version === '2.0.0'`; `PARAMETROS_V1` se conserva como dato, pero `parametrosPorVersion('1.0.0')` lanza `VERSION_NO_SOPORTADA` (no se puede volver a simular);
  - `reproduccion` vale exactamente `{ ticksPorSegundoX2: 23.5, descuentoMinS: 60, descuentoMaxS: 180, pausaGolMs: 2000, tandaLanzamientoMsX2: 3000, anticipacionTicks: 60 }`;
  - `colocacion` vale `{ beta: 0.6, gamma: 0.5, limite: 3, separacionMinima: 30 }`;
  - `asincrono` vale `{ nivelDecisiones: 'avanzado' }` y `draft` vale `{ margenAnimacionS: 6 }`;
  - `penalizacionPosicion.mismaDemarcacion === 0.10` y `penalizacionPosicion.porteria === 0.60`.
- [X] T007 [P] Prueba en `packages/engine/tests/version.test.ts`: `crearPartido` con `parametros.version` 1.x lanza `VERSION_NO_SOPORTADA`; con 2.0.0 crea el estado.
- [X] T008 [P] Ampliar `packages/domain/tests/partida/partida.test.ts`:
  - la configuración de `Partida` ya no tiene `ritmo`, ni `tiempos.preparacionS` ni `tiempos.preparacionInicialS`;
  - `soloUnHumano(partida)` es verdadero si `humanosActivos === 1` (sin contar los que han abandonado);
  - `plazoJornadaHoras` solo se aplica con 2 o más humanos.
- [X] T009 [P] Pruebas de `resolverResto` en `packages/ai/tests/resolverResto.test.ts` (research R7):
  - desde el minuto 0, el 30, el descanso y el 89, llega a `fase === 'finalizado'`;
  - en una eliminatoria empatada (`tools/fixtures/escenarios/empate-eliminatoria.json`) incluye la prórroga y la tanda;
  - en cada parada aplica `decidirNPCEnPausa` solo a los lados de `niveles`, y cierra sin cambios la ventana del lado humano;
  - devuelve un elemento de `tramos` por cada parte simulada, con sus eventos.

### Implementation

- [X] T010 Crear `packages/domain/src/parametros/v2.json` (`"version": "2.0.0"`) y ampliar los tipos en `packages/domain/src/parametros/index.ts` según data-model.md §1:
  - `penalizacionPosicion`: `{ mismaDemarcacion: 0.10, porteria: 0.60, cruces: { origen, destino, valor }[] }`, con estas filas (roles de research R12): `DEL→MED 0.20`, `DEL→MED_MCO 0.20`, `DEL→DEF 0.40`, `MED→DEL 0.20`, `MED→DEF 0.20`, `MED_MCO→DEL 0.10`, `MED_MCO→DEF 0.30`, `MED_MD→DEL 0.30`, `MED_MD→DEF 0.10`, `DEF→DEL 0.40`, `DEF→MED 0.20`, `DEF→MED_MCO 0.30`;
  - `reproduccion`, `colocacion`, `asincrono` y `draft` con los valores de T006;
  - `espacio`: bloque vacío tipado que rellena T075;
  - `acciones`: copia de v1 (se recalibra en T087);
  - se conservan temporalmente `penalizacionFueraPosicion` y `penalizacionPorteria` hasta T030 (US4);
  - `parametrosActuales()` devuelve v2; `v1.json` se conserva solo para leer partidos antiguos.
- [X] T011 Comprobar la versión en `crearPartido` (`packages/engine/src/estado/estado.ts`): con `parametros.version` < 2.0.0 lanza un error con código `VERSION_NO_SOPORTADA` (contracts/engine-api.md).
- [X] T012 Eliminar `ritmo` (tipo `Ritmo`, valor por defecto y validación) y `tiempos.preparacionS` / `tiempos.preparacionInicialS` de `packages/domain/src/partida/partida.ts`, y añadir `humanosActivos(participantes)` y `soloUnHumano(partida)` (data-model.md §6.1).
- [X] T013 Crear la migración `apps/server/drizzle/0004_mejoras.sql` (con `pnpm --filter @fbd/server exec drizzle-kit generate`, más el SQL de datos a mano) y actualizar el esquema en `apps/server/src/persistencia/esquema/{base,draft,partido,torneo}.ts`:
  - `partidas`: eliminar la columna `ritmo` y la restricción `partidas_ritmo_ck`;
  - `mesas`: añadir `pausada_en timestamptz null` y `restante_ms integer null`;
  - `partidos`: añadir `resolucion text not null` con `check (resolucion in ('directo','apertura','plazo','npc'))`, rellenada desde `resuelto_automaticamente` (`true` → `'plazo'`; `false` → `'npc'` si los dos lados son NPC y `'directo'` en otro caso), y `abierto_por_id uuid null` con referencia a `participantes`; después eliminar `resuelto_automaticamente`;
  - nueva tabla `visionados (partido_id, participante_id, estado text not null check (estado in ('pendiente','visto','revelado')), actualizado_en timestamptz not null)` con clave primaria `(partido_id, participante_id)`;
  - `avisos_tipo_ck`: añadir `'dorsal_asignado'`.
- [X] T014 Quitar `ritmo` del servidor: `apps/server/src/actores/gestor.ts`, `apps/server/src/actores/vistas.ts`, `apps/server/src/persistencia/repos/partidas.ts`, `apps/server/src/http/partidas.ts` (si el cuerpo de `POST /api/partidas` trae `ritmo`, `400`) y `packages/protocol/src/http/partidas.ts`. En `apps/server/src/actores/torneo.ts`, `apps/server/src/actores/preparacion.ts` y `apps/server/src/http/torneo.ts`, sustituir cada lectura de `partida.ritmo` por `soloUnHumano(partida)` sin cambiar todavía el comportamiento (eso llega en US11 y US2). Exponer `resueltoAutomaticamente` como derivado (`resolucion === 'plazo'`) en `apps/server/src/persistencia/repos/partidos.ts`.
- [X] T015 Implementar `resolverResto(estado, niveles, semilla)` en `packages/ai/src/resolverResto.ts` según contracts/engine-api.md: encadena `avanzar(estado, 'parte')`, aplica `decidirNPCEnPausa` en cada parada para los lados de `niveles`, cierra sin cambios las ventanas del humano y sigue hasta `finalizado` (prórroga y tanda incluidas). Devuelve `{ estado, eventos, tramos }`. Exportarlo en `packages/ai/src/index.ts` y hacer que `jugarHastaElFinal` en `packages/ai/src/partido.ts` lo use.
- [X] T016 Usar `resolverResto` para los partidos NPC contra NPC en `apps/server/src/actores/partidoRapido.ts` y `apps/server/src/actores/torneo.ts`, guardándolos con `resolucion: 'npc'`.

**Checkpoint**: `pnpm test`, `pnpm test:integration` y `pnpm typecheck` pasan con la migración aplicada; las historias pueden empezar.

---

## Phase 3: User Story 1 — Cartas de jugador vistosas y legibles (Priority: P1) 🎯 MVP

**Goal**: carta con imagen, nombre y media arriba, posiciones resaltadas debajo del nombre, stats y virtudes abajo, y un acabado propio por nivel; legible a 360 px.

**Independent Test**: abrir un sobre en el draft y la plantilla y comprobar la disposición, el popover de las virtudes y que los cuatro niveles se distinguen sin leer el texto (quickstart, escenario A).

### Tests for User Story 1 ⚠️

- [X] T017 [P] [US1] Prueba de principio a fin `apps/web/tests/e2e/cartas.spec.ts` (SC-002, escenario A):
  - en la ruta de pruebas `/_pruebas/cartas` (T023), con viewports de 1280 y 360 px de ancho, ningún elemento de ninguna carta de la colección Core desborda (`scrollWidth <= clientWidth` y `scrollHeight <= clientHeight` en la carta y sus hijos);
  - el orden vertical es cabecera (silueta, media, nombre) → franja de posiciones → pie (6 stats y virtudes);
  - un GOAT con 4 virtudes muestra los 4 sin desplazamiento;
  - pulsar o enfocar una virtud abre su descripción;
  - las cartas de los cuatro niveles tienen un `data-nivel` distinto y un color de marco distinto.

### Implementation for User Story 1

- [X] T018 [P] [US1] Crear `apps/web/src/estilos/cartas.css` con variables CSS por nivel (marco, degradado y brillo; research R16): Superclase plata mate, Épico violeta, Legendario oro con brillo animado suave, GOAT holográfico con degradado cónico animado. Las animaciones se detienen con `@media (prefers-reduced-motion: reduce)`. Contraste de texto ≥ 4,5:1.
- [X] T019 [P] [US1] Crear `apps/web/src/componentes/SiluetaJugador.tsx`: silueta SVG en línea, con una variante por demarcación (POR, DEF, MED, DEL) y `aria-hidden`.
- [X] T020 [P] [US1] Crear la caché de descripciones de las virtudes en `apps/web/src/estado/catalogo.ts`: carga `GET /api/catalogo/virtudes` una vez por sesión y la expone con un hook.
- [X] T021 [US1] Rehacer `apps/web/src/componentes/CartaJugador.tsx` con las variantes `completa` y `compacta` (contracts/ui.md, research R16):
  - completa: proporción ≈ 5:7, *container queries* y `clamp()` para leerse de 160 a 280 px de ancho; cabecera con `SiluetaJugador`, media y nombre (los textos más grandes); franja con distintivos de posiciones y demarcación justo debajo del nombre; pie con rejilla 2 × 3 de stats (abreviatura y valor) y las virtudes como botones de una línea que pasan a dos líneas con 4;
  - cada virtud es un `<button popovertarget>` que abre un `popover` con la descripción de T020, al pasar el puntero, al tocar o con el teclado;
  - compacta: media, nombre, posiciones y nivel por el color del marco; al tocarla abre la completa;
  - atributo `data-nivel` con el nivel (`Superclase`, `Epico`, `Legendario`, `GOAT`) y etiqueta visible desde `apps/web/src/textos/niveles.ts`.
- [X] T022 [US1] Usar la carta completa en `apps/web/src/pantallas/Draft.tsx`, `apps/web/src/pantallas/Plantillas.tsx` y `apps/web/src/componentes/FichaJugador.tsx`, y la compacta en las listas largas (banquillo de `apps/web/src/pantallas/Alineacion.tsx`), con apertura de la completa (FR-005).
- [X] T023 [US1] Añadir la ruta de pruebas `/_pruebas/cartas` en `apps/web/src/app/Rutas.tsx`, solo con `import.meta.env.DEV`, que pinta todas las cartas de la colección Core con su nivel. Si el servidor no tiene una ruta que liste el catálogo completo, añadir `GET /api/catalogo/jugadores` en `apps/server/src/http/catalogo.ts`.

**Checkpoint**: escenario A del quickstart y `cartas.spec.ts` pasan. SC-001 queda para la prueba con personas (T159).

---

## Phase 4: User Story 4 — Penalizaciones de posición proporcionadas (Priority: P1)

**Goal**: penalización del −10 % dentro de la demarcación y la tabla de FR-032 entre demarcaciones, visible en porcentaje en la alineación.

**Independent Test**: colocar jugadores de cada demarcación en casillas de cada demarcación y comprobar el porcentaje y los stats efectivos (quickstart, escenario H).

### Tests for User Story 4 ⚠️

- [X] T024 [P] [US4] Prueba con tabla en `packages/domain/tests/equipo/statsEfectivos.test.ts` (invariante 9, SC-012):
  - recorre todas las combinaciones de posición de origen (las 15 de campo y POR) y de posición de destino (las 16, más la casilla central `['DCI','DCD']`) para jugadores de una sola posición, y compara con la tabla de FR-031 y FR-032 copiada literalmente de spec.md en la prueba;
  - jugador con varias posiciones: se aplica la menor (MC + MD jugando de DEL → 0,20; MD puro → 0,30);
  - Todocampista: 0 en cualquier casilla de campo y 0,60 en la portería;
  - DEF sin DCI ni DCD en la casilla central de una defensa de 3 o 5 → 0,10;
  - los valores de `parametros.penalizacionPosicion` coinciden con la tabla de la spec.
- [X] T025 [P] [US4] Ampliar `packages/domain/tests/equipo/alineacion.test.ts` (o `autoAlineacion`, si existe su prueba): la alineación automática prefiere al jugador con menor penalización con la tabla nueva.
- [X] T026 [P] [US4] Ampliar `apps/web/tests/e2e/alineacion.spec.ts` con el escenario H: los distintivos «−10 %», «−40 %», «−30 %» y «−60 %» aparecen junto a los stats y la media efectivos en los casos de la tabla del quickstart.
- [X] T027 [P] [US4] Comprobación de SC-011 en `tools/balance/src/checks/colocacion.ts` (nuevo) y registrarla en `tools/balance/src/cli.ts`: en 1.000 partidos, el equipo con los 11 en posiciones naturales gana ≥ 60 % contra el mismo equipo con 3 titulares a −40 %, y contra 3 titulares a −10 % la diferencia de goles media es > 0.

### Implementation for User Story 4

- [X] T028 [US4] Implementar `penalizacionPorPosicion(jugador, destino: { posicionesAdmitidas }, p)` en `packages/domain/src/equipo/statsEfectivos.ts` según data-model.md §3 (pasos 1 a 6, devuelve el mínimo) y hacer que `statsEfectivos` la use. Eliminar `penalizacionPorCasilla`.
- [X] T029 [US4] Actualizar los llamadores: `packages/domain/src/equipo/autoAlineacion.ts` (línea con `penalizacionPorCasilla(j, c, p) > 0`) y cualquier otro que aparezca con `grep -rn penalizacionPorCasilla packages apps tools`.
- [X] T030 [US4] Eliminar `penalizacionFueraPosicion` y `penalizacionPorteria` de `packages/domain/src/parametros/index.ts` (tipo de v2) y de `v2.json`; `v1.json` los conserva para leer partidos antiguos.
- [X] T031 [US4] Mostrar en `apps/web/src/pantallas/Alineacion.tsx`, para cada titular fuera de posición, un distintivo con el porcentaje («−10 %», con `Math.round(penalizacion * 100)`) junto a sus stats y su media efectivos (FR-033).

**Checkpoint**: escenario H del quickstart; `pnpm test` y `pnpm balance --n 1000` (SC-011) pasan.

---

## Phase 5: User Story 11 — Torneos asíncronos: el draft es la única fase síncrona (Priority: P1)

**Goal**: los partidos entre humanos se resuelven una sola vez al abrirlos o al vencer el plazo, con decisiones automáticas iguales para los dos; cada humano los ve cuando quiere y su resultado se oculta hasta verlo.

**Independent Test**: torneo con 2 humanos y NPC; cada humano ve su partido en momentos distintos, los dos ven lo mismo y la jornada se cierra al jugarse todo o al vencer el plazo (quickstart, escenario K).

### Tests for User Story 11 ⚠️

- [X] T032 [P] [US11] Ampliar `packages/domain/tests/torneo/clasificacion.test.ts` (o `torneo.test.ts`): `clasificacionActual(t, { excluirPartidos })` calcula la clasificación sin esos partidos.
- [X] T033 [P] [US11] Prueba de contrato `apps/server/tests/contract/partidos.test.ts`:
  - `POST /api/partidos/:id/abrir` responde `{ modo: 'directo' }` contra un NPC y `{ modo: 'reproduccion' }` contra un humano; `404 PARTIDO_NO_ENCONTRADO`; `409 JORNADA_NO_ABIERTA`;
  - `POST /api/partidos/:id/listo` ya no existe (`404`);
  - `POST /api/partidos/:id/visto` y `POST /api/partidos/:id/revelar` son idempotentes;
  - `GET /api/partidos/:id` con el visionado `pendiente` responde `{ estado: 'pendiente_de_ver' }` sin marcador ni eventos.
- [X] T034 [P] [US11] Reescribir `apps/server/tests/integration/torneo-asincrono.test.ts` (research R8 y R9):
  - liga de 4 con 2 humanos: A abre el partido contra B sin que B esté conectado; se resuelve con las alineaciones guardadas de ambos, `resolucion: 'apertura'`, `abiertoPorId = A`, y nivel `avanzado` en los dos lados;
  - dos `abrir` simultáneos de A y B resuelven el partido una sola vez (mismo `id` de resultado, un solo registro en el torneo);
  - B cambia su alineación antes de que nadie abra el partido y el partido usa la nueva; después de resolverse, la alineación del partido ya no cambia;
  - al vencer el plazo (reloj simulado), los partidos sin abrir se resuelven con `resolucion: 'plazo'` y la jornada se cierra;
  - el partido de A contra un NPC se juega en directo y admite decisiones;
  - en una liga con un solo humano, `venceEn` es `null` y los partidos NPC contra NPC se resuelven al abrir la jornada;
  - rehidratación (R9): una partida de varios humanos que estaba en "directo" recibe un plazo `ahora + plazoJornadaHoras`, y un partido entre humanos en juego se resuelve con `resolverResto`.
- [X] T035 [P] [US11] Ampliar `apps/server/tests/integration/visibilidad.test.ts` (FR-030, research R8):
  - con el visionado `pendiente`, ni `GET /api/partidas/:id/torneo`, ni `torneo.actualizado`, ni `GET /api/partidos/:id`, ni los avisos (`partido_auto_resuelto` sin marcador) revelan el resultado a ese participante; su clasificación se calcula sin el partido, y la del rival que ya lo ha visto, con él;
  - `torneo.actualizado` se envía a cada participante con su vista y llega después del `partido.fin` que lo provoca;
  - el visionado pasa a `visto` o `revelado` y nunca vuelve a `pendiente`;
  - la alineación del rival solo se expone al resolverse el partido (001/FR-054a).
- [X] T036 [P] [US11] Prueba de integración `apps/server/tests/integration/reproduccion.test.ts`:
  - `GET /api/partidos/:id/reproduccion` devuelve a A y a B exactamente los mismos eventos y tramos;
  - los fotogramas recalculados son idénticos entre dos peticiones (caché LRU o no);
  - un partido con parámetros 1.x responde `409 VERSION_NO_REPRODUCIBLE`;
  - la respuesta llega comprimida (`content-encoding`).
- [X] T037 [P] [US11] Prueba de principio a fin `apps/web/tests/e2e/torneo-asincrono.spec.ts` con dos contextos de navegador: pasos 1 a 4 del escenario K.

### Implementation for User Story 11

- [X] T038 [P] [US11] Añadir `excluirPartidos` a `clasificacionActual` en `packages/domain/src/torneo/torneo.ts` y a `packages/domain/src/torneo/clasificacion.ts`.
- [X] T039 [P] [US11] Definir en `packages/protocol/src/http/partidos.ts` (nuevo) los esquemas de `abrir` (`{ modo: 'directo' | 'reproduccion' }`), `reproduccion` (`{ inicio, tramos: [{ desdeTick, hastaTick, fase, eventos, acciones, fotogramas? }], fin }`), `visto`, `revelar` y la respuesta `{ estado: 'pendiente_de_ver' }` de `GET /api/partidos/:id`; exportarlos en `packages/protocol/src/index.ts`.
- [X] T040 [P] [US11] Cambiar en `packages/protocol/src/ws/torneo.ts` el mensaje `torneo.actualizado` (`pendientesDeVer: partidoId[]` y `siguienteJornada: 'manual' | 'automatica'`), y en `packages/protocol/src/ws/partido.ts` añadir `decisiones: boolean` a `partido.inicio`.
- [X] T041 [P] [US11] Crear el repositorio `apps/server/src/persistencia/repos/visionados.ts`: `crearPendientes(partidoId, participanteIds)`, `marcar(partidoId, participanteId, 'visto' | 'revelado')` (nunca vuelve a `pendiente`) y `pendientesDe(participanteId, partidaId)`.
- [X] T042 [US11] Ampliar `apps/server/src/persistencia/repos/partidos.ts` para guardar y leer `resolucion` y `abiertoPorId`.
- [X] T043 [US11] Crear el actor `apps/server/src/actores/partidoEntreHumanos.ts` con el comando `resolverPartidoEntreHumanos(partidoId, { abiertoPorId? })` (research R8): si el partido está `programado`, fija las alineaciones vigentes (o la automática, 001/FR-031), ejecuta `resolverResto` con `niveles = { local: p.asincrono.nivelDecisiones, visitante: p.asincrono.nivelDecisiones }`, guarda el partido `finalizado` con `resolucion` y `abiertoPorId`, crea los dos visionados `pendiente` y registra el resultado en el torneo; si ya está resuelto, no hace nada. Incluir una caché LRU en memoria de 32 partidos para los fotogramas recalculados.
- [X] T044 [US11] Implementar en `apps/server/src/http/partidos.ts` las rutas `POST /api/partidos/:id/abrir` (contra un NPC empieza el partido en directo; contra un humano llama a T043), `GET /api/partidos/:id/reproduccion` (recalcula con semilla y decisiones registradas; `409 VERSION_NO_REPRODUCIBLE` con 1.x), `POST /api/partidos/:id/visto` y `POST /api/partidos/:id/revelar`, y filtrar `GET /api/partidos/:id` con el visionado. Eliminar `POST /api/partidos/:id/listo` de `apps/server/src/http/torneo.ts`.
- [X] T045 [US11] Cambiar el ritmo del torneo en `apps/server/src/actores/torneo.ts` (research R9):
  - con un solo humano: sin plazos (`venceEn = null`), NPC contra NPC resueltos al abrir la jornada;
  - con varios humanos: plazo `plazoJornadaHoras`; la jornada se cierra cuando todos sus partidos han terminado o vence el plazo; al vencer, los partidos entre humanos sin abrir pasan por T043 con `resolucion: 'plazo'` y los partidos en directo contra un NPC se terminan con `resolverResto`.
- [X] T046 [US11] Quitar el temporizador de preparación en `apps/server/src/actores/preparacion.ts` (líneas que leen `preparacionS` y `preparacionInicialS`): `preparacion.inicio.venceEn` solo aparece si hay plazo de jornada.
- [X] T047 [US11] Filtrar la vista del torneo por participante en `apps/server/src/actores/vistas.ts` y enviar `torneo.actualizado` a cada participante por separado (clasificación sin los partidos `pendiente`, partido propio sin marcador, nota con el número de partidos pendientes).
- [X] T048 [US11] En `apps/server/src/avisos/servicio.ts`: `partido_auto_resuelto` no incluye el marcador en un partido entre humanos, y `rival_listo` deja de emitirse.
- [X] T049 [US11] Rehidratación de partidas en curso al desplegar (research R9) en `apps/server/src/actores/gestor.ts` y `apps/server/src/actores/partida.ts`: las de varios humanos en antiguo "directo" reciben `venceEn = ahora + plazoJornadaHoras`; un partido entre humanos en juego se resuelve con `resolverResto`.
- [X] T050 [P] [US11] Añadir en `apps/web/src/api/cliente.ts` las llamadas `abrirPartido`, `obtenerReproduccion`, `marcarVisto` y `revelarResultado`.
- [X] T051 [US11] Crear la pantalla `apps/web/src/pantallas/ReproduccionPartido.tsx` (partido entre humanos ya resuelto): carga `GET /api/partidos/:id/reproduccion`, reproduce con los componentes de `apps/web/src/campo2d/` (o el resumen de eventos si la partida es de simulación rápida) a la velocidad del propio usuario, sin panel de cambios; «Finalizar partido» salta al final sin pedir nada al servidor; al llegar al final o al finalizar llama a `marcarVisto`. Añadir su ruta en `apps/web/src/app/Rutas.tsx`.
- [X] T052 [US11] En `apps/web/src/pantallas/Torneo.tsx`: el partido propio pendiente aparece como «Pendiente de ver», sin marcador, con «Ver partido» y «Mostrar resultado», y bajo la clasificación la nota «No incluye 1 partido pendiente de ver».
- [X] T053 [US11] En `apps/web/src/pantallas/Alineacion.tsx` y `apps/web/src/pantallas/Partido.tsx`: «Comenzar partido» (rival NPC) o «Ver partido» (rival humano) llaman a `abrirPartido` y navegan al directo o a `ReproduccionPartido` según `modo`.

**Checkpoint**: escenario K, pasos 1 a 4; `pnpm test:integration` pasa.

---

## Phase 6: User Story 2 — Avanzar sin esperas con el botón «Siguiente» (Priority: P1)

**Goal**: en cada espera hay un botón de avanzar con la etiqueta adecuada; fuera del draft avanza al instante, y en el draft se ve a quién se espera.

**Independent Test**: partida de 1 humano contra NPC, del draft al final del torneo, pulsando siempre el botón y sin esperar nunca a un temporizador (quickstart, escenario C).

### Tests for User Story 2 ⚠️

- [X] T054 [P] [US2] Prueba de integración `apps/server/tests/integration/avanzar.test.ts`:
  - draft de 1 humano y 7 NPC: tras la elección del humano, el siguiente `draft.turno` llega en < 1 s; los NPC eligen al abrir el turno;
  - draft de 2 humanos: `draft.progreso.pendientes` lista solo a los humanos que faltan, y el turno se resuelve en cuanto eligen todos o vence el tiempo;
  - `POST /api/partidos/:id/abrir` contra un NPC empieza el partido al instante; `partido.seguir` del único humano reanuda al instante;
  - `POST /api/partidas/:id/siguiente-jornada`: abre la siguiente jornada y resuelve los NPC contra NPC; `409 JORNADA_ABIERTA`, `409 TORNEO_TERMINADO`, `403 HAY_VARIOS_HUMANOS`;
  - pulsaciones repetidas con el mismo `requestId`, o seguidas con `requestId` distintos, producen una sola transición (FR-016).
- [X] T055 [P] [US2] Prueba de principio a fin `apps/web/tests/e2e/avanzar-solo.spec.ts`: escenario C completo, comprobando que ninguna transición espera a un temporizador y que el draft con elecciones inmediatas dura < 5 min (SC-004, sin animación; la animación se añade en US10).
- [X] T056 [P] [US2] Prueba de principio a fin `apps/web/tests/e2e/draft-varios.spec.ts`: escenario D, pasos 1 y 2 («Esperando a: B»).

### Implementation for User Story 2

- [X] T057 [P] [US2] En `packages/protocol/src/ws/draft.ts`, añadir `pendientes: { id, nombre }[]` a `draft.progreso`; en `packages/protocol/src/ws/partido.ts`, quitar `listos` de `partido.pausa_decision`; en `packages/protocol/src/http/partidas.ts`, añadir el esquema de `siguiente-jornada`.
- [X] T058 [US2] En `apps/server/src/actores/draft.ts`: emitir `pendientes` (solo humanos sin elegir) en cada `draft.progreso` y resolver el turno en cuanto todos han elegido o vence el tiempo (FR-013, FR-014).
- [X] T059 [US2] En `apps/server/src/actores/partidoRapido.ts`: el descanso y la pausa antes de la prórroga esperan solo al único humano; `partido.seguir` reanuda al instante; quitar la lógica de dos humanos listos.
- [X] T060 [US2] Añadir el comando `siguienteJornada` en `apps/server/src/actores/torneo.ts` (solo con un humano y la jornada actual `cerrada`; idempotente) y la ruta `POST /api/partidas/:id/siguiente-jornada` en `apps/server/src/http/torneo.ts` con los errores de contracts/http-api.md.
- [X] T061 [P] [US2] Crear `apps/web/src/componentes/BotonAvanzar.tsx` (research R18, contracts/ui.md): recibe la situación (`fin_draft`, `preparacion`, `pausa`, `fin_partido`, `fin_jornada`, `fin_torneo`) y el tipo de rival, pone la etiqueta («Preparar equipo», «Comenzar partido» o «Ver partido», «Seguir», «Siguiente», «Siguiente jornada», «Volver al menú»), genera un `requestId` por pulsación y se desactiva hasta recibir respuesta. Con varios humanos y partidos pendientes al final de la jornada, muestra «Esperando a que se jueguen los demás partidos (vence …)» sin botón.
- [X] T062 [US2] Usar `BotonAvanzar` en `apps/web/src/pantallas/Draft.tsx` (fin del draft y «Esperando a: …» con `pendientes`), `apps/web/src/pantallas/Alineacion.tsx`, `apps/web/src/pantallas/PartidoRapido.tsx`, `apps/web/src/pantallas/Partido2D.tsx` (pausas y final) y `apps/web/src/pantallas/Torneo.tsx` (fin de jornada y de torneo).
- [X] T063 [P] [US2] Añadir `siguienteJornada` en `apps/web/src/api/cliente.ts`.

**Checkpoint**: escenarios C y D (pasos 1 y 2). SC-003: cada transición < 1 s.

---

## Phase 7: User Story 3 — Simulación 2D fluida, realista y con velocidades coherentes (Priority: P1)

**Goal**: capa espacial continua y determinista en el motor, acciones con origen y destino reales, reloj lineal de 4, 2 y 1 minuto a x2, x4 y x8, y reproducción suave.

**Independent Test**: reproducir partidos 2D completos a cada velocidad, cronometrar, observar las secuencias de juego y comparar las estadísticas con los stats (quickstart, escenario F).

**Referencia**: las magnitudes de esta fase (tiempo visual, descuento acotado, búfer de 60 ticks, pausas, tanda, balón parado, efectos de la táctica y mínimos de SC-007) están fijadas en spec.md tras la revisión de [checklists/simulacion-2d.md](./checklists/simulacion-2d.md).

### Tests for User Story 3 ⚠️

- [X] T064 [P] [US3] Pruebas de propiedades en `packages/engine/tests/espacio/aritmetica.test.ts` (fast-check): `isqrt(n)` es el mayor entero cuyo cuadrado ≤ n; la normalización de vectores conserva la dirección con error ≤ 1 décima; ninguna función devuelve valores no enteros.
- [X] T065 [P] [US3] Prueba de cinemática `packages/engine/tests/cinematica.test.ts` (invariante 6, sustituto de SC-007a), sobre 50 partidos con semilla y fotogramas:
  - ningún jugador supera la velocidad ni la aceleración máximas de `parametros.espacio`;
  - ninguna pareja de jugadores queda más cerca que el radio de separación durante más de 2 ticks seguidos;
  - el balón solo cambia de posición dentro de una `AccionVisible` o pegado a su portador;
  - en fase defensiva, como mucho 2 jugadores del equipo sin balón tienen el balón como objetivo; con la presión coordinada marcada en el estado, como mucho 3, solo con Presión alta y durante ≤ 5 s tras una pérdida rival en su campo;
  - la distancia entre líneas consecutivas de un equipo está entre 10 y 25 m con balón y entre 8 y 18 m sin balón fuera de las transiciones (en ≥ 95 % de los ticks);
  - tras una expulsión, las anclas de la línea afectada se reparten entre los que quedan.
- [X] T066 [P] [US3] Reescribir `packages/engine/tests/fotogramas.test.ts` (research R5, invariante 7):
  - formato v2 `[tick, bx, by, bz, x0, y0, …]` en el orden de `ordenJugadores`, enteros en unidades de campo, `-1, -1` fuera del campo;
  - un fotograma cada 2 ticks más uno al inicio y al final de cada acción;
  - `avanzar(e, m, { fotogramas: true })` y `avanzar(e, m)` dan el mismo estado, eventos y acciones.
- [X] T067 [P] [US3] Prueba de acciones y estadísticas `packages/engine/tests/acciones.test.ts`:
  - cada tramo devuelve `acciones` con `tipo`, `inicioTick`, `finTick`, `de`, `a?` y `exito`, de los tipos de data-model.md §7.5;
  - la duración de cada acción sale de la física y respeta los límites de FR-025 a x2 (pase de 25 m entre 0,5 y 0,9 s reales, pase largo de 40 m ≤ 1,5 s, centro ≤ 1,3 s, tiro ≤ 0,7 s, despeje ≤ 1,5 s; ningún jugador a más de 9 m/s visuales), y un jugador con +20 de velocidad corre ≥ 15 % más rápido;
  - en cada interrupción, los jugadores se colocan para el balón parado (FR-022a) y el balón sale desde el punto del saque;
  - `estadisticas.pases` no incluye centros; `centros`, `pasesCompletados` y `precisionPase = round(100 · pasesCompletados / pases)` son coherentes con `acciones`; `secuencias` suma el número de posesiones (FR-024: una falta o un saque a favor no cortan la posesión);
  - `conducciones`, `paredes`, `cambiosOrientacion` y `contraataques` siguen las definiciones de research R4.
- [X] T068 [P] [US3] Prueba del descuento en `packages/engine/tests/descuento.test.ts`: en 500 partidos, el descuento de cada parte reglamentaria está entre `descuentoMinS` y `descuentoMaxS` (60–180 s) (research R2).
- [X] T069 [P] [US3] Comprobar que `packages/engine/tests/equivalencia.test.ts` (rápida = 2D, 001/SC-008) sigue siendo válida con la capa espacial, y añadir el invariante 6b: encadenar `avanzar('ticks', { hastaTick })` con cortes aleatorios da los mismos eventos, acciones, marcador y estado final que encadenar `avanzar('interrupcion')`.
- [X] T070 [P] [US3] Pruebas del reloj de reproducción en `apps/web/tests/unit/relojReproduccion.test.ts` (SC-005, SC-006):
  - ticks por segundo real = `23,5 × velocidad / 2` (23,5, 47 y 94);
  - todos los minutos de juego duran lo mismo a velocidad fija (±10 % como máximo; en la práctica, 0 %);
  - con descuentos de 1 a 3 minutos, cada parte dura 2 min, 1 min y 30 s a x2, x4 y x8 (±5 %), y el partido 4, 2 y 1 min;
  - las pausas anunciadas (gol 2.000 ms reales a cualquier velocidad, descanso, antes de la prórroga y «Cargando…» con el búfer vacío) no avanzan el reloj de juego; tras «Cargando…» sigue a la misma velocidad, sin acelerar;
  - cada lanzamiento de la tanda dura 3.000, 1.500 y 750 ms a x2, x4 y x8;
  - cambiar de velocidad a mitad de partido se aplica al instante y no cambia el tick en curso ni el orden de los eventos; durante una pausa no cambia su duración;
  - la velocidad por defecto es x2 y se recuerda la última elegida (`localStorage['fbd.velocidad2d']`, con `try/catch`).
- [X] T071 [P] [US3] Pruebas de interpolación en `apps/web/tests/unit/interpolacion.test.ts`: Hermite cúbica con continuidad de posición y velocidad entre fotogramas; parábola en `z` dentro de una acción aérea; sin sobrepasar ningún punto de control más de un radio de chapa.
- [X] T072 [P] [US3] Reescribir `apps/server/tests/integration/partido-2d.test.ts` (research R6):
  - el servidor mantiene simulados 60 ticks por delante del último tick informado por `partido.reproduccion`, y nunca más (FR-025a);
  - nunca adelanta el descanso ni el final del tiempo reglamentario de una eliminatoria;
  - una decisión pedida a x8 se aplica en la primera interrupción aún no simulada (como mucho 60 ticks más lo que tarde esa interrupción) y llega `partido.decision_aplicada` con el minuto;
  - los `partido.tramo` llegan en orden y sin huecos de ticks, con `acciones` y `provisional: false`;
  - `partido.velocidad` se rechaza (mensaje desconocido) y `partido.reproduccion` solo se acepta en un partido en directo contra un NPC;
  - sin informes de reproducción el búfer no crece; al reconectar, `estado` trae `{ tramos, ultimoTickInformado, pausa? }`.
- [X] T073 [P] [US3] Reescribir `apps/web/tests/e2e/partido-2d.spec.ts`: velocidades x2, x4 y x8 (por defecto x2, recordada al recargar), rótulo «¡GOL!» y descanso con «Seguir», «Se aplicará en el minuto N» tras pedir un cambio, estadísticas finales con pases intentados y completados, precisión de pase, centros y tiros (FR-024), y a 360 px el campo, el marcador y los controles visibles sin desbordar (FR-025b).
- [X] T074 [P] [US3] Comprobaciones SC-007 y SC-008 en `tools/balance/src/checks/partido.ts`: entre equipos equilibrados (media ±2) con la táctica por defecto, de media entre los dos ≥ 150 pases completados, ≥ 10 centros, ≥ 15 tiros, ≥ 30 conducciones, ≥ 3 paredes, ≥ 5 cambios de orientación, ≥ 3 contraataques y ≥ 30 % de posesiones con 3 o más pases (con `secuencias`); con +10 de pase en los MED titulares, ≥ 10 % más pases completados en número absoluto. Mantener las comprobaciones de los SC de la spec 001 (001/SC-004, SC-006, SC-007, SC-010 y SC-015).

### Implementation for User Story 3

- [X] T075 [US3] Rellenar el bloque `espacio` de `packages/domain/src/parametros/v2.json` y su tipo (data-model.md §1), todo en unidades por tick y en tiempo visual a x2 (FR-025): velocidad máxima según el stat de velocidad (+20 puntos → ≥ +15 %, tope 9 m/s), aceleración y frenada, radio de separación, velocidades del balón por tipo (raso, largo, centro, tiro, despeje) dentro de los límites de FR-025, factores de basculación por línea, distancias entre líneas (10–25 m con balón, 8–18 m sin balón), desplazamiento del bloque por táctica (tabla de FR-023) y presionadores (2; 3 en presión coordinada con Presión alta, ≤ 5 s).
- [X] T076 [P] [US3] Crear `packages/engine/src/espacio/aritmetica.ts`: enteros en décimas de unidad, `isqrt`, `dist2`, normalización de vectores con `isqrt` y sin trigonometría (research R3).
- [X] T077 [P] [US3] Crear `packages/engine/src/espacio/balon.ts`: el balón pegado al portador en conducción, en vuelo de origen a destino en pases, centros, tiros y despejes (velocidad por tipo y distancia, altura `z` en los aéreos) y parado en las interrupciones.
- [X] T078 [US3] Crear `packages/engine/src/espacio/objetivos.ts`: objetivo de cada jugador desde su ancla, desplazado por la fase del equipo (con balón se adelanta y abre; sin balón se repliega y cierra), la basculación según el balón con factores por línea, el rol en la jugada (ofrecer línea de pase, desmarque de ruptura, acompañar, presionar, cubrir, marcar) y la táctica según la tabla de FR-023 (zona o individual, catenaccio, medio o presión alta, línea adelantada, estilo con balón, juego vertical). Como mucho 2 jugadores van al balón; la presión coordinada (hasta 3, solo con Presión alta, ≤ 5 s tras una pérdida rival en su campo) se marca en el estado. Incluye la colocación simplificada de balón parado (FR-022a) y el reparto de anclas tras una expulsión o lesión sin cambio (research R3).
- [X] T079 [US3] Crear `packages/engine/src/espacio/movimiento.ts`: *steering* hacia el objetivo con velocidad máxima según el stat de velocidad y el cansancio, aceleración y frenada máximas, y repulsión de separación entre chapas.
- [X] T080 [US3] Ampliar `packages/engine/src/estado/estado.ts` y `packages/engine/src/tipos.ts` (data-model.md §7.4): `JugadorEnPartido.ancla` (de momento, el punto de su casilla) y `posicion`; `EquipoEstado.perfil`; `espacio` con jugadores `{ x, y, vx, vy }` y balón `{ x, y, z, vx, vy, accion }` en coordenadas absolutas y décimas; `posesion = { inicioTick, pasesSeguidos }`; `balon.zona` y `balon.carril` derivados de `espacio.balon`.
- [X] T081 [US3] Reescribir `receptor` y `rivalCercano` en `packages/engine/src/acciones/contexto.ts` sobre las posiciones reales de `espacio`.
- [X] T082 [US3] Crear `packages/engine/src/acciones/opciones.ts` (research R4): puntuación espacial de pase por compañero (lo libre que está, distancia, líneas superadas, carril) y de conducir, regatear, centrar, tirar y despejar; multiplicada por `pesosAcciones` de la táctica; con más visión se ven opciones más lejanas y con más pase se elige mejor.
- [X] T083 [US3] Cambiar `packages/engine/src/acciones/juego.ts`: elegir la acción con `opciones.ts`; resolver el duelo con el rival real más cercano a la trayectoria o al portador y la distancia como ajuste; duración física de cada acción (vuelo, recorrido o tiempo de control) en lugar de la tabla `DURACION`; emitir una `AccionVisible` por acción con balón; contar `pases`, `pasesCompletados`, `centros` y `secuencias`.
- [X] T084 [US3] Cambiar `packages/engine/src/tramos/avanzar.ts`: un paso espacial (objetivos → movimiento → balón) por tick; descuento de cada parte reglamentaria acotado a `[reproduccion.descuentoMinS, reproduccion.descuentoMaxS]` (sustituye a `calcularDescuento`, que llegaba a 6 min); modo nuevo `'ticks'` con `hastaTick`, que para sin crear interrupción (contracts/engine-api.md); devolver `acciones` en `ResultadoTramo`.
- [X] T085 [US3] Reescribir `packages/engine/src/tramos/fotogramas.ts` con el formato v2 (cada 2 ticks más inicio y fin de acción) y devolver `ordenJugadores` en `ResultadoTramo` cuando se piden fotogramas, sin consumir el PRNG del partido.
- [ ] T086 [US3] Ajustar `packages/engine/bench/partido.bench.ts` y optimizar hasta ≤ 25 ms por partido sin fotogramas y ≤ 40 ms con fotogramas (Node 22).
- [X] T087 [US3] Recalibrar `acciones` en `packages/domain/src/parametros/v2.json` (tiempos de control por stat, pesos de la puntuación espacial, probabilidades base) con `pnpm balance --n 1000` hasta cumplir SC-007, SC-008 y los SC estadísticos de la spec 001 (goles por partido, ventaja de la estrategia, orden de los NPC, lesiones).
- [X] T088 [P] [US3] Cambiar `packages/protocol/src/ws/partido2d.ts` y `packages/protocol/src/ws/partido.ts` según contracts/realtime-protocol.md: eliminar `partido.velocidad` en los dos sentidos; `partido.reproduccion = { partidoId, tick, velocidad: 2 | 4 | 8 }`; `partido.tramo` con fotogramas v2, `acciones` y `provisional: false`; `partido.inicio` con `ordenJugadores`; vista `estado` del 2D `{ tramos, ultimoTickInformado, pausa? }`; `partido.fin` con `centros` y `precisionPase`.
- [X] T089 [US3] Reescribir `apps/server/src/actores/partido2d.ts` con el búfer de anticipación (research R6): eliminar `Velocidad2D` 16 y 32, `VELOCIDAD_INICIAL`, `VELOCIDAD_MINIMA`, `ESPERA_DESCONECTADO_MS` y `procesarVelocidad`; simular con `avanzar('ticks', { hastaTick: ultimoTickInformado + reproduccion.anticipacionTicks })` para mantener exactamente 60 ticks por delante; paradas duras en el descanso y en el final reglamentario de una eliminatoria; decisiones en la primera interrupción no simulada; sin informes, el partido queda en pausa.
- [X] T090 [US3] Adaptar `apps/server/src/actores/partidoRapido.ts`, `apps/server/src/ws/pasarela.ts` y la ruta de reproducción de `apps/server/src/http/partidos.ts` a las firmas nuevas (acciones, fotogramas v2, `ordenJugadores`).
- [X] T091 [US3] Reescribir `apps/web/src/campo2d/relojReproduccion.ts`: avance lineal de `reproduccion.ticksPorSegundoX2 × velocidad / 2` ticks por segundo real, pausas anunciadas (gol `pausaGolMs`, descanso, antes de la prórroga) que no avanzan el reloj de juego, «Cargando…» si se vacía el búfer (sigue a la misma velocidad, sin acelerar), tanda a `tandaLanzamientoMsX2 × 2 / velocidad` por lanzamiento, velocidad por defecto x2 recordada en `localStorage['fbd.velocidad2d']`, y envío de `partido.reproduccion` con la velocidad cada ~250 ms.
- [X] T092 [P] [US3] Reescribir `apps/web/src/campo2d/interpolacion.ts` con Hermite cúbica sobre fotogramas v2 (velocidades estimadas de los vecinos) y parábola en `z` dentro de las acciones aéreas.
- [X] T093 [P] [US3] Cambiar `apps/web/src/campo2d/renderizador.ts`: orientación de cada chapa según su velocidad interpolada, balón con sombra y tamaño según `z`, y rótulo breve de la acción en curso.
- [X] T094 [US3] Cambiar `apps/web/src/pantallas/Partido2D.tsx`: botones x2, x4 y x8 (por defecto la última elegida, o x2), rótulo «¡GOL!» durante 2 s, descanso y antes de la prórroga con «Seguir», «Cargando…», «Se aplicará en el minuto N» tras confirmar un cambio, tanda de penaltis en el campo, sin rótulos animados con `prefers-reduced-motion` y un diseño que no se rompa a 360 px (FR-025b); quitar el aviso de velocidad efectiva entre humanos.
- [X] T095 [P] [US3] Mostrar en `apps/web/src/componentes/Estadisticas.tsx` los pases intentados y completados, la precisión de pase, los centros y los tiros de cada equipo (FR-024).
- [X] T096 [US3] Adaptar `apps/web/src/pantallas/ReproduccionPartido.tsx` al reloj y la interpolación nuevos.

**Checkpoint**: escenario F; `pnpm test`, `pnpm test:equivalence`, `pnpm balance --n 1000` y `pnpm --filter @fbd/engine bench` pasan. SC-007a y SC-009 quedan para T159.

---

## Phase 8: User Story 5 — Finalizar el partido en cualquier momento (Priority: P2)

**Goal**: «Finalizar partido» simula al instante el resto con el mismo motor, y el resultado es el mismo que viendo el partido entero.

**Independent Test**: finalizar un partido 2D en distintos minutos y comparar con la reproducción completa con la misma semilla y decisiones (quickstart, escenario G).

### Tests for User Story 5 ⚠️

- [X] T097 [P] [US5] Prueba de equivalencia `packages/ai/tests/equivalenciaFinalizar.test.ts` (invariante 5, SC-010): para cortes en el tick 0, el minuto 30, el descanso, el 89 y la prórroga, y la misma lista de decisiones, encadenar `avanzar('interrupcion')` hasta el corte y después `resolverResto` da los mismos eventos, marcador y estadísticas que encadenar `avanzar('interrupcion')` hasta el final con `decidirNPCEnPausa` en las paradas. Incluir una sustitución pendiente en el corte. Cambiar el script `test:equivalence` del `package.json` raíz a `vitest run --project engine --project ai equivalencia`.
- [X] T098 [P] [US5] Prueba de integración `apps/server/tests/integration/finalizar.test.ts`:
  - `partido.finalizar` en el minuto 30 de un 2D contra un NPC: `ack`, los `partido.tramo` que faltan por partes y `partido.fin` en < 3 s; es idempotente;
  - una sustitución pendiente se aplica en la primera interrupción no simulada;
  - en una eliminatoria empatada incluye la prórroga y la tanda;
  - durante el descanso cierra la ventana sin cambios; después no llega ningún `partido.pausa_decision`;
  - en la simulación rápida, `partido.finalizar` en la primera parte y en el descanso lleva al resultado final;
  - durante la pausa de un gol, `partido.finalizar` la cierra y resuelve el resto.
- [X] T099 [P] [US5] Prueba de principio a fin `apps/web/tests/e2e/finalizar.spec.ts`: escenario G, pasos 1, 3, 4 y 5.

### Implementation for User Story 5

- [X] T100 [P] [US5] Añadir `partido.finalizar { requestId, partidoId }` (cliente → servidor) en `packages/protocol/src/ws/partido.ts`.
- [X] T101 [US5] Implementar el comando de finalizar en `apps/server/src/actores/partidoRapido.ts` y `apps/server/src/actores/partido2d.ts`: en cualquier fase menos `finalizado` (en la 2D y en la rápida, también durante la primera parte y la pausa de un gol), aplicar las decisiones pendientes al reanudar, ejecutar `resolverResto` con el nivel del NPC rival, enviar un `partido.tramo` por parte y después `partido.fin`; guardar con `resolucion: 'directo'`. Enrutar el mensaje en `apps/server/src/ws/pasarela.ts`.
- [X] T102 [US5] Añadir «Finalizar partido» en `apps/web/src/pantallas/Partido2D.tsx`: siempre visible; indicador de progreso si la respuesta tarda más de 300 ms; muestra los eventos según llegan y el resumen completo al final (FR-027).
- [X] T103 [US5] Añadir «Finalizar partido», visible en todo momento, a `apps/web/src/pantallas/PartidoRapido.tsx` (FR-028).

**Checkpoint**: escenario G; `pnpm test:equivalence` pasa.

---

## Phase 9: User Story 6 — Barra de navegación siempre disponible (Priority: P2)

**Goal**: barra en todas las pantallas; modal de abandono solo al salir de un draft con otros humanos; pausa al salir de una partida en solitario.

**Independent Test**: navegar desde cada pantalla al menú principal y comprobar cuándo aparece el modal y qué pasa al aceptarlo o cancelarlo (quickstart, escenarios D y E).

### Tests for User Story 6 ⚠️

- [X] T104 [P] [US6] Prueba de integración `apps/server/tests/integration/navegacion.test.ts` (research R10 y R11):
  - `partida.pausar` en un draft de un humano detiene el turno, guarda `restante_ms` y `pausada_en`, y responde `partida.pausada { pausada: true }`; al reconectar, `venceEn = ahora + restanteMs`;
  - `partida.pausar` no tiene efecto en la fase de torneo con varios humanos;
  - `POST /api/partidas/:id/abandonar` en un draft con otro humano: la plaza pasa a un NPC `intermedio`, que elige al instante si no había elegido, el turno se resuelve en cuanto faltan solo ausentes y el humano deja de recibir mensajes de la partida;
  - `GET /api/mis-partidas` devuelve `{ enCurso, terminadas }` con `accionPendiente`.
- [X] T105 [P] [US6] Prueba de principio a fin `apps/web/tests/e2e/navegacion.spec.ts`: escenario D, paso 3 (modal, cancelar y abandonar) y escenario E (sin modal en solitario, reanudación con el tiempo que quedaba, cierre de la pestaña con elección automática, menú principal a 1 clic desde cada pantalla).

### Implementation for User Story 6

- [X] T106 [P] [US6] Añadir `partida.pausar { requestId }` (cliente → servidor) y `partida.pausada { pausada }` (servidor → cliente) en `packages/protocol/src/ws/base.ts` (o un fichero nuevo `packages/protocol/src/ws/partida.ts`), y `PartidaResumen` y la respuesta de `GET /api/mis-partidas` en `packages/protocol/src/http/partidas.ts`.
- [X] T107 [US6] Pausar y reanudar el draft en solitario en `apps/server/src/actores/draft.ts` y `apps/server/src/persistencia/repos/draft.ts` (`pausada_en`, `restante_ms`; data-model.md §6.2), y la ventana del descanso del directo contra un NPC en `apps/server/src/actores/partidoRapido.ts`; reanudar al reconectar. Enrutar `partida.pausar` en `apps/server/src/ws/pasarela.ts`.
- [X] T108 [US6] Ampliar `POST /api/partidas/:id/abandonar` en `apps/server/src/http/torneo.ts` y el actor de la partida a la fase de draft (research R11).
- [X] T109 [US6] Añadir `GET /api/mis-partidas` en `apps/server/src/http/partidas.ts`, con `accionPendiente` (`elegir`, `jugar`, `ver` o `siguiente_jornada`).
- [X] T110 [US6] Migrar `apps/web/src/app/Rutas.tsx` de `BrowserRouter` a `createBrowserRouter` y `RouterProvider` (necesario para `useBlocker`), con todas las rutas bajo una ruta de diseño `Marco`.
- [X] T111 [US6] Crear `apps/web/src/app/Marco.tsx` (contracts/ui.md): barra con Inicio, «Mis partidas», «Nueva partida», «Cuenta» o «Iniciar sesión»; versión de solo iconos de ≤ 40 px durante el partido 2D; modal «¿Abandonar la partida?» con `useBlocker` solo con `fase === 'draft'` y otro humano activo (botones «Seguir en el draft» y «Abandonar»); sin modal en una partida de un solo humano, envía `partida.pausar` antes de salir.
- [X] T112 [P] [US6] Crear la pantalla `apps/web/src/pantallas/MisPartidas.tsx` con las partidas en curso y terminadas y un acceso a la acción pendiente de cada una.
- [X] T113 [US6] Mover la conexión de la partida activa de un invitado al estado global (`apps/web/src/conexion/` y `apps/web/src/estado/sesion.ts`), para que siga abierta mientras navega a otras secciones (research R10).

**Checkpoint**: escenarios D (paso 3) y E; SC-013.

---

## Phase 10: User Story 7 — Colocación libre de los jugadores en la pantalla de tácticas (Priority: P2)

**Goal**: arrastrar a cualquier titular de campo a cualquier zona; posición efectiva, penalización y ofensividad se derivan de la colocación, y el motor la usa.

**Independent Test**: arrastrar jugadores entre zonas y comprobar la posición efectiva, la penalización y la formación personalizada, y que el partido usa esa colocación (quickstart, escenario I).

### Tests for User Story 7 ⚠️

- [X] T114 [P] [US7] Pruebas de zonas en `packages/domain/tests/equipo/zonas.test.ts`: las zonas cubren el campo (x 0–1000, y 0–640) sin huecos ni solapes (rectángulos semiabiertos `[x0, x1) × [y0, y1)`); la zona de portería (x en [0, 110), y en [200, 440)) tiene prioridad y admite `['POR']`; cada casilla de las 10 formaciones cae en una zona que admite su posición.
- [X] T115 [P] [US7] Pruebas de colocación en `packages/domain/tests/equipo/colocacion.test.ts` (invariante 8):
  - con la colocación de la propia formación: `personalizada === false`, y `ofensividad` y `amplitud` iguales a la tabla de la spec 001 en las 10 formaciones;
  - un defensa más adelantado a delantero suma +2 de ofensividad; ambas se acotan a [−3, +3];
  - 4-4-2 con un MC en la zona de delanteros: `personalizada`, reparto `{ defensa: 4, medio: 3, ataque: 3 }` y ofensividad +1;
  - 4-3-3 con un SD natural en la casilla DC, movido a la zona SD: `posicionEfectiva === 'SD'` y penalización 0;
  - `avisos` con menos de 3 defensas, más de 5 delanteros o una línea vacía;
  - dos titulares en el mismo punto quedan separados ≥ 30 unidades.
- [X] T116 [P] [US7] Ampliar `packages/domain/tests/equipo/alineacion.test.ts` con la validación de `colocacion` (FR-034a): cada `jugadorId` es titular y aparece una vez; coordenadas enteras dentro del campo; el titular de la casilla `POR` en la zona de portería y ningún otro en ella; motivos `PORTERO_FUERA_DE_PORTERIA`, `JUGADOR_EN_PORTERIA` y `COLOCACION_FUERA_DEL_CAMPO`.
- [X] T117 [P] [US7] Prueba del motor `packages/engine/tests/colocacion.test.ts`: con `ancla`, el jugador parte de ese punto y juega con la posición efectiva de su zona; `perfil` es el calculado; una sustitución hereda el ancla del que sale; la decisión `formacion` restablece las anclas salvo que traiga `colocacion`; `recolocacion` admite `colocacion`.
- [X] T118 [P] [US7] Ampliar `apps/server/tests/contract/alineacion.test.ts`: `PUT /api/partidas/:id/alineacion` con `colocacion` (válida e inválida con los tres motivos nuevos de `422 ALINEACION_INVALIDA`) y `POST /api/partidas/:id/alineacion/previsualizar` con la forma `Previsualizacion` de contracts/engine-api.md.
- [X] T119 [P] [US7] Comprobación de SC-018 en `tools/balance/src/checks/colocacion.ts`: en 1.000 partidos contra el mismo rival, la colocación con un delantero más y un defensa menos marca y recibe más goles de media que la formación de partida.
- [X] T120 [P] [US7] Prueba de principio a fin `apps/web/tests/e2e/tacticas.spec.ts`: escenario I, pasos 1 a 4, y la alternativa con teclado (seleccionar y colocar).

### Implementation for User Story 7

- [X] T121 [US7] Ajustar las coordenadas de casillas en `packages/domain/src/equipo/formaciones.ts` (data-model.md §2): 4-2-3-1 MC 330 → 410; 3-5-2 CI y CD 430 → 410; 5-4-1 DC 720 → 770; 5-3-2 DC 740 → 770; 4-5-1 DC 740 → 770; 5-4-1 y 5-3-2 CI y CD de la defensa de 5, 240 → 250.
- [X] T122 [US7] Crear `packages/domain/src/equipo/zonas.ts` con la rejilla de data-model.md §2 (carriles BI [0,140), II [140,240), C [240,400), ID [400,500), BD [500,640]; tramos de x por carril con su posición y su `linea`; zona central `['DCI','DCD']`; zona de portería con prioridad) y `zonaEn(x, y)`.
- [X] T123 [US7] Crear `packages/domain/src/equipo/colocacion.ts`: posición efectiva por titular (la de su zona; en la casilla `POR`, siempre `POR`), `personalizada`, `reparto` por `linea`, `ofensividad = perfil.ofensividad + Σ (peso(linea efectiva) − peso(linea de su casilla)) + β · (x̄ colocación − x̄ casillas) / 100` con pesos −1, 0 y +1, `amplitud = perfil.amplitud + γ · (dispersión lateral colocación − dispersión casillas) / 100`, ambas acotadas a ±`colocacion.limite`, `avisos` y separación de superpuestos a `colocacion.separacionMinima` (research R13).
- [X] T124 [US7] Ampliar `packages/domain/src/equipo/alineacion.ts`: campo opcional `colocacion: { jugadorId, x, y }[]` con la validación de T116, y `previsualizar` con la forma ampliada (`titulares` con `posicionEfectiva`, `zonaId`, `x`, `y`; `personalizada`, `reparto`, `ofensividad`, `amplitud`, `avisos`). Exportar `zonas` y `colocacion` en `packages/domain/src/index.ts`.
- [X] T125 [US7] Usar la colocación en el motor: `ancla` opcional en los titulares de `EquipoPartido` (`packages/engine/src/tipos.ts`); `ancla` y `posicion` de cada `JugadorEnPartido` y `perfil` del equipo en `packages/engine/src/estado/estado.ts`; `ofensividad` y `amplitud` de `packages/engine/src/modificadores/formacionTactica.ts` leen `EquipoEstado.perfil`; `recolocacion` con `colocacion` y herencia del ancla en las sustituciones en `packages/engine/src/tramos/decisiones.ts`.
- [X] T126 [US7] Aceptar `colocacion` en `packages/protocol/src/http/alineacion.ts`, validarla y guardarla en `apps/server/src/http/alineacion.ts`, y construir la `EntradaPartido` con `ancla` en `apps/server/src/actores/preparacion.ts`.
- [X] T127 [US7] Crear `apps/web/src/componentes/CampoTacticas.tsx` (contracts/ui.md): arrastre con Pointer Events de cualquier titular de campo a cualquier punto fuera de la zona de portería, portero limitado a ella; zona bajo el puntero resaltada con su código; al soltar, cálculo con `previsualizar` de `@fbd/domain` (< 1 ms, SC-016); alternativa con teclado (seleccionar, colocar con flechas, `Escape` para cancelar).
- [X] T128 [US7] Usar `CampoTacticas` en `apps/web/src/pantallas/Alineacion.tsx` en lugar de `CampoAlineacion` en las tácticas: «Formación personalizada (4-3-3 → 4-2-4)», reparto por líneas, «Ofensividad +2», y avisos de desequilibrio antes de confirmar sin bloquear.

**Checkpoint**: escenario I; `pnpm balance --n 1000` (SC-018).

---

## Phase 11: User Story 8 — Dorsales del 1 al 24 sin duplicados (Priority: P3)

**Goal**: dorsales iniciales del 1 al 24; reasignación libre de 1 a 99 en la que el compañero pierde el dorsal; asignación automática al empezar un partido.

**Independent Test**: formar una plantilla, comprobar los dorsales del 1 al 24 y reasignar hasta provocar un conflicto (quickstart, escenario J).

### Tests for User Story 8 ⚠️

- [X] T129 [P] [US8] Reescribir `packages/domain/tests/equipo/dorsales.test.ts` (fast-check, SC-014):
  - `asignarDorsalesIniciales`: exactamente los números del 1 al 24, con los fijos por casilla según la posición efectiva de cada titular;
  - `asignarDorsal(d, jugadorId, n)`: `n` fuera de 1–99 → `DORSAL_FUERA_DE_RANGO`; si otro jugador tenía `n`, pierde su entrada;
  - `completarDorsales(d, convocados)`: cada convocado sin dorsal recibe el libre más bajo del 1 al 24, o a partir del 25; los no convocados pueden seguir sin dorsal; devuelve `asignados`;
  - propiedad: tras cualquier secuencia de operaciones, no hay dos jugadores con el mismo dorsal.
- [X] T130 [P] [US8] Prueba de integración `apps/server/tests/integration/dorsales.test.ts`: `PUT /api/partidas/:id/dorsales` con `{ jugadorId, dorsal }` responde `{ dorsales, sinDorsal }`; al empezar un partido, `partido.inicio.dorsalesAsignados` lista los asignados y se guardan; si el partido se resolvió sin el participante, recibe el aviso `dorsal_asignado`.
- [X] T131 [P] [US8] Prueba de principio a fin `apps/web/tests/e2e/dorsales.spec.ts`: escenario J, pasos 1 a 4.

### Implementation for User Story 8

- [X] T132 [US8] Reescribir `packages/domain/src/equipo/dorsales.ts` (data-model.md §5): `Dorsales` admite jugadores sin entrada; `asignarDorsalesIniciales` con aleatorios entre los libres del 1 al 24; `asignarDorsal` sustituye a `editarDorsales`; `completarDorsales(d, convocados)` devuelve `{ dorsales, asignados }`.
- [X] T133 [US8] Cambiar `PUT /api/partidas/:id/dorsales` en `apps/server/src/http/alineacion.ts` y `packages/protocol/src/http/alineacion.ts` al cuerpo `{ jugadorId, dorsal }` y la respuesta `{ dorsales, sinDorsal: jugadorId[] }`; eliminar `DORSAL_REPETIDO`; mantener `422 DORSAL_FUERA_DE_RANGO`. `GET /api/partidas/:id/plantillas` admite dorsales ausentes.
- [X] T134 [US8] Llamar a `completarDorsales` al empezar cada partido (en directo en `apps/server/src/actores/partidoRapido.ts`, entre humanos en `apps/server/src/actores/partidoEntreHumanos.ts`, y al vencer un plazo), guardar el resultado, añadir `dorsalesAsignados` a `partido.inicio` en `packages/protocol/src/ws/partido.ts` y crear el aviso `dorsal_asignado` en `apps/server/src/avisos/servicio.ts` cuando el participante no estaba presente.
- [X] T135 [US8] En `apps/web/src/pantallas/Plantillas.tsx`: campo numérico de 1 a 99; aviso «El 2 lo lleva Pérez: se quedará sin dorsal» que se confirma con un clic; distintivo «Sin dorsal». En las pantallas de partido, aviso con los `dorsalesAsignados`.

**Checkpoint**: escenario J; SC-014.

---

## Phase 12: User Story 9 — Máximos goleadores y asistentes del torneo (Priority: P3)

**Goal**: dos tablas por torneo que acumulan goles y asistencias de todos los partidos, sin goles en propia ni tandas.

**Independent Test**: jugar varias jornadas y comprobar que las tablas coinciden con la suma de los resúmenes (quickstart, escenario K, paso 5).

### Tests for User Story 9 ⚠️

- [X] T136 [P] [US9] Pruebas en `packages/domain/tests/torneo/goleadores.test.ts`:
  - `registrarResultado` añade `aportaciones` desde los eventos `gol` (autor y asistente), sin contar `datos.enPropia === true` ni `tanda_lanzamiento`;
  - `jugo` es verdadero para los titulares iniciales y los que entran con `sustitucion` (rol `entra`);
  - `tablaGoleadores` y `tablaAsistentes` incluyen solo totales ≥ 1, ordenan por total descendente y después por partidos jugados ascendente, y admiten `excluirPartidos`;
  - incluyen la prórroga y acumulan todas las fases y las dos mesas de un torneo mixto.
- [X] T137 [P] [US9] Prueba de integración `apps/server/tests/integration/goleadores.test.ts` (SC-015): tras cada partido, las tablas de `GET /api/partidas/:id/torneo` coinciden con la suma de los resúmenes y ya están actualizadas al llegar `partido.fin`; el desempate final por nombre se aplica en el servidor; `?todos=true` devuelve la tabla completa; la exclusión "pendiente de ver" se aplica.
- [X] T138 [P] [US9] Ampliar `apps/web/tests/e2e/torneo-asincrono.spec.ts` con el paso 5 del escenario K.

### Implementation for User Story 9

- [X] T139 [US9] Añadir `aportaciones: { partidoId, participanteId, jugadorId, goles, asistencias, jugo }[]` a `EstadoTorneo` y ampliarla en `registrarResultado` en `packages/domain/src/torneo/torneo.ts` (data-model.md §6.4).
- [X] T140 [US9] Crear `packages/domain/src/torneo/goleadores.ts` con `tablaGoleadores(t, { excluirPartidos? })` y `tablaAsistentes(t, { excluirPartidos? })` (filas `{ posicion, jugadorId, participanteId, total, partidosJugados }`) y exportarlas.
- [X] T141 [US9] Incluir `goleadores` y `asistentes` (10 primeras filas, con desempate por nombre y apellidos) en la vista del torneo de `apps/server/src/actores/vistas.ts` y en `torneo.actualizado` (`packages/protocol/src/ws/torneo.ts`), y añadir `GET /api/partidas/:id/torneo/goleadores?todos=true` y `GET /api/partidas/:id/torneo/asistentes?todos=true` en `apps/server/src/http/torneo.ts`. Fila: `{ posicion, jugador: { id, nombre, apellidos, dorsal? }, equipo: { id, nombre }, total, partidosJugados }`.
- [X] T142 [US9] Añadir en `apps/web/src/pantallas/Torneo.tsx` las pestañas «Clasificación» o «Cuadro», «Máximos goleadores» y «Máximos asistentes», con las columnas Pos, Jugador (dorsal y nombre), Equipo, Goles o Asistencias y PJ, 10 filas y «Ver todos».

**Checkpoint**: escenario K, paso 5; SC-015.

---

## Phase 13: User Story 10 — Apertura de sobre con animación y sonido (Priority: P3)

**Goal**: animación básica con sonido al abrir cada uno de los tres sobres propios, que se puede saltar y no resta tiempo de elección.

**Independent Test**: jugar un draft completo y comprobar que la animación aparece exactamente tres veces, que se puede saltar y que no reduce el tiempo de elección (quickstart, escenario B).

### Tests for User Story 10 ⚠️

- [X] T143 [P] [US10] Ampliar `apps/server/tests/integration/draft.test.ts`: `draft.turno.animacion === true` solo en el primer envío del turno 1 de cada ronda (3 veces por participante), nunca en `estado` al reconectar; el `venceEn` del turno 1 suma `parametros.draft.margenAnimacionS` (6 s).
- [X] T144 [P] [US10] Prueba de principio a fin `apps/web/tests/e2e/apertura.spec.ts`: escenario B, pasos 1 a 7 (con `page.emulateMedia({ reducedMotion: 'reduce' })` para el paso 6), y la animación dura ≤ 6 s (SC-017).

### Implementation for User Story 10

- [X] T145 [P] [US10] Añadir `animacion: boolean` a `draft.turno` en `packages/protocol/src/ws/draft.ts`.
- [X] T146 [US10] En `apps/server/src/actores/draft.ts`: marcar `animacion: true` en el primer `draft.turno` del turno 1 de cada ronda y sumar `margenAnimacionS` a su `venceEn` (research R17).
- [X] T147 [P] [US10] Añadir 4 efectos de sonido CC0 (rasgado, reparto, volteo, revelación especial; OGG y MP3, < 60 kB en total) en `apps/web/public/sonidos/`, con un fichero `LICENCIA` que indique origen y licencia de cada uno.
- [X] T148 [P] [US10] Crear `apps/web/src/sonido/sonido.ts`: Web Audio API, desbloqueo del contexto con la primera interacción, preferencia en `localStorage['fbd.sonido'] = 'activado' | 'silenciado'` (por defecto activado; lecturas y escrituras en `try/catch`) y `reproducir(efecto)`.
- [X] T149 [US10] Crear `apps/web/src/componentes/AperturaSobre.tsx` (research R17): el sobre tiembla y se rasga (~1,2 s), 8 cartas boca abajo escalonadas 120 ms (~1,5 s), volteo, destello y pausa de 400 ms para Legendario y GOAT; ≤ 6 s en total; «Saltar» o un toque en cualquier punto revela todo; con `prefers-reduced-motion`, un fundido de 300 ms.
- [X] T150 [US10] Usar `AperturaSobre` en `apps/web/src/pantallas/Draft.tsx` cuando `draft.turno.animacion` es verdadero, y añadir el interruptor de sonido (🔊/🔇, con `aria-label`) a `apps/web/src/app/Marco.tsx`.

**Checkpoint**: escenario B; SC-017. Volver a ejecutar `avanzar-solo.spec.ts` con la animación activa (SC-004).

---

## Phase 14: Polish & Cross-Cutting Concerns

**Purpose**: rendimiento, seguridad, documentación y validación final.

- [X] T151 [P] Actualizar `specs/001-draft-manager-mvp/spec.md` según "Requisitos de la spec 001 afectados" de la spec 002: FR-027 y la Assumption "Penalización por posición"; FR-049; FR-031a; FR-025, FR-034 y la Assumption "Ofensividad de cada formación"; FR-001, FR-046, FR-056, FR-056a, FR-056b y la Assumption "Partidos entre humanos"; el Edge Case "Desconexión de un humano durante un partido"; SC-005. Añadir la acotación del descuento a 1–3 min de research R2.
- [X] T152 [P] Proponer la enmienda PATCH v1.0.3 de `.specify/memory/constitution.md` (con `/speckit-constitution`) que añada a "Decisiones resueltas" la referencia a `specs/002-mejoras-mvp/` (FR-030), según el seguimiento de plan.md.
- [ ] T153 [P] Actualizar la prueba de carga `tools/load/beta-100.js` al protocolo nuevo (`abrir` en lugar de `listo`, `siguiente-jornada`, sin preparación con temporizador ni `partido.velocidad`) y volver a medir 001/SC-017 con el motor nuevo.
- [X] T154 [P] Aplicar el límite de peticiones de `apps/server/src/http/limitador.ts` a las rutas y mensajes nuevos (`abrir`, `reproduccion`, `visto`, `revelar`, `siguiente-jornada`, `mis-partidas`, `partido.finalizar`, `partida.pausar`) y ampliar la auditoría de visibilidad (001/T141) a los mensajes nuevos.
- [X] T155 [P] Revisión de accesibilidad en `apps/web/src/`: popovers de las virtudes con teclado, contraste de los acabados de nivel, alternativa al arrastre en `CampoTacticas`, `prefers-reduced-motion` en cartas y apertura, y etiquetas del interruptor de sonido y de la barra.
- [X] T156 [P] Eliminar el código muerto: `CampoAlineacion` si ya no se usa, velocidades 16 y 32, `rival_listo`, `procesarVelocidad`, `editarDorsales` y la tabla `DURACION` del motor.
- [X] T157 [P] Actualizar `README.md` y `docs/despliegue.md`: comando `pnpm --filter @fbd/engine bench`, y terminar los partidos en juego antes de desplegar la versión con parámetros 2.0.0 (research R12).
- [X] T158 Poner el umbral del bench en `.github/workflows/ci.yml` (falla si un partido sin fotogramas supera 25 ms o `resolverResto` desde el minuto 0 supera 30 ms) y añadir a `pnpm balance --n 200` las comprobaciones SC-007, SC-008, SC-011 y SC-018.
- [ ] T159 Ejecutar la validación completa de [quickstart.md](./quickstart.md) y registrar los resultados en `specs/002-mejoras-mvp/checklists/validacion.md`:
  - toda la tabla de pruebas automáticas y los escenarios A a K;
  - revisión visual de 3 partidos completos a x2 (SC-007a);
  - pruebas con al menos 5 personas para SC-001 (cartas) y SC-009 (2 min de la versión anterior, con una etiqueta git en `95d9962`, y 2 min de la nueva; nota de 1 a 5);
  - 60 fps en un portátil medio con el navegador visible, y nunca por debajo de 30 fps (FR-025b).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Fase 1)**: sin dependencias.
- **Foundational (Fase 2)**: depende de Setup y **bloquea** todas las historias.
- **US1 cartas (Fase 3)**: solo Foundational. Independiente del resto.
- **US4 penalizaciones (Fase 4)**: solo Foundational (parámetros 2.0.0).
- **US11 asíncrono (Fase 5)**: Foundational (`resolverResto`, migración, ritmo deducido).
- **US2 avanzar (Fase 6)**: depende de US11 (el avance inmediato fuera del draft se apoya en el modelo asíncrono y en `abrir`).
- **US3 2D (Fase 7)**: Foundational. Su parte del motor (T075 a T087) puede ir en paralelo a US1, US4 y US11; T096 depende de T051 (US11).
- **US5 finalizar (Fase 8)**: depende de US3 (búfer y protocolo del 2D) y de `resolverResto`.
- **US6 navegación (Fase 9)**: depende de US2 (botones) para el recorrido completo; el servidor (T106 a T109) solo de Foundational.
- **US7 colocación (Fase 10)**: depende de US4 (`penalizacionPorPosicion` con zonas); el uso del ancla en la capa espacial requiere US3 (sin US3, el ancla solo afecta a la posición efectiva y al perfil).
- **US8 dorsales (Fase 11)**: Foundational; T134 toca `partidoEntreHumanos.ts` (US11). Los fijos por posición efectiva usan US7 si está hecha (si no, la casilla).
- **US9 goleadores (Fase 12)**: depende de US11 (exclusión "pendiente de ver").
- **US10 apertura (Fase 13)**: Foundational; T150 añade el interruptor a `Marco.tsx` (US6).
- **Polish (Fase 14)**: depende de las historias que se entreguen.

### Grafo de historias

```text
Setup → Foundational ─┬─► US1 (cartas)
                      ├─► US4 (penalizaciones) ─────────────► US7 (colocación) ◄─┐
                      ├─► US11 (asíncrono) ─┬─► US2 (avanzar) ─► US6 (barra) ─► US10 (apertura)
                      │                     ├─► US9 (goleadores)                 │
                      │                     └─► US8 (dorsales)                   │
                      └─► US3 (2D, motor en paralelo) ─► US5 (finalizar)         │
                                    └────────────────────────────────────────────┘
```

### Within Each User Story

- Las pruebas se escriben primero y deben fallar.
- Después: parámetros y dominio → motor e IA → protocolo y persistencia → actores y rutas del servidor → pantallas web.
- Cada historia se cierra en su checkpoint antes de pasar a la siguiente (si se trabaja en secuencia).

### Parallel Opportunities

- **Setup**: T001 a T004 a la vez.
- **Foundational**: las pruebas T006 a T009 a la vez; T010 a T012 y T015 son ficheros distintos.
- **Tras Foundational**: US1 (web), US4 (dominio) y el motor de US3 (`packages/engine/src/espacio/`) a la vez, por tres personas.
- **US11 ∥ motor de US3**: el servidor y la web de US11 no tocan el motor.
- **US8 ∥ US9 ∥ US10**: ficheros distintos salvo `partidoEntreHumanos.ts` (T134) y `Marco.tsx` (T150).
- Dentro de cada historia, todas las pruebas [P] y los ficheros de dominio, protocolo y componentes [P].

---

## Parallel Example: User Story 3 (motor)

```bash
# Pruebas (en paralelo, antes de implementar):
Task: "Aritmética entera en packages/engine/tests/espacio/aritmetica.test.ts"
Task: "Cinemática en packages/engine/tests/cinematica.test.ts"
Task: "Fotogramas v2 en packages/engine/tests/fotogramas.test.ts"
Task: "Acciones y estadísticas en packages/engine/tests/acciones.test.ts"
Task: "Reloj de reproducción en apps/web/tests/unit/relojReproduccion.test.ts"
Task: "Interpolación en apps/web/tests/unit/interpolacion.test.ts"

# Implementación (en paralelo):
Task: "Aritmética en packages/engine/src/espacio/aritmetica.ts"
Task: "Balón en packages/engine/src/espacio/balon.ts"
Task: "Protocolo 2D en packages/protocol/src/ws/partido2d.ts"
Task: "Interpolación en apps/web/src/campo2d/interpolacion.ts"
Task: "Renderizador en apps/web/src/campo2d/renderizador.ts"
```

## Parallel Example: User Story 11

```bash
Task: "Contrato de partidos en apps/server/tests/contract/partidos.test.ts"
Task: "Torneo asíncrono en apps/server/tests/integration/torneo-asincrono.test.ts"
Task: "Visibilidad en apps/server/tests/integration/visibilidad.test.ts"
Task: "Reproducción en apps/server/tests/integration/reproduccion.test.ts"
Task: "Esquemas HTTP en packages/protocol/src/http/partidos.ts"
Task: "Repositorio en apps/server/src/persistencia/repos/visionados.ts"
```

---

## Implementation Strategy

### MVP primero (historias P1)

1. Fase 1 (Setup) y Fase 2 (Foundational).
2. US1 → **validar** el escenario A. Es la mejora visible más barata y se puede desplegar sola.
3. US4 → **validar** el escenario H y SC-011.
4. US11 → **validar** el escenario K (pasos 1 a 4).
5. US2 → **validar** el escenario C. A partir de aquí no hay esperas en solitario.
6. US3 → **validar** el escenario F, `balance` y `bench`.
7. **Parar y demostrar**: todas las historias P1 están hechas.

### Entrega incremental

1. P1: US1, US4, US11, US2 y US3 (en ese orden, o US3 en paralelo desde el principio).
2. \+ P2: US5 (finalizar), US6 (barra) y US7 (colocación).
3. \+ P3: US8 (dorsales), US9 (goleadores) y US10 (apertura).
4. Polish: actualizar la spec 001, carga, seguridad y validación final.

**Despliegue**: los parámetros 2.0.0 cambian el motor y las penalizaciones a la vez. No desplegar en la beta hasta tener US3 terminada, o se mostrarían partidos con la rejilla antigua y el recalibrado a medias. Antes de desplegar, terminar los partidos en juego (research R12).

### Equipo en paralelo

Tras Foundational: una persona en el motor (US3), otra en el servidor (US11 → US2 → US6) y otra en la web y el dominio (US1 → US4 → US7). Después, US5 con quien hizo el motor, y US8, US9 y US10 repartidas.

---

## Notes

- [P] = ficheros distintos y sin dependencias pendientes. [USn] = trazabilidad con spec.md.
- Siempre **pnpm**: `pnpm add` / `pnpm --filter @fbd/<paquete> add` / `pnpm dlx`. Nunca npm, yarn ni bun.
- Ningún `Math.random` ni `Date` en `domain` o `engine`; ESLint lo impide. Nada de coma flotante en las decisiones de `engine/src/espacio/`.
- Toda magnitud nueva va a `ParametrosEquilibrado` 2.0.0, con sus pruebas (Principio III). Los valores de la tabla de penalizaciones solo se cambian actualizando la spec.
- [checklists/simulacion-2d.md](./checklists/simulacion-2d.md) está resuelta: sus 43 ítems se incorporaron a spec.md en la sesión de clarificación de la checklist.
- Hacer commit al terminar cada tarea o grupo lógico; validar cada checkpoint antes de seguir.
