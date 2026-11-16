# Feature Specification: Peso individual de las estadísticas — duelos atacante contra defensor

**Feature Branch**: `015-peso-individual-estadisticas`

**Created**: 2026-11-14

**Status**: Draft

**Input**: User description: "Spec 015 — Peso individual de las estadísticas: duelos atacante contra defensor. Cada
stat debe pesar de forma individual: el atacante contra el defensor que tiene delante, sea cual sea su equipo. Un mal
pasador falla más; un gran regateador (98) ante un buen defensor (90) es un duelo igualado; un 66 ante un 90 pierde casi
siempre. La meta es que se sienta realista, no agrandar las diferencias a la fuerza. Hay que corregir también la
frecuencia (que el buen regateador intente más el regate y la conducción), no solo el acierto. El cálculo debe seguir
siendo barato. Decisiones tomadas: curvas objetivo por duelo; quite por demarcación; Presionador y Mal defensor sobre el
multiplicador del quite; sensibilidad solo la necesaria; desmarque contra marcaje antes de cada pase; técnica contra
presión en el control; liderazgo del defensa y del portero; remate contra la media de agilidad y colocación; juego aéreo
del defensa con su anticipación y Cabeceador para cualquier posición; 50 como valor del defensor sin stat. Calibración
en tres tandas."

## Contexto

- La spec [014](../014-mejoras-motor-navegacion-refactor/spec.md) se cerró con el motor 7.0.0 y 60 de 67 comprobaciones
  de equilibrado superadas ([informe 7.0.0](../014-mejoras-motor-navegacion-refactor/informe-7.0.0.md)). Las siete que
  fallan dependen del peso individual de las estadísticas y el CI las ejecuta como pendientes (informan, no bloquean):
  014/SC-008-pase, 014/SC-008-remate, 014/SC-008-fisico, 002/SC-008, 003/SC-009, 003/SC-005 y 003/SC-007.
- Cómo resuelve hoy el motor cada duelo está en [enfrentamientos.md](../../docs/juego/enfrentamientos.md): una fórmula
  común (diferencia de atributos por una sensibilidad, más ajustes, en una curva acotada entre el 3 % y el 97 %), la
  tabla que traduce las seis stats de la carta a los atributos del partido y las probabilidades por acción. Su §7 lista
  las stats que hoy no tienen uso propio (liderazgo, desmarque, marcaje, agresividad, técnica, posicionamiento y el
  juego aéreo del defensa) y su §8 recoge las decisiones de esta spec.
- Observado en partidos reales: el mejor regateador del catálogo jugó dos partidos sin irse ni una vez de su defensor
  en conducción. El problema no es solo cuánto acierta, sino que lo intenta poco.
- El criterio 014/SC-008 («+15 en una stat ⇒ +10 % relativo de acierto») no se puede cumplir con acciones que ya
  aciertan más del 80 %. Esta spec lo sustituye por curvas por duelo.
- La constitución exige que la estrategia y las estadísticas sean determinantes (Principio I), un único motor
  (Principio V) y que cada criterio estadístico se compruebe en el informe de la herramienta de equilibrado
  (Principio IX).

- Tras la serie de cierre de la tanda 1 (56/68, [research.md](research.md)), la persona decidió ampliar esta spec,
  sin abrir otra, con cuatro añadidos (tanda 1b): buscar a la estrella en el pase, la táctica «Juego por las bandas»,
  la subida al área a balón parado y la salida de su zona de los jugadores que no son delanteros. Nacen de SC-002b (el
  mejor regateador toca poco el balón jugando de extremo) y de SC-003 (los centrales nunca subían a rematar).

Términos:

- **Duelo**: enfrentamiento de un atributo del jugador que actúa contra un atributo del rival concreto que se le opone,
  que decide si la acción sale.
- **Curva de duelo**: probabilidad de ganar un duelo según los dos valores enfrentados, medida **sin ajustes** (zona
  propia o media, formaciones y tácticas neutras, sin rasgos ni cansancio).
- **Sensibilidad**: cuánto cambia la probabilidad de un duelo por cada punto de diferencia entre los dos atributos.
- **Quite**: capacidad de robar el balón a quien lo lleva (entrada o presión).
- **Multiplicador del quite**: factor que convierte las stats de un jugador que no es defensa en su quite.
- **Desmarque contra marcaje**: duelo entre el receptor de un pase y el rival que le marca, antes de que salga el pase.
- **Recibir libre / con el rival encima**: resultado del duelo de desmarque, que facilita o dificulta el pase y el
  control.
- **Técnica contra presión**: duelo entre quien controla un balón con un rival encima y ese rival.
- **Estrella**: el compañero con más media de entre los que pueden recibir un pase.
- **Línea de pase clara**: ningún rival de campo a 3 m o menos de la línea del pase y el receptor sin rival encima.
- **Tanda de calibración**: bloque de cambios que se mide con una serie completa de equilibrado (unos 105 minutos con
  1.000 partidos) antes de pasar al siguiente.

## Clarifications

### Session 2026-11-14

- Q: ¿Qué se hace con el mínimo de 150 pases completados (002/SC-007a) si las curvas del pase bajan el acierto? → A:
  Se mantiene 150; el desmarque de la tanda 2 compensa la bajada. Al cerrar la tanda 1 puede quedar por debajo de
  forma temporal; al cerrar la tanda 2 DEBE cumplirse.
- Q: ¿El +0,05 de Presionador sustituye a su efecto actual o se suma? → A: Se suma (conserva el +8 y la presión de
  hoy). Mal defensor, igual: conserva lo de hoy y además resta 0,05.
- Q: ¿Cómo se aplican Presionador y Mal defensor en un defensa, cuyo quite es su tackling? → A: Sobre un
  multiplicador implícito de 1,00: Presionador, tackling × 1,05; Mal defensor, tackling × 0,95.
- Q: ¿Qué curva objetivo debe cumplir la conducción (sustituye a 014/SC-008-fisico)? → A: 90 contra quite 70,
  72–82 %; 70 contra quite 90, 25–35 %.
