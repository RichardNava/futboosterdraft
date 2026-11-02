# Resultado de prueba de carga — 100 partidas (Docker Desktop y Wi-Fi)

Entorno de T015: servidor con Node en Windows, PostgreSQL 16 en `docker compose` (Docker Desktop) y k6 en el mismo
equipo (el de Wi-Fi). Servidor arrancado sin modo watch (`tsx src/main.ts`), sin `SMTP_URL` y reiniciado antes del
escenario. Medido el 2026-11-02.

Repetición con el guion de turno fijo de conexión por VU (`(__VU - 1) * 4` ms). La versión anterior de este archivo
(todas las conexiones a la vez: 219 WebSocket rechazados y solo 53 partidas terminadas) queda en el historial de git.

## Comando ejecutado

```bash
k6 run --console-output=consola-100.txt -e PARTIDAS=100 -e APERTURA_MAX_S=0 -e METRICAS_URL=http://localhost:3000/metrics tools/load/beta-100.js
```

## Desglose por fases

```text
INFO[0529] Desglose por fases (http://localhost:3000/metrics):
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="cola"} 288.4344699295207
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="cola"} 718.7203030566279
operacion_fase_ms_sum{operacion="eleccion",fase="cola"} 4804341.231899967
operacion_fase_ms_count{operacion="eleccion",fase="cola"} 15120
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="calculo"} 0
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="calculo"} 0
operacion_fase_ms_sum{operacion="eleccion",fase="calculo"} 0
operacion_fase_ms_count{operacion="eleccion",fase="calculo"} 15120
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="bd"} 279.11292184684714
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="bd"} 511.9632573633604
operacion_fase_ms_sum{operacion="eleccion",fase="bd"} 4809798.325499992
operacion_fase_ms_count{operacion="eleccion",fase="bd"} 15120
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="serializacion"} 0.03878536585397617
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="serializacion"} 0.060598404089497196
operacion_fase_ms_sum{operacion="eleccion",fase="serializacion"} 624.4592000006232
operacion_fase_ms_count{operacion="eleccion",fase="serializacion"} 15120
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="difusion"} 0.2466465624944713
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="difusion"} 0.3721058314202521
operacion_fase_ms_sum{operacion="eleccion",fase="difusion"} 3977.2544999990787
operacion_fase_ms_count{operacion="eleccion",fase="difusion"} 15120
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="resto"} 0.4130057888512317
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="resto"} 0.7730258291922137
operacion_fase_ms_sum{operacion="eleccion",fase="resto"} 6993.964899997241
operacion_fase_ms_count{operacion="eleccion",fase="resto"} 15120
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="total"} 594.8534866688317
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="total"} 1131.7009998611113
operacion_fase_ms_sum{operacion="eleccion",fase="total"} 9625735.235999942
operacion_fase_ms_count{operacion="eleccion",fase="total"} 15120
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="cola"} 641.5137273026336
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="cola"} 1052.2398074074042
operacion_fase_ms_sum{operacion="entrega_sobre",fase="cola"} 1605284.0093000012
operacion_fase_ms_count{operacion="entrega_sobre",fase="cola"} 2400
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="calculo"} 0.04072559000609623
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="calculo"} 1.9189050000073622
operacion_fase_ms_sum{operacion="entrega_sobre",fase="calculo"} 21640.760899999994
operacion_fase_ms_count{operacion="entrega_sobre",fase="calculo"} 2400
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="bd"} 415.86224131701726
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="bd"} 1227.461199999998
operacion_fase_ms_sum{operacion="entrega_sobre",fase="bd"} 1798188.781600001
operacion_fase_ms_count{operacion="entrega_sobre",fase="bd"} 2400
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="serializacion"} 0.4057438888925188
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="serializacion"} 0.9294000000081724
operacion_fase_ms_sum{operacion="entrega_sobre",fase="serializacion"} 1635.337100000208
operacion_fase_ms_count{operacion="entrega_sobre",fase="serializacion"} 2400
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="difusion"} 0.8004866258624724
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="difusion"} 1.3883349999930943
operacion_fase_ms_sum{operacion="entrega_sobre",fase="difusion"} 2416.128899998759
operacion_fase_ms_count{operacion="entrega_sobre",fase="difusion"} 2400
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="resto"} 1.025900781232849
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="resto"} 3.051499999986845
operacion_fase_ms_sum{operacion="entrega_sobre",fase="resto"} 7324.056600001422
operacion_fase_ms_count{operacion="entrega_sobre",fase="resto"} 2400
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="total"} 1042.0665749045077
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="total"} 3133.8871191666644
operacion_fase_ms_sum{operacion="entrega_sobre",fase="total"} 3436477.7752000066
operacion_fase_ms_count{operacion="entrega_sobre",fase="total"} 2400
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="cola"} 19351.263016718684
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="cola"} 35206.07700299824
operacion_fase_ms_sum{operacion="apertura",fase="cola"} 192595705.58380085
operacion_fase_ms_count{operacion="apertura",fase="cola"} 10220
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="calculo"} 122.7029294118232
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="calculo"} 258.64099415064226
operacion_fase_ms_sum{operacion="apertura",fase="calculo"} 1048169.2276999996
operacion_fase_ms_count{operacion="apertura",fase="calculo"} 10220
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="bd"} 827.5911278805069
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="bd"} 12494.789055387912
operacion_fase_ms_sum{operacion="apertura",fase="bd"} 41153335.184899926
operacion_fase_ms_count{operacion="apertura",fase="bd"} 10220
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="serializacion"} 0.44846248094636465
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="serializacion"} 2.5376036922884357
operacion_fase_ms_sum{operacion="apertura",fase="serializacion"} 7342.63260000333
operacion_fase_ms_count{operacion="apertura",fase="serializacion"} 10220
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="difusion"} 0.26302038366139446
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="difusion"} 2.7590458333773613
operacion_fase_ms_sum{operacion="apertura",fase="difusion"} 6768.824700002922
operacion_fase_ms_count{operacion="apertura",fase="difusion"} 10220
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="resto"} 3.7910973634146914
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="resto"} 66.2009062693667
operacion_fase_ms_sum{operacion="apertura",fase="resto"} 215799.9005999807
operacion_fase_ms_count{operacion="apertura",fase="resto"} 10220
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="total"} 22218.61998151373
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="total"} 35882.35136666666
operacion_fase_ms_sum{operacion="apertura",fase="total"} 235027059.98650032
operacion_fase_ms_count{operacion="apertura",fase="total"} 10220
operacion_consultas{quantile="0.5",operacion="eleccion"} 3
operacion_consultas{quantile="0.95",operacion="eleccion"} 3
operacion_consultas_sum{operacion="eleccion"} 45360
operacion_consultas_count{operacion="eleccion"} 15120
operacion_consultas{quantile="0.5",operacion="entrega_sobre"} 6.223684210526316
operacion_consultas{quantile="0.95",operacion="entrega_sobre"} 7.951219512195122
operacion_consultas_sum{operacion="entrega_sobre"} 25129
operacion_consultas_count{operacion="entrega_sobre"} 2400
operacion_consultas{quantile="0.5",operacion="apertura"} 14
operacion_consultas{quantile="0.95",operacion="apertura"} 316.0635538261997
operacion_consultas_sum{operacion="apertura"} 971537
operacion_consultas_count{operacion="apertura"} 10220 
```

