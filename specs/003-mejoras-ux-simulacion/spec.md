# Feature Specification: Mejoras de interfaz, simulación y experiencia de juego

**Feature Branch**: `003-mejoras-ux-simulacion`

**Created**: 2026-10-18

**Status**: Draft

**Input**: User description: "Spec 3 — Mejoras de interfaz, simulación y experiencia de juego: interfaz «Formación» (colocación en el campo de la alineación y vista ampliada de las cartas al pasar el cursor); diseño de las cartas; efectos de apertura de los sobres; botones importantes más visibles y siempre accesibles; simulación 2D (realismo, media de goles, variedad de goles, peso de stats y specials, finalización anticipada a una pantalla de resultado y gestión visual del equipo en el descanso); elección del modo de simulación antes de cada partido; menor dificultad de los NPC; feedback de derrota y de campeón; nombre del equipo para todos y equipaciones con rayas, franjas y varios colores."

**Relación con las specs anteriores**: esta especificación modifica y amplía [specs/001-draft-manager-mvp/spec.md](../001-draft-manager-mvp/spec.md) y [specs/002-mejoras-mvp/spec.md](../002-mejoras-mvp/spec.md). Las referencias del tipo "001/FR-045" o "002/FR-034" apuntan a requisitos de esas specs. Cuando un requisito de esta spec contradice uno anterior, prevalece el de esta spec, y la spec afectada se actualiza para reflejarlo (ver "Requisitos de specs anteriores afectados").

**Versión de referencia**: cuando un criterio compara con "la versión actual", se refiere al commit `c8a1627` de la rama `002-mejoras-mvp`, el último antes de esta spec.

## Clarifications

### Session 2026-10-18

- Q: ¿Cuándo aparece el mensaje «[Equipo] ha sido derrotado en [fase]»? → A: Al perder una eliminatoria (partido de playoff) o al no clasificarse para el playoff desde la liga de un torneo mixto. En una liga pura no hay mensaje de derrota, solo la pantalla del campeón.
- Mejora añadida por el usuario en la misma respuesta: cuando el equipo del participante queda eliminado en un torneo contra NPC y quedan partidos por jugar, el resto del torneo se simula entero de una vez, sin ir partido a partido (FR-041a y FR-041b).
- Q: ¿Los 2,6–3,4 goles son un objetivo por partido? → A: No. Es la media de un torneo (y de las series de partidos). Cada partido puede acabar de cualquier forma, 0-0, 2-1 o 5-2, siempre que la media quede en el rango.
- Q: ¿Qué reparto de goles por zona y tipo se busca? → A: *(La parte de la zona está sustituida por la decisión del 2026-10-19 sobre SC-002: alrededor del 25 % fuera del área.)* Entre el 60 % y el 65 % de los goles desde dentro del área; entre el 6 % y el 12 % de penalti, entre el 10 % y el 18 % de cabeza y entre el 5 % y el 10 % de falta directa.
- Q: ¿Se fijan porcentajes de victoria contra cada nivel de NPC? → A: No. Ningún porcentaje se impone: la probabilidad de marcar, evitar goles y ganar sale del motor, que combina stats, specials, medias, colocación y decisiones tácticas. Los NPC son más fáciles porque toman peores decisiones que ahora en el draft y en la preparación del equipo. El PRO apenas comete errores, pero también toma alguna decisión dudosa para dar opciones al humano.

### Session 2026-10-18 (/speckit-clarify)

- Q: Si el participante ha recolocado jugadores a mano y luego elige otra formación, ¿qué pasa con la colocación? → A: Se reinicia: todos los titulares pasan a las casillas de la nueva formación, con un aviso previo de que se perderá la colocación personalizada (FR-002a).
- Q: ¿La pantalla con campo se usa también para los cambios pedidos con el balón en juego en la 2D? → A: Sí, siempre. Un botón «Gestionar equipo» está disponible durante todo el partido 2D; al abrirlo la 2D se pausa y los cambios se aplican en la siguiente interrupción. Los selectores actuales se eliminan (FR-031).
- Q: ¿El nombre del equipo y las equipaciones se guardan en la cuenta o se eligen en cada partida? → A: Los usuarios registrados guardan un nombre y unas equipaciones por defecto en su cuenta, que se proponen al empezar cada partida y se pueden cambiar solo para esa partida. Los invitados los eligen en cada partida (FR-042b).

### Session 2026-10-19 (/speckit-tasks)

- Q: ¿Qué parte de los goles se marca desde fuera del área? → A: Alrededor del 25 % (SC-002, con una tolerancia de medida del 22 % al 28 %). Sustituye al reparto de la sesión anterior (60–65 % dentro del área), que el plan había marcado como poco realista.

### Session 2026-10-19 (/speckit-analyze)

- Q: ¿Qué hace «Gestionar equipo» en un partido entre dos humanos, que se resuelve con decisiones automáticas (002/FR-030)? → A: Nada: la gestión durante el partido solo existe contra un NPC. En los partidos entre humanos no aparece el botón y el descanso solo ofrece «Seguir» (FR-027 y FR-031).
- Q: ¿Hasta cuándo se puede cambiar el nombre del equipo? → A: Hasta que se abre el primer partido del torneo (FR-042).
- Q: ¿Cómo se comprueba la media de goles por torneo? → A: La media de las series y la de la serie de torneos Core están entre 2,6 y 3,4, y al menos el 90 % de los torneos individuales también (SC-001).
- Q: ¿Cómo comprueba una persona no técnica los SC estadísticos (Principio IX)? → A: La herramienta de equilibrado genera un informe HTML legible con cada SC, su objetivo y su resultado, y la constitución lo aclara en su próxima enmienda.
- Q: En la 2D contra un NPC, ¿qué botón es el principal? → A: Depende del estado: en juego, «Finalizar partido»; en el descanso y antes de la prórroga, «Gestionar equipo». *(Sustituido el 2026-10-20: en el descanso, «Gestionar equipo» y «Seguir» con la misma importancia, FR-006a.)*
- Q: ¿Qué opciones tiene el único humano eliminado? → A: «Simular resto del torneo» como principal y «Volver al menú» como secundario (US10, escenario 3).
- Q: ¿Qué ve quien pierde la final? → A: El mensaje de derrota en «Final», con «Ver campeón», y después la pantalla del campeón.
- Q: ¿Dónde se recuerda el último modo de simulación? → A: En el participante y, para los registrados, también en su cuenta, de modo que una partida nueva arranca con el último que usó. Si no hay ninguno, el modo por defecto es «Simulación rápida» (FR-032).
- Q: ¿Cuánto es "claramente más" en SC-010? → A: Al menos 15 puntos porcentuales más de victorias que en la versión actual.
- Q: ¿Se miden en serie el pase y el físico de FR-021? → A: Sí: SC-006 añade umbrales para el pase (pases que rompen líneas) y para el físico y la velocidad (duelos ganados y conducciones largas).
- Q: ¿Qué pasa si el nombre guardado en la cuenta ya lo usa otro equipo? → A: Se asigna el nombre por defecto y se avisa al participante para que pueda cambiarlo.
- Q: ¿Hay goles en propia puerta? → A: Sí. El motor los genera en despejes de centros y en tiros desviados, y son entre el 1 % y el 3 % de los goles (FR-020, SC-003).

### Session 2026-10-19 (/speckit-analyze, segunda ronda)

- Q: ¿Cómo se concilia el Principio IX con los SC estadísticos? → A: La constitución se enmienda ya (v1.0.4): los criterios estadísticos se comprueban leyendo el informe legible de la herramienta de equilibrado.
- Q: En SC-001, ¿1-2 y 2-1 son el mismo resultado? → A: No. Se cuentan con orden (local-visitante), para detectar sesgos como el 1-2 del 20 % de la línea base.
- Q: ¿Se puede gestionar el equipo durante la tanda de penaltis? → A: No. En la tanda no hay cambios posibles (FR-031).

### Session 2026-10-20 (validación con personas, checklists/validacion.md)

