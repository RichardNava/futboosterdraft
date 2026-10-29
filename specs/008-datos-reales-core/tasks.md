---

description: "Tareas de la spec 008: datos reales de la colección Core (fase 0.1)"
---

# Tasks: Datos reales de la colección Core (fase 0.1)

**Input**: documentos de diseño de `specs/008-datos-reales-core/` ([plan.md](./plan.md), [spec.md](./spec.md),
[research.md](./research.md), [data-model.md](./data-model.md), [contracts/datos-core-real.md](./contracts/datos-core-real.md),
[quickstart.md](./quickstart.md)).

**Tests**:
- La spec pide que la validación del catálogo pase (SC-001) y que las pruebas existentes sigan en verde (SC-007).
- El plan añade una sola prueba nueva: el recuento del sumario (R11).
- No se escriben más pruebas.

**Reglas para quien ejecute** (CLAUDE.md y constitución):
- **pnpm**: se usa pnpm, nunca npm, yarn ni npx.
- **Tildes**: sin tildes en el código, ids ni nombres de archivo; con tildes en los textos visibles.
- **Git**: el agente no hace `git commit` ni `git push`.
- **Grafo**: antes de leer código hay que lanzar `graphify query "<pregunta>"`, y tras cambiar código, `graphify update .`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (ficheros distintos y sin dependencias pendientes).
- **[Story]**: historia de usuario de la spec (US1, US2, US3).

---

## Phase 1: Setup

**Purpose**: fijar la tabla de nombres antes de producir nada.

- [ ] T001 Crear `specs/008-datos-reales-core/dudas.md` con el encabezado y la tabla vacía
  `id | jugador | campo | valor propuesto | motivo`.
  - Motivos válidos: `sin confirmar`, `homonimo`, `doble nacionalidad`, `demarcacion cambiante`,
    `nivel en el limite`, `retrato`, `escudo`.
  - Añadir ya la fila de `escudo` de R10: SC-008 solo se cumple en la parte de la bandera mientras
    `ESCUDOS_ACTIVOS = false`.
  - Añadir las tres filas de `retrato` sin transparencia: Erling Haaland, Lamine Yamal y Manuel Neuer.
- [ ] T002 Escribir en el scratchpad del agente, fuera del repositorio, la función de *slug* de R2. La comparten el
  script de retratos (T010) y la redacción de fichas (T013 a T017). El algoritmo es:
  1. NFKD y quitar las marcas diacríticas;
  2. sustituir `ø→o`, `æ→ae`, `ß→ss`, `đ→d`, `ł→l`, `ı→i`;
  3. pasar a minúsculas;
  4. convertir en `-` todo lo que no sea `[a-z0-9]`;
  5. colapsar los guiones y recortarlos en los extremos.

  Generar `slugs.tsv` (`nombre de archivo → slug`) con los 250 ficheros de `retratos/` y comprobar que no hay slugs
  repetidos. Si los hay, parar y anotarlo en `dudas.md` (FR-003).

---

## Phase 2: Foundational (bloquea US1 y la integración)

**Purpose**: que el catálogo acepte un Core que no cuadra con la tabla, y que existan todas las selecciones de los 250.

- [ ] T003 En `packages/domain/src/catalogo/validar.ts`, `validarCatalogo`: quitar el error
  `Core no cumple DISTRIBUCION_CORE` (R8). Mantener el resto de comprobaciones de colección, incluida la de una única
  colección básica `core`. Quitar los imports que queden sin uso (`DISTRIBUCION_CORE`, `recuentoPorDemarcacionYNivel`)
  y actualizar el comentario de cabecera.
- [ ] T004 Ajustar `packages/domain/tests/catalogo/validar.test.ts`: la prueba que espere ese error pasa a esperar que
  no haya error (Core válido aunque no cuadre).
- [ ] T005 Hacer una pasada por los 250 nombres de `retratos/` y decidir la selección absoluta de cada uno (R9, edge
  case de doble nacionalidad). Si duda, consultar fuentes públicas en la web. Guardar el resultado en el scratchpad
  (`nacionalidades.tsv`: archivo → código alfa-3) y anotar en `dudas.md` los casos de doble nacionalidad o sin debut.
