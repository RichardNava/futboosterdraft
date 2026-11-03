# Diagnóstico: latencia de apertura y de entrega de sobres

**Spec**: [spec.md](spec.md) (FR-004, SC-004) | **Método**: [research.md R2 y R3](research.md) |
**Mediciones**: [mediciones/](mediciones/)

**Estado**: completo. Están la medición con Docker Desktop y Wi-Fi (T015) y la del entorno de referencia (T014), con
1, 10 y 100 partidas en cada uno.

## Entornos y escenarios

| Entorno | Servidor | PostgreSQL | k6 | Mediciones |
|---------|----------|------------|----|------------|
| Docker Desktop y Wi-Fi (T015) | Windows, Node, hilos por defecto | 16 en `docker compose` (Docker Desktop) | misma máquina (equipo por Wi-Fi) | [docker-1](mediciones/docker-1.md), [docker-10](mediciones/docker-10.md), [docker-100](mediciones/docker-100.md) |
| Referencia (T014) | Windows, Node (`tsx`, sin watch), hilos por defecto, sin `SMTP_URL` | 16 nativo en Windows | misma máquina (equipo por cable), k6 2.3 | [referencia-1](mediciones/referencia-1.md), [referencia-10](mediciones/referencia-10.md), [referencia-100](mediciones/referencia-100.md) |

Como en cada entorno todo corre en la misma máquina, el tráfico va por loopback: ni el Wi-Fi ni el cable intervienen.
Lo que añade Docker Desktop es el reenvío de puertos y su máquina virtual, que compite por CPU y memoria con el
servidor y con k6. El servidor se reinició entre escenarios (los cuantiles se acumulan desde el arranque).

**Los entornos están en equipos distintos.** La diferencia entre ellos mezcla Docker Desktop y el hardware; no se
pueden separar con estas mediciones (ver «Diferencia entre entornos»).

**Conexiones del arranque con 100 partidas.** Con los 730 WebSocket abiertos a la vez, Windows rechaza las conexiones
que no caben en la cola de `listen` del puerto 3000 («conexión denegada» en 127.0.0.1:3000). Una partida con un
humano sin conectar no empieza el draft y vence a los 20 min. La primera `docker-100` (219 `errores_ws`, 53 partidas
terminadas) y un primer intento de referencia (197 rechazos, 34 terminadas) se descartaron por eso. Las de 100
partidas de las tablas usan el guion con un turno fijo de conexión por VU (`(__VU - 1) * 4` ms, las 730 en ~3 s):
0 `errores_ws`, 0 bloqueadas y 100 partidas terminadas en los dos entornos. Los 45 s de `entrega_sobre_ms` de las
carreras descartadas eran turnos que vencían por humanos sin conectar; con las conexiones limpias desaparecen. Con 1 y
10 partidas no hubo rechazos y no se repitieron.

## Desglose por fases (mediana / p95, ms)

D = Docker Desktop y Wi-Fi; R = referencia.

### Apertura (`POST /api/partidos/:id/abrir`)

| Fase | D 1 | R 1 | D 10 | R 10 | D 100 | R 100 |
|------|----:|----:|-----:|-----:|------:|------:|
| cola | 0 / 38 | 0 / 22 | **2062 / 3848** | **1578 / 2831** | **19 351 / 35 206** | **14 474 / 26 531** |
| cálculo | 59 / 102 | 55 / 84 | 120 / 290 | 89 / 254 | 123 / 259 | 97 / 224 |
| bd | 18 / 24 | 6,8 / 21 | 94 / 1115 | 59 / 745 | 828 / 12 495 | 560 / 9505 |
| serialización | 0,3 / 0,5 | 0,3 / 0,4 | 0,5 / 2,4 | 0,4 / 2,2 | 0,4 / 2,5 | 0,4 / 2,1 |
| difusión | 0,2 / 0,5 | 0,2 / 0,3 | 0,3 / 2,8 | 0,3 / 3,0 | 0,3 / 2,8 | 0,3 / 2,8 |
| resto | 2,5 / 4,6 | 1,8 / 2,5 | 4,1 / 66 | 3,0 / 53 | 3,8 / 66 | 2,4 / 52 |
| **total** | **80 / 166** | **66 / 128** | **2393 / 3977** | **1797 / 2917** | **22 219 / 35 882** | **16 603 / 27 066** |
| consultas (media) | 14 / 14 (14) | 14 / 14 (14) | 14 / 324 (96) | 14 / 316 (95) | 14 / 316 (95) | 14 / 316 (95) |
| k6 `apertura_ms` | 84 / 133 | 68 / 105 | 2430 / 4000 | 1820 / 2930 | 22 340 / 35 990 | 16 690 / 27 170 |