- Q: ¿Qué virtud cede cada central de Core por Cabeceador? → A: 60 Marc, Muro defensivo; 76 Gabriel, Volador;
  77 Joško, Potente; 86 Sergio, Intimidante; 87 Virgil, Aura; 275 Ronald Federico, Potente.
- Q: ¿Cuánto mejora Cabeceador un duelo aéreo? → A: +15 puntos de probabilidad, como hoy en el remate de cabeza,
  también en los duelos aéreos de las dos áreas.
- Q: ¿Qué significa «centrocampista con MD»? → A: Que la carta tiene MD entre sus posiciones, juegue donde juegue
  en el partido.
- Q: ¿Quién es «cercano» al defensa líder y al portero líder? → A: Al defensa, los defensas de su misma línea a
  menos de una distancia fija (calibrada en la tanda 3); al portero, los defensas dentro de su área o en la zona propia.
- Q: ¿Se dan por buenos los umbrales de SC-002 a SC-006? → A: Sí, tal cual. Si una tanda no los alcanza sin
  ampliar las diferencias más allá de FR-002, se revisan en esa tanda con una nota en la spec.

### Session 2026-11-14 (añadidos tras la serie de la tanda 1)

- Q: ¿Cómo se resuelve SC-002b (el mejor regateador, de extremo, solo supera a alguien en el 72 % de los partidos)? →
  A: Buscando más a la estrella en el pase (US7), no subiendo más el factor de regate. Con línea de pase clara se
  prioriza al de más media; con la estrella marcada, un pasador con (visión + pase)/2 ≤ 80 busca al libre; uno con más
  de 80 se la juega a la estrella el 40 % de las veces, o la prioriza si tiene más de 5 puntos de media sobre la mejor
  opción clara. En el éxito del pase interviene también el desmarque del receptor.
- Q: ¿Se mantiene el 90 % de SC-002b tras la serie de los añadidos (74,9 %)? → A: No: el objetivo baja al 80 % y se
  calibran los añadidos para llegar a él.
- Q: ¿Se mantienen 150 pases completados y el 30 % de posesiones con 3 o más pases? → A: No: con la estrella que
  regatea más hay menos pase; bajan a 130 y al 25 % (serie de calibración: 134,3 y 25,5 %).
- Q: ¿Qué mide 003/SC-007 para Matador? → A: Los goles del jugador en mano a mano, la única jugada en la que actúa la
  virtud; sus goles totales dependen de cuánto marquen los demás y no prueban el efecto.
- Q: ¿Qué mide SC-003 para Cabeceador? → A: Los goles de cabeza de los propios centrales con la virtud, no los del
  equipo: con más goles de tiro lejano, los del resto diluyen el efecto (decisión del 2026-11-15).
- Q: ¿Se mantiene el +15 % de conducciones largas de 003/SC-006 con +15 de físico y velocidad? → A: Baja a +14,5 %
  (serie de cierre: +14,5 %).
- Q: ¿Se mantienen los 2 contraataques por partido de 002/SC-007a? → A: Bajan a 1,8: con la táctica por defecto el
  límite era exigente, y con la táctica Contraataque el equipo hace un 52 % más (sonda de 300: 1,46 frente a 0,96).
- Q: ¿Cuántos córners y saques de banda? → A: Se veían pocos (2,2 córners y 1,4 saques de banda por partido): el balón
  iba siempre a un jugador. El objetivo son entre 6 y 9 córners por partido (media 7,5) y más saques de banda, con
  despejes, desvíos y rechaces que se van fuera, sin perder acciones de juego (US11, FR-031, SC-013). Si no se
  consigue sin regresiones, se descarta y se vuelve a la versión anterior.
- Q: Con el triple de córners, los cambios de orientación de 002/SC-007a bajan de 5,1 a 4,2: ¿se mantiene el mínimo de
  5? → A: Baja a 4: apenas se aprecian en la simulación y no pesan en el resultado.
- Q: ¿Se añade una táctica de juego por fuera? → A: Sí, «Juego por las bandas», como un estilo con balón más
  (junto a Equilibrado, Contraataque y Juego combinativo): se avanza más por fuera y laterales, carrileros y extremos
  reciben más (US8).
- Q: ¿Cómo se resuelve SC-003 (los centrales con Cabeceador no marcan más de cabeza)? → A: A balón parado colgado al
  área (córners y faltas laterales) suben casi todos: se quedan atrás un defensa y un medio, nunca uno con Cabeceador.
  En la última jugada del partido, perdiendo de uno, sube también el portero (US9).
- Q: ¿Cuándo sube el portero? → A: Solo en la que presumiblemente es la última jugada: el último minuto del descuento
  que ha dado el árbitro (90+4 con 4 de descuento; igual al final de la prórroga). Si aun así el rival arma un
  contraataque con el portero lejos de su portería, el tiro es a puerta vacía.
- Q: ¿Pueden los jugadores salir de su zona? → A: Sí, si la jugada lo propicia: el que gana un rechace con terreno
  por delante y solo el portero enfrente encara como un delantero, los medios llegan a la frontal y tiran desde fuera
  del área con la portería a la vista (US10).
- Q: ¿Van en una spec nueva? → A: No, en esta, como añadidos (tanda 1b); se miden con la serie de cierre de la tanda 1.
- Q: ¿Qué significa bajar `defectos.malDefensor` de 0,65 a 0,5? → A: Es la parte de las acciones defensivas que el
  Mal defensor no cede a un compañero: más bajo, más grave el defecto. Con el −0,05 de quite, la 8.0.0 lo deja haciendo
  el 42 % de las acciones de un defensa normal (objetivo de la spec 005: 50 % ± 20 %).

### Session 2026-11-15 (antes de la tanda 2)

- Q: ¿Qué cuota de goles deben marcar defensas y medios (SC-012)? → A: Entre el 15 % y el 30 % de los goles de su
  equipo (antes, 15–40 %). Al cerrar la tanda 1 está en el 5,9 % (104 de 1.767): se busca en la tanda 2 cómo acercarlo
  y, si no se alcanza, se explica con datos antes de tocar nada más.

### Session 2026-11-15 (tras la tanda 2)

