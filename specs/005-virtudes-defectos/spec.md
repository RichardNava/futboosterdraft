# Feature Specification: Virtudes, defectos y nuevo modo de juego

**Feature Branch**: `005-virtudes-defectos`

**Created**: 2026-10-21

**Status**: Draft

**Input**: User description: "Spec 5 — Virtudes, defectos y nuevo modo de juego. 0) Renombrar «specials» a «virtudes» en toda la aplicación, sin convivencia de ambos términos. 1) Añadir defectos (Agresivo, Impulsivo, Frágil, Fatigado, Polémico, Indisciplinado, Canchero, Rebelde, Torpe, Provocador, De cristal, Estrellita, Chupón, Inflexible, Mal defensor), representados como las virtudes pero con recuadro rojo. 2) Añadir las virtudes De acero, Versátil, Fair player y Revulsivo. 3) Documento de referencia único de virtudes y defectos con un valor de impacto entre 0 y 1 (virtudes: más impacto positivo, más próximo a 1; defectos: más impacto negativo, más próximo a 0); 3.2) todo atributo nuevo debe documentarse, implementarse y probarse. 4) Nuevo modo «Duelo de jugadores»: formación común elegida por el anfitrión antes del draft (4-3-3 por defecto), draft habitual, solo alineación inicial, eliminatorias resueltas por duelos individuales posición por posición con animación de cartas enfrentadas; puntuación efectiva = media + impacto de virtudes y defectos; gana quien gane más duelos; icono de dos caras enfrentadas. 5) Aumentar la frecuencia de penaltis, lesiones y tarjetas para acercarla a la realidad; en la clarificación se mostrarán los valores actuales para elegir el aumento."

## Contexto

Hoy cada carta de jugador puede tener **specials**: habilidades positivas que el motor de simulación aplica
durante los partidos (spec 001, FR-021 a FR-024, FR-037 y FR-038). El número máximo depende del nivel de la
carta (Superclase 1, Épico 2, Legendario 3, GOAT 4).

Esta especificación:

1. Rebautiza los specials como **virtudes**, en todo el producto.
2. Introduce su contrapunto, los **defectos**: rasgos negativos que perjudican el rendimiento, el comportamiento
   o el estado del jugador en el partido.
3. Amplía el repertorio de virtudes con cuatro nuevas.
4. Reúne en un único documento de referencia la definición, el comportamiento y el **valor de impacto** de
   todas las virtudes y defectos, y fija la regla de que ningún atributo nuevo existe solo en el papel.
5. Crea el modo de juego **Duelo de jugadores**, en el que las eliminatorias se resuelven comparando a los
   jugadores uno a uno, con sus medias y el impacto de sus virtudes y defectos.
6. Corrige la escasez de penaltis, lesiones y tarjetas en los partidos simulados: tras más de tres docenas de
   partidos en varios torneos, el usuario no ha visto ninguna expulsión ni lesión, y apenas amarillas o
   penaltis.

## Clarifications

### Session 2026-10-21

- Q: Texto que faltaba de la descripción (apartado 3.1 en adelante) y nuevo modo de juego → A: Se incorpora
  completo: criterio de impacto de los defectos (más negativo, más próximo a 0), integración de futuros
  atributos (3.2), modo «Duelo de jugadores» (4) y aumento de penaltis, lesiones y tarjetas (5).
- Q: ¿Cuántos defectos puede tener un jugador y cómo se reparten en el catálogo Core? → A: Hasta 2 defectos
  por carta, independientes del máximo de virtudes del nivel, y más frecuentes cuanto mejor es el nivel (más
  talento, más defectos) (FR-012).
- Q: ¿Para qué sirve el valor de impacto? → A: Fundamentalmente para resolver los duelos del modo «Duelo de
  jugadores» y reducir los empates; además lo usa la IA para valorar cartas y como referencia documental
  (FR-052).
- Q: En Duelo de jugadores, ¿la alineación es fija para todo el torneo o puede cambiarse entre eliminatorias?
  → A: Fija para todo el torneo (FR-063a).
- Q: ¿Cómo se emparejan los puestos si los equipos tienen formaciones distintas? → A: No ocurre: antes del
  draft, el anfitrión elige una formación común para todos los participantes, humanos y NPC (4-3-3 por
  defecto). En la pantalla de formación solo se puede componer el once; desaparecen táctica, dorsales,
  equipación y comportamiento (FR-061, FR-063, FR-065).

### Session 2026-10-22

- Q: ¿Cuántas tarjetas, penaltis y lesiones por partido (sumando los dos equipos) debe producir el motor? →
  A: Amarillas 4 · rojas 0,20 · penaltis 0,35 · lesiones 0,35, con margen de ±20 % (FR-071).
- Q: ¿Cómo se muestran en la carta hasta 6 rasgos (4 virtudes y 2 defectos)? → A: Una fila para las
  virtudes y debajo otra para los defectos, ambas a tamaño normal; la carta reserva el espacio de la fila de
  defectos (FR-022).
- Q: ¿Los defectos y las virtudes nuevas se añaden a las 300 cartas actuales de Core o a cartas nuevas? →
  A: Se reparten entre las 300 cartas actuales; los torneos empezados antes del cambio conservan las cartas
  sin defectos hasta terminar. Core se sustituirá por cartas reales en 1 o 2 specs, así que las reglas de
  reparto deben valer para cualquier catálogo (FR-035 a FR-037).
- Q: En un duelo, ¿cuántos puntos de media puede sumar como máximo cada virtud o restar cada defecto? → A:
  Peso pequeño: virtud +1 × impacto; defecto −1 × (1 − impacto) (FR-064).
- Q: ¿El resultado de cada duelo depende solo de la puntuación efectiva o tiene un componente de azar? → A:
  Lo elige el anfitrión antes del draft con la opción «Estado de forma». Desactivada: gana siempre la mayor
  puntuación efectiva. Activada: cada jugador suma una variación aleatoria de ±2 puntos por duelo (FR-064a).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Las habilidades se llaman «virtudes» en todo el juego (Priority: P1)

