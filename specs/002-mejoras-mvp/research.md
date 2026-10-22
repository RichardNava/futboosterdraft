# Research — Fase 0: Mejoras del MVP

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Fecha**: 2026-10-16

Cada apartado resuelve una incógnita del *Technical Context* con el formato
**Decisión / Razón / Alternativas consideradas**. La pila tecnológica no cambia respecto a la spec 001
([001/research.md](../001-draft-manager-mvp/research.md), R1 a R17). Este documento solo recoge lo que
esta mejora decide o modifica. Las referencias "001/R7" apuntan a los apartados de ese documento.

---

## R1. Viabilidad del modelo síncrono entre humanos (FR-029)

Evaluación técnica que respalda FR-030 (conclusión ya aceptada por el usuario).

- **Complejidad**: mantener partidos síncronos entre humanos obliga a resolver a la vez:
  - velocidad mínima común (001/R11);
  - «Seguir» doble en cada pausa;
  - finalización anticipada consensuada (FR-026 con dos humanos);
  - espera al reloj de reproducción del más lento en cada interrupción, con reglas de desconexión de 10 s;
  - sustitución por un NPC a mitad de partido.

  Cada mejora de esta spec (FR-011 a FR-028) tendría dos variantes, solitario y en pareja, y la de pareja necesitaría coordinación en el servidor. Hoy esa lógica ocupa la mayor parte de [partido2d.ts](../../apps/server/src/actores/partido2d.ts).
- **Rendimiento**: el coste del motor es el mismo en los dos modelos. El síncrono, además, mantiene el actor ocupado con mensajes `partido.reproduccion` de dos clientes durante todo el partido, y obliga a mantener en memoria el partido entero mientras dure la reproducción del más lento. El asíncrono resuelve un partido entre humanos en un único comando (unos 25 ms, R4) y la reproducción ya no pasa por el actor.
- **Experiencia de usuario**: en síncrono, el humano más lento marca el ritmo del otro: no puede ir a x8, no puede finalizar y no puede salir sin consecuencias. Además, hace falta que los dos estén conectados a la vez, algo que choca con el ritmo de "una jornada al día" de los torneos con varios humanos.
- **Arquitectura**: el asíncrono elimina un estado distribuido (relojes de reproducción de varios clientes) y deja un único punto síncrono, el draft, que ya está resuelto con turnos y temporizadores (001/R4). Encaja con la constitución, que exige un draft simultáneo pero no partidos síncronos (Principio II).
- **Decisión**: el draft es la única fase síncrona. Los partidos entre humanos se resuelven una sola vez en el servidor, con decisiones automáticas iguales para ambos (R8), y cada humano los reproduce por su cuenta. Los partidos contra un NPC se juegan en directo con su único humano (R6).
- **Alternativas consideradas**:
  - síncrono solo si los dos humanos están conectados, y asíncrono en caso contrario: duplica los caminos y el resultado dependería de quién está conectado;
  - síncrono con velocidad fija y sin finalizar: contradice FR-025 y FR-026.

## R2. Reloj de reproducción condensado y velocidades x2, x4 y x8 (FR-022, FR-025, SC-005, SC-006)

- **Decisión**:
  - El reloj de reproducción avanza de forma lineal: `ticks por segundo real = K × (velocidad / 2)`, con **K = 23,5** a x2, 47 a x4 y 94 a x8.
  - K se fija para un partido de 90 minutos más un descuento total típico de 4 minutos: 5.640 s de juego en 240 s reales.
  - Para que la duración real quede dentro de ±5 % (SC-006), el descuento de cada parte reglamentaria se acota a **1–3 minutos**. La fórmula actual (001, `calcularDescuento`) llega a 6. Con esa acotación, un partido dura entre 92 y 96 minutos de juego, es decir, entre 3 min 55 s y 4 min 5 s a x2 (±2,2 %), y cada parte entre 1 min 57 s y 2 min 3 s.
  - La prórroga usa la misma K: sus 30 minutos duran unos 77 s a x2, más su descuento.
  - La **tanda de penaltis** tiene un ritmo propio: cada lanzamiento dura `tandaLanzamientoMsX2` (3.000 ms) a x2, y la mitad con cada duplicación de velocidad.
  - Los valores (K, límites del descuento, pausa del gol, ritmo de la tanda) viven en `ParametrosEquilibrado.reproduccion` (R12).
  - El reloj solo se detiene en las **pausas anunciadas**: descanso, antes de la prórroga, gol (2 s reales fijos a cualquier velocidad, con un rótulo) y «Cargando…» cuando el búfer se vacía (R6). Las interrupciones del juego (faltas, saques) no paran el reloj: el motor ya las cuenta como tiempo de parada para el descuento.
  - La velocidad por defecto es x2, y el cliente recuerda la última elegida (`localStorage['fbd.velocidad2d']`). Un cambio de velocidad se aplica al instante; durante una pausa no cambia su duración.
- **Razón**:
  - Un reloj lineal es la definición de homogeneidad de FR-022. Hoy los tirones vienen de esperar a cada tramo en cada interrupción (001/R11) y de fotogramas que saltan entre celdas de la rejilla (R3).
  - Acotar el descuento es la única forma de cumplir SC-006 sin cambiar el ritmo a mitad de una parte, porque el descuento de una parte solo se conoce al llegar a su minuto 45.
- **Alternativas consideradas**:
  - K distinta por parte, calculada con el descuento real: exacta en las reproducciones de partidos ya resueltos, pero imposible en directo sin cambiar el ritmo dentro de la parte;
  - K = 22,5 (solo los 90 minutos reglamentarios): con el descuento actual, los partidos durarían hasta 4 min 30 s (+12 %).

## R3. Capa espacial continua y determinista en el motor (FR-023)

