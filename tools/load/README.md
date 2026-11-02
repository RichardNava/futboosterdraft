# Pruebas de carga

Scripts de [k6](https://k6.io/) para verificar el criterio SC-017: 100 partidas simultáneas, con unos
800 participantes conectados entre drafts y jornadas de torneo.

`beta-100.js` simula cada humano con su propio usuario virtual (VU) y su WebSocket, como un navegador. Por
defecto lanza 100 partidas: 90 de 8 humanos registrados y 10 de un invitado contra 7 NPC (730 VU). `setup()`
registra a los usuarios y crea y llena las partidas; después cada partida juega el draft y una liga de 8
completa, con descansos de 5 s. Al final, k6 comprueba los umbrales:

| Métrica | Umbral | Criterio |
|---|---|---|
| `entrega_sobre_ms` | p95 < 1 s | Entrega del sobre siguiente tras elegir (SC-017) |
| `descanso_ms`, `final_ms` | p95 < 3 s | SC-009 bajo carga |
| `jornada_npc_ms` | p95 < 10 s | Jornadas con partidos NPC |
| `partidas_terminadas`, `partidas_bloqueadas`, `errores_ws` | todas terminan, ninguna bloqueada, sin errores | Ningún bloqueo |

## Ejecutar

Con el sistema levantado **con reloj real** (sin `--fake-clock`, para que venzan los plazos cortos):

```bash
docker compose up -d db && pnpm db:migrate && pnpm seed
pnpm --filter @fbd/server exec tsx src/main.ts

# con k6 instalado
k6 run tools/load/beta-100.js

# o con Docker (sin instalar k6)
docker run --rm -i --add-host=host.docker.internal:host-gateway \
  -e BASE_URL=http://host.docker.internal:3000 \
  -v "$PWD/tools/load:/scripts" grafana/k6:0.54.0 run /scripts/beta-100.js
```

Para SC-017 el servidor, la base de datos y k6 deben ir en **máquinas separadas** (en una sola, k6 con 730
WebSocket compite por la CPU con el servidor y falsea la medida). En ese caso `BASE_URL` apunta al servidor y
`ORIGIN` a su `PUBLIC_URL`.

Variables: `BASE_URL` (por defecto `http://localhost:3000`), `ORIGIN` (debe coincidir con `PUBLIC_URL`
del servidor; por defecto `http://localhost:5173`), `PARTIDAS` (100), `PARTIDAS_NPC` (10 % de las
partidas), `LIMITE_PARTIDA_S` (1200: si una partida tarda más, cuenta como bloqueada) y `APERTURA_MAX_S` (0: cada
humano abre su partido tras un retraso al azar de hasta esos segundos; con 0 todos abren a la vez, el peor caso).

Desglose por fases (spec 010): con `-e METRICAS_URL=http://localhost:3000/metrics`, al terminar el guion lee
`/metrics` del servidor e imprime las líneas `operacion_fase_ms` y `operacion_consultas` (mediana y p95 por fase de
`apertura`, `entrega_sobre` y `eleccion`). Los cuantiles se acumulan desde que arranca el servidor: hay que
reiniciarlo entre escenarios. No cambia umbrales ni métricas del guion.