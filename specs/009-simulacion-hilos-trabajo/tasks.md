---

description: "Tareas de la spec 009: simulación de partidos en hilos de trabajo (INI-07)"
---

# Tasks: Simulación de partidos en hilos de trabajo

**Input**: documentos de diseño de `specs/009-simulacion-hilos-trabajo/` ([plan.md](./plan.md), [spec.md](./spec.md),
[research.md](./research.md), [data-model.md](./data-model.md), [contracts/calculo.md](./contracts/calculo.md),
[quickstart.md](./quickstart.md)).

**Tests**: la spec y el plan los piden expresamente (FR-002, FR-004, FR-010, SC-004, SC-005; research R10):
- unitarias del grupo con un hilo de prueba (`grupoHilos.test.ts`);
- equivalencia hilo / en proceso (`calculoEquivalencia.test.ts`, SC-004);
- suite de integración entera también con 2 hilos (`test:integration:hilos`) y un test de caída real (SC-005);
- carga con k6 (`tools/load/beta-100.js`, sin cambios).

Los tests existentes **no cambian sus expectativas** (FR-010) y `pnpm test:equivalence` no se toca (FR-002).

**Reglas para quien ejecute** (CLAUDE.md y constitución):
- **pnpm**: se usa pnpm, nunca npm, yarn ni npx.
- **Tildes**: sin tildes en el código, ids ni nombres de archivo; con tildes en los textos visibles.
- **Git**: el agente no hace `git commit` ni `git push`.
- **Grafo**: antes de leer código hay que lanzar `graphify query "<pregunta>"`, y tras cambiar código, `graphify update .`.
- **Alcance**: `packages/engine` y `packages/ai` no se tocan; ni la API HTTP, ni el protocolo WebSocket, ni el esquema.
- **Sin dependencias nuevas**: `node:worker_threads` y `tsx` (ya en el monorepo).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (ficheros distintos y sin dependencias pendientes).
- **[Story]**: historia de usuario de la spec (US1, US2, US3).

---

## Phase 1: Setup

**Purpose**: el hilo debe poder arrancar en desarrollo, tests y producción antes de escribir el grupo.

- [ ] T001 Añadir `src/simulacion/hilo.ts` como segunda entrada en `apps/server/tsup.config.ts` para que el build
  produzca `dist/hilo.js` junto a `dist/main.js` (research R3). Comprobar con
  `pnpm --filter @fbd/server build` (fallará hasta T004; basta con que la entrada esté declarada).
- [ ] T002 [P] Añadir el script `"test:integration:hilos": "vitest run --config vitest.config.ts --mode hilos"` en
  `apps/server/package.json` y, en `apps/server/vitest.config.ts`, pasar a `defineConfig(({ mode }) => …)` con
  `test.env.HILOS_SIMULACION_PRUEBAS = mode === 'hilos' ? '2' : (process.env.HILOS_SIMULACION_PRUEBAS ?? '0')`.
  Funciona igual en Windows y Linux sin añadir `cross-env` (no está en el monorepo).

---

## Phase 2: Foundational (bloquea todas las historias)

**Purpose**: el servicio `Calculo` completo, en sus dos modos, inyectado en `ServiciosPartida`. Con
`hilosSimulacion: 0` (valor por defecto de `crearServidor`) el comportamiento no cambia todavía.

**⚠️ CRITICAL**: ninguna historia puede empezar hasta terminar esta fase.

### Tabla de funciones y hilo

- [ ] T003 Crear `apps/server/src/simulacion/funciones.ts` con la tabla `FUNCIONES` y los tipos `Funciones`,
  `NombreCalculo` (contrato §2). Funciones puras, sin E/S ni `ControladorPartida`, argumentos y resultados clonables:
  - `avanzar(estado: EstadoMotor, modo: ModoAvance, opciones?: OpcionesAvance) => ResultadoTramo` (de `@fbd/engine`);
  - `jugarHastaElFinal(estado, niveles: NivelesPartido, semilla) => ResultadoTramo`;
  - `resolverResto(estado, niveles, semilla) => ResultadoResolverResto` (de `@fbd/ai`);
  - `resolverRestoPorTramos(estado, niveles, semilla) => ResultadoTramo[]`: llama a `resolverResto` con un `alTramo`
    que acumula los tramos en un array y lo devuelve (sustituye al callback que hoy usa `procesarFinalizar`);
  - `decidirAlineacion(...)`: los argumentos de `@fbd/ai` `decidirAlineacion` **sin** `opciones.ahora` (no es
    clonable; el hilo usa su propio `performance.now()`, research R8);
  - `rehacer(fila: Pick<FilaPartido, 'entrada' | 'versionParametros' | 'decisiones'>, conFotogramas: boolean) => Tramos`:
    **mover** aquí la función `rehacer` de `apps/server/src/actores/partidoEntreHumanos.ts` (con `parametrosPorVersion`)
    y que `partidoEntreHumanos.ts` la importe de aquí de momento (se pasa al grupo en T019).
  - Copiar las firmas reales del código (`graphify explain "jugarHastaElFinal"` etc.), no inventarlas.
