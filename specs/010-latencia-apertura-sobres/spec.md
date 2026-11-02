# Feature Specification: Latencia de apertura de partidos y de entrega de sobres

**Feature Branch**: `main` (sin rama propia, como las specs 008 y 009)

**Created**: 2026-11-02

**Status**: Draft ([ROADMAP](../../ROADMAP.md) INI-07)

**Input**: User description: "Spec 010 — Latencia de apertura de partidos y de entrega de sobres (ROADMAP INI-07). Se
trabaja en main, sin rama propia. Objetivo: cumplir `apertura_ms` p95 < 3 s y `entrega_sobre_ms` p95 < 1 s con 100
partidas simultáneas, sin empeorar el resto de métricas de `beta-100.js`. Alcance: (1) diagnóstico primero,
instrumentando el servidor para separar espera en la cola del actor, cálculo, base de datos, serialización y difusión,
y decidir con datos cuánto se debe a Docker Desktop/Wi-Fi y cuánto al servidor; (2) reducir la espera en la cola de
cada partida durante la apertura sin perder la integridad (orden determinista, sin doble resolución, peticiones
duplicadas idempotentes); (3) reducir el coste de la difusión y de la resolución del turno del draft en el hilo
principal; (4) criterios de éxito medibles con `beta-100.js` en una sola máquina como referencia y en tres máquinas por
cable; si un umbral no es realista se reformula en su spec, nunca se afloja en el CI. Restricciones: un único motor y
resultados idénticos (`pnpm test:equivalence` y semillas sin cambios)."

## Contexto

