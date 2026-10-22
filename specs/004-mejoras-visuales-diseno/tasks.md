---

description: "Lista de tareas de la spec 004: mejoras visuales y de diseño"
---

# Tasks: Mejoras visuales y de diseño (GUI + UX)

**Input**: documentos de diseño en `/specs/004-mejoras-visuales-diseno/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md) (R1–R15), [data-model.md](./data-model.md), [contracts/ui.md](./contracts/ui.md), [quickstart.md](./quickstart.md)

**Tests**: sí. FR-040 exige pruebas e2e de diseño en CI, y el plan define tres pruebas unitarias (`tokens.test.ts`, `colores.test.ts` y `nombreRecortado.test.ts`). Las pruebas de cada historia se escriben antes que su implementación y deben fallar primero.

**Organización**: las tareas se agrupan por historia de usuario. El orden de las fases sigue el orden de construcción del plan (US1 → US2 → US4 → US5 → US3). US3, US4 y US5 tienen la misma prioridad (P2), y US4 va antes porque deja montadas las pruebas de diseño que usan las demás.

## Formato: `[ID] [P?] [Story] Descripción`

- **[P]**: se puede hacer en paralelo (ficheros distintos, sin dependencias pendientes).
- **[Story]**: historia a la que pertenece (US1 a US5).
- Todas las rutas son relativas a la raíz del repositorio.

## Reglas comunes a todas las tareas

- Sin tildes en identificadores, clases ni valores (`Insignia`, `informacion`, `necesitaContorno`); las tildes solo en los textos visibles (CLAUDE.md).
- pnpm sin excepciones; el paquete web es `@fbd/web`.
- Ningún color, radio, sombra ni familia tipográfica literal fuera de `apps/web/src/estilos/tokens.css` (FR-037). Excepciones: degradados internos de las cartas en `cartas.css`, el césped y las líneas del campo 2D, y los colores de equipación que vienen de los datos.
- No cambia ningún comportamiento (FR-038): no se tocan `packages/*` ni `apps/server`. Si una prueba e2e existente falla por un texto renombrado según FR-035, se actualiza el selector y se anota el cambio en [contracts/ui.md](./contracts/ui.md).
- Los agentes no hacen `git commit` ni `git push`.
- Después de modificar código, ejecutar `graphify update .`.

---

## Phase 1: Setup (infraestructura compartida)

**Purpose**: dependencias, ficheros de tipografía y scripts que necesita el resto de fases.

- [X] T001 Añadir `@axe-core/playwright` como dependencia de desarrollo de `@fbd/web` con `pnpm --filter @fbd/web add -D @axe-core/playwright` (única dependencia nueva de la spec, research R13); comprobar que `apps/web/package.json` la recoge y que no se genera `package-lock.json`
- [X] T002 [P] Añadir los ficheros `apps/web/public/fuentes/barlow-400.woff2`, `barlow-500.woff2` y `barlow-600.woff2` (Barlow, SIL OFL 1.1, subconjunto latino, ≈ 20–25 KB cada uno; total añadido ≤ 120 KB) y ampliar `apps/web/public/fuentes/LICENCIA` para que nombre también la familia Barlow (FR-039, research R2)
- [X] T003 [P] Crear `apps/web/scripts/comprobar-tokens.mjs` (Node puro, sin dependencias): recorre `apps/web/src/**/*.{css,ts,tsx}` y falla con código 1 listando fichero y línea si encuentra literales `#rgb`/`#rrggbb`/`#rrggbbaa`, `rgb(`/`rgba(`/`hsl(`, `border-radius` con valor numérico o `box-shadow` con valor literal fuera de `src/estilos/tokens.css`, `src/estilos/cartas.css` y una lista de excepciones declarada al principio del script (`src/campo2d/renderizador.ts` solo para césped y líneas, `src/pantallas/PruebasCartas.tsx`, `src/componentes/colores.ts` para la conversión de colores de equipación) (research R5)
- [X] T004 Añadir el script `"lint:tokens": "node scripts/comprobar-tokens.mjs"` en `apps/web/package.json` y encadenarlo en el script `lint` de `package.json` de la raíz (`eslint . && pnpm --filter @fbd/web lint:tokens`). Hasta que termine US1 fallará; es lo esperado (depende de T003)
- [X] T005 [P] Crear la carpeta `apps/web/tests/e2e/diseno/` y añadirla a la configuración de `apps/web/playwright.config.ts` si el `testDir` o el `testMatch` actuales no la incluyen ya

---

## Phase 2: Foundational (prerrequisitos bloqueantes)

**Purpose**: la fuente única de valores visuales, las tipografías y las piezas que usan todas las historias.

**⚠️ CRITICAL**: ninguna historia puede empezar hasta terminar esta fase.

- [X] T006 Crear `apps/web/src/estilos/tokens.css` con un único bloque `:root` (sin `@media (prefers-color-scheme)`) y `color-scheme: dark`, con exactamente estos tokens (data-model §1, research R4, R5 y R10):
  - superficies: `--color-lienzo: #111111`, `--color-panel: #1f1f21`, `--color-elevado: #28282a`, `--color-borde: #28282a`, `--color-divisor: #39393b`, `--color-borde-marco: #707072`, `--color-borde-control: #8a8a8d`;
  - texto: `--color-texto: #ffffff`, `--color-texto-suave: #a8a8ad`;
  - acción: `--color-accion: #b7ff2c`, `--color-accion-texto: #000000`, `--color-apagado: #3a3a3d`;
  - estado: `--color-advertencia: #ffd000`, `--color-error: #ff6b5e`;
  - niveles: `--nivel-superclase: #a9b8cc`, `--nivel-epico: #c49bff`, `--nivel-legendario: #ee9a4d`, `--nivel-goat: #ff7eb6`;
  - tipografía: `--letra-texto: 'Barlow', 'Barlow Fallback', sans-serif`, `--letra-cartel: 'Barlow Condensed', 'Barlow Condensed Fallback', sans-serif`;
  - escala: `--texto-pequeno: 14px` (interlineado 1.5), `--texto-cuerpo: 16px` (1.5), `--texto-subtitulo: 20px` (1.4), `--titulo-pequeno: 24px` (1.2), `--titulo-grande: clamp(32px, 5vw, 48px)` (1.0), `--cartel: clamp(56px, 13vw, 110px)` (0.85), `--cartel-marcador: clamp(48px, 10vw, 96px)` (0.9), con sus `--interlineado-*`;
  - espaciado `--espacio-1` … `--espacio-16` (múltiplos de 4 px), `--radio: 6px`, `--sombra-barra: 0 2px 6px rgb(17 17 17 / 12.5%)` (única sombra, FR-008);
  - medidas: `--boton-principal-alto: 48px`, `--barra-principal-alto`, `--objetivo-tactil: 44px`, `--ancho-lectura: 72ch`, `--ancho-pantalla: 1200px`;
  - movimiento: `--duracion-corta: 150ms`, `--duracion-media: 250ms`, `--curva-salida: cubic-bezier(0.2, 0, 0, 1)`, y un bloque `@media (prefers-reduced-motion: reduce)` que las reduce a ≤ 100 ms
