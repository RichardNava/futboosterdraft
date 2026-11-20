# Lista de verificación visual — spec 004 (SC-001)

Revisión manual del nuevo estilo en cada pantalla del inventario ([data-model.md](../data-model.md) §3), a
**1366 × 768** y a **360 × 640** (herramientas de desarrollo en modo dispositivo). Se arranca con `pnpm dev`
(web en `http://localhost:5173`).

Lo que se puede medir automáticamente (contraste, desplazamiento horizontal, lima reservado, foco, mayúsculas
sostenidas, objetivos táctiles) lo comprueban las pruebas de `apps/web/tests/e2e/diseno/`. Esta lista cubre lo que
necesita ojos: que cada pantalla *se vea* como la guía adaptada.

## Criterios

| Criterio | Qué se mira |
|---|---|
| Paleta | Lienzo verde noche con focos, paneles un escalón más claros, texto blanco y gris; el lima solo en el botón principal, el destino activo, lo marcado y el foco; ámbar y rojo solo con icono y texto |
| Tipografía | Titulares y cifras de cartel en Barlow Condensed; el resto en Barlow; sin mayúsculas sostenidas; líneas de texto de ≤ 80 caracteres |
| Paneles | Vidrio oscuro con desenfoque, borde con brillo superior y sombra de elevación; relleno de 20–24 px (FR-042) |
| Botones | Un único principal lima con texto negro; secundarios con contorno gris (como mucho uno lima, la alternativa directa); desactivado apagado y con motivo |
| Esquinas | Escala de tokens: 6 px en controles, 12 px en paneles, 20 px en piezas protagonistas; las cartas con su forma propia |
| Atmósfera | Estadio de noche detrás del contenido (focos, cal, grano), imágenes propias (escudo, sobre, trofeo, estadio) y un único momento animado por pantalla clave (FR-041, FR-044, FR-045) |
| Estados | Carga con esqueleto de la forma del contenido; vacío que explica y ofrece salida; error que dice qué ha pasado y qué hacer |

Marca: ✔ cumple · ✘ no cumple (anota el hallazgo debajo) · — no aplica · auto: no se ve en las capturas; lo cubre `diseno/estados.spec.ts` (carga, vacío y error).

**Recorrido del 2026-11-20** (T074): capturas a 1366 × 768 y 360 × 640 de las 28 vistas del inventario con
`CAPTURAS=<carpeta> pnpm e2e diseno/inventario` (ver `tests/e2e/diseno/comprobaciones.ts`). En las capturas de página
completa la barra principal fija aparece a media página y los titulares animados (campeón, derrota) a medio entrar: son
efectos de la captura, comprobados aparte en la ventana real. Las filas marcan el resultado tras las correcciones de
«Hallazgos».

## Pantallas

| # | Pantalla o elemento | Ancho | Paleta | Tipografía | Paneles | Botones | Esquinas | Atmósfera | Estados |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Inicio sin sesión | 1366 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — |
| 1 | Inicio sin sesión | 360 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — |
| 2 | Inicio con sesión | 1366 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | auto |
| 2 | Inicio con sesión | 360 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | auto |
| 3 | Mis partidas (con y sin partidas) | 1366 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | auto |
| 3 | Mis partidas (con y sin partidas) | 360 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | auto |
| 4 | Mi perfil | 1366 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | auto |
| 4 | Mi perfil | 360 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | auto |
| 5 | Nueva partida | 1366 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | auto |
| 5 | Nueva partida | 360 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | auto |
| 6 | Sala | 1366 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | auto |
| 6 | Sala | 360 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | auto |
| 7 | Draft, apertura de sobres y «Draft terminado» | 1366 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | auto |
| 7 | Draft, apertura de sobres y «Draft terminado» | 360 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | auto |
| 8 | Plantillas | 1366 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | auto |
| 8 | Plantillas | 360 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | auto |
| 9 | Formación (táctica, dorsales, equipación, lanzadores) | 1366 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | auto |
| 9 | Formación (táctica, dorsales, equipación, lanzadores) | 360 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | auto |
| 10 | Partido: preparación | 1366 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | auto |
| 10 | Partido: preparación | 360 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | auto |
| 11 | Partido: simulación rápida | 1366 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | auto |
| 11 | Partido: simulación rápida | 360 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | auto |
| 12 | Partido: simulación 2D | 1366 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | auto |
| 12 | Partido: simulación 2D | 360 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | auto |
| 13 | Descanso y gestión del equipo | 1366 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — |
| 13 | Descanso y gestión del equipo | 360 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — |
| 14 | Resultado del partido | 1366 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — |
| 14 | Resultado del partido | 360 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — |
| 15 | Reproducción de un partido | 1366 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | auto |
| 15 | Reproducción de un partido | 360 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | auto |
| 16 | Torneo (jornadas, clasificación, cuadro, pendientes de ver) | 1366 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | auto |
| 16 | Torneo (jornadas, clasificación, cuadro, pendientes de ver) | 360 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | auto |
| 17 | Pantalla de campeón | 1366 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — |
| 17 | Pantalla de campeón | 360 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — |
| 18 | Pantalla de derrota | 1366 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — |
| 18 | Pantalla de derrota | 360 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — |
| 19 | Barra de navegación (escritorio, menú móvil, franja 2D) | 1366 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — |
| 19 | Barra de navegación (escritorio, menú móvil, franja 2D) | 360 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — |
| 20 | Bandeja de avisos | 1366 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | auto |
| 20 | Bandeja de avisos | 360 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | auto |
| 21 | Avisos de partido y de dorsales | 1366 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — |
| 21 | Avisos de partido y de dorsales | 360 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — |
| 22 | Ficha de jugador | 1366 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | auto |
| 22 | Ficha de jugador | 360 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | auto |
| 23 | Barra principal | 1366 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — |
| 23 | Barra principal | 360 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — |

