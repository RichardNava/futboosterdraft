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

Medido el 2026-11-03 en el entorno de referencia (equipo B, por cable; T032: [referencia-10-us3](mediciones/referencia-10-us3.md),
[referencia-100-us3](mediciones/referencia-100-us3.md)), con los mismos comandos que «Tras US2». Es una ejecución por
escenario, así que no se sabe cuánto varían los resultados entre ejecuciones.

### Entrega de sobre en el entorno de referencia (mediana / p95, ms)

| | R 10 tras US2 | R 10 tras US3 | R 100 tras US2 | R 100 tras US3 |
|---|---:|---:|---:|---:|
| cola | 54 / 86 | 54 / 75 | 595 / 932 | 648 / 1177 |
| bd | 51 / 180 | 48 / 163 | 406 / 721 | 376 / 1026 |
| total | 107 / 225 | 106 / 194 | 999 / 1666 | 1027 / 2422 |
| k6 `entrega_sobre_ms` | 109 / 200 | **107 / 171** | 932 / 1360 | **932 / 1760** |
| consultas, media (suma / n) | 9,7 | 9,5 | 9,7 | 9,5 |
| consultas, mediana / p95 (resumen) | 6,2 / 8,0 | 9,4 / 83,5 | 6,2 / 8,0 | 9,4 / 83,6 |
| entregas (n) | 240 | 240 | 2640 | 2400 |

- **Las consultas por entrega casi no bajan con esta carga: la media pasa de 9,7 a 9,5 (−2 %).** En el guion de k6
  (`tools/load/beta-100.js`), 9 de cada 10 partidas son de 8 humanos sin NPC; la décima es de 1 humano y 7 NPC. En
  un turno sin NPC, T029 no ahorra nada. Antes: deduplicación, elección, BEGIN, mesa, COMMIT y `ack` (6). Ahora: deduplicación, BEGIN,
  elecciones, mesa, COMMIT y `ack` (6). Solo ahorra en el turno 1 de cada ronda, porque el margen de animación ya
  no es otra escritura, y en las mesas con NPC, porque sus elecciones van en la misma inserción.
- **Medido en local con 1 humano y 3 NPC** (prueba temporal, ya borrada): cada entrega hace 6 consultas, antes 7
  u 8; la que cierra el draft hace 55, antes 56. Ahí el ahorro sí es de ~1 consulta por entrega.
- **La mediana y el p95 de consultas no sirven para comparar.** Son cuantiles estimados (t-digest, acumulados desde el
  arranque) de un número entero repartido en dos grupos muy separados. Uno son las entregas normales, con unas
  pocas consultas. El otro es una de cada 24, la que cierra el draft, con decenas. La mediana de 9,4 que da el
  resumen no coincide con ninguna entrega medida en local. Se compara con la media.
- **Con 10 partidas mejora un poco** (`entrega_sobre_ms` p95 200 → 171 ms). Con tan poco cambio en las consultas,
  no se puede atribuir a T029.
- **Con 100 partidas, el p95 empeora (1,36 s → 1,76 s) y la mediana no cambia (932 ms).** El empeoramiento está
  en la cola (p95 932 → 1177 ms) y en la fase bd (p95 721 → 1026 ms). Como T029 apenas cambia las consultas de la
  entrega en este escenario, lo más probable es que venga de la contención del pool que comparte con las
  aperturas: su fase bd sube de 9,1 a 11,0 s de mediana. No se ha comprobado; con una sola ejecución también puede
  ser variación entre ejecuciones.
- Con 100 partidas se cuentan 2400 entregas: 24 por partida, que es lo esperado (3 rondas × 8 turnos). En «Tras
  US2» se contaron 2640; esa diferencia no se ha investigado.

### Apertura en el entorno de referencia (mediana / p95, ms)

US3 no toca la apertura. Se anota porque comparte el pool con la entrega.

