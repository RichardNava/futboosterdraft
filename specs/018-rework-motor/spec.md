# Feature Specification: Rework del motor: fatiga, tácticas y rendimiento

**Feature Branch**: `018-rework-motor`

**Created**: 2026-11-21

**Status**: Draft

**Input**: User description: "Spec 018 (INI-16): rework del motor con fatiga, tácticas y rendimiento. Absorbe INI-06 y el trabajo futuro de motor de INI-07." Las decisiones y los valores de la persona responsable están en los requisitos; sus valores son puntos de partida y los umbrales finales los decide ella en la calibración.

## Clarifications

### Session 2026-11-21

- Q: Las huellas guardan resultados exactos y calibrar los cambia: ¿se regenera antes o después de calibrar? → A: Después. El orden es medir, implementar, calibrar, regenerar una sola vez, optimizar y validar (FR-001).
- Q: ¿Qué se hace al desplegar con las partidas activas, cuyos partidos 8.x a medias no se pueden reconstruir? → A: Se cierran al desplegar con un paso único e idempotente, con aviso y devolución de lo cobrado (FR-046 a FR-049).
- Q: ¿Con qué referencia se decide si un jugador ha hecho más o menos acciones intensas que la media? → A: Una referencia fija por rol, medida al calibrar con equipos neutros (Bloque medio) y guardada en los parámetros 9.0.0 (FR-008).
- Q: Con marcaje Individual, ¿quién debe ser el marcador de la estrella rival y qué pasa si alguno de los dos sale del campo? → A: El defensa con más marcaje; si no hay, el medio y, en último caso, el delantero. Si uno sale, el marcaje de la estrella termina sin nueva elección y el equipo conserva los demás efectos y costes de Individual (FR-026).
- Q: Si mover a los jugadores cada 4 ticks no basta para llegar a 60 ms por partido, ¿se permite también recalcular cada 8 ticks el punto al que quiere ir cada jugador? → A: Solo si la medida lo exige: antes de calibrar se mide en CI con movimiento cada 4 ticks y la mejora de los saques, y si sigue por encima de 60 ms se pasa a 8 ticks (FR-003).
- Q: Cuando un equipo que juega por las bandas pierde el balón en una banda, ¿qué acción del rival debe recibir la ventaja de +0,15? → A: Su primera acción tras recuperar, solo si sigue por esa banda (pase a ese carril, o regate, conducción o centro por él); si va a otro carril, la ventaja se pierde (FR-029).
- Q: ¿Se confirman como reglas definitivas las nueve asunciones pendientes? → A: Sí, salvo Indisciplinado: cada acción intensa le cuesta ×1,5 en lugar del doble, sin tiradas nuevas, y llega al 90' con 44 de energía con acciones medias (FR-010a, FR-015, FR-016, FR-027).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - La fatiga se nota y se puede gestionar (Priority: P1)

Quien dirige un equipo ve cómo cada jugador pierde energía según su rol, sus rasgos y lo que corre en el partido, y decide los cambios con esa información. Un medio se cansa más que un portero, un Incansable aguanta y un Fatigado llega justo al final.

**Why this priority**: es el cambio principal de la spec; hoy casi nadie se cansa antes del minuto 65 y todos los roles se cansan igual.

**Independent Test**: se juega una serie de partidos con equipos sintéticos y el informe de equilibrado muestra la energía por rol y por rasgo; en una pausa de «Gestionar equipo» se comprueba que el indicador coincide.

**Acceptance Scenarios**:

