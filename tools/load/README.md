# Pruebas de carga

Scripts de [k6](https://k6.io/) para verificar el criterio SC-017: 100 partidas simultáneas, con unos
800 participantes conectados entre drafts y jornadas de torneo.

`beta-100.js` simula cada partida con sus humanos conectados por WebSocket. Por defecto lanza 100
partidas: 90 de 8 humanos registrados y 10 de un invitado contra 7 NPC. Cada partida juega el draft y una
liga de 8 completa, con preparaciones y descansos de 5 s. Al final, k6 comprueba los umbrales:

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

Variables: `BASE_URL` (por defecto `http://localhost:3000`), `ORIGIN` (debe coincidir con `PUBLIC_URL`
del servidor; por defecto `http://localhost:5173`), `PARTIDAS` (100), `PARTIDAS_NPC` (10 % de las
partidas) y `LIMITE_PARTIDA_S` (1200: si una partida tarda más, cuenta como bloqueada).