- **Decisión**: el motor incorpora un módulo `espacio/`, puro y determinista. Mantiene la posición y la velocidad de los 22 jugadores y del balón en coordenadas continuas del campo, y sustituye a la rejilla de 6 zonas × 3 carriles como fuente de verdad espacial.
  - **Coordenadas**: las mismas del protocolo (x 0–1000, y 0–640, con 1 unidad ≈ 0,105 m). Se guardan como **enteros en décimas de unidad**.
  - **Aritmética determinista** (001/R7):
    - solo sumas, productos y divisiones enteras, más una raíz cuadrada entera propia (`isqrt`) para normalizar direcciones;
    - las comparaciones de distancia usan distancias al cuadrado;
    - sin funciones trigonométricas;
    - la orientación de los jugadores se deduce de su vector velocidad.
  - **Paso espacial**: una vez por tick (segundo de juego):
    1. **Objetivo de cada jugador**: su ancla táctica (su punto de la colocación, R13), desplazada según:
       - la fase del equipo: con balón, el bloque se adelanta y se abre; sin balón, se repliega y se cierra;
       - la posición del balón: basculación lateral y longitudinal, con factores por línea;
       - su rol en la jugada (R4): ofrecer línea de pase, desmarque de ruptura, acompañar, presionar, cubrir o marcar;
       - la táctica: la altura del bloque desplaza el ancla longitudinal; la línea adelantada adelanta la defensa; el marcaje individual pega al jugador a su par.
    2. **Movimiento**: dirección "steering" hacia el objetivo, con una velocidad máxima que depende del stat de velocidad y del cansancio, y una aceleración y una frenada máximas. Así las trayectorias son continuas, sin saltos ni temblores.
    3. **Separación**: una repulsión mínima entre compañeros y rivales (radio de una chapa) impide que se atraviesen o se amontonen.
  - **Balón parado** (FR-022a): en cada interrupción, los objetivos pasan a una colocación simplificada (sacador en el punto del saque, rematadores en el área en córners y faltas laterales, los dos equipos en su campo en el saque de centro), y el balón sale desde ese punto. Sin barrera ni jugadas ensayadas.
  - **Expulsiones y lesiones sin cambio**: las anclas de la línea afectada se reparten de nuevo entre los que quedan (separación lateral uniforme dentro de la línea). Un sustituto hereda el ancla del jugador al que sustituye.
  - **El balón** se mueve solo por acciones (R4): pegado al pie del portador en conducción, en vuelo entre origen y destino en pases, centros, tiros y despejes, y parado en las interrupciones. Lleva una altura `z` para los balones aéreos, que el 2D dibuja como sombra y tamaño.
  - **Influencia en el resultado**: la capa espacial se calcula siempre, también en la simulación rápida y en `balance`. Determina:
    - quién puede recibir;
    - qué rival disputa cada duelo y a qué distancia;
    - si hay espacio para conducir;
    - desde dónde se tira.

    Por eso los dos modos siguen recorriendo exactamente la misma secuencia (001, invariante 2), y pedir fotogramas solo serializa lo que ya existe.
  - **Coste objetivo**: ≤ 25 ms de CPU por partido sin fotogramas y ≤ 40 ms con fotogramas en Node 22 (antes, < 10 ms). Jornada NPC contra NPC de 8 partidos: < 0,5 s. La herramienta `balance` con N = 1.000 tarda menos de 1 min por criterio.
- **Razón**:
  - El problema de la 2D actual es estructural: el balón salta entre los centros de 18 celdas, los jugadores siguen una casilla fija con un vaivén senoidal, y los pases no tienen origen ni destino reales.
  - FR-023 exige que cada acción visible sea una acción del motor y que los stats se noten en pantalla (velocidad de desplazamiento, encadenar pases). Eso solo es posible si las posiciones forman parte del cálculo.
  - Mantenerlo en el motor cumple los Principios IV y V: un único cálculo, probado sin interfaz.
- **Alternativas consideradas**:
  - **Inventar el movimiento en el cliente** a partir de los eventos del motor: es lo más barato, pero los dos espectadores podrían ver cosas distintas, y lo que se ve no reflejaría el cálculo. Incumple FR-023 ("coherencia con el motor") y el Principio V.
  - **Motor de física** (Box2D o Rapier): determinismo difícil entre plataformas, coste alto y excesivo para chapas (001/R7).
  - **Mantener la rejilla con mejor interpolación** (curvas en lugar de rectas): suaviza, pero los pases seguirían sin destino real y la defensa seguiría sin forma.
  - **Aritmética en coma flotante**: más cómoda, pero el orden de las operaciones con flotantes puede variar entre versiones del motor de JavaScript. Los enteros en décimas cuestan poco más.

## R4. Selección de acciones y densidad del partido condensado (FR-023, FR-024, SC-007, SC-008)