- [ ] T006 Añadir a `packages/domain/src/catalogo/selecciones.ts` cada código de `nacionalidades.tsv` que no esté:
  - ISO 3166-1 alfa-3, salvo ENG, SCO, WAL y NIR, que se mantienen; Irlanda es `IRL`;
  - nombre en español con tildes (p. ej. `NOR: { nombre: 'Noruega' }`);
  - en orden alfabético por código.
- [ ] T007 [P] Añadir los mismos códigos, en el mismo orden, al enumerado `$defs.nacionalidad.enum` de
  `packages/protocol/schemas/player-data.schema.json`.
- [ ] T008 [P] Por cada código nuevo, copiar la bandera `flags/4x3/<alfa-2>.svg` de `flag-icons` (la misma fuente MIT;
  descargarla del paquete con versión fija, p. ej. `https://cdn.jsdelivr.net/npm/flag-icons@7.2.3/flags/4x3/no.svg`) a
  `apps/web/public/banderas/<ALFA3>.svg`. No tocar `apps/web/public/banderas/LICENSE`.
- [ ] T009 Ejecutar `pnpm test -- selecciones` (`packages/domain/tests/catalogo/selecciones.test.ts`): el esquema debe
  ser igual a `SELECCIONES`. Comprobar a mano que hay un `.svg` en `apps/web/public/banderas/` por cada código.

**Checkpoint**: el dominio acepta las nacionalidades de los 250 y no rechaza Core por el reparto.

---

## Phase 3: User Story 2 - Retratos listos para las cartas (Priority: P2) — se hace primero

US2 va antes que US1 por una razón práctica: las fichas apuntan a rutas de retrato que deben existir para el comando
de integración (contrato §1). Las dos historias se pueden probar por separado.

**Goal**: 250 retratos WebP en `apps/web/public/cartas/retratos/`, nítidos en la carta.

**Independent Test**: [quickstart.md](./quickstart.md) §1, más una carta con retrato en la ruta de pruebas de cartas,
en tamaño normal y ampliado.

- [ ] T010 [US2] Escribir y ejecutar en el scratchpad un script de Python + Pillow de un solo uso (R1, R2). No se
  versiona y debe hacer lo siguiente:
  - Leer cada fichero de `retratos/` sin modificarlo (FR-004).
  - Guardarlo como `apps/web/public/cartas/retratos/<slug>.webp`, usando `slugs.tsv`, con estas opciones:
    - tamaño 139 × 181, sin ampliar;
    - `quality=90`, `method=6`;
    - alfa si el original es RGBA; los JPG van en RGB.
  - Comprobar y mostrar al final:
    - que hay 250 ficheros;
    - el peso total frente al de `retratos/` (≤ 50 %, SC-005);
    - que cada retrato pesa ≤ 25 KB.
- [ ] T011 [US2] En `apps/web/src/estilos/cartas.css`, después de `.carta-silueta`, añadir
  `.carta-silueta:not(.mascara) { aspect-ratio: 139 / 181; }` (R3). Mantener `object-fit: contain` y el `max-height`
  existente. La máscara SVG no cambia.
- [ ] T012 [US2] Comprobar el resultado en `pnpm dev`, en la ruta de pruebas de cartas (`apps/web/src/pantallas/PruebasCartas.tsx`,
  solo en desarrollo). Para ello, cambiar temporalmente la `imagen` de alguna carta de prueba por
  `/cartas/retratos/<slug>.webp` de un PNG y de un JPG. En tamaño normal y ampliado, la cara debe verse nítida,
  centrada y sin estirar. Después deshacer el cambio temporal.

**Checkpoint**: los retratos existen y se ven bien en la carta.

---

## Phase 4: User Story 1 - Fichas reales de los 250 jugadores (Priority: P1) 🎯 MVP

**Goal**: `data/core-real.json` con 250 fichas válidas de prime, integradas en `data/core.json` (ids 1–250).

**Independent Test**: [quickstart.md](./quickstart.md) §2 y §5. Validación con 0 errores (SC-001), medias dentro de su
banda (SC-003) y una muestra de 20 revisada contra fuentes públicas (SC-002).

