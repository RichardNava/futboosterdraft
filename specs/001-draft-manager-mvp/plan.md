# Implementation Plan: Fútboosterdraft MVP — Draft, equipo, simulación y torneos

**Branch**: `001-draft-manager-mvp` | **Date**: 2026-10-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-draft-manager-mvp/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

El MVP implementa el ciclo central del juego: **draft → alineación → partido → torneo**.

- **Draft**: 4–8 participantes, humanos o NPC, en simultáneo, con 3 sobres de 8 cartas que circulan hacia la izquierda, la derecha y la izquierda, sobre un pool Core de unas 300 cartas.
- **Preparación**: el participante prepara el equipo con 10 formaciones, opciones tácticas agrupadas y lanzadores designados.
- **Partido**: un motor de simulación único y determinista resuelve los partidos, que se presentan como resumen rápido o como reproducción 2D tipo "chapas".
- **Torneo**: liga, playoff o mixto, en directo o asíncrono, con bajas por sanción y lesión.

**Enfoque técnico** (ver [research.md](./research.md)):
- **Organización**: monorepo TypeScript. El dominio y el motor son paquetes puros, sin E/S.
- **Servidor**: Node.js autoritativo, con un actor en memoria por partida, PostgreSQL para persistir y WebSocket para el tiempo real.
- **Cliente**: React, con Canvas 2D para la reproducción.
- **Motor**: simula por tramos hasta el siguiente punto de decisión, y así ambas modalidades recorren exactamente la misma secuencia.
- **Equilibrado**: una herramienta de línea de comandos verifica por Monte Carlo los criterios estadísticos de la especificación.

## Technical Context

**Language/Version**: TypeScript 5.x; Node.js 22 LTS (servidor); navegadores modernos (las dos últimas versiones de Chrome, Firefox, Safari y Edge).

**Primary Dependencies**:
- Servidor: Fastify + `ws` (HTTP y WebSocket), Zod (contratos), Drizzle ORM, temporizadores en memoria con vencimiento persistido (plazos; ver research R6), Better Auth (cuentas e invitados), `pino` (logs).
- Cliente: React 19 + Vite, Zustand, Canvas 2D nativo.

**Package Manager**: **pnpm 9** (obligatorio; R17). Workspaces de pnpm, `packageManager` fijado en el `package.json` raíz, `only-allow pnpm` en `preinstall`, un único `pnpm-lock.yaml`, e instalación en CI con `--frozen-lockfile`. npm, yarn y bun no se usan.

**Storage**: PostgreSQL 16, con JSONB para stats, alineaciones y eventos de cada partido. El catálogo Core se carga desde un JSON validado contra `packages/protocol/schemas/player-data.schema.json`, la fuente única del esquema, copiada desde [contracts/player-data.schema.json](./contracts/player-data.schema.json).

**Testing**: Vitest, fast-check (propiedades), Testcontainers (PostgreSQL), Playwright (de principio a fin), herramienta `balance` (Monte Carlo para los SC estadísticos) y k6 (carga).

**Target Platform**: servidor Linux en contenedor Docker sobre un PaaS con procesos persistentes y WebSocket; cliente web de escritorio. El móvil no es objetivo del MVP, aunque la interfaz no debe romperse en tablet.

**Project Type**: aplicación web (cliente y servidor) con paquetes de dominio compartidos.

**Performance Goals**:
- Primer tramo de la simulación rápida en ≤ 3 s (SC-009); simular un partido completo cuesta < 10 ms de CPU (R7).
- En el 95 % de los turnos, el nuevo sobre llega en < 1 s (SC-017).
- Jornada NPC contra NPC resuelta en < 10 s (SC-017).
- Reproducción 2D a 60 fps en el cliente.

**Constraints**:
- Motor determinista, con semilla y reproducible (FR-040).
- Servidor autoritativo y filtrado de visibilidad por participante (FR-061, FR-054a).
- Descarte de duplicados por `requestId` (FR-062).
- Sin `Math.random` ni reloj dentro de `domain` y `engine`.

