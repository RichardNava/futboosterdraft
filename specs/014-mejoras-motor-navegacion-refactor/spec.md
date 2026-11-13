# Feature Specification: Mejoras del motor, navegación sin pestañeo y refactorización

**Feature Branch**: `main` (sin rama propia, como las specs 008 a 013)

**Created**: 2026-11-13

**Status**: Draft

**Input**: User description: "Spec 14 — Mejoras motor, eficiencia y refactorización. 1) Motor de juego, visto en la
Simulación 2D: el balón a veces se mueve solo, sin que nadie lo golpee; un atacante en buena situación de gol pasa hacia
atrás o se enreda en pases adelante-atrás sin que intervengan los defensas (directriz: con solo el portero delante,
acercarse si está lejos, pasar si le presionan y un compañero en paralelo está mejor colocado, y disparar si está lo
bastante cerca); no se pitan fueras de juego cuando un jugador por delante de la defensa recibe un pase; el cansancio
desde el minuto 65 no se nota y debe verse en las chapas de «Gestionar equipo» (solo en las pausas, no en la 2D) con una
cara de cinco colores, el porcentaje de energía encima y la penalización en rojo debajo; y, en general, un
comportamiento más realista en el que las estadísticas de los jugadores pesen más. 2) Navegación: quitar el pestañeo al
cambiar de página, cargando antes y mostrando un indicador de espera solo si la carga tarda 2-3 segundos. 3)
Refactorización DRY sin cambiar el funcionamiento, eliminando código duplicado o sin uso y comentando los métodos de
forma clara y profesional."

## Contexto

- El cansancio se acordó en la [001](../001-draft-manager-mvp/spec.md) (FR-036): desde el minuto 65 (55 con Presión
  alta) las estadísticas bajan de forma progresiva. Hoy el motor lo aplica, pero el efecto es pequeño y el participante
  no tiene forma de verlo.
- «Gestionar equipo» durante el partido viene de la [003](../003-mejoras-ux-simulacion/spec.md) (FR-027 a FR-031) y la
  [012](../012-mejoras-simulacion-2d/spec.md) le dio la forma actual (chapas con retrato y dorsal, pausas del descanso,
  de los goles y de las incidencias en control total).
- Hoy el fuera de juego solo existe como un sorteo con probabilidad fija en los pases al espacio (mayor con línea
  adelantada); no depende de dónde están los jugadores cuando sale el pase.
- La constitución exige un único motor (Principio V), que la estrategia y las estadísticas sean determinantes
  (Principio I) y que cada criterio estadístico se compruebe en el informe de la herramienta de equilibrado
  (Principio IX).

Términos:

- **Mano a mano**: situación en la que el portador del balón es un atacante que avanza hacia la portería rival y entre
  él y la portería solo está el portero (ningún defensa de campo puede interponerse antes del disparo).
- **Posición de fuera de juego**: un atacante está en el campo rival y más cerca de la línea de gol rival que el balón y
  que el penúltimo defensor en el momento en que un compañero le pasa el balón.
- **Energía**: lo que le queda a un jugador antes de llegar al cansancio máximo, de 100 % (fresco) a 0 % (agotado).
- **Penalización por cansancio**: porcentaje en que el cansancio reduce en ese momento las estadísticas del jugador.
- **Indicador de energía**: cara de color junto al retrato de la chapa, con la energía encima y la penalización debajo.
- **Pestañeo**: aparición y desaparición, en menos de un instante, de barras, secciones o esqueletos de carga al
  cambiar de pantalla.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El balón solo se mueve cuando alguien lo juega (Priority: P1)

Un participante ve un partido en la Simulación 2D. Cada vez que el balón cambia de dirección o arranca, hay un jugador
que lo toca (pase, disparo, despeje, regate, parada) o se reanuda el juego (saque, falta, córner). El balón nunca se
queda quieto en una zona vacía para salir disparado después sin que nadie llegue a él.

**Why this priority**: es un fallo visible que rompe la credibilidad de la 2D en cualquier partido.

**Independent Test**: reproducir en 2D una serie de partidos con semilla fija y comprobar que todo cambio de
trayectoria del balón coincide con un jugador junto al balón o con una reanudación.

**Acceptance Scenarios**:

1. **Given** un balón que llega a una zona donde no hay nadie, **When** sigue el juego, **Then** el balón queda suelto o
   sigue rodando hasta que un jugador llega a él, y solo entonces cambia de trayectoria.
