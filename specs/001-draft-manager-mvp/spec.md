# Feature Specification: Fútboosterdraft MVP — Draft, equipo, simulación y torneos

**Feature Branch**: `001-draft-manager-mvp`

**Created**: 2026-10-15

**Status**: Draft

**Input**: User description: "Booster draft de tres sobres de ocho cartas con selección simultánea; modelo de jugadores (demarcación, posiciones, stats, virtudes, niveles, colecciones); formaciones y opciones tácticas; simulación rápida y simulación 2D; modos de juego liga, playoff y mixto; algoritmo de simulación complejo; jugadores NPC con cuatro niveles de IA."

## Clarifications

### Session 2026-10-15

- Q: Durante el torneo, ¿qué información puede ver cada participante sobre la plantilla y la alineación de sus rivales? → A: Tras el draft se ven las 24 cartas de cada rival; la alineación y la táctica del rival se revelan al empezar el partido.
- Q: ¿Un playoff solo admite 4, 8 o 16 participantes, o cualquier número entre 4 y 16, con equipos que pasan directamente de ronda? → A: Solo 4, 8 o 16 participantes; los huecos se rellenan con NPC.
- Q: ¿Hace falta registrarse para jugar, o se puede entrar como invitado sin cuenta? → A: Invitado permitido solo en partidas en directo contra NPC; cuenta obligatoria para jugar con otros humanos y en torneos asíncronos.
- Q: ¿Para cuántas partidas simultáneas debe estar preparado el MVP en su lanzamiento? → A: Beta: hasta 100 partidas simultáneas (unos 800 participantes conectados).
- Q: ¿Quién decide qué jugador lanza los penaltis, las faltas directas y los córners: el participante o el sistema? → A: Automático por defecto, pero el participante puede designar en la alineación al lanzador de penaltis, de faltas y de córners, y el orden de la tanda; si el designado no está en el campo, lanza el siguiente mejor.
- Q: ¿Cómo se asignan los dorsales y los colores de cada equipo? → A: Al elegir el once tras el draft, los dorsales se asignan automáticamente según la posición (1 POR, 2 LD, 3 LI, 4 central derecho, 5 central izquierdo, 6 MD, 8 MC/MII/MID, 10 MCO, 7 EI, 9 DC, 11 ED); el resto recibe un dorsal aleatorio. Cada equipo recibe colores aleatorios para la primera y la segunda equipación. El participante puede personalizar dorsales y colores.
- Q: ¿Cómo debe afectar la formación al resultado? → A: Debe cambiar el comportamiento de los jugadores y el algoritmo: una formación ofensiva (p. ej. 3-4-3) hace más probable marcar y también recibir goles; una defensiva (p. ej. 5-4-1) hace menos probable tanto marcar como recibir.
- Q: ¿Cuándo se activa la virtud Santo? → A: En los últimos 10 minutos (minuto 80 en adelante), durante toda la prórroga, y en eliminatorias mientras su equipo va ganando o empatando (el rival necesita remontar). "Partido señalado" = eliminatoria.
- Q: ¿Cuándo se pierde una partida de invitado? → A: Al cerrar la sesión o tras 10 minutos seguidos sin conexión; antes de eso puede volver y seguir donde lo dejó.
- Q: ¿Llevan tildes los identificadores y valores en el código? → A: No. El código y los datos no usan tildes (p. ej. el nivel es `Epico`); las tildes solo aparecen en los textos que se muestran en la interfaz ("Épico").

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Draftear una plantilla de 24 jugadores (Priority: P1)

Un participante entra en una sala de draft junto a otros participantes (humanos o NPC). Recibe un sobre de ocho cartas, elige una y el resto del sobre pasa a su izquierda; a continuación recibe el sobre que le llega y repite el proceso hasta agotar las cartas. Se repite con un segundo sobre que circula hacia la derecha y un tercero que circula hacia la izquierda. Al terminar tiene exactamente 24 jugadores en su plantilla.

**Why this priority**: El draft es el núcleo de la experiencia (Principio II de la constitución). Sin draft no existe plantilla, y sin plantilla no hay nada más que jugar.

**Independent Test**: Se puede probar por completo creando una sala con 1 humano y NPC, completando los tres sobres y comprobando que cada participante termina con 24 jugadores distintos, que cada carta acabó en una sola plantilla y que la dirección de circulación de cada sobre fue la correcta.

**Acceptance Scenarios**:

1. **Given** una sala de draft de N participantes (4 ≤ N ≤ 8) recién iniciada, **When** empieza el primer sobre, **Then** cada participante ve un sobre propio de 8 cartas y el temporizador del turno.
2. **Given** un turno en curso, **When** un participante confirma su elección, **Then** no ve las elecciones de los demás ni recibe el siguiente sobre hasta que todos han elegido (o ha vencido el tiempo) en ese turno.
3. **Given** que todos han elegido en un turno del primer o del tercer sobre, **When** se resuelve el turno, **Then** cada participante recibe el sobre que tenía el participante situado a su derecha (los sobres se pasan hacia la izquierda).
4. **Given** que todos han elegido en un turno del segundo sobre, **When** se resuelve el turno, **Then** cada participante recibe el sobre que tenía el participante situado a su izquierda (los sobres se pasan hacia la derecha).
5. **Given** un participante que no elige antes de que venza el tiempo del turno, **When** el turno expira, **Then** el sistema elige por él automáticamente una carta del sobre y el draft continúa sin bloquearse.
6. **Given** que se han agotado los tres sobres, **When** termina el draft, **Then** cada participante tiene exactamente 24 jugadores (8 de cada sobre) y puede verlos todos con su ficha completa.

---

### User Story 2 - Preparar el equipo: once, posiciones, formación y táctica (Priority: P1)

Con su plantilla de 24 jugadores, el participante elige una de las diez formaciones, coloca a once titulares en las casillas de la formación, designa suplentes y configura las opciones tácticas. El sistema le avisa claramente cuando coloca a un jugador fuera de sus posiciones naturales y le muestra el impacto en sus valores.

**Why this priority**: Es la segunda pieza del ciclo central del juego (draft → alineación → partido) y es donde se materializan las decisiones estratégicas.

**Independent Test**: Con una plantilla de 24 jugadores generada, se puede probar eligiendo cada formación, rellenando las casillas, activando combinaciones tácticas y comprobando que la alineación se acepta o rechaza según las reglas, y que las penalizaciones por posición se muestran correctamente.

**Acceptance Scenarios**:

1. **Given** una plantilla de 24 jugadores, **When** el participante elige la formación 4-3-3, **Then** se le muestran las 11 casillas de esa formación, cada una con su código de posición.
2. **Given** una casilla de posición "LD", **When** el participante coloca a un jugador cuyas posiciones no incluyen "LD", **Then** el sistema marca la casilla como "fuera de posición" y muestra sus stats y su media penalizadas.
3. **Given** un centrocampista con la virtud "Todocampista", **When** se coloca en cualquier casilla que no sea de portero, **Then** no recibe penalización por posición.
4. **Given** la opción "Marcaje individual" activada, **When** el participante selecciona "Defensa en zona", **Then** "Marcaje individual" se desactiva automáticamente (opciones excluyentes).
5. **Given** un equipo con 11 titulares, formación y táctica válidas, **When** el participante confirma, **Then** la alineación queda guardada para el siguiente partido.
6. **Given** una alineación con el titular que tiene "Lanzador de penalties", **When** el participante abre la pantalla de lanzadores, **Then** ese jugador aparece propuesto como lanzador de penaltis, y el participante puede cambiarlo por otro titular.
7. **Given** que el participante no confirma alineación antes de que empiece el partido, **When** llega la hora de jugar, **Then** el sistema utiliza su última alineación válida o, si no existe, una alineación automática.