| Fase | R 10 tras US2 | R 10 tras US3 | R 100 tras US2 | R 100 tras US3 |
|------|--------------:|--------------:|---------------:|---------------:|
| cola | 464 / 900 | 409 / 728 | 2756 / 7204 | 2547 / 6113 |
| cálculo | 311 / 1153 | 272 / 1069 | 445 / 6855 | 393 / 5326 |
| bd | 908 / 1120 | 746 / 985 | 9143 / 13 635 | 11 049 / 13 066 |
| total | 1763 / 2152 | 1509 / 1860 | 15 378 / 17 079 | 14 315 / 16 068 |
| k6 `apertura_ms` | 1850 / 2460 | 1590 / 1990 | 16 050 / 17 580 | 14 750 / 16 600 |

### Umbrales en el entorno de referencia (k6)

| Umbral | 10 partidas | 100 partidas |
|--------|------------:|-------------:|
| `apertura_ms` p95 < 3 s | ✓ 1,99 s (tras US2 2,46 s) | ✗ 16,6 s (tras US2 17,58 s) |
| `entrega_sobre_ms` p95 < 1 s | ✓ 171 ms (tras US2 200 ms) | ✗ 1,76 s (tras US2 1,36 s) |
| resto (`errores_ws`, bloqueadas, terminadas, `final_ms`, `jornada_npc_ms`, `descanso_ms`) | ✓ | ✓ |

Con 100 partidas vuelven a agotar el tiempo de k6 9 peticiones `POST …/siguiente-jornada` (tras US2 fueron 10): tasa
de fallos 0,07 %, dentro del umbral < 1 %.

### Conclusión tras US3

- T029 está hecho y funciona como se diseñó: la entrega guarda todo en una transacción y con NPC ahorra ~1 consulta.
  Pero **en el escenario de carga, con mesas de humanos, apenas cambia las consultas, y no acerca la entrega al
  umbral de 1 s con 100 partidas**.
- El límite con 100 partidas sigue siendo el de «Tras US2»: la espera por una conexión del pool de PostgreSQL, que
  la entrega comparte con los grupos de aperturas (fase bd de la apertura: 11 s de mediana).
- Hay dos caminos posibles. Falta decidir cuál:
  1. **Entrega en una sola sentencia.** Juntar la inserción de elecciones y la actualización de la mesa en una
     consulta (`WITH … INSERT … UPDATE`), que es atómica sin BEGIN ni COMMIT. La entrega pasaría de 6 consultas a
     3, también en mesas solo de humanos.
  2. **Menos consultas en el grupo de aperturas** (~100 por grupo), que es lo que satura el pool. Antes conviene
     separar en el desglose las consultas de `despuesDePartido` de las de preparar y guardar, como ya proponía
     «Conclusión tras US2».

## Consultas del grupo de aperturas

Contado en local el 2026-11-03 (T039; método en [research.md](research.md) R13), con el test «reparto de las
consultas…» de `aperturas-grupo.test.ts`. El escenario es una liga de 8 humanos en la jornada 1: las 8 aperturas
llegan a la vez, se resuelven en un grupo, cierran la jornada y abren la siguiente. El grupo hace **115 consultas**,
lo mismo en los dos modos (en proceso y con hilos), en línea con las ~103–120 por apertura que da `beta-100.js`.

