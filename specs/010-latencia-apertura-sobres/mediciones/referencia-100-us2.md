# Resultado de prueba de carga — 100 partidas tras US2 (entorno de referencia)

Tras US2 (T017–T026: grupo de aperturas y `emitirTorneo` con datos comunes). Entorno de referencia, el mismo de
[referencia-100](referencia-100.md): servidor, PostgreSQL 16 nativo en Windows y k6 en el mismo equipo, sin Docker Desktop.
Medido por la persona el 2026-11-03 (T027).

## Salida de k6

```text
WARN[0114] Request Failed                                error="Post \"http://localhost:3000/api/partidas/b08d4d20-c2b7-4f09-bd7b-89d0f20d59f4/siguiente-jornada\": request timeout"
WARN[0114] Request Failed                                error="Post \"http://localhost:3000/api/partidas/470d7b6a-e0e4-4eca-a7ad-6397eacda9a2/siguiente-jornada\": request timeout"
WARN[0115] Request Failed                                error="Post \"http://localhost:3000/api/partidas/662dd47c-a9d6-441f-888a-6f15c269281b/siguiente-jornada\": request timeout"
WARN[0115] Request Failed                                error="Post \"http://localhost:3000/api/partidas/739cb1d2-f545-4a5c-bee6-dcc011b7274b/siguiente-jornada\": request timeout"
WARN[0115] Request Failed                                error="Post \"http://localhost:3000/api/partidas/0adc48b3-0daf-4835-ba7b-424980b921cd/siguiente-jornada\": request timeout"
WARN[0115] Request Failed                                error="Post \"http://localhost:3000/api/partidas/2d653c0e-f871-45ef-af96-6d8a9824c1bd/siguiente-jornada\": request timeout"
WARN[0115] Request Failed                                error="Post \"http://localhost:3000/api/partidas/0f9d4984-39a8-4a97-8461-f88006712bc9/siguiente-jornada\": request timeout"
WARN[0115] Request Failed                                error="Post \"http://localhost:3000/api/partidas/e09ed0a5-c3ef-4f30-9920-e4796098649d/siguiente-jornada\": request timeout"
WARN[0116] Request Failed                                error="Post \"http://localhost:3000/api/partidas/b09c974d-2b44-42cc-95d5-cf7faca79aea/siguiente-jornada\": request timeout"
WARN[0116] Request Failed                                error="Post \"http://localhost:3000/api/partidas/31946d91-9a55-4ab3-8023-e56a812bce28/siguiente-jornada\": request timeout"
INFO[0281] Desglose por fases (http://localhost:3000/metrics):
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="cola"} 224.3211936722736
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="cola"} 589.2688445054961
operacion_fase_ms_sum{operacion="eleccion",fase="cola"} 4172660.532299999
operacion_fase_ms_count{operacion="eleccion",fase="cola"} 16632
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="calculo"} 0
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="calculo"} 0
operacion_fase_ms_sum{operacion="eleccion",fase="calculo"} 0
operacion_fase_ms_count{operacion="eleccion",fase="calculo"} 16632
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="bd"} 264.74109034093823
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="bd"} 454.11809555826943
operacion_fase_ms_sum{operacion="eleccion",fase="bd"} 4338396.552900007
operacion_fase_ms_count{operacion="eleccion",fase="bd"} 16632
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="serializacion"} 0.0354634924288639
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="serializacion"} 0.05244302705493123
operacion_fase_ms_sum{operacion="eleccion",fase="serializacion"} 642.6004999947618
operacion_fase_ms_count{operacion="eleccion",fase="serializacion"} 16632
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="difusion"} 0.21971025158314217
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="difusion"} 0.31719723063628547
operacion_fase_ms_sum{operacion="eleccion",fase="difusion"} 3881.4021000002977
operacion_fase_ms_count{operacion="eleccion",fase="difusion"} 16632
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="resto"} 0.42202021911493415
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="resto"} 0.6777160082310091
operacion_fase_ms_sum{operacion="eleccion",fase="resto"} 7571.51850000961
operacion_fase_ms_count{operacion="eleccion",fase="resto"} 16632
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="total"} 507.180312607282
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="total"} 950.0111887133257
operacion_fase_ms_sum{operacion="eleccion",fase="total"} 8523152.606300067
operacion_fase_ms_count{operacion="eleccion",fase="total"} 16632
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="cola"} 594.6663569696931
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="cola"} 931.5906749999922
operacion_fase_ms_sum{operacion="entrega_sobre",fase="cola"} 1401383.704299998
operacion_fase_ms_count{operacion="entrega_sobre",fase="cola"} 2640
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="calculo"} 0.0407212783839621
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="calculo"} 1.4576499999675434
operacion_fase_ms_sum{operacion="entrega_sobre",fase="calculo"} 7294.133300000278
operacion_fase_ms_count{operacion="entrega_sobre",fase="calculo"} 2640
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="bd"} 405.5321526806355
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="bd"} 720.8435933333492
operacion_fase_ms_sum{operacion="entrega_sobre",fase="bd"} 1685209.543399993
operacion_fase_ms_count{operacion="entrega_sobre",fase="bd"} 2640
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="serializacion"} 0.4411874999932479
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="serializacion"} 1.1109274999907939
operacion_fase_ms_sum{operacion="entrega_sobre",fase="serializacion"} 1959.9273999978905
operacion_fase_ms_count{operacion="entrega_sobre",fase="serializacion"} 2640
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="difusion"} 0.8129523529159494
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="difusion"} 1.4577450000710086
operacion_fase_ms_sum{operacion="entrega_sobre",fase="difusion"} 2990.4117999988957
operacion_fase_ms_count{operacion="entrega_sobre",fase="difusion"} 2640
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="resto"} 1.0510711670985797
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="resto"} 3.2446579999173992
operacion_fase_ms_sum{operacion="entrega_sobre",fase="resto"} 7653.946800012374
operacion_fase_ms_count{operacion="entrega_sobre",fase="resto"} 2640
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="total"} 999.341741485323
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="total"} 1666.1353100000026
operacion_fase_ms_sum{operacion="entrega_sobre",fase="total"} 3106490.371400001
operacion_fase_ms_count{operacion="entrega_sobre",fase="total"} 2640
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="cola"} 2756.1195761368695
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="cola"} 7203.652546124336
operacion_fase_ms_sum{operacion="apertura",fase="cola"} 33769889.84569996
operacion_fase_ms_count{operacion="apertura",fase="cola"} 11242
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="calculo"} 444.77151910008325
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="calculo"} 6855.108711822235
operacion_fase_ms_sum{operacion="apertura",fase="calculo"} 20624858.6395
operacion_fase_ms_count{operacion="apertura",fase="calculo"} 11242
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="bd"} 9142.934738608374
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="bd"} 13634.972582758706
operacion_fase_ms_sum{operacion="apertura",fase="bd"} 86444696.97089964
operacion_fase_ms_count{operacion="apertura",fase="bd"} 11242
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="serializacion"} 0.07208651386205384
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="serializacion"} 2.5323215384166358
operacion_fase_ms_sum{operacion="apertura",fase="serializacion"} 6281.824200014875
operacion_fase_ms_count{operacion="apertura",fase="serializacion"} 11242
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="difusion"} 0.5287920745741105
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="difusion"} 3.4934470368379604
operacion_fase_ms_sum{operacion="apertura",fase="difusion"} 11720.135799971991
operacion_fase_ms_count{operacion="apertura",fase="difusion"} 11242
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="resto"} 24.991221015935622
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="resto"} 54.89725928397149
operacion_fase_ms_sum{operacion="apertura",fase="resto"} 286924.5030000307
operacion_fase_ms_count{operacion="apertura",fase="resto"} 11242
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="total"} 15378.305798378491
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="total"} 17079.040444219103
operacion_fase_ms_sum{operacion="apertura",fase="total"} 141117751.82309985
operacion_fase_ms_count{operacion="apertura",fase="total"} 11242
operacion_consultas{quantile="0.5",operacion="eleccion"} 3
operacion_consultas{quantile="0.95",operacion="eleccion"} 3
operacion_consultas_sum{operacion="eleccion"} 49896
operacion_consultas_count{operacion="eleccion"} 16632
operacion_consultas{quantile="0.5",operacion="entrega_sobre"} 6.223684210526316
operacion_consultas{quantile="0.95",operacion="entrega_sobre"} 7.951219512195122
operacion_consultas_sum{operacion="entrega_sobre"} 25524
operacion_consultas_count{operacion="entrega_sobre"} 2640
operacion_consultas{quantile="0.5",operacion="apertura"} 103.62308825195423
operacion_consultas{quantile="0.95",operacion="apertura"} 115.35686274509803
operacion_consultas_sum{operacion="apertura"} 1051162
operacion_consultas_count{operacion="apertura"} 11242  source=console


  █ THRESHOLDS

    apertura_ms
    ✗ 'p(95)<3000' p(95)=17.58s

    descanso_ms
    ✓ 'p(95)<3000' p(95)=9.14ms

    entrega_sobre_ms
    ✗ 'p(95)<1000' p(95)=1.36s

    errores_ws
    ✓ 'count==0' count=0

    final_ms
    ✓ 'p(95)<3000' p(95)=2.39s

    http_req_failed
    ✓ 'rate<0.01' rate=0.08%

    jornada_npc_ms
    ✓ 'p(95)<10000' p(95)=4.89s

    partidas_bloqueadas
    ✓ 'count==0' count=0

    partidas_terminadas
    ✓ 'count>=100' count=100


  █ TOTAL RESULTS

    checks_total.......: 1560    5.535801/s
    checks_succeeded...: 100.00% 1560 out of 1560
    checks_failed......: 0.00%   0 out of 1560

    ✓ usuario creado
    ✓ partida creada
    ✓ unido a la partida
    ✓ draft iniciado

    CUSTOM
    apertura_ms....................: avg=14.06s   min=73.68ms med=16.05s  max=21.68s   p(90)=17.25s  p(95)=17.58s
    descanso_ms....................: avg=3.94ms   min=1ms     med=3ms     max=35ms     p(90)=6ms     p(95)=9.14ms
    entrega_sobre_ms...............: avg=957.09ms min=21ms    med=932ms   max=2.06s    p(90)=1.21s   p(95)=1.36s
    errores_ws.....................: 0      0/s
    final_ms.......................: avg=1.08s    min=75ms    med=770.5ms max=2.7s     p(90)=2.32s   p(95)=2.39s
    jornada_npc_ms.................: avg=2.17s    min=100ms   med=1.75s   max=5.33s    p(90)=4.73s   p(95)=4.89s
    partidas_bloqueadas............: 0      0/s
    partidas_terminadas............: 100    0.354859/s

    HTTP
    http_req_duration..............: avg=12.21s   min=3.51ms  med=15.56s  max=1m0s     p(90)=17.21s  p(95)=17.53s
      { expected_response:true }...: avg=12.17s   min=3.51ms  med=15.55s  max=22.73s   p(90)=17.21s  p(95)=17.52s
    http_req_failed................: 0.08%  10 out of 11911
    http_reqs......................: 11911  42.267259/s

    EXECUTION
    iteration_duration.............: avg=4m11s    min=3m54s   med=4m12s   max=4m22s    p(90)=4m13s   p(95)=4m13s
    iterations.....................: 730    2.590471/s
    vus............................: 9      min=0           max=730
    vus_max........................: 730    min=730         max=730

    NETWORK
    data_received..................: 1.3 GB 4.5 MB/s
    data_sent......................: 6.4 MB 23 kB/s

    WEBSOCKET
    ws_connecting..................: avg=23.51ms  min=1.08ms  med=22ms    max=282.37ms p(90)=36.51ms p(95)=44.1ms
    ws_msgs_received...............: 251076 890.965854/s
    ws_msgs_sent...................: 18530  65.755378/s
    ws_session_duration............: avg=4m9s     min=3m53s   med=4m10s   max=4m19s    p(90)=4m11s   p(95)=4m11s
    ws_sessions....................: 730    2.590471/s




running (04m41.8s), 000/730 VUs, 730 complete and 0 interrupted iterations
humanos ✓ [======================================] 730 VUs  04m23.3s/40m0s  730/730 iters, 1 per VU
ERRO[0282] thresholds on metrics 'apertura_ms, entrega_sobre_ms' have been crossed
```