Esta spec continúa la [009](../009-simulacion-hilos-trabajo/spec.md) para el criterio de cierre 2 de
[INI-07](../../ROADMAP.md#ini-07-carga-y-escalabilidad-de-la-beta): cumplir
[001/SC-017](../001-draft-manager-mvp/spec.md) (100 partidas simultáneas).

Situación medida tras la 009 (ver [003/validacion.md](../003-mejoras-ux-simulacion/checklists/validacion.md), fila
«Carga»), con `tools/load/beta-100.js`:

| Escenario | Apertura p95 (mediana) | Entrega del sobre p95 (mediana) | «Seguir» → final p95 | Jornada NPC p95 |
|-----------|-----------------------:|--------------------------------:|---------------------:|----------------:|
| 10 partidas, una máquina, servidor de desarrollo | 3,71 s (2,2 s) | 196 ms | 284 ms | 405 ms |
| 10 partidas, dos máquinas por Wi-Fi, Docker Desktop | 6,13 s | 188 ms | 228 ms | 424 ms |
| 100 partidas (730 humanos), dos máquinas por Wi-Fi, Docker Desktop | **42 s (25 s)** | **2,39 s (1,37 s)** | 1,06 s ✔ | 3,41 s ✔ |
| **Objetivo (001/SC-017)** | **< 3 s** | **< 1 s** | **< 3 s** | **< 10 s** |

En esa prueba de 100 partidas las colas de cálculo de los hilos de trabajo estaban vacías (sin cálculos en espera ni
reintentos): el motor ya no es el límite. Lo que frena es:

- **La cola en serie de cada partida en la apertura**: los 8 humanos de una partida abren a la vez y sus partidos
  entre humanos se resuelven uno tras otro en la cola de la partida (009/FR-004). Cada uno espera su cálculo, su
  guardado en base de datos y el aviso de torneo actualizado a los 8 participantes antes de que empiece el siguiente.
  Con la base de datos en otra máquina, cada guardado alarga esa cola.
- **El hilo principal**: atiende HTTP, WebSocket, base de datos y la difusión a 730 humanos. La entrega del sobre
  (desde que un humano elige carta hasta que recibe el sobre siguiente) compite con todo eso.
- **El entorno de medida**: Docker Desktop sobre Windows (con su reenvío de puertos, que consume CPU en la misma
  máquina) y una red Wi-Fi. No se sabe aún cuánto de los tiempos medidos se debe al entorno y cuánto al servidor.

Términos usados en esta spec:

- **Cola de la partida**: la cola de comandos de una partida, que procesa sus comandos de uno en uno (009/FR-004).
- **Apertura**: la petición de un humano para abrir su partido de la jornada; si es contra otro humano, incluye
  resolver el partido entero.
- **Entrega del sobre**: el tiempo desde que el último humano de un turno de draft elige carta hasta que cada humano
  recibe su sobre siguiente.
- **Fases de una operación**: espera en la cola de la partida, cálculo (incluida su espera en el grupo de hilos), base
  de datos, serialización de mensajes y difusión.
- **Entorno de referencia**: servidor, base de datos y generador de carga en la misma máquina, sin Docker Desktop.
- **Entorno de tres máquinas**: servidor (Linux, sin Docker Desktop), base de datos y generador de carga en tres
  máquinas distintas unidas por red por cable (el de 009/T036).

## Clarifications

### Session 2026-11-02

- Q: Si el diagnóstico atribuye la mayor parte del retraso al entorno, ¿se hace igualmente el cambio de la cola de la
  partida en la apertura? → A: Sí. La historia 2 (FR-005 a FR-010) y FR-011 se hacen siempre; el diagnóstico elige el
  mecanismo y decide solo el alcance de FR-012.
- Q: Cuando varias aperturas de una partida se resuelven juntas, ¿cuándo recibe cada humano su resultado? → A: Cuando
  el grupo entero está guardado. El grupo son las aperturas pendientes en ese momento, sin espera artificial para
  juntar más.
- Q: ¿La medición por fases está activada por defecto? → A: Sí, en todos los entornos (también producción); se puede
  desactivar por configuración.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Saber dónde se va el tiempo antes de cambiar nada (Priority: P1)

Quien mantiene el servidor ejecuta `beta-100.js` y obtiene, para la apertura de partidos y para la entrega del sobre,
cuánto tiempo pasa cada operación en cada fase (espera en la cola de la partida, cálculo, base de datos,
serialización y difusión). Con esos datos, y comparando el entorno de referencia con el de Docker Desktop y Wi-Fi,
elige el mecanismo de la historia 2, el alcance de FR-012 en la historia 3 y el orden de los cambios. La historia 2 y
FR-011 se hacen en cualquier caso.

**Why this priority**: sin desglose, cualquier cambio de diseño es una apuesta. La 009 demostró que la causa supuesta
(el motor) ya no era el límite; esta spec no debe repetir el error con la siguiente suposición. Además, puede resultar
que parte del retraso sea del entorno y no del servidor.

**Independent Test**: con solo la instrumentación, ejecutar `beta-100.js` con 10 y con 100 partidas en el entorno de
referencia y obtener un informe con el desglose por fase de `apertura_ms` y `entrega_sobre_ms` (mediana y p95 de cada
fase), sin que cambien los resultados de los partidos ni las métricas existentes más allá del ruido de medida.

**Acceptance Scenarios**:

1. **Given** el servidor con la instrumentación activa, **When** se abre un partido entre humanos, **Then** queda
   registrado cuánto esperó la apertura en la cola de la partida, cuánto tardó el cálculo, cuánto la base de datos,
   cuánto la serialización y cuánto la difusión, y la suma de las fases explica el tiempo total de la petición medido
   en el servidor.
2. **Given** un turno de draft que se cierra, **When** se entregan los sobres siguientes, **Then** queda registrado el
   mismo desglose para la entrega del sobre.
3. **Given** una prueba de carga terminada, **When** se consulta el desglose, **Then** se obtienen mediana y p95 de
   cada fase para las dos operaciones, separados por escenario (10 y 100 partidas).
4. **Given** las mediciones en el entorno de referencia y en el de dos máquinas con Docker Desktop y Wi-Fi, **When**
   se comparan, **Then** el informe de diagnóstico dice qué parte de la diferencia se atribuye al entorno (red,
   reenvío de puertos) y qué parte al servidor, y qué cambios de las historias 2 y 3 se priorizan.

---

### User Story 2 - Abrir el partido en segundos aunque toda la partida abra a la vez (Priority: P2)

Durante una jornada con 100 partidas activas, los 8 humanos de una partida abren su partido a la vez. Cada uno ve el
resultado de su partido en menos de 3 segundos, sin esperar a que se resuelvan uno detrás de otro los partidos de los
demás humanos de su partida.

**Why this priority**: es el umbral más lejos del objetivo (p95 42 s frente a < 3 s) y el que más perciben los
participantes. Depende del diagnóstico de la historia 1 para elegir el diseño.

**Independent Test**: con el cambio, repetir el escenario de 10 partidas en el que todos abren a la vez y comprobar
apertura p95 < 3 s; ejecutar el test «dos aperturas simultáneas» de `torneo-asincrono` y `pnpm test:equivalence` sin
cambios.

**Acceptance Scenarios**:

1. **Given** los 8 humanos de una partida abren a la vez partidos distintos, **When** llegan las aperturas, **Then** la
   espera de cada apertura en la cola de la partida no crece de forma lineal con el número de aperturas que llegaron
   antes, y cada humano recibe su resultado.
2. **Given** los dos humanos de un mismo partido lo abren a la vez, **When** llegan las dos aperturas, **Then** el
   partido se resuelve una sola vez y ambos reciben el mismo resultado.
3. **Given** un humano repite su apertura (doble pulsación o reintento tras un corte), **When** llega la petición
   duplicada, **Then** recibe el mismo resultado que la primera, sin volver a resolver el partido.
4. **Given** varias aperturas de una partida que se resuelven a la vez, **When** se aplican sus resultados al torneo,
   **Then** el orden de aplicación es determinista y la clasificación, el historial y las bajas son los mismos que si
   se hubieran aplicado de una en una.
5. **Given** las mismas semillas, **When** se resuelven los partidos con el nuevo mecanismo, **Then** resultados,
   eventos, bajas y estadísticas son idénticos a los de antes de esta spec.

---

### User Story 3 - Recibir el sobre siguiente en menos de un segundo (Priority: P3)

En una partida en draft, cuando el último humano del turno elige carta, todos reciben el sobre siguiente en menos de
1 segundo, aunque otras 99 partidas estén en draft o jugando a la vez.

**Why this priority**: también falla (p95 2,39 s frente a < 1 s), pero está más cerca del objetivo y es posible que
mejore en parte al reducir la carga de la apertura en el hilo principal (historia 2). El diagnóstico decide cuánto
trabajo propio necesita.

**Independent Test**: con el cambio, ejecutar `beta-100.js` con 100 partidas en el entorno de referencia y comprobar
que `entrega_sobre_ms` p95 baja respecto a la medición de la historia 1, y que los e2e del draft pasan sin cambios.

**Acceptance Scenarios**:

1. **Given** un turno de draft en el que todos los humanos han elegido, **When** se cierra el turno, **Then** cada
   humano recibe su sobre siguiente con el mismo contenido y orden que antes de esta spec.
2. **Given** un mensaje que se difunde a todos los participantes de una partida, **When** se envía, **Then** el coste
   en el hilo principal no se repite por cada destinatario cuando el contenido es el mismo para todos.
3. **Given** un humano desconectado durante la entrega, **When** se reconecta, **Then** recibe el estado del draft
   igual que hoy.

---

### Edge Cases

- **Dos aperturas del mismo partido llegan a la vez y se agrupan**: el partido aparece una sola vez en el grupo; las
  dos peticiones reciben el mismo resultado.
- **Una apertura llega mientras se resuelve un grupo de aperturas de su partida**: no se pierde ni se resuelve dos
  veces; se atiende después o se une al grupo siguiente, en orden de llegada.
- **Falla el cálculo de un partido de un grupo**: los demás partidos del grupo se resuelven y se aplican; el fallido
  queda sin jugar, se registra con su semilla y su apertura termina con error, como en 009/FR-008. No se inventa
  ningún resultado.
- **Falla el guardado de un grupo en base de datos**: ningún partido del grupo queda a medias (todo o nada); las
  aperturas terminan con error y pueden repetirse sin doble resolución.
- **Llega otro comando a la partida** (una alineación, el cierre de la jornada) mientras se resuelve un grupo de
  aperturas: se procesa en el orden de llegada respecto al grupo, como hoy; no ve un torneo a medio aplicar.
- **El servidor se apaga** con aperturas en curso: nada a medio guardar; al volver, los partidos no guardados se
  resuelven al abrirlos de nuevo, como hoy.
- **Un umbral resulta no realista** en el entorno de tres máquinas tras aplicar los cambios: se reformula en la spec
  correspondiente (001/SC-017) con la justificación y los datos medidos; el CI y los umbrales de `beta-100.js` no se
  aflojan (ROADMAP, decisión 5).
- **La instrumentación cuesta demasiado**: si medir altera los tiempos más allá del ruido, debe poder desactivarse sin
  reiniciar la base de datos ni cambiar resultados.
- **Modo en proceso** (009/FR-013, grupo de hilos de tamaño `0`): las garantías de integridad de esta spec se cumplen
  igual; los umbrales de latencia no aplican en ese modo.

## Requirements *(mandatory)*

### Functional Requirements

#### Diagnóstico

- **FR-001**: El servidor DEBE medir, para cada apertura de partido y para cada entrega de sobre, el tiempo en cada
  fase: espera en la cola de la partida, cálculo (incluida su espera en el grupo de hilos), base de datos,
  serialización de mensajes y difusión. La suma de las fases DEBE explicar al menos el 90 % del tiempo total de la
  operación medido en el servidor.
- **FR-002**: El desglose DEBE poder consultarse durante y después de una prueba de carga como mediana y p95 por fase y
  por operación, con el mismo mecanismo de métricas que ya expone el servidor (009/FR-009).
- **FR-003**: La instrumentación NO DEBE cambiar resultados ni orden de procesamiento. DEBE estar activada por defecto
  en todos los entornos, también en producción, y DEBE poder desactivarse por configuración.
- **FR-004**: Antes de decidir el diseño de las historias 2 y 3, DEBE registrarse un informe de diagnóstico en la
  carpeta de esta spec con: desglose por fase de `apertura_ms` y `entrega_sobre_ms` con 10 y con 100 partidas en el
  entorno de referencia; la misma medición con Docker Desktop y Wi-Fi (o la ya registrada del 2026-11-02 si se repite
  en las mismas condiciones); qué parte de la diferencia se atribuye al entorno y cuál al servidor; y qué cambios se
  priorizan y por qué.

#### Apertura de partidos

- **FR-005**: Cuando varias aperturas de una misma partida están pendientes, la espera de cada una en la cola de la
  partida NO DEBE ser la suma de los cálculos, guardados y difusiones de todas las anteriores. El mecanismo (agrupar
  aperturas, calcular en paralelo y aplicar en orden, guardar en lote, difundir una vez por grupo u otro que el
  diagnóstico justifique) lo decide el plan. Este requisito se cumple aunque el diagnóstico atribuya la mayor parte
  del retraso al entorno.
- **FR-006**: Los resultados de partidos de una misma partida DEBEN aplicarse al torneo en un orden determinista e
  independiente del orden en que terminen los cálculos. Clasificación, historial, bajas y estado de la jornada DEBEN
  ser los mismos que con la aplicación de una en una.
- **FR-007**: Un partido NO DEBE resolverse ni guardarse más de una vez, aunque lo abran sus dos humanos a la vez o
  lleguen aperturas duplicadas. Una apertura duplicada DEBE recibir el mismo resultado que la original (constitución,
  Principio VI). El test «dos aperturas simultáneas» de `apps/server/tests/integration/torneo-asincrono.test.ts` DEBE
  pasar sin cambiar sus expectativas.
- **FR-008**: El guardado de los resultados que se aplican juntos DEBE ser atómico: o se guardan todos los partidos del
  grupo o ninguno, sin dejar un partido marcado como jugado sin su resultado. Ninguna apertura del grupo DEBE recibir
  su resultado antes de que el grupo esté guardado. El grupo lo forman las aperturas de la partida pendientes cuando la
  cola llega a ellas; el servidor NO DEBE esperar a propósito para juntar más.
- **FR-009**: Los demás comandos de la partida DEBEN seguir viendo el torneo en un estado consistente: nunca a medio
  aplicar un grupo de aperturas. El orden relativo entre aperturas y otros comandos de la partida DEBE seguir siendo el
  de llegada.
- **FR-010**: El fallo del cálculo de un partido NO DEBE impedir que se apliquen los demás de su grupo; se trata como
  en 009/FR-008.

#### Entrega del sobre y difusión

- **FR-011**: Cuando un mensaje se difunde con el mismo contenido a varios participantes, su serialización DEBE hacerse
  una vez, no una por destinatario.
- **FR-012**: El trabajo que hace el hilo principal al cerrar un turno de draft y entregar los sobres siguientes DEBE
  reducirse según lo que señale el diagnóstico (FR-004), sin cambiar el contenido ni el orden de los sobres ni las
  reglas del draft.
- **FR-013**: Los avisos de torneo actualizado que provoca una apertura NO DEBEN enviarse a cada participante más de
  una vez por grupo de aperturas aplicado, siempre que el último estado enviado sea el mismo que recibiría con un aviso
  por apertura.

#### Restricciones y medición

- **FR-014**: Un único motor: con las mismas semillas, resultados, eventos, bajas y estadísticas DEBEN ser idénticos a
  los de antes de esta spec. `pnpm test:equivalence` DEBE pasar sin cambios en sus tests ni en sus datos de referencia.
- **FR-015**: La interfaz, el protocolo de WebSocket, la API HTTP y el contenido de los mensajes que ve un participante
  NO DEBEN cambiar de forma incompatible. Los tests unitarios, de integración y e2e existentes DEBEN pasar sin cambiar
  sus expectativas.
- **FR-016**: Los umbrales de `beta-100.js` y del CI NO DEBEN aflojarse. Si tras aplicar los cambios un umbral resulta
  no realista en el entorno de tres máquinas, DEBE reformularse en 001/SC-017 con la justificación y los datos medidos
  (ROADMAP, decisión 5).
- **FR-017**: Los resultados de cada medición de esta spec DEBEN registrarse en
  [003/validacion.md](../003-mejoras-ux-simulacion/checklists/validacion.md) (fila «Carga») y en
  [ROADMAP.md](../../ROADMAP.md) INI-07.

### Key Entities

- **Desglose de una operación**: para una apertura o una entrega de sobre, el tiempo en cada fase (espera en la cola
  de la partida, cálculo, base de datos, serialización y difusión) y el total. Se agrega en mediana y p95 por fase.
- **Grupo de aperturas**: las aperturas de una misma partida que se resuelven y aplican juntas. Atributos: partida,
  partidos (sin repetir), peticiones que esperan cada partido y orden de aplicación.
- **Informe de diagnóstico**: documento de esta spec con las mediciones por fase y entorno, la atribución entorno /
  servidor y la decisión de diseño que justifica.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Con 100 partidas simultáneas (730 humanos, todos abren a la vez) en `beta-100.js`, en el entorno de tres
  máquinas: apertura de partido p95 < 3 s y entrega del sobre p95 < 1 s; «Seguir» → final p95 < 3 s y jornada NPC
  p95 < 10 s siguen cumpliéndose; 0 errores de HTTP y WebSocket atribuibles al servidor; las 100 partidas terminan sin
  bloqueos (001/SC-017).
- **SC-002**: En el entorno de referencia (una máquina), con 10 partidas en las que todos abren a la vez: apertura p95
  < 3 s (hoy 3,71 s) y entrega del sobre p95 < 1 s; con 100 partidas se registra el resultado como referencia aunque
  no cumpla.
- **SC-003**: Ninguna métrica de `beta-100.js` que hoy cumple empeora más de un 10 % en p95 respecto a la medición en
  las mismas condiciones antes de esta spec.
- **SC-004**: El informe de diagnóstico (FR-004) existe antes de implementar las historias 2 y 3, explica al menos el
  90 % del tiempo de cada operación por fases y atribuye con cifras la diferencia entre entornos.
- **SC-005**: Con 8 humanos que abren a la vez en una partida, la espera media en la cola de la partida de la última
  apertura es menos de la mitad que la suma de los tiempos de servicio de las 8 aperturas.
- **SC-006**: `pnpm test:equivalence`, el test «dos aperturas simultáneas» y un test nuevo de aperturas duplicadas y
  agrupadas pasan; en una muestra de partidas con semillas fijas, la clasificación final es idéntica a la obtenida
  aplicando las aperturas de una en una.

## Assumptions

- **Mismo proceso y mismo motor**: se mantiene la arquitectura de la 009 (un proceso, grupo de hilos de trabajo para
  el cálculo, persistencia y difusión en el hilo principal). Repartir partidas entre procesos o máquinas, y optimizar
  el motor (INI-06), quedan fuera de alcance.
- **Entorno de tres máquinas**: lo proporciona la persona (la 009/T036 sigue aplazada por esa razón). Hasta entonces
  se registran las mediciones en el entorno de referencia (SC-002) y SC-001 queda pendiente, no cumplido.
- **Herramienta de carga**: `tools/load/beta-100.js` no cambia sus umbrales ni la definición de sus métricas; puede
  ampliarse para leer el desglose del servidor al terminar.
- **Instrumentación**: se apoya en las métricas que ya expone el servidor (009/FR-009); no se añade un servicio de
  observabilidad externo.
- **Orden de aplicación**: el orden determinista natural es el de los partidos en el calendario de la jornada; el plan
  puede elegir otro si es igual de determinista y no cambia la clasificación.
- **Avisos por correo**: ya no se esperan dentro de la cola de la partida (arreglado antes de la 009) y no forman parte
  de esta spec.