- Q: ¿Qué pasa al pulsar «Confirmar alineación»? → A: Se guarda la alineación y se vuelve a la pantalla del torneo, donde está la preparación del partido (FR-003b). «Formación» ya no ofrece empezar el partido.
- Q: ¿Dónde se elige el modo de simulación? → A: Solo en la tarjeta de preparación del partido; el selector no aparece en «Formación» (FR-032).
- Q: ¿Quién marca los goles, además del delantero centro? → A: Los extremos y mediapuntas llegan al área según la jugada, y el regate sirve para escapar del defensor y acercarse a ella; en 3-4-3, 4-2-3-1 y 4-3-3 marcan entre el 25 % y el 50 % de los goles del equipo (SC-023).
- Q: ¿Cuándo se asignan los dorsales? → A: Automáticamente al terminar el draft, antes de «Preparar equipo», según la posición de cada jugador en la alineación automática; ya no al confirmar el primer once (FR-001b).
- Q: En el descanso contra un NPC, ¿«Gestionar equipo» es el único botón principal? → A: No: «Gestionar equipo» y «Seguir» tienen la misma importancia, con «Seguir» a la derecha (FR-006a, FR-027).
- Q: Dificultad de los NPC → A: se suman 100 milésimas a la probabilidad de error de cada familia, y la partida tendrá un nivel de dificultad (Fácil, Normal por defecto, Difícil) que reparte los niveles de los NPC de relleno (validacion.md, H13 y H14). Se especifica en FR-038a.
- Q: ¿Cómo reparte cada nivel de dificultad los NPC de relleno? → A: «Fácil», amateur e intermedio a partes iguales; «Normal», amateur, intermedio o avanzado al azar (como hasta ahora); «Difícil», intermedio y avanzado a partes iguales. Nunca PRO, que solo se elige al añadir NPC a mano (FR-038a).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Simulación 2D que parece fútbol de verdad (Priority: P1)

El participante ve un partido 2D y reconoce el fútbol: los equipos combinan con pases cortos, los jugadores conducen el balón cuando tienen espacio, y los pases largos aparecen solo cuando tienen sentido (un cambio de orientación, un balón a la espalda de la defensa, una salida bajo presión). Un delantero cerca del área rival no devuelve el balón a su central. Los goles llegan sobre todo desde dentro del área o sus inmediaciones, y hay de todo tipo: jugadas combinadas, remates de cabeza tras centro, faltas directas y penaltis. A lo largo de un torneo, la media es de unos tres goles por partido, aunque cada partido puede acabar 0-0, 2-1 o 5-2. Las características de cada jugador se notan: el buen regateador encara, el buen tirador prueba desde fuera cuando la situación lo permite y el buen defensa corta, intercepta y recupera balones.

**Why this priority**: Las pruebas con más de cinco personas valoraron negativamente el realismo de la 2D. Es la modalidad más vistosa del juego, y si no parece fútbol, el resto de mejoras luce menos. Además, el exceso de goles y de goles lejanos afecta a la credibilidad de los resultados en las dos modalidades, porque comparten el mismo motor.

**Independent Test**: Se puede probar con series de partidos simulados que miden la media de goles, la distancia y el tipo de cada gol, la longitud y dirección de los pases y las acciones de los jugadores según sus stats; y viendo partidos completos a x2 para juzgar el comportamiento.

**Acceptance Scenarios**:

1. **Given** un torneo o una serie de partidos entre equipos equilibrados, **When** se calcula la media de goles, **Then** está alrededor de tres goles por partido, y entre los resultados hay tanto partidos sin goles como partidos con muchos goles (SC-001).
2. **Given** un delantero con el balón cerca del área rival y compañeros por delante o a su altura, **When** decide qué hacer, **Then** conduce, regatea, combina en corto, centra o tira, y no lanza un pase largo hacia su propio campo.
3. **Given** un jugador con el balón en su campo o en el centro del campo, **When** no tiene un rival encima y hay espacio por delante, **Then** suele conducir el balón hacia delante antes de pasar.
4. **Given** un jugador con el balón en el centro del campo o más atrás, **When** valora tirar, **Then** casi nunca tira, y cuando lo hace casi nunca marca.
5. **Given** un extremo que llega a la línea de fondo y un delantero con buen remate de cabeza en el área, **When** centra, **Then** el remate de cabeza es una de las formas habituales de gol.
6. **Given** una falta cerca del área a favor de un equipo con un lanzador especialista, **When** se lanza, **Then** el lanzamiento directo a puerta es posible y a veces termina en gol.
7. **Given** dos jugadores iguales salvo en que uno tiene 15 puntos más de regate, **When** se juegan muchos partidos, **Then** el de mejor regate intenta claramente más regates y conducciones.
8. **Given** dos defensas iguales salvo en que uno tiene 15 puntos más de defensa, **When** se juegan muchos partidos, **Then** el de mejor defensa consigue claramente más intercepciones, entradas ganadas y recuperaciones.
9. **Given** un jugador con buen tiro en la frontal del área con espacio para armar el disparo, **When** se compara con un jugador de tiro bajo en la misma situación, **Then** el de buen tiro dispara desde fuera del área con más frecuencia.

---

### User Story 2 - Preparar el equipo sobre un único campo con cartas a la vista (Priority: P1)

En la pantalla «Formación», el participante ve un solo campo con sus titulares. En ese campo elige y cambia titulares, y también arrastra a cada jugador a la zona exacta donde quiere que juegue. Desaparece el segundo campo de «colocación», que no funcionaba bien. Al pasar el cursor por encima de la ficha de cualquier jugador, en el campo o en el banquillo, aparece su carta completa, con stats y specials, sin necesidad de abrir otra pantalla.

**Why this priority**: Es la pantalla en la que el participante pasa más tiempo antes de cada partido, y hoy obliga a manejar dos campos, uno de los cuales falla. Unificar la colocación y poder consultar cada carta al instante mejora directamente las decisiones tácticas, que son el núcleo del juego (Principio I).

**Independent Test**: Se puede probar en la pantalla «Formación» cambiando titulares, arrastrando jugadores a distintas zonas del mismo campo, comprobando la posición efectiva y la penalización, y pasando el cursor sobre cada ficha.

**Acceptance Scenarios**:

1. **Given** la pantalla «Formación», **When** el participante la abre, **Then** ve un único campo con los titulares, y no hay ningún otro campo de colocación.
2. **Given** un titular en el campo, **When** el participante lo arrastra a otra zona y lo suelta, **Then** el jugador queda en esa zona, y la pantalla muestra al momento su nueva posición efectiva y su penalización (002/FR-034).
3. **Given** un suplente, **When** el participante lo arrastra sobre un titular del campo, **Then** se intercambian: el suplente pasa a ocupar el sitio del titular y el titular pasa al banquillo.
4. **Given** dos titulares, **When** el participante arrastra uno sobre el otro, **Then** intercambian sus sitios.
5. **Given** cualquier ficha de jugador en el campo o en el banquillo, **When** el participante pasa el cursor por encima, **Then** en menos de medio segundo ve la carta completa del jugador sin que tape la ficha señalada, y al retirar el cursor la carta desaparece.
6. **Given** un dispositivo táctil, **When** el participante mantiene pulsada una ficha, **Then** ve la carta completa, y al soltar sin moverse la carta desaparece.
7. **Given** una colocación que deja la alineación inválida (por ejemplo, ningún portero en la portería), **When** el participante intenta confirmar la alineación, **Then** se le indica el problema y no se confirma.
8. **Given** una alineación válida en «Formación», **When** el participante pulsa «Confirmar alineación», **Then** se guarda y vuelve a la pantalla del torneo, donde elige el modo y empieza el partido; en «Formación» no hay selector de modo ni botón para empezar el partido (FR-003b, FR-032).
9. **Given** un draft recién terminado, **When** el participante pulsa «Preparar equipo», **Then** los 24 jugadores ya tienen dorsal, asignado según su posición en la alineación automática, y confirmar el once no los cambia (FR-001b).

---

### User Story 3 - Elegir el modo de simulación antes de cada partido (Priority: P1)

Antes de cada partido, en la pantalla de preparación, el participante elige si quiere verlo en «Simulación rápida» o en «Simulación 2D». La elección vale solo para ese partido: puede ver un partido en 2D y el siguiente en rápida. Ya no se fija un tipo de simulación al crear el torneo.

**Why this priority**: Hoy, quien quiere ver un partido importante en 2D tiene que haber elegido la 2D para todo el torneo. Elegir partido a partido es un cambio pequeño con mucho impacto en el uso diario, y es coherente con los torneos asíncronos (002/FR-030), en los que cada participante ve su partido cuando quiere.

**Independent Test**: Se puede probar jugando un torneo en el que se alterna el modo de un partido a otro, y comprobando que cada partido se presenta en el modo elegido y que el resultado no depende del modo.

**Acceptance Scenarios**:

1. **Given** la pantalla de preparación de un partido, **When** el participante la abre, **Then** ve el selector de modo con «Simulación rápida» y «Simulación 2D», con el último modo que usó preseleccionado o, si nunca ha elegido ninguno, «Simulación rápida».
2. **Given** un participante que elige «Simulación 2D» para un partido y «Simulación rápida» para el siguiente, **When** se juegan, **Then** cada uno se presenta en el modo elegido.
3. **Given** un partido entre dos humanos, **When** cada uno elige un modo distinto, **Then** cada uno lo ve en su modo y los dos ven el mismo resultado y los mismos eventos.
4. **Given** la creación de una partida, **When** el anfitrión la configura, **Then** no tiene que elegir el tipo de simulación.

---

### User Story 4 - Botones principales visibles y siempre a mano (Priority: P1)

