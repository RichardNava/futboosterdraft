---

description: "Lista de tareas de las mejoras de interfaz, simulación y experiencia de juego de Fútboosterdraft"
---

# Tasks: Mejoras de interfaz, simulación y experiencia de juego

**Input**: Documentos de diseño en `/specs/003-mejoras-ux-simulacion/`: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md).

**Tests**: SE INCLUYEN. El Principio IX de la constitución exige pruebas automatizadas, y research R25 y quickstart.md asignan una comprobación a cada SC. En cada historia, las pruebas se escriben **antes** que la implementación y deben fallar primero.

**Organization**: tareas agrupadas por historia de usuario.

- Gestor de paquetes: **pnpm**, siempre ([CLAUDE.md](../../CLAUDE.md)). Nunca npm, yarn ni bun.
- Identificadores y datos sin tildes; las tildes, solo en los textos que se muestran.

**Decisión del usuario (2026-10-19)**: SC-002 pide **alrededor del 25 % de goles desde fuera del área (22–28 %)**. Ya está reflejado en spec.md, research R6 y data-model §1.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede ejecutar en paralelo (ficheros distintos, sin dependencias pendientes).
- **[Story]**: historia a la que pertenece (US1 a US11, ver spec.md).
- Todas las rutas son relativas a la raíz del repositorio.

## Path Conventions (monorepo de las specs 001 y 002)

- **Reglas puras**: `packages/domain/src/`, `packages/engine/src/` y `packages/ai/src/`. Sus pruebas van en `packages/<paquete>/tests/`.
- **Contratos compartidos**: `packages/protocol/src/`.
- **Servidor**: `apps/server/src/`. Pruebas en `apps/server/tests/{unit,integration,contract}/` y migraciones en `apps/server/drizzle/`, con su `meta/_journal.json`.
- **Cliente**: `apps/web/src/`. Pruebas unitarias en `apps/web/tests/unit/` y de principio a fin en `apps/web/tests/e2e/`.
- **Herramientas**: `tools/balance/`, `tools/fixtures/` y `tools/load/`.
- **Prohibido en `packages/domain`, `packages/engine` y `packages/ai`**: `Math.random`, `Date`, `performance.now` (salvo el `ahora` inyectable del PRO) y E/S. En el motor, nada de coma flotante en las decisiones espaciales. Se usan décimas, `isqrt` y factores en milésimas (002/R3).
- **Unidades del campo**: x de 0 a 10.000 décimas (105 m) e y de 0 a 6.400. Equivalencias:
  - área: x ≥ 8.430 e y entre 1.390 y 5.010;
  - 11 m = 1.048; 20 m = 1.905; 25 m = 2.381; 35 m = 3.333;
  - último tercio: x ≥ 6.667.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: herramientas y recursos que usan varias historias.

- [X] T001 [P] Añadir a `tools/balance/src/cli.ts` dos opciones:
  - `--solo <id1,id2,…>`: ejecuta solo las comprobaciones con esos ids;
  - `--serie sintetica|core|todas` (por defecto `sintetica`).

  Hoy la ejecución completa con `--n 300` supera los 5 minutos. Añadir `tools/balance/salida/` a `.gitignore`.
- [X] T002 [P] Añadir la tipografía **Barlow Condensed** (pesos 600 y 800, woff2, licencia OFL) en `apps/web/public/fuentes/`, con su `LICENCIA`. Declararla con `@font-face` (`font-display: swap`) en `apps/web/src/estilos/base.css`. No usar CDN (research R20).
- [X] T003 Medir la línea base en el commit `c8a1627` (`git worktree add ../fbd-base c8a1627`) y anotarla en `specs/003-mejoras-ux-simulacion/checklists/linea-base.md`:
  - **Partidos**: 1.000 partidos entre equipos sintéticos equilibrados, con la táctica por defecto. Medir goles por partido, porcentaje de 0-0, de partidos con ≥ 6 goles y del resultado más frecuente, reparto de `datos.tipo` de los goles, pases, conducciones, tiros y centros por equipo y partido.
  - **Valores de research R1**, con 300 partidos: 2,91 goles; 3,8 % de penaltis; 2,4 % de faltas; 17,2 conducciones.
  - Es la referencia de SC-005 ("+30 % de conducciones") y de SC-008.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: parámetros 3.0.0 y versión del motor, que usan todas las historias del motor y de los NPC (US1, US8 y US9).

**⚠️ CRITICAL**: US1, US8 y US9 no empiezan hasta terminar esta fase. El resto de historias solo necesita la Fase 1.

### Tests (escribir primero; deben fallar)

- [X] T004 [P] Actualizar `packages/domain/tests/parametros/parametros.test.ts`:
  - `parametrosActuales().version === '3.0.0'`;
  - `parametrosPorVersion('2.0.0')` lanza `VersionNoSoportada`;
  - `draft.margenAnimacionS === 8`;
  - `pases` vale exactamente `{ distanciaCorto: 1905, distanciaLargo: 3333, factorDireccion: { adelante: 1, lateral: 0.8, atrasCorto: 0.5, atrasLargo: 0.05 }, factorSinMotivo: 0.15, factorConMotivo: 1.3, atraccionPasadorAcotada: [0.7, 1.6] }`;
  - `acciones.atraccionPasador === 0.6`;
  - `tiro.pesoPorTramo` es `[{hastaM:11,peso:60},{hastaM:16.5,peso:35},{hastaM:25,peso:5},{hastaM:35,peso:1}]`;
  - `tiro.anguloMinimoGrados === 6`, `tiro.anguloReducidoGrados === 15` y `tiro.porteroAdelantadoM === 15`;
  - `tiro.faltaDirectaTiro` es `{ distanciaMinM: 17, distanciaMaxM: 30, probabilidad: 0.8 }`;
  - `tiro.autogol` es `{ despejeCentro: 0.012, despejeCentroPorPuntoDefensa: 0.03, desvio: 0.02 }` (valores iniciales; se calibran en T033);
  - `disciplina` no tiene `probabilidadPenaltiPorFaltaEnArea` y tiene `probabilidadFaltaDueloAereoArea: 0.04`;
  - `decision.radioIntervencionPorPunto === 0.04` y `decision.radioIntervencionMax === 0.4`;
  - `decision.conduccion` es `{ espacioMin: 285, espacioMax: 1430, factorMin: 6, factorMax: 24, distanciaMin: 400, distanciaMax: 800 }`.
- [X] T005 [P] Actualizar `packages/engine/tests/version.test.ts`: `crearPartido` con `parametros.version` 2.x lanza `VersionNoSoportada`, y con 3.0.0 crea el estado.
- [X] T006 [P] Ampliar `apps/server/tests/integration/reproduccion.test.ts`:
  - un partido terminado con `version_parametros = '2.0.0'` devuelve 409 `VERSION_NO_REPRODUCIBLE` en `GET /api/partidos/:id/reproduccion`;
  - `GET /api/partidos/:id` sigue devolviendo su resumen (marcador, eventos y estadísticas guardados).

### Implementation

- [X] T007 Crear `packages/domain/src/parametros/v3.json`: una copia de `v2.json` con `"version": "3.0.0"` y todos los cambios de la tabla de [data-model.md](./data-model.md) §1, con sus valores iniciales literales. En concreto:
  - añadir las secciones `pases`, `decision` y `tiro`;
  - `acciones.atraccionPasador` 0,6;
  - quitar `disciplina.probabilidadPenaltiPorFaltaEnArea` y añadir `disciplina.probabilidadFaltaDueloAereoArea` 0,04;
  - `draft.margenAnimacionS` 8;
  - `decision.factores`, con los valores de research R9:
    - `regate {k:0.25,min:0.6,max:1.6}`;
    - `remate {k:0.3,min:0.5,max:1.7}`;
    - `pase {k:0.5,min:0.5,max:2}`;
    - `vision {k:0.25,min:0.6,max:1.6}`;
    - `fisico {k:0.2,min:0.7,max:1.5}`;
  - `tiro.pendienteDistancia` 0,35.

  `asincrono` y `npc` se dejan como en la 2.0.0 hasta US9 (T092).
- [X] T008 Actualizar `packages/domain/src/parametros/index.ts`:
  - tipos de las secciones nuevas en `ParametrosEquilibrado`;
  - `PARAMETROS_V3` y `REGISTRO` solo con la 3.0.0;
  - `parametrosActuales()` devuelve la 3.0.0;
  - `parametrosPorVersion` lanza `VersionNoSoportada` si `versionMayor(version) < 3`.

  Conservar `PARAMETROS_V2` solo como dato.
- [X] T009 Ajustar los usos de la versión antigua:
  - en `apps/server/src/actores/partidoEntreHumanos.ts`, `reproduccion()` pasa a `versionMayor(...) < 3`;
  - en `apps/server/src/actores/partidoRapido.ts`, `reconstruirMotor` devuelve `null` con una versión no soportada (se muestra el resumen);
  - en `apps/web/src/pantallas/ReproduccionPartido.tsx` y `Partido.tsx`, el texto «Este partido se jugó con una versión anterior del motor» ante `VERSION_NO_REPRODUCIBLE`.
- [X] T010 Sustituir `PARAMETROS_V2` por `parametrosActuales()` en `tools/fixtures/src/escenarios.ts` (`VERSION_ESCENARIOS`), en `tools/balance/src/*.ts` y en `apps/web/src/pantallas/Alineacion.tsx`. Ejecutar `pnpm test` y anotar qué pruebas de motor o fixtures dependen de resultados concretos. Se regeneran en T036.

**Checkpoint**: el motor arranca con los parámetros 3.0.0, aunque todavía sin comportamiento nuevo, y los partidos 2.x muestran su resumen.

---

## Phase 3: User Story 1 — Simulación 2D que parece fútbol de verdad (Priority: P1) 🎯 MVP

**Goal**: juego combinado, sin pases largos hacia atrás irracionales y con tiros decididos con la distancia real. Variedad de goles (penalti 6–12 %, cabeza 10–18 %, falta directa 5–10 %, alrededor del 25 % desde fuera del área), media de 2,6–3,4 goles y stats y specials que se notan en las decisiones.

**Independent Test**: `pnpm balance --n 1000 --serie todas` pasa SC-001 a SC-007 y SC-009. Ver un partido completo a x2 según quickstart A.

### Tests for User Story 1 ⚠️

- [X] T011 [P] [US1] Crear `packages/engine/tests/receptor.test.ts` con estados construidos a mano en `packages/engine/tests/ayudas.ts`:
  - portador en x = 8.000 con un compañero libre a 10 m por delante y un central libre a 40 m por detrás: en 1.000 sorteos con semillas distintas, el central nunca es el receptor;
  - **callejón sin salida** (rival a ≤ 6 m del portador, ningún compañero por delante o a su altura con holgura ≥ 300² en ≤ 20 m, sin ángulo de tiro): el pase largo hacia atrás sí es posible;
  - un compañero lateral (|Δx| ≤ 5 m) es más probable que uno hacia atrás a la misma distancia;
  - el factor del pasador queda acotado a [0,7, 1,6].
- [X] T012 [P] [US1] Crear `packages/engine/tests/opciones.test.ts`:
  - **Pase largo**: con cada uno de los 5 motivos de research R4 por separado (cambio de orientación, espalda, salida bajo presión, despeje y transición), el peso es mayor que sin ningún motivo. Sin motivo, se multiplica por 0,15.
  - **Conducción**: el factor crece de forma monótona con el espacio libre (6 con < 3 m, 24 con ≥ 15 m).
  - **`factorStat`**: monótono y acotado, con los valores de `decision.factores`.
  - **Acotación por situación**: sin rival a ≤ 6 m ni espacio a ≤ 15 m, el regate no recibe el factor de stat.
- [X] T013 [P] [US1] Crear `packages/engine/tests/tiroDistancia.test.ts`:
  - el peso de tirar y la probabilidad de gol bajan de forma monótona con la distancia;
  - a > 35 m el peso es 0, salvo que el portero rival esté a ≥ 15 m de su línea;
  - con un ángulo < 6° el peso es 0, y con < 15° es la mitad;
  - `tipo` es `normal` dentro del área y `lejano` fuera (research R6).
- [X] T014 [P] [US1] Crear `packages/engine/tests/contexto.test.ts`:
  - `rivalCercano` ya no favorece al defensor más débil;
  - con dos defensores a la misma distancia, el de más `quite` y `anticipacion` interviene más, por el radio de intervención (+4 % por punto sobre 70, acotado a ±40 %).
