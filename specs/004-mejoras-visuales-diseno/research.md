# Research — spec 004: mejoras visuales y de diseño

Decisiones técnicas que resuelven las incógnitas del plan. Cada una tiene la decisión, por qué se toma y qué alternativas se han descartado. Los contrastes se han calculado con la fórmula de luminancia relativa de WCAG 2.1.

## R1. Dirección de diseño (skill `frontend-design`)

**Decisión**: la apuesta visual es el **marcador de estadio**. La tipografía condensada a escala de cartel se reserva para lo que en un estadio iría en el videomarcador:

- el nombre del juego en la portada;
- los goles de cada marcador;
- el titular de campeón o de derrota;
- la cifra del turno del draft ("Elección 7 de 24").

Todo lo demás es silencioso: lienzo casi negro, paneles planos un escalón por encima, texto blanco y gris, y lima solo en la acción. Las cartas, el césped y las equipaciones aportan el color, porque son el contenido del juego.

Plan de diseño (primera pasada de la skill):

- **Color**: lienzo `#111111`, panel `#1f1f21`, panel elevado `#28282a`, texto `#ffffff`, acción lima `#b7ff2c` y advertencia ámbar `#ffd000` (spec, Clarifications). El resto de la paleta está en R4.
- **Tipografía**: Barlow Condensed 800 para el cartel y las cifras, y Barlow para el texto (R2).
- **Maquetación**:
  - columna única alineada a la izquierda, con un máximo de unos 1200 px;
  - en las pantallas de juego, rejilla de dos zonas: decisión a la izquierda o arriba, y contexto en un panel lateral a la derecha o debajo;
  - los titulares se alinean a la izquierda, sin centrar, salvo los finales de torneo, que son un cartel centrado.

  ```text
  Portada (1366 × 768)                    Draft (portátil)
  ┌──────────────────────────────────┐    ┌────────────────────────┬─────────┐
  │ Fútboosterdraft     Inicio  Menú │    │ Elección 7 de 24  ⟵    │ Sobre 1 │
  │                                  │    │ ┌──┐┌──┐┌──┐┌──┐┌──┐   │ 0:24    │
  │ FÚTBOOSTER                       │    │ │  ││  ││  ││  ││  │   │ Mi      │
  │ DRAFT        (cartel, 0,85)      │    │ └──┘└──┘└──┘└──┘└──┘   │ plantil.│
  │ Abre sobres, elige jugadores...  │    │                        │ ...     │
  │ [ Empezar a jugar ]  (lima)      │    ├────────────────────────┴─────────┤
  └──────────────────────────────────┘    │            [ Elegir carta ]      │
                                          └──────────────────────────────────┘
  ```

- **Principios**:
  - el lima significa "pulsa aquí para avanzar";
  - el color fuera del lima es siempre información de juego;
  - el tamaño de cartel solo aparece en los momentos culminantes;
  - las pantallas no tienen decoración que no informe.

**Revisión contra el encargo** (segunda pasada): la skill avisa de que "fondo casi negro con un único acento ácido" es uno de los estilos por defecto de las interfaces generadas. Aquí no es una elección propia: lo fija la guía `docs/diseno/DESIGN.md`, y el encargo dice que se siga, así que se mantiene. Lo que sí estaba libre y se ha revisado:

- El primer borrador ponía etiquetas en mayúsculas sostenidas sobre cada panel ("PLANTILLA", "SOBRE"). La guía y FR-035 lo prohíben, y además es la marca típica de las plantillas genéricas. Se sustituye por títulos de panel en minúscula inicial.
- El primer borrador usaba una sans de propósito general (Inter) para el texto. Se cambia por Barlow (R2), porque sale del mismo lenguaje de rotulación vial y deportiva que la condensada y da a la interfaz una voz de cartel de estadio, no de panel de SaaS.
- Se descarta poner una tarjeta con sombra en cada bloque. Los paneles son planos con borde de 1 px (FR-008), y la jerarquía se marca con el tamaño y la posición, no con capas.

**Alternativas descartadas**:

- fotografía o ilustración de fondo: no hay material con licencia (Assumptions);
- acento secundario de color para la navegación: rompe FR-002.

## R2. Tipografías

