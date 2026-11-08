# Implementation Plan: Mejoras de la simulación 2D, control de bajas y retoques del torneo

**Branch**: `main` (sin rama propia, como las specs 008 a 011) | **Date**: 2026-11-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/012-mejoras-simulacion-2d/spec.md`

## Summary

Siete historias, casi todas de presentación, y una pieza delicada en el motor:

1. **Control total (US4)**: hoy la lesión y la expulsión se resuelven a mitad de una acción. Para que parar y no
   decidir dé el mismo partido que el automático (FR-025, SC-006), el motor pasa a **un solo camino en los dos
   modos**: el lance retira al jugador y anota una `Incidencia`; al terminar el paso, o se resuelve en automático o
   se corta el tramo para que decida el participante ([R2](research.md#r2-parada-de-control-total-sin-cambiar-el-partido-fr-022-fr-025-sc-006)).
   El servidor trata la parada como un tercer motivo de la pausa que ya existe (`partido.pausa_decision`), en la 2D
   y en la rápida (R4, R5).
2. **Alineación respetada (US5)**: `alineacionVigente()` deja de tirar la alineación confirmada cuando tiene una baja;
   el servidor bloquea con `409 BAJA_PENDIENTE` y, al vencer el plazo, solo sustituye la baja (`cubrirBajas`, dominio
   puro) (R11).
3. **Celebraciones (US1)**: `celebracion` es un tipo de cosmético más (011/FR-022), con una capa única sobre el campo
   que reproduce las animadas por el juego (registro de componentes) o una secuencia de vídeo con alfa (R6).
4. **Sonidos (US1, US6)**: once efectos nuevos con la API actual `reproducir()` (R7).
5. **Arreglos y retoques (US2, US3, US7, Plantillas)**: franja de altura fija, colores de tarjeta, `GestionEquipo` con
   la distribución de Formación, escudos en Plantillas y botones de sesión (R8–R10, R12).

## Technical Context

**Language/Version**: TypeScript 5 sobre Node ≥ 22, ESM.

**Primary Dependencies**: Fastify 5, Drizzle + `pg`, zod, React 19 + Vite. Sin dependencias nuevas. Los sonidos
sintetizados salen de `tools/sonidos/generar.py` (Python, como los actuales).

**Storage**: PostgreSQL, migración `0015_spec012.sql` ([data-model §1](data-model.md#1-migración-0015_spec012sql)):
tipo `celebracion` y `cosmeticos.datos`, `celebracion` y `modo_incidencias` en `perfiles_usuario` y `participantes`,
aviso `baja_sustituida`. Ficheros nuevos en `apps/web/public/sonidos/` y `apps/web/public/cosmeticos/celebraciones/`.

**Testing**: Vitest (dominio, motor, web, integración del servidor en los dos modos de hilos), `test:equivalence`,
Playwright (`pnpm e2e`) e informe de `pnpm balance`.

**Target Platform**: navegador (escritorio y móvil desde 360 px) y servidor Linux en contenedor.

**Project Type**: monorepo web (`apps/server`, `apps/web`, `packages/{domain,engine,protocol}`, `tools/`).

**Performance Goals**:

- celebración a 60 fps sin tocar el bucle del lienzo (capa DOM/CSS aparte);
- sin consultas nuevas al abrir un partido: celebración y modo se leen de la fila del participante en memoria;
- la parada de incidencia no añade trabajo al motor (corte al final de un paso que ya se ejecutaba).

**Constraints**:

- misma semilla y mismas decisiones ⇒ mismo partido en los dos modos (FR-025, SC-006);
- ninguna jornada avanza con una baja pendiente evitable antes del plazo, validado en el servidor (SC-008);
- campo de tamaño constante en todo el partido (SC-004);
- 🔊, volumen general y `prefers-reduced-motion` en todo lo nuevo;
- Principio XI en «Gestionar equipo», Avisos y la parada.

**Scale/Scope**: 11 efectos de sonido, 5 celebraciones (4 visibles + 1 de prueba), ~35 ficheros tocados.

Sin NEEDS CLARIFICATION: las tres dudas abiertas (parada en la rápida, número de celebraciones, bloqueo sin
suplentes) se resolvieron en la sesión de aclaraciones del 2026-11-08.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo se cumple | Estado |
|-----------|----------------|--------|
| I. La estrategia es determinante | Control total da más decisión al participante; sin cambios de parámetros. | ✅ |
| II. Draft | Solo sonidos en el draft; reglas intactas. | ✅ |
| III. Reglas de dominio explícitas | `bajasPendientes`, `cubrirBajas` y las incidencias son funciones puras con tests, en `packages/domain` y `packages/engine`. | ✅ |
| IV. Simulación coherente | Invariantes I1–I5 del [contrato del motor](contracts/motor.md); `test:equivalence` y `balance` antes y después. | ✅ |
| V. Un único motor | La parada es un corte de `avanzar()`, no otro cálculo. Las dos modalidades paran igual. Celebraciones y sonidos son solo presentación. | ✅ |
| VI. Integridad multijugador | Decisiones de la parada validadas por `validarDecision`; bloqueo `BAJA_PENDIENTE` en el servidor; el modo solo existe contra NPC; el plazo de jornada sigue mandando con varios humanos. | ✅ |
| VII. Monetización | Celebraciones gratuitas y cosméticas; la venta queda para otra spec («Próximamente»). | ✅ |
| VIII. Modularidad | Incidencias en el motor, bajas en dominio, pausa en el actor de partido, celebraciones en un componente con registro. | ✅ |
| IX. Calidad con pruebas | Tests de motor, dominio, integración, web y e2e ([R13](research.md#r13-pruebas)); cada SC con su recorrido en el [quickstart](quickstart.md). | ✅ |
| X. Incremental y trazable | US entregables por separado (orden abajo); cada paso cita su FR. | ✅ |
| XI. Sin desplazarse | Gestionar equipo con la distribución de Formación; el aviso de la parada y el botón bloqueado, a la vista. | ✅ |
| Flujo git | El agente no hace commit ni push. | ✅ |

**Re-check tras el diseño (Fase 1)**: sin cambios. El único punto que roza «fuera de alcance: cambios del motor» es
mover la resolución automática del lance al final del paso (R2): no cambia reglas ni parámetros, y es lo mínimo que
exige FR-025. Se registra en Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/012-mejoras-simulacion-2d/
├── plan.md              # Este fichero
├── research.md          # Fase 0: R1–R13
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/
│   ├── motor.md         # Incidencias y sus invariantes
│   ├── protocolo.md     # WS y HTTP
│   └── ui.md            # CapaCelebracion, parada, Gestionar equipo, avisos, sonidos
├── checklists/
└── tasks.md             # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
data/cosmeticos.json                          # + 5 celebraciones
docs/juego/sonidos.md                         # «Pendientes» → «Sonidos actuales»
tools/sonidos/generar.py                      # + pitidos, confirmación, latido, clic
packages/domain/src/
├── cosmeticos/tipos.ts                       # 'celebracion', DatosCelebracion, CELEBRACION_DEL_JUEGO
└── equipo/bajas.ts                           # NUEVO: bajasPendientes, haySuplenteDisponible, cubrirBajas
packages/engine/src/
├── estado/estado.ts                          # Incidencia, incidencias, EquipoEstado.controlTotal
├── acciones/plantel.ts                       # retirar sin resolver + resolverIncidencias()
├── tramos/avanzar.ts                         # corte al final del paso; resolver al reanudar
├── tramos/decisiones.ts                      # sustituir al lesionado de una incidencia
└── tests/incidencias.test.ts                 # NUEVO: I1–I5
packages/protocol/src/
├── ws/partido.ts                             # celebraciones, pausa 'incidencia', partido.modo_incidencias
└── http/{cosmeticos.ts, equipo.ts, plantillas.ts}
apps/server/
├── drizzle/0015_spec012.sql                  # NUEVO
├── src/persistencia/esquema/{cosmeticos.ts, base.ts, torneo.ts}
├── src/persistencia/seed.ts                  # datos de celebraciones
├── src/actores/
│   ├── partidoRapido.ts                      # pausa 'incidencia', celebraciones en partido.inicio, reconstruirMotor
│   ├── partido2d.ts                          # parada en avanzar2D
│   ├── equipo.ts                             # alineacionVigente sin descarte, bloqueo, avisosEquipo
│   ├── identidad.ts                          # celebracion y modo al unirse
│   └── torneo.ts / preparacion.ts            # cubrirBajas al vencer el plazo + aviso
├── src/http/{partidos.ts (abrir: 409), perfil.ts, plantillas, equipo}
├── src/avisos/servicio.ts                    # 'baja_sustituida'
└── tests/integration/{incidencias.test.ts, bajas-pendientes.test.ts, celebraciones.test.ts}   # NUEVOS
apps/web/
├── public/sonidos/                           # 11 ficheros + LICENCIA
├── public/cosmeticos/celebraciones/          # celebracion-prueba-secuencia.webm (+ .mov)
├── src/sonido/sonido.ts                      # efectos nuevos
├── src/componentes/
│   ├── celebraciones/                        # NUEVO: CapaCelebracion + 4 de juego + registro
│   ├── SelectorCelebracion.tsx               # NUEVO
│   ├── SelectorModoIncidencias.tsx           # NUEVO
│   ├── GestionEquipo.tsx                     # distribución de Formación
│   ├── BarraPrincipal.tsx                    # clicPrincipal
│   ├── BandejaAvisos.tsx                     # avisosEquipo
│   └── ResumenEventos.tsx                    # (sin cambios: el arreglo es CSS)
├── src/pantallas/{Partido2D.tsx, PartidoRapido.tsx, Alineacion.tsx (useDistribucion), Torneo.tsx,
│                  Plantillas.tsx, Perfil.tsx, Tienda.tsx, Draft.tsx, Inicio.tsx, PruebasCartas.tsx}
├── src/estilos/base.css                      # franja fija, tarjetas, celebraciones, botones de sesión
└── tests/{unit/celebracion.test.tsx, e2e/partido-2d.spec.ts, e2e/control-total.spec.ts}
ROADMAP.md                                    # estado de la 012
```

