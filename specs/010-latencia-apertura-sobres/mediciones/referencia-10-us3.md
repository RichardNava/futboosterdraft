# Resultado de prueba de carga — 10 partidas tras US3 (entorno de referencia)

Tras US3 (T028–T029: cierre de turno del draft en una transacción). Entorno de referencia, el mismo de
[referencia-10-us2](referencia-10-us2.md): servidor, PostgreSQL 16 nativo en Windows y k6 en el mismo equipo (equipo B), por
cable, sin Docker Desktop. Condiciones pedidas: servidor recién arrancado con `tsx`, sin watch y sin `SMTP_URL`. Medido por la persona el
2026-11-03 (T032). La salida se capturó con PowerShell; aquí se quitan el aviso de `NativeCommandError` y las líneas de
progreso, y se unen las líneas partidas a 120 columnas.

## Salida de k6

```text
k6 run -e PARTIDAS=10 -e APERTURA_MAX_S=0 -e METRICAS_URL=http://localhost:3000/metrics tools/load/beta-100.js
WARN[0000] k6/experimental/websockets is deprecated and will be removed in a future release. Please use k6/websockets instead.

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

INFO Desglose por fases (http://localhost:3000/metrics):
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="cola"} 23.30804464285731
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="cola"} 53.595789999999326
operacion_fase_ms_sum{operacion="eleccion",fase="cola"} 37058.544699999984
operacion_fase_ms_count{operacion="eleccion",fase="cola"} 1512
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="calculo"} 0
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="calculo"} 0
operacion_fase_ms_sum{operacion="eleccion",fase="calculo"} 0
operacion_fase_ms_count{operacion="eleccion",fase="calculo"} 1512
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="bd"} 24.6509513888882
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="bd"} 37.80850222222223
operacion_fase_ms_sum{operacion="eleccion",fase="bd"} 39073.01330000009
operacion_fase_ms_count{operacion="eleccion",fase="bd"} 1512
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="serializacion"} 0.03860000000198246
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="serializacion"} 0.053352142857589296
operacion_fase_ms_sum{operacion="eleccion",fase="serializacion"} 65.27069999991727
operacion_fase_ms_count{operacion="eleccion",fase="serializacion"} 1512
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="difusion"} 0.2363885714270076
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="difusion"} 0.32947404761589916
operacion_fase_ms_sum{operacion="eleccion",fase="difusion"} 372.23540000000867
operacion_fase_ms_count{operacion="eleccion",fase="difusion"} 1512
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="resto"} 0.48107660818646625
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="resto"} 0.8349810000039359
operacion_fase_ms_sum{operacion="eleccion",fase="resto"} 815.226400000065
operacion_fase_ms_count{operacion="eleccion",fase="resto"} 1512
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="total"} 49.39740807692203
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="total"} 85.92261900000071
operacion_fase_ms_sum{operacion="eleccion",fase="total"} 77384.29049999994
operacion_fase_ms_count{operacion="eleccion",fase="total"} 1512
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="cola"} 54.18335000000176
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="cola"} 74.80569999999898
operacion_fase_ms_sum{operacion="entrega_sobre",fase="cola"} 12196.376699999997
operacion_fase_ms_count{operacion="entrega_sobre",fase="cola"} 240
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="calculo"} 0.11796497695833608
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="calculo"} 2.183900000003632
operacion_fase_ms_sum{operacion="entrega_sobre",fase="calculo"} 612.1900000000023
operacion_fase_ms_count{operacion="entrega_sobre",fase="calculo"} 240
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="bd"} 48.126650000000154
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="bd"} 163.47555000000284
operacion_fase_ms_sum{operacion="entrega_sobre",fase="bd"} 19236.516799999958
operacion_fase_ms_count{operacion="entrega_sobre",fase="bd"} 240
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="serializacion"} 0.4219000000066444
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="serializacion"} 1.1604500000048574
operacion_fase_ms_sum{operacion="entrega_sobre",fase="serializacion"} 180.14730000020063
operacion_fase_ms_count{operacion="entrega_sobre",fase="serializacion"} 240
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="difusion"} 0.8906999999944674
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="difusion"} 1.721400000007634
operacion_fase_ms_sum{operacion="entrega_sobre",fase="difusion"} 307.6690999999337
operacion_fase_ms_count{operacion="entrega_sobre",fase="difusion"} 240
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="resto"} 1.1002499999967768
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="resto"} 3.1028500000029453
operacion_fase_ms_sum{operacion="entrega_sobre",fase="resto"} 761.3241999999082
operacion_fase_ms_count{operacion="entrega_sobre",fase="resto"} 240
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="total"} 106.01399999999921
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="total"} 194.44064999999864
operacion_fase_ms_sum{operacion="entrega_sobre",fase="total"} 33294.2241
operacion_fase_ms_count{operacion="entrega_sobre",fase="total"} 240
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="cola"} 409.0655708333343
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="cola"} 727.961513333334
operacion_fase_ms_sum{operacion="apertura",fase="cola"} 384181.85339999985
operacion_fase_ms_count{operacion="apertura",fase="cola"} 1022
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="calculo"} 271.69325166666715
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="calculo"} 1069.4805599999993
operacion_fase_ms_sum{operacion="apertura",fase="calculo"} 336330.6287999996
operacion_fase_ms_count{operacion="apertura",fase="calculo"} 1022
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="bd"} 745.9134485714558
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="bd"} 985.0601275000029
operacion_fase_ms_sum{operacion="apertura",fase="bd"} 622165.2372
operacion_fase_ms_count{operacion="apertura",fase="bd"} 1022
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="serializacion"} 0.07090000000122625
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="serializacion"} 2.3305599999985134
operacion_fase_ms_sum{operacion="apertura",fase="serializacion"} 552.0170999999646
operacion_fase_ms_count{operacion="apertura",fase="serializacion"} 1022
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="difusion"} 0.535177777774556
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="difusion"} 3.289725333331637
operacion_fase_ms_sum{operacion="apertura",fase="difusion"} 983.6230000000614
operacion_fase_ms_count{operacion="apertura",fase="difusion"} 1022
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="resto"} 33.33480000001873
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="resto"} 51.037324999951124
operacion_fase_ms_sum{operacion="apertura",fase="resto"} 31843.837400000742
operacion_fase_ms_count{operacion="apertura",fase="resto"} 1022
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="total"} 1508.5771375000008
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="total"} 1860.390866666666
operacion_fase_ms_sum{operacion="apertura",fase="total"} 1376042.7499000006
operacion_fase_ms_count{operacion="apertura",fase="total"} 1022
operacion_consultas{quantile="0.5",operacion="eleccion"} 3
operacion_consultas{quantile="0.95",operacion="eleccion"} 3
operacion_consultas_sum{operacion="eleccion"} 4536
operacion_consultas_count{operacion="eleccion"} 1512
operacion_consultas{quantile="0.5",operacion="entrega_sobre"} 9.430962343096233
operacion_consultas{quantile="0.95",operacion="entrega_sobre"} 83.5397489539749
operacion_consultas_sum{operacion="entrega_sobre"} 2276
operacion_consultas_count{operacion="entrega_sobre"} 240
operacion_consultas{quantile="0.5",operacion="apertura"} 103.184375
operacion_consultas{quantile="0.95",operacion="apertura"} 118.27419354838709
operacion_consultas_sum{operacion="apertura"} 89000
operacion_consultas_count{operacion="apertura"} 1022

  █ THRESHOLDS

    apertura_ms
    ✓ 'p(95)<3000' p(95)=1.99s

    descanso_ms
    ✓ 'p(95)<3000' p(95)=19.44ms

    entrega_sobre_ms
    ✓ 'p(95)<1000' p(95)=171ms

    errores_ws
    ✓ 'count==0' count=0

    final_ms
    ✓ 'p(95)<3000' p(95)=498.89ms

    http_req_failed
    ✓ 'rate<0.01' rate=0.00%

    jornada_npc_ms
    ✓ 'p(95)<10000' p(95)=563.84ms

    partidas_bloqueadas
    ✓ 'count==0' count=0

    partidas_terminadas
    ✓ 'count>=10' count=10

  █ TOTAL RESULTS

    checks_total.......: 156     4.988369/s
    checks_succeeded...: 100.00% 156 out of 156
    checks_failed......: 0.00%   0 out of 156

    ✓ usuario creado
    ✓ partida creada
    ✓ unido a la partida
    ✓ draft iniciado

    CUSTOM
    apertura_ms....................: avg=1.43s    min=18.86ms med=1.59s   max=3.66s   p(90)=1.84s   p(95)=1.99s
    descanso_ms....................: avg=5.57ms   min=0s      med=2.5ms   max=24ms    p(90)=15.2ms  p(95)=19.44ms
    entrega_sobre_ms...............: avg=115.24ms min=41ms    med=107ms   max=229ms   p(90)=157.2ms p(95)=171ms
    errores_ws.....................: 0      0/s
    final_ms.......................: avg=253.57ms min=66ms    med=216.5ms max=703ms   p(90)=380.9ms p(95)=498.89ms
    jornada_npc_ms.................: avg=357.92ms min=92ms    med=346.5ms max=714ms   p(90)=470.7ms p(95)=563.84ms
    partidas_bloqueadas............: 0      0/s
    partidas_terminadas............: 10     0.319767/s

    HTTP
    http_req_duration..............: avg=1.25s    min=4.7ms   med=1.52s   max=3.66s   p(90)=1.81s   p(95)=1.96s
      { expected_response:true }...: avg=1.25s    min=4.7ms   med=1.52s   max=3.66s   p(90)=1.81s   p(95)=1.96s
    http_req_failed................: 0.00%  0 out of 1192
    http_reqs......................: 1192   38.116258/s

    EXECUTION
    iteration_duration.............: avg=27.78s   min=24.81s  med=28.22s  max=28.75s  p(90)=28.62s  p(95)=28.62s
    iterations.....................: 73     2.334301/s
    vus............................: 17     min=0         max=73
    vus_max........................: 73     min=73        max=73

    NETWORK
    data_received..................: 128 MB 4.1 MB/s
    data_sent......................: 638 kB 20 kB/s

    WEBSOCKET
    ws_connecting..................: avg=12.98ms  min=1ms     med=12.61ms max=60.08ms p(90)=19.64ms p(95)=21.64ms
    ws_msgs_received...............: 25139  803.862934/s
    ws_msgs_sent...................: 1853   59.252875/s
    ws_session_duration............: avg=27.64s   min=24.71s  med=27.99s  max=28.47s  p(90)=28.44s  p(95)=28.46s
    ws_sessions....................: 73     2.334301/s

running (00m31.3s), 00/73 VUs, 73 complete and 0 interrupted iterations
humanos ✓ [ 100% ] 73 VUs  00m28.8s/40m0s  73/73 iters, 1 per VU
```
