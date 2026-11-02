# Quickstart: validar la latencia de apertura y de entrega de sobres

**Spec**: [spec.md](spec.md) | **Contrato**: [contracts/desglose.md](contracts/desglose.md) |
**Modelo**: [data-model.md](data-model.md)

## Requisitos

- Node ≥ 22, pnpm, PostgreSQL de desarrollo (`.env` como en el resto del proyecto), `pnpm install`, `pnpm seed`.
- Para la carga: [k6](https://k6.io/) (ver [tools/load/README.md](../../tools/load/README.md)).
- **Entorno de referencia**: servidor, PostgreSQL y k6 en la misma máquina, sin Docker Desktop (PostgreSQL nativo o
  en WSL2 sin reenvío de puertos de Docker Desktop).

## 1. Sin regresiones (FR-014, FR-015, SC-006)

```bash
pnpm test:equivalence                                  # engine + ai: verde y sin cambios
pnpm test                                              # unitarias de todo el monorepo
pnpm --filter @fbd/server test:integration             # integración en modo en proceso
pnpm --filter @fbd/server test:integration:hilos       # la misma suite con 2 hilos
pnpm e2e                                               # draft y torneo en el navegador
```

Esperado: todo en verde sin tocar expectativas. En particular, «dos aperturas simultáneas» de `torneo-asincrono`, el
test nuevo de grupo de aperturas (duplicados, un cálculo fallido, una transacción fallida, comparación de la
clasificación con la aplicación de una en una) y el de serializar una vez en la pasarela.

## 2. Desglose por fases (US1, FR-001 a FR-003)

```bash
pnpm --filter @fbd/server dev
curl -s localhost:3000/metrics | grep -E '^operacion_(fase_ms|consultas)'
MEDIR_FASES=0 pnpm --filter @fbd/server dev            # sin desglose: las métricas no reciben observaciones
```

Esperado: tras abrir un partido entre humanos y cerrar un turno de draft (a mano o con la carga), aparecen las 7
fases de `apertura` y de `entrega_sobre`. `resto` es ≤ 10 % de `total` en mediana y en p95.

## 3. Diagnóstico (FR-004, SC-004) — antes de US2 y US3

Reiniciar el servidor antes de cada escenario (los cuantiles se acumulan desde el arranque):

```bash
# Entorno de referencia
k6 run -e PARTIDAS=10  -e APERTURA_MAX_S=0 -e METRICAS_URL=http://localhost:3000/metrics tools/load/beta-100.js
k6 run -e PARTIDAS=100 -e APERTURA_MAX_S=0 -e METRICAS_URL=http://localhost:3000/metrics tools/load/beta-100.js
# Docker Desktop y Wi-Fi (mismas condiciones que la medición del 2026-11-02)
k6 run -e BASE_URL=http://<servidor>:3000 -e ORIGIN=<origen> -e METRICAS_URL=http://<servidor>:3000/metrics tools/load/beta-100.js
```

Resultado: `specs/010-latencia-apertura-sobres/diagnostico.md` con el desglose (mediana y p95 por fase y por
operación) de cada escenario, el número de consultas por operación, la latencia de un viaje a la BD en cada entorno,
el reparto entorno / servidor (método en [research.md R3](research.md)) y la decisión sobre el alcance de FR-012
(research R9).

## 4. Grupo de aperturas (US2, SC-002, SC-005)

```bash
pnpm --filter @fbd/server exec vitest run tests/integration/aperturas-grupo.test.ts
k6 run -e PARTIDAS=10 -e APERTURA_MAX_S=0 -e METRICAS_URL=http://localhost:3000/metrics tools/load/beta-100.js
```

Esperado: con 8 aperturas a la vez en una partida, la espera en cola de la última es menos de la mitad de la suma de
los 8 tiempos de servicio (SC-005, test de integración). Con la carga en el entorno de referencia:
`apertura_ms` p95 < 3 s (hoy 3,71 s) y `entrega_sobre_ms` p95 < 1 s (SC-002).

## 5. Entrega del sobre (US3)

```bash
k6 run -e PARTIDAS=100 -e METRICAS_URL=http://localhost:3000/metrics tools/load/beta-100.js
```

Esperado: `entrega_sobre_ms` p95 menor que en el diagnóstico, y menos consultas en `operacion_consultas{operacion="entrega_sobre"}`.
Los e2e del draft pasan sin cambios.

## 6. Tres máquinas (SC-001, SC-003)

Servidor Linux sin Docker Desktop, PostgreSQL y k6 en máquinas distintas por cable (el entorno de 009/T036):

```bash
k6 run -e BASE_URL=http://<servidor>:3000 -e ORIGIN=<origen> -e METRICAS_URL=http://<servidor>:3000/metrics tools/load/beta-100.js
```

Esperado: `apertura_ms` p95 < 3 s, `entrega_sobre_ms` p95 < 1 s, `final_ms` p95 < 3 s, `jornada_npc_ms` p95 < 10 s,
100 `partidas_terminadas`, 0 errores. Ninguna métrica que ya cumplía empeora más de un 10 % (SC-003). Si un umbral
no se alcanza, se reformula en 001/SC-017 con los datos, sin tocar los umbrales de `beta-100.js` (FR-016).

Anotar cada medición en [003/validacion.md](../003-mejoras-ux-simulacion/checklists/validacion.md) (fila «Carga») y en
[ROADMAP.md](../../ROADMAP.md) INI-07 (FR-017).
