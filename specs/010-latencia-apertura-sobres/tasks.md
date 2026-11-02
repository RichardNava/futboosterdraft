---

description: "Tareas de la spec 010: latencia de apertura de partidos y de entrega de sobres (INI-07)"
---

# Tasks: Latencia de apertura de partidos y de entrega de sobres

**Input**: documentos de diseño de `specs/010-latencia-apertura-sobres/` ([plan.md](./plan.md), [spec.md](./spec.md),
[research.md](./research.md), [data-model.md](./data-model.md), [contracts/desglose.md](./contracts/desglose.md),
[quickstart.md](./quickstart.md)).

**Tests**: la spec y el plan los piden expresamente (SC-005, SC-006, FR-007, FR-011; plan, «Project Structure»):
- unitarias del desglose (`desglose.test.ts`), de la secuencia del actor (`actor.test.ts`) y de la pasarela
  (`pasarela.test.ts`, FR-011);
- integración del grupo de aperturas (`aperturas-grupo.test.ts`: duplicados, cálculo fallido, transacción fallida,
  orden, SC-005, SC-006) y del desglose de una apertura real (`desglose.test.ts` de integración);
- suite completa en los dos modos de hilos, `pnpm test:equivalence`, `pnpm e2e` y carga con k6.

Los tests existentes **no cambian sus expectativas** (FR-015), en particular «dos aperturas simultáneas» de
`torneo-asincrono.test.ts` (FR-007), y `pnpm test:equivalence` no se toca (FR-014).

**Reglas para quien ejecute** (CLAUDE.md y constitución):
- **pnpm**: se usa pnpm, nunca npm, yarn ni npx.
- **Tildes**: sin tildes en el código, ids ni nombres de archivo; con tildes en los textos visibles.
- **Git**: el agente no hace `git commit` ni `git push`.
- **Grafo**: antes de leer código hay que lanzar `graphify query "<pregunta>"`, y tras cambiar código, `graphify update .`.
- **Alcance**: `packages/engine`, `packages/ai`, `packages/domain` y `apps/web` no se tocan; ni la API HTTP, ni el
  protocolo WebSocket, ni el contenido de los mensajes, ni el esquema de la BD.
- **Sin dependencias nuevas**: `node:async_hooks` (`AsyncLocalStorage`) y `prom-client` (`Summary`) ya están disponibles.
- **Puerta de diagnóstico** (SC-004): no se empieza US2 ni US3 sin `diagnostico.md` (T016).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (ficheros distintos y sin dependencias pendientes).
- **[Story]**: historia de usuario de la spec (US1, US2, US3).

---

## Phase 1: Setup

**Purpose**: la configuración `MEDIR_FASES` llega del entorno al servidor (FR-003).

- [X] T001 Añadir `medirFases?: boolean` a `ConfigServidor` en `apps/server/src/servidor.ts` (por defecto `true`) y
  leer `MEDIR_FASES` en `apps/server/src/main.ts` (`process.env.MEDIR_FASES !== '0'`, activado por defecto en todos los
  entornos, también producción). En los tests, `crearServidor` sin `medirFases` también mide (contrato, «Configuración»).

---

## Phase 2: Foundational (bloquea todas las historias)

**Purpose**: el módulo de desglose y sus métricas, sin puntos de medida todavía. Sin efecto observable salvo métricas
vacías en `/metrics`.

**⚠️ CRITICAL**: US1 instrumenta con este módulo; US2 lo usa para comprobar SC-005.

- [X] T002 Añadir a `apps/server/src/observabilidad/metricas.ts` dos `Summary` de prom-client registrados en el mismo
  `Registry`: `operacion_fase_ms` con etiquetas `operacion` ∈ {`apertura`, `entrega_sobre`, `eleccion`} y `fase` ∈
  {`cola`, `calculo`, `bd`, `serializacion`, `difusion`, `resto`, `total`}, y `operacion_consultas` con etiqueta
  `operacion`; `percentiles: [0.5, 0.95]`, acumulados desde el arranque (sin `maxAgeSeconds`). Añadirlos a la interfaz
  `Metricas` (`operacionFaseMs`, `operacionConsultas`). Las métricas existentes no cambian.