| Tramo | Consultas | Detalle (consultas · llamadas) |
|-------|----------:|--------------------------------|
| 1. Leer y preparar (fuera de la transacción) | 20 | `repoPartidos.obtener` 4 · 4; `repoEquipo.ultimaAlineacion` 8 · 8 y `repoDraft.plantillas` 8 · 8 (alineación vigente y plantilla de cada participante) |
| 2. Transacción del grupo | 63 | BEGIN y COMMIT 2; `fijarModalidad` por apertura (40): `repoPartidos.fijarModalidad` 16 · 8 (UPDATE y SELECT), `repoPartidas.fijarUltimaModalidad` 8 · 8, `repoPerfiles.fijarUltimaModalidad` 16 · 8 (SELECT del usuario y UPSERT); `aplicarEntreHumanos` por partido: `repoEquipo.dorsales` 8 · 8 (`dorsalesParaPartido`, uno por equipo), `repoPartidos.actualizar` 4 · 4 y `repoVisionados.crearPendientes` 4 · 4; `repoTorneo.guardar` 5 · 1 |
| 3. Cerrar la jornada (`despuesDePartido`) | 10 | `repoTorneo.guardar` 5 · 1; `repoTorneo.marcarJornada` 1 · 1; `emitirTorneo` 4 (`jornadas`, `resumenesDePartida`, `pendientesDeVarios`, `dorsalesDeVarios`) |
| 4. Abrir la jornada siguiente (`abrirSiguienteJornada`) | 22 | `repoTorneo.guardarJornada` 1 · 1; `repoTorneo.guardar` 5 · 1; `repoPartidos.crear` 4 · 4; `emitirTorneo` 4; avisos `jornada_abierta` 8 (un INSERT en `avisos` por humano, `avisarHumanos`) |
| **Total** | **115** | |

Lo que más pesa:

- **`fijarModalidad`, 40 consultas (35 %).** Son 5 por apertura: marcar la modalidad en el partido y leerla de
  vuelta, guardarla como última del participante y, para un registrado, leer si es invitado y guardar su perfil.
- **Tres lecturas por participante, 24 (21 %).** `ultimaAlineacion` y `plantillas` al preparar, y `dorsales`
  dentro de la transacción. Para los dorsales ya hay una versión por lotes (`dorsalesDeVarios`).
- **`repoTorneo.guardar` tres veces, 15 (13 %).** Son 5 consultas cada vez (torneo, y borrar e insertar bajas y
  amarillas): en el grupo, al cerrar la jornada y al abrir la siguiente.
- **Una consulta por elemento al abrir la jornada:** 8 avisos y 4 partidos (12, 10 %). Los 4 pendientes de visionado (uno por partido) son de la transacción del grupo (corregido al hacer T046).
- `emitirTorneo` dos veces, 8 (7 %).

**Decisión (T040):** recortar en este orden, bajando cada vez la cifra del test: `fijarModalidad` por lotes (T043), guardar el torneo una vez por comando (T044), leer alineaciones, plantillas y dorsales de todos a la vez (T045) e insertar en una consulta avisos, partidos y pendientes al abrir la jornada (T046). Estimación: de 115 a ~50 consultas por grupo.

### Tras los recortes (T043–T046)

Mismo test y mismo escenario: **de 115 a 39 consultas por grupo (−66 %)**, en los dos modos.

| Recorte | Consultas del grupo |
|---------|--------------------:|
| Antes (T039) | 115 |
| T043: `fijarModalidades`, una consulta por tabla para todo el grupo (40 → 3) | 78 |
| T044: no reescribir bajas ni amarillas si no han cambiado, al cerrar y al abrir la jornada (15 → 7) | 70 |
| T045: alineaciones, plantillas y dorsales de todos de una vez (24 → 3) | 49 |
| T046: avisos y partidos de la jornada siguiente en una consulta cada uno (12 → 2) | 39 |

- T044 no hace lo que decía la decisión, «guardar el torneo una vez por comando». Juntar los tres guardados
  cambiaría lo que queda escrito si el comando falla a mitad: el cierre y la apertura de la jornada se guardan por
  separado, y entre medias se calculan los partidos NPC. Se recorta lo que repetían: bajas y amarillas.
- T046 no toca los pendientes de visionado: son de la transacción del grupo, no de abrir la jornada.
- Quedan 39 (sacado del test en modo hilos):
  - leer los partidos, 4;
  - precarga, 3 (`ultimasAlineaciones`, `plantillas`, `dorsalesDeVarios`);
  - transacción del grupo, 18: BEGIN y COMMIT 2, modalidades 3, `repoPartidos.actualizar` 4,
    `crearPendientes` 4 y `repoTorneo.guardar` 5;
  - cierre de la jornada, 6: guardar el torneo 1, `marcarJornada` 1 y `emitirTorneo` 4;
  - jornada siguiente, 8: `guardarJornada` 1, guardar el torneo 1, partidos 1, `emitirTorneo` 4 y avisos 1.