- [ ] T004 Crear `apps/server/src/simulacion/hilo.ts`, entrada del worker (contrato §3): escucha `parentPort`,
  recibe `{ id, nombre, args }`, ejecuta `FUNCIONES[nombre](...args)` y responde `{ id, ok: true, valor }` o
  `{ id, ok: false, error: { name, message, stack } }` si la función lanza. Un mensaje cada vez. Sin BD ni conexiones
  (FR-003).

### Grupo

- [ ] T005 Crear `apps/server/src/simulacion/grupo.ts` con `Prioridad`, la interfaz `Calculo` (contrato §1),
  `ErrorCalculo { nombre, motivo: 'caida' | 'tiempo' | 'cerrado', intentos }` y `crearCalculo(hilos, opciones?)`:
  - **`hilos = 0` (modo en proceso, FR-013)**: `ejecutar` llama a `FUNCIONES[nombre]` de forma síncrona y devuelve
    su resultado o su excepción en una promesa; sin copias; `cerrar()` no hace nada.
  - **`hilos ≥ 1`**: `hilos` workers sobre `new URL(import.meta.url.endsWith('.ts') ? './hilo.ts' : './hilo.js',
    import.meta.url)`; si es `.ts`, `execArgv: ['--import', 'tsx']` (research R3). `opciones.fichero` permite pasar
    otro fichero de hilo (para el hilo de prueba de T008) y `opciones.tiempoMaximoMs`/`reintentos` sobrescriben los
    valores por defecto.
  - Colas `{ humano: Tarea[], npc: Tarea[] }` FIFO; un hilo libre toma primero de `humano` (FR-012); sin expropiación;
    una tarea por hilo como mucho.
  - Tiempo máximo **20 s por intento**, contado desde que el hilo empieza la tarea, no desde que se encola.
  - **Reintentos: 2** (3 intentos) solo por caída del hilo (`error`/`exit`) o tiempo agotado: terminar el hilo, crear
    otro en su sitio y devolver la tarea **al principio** de su cola. Agotados: rechazar con `ErrorCalculo`.
  - Excepción dentro de la función: rechazar con un `Error` con su `name`, `message` y `stack`, **sin reintento**.
  - `cerrar()`: termina los hilos y rechaza lo pendiente y lo en curso con `ErrorCalculo { motivo: 'cerrado' }`.
  - Estados de la tarea y transiciones exactamente como en [data-model.md](./data-model.md) («Cálculo»).
  - Invariante: `hilos.length === tamano` salvo durante la sustitución de uno caído.
- [ ] T006 En `apps/server/src/simulacion/grupo.ts` añadir `hilosConfigurados(valor: string | undefined, nucleos =
  os.availableParallelism())` que devuelve `{ hilos, aviso? }` (FR-007): vacío/indefinido →
  `max(1, nucleos - 1)`; `"0"` → 0 con aviso de modo en proceso; entero ≥ 1 → ese valor; negativo, no entero o no
  numérico → valor por defecto con aviso de valor no válido.
- [ ] T007 [P] Añadir las métricas del grupo en `apps/server/src/observabilidad/metricas.ts`, con prom-client como
  las existentes (contrato §5): `hilos_simulacion` (gauge), `calculos_en_espera{prioridad}` (gauge),
  `calculo_duracion_ms{funcion}` (histograma, cubos de 10 a 20 000), `calculos_fallidos_total{motivo}` con
  `caida | tiempo | error`, `calculo_reintentos_total`. Conectarlas desde `grupo.ts` (gauge al encolar/desencolar,
  duración al resolver, contadores al fallar/reintentar). Registro (FR-009): `warn` en cada reintento, `error` al
  agotarlos, con la función y el motivo.