En cada paso del flujo de juego, el botón que hace avanzar («Siguiente», «Empezar partido», «Finalizar partido», «Preparar equipo», «Confirmar alineación») se reconoce al instante, destaca sobre el resto de controles y está siempre visible, sin tener que desplazar la pantalla para encontrarlo.

**Why this priority**: Buscar un botón importante haciendo *scroll* es una molestia que se repite en cada partido y en cada jornada. Arreglarlo es barato y mejora todo el flujo.

**Independent Test**: Se puede probar recorriendo un torneo completo en escritorio y en móvil, y comprobando en cada pantalla que el botón principal está visible sin desplazarse y es el control más destacado.

**Acceptance Scenarios**:

1. **Given** cualquier pantalla del flujo con un botón principal, **When** se abre en un portátil o en un móvil, **Then** el botón se ve sin desplazar la pantalla.
2. **Given** una pantalla con contenido más largo que la ventana (por ejemplo, la plantilla de 24 jugadores), **When** el participante se desplaza, **Then** el botón principal sigue visible en todo momento.
3. **Given** una pantalla con varios botones, **When** el participante la mira, **Then** el botón principal es el más llamativo (tamaño, color y contraste) y los secundarios se distinguen de él.
4. **Given** un botón principal que todavía no se puede usar (por ejemplo, «Confirmar alineación» con una alineación inválida), **When** el participante lo ve, **Then** sigue visible, se muestra desactivado y explica por qué.

---

### User Story 5 - Gestionar el equipo en el descanso sobre el campo (Priority: P2)

Al llegar el descanso de un partido contra un NPC, en 2D o en simulación rápida, aparece un botón que abre una pantalla parecida a la de preparación del partido, con el campo y los jugadores tal como están en ese momento. Desde ahí el participante hace sustituciones arrastrando suplentes al campo, recoloca jugadores, cambia la formación y la táctica, y vuelve al partido. En la 2D, la misma pantalla está disponible en cualquier momento del partido con el botón «Gestionar equipo», que pausa la reproducción. Ya no tiene que hacerlo con selectores que no muestran dónde juega cada uno.

**Why this priority**: El descanso es el momento natural de corregir el partido, y hoy hacerlo con selectores es incómodo. Reutiliza la pantalla de la US2, así que depende de ella.

**Independent Test**: Se puede probar llegando al descanso, abriendo la pantalla, haciendo una sustitución y un cambio de formación, y comprobando que la segunda parte se juega con esos cambios.

**Acceptance Scenarios**:

1. **Given** un partido contra un NPC que llega al descanso, **When** el participante lo ve, **Then** aparecen «Gestionar equipo» y «Seguir» con la misma importancia, «Seguir» a la derecha (FR-006a).
2. **Given** la pantalla de gestión del descanso, **When** se abre, **Then** muestra el campo con los jugadores que están jugando, su colocación actual, el banquillo, las sustituciones que quedan y, en cada ficha, las tarjetas o lesiones del jugador.
3. **Given** esa pantalla, **When** el participante arrastra un suplente sobre un titular, **Then** queda registrada la sustitución y el contador de sustituciones restantes baja en uno.
4. **Given** un participante que ya ha hecho las 5 sustituciones permitidas (001/FR-042), **When** intenta otra, **Then** la pantalla no la permite y explica por qué.
5. **Given** un jugador expulsado, **When** se muestra la pantalla, **Then** no aparece en el campo y no se puede volver a meter.
6. **Given** los cambios hechos, **When** el participante vuelve al partido, **Then** la segunda parte se juega con ellos, igual que si los hubiera hecho con el método anterior.
7. **Given** un partido de eliminatoria empatado al final de los 90 minutos, **When** llega la pausa antes de la prórroga, **Then** también se puede abrir la misma pantalla.
8. **Given** un partido 2D en el minuto 60 con el balón en juego, **When** el participante pulsa «Gestionar equipo», **Then** la 2D se pausa y se abre la misma pantalla; al confirmar una sustitución y volver, la 2D se reanuda donde estaba y la sustitución se aplica en la siguiente interrupción.
9. **Given** un partido entre dos humanos, **When** llega el descanso, **Then** no aparece el botón de gestión y solo se puede seguir, porque el partido se juega con decisiones automáticas (002/FR-030).

---

### User Story 6 - Finalizar el partido y ver el resultado en una pantalla propia (Priority: P2)

Cuando el participante pulsa «Finalizar partido» durante un partido 2D, deja de ver el campo y las chapas, y pasa a una pantalla de resultado parecida a la de la simulación rápida, con el marcador final, los eventos relevantes y las estadísticas del partido.

**Why this priority**: Quien finaliza un partido quiere el resultado, no seguir viendo un campo congelado. Es una mejora pequeña sobre 002/FR-026.

**Independent Test**: Se puede probar finalizando partidos 2D en distintos minutos y comprobando que se llega a la pantalla de resultado y que el resultado coincide con el de ver el partido entero con la misma semilla.

**Acceptance Scenarios**:

1. **Given** un partido 2D en curso, **When** el participante pulsa «Finalizar partido», **Then** pasa a una pantalla sin campo ni chapas con el marcador final, los eventos relevantes con su minuto y las estadísticas del partido.
2. **Given** esa pantalla, **When** el participante la consulta, **Then** tiene el mismo formato y la misma información que el resultado de un partido en simulación rápida.
3. **Given** esa pantalla, **When** el participante quiere seguir, **Then** tiene el botón principal «Siguiente» a la vista.

---

### User Story 7 - Cartas con diseño final y fáciles de leer (Priority: P2)

Las cartas de jugador tienen un diseño cercano al de la versión final, con la referencia visual de las cartas de EA SPORTS FC pero con una identidad propia del juego. Toda la información se lee con comodidad, incluidos los stats y los specials, que hoy son demasiado pequeños.

**Why this priority**: Las cartas son lo más visible del draft (002/US1). El diseño actual funciona, pero los stats y specials cuestan de leer y la carta no transmite todavía el atractivo de una carta coleccionable.

**Independent Test**: Se puede probar mostrando cartas de los cuatro niveles en el draft, en la plantilla y en la vista ampliada de «Formación», y comprobando que una persona lee todos los stats y specials sin ampliar la pantalla.

**Acceptance Scenarios**:

1. **Given** una carta en el draft en un portátil, **When** el participante la mira a una distancia normal, **Then** lee los seis stats y los nombres de todos los specials sin ampliar la pantalla.
2. **Given** un GOAT con 4 specials, **When** se muestra su carta, **Then** todo cabe en la carta y se lee sin desplazarse dentro de ella (002/FR-003).
3. **Given** cartas de los cuatro niveles, **When** se muestran juntas, **Then** cada nivel tiene un acabado propio y los más altos son claramente más llamativos (002/FR-002).
4. **Given** una carta, **When** se compara con las cartas de EA SPORTS FC, **Then** recuerda a una carta coleccionable de fútbol, pero no copia su marco, su logotipo ni su tipografía.

---

### User Story 8 - Abrir sobres con espectáculo (Priority: P2)

Al abrir un sobre, el sobre tiene un aspecto cercano al de la versión final y se abre con efectos visuales y partículas. Las cartas salen una a una, se colocan en la mesa y se giran mostrando su diseño completo, no una minicarta de resumen. El sonido es agradable y discreto.

**Why this priority**: Es el momento más emocionante del draft y se repite tres veces por partida. La versión básica de la 002 (002/US10) cumple su función, pero el sonido molesta y las minicartas no dejan apreciar las cartas.

**Independent Test**: Se puede probar abriendo los tres sobres de un draft, cronometrando la animación, saltándola, silenciándola y comprobando que las cartas aparecen completas, una a una.

**Acceptance Scenarios**:

1. **Given** el inicio de un sobre, **When** se abre, **Then** se ven efectos visuales y partículas, y las cartas salen una a una, se colocan y se giran mostrando la carta completa.
2. **Given** la animación en curso, **When** el participante hace un clic o un toque, **Then** la animación termina y todas las cartas aparecen reveladas y colocadas.
3. **Given** una carta Legendaria o GOAT, **When** se gira, **Then** tiene un efecto de revelación propio, más vistoso (002/FR-009).
4. **Given** el sonido activado, **When** se abre un sobre, **Then** suena un efecto nuevo, suave y breve, que no resulta estridente.
5. **Given** un dispositivo con preferencia de movimiento reducido, **When** se abre un sobre, **Then** las cartas aparecen con una transición simple, sin partículas ni giros.

---

### User Story 9 - NPC más accesibles en los niveles bajos (Priority: P2)

Un participante que juega contra NPC de nivel amateur o intermedio tiene opciones reales de ganar con un equipo razonable. Los niveles avanzado y PRO siguen siendo un reto. Los NPC siguen las mismas reglas que los humanos: son más fáciles porque toman peores decisiones, no porque reciban peores cartas ni stats rebajados.