- [X] T003 [P] Escribir `apps/server/tests/unit/desglose.test.ts` (debe fallar hasta T004): `medir` observa las 7 fases
  y las consultas; `fase` suma al desglose del contexto, también tras un `await`; dos `fase('calculo')` en paralelo con
  `Promise.all` suman el tiempo de reloj del conjunto, no la suma de ambas; `resto = total − Σ fases` y nunca negativo;
  `renombrar('entrega_sobre')` cambia la etiqueta observada; fuera de `medir` o con la medición desactivada, `fase(fn)`
  solo devuelve `fn()` (mismo valor, mismo error, sin observaciones).
- [X] T004 Crear `apps/server/src/observabilidad/desglose.ts` con la API del contrato:
  `medir<T>(operacion, fn)`, `fase<T>(fase, fn)` (síncrona o promesa), `renombrar(operacion)`, `contarConsulta()`, más
  `configurarDesglose({ activo, metricas })` que llama `crearServidor`. Estado por operación según data-model
  («Desglose de una operación»): `operacion`, `inicio = performance.now()`, `fases` por nombre, `consultas`. Las fases
  en paralelo cuentan su tiempo de reloj (llevar por fase un contador de tramos abiertos y el instante en que pasó de 0
  a 1). Al cerrar: observar cada fase, `resto` y `total` en `operacion_fase_ms` y `consultas` en
  `operacion_consultas`. Con `activo: false` no se crea el `AsyncLocalStorage` y todas las funciones son llamadas
  vacías. Solo lee el reloj: no cambia valores ni orden (FR-003). Llamar `configurarDesglose` en
  `apps/server/src/servidor.ts` con `config.medirFases ?? true`. T003 en verde.

**Checkpoint**: `pnpm --filter @fbd/server test` en verde; `/metrics` muestra las dos métricas sin observaciones.

---

## Phase 3: User Story 1 - Saber dónde se va el tiempo antes de cambiar nada (Priority: P1) 🎯 MVP

**Goal**: cada apertura y cada elección de draft quedan desglosadas por fase en `/metrics`, con `resto` ≤ 10 % del
total, y `diagnostico.md` atribuye con cifras el tiempo al entorno o al servidor.

**Independent Test**: solo con esta fase, `beta-100.js` con 10 y 100 partidas en el entorno de referencia da mediana y
p95 por fase de `apertura` y `entrega_sobre`, sin cambiar resultados ni métricas existentes (quickstart §1–§3).

### Tests for User Story 1

- [X] T005 [P] [US1] Escribir `apps/server/tests/integration/desglose.test.ts`: crear una partida con dos humanos en la
  misma jornada (reutilizar los ayudantes de `torneo-asincrono.test.ts`), abrir su partido y comprobar en el registro de
  métricas que hay observaciones de `operacion_fase_ms{operacion="apertura"}` para las 7 fases, que `bd > 0`,
  `operacion_consultas > 0` y que `resto ≤ 0,1 × total` (FR-001). Cerrar un turno de draft y comprobar lo mismo para
  `entrega_sobre`. Con `medirFases: false`, ninguna observación y el mismo resultado del partido.

### Implementation for User Story 1

- [X] T006 [US1] Fase `cola` en `apps/server/src/actores/actor.ts`: en `ActorPartida.ejecutar`, tomar `performance.now()`
  al encolar y, al empezar el comando dentro del `.then`, sumar la espera con el desglose del contexto de quien encoló
  (el callback de `then` hereda el contexto de `AsyncLocalStorage` de quien lo registró; comprobarlo con T005). Sin
  cambiar el orden ni el manejo de errores de la cola.
- [X] T007 [P] [US1] Fase `calculo` en `apps/server/src/simulacion/grupo.ts`: envolver con `fase('calculo', …)` la
  promesa que devuelve `ejecutar` en los dos modos (hilos y en proceso), de modo que incluya la espera en el grupo
  de hilos (research R2).