- [X] T007 [P] Crear `apps/web/src/estilos/fuentes.css`: mover desde `apps/web/src/estilos/base.css` las dos `@font-face` de Barlow Condensed (600 y 800) y añadir las de Barlow 400, 500 y 600 desde `/fuentes/`, todas con `font-display: swap`; añadir `@font-face` locales `Barlow Fallback` (sobre `local('Arial')`) y `Barlow Condensed Fallback` (sobre `local('Arial Narrow'), local('Arial')`) con `size-adjust`, `ascent-override`, `descent-override` y `line-gap-override` calculados a partir de las métricas de los woff2, anotando los valores de origen en un comentario (research R3, SC-009)
- [X] T008 [P] Añadir en `apps/web/index.html` dos `<link rel="preload" as="font" type="font/woff2" crossorigin>` para `/fuentes/barlow-400.woff2` y `/fuentes/barlow-condensed-800.woff2`, y `<meta name="color-scheme" content="dark">` (research R3, FR-001)
- [X] T009 Importar en `apps/web/src/main.tsx`, antes de `./estilos/base.css` y en este orden, `./estilos/tokens.css`, `./estilos/fuentes.css` y `./estilos/componentes.css` (crear `componentes.css` vacío con un comentario de cabecera; se llena en US1) (depende de T006, T007)
- [X] T010 [P] Crear `apps/web/src/componentes/Icono.tsx`: componente `Icono({ nombre, etiqueta?, tamano? })` con SVG en línea, `fill`/`stroke` en `currentColor`, `aria-hidden="true"` si no hay `etiqueta` y `role="img"` + `aria-label` si la hay; tipo `NombreIcono = 'gol' | 'amarilla' | 'roja' | 'cambio' | 'lesion' | 'informacion' | 'exito' | 'advertencia' | 'error' | 'menu' | 'cerrar' | 'sonido' | 'sinSonido'` (research R7)
- [X] T011 [P] Escribir `apps/web/tests/unit/colores.test.ts`: `necesitaContorno(color, fondo)` devuelve verdadero para `#000000`, azul marino `#0b1f3a` y gris oscuro `#222222` sobre `#111111`, y falso para `#ffffff` y `#b7ff2c` (umbral: contraste < 1,5:1, research R11). Debe fallar antes de T012
- [X] T012 Añadir a `apps/web/src/componentes/colores.ts` las funciones puras exportadas `contraste(a, b)` (luminancia relativa WCAG 2.1) y `necesitaContorno(color, fondo)` que devuelve `contraste(color, fondo) < 1.5` (research R11; depende de T011)
- [X] T013 [P] Escribir `apps/web/tests/unit/tokens.test.ts`: lee `apps/web/src/estilos/tokens.css`, extrae los valores de color y comprueba con `contraste` de `colores.ts` cada par de R4: `--color-texto`, `--color-texto-suave`, `--color-error`, `--color-advertencia` y los cuatro `--nivel-*` ≥ 4,5:1 sobre lienzo, panel y elevado; `--color-borde-control` ≥ 3:1 sobre los tres; `--color-accion` ≥ 3:1 sobre los tres (foco); `--color-accion-texto` sobre `--color-accion` ≥ 4,5:1; `--color-texto-suave` sobre `--color-apagado` ≥ 4,5:1; y que no exista ningún `prefers-color-scheme` en el fichero (depende de T006, T012)
- [X] T014 Crear la ayuda `apps/web/tests/e2e/diseno/comprobaciones.ts` con `comprobarDiseno(page, nombre, opciones?)` que, para cada ancho de `[360, 683, 768, 1366, 1920]`, cambia el tamaño de la ventana y comprueba (research R13, contracts/ui.md §1):
  1. `document.documentElement.scrollWidth <= clientWidth`;
  2. `AxeBuilder` con etiquetas `wcag2a`, `wcag2aa`, `wcag21aa` sin infracciones (excluyendo el `<canvas>` del campo 2D);
  3. número de elementos visibles con `background-color` calculado igual al lima ≤ `opciones.maxLima ?? 1` (2 en el descanso contra un NPC, 003/FR-006a);
  4. como mucho un `button.secundario.alternativa` visible;
  5. al recorrer con Tab hasta 40 pasos, cada elemento enfocado tiene `outline-width` ≥ 2 px y `outline-color` igual al lima;
  6. ningún elemento con `text-transform: uppercase`.

  Cada fallo indica la pantalla, el ancho y el selector (depende de T001, T005)

**Checkpoint**: tokens, tipografías, iconos, `necesitaContorno` y la ayuda de comprobación listos; `pnpm test` pasa `tokens.test.ts` y `colores.test.ts`.

---

## Phase 3: User Story 1 - Una identidad visual coherente en todas las pantallas (Priority: P1) 🎯 MVP

**Goal**: todas las pantallas del inventario comparten lienzo oscuro, tipografía, paneles, botones, campos y avisos, sin tema claro.

**Independent Test**: recorrer el inventario (data-model §3) con `checklists/visual.md` y comprobar paleta, tipografía, paneles, botones, esquinas y superficies planas; `tema.spec.ts` confirma el tema oscuro con el modo claro emulado; `pnpm lint` pasa `lint:tokens`.

### Tests for User Story 1 ⚠️

- [X] T015 [P] [US1] Escribir `apps/web/tests/e2e/diseno/tema.spec.ts` (parte de tema): con `test.use({ colorScheme: 'light' })`, en Inicio sin sesión, Mis partidas y una pantalla de partida, el `background-color` calculado de `body` es `rgb(17, 17, 17)`, ningún panel (`.panel`, `.modal`, `fieldset`) tiene fondo claro, y los botones, paneles, diálogos y campos tienen `border-radius` de 6 px y ningún `background-image` ni `box-shadow` fuera de `.barra-navegacion` y de las cartas (contracts/ui.md §1, FR-001, FR-007, FR-008)

### Implementation for User Story 1

- [X] T016 [US1] Reducir `apps/web/src/estilos/base.css`: eliminar el bloque `:root` de variables propias, el `@media (prefers-color-scheme: dark)` (y cualquier regla de tema claro) y las `@font-face` ya movidas; sustituir todos los colores, radios, sombras, familias y tamaños literales por tokens de `tokens.css`; fijar en `body` `background: var(--color-lienzo)`, `color: var(--color-texto)`, `font-family: var(--letra-texto)`, `font-size: var(--texto-cuerpo)`, `line-height: 1.5`; quitar degradados y sombras de contenedores de interfaz (FR-001, FR-008, FR-037)
- [X] T017 [US1] Escribir en `apps/web/src/estilos/componentes.css` los estilos comunes sobre tokens, con todos sus estados (normal, `:hover`, `:active`, `:focus-visible`, `:disabled`/`[aria-disabled="true"]`) según data-model §2 y research R7:
  - `.boton-principal`: fondo `--color-accion`, texto `--color-accion-texto`, alto `--boton-principal-alto`, radio `--radio`; desactivado con fondo `--color-apagado` y texto `--color-texto-suave` (sin lima, FR-012);
  - `button.secundario`: contorno 1 px `--color-borde-control`, texto blanco, fondo transparente; `button.secundario.alternativa`: contorno y texto `--color-accion`; `button.texto`: sin contorno; `button.peligro`: contorno y texto `--color-error`;
  - `input`, `select`, `textarea`: fondo `--color-elevado`, borde `--color-borde-control`, `[aria-invalid="true"]` con borde `--color-error`; `input[type=checkbox|radio]` con `accent-color: var(--color-accion)`;
  - `.pestanas` con `role="tablist"` (pestaña activa con subrayado lima de 2 px, sin relleno lima);
  - `.panel`, `fieldset`, `.modal`/`dialog.modal`: fondo `--color-panel`, borde 1 px `--color-borde`, radio `--radio`, relleno `--espacio-5`/`--espacio-6`;
  - `.tabla`, `.clasificacion`, `.estadisticas`: cifras `font-variant-numeric: tabular-nums` alineadas a la derecha, filas separadas por `--color-divisor`;
  - `.etiqueta`, `.nota`, `.exito` y texto secundario en `--color-texto-suave`;
  - foco global: `:focus-visible { outline: 2px solid var(--color-accion); outline-offset: 2px }` y, sobre `.boton-principal`, un anillo interior de `--color-lienzo` para mantener ≥ 3:1 (FR-030);
  - titulares `h1`/`h2`/`h3` con `--titulo-grande`/`--titulo-pequeno`, `h1` en `--letra-cartel`; párrafos con `max-width: var(--ancho-lectura)` (FR-010);
  - `@media (pointer: coarse)`: todo control interactivo con `min-height` y `min-width` `--objetivo-tactil` (FR-032)