- [X] T015 [P] [US1] Crear `packages/engine/tests/balonParado.test.ts`:
  - una falta en la zona 5 es penalti solo si el punto de la falta está dentro del área real (x ≥ 8.430 y 1.390 ≤ y ≤ 5.010);
  - los centros y córners pueden acabar en falta dentro del área (`probabilidadFaltaDueloAereoArea`);
  - una falta a 17–30 m y con ángulo central se tira directa con más probabilidad que una lateral;
  - `LanzadorFaltas` aumenta la elección del tiro directo;
  - **autogoles**: el despeje de un centro o de un córner dentro del área puede acabar en gol en propia puerta, con una probabilidad que baja de forma monótona con la `defensa` del defensor que despeja; un tiro desviado por un defensor puede acabar en gol en propia puerta (`tiro.autogol.desvio`). En los dos casos, el evento `gol` lleva `datos.tipo = 'propia'`, el autor es el defensor y el gol suma al marcador del rival.
- [X] T016 [P] [US1] Crear `packages/engine/tests/eventosGol.test.ts`:
  - todos los eventos `tiro` y `gol` llevan `datos.distancia` (entero, en metros) y `datos.zonaRemate ∈ {area, frontal, lejos}`;
  - `golesPorTipo` (incluido `propia`) suma el marcador sin la tanda de penaltis;
  - un gol en propia puerta no suma goles ni asistencias en las estadísticas del defensor que lo marca;
  - `golesPorZona` suma lo mismo;
  - `pasesCortos + pasesLargos ≤ pases` y `pasesLargosAtras ≤ pasesLargos`.
- [X] T017 [P] [US1] Crear `packages/engine/tests/metricas.test.ts` (invariante 10 de [engine-api.md](./contracts/engine-api.md)): con fast-check y 200 semillas, `avanzar(…, 'final', { metricas: true })` y `{ metricas: false }` dan los mismos eventos, marcador, estadísticas y estado final, y solo el primero devuelve `metricas`.
- [X] T018 [P] [US1] Crear `tools/balance/tests/checks003.test.ts`: con `n = 20`, las comprobaciones nuevas (T032) devuelven `Comprobacion` con `id`, `ok` booleano y `detalle` no vacío, y son deterministas con la misma `seed`.

### Implementation for User Story 1

- [X] T019 [US1] Ampliar `packages/engine/src/tipos.ts`:
  - `EstadisticasEquipo` gana `pasesCortos`, `pasesLargos`, `pasesLargosAtras`, `tirosArea`, `tirosFrontal`, `tirosLejos`, `golesPorTipo: Record<'jugada'|'cabeza'|'falta'|'penalti'|'propia', number>` y `golesPorZona: Record<'area'|'frontal'|'lejos', number>` ([data-model.md](./data-model.md) §7.2);
  - nuevo tipo `MetricasJugador` (§7.4), con `duelosGanados` y `conduccionesLargas` (≥ 15 m) además de los contadores de §7.4, para SC-006;
  - `TipoTiro` añade `'propia'`;
  - `ResultadoTramo.metricas?`.

  Inicializar los campos en `packages/engine/src/estado/estado.ts`.
- [X] T020 [US1] Añadir `metricas?: boolean` a `OpcionesAvance` en `packages/engine/src/tramos/avanzar.ts`. Crear `packages/engine/src/metricas.ts` con contadores por jugador que no consumen números del PRNG. Devolverlos en `ResultadoTramo.metricas` solo si se piden, acumulados desde el saque inicial.
- [X] T021 [US1] Crear `packages/engine/src/acciones/receptor.ts` según research R3:
  - `receptorDePase(ctx, equipo, portador, tipo)`:
    - el rango de distancia real depende del tipo: corto ≤ `pases.distanciaCorto`, medio entre las dos distancias, largo > `pases.distanciaLargo`; sin candidatos, se usa el rango contiguo;
    - el factor de dirección es `pases.factorDireccion`: adelante, lateral (|Δx| ≤ 5 m), atrás ≤ 15 m o atrás largo;
    - regla del último tercio de FR-017;
    - el factor del pasador es `2^(atraccionPasador·(pase−70)/10)`, acotado a `pases.atraccionPasadorAcotada`;
    - la holgura y `Carismatico`, como hoy;
  - `interceptorDePase(ctx, defensor, origen, destino)`: el rival más cercano al segmento del pase, por distancia de punto a segmento con enteros e `isqrt`, ponderado por `anticipacion`.
- [X] T022 [US1] En `packages/engine/src/acciones/juego.ts`, usar `receptorDePase` en `pase_corto`, `pase_largo` y `pase_espacio`, y `interceptorDePase` en los pases fallidos. Clasificar cada pase por la distancia real entre el portador y el punto de recepción. Incrementar `pasesCortos`, `pasesLargos` y `pasesLargosAtras` (> 35 m, desde x ≥ 6.667 hasta x < 5.000 en coordenadas del atacante) y las métricas de `pases` y `pasesRompeLineas`.
- [X] T023 [US1] En `packages/engine/src/acciones/opciones.ts`, aplicar los 5 motivos del pase largo de research R4 con posiciones reales: con motivo, ×`pases.factorConMotivo`; sin motivo, ×`pases.factorSinMotivo`. Los motivos:
  - cambio de orientación: compañero en el carril opuesto con holgura ≥ 15 m;
  - espalda: el último defensor rival a más de 30 m de su portería y un compañero por delante de él;
  - salida bajo presión: rival a ≤ 6 m y ningún compañero en ≤ 20 m con holgura ≥ 300²;
  - despeje: zonas 0 y 1, con rival encima;
  - transición: `balon.transicion`.

  El destino del pase largo pasa a ser el compañero que cumple el motivo.
- [X] T024 [US1] Conducción proporcional al espacio (research R5):
  - en `opciones.ts`, el factor es lineal entre `decision.conduccion.factorMin` (6, con espacio < `espacioMin`) y `factorMax` (24, con espacio ≥ `espacioMax`). El espacio se mide en un cono de ±30° hacia la portería rival, acotado a 25 m;
  - en `juego.ts`, la distancia de conducción va entre `distanciaMin` y `distanciaMax` según `velocidad` y físico, sin superar el espacio libre;
  - en `packages/engine/src/modificadores/formacionTactica.ts`, el peso base de `conduccion` sube a 32 en las zonas 1 y 2.
- [X] T025 [US1] En `packages/engine/src/acciones/contexto.ts`:
  - `rivalCercano` deja de elegir "el más débil de los dos" (quitar el parámetro `valor` y sus usos en `juego.ts`);
  - interviene el defensor más cercano según una distancia efectiva, que divide la distancia real por el radio de intervención: `1 + decision.radioIntervencionPorPunto·((quite+anticipacion)/2 − 70)`, acotado a ±`radioIntervencionMax`;
  - las recuperaciones y las entradas ganadas se atribuyen en `metricas` a quien gana el duelo.
- [X] T026 [US1] En `opciones.ts`, implementar `factorStat(valor, 70, {k,min,max})` en milésimas, con `decision.factores` (research R9):
  - **regate**: regate y conducción, solo con un rival a ≤ 6 m o espacio ≤ 15 m;
  - **remate**: tiro fuera del área, solo con ángulo ≥ 15° y nadie a ≤ 3 m en la línea de tiro;
  - **pase**: pases, el factor actual `pesoPasePorStat` pasa a `decision.factores.pase`;
  - **visión**: pase al espacio;
  - **físico**: media de velocidad y físico, en conducciones con espacio ≥ 15 m.
- [X] T027 [US1] Tiro por distancia y ángulo reales (research R6):
  - en `formacionTactica.ts` y `opciones.ts`, sustituir `remate` y `tiro_lejano` por una única acción `tiro` (actualizar `TipoAccion` y `ENFRENTAMIENTO` en `juego.ts`), con peso `pesoTiro(d) × factorAngulo × factorStat(remate) × factorEspacio`, según `tiro.pesoPorTramo`, `anguloMinimoGrados`, `anguloReducidoGrados` y `porteroAdelantadoM`;
  - en `packages/engine/src/acciones/tiro.ts`:
    - calcular `d` y el ángulo desde `espacio.jugadores[tirador]`;
    - `tipo` es `normal` en el área y `lejano` fuera (salvo cabeza, mano a mano, falta y penalti);
    - añadir a la sigmoide de puerta y de gol `−tiro.pendienteDistancia·max(0, d − 11 m)/10 m` y el término de ángulo;
    - emitir `datos.distancia` (m, entero) y `datos.zonaRemate`;
    - incrementar `tirosArea`, `tirosFrontal` y `tirosLejos`, `golesPorTipo` y `golesPorZona`, y las métricas de tiros.
- [X] T028 [US1] Balón parado en `packages/engine/src/acciones/balonParado.ts` y `tiro.ts` (research R7):
  - el penalti depende de si el punto de la falta está dentro del área real, no de una probabilidad fija;
  - `rematarBalonParado` y el centro de `juego.ts` pueden generar una falta en el área con `disciplina.probabilidadFaltaDueloAereoArea`;
  - `faltaDirecta` tira directo con `tiro.faltaDirectaTiro.probabilidad` a 17–30 m y con ángulo central, y si no, cuelga el balón;
  - `LanzadorFaltas` multiplica por 1,3 la probabilidad de tirar directo;
  - **autogoles** (FR-020, SC-003):
    - en el despeje de un centro o de un córner dentro del área (`rematarBalonParado` y el centro de `juego.ts`), gol en propia puerta con probabilidad `tiro.autogol.despejeCentro × (1 − despejeCentroPorPuntoDefensa·(defensa − 70)/10)`, acotada a [0, 2·despejeCentro];
    - en `tiro.ts`, cuando un defensor desvía un tiro a puerta, gol en propia puerta con `tiro.autogol.desvio`;
    - el evento `gol` lleva `datos.tipo = 'propia'`, `datos.distancia` y `datos.zonaRemate` del punto del desvío o del despeje; el autor es el defensor, el gol suma al rival y no cuenta como gol ni asistencia de nadie.
- [X] T029 [US1] Reforzar en la elección los specials con un efecto por debajo del umbral (research R10), en `opciones.ts`, `juego.ts` y `tiro.ts`:
  - Desbordante: regate por banda ×1,3;
  - Llegador: el centrocampista entra entre los rematadores de los centros;
  - Matador: en un mano a mano, siempre tira;
  - Lanzador de faltas: ya cubierto en T028.

  Inventariar en un comentario de cabecera de `packages/engine/src/modificadores/specials.ts` la acción que mide cada special con efecto.
- [X] T030 [P] [US1] Crear `tools/balance/src/core.ts`: una serie Core en la que 8 NPC `avanzado` draftan con `generarCore()` de `tools/fixtures`, con la semilla de la serie, y se juega una liga a doble vuelta con sus alineaciones de `decidirAlineacion`. Devuelve un `ResultadoSerie` agregado por partido y un `porTorneo` con la media de cada torneo.
- [X] T031 [US1] En `tools/balance/src/series.ts`, pasar `{ metricas: true }` a `avanzar` cuando se pida, y agregar `MetricasJugador` por jugador y los eventos de gol (`tipo`, `distancia`, `zonaRemate`).
- [X] T032 [US1] Comprobaciones nuevas en `tools/balance/src/checks/partido.ts`, con los ids `003/SC-00x`:
  - **SC-001**: media de goles entre 2,6 y 3,4, en la serie sintética de 1.000 y en la serie Core; al menos el 90 % de los torneos de `porTorneo` (T030) con su media en 2,6–3,4; hay 0-0 y partidos de ≥ 6 goles; ningún resultado concreto, contado con orden local-visitante (1-2 y 2-1 son distintos), supera el 20 %;
  - **SC-002**: entre el **22 % y el 28 %** de los goles desde fuera del área; de esos, la mayoría a ≤ 25 m; ≤ 0,5 % desde el propio campo;
  - **SC-003**: penaltis 6–12 % (sin tanda), cabeza 10–18 %, falta directa 5–10 % y propia puerta 1–3 %;
  - **SC-004**: `pasesLargos/pases` ≤ 15 % y `pasesLargosAtras` ≤ 0,5 por equipo y partido;
  - **SC-005**: conducciones ≥ 1,3 × la línea base de T003, y `pasesCortos/pases` ≥ 60 %;
  - **SC-006**: con +15 de regate, tiro y defensa en un titular, ≥ 25 %, ≥ 25 % y ≥ 20 % más en su acción; con +15 de pase, ≥ 15 % más de pases que rompen líneas; con +15 de físico y de velocidad, ≥ 15 % más de duelos ganados y ≥ 15 % más de conducciones largas; en todos los casos, su cuota de la acción del equipo, ≤ 60 %;
  - **SC-007**: tabla de umbrales por special con efecto. Lanzador de faltas, ≥ 30 % más goles de falta directa; el resto, diferencia significativa (`mayorSignificativo`);
  - **SC-009**: repetir 001/SC-004 (equipo +5 gana ≥ 60 %) y comprobar que siguen pasando los SC de la 002 de `checks/partido.ts` y `checks/colocacion.ts`.
