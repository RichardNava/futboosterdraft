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

Marca: ✔ cumple · ✘ no cumple (anota el hallazgo debajo) · — no aplica.

## Pantallas

| # | Pantalla o elemento | Ancho | Paleta | Tipografía | Paneles | Botones | Esquinas | Atmósfera | Estados |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Inicio sin sesión | 1366 | | | | | | | — |
| 1 | Inicio sin sesión | 360 | | | | | | | — |
| 2 | Inicio con sesión | 1366 | | | | | | | |
| 2 | Inicio con sesión | 360 | | | | | | | |
| 3 | Mis partidas (con y sin partidas) | 1366 | | | | | | | |
| 3 | Mis partidas (con y sin partidas) | 360 | | | | | | | |
| 4 | Mi perfil | 1366 | | | | | | | |
| 4 | Mi perfil | 360 | | | | | | | |
| 5 | Nueva partida | 1366 | | | | | | | |
| 5 | Nueva partida | 360 | | | | | | | |
| 6 | Sala | 1366 | | | | | | | |
| 6 | Sala | 360 | | | | | | | |
| 7 | Draft, apertura de sobres y «Draft terminado» | 1366 | | | | | | | |
| 7 | Draft, apertura de sobres y «Draft terminado» | 360 | | | | | | | |
| 8 | Plantillas | 1366 | | | | | | | |
| 8 | Plantillas | 360 | | | | | | | |
| 9 | Formación (táctica, dorsales, equipación, lanzadores) | 1366 | | | | | | | |
| 9 | Formación (táctica, dorsales, equipación, lanzadores) | 360 | | | | | | | |
| 10 | Partido: preparación | 1366 | | | | | | | |
| 10 | Partido: preparación | 360 | | | | | | | |
| 11 | Partido: simulación rápida | 1366 | | | | | | | |
| 11 | Partido: simulación rápida | 360 | | | | | | | |
| 12 | Partido: simulación 2D | 1366 | | | | | | | |
| 12 | Partido: simulación 2D | 360 | | | | | | | |
| 13 | Descanso y gestión del equipo | 1366 | | | | | | | — |
| 13 | Descanso y gestión del equipo | 360 | | | | | | | — |
| 14 | Resultado del partido | 1366 | | | | | | | — |
| 14 | Resultado del partido | 360 | | | | | | | — |
| 15 | Reproducción de un partido | 1366 | | | | | | | |
| 15 | Reproducción de un partido | 360 | | | | | | | |
| 16 | Torneo (jornadas, clasificación, cuadro, pendientes de ver) | 1366 | | | | | | | |
| 16 | Torneo (jornadas, clasificación, cuadro, pendientes de ver) | 360 | | | | | | | |
| 17 | Pantalla de campeón | 1366 | | | | | | | — |
| 17 | Pantalla de campeón | 360 | | | | | | | — |
| 18 | Pantalla de derrota | 1366 | | | | | | | — |
| 18 | Pantalla de derrota | 360 | | | | | | | — |
| 19 | Barra de navegación (escritorio, menú móvil, franja 2D) | 1366 | | | | | | | — |
| 19 | Barra de navegación (escritorio, menú móvil, franja 2D) | 360 | | | | | | | — |
| 20 | Bandeja de avisos | 1366 | | | | | | | |
| 20 | Bandeja de avisos | 360 | | | | | | | |
| 21 | Avisos de partido y de dorsales | 1366 | | | | | | | — |
| 21 | Avisos de partido y de dorsales | 360 | | | | | | | — |
| 22 | Ficha de jugador | 1366 | | | | | | | |
| 22 | Ficha de jugador | 360 | | | | | | | |
| 23 | Barra principal | 1366 | | | | | | | — |
| 23 | Barra principal | 360 | | | | | | | — |

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
| | | | | |
