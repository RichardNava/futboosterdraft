# Validación de la spec 003 (T133)

Registro de la validación de [quickstart.md](../quickstart.md): pruebas automáticas, escenarios A a L y pruebas con
personas.

## Pruebas automáticas

| Prueba | Resultado |
|---|---|
| `pnpm typecheck` | ✔ |
| `pnpm lint` | ✔ |
| `pnpm test` (unitarias) | ✔ salvo los 5 escenarios de `tools/fixtures` (pendientes de regenerar, T036) |
| `pnpm test:integration` | ✔ 122 de 122 (`torneo-asincrono` falla solo con la máquina muy cargada; aislado pasa) |
| e2e: `apertura`, `torneo-final`, `torneo`, `identidad`, `boton-principal`, `modo-partido`, `alineacion`, `gestion-equipo`, `finalizar`, `cartas` | ✔ |
| `pnpm balance --n 500 --serie todas` | 19 de 23 (ver [calibracion-motor.md](./calibracion-motor.md)) |
| `pnpm balance --torneos 100 --solo 003/SC-010` | ver [calibracion-npc.md](./calibracion-npc.md) |
| Carga (`tools/load/beta-100.js`, 001/SC-017) | pendiente: k6 no está instalado en la máquina de desarrollo |

## Pruebas con personas (2026-10-19)

### Hallazgos

| # | Tipo | Hallazgo | Área |
|---|---|---|---|
| H1 | Defecto | Las cartas cambian de tamaño según el número de virtudes; deben tener siempre el mismo tamaño. | US7, `cartas.css` |
| H2 | Defecto | Los nombres de las virtudes se cortan a mitad de palabra; cada virtud debe ocupar siempre una línea. | US7, `cartas.css` |
| H3 | **Crítico** | En «Formación», al pasar el cursor por una ficha no se ve la carta, sino una franja vertical que ocupa toda la pantalla. | US2, `VistaCarta` |
| H4 | **Crítico** | No se puede intercambiar entre «Banquillo» y «Resto de la plantilla». | US2, `CampoEquipo` |
| H5 | Cambio de requisito | «Confirmar alineación» debe llevar a la pantalla del torneo. | US2/US4, FR-002, FR-006 |
| H6 | Cambio de requisito | Los dorsales no deben asignarse al confirmar el once inicial: se asignan automáticamente, según la posición, antes de «Preparar equipo». | 001/FR-035–FR-037, 002 (dorsales) |
| H7 | Cambio de requisito | El selector de modalidad no debe aparecer en «Formación». | US3, FR-032, FR-033 |
| H8 | **Crítico** | Tras un gol, el equipo que lo recibe saca desde su portería; debe sacar desde el centro del campo. | US1, motor (reanudación tras gol) |
| H9 | Cambio de requisito | En el descanso, «Seguir» debe tener la misma importancia que «Gestionar equipo» y estar a su derecha. | US4/US5, FR-006, contracts/ui.md |
| H10 | Defecto | Durante la apertura del sobre se ven por detrás las cartas de la pantalla del draft; no deben verse hasta que termine la animación. | US8, `AperturaSobre`, `Draft.tsx` |
| H11 | Equilibrado | Casi solo marcan los DC y los SD; otros jugadores de campo (sobre todo ED, EI y MCO) deben llegar más al área y marcar alguna vez. | US1, motor (llegadas al área) |
| H12 | Equilibrado | En 8 playoffs de 16: 5 eliminaciones en primera ronda, 2 en segunda y 1 título. La dificultad sigue siendo alta. | US9, `npc.errores` |
| H13 | Requisito nuevo | Los NPC cometen un 10 % más de errores. | US9, `npc.errores` |
| H14 | Requisito nuevo | Nivel de dificultad al crear la partida (Fácil, Normal, Difícil) que reparte los niveles de los NPC de relleno; el PRO solo se elige en la selección manual de NPC. | Nuevo (001/FR-006, FR-057–FR-060) |

### Criterios de éxito con personas

| SC | Estado |
|---|---|
| SC-008, SC-011, SC-012, SC-013, SC-014, SC-016, SC-019 | Pendientes de repetir tras corregir los hallazgos (H3 y H4 bloquean SC-014; H12 afecta a SC-011). |