---

### User Story 3 - Jugar un partido en simulación rápida (Priority: P1)

*[Actualizado por la [spec 003](../003-mejoras-ux-simulacion/spec.md): el modo (rápida o 2D) se elige al abrir cada partido, no al crear la partida (003/FR-032).]*

Dos equipos se enfrentan. En simulación rápida, el participante ve al instante el resultado al descanso y un resumen de las acciones relevantes de la primera parte (goles, tarjetas, ocasiones, lesiones). Puede hacer sustituciones y cambios tácticos y, cuando ambos rivales pulsan "Seguir", ve el resultado final con el resumen ampliado de la segunda parte, y de la prórroga y los penaltis si los hay.

**Why this priority**: Cierra el ciclo central del juego (Principio X). Es la modalidad más barata de visualizar y permite validar el motor de simulación.

**Independent Test**: Se puede probar enfrentando dos equipos preparados y comprobando que se muestran el descanso, los eventos relevantes, que los cambios realizados en el descanso afectan a la segunda parte y que se muestra el resultado final.

**Acceptance Scenarios**:

1. **Given** dos equipos con alineación válida y la modalidad "Simulación rápida", **When** empieza el partido, **Then** el participante ve inmediatamente el marcador al descanso y la lista de eventos relevantes con su minuto.
2. **Given** la pantalla de descanso, **When** el participante realiza una sustitución y cambia la formación, **Then** esos cambios se aplican a la simulación de la segunda parte.
3. **Given** un partido entre dos humanos en el descanso, **When** solo uno ha pulsado "Seguir", **Then** el partido no avanza hasta que el otro pulse "Seguir" o venza el tiempo de descanso.
4. **Given** un partido de eliminatoria empatado al final de los 90 minutos, **When** termina la segunda parte, **Then** se juega una prórroga (con su propio punto de decisión) y, si persiste el empate, una tanda de penaltis cuyo resultado se muestra lanzamiento a lanzamiento en el resumen.
5. **Given** un partido de liga empatado al final de los 90 minutos, **When** termina, **Then** el resultado final es empate sin prórroga ni penaltis.

---

### User Story 4 - Competir en un torneo: liga, playoff o mixto (Priority: P2)

*[Actualizado por la [spec 003](../003-mejoras-ux-simulacion/spec.md): en el escenario 4, el PRO toma alguna decisión dudosa (003/FR-037b); los niveles bajos cometen errores creíbles (003/FR-037).]*

El anfitrión crea una partida eligiendo modo de juego (liga, playoff o mixto), número de participantes, tipo de simulación y, opcionalmente, la cantidad y nivel de NPC. Tras el draft, los participantes juegan todas las jornadas del torneo y consultan clasificación, calendario y cuadro eliminatorio hasta conocer al campeón.

**Why this priority**: Aporta el contexto competitivo y la rejugabilidad, pero depende de que draft, alineación y partido funcionen.

**Independent Test**: Se puede probar creando una liga de 4 participantes (1 humano + 3 NPC), jugando sus 12 partidos y comprobando la clasificación final, y un playoff de 4 comprobando semifinales y final.

**Acceptance Scenarios**:

1. **Given** una liga de 4 participantes, **When** se genera el calendario, **Then** cada participante juega 6 partidos (ida y vuelta contra cada rival), 12 partidos en total.
2. **Given** una liga de 8 participantes, **When** se genera el calendario, **Then** cada participante juega 14 partidos, 56 en total.
3. **Given** un playoff de 4 participantes, **When** se completa el draft, **Then** se generan dos semifinales y una final a partido único.
4. **Given** un playoff de 16 participantes, **When** se crea la partida, **Then** se celebran dos drafts separados de 8 participantes y después octavos, cuartos, semifinales y final con los 16 equipos.
5. **Given** un torneo mixto de 8 participantes, **When** termina la liga, **Then** se juegan las semifinales 1.º contra 4.º y 2.º contra 3.º, y la final entre los ganadores.
6. **Given** una jornada de liga terminada, **When** el participante abre la clasificación, **Then** ve puntos, partidos jugados, ganados, empatados, perdidos, goles a favor, goles en contra y diferencia de goles de cada equipo.
7. **Given** un jugador expulsado con roja en la jornada 3, **When** el participante prepara la jornada 4, **Then** el jugador aparece como sancionado y no se puede alinear; en la jornada 5 vuelve a estar disponible.
8. **Given** un jugador con lesión grave (3 partidos) en la jornada 2, **When** el participante prepara las jornadas 3, 4 y 5, **Then** el jugador aparece como lesionado con los partidos restantes de baja y no se puede alinear; en la jornada 6 vuelve a estar disponible.
9. **Given** un jugador de liga con 2 amarillas acumuladas, **When** ve una tercera amarilla en la jornada 7, **Then** queda sancionado para la jornada 8, su contador vuelve a 0 y en la jornada 9 está disponible.
10. **Given** una partida creada con ritmo asíncrono y plazo de 24 h, **When** se abre una jornada y un partido entre dos humanos no se juega antes del plazo, **Then** el sistema lo simula automáticamente con sus últimas alineaciones válidas y abre la jornada siguiente cuando terminan todos los partidos.
11. **Given** una partida creada con ritmo en directo, **When** termina una jornada, **Then** la siguiente empieza tras el tiempo de preparación del equipo, sin esperar a ningún plazo.

---

### User Story 5 - Rellenar la partida con NPC (Priority: P2)

Si no se encuentran suficientes participantes humanos en un tiempo de búsqueda razonable, o si el anfitrión lo decide, las plazas libres se ocupan con NPC que draftean, preparan su equipo y juegan de forma autónoma. Los NPC añadidos automáticamente son de nivel amateur, intermedio o avanzado al azar; el nivel PRO solo lo puede elegir el anfitrión de forma explícita.

**Why this priority**: Garantiza que siempre se pueda jugar, incluso en solitario, y permite probar el resto del sistema sin depender de varios humanos.

**Independent Test**: Se puede probar creando una partida con 1 humano y 7 NPC, completando el draft y el torneo, y verificando que los NPC eligen siempre a tiempo, que alinean equipos válidos y que su nivel coincide con lo configurado.

**Acceptance Scenarios**:

1. **Given** una sala en búsqueda de participantes, **When** vence el tiempo de búsqueda sin completar las plazas, **Then** las plazas libres se rellenan con NPC de nivel amateur, intermedio o avanzado elegido al azar.
2. **Given** el anfitrión configurando la partida, **When** añade manualmente un NPC, **Then** puede elegir cualquiera de los cuatro niveles, incluido PRO.
3. **Given** un relleno automático de plazas, **When** se asignan niveles a los NPC, **Then** ninguno es de nivel PRO.
4. **Given** un NPC de nivel PRO, **When** dispone de varias cartas en un turno de draft o prepara su alineación y táctica, **Then** siempre toma la opción que el sistema evalúa como mejor para su equipo.
5. **Given** un NPC en cualquier nivel, **When** prepara su equipo, **Then** su alineación siempre es válida (11 titulares, un portero en la portería y formación permitida).

---

### User Story 6 - Ver el partido en simulación 2D ("vista de chapas") (Priority: P3)

