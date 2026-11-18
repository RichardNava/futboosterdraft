# Implementation Plan: Expansiones reales

**Branch**: `016-expansiones-reales` | **Date**: 2026-11-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/016-expansiones-reales/spec.md`

## Summary

Las cuatro primeras expansiones de pago con jugadores reales reutilizan las **colecciones de pago** que ya existen
(006, 011). Ya están hechas la compra con fragmentos, la idempotencia, la compensación por cartas repetidas y el pool
del sobre de la tienda. «Expansión» es solo el nombre visible (research R1). El plan tiene seis partes:

1. **Datos**: `data/expansiones-reales.json` con 95 fichas reales (criterios de la 008). Los ids son
   300 + 24 × (expansión − 1) + número, así que Kimmich queda en el 376 y Verratti conserva el 299 (R2, R3). Kimmich
   entra en `core-real.json` y Verratti sale. Las cuatro expansiones van en `colecciones.json` con número, precio de
   2400 fragmentos y sobre de regalo.
2. **Imágenes**: un guion nuevo, `expansiones`, con sharp. Separa los retratos de las páginas por rejilla, quita el
   verde croma por inundación desde el borde (así no se pierden las camisetas verdes) y escala al tamaño del Core.
   También adapta los fondos, los iconos, los carteles y el icono del fragmento, valida y escribe el sumario (R5, R7–R10).
3. **Retirada de las cartas de prueba**: se hace dentro del seed, antes de cargar ninguna carta, y es repetible porque
   identifica las cartas por su colección y no por su id (R11).
4. **Economía**: desfragmentar pasa a 25 / 75 / 125 / 175; el sobre de la tienda rinde 510 de media frente a 1000. La
   compra de una expansión regala su sobre en la misma transacción (R12, R13).
5. **Cosméticos**: campo `vendible`; sobres 25–33 con el guion `imagenes`, que ya existe; packs 2, 3 y 7 (R14).
6. **Interfaz**: la sección «Expansiones» con tarjeta y modal de detalle, todo en el mismo `GET /api/tienda`, y un
   componente `Fragmentos` con el icono nuevo en toda la interfaz (R10, R15).

## Technical Context

**Language/Version**: TypeScript 5 sobre Node ≥ 22, ESM.

**Primary Dependencies**: Fastify 5, Drizzle + `pg`, zod, React 19 + Vite y sharp (ya es `devDependency` de
`@fbd/fixtures`). Sin dependencias nuevas.

**Storage**: PostgreSQL, migración `0017_spec016.sql` (`colecciones.sobre_regalo`, `colecciones_cartas.numero`,
`cosmeticos.vendible` y retirada del *check* `colecciones_precio_ck`). Imágenes estáticas en `apps/web/public/`
(`cartas/retratos-propios/`, `cartas/fondos/jugadores/`, `expansiones/<id>/`, `iconos/`).

**Testing**: Vitest (dominio, web e integración del servidor), `test:equivalence`, `pnpm balance` y Playwright
(`pnpm e2e`).

**Target Platform**: navegador (escritorio y móvil desde 360 px) y servidor Linux en contenedor.

**Project Type**: monorepo web (`apps/server`, `apps/web`, `packages/{domain,protocol}`, `tools/{fixtures,balance}`).

**Performance Goals**:

- retrato + fondo por carta de expansión ≤ 1,10 × el del Core (SC-009; Core ≈ 14 KB + 60 KB);
- `GET /api/tienda` con las 96 cartas en ≤ 25 KB más de lo que pesa ahora;
- la compra de una expansión, en una sola transacción.

**Constraints**:

- el dinero real no compra cartas, expansiones ni fragmentos (Principio VII): las expansiones solo tienen precio en
  fragmentos;
- un solo cargo por compra;
- la retirada se aplica con el servidor parado y es repetible;
- `test:equivalence` y el motor no cambian;
- Principio XI en la tienda y el modal.

**Scale/Scope**: 95 fichas nuevas y 1 cambio en el Core; 96 retratos, 96 fondos, 8 imágenes de expansión, 9 sobres
y 1 icono; unos 30 ficheros de código y 11 de pruebas tocados (ver la estructura).

Sin NEEDS CLARIFICATION: las seis dudas están resueltas en la spec (Clarifications 2026-11-18). Queda una
**dependencia de material**: `esquema-tienda.png`, que la spec enlaza pero no está en la carpeta (ver «Riesgos»).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo se cumple | Estado |
|-----------|----------------|--------|
| I. La estrategia es determinante | Las cartas nuevas siguen las bandas y los criterios de la 008. El motor no cambia, y `pnpm balance` se repasa tras el cambio Kimmich ↔ Verratti (R4). | ✅ |
| II. Draft | Mismas reglas y mismos cupos. Las cartas de expansión entran en el pool por la colección activa del anfitrión, como ya hacen las de pago (006). | ✅ |
| III. Reglas de dominio explícitas | El valor de desfragmentar, la validación de `numero` y la de las colecciones están en `packages/domain`, con pruebas. El número de cartas, el reparto, el precio y el regalo son datos, no reglas (FR-032). | ✅ |
| IV. Simulación coherente | Sin cambios en el motor; `test:equivalence` igual. | ✅ |
| V. Un único motor | `packages/engine` y `packages/ai` no se tocan. | ✅ |
| VI. Integridad multijugador | La compra se valida en el servidor, es idempotente por `idCompra` y bloquea al usuario (lo que ya había). El sobre se regala en la misma transacción. La retirada no deja ninguna partida reproduciéndose con cartas distintas (R11). | ✅ |
| VII. Colecciones y monetización | Las expansiones solo se pagan con fragmentos (`precio_centimos` desaparece). Los sobres nuevos y el pack 7 son cosméticos propios. Comprar una expansión no da ninguna ventaja en el draft. El regalo con el pase queda **fuera de alcance**, precisamente por este principio. | ✅ |
| VIII. Modularidad | Los datos en `data/`, las reglas en el dominio, la compra en `ServicioEconomia`, la retirada en el seed, las imágenes en `@fbd/fixtures` y la vista en `Tienda`. | ✅ |
| IX. Calidad con pruebas | Pruebas de dominio, seed (dos pasadas de la retirada), integración (SC-004 con 0, 6 y 24 poseídas), componentes y e2e. El sumario es legible y cada SC se comprueba en la app ([quickstart.md](quickstart.md)). | ✅ |
| X. Incremental y trazable | Las US se entregan por separado (orden abajo) y cada paso cita su FR. | ✅ |
| XI. Sin desplazarse | En escritorio, las tarjetas van en columnas; el modal tiene la lista con desplazamiento interno y el pie de compra siempre visible ([contracts/ui.md](contracts/ui.md)). | ✅ |
| Flujo git | El agente no hace commit ni push. | ✅ |

**Re-check tras el diseño (Fase 1)**: sin cambios. La retirada del *check* de precio en euros refuerza el Principio
VII, no lo relaja.

## Project Structure

### Documentation (this feature)

```text
specs/016-expansiones-reales/
├── plan.md                  # Este fichero
├── research.md              # Fase 0: R1–R16
├── data-model.md            # Fase 1
├── quickstart.md            # Fase 1
├── contracts/
│   ├── http-api.md          # Fase 1: tienda, compra, cosméticos, desfragmentar
│   ├── ui.md                # Fase 1: Fragmentos, tarjeta, modal, confirmación, textos
│   └── datos-expansiones.md # Fase 1: fichas y guion `expansiones`
├── esquema-tienda.png       # PENDIENTE: lo aporta la persona (FR-017)
├── sumario.md               # Generado por el guion (implementación)
├── revision-retratos.webp   # Generado por el guion (implementación)
├── fuentes/                 # Copia de las listas y rarezas de ./expansiones (cierre)
├── checklists/
└── tasks.md                 # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
data/
├── expansiones-reales.json                # NUEVO: 95 fichas (R3)
├── core-real.json                         # − Verratti (299), + Kimmich (376)
├── colecciones.json                       # − all-stars, top-argentinos; + 4 expansiones (numero, sobre_regalo)
├── cosmeticos.json                        # vendible; sobres 25–33; packs 2, 3 y 7
└── cartas-prueba.json                     # SE BORRA
packages/domain/src/
├── economia/parametros.ts                 # desfragmentar 25/75/125/175
└── catalogo/{tipos.ts, validar.ts}        # numero, sobreRegalo, precio_centimos opcional
packages/protocol/
├── src/http/tienda.ts                     # CartaExpansion, ProductoColeccion, ResumenCompra.cosmeticos
├── src/http/cosmeticos.ts                 # vendible, regaloDe
└── schemas/player-data.schema.json        # sin referencias a cartas de prueba
apps/server/
├── drizzle/0017_spec016.sql               # NUEVO
├── src/persistencia/esquema/{coleccion.ts, cosmeticos.ts}
├── src/persistencia/seed.ts               # retirarColeccionesPrueba, ficheros por defecto, numero, sobre_regalo, vendible
├── src/economia/servicio.ts               # sobre de regalo, productoColeccion ampliado, comprarCosmetico no vendible
├── src/http/cosmeticos.ts                 # vendible / regaloDe, filtro de packs
└── tests/{integration/{tienda,coleccion,identidad-cartas,cosmeticos}.test.ts, unit/seed.test.ts}
apps/web/
├── public/{cartas/retratos-propios, cartas/fondos/jugadores, expansiones/<id>, iconos, cosmeticos/sobres}  # generado
├── src/componentes/Fragmentos.tsx         # NUEVO
├── src/componentes/{DetalleExpansion.tsx (NUEVO), TarjetaExpansion.tsx (NUEVO), ConfirmacionCompra.tsx,
│                    DialogoPagoPrueba.tsx, TiendaCosmeticos.tsx, FichaCartaColeccion.tsx, SelectorSobre.tsx}
├── src/app/Marco.tsx                      # saldo con Fragmentos
├── src/pantallas/{Tienda.tsx, Coleccion.tsx, Perfil.tsx, CrearPartida.tsx, PantallaCampeon.tsx}
└── tests/{unit/{fragmentos.test.tsx, detalleExpansion.test.tsx, cartasPortada.test.ts, filtradoColeccion.test.ts},
          e2e/tienda.spec.ts}
