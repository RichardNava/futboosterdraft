# Resultado de prueba de carga — 100 partidas tras US3 (entorno de referencia)

Tras US3 (T028–T029: cierre de turno del draft en una transacción). Entorno de referencia, el mismo de
[referencia-100-us2](referencia-100-us2.md): servidor, PostgreSQL 16 nativo en Windows y k6 en el mismo equipo (equipo B), por
cable, sin Docker Desktop. Condiciones pedidas: servidor recién arrancado con `tsx`, sin watch y sin `SMTP_URL`. Medido por la persona el
2026-11-03 (T032). La salida se capturó con PowerShell; aquí se quitan el aviso de `NativeCommandError` y las líneas de
progreso, y se unen las líneas partidas a 120 columnas.

## Salida de k6

```text
k6 run -e PARTIDAS=100 -e APERTURA_MAX_S=0 -e METRICAS_URL=http://localhost:3000/metrics tools/load/beta-100.js
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

WARN Request Failed error="Post "http://localhost:3000/api/partidas/4eb57fe5-1f6e-468b-8366-83e189ca0820/siguiente-jornada": request timeout"
WARN Request Failed error="Post "http://localhost:3000/api/partidas/705c5c06-c50c-4d43-85e2-bd6036b98036/siguiente-jornada": request timeout"
WARN Request Failed error="Post "http://localhost:3000/api/partidas/e373c8fd-183e-4779-b8e5-bfef96dd545f/siguiente-jornada": request timeout"
WARN Request Failed error="Post "http://localhost:3000/api/partidas/5148d6f3-b5d0-43ed-a030-c08706c62c9c/siguiente-jornada": request timeout"
WARN Request Failed error="Post "http://localhost:3000/api/partidas/fd31fce9-aefe-4430-bf7a-b342feaba44a/siguiente-jornada": request timeout"
WARN Request Failed error="Post "http://localhost:3000/api/partidas/85ed6e7a-0165-41c5-8046-6c624d388b79/siguiente-jornada": request timeout"
WARN Request Failed error="Post "http://localhost:3000/api/partidas/836e40ea-08b8-4952-b179-c23ba339d703/siguiente-jornada": request timeout"
WARN Request Failed error="Post "http://localhost:3000/api/partidas/b486687c-8601-48a6-8245-bcc53617cb3f/siguiente-jornada": request timeout"

WARN Request Failed error="Post "http://localhost:3000/api/partidas/8a5a6b1d-b6ee-4b4c-a87f-9caae8f348a7/siguiente-jornada": request timeout"

INFO Desglose por fases (http://localhost:3000/metrics):
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="cola"} 274.5660541829512
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="cola"} 728.2812686256774
operacion_fase_ms_sum{operacion="eleccion",fase="cola"} 4645615.524799999
operacion_fase_ms_count{operacion="eleccion",fase="cola"} 15120
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="calculo"} 0
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="calculo"} 0
operacion_fase_ms_sum{operacion="eleccion",fase="calculo"} 0
operacion_fase_ms_count{operacion="eleccion",fase="calculo"} 15120
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="bd"} 302.83905992019925
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="bd"} 573.1362236691978
operacion_fase_ms_sum{operacion="eleccion",fase="bd"} 4984688.377400016
operacion_fase_ms_count{operacion="eleccion",fase="bd"} 15120
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="serializacion"} 0.03849255814064098
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="serializacion"} 0.05176194332049085
operacion_fase_ms_sum{operacion="eleccion",fase="serializacion"} 610.2340999988664
operacion_fase_ms_count{operacion="eleccion",fase="serializacion"} 15120
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="difusion"} 0.22037674675810182
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="difusion"} 0.28371249999781867
operacion_fase_ms_sum{operacion="eleccion",fase="difusion"} 3529.4481000005617
operacion_fase_ms_count{operacion="eleccion",fase="difusion"} 15120
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="resto"} 0.4113618604619957
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="resto"} 0.6371241966141639
operacion_fase_ms_sum{operacion="eleccion",fase="resto"} 6777.199699999968
operacion_fase_ms_count{operacion="eleccion",fase="resto"} 15120
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="total"} 610.7356137810846
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="total"} 1143.2989904765732
operacion_fase_ms_sum{operacion="eleccion",fase="total"} 9641220.784099996
operacion_fase_ms_count{operacion="eleccion",fase="total"} 15120
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="cola"} 648.443400051945
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="cola"} 1177.0662257142847
operacion_fase_ms_sum{operacion="entrega_sobre",fase="cola"} 1542519.4601999992
operacion_fase_ms_count{operacion="entrega_sobre",fase="cola"} 2400
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="calculo"} 0.05176018475883965
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="calculo"} 1.817772222216364
operacion_fase_ms_sum{operacion="entrega_sobre",fase="calculo"} 20306.24570000003
operacion_fase_ms_count{operacion="entrega_sobre",fase="calculo"} 2400
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="bd"} 376.3448820987653
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="bd"} 1026.1893249999957
operacion_fase_ms_sum{operacion="entrega_sobre",fase="bd"} 1600598.6905999968
operacion_fase_ms_count{operacion="entrega_sobre",fase="bd"} 2400
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="serializacion"} 0.4441227272671478
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="serializacion"} 0.7592799999911222
operacion_fase_ms_sum{operacion="entrega_sobre",fase="serializacion"} 1644.2021999988501
operacion_fase_ms_count{operacion="entrega_sobre",fase="serializacion"} 2400
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="difusion"} 0.8101556276982497
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="difusion"} 1.2067499999902793
operacion_fase_ms_sum{operacion="entrega_sobre",fase="difusion"} 2804.193800000008
operacion_fase_ms_count{operacion="entrega_sobre",fase="difusion"} 2400
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="resto"} 0.9756355555640767
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="resto"} 3.023864285721218
operacion_fase_ms_sum{operacion="entrega_sobre",fase="resto"} 6835.4677000015945
operacion_fase_ms_count{operacion="entrega_sobre",fase="resto"} 2400
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="total"} 1027.395965698652
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="total"} 2421.7796500000018
operacion_fase_ms_sum{operacion="entrega_sobre",fase="total"} 3174688.327799999
operacion_fase_ms_count{operacion="entrega_sobre",fase="total"} 2400
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="cola"} 2546.825293015962
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="cola"} 6112.697676535305
operacion_fase_ms_sum{operacion="apertura",fase="cola"} 27394350.199699976
operacion_fase_ms_count{operacion="apertura",fase="cola"} 10220
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="calculo"} 392.9816061373637
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="calculo"} 5325.631320574162
operacion_fase_ms_sum{operacion="apertura",fase="calculo"} 12791403.111599797
operacion_fase_ms_count{operacion="apertura",fase="calculo"} 10220
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="bd"} 11048.678832520016
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="bd"} 13065.800799812347
operacion_fase_ms_sum{operacion="apertura",fase="bd"} 88627592.89499982
operacion_fase_ms_count{operacion="apertura",fase="bd"} 10220
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="serializacion"} 0.06977733330975881
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="serializacion"} 2.262301319158467
operacion_fase_ms_sum{operacion="apertura",fase="serializacion"} 5016.275699963735
operacion_fase_ms_count{operacion="apertura",fase="serializacion"} 10220
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="difusion"} 0.4998207756120956
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="difusion"} 3.2252484520087634
operacion_fase_ms_sum{operacion="apertura",fase="difusion"} 9649.086499973084
operacion_fase_ms_count{operacion="apertura",fase="difusion"} 10220
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="resto"} 18.60951495761005
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="resto"} 47.50842211872676
operacion_fase_ms_sum{operacion="apertura",fase="resto"} 200864.83480007784
operacion_fase_ms_count{operacion="apertura",fase="resto"} 10220
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="total"} 14315.464154862775
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="total"} 16067.592724552433
operacion_fase_ms_sum{operacion="apertura",fase="total"} 128996286.06850022
operacion_fase_ms_count{operacion="apertura",fase="total"} 10220
operacion_consultas{quantile="0.5",operacion="eleccion"} 3
operacion_consultas{quantile="0.95",operacion="eleccion"} 3
operacion_consultas_sum{operacion="eleccion"} 45360
operacion_consultas_count{operacion="eleccion"} 15120
operacion_consultas{quantile="0.5",operacion="entrega_sobre"} 9.435274403016338
operacion_consultas{quantile="0.95",operacion="entrega_sobre"} 83.63720150816926
operacion_consultas_sum{operacion="entrega_sobre"} 22767
operacion_consultas_count{operacion="entrega_sobre"} 2400
operacion_consultas{quantile="0.5",operacion="apertura"} 103.64871794871794
operacion_consultas{quantile="0.95",operacion="apertura"} 120.73333333333333
operacion_consultas_sum{operacion="apertura"} 962685
operacion_consultas_count{operacion="apertura"} 10220

  █ THRESHOLDS

    apertura_ms
    ✗ 'p(95)<3000' p(95)=16.6s

    descanso_ms
    ✓ 'p(95)<3000' p(95)=16ms

    entrega_sobre_ms
    ✗ 'p(95)<1000' p(95)=1.76s

    errores_ws
    ✓ 'count==0' count=0

    final_ms
    ✓ 'p(95)<3000' p(95)=2.15s

    http_req_failed
    ✓ 'rate<0.01' rate=0.07%

    jornada_npc_ms
    ✓ 'p(95)<10000' p(95)=4.48s

    partidas_bloqueadas
    ✓ 'count==0' count=0

    partidas_terminadas
    ✓ 'count>=100' count=100

  █ TOTAL RESULTS

    checks_total.......: 1560    5.888988/s
    checks_succeeded...: 100.00% 1560 out of 1560
    checks_failed......: 0.00%   0 out of 1560

    ✓ usuario creado
    ✓ partida creada
    ✓ unido a la partida
    ✓ draft iniciado

    CUSTOM
    apertura_ms....................: avg=13.05s min=90.87ms med=14.75s  max=19.06s   p(90)=16.36s  p(95)=16.6s
    descanso_ms....................: avg=4.61ms min=0s      med=3ms     max=78ms     p(90)=15ms    p(95)=16ms
    entrega_sobre_ms...............: avg=1s     min=119ms   med=932ms   max=2.49s    p(90)=1.29s   p(95)=1.76s
    errores_ws.....................: 0      0/s
    final_ms.......................: avg=1.06s  min=71ms    med=958.5ms max=6.36s    p(90)=2.02s   p(95)=2.15s
    jornada_npc_ms.................: avg=2.15s  min=97ms    med=1.89s   max=6.62s    p(90)=4.3s    p(95)=4.48s
    partidas_bloqueadas............: 0      0/s
    partidas_terminadas............: 100    0.377499/s

    HTTP
    http_req_duration..............: avg=11.35s min=2.68ms  med=14.34s  max=1m0s     p(90)=16.31s  p(95)=16.56s
      { expected_response:true }...: avg=11.31s min=2.68ms  med=14.33s  max=45.47s   p(90)=16.3s   p(95)=16.56s
    http_req_failed................: 0.07%  9 out of 11911
    http_reqs......................: 11911  44.96393/s

    EXECUTION
    iteration_duration.............: avg=3m57s  min=3m52s   med=3m57s   max=4m6s     p(90)=3m58s   p(95)=3m58s
    iterations.....................: 730    2.755744/s
    vus............................: 10     min=0          max=730
    vus_max........................: 730    min=730        max=730

    NETWORK
    data_received..................: 1.3 GB 4.8 MB/s
    data_sent......................: 6.4 MB 24 kB/s

    WEBSOCKET
    ws_connecting..................: avg=27.2ms min=0s      med=26.12ms max=100.98ms p(90)=39.53ms p(95)=46.88ms
    ws_msgs_received...............: 251063 947.760831/s
    ws_msgs_sent...................: 18530  69.950603/s
    ws_session_duration............: avg=3m55s  min=3m52s   med=3m55s   max=4m3s     p(90)=3m56s   p(95)=3m56s
    ws_sessions....................: 730    2.755744/s

INFO thresholds on metrics 'apertura_ms, entrega_sobre_ms' have been crossed

running (04m24.9s), 000/730 VUs, 730 complete and 0 interrupted iterations
humanos ✓ [ 100% ] 730 VUs  04m06.6s/40m0s  730/730 iters, 1 per VU
```