- **Decisión**:
  - **Elección de la acción**: el portador evalúa sus opciones con datos espaciales. Para cada compañero candidato, la puntuación de pase combina:
    - lo libre que está (distancia al rival más cercano a su trayectoria);
    - su distancia;
    - las líneas rivales que supera;
    - el carril.

    También evalúa conducir (espacio libre por delante), regatear (rival cerca y espacio detrás), centrar (portador en banda pasado el último cuarto, con rematadores en el área), tirar (distancia y ángulo a portería) y despejar (presión en zona propia).
  - **Influencia de la táctica y los stats**: los pesos de la táctica actual (001/FR-035, `pesosAcciones`) siguen multiplicando cada opción:
    - Combinativo: favorece pases cortos libres.
    - Contraataque: favorece pases verticales tras la recuperación.
    - Juego vertical: favorece centros y balones largos.

    Los stats del portador fijan la calidad de la evaluación: con más visión ve opciones más lejanas y con más pase elige mejor entre ellas.
  - **Resolución**: la acción elegida se resuelve con el duelo de stats de siempre (001/R7: logística, virtudes, rerolls). El defensor del duelo es el rival real más cercano a la trayectoria o al portador, y la distancia entre ambos entra como ajuste del duelo.
  - **Duración de cada acción**: sale de la física:
    - pase o centro: tiempo de vuelo del balón;
    - conducción: lo que tarda el portador en recorrer el tramo;
    - control: un tiempo de control según el stat y la presión.

    Desaparecen las duraciones aleatorias fijas de 2 a 6 s (001, `DURACION`).
  - **Densidad**: con K = 23,5 y velocidades de balón creíbles (un pase de 25 m tarda ≤ 0,9 s reales a x2), el presupuesto de tiempo visual de 240 s admite unos 180–260 pases, 50–80 conducciones y regates, 25–40 centros, tiros y saques, y las interrupciones.
    - SC-007 pide al menos 150 pases completados, así que la calibración apunta a **≥ 220 pases intentados** (con una precisión de ~70–80 %), en la mitad alta del rango. También pide 10 centros, 15 tiros, 30 conducciones, 3 paredes, 5 cambios de orientación y 3 contraataques, y al menos el 30 % de posesiones de 3 o más pases.
    - Las velocidades del balón y el rango de distancias preferidas se calibran con `balance`, dentro de los límites visuales de FR-025. Si la densidad choca con los SC estadísticos, mandan los SC (Assumption de la spec).
    - `balance` detecta los patrones así: una **pared** es A → B → A en menos de 4 ticks entre pases; un **cambio de orientación**, un pase con desplazamiento lateral de más de 350 unidades; un **contraataque**, una posesión que empieza en campo propio y termina en tiro en menos de 15 ticks.
  - **Recalibrado**: hoy hay unas 1.500 acciones por partido; ahora habrá unas 400–500. Las probabilidades base de las acciones y del tiro (`parametros.acciones`) se recalibran para que sigan cumpliendo los SC estadísticos de la spec 001 (goles por partido, ventaja de la estrategia, orden de los NPC).
  - **Estadísticas nuevas** (FR-024):
    - `pases` pasa a contar solo los pases intentados (corto, largo y al espacio) y ya no incluye los centros;
    - se añaden `centros` y `precisionPase` (derivado);
    - se registran las secuencias de pases por posesión para comprobar SC-007.
  - **Acciones visibles**: cada tramo devuelve la lista `acciones` (tipo, inicio, fin, de, a, éxito). El 2D la usa para el rótulo de la acción y el estilo de vuelo del balón, y las pruebas, para comprobar que el balón nunca se mueve sin una acción que lo explique (SC-007a).
- **Razón**:
  - El "partido condensado" que describe la Assumption de la spec solo funciona si cada acción del motor dura lo que se ve. Si la duración y la física salen de la misma fuente, no hay acciones fantasma ni acciones a cámara lenta.
  - Puntuar los pases con datos espaciales es lo que hace aparecer de forma natural las paredes, los cambios de orientación y los contraataques.
- **Alternativas consideradas**:
  - mantener las 1.500 acciones del motor y mostrar solo una selección en el 2D: rompe la correspondencia entre lo visto y lo calculado, y a x2 cada acción duraría 0,15 s;
  - una "IA de jugadas" con guiones predefinidos (salida de balón, ataque por banda…): da secuencias muy reconocibles, pero repetitivas y difíciles de equilibrar. Los patrones surgen igual de la puntuación espacial.

## R5. Fotogramas: muestreo, formato y suavizado (FR-022, FR-023)

- **Decisión**:
  - **Muestreo**: el motor emite un fotograma **cada 2 ticks**, unas 2.800 por partido, más uno en cada inicio y fin de acción para no perder los cambios de dirección del balón.
  - **Formato compacto (v2)**: un array de enteros `[tick, bx, by, bz, x1, y1, …, x22, y22]` con el orden de jugadores fijado en `partido.inicio`. Un jugador fuera del campo va como `-1, -1`.
    - Ocupa unos 0,6–0,8 MB en JSON por partido completo, y con compresión (`permessage-deflate` en el WebSocket y `@fastify/compress` en HTTP), unos 150–200 kB.
  - **Suavizado en el cliente**: interpolación de Hermite cúbica con velocidades estimadas de los fotogramas vecinos. Mantiene continuas la posición y la velocidad, así que los jugadores aceleran y frenan de forma progresiva sin inventar trayectorias.
    - El balón usa la misma interpolación en el plano y una parábola en `z` dentro de cada acción aérea.
  - **Dibujo**: Canvas 2D (001/R10). La orientación de cada chapa sale del vector velocidad interpolado.
- **Razón**:
  - A x2 se reproducen 23,5 ticks por segundo real. Un fotograma cada 2 ticks da unos 12 puntos de control por segundo, más que suficiente para un Hermite a 60 fps.
  - El formato de objetos actual (`{ j: { id: [x, y] } }`) multiplica el tamaño por cuatro.
- **Alternativas consideradas**:
  - un fotograma por tick: el doble de datos, sin mejora visible;
  - enviar solo las acciones y simular el movimiento en el cliente: rechazada en R3;
  - interpolación lineal (la actual): es la que produce los cambios de dirección bruscos en cada fotograma.

## R6. Reproducción en directo contra un NPC: búfer de anticipación (FR-021, FR-022, FR-030)

