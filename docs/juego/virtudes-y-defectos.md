# Virtudes y defectos

<!-- Documento generado a partir de packages/domain/src/catalogo/rasgos.ts: no lo edites a mano. -->
<!-- Para regenerarlo: pnpm --filter @fbd/domain rasgos:doc -->

Referencia única de los rasgos de las cartas de Fútboosterdraft (spec 005). Las especificaciones, la interfaz, la IA y el
modo Duelo de jugadores usan estas definiciones.

## Qué son

- Una **virtud** es un rasgo que beneficia al jugador o a su equipo. Las genéricas las puede tener cualquier jugador;
  las de una demarcación, solo los de esa demarcación (y las de centrocampista, también los defensas carrileros).
- Un **defecto** es un rasgo que le perjudica. Todos son genéricos. Una carta tiene como máximo 2 defectos.
- Máximo de virtudes por nivel: Superclase 1, Épico 2, Legendario 3, GOAT 4.
- Proporción de cartas con defectos por nivel (y, entre ellas, con dos): Superclase 15 % (0 %), Épico 25 % (20 %), Legendario 35 % (30 %), GOAT 50 % (40 %).

## Cómo se lee el impacto

- Es un número de 0 a 1 que resume cuánto pesa el rasgo en el resultado.
- En las **virtudes**, 1 es la más beneficiosa. En los **defectos**, 0 es el más perjudicial y 1 el que apenas perjudica.
- Lo usan la IA para valorar las cartas y el modo Duelo de jugadores: cada virtud suma su impacto a la puntuación y
  cada defecto resta 1 − impacto. El orden de los impactos se comprueba con partidos simulados (`balance`, 005/FR-051).

## Reglas de acumulación

- Las bonificaciones de equipo de una misma virtud se aplican una sola vez, aunque la tengan varios jugadores.
- Un mismo defecto colectivo cuenta una sola vez por equipo; defectos distintos se multiplican entre sí.
- Orden de cálculo de un stat: base → penalización por posición → bonificaciones en puntos → cansancio → multiplicadores.
- «5 puntos de la penalización» (Versátil, Inflexible) son 5 puntos porcentuales: de 10 % a 5 % o a 15 %.

## Todo rasgo tiene un efecto probado

No basta con añadir un rasgo a este documento: debe implementarse y probarse. Cada rasgo tiene una prueba de unidad y
una comprobación de `balance` registradas (`RASGOS_PROBADOS`, 005/FR-055).

## Virtudes (39)

