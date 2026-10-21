---

description: "Lista de tareas de virtudes, defectos y el modo Duelo de jugadores de Fútboosterdraft"
---

# Tasks: Virtudes, defectos y nuevo modo de juego

**Input**: Documentos de diseño en `/specs/005-virtudes-defectos/`: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md).

**Tests**: SE INCLUYEN. El Principio IX de la constitución exige pruebas en todo cambio de reglas del dominio, y research R13 y quickstart.md asignan una comprobación a cada SC. En cada historia, las pruebas se escriben **antes** que la implementación y deben fallar primero. La única excepción es US1, que es un renombrado: allí las pruebas son de equivalencia y de búsqueda.

**Organization**: tareas agrupadas por historia de usuario.

- Gestor de paquetes: **pnpm**, siempre ([CLAUDE.md](../../CLAUDE.md)). Nunca npm, yarn ni bun.
- Identificadores y datos sin tildes; las tildes, solo en los textos que se muestran.
- Los agentes **no ejecutan `git commit` ni `git push`** (constitución). Al cerrar cada fase, sugieren el commit con el comando listo para copiar.
- Tras modificar código, `graphify update .` (CLAUDE.md).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede ejecutar en paralelo (ficheros distintos, sin dependencias pendientes).
- **[Story]**: historia a la que pertenece (US1 a US6, ver spec.md).
- Todas las rutas son relativas a la raíz del repositorio.

## Path Conventions (monorepo de las specs 001 a 004)

- **Reglas puras**: `packages/domain/src/`, `packages/engine/src/` y `packages/ai/src/`. Sus pruebas van en `packages/<paquete>/tests/`.
- **Contratos compartidos**: `packages/protocol/src/` y `packages/protocol/schemas/`.
- **Servidor**: `apps/server/src/`. Pruebas en `apps/server/tests/{unit,integration}/` y migraciones en `apps/server/drizzle/`, con su `meta/_journal.json`.
- **Cliente**: `apps/web/src/`. Pruebas en `apps/web/tests/unit/` y `apps/web/tests/e2e/`.
- **Herramientas**: `tools/balance/` y `tools/fixtures/`.
- **Prohibido en `packages/domain`, `packages/engine` y `packages/ai`**: `Math.random`, `Date` y E/S. Todo azar sale de `Rng` con semilla.

## Orden especial de esta spec

US1 (renombrado) se ejecuta **antes** de la fase fundacional: el resto de fases ya escribe con el vocabulario nuevo y no conviene construir sobre `specials`. Las demás historias siguen el orden de la spec.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: congelar la línea base del commit `5007f5a` antes de tocar nada, para las pruebas de equivalencia (SC-003) y de cartas antiguas (FR-036).

- [ ] T001 Generar la fixture de eventos de referencia con parámetros 3.0.0: 20 semillas fijas, equipos sintéticos y Core, y la secuencia de eventos de cada partido (solo `tipo`, `tick`, `equipo` y los ids de los participantes). Guardarla en `packages/engine/tests/fixtures/equivalencia-005.json` con un script de una sola ejecución en `packages/engine/tests/fixtures/generarEquivalencia005.ts`.
- [ ] T002 [P] Copiar `data/core.json` del commit base a `packages/domain/tests/fixtures/core-004.json` (cartas antes de la spec 005) para la prueba de `cartaEnVersion` (research R4).
- [ ] T003 [P] Crear una base de datos de prueba con una partida de la 004 en torneo y partidos jugados (`apps/server/tests/helpers/baseDatos004.ts`). Se usa en las pruebas de migración (SC-002, FR-036).

---

## Phase 2: User Story 1 — Las habilidades se llaman «virtudes» en todo el juego (Priority: P1) 🎯 MVP

**Goal**: sustituir «special» por «virtud» en todo el producto sin cambiar ningún comportamiento (FR-001 a FR-005).

**Independent Test**: `pnpm test` (búsqueda de `special` y equivalencia) y el recorrido A de [quickstart.md](./quickstart.md).

### Tests for User Story 1

- [ ] T004 [P] [US1] Prueba de búsqueda en `packages/domain/tests/sinSpecials.test.ts`. Recorre `apps/`, `packages/`, `tools/`, `data/`, `docs/`, `specs/`, `README.md` y `CLAUDE.md` y falla si encuentra `/special/i`. Excepciones: `apps/server/drizzle/0000_base.sql`, `apps/server/drizzle/meta/000*_snapshot.json`, `graphify-out/`, `node_modules/` y este propio fichero de prueba (SC-001, FR-002).
- [ ] T005 [P] [US1] Prueba de equivalencia en `packages/engine/tests/equivalencia005.test.ts`: con parámetros 3.0.0, las 20 semillas de T001 producen exactamente la secuencia de la fixture (SC-003, FR-004).
- [ ] T006 [P] [US1] Prueba de integración de la migración en `apps/server/tests/integration/migracion-0010.test.ts`. Sobre la base de T003:
  - `jugadores.virtudes` conserva los mismos valores que tenía `specials`;
  - `partidos.entrada` ya no contiene `"specials":` y sus cartas tienen `virtudes`;
  - la reproducción de un partido 3.0.0 sigue funcionando (SC-002).

### Implementation for User Story 1

- [ ] T007 [US1] Renombrar en `packages/domain/src/catalogo/tipos.ts`:

  | Antes | Después |
  |---|---|
  | `MAX_SPECIALS` | `MAX_VIRTUDES` |
  | `SPECIALS_GENERICOS`, `_POR`, `_DEF`, `_MED`, `_DEL` | `VIRTUDES_GENERICAS`, `_POR`, `_DEF`, `_MED`, `_DEL` |
  | `SpecialGenerico`, `SpecialPOR`… | `VirtudGenerica`, `VirtudPOR`… |
  | `Special` | `Virtud` |
  | `SPECIALS_POR_DEMARCACION` | `VIRTUDES_POR_DEMARCACION` |
  | `TODOS_LOS_SPECIALS` | `TODAS_LAS_VIRTUDES` |
  | `Jugador.specials` | `Jugador.virtudes` |
  | `specialsPermitidos` | `virtudesPermitidas` |

  Actualizar las exportaciones en `packages/domain/src/index.ts`.