- [X] T032a [US1] Crear `tools/balance/src/informe.ts` (Principio IX, verificable por una persona no técnica): en cada ejecución, `pnpm balance` genera `tools/balance/salida/informe.html` con una fila por comprobación (id, descripción en español, objetivo, valor medido y resultado ✅/❌), y en la cabecera la fecha, la semilla, `n` y la serie. HTML estático, sin dependencias. `cli.ts` lo genera siempre e imprime su ruta. Ampliar `tools/balance/tests/checks003.test.ts` (T018): el informe contiene una fila por comprobación ejecutada.
- [ ] T033 [US1] Calibrar `packages/domain/src/parametros/v3.json` siguiendo el orden de research R8:
  1. receptor y pases;
  2. conducción;
  3. stats y specials;
  4. tiro por distancia (incluido el peso de la frontal, para el 22–28 % fuera del área);
  5. balón parado y autogoles (`tiro.autogol`, para el 1–3 %);
  6. `acciones.puerta.*` y `acciones.gol.*` para la media.

  Tras cada paso, `pnpm balance --n 1000 --serie todas`. Anotar los valores y los resultados de cada paso en `specs/003-mejoras-ux-simulacion/checklists/calibracion-motor.md`. **Criterio de salida**: pasan todas las comprobaciones `003/SC-001` a `003/SC-009` y las de las specs 001 y 002.
- [ ] T034 [US1] Actualizar los valores literales de `v3.json` que cambien en T033 en `packages/domain/tests/parametros/parametros.test.ts` (T004) y en la tabla de [data-model.md](./data-model.md) §1.
- [X] T035 [P] [US1] En `apps/web/src/componentes/ResumenEventos.tsx`, mostrar el tipo de cada gol con `datos.tipo`: «jugada» (normal, lejano y manoAMano), «de cabeza», «de falta», «de penalti» o «en propia puerta» (con el nombre del defensor y «(p. p.)»). Si `datos.distancia` existe, añadir la distancia: «(23 m)».
- [ ] T036 [US1] Regenerar los escenarios de `tools/fixtures` con `pnpm --filter @fbd/fixtures generar-escenarios` (o el script equivalente de `tools/fixtures/src/generarEscenarios.ts`), para que `cumpleEscenario` pase con el motor 3.0.0. Actualizar las pruebas del motor que dependían de resultados concretos (lista de T010).
- [X] T037 [US1] Añadir a `packages/engine/bench/partido.bench.ts` el caso `metricas: true` (≤ 30 ms) y comprobar que el partido sin fotogramas sigue ≤ 25 ms y con fotogramas ≤ 40 ms.

**Checkpoint**: `pnpm test`, `pnpm test:equivalence`, `pnpm balance --n 1000 --serie todas` y `bench` pasan. Escenario A revisado, salvo la encuesta de SC-008, que va en la Fase 14.

---

## Phase 4: User Story 2 — Preparar el equipo sobre un único campo con cartas a la vista (Priority: P1)

**Goal**: «Formación» con un único campo en el que se eligen titulares, se intercambian y se coloca libremente. Carta completa al pasar el cursor o mantener pulsado.

**Independent Test**: quickstart B. `pnpm e2e --grep alineacion`.

### Tests for User Story 2 ⚠️

- [X] T038 [P] [US2] Crear `apps/web/tests/unit/campoEquipoEstado.test.ts` para el reductor puro de T040:
  - soltar un titular en una zona libre lo recoloca;
  - soltar sobre otro titular intercambia casillas y puntos;
  - soltar un suplente sobre un titular hace el intercambio con el banquillo;
  - soltar fuera del campo y del banquillo no cambia nada;
  - soltar a menos del radio de una ficha cuenta como "encima";
  - soltar "muy cerca" ocupa el punto libre más cercano a ≥ `colocacion.separacionMinima` (30);
  - cambiar de formación sin recolocaciones aplica el cambio sin confirmación; con recolocaciones, pide confirmación y, al aceptar, vacía `puntos` y reasigna a los 11 titulares a las casillas nuevas.
- [X] T039 [P] [US2] Reescribir `apps/web/tests/e2e/alineacion.spec.ts` y eliminar `apps/web/tests/e2e/tacticas.spec.ts`. Comprobar US2, escenarios 1 a 7:
  - hay un solo campo (no existe `[aria-label="Colocación"]`);
  - arrastrar actualiza la posición efectiva y la penalización;
  - intercambios entre suplente y titular y entre dos titulares;
  - **carta ampliada**: visible en < 500 ms, no tapa la ficha y queda dentro del viewport con fichas en las cuatro esquinas, a 1366 × 768 y a 360 × 640;
  - no aparece durante un arrastre;
  - **táctil**: pulsación larga con `hasTouch`;
  - un portero fuera de la portería desactiva «Confirmar alineación» y muestra el motivo.

### Implementation for User Story 2

- [X] T040 [US2] Crear `apps/web/src/componentes/campoEquipoEstado.ts`, un reductor puro del estado del campo (`formacion`, `asignacion`, `puntos`, `banquillo`) con dos funciones:
  - `soltar(estado, origen, puntoDestino, opciones)`;
  - `cambiarFormacion(estado, formacion)`, que devuelve `{ requiereConfirmacion }` si hay recolocaciones.

  Usa `calcularColocacion`, `FORMACIONES` y `autoAlineacion` (restringida a los 11 titulares) de `@fbd/domain` y el `acotar` actual de `CampoTacticas.tsx`.
- [X] T041 [US2] Crear `apps/web/src/componentes/CampoEquipo.tsx`:
  - un único campo con Pointer Events (`setPointerCapture`) para arrastrar fichas del campo y del banquillo;
  - **teclado**: Enter selecciona, las flechas mueven 10 u (50 con Mayús) y Enter sobre otra ficha intercambia;
  - expone el estado `arrastrando`;
  - cada ficha muestra el dorsal, la posición efectiva, el porcentaje de penalización y la media efectiva;
  - prop `modo: 'preparacion' | 'partido'`, preparada para US5 (fichas bloqueadas y distintivos).
- [X] T042 [US2] Crear `apps/web/src/componentes/VistaCarta.tsx` (research R15):
  - un elemento `popover="manual"` con `CartaJugador` completa;
  - con ratón, aparece en `pointerenter` tras 150 ms y se oculta en `pointerleave`;
  - en táctil, aparece con una pulsación de 400 ms sin moverse más de 8 px y se oculta al soltar;
  - se suprime si `arrastrando`;
  - se coloca a la derecha, a la izquierda, arriba o abajo, en el primer lado donde quepa sin tapar la ficha, acotada al viewport con un margen de 8 px.
- [X] T043 [US2] Reescribir la parte del campo de `apps/web/src/pantallas/Alineacion.tsx`:
  - `CampoEquipo` + `VistaCarta` en las fichas del campo, del banquillo y del resto de la plantilla;
  - eliminar la sección «Colocación» y el estado duplicado (`titulares`, `puntos` y `seleccionado` pasan al reductor);
  - diálogo de FR-002a: «Se perderá la colocación personalizada. ¿Cambiar de formación?», con «Cambiar» y «Cancelar»;
  - la confirmación envía la misma `Alineacion` (con `colocacion`) que hoy, así que el servidor no cambia (FR-003).
- [X] T044 [US2] (después de T040, que reutiliza `acotar` de `CampoTacticas.tsx`) Eliminar `apps/web/src/componentes/CampoAlineacion.tsx` y `apps/web/src/componentes/CampoTacticas.tsx`, y sus estilos en `apps/web/src/estilos/base.css`.

**Checkpoint**: escenario B revisado; `pnpm e2e --grep alineacion` pasa.

---

## Phase 5: User Story 3 — Elegir el modo de simulación antes de cada partido (Priority: P1)

**Goal**: el modo se elige en la preparación de cada partido y se recuerda por participante. Desaparece del alta de la partida.

**Independent Test**: quickstart C. `pnpm test:integration --grep modo`.

### Tests for User Story 3 ⚠️

- [X] T045 [P] [US3] Ampliar `apps/server/tests/contract/partidos.test.ts`:
  - `POST /api/partidos/:id/abrir` con `{ modalidad: '2d' }` devuelve `{ modo: 'directo', modalidad: '2d' }`;
  - una segunda apertura con `{ modalidad: 'rapida' }` devuelve `modalidad: '2d'` (FR-035);
  - una `modalidad` inválida devuelve 422;
  - `GET /api/partidos/:id` devuelve la `modalidad` de quien pregunta.
- [X] T046 [P] [US3] Ampliar `apps/server/tests/contract/partidas.test.ts`:
  - crear una partida sin `tipoSimulacion` funciona;
  - si se envía, se ignora;
  - la respuesta y `GET /api/partidas/:id` no lo incluyen.
- [X] T047 [P] [US3] Crear `apps/server/tests/integration/modo-partido.test.ts`:
  - `preparacion.inicio.modalidadPreferida` vale `'rapida'` en el primer partido y después el último usado;
  - **partida nueva** de un usuario registrado: hereda `perfiles_usuario.ultima_modalidad` (la última que usó en cualquier partida); un invitado empieza con `'rapida'`;
  - contra un NPC, con `2d` se crea el estado de búfer (`dosD`) y con `rapida` se juega por partes;
  - dos humanos (A en `2d` y B en `rapida`) reciben el mismo marcador y los mismos eventos en `GET /reproduccion?modalidad=` (SC-018);
  - `partido.inicio.modalidad` es la de cada receptor;
  - **migración `0006`**: en una partida creada con `tipo_simulacion = 'rapida'`, los humanos quedan con `ultima_modalidad = 'rapida'` y los NPC con `NULL`; existe la tabla `perfiles_usuario` (sin `nombre_equipo` ni `equipaciones`, que llegan con la `0008`).

### Implementation for User Story 3

- [X] T048 [US3] En `packages/domain/src/partida/partida.ts`:
  - renombrar `TipoSimulacion` a `ModoSimulacion` (`'rapida' | '2d'`);
  - quitar `tipoSimulacion` de `ConfigPartida` y de `configPorDefecto()`;
  - actualizar `packages/domain/tests/partida/partida.test.ts` y las exportaciones de `packages/domain/src/index.ts`.
- [X] T049 [US3] Crear `apps/server/drizzle/0006_modo_simulacion.sql`, con su entrada en `meta/_journal.json`, siguiendo [data-model.md](./data-model.md) §9 (pasos 1a, 2 solo `ultima_modalidad`, 3, 4 y 5):
  1. `CREATE TABLE perfiles_usuario (usuario_id text PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE, ultima_modalidad text NULL CHECK (ultima_modalidad IN ('rapida','2d')), actualizado_en timestamptz NOT NULL)`. El nombre y las equipaciones del perfil los añade la `0008` (T115);
  2. `ALTER TABLE participantes ADD COLUMN ultima_modalidad text NULL CHECK (ultima_modalidad IN ('rapida','2d'))`;
  3. `UPDATE participantes p SET ultima_modalidad = pa.tipo_simulacion FROM partidas pa WHERE p.partida_id = pa.id AND p.tipo = 'humano'`;
  4. `ALTER TABLE partidas DROP CONSTRAINT partidas_tipo_simulacion_ck, DROP COLUMN tipo_simulacion`;
  5. `ALTER TABLE partidos ADD COLUMN modalidades jsonb NOT NULL DEFAULT '{}'::jsonb`.

  Reflejarlo en `apps/server/src/persistencia/esquema/base.ts` (`perfilesUsuario` con `usuarioId`, `ultimaModalidad` y `actualizadoEn`; `participantes.ultimaModalidad`; sin `partidas.tipoSimulacion`) y en `esquema/partido.ts` (`partidos.modalidades`).