**Reglas de cada ficha** (data-model §1, R5). Aplican a T013–T017:
- Campos exactos del esquema:
  `id, nombre, apellidos, nombre_carta, nacionalidad, fecha_nacimiento, altura, demarcacion, posicion, historia,
  stats, media, virtudes, defectos, nivel, imagen, imagen_bg`.
- `nombre_carta` ≤ 24 caracteres: el nombre por el que se le conoce.
- `fecha_nacimiento` en ISO `YYYY-MM-DD` real. `altura` entera, entre 150 y 215 cm.
- `posicion`: 1–3 posiciones, la principal primero. Un POR solo tiene `POR`, y un jugador de campo nunca tiene `POR`.
- `stats`: exactamente las 6 claves de `CLAVES_STATS[demarcacion]`, enteros 1–99, de su prime.
- `media`: el promedio exacto de los stats, dentro de la banda del nivel:
  - Superclase 70–79,9;
  - Épico 78–84,9;
  - Legendario 83–89,9;
  - GOAT ≥ 88. Messi, Cristiano Ronaldo y Neymar son GOAT, entre 93 y 97.
- **Nivel**: se decide primero, por el prime. Los jóvenes, por su mejor rendimiento demostrado, y la historia lo
  menciona.
- `virtudes`: hasta `MAX_VIRTUDES[nivel]`, solo las de `virtudesPermitidas` (las de MED solo en un DEF con CI o CD).
- `defectos`: 0–2, solo si están justificados y sin parejas de `PAREJAS_INCOMPATIBLES`.
- `historia`: 2–3 frases en español con sus clubes, títulos y lo que le define.
- `imagen` = `/cartas/retratos/<slug>.webp` (de `slugs.tsv`). `imagen_bg` = `/cartas/fondos/{por,def,med,del}.svg`,
  según la demarcación.
- `nacionalidad`: la de `nacionalidades.tsv`.
- Toda duda va a `dudas.md`: homónimos, niveles en el límite y datos sin confirmar.

Mientras se redactan los lotes, el `id` es provisional: el número de orden alfabético del archivo (1–250). T018 asigna
los definitivos.

- [ ] T013 [US1] Lote 1: archivos 1–50 de `retratos/` en orden alfabético (de «Aaron Ramsey» a «Dean Huijsen»). Escribir
  sus fichas en `data/core-real.json` (`{ "version": "1.0.0", "jugadores": [...] }`) y validar el lote con
  `validarColeccion` desde un script `tsx` del scratchpad. Corregir hasta tener 0 errores.
- [ ] T014 [US1] Lote 2: archivos 51–100 (de «Declan Rice» a «Jan Paul van Hecke»). Añadirlos a `data/core-real.json`,
  validar el fichero entero y anotar las dudas.
- [ ] T015 [US1] Lote 3: archivos 101–150 (de «Jarell Quansah» a «Marc Bernal»). Igual que T014.
- [ ] T016 [US1] Lote 4: archivos 151–200 (de «Marc Cucurella» a «Pedro Porro»). Igual que T014.
- [ ] T017 [US1] Lote 5: archivos 201–250 (de «Petar Sučić» a «Ángel Di María»). Igual que T014, y comprobar que hay
  exactamente una ficha por retrato (US1-1).
- [ ] T018 [US1] Repaso de coherencia de todo `data/core-real.json`, antes de los ids definitivos:
  - los GOAT son los referentes mundiales;
  - nadie claramente inferior tiene más media que un GOAT;
  - las medias caen dentro de su banda (SC-003).

  Después, asignar los ids definitivos 1–250 por demarcación (POR, DEF, MED, DEL), luego por nivel (de Superclase a
  GOAT) y luego por `nombre_carta` (R7), y actualizar los ids de `dudas.md`. Esta renumeración solo se hace una vez:
  las ediciones posteriores de la persona conservan los ids.