- [ ] T008 [US1] Renombrar en `packages/domain/src/catalogo/validar.ts` los códigos `special_desconocido`, `specials_repetidos`, `specials_maximo` y `special_no_permitido` a `virtud_desconocida`, `virtudes_repetidas`, `virtudes_maximo` y `virtud_no_permitida`, así como sus mensajes. Actualizar `packages/domain/tests/catalogo/validar.test.ts`.
- [ ] T009 [US1] Renombrar la sección `specials` a `virtudes` en `packages/domain/src/parametros/v1.json`, `v2.json`, `v3.json` y en el tipo de `packages/domain/src/parametros/index.ts`, sin cambiar ningún valor ni el campo `version`. Actualizar `packages/domain/tests/parametros/parametros.test.ts`.
- [ ] T010 [P] [US1] Renombrar el resto del dominio que usa specials: `packages/domain/src/equipo/statsEfectivos.ts`, `packages/domain/src/equipo/lanzadores.ts` y `packages/domain/tests/equipo/{ayudas.ts,lanzadores.test.ts}`.
- [ ] T011 [US1] Mover `packages/engine/src/modificadores/specials.ts` a `packages/engine/src/modificadores/virtudes.ts`. Renombrar `estado.parametros.specials` a `estado.parametros.virtudes`, el comentario de inventario («Specials» → «Virtudes») y todos los imports en `packages/engine/src/{acciones/*.ts,espacio/*.ts,penaltis/tanda.ts,modificadores/*.ts}`.
- [ ] T012 [P] [US1] Renombrar en las pruebas del motor (`packages/engine/tests/{ayudas.ts,reglas.test.ts,penaltis.test.ts,cinematica.test.ts}`) y de la IA (`packages/ai/src/{evaluador.ts,errores.ts}` y `packages/ai/tests/{ayudas.ts,evaluador.test.ts}`), por ejemplo `SPECIALS_EQUIPO` → `VIRTUDES_EQUIPO`.
- [ ] T013 [P] [US1] Renombrar `specials` a `virtudes` en el esquema `packages/protocol/schemas/player-data.schema.json` y en `packages/protocol/src/ws/draft.ts`. Sustituir `specs/001-draft-manager-mvp/contracts/player-data.schema.json` por un `README` que enlace al esquema de `packages/protocol`.
- [ ] T014 [US1] Renombrar la clave `specials` a `virtudes` en las 300 cartas de `data/core.json` y en los generadores `tools/fixtures/src/{generarCore.ts,escenarios.ts,generarEscenarios.ts}`. Regenerar los escenarios si se derivan de ahí.
- [ ] T015 [P] [US1] Renombrar en `tools/balance/src/{equipos.ts,checks/partido.ts,checks/partido003.ts}`, por ejemplo `jugadorSintetico(…, specials)` → `jugadorSintetico(…, virtudes)`.
- [ ] T016 [US1] Crear la migración `apps/server/drizzle/0010_virtudes_defectos.sql` (solo la parte de US1 por ahora):

  ```sql
  ALTER TABLE jugadores RENAME COLUMN specials TO virtudes;
  UPDATE partidos SET entrada = replace(entrada::text, '"specials":', '"virtudes":')::jsonb
  WHERE entrada::text LIKE '%"specials":%';
  ```

  Comprobar con `grep` sobre `apps/server/src/persistencia/esquema/` que ninguna otra columna `jsonb` guarda cartas. Actualizar `apps/server/drizzle/meta/_journal.json` y `apps/server/src/persistencia/esquema/base.ts` (`virtudes: text('virtudes').array().notNull()`).
- [ ] T017 [US1] Renombrar en el servidor:
  - `apps/server/src/http/textosSpecials.ts` → `apps/server/src/http/textosRasgos.ts`, con `TEXTOS_SPECIALS` → `TEXTOS_VIRTUDES` (se sustituirá por la tabla de rasgos en T024);
  - la ruta `GET /api/catalogo/specials` → `GET /api/catalogo/rasgos` en `apps/server/src/http/catalogo.ts`, con forma provisional `{ virtudes: TextoRasgo[], defectos: [] }` ([contracts/http-api.md](./contracts/http-api.md));
  - `apps/server/src/persistencia/{seed.ts,repos/catalogo.ts}`;
  - `apps/server/tests/unit/{app.test.ts,loteDecisiones.test.ts}`.
- [ ] T018 [US1] Renombrar en el cliente:
  - `apps/web/src/estado/catalogo.ts` (consume `/api/catalogo/rasgos`);
  - `apps/web/src/componentes/{CartaJugador.tsx,AperturaSobre.tsx}`: componente `Specials()` → `Virtudes()`, clases `carta-special*` → `carta-virtud*`;
  - `apps/web/src/estilos/cartas.css`;
  - `apps/web/src/textos/cartasMuestra.ts`;
  - `apps/web/src/pantallas/PruebasCartas.tsx`, texto «Los cuatro niveles y un GOAT con 4 virtudes»;
  - `apps/web/src/sonido/sonido.ts`.
- [ ] T019 [P] [US1] Renombrar en las pruebas del cliente: `apps/web/tests/unit/{aperturaSobre.test.ts,estadoEquipoEnPartido.test.ts,campoEquipoEstado.test.ts}` y `apps/web/tests/e2e/{cartas.spec.ts,alineacion.spec.ts,diseno/ronda4.spec.ts}`.
- [ ] T020 [US1] Renombrar en la documentación vigente: `README.md` («habilidades especiales» → «virtudes y defectos») y las menciones de specials en `specs/001-…`, `specs/002-…`, `specs/003-…` y `specs/004-…` (`spec.md`, `plan.md`, `research.md`, `tasks.md`, `data-model.md`, `quickstart.md`, `contracts/*.md` y `checklists/*.md`), que pasan a decir «virtud» o «virtudes» sin cambiar las decisiones. Las listas duplicadas se sustituyen por enlaces en T100.
- [ ] T021 [US1] Ejecutar `pnpm -r typecheck`, `pnpm test`, `pnpm test:equivalence`, `pnpm test:integration` y `pnpm balance --n 200`: todo en verde y con los mismos valores de `balance` que antes. Ejecutar `graphify update .`.

**Checkpoint**: el producto entero habla de virtudes y se comporta exactamente igual. Sugerir el commit de US1.

---

## Phase 3: Foundational (Blocking Prerequisites)

**Purpose**: la tabla de rasgos, los tipos de defecto, la migración completa y los parámetros 4.0.0 con secciones neutras. Lo necesitan US2 a US6.

**⚠️ CRITICAL**: ninguna de las historias US2 a US6 empieza antes de terminar esta fase.

- [ ] T022 Añadir en `packages/domain/src/catalogo/tipos.ts`:
  - `DEFECTOS = ['Agresivo','Impulsivo','Fragil','Fatigado','Polemico','Indisciplinado','Canchero','Rebelde','Torpe','Provocador','DeCristal','Estrellita','Chupon','Inflexible','MalDefensor'] as const` y el tipo `Defecto`;
  - `MAX_DEFECTOS = 2`;
  - las virtudes genéricas `DeAcero`, `Versatil`, `FairPlayer` y `Revulsivo` en `VIRTUDES_GENERICAS`;
  - `Jugador.defectos: Defecto[]`;
  - el tipo `Rasgo = Virtud | Defecto`.

  Actualizar `packages/protocol/schemas/player-data.schema.json`: `defectos`, un array de enum de 0 a 2 elementos, únicos.
- [ ] T023 Crear `packages/domain/src/catalogo/rasgos.ts` con `DefinicionRasgo` y `RASGOS: Readonly<Record<Rasgo, DefinicionRasgo>>` para los 54 rasgos. Valores de [contracts/rasgos.md](./contracts/rasgos.md):
  - `tipo`, `ambito`, `nombre` y `descripcion`. Los textos de las 35 virtudes existentes se toman de `apps/server/src/http/textosRasgos.ts` sin cambios;
  - `efecto`, `activacion`, `acumulacion`, `incompatibles` e `impacto` (0..1, dos decimales).

  Exportar `rasgo(id)`, `esVirtud`, `esDefecto` y `REPARTO_DEFECTOS` con estos valores por nivel (`conDos`, dentro de las que tienen defecto):

  | Nivel | `conDefecto` | `conDos` |
  |---|---|---|
  | Superclase | 0,15 | 0 |
  | Epico | 0,25 | 0,20 |
  | Legendario | 0,35 | 0,30 |
  | GOAT | 0,50 | 0,40 |
- [ ] T024 [P] Prueba `packages/domain/tests/catalogo/rasgos.test.ts`:
  - los 54 rasgos tienen todos sus campos no vacíos;
  - `impacto ∈ [0,1]`;
  - las incompatibilidades son simétricas;
  - `TODAS_LAS_VIRTUDES` y `DEFECTOS` coinciden con las claves de `RASGOS` por tipo.
