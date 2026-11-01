# Quickstart: validar la simulación en hilos de trabajo

**Spec**: [spec.md](spec.md) | **Contrato**: [contracts/calculo.md](contracts/calculo.md)

## Requisitos

- Node ≥ 22, pnpm, PostgreSQL de desarrollo (`.env` como en el resto del proyecto), `pnpm install`, `pnpm seed`.
- Para la carga: [k6](https://k6.io/) (ver [tools/load/README.md](../../tools/load/README.md)).

## 1. Sin regresiones (FR-002, FR-010)

```bash
pnpm test:equivalence                                  # engine + ai: verde y sin cambios
pnpm test                                              # unitarias de todo el monorepo
pnpm --filter @fbd/server test:integration             # integración en modo en proceso (por defecto)
pnpm --filter @fbd/server test:integration:hilos       # la misma suite con 2 hilos de trabajo
```

Esperado: todo en verde en los dos modos, sin tocar expectativas; en particular `torneo-asincrono` «dos aperturas
simultáneas» (FR-004).

## 2. Equivalencia hilo / en proceso (SC-004)

```bash
pnpm --filter @fbd/server exec vitest run tests/unit/calculoEquivalencia.test.ts
MUESTRA_EQUIVALENCIA=1000 pnpm --filter @fbd/server exec vitest run tests/unit/calculoEquivalencia.test.ts
```

Esperado: 0 diferencias en resultado, eventos, decisiones y estadísticas.

## 3. Fallos de hilo (FR-008, SC-005)

```bash
pnpm --filter @fbd/server exec vitest run tests/unit/grupoHilos.test.ts
```

Esperado: reintento tras caída y tras tiempo agotado; error sin reintento si la función lanza; error tras 3 intentos;
el test de integración de caída real (R10) termina el partido con el mismo marcador.

## 4. Arranque y configuración (FR-007, FR-009, FR-013)

```bash
pnpm --filter @fbd/server dev                          # registro: hilos = núcleos - 1
HILOS_SIMULACION=0   pnpm --filter @fbd/server dev     # aviso: modo en proceso
HILOS_SIMULACION=abc pnpm --filter @fbd/server dev     # aviso: valor no válido, se usa el de por defecto
curl -s localhost:3000/metrics | grep -E 'hilos_simulacion|calculo'
```

En producción (`pnpm --filter @fbd/server build && node dist/main.js`) debe existir `dist/hilo.js` y el registro de
arranque debe dar el mismo número de hilos.

## 5. Carga (SC-001, SC-002, SC-003, SC-006)

Una sola máquina (referencia, SC-003; la de la medición de 003/validacion.md):

```bash
k6 run -e PARTIDAS=10 -e APERTURA_MAX_S=0 tools/load/beta-100.js   # apertura_ms p95 < 3 s
```

Máquinas separadas (servidor de 4–8 núcleos, base de datos y k6 aparte), SC-001:

```bash
k6 run -e BASE_URL=http://<servidor>:3000 -e ORIGIN=<origen> tools/load/beta-100.js
```

Esperado: `entrega_sobre_ms` p95 < 1 s, `apertura_ms` p95 < 3 s, `final_ms` p95 < 3 s, `jornada_npc_ms` p95 < 10 s,
100 `partidas_terminadas`, 0 errores; más de un núcleo > 50 % sostenido durante las jornadas (`top`/`htop` en el
servidor). Anotar los resultados en
[003/validacion.md](../003-mejoras-ux-simulacion/checklists/validacion.md) (fila «Carga») y en
[ROADMAP.md](../../ROADMAP.md) INI-07.
