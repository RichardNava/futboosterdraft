# Research: Latencia de apertura de partidos y de entrega de sobres

**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Fecha**: 2026-11-02

## R1. Qué hace hoy el hilo principal en una apertura y en una entrega de sobre (inventario)

Recorrido del código de `apps/server/src`. Es una **hipótesis**: la confirma o la descarta el diagnóstico (US1,
FR-004).

**Apertura entre humanos** (`POST /api/partidos/:id/abrir` → `c.ejecutar(abrirPartido)` →
`resolverPartidoEntreHumanos`), todo dentro de la cola de la partida y en serie:

| Paso | Fichero | Viajes a la BD |
|------|---------|---------------:|
| Leer el partido; fijar modalidad; última modalidad del participante y del perfil | `torneo.ts` `abrirPartido` | 4 |
| Releer el partido; preparar alineaciones (`prepararPartido`) | `partidoEntreHumanos.ts`, `partidoRapido.ts` | 1–3 |
| Cálculo `resolverResto` en el grupo de hilos | `simulacion/grupo.ts` | 0 |
| Dorsales de los dos equipos (leer y, si faltan, guardar); aviso de dorsales nuevos | `partidoRapido.ts` `dorsalesParaPartido` | 2–6 |
| Guardar el partido; crear visionados; guardar el torneo (`registrarPartido`) | varios | 3, **sin transacción** |
| `despuesDePartido`: cerrar jornada si toca; `resolverPartidosSinHumanos` (relee la jornada) | `torneo.ts` | 1–3 |
| `emitirTorneo`: **por cada uno de los 8 humanos**, `vistaTorneo` lee jornadas, resúmenes de partidos, sus pendientes, su recompensa y los dorsales de cada participante que sale en goleadores y asistentes (`filasTabla`) | `torneo.ts` | **~8 × (4 a 12)** |

Una apertura hace unas **50 a 110 consultas en serie**, y la gran mayoría son de `emitirTorneo`. Con la BD en la
misma máquina (~0,3–1 ms por viaje) son unos 50–100 ms; por Wi-Fi (3–10 ms por viaje) son 0,3–1 s. Las 8 aperturas
de una partida se esperan unas a otras en la cola: la octava espera 7 veces todo eso más 7 cálculos. Esto encaja con
lo medido (mediana 25 s y p95 42 s con 100 partidas por Wi-Fi frente a 2,2 s con 10 partidas en una máquina) y
explicaría por qué el entorno pesa tanto: el coste sale del **número de viajes** multiplicado por la latencia de la red.

**Entrega del sobre** (mensaje `draft.elegir` del último humano → `procesarEleccion` → `resolver` → `abrirTurno`):
guardar la elección (1 viaje), transacción del turno con las elecciones automáticas y la mesa (1 transacción, ~4
viajes), guardar las elecciones de los NPC del turno nuevo (1), actualizar la mesa si es el turno 1 de la ronda (1), y
después el `ack` guarda la petición para deduplicarla (1). Son 4–8 viajes en serie, más los mensajes `draft.turno`,
que son distintos para cada humano. El histograma `turno_draft_resolucion_ms` que ya existe solo mide `resolver`: no
incluye la espera en la cola ni la difusión.

**Difusión**: `Pasarela.enviar` ya serializa **una vez** los mensajes de destino `todos` y los manda a todos los
sockets. Los mensajes por participante (`torneo.actualizado`, `draft.turno`) son distintos para cada uno.

## R2. Medición por fases: `AsyncLocalStorage` y un `Summary` de prom-client

- **Decisión**: un módulo `observabilidad/desglose.ts` con un `AsyncLocalStorage<Desglose>`. Cada operación
  (apertura, elección de draft) abre su desglose al entrar y lo cierra al terminar. Cada fase suma tiempo **al desglose
  del contexto actual** desde el punto en que ocurre:
  - **cola**: desde `ActorPartida.ejecutar` (al encolar) hasta que empieza el comando;
  - **calculo**: alrededor de `calculo.ejecutar` (incluye la espera en el grupo de hilos);
  - **bd**: alrededor de cada consulta de `pg`, envolviendo `query` y `connect` del pool en `persistencia/db.ts`
    (incluye esperar una conexión libre). También cuenta las **consultas**;
  - **serializacion**: el `JSON.stringify` de `Pasarela.enviar` y de la respuesta HTTP;
  - **difusion**: el bucle de `socket.send` de `Pasarela.enviar`;
  - **resto**: el total menos la suma de las demás fases. Así se comprueba directamente el 90 % de FR-001.

  Si dentro de una operación hay fases en paralelo (los cálculos de un grupo de aperturas, R4), cuenta el tiempo de
  reloj del conjunto, no la suma. Así las fases nunca suman más que el total.
