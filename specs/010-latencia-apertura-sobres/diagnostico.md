# Diagnóstico: latencia de apertura y de entrega de sobres

**Spec**: [spec.md](spec.md) (FR-004, SC-004) | **Método**: [research.md R2 y R3](research.md) |
**Mediciones**: [mediciones/](mediciones/)

**Estado**: provisional. Está la medición con Docker Desktop y Wi-Fi (T015). Falta la del entorno de referencia, sin
Docker Desktop (T014). Cuando esté, se completa la sección «Diferencia entre entornos». El diagnóstico ya basta para
decidir el diseño de US2 y US3 (ver «Decisión»), porque el tiempo que domina no depende del entorno.

## Entornos y escenarios

| Entorno | Servidor | PostgreSQL | k6 | Mediciones |
|---------|----------|------------|----|------------|
| Docker Desktop y Wi-Fi (T015) | Windows, Node, hilos por defecto | `docker compose` (Docker Desktop) | misma máquina | [docker-1](mediciones/docker-1.md), [docker-10](mediciones/docker-10.md), [docker-100](mediciones/docker-100.md) |
| Referencia (T014) | sin Docker Desktop | nativo o WSL2 | misma máquina | pendiente |

Como todo corre en la misma máquina,
el tráfico va por loopback y el Wi-Fi no interviene. Lo que añade latencia de red es el reenvío de puertos de Docker
Desktop. El servidor se reinició entre escenarios (los cuantiles se acumulan desde el arranque).

**Validez de la carrera de 100 partidas.** Hubo 219 `errores_ws` («conexión denegada» en 127.0.0.1:3000 al conectar
los 730 WebSocket), 13 partidas bloqueadas y solo 53 terminadas. El p95 de 45 s de `entrega_sobre_ms` en k6 son
turnos que vencen porque sus humanos no llegaron a conectarse. Por eso esa carrera **no sirve para los umbrales**.
El desglose de las operaciones que sí ocurrieron (5740 aperturas y 1272 entregas) sí vale.

## Desglose por fases (mediana / p95, ms)

### Apertura (`POST /api/partidos/:id/abrir`)

| Fase | 1 partida | 10 partidas | 100 partidas |
|------|----------:|------------:|-------------:|
| cola | 0 / 38 | **2062 / 3848** | **11 979 / 22 481** |
| cálculo | 59 / 102 | 120 / 290 | 131 / 283 |
| bd | 18 / 24 | 94 / 1115 | 899 / 7747 |
| serialización | 0,3 / 0,5 | 0,5 / 2,4 | 0,5 / 2,5 |
| difusión | 0,2 / 0,5 | 0,3 / 2,8 | 0,2 / 2,9 |
| resto | 2,5 / 4,6 | 4,1 / 66 | 4,6 / 73 |
| **total** | **80 / 166** | **2393 / 3977** | **13 870 / 22 975** |
| consultas | 14 / 14 (media 14) | 14 / 324 (media 96) | 14 / 324 (media 97) |
| k6 `apertura_ms` | 84 / 133 | 2430 / 4000 | 13 980 / 23 060 |

### Entrega de sobre (elección que cierra el turno)

| Fase | 1 partida | 10 partidas | 100 partidas |
|------|----------:|------------:|-------------:|
| cola | 0 / 0 | 61 / 102 | 325 / 432 |
| cálculo | 2,0 / 121 | 0,2 / 2,7 | 0,0 / 0,7 |
| bd | 9,0 / 52 | 54 / 101 | 299 / 590 |
| serialización | 0,1 / 0,4 | 0,4 / 1,4 | 0,5 / 1,0 |
| difusión | 0,2 / 0,6 | 0,9 / 1,7 | 0,8 / 1,6 |
| resto | 1,6 / 14 | 1,3 / 2,8 | 1,2 / 4,3 |
| **total** | **13 / 186** | **117 / 205** | **619 / 1130** |
| consultas | 7 / 61 | 6 / 8 | 6 / 8 |
| k6 `entrega_sobre_ms` | 12 / 17 | 115 / 188 | 575 / (45 000, no válido) |

El total del servidor y lo que mide k6 coinciden en unos pocos ms. El tiempo de la operación está dentro del servidor.

Con 1 partida (24 entregas), el p95 de cálculo y de consultas de la entrega es casi la peor muestra. Probablemente
es el turno que termina el draft (`terminarDraft`), que ocurre una sola vez. No se ha comprobado.

## Cobertura del desglose (FR-001, SC-004)

`resto / total` es la parte que no se atribuye a ninguna fase.

| Operación | 10 partidas | 100 partidas | 1 partida (sin carga) |
|-----------|------------:|-------------:|----------------------:|
| apertura (mediana / p95) | 0,2 % / 1,7 % | 0,03 % / 0,3 % | 3,1 % / 2,8 % |
| entrega de sobre (mediana / p95) | 1,1 % / 1,4 % | 0,2 % / 0,4 % | 12 % / 7,4 % |

Con carga, el desglose explica más del 98 % del tiempo de cada operación, así que **FR-001 se cumple**. Sin carga,
una entrega dura ~13 ms y ~1,5 ms quedan en `resto`: son huecos del bucle de eventos entre consultas, no una fase
sin medir. Antes de llegar ahí se instrumentó la que faltaba: la elección de los NPC al abrir el turno, que ahora es
`calculo`. La prueba de integración acota esa mediana al 15 % (decisión de 2026-11-02) y deja FR-001 para estas
mediciones.

## Qué dicen los datos