- [X] T050 [US3] Protocolo:
  - en `packages/protocol/src/http/partidas.ts`, quitar `tipoSimulacion` de los dos esquemas (líneas 17 y 41), sin `strict`;
  - en `packages/protocol/src/http/partidos.ts`, cuerpo de `abrir` `{ modalidad: z.enum(['rapida','2d']) }`, respuesta con `modalidad` y consulta `modalidad` opcional en `reproduccion`;
  - en `packages/protocol/src/ws/partido.ts`, `preparacion.inicio.modalidadPreferida` ([realtime-protocol.md](./contracts/realtime-protocol.md)).
- [X] T051 [US3] Repositorios:
  - en `apps/server/src/persistencia/repos/partidas.ts`, dejar de escribir `tipoSimulacion` y añadir `fijarUltimaModalidad(participanteId, modalidad)`;
  - en `apps/server/src/persistencia/repos/partidos.ts`, `fijarModalidad(partidoId, participanteId, modalidad)`, que solo escribe si la clave no existe (FR-035), y leer `modalidades` en `FilaPartido`;
  - crear `apps/server/src/persistencia/repos/perfiles.ts` con `obtenerUltimaModalidad(usuarioId)` y `fijarUltimaModalidad(usuarioId, modalidad)`, que crea el perfil si no existe (upsert). Registrarlo en `apps/server/src/actores/servicios.ts`. US11 (T116) lo amplía con el nombre y las equipaciones.
- [X] T052 [US3] Servidor:
  - en `apps/server/src/actores/torneo.ts`, `abrirPartido(c, ctx, participanteId, partidoId, modalidad)` fija la modalidad del partido, `participantes.ultima_modalidad` y, si el participante es un usuario registrado, `perfiles_usuario.ultima_modalidad` con `perfiles.fijarUltimaModalidad` (T051), antes de iniciar o resolver;
  - en `apps/server/src/actores/partidoRapido.ts`, una función `modalidadDe(c, fila)` (la modalidad del humano del partido, `'rapida'` si no hay) sustituye las lecturas de `c.partida.tipoSimulacion` (líneas 202, 223 y 434). `inicio.modalidad` se envía por receptor;
  - en `apps/server/src/actores/vistas.ts` y `gestor.ts`, quitar `tipoSimulacion`;
  - en `apps/server/src/actores/preparacion.ts`, `modalidadPreferida` (`participantes.ultima_modalidad ?? perfiles.obtenerUltimaModalidad(usuarioId) ?? 'rapida'`).
- [X] T053 [US3] En `apps/server/src/actores/partidoEntreHumanos.ts`, `reproduccion(c, fila, modalidad)` decide los fotogramas según `modalidad`, con clave de caché `${fila.id}:${modalidad}` e `inicio.modalidad = modalidad`. En `apps/server/src/http/partidos.ts`:
  - `abrir` lee el cuerpo;
  - `reproduccion` lee `?modalidad` (por defecto `fila.modalidades[participanteId] ?? 'rapida'`);
  - `resumen` devuelve la `modalidad` de quien pregunta.
- [X] T054 [US3] (después de T045 y T046, que editan los mismos ficheros de contrato) Quitar `tipoSimulacion` de todas las pruebas y ayudas que lo envían: `apps/server/tests/helpers/partidas.ts`, `apps/server/tests/contract/*.test.ts`, `apps/server/tests/integration/*.test.ts` y `apps/web/tests/e2e/*.ts` (ver `grep -rn tipoSimulacion apps`). Las que necesitan 2D (`finalizar`, `partido-2d`, `reproduccion` y `torneo-asincrono`) pasan a abrir el partido con `{ modalidad: '2d' }`.
- [X] T055 [US3] Cliente:
  - crear `apps/web/src/componentes/SelectorModo.tsx`, con dos opciones exclusivas («Simulación rápida» y «Simulación 2D») preseleccionadas con `modalidadPreferida`;
  - en `apps/web/src/componentes/AvisoPartido.tsx`, mostrarlo y enviar `{ modalidad }` en `abrir`;
  - en `apps/web/src/pantallas/Partido.tsx`, la modalidad sale de la respuesta de `abrir` o de `GET /api/partidos/:id`, no de la partida;
  - en `apps/web/src/estado/partidaActiva.ts`, `apps/web/src/conexion/useConexion.ts` y `apps/web/src/app/Marco.tsx`, el modo compacto usa la modalidad del partido en curso;
  - en `apps/web/src/pantallas/CrearPartida.tsx`, quitar la opción.
- [X] T056 [P] [US3] Crear `apps/web/tests/e2e/modo-partido.spec.ts`: el primer partido viene preseleccionado en rápida; se cambia a 2D, se juega en 2D y en el siguiente aparece la 2D preseleccionada; se cambia a rápida y se presenta en rápida; un usuario registrado que crea otra partida encuentra preseleccionada la última modalidad que usó; «Crear partida» no tiene opción de tipo.

**Checkpoint**: escenario C revisado; el resultado no depende del modo.

---

## Phase 6: User Story 4 — Botones principales visibles y siempre a mano (Priority: P1)

**Goal**: un único botón principal por pantalla, fijo al pie, con un estilo común y un motivo visible cuando está desactivado.

**Independent Test**: quickstart D. `pnpm e2e --grep boton-principal`.

### Tests for User Story 4 ⚠️

- [X] T057 [P] [US4] Crear `apps/web/tests/e2e/boton-principal.spec.ts`. A 1366 × 768 y a 360 × 640, recorrer:
  - sala (incluido el paso «Nombre del equipo»), fin del draft, preparación, «Formación», partido rápido, partido 2D, descanso, `GestionEquipo`, resultado, fin de jornada, torneo, `PantallaDerrota` (cada variante de botón: «Simular resto del torneo», «Ver torneo» y «Ver campeón»), `PantallaCampeon` y «Mi perfil»;
  - las pantallas de US5, US10 y US11 se añaden a esta prueba al terminar su historia;
  - en cada pantalla, el único `[data-principal]` está dentro del viewport antes y después de `scrollTo` al final del contenido;
  - es el botón con mayor área;
  - con una alineación inválida, tiene `aria-disabled="true"` y un `aria-describedby` con texto no vacío.

### Implementation for User Story 4

- [X] T058 [US4] Crear `apps/web/src/componentes/BarraPrincipal.tsx`:
  - `position: sticky; bottom: 0` dentro del contenedor desplazable del `Marco`, con `padding-bottom: env(safe-area-inset-bottom)`;
  - una ranura para el botón principal (`data-principal`), otra opcional para un botón secundario y un texto de estado o motivo (`id` para `aria-describedby`);
  - desactivado: `aria-disabled="true"`, sigue siendo enfocable y no ejecuta la acción.

  Definir en `apps/web/src/estilos/base.css` los tokens `--boton-principal-*` (alto ≥ 48 px, color de acento exclusivo, contraste ≥ 4,5:1), el estilo `.secundario` (borde, sin relleno) y el relleno inferior del contenido igual a la altura de la barra.
- [X] T059 [US4] En `apps/web/src/componentes/BotonAvanzar.tsx`, renderizar siempre dentro de `BarraPrincipal`, con una prop `motivoDesactivado?`. Mantener `requestId` y una sola petición a la vez. Añadir las etiquetas de [ui.md](./contracts/ui.md): «Confirmar alineación», «Finalizar partido», «Gestionar equipo», «Simular resto del torneo», «Ver torneo», «Ver campeón» y «Volver al menú». Comprobar que siguen disponibles las que ya existen y también son principales en algún estado (FR-006): «Siguiente», «Empezar partido», «Preparar equipo» y «Seguir».
- [X] T060 [US4] Integrar la barra en las pantallas, dejando un único botón principal en cada una y pasando los demás a `.secundario`:
  - `apps/web/src/pantallas/Sala.tsx` («Empezar» del anfitrión o «Listo»);
  - `apps/web/src/pantallas/Draft.tsx`;
  - `Alineacion.tsx` («Confirmar alineación», con el motivo de validación);
  - `apps/web/src/componentes/AvisoPartido.tsx`;
  - `Partido2D.tsx`, `PartidoRapido.tsx`, `Torneo.tsx` y `ReproduccionPartido.tsx`.

  `GestionEquipo` (T070), `PantallaDerrota` y `PantallaCampeon` (T106) y «Mi perfil» (T122) montan su botón en la `BarraPrincipal` al crearse.
- [X] T061 [US4] En `apps/web/src/app/Marco.tsx`, garantizar un contenedor desplazable único bajo la barra de navegación, para que `sticky` funcione igual en escritorio y en móvil y en el modo compacto de la 2D.

**Checkpoint**: escenario D revisado; `boton-principal.spec.ts` pasa en los dos tamaños.

---

## Phase 7: User Story 5 — Gestionar el equipo en el descanso sobre el campo (Priority: P2)

**Goal**: pantalla con campo para sustituir, recolocar y cambiar formación, táctica y lanzadores. En el descanso y antes de la prórroga en las dos modalidades, y en cualquier momento en la 2D, con pausa.

**Depends on**: US2 (`CampoEquipo`) y US4 (barra).

**Independent Test**: quickstart E.

### Tests for User Story 5 ⚠️

- [X] T062 [P] [US5] Crear `apps/server/tests/unit/loteDecisiones.test.ts`:
  - un lote válido `[sustitución, formación con asignación y colocación, táctica]` se aplica y produce exactamente el mismo partido (eventos, marcador y estado final) que esas decisiones aplicadas una a una con `aplicarDecision` en el mismo tick (FR-030);
  - un lote con la tercera decisión inválida no aplica ninguna y devuelve `{ indice: 2, codigo }`;
  - una sexta sustitución devuelve `SIN_SUSTITUCIONES`;
  - un expulsado o un jugador ya sustituido devuelve `JUGADOR_NO_DISPONIBLE`.
- [X] T063 [P] [US5] Crear `apps/server/tests/integration/gestion-equipo.test.ts`:
  - en rápida, `partido.decisiones` fuera del descanso devuelve `SIN_PAUSA`, y en el descanso se aplica y la segunda parte refleja el cambio;
  - en 2D, con el balón en juego, se aplica en la siguiente interrupción como mucho 60 ticks después;
  - el mismo `requestId` devuelve el mismo ack sin aplicar dos veces;
  - antes de la prórroga de una eliminatoria también se admite;
  - `partido.inicio.alineaciones` incluye `casillaId`, `ancla` y `lanzadores` solo en el equipo del receptor;
  - **partido entre humanos** (FR-027 y FR-031 solo aplican contra un NPC): `partido.decisiones` devuelve `SIN_PAUSA` en cualquier momento, y la vista del partido indica `gestionDisponible: false`.
- [X] T064 [P] [US5] Crear `apps/web/tests/unit/estadoEquipoEnPartido.test.ts`:
  - el estado derivado (en el campo, banquillo, sustituciones restantes, amarillas, lesionados y expulsados) a partir de `inicio` y eventos coincide con lo esperado;
  - los eventos con un tick mayor que el tick de reproducción se ignoran (no se adelanta información);
  - las `decision_aplicada` propias actualizan la formación y la colocación.
- [X] T065 [P] [US5] Crear `apps/web/tests/e2e/gestion-equipo.spec.ts`, con US5, escenarios 1 a 8:
  - el botón de gestión es el principal en el descanso;
  - una sustitución por arrastre baja el contador;
  - el límite de 5 sustituciones;
  - un expulsado no aparece;
  - en la 2D, en el minuto 60, «Gestionar equipo» pausa la reproducción, y al confirmar se reanuda en el mismo tick;
  - «Volver sin cambios» pide confirmación si hay cambios;
  - «Finalizar partido» con cambios sin confirmar en `GestionEquipo` los descarta (caso límite de la spec), y los ya confirmados se aplican;
  - cambiar de formación en `GestionEquipo` con jugadores recolocados pide confirmación (FR-002a) y, al cancelar, no cambia nada;
  - **partido entre humanos**: en el descanso no aparece «Gestionar equipo» y el botón principal es «Seguir»; en la 2D tampoco aparece durante el juego;
  - en la tanda de penaltis no aparece «Gestionar equipo» (FR-031).

  Ampliar `apps/web/tests/e2e/boton-principal.spec.ts` (T057) con `GestionEquipo` y el descanso con gestión (FR-007).

### Implementation for User Story 5