### Tests del grupo

- [ ] T008 [P] Crear `apps/server/tests/fixtures/hiloPrueba.ts`: hilo con el mismo protocolo que `hilo.ts` y
  funciones `eco(x)` (devuelve `x`), `fallar(msg)` (lanza), `morir()` (`process.exit(1)`), `colgar()` (bucle sin fin),
  más un modo `morirSiPrimeraVez(clave)` / `colgarSiPrimeraVez(clave)` para probar que el reintento acaba bien
  (p. ej. el marcador viene en los argumentos con el número de intento, o un fichero temporal).
- [ ] T009 Crear `apps/server/tests/unit/grupoHilos.test.ts` con el hilo de prueba de T008 (research R10):
  - prioridades: con 1 hilo ocupado, una `humano` encolada después de varias `npc` se ejecuta antes que ellas;
  - FIFO dentro de cada prioridad; una tarea por hilo;
  - `fallar` → rechazo con su mensaje y **sin** reintento (`calculo_reintentos_total` no cambia);
  - `morir`/`colgar` una vez → reintento con hilo nuevo y resultado correcto; el grupo sigue con el mismo tamaño;
  - `morir`/`colgar` siempre → `ErrorCalculo` con `intentos: 3` (usar `tiempoMaximoMs` pequeño en el test);
  - `cerrar()` rechaza pendientes y en curso con `motivo: 'cerrado'`;
  - modo en proceso (`hilos = 0`) sobre `FUNCIONES` reales;
  - `hilosConfigurados`: `undefined`, `""`, `"0"`, `"3"`, `"-1"`, `"1.5"`, `"abc"`, y `nucleos = 1` → 1.
- [ ] T010 [P] Crear `apps/server/tests/unit/calculoEquivalencia.test.ts` (SC-004): jugar N partidos con semillas
  fijas por `jugarHastaElFinal`, `resolverResto` y `resolverRestoPorTramos`, y `decidirAlineacion` del NPC no PRO, en
  modo en proceso y con `crearCalculo(2)`, y comparar con `toEqual` (resultado, eventos, decisiones, estadísticas).
  N = 50 por defecto; `MUESTRA_EQUIVALENCIA` lo sobrescribe (1000 para SC-004). Reutilizar cómo construyen equipos los
  tests existentes del servidor o de `tools/balance` (`equipoSintetico`) en vez de escribir otro generador.

### Configuración e inyección

- [ ] T011 Añadir `calculo: Calculo` a `ServiciosPartida` en `apps/server/src/actores/servicios.ts` y crearlo donde
  se construyen los servicios.
- [ ] T012 En `apps/server/src/servidor.ts`: `ConfigServidor.hilosSimulacion?: number` **por defecto 0**; crear el
  `Calculo` con `crearCalculo(config.hilosSimulacion ?? 0)`, pasarlo a los servicios y `await calculo.cerrar()` en
  `onClose`. Fijar el gauge `hilos_simulacion`.
- [ ] T013 En `apps/server/src/main.ts`: leer `HILOS_SIMULACION` con `hilosConfigurados` (como
  `MIGRAR_AL_ARRANCAR`), pasar `hilosSimulacion` a `crearServidor` y registrar al arrancar `info { hilos }`, o `warn`
  con el aviso (modo en proceso o valor no válido).
- [ ] T014 En `apps/server/tests/helpers/app.ts`: leer `HILOS_SIMULACION_PRUEBAS` (por defecto 0) y pasarlo como
  `hilosSimulacion` al crear el servidor de pruebas.
- [ ] T015 Verificar la fase: `pnpm --filter @fbd/server exec vitest run tests/unit/grupoHilos.test.ts
  tests/unit/calculoEquivalencia.test.ts`, `pnpm --filter @fbd/server build` (debe existir `dist/hilo.js`) y
  `pnpm --filter @fbd/server test:integration` en verde (nada pasa aún por el grupo).

**Checkpoint**: el servicio `Calculo` existe, probado en los dos modos; los actores aún no lo usan.

---

## Phase 3: User Story 1 - Abrir un partido entre humanos sin esperar a los demás (Priority: P1) 🎯 MVP

