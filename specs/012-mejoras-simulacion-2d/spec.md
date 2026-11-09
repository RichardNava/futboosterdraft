# Feature Specification: Mejoras de la simulación 2D, control de bajas y retoques del torneo

**Feature Branch**: `main` (sin rama propia, como las specs 008 a 011)

**Created**: 2026-11-08

**Status**: Draft

**Input**: User description: "Spec 12 — Mejoras Simulación 2D & more. 1) Sonidos del partido (gol propio / rival,
pitidos de inicio, descanso y final, tarjetas) y animación grande del texto de gol en el espacio del terreno de juego,
preparada para vender más animaciones en la tienda. 2) Llevar los cambios de la spec 11 en Formación a «Gestionar
equipo» durante el partido, quitando lo que allí no tiene sentido (resto de la plantilla, personalización). 3) Bugs: el
campo de la 2D cambia de tamaño porque la barra de botones superior se apila; las tarjetas de «Lo que ha pasado» se
ven blancas. 4) Selector de modo ante lesiones y expulsiones: automático (por defecto) o control total, que detiene el
partido para decidir. 5) Pantallas intermedias del torneo: nombre y escudo en Plantillas; avisos de lesionados,
sancionados y otros eventos que piden intervención; respetar la alineación confirmada y bloquear el avance si tiene
bajas; rework de los botones de inicio y cierre de sesión. 6) Resto de sonidos: confirmar elección en el draft, latido
en los últimos segundos del turno, clic de botón principal y caja registradora al comprar un sobre."

## Contexto

- La gestión durante el partido viene de la [003](../003-mejoras-ux-simulacion/spec.md) (FR-027 a FR-031): solo existe
  contra un NPC; en la 2D, «Gestionar equipo» pausa la reproducción y los cambios se aplican en la siguiente
  interrupción. Hoy, una lesión o una expulsión se resuelven solas (sustitución automática o reajuste de la colocación).
- La [011](../011-rework-tienda/spec.md) cambió Formación (FR-024 a FR-026): campo horizontal desde 1024 px con
  interruptor «Campo horizontal», pestañas del lateral siempre visibles y dorsales compactos dentro de «Personalización».
  También creó los cosméticos (escudos y diseños de sobre), su selección en «Mi perfil» y su venta en la tienda.
- Las bajas entre jornadas vienen de la [001](../001-draft-manager-mvp/spec.md) (FR-043). Hasta ahora, si la
  alineación guardada incluye un lesionado o sancionado, el sistema la corrige solo (001, caso límite «Última
  alineación con un jugador no disponible»). Esta spec cambia ese comportamiento (US5).
- Los sonidos se documentan en [docs/juego/sonidos.md](../../docs/juego/sonidos.md); sus siete filas «Pendientes» son
  las de los puntos 1 y 6 de la petición.

Términos:

- **Modo de gestión de incidencias**: cómo reacciona el equipo del participante a un lance que altera su alineación
  durante un partido. *Automático*: el sistema decide (comportamiento actual). *Control total*: el partido se detiene y
  decide el participante.
- **Lance que altera la alineación**: lesión de un jugador propio que le impide seguir, expulsión (roja directa o
  segunda amarilla) de un jugador propio, o cualquier otro hecho del partido que deje al equipo con menos jugadores o
  con una casilla de la formación vacía.
- **Celebración de gol**: animación que se reproduce sobre el espacio del terreno de juego de la 2D cuando se marca un
  gol. Es un cosmético más: la del juego es gratuita y las demás podrán venderse.
- **Baja pendiente**: jugador lesionado o sancionado que figura en la alineación confirmada para la próxima jornada.

## Clarifications

### Session 2026-11-08

- Q: Con «Control total», ¿la simulación rápida también se detiene en la lesión o expulsión propia? → A: Sí, en la 2D y
  en la simulación rápida; en esta, el resumen se corta en el minuto del lance y añade esa parada a las del descanso
  (decisión revisable si el resultado no convence).
- Q: ¿Cuántas celebraciones se crean en esta spec y se pueden elegir ya en «Mi perfil»? → A: 4 (la del juego y 3
  estilos más), gratuitas y elegibles ya; el espacio de celebración debe admitir en el futuro minisecuencias animadas
  elaboradas (estilo anime) creadas fuera del juego, sin tocar la pantalla del partido.
- Q: Si la alineación tiene una baja pendiente y no hay con quién sustituirla, ¿qué pasa con el bloqueo? → A: Poner a
  un jugador fuera de su posición (con penalización) o cambiar la formación cuentan como soluciones, así que el
  bloqueo se mantiene mientras quede algún suplente disponible; solo se levanta si todos los suplentes están
  lesionados o sancionados (caso casi imposible), y entonces se juega con los disponibles.

### Ronda 2 (2026-11-08, tras probar la primera entrega)

- Q: Control total en la simulación rápida → A: **Se quita** (revisa la primera respuesta de arriba). Cambiar de modo
  solo afectaba desde el descanso; en la simulación rápida las lesiones y expulsiones se resuelven siempre en
  automático y no hay selector de modo.