- [X] T018 [US1] Aplicar en `apps/web/src/estilos/base.css` la maquetación común: contenedor `.pantalla` con `max-width: var(--ancho-pantalla)`, alineado a la izquierda, separación entre secciones `--espacio-12`–`--espacio-16` (la mitad por debajo de 720 px) y entre elementos `--espacio-4`–`--espacio-5` (FR-009); sin centrar titulares salvo `.pantalla-final` (research R1)
- [X] T019 [P] [US1] Recalibrar `apps/web/src/estilos/cartas.css` para el fondo oscuro: los colores de nivel usados fuera de la carta (texto de nivel, insignias, `FichaJugador`) pasan a `var(--nivel-superclase|epico|legendario|goat)`; comprobar que el `--carta-marco` de cada nivel da ≥ 3:1 sobre `--color-panel` y aclararlo si no; quitar el `text-transform: uppercase` de la línea ≈210 (escribir el texto ya en su forma visible); conservar degradados y efectos internos de las cartas y sobres (FR-004, FR-008, 002/FR-002, 003/FR-008)
- [X] T020 [US1] Rehacer la barra de navegación de escritorio en `apps/web/src/app/Marco.tsx` y su estilo `.barra-navegacion` en `apps/web/src/estilos/componentes.css`: fondo `--color-lienzo`, `--sombra-barra`, "Fútboosterdraft" a la izquierda en `--letra-cartel` 600, enlaces "Inicio", "Mis partidas", "Nueva partida" y "Mi perfil"/"Iniciar sesión" en blanco, destino activo con `aria-current="page"` y subrayado de 2 px lima; interruptor de sonido como `button.texto` con `<Icono nombre="sonido"|"sinSonido">` en lugar de los emojis 🔊/🔇 de la línea ≈108 (FR-012a, contracts/ui.md §2; el menú móvil va en US4)
- [X] T021 [US1] Adaptar `apps/web/src/campo2d/renderizador.ts` para leer al montar el lienzo los colores de interfaz (texto de dorsales, contornos, franjas) con `getComputedStyle(document.documentElement).getPropertyValue('--color-…')` en vez de literales; el césped `#2f7d3b` y las líneas siguen como constantes; para el contorno de los jugadores usar `necesitaContorno` de `colores.ts` con `--color-borde-control` (research R6, R11, FR-034)
- [X] T022 [P] [US1] Revisar los componentes compartidos para que usen las clases de `componentes.css` y ningún estilo en línea con colores literales: `apps/web/src/componentes/BarraPrincipal.tsx`, `BotonAvanzar.tsx`, `SelectorModo.tsx`, `CampoNombreEquipo.tsx`, `EditorEquipacion.tsx`, `EditorDorsales.tsx`, `EditorLanzadores.tsx`, `PanelTactica.tsx`, `GestionEquipo.tsx`, `Estadisticas.tsx`, `FichaJugador.tsx` (sin cambiar su lógica, FR-038)
- [X] T023 [US1] Revisar las pantallas `apps/web/src/pantallas/*.tsx` (salvo `PruebasCartas.tsx`) para quitar estilos en línea con colores, radios o sombras literales y usar `.panel`, `.tabla` y las clases de botón (`.secundario`, `.texto`) de `componentes.css`; ningún cambio de lógica (FR-011, FR-038)
- [X] T024 [US1] Ejecutar `pnpm lint` y corregir hasta que `lint:tokens` no dé ningún literal fuera de las excepciones de T003; ejecutar `pnpm test`, `pnpm typecheck` y `pnpm --filter @fbd/web e2e tests/e2e/diseno/tema.spec.ts` (FR-037)

**Checkpoint**: todas las pantallas adoptan el tema oscuro común; MVP visual entregable.

---

## Phase 4: User Story 2 - Saber siempre qué hacer a continuación (Priority: P1)

**Goal**: el lima marca solo la acción principal; los estados de carga, vacío, error, desactivado y confirmación dicen qué pasa y qué hacer.

**Independent Test**: en cada pantalla del flujo, `comprobarDiseno` cuenta ≤ 1 elemento relleno de lima; provocar "Mis partidas" vacía, un error de formulario, un corte de conexión y una confirmación, y comprobar textos e iconos de contracts/ui.md §7–§9.

### Tests for User Story 2 ⚠️

- [X] T025 [P] [US2] Escribir `apps/web/tests/e2e/diseno/estados.spec.ts`: "Mis partidas" sin partidas muestra "Todavía no tienes partidas. Crea una para abrir tus primeros sobres." y el botón principal "Nueva partida"; guardar el perfil muestra un aviso con el texto "Perfil guardado"; un nombre de equipo de 2 caracteres muestra bajo el campo "El nombre del equipo debe tener entre 3 y 24 caracteres." con `aria-invalid="true"` y `aria-describedby`; el botón principal desactivado no tiene fondo lima y muestra su motivo al lado (contracts/ui.md §7, §8; 003/FR-007)

### Implementation for User Story 2