- Q: ¿Cómo se mide SC-012, si la cuota cambia tanto de un equipo a otro (del 2,4 % al 27,5 % con seis equipos)? → A:
  Con muchos equipos, formaciones y tácticas: lo realista es que cambie según la calidad de los jugadores, la táctica y
  el rival. Se reparten los 1.000 partidos entre 20 equipos (las diez formaciones, dos tácticas cada una) contra rivales
  de otra formación.
- Q: ¿Se amplía el máximo de goles en propia puerta de 003/SC-003 (4,5 % tras la tanda 2)? → A: Sí, a 1–4 %. Suben
  porque balones fuera trae más córners y más despejes en el área. Además, el que despeja en su área busca el campo
  contrario: en la 8.0.0, la probabilidad de autogol al despejar se reduce a la mitad.
- Q: ¿Qué se exige a Matador en 003/SC-007, que cae por ruido con algunas semillas? → A: Es una virtud: desequilibra un
  poco y su efecto fluctúa con el resto del equipo (±5 puntos es razonable). Basta con que no empeore la conversión en
  mano a mano más de 5 puntos y con que el delantero con Matador no marque más de 1,5 goles por partido.
- Q: ¿Se sube un 4 % el peso del tiro para recuperar los 15 tiros de 002/SC-007a? → A: Se midió y no los mueve: dentro
  del área el tiro ya es la opción de más peso en el 99,5–100 % de las decisiones (research, «Tras la tanda 2»). Lo que
  falta son llegadas al área con el delantero marcado, el efecto buscado de la tanda 2.
- Q: ¿Qué se hace entonces con el mínimo de 15 tiros (14,6 tras la tanda 2)? → A: Baja a 14 (decisión del 2026-11-16).
- Q: ¿Cómo se mide 002/SC-008 (+9,4 %), si en el 4-4-2 del juego los de banda son extremos y solo quedan 2 medios? → A:
  En varias formaciones: en ninguna formación razonable se juega con dos medios. Se reparten los partidos entre las que
  tienen 3 o más (4-3-3, 4-4-2 en rombo, 4-2-3-1, 3-5-2, 5-3-2 y 4-5-1); ningún mando del motor lo movía (research,
  «002/SC-008: por qué no llega al +10 %»). Con ella pasa 003/SC-009 y el CI se queda sin `--pendientes`.

## User Scenarios & Testing *(mandatory)*

Las historias siguen el orden de las tandas de calibración: la tanda 1 son US1 a US3; la tanda 2, US4 y US5; la tanda
3, US6. Cada tanda se cierra con su serie de equilibrado antes de empezar la siguiente.

### User Story 1 - Cada duelo depende de las dos stats enfrentadas (Priority: P1) — tanda 1

Como participante, quiero que el resultado de un regate, un pase o un tiro dependa de forma reconocible de lo bueno que
es mi jugador frente al rival concreto que tiene delante: un 98 de regate contra un 90 de quite es un duelo igualado; un
66 contra un 90 pierde casi siempre; un mal pasador falla bastantes más pases que uno bueno. Que se sienta real, sin
diferencias exageradas.

**Why this priority**: es el núcleo de la spec y lo que piden cinco de las siete comprobaciones pendientes; las demás
historias se calibran sobre estas curvas.

**Independent Test**: se calcula la probabilidad de cada duelo de la tabla de FR-002 sin ajustes y se comprueba que cae
en su rango; con una serie de equilibrado se comprueba que los aciertos por stat se mueven en el sentido de las curvas.

**Acceptance Scenarios**:

1. **Given** un regate de 98 contra un quite de 90 sin ajustes, **When** se resuelve, **Then** la probabilidad de éxito
   está entre el 44 % y el 54 %.
2. **Given** un pase corto de 55 contra una anticipación de 75 sin ajustes, **When** se resuelve, **Then** la
   probabilidad de éxito está entre el 63 % y el 73 %, y la de un pase de 90 contra la misma anticipación, entre el 80 %
   y el 90 %.
3. **Given** un centrocampista que no tiene MD entre sus posiciones, con 80 de posicionamiento y 70 de velocidad, **When**
   intenta quitar el balón, **Then** su quite vale (80 + 70) / 2 × 0,87 = 65,25 (0,85 hasta la calibración del 2026-11-15).
4. **Given** el mismo centrocampista con la virtud Presionador, **When** intenta quitar el balón, **Then** su quite vale
   (80 + 70) / 2 × 0,92 = 69; con Mal defensor (y sin Presionador), (80 + 70) / 2 × 0,82 = 61,5.
5. **Given** un delantero que remata, **When** se resuelve el duelo con el portero, **Then** se enfrenta su finalización
   (un centrocampista, su disparo) a la media de agilidad y colocación del portero.

---

### User Story 2 - El buen regateador lo intenta más (Priority: P1) — tanda 1

Como participante con un gran regateador, quiero verle encarar a su defensor y salir en conducción a menudo, no solo
acertar más cuando por casualidad lo intenta.

**Why this priority**: es el caso observado que motivó la spec (cero conducciones superadas en dos partidos del mejor
regateador) y lo que piden 014/SC-008-fisico y 014/SC-008-remate: que la stat cambie la frecuencia, no solo el acierto.

**Independent Test**: en una serie de equilibrado, el mismo equipo con su extremo a 95 de regate frente a 75 intenta y
completa más regates y conducciones; se mide por partido y por jugador.

**Acceptance Scenarios**:

1. **Given** un delantero con 95 de regate y el mismo con 75, en el mismo equipo y contra los mismos rivales, **When** se
   juega una serie, **Then** el de 95 intenta al menos un 40 % más de regates y conducciones por partido y completa al
   menos un 60 % más.
2. **Given** el mejor regateador del catálogo, titular en una serie de partidos contra equipos equilibrados, **When** se
   revisan sus acciones, **Then** en al menos el 80 % de los partidos supera a algún defensor en regate o en conducción.

---

### User Story 3 - Juego aéreo del defensa y Cabeceador en cualquier posición (Priority: P2) — tanda 1

Como participante, quiero que un central bueno por arriba se note en los balones aéreos de las dos áreas y que mis
centrales cabeceadores marquen goles a balón parado, sobre todo de córner.