- Q: En control total, ¿se para también en los goles? → A: Sí, solo en la 2D y en **todos** los goles (propios y del
  rival): tras la celebración se abre «Gestionar equipo» y lo decidido se aplica en el saque de centro.
- Q: Goleadas (un participante sumó 41-5 en 5 partidos contra NPC amateur e intermedio) → A: Que haya desnivel es
  correcto, pero el que gana de mucho baja la intensidad (casi por cortesía profesional) y le cuesta mucho más seguir
  marcando. Además, deben salir algo más de porteros en los sobres. Análisis: el NPC amateur no había drafteado
  portero (jugaba un extremo con media efectiva 32) y el motor escala los goles con la diferencia de nivel sin freno;
  no es una regresión de esta spec (hay goleadas de 8-10 desde los parámetros 3.0.0).
- Q: Plantillas → A: Nombre, escudo y estrellas con la media **del mejor once** (el mejor portero y los diez mejores de
  campo) en la primera columna, fuera de las pestañas; los porteros pasan arriba de la columna de los defensas.

### Ronda 3 (2026-11-09, tras probar la ronda 2)

- Q: En Formación, a 17", el séptimo suplente se corta por muy poco. ¿De dónde se saca el alto? → A: De las tres
  opciones señaladas: el resumen táctico (formación, ofensividad y amplitud) pasa dentro de la caja de las estrellas,
  la barra principal es más baja en Formación y el título «Banquillo (7/7)» pierde margen. Además, más aire entre el
  título, la ayuda y «Torneo», y entre «Formación» y su selector.
- Q: ¿Qué celebraciones van a la tienda? → A: Dos de las cuatro: **Estadio y Neón** (0,99 € o 500 fragmentos).
  Clásica (la del juego) y Pizarra siguen gratis. Quien tuviera elegida una de las de pago sin comprarla vuelve a la
  del juego (el aspecto ya filtra por las disponibles).
- Q: ¿Retrato en la chapa de la 2D sin ralentizar el motor? → A: Sí: el motor no cambia (solo dibuja el cliente) y
  cada chapa con retrato se compone una vez en un lienzo aparte, así que cada fotograma solo la copia. Solo con
  retrato propio; sin él, la chapa de siempre con el dorsal.
- Q: Las 300 imágenes de fondo de las cartas, ¿en esta spec? → A: No: en una spec propia (proceso por lotes,
  validación del catálogo, revisión de legibilidad y del plan B de identidad).

### Ronda 4 (2026-11-09, tras probar la ronda 3)

- Q: El ambiente sintetizado suena a ruido blanco y no se distinguen bombos, cánticos ni vuvuzelas. → A: Grabaciones
  CC0 de Freesound: el rumor del Millerntor en bucle, una hinchada chilena con bombo, cánticos (Brighton y un estadio
  cantando) y dos vuvuzelas, igualados de sonoridad.
- Q: ¿Qué celebraciones se venden? → A: Dos nuevas, de muestra provisional: **Discoteca** (bola de espejos, focos y
  muñequitos bailando) y **Fuegos artificiales**, a 0,99 € o 500 fragmentos. Estadio y Neón vuelven a ser gratis. (En
  la tienda no salían porque el catálogo se lee de la base de datos: hay que ejecutar `pnpm seed` y reiniciar el
  servidor tras cambiar `data/cosmeticos.json`.)
- Q: ¿Cómo debe verse el selector Automático/Control total en la 2D? → A: Como un panel más (bordes redondeados,
  vidrio y sombra), con la etiqueta y los botones en una fila.
- Q: ¿Más ayuda en la barra? → A: Sí, con letra de cuerpo. En «Nueva partida» las explicaciones salen de la pantalla
  y van a la barra, que ocupa todo el ancho; los recuadros se ordenan en dos columnas (modo y rivales a la
  izquierda, equipos y ritmo a la derecha) para no desplazar. También, ayuda en los enlaces de navegación.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Partido con sonido y celebración de gol (Priority: P1)

El participante ve un partido en 2D. Suena un silbato al empezar, otro distinto al descanso y uno más largo al final.
Cuando su equipo marca, el público de casa canta el gol y el texto «¡GOL!» entra grande sobre el terreno de juego con
una animación; cuando marca el rival, el público murmulla. Cada tarjeta suena con un silbato y un «oooh» del público.

**Why this priority**: es lo que más cambia la sensación del partido, el momento central del juego, y prepara el hueco
de las celebraciones que se venderán en la tienda.

**Independent Test**: jugar un partido 2D contra un NPC con el sonido activado y comprobar cada sonido y la animación
en los goles de los dos equipos; repetir con el sonido silenciado y con movimiento reducido.

**Acceptance Scenarios**:

1. **Given** un partido 2D, **When** empieza, llega el descanso o termina, **Then** suena un pitido distinto en cada
   caso (corto al inicio, doble al descanso, triple y más largo al final).
2. **Given** un partido 2D, **When** marca el equipo del participante, **Then** suena el público cantando el gol y la
   celebración ocupa el espacio del terreno de juego con el texto «¡GOL!» grande.
3. **Given** un partido 2D, **When** marca el rival, **Then** suena un murmullo del público y la celebración se
   reproduce igual (con la del equipo que marca).
