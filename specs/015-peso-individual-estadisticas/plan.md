# Implementation Plan: Peso individual de las estadísticas — duelos atacante contra defensor

**Branch**: `015-peso-individual-estadisticas` | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/015-peso-individual-estadisticas/spec.md`

## Summary

Versión de parámetros **8.0.0** del motor, en tres tandas de calibración. Cada una se cierra con `pnpm balance --n
1000` antes de empezar la siguiente.

1. **Tanda 1 (US1–US3)**: base y pendiente propias por acción (R2), con estos valores de partida: regate ×1,1;
   conducción con base 0,25 y ×1,15; pase corto con base 1,57 y ×1,27. El remate no cambia: ya cumple FR-002. Quite
   nuevo por demarcación, con Presionador y Mal defensor sobre el multiplicador (R3). El regate pesa en la elección
   también con espacio por delante (R4). Cabeceador pasa a cualquier jugador de campo y da +15 en todos los duelos
   aéreos (R5). Seis centrales de Core cambian una virtud por Cabeceador, con la versión 3 del catálogo (R6).
2. **Tanda 2 (US4–US5)**: antes de cada pase se juega el duelo de desmarque contra el rival que marca al receptor (el
   más cercano a él, a una distancia corta). Quien gana recibe libre y el pase es más fácil; quien pierde recibe con
   el rival encima y juega el duelo de técnica contra presión al controlar. El pasador busca más al compañero que
   suele ganar su duelo (R7, R8).
3. **Tanda 3 (US6)**: el liderazgo del defensa reduce el desfase de los defensas cercanos respecto a su línea. El del
   portero suma un 2,5 % de su valor al atributo de los defensas de la zona propia en sus duelos (R9).

Lo más importante del diseño (R1): todo lo nuevo se activa con **bloques opcionales de parámetros**. Sin ellos, el
código hace exactamente lo de la 7.0.0. Así los partidos 7.0.0 se siguen reproduciendo igual (FR-022) y
`huella-014.json` sigue sirviendo de prueba de que la 7.0.0 no ha cambiado. `VERSION_MAYOR_SOPORTADA` se queda en 7.

Hallazgo de la Fase 0: con los valores de la 7.0.0, el regate y el remate ya caen en sus rangos de FR-002 (R2). Lo que
falla es el pase corto (78 %, demasiado fácil para un mal pasador) y la conducción 70 contra 90 (38 %). Al regateador
le falta **frecuencia**, no acierto, como ya sospechaba la spec.

## Technical Context

**Language/Version**: TypeScript 5 sobre Node ≥ 22, ESM.

**Primary Dependencies**: las del monorepo, sin dependencias nuevas. El trabajo está en `@fbd/domain` (parámetros,
rasgos, catálogo), `@fbd/engine` (duelos, atributos, pases) y `tools/balance` (comprobaciones).

**Storage**: sin migración. Cambian `data/core-real.json` (seis cartas) y `VERSION_CATALOGO_ACTUAL` (2 → 3). Las
partidas creadas con la versión 2 siguen viendo las virtudes de antes mediante `cartaEnVersion` (R6).

**Testing**: Vitest. Las curvas se prueban como funciones puras con los parámetros 8.0.0. Hay tests de quite,
Cabeceador, desmarque, control con presión y liderazgo, `huella-014.json` intacta con la 7.0.0 y una huella nueva
`huella-015.json` con la 8.0.0. Las comprobaciones nuevas del informe de `pnpm balance` están en
[contracts/balance.md](contracts/balance.md).

**Target Platform**: servidor Node (el motor) y navegador (la 2D reproduce los mismos eventos). La interfaz no cambia,
salvo los textos de tres rasgos.

**Project Type**: monorepo web (`apps/server`, `apps/web`, `packages/{domain,engine,protocol,ai}`, `tools/`).

**Performance Goals**: SC-009, es decir, no tardar más de un 10 % que la 7.0.0 por partido y seguir bajo el umbral de
`umbralMotor.ts`. Por pase se añade un único bucle sobre los rivales para localizar al marcador, más el cálculo del
peso de desmarque de cada candidato a recibir (R7).

**Constraints**:

- Un único motor (Principio V): la 2D y la rápida no ganan lógica.
- Determinismo: misma semilla y versión ⇒ mismo partido; la 7.0.0 no cambia ni un evento (R1).
- FR-021: sin regresiones en 001/SC-004, en los goles de la 003 ni en la 005.
- FR-020: 150 pases completados por partido al cerrar la tanda 2.
- Sin tildes en el código.
- Los agentes no hacen commit.

**Scale/Scope**:

- Motor: unos 8 ficheros (`modificadores/atributos.ts`, `acciones/{duelo,juego,opciones,receptor,tiro,contexto}.ts`,
  `espacio/objetivos.ts`) y 2 nuevos (`acciones/desmarque.ts`, `modificadores/liderazgo.ts`).
- Dominio: 4 ficheros (`parametros/index.ts`, `catalogo/{tipos,rasgos,versionCatalogo}.ts`).
- Balance: 3 ficheros (`checks/curvas015.ts` y `checks/motor015.ts`, nuevos, y `pesoStats.ts`).
- Datos: `core-real.json`.
- Docs: `enfrentamientos.md` y `virtudes-y-defectos.md`.

No queda nada sin aclarar: las ocho decisiones se cerraron el 2026-11-14. Los criterios que la spec deja a la
calibración (distancia del líder, radio de marcaje, tamaño de los efectos de libre y marcado) tienen valor de partida
en [research.md](research.md) y se fijan con el informe.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo se cumple | Estado |
|-----------|----------------|--------|
| I. La estrategia es determinante | Cada duelo enfrenta las dos stats implicadas con curvas acotadas. Desmarque, marcaje, técnica y liderazgo pasan a contar. El regateador lo intenta más. | ✅ |
| II. Draft | Sin cambios en las reglas. Las seis cartas cambian una virtud por otra; el número de virtudes no cambia. | ✅ |
| III. Reglas de dominio explícitas | Quite, marcaje, técnica y liderazgo están en la tabla de traducción (`atributos.ts`), con sus constantes en los parámetros versionados. Desmarque y control son funciones puras con test. | ✅ |
| IV. Simulación coherente | Versión 8.0.0 con informe completo. Presionador, Mal defensor y Cabeceador mantienen su prueba de unidad y su comprobación estadística. Los partidos 7.0.0 se reproducen igual (R1). | ✅ |
| V. Un único motor | Todo ocurre en `@fbd/engine`, sin ramas por versión: se activa por la presencia de un bloque de parámetros, como ya hacía `conRasgos005`. | ✅ |
| VI. Integridad multijugador | El motor corre en el servidor; las cartas en curso siguen su versión del catálogo (R6). | ✅ |
| VII. Colecciones y monetización | Sin cambios. | ✅ |
| VIII. Modularidad | Duelos en `acciones/`, atributos y liderazgo en `modificadores/`, rasgos en `domain/catalogo`. | ✅ |
| IX. Calidad con pruebas | Hay tests por historia. SC-001 a SC-008 están en el informe de `pnpm balance`, SC-009 en `umbralMotor` y SC-010 en las huellas. Se actualizan la documentación y los tests. | ✅ |
| X. Incremental y trazable | Tres tandas, cada una cerrada con su serie, y cada decisión de research cita su FR. | ✅ |
| XI. Sin desplazarse | Sin pantallas nuevas. | ✅ |
| Flujo git | El agente no hace commit ni push. | ✅ |

**Re-check tras el diseño (Fase 1)**: todo en verde. R1 se aparta a propósito de la decisión R14 de la spec 014
(versión mayor nueva y retirada de la anterior) porque FR-022 de esta spec exige reproducir la 7.0.0. No es una
violación: se cumple con parámetros, no con un segundo motor.

## Project Structure

### Documentation (this feature)

```text
specs/015-peso-individual-estadisticas/
├── plan.md              # Este fichero
├── research.md          # Fase 0: R1–R11
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/
│   ├── motor.md         # Parámetros 8.0.0, atributos, duelos nuevos, métricas e invariantes
│   ├── catalogo.md      # Cabeceador de campo, seis cartas, versión 3 del catálogo
│   └── balance.md       # Comprobaciones del informe y lista de pendientes del CI
├── checklists/
└── tasks.md             # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/domain/src/
├── parametros/index.ts               # PARAMETROS_V8 (8.0.0); bloques opcionales duelos, quite, desmarque, controlPresion, liderazgo, aereo
├── catalogo/tipos.ts                 # VIRTUDES_CAMPO (Cabeceador) fuera de VIRTUDES_DEL; virtudesPermitidas
├── catalogo/rasgos.ts                # ámbito 'campo'; textos de Presionador, Mal defensor y Cabeceador
├── catalogo/documentoRasgos.ts       # etiqueta del ámbito 'campo'
└── catalogo/versionCatalogo.ts       # VERSION_CATALOGO_ACTUAL = 3; cartaEnVersion devuelve las virtudes de antes
packages/engine/src/
├── modificadores/atributos.ts        # TRADUCCION con carta y parámetros: quite (FR-004/005), marcaje, tecnica, liderazgo
├── modificadores/liderazgo.ts        # NUEVO: liderDeLinea, bonusPortero (puros)
├── acciones/duelo.ts                 # sin cambios de fórmula; recibe base y pendiente por acción
├── acciones/juego.ts                 # base y pendiente por acción; desmarque antes del pase; control con presión
├── acciones/desmarque.ts             # NUEVO: marcadorDe, probabilidadDesmarque, duelo de control (puros)
├── acciones/opciones.ts              # factor de regate también con espacio (FR-007)
├── acciones/receptor.ts              # peso del receptor según su duelo de desmarque (FR-013)
├── acciones/tiro.ts                  # Cabeceador ±15 en los duelos aéreos de las dos áreas
├── acciones/contexto.ts              # ajuste del portero líder en los duelos defensivos
├── espacio/objetivos.ts              # desfase de la línea defensiva según el liderazgo cercano
└── tipos.ts                          # métricas nuevas por jugador
packages/engine/tests/
├── curvas015.test.ts                 # NUEVO: los nueve duelos de FR-002
├── quite015.test.ts                  # NUEVO: FR-004/005 (63,75 · 67,5 · 60 · tackling ×1,05)
├── desmarque.test.ts, liderazgo.test.ts, cabeceador015.test.ts   # NUEVOS
└── fixtures/huella-015.json + generarHuella015.ts                # NUEVOS (SC-010)
data/core-real.json                   # 60, 76, 77, 86, 87 y 275 con Cabeceador
tools/balance/src/checks/
├── curvas015.ts                      # NUEVO: SC-001 (sin series)
├── motor015.ts                       # NUEVO: SC-002 a SC-006
└── pesoStats.ts                      # sin pase, remate ni físico (sustituidos por las curvas)
.github/workflows/ci.yml              # sin --pendientes
docs/juego/enfrentamientos.md         # a mano: 8.0.0
docs/juego/virtudes-y-defectos.md     # generado
```

**Structure Decision**: el monorepo de siempre, sin paquetes nuevos. Las dos reglas nuevas del motor (desmarque y
control con presión, y liderazgo) van en ficheros propios para probarlas sin montar un partido, como `manoAMano.ts` y
`fueraDeJuego.ts` en la 014.

### Orden de entrega

1. **Tanda 1**:
   - Parámetros 8.0.0 con `duelos`, `quite` y `aereo`.
   - US1 (curvas y quite), US2 (frecuencia del regate) y US3 (Cabeceador y las seis cartas).
   - Se cierra con una serie completa: SC-001, SC-002, SC-003 y las pendientes que dependan de ellas. 002/SC-007a puede
     quedar por debajo de 150 (FR-020).
1b. **Añadidos de la tanda 1** (clarificaciones del 2026-11-14):
   - Bloques `estrella`, `bandas`, `subidaArea` y `segundaLinea`: US7 a US10 (FR-025 a FR-030).
   - Se cierran con la serie de cierre de la tanda 1: SC-002b, SC-003, SC-011 y SC-012.
2. **Tanda 2**:
   - `desmarque` y `controlPresion`: US4 y US5.
   - Se cierra con una serie completa: SC-004, SC-005 y 002/SC-007a ≥ 150.
3. **Tanda 3**:
   - `liderazgo`: US6.
   - Se cierra con la serie final: SC-006, SC-007 (sin pendientes) y SC-008.
   - Se fija `huella-015.json`.
   - Se regeneran las referencias y se actualizan los documentos.

## Complexity Tracking

Sin violaciones de la constitución que justificar.
