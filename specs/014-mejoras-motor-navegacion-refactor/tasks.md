---

description: "Lista de tareas de la spec 014: mejoras del motor, navegación sin pestañeo y refactorización"
---

# Tasks: Mejoras del motor, navegación sin pestañeo y refactorización

**Input**: documentos de diseño de `specs/014-mejoras-motor-navegacion-refactor/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md),
[contracts/](contracts/) y [quickstart.md](quickstart.md)

**Tests**: SÍ. La spec y los contratos fijan una prueba para cada invariante (columna «Prueba» de
[motor.md](contracts/motor.md) y [ui.md](contracts/ui.md)) y la constitución (Principio IX) exige demostrar la calidad
con pruebas. Dentro de cada historia, las pruebas se escriben antes y deben fallar antes de implementar.

**Organization**: una fase por historia. Orden de las fases del motor según el plan («Orden de entrega»): US1 y US3
antes que US2, porque el mano a mano no debe pasar a un compañero en fuera de juego. US6 es independiente del motor y
puede ir en paralelo a US1–US5. US7 va siempre al final (FR-032).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (ficheros distintos, sin dependencias pendientes)
- **[Story]**: historia a la que pertenece (US1…US7)
- Todas las rutas son relativas a la raíz del monorepo

## Path Conventions

Monorepo pnpm: `packages/{domain,engine,protocol,ai}`, `apps/{server,web}`, `tools/balance`, `scripts/`. Pruebas del
motor en `packages/engine/tests/`, de la web en `apps/web/tests/unit/` y `apps/web/tests/e2e/`.

---

## Phase 1: Setup (infraestructura compartida)

**Purpose**: dejar la referencia de la 6.3.0 con la que se comparan SC-009 y FR-023.

- [ ] T001 Ejecutar `pnpm balance` con los parámetros 6.3.0 actuales y guardar en `specs/014-mejoras-motor-navegacion-refactor/referencia-6.3.0.md` la proporción de partidos con ≥ 6 goles de diferencia, goles por partido, fueras de juego por partido y el resultado de cada comprobación de rasgos (referencia de SC-009 y FR-023)
- [ ] T002 [P] Ejecutar `pnpm test`, `pnpm test:integration` y `pnpm test:equivalence` sobre `main` y anotar en `specs/014-mejoras-motor-navegacion-refactor/referencia-6.3.0.md` los tests que dependen de valores concretos del motor 6.x (los que habrá que actualizar en US1–US5, nunca en US7)

---

## Phase 2: Foundational (prerrequisitos bloqueantes)

**Purpose**: la versión de parámetros 7.0.0 y los huecos del informe que usan todas las historias del motor.

**⚠️ CRITICAL**: ninguna historia del motor (US1–US5) empieza hasta cerrar esta fase. US6 no depende de ella.

- [ ] T003 Añadir a los tipos de parámetros en `packages/domain/src/parametros/index.ts` los campos nuevos de [data-model §1](data-model.md#1-parámetros-de-equilibrado-700): `cansancio.maximo`, `espacio.rozamientoSuelto`, el bloque `manoAMano` (`pasilloM`, `margenAtrasM`, `distanciaBaseM`, `distanciaPorRemateM`, `paraleloM`, `errorDecision`), `idaVuelta.avanceMinimoM` y el bloque `fueraDeJuego` (`toleranciaM`, `holguraMaxM`, `pesoReceptor`); volver opcionales en el tipo `acciones.probabilidadManoAMano`, `acciones.probabilidadFueraDeJuegoBase` y `tacticas.lineaAdelantada.fuerasDeJuegoProvocados`
- [ ] T004 Crear `PARAMETROS_V7` (versión `'7.0.0'`) heredando de `PARAMETROS_V6_3` en `packages/domain/src/parametros/index.ts` con los valores iniciales de data-model §1 (`cansancio.maximo` 0,6; `degradacionPorMinuto` 0,011; `pasilloM` 4; `margenAtrasM` 1; `distanciaBaseM` 14; `distanciaPorRemateM` 1,5; `paraleloM` 2; `avanceMinimoM` 3; `toleranciaM` 0,3) y sin `probabilidadManoAMano`, `probabilidadFueraDeJuegoBase` ni `lineaAdelantada.fuerasDeJuegoProvocados`; `parametrosActuales()` devuelve la 7.0.0 y `VERSION_MAYOR_SOPORTADA = 7` (research R14)
- [ ] T005 Actualizar `packages/engine/tests/version.test.ts` y los tests que crean partidos con 3.x–6.x (lista de T002) para que usen la 7.0.0 o comprueben `VERSION_NO_SOPORTADA` (research R14)
- [ ] T006 [P] Comprobar que un partido 6.x se abre como resumen con `AVISO_VERSION_ANTERIOR` en `apps/web/src/pantallas/ReproduccionPartido.tsx` y que `apps/server/src/actores/partidoRapido.ts` y `partidoEntreHumanos.ts` devuelven `null` al rehacer un partido con versión menor; ajustar sus tests si el número de versión está fijado
- [ ] T007 Añadir a `packages/engine/src/metricas.ts` los contadores vacíos que rellenarán las historias: `manoAMano` (total, a distancia de disparo, terminados en tiro, en pase atrás), `idaVuelta` (secuencias sin presión ni avance, máxima longitud), `fuerasDeJuego[]` (`xInfractor`, `xPenultimo`, `xBalon`), energía por minuto y rendimiento antes/después del inicio del cansancio; con su test en `packages/engine/tests/metricas.test.ts`
- [ ] T008 Crear `tools/balance/src/checks/motor014.ts` con el esqueleto de las secciones «Mano a mano», «Ida y vuelta», «Fuera de juego» y «Cansancio» (objetivo, valor medido, cumple) y registrarlo en `tools/balance/src/informe.ts`

**Checkpoint**: `pnpm typecheck` y `pnpm test` en verde con la 7.0.0 activa (todavía con el comportamiento 6.3).

---

## Phase 3: User Story 1 - El balón solo se mueve cuando alguien lo juega (Priority: P1) 🎯 MVP

**Goal**: el balón suelto rueda en su última dirección y frena; el jugador corre hacia él. Nunca va al encuentro de
quien lo persigue (research R1, contrato M1).

**Independent Test**: `pnpm --filter @fbd/engine test coherenciaBalon` sobre 20 semillas fijas y revisión en la 2D
(quickstart §3, pasos 1–2).

### Tests for User Story 1

- [ ] T009 [P] [US1] Crear `packages/engine/tests/coherenciaBalon.test.ts`: en 20 partidos con semillas fijas, cada fotograma en que el balón cambia de dirección (> 20°) o arranca desde parado dentro del campo tiene un jugador a ≤ `LLEGADA` + radio de chapa o una acción `saque` abierta (M1.1, SC-001)
- [ ] T010 [P] [US1] En `packages/engine/tests/coherenciaBalon.test.ts`, caso preparado: un balón suelto mantiene su dirección y su velocidad baja tick a tick según `espacio.rozamientoSuelto`, nunca se acerca al jugador que va a por él (M1.2); y dos jugadores con velocidades distintas a la misma distancia: llega y se lo queda el más rápido (M1.3)

### Implementation for User Story 1

- [ ] T011 [US1] Añadir `velocidadBalon: { x: number; y: number }` (décimas por tick, enteras) a `EstadoEspacio` en `packages/engine/src/estado/estado.ts`, inicializado a cero (data-model §2.1)
- [ ] T012 [US1] En `packages/engine/src/espacio/balon.ts`, fijar `velocidadBalon` al cerrar `volar` y `conducir`, ponerla a cero con el balón pegado a un jugador o parado, y hacer que `moverBalon` mueva el balón suelto en su dirección multiplicando la velocidad por `(1 − rozamientoSuelto)` cada tick hasta pararse; el caso `saque` (`reponer`) sigue rodando al punto de reanudación
- [ ] T013 [US1] En `packages/engine/src/acciones/animaciones.ts`, `recuperarSuelto()` abre la acción `control` «suelto» **sin `aId`**; el recuperador actualiza su destino a la posición actual del balón en cada tick del bucle `hasta` y la acción termina cuando un jugador llega (`LLEGADA`); si llega antes un rival, cambia la posesión (FR-002)
- [ ] T014 [US1] Revisar los tres llamadores de `recuperarSuelto` (`volar` sin receptor alcanzado, `perder`/`RecuperadorTrasPerdida`, inicio de `paso` sin balón) en `packages/engine/src/acciones/animaciones.ts` y `packages/engine/src/acciones/juego.ts` para que no dependan del `aId` retirado
- [ ] T015 [US1] Calibrar `espacio.rozamientoSuelto` en `packages/domain/src/parametros/index.ts` (`PARAMETROS_V7`) para que un pase que no alcanza a nadie frene en una distancia creíble (≈ 5–15 m) y pasen T009–T010
- [ ] T016 [US1] Actualizar los tests con valores fijados por el motor que cambien con la nueva física (`packages/engine/tests/fotogramas.test.ts`, `determinismo.test.ts`, `cinematica.test.ts` y los de T002), sin rebajar lo que comprueban; `determinismo.test.ts` sigue comprobando que la rápida y la 2D dan los mismos eventos y fotogramas (M1.4)

**Checkpoint**: US1 funcional; en la 2D el balón nunca se mueve sin contacto ni reanudación.

---

## Phase 4: User Story 3 - Se pitan los fueras de juego (Priority: P1)

**Goal**: el fuera de juego sale de las posiciones reales en el momento del pase, sin sorteo; la línea adelantada
provoca más por la posición de sus defensas (research R4, contrato M4).

**Independent Test**: `pnpm --filter @fbd/engine test fueraDeJuego` con situaciones preparadas y, en la 2D, pitido y
falta del defensor desde donde estaba el infractor (quickstart §3, pasos 3–4).

### Tests for User Story 3

- [ ] T017 [P] [US3] Crear `packages/engine/tests/fueraDeJuego.test.ts` con los casos M4.1–M4.6: receptor en campo rival por delante del balón y del penúltimo (> `toleranciaM`) ⇒ fuera de juego con el receptor como `autor` y falta del defensor desde la posición del receptor al salir el pase; a la altura (≤ `toleranciaM`) o por detrás ⇒ legal; en su campo ⇒ legal; por detrás del balón ⇒ legal; en posición correcta al salir el pase y adelantado después ⇒ legal; `penultimoDefensor` cuenta al portero
- [ ] T018 [P] [US3] Añadir a `packages/engine/tests/balonParado.test.ts` que un saque de banda, de puerta o de esquina con el receptor por delante de la defensa nunca se pita (M4.5, FR-009), y a `packages/engine/tests/descuento.test.ts` que un fuera de juego en el último minuto se pita y respeta el final del tiempo (M4.7)

### Implementation for User Story 3

- [ ] T019 [P] [US3] Crear `packages/engine/src/acciones/fueraDeJuego.ts` con las funciones puras `penultimoDefensor(estado, defensor, ladoAtacante): number` (x en coordenadas del atacante del segundo rival más retrasado, portero incluido) y `enFueraDeJuego(estado, atacante, receptor, xBalon): boolean` (campo rival **y** x > x del balón **y** x > penúltimo + `fueraDeJuego.toleranciaM`)
- [ ] T020 [US3] En `packages/engine/src/acciones/balonParado.ts`, `fueraDeJuego()` repone con falta del equipo defensor desde la posición del infractor en el momento del pase (antes, una celda fija; FR-010) y registra en métricas `xInfractor`, `xPenultimo` y `xBalon` (data-model §2.4)
- [ ] T021 [US3] En `packages/engine/src/acciones/juego.ts`, evaluar `enFueraDeJuego` con las posiciones del momento del pase (antes de `volar`) en todo pase de juego (`pase_corto`, `pase_largo`, `pase_espacio`, centro con su rematador y saque de falta); si está en fuera de juego, el pase se dibuja, cuenta como no completado y se llama a `fueraDeJuego()`; retirar el sorteo de `probabilidadFueraDeJuegoBase` y `lineaAdelantada.fuerasDeJuegoProvocados` (FR-011)
- [ ] T022 [US3] En `packages/engine/src/espacio/objetivos.ts`, limitar el destino de cada atacante sin balón a x ≤ penúltimo defensor + `fueraDeJuego.holguraMaxM` × (1 − factor de desmarque/posicionamiento que ya usa `llegadaAlArea`) (FR-012)
- [ ] T023 [US3] En `packages/engine/src/acciones/receptor.ts` (`pesosReceptor`), multiplicar el peso de un candidato en fuera de juego por `fueraDeJuego.pesoReceptor` × (1 − factor de visión del pasador)
- [ ] T024 [US3] Rellenar la sección «Fuera de juego» de `tools/balance/src/checks/motor014.ts`: fueras de juego por partido en 1.000 partidos (1–6, SC-004), serie con y sin línea adelantada (≥ +30 %) y comprobación automática de SC-005 (cada pitado con `xInfractor` > `xPenultimo` y > `xBalon`)
- [ ] T025 [US3] Calibrar `fueraDeJuego.holguraMaxM` y `fueraDeJuego.pesoReceptor` en `PARAMETROS_V7` (`packages/domain/src/parametros/index.ts`) con `pnpm balance` hasta cumplir SC-004 y M4.9
- [ ] T026 [P] [US3] Comprobar en `apps/web/tests/e2e/partido-2d.spec.ts` que un evento `fuera_de_juego` muestra el pitido, el evento «Fuera de juego» con el jugador y el saque del rival, y que «Fueras de juego» aparece en las estadísticas del partido (FR-013)

**Checkpoint**: US1 y US3 juntas; los fueras de juego se ven en la 2D y en el informe.

---

## Phase 5: User Story 2 - Un atacante solo ante el portero busca el gol (Priority: P1)

**Goal**: el mano a mano se detecta por posiciones y sigue la directriz de FR-004; desaparecen las idas y vueltas sin
sentido (research R2, R3; contratos M2, M3).

**Independent Test**: `pnpm --filter @fbd/engine test manoAMano receptor` con situaciones preparadas, y secciones
«Mano a mano» e «Ida y vuelta» de `pnpm balance`.

### Tests for User Story 2

- [ ] T027 [P] [US2] Crear `packages/engine/tests/manoAMano.test.ts` con M2.1–M2.7: lejos y sin presión ⇒ `conduccion`; a distancia de disparo ⇒ `tiro`; remate 90 tira y remate 60 conduce a la misma distancia límite (FR-007); portero adelantado ⇒ `tiro` desde más lejos; rival encima + compañero en paralelo libre, en posición correcta y con mejor ocasión ⇒ `{ pase }`; compañero en fuera de juego, marcado o ausente ⇒ `tiro` o `conduccion`, nunca pase atrás; defensa de campo dentro del pasillo ⇒ no es mano a mano
- [ ] T028 [P] [US2] Añadir a `packages/engine/tests/receptor.test.ts`: tras `X → portador` sin presión y sin ganar `idaVuelta.avanceMinimoM`, X no es candidato (M3.1); con `rivalEncima`, la pared X → portador → X sigue permitida (M3.2)

### Implementation for User Story 2

- [ ] T029 [P] [US2] Crear `packages/engine/src/acciones/manoAMano.ts` con las funciones puras `esManoAMano(estado, atacante, portador, entorno)` (campo rival y ningún rival de campo en el pasillo portador → centro de la portería de medio ancho `manoAMano.pasilloM` con x > x del portador − `margenAtrasM`) y `decisionManoAMano(...)` → `'tiro' | { pase: JugadorEnPartido } | 'conduccion'` en el orden de FR-004: tiro si distancia ≤ `distanciaBaseM` + `distanciaPorRemateM` × (remate − 70) / 10 (más con `porteroAdelantado`); pase si `rivalEncima` y un compañero con x ≥ x del portador − `paraleloM`, no `enFueraDeJuego`, libre (sin rival a < `LIBRE`) y con mejor ocasión (`anguloTiro` o distancia); si no, conducción hacia el punto de penalti
- [ ] T030 [US2] En `paso()` de `packages/engine/src/acciones/juego.ts`, antes de `elegirPonderado`, aplicar `decisionManoAMano` cuando `esManoAMano`; con probabilidad `manoAMano.errorDecision` × (1 − factor de visión) volver a los pesos normales (FR-005); retirar el sorteo de `probabilidadManoAMano` y la función `manoAMano()` antigua, conservando el efecto de Matador («siempre tira» en la frontal tras pase al espacio o regate)
- [ ] T031 [US2] Añadir `avance` (x ganada por el pase, en décimas) a `EstadoPosesion.ultimoPase` en `packages/engine/src/estado/estado.ts` y rellenarlo al completar cada pase en `packages/engine/src/acciones/juego.ts` (data-model §2.5)
- [ ] T032 [US2] En `receptorDePase` de `packages/engine/src/acciones/receptor.ts`, excluir al último pasador si el portador no tiene `rivalEncima` y `ultimoPase.avance` < `idaVuelta.avanceMinimoM`; sin candidatos, `planearPase` devuelve `null` y el portador conduce (FR-006)
- [ ] T033 [US2] Registrar en `packages/engine/src/metricas.ts` cada mano a mano (a distancia de disparo o no, terminado en tiro o en pase atrás) y cada secuencia A → B → A → B sin presión ni avance
- [ ] T034 [US2] Rellenar las secciones «Mano a mano» (SC-002: ≥ 80 % de tiros a distancia de disparo, < 2 % de pases atrás) e «Ida y vuelta» (SC-003: 0 secuencias de más de dos) de `tools/balance/src/checks/motor014.ts` sobre 1.000 partidos
- [ ] T035 [US2] Calibrar `manoAMano.errorDecision` y, si hace falta, el resto del bloque `manoAMano` en `PARAMETROS_V7` (`packages/domain/src/parametros/index.ts`) hasta cumplir SC-002 y SC-003 con margen; actualizar los tests de Matador en `packages/engine/tests/virtudesExistentes.test.ts` si cambia su disparador

**Checkpoint**: US1, US3 y US2 cerradas; las decisiones de ataque siguen la directriz.

---

## Phase 6: User Story 4 - El cansancio se nota y se ve en «Gestionar equipo» (Priority: P2)

**Goal**: energía ≈ 50 % al 90' sin rasgos, calculada solo por el motor, enviada en la pausa y pintada en las chapas
de «Gestionar equipo» (research R5, R6; contratos M5, protocolo, U1).

**Independent Test**: `pnpm --filter @fbd/engine test cansancio`, sección «Cansancio» del informe y quickstart §4
(descanso con todos al 100 %; después del 75' con porcentajes, caras y penalización).

### Tests for User Story 4

- [ ] T036 [P] [US4] Crear `packages/engine/tests/cansancio.test.ts` con M5.1–M5.6: sin rasgos antes de `inicioMin` (o `inicioMinPresionAlta`) energía 100 y penalización 0; al final del 90' sin rasgos energía 45–55 y penalización 27–33; tras una prórroga energía < 40; un sustituto entra a 100 y se cansa desde su entrada; Incansable, Fatigado, Indisciplinado, Motivador, Presión alta e individual cambian la energía igual que `cansancio`; `cansancio` nunca supera `cansancio.maximo`
- [ ] T037 [P] [US4] Crear `apps/web/tests/unit/indicadorEnergia.test.ts` para `tramoEnergia()`: 100/80 ⇒ `fresco`, 79/60 ⇒ `bien`, 59/40 ⇒ `medio`, 39/20 ⇒ `cansado`, 19/0 ⇒ `agotado` (los límites pertenecen al tramo superior); penalización visible solo con energía < 80; `aria-label` «Energía 67 %, rinde un 20 % menos» y penalización escrita «−20 %»
- [ ] T038 [P] [US4] Añadir a la prueba de `datosPausa` del servidor (en `apps/server/tests/`, junto a las de `partidoRapido`) que `energia` trae a todos los jugadores con `enCampo` de los dos equipos y a ninguno del banquillo, expulsado, lesionado retirado o sustituido

### Implementation for User Story 4

- [ ] T039 [US4] En `packages/engine/src/modificadores/cansancio.ts`, sustituir el tope fijo `0.6` por `cansancio.maximo` y añadir `energiaDe(estado, jugador): { energia, penalizacion }` con `energia = round(100 × (1 − cansancio / maximo))` y `penalizacion = round(100 × cansancio)` (data-model §2.2); exportarla en `packages/engine/src/index.ts`
- [ ] T040 [US4] Calibrar `cansancio.degradacionPorMinuto` en `PARAMETROS_V7` (`packages/domain/src/parametros/index.ts`), descuento incluido, hasta que pase T036; si Presión alta pierde su sentido táctico en el informe, bajar `tacticas.presionAlta.cansancio` en la misma versión (research R5)
- [ ] T041 [US4] Rellenar la sección «Cansancio» de `tools/balance/src/checks/motor014.ts`: energía media al 45', 75', 90' y 120' por perfil (normal, Presión alta, Fatigado, Incansable) y acierto de pase y duelos antes del inicio frente a los 10 últimos minutos (SC-006, M5.7)
- [ ] T042 [P] [US4] Añadir a `MsgPartidoPausa` en `packages/protocol/src/ws/partido.ts` el campo opcional `energia: z.array(z.object({ jugadorId: z.number().int(), energia: z.number().int().min(0).max(100), penalizacion: z.number().int().min(0).max(100) })).optional()` ([contracts/protocolo.md](contracts/protocolo.md))
- [ ] T043 [US4] En `datosPausa()` de `apps/server/src/actores/partidoRapido.ts`, rellenar `energia` con `energiaDe` para todos los jugadores con `enCampo` de los dos equipos en las pausas `descanso`, `pre_prorroga`, `gol` e `incidencia` (2D y rápida)
- [ ] T044 [P] [US4] Crear `apps/web/src/componentes/IndicadorEnergia.tsx` con la función pura `tramoEnergia(energia): TramoEnergia` (`fresco` | `bien` | `medio` | `cansado` | `agotado`) y el componente `{ energia, penalizacion }`: cinco caras SVG propias con expresiones distintas, porcentaje entero encima, penalización «−N %» en rojo debajo solo con energía < 80, `aria-label` del contrato U1 y sin animación
- [ ] T045 [P] [US4] Añadir en `apps/web/src/estilos/campo.css` los tokens `--energia-fresco`, `--energia-bien`, `--energia-medio`, `--energia-cansado` y `--energia-agotado` en `:root` con su variante oscura, y la colocación del indicador en el hueco ya reservado encima y debajo de la chapa (cara superpuesta en la esquina del retrato si en móvil no cabe al lado), sin hacer crecer la rejilla (Principio XI)
- [ ] T046 [US4] En `apps/web/src/componentes/GestionEquipo.tsx`, leer `energia` del mensaje de pausa y pasar el mapa por `jugadorId` a `apps/web/src/componentes/CampoEquipo.tsx`, que pinta `IndicadorEnergia` en la chapa solo en modo `partido` y solo para los jugadores presentes en el mapa (FR-016, FR-018); nunca en `Alineacion` entre jornadas ni en la reproducción de la 2D (FR-017)
- [ ] T047 [US4] Añadir en la cabecera de la pestaña Alineación de `apps/web/src/componentes/GestionEquipo.tsx` un botón «?» con la tabla de los cinco tramos (cara, color, rango) y la frase «Desde el minuto 65 (55 con Presión alta) los jugadores se cansan y rinden menos» (FR-020)
- [ ] T048 [US4] Ampliar `apps/web/tests/e2e/gestion-equipo.spec.ts` (y `control-total.spec.ts` para la pausa tras el 75'): en el descanso todos los titulares a 100 % sin penalización; tras el 75' porcentajes < 100 con penalización en rojo; tras un cambio el que entra marca 100 %; la ayuda «?» muestra los tramos; durante la reproducción 2D no hay indicador (SC-007)

**Checkpoint**: energía visible y coherente con el motor en todas las pausas de gestión.

---

## Phase 7: User Story 5 - Las estadísticas de los jugadores deciden más (Priority: P2)

**Goal**: cada estadística sube la frecuencia y el acierto de la acción que gobierna (+10 % relativo con +15 puntos),
sin volver a las goleadas (research R7, contrato M6). Cierra la 7.0.0.

**Independent Test**: sección «Peso de las estadísticas» del informe de `pnpm balance` y comprobaciones existentes
(goleadas, goles por partido, rasgos) frente a `referencia-6.3.0.md`.

### Tests for User Story 5

- [ ] T049 [P] [US5] Crear `tools/balance/src/checks/pesoStats.ts`: para pase, regate, remate, defensa (quite), físico, velocidad y portero, serie A/B con `conStatsDesplazados` de `tools/balance/src/equipos.ts` (+15 en los jugadores que usan la estadística) que mide intentos y tasa de éxito de la acción que gobierna con su error estándar; criterio ≥ +10 % relativo en ambos (velocidad: balones sueltos ganados; portero: solo paradas sobre tiros a puerta) (SC-008, M6.1–M6.2); registrarlo en `tools/balance/src/informe.ts`
- [ ] T050 [P] [US5] Añadir a `packages/engine/src/metricas.ts` (con su test en `packages/engine/tests/metricas.test.ts`) los contadores que necesita `pesoStats.ts` por equipo: intentos y éxitos de pase, regate, tiro (y goles), entradas (con faltas por entrada y recuperaciones), duelos de conducción, balones sueltos ganados y paradas

### Implementation for User Story 5

- [ ] T051 [US5] En `packages/engine/src/acciones/opciones.ts`, aplicar el factor de remate también dentro del área (hoy solo fuera) y leer de parámetros los `k` de `decision.factores` (pase, visión, regate, remate, físico) sin constantes en el código
- [ ] T052 [US5] En `packages/engine/src/espacio/` (`radioDe`/`radioIntervencion`) y `packages/engine/src/acciones/duelo.ts`, dar más peso al quite en el radio de intervención (más duelos defensivos) y en el duelo frente a regate/conducción, y hacer que `factorFalta` baje con el quite (entradas más limpias)
- [ ] T053 [US5] En `packages/engine/src/acciones/tiro.ts` y `packages/engine/src/acciones/pesoTiro.ts`, dar más peso al remate en la probabilidad de gol y a la estadística de portero en la parada, leyendo los coeficientes de `tiro.*`
- [ ] T054 [US5] Ajustar en `PARAMETROS_V7` (`packages/domain/src/parametros/index.ts`) `decision.factores.*`, `acciones.pendiente*`, `espacio.velocidadJugadorMin/Max` y `tiro.*` iterando con `pnpm balance` hasta cumplir SC-008 en todas las estadísticas
- [ ] T055 [US5] Volver a ejecutar `pnpm balance` completo y comprobar frente a `specs/014-mejoras-motor-navegacion-refactor/referencia-6.3.0.md` que la proporción de partidos con ≥ 6 goles de diferencia no sube (SC-009), que goles por partido y cada rasgo siguen en su criterio (FR-023) y que SC-002, SC-003, SC-004 y SC-006 siguen cumpliéndose tras los ajustes; si algo se sale, ajustar pendientes o reparto de pesos, no los objetivos
- [ ] T056 [US5] Actualizar los tests del motor con valores fijados que cambien por la calibración final (`packages/engine/tests/equivalencia.test.ts`, `equivalencia005.test.ts`, `rasgosProbados.test.ts`, `tiroDistancia.test.ts` y los de T002) sin rebajar lo que comprueban, y guardar el informe final en `specs/014-mejoras-motor-navegacion-refactor/informe-7.0.0.md`

**Checkpoint**: motor 7.0.0 cerrado (US1–US5). A partir de aquí ningún cambio de comportamiento del motor.

---

## Phase 8: User Story 6 - Cambiar de pantalla sin pestañeo (Priority: P2)

**Goal**: loaders del router sobre una caché en memoria con revalidación; datos de decisión siempre frescos; indicador
global solo a partir de 2 s (research R8–R10, contrato U2). Independiente del motor.

**Independent Test**: `apps/web/tests/unit/cache.test.ts`, `indicadorNavegacion.test.ts` y
`apps/web/tests/e2e/navegacion.spec.ts` con red normal y con 3 s de retardo (quickstart §5).

### Tests for User Story 6

- [ ] T057 [P] [US6] Crear `apps/web/tests/unit/cache.test.ts`: con valor no fresco `leer` lo devuelve al instante y revalida en segundo plano; una sola petición en vuelo por clave; una clave `fresco` nunca se sirve desde `valor`; `invalidar(prefijo)` borra las entradas; un error sin valor previo queda en `error` (data-model §5)
- [ ] T058 [P] [US6] Crear `apps/web/tests/unit/indicadorNavegacion.test.ts` con temporizadores falsos: no aparece a 1.900 ms, aparece a 2.000 ms, desaparece al volver a `idle` y no aparece tras abandonar una navegación por otra (FR-027, FR-028)
- [ ] T059 [P] [US6] Ampliar `apps/web/tests/e2e/navegacion.spec.ts`: recorrido Inicio → Mis partidas → Perfil → Colección → Tienda → Inicio sin ningún `[role=status]` de carga ni esqueleto visible; con `page.route` y 3 s de retardo, la pantalla anterior se mantiene y el indicador aparece a los 2 s ± 0,3 s; dos enlaces seguidos con red lenta no dejan indicador del primero; tras comprar en la tienda, Inicio muestra el saldo nuevo (SC-010, FR-025)

### Implementation for User Story 6

- [ ] T060 [US6] Crear `apps/web/src/api/cache.ts` sin dependencias: entradas `{ clave, valor, error, enVuelo }`; `leer(clave, cargar, { fresco })` (valor al instante + revalidación si no es fresco; espera a `cargar()` si no hay valor o es fresco); `useDato(clave)` con `useSyncExternalStore`; `precargar(clave, cargar)` solo para claves no frescas; `invalidar(prefijo)` (research R9)
- [ ] T061 [US6] Crear `IndicadorNavegacion` en `apps/web/src/componentes/IndicadorNavegacion.tsx` (barra fina bajo la barra de navegación + texto «Cargando…» para lectores, `role="status"`) que se muestra cuando `useNavigation().state !== 'idle'` durante más de 2.000 ms con un `setTimeout` que se cancela al volver a `idle` o al empezar otra navegación; montarlo en `apps/web/src/app/Marco.tsx` y añadir su estilo en `apps/web/src/estilos/base.css` sin animación con `prefers-reduced-motion`
- [ ] T062 [US6] Declarar en `apps/web/src/app/Rutas.tsx` un `loader` por ruta con datos según el inventario de research R10 (claves y frescura); el loader no lanza: devuelve `{ error }` ante un fallo; respeta `request.signal`; añadir un `HydrateFallback` mínimo con el fondo del `Marco` para la primera carga
- [ ] T063 [P] [US6] Pasar a loader + `useDato` las pantallas cacheables `apps/web/src/pantallas/Inicio.tsx` (resumen en caché, partidas activas frescas), `MisPartidas.tsx` (página 1), `Perfil.tsx`, `Coleccion.tsx` y `ReproduccionPartido.tsx` (inmutable), quitando su `useEffect` de carga y su `PantallaCargando`/`Esqueleto` de navegación y manteniendo su aviso de error habitual
- [ ] T064 [P] [US6] Pasar a loader las pantallas con datos de decisión `apps/web/src/pantallas/Tienda.tsx` (escaparate en caché, saldo fresco), `CrearPartida.tsx` (opciones en caché, acceso/premium fresco) y las de partida `Sala.tsx`, `Draft.tsx`, `Plantillas.tsx`, `Alineacion.tsx`, `Partido.tsx`, `Torneo.tsx` (estado fresco); los estados en directo por WebSocket de draft y partido conservan su propio esqueleto
- [ ] T065 [US6] Llamar a `invalidar(prefijo)` tras cada mutación existente (comprar, guardar perfil y equipaciones, crear partida, abrir sobres, salir/finalizar partida) en `apps/web/src/api/cliente.ts` o en la pantalla que la lanza, y comprobar que `apps/web/src/estado/saldo.ts` sigue refrescando el saldo de la cabecera
- [ ] T066 [US6] Añadir `onPointerEnter` y `onFocus` que llaman a `precargar` en los enlaces de `apps/web/src/componentes/BarraPrincipal.tsx` y de las listas de partidas (`MisPartidas.tsx`, `Inicio.tsx`) y colección, solo para claves no frescas (FR-026)
- [ ] T067 [US6] Revisar que ninguna navegación entre pantallas muestra `Esqueleto` o `PantallaCargando` antes de 2 s (búsqueda de sus usos en `apps/web/src/pantallas/` y `apps/web/src/app/`), dejando solo la primera carga de sesión (`ConSesion`) y los directos de draft y partido; actualizar los e2e existentes que esperaban un esqueleto al navegar

**Checkpoint**: navegación sin pestañeo; datos de decisión nunca desde la caché.

---

## Phase 9: User Story 7 - Código más limpio sin cambiar nada del juego (Priority: P3)

**Goal**: sin código sin uso ni duplicado, todo lo exportado comentado, y ni un evento distinto con semilla fija
(research R11–R13, contrato [calidad.md](contracts/calidad.md)).

**Prerrequisito**: US1–US5 cerradas (FR-032). US6 conviene cerrada para no refactorizar dos veces la web.

**Independent Test**: Q1–Q7 de [calidad.md](contracts/calidad.md) (quickstart §6).

### Huella de equivalencia (antes de tocar nada)

- [ ] T068 [US7] Crear `packages/engine/tests/fixtures/generarHuella014.ts` (como `generarEquivalencia005.ts`): 100 partidos (semillas 1–100, equipos de `tools/balance` variados en tácticas y rasgos) con marcador, eventos, estadísticas y hash de fotogramas, y 20 drafts (semillas 1–20, 8 participantes con NPC) con sus picks; generar `packages/engine/tests/fixtures/huella-014.json` con `version: '7.0.0'` (data-model §6)
- [ ] T069 [US7] Crear `packages/engine/tests/equivalencia014.test.ts` (entra en `pnpm test:equivalence`) que reproduce la huella y la compara; comprobar que pasa antes de empezar a refactorizar. A partir de aquí `huella-014.json` NO se regenera (FR-030)

### Herramientas de revisión

- [ ] T070 [P] [US7] Crear `knip.json` en la raíz (workspaces `apps/*`, `packages/*`, `tools/*`; entradas: `main`/`exports`, `bin` y scripts de cada `package.json`, `vite.config.ts`, tests de Vitest y Playwright) con las excepciones legítimas comentadas; se ejecuta con `pnpm dlx knip` sin añadirlo a ningún `package.json` (research R11)
- [ ] T071 [P] [US7] Crear `.jscpd.json` en la raíz (TypeScript/TSX, mínimo 8 líneas o 70 tokens, excluyendo tests, fixtures y JSON con su motivo) para `pnpm dlx jscpd` (research R12)
- [ ] T072 [P] [US7] Crear `scripts/comentarios.ts` (se ejecuta con `pnpm tsx scripts/comentarios.ts`) que recorre con la API de TypeScript cada fichero no de prueba y lista las funciones, clases, métodos públicos, componentes y `const` de función exportados sin JSDoc delante; sale con código ≠ 0 si hay alguno (SC-012)

### Limpieza por paquete (cada tarea: tras sus cambios, `pnpm test` y `pnpm test:equivalence` en verde)

- [ ] T073 [US7] Eliminar las exportaciones, ficheros y dependencias sin uso que señale `pnpm dlx knip` en `packages/domain`, `packages/protocol` y `packages/ai`
- [ ] T074 [US7] Eliminar lo sin uso que señale knip en `packages/engine` y unificar sus duplicados: constantes `RIVAL_ENCIMA`/`LIBRE` repetidas en `acciones/opciones.ts` y `acciones/receptor.ts`, `rivalDe` frente a `rival` de `estado/estado.ts`, y los bucles «media de un atributo de los jugadores en el campo» de `acciones/juego.ts`, más los que señale jscpd
- [ ] T075 [US7] Eliminar lo sin uso y unificar los duplicados que señalen knip y jscpd en `apps/server/src`
- [ ] T076 [US7] Eliminar lo sin uso y unificar los duplicados que señalen knip y jscpd en `apps/web/src` (pantallas, componentes, estado y `campo2d`)
- [ ] T077 [US7] Eliminar lo sin uso y unificar los duplicados que señalen knip y jscpd en `tools/` (balance, fixtures) y en `scripts/`

### Comentarios (FR-031)

- [ ] T078 [P] [US7] Comentar en español (JSDoc de una o pocas líneas; qué hace y, si no es evidente, por qué; citando `FR-…`/`research R…` cuando la regla viene de una spec) todo lo exportado y las funciones internas no evidentes de `packages/domain/src`, `packages/protocol/src` y `packages/ai/src`
- [ ] T079 [P] [US7] Comentar con la misma regla `packages/engine/src`
- [ ] T080 [P] [US7] Comentar con la misma regla `apps/server/src`
- [ ] T081 [P] [US7] Comentar con la misma regla `apps/web/src`
- [ ] T082 [P] [US7] Comentar con la misma regla `tools/` y `scripts/`

### Cierre de la refactorización

- [ ] T083 [US7] Escribir `specs/014-mejoras-motor-navegacion-refactor/refactorizacion.md` con cada duplicidad unificada (antes → después, ficheros) y cada elemento eliminado (exportación, fichero, dependencia), agrupado por paquete (Q7)
- [ ] T084 [US7] Ejecutar Q1–Q6 de [calidad.md](contracts/calidad.md): `pnpm test`, `pnpm test:integration`, `pnpm e2e`, `pnpm test:equivalence` (huella sin cambios en `git diff`), `pnpm dlx knip` (0 hallazgos), `pnpm dlx jscpd`, `pnpm tsx scripts/comentarios.ts` (0), `pnpm typecheck` y `pnpm lint`; revisar en `git diff` que ninguna aserción, `skip` ni umbral de prueba se ha rebajado en US7

**Checkpoint**: Q1–Q7 en verde a la vez.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [ ] T085 [P] Recorrer [quickstart.md](quickstart.md) completo (§1–§6), incluida la revisión visual de 20 fueras de juego en la 2D (SC-005) y del balón en la 2D (SC-001), y anotar el resultado en `specs/014-mejoras-motor-navegacion-refactor/informe-7.0.0.md`
- [ ] T086 [P] Actualizar el estado de la spec 014 en `ROADMAP.md` y, si cambia algún texto de virtud o defecto (p. ej. Matador), regenerar `docs/juego/virtudes-y-defectos.md` con `pnpm --filter @fbd/domain rasgos:doc`
- [ ] T087 Ejecutar `graphify update .` para refrescar el grafo del proyecto

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Fase 1)**: sin dependencias.
- **Foundational (Fase 2)**: depende de la 1; bloquea US1–US5.
- **US1 (Fase 3)** y **US3 (Fase 4)**: dependen de la 2; pueden ir en paralelo (ficheros distintos salvo `juego.ts` y
  `PARAMETROS_V7`, donde conviene cerrar US1 primero).
- **US2 (Fase 5)**: depende de US3 (`enFueraDeJuego` para no pasar a un compañero en fuera de juego) y de US1.
- **US4 (Fase 6)**: depende de la 2; puede empezar tras US1, pero su calibración (T040) se repasa en T055.
- **US5 (Fase 7)**: depende de US1–US4 (calibración final de la 7.0.0 con todo el comportamiento nuevo).
- **US6 (Fase 8)**: independiente del motor; puede empezar tras la Fase 1, en paralelo a las fases 2–7.
- **US7 (Fase 9)**: depende de US1–US5 cerradas (FR-032) y, en la web, de US6.
- **Polish (Fase 10)**: al final.

### User Story Dependencies

```text
Setup → Foundational → US1 ─┐
                     → US3 ─┴→ US2 → US4 → US5 ─┐
Setup → US6 ──────────────────────────────────────┴→ US7 → Polish
```

### Within Each User Story

- Las pruebas se escriben primero y fallan antes de implementar.
- Funciones puras (`fueraDeJuego.ts`, `manoAMano.ts`, `tramoEnergia`, `cache.ts`) antes de integrarlas.
- Calibración de parámetros con `pnpm balance` al final de cada historia del motor.

### Parallel Opportunities

- T001 y T002 (Setup).
- T006 junto a T005.
- En cada historia, las tareas de prueba marcadas [P] entre sí.
- US3: T019 (módulo puro) en paralelo a T017–T018; T026 (e2e) en paralelo a la calibración.
- US2: T029 en paralelo a T027–T028.
- US4: T042 (protocolo), T044 (componente) y T045 (CSS) en paralelo; la parte web (T044–T048) en paralelo a la del
  motor (T039–T041) una vez fijado el contrato del protocolo.
- US5: T049 y T050 en paralelo.
- US6 entera en paralelo a US1–US5; dentro de ella T063 y T064.
- US7: T070, T071 y T072; y los comentarios T078–T082 por paquete.

---

## Parallel Example: User Story 4

```bash
# Pruebas a la vez:
Task: "cansancio.test.ts con M5.1–M5.6 en packages/engine/tests/cansancio.test.ts"
Task: "tramoEnergia en apps/web/tests/unit/indicadorEnergia.test.ts"
Task: "energia en datosPausa en apps/server/tests/"

# Implementación independiente a la vez:
Task: "MsgPartidoPausa.energia en packages/protocol/src/ws/partido.ts"
Task: "IndicadorEnergia + tramoEnergia en apps/web/src/componentes/IndicadorEnergia.tsx"
Task: "Tokens --energia-* en apps/web/src/estilos/campo.css"
```

## Parallel Example: User Story 6

```bash
Task: "cache.test.ts en apps/web/tests/unit/cache.test.ts"
Task: "indicadorNavegacion.test.ts en apps/web/tests/unit/indicadorNavegacion.test.ts"
Task: "navegacion.spec.ts en apps/web/tests/e2e/navegacion.spec.ts"
# Tras T060–T062:
Task: "Pantallas cacheables (Inicio, MisPartidas, Perfil, Coleccion, ReproduccionPartido)"
Task: "Pantallas con datos de decisión (Tienda, CrearPartida, Sala, Draft, Plantillas, Alineacion, Partido, Torneo)"
```

---

## Implementation Strategy

### MVP primero (US1)

1. Fase 1 (referencia 6.3.0) y Fase 2 (parámetros 7.0.0).
2. Fase 3 (US1): el balón ya no se mueve solo.
3. **Parar y validar**: `coherenciaBalon.test.ts` y revisión en la 2D. Es el fallo más visible y el que hace creíbles
   las demás mejoras.

### Entrega incremental

1. US1 + US3 → fueras de juego reales, medidos juntos en la 2D.
2. US2 → mano a mano y fin de las idas y vueltas.
3. US4 → cansancio visible en «Gestionar equipo».
4. US5 → calibración final; motor 7.0.0 cerrado.
5. US6 en paralelo desde el principio; se puede publicar sin esperar al motor.
6. US7 al final, contra `huella-014.json`.

### Equipo en paralelo

- Persona A: motor (US1 → US3 → US2 → US4 motor → US5).
- Persona B: web (US6 y la parte web de US4 cuando esté el contrato del protocolo).
- Todos: US7 por paquetes (T073–T082) cuando el motor esté cerrado.

---

## Notes

- [P] = ficheros distintos, sin dependencias pendientes.
- Las tareas de calibración (T015, T025, T035, T040, T054) fijan valores solo con el informe; ningún número se adelanta.
- Las pruebas con valores concretos del motor se actualizan en US1–US5, nunca en US7.
- Los agentes no hacen `git commit` ni `git push`; al cerrar cada fase se sugiere el comando.