- [X] T026 [P] [US2] Crear `apps/web/src/componentes/Aviso.tsx` con `TipoAviso = 'informacion' | 'exito' | 'advertencia' | 'error'`: superficie `--color-panel`; borde izquierdo `--color-divisor` (informacion, exito), 3 px `--color-advertencia` (advertencia) o 3 px `--color-error` (error); `Icono` del tipo (blanco, blanco, ámbar, rojo); texto siempre presente; botón cerrar opcional con `aria-label="Cerrar aviso"`; ningún uso del lima (data-model §2, FR-003)
- [X] T027 [US2] Crear en `apps/web/src/componentes/Aviso.tsx` la región de avisos apilados `RegionAvisos` y un almacén Zustand mínimo en `apps/web/src/estado/avisos.ts` (`mostrarAviso(tipo, texto, { duracionMs?, persistente? })`, `cerrarAviso(id)`): región fija sobre la `BarraPrincipal`, `aria-live="polite"` (`assertive` para `error`), máximo 3 visibles con los nuevos arriba, el resto agrupado en "y N avisos más" con enlace a la bandeja; los de `exito` desaparecen a los 4 s; montarla en `apps/web/src/app/Marco.tsx` (contracts/ui.md §9, research R12; depende de T026)
- [X] T028 [P] [US2] Crear `apps/web/src/componentes/EstadoVacio.tsx` (`mensaje`, `accion?: ReactNode`) sobre `.panel`, texto en `--color-texto-suave`, sin ilustraciones (FR-025)
- [X] T029 [P] [US2] Crear `apps/web/src/componentes/Esqueleto.tsx` con variantes `filas` (n filas de tabla), `cartas` (rejilla de n cartas) y `campo`; bloques `--color-elevado` con pulso solo de `opacity`, desactivado con `prefers-reduced-motion`; `aria-busy="true"` y texto oculto "Cargando…" en `.solo-lectores` (FR-024, research R12)
- [X] T030 [US2] Sustituir cada `<p className="cargando">Cargando…</p>` por el `Esqueleto` con la forma de su contenido en `apps/web/src/pantallas/MisPartidas.tsx` (filas), `Draft.tsx` (cartas), `Plantillas.tsx` y `Alineacion.tsx` (campo), `Partido.tsx`, `PartidoRapido.tsx`, `Partido2D.tsx`, `ReproduccionPartido.tsx` (campo), `Sala.tsx`, `Perfil.tsx` y `Torneo.tsx` (filas), y en `apps/web/src/app/Rutas.tsx`; eliminar la regla `.cargando` de `base.css` (depende de T029)
- [X] T031 [US2] Añadir los estados vacíos con los textos exactos de contracts/ui.md §7 usando `EstadoVacio`: `apps/web/src/pantallas/MisPartidas.tsx` (sin partidas → botón principal "Nueva partida"; filtro sin terminadas → "No has terminado ninguna partida."), `apps/web/src/componentes/BandejaAvisos.tsx` ("No tienes avisos."), `apps/web/src/pantallas/Torneo.tsx` (pendientes de ver → "Has visto todos los partidos de esta jornada." + secundario "Ver clasificación") y `apps/web/src/pantallas/Sala.tsx` (sin rivales humanos → "Solo estás tú. Puedes empezar contra la IA o esperar a que alguien se una con el enlace." + secundario "Copiar enlace") (depende de T028)
- [X] T032 [US2] Añadir las confirmaciones con `mostrarAviso('exito', …)` y los textos de contracts/ui.md §8: "Perfil guardado" en `apps/web/src/pantallas/Perfil.tsx`, "Alineación confirmada" en `apps/web/src/pantallas/Alineacion.tsx`, "Te has unido a la partida" y "Enlace copiado" en `apps/web/src/pantallas/Sala.tsx`, "Cambios confirmados" en `apps/web/src/componentes/GestionEquipo.tsx` (FR-027; depende de T027)
- [X] T033 [US2] Revisar los errores: estado de conexión en `apps/web/src/conexion/useConexion.ts`/`apps/web/src/app/Marco.tsx` como `Aviso` `advertencia` persistente "Sin conexión con el servidor. Reintentando…" con botón "Reintentar ahora", que pasa a `error` al agotar el reintento; errores del servidor mostrados con `Aviso` `error` reutilizando el texto de 003 sin disculpas (`apps/web/src/api/cliente.ts` y pantallas que lo pintan); errores de formulario bajo su campo con `aria-invalid` y `aria-describedby` en `apps/web/src/componentes/CampoNombreEquipo.tsx` y `apps/web/src/pantallas/CrearPartida.tsx` (FR-026; depende de T027)
- [X] T034 [US2] Migrar `apps/web/src/componentes/AvisoPartido.tsx` y `AvisoDorsales.tsx` a `Aviso` de tipo `advertencia` dentro de `RegionAvisos`, y `BandejaAvisos.tsx` a la lista sobre `.panel` con `Icono` por tipo, sin emojis (FR-003, contracts/ui.md §9; depende de T027)
- [X] T035 [US2] Revisar el uso del lima pantalla por pantalla en `apps/web/src/pantallas/*.tsx` y `apps/web/src/componentes/BarraPrincipal.tsx`: solo `.boton-principal` relleno de lima; marcar como `secundario alternativa` solo la alternativa directa al principal (p. ej. "Ver en 2D" frente a "Simular" en `Partido.tsx`), como máximo una por pantalla; el resto, `secundario` gris o `texto`; botón principal desactivado con `aria-disabled="true"` y motivo visible (FR-002, FR-012, SC-002)
- [X] T036 [US2] Revisar los textos de `apps/web/src/**/*.tsx` según FR-035 y FR-036: minúscula inicial salvo nombres propios, sin mayúsculas sostenidas, verbos concretos en los botones ("Confirmar alineación", no "Enviar"), el mismo nombre para cada acción en todo el flujo, sin etiquetas decorativas sobre los títulos ni numeraciones que no sean secuencias reales; conservar las etiquetas de botón principal de 003/contracts/ui.md; actualizar los selectores de `apps/web/tests/e2e/*.spec.ts` afectados y anotar cada renombrado en `specs/004-mejoras-visuales-diseno/contracts/ui.md`
- [X] T037 [US2] Ejecutar `pnpm --filter @fbd/web e2e tests/e2e/diseno/estados.spec.ts` y `tests/e2e/boton-principal.spec.ts` y corregir hasta que pasen

**Checkpoint**: US1 y US2 funcionan juntas; el lima solo marca la acción y todos los estados tienen respuesta.

---

## Phase 5: User Story 4 - Cómoda en el móvil y accesible para todos (Priority: P2)

**Goal**: sin desplazamiento horizontal de 360 a 1920 px ni al 200 %, foco visible, flujo completo con teclado, menú móvil accesible, nombres largos recortados con etiqueta, movimiento reducido y comprobaciones en CI.

**Independent Test**: `pnpm --filter @fbd/web e2e tests/e2e/diseno` en verde (inventario, teclado, nombres, menú, tema) y el trabajo `e2e-diseno` de CI en verde.

### Tests for User Story 4 ⚠️

- [X] T038 [P] [US4] Escribir `apps/web/tests/unit/nombreRecortado.test.ts` para la lógica pura de pulsación larga que exportará `apps/web/src/componentes/NombreRecortado.tsx` (p. ej. `crearDetectorPulsacion({ retardoMs: 500, toleranciaPx: 10 })`): dispara a los 500 ms si el dedo no se mueve; se cancela si se mueve > 10 px o se levanta antes; tras disparar, marca que el `click` siguiente debe anularse; ignora `pointerType` distinto de `touch` (research R9). Debe fallar antes de T044
- [X] T039 [P] [US4] Escribir `apps/web/tests/e2e/diseno/menu.spec.ts`: a 360 × 640 se ve el nombre del juego y el botón "Menú" con `aria-expanded="false"` y `aria-controls`; al pulsarlo se abre el `<dialog>` modal con los enlaces y el sonido y `aria-expanded="true"`; Escape lo cierra y el foco vuelve a "Menú"; el botón "Cerrar" y elegir un enlace también lo cierran; tras cerrarse el botón principal es visible y pulsable (FR-012a, contracts/ui.md §2)
- [X] T040 [P] [US4] Escribir `apps/web/tests/e2e/diseno/nombres.spec.ts`: con un equipo de nombre de 24 caracteres y un jugador de nombre largo, el texto se recorta con puntos suspensivos sin desbordar el panel, el marcador ni la tabla; aparece la etiqueta con el texto completo al señalar (400 ms), al enfocar el contenedor y, con `hasTouch: true` e `isMobile: true`, al mantener pulsado 500 ms con `page.touchscreen`; mantener pulsado el nombre dentro de una carta del draft no la elige y no abre el menú contextual (Edge Cases, contracts/ui.md §10)
- [X] T041 [US4] Completar `apps/web/tests/e2e/diseno/tema.spec.ts` con la parte de movimiento: con `reducedMotion: 'reduce'` emulado, ningún elemento de la pantalla (salvo las cartas y sobres de 003/FR-015) tiene `transition-duration` o `animation-duration` > 100 ms al abrir el menú, un diálogo y cambiar de pestaña (FR-033; depende de T015)
- [X] T042 [US4] Escribir `apps/web/tests/e2e/diseno/inventario.spec.ts`: una partida en solitario contra NPC con el reloj simulado, reutilizando `partidaTrasDraft` y demás flujos de `apps/web/tests/e2e/ayudas.ts` y los de `torneo-final.spec.ts`, que llama a `comprobarDiseno(page, nombre)` en cada pantalla de data-model §3 marcada con "inv" (1–5, 7–22; Sala con el flujo de `draft-varios.spec.ts`), con `maxLima: 2` en el descanso contra un NPC; en `pointer: coarse` emulado comprueba además que cada control visible mide ≥ 44 × 44 px (FR-031, FR-032, FR-040; depende de T014)
- [X] T043 [US4] Escribir `apps/web/tests/e2e/diseno/teclado.spec.ts`: crear partida → draft → formación → partido → torneo solo con `page.keyboard` (Tab, Shift+Tab, Enter, Espacio, flechas), comprobando en cada paso que el elemento enfocado tiene contorno lima ≥ 2 px (SC-007; depende de T014)