**Why this priority**: Hoy cuesta ganar incluso al nivel más bajo, lo que frustra a los jugadores nuevos y hace que los niveles no se diferencien en la práctica.

**Independent Test**: Se puede probar con series de torneos simulados en los que un participante de referencia, que juega como un jugador medio, se enfrenta a NPC de cada nivel, y con una prueba con personas contra NPC amateur.

**Acceptance Scenarios**:

1. **Given** un participante medio contra un NPC amateur, **When** se juegan muchos partidos, **Then** el participante gana más partidos de los que pierde, como consecuencia de las peores decisiones del NPC y no de ningún porcentaje fijado (SC-010).
2. **Given** los cuatro niveles de NPC, **When** se enfrentan al mismo participante de referencia, **Then** cuanto más alto es el nivel, menos partidos gana el participante.
3. **Given** un NPC de cualquier nivel, **When** prepara su equipo, **Then** su alineación sigue siendo válida (001/FR-057).
4. **Given** un NPC PRO, **When** se revisan sus drafts y preparaciones, **Then** casi siempre decide bien, pero de vez en cuando toma una decisión dudosa que da opciones al rival.

---

### User Story 10 - Celebrar al campeón, despedir al eliminado y no esperar tras caer (Priority: P3)

Cuando el equipo del participante queda eliminado (pierde una eliminatoria, o no se clasifica para el playoff desde la liga de un torneo mixto), ve una imagen con el mensaje «[Nombre del equipo] ha sido derrotado en [fase]». Si en el torneo ya no queda ningún otro humano en competición, el resto del torneo se simula entero de una vez y el participante pasa directamente al final, sin ir partido a partido. Cuando termina el torneo, todos los participantes ven una imagen de un trofeo con un mensaje de felicitación al campeón, sea quien sea.

**Why this priority**: Da peso emocional a los resultados y evita que el participante eliminado tenga que avanzar a mano por partidos que ya no le afectan, pero no cambia el juego.

**Independent Test**: Se puede probar jugando un torneo de playoff contra NPC hasta ser eliminado en cuartos, comprobando el mensaje, que el resto del torneo se resuelve de una vez y que aparece la pantalla del campeón; y un torneo de liga pura hasta el final.

**Acceptance Scenarios**:

1. **Given** el equipo «Los Halcones» que pierde en semifinales de un playoff, **When** termina el partido, **Then** su participante ve una imagen y el mensaje «Los Halcones ha sido derrotado en Semifinales».
2. **Given** el final de un torneo, **When** se conoce al campeón, **Then** todos los participantes ven la imagen de un trofeo y un mensaje de felicitación con el nombre del campeón, también si el campeón es un NPC o es otro participante.
3. **Given** un participante eliminado, **When** ve el mensaje, **Then** si quedan humanos en competición puede seguir viendo el resto del torneo o volver al menú principal; si no quedan, puede simular el resto del torneo o volver al menú principal.
4. **Given** un torneo mixto, **When** el equipo del participante termina la fase de liga sin clasificarse para el playoff, **Then** ve el mensaje «[Nombre del equipo] ha sido derrotado en Fase de liga».
5. **Given** una liga pura, **When** el equipo del participante pierde un partido o termina la liga sin ser campeón, **Then** no ve ningún mensaje de derrota, y al final ve la pantalla del campeón.
6. **Given** un playoff de 8 en el que el participante es el único humano, **When** su equipo cae en cuartos, **Then** tras el mensaje de derrota y el botón principal «Simular resto del torneo» (con «Volver al menú» como secundario), las semifinales y la final se resuelven de una vez y el participante ve la pantalla del campeón, sin pasar por cada partido.
7. **Given** un torneo con otros humanos todavía en competición, **When** el participante queda eliminado, **Then** el torneo sigue su curso normal para los demás, y el participante eliminado puede consultarlo o salir.
8. **Given** el resto del torneo simulado de una vez, **When** el participante consulta después el cuadro, la clasificación o los máximos goleadores, **Then** ve todos los resultados y estadísticas de esos partidos, igual que si se hubieran jugado uno a uno.

---

### User Story 11 - Nombre y equipación a mi gusto (Priority: P3)

Todos los participantes, incluidos los invitados, ponen nombre a su equipo. Además, pueden diseñar sus equipaciones con camisetas lisas, con rayas, con franjas o con otros diseños, combinando varios colores.

**Why this priority**: Refuerza la identidad del equipo y el apego del participante, pero no cambia el juego.

**Independent Test**: Se puede probar entrando como invitado, poniendo nombre al equipo, diseñando una equipación con rayas de dos colores y comprobando que el nombre y el diseño aparecen en la clasificación, la preparación y el partido.

**Acceptance Scenarios**:

1. **Given** un invitado que empieza una partida, **When** llega al paso de nombrar su equipo, **Then** puede escribir un nombre, y ese nombre aparece en toda la partida.
2. **Given** un participante que no escribe ningún nombre, **When** continúa, **Then** su equipo recibe un nombre por defecto que puede cambiar más tarde.
3. **Given** un usuario registrado con un nombre y unas equipaciones guardados en su cuenta, **When** empieza una partida nueva, **Then** se le proponen; si los cambia para esa partida, los de su cuenta no cambian.
4. **Given** el editor de equipación, **When** el participante elige rayas verticales en blanco y rojo, **Then** la vista previa muestra la camiseta con ese diseño.
5. **Given** una equipación con varios colores, **When** se juega un partido, **Then** el equipo se reconoce por su equipación en el partido y no se confunde con el rival (001/FR-031b).

---

### Edge Cases

- **Arrastrar fuera del campo**: si el participante suelta una ficha fuera del campo y fuera del banquillo, la ficha vuelve a donde estaba y no cambia nada.
- **Dos jugadores en el mismo punto**: si el participante suelta un jugador encima de otro titular, intercambian sus sitios (US2, escenario 4); si lo suelta muy cerca sin estar encima, ocupa la zona más cercana libre para que las fichas no se tapen.
- **Vista ampliada en el borde de la pantalla**: si la ficha está junto a un borde, la carta ampliada se muestra hacia el lado con espacio y siempre entera dentro de la pantalla.
- **Vista ampliada mientras se arrastra**: durante un arrastre no se muestra la carta ampliada, para no tapar el campo.
- **Animación de sobre con poca potencia**: si el dispositivo no puede mantener la animación fluida, las partículas se reducen o desaparecen antes que retrasar la aparición de las cartas.
- **Sonido silenciado**: con los sonidos silenciados (002/FR-010), la apertura no suena.
- **Descanso sin ir a la pantalla de gestión**: si el participante no abre la pantalla de gestión y pulsa seguir, la segunda parte empieza sin cambios.
- **Salir de la pantalla de gestión sin confirmar**: los cambios no confirmados se descartan, y se avisa antes de descartarlos.
- **Finalizar en el descanso o con cambios pendientes**: «Finalizar partido» se comporta como en 002/FR-026; los cambios ya confirmados se aplican y los no confirmados se descartan.
- **Partido entre humanos con modos distintos**: el resultado no depende del modo de visualización (Principio V), así que no hay conflicto.
- **Modo de un partido ya empezado**: el modo no se puede cambiar una vez empezado el partido, salvo para pasar al resultado con «Finalizar partido».
- **Nombre de equipo repetido**: si dos participantes de una misma partida eligen el mismo nombre (sin distinguir mayúsculas), el segundo debe elegir otro. Si el nombre propuesto desde la cuenta ya está en uso, el participante recibe el nombre por defecto y un aviso para que pueda cambiarlo.
- **Nombre de equipo inadecuado**: nombres vacíos, solo con espacios o demasiado largos no se aceptan.
- **Equipaciones parecidas**: si las equipaciones de los dos equipos se parecen demasiado, el visitante usa la segunda (001/FR-031b); si también se parecen, el sistema cambia los colores del visitante en ese partido para que se distingan.
- **Campeón un NPC**: la pantalla del campeón felicita igualmente al NPC por el nombre de su equipo.
- **Participante eliminado que sigue mirando**: después del mensaje de derrota puede seguir consultando la clasificación, el cuadro y los partidos de los demás.
- **Eliminado que sale sin simular el resto**: si el participante, el único humano, sale de la partida tras el mensaje de derrota sin pulsar el botón, al volver desde «Mis partidas» sigue viendo la pantalla de derrota con el mismo botón.
- **Último humano eliminado en un torneo con varios humanos**: si los demás humanos ya estaban eliminados o abandonaron (su plaza la lleva un NPC), se aplica FR-041a igual que en un torneo con un solo humano.
- **Eliminado en la final**: perder la final cuenta como eliminación (fase «Final»). Tras el mensaje de derrota, el botón principal «Ver campeón» lleva a la pantalla del campeón; no hay partidos pendientes que simular.
- **Botón principal en pantallas muy bajas**: si la ventana es tan baja que el botón tapa contenido necesario, el contenido se puede desplazar por detrás del botón, que sigue visible.

