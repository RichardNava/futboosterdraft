# Contrato de interfaz — spec 004

Define el comportamiento visual y de interacción observable que comprueban:

- las pruebas e2e de diseño (`apps/web/tests/e2e/diseno/`, FR-040);
- la lista de verificación visual (`checklists/visual.md`, SC-001);
- las pruebas con personas (`checklists/validacion.md`).

Se suma a [003/contracts/ui.md](../../003-mejoras-ux-simulacion/contracts/ui.md). Las etiquetas de los botones principales de 003 se mantienen. Cuando este contrato contradice al de 003, prevalece este (solo cambian el color del botón principal y el tema). Los valores concretos están en [research.md](../research.md) R4 y R5, y los componentes, en [data-model.md](../data-model.md).

## 1. Reglas globales (todas las pantallas del inventario)

| Regla | Comprobación observable | Origen |
|---|---|---|
| Tema oscuro fijo | El fondo de `body` es `--color-lienzo` con `prefers-color-scheme: light` emulado | FR-001 |
| Lima reservado | Elementos visibles con `background-color` lima: ≤ 1 (≤ 2 en el descanso contra un NPC) | FR-002, SC-002 |
| Secundario lima | Como máximo un `button.secundario.alternativa` visible por pantalla | FR-002 |
| Sin degradados ni sombras | Ningún contenedor de interfaz fuera de las cartas y los sobres tiene `background-image` ni `box-shadow`, salvo la barra de navegación | FR-008 |
| Esquinas | `border-radius` de botones, paneles, diálogos, campos, imágenes y barra = 6 px | FR-007 |
| Contraste | axe (`wcag2aa`) sin infracciones de `color-contrast` | FR-029, SC-005 |
| Foco | Cada control enfocado con Tab tiene un `outline` de ≥ 2 px de `--color-accion` | FR-030, SC-007 |
| Sin desplazamiento horizontal | `scrollWidth <= clientWidth` a 360, 683, 768, 1366 y 1920 px | FR-031, SC-006 |
| Objetivos táctiles | Con `pointer: coarse`, cada control mide ≥ 44 × 44 px | FR-032 |
| Movimiento reducido | Con `prefers-reduced-motion: reduce` emulado, ninguna transición supera 100 ms, salvo las de 003/FR-015 | FR-033 |
| Texto | Ningún texto con `text-transform: uppercase`; el texto corrido mide ≤ 80 caracteres de ancho | FR-010, FR-035 |
| Tipografía | Titulares de cartel y goles con `--letra-cartel`; resto con `--letra-texto`; `font-display: swap` | FR-005, SC-009 |

## 2. Barra de navegación (FR-012a; research R8)

- **≥ 720 px**:
  - a la izquierda, "Fútboosterdraft" en `--letra-cartel` 600;
  - después, los enlaces en blanco: "Inicio", "Mis partidas", "Nueva partida" y "Mi perfil" (o "Iniciar sesión");
  - el destino activo lleva `aria-current="page"` y un subrayado de 2 px lima;
  - el interruptor de sonido es un botón de texto con icono.
- **< 720 px**:
  - una línea con el nombre del juego y el botón "Menú" (`aria-expanded`, `aria-controls`);
  - el botón abre un `<dialog>` modal con los enlaces y el interruptor de sonido;
  - **Escape**, el botón "Cerrar" o elegir un enlace cierran el panel, y el foco vuelve al botón "Menú";
  - el panel no deja ningún botón principal tapado tras cerrarse.
- **Partido 2D**: la franja compacta de 003 (40 px) con iconos SVG y `aria-label`, sin emojis.

## 3. Inicio (FR-014, FR-015)

- **Sin sesión**, visible sin desplazarse a 1366 × 768 y a 360 × 640:
  - titular "Fútboosterdraft" en `--cartel`, partido en dos líneas como mucho a 360 px;
  - la entradilla "Abre sobres, elige a tus jugadores por turnos y gana el torneo con tu once.", en `--texto-subtitulo`;
  - el botón principal "Empezar a jugar", que lleva al formulario de acceso o de registro que ya existe.
- **Con sesión**:
  - si hay una partida en curso, el botón principal es "Continuar partida" y lleva a la partida activa más reciente, sea cual sea su fase: sala, draft, formación, partido o torneo;
  - si no hay ninguna, el botón principal es "Nueva partida";
  - "Mis partidas" queda como secundario.

## 4. Marcadores (FR-016, FR-034)

- **Goles**: en `--cartel-marcador` con `tabular-nums`, separados por un guion corto.
- **Nombres de equipo**:
  - en `--titulo-pequeno`, con una chapa del color principal de su equipación;
  - con contorno si `necesitaContorno` es verdadero;
  - recortados con `NombreRecortado`.
- **Lugares**: partido rápido, partido 2D (franja), resultado y reproducción.
- **Penaltis**: debajo, en `--texto-subtitulo`: "4-3 en los penaltis".

## 5. Pantallas finales (FR-017)

