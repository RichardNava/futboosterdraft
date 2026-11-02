# RESULTADO TEST K6 — 10 jugadores

```sh
k6 run -e PARTIDAS=10 -e APERTURA_MAX_S=0 -e METRICAS_URL=http://localhost:3000/metrics tools/load/beta-100.js
```

**Advertencia:**
```text
WARN[0000] k6/experimental/websockets is deprecated and will be removed in a future release. Please use k6/websockets instead.
```

```text
     /\      Grafana   /‾‾/
 /\  /  \     |\  __   /  /
/  \/    \    | |/ /  /   ‾‾\
/          \   |   (  |  (‾)  |
/ __________ \  |_|\_\  \_____/

execution: local
script: tools/load/beta-100.js
output: -

scenarios: (100.00%) 1 scenario, 73 max VUs, 41m0s max duration (incl. graceful stop):
         * humanos: 1 iterations for each of 73 VUs (maxDuration: 40m0s, gracefulStop: 1m0s)
```

## Desglose por fases

```text
INFO[0057] Desglose por fases (http://localhost:3000/metrics):

operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="cola"} 29.706204446640225
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="cola"} 67.47092333333347
operacion_fase_ms_sum{operacion="eleccion",fase="cola"} 46246.15839999995
operacion_fase_ms_count{operacion="eleccion",fase="cola"} 1512
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="calculo"} 0
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="calculo"} 0
operacion_fase_ms_sum{operacion="eleccion",fase="calculo"} 0
operacion_fase_ms_count{operacion="eleccion",fase="calculo"} 1512
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="bd"} 28.311800000000893
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="bd"} 47.42271999999866
operacion_fase_ms_sum{operacion="eleccion",fase="bd"} 45635.686699999904
operacion_fase_ms_count{operacion="eleccion",fase="bd"} 1512
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="serializacion"} 0.041423809524877425
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="serializacion"} 0.06544666666435653
operacion_fase_ms_sum{operacion="eleccion",fase="serializacion"} 66.74819999992906
operacion_fase_ms_count{operacion="eleccion",fase="serializacion"} 1512
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="difusion"} 0.28619610389553113
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="difusion"} 0.47032599999933133
operacion_fase_ms_sum{operacion="eleccion",fase="difusion"} 460.2470999999714
operacion_fase_ms_count{operacion="eleccion",fase="difusion"} 1512
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="resto"} 0.5014612276643119
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="resto"} 1.0130566666608498
operacion_fase_ms_sum{operacion="eleccion",fase="resto"} 850.8534000004365
operacion_fase_ms_count{operacion="eleccion",fase="resto"} 1512
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="total"} 59.521471428571814
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="total"} 104.49327333333248
operacion_fase_ms_sum{operacion="eleccion",fase="total"} 93259.69380000039
operacion_fase_ms_count{operacion="eleccion",fase="total"} 1512
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="cola"} 61.31755000000461
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="cola"} 101.94160000000193
operacion_fase_ms_sum{operacion="entrega_sobre",fase="cola"} 14645.91110000007
operacion_fase_ms_count{operacion="entrega_sobre",fase="cola"} 240
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="calculo"} 0.1534783410137489
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="calculo"} 2.7159500000016124
operacion_fase_ms_sum{operacion="entrega_sobre",fase="calculo"} 580.8948999999557
operacion_fase_ms_count{operacion="entrega_sobre",fase="calculo"} 240
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="bd"} 54.34320000000298
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="bd"} 100.50019999999495
operacion_fase_ms_sum{operacion="entrega_sobre",fase="bd"} 20960.42260000002
operacion_fase_ms_count{operacion="entrega_sobre",fase="bd"} 240
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="serializacion"} 0.4396000000015192
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="serializacion"} 1.3783999999977823
operacion_fase_ms_sum{operacion="entrega_sobre",fase="serializacion"} 211.20429999993212
operacion_fase_ms_count{operacion="entrega_sobre",fase="serializacion"} 240
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="difusion"} 0.9330499999960011
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="difusion"} 1.7119499999862455
operacion_fase_ms_sum{operacion="entrega_sobre",fase="difusion"} 283.0503000000026
operacion_fase_ms_count{operacion="entrega_sobre",fase="difusion"} 240
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="resto"} 1.2507166666655394
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="resto"} 2.846399999987625
operacion_fase_ms_sum{operacion="entrega_sobre",fase="resto"} 784.2802000000811
operacion_fase_ms_count{operacion="entrega_sobre",fase="resto"} 240
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="total"} 116.57110000000102
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="total"} 204.78709999999774
operacion_fase_ms_sum{operacion="entrega_sobre",fase="total"} 37465.76340000006
operacion_fase_ms_count{operacion="entrega_sobre",fase="total"} 240
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="cola"} 2061.7231714285745
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="cola"} 3847.7851550000005
operacion_fase_ms_sum{operacion="apertura",fase="cola"} 2073888.075400002
operacion_fase_ms_count{operacion="apertura",fase="cola"} 1022
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="calculo"} 119.704776666668
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="calculo"} 289.60598999999996
operacion_fase_ms_sum{operacion="apertura",fase="calculo"} 104894.14839999996
operacion_fase_ms_count{operacion="apertura",fase="calculo"} 1022
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="bd"} 93.81194999999964
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="bd"} 1114.8630333333294
operacion_fase_ms_sum{operacion="apertura",fase="bd"} 334465.7247999968
operacion_fase_ms_count{operacion="apertura",fase="bd"} 1022
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="serializacion"} 0.4522690476184098
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="serializacion"} 2.3777559999751974
operacion_fase_ms_sum{operacion="apertura",fase="serializacion"} 689.4884000001621
operacion_fase_ms_count{operacion="apertura",fase="serializacion"} 1022
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="difusion"} 0.25094545455076867
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="difusion"} 2.7712199999936273
operacion_fase_ms_sum{operacion="apertura",fase="difusion"} 682.7544999999736
operacion_fase_ms_count{operacion="apertura",fase="difusion"} 1022
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="resto"} 4.052137499998707
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="resto"} 66.30286749990319
operacion_fase_ms_sum{operacion="apertura",fase="resto"} 21797.089500002956
operacion_fase_ms_count{operacion="apertura",fase="resto"} 1022
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="total"} 2392.8459071428592
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="total"} 3977.032139999996
operacion_fase_ms_sum{operacion="apertura",fase="total"} 2536417.281000002
operacion_fase_ms_count{operacion="apertura",fase="total"} 1022

operacion_consultas{quantile="0.5",operacion="eleccion"} 3
operacion_consultas{quantile="0.95",operacion="eleccion"} 3
operacion_consultas_sum{operacion="eleccion"} 4536
operacion_consultas_count{operacion="eleccion"} 1512
operacion_consultas{quantile="0.5",operacion="entrega_sobre"} 6.223684210526316
operacion_consultas{quantile="0.95",operacion="entrega_sobre"} 7.951219512195122
operacion_consultas_sum{operacion="entrega_sobre"} 2582
operacion_consultas_count{operacion="entrega_sobre"} 240
operacion_consultas{quantile="0.5",operacion="apertura"} 14
operacion_consultas{quantile="0.95",operacion="apertura"} 323.7578947368421
operacion_consultas_sum{operacion="apertura"} 98174
operacion_consultas_count{operacion="apertura"} 1022
```