tools/fixtures/
├── src/expansiones.ts                     # NUEVO: guion `expansiones` (R5, R7–R10)
├── src/coreReal.ts                        # ids sin exigir 1..N; retratos de los dos ficheros
├── src/fondosCore.ts                      # exporta ID_EN_NOMBRE (planificarFondos ya lo está)
└── src/generarColeccionesPrueba.ts        # SE BORRA
tools/balance/src/checks/colecciones.ts    # lee expansiones-reales.json
docs/                                      # textos con los valores de desfragmentar
ROADMAP.md, CLAUDE.md                      # estado de la spec y nuevos comandos
```

**Structure Decision**: todo vive en los paquetes que ya existen; no hay módulos nuevos. Lo nuevo de dominio son
reglas de validación y un parámetro. El guion de imágenes se une a los de `@fbd/fixtures`. El motor y la IA no se
tocan.

## Orden de implementación sugerido

0. **Antes de empezar**: la persona guarda `esquema-tienda.png` en la carpeta de la spec. Solo bloquea el paso 6.
1. **Base**: migración 0017, esquema y tipos de dominio y protocolo; desfragmentar a 25/75/125/175 con su prueba
   (FR-018). Retirada en el seed con su prueba de dos pasadas (FR-009 a FR-012). Borrar `cartas-prueba.json` y
   adaptar las 11 pruebas (R16). Al acabar, la suite pasa sin expansiones: la tienda sale vacía.
2. **US1, guion e imágenes**: `expansiones.ts` (validación, rejilla, chroma, fondos, carteles, icono del fragmento,
   sumario y hoja de revisión). La persona revisa la hoja (SC-002) antes de seguir.
3. **US1, datos**: las fichas en cuatro lotes (A, B, C, D), validando cada uno con el guion. Después, Kimmich ↔
   Verratti en `core-real.json` y `colecciones.json`, `core-real` en verde y `pnpm balance` (R4).
4. **US2, servidor**: `productoColeccion` ampliado, sobre de regalo en la compra y pruebas de SC-004 (0, 6 y 24
   poseídas), doble envío y saldo insuficiente.
5. **US3, cosméticos**: `imagenes --sobres`, `cosmeticos.json` (vendible, sobres y packs), las validaciones del seed y
   `COSMETICO_NO_VENDIBLE`.
6. **US2, interfaz**: textos «Expansiones», `TarjetaExpansion`, `DetalleExpansion` y la confirmación con el sobre; e2e.
7. **US4, icono**: `Fragmentos` y su sustitución en toda la interfaz; prueba de accesibilidad.
8. **Cierre**: suite completa, `pnpm balance`, e2e y recorridos del [quickstart](quickstart.md); copiar las fuentes a
   `fuentes/` y borrar `./expansiones` cuando la persona lo apruebe; ROADMAP, CLAUDE.md y `graphify update .`.

US3 y US4 no dependen de US1 y se pueden hacer en paralelo tras el paso 1. US2 en la interfaz necesita US1 (datos) y
el esquema.

## Riesgos

- **`esquema-tienda.png` no está**: la spec lo da por guardado (aclaración 6), pero no está en la carpeta. El paso 6
  se hace con la descripción escrita de [contracts/ui.md](contracts/ui.md) y se ajusta cuando llegue la imagen.
- **Chroma y camisetas verdes**: la inundación desde el borde evita lo peor, pero algún pelo fino o una camiseta de un
  verde muy saturado puede dar problemas. Para eso están la hoja de revisión y los ajustes por carta (R7). Si una carta
  no sale bien de forma automática, se pide a la persona el retrato suelto.
- **Volumen de datos**: 95 fichas reales a mano es la parte más larga. Se hace en lotes validados para no acumular
  errores, y SC-003 se comprueba por muestreo en el recorrido 3.
- **Balance**: Kimmich sustituye a Verratti en el Core. Si un criterio de la 015 cambia de estado, se mide, se explica
  y se propone; los umbrales los decide la persona.
- **Economía**: con desfragmentar más generoso, un sobre de la tienda devuelve 510 de 1000. Sigue por debajo del
  precio (FR-018), pero acelera la obtención de fragmentos para quien desfragmenta. Se anota en el ROADMAP para la spec
  de economía.

## Complexity Tracking

Sin violaciones de la constitución que justificar. No hay dependencias nuevas.