**Structure Decision**: todo en los paquetes existentes. Lo nuevo de reglas va en `packages/domain` (bajas) y
`packages/engine` (incidencias), testable sin servidor ni interfaz.

## Orden de implementación sugerido

1. **US2 (P1), arreglos**: franja de altura fija y tokens de tarjeta. Pequeño e independiente; el e2e de SC-004 sirve
   de red para el resto de cambios de la 2D.
2. **Base**: migración 0015, esquema, seed, `TipoCosmetico` y protocolo.
3. **US1 (P1), sonidos del partido y celebraciones**: efectos y ficheros; `CapaCelebracion` y las 4 de juego;
   `celebraciones` en `partido.inicio`; `SelectorCelebracion` en Perfil; «Próximamente» en la tienda; celebración de
   prueba en `PruebasCartas`.
4. **US3 (P2), Gestionar equipo**: `useDistribucion()` y filtro. Va antes de US4, que la abre.
5. **US4 (P2), control total**: motor (incidencias, I1–I5, referencias regeneradas, `balance` comparado) → servidor
   (pausa, comando de modo, `reconstruirMotor`) → cliente (selector, parada en 2D y en rápida).
6. **US5 (P2), bajas**: dominio `bajas.ts` → `alineacionVigente`, 409, `cubrirBajas` al vencer, aviso → cliente
   (botón, `BandejaAvisos`, Plantillas).