En lugar del resumen, el participante ve el campo desde arriba con los jugadores representados por círculos de colores con dorsal y nombre, y el balón moviéndose. El partido avanza en tiempo de juego a la velocidad que el usuario elija (x2, x4, x8, x16 o x32). Puede pedir sustituciones o cambios tácticos en cualquier momento; se aplican en la siguiente interrupción del juego.

**Why this priority**: Aporta espectáculo e inmersión, pero no es imprescindible para validar el ciclo central; reutiliza el mismo motor que la simulación rápida (Principio V).

**Independent Test**: Se puede probar reproduciendo un partido en 2D, cambiando la velocidad, pidiendo una sustitución en juego y comprobando que se aplica en la siguiente interrupción y que el resultado coincide con el que produciría la simulación rápida en las mismas condiciones.

**Acceptance Scenarios**:

1. **Given** un partido en modalidad 2D, **When** comienza, **Then** el participante ve el campo, los 22 jugadores identificados por color, dorsal y nombre, el balón, el marcador y el minuto.
2. **Given** un partido 2D en curso, **When** el usuario cambia la velocidad de x2 a x16, **Then** la reproducción se acelera sin alterar los acontecimientos del partido.
3. **Given** un partido 2D en curso con el balón en juego, **When** el participante pide una sustitución, **Then** la sustitución queda pendiente y se aplica en la siguiente interrupción (falta, fuera de banda, saque de puerta, córner, gol, descanso…).
4. **Given** las mismas alineaciones, tácticas, decisiones y la misma semilla de aleatoriedad, **When** el partido se juega en modalidad rápida y en modalidad 2D, **Then** ambos producen los mismos eventos y el mismo resultado.

---

### Edge Cases

- **Desconexión durante el draft**: el participante desconectado recibe elecciones automáticas al vencer cada turno; si se reconecta, retoma el draft en el turno en curso con todas sus elecciones previas conservadas.
- **Elección duplicada o tardía**: si llega una segunda confirmación para el mismo turno, o una confirmación después de vencido el tiempo, se ignora; solo cuenta la primera elección válida dentro del tiempo.
- **Elección de una carta que no está en el sobre del participante**: se rechaza y el participante puede volver a elegir dentro del tiempo restante.
- **Ningún portero en la plantilla**: el participante puede alinear a un jugador de campo en la portería, que sufre la penalización máxima por posición; el sistema le avisa antes de confirmar.
- **Equipo con menos de 7 jugadores**: por lesiones o expulsiones sin cambios disponibles, o por tener menos de 7 jugadores disponibles por bajas antes del partido. El equipo juega con los que tenga mientras sean al menos 7. Si baja de 7 en el campo, o no llega a 7 al empezar, pierde el partido 3-0, o se mantiene el resultado si era peor para él.
- **Desconexión de un humano durante un partido**: el partido nunca se detiene. Sus decisiones pendientes vencen por tiempo (en el descanso continúa sin cambios) y, al reconectar, recibe el estado completo del partido. En 2D, el servidor deja de esperar su reloj de reproducción tras 10 s de desconexión. *[Actualizado por la spec 002: deja de aplicarse, incluida la espera de 10 s del reloj de reproducción, porque ya no hay partidos síncronos entre humanos (002/FR-030).]*
- **Expulsión del portero sin portero en el banquillo o sin cambios**: un jugador de campo pasa a la portería con la penalización correspondiente.
- **Empate en la clasificación de liga**: se desempata por puntos, diferencia de goles, goles a favor, enfrentamientos directos y, finalmente, sorteo.
- **Abandono definitivo de un humano durante el torneo**: su plaza pasa a estar controlada por un NPC del nivel "intermedio" para que el torneo pueda terminar.
- **Ambos humanos ausentes en el descanso de un partido**: el partido continúa al vencer el tiempo de descanso sin cambios.
- **Sala con menos de 4 participantes al iniciar**: no se puede iniciar el draft hasta que se completen las plazas con humanos o NPC.
- **Opciones tácticas incompatibles marcadas a la vez**: la interfaz no lo permite, y el sistema rechaza cualquier configuración incompatible que llegue.
- **Demasiadas bajas para completar el once**: si un equipo tiene menos de 11 jugadores disponibles por lesiones y sanciones, juega con los disponibles (ver "Equipo con menos de 7 jugadores").
- **Última alineación con un jugador no disponible**: si la alineación guardada incluye a un lesionado o sancionado y el participante no la corrige a tiempo, el sistema lo sustituye automáticamente por el suplente disponible más adecuado para esa casilla.
- **Torneo asíncrono con un humano que nunca se conecta**: sus partidos se simulan automáticamente al vencer el plazo de cada jornada, y el torneo termina sin bloquearse.
- **Intento de ver la alineación del rival antes del partido**: el sistema no la muestra ni la envía; el participante solo ve la plantilla de 24 cartas y las bajas del rival.
- **Invitado que intenta crear una partida con plazas para humanos o con ritmo asíncrono**: el sistema le pide que se registre o inicie sesión; mientras tanto, solo puede crear partidas en directo con NPC.
- **Media de un jugador con decimales**: se muestra redondeada al entero más cercano, pero el cálculo interno conserva la precisión.

## Requirements *(mandatory)*

### Functional Requirements

#### Sala, partida y participantes

- **FR-000**: El sistema DEBE permitir jugar como invitado, sin cuenta, solo en partidas en directo en las que el invitado sea el único humano y el resto de participantes sean NPC. Para unirse a una partida con otros humanos, crearla o jugar un torneo asíncrono DEBE ser necesaria una cuenta registrada. Una partida de invitado pasa a "abandonada" si el invitado cierra la sesión o pasa 10 minutos seguidos sin ninguna conexión; antes de ese plazo puede reconectar y continuar donde lo dejó.
- **FR-001**: El sistema DEBE permitir a un usuario (registrado, o invitado según FR-000) crear una partida como anfitrión, eligiendo modo de juego (liga, playoff o mixto), número de participantes, tipo de simulación (rápida o 2D), ritmo del torneo (en directo o asíncrono) y la configuración de NPC. *[Actualizado por la spec 002: desaparece el ritmo «en directo» entre humanos; los torneos son siempre asíncronos y con un solo humano no hay plazos (002/FR-030).]* *[Actualizado por la [spec 003](../003-mejoras-ux-simulacion/spec.md): el anfitrión ya no elige el tipo de simulación; se elige en cada partido (003/FR-032, 003/FR-034).]*
- **FR-002**: El sistema DEBE permitir a otros usuarios unirse a una partida abierta hasta completar las plazas.
- **FR-003**: El sistema DEBE rellenar las plazas libres con NPC cuando venza el tiempo de búsqueda (por defecto, 3 minutos) o cuando el anfitrión lo solicite.
- **FR-004**: El tipo de simulación elegido al crear la partida DEBE aplicarse a todos los partidos de ese torneo.
- **FR-005**: El sistema DEBE asignar a cada participante un asiento fijo en la mesa de draft, de forma que "izquierda" y "derecha" estén definidas sin ambigüedad para todo el draft.

#### Draft

