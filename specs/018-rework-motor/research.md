# Research: Rework del motor (spec 018)

Decisiones técnicas de la fase 0. Las medidas marcadas como **medida local** se tomaron el 2026-11-21 sobre el motor
8.0.0 sin modificar, con 300 partidos sintéticos y Node 24: sirven para decidir el diseño, no como línea base oficial.

| Medida local | Valor |
|---|---|
| Ticks por partido | 5.736 |
| Ticks con un saque en curso | 20,7 % |
| Cálculos de objetivos por partido hoy | 1.732 |
| Cálculos si solo se hacen cada 4 ticks | 1.434, de ellos 299 (20,8 %) durante saques |
| Descuento medio | 2,28 min en la primera parte y 2,26 en la segunda |

## R1. Energía como única fuente

- **Decisión**: `JugadorEnPartido.cansancio` se sustituye por `energia` (0–100, decimal) y `penalizacionFisica`, que se
  recalcula solo al cambiar la energía. `energiaDe` sigue siendo la única salida hacia la interfaz.
- **Razón**: `atributoConBonus` se llama miles de veces por partido; calcular los tramos en cada llamada añadiría coste.
- **Alternativas**: conservar `cansancio` y derivar la energía (la curva por tramos deja de ser invertible de forma simple);
  energía entera (acumula error y rompe los valores exactos de FR-006).

`estadisticas.cansancioMedio` se conserva por compatibilidad con los resúmenes guardados y pasa a valer `1 − energía / 100`.

## R2. Fórmula del gasto

- **Decisión**: dentro de un tramo de fatiga, en cada tick:

  ```text
  gasto por tick   = ritmo × 0,8 / 60
  gasto por acción = ritmo × 0,2 × peso de la acción × factor Indisciplinado / referencia del rol
  ritmo            = rol × rasgos × táctica
  ```

  La referencia son los puntos de intensidad **por minuto de tramo** de un jugador medio de ese rol.
- **Razón**: si el jugador iguala la referencia, gasta exactamente `ritmo` por minuto y sigue la curva. Reproduce todos los
  valores de la spec: 93 / 67,5 / 50 / 62,5 por rol; 75, 45 y 44 para Incansable, Fatigado e Indisciplinado; 66,75 con Motivador;
  57,5 y 49,6 con Individual; y unos 7 para un medio Fatigado e Indisciplinado.
- **Alternativas**: multiplicar el ritmo por la intensidad del minuto (necesita ventanas y estado adicional).

## R3. Límites de los tramos

- **Decisión**: un tick gasta si `segundosEnParte > inicio × 60`. El reloj se incrementa antes de gastar, así que el tramo
  del 30' al 45' son exactamente 900 ticks. Con `>=` serían 901 y fallarían las pruebas exactas.
- **Recuperación**: se aplica en `comprobarFinParte`, al pitar el final de la parte y antes de las decisiones de la pausa.
  Así Motivador cuenta si estaba en el campo al pitarse y un suplente que entra en el descanso no recupera (FR-016).
- **Alternativas**: recuperar en `reanudar` (la pausa mostraría la energía sin recuperar y los cambios ya aplicados alterarían Motivador).

## R4. Acciones intensas

- **Decisión**: se cuentan con reglas deterministas, sin PRNG y solo dentro de un tramo:

  | Tipo | Cuándo cuenta | Quién |
  |---|---|---|
  | Sprint | Al **entrar** en velocidad ≥ `umbralSprint` de su máxima | El jugador |
  | Presión | Al **entrar** en la lista de presionadores | El presionador |
  | Regate | Cada intento | El portador |
  | Duelo | Entrada frente a regate o conducción, y duelo aéreo | Los dos implicados |

- **Razón**: contar entradas y no instantes evita que el coste cambie si los objetivos pasan de 4 a 8 ticks. Los duelos usan
  los mismos puntos del código que ya anotan `entradas` y `anotarAereo`.
- **Alternativas**: contar por tiempo presionando (depende de la cadencia); incluir desmarque y control con presión (son
  duelos técnicos, no esfuerzo físico).

## R5. Referencia al 90' y descuento

- **Decisión**: la medida se toma a las 90:00 y se compara con la curva calculada con el **descuento real de la primera
  parte** de ese partido, mediante una función pura (`curvaEnergia`) que respeta el tope de 100 en el descanso.
- **Razón**: la spec dice que los valores de referencia no incluyen el descuento, pero el de la primera parte sí se gasta
  antes del 90'. Con 2,28 minutos de media, el sesgo sería −2,7 en un medio y −3,0 en un Fatigado: agotaría el margen de ±3.
- **Alternativas**: no gastar en el descuento (contradice FR-007); ampliar el margen (ocultaría errores reales).

## R6. Penalización por tipo de stat

