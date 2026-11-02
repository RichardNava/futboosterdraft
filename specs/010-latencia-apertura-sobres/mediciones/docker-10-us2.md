# Resultado de prueba de carga — 10 partidas tras US2 (Docker Desktop)

Tras US2 (T017–T026: grupo de aperturas y `emitirTorneo` con datos comunes). Mismo equipo y entorno que
[docker-10](docker-10.md): servidor en Windows (`tsx src/main.ts`, sin watch, hilos por defecto, sin `SMTP_URL`),
PostgreSQL 16 en `docker compose` (Docker Desktop) y k6 2.3 en la misma máquina. Servidor recién arrancado. Medido el
2026-11-03. **No es el entorno de referencia** (T027 pide también esa medición).

## Comando ejecutado

```bash
k6 run -e PARTIDAS=10 -e APERTURA_MAX_S=0 -e METRICAS_URL=http://localhost:3000/metrics tools/load/beta-100.js
```

## Desglose por fases

```text
Desglose por fases (http://localhost:3000/metrics):
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="cola"} 26.992024046823072
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="cola"} 66.99262888888902
operacion_fase_ms_sum{operacion="eleccion",fase="cola"} 44335.29450000008
operacion_fase_ms_count{operacion="eleccion",fase="cola"} 1512
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="calculo"} 0
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="calculo"} 0
operacion_fase_ms_sum{operacion="eleccion",fase="calculo"} 0
operacion_fase_ms_count{operacion="eleccion",fase="calculo"} 1512
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="bd"} 27.834800000000314
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="bd"} 53.136871333331335
operacion_fase_ms_sum{operacion="eleccion",fase="bd"} 46500.055899999985
operacion_fase_ms_count{operacion="eleccion",fase="bd"} 1512
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="serializacion"} 0.038712244899011705
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="serializacion"} 0.06937555555575975
operacion_fase_ms_sum{operacion="eleccion",fase="serializacion"} 64.48510000007082
operacion_fase_ms_count{operacion="eleccion",fase="serializacion"} 1512
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="difusion"} 0.26546652892637607
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="difusion"} 0.4228546666640248
operacion_fase_ms_sum{operacion="eleccion",fase="difusion"} 436.96820000015396
operacion_fase_ms_count{operacion="eleccion",fase="difusion"} 1512
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="resto"} 0.5049193181788578
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="resto"} 1.094071333326331
operacion_fase_ms_sum{operacion="eleccion",fase="resto"} 909.766499999756
operacion_fase_ms_count{operacion="eleccion",fase="resto"} 1512
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="total"} 57.948587500000485
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="total"} 112.33984833333432
operacion_fase_ms_sum{operacion="eleccion",fase="total"} 92246.57019999993
operacion_fase_ms_count{operacion="eleccion",fase="total"} 1512
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="cola"} 63.7242499999993
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="cola"} 110.90514999999868
operacion_fase_ms_sum{operacion="entrega_sobre",fase="cola"} 15129.836099999999
operacion_fase_ms_count{operacion="entrega_sobre",fase="cola"} 240
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="calculo"} 0.14269493087551616
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="calculo"} 3.0807499999955326
operacion_fase_ms_sum{operacion="entrega_sobre",fase="calculo"} 651.0753999999979
operacion_fase_ms_count{operacion="entrega_sobre",fase="calculo"} 240
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="bd"} 54.66765000000487
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="bd"} 131.29310000000078
operacion_fase_ms_sum{operacion="entrega_sobre",fase="bd"} 20554.125799999943
operacion_fase_ms_count{operacion="entrega_sobre",fase="bd"} 240
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="serializacion"} 0.41768333332947805
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="serializacion"} 1.8580500000043685
operacion_fase_ms_sum{operacion="entrega_sobre",fase="serializacion"} 192.602600000042
operacion_fase_ms_count{operacion="entrega_sobre",fase="serializacion"} 240
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="difusion"} 0.8948499999933119
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="difusion"} 1.5577499999963038
operacion_fase_ms_sum{operacion="entrega_sobre",fase="difusion"} 284.0521999998982
operacion_fase_ms_count{operacion="entrega_sobre",fase="difusion"} 240
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="resto"} 1.2328666666696033
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="resto"} 3.207249999999476
operacion_fase_ms_sum{operacion="entrega_sobre",fase="resto"} 803.8239000001267
operacion_fase_ms_count{operacion="entrega_sobre",fase="resto"} 240
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="total"} 120.31696666666569
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="total"} 229.7236499999999
operacion_fase_ms_sum{operacion="entrega_sobre",fase="total"} 37615.516
operacion_fase_ms_count{operacion="entrega_sobre",fase="total"} 240
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="cola"} 429.18864693877475
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="cola"} 647.7800399999984
operacion_fase_ms_sum{operacion="apertura",fase="cola"} 412680.5448000002
operacion_fase_ms_count{operacion="apertura",fase="cola"} 1022
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="calculo"} 256.6616571428562
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="calculo"} 1031.1194599999983
operacion_fase_ms_sum{operacion="apertura",fase="calculo"} 337822.81029999896
operacion_fase_ms_count{operacion="apertura",fase="calculo"} 1022
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="bd"} 912.4231803030239
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="bd"} 1122.0025866666745
operacion_fase_ms_sum{operacion="apertura",fase="bd"} 840133.4453999964
operacion_fase_ms_count{operacion="apertura",fase="bd"} 1022
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="serializacion"} 0.10599999999924746
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="serializacion"} 2.5500333333286105
operacion_fase_ms_sum{operacion="apertura",fase="serializacion"} 543.7441000004146
operacion_fase_ms_count{operacion="apertura",fase="serializacion"} 1022
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="difusion"} 0.8314958333325553
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="difusion"} 2.9367491666657157
operacion_fase_ms_sum{operacion="apertura",fase="difusion"} 1100.898899999862
operacion_fase_ms_count{operacion="apertura",fase="difusion"} 1022
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="resto"} 41.406525000007605
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="resto"} 61.53276666662905
operacion_fase_ms_sum{operacion="apertura",fase="resto"} 41102.56060000383
operacion_fase_ms_count{operacion="apertura",fase="resto"} 1022
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="total"} 1685.684671923077
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="total"} 2631.335496000001
operacion_fase_ms_sum{operacion="apertura",fase="total"} 1633377.9441000011
operacion_fase_ms_count{operacion="apertura",fase="total"} 1022
operacion_consultas{quantile="0.5",operacion="eleccion"} 3
operacion_consultas{quantile="0.95",operacion="eleccion"} 3
operacion_consultas_sum{operacion="eleccion"} 4536
operacion_consultas_count{operacion="eleccion"} 1512
operacion_consultas{quantile="0.5",operacion="entrega_sobre"} 6.223684210526316
operacion_consultas{quantile="0.95",operacion="entrega_sobre"} 7.951219512195122
operacion_consultas_sum{operacion="entrega_sobre"} 2318
operacion_consultas_count{operacion="entrega_sobre"} 240
operacion_consultas{quantile="0.5",operacion="apertura"} 101.87852760736196
operacion_consultas{quantile="0.95",operacion="apertura"} 121.18709677419355
operacion_consultas_sum{operacion="apertura"} 95820
operacion_consultas_count{operacion="apertura"} 1022
```