2. **Given** un pase o un despeje, **When** el balón vuelve a moverse en otra dirección, **Then** hay un jugador de
   cualquiera de los dos equipos en contacto con el balón en ese instante.
3. **Given** el mismo partido en simulación rápida y en 2D, **When** se comparan, **Then** el resultado y los eventos
   relevantes son los mismos (la corrección no cambia lo que calcula el motor, solo lo hace coherente con su dibujo).

---

### User Story 2 - Un atacante solo ante el portero busca el gol (Priority: P1)

Cuando un atacante queda en mano a mano, actúa como lo haría un delantero real: si aún está lejos, conduce hacia la
portería; si un defensa le alcanza y le presiona y un compañero en paralelo está mejor colocado, se la pasa; si está lo
bastante cerca, dispara. Desaparecen los pases hacia atrás en buena situación de gol y las secuencias de pases
adelante-atrás entre dos atacantes sin que intervenga nadie.

**Why this priority**: es la jugada que más se nota y la que más decide los partidos; hoy se desperdician ocasiones
claras de forma poco creíble.

**Independent Test**: preparar con semilla fija situaciones de mano a mano (lejos, cerca, presionado con compañero en
paralelo, presionado sin compañero) y comprobar la decisión en cada una; y medir en una serie de partidos las secuencias
de pases sin sentido.

**Acceptance Scenarios**:

1. **Given** un mano a mano lejos de la portería y sin presión, **When** decide el portador, **Then** conduce hacia la
   portería.
2. **Given** un mano a mano a distancia de disparo, **When** decide el portador, **Then** dispara (salvo la variabilidad
   controlada que admite el motor para los errores de decisión).
3. **Given** un mano a mano en el que un defensa presiona al portador y un compañero en paralelo está libre y mejor
   colocado para marcar, **When** decide el portador, **Then** le pasa el balón.
4. **Given** un mano a mano con presión pero sin compañero mejor colocado, **When** decide el portador, **Then** sigue
   hacia la portería o dispara, nunca pasa hacia atrás.
5. **Given** dos atacantes en campo rival sin defensas que les presionen, **When** se suceden sus decisiones, **Then** no
   encadenan más de un pase de ida y vuelta entre ellos sin avanzar.

---

### User Story 3 - Se pitan los fueras de juego (Priority: P1)

Cuando un atacante en posición de fuera de juego recibe un pase de un compañero, el árbitro pita fuera de juego y el
equipo defensor saca una falta desde donde estaba el infractor. Si el atacante estaba en posición correcta cuando salió
el pase, la jugada sigue aunque después quede por delante de la defensa.

**Why this priority**: es una regla básica del fútbol y su ausencia premia jugadas que en un partido real se anularían;
además da sentido real a la táctica de línea adelantada.

**Independent Test**: preparar con semilla fija pases a receptores en posición de fuera de juego y en posición
correcta, y comprobar que solo los primeros se pitan; en la 2D, ver el pitido y el saque del equipo defensor.

**Acceptance Scenarios**:

1. **Given** un atacante por delante del penúltimo defensor y del balón, en campo rival, **When** un compañero le pasa el
   balón, **Then** se pita fuera de juego y el equipo defensor saca falta desde la posición del infractor.
2. **Given** un atacante a la altura del penúltimo defensor o por detrás, **When** recibe el pase, **Then** no se pita
   fuera de juego.
3. **Given** un atacante en su propio campo, **When** recibe el pase, **Then** no se pita fuera de juego.
4. **Given** un saque de banda, de puerta o de esquina, **When** el receptor está por delante de la defensa, **Then** no
   se pita fuera de juego.
5. **Given** un fuera de juego pitado, **When** se ve en la 2D o en la simulación rápida, **Then** aparece como evento
   «Fuera de juego» con el jugador sancionado y cuenta en las estadísticas del partido.
6. **Given** un equipo con línea adelantada, **When** se juega una serie de partidos, **Then** provoca más fueras de
   juego que el mismo equipo sin ella, como consecuencia de la posición de sus defensas.

---

### User Story 4 - El cansancio se nota y se ve en «Gestionar equipo» (Priority: P2)