- **Exposición**: dos métricas nuevas en `/metrics` (FR-002), de tipo `Summary` (prom-client calcula los cuantiles
  0,5 y 0,95 en el servidor): `operacion_fase_ms{operacion,fase}` y `operacion_consultas{operacion}`. Las
  operaciones son `apertura`, `entrega_sobre` (la elección que cierra un turno) y `eleccion` (la que no lo cierra).
  Detalle en [contracts/desglose.md](contracts/desglose.md).
- **Configuración** (FR-003): `MEDIR_FASES`, activada por defecto; con `0` no se crea el almacén y cada medición es
  una llamada vacía. No toca el orden ni los datos: solo lee el reloj (`performance.now()`).
- **Razón**: con Node ≥ 22 (desarrollo en Node 24, con `AsyncContextFrame`) `AsyncLocalStorage` cuesta muy poco y
  evita pasar un cronómetro por todas las firmas de los repositorios. El `Summary` da directamente la mediana y el p95
  que pide la spec. Un histograma solo daría cubos, y habría que interpolar.
- **Alternativas**: pasar el desglose por `ContextoComando` (no llega a los repositorios ni a la pasarela sin cambiar
  decenas de firmas); `diagnostics_channel` de `pg` (no existe en `pg` 8); OpenTelemetry (servicio externo, fuera de
  alcance según Assumptions); histograma con cubos (cuantiles aproximados y más trabajo en el informe).

## R3. Cómo separar lo que es del entorno de lo que es del servidor (FR-004)

- **Decisión**: el informe compara, en el mismo escenario, el entorno de referencia con el de Docker Desktop y Wi-Fi,
  y además divide cada fase en **consultas × latencia de un viaje**. La latencia de un viaje se mide aparte en cada
  entorno (mediana de `select 1` desde el servidor; se calcula en el propio informe a partir de la fase `bd` y del
  número de consultas con carga baja, 1 partida). Lo que escala con la latencia de la red (bd y difusión) se atribuye
  al entorno; lo que no cambia entre entornos (cálculo, serialización, resto) se atribuye al servidor; el aumento de
  la cola sale de los dos y se reparte según la proporción de su tiempo de servicio.
- **Razón**: con el número de consultas por operación se puede predecir el efecto de la red sin hacer más
  mediciones, y se ve qué cambio rinde más: quitar viajes (R4, R7, R9) o quitar CPU.
- **Docker Desktop**: la medición con Docker Desktop y Wi-Fi del 2026-11-02 no tenía desglose. Hay que repetirla con la
  instrumentación activa en las mismas condiciones (FR-004 lo permite).

## R4. Grupo de aperturas en la cola de la partida (FR-005 a FR-010)

- **Decisión**: un buzón de aperturas por partida (`actores/aperturas.ts`). La ruta `abrir` solo lo usa para
  partidos de fútbol **entre humanos y programados** (lo comprueba con la fila que ya ha leído). El resto de
  aperturas (contra NPC, duelos, ya resueltos) siguen como hoy.
  1. Al llegar una apertura, si hay un **grupo abierto** se une a él. Si no, se crea un grupo y se encola **un**
     comando en el actor de la partida para resolverlo.
  2. Un grupo está abierto mientras su comando no ha empezado **y** no se ha encolado ningún otro comando después de
     él. Para saberlo, `ActorPartida` lleva un número de secuencia de los comandos encolados. Así una apertura nunca
     adelanta a una alineación o a un cierre de jornada que llegó antes que ella (FR-009, orden de llegada), y el
     servidor no espera a propósito para juntar más (FR-008).
  3. Cuando el comando empieza, el grupo se cierra. Las aperturas que lleguen después van al grupo siguiente.
  4. Dentro del comando: se valida cada apertura en orden de llegada (las mismas comprobaciones de `abrirPartido`).
     Las del mismo partido se juntan en una sola entrada con varias esperas (R6). Se preparan los partidos y se
     **calculan en paralelo** (`Promise.allSettled` sobre `calculo.ejecutar`, prioridad `humano`). Luego se
     **aplican en orden de calendario** (índice del cruce en `c.jornada.cruces`): dorsales, resultado en el torneo.
     Todo se **guarda en una transacción** (R5). Después se ejecuta `despuesDePartido` **una vez** (cerrar jornada,
     `emitirTorneo` una sola vez: FR-013) y se responde a todas las esperas.