- **Decisión**:
  - **Sustituye a 001/R11**: ya no hay velocidad mínima común ni mensaje `partido.velocidad`. La velocidad es solo del cliente.
  - **Búfer de anticipación medido en tiempo de juego** (FR-025a): el servidor mantiene simulados **60 ticks** (1 minuto de juego, `reproduccion.anticipacionTicks`) por delante del tick de reproducción que informa el cliente (`partido.reproduccion`, cada ~250 ms). Son 2,6 s reales a x2, 1,3 s a x4 y 0,64 s a x8.
    - Para no pasarse de esa frontera, el servidor simula por trozos acotados en ticks con el modo nuevo `avanzar(e, 'ticks', { hastaTick })`. Este modo para en un tick concreto sin crear una interrupción; las decisiones se siguen aplicando solo en interrupciones, así que la secuencia del PRNG no cambia (invariante 2 de la 001).
    - Si el búfer se vacía (red lenta o servidor cargado), el cliente detiene el reloj con «Cargando…», que es una pausa anunciada, y sigue a la misma velocidad cuando llegan los datos. Nunca acelera para recuperar.
  - **Paradas duras**: el descanso y el final del tiempo reglamentario de una eliminatoria nunca se adelantan. El servidor espera a «Seguir» o a que venza la ventana (`descansoS`).
  - **Momento en que se aplica una decisión**: en la **primera interrupción aún no simulada**, que está como mucho 60 ticks por delante de lo que se ve en pantalla, más lo que tarde en llegar esa interrupción. La interfaz indica el minuto en que se aplicará en cuanto el servidor lo confirma (`partido.decision_aplicada`). Es el mismo comportamiento que ya tenía la simulación rápida, que aplica las decisiones "al inicio del siguiente tramo".
  - **Salir de la pantalla** (FR-021): sin informes de reproducción, el búfer no crece y el partido queda en pausa sin coste. Al volver, `estado` devuelve los tramos simulados y el último tick informado, y la reproducción sigue desde ahí. Si vence el plazo de la jornada (solo con varios humanos), se aplica `resolverResto` (R7).
  - **Los NPC** deciden en el descanso y antes de la prórroga, como en la spec 001 (`decidirNPCEnPausa`).
- **Razón**:
  - Simular de uno en uno los tramos provoca un tirón de un viaje de ida y vuelta al servidor en cada interrupción, y hay unas 60 por partido.
  - Simular todo el partido de una vez impediría las decisiones en directo.
- **Alternativas consideradas**:
  - **búfer de 3 s reales** (primera versión de este apartado): es más robusto ante la latencia, pero a x8 un cambio podía llegar casi 5 minutos de juego tarde. Se descarta en la revisión de la checklist (FR-025a);
  - **tramos provisionales**: simular por adelantado y volver a simular si llega una decisión. Es exacto al tick, pero obliga a reemplazar fotogramas ya enviados y a guardar dos estados; el beneficio es invisible para el usuario;
  - **simular el partido entero y descartar el futuro con cada decisión**: es la misma idea a mayor escala, con más cómputo desperdiciado.

## R7. Finalizar partido y `resolverResto` (FR-026, FR-027, FR-028, SC-010)

- **Decisión**:
  - Un único procedimiento, `resolverResto(motor, niveles, semilla)`, en `@fbd/ai` (que ya depende del motor). Encadena `avanzar(estado, 'parte')`. En cada parada (descanso, antes de la prórroga) aplica `decidirNPCEnPausa` para los lados controlados por un NPC, cierra la ventana de decisión sin cambios para el humano y sigue hasta `finalizado`, con prórroga y tanda si corresponden.
  - Lo usan:
    - «Finalizar partido» (2D y rápida, en cualquier momento, FR-028);
    - el vencimiento del plazo de una jornada;
    - la resolución de un partido entre humanos (R8);
    - los partidos NPC contra NPC.

    Así todos los caminos comparten exactamente la misma secuencia de decisiones automáticas.
  - **Equivalencia** (SC-010):
    - Al pulsar «Finalizar», el estado del motor está en el final del último tramo simulado, que es una interrupción.
    - Las decisiones pendientes del humano se aplican al reanudar, es decir, en la primera interrupción no simulada, igual que con el búfer de R6.
    - Por el invariante 2 del motor (001), el resultado es idéntico al de seguir mirando sin tomar más decisiones.
    - Una prueba del motor y otra de integración lo comprueban: finalizar en el minuto 0, 30, 45 (descanso), 89 y en la prórroga, y comparar los eventos con la reproducción completa.
  - **Rendimiento**: lo que queda de partido se simula en ≤ 30 ms. El indicador de progreso de FR-027 solo aparece si la respuesta tarda más de 300 ms (servidor cargado):
    - el servidor emite `partido.tramo` por partes (los eventos de cada parte) y después `partido.fin`;
    - el cliente muestra los eventos según llegan.
- **Razón**: un solo camino para resolver lo que queda de partido garantiza la equivalencia por construcción, en lugar de mantener tres implementaciones que deban coincidir.
- **Alternativas consideradas**: dejar que el cliente avance la reproducción a máxima velocidad. Sería lento, dependería del cliente e incumpliría FR-061 (resolución en el servidor).

## R8. Partidos entre humanos: resolución única, visionado y "pendiente de ver" (FR-030, US11, SC-019)

- **Decisión**:
  - **Resolución**: un comando del actor de la partida, `resolverPartidoEntreHumanos`, lanzado por el primer `POST /api/partidos/:id/abrir` de cualquiera de los dos humanos o por el vencimiento del plazo.
    - Si el partido está `programado`:
      1. fija las alineaciones vigentes de ambos (o la automática, 001/FR-031);
      2. asigna los dorsales que falten (FR-038);
      3. ejecuta `resolverResto` con **nivel `avanzado` para los dos lados** (Assumption de la spec);
      4. guarda el partido como `finalizado`, con `resolucion: 'apertura' | 'plazo'` y `abiertoPorId`, y registra el resultado en el torneo.
    - Si ya está resuelto, no hace nada. El actor serializa los comandos, así que dos aperturas simultáneas resuelven una sola vez (Edge Case). La alineación queda fijada en el instante de la resolución.
  - **Por qué `avanzado`**:
    - es el nivel más alto sin simulaciones de prueba (el PRO cuesta hasta 2 s por decisión, 001/R9);
    - es determinista y barato;
    - se aplica por igual a los dos equipos, y el valor se guarda en `parametros.asincrono.nivelDecisiones` para poder cambiarlo con una nueva versión.
  - **Visionado**: `GET /api/partidos/:id/reproduccion` devuelve la entrada pública del partido (alineaciones, dorsales, equipaciones), los eventos, las estadísticas y los fotogramas v2.
    - Los fotogramas no se guardan (001, data-model §6.3): se recalculan repitiendo el partido con su semilla y sus decisiones registradas, y se guardan en una caché LRU en memoria de 32 partidos.
    - El cliente reproduce con su propia velocidad, y «Finalizar» salta al final sin pedir nada al servidor (el partido ya está resuelto).
    - No hay decisiones (la interfaz las oculta) y la respuesta se comprime (R5).
  - **"Pendiente de ver"**: tabla `visionados (partidoId, participanteId, estado: 'pendiente' | 'visto' | 'revelado')`.
    - Al resolverse un partido entre humanos se crean dos filas `pendiente`. Pasan a `visto` cuando la reproducción llega al final o se pulsa «Finalizar» (`POST /api/partidos/:id/visto`), y a `revelado` con «Mostrar resultado».
    - Mientras esté `pendiente`, la vista del torneo que recibe ese participante:
      - muestra su partido sin marcador;
      - calcula su clasificación y las tablas de goleadores y asistentes **sin ese partido**, con una nota de "1 partido pendiente de ver";
      - no revela el resultado en los avisos.
    - Por eso `torneo.actualizado` deja de difundirse igual a todos y se filtra por participante (Principio VI).
