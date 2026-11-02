# Implementation Plan: Latencia de apertura de partidos y de entrega de sobres

**Branch**: `main` (sin rama propia, como las specs 008 y 009) | **Date**: 2026-11-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/010-latencia-apertura-sobres/spec.md`

## Summary

Cumplir `apertura_ms` p95 < 3 s y `entrega_sobre_ms` p95 < 1 s con 100 partidas (001/SC-017, INI-07) sin cambiar el
motor ni los resultados. El inventario del código ([research.md R1](research.md)) sugiere que el coste no está en el
cálculo sino en el **número de viajes a la base de datos en serie dentro de la cola de cada partida**. Una apertura
entre humanos hace unas 50–110 consultas, la mayoría al construir por separado la vista del torneo de cada uno de los
8 humanos. Las 8 aperturas de una partida se esperan unas a otras. Eso explicaría por qué la red (Wi-Fi, Docker
Desktop) multiplica los tiempos.

Enfoque en tres pasos, en orden:

1. **Diagnóstico (US1)**: desglose por fases con `AsyncLocalStorage`. Se mide cola, cálculo, BD (con número de
   consultas), serialización, difusión y el resto, y se expone como `Summary` en `/metrics`. Con eso se escribe
   `diagnostico.md` antes de tocar nada más (R2, R3).
2. **Grupo de aperturas (US2)**: un buzón por partida junta las aperturas entre humanos pendientes en **un** comando
   del actor, sin adelantar a otros comandos. Ese comando calcula en paralelo, aplica en orden de calendario, guarda en
   **una** transacción y emite `torneo.actualizado` **una** vez (R4–R6, R10). Además, `emitirTorneo` carga los datos
   comunes una vez por emisión en lugar de una por humano (R7).
3. **Entrega del sobre (US3)**: el cierre de turno pasa a **una** transacción. El alcance final lo fija el
   diagnóstico (R9). FR-011 ya se cumple en la pasarela y se fija con un test (R8).

## Technical Context

**Language/Version**: TypeScript 5 sobre Node ≥ 22 (desarrollo en Node 24), ESM

**Primary Dependencies**: Fastify 5, `ws`, Drizzle + `pg`, prom-client (`Summary`), `node:async_hooks`
(`AsyncLocalStorage`); sin dependencias nuevas

**Storage**: PostgreSQL, sin cambios de esquema. Algunos métodos de repositorio aceptan además el `ejecutor`
(transacción) que ya aceptan otros

**Testing**: Vitest (unitarias, integración con BD en los dos modos de hilos, `test:equivalence`), Playwright (`pnpm
e2e`), k6 (`tools/load/beta-100.js`)

**Target Platform**: servidor Linux en contenedor; medición de referencia en una máquina de desarrollo sin Docker
Desktop; SC-001 en tres máquinas por cable

**Project Type**: monorepo web; el cambio es de `apps/server` y de `tools/load`

**Performance Goals**: con 100 partidas en tres máquinas: apertura p95 < 3 s, sobre p95 < 1 s, «Seguir» → final p95
< 3 s, jornada NPC p95 < 10 s (SC-001); con 10 partidas en una máquina: apertura p95 < 3 s y sobre p95 < 1 s
(SC-002); ninguna métrica que cumple empeora > 10 % (SC-003)

**Constraints**: resultados idénticos con las mismas semillas (FR-014); orden de llegada entre aperturas y otros
comandos (FR-009); todo o nada por grupo (FR-008); sin cambios de API, protocolo ni mensajes (FR-015); umbrales de k6
intactos (FR-016)

**Scale/Scope**: ~730 humanos y 100 partidas en un proceso; 8 aperturas simultáneas por partida; ~8 ficheros de
`apps/server/src` tocados más 2 nuevos; `beta-100.js` con un `teardown` opcional

Sin NEEDS CLARIFICATION: las tres preguntas abiertas se resolvieron en la sesión de aclaraciones de la spec, y el resto
de decisiones están en [research.md](research.md).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo se cumple | Estado |
|-----------|----------------|--------|
| I. La estrategia es determinante | No cambia ninguna regla, fórmula ni semilla. | ✅ |
| II. Draft | Mismas reglas, contenido y orden de sobres. Solo se juntan escrituras en una transacción (R9). | ✅ |
| III. Reglas de dominio explícitas | Las funciones puras del dominio (`registrarResultado`, `resolverTurno`, `elegir`) no cambian. Solo cambia cómo el servidor las llama y guarda. | ✅ |
| IV. Simulación coherente y verificable | `test:equivalence` sin cambios. Mismo cálculo por partido. El orden de aplicación es fijo (calendario), y un test compara la clasificación con la aplicación de una en una (SC-006). | ✅ |
| V. Un único motor | Sin cambios en `packages/engine` ni `packages/ai`. | ✅ |
| VI. Integridad multijugador | Un partido se resuelve una vez por grupo, los duplicados reciben el mismo resultado, el grupo es todo o nada y la memoria cambia solo tras el commit. Ningún comando ve un grupo a medio aplicar, y el orden de llegada se respeta con el número de secuencia del actor (R4–R6). | ✅ |
| VII. Colecciones | No aplica. | ✅ |
| VIII. Modularidad | Dos módulos con una frontera cada uno: `observabilidad/desglose.ts` y `actores/aperturas.ts` ([contracts/desglose.md](contracts/desglose.md)). | ✅ |
| IX. Calidad con pruebas | Tests de grupo (duplicados, fallos, atomicidad, orden, SC-005), de la pasarela (FR-011) y del desglose. Suite completa en los dos modos y e2e. Los criterios se leen en el informe de k6 y en `diagnostico.md`. | ✅ |
| X. Incremental y trazable | US1 (solo medir) se entrega y se mide sola. US2 y US3 se ordenan según el diagnóstico (SC-004). | ✅ |
| Flujo git | El agente no hace commit ni push. | ✅ |

Sin violaciones. **Re-check tras el diseño (Fase 1)**: sin cambios. Hay un cambio de comportamiento menor y aceptado:
si el partido no llega a resolverse, la modalidad de esa apertura no se guarda ([research.md R5](research.md)). La
siguiente apertura la fija igual, así que la regla de la 003 (FR-035) sigue cumpliéndose.

## Project Structure

### Documentation (this feature)

```text
specs/010-latencia-apertura-sobres/
├── plan.md              # Este fichero
├── research.md          # Fase 0: R1–R12
├── data-model.md        # Fase 1: desglose, grupo de aperturas, datos comunes de emitirTorneo
├── quickstart.md        # Fase 1: cómo validarlo
├── contracts/
│   └── desglose.md      # Fase 1: métricas, configuración, APIs internas (desglose y buzón de aperturas)
├── diagnostico.md       # US1 (FR-004): se escribe tras medir, antes de US2/US3
├── checklists/
└── tasks.md             # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
apps/server/
├── src/
│   ├── observabilidad/
│   │   ├── desglose.ts             # NUEVO: AsyncLocalStorage, medir/fase/renombrar/contarConsulta
│   │   └── metricas.ts             # + operacion_fase_ms, operacion_consultas (Summary)
│   ├── persistencia/
│   │   ├── db.ts                   # envolver query/connect del pool para la fase bd
│   │   └── repos/{visionados,equipo,partidos,partidas,perfiles,torneo}.ts  # + ejecutor donde falte; consultas por partida (pendientes, dorsales)
│   ├── actores/
│   │   ├── actor.ts                # fase cola; número de secuencia
│   │   ├── aperturas.ts            # NUEVO: buzón y grupo de aperturas entre humanos
│   │   ├── partidoEntreHumanos.ts  # resolverPartidoEntreHumanos dividido en preparar/calcular/aplicar
│   │   ├── torneo.ts               # vistaTorneo con datos comunes; emitirTorneo una vez por grupo
│   │   └── draft.ts                # cierre de turno en una transacción (alcance según el diagnóstico)
│   ├── simulacion/grupo.ts         # fase calculo
│   ├── ws/pasarela.ts              # fases serializacion y difusion; medir draft.elegir
│   ├── http/partidos.ts            # medir abrir; ruta al buzón para entre humanos programados
│   ├── servidor.ts, main.ts        # MEDIR_FASES
├── tests/
│   ├── unit/desglose.test.ts       # NUEVO
│   ├── unit/actor.test.ts          # + número de secuencia
│   ├── unit/pasarela.test.ts       # NUEVO: serializar una vez (FR-011)
│   └── integration/aperturas-grupo.test.ts  # NUEVO: duplicados, fallos, atomicidad, orden, SC-005, SC-006
tools/load/beta-100.js              # teardown opcional con METRICAS_URL
docs/despliegue.md                  # MEDIR_FASES
specs/003-mejoras-ux-simulacion/checklists/validacion.md, ROADMAP.md   # resultados (FR-017)
```

**Structure Decision**: todo vive en `apps/server` más el guion de carga. Los paquetes del dominio, del motor y de la
IA no se tocan (por eso `test:equivalence` no cambia). El cliente web no se toca.

## Orden de implementación sugerido

1. **US1 — medir**: `desglose.ts` y métricas; puntos de medida en actor, grupo de hilos, pool de `pg`, pasarela y
   rutas; `MEDIR_FASES`; `teardown` de `beta-100.js`. Comprobar que `resto` ≤ 10 %.
2. **Diagnóstico**: medir 10 y 100 partidas en el entorno de referencia y Docker Desktop + Wi-Fi; escribir
   `diagnostico.md` con el reparto entorno / servidor y la priorización (SC-004). **Puerta**: no se empieza US2/US3
   sin este informe.
3. **US2 — grupo de aperturas**: `ejecutor` en los repositorios; dividir `resolverPartidoEntreHumanos`; `aperturas.ts`
   con secuencia del actor; ruta `abrir`; tests de grupo. Después, `vistaTorneo` con datos comunes (R7). Medir SC-002 y
   SC-005.
4. **US3 — sobre**: test de la pasarela (FR-011); cierre de turno en una transacción si el diagnóstico lo señala (R9).
   Medir con 100 partidas.
5. **Cierre**: suite en los dos modos y e2e; tres máquinas (SC-001; puede quedar pendiente si el entorno no está
   disponible, como 009/T036); registrar en validacion.md y ROADMAP (FR-017).

## Complexity Tracking

Sin violaciones de la constitución que justificar.