**Goal**: la apertura de un partido entre humanos, su reproducción y la alineación del NPC rival al abrir se calculan
en el grupo con prioridad `humano`; el actor sigue serializando los comandos de la partida.

**Independent Test**: `torneo-asincrono` «dos aperturas simultáneas» en verde en los dos modos; `beta-100.js` con 10
partidas abriendo a la vez da `apertura_ms` p95 < 3 s y `entrega_sobre_ms` p95 < 1 s (SC-003).

- [ ] T016 [US1] En `apps/server/src/actores/partidoEntreHumanos.ts` `resolverPartidoEntreHumanos`: sustituir la
  llamada directa a `resolverResto` por `await servicios.calculo.ejecutar('resolverResto', [estado, niveles, semilla],
  motivo === 'apertura' ? 'humano' : 'npc')` (usar el nombre real del parámetro que distingue apertura y plazo).
  Hacer `async` lo que haga falta hacia arriba hasta el comando del actor, sin sacar nada de la cola de la partida
  (FR-004). Nada se persiste ni difunde hasta tener el resultado; si el cálculo falla, el partido sigue `programado`
  y se registra `error { partidaId, partidoId, semilla, motivo }` (FR-008).
- [ ] T017 [US1] En `apps/server/src/actores/partidoRapido.ts` `alineacionParaPartido` (y `equipoParaMotor` si la
  envuelve): calcular `decidirAlineacion` del NPC por `servicios.calculo.ejecutar('decidirAlineacion', …, prioridad)`,
  con `humano` cuando abre un humano y `npc` en el resto; propagar `async` a sus llamadores.
- [ ] T018 [US1] Revisar con `graphify query "alineacionParaPartido callers"` todos los llamadores de lo que pasó a
  `async` en T016–T017 (`partidoRapido.ts`, `partidoEntreHumanos.ts`, `preparacion.ts`, `torneo.ts`, `gestor.ts`) y
  añadir los `await` que falten; `pnpm --filter @fbd/server exec tsc --noEmit` sin errores.
- [ ] T019 [US1] En `apps/server/src/actores/partidoEntreHumanos.ts` `reproduccion`: calcular con
  `servicios.calculo.ejecutar('rehacer', [fila, conFotogramas], 'humano')`, manteniendo la caché LRU de 32 por delante
  (solo el primer cálculo va al grupo). La ruta `GET /api/partidos/:id/reproduccion` no cambia.
- [ ] T020 [US1] Validar US1: `pnpm --filter @fbd/server test:integration` y `pnpm --filter @fbd/server
  test:integration:hilos` en verde sin cambiar expectativas, en particular `apps/server/tests/integration/
  torneo-asincrono.test.ts` «dos aperturas simultáneas».
- [ ] T021 [US1] Medir SC-003 en la máquina de desarrollo con el servidor arrancado con hilos por defecto:
  `k6 run -e PARTIDAS=10 -e APERTURA_MAX_S=0 tools/load/beta-100.js`; anotar `apertura_ms` p95 y `entrega_sobre_ms`
  p95 en `specs/003-mejoras-ux-simulacion/checklists/validacion.md` (fila «Carga», referencia de una máquina).

**Checkpoint**: US1 entregable sola; el resto sigue calculando en el hilo principal (equivalente al modo en proceso).

---

## Phase 4: User Story 2 - Jornadas entre NPC en menos de 10 segundos (Priority: P2)

**Goal**: los partidos NPC contra NPC de una jornada se calculan en paralelo con prioridad `npc` y se guardan en el
orden de hoy; un partido que falla no impide guardar los demás y se reintenta después.

**Independent Test**: integración en los dos modos con la misma clasificación, bajas y eventos; `jornada_npc_ms`
p95 < 10 s en `beta-100.js`.

- [ ] T022 [US2] En `apps/server/src/actores/partidoRapido.ts` `jugarTramo('final')`: separar el cálculo
  (`servicios.calculo.ejecutar('jugarHastaElFinal', [estado, niveles, semilla], prioridad)`) de la parte que asigna
  `p.motor`, persiste y difunde, para que `preparacion.ts` pueda calcular primero y guardar después. Prioridad `npc`
  para NPC contra NPC, plazo (`vencerJornada`) y `forzarFinal`. `p.motor` solo se asigna al recibir el resultado.
