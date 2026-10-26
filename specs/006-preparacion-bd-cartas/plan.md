# Implementation Plan: Preparación de la base de datos de las cartas, colecciones, fragmentos y tienda

**Branch**: `006-preparacion-bd-cartas` | **Date**: 2026-10-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-preparacion-bd-cartas/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

La spec 006 se construye sobre el código de la spec 005, sin cambiar la pila. Tiene cinco frentes:

1. **Catálogo en colecciones (FR-001 a FR-008, FR-049)**.
   - La carta pierde `coleccion`. La pertenencia pasa a una relación N:M: el fichero `data/colecciones.json` y la tabla
     `colecciones_cartas` (R1).
   - La versión premium futura es una columna `version` de la pertenencia y de la carta poseída, sin tabla nueva todavía
     (R2).
   - Las 300 cartas de Core se migran con un script determinista (R4).
   - Se generan dos colecciones de prueba ficticias, *All Stars* y *Top Argentinos* (R5).
2. **Colección propia y colección activa (FR-009 a FR-016)**.
   - La tabla `cartas_usuario` se rellena con Core de forma perezosa e idempotente (R8).
   - El mínimo por demarcación × nivel es una función pura del dominio, y el servidor la aplica con bloqueo de filas
     (R11).
   - Al crear una partida se guarda una foto de las cartas activas del anfitrión en `partidas.pool_cartas`;
     `generarMesa` no cambia (R12).
3. **Fragmentos y tienda (FR-017 a FR-033)**.
   - Un `ServicioEconomia` resuelve en el servidor, cada operación en una transacción:
     - las compras, idempotentes por el `idCompra` del cliente;
     - el cargo condicional del saldo, con `check (saldo >= 0)`;
     - la desfragmentación;
     - la recompensa de torneo, idempotente con un índice único (R9, R10, R13, R14).
   - El sobre de la tienda reutiliza los cupos del draft, con la regla de sustitución de Edge Cases.
   - Los pagos en euros son simulados.
4. **Presentación de las cartas (FR-043 a FR-048)**.
   - Tabla única de selecciones, con `ENG`, `SCO`, `WAL` y `NIR` (R6).
   - Banderas SVG copiadas de `flag-icons` (MIT). Escudos en una carpeta con un interruptor central.
   - `imagen` e `imagen_bg`: siluetas SVG pintadas como máscara CSS, para conservar el color del nivel (R7).
   - `nombre_carta` destacado.
5. **Secciones «Colección» y «Tienda» (FR-025 a FR-042)**.
   - La colección entera se pide en una sola llamada, y la búsqueda, el orden, los filtros y la paginación se hacen en
     el cliente (R15).
   - Las aperturas reutilizan `AperturaSobre` (R16).
   - La constitución registra la decisión resuelta (R18).

## Technical Context

**Language/Version**: TypeScript 5.x; Node.js 22 LTS; navegadores modernos. Sin cambios.

**Primary Dependencies**: las mismas de las specs anteriores (Fastify, `ws`, Drizzle, React 19, React Router 7, Zustand,
Zod, better-auth, Ajv). **Ninguna nueva**:

- las banderas son SVG copiados de `flag-icons`, no la dependencia;
- las animaciones usan CSS y la Web Animations API.

**Package Manager**: pnpm 9, sin excepciones (CLAUDE.md).

**Storage**: PostgreSQL 16. Una sola migración, `0011_colecciones`:

- `jugadores`: quita `coleccion` y añade `nombre_carta`, `imagen` e `imagen_bg`; reasigna `GBR`;
- `partidas`: añade `pool_cartas integer[]`;
- tablas nuevas: `colecciones`, `colecciones_cartas`, `cartas_usuario`, `colecciones_usuario`, `saldos_fragmentos`,
  `movimientos_fragmentos` y `compras`.

Detalle en [data-model.md](./data-model.md).

**Testing**:

- Vitest:
  - dominio: validación del catálogo, mínimo con fast-check, sobre de la tienda y parámetros de economía;
  - integración del servidor: tienda, colección, recompensa y migración 0011.
- Playwright: `coleccion.spec.ts` y `tienda.spec.ts`.
- `tools/balance`: comprobación nueva `colecciones` para SC-003 y SC-005.

**Target Platform**: servidor Node en Linux (`docs/despliegue.md`) y navegadores modernos de escritorio y móvil.

**Project Type**: monorepo web con `apps/server`, `apps/web`, `packages/{domain,engine,ai,protocol}` y
`tools/{balance,fixtures}`.