| Nombre | Id | Ámbito | Descripción | Efecto en el partido | Activación | Acumulación | Incompatible con | Impacto |
|---|---|---|---|---|---|---|---|---|
| Capitanía | `Capitania` | Genérico | Aumenta en +1 la media de todos los jugadores del campo mientras está jugando. | +`virtudes.capitania` (1) a todos los stats de los jugadores de su equipo en el campo. | Mientras está en el campo. | Una sola vez por equipo, aunque la tengan varios jugadores en el campo. | — | 0,80 |
| Aura | `Aura` | Genérico | Aumenta la probabilidad de acciones exitosas mientras está en el campo. | +`virtudes.bonusProbabilidadLeve` (0,04) a la probabilidad de éxito de sus duelos, y lo mismo en contra de quien le defiende. | Mientras está en el campo. | Solo afecta al propio jugador. | — | 0,70 |
| Box-to-Box | `BoxToBox` | Centrocampista | Abarca mucho campo: otorga +1 a la media de la defensa y del ataque. | +`virtudes.boxToBox` (1) a los stats de los defensas y los delanteros de su equipo. | Mientras está en el campo. | Una sola vez por equipo, aunque la tengan varios jugadores en el campo. | — | 0,70 |
| Líbero | `Libero` | Defensa | Aumenta en +2 la media del centro del campo. | +`virtudes.libero` (2) a los stats de los centrocampistas de su equipo. | Mientras está en el campo. | Una sola vez por equipo, aunque la tengan varios jugadores en el campo. | — | 0,65 |
| Matador | `Matador` | Delantero | Más probabilidad de gol cuando es el último jugador delante del portero. | Más probabilidad de gol en el mano a mano; en esa jugada siempre tira. | En un mano a mano. | Solo afecta al propio jugador. | — | 0,65 |
| Fortaleza mental | `FortalezaMental` | Genérico | Aumenta en +2 la media de todos los jugadores del campo cuando su equipo va por detrás en el marcador. | +`virtudes.fortalezaMental` (2) a todos los stats de los jugadores de su equipo en el campo. | Mientras está en el campo y su equipo va perdiendo. | Una sola vez por equipo, aunque la tengan varios jugadores en el campo. | — | 0,60 |
| Santo | `Santo` | Portero | Providencial en los momentos clave: desde el minuto 80, en la prórroga y en eliminatorias defendiendo un resultado, repite la tirada ante los disparos rivales. | Repite la tirada de parada y se queda con la mejor. | Desde el minuto `virtudes.santoMinutoInicio` (80), en la prórroga, en la tanda y en eliminatorias sin ir perdiendo. | Solo afecta al propio jugador. | — | 0,60 |
| Jerarquía | `Jerarquia` | Defensa | Aumenta en +1 la media defensiva del equipo. | +`virtudes.jerarquia` (1) a los stats de los defensas de su equipo. | Mientras está en el campo. | Una sola vez por equipo, aunque la tengan varios jugadores en el campo. | — | 0,55 |
| Motivador | `Motivador` | Genérico | La degradación por cansancio de sus compañeros es más lenta mientras está en el campo. | El ritmo de degradación de sus compañeros se multiplica por `cansancio.factorMotivador` (0,75). | Mientras está en el campo. | Una sola vez por equipo, aunque la tengan varios jugadores en el campo. | — | 0,55 |
| One-to-One | `OneToOne` | Portero | Especialista en el uno contra uno, sobre todo ante atacantes con mucho regate. | Más probabilidad de parar los mano a mano. | Ante un mano a mano. | Solo afecta al propio jugador. | — | 0,55 |
| Rematador | `Rematador` | Delantero | Más probabilidad de gol cuando le centran un balón. | Más probabilidad de gol en los remates tras centro. | Al rematar un centro. | Solo afecta al propio jugador. | — | 0,55 |
| Cabeceador | `Cabeceador` | Delantero | Más probabilidad de gol en remates de cabeza. | Más probabilidad de gol de cabeza. | Al rematar de cabeza. | Solo afecta al propio jugador. | — | 0,50 |
| Filigranas | `Filigranas` | Genérico | Repite la tirada (y se queda con la mejor) cuando intenta regatear a un defensor. | Repite la tirada de sus regates y se queda con la mejor. | Al regatear. | Solo afecta al propio jugador. | — | 0,50 |
| Guante en el pie | `GuanteEnElPie` | Delantero | Repite la tirada (y se queda con la mejor) cuando centra balones al área. | Repite la tirada de sus centros. Es el lanzador de córners propuesto. | Al centrar. | Solo afecta al propio jugador. | — | 0,50 |
| Llegador | `Llegador` | Centrocampista | Se incorpora al ataque con frecuencia: más probabilidad de gol cerca del área. | Entra entre los rematadores de los centros y tiene más probabilidad de gol. | En ataque. | Solo afecta al propio jugador. | — | 0,50 |
| Muro defensivo | `MuroDefensivo` | Defensa | En las intercepciones dentro del área, repite la tirada y se queda con la mejor. | Repite la tirada de sus intercepciones en el área. | Defendiendo en su área. | Solo afecta al propio jugador. | — | 0,50 |
| Todocampista | `Todocampista` | Centrocampista | Cubre más zonas del campo: no tiene penalización por jugar fuera de posición (salvo en la portería). | Su penalización por posición es 0, salvo en la portería. | Jugando fuera de su posición. | Solo afecta al propio jugador. | Inflexible, Versátil | 0,50 |
| Desbordante | `Desbordante` | Delantero | Más probabilidad de éxito en los regates por las bandas. | Más regates ganados por banda y más peso del regate por banda (× 1,3). | Con el balón en una banda. | Solo afecta al propio jugador. | — | 0,45 |
| Incansable | `Incansable` | Genérico | Gran capacidad aeróbica: su nivel se degrada menos por el cansancio y puede presionar y sumarse al ataque constantemente. | Su ritmo de degradación por cansancio se multiplica por `cansancio.factorIncansable` (0,5). | Desde el inicio del cansancio. | Solo afecta al propio jugador. | Fatigado, Indisciplinado | 0,45 |
| Infranqueable | `Infranqueable` | Defensa | Aumenta en +2 el tackling y el marcaje frente a jugadores con regate de 95 o más. | +`virtudes.infranqueable` (2) a tackling y marcaje frente a regate ≥ `virtudes.infranqueableUmbralRegate` (95). | En sus duelos defensivos. | Solo afecta al propio jugador. | — | 0,45 |
| Intimidante | `Intimidante` | Genérico | Reduce en −1 los atributos enfrentados del rival más cercano. | −`virtudes.intimidante` (1) a los stats del rival en cada duelo en que participa. | En sus duelos. | Solo afecta al propio jugador. | — | 0,45 |
| Jugador entre líneas | `JugadorEntreLineas` | Centrocampista | Más probabilidad de éxito cuando juega entre líneas. | Más probabilidad de completar sus pases entre líneas. | Con el balón entre líneas. | Solo afecta al propio jugador. | — | 0,45 |
| Potente | `Potente` | Genérico | Mayor probabilidad de salir airoso de duelos y choques con rivales. | Más probabilidad de ganar los duelos de regate y conducción. | En sus duelos. | Solo afecta al propio jugador. | — | 0,45 |
| Presionador | `Presionador` | Genérico | Ejerce más presión sin balón, aumentando sus labores defensivas. | Provoca más pérdidas del rival cuando presiona. | Sin el balón. | Solo afecta al propio jugador. | — | 0,45 |
| Primer toque | `PrimerToque` | Centrocampista | Distribuye el balón al primer toque con menos probabilidad de pérdida. | Más probabilidad de completar sus pases. | Con el balón. | Solo afecta al propio jugador. | — | 0,45 |
| De acero | `DeAcero` | Genérico | Nunca se lesiona. | Su probabilidad de lesión es 0. Se comprueba antes que cualquier otro factor. | Siempre. | Solo afecta al propio jugador. | Frágil, De cristal | 0,40 |
| Elegante | `Elegante` | Genérico | Mayor probabilidad de salir de la presión y de las acciones defensivas rivales. | Más probabilidad de completar sus pases y de superar la presión. | Con el balón. | Solo afecta al propio jugador. | — | 0,40 |
| Lanzador de faltas | `LanzadorFaltas` | Genérico | Aumenta el disparo y la probabilidad de gol lanzando faltas. | Más probabilidad de gol de falta directa (+30 %) y más tiros directos (× 1,3). Es el lanzador de faltas propuesto. | Al lanzar una falta directa. | Solo afecta al propio jugador. | — | 0,40 |
| Recuperador tras pérdida | `RecuperadorTrasPerdida` | Genérico | Cuando pierde el balón, presiona con mucha intensidad para recuperarlo. | Más probabilidad de recuperar el balón justo después de perderlo. | Tras una pérdida propia. | Solo afecta al propio jugador. | — | 0,40 |
| Volador | `Volador` | Defensa | Aumenta mucho su probabilidad de despeje en balones parados. | Más probabilidad de despejar los centros y los balones parados rivales. | En los balones parados rivales. | Solo afecta al propio jugador. | — | 0,40 |
| Lanzador de penalties | `LanzadorPenalties` | Genérico | Aumenta el disparo y la probabilidad de gol lanzando penaltis. | Más probabilidad de gol de penalti. Es el lanzador de penaltis propuesto. | Al lanzar un penalti, también en la tanda. | Solo afecta al propio jugador. | — | 0,35 |
| Ordenabarreras | `Ordenabarreras` | Portero | Aumenta la probabilidad de parada en disparos a balón parado. | Más probabilidad de parar las faltas directas. | Ante una falta directa. | Solo afecta al propio jugador. | — | 0,35 |
| Parapenalties | `Parapenalties` | Portero | Aumenta considerablemente su porcentaje de paradas en penaltis. | Más probabilidad de parar los penaltis, también en la tanda. | Ante un penalti. | Solo afecta al propio jugador. | — | 0,35 |
| Carismático | `Carismatico` | Genérico | Sus compañeros le buscan con más frecuencia para asociarse con él. | Más peso como receptor de los pases de sus compañeros. | Mientras está en el campo. | Solo afecta al propio jugador. | — | 0,30 |
| Fair player | `FairPlayer` | Genérico | Nunca ve la tarjeta roja. | No recibe rojas directas. La segunda amarilla queda registrada, pero no le expulsa. | Siempre. | Solo afecta al propio jugador. | Agresivo | 0,30 |
| Jugador de campo | `JugadorDeCampo` | Portero | Sale con el balón jugado y tiene un regate casi infalible en su propia área. | Mejor salida de balón y regate casi seguro en su propia área. | Con el balón en su área. | Solo afecta al propio jugador. | — | 0,30 |
| Revulsivo | `Revulsivo` | Genérico | Si entra desde el banquillo, su media sube un 5 % el resto del partido. | Sus stats se multiplican por 1 + `virtudes.revulsivo` (1,05) si entró desde el banquillo, también al sustituir a un lesionado. | Desde que entra desde el banquillo hasta el final del partido. | Solo afecta al propio jugador. | — | 0,30 |
| Robusto | `Robusto` | Genérico | Menor probabilidad de lesionarse, y lesiones menos graves. | Su probabilidad de lesión se reduce un `lesiones.reduccionRobusto` (45 %). | Siempre. | Solo afecta al propio jugador. | Frágil | 0,30 |
| Versátil | `Versatil` | Genérico | Jugando fuera de su posición, su penalización es 5 puntos menor. | Si su penalización por posición es mayor que 0, se le restan `virtudes.versatil` (0,05, es decir, 5 puntos porcentuales), con un mínimo de 0. | Jugando fuera de su posición. | Solo afecta al propio jugador. | Inflexible, Todocampista | 0,25 |