Un participante abre un sobre, consulta la ficha de un jugador o revisa su alineación y ve que las
habilidades positivas se llaman **virtudes**. En ninguna pantalla, mensaje, ayuda ni documento aparece ya
la palabra «special». Sus partidas, plantillas y torneos guardados antes del cambio siguen mostrando las
mismas habilidades, ahora como virtudes, y los partidos se resuelven igual que antes.

**Why this priority**: es la base terminológica sobre la que se construyen los defectos, las nuevas
virtudes y el modo Duelo de jugadores; mientras convivan los dos términos, cualquier ampliación genera
confusión y errores.

**Independent Test**: recorrer draft, plantilla, alineación, ficha de jugador, simulación rápida y 2D, y la
documentación del proyecto, buscando el término antiguo; y repetir una serie de partidos con las mismas
condiciones iniciales antes y después del cambio comparando resultados.

**Acceptance Scenarios**:

1. **Given** una carta con habilidades positivas, **When** el participante la ve en el sobre, en la plantilla
   o en su ficha, **Then** el bloque de habilidades se presenta como «Virtudes» y cada una con su nombre y
   descripción en español.
2. **Given** un torneo y una plantilla guardados antes del cambio, **When** el participante los vuelve a
   abrir, **Then** sus jugadores conservan exactamente las mismas habilidades, ahora como virtudes.
3. **Given** las mismas condiciones iniciales y la misma semilla de partido, **When** se simula un partido
   antes y después del cambio de nombre (con los parámetros de equilibrado anteriores y sin rasgos nuevos en
   juego), **Then** el desarrollo y el resultado son idénticos.
4. **Given** la aplicación completa y su documentación vigente, **When** se busca el término «special» o
   «specials», **Then** no aparece en ningún texto visible ni en el vocabulario del juego.

---

### User Story 2 - Los jugadores pueden tener defectos que les perjudican en el partido (Priority: P1)

Al elegir cartas en el draft, el participante descubre que algunos jugadores tienen **defectos** además (o en
lugar) de virtudes. Los defectos se muestran junto a las virtudes, con el mismo formato pero en un recuadro
rojo, y al consultarlos explican su efecto. En los partidos, esos defectos se notan: el jugador Agresivo ve
más rojas, el Frágil se lesiona más, el Fatigado se cansa antes, el Rebelde genera malestar desde el
banquillo, etc. Las mejores cartas son también las que más defectos suelen tener, así que el participante
tiene que sopesar si compensa su media alta.

**Why this priority**: es la novedad principal de la spec y añade una decisión estratégica real al draft y a
la alineación (constitución, Principio I).

**Independent Test**: preparar partidos de prueba con un mismo equipo con y sin el jugador defectuoso, y
comprobar en el informe de la herramienta de equilibrado que la métrica asociada a cada defecto empeora en
la dirección y magnitud definidas.

**Acceptance Scenarios**:

1. **Given** una carta con defectos, **When** se muestra en cualquier pantalla donde aparecen las virtudes,
   **Then** los defectos aparecen con la misma presentación que las virtudes salvo el recuadro rojo, y al
   pulsar uno se ve su nombre y su descripción.
2. **Given** un jugador Agresivo y otro idéntico sin el defecto, **When** se simula una serie suficiente de
   partidos, **Then** el Agresivo recibe aproximadamente el doble de tarjetas rojas directas por falta.
3. **Given** un equipo con un jugador Polémico en el campo, **When** el equipo va perdiendo, **Then** la media
   de todos los jugadores del equipo en el campo se reduce un 5 % mientras dure esa situación, y se recupera al
   empatar o ponerse por delante.
4. **Given** un jugador Rebelde en el banquillo del partido, **When** el partido está en juego, **Then** la
   media de los jugadores del equipo en el campo se reduce un 5 % hasta que el Rebelde entra al campo.
5. **Given** un jugador De cristal, **When** se lesiona, **Then** la lesión es siempre de larga duración.
6. **Given** un jugador Estrellita que no es el de mejor media de su equipo en el campo, **When** juega,
   **Then** su media se reduce un 10 %; **When** pasa a ser el de mejor media (por ejemplo, porque el mejor es
   sustituido), **Then** la reducción desaparece.

---

### User Story 3 - Jugar un torneo en el modo «Duelo de jugadores» (Priority: P1)

El anfitrión crea una partida y elige el modo **Duelo de jugadores**, identificado por un icono con la silueta
de dos caras enfrentadas. Antes del draft, el anfitrión elige la formación con la que jugarán todos los
participantes, humanos y NPC (por defecto, 4-3-3). Tras el draft habitual, cada participante elige su once
inicial en esa formación, una sola vez para todo el torneo; no hay banquillo, tácticas, dorsales,
equipación ni más ajustes. En cada eliminatoria, los jugadores de los dos equipos se enfrentan uno a uno,
posición por posición: en una animación llamativa las dos cartas chocan y se ve quién gana el duelo. El
equipo que gana más duelos pasa de ronda; el último que queda gana el torneo.

**Why this priority**: es el nuevo modo de juego de la spec, rápido y vistoso, y el principal consumidor del
valor de impacto de virtudes y defectos.

**Independent Test**: crear un torneo Duelo de jugadores de 4 participantes (1 humano + 3 NPC), elegir la
formación como anfitrión, completar el draft y la alineación, y jugar semifinales y final comprobando duelos, animaciones,
resultado de cada eliminatoria y campeón.

**Acceptance Scenarios**:

1. **Given** la pantalla de creación de partida, **When** el anfitrión elige el modo, **Then** «Duelo de
   jugadores» aparece junto a liga, playoff y mixto con su icono de dos caras enfrentadas, coherente con los
   iconos de los demás modos.
2. **Given** un torneo Duelo de jugadores recién creado, **When** el anfitrión llega a la elección de
   formación, **Then** el 4-3-3 aparece seleccionado por defecto, puede cambiarlo por cualquier otra formación
   del juego, y la formación elegida se aplica a todos los participantes, humanos y NPC, antes de empezar el
   draft. En el mismo paso, el anfitrión activa o desactiva el «Estado de forma» (activado por defecto). Los
   demás participantes ven ambas elecciones pero no pueden cambiarlas.