## Requirements *(mandatory)*

### Functional Requirements

#### Interfaz «Formación» (US2)

- **FR-001**: La pantalla «Formación» DEBE tener un único campo, en el que el participante elige titulares y ajusta la colocación libre de 002/FR-034. El campo de «colocación» separado DEBE eliminarse.
- **FR-001b**: Los dorsales DEBEN asignarse automáticamente al terminar el draft, antes de «Preparar equipo», según la posición de cada jugador en la alineación automática (los dorsales fijos por casilla de 001/FR-031a para los titulares y del 1 al 24 sin repetir para el resto, 002/FR-035). Confirmar el once NO DEBE reasignarlos; el participante los sigue pudiendo editar (002/FR-036, FR-037).
- **FR-002**: En ese campo, el participante DEBE poder: arrastrar un titular a cualquier zona del campo (002/FR-034); arrastrar un suplente sobre un titular para intercambiarlos; y arrastrar un titular sobre otro para intercambiar sus sitios. Al soltar, la posición efectiva, la penalización y los stats efectivos DEBEN actualizarse al momento (002/SC-016).
- **FR-002a**: Al elegir otra formación, todos los titulares DEBEN pasar a las casillas de la nueva formación. Si había jugadores recolocados a mano, el sistema DEBE avisar antes de que se perderá la colocación personalizada y permitir cancelar el cambio. Si no hay recolocaciones, el cambio se aplica sin aviso. Lo mismo vale en la pantalla de gestión del descanso (FR-028).
- **FR-003**: La colocación DEBE seguir validándose como en 002/FR-034a: 11 titulares y un único portero en la zona de portería, también en el servidor.
- **FR-003b**: El botón principal de «Formación» DEBE ser «Confirmar alineación». Al pulsarlo con una alineación válida, DEBE guardarse y llevar a la pantalla del torneo, donde está la preparación del partido (modo y «Comenzar partido» o «Ver partido»). «Formación» NO DEBE ofrecer empezar el partido.
- **FR-004**: Al pasar el cursor sobre la ficha de un jugador, en el campo o en el banquillo, DEBE mostrarse su carta completa (el mismo diseño de FR-008) en menos de medio segundo, sin tapar la ficha señalada y dentro de la pantalla. Al retirar el cursor, la carta DEBE ocultarse. En dispositivos táctiles, DEBE mostrarse al mantener pulsada la ficha. No DEBE mostrarse durante un arrastre.
- **FR-005**: La vista ampliada de FR-004 DEBE estar disponible también en la pantalla de gestión del descanso (FR-028).

#### Botones principales (US4)

- **FR-006**: Cada pantalla del flujo de juego DEBE tener como máximo un botón principal, que es el que hace avanzar en el flujo. El botón principal PUEDE cambiar según el estado de la pantalla (por ejemplo, en la 2D contra un NPC es «Finalizar partido» con el balón en juego y «Gestionar equipo» en el descanso), pero en cada momento hay como máximo uno, salvo la excepción de FR-006a. Como mínimo, son botones principales: «Siguiente», «Empezar partido», «Finalizar partido», «Preparar equipo», «Confirmar alineación», el botón de gestión del descanso (FR-027), los de las pantallas de derrota y de campeón (FR-041) y «Guardar» en «Mi perfil».
- **FR-006a**: En el descanso y en la pausa antes de la prórroga de un partido contra un NPC, «Gestionar equipo» y «Seguir» DEBEN tener la misma importancia (el mismo estilo de botón principal), con «Seguir» a la derecha. Es la única pantalla con dos botones principales.
- **FR-007**: El botón principal DEBE:
  - verse sin desplazar la pantalla en cualquier tamaño de ventana a partir de 360 × 640 píxeles, y seguir visible mientras el participante se desplaza por el contenido;
  - ser el control más destacado de la pantalla por tamaño, color y contraste, con un estilo común a todas las pantallas para que se reconozca al instante;
  - mostrarse desactivado, con el motivo, cuando todavía no se puede usar, en lugar de ocultarse.

#### Diseño de las cartas (US7)

- **FR-008**: El diseño de las cartas DEBE acercarse al de la versión final y mantener la disposición de 002/FR-001 (imagen, nombre y media arriba; posiciones bajo el nombre; stats y specials abajo), así como los acabados por nivel de 002/FR-002. PUEDE inspirarse en las cartas de EA SPORTS FC, pero NO DEBE reproducir su marco, su logotipo, su tipografía ni otros elementos de marca.
- **FR-009**: En la carta completa, los valores y abreviaturas de los stats y los nombres de los specials DEBEN leerse sin ampliar la pantalla. Para ello, en un portátil, el texto de los stats y de los specials DEBE ser como mínimo tan grande como el texto normal de la interfaz, y el valor de los stats DEBE destacar sobre su abreviatura.
- **FR-010**: Se mantienen 002/FR-003 (todo cabe sin desplazamiento interno, también un GOAT con 4 specials), 002/FR-004 (descripción de cada special al señalarlo o tocarlo) y 002/FR-005 (mismo diseño en draft, plantilla y ficha, con versión compacta en listas largas).

#### Apertura de los sobres (US8)

- **FR-011**: El sobre DEBE tener un diseño cercano al de la versión final y abrirse con efectos visuales y partículas.
- **FR-012**: Tras abrirse el sobre, las cartas DEBEN aparecer una a una, colocarse en la mesa y girarse mostrando la carta completa (FR-008), no una versión de resumen. Al terminar la animación, las cartas DEBEN quedar listas para elegir.
- **FR-013**: La animación completa DEBE durar como máximo 8 segundos y DEBE poder saltarse con un solo clic o toque, que muestra todas las cartas reveladas y colocadas. Este límite sustituye al de 6 segundos de 002/FR-007, y el margen del primer turno de cada sobre (002/FR-008) DEBE ajustarse al nuevo límite.
- **FR-014**: El sonido de apertura DEBE sustituirse por uno suave y breve, sin tonos agudos ni estridentes, con un volumen inferior al de los demás sonidos del juego. Se mantienen el silencio de 002/FR-010 y el efecto propio de las cartas Legendarias y GOAT de 002/FR-009.
- **FR-015**: Con preferencia de movimiento reducido, la animación DEBE sustituirse por una transición simple, sin partículas ni giros (002/FR-010).

#### Simulación 2D y motor (US1)

Los requisitos de este bloque afectan al motor compartido y, por tanto, a las dos modalidades (Principio V). La rápida y la 2D DEBEN seguir dando exactamente el mismo partido con las mismas condiciones (001/SC-008).

- **FR-016**: Juego combinado: el motor DEBE favorecer las conducciones cuando el jugador con balón tiene espacio por delante y los pases cortos y medios entre compañeros cercanos. Los pases largos DEBEN reservarse para situaciones con sentido táctico: cambio de orientación hacia un compañero libre, balón a la espalda de una defensa adelantada, salida bajo presión sin opciones cortas, despeje o contraataque con espacio.
- **FR-017**: Pases hacia atrás irracionales: un jugador en el último tercio del campo rival NO DEBE hacer un pase largo hacia su propio campo salvo que no tenga ninguna otra opción razonable (conducir, combinar en corto, centrar, tirar o proteger el balón). Los pases hacia atrás cortos para mantener la posesión siguen permitidos.
- **FR-018**: Tiros lejanos: la probabilidad de tirar y de marcar DEBE bajar con la distancia a la portería de forma marcada. Desde el centro del campo o más atrás, el tiro DEBE ser excepcional (por ejemplo, con el portero muy adelantado), y la mayoría de los goles DEBEN marcarse dentro del área o en sus inmediaciones (SC-002).
- **FR-019**: Media de goles: el motor DEBE ajustarse para que la media de goles por partido de un torneo, o de una serie de partidos, entre equipos equilibrados se sitúe alrededor de tres (SC-001). Es una media, no un objetivo por partido: el motor NO DEBE limitar ni corregir los goles de un partido concreto para acercarlo a la media, y los resultados individuales DEBEN variar de forma natural (0-0, 2-1, 5-2…). Este objetivo sustituye al rango de 001/SC-007.
- **FR-020**: Variedad de goles: el motor DEBE generar, con una frecuencia apreciable y sin elevar la media de FR-019, goles de falta directa, remates de cabeza tras centro y penaltis, y, con poca frecuencia, goles en propia puerta en despejes de centros y en tiros desviados por un defensor (SC-003). La probabilidad de marcar en propia puerta al despejar DEBE bajar con el stat de defensa del defensor. Un gol en propia puerta suma al rival y no cuenta como gol ni como asistencia de ningún jugador. Para ello DEBEN darse, con una frecuencia creíble, las situaciones que los originan: faltas cerca del área, centros con rematadores en el área y faltas dentro del área.
- **FR-021**: Peso de los stats en el comportamiento: los stats de cada jugador DEBEN influir no solo en el éxito de sus acciones (001/FR-033), sino también en qué acciones elige:
  - Más regate → más intentos de regate y de conducción, también ante un defensor.
  - Más tiro → más disposición a tirar desde fuera del área cuando tiene espacio y ángulo.
  - Más pase → más pases y más pases que rompen líneas.
  - Más defensa → más intercepciones, entradas ganadas y recuperaciones.
  - Más físico y velocidad → más duelos ganados y más conducciones largas en espacios abiertos.

  La influencia DEBE ser gradual y estar acotada por la situación del juego: un buen regateador no regatea siempre, y un buen tirador no tira desde cualquier sitio (SC-006).