- [X] T008 [P] [US1] Fase `bd` en `apps/server/src/persistencia/db.ts`: en `conectar`, envolver `pool.query` y
  `pool.connect` (espera de conexión libre incluida) con `fase('bd', …)` y `contarConsulta()`; envolver también
  `query` del cliente que devuelve `connect`, porque las transacciones de Drizzle usan ese cliente. Sin envolver dos
  veces la misma consulta. Comprobar `pnpm --filter @fbd/server test:integration` sin cambios.
- [X] T009 [P] [US1] Fases `serializacion` y `difusion` en `apps/server/src/ws/pasarela.ts`: el `JSON.stringify` de
  `Pasarela.enviar` dentro de `fase('serializacion', …)` y el bucle de `socket.send` dentro de `fase('difusion', …)`.
  Mismo número de serializaciones que hoy.
- [X] T010 [US1] Medir la apertura en `apps/server/src/http/partidos.ts`: el manejador de `POST /api/partidos/:id/abrir`
  entero dentro de `medir('apertura', …)`, para todos los tipos de partido. La respuesta HTTP no cambia.
- [X] T011 [US1] Medir la elección de draft: el manejo del mensaje `draft.elegir` (en `apps/server/src/ws/pasarela.ts`
  o donde se despache, según `graphify query "draft.elegir"`) dentro de `medir('eleccion', …)`, incluido el `ack`; y en
  `apps/server/src/actores/draft.ts`, llamar `renombrar('entrega_sobre')` cuando la elección cierra el turno de su mesa
  (antes de `resolver`/`abrirTurno`). `turno_draft_resolucion_ms` no cambia.
- [ ] T012 [US1] Pasar T005 en los dos modos (`test:integration` y `test:integration:hilos`). Si `resto` > 10 %,
  buscar la fase sin instrumentar antes de seguir.
- [X] T013 [P] [US1] `teardown()` opcional en `tools/load/beta-100.js` (research R12): si `__ENV.METRICAS_URL` existe,
  `http.get` de esa URL e imprimir solo las líneas que empiezan por `operacion_fase_ms` y `operacion_consultas`. No
  cambiar umbrales, métricas ni escenarios (FR-016). Documentar `-e METRICAS_URL=…` en `tools/load/README.md`.

### Diagnóstico (FR-004, SC-004) — puerta de US2 y US3

- [ ] T014 [US1] Medir en el entorno de referencia (servidor, PostgreSQL y k6 en una máquina, sin Docker Desktop),
  reiniciando el servidor entre escenarios: `k6 run -e PARTIDAS=10 -e APERTURA_MAX_S=0 -e METRICAS_URL=… tools/load/beta-100.js`
  y lo mismo con `PARTIDAS=100`, y con `PARTIDAS=1` para la latencia de un viaje (`bd / consultas` con carga baja).
  Guardar las salidas en `specs/010-latencia-apertura-sobres/mediciones/` (quickstart §3).
- [ ] T015 [US1] Repetir la medición con Docker Desktop y Wi-Fi en las mismas condiciones que la del 2026-11-02
  (`-e BASE_URL=… -e ORIGIN=… -e METRICAS_URL=…`) y guardarla en la misma carpeta. Si el entorno no está disponible,
  pedirlo a la persona; no inventar cifras.
- [ ] T016 [US1] Escribir `specs/010-latencia-apertura-sobres/diagnostico.md`: tabla de mediana y p95 por fase y por
  operación (`apertura`, `entrega_sobre`) para 10 y 100 partidas en cada entorno; consultas por operación; latencia de
  un viaje a la BD por entorno; reparto entorno / servidor con el método de research R3 (bd y difusión escalan con la
  red → entorno; cálculo, serialización y resto → servidor; la cola se reparte según la proporción de su tiempo de
  servicio); comprobación de que `resto` ≤ 10 % (SC-004); y decisión: confirma o corrige la hipótesis de R1, mecanismo
  de US2 (por defecto R4–R7) y alcance de FR-012 (R9: candidato principal, segundo candidato o nada).

**Checkpoint**: US1 entregada; `diagnostico.md` existe. Las tareas de US2 y US3 se ajustan si el diagnóstico corrige R1.

---

## Phase 4: User Story 2 - Abrir el partido en segundos aunque toda la partida abra a la vez (Priority: P2)