- [ ] T019 [US1] Crear `tools/fixtures/src/coreReal.ts` y añadir el script
  `"core-real": "tsx src/coreReal.ts"` a `tools/fixtures/package.json` (contrato §2, R7). Debe hacer lo siguiente:
  1. leer `data/core-real.json`, validarlo con el esquema (como en `apps/server/src/persistencia/seed.ts`) y con
     `validarColeccion`;
  2. exigir que los ids sean exactamente `{1…250}`;
  3. exigir que `imagen` cumpla `^/cartas/retratos/[a-z0-9-]+\.webp$` y que el fichero exista en `apps/web/public`;
  4. exigir que las 250 rutas sean distintas y cubran todos los ficheros de `apps/web/public/cartas/retratos/`;
  5. exigir que `imagen_bg` sea el fondo genérico de su demarcación;
  6. sustituir los ids 1–250 de `data/core.json`, dejar 251–300 intactos y poner `version: "2.0.0"`.

  Escribir con el mismo formato JSON que `tools/fixtures/src/asignarRasgos.ts`. Si hay algún error, imprimir
  `[id] regla: mensaje`, salir con código 1 y no escribir nada. Debe ser idempotente.
- [ ] T020 [US1] Ejecutar `pnpm --filter @fbd/fixtures core-real` y comprobar:
  - que `data/core.json` tiene 300 cartas, `version` `2.0.0` y las 1–250 iguales a `core-real.json`;
  - que `data/colecciones.json` no cambia.

  Probar el error de quickstart §2 y deshacerlo.
- [ ] T021 [US1] Ejecutar `pnpm test` y ajustar solo las pruebas que fijan datos de cartas ficticias 1–250 (R13, SC-007).
  - Candidatas:
    - `packages/domain/tests/catalogo/versionCatalogo.test.ts`: acotar la comparación con `fixtures/core-004.json` a
      los ids 251–300;
    - `packages/domain/tests/catalogo/datos006.test.ts`;
    - `packages/domain/tests/catalogo/validar.test.ts` (reparto de defectos de Core);
    - `apps/server/tests/unit/seed.test.ts`: «no avisa con core.json» pasa a «avisa y carga»;
    - `packages/ai/tests/niveles.test.ts` y `packages/ai/tests/errores.test.ts`;
    - `tools/balance/tests/referencia.test.ts`;
    - `apps/server/tests/integration/migracion-0011.test.ts`.
  - Lo que no se toca:
    - **`packages/domain/tests/sobres/generador.test.ts`**: «10 000 mesas de 8 con el core.json real» no se debilita.
      Si falla, se anota la celda que lo provoca para T025 y se avisa a la persona (R8).
    - **Parámetros de equilibrado**: no se cambian. Si una prueba de equilibrado se sale del objetivo, se informa.
- [ ] T022 [US1] Ejecutar `pnpm seed` y `pnpm dev`. Comprobar quickstart §4 en la colección y en un draft:
  - aparecen los jugadores reales con su retrato y su bandera;
  - el seed puede avisar del reparto, pero no rechaza nada.

**Checkpoint**: MVP. Core lleva los 250 reales, con un fichero que se puede revisar y una lista de dudas.

---

## Phase 5: User Story 3 - Sumario para elegir los 50 que faltan (Priority: P3)

**Goal**: `specs/008-datos-reales-core/sumario.md`, generado por `core-real`, con las necesidades priorizadas.

**Independent Test**: [quickstart.md](./quickstart.md) §6. Un recuento a mano coincide con el del sumario, y huecos −
excesos = 50.

- [ ] T023 [US3] En `tools/fixtures/src/coreReal.ts`, añadir y exportar la función pura
  `sumarioCore(jugadores, distribucion)` (data-model §5, R11). Devuelve:
  - `tabla[demarcacion][nivel] = { actual, objetivo, diferencia }`, con `Σ huecos − Σ excesos = 300 − 250`;
  - `posiciones[pos] = { principal, secundaria, cobertura, pocaCobertura }` para las 16 de `POSICIONES`:
    - `principal` cuenta `posicion[0]` y `secundaria` el resto;
    - `pocaCobertura` se marca si la cobertura es menor que el máximo de casillas de esa posición en una formación de
      `FORMACIONES` (`packages/domain/src/equipo/formaciones.ts`), multiplicado por 8;
  - `nacionalidades`: en orden descendente, marcando las que tienen 1 jugador y las que pasan del 10 %;
  - `defectos[nivel] = { proporcion, esperada }`, con `proporcionDefectosPorNivel` y `REPARTO_DEFECTOS`;
  - `excesos`: por cada celda sobrecargada, los jugadores con la media más cercana al borde de su banda que se podrían
    llevar al nivel vecino con hueco;
  - `necesidades`: ordenadas por tamaño del hueco, con texto llano («Faltan 3 GOAT DEF, preferiblemente LD»). La
    posición preferida es la de menor cobertura de la demarcación.

  Reutilizar `recuentoPorDemarcacionYNivel` y `DISTRIBUCION_CORE`.
