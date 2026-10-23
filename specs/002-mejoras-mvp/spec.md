# Feature Specification: Mejoras del MVP — cartas, ritmo de juego, navegación, simulación 2D y reglas

**Feature Branch**: `002-mejoras-mvp`

**Created**: 2026-10-16

**Status**: Draft

**Input**: User description: "Spec 2 - Mejoras en el MVP: diseño de las cartas; efecto de apertura de sobre; botón «Siguiente»; navbar; simulación 2D (homogeneidad, realismo, velocidades, finalización anticipada y evaluación de la viabilidad del modelo síncrono); posiciones menos estrictas y posicionamiento libre; dorsales; tablas de máximos goleadores y asistentes."

**Relación con la spec 001**: esta especificación modifica y amplía [specs/001-draft-manager-mvp/spec.md](../001-draft-manager-mvp/spec.md). Las referencias del tipo "001/FR-027" apuntan a requisitos de esa spec. Cuando un requisito de esta spec contradice uno de la 001, prevalece el de esta spec, y la 001 se actualiza para reflejarlo (ver "Requisitos de la spec 001 afectados").

## Clarifications

### Session 2026-10-16

- Q: ¿Los partidos de torneo entre humanos siguen siendo síncronos, o el draft pasa a ser la única interacción síncrona? → A: Solo el draft es síncrono. Los torneos se juegan siempre de forma asíncrona: los partidos entre humanos se resuelven con las alineaciones guardadas y decisiones automáticas, iguales para los dos equipos, y cada participante los ve cuando quiere.
- Q: ¿Qué alcance tiene la colocación libre en la pantalla de tácticas? → A: Libertad total. Cualquier jugador de campo puede ir a cualquier zona. La formación elegida es solo el punto de partida, y la ofensividad y el comportamiento se deducen de la colocación real.
- Q: ¿La animación de apertura de sobre entra en esta fase? → A: Sí, una versión básica: efectos 2D, sonido, se puede saltar y dura como máximo 6 s. La versión elaborada queda para la fase de diseño visual.
- Q: ¿Qué velocidades y duraciones tiene la simulación 2D? → A: Tres velocidades, x2, x4 y x8. El partido completo dura 4, 2 y 1 minuto respectivamente, y cada parte, la mitad. El comportamiento de los jugadores debe parecer un partido de fútbol de verdad, con pases, centros y conducciones, natural y nunca errático ni artificial.

### Session 2026-10-16 (revisión de la checklist de la simulación 2D)

- Q: ¿Los 4, 2 y 1 minutos incluyen el descuento? → A: Sí. El descuento de cada parte reglamentaria se acota a 1–3 minutos para que la duración quede dentro de ±5 %.
- Q: ¿Cómo se ven la prórroga y la tanda de penaltis? → A: La prórroga usa la misma proporción que el resto del partido. La tanda tiene un ritmo propio: unos 3 s reales por lanzamiento a x2, 1,5 s a x4 y 0,75 s a x8.
- Q: ¿Cómo es la pausa por gol? → A: 2 s reales fijos a cualquier velocidad. Las pausas anunciadas son el gol, el descanso y antes de la prórroga, más «Cargando…» si faltan datos.
- Q: ¿Cuánto puede tardar en aplicarse un cambio pedido durante la 2D en directo? → A: Como mucho 1 minuto de juego desde que se pide.
- Q: ¿En qué tiempo se expresan las velocidades de jugadores y balón? → A: En tiempo visual a x2. El reloj de juego es un marcador condensado.
- Q: Densidad de pases frente a SC-007 → A: Se mantiene SC-007. Si la densidad visual choca con los SC estadísticos, mandan los SC estadísticos.
- Q: ¿La 2D tiene que funcionar en móviles de 360 px? → A: No debe romperse, pero no es un objetivo completo.
- Q: ¿Cómo se ven las jugadas a balón parado? → A: De forma simplificada: colocación creíble y el balón sale desde su punto, sin barrera ni jugadas ensayadas.
- Q: ¿Llevan umbral numérico los patrones de juego que SC-007 no mide? → A: Sí, mínimos medidos con `balance` (SC-007).
- Q: ¿Cómo se mide SC-009? → A: Con una nota absoluta de 1 a 5 tras ver la versión anterior y la nueva.
- Q: ¿Se puede «Finalizar partido» en la simulación rápida? → A: Sí, en cualquier momento, no solo en el descanso.
- Los demás puntos de la revisión (definiciones, magnitudes y criterios de medida) se aprobaron con los valores propuestos, y están en los requisitos y criterios de abajo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cartas de jugador vistosas y legibles (Priority: P1)

Durante el draft, en la plantilla y en la ficha de un jugador, el participante ve cada jugador como una carta coleccionable. En la parte superior destacan la imagen, el nombre y la media. Justo debajo del nombre aparecen, bien resaltadas, las posiciones que puede ocupar. En la parte inferior se leen con claridad los seis stats y las virtudes. El nivel de la carta (Superclase, Épico, Legendario, GOAT) se reconoce de un vistazo por su acabado.

**Why this priority**: Las cartas son el elemento más visible del draft, y el draft es la pieza central del juego. Una carta clara y atractiva mejora a la vez la toma de decisiones y el deseo de coleccionar.

**Independent Test**: Se puede probar abriendo un sobre en el draft y la pantalla de plantilla, y comprobando que cada carta muestra imagen, nombre, media, posiciones, stats y virtudes en la disposición indicada, y que las cartas de distinto nivel se distinguen sin leer el texto del nivel.

**Acceptance Scenarios**:

1. **Given** un sobre abierto en el draft, **When** el participante mira una carta, **Then** ve en la parte superior la imagen del jugador (un icono genérico de personaje en esta fase), su nombre y su media destacada.
2. **Given** una carta, **When** el participante la mira, **Then** ve justo debajo del nombre, resaltadas, todas las posiciones del jugador, y en la parte inferior sus seis stats (abreviatura y valor) y todos sus virtudes.
3. **Given** un GOAT con 4 virtudes, **When** se muestra su carta, **Then** toda su información cabe en la carta y se lee sin desplazarse dentro de ella ni ampliar la pantalla.
4. **Given** cuatro cartas de niveles distintos, **When** se muestran juntas, **Then** cada nivel tiene un acabado visual propio y los niveles más altos resultan claramente más llamativos.
5. **Given** una virtud en una carta, **When** el participante lo señala o lo toca, **Then** ve su descripción.

---

### User Story 2 - Avanzar sin esperas con el botón «Siguiente» (Priority: P1)

En cada momento en que el juego espera a que pase un tiempo (preparación del equipo, descanso, final de partido, fin de jornada, fin del draft), el participante tiene un botón para avanzar, con una etiqueta adecuada a la situación («Siguiente», «Comenzar partido», «Seguir», «Siguiente jornada»…). Como los torneos son asíncronos, fuera del draft pulsar el botón avanza siempre de inmediato. En el draft, que es la única fase síncrona con otros humanos, la pantalla muestra a quién se está esperando para resolver el turno.

**Why this priority**: Es la queja de uso más directa: hoy hay que esperar a que venzan los temporizadores incluso jugando solo contra la IA, lo que hace el juego tedioso.

**Independent Test**: Se puede probar jugando una partida de 1 humano contra NPC, del draft al final del torneo, pulsando siempre el botón de avanzar, y comprobando que nunca hay que esperar a que venza un temporizador.

**Acceptance Scenarios**:

1. **Given** un participante en la preparación del equipo antes de un partido contra un NPC, **When** pulsa «Comenzar partido», **Then** el partido empieza de inmediato, sin esperar a que termine el tiempo de preparación.
2. **Given** un participante que acaba de elegir carta en un draft en el que el resto de participantes son NPC, **When** confirma su elección, **Then** recibe el siguiente sobre de inmediato.
3. **Given** el final de un partido o de una jornada sin otros humanos implicados, **When** el participante pulsa «Siguiente», **Then** pasa a la siguiente pantalla del torneo (clasificación, siguiente jornada o campeón) sin esperas.
4. **Given** un draft con otros humanos, **When** el participante confirma su elección, **Then** ve «Esperando a…» con el nombre de quienes faltan por elegir, y el turno se resuelve en cuanto todos han elegido o vence el tiempo.
5. **Given** el final de un torneo, **When** el participante ve al campeón, **Then** tiene un botón para volver al menú principal.
6. **Given** un torneo con otros humanos, **When** el participante termina de ver su partido de la jornada y pulsa «Siguiente», **Then** pasa de inmediato a la siguiente pantalla, sin esperar a que los demás hayan visto el suyo.