- [ ] T023 [US2] En `apps/server/src/actores/preparacion.ts` `resolverPartidosSinHumanos`, dos fases dentro del mismo
  comando del actor (research R6):
  1. **Calcular**: por cada partido NPC `programado`, alineaciones de los dos NPC y después `jugarHastaElFinal`, todo
     por el grupo con prioridad `npc`, con `Promise.allSettled`.
  2. **Guardar y anunciar** en serie, en el orden de los cruces como hoy: dorsales, `partido.inicio`, tramo,
     `terminarPartido`. Solo para los cálculos que terminaron.
  - Los fallidos no guardan nada (siguen `programado`) y se registran con `error { partidaId, partidoId, semilla,
    motivo }`.
  - Devolver el número de fallidos.
- [ ] T024 [US2] En `apps/server/src/actores/torneo.ts`, reintentos idempotentes de los NPC fallidos (solo partidos
  `programado` sin humanos, research R6): al reiniciar (`reprogramarTorneo` con jornada abierta), al terminar
  cualquier otro partido de esa jornada y al vencer el plazo (`vencerJornada` ya resuelve los `programado`;
  comprobarlo). `simularResto` se detiene con error si `resolverPartidosSinHumanos` devuelve fallidos, en lugar de
  repetir hasta 200 veces.
- [ ] T025 [US2] Añadir un test de integración en `apps/server/tests/integration/` que, con un `Calculo` que falle a
  propósito en un partido NPC concreto (inyectado vía `ServiciosPartida` o una opción del helper), compruebe: los
  demás partidos de la jornada se guardan; el fallido sigue `programado`; tras quitar el fallo y terminar otro partido
  de la jornada (o reiniciar), se juega y la jornada se cierra.
- [ ] T026 [US2] Validar US2: `pnpm --filter @fbd/server test:integration` y `test:integration:hilos` en verde sin
  cambiar expectativas (torneos, clasificación y bajas idénticos).

**Checkpoint**: US1 y US2 funcionan juntas; las jornadas NPC ya reparten entre hilos.

---

## Phase 5: User Story 3 - Partido en directo contra un NPC sin bloquear el servidor (Priority: P3)

**Goal**: ningún cálculo del motor queda en el hilo principal salvo las excepciones de research R9.

**Independent Test**: un partido en directo contra un NPC con decisiones en el descanso da el mismo desarrollo en los
dos modos (tests de integración de directo); `final_ms` p95 < 3 s en `beta-100.js`.

- [ ] T027 [US3] En `apps/server/src/actores/partidoRapido.ts` `jugarTramo('parte')`: calcular con
  `servicios.calculo.ejecutar('avanzar', [p.motor, 'parte', opciones], 'humano')` y asignar `p.motor` con el
  resultado; si falla, `p.motor` no cambia (data-model, «Partido en directo cuyo tramo falla»).
- [ ] T028 [US3] En `apps/server/src/actores/partidoRapido.ts` `procesarFinalizar`: sustituir `resolverResto` con
  `alTramo` por `ejecutar('resolverRestoPorTramos', …, 'humano')` y emitir los tramos devueltos en el mismo orden y con
  los mismos mensajes que hacía el callback.
- [ ] T029 [P] [US3] En `apps/server/src/actores/partido2d.ts` `avanzar2D`: calcular cada trozo de 60 ticks con
  `ejecutar('avanzar', [p.motor, 'ticks', opciones], 'humano')`; asignar el estado al recibirlo y conservar el orden de
  los trozos (no lanzar uno nuevo mientras el anterior está en curso para el mismo partido).
- [ ] T030 [P] [US3] En `apps/server/src/actores/partidoEntreHumanos.ts` `terminarPartidoEntreHumanosEnJuego`:
  `reconstruirMotor` se queda en el hilo principal (R9) y su `resolverResto` pasa a `ejecutar('resolverResto', …,
  'npc')`.
- [ ] T031 [US3] Validar US3: `apps/server/tests/integration/torneo-directo.test.ts` y el resto de la suite en los dos
  modos sin cambiar expectativas, incluida la reanudación por reconexión de un partido en directo a medias.