### Aclaraciones sobre la dificultad (H13, H14)

- «Difícil»: sin amateur, equilibrado entre intermedio y avanzado.
- «10 % más errores»: se suman 100 milésimas a la probabilidad de cada familia (por ejemplo, amateur de 700 a 800).
- Nivel por defecto: «Normal».
- «Fácil» (decidido al especificar H14, FR-038a): sin avanzado, equilibrado entre amateur e intermedio. «Normal»: el relleno al azar de 001/FR-059. El PRO solo se añade a mano.

### Correcciones de los hallazgos críticos

| # | Causa | Corrección | Prueba |
|---|---|---|---|
| H3 | La capa de la carta ampliada toma el ancho de su contenido y la carta (`container-type: inline-size`) no tiene ancho propio: se colapsaba a unos 12 px de ancho. | `.vista-carta` con ancho explícito `min(280px, 100vw − 16px)`. | e2e `alineacion` «carta ampliada»: ancho ≥ 200 px (o el de la pantalla) y proporción de carta, a 1366 y 360 px. |
| H4 | El estado del campo solo aceptaba soltar en el banquillo a un titular; no existía destino «resto de la plantilla». | Destinos `banquillo` y `reserva` con la ficha sobre la que se suelta (`sobre`): del resto al banquillo (hueco o intercambio), del banquillo al resto (o intercambio), titular sobre suplente; también con el teclado (Intro en uno y en otro). Además, `scroll-padding-bottom` para que la barra fija no tape lo que se enfoca o se desplaza al pie. | Unitarias de `campoEquipoEstado` (5 nuevas) y e2e `alineacion` «banquillo y resto de la plantilla» (4 de 4 repeticiones). |
| H8 | Tras un gol, la acción «saque» empezaba con el balón aún en la red y lo llevaba al centro: en la 2D parecía un saque desde la portería. | `saqueDeCentro` pone el balón en el centro antes del saque. | Unitaria del motor `saqueCentro`: el saque tras cada gol empieza y termina en el centro. |

### Correcciones de los defectos H1, H2 y H10

| # | Causa | Corrección | Prueba |
|---|---|---|---|
| H1 | La carta completa crecía cuando el contenido no cabía en la proporción 5:7, y lo que no cabía dependía del jugador: número de virtudes (y ningún contenedor sin virtudes), largo de los apellidos y número de posiciones. | La carta reserva siempre el mismo sitio: 4 líneas de virtudes (el contenedor se pinta aunque esté vacío), 2 líneas de apellidos y 1 de posiciones. | e2e `cartas` «todas las cartas completas miden lo mismo…», a 1280 y 360 px sobre toda la colección Core. |
| H2 | Virtudes en dos columnas con `overflow-wrap: anywhere`: las palabras se partían. | Una columna, cada virtud en una línea (`white-space: nowrap`), letra condensada de la carta y menos relleno lateral; sigue a ≥ 16 px en portátil y ≥ 14 px a 360 px (FR-009). | La misma e2e: ninguna virtud cortada ni en más de una línea; las de desborde y tamaño mínimo siguen pasando. |
| H10 | La capa de la apertura es semitransparente y la sección «Sobre actual» del draft ya estaba pintada debajo. | Mientras dura la apertura, «Sobre actual» queda con `visibility: hidden` (conserva el sitio) y `aria-hidden`; aparece al terminar. | e2e `apertura`: oculta durante la animación y visible al terminar. |

Además, `draft-solo.spec.ts` avanzaba 52 s para vencer el primer turno, que desde T082 dura 53 s (45 + 8 de margen); ahora avanza 54 s.

### Cambios de requisito H5, H6, H7 y H9

La spec se actualizó primero (sesión 2026-10-20: FR-001b, FR-003b, FR-006a, FR-006, FR-027, FR-032; escenarios de US2 y
US5; contracts/ui.md; notas en las specs 001 y 002).