---

### User Story 3 - Simulación 2D fluida, realista y con velocidades coherentes (Priority: P1)

El participante ve el partido en 2D con un ritmo constante, sin tirones ni cambios bruscos de velocidad, y tiene la sensación de estar viendo un partido de fútbol de verdad. Los jugadores mantienen la forma de su equipo, se mueven como un bloque, se desmarcan, presionan y se pasan el balón. Se ven salidas de balón, conducciones, paredes, cambios de orientación, centros al área, remates y contraataques. El balón viaja de forma visible y creíble en cada acción. Los movimientos son naturales, nunca erráticos ni artificiales. Lo que se ve en pantalla refleja los stats de los jugadores y lo que calcula el motor. Hay tres velocidades, x2, x4 y x8: un partido completo dura 4, 2 y 1 minuto respectivamente.

**Why this priority**: La 2D es la modalidad más espectacular, y ahora mismo transmite lo contrario de un partido de fútbol. Va a trompicones, los jugadores tocan el balón sin moverlo y no se aprecian pases ni juego colectivo. Además, un partido dura demasiado. Mejorar mucho el comportamiento de los jugadores es el objetivo principal de esta historia.

**Independent Test**: Se puede probar reproduciendo partidos 2D completos a cada velocidad, cronometrando el reloj de juego, observando secuencias de juego y comparando las estadísticas del partido (pases, posesión) con los stats de los equipos.

**Acceptance Scenarios**:

1. **Given** un partido 2D a una velocidad fija, **When** se cronometra la duración real de cada minuto de juego, **Then** todos los minutos duran lo mismo (dentro de la tolerancia de SC-005), salvo las pausas anunciadas en pantalla (descanso, ventanas de decisión).
2. **Given** un partido 2D en curso, **When** un equipo tiene el balón, **Then** se ven secuencias de varios pases seguidos en las que el balón se desplaza de forma apreciable de un jugador a otro, y los compañeros sin balón se mueven para ofrecer líneas de pase.
3. **Given** un equipo sin balón, **When** el rival ataca, **Then** sus jugadores mantienen su forma, cierran espacios y presionan según su táctica, en lugar de ir todos hacia el balón.
4. **Given** un partido 2D a x2, **When** se reproduce entero, **Then** cada parte dura 2 minutos y el partido completo, 4 minutos; a x4, 1 y 2 minutos; a x8, 30 segundos y 1 minuto.
5. **Given** el partido a x2, **When** el usuario cambia a x4 y luego a x8, **Then** la reproducción es exactamente el doble y el cuádruple de rápida que a x2, sin alterar el desarrollo del partido.
6. **Given** un pase de unos 25 metros a x2, **When** se reproduce, **Then** el balón llega en menos de un segundo, con una trayectoria y una velocidad creíbles, nunca a cámara lenta.
7. **Given** un equipo que ataca por banda, **When** el extremo o el lateral llega cerca de la línea de fondo, **Then** se ve un centro al área con rematadores atacando el espacio.
8. **Given** cualquier tramo del partido, **When** se observan los jugadores, **Then** se desplazan con trayectorias continuas, aceleran y frenan de forma progresiva, y no cambian de dirección de golpe sin motivo, no tiemblan, no se atraviesan ni se amontonan sin sentido.
9. **Given** un partido terminado, **When** el participante abre las estadísticas, **Then** ve los pases intentados y completados, la precisión de pase, los centros y los tiros de cada equipo.

---

### User Story 4 - Penalizaciones de posición proporcionadas (Priority: P1)

Cuando el participante coloca a un jugador fuera de sus posiciones, la penalización depende de lo lejos que esté de su rol natural: es pequeña dentro de su misma demarcación (un SD jugando de DC) y crece cuanto más distinta es la demarcación de destino (un delantero jugando de defensa). La pantalla de alineación muestra el porcentaje aplicado.

**Why this priority**: Las penalizaciones actuales castigan igual a un SD jugando de DC que a un delantero jugando de defensa. Eso empobrece las decisiones tácticas y frustra al participante.

**Independent Test**: Se puede probar colocando jugadores de cada demarcación en casillas de cada demarcación y comprobando que el porcentaje mostrado y los stats efectivos coinciden con la tabla de FR-032.

**Acceptance Scenarios**:

1. **Given** un DEL con posiciones EI y ED, **When** se coloca en la casilla DC, **Then** recibe un −10 % en sus stats.
2. **Given** un DEL, **When** se coloca en cualquier casilla de defensa, **Then** recibe un −40 %.
3. **Given** un MED cuyas posiciones son solo MCO, **When** se coloca en una casilla de ataque, **Then** recibe un −10 %, y en una casilla de defensa, un −30 %.
4. **Given** un MED cuyas posiciones son solo MD, **When** se coloca en una casilla de defensa, **Then** recibe un −10 %, y en una casilla de ataque, un −30 %.
5. **Given** un jugador de campo, **When** se coloca en la portería, **Then** recibe un −60 %, igual que un portero colocado en cualquier casilla de campo.
6. **Given** un jugador en una de sus posiciones, **When** se coloca en ella, **Then** no recibe penalización.

---

### User Story 5 - Finalizar el partido en cualquier momento (Priority: P2)

Mientras ve un partido, en 2D o en simulación rápida, el participante puede pulsar «Finalizar partido» y obtener al instante el resultado final. El tiempo restante se simula de golpe con el mismo motor, de modo que el resultado es exactamente el que habría visto si hubiera seguido mirando.

**Why this priority**: Completa la experiencia de "no esperar" de la US2 para el momento más largo del juego, el partido en 2D, pero no bloquea el resto de mejoras.

**Independent Test**: Se puede probar finalizando un partido 2D en distintos minutos y comprobando que el resultado aparece en pocos segundos y coincide con el de reproducir el mismo partido (mismas condiciones, decisiones y semilla) hasta el final.

**Acceptance Scenarios**:

1. **Given** un partido 2D en el minuto 30, **When** el participante pulsa «Finalizar partido», **Then** en pocos segundos ve el resultado final y el resumen de todos los eventos relevantes del partido.
2. **Given** las mismas condiciones, decisiones y semilla, **When** un partido se finaliza de forma anticipada y otro se ve hasta el final, **Then** ambos tienen el mismo resultado y los mismos eventos.
3. **Given** un participante con una sustitución pendiente, **When** finaliza el partido, **Then** la sustitución se aplica en la siguiente interrupción del juego, como si hubiera seguido mirando.
4. **Given** una eliminatoria empatada, **When** el participante finaliza el partido antes del minuto 90, **Then** la simulación incluye la prórroga y la tanda de penaltis si hacen falta.
5. **Given** que el cálculo del resto del partido tarda más de 300 ms, **When** el participante espera, **Then** ve un indicador de progreso y los eventos a medida que se conocen.
6. **Given** un partido en simulación rápida en la primera parte, **When** el participante pulsa «Finalizar partido», **Then** ve el resultado final sin pasar por el descanso.

---

### User Story 6 - Barra de navegación siempre disponible (Priority: P2)

En todas las pantallas hay una barra de navegación que lleva al menú principal y a las demás secciones de la aplicación. Si salir de la pantalla actual va a sacar al participante de un draft en curso con otros humanos, que es la única fase síncrona, la aplicación le pide confirmación y le explica que un NPC ocupará su lugar. En cualquier otro momento puede salir libremente y volver más tarde desde «Mis partidas».

**Why this priority**: Hoy, al terminar un torneo, no hay forma de volver al menú principal. Es un bloqueo de uso, aunque menos frecuente que las esperas.

**Independent Test**: Se puede probar navegando desde cada pantalla (draft, preparación, partido, clasificación, final de torneo) al menú principal, y comprobando cuándo aparece el modal de confirmación y qué pasa al aceptarlo o cancelarlo.

**Acceptance Scenarios**:

1. **Given** el final de un torneo, **When** el participante usa la barra de navegación, **Then** llega al menú principal.
2. **Given** un participante en un draft con otros humanos, **When** intenta ir a otra sección, **Then** ve un modal que le avisa de que abandonará la partida y un NPC ocupará su plaza.
3. **Given** ese modal, **When** el participante cancela, **Then** sigue en el draft sin ningún cambio.
4. **Given** ese modal, **When** el participante confirma, **Then** sale de la partida y su plaza pasa a estar controlada por un NPC para el resto de la partida.
5. **Given** un participante en una partida en la que es el único humano, **When** navega a otra sección, **Then** no ve ningún modal, y puede volver a la partida desde «Mis partidas» y seguir donde la dejó.
6. **Given** un participante en la fase de torneo de una partida con otros humanos, **When** navega a otra sección, **Then** no ve ningún modal y su plaza sigue siendo suya; puede volver antes de que venza el plazo de la jornada.