1. **La apertura es sobre todo cola de la partida: 86 % de la mediana con 10 y con 100 partidas.** Su tiempo de
   servicio (total − cola) es de ~330 ms de mediana con 10 partidas, pero la apertura que resuelve un partido y
   emite el torneo hace hasta **324 consultas**. Las aperturas de la misma partida se esperan unas a otras.
2. **El coste está en las aperturas que resuelven el partido, no en todas.** La mediana es de 14 consultas: es la
   segunda apertura de un partido ya resuelto, que solo responde `reproduccion`. La media es de ~96 y el p95 de
   324. Las pesadas son las que resuelven el partido y ejecutan `despuesDePartido`. Es decir, `emitirTorneo` con
   `vistaTorneo` por cada humano y, si toca, el cierre de la jornada y la apertura de la siguiente.
3. **Una consulta por sí sola es barata. Lo que crece es la espera por el pool.** Sin carga, una consulta cuesta
   ~1,3 ms (apertura: 18 ms / 14 consultas; entrega: 9 ms / 7). Con 10 partidas, ~7–9 ms. Con 100, **~48 ms** por
   consulta en la entrega (299 ms / 6,2). La fase `bd` incluye esperar una conexión libre del pool (25). Con
   aperturas de cientos de consultas a la vez, el pool se satura y frena a todas las partidas, también a sus drafts.
4. **La entrega de sobre se reparte entre cola (52 %) y bd (48 %).** Su cola son las elecciones anteriores de la
   misma mesa: cada una hace una consulta dentro del actor (`guardarElecciones`); la deduplicación y el `ack` van
   fuera. Con 100 partidas, 325 ms de cola ≈ 7 elecciones × ~46 ms, lo que cuesta una consulta con el pool saturado.
   Bajar el número total de consultas baja las dos fases.
5. **Cálculo, serialización y difusión no son el problema.** El cálculo de una apertura (~120–130 ms de mediana)
   va en un hilo de trabajo y no crece con la carga. Serialización y difusión suman menos de 6 ms en cualquier
   escenario.

## Diferencia entre entornos (R3)

**Provisional, a falta de T014.** Sin la medición de referencia no se puede comparar fase a fase. Con el método de
R3 (consultas × latencia de un viaje sin carga = parte que escala con la red), y con un viaje de ~1,3 ms con
Docker Desktop:

| Operación y escenario | Servicio (total − cola) | Red (consultas × 1,3 ms) | Cola atribuida a la red | Entorno | Servidor |
|-----------------------|------------------------:|-------------------------:|------------------------:|--------:|---------:|
| apertura, 10 partidas (mediana) | 331 ms | 18 ms (5,5 %) | 113 ms | **~131 ms (5 %)** | ~2262 ms (95 %) |
| apertura, 100 partidas (mediana) | 1891 ms | 18 ms (1 %) | 114 ms | **~132 ms (1 %)** | ~13 738 ms (99 %) |
| entrega, 10 partidas (mediana) | 56 ms | 8 ms (14 %) | 9 ms | **~17 ms (15 %)** | ~100 ms (85 %) |
| entrega, 100 partidas (mediana) | 294 ms | 8 ms (2,7 %) | 9 ms | **~17 ms (3 %)** | ~602 ms (97 %) |

En el entorno de referencia el viaje será más corto (sin el reenvío de puertos de Docker Desktop), así que la parte
del entorno solo puede bajar. **Conclusión provisional: el entorno explica menos del 15 % y, con carga, menos del
5 %. El resto es del servidor**: la cola de la partida y el volumen de consultas que satura el pool.

La medición del 2026-11-02 (100 partidas por Wi-Fi: mediana 25 s y p95 42 s) no tenía desglose y se hizo en otras
condiciones de red. Hoy, con 100 partidas: 14,0 s y 23,1 s. T014 dará la cifra en el entorno de referencia.

## Decisión

- **Hipótesis de R1: confirmada en lo esencial, corregida en dos puntos.**
  - Se confirma: la apertura está dominada por la cola de la partida y por el número de consultas, sobre todo las
    de `emitirTorneo`.
  - Se corrige (1): no todas las aperturas hacen 50–110 consultas. Las que resuelven un partido hacen cientos y las
    duplicadas, 14.
  - Se corrige (2): el entorno no es la causa principal. El viaje cuesta poco; lo que pesa es la contención del
    pool cuando muchas operaciones consultan a la vez.
- **Mecanismo de US2: el previsto (R4–R7), sin cambios.**
  - El grupo de aperturas (R4–R6, T017–T024) ataca el 86 % de cola.
  - `emitirTorneo` con los datos comunes cargados una vez (R7, T025–T026) ataca las cientos de consultas por
    apertura y, con ellas, la saturación del pool.
  - Las dos partes se mantienen. R7 gana prioridad respecto al plan: también beneficia a la entrega de sobres de
    todas las partidas.
- **Alcance de FR-012 (R9).**
  - **Candidato principal (T029): sí.** La transacción única del cierre de turno pasa de ~6 consultas a ~2
    (elección más una transacción). La entrega es 48 % bd y su cola es tiempo de consulta de las elecciones
    anteriores. Se hace después de US2 y se mide aparte. Con 100 partidas, la entrega está en p95 1,13 s, por
    encima del umbral de 1 s.
  - **Segundo candidato (T030): descartado.** El `ack` guarda la deduplicación después de que salga el sobre. No
    retrasa lo que mide `entrega_sobre_ms`: k6 y el total del servidor coinciden.
- **Orden:** US2 (grupo de aperturas, luego R7) → medir (T027) → US3 (T028, T029) → medir (T032).

## Tras US2

Pendiente (T027).

## Tras US3

Pendiente (T032).