- **Decisión**: una tabla de atributo a tipo (física, técnica o mental) aplicada en `atributoConBonus`. Las dos lecturas de
  liderazgo sin cansancio (`objetivos.ts` y `bonusLiderPortero`) pasan a usar un ayudante común con penalización mental.
- **Razón**: los 15 atributos existentes encajan exactamente en los 4 + 8 + 3 de FR-012.

## R7. Cadencia de movimiento

- **Decisión**: `PASO_MOVIMIENTO = 4`. Cada 4 ticks se calculan dirección, velocidad y separación, y el jugador avanza
  `velocidad × 2`. A los 2 ticks avanza otros `velocidad × 2`, sin recalcular nada. Los fotogramas siguen cada 2 ticks.
- **Razón**: con posiciones congeladas 4 ticks, el fotograma intermedio repetiría la posición y la curva del cliente
  mostraría el «anda y para» que prohíbe FR-044. Avanzar a medio paso cuesta una suma por jugador, mantiene las posiciones
  reales para la lógica (quién llega al balón) y **no cambia el protocolo ni el cliente**.
- **Alternativas**: fotogramas cada 4 ticks (empeora la parábola del balón y cambia el contrato); interpolar solo en el
  cliente (la lógica seguiría con posiciones atrasadas y aparecería el desajuste entre balón y receptor).

## R8. Objetivos y saques

- **Decisión**: con el movimiento cada 4 ticks, la condición actual «cada 4 ticks o durante un saque» deja de ahorrar nada.
  Durante un saque, los objetivos se recalculan solo si cambia su **clave** (motivo, sacador y posición del balón) o si la
  referencia aún no ha alcanzado el balón. Secuencia de FR-003:
  1. Medir en CI con objetivos cada 4 ticks y la clave de saque.
  2. Si supera 60 ms, pasar a 8 ticks antes de calibrar.
  3. Si tampoco basta, decide la persona responsable.
- **Estimación**: con el perfil previo (36 % mover, 36 % objetivos y 28 % el resto) y la medida local:

  | Configuración | Coste estimado sobre 101 ms |
  |---|---|
  | Mover cada 4, objetivos cada 4 con clave de saque | ~70 ms |
  | Mover cada 4, objetivos cada 8 con clave de saque | ~59 ms |

  Lo más probable es necesitar los 8 ticks, y con poco margen, porque la lógica nueva también cuesta.
- **Alternativas**: memorizar por todas las entradas de `calcularObjetivos` (dependen de las posiciones reales y casi nunca coincidirían).

## R9. Medida de rendimiento en CI

- **Decisión**: `umbral-motor` y `bench` pasan a un **job propio** (`rendimiento-motor`), sin dependencia de los demás.
- **Razón**: hoy están después de `pnpm test` y `test:equivalence` en el mismo job. Durante las etapas 2 y 3 las huellas no
  están regeneradas o la calibración falla, y el paso de rendimiento **nunca llegaría a ejecutarse**, así que FR-003 no se podría cumplir.
- **Nota**: el CI corre en `push` a `main` y en `pull_request`. La persona debe publicar la rama y abrir un PR en borrador.

## R10. Tácticas