- [ ] T025 Sustituir el contenido de `apps/server/src/http/textosRasgos.ts` por una lectura de `RASGOS`. `GET /api/catalogo/rasgos` devuelve `{ virtudes, defectos }` con `{ id, nombre, descripcion, ambito, impacto }`.
- [ ] T026 Ampliar `packages/domain/src/catalogo/validar.ts` con estos códigos: `defecto_desconocido`, `defectos_repetidos`, `defectos_maximo` («Como máximo 2 defectos») y `rasgos_incompatibles` (alguna pareja de `incompatibles` en la misma carta). Añadir el aviso de colección `reparto_defectos` (la proporción con defectos no crece con el nivel, con tolerancia de ±5 puntos). Pruebas en `packages/domain/tests/catalogo/validar.test.ts`.
- [ ] T027 Crear `packages/domain/src/catalogo/versionCatalogo.ts`:
  - `VERSION_CATALOGO_ACTUAL = 2`;
  - `cartaEnVersion(jugador, version)`: con la versión 1 devuelve `defectos: []` y quita `DeAcero`, `Versatil`, `FairPlayer` y `Revulsivo` de `virtudes`; con la 2, la carta tal cual.

  Prueba en `packages/domain/tests/catalogo/versionCatalogo.test.ts` (la comparación con `core-004.json` se completa en T050).
- [ ] T028 Completar `apps/server/drizzle/0010_virtudes_defectos.sql`:
  - `jugadores`: `ADD COLUMN defectos text[] NOT NULL DEFAULT '{}'`;
  - `partidos`: `ADD COLUMN tipo text NOT NULL DEFAULT 'futbol'` con `CHECK (tipo IN ('futbol','duelos'))`, y `ADD COLUMN duelos jsonb`;
  - `partidas`: `ADD COLUMN version_catalogo integer NOT NULL DEFAULT 1` y `ADD COLUMN config_duelos jsonb`; recrear `partidas_modo_ck` con `'duelos'` y `partidas_num_participantes_ck` añadiendo `(modo = 'duelos' AND num_participantes IN (4, 8, 16))`;
  - `alineaciones`: `ADD COLUMN bloqueada boolean NOT NULL DEFAULT false`.

  Reflejarlo en `apps/server/src/persistencia/esquema/{base.ts,partido.ts,equipo.ts}`.
- [ ] T029 Hacer que `apps/server/src/persistencia/seed.ts` y `apps/server/src/persistencia/repos/catalogo.ts` lean y escriban `defectos`. Las partidas nuevas se crean con `version_catalogo = VERSION_CATALOGO_ACTUAL` en `apps/server/src/actores/sala.ts` (o donde se inserte la partida).
- [ ] T030 Hacer que la carga de cartas de una partida pase por `cartaEnVersion(jugador, partida.versionCatalogo)` en todos los puntos donde el servidor construye cartas o equipos: plantillas, draft, preparación, partidos y vistas (`apps/server/src/actores/{draft.ts,preparacion.ts,equipo.ts,partidoRapido.ts,partidoEntreHumanos.ts,partido2d.ts,vistas.ts}`). `GET /api/catalogo/jugadores` acepta `?version=1`.
- [ ] T031 Ampliar el tipo `ParametrosEquilibrado` en `packages/domain/src/parametros/index.ts` con las secciones opcionales `defectos`, `duelos`, `virtudes.revulsivo`, `virtudes.versatil` y `disciplina.factorFaltaArea`. Añadir el accesor `parametrosEfectivos(p)`, que rellena valores neutros (multiplicadores 1, sumandos 0, `factorFaltaArea` 1, `duelos` `{1,1,2}`). Crear `packages/domain/src/parametros/v4.json` (versión `4.0.0`), por ahora con las mismas magnitudes de partido que 3.0.0 más las secciones nuevas de [contracts/engine-api.md](./contracts/engine-api.md). `parametrosActuales()` devuelve la 4.0.0 y `VERSION_MAYOR_SOPORTADA` sigue en 3.
- [ ] T032 [P] Pruebas en `packages/domain/tests/parametros/parametros.test.ts`:
  - v1 a v3 se cargan con las secciones nuevas neutras;
  - v4 las trae completas;
  - `parametrosPorVersion('3.0.0')` no cambia ningún valor anterior.
- [ ] T033 Crear `packages/engine/src/modificadores/defectos.ts` con las funciones de [contracts/engine-api.md](./contracts/engine-api.md). Por ahora todas devuelven el valor neutro, para que el motor compile con los enganches vacíos. Extender `tiene(j, r)` en `packages/engine/src/modificadores/virtudes.ts` a `Rasgo`, mirando `virtudes` o `defectos` según el tipo.
- [ ] T034 [P] Crear el registro `RASGOS_PROBADOS` en `packages/engine/tests/rasgosProbados.ts` (rasgo → prueba de unidad y comprobación de `balance`) y la prueba `packages/engine/tests/rasgosProbados.test.ts`, que falla si un rasgo de `RASGOS` no está registrado (FR-055). Registrar las 35 virtudes existentes con sus pruebas actuales. Los rasgos nuevos se registran en sus historias.
- [ ] T035 Comprobar que T005 (equivalencia con 3.0.0) sigue en verde con la nueva infraestructura. Ejecutar `graphify update .`.

**Checkpoint**: la base está lista. Desde aquí, las historias US2 a US6 pueden avanzar en paralelo.

---

## Phase 4: User Story 2 — Los jugadores pueden tener defectos que les perjudican en el partido (Priority: P1)

**Goal**: los 15 defectos aplicados en el motor, repartidos en Core, visibles en rojo en las cartas y tenidos en cuenta por la IA (FR-010 a FR-024, FR-040 a FR-044).

**Independent Test**: las pruebas de unidad de cada defecto, la comprobación `balance --solo 005/rasgos` y los recorridos B y F de [quickstart.md](./quickstart.md).

### Tests for User Story 2

- [ ] T036 [P] [US2] Pruebas de disciplina en `packages/engine/tests/defectosDisciplina.test.ts`, con semillas fijas y probabilidades forzadas en los parámetros:
  - Canchero multiplica la probabilidad de falta por `defectos.canchero`;
  - Impulsivo multiplica la de amarilla por 2;
  - Agresivo multiplica la de roja directa por 2.
- [ ] T037 [P] [US2] Pruebas de lesiones y cansancio en `packages/engine/tests/defectosFisicos.test.ts`:
  - Frágil multiplica la probabilidad de lesión por 3;
  - De cristal siempre da gravedad `larga`;
  - Fatigado empieza a cansarse en el minuto 46, aunque el inicio general sea 65;
  - Indisciplinado acumula 1,5 veces el cansancio.
- [ ] T038 [P] [US2] Pruebas de juego en `packages/engine/tests/defectosJuego.test.ts`:
  - Torpe multiplica por 2 la probabilidad de autogol en `despejeEnPropia` y en el desvío;
  - Chupón multiplica por 0,5 el peso de «pase» en `opciones.ts`;
  - Mal defensor multiplica por 0,5 su peso como candidato defensivo y aun así defiende si es el único candidato;
  - un portero Chupón o Mal defensor conserva sus acciones de portero.