- **Razón**: resolver al abrir, y no al abrirse la jornada, permite que cada humano cambie su alineación mientras nadie haya abierto el partido (Edge Case). Recalcular los fotogramas, en lugar de guardarlos, evita guardar ~0,7 MB por partido.
- **Alternativas consideradas**:
  - resolver todos los partidos entre humanos al abrir la jornada: quita la posibilidad de ajustar la alineación;
  - guardar los fotogramas en la base de datos o en un almacén de objetos: más almacenamiento sin necesidad, porque el motor es determinista y barato;
  - ocultar la clasificación entera hasta ver el partido: el resto de la información del torneo es útil y no revela el resultado propio.

## R9. Ritmo del torneo: desaparece el modo "en directo" (FR-012, FR-015, FR-030)

- **Decisión**:
  - El campo `Partida.ritmo` se elimina (migración `0004`). El ritmo se deduce del número de humanos:
    - **Un solo humano**:
      - no hay plazos;
      - los partidos NPC contra NPC de la jornada se resuelven al abrirla;
      - el partido del humano empieza cuando pulsa «Comenzar partido»;
      - al cerrarse la jornada, la siguiente se abre cuando pulsa «Siguiente jornada» (`POST /api/partidas/:id/siguiente-jornada`).

      Desaparecen los temporizadores de preparación (`preparacionS`, `preparacionInicialS`) y de descanso entre humanos.
    - **Varios humanos**: cada jornada tiene su plazo (`plazoJornadaHoras`, 24 h por defecto) con avisos (001/R13).
      - los partidos contra un NPC se juegan en directo cuando el humano pulsa «Comenzar partido»;
      - los partidos entre humanos se resuelven según R8;
      - la jornada se cierra cuando todos sus partidos han terminado o vence el plazo.
  - **Cambio de API**: `POST /api/partidos/:id/listo` (esperar a que los dos estén listos) desaparece y lo sustituye `POST /api/partidos/:id/abrir`.
  - **Invitados** (001/FR-000): siguen limitados a partidas de un humano, así que su ritmo es el de "un solo humano".
  - **Partidas en curso al desplegar**:
    - las de un humano siguen sin plazos;
    - las de varios humanos que estaban en "directo" reciben un plazo `ahora + plazoJornadaHoras` al rehidratarse;
    - un partido entre humanos que estuviera en juego (síncrono) se resuelve con `resolverResto` al rehidratar la partida.
- **Razón**: FR-030 hace que los dos ritmos sean el mismo modelo con o sin plazos, y mantener el campo `ritmo` dejaría combinaciones sin sentido.
- **Alternativas consideradas**: mantener `ritmo` como un dato sin efecto. Se descarta porque induce a error en la API y en la interfaz de creación.

## R10. Pausa de partidas en solitario y salida explícita (FR-021, Edge Cases)

- **Decisión**:
  - **Salida explícita**: al navegar desde la barra (no al cerrar la pestaña), el cliente envía `partida.pausar` por el WebSocket antes de cerrarlo.
    - En una partida con un solo humano, el servidor detiene los temporizadores en curso (turno del draft, ventana del descanso) y guarda el tiempo restante (`MesaDraft.restanteMs`, `pausadaEn`).
    - Al volver a conectar, los reanuda con ese tiempo.
    - En la fase de torneo con varios humanos, `partida.pausar` no tiene efecto (FR-021).
  - **Cierre de la pestaña o caída de la conexión**: sin `partida.pausar`, se aplican las reglas de la spec 001 (elecciones automáticas al vencer el turno y reconexión con instantánea).
  - **Invitados**: la regla de pérdida de partida (10 min sin conexión, 001/FR-000) mide la conexión con la aplicación, no con la pantalla de la partida. Para eso, el cliente de un invitado mantiene abierta la conexión de su partida activa mientras la pestaña esté abierta, aunque navegue a otra sección (la conexión vive en el estado global, no en la pantalla). Un invitado solo puede tener una partida activa, así que no hace falta otra conexión.
- **Razón**: distinguir la navegación explícita del corte de conexión es lo que piden los Edge Cases. Un mensaje explícito es fiable y barato; deducirlo del cierre del socket no lo es.
- **Alternativas consideradas**:
  - un WebSocket global por pestaña, con suscripción a partidas: más limpio a largo plazo, pero cambia todo el protocolo de conexión (001/R3) sin necesidad en esta fase;
  - `navigator.sendBeacon` al descargar la página: no distingue la navegación interna del cierre.

## R11. Abandono confirmado desde la barra (FR-018, FR-019, FR-020)

- **Decisión**:
  - **Cuándo aparece el modal**: solo con `fase = 'draft'` y algún otro humano activo en la partida. Lo calcula el cliente con la instantánea `estado` (participantes, tipos, `controladoPorNPC`).
  - **Si se confirma**:
    1. el cliente llama a `POST /api/partidas/:id/abandonar` (ya existe; se amplía a la fase de draft);
    2. el servidor marca al participante con `controladoPorNPC = true` y nivel `intermedio`;
    3. si no ha elegido en el turno abierto, el NPC elige al instante y el turno se resuelve en cuanto falten solo los ausentes (FR-013);
    4. el humano deja de recibir los mensajes de esa partida.
  - **Interfaz**: el modal se implementa con `useBlocker` de React Router 7 y bloquea también el botón "atrás" del navegador.