### Entrega de sobre (elección que cierra el turno)

| Fase | D 1 | R 1 | D 10 | R 10 | D 100 | R 100 |
|------|----:|----:|-----:|-----:|------:|------:|
| cola | 0 / 0 | 0 / 0 | 61 / 102 | 52 / 98 | 642 / 1052 | 548 / 887 |
| cálculo | 2,0 / 121 | 2,4 / 135 | 0,2 / 2,7 | 0,1 / 2,0 | 0,0 / 1,9 | 0,1 / 1,4 |
| bd | 9,0 / 52 | 3,9 / 72 | 54 / 101 | 48 / 115 | 416 / 1227 | 371 / 996 |
| serialización | 0,1 / 0,4 | 0,1 / 0,6 | 0,4 / 1,4 | 0,4 / 1,6 | 0,4 / 0,9 | 0,4 / 0,7 |
| difusión | 0,2 / 0,6 | 0,2 / 0,6 | 0,9 / 1,7 | 0,9 / 3,4 | 0,8 / 1,4 | 0,7 / 1,1 |
| resto | 1,6 / 14 | 1,4 / 3,2 | 1,3 / 2,8 | 1,2 / 3,2 | 1,0 / 3,1 | 0,9 / 2,7 |
| **total** | **13 / 186** | **8,3 / 207** | **117 / 205** | **106 / 250** | **1042 / 3134** | **910 / 2358** |
| consultas | 7 / 61 | 7 / 66 | 6 / 8 | 6 / 8 | 6 / 8 | 6 / 8 |
| k6 `entrega_sobre_ms` | 12 / 17 | 8 / 16 | 115 / 188 | 115 / 263 | 963 / 1780 | 840 / 1560 |

En la mediana, el total del servidor y lo que mide k6 coinciden: el tiempo de la operación está dentro del servidor.

Con 1 partida (24 entregas), el p95 de cálculo y de consultas de la entrega es casi la peor muestra. Probablemente
es el turno que termina el draft (`terminarDraft`), que ocurre una sola vez. No se ha comprobado.

### Umbrales con 100 partidas (k6)

| Umbral | Docker Desktop y Wi-Fi | Referencia |
|--------|-----------------------:|-----------:|
| `apertura_ms` p95 < 3 s | ✗ 35,99 s | ✗ 27,17 s |
| `entrega_sobre_ms` p95 < 1 s | ✗ 1,78 s | ✗ 1,56 s |
| resto (`errores_ws`, bloqueadas, terminadas, `final_ms`, `jornada_npc_ms`, `descanso_ms`) | ✓ | ✓ |

Los dos umbrales fallan también en el entorno de referencia.

## Cobertura del desglose (FR-001, SC-004)

`resto / total` es la parte que no se atribuye a ninguna fase (mediana / p95).

| Operación | D 10 | D 100 | R 100 | D 1 (sin carga) | R 1 (sin carga) |
|-----------|-----:|------:|------:|----------------:|----------------:|
| apertura | 0,2 % / 1,7 % | 0,02 % / 0,2 % | 0,01 % / 0,2 % | 3,1 % / 2,8 % | 2,7 % / 1,9 % |
| entrega de sobre | 1,1 % / 1,4 % | 0,1 % / 0,1 % | 0,1 % / 0,1 % | 12 % / 7,4 % | 17 % / 1,5 % |