---

### User Story 7 - Colocación libre de los jugadores en la pantalla de tácticas (Priority: P2)

*[Actualizado por la [spec 003](../003-mejoras-ux-simulacion/spec.md): la colocación se hace en el campo de la alineación (003/FR-001).]*

En la pantalla de tácticas, el participante puede arrastrar a cualquier jugador de campo a cualquier zona del campo para ajustar la distribución de su equipo. La posición en la que juega cada jugador, y por tanto su penalización, depende de la zona en la que se coloca. Por ejemplo, retrasar un poco a un delantero centro lo convierte en segundo delantero, y así un SD natural deja de estar penalizado. La formación elegida es solo el punto de partida: si el participante la modifica, el equipo se comporta según la colocación real y su ofensividad se calcula a partir de ella.

**Why this priority**: Da flexibilidad táctica y complementa las nuevas penalizaciones (US4), pero el juego es plenamente jugable con las formaciones fijas.

**Independent Test**: Se puede probar arrastrando jugadores entre zonas en la pantalla de tácticas y comprobando que la posición efectiva y la penalización mostradas cambian al instante y que el partido usa esa colocación.

**Acceptance Scenarios**:

1. **Given** un SD natural colocado en la casilla DC de un 4-3-3, **When** el participante lo arrastra un poco hacia atrás hasta la zona de SD, **Then** su posición efectiva pasa a SD y su penalización desaparece.
2. **Given** un jugador arrastrado a otra zona, **When** se suelta, **Then** la pantalla muestra su nueva posición efectiva, su penalización y sus stats efectivos.
3. **Given** una alineación con jugadores recolocados, **When** se juega el partido, **Then** esos jugadores parten de la zona en la que se colocaron y juegan con la posición efectiva de esa zona.
4. **Given** el portero, **When** el participante intenta sacarlo de la zona de portería, **Then** el sistema no lo permite: el portero solo puede moverse dentro de la zona de portería.
5. **Given** un 4-4-2, **When** el participante adelanta a un mediocentro hasta la zona de delanteros, **Then** la pantalla indica que la formación es personalizada, muestra su reparto por líneas (4 defensas, 3 medios y 3 delanteros) y su ofensividad recalculada.
6. **Given** dos alineaciones idénticas salvo que una tiene un delantero más y un defensa menos, **When** se juegan series de partidos contra el mismo rival, **Then** la más adelantada marca y recibe más goles de media, igual que una formación más ofensiva (001/FR-034).

---

### User Story 8 - Dorsales del 1 al 24 sin duplicados (Priority: P3)

Al formarse la plantilla, los 24 jugadores reciben los dorsales del 1 al 24. Después, el participante puede asignar a cualquier jugador cualquier otro número. Si asigna un dorsal que ya tenía un compañero, el compañero se queda sin dorsal hasta que se le asigne otro.

**Why this priority**: Es un ajuste de presentación y personalización, sin impacto en el resultado de los partidos.

**Independent Test**: Se puede probar formando una plantilla, comprobando que los dorsales son exactamente del 1 al 24, y reasignando dorsales hasta provocar un conflicto.

**Acceptance Scenarios**:

1. **Given** una plantilla recién formada tras el draft, **When** se asignan los dorsales, **Then** los 24 jugadores tienen los números del 1 al 24, cada uno una sola vez, respetando los dorsales fijos por casilla de los titulares (001/FR-031a).
2. **Given** un jugador con el dorsal 14, **When** el participante le asigna el 33, **Then** el jugador pasa a llevar el 33 y el 14 queda libre.
3. **Given** el dorsal 2 asignado a un compañero, **When** el participante asigna el 2 a otro jugador, **Then** el compañero pierde el 2 y aparece señalado como "sin dorsal".
4. **Given** un jugador convocado sin dorsal, **When** empieza el partido, **Then** el sistema le asigna automáticamente el dorsal libre más bajo y avisa al participante.

---

### User Story 9 - Máximos goleadores y asistentes del torneo (Priority: P3)

En la pantalla del torneo, junto a la clasificación o al cuadro, el participante puede consultar dos tablas: máximos goleadores y máximos asistentes. Las tablas acumulan todos los partidos ya disputados en ese torneo.

**Why this priority**: Añade interés competitivo y de seguimiento, pero no forma parte del ciclo central.

**Independent Test**: Se puede probar jugando varias jornadas y comprobando que los goles y asistencias de cada jugador en las tablas coinciden con la suma de los resúmenes de sus partidos.

**Acceptance Scenarios**:

1. **Given** un torneo con varias jornadas jugadas, **When** el participante abre "Máximos goleadores", **Then** ve a los jugadores ordenados por goles, con su equipo, sus goles y sus partidos jugados.
2. **Given** el mismo torneo, **When** abre "Máximos asistentes", **Then** ve a los jugadores ordenados por asistencias, con los mismos datos.
3. **Given** un partido que acaba de terminar, **When** el participante vuelve a las tablas, **Then** reflejan ya los goles y asistencias de ese partido.
4. **Given** un partido que se decidió en una tanda de penaltis, **When** se actualizan las tablas, **Then** los penaltis de la tanda no cuentan como goles.

---

### User Story 10 - Apertura de sobre con animación y sonido (Priority: P3)

Cuando el participante abre cada uno de sus tres sobres, ve una animación de apertura con efectos y sonido, y las cartas se reparten sobre la mesa antes de revelarse. Los sobres que le llegan de otros participantes durante el draft aparecen directamente, sin animación.

**Why this priority**: Aporta emoción y la sensación de que el juego está vivo, pero es la mejora más prescindible para jugar. En esta fase se hace una versión básica, de coste moderado: efectos 2D, sonido y revelación especial para los niveles altos. La versión elaborada queda para una fase dedicada al diseño visual.

**Independent Test**: Se puede probar jugando un draft completo y comprobando que la animación aparece exactamente tres veces (una por sobre propio), que se puede saltar y que no reduce el tiempo disponible para elegir.

**Acceptance Scenarios**:

1. **Given** el inicio de cada uno de los tres sobres, **When** el participante recibe su sobre propio, **Then** ve la animación de apertura con sonido y el reparto de las cartas.
2. **Given** un turno en el que le llega el sobre de otro participante, **When** lo recibe, **Then** las cartas aparecen sin animación de apertura.
3. **Given** la animación en curso, **When** el participante la toca o pulsa «Saltar», **Then** las cartas se muestran reveladas de inmediato.
4. **Given** el sonido desactivado por el participante, **When** se abre un sobre, **Then** la animación se reproduce sin sonido, y la preferencia se recuerda.
5. **Given** una carta de nivel Legendario o GOAT en el sobre, **When** se revela, **Then** su aparición tiene un efecto especial que la distingue.

---

### User Story 11 - Torneos asíncronos: el draft es la única fase síncrona (Priority: P1)

Los participantes humanos coinciden en directo solo durante el draft. Después, cada uno prepara su equipo y juega sus partidos cuando quiere, contra los equipos de los demás, sin necesidad de que sus propietarios estén conectados. Un partido contra un NPC se juega en directo con el humano, que puede hacer cambios. Un partido entre dos humanos se resuelve con las alineaciones guardadas de ambos y decisiones automáticas iguales para los dos equipos, y cada uno lo ve cuando quiere, con todas las velocidades y la opción de finalizarlo.

**Why this priority**: Es la decisión que hace viables el resto de mejoras (botón «Siguiente», velocidades propias, finalizar partido, navegación libre) sin esperas entre humanos. Mantener los partidos síncronos entre humanos multiplicaría su complejidad (ver FR-029).

**Independent Test**: Se puede probar con un torneo de 2 humanos y NPC. Tras el draft, cada humano juega y ve sus partidos en momentos distintos. Se comprueba que ninguno espera al otro, que ambos ven el mismo resultado en su partido directo y que la jornada se cierra al jugarse todos los partidos o al vencer el plazo.

**Acceptance Scenarios**:

