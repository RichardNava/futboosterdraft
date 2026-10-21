# Implementation Plan: Virtudes, defectos y nuevo modo de juego

**Branch**: `005-virtudes-defectos` | **Date**: 2026-10-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-virtudes-defectos/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

La spec 005 se construye sobre el código de la spec 004 (commit `5007f5a`), sin cambiar la pila. Tiene cinco frentes:

1. **Renombrado (US1)**. «Specials» pasa a «virtudes» de una vez, en código, datos, base de datos, protocolo, pruebas y
   documentación. No hay capa de compatibilidad: una migración renombra la columna y las claves de los partidos guardados
   (R3).
2. **Rasgos nuevos (US2, US5)**.
   - Las virtudes y los defectos se definen en una **única tabla de rasgos** del dominio, con nombre, descripción, ámbito,
     impacto e incompatibilidades. El documento de referencia se genera a partir de ella y una prueba falla si se
     desincroniza (R8).
   - El motor aplica los 15 defectos y las 4 virtudes nuevas en los puntos donde ya se resuelven faltas, tarjetas,
     lesiones, cansancio, autogoles, pases, acciones defensivas y medias efectivas (R6).
   - Una pasada determinista sobre `data/core.json` añade defectos y virtudes nuevas a las 300 cartas, sin quitar ninguna
     virtud existente (R5). Así, los torneos empezados antes del cambio pueden seguir con las cartas antiguas filtrando los
     rasgos añadidos (R4).
3. **Frecuencias de partido (US4)**. Los parámetros **4.0.0** suben faltas, amarillas, rojas y lesiones hasta los
   objetivos de FR-071, sin inflar los penaltis, que ya están cerca del objetivo (R1, R2). Los parámetros 3.0.0 siguen
   reproduciendo igual los partidos ya jugados (R7).
4. **Modo «Duelo de jugadores» (US3)**.
   - Es un modo de torneo nuevo, `duelos`, que reutiliza el cuadro del playoff.
   - El anfitrión fija la formación común y el Estado de forma antes del draft.
   - El once se confirma una vez y queda bloqueado.
   - Cada cruce se resuelve en el servidor con una función pura del dominio (R9, R10).
   - El cliente lo presenta con una pantalla de duelos animada (R11).
5. **IA y documentación (FR-043, FR-050 a FR-055, FR-080)**.
   - La IA valora cartas y alineaciones con el impacto de los rasgos (R12).
   - Se publica `docs/juego/virtudes-y-defectos.md`, las specs anteriores enlazan a él y se modifica la constitución
     (versión 1.2.0, R14).

## Technical Context

**Language/Version**: TypeScript 5.x; Node.js 22 LTS; navegadores modernos. Sin cambios (001/R1).

**Primary Dependencies**: las mismas de las specs 001 a 004 (Fastify, `ws`, Drizzle, React 19, React Router 7, Zustand,
Zod, better-auth, Ajv). **Ninguna nueva**: la animación de los duelos usa transformaciones CSS y la Web Animations API, y
el icono del modo es un SVG propio del conjunto `Icono`.

**Package Manager**: pnpm 9, sin excepciones (CLAUDE.md).

**Storage**: PostgreSQL 16. Una sola migración, `0010_virtudes_defectos`:

- `jugadores`: renombra `specials` a `virtudes` y añade `defectos text[] not null default '{}'`;
- `partidos.entrada`: renombra la clave `"specials"` a `"virtudes"` en las cartas guardadas;
- `partidas`: añade `version_catalogo integer not null default 1` (las nuevas se crean con 2) y `config_duelos jsonb`, y
  amplía las restricciones de `modo` y `num_participantes` a `duelos`;
- `partidos`: añade `tipo text not null default 'futbol'` (`'futbol' | 'duelos'`) y `duelos jsonb`;
- `alineaciones`: añade `bloqueada boolean not null default false`.

Detalle en [data-model.md](./data-model.md).

**Testing**: Vitest (unidad e integración por paquete), Playwright (e2e de `apps/web`) y la herramienta `tools/balance`
para los criterios estadísticos (constitución IX). Las comprobaciones nuevas de `balance` son: frecuencias de disciplina y
lesiones (SC-011), efecto de cada rasgo (SC-004, SC-005), coherencia del impacto (FR-051) y series de duelos (SC-010).