- [ ] T024 [P] [US3] Crear `tools/fixtures/tests/sumarioCore.test.ts` con una colección pequeña construida a mano.
  Debe comprobar:
  - las cifras de una celda;
  - la cuenta huecos − excesos;
  - una posición marcada como de poca cobertura;
  - el orden de las necesidades.
- [ ] T025 [US3] Hacer que `core-real`, tras fusionar, escriba `specs/008-datos-reales-core/sumario.md` con las secciones:
  1. tabla demarcación × nivel;
  2. las 16 posiciones;
  3. nacionalidades;
  4. reparto de defectos, señalando la desviación (FR-011);
  5. excesos y propuestas de recolocación;
  6. **Necesidades para los 50 restantes**, como lista final priorizada.

  Si T021 dejó un fallo de `generador.test`, la primera necesidad debe ser la celda que lo provoca. Volver a ejecutar
  `pnpm --filter @fbd/fixtures core-real` y revisar el sumario con quickstart §6.

**Checkpoint**: la persona puede elegir los 50 leyendo solo «Necesidades».

---

## Phase 6: Polish & Cross-Cutting

- [ ] T026 [P] Ejecutar `pnpm typecheck`, `pnpm lint` y `pnpm test`: todo en verde, o fallos explicados en el informe.
- [ ] T027 [P] Añadir a `CLAUDE.md`, en «Datos del catálogo», que `data/core-real.json` es la fuente de las cartas
  1–250 y que se fusiona con `pnpm --filter @fbd/fixtures core-real`.
- [ ] T028 Ejecutar `graphify update .`.
- [ ] T029 Revisar `dudas.md` para que tenga los ids definitivos y esté ordenado por id. Hacer el informe final a la
  persona con:
  - los resultados de SC-001 a SC-008, incluida la desviación de SC-008 por los escudos (R10);
  - el peso de los retratos;
  - las pruebas ajustadas;
  - el resultado de `generador.test`;
  - el aviso sobre las partidas en curso (R12);
  - que la persona decide si conserva `retratos/` fuera del repositorio;
  - los comandos `git add`, `git commit` y `git push` sugeridos.

---

## Dependencies & Execution Order

- **Setup (T001–T002)** → **Foundational (T003–T009)** → US2 y US1.
- **US2 (T010–T012)**: depende de T002 (slugs). No depende de US1.
- **US1**:
  - T013–T017 dependen de T002, T005 y T006–T009, porque la validación necesita las selecciones. Los lotes van en
    serie, porque escriben el mismo fichero.
  - T018 depende de T017.
  - T019 se puede escribir en paralelo a los lotes; T020 depende de T018, T019 y US2 (T010).
  - T021 → T022.
- **US3**: T023 depende de T019, porque va en el mismo fichero. T024 se puede hacer en paralelo a T023 una vez fijada
  la firma. T025 depende de T020, T021 y T023.
- **Polish**: al final.

## Parallel Examples

- Foundational: T007 (esquema) y T008 (banderas) a la vez, después de T006.
- US2 y US1: T010 (retratos) puede ir en paralelo a T013–T017 (redacción de fichas).
- US1: T019 (comando `core-real`) en paralelo a los lotes T013–T017.
- US3: T024 (prueba) en paralelo a T023.
- Polish: T026 y T027.

## Implementation Strategy

1. **MVP (US1, con US2 como requisito práctico)**: T001–T022. Core lleva los 250 reales con retrato, el catálogo valida
   y el juego carga.
2. **Incremento US3**: T023–T025. El sumario sale del mismo comando, así que cada edición de la persona en
   `core-real.json` lo regenera.
3. **Cierre**: T026–T029.