| # | Cambio | Pruebas |
|---|---|---|
| H5 | «Formación» tiene siempre «Confirmar alineación» como principal, que guarda y lleva al torneo (FR-003b). | e2e `alineacion` «Confirmar alineación guarda y lleva al torneo…»; las e2e que empezaban el partido desde «Formación» lo hacen ahora desde la preparación del torneo. |
| H6 | Los dorsales se asignan al terminar el draft según la alineación automática; confirmar el once no los reasigna (FR-001b). | Contrato `alineacion` (dorsales del 1 al 24 sin confirmar; confirmar otro once no los cambia), integración `dorsales`, e2e `dorsales`. |
| H7 | El selector de modo solo está en la tarjeta de preparación del torneo (FR-032). | e2e `modo-partido` y `alineacion`: «Formación» sin selector. |
| H9 | En el descanso contra un NPC, «Gestionar equipo» y «Seguir» con el estilo de botón principal, en una fila y «Seguir» a la derecha, también a 360 px (FR-006a). | e2e `boton-principal` (posición, mismo alto, visibles al desplazar), `gestion-equipo`. |

Además, en el torneo y en «Plantillas» el botón de la preparación («Comenzar partido» o «Ver partido») pasa a la barra
del final de la pantalla: estaba al principio y, al desplazarse, dejaba de verse en móvil (FR-006).

**Defecto encontrado al probar H6**: al abrir un turno del draft, los NPC eligen con la hora actual, que puede ser
posterior al vencimiento recién calculado si entre medias hubo esperas a la base de datos y el reloj avanzó más que la
duración del turno. Entonces se lanzaba `TURNO_CERRADO`, el siguiente turno no se programaba y el draft se quedaba
parado. Solo se ha visto con el reloj simulado, pero en producción podría pasar con mucha carga. Ahora los NPC eligen
con `min(ahora, vencimiento)` (`apps/server/src/actores/draft.ts`, al abrir el turno y al sustituir a un humano).
La prueba de integración `dorsales` lo reproducía de forma intermitente (1 de cada 4) y ahora pasa 4 de 4; además
espera la conexión antes de empezar y avanza el reloj hasta que se cumple la condición en lugar de un número fijo de
pasos.

**Pruebas e2e desactualizadas corregidas**: `partido-rapido` usaba el panel de cambios eliminado en la 003 (ahora usa
«Gestionar equipo»); `avanzar-solo` esperaba el banner del campeón en lugar de la pantalla de US10 y tenía márgenes de
1 s demasiado justos al empezar un partido o abrir la jornada (ahora 3 s).

### Batería e2e tras los cambios (2026-10-20)

44 pruebas de `alineacion`, `boton-principal`, `gestion-equipo`, `finalizar`, `partido-2d`, `partido-rapido`,
`modo-partido`, `dorsales`, `identidad`, `avanzar-solo`, `torneo`, `torneo-asincrono`, `torneo-final`, `apertura`,
`draft-solo` y `cartas`: 42 pasan en la batería y las otras 2 pasan aisladas.

- `torneo-asincrono` suponía la reproducción en 2D (tipo de simulación de la partida, spec 002); ahora elige
  «Simulación 2D» en la preparación (FR-032). Pasa.
- **Pendiente de investigar**: en la batería larga (59 min con el mismo servidor de pruebas), una petición
  `POST /siguiente-jornada` de `torneo.spec` no respondió en 10 minutos. Aislada, la prueba pasa (2 de 2, 20 s) y el
  mismo recorrido por la API llega al campeón en 11 pasos. Puede ser desgaste del servidor tras muchas partidas
  (conexiones a la base de datos, temporizadores del reloj simulado o actores sin liberar); conviene reproducirlo con
  una prueba de resistencia antes de la beta.

### H11: llegada al área de extremos y mediapunta

Medido con `tools/balance/src/sondaGoleadores.ts` (equipos sintéticos, 6 equipos × 60 partidos por formación; % de los
goles del equipo según la posición de la casilla del goleador):

| Formación | Antes: DC + SD | Antes: ED + EI + MCO | Después: DC + SD | Después: ED + EI + MCO |
|---|---|---|---|---|
| 4-3-3 | 52 % | 21 % | 49 % | 30 % |
| 4-2-3-1 | 52 % | 36 % | 51 % | 41 % |
| 4-4-2 | 71 % | 12 % | 73 % | 12 % |

