# Resultado de prueba de carga — 10 partidas tras US2 (entorno de referencia)

Tras US2 (T017–T026: grupo de aperturas y `emitirTorneo` con datos comunes). Entorno de referencia, el mismo de
[referencia-10](referencia-10.md): servidor, PostgreSQL 16 nativo en Windows y k6 en el mismo equipo, sin Docker Desktop.
Medido por la persona el 2026-11-03 (T027).

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

INFO[0034] Desglose por fases (http://localhost:3000/metrics):
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="cola"} 24.215624866310204
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="cola"} 56.28466133333779
operacion_fase_ms_sum{operacion="eleccion",fase="cola"} 38495.43689999898
operacion_fase_ms_count{operacion="eleccion",fase="cola"} 1512
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="calculo"} 0
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="calculo"} 0
operacion_fase_ms_sum{operacion="eleccion",fase="calculo"} 0
operacion_fase_ms_count{operacion="eleccion",fase="calculo"} 1512
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="bd"} 24.687373611101872
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="bd"} 43.56015866668234
operacion_fase_ms_sum{operacion="eleccion",fase="bd"} 40240.041799999075
operacion_fase_ms_count{operacion="eleccion",fase="bd"} 1512
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="serializacion"} 0.036364814798336156
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="serializacion"} 0.05806000003228998
operacion_fase_ms_sum{operacion="eleccion",fase="serializacion"} 58.86949999490753
operacion_fase_ms_count{operacion="eleccion",fase="serializacion"} 1512
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="difusion"} 0.22878480388730987
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="difusion"} 0.3683878332762589
operacion_fase_ms_sum{operacion="eleccion",fase="difusion"} 383.6149999977788
operacion_fase_ms_count{operacion="eleccion",fase="difusion"} 1512
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="resto"} 0.4869663398706691
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="resto"} 0.9051230001723161
operacion_fase_ms_sum{operacion="eleccion",fase="resto"} 827.0104000088177
operacion_fase_ms_count{operacion="eleccion",fase="resto"} 1512
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="total"} 51.22905416666929
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="total"} 89.18398666670059
operacion_fase_ms_sum{operacion="eleccion",fase="total"} 80004.97359999956
operacion_fase_ms_count{operacion="eleccion",fase="total"} 1512
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="cola"} 54.287800000000665
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="cola"} 86.39564999999129
operacion_fase_ms_sum{operacion="entrega_sobre",fase="cola"} 12557.516899999348
operacion_fase_ms_count{operacion="entrega_sobre",fase="cola"} 240
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="calculo"} 0.08735115208323993
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="calculo"} 1.5473500000371132
operacion_fase_ms_sum{operacion="entrega_sobre",fase="calculo"} 659.0547000004444
operacion_fase_ms_count{operacion="entrega_sobre",fase="calculo"} 240
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="bd"} 51.43679999994735
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="bd"} 179.93974999990314
operacion_fase_ms_sum{operacion="entrega_sobre",fase="bd"} 19802.53029999876
operacion_fase_ms_count{operacion="entrega_sobre",fase="bd"} 240
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="serializacion"} 0.4467500001483131
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="serializacion"} 1.5841999999247491
operacion_fase_ms_sum{operacion="entrega_sobre",fase="serializacion"} 196.01410000014585
operacion_fase_ms_count{operacion="entrega_sobre",fase="serializacion"} 240
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="difusion"} 0.8872499998736506
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="difusion"} 2.0603999998420477
operacion_fase_ms_sum{operacion="entrega_sobre",fase="difusion"} 325.8047999981791
operacion_fase_ms_count{operacion="entrega_sobre",fase="difusion"} 240
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="resto"} 1.1719500000763219
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="resto"} 5.083550000068499
operacion_fase_ms_sum{operacion="entrega_sobre",fase="resto"} 750.277600002999
operacion_fase_ms_count{operacion="entrega_sobre",fase="resto"} 240
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="total"} 107.02669999998761
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="total"} 224.99345000000903
operacion_fase_ms_sum{operacion="entrega_sobre",fase="total"} 34291.19839999988
operacion_fase_ms_count{operacion="entrega_sobre",fase="total"} 240
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="cola"} 463.96389523809364
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="cola"} 899.8658399999839
operacion_fase_ms_sum{operacion="apertura",fase="cola"} 433298.2254999999
operacion_fase_ms_count{operacion="apertura",fase="cola"} 1022
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="calculo"} 310.45534999999416
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="calculo"} 1153.123894999997
operacion_fase_ms_sum{operacion="apertura",fase="calculo"} 384221.5443999999
operacion_fase_ms_count{operacion="apertura",fase="calculo"} 1022
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="bd"} 908.339950000029
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="bd"} 1120.2853299999654
operacion_fase_ms_sum{operacion="apertura",fase="bd"} 702719.2149999696
operacion_fase_ms_count{operacion="apertura",fase="bd"} 1022
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="serializacion"} 0.07429134607865798
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="serializacion"} 2.516692500123463
operacion_fase_ms_sum{operacion="apertura",fase="serializacion"} 583.074000000779
operacion_fase_ms_count{operacion="apertura",fase="serializacion"} 1022
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="difusion"} 0.5732392856734805
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="difusion"} 3.663964999882349
operacion_fase_ms_sum{operacion="apertura",fase="difusion"} 1052.0771999976132
operacion_fase_ms_count{operacion="apertura",fase="difusion"} 1022
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="resto"} 41.117300000019895
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="resto"} 75.67217999992427
operacion_fase_ms_sum{operacion="apertura",fase="resto"} 40564.740500031796
operacion_fase_ms_count{operacion="apertura",fase="resto"} 1022
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="total"} 1763.4292680555534
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="total"} 2151.603893333332
operacion_fase_ms_sum{operacion="apertura",fase="total"} 1562434.9609000015
operacion_fase_ms_count{operacion="apertura",fase="total"} 1022
operacion_consultas{quantile="0.5",operacion="eleccion"} 3
operacion_consultas{quantile="0.95",operacion="eleccion"} 3
operacion_consultas_sum{operacion="eleccion"} 4536
operacion_consultas_count{operacion="eleccion"} 1512
operacion_consultas{quantile="0.5",operacion="entrega_sobre"} 6.223684210526316
operacion_consultas{quantile="0.95",operacion="entrega_sobre"} 7.951219512195122
operacion_consultas_sum{operacion="entrega_sobre"} 2320
operacion_consultas_count{operacion="entrega_sobre"} 240
operacion_consultas{quantile="0.5",operacion="apertura"} 103.19466248037676
operacion_consultas{quantile="0.95",operacion="apertura"} 116.86666666666666
operacion_consultas_sum{operacion="apertura"} 88408
operacion_consultas_count{operacion="apertura"} 1022  source=console


  █ THRESHOLDS

    apertura_ms
    ✓ 'p(95)<3000' p(95)=2.46s

    descanso_ms
    ✓ 'p(95)<3000' p(95)=10.99ms

    entrega_sobre_ms
    ✓ 'p(95)<1000' p(95)=200ms

    errores_ws
    ✓ 'count==0' count=0

    final_ms
    ✓ 'p(95)<3000' p(95)=488.85ms

    http_req_failed
    ✓ 'rate<0.01' rate=0.00%

    jornada_npc_ms
    ✓ 'p(95)<10000' p(95)=561.19ms

    partidas_bloqueadas
    ✓ 'count==0' count=0

    partidas_terminadas
    ✓ 'count>=10' count=10


  █ TOTAL RESULTS

    checks_total.......: 156     4.534354/s
    checks_succeeded...: 100.00% 156 out of 156
    checks_failed......: 0.00%   0 out of 156

    ✓ usuario creado
    ✓ partida creada
    ✓ unido a la partida
    ✓ draft iniciado

    CUSTOM
    apertura_ms....................: avg=1.66s    min=117.65ms med=1.85s   max=4.51s   p(90)=2.12s   p(95)=2.46s
    descanso_ms....................: avg=4.07ms   min=2ms      med=2.5ms   max=24ms    p(90)=3.7ms   p(95)=10.99ms
    entrega_sobre_ms...............: avg=119.98ms min=44ms     med=109ms   max=295ms   p(90)=172ms   p(95)=200ms
    errores_ws.....................: 0      0/s
    final_ms.......................: avg=296.71ms min=146ms    med=312.5ms max=496ms   p(90)=444.5ms p(95)=488.85ms
    jornada_npc_ms.................: avg=402.21ms min=184ms    med=408.5ms max=673ms   p(90)=498.9ms p(95)=561.19ms
    partidas_bloqueadas............: 0      0/s
    partidas_terminadas............: 10     0.290664/s

    HTTP
    http_req_duration..............: avg=1.45s    min=6.22ms   med=1.77s   max=4.51s   p(90)=2.09s   p(95)=2.25s
      { expected_response:true }...: avg=1.45s    min=6.22ms   med=1.77s   max=4.51s   p(90)=2.09s   p(95)=2.25s
    http_req_failed................: 0.00%  0 out of 1192
    http_reqs......................: 1192   34.647118/s

    EXECUTION
    iteration_duration.............: avg=31.42s   min=29.26s   med=31.62s  max=32.24s  p(90)=32.22s  p(95)=32.24s
    iterations.....................: 73     2.121845/s
    vus............................: 33     min=0         max=73
    vus_max........................: 73     min=73        max=73

    NETWORK
    data_received..................: 129 MB 3.8 MB/s
    data_sent......................: 639 kB 19 kB/s

    WEBSOCKET
    ws_connecting..................: avg=13.46ms  min=0s       med=10.7ms  max=38.22ms p(90)=30.4ms  p(95)=32.32ms
    ws_msgs_received...............: 25191  732.211035/s
    ws_msgs_sent...................: 1853   53.859992/s
    ws_session_duration............: avg=31.27s   min=29.05s   med=31.52s  max=32.12s  p(90)=32.08s  p(95)=32.11s
    ws_sessions....................: 73     2.121845/s




running (00m34.4s), 00/73 VUs, 73 complete and 0 interrupted iterations
humanos ✓ [======================================] 73 VUs  00m32.3s/40m0s  73/73 iters, 1 per VU
```