4. **Given** un partido 2D, **When** se muestra una tarjeta amarilla o roja, **Then** suena un silbato con el público
   asombrado.
5. **Given** el sonido silenciado con el interruptor 🔊, **When** ocurre cualquiera de esos lances, **Then** no suena
   nada y la celebración se ve igual.
6. **Given** la preferencia de movimiento reducido del sistema, **When** se marca un gol, **Then** la celebración se
   muestra sin desplazamientos (aparece y desaparece con un fundido).

---

### User Story 2 - Barra superior estable y tarjetas con su color (Priority: P1)

En la 2D, los botones de la parte superior van en una sola línea y el campo no cambia de tamaño en ningún momento del
partido. En «Lo que ha pasado», cada tarjeta se ve amarilla o roja según la que se mostró.

**Why this priority**: son defectos visibles en cada partido y su arreglo es pequeño.

**Independent Test**: reproducir un partido 2D completo en 1024 px y 1440 px y comprobar que el tamaño del campo no
varía al cambiar los botones (en juego, descanso, prórroga, final); abrir «Lo que ha pasado» de un partido con
amarillas y rojas.

**Acceptance Scenarios**:

1. **Given** un partido 2D en una pantalla de 1024 px o más, **When** cambian los botones de la barra superior (en
   juego, descanso, fin), **Then** todos caben en una línea y el campo conserva su tamaño.
2. **Given** el resumen «Lo que ha pasado» con una amarilla y una roja, **When** se muestra, **Then** el icono de cada
   tarjeta es amarillo o rojo, no blanco, en los temas claro y oscuro.

---

### User Story 3 - Gestionar el equipo durante el partido como en Formación (Priority: P2)

Al abrir «Gestionar equipo» durante un partido, el participante ve la misma pantalla que Formación tras la 011 (campo
horizontal en pantallas anchas, pestañas siempre visibles), pero solo con lo que sirve en ese momento: los jugadores en
el campo, el banquillo convocado y las sustituciones que quedan. No aparecen los jugadores no convocados ni la
personalización (dorsales, equipación…).

**Why this priority**: unifica dos pantallas casi iguales y quita ruido en un momento con prisa, pero el partido ya se
puede gestionar hoy.

**Independent Test**: abrir «Gestionar equipo» en el descanso y en juego, en 1024 px y en móvil, y comprobar la
distribución, lo que se muestra y que las sustituciones funcionan.

**Acceptance Scenarios**:

1. **Given** una pantalla de 1024 px o más, **When** se abre «Gestionar equipo», **Then** el campo se ve en horizontal
   (o en vertical si el participante eligió esa distribución en Formación, con la misma preferencia) y las pestañas del
   lateral quedan visibles arriba aunque su panel se desplace.
2. **Given** «Gestionar equipo», **When** se muestra, **Then** solo aparecen los jugadores en el campo y los suplentes
   del banquillo; los jugadores de la plantilla que no fueron convocados no aparecen.
3. **Given** «Gestionar equipo», **When** se muestra, **Then** no hay pestaña ni sección de personalización (dorsales,
   equipación, nombre); siguen la formación, la táctica, los lanzadores y las sustituciones.

---

### User Story 4 - Elegir entre gestión automática y control total (Priority: P2)

El participante elige cómo se gestionan las lesiones y expulsiones de su equipo en los partidos contra un NPC.
Con «Automático» (por defecto) todo sigue como hoy. Con «Control total», cuando un lance altera su alineación el
partido se detiene, se le explica qué ha pasado y se abre «Gestionar equipo» para que haga los cambios que quiera
(sustituir, recolocar, cambiar formación o táctica) antes de seguir.

**Why this priority**: da control a quien lo quiere sin cambiar la experiencia de quien no; depende de US3 para la
pantalla de gestión.

**Independent Test**: jugar contra un NPC en control total hasta que haya una lesión o una expulsión propia,
comprobar la parada y que el cambio elegido se aplica; repetir en automático y comprobar que no se detiene.

**Acceptance Scenarios**:

1. **Given** el modo «Automático», **When** un jugador propio se lesiona o es expulsado, **Then** el partido no se
   detiene y el sistema resuelve como hasta ahora.
2. **Given** el modo «Control total» en la 2D, **When** un jugador propio se lesiona, **Then** la reproducción se
   detiene en ese lance, se muestra un aviso con el jugador y el motivo, y se abre «Gestionar equipo»; al confirmar,
   el partido sigue con los cambios aplicados en esa misma interrupción.
3. **Given** el modo «Control total» en simulación rápida, **When** hay una expulsión propia en el minuto 34, **Then**
   el resumen se detiene en el minuto 34 con el aviso y «Gestionar equipo», y al confirmar se calcula el resto.
4. **Given** el modo «Control total» y la pantalla de gestión abierta por una lesión, **When** el participante sigue
   sin hacer cambios o se agota el plazo, **Then** se aplica la decisión automática para ese lance.
5. **Given** un lance del rival (lesión o expulsión del NPC), **When** ocurre, **Then** el partido no se detiene.
6. **Given** un partido entre dos humanos, **When** se muestra, **Then** el selector no aparece y se aplica el modo
   automático (003/FR-027).