Desde el minuto 65 (55 con Presión alta), sin contar virtudes ni defectos, los jugadores empiezan a cansarse y su
rendimiento baja de forma apreciable. En las pausas en las que se puede gestionar el equipo (descanso, goles e
incidencias en control total), cada chapa muestra junto al retrato una cara de color según la energía, el porcentaje de
energía encima y, si el jugador está cansado, la penalización en rojo debajo. Así el participante sabe a quién cambiar.

**Why this priority**: el cansancio es una regla acordada que hoy no se percibe ni se puede gestionar; da sentido a las
sustituciones.

**Independent Test**: abrir «Gestionar equipo» en el descanso y después del minuto 75 de un partido contra un NPC, y
comprobar las caras, los porcentajes y las penalizaciones; comprobar en el informe de equilibrado que el rendimiento de
los jugadores baja tras el inicio del cansancio.

**Acceptance Scenarios**:

1. **Given** un jugador sin rasgos que afecten al cansancio, **When** el reloj no ha llegado al minuto 65 (55 con
   Presión alta), **Then** su energía es 100 % y no tiene penalización.
2. **Given** un jugador sin rasgos de cansancio, **When** pasa el minuto de inicio, **Then** su energía baja de forma
   progresiva y su penalización sube, y su rendimiento en el partido baja en consecuencia.
3. **Given** las pausas de «Gestionar equipo», **When** se ven las chapas, **Then** cada jugador en el campo muestra la
   cara según estos tramos:
   - energía de 80 % a 100 %: cara sonriente, verde;
   - de 60 % a menos de 80 %: cara algo menos sonriente, verde más claro;
   - de 40 % a menos de 60 %: cara seria, amarilla;
   - de 20 % a menos de 40 %: cara triste, naranja;
   - de 0 % a menos de 20 %: cara muy triste, roja.
4. **Given** una chapa con indicador de energía, **When** se mira, **Then** encima de la cara aparece el porcentaje de
   energía (redondeado a entero) y, si la energía es inferior al 80 %, debajo aparece en rojo la penalización (p. ej.
   «−12 %»).
5. **Given** la Simulación 2D en reproducción, **When** se ve el campo, **Then** no aparece ningún indicador de energía
   (solo en las pausas de gestión).
6. **Given** un suplente que entra en el campo, **When** se vuelve a abrir «Gestionar equipo», **Then** su indicador
   empieza en 100 % y se cansa desde ese momento según las mismas reglas.
7. **Given** un jugador con Incansable, Fatigado, Indisciplinado o un Motivador en el campo, **When** se abre la gestión,
   **Then** el indicador refleja el cansancio real que les aplica el motor con esos rasgos.

---

### User Story 5 - Las estadísticas de los jugadores deciden más (Priority: P2)

El comportamiento general del partido es más realista y las estadísticas de cada jugador pesan más en lo que hace y en
cómo le sale: un buen pasador elige y acierta más pases, un buen regateador se va más veces, un buen rematador marca
más, un buen defensa roba más y un jugador rápido llega antes al balón. La diferencia entre un jugador alto y uno bajo
en una estadística se nota a simple vista en la 2D y en las estadísticas del partido.

**Why this priority**: refuerza el Principio I (la estrategia del draft y de la alineación debe ser determinante), pero
es un ajuste de equilibrado amplio que se apoya en las historias anteriores.

**Independent Test**: en la herramienta de equilibrado, enfrentar equipos que solo difieren en una estadística y leer en
el informe la ventaja medida para cada estadística principal.

**Acceptance Scenarios**:

1. **Given** dos equipos iguales salvo en la estadística de pase de sus centrocampistas, **When** se simula una serie de
   partidos, **Then** el equipo con mejor pase completa un porcentaje de pases claramente superior.
2. **Given** dos equipos iguales salvo en el remate de sus delanteros, **When** se simula una serie, **Then** el de mejor
   remate convierte un porcentaje de disparos claramente superior.
3. **Given** dos equipos iguales salvo en la velocidad, **When** se simula una serie, **Then** el más rápido gana más
   balones divididos y en la 2D sus jugadores llegan antes a los balones sueltos.
4. **Given** dos equipos de media muy distinta, **When** se simula una serie, **Then** el mejor gana con más frecuencia
   que hoy, sin volver a goleadas desmedidas (se mantiene el freno a las goleadas de la 012).

---

### User Story 6 - Cambiar de pantalla sin pestañeo (Priority: P2)

