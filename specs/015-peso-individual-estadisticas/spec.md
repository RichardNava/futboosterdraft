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
- **Tanda de calibración**: bloque de cambios que se mide con una serie completa de equilibrado (unos 105 minutos con
  1.000 partidos) antes de pasar al siguiente.

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
   intenta quitar el balón, **Then** su quite vale (80 + 70) / 2 × 0,85 = 63,75.
4. **Given** el mismo centrocampista con la virtud Presionador, **When** intenta quitar el balón, **Then** su quite vale
   (80 + 70) / 2 × 0,90 = 67,5; con Mal defensor (y sin Presionador), (80 + 70) / 2 × 0,80 = 60.
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
   revisan sus acciones, **Then** en al menos el 90 % de los partidos supera a algún defensor en regate o en conducción.

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
   anticipación en ese duelo es mayor que sin la virtud.
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

### Edge Cases

- **Defensor sin la stat del enfrentamiento**: usa 50 (FR-019). Ejemplo: un portero que tuviera que marcar a un
  receptor.
- **Portero receptor**: no tiene desmarque ni técnica; no hay duelo de desmarque con él (nadie le marca) y en el control
  con presión usa su distribución.
- **Defensa con Presionador o con Mal defensor**: su quite es el tackling; ver FR-005.
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
  | Conducción [NEEDS CLARIFICATION: ¿qué curva objetivo debe cumplir la conducción, que sustituye a 014/SC-008-fisico? Propuesta: 90 contra quite 70, 72–82 %; 70 contra quite 90, 25–35 %] | 90 contra 60: 81 %; 60 contra 85: 33 % | — |

- **FR-003**: La sensibilidad DEBE ser la mínima necesaria para entrar en las curvas de FR-002: mayor que la actual en
  el regate y la conducción, algo mayor en el pase y sin cambios en el remate. No se DEBEN ampliar las diferencias más
  allá de esos rangos.
- **FR-004**: El quite de cada jugador DEBE calcularse así:
  - Defensa: su tackling.
  - Centrocampista con MD entre sus posiciones: (posicionamiento + velocidad) / 2 × 0,90.
  - Centrocampista sin MD: (posicionamiento + velocidad) / 2 × 0,85.
  - Delantero: (agresividad + velocidad) / 2 × 0,80.
  - Portero: su defensa (como hoy).
- **FR-005**: La virtud Presionador DEBE sumar 0,05 al multiplicador del quite (un delantero con Presionador: × 0,85) y
  el defecto Mal defensor DEBE restarle 0,05, además de lo que ya hace hoy. [NEEDS CLARIFICATION: ¿el +0,05 de
  Presionador sustituye a su efecto actual (+8 puntos de probabilidad en contra del portador al presionar y más
  presión) o se suma a él? ¿Y en un defensa, cuyo quite es el tackling sin multiplicador, se aplica sobre un
  multiplicador implícito de 1,00 (Presionador × 1,05; Mal defensor × 0,95) o no le afecta?]
- **FR-006**: En el tiro, el atacante DEBE usar su disparo si es centrocampista y su finalización si es delantero, y el
  portero, la media de su agilidad y su colocación.
- **FR-007**: La probabilidad de elegir regate y conducción DEBE crecer con la stat de regate (y con la del atacante en
  conducción) lo bastante para que un buen regateador los intente claramente más que uno normal, también cuando tiene
  espacio por delante y no solo con un rival encima (SC-002).
- **FR-008**: En el juego aéreo, el atributo de un defensa DEBE ser su anticipación, sin añadir ninguna stat nueva a las
  cartas.
- **FR-009**: La virtud Cabeceador DEBE poder tenerla cualquier jugador de campo, de cualquier demarcación. En un
  defensa (y en cualquiera que dispute un balón aéreo) DEBE mejorar el atributo con el que disputa ese duelo aéreo, en
  ataque y en defensa; en el remate de cabeza conserva su efecto actual.
- **FR-010**: Las cartas de Core 60, 76, 77, 86, 87 y 275 (centrales) DEBEN tener la virtud Cabeceador. Todas tienen ya
  el máximo de virtudes de su nivel, así que cada una DEBE cambiar una de sus virtudes actuales por Cabeceador (ver
  Decisiones abiertas). El cambio se hace en el catálogo de Core, su única fuente, y DEBE pasar su validación.

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
  defensas cercanos guardan mejor la distancia entre sí y rompen menos la línea del fuera de juego. Con varios líderes
  cerca, cuenta el mayor.
