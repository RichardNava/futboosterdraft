# RESULTADO TEST K6 - 100 jugadores

```bash
k6 run -e PARTIDAS=100 -e APERTURA_MAX_S=0 -e METRICAS_URL=http://localhost:3000/metrics tools/load/beta-100.js
```

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
```

Durante la ejecución aparecen numerosos avisos de WebSocket con el mismo error:

```text
WARN[0022] error de WebSocket en [ID de partida]: dial tcp 127.0.0.1:3000: connectex: No se puede establecer una conexión ya que el equipo de destino denegó expresamente dicha conexión. source=console
```

```text
INFO[1222] Desglose por fases (http://localhost:3000/metrics):

operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="cola"} 119.21433107494404
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="cola"} 311.03307798408093
operacion_fase_ms_sum{operacion="eleccion",fase="cola"} 1344400.915099999
operacion_fase_ms_count{operacion="eleccion",fase="cola"} 10416
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="calculo"} 0
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="calculo"} 0
operacion_fase_ms_sum{operacion="eleccion",fase="calculo"} 0
operacion_fase_ms_count{operacion="eleccion",fase="calculo"} 10416
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="bd"} 157.37553200000121
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="bd"} 249.27404948000503
operacion_fase_ms_sum{operacion="eleccion",fase="bd"} 1606859.5452999955
operacion_fase_ms_count{operacion="eleccion",fase="bd"} 10416
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="serializacion"} 0.04032251012294129
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="serializacion"} 0.061259440553256786
operacion_fase_ms_sum{operacion="eleccion",fase="serializacion"} 438.5907999921619
operacion_fase_ms_count{operacion="eleccion",fase="serializacion"} 10416
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="difusion"} 0.2507058147141068
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="difusion"} 0.3744323814560627
operacion_fase_ms_sum{operacion="eleccion",fase="difusion"} 2678.199700006211
operacion_fase_ms_count{operacion="eleccion",fase="difusion"} 10416
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="resto"} 0.44631662009060674
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="resto"} 0.7570915198278816
operacion_fase_ms_sum{operacion="eleccion",fase="resto"} 5057.343500000061
operacion_fase_ms_count{operacion="eleccion",fase="resto"} 10416
operacion_fase_ms{quantile="0.5",operacion="eleccion",fase="total"} 289.9594243128376
operacion_fase_ms{quantile="0.95",operacion="eleccion",fase="total"} 506.30487697615195
operacion_fase_ms_sum{operacion="eleccion",fase="total"} 2959434.594399997
operacion_fase_ms_count{operacion="eleccion",fase="total"} 10416
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="cola"} 324.66979666666305
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="cola"} 432.38057666666305
operacion_fase_ms_sum{operacion="entrega_sobre",fase="cola"} 422780.16179999994
operacion_fase_ms_count{operacion="entrega_sobre",fase="cola"} 1272
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="calculo"} 0.027436408163523492
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="calculo"} 0.6817947428635587
operacion_fase_ms_sum{operacion="entrega_sobre",fase="calculo"} 1704.6510000000999
operacion_fase_ms_count{operacion="entrega_sobre",fase="calculo"} 1272
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="bd"} 298.6218000000008
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="bd"} 589.5082699999896
operacion_fase_ms_sum{operacion="entrega_sobre",fase="bd"} 599223.1081000004
operacion_fase_ms_count{operacion="entrega_sobre",fase="bd"} 1272
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="serializacion"} 0.45866666665824596
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="serializacion"} 0.951430000011168
operacion_fase_ms_sum{operacion="entrega_sobre",fase="serializacion"} 877.86699999751
operacion_fase_ms_count{operacion="entrega_sobre",fase="serializacion"} 1272
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="difusion"} 0.8225262499998279
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="difusion"} 1.5687159999872233
operacion_fase_ms_sum{operacion="entrega_sobre",fase="difusion"} 1304.1737000001594
operacion_fase_ms_count{operacion="entrega_sobre",fase="difusion"} 1272
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="resto"} 1.181812500017865
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="resto"} 4.318220000023563
operacion_fase_ms_sum{operacion="entrega_sobre",fase="resto"} 4251.618700001083
operacion_fase_ms_count{operacion="entrega_sobre",fase="resto"} 1272
operacion_fase_ms{quantile="0.5",operacion="entrega_sobre",fase="total"} 618.733713809524
operacion_fase_ms{quantile="0.95",operacion="entrega_sobre",fase="total"} 1130.2523606666696
operacion_fase_ms_sum{operacion="entrega_sobre",fase="total"} 1030141.5803000014
operacion_fase_ms_count{operacion="entrega_sobre",fase="total"} 1272
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="cola"} 11978.746751579201
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="cola"} 22480.9089253655
operacion_fase_ms_sum{operacion="apertura",fase="cola"} 68008915.4735001
operacion_fase_ms_count{operacion="apertura",fase="cola"} 5740
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="calculo"} 131.45665618085667
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="calculo"} 283.29450270091866
operacion_fase_ms_sum{operacion="apertura",fase="calculo"} 693204.1136000014
operacion_fase_ms_count{operacion="apertura",fase="calculo"} 5740
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="bd"} 899.2459265258559
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="bd"} 7747.28072623724
operacion_fase_ms_sum{operacion="apertura",fase="bd"} 14150546.09440005
operacion_fase_ms_count{operacion="apertura",fase="bd"} 5740
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="serializacion"} 0.46764910112942454
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="serializacion"} 2.5084638888605424
operacion_fase_ms_sum{operacion="apertura",fase="serializacion"} 4137.022399999449
operacion_fase_ms_count{operacion="apertura",fase="serializacion"} 5740
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="difusion"} 0.24984906084750874
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="difusion"} 2.8878810559007158
operacion_fase_ms_sum{operacion="apertura",fase="difusion"} 3903.8658999939507
operacion_fase_ms_count{operacion="apertura",fase="difusion"} 5740
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="resto"} 4.638732426015615
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="resto"} 72.93616544120765
operacion_fase_ms_sum{operacion="apertura",fase="resto"} 131185.61660001244
operacion_fase_ms_count{operacion="apertura",fase="resto"} 5740
operacion_fase_ms{quantile="0.5",operacion="apertura",fase="total"} 13870.045448368703
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="total"} 22974.807240357128
operacion_fase_ms_sum{operacion="apertura",fase="total"} 82991891.31249999
operacion_fase_ms_count{operacion="apertura",fase="total"} 5740
operacion_consultas{quantile="0.5",operacion="eleccion"} 3
operacion_consultas{quantile="0.95",operacion="eleccion"} 3
operacion_consultas_sum{operacion="eleccion"} 31248
operacion_consultas_count{operacion="eleccion"} 10416
operacion_consultas{quantile="0.5",operacion="entrega_sobre"} 6.165432098765432
operacion_consultas{quantile="0.95",operacion="entrega_sobre"} 7.883783783783782
operacion_consultas_sum{operacion="entrega_sobre"} 13619
operacion_consultas_count{operacion="entrega_sobre"} 1272
operacion_consultas{quantile="0.5",operacion="apertura"} 14
operacion_consultas{quantile="0.95",operacion="apertura"} 324.1931330472103
operacion_consultas_sum{operacion="apertura"} 556681
operacion_consultas_count{operacion="apertura"} 5740
```

## THRESHOLDS

```text
apertura_ms
✗ 'p(95)<3000' p(95)=23.06s