Al navegar entre pantallas (inicio, perfil, tienda, colección, partidas, torneo…) la nueva pantalla aparece completa,
sin que se vean durante un instante barras, secciones o esqueletos de carga que desaparecen enseguida. Si una pantalla
tarda de verdad en cargar, se mantiene la anterior y, solo si la espera supera los 2 segundos, aparece un indicador de
carga.

**Why this priority**: la sensación de pestañeo resta calidad a toda la aplicación, aunque no impide jugar.

**Independent Test**: recorrer todas las pantallas principales con una conexión normal y comprobar que no hay pestañeo;
simular una conexión lenta y comprobar que el indicador aparece a los 2 segundos y no antes.

**Acceptance Scenarios**:

1. **Given** una conexión normal, **When** el participante cambia de pantalla, **Then** la nueva pantalla se muestra con
   su contenido sin estados intermedios visibles.
2. **Given** una pantalla ya visitada en la sesión, **When** se vuelve a ella, **Then** se muestra al instante con los
   últimos datos conocidos y se actualiza sin pestañeo si hay cambios.
3. **Given** una carga que dura menos de 2 segundos, **When** se navega, **Then** no aparece ningún indicador de carga ni
   esqueleto.
4. **Given** una carga que dura más de 2 segundos, **When** pasan los 2 segundos, **Then** aparece un indicador de carga
   que desaparece en cuanto la pantalla está lista.
5. **Given** una carga que falla, **When** termina, **Then** se muestra el aviso de error habitual de la pantalla, no un
   indicador de carga perpetuo.

---

### User Story 7 - Código más limpio sin cambiar nada del juego (Priority: P3)

El equipo de desarrollo revisa todo el código: une lo duplicado, elimina lo que ya no se usa y simplifica lo que se puede
resumir, sin que cambie ningún comportamiento. Cada método queda acompañado de un comentario breve, claro y profesional
que explica qué hace y, cuando no es evidente, por qué.

**Why this priority**: no aporta valor visible al jugador, pero reduce el coste de las próximas specs; se hace al final
para no mezclar cambios de comportamiento con cambios de forma.

**Independent Test**: comparar antes y después la batería completa de pruebas y una serie de partidos con semillas
fijas.

**Acceptance Scenarios**:

1. **Given** las pruebas automáticas existentes, **When** termina la refactorización, **Then** todas siguen pasando sin
   modificar lo que comprueban.
2. **Given** una serie de partidos y drafts con semillas fijas, **When** se reproducen antes y después de refactorizar
   (con el motor de las historias 1 a 5 ya cerrado), **Then** los resultados y eventos son idénticos.
3. **Given** cualquier método del código, **When** se lee, **Then** tiene un comentario que explica su propósito en una o
   pocas líneas, en español.
4. **Given** el código tras la refactorización, **When** se busca lógica repetida o sin uso, **Then** no quedan bloques
   duplicados con la misma responsabilidad ni exportaciones, ficheros o ramas sin uso.

---

### Edge Cases

- **Balón que sale del campo sin que nadie lo toque**: rodar hasta la línea y salir es válido; lo que no puede ocurrir
  es que cambie de trayectoria dentro del campo sin contacto.
- **Mano a mano con el portero adelantado**: si el portero ha salido lejos, el atacante puede disparar desde más lejos
  (vaselina o tiro a puerta vacía) en lugar de seguir conduciendo.
- **Mano a mano en el que el defensa alcanza al atacante y no hay compañero**: el atacante sigue (conduce, regatea o
  dispara); el defensa puede robar o cometer falta según las reglas actuales.
- **Compañero en paralelo, pero en fuera de juego**: el pase cuenta como pase a un jugador en posición de fuera de juego
  y se pita; el atacante prefiere no darlo salvo error de decisión de su nivel.
- **Fuera de juego en un rechace**: si el balón llega al atacante tras tocarlo un defensa de forma deliberada (despeje,
  pase), no hay fuera de juego; si llega tras una parada o un rebote en el poste desde el disparo de un compañero, sí
  se evalúa la posición en el momento del disparo.
- **Fuera de juego en el minuto final**: se pita igual y se respeta el final del tiempo como con cualquier otra falta.
- **Jugador expulsado o lesionado**: deja de mostrar indicador (ya no está en el campo); el que le sustituye empieza en
  100 %.
- **Energía exactamente en un límite (80, 60, 40, 20 %)**: pertenece al tramo superior (p. ej. 80 % es verde
  sonriente).
