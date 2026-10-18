# Contrato de interfaz — spec 003

Define el comportamiento observable de la interfaz que las pruebas e2e y las pruebas con personas comprueban. Sustituye a los apartados equivalentes de [002/contracts/ui.md](../../002-mejoras-mvp/contracts/ui.md) cuando los contradice. Las etiquetas visibles llevan tildes, y los identificadores, no.

## Barra principal (`BarraPrincipal`, FR-006, FR-007; research R16)

- Cada pantalla del flujo tiene **como máximo un** botón principal, y siempre está dentro de la `BarraPrincipal`, fija al pie del área de contenido.
- **Botones principales**:

  | Pantalla | Etiqueta |
  |---|---|
  | Fin del draft | «Preparar equipo» |
  | Preparación | «Comenzar partido» o «Ver partido» |
  | «Formación» | «Confirmar alineación» |
  | Partido rápido en juego | «Finalizar partido» |
  | Sala | «Empezar» (anfitrión) o «Listo» |
  | Partido 2D en juego, contra un NPC | «Finalizar partido» (secundario: «Gestionar equipo») |
  | Partido 2D en juego, entre humanos | «Finalizar partido» |
  | Descanso o antes de la prórroga, contra un NPC | «Gestionar equipo» (secundarios: «Seguir» y, en la 2D, «Finalizar partido») |
  | Descanso o antes de la prórroga, entre humanos | «Seguir» (en la 2D, secundario: «Finalizar partido») |
  | `GestionEquipo` | «Confirmar cambios» (secundario: «Volver sin cambios») |
  | Resultado | «Siguiente» |
  | Fin de jornada | «Siguiente jornada» |
  | Derrota sin humanos en competición | «Simular resto del torneo» (secundario: «Volver al menú») |
  | Derrota con humanos en competición | «Ver torneo» (secundario: «Volver al menú») |
  | Derrota en la final (torneo terminado) | «Ver campeón» |
  | Campeón | «Volver al menú» |
  | «Mi perfil» | «Guardar» |

  En cada momento hay como máximo un botón principal; cambia con el estado de la pantalla (FR-006). En los partidos entre humanos no existe «Gestionar equipo», porque se juegan con decisiones automáticas (FR-027, FR-031).

- **Visibilidad**: el botón está en el viewport a 1366 × 768 y a 360 × 640, antes y después de desplazarse hasta el final del contenido. El contenido nunca queda tapado: tiene un relleno inferior igual a la altura de la barra.
- **Estilo común**:
  - alto ≥ 48 px, color de acento exclusivo y contraste ≥ 4,5:1;
  - los secundarios llevan borde y van sin relleno;
  - **desactivado**: sigue visible, con `aria-disabled="true"` y el motivo a su lado, enlazado con `aria-describedby`. Por ejemplo, «Falta un portero en la portería».

## «Formación» (`Alineacion` sobre `CampoEquipo`, FR-001 a FR-003; research R14)

- Un **único campo**. Junto a él, el banquillo (7) y el resto de la plantilla. No hay ningún otro campo.
- **Gestos con ratón, táctil o lápiz**:

  | Gesto | Resultado |
  |---|---|
  | Soltar un titular en una zona libre del campo | se recoloca ahí |
  | Soltar un titular sobre otro titular | intercambian sitio |
  | Soltar un suplente sobre un titular | intercambio: el titular pasa al banquillo |
  | Soltar fuera del campo y del banquillo | no cambia nada |
  | Soltar muy cerca de otra ficha | ocupa el punto libre más cercano, sin solaparse |

- Al soltar, la ficha muestra al momento la posición efectiva, el porcentaje de penalización y la media efectiva.
- **Teclado**: Tab hasta la ficha, Enter para seleccionarla, flechas para moverla (10 u, o 50 con Mayús) y Enter sobre otra ficha para intercambiarlas.
- **Cambio de formación con recolocaciones**: el diálogo «Se perderá la colocación personalizada. ¿Cambiar de formación?» ofrece «Cambiar» y «Cancelar». Sin recolocaciones, el cambio se aplica sin diálogo (FR-002a).

## Vista ampliada de la carta (`VistaCarta`, FR-004, FR-005; research R15)

- **Con ratón**: aparece la carta completa (el mismo diseño de la plantilla) 150 ms después de entrar en la ficha, siempre en < 500 ms. Desaparece al salir.
- **En táctil**: aparece con una pulsación mantenida de 400 ms sin mover, y desaparece al soltar.
- No aparece durante un arrastre.
- **Posición**: no tapa la ficha señalada, se coloca en el lado que tenga espacio (derecha, izquierda, arriba o abajo) y queda **entera** dentro de la pantalla, con un margen de 8 px.
- **Dónde está disponible**: «Formación», `GestionEquipo`, banquillo y resto de la plantilla.

## Selector de modo (`SelectorModo`, FR-032 a FR-035; research R19)

- En la tarjeta de preparación, encima del botón principal, hay dos opciones exclusivas: «Simulación rápida» y «Simulación 2D». Viene preseleccionada con `modalidadPreferida`.
- Una vez empezado el partido, el selector no aparece.
- «Crear partida» no tiene ninguna opción de tipo de simulación.

## Gestión del equipo durante el partido (`GestionEquipo`, FR-027 a FR-031; research R17)