El desglose por tipo de gol mostró que la mayoría de los goles del delantero son remates propios en jugada (recibe en el
último tercio y tira), no centros. Cambios en el motor:

- **Llegada al área** (`espacio.llegadaAlArea`: x del extremo 8800, x del mediapunta 7900, factor de ancho 0,6): con el
  balón en el último tercio, el extremo del lado contrario se mete hacia el segundo palo y el del lado del balón y el
  mediapunta llegan a la frontal. El papel sale de la posición en la que juega el jugador (ED, EI o MCO).
- **Centro raso** (`acciones.centroRaso` = 0,35): una parte de los centros va raso o atrás; lo remata con el pie uno de
  los que llegan, por cercanía al punto de remate y con más peso (`acciones.bonusLlegada` = 2,5) para el extremo o el
  mediapunta. En los centros por arriba, el que llega de segunda línea suma también en el duelo.
- **Receptor en el área**: el extremo o el mediapunta que ya está dentro del área rival recibe más peso como receptor de
  un pase (`bonusLlegada`).

El 4-4-2 apenas cambia: sus extremos juegan a la altura de los medios y casi nunca reciben en posición de tiro. Subir
mucho los valores (llegada a x 9300, `bonusLlegada` 5, `centroRaso` 0,5) tampoco lo mueve. **Pendiente de decidir** con
quien pidió el cambio un objetivo medible para convertirlo en criterio de éxito (propuesta: en 4-3-3 y 4-2-3-1, extremos
y mediapunta ≥ 25 % de los goles; en 4-4-2, ≥ 15 %, lo que exigiría que los medios de banda lleguen al área de otra forma).

**Defecto encontrado al probar H11**: un córner que salía de un tiro (rechace o parada) se sacaba dentro de la misma
jugada, de modo que una cadena de córners (córner, remate parado, córner…) entraba entera en un solo paso del motor. En
la 2D en directo eso rompía el corte por ticks (un tramo de 920 ticks donde el máximo es 440). Ahora el córner queda
pendiente (`cornerPendiente`) y se saca al principio del paso siguiente, como interrupción propia; al empezar una parte
se descarta. Las pruebas de equivalencia rápida/2D y de «Finalizar partido» vuelven a pasar (11/11).

### H13: más errores de los NPC

`npc.errores`: se suman 100 milésimas a la probabilidad de cada familia (amateur 800, intermedio 600, avanzado 350, PRO
125; `automatico` sigue en 0). Resultado de `003/SC-010` en [calibracion-npc.md](./calibracion-npc.md).

### Decisiones sobre H11 y H14 (2026-10-20)

- **H11**: la llegada al área tiene que ser orgánica, según la jugada. Objetivo: en 3-4-3, 4-2-3-1 y 4-3-3, extremos y
  mediapuntas marcan entre el **25 % y el 50 %** de los goles del equipo (como en el fútbol real). No se fija objetivo
  para el 4-4-2.
- **Regate**: sirve para escapar del defensor y llegar con más facilidad al área. Un regate ganado en campo rival debe
  acercar al jugador al área.
- **H14** (niveles de dificultad): implementado en paralelo, fuera de esta sesión.

### H11 cerrado: llegada orgánica y regate hacia dentro

Con la decisión del 2026-10-20 se añaden la llegada según la jugada (también en campo rival cuando un compañero progresa
conduciendo o regateando) y según el jugador (desmarque o posicionamiento), y el regate hacia dentro tras un regate
ganado en campo rival. Nueva comprobación **003/SC-023** en `pnpm balance`:

| Formación | Extremos y mediapuntas (semilla 1) | (semilla 2) |
|---|---|---|
| 3-4-3 | 36,3 % | 35,8 % |
| 4-2-3-1 | 41,8 % | 39,4 % |
| 4-3-3 | 39,9 % | 39,9 % |

Todas dentro del 25–50 %. La medición completa queda en 20 de 24 (ver calibracion-motor.md, ronda 13).