1. **Given** un torneo con dos humanos que se enfrentan en la jornada 2, **When** el primero abre su partido, **Then** el partido se resuelve con las alineaciones guardadas de ambos, y lo ve sin que el rival tenga que estar conectado.
2. **Given** ese partido ya resuelto, **When** el segundo humano lo abre más tarde, **Then** ve exactamente el mismo partido (mismos eventos y resultado), con todas las velocidades y la opción de finalizarlo, pero sin poder tomar decisiones.
3. **Given** un partido entre dos humanos, **When** se resuelve, **Then** las sustituciones y los cambios tácticos de los dos equipos los toma el sistema automáticamente, con el mismo criterio para ambos.
4. **Given** un partido de un humano contra un NPC, **When** el humano lo juega, **Then** puede hacer sustituciones y cambios tácticos durante el partido, como en la spec 001.
5. **Given** un humano que aún no ha visto su partido de la jornada, **When** consulta la clasificación, **Then** su propio partido aparece como "pendiente de ver" y no se le revela el resultado hasta que lo vea o decida mostrarlo.
6. **Given** una jornada con plazo, **When** vence sin que un partido se haya abierto, **Then** el sistema lo resuelve automáticamente y la jornada se cierra.
7. **Given** un torneo en el que el único humano es el participante, **When** termina de ver su partido, **Then** puede pasar a la siguiente jornada de inmediato, sin plazos.

---

### Edge Cases

- **Reconexión durante la animación de apertura**: al reconectar no se repite la animación; las cartas se muestran directamente.
- **Animación y temporizador del draft**: la animación no consume tiempo de elección. El participante puede elegir en cuanto se revelan las cartas, y el tiempo del primer turno de cada sobre incluye un margen para la animación.
- **Botón de avanzar pulsado dos veces o por varios humanos a la vez**: cuenta una sola vez por participante y la transición se produce una sola vez.
- **NPC en situaciones de avanzar**: un NPC está siempre listo y nunca hace esperar a un humano.
- **Cierre de la pestaña o caída de la conexión** (no es una navegación explícita): se aplican las reglas de desconexión y reconexión de la spec 001 (elecciones automáticas, reconexión con el estado conservado). La sustitución definitiva por un NPC solo ocurre cuando el participante confirma el modal de la barra de navegación.
- **Navegación con el modal abierto mientras vence un temporizador**: el juego sigue avanzando según sus reglas; si el participante cancela, vuelve al estado actual de la partida.
- **Partida con un único humano abandonada en mitad de un turno**: sus temporizadores quedan detenidos hasta que vuelva (FR-021). Para un invitado sigue aplicando la regla de pérdida de partida de 001/FR-000.
- **«Finalizar partido» durante una ventana de decisión** (descanso, antes de la prórroga): se cierra la ventana sin cambios y se simula el resto.
- **«Finalizar partido» con el balón en juego y una decisión pendiente**: la decisión se aplica en la siguiente interrupción, como en la reproducción normal.
- **«Finalizar partido» durante la pausa de un gol**: se cierra la pausa y se simula el resto. En la reproducción de un partido entre humanos ya resuelto, «Finalizar» salta directamente al final.
- **Faltan datos de la reproducción** (conexión lenta o servidor cargado): el reloj de juego se detiene con el rótulo «Cargando…», que cuenta como pausa anunciada, y la reproducción sigue a la misma velocidad cuando llegan los datos. Nunca se acelera para recuperar el tiempo perdido.
- **Cambio de velocidad en mitad de una acción** (balón en el aire): se aplica al instante y la acción sigue a la nueva velocidad. Durante una pausa anunciada, la duración de la pausa no cambia.
- **Expulsión o lesión sin cambio**: el equipo vuelve a repartir las anclas de la línea afectada para cubrir el hueco, y la forma del equipo se mantiene coherente. Un sustituto hereda el ancla del jugador al que sustituye.
- **Jugador con varias posiciones que dan penalizaciones distintas**: se aplica la más favorable (ver Assumptions).
- **Virtud Todocampista**: sigue anulando la penalización por posición salvo en la portería, por encima de la nueva tabla.
- **Casilla "central del medio" de una defensa de 3 o 5** (001/FR-025a): un DEF sin DCI ni DCD recibe la penalización dentro de la demarcación (−10 %).
- **Jugador arrastrado a una zona que no se corresponde con ninguna casilla de la formación**: su posición efectiva es la de la zona en la que queda, con la penalización correspondiente, y la formación pasa a ser personalizada.
- **Colocación extrema** (p. ej. 9 jugadores en ataque, o dos jugadores en el mismo punto): se permite, siempre que la alineación sea válida (FR-034a). El sistema avisa de las distribuciones muy desequilibradas antes de confirmar, y separa ligeramente a los jugadores superpuestos.
- **Dos humanos que abren a la vez su partido directo**: el partido se resuelve una sola vez y ambos ven el mismo.
- **Cambio de alineación después de que el rival haya abierto el partido**: no es posible, porque el partido ya está resuelto con la alineación guardada en ese momento. Mientras el partido no se ha abierto, cada humano puede cambiar su alineación.
- **Humano que nunca prepara su alineación en un torneo asíncrono**: se usa su última alineación válida o, si no existe, la automática (001/FR-031).
- **Abandono de un humano durante la fase de torneo**: su plaza pasa a un NPC intermedio, como en la spec 001. Salir a otra sección no cuenta como abandono.
- **Dorsal reasignado a un jugador del once durante la preparación**: el jugador que pierde el dorsal queda "sin dorsal"; si sigue convocado al empezar el partido, recibe uno automático (FR-038).
- **Todos los dorsales del 1 al 24 ocupados al necesitar uno automático**: se asigna el número libre más bajo a partir del 25.
- **Empate en las tablas de goleadores o asistentes**: se ordena por menos partidos jugados y, después, por nombre.
- **Gol en propia puerta**: cuenta para el marcador, pero no suma en la tabla de goleadores ni da asistencia.
- **Torneo mixto y playoff de 16**: las tablas acumulan todas las fases y las dos mesas de draft.

## Requirements *(mandatory)*

### Functional Requirements

#### Diseño de las cartas

- **FR-001**: Cada carta de jugador DEBE mostrar, con esta disposición:
  - **Parte superior**: la imagen del jugador, su nombre y su media, con la media y el nombre en un tamaño claramente destacado. En esta fase la imagen PUEDE ser un icono genérico de personaje, pero DEBE estar siempre presente.
  - **Debajo del nombre**: todas las posiciones del jugador, resaltadas (p. ej. como distintivos), y su demarcación.
  - **Parte inferior**: los seis stats (abreviatura y valor) y todas las virtudes por su nombre.
- **FR-002**: Cada nivel (Superclase, Épico, Legendario, GOAT) DEBE tener un acabado visual propio (marco, colores, brillo o equivalente) que permita reconocerlo sin leer su nombre. El atractivo visual DEBE crecer con el nivel.
- **FR-003**: Toda la información de la carta DEBE caber y leerse sin desplazamiento interno ni ampliación, incluido el caso de un GOAT con 4 virtudes, tanto en pantallas de escritorio como en móviles de 360 px de ancho.
- **FR-004**: La descripción de cada virtud DEBE poder consultarse desde la carta (al señalarlo o tocarlo).
- **FR-005**: El mismo diseño de carta DEBE usarse en el draft, en la plantilla y en la ficha del jugador. En listas largas PUEDE usarse una versión compacta, desde la que se pueda abrir la carta completa.

#### Apertura de sobre

- **FR-006**: Al empezar cada uno de los tres sobres del draft, el sobre propio de cada participante DEBE abrirse con una animación que incluya efecto de apertura, sonido y reparto de las cartas sobre la mesa antes de revelarlas. Los sobres recibidos de otros participantes NO DEBEN tener esta animación. En esta fase basta con una versión básica de efectos 2D; los efectos elaborados (3D, partículas, música) quedan para la fase de diseño visual.
- **FR-007**: La animación DEBE durar como máximo 6 segundos y DEBE poder saltarse con un solo toque o clic, mostrando las cartas reveladas de inmediato. *[Actualizado por la [spec 003](../003-mejoras-ux-simulacion/spec.md): como máximo 8 segundos (003/FR-013).]*
- **FR-008**: La animación NO DEBE reducir el tiempo de elección: el primer turno de cada sobre DEBE incluir un margen igual a la duración máxima de la animación. *[Actualizado por la [spec 003](../003-mejoras-ux-simulacion/spec.md): el margen pasa a 8 segundos (`draft.margenAnimacionS`, 003/FR-013).]*
- **FR-009**: Las cartas de nivel Legendario y GOAT DEBEN tener un efecto de revelación propio que las distinga.
- **FR-010**: El participante DEBE poder silenciar los sonidos del juego, y la aplicación DEBE recordar esa preferencia. Si el dispositivo indica preferencia de movimiento reducido, la animación DEBE sustituirse por una transición simple.