- **Razón**: reutiliza el abandono que ya existe (001, Edge Cases) y basta un único punto de decisión en el cliente.
- **Alternativas consideradas**: que el servidor decida si mostrar el modal. Añade un viaje de ida y vuelta antes de navegar, y la información ya está en la instantánea.

## R12. Penalización por posición (FR-031 a FR-033, SC-011, SC-012)

- **Decisión**:
  - **Tabla en los parámetros**: la tabla de FR-032 y el −10 % de FR-031 pasan a `ParametrosEquilibrado` **2.0.0** (cambio mayor), como `penalizacionPosicion`:
    - `mismaDemarcacion`;
    - `cruces`: filas origen → destino;
    - `porteria`.

    Una prueba fija los valores contra la spec, porque son reglas confirmadas por el usuario (Assumption), y cambiarlos exige actualizar la spec.
  - **Función de dominio**: `penalizacionPorPosicion(jugador, posicionesDestino, p)` sustituye a `penalizacionPorCasilla`. Funciona así:
    1. si alguna posición de destino es del jugador, no hay penalización (0);
    2. el portero fuera de la portería, o un jugador de campo en ella: `porteria`;
    3. con Todocampista: 0 (salvo en la portería);
    4. en otro caso, para cada posición del jugador como origen se calcula su rol: `DEL`, `MED_MCO`, `MED_MD`, `MED` o `DEF`. El destino se clasifica en `DEF`, `MED_MCO`, `MED` o `DEL`. Se busca la fila (o `mismaDemarcacion` si coinciden las demarcaciones) y se aplica **la menor** de todas.
  - **Casilla central**: la zona o casilla central de una defensa de 3 o 5 admite `['DCI', 'DCD']`. Un DEF sin esas posiciones recibe el −10 % de su demarcación (Edge Case).
  - **Pantalla de alineación**: `statsEfectivos` conserva su firma (recibe un objeto con `posicionesAdmitidas`), así que la pantalla de alineación, el motor y la alineación automática cambian a la vez.
  - **Versiones**: los partidos guardados con la versión 1.0.0 se siguen mostrando con sus eventos y estadísticas guardados, pero no se pueden volver a simular (por ejemplo, para recalcular sus fotogramas) con el motor nuevo. La interfaz ofrece para ellos solo el resumen.
- **Razón**:
  - El Principio III pide valores explícitos y probados en un único sitio.
  - El cambio de versión mayor deja trazado que el motor y los parámetros cambian a la vez (001/FR-040).
- **Alternativas consideradas**:
  - tabla fija en el código del dominio: igual de explícita, pero rompe la regla de "todas las magnitudes en los parámetros versionados";
  - mantener el motor v1 junto al v2 para volver a simular partidos antiguos: duplicaría el motor solo para el MVP en beta.

## R13. Colocación libre, zonas y ofensividad (FR-034, FR-034a, FR-034b, SC-016, SC-018)

- **Decisión**:
  - **Zonas del campo**: una rejilla estática en el dominio (`equipo/zonas.ts`). Cada zona es un rectángulo en coordenadas del equipo y tiene:
    - las posiciones que admite (con la misma forma que una casilla, `posicionesAdmitidas`);
    - su `linea`: `porteria`, `defensa`, `medio` o `ataque`.

    La tabla inicial está en [data-model.md §2](./data-model.md). Hay una prueba que comprueba que las casillas de las 10 formaciones caen dentro de una zona que admite su posición. Para que se cumpla, se ajustan algunas coordenadas de casillas que hoy se solapan, como el MC del 4-2-3-1, que está a la altura del MD.
  - **Colocación**: la alineación guarda, para cada titular, su punto `(x, y)` (`colocacion`).
    - Si no se indica, es la zona de su casilla en la formación (compatibilidad con la spec 001).
    - La **posición efectiva** es la de la zona que contiene el punto, y la penalización se calcula con ella (R12).
    - El portero solo puede estar en la zona de portería, y ningún jugador de campo puede estar en ella (FR-034a). El dominio lo valida, y por tanto también el servidor.
  - **Formación personalizada**: si el reparto de posiciones efectivas no coincide con el de las casillas de la formación de partida, la formación es "personalizada". El reparto por líneas se cuenta por la `linea` de cada zona (en un 4-4-2, los EI y ED son medios porque están a la altura del medio).
  - **Ofensividad y amplitud** (FR-034b): se calculan como ajuste sobre la formación de partida:
    - `ofensividad = perfil.ofensividad + Σ (peso(linea efectiva) − peso(linea de su casilla)) + β · (x̄ colocación − x̄ casillas) / 100`, con pesos defensa −1, medio 0 y ataque +1;
    - `amplitud = perfil.amplitud + γ · (dispersión lateral colocación − dispersión casillas) / 100`;
    - ambas se acotan a [−3, +3].

    Con la colocación de la propia formación el ajuste es 0, así que coincide exactamente con la tabla de la spec 001. Pasar un defensa a delantero suma +2, lo mismo que hay entre el 4-4-2 (0) y el 3-4-3 (+2) en la tabla, y eso garantiza el sentido de SC-018. β y γ están en los parámetros.
  - **En el motor**: cada `JugadorEnPartido` tiene su `ancla` (su punto de la colocación) y su `posicion` efectiva. El ancla alimenta la capa espacial (R3), la posición efectiva, la penalización, y el perfil calculado, los efectos de formación (`formacionTactica`).
    - Una sustitución hereda el ancla del que sale.
    - Un cambio de formación en directo restablece las anclas a las casillas.
    - La decisión `recolocacion` admite `colocacion`.
  - **Interfaz**:
    - arrastre con Pointer Events, sin librerías;
    - el cálculo se hace en el cliente con el mismo paquete `@fbd/domain` (< 1 ms) y el servidor lo vuelve a validar al confirmar (SC-016);
    - dos jugadores en el mismo punto se separan un mínimo de 30 unidades;
    - antes de confirmar, se avisa de los repartos muy desequilibrados: menos de 3 defensas, más de 5 delanteros o una línea vacía.