- **FR-006**: Cada mesa de draft DEBE tener entre 4 y 8 participantes; cada participante DEBE recibir 3 sobres de 8 cartas, abriéndose el siguiente sobre solo cuando se han agotado las cartas del anterior en toda la mesa.
- **FR-007**: En cada turno todos los participantes DEBEN elegir una carta de forma simultánea; ningún participante DEBE poder ver la elección de otro en ese turno, ni recibir el siguiente sobre, hasta que se resuelva el turno para toda la mesa.
- **FR-008**: Tras resolver cada turno, el sobre restante de cada participante DEBE pasar al participante de su izquierda en los sobres 1 y 3, y al de su derecha en el sobre 2.
- **FR-009**: Cada turno DEBE tener un límite de tiempo (por defecto, 45 segundos); al vencer, el sistema DEBE elegir automáticamente por el participante la carta de mayor media de su sobre.
- **FR-010**: El sistema DEBE validar en el servidor cada elección: que la carta pertenece al sobre que el participante tiene en ese turno, que es su única elección del turno y que llega dentro del tiempo.
- **FR-011**: Una misma carta de jugador NO DEBE aparecer más de una vez en la misma mesa de draft.
- **FR-012**: Al finalizar el draft, cada participante DEBE tener exactamente 24 jugadores, 8 de cada sobre.
- **FR-013**: Durante el draft, el participante DEBE poder consultar en todo momento la ficha completa de las cartas del sobre y los jugadores que ya ha elegido, agrupados por demarcación.
- **FR-014**: Cada sobre DEBE tener cupos fijos de demarcación y de nivel:
  - Demarcación: 1 carta "POR o DEF" (50 % de probabilidad de cada una), 2 DEF, 3 MED y 2 DEL. Así un sobre trae 0 o 1 portero, para no generar un exceso de porteros.
  - Nivel: 4 Superclase, 2 Épico, 1 Legendario y 1 carta "alta" que es Legendario (80 %) o GOAT (20 %).
  - El cruce entre demarcación y nivel dentro del sobre es aleatorio (cualquier demarcación puede ocupar la casilla alta), y el orden de las cartas en el sobre también.
- **FR-015**: El sistema DEBE generar los sobres solo con jugadores de las colecciones habilitadas para la partida; en el MVP solo existe la colección "Core".

#### Jugadores

- **FR-016**: Cada jugador DEBE tener: identificador, nombre, apellidos, nacionalidad, fecha de nacimiento, altura, demarcación, lista de posiciones, historia, stats, media, virtudes, nivel y colección.
- **FR-017**: La demarcación DEBE ser una de: POR (portero), DEF (defensa), MED (centrocampista), DEL (atacante).
- **FR-018**: Las posiciones válidas DEBEN ser: POR; LI, LD, DCI, DCD, CI, CD (defensas); MD, MC, MII, MID, MCO (centrocampistas); DC, SD, EI, ED (atacantes). Un jugador PUEDE tener varias posiciones.
- **FR-019**: Cada jugador DEBE tener exactamente seis stats, según su demarcación:
  - POR: agilidad (AGI), colocación (COL), distribución (DIS), aéreo (AER), defensa (DEF), liderazgo (LID).
  - DEF: velocidad (VEL), técnica (TEC), tackling (TAK), anticipación (ANT), marcaje (MAR), liderazgo (LID).
  - MED: velocidad (VEL), técnica (TEC), pase (PAS), posicionamiento (POS), visión (VIS), disparo (DIS).
  - DEL: velocidad (VEL), regate (REG), finalización (FIN), desmarque (DES), creatividad (CRE), agresividad (AGR).
- **FR-020**: Cada stat DEBE ser un valor entero entre 1 y 99, y la media DEBE ser el promedio aritmético de los seis stats del jugador.
- **FR-021**: El nivel DEBE limitar el número máximo de virtudes: Superclase hasta 1, Épico hasta 2, Legendario hasta 3, GOAT hasta 4.
- **FR-022**: Un jugador DEBE poder tener virtudes genéricas y virtudes de su demarcación (POR, DEF, MED o DEL). *[Actualizado por la [spec 005](../005-virtudes-defectos/spec.md): la lista de virtudes y defectos, con su ámbito, está en [virtudes y defectos](../../docs/juego/virtudes-y-defectos.md).]*
- **FR-023**: Un defensa que tenga entre sus posiciones CI o CD (carrilero) PUEDE tener además virtudes de centrocampista.
- **FR-024**: El sistema DEBE rechazar en la carga de datos cualquier jugador que incumpla las reglas de FR-016 a FR-023.

#### Formaciones, alineación y táctica

- **FR-025**: El participante DEBE poder elegir entre las formaciones 3-4-3, 4-3-3, 4-4-2 en cuadrado, 4-4-2 en diamante, 4-2-3-1, 3-5-2, 5-4-1, 5-3-2, 4-5-1 y 3-3-3-1, cada una con 11 casillas de posición definidas (ver tabla en Assumptions). *[Actualizado por la spec 002: las formaciones son colocaciones de partida; cada titular se puede colocar libremente y su posición efectiva es la de su zona (002/FR-034).]*
- **FR-025a**: En las formaciones con defensa de 3 o de 5, la casilla del central del medio ("central del medio") NO es una posición de jugador: ningún jugador la tiene en su lista de posiciones. Un jugador con DCI o DCD entre sus posiciones DEBE poder ocuparla sin penalización; cualquier otro jugador recibe la penalización normal por estar fuera de posición.
- **FR-026**: Una alineación válida DEBE tener 11 titulares distintos, uno por casilla, y hasta 7 suplentes elegidos entre los 13 jugadores restantes de la plantilla.
- **FR-027**: Un jugador colocado en una casilla cuya posición no figure en su lista de posiciones DEBE sufrir una penalización severa en sus stats; la penalización DEBE ser mayor para un jugador de campo en la portería o un portero fuera de ella. La virtud Todocampista anula la penalización salvo en la portería. *[Sustituido por la spec 002: penalización graduada por demarcación de origen y destino (002/FR-031 a FR-033).]*
- **FR-028**: El sistema DEBE mostrar en la pantalla de alineación, para cada titular, sus stats y su media efectivos en la casilla asignada, y señalar visualmente los jugadores fuera de posición.
- **FR-029**: El participante DEBE poder configurar las opciones tácticas agrupadas así (radio = excluyentes, casilla = combinable):
  - Sistema defensivo (radio, obligatorio): Defensa en zona (por defecto) | Marcaje individual.
  - Altura del bloque (radio): Catenaccio | Bloque medio (por defecto) | Presión alta.
  - Línea adelantada (casilla): no compatible con Catenaccio.
  - Estilo con balón (radio): Equilibrado (por defecto) | Contraataque | Juego combinativo.
  - Juego vertical (casilla): no compatible con Juego combinativo.
- **FR-029a**: La alineación DEBE incluir un lanzador de penaltis, uno de faltas directas, uno de córners y el orden de los 5 primeros lanzadores de una tanda de penaltis.
  - El sistema los DEBE proponer automáticamente: el titular con la virtud correspondiente (Lanzador de penalties, Lanzador de faltas, Guante en el pie) y, si no hay ninguno, el titular con mejor valor para esa acción.
  - El participante DEBE poder cambiarlos en la pantalla de alineación y en las ventanas de cambios del partido.
  - Si el designado no está en el campo (sustituido, expulsado o lesionado), lanza el siguiente mejor candidato según el mismo criterio. En una tanda de penaltis, los jugadores que no estaban en el campo al final del partido NO DEBEN lanzar.