#### Avanzar de forma explícita

- **FR-011**: En toda pantalla en la que el juego espera a que venza un temporizador, DEBE haber un botón para avanzar con una etiqueta adecuada a la situación. Como mínimo:
  - fin del draft → «Preparar equipo»;
  - preparación del equipo → «Comenzar partido»;
  - descanso y antes de la prórroga → «Seguir»;
  - final del partido → «Siguiente»;
  - fin de jornada → «Siguiente jornada»;
  - fin del torneo → «Volver al menú».
- **FR-012**: Fuera del draft, pulsar el botón DEBE avanzar de inmediato para ese participante, sin esperar a ningún otro participante, porque los torneos son asíncronos (FR-030).
- **FR-013**: En el draft, tras confirmar su elección, el participante DEBE ver a quién se está esperando. El turno DEBE resolverse en cuanto todos han elegido o vence el tiempo del turno, lo que ocurra antes.
- **FR-014**: Los NPC DEBEN elegir al instante en el draft y estar siempre listos, de modo que nunca hagan esperar a un humano.
- **FR-015**: Los temporizadores del draft y los plazos de jornada de los torneos con varios humanos DEBEN seguir existiendo como límite máximo frente a humanos ausentes. El botón permite adelantarse, pero no los elimina.
- **FR-016**: Las confirmaciones duplicadas DEBEN contar una sola vez por participante, y cada transición DEBE producirse una sola vez.

#### Navegación

- **FR-017**: Todas las pantallas DEBEN mostrar una barra de navegación con acceso, como mínimo, a: menú principal, «Mis partidas» (partidas en curso y terminadas), «Nueva partida» y «Cuenta» (o «Iniciar sesión» para un invitado). Durante un partido 2D la barra PUEDE mostrarse en versión compacta, pero DEBE seguir accesible.
- **FR-018**: Si navegar a otra sección va a sacar al participante de un draft en curso con otros humanos (la única fase síncrona, FR-030), la aplicación DEBE mostrar antes un modal de confirmación que explique que abandonará la partida y que un NPC ocupará su plaza.
- **FR-019**: Si el participante confirma, DEBE salir de la partida y su plaza DEBE pasar a estar controlada por un NPC de nivel intermedio durante el resto de la partida, igual que en un abandono (001, Edge Cases). Si cancela, NO DEBE producirse ningún cambio.
- **FR-020**: El modal NO DEBE aparecer cuando la navegación no afecta a ningún otro humano.
- **FR-021**: En una partida en la que el participante es el único humano, salir a otra sección DEBE dejar la partida en pausa, con sus temporizadores detenidos, y el participante DEBE poder retomarla desde «Mis partidas» en el mismo punto. En la fase de torneo de una partida con otros humanos, salir a otra sección NO DEBE tener ninguna consecuencia: el participante conserva su plaza y puede volver mientras no venza el plazo de la jornada. Si sale mientras ve un partido contra un NPC, el partido DEBE quedar en pausa hasta que vuelva o venza el plazo.

#### Simulación 2D

- **FR-022**: Homogeneidad: a una velocidad fija, el reloj de juego DEBE avanzar a un ritmo constante respecto al tiempo real durante todo el partido. El movimiento de jugadores y balón DEBE ser continuo, sin congelarse ni acelerarse mientras el balón está en juego. Solo se permiten estas pausas anunciadas en pantalla, que no avanzan el reloj de juego:
  - **gol**: rótulo «¡GOL!» durante 2 s reales, a cualquier velocidad;
  - **descanso** y **antes de la prórroga**: son las ventanas de decisión del partido;
  - **«Cargando…»**: solo si faltan datos de la reproducción (ver Edge Cases).
- **FR-022a**: Balón parado: los saques de banda, de puerta y de esquina, las faltas, los penaltis y el saque de centro tras un gol DEBEN representarse de forma simplificada. Los jugadores se colocan de forma creíble (rematadores en el área en los córners y las faltas laterales, sacador en su punto) y el balón sale desde el punto del saque. No hay barrera ni jugadas ensayadas.
- **FR-023**: Realismo del comportamiento. Es el objetivo principal de la mejora de la 2D: el partido DEBE parecer fútbol de verdad.
  - **Juego colectivo con balón**: el equipo DEBE construir jugadas reconocibles:
    - salida de balón desde atrás y juego directo;
    - pases cortos y largos, paredes y cambios de orientación;
    - conducciones y regates para progresar;
    - ataques por banda que terminan en centros al área con rematadores atacando el espacio;
    - tiros desde fuera y dentro del área, y contraataques tras recuperación.

    La frecuencia de cada patrón depende de la táctica y de los stats, así que no se exige que aparezcan todos en cada partido. Los mínimos medios se fijan en SC-007.
  - **Balón**: DEBE desplazarse de forma visible y creíble según el tipo de acción (pase raso, pase largo, centro, tiro, despeje), con una velocidad y una trayectoria proporcionadas a la distancia y a la potencia (límites en FR-025). NO DEBE haber toques sin desplazamiento apreciable del balón, salvo controles y conducciones, en los que el balón acompaña al jugador.
  - **Jugadores sin balón del equipo atacante**: DEBEN moverse para ofrecer líneas de pase, desmarcarse, abrir el campo y acompañar la jugada. La distancia entre líneas consecutivas del mismo equipo DEBE estar entre 10 y 25 m con balón y entre 8 y 18 m sin balón, salvo en las transiciones.
  - **Equipo defensor**: DEBE mantener su forma, basculando, cubriendo y cerrando espacios según su posición y la táctica (tabla de efectos de abajo). Como mucho van al balón uno o dos jugadores; NO DEBEN acudir más a la vez salvo en una **presión coordinada**. Una presión coordinada permite hasta 3 jugadores sobre el balón, solo con altura de bloque Presión alta y durante un máximo de 5 s tras una pérdida del rival en su propio campo.
  - **Efecto de la táctica en el movimiento** (opciones de 001/FR-035):

    | Opción | Efecto visible |
    |---|---|
    | Zona | Cada defensor cubre su zona y bascula con el bloque. |
    | Individual | Cada defensor sigue a su par cuando entra en su zona, aunque se descoloque el bloque. |
    | Catenaccio | Bloque retrasado: la línea defensiva cerca del área y los medios por detrás de la mitad de su campo. |
    | Bloque medio | Bloque alrededor del círculo central. |
    | Presión alta | Bloque adelantado: los delanteros presionan la salida de balón rival y se permite la presión coordinada. |
    | Línea adelantada | La línea defensiva sube hacia el centro del campo cuando el equipo tiene el balón. |
    | Equilibrado | Mezcla de pases cortos y largos, y de juego por dentro y por banda. |
    | Contraataque | Tras recuperar, pases verticales rápidos y desmarques de ruptura; en ataque estático, menos pases. |
    | Combinativo | Pases cortos, paredes, apoyos cercanos y posesiones largas. |
    | Juego vertical | Más balones largos y centros, y menos pases horizontales. |
  - **Porteros**: DEBEN colocarse según la posición del balón, salir en centros y mano a mano, y poner en juego el balón tras una parada o un saque de puerta.
  - **Movimiento natural, nunca errático ni artificial**:
    - trayectorias continuas;
    - aceleración y frenada progresivas;
    - orientación coherente con la jugada;
    - sin cambios de dirección bruscos sin motivo, temblores, saltos de posición, jugadores que se atraviesan ni aglomeraciones sin sentido.
  - **Coherencia con el motor**: cada acción visible DEBE corresponder a una acción calculada por el motor, y su éxito DEBE depender de los stats de los jugadores implicados (001/FR-033). En pantalla DEBEN notarse los stats y la táctica: un jugador con 20 puntos más de velocidad DEBE correr al menos un 15 % más rápido; los equipos con mejor pase encadenan más pases (SC-008), y el estilo elegido se reconoce en la forma de atacar.
  - **Equivalencia entre modalidades**: la capa espacial forma parte del cálculo del motor, así que la simulación rápida y la 2D DEBEN seguir dando exactamente el mismo partido con las mismas condiciones (001/SC-008).