- **Decisión**: todos los valores pasan a `PARAMETROS_V9.tacticas` ([data-model §3](data-model.md#3-parámetros-900)).
  `desplazamientoAtaque` recibe el portador y, en el tiro, si es lejano, porque Catenaccio (FR-024) e Individual (FR-027) dependen de ellos.
- **Catenaccio**: −0,50 solo en zonas 4 y 5, sin afectar a `centro` ni al tiro lejano. En el tiro se aplica la mitad, como hoy.
- **Línea adelantada**: basta quitar la condición `conBalon`; el valor actual (450 décimas) ya equivale a 4,7 m.
- **Bandas + Vertical**: valores propios cuando coinciden (×1,8 y +0,25), no el producto de ambos.

## R11. Estrella y marcador

- **Decisión**: `marcajeEstrella` se guarda en el equipo que defiende y se fija **una sola vez, la primera vez que Individual
  está activo** (al empezar o al cambiar de táctica). Si el equipo deja Individual, se suspende; si uno de los dos sale, termina.
- **Razón**: la spec no cubre el cambio de táctica en una pausa, que el motor permite. Elegir una vez respeta «no se sustituyen».
- **Empates**: mayor valor y después `id` menor. Sin jugador de campo en algún equipo, no hay pareja.
- **−5 y +6**: el −5 entra en `ajusteDuelo` (cubre duelo, tiro y parada) y también en el desmarque y el control con presión,
  que no pasan por él. El +6 de marcaje solo se suma en `desmarqueDelPase`.
- **Alternativas**: reelegir al volver a Individual (contradice «sin nueva elección»); no permitir la pareja si se activa tarde
  (Individual perdería su efecto principal sin explicación).

## R12. Ventaja por la banda

- **Decisión**: `perder` guarda `ventajaBanda` si quien pierde juega por las bandas y el balón está en un carril exterior. La
  **primera acción** del rival la consume siempre; da +0,15 si es un pase a ese carril, o un regate, conducción o centro por él.
- **Razón**: un solo campo y sin PRNG. El tiro consume la ventaja sin aplicarla, porque FR-029 no lo incluye.

## R13. Versiones y retirada de ramas

- **Decisión**: `VERSION_MAYOR_SOPORTADA = 9`. Los datos de la 3.x a la 8.x se quedan en el registro porque los **duelos**
  (`resolverCruce`) y los resúmenes los leen por versión. Se retiran las ramas del motor (unas 30 condiciones sobre bloques
  opcionales) con un tipo `ParametrosMotor`, que declara obligatorios esos bloques.
- **Reproducción**: las guardas actuales de versión devuelven `VERSION_NO_REPRODUCIBLE` y la pantalla ya muestra el resumen
  con el mensaje. No hace falta cambiar la interfaz para FR-036.
- **Huellas**: se retiran `huella-014`, `huella-015` y `equivalencia-005`, y en la etapa 4 se crea `huella-018.json`.
  `equivalencia.test.ts` (rápida contra 2D) sigue activa durante la calibración (FR-004).

## R14. Cierre de partidas al desplegar

- **Decisión**: función `cerrarPartidasMotor9(db, reloj)`, llamada desde `main.ts` **después de las migraciones y antes de
  `crearServidor`, `rehidratar` y `listen`**. Trabaja en **una transacción** con bloqueo consultivo. Su marca es la fila `cierre_motor_9`
  de `ajustes`, escrita en la misma transacción.
- **Razón de la marca**: sin ella, repetir el paso cerraría también las partidas nuevas de la 9.0.0. Solo hay una réplica y
  el despliegue reinicia el proceso, así que no convive con un servidor antiguo.
- **Estado**: `abandonada`, el mismo destino que `cerrar_admin` en la 017; ya sale en «Mis partidas» y no se rehidrata.
- **Partidos en juego**: vuelven a `programado` sin datos parciales, porque no se pueden reconstruir. Los `finalizado` no se tocan.
- **Guarda nueva**: hoy `abrirPartido` no mira el estado de la partida, y un partido `programado` de una jornada abierta se
  podría jugar en una partida cerrada. `errorAlAbrir` debe rechazarlo.
- **Devolución**: `devolverCobroRareza` acepta una transacción externa. Su índice único ya garantiza una sola devolución.
- **Aviso**: tipo `partida_cerrada`, con texto propio, solo en la bandeja.
- **Alternativas**: migración SQL (duplicaría la devolución y no se puede probar «ejecutar dos veces»); orden manual (se podría olvidar y el servidor rehidrataría partidas 8.x).

## R15. Integración con la spec 017

La 017 está en curso en otra copia de trabajo, sin confirmar:

| Fichero o concepto | Solape | Decisión |
|---|---|---|
| `0018_spec017.sql` | Añade el aviso `partida_cerrada` | La 018 **no crea migración**: integra antes la 017 |
| `partida.ts` | La 017 añade `cerrar_admin` | La 018 añade `cerrar_version` junto a él |
| `gestor.ts` | La 017 cambia `crearPartida` | El cierre va en un módulo aparte, sin tocar `gestor.ts` |
| Devolución | La 017 solo devuelve desde `buscando` | El cierre de la 018 es otro camino y devuelve también en draft y torneo (FR-048) |
| `protocol/ws/partido.ts` | Migración a zod 4 | No se modifica (FR-021) |
| `metricas.test.ts` | Ambas lo tocan | Se integra a mano al migrar las pruebas |

## R16. Decisiones de los NPC

- **Decisión**: `umbralCansancio` pasa a `umbralEnergia`. Se cambia a un jugador si `energia < umbral`, y 0 significa «nunca».
  Valores de partida: 42, 53 y 63, equivalentes a los actuales (0,35, 0,28 y 0,22 sobre un máximo de 0,6); se ajustan al calibrar.
- **Fatigado e Indisciplinado**: su umbral se adelanta con `100 − (100 − umbral) × 0,75`, la misma proporción que hoy.
- **Prioridad**: el orden usa `0,6 × (1 − energia / 100)`, la escala actual, para que proteger a un amonestado (0,5) siga
  teniendo el mismo peso.

## R17. Ayuda de energía

- **Decisión**: el mensaje sigue con `energia` y `penalizacion` (la física). La ayuda deriva la técnica (×0,5) y la mental
  (×0,25) en el cliente. Como la física llega redondeada, la derivada puede diferir en menos de un punto, y se muestra como aproximada.
- **Razón**: FR-021 prohíbe añadir campos al mensaje.