- **Razón**:
  - Una rejilla fija reproduce el ejemplo de la spec ("retrasar un poco a un DC lo convierte en SD").
  - El ajuste relativo a la formación de partida es la única fórmula sencilla que coincide exactamente con la tabla. Se probó un modelo lineal sobre el número de jugadores por línea, y no puede reproducir a la vez el 4-3-3 (+1), el 4-2-3-1 (0) y el 3-3-3-1 (+2).
- **Alternativas consideradas**:
  - posición efectiva igual a la de la casilla más cercana de la formación: no permite convertir un DC en SD en un 4-3-3, que no tiene casilla de SD;
  - ofensividad solo por formación, ignorando la colocación: incumple FR-034b.

## R14. Dorsales (FR-035 a FR-038, SC-014)

- **Decisión**:
  - **Asignación inicial**: `asignarDorsalesIniciales` elige los números aleatorios entre los libres del **1 al 24**. Los fijos por casilla se asignan con la posición efectiva de cada titular.
  - **Edición**: `asignarDorsal(dorsales, jugadorId, n)` sustituye a `editarDorsales`. Si `n` ya lo lleva otro jugador, ese jugador pierde su dorsal y queda "sin dorsal".
    - El mapa `Dorsales` admite jugadores sin entrada.
    - La edición sigue limitada al rango 1–99.
    - El error `DORSAL_REPETIDO` desaparece: es imposible por construcción.
  - **Al empezar cada partido**: `completarDorsales(dorsales, convocados)` da a cada convocado sin dorsal el número libre más bajo del 1 al 24, o a partir del 25 si están todos ocupados.
    - El resultado se guarda.
    - El participante recibe un aviso con los cambios (`partido.inicio.dorsalesAsignados`, y un aviso en la bandeja si el partido se resolvió sin él).
- **Razón**: hace la unicidad imposible de romper (SC-014) y cumple la regla de reasignación de la spec.
- **Alternativas consideradas**: rechazar el dorsal repetido (comportamiento de la spec 001). La spec lo cambia expresamente.

## R15. Máximos goleadores y asistentes (FR-039 a FR-042, SC-015)

- **Decisión**:
  - **Aportaciones por partido**: el estado del torneo (`EstadoTorneo`, dominio puro) guarda una lista `aportaciones: { partidoId, participanteId, jugadorId, goles, asistencias, jugo }[]`. `registrarResultado` la amplía al terminar cada partido, a partir de:
    - los eventos `gol`: el autor suma un gol y el asistente, una asistencia; no cuentan los de `datos.enPropia === true`, reservado porque el motor actual no genera goles en propia;
    - las alineaciones iniciales y los eventos `sustitucion` (rol `entra`), para saber quién jugó.

    Los lanzamientos de la tanda son eventos `tanda_lanzamiento` y no cuentan.
  - **Tablas**: `tablaGoleadores(torneo, { excluirPartidos })` y `tablaAsistentes(...)` agregan las aportaciones al pedirlas y ordenan por total, después por menos partidos jugados y después por nombre (FR-042).
    - La exclusión aplica la regla de "pendiente de ver" (R8).
    - Las dos mesas y todas las fases ya están en el mismo torneo.
- **Razón**:
  - Guardar las aportaciones por partido, en lugar del total, es lo que permite excluir el partido no visto de un participante.
  - Con como mucho unos cientos de partidos por torneo, agregar al pedirlas cuesta menos de 1 ms.
- **Alternativas consideradas**:
  - una tabla SQL de totales: no permite excluir partidos por espectador;
  - recalcular las tablas desde los eventos de todos los partidos en cada petición: más E/S.

## R16. Diseño de las cartas (FR-001 a FR-005, SC-001, SC-002)

- **Decisión**:
  - **Componente**: `CartaJugador` se rehace como un componente con dos variantes, completa y compacta, sobre CSS propio sin librerías. La carta completa tiene proporción de carta (≈ 5:7) y usa *container queries* y tamaños de letra con `clamp()` para leerse igual de 160 a 280 px de ancho.
  - **Disposición de la carta completa**:
    - **cabecera**: la media grande, el nombre y una silueta SVG genérica en línea, con una variante por demarcación;
    - **franja de posiciones**: distintivos de las posiciones y demarcación;
    - **pie**: rejilla de 2 × 3 stats y las virtudes en distintivos de una línea, que se reducen y parten en dos líneas cuando hay 4.
  - **Acabado por nivel**: variables CSS por nivel (marco, degradado, brillo):
    - Superclase: plata mate;
    - Épico: violeta;
    - Legendario: oro con brillo animado suave;
    - GOAT: holográfico con un degradado cónico animado.

    Las animaciones respetan `prefers-reduced-motion`.
  - **Virtudes**: cada virtud es un botón que abre un *popover* (atributo `popover` de HTML) con su descripción, que viene de `GET /api/catalogo/virtudes` y se guarda en caché al iniciar la sesión.
  - **Comprobación de SC-002**: una prueba de Playwright renderiza las cartas de la colección Core en 1280 px y 360 px y comprueba que ningún elemento interno desborda.
- **Razón**: sin dependencias nuevas, y la comprobación de SC-002 queda automatizada.
- **Alternativas consideradas**:
  - dibujar las cartas en un canvas: peor accesibilidad y texto no seleccionable;
  - una librería de componentes: no aporta nada para un único componente con un diseño propio.

## R17. Animación de apertura de sobre y sonido (FR-006 a FR-010, SC-017)