**Goal**: las aperturas entre humanos pendientes de una partida se resuelven en un solo comando del actor: cálculo en
paralelo, aplicación en orden de calendario, una transacción y un solo `torneo.actualizado`; `emitirTorneo` carga los
datos comunes una vez.

**Independent Test**: `aperturas-grupo.test.ts` y «dos aperturas simultáneas» en verde en los dos modos;
`pnpm test:equivalence` sin cambios; con 10 partidas en el entorno de referencia, `apertura_ms` p95 < 3 s (quickstart §4).

### Tests for User Story 2

- [ ] T017 [P] [US2] Ampliar `apps/server/tests/unit/actor.test.ts`: `secuencia` empieza en 0, sube 1 en cada
  `ejecutar()` (también si el comando falla) y no cambia al terminar comandos.
- [ ] T018 [P] [US2] Escribir `apps/server/tests/integration/aperturas-grupo.test.ts` (debe fallar hasta T025), con una
  partida de 8 humanos en una jornada de 4 partidos entre humanos:
  - **8 a la vez**: los 8 abren con `Promise.all`; cada partido queda `finalizado` una sola vez y cada humano recibe
    `{ modo: 'reproduccion', modalidad }` con su modalidad;
  - **duplicados** (FR-007): los dos humanos de un partido a la vez, y el mismo humano dos veces; una sola resolución
    (un solo partido guardado, un solo `registrarResultado`) y el mismo resultado para todas las peticiones; una
    apertura posterior a `finalizado` responde igual sin recalcular;
  - **cálculo fallido** (FR-010): con el servicio de cálculo forzado a fallar en un partido, los demás del grupo se
    guardan, el fallido sigue `programado`, su apertura recibe el mismo error que en 009/FR-008 y queda registrado con
    su semilla; reabrirlo lo resuelve;
  - **transacción fallida** (FR-008): forzar un error dentro de la transacción del grupo; ningún partido queda
    `finalizado`, ni modalidades, visionados, dorsales o torneo guardados; `c.torneo` en memoria no cambia; todas las
    esperas reciben error; repetir las aperturas resuelve cada partido una vez;
  - **orden y comandos intermedios** (FR-009): una alineación encolada entre dos aperturas se procesa entre ellas (la
    segunda apertura va a otro grupo);
  - **SC-006**: con semillas fijas, la clasificación, el historial y las bajas tras el grupo son idénticos a los de
    abrir los mismos partidos de uno en uno en otra partida igual;
  - **SC-005**: con el desglose activo, la `cola` de la última de 8 aperturas a la vez es < 0,5 × la suma de los
    tiempos de servicio (`total − cola`) de las 8;
  - **FR-013**: cada humano recibe un solo `torneo.actualizado` por grupo y su contenido es el que recibiría con la
    última apertura aplicada de una en una.

### Implementation for User Story 2

- [ ] T019 [P] [US2] Añadir el parámetro `ejecutor: Ejecutor = this.db` (mismo patrón que `repoPartidos.actualizar`) a
  los métodos de escritura que usa la apertura entre humanos y aún no lo aceptan, en
  `apps/server/src/persistencia/repos/{visionados,equipo,partidos,partidas,perfiles,torneo}.ts`: fijar modalidad del
  partido, última modalidad del participante y del perfil, guardar partido finalizado, crear visionados, guardar
  dorsales y guardar torneo. Sin cambiar las consultas.
- [ ] T020 [US2] `get secuencia(): number` en `ActorPartida` (`apps/server/src/actores/actor.ts`): contador que sube en
  cada `ejecutar()` antes de encadenar el comando (contrato, «API interna: buzón de aperturas»). T017 en verde.
