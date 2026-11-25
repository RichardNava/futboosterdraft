---

description: "Lista de tareas del rework del motor: fatiga, tácticas y rendimiento"
---

# Tasks: Rework del motor: fatiga, tácticas y rendimiento

**Input**: documentos de diseño de `specs/018-rework-motor/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/) y [quickstart.md](quickstart.md)

**Tests**: se incluyen porque la spec los exige (FR-050, SC-002, SC-004 a SC-006, SC-009 y SC-011). Dentro de cada historia se escriben primero y deben fallar antes de implementar.

**Organización**: por historias, pero **el orden de FR-001 manda sobre la prioridad**. Por eso la US3 se divide en dos fases: la cadencia entra antes de calibrar y la optimización, después de regenerar las huellas.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: se puede hacer en paralelo (ficheros distintos y sin dependencias pendientes).
- **[US1] a [US5]**: historia de la spec.
- **Persona:** la tarea la hace la persona responsable, porque publica en git, aprueba valores o necesita su equipo. Los agentes no ejecutan `git commit` ni `git push`.

## Correcciones al diseño que aplican estas tareas

Salen de contrastar el plan con el código. Prevalecen sobre el texto de `research.md`, `data-model.md` y los contratos.

1. **NPC Amateur (T033)**: la fórmula `100 − (100 − umbral) × 0,75` convierte el umbral 0 («nunca») en 25, y un Amateur empezaría a cambiar a sus Fatigados e Indisciplinados. El umbral 0 DEBE seguir siendo 0.
2. **Devolución (T076)**: `ServicioEconomia` necesita catálogo, cosméticos y ajustes, que no existen antes de `crearServidor`. La devolución se extrae a una función que recibe la transacción, y el método actual la reutiliza.
3. **Partidos reiniciados (T077)**: `decisiones` y `eventos` son `NOT NULL`, así que se vacían con `[]`. `entrada`, `estadisticas`, `marcador` e `iniciadoEn` pasan a `null`.
4. **Solapes con la 017 (T072)**: además de los de R15, la 017 tiene cambios sin confirmar en `apps/server/src/main.ts`, `economia/servicio.ts`, `avisos/servicio.ts` y `actores/sala.ts`. La migración `0018_spec017.sql` tampoco está confirmada.
5. **Módulo nuevo (T056)**: `calibrar-fatiga` aparece en los contratos, pero no en la estructura del plan. Se crea en `tools/balance/src/calibrarFatiga.ts`.

---

## Fase 1: Preparación (Etapa 0)

**Propósito**: poder medir en CI aunque fallen otras pruebas, y poder medir la línea base.

- [X] T001 [P] Crear el job independiente `rendimiento-motor` (Node 22, sin `needs`) con `pnpm --filter @fbd/engine bench` y `pnpm --filter @fbd/balance umbral-motor`, y retirar esos dos pasos del job `ci` en `.github/workflows/ci.yml` (R9)
- [X] T002 [P] Añadir a `tools/balance/src/umbralMotor.ts` el caso de partido con fotogramas y `MAX_FOTOGRAMAS_MS`, solo informativo hasta T068; mantener por ahora los máximos actuales de los otros tres casos
- [X] T003 [P] Crear `tools/balance/src/lineaBase.ts`, su script `linea-base` en `tools/balance/package.json` y una prueba de reproducibilidad con pocos partidos en `tools/balance/tests/lineaBase.test.ts`. Debe funcionar con la 8.0.0 y la 9.0.0 y medir, por táctica frente a un rival neutro, goles a favor y en contra, victorias, energía por rol al 45', 75' y 90' y coste por partido, registrando commit, Node, semillas y número de partidos
- [ ] T004 **Persona:** publicar la rama y abrir un PR en borrador para que `.github/workflows/ci.yml` ejecute `rendimiento-motor`, y comprobar que corre aunque falle el job `ci`

**Checkpoint (puerta de la etapa 0)**: el job de rendimiento se ejecuta de forma independiente.

---

## Fase 2: Fundacional (Etapa 1 y base de la etapa 2)

**Propósito**: registrar la 8.0.0, dejar un único camino de versión y activar `PARAMETROS_V9` sin cambiar todavía el comportamiento.

**⚠️ CRÍTICO**: T005 va antes de cualquier cambio en `packages/engine/src` o `packages/domain/src/parametros`. Ninguna historia empieza sin completar esta fase.

### Línea base

- [X] T005 Ejecutar con Node 22 `pnpm --filter @fbd/balance linea-base -- --n 1000 --salida specs/018-rework-motor/linea-base-8.0.0.md` sobre el motor sin tocar y revisar que el informe cubre todas las tácticas (FR-002, SC-001)

### Migración de pruebas a la versión vigente

- [X] T006 Cambiar `packages/engine/tests/ayudas.ts` y `packages/engine/tests/ayudasRasgos.ts` para usar `parametrosActuales()` en lugar de `PARAMETROS_V7`; con esto `packages/engine/bench/partido.bench.ts` deja de usar la 7.0.0 (FR-041)
- [X] T007 [P] Migrar a `parametrosActuales()` las pruebas del motor que simulan con versiones antiguas en `packages/engine/tests/`: `anadidos015`, `balonParado`, `cabeceador015`, `curvas015`, `desmarque`, `equivalencia`, `eventosGol`, `fueraDeCampo015`, `incidencias`, `opciones`, `quite015`, `receptor`, `reglas`, `relajacion` y `tiroDistancia` (FR-037)
- [X] T008 [P] Migrar las pruebas que llaman a `crearPartido` en `packages/ai/tests/`: `alineacionDuelos`, `errores`, `evaluador`, `niveles` y `rasgos` (FR-037)
- [X] T009 [P] Migrar las que simulan en `apps/server/tests/helpers/baseDatos004.ts`, `apps/server/tests/integration/migracion-0010.test.ts`, `apps/server/tests/unit/loteDecisiones.test.ts`, `apps/web/tests/unit/campoEquipoEstado.test.ts`, `tools/balance/src/sondaGoleadores.ts`, `tools/balance/src/sondaNPC.ts` y `tools/balance/tests/referencia.test.ts`, integrando a mano `packages/engine/tests/metricas.test.ts` con la 017 si ya está disponible (R15)
- [X] T010 Retirar las huellas de la 7.x: `equivalencia005.test.ts`, `equivalencia014.test.ts`, `fixtures/equivalencia-005.json`, `fixtures/huella-014.json`, `fixtures/generarEquivalencia005.ts`, `fixtures/regenerarEquivalencia005.ts`, `fixtures/equiposEquivalencia005.ts` y `fixtures/generarHuella014.ts` en `packages/engine/tests/`. Conservar `fixtures/huella014.ts`, que genera los equipos de la huella 015 y de la 018

### Retirada de ramas con la huella 015 como red

- [X] T011 Declarar en `packages/domain/src/parametros/index.ts` el tipo `ParametrosMotor`, con obligatorios los bloques hoy opcionales que usa el motor, y hacer que `EstadoMotor['parametros']` lo use en `packages/engine/src/estado/estado.ts` (R13)
- [X] T012 Retirar las ramas por versión y por bloque opcional en `packages/engine/src/` (`acciones/`, `espacio/`, `modificadores/`, `tramos/`, `estado/` y `metricas.ts`). `pnpm test:equivalence` DEBE seguir idéntico con `huella-015.json`, lo que prueba que la retirada no cambia resultados (FR-037, invariante 5)

### Parámetros 9.0.0

- [X] T013 Añadir a `packages/domain/tests/parametros/parametros.test.ts` los casos de la 9.0.0: valores de `fatiga` y `tacticas` de [data-model §3](data-model.md#3-parámetros-900), `VERSION_MAYOR_SOPORTADA = 9` y `parametrosPorVersion('8.0.0')` aún disponible para los duelos y los resúmenes
- [X] T014 Crear `PARAMETROS_V9` a partir de `PARAMETROS_V8` en `packages/domain/src/parametros/index.ts`, con los bloques `fatiga` y `tacticas` de data-model §3 y valores provisionales en los marcados **cal.**. Registrarla, hacer que `parametrosActuales()` la devuelva y fijar `VERSION_MAYOR_SOPORTADA = 9`. Conservar de momento `cansancio` y los campos antiguos de tácticas, que retiran T031 y T049
- [X] T015 Hacer que `crearPartido` lance `VersionNoSoportada` con parámetros anteriores a la 9.x en `packages/engine/src/estado/estado.ts`, y actualizar `packages/engine/tests/version.test.ts` (FR-036)
- [X] T016 Retirar `equivalencia015.test.ts`, `fixtures/huella-015.json` y `fixtures/generarHuella015.ts` en `packages/engine/tests/`, y comprobar que `equivalencia.test.ts` y `packages/ai/tests/equivalenciaFinalizar.test.ts` siguen en verde (FR-004)
- [X] T017 Comprobar las guardas de versión de `apps/server/src/actores/partidoRapido.ts`, `apps/server/src/actores/partidoEntreHumanos.ts` y `apps/server/src/simulacion/funciones.ts`; pasar a 9.x los escenarios de `tools/fixtures/src/escenarios.ts`, y cubrir en `apps/server/tests/integration/reproduccion.test.ts` que un partido 7.x u 8.x devuelve `VERSION_NO_REPRODUCIBLE` y conserva su resumen (FR-036, US5 escenario 3)

**Checkpoint**: `pnpm test` y `pnpm test:equivalence` en verde con la 9.0.0 jugando todavía como la 8.0.0.

---

## Fase 3: User Story 1 - La fatiga se nota y se puede gestionar (Priority: P1) 🎯 MVP

**Goal**: energía de 0 a 100 con gasto por rol, rasgos y acciones intensas, penalización por tipo de stat, NPC que cambian por energía y ayuda actualizada.

**Independent Test**: una serie de partidos sintéticos muestra la energía por rol y por rasgo, y en una pausa de «Gestionar equipo» el indicador coincide.

### Tests for User Story 1 ⚠️

- [X] T018 [P] [US1] Reescribir `packages/engine/tests/cansancio.test.ts` con los valores exactos: curva 85, 95, 95, 60, 65, 50, 55 y 40; 900 ticks del 30' al 45' (R3); roles 93, 67,5, 50 y 62,5; sin acciones 94,4, 76, 62 y 72; penalización 5,25, 15,5, 23 y 54,5 %; límites de 0 y 100, y `curvaEnergia` con descuento (FR-005 a FR-012, SC-002)
- [X] T019 [P] [US1] Crear `packages/engine/tests/cansancioRasgos.test.ts`: Incansable 75, Fatigado 45, Indisciplinado 44, Motivador 66,75 sin acumularse ni aplicarse a sí mismo, +15 solo en el descanso del partido y si estaba en el campo al pitarse, suplente sin recuperación y medio Fatigado e Indisciplinado cerca de 7 (FR-013 a FR-016, FR-050)
- [X] T020 [P] [US1] Crear `packages/engine/tests/cansancioAcciones.test.ts`: se cuentan las entradas en sprint y en presión, cada regate y cada duelo; solo gastan dentro de un tramo; no consumen PRNG; más acciones que la referencia dan menos energía y menos acciones, más (FR-008, FR-009, FR-017, invariante 2)
- [X] T021 [P] [US1] Actualizar las aserciones de cansancio de `packages/engine/tests/defectosFisicos.test.ts`, `packages/engine/tests/reglas.test.ts` y `packages/engine/tests/quite015.test.ts` a la energía
- [X] T022 [P] [US1] Cubrir en `packages/ai/tests/niveles.test.ts` y `packages/ai/tests/rasgos.test.ts` los umbrales 0, 42, 53 y 63, el adelanto de Fatigado e Indisciplinado, que el Amateur **nunca** cambia por energía y el orden de los niveles (FR-019)
- [X] T023 [P] [US1] Cubrir en `apps/web/tests/unit/indicadorEnergia.test.ts` la derivación técnica ×0,5 y mental ×0,25 desde la física y que los cinco tramos de color no cambian (FR-020, FR-021)

### Implementation for User Story 1

- [X] T024 [US1] Sustituir `cansancio` por `energia` (número, 0–100, empieza en 100, también los suplentes) y `penalizacionFisica` (número, 0–54,5, derivado de `energia`) en `JugadorEnPartido`, y añadir `sprint` opcional a `PosicionMovil` en `packages/engine/src/estado/estado.ts` (FR-005, R1)
- [X] T025 [US1] Reescribir `packages/engine/src/modificadores/cansancio.ts`: ritmo por rol de la **posición actual** × rasgos × táctica, tramos con `segundosEnParte > inicio × 60`, gasto por tick `ritmo × 0,8 / 60`, gasto por acción `ritmo × 0,2 × peso × factor Indisciplinado / referencia del rol`, penalización por tramos acumulados, `energiaDe` con la misma salida y la nueva `curvaEnergia`, exportada en `packages/engine/src/index.ts` (FR-006 a FR-011, FR-010a, FR-013 a FR-018, R2, R5)
- [X] T026 [US1] Conectar el gasto en `packages/engine/src/acciones/contexto.ts` y retirar `factorCansancio` de `packages/engine/src/modificadores/defectos.ts`
- [X] T027 [US1] Aplicar la recuperación +10/+15, +5 y +5 con tope de 100 en `comprobarFinParte`, antes de las decisiones de la pausa, y calcular `cansancioMedio` como la media de `1 − energia / 100` en `packages/engine/src/tramos/avanzar.ts` (FR-006, FR-016, R3)
- [X] T028 [US1] Aplicar en `atributoConBonus` la tabla de stats físicas (100 %), técnicas (50 %) y mentales (25 %) de data-model §2 en `packages/engine/src/modificadores/atributos.ts` (FR-012, R6)
- [X] T029 [US1] Crear un ayudante común de liderazgo con penalización mental en `packages/engine/src/modificadores/liderazgo.ts` y usarlo en `bonusLiderPortero` y en la línea defensiva de `packages/engine/src/espacio/objetivos.ts` (FR-012)
- [X] T030 [US1] Contar las acciones intensas según R4 en `packages/engine/src/espacio/movimiento.ts` (sprint), `packages/engine/src/espacio/objetivos.ts` (entrada en presión), `packages/engine/src/acciones/juego.ts` (regate y entrada) y `packages/engine/src/acciones/tiro.ts` (`anotarAereo`), sin consumir PRNG (FR-008, FR-009)
- [X] T031 [US1] Retirar de `PARAMETROS_V9` el bloque `cansancio`, `presionAlta.cansancio`, `individual.cansancio` y el uso de `defectos.indisciplinado` en `packages/domain/src/parametros/index.ts` (FR-015, FR-017)
- [X] T032 [US1] Cambiar `umbralCansancio` por `umbralEnergia` en `packages/ai/src/perfiles.ts`: Amateur 0, Intermedio 42, Avanzado y perfil base 53, PRO 63 (R16)
- [X] T033 [US1] Crear `umbralEnergiaDe` en `packages/ai/src/rasgos.ts` con `100 − (100 − umbral) × 0,75` para Fatigado e Indisciplinado, **devolviendo 0 si el umbral es 0**
- [X] T034 [US1] Decidir los cambios con `energia < umbral` y ordenar con `0,6 × (1 − energia / 100)` en `packages/ai/src/partido.ts`, de modo que proteger a un amonestado (0,5) conserve su peso (FR-019, R16)
- [X] T035 [P] [US1] Actualizar la ayuda con los textos de [contracts/motor.md](contracts/motor.md#textos-de-la-interfaz) en `apps/web/src/componentes/GestionEquipo.tsx` y `apps/web/src/componentes/IndicadorEnergia.tsx`, sin tocar `packages/protocol/src/ws/partido.ts` (FR-020 a FR-022)
- [X] T036 [P] [US1] Actualizar Incansable, Fatigado, Indisciplinado y Motivador en `packages/domain/src/catalogo/rasgos.ts` y regenerar `docs/juego/virtudes-y-defectos.md` con `pnpm --filter @fbd/domain rasgos:doc` (FR-022)
- [X] T037 [P] [US1] Adaptar a los nuevos minutos `apps/web/tests/e2e/control-total.spec.ts` y `apps/web/tests/e2e/gestion-equipo.spec.ts`

**Checkpoint**: valores exactos de SC-002 en verde e igualdad entre rápida y 2D (FR-004).

---

## Fase 4: User Story 2 - Cada táctica tiene una ventaja y un coste reales (Priority: P1)

**Goal**: Catenaccio, Individual, bandas, vertical y línea adelantada con los valores de la spec, todos en `PARAMETROS_V9`.

**Independent Test**: series de cada táctica contra un rival neutro comparadas con la línea base.

### Tests for User Story 2 ⚠️

- [X] T038 [P] [US2] Crear `packages/engine/tests/tacticas.test.ts`: Catenaccio −0,50 solo en zonas 4 y 5, sin centro ni tiro lejano y a la mitad en el tiro; regate +0,12 y +0,17 para un compañero; ventaja de banda consumida por la primera acción y sin efecto en otro carril, en el central o en un tiro; vertical −0,15; Bandas + Vertical ×1,8 y +0,25; línea adelantada con y sin balón; Contraataque y Combinativo sin cambios (FR-024, FR-027 a FR-033)
- [X] T039 [P] [US2] Crear `packages/engine/tests/marcajeEstrella.test.ts`: elección y empates por `id`, portero excluido, sin jugadores de campo no hay pareja, −5 en ambos sentidos, +6 en el desmarque, final sin nueva elección si sale uno, +0,05 a todos si sale la estrella, y suspensión y vuelta al cambiar de táctica (FR-025 a FR-028, R11)

### Implementation for User Story 2

- [X] T040 [US2] Mover a `PARAMETROS_V9.tacticas.pesos` y `avance`, **con el mismo valor**, los multiplicadores fijos de `pesosAcciones` y `probabilidadAvance` en `packages/engine/src/modificadores/formacionTactica.ts` (FR-034)
- [X] T041 [US2] Ampliar `desplazamientoAtaque` con el portador y `lejano`, aplicar Catenaccio, Individual y Vertical y sustituir `individual.recuperacion` y `vulnerableDesmarque` en `packages/engine/src/modificadores/formacionTactica.ts`, actualizando sus llamadas en `packages/engine/src/acciones/juego.ts` y `packages/engine/src/acciones/tiro.ts` (FR-024, FR-027, FR-028, FR-030, R10)
- [X] T042 [US2] Aplicar `factorPaseEspacio: 0.9` y los valores propios de Bandas + Vertical (`centro: 1.8`, `probabilidadBanda: 0.25`) en `pesosAcciones` y `probabilidadBanda` de `packages/engine/src/modificadores/formacionTactica.ts` (FR-029, FR-031)
- [X] T043 [US2] Añadir `ventajaBanda` (`{ lado, carril } | null`, opcional) a `EstadoMotor` en `packages/engine/src/estado/estado.ts`, guardarla en `perder` y consumirla en la primera acción del rival en `packages/engine/src/acciones/juego.ts`; el tiro la consume sin aplicarla en `packages/engine/src/acciones/tiro.ts` (FR-029, R12)
- [X] T044 [P] [US2] Quitar la condición `conBalon` de la línea adelantada en `packages/engine/src/espacio/objetivos.ts` (FR-032)
- [X] T045 [US2] Crear `packages/engine/src/modificadores/marcajeEstrella.ts` con la elección, suspensión y final del marcaje, y añadir `marcajeEstrella` (`{ estrellaId, marcadorId, activo } | null`, opcional) a `EquipoEstado` en `packages/engine/src/estado/estado.ts` (FR-026, R11)
- [X] T046 [US2] Fijar la pareja la primera vez que Individual está activo, en `packages/engine/src/estado/estado.ts` y `packages/engine/src/tramos/decisiones.ts`, y terminarla con `activo = false` cuando uno de los dos salga, en `packages/engine/src/acciones/plantel.ts` (FR-026)
- [X] T047 [US2] Aplicar −5 a la estrella en `ajusteDuelo` de `packages/engine/src/modificadores/virtudes.ts` y, junto al +6 de marcaje, en `desmarqueDelPase` y el control con presión de `packages/engine/src/acciones/juego.ts` (FR-025, FR-026)
- [X] T048 [US2] Hacer que el marcador siga a la estrella en `packages/engine/src/espacio/objetivos.ts` y aplicar su ritmo ×1,15 mientras dure el marcaje en `packages/engine/src/modificadores/cansancio.ts` (FR-018, FR-026)
- [X] T049 [US2] Retirar de `PARAMETROS_V9` el `tacticas.vertical` antiguo, `combinativo.posesion`, `individual.recuperacion` e `individual.vulnerableDesmarque` en `packages/domain/src/parametros/index.ts` (FR-035)

**Checkpoint**: pruebas de tácticas en verde e igualdad entre rápida y 2D.

---

## Fase 5: User Story 3, parte 1 - Cadencia de movimiento (Priority: P1)

**Goal**: mover cada 4 ticks con medio paso y fijar la cadencia de objetivos **antes de calibrar** (FR-003).

**Independent Test**: los fotogramas no muestran paradas alternas y la medida en CI decide entre objetivos cada 4 u 8 ticks.

### Tests for User Story 3 (parte 1) ⚠️

- [X] T050 [P] [US3] Crear `packages/engine/tests/cadencia.test.ts`: ningún jugador en desplazamiento repite posición en fotogramas consecutivos, el medio paso no saca a nadie del campo, tras una recolocación la velocidad es 0, el partido es idéntico con y sin fotogramas y NPC y humanos usan la misma cadencia (FR-042 a FR-044, invariantes 1, 4 y 6)

### Implementation for User Story 3 (parte 1)

- [X] T051 [US3] Fijar `PASO_MOVIMIENTO = 4` en `packages/engine/src/espacio/movimiento.ts`, decidir velocidad con `dt = 4`, contar sprints en ese paso y avanzar `velocidad × 2` a los ticks 0 y 2 del ciclo desde `packages/engine/src/espacio/paso.ts`; los fotogramas siguen cada 2 ticks (R7)
- [X] T052 [US3] Añadir `espacio.claveSaque` (texto, opcional) en `packages/engine/src/estado/estado.ts` y recalcular objetivos durante un saque solo si cambia la clave (motivo, sacador y posición del balón) o la referencia aún no ha alcanzado el balón, en `packages/engine/src/espacio/paso.ts` (R8)
- [X] T053 [US3] Ajustar a la nueva cadencia `packages/engine/tests/cinematica.test.ts`, `packages/engine/tests/coherenciaBalon.test.ts`, `packages/engine/tests/colocacion.test.ts`, `packages/engine/tests/fotogramas.test.ts` y `packages/engine/tests/saqueCentro.test.ts`, sin relajar lo que protegen
- [X] T054 [US3] **Persona:** publicar la rama y anotar en `specs/018-rework-motor/informe-9.0.0.md` el resultado sin fotogramas del job `rendimiento-motor` (Node 22)
- [X] T055 [US3] Aplicar la decisión de FR-003 en `packages/engine/src/espacio/paso.ts`: con ≤ 60 ms, mantener `PASO_OBJETIVOS = 4`; con más, pasar a 8 y repetir T054; si sigue por encima, **parar** hasta que decida la persona responsable

**Checkpoint (puerta de la etapa 2b)**: cadencia fijada. Ningún cambio de resultados entra después de la calibración.

---

## Fase 6: User Story 4 - El equilibrio se decide con medidas (Priority: P1)

**Goal**: calibrar referencias y pesos y dejar cada umbral aprobado y justificado.

**Independent Test**: la persona responsable lee el informe y aprueba o corrige cada umbral sin leer código.

### Implementation for User Story 4

- [ ] T056 [P] [US4] Crear `tools/balance/src/calibrarFatiga.ts` y su script `calibrar-fatiga` en `tools/balance/package.json`: mide los puntos de intensidad por minuto de tramo por rol con equipos neutros en Bloque medio y repite hasta que cada referencia varíe menos de un 1 %
- [ ] T057 [P] [US4] Crear `tools/balance/src/checks/motor018.ts` con SC-003 (por rol contra `curvaEnergia` con el descuento real, ±3), SC-004 (Incansable, Fatigado e Indisciplinado ±3, dirección de Motivador), SC-005 (Presión alta contra Bloque medio) y SC-006 (cada táctica frente a la línea base)
- [ ] T058 [US4] Registrar las comprobaciones de `motor018.ts` en `tools/balance/src/cli.ts`
- [ ] T059 [US4] Migrar a energía las comprobaciones de cansancio de `tools/balance/src/checks/motor014.ts`, `tools/balance/src/checks/partido.ts` y `tools/balance/src/checks/rasgos.ts`, sin cambiar aún sus umbrales
- [ ] T060 [US4] Ejecutar `pnpm --filter @fbd/balance calibrar-fatiga -- --n 1000` y fijar `referenciaAcciones`, `pesosAccion` y `umbralSprint` en `packages/domain/src/parametros/index.ts`, subiendo el peso de la presión si SC-005 se queda corto
- [ ] T061 [US4] Medir con `linea-base` y las mismas semillas y con `pnpm balance --n 1000`, y escribir en `specs/018-rework-motor/informe-9.0.0.md` la comparación con la 8.0.0 y, por cada umbral afectado, comprobación, valor anterior, medido, propuesto y motivo
- [ ] T062 [US4] **Persona:** revisar `specs/018-rework-motor/informe-9.0.0.md`, aprobar o corregir cada umbral y registrar nombre y fecha (SC-007)
- [ ] T063 [US4] Aplicar **solo** los umbrales aprobados en `tools/balance/src/checks/` y, si se aprobó, los de NPC en `packages/ai/src/perfiles.ts`, hasta que `pnpm balance --n 1000` pase por completo (SC-003 a SC-007)

**Checkpoint (puerta de la etapa 3)**: `pnpm balance` en verde con umbrales aprobados. A partir de aquí no cambia ningún resultado.

---

## Fase 7: User Story 3, parte 2 - Huellas y optimización (Priority: P1)

**Goal**: congelar los resultados y llegar a ≤ 60 ms sin cambiarlos.

**Independent Test**: `umbral-motor` pasa con los cuatro casos y una reproducción 2D se ve continua a 60 fps.

- [ ] T064 [US3] Crear `packages/engine/tests/fixtures/generarHuella018.ts` con los equipos de `fixtures/huella014.ts` y generar **una sola vez** `packages/engine/tests/fixtures/huella-018.json` (100 partidos y 20 drafts)
- [ ] T065 [US3] Crear `packages/engine/tests/equivalencia018.test.ts` contra `huella-018.json`, incluido en `pnpm test:equivalence` (SC-009)
- [ ] T066 [US3] Optimizar los puntos calientes medidos en `packages/engine/src/espacio/movimiento.ts`, `packages/engine/src/espacio/objetivos.ts` y `packages/engine/src/espacio/paso.ts`, comprobando `pnpm test:equivalence` idéntico tras **cada** cambio; si una mejora altera la huella, se descarta (FR-045)
- [ ] T067 [P] [US3] Añadir a `packages/engine/bench/partido.bench.ts` el caso de `resolverResto` si `@fbd/ai` se importa sin ciclo; si no, queda solo en `umbral-motor`
- [ ] T068 [US3] Activar como máximos por defecto 60, 80, 60 y 60 ms en `tools/balance/src/umbralMotor.ts`, con bloqueo también del caso con fotogramas (FR-039, FR-040)
- [ ] T069 [US3] **Persona:** publicar la rama y confirmar en verde el job `rendimiento-motor` de `.github/workflows/ci.yml` con Node 22 (SC-008)
- [ ] T070 [US3] Actualizar al nuevo objetivo y marcar la T086 de la spec 002 en `specs/002-mejoras-mvp/tasks.md` cuando T069 pase (FR-053)
- [ ] T071 [US3] **Persona:** reproducir un partido completo en `apps/web/src/pantallas/Partido2D.tsx` en el equipo de referencia y confirmar 60 fps, sin tirones ni desajustes entre balón y receptor (FR-044, SC-010)

**Checkpoint (puerta de la etapa 5)**: SC-008 y SC-009 cumplidos.

---

## Fase 8: User Story 5 - El paso a la 9.0.0 no deja nada colgado (Priority: P2)

**Goal**: cerrar una sola vez las partidas activas al desplegar, con aviso y devolución.

**Independent Test**: sobre una base con partidas en cada estado, ejecutar el cierre dos veces y comprobar estados, avisos, saldos y resúmenes.

**⚠️ Bloqueo**: no se puede completar sin T072. Se puede desarrollar en paralelo desde la fase 3.

- [X] T072 [US5] **Persona:** confirmar la spec 017 e integrarla en esta rama, como mínimo `apps/server/drizzle/0018_spec017.sql` y el tipo `partida_cerrada`, resolviendo los solapes en `apps/server/src/main.ts`, `apps/server/src/economia/servicio.ts`, `apps/server/src/avisos/servicio.ts`, `apps/server/src/actores/sala.ts` y `apps/server/src/actores/gestor.ts`

### Tests for User Story 5 ⚠️

- [ ] T073 [P] [US5] Añadir a `packages/domain/tests/partida/partida.test.ts` `cerrar_version` desde `en_draft` y `en_torneo` a `abandonada`, y su rechazo desde los demás estados
- [ ] T074 [P] [US5] Crear `apps/server/tests/integration/cierre-motor9.test.ts`: partidas en cada estado, con y sin cobro, cierre ejecutado **dos veces**; un aviso por usuario humano, cada cobro devuelto una vez, `buscando` intacta, una partida creada tras el cierre sigue activa, partidos terminados intactos, sin premios, un fallo revierte todo y un partido de una partida cerrada no se puede abrir (FR-046 a FR-049, SC-011)

### Implementation for User Story 5

- [ ] T075 [US5] Añadir el evento `cerrar_version` junto a `cerrar_admin` en `packages/domain/src/partida/partida.ts`
- [ ] T076 [US5] Extraer `devolverCobroRarezaEn(tx, partidaId)` en `apps/server/src/economia/servicio.ts` y hacer que `devolverCobroRareza` la use, conservando la protección del índice único (FR-048)
- [ ] T077 [US5] Crear `apps/server/src/actores/cierreMotor9.ts` con `cerrarPartidasMotor9(db, reloj)` según [contracts/cierre-partidas.md](contracts/cierre-partidas.md): una transacción con `pg_advisory_xact_lock`, marca `cierre_motor_9` en `ajustes`, `FOR UPDATE`, devolución, partidos en juego a `programado` (`decisiones` y `eventos` a `[]`; `entrada`, `estadisticas`, `marcador` e `iniciadoEn` a `null`) y avisos insertados en la transacción, sin correo (FR-046 a FR-049)
- [ ] T078 [US5] Llamar a `cerrarPartidasMotor9` en `apps/server/src/main.ts` después de las migraciones y antes de `crearServidor`, `rehidratar` y `listen`; si falla, el proceso termina sin aceptar tráfico (FR-046)
- [ ] T079 [US5] Hacer que `errorAlAbrir` rechace con `JORNADA_NO_ABIERTA` un partido no finalizado si la partida no está `en_torneo`, en `apps/server/src/actores/torneo.ts` (cubre también `apps/server/src/actores/aperturas.ts`)

**Checkpoint**: SC-011 cumplido.

---

## Fase 9: Pulido y cierre (Etapa 6)

- [ ] T080 [P] Actualizar `docs/juego/enfrentamientos.md` a la 9.0.0 con el efecto medido de la fatiga y de cada táctica (FR-051, SC-013)
- [ ] T081 [P] Anotar como sustituidos 001/FR-036 y 014/SC-006, revisar en la 014 FR-014, FR-015, FR-018, FR-019, los escenarios 1 y 2 de la US4, los casos límite y la asunción de energía, y anotar la ampliación de 013/FR-033, en `specs/001-draft-manager-mvp/spec.md`, `specs/014-mejoras-motor-navegacion-refactor/spec.md` y `specs/013-mejora-cartas-rareza-draft/spec.md` (FR-023, FR-048)
- [ ] T082 [P] Sustituir los objetivos de rendimiento y actualizar el estado de INI-06, INI-07 e INI-16 en `ROADMAP.md`, y actualizar FR-028a en `specs/002-mejoras-mvp/spec.md` (FR-039)
- [ ] T083 [P] Actualizar en `CLAUDE.md` la especificación en curso y añadir los comandos `linea-base` y `calibrar-fatiga`
- [ ] T084 **Persona:** ejecutar `k6 run tools/load/beta-100.js` en el equipo B de 8 núcleos y registrar en `specs/018-rework-motor/informe-9.0.0.md` la CPU y la apertura p95 frente a la referencia de 94 % y unos 15 s (FR-052, SC-012)
- [ ] T085 Ejecutar la comprobación final de `specs/018-rework-motor/quickstart.md`: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`, `pnpm test:equivalence`, `umbral-motor` y `pnpm balance --n 1000`
- [ ] T086 Ejecutar `graphify update .` para actualizar `graphify-out/` con el código final