**Target Platform**: servidor Node en Linux (despliegue de `docs/despliegue.md`) y navegadores modernos de escritorio y
móvil.

**Project Type**: monorepo web con `apps/server`, `apps/web`, `packages/{domain,engine,ai,protocol}` y
`tools/{balance,fixtures}`.

**Performance Goals**:

- Resolver un cruce de duelos en el servidor en menos de 5 ms (es una función pura sobre 22 jugadores).
- La animación de un duelo a velocidad normal dura unos 2,5 s; el cruce completo, menos de 30 s, y con «Saltar» se ve
  el resumen al instante (SC-009).
- La herramienta `balance` no debe tardar más del doble que con la spec 004 en el conjunto de comprobaciones.

**Constraints**:

- Determinismo: el mismo partido o cruce con la misma semilla da el mismo resultado (constitución IV y V).
- Los partidos con parámetros 3.x se reproducen idénticos (SC-003).
- Los torneos empezados antes de la migración terminan con las cartas antiguas (FR-036).
- Sin tildes en el código (CLAUDE.md).

**Scale/Scope**:

- 19 rasgos nuevos (15 defectos y 4 virtudes) sobre los 35 existentes.
- 300 cartas de Core.
- Un modo de torneo nuevo de 4, 8 o 16 participantes.
- Cerca de 120 ficheros tocados por el renombrado.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo se cumple | Estado |
|---|---|---|
| I. La estrategia debe ser determinante | Los defectos obligan a sopesar la media frente a los rasgos en el draft y la alineación. En los duelos, los rasgos pesan como máximo ±1 punto cada uno y el Estado de forma ±2, de modo que la media decide (SC-010). | ✔ |
| II. El draft es el núcleo | El draft no cambia en ningún modo (FR-062). Duelos solo añade dos ajustes del anfitrión antes del draft. | ✔ |
| III. Reglas del dominio explícitas | Tabla única de rasgos en `packages/domain` (R8); la resolución de los duelos es una función pura del dominio (R9); los parámetros están versionados (R7). | ✔ |
| IV. Simulación coherente, verificable y equilibrada | Cada rasgo tiene una comprobación en `balance` y una prueba de unidad (FR-055, R13); las frecuencias se comprueban contra sus objetivos (R2). | ✔ |
| V. Un único motor, dos modalidades | Los rasgos se aplican en el motor compartido (FR-041). Los duelos no son una modalidad de partido, sino otra forma de resolver un cruce, sin un segundo motor de partidos (ver la modificación de la constitución, R14). | ✔ con modificación |
| VI. Integridad multijugador | Los duelos se resuelven en el servidor. La formación y el Estado de forma se validan en el servidor y solo los puede cambiar el anfitrión. El once bloqueado no se puede volver a enviar (R10). | ✔ |
| VII. Colecciones y monetización | Las reglas de reparto valen para cualquier catálogo (FR-037) y no dan ventajas fuera del draft. | ✔ |
| VIII. Modularidad | Rasgos en `domain/catalogo`, efectos en `engine/modificadores`, duelos en `domain/duelos` + actor de servidor, presentación en `apps/web`. | ✔ |
| IX. Calidad demostrada con pruebas | Criterios estadísticos en el informe de `balance`; e2e de cartas, alineación de duelos y animación. | ✔ |
| X. Desarrollo incremental y trazable | Historias independientes: el renombrado (US1) va primero, y las demás se pueden entregar por separado (ver «Orden de entrega»). | ✔ |
| Flujo de trabajo: sin `git commit` ni `git push` por agentes | Se respeta: los commits se sugieren a la persona. | ✔ |

**Re-check tras la Fase 1**: sin violaciones. La única tensión es con el Principio V: la constitución describe el partido como
la única forma de resolver un enfrentamiento. Se resuelve con la modificación MINOR de R14, que registra el modo Duelo de
jugadores como decisión resuelta y aclara que no usa el motor de partidos. No hace falta tabla de complejidad.

## Project Structure

### Documentation (this feature)