- [ ] T021 [US2] Dividir `resolverPartidoEntreHumanos` en `apps/server/src/actores/partidoEntreHumanos.ts` en tres
  pasos exportados, sin cambiar el cálculo ni su orden interno: `prepararEntreHumanos` (relee la fila y prepara
  alineaciones; solo lecturas), `calcularEntreHumanos` (`calculo.ejecutar` con prioridad `humano`; sin E/S) y
  `aplicarEntreHumanos(c, preparado, calculado, torneo, ejecutor)` (dorsales, partido finalizado, visionados y
  `registrarResultado` sobre el torneo recibido; escribe con `ejecutor`; devuelve el torneo nuevo y los avisos de
  dorsales pendientes **sin enviarlos**). `resolverPartidoEntreHumanos` pasa a componer los tres con
  `db.transaction` y enviar después los avisos y `despuesDePartido`, así que el camino actual sigue igual. Extraer de
  `abrirPartido` (`apps/server/src/actores/torneo.ts`) las validaciones y la fijación de modalidad para reutilizarlas
  en el grupo (con `ejecutor`). Comprobar `torneo-asincrono.test.ts` y `dorsales.test.ts` sin cambios.
- [ ] T022 [US2] Crear `apps/server/src/actores/aperturas.ts` con `abrirEntreHumanos(c, participanteId, partidoId,
  modalidad): Promise<ResultadoAbrir>` (contrato) y el buzón por partida (data-model, «Grupo de aperturas»):
  - **unirse**: si hay un grupo `abierto` y `actor.secuencia === grupo.secuencia`, añadir la apertura; si no, crear un
    grupo, encolar **un** comando con `c.ejecutar` y guardar `grupo.secuencia = actor.secuencia`; sin esperas
    artificiales (FR-008);
  - **al empezar el comando**: `estado = 'en_curso'` y quitarlo del buzón; validar cada apertura en orden de llegada
    con las comprobaciones de `abrirPartido` (un error de validación solo afecta a su espera, R10); releer cada fila:
    si ya no es `programado` o ya no es entre humanos, procesar esa apertura con `abrirPartido` en su orden de llegada;
    juntar las del mismo partido en una entrada con varias `esperas` y `abiertoPorId` = participante de la primera;
  - **calcular**: `prepararEntreHumanos` de cada entrada y `Promise.allSettled` de `calcularEntreHumanos`; los fallidos
    con `registrarCalculoFallido` (semilla incluida) y fuera del grupo (FR-010);
  - **aplicar**: en `indiceCalendario` ascendente (índice del cruce en `c.jornada.cruces`), con una sola
    `db.transaction` para modalidades, última modalidad, partidos, visionados, dorsales y torneo (FR-006, FR-008);
  - **tras el commit**: actualizar `c.torneo`, modalidades en memoria y `partidosEnCurso`; enviar avisos de dorsales;
    llamar `despuesDePartido` **una vez** (FR-013); resolver las esperas. Si la transacción falla, la memoria queda
    como estaba y todas las esperas reciben el error (R5);
  - **apagado**: los grupos no empezados fallan como los comandos de un actor cerrado (R11).
- [ ] T023 [US2] En `apps/server/src/http/partidos.ts`, para la fila ya leída de tipo `futbol`, `programado` y
  `entreHumanos(c, fila)`, llamar `abrirEntreHumanos`; en otro caso, `c.ejecutar(abrirPartido)` como hoy. Misma
  traducción a HTTP de `{ modo, modalidad }` y `{ error }` (FR-015).
- [ ] T024 [US2] Pasar T018 y toda la integración en los dos modos (`pnpm --filter @fbd/server test:integration` y
  `test:integration:hilos`); `pnpm test:equivalence` sin cambios (FR-014).
- [ ] T025 [P] [US2] Consultas por partida para R7: en `apps/server/src/persistencia/repos/visionados.ts`, los
  pendientes de **todos** los participantes de una partida en una consulta (agrupados por participante); en
  `apps/server/src/persistencia/repos/equipo.ts`, los dorsales de una lista de participantes en una consulta.
- [ ] T026 [US2] En `apps/server/src/actores/torneo.ts`, dividir `vistaTorneo` en `datosComunesTorneo(c)` (data-model,
  «Datos comunes de una emisión»: `filasJornadas`, `partidos`, `pendientesPorParticipante`, `dorsalesPorParticipante`,
  `recompensa` solo del campeón) y `construirVistaTorneo(datos, participanteId)` sin E/S. `emitirTorneo` carga los
  datos una vez por emisión; `GET` del torneo de un participante usa el mismo camino con un destinatario. Cada
  `torneo.actualizado` debe ser idéntico al de hoy: `visibilidad.test.ts`, `goleadores.test.ts`, `dorsales.test.ts` y
  `recompensa.test.ts` sin cambios.