---

## Dependencies & Execution Order

### Orden de fases (FR-001)

```text
Fase 1 → Fase 2 → US1 + US2 → US3 parte 1 → US4 → US3 parte 2 → Fase 9
                      └────────── US5 (en paralelo, tras integrar la 017) ──────┘
```

| Fase | Depende de | Puerta |
|---|---|---|
| 1. Preparación | Nada | El job de rendimiento corre solo |
| 2. Fundacional | Fase 1 | Línea base registrada y 9.0.0 activa sin cambio de juego |
| 3. US1 | Fase 2 | SC-002 |
| 4. US2 | Fase 2 y T025 (ritmo) | Pruebas de tácticas |
| 5. US3, parte 1 | US1 y US2 | Cadencia fijada (FR-003) |
| 6. US4 | Fase 5 | Umbrales aprobados y `pnpm balance` en verde |
| 7. US3, parte 2 | US4 | SC-008 y SC-009 |
| 8. US5 | Fase 2 y T072 | SC-011 |
| 9. Pulido | Todas | SC-010 a SC-013 |

### Dependencias clave

- **T005 antes que T006 a T017**: la línea base mide el motor sin tocar.
- **T012 antes que T014**: la huella 015 demuestra que retirar ramas no cambia resultados.
- **T055 antes que T056**: cambiar la cadencia después de calibrar invalidaría la calibración.
- **T062 antes que T063**: ningún umbral cambia sin aprobación.
- **T063 antes que T064**: la huella se regenera una sola vez.
- **T072 antes de validar T074 y T077**: sin la migración, el aviso incumple `avisos_tipo_ck`.
- **El despliegue exige US5**: la 9.0.0 no debe salir sin el cierre.