3. **Given** el draft terminado, **When** el participante abre la pantalla de formación, **Then** solo puede
   cambiar qué jugadores de su plantilla ocupan los 11 puestos; no ve opciones de táctica, dorsales,
   equipación, comportamiento ni banquillo.
4. **Given** un participante que ya ha confirmado su once, **When** avanza el torneo a la siguiente ronda,
   **Then** juega todas las eliminatorias con ese mismo once y no puede modificarlo.
5. **Given** una eliminatoria, **When** se juega, **Then** se disputan 11 duelos, cada uno entre los dos
   jugadores que ocupan el mismo puesto de la formación común, y cada duelo se muestra con su animación y la
   puntuación efectiva de ambos jugadores.
6. **Given** dos jugadores con la misma media base, **When** se enfrentan en un duelo y uno tiene virtudes de
   más impacto o defectos de menos impacto, **Then** ese jugador gana el duelo.
7. **Given** una eliminatoria, **When** terminan los duelos, **Then** gana el equipo con más duelos ganados,
   avanza a la siguiente ronda y el perdedor queda eliminado (con el mensaje de eliminación de 003/FR-039).
8. **Given** la final, **When** termina, **Then** el ganador es declarado campeón del torneo y todos los
   participantes ven la pantalla del campeón.

---

### User Story 4 - Partidos con penaltis, lesiones y tarjetas creíbles (Priority: P2)

El participante juega una temporada de partidos y, como en el fútbol real, ve con regularidad tarjetas
amarillas, alguna expulsión, algún penalti y lesiones que le obligan a hacer cambios y a rotar la plantilla
en las jornadas siguientes.

**Why this priority**: hoy estas situaciones casi no ocurren y las virtudes y defectos que dependen de ellas
(Agresivo, Impulsivo, Frágil, De cristal, De acero, Fair player, Canchero, Robusto, Lanzador de penalties,
Parapenalties) no tendrían efecto visible.

**Independent Test**: leer en el informe de la herramienta de equilibrado las frecuencias por partido de
amarillas, rojas, penaltis y lesiones sobre una serie amplia de partidos, y compararlas con los objetivos.

**Acceptance Scenarios**:

1. **Given** una serie de partidos simulados, **When** se mide la frecuencia de amarillas, rojas, penaltis y
   lesiones por partido, **Then** cada una está dentro de su rango objetivo (FR-071).
2. **Given** un torneo de liga completo, **When** el participante lo juega, **Then** ve al menos una
   expulsión, una lesión y un penalti en el conjunto de sus partidos con la frecuencia esperada.

---

### User Story 5 - Nuevas virtudes: De acero, Versátil, Fair player y Revulsivo (Priority: P2)

El participante encuentra en los sobres jugadores con cuatro virtudes nuevas y las aprovecha: alinea fuera de
su posición a un Versátil con menos penalización, reserva en el banquillo a un Revulsivo para la segunda parte,
confía en que un De acero nunca se lesione y en que un Fair player nunca vea la roja.

**Why this priority**: amplía el repertorio y da contrapunto a varios defectos, pero el juego es completo sin
ellas.

**Independent Test**: series de partidos de prueba en las que se compara al jugador con y sin la virtud
nueva, leyendo el informe de equilibrado.

**Acceptance Scenarios**:

1. **Given** un jugador De acero, **When** se simula cualquier número de partidos, **Then** nunca sufre una
   lesión.
2. **Given** un jugador Fair player, **When** se simula cualquier número de partidos, **Then** nunca recibe
   tarjeta roja, ni directa ni por doble amarilla.
3. **Given** un jugador Versátil alineado fuera de sus posiciones válidas, **When** juega, **Then** la
   penalización por posición que sufre es un 5 % menor que la de un jugador sin esa virtud en la misma
   situación.
4. **Given** un jugador Revulsivo que empieza en el banquillo, **When** entra al campo por sustitución,
   **Then** su media aumenta un 5 % durante el resto del partido; **When** es titular, **Then** no obtiene la
   bonificación.

---

### User Story 6 - Documento de referencia único de virtudes y defectos (Priority: P2)

Un diseñador del juego, un desarrollador o un jugador curioso consulta un único documento para saber qué hace
cada virtud y cada defecto, cuándo se activa, si se acumula, con qué otros es incompatible y cuánto pesa en el
juego (su valor de impacto entre 0 y 1). Los demás documentos que antes describían los specials enlazan ahora
a ese documento en lugar de repetir su contenido.

**Why this priority**: evita definiciones divergentes, es la fuente del valor de impacto que usan los duelos y
la IA, y sirve de base para el equilibrado.

**Independent Test**: abrir el documento y comprobar que contiene todas las virtudes y defectos del juego con
sus campos completos, y buscar en el resto de la documentación definiciones duplicadas.

**Acceptance Scenarios**:

1. **Given** el documento de referencia, **When** se revisa, **Then** cada virtud y cada defecto del juego
   aparece exactamente una vez con: nombre visible, tipo (virtud o defecto), ámbito (genérico o de
   demarcación), descripción, efecto concreto en el partido, condiciones de activación, reglas de acumulación,
   incompatibilidades y valor de impacto entre 0 y 1.
2. **Given** cualquier otro documento del proyecto que antes definía specials, **When** se revisa, **Then**
   contiene un enlace al documento de referencia en lugar de la lista o la definición duplicada.
3. **Given** el catálogo de virtudes y defectos que usa el juego, **When** se compara con el documento y con
   las pruebas automatizadas, **Then** no hay ninguna virtud ni defecto en uno que falte en los otros, y
   todos tienen un efecto comprobado en el juego.

---

### Edge Cases

**Virtudes y defectos**

- **Virtud y defecto opuestos en el mismo jugador**: combinaciones contradictorias (De acero con Frágil o De
  cristal; Fair player con Agresivo; Versátil o Todocampista con Inflexible; Incansable con Fatigado o
  Indisciplinado; Robusto con Frágil) NO pueden darse en una misma carta; la carga del catálogo las rechaza.
