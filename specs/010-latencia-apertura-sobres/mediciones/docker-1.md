# RESULTADO TEST K6 — 1 jugadores
# Resultado de prueba de carga — 1 partida

## Comando ejecutado

```bash
k6 run -e PARTIDAS=1 -e METRICAS_URL=http://localhost:3000/metrics tools/load/beta-100.js
```

## Advertencia

```text
WARN[0000] k6/experimental/websockets is deprecated and will be removed in a future release. Please use k6/websockets instead.
```

## Ejecución

```text
         /\      Grafana   /‾‾/
    /\  /  \     |\  __   /  /
   /  \/    \    | |/ /  /   ‾‾\
  /          \   |   (  |  (‾)  |
 / __________ \  |_|\_\  \_____/

     execution: local
        script: tools/load/beta-100.js
        output: -

     scenarios: (100.00%) 1 scenario, 1 max VUs, 41m0s max duration (incl. graceful stop):
              * humanos: 1 iterations for each of 1 VUs (maxDuration: 40m0s, gracefulStop: 1m0s)
```

## Desglose por fases

Origen: `http://localhost:3000/metrics`

```text
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="cola"} 0.005299999997077975
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="cola"} 0.016930000003776497
operacion_fase_ms_sum{operacion="entrega_sobre",fase="cola"} 0.16640000004554167
operacion_fase_ms_count{operacion="entrega_sobre",fase="cola"} 24
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="calculo"} 2.042700000005425
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="calculo"} 120.89417000002466
operacion_fase_ms_sum{operacion="entrega_sobre",fase="calculo"} 438.9542000001529
operacion_fase_ms_count{operacion="entrega_sobre",fase="calculo"} 24
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="bd"} 9.03914999999688
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="bd"} 51.79192999999178
operacion_fase_ms_sum{operacion="entrega_sobre",fase="bd"} 361.74159999997937
operacion_fase_ms_count{operacion="entrega_sobre",fase="bd"} 24
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="serializacion"} 0.07910000000265427
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="serializacion"} 0.44245000001246504
operacion_fase_ms_sum{operacion="entrega_sobre",fase="serializacion"} 2.8593000000546454
operacion_fase_ms_count{operacion="entrega_sobre",fase="serializacion"} 24
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="difusion"} 0.18989999999757856
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="difusion"} 0.6379099999947332
operacion_fase_ms_sum{operacion="entrega_sobre",fase="difusion"} 5.952399999965564
operacion_fase_ms_count{operacion="entrega_sobre",fase="difusion"} 24
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="resto"} 1.5615499999839813
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="resto"} 13.846479999957854
operacion_fase_ms_sum{operacion="entrega_sobre",fase="resto"} 76.49739999973099
operacion_fase_ms_count{operacion="entrega_sobre",fase="resto"} 24
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="total"} 13.055950000001758
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="total"} 185.84238999999783
operacion_fase_ms_sum{operacion="entrega_sobre",fase="total"} 886.171299999929
operacion_fase_ms_count{operacion="entrega_sobre",fase="total"} 24
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="cola"} 0.004866666664990286
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="cola"} 38.11015999999649
operacion_fase_ms_sum{operacion="apertura",fase="cola"} 47.70239999999467
operacion_fase_ms_count{operacion="apertura",fase="cola"} 14
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="calculo"} 59.05970000000525
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="calculo"} 102.24392000000222
operacion_fase_ms_sum{operacion="apertura",fase="calculo"} 898.4544000000169
operacion_fase_ms_count{operacion="apertura",fase="calculo"} 14
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="bd"} 18.479549999981828
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="bd"} 23.821200000017413
operacion_fase_ms_sum{operacion="apertura",fase="bd"} 264.3235000000859
operacion_fase_ms_count{operacion="apertura",fase="bd"} 14
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="serializacion"} 0.32204999999521533
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="serializacion"} 0.4902600000117671
operacion_fase_ms_sum{operacion="apertura",fase="serializacion"} 4.7356000000290805
operacion_fase_ms_count{operacion="apertura",fase="serializacion"} 14
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="difusion"} 0.23894999999174615
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="difusion"} 0.5036599999992174
operacion_fase_ms_sum{operacion="apertura",fase="difusion"} 3.691599999976461
operacion_fase_ms_count{operacion="apertura",fase="difusion"} 14
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="resto"} 2.470050000003539
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="resto"} 4.601559999954769
operacion_fase_ms_sum{operacion="apertura",fase="resto"} 37.757699999943725
operacion_fase_ms_count{operacion="apertura",fase="resto"} 14
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="total"} 79.8689499999964
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="total"} 165.93808000000126
operacion_fase_ms_sum{operacion="apertura",fase="total"} 1256.6652000000468
operacion_fase_ms_count{operacion="apertura",fase="total"} 14
operacion_consultas{quantile="0.5",operacion="entrega_sobre"} 7.130434782608695
operacion_consultas{quantile="0.95",operacion="entrega_sobre"} 60.79999999999981
operacion_consultas_sum{operacion="entrega_sobre"} 270
operacion_consultas_count{operacion="entrega_sobre"} 24
operacion_consultas{quantile="0.5",operacion="apertura"} 14
operacion_consultas{quantile="0.95",operacion="apertura"} 14
operacion_consultas_sum{operacion="apertura"} 196
operacion_consultas_count{operacion="apertura"} 14  source=console
```