**Why this priority**: se mide en la misma tanda que las curvas (comparte el duelo aéreo) pero afecta a menos acciones.

**Independent Test**: se asigna Cabeceador a un defensa y se compara en una serie sus goles de cabeza y sus duelos
aéreos defensivos frente al mismo defensa sin la virtud.

**Acceptance Scenarios**:

1. **Given** un defensa en un duelo aéreo, **When** se resuelve, **Then** su atributo aéreo es su anticipación (sin
   stat nueva en la carta).
2. **Given** un defensa con Cabeceador, **When** disputa un balón aéreo en cualquiera de las dos áreas, **Then** su
   probabilidad de ganar ese duelo es 15 puntos mayor que sin la virtud.
3. **Given** las cartas de Core 60, 76, 77, 86, 87 y 275 con Cabeceador, **When** se juega una serie, **Then** sus
   equipos marcan más goles de cabeza a balón parado que con sus virtudes actuales.

---

### User Story 4 - Desmarque contra marcaje antes de cada pase (Priority: P2) — tanda 2

Como participante, quiero que un delantero que se desmarca bien reciba libre a menudo y que un buen marcador lo anule:
que antes de cada pase importe quién gana la posición, y que mis pasadores busquen al compañero que suele ganarla.

**Why this priority**: da uso a desmarque y marcaje, hoy sin peso propio, y es la vía para compensar la bajada de
acierto del pase de US1 (ver FR-020).

**Independent Test**: en una serie, el mismo receptor con +15 de desmarque (o el mismo marcador con +15 de marcaje)
cambia cuántos pases recibe, cuántos se completan hacia él y cuántos recibe con el rival encima.

**Acceptance Scenarios**:

1. **Given** un receptor que gana el duelo de desmarque, **When** sale el pase hacia él, **Then** el pase es más fácil
   de completar y recibe sin rival encima.
2. **Given** un receptor que pierde el duelo de desmarque, **When** sale el pase hacia él, **Then** el pase es más fácil
   de cortar y, si llega, recibe con el marcador encima (y pasa por el duelo de US5).
3. **Given** dos compañeros igual de bien situados, uno que suele ganar su duelo de desmarque y otro que suele perderlo,
   **When** el portador elige a quién pasar, **Then** elige más a menudo al primero.
4. **Given** un centrocampista receptor (sin stat de desmarque) y un delantero marcador (sin stat de marcaje), **When** se
   resuelve el duelo, **Then** se enfrentan la visión del centrocampista y la agresividad del delantero.

---

### User Story 5 - Técnica contra presión al controlar (Priority: P2) — tanda 2

Como participante, quiero que un jugador técnico controle el balón con un rival encima sin perderlo y que uno torpe lo
pierda más.

**Why this priority**: da uso a la técnica de defensas y centrocampistas; depende de US4, que decide quién recibe con el
rival encima.

**Independent Test**: en una serie, el mismo jugador con +15 de técnica pierde menos balones en controles con presión.

**Acceptance Scenarios**:

1. **Given** un receptor con un rival encima, **When** controla el balón, **Then** se enfrentan su técnica y el quite del
   rival que presiona; si pierde, pierde el balón.
2. **Given** un delantero receptor (sin stat de técnica), **When** controla con presión, **Then** usa la media de su
   regate y su creatividad.
3. **Given** un receptor sin rival encima, **When** controla, **Then** no hay duelo de técnica.

---

### User Story 6 - Liderazgo del defensa y del portero (Priority: P3) — tanda 3

Como participante, quiero que un central líder mantenga ordenada su línea y que un portero líder haga mejores a los
defensas que tiene cerca.

**Why this priority**: liderazgo es la única stat de portero y defensa sin ningún uso; su efecto es más pequeño y se
calibra al final, sobre las tandas anteriores.

**Independent Test**: en una serie, la misma línea defensiva con un central de 95 de liderazgo frente a uno de 70 rompe
menos el fuera de juego y deja menos huecos cerca de él; los defensas cercanos a un portero de 95 de liderazgo ganan más
duelos que con uno de 70.

**Acceptance Scenarios**:

1. **Given** un defensa con liderazgo alto, **When** su línea defensiva se coloca, **Then** los defensas cercanos a él
   guardan mejor la distancia entre sí y rompen menos el fuera de juego.
2. **Given** un portero con 90 de liderazgo, **When** un defensa cercano a él disputa un duelo, **Then** el atributo del
   defensa en ese duelo sube 2,25 puntos (2,5 % de 90).

---

### User Story 7 - Buscar a la estrella (Priority: P1) — añadidos, tanda 1b

Como participante, quiero que mis jugadores busquen a mi mejor jugador cuando tienen una línea de pase clara hacia él, y
que mis centrocampistas con más visión y pase sean los que se la juegan para que la estrella reciba aunque esté
defendida.

**Why this priority**: el mejor jugador del equipo debe pesar en el partido; hoy el mejor regateador del catálogo pasa
partidos enteros casi sin tocar el balón (SC-002b).

**Independent Test**: con la función de pesos del receptor, los cuatro ejemplos de abajo dan la preferencia indicada;
en una serie, el mejor regateador de Core supera a algún defensor en más partidos.

**Acceptance Scenarios** (4-3-3, EI de 83 de media y ED de 87 o 90):

1. **Given** líneas de pase claras al EI y al ED (87), **When** el portador elige receptor, **Then** prioriza al ED.
2. **Given** un pasador con (visión + pase)/2 ≤ 80, línea clara al EI y el ED (87) defendido, **When** elige,
   **Then** prioriza al EI.
3. **Given** un pasador con (visión + pase)/2 > 80, línea clara al EI y el ED (87) defendido, **When** elige,
   **Then** se la da al EI el 60 % de las veces y al ED el 40 %.
4. **Given** un pasador con (visión + pase)/2 > 80, línea clara al EI y el ED (90) defendido, **When** elige,
   **Then** prioriza al ED (más de 5 puntos de media sobre el EI); si el pase sale, su éxito depende también del
   desmarque del ED contra el marcaje de quien le defiende.

---