- [ ] T039 [P] [US2] Pruebas de medias en `packages/engine/tests/defectosMedia.test.ts`:
  - **Polémico**: × 0,95 a todo el once solo yendo por detrás; se recupera al empatar; dos Polémicos no acumulan;
  - **Rebelde**: × 0,95 mientras está convocado en el banquillo; no se aplica si está retirado, expulsado, lesionado o no convocado; desaparece al entrar;
  - **Estrellita**: × 0,90 si no es la mejor media efectiva (sin su propio efecto); con empate, no se aplica; con dos Estrellitas, solo se libra la mejor;
  - **Provocador**: +1 a cada GOAT rival en el campo, una sola vez por equipo;
  - Polémico y Rebelde juntos multiplican (0,95 × 0,95).
- [ ] T040 [P] [US2] Prueba de `penalizacionPorPosicion` con Inflexible (+0,05 si la penalización es > 0 y 0 en posición válida) en `packages/domain/tests/equipo/statsEfectivos.test.ts`.
- [ ] T041 [P] [US2] Prueba del evento `malestar` en `packages/engine/tests/malestar.test.ts`: se emite al activarse y al desactivarse Polémico o Rebelde, con `{ defecto, activo, jugadorId }`, y no se repite si el estado no cambia (FR-044).
- [ ] T042 [P] [US2] Prueba de equivalencia de modalidades con defectos en juego en `packages/engine/tests/equivalencia.test.ts`: rápida = 2D con equipos que tienen los 15 defectos (FR-041).
- [ ] T043 [P] [US2] Comprobación `balance` `tools/balance/src/checks/rasgos.ts` (primera parte, defectos). Serie A/B por defecto: el mismo equipo con y sin el defecto en un jugador. Mide su métrica (rojas directas por falta, amarillas por falta, lesiones, minuto de inicio del cansancio, media efectiva del equipo, autogoles, pases intentados y acciones defensivas) y la compara con la magnitud objetivo ±20 %, con el id `005/SC-004/<Defecto>`. Registrar en `tools/balance/src/cli.ts` y en el informe HTML.
- [ ] T044 [P] [US2] Prueba e2e `apps/web/tests/e2e/defectos.spec.ts`:
  - en «Pruebas de cartas», el GOAT con 4 virtudes y 2 defectos muestra las dos filas completas, los defectos en rojo con el icono y mide lo mismo que la carta sin rasgos;
  - en el draft, pulsar un defecto abre «Defecto · …» y no elige la carta (SC-006, FR-024).

### Implementation for User Story 2

- [ ] T045 [US2] Implementar en `packages/engine/src/modificadores/defectos.ts`: `factorFalta`, `factorAmarilla`, `factorRoja`, `factorLesion`, `gravedadForzada`, `factorAutogol`, `factorPase`, `factorDefensivo`, `multiplicadorEquipo` (Polémico, Rebelde), `multiplicadorIndividual` (Estrellita, más Revulsivo en US5), `bonusProvocador` y `actualizarMalestar`. Reglas en research R6 y parámetros en `parametrosEfectivos(p).defectos`.
- [ ] T046 [US2] Enganchar los defectos en el motor:
  - `packages/engine/src/acciones/balonParado.ts`: Canchero, Impulsivo y Agresivo;
  - `packages/engine/src/acciones/lesiones.ts`: Frágil y De cristal;
  - `packages/engine/src/modificadores/cansancio.ts`: Fatigado (inicio = min(inicio general, inicio de la 2.ª parte)) e Indisciplinado;
  - `packages/engine/src/acciones/tiro.ts`: Torpe;
  - `packages/engine/src/acciones/opciones.ts`: Chupón;
  - `packages/engine/src/acciones/juego.ts`: Mal defensor en la elección del defensor, la presión y la cobertura.
- [ ] T047 [US2] Aplicar los multiplicadores y el bono de Provocador en el cálculo de stats efectivos del motor, en el orden de research R6: base → posición → cansancio → bonificaciones en puntos → multiplicadores → redondeo. Llamar a `actualizarMalestar` en cada tramo y emitir el evento `malestar` (nuevo `TipoEvento` en `packages/engine/src/tipos.ts` y `estado.malestar` en `packages/engine/src/estado/estado.ts`).
- [ ] T048 [US2] Añadir Inflexible en `penalizacionPorPosicion` (`packages/domain/src/equipo/statsEfectivos.ts`): `+ inflexible` solo si la penalización es > 0.
- [ ] T049 [US2] Crear `tools/fixtures/src/asignarRasgos.ts` y el script `asignar-rasgos` en `tools/fixtures/package.json`. Hace una pasada determinista (semilla `rasgos-005`) sobre `data/core.json`:
  - asigna defectos según `REPARTO_DEFECTOS`, con los pesos por demarcación y nivel de research R5;
  - vuelve a sortear si hay incompatibilidades;
  - no toca ids, nombres, stats, medias ni virtudes existentes.

  Ejecutarla y guardar `data/core.json`.
- [ ] T050 [US2] Completar `packages/domain/tests/catalogo/versionCatalogo.test.ts`: para las 300 cartas, `cartaEnVersion(nueva, 1)` es igual a la carta de `packages/domain/tests/fixtures/core-004.json`, con `virtudes` en lugar de `specials` y `defectos: []`. Añadir a `packages/domain/tests/catalogo/validar.test.ts` la validación de `data/core.json`: ninguna carta con más de 2 defectos, sin incompatibilidades y proporción creciente con el nivel (SC-008).
- [ ] T051 [US2] Mostrar los defectos en `apps/web/src/componentes/CartaJugador.tsx`:
  - fila `carta-virtudes` y debajo fila `carta-defectos`, con su altura reservada aunque no haya defectos (FR-022);
  - botón `carta-defecto` con el icono `defecto` y la descripción «Defecto · {nombre}». Las virtudes pasan a «Virtud · {nombre}»;
  - el clic en un rasgo no propaga la elección de la carta (FR-024).

  Estilos en `apps/web/src/estilos/cartas.css` con el token `--color-defecto`.
- [ ] T052 [US2] Añadir el token `--color-defecto` (rojo de juego, contraste ≥ 4,5:1 sobre la carta, distinto de `--color-error`) en la hoja de tokens de `apps/web/src/estilos/` y en `apps/web/tests/unit/tokens.test.ts`. Documentarlo en `docs/diseno/DESIGN.md` como excepción de color de información de juego (004/FR-003). Añadir el icono `defecto` en `apps/web/src/componentes/Icono.tsx`.
- [ ] T053 [US2] Propagar los defectos a `apps/web/src/componentes/{VistaCarta.tsx,FichaJugador.tsx,AperturaSobre.tsx,CartaMesa.tsx,CampoEquipo.tsx,GestionEquipo.tsx}` y `apps/web/src/estado/catalogo.ts`, que carga `defectos` desde `/api/catalogo/rasgos`. Añadir los casos «GOAT con 4 virtudes y 2 defectos» y «Superclase sin rasgos» en `apps/web/src/pantallas/PruebasCartas.tsx` y `apps/web/src/textos/cartasMuestra.ts`.
- [ ] T054 [US2] Mostrar el malestar en `apps/web/src/componentes/ResumenEventos.tsx` («Malestar en el equipo: {jugador} ({defecto})» / «Se acaba el malestar», con icono informativo) y como aviso de la banda superior en `apps/web/src/pantallas/Partido2D.tsx`. Prueba en `apps/web/tests/unit/resumenEventos.test.ts`.
- [ ] T055 [US2] IA en `packages/ai/src/evaluador.ts`: el valor de la carta suma `k × Σ impacto(virtud)` y resta `k × Σ (1 − impacto(defecto))`, con `k` por perfil de NPC en `packages/ai/src/perfiles.ts` (los niveles bajos lo ponderan menos). Pruebas en `packages/ai/tests/evaluador.test.ts`.
- [ ] T056 [US2] IA en `packages/ai/src/alineacion.ts` y `packages/ai/src/partido.ts`:
  - no convocar a un Rebelde que no sea titular;
  - evitar a un Estrellita titular si no es la mejor media, salvo que siga siendo la mejor opción del puesto;
  - sustituir antes a Fatigado e Indisciplinado.

  Pruebas en `packages/ai/tests/` (nuevo fichero `rasgos.test.ts`).