---

### User Story 5 - Preparar la jornada con la alineación respetada y las bajas a la vista (Priority: P2)

Entre jornadas, el participante ve en «Plantillas» el nombre y el escudo de cada equipo, y en «Avisos» quién está
lesionado o sancionado y qué necesita su atención. La alineación que confirmó en «Preparar equipo» → «Formación» se
mantiene jornada tras jornada. Si un jugador de esa alineación cae lesionado o sancionado, se le avisa y no puede
avanzar («Siguiente jornada» o «Empezar partido») hasta sustituirlo; el botón explica qué falta.

**Why this priority**: evita que el sistema cambie la alineación a espaldas del participante, pero afecta a las
pantallas entre jornadas y no al partido.

**Independent Test**: confirmar una alineación, jugar una jornada en la que un titular se lesione y comprobar el aviso,
el bloqueo del botón con su mensaje y que, tras sustituirlo, el resto de la alineación no ha cambiado.

**Acceptance Scenarios**:

1. **Given** las pantallas entre jornadas, **When** se abre «Plantillas», **Then** cada plantilla muestra el nombre del
   equipo y su escudo (o el círculo de color si no tiene).
2. **Given** un jugador propio lesionado 2 partidos y otro sancionado 1, **When** se abre «Avisos», **Then** aparecen
   los dos con el motivo y las jornadas que faltan, y un enlace para resolverlo si están en la alineación.
3. **Given** una alineación confirmada sin bajas, **When** se juega la jornada siguiente, **Then** la alineación se
   mantiene igual (titulares, banquillo, colocación, formación, táctica y lanzadores).
4. **Given** una alineación confirmada con un titular que se ha lesionado, **When** el participante intenta avanzar,
   **Then** el botón está desactivado y dice, por ejemplo, «Sustituye a Pérez (lesionado) para continuar».
5. **Given** ese caso, **When** el participante lo sustituye y confirma, **Then** el botón se activa y el resto de la
   alineación queda como estaba.
6. **Given** una baja pendiente sin resolver, **When** vence el plazo de la jornada, **Then** el sistema la sustituye
   automáticamente como hasta ahora para no bloquear el torneo, y se le informa en «Avisos».

---

### User Story 6 - Sonidos del draft, de la interfaz y de la tienda (Priority: P3)

Al confirmar la elección en el draft suena un sonido suave y agradable; en los últimos segundos del turno suena un
latido que crece; los botones principales hacen un clic suave al pulsarlos; y al comprar un sobre en la tienda suena
una caja registradora.

**Why this priority**: mejora la respuesta de la interfaz pero no cambia el juego.

**Independent Test**: hacer un draft dejando que el turno se agote, pulsar botones principales y comprar un sobre en
la tienda con el sonido activado y desactivado.

**Acceptance Scenarios**:

1. **Given** el draft, **When** el participante confirma su elección, **Then** suena un sonido suave una sola vez.
2. **Given** el turno del draft, **When** quedan 5 segundos o menos sin haber elegido, **Then** suena un latido que
   se acelera y sube de volumen hasta el final del turno, y se corta al elegir.
3. **Given** cualquier pantalla, **When** se pulsa un botón principal, **Then** suena un clic suave.
4. **Given** la tienda, **When** se completa la compra de un sobre, **Then** suena una caja registradora.

---

### User Story 7 - Botones de sesión con presencia (Priority: P3)

Quien tiene cuenta encuentra enseguida «Iniciar sesión» (y «Ya tengo cuenta» en el formulario de alta) y, con la
sesión iniciada, «Cerrar sesión». Hoy tienen poca presencia.

**Why this priority**: es una mejora de acceso; el flujo ya funciona.

**Independent Test**: abrir Inicio sin sesión y con sesión en escritorio y móvil y comprobar que los botones se ven
sin desplazarse y con la importancia acordada.

**Acceptance Scenarios**:

1. **Given** Inicio sin sesión iniciada, **When** se carga, **Then** «Iniciar sesión» se ve sin desplazarse, con
   estilo de botón (no de enlace de texto) y junto a la acción de jugar.
2. **Given** el formulario de crear cuenta, **When** se muestra, **Then** «Ya tengo cuenta» es un botón secundario
   claramente visible, no un enlace pequeño.
3. **Given** la sesión iniciada, **When** se abre Inicio o el menú de la cuenta, **Then** «Cerrar sesión» se ve como
   botón secundario con su icono.

---

### Edge Cases

- **Gol durante la celebración anterior** (dos goles muy seguidos a velocidad alta): la nueva celebración sustituye a
  la que se esté reproduciendo; no se encolan.
- **Velocidad ×2 o mayor**: la celebración y los sonidos acompañan a la velocidad (duración proporcional) y la 2D no
  espera a que terminen.
- **Gol en la tanda de penaltis**: no hay celebración grande (solo el sonido), para no alargar la tanda.
- **Gol en propia puerta**: cuenta como gol del equipo que suma el tanto.
- **Varias incidencias en la misma interrupción** en control total (p. ej., roja y lesión a la vez): una sola parada
  que las lista todas.
- **Control total sin sustituciones restantes**: el partido se detiene igual (se puede recolocar o cambiar formación o
  táctica), y el aviso indica que no quedan cambios.
