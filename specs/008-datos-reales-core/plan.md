# Implementation Plan: Datos reales de la colección Core (fase 0.1)

**Branch**: `main` (sin rama propia; la persona hace commit y push) | **Date**: 2026-10-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-datos-reales-core/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

La spec 008 sustituye las cartas ficticias 1–250 de Core por 250 futbolistas reales con retrato. No cambia el motor, el
draft, el protocolo de tiempo real ni la forma de la carta. Tiene cuatro frentes:

1. **Retratos (FR-001 a FR-004)**. Un script de un solo uso, con Python y Pillow (como en la spec 007, R1), convierte los
   250 originales de `retratos/` a WebP de 139 × 181 con transparencia. Los guarda en
   `apps/web/public/cartas/retratos/<slug>.webp`. Los originales no se tocan (R1, R2).
2. **Fichero de datos reales (FR-005 a FR-015)**. `data/core-real.json` tiene las 250 fichas, en el formato de
   `data/core.json`, y es el fichero que la persona revisa y edita. Las fichas se redactan por lotes, con las reglas de
   valoración de R4 y R5. Las dudas van a [dudas.md](./dudas.md) (R6).
3. **Integración en Core (FR-016, FR-021)**. Un comando de `tools/fixtures`, `pnpm --filter @fbd/fixtures core-real`:
   - valida `data/core-real.json`;
   - sustituye los ids 1–250 de `data/core.json`;
   - escribe el sumario.

   Se puede repetir cada vez que la persona edita las fichas (R7).

   La comprobación exacta de `DISTRIBUCION_CORE` en `validarCatalogo` deja de ser un error, porque el informe del seed
   ya avisa (R8). `SELECCIONES`, el enumerado del esquema JSON y `public/banderas/` se amplían con los países nuevos
   (R9). Los escudos siguen el interruptor global `ESCUDOS_ACTIVOS`, que hoy está apagado (R10).
4. **Sumario (FR-017 a FR-020)**. El mismo comando genera [sumario.md](./sumario.md). Incluye:
   - la tabla demarcación × nivel;
   - la cobertura de las 16 posiciones;
   - las nacionalidades;
   - el reparto de defectos;
   - los excesos con candidatos a recolocar;
   - la lista priorizada de necesidades (R11).

## Technical Context

**Language/Version**: TypeScript 5.6 (Node 22, `tsx`) para el comando de integración y el sumario. Python 3.13 con
Pillow 13 solo para el script de retratos, que no se versiona (R1).

**Primary Dependencies**: las que ya tiene el proyecto (`@fbd/domain`, `@fbd/protocol` y su esquema JSON). No se añade
ninguna dependencia.

**Storage**: ficheros.
- `data/core-real.json` (nuevo) y `data/core.json` (cartas 1–250 reales).
- `apps/web/public/cartas/retratos/` y `apps/web/public/banderas/`.

La base de datos no cambia de esquema. `pnpm seed` hace *upsert* por id (R12).

**Testing**: Vitest.
- Validación del catálogo con el `core.json` nuevo.
- `selecciones.test` (esquema = `SELECCIONES`, una bandera por código).
- `generador.test` (10 000 mesas de 8 con el `core.json` real).
- Una prueba unitaria de la función de recuento del sumario.

Hay que ajustar las pruebas que dependen de cartas ficticias concretas (R13). La revisión manual sigue
[quickstart.md](./quickstart.md).

**Target Platform**: el mismo de siempre (navegadores modernos; servidor Node).

**Project Type**: monorepo web (pnpm). Paquetes que cambian:
- datos (`data/`);
- `packages/domain` (selecciones y validación);
- `packages/protocol` (esquema);
- `tools/fixtures` (comando nuevo);
- `apps/web` (recursos estáticos y CSS del retrato).

**Performance Goals**:
- Los retratos pesan como máximo 6,5 MB en total (SC-005; se esperan unos 3 MB).
- Cada retrato pesa ≤ 25 KB.

