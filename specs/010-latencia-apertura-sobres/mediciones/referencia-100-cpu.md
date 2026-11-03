# Resultado de prueba de carga — 100 partidas con registro de CPU (entorno de referencia)

Mismo código y mismas condiciones que [referencia-100-grupo](referencia-100-grupo.md): equipo B, por cable, PostgreSQL 16
nativo en Windows y k6 en el mismo equipo, servidor recién arrancado con `tsx`, sin watch y sin `SMTP_URL`. Medido por la
persona el 2026-11-03. Durante la prueba, un bucle de PowerShell apuntaba cada ~3 s el uso total de CPU
(`Win32_PerfFormattedData_PerfOS_Processor`) y el de `node`, `postgres` y `k6` (`Win32_PerfFormattedData_PerfProc_Process`;
en cada proceso, 100 = un núcleo, de 8 lógicos). La salida de k6 se limpia como en las demás mediciones.

## Uso de CPU

```text
nucleos=8
12:29:44 total=61 k6=192 node=96 postgres=56
12:29:46 total=47 k6=232 node=105 postgres=86
12:29:49 total=40 k6=123 node=315 postgres=72
12:29:52 total=100 k6=261 node=139 postgres=40
12:29:55 total=38 k6=73 node=113 postgres=78
12:29:57 total=52 k6=274 node=123 postgres=67
12:30:00 total=98 k6=174 node=471 postgres=61
12:30:03 total=45 k6=111 node=106 postgres=123
12:30:05 total=87 k6=72 node=167 postgres=100
12:30:08 total=83 k6=146 node=518 postgres=30
12:30:11 total=100 k6=46 node=612 postgres=65
12:30:14 total=100 k6=215 node=541 postgres=42
12:30:18 total=100 k6=107 node=523 postgres=48
12:30:21 total=100 k6=141 node=559 postgres=36
12:30:24 total=100 k6=131 node=610 postgres=20
12:30:27 total=100 k6=21 node=674 postgres=20
12:30:30 total=100 k6=84 node=627 postgres=41
12:30:33 total=100 k6=61 node=624 postgres=64
12:30:36 total=100 k6=82 node=634 postgres=25
12:30:39 total=100 k6=48 node=567 postgres=47
12:30:42 total=100 k6=59 node=611 postgres=52
12:30:45 total=99 k6=16 node=683 postgres=42
12:30:48 total=100 k6=33 node=595 postgres=59
12:30:51 total=97 k6=44 node=592 postgres=80
12:30:54 total=97 k6=54 node=591 postgres=46
12:30:57 total=100 k6=68 node=613 postgres=30
12:31:00 total=98 k6=21 node=670 postgres=45
12:31:03 total=97 k6=96 node=573 postgres=67
12:31:06 total=96 k6=22 node=586 postgres=42
12:31:09 total=94 k6=33 node=540 postgres=129
12:31:12 total=97 k6=27 node=556 postgres=127
12:31:15 total=98 k6=67 node=637 postgres=46
12:31:18 total=97 k6=21 node=644 postgres=98
12:31:20 total=99 k6=21 node=536 postgres=60
12:31:23 total=97 k6=32 node=476 postgres=60
12:31:26 total=88 k6=49 node=603 postgres=66
12:31:29 total=94 k6=11 node=677 postgres=35
12:31:32 total=93 k6=49 node=613 postgres=46
12:31:34 total=90 k6=17 node=572 postgres=42
12:31:37 total=90 k6=16 node=548 postgres=55
12:31:40 total=93 k6=57 node=584 postgres=60
12:31:43 total=95 k6=64 node=534 postgres=65
12:31:46 total=96 k6=38 node=542 postgres=25
12:31:48 total=96 k6=15 node=573 postgres=70
12:31:51 total=83 k6=38 node=561 postgres=51
12:31:54 total=85 k6=22 node=591 postgres=87
12:31:57 total=94 k6=85 node=493 postgres=60
12:32:00 total=91 k6=53 node=532 postgres=25
12:32:02 total=94 k6=49 node=580 postgres=75
12:32:05 total=100 k6=32 node=595 postgres=92
12:32:08 total=100 k6=32 node=469 postgres=30
12:32:11 total=100 k6=0 node=447 postgres=145
12:32:14 total=100 k6=288 node=367 postgres=30
12:32:17 total=100 k6=56 node=510 postgres=118
12:32:20 total=94 k6=39 node=479 postgres=63
12:32:23 total=89 k6=27 node=560 postgres=70
12:32:25 total=84 k6=55 node=518 postgres=89
12:32:28 total=94 k6=28 node=514 postgres=77
12:32:31 total=92 k6=22 node=561 postgres=46
12:32:34 total=95 k6=65 node=381 postgres=65
12:32:37 total=88 k6=42 node=582 postgres=65
12:32:40 total=99 k6=31 node=476 postgres=90
12:32:42 total=85 k6=50 node=586 postgres=89
12:32:45 total=96 k6=53 node=611 postgres=40
12:32:48 total=91 k6=27 node=534 postgres=45
12:32:50 total=93 k6=32 node=488 postgres=50
12:32:53 total=81 k6=49 node=519 postgres=55
12:32:56 total=84 k6=59 node=497 postgres=25
12:32:59 total=90 k6=79 node=472 postgres=82
12:33:02 total=88 k6=62 node=380 postgres=79
12:33:04 total=97 k6=28 node=508 postgres=101
12:33:07 total=86 k6=16 node=654 postgres=56
12:33:10 total=97 k6=0 node=675 postgres=55
12:33:13 total=53 k6=378 node=143 postgres=61
12:33:16 total=100 k6=22 node=624 postgres=89
12:33:18 total=98 k6=25 node=631 postgres=92
12:33:22 total=99 k6=191 node=448 postgres=116
12:33:25 total=99 k6=16 node=644 postgres=80
12:33:28 total=100 k6=22 node=642 postgres=104
12:33:30 total=5 node=0 postgres=0
12:33:33 total=1 node=0 postgres=0
12:33:35 total=5 node=0 postgres=0
```

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