- **El total no es fijo:** puede salir 1 o 2 menos. El guardado del torneo en el grupo solo inserta bajas o
  amarillas si los partidos las producen, y los resultados dependen de la semilla aleatoria de la partida. En una
  ejecución salió 38. Lo mismo valía para las 115 de partida. El test comprueba «como mucho 39».
- Medido con carga en «Tras recortar el grupo» (T042).

## Tras recortar el grupo

Medido el 2026-11-03 en el entorno de referencia (equipo B, por cable; T042: [referencia-10-grupo](mediciones/referencia-10-grupo.md),
[referencia-100-grupo](mediciones/referencia-100-grupo.md)), con los mismos comandos que «Tras US3». Es una ejecución
por escenario.

### Apertura en el entorno de referencia (mediana / p95, ms)

| Fase | R 10 tras US3 | R 10 tras recortar | R 100 tras US3 | R 100 tras recortar |
|------|--------------:|-------------------:|---------------:|--------------------:|
| cola | 409 / 728 | 442 / 677 | 2547 / 6113 | 4766 / 6575 |
| cálculo | 272 / 1069 | 313 / 843 | 393 / 5326 | **3966 / 6480** |
| bd | 746 / 985 | **416 / 624** | 11 049 / 13 066 | **2362 / 8838** |
| resto | 33 / 51 | 58 / 87 | 19 / 48 | 54 / 82 |
| total | 1509 / 1860 | 1312 / 1634 | 14 315 / 16 068 | 12 136 / 13 840 |
| k6 `apertura_ms` | 1590 / 1990 | **1400 / 1870** | 14 750 / 16 600 | **12 250 / 14 430** |
| consultas, media (suma / n) | 87,1 | 39,6 | 94,2 | 41,0 |

### Entrega de sobre en el entorno de referencia (mediana / p95, ms)

| | R 10 tras US3 | R 10 tras recortar | R 100 tras US3 | R 100 tras recortar |
|---|---:|---:|---:|---:|
| cola | 54 / 75 | 44 / 71 | 648 / 1177 | 586 / 1274 |
| bd | 48 / 163 | 39 / 197 | 376 / 1026 | 306 / 691 |
| total | 106 / 194 | 86 / 224 | 1027 / 2422 | 894 / 2236 |
| k6 `entrega_sobre_ms` | 107 / 171 | **88 / 163** | 932 / 1760 | **814 / 1670** |
| consultas, media (suma / n) | 9,5 | 9,1 | 9,5 | 9,1 |

### Umbrales en el entorno de referencia (k6)

| Umbral | 10 partidas | 100 partidas |
|--------|------------:|-------------:|
| `apertura_ms` p95 < 3 s | ✓ 1,87 s (tras US3 1,99 s) | ✗ 14,43 s (tras US3 16,6 s) |
| `entrega_sobre_ms` p95 < 1 s | ✓ 163 ms (tras US3 171 ms) | ✗ 1,67 s (tras US3 1,76 s) |
| `final_ms` p95 < 3 s | ✓ 541 ms | ✗ 3,63 s (tras US3 2,15 s) |
| resto (`errores_ws`, bloqueadas, terminadas, `jornada_npc_ms`, `descanso_ms`, fallos HTTP) | ✓ | ✓ |

Con 100 partidas agotan el tiempo de k6 10 peticiones `POST …/siguiente-jornada` (tras US3 fueron 9): tasa de fallos
0,08 %, dentro del umbral < 1 %.

### Conclusión tras recortar el grupo

- **Las consultas bajan con carga lo mismo que en el test:** de ~90 a ~40 por apertura (−55 %), en línea con las 39
  por grupo del test. La entrega baja de 9,5 a 9,1 de media.