1. **Given** un jugador de referencia con acciones medias, **When** llega al 45', **Then** tiene 85 de energía; tras el descanso, 95; al 55', 95, y al 90', 60.
2. **Given** ese jugador en un partido con prórroga, **When** llega al 120', **Then** tiene 40 de energía.
3. **Given** cuatro jugadores sin rasgos, uno por rol y con acciones medias, **When** llegan al 90', **Then** tienen 93 (portero), 67,5 (defensa), 50 (medio) y 62,5 (delantero).
4. **Given** dos jugadores del mismo rol, **When** uno hace más acciones intensas que la media y el otro menos, **Then** el primero termina con menos energía que la curva de su rol y el segundo con más.
5. **Given** un jugador con 60 de energía, **When** disputa un duelo, **Then** sus stats físicas bajan un 15,5 %, las técnicas un 7,75 % y las mentales un 3,875 %.
6. **Given** una pausa de «Gestionar equipo», **When** se mira un jugador cansado, **Then** el indicador muestra su penalización física y la ayuda explica también la técnica y la mental.
7. **Given** un NPC con un jugador por debajo de su umbral de energía, **When** llega una pausa con cambios disponibles, **Then** lo sustituye según esa energía.

---

### User Story 2 - Cada táctica tiene una ventaja y un coste reales (Priority: P1)

Quien elige la táctica nota su efecto y paga su coste: Catenaccio cierra el área sin anular el juego, Individual frena a la estrella rival y abre huecos, y las bandas y el juego vertical dejan de ser una combinación gratuita.

**Why this priority**: la táctica es una decisión central del juego (principio I) y hoy algunas opciones pesan demasiado o no tienen coste.

**Independent Test**: se juegan series de cada táctica contra un rival neutro y el informe compara goles, victorias, energía y acciones con la línea base de la 8.0.0.

**Acceptance Scenarios**:

1. **Given** un equipo con Catenaccio, **When** el rival juega en las zonas 4 o 5, **Then** sus acciones sufren −0,50 en x, salvo centros y tiros lejanos; en la zona 3 no sufren nada.
2. **Given** un equipo con marcaje Individual, **When** empieza el partido, **Then** su defensa con más marcaje sigue a la estrella rival y esta juega con −5 en los duelos directos contra él; si uno de los dos sale del campo, ese marcaje termina sin nueva elección.
3. **Given** un equipo por las bandas que pierde el balón en una banda, **When** la primera acción del rival tras recuperar sigue por esa banda, **Then** gana +0,15 en x; si va a otro carril, no gana nada.
4. **Given** un equipo con juego vertical, **When** intenta un pase largo o al espacio, **Then** ese pase resta 0,15 en x.
5. **Given** un equipo con Bandas y Vertical, **When** se calcula su juego, **Then** sus centros pesan ×1,8, el balón va +25 puntos por banda y paga los costes de ambas.
6. **Given** un equipo con Línea adelantada, **When** tiene o no tiene el balón, **Then** su línea está 4,7 m más arriba.
7. **Given** un equipo con Presión alta, **When** termina el partido, **Then** su cansancio solo procede de las presiones realizadas y es mayor, de forma medible, que con Bloque medio.

---

### User Story 3 - Simular cuesta menos y la vista 2D sigue fluida (Priority: P1)

Quien juega no espera más por tener muchas partidas a la vez y sigue viendo el partido 2D sin tirones, aunque los jugadores se calculen con menos frecuencia.

**Why this priority**: el coste de simular es hoy el límite de la carga de la beta (INI-07) y está en el camino crítico.

**Independent Test**: el umbral de rendimiento del CI pasa con los cuatro casos, y una reproducción 2D se ve continua a 60 fps.

**Acceptance Scenarios**:

1. **Given** el motor final, **When** se ejecuta la medida oficial en CI con Node 22, **Then** un partido cuesta ≤ 60 ms sin fotogramas y ≤ 80 ms con fotogramas.
2. **Given** los jugadores moviéndose cada 4 ticks, **When** se reproduce un partido en 2D, **Then** se mueven de forma continua, sin paradas alternas ni saltos.
3. **Given** la misma semilla y las mismas decisiones, **When** se juega con y sin fotogramas, **Then** el partido es idéntico.
4. **Given** un partido entre NPC y otro con humanos, **When** se simulan, **Then** usan la misma cadencia y el mismo motor.
5. **Given** las huellas regeneradas tras calibrar, **When** se aplica cada optimización, **Then** los resultados siguen idénticos.

---

### User Story 4 - El equilibrio se decide con medidas (Priority: P1)

