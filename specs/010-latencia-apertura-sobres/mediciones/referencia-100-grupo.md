# Resultado de prueba de carga — 100 partidas tras recortar el grupo de aperturas (entorno de referencia)

Tras los recortes de consultas del grupo de aperturas (T043–T046, de 115 a 39 consultas por grupo). Entorno de referencia, el mismo de
[referencia-100-us3](referencia-100-us3.md): servidor, PostgreSQL 16 nativo en Windows y k6 en el mismo equipo (equipo B), por
cable, sin Docker Desktop. Condiciones pedidas: servidor recién arrancado con `tsx`, sin watch y sin `SMTP_URL`. Medido por la persona el
2026-11-03 (T042). La salida se capturó con PowerShell; aquí se quitan el aviso de `NativeCommandError` y las líneas de
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

WARN Request Failed error="Post "http://localhost:3000/api/partidas/432ceec7-e8ea-4a5e-be06-cb6e72f2a23e/siguiente-jornada": request timeout"
WARN Request Failed error="Post "http://localhost:3000/api/partidas/9211266a-0463-4a10-9c68-0b09be2363e5/siguiente-jornada": request timeout"
WARN Request Failed error="Post "http://localhost:3000/api/partidas/2f335815-de27-4c49-9edd-5f508b7f357d/siguiente-jornada": request timeout"
WARN Request Failed error="Post "http://localhost:3000/api/partidas/a7a308aa-fe9f-4e82-a7c1-4d18f6fde499/siguiente-jornada": request timeout"
WARN Request Failed error="Post "http://localhost:3000/api/partidas/f48bd9dd-4068-435d-baf7-0a8ffae8b5be/siguiente-jornada": request timeout"
WARN Request Failed error="Post "http://localhost:3000/api/partidas/85803864-b0a0-48c0-becd-0b9e83cfbd98/siguiente-jornada": request timeout"
WARN Request Failed error="Post "http://localhost:3000/api/partidas/c3188cb6-2197-4e4c-93a5-fafe6d854538/siguiente-jornada": request timeout"
WARN Request Failed error="Post "http://localhost:3000/api/partidas/fa9e884c-0985-4e0a-80d7-2bb35b8ab8a2/siguiente-jornada": request timeout"

WARN Request Failed error="Post "http://localhost:3000/api/partidas/adfcd2e6-8c38-4a71-8274-636b46e0b875/siguiente-jornada": request timeout"

WARN Request Failed error="Post "http://localhost:3000/api/partidas/8bd0ba73-a19e-4aad-8802-c5bb71a9aed8/siguiente-jornada": request timeout"