## Resumen de k6

```text
WARN[0000] k6/experimental/websockets is deprecated and will be removed in a future release. Please use k6/websockets instead.

         /\      Grafana   /‾‾/
    /\  /  \     |\  __   /  /
   /  \/    \    | |/ /  /   ‾‾\
  /          \   |   (  |  (‾)  |
 / __________ \  |_|\_\  \_____/


     execution: local
        script: tools/load/beta-100.js
        output: -

     scenarios: (100.00%) 1 scenario, 730 max VUs, 41m0s max duration (incl. graceful stop):
              * humanos: 1 iterations for each of 730 VUs (maxDuration: 40m0s, gracefulStop: 1m0s)



  █ THRESHOLDS

    apertura_ms
    ✗ 'p(95)<3000' p(95)=35.99s

    descanso_ms
    ✓ 'p(95)<3000' p(95)=6ms

    entrega_sobre_ms
    ✗ 'p(95)<1000' p(95)=1.78s

    errores_ws
    ✓ 'count==0' count=0

    final_ms
    ✓ 'p(95)<3000' p(95)=1.04s

    http_req_failed
    ✓ 'rate<0.01' rate=0.00%

    jornada_npc_ms
    ✓ 'p(95)<10000' p(95)=3.34s

    partidas_bloqueadas
    ✓ 'count==0' count=0

    partidas_terminadas
    ✓ 'count>=100' count=100


  █ TOTAL RESULTS

    checks_total.......: 1560    2.946825/s
    checks_succeeded...: 100.00% 1560 out of 1560
    checks_failed......: 0.00%   0 out of 1560

    ✓ usuario creado
    ✓ partida creada
    ✓ unido a la partida
    ✓ draft iniciado

    CUSTOM
    apertura_ms....................: avg=23.12s   min=481.3ms med=22.34s  max=38.97s   p(90)=35.32s  p(95)=35.99s
    descanso_ms....................: avg=3.49ms   min=1ms     med=3ms     max=13ms     p(90)=5ms     p(95)=6ms
    entrega_sobre_ms...............: avg=1.09s    min=279ms   med=963ms   max=3.13s    p(90)=1.35s   p(95)=1.78s
    errores_ws.....................: 0      0/s
    final_ms.......................: avg=605.57ms min=295ms   med=539ms   max=1.18s    p(90)=994.1ms p(95)=1.04s
    jornada_npc_ms.................: avg=1.97s    min=1.04s   med=1.81s   max=3.85s    p(90)=3.1s    p(95)=3.34s
    partidas_bloqueadas............: 0      0/s
    partidas_terminadas............: 100    0.188899/s

    HTTP
    http_req_duration..............: avg=19.94s   min=5.3ms   med=20.41s  max=38.97s   p(90)=35.19s  p(95)=35.84s
      { expected_response:true }...: avg=19.94s   min=5.3ms   med=20.41s  max=38.97s   p(90)=35.19s  p(95)=35.84s
    http_req_failed................: 0.00%  0 out of 11911
    http_reqs......................: 11911  22.499762/s

    EXECUTION
    iteration_duration.............: avg=8m15s    min=2m39s   med=8m21s   max=8m24s    p(90)=8m24s   p(95)=8m24s
    iterations.....................: 730    1.378963/s
    vus............................: 88     min=0          max=730
    vus_max........................: 730    min=730        max=730

    NETWORK
    data_received..................: 1.8 GB 3.5 MB/s
    data_sent......................: 6.4 MB 12 kB/s

    WEBSOCKET
    ws_connecting..................: avg=29.85ms  min=2.76ms  med=26.39ms max=181.05ms p(90)=46.11ms p(95)=57.11ms
    ws_msgs_received...............: 271255 512.39804/s
    ws_msgs_sent...................: 18530  35.002989/s
    ws_session_duration............: avg=8m14s    min=2m36s   med=8m20s   max=8m24s    p(90)=8m23s   p(95)=8m23s
    ws_sessions....................: 730    1.378963/s




running (08m49.4s), 000/730 VUs, 730 complete and 0 interrupted iterations
humanos ✓ [======================================] 730 VUs  08m24.9s/40m0s  730/730 iters, 1 per VU
ERRO[0529] thresholds on metrics 'apertura_ms, entrega_sobre_ms' have been crossed
```