La persona responsable ve qué hacía el motor antes, qué hace después y qué umbrales se proponen, con su explicación, y decide los valores finales.

**Why this priority**: cambiar fatiga y tácticas puede romper la calibración de INI-05 (76 de 76); sin esta decisión no se puede cerrar la spec.

**Independent Test**: la persona responsable lee el informe comparativo y aprueba o corrige cada umbral sin leer código.

**Acceptance Scenarios**:

1. **Given** el motor 8.0.0 sin tocar, **When** se mide la línea base, **Then** queda registrado el efecto de cada táctica en goles y victorias, la fatiga y el coste.
2. **Given** una comprobación que deja de cumplirse tras los cambios, **When** se propone un umbral nuevo, **Then** se registran el valor anterior, el medido, el motivo y la aprobación de la persona responsable.
3. **Given** los umbrales aprobados, **When** se ejecuta `pnpm balance`, **Then** todas las comprobaciones pasan.

---

### User Story 5 - El paso a la 9.0.0 no deja nada colgado (Priority: P2)

Quien tenía una partida activa al desplegar recibe un aviso claro y recupera lo que pagó por ella, y quien mira un partido antiguo sigue viendo su resumen.

**Why this priority**: es imprescindible para desplegar, pero solo actúa una vez y la beta aún no es pública.

**Independent Test**: sobre una base de datos con partidas en cada estado, se ejecuta el cierre dos veces y se comprueban los estados, los avisos, los saldos y los resúmenes.

**Acceptance Scenarios**:

1. **Given** una partida en draft o en torneo creada antes del despliegue, **When** se ejecuta el cierre, **Then** queda cerrada, sus participantes reciben un aviso y ningún partido queda en juego.
2. **Given** una partida cerrada con nivel de rareza pagado, **When** se ejecuta el cierre, **Then** quien la creó recupera el importe una sola vez, aunque el cierre se repita.
3. **Given** un partido terminado con la 7.x o la 8.x, **When** se abre, **Then** se ve su resumen y un mensaje de que su repetición 2D ya no está disponible.

---

### Edge Cases

- **Descuento largo**: sigue gastando energía al ritmo del tramo en curso; los valores de referencia del 45', 90' y 120' no incluyen el descuento.
- **Energía en los límites**: nunca baja de 0 ni sube de 100, también al recuperar. Un portero llega al descanso con 97 y sale con 100, no con 107.
- **Medio con Fatigado e Indisciplinado**: la pareja no es incompatible (ninguna carta la tiene hoy) y llegaría al 90' con unos 7 de energía. Si el descuento o la prórroga la agotan, se queda en 0, con la penalización máxima.
- **Suplente**: entra con 100 aunque entre en un tramo de fatiga, y desde ese momento gasta según el reloj del partido. Si entra en el descanso, no recibe recuperación.
- **Jugador que cambia de posición**: su ritmo pasa a ser el del rol de la nueva posición desde ese momento; la energía gastada no se recalcula.
- **Motivador que sale o entra**: el ritmo ×0,95 solo se aplica mientras está en el campo. Varios Motivadores no acumulan el efecto; con dos en el campo, cada uno se beneficia del otro, como hoy.
- **Estrella o marcador que salen del campo** (lesión, expulsión o cambio): el marcaje de la estrella termina para el resto del partido, también en la prórroga, y quien entre no lo hereda (FR-026).
- **La mayor media del rival es su portero**: el portero no puede ser la estrella, porque nadie puede seguirlo.
- **Empates** de media o de marcaje: se resuelven con una regla determinista, igual en rápida y en 2D.
- **Equipo con menos de 11**: si al empezar el partido no hay al menos un jugador de campo en cada equipo, no hay marcaje de la estrella; los demás efectos de Individual se mantienen.
- **Liderazgo**: hoy se lee de la carta sin cansancio; con esta spec también pierde su 25 % de penalización, incluido su uso para ordenar la línea defensiva.
- **Partida en búsqueda de rivales al desplegar**: no tiene partidos, no se cierra y jugará con la 9.0.0.
- **Partido terminado de una partida cerrada**: conserva su resumen; la partida no reparte premios ni fragmentos de un torneo que no terminó.