**Decisión**:

- **Cartel y cifras**: Barlow Condensed, con los pesos 600 y 800 que ya sirve el juego (`apps/web/public/fuentes/`). Se usa 800 para el cartel y los marcadores, y 600 para los títulos condensados pequeños.
- **Texto corriente**: Barlow (ancho normal), en los pesos 400, 500 y 600, como ficheros woff2 servidos desde `apps/web/public/fuentes/`, igual que la condensada.
- Las cifras de las tablas usan `font-variant-numeric: tabular-nums` (Barlow tiene dígitos tabulares).

**Por qué**:

- Barlow y Barlow Condensed son la misma superfamilia (Jeremy Tribby, SIL OFL 1.1). La licencia de `public/fuentes/LICENCIA` ya las cubre y permite incluirlas y servirlas desde la aplicación (FR-039).
- Barlow es una grotesca de esquinas ligeramente redondeadas, inspirada en la rotulación de carreteras. Tiene proporciones y peso de cuerpo parecidos a los de Roobert, la fuente de la guía, y comparte esqueleto con la condensada. Un solo sistema tipográfico con dos anchos da contraste sin dos voces que compitan.
- Se sirven solo los subconjuntos latinos, en unos 20–25 KB por peso. Es un tamaño aceptable para cinco ficheros.

**Alternativas descartadas**:

- Inter, Manrope o Space Grotesk: genéricas o ya muy vistas, sin relación con la condensada;
- Archivo con eje de anchura: obligaría a sustituir la condensada de las cartas (003/FR-008);
- paquetes npm de fuentes (`@fontsource/*`): añaden una dependencia para lo que son ficheros estáticos, y 003 ya decidió servir woff2 propios.

## R3. Carga de tipografías sin texto invisible ni saltos (SC-009, Edge Cases)

**Decisión**:

- `font-display: swap` en todas las `@font-face`. El texto se ve desde el primer momento con la tipografía alternativa.
- Tipografías alternativas con las métricas ajustadas: `@font-face` locales (`Barlow Fallback` sobre `Arial`, y `Barlow Condensed Fallback` sobre `Arial Narrow` o `Arial`) con `size-adjust`, `ascent-override`, `descent-override` y `line-gap-override`. Así, el cambio a la tipografía propia apenas mueve la maquetación. Los valores se calculan una vez a partir de las métricas de los ficheros y se anotan en `tokens.css`.
- `<link rel="preload" as="font" type="font/woff2" crossorigin>` en `index.html` para Barlow 400 y Barlow Condensed 800, las que se ven en la primera pantalla.

**Alternativas descartadas**:

- `font-display: block`: provoca texto invisible y viola SC-009;
- `optional`: en la primera visita el cartel saldría casi siempre con la tipografía del sistema.

## R4. Paleta y contrastes (FR-001 a FR-004, FR-029; Clarifications)

**Decisión**: los tokens de color, con sus contrastes medidos.

| Token | Valor | Uso | Contraste sobre lienzo / panel / elevado |
|---|---|---|---|
| `--color-lienzo` | `#111111` | Fondo de página y barra de navegación | — |
| `--color-panel` | `#1f1f21` | Paneles, diálogos, tablas | — |
| `--color-elevado` | `#28282a` | Señalado de filas, campos, panel dentro de panel | — |
| `--color-borde` | `#28282a` | Borde de panel (decorativo, como la guía) | — |
| `--color-divisor` | `#39393b` | Separadores entre regiones | — |
| `--color-borde-control` | `#8a8a8d` | Borde de campos y botones secundarios (≥ 3:1, FR-029) | 5,49 / 4,78 / 4,27 |
| `--color-texto` | `#ffffff` | Texto principal | 18,9 / 16,5 / 14,7 |
| `--color-texto-suave` | `#a8a8ad` | Texto secundario, metadatos | 7,98 / 6,95 / 6,21 |
| `--color-accion` | `#b7ff2c` | Lima: botón principal, foco, activo, marcado | 15,6 / 13,6 / 12,2 |
| `--color-accion-texto` | `#000000` | Texto sobre lima | 17,35 sobre lima |
| `--color-advertencia` | `#ffd000` | Ámbar: advertencias (icono, borde, texto) | 12,8 / 11,2 / 10,0 |
| `--color-error` | `#ff6b5e` | Errores (icono, borde, texto) | 6,76 / 5,89 / 5,27 |
| `--color-apagado` | `#3a3a3d` | Fondo del botón principal desactivado | texto suave encima: 4,79 |
| `--nivel-superclase` | `#a9b8cc` | Texto e insignia de nivel | 9,37 / 8,16 / 7,30 |
| `--nivel-epico` | `#c49bff` | Ídem | 8,52 / 7,43 / 6,64 |
| `--nivel-legendario` | `#ee9a4d` | Ídem (cobre: tono ~29°, separado del ámbar, ~49°) | 8,42 / 7,34 / 6,56 |
| `--nivel-goat` | `#ff7eb6` | Ídem (rosa: separado del rojo de error) | 8,01 / 6,98 / 6,24 |