Con carga, el desglose explica más del 98 % del tiempo de cada operación, así que **FR-001 se cumple**. Sin carga,
una entrega dura ~8–13 ms y ~1,5 ms quedan en `resto`: son huecos del bucle de eventos entre consultas, no una fase
sin medir. Antes de llegar ahí se instrumentó la que faltaba: la elección de los NPC al abrir el turno, que ahora es
`calculo`. La prueba de integración acota esa mediana al 15 % (decisión de 2026-11-02) y deja FR-001 para estas
mediciones.

## Qué dicen los datos

1. **La apertura es sobre todo cola de la partida: 86–88 % de la mediana con 10 y con 100 partidas, en los dos
   entornos.** Su tiempo de servicio (total − cola) es de ~220–330 ms de mediana con 10 partidas, pero la apertura
   que resuelve un partido y emite el torneo hace hasta **324 consultas**. Las aperturas de la misma partida se
   esperan unas a otras.
2. **El coste está en las aperturas que resuelven el partido, no en todas.** La mediana es de 14 consultas: es la
   segunda apertura de un partido ya resuelto, que solo responde `reproduccion`. La media es de ~95 y el p95 de
   316–324. Las pesadas son las que resuelven el partido y ejecutan `despuesDePartido`. Es decir, `emitirTorneo` con
   `vistaTorneo` por cada humano y, si toca, el cierre de la jornada y la apertura de la siguiente.
3. **Una consulta por sí sola es barata. Lo que crece es la espera por el pool.** Sin carga, una consulta cuesta
   ~1,3 ms con Docker Desktop y ~0,5 ms en referencia (apertura: 18 y 6,8 ms / 14 consultas). Con 10 partidas,
   ~7–9 ms. Con 100, **~60–67 ms** por consulta en la entrega (371–416 ms / 6,2). La fase `bd` incluye esperar una
   conexión libre del pool (25). Con aperturas de cientos de consultas a la vez, el pool se satura y frena a todas
   las partidas, también a sus drafts.
4. **La entrega de sobre se reparte entre cola y bd: 52 % / 48 % con 10 partidas, 60 % / 40 % con 100.** Su cola
   son las elecciones anteriores de la misma mesa: cada una hace una consulta dentro del actor (`guardarElecciones`);
   la deduplicación y el `ack` van fuera. Con 100 partidas, 642 ms de cola ≈ 7 elecciones × ~93 ms (Docker) y
   548 ms ≈ 7 × ~80 ms (referencia), lo que cuesta una consulta con el pool saturado. Bajar el número total de
   consultas baja las dos fases.
5. **Serialización y difusión no son el problema.** Suman menos de 6 ms en cualquier escenario. El cálculo de una
   apertura (~90–125 ms de mediana) va en un hilo de trabajo y apenas crece con la carga.

## Diferencia entre entornos (R3)

Con la misma carga en los dos entornos (100 partidas: 10 220 aperturas, 2400 entregas y ~971 000 consultas en cada
uno), la diferencia se mide directamente. Diferencia = Docker − referencia, en % del tiempo con Docker:

| Operación y escenario | Mediana | p95 |
|-----------------------|--------:|----:|
| apertura, 1 partida | 14 ms (18 %) | 38 ms (23 %) |
| apertura, 10 partidas | 596 ms (25 %) | 1060 ms (27 %) |
| apertura, 100 partidas | 5616 ms (25 %) | 8816 ms (25 %) |
| entrega, 1 partida | 4,7 ms (36 %) | −21 ms (referencia peor) |
| entrega, 10 partidas | 11 ms (9 %) | −45 ms (referencia peor) |
| entrega, 100 partidas | 132 ms (13 %) | 776 ms (25 %) |