### User Story 8 - Juego por las bandas (Priority: P2) — añadidos, tanda 1b

Como participante, quiero una táctica «Juego por las bandas» para que mi equipo avance por fuera y mis laterales,
carrileros y extremos reciban más el balón.

**Why this priority**: da a los equipos con buenos jugadores de banda una forma de jugar propia, al nivel de
Contraataque o Juego combinativo.

**Independent Test**: el mismo equipo con «Juego por las bandas» frente a «Equilibrado» da más toques a laterales y
extremos y centra más.

**Acceptance Scenarios**:

1. **Given** un equipo con «Juego por las bandas», **When** avanza tras un pase, **Then** el balón va más a menudo a
   una banda que con «Equilibrado».
2. **Given** ese equipo, **When** el portador elige receptor, **Then** laterales, carrileros y extremos pesan más.
3. **Given** el panel de táctica, **When** la persona elige el estilo con balón, **Then** aparece «Juego por las bandas»
   junto a los demás, compatible con Juego vertical.

---

### User Story 9 - Todos al área a balón parado (Priority: P1) — añadidos, tanda 1b

Como participante, quiero que en los córners y en las faltas laterales suban al área casi todos mis jugadores, los
cabeceadores los primeros, y que en la última jugada del partido, si voy perdiendo de uno, suba hasta el portero.

**Why this priority**: sin esto, Cabeceador en un central no da goles (SC-003) y el balón parado no se parece al
fútbol real.

**Independent Test**: en un córner, los objetivos del equipo que ataca ponen a todos menos dos en el área o sus
inmediaciones, con los Cabeceador entre ellos; en el último minuto del descuento perdiendo de uno, también al portero.

**Acceptance Scenarios**:

1. **Given** un córner a favor, **When** se colocan los jugadores, **Then** se quedan atrás el defensa y el medio más
   retrasados sin Cabeceador y suben todos los demás; los mejores por arriba ocupan los mejores sitios.
2. **Given** dos centrales con Cabeceador, **When** se saca el córner, **Then** los dos están en el área y pueden ser
   el rematador.
3. **Given** el último minuto del descuento de la segunda parte (o de la prórroga) y el equipo perdiendo de uno,
   **When** tiene un córner o una falta lateral, **Then** el portero sube y puede rematar; antes de ese minuto,
   empatando o perdiendo de dos, no.
5. **Given** un portero que subió y está a más de 30 m de su portería, **When** el rival tira en un contraataque,
   **Then** el tiro es a puerta vacía (sin parada).
4. **Given** el equipo que defiende, **When** el rival sube a todos, **Then** defiende el área con ocho jugadores.

---

### User Story 10 - Salir de su zona cuando la jugada lo pide (Priority: P2) — añadidos, tanda 1b

Como participante, quiero que un defensa o un medio que se encuentra con terreno por delante y solo el portero
enfrente lo encare como un delantero, y que mis medios lleguen a la frontal para tirar o recoger rechaces.

**Why this priority**: en el fútbol real marcan también los que no son delanteros; hoy los medios centro no tiran
nunca.

**Independent Test**: en una serie, los defensas y medios marcan una parte creíble de los goles de su equipo.

**Acceptance Scenarios**:

1. **Given** un defensa que gana un rechace a 5 m de la línea de medio campo, en su campo, sin ningún rival de campo
   por delante, **When** decide, **Then** juega el mano a mano: conduce hacia la portería y tira a distancia de
   disparo.
2. **Given** el balón en el último tercio rival, **When** se mueven los medios centro e interiores, **Then** llegan a
   la frontal (unos 22 m de la portería), desde donde pueden tirar con la portería a la vista o recoger el rechace.

---

### User Story 11 - Balones que se van fuera (Priority: P2) — balones fuera, tras la serie de cierre

Como participante, quiero ver córners y saques de banda como en un partido de verdad: despejes, desvíos y rechaces que
se van del campo, no un balón que siempre acaba en un jugador.

**Why this priority**: con 2,2 córners por partido el juego parece dirigido; los córners son ocasiones y el saque de
banda forma parte del ritmo del partido.

**Independent Test**: entre equipos equilibrados, entre 6 y 9 córners por partido sin que bajen los pases, los tiros,
las conducciones ni los contraataques.

**Acceptance Scenarios**:

1. **Given** un centro que despeja un defensor, **When** se resuelve el duelo, **Then** puede salir a córner.
2. **Given** un pase cortado o una entrada ganada cerca de la línea de fondo, **When** el defensor gana el duelo,
   **Then** el balón puede irse a córner; cerca de una banda, a saque de banda (de uno u otro equipo).
3. **Given** un saque de banda, **When** se reanuda, **Then** saca el jugador de campo más cercano, sin cruzar el campo.
4. **Given** un córner, **When** se colocan los jugadores, **Then** el saque no tarda más de un minuto, y el despeje
   del defensor aleja el balón del área.

---

### Edge Cases

- **Defensor sin la stat del enfrentamiento**: usa 50 (FR-019). Ejemplo: un portero que tuviera que marcar a un
  receptor.
- **Portero receptor**: no tiene desmarque ni técnica; no hay duelo de desmarque con él (nadie le marca) y en el control
  con presión usa su distribución.
- **Defensa con Presionador o con Mal defensor**: su quite es el tackling × 1,05 o × 0,95 (FR-005).
- **Presionador y Mal defensor a la vez** en un mismo jugador: los dos ajustes se suman al multiplicador (se anulan en
  el quite).
- **Jugador fuera de su posición o cansado**: los modificadores de posición, bonificaciones, cansancio y defectos de
  equipo se aplican a las stats antes de calcular el quite, el desmarque, el marcaje o la técnica, como hoy al resto de
  atributos.
- **Pase sin rival que marque al receptor** (nadie a su alcance): el receptor recibe libre, sin duelo.
- **Varios porteros o defensas líderes**: el liderazgo del portero suma solo el suyo; si varios defensas líderes están
  cerca, cuenta el mayor (no se acumulan).
- **Cartas en partidas ya empezadas**: los cambios de virtudes de las seis cartas de Core siguen las reglas de versión
  del catálogo; una partida en curso no cambia a mitad de torneo.
