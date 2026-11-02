# Resultado de prueba de carga — 10 partidas (entorno de referencia)

Entorno de referencia (T014): servidor, PostgreSQL 16 nativo en Windows y k6 2.3 en el mismo equipo (por cable), sin
Docker Desktop. Servidor arrancado sin modo watch (`tsx src/main.ts`), sin `SMTP_URL` y reiniciado antes del escenario.
Medido el 2026-11-02.

## Comando ejecutado

```bash
k6 run -e PARTIDAS=10 -e APERTURA_MAX_S=0 -e METRICAS_URL=http://localhost:3000/metrics tools/load/beta-100.js
```

## Advertencia

```text
WARN[0000] k6/experimental/websockets is deprecated and will be removed in a future release. Please use k6/websockets instead.
```

## Ejecución

```text
     execution: local
        script: tools/load/beta-100.js
        output: -

     scenarios: (100.00%) 1 scenario, 73 max VUs, 41m0s max duration (incl. graceful stop):
              * humanos: 1 iterations for each of 73 VUs (maxDuration: 40m0s, gracefulStop: 1m0s)
```

## Desglose por fases

```text
INFO[0044] Desglose por fases (http://localhost:3000/metrics):
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="cola"} 24.18870000000012
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="cola"} 69.09923999999509
operacion_fase_ms_sum{operacion="eleccion",fase="cola"} 41411.9196
operacion_fase_ms_count{operacion="eleccion",fase="cola"} 1512
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="calculo"} 0
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="calculo"} 0
operacion_fase_ms_sum{operacion="eleccion",fase="calculo"} 0
operacion_fase_ms_count{operacion="eleccion",fase="calculo"} 1512
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="bd"} 24.407158974359252
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="bd"} 51.04878999999708
operacion_fase_ms_sum{operacion="eleccion",fase="bd"} 42601.52600000007
operacion_fase_ms_count{operacion="eleccion",fase="bd"} 1512
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="serializacion"} 0.038809285714619814
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="serializacion"} 0.06259071428375178
operacion_fase_ms_sum{operacion="eleccion",fase="serializacion"} 70.55860000020039
operacion_fase_ms_count{operacion="eleccion",fase="serializacion"} 1512
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="difusion"} 0.2400083333316919
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="difusion"} 0.3761999999999532
operacion_fase_ms_sum{operacion="eleccion",fase="difusion"} 399.25490000043646
operacion_fase_ms_count{operacion="eleccion",fase="difusion"} 1512
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="resto"} 0.48797529761490993
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="resto"} 0.9725566666602389
operacion_fase_ms_sum{operacion="eleccion",fase="resto"} 922.6381999993682
operacion_fase_ms_count{operacion="eleccion",fase="resto"} 1512
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="total"} 50.79663227124033
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="total"} 112.4044533333326
operacion_fase_ms_sum{operacion="eleccion",fase="total"} 85405.8973000001
operacion_fase_ms_count{operacion="eleccion",fase="total"} 1512
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="cola"} 52.06117500000073
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="cola"} 97.61169999999765
operacion_fase_ms_sum{operacion="entrega_sobre",fase="cola"} 13002.637299999958
operacion_fase_ms_count{operacion="entrega_sobre",fase="cola"} 240
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="calculo"} 0.11952442396378514
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="calculo"} 1.98769999999422
operacion_fase_ms_sum{operacion="entrega_sobre",fase="calculo"} 774.3505000001023
operacion_fase_ms_count{operacion="entrega_sobre",fase="calculo"} 240
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="bd"} 47.719033333334664
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="bd"} 115.10139999999956
operacion_fase_ms_sum{operacion="entrega_sobre",fase="bd"} 21208.65690000008
operacion_fase_ms_count{operacion="entrega_sobre",fase="bd"} 240
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="serializacion"} 0.4006499999995867
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="serializacion"} 1.5811999999896216
operacion_fase_ms_sum{operacion="entrega_sobre",fase="serializacion"} 168.33710000010615
operacion_fase_ms_count{operacion="entrega_sobre",fase="serializacion"} 240
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="difusion"} 0.8689000000158558
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="difusion"} 3.422149999994872
operacion_fase_ms_sum{operacion="entrega_sobre",fase="difusion"} 293.37919999955193
operacion_fase_ms_count{operacion="entrega_sobre",fase="difusion"} 240
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="resto"} 1.164199999977427
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="resto"} 3.237200000021403
operacion_fase_ms_sum{operacion="entrega_sobre",fase="resto"} 954.802500000158
operacion_fase_ms_count{operacion="entrega_sobre",fase="resto"} 240
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="total"} 105.67933333333349
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="total"} 250.42295000000013
operacion_fase_ms_sum{operacion="entrega_sobre",fase="total"} 36402.16349999996
operacion_fase_ms_count{operacion="entrega_sobre",fase="total"} 240
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="cola"} 1577.636720454544
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="cola"} 2831.4894799999975
operacion_fase_ms_sum{operacion="apertura",fase="cola"} 1554859.9940999998
operacion_fase_ms_count{operacion="apertura",fase="cola"} 1022
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="calculo"} 89.29377214285668
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="calculo"} 254.13245777777868
operacion_fase_ms_sum{operacion="apertura",fase="calculo"} 94573.04919999994
operacion_fase_ms_count{operacion="apertura",fase="calculo"} 1022
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="bd"} 59.15737142856958
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="bd"} 744.8771649999708
operacion_fase_ms_sum{operacion="apertura",fase="bd"} 230513.63580000115
operacion_fase_ms_count{operacion="apertura",fase="bd"} 1022
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="serializacion"} 0.39509999999791034
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="serializacion"} 2.2109533333345706
operacion_fase_ms_sum{operacion="apertura",fase="serializacion"} 713.5454000007376
operacion_fase_ms_count{operacion="apertura",fase="serializacion"} 1022
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="difusion"} 0.2775000000001455
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="difusion"} 2.970911999981423
operacion_fase_ms_sum{operacion="apertura",fase="difusion"} 719.9563999999009
operacion_fase_ms_count{operacion="apertura",fase="difusion"} 1022
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="resto"} 3.0403816666745924
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="resto"} 52.54226666664229
operacion_fase_ms_sum{operacion="apertura",fase="resto"} 17058.914699998335
operacion_fase_ms_count{operacion="apertura",fase="resto"} 1022
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="total"} 1797.0788333333333
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="total"} 2916.9186133333296
operacion_fase_ms_sum{operacion="apertura",fase="total"} 1898439.095600001
operacion_fase_ms_count{operacion="apertura",fase="total"} 1022
operacion_consultas{quantile="0.5",operacion="eleccion"} 3
operacion_consultas{quantile="0.95",operacion="eleccion"} 3
operacion_consultas_sum{operacion="eleccion"} 4536
operacion_consultas_count{operacion="eleccion"} 1512
operacion_consultas{quantile="0.5",operacion="entrega_sobre"} 6.223684210526316
operacion_consultas{quantile="0.95",operacion="entrega_sobre"} 7.951219512195122
operacion_consultas_sum{operacion="entrega_sobre"} 2514
operacion_consultas_count{operacion="entrega_sobre"} 240
operacion_consultas{quantile="0.5",operacion="apertura"} 14
operacion_consultas{quantile="0.95",operacion="apertura"} 315.94054054054055
operacion_consultas_sum{operacion="apertura"} 96784
operacion_consultas_count{operacion="apertura"} 1022  source=console
```