- **Decisión**:
  - **Cuándo se reproduce**: el servidor marca `animacion: true` en el **primer** `draft.turno` del turno 1 de cada ronda, que es el sobre propio. Ni la reconexión (`estado`) ni el resto de turnos lo marcan, así que la animación aparece exactamente 3 veces y nunca al reconectar.
  - **Margen de tiempo**: el `venceEn` del turno 1 de cada ronda suma `parametros.draft.margenAnimacionS` (6 s) al tiempo de turno (FR-008). Si el participante salta la animación, el tiempo de turno es el mismo.
  - **Animación**: CSS (transformaciones y opacidad):
    1. el sobre tiembla y se rasga en unos 1,2 s;
    2. las 8 cartas se reparten boca abajo, escalonadas 120 ms, en unos 1,5 s;
    3. las cartas se voltean;
    4. las de nivel Legendario y GOAT tienen un destello y una pausa de 400 ms (FR-009).

    Dura como máximo unos 4,5 s, por debajo de los 6 s de FR-007. Un toque o «Saltar» la termina y revela las cartas.
  - **Movimiento reducido**: con `prefers-reduced-motion`, la animación se sustituye por un fundido de 300 ms (FR-010).
  - **Sonido**:
    - Web Audio API con 4 efectos cortos (rasgado, reparto, volteo, revelación especial) en OGG/MP3 de licencia CC0, menos de 60 kB en total, en `apps/web/public/sonidos/` con la licencia junto a ellos;
    - el contexto de audio se desbloquea con la primera interacción del usuario;
    - la preferencia "silenciado" se guarda en `localStorage` (`fbd.sonido`) y se cambia desde la barra de navegación.
- **Razón**:
  - La marca del servidor resuelve a la vez "solo el sobre propio" y "no repetir al reconectar".
  - CSS basta para la versión básica que pide la spec.
- **Alternativas consideradas**:
  - decidirlo en el cliente con `turno === 1`: se repetiría al reconectar;
  - guardar la preferencia de sonido en el servidor: la spec no pide que viaje entre dispositivos, y `localStorage` también sirve para los invitados.

## R18. Barra de navegación y botones de avanzar (FR-011 a FR-017, SC-003, SC-013)

- **Decisión**:
  - **Barra de navegación**: una ruta de diseño (`Marco`) envuelve todas las pantallas con la barra:
    - Inicio;
    - «Mis partidas» (pantalla nueva sobre `GET /api/mis-partidas`, con las partidas en curso y terminadas del usuario);
    - «Nueva partida»;
    - «Cuenta» o «Iniciar sesión»;
    - el interruptor de sonido.

    Durante el partido 2D se muestra en versión compacta (iconos). Cualquier pantalla queda a 1 clic del menú principal (SC-013).
  - **Botones de avanzar**: un único componente `BotonAvanzar` con la etiqueta según el contexto (FR-011). Cada pulsación envía un `requestId`, así que las repeticiones son idempotentes (FR-016). Cada etiqueta lanza un comando del servidor:
    - «Preparar equipo»: navegación, sin comando;
    - «Comenzar partido»: `POST /api/partidos/:id/abrir`;
    - «Seguir»: `partido.seguir`;
    - «Siguiente»: navegación;
    - «Siguiente jornada»: `POST /api/partidas/:id/siguiente-jornada`;
    - «Volver al menú»: navegación.
  - **Draft**: `draft.progreso` añade `pendientes: { id, nombre }[]` (solo los humanos que faltan; los NPC eligen al abrir el turno, 001) para mostrar «Esperando a…» (FR-013).
- **Razón**: centraliza las reglas de FR-011 y FR-016 y las prueba una vez.
- **Alternativas consideradas**: un botón por pantalla con su propia lógica. Es lo que hay hoy, y es justo lo que falta en varias pantallas.

## R19. Verificación de los criterios de éxito

- **Decisión**:
  - **`balance`** (001/R8) añade:
    - SC-007: pases, centros, tiros y secuencias de 3 o más pases;
    - SC-008: +10 de pase en los medios;
    - SC-011: penalizaciones de −40 % y −10 %;
    - SC-018: colocación con un delantero más y un defensa menos.

    Revalida además los SC de la spec 001 que dependen del recalibrado (R4).
  - **Pruebas del motor** como sustituto automático de SC-007a. Sobre 50 partidos con semilla, se comprueba que:
    - ningún jugador supera su velocidad ni su aceleración máximas;
    - ninguna distancia entre chapas baja del mínimo;
    - el balón solo se desplaza dentro de una acción;
    - como mucho 2 defensores van a la vez al balón fuera de la presión coordinada.

    La revisión visual de SC-007a sigue en el quickstart.
  - **Reloj y equivalencia**:
    - pruebas unitarias del reloj de reproducción para SC-005 y SC-006 (duración simulada de cada minuto y de cada parte a x2, x4 y x8);
    - la prueba de equivalencia al finalizar de SC-010, en el motor y en la integración del servidor.
  - **Playwright**: los recorridos A a K del [quickstart.md](./quickstart.md).
- **Razón**: Principio IX. Cada SC tiene una comprobación usando la aplicación y, cuando es estadística, una herramienta.

---

## Resumen de incógnitas resueltas

| Incógnita del Technical Context | Resuelta en |
|---------------------------------|-------------|
| Modelo síncrono frente a asíncrono (FR-029) | R1 |
| Duración y velocidades de la 2D | R2 |
| Realismo de la 2D: modelo espacial | R3, R4 |
| Formato y volumen de los fotogramas | R5 |
| Reproducción en directo sin tirones y con decisiones | R6 |
| Finalización anticipada equivalente | R7 |
| Partidos entre humanos asíncronos y resultados ocultos | R8 |
| Plazos y ritmo del torneo | R9 |
| Pausa al salir e invitados | R10, R11 |
| Penalización por posición y versión de parámetros | R12 |
| Zonas, colocación libre y ofensividad | R13 |
| Dorsales | R14 |
| Goleadores y asistentes | R15 |
| Cartas, animación y sonido | R16, R17 |
| Navegación y avance | R18 |
| Verificación de los SC | R19 |
| Nivel de las decisiones automáticas entre humanos | R8 (`avanzado`) |

No queda ninguna marca `NEEDS CLARIFICATION`.