- **Cuándo se abre** (solo en los partidos contra un NPC; `partido.inicio.gestionDisponible`):
  - en la rápida, con el botón principal «Gestionar equipo» en el descanso y antes de la prórroga;
  - en la 2D, además, en cualquier momento con «Gestionar equipo», que **pausa** la reproducción.
- **Pantalla completa** con:
  - `CampoEquipo` en modo partido: los jugadores en el campo, con su colocación actual;
  - el banquillo;
  - el contador «Sustituciones restantes: N»;
  - los paneles de táctica y de lanzadores.
- **Fichas**:
  - muestran sus tarjetas, lesión y cansancio;
  - los expulsados no aparecen en el campo;
  - los sustituidos y los expulsados no se pueden arrastrar al campo.
- **Sustitución**: soltar un suplente sobre un titular la registra como pendiente, y el contador baja. Sin sustituciones restantes, el gesto se rechaza con el mensaje «Ya has hecho las 5 sustituciones».
- **Botones**:
  - «Confirmar cambios» envía el lote, y si es válido cierra y reanuda la reproducción. Si no, muestra el motivo y la decisión que falló;
  - «Volver sin cambios» cierra la pantalla, preguntando «¿Descartar los cambios?» si los había.
- **En la 2D con el balón en juego**: tras confirmar, aparece el aviso «Los cambios se aplicarán en la próxima interrupción».

## Resultado del partido (`ResultadoPartido`, FR-024 a FR-026; research R18)

- Muestra el marcador final (con prórroga y penaltis), los eventos relevantes con su minuto, las estadísticas y el botón principal «Siguiente».
- Es **el mismo componente** al terminar un partido rápido y al finalizar un partido 2D. En este último caso no queda ni campo ni chapas.
- Los goles muestran su tipo: «jugada», «de cabeza», «de falta» o «de penalti».

## Carta de jugador (`CartaJugador`, FR-008 a FR-010; research R20)

- La disposición de 002 no cambia.
- **Marco propio**: escudo achaflanado, franja del color del nivel y textura.
- **Brillo**: animado solo en Legendario y GOAT. Sin brillo con movimiento reducido.
- **Tamaño del texto en la carta completa**:
  - en portátil, stats y specials ≥ 16 px (1rem), con el valor del stat en negrita a 1,25 veces el tamaño de su abreviatura;
  - a 360 px, ≥ 14 px.
- Un GOAT con 4 specials no se desborda. La variante compacta se mantiene en las listas largas.

## Apertura de sobre (`AperturaSobre`, FR-011 a FR-015; research R21)

- **Secuencia** (≤ 8 s):
  1. el sobre brilla, tiembla y se rasga, con partículas;
  2. las 8 cartas salen una a una boca abajo hasta su sitio;
  3. cada carta gira y muestra la **carta completa**;
  4. Legendario y GOAT tienen su propio destello y sus partículas de color.
- **Salto**: un clic o un toque en cualquier punto revela todas las cartas colocadas.
- **Movimiento reducido**: fundido simple, sin partículas ni giros.
- **Sonido**: suave, de unos 0,6 s y más bajo que el resto de sonidos. Respeta el silencio de 002/FR-010.

## Derrota y campeón (`PantallaDerrota`, `PantallaCampeon`, FR-039 a FR-041b; research R22)

- **Derrota**: ilustración y el texto «{Nombre del equipo} ha sido derrotado en {Fase}», con las fases «Fase de liga», «Octavos de final», «Cuartos de final», «Semifinales» y «Final».
  - Sin humanos en competición, el botón principal es «Simular resto del torneo», y al pulsarlo se pasa a la pantalla del campeón sin pasar por los partidos. El secundario, «Volver al menú», sale sin simular; al volver a la partida se ve la misma pantalla.
  - Con otros humanos en competición, el botón principal es «Ver torneo», y el secundario, «Volver al menú».
  - Si se pierde la final, el torneo ya ha terminado: el botón principal es «Ver campeón» y lleva a la pantalla del campeón.
- **Campeón**: trofeo y el texto «¡{Nombre del equipo campeón}, campeón del torneo!». La ven todos los participantes, también cuando el campeón es un NPC.
- En una liga pura no hay nunca pantalla de derrota.
- Si el participante no está mirando cuando ocurre, la pantalla aparece la próxima vez que abre la partida.

## Nombre y equipación (`Sala`, `EditorEquipacion`, `Perfil`, FR-042 a FR-047; research R23, R24)

- **Sala** (antes del draft) y «Formación» (hasta que se abre el primer partido del torneo; después el nombre se muestra solo como texto):
  - campo «Nombre del equipo», con 3–24 caracteres y un contador;
  - errores en línea: «Ese nombre ya lo usa otro equipo», «Mínimo 3 caracteres»…
- **Editor de equipación**, para la primera y la segunda:
  - diseño a elegir entre lisa, rayas verticales, franjas horizontales, banda diagonal y mitades;
  - 1–3 selectores de color;
  - vista previa SVG en vivo.

  Si la primera y la segunda se parecen demasiado, se avisa y no se guarda.
- **«Mi perfil»** (solo usuarios registrados): nombre de equipo y equipaciones por defecto, que se proponen en cada partida nueva.
- **2D**: la chapa muestra el color principal y el patrón del diseño, y los dos equipos se distinguen siempre.