- Se elimina `@media (prefers-color-scheme: dark)` y se fija `color-scheme: dark` en `:root` (FR-001). Los controles nativos (barras de desplazamiento, selectores de fecha) también salen oscuros.
- `--color-borde-control` sustituye al Steel Border de la guía (`#707072`) en los controles. Ese gris da 2,98:1 sobre el panel elevado y no cumpliría el 3:1 de FR-029. `#707072` se mantiene como `--color-borde-marco` para los marcos de imagen.
- **Cartas**: la carta conserva su superficie clara de "objeto físico" (003/R20, comentario de `cartas.css`). Sus colores internos ya cumplen 4,5:1 sobre su propio degradado y no cambian. Lo que se recalibra son los colores de nivel cuando aparecen **fuera** de la carta (texto de nivel, insignias, ficha de jugador). Se comprueba además que el marco de cada carta destaque sobre el panel oscuro (≥ 3:1). Si alguno no llega, se aclara su `--carta-marco`.
- **Campo 2D**: el césped (`#2f7d3b`) y las líneas no cambian (FR-003). El renderizador lee el lienzo y el texto de los tokens de CSS (R6).

**Alternativas descartadas**:

- dorado para Legendario: se confundiría con el ámbar de advertencia (FR-004);
- rojo intenso para GOAT: se confundiría con el error.

## R5. Fuente única de los valores visuales (FR-037)

**Decisión**:

- Un fichero `apps/web/src/estilos/tokens.css` con todas las propiedades personalizadas: colores (R4); tipografías y escala de texto; espaciado en múltiplos de 4 px; radio de 6 px; sombra de la barra; duraciones de animación; alturas del botón principal y de la barra.
- Ningún otro fichero de estilos ni componente usa valores literales de color, tipografía, radio o sombra. Excepciones, por ser objetos de juego (FR-003, FR-008): los degradados internos de las cartas, el césped del campo 2D y los colores de las equipaciones, que vienen de los datos.
- Una regla de lint lo vigila, sin añadir dependencias: un script `apps/web/scripts/comprobar-tokens.mjs` busca literales `#rrggbb`, `rgb(` y `border-radius` con número fuera de `tokens.css`, `cartas.css` y la lista de excepciones. Se ejecuta con `pnpm --filter @fbd/web lint:tokens`, que se añade a `pnpm lint`.

Escala de texto (de la guía, con el cartel adaptable de FR-006):

| Token | Tamaño | Interlineado | Uso |
|---|---|---|---|
| `--texto-cuerpo` | 16 px | 1,5 | Texto corriente |
| `--texto-pequeno` | 14 px | 1,5 | Metadatos, pies |
| `--texto-subtitulo` | 20 px | 1,4 | Entradilla de la portada, subtítulos |
| `--titulo-pequeno` | 24 px | 1,2 | Títulos de panel |
| `--titulo-grande` | `clamp(32px, 5vw, 48px)` | 1,0 | Títulos de pantalla |
| `--cartel` | `clamp(56px, 13vw, 110px)` | 0,85 | Portada, campeón, derrota |
| `--cartel-marcador` | `clamp(48px, 10vw, 96px)` | 0,9 | Goles de los marcadores |

Con `13vw` a 360 px, el cartel mide 56 px (mínimo de `clamp`). "Fútboosterdraft" se parte en "Fútbooster / draft" con un `<wbr>` y ocupa dos líneas (FR-006).