- **FR-030**: El sistema DEBE rechazar configuraciones tácticas incompatibles y alineaciones inválidas, tanto desde la interfaz como en la validación del servidor.
- **FR-031**: Si un participante no confirma alineación a tiempo, el sistema DEBE usar su última alineación válida o, si no existe, generar una alineación automática que minimice las posiciones incorrectas.
- **FR-031a**: Al definir por primera vez el once (en el tiempo de preparación tras el draft, o al generarse la alineación automática), el sistema DEBE asignar automáticamente un dorsal a cada uno de los 24 jugadores de la plantilla: *[Actualizado por la spec 002: los dorsales iniciales van del 1 al 24 (002/FR-035); reasignar un dorsal deja sin dorsal a quien lo llevaba (002/FR-037) y al empezar un partido los convocados sin dorsal reciben el libre más bajo (002/FR-038).]* *[Actualizado por la [spec 003](../003-mejoras-ux-simulacion/spec.md): los dorsales iniciales se asignan al terminar el draft, según la alineación automática (003/FR-001b).]*
  - **Titulares**, según la casilla que ocupan: POR → 1, LD y CD (carrilero derecho) → 2, LI y CI (carrilero izquierdo) → 3, central derecho (DCD) → 4, central izquierdo (DCI) → 5, MD → 6, MC/MII/MID → 8, MCO → 10, EI → 7, DC → 9 y ED → 11.
  - Si dos casillas comparten dorsal fijo (p. ej. dos MC, o MII y MID), lo recibe la primera en el orden de la formación (de atrás adelante y de derecha a izquierda) y las demás reciben uno aleatorio.
  - **Resto de jugadores**, y titulares en casillas sin dorsal fijo (el central del medio de una defensa de 3 o 5, el SD): un dorsal aleatorio libre.
  - Los dorsales DEBEN ser únicos dentro de la plantilla y estar entre 1 y 99.
  - Quedan fijos para todo el torneo: cambiar después la alineación NO los reasigna.
  - El participante DEBE poder editarlos en cualquier momento fuera de un partido, respetando la unicidad.
- **FR-031b**: Al terminar el draft, el sistema DEBE asignar a cada participante colores aleatorios para su **primera** y su **segunda equipación** (cada una con un color principal y uno secundario), que el participante DEBE poder editar. En cada partido, el local usa la primera equipación. El visitante usa la primera salvo que se confunda con la del local, en cuyo caso usa la segunda. *[Actualizado por la [spec 003](../003-mejoras-ux-simulacion/spec.md): cada equipación tiene un diseño (lisa, rayas, franjas, banda o mitades) y de 1 a 3 colores; el parecido se mide con todos sus colores (003/FR-045 a FR-047).]*

#### Motor de simulación

- **FR-032**: Existirá un único motor de simulación; la simulación rápida y la 2D DEBEN usar el mismo motor y, con las mismas condiciones iniciales, decisiones y semilla, DEBEN producir los mismos eventos y el mismo resultado.
- **FR-033**: El motor DEBE simular el partido como una secuencia de acciones de juego (salida de balón, pase, conducción, regate, entrada, intercepción, centro, remate, parada, despeje, falta, tarjeta, fuera de juego, córner, falta directa, penalti, lesión, sustitución) cuyo éxito se resuelve enfrentando los stats relevantes de los jugadores implicados, modificados por virtudes, posición, formación, táctica, cansancio y contexto del partido.
- **FR-034**: La formación DEBE cambiar el comportamiento de los jugadores y el algoritmo de simulación, según su **ofensividad** (ver la tabla de Assumptions): *[Actualizado por la spec 002: la ofensividad y la amplitud se calculan a partir de la colocación real sobre la formación de partida (002/FR-034b).]*
  - Una formación más ofensiva (p. ej. 3-4-3) DEBE aumentar la probabilidad de **marcar y también de recibir** goles: más jugadores en ataque, más ocasiones propias y más espacios a la espalda.
  - Una formación más defensiva (p. ej. 5-4-1) DEBE reducir la probabilidad **tanto de marcar como de recibir**: bloque más ordenado y reactivo, menos ocasiones para ambos.
  - La formación también DEBE influir en la zona y el tipo de las acciones: por bandas o por dentro, juego directo o elaborado.
- **FR-035**: Cada opción táctica DEBE tener un efecto definido y comprobable en la simulación (frecuencia y zona de las acciones, probabilidad de recuperación, fueras de juego provocados, ritmo de cansancio, tipo de ataque).
- **FR-036**: A partir del minuto 65 los stats de cada jugador DEBEN degradarse leve y progresivamente por cansancio; con Presión alta la degradación DEBE empezar en el minuto 55. Las virtudes Incansable (para el propio jugador) y Motivador (para los compañeros en el campo) DEBEN ralentizar esa degradación.
- **FR-037**: Cada virtud DEBE aplicarse exactamente según su definición. *[Actualizado por la [spec 005](../005-virtudes-defectos/spec.md): el efecto exacto de cada virtud y defecto, su activación y su acumulación están en [virtudes y defectos](../../docs/juego/virtudes-y-defectos.md).]*
- **FR-038**: Varias virtudes del mismo tipo en el campo NO DEBEN acumular su bonificación de equipo más de una vez (p. ej. dos jugadores con Capitanía siguen dando +1).
- **FR-039**: El motor DEBE incorporar aleatoriedad controlada, de forma que el mejor equipo no gane siempre pero las diferencias de plantilla, posición y táctica sean determinantes en el conjunto de partidos (ver criterios de éxito SC-004 a SC-006).
- **FR-040**: Cada partido DEBE poder reproducirse a partir de sus condiciones iniciales, sus decisiones registradas y su semilla, para auditoría y pruebas.
- **FR-041**: Los partidos de eliminatoria empatados tras 90 minutos DEBEN ir a una prórroga de 2 × 15 minutos y, si persiste el empate, a penaltis (5 lanzamientos por equipo y muerte súbita); los partidos de liga pueden terminar en empate.
- **FR-042**: Cada equipo DEBE poder realizar hasta 5 sustituciones por partido (más 1 adicional si hay prórroga); un jugador sustituido no puede volver a entrar.
- **FR-043**: Las lesiones y tarjetas DEBEN tener consecuencias en los siguientes partidos del mismo torneo:
  - Una tarjeta roja (directa o por doble amarilla) DEBE suponer 1 partido de sanción.
  - Una lesión DEBE dejar al jugador de baja según su gravedad, que se informa al producirse: leve 1 partido, media 2, grave 3, y larga duración 5. La lesión de larga duración DEBE tener una probabilidad muy baja (por defecto, el 2 % de las lesiones).
  - En la liga (y en la fase de liga del modo mixto), las amarillas sueltas DEBEN acumularse entre partidos: al llegar a 3 amarillas acumuladas, el jugador cumple 1 partido de sanción y su contador vuelve a 0. Las dos amarillas que provocan una expulsión por doble amarilla no suman al contador. En los partidos de eliminatoria las amarillas no se acumulan.
  - Los jugadores sancionados o lesionados NO DEBEN poder alinearse, ni como titulares ni como suplentes, hasta cumplir su baja; el contador avanza con cada partido que juega su equipo.
  - En el modo mixto, las bajas pendientes al terminar la liga se trasladan a la fase eliminatoria. Todas las bajas desaparecen al terminar el torneo.
  - La virtud Robusto DEBE reducir tanto la probabilidad de lesión como su gravedad.

#### Simulación rápida