descanso_ms
✓ 'p(95)<3000' p(95)=5ms

entrega_sobre_ms
✗ 'p(95)<1000' p(95)=45.01s

errores_ws
✗ 'count==0' count=219

final_ms
✓ 'p(95)<3000' p(95)=620.59ms

http_req_failed
✓ 'rate<0.01' rate=0.00%

jornada_npc_ms
✓ 'p(95)<10000' p(95)=1.65s

partidas_bloqueadas
✗ 'count==0' count=13

partidas_terminadas
✗ 'count>=100' count=53
```

## TOTAL RESULTS

```text
checks_total.......: 1513    1.237829/s
checks_succeeded...: 100.00% 1513 out of 1513
checks_failed......: 0.00%   0 out of 1513

✓ usuario creado
✓ partida creada
✓ unido a la partida
✓ draft iniciado

CUSTOM
apertura_ms....................: avg=14.57s   min=367.89ms med=13.98s   max=26.71s  p(90)=22.27s  p(95)=23.06s
descanso_ms....................: avg=3.82ms   min=2ms      med=4ms      max=11ms    p(90)=5ms     p(95)=5ms
entrega_sobre_ms...............: avg=7.7s     min=171ms    med=575ms    max=53.02s p(90)=45s     p(95)=45.01s
errores_ws.....................: 219    0.17917/s
final_ms.......................: avg=366.71ms min=220ms    med=355.5ms  max=674ms  p(90)=519.2ms p(95)=620.59ms
jornada_npc_ms.................: avg=1.1s     min=751ms    med=1.04s    max=1.69s p(90)=1.58s   p(95)=1.65s
partidas_bloqueadas............: 13     0.010636/s
partidas_terminadas............: 53     0.043361/s

HTTP
http_req_duration..............: avg=11.53s   min=6.2ms    med=12.05s   max=26.71s p(90)=21.71s p(95)=22.86s
  { expected_response:true }...: avg=11.53s   min=6.2ms    med=12.05s   max=26.71s p(90)=21.71s p(95)=22.86s
http_req_failed................: 0.00%  0 out of 7280
http_reqs......................: 7280   5.955981/s

EXECUTION
iteration_duration.............: avg=5m39s    min=1.71ms   med=5m8s     max=20m0s p(90)=20m0s p(95)=20m0s
iterations.....................: 730    0.597234/s
vus............................: 91     min=0         max=730
vus_max........................: 730    min=730       max=730

NETWORK
data_received..................: 1.0 GB 857 kB/s
data_sent......................: 4.0 MB 3.3 kB/s

WEBSOCKET
ws_connecting..................: avg=147.04ms min=0s med=128.01ms max=342.85ms p(90)=316.4ms p(95)=319.81ms
ws_msgs_received...............: 168014 137.457159/s
ws_msgs_sent...................: 12255  10.026173/s
ws_session_duration............: avg=8m4s min=1m30s med=5m10s max=20m0s p(90)=20m0s p(95)=20m0s
ws_sessions....................: 730 0.597234/s
```

```text
running (20m22.3s), 000/730 VUs, 730 complete and 0 interrupted iterations
humanos ✓ [======================================] 730 VUs 20m00.4s/40m0s 730/730 iters, 1 per VU

ERRO[1222] thresholds on metrics 'apertura_ms, entrega_sobre_ms, errores_ws, partidas_bloqueadas, partidas_terminadas' have been crossed
```