- **FR-024**: Las estadísticas del partido (001/FR-047) DEBEN incluir, para cada equipo, pases intentados, pases completados, precisión de pase, centros y tiros. Los centros NO cuentan como pases. Una **posesión** empieza cuando un equipo gana el balón y termina cuando lo pierde; las interrupciones en las que conserva el balón (falta a favor, saque de banda propio) no la cortan.
- **FR-025**: Velocidades:
  - El usuario DEBE poder elegir entre tres velocidades, x2, x4 y x8, que sustituyen a las de 001/FR-049. La velocidad por defecto es x2, y la aplicación recuerda en el navegador la última que eligió el usuario.
  - Un partido completo DEBE durar 4 minutos reales a x2, 2 minutos a x4 y 1 minuto a x8, **incluido el descuento** y sin contar las pausas anunciadas. Cada parte dura la mitad (2 minutos, 1 minuto y 30 segundos).
  - Para que esas duraciones se cumplan, el descuento de cada parte reglamentaria DEBE estar entre 1 y 3 minutos de juego.
  - La prórroga mantiene la misma proporción: sus 30 minutos duran unos 77 s a x2, más su descuento.
  - La tanda de penaltis se ve en el campo con un ritmo propio: unos 3 s reales por lanzamiento a x2, 1,5 s a x4 y 0,75 s a x8.
  - Cada velocidad DEBE reproducir el partido exactamente al doble de rápido que la anterior. Un cambio de velocidad se aplica al instante y NO DEBE alterar el desarrollo del partido. Cada participante elige su velocidad sin afectar a nadie más (FR-030).
  - **Tiempo visual**: las velocidades de jugadores y balón se definen en tiempo real de reproducción a x2, y el reloj de juego es un marcador condensado (Assumptions). A x2, los movimientos DEBEN verse ágiles y creíbles, nunca a cámara lenta ni acelerados:

    | Acción a x2 | Duración real |
    |---|---|
    | Pase raso de unos 25 m | entre 0,5 y 0,9 s |
    | Pase largo de unos 40 m | 1,5 s como máximo |
    | Centro | 1,3 s como máximo |
    | Tiro | 0,7 s como máximo |
    | Despeje | 1,5 s como máximo |
    | Velocidad máxima de un jugador | 9 m/s |

    A x4 y x8 todo va dos y cuatro veces más rápido.
- **FR-025a**: Decisiones durante la 2D en directo: un cambio pedido con el balón en juego DEBE aplicarse en la primera interrupción que ocurra después de, como mucho, **1 minuto de juego** desde que se pide, a cualquier velocidad. La interfaz indica el minuto en que se aplicará en cuanto el servidor lo confirma. *[Actualizado por la [spec 003](../003-mejoras-ux-simulacion/spec.md): los cambios se piden desde la pantalla con campo de «Gestionar equipo», que pausa la reproducción (003/FR-031).]*
- **FR-025b**: Presentación de la 2D:
  - la reproducción DEBE ir a 60 fps en un portátil medio, y nunca por debajo de 30 fps;
  - en móviles de 360 px de ancho la 2D NO DEBE romperse (campo, marcador y controles visibles), aunque no es un objetivo de diseño completo;
  - con preferencia de movimiento reducido, se quitan los rótulos animados, pero la reproducción se mantiene;
  - si las equipaciones de los dos equipos se confunden, se aplica la regla de choque de colores de 001/FR-031b.
- **FR-026**: Finalización anticipada: en un partido 2D o en simulación rápida, el participante DEBE poder pulsar «Finalizar partido» en cualquier momento. Entonces: *[Actualizado por la [spec 003](../003-mejoras-ux-simulacion/spec.md): al finalizar se pasa a una pantalla de resultado sin campo (003/FR-024).]*
  - El sistema DEBE simular el tiempo restante en menos de 3 s (SC-010) con el mismo motor, las mismas decisiones registradas y la misma semilla, de modo que el resultado y los eventos coincidan con los de ver el partido hasta el final **sin tomar más decisiones después de pulsar el botón**.
  - Las decisiones pendientes DEBEN aplicarse en la siguiente interrupción, y las ventanas de decisión restantes se cierran sin cambios para ese participante.
  - Las decisiones de los NPC DEBEN tomarse como de costumbre.
  - DEBEN simularse la prórroga y la tanda de penaltis cuando correspondan.
- **FR-027**: Si el cálculo del resto del partido tarda más de 300 ms, el sistema DEBE mostrar un indicador de progreso y los eventos relevantes a medida que se conozcan, y al terminar DEBE mostrar el resumen completo.
- **FR-028**: En simulación rápida, «Finalizar partido» DEBE estar disponible en cualquier momento, incluido el descanso, y lleva directamente al resultado final sin hacer cambios.
- **FR-028a**: Rendimiento del motor, para que se cumplan SC-003, SC-010 y la carga de la beta (001/SC-017): un partido completo sin fotogramas DEBE costar como mucho 120 ms de CPU, igual que con fotogramas, con métricas y el cálculo del resto del partido desde el minuto 0. (Revisado el 2026-10-23 en la spec 005: el umbral original de 25/40/30 ms no se alcanzó; el motor mide unos 80-110 ms y se acepta ese coste.)

#### Modelo de competición entre humanos (viabilidad del modelo síncrono)

- **FR-029**: La fase de planificación DEBE documentar la evaluación técnica que respalda la decisión de FR-030: complejidad, rendimiento, experiencia de usuario e implicaciones para la arquitectura. Conclusión ya aceptada por el usuario: mantener partidos síncronos entre humanos multiplicaría la complejidad de FR-011 a FR-028, con velocidad mínima común, confirmaciones dobles, finalización consensuada y sustitución por NPC a mitad de partido.
- **FR-030**: Modelo de competición. El draft DEBE ser la única fase síncrona entre humanos. Los torneos DEBEN jugarse siempre de forma asíncrona, y este modelo sustituye al ritmo "en directo" de 001/FR-056 para los partidos entre humanos:
  - **Plazos**: cada jornada de un torneo con varios humanos tiene un plazo (001/FR-056a, por defecto 24 horas). En un torneo con un solo humano no hay plazos: la siguiente jornada se abre cuando el humano pulsa «Siguiente jornada», y los partidos entre NPC se resuelven al instante.
  - **Partido humano contra NPC**: se juega cuando el humano lo abre. El humano puede tomar decisiones durante el partido (001/FR-045 y FR-050), y el NPC decide como siempre.
  - **Partido entre dos humanos**: se resuelve una sola vez, cuando el primero de los dos lo abre o, si nadie lo abre, al vencer el plazo. Se usan las alineaciones guardadas de ambos en ese momento. Las sustituciones y los cambios tácticos de los dos equipos los decide el sistema automáticamente, con el mismo criterio y el mismo nivel de decisión para ambos.
  - **Visualización**: cada humano ve ese partido cuando quiere, en la modalidad de la partida, con su propia velocidad y la opción de finalizarlo (FR-026), y sin tomar decisiones. Los dos ven exactamente los mismos eventos y el mismo resultado.
  - **Resultado propio**: un humano que aún no ha visto su partido DEBE verlo como "pendiente de ver" en la clasificación y el calendario, sin que se le revele el resultado hasta que lo vea o decida mostrarlo.
  - **Integridad**: la resolución del partido DEBE hacerse en el servidor (001/FR-061). Las alineaciones quedan fijadas para ese partido en el momento de resolverlo.

#### Posiciones y penalizaciones

- **FR-031**: Un jugador colocado en una posición que no tiene, pero que pertenece a su misma demarcación, DEBE recibir una penalización del 10 % en todos sus stats. Las posiciones de cada demarcación son las de 001/FR-018: DEF = LI, LD, DCI, DCD, CI, CD; MED = MD, MC, MII, MID, MCO; DEL = DC, SD, EI, ED.
- **FR-032**: Un jugador colocado en una posición de otra demarcación DEBE recibir en todos sus stats la penalización de esta tabla, que sustituye a la de 001/FR-027 y su Assumption:

  | Demarcación original | Demarcación de destino | Penalización |
  |---|---|---:|
  | DEL | MED, cualquier posición | −20 % |
  | DEL | DEF, cualquier posición | −40 % |
  | MED, excepto MCO y MD | DEL, cualquier posición | −20 % |
  | MED, excepto MCO y MD | DEF, cualquier posición | −20 % |
  | MED (MCO) | DEL, cualquier posición | −10 % |
  | MED (MCO) | DEF, cualquier posición | −30 % |
  | MED (MD) | DEL, cualquier posición | −30 % |
  | MED (MD) | DEF, cualquier posición | −10 % |
  | DEF | DEL, cualquier posición | −40 % |
  | DEF | MED, cualquier posición excepto MCO | −20 % |
  | DEF | MED (MCO) | −30 % |
  | POR | DEF, MED o DEL, cualquier posición | −60 % |
  | DEF, MED o DEL | POR | −60 % |

  "MED (MCO)" y "MED (MD)" se refieren al jugador de origen según sus posiciones. "MED (MCO)" como destino se refiere a la casilla MCO. Si a un jugador le corresponden varias filas por tener varias posiciones, se aplica la penalización más baja.