- [ ] T057 [US2] Registrar los 15 defectos en `packages/engine/tests/rasgosProbados.ts`.

**Checkpoint**: los defectos existen, se ven y se notan en los partidos. Sugerir el commit de US2.

---

## Phase 5: User Story 3 — Jugar un torneo en el modo «Duelo de jugadores» (Priority: P1)

**Goal**: modo `duelos` completo: configuración del anfitrión, once bloqueado, resolución en el servidor y pantalla animada (FR-060 a FR-069).

**Independent Test**: la integración del torneo de duelos de 4, `balance --solo 005/SC-010` y el recorrido D de [quickstart.md](./quickstart.md).

### Tests for User Story 3

- [ ] T058 [P] [US3] Pruebas de dominio en `packages/domain/tests/duelos/resolver.test.ts`, según los invariantes de [data-model.md §6.3](./data-model.md):
  - 11 duelos, uno por casilla, y `ganados.local + ganados.visitante + nulos = 11`;
  - `estadoForma = false` ⇒ `forma = 0`; `estadoForma = true` ⇒ `|forma| ≤ 200`;
  - con el Estado de forma activado, una diferencia de más de 400 centésimas nunca se remonta;
  - la misma semilla da el mismo JSON;
  - desempates en orden `duelos` → `suma` → `sorteo`;
  - `bonusVirtudes = round(100 × Σ impacto)` y `malusDefectos = round(100 × Σ (1 − impacto))`;
  - errores `CASILLAS_INCOMPLETAS` y `JUGADOR_REPETIDO`.
- [ ] T059 [P] [US3] Pruebas de partida en `packages/domain/tests/partida/partida.test.ts`:
  - `numParticipantesValido('duelos', n)` solo admite 4, 8 y 16;
  - `ConfigDuelos` por defecto es `{ formacion: '4-3-3', estadoForma: true }`.
- [ ] T060 [P] [US3] Prueba de integración `apps/server/tests/integration/duelos.test.ts`:
  - `PUT /api/partidas/:id/duelos`: `403 SOLO_ANFITRION`, `409 MODO_NO_DUELOS`, `409 CONFIG_FIJADA` tras empezar, `400 CONFIG_INVALIDA` e idempotencia;
  - `sala.actualizada` con `duelos`;
  - alineación: `400 FORMACION_FIJA`, `409 ALINEACION_BLOQUEADA` en la segunda confirmación, `suplentes = []` y dorsales no exigidos;
  - `PUT /dorsales` y `PUT /equipaciones` responden `409 NO_DISPONIBLE_EN_MODO`;
  - torneo de 4 completo (1 humano y 3 NPC):
    - semifinales resueltas al abrir la ronda, con `tipo = 'duelos'`;
    - `GET /api/partidos/:id` oculta `duelos` y `marcador` mientras el visionado está pendiente;
    - `abrir` devuelve el `ResultadoCruce`;
    - `POST /api/partidos/:id/visto` es idempotente;
    - avanza el cuadro, llega la final y se proclama campeón;
    - no hay bajas ni amarillas acumuladas.
- [ ] T061 [P] [US3] Comprobación `balance` `tools/balance/src/checks/duelos.ts` (`005/SC-010`):
  - 1.000 cruces entre onces de NPC draftados sobre Core, con el Estado de forma activado y desactivado;
  - duelos nulos < 2 %;
  - victorias del equipo con mayor suma de medias entre el 60 % y el 85 %;
  - 0 remontadas de más de 4 puntos;
  - con la opción desactivada, 0 victorias del jugador de menor puntuación.

  Registrar en `tools/balance/src/cli.ts`.
- [ ] T062 [P] [US3] Prueba e2e `apps/web/tests/e2e/duelos.spec.ts`:
  1. crear un torneo «Duelo de jugadores» de 4 con el icono visible;
  2. en la sala, ver el 4-3-3 y el «Estado de forma» activado y cambiarlos (como anfitrión);
  3. completar el draft;
  4. en «Formación», no hay táctica, dorsales, equipación ni banquillo;
  5. confirmar el once con su diálogo y comprobar que queda de solo lectura;
  6. «Ver duelos» muestra la animación; «Saltar al resultado» lleva al resumen; el cuadro avanza;
  7. con `reducedMotion: 'reduce'`, solo hay fundidos.

### Implementation for User Story 3

- [ ] T063 [P] [US3] Crear `packages/domain/src/duelos/{tipos.ts,puntuacion.ts,resolver.ts,index.ts}` según [contracts/duelos-api.md](./contracts/duelos-api.md):
  - `puntuacionEfectiva` (centésimas enteras; penalización por posición de `statsEfectivos`, con Versátil, Todocampista e Inflexible);
  - `resolverCruce` (forma `rng.entero(−100 × estadoForma, +100 × estadoForma)` con `derivarSemilla(semilla, 'duelos')`, en el orden de las casillas, local y luego visitante; desempates);
  - `ErrorDuelos`.

  Exportarlo desde `packages/domain/src/index.ts`.
- [ ] T064 [US3] Ampliar `packages/domain/src/partida/partida.ts`:
  - `Modo` con `'duelos'`;
  - `numParticipantesValido` para duelos, con 4, 8 o 16 (dos mesas en 16, como el playoff);
  - `ConfigDuelos { formacion: FormacionId; estadoForma: boolean }` y `CONFIG_DUELOS_POR_DEFECTO = { formacion: '4-3-3', estadoForma: true }`;
  - `ConfigPartida.duelos?`.
- [ ] T065 [US3] Ampliar el dominio del torneo (`packages/domain/src/torneo/torneo.ts`) para que el modo `duelos` use `cuadroPlayoff`. Sus cruces se marcan `tipo: 'duelos'` y no generan bajas ni sanciones. Pruebas en `packages/domain/tests/torneo/torneo.test.ts`.
- [ ] T066 [P] [US3] Contratos de protocolo:
  - `packages/protocol/src/http/partidas.ts`: `modo` con `'duelos'`, `duelos?` en la creación y el cuerpo de `PUT /duelos`;
  - `packages/protocol/src/http/alineacion.ts`: `bloqueada`, `soloTitulares` y `formacionFija`;
  - `packages/protocol/src/http/partidos.ts`: `tipo`, `duelos` y la respuesta de `abrir` en duelos;
  - `packages/protocol/src/ws/partida.ts` y `packages/protocol/src/ws/torneo.ts`: `duelos` en la sala y `tipo` en los cruces.
- [ ] T067 [US3] Configuración en la sala:
  - `PUT /api/partidas/:id/duelos` en `apps/server/src/http/partidas.ts`, con validación del anfitrión, el modo, el estado `buscando` y la formación (errores de [contracts/http-api.md](./contracts/http-api.md));
  - persistencia en `partidas.config_duelos` y difusión de `sala.actualizada` en `apps/server/src/actores/sala.ts`;
  - `POST /api/partidas` acepta `modo: 'duelos'` y `duelos?`.