**Alternativas descartadas**:

- tokens en TypeScript con CSS-in-JS: añade una dependencia y un cambio de paradigma en 30 pantallas que ya usan CSS plano;
- Tailwind: reescribiría todo el marcado sin aportar nada que las propiedades personalizadas no den.

## R6. Colores en el lienzo 2D

**Decisión**: `renderizador.ts` toma los colores de interfaz que pinta (texto de dorsales, contornos, franjas) de `getComputedStyle(document.documentElement)` al montar el lienzo, con los mismos tokens. El césped y las líneas siguen siendo constantes del renderizador, por ser el objeto de juego (FR-003). El contorno claro de las equipaciones oscuras (FR-034) se decide con la misma función que las chapas de CSS (R11).

**Alternativa descartada**: duplicar los valores en una constante TypeScript, que rompería FR-037.

## R7. Componentes comunes (FR-011, FR-012, FR-012a)

**Decisión**: sin librería de componentes. El marcado y las clases ya existen en las 30 pantallas, así que se hace lo siguiente:

1. **Estilos de elementos y clases existentes** (`button`, `button.secundario`, `a.boton`, `input`, `select`, `fieldset`, `.modal`, `.estadisticas`, `.clasificacion`, `.etiqueta`…) se reescriben en `estilos/componentes.css` sobre los tokens. Esto da el aspecto común sin tocar cada pantalla.
2. **Componentes React nuevos**, solo donde el comportamiento no es CSS:
   - `Icono`: un conjunto SVG en línea con `currentColor` (gol, tarjeta amarilla, tarjeta roja, cambio, lesión, información, éxito, advertencia, error, menú, cerrar, sonido). Sustituye a los emojis de la barra y de los avisos.
   - `Aviso`: avisos en línea y emergentes, de tipo `informacion`, `exito`, `advertencia` o `error`, con icono y texto (FR-003, FR-026, FR-027).
   - `EstadoVacio`: explica qué falta y ofrece la acción para salir (FR-025).
   - `Esqueleto`: bloques con la forma del contenido mientras carga (FR-024).
   - `NombreRecortado`: recorte con puntos suspensivos y etiqueta emergente (Edge Cases, R9).
   - `Insignia`: estados en blanco y grises (FR-023).
   - `MenuNavegacion`: el menú móvil (R8).
3. **Botones**:

   | Clase | Aspecto |
   |---|---|
   | `.boton-principal` | Fondo lima, texto negro, alto 48 px |
   | `.secundario` | Contorno `--color-borde-control`, texto blanco |
   | `.secundario.alternativa` | Contorno y texto lima. Como máximo uno por pantalla (FR-002) |
   | `.texto` | Sin contorno |
   | `.peligro` | Contorno y texto de error. Solo para acciones destructivas con confirmación |

   Estado desactivado: `aria-disabled="true"`, fondo `--color-apagado`, texto suave y motivo visible (003/FR-007). Se mantiene `BarraPrincipal` de 003.
4. **Foco**: `:focus-visible` con `outline: 2px solid var(--color-accion)` y `outline-offset: 2px` en todos los controles. Sobre el botón lima, el anillo se separa con un `box-shadow` interior del color del lienzo para seguir siendo visible (≥ 3:1, FR-030).

**Alternativa descartada**: Radix, React Aria o shadcn. Aportan accesibilidad en componentes complejos, pero el juego solo necesita un diálogo, un menú y una etiqueta emergente, y la plataforma ya los resuelve (`<dialog>`, `popover`). 003 ya eligió no añadir librerías de interfaz.

## R8. Navegación en móvil (FR-012a; Clarifications)

**Decisión**:

- Por debajo de 720 px, la barra muestra el nombre del juego y un botón "Menú" con `aria-expanded` y `aria-controls`.
- El panel es un `<dialog>` abierto con `showModal()`:
  - atrapa el foco y se cierra con Escape de forma nativa;
  - al cerrarse, devuelve el foco al botón "Menú" de forma explícita (`ref.focus()` en el evento `close`);
  - se cierra al elegir un enlace.