**Performance Goals**:

- Cambiar el tamaño, la página, la búsqueda o el orden de una colección de 500 cartas tarda menos de 1 s (SC-002). Se
  hace en memoria en el cliente, en menos de 50 ms.
- `GET /api/coleccion` tarda menos de 200 ms con 500 cartas.
- Una compra tarda menos de 300 ms en el servidor (una transacción).

**Constraints**:

- **Integridad**: todas las operaciones económicas son atómicas, idempotentes y resueltas en el servidor (Principio VI,
  FR-032). El saldo nunca es negativo.
- **Draft**: los cupos y las reglas del draft no cambian con la colección activa (Principio VII, FR-016).
- **Determinismo**: el sobre de la tienda se genera con una semilla derivada de `idCompra`, y el reparto de cartas de Core
  y de las colecciones de prueba usa semillas fijas.
- **Convenciones**: sin tildes en el código (CLAUDE.md).
- **Escudos**: su licencia está pendiente; son un riesgo abierto que bloquea el paso a producción.

**Scale/Scope**:

- 375 cartas: 300 de Core y 75 de prueba.
- 3 colecciones.
- Unas 25 selecciones.
- 2 pantallas nuevas.
- 7 tablas nuevas.
- Unos 8 endpoints nuevos.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo se cumple | Estado |
|---|---|---|
| I. La estrategia debe ser determinante | Las colecciones solo amplían el pool de cartas; no cambian ninguna regla de partido. Las versiones no tienen efecto en el juego (FR-004). | ✔ |
| II. El draft es el núcleo | 3 sobres de 8 cartas, los mismos cupos y la misma circulación. `generarMesa` no cambia; solo cambia el pool (R12). | ✔ |
| III. Reglas del dominio explícitas | El mínimo, el sobre de la tienda, los parámetros de economía, las selecciones y la validación del catálogo son funciones y tablas del dominio (`coleccion/`, `economia/`, `sobres/tienda.ts` y `catalogo/selecciones.ts`). | ✔ |
| IV. Simulación coherente | El motor no cambia. | ✔ |
| V. Un único motor | Sin cambios. | ✔ |
| VI. Integridad multijugador | Compras, desfragmentación, recompensas y la foto del pool se validan y resuelven en el servidor, de forma transaccional e idempotente (R10). El cliente solo informa. | ✔ |
| VII. Colecciones y monetización | Todos los participantes de un torneo usan el mismo pool, el del anfitrión, con las mismas reglas. Una colección más amplia solo aumenta la variedad. El mínimo garantiza que los sobres siempre se generan. Nada de lo que se compra da ventajas fuera del draft. | ✔ |
| VIII. Modularidad | Dominio puro en `packages/domain`; servicio económico propio en `apps/server/src/economia/`; HTTP en `http/coleccion.ts` y `http/tienda.ts`; pantallas propias en `apps/web`. | ✔ |
| IX. Calidad demostrada con pruebas | SC-003 y SC-005 en el informe de `balance`; SC-004 con propiedades; SC-006 y SC-007 en integración; la interfaz con e2e y la quickstart. | ✔ |
| X. Desarrollo incremental y trazable | Historias entregables por separado (ver «Orden de entrega»), con trazas de FR a R y a las pruebas. | ✔ |
| Flujo de trabajo: sin `git commit` ni `git push` por agentes | Se respeta. | ✔ |

**Re-check tras la Fase 1**: sin violaciones. FR-008 exige registrar la decisión en la constitución. Es una modificación
PATCH que mueve «Colecciones adicionales» a «Decisiones resueltas» (R18) y no cambia ningún principio. No hace falta
tabla de complejidad.

## Project Structure

### Documentation (this feature)