- **FR-033**: Las virtudes que anulan o modifican la penalización por posición (como Todocampista) DEBEN mantener su efecto sobre la nueva tabla. La pantalla de alineación DEBE mostrar, para cada titular fuera de posición, el porcentaje de penalización aplicado junto a sus stats y su media efectivos (001/FR-028).
- **FR-034**: Colocación libre: en la pantalla de tácticas, el participante DEBE poder arrastrar a cualquier titular de campo a cualquier zona del campo. *[Actualizado por la [spec 003](../003-mejoras-ux-simulacion/spec.md): la colocación libre se hace en el campo de la pantalla «Formación», no en uno aparte (003/FR-001).]*
  - El campo se divide en zonas, cada una asociada a un código de posición de 001/FR-018. Incluye la zona del central del medio de 001/FR-025a.
  - La posición efectiva del jugador, y por tanto su penalización, DEBE ser la de la zona en la que queda.
  - La pantalla DEBE actualizar al instante la posición efectiva, la penalización y los stats efectivos.
  - La formación elegida DEBE servir como colocación de partida. Si la colocación deja de coincidir con ella, la pantalla DEBE indicar que la formación es "personalizada" y mostrar su reparto por líneas (defensas, medios y delanteros).
  - El motor DEBE usar esa colocación como punto de partida y referencia del jugador durante el partido.
- **FR-034b**: La ofensividad del equipo (001/FR-034) DEBE calcularse a partir de la colocación real: cuántos jugadores hay en cada línea y lo adelantados que están. Debe coincidir con la tabla de ofensividad de la spec 001 cuando la colocación es la de una de las diez formaciones. El comportamiento del equipo (zona y tipo de las acciones, bandas o juego interior) DEBE derivarse también de la colocación.
- **FR-034a**: La colocación libre DEBE respetar las reglas de una alineación válida (001/FR-026 y FR-030): 11 titulares y un único portero en la zona de portería. El sistema DEBE validarla también en el servidor.

#### Dorsales

- **FR-035**: *[Actualizado por la [spec 003](../003-mejoras-ux-simulacion/spec.md): la primera asignación es al terminar el draft (003/FR-001b).]* Al asignar los dorsales por primera vez (001/FR-031a), los números aleatorios DEBEN estar entre el 1 y el 24. Así, los 24 jugadores de la plantilla reciben exactamente los números del 1 al 24, sin repetir, manteniendo los dorsales fijos por casilla de los titulares.
- **FR-036**: Al editar los dorsales, el participante DEBE poder asignar cualquier número entre el 1 y el 99.
- **FR-037**: Dos jugadores de una misma plantilla NO DEBEN tener nunca el mismo dorsal. Al asignar a un jugador un dorsal que ya tiene un compañero, el compañero DEBE quedarse sin dorsal y aparecer señalado como "sin dorsal" hasta que se le asigne uno nuevo.
- **FR-038**: Si al empezar un partido un jugador convocado (titular o suplente) no tiene dorsal, el sistema DEBE asignarle automáticamente el número libre más bajo del 1 al 24 (o, si están todos ocupados, el más bajo a partir del 25) y avisar al participante. Los jugadores no convocados PUEDEN seguir sin dorsal.

#### Máximos goleadores y asistentes

- **FR-039**: Cada torneo DEBE tener dos tablas, "Máximos goleadores" y "Máximos asistentes", accesibles para todos sus participantes desde la pantalla del torneo, junto a la clasificación o al cuadro.
- **FR-040**: Cada fila DEBE mostrar la posición en la tabla, el jugador (nombre y dorsal), su equipo, el total de goles o de asistencias y los partidos jugados en el torneo. La tabla DEBE incluir a todos los jugadores con al menos un gol (o una asistencia). Por defecto se muestran los 10 primeros y se puede desplegar el resto.
- **FR-041**: Las tablas DEBEN acumular los goles y asistencias de todos los partidos disputados en el torneo, incluidas la prórroga y todas las fases y mesas del torneo, y DEBEN actualizarse al terminar cada partido. Los goles en propia puerta y los lanzamientos de una tanda de penaltis NO DEBEN contar.
- **FR-042**: El orden DEBE ser: más goles (o asistencias), después menos partidos jugados y, por último, nombre en orden alfabético.

### Requisitos de la spec 001 afectados

Al cerrar esta spec DEBEN actualizarse en la 001:

- **001/FR-027 y la Assumption "Penalización por posición"**: se sustituyen por FR-031 a FR-033.
- **001/FR-049**: las velocidades pasan a ser x2, x4 y x8, con partidos de 4, 2 y 1 minuto (FR-025). Desaparece la regla de la velocidad mínima común entre dos humanos.
- **001/FR-031a**: los dorsales aleatorios iniciales quedan entre 1 y 24 (FR-035), y se añaden la reasignación con pérdida de dorsal (FR-037) y la asignación automática al empezar un partido (FR-038).
- **001/FR-025, FR-034 y la Assumption "Ofensividad de cada formación"**: las formaciones pasan a ser colocaciones de partida, y la ofensividad se calcula a partir de la colocación real (FR-034 y FR-034b).
- **001/FR-001, FR-046, FR-056, FR-056a, FR-056b y la Assumption "Partidos entre humanos"**: desaparece el ritmo "en directo" para los partidos entre humanos y el «Seguir» de ambos en el descanso. Los torneos son siempre asíncronos (FR-030), y en un torneo con un solo humano no hay plazos.
- **001, Edge Case "Desconexión de un humano durante un partido"** (incluida la espera de 10 s del reloj de reproducción): deja de aplicarse, porque no hay partidos síncronos entre humanos.
- **001/SC-005**: se recalibra con las nuevas penalizaciones (SC-011).
- **Descuento** (regla del motor de la spec 001): el descuento de cada parte reglamentaria pasa a estar entre 1 y 3 minutos (antes, hasta 6) (FR-025).
- **SC estadísticos de la 001** (goles por partido, ventaja de la estrategia, orden de los NPC, lesiones y equivalencia entre modalidades, 001/SC-004, SC-006, SC-007, SC-008, SC-010 y SC-015): siguen vigentes con el motor nuevo, aunque el número de acciones por partido baje mucho. Se vuelven a comprobar con `balance` antes de cerrar la US3.

### Key Entities *(include if feature involves data)*

- **Carta (presentación)**: representación visual de un jugador. Imagen (genérica en el MVP), nombre, media, posiciones, demarcación, stats, virtudes y acabado según el nivel.
- **Regla de penalización por posición**: demarcación (o rol MCO/MD) de origen, demarcación o posición de destino, y porcentaje de penalización.
- **Zona del campo**: área del campo de la pantalla de tácticas asociada a un código de posición; determina la posición efectiva de un titular colocado en ella.
- **Colocación del titular**: punto del campo en el que el participante coloca a cada titular, con su posición efectiva resultante. Forma parte de la alineación.
- **Dorsal**: número de 1 a 99, único dentro de la plantilla. Un jugador puede estar "sin dorsal" de forma temporal.
- **Formación personalizada**: colocación de los 11 titulares que no coincide con ninguna de las diez formaciones. Tiene su reparto por líneas y su ofensividad calculada.
- **Visionado de partido**: registro de si un participante humano ya ha visto (o ha decidido ver el resultado de) cada uno de sus partidos, para no revelarle el resultado antes de tiempo.
- **Partido asíncrono entre humanos**: partido resuelto una sola vez con las alineaciones de ambos en el momento de la resolución y decisiones automáticas para los dos equipos. Registra quién lo abrió primero o si se resolvió al vencer el plazo.
- **Estadísticas de jugador en el torneo**: goles, asistencias y partidos jugados de cada jugador en un torneo, a partir de los eventos de sus partidos.
- **Preferencias del usuario**: sonido activado o silenciado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En una prueba con al menos 5 personas, al menos el 80 % identifica en 3 segundos o menos, solo mirando una carta, su nombre, su media, sus posiciones y su nivel.
- **SC-002**: El 100 % de las cartas de la colección Core muestran toda su información sin desplazamiento interno ni ampliación, en escritorio y en un móvil de 360 px de ancho.
- **SC-003**: En una partida de 1 humano contra NPC, desde que el participante pulsa un botón de avanzar hasta que aparece la siguiente pantalla pasa menos de 1 segundo en el 95 % de los casos, y en ningún momento hay que esperar a que venza un temporizador.
- **SC-004**: Un draft de 1 humano y 7 NPC en el que el humano elige al instante se completa en menos de 5 minutos, incluidas las animaciones de apertura si están activas.
- **SC-005**: A velocidad fija, la duración real de cada minuto de juego en 2D varía como máximo un ±10 % respecto a la media del partido, sin contar las pausas anunciadas. Se comprueba con una prueba automática que registra el reloj de juego durante la reproducción a x2, x4 y x8 (a x8 un minuto dura menos de 1 s y no se puede cronometrar a mano).
- **SC-006**: Un partido completo, incluido el descuento, dura 4 minutos a x2, 2 minutos a x4 y 1 minuto a x8, y cada parte la mitad, con un margen de ±5 % y sin contar las pausas anunciadas. Se comprueba con la misma prueba automática que SC-005.
- **SC-007**: En partidos 2D entre equipos equilibrados (media de equipo con una diferencia de ±2 como máximo) y con la táctica por defecto, las estadísticas muestran de media, entre los dos equipos:
  - al menos 150 pases completados, 10 centros y 15 tiros;
  - al menos 30 conducciones, 3 paredes, 5 cambios de orientación y 3 contraataques;
  - al menos el 30 % de las posesiones (FR-024) con 3 o más pases seguidos.