- **FR-022**: Peso de los specials: cada special que afecte a una acción del partido DEBE notarse en el comportamiento o en el resultado de esa acción de forma reconocible (por ejemplo, Lanzador de faltas aumenta claramente los goles de falta directa de su equipo), sin anular el efecto de los stats ni de la táctica. El efecto de cada special DEBE poder medirse en series de partidos (SC-007).
- **FR-023**: Las mejoras de FR-016 a FR-022 NO DEBEN empeorar los criterios de la 002 sobre la 2D (002/SC-005 a SC-008 y SC-007a), salvo los que esta spec cambia expresamente.

#### Finalización anticipada (US6)

- **FR-024**: Al pulsar «Finalizar partido» en la 2D, el participante DEBE pasar a una pantalla de resultado sin campo ni chapas, con el mismo formato que el resultado de la simulación rápida: marcador final (con prórroga y penaltis si los hubo), eventos relevantes con su minuto y estadísticas del partido (001/FR-047 y 002/FR-024).
- **FR-025**: El cálculo del resto del partido, su tiempo máximo, el indicador de progreso y la coincidencia con ver el partido entero siguen las reglas de 002/FR-026 y FR-027.
- **FR-026**: La pantalla de resultado DEBE tener «Siguiente» como botón principal (FR-006).

#### Gestión del equipo en el descanso (US5)

- **FR-027**: Al llegar el descanso, y en la pausa antes de la prórroga, en los partidos contra un NPC, la pantalla del partido DEBE mostrar un botón para gestionar el equipo y otro para seguir, los dos como botones principales (FR-006a), en las dos modalidades. En los partidos entre humanos, que se resuelven con decisiones automáticas (002/FR-030), el botón NO DEBE mostrarse y la pausa solo ofrece seguir.
- **FR-028**: Ese botón DEBE abrir una pantalla con el mismo campo y los mismos gestos de la pantalla «Formación» (FR-001 y FR-002), que muestre el estado del equipo en ese momento: los jugadores que están en el campo y su colocación, el banquillo, las sustituciones que quedan (001/FR-042) y las tarjetas y lesiones de cada jugador. Desde ella el participante DEBE poder hacer sustituciones, recolocar jugadores y cambiar la formación, la táctica y los lanzadores (001/FR-045).
- **FR-029**: Esa pantalla DEBE impedir los cambios no permitidos: superar el número de sustituciones, meter a un jugador ya sustituido o expulsado, o dejar una alineación inválida. Los cambios DEBEN validarse también en el servidor.
- **FR-030**: Los cambios confirmados DEBEN aplicarse al resto del partido igual que los cambios del descanso de 001/FR-045, y DEBEN producir exactamente el mismo partido que los mismos cambios hechos con los selectores actuales.
- **FR-031**: Durante todo el partido 2D contra un NPC, salvo en la tanda de penaltis, la pantalla del partido DEBE ofrecer un botón «Gestionar equipo» que abre la misma pantalla de FR-028. Al abrirla, la reproducción 2D DEBE pausarse, y al volver DEBE reanudarse en el mismo punto. Los cambios confirmados con el balón en juego DEBEN aplicarse en la siguiente interrupción, con el límite de 1 minuto de juego de 002/FR-025a (001/FR-050). Los selectores actuales para pedir cambios DEBEN eliminarse. La pausa solo afecta a la presentación para ese participante, no al cálculo del partido (Principio V).

#### Modo de simulación por partido (US3)

- **FR-032**: El participante DEBE elegir el modo de simulación («Simulación rápida» o «Simulación 2D») en la tarjeta de preparación de cada partido, en la pantalla del torneo; el selector NO DEBE aparecer en «Formación». El selector DEBE aparecer preseleccionado con el último modo que usó ese participante en la partida; en una partida nueva, con el último que usó el usuario registrado en cualquier partida (se guarda en su cuenta); y, si no hay ninguno (primera vez o invitado), con «Simulación rápida».
- **FR-033**: La elección DEBE afectar solo a la presentación de ese partido y solo para ese participante. En un partido entre humanos, cada uno PUEDE ver el partido en un modo distinto, con el mismo resultado y los mismos eventos (Principio V).
- **FR-034**: El tipo de simulación DEBE dejar de elegirse al crear la partida, y la opción DEBE eliminarse de la configuración de la partida.
- **FR-035**: Una vez empezado un partido, su modo NO DEBE poder cambiarse, salvo para ir al resultado con «Finalizar partido».

#### Dificultad de los NPC (US9)

- **FR-036**: La dificultad de los NPC DEBE reducirse haciendo que tomen peores decisiones que ahora en el draft y en la preparación del equipo (alineación, colocación, formación, táctica y lanzadores), y también en los cambios durante el partido. La reducción DEBE ser mayor en los niveles amateur e intermedio.
- **FR-037**: La dificultad DEBE ajustarse solo mediante la calidad de esas decisiones (001/FR-058). Ningún porcentaje de victoria, de gol o de parada DEBE fijarse ni corregirse por nivel de NPC: la probabilidad de marcar, de evitar goles y de ganar DEBE salir siempre del motor, que combina stats, specials, medias, posiciones, colocación y decisiones tácticas de los dos equipos (Principio I). Los NPC NO DEBEN recibir cartas peores, stats rebajados, ventajas ni reglas distintas de las de los humanos (Principios I y VI), y el motor NO DEBE tratar de forma distinta a un equipo por ser NPC o humano.
- **FR-037a**: Errores por nivel: cada nivel DEBE cometer errores de decisión creíbles, que un jugador reconocería como errores propios de alguien que juega peor, no como decisiones absurdas. Por ejemplo: elegir en el draft una carta de más media que no encaja en la plantilla, dejar en el banquillo a un jugador mejor, colocar a un jugador fuera de su posición, o elegir una táctica poco adecuada al rival. La frecuencia y la gravedad de los errores DEBEN bajar con el nivel.
- **FR-037b**: El nivel PRO DEBE apenas cometer errores, pero NO DEBE tomar siempre la mejor opción: también DEBE tomar de vez en cuando decisiones dudosas, para que un humano tenga opciones reales de ganarle. Esto sustituye a 001/FR-060.
- **FR-038**: Los niveles DEBEN seguir siendo ordenados: contra el mismo participante, cada nivel DEBE ganar más partidos que el inferior (001/SC-010). Este orden es una consecuencia medida de la calidad de las decisiones, no un resultado impuesto.
- **FR-038a**: Al crear la partida, el anfitrión DEBE elegir un nivel de dificultad: «Fácil», «Normal» (preseleccionado y valor por defecto si no se indica) o «Difícil». La dificultad solo decide los niveles de los NPC que rellenan plazas automáticamente (al crear una partida de invitado o al empezar el draft): «Fácil», amateur e intermedio a partes iguales; «Normal», amateur, intermedio o avanzado al azar (001/FR-059); «Difícil», intermedio y avanzado a partes iguales. «A partes iguales» significa que el número de NPC de cada nivel difiere como mucho en uno y que el nivel sobrante y el orden se sortean con la semilla de la partida. El relleno NUNCA DEBE usar el nivel PRO, y los NPC añadidos a mano por el anfitrión conservan el nivel elegido, incluido PRO. La dificultad se muestra en la sala y no se puede cambiar una vez creada la partida. Las partidas creadas antes de este requisito tienen dificultad «Normal».

#### Feedback de derrota y de campeón (US10)