## Defectos (15)

| Nombre | Id | Ámbito | Descripción | Efecto en el partido | Activación | Acumulación | Incompatible con | Impacto |
|---|---|---|---|---|---|---|---|---|
| Provocador | `Provocador` | Genérico | Motiva a los rivales GOAT: +1 a su media mientras está en el campo. | +`defectos.provocador` (1) a todos los stats de cada jugador GOAT del rival en el campo. | Mientras está en el campo. | Una sola vez por equipo, aunque haya varios Provocadores en el campo. | — | 0,85 |
| Inflexible | `Inflexible` | Genérico | Jugando fuera de su posición, su penalización es 5 puntos mayor. | Si su penalización por posición es mayor que 0, se le suman `defectos.inflexible` (0,05, es decir, 5 puntos porcentuales). | Jugando fuera de su posición. | Solo afecta al propio jugador. | Versátil, Todocampista | 0,75 |
| Torpe | `Torpe` | Genérico | Marca en propia puerta con más frecuencia. | Su probabilidad de autogol (despeje de un centro o desvío de un tiro) se multiplica por `defectos.torpe` (2). | Al despejar o desviar. | Solo afecta al propio jugador. | — | 0,70 |
| Impulsivo | `Impulsivo` | Genérico | Duplica su probabilidad de ver la amarilla. | Su probabilidad de amarilla por falta se multiplica por `defectos.impulsivo` (2). | Siempre. | Solo afecta al propio jugador. | — | 0,65 |
| Canchero | `Canchero` | Genérico | Comete faltas y penaltis con más frecuencia. | Su probabilidad de cometer falta en una entrada se multiplica por `defectos.canchero` (1,5); dentro del área, la falta es penalti. | Siempre. | Solo afecta al propio jugador. | — | 0,60 |
| Indisciplinado | `Indisciplinado` | Genérico | Se cansa más rápido. | Su ritmo de degradación por cansancio se multiplica por `defectos.indisciplinado` (1,5). | Desde el inicio del cansancio. | Solo afecta al propio jugador. | Incansable | 0,60 |
| De cristal | `DeCristal` | Genérico | Cuando se lesiona, siempre es de larga duración. | La gravedad de sus lesiones es siempre `larga`. | Al lesionarse. | Solo afecta al propio jugador. | De acero | 0,55 |
| Frágil | `Fragil` | Genérico | Se lesiona con mucha más facilidad. | Su probabilidad de lesión se multiplica por `defectos.fragil` (3). | Siempre. | Solo afecta al propio jugador. | De acero, Robusto | 0,50 |
| Chupón | `Chupon` | Genérico | Apenas pasa el balón a sus compañeros. | El peso de la opción «pase» en sus decisiones se multiplica por `defectos.chupon` (0,5). Un portero conserva sus acciones. | Con el balón. | Solo afecta al propio jugador. | — | 0,45 |
| Agresivo | `Agresivo` | Genérico | Duplica su probabilidad de ver la roja directa. | Su probabilidad de roja directa por falta se multiplica por `defectos.agresivo` (2). | Siempre. | Solo afecta al propio jugador. | Fair player | 0,40 |
| Fatigado | `Fatigado` | Genérico | Empieza a cansarse al comenzar la segunda parte. | Su cansancio empieza en el minuto 46 si el inicio general es más tarde (el menor de los dos). | Desde el comienzo de la segunda parte. | Solo afecta al propio jugador. | Incansable | 0,40 |
| Mal defensor | `MalDefensor` | Genérico | Apenas participa en las acciones defensivas. | Su peso como candidato a defender se multiplica por `defectos.malDefensor` (0,5): si le toca un duelo o cortar un pase, se lo cede al siguiente candidato con probabilidad 0,5, y en la presión cuenta como si estuviera al doble de distancia. Si es el único candidato, defiende igual. Un portero conserva sus acciones. | Sin el balón. | Solo afecta al propio jugador. | — | 0,40 |
| Estrellita | `Estrellita` | Genérico | Si no es el mejor de su equipo en el campo, se desmotiva: −10 % a su media. | Sus stats se multiplican por 1 − `defectos.estrellita` (0,90) si su media efectiva (sin este efecto) no es la mayor de su equipo en el campo; con un empate en la mayor, no se aplica. | Mientras está en el campo y otro compañero en el campo tiene más media efectiva. | Solo afecta al propio jugador. | — | 0,35 |
| Polémico | `Polemico` | Genérico | Si su equipo va perdiendo, su actitud baja un 5 % la media de todo el equipo. | Los stats de todos los jugadores de su equipo en el campo se multiplican por 1 − `defectos.polemico` (0,95). | Mientras está en el campo y su equipo va perdiendo; se recupera al empatar. | Un mismo defecto cuenta una sola vez por equipo; defectos distintos se multiplican entre sí. | — | 0,25 |
| Rebelde | `Rebelde` | Genérico | Desde el banquillo, su malestar baja un 5 % la media de todo el equipo. | Los stats de todos los jugadores de su equipo en el campo se multiplican por 1 − `defectos.rebelde` (0,95). | Mientras está convocado en el banquillo; no cuenta si está retirado, expulsado, lesionado o no convocado, y desaparece al entrar. | Un mismo defecto cuenta una sola vez por equipo; defectos distintos se multiplican entre sí. | — | 0,15 |

## Incompatibilidades

No pueden estar en la misma carta:

- De acero y Frágil.
- De acero y De cristal.
- Robusto y Frágil.
- Fair player y Agresivo.
- Versátil y Inflexible.
- Todocampista y Inflexible.
- Incansable y Fatigado.
- Incansable y Indisciplinado.
- Versátil y Todocampista.