- [X] T066 [US5] Protocolo, en `packages/protocol/src/ws/partido.ts`:
  - `MsgPartidoDecisiones` (`t: 'partido.decisiones'`, `requestId`, `partidoId`, `decisiones` con entre 1 y 20 elementos);
  - error de ack con `indice`;
  - `partido.inicio.alineaciones` con `casillaId`, `ancla` y `lanzadores` opcionales;
  - `partido.inicio.gestionDisponible: boolean`.

  Ver [realtime-protocol.md](./contracts/realtime-protocol.md).
- [X] T067 [US5] Crear `apps/server/src/actores/loteDecisiones.ts` con `aplicarLote(motor, participanteId, decisiones)`:
  1. valida en orden sobre una copia profunda del estado (`structuredClone`) con `validarDecision` y `aplicarDecision`;
  2. si alguna falla, devuelve `{ ok: false, indice, codigo, mensaje }` sin tocar el estado real;
  3. si todas son válidas, las aplica en orden sobre el estado real.
- [X] T068 [US5] En `apps/server/src/actores/partidoRapido.ts`:
  - `procesarDecisionesLote`, con la misma ventana que `procesarDecisionPartido` (`SIN_PAUSA` en rápida sin pausa; en 2D, cualquier fase menos `finalizado` y `penaltis`), usando `aplicarLote`;
  - `procesarDecisionPartido` delega en él con un lote de una decisión;
  - en `iniciarPartido`, el `inicio` se construye por receptor, con la alineación propia ampliada y la del rival como hoy, y con `gestionDisponible` (cierto solo si el rival es un NPC; FR-027 y FR-031);
  - en los partidos entre humanos, `procesarDecisionesLote` devuelve siempre `SIN_PAUSA`.

  En `apps/server/src/ws/pasarela.ts`, enrutar `partido.decisiones` con idempotencia por `requestId` (`AlmacenPeticiones`).
- [X] T069 [US5] Crear `apps/web/src/componentes/estadoEquipoEnPartido.ts`: trasladar y ampliar `estadoJugadores` de `PanelCambios.tsx`. Recibe `inicio`, `eventos`, `tickActual` y las decisiones aplicadas, y devuelve formación, asignación, colocación, banquillo, sustituciones restantes (`maxSustituciones`, 5 o 6 en la prórroga, igual que el motor), amarillas, lesionados y expulsados.
- [X] T070 [US5] Crear `apps/web/src/componentes/GestionEquipo.tsx`, un modal a pantalla completa con:
  - `CampoEquipo` en `modo='partido'`: fichas bloqueadas para los sustituidos y expulsados, con distintivos de tarjeta, lesión y cansancio;
  - `VistaCarta`;
  - el contador «Sustituciones restantes: N»;
  - `PanelTactica` y el editor de lanzadores de «Formación»;
  - en la `BarraPrincipal`, «Confirmar cambios» (envía `partido.decisiones` y, si falla, muestra el motivo y la decisión) y «Volver sin cambios» (pregunta «¿Descartar los cambios?»).

  Convierte los gestos en decisiones: suplente sobre titular → `sustitucion`; recolocación o intercambio → `recolocacion`; formación → `formacion` con `asignacion` y `colocacion`.
- [X] T071 [US5] En `apps/web/src/pantallas/Partido2D.tsx`, solo si `inicio.gestionDisponible`, añadir «Gestionar equipo». Botones según la tabla de [ui.md](./contracts/ui.md):
  - en juego: principal «Finalizar partido», secundario «Gestionar equipo»;
  - en el descanso y antes de la prórroga: principal «Gestionar equipo», secundarios «Seguir» y «Finalizar partido».

  Al abrirlo, pausa el `RelojReproduccion` y deja de enviar `partido.reproduccion`; al cerrar, se reanuda en el mismo tick. Tras confirmar con el balón en juego, avisa «Los cambios se aplicarán en la próxima interrupción». Sin `gestionDisponible` (partido entre humanos), en juego solo está «Finalizar partido» y en las pausas el principal es «Seguir».
- [X] T072 [US5] En `apps/web/src/pantallas/PartidoRapido.tsx`, si `inicio.gestionDisponible`, «Gestionar equipo» es el botón principal en el descanso y antes de la prórroga, y «Seguir», el secundario. Sin él, el principal es «Seguir».
- [X] T073 [US5] (después de T069, que extrae `estadoJugadores` de `PanelCambios.tsx`) Eliminar `apps/web/src/componentes/PanelCambios.tsx` y sus usos.

**Checkpoint**: escenario E revisado; `loteDecisiones.test.ts` demuestra FR-030.

---

## Phase 8: User Story 6 — Finalizar el partido y ver el resultado en una pantalla propia (Priority: P2)

**Goal**: «Finalizar partido» en la 2D lleva a la misma pantalla de resultado que la rápida.

**Independent Test**: quickstart F.

### Tests for User Story 6 ⚠️

- [X] T074 [P] [US6] Ampliar `apps/web/tests/e2e/finalizar.spec.ts`: tras «Finalizar partido» en un partido 2D en el minuto 20, no hay `canvas` y aparece `ResultadoPartido`, con marcador, eventos con minuto, estadísticas y «Siguiente» como botón principal. La misma estructura aparece al final de un partido rápido (mismos `data-testid`).

### Implementation for User Story 6

- [X] T075 [US6] Crear `apps/web/src/componentes/ResultadoPartido.tsx`, extraído del resumen final de `apps/web/src/pantallas/PartidoRapido.tsx`: marcador (con prórroga y penaltis), `ResumenEventos` relevantes, `Estadisticas` y el botón principal «Siguiente» en la `BarraPrincipal`.
- [X] T076 [US6] Usar `ResultadoPartido`:
  - en `PartidoRapido.tsx`, al final del partido;
  - en `Partido2D.tsx`, al recibir `partido.fin` tras `partido.finalizar`, desmontar `Lienzo2D` y mostrar `ResultadoPartido` con los datos de `partido.fin`;
  - en `apps/web/src/pantallas/ReproduccionPartido.tsx`, al terminar o al finalizar la reproducción.

**Checkpoint**: escenario F revisado; SC-017 lo cubre `equivalenciaFinalizar.test.ts` más T074.

---

## Phase 9: User Story 7 — Cartas con diseño final y fáciles de leer (Priority: P2)

**Goal**: carta con marco propio, acabado por nivel y stats y specials legibles.

**Independent Test**: quickstart G. `pnpm e2e --grep cartas`.

### Tests for User Story 7 ⚠️

- [X] T077 [P] [US7] Ampliar `apps/web/tests/e2e/cartas.spec.ts`:
  - **portátil (1366 px)**: en la carta completa, `fontSize` de los stats y de los specials ≥ 16 px, y el valor del stat en negrita a ≥ 1,25 veces el tamaño de su abreviatura;
  - **móvil (360 px)**: ≥ 14 px;
  - un GOAT con 4 specials sin desbordamiento (`scrollHeight <= clientHeight`);
  - las cuatro clases de nivel aplicadas;
  - con `reducedMotion: 'reduce'`, sin animación de brillo.

### Implementation for User Story 7

- [X] T078 [US7] Rediseñar `apps/web/src/componentes/CartaJugador.tsx` y `apps/web/src/estilos/cartas.css` (research R20):
  - escudo con las esquinas superiores achaflanadas, franja diagonal del color del nivel y textura de grano con `repeating-linear-gradient`;
  - Barlow Condensed (T002) para la media, el nombre y los stats;
  - specials en dos columnas;
  - brillo animado solo en Legendario y GOAT, desactivado con `prefers-reduced-motion`;
  - tamaños de FR-009;
  - mantener la variante `compacta` y los popovers de los specials (002/FR-004).

  Sin el marco, el logotipo ni la tipografía de EA SPORTS FC.
- [X] T079 [P] [US7] Actualizar `apps/web/src/pantallas/PruebasCartas.tsx` para mostrar los cuatro niveles y un GOAT con 4 specials, en tamaño completo y compacto, para la revisión visual y la prueba SC-012.

**Checkpoint**: escenario G revisado; `cartas.spec.ts` pasa.

---

## Phase 10: User Story 8 — Abrir sobres con espectáculo (Priority: P2)

**Goal**: apertura con partículas, cartas completas que giran una a una, ≤ 8 s y un sonido suave.

**Independent Test**: quickstart H. `pnpm e2e --grep apertura`.

### Tests for User Story 8 ⚠️

- [X] T080 [P] [US8] Crear `apps/web/tests/unit/particulas.test.ts`, con un reloj inyectado:
  - si un fotograma supera los 6 ms de presupuesto, el número de partículas se reduce a la mitad;
  - por debajo de 30 fps durante 500 ms, el sistema se desactiva;
  - `detener()` libera el canvas.
- [X] T081 [P] [US8] Ampliar `apps/web/tests/e2e/apertura.spec.ts`:
  - la animación termina en ≤ 8 s;
  - un clic la salta y muestra 8 `CartaJugador` completas (no compactas);
  - con `reducedMotion: 'reduce'`, no hay canvas de partículas ni giros;
  - el primer turno del sobre conserva su tiempo de elección completo.
- [X] T082 [P] [US8] Ampliar `apps/server/tests/integration/draft.test.ts`: el margen del primer turno de cada sobre es de 8 s (`draft.margenAnimacionS`).

### Implementation for User Story 8

- [X] T083 [US8] Crear `apps/web/src/componentes/particulas.ts`, un sistema de partículas en Canvas 2D con:
  - `iniciar(canvas, opciones)`, `emitir(x, y, color, n)` y `detener()`;
  - un presupuesto de 6 ms por fotograma, medido con `performance.now()`;
  - las reglas de T080.
- [X] T084 [US8] Reescribir la secuencia de `apps/web/src/componentes/AperturaSobre.tsx` (research R21):
  - sobre: 1.400 ms (brillo, temblor y rasgado con partículas);
  - salida escalonada: 8 × 250 ms;
  - giro de la **carta completa**: 300 ms por carta, solapado;
  - pausa especial para Legendario y GOAT: 600 ms, con destello y partículas de su color;
  - fundido: 300 ms.

  Requisitos:
  - en el peor caso, ≤ 8 s;
  - un clic o un toque revela todo;
  - con movimiento reducido, solo el fundido;
  - la aparición de las cartas no depende nunca de las partículas.
- [X] T085 [US8] En `apps/web/src/sonido/sonido.ts`, añadir un efecto de apertura sintetizado con Web Audio:
  - ruido rosa filtrado paso bajo a 1,2 kHz, con una envolvente de 350 ms;
  - acorde A3 + E4, con un ataque de 30 ms y una caída de 600 ms;
  - ganancia 0,25 (el resto de sonidos, 0,6).

  Bajar la ganancia de `revelacion.wav` a 0,4. Respetar `localStorage['fbd.sonido']`. Eliminar `apps/web/public/sonidos/rasgado.wav` y su línea de `apps/web/public/sonidos/LICENCIA`.
- [X] T086 [US8] Comprobar que `apps/server/src/actores/draft.ts` toma el margen de `parametrosActuales().draft.margenAnimacionS` (8, de T007) y no tiene ningún 6 fijo en el código. Corregirlo si lo tiene.

**Checkpoint**: escenario H revisado, salvo la encuesta de sonido de SC-019, que va en la Fase 14.

---

## Phase 11: User Story 9 — NPC más accesibles en los niveles bajos (Priority: P2)

**Goal**: dificultad que sale solo de la calidad de las decisiones: errores creíbles que bajan con el nivel y alguna decisión dudosa del PRO.

**Depends on**: Foundational. Su calibración final requiere US1 terminada, porque el motor 3.0.0 cambia los resultados.

**Independent Test**: quickstart I. `pnpm balance --torneos 100`.

### Tests for User Story 9 ⚠️

- [X] T087 [P] [US9] Crear `packages/ai/tests/errores.test.ts`, con fast-check sobre plantillas Core aleatorias. Para cualquier error de cualquier familia y nivel:
  - la alineación resultante es válida (001/FR-057);
  - el portero está en la portería y no hay ningún jugador de campo en ella;
  - ningún cruce de demarcación tiene una penalización > 0,2;
  - la pérdida de fuerza es ≤ `costeMaximo` del nivel.

  Además: con la misma semilla, el mismo error.
- [X] T088 [P] [US9] Ampliar `packages/ai/tests/niveles.test.ts`:
  - en 200 drafts por nivel, la media de errores aplicados baja estrictamente de amateur a PRO;
  - el PRO tiene exactamente una decisión dudosa por draft (la segunda mejor carta, a ≤ 1,5 puntos de la mejor), salvo que no haya ninguna candidata a esa distancia;
  - el perfil `automatico` no comete errores.