- **Partidos guardados con versiones anteriores del motor**: siguen reproduciéndose con su versión (la 8.0.0 no
  sustituye a la 7.0.0 en los partidos ya jugados).
- **Juego por las bandas con parámetros sin el bloque `bandas`** (no ocurre en partidos nuevos): juega como Equilibrado.
- **Portero que sube y pierde el balón**: vuelve a su sitio con el movimiento normal; si el rival tira mientras sigue a
  más de 30 m de su portería, es a puerta vacía.
- **Sin candidatos con línea clara**: no hay a quién comparar; los pesos del receptor quedan como sin estrella.

## Requirements *(mandatory)*

### Functional Requirements

**Tanda 1 — curvas y sensibilidad**

- **FR-001**: Todo duelo DEBE enfrentar un atributo del jugador que actúa contra un atributo del rival concreto que se
  le opone en esa acción, independientemente de las stats de sus compañeros.
- **FR-002**: Las curvas de duelo, sin ajustes, DEBEN caer en estos rangos (sustituyen al criterio 014/SC-008):

  | Duelo | Hoy (7.0.0) | Objetivo |
  |---|---|---|
  | Regate 98 contra quite 90 | 51 % | 44–54 % |
  | Regate 98 contra quite 70 | 73 % | 65–75 % |
  | Regate 66 contra quite 90 | 22 % | 15–25 % |
  | Pase corto 55 contra anticipación 75 | 78 % | 63–73 % |
  | Pase corto 90 contra anticipación 75 | 91 % | 80–90 % |
  | Remate 90 contra parada 80 (tiro normal a 11 m, nadie tapa) | 71 % | 64–74 % |
  | Remate 60 contra parada 90 (mismas condiciones) | 27 % | 22–32 % |
  | Conducción 90 contra quite 70 | 90 contra 60: 81 % | 72–82 % |
  | Conducción 70 contra quite 90 | 60 contra 85: 33 % | 25–35 % |

- **FR-003**: La sensibilidad DEBE ser la mínima necesaria para entrar en las curvas de FR-002: mayor que la actual en
  el regate y la conducción, algo mayor en el pase y sin cambios en el remate. No se DEBEN ampliar las diferencias más
  allá de esos rangos.
- **FR-004**: El quite de cada jugador DEBE calcularse así:
  - Defensa: su tackling.
  - Centrocampista con MD entre las posiciones de su carta (juegue donde juegue en el partido): (posicionamiento +
    velocidad) / 2 × 0,92 (0,90 hasta la calibración del 2026-11-15).
  - Centrocampista sin MD en su carta: (posicionamiento + velocidad) / 2 × 0,87 (0,85 hasta la calibración del 2026-11-15).
  - Delantero: (agresividad + velocidad) / 2 × 0,80.
  - Portero: su defensa (como hoy).
- **FR-005**: La virtud Presionador DEBE sumar 0,05 al multiplicador del quite (un delantero con Presionador: × 0,85) y
  el defecto Mal defensor DEBE restarle 0,05. Los dos ajustes se suman a lo que ya hacen hoy (Presionador conserva
  sus +8 puntos de probabilidad en contra del portador al presionar y la presión extra). En un defensa se aplican sobre
  un multiplicador implícito de 1,00: Presionador, tackling × 1,05; Mal defensor, tackling × 0,95.
- **FR-006**: En el tiro, el atacante DEBE usar su disparo si es centrocampista y su finalización si es delantero, y el
  portero, la media de su agilidad y su colocación.
- **FR-007**: La probabilidad de elegir regate y conducción DEBE crecer con la stat de regate (y con la del atacante en
  conducción) lo bastante para que un buen regateador los intente claramente más que uno normal, también cuando tiene
  espacio por delante y no solo con un rival encima (SC-002).
- **FR-008**: En el juego aéreo, el atributo de un defensa DEBE ser su anticipación, sin añadir ninguna stat nueva a las
  cartas.
- **FR-009**: La virtud Cabeceador DEBE poder tenerla cualquier jugador de campo, de cualquier demarcación. En un
  defensa (y en cualquiera que dispute un balón aéreo) DEBE sumar +15 puntos de probabilidad a su favor en ese duelo
  aéreo, en ataque y en defensa, en cualquiera de las dos áreas; en el remate de cabeza conserva su efecto actual (los
  mismos +15).
- **FR-010**: Las cartas de Core 60, 76, 77, 86, 87 y 275 (centrales) DEBEN tener la virtud Cabeceador. Todas tienen ya
  el máximo de virtudes de su nivel, así que cada una DEBE cambiar una de sus virtudes actuales por Cabeceador: 60 Marc
  cede Muro defensivo (conserva Capitanía); 76 Gabriel, Volador; 77 Joško, Potente; 86 Sergio, Intimidante; 87 Virgil,
  Aura; 275 Ronald Federico, Potente. El cambio se hace en el catálogo de Core, su única fuente, y DEBE pasar su
  validación.

**Tanda 2 — desmarque contra marcaje y técnica contra presión**

- **FR-011**: Antes de cada pase a un compañero que tenga un rival marcándole, DEBEN enfrentarse el desmarque del
  receptor y el marcaje de ese rival.
  - Si gana el receptor, recibe libre: el pase DEBE ser más fácil de completar y no hay duelo de control (FR-014).
  - Si gana el marcador, el pase DEBE ser más fácil de cortar y, si llega, el receptor recibe con el rival encima.
- **FR-012**: Las demarcaciones sin esas stats DEBEN usar otra: desmarque = visión en el centrocampista y velocidad en el
  defensa; marcaje = posicionamiento en el centrocampista y agresividad en el delantero. El defensa usa su marcaje y el
  delantero, su desmarque.
- **FR-013**: Al elegir a quién pasar, el portador DEBE dar más peso a los compañeros con más probabilidad de ganar su
  duelo de desmarque.
- **FR-014**: Cuando un jugador controla el balón con un rival encima, DEBEN enfrentarse su técnica y el quite del rival
  que presiona; si pierde, pierde el balón. El delantero usa la media de su regate y su creatividad; el portero, su
  distribución.