```text
specs/005-virtudes-defectos/
├── plan.md              # Este fichero
├── research.md          # Fase 0: decisiones R1–R14
├── data-model.md        # Fase 1: entidades, migración y validaciones
├── quickstart.md        # Fase 1: guía de validación
├── contracts/
│   ├── rasgos.md            # Tabla de rasgos: forma, impacto inicial e incompatibilidades
│   ├── engine-api.md        # Cambios en la API del motor y parámetros 4.0.0
│   ├── duelos-api.md        # Función de resolución de duelos del dominio
│   ├── http-api.md          # Endpoints nuevos y modificados
│   ├── realtime-protocol.md # Mensajes WS nuevos y modificados
│   └── ui.md                # Pantallas y componentes
├── checklists/requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/domain/src/
├── catalogo/
│   ├── tipos.ts            # Virtud, Defecto, Jugador.virtudes/defectos, MAX_VIRTUDES, MAX_DEFECTOS
│   ├── rasgos.ts           # NUEVO: tabla única de rasgos (R8)
│   ├── versionCatalogo.ts  # NUEVO: cartas de la versión 1 a partir de las actuales (R4)
│   └── validar.ts          # máximo de defectos, incompatibilidades
├── duelos/                 # NUEVO: puntuación efectiva y resolución de cruces (R9)
├── equipo/statsEfectivos.ts  # Versátil, Inflexible, multiplicadores de media
├── partida/partida.ts      # Modo 'duelos', ConfigDuelos
├── torneo/                 # cuadro de duelos sobre cuadroPlayoff
└── parametros/v4.json      # NUEVO: parámetros 4.0.0 (R7)

packages/engine/src/
├── modificadores/virtudes.ts  # antes specials.ts
├── modificadores/defectos.ts  # NUEVO
├── modificadores/cansancio.ts # Fatigado, Indisciplinado
├── acciones/{balonParado,lesiones,tiro,opciones,juego,plantel}.ts
└── estado/estado.ts        # JugadorEnPartido.entroDesdeBanquillo

packages/ai/src/            # evaluador, alineación y sustituciones con impacto (R12)
packages/protocol/          # esquema de carta (virtudes, defectos), ConfigDuelos, mensajes de duelos

apps/server/src/
├── http/textosRasgos.ts    # antes textosSpecials.ts; lee la tabla de rasgos
├── actores/{sala,preparacion,torneo}.ts  # configuración de duelos, once bloqueado, cruces de duelos
├── actores/duelos.ts       # NUEVO: resolución y vista de cruces de duelos
└── drizzle/0010_virtudes_defectos.sql

apps/web/src/
├── componentes/CartaJugador.tsx  # dos filas: virtudes y defectos
├── componentes/Icono.tsx         # icono «duelo»
├── componentes/ConfigDuelos.tsx  # NUEVO: formación y Estado de forma en la sala
├── pantallas/{CrearPartida,Sala,Alineacion,Torneo}.tsx
└── pantallas/Duelos.tsx          # NUEVO: animación y resumen de un cruce

tools/fixtures/src/asignarRasgos.ts  # NUEVO: pasada de rasgos sobre Core (R5)
tools/balance/src/checks/rasgos.ts, disciplina.ts, duelos.ts  # NUEVOS (R2, R13)
docs/juego/virtudes-y-defectos.md    # NUEVO (generado, R8)
```

**Structure Decision**: se mantiene el monorepo de las specs anteriores. Lo nuevo va en módulos con una responsabilidad
cada uno: `domain/catalogo/rasgos.ts`, `domain/duelos/`, `engine/modificadores/defectos.ts`, `server/actores/duelos.ts` y
`web/pantallas/Duelos.tsx`. Así, cada historia se puede probar por separado.

### Orden de entrega

1. **US1, renombrado.** Va solo y primero: es mecánico, no cambia ningún comportamiento (SC-003) y desbloquea el resto.
2. **Tabla de rasgos y documento** (US6, base de todo lo demás).
3. **Defectos y virtudes nuevas** en dominio, motor, catálogo y cartas (US2, US5), con la versión de catálogo (R4).
4. **Parámetros 4.0.0** y frecuencias (US4).
5. **Modo Duelo de jugadores** (US3).
6. **IA** (R12), **constitución** y enlaces en las specs anteriores (R14).

## Complexity Tracking

Sin violaciones de la constitución que justificar.