- [ ] T027 [US2] Medir con `k6 run -e PARTIDAS=10 -e APERTURA_MAX_S=0 -e METRICAS_URL=…` en el entorno de referencia:
  `apertura_ms` p95 < 3 s (SC-002) y consultas de `apertura` frente al diagnóstico; anotar en `diagnostico.md`
  (sección «Tras US2») y en `mediciones/`.

**Checkpoint**: US2 completa y medida; el servidor sigue siendo compatible con el cliente sin cambios.

---

## Phase 5: User Story 3 - Recibir el sobre siguiente en menos de un segundo (Priority: P3)

**Goal**: la entrega del sobre hace menos trabajo y menos viajes a la BD en el hilo principal, con el mismo contenido y
orden de mensajes.

**Independent Test**: `pasarela.test.ts` en verde; `draft.test.ts` y los e2e del draft sin cambios; con 100 partidas,
`entrega_sobre_ms` p95 y `operacion_consultas{operacion="entrega_sobre"}` bajan respecto al diagnóstico (quickstart §5).

### Tests for User Story 3

- [ ] T028 [P] [US3] Escribir `apps/server/tests/unit/pasarela.test.ts` (FR-011, R8): un mensaje de destino `todos` con
  N sockets falsos se serializa una vez (espía sobre `JSON.stringify` o contador en el desglose) y todos reciben la
  misma cadena; los mensajes por participante se serializan uno por destinatario.

### Implementation for User Story 3

- [ ] T029 [US3] Solo si `diagnostico.md` lo prioriza (R9, candidato principal): en `apps/server/src/actores/draft.ts`,
  calcular primero con las funciones puras del dominio (`elegir`, `resolverTurno`, `eleccionNPC`) en el mismo orden de
  hoy y guardar en **una** `db.transaction` la elección que cierra el turno, las elecciones automáticas, la mesa
  resuelta, las elecciones NPC del turno nuevo y el margen de animación; enviar `draft.progreso`,
  `draft.eleccion_auto` y `draft.turno` después del commit, con el mismo contenido y orden. Añadir `ejecutor` a los
  métodos de `apps/server/src/persistencia/repos/draft.ts` que lo necesiten. Si el diagnóstico no lo prioriza, marcar
  la tarea como descartada con la referencia a `diagnostico.md`.
- [ ] T030 [US3] Solo si el desglose señala el `ack` (R9, segundo candidato): enviar el `ack` de `draft.elegir` sin
  esperar a guardar la petición de deduplicación cuando el sobre ya salió, manteniendo la idempotencia de la petición
  (constitución, Principio VI). Si no, marcar como descartada con la referencia.
- [ ] T031 [US3] Pasar `draft.test.ts` en los dos modos y `pnpm e2e` (draft) sin cambios; reconexión a mitad de entrega
  recibe el estado del draft igual que hoy (acceptance 3).
- [ ] T032 [US3] Medir con `k6 run -e PARTIDAS=100 -e METRICAS_URL=…` en el entorno de referencia y anotar en
  `diagnostico.md` (sección «Tras US3») y en `mediciones/` el p95 de `entrega_sobre_ms` y sus consultas.

**Checkpoint**: las tres historias completas.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T033 [P] Documentar `MEDIR_FASES` (por defecto `1`, `0` lo desactiva) y las dos métricas nuevas en
  `docs/despliegue.md`.
- [ ] T034 Comprobar que `MEDIR_FASES=0` no deja observaciones en `/metrics` y no cambia resultados (quickstart §2).
- [ ] T035 Regresión completa (quickstart §1): `pnpm test:equivalence`, `pnpm test`,
  `pnpm --filter @fbd/server test:integration`, `pnpm --filter @fbd/server test:integration:hilos`, `pnpm e2e`. Todo en
  verde sin tocar expectativas.