- **FR-044**: En simulación rápida, al empezar el partido el sistema DEBE mostrar inmediatamente el marcador al descanso y el resumen de eventos relevantes de la primera parte (goles con autor y asistente, tarjetas, ocasiones claras, lesiones), cada uno con su minuto.
- **FR-045**: En el descanso (y antes de la prórroga), el participante DEBE poder hacer sustituciones y cambios de formación y táctica, que se aplicarán al resto del partido. *[Actualizado por la [spec 003](../003-mejoras-ux-simulacion/spec.md): los cambios del descanso se hacen desde la pantalla con campo (003/FR-028).]*
- **FR-046**: En un partido entre dos humanos, la segunda parte (o la prórroga) NO DEBE empezar hasta que ambos pulsen "Seguir" o venza el tiempo de descanso (por defecto, 2 minutos). En un partido contra un NPC, empieza cuando el humano pulse "Seguir". *[Actualizado por la spec 002: no hay partidos síncronos entre humanos ni «Seguir» de ambos; en el descanso espera solo el único humano del partido (002/FR-012, FR-030).]*
- **FR-047**: Al terminar, el sistema DEBE mostrar el resumen completo del partido, incluidas prórroga y tanda de penaltis si las hubo, y estadísticas básicas (posesión, tiros, tiros a puerta, córners, faltas, tarjetas).

#### Simulación 2D

- **FR-048**: En simulación 2D, el sistema DEBE mostrar el campo, los jugadores como círculos con los colores de la equipación que use su equipo en ese partido, su dorsal y su nombre, el balón, el marcador y el minuto.
- **FR-049**: El usuario DEBE poder elegir entre las velocidades x2, x4, x8, x16 y x32 en cualquier momento, sin que cambie el desarrollo del partido. En un partido entre dos humanos, la reproducción DEBE avanzar a la menor de las velocidades elegidas por ambos. *[Actualizado por la spec 002: velocidades x2, x4 y x8, con partidos de 4, 2 y 1 minuto; desaparece la velocidad mínima común (002/FR-025).]*
- **FR-050**: El participante DEBE poder solicitar sustituciones y cambios tácticos en cualquier momento; el sistema DEBE aplicarlos en la siguiente interrupción del juego y notificar a ambos participantes cuándo se hacen efectivos. *[Actualizado por la [spec 003](../003-mejoras-ux-simulacion/spec.md): en la 2D, los cambios con el balón en juego se piden desde «Gestionar equipo», que pausa la reproducción; los selectores desaparecen (003/FR-031).]*

#### Torneos

- **FR-051**: Liga: entre 4 y 8 participantes, todos contra todos a ida y vuelta (2 × (N − 1) partidos por participante); 3 puntos por victoria, 1 por empate y 0 por derrota; desempate por diferencia de goles, goles a favor, enfrentamientos directos y sorteo.
- **FR-052**: Playoff: exactamente 4, 8 o 16 participantes, sin equipos que pasen ronda sin jugar; si faltan humanos para el tamaño elegido, las plazas libres se rellenan con NPC (FR-003). Eliminatorias a partido único. Con 16 participantes DEBEN celebrarse dos drafts separados de 8 y los emparejamientos de octavos DEBEN enfrentar a participantes de mesas distintas.
- **FR-053**: Mixto: exactamente 8 participantes; liga a ida y vuelta, y los cuatro primeros juegan semifinales (1.º contra 4.º, 2.º contra 3.º) y final a partido único.
- **FR-054**: El sistema DEBE mostrar en todo momento el calendario, los resultados, la clasificación (liga) o el cuadro (playoff) y, al final, el campeón.
- **FR-054a**: Visibilidad de la información entre participantes:
  - Durante el draft, cada participante solo DEBE ver su sobre actual y sus propias elecciones; NO DEBE ver las cartas elegidas por los demás.
  - Al terminar el draft, todos los participantes DEBEN poder consultar las 24 cartas de la plantilla de cada rival, junto con sus bajas (lesiones y sanciones) durante el torneo.
  - La alineación, la formación y la táctica de un rival NO DEBEN ser visibles antes de que empiece el partido. Se revelan al comenzar, y los cambios hechos durante el partido se ven cuando se aplican.
  - El servidor NO DEBE enviar a un participante información que todavía no le corresponde ver.
- **FR-055**: Los partidos entre dos NPC DEBEN resolverse sin intervención humana y sus resultados DEBEN estar disponibles al mismo tiempo que los del resto de la jornada.
- **FR-056**: Al crear la partida, el anfitrión DEBE elegir el ritmo del torneo: *[Actualizado por la spec 002: los torneos son siempre asíncronos (002/FR-030).]*
  - **En directo**: todas las jornadas se juegan seguidas en una única sesión. Cada jornada empieza cuando ha terminado la anterior y ha vencido el tiempo de preparación del equipo.
  - **Asíncrono**: cada jornada tiene un plazo (por defecto, 24 horas). Un partido entre dos humanos se juega en cuanto ambos están conectados y confirman que están listos. Un partido contra un NPC se juega cuando el humano lo inicia.
- **FR-056a**: En modo asíncrono, si vence el plazo de la jornada sin que se haya jugado un partido, el sistema DEBE simularlo automáticamente con las últimas alineaciones válidas, sin intervención en el descanso, y la jornada siguiente DEBE abrirse al terminar todos los partidos de la anterior. *[Actualizado por la spec 002: se resuelve con `resolverResto` y decisiones automáticas; con un solo humano no hay plazos (002/FR-030, research R7).]*
- **FR-056b**: En modo asíncrono, el sistema DEBE notificar a cada participante cuándo se abre una jornada, cuándo su rival está listo para jugar y cuándo queda poco para que venza el plazo (por defecto, 2 horas antes). *[Actualizado por la spec 002: sin el aviso «rival listo» (no hay partidos síncronos entre humanos); se añade el aviso de dorsales asignados (002/FR-038).]*
- **FR-056c**: El draft se juega siempre en directo, sea cual sea el ritmo del torneo.

#### NPC

- **FR-057**: Los NPC DEBEN draftear, preparar alineación y táctica, hacer cambios y jugar sin intervención humana, respetando los mismos límites de tiempo y reglas que los humanos.
- **FR-058**: Existirán cuatro niveles de NPC —amateur, intermedio, avanzado y PRO— con calidad de decisión creciente en draft, alineación, táctica y cambios.
- **FR-059**: El relleno automático de plazas DEBE asignar al azar los niveles amateur, intermedio o avanzado; el nivel PRO solo DEBE estar disponible cuando el anfitrión lo selecciona explícitamente.
- **FR-060**: El NPC PRO DEBE elegir siempre la opción que el sistema evalúa como mejor en el draft (considerando las necesidades de su plantilla, no solo la media), en la alineación y en la táctica. *[Actualizado por la [spec 003](../003-mejoras-ux-simulacion/spec.md): el PRO apenas comete errores, pero toma una decisión dudosa por draft (003/FR-037b).]*

#### Integridad

- **FR-061**: Todas las operaciones competitivas (elecciones de draft, alineaciones, cambios tácticos, resolución de partidos y clasificaciones) DEBEN validarse y decidirse en el servidor; el cliente nunca decide resultados.
- **FR-062**: El sistema DEBE tratar de forma segura las solicitudes duplicadas, las desconexiones y las reconexiones en el draft, en la preparación del equipo y en los partidos, sin bloquear la partida ni alterar el estado competitivo.

### Key Entities *(include if feature involves data)*

