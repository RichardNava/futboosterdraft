# Implementation Plan: Rework del motor: fatiga, tácticas y rendimiento

**Branch**: `018-rework-motor` | **Date**: 2026-11-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/018-rework-motor/spec.md`

## Summary

La spec sustituye el cansancio actual por una **energía de 0 a 100** con gasto por rol, rasgos y acciones intensas;
reequilibra las tácticas con ventaja y coste reales; baja el coste del motor a **≤ 60 ms por partido** (≤ 80 ms con
fotogramas) y deja la **9.0.0** como única versión que se simula. Las partidas activas se cierran una sola vez al desplegar.

Enfoque técnico:

- **Un solo motor** (`packages/engine`), con todos los valores en `PARAMETROS_V9` (`packages/domain`).
- **Movimiento**: la dirección y la velocidad se deciden cada 4 ticks, y la posición avanza cada 2. Los fotogramas siguen
  cada 2 ticks con posiciones reales, así que ni el protocolo ni el cliente 2D cambian ([R7](research.md#r7-cadencia-de-movimiento)).
- **Calibración antes de optimizar**: línea base, cambios, medida en CI, umbrales aprobados, huellas una sola vez y
  optimización sin cambiar resultados (FR-001).
- **Cierre**: un paso idempotente en el arranque, antes de rehidratar y de aceptar tráfico, que reutiliza el estado
  `abandonada` y el aviso `partida_cerrada` de la spec 017 ([R14](research.md#r14-cierre-de-partidas-al-desplegar)).

## Technical Context

**Language/Version**: TypeScript en Node 22 (CI y producción); en local hay Node 24, solo orientativo

**Primary Dependencies**: las actuales (Fastify, Drizzle, React, Zod, Vitest, tsx). **Ninguna nueva**

**Storage**: PostgreSQL 16. Sin migración propia si la `0018_spec017.sql` ya está integrada ([R15](research.md#r15-integración-con-la-spec-017))

**Testing**: Vitest (unidad, integración y equivalencia), `pnpm balance`, `umbral-motor`, Playwright y k6 (`tools/load/beta-100.js`)

**Target Platform**: servidor Linux en Docker (una réplica) y navegador

**Project Type**: monorepo web con pnpm (`apps/server`, `apps/web`, `packages/*`, `tools/*`)

**Performance Goals**: ≤ 60 ms sin fotogramas, ≤ 80 ms con fotogramas, ≤ 60 ms en `resolverResto` y con métricas (CI, Node 22); vista 2D a 60 fps

**Constraints**: determinismo total; las acciones intensas no consumen PRNG; la optimización no cambia ningún resultado; `packages/protocol/src/ws/partido.ts` no se modifica (FR-021)

**Scale/Scope**: unos 5.700 ticks por partido; 100 partidas simultáneas en 8 núcleos; 53 FR y 13 SC

No quedan puntos «NEEDS CLARIFICATION»: están resueltos en [research.md](research.md). Las decisiones que completan
huecos de la spec están en [Decisiones para la persona responsable](#decisiones-para-la-persona-responsable).

## Constitution Check

*GATE: se comprueba antes de la fase 0 y de nuevo tras el diseño.*

| Principio | Cómo se cumple | Antes | Tras el diseño |
|---|---|---|---|
| I. Estrategia determinante | Cada táctica tiene ventaja y coste medibles (SC-005, SC-006) | Cumple | Cumple |
| II. Draft como núcleo | El draft no cambia | Cumple | Cumple |
| III. Reglas explícitas | Todos los valores en `PARAMETROS_V9`, incluidos los fijos de `formacionTactica.ts` (FR-034) | Cumple | Cumple |
| IV. Simulación verificable | Prueba de unidad y comprobación estadística por rasgo (FR-050); reglas deterministas | Cumple | Cumple |
| V. Motor único | Misma cadencia y lógica para NPC, humanos, rápida y 2D (FR-038, FR-043) | Cumple | Cumple |
| VI. Integridad multijugador | Cierre transaccional e idempotente; una partida cerrada no admite abrir partidos | Cumple | Cumple |
| VII. Monetización | Solo se devuelve lo cobrado por el nivel de rareza; no se entregan premios | Cumple | Cumple |
| VIII. Modularidad | La energía queda en `modificadores/`, el cierre en `actores/`; la vista solo pinta | Cumple | Cumple |
| IX. Calidad demostrable | Informes legibles de línea base y de calibración; CI bloqueante | Cumple | Cumple |
| X. Incremental y trazable | Seis etapas con puerta de salida | Cumple | Cumple |
| XI. Sin desplazamiento | Solo cambian textos de la ayuda de energía | Cumple | Cumple |
| Git reservado a personas | La medida en CI exige que la persona publique la rama; el agente no hace `commit` ni `push` | Cumple | Cumple |

Sin violaciones: no hace falta *Complexity Tracking*.

## Secuencia de entrega

Cada etapa tiene una puerta. No se pasa a la siguiente sin cumplirla (FR-001).

| Etapa | Contenido | Puerta de salida |
|---|---|---|
| **0. Preparación** | Job de CI independiente para el rendimiento ([R9](research.md#r9-medida-de-rendimiento-en-ci)) y herramienta `linea-base` | El job corre aunque fallen otras pruebas |
| **1. Línea base** | Medir la 8.0.0 sin tocar el motor | `linea-base-8.0.0.md` registrado (SC-001) |
| **2. Implementación** | Energía, tácticas, `PARAMETROS_V9`, cadencia, retirada de ramas y migración de pruebas | Pruebas exactas e igualdad rápida/2D en verde (SC-002, FR-004) |
| **2b. Decisión de cadencia** | Medir en CI con objetivos cada 4 ticks; si pasa de 60 ms, cada 8 | Cadencia fijada. Si ni con 8 se alcanza, **decide la persona** (FR-003) |
| **3. Calibración** | Referencias de acciones, pesos y umbrales | `pnpm balance` en verde con umbrales **aprobados** (SC-003 a SC-007) |
| **4. Huellas** | Regenerar **una vez** equivalencia y semillas | `huella-018.json` creada |
| **5. Optimización** | Mejoras sin cambio de resultados | `pnpm test:equivalence` idéntico y `umbral-motor` en verde (SC-008, SC-009) |
| **6. Validación y cierre** | Cierre de partidas, textos, documentos, 2D y carga | SC-010 a SC-013 |

El cierre de partidas (US5) se puede desarrollar en paralelo desde la etapa 2, pero solo después de integrar la spec 017.

## Decisiones para la persona responsable

Completan huecos de la spec. El plan sigue con la opción indicada salvo que se cambie.

1. **Individual activado a mitad de partido** ([R11](research.md#r11-estrella-y-marcador)). La spec fija la pareja «al
   empezar el partido», pero la táctica se puede cambiar en una pausa. Se elige **una sola vez, la primera vez que el
   equipo activa Individual**. Si deja Individual, el efecto se suspende; si vuelve, sigue la misma pareja si ambos están en el campo.
2. **Energía de referencia y descuento** ([R5](research.md#r5-referencia-al-90-y-descuento)). El descuento medio de la
   primera parte es de 2,28 minutos y le quita a un medio unos 2,7 puntos al 90', casi todo el margen de ±3. Los
   criterios SC-003 y SC-004 se comparan con la **curva corregida con el descuento real** de cada partido.
3. **Presión contada al entrar** ([R4](research.md#r4-acciones-intensas)). Una presión cuenta cuando el jugador **entra** a
   presionar, no por cada instante, para que el coste no dependa de la cadencia. Si el coste de Presión alta se queda
   corto (SC-005), se sube su peso al calibrar.
4. **Sin correo en el aviso de cierre** ([R14](research.md#r14-cierre-de-partidas-al-desplegar)). El aviso llega a la
   bandeja dentro de la misma transacción. La beta no es pública, así que no se envía correo.

## Project Structure

### Documentation (this feature)

```text
specs/018-rework-motor/
├── plan.md              # Este fichero
├── research.md          # Decisiones técnicas (fase 0)
├── data-model.md        # Estado, parámetros 9.0.0 y transiciones (fase 1)
├── quickstart.md        # Guía de validación (fase 1)
├── contracts/
│   ├── motor.md         # API del motor, reglas y textos
│   ├── cierre-partidas.md
│   └── herramientas.md  # linea-base, balance, umbral-motor y CI
├── linea-base-8.0.0.md  # Etapa 1
├── informe-9.0.0.md     # Etapa 3: medidas y umbrales aprobados
└── tasks.md             # Lo crea /speckit-tasks
```

### Source Code (repository root)

```text
packages/domain/src/
├── parametros/index.ts          # PARAMETROS_V9, ParametrosMotor, VERSION_MAYOR_SOPORTADA = 9
├── catalogo/rasgos.ts           # Descripciones de Incansable, Fatigado, Indisciplinado y Motivador
└── partida/partida.ts           # Evento cerrar_version (con el cerrar_admin de la 017)

packages/engine/src/
├── modificadores/cansancio.ts   # Energía, ritmo, gasto, recuperación y penalización
├── modificadores/atributos.ts   # Penalización por tipo de stat
├── modificadores/liderazgo.ts   # Liderazgo con penalización mental
├── modificadores/formacionTactica.ts  # Tácticas desde parámetros
├── modificadores/marcajeEstrella.ts   # Nuevo: elección y efectos de Individual
├── espacio/{paso,movimiento,objetivos}.ts  # Cadencia, sprints, marcador y línea adelantada
├── acciones/{juego,tiro,contexto}.ts  # Acciones intensas, ventaja de banda y duelos
├── tramos/avanzar.ts            # Recuperación en las pausas
└── estado/estado.ts             # energia, marcajeEstrella y ventajaBanda

packages/ai/src/{partido,perfiles,rasgos}.ts      # Cambios de los NPC por energía
apps/server/src/actores/cierreMotor9.ts           # Nuevo: cierre único
apps/server/src/actores/torneo.ts                 # Una partida cerrada no abre partidos
apps/server/src/economia/servicio.ts              # devolverCobroRareza dentro de una transacción
apps/server/src/main.ts                           # Llama al cierre antes de rehidratar
apps/web/src/componentes/{GestionEquipo,IndicadorEnergia}.tsx  # Ayuda de energía
tools/balance/src/{lineaBase,umbralMotor,cli}.ts  # Medidas y umbrales
tools/balance/src/checks/motor018.ts              # Comprobaciones nuevas
.github/workflows/ci.yml                          # Job de rendimiento independiente
docs/juego/enfrentamientos.md, ROADMAP.md, specs/001, 002 y 014  # Documentación sustituida
```

**Structure Decision**: se mantiene el monorepo. Solo hay tres módulos nuevos (`marcajeEstrella.ts`, `cierreMotor9.ts` y
`lineaBase.ts`), porque cada uno tiene una responsabilidad propia y evita engordar `juego.ts` o `gestor.ts`.

## Riesgos principales

- **60 ms**: con los perfiles previos, mover cada 4 ticks y evitar repetir objetivos en saques deja el partido en unos
  **70 ms** (estimación). Lo más probable es tener que pasar los objetivos a 8 ticks ([R8](research.md#r8-objetivos-y-saques)).
- **Migración de pruebas**: `tests/ayudas.ts` usa la 7.0.0 y de él dependen casi todas las pruebas del motor. Es el mayor
  volumen de trabajo de la etapa 2.
- **Coste de Presión alta**: puede quedar muy por debajo del actual; SC-005 lo vigila.
- **Solape con la 017**: comparte `gestor.ts`, el aviso `partida_cerrada`, la migración 0018 y `metricas.test.ts`.