- **Pausa de gestión antes del minuto de inicio del cansancio**: todos los indicadores muestran 100 % y ninguna
  penalización.
- **Navegación con datos en caché que han cambiado** (p. ej. fragmentos tras una compra): se muestra lo conocido y se
  actualiza sin pestañeo; nunca se deja un dato obsoleto que pueda llevar a una decisión equivocada (saldo, plazos).
- **Navegación rápida entre varias pantallas**: si el participante cambia de pantalla antes de que termine una carga, no
  aparece el indicador de una carga abandonada.
- **Refactorización que toca el motor**: cualquier diferencia en un partido con semilla fija se considera un fallo de la
  refactorización, no un ajuste.

## Requirements *(mandatory)*

### Functional Requirements

**Coherencia del balón (US1)**

- **FR-001**: El motor DEBE garantizar que todo cambio de trayectoria o arranque del balón dentro del campo corresponde a
  un contacto de un jugador situado junto al balón o a una reanudación reglamentaria.
- **FR-002**: Un balón que llega a una zona sin jugadores DEBE quedar suelto (rodando o detenido) hasta que un jugador
  llegue a él con el tiempo de desplazamiento que corresponde a su velocidad.
- **FR-003**: La 2D DEBE dibujar el balón conforme a lo que calcula el motor, sin saltos ni movimientos que no tengan un
  evento que los explique; la corrección NO DEBE crear una lógica de cálculo propia de la 2D (Principio V).

**Mano a mano y decisiones de ataque (US2)**

- **FR-004**: El motor DEBE reconocer el mano a mano y aplicar al portador esta directriz, en este orden:
  1. si está a distancia de disparo, disparar;
  2. si un defensa le presiona y un compañero en paralelo o por delante, en posición correcta y libre de marca, tiene
     mejor ocasión, pasarle;
  3. en otro caso, conducir hacia la portería.
- **FR-005**: En mano a mano, el portador NO DEBE pasar el balón hacia atrás, salvo como error de decisión de su nivel
  dentro de las probabilidades de error ya definidas para NPC y para la resolución automática.
- **FR-006**: El motor DEBE evitar secuencias de pases entre los mismos dos atacantes que no ganan terreno: tras un pase
  de ida y vuelta sin presión, el siguiente receptor DEBE avanzar, buscar a otro compañero o disparar.
- **FR-007**: La distancia de disparo DEBE depender de las estadísticas del portador (un buen rematador de lejos dispara
  antes) y de la posición del portero.

**Fuera de juego (US3)**

- **FR-008**: El motor DEBE pitar fuera de juego cuando un compañero pasa el balón (o dispara y el balón le llega de
  rechace del portero o de los palos) a un atacante que, en el momento del pase, está en el campo rival y más cerca de la
  línea de gol rival que el balón y que el penúltimo defensor.
- **FR-009**: NO DEBE haber fuera de juego en saques de banda, de puerta ni de esquina, ni si el receptor está en su
  propio campo o a la altura del penúltimo defensor.
- **FR-010**: Tras un fuera de juego, el equipo defensor DEBE reanudar con un saque de falta desde la posición del
  infractor en el momento del pase.
- **FR-011**: El fuera de juego DEBE salir de la posición real de los jugadores; la línea adelantada DEBE provocar más
  fueras de juego por adelantar a los defensas, no por un sorteo añadido.
- **FR-012**: Los atacantes DEBEN tener en cuenta la línea defensiva al desmarcarse y al recibir; con mejor visión y
  posicionamiento, se quedan en fuera de juego menos veces.
- **FR-013**: El fuera de juego DEBE registrarse como evento con el jugador sancionado, verse en la 2D (pitido y saque
  del equipo defensor) y en la simulación rápida, y contar en las estadísticas del partido.

**Cansancio visible (US4)**

- **FR-014**: Sin contar virtudes, defectos ni tácticas que lo modifiquen, los jugadores en el campo DEBEN empezar a
  cansarse en el minuto 65 (55 con Presión alta), y la bajada de rendimiento DEBE ser apreciable en el juego y en las
  estadísticas (ver SC-006).
- **FR-015**: La energía de cada jugador DEBE ir de 100 % (sin cansancio) a 0 % (cansancio máximo que admite el motor), y
  la penalización DEBE ser el porcentaje en que el cansancio reduce en ese momento sus estadísticas.
