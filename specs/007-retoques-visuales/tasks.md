---

description: "Lista de tareas de la spec 007 — Retoques visuales"
---

# Tasks: Retoques visuales

**Input**: documentos de diseño de `/specs/007-retoques-visuales/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md) (R1–R10),
[data-model.md](./data-model.md), [contracts/recursos-y-ui.md](./contracts/recursos-y-ui.md), [quickstart.md](./quickstart.md)

**Tests**: el plan (constitución IX) pide pruebas unitarias de la ruleta y e2e actualizados (apertura, duelos, torneo,
logo y favicon). Se incluyen solo esas, más los e2e existentes que el cambio rompe.

**Organization**: tareas agrupadas por historia de usuario. Todo el trabajo cae en `apps/web`; las rutas son relativas a
la raíz del repositorio.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (ficheros distintos, sin dependencias pendientes)
- **[Story]**: historia de usuario a la que pertenece (US1…US6)

## Convenciones que aplican a todas las tareas

- Sin tildes en identificadores, clases ni nombres de fichero; las tildes solo en textos visibles.
- pnpm siempre (`pnpm dlx`, nunca `npx`). Sin dependencias nuevas en `package.json`.
- El agente no hace `git commit` ni `git push`.
- Los colores literales nuevos van solo en `apps/web/src/estilos/cartas.css` (lo comprueba `pnpm lint:tokens`).
- Ningún fichero versionado puede referenciar `temp/` (FR-021).

---

## Phase 1: Setup (infraestructura compartida)

**Purpose**: herramientas de un solo uso para preparar los recursos. No se versionan (R1, R6).

- [X] T001 Comprobar las herramientas: `python -c "import PIL; from PIL import features; print(PIL.__version__, features.check('webp'))"` debe imprimir `True`, y `pnpm dlx ffmpeg-static` debe resolver la ruta del binario (sin añadirlo a ningún `package.json`). Si falta Pillow, instalarlo solo para el usuario (`python -m pip install --user pillow`).
- [X] T002 Escribir el script de un solo uso `preparar_recursos.py` en el directorio temporal de la sesión (scratchpad, **no** en el repositorio). Debe recibir como argumentos la ruta de `temp/` y la de `apps/web/public/`, y aplicar los parámetros de research.md R1:
  - quitar el fondo negro de logo y sobre con relleno por inundación desde los bordes (tolerancia ≈ 24/255 por canal) → alfa, con difuminado de 1 px y recorte a la caja del contenido;
  - detectar la caja del filo metálico de cada marco, recortar, escalar con `contain` a 600 × 900 centrado;
  - escribir SVG con `<image href="data:image/webp;base64,…">` y, en los marcos, un `<clipPath>` poligonal achaflanado común a los cuatro (medido una vez);
  - convertir los fondos a WebP 1599 × 900 bajando la calidad desde ~72 hasta quedar ≤ 150 KB;
  - imprimir el tamaño de cada salida, la proporción `ancho / alto` del sobre recortado y el polígono y el área interior medidos del marco.

---

## Phase 2: Foundational (recursos gráficos que bloquean US1, US3, US4 y US6)

**Purpose**: generar en `apps/web/public/` los recursos del contrato §1. Son salidas del mismo script, por eso van
antes de cualquier historia.

**⚠️ CRITICAL**: US1, US3, US4 y US6 no pueden empezar hasta que exista su recurso.

- [X] T003 [P] Generar `apps/web/public/marca/logo.svg`: SVG con WebP incrustado de 256 × 256 px, calidad 85, fondo transparente, **≤ 40 KB**.
- [X] T004 [P] Generar `apps/web/public/cartas/marcos/superclase.svg`, `epico.svg`, `legendario.svg` y `goat.svg` (nombre = `Nivel` en minúsculas): `viewBox="0 0 600 900"`, WebP incrustado de calidad 80, `clipPath` poligonal común que elimina el halo de Legendaria y GOAT, **≤ 150 KB cada uno**. Guardar el área interior medida en % (salida del script) para usarla en T011.
- [X] T005 [P] Generar `apps/web/public/cartas/sobre.svg`: WebP incrustado de 600 px de ancho, calidad 80, fondo transparente recortado al contorno, **≤ 150 KB**. Anotar la proporción `ancho / alto` en píxeles (≈ 0,60) para T037.
- [X] T006 [P] Generar `apps/web/public/fondos/background_6.webp` … `background_11.webp`: WebP 1599 × 900, **≤ 150 KB cada uno**.
- [X] T007 Verificar los recursos generados: `ls -l` de `apps/web/public/marca`, `apps/web/public/cartas/marcos`, `apps/web/public/cartas/sobre.svg` y `apps/web/public/fondos` dentro de los límites; `grep -L "data:image/webp" apps/web/public/marca/logo.svg apps/web/public/cartas/sobre.svg apps/web/public/cartas/marcos/*.svg` vacío; ningún `href="http` en esos SVG; abrir cada SVG en el navegador sobre fondo claro y oscuro: sin recuadro negro, sin halo y sin deformación.

**Checkpoint**: recursos gráficos listos; US1, US3, US4 y US6 pueden empezar en paralelo.

---

## Phase 3: User Story 1 - Cartas con el nuevo diseño por rareza (Priority: P1) 🎯 MVP

**Goal**: todas las cartas usan el marco de su nivel en proporción 2 : 3 y siguen mostrando todos sus datos, legibles,
en tamaño completo y compacto (FR-004 a FR-007, FR-006b; research R2 y R3).

**Independent Test**: en `PruebasCartas` y al abrir un sobre, cada nivel muestra su marco y ningún dato queda tapado,
cortado ni ilegible (quickstart, escenarios 1–3 y 14).

### Tests de User Story 1

- [X] T008 [P] [US1] En `apps/web/tests/e2e/cartas.spec.ts`, añadir una comprobación de que `.carta.completa` tiene proporción 2 : 3 (`width / height` a menos de 0,02 de 0,667) y de que su `background-image` calculado contiene `/cartas/marcos/<nivel>.svg` para la clase `nivel-<nivel>` de la carta. Debe fallar antes de T010–T011.

### Implementación de User Story 1

- [X] T009 [US1] En `apps/web/src/estilos/cartas.css`, bloques de nivel (`.nivel-Superclase`, `.nivel-Epico`, `.nivel-Legendario`, `.nivel-GOAT`, o los selectores equivalentes ya existentes): añadir `--carta-marco-img: url(/cartas/marcos/<nivel>.svg)`; fijar `--carta-marco` a plata `#b9c2cc`, violeta `#a879ff`, oro `#e0a82e` y rubí `#ff3d6e`; `--carta-texto: #ffffff` en los cuatro y `--carta-texto-suave` teñido del color del marco; chips y líneas en blanco translúcido; mantener `--carta-superficie` como color de reserva si el marco no carga.
- [X] T010 [US1] En `apps/web/src/estilos/cartas.css`, `.carta.completa`: `aspect-ratio: 2 / 3` fijo (quitar lo que la hace crecer en alto), `background: var(--carta-marco-img) center / 100% 100% no-repeat, var(--carta-superficie)`; eliminar el borde, el `clip-path` de escudo achaflanado, el grano y el `::after` de la franja diagonal.
- [X] T011 [US1] En `apps/web/src/estilos/cartas.css`, colocar el contenido de `.carta.completa` dentro del área interior del marco con `padding` en `cqi` (≈ 8 % lateral, ≈ 7 % arriba y abajo; usar las medidas anotadas en T004 y ajustarlas en `PruebasCartas`).
- [X] T012 [US1] En `apps/web/src/estilos/cartas.css`, la capa de foto por demarcación (`ImagenCarta tipo="fondo"`): `inset` igual al `padding` de T011, `opacity: 0.35` y máscara degradada hacia abajo, para que la foto y el estadio del marco se distingan.
- [X] T013 [US1] En `apps/web/src/estilos/cartas.css`, `text-shadow: 0 1px 2px rgb(0 0 0 / 70%)` en la media y el nombre; revisar el contraste (≥ 4,5 : 1) de stats, posiciones, virtudes, defectos, dorsal y botón «i» sobre los cuatro marcos.
- [X] T014 [US1] En `apps/web/src/estilos/cartas.css`, si con 4 rasgos no caben en 2 : 3 al ancho mínimo de 160 px, reducir `--escala-rasgos` de la carta completa (la zona de rasgos conserva su alto fijo; la proporción no cambia). Comprobar nombres largos con `NombreRecortado`.
- [X] T015 [US1] En `apps/web/src/estilos/cartas.css`, `.carta.compacta`: fondo `linear-gradient(rgb(0 0 0 / 55%), rgb(0 0 0 / 35%)), var(--carta-marco-img) center top / cover no-repeat`, y borde con `--carta-marco`, para que el nivel se distinga en miniatura (SC-002).
- [X] T016 [US1] En `apps/web/src/estilos/cartas.css`, `.seleccionada`: sustituir el `inset` de 4 px por `outline: 3px solid #b7ff2c; outline-offset: 2px` y un `drop-shadow` lima, para no tapar el marco.
- [X] T017 [US1] Ajustar a la nueva altura de carta (2 : 3 en lugar de 5 : 7) las rejillas y composiciones que la suponen: `aspect-ratio: 5 / 7` de `.esqueleto-cartas .esqueleto-bloque` en `apps/web/src/estilos/componentes.css`, y las rejillas de draft, plantilla, colección (`apps/web/src/estilos/coleccion.css`), tienda, campo y apertura en `apps/web/src/estilos/cartas.css`, `componentes.css` y `base.css`. Ninguna carta se solapa ni se corta a 360 px de ancho.
- [X] T018 [US1] Revisar `apps/web/src/componentes/CartaJugador.tsx`: no debe cambiar su estructura; solo tocarlo si algún estilo de T009–T016 necesita una clase que no existe. Ejecutar `pnpm --filter @fbd/web test` (en particular `tests/unit/vistaCarta.test.ts` y `tests/unit/fondoCarta.test.ts`) y arreglar lo que rompa.
- [X] T019 [US1] Validar con quickstart, escenarios 1, 2, 3 y 14 (`PruebasCartas`, 360 px, carta de colección comprada, marco bloqueado en las herramientas del navegador), y ejecutar `apps/web/tests/e2e/cartas.spec.ts` y `apps/web/tests/e2e/defectos.spec.ts`.

**Checkpoint**: US1 completa y comprobable por sí sola (MVP).

---

## Phase 4: User Story 2 - Sonidos más agradables y momentos sonoros nuevos (Priority: P2)

**Goal**: nueve efectos CC0 en MP3, un 20 % más bajos, choque y ruleta en los duelos, aplausos y trompetas en las
pantallas finales (FR-010 a FR-015; research R5 a R9).

**Independent Test**: quickstart, escenarios 6, 8, 9, 10, 11 y 15, y las comprobaciones de tamaño de los sonidos.

### Tests de User Story 2

- [X] T020 [P] [US2] En `apps/web/tests/unit/secuenciaDuelos.test.ts`, añadir pruebas (deben fallar antes de T026):
  - `ruletaEn` devuelve `girando: true` al principio de la fase `resultado` y `girando: false` en cuanto el tiempo de la fase llega a `DURACION_RULETA_MS / velocidad`, a ×1 (800 ms) y a ×2 (400 ms); fuera de la fase `resultado` no gira;
  - `valorRuleta(final, 1, s) === final` para varios `final` y semillas;
  - durante el giro, el valor queda dentro del rango posible del estado de forma;
  - es determinista para la misma semilla y cambia cada vez menos a medida que avanza el progreso (desaceleración `1 − (1 − p)³`).

### Implementación de User Story 2

- [X] T021 [US2] Descargar las grabaciones CC0 de origen en una carpeta nueva y vacía del scratchpad (no en el repositorio): preferir los paquetes de Kenney (kenney.nl, *Casino Audio*, *Impact Sounds*, *Interface Sounds*) y, para `revelacion`, `ruletaForma`, `aplausos` y `trompetas`, Freesound con el filtro *Creative Commons 0*. Elegir una por efecto según la tabla de research.md R5 y apuntar autor, URL y licencia de cada una.
- [X] T022 [US2] Convertir con `pnpm dlx ffmpeg-static` en una pasada por fichero a `apps/web/public/sonidos/{apertura,reparto,volteo,revelacion,entradaDuelo,choqueDuelo,ruletaForma,aplausos,trompetas}.mp3`: MP3 mono, 22,05 kHz, 48 kbps CBR (64 kbps solo para `aplausos` si a 48 suena metálico), recorte al momento útil (`aplausos` ≈ 3 s, `trompetas` ≈ 2,5 s, `ruletaForma` ≈ 0,8 s, el resto ≤ 0,8 s), paso bajo a 6 kHz, fundido de salida de 30–150 ms y pico normalizado a −3 dBFS. Comprobar `du -cb apps/web/public/sonidos/*.mp3 | tail -1` **≤ 307200**.
- [X] T023 [US2] Borrar `apps/web/public/sonidos/reparto.wav`, `volteo.wav` y `revelacion.wav`, y reescribir `apps/web/public/sonidos/LICENCIA` con una entrada por MP3: fichero, momento, autor, URL de origen, licencia (CC0 1.0) y cambios aplicados (recorte, mono, paso bajo, normalización).
- [X] T024 [US2] Reescribir `apps/web/src/sonido/sonido.ts` según el contrato §2:
  - `Efecto` con los nueve nombres;
  - eliminar `SINTETIZADOS`, `ruidoRosa`, `nota` y las tres funciones `sintetizar*`;
  - `cargar` pide `/sonidos/${efecto}.mp3` y guarda el buffer en memoria;
  - `BASE` por efecto (ajustada de oído al nivel del efecto anterior equivalente), `export const FACTOR_VOLUMEN = 0.8` y `GANANCIA[efecto] = BASE[efecto] * FACTOR_VOLUMEN`;
  - `reproducir(efecto): () => void` devuelve una función que detiene la fuente si aún suena y que no hace nada si no sonaba (silencio, sin `AudioContext`, contexto no `running`); nunca lanza;
  - sin cambios en `CLAVE_SONIDO`, `sonidoActivado`, `cambiarSonido`, `useSonido` ni `prepararDesbloqueo`.
- [X] T025 [US2] Buscar todos los usos de `reproducir(` en `apps/web/src` (incluido `componentes/AperturaSobre.tsx`) y comprobar con `pnpm typecheck` que siguen compilando sin cambios; arreglar cualquier nombre de efecto que ya no exista.
- [X] T026 [US2] En `apps/web/src/componentes/secuenciaDuelos.ts`, añadir `export const DURACION_RULETA_MS = 800`, `export function ruletaEn(i: Instante, velocidad: Velocidad): { girando: boolean; progreso: number }` (gira al principio de la fase `resultado` mientras su tiempo sea menor que `DURACION_RULETA_MS / velocidad`) y `export function valorRuleta(final: number, progreso: number, semilla: number): number` (pura y determinista; con progreso 1 devuelve exactamente `final`). Hace pasar T020.
- [X] T027 [US2] En `apps/web/src/pantallas/Duelos.tsx`, con `estadoForma` activo:
  - la fila «Estado de forma» del `Desglose` muestra `valorRuleta(final, progreso, semilla)` mientras `ruletaEn(...).girando`, con semilla derivada del índice del duelo y del lado;
  - la «Puntuación» total y el realce del ganador esperan a que la ruleta se detenga;
  - al empezar el giro llama a `reproducir('ruletaForma')` y guarda la función de parada; la llama al terminar el giro, al pulsar «Saltar al resultado», al cambiar de duelo y al desmontar;
  - con movimiento reducido o tras saltar muestra el valor final y no suena; sin estado de forma no hay ruleta;
  - el choque sigue sonando con `reproducir('choqueDuelo')` en la fase `choque`.
- [X] T028 [P] [US2] En `apps/web/src/pantallas/PantallaCampeon.tsx`, `reproducir('aplausos')` una vez en un `useEffect` de montaje protegido por un `useRef`, para que el doble montaje de StrictMode no lo duplique.
- [X] T029 [P] [US2] En `apps/web/src/pantallas/PantallaDerrota.tsx`, `reproducir('trompetas')` una vez, con el mismo patrón que T028.
- [X] T030 [US2] Actualizar `apps/web/tests/e2e/duelos.spec.ts` para la ruleta: tras la fase de resultado de un duelo con estado de forma, la fila «Estado de forma» acaba mostrando el valor final y aparece la puntuación total; «Saltar al resultado» muestra todo sin esperas. Ajustar las esperas existentes que dependan del momento en que aparece el total.
- [X] T031 [US2] Validar con quickstart, escenarios 6, 8, 9, 10, 11 y 15 (a ×1 y ×2, silenciado, recarga en las pantallas finales).

**Checkpoint**: US2 completa y comprobable por sí sola.

---

## Phase 5: User Story 3 - Nuevo logo oficial (Priority: P2)

**Goal**: el nuevo logo en la barra, el menú, el favicon y el resto de apariciones (FR-001 a FR-003; research R4).

**Independent Test**: quickstart, escenario 4, en tema claro y oscuro.

### Tests de User Story 3

- [X] T032 [P] [US3] En `apps/web/tests/e2e/identidad.spec.ts` (o `apps/web/tests/e2e/diseno/menu.spec.ts` si ahí se prueban la barra y el menú), comprobar que el `img` de la marca de la barra y el del menú tienen `src` `/marca/logo.svg` y que `link[rel="icon"]` apunta a `/marca/logo.svg`.

### Implementación de User Story 3

- [X] T033 [US3] Reescribir `apps/web/src/componentes/arte/Escudo.tsx` para que pinte `<img src="/marca/logo.svg" alt="" width={tamano} height={tamano} className={className} />` conservando su API (`className`, `tamano`) y sus valores por defecto; quitar el SVG dibujado a mano.
- [X] T034 [US3] Revisar los estilos que suponían un `<svg>` en el escudo (`.marca .escudo` en `apps/web/src/estilos/componentes.css`, y las reglas del escudo en `apps/web/src/estilos/cartas.css` que usan `fill`, `stroke` o selectores `svg`/`path`) y adaptarlos a un `<img>`. Comprobar los usos en `apps/web/src/app/Marco.tsx`, `apps/web/src/componentes/MenuNavegacion.tsx`, `apps/web/src/componentes/AperturaSobre.tsx` y `apps/web/src/componentes/CartaJugador.tsx`.
- [X] T035 [US3] En `apps/web/index.html`, cambiar el favicon a `<link rel="icon" type="image/svg+xml" href="/marca/logo.svg" />` y borrar `apps/web/public/favicon.svg`.
- [X] T036 [US3] Validar con quickstart, escenario 4: logo sin recuadro negro en la barra y el menú, con tema claro y oscuro; favicon reconocible en la pestaña.

**Checkpoint**: US3 completa y comprobable por sí sola.

---

## Phase 6: User Story 6 - Nuevo sobre de cartas (Priority: P2)

**Goal**: el nuevo sobre en Inicio, Crear partida, Sala, Draft, Tienda y apertura, con la animación actual y su
rasgado (FR-017 a FR-020; research R4).

**Independent Test**: quickstart, escenarios 5, 6 y 7.

### Implementación de User Story 6

- [X] T037 [US6] En `apps/web/src/estilos/tokens.css`, cambiar `--proporcion-sobre: 200 / 376` por la proporción medida en T005 (`ancho / alto` en píxeles, ≈ 0,60).
- [X] T038 [US6] Reescribir `apps/web/src/componentes/arte/SobreArte.tsx` para que pinte `<img src="/cartas/sobre.svg" alt="" className={…}>` con las clases `sobre-arte`, `rasgado` (si la prop `rasgado` es verdadera) y `className`; conservar su API (`className`, `rasgado`); quitar el SVG dibujado a mano, el reflejo `sobre-arte-holo`, los textos y el comentario de la proporción 8 : 15.
- [X] T039 [US6] En `apps/web/src/estilos/cartas.css`:
  - cambiar `.sobre-cerrado svg` por `.sobre-cerrado img`, sin tocar las animaciones `sobre-brilla`, `sobre-tiembla` ni `sobre-rasga`;
  - añadir `.sobre-arte.rasgado` con un `clip-path: polygon(...)` de borde superior dentado a ≈ 7 % del alto, con los mismos dientes que el trazado actual;
  - eliminar las reglas `.sobre-arte-holo` (incluida la de movimiento reducido), `.sobre-arte-banda`, `.sobre-arte-nombre` y `.sobre-arte-sub`.
- [X] T040 [US6] Revisar los usos de `--proporcion-sobre` y del sobre fuera de la apertura: `.tienda-sobre-arte` en `apps/web/src/estilos/coleccion.css`, la portada en `apps/web/src/estilos/base.css` (≈ línea 876) y la sala, para que el sobre se vea entero, sin pixelado, a los distintos tamaños (US6, escenario 4).
- [X] T041 [US6] Actualizar el test «FR-059: el sobre tiene las dimensiones de las cartas» de `apps/web/tests/e2e/diseno/ronda5.spec.ts` al nuevo contrato (research R4, FR-020): el selector `SVGSVGElement` de `.portada-sobre` pasa a `HTMLImageElement`; el sobre sigue midiendo el mismo ancho que las cartas, pero ahora es algo más alto que ellas (proporción ≈ 0,60 frente a 0,667), así que la comparación de proporciones de la apertura se sustituye por «mismo ancho (± 4 px) y alto del sobre ≥ alto de la carta».
- [X] T042 [US6] Ejecutar `apps/web/tests/e2e/apertura.spec.ts` y `apps/web/tests/unit/aperturaSobre.test.ts`, y ajustar los selectores que asuman un `<svg>` dentro del sobre.
- [X] T043 [US6] Validar con quickstart, escenarios 5, 6 y 7 (incluido «reducir movimiento»).

**Checkpoint**: US6 completa y comprobable por sí sola.

---

## Phase 7: User Story 4 - Más variedad de fondos de página (Priority: P3)

**Goal**: el reparto aleatorio de fondos pasa de 5 a 11 (FR-008, FR-009; research R10).

**Independent Test**: quickstart, escenario 12, y el tamaño de los WebP de T006.

- [X] T044 [US4] En `apps/web/src/app/Marco.tsx`, cambiar `FONDOS_PANTALLA = 5` por `FONDOS_PANTALLA = 11`.
- [X] T045 [US4] Validar con quickstart, escenario 12: tras unas 20 recargas aparecen fondos del 6 al 11 y la carga no se nota más lenta.

**Checkpoint**: US4 completa y comprobable por sí sola.

---

## Phase 8: User Story 5 - Duelos sin tablas de goleadores (Priority: P3)

**Goal**: en modo duelos, el torneo no muestra «Máximos goleadores» ni «Máximos asistentes» (FR-016; research R10).

**Independent Test**: quickstart, escenario 13.

### Tests de User Story 5

- [X] T046 [P] [US5] En `apps/web/tests/e2e/duelos.spec.ts`, al llegar a la pantalla del torneo en modo duelos, comprobar que no existen las pestañas «Máximos goleadores» ni «Máximos asistentes»; en `apps/web/tests/e2e/torneo.spec.ts` (liga), comprobar que siguen apareciendo.

### Implementación de User Story 5

- [X] T047 [US5] En `apps/web/src/pantallas/Torneo.tsx`, añadir las entradas `goleadores` y `asistentes` a `pestanas` solo si `vista.modo !== 'duelos'`, con el mismo patrón que ya usa `clasificacion` con `playoff` (ver la tabla del contrato §3, «Torneo»).
- [X] T048 [US5] Validar con quickstart, escenario 13.

**Checkpoint**: todas las historias completas.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T049 [P] Actualizar `docs/diseno/DESIGN.md` en las secciones de la carta, el sobre y el logo: proporción 2 : 3, marcos por nivel y su `--carta-marco`, texto claro, sobre en `<img>` y nueva `--proporcion-sobre`.
- [ ] T050 Borrar el directorio `temp/` de la raíz del repositorio (FR-021, SC-007) cuando T003–T006 y T022 estén terminadas y revisadas.
- [X] T051 Ejecutar las comprobaciones de recursos de quickstart.md: tamaños de fondos, marcos, sobre y logo; `du -cb apps/web/public/sonidos/*.mp3 | tail -1` ≤ 307200; `test ! -d temp`; `grep -rn "temp/" apps/web/src apps/web/index.html apps/web/tests` sin resultados; `grep -rln "favicon.svg\|\.wav" apps/web/src apps/web/index.html` sin resultados.
- [ ] T052 Ejecutar `pnpm typecheck`, `pnpm lint` (incluye `lint:tokens`), `pnpm test` y `pnpm e2e`, y dejar todo en verde.
- [X] T053 Ejecutar `graphify update .` desde la raíz del repositorio para actualizar el grafo tras los cambios de código.

---

## Dependencies & Execution Order

### Dependencias entre fases

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup. Bloquea US1 (T004), US3 (T003), US6 (T005) y US4 (T006).
- **US2 (Phase 4)** y **US5 (Phase 8)**: no dependen de Phase 2; pueden empezar en cuanto se quiera.
- **Polish (Phase 9)**: depende de todas las historias que se vayan a entregar. T050 (borrar `temp/`) va siempre después de T003–T006 y T022.

### Dependencias entre historias

- **US1 (P1)**: solo T004. Independiente del resto.
- **US2 (P2)**: independiente. T020 → T026 → T027; T024 → T025, T027, T028 y T029; T021 → T022 → T023.
- **US3 (P2)**: solo T003. Comparte `cartas.css` con US1 (T034), así que conviene hacerla después de US1 o coordinar las ediciones.
- **US6 (P2)**: solo T005. Comparte `cartas.css` con US1 (T039) y la altura de carta de US1 (T041 compara con la carta 2 : 3), así que va después de US1.
- **US4 (P3)**: solo T006.
- **US5 (P3)**: independiente. T046 y US2 T030 tocan `duelos.spec.ts`: no hacerlas a la vez.

### Dentro de cada historia

- Los tests indicados se escriben antes y deben fallar antes de la implementación.
- En US1, T009–T016 tocan el mismo fichero (`cartas.css`) y van en orden.

---

## Parallel Example

```text
# Tras Setup, los recursos salen a la vez:
T003 logo · T004 marcos · T005 sobre · T006 fondos

# Mientras se trabaja US1 (cartas.css), en paralelo:
US2: T020 (test ruleta), T021–T023 (audio), T024 (sonido.ts)
US4: T044 (Marco.tsx)
US5: T047 (Torneo.tsx)

# Dentro de US2:
T028 PantallaCampeon.tsx · T029 PantallaDerrota.tsx
```

---

## Implementation Strategy

### MVP primero (solo US1)

1. Phase 1 y T004 de Phase 2.
2. Phase 3 (US1).
3. **Parar y validar** con `PruebasCartas` (quickstart, escenarios 1–3 y 14).

### Entrega incremental

1. Setup + Foundational → recursos listos.
2. US1 → cartas nuevas (MVP).
3. US3 y US6 → logo y sobre (identidad de marca completa).
4. US2 → sonido.
5. US4 y US5 → fondos y pestañas del torneo.
6. Polish → `temp/` eliminado, todo en verde y grafo actualizado.

Cada historia se puede comprobar sola con su escenario de quickstart sin romper las anteriores.