- **SC-007a**: En la revisión visual de 3 partidos completos a x2, no aparece ningún caso de jugador que se teletransporte, tiemble o atraviese a otro, ni de balón que se mueva sin una acción que lo explique. En el 100 % de las fases defensivas observadas, como mucho dos jugadores del mismo equipo van a la vez al balón, salvo en una presión coordinada. Además, la prueba automática de cinemática del motor (velocidades y aceleraciones máximas, separación, balón solo dentro de una acción y número de presionadores) pasa en 50 partidos con semilla.
- **SC-008**: En series de 1.000 partidos, un equipo cuyos centrocampistas titulares tienen 10 puntos más en el stat de pase completa al menos un 10 % más de pases (en número absoluto) que el mismo equipo sin esa mejora.
- **SC-009**: En una prueba con al menos 5 personas, cada una ve 2 minutos de la versión anterior (etiqueta git en el commit `95d9962`, el merge de la spec 001) y 2 minutos de la nueva, y puntúa de 1 a 5 si la nueva "parece un partido de fútbol". Al menos el 80 % la puntúa con 4 o más.
- **SC-010**: Tras pulsar «Finalizar partido», con el servidor bajo la carga de la beta (100 partidas simultáneas), el resultado final aparece en menos de 3 segundos en el 95 % de los casos. En el 100 % de las comparaciones con la misma semilla y las mismas decisiones, coincide con el de ver el partido hasta el final sin tomar más decisiones después del corte.
- **SC-011**: En series de 1.000 partidos, un equipo con los 11 titulares en posiciones naturales gana al menos el 60 % de los partidos contra el mismo equipo con 3 titulares en una demarcación con −40 % de penalización. Contra el mismo equipo con 3 titulares penalizados dentro de su demarcación (−10 %), la diferencia de goles media sigue favoreciendo al equipo natural. Sustituye a 001/SC-005.
- **SC-012**: En el 100 % de las combinaciones de demarcación de origen y posición de destino, la penalización mostrada en la pantalla de alineación coincide con FR-031 y FR-032.
- **SC-013**: Desde cualquier pantalla, el participante llega al menú principal con 2 clics o menos. El modal de confirmación aparece en el 100 % de las navegaciones que sacan de un draft en curso con otros humanos y en ninguna de las demás.
- **SC-014**: El 100 % de las plantillas recién formadas tienen los dorsales del 1 al 24, cada uno una sola vez, y en ningún momento hay dos jugadores de una misma plantilla con el mismo dorsal.
- **SC-015**: En el 100 % de los torneos comprobados, los goles y asistencias de cada jugador en las tablas coinciden con la suma de los resúmenes de sus partidos, y las tablas están actualizadas al mostrarse el resultado de cada partido.
- **SC-016**: Al arrastrar un jugador a otra zona en la pantalla de tácticas, su posición efectiva y su penalización se actualizan en menos de 1 segundo.
- **SC-017**: La animación de apertura aparece exactamente 3 veces por draft y participante, dura 6 segundos o menos, se puede saltar con un clic y no reduce el tiempo disponible para elegir. *[Actualizado por la [spec 003](../003-mejoras-ux-simulacion/spec.md): 8 segundos o menos (003/FR-013).]*
- **SC-018**: En series de 1.000 partidos contra el mismo rival, una colocación personalizada con un delantero más y un defensa menos que la formación de partida marca y recibe más goles de media que esa formación.
- **SC-019**: En un torneo de prueba con 2 o más humanos, ningún humano tiene que esperar a que otro esté conectado para jugar o ver un partido. En el 100 % de los partidos entre humanos, ambos ven el mismo resultado y los mismos eventos. El 100 % de los torneos terminan en un máximo de (número de jornadas × plazo de jornada).

## Assumptions

- **Imagen de la carta**: en esta fase todas las cartas usan el mismo icono genérico de personaje (como mucho, una variante por demarcación). Las imágenes propias de cada jugador quedan para una fase de diseño visual.
- **Varias posiciones con penalizaciones distintas**: se calcula la penalización con cada una de las posiciones del jugador como origen y se aplica la más baja. Así, un MED con posiciones MC y MD que juega de DEL recibe −20 % (por MC), y solo un MD puro recibe −30 %.
- **Alcance de la penalización**: igual que en la spec 001, el porcentaje se aplica a los seis stats del jugador. Los valores de la tabla son reglas confirmadas por el usuario; el equilibrado posterior solo puede cambiarlos con una actualización de esta spec.
- **Duración del partido 2D**: las duraciones de 4, 2 y 1 minuto son decisión del usuario. El reloj de juego avanza mucho más rápido que el tiempo real (a x2, unas 23 veces más), así que la 2D muestra un partido condensado. Las velocidades de jugadores y balón se definen en tiempo visual a x2 (FR-025), y el número de acciones visibles se ajusta a la duración. El motor deberá generar las jugadas con esa densidad, sin que el partido parezca acelerado ni a cámara lenta.
- **Densidad frente a estadística**: si la densidad visual de acciones choca con los SC estadísticos (SC-007, SC-008, SC-011, SC-018 y los de la spec 001), mandan los SC estadísticos (Principio I), y las velocidades visuales se ajustan dentro de los límites de FR-025.
- **Partidos con parámetros 1.x**: los partidos en juego se terminan con la versión anterior antes de desplegar. Después, los partidos antiguos solo muestran su resumen guardado, sin reproducción 2D.
- **Velocidades**: desaparecen la velocidad Normal (x1), x16 y x32. Para ir más rápido que x8 está «Finalizar partido».
- **Decisiones automáticas en partidos entre humanos**: se usa la misma lógica de decisión de los NPC, con un nivel común para ambos equipos (por defecto, avanzado). El nivel exacto se fija en la planificación.
- **Fuera de alcance**: la versión elaborada de la animación de apertura (3D, partículas, música) y las imágenes reales de los jugadores quedan para una fase de diseño visual.
- **Abandono confirmado**: es definitivo para esa partida. El NPC que ocupa la plaza es de nivel intermedio, como en los abandonos de la spec 001.
- **Pausa de partidas en solitario**: como no hay otros humanos, detener los temporizadores al salir no afecta a la integridad competitiva.
- **Rango de dorsales manuales**: se mantiene el límite de 1 a 99 de la spec 001.
- **Sonido**: los efectos de sonido serán de uso libre o con licencia adecuada. La aplicación respeta las restricciones de los navegadores, que solo permiten reproducir sonido tras una interacción del usuario.
- **Asistencias**: se usan las que registra el motor en los eventos de gol (001/FR-044). Un gol de penalti o de falta directa no tiene asistente.
- **Partidos jugados**: cuentan para un jugador los partidos en los que ha estado en el campo, como titular o como suplente que entra.
- **Alcance**: no cambian las reglas del draft, la composición de los sobres, los niveles de NPC ni los modos de juego de la spec 001. El ritmo de los torneos pasa a ser siempre asíncrono (FR-030). El cambio es coherente con la constitución, que exige un draft simultáneo pero no partidos síncronos.