## THRESHOLDS

```text
  █ THRESHOLDS

    apertura_ms
    ✓ 'p(95)<3000' p(95)=133.12ms

    descanso_ms
    ✓ 'p(95)<3000' p(95)=3.34ms

    entrega_sobre_ms
    ✓ 'p(95)<1000' p(95)=16.89ms

    errores_ws
    ✓ 'count==0' count=0

    final_ms
    ✓ 'p(95)<3000' p(95)=98.15ms

    http_req_failed
    ✓ 'rate<0.01' rate=0.00%

    jornada_npc_ms
    ✓ 'p(95)<10000' p(95)=139.54ms

    partidas_bloqueadas
    ✓ 'count==0' count=0

    partidas_terminadas
    ✓ 'count>=1' count=1
```

## TOTAL RESULTS

```text
    checks_total.......: 3       0.347964/s
    checks_succeeded...: 100.00% 3 out of 3
    checks_failed......: 0.00%   0 out of 3

    ✓ usuario creado
    ✓ partida creada
    ✓ draft iniciado
```

## CUSTOM

```text
    apertura_ms....................: avg=93.87ms  min=72.83ms med=83.9ms   max=189.76ms p(90)=102.33ms p(95)=133.12ms
    descanso_ms....................: avg=2.5ms    min=2ms     med=2ms      max=4ms      p(90)=3ms      p(95)=3.34ms
    entrega_sobre_ms...............: avg=12.47ms  min=9ms     med=12ms     max=18ms     p(90)=16ms     p(95)=16.89ms
    errores_ws.....................: 0      0/s
    final_ms.......................: avg=88.21ms  min=79ms    med=87ms     max=104ms    p(90)=94.4ms   p(95)=98.15ms
    jornada_npc_ms.................: avg=125.14ms min=112ms   med=126ms    max=148ms    p(90)=133.2ms  p(95)=139.54ms
    partidas_bloqueadas............: 0      0/s
    partidas_terminadas............: 1      0.115988/s
```

## HTTP

```text
    http_req_duration..............: avg=190.83ms min=6.4ms   med=101.67ms max=464.55ms p(90)=346.2ms  p(95)=372.83ms
      { expected_response:true }...: avg=190.83ms min=6.4ms   med=101.67ms max=464.55ms p(90)=346.2ms  p(95)=372.83ms
    http_req_failed................: 0.00%  0 out of 31
    http_reqs......................: 31     3.595627/s
```

## EXECUTION

```text
    iteration_duration.............: avg=8.51s    min=8.51s   med=8.51s    max=8.51s    p(90)=8.51s    p(95)=8.51s
    iterations.....................: 1      0.115988/s
    vus............................: 1      min=1       max=1
    vus_max........................: 1      min=1       max=1
```

## NETWORK

```text
    data_received..................: 3.4 MB 397 kB/s
    data_sent......................: 19 kB  2.2 kB/s
```

## WEBSOCKET

```text
    ws_connecting..................: avg=2.65ms   min=2.65ms  med=2.65ms   max=2.65ms   p(90)=2.65ms   p(95)=2.65ms
    ws_msgs_received...............: 304    35.260342/s
    ws_msgs_sent...................: 53     6.147362/s
    ws_session_duration............: avg=8.51s    min=8.51s   med=8.51s    max=8.51s   p(90)=8.51s    p(95)=8.51s
    ws_sessions....................: 1      0.115988/s
```

## Finalización

```text
running (00m08.6s), 0/1 VUs, 1 complete and 0 interrupted iterations
humanos ✓ [======================================] 1 VUs  00m08.5s/40m0s  1/1 iters, 1 per VU
```