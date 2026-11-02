# Resultado de prueba de carga — 1 partida (entorno de referencia)

Entorno de referencia (T014): servidor, PostgreSQL 16 nativo en Windows y k6 2.3 en el mismo equipo (por cable), sin
Docker Desktop. Servidor arrancado sin modo watch (`tsx src/main.ts`) y sin `SMTP_URL`. Medido el 2026-11-02.

## Comando ejecutado

```bash
k6 run -e PARTIDAS=1 -e APERTURA_MAX_S=0 -e METRICAS_URL=http://localhost:3000/metrics tools/load/beta-100.js
```

## Advertencia

```text
WARN[0000] k6/experimental/websockets is deprecated and will be removed in a future release. Please use k6/websockets instead.
```

## Ejecución

```text
     execution: local
        script: tools/load/beta-100.js
        output: -

     scenarios: (100.00%) 1 scenario, 1 max VUs, 41m0s max duration (incl. graceful stop):
              * humanos: 1 iterations for each of 1 VUs (maxDuration: 40m0s, gracefulStop: 1m0s)
```

## Desglose por fases

```text
INFO[0007] Desglose por fases (http://localhost:3000/metrics):
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="cola"} 0.004899999999906868
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="cola"} 0.008819999976549288
operacion_fase_ms_sum{operacion="entrega_sobre",fase="cola"} 0.13219999993452802
operacion_fase_ms_count{operacion="entrega_sobre",fase="cola"} 24
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="calculo"} 2.35120000000461
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="calculo"} 135.0765199999371
operacion_fase_ms_sum{operacion="entrega_sobre",fase="calculo"} 493.81910000008065
operacion_fase_ms_count{operacion="entrega_sobre",fase="calculo"} 24
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="bd"} 3.8783000000403263
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="bd"} 71.92789000018358
operacion_fase_ms_sum{operacion="entrega_sobre",fase="bd"} 270.92060000053607
operacion_fase_ms_count{operacion="entrega_sobre",fase="bd"} 24
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="serializacion"} 0.054700000007869676
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="serializacion"} 0.6078866666260467
operacion_fase_ms_sum{operacion="entrega_sobre",fase="serializacion"} 2.444899999711197
operacion_fase_ms_count{operacion="entrega_sobre",fase="serializacion"} 24
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="difusion"} 0.19245000003138557
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="difusion"} 0.5890399999974731
operacion_fase_ms_sum{operacion="entrega_sobre",fase="difusion"} 5.8687999997637235
operacion_fase_ms_count{operacion="entrega_sobre",fase="difusion"} 24
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="resto"} 1.371100000134902
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="resto"} 3.2018799998913856
operacion_fase_ms_sum{operacion="entrega_sobre",fase="resto"} 37.58810000005178
operacion_fase_ms_count{operacion="entrega_sobre",fase="resto"} 24
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="total"} 8.298000000009779
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="total"} 207.0102999999755
operacion_fase_ms_sum{operacion="entrega_sobre",fase="total"} 810.773700000078
operacion_fase_ms_count{operacion="entrega_sobre",fase="total"} 24
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="cola"} 0.004450000007636845
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="cola"} 21.75592000000176
operacion_fase_ms_sum{operacion="apertura",fase="cola"} 27.250900000042748
operacion_fase_ms_count{operacion="apertura",fase="cola"} 14
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="calculo"} 55.16199999995297
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="calculo"} 84.19633999996584
operacion_fase_ms_sum{operacion="apertura",fase="calculo"} 804.0031999999774
operacion_fase_ms_count{operacion="apertura",fase="calculo"} 14
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="bd"} 6.7858500000147615
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="bd"} 20.749419999925877
operacion_fase_ms_sum{operacion="apertura",fase="bd"} 122.80439999996452
operacion_fase_ms_count{operacion="apertura",fase="bd"} 14
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="serializacion"} 0.2722500000090804
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="serializacion"} 0.41610000005457537
operacion_fase_ms_sum{operacion="apertura",fase="serializacion"} 3.9996000000392087
operacion_fase_ms_count{operacion="apertura",fase="serializacion"} 14
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="difusion"} 0.228449999995064
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="difusion"} 0.30934000003617257
operacion_fase_ms_sum{operacion="apertura",fase="difusion"} 3.353499999968335
operacion_fase_ms_count{operacion="apertura",fase="difusion"} 14
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="resto"} 1.808649999962654
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="resto"} 2.4699599999585184
operacion_fase_ms_sum{operacion="apertura",fase="resto"} 22.672199999913573
operacion_fase_ms_count{operacion="apertura",fase="resto"} 14
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="total"} 65.70619999998598
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="total"} 127.50801999999669
operacion_fase_ms_sum{operacion="apertura",fase="total"} 984.0837999999058
operacion_fase_ms_count{operacion="apertura",fase="total"} 14
operacion_consultas{quantile="0.5",operacion="entrega_sobre"} 7.130434782608695
operacion_consultas{quantile="0.95",operacion="entrega_sobre"} 65.5999999999998
operacion_consultas_sum{operacion="entrega_sobre"} 279
operacion_consultas_count{operacion="entrega_sobre"} 24
operacion_consultas{quantile="0.5",operacion="apertura"} 14
operacion_consultas{quantile="0.95",operacion="apertura"} 14
operacion_consultas_sum{operacion="apertura"} 196
operacion_consultas_count{operacion="apertura"} 14  source=console
```