## THRESHOLDS

```text
  █ THRESHOLDS

    apertura_ms
    ✓ 'p(95)<3000' p(95)=2.93s

    descanso_ms
    ✓ 'p(95)<3000' p(95)=3.34ms

    entrega_sobre_ms
    ✓ 'p(95)<1000' p(95)=263.09ms

    errores_ws
    ✓ 'count==0' count=0

    final_ms
    ✓ 'p(95)<3000' p(95)=484.04ms

    http_req_failed
    ✓ 'rate<0.01' rate=0.00%

    jornada_npc_ms
    ✓ 'p(95)<10000' p(95)=497.69ms

    partidas_bloqueadas
    ✓ 'count==0' count=0

    partidas_terminadas
    ✓ 'count>=10' count=10
```

## TOTAL RESULTS

```text
    checks_total.......: 156     3.488069/s
    checks_succeeded...: 100.00% 156 out of 156
    checks_failed......: 0.00%   0 out of 156

    ✓ usuario creado
    ✓ partida creada
    ✓ unido a la partida
    ✓ draft iniciado
```

## CUSTOM

```text
    apertura_ms....................: avg=1.88s    min=99.24ms med=1.82s   max=3.73s   p(90)=2.81s   p(95)=2.93s
    descanso_ms....................: avg=2ms      min=0s      med=2ms     max=4ms     p(90)=3ms     p(95)=3.34ms
    entrega_sobre_ms...............: avg=128.19ms min=41ms    med=115ms   max=423ms   p(90)=190.4ms p(95)=263.09ms
    errores_ws.....................: 0      0/s
    final_ms.......................: avg=210.64ms min=114ms   med=159ms   max=785ms   p(90)=292.9ms p(95)=484.04ms
    jornada_npc_ms.................: avg=285.28ms min=168ms   med=247ms   max=785ms   p(90)=332.8ms p(95)=497.69ms
    partidas_bloqueadas............: 0      0/s
    partidas_terminadas............: 10     0.223594/s
```

## HTTP

```text
    http_req_duration..............: avg=1.63s    min=7.93ms  med=1.65s   max=3.73s   p(90)=2.76s   p(95)=2.91s
      { expected_response:true }...: avg=1.63s    min=7.93ms  med=1.65s   max=3.73s   p(90)=2.76s   p(95)=2.91s
    http_req_failed................: 0.00%  0 out of 1192
    http_reqs......................: 1192   26.652422/s
```

## EXECUTION

```text
    iteration_duration.............: avg=41.56s   min=20.04s  med=41.98s  max=42.22s  p(90)=42.2s   p(95)=42.21s
    iterations.....................: 73     1.632237/s
    vus............................: 64     min=0         max=73
    vus_max........................: 73     min=73        max=73
```

## NETWORK

```text
    data_received..................: 183 MB 4.1 MB/s
    data_sent......................: 638 kB 14 kB/s
```

## WEBSOCKET

```text
    ws_connecting..................: avg=49.28ms  min=3.85ms  med=41.25ms max=91.87ms p(90)=86.14ms p(95)=88.81ms
    ws_msgs_received...............: 27129  606.588554/s
    ws_msgs_sent...................: 1853   41.431995/s
    ws_session_duration............: avg=41.56s   min=20.04s  med=41.98s  max=42.22s  p(90)=42.2s   p(95)=42.21s
    ws_sessions....................: 73     1.632237/s
```

## Finalización

```text
running (00m44.7s), 00/73 VUs, 73 complete and 0 interrupted iterations
humanos ✓ [======================================] 73 VUs  00m42.2s/40m0s  73/73 iters, 1 per VU
```