## Salida de k6

```text
time="2026-11-03T00:26:45+01:00" level=warning msg="k6/experimental/websockets is deprecated and will be removed in a future release. Please use k6/websockets instead."

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


Run       [ 100% ] setup()
humanos   [   0% ]

Run       [ 100% ] setup()
humanos   [   0% ]

running (00m03.0s), 73/73 VUs, 0 complete and 0 interrupted iterations
humanos   [   0% ] 73 VUs  00m00.9s/40m0s  00/73 iters, 1 per VU

running (00m04.0s), 73/73 VUs, 0 complete and 0 interrupted iterations
humanos   [   0% ] 73 VUs  00m01.9s/40m0s  00/73 iters, 1 per VU

running (00m05.0s), 73/73 VUs, 0 complete and 0 interrupted iterations
humanos   [   0% ] 73 VUs  00m02.9s/40m0s  00/73 iters, 1 per VU

running (00m06.0s), 73/73 VUs, 0 complete and 0 interrupted iterations
humanos   [   0% ] 73 VUs  00m03.9s/40m0s  00/73 iters, 1 per VU

running (00m07.0s), 73/73 VUs, 0 complete and 0 interrupted iterations
humanos   [   0% ] 73 VUs  00m04.9s/40m0s  00/73 iters, 1 per VU

running (00m08.0s), 73/73 VUs, 0 complete and 0 interrupted iterations
humanos   [   0% ] 73 VUs  00m05.9s/40m0s  00/73 iters, 1 per VU

running (00m09.0s), 73/73 VUs, 0 complete and 0 interrupted iterations
humanos   [   0% ] 73 VUs  00m06.9s/40m0s  00/73 iters, 1 per VU

running (00m10.1s), 73/73 VUs, 0 complete and 0 interrupted iterations
humanos   [   0% ] 73 VUs  00m08.1s/40m0s  00/73 iters, 1 per VU

running (00m11.0s), 73/73 VUs, 0 complete and 0 interrupted iterations
humanos   [   0% ] 73 VUs  00m08.9s/40m0s  00/73 iters, 1 per VU

running (00m12.0s), 73/73 VUs, 0 complete and 0 interrupted iterations
humanos   [   0% ] 73 VUs  00m09.9s/40m0s  00/73 iters, 1 per VU

running (00m13.0s), 73/73 VUs, 0 complete and 0 interrupted iterations
humanos   [   0% ] 73 VUs  00m10.9s/40m0s  00/73 iters, 1 per VU

running (00m14.0s), 73/73 VUs, 0 complete and 0 interrupted iterations
humanos   [   0% ] 73 VUs  00m11.9s/40m0s  00/73 iters, 1 per VU

running (00m15.0s), 73/73 VUs, 0 complete and 0 interrupted iterations
humanos   [   0% ] 73 VUs  00m12.9s/40m0s  00/73 iters, 1 per VU

running (00m16.0s), 73/73 VUs, 0 complete and 0 interrupted iterations
humanos   [   0% ] 73 VUs  00m13.9s/40m0s  00/73 iters, 1 per VU

running (00m17.0s), 73/73 VUs, 0 complete and 0 interrupted iterations
humanos   [   0% ] 73 VUs  00m14.9s/40m0s  00/73 iters, 1 per VU

running (00m18.0s), 73/73 VUs, 0 complete and 0 interrupted iterations
humanos   [   0% ] 73 VUs  00m15.9s/40m0s  00/73 iters, 1 per VU

running (00m19.0s), 73/73 VUs, 0 complete and 0 interrupted iterations
humanos   [   0% ] 73 VUs  00m16.9s/40m0s  00/73 iters, 1 per VU

running (00m20.0s), 73/73 VUs, 0 complete and 0 interrupted iterations
humanos   [   0% ] 73 VUs  00m17.9s/40m0s  00/73 iters, 1 per VU

running (00m21.0s), 73/73 VUs, 0 complete and 0 interrupted iterations
humanos   [   0% ] 73 VUs  00m18.9s/40m0s  00/73 iters, 1 per VU

running (00m22.0s), 73/73 VUs, 0 complete and 0 interrupted iterations
humanos   [   0% ] 73 VUs  00m19.9s/40m0s  00/73 iters, 1 per VU

running (00m23.0s), 73/73 VUs, 0 complete and 0 interrupted iterations
humanos   [   0% ] 73 VUs  00m20.9s/40m0s  00/73 iters, 1 per VU

running (00m24.0s), 73/73 VUs, 0 complete and 0 interrupted iterations
humanos   [   0% ] 73 VUs  00m21.9s/40m0s  00/73 iters, 1 per VU

running (00m25.0s), 73/73 VUs, 0 complete and 0 interrupted iterations
humanos   [   0% ] 73 VUs  00m22.9s/40m0s  00/73 iters, 1 per VU

running (00m26.0s), 73/73 VUs, 0 complete and 0 interrupted iterations
humanos   [   0% ] 73 VUs  00m23.9s/40m0s  00/73 iters, 1 per VU

running (00m27.0s), 73/73 VUs, 0 complete and 0 interrupted iterations
humanos   [   0% ] 73 VUs  00m24.9s/40m0s  00/73 iters, 1 per VU

running (00m28.0s), 73/73 VUs, 0 complete and 0 interrupted iterations
humanos   [   0% ] 73 VUs  00m25.9s/40m0s  00/73 iters, 1 per VU

running (00m29.0s), 73/73 VUs, 0 complete and 0 interrupted iterations
humanos   [   0% ] 73 VUs  00m26.9s/40m0s  00/73 iters, 1 per VU

running (00m30.0s), 73/73 VUs, 0 complete and 0 interrupted iterations
humanos   [   0% ] 73 VUs  00m27.9s/40m0s  00/73 iters, 1 per VU

running (00m31.0s), 73/73 VUs, 0 complete and 0 interrupted iterations
humanos   [   0% ] 73 VUs  00m28.9s/40m0s  00/73 iters, 1 per VU

running (00m32.0s), 57/73 VUs, 16 complete and 0 interrupted iterations
humanos   [  22% ] 73 VUs  00m29.9s/40m0s  16/73 iters, 1 per VU


  █ THRESHOLDS 

    apertura_ms
    ✓ 'p(95)<3000' p(95)=2.72s

    descanso_ms
    ✓ 'p(95)<3000' p(95)=6.09ms

    entrega_sobre_ms
    ✓ 'p(95)<1000' p(95)=215ms

    errores_ws
    ✓ 'count==0' count=0

    final_ms
    ✓ 'p(95)<3000' p(95)=364.1ms

    http_req_failed
    ✓ 'rate<0.01' rate=0.00%

    jornada_npc_ms
    ✓ 'p(95)<10000' p(95)=463.9ms

    partidas_bloqueadas
    ✓ 'count==0' count=0

    partidas_terminadas
    ✓ 'count>=10' count=10


  █ TOTAL RESULTS 

    checks_total.......: 156     4.734808/s
    checks_succeeded...: 100.00% 156 out of 156
    checks_failed......: 0.00%   0 out of 156

    ✓ usuario creado
    ✓ partida creada
    ✓ unido a la partida
    ✓ draft iniciado

    CUSTOM
    apertura_ms....................: avg=1.64s    min=164.67ms med=1.72s   max=4.17s   p(90)=2s      p(95)=2.72s  
    descanso_ms....................: avg=3.28ms   min=1ms      med=3ms     max=10ms    p(90)=4ms     p(95)=6.09ms 
    entrega_sobre_ms...............: avg=129.81ms min=50ms     med=120ms   max=241ms   p(90)=185ms   p(95)=215ms  
    errores_ws.....................: 0      0/s
    final_ms.......................: avg=259.92ms min=169ms    med=249ms   max=407ms   p(90)=324.8ms p(95)=364.1ms
    jornada_npc_ms.................: avg=368.5ms  min=234ms    med=365.5ms max=525ms   p(90)=429.8ms p(95)=463.9ms
    partidas_bloqueadas............: 0      0/s
    partidas_terminadas............: 10     0.303513/s

    HTTP
    http_req_duration..............: avg=1.43s    min=5.61ms   med=1.69s   max=4.17s   p(90)=1.98s   p(95)=2.67s  
      { expected_response:true }...: avg=1.43s    min=5.61ms   med=1.69s   max=4.17s   p(90)=1.98s   p(95)=2.67s  
    http_req_failed................: 0.00%  0 out of 1192
    http_reqs......................: 1192   36.178793/s

    EXECUTION
    iteration_duration.............: avg=30.16s   min=29.58s   med=30.09s  max=30.81s  p(90)=30.74s  p(95)=30.81s 
    iterations.....................: 73     2.215648/s
    vus............................: 57     min=0         max=73
    vus_max........................: 73     min=73        max=73

    NETWORK
    data_received..................: 128 MB 3.9 MB/s
    data_sent......................: 638 kB 19 kB/s

    WEBSOCKET
    ws_connecting..................: avg=8.04ms   min=1.02ms   med=7.29ms  max=19.32ms p(90)=14.42ms p(95)=15.6ms 
    ws_msgs_received...............: 25127  762.638025/s
    ws_msgs_sent...................: 1853   56.241026/s
    ws_session_duration............: avg=30.01s   min=29.5s    med=29.93s  max=30.56s  p(90)=30.48s  p(95)=30.54s 
    ws_sessions....................: 73     2.215648/s




running (00m32.9s), 00/73 VUs, 73 complete and 0 interrupted iterations
humanos ✓ [ 100% ] 73 VUs  00m30.8s/40m0s  73/73 iters, 1 per VU
```
