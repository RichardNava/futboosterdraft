# Resultado de prueba de carga — 100 partidas (entorno de referencia)

Entorno de referencia (T014): servidor, PostgreSQL 16 nativo en Windows y k6 2.3 en el mismo equipo (por cable), sin
Docker Desktop. Servidor arrancado sin modo watch (`tsx src/main.ts`), sin `SMTP_URL` y reiniciado antes del escenario.
Medido el 2026-11-02.

Guion con turno fijo de conexión por VU (`(__VU - 1) * 4` ms). Un primer intento con todas las conexiones a la vez
dio 197 WebSockets rechazados por Windows (cola de `listen` llena), 66 partidas sin terminar y se descartó.

## Comando ejecutado

```bash
k6 run --console-output=consola-100.txt -e PARTIDAS=100 -e APERTURA_MAX_S=0 -e METRICAS_URL=http://localhost:3000/metrics tools/load/beta-100.js
```

## Desglose por fases

```text
INFO[0405] Desglose por fases (http://localhost:3000/metrics):
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="cola"} 243.5457301942932
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="cola"} 588.1697991107089
operacion_fase_ms_sum{operacion="eleccion",fase="cola"} 3991206.9381000004
operacion_fase_ms_count{operacion="eleccion",fase="cola"} 15120
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="calculo"} 0
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="calculo"} 0
operacion_fase_ms_sum{operacion="eleccion",fase="calculo"} 0
operacion_fase_ms_count{operacion="eleccion",fase="calculo"} 15120
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="bd"} 243.44557802362152
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="bd"} 445.4041576923068
operacion_fase_ms_sum{operacion="eleccion",fase="bd"} 4046076.1146000023
operacion_fase_ms_count{operacion="eleccion",fase="bd"} 15120
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="serializacion"} 0.03241970443407715
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="serializacion"} 0.047191666665833625
operacion_fase_ms_sum{operacion="eleccion",fase="serializacion"} 531.4772999991328
operacion_fase_ms_count{operacion="eleccion",fase="serializacion"} 15120
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="difusion"} 0.20354078821521382
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="difusion"} 0.27605447226762186
operacion_fase_ms_sum{operacion="eleccion",fase="difusion"} 3340.0184000015215
operacion_fase_ms_count{operacion="eleccion",fase="difusion"} 15120
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="resto"} 0.35957191896183305
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="resto"} 0.5675901319882712
operacion_fase_ms_sum{operacion="eleccion",fase="resto"} 6051.572299998043
operacion_fase_ms_count{operacion="eleccion",fase="resto"} 15120
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="total"} 503.7686647585188
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="total"} 949.6825219298222
operacion_fase_ms_sum{operacion="eleccion",fase="total"} 8047206.120700012
operacion_fase_ms_count{operacion="eleccion",fase="total"} 15120
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="cola"} 547.5664434961263
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="cola"} 886.5404808333317
operacion_fase_ms_sum{operacion="entrega_sobre",fase="cola"} 1323886.8513000014
operacion_fase_ms_count{operacion="entrega_sobre",fase="cola"} 2400
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="calculo"} 0.05154671600432769
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="calculo"} 1.3817624999996951
operacion_fase_ms_sum{operacion="entrega_sobre",fase="calculo"} 18347.302199999816
operacion_fase_ms_count{operacion="entrega_sobre",fase="calculo"} 2400
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="bd"} 371.32906638656436
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="bd"} 995.8786111111169
operacion_fase_ms_sum{operacion="entrega_sobre",fase="bd"} 1546549.358000001
operacion_fase_ms_count{operacion="entrega_sobre",fase="bd"} 2400
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="serializacion"} 0.38924768420434896
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="serializacion"} 0.7110999999846779
operacion_fase_ms_sum{operacion="entrega_sobre",fase="serializacion"} 1479.2616000005874
operacion_fase_ms_count{operacion="entrega_sobre",fase="serializacion"} 2400
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="difusion"} 0.7468352678582136
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="difusion"} 1.1281974999797362
operacion_fase_ms_sum{operacion="entrega_sobre",fase="difusion"} 2410.2600999991264
operacion_fase_ms_count{operacion="entrega_sobre",fase="difusion"} 2400
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="resto"} 0.9164848930420431
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="resto"} 2.6506440000202565
operacion_fase_ms_sum{operacion="entrega_sobre",fase="resto"} 6237.496300001061
operacion_fase_ms_count{operacion="entrega_sobre",fase="resto"} 2400
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="total"} 909.8600210101873
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="total"} 2358.141245238095
operacion_fase_ms_sum{operacion="entrega_sobre",fase="total"} 2898899.0487
operacion_fase_ms_count{operacion="entrega_sobre",fase="total"} 2400
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="cola"} 14474.4353127389
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="cola"} 26530.789036904753
operacion_fase_ms_sum{operacion="apertura",fase="cola"} 144823473.9417002
operacion_fase_ms_count{operacion="apertura",fase="cola"} 10220
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="calculo"} 97.00702932692393
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="calculo"} 223.93109761904668
operacion_fase_ms_sum{operacion="apertura",fase="calculo"} 944529.4486000007
operacion_fase_ms_count{operacion="apertura",fase="calculo"} 10220
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="bd"} 560.0544729112846
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="bd"} 9504.61165039224
operacion_fase_ms_sum{operacion="apertura",fase="bd"} 31200679.84119994
operacion_fase_ms_count{operacion="apertura",fase="bd"} 10220
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="serializacion"} 0.38260284890989443
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="serializacion"} 2.094530277773649
operacion_fase_ms_sum{operacion="apertura",fase="serializacion"} 6273.0124999924155
operacion_fase_ms_count{operacion="apertura",fase="serializacion"} 10220
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="difusion"} 0.24952571428584633
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="difusion"} 2.7634793650711167
operacion_fase_ms_sum{operacion="apertura",fase="difusion"} 7007.214499995214
operacion_fase_ms_count{operacion="apertura",fase="difusion"} 10220
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="resto"} 2.3795927869474256
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="resto"} 52.14639238955482
operacion_fase_ms_sum{operacion="apertura",fase="resto"} 167269.02570000972
operacion_fase_ms_count{operacion="apertura",fase="resto"} 10220
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="total"} 16602.617338720916
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="total"} 27066.39867995748
operacion_fase_ms_sum{operacion="apertura",fase="total"} 177148973.56039962
operacion_fase_ms_count{operacion="apertura",fase="total"} 10220
operacion_consultas{quantile="0.5",operacion="eleccion"} 3
operacion_consultas{quantile="0.95",operacion="eleccion"} 3
operacion_consultas_sum{operacion="eleccion"} 45360
operacion_consultas_count{operacion="eleccion"} 15120
operacion_consultas{quantile="0.5",operacion="entrega_sobre"} 6.223684210526316
operacion_consultas{quantile="0.95",operacion="entrega_sobre"} 7.951219512195122
operacion_consultas_sum{operacion="entrega_sobre"} 25127
operacion_consultas_count{operacion="entrega_sobre"} 2400
operacion_consultas{quantile="0.5",operacion="apertura"} 14
operacion_consultas{quantile="0.95",operacion="apertura"} 316.1124845488257
operacion_consultas_sum{operacion="apertura"} 971251
operacion_consultas_count{operacion="apertura"} 10220 
```