**Scale/Scope**:
- Beta de 100 partidas simultáneas (unos 800 participantes conectados).
- Catálogo Core de unas 300 cartas.
- 6 historias de usuario y unas 15 pantallas: inicio y cuenta, sala, draft, plantilla, alineación, partido rápido, partido 2D, torneo (clasificación, cuadro, calendario), avisos y ficha de jugador.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Verificación | Estado |
|-----------|--------------|--------|
| **I. La estrategia es determinante** | Duelos de stats con penalización por posición, formación, táctica y specials (R7). SC-004 a SC-006 se verifican por Monte Carlo (R8). Todas las magnitudes están en parámetros versionados y probados. | ✅ |
| **II. El draft es el núcleo** | 3 sobres × 8 cartas, turno simultáneo, circulación izquierda, derecha e izquierda, 24 jugadores (FR-006 a FR-012). Resolución del turno, validación, duplicados y desconexiones definidos (data-model §3, realtime-protocol). | ✅ |
| **III. Reglas del dominio explícitas** | Todas las reglas en `packages/domain` (y `engine`), sin E/S; ni la interfaz ni el servidor las duplican. Los valores numéricos están en `ParametrosEquilibrado`. | ✅ |
| **IV. Simulación coherente y verificable** | Motor puro y determinista que se prueba sin interfaz; equivalencia entre modalidades probada (engine-api, invariante 2; SC-008). | ✅ |
| **V. Un motor, dos modalidades** | La rápida y la 2D consumen `avanzar()` del mismo paquete; los fotogramas no afectan al resultado. | ✅ |
| **VI. Integridad multijugador** | Actor serializado por partida, validación en el servidor, `requestId` idempotente, reconexión por instantánea y filtrado de visibilidad (R3, R4). | ✅ |
| **VII. Colecciones y monetización** | Solo Core; las reglas del draft no dependen de la colección; la monetización queda fuera del MVP. El campo `coleccion` y FR-015 dejan preparada la ampliación. | ✅ |
| **VIII. Modularidad** | Paquetes `domain`, `engine`, `ai` y `protocol`, más las apps `server` y `web`, que cubren los 10 componentes conceptuales (ver la estructura de abajo). | ✅ |
| **IX. Calidad demostrada con pruebas** | Todas las prioridades de pruebas del principio tienen su suite (quickstart, tabla de pruebas automáticas); los SC se verifican usando la aplicación o con las herramientas. | ✅ |
| **X. Incremental y trazable** | Las historias P1 (draft, alineación, partido rápido) forman un incremento jugable antes que P2 y P3; los requisitos se rastrean en contratos y quickstart. La especificación distingue supuestos de reglas confirmadas. | ✅ |

**Resultado previo a la Fase 0**: no hay infracciones. Las "decisiones pendientes" de la constitución quedan resueltas en la especificación (clarificaciones) y en research.md (pila tecnológica).

**Re-verificación tras la Fase 1** (data-model y contracts):
- El modelo de datos no mete reglas en la interfaz.
- El contrato WebSocket no expone ninguna elección ajena ni ninguna alineación rival antes de tiempo.
- El contrato del motor garantiza la equivalencia entre modalidades.
- No aparecen componentes ni capas no justificadas.

✅ Sin cambios.

## Project Structure

### Documentation (this feature)

```text
specs/001-draft-manager-mvp/
├── plan.md              # Este fichero
├── research.md          # Fase 0: decisiones técnicas (R1–R16)
├── data-model.md        # Fase 1: entidades, validaciones, estados
├── quickstart.md        # Fase 1: guía de puesta en marcha y validación
├── contracts/
│   ├── http-api.md                # API HTTP/JSON
│   ├── realtime-protocol.md       # mensajes WebSocket
│   ├── engine-api.md              # interfaz del motor (interna, compartida)
│   └── player-data.schema.json    # formato del catálogo de jugadores
├── checklists/requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks), no se crea aquí
```

### Source Code (repository root)

