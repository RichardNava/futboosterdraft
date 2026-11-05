# Implementation Plan: Rework de la tienda — derechos de imagen, escudos y sobres cosméticos

**Branch**: `main` (sin rama propia, como las specs 008 a 010) | **Date**: 2026-11-05 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/011-rework-tienda/spec.md`

## Summary

El juego sigue con jugadores reales, pero el dinero real pasa a comprar solo cosméticos propios. El plan tiene cinco
partes:

1. **Economía (FR-002)**: se retiran los paquetes de fragmentos, y los sobres de cartas y las colecciones pasan a
   pagarse solo con fragmentos ([research R11](research.md)).
2. **Catálogo de cosméticos**: `data/cosmeticos.json` con 38 escudos, 31 sobres y 10 packs fijos. Se carga en BD con
   `pnpm seed`, y las imágenes se adaptan con un guion basado en sharp (R2–R4).
3. **Escudos**: `participantes.escudo` y `perfiles_usuario.escudo`, con un escudo asignado estable si no se elige (los
   invitados, círculo). Llegan al cliente en `partido.inicio`, y el componente `Chapa`, que concentra todos los
   círculos, pinta el escudo (R6, R7).
4. **Sobres**: favorito o carrusel con baraja por cuenta, y una rasgadura generada para cada diseño. `SobreArte`, que
   concentra todos los sobres, recibe el diseño (R8, R9).
5. **Plan B de identidad**: tabla `ajustes`, que se cambia con un guion sin reiniciar. `partidas.identidad` se fija al
   crear la partida, y `Catalogo.conIdentidad()` sigue el patrón de `enVersion()`. Los retratos de Transfermarkt se
   sustituyen por los manga que entrega el responsable (R5, R12, R13).

La compra de cosméticos reutiliza `ServicioEconomia.comprar()`, que es idempotente por `idCompra` y está probado en la
006 (R10).

## Technical Context

**Language/Version**: TypeScript 5 sobre Node ≥ 22, ESM.

**Primary Dependencies**: Fastify 5, Drizzle + `pg`, zod, React 19 + Vite. Dependencia nueva: **sharp**, solo como
`devDependency` de `@fbd/fixtures` para el guion de imágenes (R4).

**Storage**: PostgreSQL, migración `0014_cosmeticos.sql`:

- tablas nuevas `cosmeticos`, `packs_cosmeticos`, `cosmeticos_usuario` y `ajustes`;
- columnas nuevas en `perfiles_usuario`, `participantes`, `partidas`, `jugadores` y `colecciones`;
- *checks* ampliados en `compras` y `movimientos_fragmentos`.

Imágenes estáticas en `apps/web/public/cosmeticos/` y `apps/web/public/cartas/retratos-propios/`.

**Testing**: Vitest (dominio, web e integración del servidor en los dos modos de hilos), `test:equivalence` y
Playwright (`pnpm e2e`).

**Target Platform**: navegador (escritorio y móvil desde 360 px) y servidor Linux en contenedor.

**Project Type**: monorepo web (`apps/server`, `apps/web`, `packages/{domain,protocol}`, `tools/fixtures`).

**Performance Goals**:

- cosméticos publicados ≤ 10 % de ~116 MB (SC-005; estimado ~3,5 MB);
- escudo del marcador ≤ 5 kB;
- `sobre-siguiente` y las compras, con un solo viaje a la BD en transacción;
- sin consultas nuevas en la apertura de partidos: el escudo se lee de la fila del participante que ya está en memoria.

**Constraints**:

- con la misma semilla, el mismo resultado en los dos modos de identidad (FR-019);
- ningún producto de cartas se vende con euros (FR-002);
- un solo cargo por compra (SC-006);
- cambio de identidad sin reiniciar el servidor, solo para las partidas nuevas (FR-018);
- Principio XI en la tienda y los selectores.

**Scale/Scope**: 69 cosméticos y 10 packs, 300 retratos y unos 25 ficheros de código tocados (ver la estructura).

Sin NEEDS CLARIFICATION. Las tres dudas que quedaban (precios, dónde se guarda el carrusel y el escudo de un invitado
que no elige) las resolvió la persona al pedir el plan, y están en la spec (Clarifications 2026-11-05, Assumptions y
FR-005).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo se cumple | Estado |
|-----------|----------------|--------|
| I. La estrategia es determinante | Los cosméticos y la identidad no tocan stats, rasgos, sobres ni semillas. | ✅ |
| II. Draft | Mismas reglas y mismo contenido. El diseño del sobre es solo presentación (FR-013), y el protocolo del draft no cambia (R9). | ✅ |
| III. Reglas de dominio explícitas | El carrusel, la asignación de escudos, el empate de escudos y la vista de identidad son funciones puras en `packages/domain` con tests propios. | ✅ |
| IV. Simulación coherente | `test:equivalence` sin cambios, más un test de integración con la misma semilla en los dos modos de identidad (US4-3). | ✅ |
| V. Un único motor | `packages/engine` y `packages/ai` no se tocan. | ✅ |
| VI. Integridad multijugador | Compras y disponibilidad validadas en el servidor (FR-009, FR-015). La compra es idempotente con bloqueo por usuario. El escudo se fija al empezar el torneo. | ✅ |
| VII. Colecciones y monetización | Lo que se paga es cosmético (FR-016), sin sobres al azar de cosméticos y con packs fijos de venta directa. El Principio VII se amplía con la regla de derechos (R15), así que la constitución sube a 1.4.0. | ✅ con enmienda |
| VIII. Modularidad | Módulo de dominio nuevo `cosmeticos/`; en el servidor, las compras en `ServicioEconomia`, el aspecto en el perfil y los ajustes en un servicio propio. | ✅ |
| IX. Calidad con pruebas | Tests de dominio, de integración (compras dobles, packs, disponibilidad, identidad), de componentes y e2e. Cada SC se comprueba en la app ([quickstart.md](quickstart.md)). | ✅ |
| X. Incremental y trazable | Las US se entregan por separado (orden abajo). Cada fase cita su FR. | ✅ |
| XI. Sin desplazarse | En escritorio la tienda va en columnas. Los selectores tienen desplazamiento interno y lo elegido queda arriba ([contracts/ui.md](contracts/ui.md)). | ✅ |
| Flujo git | El agente no hace commit ni push. | ✅ |

La enmienda del Principio VII no es una violación: es el registro que pide FR-001. **Re-check tras el diseño
(Fase 1)**: sin cambios.

## Project Structure

### Documentation (this feature)

```text
specs/011-rework-tienda/
├── plan.md              # Este fichero
├── research.md          # Fase 0: R1–R15
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/
│   ├── http-api.md      # Fase 1: cosméticos, aspecto, escudo por partida, cambios de la tienda, partido.inicio
│   └── ui.md            # Fase 1: Chapa, SobreArte, selectores, tienda
├── derechos-imagen.md   # Investigación (spec)
├── monetizacion.md      # Referencia (spec)
├── checklists/
└── tasks.md             # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
data/
├── cosmeticos.json                     # NUEVO (R2)
├── colecciones.json                    # + precio_fragmentos
└── core-real.json                      # imagen → retratos-propios; identidad_alternativa opcional
packages/domain/src/
├── cosmeticos/                         # NUEVO: tipos.ts, escudos.ts (escudoAsignado, escudosEnPartido), carrusel.ts
├── catalogo/identidad.ts               # NUEVO: conIdentidad, nombre genérico
└── economia/parametros.ts              # paquetesFragmentos = [], VENTA_CARTAS_CON_DINERO
packages/protocol/src/
├── http/cosmeticos.ts                  # NUEVO: catálogo, compras, aspecto
├── http/tienda.ts                      # precioFragmentos en colecciones; moneda del sobre
└── ws/partido.ts                       # escudos en partido.inicio
apps/server/
├── drizzle/0014_cosmeticos.sql         # NUEVO
├── src/persistencia/esquema/{cosmeticos.ts (NUEVO), base.ts, coleccion.ts}
├── src/persistencia/seed.ts            # cosméticos, packs, identidad alternativa, precio_fragmentos
├── src/persistencia/repos/{catalogo.ts (conIdentidad), perfiles.ts (aspecto)}
├── src/ajustes/servicio.ts             # NUEVO: lectura con caché de 30 s
├── src/ajustes/cli.ts                  # NUEVO: `pnpm --filter @fbd/server ajuste`
├── src/economia/servicio.ts            # comprarCosmetico, comprarPack, colección en fragmentos, retirar paquetes
├── src/http/{cosmeticos.ts (NUEVO), tienda.ts, perfil.ts, partidas.ts, catalogo.ts, coleccion.ts}
├── src/actores/{identidad.ts, draft.ts, partida.ts, partidoRapido.ts, partidoEntreHumanos.ts}  # escudo e identidad
└── tests/integration/{cosmeticos.test.ts, aspecto.test.ts, escudo-partida.test.ts, identidad-cartas.test.ts} + tienda.test.ts
apps/web/
├── public/cosmeticos/{escudos,sobres}/ # NUEVO (generado)
├── public/cartas/retratos-propios/     # NUEVO (generado); public/cartas/retratos/ se borra al cerrar
├── src/estado/aspecto.ts               # NUEVO
├── src/componentes/{Marcador.tsx (Chapa), ResumenEventos.tsx, arte/SobreArte.tsx, arte/rasgadura.ts (NUEVO),
│                    AperturaSobre.tsx, SelectorEscudo.tsx (NUEVO), SelectorSobre.tsx (NUEVO)}
├── src/pantallas/{Tienda.tsx, Perfil.tsx, Alineacion.tsx, Draft.tsx, Partido2D.tsx, PartidoRapido.tsx,
│                  ReproduccionPartido.tsx}
└── tests/{e2e/cosmeticos.spec.ts, unit/{rasgadura,chapa}.test.ts}   # NUEVOS
tools/fixtures/
├── src/cosmeticos.ts                   # NUEVO: guion `imagenes` (sharp)
└── src/coreReal.ts                     # sumario de identidad y retratos por rareza
.specify/memory/constitution.md, ROADMAP.md   # 1.4.0; INI-11, INI-14 (R15)
```

**Structure Decision**: todo vive en los paquetes existentes. Lo nuevo de dominio va en
`packages/domain/src/cosmeticos/` para que sea testable sin servidor. El motor y la IA no se tocan.

## Orden de implementación sugerido

0. **Antes de empezar**: los retratos manga entregados están en una carpeta de la raíz (Assumptions).
1. **Decisión registrada (FR-001, SC-009)**: constitución 1.4.0 y ROADMAP. Es una **puerta**: no se implementa ninguna
   venta antes de este paso.
2. **Base**: migración 0014, esquema, seed y `data/cosmeticos.json`; guion de imágenes y generación de los recursos
   (escudos, sobres y retratos propios); validación de Core con el sumario de retratos.
3. **FR-002 (economía)**: retirar los paquetes de fragmentos, poner el sobre de cartas y las colecciones en fragmentos y
   adaptar `tienda.test.ts` y la pantalla de la tienda.
4. **US1 (P1), escudos**: dominio (`escudoAsignado`, `escudosEnPartido`); `participantes.escudo` y la identidad al
   unirse; `PUT /api/partidas/:id/escudo`; aspecto del perfil (solo el escudo); `escudos` en `partido.inicio`; `Chapa`
   y sus usos; `SelectorEscudo` en Perfil y Alineación.
5. **US2 (P1), sobres**: dominio (`carrusel.ts`); aspecto del perfil (sobres) y `sobre-siguiente`; `rasgaduraDe`;
   `SobreArte` y `AperturaSobre` con diseño; `SelectorSobre`.
6. **US3 (P2), venta**: `GET /api/cosmeticos`; `comprarCosmetico` y `comprarPack`; bloques de la tienda; e2e.
7. **US4 (P2), identidad**: tabla `ajustes` y guion; `partidas.identidad`; `Catalogo.conIdentidad` y su uso en
   partidas, en la economía y en el catálogo; test con la misma semilla; recorrido de pantallas en «alternativa».
8. **Cierre**: borrar los orígenes (`escudos/`, `sobres/`, la carpeta de retratos de origen y
   `public/cartas/retratos/`); suite completa en los dos modos y e2e; recorridos del [quickstart](quickstart.md).

US1 y US2 son independientes entre sí y se pueden hacer en paralelo tras el paso 2. US3 necesita las dos para mostrar
«Comprado» en los selectores.

## Riesgos

- **Economía de fragmentos (R11)**: sin venta de fragmentos, el único ingreso relevante es ganar torneos (10
  fragmentos). Un cosmético de 250 fragmentos cuesta unos 25 torneos ganados. Se anota en el ROADMAP para una spec de
  economía; este plan no cambia `recompensaTorneo`.
- **Escudo a tamaño de chapa**: el círculo actual es pequeño, y algunos escudos detallados pueden no reconocerse a
  360 px. Se comprueba en el recorrido 13 del quickstart. Si falla, se sube el tamaño de la chapa del marcador, no el
  de las demás.
- **Retratos manga**: son una dependencia externa. Sin ellos, el paso 2 se queda a medias, pero el resto del plan
  sigue (los retratos actuales siguen funcionando hasta el cierre).

## Complexity Tracking

Sin violaciones de la constitución que justificar. La dependencia nueva (sharp) es solo de herramientas (R4).