```text
specs/006-preparacion-bd-cartas/
├── plan.md              # Este fichero
├── research.md          # Fase 0: decisiones R1–R18
├── data-model.md        # Fase 1: ficheros, dominio, migración 0011 y operaciones
├── quickstart.md        # Fase 1: guía de validación
├── contracts/
│   ├── datos-cartas.md  # Formato de cartas y colecciones, comando seed
│   ├── http-api.md      # Endpoints de colección, tienda y fragmentos; cambios en partidas y catálogo
│   └── ui.md            # Carta, navegación, Colección, Tienda y pantalla de campeón
├── checklists/
└── tasks.md             # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
data/
├── core.json                 # migrado: sin coleccion; nombre_carta, imagen, imagen_bg; GBR → ENG/SCO/WAL/NIR (R4)
├── cartas-prueba.json        # NUEVO: 75 cartas ficticias (R5)
└── colecciones.json          # NUEVO: core, all-stars, top-argentinos (R1, R3)

packages/domain/src/
├── catalogo/
│   ├── tipos.ts              # Jugador sin coleccion; Coleccion, VersionCarta
│   ├── selecciones.ts        # NUEVO: tabla de selecciones (R6)
│   └── validar.ts            # campos nuevos y validarCatalogo
├── coleccion/minimo.ts       # NUEVO: comprobarMinimoActivo (R11)
├── economia/parametros.ts    # NUEVO: PARAMETROS_ECONOMIA y su validación (R9)
└── sobres/tienda.ts          # NUEVO: generarSobreTienda (R13)

packages/protocol/
├── schemas/player-data.schema.json   # campos nuevos, sin coleccion
├── schemas/colecciones.schema.json   # NUEVO
└── src/                              # JugadorResumen ampliado; tipos HTTP de colección y tienda

apps/server/drizzle/0011_colecciones.sql  # NUEVO

apps/server/src/
├── persistencia/
│   ├── esquema/coleccion.ts      # NUEVO: tablas de colecciones, posesión, saldo, movimientos, compras
│   ├── repos/catalogo.ts         # pool por pertenencia; poolPartida (R12)
│   └── seed.ts                   # varios ficheros, colecciones, entrega a compradores (data-model §4.3)
├── economia/servicio.ts          # NUEVO: ServicioEconomia (R10)
├── auth/                         # requiereRegistrado
├── http/coleccion.ts             # NUEVO
├── http/tienda.ts                # NUEVO
├── http/partidas.ts              # foto pool_cartas al crear
└── actores/{draft,torneo}.ts     # poolPartida; recompensa en terminarTorneo (R14)

apps/web/
├── public/banderas/*.svg         # NUEVO (R6)
├── public/escudos/*.svg          # NUEVO (manual, R6)
├── public/cartas/{siluetas,fondos}/{por,def,med,del}.svg  # NUEVO (R7)
└── src/
    ├── textos/selecciones.ts     # rutas de bandera y escudo, ESCUDOS_ACTIVOS
    ├── componentes/CartaJugador.tsx      # bandera, escudo, imagen, fondo, nombre_carta
    ├── componentes/BarraPrincipal.tsx    # Colección y Tienda
    ├── componentes/DialogoPagoPrueba.tsx # NUEVO
    ├── pantallas/Coleccion.tsx           # NUEVO
    ├── pantallas/Tienda.tsx              # NUEVO
    ├── pantallas/{Inicio,PantallaCampeon,PruebasCartas}.tsx
    └── app/Rutas.tsx                     # /coleccion, /tienda

tools/fixtures/src/migrarCartas006.ts, generarColeccionesPrueba.ts   # NUEVOS (R4, R5)
tools/balance/src/checks/colecciones.ts                              # NUEVO (R17)
.specify/memory/constitution.md                                      # 1.1.1 (R18)
```

**Structure Decision**: se mantiene el monorepo. Lo nuevo va en módulos con una responsabilidad cada uno:

- dominio: `coleccion/`, `economia/` y `sobres/tienda.ts`;
- servidor: `economia/` y `http/{coleccion,tienda}.ts`;
- web: `pantallas/{Coleccion,Tienda}.tsx`.

El catálogo existente solo cambia en la forma de calcular el pool.

### Orden de entrega

1. **Datos y catálogo** (FR-001 a FR-007, FR-043, FR-049):
   - selecciones;
   - migración de Core;
   - colecciones de prueba;
   - esquemas y validación;
   - migración `0011`;
   - seed;
   - pool por pertenencia.

   Las partidas existentes siguen funcionando con Core.
2. **US6, presentación de la carta**: imágenes genéricas, banderas, escudos y `CartaJugador`. Es independiente del resto
   una vez hecho el punto 1.
3. **US1 y US2, colección y colección activa**: `asegurarColeccion`, mínimo, endpoints, pantalla y foto del pool en las
   partidas.
4. **US3, fragmentos**: `ServicioEconomia`, recompensa, desfragmentación e historial.
5. **US4, US5 y US7, tienda**: sobre de la tienda, compras idempotentes, pago simulado y animaciones.
6. **Balance, e2e, constitución** (FR-008) y actualización de `CLAUDE.md` y de la documentación.

## Complexity Tracking

Sin violaciones de la constitución que justificar.