```text
package.json · pnpm-workspace.yaml · tsconfig.base.json · docker-compose.yml

data/
└── core.json                     # catálogo Core (unas 300 cartas), validado contra el schema

packages/
├── domain/                       # Reglas puras (Principio III)
│   ├── src/
│   │   ├── catalogo/             # Jugador, specials, validación de carga (FR-016 a FR-024)
│   │   ├── sobres/               # generación de mesa con semilla (FR-011, FR-014, R16)
│   │   ├── draft/                # mesa, turnos, rotación, auto-elección (FR-006 a FR-013)
│   │   ├── equipo/               # formaciones, casillas, alineación, táctica, lanzadores (FR-025 a FR-031)
│   │   ├── torneo/               # calendario, cuadro, clasificación, bajas, amarillas (FR-043, FR-051 a FR-056)
│   │   ├── parametros/           # ParametrosEquilibrado versionados (JSON); los usan sobres, equipo y motor
│   │   └── rng/                  # xoshiro128** y derivación de semillas
│   └── tests/
├── engine/                       # Motor de simulación único (Principios IV y V)
│   ├── src/
│   │   ├── estado/               # estado del partido, posiciones en rejilla, fases
│   │   ├── acciones/             # pase, regate, entrada, remate, parada, falta, tarjeta, lesión…
│   │   ├── modificadores/        # posición, cansancio, specials, táctica, formación
│   │   ├── tramos/               # avanzar hasta un punto de decisión; decisiones encoladas
│   │   └── penaltis/
│   └── tests/                    # determinismo, equivalencia entre modalidades, reglas
├── ai/                           # NPC: evaluador común y perfiles amateur, intermedio, avanzado y PRO
│   ├── src/
│   └── tests/
└── protocol/                     # Esquemas Zod de HTTP y WebSocket compartidos
    ├── src/
    └── schemas/                  # player-data.schema.json (fuente única para el seed)

apps/
├── server/
│   ├── src/
│   │   ├── http/                 # rutas de contracts/http-api.md
│   │   ├── ws/                   # pasarela WebSocket, filtrado de visibilidad
│   │   ├── actores/              # actor por partida: sala, draft, preparación, partido, torneo
│   │   ├── persistencia/         # Drizzle: esquema, migraciones, repositorios
│   │   ├── programador/          # reloj inyectable y temporizadores (turnos, descansos, plazos de jornada)
│   │   ├── auth/                 # Better Auth, invitados (FR-000)
│   │   ├── avisos/               # en la aplicación y por correo (FR-056b)
│   │   └── observabilidad/       # pino, métricas, healthz
│   └── tests/
│       ├── integration/          # con Testcontainers
│       └── contract/             # contratos HTTP y WebSocket
└── web/
    ├── src/
    │   ├── pantallas/            # inicio, sala, draft, plantilla, alineación, partido, torneo, avisos
    │   ├── componentes/          # carta de jugador, campo de alineación, resumen de eventos
    │   ├── campo2d/              # renderizador Canvas e interpolación de fotogramas
    │   ├── conexion/             # cliente WebSocket, reconexión, desfase de reloj
    │   └── estado/               # Zustand
    └── tests/e2e/                # Playwright (escenarios A a F del quickstart)

tools/
├── balance/                      # Monte Carlo: SC-004..007, SC-010, SC-013, SC-015
├── load/                         # k6: SC-017
└── fixtures/                     # semillas y escenarios reproducibles (roja, lesión, empate…)
```

**Structure Decision**: aplicación web en monorepo. Las reglas viven en `packages/domain`, `packages/engine` y `packages/ai`, que son puros y se prueban sin servidor ni interfaz. `apps/server` orquesta, persiste y es la autoridad; `apps/web` solo presenta y envía intenciones. Correspondencia con los componentes conceptuales del Principio VIII:

| Componente (Principio VIII) | Ubicación |
|---|---|
| Jugadores y colecciones | `domain/catalogo`, `data/core.json` |
| Sobres y draft | `domain/sobres`, `domain/draft`, `server/actores` |
| Plantillas y alineaciones | `domain/equipo` |
| Formaciones y tácticas | `domain/equipo`, `engine/modificadores` |
| Motor de simulación | `packages/engine` |
| Presentación rápida | `web/pantallas/partido` |
| Presentación 2D | `web/campo2d` |
| Torneos y clasificaciones | `domain/torneo`, `server/actores` |
| Usuarios y sesiones | `server/auth` |
| Persistencia y comunicación | `server/persistencia`, `server/ws`, `server/http`, `packages/protocol` |

## Complexity Tracking

Sin infracciones de la constitución que justificar.