- [ ] T068 [US3] Preparación en el modo duelos en `apps/server/src/actores/preparacion.ts`, `apps/server/src/actores/equipo.ts` y `apps/server/src/http/alineacion.ts`:
  - solo se aceptan `titulares` en las casillas de la formación común (`400 FORMACION_FIJA`);
  - el resto se guarda con valores por defecto (`suplentes = []`);
  - la primera confirmación pone `bloqueada = true` y las siguientes reciben `409 ALINEACION_BLOQUEADA`;
  - no se asignan ni exigen dorsales;
  - `PUT /dorsales` y `PUT /equipaciones` responden `409 NO_DISPONIBLE_EN_MODO`;
  - al vencer el plazo se aplica la alineación automática en la formación común, también bloqueada.
- [ ] T069 [US3] IA de duelos en `packages/ai/src/alineacion.ts`: `decidirAlineacionDuelos(plantilla, formacion, p)` maximiza la suma de puntuaciones efectivas en la formación común (asignación voraz por casilla con mejora local). Prueba en `packages/ai/tests/alineacionDuelos.test.ts`.
- [ ] T070 [US3] Crear el actor `apps/server/src/actores/duelos.ts` y engancharlo en `apps/server/src/actores/torneo.ts`:
  - al abrir una ronda de un torneo `duelos`, crea los `partidos` con `tipo = 'duelos'` y resuelve cada cruce con `resolverCruce`, usando la semilla del partido y las cartas en la versión de catálogo de la partida;
  - guarda `duelos`, `marcador = ganados`, `estado = 'finalizado'` y `resolucion` (`npc` sin humanos, `apertura` con humanos);
  - crea los visionados pendientes de los humanos y avanza el cuadro con `avanzarCuadro`.

  Reutilizar los mensajes de eliminación, «Simular resto del torneo» y la pantalla de campeón (FR-069).
- [ ] T071 [US3] Endpoints de cruces en `apps/server/src/http/partidos.ts`:
  - `GET /api/partidos/:id` con `tipo` y `duelos`, ocultos mientras el visionado está pendiente;
  - `POST /api/partidos/:id/abrir` en duelos devuelve `{ modo: 'duelos', duelos, cartas }`;
  - `POST /api/partidos/:id/visto`, nuevo e idempotente, marca el visionado;
  - `GET /api/partidos/:id/reproduccion` responde `409 NO_APLICA` en duelos;
  - `torneo.actualizado` lleva `tipo` y oculta el ganador mientras haya visionado pendiente.
- [ ] T072 [P] [US3] Icono `duelo` (dos perfiles de cara enfrentados, mismo trazo que el resto) en `apps/web/src/componentes/Icono.tsx`, y opción «Duelo de jugadores» con participantes 4, 8 y 16 en `apps/web/src/pantallas/CrearPartida.tsx` (incluida `ETIQUETA_MODO`). Revisar que los otros tres modos tengan icono para mantener la coherencia (FR-060).
- [ ] T073 [US3] Crear `apps/web/src/componentes/ConfigDuelos.tsx` y montarlo en `apps/web/src/pantallas/Sala.tsx`:
  - selector de formación con miniatura (4-3-3 preseleccionado) e interruptor «Estado de forma» con el texto «Cada jugador suma o resta hasta 2 puntos al azar en cada duelo»;
  - editable solo por el anfitrión; para el resto, solo lectura con «Lo elige el anfitrión»;
  - cada cambio se guarda en el momento con `PUT /duelos`.
- [ ] T074 [US3] Modo duelos en `apps/web/src/pantallas/Alineacion.tsx`:
  - solo `CampoEquipo` con la formación fija y la plantilla para intercambiar;
  - ocultos `PanelTactica`, `EditorDorsales`, `EditorEquipacion`, `EditorLanzadores`, el banquillo y la colocación libre;
  - botón principal «Confirmar once» con un `Dialogo` («Este será tu once para todo el torneo. No podrás cambiarlo», con «Confirmar» y «Seguir editando»);
  - una vez bloqueado, solo lectura con la insignia «Once confirmado».
- [ ] T075 [US3] Crear `apps/web/src/pantallas/Duelos.tsx` (ruta en `apps/web/src/app/Rutas.tsx`) según [contracts/ui.md](./contracts/ui.md):
  - secuencia de los 11 puestos de portero a delanteros: entrada (300 ms), choque (escala 1,08 y destello de 120 ms), recuento de puntuaciones con el desglose (media, posición, virtudes, defectos y forma) en 600 ms, ganadora resaltada y perdedora atenuada, y «Empate» si el duelo es nulo;
  - marcador de duelos en la cabecera;
  - controles «×1», «×2» y «Saltar al resultado», accesibles por teclado;
  - resumen final con la tabla de duelos, el desempate si lo hubo y «Volver al torneo»;
  - `POST /visto` al terminar o al saltar;
  - con `prefers-reduced-motion`, fundido de 150 ms;
  - WAAPI, animando solo `transform` y `opacity`.
- [ ] T076 [US3] En `apps/web/src/pantallas/Torneo.tsx`: marcador «Duelos 7–4» en los cruces de duelos y botón principal «Ver duelos» en los cruces propios con visionado pendiente, que lleva a `Duelos`.
- [ ] T077 [P] [US3] Lógica pura de la secuencia de la animación (tiempos por velocidad, saltar, orden de las casillas) en `apps/web/src/componentes/secuenciaDuelos.ts`, con prueba en `apps/web/tests/unit/secuenciaDuelos.test.ts`.

**Checkpoint**: se puede jugar un torneo de duelos completo. Sugerir el commit de US3.

---

## Phase 6: User Story 4 — Partidos con penaltis, lesiones y tarjetas creíbles (Priority: P2)

**Goal**: las frecuencias de FR-071 con los parámetros 4.0.0 y los penaltis visibles (FR-070 a FR-072).

**Independent Test**: `pnpm balance --n 1000 --serie todas --solo 005/SC-011` y el recorrido E de [quickstart.md](./quickstart.md).

### Tests for User Story 4

- [ ] T078 [P] [US4] Comprobación `balance` `tools/balance/src/checks/disciplina.ts` (`005/SC-011`). En la serie sintética y en la Core, mide por partido amarillas, rojas (directas más doble amarilla), penaltis y lesiones, y las compara con los objetivos (amarillas 4, rojas 0,20, penaltis 0,35, lesiones 0,35; ±20 %). En el informe muestra la tabla «actual 3.0.0 / medido / objetivo / ✅❌». Registrar en `tools/balance/src/cli.ts`.
- [ ] T079 [P] [US4] Prueba del motor en `packages/engine/tests/balonParado.test.ts`: `factorFaltaArea` multiplica la probabilidad de falta solo dentro del área. Con 3.0.0 (factor 1), el resultado es el mismo que antes.
- [ ] T080 [P] [US4] Prueba en `packages/engine/tests/penaltis.test.ts`: el evento `penalti` lleva `datos.resultado ∈ {'gol','parada','fuera'}` cuando se resuelve el lanzamiento.
- [ ] T081 [P] [US4] Prueba `apps/web/tests/unit/resumenEventos.test.ts`: el penalti usa el icono `penalti` y el texto «Penalti: marca X», «Penalti: X falla» o «Penalti: lo para Y».

### Implementation for User Story 4