- **Por qué el resultado es idéntico (FR-006, FR-014)**: cada partido usa su semilla, sus alineaciones y sus
  decisiones automáticas, y no depende de otros partidos de la misma jornada. En una jornada cada participante juega un
  solo partido, así que dos partidos de un grupo no comparten equipos, dorsales ni bajas. `registrarResultado` se
  aplica en un orden fijo (el del calendario), y la clasificación, el historial y las bajas no dependen del orden
  dentro de la jornada. El test de SC-006 lo comprueba comparando con la aplicación de una en una.
- **Por qué rinde**: con 8 aperturas a la vez, la octava ya no espera 7 servicios enteros. Espera como mucho a que
  termine el grupo en curso, y después a un grupo que comparte cálculo en paralelo, una transacción y una sola
  difusión (SC-005).
- **Alternativas**: un actor por partido en vez de por partida (descartada: el torneo, la jornada y la clasificación
  son estado de la partida, y aplicarlos fuera de su cola rompe FR-009); dejar que los comandos corran a la vez con
  bloqueos optimistas (descartada: más riesgo de doble resolución, contra el Principio VI); agrupar esperando un
  intervalo fijo (descartada por la aclaración de la spec: nada de esperas artificiales).

## R5. Atomicidad del grupo y estado en memoria (FR-008)

- **Decisión**: una sola transacción (`db.transaction`) por grupo con todas sus escrituras: modalidades de quien abre,
  última modalidad (participante y perfil), partidos finalizados, visionados pendientes, dorsales y torneo. Los
  métodos de repositorio que aún no aceptan `ejecutor` lo reciben con el mismo patrón que `repoPartidos.actualizar`
  (`ejecutor: Ejecutor = this.db`).
- **En memoria**: el grupo trabaja sobre copias (`registrarResultado` ya es puro y devuelve un torneo nuevo) y solo
  cambia `c.torneo`, las modalidades en memoria y `partidosEnCurso` **después del commit**. Si la transacción falla, la
  memoria queda como antes, todas las esperas del grupo reciben error y repetir la apertura vuelve a resolver el
  partido una sola vez (sigue `programado`).
- **Avisos de dorsales** (`alAsignarDorsales`, bandeja): se envían después del commit. Hoy van antes de guardar el
  partido; el contenido no cambia.
- **Cambio de comportamiento aceptado**: hoy la modalidad se guarda aunque luego falle el cálculo. Con el grupo, si el
  partido no se resuelve, tampoco se guarda su modalidad. La siguiente apertura la fija igual (FR-035 de la 003 sigue:
  la fija el primer `abrir` que termina bien).

## R6. Duplicados e idempotencia (FR-007)

- Dos aperturas del mismo partido en el mismo grupo forman una sola entrada con dos esperas. Se calcula y se guarda
  una vez, y las dos reciben `{ modo: 'reproduccion', modalidad }` con la modalidad de cada una.
- Una apertura que llega cuando el partido ya está guardado (otro grupo anterior, doble pulsación, reintento) ve
  `estado = 'finalizado'` y responde como hoy, sin entrar en ningún grupo nuevo. La ruta lee la fila antes de decidir,
  y el comando del grupo la vuelve a leer dentro de la cola por si cambió entre medias.
- El test «dos aperturas simultáneas» de `torneo-asincrono.test.ts` no cambia. Se añade un test de grupo con
  duplicados (mismo partido por los dos humanos, y el mismo humano dos veces).

## R7. `emitirTorneo` con los datos compartidos cargados una vez (FR-012/FR-013 y R1)

- **Decisión**: `vistaTorneo` se divide en dos: cargar lo común de la partida una vez por emisión (filas de jornadas,
  resúmenes de partidos, pendientes de **todos** los participantes en una consulta y dorsales de **todos** en otra) y
  construir la vista de cada humano a partir de esos datos. La salida de cada `torneo.actualizado` es exactamente la de
  hoy. `GET` del torneo de un solo participante usa el mismo camino con un solo destinatario.
- **Efecto esperado**: de ~8 × (4 a 12) consultas a ~4–5 por emisión. Junto con R4 (una emisión por grupo), es la
  mayor reducción de viajes de una apertura.
- **Alternativas**: caché en memoria de las filas del torneo (más estado que invalidar y riesgo de servir una vista
  vieja, contra el Principio VI); enviar una vista común y filtrarla en el cliente (descartada: el filtro de
  «pendiente de ver» es del servidor por integridad y cambiaría el protocolo, contra FR-015).

## R8. Serializar una vez por mensaje (FR-011)

- **Hallazgo**: ya se cumple. `Pasarela.enviar` hace un solo `JSON.stringify` para los mensajes de destino `todos`.
  Los mensajes por participante tienen contenido distinto (vista filtrada, sobre propio), así que no se repite nada.