- **Equipo por debajo de 7 jugadores**: se aplica la regla de la 001 sin parada (el partido termina).
- **Lesión durante la tanda de penaltis o tras el pitido final**: no hay parada.
- **Alineación confirmada con varias bajas**: el mensaje del botón nombra la primera y cuántas más quedan
  («Sustituye a Pérez (lesionado) y 1 más para continuar»).
- **Baja sin suplente de su posición** (p. ej., 4-4-2 sin otro DC): no levanta el bloqueo; el participante pone a otro
  jugador fuera de su posición (con penalización) o cambia la formación.
- **Todos los suplentes lesionados o sancionados**: el bloqueo se levanta y se juega con los disponibles (FR-029).
- **Jugador que vuelve de su baja**: no vuelve solo a la alineación; aparece en «Avisos» como disponible, sin bloquear.
- **Sin alineación confirmada nunca** (primera jornada): se usa la alineación automática como hasta ahora.
- **Escudos iguales en Plantillas**: no aplica la regla de la 011/Q2 (no es un partido); cada plantilla muestra el suyo.
- **Navegador que bloquea el audio hasta la primera interacción**: los sonidos empiezan a sonar tras el primer clic;
  ningún sonido es necesario para entender lo que pasa.
- **Latido con el sonido silenciado**: no suena; el aviso visual del temporizador sigue.

## Requirements *(mandatory)*

### Functional Requirements

#### Sonidos (puntos 1 y 6)

- **FR-001**: El partido 2D DEBE reproducir: pitido de inicio (corto) al empezar cada parte y la prórroga, pitido de
  descanso (doble) al final de la primera parte y de la primera parte de la prórroga, y pitido final (triple y más
  largo) al terminar el partido.
- **FR-002**: Un gol del equipo del participante DEBE sonar con el público de casa cantando el gol (alegre); un gol
  del rival, con un murmullo del público. En un partido entre humanos, cada uno lo oye desde su lado.
- **FR-003**: Cada tarjeta amarilla o roja DEBE sonar con un silbato y el público asombrado; la roja PUEDE ser más
  intensa que la amarilla.
- **FR-004**: En el draft, confirmar la elección DEBE sonar con un sonido suave y agradable, distinto de `seleccionCarta`.
- **FR-005**: Cuando queden 5 segundos o menos del turno del draft sin haber elegido, DEBE sonar un latido de corazón
  que se acelera y sube de volumen; DEBE cortarse al elegir o al acabar el turno.
- **FR-006**: Pulsar un botón principal (003/FR-006) DEBE sonar con un clic suave, a volumen bajo.
- **FR-007**: Completar la compra de un sobre en la tienda DEBE sonar con una caja registradora.
- **FR-008**: Todos los sonidos nuevos DEBEN respetar el interruptor 🔊 y el volumen general, tener volumen propio
  ajustable y documentarse en [docs/juego/sonidos.md](../../docs/juego/sonidos.md): las siete filas pasan de
  «Pendientes» a «Sonidos actuales» con su fichero, volumen y procedencia (licencia o sintetizado).

#### Celebración de gol (punto 1)

- **FR-009**: Al marcarse un gol en la 2D (salvo en la tanda de penaltis), DEBE reproducirse una celebración que ocupa
  el espacio del terreno de juego, con el texto «¡GOL!» grande que entra con una animación, el nombre del goleador y
  el escudo (o color) del equipo que marca. Las del juego duran como mucho 3 s a ×1 (las de secuencia externa, la
  suya; FR-010a); todas se acortan con la velocidad y se pueden cerrar con un clic.
- **FR-010**: Las celebraciones DEBEN ser un tipo de cosmético más (como escudos y sobres, 011), con un espacio común
  sobre el campo en el que se reproduce cualquiera de ellas, de modo que añadir una nueva no cambie la pantalla del
  partido.
- **FR-010a**: El espacio de celebración DEBE admitir dos clases de celebración: las animadas por el propio juego
  (texto, escudo y efectos, como las 4 de esta spec) y las basadas en una secuencia animada creada fuera del juego
  (p. ej., una minisecuencia de gol de estilo anime, en vídeo o secuencia de imágenes con transparencia), con su
  propia duración y, opcionalmente, su propio sonido. Añadir una de esta segunda clase DEBE requerir solo su fichero
  y su entrada en el catálogo de cosméticos. En esta spec basta con una celebración de prueba de esa clase (fuera del
  catálogo visible) que demuestre que funciona; todas siguen FR-009 (cierre con un clic, acortarse con la velocidad),
  FR-014 y el interruptor 🔊.
- **FR-011**: DEBE haber al menos 4 celebraciones: la del juego (gratuita y por defecto) y 3 más con estilos distintos.
  Todas DEBEN poder elegirse ya en «Mi perfil» como celebración favorita, igual que el escudo.
- **FR-012**: En el partido DEBE reproducirse la celebración favorita del dueño del equipo que marca; los NPC usan la
  del juego.
- **FR-013**: La tienda DEBE mostrar la sección de celebraciones como «Próximamente» (011/FR-023), sin venta, hasta una
  spec posterior.