### Parallel Opportunities

Hay 28 tareas marcadas con [P].

- **Fase 1**: T001, T002 y T003.
- **Fase 2**: T007, T008 y T009, tras T006.
- **US1**: pruebas T018 a T023; textos y e2e T035, T036 y T037.
- **US2**: pruebas T038 y T039; T044, mientras nadie edite `objetivos.ts`.
- **US3**: T050 y T067.
- **US4**: T056 y T057.
- **US5**: pruebas T073 y T074.
- **Pulido**: T080 a T083.

Las tareas del motor sin [P] comparten ficheros muy editados (`juego.ts`, `estado.ts`, `formacionTactica.ts` y `cansancio.ts`) y conviene hacerlas en serie.

---

## Parallel Example: User Story 1

```bash
# Pruebas de la US1, en paralelo y antes de implementar:
Task: "T018 Valores exactos en packages/engine/tests/cansancio.test.ts"
Task: "T019 Rasgos en packages/engine/tests/cansancioRasgos.test.ts"
Task: "T020 Acciones intensas en packages/engine/tests/cansancioAcciones.test.ts"
Task: "T022 NPC en packages/ai/tests/niveles.test.ts y rasgos.test.ts"
Task: "T023 Ayuda en apps/web/tests/unit/indicadorEnergia.test.ts"
```

