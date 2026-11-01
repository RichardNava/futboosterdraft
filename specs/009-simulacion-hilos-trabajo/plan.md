# Implementation Plan: Simulación de partidos en hilos de trabajo

**Branch**: `main` (sin rama propia, como la spec 008) | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/009-simulacion-hilos-trabajo/spec.md`

## Summary

Sacar del hilo principal todo cálculo del motor y de la IA de los NPC para un partido, para que HTTP, WebSocket y los
drafts no esperen a las simulaciones y el servidor use varios núcleos (001/SC-017, INI-07). Enfoque: un grupo propio
sobre `node:worker_threads` con dos colas (humano / NPC), una tabla fija de funciones puras que se ejecuta igual en un
hilo o en proceso (tamaño `0`), estado del motor enviado completo en cada cálculo (el hilo no guarda nada), y
reintento con hilo nuevo ante caídas o tiempo agotado. Los actores siguen serializando los comandos de cada partida:
solo cambia que esperan (`await`) el cálculo en lugar de hacerlo. Las jornadas NPC calculan en paralelo y guardan en
el orden de hoy. Detalle en [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5 sobre Node ≥ 22 (desarrollo en Node 24), ESM

**Primary Dependencies**: Fastify 5, `ws`, Drizzle + `pg`, pino, prom-client; `node:worker_threads` (sin dependencias
nuevas); `tsx` (ya en el monorepo) para cargar el hilo en desarrollo y tests; `tsup` para el bundle

**Storage**: PostgreSQL, sin cambios de esquema

**Testing**: Vitest (unitarias, integración con BD, `test:equivalence`), k6 (`tools/load/beta-100.js`)

**Target Platform**: servidor Linux en contenedor (Dockerfile), 4–8 núcleos para SC-001; desarrollo en Windows/Linux

**Project Type**: monorepo web (`apps/server`, `apps/web`, `packages/*`); el cambio es solo de `apps/server`

**Performance Goals**: con 100 partidas: sobre p95 < 1 s, apertura p95 < 3 s, «Seguir» → final p95 < 3 s, jornada
NPC p95 < 10 s (SC-001); con 10 partidas abriendo a la vez, apertura p95 < 3 s en la máquina de desarrollo (SC-003)

**Constraints**: resultados idénticos con la misma semilla (FR-002); comandos de una partida en serie (FR-004); BD y
conexiones solo en el hilo principal (FR-003); sin cambios de API, protocolo ni esquema

**Scale/Scope**: ~730 humanos y 100 partidas en un proceso; ~360 partidos entre humanos por jornada; ~10 ficheros de
`apps/server/src` tocados más 3 nuevos

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo se cumple | Estado |
|-----------|----------------|--------|
| I. La estrategia es determinante | No cambia ninguna regla ni fórmula; solo dónde se calcula. | ✅ |
| II. Draft | Los turnos de draft dejan de esperar a simulaciones ajenas (US1 escenario 3); reglas intactas. | ✅ |
| III. Reglas de dominio explícitas | El motor y la IA no cambian; la tabla de funciones solo reexpone funciones de `@fbd/engine` y `@fbd/ai`. | ✅ |
| IV. Simulación coherente y verificable | Misma función en hilo y en proceso; equivalencia comprobada en el servidor (SC-004) y `test:equivalence` sin cambios. La dependencia de la hora de la alineación PRO ya existía y se documenta (research R8). | ✅ |
| V. Un único motor | Un solo motor; el hilo importa los mismos paquetes. | ✅ |
| VI. Integridad multijugador | El actor sigue serializando; dos aperturas resuelven una vez; un fallo no deja nada a medio guardar (data-model). | ✅ |
| VII. Colecciones | No aplica. | ✅ |
| VIII. Modularidad | Módulo nuevo `apps/server/src/simulacion/` con una frontera única (`Calculo`, [contracts/calculo.md](contracts/calculo.md)) inyectada en `ServiciosPartida`. | ✅ |
| IX. Calidad con pruebas | Unitarias del grupo (caídas, tiempo, prioridades), equivalencia, suite de integración en los dos modos, carga con k6. SC-001/SC-003 son legibles en el informe de k6 y en validacion.md. | ✅ |
| X. Incremental y trazable | US1 → US2 → US3 se pueden entregar por separado (el modo en proceso cubre lo que aún no se haya movido). | ✅ |
| Flujo git | El agente no hace commit ni push. | ✅ |

Sin violaciones. **Re-check tras el diseño (Fase 1)**: sin cambios; la única desviación de la letra de FR-001 son los
cálculos de µs que no simulan (research R9), justificados y sin efecto en los criterios de éxito.

## Project Structure

### Documentation (this feature)

```text
specs/009-simulacion-hilos-trabajo/
├── plan.md              # Este fichero
├── research.md          # Fase 0: R1–R11
├── data-model.md        # Fase 1: tarea, grupo, estados de partido afectados
├── quickstart.md        # Fase 1: cómo validarlo
├── contracts/
│   └── calculo.md       # Fase 1: servicio Calculo, tabla de funciones, mensajes, configuración, métricas
├── checklists/
└── tasks.md             # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
apps/server/
├── src/
│   ├── simulacion/                 # NUEVO
│   │   ├── funciones.ts            # tabla FUNCIONES (puras); `rehacer` se mueve aquí
│   │   ├── hilo.ts                 # entrada del worker: recibe {id,nombre,args}, responde
│   │   └── grupo.ts                # crearCalculo(hilos), GrupoHilos, ErrorCalculo, hilosConfigurados()
│   ├── actores/
│   │   ├── servicios.ts            # + calculo: Calculo
│   │   ├── partidoRapido.ts        # iniciarPartido, jugarTramo, procesarFinalizar, alineacionParaPartido/equipoParaMotor
│   │   ├── partido2d.ts            # avanzar2D
│   │   ├── partidoEntreHumanos.ts  # resolverPartidoEntreHumanos, terminar…EnJuego, reproduccion
│   │   ├── preparacion.ts          # resolverPartidosSinHumanos en dos fases (research R6)
│   │   └── torneo.ts               # reintentos de NPC fallidos; simularResto se detiene si fallan
│   ├── observabilidad/metricas.ts  # métricas del grupo
│   ├── servidor.ts                 # ConfigServidor.hilosSimulacion (0 por defecto), cerrar al onClose
│   └── main.ts                     # HILOS_SIMULACION
├── tests/
│   ├── fixtures/hiloPrueba.ts      # NUEVO: eco/fallar/morir/colgar
│   ├── unit/grupoHilos.test.ts     # NUEVO
│   ├── unit/calculoEquivalencia.test.ts  # NUEVO (SC-004)
│   ├── integration/…               # + caída real (SC-005); suite entera también con 2 hilos
│   └── helpers/app.ts              # HILOS_SIMULACION_PRUEBAS
├── tsup.config.ts                  # + entrada hilo
└── package.json                    # + test:integration:hilos

docs/despliegue.md                  # HILOS_SIMULACION
specs/003-mejoras-ux-simulacion/checklists/validacion.md, ROADMAP.md   # resultados de carga (FR-011)
```

**Structure Decision**: todo el cambio vive en `apps/server`. `packages/engine` y `packages/ai` no se tocan (por eso
`test:equivalence` no cambia). El cliente web no se toca.

## Orden de implementación sugerido

1. **Base**: `funciones.ts`, `hilo.ts`, `grupo.ts` con sus tests (grupo y equivalencia), métricas, configuración,
   `tsup`. Con `hilosSimulacion: 0` nada cambia todavía.
2. **US1**: `resolverPartidoEntreHumanos` y `reproduccion` por el grupo; la alineación NPC (`alineacionParaPartido`)
   por el grupo. Medir SC-003 con 10 partidas.
3. **US2**: `jugarTramo('final')` y `resolverPartidosSinHumanos` en dos fases con fallos aislados y reintentos.
4. **US3**: `jugarTramo('parte')`, `avanzar2D`, `procesarFinalizar`, `terminarPartidoEntreHumanosEnJuego`.
5. **Cierre**: suite en los dos modos, caída real, docs de despliegue, medición SC-001 en máquinas separadas y
   registro en validacion.md y ROADMAP (FR-011).

## Complexity Tracking

Sin violaciones de la constitución que justificar.