- **De acero y causas de lesión**: un De acero no se lesiona nunca, tampoco por efectos de otros rasgos ni de
  la táctica.
- **Fair player y amarillas**: puede recibir amarillas; una segunda amarilla no se convierte en roja (sigue en
  el campo con dos amarillas registradas).
- **Varios Polémicos o varios Rebeldes en el mismo equipo**: la penalización del 5 % de un mismo defecto se
  aplica una sola vez por equipo, como las bonificaciones de equipo de las virtudes (001/FR-038). Polémico y
  Rebelde, al ser defectos distintos, sí se suman entre sí.
- **Rebelde fuera de la convocatoria**: solo cuenta como «en el banquillo» si está convocado para el partido y
  no está en el campo; si está lesionado, sancionado o no convocado, no genera malestar. Si es expulsado o
  sustituido, tampoco (ya no está esperando a entrar).
- **Estrellita empatado en media**: si comparte la mejor media del equipo en el campo, no se considera
  desmotivado. Las medias que se comparan son las efectivas del momento (con cansancio, posición y
  bonificaciones), excluyendo la propia penalización de Estrellita.
- **Dos Estrellitas en el mismo equipo**: como mucho una de ellas puede tener la mejor media; las demás se
  desmotivan.
- **Provocador frente a varios GOAT**: cada jugador rival de nivel GOAT en el campo recibe +1 a su media
  mientras el Provocador esté en el campo; varios Provocadores en el mismo equipo no acumulan la bonificación.
- **Revulsivo que entra por un lesionado**: también recibe la bonificación; un jugador sustituido no puede
  volver a entrar, así que no hay segunda entrada.
- **Fatigado e Indisciplinado juntos**: el jugador empieza a cansarse al inicio de la segunda parte y además
  con un ritmo mayor.
- **Fatigado con Presión alta**: el inicio del cansancio es el más temprano de los aplicables (inicio de la
  segunda parte frente al minuto 55 o 65).
- **De cristal frente a otras reducciones de gravedad**: la lesión sigue siendo de larga duración.
- **Inflexible jugando en una posición válida**: no sufre efecto alguno.
- **Torpe**: solo aumenta la probabilidad de las situaciones de gol en propia puerta que ya existen (despejes
  de centros y tiros desviados); no crea situaciones nuevas.
- **Chupón y Mal defensor en la portería**: un portero con estos defectos mantiene sus acciones propias de
  portero (paradas, salidas, saques); los defectos afectan solo a pases entre compañeros y acciones
  defensivas de jugador de campo.
- **Torneos y partidos guardados a medio jugar**: un torneo en curso al aplicar el cambio se termina con las
  mismas cartas (sin defectos ni virtudes nuevas), reglas y parámetros con los que empezó (FR-036).

**Duelo de jugadores**

- **Duelo empatado** pese al valor de impacto (misma puntuación efectiva): el duelo es nulo y no suma para
  ninguno de los dos equipos.
- **Eliminatoria empatada** a duelos ganados (posible solo con duelos nulos): gana el equipo con mayor suma de
  puntuaciones efectivas de sus 11 jugadores; si persiste el empate, se decide por sorteo reproducible con la
  semilla del enfrentamiento.
- **Jugador alineado fuera de posición**: su puntuación efectiva en el duelo incluye la penalización por
  posición habitual, con los efectos de Versátil, Todocampista e Inflexible.
- **Anfitrión que no cambia la formación ni la opción «Estado de forma»**: se juega con el 4-3-3 y con el
  Estado de forma activado, los valores por defecto.
- **Estado de forma igual para los dos jugadores**: si las puntuaciones finales empatan, el duelo es nulo,
  como cualquier otro empate.
- **Participante que no confirma su once a tiempo**: se le asigna la alineación automática en la formación
  común, como en los demás modos, y queda fija para el torneo.
- **Plantilla sin jugadores de una demarcación** (p. ej. sin portero): el participante puede colocar a
  cualquier jugador en cualquier puesto, con la penalización por posición correspondiente.
- **Participante humano eliminado**: igual que en el playoff (003/FR-039 y siguientes), puede simular el resto
  del torneo de una vez.
- **Enfrentamientos entre NPC**: se resuelven sin animación; el participante ve su resultado en el cuadro.
- **Lesiones y sanciones**: no existen en este modo, porque no se simulan partidos; todos los jugadores de la
  plantilla están siempre disponibles.

## Requirements *(mandatory)*

### Functional Requirements

#### Renombrado de specials a virtudes

- **FR-001**: El término «special» (y sus variantes) DEBE sustituirse por «virtud»/«virtudes» en toda la
  aplicación: textos visibles, ayudas, mensajes, datos del catálogo, datos guardados, intercambio de datos
  entre cliente y servidor, reglas del motor, herramientas de equilibrado y de generación de datos, pruebas y
  documentación (incluidas las specs 001 a 004 y la constitución, que habla de «habilidades especiales»).
- **FR-002**: NO DEBEN convivir ambos términos: al terminar, ningún elemento del producto ni de su
  documentación vigente DEBE usar «special» como nombre del concepto. Se exceptúan únicamente los registros
  históricos inmutables de cambios de la base de datos ya aplicados, que no se reescriben.
- **FR-003**: Los datos ya guardados (catálogo, plantillas, torneos, partidos) DEBEN migrarse al nuevo término
  sin perder información: cada jugador conserva exactamente las mismas virtudes que tenía como specials.
- **FR-004**: El renombrado NO DEBE cambiar ningún comportamiento: con las mismas condiciones iniciales y los
  mismos parámetros de equilibrado, un partido sin rasgos nuevos DEBE desarrollarse y terminar igual que antes
  del cambio.
- **FR-005**: Las reglas existentes sobre el número máximo por nivel (Superclase 1, Épico 2, Legendario 3,
  GOAT 4), las virtudes genéricas y por demarcación, y la no acumulación de bonificaciones de equipo DEBEN
  mantenerse, ahora referidas a virtudes.

#### Defectos

- **FR-010**: Un jugador DEBE poder tener defectos, un atributo propio distinto de las virtudes. Todos los
  defectos son genéricos (los puede tener cualquier demarcación).