## THRESHOLDS

| Métrica | Resultado | Estado |
|---|---|---|
| `apertura_ms` | `p(95)<3000`, `p(95)=4s` | ✗ |
| `descanso_ms` | `p(95)<3000`, `p(95)=4ms` | ✓ |
| `entrega_sobre_ms` | `p(95)<1000`, `p(95)=188.09ms` | ✓ |
| `errores_ws` | `count==0`, `count=0` | ✓ |
| `final_ms` | `p(95)<3000`, `p(95)=271.64ms` | ✓ |
| `http_req_failed` | `rate<0.01`, `rate=0.00%` | ✓ |
| `jornada_npc_ms` | `p(95)<10000`, `p(95)=411.55ms` | ✓ |
| `partidas_bloqueadas` | `count==0`, `count=0` | ✓ |
| `partidas_terminadas` | `count>=10`, `count=10` | ✓ |

## TOTAL RESULTS

```text
checks_total.......: 156     2.708391/s
checks_succeeded...: 100.00% 156 out of 156
checks_failed......: 0.00%   0 out of 156

✓ usuario creado
✓ partida creada
✓ unido a la partida
✓ draft iniciado
```

### CUSTOM

```text
apertura_ms....................: avg=2.51s    min=138.34ms med=2.43s   max=4.57s   p(90)=3.78s   p(95)=4s
descanso_ms....................: avg=3ms      min=2ms      med=3ms     max=4ms     p(90)=4ms     p(95)=4ms
entrega_sobre_ms...............: avg=124.99ms min=50ms     med=115ms   max=220ms   p(90)=170ms   p(95)=188.09ms
errores_ws.....................: 0      0/s
final_ms.......................: avg=197.21ms min=149ms    med=192.5ms max=284ms   p(90)=253.9ms p(95)=271.64ms
jornada_npc_ms.................: avg=313.42ms min=240ms    med=299.5ms max=420ms   p(90)=396.8ms p(95)=411.55ms
partidas_bloqueadas............: 0      0/s
partidas_terminadas............: 10     0.173615/s
```

### HTTP

```text
http_req_duration..............: avg=2.18s    min=7.96ms   med=2.2s    max=4.57s   p(90)=3.73s   p(95)=3.98s
  { expected_response:true }...: avg=2.18s    min=7.96ms   med=2.2s    max=4.57s
http_req_failed................: 0.00%  0 out of 1192
http_reqs......................: 1192   20.694884/s
```

### EXECUTION

```text
iteration_duration.............: avg=54.07s   min=23.64s   med=54.52s  max=55.04s  p(90)=55.01s  p(95)=55.02s
iterations.....................: 73     1.267388/s
vus............................: 41     min=0         max=73
vus_max........................: 73     min=73        max=73
```

### NETWORK

```text
data_received..................: 183 MB 3.2 MB/s
data_sent......................: 638 kB 11 kB/s
```

### WEBSOCKET

```text
ws_connecting..................: avg=31.31ms  min=7.15ms   med=25.72ms max=51.28ms p(90)=49.38ms p(95)=50.77ms
ws_msgs_received...............: 27116  470.773895/s
ws_msgs_sent...................: 1853   32.170823/s
ws_session_duration............: avg=54.07s   min=23.64s  med=54.52s  max=55.04s
ws_sessions....................: 73     1.267388/s
```

```text
running (00m57.6s), 00/73 VUs, 73 complete and 0 interrupted iterations
humanos ✓ [======================================] 73 VUs 00m55.1s/40m0s 73/73 iters, 1 per VU

ERRO[0057] thresholds on metrics 'apertura_ms' have been crossed
```