- El panel se desliza desde la derecha, o aparece de inmediato con movimiento reducido. Ocupa toda la pantalla a 360 px y 320 px de ancho en tabletas.
- En el partido 2D se mantiene la franja compacta de 003 (40 px, iconos), con iconos SVG.

**Alternativas descartadas**:

- `popover`: no hace inerte el resto de la página;
- `<details>`: no se cierra con Escape ni gestiona el foco.

## R9. Nombres recortados y pulsación larga (Edge Cases; Clarifications)

**Decisión**: `NombreRecortado` envuelve el texto en un elemento con `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`, y solo actúa si el texto está realmente recortado (`scrollWidth > clientWidth`).

| Entrada | Comportamiento |
|---|---|
| Ratón | Etiqueta emergente al señalar, con un retardo de 400 ms |
| Teclado | Etiqueta emergente al enfocar el elemento contenedor, que ya es enfocable (carta, fila) |
| Táctil | Pulsación larga de 500 ms con Pointer Events (`pointerType === 'touch'`); se cancela si el dedo se mueve más de 10 px |

- La etiqueta es un elemento `popover="manual"` con el texto completo, enlazado con `aria-describedby`.
- Para que la pulsación larga no cuente como elección: si se mostró la etiqueta, el `click` siguiente se anula con `preventDefault()` y `stopPropagation()` en fase de captura.
- Para que no se abra el menú del navegador: `contextmenu` se anula en el elemento, con `-webkit-touch-callout: none` y `user-select: none` en el texto recortado.
- El texto completo también se expone a los lectores de pantalla, sin depender de la etiqueta.

**Alternativa descartada**: el atributo `title`. No funciona con el tacto ni con el teclado.

## R10. Animación y movimiento reducido (FR-017, FR-028, FR-033)

**Decisión**:

- Tokens `--duracion-corta` (150 ms) y `--duracion-media` (250 ms), con `--curva-salida: cubic-bezier(0.2, 0, 0, 1)`.
- Solo se animan `opacity` y `transform` (composición sin repintado), y solo en las transiciones que provoca el participante: diálogo, menú, pestañas, sección plegable.
- La única animación no provocada es la entrada del titular de campeón o de derrota (FR-017): el titular sube y aparece una sola vez en unos 600 ms. Sustituye a la combinación actual de trofeo, destellos y balón rodando, que se simplifica para que el titular sea el protagonista.
- Una regla global `@media (prefers-reduced-motion: reduce)` reduce todas las transiciones a un fundido de 100 ms o a ninguno. Las de las cartas y los sobres de 003/FR-015 siguen igual.
- Se eliminan los efectos de señalado decorativos que no informan (FR-028).

## R11. Equipaciones oscuras sobre el lienzo (FR-034, Edge Cases)

**Decisión**:

- Una función pura `necesitaContorno(color, fondo)` en `apps/web/src/componentes/colores.ts`. Devuelve verdadero si el contraste entre el color principal de la equipación y el lienzo es menor de 1,5:1.
- Cuando es verdadero, las chapas, las camisetas y los nombres de equipo de los marcadores llevan un contorno de 2 px en `--color-borde-control`.
- El renderizador 2D usa la misma función para los jugadores.
- Tiene prueba unitaria con negro, azul marino, gris oscuro, blanco y lima.

## R12. Estados de carga, vacío y error (FR-024 a FR-027)

**Decisión**:

- **Carga**: cada pantalla que hoy muestra `<p className="cargando">Cargando…</p>` pasa a un `Esqueleto` con la forma de su contenido (filas de tabla, rejilla de cartas, campo). La animación de pulso es un cambio de opacidad que se desactiva con movimiento reducido.
- **Vacío**: los mensajes y las acciones se recogen en [contracts/ui.md](./contracts/ui.md).
- **Errores**: el texto de cada error del cliente se revisa con la forma "qué ha pasado + qué hacer", sin disculpas. Los de formulario van junto al campo, con `aria-describedby` y `aria-invalid`.
- **Avisos emergentes**: se apilan en una región `aria-live="polite"` (`assertive` para los errores) sobre la `BarraPrincipal`, con un máximo de 3 visibles, sin taparla.

## R13. Verificación automática (FR-040; Clarifications)

**Decisión**:

