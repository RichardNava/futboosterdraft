# Resultado de prueba de carga — 10 partidas tras recortar el grupo de aperturas (entorno de referencia)

Tras los recortes de consultas del grupo de aperturas (T043–T046, de 115 a 39 consultas por grupo). Entorno de referencia, el mismo de
[referencia-10-us3](referencia-10-us3.md): servidor, PostgreSQL 16 nativo en Windows y k6 en el mismo equipo (equipo B), por
cable, sin Docker Desktop. Condiciones pedidas: servidor recién arrancado con `tsx`, sin watch y sin `SMTP_URL`. Medido por la persona el
2026-11-03 (T042). La salida se capturó con PowerShell; aquí se quitan el aviso de `NativeCommandError` y las líneas de
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
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="cola"} 20.117033333332493
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="cola"} 48.10841499999973
operacion_fase_ms_sum{operacion="eleccion",fase="cola"} 32414.57839999984
operacion_fase_ms_count{operacion="eleccion",fase="cola"} 1512
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="calculo"} 0
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="calculo"} 0
operacion_fase_ms_sum{operacion="eleccion",fase="calculo"} 0
operacion_fase_ms_count{operacion="eleccion",fase="calculo"} 1512
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="bd"} 20.709488000001933
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="bd"} 37.088595999999704
operacion_fase_ms_sum{operacion="eleccion",fase="bd"} 34844.181099999965
operacion_fase_ms_count{operacion="eleccion",fase="bd"} 1512
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="serializacion"} 0.03418409091008553
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="serializacion"} 0.05089699999836739
operacion_fase_ms_sum{operacion="eleccion",fase="serializacion"} 54.22789999998531
operacion_fase_ms_count{operacion="eleccion",fase="serializacion"} 1512
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="difusion"} 0.20390801435363382
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="difusion"} 0.28371999999963
operacion_fase_ms_sum{operacion="eleccion",fase="difusion"} 323.0843999998924
operacion_fase_ms_count{operacion="eleccion",fase="difusion"} 1512
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="resto"} 0.39976302447665696
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="resto"} 0.704909999999654
operacion_fase_ms_sum{operacion="eleccion",fase="resto"} 687.9318000003568
operacion_fase_ms_count{operacion="eleccion",fase="resto"} 1512
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="total"} 43.75839833333381
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="total"} 78.35872999999972
operacion_fase_ms_sum{operacion="eleccion",fase="total"} 68324.00359999992
operacion_fase_ms_count{operacion="eleccion",fase="total"} 1512
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="cola"} 44.42385000000013
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="cola"} 71.10670000000027
operacion_fase_ms_sum{operacion="entrega_sobre",fase="cola"} 10297.022499999997
operacion_fase_ms_count{operacion="entrega_sobre",fase="cola"} 240
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="calculo"} 0.11371797235030252
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="calculo"} 2.684850000001461
operacion_fase_ms_sum{operacion="entrega_sobre",fase="calculo"} 611.5982000000276
operacion_fase_ms_count{operacion="entrega_sobre",fase="calculo"} 240
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="bd"} 38.987199999997756
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="bd"} 197.30139999999938
operacion_fase_ms_sum{operacion="entrega_sobre",fase="bd"} 16358.628100000004
operacion_fase_ms_count{operacion="entrega_sobre",fase="bd"} 240
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="serializacion"} 0.4458000000049651
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="serializacion"} 1.3809999999921274
operacion_fase_ms_sum{operacion="entrega_sobre",fase="serializacion"} 224.14709999991646
operacion_fase_ms_count{operacion="entrega_sobre",fase="serializacion"} 240
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="difusion"} 0.7986999999993714
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="difusion"} 1.2538000000004104
operacion_fase_ms_sum{operacion="entrega_sobre",fase="difusion"} 292.6215000001157
operacion_fase_ms_count{operacion="entrega_sobre",fase="difusion"} 240
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="resto"} 0.9168249999934233
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="resto"} 1.670950000004268
operacion_fase_ms_sum{operacion="entrega_sobre",fase="resto"} 616.6429999999382
operacion_fase_ms_count{operacion="entrega_sobre",fase="resto"} 240
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="total"} 86.29981666666542
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="total"} 223.9754499999999
operacion_fase_ms_sum{operacion="entrega_sobre",fase="total"} 28400.660399999997
operacion_fase_ms_count{operacion="entrega_sobre",fase="total"} 240
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="cola"} 441.5744428571427
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="cola"} 677.2787999999979
operacion_fase_ms_sum{operacion="apertura",fase="cola"} 410669.2545000007
operacion_fase_ms_count{operacion="apertura",fase="cola"} 1022
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="calculo"} 313.42580000000135
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="calculo"} 843.3874628571436
operacion_fase_ms_sum{operacion="apertura",fase="calculo"} 375917.60599999956
operacion_fase_ms_count{operacion="apertura",fase="calculo"} 1022
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="bd"} 415.6560500000096
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="bd"} 624.2106800000096
operacion_fase_ms_sum{operacion="apertura",fase="bd"} 376974.59370000014
operacion_fase_ms_count{operacion="apertura",fase="bd"} 1022
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="serializacion"} 0.035999999995510734
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="serializacion"} 2.162624999990294
operacion_fase_ms_sum{operacion="apertura",fase="serializacion"} 469.6518999998261
operacion_fase_ms_count{operacion="apertura",fase="serializacion"} 1022
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="difusion"} 0.2583090909095269
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="difusion"} 2.738860000005661
operacion_fase_ms_sum{operacion="apertura",fase="difusion"} 721.6444000006231
operacion_fase_ms_count{operacion="apertura",fase="difusion"} 1022
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="resto"} 58.44102249997341
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="resto"} 87.25164000000568
operacion_fase_ms_sum{operacion="apertura",fase="resto"} 53112.88249999912
operacion_fase_ms_count{operacion="apertura",fase="resto"} 1022
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="total"} 1311.6326436363645
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="total"} 1634.1671222222212
operacion_fase_ms_sum{operacion="apertura",fase="total"} 1217865.6329999992
operacion_fase_ms_count{operacion="apertura",fase="total"} 1022
operacion_consultas{quantile="0.5",operacion="eleccion"} 3
operacion_consultas{quantile="0.95",operacion="eleccion"} 3
operacion_consultas_sum{operacion="eleccion"} 4536
operacion_consultas_count{operacion="eleccion"} 1512
operacion_consultas{quantile="0.5",operacion="entrega_sobre"} 9.01255230125523
operacion_consultas{quantile="0.95",operacion="entrega_sobre"} 74.0836820083682
operacion_consultas_sum{operacion="entrega_sobre"} 2184
operacion_consultas_count{operacion="entrega_sobre"} 240
operacion_consultas{quantile="0.5",operacion="apertura"} 41.798920377867745
operacion_consultas{quantile="0.95",operacion="apertura"} 56.956521739130416
operacion_consultas_sum{operacion="apertura"} 40451
operacion_consultas_count{operacion="apertura"} 1022

  █ THRESHOLDS

    apertura_ms
    ✓ 'p(95)<3000' p(95)=1.87s

    descanso_ms
    ✓ 'p(95)<3000' p(95)=4.04ms

    entrega_sobre_ms
    ✓ 'p(95)<1000' p(95)=163.19ms

    errores_ws
    ✓ 'count==0' count=0

    final_ms
    ✓ 'p(95)<3000' p(95)=540.9ms

    http_req_failed
    ✓ 'rate<0.01' rate=0.00%

    jornada_npc_ms
    ✓ 'p(95)<10000' p(95)=567.15ms

    partidas_bloqueadas
    ✓ 'count==0' count=0

    partidas_terminadas
    ✓ 'count>=10' count=10

  █ TOTAL RESULTS

    checks_total.......: 156     5.347441/s
    checks_succeeded...: 100.00% 156 out of 156
    checks_failed......: 0.00%   0 out of 156

    ✓ usuario creado
    ✓ partida creada
    ✓ unido a la partida
    ✓ draft iniciado

    CUSTOM
    apertura_ms....................: avg=1.3s     min=54.83ms med=1.4s    max=3.27s   p(90)=1.64s   p(95)=1.87s
    descanso_ms....................: avg=1.78ms   min=0s      med=1.5ms   max=6ms     p(90)=3ms     p(95)=4.04ms
    entrega_sobre_ms...............: avg=98.98ms  min=31ms    med=88ms    max=268ms   p(90)=146ms   p(95)=163.19ms
    errores_ws.....................: 0      0/s
    final_ms.......................: avg=200.28ms min=63ms    med=152ms   max=550ms   p(90)=461ms   p(95)=540.9ms
    jornada_npc_ms.................: avg=244ms    min=81ms    med=194.5ms max=625ms   p(90)=499.1ms p(95)=567.15ms
    partidas_bloqueadas............: 0      0/s
    partidas_terminadas............: 10     0.342785/s

    HTTP
    http_req_duration..............: avg=1.14s    min=5.23ms  med=1.35s   max=4.75s   p(90)=1.6s    p(95)=1.84s
      { expected_response:true }...: avg=1.14s    min=5.23ms  med=1.35s   max=4.75s   p(90)=1.6s    p(95)=1.84s
    http_req_failed................: 0.00%  0 out of 1192
    http_reqs......................: 1192   40.859936/s

    EXECUTION
    iteration_duration.............: avg=24.63s   min=24.06s  med=24.66s  max=27.13s  p(90)=24.9s   p(95)=24.91s
    iterations.....................: 73     2.502328/s
    vus............................: 1      min=0         max=73
    vus_max........................: 73     min=73        max=73

    NETWORK
    data_received..................: 130 MB 4.4 MB/s
    data_sent......................: 639 kB 22 kB/s

    WEBSOCKET
    ws_connecting..................: avg=10.29ms  min=0s      med=9.28ms  max=32.99ms p(90)=21.44ms p(95)=22.7ms
    ws_msgs_received...............: 25203  863.920281/s
    ws_msgs_sent...................: 1853   63.518005/s
    ws_session_duration............: avg=24.48s   min=24.05s  med=24.53s  max=26.84s  p(90)=24.78s  p(95)=24.8s
    ws_sessions....................: 73     2.502328/s

running (00m29.2s), 00/73 VUs, 73 complete and 0 interrupted iterations
humanos ✓ [ 100% ] 73 VUs  00m27.1s/40m0s  73/73 iters, 1 per VU
```