### Implementation for User Story 4

- [X] T044 [US4] Crear `apps/web/src/componentes/NombreRecortado.tsx` (`texto`, `como?`): elemento con `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`, que solo actúa si `scrollWidth > clientWidth`; etiqueta `popover="manual"` enlazada con `aria-describedby`, visible al señalar con ratón (400 ms), al enfocar el contenedor enfocable más cercano y con pulsación larga táctil de 500 ms (Pointer Events, cancelada si el dedo se mueve > 10 px); si se mostró la etiqueta, anula el `click` siguiente con `preventDefault()` y `stopPropagation()` en fase de captura; anula `contextmenu`; `-webkit-touch-callout: none` y `user-select: none` en el texto; texto completo accesible a lectores de pantalla. Exportar la lógica pura de T038 (research R9; depende de T038)
- [X] T045 [US4] Usar `NombreRecortado` para nombres de equipo, de jugador y de partida en `apps/web/src/componentes/CartaJugador.tsx`, `ResultadoPartido.tsx`, `FichaJugador.tsx`, `Estadisticas.tsx`, `CampoEquipo.tsx`, y en `apps/web/src/pantallas/MisPartidas.tsx`, `Sala.tsx`, `Torneo.tsx` (clasificación y cuadro), `PartidoRapido.tsx` y `Partido2D.tsx` (depende de T044)
- [X] T046 [US4] Crear `apps/web/src/componentes/MenuNavegacion.tsx` y usarlo en `apps/web/src/app/Marco.tsx` por debajo de 720 px: botón "Menú" (`<Icono nombre="menu">`, `aria-expanded`, `aria-controls`) que abre un `<dialog>` con `showModal()` con los enlaces y el interruptor de sonido; se cierra con Escape (nativo), con el botón "Cerrar" y al elegir un enlace; en el evento `close` devuelve el foco al botón con `ref.focus()`; panel a pantalla completa a 360 px y de 320 px en tabletas, deslizándose desde la derecha con `transform` en `--duracion-media`, inmediato con movimiento reducido (FR-012a, research R8)
- [X] T047 [US4] Rehacer la franja compacta del partido 2D en `apps/web/src/app/Marco.tsx` (40 px, 003): iconos `Icono` con `aria-label`, sin emojis (contracts/ui.md §2)
- [X] T048 [US4] Corregir el desplazamiento horizontal en `apps/web/src/estilos/base.css` y `componentes.css`: contenedores de tabla con `overflow-x: auto`, `tabindex="0"` y `aria-label` en el marcado de `apps/web/src/componentes/Estadisticas.tsx` y `apps/web/src/pantallas/Torneo.tsx`; `min-width: 0` en hijos de rejillas y flex; rejillas de cartas y de dorsales que se pliegan a 360 px; cartel con `<wbr>` en "Fútbooster<wbr>draft" (FR-006, FR-021, FR-031)
- [X] T049 [US4] Asegurar el acceso por teclado en los controles que hoy dependen del ratón: colocar y cambiar jugadores en `apps/web/src/componentes/CampoEquipo.tsx` (selección con Enter/Espacio y destino con flechas o Enter), elección de carta en `apps/web/src/pantallas/Draft.tsx`, pestañas con `role="tab"` y flechas en las pantallas que usan `.pestanas`, y diálogos (`.modal`) con foco atrapado y Escape; sin cambiar la interacción con ratón ni tacto (FR-030, 003/FR-001 a FR-005)
- [X] T050 [US4] Añadir en `apps/web/src/estilos/componentes.css` la regla global `@media (prefers-reduced-motion: reduce)` que deja transiciones y animaciones en ≤ 100 ms o ninguna, salvo las de cartas y sobres (`cartas.css`, 003/FR-015); limitar las animaciones de interfaz a `opacity` y `transform`; eliminar efectos de señalado decorativos en tarjetas y animaciones de entrada por sección en `base.css` (FR-028, FR-033, research R10)
- [X] T051 [US4] Añadir el trabajo `e2e-diseno` a `.github/workflows/ci.yml`: servicio `postgres:16`, `pnpm install --frozen-lockfile`, `pnpm db:migrate`, `pnpm seed --file data/core.json`, `pnpm --filter @fbd/web exec playwright install --with-deps chromium` y `pnpm --filter @fbd/web e2e tests/e2e/diseno`, con las mismas variables de entorno de base de datos que el trabajo `ci` (research R13)
- [X] T052 [US4] Ejecutar `pnpm test` y `pnpm --filter @fbd/web e2e tests/e2e/diseno` y corregir en el código de la interfaz (nunca relajando las comprobaciones) hasta que pasen todas

**Checkpoint**: el suelo de calidad accesible está comprobado en CI para todas las pantallas.

---

## Phase 6: User Story 5 - Tablero de juego legible: draft, formación, partido y torneo (Priority: P2)

**Goal**: las pantallas de juego densas muestran la decisión en primer plano, el contexto en segundo, y tablas, eventos e insignias fáciles de escanear.

**Independent Test**: completar un draft, preparar la alineación, jugar en cada modalidad y consultar la clasificación, comprobando la tabla de contracts/ui.md §6; a 1366 × 768, cartas, temporizador y plantilla del draft visibles sin desplazarse.

### Tests for User Story 5 ⚠️

- [X] T053 [P] [US5] Escribir `apps/web/tests/e2e/diseno/jerarquia.spec.ts`: a 1366 × 768, en el draft, la rejilla de cartas, el temporizador y la plantilla acumulada están dentro del viewport sin desplazarse; en la clasificación del torneo la fila propia tiene fondo `--color-elevado` y borde izquierdo lima de 3 px, las cifras usan `tabular-nums` y alineación derecha; en el partido 2D el rectángulo de la franja no se superpone al del `<canvas>`; cada evento de `ResumenEventos` tiene un `svg` con nombre accesible y texto; las insignias de estado no tienen color lima, ámbar ni de error (salvo "Sin conexión") (FR-018, FR-020 a FR-023)

### Implementation for User Story 5