**Checkpoint**: todas las historias completas; solo quedan en el hilo principal las excepciones de R9.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T032 Test de caída real (SC-005) en `apps/server/tests/integration/`: servidor con 1 hilo; durante la apertura
  de un partido entre humanos, terminar el worker en curso (exponer en `Calculo`/`GrupoHilos` un acceso de pruebas a
  los workers, p. ej. `grupo.hilosParaPruebas()`, sin usarlo en producción) y comprobar el mismo marcador que en modo
  en proceso con la misma semilla y que la partida acepta otro comando después.
- [ ] T033 Ejecutar la equivalencia ampliada: `MUESTRA_EQUIVALENCIA=1000 pnpm --filter @fbd/server exec vitest run
  tests/unit/calculoEquivalencia.test.ts` (SC-004) y `pnpm test:equivalence` sin cambios (FR-002).
- [ ] T034 [P] Documentar `HILOS_SIMULACION` en `docs/despliegue.md`: valor por defecto (núcleos − 1, mínimo 1), `0`
  como interruptor de emergencia (modo en proceso), fijarla explícitamente en contenedores con cuota de CPU, y las
  métricas nuevas de `/metrics`.
- [ ] T035 Validación completa según [quickstart.md](./quickstart.md) §1–§4: `pnpm test`, integración en los dos
  modos, arranque con `HILOS_SIMULACION` vacío / `0` / `abc` (registro esperado) y `curl -s localhost:3000/metrics |
  grep -E 'hilos_simulacion|calculo'`; build de producción con `dist/hilo.js`.
- [ ] T036 Medir SC-001, SC-002 y SC-006 (quickstart §5) con servidor de 4–8 núcleos, base de datos y k6 en máquinas
  separadas (las proporciona la persona; si aún no están, dejar la tarea abierta y anotar solo la referencia de T021).
  Registrar los p95, partidas terminadas, errores y uso de CPU por núcleo en
  `specs/003-mejoras-ux-simulacion/checklists/validacion.md` (fila «Carga») y en `ROADMAP.md` INI-07 (FR-011).
- [ ] T037 `graphify update .` tras los cambios de código.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup; **bloquea** todas las historias.
- **US1 (Phase 3)**: depende de Phase 2. Es el MVP.
- **US2 (Phase 4)**: depende de Phase 2; usa `alineacionParaPartido` asíncrona de T017, así que conviene hacerla
  después de US1.
- **US3 (Phase 5)**: depende de Phase 2; toca `partidoRapido.ts` igual que US2 (T022 vs T027–T028), así que en serie
  con US2.
- **Polish (Phase 6)**: T032 depende de US1; T036 depende de todas las historias.

### Within Each Phase

- T003 → T004 → T005 → T006; T007 y T008 en paralelo con T005; T009 tras T005–T008; T010 tras T005.
- T011 → T012 → T013/T014 → T015.
- US1: T016 → T017 → T018 → T019 → T020 → T021.
- US2: T022 → T023 → T024 → T025 → T026.
- US3: T027 → T028 (mismo fichero); T029 y T030 en paralelo con ellas; T031 al final.

### Parallel Opportunities

- Phase 1: T002 con T001.
- Phase 2: T007 (métricas), T008 (hilo de prueba) y T010 (equivalencia) en ficheros distintos.
- US3: T029 (`partido2d.ts`) y T030 (`partidoEntreHumanos.ts`) en paralelo con T027–T028 (`partidoRapido.ts`).
- Polish: T034 (docs) con cualquier otra.

## Parallel Example: User Story 3

```text
Task: "T027 [US3] jugarTramo('parte') por el grupo en apps/server/src/actores/partidoRapido.ts"
Task: "T029 [P] [US3] avanzar2D por el grupo en apps/server/src/actores/partido2d.ts"
Task: "T030 [P] [US3] resolverResto heredado por el grupo en apps/server/src/actores/partidoEntreHumanos.ts"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 + Phase 2 (el grupo probado, sin uso todavía).
2. Phase 3 (US1): la apertura entre humanos y la alineación NPC por el grupo.
3. **Parar y validar**: integración en los dos modos y SC-003 con 10 partidas (T021).

### Incremental Delivery

- Cada historia se puede desplegar sola: lo que aún no pasa por el grupo sigue calculando en el hilo principal.
- `HILOS_SIMULACION=0` deja el servidor como antes de la spec en cualquier momento (interruptor de emergencia).
- US1 → medir SC-003 → US2 → US3 → medir SC-001 en máquinas separadas (T036).
