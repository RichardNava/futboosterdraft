# Feature Specification: Simulación de partidos en hilos de trabajo

**Feature Branch**: `main` (sin rama propia, como la spec 008)

**Created**: 2026-11-01

**Status**: Implementada, sin validar ([ROADMAP](../../ROADMAP.md) INI-07)

**Input**: User description: "Spec 9 — Cambio de arquitectura (Hilos de trabajo). Simulación de partidos fuera del hilo principal del servidor (INI-07 del ROADMAP, criterio 001/SC-017). Objetivo: que la simulación de partidos se ejecute en un grupo de hilos de trabajo para que el hilo principal siga atendiendo HTTP y WebSocket y que el servidor aproveche varios núcleos; cumplir 001/SC-017 en una máquina de 4–8 núcleos, medido con `beta-100.js` con servidor, base de datos y k6 en máquinas separadas. Restricciones: resultados idénticos con las mismas semillas (`pnpm test:equivalence` en verde sin cambios); se mantienen las garantías del actor (comandos de una partida serializados, dos aperturas simultáneas resuelven el partido una sola vez); persistencia y difusión siguen en el hilo principal y al hilo de trabajo solo va el cálculo puro del motor y la IA; tamaño del grupo configurable con un valor por defecto según los núcleos; si un hilo de trabajo falla, no se pierde el partido ni se bloquea la partida. Fuera de alcance: optimizar el motor (INI-06) y repartir partidas entre varios procesos o máquinas."

## Contexto