- [X] T054 [P] [US5] Crear `apps/web/src/componentes/Insignia.tsx` (`texto`, `tipo?: 'normal' | 'advertencia'`): borde `--color-divisor`, texto `--color-texto` o `--color-texto-suave`, radio `--radio`, `--texto-pequeno`; solo `advertencia` (para "Sin conexión") usa `--color-advertencia` con `Icono` (FR-023, contracts/ui.md §6)
- [X] T055 [US5] Reorganizar `apps/web/src/pantallas/Draft.tsx` y `.mesa-draft` en `apps/web/src/estilos/base.css`: rejilla de dos zonas a ≥ 1024 px (cartas disponibles dominantes a la izquierda; panel lateral con "Elección n de 24" en `--letra-cartel`, sobre actual, flecha de dirección de paso con `Icono`/texto, temporizador y plantilla acumulada por demarcación); por debajo, el contexto debajo de las cartas; temporizador en `--color-advertencia` con `Icono nombre="advertencia"` en los últimos 10 s; "Draft terminado" y `AperturaSobre` sin cambiar su animación (FR-018, contracts/ui.md §6)
- [X] T056 [P] [US5] Integrar `apps/web/src/pantallas/Plantillas.tsx`, `apps/web/src/pantallas/Alineacion.tsx`, `apps/web/src/componentes/CampoEquipo.tsx` y `PanelTactica.tsx` en el tema oscuro: campo con su césped, panel lateral `--color-panel` con banquillo, resto, táctica, dorsales, equipación y lanzadores como secciones plegables (`.seccion-plegable`), sin cambiar la interacción de 003/FR-001 a FR-005 (FR-019)
- [X] T057 [P] [US5] Rehacer la franja del partido 2D en `apps/web/src/pantallas/Partido2D.tsx` y `.marcador-2d`/`.velocidades` en `base.css`: franja superior de 48 px con marcador, reloj y velocidades como selector segmentado (`.pestanas` o `role="radiogroup"`), fuera del rectángulo del campo; los botones de 003/FR-006 y FR-027 conservan sus reglas (FR-020)
- [X] T058 [P] [US5] Ajustar las tablas de `apps/web/src/componentes/Estadisticas.tsx` y de la clasificación y goleadores de `apps/web/src/pantallas/Torneo.tsx`: clase `.tabla`, columnas numéricas alineadas a la derecha con `tabular-nums`, fila del participante con clase `.fila-propia` (fondo `--color-elevado`, borde izquierdo 3 px `--color-accion`) y contenedor desplazable de T048 (FR-021)
- [X] T059 [US5] Rehacer `apps/web/src/componentes/ResumenEventos.tsx`: cada evento como fila con el minuto en una columna de ancho fijo alineada a la derecha (`tabular-nums`) y un `Icono` (`gol`, `amarilla`, `roja`, `cambio`, `lesion`) con `etiqueta`, seguido del texto sin emojis (quitar "⚽" y "🟨" de los textos); igual en "Lo más destacado" y "Lo que ha pasado" en `apps/web/src/pantallas/PartidoRapido.tsx` y `ReproduccionPartido.tsx`, y en el distintivo de amarillas de `apps/web/src/componentes/GestionEquipo.tsx` (línea ≈138); actualizar `apps/web/tests/unit/resumenEventos.test.ts` a los textos sin emoji (FR-022)
- [X] T060 [US5] Sustituir los estados de fase, jornada, partidos pendientes de ver y conexión por `Insignia` en `apps/web/src/pantallas/Torneo.tsx`, `MisPartidas.tsx`, `Sala.tsx` y `apps/web/src/app/Marco.tsx` (FR-023; depende de T054)
- [X] T061 [US5] Ejecutar `pnpm --filter @fbd/web e2e tests/e2e/diseno/jerarquia.spec.ts tests/e2e/alineacion.spec.ts tests/e2e/dorsales.spec.ts tests/e2e/draft-solo.spec.ts tests/e2e/partido-2d.spec.ts tests/e2e/torneo.spec.ts` y corregir hasta que pasen

**Checkpoint**: las pantallas de juego tienen jerarquía clara sin cambios de interacción.

---

## Phase 7: User Story 3 - Una portada y unos momentos clave con carácter (Priority: P2)

**Goal**: portada con cartel, inicio con la acción más probable, marcadores de cartel y finales de torneo con titular protagonista.

**Independent Test**: abrir el inicio sin y con sesión, terminar un partido y un torneo, y comprobar el tratamiento de cartel (contracts/ui.md §3–§5).

### Tests for User Story 3 ⚠️

- [X] T062 [P] [US3] Escribir `apps/web/tests/e2e/diseno/portada.spec.ts`: sin sesión, a 1366 × 768 y a 360 × 640, el titular "Fútboosterdraft" (con `font-family` que empieza por "Barlow Condensed"), la entradilla "Abre sobres, elige a tus jugadores por turnos y gana el torneo con tu once." y el botón principal "Empezar a jugar" están dentro del viewport sin desplazarse, y el titular ocupa ≤ 2 líneas a 360 px; con sesión y una partida en curso, el botón principal es "Continuar partida" y lleva a la partida activa más reciente; sin partidas, es "Nueva partida" y "Mis partidas" es secundario (FR-014, FR-015)
- [X] T063 [P] [US3] Añadir a `apps/web/tests/e2e/diseno/portada.spec.ts` las comprobaciones de marcador y final: en el resultado de un partido, los goles usan `--letra-cartel` y `tabular-nums`, y cada nombre de equipo tiene su chapa; con una equipación negra lisa (configurada en «Mi perfil») la chapa tiene contorno; en la pantalla de campeón el titular "Campeones" es el elemento de mayor tamaño de fuente y, con `reducedMotion: 'reduce'`, no tiene animación (FR-016, FR-017, FR-034)

### Implementation for User Story 3

- [X] T064 [US3] Rehacer `apps/web/src/pantallas/Inicio.tsx` sin sesión: titular "Fútbooster<wbr>draft" en `--cartel` con interlineado 0,85, alineado a la izquierda; entradilla en `--texto-subtitulo`; botón principal "Empezar a jugar" que lleva al formulario de acceso o registro existente; sin ilustraciones ni fotografía; todo visible sin desplazarse a 1366 × 768 y 360 × 640 (FR-006, FR-014)
- [X] T065 [US3] Inicio con sesión en `apps/web/src/pantallas/Inicio.tsx`: si hay partida en curso, botón principal "Continuar partida" hacia la partida activa más reciente en su fase (sala, draft, formación, partido o torneo), usando los datos que ya expone `apps/web/src/estado/partidaActiva.ts` o la lista de partidas existente, sin nuevas llamadas al servidor; si no, "Nueva partida"; "Mis partidas" como `secundario` (FR-015)
- [X] T066 [P] [US3] Rehacer el marcador en `apps/web/src/componentes/ResultadoPartido.tsx` y `.marcador`/`.equipo-marcador`/`.chapa` en `apps/web/src/estilos/base.css`: goles en `--cartel-marcador` con `tabular-nums` separados por un guion corto; nombres en `--titulo-pequeno` con `NombreRecortado` y chapa del color principal de la equipación, con contorno 2 px `--color-borde-control` si `necesitaContorno(color, '#111111' leído de --color-lienzo)` es verdadero; penaltis debajo en `--texto-subtitulo` ("4-3 en los penaltis") (FR-016, FR-034, contracts/ui.md §4)
- [X] T067 [US3] Usar el mismo marcador de T066 en `apps/web/src/pantallas/PartidoRapido.tsx`, en la franja de `apps/web/src/pantallas/Partido2D.tsx` (tamaño reducido a la altura de 48 px) y en `apps/web/src/pantallas/ReproduccionPartido.tsx`; aplicar el contorno de `necesitaContorno` también a `apps/web/src/componentes/Camiseta.tsx` (FR-016, FR-034; depende de T066)
- [X] T068 [P] [US3] Rehacer `apps/web/src/pantallas/PantallaCampeon.tsx` y `apps/web/src/pantallas/PantallaDerrota.tsx` con `.pantalla-final`: titular centrado en `--cartel` ("Campeones" con el nombre del equipo debajo; "Eliminados" o "Subcampeones" en la final, con la ronda o la jornada debajo) como único protagonista; la ilustración (`.trofeo`, `.ilustracion-final`), si se conserva, más pequeña y en segundo plano; quitar destellos y balón rodando y la dependencia de `apps/web/src/componentes/particulas.ts` si deja de usarse (sin borrar el módulo si otras pantallas lo usan); una sola entrada del titular de ≈ 600 ms con `opacity` y `transform`, sin animación con movimiento reducido (FR-017, research R10)
- [X] T069 [US3] Ejecutar `pnpm --filter @fbd/web e2e tests/e2e/diseno/portada.spec.ts tests/e2e/torneo-final.spec.ts tests/e2e/partido-rapido.spec.ts tests/e2e/identidad.spec.ts` y corregir hasta que pasen

**Checkpoint**: todas las historias completas e independientemente comprobables.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: listas de verificación, no regresión completa y validación con personas.