- **Jugador (carta)**: un futbolista ficticio de una colección. Datos personales (nombre, apellidos, nacionalidad, fecha de nacimiento, altura, historia), demarcación, posiciones en las que rinde, seis stats según demarcación, media, nivel y virtudes.
- **Colección**: conjunto de jugadores que forma el pool de cartas; en el MVP solo "Core".
- **Virtud**: habilidad con nombre, ámbito (genérico o de una demarcación) y efecto definido en la simulación.
- **Partida**: lo que crea el anfitrión. Modo de juego, número de participantes, tipo de simulación, ritmo del torneo (en directo o asíncrono, con su plazo por jornada), configuración de NPC y estado (buscando participantes, en draft, en torneo, terminada).
- **Participante**: humano o NPC (con su nivel) que ocupa un asiento en una mesa de draft y compite en el torneo con una plantilla. Tiene una primera y una segunda equipación (colores principal y secundario de cada una).
- **Mesa de draft**: 4 a 8 participantes con asientos ordenados; contiene 3 rondas de sobres y su estado turno a turno.
- **Sobre**: 8 cartas asignadas inicialmente a un participante, con dirección de circulación según su ronda.
- **Elección**: carta tomada por un participante en un turno concreto, indicando si fue manual o automática.
- **Plantilla**: los 24 jugadores de un participante tras el draft, cada uno con su dorsal único (1–99).
- **Alineación**: formación, 11 titulares en sus casillas, suplentes, opciones tácticas, lanzadores designados (penaltis, faltas, córners) y orden de la tanda de penaltis.
- **Formación**: nombre y 11 casillas con su código de posición.
- **Partido**: dos participantes, alineaciones iniciales, semilla, decisiones tomadas durante el partido, eventos, estadísticas y resultado (incluidos prórroga y penaltis).
- **Evento de partido**: acción relevante con minuto, tipo, jugadores implicados y resultado.
- **Torneo**: modo, calendario, partidos, clasificación o cuadro y campeón.
- **Contador de amarillas**: amarillas acumuladas por cada jugador en la fase de liga de un torneo.
- **Jornada**: grupo de partidos del torneo que se juegan en el mismo turno; en ritmo asíncrono tiene fecha de apertura y plazo.
- **Baja**: indisponibilidad de un jugador de una plantilla dentro de un torneo. Motivo (sanción por roja, sanción por acumulación de amarillas o lesión con su gravedad), partido en que se produjo y partidos restantes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un draft completo de 8 participantes termina, con los tiempos por defecto, en 20 minutos o menos, y el 100 % de los participantes acaba con exactamente 24 jugadores sin cartas repetidas en la mesa.
- **SC-002**: En el 100 % de los turnos, los sobres llegan al vecino correcto según la ronda (izquierda, derecha, izquierda), comprobado en drafts de 4, 5, 6, 7 y 8 participantes.
- **SC-003**: Un usuario nuevo completa su primer draft y deja su alineación lista para jugar sin ayuda externa en menos de 30 minutos en al menos el 90 % de los casos.
- **SC-004**: En una serie de 1.000 partidos simulados entre equipos idénticos salvo en que uno tiene 5 puntos más de media en todos sus titulares, el equipo mejor gana al menos el 60 % de los partidos y el peor gana al menos el 10 % (la estrategia pesa, pero el fútbol mantiene su incertidumbre).
- **SC-005**: En una serie de 1.000 partidos, un equipo con los 11 titulares en posiciones naturales gana al menos el 65 % de los partidos contra el mismo equipo con 3 titulares fuera de posición. *[Sustituido por la spec 002: SC-011 con las penalizaciones graduadas.]*
- **SC-006**: En series de 1.000 partidos frente al mismo rival, cada opción táctica y cada formación produce una diferencia medible en al menos una estadística del partido (posesión, tiros, fueras de juego provocados, recuperaciones en campo rival o cansancio), **en la dirección esperada**:
  - La media de goles a favor **y** en contra crece con la ofensividad de la formación. 3-4-3 > 4-4-2 > 5-4-1 en ambos.
  - Presión alta produce más recuperaciones en campo rival y más cansancio que Bloque medio.
  - Catenaccio produce menos posesión en campo rival y menos goles en contra que Bloque medio.
  - Línea adelantada provoca más fueras de juego.
  - Contraataque produce menos posesión y Juego combinativo, más.
- **SC-007**: La media de goles por partido en series de 1.000 partidos entre equipos equilibrados se sitúa entre 2,0 y 3,5, y menos del 2 % de los partidos terminan con 8 o más goles en total. *[Actualizado por la [spec 003](../003-mejoras-ux-simulacion/spec.md): la media se estrecha a 2,6–3,4 goles como media de torneo o de serie (003/SC-001).]*
- **SC-008**: Con las mismas condiciones, decisiones y semilla, la simulación rápida y la 2D producen el mismo resultado y los mismos eventos en el 100 % de los casos comprobados.
- **SC-009**: En simulación rápida, el resultado del descanso aparece en menos de 3 segundos desde el inicio del partido y el resultado final en menos de 3 segundos tras pulsar "Seguir".
- **SC-010**: En un torneo completo, un NPC PRO termina por delante de un NPC amateur en al menos el 80 % de los torneos con la misma configuración, y un NPC avanzado por delante de uno amateur en al menos el 65 %.
- **SC-011**: El 100 % de los drafts y torneos con desconexiones simuladas de participantes llegan al final sin bloquearse.
- **SC-012**: Una liga de 4 genera 12 partidos (6 por participante), una de 8 genera 56 (14 por participante), un playoff de 16 genera 15 partidos y un mixto genera 59 partidos (56 de liga + 3 de eliminatoria).
- **SC-013**: El 100 % de los sobres generados contiene 8 cartas: 1 POR o DEF, 2 DEF, 3 MED y 2 DEL, y 4 Superclase, 2 Épico, 1 Legendario y 1 carta alta Legendario o GOAT. En 10.000 sobres generados, el hueco "POR o DEF" es POR en un 50 % ± 1 punto, y la carta alta es GOAT en un 20 % ± 1 punto.
- **SC-014**: En el 100 % de los partidos comprobados, ningún jugador sancionado o lesionado aparece en el once ni en el banquillo, y cada baja termina exactamente tras el número de partidos indicado.
- **SC-015**: En 1.000 partidos, los jugadores con Robusto sufren al menos un 30 % menos de lesiones que jugadores comparables sin esa virtud.
- **SC-016**: El 100 % de los torneos asíncronos de prueba, incluidos aquellos en los que algún humano no llega a conectarse, terminan en un máximo de (número de jornadas × plazo de jornada).
- **SC-017**: Con 100 partidas activas a la vez (unos 800 participantes conectados, mezcla de drafts en curso y jornadas de torneo):
  - En el 95 % de los turnos de draft, todos los participantes reciben el nuevo sobre en menos de 1 segundo desde la última elección.
  - Se sigue cumpliendo SC-009.
  - Los partidos de una jornada entre NPC tienen su resultado disponible en menos de 10 segundos desde que se abre la jornada.
  - Ninguna partida queda bloqueada o pierde estado.

## Assumptions

- **Descuento** *[añadido por la spec 002]*: el descuento de cada parte reglamentaria está entre 1 y 3 minutos (antes, hasta 6), para que el partido 2D dure siempre 4, 2 o 1 minuto (002/FR-025, research R2).