## THRESHOLDS

```text
  █ THRESHOLDS

    apertura_ms
    ✓ 'p(95)<3000' p(95)=104.66ms

    descanso_ms
    ✓ 'p(95)<3000' p(95)=2.34ms

    entrega_sobre_ms
    ✓ 'p(95)<1000' p(95)=16ms

    errores_ws
    ✓ 'count==0' count=0

    final_ms
    ✓ 'p(95)<3000' p(95)=91.74ms

    http_req_failed
    ✓ 'rate<0.01' rate=0.00%

    jornada_npc_ms
    ✓ 'p(95)<10000' p(95)=117.75ms

    partidas_bloqueadas
    ✓ 'count==0' count=0

    partidas_terminadas
    ✓ 'count>=1' count=1
```

## TOTAL RESULTS

```text
    checks_total.......: 3       0.429486/s
    checks_succeeded...: 100.00% 3 out of 3
    checks_failed......: 0.00%   0 out of 3

    ✓ usuario creado
    ✓ partida creada
    ✓ draft iniciado
```

## CUSTOM

```text
    apertura_ms....................: avg=73.49ms  min=57.42ms med=68.36ms max=148.46ms p(90)=79.45ms  p(95)=104.66ms
    descanso_ms....................: avg=1.78ms   min=1ms     med=2ms     max=3ms      p(90)=2ms      p(95)=2.34ms
    entrega_sobre_ms...............: avg=10.17ms  min=1ms     med=8ms     max=48ms     p(90)=15.4ms   p(95)=16ms
    errores_ws.....................: 0      0/s
    final_ms.......................: avg=77ms     min=63ms    med=76.5ms  max=108ms    p(90)=82.4ms   p(95)=91.74ms
    jornada_npc_ms.................: avg=98.71ms  min=82ms    med=98ms    max=121ms    p(90)=113ms    p(95)=117.75ms
    partidas_bloqueadas............: 0      0/s
    partidas_terminadas............: 1      0.143162/s
```

## HTTP

```text
    http_req_duration..............: avg=151.28ms min=4.94ms  med=75.66ms max=375.44ms p(90)=279.76ms p(95)=294.09ms
      { expected_response:true }...: avg=151.28ms min=4.94ms  med=75.66ms max=375.44ms p(90)=279.76ms p(95)=294.09ms
    http_req_failed................: 0.00%  0 out of 31
    http_reqs......................: 31     4.438024/s
```

## EXECUTION

```text
    iteration_duration.............: avg=6.84s    min=6.84s   med=6.84s    max=6.84s    p(90)=6.84s    p(95)=6.84s
    iterations.....................: 1      0.143162/s
    vus............................: 1      min=1       max=1
    vus_max........................: 1      min=1       max=1
```

## NETWORK

```text
    data_received..................: 3.4 MB 491 kB/s
    data_sent......................: 19 kB  2.7 kB/s
```

## WEBSOCKET

```text
    ws_connecting..................: avg=2.82ms   min=2.82ms  med=2.82ms   max=2.82ms   p(90)=2.82ms   p(95)=2.82ms
    ws_msgs_received...............: 301    43.091779/s
    ws_msgs_sent...................: 53     7.587589/s
    ws_session_duration............: avg=6.84s    min=6.84s   med=6.84s    max=6.84s    p(90)=6.84s    p(95)=6.84s
    ws_sessions....................: 1      0.143162/s
```

## Finalización

```text
running (00m07.0s), 0/1 VUs, 1 complete and 0 interrupted iterations
humanos ✓ [======================================] 1 VUs  00m06.8s/40m0s  1/1 iters, 1 per VU
```