- [ ] T036 SC-001 y SC-003 en tres máquinas por cable (servidor Linux sin Docker Desktop, PostgreSQL y k6 separados;
  quickstart §6). Si el entorno no está disponible, dejarla pendiente con la razón (como 009/T036); SC-001 queda «no
  cumplido aún», no «cumplido». Si un umbral no se alcanza, reformularlo en `specs/001-draft-manager-mvp/spec.md`
  (SC-017) con los datos, sin tocar los umbrales de `beta-100.js` ni del CI (FR-016).
- [ ] T037 Registrar cada medición en `specs/003-mejoras-ux-simulacion/checklists/validacion.md` (fila «Carga») y en
  `ROADMAP.md` INI-07, y actualizar el estado de la spec en `spec.md` y `ROADMAP.md` (FR-017).
- [ ] T038 `graphify update .` tras los cambios de código.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de T001; bloquea todas las historias.
- **US1 (Phase 3)**: depende de Phase 2. Es el MVP. T016 (`diagnostico.md`) es la **puerta** de US2 y US3 (SC-004).
- **US2 (Phase 4)**: depende de T016. Usa el desglose (T004–T006) para SC-005.
- **US3 (Phase 5)**: depende de T016. T028 es independiente; T029–T030 dependen de lo que decida el diagnóstico. Se
  puede hacer después de US2 o en paralelo (no comparten ficheros salvo `actor.ts`, que US3 no toca).
- **Polish (Phase 6)**: T033 en cualquier momento tras T001; T035–T037 tras todas las historias.

### Within Each Phase

- Phase 2: T002 → T004; T003 en paralelo con T002.
- US1: T005 en paralelo con T006–T011; T006–T011 → T012; T013 en paralelo; T012 + T013 → T014 → T015 → T016.
- US2: T017 → T020; T018 primero (falla); T019 y T020 → T021 → T022 → T023 → T024; T025 → T026 (tras T024 para aislar
  regresiones); T024 + T026 → T027.
- US3: T028 en cualquier momento; T029 → T030 → T031 → T032.

### Parallel Opportunities

- Phase 2: T003 (test) con T002 (métricas).
- US1: T007 (`grupo.ts`), T008 (`db.ts`), T009 (`pasarela.ts`), T005 (test) y T013 (`beta-100.js`) en ficheros
  distintos.
- US2: T017, T018, T019 y T025 en paralelo al empezar.
- US3: T028 con cualquier tarea de US2.

## Parallel Example: User Story 1

```text
Task: "T007 [P] [US1] Fase calculo en apps/server/src/simulacion/grupo.ts"
Task: "T008 [P] [US1] Fase bd en apps/server/src/persistencia/db.ts"
Task: "T009 [P] [US1] Fases serializacion y difusion en apps/server/src/ws/pasarela.ts"
Task: "T013 [P] [US1] teardown con METRICAS_URL en tools/load/beta-100.js"
```

## Parallel Example: User Story 2

```text
Task: "T017 [P] [US2] Secuencia del actor en apps/server/tests/unit/actor.test.ts"
Task: "T018 [P] [US2] Grupo de aperturas en apps/server/tests/integration/aperturas-grupo.test.ts"
Task: "T019 [P] [US2] ejecutor en apps/server/src/persistencia/repos/*.ts"
Task: "T025 [P] [US2] Consultas por partida en repos/visionados.ts y repos/equipo.ts"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 + Phase 2 (desglose probado, sin puntos de medida).
2. Phase 3 (US1): instrumentar, medir y escribir `diagnostico.md`.
3. **Parar y revisar**: si el diagnóstico corrige la hipótesis de research R1, ajustar US2 y US3 antes de seguir.

### Incremental Delivery

- US1 sola ya es desplegable: solo añade métricas (y `MEDIR_FASES=0` la apaga).
- US2 en dos pasos medibles: grupo de aperturas (T019–T024) y después `emitirTorneo` con datos comunes (T025–T026).
- US3 según el diagnóstico; T028 (test de FR-011) se hace siempre.
- Cierre: regresión completa, tres máquinas (puede quedar pendiente) y registro en validacion.md y ROADMAP.