- **Plataforma y cuentas**: juego online en navegador. Las cuentas son obligatorias salvo en el modo invitado de FR-000; la gestión de cuentas (registro, inicio de sesión, recuperación) se resuelve con prácticas estándar y no se detalla en esta especificación.
- **Alcance del MVP**: solo existe la colección "Core"; la compra de colecciones, la monetización y la obtención de recursos jugando quedan fuera de este MVP (sin contradecir el Principio VII).
- **Tamaño de la colección Core**: una mesa de 8 participantes abre 24 sobres (192 cartas) y no puede repetir cartas.
  - **Demanda por mesa**: en el peor caso se necesitan hasta 24 POR, 72 DEF, 72 MED, 48 DEL, 96 Superclase, 48 Épico, 48 Legendario y 24 GOAT. En promedio, 12 POR, 60 DEF, 4,8 GOAT y 43,2 Legendario.
  - **Mínimo teórico**: 240 cartas. En el peor caso las cartas POR y GOAT del pool no se usan, por lo que hacen falta 192 cartas que no sean ni POR ni GOAT, más 24 POR y 24 GOAT aparte. Con un reparto equilibrado de niveles por demarcación sube a 243.
  - **Recomendado**: 300 cartas. Con un mínimo exacto, un reparto aleatorio de niveles entre demarcaciones se queda sin cartas de alguna combinación en una parte apreciable de las mesas: con 243 cartas falla el 41 %, y hace falta holgura. La distribución de abajo cubre todos los peores casos y no falló en ninguna de 100.000 mesas simuladas de 8:

    | Demarcación | Superclase | Épico | Legendario | GOAT | Total |
    |-------------|-----------:|------:|-----------:|-----:|------:|
    | POR | 14 | 8 | 7 | 3 | 32 |
    | DEF | 44 | 22 | 22 | 12 | 100 |
    | MED | 44 | 22 | 22 | 12 | 100 |
    | DEL | 30 | 15 | 15 | 8 | 68 |
    | **Total** | **132** | **67** | **66** | **35** | **300** |

  - Una mesa de 8 usa unas 192 de las 300 cartas, así que dos drafts seguidos no ven exactamente el mismo conjunto. Si se quiere más variedad entre partidas, el pool puede crecer manteniendo estas proporciones.
  - En un playoff de 16 cada mesa es independiente y puede repetir jugadores respecto a la otra.
- **Asientos**: se asignan al azar al empezar el draft y se mantienen durante los tres sobres.
- **Tiempos por defecto (ajustables en la configuración del juego)**: búsqueda de participantes 3 min; turno de draft 45 s; preparación de equipo antes de cada partido 3 min (5 min antes del primero); descanso 2 min.
- **Elección automática**: al vencer el turno se elige la carta de mayor media del sobre; si hay empate, la primera en el orden del sobre.
- **Escala de stats**: enteros de 1 a 99 (coherente con el umbral "regate +95" de Infranqueable). Un nivel PUEDE tener menos virtudes que su máximo (p. ej. un Superclase con 0 virtudes).
- **Penalización por posición** (valores iniciales sujetos a equilibrado): −25 % a todos los stats para un jugador de campo fuera de sus posiciones; −60 % para un jugador de campo en la portería o un portero fuera de ella. *[Sustituida por la spec 002: tabla de 002/FR-031 a FR-033.]*
- **Mapeo de casillas por formación** (la casilla "DCI/DCD" es el central del medio de una defensa de 3 o 5 y admite sin penalización a jugadores con DCI o DCD, ver FR-025a; en defensas de 4 se usan laterales LI/LD y en defensas de 3 o 5 carrileros CI/CD; las bandas de una línea de 4 o 5 medios las ocupan extremos EI/ED):

  | Formación | Casillas (además de POR) |
  |-----------|--------------------------|
  | 3-4-3 | DCI, DCI/DCD, DCD · CI, MC, MC, CD · EI, DC, ED |
  | 4-3-3 | LI, DCI, DCD, LD · MD, MII, MID · EI, DC, ED |
  | 4-4-2 en cuadrado | LI, DCI, DCD, LD · EI, MC, MC, ED · DC, SD |
  | 4-4-2 en diamante | LI, DCI, DCD, LD · MD, MII, MID, MCO · DC, SD |
  | 4-2-3-1 | LI, DCI, DCD, LD · MD, MC · EI, MCO, ED · DC |
  | 3-5-2 | DCI, DCI/DCD, DCD · CI, MII, MD, MID, CD · DC, SD |
  | 5-4-1 | CI, DCI, DCI/DCD, DCD, CD · EI, MC, MC, ED · DC |
  | 5-3-2 | CI, DCI, DCI/DCD, DCD, CD · MD, MII, MID · DC, SD |
  | 4-5-1 | LI, DCI, DCD, LD · EI, MII, MD, MID, ED · DC |
  | 3-3-3-1 | DCI, DCI/DCD, DCD · CI, MD, CD · EI, MCO, ED · DC |

- **Ofensividad de cada formación** (valores iniciales, ajustables en los parámetros de equilibrado; escala de −2, muy defensiva, a +2, muy ofensiva): *[Actualizada por la spec 002: es la de la formación de partida; con colocación libre se ajusta según 002/FR-034b.]*

  | Formación | 3-4-3 | 3-3-3-1 | 4-3-3 | 3-5-2 | 4-2-3-1 | 4-4-2 | 4-4-2 en diamante | 4-5-1 | 5-3-2 | 5-4-1 |
  |---|---|---|---|---|---|---|---|---|---|---|
  | Ofensividad | +2 | +2 | +1 | +1 | 0 | 0 | 0 | −1 | −1 | −2 |

- **Agrupación de opciones tácticas**: la agrupación en radios y casillas de FR-029 es una propuesta derivada de las descripciones; las opciones en sí son las indicadas por el usuario.
- **Formato de playoff**: la final también se juega a partido único. Los emparejamientos de la primera ronda se sortean, respetando en el playoff de 16 que los octavos enfrenten a participantes de mesas distintas.
- **Mixto**: requiere exactamente 8 participantes, según la descripción.
- **Partidos entre humanos**: el partido en sí se juega siempre de forma síncrona (ambos conectados). En el ritmo "en directo", si un humano no está presente, su equipo juega con su última alineación válida y los tiempos de decisión vencen automáticamente. En el ritmo "asíncrono", el partido espera hasta que ambos estén listos o venza el plazo de la jornada. *[Actualizado por la spec 002: se resuelven una sola vez, de forma asíncrona, y cada humano los ve cuando quiere sin que se le revele antes el resultado (002/FR-030, US11).]*
- **Valores del modo asíncrono** (ajustables): plazo de jornada 24 h; aviso 2 h antes de que venza.
- **Ritmo de las lesiones**: la gravedad se decide al producirse la lesión; la probabilidad base, el reparto entre gravedades (con un 2 % de larga duración por defecto) y la reducción de Robusto se fijarán en el documento de equilibrado.
- **Amarillas en el modo mixto**: las sanciones por acumulación pendientes al terminar la liga se cumplen en la eliminatoria; las amarillas acumuladas que no llegaron a 3 se descartan al empezar la eliminatoria.
- **Abandono**: un humano que abandona el torneo es sustituido por un NPC intermedio para que el torneo pueda terminar.
- **Escala del MVP**: objetivo de beta, hasta 100 partidas simultáneas (unos 800 participantes conectados). Las escalas superiores quedan fuera de este MVP, pero la arquitectura no debe impedirlas (Principio VIII).
- **Idioma**: la interfaz del MVP estará en español.
- **Dependencias**: se necesita un conjunto de datos de jugadores Core que cumpla las reglas de esta especificación; su creación (nombres, historias, valores) es un trabajo de contenido paralelo.
- **Valores concretos del motor**: las magnitudes exactas de bonificaciones no cuantificadas por el usuario ("aumenta la probabilidad", "aumenta mucho") se fijarán en el documento de equilibrado durante la planificación, y se validarán con los criterios SC-004 a SC-007.