- **FR-011**: El catálogo de defectos inicial DEBE ser exactamente: Agresivo, Impulsivo, Frágil, Fatigado,
  Polémico, Indisciplinado, Canchero, Rebelde, Torpe, Provocador, De cristal, Estrellita, Chupón, Inflexible y
  Mal defensor.
- **FR-012**: Un jugador DEBE poder tener como máximo 2 defectos, con independencia de su nivel y sin que
  cuenten para el máximo de virtudes del nivel. En el catálogo Core, la proporción de cartas con defectos
  DEBE crecer con el nivel (más talento, más defectos). Valores iniciales, ajustables en el equilibrado:
  Superclase 15 %, Épico 25 %, Legendario 35 % y GOAT 50 % de cartas con al menos un defecto, y solo a partir
  de Épico puede haber cartas con 2 defectos.
- **FR-013**: La carga de datos DEBE rechazar cartas con defectos desconocidos, repetidos, más de 2, o
  incompatibles con alguna de sus virtudes (ver FR-040).
- **FR-014**: Cada defecto DEBE aplicarse exactamente según su definición:
  - **Agresivo**: la probabilidad de recibir tarjeta roja directa en una falta es el doble.
  - **Impulsivo**: la probabilidad de recibir tarjeta amarilla en una falta es el doble.
  - **Frágil**: la probabilidad de lesionarse se multiplica de forma drástica (por defecto ×3).
  - **Fatigado**: empieza a cansarse al inicio de la segunda parte, con independencia del minuto general de
    inicio del cansancio.
  - **Polémico**: mientras está en el campo y su equipo va perdiendo, la media de todos los jugadores de su
    equipo en el campo se reduce un 5 %.
  - **Indisciplinado**: su ritmo de cansancio es mayor que el normal (por defecto, un 50 % más rápido).
  - **Canchero**: comete faltas con más frecuencia (por defecto, un 50 % más) y, por tanto, provoca más
    penaltis cuando las comete dentro del área.
  - **Rebelde**: mientras está convocado en el banquillo sin haber entrado al campo, la media de todos los
    jugadores de su equipo en el campo se reduce un 5 %.
  - **Torpe**: la probabilidad de marcar en propia puerta en las situaciones en que eso puede ocurrir es mayor
    (por defecto, el doble).
  - **Provocador**: mientras está en el campo, cada jugador rival de nivel GOAT en el campo gana +1 punto de
    media.
  - **De cristal**: cuando se lesiona, la lesión es siempre de larga duración.
  - **Estrellita**: si no tiene la mejor media de los jugadores de su equipo en el campo, su media se reduce
    un 10 %.
  - **Chupón**: cuando tiene el balón, elige el pase con mucha menos frecuencia que un jugador normal (por
    defecto, la mitad) en favor del regate, la conducción o el tiro.
  - **Inflexible**: la penalización por jugar fuera de sus posiciones válidas es un 5 % mayor.
  - **Mal defensor**: participa con mucha menos frecuencia en acciones defensivas (presión, entradas,
    intercepciones, coberturas), por defecto la mitad.
- **FR-015**: Los efectos expresados como porcentaje sobre la media («reduce un 5 %», «reduce un 10 %»,
  «aumenta un 5 %») DEBEN aplicarse de forma proporcional a los atributos efectivos del jugador en ese
  momento; los expresados en puntos («+1»), sumando ese valor a sus atributos, como las bonificaciones de
  virtudes existentes.
- **FR-016**: Las penalizaciones de equipo de un mismo defecto NO DEBEN acumularse más de una vez por equipo;
  las de defectos distintos sí se suman.
- **FR-017**: Las magnitudes marcadas «por defecto» en FR-012 y FR-014 son valores iniciales de equilibrado:
  DEBEN poder ajustarse en los parámetros de equilibrado versionados sin cambiar las reglas, y su valor final
  se justifica con el informe de la herramienta de equilibrado.

#### Representación visual de los defectos

- **FR-020**: Los defectos DEBEN mostrarse en todos los lugares donde se muestran las virtudes (cartas del
  draft y de la apertura de sobres, plantilla, alineación, ficha del jugador, paneles del partido y duelos),
  con la misma forma, tamaño, tipografía e interacción.
- **FR-021**: La única diferencia visual entre virtudes y defectos DEBE ser el color del recuadro: rojo para
  los defectos; las virtudes conservan su estilo actual. El rojo de los defectos es información de juego, como
  los colores de nivel (004/FR-003), y DEBE distinguirse del color de error de los mensajes y mantener un
  contraste mínimo de 4,5:1 en su texto.
- **FR-022**: En cada carta, las virtudes DEBEN mostrarse en una fila y los defectos en otra fila debajo,
  ambas con los recuadros a tamaño normal y sin ocultar ningún rasgo (hasta 4 virtudes y 2 defectos). La
  carta DEBE reservar el espacio de la fila de defectos aunque no tenga ninguno, para que todas las cartas
  tengan el mismo tamaño y su contenido no se desplace.
- **FR-023**: Al pulsar o consultar un defecto DEBE mostrarse su nombre y su descripción en español, igual que
  con las virtudes, indicando que se trata de un defecto. El significado no DEBE depender solo del color
  (accesibilidad): el defecto se identifica también por texto o icono.
- **FR-024**: Al pulsar un defecto en una carta del draft NO DEBE elegirse la carta, igual que ocurre con las
  virtudes (004/FR-056).

#### Nuevas virtudes

- **FR-030**: DEBEN añadirse cuatro virtudes genéricas: De acero, Versátil, Fair player y Revulsivo, sujetas a
  las mismas reglas generales que el resto (máximo por nivel, validación del catálogo, presentación).
- **FR-031**: **De acero**: el jugador nunca se lesiona.
- **FR-032**: **Versátil**: la penalización por jugar fuera de sus posiciones válidas es un 5 % menor.
- **FR-033**: **Fair player**: el jugador nunca recibe tarjeta roja, ni directa ni por acumulación de
  amarillas.
- **FR-034**: **Revulsivo**: cuando entra al campo desde el banquillo, su media aumenta un 5 % durante el
  resto del partido.