- [X] T089 [P] [US9] Crear `tools/balance/tests/referencia.test.ts`: el participante de referencia es determinista con la misma semilla, usa la táctica por defecto y una formación entre `4-4-2` y `4-3-3`, y nunca pide cambios durante el partido.

### Implementation for User Story 9

- [X] T090 [US9] Crear `tools/balance/src/referencia.ts` (research R13):
  - **draft**: la mejor carta con `valorCarta` sin ruido, pesos `{ media: 1, cobertura: 4, porteros: 6, sinergia: 0 }` y sin anticipación;
  - **alineación**: `autoAlineacion` restringida a `['4-4-2','4-3-3']`;
  - **táctica**: `tacticaPorDefecto()`;
  - sin decisiones durante el partido.
- [X] T091 [US9] Línea base de SC-010: copiar `referencia.ts` y un check provisional al worktree de `c8a1627` (T003). Ejecutar 100 torneos por nivel, con el participante de referencia y 7 NPC del nivel, y anotar el porcentaje de victorias por nivel en `specs/003-mejoras-ux-simulacion/checklists/linea-base.md`.
- [X] T092 [US9] En `packages/ai/src/perfiles.ts`, añadir `errores: PerfilErrores` a `PerfilNPC`, con la forma de [data-model.md](./data-model.md) §6. Las familias son `draft`, `alineacion`, `colocacion`, `formacion`, `tactica`, `lanzadores` y `partido`. Valores por nivel (se leen de `parametros.npc.errores`):

  | Nivel | probabilidad por familia | costeMaximo | dudosaPorDraft |
  |---|---|---|---|
  | amateur | 350 | 6 | — |
  | intermedio | 200 | 4 | — |
  | avanzado | 80 | 2 | — |
  | PRO | 25 | 1,5 | true |

  Añadir el perfil `automatico`: los valores del avanzado con probabilidad 0 en todas las familias. Añadir la sección `npc.errores` a `v3.json`, con estos valores y su tipo en `parametros/index.ts`. Cambiar `asincrono.nivelDecisiones` a `'automatico'` (tipo ampliado).
- [X] T093 [US9] Crear `packages/ai/src/errores.ts`, con un error por familia, todos con el PRNG con semilla de la decisión:
  - `errorDraft`: elegir una carta de más media que no encaja;
  - `errorAlineacion`: dejar en el banquillo a uno mejor de la misma demarcación;
  - `errorColocacion`: mover a un titular a una posición contigua fuera de la suya;
  - `errorFormacion`: una básica que encaja peor;
  - `errorTactica`: presión alta contra un rival más rápido, o catenaccio siendo mejor;
  - `errorLanzadores`: un lanzador de penaltis con peor remate;
  - `errorPartido`: cambio tardío, no reaccionar al marcador o un cambio de táctica contraproducente.

  Además, `esErrorAdmisible(antes, despues, nivel)` con el guardarraíl de data-model §6.
- [X] T094 [US9] Aplicar los errores:
  - en `packages/ai/src/draft.ts`, `errorDraft` según la probabilidad del nivel, más la decisión dudosa del PRO en un turno elegido con la semilla del draft;
  - en `packages/ai/src/alineacion.ts`, sobre el resultado de `autoAlineacion`, la heurística o las simulaciones del PRO: `errorFormacion`, `errorAlineacion`, `errorColocacion`, `errorTactica` y `errorLanzadores`, en ese orden;
  - en `packages/ai/src/partido.ts`, `errorPartido` en `decidirEnPartido`.

  Ninguno toca el motor.
- [X] T095 [US9] En `apps/server/src/actores/partidoEntreHumanos.ts` (líneas 53 y 101), usar el perfil `automatico` para las decisiones de los humanos ausentes. Comprobar que `decidirAlineacion` y `decidirEnPartido` aceptan `'automatico'`, y ampliar `NivelNPC` interno de `@fbd/ai` sin cambiar el `NivelNPC` del dominio (que conserva cuatro niveles).
- [X] T096 [US9] En `tools/balance/src/checks/npc.ts`:
  - **`003/SC-010`**: 100 torneos de liga de 8 por nivel, con el participante de referencia y 7 NPC del nivel. Contra amateur e intermedio, victorias > derrotas y un porcentaje de victorias al menos 15 puntos porcentuales por encima de la línea base de T091. De amateur a PRO, descenso ordenado (2 errores estándar). Contra PRO, ≥ 10 %;
  - **`003/SC-010a`**: 1.000 partidos con las mismas entradas y semillas, cada lado etiquetado como humano o como NPC de cada nivel, sin decisiones durante el partido. Resultados idénticos;
  - **`003/SC-010b`**: guardar 20 drafts y preparaciones por nivel en `tools/balance/salida/npc-revision/<nivel>/*.json`, con los errores aplicados anotados. Comprobar automáticamente que los errores bajan con el nivel y que el PRO tiene al menos una decisión dudosa en > 50 % de los drafts.
- [X] T097 [US9] Calibrar `npc.errores` en `v3.json` con `pnpm balance --torneos 100` (con US1 ya terminada) hasta pasar `003/SC-010`, `003/SC-010a` y `003/SC-010b`. Anotar los valores en `specs/003-mejoras-ux-simulacion/checklists/calibracion-npc.md` y actualizar la tabla de data-model §6 si cambian.

**Checkpoint**: escenario I revisado (salvo la prueba con personas de SC-011); `pnpm test --project ai` pasa.

---

## Phase 12: User Story 10 — Celebrar al campeón, despedir al eliminado y no esperar tras caer (Priority: P3)

**Goal**: pantallas de derrota y de campeón, y «Simular resto del torneo» cuando no queda ningún humano en competición.

**Independent Test**: quickstart J.

### Tests for User Story 10 ⚠️

- [X] T098 [P] [US10] Crear `packages/domain/tests/torneo/eliminaciones.test.ts`:
  - **playoff de 8**: el perdedor de cuartos queda eliminado con `cuartos`, y el de la final con `final`;
  - **playoff de 16**: `octavos`;
  - **mixto**: los no clasificados al cerrar la liga quedan eliminados con `liga`;
  - **liga pura**: `[]` siempre, también al terminar;
  - `humanosEnCompeticion` excluye a los eliminados y a los sustituidos por un NPC, y devuelve `[]` con el torneo terminado;
  - `ETIQUETA_FASE` vale exactamente «Fase de liga», «Octavos de final», «Cuartos de final», «Semifinales» y «Final».
- [X] T099 [P] [US10] Crear `apps/server/tests/integration/simular-resto.test.ts`:
  - **playoff de 8 en solitario, caída en cuartos**: `miEliminacion.fase = 'cuartos'` y `puedeSimularResto = true`. `POST simular-resto` (con `Idempotency-Key`) devuelve el campeón, y el cuadro y los goleadores incluyen todos los partidos. Repetir con la misma clave da la misma respuesta;
  - **playoff de 16 con caída en octavos**: de extremo a extremo en < 5 s (SC-020a);
  - con otro humano en competición, 409 `HAY_HUMANOS_EN_COMPETICION`;
  - sin estar eliminado, 409 `NO_ELIMINADO`;
  - **varios humanos, todos eliminados**: se permite y no se programan plazos;
  - **liga pura**: `miEliminacion` es null siempre;
  - **mixto**: eliminado con `liga`;
  - `POST pantalla-vista` fija `derrota_vista_en` y `campeon_visto_en` y es idempotente;
  - **migración `0007`**: aplicada sobre una base con datos.
- [X] T100 [P] [US10] Crear `apps/web/tests/e2e/torneo-final.spec.ts`:
  - playoff de 8 en solitario hasta caer: aparece el texto «{equipo} ha sido derrotado en Cuartos de final»;
  - salir al menú y volver desde «Mis partidas»: sigue la misma pantalla;
  - «Simular resto del torneo» lleva a la pantalla del campeón, con el texto «¡{campeón}, campeón del torneo!»;
  - en la pantalla de derrota sin humanos en competición, el secundario «Volver al menú» lleva al menú sin simular, y al volver sigue la misma pantalla;
  - **pierde la final**: aparece «{equipo} ha sido derrotado en Final» con el botón principal «Ver campeón», que lleva a la pantalla del campeón;
  - en una liga pura no hay pantalla de derrota.

  Ampliar `apps/web/tests/e2e/boton-principal.spec.ts` (T057) con `PantallaDerrota` (sus tres variantes de botón) y `PantallaCampeon` (FR-007).

### Implementation for User Story 10

- [X] T101 [US10] Crear `packages/domain/src/torneo/eliminaciones.ts`, con los tipos y funciones de [data-model.md](./data-model.md) §8.1 (`FaseEliminacion`, `Eliminacion`, `eliminaciones`, `eliminacionDe`, `humanosEnCompeticion` y `ETIQUETA_FASE`), derivados del `EstadoTorneo` y de `cuadro.rondas[].tipo`. Exportarlos en `packages/domain/src/index.ts`.
- [X] T102 [US10] Crear `apps/server/drizzle/0007_pantallas_torneo.sql`, con su entrada en `meta/_journal.json`: `ALTER TABLE participantes ADD COLUMN derrota_vista_en timestamptz NULL, ADD COLUMN campeon_visto_en timestamptz NULL`. Reflejarlo en `apps/server/src/persistencia/esquema/base.ts` y añadir `marcarPantallaVista(participanteId, 'derrota'|'campeon', ahora)` en `repos/partidas.ts`, que solo escribe si es null.
- [X] T103 [US10] Protocolo:
  - en `packages/protocol/src/ws/torneo.ts`, añadir a la vista `miEliminacion: { fase, etiqueta } | null`, `puedeSimularResto: boolean` y `pantallas: { derrotaVista: boolean; campeonVisto: boolean }`;
  - en `packages/protocol/src/http/partidas.ts`, los cuerpos y respuestas de `simular-resto` y `pantalla-vista` ([http-api.md](./contracts/http-api.md)).
- [X] T104 [US10] En `apps/server/src/actores/torneo.ts`:
  - `vistaTorneo` añade los campos de T103 por participante;
  - `abrirSiguienteJornada` no programa plazos si `humanosEnCompeticion` está vacío;
  - nueva función `simularResto(c, ctx, deps, participanteId)`:
    1. comprueba que está eliminado (si no, `NO_ELIMINADO`), que no quedan humanos en competición (si no, `HAY_HUMANOS_EN_COMPETICION`) y que no hay campeón (si no, `TORNEO_TERMINADO`);
    2. en un solo comando del actor, repite `abrirSiguienteJornada` y `resolverPartidosSinHumanos` hasta que haya `campeon`, con una opción `silencioso` que suprime los `emitirTorneo` intermedios;
    3. al final, emite una vez y llama a `terminarTorneo`.
- [X] T105 [US10] En `apps/server/src/http/partidas.ts`, añadir:
  - `POST /api/partidas/:id/simular-resto`, con la cabecera `Idempotency-Key` obligatoria (patrón de `siguiente-jornada`);
  - `POST /api/partidas/:id/pantalla-vista`, con cuerpo `{ pantalla: 'derrota' | 'campeon' }`.
- [X] T106 [P] [US10] Crear `apps/web/src/pantallas/PantallaDerrota.tsx` y `apps/web/src/pantallas/PantallaCampeon.tsx`:
  - ilustraciones SVG propias en línea, con animación CSS desactivada con movimiento reducido;
  - los textos de [ui.md](./contracts/ui.md);
  - botones principales:
    - derrota sin humanos en competición: «Simular resto del torneo», con «Volver al menú» como secundario;
    - derrota con humanos en competición: «Ver torneo», con «Volver al menú» como secundario;
    - derrota con el torneo ya terminado (se perdió la final): «Ver campeón»;
    - campeón: «Volver al menú».

    Todos en la `BarraPrincipal`.
  - al mostrarse, llaman a `pantalla-vista`.
- [X] T107 [US10] En `apps/web/src/pantallas/Torneo.tsx`, mostrar `PantallaDerrota` si `miEliminacion` y (`!pantallas.derrotaVista` o `puedeSimularResto`), y `PantallaCampeon` si `campeon` y `!pantallas.campeonVisto` (si las dos aplican, como al perder la final, primero la derrota y después, con «Ver campeón», la del campeón). En `apps/web/src/app/Rutas.tsx` y `MisPartidas.tsx`, al reabrir una partida se llega a esa pantalla.

**Checkpoint**: escenario J revisado; `simular-resto.test.ts` pasa con < 5 s.

---