- **FR-016**: En las pausas de «Gestionar equipo» de un partido en curso, cada chapa de un jugador en el campo DEBE mostrar
  junto al retrato el indicador de energía con los cinco tramos del escenario 3 de la US4 (cara y color), el porcentaje
  de energía encima y, con energía inferior al 80 %, la penalización en rojo debajo.
- **FR-017**: El indicador NO DEBE mostrarse durante la reproducción de la Simulación 2D ni en las pantallas de
  alineación entre jornadas.
- **FR-018**: Los suplentes que no han jugado DEBEN mostrarse sin indicador o con 100 %; los que entran en el campo DEBEN
  cansarse desde su entrada.
- **FR-019**: El indicador DEBE reflejar el cansancio real calculado por el motor, incluidos los efectos de Incansable,
  Fatigado, Indisciplinado, Motivador, Presión alta y marcaje individual.
- **FR-020**: El significado del indicador DEBE poder consultarse en la propia pantalla (p. ej. un texto de ayuda con los
  tramos) y ser legible sin depender solo del color.

**Estadísticas más determinantes (US5)**

- **FR-021**: El motor DEBE aumentar el peso de las estadísticas individuales en la elección de las acciones y en su
  éxito, de forma que la diferencia entre jugadores se note en cada estadística principal (pase, regate, remate,
  defensa, velocidad, físico, portero).
- **FR-022**: Los ajustes DEBEN reflejarse en los parámetros de equilibrado versionados, con una nueva versión de
  parámetros, y medirse en el informe de la herramienta de equilibrado.
- **FR-023**: Los cambios del motor NO DEBEN romper los criterios de equilibrado vigentes que no se revisan en esta spec
  (goles por partido, freno a las goleadas, efecto de cada virtud y defecto).

**Navegación sin pestañeo (US6)**

- **FR-024**: Al navegar entre pantallas, la aplicación DEBE mostrar la nueva pantalla solo cuando su contenido principal
  está listo, manteniendo la anterior mientras tanto, o al instante si ya dispone de los datos.
- **FR-025**: Los datos ya cargados en la sesión DEBEN reutilizarse al volver a una pantalla y actualizarse en segundo
  plano sin estados de carga visibles.
- **FR-026**: La aplicación DEBE adelantar la carga de lo necesario para las pantallas a las que es probable navegar
  (p. ej. al señalar o pulsar un enlace) cuando eso no suponga un coste apreciable.
- **FR-027**: Si una navegación tarda más de 2 segundos, DEBE aparecer un indicador de carga, que desaparece al terminar o
  al fallar; si tarda menos, NO DEBE aparecer ningún indicador ni esqueleto.
- **FR-028**: Una carga abandonada (el participante ya ha navegado a otra pantalla) NO DEBE mostrar su indicador ni
  sobrescribir la pantalla actual.

**Refactorización (US7)**

- **FR-029**: La refactorización DEBE abarcar todo el código del proyecto (servidor, web, dominio, motor, IA y
  herramientas) y unificar la lógica duplicada, eliminar el código sin uso y simplificar lo que se pueda resumir.
- **FR-030**: La refactorización NO DEBE cambiar ningún comportamiento: las pruebas existentes DEBEN seguir pasando sin
  rebajar lo que comprueban, y los partidos y drafts con semilla fija DEBEN dar el mismo resultado antes y después.
- **FR-031**: Cada método o función DEBE tener un comentario en español, breve, claro y profesional, que diga qué hace y,
  cuando no sea evidente, por qué.
- **FR-032**: La refactorización DEBE hacerse después de cerrar los cambios de comportamiento del motor (US1 a US5) para
  poder comparar con semillas fijas.

### Key Entities *(include if feature involves data)*

- **Evento de fuera de juego**: minuto, equipo infractor, jugador sancionado, posición del infractor y del penúltimo
  defensor en el momento del pase, punto de reanudación.
- **Estado de energía del jugador**: energía (0-100 %), penalización (%), tramo del indicador; existe solo para los
  jugadores que han estado en el campo en un partido en curso.
- **Parámetros de equilibrado**: nueva versión con los pesos de las estadísticas, el cansancio, el mano a mano y el fuera
  de juego.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En 20 partidos vistos en 2D con semillas fijas, el 100 % de los cambios de trayectoria del balón dentro del
  campo coinciden con un jugador en contacto o con una reanudación.