- [ ] T082 [US4] Aplicar `disciplina.factorFaltaArea` en `packages/engine/src/acciones/balonParado.ts`, en la decisión de falta dentro del área y en el duelo aéreo del área.
- [ ] T083 [US4] Rellenar `packages/domain/src/parametros/v4.json` con los valores iniciales de research R2 (`probabilidadFaltaPorEntrada 0.22`, `probabilidadAmarillaPorFalta 0.33`, `probabilidadRojaDirectaPorFalta 0.011`, `probabilidadFaltaDueloAereoArea 0.03`, `factorFaltaArea 0.55`, `lesiones.probabilidadPorEntrada 0.0095`, `reparto 0.60/0.27/0.11/0.02`). Iterar con `pnpm balance --n 1000 --serie todas --solo 005/SC-011,003/SC-001` hasta que se cumplan SC-011 y los criterios vigentes de goles y de ventaja del mejor equipo. Anotar los valores finales en research R2.
- [ ] T084 [US4] Añadir `datos.resultado` al evento `penalti` en `packages/engine/src/acciones/balonParado.ts` y `packages/engine/src/acciones/tiro.ts` (en la penalti, tras resolver el tiro).
- [ ] T085 [US4] Penaltis visibles en el cliente:
  - icono `penalti` en `apps/web/src/componentes/Icono.tsx`;
  - entrada en `ICONO_EVENTO` y texto con el resultado en `apps/web/src/componentes/ResumenEventos.tsx`;
  - rótulo «Penalti» al pitarlo en `apps/web/src/pantallas/Partido2D.tsx` (o en el componente de rótulos de `apps/web/src/campo2d/`).
- [ ] T086 [US4] Ejecutar `pnpm balance --n 1000 --serie todas` completo: SC-011 en verde y sin regresiones en las comprobaciones de las specs 001 a 003. Si alguna anterior falla por el aumento de faltas, ajustar en `v4.json` y documentar en research R2.

**Checkpoint**: tarjetas, lesiones y penaltis con frecuencias creíbles. Sugerir el commit de US4.

---

## Phase 7: User Story 5 — Nuevas virtudes: De acero, Versátil, Fair player y Revulsivo (Priority: P2)

**Goal**: las cuatro virtudes nuevas aplicadas, repartidas en Core y visibles (FR-030 a FR-035).

**Independent Test**: las pruebas de unidad, `balance --solo 005/SC-004,005/SC-005` y la presencia de las virtudes en los sobres.

### Tests for User Story 5

- [ ] T087 [P] [US5] Pruebas en `packages/engine/tests/virtudesNuevas.test.ts`:
  - De acero no se lesiona aunque la probabilidad esté forzada a 1;
  - Fair player no recibe roja directa y, con dos amarillas, sigue en el campo con `amarillas = 2`;
  - Revulsivo multiplica por 1,05 sus stats solo si `entroDesdeBanquillo`, también al entrar por un lesionado; un titular no recibe nada.
- [ ] T088 [P] [US5] Prueba de `penalizacionPorPosicion` con Versátil (−0,05, con mínimo 0, solo si la penalización es > 0) en `packages/domain/tests/equipo/statsEfectivos.test.ts`.
- [ ] T089 [P] [US5] Ampliar `tools/balance/src/checks/rasgos.ts` (segunda parte, virtudes nuevas):
  - `005/SC-005`: De acero, 0 lesiones; Fair player, 0 rojas; De cristal, 100 % de lesiones largas;
  - `005/SC-004/Versatil` y `005/SC-004/Revulsivo`: magnitud ±20 %.

### Implementation for User Story 5

- [ ] T090 [US5] Implementar:
  - De acero en `packages/engine/src/acciones/lesiones.ts`, comprobado antes que cualquier otro factor;
  - Fair player en `packages/engine/src/acciones/balonParado.ts` (`tarjetaRoja` y `amarilla`: la segunda amarilla queda registrada sin expulsar);
  - Revulsivo: campo `entroDesdeBanquillo` en `JugadorEnPartido` (`packages/engine/src/estado/estado.ts`), puesto a `true` en `sustituir()` de `packages/engine/src/acciones/plantel.ts`, y multiplicador en `multiplicadorIndividual` (`packages/engine/src/modificadores/defectos.ts`) con `virtudes.revulsivo`.
- [ ] T091 [US5] Añadir Versátil en `penalizacionPorPosicion` de `packages/domain/src/equipo/statsEfectivos.ts`: `− virtudes.versatil`, con mínimo 0, solo si la penalización es > 0.
- [ ] T092 [US5] Ampliar `tools/fixtures/src/asignarRasgos.ts`: asignar las virtudes nuevas solo a cartas con hueco libre según `MAX_VIRTUDES`, unas 12 cartas por virtud repartidas por nivel y respetando las incompatibilidades. Volver a ejecutar `pnpm --filter @fbd/fixtures asignar-rasgos` y comprobar que T050 sigue en verde. Recargar con `pnpm seed --file data/core.json`.
- [ ] T093 [US5] IA en `packages/ai/src/alineacion.ts` y `packages/ai/src/partido.ts`: reservar a un Revulsivo en el banquillo cuando la diferencia con el titular alternativo sea pequeña y darle entrada en la segunda parte. Pruebas en `packages/ai/tests/rasgos.test.ts`.
- [ ] T094 [US5] Registrar las 4 virtudes nuevas en `packages/engine/tests/rasgosProbados.ts`.

**Checkpoint**: las cuatro virtudes nuevas funcionan y aparecen en los sobres. Sugerir el commit de US5.

---

## Phase 8: User Story 6 — Documento de referencia único de virtudes y defectos (Priority: P2)

**Goal**: documento generado y sincronizado, impactos coherentes con lo medido, specs anteriores enlazadas y constitución modificada (FR-050 a FR-055, FR-080).

**Independent Test**: `rasgos-doc.test.ts`, `balance --solo 005/FR-051` y el recorrido G de [quickstart.md](./quickstart.md).

### Tests for User Story 6

- [ ] T095 [P] [US6] Prueba `packages/domain/tests/catalogo/rasgos-doc.test.ts`: genera el documento en memoria con `generarDocumentoRasgos()` y falla si difiere de `docs/juego/virtudes-y-defectos.md` (FR-054, SC-007).
- [ ] T096 [P] [US6] Comprobación `balance` `tools/balance/src/checks/impacto.ts` (`005/FR-051`):
  - para cada rasgo, mide la diferencia de goles esperada con el rasgo frente a sin él (serie A/B sintética);
  - dentro de cada tipo, comprueba que la correlación de Spearman entre el impacto y el efecto medido sea ≥ 0,6. En los defectos se usa `1 − impacto`;
  - el informe lista los rasgos más fuera de orden.

### Implementation for User Story 6

- [ ] T097 [US6] Crear `packages/domain/src/catalogo/documentoRasgos.ts` con `generarDocumentoRasgos(): string`, en Markdown y en español. Contiene:
  - una introducción fija: qué es una virtud y un defecto, cómo se lee el impacto (virtudes: 1 = más beneficiosa; defectos: 0 = más perjudicial), reglas de acumulación y la regla de FR-055 («no basta con añadir un rasgo al documento: debe implementarse y probarse»);
  - una tabla de virtudes y otra de defectos con nombre, ámbito, descripción, efecto, activación, acumulación, incompatibilidades e impacto;
  - la lista de incompatibilidades.

  Añadir el script `rasgos:doc` en `packages/domain/package.json`, que escribe `docs/juego/virtudes-y-defectos.md`.