- **Titular**:
  - campeón: "Campeones" con el nombre del equipo debajo;
  - derrota: "Eliminados" o "Subcampeones" en la final, con la ronda o la jornada debajo.
- **Composición**: el titular se presenta en `--cartel`, centrado, como único elemento protagonista. La ilustración, si se conserva, queda en segundo plano y es más pequeña que el titular.
- **Animación**: una sola entrada del titular (≈ 600 ms, `opacity` + `transform`). Con movimiento reducido, aparece sin animación.

## 6. Jerarquía de las pantallas de juego (FR-018 a FR-023)

| Pantalla | Primer plano | Contexto (panel lateral ≥ 1024 px, debajo en móvil) | Comprobación |
|---|---|---|---|
| Draft | Rejilla de cartas disponibles | "Elección n de 24" en cartel pequeño, sobre actual, flecha de dirección de paso, temporizador (en ámbar en los últimos 10 s, con icono), plantilla acumulada por demarcación | A 1366 × 768, cartas, temporizador y plantilla visibles sin desplazarse |
| Plantillas y Formación | Campo con césped y cartas | Panel lateral oscuro con banquillo, resto, táctica, dorsales, equipación, lanzadores (secciones plegables) | La interacción de 003/FR-001 a FR-005 no cambia (e2e `alineacion`, `dorsales`) |
| Partido 2D | Campo | Franja superior de 48 px: marcador, reloj, velocidades (segmentado) | La franja no se superpone al rectángulo del campo |
| Tablas | Filas | Cifras alineadas a la derecha con `tabular-nums`; fila propia con fondo `--color-elevado` y borde izquierdo lima de 3 px | A 360 px, la tabla se desplaza dentro de su contenedor (`overflow-x: auto`, enfocable con `tabindex="0"` y `aria-label`), nunca la página |
| Eventos del partido | Lista | Minuto alineado a la derecha en una columna de ancho fijo + `Icono` por tipo (gol, amarilla, roja, cambio, lesión) con texto alternativo | Cada evento tiene icono y texto |
| Estado | — | `Insignia` en blanco y grises: fase, jornada, "3 partidos sin ver", conexión | Ninguna insignia usa lima, ámbar ni error, salvo "Sin conexión", que es una advertencia |

Nota sobre la fila propia de las tablas: el borde lima marca "lo tuyo" y cuenta como "elemento activo o marcado" de FR-002. No es un relleno, así que no cuenta para la regla del lima reservado.

## 7. Estados vacíos (FR-025)

| Lista | Mensaje | Acción |
|---|---|---|
| Mis partidas sin partidas | "Todavía no tienes partidas. Crea una para abrir tus primeros sobres." | Botón principal "Nueva partida" |
| Mis partidas sin terminadas (filtro) | "No has terminado ninguna partida." | — |
| Bandeja de avisos | "No tienes avisos." | — |
| Pendientes de ver del torneo | "Has visto todos los partidos de esta jornada." | Secundario "Ver clasificación" |
| Sala sin rivales humanos | "Solo estás tú. Puedes empezar contra la IA o esperar a que alguien se una con el enlace." | Secundario "Copiar enlace" |

## 8. Confirmaciones y errores (FR-026, FR-027)

**Confirmaciones**: se usa el mismo verbo del botón, en un `Aviso` de tipo `exito` emergente de 4 s.

| Botón | Confirmación |
|---|---|
| "Guardar" (perfil) | "Perfil guardado" |
| "Confirmar alineación" | "Alineación confirmada" |
| "Unirme" | "Te has unido a la partida" |
| "Confirmar cambios" | "Cambios confirmados" |
| "Copiar enlace" | "Enlace copiado" |

**Errores**: siempre dicen qué ha pasado y qué hacer.

- **Sin conexión**: "Sin conexión con el servidor. Reintentando…", en un `Aviso` de tipo `advertencia` persistente con el botón "Reintentar ahora". Si se agota el reintento, pasa a tipo `error`.
- **Formulario**: el mensaje va bajo el campo, por ejemplo: "El nombre del equipo debe tener entre 3 y 24 caracteres."
- **Acción rechazada por el servidor**: el `Aviso` de tipo `error` reutiliza el texto de 003 (contrato de errores), revisado sin disculpas.

## 9. Pila de avisos (Edge Cases)

- Una región fija sobre la `BarraPrincipal`, con como máximo 3 avisos visibles. Los nuevos aparecen arriba y los que sobran se agrupan en "y 2 avisos más" (enlace a la bandeja).
- Los avisos de partido (003) y de dorsales usan esta misma región.
- Ningún aviso tapa el botón principal ni otro aviso.

## 10. Nombres recortados (Edge Cases; research R9)

- Nombres de equipo, de jugador y de partida en paneles, marcadores, tablas y cartas.
- **Ratón**: etiqueta con el texto completo al señalar. **Teclado**: al enfocar. **Táctil**: al mantener pulsado 500 ms.
- Mantener pulsado dentro de una carta o fila elegible no la elige ni abre el menú contextual del navegador. Lo comprueba la prueba e2e con `page.touchscreen` y emulación táctil.