INFO Desglose por fases (http://localhost:3000/metrics):
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="cola"} 253.7548913404587
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="cola"} 669.0311067127553
operacion_fase_ms_sum{operacion="eleccion",fase="cola"} 4272536.359899969
operacion_fase_ms_count{operacion="eleccion",fase="cola"} 15120
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="calculo"} 0
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="calculo"} 0
operacion_fase_ms_sum{operacion="eleccion",fase="calculo"} 0
operacion_fase_ms_count{operacion="eleccion",fase="calculo"} 15120
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="bd"} 263.7789332227308
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="bd"} 555.4088359090913
operacion_fase_ms_sum{operacion="eleccion",fase="bd"} 4455282.0129000265
operacion_fase_ms_count{operacion="eleccion",fase="bd"} 15120
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="serializacion"} 0.03405106382933893
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="serializacion"} 0.048907171716917115
operacion_fase_ms_sum{operacion="eleccion",fase="serializacion"} 546.7144999986776
operacion_fase_ms_count{operacion="eleccion",fase="serializacion"} 15120
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="difusion"} 0.1995361244886441
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="difusion"} 0.2684171836240875
operacion_fase_ms_sum{operacion="eleccion",fase="difusion"} 3218.0951999984172
operacion_fase_ms_count{operacion="eleccion",fase="difusion"} 15120
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="resto"} 0.35861551516700185
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="resto"} 0.6013598522165107
operacion_fase_ms_sum{operacion="eleccion",fase="resto"} 6317.462700001983
operacion_fase_ms_count{operacion="eleccion",fase="resto"} 15120
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="total"} 542.3795454609664
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="total"} 1125.9432009936288
operacion_fase_ms_sum{operacion="eleccion",fase="total"} 8737900.64519994
operacion_fase_ms_count{operacion="eleccion",fase="total"} 15120
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="cola"} 586.0346063725486
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="cola"} 1273.7999249999993
operacion_fase_ms_sum{operacion="entrega_sobre",fase="cola"} 1430703.0580000016
operacion_fase_ms_count{operacion="entrega_sobre",fase="cola"} 2400
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="calculo"} 0.036527533547714444
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="calculo"} 1.4942249999985506
operacion_fase_ms_sum{operacion="entrega_sobre",fase="calculo"} 15733.151500000036
operacion_fase_ms_count{operacion="entrega_sobre",fase="calculo"} 2400
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="bd"} 305.68809414285874
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="bd"} 691.0232749999996
operacion_fase_ms_sum{operacion="entrega_sobre",fase="bd"} 1401084.6333999992
operacion_fase_ms_count{operacion="entrega_sobre",fase="bd"} 2400
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="serializacion"} 0.3909218137256247
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="serializacion"} 0.7205500000000029
operacion_fase_ms_sum{operacion="entrega_sobre",fase="serializacion"} 1554.238099999733
operacion_fase_ms_count{operacion="entrega_sobre",fase="serializacion"} 2400
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="difusion"} 0.7536794871819625
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="difusion"} 1.117258333333666
operacion_fase_ms_sum{operacion="entrega_sobre",fase="difusion"} 2588.2737999995225
operacion_fase_ms_count{operacion="entrega_sobre",fase="difusion"} 2400
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="resto"} 0.8624337243429523
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="resto"} 2.6170000000035243
operacion_fase_ms_sum{operacion="entrega_sobre",fase="resto"} 6085.37530000072
operacion_fase_ms_count{operacion="entrega_sobre",fase="resto"} 2400
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="total"} 894.3559640522885
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="total"} 2236.362037301588
operacion_fase_ms_sum{operacion="entrega_sobre",fase="total"} 2857684.386599995
operacion_fase_ms_count{operacion="entrega_sobre",fase="total"} 2400
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="cola"} 4765.794265824175
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="cola"} 6574.502766139571
operacion_fase_ms_sum{operacion="apertura",fase="cola"} 42444388.01620007
operacion_fase_ms_count{operacion="apertura",fase="cola"} 10220
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="calculo"} 3966.3942750889464
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="calculo"} 6480.17218962038
operacion_fase_ms_sum{operacion="apertura",fase="calculo"} 36622595.40810006
operacion_fase_ms_count{operacion="apertura",fase="calculo"} 10220
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="bd"} 2361.606165704723
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="bd"} 8837.553954231187
operacion_fase_ms_sum{operacion="apertura",fase="bd"} 34500159.633700095
operacion_fase_ms_count{operacion="apertura",fase="bd"} 10220
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="serializacion"} 0.03574912281816835
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="serializacion"} 2.24098495651192
operacion_fase_ms_sum{operacion="apertura",fase="serializacion"} 4660.3182999981145
operacion_fase_ms_count{operacion="apertura",fase="serializacion"} 10220
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="difusion"} 0.27171710009484434
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="difusion"} 2.811534467534258
operacion_fase_ms_sum{operacion="apertura",fase="difusion"} 7088.7347000056325
operacion_fase_ms_count{operacion="apertura",fase="difusion"} 10220
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="resto"} 53.72155819584605
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="resto"} 81.5735084352939
operacion_fase_ms_sum{operacion="apertura",fase="resto"} 513953.6132999804
operacion_fase_ms_count{operacion="apertura",fase="resto"} 10220
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="total"} 12135.48308373064
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="total"} 13839.713618361802
operacion_fase_ms_sum{operacion="apertura",fase="total"} 114092459.72970007
operacion_fase_ms_count{operacion="apertura",fase="total"} 10220
operacion_consultas{quantile="0.5",operacion="eleccion"} 3
operacion_consultas{quantile="0.95",operacion="eleccion"} 3
operacion_consultas_sum{operacion="eleccion"} 45360
operacion_consultas_count{operacion="eleccion"} 15120
operacion_consultas{quantile="0.5",operacion="entrega_sobre"} 9.015075376884422
operacion_consultas{quantile="0.95",operacion="entrega_sobre"} 74.14070351758794
operacion_consultas_sum{operacion="entrega_sobre"} 21838
operacion_consultas_count{operacion="entrega_sobre"} 2400
operacion_consultas{quantile="0.5",operacion="apertura"} 41.891452991452994
operacion_consultas{quantile="0.95",operacion="apertura"} 73.36666666666666
operacion_consultas_sum{operacion="apertura"} 418686
operacion_consultas_count{operacion="apertura"} 10220

  █ THRESHOLDS

    apertura_ms
    ✗ 'p(95)<3000' p(95)=14.43s

    descanso_ms
    ✓ 'p(95)<3000' p(95)=15ms

    entrega_sobre_ms
    ✗ 'p(95)<1000' p(95)=1.67s

    errores_ws
    ✓ 'count==0' count=0

    final_ms
    ✗ 'p(95)<3000' p(95)=3.63s

    http_req_failed
    ✓ 'rate<0.01' rate=0.08%

    jornada_npc_ms
    ✓ 'p(95)<10000' p(95)=5.1s

    partidas_bloqueadas
    ✓ 'count==0' count=0

    partidas_terminadas
    ✓ 'count>=100' count=100

  █ TOTAL RESULTS

    checks_total.......: 1560    6.586966/s
    checks_succeeded...: 100.00% 1560 out of 1560
    checks_failed......: 0.00%   0 out of 1560

    ✓ usuario creado
    ✓ partida creada
    ✓ unido a la partida
    ✓ draft iniciado

    CUSTOM
    apertura_ms....................: avg=11.46s   min=52.36ms med=12.25s  max=23.02s   p(90)=14.07s  p(95)=14.43s
    descanso_ms....................: avg=3.25ms   min=0s      med=1ms     max=66ms     p(90)=10ms    p(95)=15ms
    entrega_sobre_ms...............: avg=904.18ms min=169ms   med=814ms   max=2.25s    p(90)=1.25s   p(95)=1.67s
    errores_ws.....................: 0      0/s
    final_ms.......................: avg=694.71ms min=62ms    med=204ms   max=6.69s    p(90)=1.91s   p(95)=3.63s
    jornada_npc_ms.................: avg=954.07ms min=82ms    med=227.5ms max=6.69s    p(90)=3.27s   p(95)=5.1s
    partidas_bloqueadas............: 0      0/s
    partidas_terminadas............: 100    0.422241/s

    HTTP
    http_req_duration..............: avg=9.92s    min=3.31ms  med=12.1s   max=1m0s     p(90)=14.01s  p(95)=14.38s
      { expected_response:true }...: avg=9.88s    min=3.31ms  med=12.1s   max=23.02s   p(90)=14.01s  p(95)=14.37s
    http_req_failed................: 0.08%  10 out of 11911
    http_reqs......................: 11911  50.293172/s

    EXECUTION
    iteration_duration.............: avg=3m25s    min=3m20s   med=3m25s   max=3m39s    p(90)=3m26s   p(95)=3m26s
    iterations.....................: 730    3.082362/s
    vus............................: 9      min=0           max=730
    vus_max........................: 730    min=730         max=730

    NETWORK
    data_received..................: 1.3 GB 5.4 MB/s
    data_sent......................: 6.4 MB 27 kB/s

    WEBSOCKET
    ws_connecting..................: avg=28.92ms  min=0s      med=24.56ms max=269.08ms p(90)=40.82ms p(95)=63.36ms
    ws_msgs_received...............: 251086 1060.189015/s
    ws_msgs_sent...................: 18530  78.241329/s
    ws_session_duration............: avg=3m24s    min=3m19s   med=3m24s   max=3m36s    p(90)=3m24s   p(95)=3m24s
    ws_sessions....................: 730    3.082362/s

INFO thresholds on metrics 'apertura_ms, entrega_sobre_ms, final_ms' have been crossed

running (03m56.8s), 000/730 VUs, 730 complete and 0 interrupted iterations
humanos ✓ [ 100% ] 730 VUs  03m39.8s/40m0s  730/730 iters, 1 per VU
```