La estimación provisional de R3 (consultas × latencia de un viaje) daba menos del 5 % con carga. **Con carga, la
diferencia real es de ~25 % en la apertura.** No sale del viaje a la BD: el `cálculo`, que es CPU pura en un hilo
de trabajo y no toca la BD, también es más lento en el entorno de Docker (+7 % con 1 partida, +35 % con 10, +27 % con
100). Lo que pesa es la CPU disponible: la máquina virtual de Docker Desktop compite con el servidor y con k6, y el
equipo es otro. Las dos cosas no se pueden separar con estas mediciones.

**Conclusión: el entorno explica ~25 % con carga; el servidor, ~75 % o más.** En el entorno de referencia la
apertura con 100 partidas sigue en 16,6 s de mediana, con un 87 % de cola, y los dos umbrales fallan. La causa es la
cola de la partida y el volumen de consultas que satura el pool, no el entorno.

La medición del 2026-11-02 (100 partidas por Wi-Fi, sin desglose: mediana 25 s y p95 42 s) encaja con la de
`docker-100` repetida (k6: 22,3 s y 36,0 s). En el entorno de referencia: 16,7 s y 27,2 s.

## Decisión

- **Hipótesis de R1: confirmada en lo esencial, corregida en dos puntos.**
  - Se confirma: la apertura está dominada por la cola de la partida y por el número de consultas, sobre todo las
    de `emitirTorneo`.
  - Se corrige (1): no todas las aperturas hacen 50–110 consultas. Las que resuelven un partido hacen cientos y las
    duplicadas, 14.
  - Se corrige (2): el entorno no es la causa principal (~25 % con carga, sobre todo CPU, no el viaje a la BD). Lo
    que pesa es la contención del pool cuando muchas operaciones consultan a la vez.
- **Mecanismo de US2: el previsto (R4–R7), sin cambios.**
  - El grupo de aperturas (R4–R6, T017–T024) ataca el 86–88 % de cola.
  - `emitirTorneo` con los datos comunes cargados una vez (R7, T025–T026) ataca las cientos de consultas por
    apertura y, con ellas, la saturación del pool.
  - Las dos partes se mantienen. R7 gana prioridad respecto al plan: también beneficia a la entrega de sobres de
    todas las partidas.
- **Alcance de FR-012 (R9).**
  - **Candidato principal (T029): sí.** La transacción única del cierre de turno pasa de ~6 consultas a ~2
    (elección más una transacción). La entrega es 40–48 % bd y su cola es tiempo de consulta de las elecciones
    anteriores. Se hace después de US2 y se mide aparte. Con 100 partidas, la entrega está en p95 1,56 s
    (referencia) y 1,78 s (Docker), por encima del umbral de 1 s.
  - **Segundo candidato (T030): descartado.** El `ack` guarda la deduplicación después de que salga el sobre. No
    retrasa lo que mide `entrega_sobre_ms`: k6 y el total del servidor coinciden en la mediana.
- **Medir en el entorno de referencia (T027, T032)** con el guion de turno fijo de conexión, para que las cifras
  de antes y después sean comparables.
- **Orden:** US2 (grupo de aperturas, luego R7) → medir (T027) → US3 (T028, T029) → medir (T032).

## Tras US2

Medido el 2026-11-03 en el entorno de referencia (T027: [referencia-10-us2](mediciones/referencia-10-us2.md),
[referencia-100-us2](mediciones/referencia-100-us2.md)) y con Docker Desktop
([docker-10-us2](mediciones/docker-10-us2.md)), en las mismas condiciones que las mediciones de antes.

**Cómo leer las fases tras US2.** Cada apertura que se une a un grupo cuenta como suyo el trabajo entero del grupo
(`compartido` en `desglose.ts`): el cálculo en paralelo de sus partidos, su transacción y lo que sigue
(`despuesDePartido`). Por eso cálculo, bd y consultas suben por apertura sin que el servidor haga más trabajo, y **las
consultas por apertura no son comparables con las de antes** (antes, mediana 14 y p95 316; ahora ~103 y ~116 en todos
los escenarios: son las del grupo, no las de cada apertura). La cola sí es comparable: es la espera hasta que empieza
el comando que resuelve la apertura.