- **FR-014**: Con la preferencia de movimiento reducido, las celebraciones DEBEN mostrarse sin desplazamientos ni
  escalados (fundido de entrada y salida).

#### Gestionar equipo durante el partido (punto 2)

- **FR-015**: «Gestionar equipo» (003/FR-028) DEBE adoptar la distribución de Formación de la 011: campo horizontal
  desde 1024 px con la misma preferencia «Campo horizontal» (011/FR-024) y pestañas del lateral siempre visibles
  (011/FR-025).
- **FR-016**: «Gestionar equipo» DEBE mostrar solo los jugadores en el campo y el banquillo del partido; los jugadores
  de la plantilla no convocados NO DEBEN aparecer.
- **FR-017**: «Gestionar equipo» NO DEBE incluir la personalización (dorsales, equipación, nombre ni escudo). Conserva
  formación, táctica, lanzadores, sustituciones restantes, tarjetas y lesiones de cada jugador (003/FR-028 y FR-029).

#### Barra superior y tarjetas (punto 3)

- **FR-018**: En la 2D, los botones de la barra superior DEBEN ir en una sola línea en pantallas de 1024 px o más, y el
  tamaño del campo NO DEBE cambiar en todo el partido por cambios en esa barra. En pantallas estrechas, la barra PUEDE
  reorganizarse pero con una altura fija.
- **FR-019**: En «Lo que ha pasado», el icono de cada tarjeta DEBE tener el color de la tarjeta mostrada (amarillo o
  rojo; la segunda amarilla, con su indicación de roja) en los temas claro y oscuro.

#### Modo de gestión de incidencias (punto 4)

- **FR-020**: El participante DEBE poder elegir el modo de gestión de incidencias: «Automático» (por defecto) o
  «Control total». El selector DEBE estar en «Preparar equipo» y en la pantalla del partido contra un NPC (también
  durante el partido), y la elección DEBE recordarse en su cuenta para los siguientes partidos.
- **FR-021**: En «Automático», las lesiones y expulsiones DEBEN resolverse como hasta ahora.
- **FR-022**: En «Control total», ante un lance que altere la alineación del equipo del participante, el partido DEBE
  detenerse en esa interrupción, en la 2D y en la simulación rápida, mostrar qué ha pasado (jugador, motivo, minuto) y
  abrir «Gestionar equipo». Los cambios confirmados DEBEN aplicarse en esa misma interrupción, antes de que siga el
  juego. En la simulación rápida, el resumen se calcula hasta el minuto del lance, se detiene con el aviso y
  «Gestionar equipo» como botón principal, y al seguir se calcula el resto hasta la siguiente parada (descanso, otra
  incidencia propia o final). En «Automático» la simulación rápida conserva solo sus paradas actuales.
- **FR-023**: Si el participante sigue sin resolver la incidencia, o se agota el plazo de decisión del partido, DEBE
  aplicarse la decisión automática de FR-021 para ese lance.
- **FR-024**: El modo solo DEBE existir en los partidos contra un NPC; entre humanos, no se muestra y se aplica el
  automático (003/FR-027). Los lances del rival no detienen el partido.
- **FR-025**: La parada de «Control total» NO DEBE cambiar el cálculo del partido más allá de los cambios que decida
  el participante: con las mismas decisiones, el resultado DEBE ser idéntico al del modo automático (Principio V).
  Los cambios DEBEN validarse en el servidor (003/FR-029).

#### Pantallas entre jornadas (punto 5)

- **FR-026**: «Plantillas» DEBE mostrar, en cada plantilla, el nombre del equipo y su escudo (o el círculo de color si
  no tiene escudo).
- **FR-027**: «Avisos» DEBE incluir, para el equipo del participante: jugadores lesionados (gravedad y jornadas que
  faltan), jugadores sancionados (motivo y jornadas que faltan), jugadores que vuelven a estar disponibles, y bajas
  pendientes de la alineación confirmada, estas con un enlace a Formación. Los avisos que piden intervención DEBEN
  distinguirse de los informativos.
- **FR-028**: La alineación confirmada en «Preparar equipo» → «Formación» DEBE mantenerse en las jornadas siguientes
  sin cambios automáticos mientras el participante tenga tiempo para corregirla.
- **FR-029**: Si la alineación confirmada contiene una baja pendiente, el botón para avanzar («Siguiente jornada»,
  «Empezar partido» o el equivalente) DEBE estar desactivado y mostrar qué lo impide y cómo resolverlo, y el aviso
  DEBE aparecer también en «Avisos». Cuentan como solución sustituirla por cualquier suplente disponible, aunque juegue
  fuera de su posición con su penalización, o cambiar la formación. El bloqueo solo se levanta sin intervención si
  no queda ningún suplente disponible: el botón se activa con un aviso (p. ej., «Jugarás con 10») y el equipo juega
  con los disponibles (mínimo de la 001).
- **FR-030**: Si vence el plazo de la jornada con una baja pendiente, el sistema DEBE sustituirla automáticamente con
  el suplente disponible más adecuado (001, caso límite) para no bloquear a los demás participantes, e informar de
  ello en «Avisos». Con un solo humano en la partida no hay plazo de jornada, así que el bloqueo dura hasta que el
  participante resuelva la baja.