- [X] T070 [P] Crear `specs/004-mejoras-visuales-diseno/checklists/visual.md`: una fila por cada una de las 23 entradas del inventario de data-model §3 y una columna por criterio (paleta, tipografía, paneles, botones, esquinas, superficies planas, estados de carga/vacío/error), a 1366 × 768 y 360 × 640, más los escenarios concretos de quickstart §4 (modo claro, fuentes bloqueadas, zoom 200 %, equipación negra, draft, final, pila de avisos) (SC-001, research R14)
- [X] T071 [P] Crear `specs/004-mejoras-visuales-diseno/checklists/validacion.md` con el formato de `specs/003-mejoras-ux-simulacion/checklists/validacion.md` y tres pruebas: SC-003 (cinco segundos, ≥ 9/10 señalan el botón en < 5 s), SC-004 (valoración 1–5 de `4168404` y de la nueva con ≥ 5 personas; media ≥ 4 y ≥ 1 punto de mejora; instrucciones `git worktree add ../fbd-4168404 4168404`) y SC-010 (tiempos de elección del draft y de confirmación de la alineación, ≤ los de `4168404`) (research R14)
- [X] T072 [P] Medir el peso de los woff2 añadidos en `apps/web/public/fuentes/` (≤ 120 KB en total) y comprobar con las herramientas de desarrollo bloqueando `/fuentes/*` que el texto se ve con la alternativa sin saltos apreciables; ajustar los `*-override` de `apps/web/src/estilos/fuentes.css` si hace falta (SC-009)
- [X] T073 Ejecutar la no regresión completa de quickstart §1 y §3: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration` y `pnpm e2e`; los resultados deben coincidir con `4168404`; solo se permiten cambios de selector por textos renombrados, anotados en `specs/004-mejoras-visuales-diseno/contracts/ui.md` (FR-038, SC-008)
- [ ] T074 Recorrer `specs/004-mejoras-visuales-diseno/checklists/visual.md` con `pnpm dev` y corregir cada fila que no pase (SC-001); revisar con capturas a 1366 × 768 y 360 × 640 según la skill `frontend-design`
- [X] T075 Ejecutar `graphify update .` y repasar `docs/diseno/DESIGN.md` y `specs/004-mejoras-visuales-diseno/quickstart.md` por si algún valor o comando ha cambiado durante la implementación
- [ ] T076 Realizar la validación con personas de `specs/004-mejoras-visuales-diseno/checklists/validacion.md` (SC-003, SC-004, SC-010) y anotar los resultados en el propio fichero

---

## Phase 9: Revisión 2026-10-21 — identidad, atmósfera y draft sin desplazamiento (FR-041 a FR-047)

**Motivo**: la primera ronda no se aprueba (ver Clarifications, sesión 2026-10-21). Dirección en [research.md](./research.md) R16.

- [X] T077 Actualizar spec, research (R16), tasks y la lista visual con la revisión
- [X] T078 Tokens v2 en `apps/web/src/estilos/tokens.css`: paleta «Noche de partido», escala de radios, sombras de elevación, vidrio, resplandores y texturas (grano, césped, cal); ajustar `tests/unit/tokens.test.ts`
- [X] T079 [P] Imágenes propias en `apps/web/src/componentes/arte/` (Escudo, SobreArte, Trofeo, Estadio) y `apps/web/public/favicon.svg`
- [X] T080 Atmósfera global (capa de estadio fija en `Marco.tsx`) y componentes v2 en `componentes.css`: barra con escudo, paneles de vidrio, botones con luz, campos, pestañas, tablas, avisos
- [X] T081 Cartas v2 en `cartas.css`: acabados premium por nivel, silueta nueva, brillo que sigue al puntero y relieve en las elegibles
- [X] T082 Draft sin desplazamiento (FR-046): mesa a pantalla completa, rejilla escalada, reloj circular, mesa y plantilla acumulada en el carril lateral; carrusel en móvil
- [X] T083 Apertura de sobres v2: sobre ilustrado, haz de luz y mesa escalada a la ventana
- [X] T084 Portada v2 (FR-045): composición con sobre abierto y cartas en abanico, pasos del juego, portada con sesión
- [X] T085 Pantallas de gestión v2: Nueva partida, Sala, Mis partidas y Perfil
- [X] T086 Plantillas y Formación v2: césped segado, fichas de jugador con camiseta, panel lateral
- [X] T087 Torneo, partido rápido, 2D, resultado y reproducción v2: cabecera de competición, marcador de retransmisión, clasificación con zonas
- [X] T088 Campeón y derrota v2: trofeo y estadio ilustrados, haz de luz y momento único
- [X] T089 Verificación: `pnpm typecheck`, `pnpm lint`, `pnpm test`, e2e de diseño y de no regresión; capturas a 1366 × 768 y 390 × 844 de cada pantalla

---

## Phase 10: Ronda 3 — pequeñas mejoras (FR-048 a FR-050)

**Motivo**: la segunda ronda se aprueba; tres mejoras antes de la spec 005 (ver Clarifications, ronda 3).

- [X] T090 Actualizar spec (FR-048 a FR-050), contracts/ui.md §4 y tasks con la ronda 3
- [X] T091 [P] Prueba unitaria `apps/web/tests/unit/goleadores.test.ts`: agrupa por jugador con los minutos en orden y sin dorsal, «pen.», propia puerta para el equipo beneficiado y aparte, ignora la tanda (FR-048)
- [X] T092 `goleadoresDe` en `apps/web/src/componentes/goleadores.ts` y lista `.goleadores` bajo el nombre de cada equipo en `Marcador.tsx`; pasarla en `ResultadoPartido.tsx`, `PartidoRapido.tsx` y el resumen de `ReproduccionPartido.tsx` (FR-048)
- [X] T093 Partido 2D y reproducción 2D a la medida de la ventana: `.partido-2d-mesa` con zona del campo (`container-type: size`, ancho `min(100cqw, 100cqh × 1000 / 640)`) y carril lateral de eventos con desplazamiento propio, en `Partido2D.tsx`, `ReproduccionPartido.tsx` y `base.css` (FR-049)
- [X] T094 [P] Textura del césped: tesela procedimental (grano y briznas, semilla fija), franjas con brillo, luz de focos y viñeta en `apps/web/src/campo2d/renderizador.ts`, con el fondo cacheado por tamaño; `--cesped-grano` y `--cesped-briznas` en `--cesped-textura` de `tokens.css` (FR-050)
- [X] T095 Verificación: `pnpm lint`, `pnpm typecheck`, pruebas unitarias y e2e `partido-2d`, `finalizar`, `diseno/*`, `partido-rapido` y `gestion-equipo` (30/30); capturas del 2D sin desplazamiento a 1024 × 768, 1280 × 720, 1366 × 768 y 1920 × 1080, del resultado con goleadores a 1366 y 390, y del césped de Formación

---

## Phase 11: Ronda 4 — últimos ajustes (FR-051 a FR-056)

**Motivo**: la tercera ronda se aprueba; últimos ajustes visuales y una corrección del draft (ver Clarifications, ronda 4).

- [X] T096 Actualizar spec (FR-051 a FR-056), contracts/ui.md §4 y tasks con la ronda 4
- [X] T097 [P] Portada sin desplazamiento (FR-051): `.pantalla.inicio` en columna a la altura de la ventana, menos relleno bajo la barra, titular y escena escalados con el alto y pasos más compactos en `base.css`
- [X] T098 [P] Resultado en dos columnas (FR-052): `.resultado-cuerpo` con «Resumen del partido» y «Estadísticas» en `ResultadoPartido.tsx` y `base.css`
- [X] T099 Goleadores en la franja del 2D (FR-053): `ListaGoleadores` exportada de `Marcador.tsx` y fila `.goleadores-2d` en `Partido2D.tsx` y `ReproduccionPartido.tsx`
- [X] T100 [P] Goles resaltados (FR-054): clase `evento-gol` en `ResumenEventos.tsx` y estilo en `base.css`
- [X] T101 [P] Campeón visible (FR-055): mensaje del campeón arriba y escena escalada con el alto en `PantallaCampeon.tsx` y `base.css`
- [X] T102 Elegir carta en el draft (FR-056): el pie de virtudes reenvía la pulsación fuera de sus botones (`CartaJugador.tsx`), `onDobleClick` en `CartaJugador` y `CartaMesa`, y elegir y confirmar con doble clic en `Draft.tsx` sin envíos duplicados
- [X] T103 Verificación: `pnpm lint`, `pnpm typecheck`, pruebas unitarias (483/483), e2e nueva `diseno/ronda4` (4/4) y de no regresión `diseno/*`, `finalizar`, `partido-2d`, `draft-solo`, `torneo-final`, `partido-rapido` y `cartas` (45/45); capturas de la portada a 1024 × 768, 1280 × 720, 1366 × 768 y 1920 × 1080, del 2D con goleadores, del resultado a 1366 y 390 y del campeón a 1366 × 768 y 390 × 844

---

## Phase 12: Ronda 5 — correcciones (FR-057 a FR-059)

**Motivo**: correcciones tras la ronda 4 (ver Clarifications, ronda 5).

- [X] T104 Actualizar spec (FR-057 a FR-059), contracts/ui.md §4 y tasks con la ronda 5
- [X] T105 Dorsales alineados (FR-057): celdas con columnas fijas y botones de aceptar y descartar con iconos bajo el campo, con Intro y Escape, en `EditorDorsales.tsx` y `base.css`; `dorsales.spec.ts` pulsa «Aceptar»
- [X] T106 [P] Tablas de goleadores y asistentes (FR-058): la lista del marcador pasa a `.lista-goleadores` en `Marcador.tsx` y `base.css`
- [X] T107 [P] Sobre con forma de carta (FR-059): `SobreArte` a 200 × 360, `--proporcion-sobre` en `tokens.css` y anchos de la portada, la apertura, la sala, nueva partida y el fin del draft
- [X] T108 Verificación: `pnpm lint`, `pnpm typecheck`, pruebas unitarias (483/483), e2e `diseno/ronda5` y `dorsales` (4/4) y de no regresión (49/50: `torneo.spec` no llega al campeón, sin relación con estos cambios; probable interferencia de otro servidor sobre la misma base de datos); validación manual de la persona responsable; capturas de dorsales, tablas y sobres

---

## Phase 13: Ronda 6 — último ajuste y media del once (FR-052, FR-060)

- [X] T109 Actualizar spec (FR-052 ampliado, FR-060) y tasks con la ronda 6
- [X] T110 [P] Dos columnas en los descansos y pausas del partido rápido (`PartidoRapido.tsx`) y en el resumen de versión anterior (`ReproduccionPartido.tsx`) con `.resultado-cuerpo` (FR-052)
- [X] T111 Media del once (FR-060): `mediaEquipo` y `rellenoEstrellas` en `apps/web/src/componentes/MediaEquipo.tsx`, sobre el campo de `CampoEquipo.tsx` en modo preparación, y estilos `.media-equipo` en `base.css`
- [X] T112 Verificación: `tsc` de la web y `pnpm lint`; sin e2e por indicación de la persona responsable

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup; bloquea todas las historias.
- **US1 (Phase 3)**: depende de Foundational. Es la base visual que el resto da por hecha.
- **US2 (Phase 4)**: depende de Foundational; conviene después de US1 porque `Aviso`, `EstadoVacio` y `Esqueleto` usan los estilos de `componentes.css`.
- **US4 (Phase 5)**: depende de Foundational (`comprobaciones.ts`); sus pruebas de inventario solo pasan en verde cuando US1 y US2 están hechas.
- **US5 (Phase 6)**: depende de US1; usa `NombreRecortado` (US4) en tablas y la tabla desplazable de T048.
- **US3 (Phase 7)**: depende de US1; el marcador usa `NombreRecortado` (US4) y `necesitaContorno` (Foundational).
- **Polish (Phase 8)**: depende de todas las historias.

### Dependencias concretas entre tareas

- T003 → T004; T001 + T005 → T014
- T006 + T007 → T009; T011 → T012 → T013; T006 → T013
- T026 → T027 → T032, T033, T034; T028 → T031; T029 → T030
- T015 → T041; T014 → T042, T043; T038 → T044 → T045
- T054 → T060; T066 → T067

### Within Each User Story

- Pruebas primero; deben fallar antes de implementar.
- Componentes nuevos antes de las pantallas que los usan.
- Cada historia termina con una tarea que ejecuta sus pruebas.

### Parallel Opportunities

- Setup: T002, T003 y T005 en paralelo.
- Foundational: T007, T008, T010, T011 y T013 (cuando T006 y T012 estén) en paralelo.
- US1: T015, T019 y T022 en paralelo con el resto.
- US2: T025, T026, T028 y T029 en paralelo.
- US4: T038, T039 y T040 en paralelo.
- US5: T053, T054, T056, T057 y T058 en paralelo.
- US3: T062, T063, T066 y T068 en paralelo.
- Polish: T070, T071 y T072 en paralelo.

---

## Parallel Example: User Story 2

```text
Tarea: "T025 Escribir apps/web/tests/e2e/diseno/estados.spec.ts"
Tarea: "T026 Crear apps/web/src/componentes/Aviso.tsx"
Tarea: "T028 Crear apps/web/src/componentes/EstadoVacio.tsx"
Tarea: "T029 Crear apps/web/src/componentes/Esqueleto.tsx"
```

## Parallel Example: User Story 4

```text
Tarea: "T038 Escribir apps/web/tests/unit/nombreRecortado.test.ts"
Tarea: "T039 Escribir apps/web/tests/e2e/diseno/menu.spec.ts"
Tarea: "T040 Escribir apps/web/tests/e2e/diseno/nombres.spec.ts"
```

## Parallel Example: User Story 5

```text
Tarea: "T054 Crear apps/web/src/componentes/Insignia.tsx"
Tarea: "T056 Integrar Plantillas y Formación en el tema oscuro"
Tarea: "T057 Rehacer la franja del partido 2D"
Tarea: "T058 Ajustar las tablas de Estadisticas y Torneo"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 (Setup) y Phase 2 (Foundational).
2. Phase 3 (US1): con tokens, componentes y barra, todas las pantallas ya tienen el aspecto nuevo.
3. **Parar y validar**: `pnpm lint`, `pnpm test`, `tema.spec.ts` y un recorrido rápido con la lista visual.

### Entrega incremental

1. US1 → base visual común (MVP).
2. US2 → lima reservado, estados y confirmaciones.
3. US4 → móvil, teclado, nombres recortados y comprobaciones en CI.
4. US5 → jerarquía de las pantallas de juego.
5. US3 → portada, marcadores y finales.
6. Polish → listas de verificación, no regresión y validación con personas.

Cada historia se puede revisar por separado sin romper las anteriores. Al terminar cada una, la persona puede confirmar los cambios con, por ejemplo:

```bash
git add -A && git commit -m "feat(web): spec 004 US1 identidad visual comun"
```

### Notas

- [P] = ficheros distintos y sin dependencias pendientes.
- No se cambia el comportamiento (FR-038): ante la duda, mantener la lógica y cambiar solo el marcado y los estilos.
- La pantalla `/_pruebas/cartas` queda fuera del inventario y puede conservar un estilo básico.