- **Decisión**: se fija con un test unitario de la pasarela (un mensaje para todos con N sockets se serializa una vez).
  No se añade otro tipo de destino mientras el diagnóstico no encuentre un mismo contenido enviado por separado a
  varios participantes.

## R9. Cierre de turno del draft (FR-012, alcance según el diagnóstico)

- **Candidato principal**: juntar en **una** transacción la elección que cierra el turno, las elecciones automáticas,
  la mesa resuelta, las elecciones de los NPC del turno nuevo y el margen de animación. Se pasa de 4–6 viajes a 1, sin
  cambiar el contenido ni el orden de los mensajes (`draft.progreso`, `draft.eleccion_auto`, `draft.turno`): las
  funciones puras del dominio (`elegir`, `resolverTurno`, `eleccionNPC`) se calculan antes y en el mismo orden que
  hoy.
- **Segundo candidato**: que el `ack` de `draft.elegir` no guarde la petición de deduplicación antes de enviarse si la
  entrega del sobre ya salió (hoy el orden es: comando → mensajes → guardar `ack` → enviar `ack`; el sobre ya sale
  antes, así que probablemente no influye). Se mira solo si el desglose lo señala.
- **Fuera**: cambiar `mensajeTurno` o el catálogo (`catalogo.resumen`) si su fase de serialización resulta pequeña.
- **Razón**: el desglose dirá si la entrega está dominada por la cola (comandos de apertura o de partido de la misma
  partida, que no coinciden con el draft) o por el hilo principal compartido con otras partidas (en ese caso R4 y R7
  ya la bajan, al quitar consultas y trabajo de otras partidas).

## R10. Fallos dentro de un grupo (FR-010)

- `Promise.allSettled`: el partido cuyo cálculo falla se registra con `registrarCalculoFallido` (semilla incluida,
  009/FR-008) y queda `programado`. Sus esperas reciben el mismo error que hoy (009/FR-008) y los demás partidos se
  aplican y guardan. Se aplica el mismo orden de calendario sin el fallido.
- Si un fallo **no es de cálculo** (por ejemplo, validación de una apertura), solo afecta a esa espera, que recibe su
  error (`JORNADA_NO_ABIERTA`, `PARTIDO_NO_ENCONTRADO`). No entra en el grupo.

## R11. Modo en proceso (hilos = 0) y apagado

- Con hilos `0`, `calculo.ejecutar` calcula en el hilo principal: los cálculos del grupo se hacen uno tras otro, pero
  la agrupación, el orden y la atomicidad son iguales. Los umbrales de latencia no aplican (Edge Cases).
- Al apagar, el grupo en curso termina o falla entero gracias a la transacción. Los grupos aún no empezados se
  rechazan como los comandos de un actor cerrado, y los partidos siguen `programado`.

## R12. Lectura del desglose en la prueba de carga

- **Decisión**: `beta-100.js` gana una función `teardown()` opcional. Si se pasa `-e METRICAS_URL=…/metrics`, lee
  `/metrics` al terminar e imprime las líneas `operacion_fase_ms` y `operacion_consultas`. No cambia umbrales ni
  definiciones de métricas (Assumptions).
- **Protocolo**: reiniciar el servidor entre escenarios. El `Summary` acumula desde el arranque, así que cada escenario
  da su propio desglose.

## R13. Consultas del grupo de aperturas (tras US3; FR-012 y R1)

- **Contexto**: tras US3, con 100 partidas el límite sigue siendo la espera por una conexión del pool, que la entrega
  del sobre comparte con los grupos de aperturas ([diagnostico.md](diagnostico.md), «Conclusión tras US3»). Se opta por
  reducir las consultas del grupo (camino 2), no las de la entrega.
- **Método**: antes de recortar, se cuenta en local qué hace cada consulta de un grupo. El recuento no depende de la
  carga, así que basta con un test de integración, sin k6. El test (`aperturas-grupo.test.ts`, «reparto de las
  consultas…») envuelve los métodos de los repositorios con su propio `AsyncLocalStorage` y cuenta cada consulta del
  pool. Atribuye cada una al método más externo que la hace o, fuera de los repositorios, a su SQL. No toca código de
  producción. El total queda fijado en el test, para que una regresión se note y para bajarlo al recortar.
- **Escenario**: liga de 8 humanos en la jornada 1 (4 partidos entre humanos). Las 8 aperturas llegan a la vez, se
  resuelven en un grupo y cierran la jornada, así que el comando también abre la siguiente (como en `beta-100.js`).
- **Qué recortar** se decide con el reparto (T040), con el mismo criterio que T029: calcular primero y guardar en
  menos viajes, sin cambiar resultados, mensajes ni su orden.