**Tanda 3 — liderazgo**

- **FR-015**: El liderazgo de un defensa DEBE hacer que su línea defensiva se descoloque menos cerca de él: los
  defensas cercanos guardan mejor la distancia entre sí y rompen menos la línea del fuera de juego. Son cercanos los
  defensas de su misma línea a menos de una distancia fija, que se calibra en la tanda 3. Con varios líderes cerca,
  cuenta el mayor.
- **FR-016**: El liderazgo del portero DEBE sumar a los defensas cercanos a él (los que están dentro de su área o en la
  zona propia), en sus duelos, un 2,5 % de su liderazgo en puntos (90 de liderazgo ⇒ +2,25).

**Añadidos — tanda 1b (clarificaciones del 2026-11-14)**

- **FR-025**: Al elegir receptor, el portador DEBE dar más peso a los compañeros con línea de pase clara cuanta más
  media tengan (× 2 cada 10 puntos sobre 70). Un compañero marcado o sin línea clara solo se busca de más si el pasador
  tiene (visión + pase)/2 > 80: si su media supera en más de 5 puntos a la de la mejor opción clara, pesa 1,5 veces lo
  que ella; si no, se la juega en el 40 % de los casos frente al 60 % de esa opción. Con (visión + pase)/2 ≤ 80, el
  marcado conserva su peso de hoy (los libres pesan más).
- **FR-026**: En el éxito de un pase hacia un receptor marcado (rival de campo a 3 m o menos) DEBE contar su desmarque
  contra el marcaje de ese rival: 0,003 de probabilidad por punto de diferencia. Es un anticipo del duelo de desmarque
  de FR-011, que lo sustituye desde la tanda 2.
- **FR-027**: DEBE existir el estilo con balón «Juego por las bandas», compatible con todas las demás opciones. Con él,
  el balón va a una banda tras avanzar con 0,2 más de probabilidad, laterales, carrileros y extremos (LI, LD, CI, CD, EI
  y ED) pesan × 1,5 como receptores y el peso del centro sube × 1,3.
- **FR-028**: En un córner o una falta colgada al área, el equipo que ataca DEBE subir a todos sus jugadores de campo
  menos el defensa y el medio más retrasados sin Cabeceador; los jugadores con Cabeceador suben siempre. Los mejores por
  arriba (aéreo, más 10 con Cabeceador) ocupan los sitios más cercanos al punto de remate. En el último minuto del
  descuento de la segunda parte o de la prórroga, perdiendo de uno, sube también el portero y puede ser el rematador;
  si el rival tira con el portero a más de 30 m de su portería, no hay parada (puerta vacía). El equipo que defiende
  protege el área con ocho jugadores.
- **FR-029**: Los jugadores DEBEN poder salir de su zona cuando la jugada lo pide: el mano a mano (014/FR-004) empieza
  ya 10 m dentro del campo propio para cualquier jugador con solo el portero por delante, y los medios centro e
  interiores (MC, MII, MID) llegan a la frontal (unos 22 m de la portería) cuando el balón está en el último tercio.
- **FR-030**: Los añadidos DEBEN colgar de bloques opcionales de la 8.0.0 (`estrella`, `bandas`, `subidaArea`,
  `segundaLinea` y `fueraDeCampo`; research R1): con la 7.0.0 el motor DEBE dar exactamente los mismos partidos.
- **FR-031**: Balones fuera (US11): un centro despejado DEBE poder salir a córner, y un pase cortado o una entrada ganada
  cerca de la línea de fondo, también; cerca de una banda, a saque de banda de uno u otro equipo (si es del que
  defendía, cuenta como recuperación). Más tiros parados y bloqueados DEBEN acabar en córner. El saque de banda lo DEBE
  hacer el jugador de campo más cercano; en el córner los jugadores DEBEN colocarse a la escala del reloj (el saque no
  pasa de un minuto) y el despeje DEBE alejar el balón del área. Con más córners, cada uno DEBE ser menos peligroso
  (remate y falta en el duelo aéreo), para que no cambien los goles de cabeza ni los penaltis. La carrera tras el centro
  del córner NO DEBE contar como balón suelto (014/SC-008): el duelo aéreo ya decidió quién se queda el balón.

**Comunes**

- **FR-017**: Lo que esta spec no cambia DEBE seguir como en la 7.0.0: los ajustes por zona, formación, táctica y
  virtudes, el orden de los modificadores (posición, bonificaciones, cansancio, defectos de equipo), la segunda tirada y
  la relajación.
- **FR-018**: El cálculo de cada duelo nuevo DEBE ser de coste comparable al de los actuales (unas pocas operaciones
  aritméticas, sin búsquedas ni bucles añadidos por duelo más allá de localizar al rival implicado); la simulación de un
  partido DEBE seguir dentro del umbral de rendimiento del motor que comprueba el CI.
- **FR-019**: Si en un enfrentamiento el defensor no tiene una stat con la que comparar, DEBE usarse 50.
- **FR-020**: Los pases completados por partido DEBEN cumplir el mínimo de 002/SC-007a, que baja de 150 a 130 con los
  añadidos (y el de posesiones con 3 o más pases de 002/SC-007b, del 30 % al 25 %); con la 7.0.0 eran 158,5. Las curvas del pase de FR-002 bajan el acierto; el desmarque de US4 (más pases a receptores libres) DEBE
  compensar la bajada. Al cerrar la tanda 1 se admite quedar por debajo de 150 de forma temporal; al cerrar la tanda 2
  DEBE cumplirse.
- **FR-021**: No DEBE haber regresiones (014/FR-023): 001/SC-004 (con +5 de media, el mejor gana al menos el 60 % y el
  peor al menos el 10 %), los criterios de goles de la 003 y los de la 005 DEBEN seguir en verde.
- **FR-022**: Los resultados del motor cambian, así que DEBE publicarse una versión nueva de los parámetros (8.0.0); los
  partidos guardados con versiones anteriores DEBEN seguir reproduciéndose igual. DEBEN regenerarse las referencias de
  equivalencia, la huella del motor y los escenarios de prueba.