7. **US6 y US7 (P3)**: sonidos de draft, interfaz y tienda; botones de sesión.
8. **Cierre**: `sonidos.md`, ROADMAP, suite completa, recorridos del [quickstart](quickstart.md), `graphify update .`.

US1, US2, US3, US5 y US7 son independientes entre sí; US4 necesita US3.

## Riesgos

- **Referencias del motor (R2)**: mover la sustitución por lesión al final del paso cambia los partidos concretos con
  semilla fija. Hay que regenerar las referencias que los fijan y comparar el informe de `balance`; si alguna métrica
  sale de su umbral, se revisa antes de seguir con el servidor.
- **Vídeo con alfa en Safari**: WebM VP9 con alfa no funciona en Safari; sin el `.mov` HEVC, allí se ve la clásica. Es
  aceptable para la celebración de prueba; para las de venta futuras habrá que entregar los dos formatos.
- **Sonidos de público con licencia**: dependen de encontrar CC0 de calidad; si no, se sintetizan (peor resultado) y
  se marca en `sonidos.md` para sustituir.
- **Bloqueo con un solo humano**: no hay plazo, así que una baja sin resolver deja la partida esperando a propósito
  (FR-030); el mensaje del botón debe decir exactamente qué hacer.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Cambio de momento en el motor (resolución del lance al final del paso, también en automático) | FR-025 / SC-006 exigen que parar sin decidir dé el mismo partido | Diferir solo en control total cambia el resto de la acción en ese modo y rompe SC-006 (R2) |