- **FR-035**: Los defectos y las virtudes nuevas DEBEN repartirse entre las 300 cartas actuales del catálogo
  Core, siguiendo FR-012, el máximo de virtudes por nivel y las incompatibilidades de FR-040; Core no gana ni
  pierde cartas y la composición de los sobres no cambia. Las virtudes nuevas DEBEN aparecer en los sobres con
  normalidad.
- **FR-036**: Los torneos empezados antes del cambio DEBEN conservar las cartas tal como eran (sin defectos
  ni virtudes nuevas) hasta terminar; los torneos creados después usan el catálogo actualizado.
- **FR-037**: Las reglas de reparto y validación de virtudes y defectos (FR-012, FR-013, FR-040) DEBEN
  aplicarse a cualquier catálogo, no solo a Core, porque está previsto sustituirlo próximamente por un
  conjunto de cartas reales.

#### Reglas comunes de virtudes y defectos

- **FR-040**: NO DEBEN coexistir en la misma carta una virtud y un defecto que se anulen o contradigan. Como
  mínimo son incompatibles: De acero con Frágil y con De cristal; Robusto con Frágil; Fair player con
  Agresivo; Versátil y Todocampista con Inflexible; Incansable con Fatigado y con Indisciplinado. El documento
  de referencia mantiene la lista completa.
- **FR-041**: Todas las virtudes y defectos DEBEN resolverse en el motor de simulación compartido, de modo
  que la simulación rápida y la 2D reflejen los mismos efectos (constitución, Principio V).
- **FR-042**: Los efectos de virtudes y defectos que cambian durante el partido (Polémico, Rebelde,
  Estrellita, Provocador, Revulsivo) DEBEN reevaluarse en cuanto cambia su condición: marcador, sustituciones,
  expulsiones y lesiones.
- **FR-043**: Los rivales controlados por la IA DEBEN tener en cuenta virtudes y defectos, usando su valor de
  impacto, al elegir cartas en el draft, al preparar la alineación y al decidir sustituciones (p. ej. no dejar
  a un Rebelde en el banquillo sin motivo, reservar a un Revulsivo), en la medida de su nivel.
- **FR-044**: La simulación rápida y los paneles del partido DEBEN permitir al participante entender cuándo un
  defecto o virtud de efecto colectivo está activo (p. ej. aviso de malestar por un Rebelde en el banquillo o
  un Polémico con el equipo perdiendo).

#### Documento de referencia e integración de futuros atributos

- **FR-050**: DEBE existir un único documento en Markdown, en español, que centralice la definición y el
  comportamiento de todas las virtudes y defectos del juego. Para cada una DEBE indicar: nombre visible, tipo
  (virtud o defecto), ámbito (genérica o de qué demarcación), descripción para el jugador, efecto concreto en
  el partido, condiciones de activación, reglas de acumulación, incompatibilidades y valor de impacto.
- **FR-051**: Cada virtud y cada defecto DEBE tener un valor de impacto entre 0 y 1:
  - **Virtudes**: cuanto mayor es su impacto positivo en el juego, más próximo a 1; cuanto menor, más próximo
    a 0.
  - **Defectos**: cuanto mayor es su impacto negativo en el juego, más próximo a 0; cuanto menor, más próximo
    a 1.
  Los valores DEBEN reflejar de forma coherente la importancia relativa de cada atributo: un rasgo cuyo efecto
  en el partido es claramente mayor que el de otro del mismo tipo (según el informe de equilibrado) NO DEBE
  tener un valor que indique menos impacto.
- **FR-052**: El valor de impacto DEBE usarse: (a) principalmente, para calcular la puntuación efectiva de
  cada jugador en los duelos del modo Duelo de jugadores y reducir los empates (FR-064); (b) como una de las
  medidas con las que la IA valora cartas y jugadores (FR-043); y (c) como referencia documental.
- **FR-053**: Los documentos del proyecto que hoy repiten la lista o las definiciones de los specials (spec
  001 FR-022 y FR-037, textos de ayuda, guías) DEBEN sustituir ese contenido por un enlace al documento de
  referencia, conservando solo la regla propia de cada documento.
- **FR-054**: Los textos de nombre y descripción que muestra la interfaz y los valores de impacto que usa el
  juego DEBEN coincidir con los del documento de referencia.
- **FR-055**: El documento DEBE ser la referencia para mantener actualizadas las virtudes y defectos. Toda
  virtud o defecto que se añada en futuras especificaciones DEBE incorporarse a la vez al documento y a la
  lógica de juego, con su comportamiento implementado y probado: NO es suficiente con añadirlo al documento.
  Un atributo sin efecto comprobado en el juego NO DEBE poder aparecer en las cartas.

#### Modo de juego «Duelo de jugadores»

- **FR-060**: El anfitrión DEBE poder crear una partida en el modo **Duelo de jugadores**, además de liga,
  playoff y mixto. El modo DEBE mostrar un icono con la silueta de dos caras enfrentadas, fácilmente
  reconocible y coherente con los iconos de los demás modos. Admite los mismos tamaños y relleno con NPC que
  el playoff (exactamente 4, 8 o 16 participantes, con dos mesas de draft para 16; 001/FR-052).
- **FR-061**: Lo primero, antes de empezar el draft, el anfitrión DEBE elegir la formación con la que jugarán
  todos los participantes del torneo, humanos y NPC, de entre las formaciones disponibles del juego. El 4-3-3
  DEBE venir seleccionado por defecto. Solo el anfitrión puede elegirla; los demás participantes la ven antes
  del draft. La formación no puede cambiarse una vez empezado el draft.
- **FR-062**: El draft DEBE ser el habitual (tres sobres de ocho cartas, selección simultánea y circulación
  izquierda, derecha, izquierda; constitución, Principio II).
- **FR-063**: Tras el draft, cada participante DEBE configurar únicamente su once inicial: qué jugadores de
  su plantilla ocupan los 11 puestos de la formación común. En la pantalla de formación de este modo DEBEN
  desaparecer todas las opciones de táctica, dorsales, equipación y comportamiento, y el banquillo; solo queda
  la posibilidad de intercambiar jugadores para componer el once.