- **FR-031**: Los botones «Iniciar sesión», «Ya tengo cuenta» y «Cerrar sesión» DEBEN tener estilo de botón (no de
  enlace), verse sin desplazarse en Inicio en escritorio y móvil, e ir con su icono; «Iniciar sesión» sin sesión
  iniciada DEBE estar junto a la acción principal de jugar, con la misma altura, como botón secundario.

**Ronda 2 (2026-11-08)**:

- **FR-032**: La 2D NO DEBE mostrar el rótulo «¡Gol!» (ni en el campo ni en la franja): lo sustituye la celebración.
- **FR-033**: La celebración DEBE durar lo mismo a cualquier velocidad (x2, x4, x8) y el reloj de la reproducción DEBE
  pararse en cada gol el tiempo de la celebración más larga (3 s). Los sonidos de la 2D suenan a su velocidad natural.
- **FR-034**: Las celebraciones del juego DEBEN ser animaciones elaboradas por capas (destello, ondas, confeti o
  serpentinas, focos y flashes, chispas de neón, tiza) que conserven el color del equipo y el goleador; con movimiento
  reducido, solo el fundido.
- **FR-035**: Los pitidos, el público (gol propio, gol del rival y el «oooh» de las tarjetas) y la caja registradora
  DEBEN ser grabaciones reales con licencia CC0, con su procedencia en `public/sonidos/LICENCIA`.
- **FR-036**: En la 2D con control total, cada gol (propio o del rival) DEBE parar el partido tras la celebración y
  abrir «Gestionar equipo»; lo decidido se aplica en el saque de centro. En automático, los goles no paran.
- **FR-037**: La simulación rápida NO DEBE ofrecer el modo de incidencias ni pararse por incidencias: se resuelven en
  automático. FR-020 a FR-025 quedan solo para la 2D.
- **FR-038**: En Formación, sustituir a un titular de baja NO DEBE dejarlo en el banquillo (sale al resto de la
  plantilla) y un suplente de baja DEBE poder sacarse del banquillo, para que «Confirmar alineación» se pueda
  desbloquear siempre.
- **FR-039**: Los avisos emergentes DEBEN aparecer arriba a la derecha, bajo la barra de navegación.
- **FR-040**: En Plantillas, la primera columna DEBE mostrar el nombre, el escudo y las estrellas con la media del mejor
  once del equipo elegido; las pestañas, solo el nombre; los porteros, arriba en la columna de los defensas.
- **FR-041**: Desde los parámetros 6.2.0, el equipo que gana por 2 goles o más DEBE bajar la intensidad: tira peor y
  progresa menos en el último tercio, más cuanto mayor es la ventaja (los penaltis no cambian). Los partidos de
  versiones anteriores se reproducen igual.
- **FR-042**: Desde los parámetros 6.2.0, el hueco «POR o DEF» de cada sobre DEBE ser un portero el 70 % de las veces
  (antes, el 50 %); si en el pool ya no quedan porteros, un defensa.

**Ronda 3 (2026-11-09)**:

- **FR-043**: En Formación, a 1366 × 768 o más, los siete suplentes DEBEN verse enteros sin desplazar el lateral; solo
  «Resto de la plantilla» puede quedar debajo. El resumen de la colocación va dentro de la caja de la media.
- **FR-044**: En Formación, sustituir a una baja (o sacar a un suplente) NO DEBE dejar un hueco en el banquillo: lo
  ocupa al momento el mejor disponible del resto de la plantilla (sin bajas y sin volver a meter al que se acaba de
  sacar).
- **FR-045**: Las celebraciones Estadio y Pizarra NO DEBEN recortar las letras de «¡GOL!».
- **FR-046**: El selector de modo DEBE hablar de «eventos trascendentales» (goles, lesiones y expulsiones) y dar el
  detalle tras el icono de información; en la 2D, DEBE quedar anclado arriba del carril y «Lo que ha pasado» DEBE
  bajar solo hasta el último evento.
- **FR-047**: La 2D (en directo y en la repetición) DEBE tener ambiente de público: rumor continuo y, de vez en
  cuando, bombo, cánticos y vuvuzelas; más bajo en las pausas, callado al acabar y con el interruptor de sonido.
- **FR-048**: En «Gestionar equipo» y en los distintivos de baja, las tarjetas DEBEN verse con su color.
- **FR-049**: Desde 720 px, la barra principal DEBE mostrar una ayuda resumida (dos líneas como mucho) del control
  bajo el cursor o con el foco (`data-ayuda`); los iconos de información amplían. En la 2D, la barra DEBE mostrar el
  cronómetro, la fase (descanso, prórroga…) y quién lleva el balón.
- **FR-050**: La tienda DEBE vender celebraciones (sueltas, sin packs, con vista previa animada); «Mi perfil» DEBE
  enlazar a la tienda mientras falte alguna. Desde la ronda 4, las de pago son Discoteca y Fuegos artificiales.
- **FR-051**: En la 2D, la chapa de un jugador con retrato propio DEBE mostrar el retrato rodeado del color del
  equipo, con el dorsal en una chapita, sin componer la imagen en cada fotograma.