---

## Implementation Strategy

### MVP

El MVP técnico son las fases 1 a 3: línea base, 9.0.0 y fatiga. **Sirve para validar la fatiga, pero no se puede desplegar**: la calibración aún no está cerrada y faltan el cierre de partidas y el objetivo de rendimiento.

### Entrega incremental

1. Fases 1 y 2: línea base y una sola versión, sin cambios de juego.
2. US1 y US2: nuevas reglas, con pruebas exactas.
3. US3, parte 1: cadencia decidida con la medida de CI.
4. US4: la persona responsable aprueba el equilibrio.
5. US3, parte 2: huella y optimización sin cambiar resultados.
6. US5 y pulido: cierre de partidas, carga, documentos y despliegue.

### Puntos de parada para la persona responsable

T004, T054, T062, T069, T071, T072 y T084. Además, T055 se detiene si ni con 8 ticks se alcanzan los 60 ms.

---

## Notes

- Toda la lógica nueva vive en el motor único (FR-038), y tras cada cambio la igualdad entre rápida y 2D debe seguir en verde (FR-004).
- No regenerar huellas para hacer pasar una optimización: si la huella cambia, la optimización no es válida.
- No relajar un umbral de `pnpm balance` sin su fila aprobada en `informe-9.0.0.md`.
- Los agentes sugieren `git commit` y `git push` con el comando exacto, pero no los ejecutan.