- **FR-016**: El liderazgo del portero DEBE sumar a los defensas cercanos a él, en sus duelos, un 2,5 % de su liderazgo
  en puntos (90 de liderazgo ⇒ +2,25).

**Comunes**

- **FR-017**: Lo que esta spec no cambia DEBE seguir como en la 7.0.0: los ajustes por zona, formación, táctica y
  virtudes, el orden de los modificadores (posición, bonificaciones, cansancio, defectos de equipo), la segunda tirada y
  la relajación.
- **FR-018**: El cálculo de cada duelo nuevo DEBE ser de coste comparable al de los actuales (unas pocas operaciones
  aritméticas, sin búsquedas ni bucles añadidos por duelo más allá de localizar al rival implicado); la simulación de un
  partido DEBE seguir dentro del umbral de rendimiento del motor que comprueba el CI.
- **FR-019**: Si en un enfrentamiento el defensor no tiene una stat con la que comparar, DEBE usarse 50.
- **FR-020**: Los pases completados por partido DEBEN cumplir el mínimo de 002/SC-007a. [NEEDS CLARIFICATION: las
  curvas del pase de FR-002 bajan el acierto (hoy 158,5 pases completados, mínimo 150). ¿Se mantiene el mínimo de 150 y
  el desmarque de US4 (más pases a receptores libres) debe compensar la bajada, o se revisa ese mínimo y a qué valor?]
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

- **SC-001**: Los siete duelos de FR-002 (y el de conducción que se acuerde) caen en su rango, calculados sin ajustes.
- **SC-002**: En series de 1.000 partidos, un delantero con 95 de regate intenta al menos un 40 % más de regates y
  conducciones por partido que el mismo con 75, y completa al menos un 60 % más; y el mejor regateador del catálogo
  supera a algún defensor en regate o conducción en al menos el 90 % de los partidos que juega.
- **SC-003**: En series de 1.000 partidos, los defensas con Cabeceador ganan más duelos aéreos y sus equipos marcan
  más goles de cabeza a balón parado que sin la virtud, con diferencia significativa.
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
  la 003 y los de la 005, y el mínimo de pases completados que se acuerde (FR-020).
- **SC-009**: La simulación de un partido sigue dentro del umbral de rendimiento del motor del CI, y no tarda más de
  un 10 % que con la 7.0.0.
- **SC-010**: La simulación rápida y la 2D siguen dando exactamente el mismo partido con la misma semilla (001/SC-008),
  con las referencias regeneradas para la 8.0.0.

## Decisiones abiertas

Para revisar con `/speckit-clarify` antes de planificar:

1. **Mínimo de pases completados (FR-020)**: mantener 150 y compensar con el desmarque, o revisar el mínimo.
2. **Presionador y Mal defensor (FR-005)**: si el +0,05 de Presionador sustituye o se suma a su efecto actual, y cómo se
   aplican los dos en un defensa.
3. **Curva de la conducción (FR-002)**: rango objetivo que sustituye a 014/SC-008-fisico.
4. **Virtud que cede cada central por Cabeceador (FR-010)**: propuesta, quitar una virtud repetida o de menos peso en su
   juego: 60 Marc, Muro defensivo (se queda Capitanía); 76 Gabriel, Volador; 77 Joško, Potente; 86 Sergio, Intimidante;
   87 Virgil, Aura; 275 Ronald Federico, Potente.
5. **Cuánto mejora Cabeceador el juego aéreo (FR-009)**: propuesta, los mismos +15 puntos de probabilidad que hoy da en
   el remate de cabeza, también en los duelos aéreos defensivos.
6. **«Con MD» (FR-004)**: se entiende que la carta tiene MD entre sus posiciones, no que juegue en esa posición en el
   partido.
7. **Quién es «cercano»** al defensa líder y al portero (FR-015, FR-016): propuesta, los defensas de la misma línea a
   menos de una distancia fija (a calibrar en la tanda 3) y, para el portero, los defensas dentro de su área o en la
   zona propia.
8. **Umbrales de SC-002 a SC-006**: los porcentajes son una primera propuesta; se pueden ajustar antes de planificar.

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