- **FR-063a**: El once DEBE configurarse una sola vez, tras el draft, y es fijo para todo el torneo: no puede
  modificarse entre eliminatorias. Los NPC configuran el suyo automáticamente.
- **FR-064**: Cada duelo DEBE resolverse con una **puntuación efectiva** por jugador que combine: su media base
  (con la penalización por jugar fuera de posición, si la tiene), una bonificación por cada virtud que crece
  con su valor de impacto y una penalización por cada defecto que crece cuanto más próximo a 0 es su valor de
  impacto. La combinación DEBE hacer improbables los empates entre jugadores de distinta composición de
  virtudes y defectos. Gana el duelo el jugador con mayor puntuación efectiva. Cada virtud suma
  +1 × su impacto y cada defecto resta 1 × (1 − su impacto); es decir, como máximo ±1 punto por rasgo, para
  que la media siga siendo lo determinante y los rasgos inclinen los duelos igualados. Ese máximo por rasgo
  es un parámetro de equilibrado ajustable.
- **FR-064a**: Junto con la formación, antes del draft, el anfitrión DEBE elegir si el torneo se juega con
  **Estado de forma** (activado por defecto) y la opción DEBE mostrarse a todos los participantes:
  - **Desactivado**: el duelo lo gana siempre el jugador con mayor puntuación efectiva (FR-064); los
    resultados son totalmente predecibles.
  - **Activado**: a la puntuación efectiva de cada jugador se suma, en cada duelo, una variación aleatoria de
    entre −2 y +2 puntos, su «Estado de forma». Una diferencia de puntuación efectiva de más de 4 puntos nunca
    se remonta. La animación del duelo DEBE mostrar el Estado de forma de cada jugador junto a su puntuación.
  La opción no puede cambiarse una vez empezado el draft. El margen de ±2 es un parámetro de equilibrado
  ajustable.
- **FR-065**: En cada eliminatoria DEBEN disputarse los duelos de los 11 puestos de la formación común, cada
  uno entre los dos jugadores que ocupan el mismo puesto en sus respectivas alineaciones. Al ser la formación
  la misma para todos, cada puesto tiene exactamente un rival equivalente.
- **FR-066**: Gana la eliminatoria el equipo con más duelos ganados; un duelo empatado es nulo. Si hay empate
  a duelos ganados, gana el equipo con mayor suma de puntuaciones efectivas y, si persiste, un sorteo
  reproducible a partir de la semilla del enfrentamiento. El ganador avanza de ronda y el perdedor queda
  eliminado; el proceso se repite hasta que queda un único campeón.
- **FR-067**: Cada duelo de un enfrentamiento con algún participante humano DEBE mostrarse con una animación
  visual llamativa y dinámica en la que las dos cartas se enfrentan y se revela el resultado, mostrando la
  puntuación efectiva de ambos jugadores y las virtudes y defectos que han influido. El participante DEBE
  poder acelerar o saltar las animaciones y ver el resumen de todos los duelos. La animación DEBE respetar la
  preferencia de movimiento reducido del sistema.
- **FR-068**: La resolución de los duelos DEBE calcularse en el servidor, ser reproducible con la misma
  semilla y probarse de forma independiente de la animación (constitución, Principios IV y VI).
- **FR-069**: El torneo Duelo de jugadores DEBE reutilizar el cuadro eliminatorio, los mensajes de eliminación
  y la pantalla de campeón de los demás modos (003/FR-039 y siguientes).

#### Penaltis, lesiones y tarjetas

- **FR-070**: La frecuencia de tarjetas amarillas, tarjetas rojas (directas y por doble amarilla), penaltis y
  lesiones en los partidos simulados DEBE aumentar para aproximarse a la del fútbol real.
- **FR-071**: Los objetivos por partido (sumando los dos equipos, en partidos entre equipos equilibrados con
  la táctica por defecto) DEBEN ser, con un margen de ±20 % cada uno:

  | Suceso | Actual (v3.0.0, 2.000 partidos) | Objetivo |
  |---|---|---|
  | Tarjetas amarillas | 0,98 | 4 |
  | Tarjetas rojas (directas + doble amarilla) | 0,04 | 0,20 |
  | Penaltis | 0,44 | 0,35 |
  | Lesiones | 0,08 | 0,35 |

  El informe de la herramienta de equilibrado DEBE incluir cada frecuencia con su objetivo, su valor medido y
  si se cumple. Los penaltis ya superan el objetivo en la medición sintética; aun así, el usuario percibe muy
  pocos en sus partidos reales, por lo que el plan DEBE comprobar también su frecuencia en partidos de torneo
  con equipos del catálogo y que se muestran en ambas modalidades de simulación.
- **FR-072**: El aumento DEBE hacerse en una nueva versión de los parámetros de equilibrado, de modo que los
  partidos ya jugados se sigan reproduciendo con la versión con la que se jugaron, y DEBE mantener el resto de
  criterios de equilibrado vigentes (goles por partido, ventaja del mejor equipo, etc.).

#### Constitución

- **FR-080**: La constitución DEBE actualizarse para: usar «virtudes y defectos» en lugar de «habilidades
  especiales»; y registrar el modo Duelo de jugadores como decisión resuelta en esta spec dentro de «Modos de
  juego adicionales a liga, playoff y mixto», aclarando que este modo resuelve las eliminatorias sin simular
  partidos.

### Key Entities *(include if feature involves data)*

- **Virtud** (antes «special»): rasgo positivo de un jugador con efecto definido en el partido. Atributos:
  identificador, nombre visible, descripción, ámbito (genérica o de demarcación), valor de impacto (0–1, más
  alto = más beneficioso), incompatibilidades.
- **Defecto**: rasgo negativo de un jugador con efecto definido en el partido. Mismos atributos que la virtud;
  todos genéricos; valor de impacto 0–1, más bajo = más perjudicial.
- **Jugador (carta)**: añade la lista de defectos (0 a 2) a sus campos; la lista de specials pasa a llamarse
  lista de virtudes.