## Escenarios concretos ([quickstart.md](../quickstart.md) §4)

- [X] **Portada sin sesión** (ventana privada): titular de cartel, entradilla y «Empezar a jugar» sin desplazarse a 1366 × 768 y a 360 × 640 (FR-014).
- [X] **Modo claro**: con el modo claro del sistema activado, la aplicación sigue oscura (US1-3).
- [X] **Fuentes que no cargan**: bloqueando `/fuentes/*` en las herramientas de desarrollo y recargando, el texto se ve con la tipografía alternativa, sin huecos ni saltos apreciables (SC-009).
- [X] **Zoom al 200 %** a 1366 px: sin desplazamiento horizontal (Edge Cases).
- [X] **Equipación negra**: en «Mi perfil», una equipación negra lisa; la vista previa, la chapa y el marcador muestran contorno (FR-034).
- [X] **Draft**: a 1366 × 768, las 8 cartas, el temporizador, la mesa, la plantilla y «Confirmar elección» visibles sin desplazarse (FR-046); en los últimos 10 s, el reloj en ámbar con icono (FR-018).
- [X] **Final de torneo**: en la pantalla de campeón o de derrota, el titular de cartel es lo protagonista y solo se anima una vez (FR-017).
- [X] **Pila de avisos**: un aviso de dorsales durante el de un partido se apilan sin tapar el botón principal; con más de tres, «y N avisos más».

## Hallazgos

| # | Pantalla | Ancho | Hallazgo | Corrección |
|---|---|---|---|---|
| 1 | Bandeja de avisos (Inicio y Torneo) | 360 | Anclada al borde derecho del botón, la lista empezaba en x = −92 en Inicio (y más a la izquierda en Torneo): se salía de la pantalla | Por debajo de 720 px la lista se ancla al contenedor con los márgenes de la página (`base.css`, `.lista-avisos`); medido en Inicio a 360, 683, 768 y 1366 y en Torneo a 360 |
| 2 | Partido: simulación 2D (franja) | 360 | El nombre del visitante tapaba el segundo dígito del resultado | `.goles-2d` con `flex-shrink: 0`: se recortan los nombres, nunca el resultado |
| 3 | Partido: simulación 2D (campo) | 1366 | El nombre de un jugador pegado a la banda o al fondo se cortaba en el borde del lienzo («rnardashvili») | El texto centrado se desplaza para quedar dentro del lienzo (`campo2d/renderizador.ts`, `texto`) |

**Observaciones sin corregir** (no incumplen la guía, o piden una decisión de diseño):

- Titulares de sección en Barlow normal en «Mi perfil» (Escudo, Sobre), «Sala» (Nombre del equipo), «Mis partidas» (En curso, Terminadas) y la ficha de «Plantillas», mientras que los mismos bloques en «Formación → Personalización» van en Barlow Condensed.
- En la pantalla de campeón, el nombre de un invitado se parte por el guion («¡Equipo de Invitado-» / «6161, campeón…»).
- En la franja de la 2D a 360 px los nombres de los equipos quedan en dos o tres letras («D…», «E…»); se leen enteros con una pulsación larga.
- En las cartas compactas del banquillo, el nombre se apoya sobre la banda superior del marco.
- La chapa del portero en la línea de gol puede quedar cortada a medias por el borde del campo (solo el dorsal).