**Constraints**:
- Sin tildes en el código ni en los nombres de archivo.
- Los textos visibles (`nombre`, `apellidos`, `nombre_carta`, `historia`, nombres de selección) sí llevan tildes.
- Sin dependencias nuevas.
- Sin commits ni push por parte del agente.
- `nombre_carta` ≤ 24 caracteres.
- Rutas de imagen que cumplan `^/cartas/[a-z0-9/_-]+\.(svg|png|webp|jpg)$`.

**Scale/Scope**:
- 250 retratos, 250 fichas y unas 30–40 selecciones nuevas (se sabrá al redactar las fichas).
- Un comando nuevo, un cambio de validación y una regla CSS para retratos de mapa de bits.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo se cumple | Estado |
|-----------|----------------|--------|
| I. Estrategia determinante | Las stats siguen en 1–99 y la media es el promedio. Las bandas de nivel no cambian. El motor no se toca. | ✅ |
| II. Draft como núcleo | Los cupos de sobre no cambian. Se comprueba que una mesa de 8 sigue generándose con el reparto real (`generador.test`, R8). | ✅ (con prueba) |
| III. Reglas del dominio explícitas | La validación sigue en `packages/domain`. El cambio de error a aviso del reparto de Core queda documentado (R8), sin reglas nuevas fuera del dominio. | ✅ |
| IV / V. Motor único y verificable | No se toca. | ✅ |
| VI. Integridad multijugador | El catálogo lo carga el servidor (seed). El cliente solo pinta. Las partidas en curso usan las cartas por id (R12, riesgo documentado). | ✅ (riesgo anotado) |
| VII. Colecciones | Core sigue siendo la colección básica con 300 cartas. Las reglas de sobres son las mismas para todos. | ✅ |
| VIII. Modularidad | Datos, dominio, herramienta y recursos web, cada uno en su paquete. | ✅ |
| IX. Calidad demostrable | Hay pruebas automáticas (validación, generador, recuento). El sumario y quickstart se pueden revisar sin leer código. | ✅ |
| X. Incremental y trazable | La spec, el plan, las tareas, `dudas.md` y `sumario.md` llevan referencias FR/SC. | ✅ |
| Flujo git | El agente no hace commit ni push. Sugiere los comandos al terminar. | ✅ |

Sin violaciones. Revisado tras la fase 1: sigue sin violaciones. El cambio de R8 relaja una comprobación de datos, no un
principio.

## Project Structure

### Documentation (this feature)

```text
specs/008-datos-reales-core/
├── plan.md              # este fichero
├── research.md          # fase 0
├── data-model.md        # fase 1
├── quickstart.md        # fase 1
├── contracts/
│   └── datos-core-real.md
├── dudas.md             # lo genera la implementación (FR-015)
├── sumario.md           # lo genera `core-real` (FR-017 a FR-020)
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
data/
├── core-real.json                 # NUEVO: las 250 fichas reales (fuente que edita la persona)
└── core.json                      # ids 1–250 sustituidos por las reales; 251–300 ficticios

apps/web/public/
├── cartas/retratos/<slug>.webp    # NUEVO: 250 retratos
└── banderas/<COD>.svg             # + una bandera por selección nueva (flag-icons, MIT)
apps/web/src/estilos/cartas.css    # regla del retrato de mapa de bits (R3)

packages/domain/src/catalogo/
├── selecciones.ts                 # + selecciones nuevas
└── validar.ts                     # validarCatalogo: sin error por DISTRIBUCION_CORE (R8)
packages/protocol/schemas/player-data.schema.json   # enum de nacionalidad ampliado

tools/fixtures/
├── package.json                   # script "core-real"
├── src/coreReal.ts                # NUEVO: valida, fusiona y genera el sumario
└── tests/sumarioCore.test.ts      # NUEVO: recuento y necesidades
```

**Structure Decision**: se reutiliza el monorepo actual. La herramienta va en `tools/fixtures`, junto a `generarCore.ts`
y `asignarRasgos.ts`, que ya editan `data/core.json`. El script de retratos (Python) es de un solo uso y no se versiona,
como en la spec 007.

## Complexity Tracking

Sin violaciones de la constitución que justificar.