## Requirements *(mandatory)*

### Functional Requirements

**Orden de trabajo**

- **FR-001**: El trabajo DEBE seguir este orden: (1) medir la línea base del motor 8.0.0; (2) implementar fatiga, tácticas, parámetros 9.0.0 y cadencia de movimiento, y medir en CI si hace falta espaciar los objetivos (FR-003); (3) calibrar con umbrales aprobados por la persona responsable; (4) regenerar una sola vez equivalencia y semillas; (5) optimizar sin cambiar resultados; (6) validar con CI y con la prueba de carga.
- **FR-002**: La línea base DEBE medirse antes de cambiar el motor y registrar, para cada táctica y con series reproducibles, su efecto en goles y victorias, la fatiga por rol y el coste por partido.
- **FR-003**: Todo cambio que altere resultados DEBE entrar antes de cerrar la calibración. Antes de calibrar DEBE medirse en CI, con Node 22, el motor con movimiento cada 4 ticks y sin repetir durante los saques el cálculo de objetivos que no haya cambiado. Si supera 60 ms sin fotogramas, los objetivos DEBEN pasar de calcularse cada 4 ticks a cada 8 antes de calibrar; si no, se mantienen cada 4. Si ni con 8 ticks se alcanza FR-039, la persona responsable DEBE decidir cómo seguir antes de calibrar. La fase de optimización NO DEBE cambiar ningún resultado.
- **FR-004**: Durante la calibración DEBE seguir en verde la igualdad entre simulación rápida y 2D, aunque las huellas exactas aún no estén regeneradas.

**Fatiga: energía y gasto**

- **FR-005**: Cada jugador DEBE tener una energía de 0 a 100, que empieza en 100, nunca supera 100 ni baja de 0. Los suplentes DEBEN entrar con 100.
- **FR-006**: El jugador de referencia (ritmo ×1, acciones medias, sin rasgos) DEBE seguir esta curva:

  | Momento | Energía |
  |---|---|
  | Hasta el 30' | 100 |
  | Del 30' al 45' | baja 1 por minuto, hasta 85 |
  | Descanso | +10 (95) |
  | Hasta el 55' | se mantiene en 95 |
  | Del 55' al 90' | baja 1 por minuto, hasta 60 |
  | Antes de la prórroga | +5 (65) |
  | Primera parte de la prórroga | baja 1 por minuto, hasta 50 |
  | Descanso de la prórroga | +5 (55) |
  | Segunda parte de la prórroga | baja 1 por minuto, hasta 40 al 120' |

- **FR-007**: El descuento DEBE cansar al ritmo del tramo en curso.
- **FR-008**: El gasto DEBE repartirse en un 80 % por rol y un 20 % por acciones intensas (sprints, presión, regates y duelos). Las «acciones medias» son una referencia fija por rol, medida al calibrar con equipos neutros (Bloque medio) y guardada en los parámetros 9.0.0; no se recalcula en cada partido. Un jugador que iguala la referencia de su rol DEBE seguir la curva de ese rol; si la supera o no la alcanza, DEBE gastar más o menos.
- **FR-009**: Las acciones intensas DEBEN gastar solo dentro de los tramos de fatiga. Cada una DEBE contarse con una regla determinista, igual en rápida y en 2D, sin consumir azar. Su coste exacto se fija al calibrar, de modo que sumen el 20 % del gasto.
- **FR-010**: El ritmo por rol DEBE ser el de esta tabla. La energía al 90' indicada es **con acciones medias**, que es la que sigue la curva; sin ninguna acción intensa, el jugador solo gasta su 80 %:

  | Rol | Ritmo | Energía al 90' con acciones medias | Sin ninguna acción |
  |---|---|---|---|
  | Portero | ×0,2 | 93 | 94,4 |
  | Defensa | ×0,85 | 67,5 | 76 |
  | Medio | ×1,2 | 50 | 62 |
  | Delantero | ×0,95 | 62,5 | 72 |