## Phase 13: User Story 11 — Nombre y equipación a mi gusto (Priority: P3)

**Goal**: nombre de equipo editable y único para todos. Valores por defecto en la cuenta de los registrados. Equipaciones con diseño y hasta 3 colores.

**Independent Test**: quickstart K y L.

### Tests for User Story 11 ⚠️

- [X] T108 [P] [US11] Crear `packages/domain/tests/equipo/equipaciones.test.ts`:
  - `desdeV1({primera:{principal,secundario},…})` da `{ diseno: 'lisa', colores: [principal, secundario] }`, y aplicado a una v2 la devuelve igual;
  - `pesosSuperficie` coincide con la tabla de research R24, y los pesos de los colores que faltan se suman a c1;
  - `parecido` está en [0, 1] y es simétrico;
  - `chocan` si `parecido ≥ 0,45`;
  - en `equipacionEnPartido`, el visitante usa la segunda si la primera choca, y si chocan las dos, una lisa con el color de `PALETA` más alejado (determinista);
  - `validarEquipaciones` devuelve `COLOR_INVALIDO` (no `#rrggbb`), `DISENO_INVALIDO`, `NUM_COLORES_INVALIDO` (fuera de 1–3) y `EQUIPACIONES_PARECIDAS`;
  - `patronDiseno` devuelve regiones para los 5 diseños.
- [X] T109 [P] [US11] Crear `packages/domain/tests/equipo/nombreEquipo.test.ts`:
  - `normalizarNombre` recorta los espacios del principio y del final y colapsa los internos;
  - `validarNombre` exige **"entre 3 y 24 caracteres, sin contar los espacios del principio y del final"** (`NOMBRE_CORTO`, `NOMBRE_LARGO`, `NOMBRE_VACIO`) y da `NOMBRE_REPETIDO` con otro equipo de la partida sin distinguir mayúsculas;
  - `nombrePorDefecto('Ana', usados)` devuelve «Equipo de Ana», con sufijo ` 2`, ` 3`… si está ocupado, y nunca más de 24 caracteres.
- [X] T110 [P] [US11] Crear `apps/server/tests/contract/perfil.test.ts` y ampliar `apps/server/tests/contract/alineacion.test.ts`:
  - **perfil**: `GET /api/perfil` sin perfil devuelve `{ nombreEquipo: null, equipaciones: null }`; `PUT` válido guarda; un invitado recibe 403 `SOLO_REGISTRADOS`; un nombre inválido, 422;
  - **nombre de equipo**: `PUT /api/partidas/:id/nombre-equipo` devuelve 422 (`NOMBRE_CORTO`, `NOMBRE_LARGO`, `NOMBRE_VACIO`) y 409 `NOMBRE_REPETIDO`; en `en_torneo` antes de abrir el primer partido devuelve 200, y después de abrirse cualquier partido de la partida, 409 `TORNEO_INICIADO` (FR-042);
  - **equipaciones**: `PUT /api/partidas/:id/equipaciones` con v2 válido guarda, con v1 se convierte, y los errores dan 422 `DISENO_INVALIDO`, `NUM_COLORES_INVALIDO` y `EQUIPACIONES_PARECIDAS`.
- [X] T111 [P] [US11] Crear `apps/server/tests/integration/identidad.test.ts`:
  - un registrado con perfil se une y recibe su nombre y sus equipaciones; si el nombre está ocupado (sin distinguir mayúsculas), recibe `nombrePorDefecto` y `nombreAjustado: true`;
  - un NPC añadido cuando un humano ya usa el mismo nombre con otras mayúsculas recibe otro nombre, y la inserción no viola el índice único;
  - cambiar el nombre en la partida no cambia el perfil;
  - un invitado recibe «Equipo de {apodo}»;
  - en ninguna partida hay dos nombres iguales (también con los NPC);
  - **migración `0008`** sobre datos de la 002: equipaciones convertidas a lisas, duplicados renombrados con sufijo e índice único creado.
- [X] T112 [P] [US11] Crear `apps/web/tests/e2e/identidad.spec.ts`:
  - **nombre**: un invitado escribe «Los Halcones» en la sala, y el nombre aparece en el draft, la clasificación, la preparación, el partido y los goleadores (FR-044);
  - **equipación**: con rayas verticales blancas y rojas, la vista previa SVG y la chapa de la 2D comparten el patrón (comparando los atributos de `data-patron`);
  - **perfil**: «Mi perfil» guarda los valores por defecto.

  Ampliar `apps/web/tests/e2e/boton-principal.spec.ts` (T057) con el paso «Nombre del equipo» de la sala y «Mi perfil» (FR-007).

### Implementation for User Story 11

- [X] T113 [US11] Reescribir `packages/domain/src/equipo/equipaciones.ts` según [data-model.md](./data-model.md) §4:
  - `DisenoCamiseta` (`'lisa' | 'rayas' | 'franjas' | 'banda' | 'mitades'`);
  - `Equipacion` v2 con **"1–3 colores #rrggbb; colores[0] es el principal"**;
  - `principal`, `colorDorsal`, `pesosSuperficie`, `parecido`, `chocan`, `equipacionEnPartido`, `patronDiseno`, `validarEquipaciones`, `desdeV1` y `equipacionesAleatorias` (v2 lisas).

  Mantener `relacionContraste`, `colorDeContraste` y `distanciaColor`.
- [X] T114 [P] [US11] Crear `packages/domain/src/equipo/nombreEquipo.ts` (`normalizarNombre`, `validarNombre` y `nombrePorDefecto`, data-model §3.1) y exportarlo en `packages/domain/src/index.ts`.
- [X] T115 [US11] Crear `apps/server/drizzle/0008_identidad.sql`, con su entrada en `meta/_journal.json`, siguiendo data-model §9 (pasos 1, 6 y 7):
  1. `ALTER TABLE perfiles_usuario ADD COLUMN nombre_equipo text NULL, ADD COLUMN equipaciones jsonb NULL` (la tabla la crea la `0006`, T049);
  2. convertir `participantes.equipaciones` v1 a v2 (lisa con `[principal, secundario]`) donde `NOT (equipaciones->'primera' ? 'diseno')`;
  3. renombrar los duplicados de `(partida_id, lower(nombre_equipo))` añadiendo ` 2`, ` 3`… por orden de `id`;
  4. `CREATE UNIQUE INDEX participantes_nombre_equipo_uq ON participantes (partida_id, lower(nombre_equipo))`.

  Reflejarlo en `apps/server/src/persistencia/esquema/base.ts`.
- [X] T116 [US11] Repositorios:
  - ampliar `apps/server/src/persistencia/repos/perfiles.ts` (creado en T051) con `obtener(usuarioId)` y `guardar(usuarioId, { nombreEquipo, equipaciones })`, que crea el perfil si no existe y no toca `ultima_modalidad`;
  - en `repos/partidas.ts`, `cambiarNombreEquipo(participanteId, nombre)`, que traduce la violación del índice único a `NOMBRE_REPETIDO`;
  - en `repos/equipo.ts`, leer `equipaciones` siempre a través de `desdeV1`.
- [X] T117 [US11] Protocolo:
  - crear `packages/protocol/src/http/perfil.ts`;
  - en `packages/protocol/src/http/partidas.ts`, `nombre-equipo`;
  - en `packages/protocol/src/http/alineacion.ts`, equipaciones v2, aceptando también v1 durante la compatibilidad;
  - en `packages/protocol/src/ws/partido.ts`, `partido.inicio.equipaciones` en v2.
- [X] T118 [US11] Rutas del servidor:
  - crear `apps/server/src/http/perfil.ts` (`GET` y `PUT /api/perfil`, 403 `SOLO_REGISTRADOS` para invitados) y registrarlo en `apps/server/src/http/app.ts`;
  - en `apps/server/src/http/partidas.ts`, `PUT /api/partidas/:id/nombre-equipo` (409 `TORNEO_INICIADO` si algún partido de la partida tiene un estado distinto de `pendiente`, o si la partida está `terminada`; FR-042), que emite `sala.actualizada` o `estado`;
  - en `apps/server/src/http/alineacion.ts`, equipaciones v2 con `desdeV1` y `validarEquipaciones` nuevo.
- [X] T119 [US11] En `apps/server/src/actores/sala.ts`:
  - `unirse` usa el perfil del usuario registrado (nombre y equipaciones) si existe y el nombre está libre; si no, `nombrePorDefecto(apodo, usados)` (hoy se usa el apodo tal cual). Si el nombre del perfil estaba ocupado, la vista de la sala lleva `nombreAjustado: true` para ese participante;
  - en `unirse`, `anadirNPC` y `rellenarPlazas`, el conjunto `usados` se construye con `normalizarNombre(n).toLowerCase()`, y `nombresNPC` y `nombrePorDefecto` comparan con esa misma clave, para que coincida con el índice único `(partida_id, lower(nombre_equipo))` de 0008. En `apps/server/src/actores/draft.ts`, las equipaciones iniciales solo se generan con `equipacionesAleatorias` si el participante no tiene ninguna.
- [X] T120 [US11] En `apps/server/src/actores/partidoRapido.ts`, `equipacionesDe` usa `desdeV1`, y `equipacionesDelPartido` usa el `equipacionEnPartido` nuevo (FR-047).
- [X] T121 [P] [US11] Crear `apps/web/src/componentes/Camiseta.tsx`, un SVG de la camiseta a partir de `patronDiseno`, con `data-patron`, y `apps/web/src/componentes/EditorEquipacion.tsx`:
  - diseño a elegir entre lisa, rayas verticales, franjas horizontales, banda diagonal y mitades;
  - 1–3 selectores de color;
  - vista previa en vivo;
  - aviso «La primera y la segunda equipación se parecen demasiado» que bloquea el guardado.
- [X] T122 [US11] Interfaz:
  - en `apps/web/src/pantallas/Alineacion.tsx`, sustituir el editor de dos colores por `EditorEquipacion` y añadir el campo del nombre, editable hasta que se abre el primer partido del torneo; después se muestra solo como texto;
  - en `apps/web/src/pantallas/Sala.tsx`, el paso «Nombre del equipo», con un contador de 3–24 caracteres y errores en línea («Ese nombre ya lo usa otro equipo», «Mínimo 3 caracteres»…). Con `nombreAjustado`, el aviso «Tu nombre «{nombre}» ya lo usa otro equipo; puedes elegir otro»;
  - crear `apps/web/src/pantallas/Perfil.tsx` («Mi perfil», solo usuarios registrados), con «Guardar» como botón principal en la `BarraPrincipal`, su ruta en `apps/web/src/app/Rutas.tsx` y un enlace en `Inicio.tsx`.
- [X] T123 [US11] En `apps/web/src/campo2d/renderizador.ts` y `Lienzo2D.tsx`, la chapa es un círculo con el color principal y el patrón de `patronDiseno` recortado dentro, con borde de contraste y el dorsal en `colorDorsal`. Actualizar el tipo `equipaciones` de la escena a v2 (FR-046).
- [X] T124 [US11] Auditoría de FR-044: comprobar que el draft (lista de asientos), la clasificación, el calendario, el cuadro, la preparación, el partido, los resultados, los goleadores y asistentes y las pantallas de derrota y de campeón muestran `nombreDe(participante)`, y que la tabla de goleadores no cuenta los goles en propia puerta. Corregir `apps/web/src/pantallas/Draft.tsx` y cualquier otra pantalla que no lo haga.

**Checkpoint**: escenarios K y L revisados.

---

## Phase 14: Polish & Cross-Cutting Concerns

**Purpose**: actualizar las specs anteriores, seguridad, carga, documentación y validación final.

- [X] T125 [P] Actualizar `specs/001-draft-manager-mvp/spec.md` y `specs/002-mejoras-mvp/spec.md` según "Requisitos de specs anteriores afectados" de la spec 003:
  - **001**: FR-001 y US3 (sin tipo de simulación), FR-031b (equipaciones con diseño), SC-007 (media de 2,6–3,4 de torneo o serie), FR-060 y US4, escenario 4 (PRO con decisiones dudosas), FR-045 y FR-050 (gestión con campo);
  - **002**: FR-007, FR-008 y SC-017 (8 s), FR-025a, FR-026 (pantalla de resultado), FR-034 y US7 (colocación en el campo de la alineación).