### Apertura en el entorno de referencia (mediana / p95, ms)

| Fase | R 10 antes | R 10 tras US2 | R 100 antes | R 100 tras US2 |
|------|-----------:|--------------:|------------:|---------------:|
| cola | 1578 / 2831 | **464 / 900** | 14 474 / 26 531 | **2756 / 7204** |
| cálculo | 89 / 254 | 311 / 1153 | 97 / 224 | 445 / 6855 |
| bd | 59 / 745 | 908 / 1120 | 560 / 9505 | **9143 / 13 635** |
| serialización | 0,4 / 2,2 | 0,1 / 2,5 | 0,4 / 2,1 | 0,1 / 2,5 |
| difusión | 0,3 / 3,0 | 0,6 / 3,7 | 0,3 / 2,8 | 0,5 / 3,5 |
| resto | 3,0 / 53 | 41 / 76 | 2,4 / 52 | 25 / 55 |
| **total** | **1797 / 2917** | **1763 / 2152** | **16 603 / 27 066** | **15 378 / 17 079** |
| k6 `apertura_ms` | 1820 / 2930 | **1850 / 2460** | 16 690 / 27 170 | **16 050 / 17 580** |

- **10 partidas: `apertura_ms` p95 2,46 s < 3 s (SC-002 se cumple).** Antes estaba justo en el límite (2,93 s).
  El p95 baja un 16 % y la mediana no cambia (+2 %).
- **100 partidas: el p95 baja un 35 % (27,2 s → 17,6 s), pero la mediana apenas se mueve (−4 %) y el umbral de 3 s
  sigue muy lejos.**
- **El cuello de botella ha pasado de la cola a la base de datos.** La cola baja un 71–81 % en la mediana, pero lo
  que se ahorra reaparece en la fase bd del grupo: 9,1 s de mediana con 100 partidas. Es la espera por una conexión
  libre del pool (25): cien partidas con grupos que hacen ~100 consultas cada uno. Antes de US2 esa espera estaba
  repartida entre las aperturas en cola. Con 10 partidas pasa lo mismo a menor escala (bd 908 ms de mediana).
- `resto` / total: 2,3 % / 3,5 % con 10 partidas y 0,2 % / 0,3 % con 100. FR-001 se sigue cumpliendo.

### Entrega de sobre en el entorno de referencia (mediana / p95, ms)

| | R 10 antes | R 10 tras US2 | R 100 antes | R 100 tras US2 |
|---|---:|---:|---:|---:|
| cola | 52 / 98 | 54 / 86 | 548 / 887 | 595 / 932 |
| bd | 48 / 115 | 51 / 180 | 371 / 996 | 406 / 721 |
| total | 106 / 250 | 107 / 225 | 910 / 2358 | 999 / 1666 |
| k6 `entrega_sobre_ms` | 115 / 263 | 109 / 200 | 840 / 1560 | 932 / 1360 |
| consultas (mediana / p95) | 6 / 8 | 6,2 / 8,0 | 6 / 8 | 6,2 / 8,0 |

US2 no toca el draft: la entrega queda igual con 10 partidas. Con 100, el p95 mejora (1,56 s → 1,36 s) y la mediana
empeora un poco (840 → 932 ms); sigue por encima de 1 s. La entrega depende de la contención del pool, que comparte
con las aperturas. Su número de consultas es el mismo; eso lo aborda US3 (T029).

### Umbrales en el entorno de referencia (k6)

| Umbral | 10 partidas | 100 partidas |
|--------|------------:|-------------:|
| `apertura_ms` p95 < 3 s | ✓ 2,46 s | ✗ 17,58 s (antes 27,17 s) |
| `entrega_sobre_ms` p95 < 1 s | ✓ 200 ms | ✗ 1,36 s (antes 1,56 s) |
| resto (`errores_ws`, bloqueadas, terminadas, `final_ms`, `jornada_npc_ms`, `descanso_ms`) | ✓ | ✓ |

