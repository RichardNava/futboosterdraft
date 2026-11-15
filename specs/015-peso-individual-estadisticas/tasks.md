---

description: "Tareas de la spec 015: peso individual de las estadísticas"
---

# Tasks: Peso individual de las estadísticas — duelos atacante contra defensor

**Input**: documentos de diseño de `specs/015-peso-individual-estadisticas/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md),
[contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: sí. El plan (Testing) y el Principio IX los piden: cada historia tiene sus tests de unidad del motor y su
comprobación en el informe de `pnpm balance`.

**Organización**: por historia de usuario, en el orden de las tres tandas de calibración. La tanda 1 son US1–US3, la
tanda 2 US4–US5 y la tanda 3 US6. Cada tanda se cierra con `pnpm balance --n 1000` (~105 min) antes de empezar la
siguiente.

**Reglas comunes a todas las tareas**:

- Todo lo nuevo se activa por la **presencia de un bloque opcional** en los parámetros (research R1). Sin el bloque, el
  código hace exactamente lo de la 7.0.0. Nunca `if (version >= 8)`.
- `huella-014.json` (7.0.0) DEBE seguir idéntica después de cada tarea del motor. Se comprueba con
  `pnpm --filter @fbd/engine test equivalencia014`.
- Sin tildes en el código; textos de interfaz y documentación en español.
- Los agentes no hacen `git commit` ni `git push`.
- Tras modificar código, `graphify update .`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (otro fichero, sin dependencias pendientes)
- **[Story]**: historia a la que pertenece (US1…US6)

---

## Phase 1: Setup (referencia de la 7.0.0)

**Purpose**: medir la línea base antes de tocar nada (SC-009, invariante M2.1).

- [X] T001 Medir el tiempo por partido de la 7.0.0 con `pnpm --filter @fbd/balance umbral-motor` y apuntar el valor (máquina, fecha, ms/partido) en una sección «Referencia 7.0.0» al final de `specs/015-peso-individual-estadisticas/research.md` (R11)
- [X] T002 [P] Confirmar que `pnpm --filter @fbd/engine test equivalencia014` pasa con `packages/engine/tests/fixtures/huella-014.json` antes de empezar; si no pasa, parar y avisar

---

## Phase 2: Foundational (parámetros 8.0.0 y atributos)

**Purpose**: la forma de los parámetros 8.0.0 y la traducción carta → atributo con acceso a la carta completa.
Bloquea a todas las historias.

**⚠️ CRITICAL**: ninguna historia empieza hasta cerrar esta fase.

- [X] T003 Añadir a `ParametrosEquilibrado` en `packages/domain/src/parametros/index.ts` los seis bloques **opcionales** de contracts/motor.md §M1, con estos tipos exactos: `duelos?: Partial<Record<'regate' | 'conduccion' | 'pase_corto', { base: number; m: number }>>`; `quite?: { DEF: number; MED_MD: number; MED: number; DEL: number; presionador: number; malDefensor: number }`; `aereo?: { bonusCabeceador: number; seleccionCabeceador: number }`; `desmarque?: { radioMarcaM: number; base: number; m: number; bonusLibre: number; penalizacionMarcado: number; pesoEleccion: number }`; `controlPresion?: { base: number; m: number }`; `liderazgo?: { radioDefensaM: number; kDefensa: number; maxCorreccion: number; porcentajePortero: number; zonaMaxPortero: number }`
- [X] T004 Crear `PARAMETROS_V8 = { ...PARAMETROS_V7, version: '8.0.0', ... }` en `packages/domain/src/parametros/index.ts`, registrarlo en `REGISTRO['8.0.0']` y hacer que `parametrosActuales()` lo devuelva; `VERSION_MAYOR_SOPORTADA` se queda en 7 (R1). De momento sin bloques nuevos (se añaden en cada historia); `PARAMETROS_V8` se edita en el sitio entre tandas
- [X] T005 [P] Ampliar `packages/domain/tests/parametros/parametros.test.ts`: `parametrosActuales().version === '8.0.0'`, `REGISTRO['7.0.0']` sigue disponible y sin ninguno de los bloques nuevos, `VERSION_MAYOR_SOPORTADA === 7`
- [X] T006 Cambiar la traducción carta → atributo de `packages/engine/src/modificadores/atributos.ts` para que reciba la carta completa (posiciones y rasgos) y los parámetros, además de las stats efectivas, sin cambiar ningún valor con la 7.0.0; mantener el orden de modificadores stats base → posición → bonificaciones → traducción → cansancio → defectos de equipo (FR-017) y la caché por jugador (`cacheAtributos`)
- [X] T007 Ampliar el tipo `Atributo` en `packages/engine/src/modificadores/atributos.ts` con `marcaje`, `tecnica` y `liderazgo` (data-model §4), que solo se calculan con su bloque presente (`desmarque`, `controlPresion`, `liderazgo`); sin bloque, no se usan
- [X] T008 Añadir a `MetricasJugador` en `packages/engine/src/tipos.ts` los contadores `duelosDesmarque`, `recibidoLibre`, `marcajesGanados`, `controlesPresion`, `controlesPerdidos`, `duelosAereos`, `aereosGanados` y `habilitaciones`, inicializados a 0 (data-model §7); no viajan en el protocolo ni en los eventos
- [X] T009 Hacer que `probabilidad()`/los llamantes de `packages/engine/src/acciones/duelo.ts` en `packages/engine/src/acciones/juego.ts` lean base y m de `parametros.duelos[accion]` cuando exista, y si no de `acciones.*` y `pendientePase` como en la 7.0.0 (data-model §5); la fórmula de `duelo.ts` no cambia
- [X] T010 Ejecutar `pnpm --filter @fbd/engine test` y `pnpm -r typecheck`; `equivalencia014` DEBE seguir en verde

**Checkpoint**: 8.0.0 registrada, idéntica a la 7.0.0 en resultados; las historias pueden empezar.

---

## Phase 3: User Story 1 - Cada duelo depende de las dos stats enfrentadas (Priority: P1) 🎯 MVP — tanda 1

**Goal**: curvas de FR-002 y quite por demarcación con Presionador y Mal defensor (FR-001 a FR-006).

**Independent Test**: los nueve duelos de FR-002 calculados sin ajustes caen en su rango (`pnpm balance --solo
015/SC-001`) y los quites de los escenarios 3 y 4 salen exactos.

### Tests for User Story 1

- [X] T011 [P] [US1] Crear `packages/engine/tests/curvas015.test.ts`: con `PARAMETROS_V8` y sin ajustes, `probabilidad()` da regate 98/90 en 44–54 %, 98/70 en 65–75 %, 66/90 en 15–25 %; pase corto 55/75 en 63–73 % y 90/75 en 80–90 %; remate 90/80 (normal, 11 m, nadie tapa) en 64–74 % y 60/90 en 22–32 %; conducción 90/70 en 72–82 % y 70/90 en 25–35 % (FR-002, invariante M2.2)
- [X] T012 [P] [US1] Crear `packages/engine/tests/quite015.test.ts` con la invariante M2.3: MED sin MD (posicionamiento 80, velocidad 70) → 63,75; con Presionador 67,5; con Mal defensor 60; con los dos 63,75; MED con MD en `posiciones` → ×0,90 aunque juegue en otra casilla; DEL (agresividad 80, velocidad 70) → 60 y con Presionador 63,75; DEF tackling 80 → 80, con Presionador 84, con Mal defensor 76; POR → su defensa. Y con `PARAMETROS_V7` el quite es el de la 7.0.0
- [X] T013 [P] [US1] Añadir a `packages/engine/tests/curvas015.test.ts` el caso FR-006 (invariante M2.4): el tirador usa `remate` (MED disparo, DEL finalización) y el portero `parada = (agilidad + colocación) / 2`

### Implementation for User Story 1

- [X] T014 [US1] Añadir a `PARAMETROS_V8` en `packages/domain/src/parametros/index.ts` el bloque `duelos` con los valores de partida de R2: `regate { base: -0.32, m: 1.1 }`, `conduccion { base: 0.25, m: 1.15 }`, `pase_corto { base: 1.57, m: 1.27 }`; remate, pase largo y pase al espacio sin entrada (conservan los de la 7.0.0)
- [X] T015 [US1] Añadir a `PARAMETROS_V8` el bloque `quite: { DEF: 1.0, MED_MD: 0.9, MED: 0.85, DEL: 0.8, presionador: 0.05, malDefensor: 0.05 }` en `packages/domain/src/parametros/index.ts`
- [X] T016 [US1] Implementar en `packages/engine/src/modificadores/atributos.ts`, con el bloque `quite`: `mult` = base por demarcación (MED_MD si `jugador.posiciones` incluye MD) + `presionador` si tiene Presionador − `malDefensor` si tiene Mal defensor; `quite` = POR defensa · DEF tackling × mult · MED (posicionamiento + velocidad) / 2 × mult · DEL (agresividad + velocidad) / 2 × mult (FR-004, FR-005, R3). No tocar los efectos actuales de Presionador (−0,08 en `juego.ts`, presión extra en `objetivos.ts`) ni de Mal defensor (×0,65 en `contexto.ts`)
- [X] T017 [US1] Añadir `015/SC-001` en el nuevo `tools/balance/src/checks/curvas015.ts`: los nueve duelos con `probabilidad()` y `PARAMETROS_V8`, sin series, con el valor de cada uno en el detalle (contracts/balance.md §B1); registrarlo en `tools/balance/src/cli.ts` junto a `gruposMotor014`
- [X] T018 [US1] Quitar de `tools/balance/src/checks/pesoStats.ts` las comprobaciones `014/SC-008-pase`, `014/SC-008-remate` y `014/SC-008-fisico` (sustituidas por `015/SC-001`); se quedan regate, defensa, velocidad y portero (B2)
- [X] T019 [US1] Quitar esos tres ids de `--pendientes` en `.github/workflows/ci.yml` (y del comentario que los cita)
- [X] T020 [US1] Ejecutar `pnpm --filter @fbd/engine test curvas015 quite015 equivalencia014` y `pnpm balance --solo 015/SC-001`; si un duelo cae fuera, ajustar base/m del bloque `duelos` sin ampliar diferencias más allá de FR-002 (FR-003)

**Checkpoint**: curvas y quite listos y probados por separado.

---

## Phase 4: User Story 2 - El buen regateador lo intenta más (Priority: P1) — tanda 1

**Goal**: la stat de regate cambia la frecuencia de regate y conducción, también con espacio por delante (FR-007, R4).

**Independent Test**: serie A/B con un DEL a 95 frente a 75 de regate: ≥ +40 % intentos y ≥ +60 % completados; el
mejor regateador de Core supera a algún defensor en ≥ 90 % de los partidos (SC-002).

### Tests for User Story 2

- [X] T021 [P] [US2] Añadir a `packages/engine/tests/opciones.test.ts` la invariante M2.6: con `PARAMETROS_V8`, a igualdad de todo lo demás, el peso de regate y el de conducción con regate 95 son mayores que con 75, tanto con rival encima como con más de 15 m de espacio; con `PARAMETROS_V7`, con espacio abierto el peso no depende del regate (comportamiento de hoy)

### Implementation for User Story 2

- [X] T022 [US2] Poner en `PARAMETROS_V8` (`packages/domain/src/parametros/index.ts`) `decision.factores.regate = { k: 0.7, min: 0.6, max: 3.0 }` (contracts/motor.md §M1)
- [X] T023 [US2] En `opcionesConDatos` de `packages/engine/src/acciones/opciones.ts`, con el bloque `duelos` presente: aplicar el factor de regate siempre al peso del regate y de la conducción; con espacio abierto, la conducción usa la media geométrica del factor de regate y el del físico (R4). Sin el bloque, igual que la 7.0.0
- [X] T024 [US2] Crear `tools/balance/src/sonda015.ts` (200 partidos, modelo `tools/balance/src/sonda014.ts`) que repita la serie A/B de SC-002a y el recuento del mejor regateador de Core de SC-002b, para calibrar `factores.regate` sin la serie de 1.000
- [X] T025 [US2] Crear `tools/balance/src/checks/motor015.ts` con `015/SC-002a` (A/B sobre `equipoSintetico` y `clonar`: DEL titular con regate 95 contra 75; intentos de regate + conducción por partido ≥ +40 % y completados ≥ +60 %) y `015/SC-002b` (Core: el mejor regateador del catálogo, titular contra equipos equilibrados; regates o conducciones ganados ≥ 1 en ≥ 90 % de los partidos); registrar el grupo en `tools/balance/src/cli.ts`
- [X] T026 [US2] Calibrar `factores.regate` con `pnpm --filter @fbd/balance exec tsx src/sonda015.ts` hasta cumplir SC-002 en la sonda; vigilar 003/SC-005 (conducciones por partido)

**Checkpoint**: el regateador encara y conduce más; US1 sigue en verde.

---

## Phase 5: User Story 3 - Juego aéreo del defensa y Cabeceador en cualquier posición (Priority: P2) — tanda 1

**Goal**: Cabeceador para cualquier jugador de campo, ±15 en todos los duelos aéreos de las dos áreas, y las seis
cartas de Core con la virtud (FR-008, FR-009, FR-010, R5, R6).

**Independent Test**: serie A/B con centrales con y sin Cabeceador: más `aereosGanados` y más goles de cabeza a balón
parado, con diferencia significativa (SC-003).

### Tests for User Story 3

- [X] T027 [P] [US3] Crear `packages/engine/tests/cabeceador015.test.ts` (invariante M2.5): el `aereo` de un DEF es su anticipación; con `PARAMETROS_V8`, en córner/falta lateral, en el primer duelo del remate de cabeza y en el centro interceptado dentro del área, la probabilidad del lado con Cabeceador es 0,15 mayor (antes del recorte 0,03–0,97) que sin la virtud, siendo atacante o defensor; el segundo duelo del remate de cabeza conserva su +0,15; con `PARAMETROS_V7`, sin cambios
- [X] T028 [P] [US3] Ampliar `packages/domain/tests/catalogo/validar.test.ts`: Cabeceador es válida en DEF, MED y DEL; una carta POR con Cabeceador es un error de validación
- [X] T029 [P] [US3] Ampliar `packages/domain/tests/catalogo/versionCatalogo.test.ts`: `VERSION_CATALOGO_ACTUAL === 3`; `cartaEnVersion(carta, 3)` devuelve la carta tal cual; `cartaEnVersion(carta, 2)` cambia Cabeceador por la virtud cedida en las cartas 60, 76, 77, 86, 87 y 275 y no toca las demás; `cartaEnVersion(carta, 1)` hace lo mismo y además lo que ya hacía con la versión 1
- [X] T030 [P] [US3] Ampliar `packages/domain/tests/catalogo/rasgos.test.ts`: `RASGOS.Cabeceador.ambito === 'campo'`

### Implementation for User Story 3

- [X] T031 [US3] En `packages/domain/src/catalogo/tipos.ts`: sacar Cabeceador de `VIRTUDES_DEL`, crear `VIRTUDES_CAMPO = ['Cabeceador'] as const` y hacer que `virtudesPermitidas` (y `VIRTUDES_POR_DEMARCACION` si existe) la añadan a DEF, MED y DEL, nunca a POR (contracts/catalogo.md §C1)
- [X] T032 [US3] En `packages/domain/src/catalogo/rasgos.ts`: añadir `'campo'` a `AmbitoRasgo`, poner `Cabeceador.ambito = 'campo'` y actualizar `descripcion`/`efecto` de Cabeceador (+15 en todos los duelos aéreos de las dos áreas, en ataque y en defensa), Presionador (+0,05 al multiplicador del quite, además de lo de hoy) y Mal defensor (−0,05 al multiplicador del quite, además de lo de hoy); textos visibles con tildes
- [X] T033 [P] [US3] En `packages/domain/src/catalogo/documentoRasgos.ts`: etiqueta «Jugador de campo» para el ámbito `'campo'`
- [X] T034 [US3] Revisar con `graphify query "VIRTUDES_DEL Cabeceador"` que ningún consumidor (validación, IA del draft en `packages/ai/src/`, fichas en `apps/web/src/componentes/`) dé por hecho que Cabeceador es de delantero; corregir los que lo hagan para que lean `virtudesPermitidas`
- [X] T035 [US3] En `packages/domain/src/catalogo/versionCatalogo.ts`: `VERSION_CATALOGO_ACTUAL = 3`; `VIRTUD_CEDIDA_015: Record<number, Virtud> = { 60: MuroDefensivo, 76: Volador, 77: Potente, 86: Intimidante, 87: Aura, 275: Potente }`; `cartaEnVersion(j, v)` con v < 3 cambia Cabeceador por la virtud cedida si `j.id` está en el mapa; v = 1 conserva además lo que ya hacía (data-model §3)
- [X] T036 [US3] En `data/core-real.json`, cartas 60 (Marc, cede Muro defensivo y conserva Capitanía), 76 (Gabriel, Volador), 77 (Joško, Potente), 86 (Sergio, Intimidante), 87 (Virgil, Aura) y 275 (Ronald Federico, Potente): cambiar la virtud cedida por Cabeceador; ejecutar `pnpm --filter @fbd/fixtures core-real` (debe pasar y regenera `specs/008-datos-reales-core/sumario.md`)
- [X] T037 [US3] Añadir a `PARAMETROS_V8` en `packages/domain/src/parametros/index.ts` el bloque `aereo: { bonusCabeceador: 0.15, seleccionCabeceador: 10 }`
- [X] T038 [US3] En `packages/engine/src/acciones/tiro.ts`, con el bloque `aereo`: en `rematarBalonParado`, `ajuste` +`bonusCabeceador` si el rematador tiene Cabeceador y −`bonusCabeceador` si la tiene el defensor que le marca; en el primer duelo del remate de cabeza, −`bonusCabeceador` si el que tapa la tiene; el segundo duelo conserva `bonusProbabilidadAlto`; al elegir al defensor que marca en balón parado (`aereo + Volador`), sumar `seleccionCabeceador` si tiene Cabeceador (R5)
- [X] T039 [US3] En el punto de `packages/engine/src/acciones/juego.ts` (o `tiro.ts`) que resuelve el centro interceptado dentro del área del defensor: −`bonusCabeceador` si el interceptor tiene Cabeceador, con el bloque `aereo` (R5)
- [X] T040 [US3] Anotar `duelosAereos` (cada participante) y `aereosGanados` (ganador) en balón parado, remate de cabeza tapado y centro en el área, en `packages/engine/src/acciones/tiro.ts` y `juego.ts`
- [X] T041 [US3] Añadir `015/SC-003` a `tools/balance/src/checks/motor015.ts`: A/B con centrales con Cabeceador o sin ella; más `aereosGanados` y más goles de cabeza a balón parado, significativos con `mayorSignificativo`
- [X] T042 [US3] Ejecutar `pnpm --filter @fbd/engine test cabeceador015 equivalencia014` y `pnpm --filter @fbd/domain test`

**Checkpoint**: Cabeceador de campo en catálogo, motor e informe.

---

## Phase 6: Cierre de la tanda 1

- [X] T043 (cerrada el 2026-11-15: ver research.md, «Balones fuera»; quedan pendientes 002/SC-008, 003/SC-009 y 015/SC-012) Ejecutar `pnpm balance --n 1000`; esperado: `015/SC-001`, `015/SC-002a`, `015/SC-002b`, `015/SC-003` ✔; 002/SC-007a puede quedar < 150 (FR-020); ninguna comprobación que pasaba con la 7.0.0 en rojo (FR-021). Ajustar los valores de `duelos`, `quite`, `aereo` y `factores.regate` en `packages/domain/src/parametros/index.ts` si hace falta, dentro de FR-002/FR-003
- [X] T044 Actualizar `--pendientes` en `.github/workflows/ci.yml`: quitar las pendientes que ya se cumplen (el informe lo avisa) y añadir los ids de la 015 que aún no se cumplan; si SC-002 a SC-006 no se alcanzan sin ampliar diferencias más allá de FR-002, anotarlo en `specs/015-peso-individual-estadisticas/spec.md` (clarificación de SC-002 a SC-006)
- [X] T045 Medir con `pnpm --filter @fbd/balance umbral-motor` y comparar con T001 (≤ +10 %, SC-009)

---

## Phase 6b: Añadidos de la tanda 1 (US7 a US10, clarificaciones del 2026-11-14)

**Goal**: buscar a la estrella, Juego por las bandas, subida al área a balón parado y salir de su zona (FR-025 a
FR-030), colgados de bloques de la 8.0.0.

- [X] T082 Añadir a `ParametrosEquilibrado` y a `PARAMETROS_V8` en `packages/domain/src/parametros/index.ts` los bloques `estrella`, `bandas`, `subidaArea` y `segundaLinea` (contracts/motor.md M1) y su prueba en `packages/domain/tests/parametros/parametros.test.ts`
- [X] T083 [P] [US8] Añadir `bandas` a `ESTILOS_CON_BALON` (`packages/domain/src/equipo/tactica.ts`), al esquema de `packages/protocol/src/http/alineacion.ts` y al panel `apps/web/src/componentes/PanelTactica.tsx` («Juego por las bandas»)
- [X] T084 [P] [US7] Crear `packages/engine/tests/anadidos015.test.ts` con las invariantes M2.13 a M2.17
- [X] T085 [US7] `pesosEstrella` y la línea clara en `pesosReceptor` (`packages/engine/src/acciones/receptor.ts`); `ajusteDesmarque` en el duelo del pase (`packages/engine/src/acciones/juego.ts`)
- [X] T086 [US8] `probabilidadBanda` y centro en `packages/engine/src/modificadores/formacionTactica.ts`; receptor de banda en `receptor.ts`
- [X] T087 [US9] `colocarSubida` y `porteroSube` en `packages/engine/src/espacio/colocacion.ts`; portero rematador en `rematarBalonParado` (`packages/engine/src/acciones/tiro.ts`)
- [X] T088 [US10] Mano a mano desde el campo propio (`packages/engine/src/acciones/manoAMano.ts`) y llegada de MC, MII y MID a la frontal (`packages/engine/src/espacio/objetivos.ts`)
- [X] T089 Añadir `015/SC-011` y `015/SC-012` a `tools/balance/src/checks/motor015.ts`; SC-003 cuenta los goles de cabeza de todo el equipo
- [X] T090 Documentar los añadidos en spec.md, plan.md, research.md (R12 a R15), data-model.md, contracts y quickstart.md, y en `docs/juego/enfrentamientos.md`
- [ ] T091 (abierta: 015/SC-012 en 5,9 %, ver research.md, «Balones fuera») Serie de cierre con los añadidos: `pnpm balance --n 1000`; esperado 015/SC-002b, SC-003, SC-011 y SC-012 ✔ y ninguna regresión nueva; actualizar `--pendientes` en `.github/workflows/ci.yml`

---

## Phase 7: User Story 4 - Desmarque contra marcaje antes de cada pase (Priority: P2) — tanda 2

**Goal**: duelo de desmarque contra el marcador antes de cada pase, y elección del receptor según ese duelo (FR-011,
FR-012, FR-013, FR-019, FR-020, R7).

**Independent Test**: serie A/B con receptor +15 de desmarque y marcador +15 de marcaje: cambia `recibidoLibre` y los
pases completados recibidos, con diferencia significativa (SC-004).

### Tests for User Story 4

- [X] T046 [P] [US4] Crear `packages/engine/tests/desmarque.test.ts` (invariante M2.7): sin rival de campo a ≤ `radioMarcaM` del receptor no hay tirada y recibe libre; con portero receptor no hay duelo; defensor sin stat usa 50 (FR-019); receptor que gana → +`bonusLibre` en el pase y sin control; receptor que pierde → −`penalizacionMarcado` y control si llega; atributos de FR-012 (desmarque: DEL desmarque, MED visión, DEF velocidad; marcaje: DEF marcaje, MED posicionamiento, DEL agresividad, POR 50); escenario 4 de US4 (MED receptor contra DEL marcador: visión contra agresividad)
- [X] T047 [P] [US4] Ampliar `packages/engine/tests/receptor.test.ts` (invariante M2.8): de dos candidatos iguales salvo el `desmarque`, el de más desmarque tiene más peso en `pesosReceptor`; sin marcador, p = 1; con `PARAMETROS_V7`, pesos de hoy

### Implementation for User Story 4

- [X] T048 [US4] Añadir a `PARAMETROS_V8` en `packages/domain/src/parametros/index.ts` el bloque `desmarque: { radioMarcaM: 3, base: 0, m: 1, bonusLibre: 0.5, penalizacionMarcado: 0.4, pesoEleccion: 1 }`
- [X] T049 [US4] En `packages/engine/src/modificadores/atributos.ts`, con el bloque `desmarque`: `desmarque` = DEL desmarque, MED visión, DEF velocidad (sustituye al ×0,8 de hoy); `marcaje` = DEF marcaje, MED posicionamiento, DEL agresividad, POR 50 (data-model §4)
- [X] T050 [US4] Crear `packages/engine/src/acciones/desmarque.ts` con funciones puras: `marcadorDe(receptor, rivales, radioMarcaM)` (rival de campo más cercano a ≤ radio, un único recorrido sin ordenar ni reservar memoria; `null` si no hay o si el receptor es portero) y `probabilidadDesmarque(desmarque, marcaje, params)` con `probabilidad()` de `duelo.ts` (FR-018, M2.12)
- [X] T051 [US4] En `pesosReceptor` de `packages/engine/src/acciones/receptor.ts`, con el bloque: multiplicar el peso de cada candidato por `1 + pesoEleccion × (p − 0,5)`, con p la probabilidad de ganar su duelo de desmarque sin tirada (p = 1 sin marcador) (FR-013)
- [X] T052 [US4] (Sustituye a `ajusteDesmarque` de T085 y a `estrella.pendienteDesmarque`.) En la resolución del pase de `packages/engine/src/acciones/juego.ts`, con el bloque: tras elegir receptor, localizar su marcador, tirar el duelo de desmarque y aplicar +`bonusLibre` (libre) o −`penalizacionMarcado` (marcado) como desplazamiento del duelo del pase; guardar `marcadorId: number | null` y `libre: boolean` solo de forma transitoria en el plan del pase (data-model §6). Si el pase no sale, no se tira el desmarque
- [X] T053 [US4] Anotar `duelosDesmarque` y `recibidoLibre` (receptor; también recepción sin marcador cuenta como libre) y `marcajesGanados` (marcador) en `packages/engine/src/acciones/juego.ts`
- [X] T054 [US4] Añadir `015/SC-004` a `tools/balance/src/checks/motor015.ts`: A/B receptor +15 de desmarque (más `recibidoLibre` y más pases completados recibidos) y marcador +15 de marcaje (menos `recibidoLibre` del rival), las dos significativas

**Checkpoint**: desmarque probado por separado; `equivalencia014` en verde.

---

## Phase 8: User Story 5 - Técnica contra presión al controlar (Priority: P2) — tanda 2

**Goal**: el receptor marcado juega su técnica contra el quite del marcador; si pierde, pierde el balón (FR-014, R8).
Depende de US4 (decide quién recibe marcado).

**Independent Test**: serie A/B con +15 de técnica: `controlesPerdidos / controlesPresion` ≥ 15 % menor (SC-005).

### Tests for User Story 5

- [X] T055 [P] [US5] Añadir a `packages/engine/tests/desmarque.test.ts` la invariante M2.9: el control solo ocurre tras un pase completado a un receptor marcado; enfrenta `tecnica` contra el `quite` del marcador; si pierde, `perder()` con el marcador como recuperador; receptor libre o sin marcador → sin duelo; `tecnica` = DEF/MED técnica, DEL (regate + creatividad) / 2, POR distribución

### Implementation for User Story 5

- [X] T056 [US5] Añadir a `PARAMETROS_V8` en `packages/domain/src/parametros/index.ts` el bloque `controlPresion: { base: 1.0, m: 1 }`
- [X] T057 [US5] En `packages/engine/src/modificadores/atributos.ts`, con el bloque `controlPresion`: `tecnica` = POR distribución, DEF técnica, MED técnica, DEL (regate + creatividad) / 2
- [X] T058 [US5] Añadir a `packages/engine/src/acciones/desmarque.ts` la función pura del duelo de control (`tecnica` contra `quite`, con `base`/`m` del bloque) y llamarla en `packages/engine/src/acciones/juego.ts` tras un pase completado a un receptor marcado (reutilizando el `marcadorId` de T052); si pierde, `perder()` en la posición del receptor; anotar `controlesPresion` y `controlesPerdidos`. Sin tipo de acción nuevo
- [X] T059 [US5] Añadir `015/SC-005` a `tools/balance/src/checks/motor015.ts`: A/B +15 de técnica; `controlesPerdidos / controlesPresion` ≥ 15 % menor
- [X] T060 [US5] Ejecutar `pnpm --filter @fbd/engine test desmarque receptor equivalencia014`

---

## Phase 9: Cierre de la tanda 2

- [ ] T061 (abierta: 015/SC-004 y SC-005 ✔ y 135,9 pases; en rojo 002/SC-007a por 14,6 tiros, 003/SC-003 propia puerta 4,5 % y 003/SC-007 Matador por ruido; ver research.md, «Tanda 2») Ejecutar `pnpm balance --n 1000`; esperado: `015/SC-004`, `015/SC-005` ✔ y **002/SC-007a ≥ 130** pases completados (FR-020; 150 hasta el 2026-11-14). Si no llega, ajustar `bonusLibre` y `pesoEleccion` en `packages/domain/src/parametros/index.ts`; las de la tanda 1 siguen en verde
- [ ] T062 (abierta: ninguna pendiente se cumple, así que no sale ninguna; las tres nuevas en rojo esperan decisión) Actualizar `--pendientes` en `.github/workflows/ci.yml` con el resultado
- [X] T063 (la tanda 2 no añade coste; la 8.0.0 queda a +10,0 % de la 7.0.0) Medir con `pnpm --filter @fbd/balance umbral-motor` (≤ +10 % sobre T001); si se supera, calcular el marcador de cada candidato una sola vez por decisión de pase y reutilizarlo en el pase y el control (R11)

---

## Phase 10: User Story 6 - Liderazgo del defensa y del portero (Priority: P3) — tanda 3

**Goal**: el defensa líder ordena su línea y el portero líder mejora a los defensas cercanos (FR-015, FR-016, R9).

**Independent Test**: serie A/B con central de 95 contra 70 de liderazgo: `habilitaciones` ≥ 10 % menos; con portero
de 95 contra 70, los defensas cercanos ganan más duelos (SC-006).

### Tests for User Story 6

- [ ] T064 [P] [US6] Crear `packages/engine/tests/liderazgo.test.ts` (invariante M2.10): portero de 90 de liderazgo ⇒ +2,25 al atributo defensor de un DEF en zona ≤ `zonaMaxPortero`, +0 fuera; corrección del defensa = `min(maxCorreccion, kDefensa × (L − 70) / 25)`, 0 con L ≤ 70; con varios líderes a ≤ `radioDefensaM` cuenta el mayor (no se acumulan); el portero solo suma el suyo

### Implementation for User Story 6

- [ ] T065 [US6] Añadir a `PARAMETROS_V8` en `packages/domain/src/parametros/index.ts` el bloque `liderazgo: { radioDefensaM: 12, kDefensa: 0.5, maxCorreccion: 0.5, porcentajePortero: 0.025, zonaMaxPortero: 1 }`
- [ ] T066 [US6] En `packages/engine/src/modificadores/atributos.ts`, con el bloque: `liderazgo` = POR y DEF su stat, MED y DEL 0
- [ ] T067 [US6] Crear `packages/engine/src/modificadores/liderazgo.ts` con funciones puras `liderDeLinea(defensa, lineaDefensiva, params)` (mayor liderazgo entre los defensas de su línea a ≤ `radioDefensaM`, él incluido) y `bonusPortero(liderazgoPortero, zonaDefensa, params)`
- [ ] T068 [US6] En `packages/engine/src/espacio/objetivos.ts`, con el bloque: acercar el x objetivo de cada defensa al x de la línea (penúltimo defensor, como en `packages/engine/src/acciones/fueraDeJuego.ts`) en la fracción de `liderDeLinea`, en la misma pasada en que ya se calcula la línea (FR-015, FR-018)
- [ ] T069 [US6] En `ajusteDuelo` de `packages/engine/src/acciones/contexto.ts` (`aj.defensor`) y en los duelos aéreos de `packages/engine/src/acciones/tiro.ts`: sumar `bonusPortero` cuando defiende un DEF en las zonas 0..`zonaMaxPortero` de su equipo (FR-016)
- [ ] T070 [US6] Anotar `habilitaciones` al defensa rezagado cuando un pase al espacio habría sido fuera de juego con la línea de los demás defensas y su posición lo deja en juego, en `packages/engine/src/acciones/fueraDeJuego.ts` o `juego.ts` (R9)
- [ ] T071 [US6] Añadir `015/SC-006` a `tools/balance/src/checks/motor015.ts`: A/B central 95 contra 70 de liderazgo (`habilitaciones` ≥ 10 % menos) y portero 95 contra 70 (duelos ganados por los defensas cercanos, mayores)
- [ ] T072 [US6] Calibrar `radioDefensaM` (clarificación: distancia fija calibrada en la tanda 3) y ejecutar `pnpm --filter @fbd/engine test liderazgo equivalencia014`

---

## Phase 11: Polish & cierre de la tanda 3

- [ ] T073 Crear `packages/engine/tests/fixtures/generarHuella015.ts` (modelo `generarHuella014.ts`/`huella014.ts`, 100 partidos y 20 drafts con `PARAMETROS_V8`), generar `packages/engine/tests/fixtures/huella-015.json` y crear `packages/engine/tests/equivalencia015.test.ts`, que compruebe la huella y la igualdad entre la simulación rápida y la 2D (SC-010). `huella-014.json` no se regenera
- [ ] T074 Regenerar las referencias de equivalencia que usan `parametrosActuales()` (las que fijan `PARAMETROS_V7` se quedan), p. ej. con `packages/engine/tests/fixtures/regenerarEquivalencia005.ts` si depende de la versión actual
- [ ] T075 Ejecutar la serie final `pnpm balance --n 1000` sin `--pendientes`: todas en verde (SC-006, SC-007, SC-008), y quitar `--pendientes` (y su comentario) de `.github/workflows/ci.yml`
- [ ] T076 Medir con `pnpm --filter @fbd/balance umbral-motor`: ≤ 1,10 × T001 y bajo el umbral absoluto (SC-009)
- [ ] T077 [P] Actualizar a mano `docs/juego/enfrentamientos.md` a la 8.0.0: tabla carta → atributo (quite, marcaje, técnica, liderazgo), curvas de FR-002, los dos duelos nuevos, §5.1, §7 y §8 resueltas (FR-023)
- [ ] T078 [P] Regenerar `docs/juego/virtudes-y-defectos.md` con `pnpm --filter @fbd/domain rasgos:doc` (FR-023)
- [ ] T079 [P] Escribir el informe de cierre `specs/015-peso-individual-estadisticas/informe-8.0.0.md` (modelo `specs/014-mejoras-motor-navegacion-refactor/informe-7.0.0.md`) con los valores finales de los parámetros y el resultado de la serie
- [ ] T080 Actualizar el estado de la spec 015 en `ROADMAP.md` y la línea «Especificación en curso» de `CLAUDE.md`
- [ ] T081 Ejecutar `pnpm -r test && pnpm -r typecheck` y la guía de `specs/015-peso-individual-estadisticas/quickstart.md` (pasos 1 a 5); después, `graphify update .`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup; bloquea todas las historias.
- **Tanda 1**: US1 (Phase 3) → US2 (Phase 4) y US3 (Phase 5) → cierre (Phase 6).
- **Tanda 2**: depende del cierre de la tanda 1. US4 (Phase 7) → US5 (Phase 8) → cierre (Phase 9).
- **Tanda 3**: depende del cierre de la tanda 2. US6 (Phase 10) → Polish (Phase 11).

### User Story Dependencies

- **US1 (P1)**: tras Foundational. Las demás historias se calibran sobre sus curvas.
- **US2 (P1)**: tras Foundational; usa el bloque `duelos` de T014 como interruptor (R4). Independiente de US1 en código.
- **US3 (P2)**: tras Foundational; independiente de US1 y US2 en código (catálogo + `tiro.ts`).
- **US4 (P2)**: tras el cierre de la tanda 1.
- **US5 (P2)**: depende de US4 (reutiliza el marcador y `libre`).
- **US6 (P3)**: tras el cierre de la tanda 2.

### Within Each User Story

- Tests primero (deben fallar), luego parámetros, atributos, motor e informe.
- Varias tareas editan `packages/domain/src/parametros/index.ts`, `atributos.ts`, `juego.ts` y `motor015.ts`: esas no
  son paralelas entre sí.
- `equivalencia014` en verde al acabar cada historia.

### Parallel Opportunities

- T002 con T001.
- T005 con T006–T009 (otro paquete).
- Tests de una historia entre sí (T011–T013; T027–T030; T046–T047).
- US3 en catálogo (T028–T036) en paralelo con US1/US2 en el motor.
- Documentación del cierre (T077–T079).

---

## Parallel Example: User Story 1

```text
Task: "T011 Crear packages/engine/tests/curvas015.test.ts"
Task: "T012 Crear packages/engine/tests/quite015.test.ts"
```

## Parallel Example: User Story 3

```text
Task: "T027 Crear packages/engine/tests/cabeceador015.test.ts"
Task: "T028 Ampliar packages/domain/tests/catalogo/validar.test.ts"
Task: "T029 Ampliar packages/domain/tests/catalogo/versionCatalogo.test.ts"
Task: "T030 Ampliar packages/domain/tests/catalogo/rasgos.test.ts"
```

---

## Implementation Strategy

### MVP (solo US1)

1. Phase 1 y Phase 2.
2. Phase 3 (US1): curvas y quite.
3. **Parar y validar**: `pnpm balance --solo 015/SC-001` y los tests de quite. Ya resuelve 014/SC-008-pase, -remate y
   -fisico como curvas.

### Entrega incremental

1. Tanda 1 (US1 + US2 + US3) → serie de 1.000 → T043–T045.
2. Tanda 2 (US4 + US5) → serie de 1.000 → 150 pases completados.
3. Tanda 3 (US6) → serie final sin pendientes → huella 015 y documentos.

No se publica ninguna versión intermedia: `PARAMETROS_V8` se edita en el sitio entre tandas.

---

## Notes

- [P] = otro fichero y sin dependencias pendientes.
- Cada serie de 1.000 dura ~105 min: entre tandas, usar `sonda015.ts` y `--solo`.
- La persona puede ajustar cartas a mano en la base de datos; si cambia `data/core-real.json` antes del cierre, repetir
  la última serie con él.