Esta spec cubre el criterio de cierre 2 de [INI-07](../../ROADMAP.md#ini-07-carga-y-escalabilidad-de-la-beta):
cumplir [001/SC-017](../001-draft-manager-mvp/spec.md) (100 partidas simultáneas).

Situación medida (ver [003/validacion.md](../003-mejoras-ux-simulacion/checklists/validacion.md), fila «Carga»):

- El servidor es un único proceso. Cada partida es un actor con una cola de comandos (`apps/server/src/actores/actor.ts`,
  `ControladorPartida`), y la simulación de partidos se ejecuta de forma síncrona en el mismo hilo que atiende HTTP y
  WebSocket.
- Un partido entre humanos se resuelve entero cuando lo abre el primero de los dos (`resolverPartidoEntreHumanos`,
  que llama a `resolverResto` de `@fbd/ai` sobre `crearPartido` de `@fbd/engine`): 150–400 ms de CPU por partido.
  Los partidos NPC contra NPC (`resolverPartidosSinHumanos`) y los de un humano contra un NPC en directo
  (`iniciarPartido`, tramos) también calculan en ese hilo.
- Con `tools/load/beta-100.js` y todo en la misma máquina:

  | Escenario | Apertura p95 | Entrega del sobre p95 | «Seguir» → final p95 | Jornada NPC p95 |
  |-----------|-------------:|----------------------:|---------------------:|----------------:|
  | 10 partidas, todos abren a la vez | 8,7 s | 447 ms | 433 ms | 858 ms |
  | 100 partidas (730 humanos), aperturas en 2 min | 60 s (22 % > 60 s) | 10,2 s | 6,6 s | 21,7 s |
  | **Objetivo (001/SC-017)** | **< 3 s** | **< 1 s** | **< 3 s** | **< 10 s** |

- Un hilo resuelve ~3–6 partidos entre humanos por segundo; una jornada de 100 partidas pide ~360. Mientras todo
  calcule en un hilo, más núcleos no ayudan, y cada cálculo largo retrasa también los turnos de draft de otras
  partidas.

Términos usados en esta spec:

- **Hilo principal**: el que atiende HTTP y WebSocket, ejecuta las colas de las partidas, persiste y difunde.
- **Hilo de trabajo**: hilo del mismo proceso que solo hace cálculo puro (motor de simulación e IA de los NPC), sin
  acceso a la base de datos ni a las conexiones.
- **Grupo de hilos**: el conjunto fijo de hilos de trabajo que reparte los cálculos pendientes.
- **Cálculo de partido**: una petición autocontenida al grupo (estado y semilla de entrada → resultado y eventos de
  salida) que da lo mismo que daría hoy el cálculo en el hilo principal.

## Clarifications

### Session 2026-11-01

- Q: Con cola en el grupo, ¿los cálculos que espera un humano pasan por delante de los NPC contra NPC? → A: Sí, dos
  prioridades: apertura entre humanos y tramos en directo antes que NPC contra NPC; orden de llegada dentro de cada
  prioridad.
- Q: Si un partido NPC contra NPC agota los reintentos, ¿qué pasa con la jornada? → A: Los demás partidos se
  persisten; el fallido queda sin jugar, se registra con su semilla y se reintenta al reanudar la jornada o reiniciar
  el servidor.
- Q: ¿Se puede arrancar en producción con la simulación en el hilo principal como interruptor de emergencia? → A: Sí,
  tamaño `0` = modo en proceso (el mismo que usan los tests), avisado en el registro al arrancar.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Abrir un partido entre humanos sin esperar a los demás (Priority: P1)

Durante una jornada de torneo con muchas partidas activas, un participante abre su partido contra otro humano y ve
el resultado del descanso en segundos, aunque cientos de partidos se estén abriendo a la vez en el servidor. Mientras
tanto, quienes están en un draft de otra partida siguen recibiendo su sobre al instante.

**Why this priority**: es el cuello de botella medido (apertura p95 8,7 s con solo 10 partidas) y el que más
arrastra a los demás umbrales: cada partido entre humanos ocupa el hilo principal 150–400 ms.

**Independent Test**: con solo este cambio, repetir el escenario de 10 partidas de `beta-100.js` (todos abren a la
vez) y comprobar apertura p95 < 3 s y entrega del sobre p95 < 1 s; y ejecutar el test «dos aperturas simultáneas
resuelven el partido una sola vez» de `torneo-asincrono`.

**Acceptance Scenarios**:

1. **Given** una jornada abierta con un partido entre dos humanos, **When** el primero lo abre, **Then** el partido se
   calcula fuera del hilo principal y el participante recibe el mismo resultado y los mismos eventos que con la misma
   semilla antes de esta spec.
2. **Given** los dos humanos de un partido lo abren a la vez, **When** llegan las dos aperturas, **Then** el partido
   se calcula una sola vez y ambos reciben el mismo resultado.
3. **Given** un partido entre humanos calculándose en un hilo de trabajo, **When** otra partida recibe la última
   elección de un turno de draft, **Then** sus participantes reciben el nuevo sobre sin esperar a que termine ese
   cálculo.
4. **Given** un partido entre humanos calculándose, **When** llega otro comando a la misma partida (p. ej. una
   alineación o una segunda apertura), **Then** se procesa después, en el orden de llegada, como hasta ahora.

---

### User Story 2 - Jornadas entre NPC en menos de 10 segundos (Priority: P2)

Al abrirse una jornada, los partidos en los que no juega ningún humano se calculan en paralelo en los hilos de
trabajo, y sus resultados están disponibles en la clasificación en menos de 10 segundos aunque haya 100 partidas
activas.

**Why this priority**: hoy da p95 21,7 s con 100 partidas; es el segundo umbral de SC-017 que falla y reutiliza el
mecanismo de la US1.

**Independent Test**: con el grupo de hilos activo, abrir jornadas con varios partidos NPC contra NPC y comprobar
que los resultados coinciden con los de la misma semilla en el hilo principal y que `jornada_npc_ms` p95 < 10 s en
`beta-100.js`.

**Acceptance Scenarios**:

1. **Given** una jornada con varios partidos sin humanos, **When** se abre, **Then** esos partidos se calculan fuera
   del hilo principal, pueden repartirse entre varios hilos y sus resultados se persisten y difunden desde el hilo
   principal.
2. **Given** las mismas semillas, **When** se calcula la jornada en hilos de trabajo, **Then** resultados, eventos,
   bajas y clasificación son idénticos a los de antes de esta spec.

---

### User Story 3 - Partido en directo contra un NPC sin bloquear el servidor (Priority: P3)

Un participante juega en directo contra un NPC (simulación por tramos, con decisiones en el descanso). El cálculo de
cada tramo y de las decisiones de la IA no ocupa el hilo principal, de modo que el resto de partidas no lo nota.

**Why this priority**: también calcula en el hilo principal, pero cada tramo es más corto que un partido entero y no
aparece como causa principal en las mediciones; se cubre para que ningún cálculo del motor quede en el hilo
principal.

**Independent Test**: jugar un partido en directo contra un NPC con decisiones en el descanso y comprobar que el
resultado coincide con el de la misma semilla y decisiones antes de esta spec, y que `final_ms` («Seguir» → final)
p95 < 3 s en `beta-100.js`.

**Acceptance Scenarios**:

1. **Given** un partido en directo humano contra NPC, **When** el participante pulsa «Seguir» o cambia la táctica en
   el descanso, **Then** el tramo siguiente se calcula fuera del hilo principal y produce el mismo desarrollo que
   antes con la misma semilla y las mismas decisiones.
2. **Given** un partido en directo a medias, **When** se consulta o reanuda (reconexión), **Then** su estado sigue
   disponible como hasta ahora.

---

### Edge Cases

- **Un hilo de trabajo falla o termina inesperadamente** a mitad de un cálculo: el cálculo se repite (en otro hilo o
  en uno nuevo que sustituye al caído); el partido no se pierde, la partida no queda bloqueada y el resultado es el
  mismo, porque el cálculo es determinista con su semilla.
- **El mismo cálculo falla de forma repetida** (p. ej. un error del motor con ese estado): tras un número acotado de
  reintentos, el comando de la partida termina con error, se registra con su semilla para reproducirlo, y la cola de
  la partida sigue atendiendo comandos; el partido queda pendiente de abrirse de nuevo, como cualquier error actual
  del motor.
- **Un partido NPC contra NPC agota los reintentos**: los demás partidos de la jornada se persisten y difunden con
  normalidad; el fallido queda sin jugar, se registra con la partida, el partido y la semilla, y se vuelve a calcular
  al reanudar la jornada o al reiniciar el servidor. No se inventa ningún resultado.
- **El cálculo tarda más de lo esperado** (hilo colgado): un tiempo máximo por cálculo lo da por fallido y aplica la
  regla anterior.
- **Todos los hilos ocupados**: los cálculos esperan en la cola del grupo según su prioridad (FR-012) y, dentro de
  cada prioridad, en orden de llegada; los comandos que no calculan partidos (draft, alineación, consultas) no esperan
  a esa cola.
- **Una jornada NPC llena la cola**: una apertura de partido entre humanos o un tramo en directo que llega después no
  espera a que terminen los partidos NPC en cola; solo espera a que quede libre un hilo.
- **El servidor se apaga** con cálculos pendientes: nada se ha persistido de esos partidos, así que al volver se
  calculan de nuevo al abrirlos o al reanudar la jornada, como hoy tras un reinicio.
- **Tamaño del grupo configurado a un valor no válido** (negativo, no entero, no numérico): el servidor usa el valor
  por defecto y lo avisa en el registro de arranque.
- **Tamaño del grupo configurado a `0`**: no es un error, es el modo en proceso (FR-013); el servidor lo avisa en el
  registro de arranque.
- **Máquina de un solo núcleo**: el grupo tiene al menos un hilo de trabajo; el hilo principal sigue libre para HTTP y
  WebSocket aunque no gane paralelismo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Todo cálculo del motor de simulación y de la IA de los NPC para un partido (entre humanos, NPC contra
  NPC y tramos en directo humano contra NPC) DEBE ejecutarse en un hilo de trabajo, no en el hilo principal, salvo en
  el modo en proceso (FR-013).
- **FR-002**: Con la misma entrada y la misma semilla, un cálculo en un hilo de trabajo DEBE producir exactamente el
  mismo resultado, eventos, bajas y estadísticas que el cálculo actual en el hilo principal. `pnpm test:equivalence`
  DEBE pasar sin cambios en sus tests ni en sus datos de referencia.
- **FR-003**: La persistencia en base de datos, la difusión por WebSocket, los avisos y la actualización de
  clasificaciones DEBEN seguir ejecutándose en el hilo principal. Un hilo de trabajo NO DEBE acceder a la base de
  datos ni a las conexiones.
- **FR-004**: Los comandos de una misma partida DEBEN seguir procesándose de uno en uno y en orden de llegada, también
  mientras uno de ellos espera un cálculo en un hilo de trabajo. Dos aperturas simultáneas de un partido entre
  humanos DEBEN resolverlo una sola vez (test `torneo-asincrono` «dos aperturas simultáneas» en verde sin cambios).
- **FR-005**: Mientras una partida espera un cálculo, el hilo principal DEBE seguir atendiendo los comandos de las
  demás partidas y las peticiones HTTP y WebSocket.
- **FR-006**: Cálculos de partidas distintas, y partidos distintos de una misma jornada sin humanos, DEBEN poder
  ejecutarse en paralelo en hilos de trabajo distintos.
- **FR-007**: El número de hilos de trabajo DEBE poder configurarse al arrancar el servidor. Si no se configura, el
  valor por defecto DEBE ser el número de núcleos disponibles menos uno (reservado para el hilo principal), con un
  mínimo de 1. El valor `0` activa el modo en proceso (FR-013). Un valor no válido DEBE sustituirse por el valor por
  defecto con un aviso en el registro.
- **FR-008**: Si un hilo de trabajo falla, termina o supera el tiempo máximo de un cálculo, el grupo DEBE sustituirlo
  por uno nuevo y repetir el cálculo, hasta un máximo de reintentos. Agotados los reintentos, el comando DEBE terminar
  con error (registrado con la partida, el partido y la semilla) sin dejar la cola de la partida bloqueada ni el
  partido marcado como jugado. En una jornada sin humanos, el fallo de un partido NO DEBE impedir que se persistan los
  demás; el partido fallido se vuelve a calcular al reanudar la jornada o al reiniciar el servidor.
- **FR-009**: El servidor DEBE registrar, para poder diagnosticar la carga: tamaño del grupo al arrancar, cálculos en
  espera, duración de cada cálculo y fallos o reintentos de hilos de trabajo.
- **FR-010**: Los tests unitarios, de integración y e2e existentes DEBEN pasar sin cambiar sus expectativas. Los tests
  que hoy simulan partidos en el propio proceso PUEDEN seguir haciéndolo con el modo en proceso (FR-013), siempre que
  el comportamiento observable sea el mismo.
- **FR-011**: 001/SC-017 DEBE medirse con `tools/load/beta-100.js` (100 partidas, un VU por humano) con servidor, base
  de datos y generador de carga en máquinas separadas, y el resultado DEBE registrarse en
  [003/validacion.md](../003-mejoras-ux-simulacion/checklists/validacion.md) y en
  [ROADMAP.md](../../ROADMAP.md) INI-07.
- **FR-012**: La cola del grupo DEBE tener dos prioridades. Los cálculos que espera un humano (apertura de un partido
  entre humanos y tramos en directo humano contra NPC) DEBEN asignarse a un hilo libre antes que cualquier cálculo
  NPC contra NPC en espera. Dentro de cada prioridad se respeta el orden de llegada. Un cálculo ya en curso no se
  interrumpe para dar paso a otro de más prioridad.
- **FR-013**: Configurar el tamaño del grupo a `0` DEBE activar el **modo en proceso**: los cálculos se ejecutan en el
  hilo principal, como antes de esta spec, con los mismos resultados. Es el modo que usan los tests que lo necesiten
  y el interruptor de emergencia en producción. El servidor DEBE avisar en el registro de arranque cuando se use.
  En este modo FR-001, FR-005, FR-006 y FR-012 no aplican; FR-002, FR-003 y FR-004 sí.

### Key Entities

- **Cálculo de partido**: petición autocontenida que se envía a un hilo de trabajo. Contiene todo lo necesario para
  simular (equipos, alineaciones, tácticas, semilla, estado del partido si es un tramo) y devuelve resultado, eventos y
  estado final. No contiene conexiones ni referencias a la base de datos.
- **Grupo de hilos**: conjunto de hilos de trabajo de tamaño fijo con una cola de cálculos pendientes en dos
  prioridades (humano / NPC contra NPC). Atributos: tamaño, cálculos en espera por prioridad, cálculos en curso,
  fallos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Con 100 partidas simultáneas en `beta-100.js`, en un servidor de 4 a 8 núcleos con base de datos y
  generador de carga en máquinas separadas: entrega del sobre p95 < 1 s, apertura de partido p95 < 3 s, «Seguir» →
  final p95 < 3 s (001/SC-009), jornada NPC p95 < 10 s, y 0 errores de HTTP y WebSocket atribuibles al servidor.
- **SC-002**: Las 100 partidas de esa prueba terminan sin bloqueos ni pérdida de estado (001/SC-017).
- **SC-003**: Con 10 partidas en las que todos abren a la vez (el escenario que hoy da 8,7 s), apertura p95 < 3 s en
  la misma máquina de desarrollo donde se midió.
- **SC-004**: El 100 % de los partidos de `pnpm test:equivalence` y de una muestra de 1.000 partidos con semillas fijas
  dan el mismo resultado y eventos calculados en hilos de trabajo que en el hilo principal.
- **SC-005**: Al matar un hilo de trabajo a mitad de un cálculo en una prueba, el partido termina con el mismo
  resultado y la partida sigue aceptando comandos.
- **SC-006**: Durante la prueba de 100 partidas, el uso de CPU se reparte entre varios núcleos (más de un núcleo por
  encima del 50 % de forma sostenida durante las jornadas).

## Assumptions

- **Mismo proceso**: los hilos de trabajo viven en el mismo proceso que el servidor. Repartir partidas entre varios
  procesos o máquinas queda fuera de alcance, igual que optimizar el motor (INI-06).
- **Cálculo puro y determinista**: el motor y la IA no dependen de estado global mutable ni de la hora; su única fuente
  de azar es la semilla. Por eso reintentar un cálculo da el mismo resultado. Si el plan encuentra estado global, se
  corrige como parte de esta spec.
- **Coste de copiar datos**: enviar la entrada y recibir el resultado entre hilos cuesta mucho menos que los
  150–400 ms del cálculo; no hace falta memoria compartida.
- **Tramos en directo**: si el estado del partido en directo no se puede mantener fuera del hilo principal entre
  tramos, cada tramo se envía con su estado de entrada completo. El plan decide la forma; el requisito es que el
  cálculo no ocupe el hilo principal y que el resultado sea idéntico.
- **Reintentos y tiempo máximo**: valores por defecto razonables (p. ej. 2 reintentos y un tiempo máximo de varias
  veces el coste máximo medido de un partido); el plan fija las cifras.
- **Entorno de medida**: la persona proporciona las máquinas separadas para SC-001; hasta entonces se registra la
  medición en una sola máquina como referencia (SC-003).
- **Avisos**: el arreglo del envío SMTP fuera de la cola de la partida (`apps/server/src/avisos/servicio.ts`) ya está
  hecho y no forma parte de esta spec.
- **Sin cambios visibles**: la interfaz, el protocolo de WebSocket, la API HTTP y el esquema de base de datos no
  cambian.