WARN Request Failed error="Post "http://localhost:3000/api/partidas/a80cfd31-8003-46c1-9ab1-2dff08a55e0b/siguiente-jornada": request timeout"
WARN Request Failed error="Post "http://localhost:3000/api/partidas/31451176-e9b1-426f-8566-1fe94e334718/siguiente-jornada": request timeout"

WARN Request Failed error="Post "http://localhost:3000/api/partidas/74b03750-3a3a-4bc4-beab-24d24574803b/siguiente-jornada": request timeout"
WARN Request Failed error="Post "http://localhost:3000/api/partidas/f7a3a748-c1c5-4453-b50a-1d10f4ebcc18/siguiente-jornada": request timeout"
WARN Request Failed error="Post "http://localhost:3000/api/partidas/49f3bd33-8655-4fb3-b81e-eeeb2164d1d5/siguiente-jornada": request timeout"
WARN Request Failed error="Post "http://localhost:3000/api/partidas/83d3fc99-057f-4223-b434-0806781816d3/siguiente-jornada": request timeout"
WARN Request Failed error="Post "http://localhost:3000/api/partidas/7ab8447a-ba07-41c3-942a-c56c910a8251/siguiente-jornada": request timeout"
WARN Request Failed error="Post "http://localhost:3000/api/partidas/fa24dfb1-4eab-4c41-be3f-51f4cf65bf73/siguiente-jornada": request timeout"
WARN Request Failed error="Post "http://localhost:3000/api/partidas/0e91cd77-69a1-459c-a996-04cfb2625265/siguiente-jornada": request timeout"
WARN Request Failed error="Post "http://localhost:3000/api/partidas/10550afc-f98c-497c-968e-008f4cb9d0bb/siguiente-jornada": request timeout"