**Ronda 4 (2026-11-09)**:

- **FR-052**: El ambiente de público de la 2D DEBE salir de grabaciones reales con licencia CC0 (procedencia en
  `public/sonidos/LICENCIA`), con el rumor en bucle y, de vez en cuando, bombo, cánticos y vuvuzelas reconocibles.
- **FR-053**: Las celebraciones Discoteca (bola de espejos, focos de colores y muñequitos bailando) y Fuegos
  artificiales DEBEN existir como celebraciones de juego de 3 s y venderse en la tienda; Estadio y Neón, gratis.
- **FR-054**: En el carril de la 2D, el selector de modo DEBE verse como los demás paneles (bordes redondeados,
  vidrio, sombra) sin dejar de estar anclado.
- **FR-055**: La ayuda de la barra principal DEBE usar la letra de cuerpo. En «Nueva partida», desde 720 px, las
  explicaciones (modos, rivales, dificultades, ritmo) DEBEN ir solo en la barra, que ocupa todo el ancho, y los cuatro
  recuadros DEBEN caber sin desplazar a 1366 × 768; en estrecho, las explicaciones siguen en su sitio. Los enlaces de
  navegación DEBEN tener su ayuda.

### Key Entities

- **Preferencia de modo de gestión**: pertenece a la cuenta del participante; valores «Automático» y «Control total»;
  por defecto «Automático».
- **Incidencia de partido**: lance que altera la alineación del participante en control total; tiene jugador, motivo
  (lesión o expulsión), minuto y estado (pendiente, resuelta por el participante, resuelta automáticamente).
- **Celebración de gol**: cosmético con identificador, nombre, si es gratuita, su clase (animada por el juego o
  secuencia externa), su presentación (o fichero de secuencia), su duración y su sonido opcional; se elige como
  favorita en el perfil. Se relaciona con el catálogo de cosméticos de la 011.
- **Alineación confirmada**: la última que el participante confirmó para el torneo; persiste entre jornadas y conoce
  sus bajas pendientes.
- **Aviso**: mensaje de la bandeja entre jornadas; tipo (intervención o informativo), jugador afectado, motivo,
  jornadas restantes y destino del enlace.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Las siete acciones de «Pendientes» de sonidos.md suenan y están documentadas; «Pendientes» queda vacía
  para esas filas.
- **SC-002**: En 10 partidos 2D, el 100 % de los goles fuera de la tanda muestran celebración y ningún gol deja la
  celebración anterior a medias en pantalla.
- **SC-003**: Añadir una celebración nueva, de cualquiera de las dos clases, no requiere tocar la pantalla del partido
  (se comprueba con la celebración de prueba de secuencia externa de FR-010a).
- **SC-004**: En un partido 2D completo a 1024 px y 1440 px, el tamaño del campo no varía ni un píxel entre el inicio y
  el final.
- **SC-005**: En control total, el 100 % de las lesiones y expulsiones propias detienen el partido, y ninguna del rival
  lo hace.
- **SC-006**: Con las mismas decisiones, un partido en control total y otro en automático con la misma semilla dan el
  mismo resultado.
- **SC-007**: En 10 jornadas jugadas con una alineación confirmada, la alineación solo cambia cuando el participante la
  cambia o cuando vence el plazo con una baja pendiente.
- **SC-008**: Ningún participante puede avanzar de jornada con una baja pendiente en su alineación antes de que venza
  el plazo.
- **SC-009**: En una prueba con 5 personas con cuenta, todas encuentran «Iniciar sesión» en Inicio en menos de 5 s.

- **SC-010** (ronda 2): Reproduciendo con los parámetros 6.2.0 los 5 partidos del 41-5, el participante marca de media
  entre 3,5 y 5 goles por partido (antes, 5-9) y un once de 88 contra uno de 70 no supera los 4,5 goles de media.

## Assumptions

- La celebración se muestra solo en la 2D; la simulación rápida no tiene terreno de juego (solo suenan los goles si
  se muestran en su resumen).
- Las 3 celebraciones nuevas son gratuitas mientras no haya venta; cuando se vendan (spec futura), las que pasen a ser
  de pago se decidirán entonces sin cambiar este mecanismo.
- «Compra de un sobre» incluye los sobres de cartas y los diseños de sobre de la tienda; el resto de compras pueden
  reutilizar el mismo sonido si se decide en la implementación.
- El «botón principal» es el de 003/FR-006; los secundarios no suenan para no saturar.
- El umbral del latido (5 s) y la duración de la celebración (3 s) son valores por defecto ajustables.
- En control total, la parada usa el mismo plazo de decisión que ya tiene la gestión del partido; no se añade un plazo
  nuevo.
- Los sonidos se obtienen de bancos libres con licencia compatible o se sintetizan,
  como los actuales (procedencia en sonidos.md).
- La preferencia «Campo horizontal» es la misma para Formación y «Gestionar equipo».
- Fuera de alcance: venta de celebraciones, animaciones distintas de las de gol y sonidos de ambiente continuos. Los
  cambios del motor de la ronda 2 (FR-041, FR-042) se añadieron tras probar la primera entrega.