## Resumen de k6

```text

  █ THRESHOLDS

    apertura_ms
    ✗ 'p(95)<3000' p(95)=27.17s

    descanso_ms
    ✓ 'p(95)<3000' p(95)=12.04ms

    entrega_sobre_ms
    ✗ 'p(95)<1000' p(95)=1.56s

    errores_ws
    ✓ 'count==0' count=0

    final_ms
    ✓ 'p(95)<3000' p(95)=1.01s

    http_req_failed
    ✓ 'rate<0.01' rate=0.00%

    jornada_npc_ms
    ✓ 'p(95)<10000' p(95)=2.7s

    partidas_bloqueadas
    ✓ 'count==0' count=0

    partidas_terminadas
    ✓ 'count>=100' count=100


  █ TOTAL RESULTS

    checks_total.......: 1560    3.847177/s
    checks_succeeded...: 100.00% 1560 out of 1560
    checks_failed......: 0.00%   0 out of 1560

    ✓ usuario creado
    ✓ partida creada
    ✓ unido a la partida
    ✓ draft iniciado

    CUSTOM
    apertura_ms....................: avg=17.43s   min=364.32ms med=16.69s max=31s      p(90)=26.56s  p(95)=27.17s
    descanso_ms....................: avg=3.25ms   min=0s       med=2ms    max=23ms     p(90)=9.1ms   p(95)=12.04ms
    entrega_sobre_ms...............: avg=919.21ms min=82ms     med=840ms  max=2.47s    p(90)=1.17s   p(95)=1.56s
    errores_ws.....................: 0      0/s
    final_ms.......................: avg=497.39ms min=214ms    med=414ms  max=1.66s    p(90)=845ms   p(95)=1.01s
    jornada_npc_ms.................: avg=1.49s    min=834ms    med=1.39s  max=3.08s    p(90)=2.19s   p(95)=2.7s
    partidas_bloqueadas............: 0      0/s
    partidas_terminadas............: 100    0.246614/s

    HTTP
    http_req_duration..............: avg=15.03s   min=3.65ms   med=15.21s max=31s      p(90)=26.44s  p(95)=26.99s
      { expected_response:true }...: avg=15.03s   min=3.65ms   med=15.21s max=31s      p(90)=26.44s  p(95)=26.99s
    http_req_failed................: 0.00%  0 out of 11911
    http_reqs......................: 11911  29.374184/s

    EXECUTION
    iteration_duration.............: avg=6m20s    min=2m4s     med=6m25s  max=6m27s    p(90)=6m27s   p(95)=6m27s
    iterations.....................: 730    1.800282/s
    vus............................: 119    min=0          max=730
    vus_max........................: 730    min=730        max=730

    NETWORK
    data_received..................: 1.8 GB 4.5 MB/s
    data_sent......................: 6.4 MB 16 kB/s

    WEBSOCKET
    ws_connecting..................: avg=31.4ms   min=0s       med=22.8ms max=400.82ms p(90)=37.86ms p(95)=48.95ms
    ws_msgs_received...............: 271241 668.918062/s
    ws_msgs_sent...................: 18530  45.697559/s
    ws_session_duration............: avg=6m19s    min=2m1s     med=6m24s  max=6m27s    p(90)=6m26s   p(95)=6m26s
    ws_sessions....................: 730    1.800282/s




running (06m45.5s), 000/730 VUs, 730 complete and 0 interrupted iterations
humanos ✓ [======================================] 730 VUs  06m27.7s/40m0s  730/730 iters, 1 per VU
ERRO[0405] thresholds on metrics 'apertura_ms, entrega_sobre_ms' have been crossed
```