**Observación nueva con 100 partidas:** 10 peticiones `POST …/siguiente-jornada` agotaron el tiempo de k6 hacia el
segundo 115 (tasa de fallos 0,08 %, dentro del umbral < 1 %). En las mediciones de antes no aparecían. Probablemente
esperan en la cola de su partida tras un grupo largo, pero no se ha comprobado.

### Conclusión tras US2

- US2 cumple lo que pedía en el entorno de referencia con 10 partidas (SC-002) y elimina la mayor parte de la cola.
- Con 100 partidas el límite ya no es la cola, sino **el pool de PostgreSQL**. El siguiente paso con más efecto es
  hacer menos consultas, tanto en la entrega del sobre (US3, T029) como en el comando del grupo. Antes de cambiar nada
  más, convendría saber qué parte de las ~100 consultas de un grupo son de `despuesDePartido` (cierre de jornada y
  apertura de la siguiente) y cuáles de preparar alineaciones y guardar. El desglose actual no lo separa.

### Apertura con 10 partidas (Docker Desktop; mediana / p95, ms)

| Fase | Antes (D 10) | Tras US2 |
|------|-------------:|---------:|
| cola | 2062 / 3848 | **429 / 648** |
| cálculo | 120 / 290 | 257 / 1031 |
| bd | 94 / 1115 | 912 / 1122 |
| serialización | 0,5 / 2,4 | 0,1 / 2,6 |
| difusión | 0,3 / 2,8 | 0,8 / 2,9 |
| resto | 4,1 / 66 | 41 / 62 |
| **total** | **2393 / 3977** | **1686 / 2631** |
| k6 `apertura_ms` | 2430 / 4000 | **1720 / 2720** |

- **`apertura_ms` p95 pasa de 4,0 s a 2,72 s: por debajo de 3 s (SC-002) en este entorno.** Mediana −29 %, p95 −32 %.
- La cola baja un 79 % en la mediana: las aperturas de una partida ya no se esperan una a una.
- Cálculo y bd suben por apertura porque ahora **cada apertura de un grupo cuenta el trabajo entero del grupo**
  (`compartido` en `desglose.ts`): el cálculo en paralelo de varios partidos y su transacción. No es trabajo de más,
  sino el mismo repartido entre quienes lo esperan. Por lo mismo, **las consultas por apertura no son comparables con
  las de antes**: mediana 102, p95 121, media 94 (antes 14 / 324 / 96). Cada una suma las del grupo, así que el total
  real de consultas es menor que la suma, pero no se puede separar con estas métricas.
- `resto` / total: 2,5 % en la mediana y 2,3 % en el p95 (FR-001 se sigue cumpliendo). Sube a ~41 ms porque las
  aperturas que se unen a un grupo cuentan como `resto` lo que pasa entre el commit y su respuesta.

### Entrega de sobre con 10 partidas (Docker Desktop)

Sin cambios apreciables, como se esperaba (US2 no toca el draft): total 120 / 230 ms (antes 117 / 205), k6
`entrega_sobre_ms` 120 / 215 ms (antes 115 / 188), ~6,2 consultas de mediana (antes 6). Esto lo aborda US3 (T029).

### Umbrales (k6, 10 partidas, Docker Desktop)

Todos en verde: `apertura_ms` p95 2,72 s < 3 s, `entrega_sobre_ms` p95 215 ms < 1 s, 0 `errores_ws`, 0 partidas
bloqueadas, 10 terminadas.

**Pendiente:** repetir en el entorno de referencia (`referencia-10`) para cerrar T027, y con 100 partidas para ver el
efecto sobre la saturación del pool, que es donde R7 debería notarse más.

## Tras US3

Pendiente (T032).