- **SC-002**: En 1.000 partidos simulados, al menos el 80 % de los mano a mano a distancia de disparo terminan en disparo,
  y menos del 2 % de los mano a mano terminan en un pase hacia atrás.
- **SC-003**: En 1.000 partidos simulados, no hay ninguna secuencia de más de dos pases de ida y vuelta entre los mismos
  dos atacantes sin presión ni avance.
- **SC-004**: En 1.000 partidos simulados hay entre 1 y 6 fueras de juego por partido de media entre los dos equipos, y un
  equipo con línea adelantada provoca al menos un 30 % más que sin ella.
- **SC-005**: En una revisión de 20 fueras de juego pitados en 2D, el 100 % corresponden a un receptor por delante del
  penúltimo defensor en el momento del pase, y ninguna jugada con receptor en posición correcta se pita.
- **SC-006**: Un jugador sin rasgos de cansancio pierde al final del partido al menos un 15 % de rendimiento respecto a su
  rendimiento antes del minuto de inicio, medido en el informe de equilibrado.
- **SC-007**: En las pausas de «Gestionar equipo», el 100 % de los jugadores en el campo muestran el indicador de energía
  con la cara, el color, el porcentaje y la penalización que corresponden a su tramo.
- **SC-008**: Para cada estadística principal, el informe de equilibrado muestra que el equipo con +15 puntos en esa
  estadística obtiene una ventaja medible en la acción que gobierna (al menos +10 % relativo en su tasa de éxito).
- **SC-009**: Un equipo con 10 puntos más de media gana al menos un 10 % más de partidos que con los parámetros actuales,
  y la proporción de partidos con 6 o más goles de diferencia no supera la actual.
- **SC-010**: Al recorrer las pantallas principales con una conexión normal, en el 100 % de las navegaciones no se ve
  ningún estado de carga intermedio; con una conexión lenta, el indicador aparece a los 2 segundos (±0,3 s) y nunca
  antes.
- **SC-011**: Tras la refactorización, el 100 % de las pruebas automáticas pasan sin rebajar lo que comprueban y 100
  partidos y 20 drafts con semilla fija dan resultados idénticos a los de antes.
- **SC-012**: Tras la refactorización, una revisión automática de código sin uso (que el plan elegirá) no encuentra ninguna
  exportación, fichero ni dependencia sin uso, un resumen lista cada duplicidad unificada y lo eliminado, y el 100 % de
  las funciones y métodos tienen un comentario explicativo.

## Assumptions

- **Umbral del indicador de carga**: 2 segundos, el límite inferior de lo pedido (2-3 s), para no dejar esperas largas sin
  respuesta; es un parámetro fácil de ajustar.
- **Tramos de energía**: se cierran por abajo (80 %, 60 %, 40 % y 20 % pertenecen al tramo superior); la penalización se
  muestra desde que la energía baja del 80 %, que es cuando el jugador entra en «uno de los estados cansados».
- **Relación energía-penalización**: la energía mide lo que queda hasta el cansancio máximo del motor y la penalización es
  la reducción real de estadísticas; ambas salen del mismo valor del motor, sin una regla de cansancio aparte para la
  interfaz.
- **Dónde se ve el indicador**: en todas las pausas de «Gestionar equipo» de la 012 (descanso, goles e incidencias en
  control total) y en la gestión desde la simulación rápida si la hay; no en la reproducción de la 2D.
- **Fuera de juego**: se aplica la regla real simplificada (sin «interferir en el juego» ni fuera de juego pasivo): cuenta
  el receptor del pase; un atacante en fuera de juego que no recibe el balón no se sanciona.
- **Mano a mano**: la directriz se aplica a todos los equipos (humanos en resolución automática y NPC); los errores de
  decisión de los NPC de nivel bajo siguen existiendo con sus probabilidades actuales.
- **Comparación con semillas fijas en la refactorización**: se hace con la versión de parámetros nueva de esta spec, una
  vez cerradas las historias 1 a 5.
- **Comentarios**: en español, con el estilo de los que ya hay; los textos de interfaz no cambian.
- **Pruebas**: las pruebas que dependen de valores concretos del motor (goles, eventos con semilla fija) se actualizan en
  las historias 1 a 5 cuando cambia el comportamiento, nunca en la refactorización.
- Dependencias: la herramienta de equilibrado del proyecto, la «Gestionar equipo» de la 012 y la pantalla de la
  Simulación 2D.