INFO Desglose por fases (http://localhost:3000/metrics):
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="cola"} 263.34469287079526
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="cola"} 668.4431112778749
operacion_fase_ms_sum{operacion="eleccion",fase="cola"} 4423601.568499975
operacion_fase_ms_count{operacion="eleccion",fase="cola"} 15120
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="calculo"} 0
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="calculo"} 0
operacion_fase_ms_sum{operacion="eleccion",fase="calculo"} 0
operacion_fase_ms_count{operacion="eleccion",fase="calculo"} 15120
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="bd"} 289.646331636249
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="bd"} 584.7525756944439
operacion_fase_ms_sum{operacion="eleccion",fase="bd"} 4856106.015999984
operacion_fase_ms_count{operacion="eleccion",fase="bd"} 15120
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="serializacion"} 0.03604473634964615
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="serializacion"} 0.050911469007595495
operacion_fase_ms_sum{operacion="eleccion",fase="serializacion"} 593.5308999974077
operacion_fase_ms_count{operacion="eleccion",fase="serializacion"} 15120
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="difusion"} 0.21165796462523578
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="difusion"} 0.2840042143617967
operacion_fase_ms_sum{operacion="eleccion",fase="difusion"} 3443.956199999884
operacion_fase_ms_count{operacion="eleccion",fase="difusion"} 15120
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="resto"} 0.378578853658439
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="resto"} 0.643323333337321
operacion_fase_ms_sum{operacion="eleccion",fase="resto"} 6446.277900003348
operacion_fase_ms_count{operacion="eleccion",fase="resto"} 15120
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="total"} 581.081818017819
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="total"} 1079.37333548655
operacion_fase_ms_sum{operacion="eleccion",fase="total"} 9290191.349499999
operacion_fase_ms_count{operacion="eleccion",fase="total"} 15120
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="cola"} 609.0081662768822
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="cola"} 984.4174809523839
operacion_fase_ms_sum{operacion="entrega_sobre",fase="cola"} 1452727.9699999986
operacion_fase_ms_count{operacion="entrega_sobre",fase="cola"} 2400
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="calculo"} 0.04902429561164041
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="calculo"} 1.581449999997858
operacion_fase_ms_sum{operacion="entrega_sobre",fase="calculo"} 21566.2248999999
operacion_fase_ms_count{operacion="entrega_sobre",fase="calculo"} 2400
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="bd"} 368.17712037036887
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="bd"} 821.2868833333305
operacion_fase_ms_sum{operacion="entrega_sobre",fase="bd"} 1525675.0862999987
operacion_fase_ms_count{operacion="entrega_sobre",fase="bd"} 2400
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="serializacion"} 0.3910548418975185
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="serializacion"} 0.7428166666686593
operacion_fase_ms_sum{operacion="entrega_sobre",fase="serializacion"} 1600.5394999995478
operacion_fase_ms_count{operacion="entrega_sobre",fase="serializacion"} 2400
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="difusion"} 0.7741397959180176
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="difusion"} 1.1969400000049064
operacion_fase_ms_sum{operacion="entrega_sobre",fase="difusion"} 2599.291799999446
operacion_fase_ms_count{operacion="entrega_sobre",fase="difusion"} 2400
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="resto"} 0.904310139862655
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="resto"} 2.964635714284876
operacion_fase_ms_sum{operacion="entrega_sobre",fase="resto"} 6195.606300001113
operacion_fase_ms_count{operacion="entrega_sobre",fase="resto"} 2400
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="total"} 967.5866078947374
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="total"} 2463.087985555555
operacion_fase_ms_sum{operacion="entrega_sobre",fase="total"} 3010363.443500001
operacion_fase_ms_count{operacion="entrega_sobre",fase="total"} 2400
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="cola"} 5164.537685656344
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="cola"} 6087.236470579271
operacion_fase_ms_sum{operacion="apertura",fase="cola"} 43228755.491400145
operacion_fase_ms_count{operacion="apertura",fase="cola"} 10220
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="calculo"} 4508.589737084519
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="calculo"} 6056.920516067226
operacion_fase_ms_sum{operacion="apertura",fase="calculo"} 36804396.50029946
operacion_fase_ms_count{operacion="apertura",fase="calculo"} 10220
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="bd"} 2014.9820443266165
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="bd"} 10441.41986303026
operacion_fase_ms_sum{operacion="apertura",fase="bd"} 38151657.7107
operacion_fase_ms_count{operacion="apertura",fase="bd"} 10220
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="serializacion"} 0.03633729730825487
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="serializacion"} 2.3377383471025097
operacion_fase_ms_sum{operacion="apertura",fase="serializacion"} 4995.01639999824
operacion_fase_ms_count{operacion="apertura",fase="serializacion"} 10220
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="difusion"} 0.2751844295719137
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="difusion"} 2.9832795321165615
operacion_fase_ms_sum{operacion="apertura",fase="difusion"} 7770.082800013595
operacion_fase_ms_count{operacion="apertura",fase="difusion"} 10220
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="resto"} 56.4113962463285
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="resto"} 90.40325465869579
operacion_fase_ms_sum{operacion="apertura",fase="resto"} 544757.1081999847
operacion_fase_ms_count{operacion="apertura",fase="resto"} 10220
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="total"} 12473.395553923183
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="total"} 15394.33044244281
operacion_fase_ms_sum{operacion="apertura",fase="total"} 118741977.60249984
operacion_fase_ms_count{operacion="apertura",fase="total"} 10220
operacion_consultas{quantile="0.5",operacion="eleccion"} 3
operacion_consultas{quantile="0.95",operacion="eleccion"} 3
operacion_consultas_sum{operacion="eleccion"} 45360
operacion_consultas_count{operacion="eleccion"} 15120
operacion_consultas{quantile="0.5",operacion="entrega_sobre"} 9.01255230125523
operacion_consultas{quantile="0.95",operacion="entrega_sobre"} 74.0836820083682
operacion_consultas_sum{operacion="entrega_sobre"} 21844
operacion_consultas_count{operacion="entrega_sobre"} 2400
operacion_consultas{quantile="0.5",operacion="apertura"} 41.89059829059829
operacion_consultas{quantile="0.95",operacion="apertura"} 72.55716586151368
operacion_consultas_sum{operacion="apertura"} 418677
operacion_consultas_count{operacion="apertura"} 10220

  █ THRESHOLDS

    apertura_ms
    ✗ 'p(95)<3000' p(95)=15.93s

    descanso_ms
    ✓ 'p(95)<3000' p(95)=17.04ms

    entrega_sobre_ms
    ✗ 'p(95)<1000' p(95)=1.49s

    errores_ws
    ✓ 'count==0' count=0

    final_ms
    ✗ 'p(95)<3000' p(95)=3.44s

    http_req_failed
    ✓ 'rate<0.01' rate=0.08%

    jornada_npc_ms
    ✓ 'p(95)<10000' p(95)=5.16s

    partidas_bloqueadas
    ✓ 'count==0' count=0

    partidas_terminadas
    ✓ 'count>=100' count=100

  █ TOTAL RESULTS

    checks_total.......: 1560    6.293863/s
    checks_succeeded...: 100.00% 1560 out of 1560
    checks_failed......: 0.00%   0 out of 1560

    ✓ usuario creado
    ✓ partida creada
    ✓ unido a la partida
    ✓ draft iniciado

    CUSTOM
    apertura_ms....................: avg=11.95s   min=84ms   med=12.58s  max=25.5s   p(90)=15.52s  p(95)=15.93s
    descanso_ms....................: avg=4.95ms   min=0s     med=1.5ms   max=145ms   p(90)=15ms    p(95)=17.04ms
    entrega_sobre_ms...............: avg=957.31ms min=51ms   med=863ms   max=2.52s   p(90)=1.2s    p(95)=1.49s
    errores_ws.....................: 0      0/s
    final_ms.......................: avg=528.77ms min=68ms   med=190ms   max=4.12s   p(90)=907.5ms p(95)=3.44s
    jornada_npc_ms.................: avg=775.1ms  min=88ms   med=226ms   max=6.07s   p(90)=1.54s   p(95)=5.16s
    partidas_bloqueadas............: 0      0/s
    partidas_terminadas............: 100    0.403453/s

    HTTP
    http_req_duration..............: avg=10.33s   min=1.03ms med=12.35s  max=1m0s    p(90)=15.33s  p(95)=15.87s
      { expected_response:true }...: avg=10.29s   min=1.03ms med=12.35s  max=25.5s   p(90)=15.32s  p(95)=15.86s
    http_req_failed................: 0.08%  10 out of 11911
    http_reqs......................: 11911  48.055254/s

    EXECUTION
    iteration_duration.............: avg=3m34s    min=3m24s  med=3m34s   max=3m50s   p(90)=3m35s   p(95)=3m35s
    iterations.....................: 730    2.945205/s
    vus............................: 10     min=0           max=730
    vus_max........................: 730    min=730         max=730

    NETWORK
    data_received..................: 1.3 GB 5.1 MB/s
    data_sent......................: 6.4 MB 26 kB/s

    WEBSOCKET
    ws_connecting..................: avg=24.5ms   min=0s     med=22.07ms max=125.3ms p(90)=33.86ms p(95)=41.41ms
    ws_msgs_received...............: 251105 1013.089973/s
    ws_msgs_sent...................: 18530  74.759791/s
    ws_session_duration............: avg=3m32s    min=3m24s  med=3m33s   max=3m47s   p(90)=3m33s   p(95)=3m33s
    ws_sessions....................: 730    2.945205/s

INFO thresholds on metrics 'apertura_ms, entrega_sobre_ms, final_ms' have been crossed

running (04m07.9s), 000/730 VUs, 730 complete and 0 interrupted iterations
humanos ✓ [ 100% ] 730 VUs  03m50.6s/40m0s  730/730 iters, 1 per VU
```