- **Nueva dependencia de desarrollo**: `@axe-core/playwright` en `apps/web`. Es la única de la spec, y solo para pruebas. axe evalúa el contraste y las reglas WCAG 2.1 AA (`wcag2a`, `wcag2aa`, `wcag21aa`) sobre el DOM real. Escribir esas reglas a mano sería frágil.
- **Ayuda `comprobarDiseno(page, nombre)`** en `apps/web/tests/e2e/diseno/comprobaciones.ts`. Para cada ancho, cambia el tamaño de la ventana y comprueba:
  1. que `document.documentElement.scrollWidth <= clientWidth` (FR-031);
  2. que axe no da infracciones;
  3. que el número de elementos visibles con fondo lima calculado es ≤ 1 (≤ 2 en el descanso contra un NPC, 003/FR-006a), para SC-002;
  4. que, al recorrer la pantalla con Tab, cada control enfocado tiene un contorno de foco de al menos 2 px.

  Los anchos son 360, 768, 1366 y 1920 px, más 683 px, que equivale a la ampliación del 200 % en un portátil de 1366 px.
- **Recorrido de diseño** `tests/e2e/diseno/inventario.spec.ts`: recorre el inventario de FR-013 en una partida en solitario contra NPC, con el reloj simulado, y llama a `comprobarDiseno` en cada pantalla. Reutiliza los flujos de `ayudas.ts` (`partidaTrasDraft` y los de `torneo-final.spec.ts` para el campeón y la derrota).
- **Recorrido con teclado** `tests/e2e/diseno/teclado.spec.ts`: completa crear partida → draft → formación → partido → torneo usando solo `page.keyboard` (SC-007). Si algún paso no se puede hacer con teclado, por ejemplo colocar un jugador en «Formación», se corrige como parte de FR-030.
- **CI**: un trabajo nuevo `e2e-diseno` en `.github/workflows/ci.yml`:
  - servicio `postgres:16`;
  - `pnpm db:migrate`, `pnpm seed --file data/core.json`;
  - `pnpm --filter @fbd/web exec playwright install --with-deps chromium`;
  - `pnpm --filter @fbd/web e2e tests/e2e/diseno`.

  Sin comparación de capturas (Clarifications).
- **Prueba unitaria de tokens** `tests/unit/tokens.test.ts`: lee `tokens.css`, extrae los pares texto/fondo declarados y comprueba los contrastes de R4. Así se detecta un cambio de color que rompa FR-029 antes de llegar a e2e.

**Alternativas descartadas**:

- lanzar toda la batería e2e en CI: 20 recorridos de hasta 3 minutos cada uno, con dependencias de tiempo. Se ejecuta localmente para SC-008 (quickstart);
- Lighthouse CI: más lento, y no comprueba el foco ni el lima.

## R14. Validación con personas (SC-003, SC-004, SC-010)

**Decisión**: `checklists/validacion.md` sigue el formato de `specs/003-mejoras-ux-simulacion/checklists/validacion.md`, con tres pruebas:

- **SC-003, prueba de cinco segundos**: capturas de las pantallas del flujo principal, sin la versión anterior.
- **SC-004, valoración 1–5**: las mismas personas valoran la versión `4168404` y la nueva. Para levantar la versión anterior: `git worktree add ../fbd-4168404 4168404`.
- **SC-010, tiempos de decisión**: elección del draft y confirmación de la alineación, en las dos versiones.

La lista de verificación visual de SC-001 va en `checklists/visual.md`, con una fila por pantalla del inventario y una columna por criterio.

## R15. Textos de la interfaz (FR-035, FR-036)

**Decisión**:

- Se revisan todos los literales de `apps/web/src`:
  - minúscula inicial;
  - sin mayúsculas sostenidas (no se usa `text-transform: uppercase`);
  - verbos concretos;
  - el mismo nombre para una acción en todo el flujo: botón → aviso ("Confirmar alineación" → "Alineación confirmada").
- La tabla de etiquetas de botones de 003/contracts/ui.md se mantiene. [contracts/ui.md](./contracts/ui.md) solo añade las confirmaciones y los vacíos.
- No se centralizan los textos en un catálogo i18n: el juego solo está en español y 003 no lo hizo.