- [X] T126 [P] Proponer la enmienda PATCH v1.0.5 de `.specify/memory/constitution.md` (con `/speckit-constitution`) que añada a "Decisiones resueltas" la referencia a `specs/003-mejoras-ux-simulacion/`: FR-036 a FR-038 para los niveles de los NPC, FR-045 a FR-047 para las equipaciones y FR-032 para el tipo de simulación. La aclaración del Principio IX sobre el informe de `balance` ya está aprobada en la v1.0.4 (2026-10-19).
- [X] T127 [P] Aplicar el límite de peticiones de `apps/server/src/http/limitador.ts` a `nombre-equipo`, `perfil`, `simular-resto`, `pantalla-vista` y `partido.decisiones`. Ampliar la auditoría de visibilidad: `partido.inicio` no expone la alineación ampliada del rival.
- [ ] T128 [P] Actualizar la prueba de carga `tools/load/beta-100.js`: `abrir` con `{ modalidad }`, crear partidas sin `tipoSimulacion` y `partido.decisiones`. Volver a medir 001/SC-017 con el motor 3.0.0.
- [X] T129 [P] Revisión de accesibilidad en `apps/web/src/`:
  - `aria-disabled` y `aria-describedby` de la barra principal;
  - alternativa de teclado en `CampoEquipo` y `GestionEquipo`;
  - `VistaCarta` accesible con el foco: mostrarla también con `focus`;
  - `prefers-reduced-motion` en las cartas, la apertura y las pantallas de derrota y de campeón;
  - contraste de los diseños de equipación en la chapa.
- [X] T130 [P] Actualizar `README.md` y `docs/despliegue.md`:
  - terminar los partidos 2.x en juego antes de desplegar el motor 3.0.0 (research R2);
  - las opciones nuevas `pnpm balance --solo/--serie/--torneos`;
  - las migraciones `0006` a `0008`.
- [X] T131 Añadir a `pnpm balance --n 200` en `.github/workflows/ci.yml` las comprobaciones `003/SC-001` a `003/SC-009` (serie sintética), y el caso `metricas` al umbral del bench.
- [X] T132 Ejecutar `graphify update .` para mantener el grafo de conocimiento al día (CLAUDE.md).
- [ ] T133 Ejecutar la validación completa de [quickstart.md](./quickstart.md) y registrar los resultados en `specs/003-mejoras-ux-simulacion/checklists/validacion.md`:
  - toda la tabla de pruebas automáticas y los escenarios A a L;
  - pruebas con al menos 5 personas de:
    - SC-008 (2D de `c8a1627` frente a la nueva);
    - SC-011 (primer torneo contra amateur);
    - SC-012 (lectura de un GOAT);
    - SC-013 (encontrar el botón en < 2 s);
    - SC-014 (colocación y cambio en < 30 s);
    - SC-016 (gestión en el descanso);
    - SC-019 (sonido agradable).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Fase 1)**: sin dependencias.
- **Foundational (Fase 2)**: depende de Setup. Bloquea US1, US8 (margen de 8 s) y US9 (parámetros `npc`).
- **US1 motor (Fase 3)**: Foundational.
- **US2 Formación (Fase 4)**: solo Setup. Independiente del motor.
- **US3 modo (Fase 5)**: solo Setup. La migración `0006` crea también `perfiles_usuario` con `ultima_modalidad` y US3 crea su repositorio mínimo (T049 y T051), así que no depende de US11.
- **US4 botones (Fase 6)**: solo Setup. Conviene antes de US5, US6 y US10, que montan sus botones en la `BarraPrincipal`.
- **US5 gestión (Fase 7)**: US2 (`CampoEquipo` y `VistaCarta`) y US4 (barra).
- **US6 resultado (Fase 8)**: US4 (barra). Independiente del resto.
- **US7 cartas (Fase 9)**: Setup (tipografía, T002).
- **US8 sobres (Fase 10)**: Foundational (T007). Se beneficia de US7, porque gira la carta completa con su diseño final, pero no depende de ella.
- **US9 NPC (Fase 11)**: Foundational. La calibración final (T097) requiere US1 terminada.
- **US10 derrota y campeón (Fase 12)**: US4 (barra) para los botones. El dominio y el servidor solo necesitan Setup.
- **US11 identidad (Fase 13)**: Setup. T122 toca `Alineacion.tsx` después de US2 (T043).
- **Polish (Fase 14)**: depende de las historias que se entreguen.

### Grafo de historias

```text
Setup ─┬─► Foundational ─┬─► US1 (motor) ──────────────► calibración de US9 (T097)
       │                 ├─► US8 (sobres)
       │                 └─► US9 (NPC)
       ├─► US2 (Formación) ─┬─► US5 (gestión) ◄─┐
       │                    └─► US11 (identidad; T122 tras T043)
       ├─► US3 (modo)                            │
       ├─► US4 (botones) ───┬────────────────────┘
       │                    ├─► US6 (resultado)
       │                    └─► US10 (derrota y campeón)
       └─► US7 (cartas)
```

### Within Each User Story

- Las pruebas se escriben primero y deben fallar.
- Después: parámetros y dominio → motor e IA → protocolo y migración → repositorios → actores y rutas del servidor → pantallas web.
- Cada historia se cierra en su checkpoint antes de pasar a la siguiente (si se trabaja en secuencia).

### Parallel Opportunities

- **Setup**: T001 y T002 a la vez. T003 necesita el worktree.
- **Foundational**: las pruebas T004 a T006 a la vez.
- **Tras Setup**: US2, US3, US4, US7 y US11 (dominio y servidor) tocan ficheros distintos y pueden repartirse entre varias personas, mientras otra trabaja en US1 tras Foundational.
- **Dentro de US1**: las pruebas T011 a T018 a la vez, y T030 (serie Core) en paralelo a T021 a T029. T021 a T029 tocan `opciones.ts` y `juego.ts`, así que van en secuencia.
- **US6 ∥ US7 ∥ US8 ∥ US10**: no comparten ficheros, salvo las pantallas que reciben la barra.
- **US9 ∥ US1**: `packages/ai` y `tools/balance/src/checks/npc.ts` no tocan el motor; solo la calibración T097 espera a US1.

---

## Parallel Example: User Story 1 (motor)

```bash
# Pruebas (en paralelo, antes de implementar):
Task: "Receptor y dirección del pase en packages/engine/tests/receptor.test.ts"
Task: "Motivos del pase largo, conducción y factorStat en packages/engine/tests/opciones.test.ts"
Task: "Tiro por distancia y ángulo en packages/engine/tests/tiroDistancia.test.ts"
Task: "rivalCercano y radio de intervención en packages/engine/tests/contexto.test.ts"
Task: "Penalti espacial y falta directa en packages/engine/tests/balonParado.test.ts"
Task: "Distancia y zona en los eventos de gol en packages/engine/tests/eventosGol.test.ts"
Task: "Invariante 10 de métricas en packages/engine/tests/metricas.test.ts"

# Implementación en paralelo con el motor:
Task: "Serie Core en tools/balance/src/core.ts"
Task: "Tipo de gol en apps/web/src/componentes/ResumenEventos.tsx"
```

## Parallel Example: User Story 11

```bash
Task: "Equipaciones v2 en packages/domain/tests/equipo/equipaciones.test.ts"
Task: "Nombre de equipo en packages/domain/tests/equipo/nombreEquipo.test.ts"
Task: "Perfil y nombre en apps/server/tests/contract/perfil.test.ts"
Task: "Identidad y migración 0008 en apps/server/tests/integration/identidad.test.ts"
Task: "Reglas de nombre en packages/domain/src/equipo/nombreEquipo.ts"
Task: "Camiseta y editor en apps/web/src/componentes/Camiseta.tsx y EditorEquipacion.tsx"
```

---

## Implementation Strategy

### MVP primero (historias P1)

1. Fase 1 (Setup) y Fase 2 (Foundational).
2. **US1** → validar el escenario A, `balance` y `bench`. Es el motivo principal de esta spec, porque la valoración de realismo fue negativa.
3. **US2** → validar el escenario B.
4. **US3** → validar el escenario C.
5. **US4** → validar el escenario D.
6. **Parar y demostrar**: todas las historias P1 están hechas.

### Entrega incremental

1. P1: US1, US2, US3 y US4. US2, US3 y US4 pueden ir en paralelo a US1.
2. \+ P2: US5 (gestión), US6 (resultado), US7 (cartas), US8 (sobres) y US9 (NPC).
3. \+ P3: US10 (derrota y campeón) y US11 (identidad).
4. Polish: actualizar las specs anteriores y la constitución, carga, seguridad y validación con personas.

**Despliegue**: los parámetros 3.0.0 hacen que los partidos 2.x no se puedan reproducir. No desplegar en la beta hasta tener US1 calibrada (T033), o se mostraría un motor a medio ajustar. Antes de desplegar, terminar los partidos en juego (research R2). Las migraciones `0006`, `0007` y `0008` se pueden desplegar con su historia.

### Equipo en paralelo

Tras Setup y Foundational:

- una persona en el motor (US1) y después en la calibración de los NPC (US9, T097);
- otra en el cliente (US2 → US4 → US5 → US6) y en las cartas y los sobres (US7, US8);
- otra en el servidor y el dominio (US3 → US10 → US11) y en la IA (US9, T087 a T096).

---

## Notes

- [P] = ficheros distintos y sin dependencias pendientes. [USn] = trazabilidad con spec.md.
- Siempre **pnpm**: `pnpm add` / `pnpm --filter @fbd/<paquete> add` / `pnpm dlx`. Nunca npm, yarn ni bun. Esta spec no añade ninguna dependencia npm.
- Ningún `Math.random` ni `Date` en `domain`, `engine` o `ai`; ESLint lo impide.
- Toda magnitud nueva del motor o de los NPC va a `ParametrosEquilibrado` 3.0.0, con sus pruebas (Principio III). Los objetivos de los SC solo se cambian actualizando la spec (como la decisión del 25 % de goles fuera del área).
- El motor nunca recibe si un equipo es de un humano o de un NPC (FR-037 e invariante 11).
- Hacer commit al terminar cada tarea o grupo lógico; validar cada checkpoint antes de seguir.

---

## Phase 15: Hallazgos de la validación con personas (2026-10-20)

**Purpose**: corregir los hallazgos de [checklists/validacion.md](./checklists/validacion.md). Los cambios de requisito ya están en la spec (sesión 2026-10-20).

- [X] T134 [US2] H3: la carta ampliada se colapsaba en una franja; ancho explícito en `.vista-carta` y e2e de tamaño en `alineacion.spec.ts`.
- [X] T135 [US2] H4: intercambio entre banquillo y resto de la plantilla (destinos `banquillo`/`reserva` con `sobre`, teclado), con pruebas unitarias y e2e.
- [X] T136 [US1] H8: tras un gol, el saque empieza con el balón en el centro; prueba `packages/engine/tests/saqueCentro.test.ts`.
- [X] T137 [US7] H1 y H2: cartas completas del mismo tamaño y specials en una línea; e2e en `cartas.spec.ts`.
- [X] T138 [US8] H10: las cartas del sobre no se ven detrás de la apertura; e2e en `apertura.spec.ts`.
- [X] T139 [US2] H5 y H7 (FR-003b, FR-032): en `Alineacion.tsx`, el principal es siempre «Confirmar alineación», que guarda y lleva al torneo; se quitan el selector de modo y «Comenzar partido». Actualizar las e2e que empezaban el partido desde «Formación».
- [X] T140 [US2] H6 (FR-001b): asignar los dorsales al terminar el draft, según la alineación automática, en `apps/server/src/actores/draft.ts`; confirmar el once no los reasigna. Pruebas de integración.
- [X] T141 [US5] H9 (FR-006a): en el descanso contra un NPC, «Gestionar equipo» y «Seguir» con el estilo de botón principal, «Seguir» a la derecha (`BarraPrincipal` con dos principales); actualizar `boton-principal.spec.ts`.
- [ ] T142 [US1] H11: más llegadas al área y goles de ED, EI y MCO; comprobación nueva en `tools/balance` (reparto de goles por demarcación).
- [X] T143 [US9] H13: sumar 100 milésimas a `npc.errores` de cada nivel y volver a medir 003/SC-010.
- [X] T144 H14 (FR-038a): dificultad de la partida (Fácil, Normal por defecto, Difícil) en `ConfigPartida`, `rellenarConNPC(…, dificultad)`, migración `0009_dificultad.sql`, `CrearPartida` y `ResumenPartida`; selector en «Nueva partida» y dificultad en la sala. Pruebas: dominio `partida.test.ts`, contrato `partidas.test.ts` (3 nuevas), e2e `dificultad.spec.ts`.