- **FR-039**: Cuando el equipo de un participante queda eliminado del torneo, ese participante DEBE ver una imagen y el mensaje «[Nombre del equipo] ha sido derrotado en [fase]», donde [fase] es el nombre de la fase en la que ha caído (por ejemplo, «Fase de liga», «Octavos de final», «Cuartos de final», «Semifinales», «Final»). Cuentan como eliminación solo dos casos: perder una eliminatoria (partido de playoff, en un playoff o en la fase final de un mixto) y terminar la fase de liga de un torneo mixto sin clasificarse para el playoff. En una liga pura NO DEBE mostrarse mensaje de derrota.
- **FR-040**: Al terminar el torneo, todos los participantes DEBEN ver una imagen de un trofeo y un mensaje de felicitación con el nombre del equipo campeón, sea un humano o un NPC.
- **FR-041**: Las pantallas de derrota y de campeón DEBEN ofrecer un botón principal para seguir: en la derrota, ver el resto del torneo (o simularlo, FR-041a) o, si el torneo ya ha terminado porque se perdió la final, ver al campeón; en la del campeón, volver al menú principal. La pantalla de derrota DEBE ofrecer además «Volver al menú» como botón secundario mientras el torneo no haya terminado. Si el participante no está mirando en ese momento, DEBE verlas la próxima vez que abra la partida.
- **FR-041a**: Cuando un participante queda eliminado (FR-039) y, tras su eliminación, no queda ningún humano en competición en el torneo, la pantalla de derrota DEBE ofrecer como botón principal simular el resto del torneo. Al pulsarlo, el sistema DEBE resolver de una vez todos los partidos pendientes, con el mismo motor y las mismas reglas que si se jugaran uno a uno (Principio V), y llevar al participante a la pantalla del campeón (FR-040) sin pasar por cada partido ni cada jornada.
- **FR-041b**: Los partidos simulados de una vez DEBEN quedar registrados como cualquier otro: resultados, eventos, clasificación, cuadro y máximos goleadores y asistentes (002/FR-039 a FR-042), consultables después. Si quedan otros humanos en competición, el torneo DEBE seguir su curso normal (002/FR-030) y FR-041a no se aplica.

#### Nombre del equipo y equipaciones (US11)

- **FR-042**: Todos los participantes, incluidos los invitados, DEBEN poder poner nombre a su equipo al empezar la partida, y cambiarlo hasta que se abra el primer partido del torneo. Si no escriben ninguno, el sistema DEBE asignarles un nombre por defecto. Los NPC DEBEN tener un nombre de equipo generado.
- **FR-042b**: Los usuarios registrados DEBEN poder guardar en su cuenta un nombre de equipo y unas equipaciones (primera y segunda) por defecto. Al empezar cada partida, el sistema DEBE proponerlos, y el participante DEBE poder cambiarlos solo para esa partida sin alterar los de su cuenta. Los invitados los eligen en cada partida, partiendo de un nombre y unas equipaciones por defecto. Si el nombre de la cuenta ya lo usa otro equipo de la partida, se aplica FR-043.
- **FR-043**: El nombre del equipo DEBE tener entre 3 y 24 caracteres, sin contar los espacios del principio y del final, y DEBE ser distinto del de los demás equipos de la misma partida, incluidos los NPC, sin distinguir mayúsculas. El nombre DEBE validarse también en el servidor.
- **FR-044**: El nombre del equipo DEBE mostrarse en todas las pantallas en las que aparece el equipo: draft, clasificación, calendario, cuadro, preparación, partido, resultados, máximos goleadores y asistentes y mensajes de derrota y de campeón.
- **FR-045**: Cada equipación (primera y segunda, 001/FR-031b) DEBE poder tener un diseño de camiseta a elegir entre, como mínimo: lisa, rayas verticales, franjas horizontales, banda diagonal y mitades. Cada diseño DEBE poder combinar hasta 3 colores, y el editor DEBE mostrar una vista previa.
- **FR-046**: El diseño de la equipación DEBE verse en las vistas previas, en la preparación del partido y en la presentación del partido. En la 2D, las chapas DEBEN mostrar al menos el color principal y permitir distinguir los dos equipos (001/FR-048).
- **FR-047**: La regla de equipaciones parecidas de 001/FR-031b DEBE tener en cuenta todos los colores del diseño. Si las dos equipaciones del visitante se parecen a la del local, el sistema DEBE ajustar los colores del visitante en ese partido para que se distingan.

### Requisitos de specs anteriores afectados

- **001/FR-001** y **001/US3**: el anfitrión ya no elige el tipo de simulación al crear la partida (FR-034); se elige en cada partido (FR-032).
- **001/FR-031b**: las equipaciones pasan de dos colores a un diseño con hasta 3 colores (FR-045 a FR-047).
- **001/SC-007**: la media de goles se estrecha alrededor de tres, como media de torneo o de serie (SC-001).
- **001/FR-060** y **001/US4, escenario 4**: el NPC PRO deja de elegir siempre la mejor opción; apenas comete errores, pero toma alguna decisión dudosa (FR-037b).
- **001/FR-045**: los cambios del descanso se hacen desde la pantalla con campo de FR-028.
- **001/FR-050** y **002/FR-025a**: en la 2D, los cambios con el balón en juego se piden desde la pantalla con campo, que pausa la reproducción (FR-031); los selectores desaparecen.
- **002/FR-007** y **002/FR-008**: la duración máxima de la apertura de sobre pasa de 6 a 8 segundos (FR-013), y 002/SC-017 se actualiza en consecuencia.
- **002/FR-026**: al finalizar un partido 2D, se pasa a una pantalla de resultado sin campo (FR-024).
- **002/FR-034** y **002/US7**: la colocación libre se hace en el campo de la alineación, no en un campo aparte (FR-001).
- **001/FR-001** y **001/FR-059**: al crear la partida se elige una dificultad que decide los niveles del relleno automático de NPC (FR-038a); con «Normal» el relleno es el de 001/FR-059.
- **001/FR-031a** y **002/FR-035**: los dorsales iniciales se asignan al terminar el draft, según la alineación automática, y no al definir el primer once (FR-001b).

### Key Entities *(include if feature involves data)*

- **Participante**: añade el **nombre del equipo** (obligatorio para todos, también invitados y NPC) y el **último modo de simulación usado**. Su nombre y sus equipaciones son los de esa partida.
- **Cuenta de usuario**: añade un **nombre de equipo** y unas **equipaciones por defecto**, que se proponen en cada partida nueva (FR-042b), y el **último modo de simulación usado** en cualquier partida (FR-032).
- **Equipación**: pasa de un color principal y uno secundario a un **diseño** (lisa, rayas verticales, franjas horizontales, banda diagonal, mitades…) con **hasta 3 colores**. Cada participante sigue teniendo primera y segunda equipación.
- **Partido**: el **modo de visualización** pasa a ser una elección de cada participante para ese partido, y no una propiedad del torneo. No forma parte del cálculo del resultado.
- **Gol** (evento del partido): registra el **tipo de gol** (jugada, cabeza tras centro, falta directa, penalti, propia puerta…) y la **distancia del remate**, para mostrar y medir la variedad de goles.
- **Eliminación**: hecho del torneo que asocia un equipo con la fase en la que cayó (eliminatoria perdida o no clasificación desde la fase de liga de un mixto); alimenta el mensaje de derrota y la simulación del resto del torneo.
- **Nivel de NPC**: conserva los cuatro niveles; cambian los parámetros de calidad de decisión de cada uno.

## Success Criteria *(mandatory)*

### Measurable Outcomes

Salvo que se diga otra cosa, las series de partidos se juegan entre equipos equilibrados (media de equipo con una diferencia de ±2 como máximo), con la táctica por defecto, y se miden con la herramienta de equilibrado del proyecto, igual que en la 002.

- **SC-001**: La media de goles por partido de las series de 1.000 partidos, y la de la serie de torneos completos con plantillas Core, está entre 2,6 y 3,4; además, al menos el 90 % de los torneos individuales de esa serie tiene su media en ese rango. No hay límite por partido: en las series aparecen tanto 0-0 como partidos de 6 o más goles, y ningún resultado concreto, contado con orden local-visitante (por ejemplo, 1-2, distinto de 2-1), supera el 20 % de los partidos.
- **SC-002**: En series de 1.000 partidos, alrededor del 25 % de los goles se marcan desde fuera del área (entre el 22 % y el 28 %), y el resto desde dentro; la mayoría de los de fuera del área se marcan desde las inmediaciones del área (a 25 metros o menos de la portería), y como máximo el 0,5 % desde el propio campo del que tira.
- **SC-003**: En series de 1.000 partidos, de todos los goles: entre el 6 % y el 12 % son de penalti (sin contar las tandas), entre el 10 % y el 18 % son de cabeza, entre el 5 % y el 10 % son de falta directa y entre el 1 % y el 3 % son en propia puerta.
- **SC-004**: En series de 1.000 partidos, los pases largos (más de 35 metros) son como máximo el 15 % de los pases, y cada equipo hace de media como máximo 0,5 pases largos por partido desde el último tercio del campo rival hacia su propio campo.
- **SC-005**: En series de 1.000 partidos, el número medio de conducciones por equipo y partido es al menos un 30 % mayor que en la versión actual, y al menos el 60 % de los pases son de menos de 20 metros.
- **SC-006**: En series de 1.000 partidos, comparando un mismo equipo con y sin una mejora de 15 puntos en un stat de un titular:
  - con 15 puntos más de regate, ese jugador intenta al menos un 25 % más de regates y conducciones;
  - con 15 puntos más de tiro, ese jugador intenta al menos un 25 % más de tiros desde fuera del área;
  - con 15 puntos más de defensa, ese defensa consigue al menos un 20 % más de intercepciones, entradas ganadas y recuperaciones;
  - con 15 puntos más de pase, ese jugador hace al menos un 15 % más de pases que rompen líneas;
  - con 15 puntos más de físico y de velocidad, ese jugador gana al menos un 15 % más de duelos y hace al menos un 15 % más de conducciones largas;

  y en ningún caso el jugador mejorado concentra más del 60 % de esa acción de su equipo (no se vuelve predecible).