- [ ] T098 [US6] Generar `docs/juego/virtudes-y-defectos.md` con `pnpm --filter @fbd/domain rasgos:doc`.
- [ ] T099 [US6] Ejecutar `pnpm balance --n 1000 --solo 005/FR-051`. Si la correlación no llega, ajustar los `impacto` en `packages/domain/src/catalogo/rasgos.ts`, regenerar el documento y anotar los cambios en [contracts/rasgos.md](./contracts/rasgos.md).
- [ ] T100 [US6] Sustituir las listas y definiciones duplicadas por un enlace al documento, conservando la regla propia de cada requisito (FR-053):
  - `specs/001-draft-manager-mvp/spec.md`: FR-022 (lista de virtudes) y FR-037 (efectos);
  - `specs/001-draft-manager-mvp/data-model.md`;
  - `specs/003-mejoras-ux-simulacion/research.md`: inventario de R10;
  - el comentario de inventario de `packages/engine/src/modificadores/virtudes.ts`, que pasa a un enlace.
- [ ] T101 [US6] Añadir el enlace «Virtudes y defectos: [docs/juego/virtudes-y-defectos.md]» en `CLAUDE.md` y en `README.md`.
- [ ] T102 [US6] Redactar `specs/005-virtudes-defectos/propuesta-constitucion-1.2.0.md` (research R14):
  - «habilidades especiales» → «virtudes y defectos» en la visión y en los principios I, III, IV y IX;
  - aclaración en el Principio V: el motor único resuelve los partidos, y el modo Duelo de jugadores resuelve los cruces con una función de dominio, sin un segundo motor de partidos;
  - el modo Duelo de jugadores en «Decisiones resueltas» → `specs/005-virtudes-defectos/`;
  - informe de impacto de la cabecera.

  La persona la revisa y la aplica con `/speckit-constitution`; el agente no modifica `.specify/memory/constitution.md` sin esa aprobación.

**Checkpoint**: una sola fuente de verdad para los rasgos, documentada y coherente con el juego. Sugerir el commit de US6.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T103 [P] Rendimiento: `pnpm --filter @fbd/engine bench` sigue dentro de los límites de la spec 003 (≤ 25 ms sin fotogramas). `resolverCruce` tarda menos de 5 ms (prueba de tiempo en `packages/domain/tests/duelos/rendimiento.test.ts`).
- [ ] T104 [P] Accesibilidad de la pantalla `Duelos` y de los defectos: foco visible en los controles, `aria-live="polite"` en el marcador de duelos, texto alternativo de los iconos `duelo`, `defecto` y `penalti`, y contraste de `--color-defecto` comprobado en `apps/web/tests/unit/tokens.test.ts`.
- [ ] T105 [P] Ampliar `apps/web/tests/e2e/diseno/` con capturas de las cartas de dos filas (en el draft, la apertura y la alineación), la sala de duelos y la pantalla `Duelos` a 1366 × 768 y 360 × 640.
- [ ] T106 Ejecutar la validación completa de [quickstart.md](./quickstart.md): pruebas automáticas y recorridos A a G. Anotar los resultados en `specs/005-virtudes-defectos/checklists/validacion.md`.
- [ ] T107 Volver a ejecutar T004 (sin `special`), T005 (equivalencia 3.0.0) y `pnpm -r typecheck` y `pnpm lint` al cierre.
- [ ] T108 Ejecutar `graphify update .` y revisar que `graphify-out/GRAPH_REPORT.md` refleje los módulos nuevos (`rasgos`, `defectos`, `duelos`).
- [ ] T109 Actualizar `specs/005-virtudes-defectos/checklists/requirements.md` y `CLAUDE.md` («Especificación y plan en curso» → `specs/005-virtudes-defectos/`).
- [ ] T110 Sugerir a la persona el commit final y el `git push` de la rama, con el comando listo para copiar (sin ejecutarlo).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias. Se ejecuta en el commit base, antes de cualquier cambio.
- **US1 (Phase 2)**: depende de Setup. **Bloquea todo lo demás**.
- **Foundational (Phase 3)**: depende de US1. Bloquea US2 a US6.
- **US2, US3, US4, US5 y US6 (Phases 4 a 8)**: dependen solo de Foundational y pueden avanzar en paralelo, con estos matices:
  - **US3 (duelos)** usa `impacto` y la penalización por posición. Funciona sin los defectos de US2, pero su comprobación SC-010 es más representativa cuando Core ya tiene los rasgos (T049, T092).
  - **US5** amplía `asignarRasgos.ts`, creado en US2 (T049), y `multiplicadorIndividual` (T045). Hacer US5 después de US2, o crear el fichero vacío en US5 si va antes.
  - **US6** ajusta los impactos (T099) mejor cuando US2 y US5 están implementadas (los efectos son medibles). El documento (T097, T098) puede generarse antes.
  - **US4** es independiente de las demás, pero toca `balonParado.ts` igual que US2 y US5. Hay que coordinar los cambios en ese fichero.
- **Polish (Phase 9)**: tras las historias que se vayan a entregar.

### Within Each User Story

- Las pruebas, primero, y deben fallar antes de implementar.
- Dominio → motor → protocolo → servidor → cliente.
- Cada historia termina con su checkpoint y un commit sugerido.

### Parallel Opportunities

- Setup: T002 y T003 en paralelo con T001.
- US1: las tareas [P] de renombrado en paquetes distintos (T010, T012, T013, T015 y T019) pueden ir en paralelo tras T007 a T009.
- Foundational: T024, T032 y T034 en paralelo con su tarea base.
- Tras Foundational: US2, US3, US4 y US6 en paralelo con personas o agentes distintos (US5 después de US2).

---

## Parallel Example: User Story 2

```text
# Pruebas en paralelo (ficheros distintos):
T036 packages/engine/tests/defectosDisciplina.test.ts
T037 packages/engine/tests/defectosFisicos.test.ts
T038 packages/engine/tests/defectosJuego.test.ts
T039 packages/engine/tests/defectosMedia.test.ts
T040 packages/domain/tests/equipo/statsEfectivos.test.ts
T041 packages/engine/tests/malestar.test.ts
T043 tools/balance/src/checks/rasgos.ts
T044 apps/web/tests/e2e/defectos.spec.ts
```

## Parallel Example: User Story 3

```text
# Dominio, protocolo y cliente en paralelo tras las pruebas:
T063 packages/domain/src/duelos/*
T066 packages/protocol/src/{http,ws}/*
T072 apps/web/src/componentes/Icono.tsx + apps/web/src/pantallas/CrearPartida.tsx
T077 apps/web/src/componentes/secuenciaDuelos.ts
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 (línea base) y Phase 2 (US1, renombrado).
2. **Parar y validar**: búsqueda sin `special`, equivalencia 3.0.0, migración y `balance` idéntico.
3. Se puede entregar sola: el producto es el mismo, con el vocabulario nuevo.

### Incremental Delivery

1. US1 → Foundational.
2. US2 (defectos) → validar recorridos B y F → entregar.
3. US4 (frecuencias) → validar recorrido E → entregar. Conviene entregarla pronto: es la queja más visible del usuario.
4. US5 (virtudes nuevas) → entregar.
5. US3 (duelos) → validar recorrido D → entregar.
6. US6 (documento, impactos y constitución) → entregar.
7. Polish.

### Parallel Team Strategy

Tras Foundational:

- Persona o agente A: US2 y después US5 (motor y catálogo).
- B: US3 (dominio de duelos, servidor y cliente).
- C: US4 (calibración) y US6 (documento e impactos).

---

## Notes

- [P] = ficheros distintos y sin dependencias pendientes.
- Las magnitudes de `v4.json` son iniciales; las finales se anotan en research R2 y en [contracts/rasgos.md](./contracts/rasgos.md).
- La interpretación de «5 % de la penalización» como 5 puntos porcentuales (research R6) queda en la descripción de Versátil e Inflexible del documento de referencia.
- No modificar migraciones ya aplicadas (`0000` a `0009`).