- **FR-010a**: El ritmo de un jugador DEBE ser el producto de los multiplicadores de su rol, sus rasgos y la táctica. El rol es el de la posición que ocupa en cada momento, no la demarcación de su carta.

**Fatiga: penalización de stats**

- **FR-011**: La penalización física DEBE calcularse por tramos acumulados y sin saltos: 0,35 por punto perdido de 100 a 70, 0,5 de 70 a 45 y 0,7 de 45 a 0. Ejemplos: energía 85, 5,25 %; 60, 15,5 %; 45, 23 %; 0, 54,5 %.
- **FR-012**: La penalización DEBE aplicarse a cada stat según su tipo:
  - Físicas (100 %): velocidad, físico, quite y aéreo.
  - Técnicas (50 %): pase, regate, remate, centro, técnica, paradas, desmarque y marcaje.
  - Mentales (25 %): visión, anticipación y liderazgo, también en los usos del liderazgo que hoy no tienen cansancio.

**Fatiga: rasgos y tácticas**

- **FR-013**: **Incansable** DEBE multiplicar su ritmo por 0,70 (75 de energía al 90' para el jugador de referencia).
- **FR-014**: **Fatigado** DEBE multiplicar su ritmo por 1,30 (45 al 90'), simétrico con Incansable, y DEBE perder su regla actual de empezar a cansarse en la segunda parte.
- **FR-015**: **Indisciplinado** DEBE empezar a cansarse en el 25' y en el 50', en lugar del 30' y el 55', y cada acción intensa DEBE costarle ×1,5, sin tiradas de azar nuevas (44 al 90' con acciones medias). DEBE perder su multiplicador de ritmo actual.
- **FR-016**: **Motivador** DEBE dar a sus compañeros en el campo ritmo ×0,95 y una recuperación de +15 en lugar de +10 en el descanso del partido, no en las pausas de la prórroga, si está en el campo al pitarse el descanso, antes de los cambios de esa pausa. No se aplica a sí mismo y cuenta una sola vez por equipo. Para el jugador de referencia, 66,75 al 90'.
- **FR-017**: **Presión alta** DEBE perder su inicio adelantado del cansancio y su multiplicador. Solo DEBE cansar mediante las presiones realizadas, que cuentan como acciones intensas, y DEBE comprobarse que sigue teniendo un coste real (SC-005).
- **FR-018**: **Individual** DEBE multiplicar el ritmo del equipo por 1,05 y el del marcador de la estrella por 1,15 mientras dure ese marcaje (57,5 y 49,6 al 90' para el jugador de referencia).

**Fatiga: consecuencias**

- **FR-019**: Los NPC DEBEN decidir los cambios por energía, no por el porcentaje de stats perdido, manteniendo el orden de sus niveles (001/SC-010).
- **FR-020**: El indicador DEBE mostrar la penalización física, y su ayuda DEBE detallar también la técnica y la mental. Los cinco tramos de color y la regla de mostrar la penalización por debajo de 80 de energía (014/FR-016) no cambian.
- **FR-021**: La ayuda DEBE poder derivar la penalización técnica y la mental de la física, sin añadir campos al mensaje de energía del partido (ver Dependencias, spec 017).
- **FR-022**: DEBEN actualizarse los textos de la interfaz que citan los minutos 65 y 55, y las descripciones de los rasgos, regenerando su documento con `pnpm --filter @fbd/domain rasgos:doc`.
- **FR-023**: Este diseño sustituye 001/FR-036 y 014/SC-006. DEBEN anotarse como sustituidos, y revisarse en la 014: FR-014, FR-015, FR-018, FR-019, los escenarios 1 y 2 de la US4, los casos límite de prórroga y de pausa antes del cansancio, y la asunción de la relación entre energía y penalización.

**Tácticas**

- **FR-024**: **Catenaccio** DEBE aplicar al rival −0,50 en x solo en las zonas 4 y 5 y sin afectar a centros ni a tiros lejanos, en lugar de −0,90 en las zonas 3 a 5 en todas las acciones. Mantiene sus costes ofensivos. Estimación de partida: pase al espacio −18 pp y tiro en el área −9 pp, porque los desplazamientos de táctica cuentan la mitad en el tiro, como hoy.
- **FR-025**: **Individual** DEBE dar +6 de marcaje en el duelo de desmarque.
- **FR-026**: Con **Individual**, al empezar el partido se fijan la estrella (el rival de campo con mayor media efectiva) y su marcador (el defensa con más marcaje; si no hay, el medio con más marcaje y, en último caso, el delantero, según la posición que ocupan). El portero queda excluido de ambos papeles. El marcador DEBE seguir a la estrella, y la estrella DEBE tener −5 en los duelos directos contra él. Si cualquiera de los dos sale del campo, el marcaje de la estrella termina para el resto del partido, sin nueva elección: desaparecen ese −5 y el ritmo ×1,15 del marcador, y el equipo conserva los demás efectos y costes de Individual.
- **FR-027**: Con **Individual**, los compañeros de la estrella DEBEN ganar +0,05 en x en sus duelos, y el regate rival, +0,12 en x (unos +4 pp). Los desplazamientos se suman: un compañero de la estrella que regatea gana +0,17 en x. Ambos efectos siguen si termina el marcaje de la estrella; si es ella quien ha salido, el +0,05 se aplica a todos los rivales de campo.
- **FR-028**: El nuevo sistema de **Individual** sustituye sus ajustes actuales de duelo (−0,04 general y +0,08 en pase al espacio).
- **FR-029**: **Por las bandas**: al perder el balón en una banda, la primera acción del rival tras recuperarlo DEBE ganar +0,15 en x si sigue por esa banda (pase a ese carril, o regate, conducción o centro por él). Si va a otro carril, la ventaja se pierde, y una pérdida en el carril central no da ventaja. El peso del pase al espacio propio DEBE bajar un 10 %.
- **FR-030**: **Juego vertical**: sus pases largos y al espacio DEBEN restar 0,15 en x.
- **FR-031**: **Bandas + Vertical** DEBE dar centros ×1,8 (no ×2,08) y +25 puntos de balón por banda (no +35), pagando los costes de ambas.
- **FR-032**: **Línea adelantada** DEBE subir 4,7 m con y sin balón y mantener el riesgo actual del pase al espacio.
- **FR-033**: Contraataque, Combinativo y los efectos de duelo de Presión alta NO DEBEN cambiar.

**Parámetros y versiones**

- **FR-034**: Todos los valores de táctica DEBEN estar en los parámetros 9.0.0, incluidos los multiplicadores hoy fijos en `packages/engine/src/modificadores/formacionTactica.ts`.
- **FR-035**: Los parámetros sin uso `tacticas.vertical` y `tacticas.combinativo.posesion` DEBEN desaparecer en la 9.0.0.
- **FR-036**: El motor DEBE simular solo la 9.x. Los partidos 7.x y 8.x DEBEN conservar su resumen y perder la repetición 2D mediante el mecanismo existente de versión no reproducible.
- **FR-037**: DEBEN retirarse las ramas de versiones antiguas del motor y migrarse las pruebas y las huellas afectadas.
- **FR-038**: Toda la lógica nueva DEBE vivir en el motor único y funcionar igual en rápida y en 2D (principio V).

**Rendimiento**

- **FR-039**: Un partido DEBE costar ≤ 60 ms sin fotogramas y ≤ 80 ms con fotogramas, en CI con Node 22 y los parámetros actuales. `resolverResto` y el partido con métricas DEBEN costar ≤ 60 ms. Este objetivo sustituye a los de ROADMAP (25/40 ms) y 002/FR-028a (120 ms), que DEBEN actualizarse.
- **FR-040**: `umbral-motor` DEBE ser la medida oficial, bloquear el CI y añadir el caso con fotogramas.
- **FR-041**: `bench` DEBE dejar de usar los parámetros 7.0.0.
- **FR-042**: Los jugadores DEBEN moverse cada 4 ticks en lugar de 2, y este cambio DEBE entrar antes de calibrar.
- **FR-043**: Todos los partidos DEBEN usar la misma cadencia: NO DEBE existir una cadencia distinta para los NPC (principio V).
- **FR-044**: La vista 2D DEBE seguir fluida a 60 fps y sin saltos: ni jugadores que se paran en fotogramas alternos ni desajustes visibles entre el balón y quien lo recibe.
- **FR-045**: La optimización posterior DEBE dejar `pnpm test:equivalence` idéntico.

**Partidas activas al desplegar**

- **FR-046**: Antes de que el servidor con la 9.0.0 acepte tráfico, un paso único DEBE cerrar las partidas en draft y en torneo, de modo que ninguna se reanude ni deje un partido a medias.
- **FR-047**: El paso DEBE ser idempotente: repetirlo no DEBE cambiar nada ni devolver dos veces.
- **FR-048**: Cada participante humano de una partida cerrada DEBE recibir un aviso que explique el motivo, y quien pagó su nivel de rareza DEBE recuperar el importe. Esto amplía 013/FR-033, que solo preveía la devolución antes del draft.
- **FR-049**: Los partidos terminados de una partida cerrada DEBEN conservar su resumen. La partida NO DEBE repartir premios ni fragmentos de torneo.

**Verificación y documentación**

- **FR-050**: Cada virtud y defecto modificado DEBE tener una prueba de unidad y una comprobación estadística de su efecto (principio IV).
- **FR-051**: El efecto medido de la fatiga y de cada táctica DEBE documentarse en `docs/juego/enfrentamientos.md`, actualizado a la 9.0.0.
- **FR-052**: La prueba de carga de 100 partidas DEBE repetirse en el mismo equipo de 8 núcleos de la referencia y compararse con ella. La validación en tres máquinas sigue en INI-07.
- **FR-053**: T086 de la spec 002 DEBE actualizarse al nuevo objetivo y marcarse al cumplirlo.

### Key Entities

- **Energía**: valor de 0 a 100 de cada jugador en el campo, que baja en los tramos de fatiga y se recupera en las pausas.
- **Ritmo**: velocidad a la que un jugador gasta energía; es el producto de los multiplicadores de rol, rasgos y táctica.
- **Tramo de fatiga**: periodo del partido en que se gasta energía; depende del reloj y, para Indisciplinado, empieza antes.
- **Acción intensa**: sprint, presión, regate o duelo; suma gasto dentro de un tramo de fatiga, comparado con la referencia fija de acciones de su rol.
- **Penalización**: porcentaje que pierde una stat según la energía y su tipo (física, técnica o mental).
- **Estrella y marcador**: el rival al que sigue un equipo con Individual y el jugador que lo sigue; se fijan al empezar el partido y no se sustituyen.
- **Parámetros 9.0.0**: versión única que el motor simula; contiene todos los valores de fatiga y táctica.
- **Línea base**: medidas del motor 8.0.0 con las que se comparan fatiga, tácticas y coste.
- **Umbral aprobado**: valor de una comprobación de equilibrado con su valor anterior, el medido, el motivo y la aprobación.

## Success Criteria *(mandatory)*

### Measurable Outcomes

Los márgenes marcados como «de partida» son propuestas; los valores finales los aprueba la persona responsable en la calibración.

- **SC-001**: Antes del primer cambio del motor existe un informe de línea base con goles, victorias, fatiga y coste de cada táctica en la 8.0.0.
- **SC-002**: El 100 % de los valores de referencia de la curva, de los roles, de los rasgos y de la penalización (FR-006, FR-010 a FR-016) se cumple en las pruebas exactas.
- **SC-003**: En series de 1.000 partidos, la energía media al 90' de cada rol queda a ±3 puntos de su valor de referencia (margen de partida).
- **SC-004**: Cada rasgo modificado tiene su prueba de unidad y su comprobación estadística en verde, y mueve la energía en la dirección esperada, con Incansable, Fatigado e Indisciplinado a ±3 puntos de 75, 45 y 44 (margen de partida).
- **SC-005**: En series de 1.000 partidos, un equipo con Presión alta termina con menos energía que el mismo equipo con Bloque medio, con diferencia estadísticamente significativa y de un tamaño aprobado por la persona responsable.
- **SC-006**: Cada táctica modificada produce, en series de 1.000 partidos, un efecto medible en la dirección esperada frente a la línea base, y 001/SC-006 sigue cumpliéndose.
- **SC-007**: `pnpm balance` pasa todas las comprobaciones con los umbrales aprobados, y cada umbral cambiado consta con su valor anterior, el medido, el motivo y la aprobación.
- **SC-008**: `umbral-motor` pasa en CI con Node 22: ≤ 60 ms sin fotogramas, ≤ 80 ms con fotogramas y ≤ 60 ms en `resolverResto` y con métricas, y T086 queda marcada.
- **SC-009**: Tras la optimización, el 100 % de los partidos y drafts de las huellas regeneradas sale idéntico en `pnpm test:equivalence`.
- **SC-010**: En una reproducción 2D de un partido completo, ningún jugador en desplazamiento se detiene entre fotogramas consecutivos ni salta de posición, y la vista se mantiene a 60 fps en el equipo de referencia.
- **SC-011**: Tras ejecutar dos veces el cierre sobre una base con partidas en todos los estados, no queda ningún partido a medias, el 100 % de las partidas en draft o torneo está cerrado y avisado, cada cobro se devuelve exactamente una vez y el 100 % de los partidos terminados conserva su resumen.
- **SC-012**: La prueba de carga de 100 partidas en el equipo de 8 núcleos queda registrada junto a la referencia (CPU 94 %, apertura p95 de unos 15 s), y ni la CPU ni la apertura p95 empeoran.
- **SC-013**: `docs/juego/enfrentamientos.md` describe la 9.0.0 con el efecto medido de la fatiga y de cada táctica.

## Assumptions

**Riesgos**

- **Coste de Presión alta**: el 20 % de acciones equivale a 10 puntos de energía al 90' para el jugador de referencia, y las presiones son solo una parte. El coste puede quedar muy por debajo del actual (+25 % de ritmo desde el 55'); SC-005 lo mide.
- **Objetivo de 60 ms**: el único experimento que llegó a 60 ms (equipo local, Node 24) también espaciaba los objetivos a 8 ticks. Ese cambio altera resultados, así que solo se aplica si la medida previa a la calibración lo exige (FR-003).

**Dependencias**

- **Spec 017 (en paralelo, con cambios sin confirmar)**: 018 no toca su alcance. Solapes a integrar con cuidado:
  - `packages/protocol/src/ws/partido.ts`: 017 lo migra a zod 4 y contiene el esquema de energía. FR-021 evita modificarlo.
  - `apps/server/src/actores/gestor.ts`: 017 lo modifica y es donde se recuperan las partidas al arrancar, relevante para el cierre (FR-046).
  - `packages/engine/tests/metricas.test.ts`: 017 lo modifica y la migración de pruebas de 018 puede tocarlo (FR-037).
- **Medidas previas** (equipo local, Node 24, solo orientativas): 101 ms sin fotogramas, 126 con fotogramas, 107 con métricas, 104 en `resolverResto` y 5.651 ticks por partido. La capa espacial consume el 76 % de la CPU (mover jugadores 36 %, objetivos 36 %). Mover cada 4 ticks y calcular objetivos cada 8 bajó de 89 a 60 ms en 400 partidos, con goles de 3,11 a 3,17 y sin validar el equilibrio. Espaciar solo los objetivos bajó de 89 a 84 ms porque en los saques se recalculan en cada paso de movimiento: es la siguiente pista de optimización.
- **Prueba de carga**: la referencia se midió en el «equipo B», de 8 núcleos ([010/diagnostico.md](../010-latencia-apertura-sobres/diagnostico.md)); debe repetirse en esa máquina.
- La beta aún no es pública, así que el cierre de partidas no afecta a personas ajenas al proyecto.