- **SC-007**: En series de 1.000 partidos, cada special con efecto en el partido produce una diferencia medible en su acción respecto al mismo equipo sin él. Por ejemplo, un equipo con Lanzador de faltas marca al menos un 30 % más de goles de falta directa.
- **SC-008**: En una prueba con al menos 5 personas, cada una ve 2 minutos de la 2D de la versión actual y 2 minutos de la nueva, y puntúa de 1 a 5 si "parece un partido de fútbol". La nota media de la nueva es al menos 3,5 y al menos 1 punto superior a la de la versión actual.
- **SC-009**: Los criterios de equivalencia y de ventaja de la estrategia de la 001 y la 002 siguen cumpliéndose con el motor nuevo: la simulación rápida y la 2D dan el mismo partido en el 100 % de las comparaciones con la misma semilla (001/SC-008), y el equipo con 5 puntos más de media gana al menos el 60 % de los partidos (001/SC-004).
- **SC-010**: En series de torneos simulados de un participante de referencia contra NPC de cada nivel, se mide el porcentaje de partidos que gana el participante. Estos porcentajes son una comprobación, no un objetivo que el motor imponga (FR-037):
  - contra amateur e intermedio, el participante gana más partidos de los que pierde, y su porcentaje de victorias es al menos 15 puntos porcentuales mayor que en la versión actual;
  - el porcentaje de victorias del participante baja de forma ordenada de amateur a PRO (FR-038);
  - contra PRO, el participante gana algunos partidos (no menos del 10 %).

  El participante de referencia hace un draft y una alineación razonables, como un jugador medio: elige la mejor carta disponible que encaja en su plantilla, usa una formación estándar y la táctica por defecto, y no hace cambios durante el partido.
- **SC-010a**: En series de 1.000 partidos con las mismas alineaciones, tácticas y semillas, el resultado es idéntico en el 100 % de los casos tanto si cada equipo lo controla un humano como si lo controla un NPC de cualquier nivel: la dificultad solo cambia las decisiones, nunca el cálculo del partido.
- **SC-010b**: En la revisión de 20 drafts y preparaciones de equipo de cada nivel, los errores de decisión bajan de amateur a PRO; los del PRO son escasos pero existen (al menos una decisión dudosa en la mayoría de sus drafts), y en ningún nivel aparece una decisión absurda (por ejemplo, un portero de delantero centro teniendo delanteros en el banquillo).
- **SC-011**: En una prueba con al menos 5 personas que juegan su primer torneo contra NPC amateur, al menos el 80 % gana al menos un partido y al menos el 50 % gana más partidos de los que pierde.
- **SC-012**: En una prueba con al menos 5 personas, al menos el 80 % lee correctamente en voz alta, sin ampliar la pantalla, los seis stats y los nombres de los specials de una carta GOAT con 4 specials en un portátil, en menos de 10 segundos.
- **SC-013**: En el 100 % de las pantallas del flujo de juego, el botón principal se ve sin desplazar la pantalla, en un portátil de 1366 × 768 y en un móvil de 360 × 640, y sigue visible al desplazarse por el contenido. En una prueba con al menos 5 personas, al menos el 90 % encuentra el botón para avanzar en menos de 2 segundos en cada pantalla.
- **SC-014**: En una prueba con al menos 5 personas, al menos el 80 % coloca a un jugador en una zona concreta del campo y cambia un titular por un suplente en la pantalla «Formación» sin ayuda y en menos de 30 segundos cada cosa.
- **SC-015**: Al pasar el cursor sobre una ficha, la carta completa aparece en menos de 0,5 segundos en el 95 % de los casos, y en el 100 % de los casos se muestra entera dentro de la pantalla.
- **SC-016**: En una prueba con al menos 5 personas, al menos el 80 % hace en el descanso una sustitución y un cambio de formación desde la nueva pantalla sin ayuda, y prefiere la nueva pantalla a los selectores actuales.
- **SC-017**: En el 100 % de las finalizaciones anticipadas de un partido 2D, el participante llega a la pantalla de resultado, y el resultado y los eventos coinciden con los de ver el partido entero con la misma semilla (002/SC-010).
- **SC-018**: En un torneo de prueba, el modo elegido para cada partido se respeta en el 100 % de los partidos, y en el 100 % de los partidos entre humanos con modos distintos los dos ven el mismo resultado.
- **SC-019**: La apertura de cada sobre dura 8 segundos o menos, se puede saltar con un clic, muestra las 8 cartas completas y no reduce el tiempo de elección. En una prueba con al menos 5 personas, al menos el 80 % puntúa el nuevo sonido como agradable (4 o 5 sobre 5) y ninguna lo describe como molesto.
- **SC-020**: En el 100 % de las eliminaciones del equipo de un participante y de los finales de torneo comprobados, aparece la pantalla correspondiente con el nombre de equipo y la fase correctos, y en ninguna liga pura aparece un mensaje de derrota.
- **SC-020a**: En un playoff de 16 contra NPC en el que el participante cae en octavos, desde que pulsa el botón de simular el resto del torneo hasta que ve la pantalla del campeón pasan menos de 5 segundos, con un solo clic, y el 100 % de los partidos pendientes aparecen después con su resultado en el cuadro y en las tablas de goleadores y asistentes.
- **SC-021**: El 100 % de los participantes, incluidos los invitados y los NPC, tienen un nombre de equipo que aparece en todas las pantallas de FR-044, y en ninguna partida hay dos equipos con el mismo nombre.
- **SC-022**: En el 100 % de las combinaciones de diseño y colores de equipación probadas, la vista previa coincide con lo que se ve en la preparación y en el partido, y los dos equipos de un partido se distinguen.
- **SC-023**: En series de partidos con 3-4-3, 4-2-3-1 y 4-3-3, los extremos y mediapuntas (ED, EI y MCO) marcan entre el 25 % y el 50 % de los goles de su equipo. Llegan al área según la jugada (con el balón en el último tercio o cuando un compañero progresa conduciendo o regateando) y un regate ganado en campo rival puede llevarlos hacia dentro (hallazgo H11 de la validación).

## Assumptions

- **Vista ampliada en táctil**: como no hay cursor, la carta ampliada se muestra al mantener pulsada la ficha; tocar y arrastrar sigue moviendo al jugador.
- **Fases del torneo**: el nombre de la fase del mensaje de derrota es el que ya usa el torneo para su calendario y su cuadro.
- **Diseño visual**: la definición estética concreta de las cartas, el sobre, las imágenes de derrota y de campeón y el nuevo sonido se resuelve en la fase de diseño. Pueden usarse recursos propios o con licencia libre; nunca recursos de EA SPORTS FC ni de otras marcas.
- **Duración de la apertura**: mostrar las 8 cartas completas una a una exige algo más de tiempo que la versión básica de la 002, así que el límite sube de 6 a 8 segundos. Se mantiene el salto con un clic.
- **Modo por defecto**: la primera vez que un participante juega un partido, el modo preseleccionado es «Simulación rápida», que es el más ágil para avanzar en el torneo. Después se recuerda el último que eligió, en la partida y, para los registrados, en su cuenta.
- **Partidas ya creadas**: las partidas creadas antes de esta spec usan como primera preselección el tipo de simulación que eligió el anfitrión. Sus equipaciones de dos colores se convierten en equipaciones lisas con esos colores, y los equipos sin nombre reciben uno por defecto.
- **Participante de referencia (SC-010)**: es un comportamiento automático que imita a un jugador medio y se usa solo para medir la dificultad; no es un nivel de NPC del juego.
- **Errores de los NPC**: la frecuencia y el tipo concreto de errores de cada nivel se fijan en el documento de equilibrado durante la planificación, y se validan con SC-010, SC-010b y SC-011.
- **Goles lejanos**: con alrededor del 25 % de goles fuera del área (SC-002), la mayoría de ellos se concentra en la frontal (a 25 metros o menos); los goles de falta directa cuentan dentro de esos porcentajes de zona según desde dónde se lancen.
- **Medidas de distancia y tipo de gol**: el motor ya trabaja con posiciones en el campo (002/FR-023), así que la distancia de cada remate y el tipo de cada gol se pueden registrar y medir.
- **Fuera de alcance**: nuevos modos de juego, nuevas colecciones de cartas, escudos de equipo personalizados, diseño de pantalón y medias, y rediseño de pantallas que no se mencionan en esta spec.