- **FR-023**: La documentación DEBE quedar al día: [enfrentamientos.md](../../docs/juego/enfrentamientos.md) (tabla carta
  → atributo, curvas, nuevos duelos, §7 y §8) y, como cambian Presionador, Mal defensor y Cabeceador, el documento de
  virtudes y defectos, regenerado desde el catálogo de rasgos.
- **FR-024**: El informe de equilibrado DEBE comprobar las curvas de FR-002 (sustituyendo a 014/SC-008-pase,
  014/SC-008-remate y 014/SC-008-fisico) y los criterios nuevos de esta spec (SC-002 a SC-007).

### Key Entities

- **Carta de jugador**: seis stats según su demarcación (POR: agilidad, colocación, distribución, aéreo, defensa,
  liderazgo; DEF: velocidad, técnica, tackling, anticipación, marcaje, liderazgo; MED: velocidad, técnica, pase,
  posicionamiento, visión, disparo; DEL: velocidad, regate, finalización, desmarque, creatividad, agresividad), sus
  posiciones y sus virtudes y defectos. Esta spec no añade stats.
- **Atributo de partido**: valor que usa el motor en cada duelo, derivado de las stats de la carta. Cambian el quite
  (FR-004), y pasan a usarse el desmarque, el marcaje, la técnica y el liderazgo.
- **Duelo**: acción, atacante, defensor, atributos enfrentados, base, sensibilidad y ajustes. Se añaden dos: desmarque
  contra marcaje y técnica contra presión.
- **Rasgo**: Presionador, Mal defensor y Cabeceador cambian de efecto; Cabeceador cambia también de ámbito (de
  delantero a cualquier jugador de campo).
- **Versión de parámetros del motor**: 8.0.0, con los valores de las tres tandas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Los nueve duelos de FR-002 (siete de regate, pase y remate, y dos de conducción) caen en su rango,
  calculados sin ajustes.
- **SC-002**: En series de 1.000 partidos, un delantero con 95 de regate intenta al menos un 40 % más de regates y
  conducciones por partido que el mismo con 75, y completa al menos un 60 % más; y el mejor regateador del catálogo
  supera a algún defensor en regate o conducción en al menos el 80 % de los partidos que juega (rebajado del 90 % tras
  la serie de los añadidos).
- **SC-003**: En series de 1.000 partidos, los defensas con Cabeceador ganan más duelos aéreos y sus equipos marcan
  más goles de cabeza que sin la virtud, con diferencia significativa (los goles de cabeza de esos defensas, no los del
  equipo).
- **SC-004**: En series de 1.000 partidos, un receptor con 15 puntos más de desmarque recibe libre más a menudo y recibe
  más pases completados; un marcador con 15 puntos más de marcaje deja al receptor menos veces libre. Las dos
  diferencias son significativas.
- **SC-005**: En series de 1.000 partidos, un jugador con 15 puntos más de técnica pierde al menos un 15 % menos balones
  en los controles con presión.
- **SC-006**: En series de 1.000 partidos, una línea defensiva con un central de 95 de liderazgo rompe la línea del
  fuera de juego al menos un 10 % menos que con uno de 70; y los defensas con un portero de 95 de liderazgo ganan más
  duelos que con uno de 70.
- **SC-007**: Las siete comprobaciones hoy pendientes (014/SC-008-pase, 014/SC-008-remate y 014/SC-008-fisico, ya como
  curvas; 002/SC-008, 003/SC-009, 003/SC-005 y 003/SC-007) pasan y salen de la lista de pendientes del CI, que queda
  vacía; el informe de equilibrado completo pasa sin ninguna comprobación pendiente.
- **SC-008**: Siguen en verde todos los criterios que pasaban con la 7.0.0, en particular 001/SC-004, los de goles de
  la 003 y los de la 005, y el mínimo de 130 pases completados (FR-020) al cerrar la tanda 2.
- **SC-009**: La simulación de un partido sigue dentro del umbral de rendimiento del motor del CI, y no tarda más de
  un 10 % que con la 7.0.0.
- **SC-010**: La simulación rápida y la 2D siguen dando exactamente el mismo partido con la misma semilla (001/SC-008),
  con las referencias regeneradas para la 8.0.0.
- **SC-011**: En series de 1.000 partidos, el mismo equipo con «Juego por las bandas» da más toques (pases,
  conducciones y regates) a sus laterales y extremos y centra más que con «Equilibrado», con diferencia significativa.
- **SC-012**: En series de 1.000 partidos repartidos entre 20 equipos (las diez formaciones, con tácticas distintas, y
  rivales de otra formación), los defensas y medios marcan entre el 15 % y el 30 % de los goles de su equipo (el máximo
  era el 40 % y se medía con un solo equipo hasta el 2026-11-15).
- **SC-013**: En series de 1.000 partidos entre equipos equilibrados, hay entre 6 y 9 córners por partido (media
  buscada, 7,5) y siguen en verde los mínimos de 002/SC-007a y los criterios de FR-021.

## Decisiones abiertas

Ninguna: las ocho se resolvieron en [Clarifications](#clarifications) (sesión del 2026-11-14).

## Assumptions

- Las stats de la carta no cambian de rango ni se añaden stats; los nombres de las demarcaciones y posiciones son los
  del catálogo actual.
- La anticipación del centrocampista y del delantero (pases y tiros) no cambia: esta spec solo redefine su quite.
- El atacante de la conducción sigue siendo (velocidad + físico) / 2; lo que cambia es su sensibilidad y el quite del
  defensor.
- Las curvas de FR-002 se miden sin ajustes; en partido, los ajustes de zona, táctica y virtudes las desplazan como hoy.
- La persona ajustará a mano algunas cartas en la base de datos para adaptarlas al motor nuevo. Esos ajustes no forman
  parte de esta spec, pero las series de calibración se hacen con el catálogo de Core en el repositorio; si el
  catálogo cambia antes del cierre, la última serie se repite con él.
- Cada `pnpm balance --n 1000` dura unos 105 minutos; entre tandas se usan series reducidas y diagnósticos para probar
  valores, y la serie completa solo para cerrar cada tanda.
- Los partidos ya jugados con la 7.0.0 conservan su versión y su resultado.