- **La fase bd de la apertura cae mucho con 100 partidas: la mediana pasa de 11,0 s a 2,4 s.** El recorte quita la
  espera por el pool que señalaban «Tras US2» y «Tras US3».
- **Pero la apertura solo mejora un 15 % (k6 p95 16,6 → 14,4 s), porque el límite se ha movido al cálculo:** su
  mediana sube de 0,4 s a 4,0 s y la cola de 2,5 s a 4,8 s. La fase cálculo incluye la espera de un hilo libre de
  simulación (`GrupoHilos`, research R2). Antes la espera por el pool espaciaba las simulaciones; ahora llegan
  juntas a los hilos. Es la lectura más probable de las cifras; no se ha medido el uso de CPU del equipo B.
- **La entrega mejora poco y sigue sin cumplir con 100 partidas** (p95 1,76 → 1,67 s). Su fase bd baja (p95
  1026 → 691 ms), pero la cola no (p95 1177 → 1274 ms); no se ha investigado por qué.
- **`final_ms` deja de cumplir con 100 partidas** (p95 2,15 → 3,63 s), aunque su mediana baja de 959 a 204 ms. Lo
  mismo pasa con `jornada_npc_ms` (mediana 1,89 → 0,23 s; p95 4,48 → 5,1 s, aún < 10 s). Las dos simulan partidos,
  así que también esperan hilos; no se ha comprobado.
- Con 10 partidas mejora todo un poco y se cumplen todos los umbrales, como antes.
- Lo siguiente, si se sigue con 100 partidas, es saber cuánta CPU queda libre en el equipo B durante la prueba: si
  está al 100 %, el límite es el equipo y no el código; si no, se puede probar con más hilos (`HILOS_SIMULACION`).
  Medido en «Uso de CPU con 100 partidas».

### Uso de CPU con 100 partidas

Se repitió la prueba de 100 partidas con el mismo código, apuntando el uso de CPU cada ~3 s
([referencia-100-cpu](mediciones/referencia-100-cpu.md)). El equipo B tiene 8 núcleos lógicos; por defecto el servidor
usa 7 hilos de simulación.

| Uso de CPU (media de 12:30:08 a 12:33:28, 70 muestras, la parte con carga) | |
|---|---:|
| total del equipo | 94 % (57 de 70 muestras ≥ 90 %) |
| `node` (servidor e hilos de simulación) | 5,6 núcleos |
| `postgres` | 0,6 núcleos |
| `k6` | 0,6 núcleos |

| k6, 100 partidas | Tras recortar | Repetición |
|---|---:|---:|
| `apertura_ms` mediana / p95 | 12,25 / 14,43 s | 12,58 / 15,93 s |
| `entrega_sobre_ms` mediana / p95 | 814 ms / 1,67 s | 863 ms / 1,49 s |
| `final_ms` p95 | 3,63 s | 3,44 s |
| consultas por apertura, media | 41,0 | 41,0 |

- **El equipo B está saturado de CPU durante la prueba, y casi toda la usa el servidor.** Más hilos de simulación no
  ayudarían: no queda CPU libre para ellos.
- Sacar PostgreSQL y k6 a otras máquinas (T036) liberaría ~1,2 núcleos, un 20 % más para el servidor. No basta para
  bajar la apertura de ~15 s a menos de 3 s si el cálculo escala con la CPU; eso es una suposición, no se ha medido.
- **Con 100 partidas en una máquina de 8 núcleos, el límite es el coste de simular los partidos**, no la base de datos.
  Para cumplir los umbrales hace falta más CPU o simular más barato.
- **De una ejecución a otra, el p95 varía un 10 %** (apertura 14,4 → 15,9 s; entrega 1,67 → 1,49 s). Las diferencias
  del p95 de la entrega entre «Tras US3» y «Tras recortar el grupo» (1,76 → 1,67 s) están dentro de esa variación.