- **Parámetros de equilibrado**: nueva versión con las magnitudes de los defectos, de las virtudes nuevas, de
  la puntuación efectiva de los duelos y de las frecuencias de tarjetas, penaltis y lesiones; las versiones
  anteriores se conservan para reproducir partidos ya jugados.
- **Documento de referencia de virtudes y defectos**: fuente única de su definición, comportamiento e
  impacto.
- **Torneo Duelo de jugadores**: torneo eliminatorio con una formación común elegida por el anfitrión antes
  del draft (4-3-3 por defecto), la opción «Estado de forma» (activada o desactivada) y un once fijo por
  participante para todo el torneo.
- **Enfrentamiento de duelos**: eliminatoria entre dos equipos, con sus 11 duelos, el resultado de cada uno,
  el recuento y el ganador.
- **Duelo**: comparación entre dos jugadores en puestos equivalentes, con la puntuación efectiva de cada uno y
  el resultado (gana uno u otro, o nulo).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una búsqueda del término «special» en la interfaz, los textos de ayuda y la documentación
  vigente devuelve 0 resultados que se refieran al concepto.
- **SC-002**: El 100 % de las plantillas, torneos y partidos guardados antes del cambio se abren después con
  las mismas habilidades por jugador, ahora como virtudes.
- **SC-003**: Con las mismas condiciones iniciales y parámetros, el 100 % de una serie de partidos de
  comprobación sin rasgos nuevos produce el mismo resultado antes y después del renombrado.
- **SC-004**: En el informe de la herramienta de equilibrado, cada defecto y cada virtud nueva produce un
  efecto en su métrica asociada en la dirección definida y dentro de un ±20 % de la magnitud objetivo (p. ej.
  Agresivo: entre 1,6 y 2,4 veces las rojas directas por falta; Impulsivo: entre 1,6 y 2,4 veces las
  amarillas por falta; Polémico y Rebelde: −5 % ±1 punto en la media efectiva del equipo cuando están
  activos).
- **SC-005**: En series de partidos de comprobación, un jugador De acero sufre 0 lesiones y un Fair player
  recibe 0 tarjetas rojas; todas las lesiones de un De cristal son de larga duración.
- **SC-006**: Un participante identifica correctamente si un rasgo de una carta es virtud o defecto en el
  100 % de los casos de una prueba de reconocimiento sobre al menos 10 cartas, sin necesidad de abrir la
  descripción.
- **SC-007**: El documento de referencia contiene el 100 % de las virtudes y defectos del juego, cada uno con
  todos los campos de FR-050; ningún otro documento repite su lista o su definición; y el 100 % de ellos
  tiene un efecto medido en el informe de equilibrado.
- **SC-008**: En el catálogo Core, la proporción de cartas con defectos crece con el nivel (Superclase <
  Épico < Legendario < GOAT) y ninguna carta tiene más de 2 defectos.
- **SC-009**: Un participante completa un torneo Duelo de jugadores de 4 participantes (elección de formación,
  draft, alineación, semifinal y final, viendo las animaciones) en menos tiempo que un playoff de 4 con
  simulación rápida.
- **SC-010**: En una serie de al menos 1.000 enfrentamientos de duelos simulados, menos del 2 % de los duelos
  individuales terminan en empate, y el equipo con mayor suma de medias base gana entre el 60 % y el 85 % de
  los enfrentamientos (la composición de virtudes y defectos importa, pero no anula la calidad). Con
  «Estado de forma» activado, ningún duelo con una diferencia de puntuación efectiva superior a 4 puntos lo
  gana el jugador peor, y la proporción de duelos ganados por el jugador de menor puntuación es mayor que con
  la opción desactivada; con la opción desactivada, es 0.
- **SC-011**: En una serie amplia de partidos, el informe de equilibrado muestra amarillas, rojas, penaltis y
  lesiones por partido dentro de sus rangos objetivo (FR-071), sin que los goles por partido ni el resto de
  criterios vigentes salgan de su rango.
- **SC-012**: Un participante que juega un torneo de liga completo con 8 participantes ve al menos una
  expulsión, una lesión y un penalti en sus partidos en al menos el 90 % de los torneos de comprobación.

## Assumptions

- **Provocador y GOAT**: el juego no tiene una virtud llamada «GOAT»; «GOAT» es el nivel más alto de carta. Se
  interpreta que Provocador beneficia a los jugadores rivales de **nivel** GOAT.
- **«Media del equipo»** se interpreta como la media efectiva de cada jugador del equipo en el campo, como en
  las bonificaciones de equipo de Capitanía o Fortaleza mental.
- **Banquillo**: los convocados del partido que no están en el campo y aún pueden entrar.
- **Magnitudes no cuantificadas** en la petición («drásticamente», «más rápidamente», «con mayor frecuencia»,
  «apenas»): se fijan valores iniciales en FR-014 y se calibran con la herramienta de equilibrado.
- **Specs anteriores**: las specs 001 a 004 se actualizan para usar el término «virtud» y enlazar al documento
  de referencia, sin alterar sus decisiones.
- **Partidos ya jugados** se siguen reproduciendo con la versión de parámetros con la que se jugaron.
- **Todas las virtudes nuevas y los defectos son genéricos** (no ligados a una demarcación).
- **Táctica en Duelo de jugadores**: la «táctica» de la descripción original se concreta como la formación
  común elegida por el anfitrión; el resto de opciones tácticas (altura del bloque, sistema defensivo, etc.)
  no existe en este modo.
- **Rasgos de partido en los duelos**: las virtudes y defectos que actúan durante un partido (tarjetas,
  lesiones, cansancio, banquillo…) solo influyen en el duelo a través de su valor de impacto; en este modo no
  se aplican sus efectos de partido.
- **Plantilla en Duelo de jugadores**: el draft sigue dando 24 jugadores; solo los 11 del once fijo juegan
  el torneo.
- **Ritmo**: los torneos Duelo de jugadores son asíncronos como el resto (002/FR-030).
- Esta spec no cambia las reglas del draft (constitución, Principio II): solo cambian los atributos de las
  cartas y se añade la elección previa de la formación común en el nuevo modo.
