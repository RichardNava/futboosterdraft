# Implementation Plan: Mejoras visuales y de diseño (GUI + UX)

**Branch**: `004-mejoras-visuales-diseno` | **Date**: 2026-10-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-mejoras-visuales-diseno/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

La spec 004 cambia el aspecto de todas las pantallas de `apps/web` para adoptar la dirección visual de [docs/diseno/DESIGN.md](../../docs/diseno/DESIGN.md):

- lienzo casi negro con paneles planos;
- un único acento lima reservado a la acción;
- tipografía condensada a escala de cartel;
- esquinas de 6 px.

No cambia ninguna regla de juego, el servidor, el protocolo ni la base de datos.

**Enfoque técnico** (ver [research.md](./research.md)):

- **Una sola fuente de valores visuales** (R5): `apps/web/src/estilos/tokens.css`, con la paleta de contrastes medidos (R4), la escala tipográfica con cartel adaptable, el espaciado de 4 px, el radio y el movimiento.
  - Desaparece el tema claro.
  - Un script `lint:tokens` impide colores, radios y sombras literales fuera de ese fichero.
- **Tipografía** (R2, R3): Barlow Condensed (ya incluida) para el cartel y las cifras, y Barlow para el texto, ambas OFL y servidas como woff2 propios.
  - Las alternativas tienen las métricas ajustadas y las dos fuentes de la primera pantalla se precargan, para que no haya texto invisible ni saltos.
- **Componentes** (R7):
  - se reescriben los estilos de los elementos y de las clases que ya usan las 30 pantallas, en `estilos/componentes.css`;
  - siete componentes React pequeños donde hay comportamiento: `Icono`, `Aviso`, `EstadoVacio`, `Esqueleto`, `NombreRecortado`, `Insignia` y `MenuNavegacion`;
  - sin librerías de interfaz: `<dialog>` para el menú móvil (R8), `popover` y Pointer Events para la etiqueta de los nombres recortados con pulsación larga (R9).
- **Pantallas**: jerarquía por pantalla según [contracts/ui.md](./contracts/ui.md):
  - portada con cartel;
  - "Continuar partida" en el inicio;
  - marcadores de cartel;
  - finales con titular protagonista;
  - draft con las cartas dominantes;
  - franja 2D;
  - tablas con cifras tabulares;
  - iconos de eventos;
  - estados de carga, vacío y error.
- **Verificación** (R13):
  - `@axe-core/playwright`, la única dependencia nueva, solo de desarrollo;
  - una ayuda `comprobarDiseno` que mide, en cada pantalla del inventario y a cinco anchos, el desplazamiento horizontal, las infracciones WCAG AA, el uso del lima y el foco;
  - un recorrido solo con teclado;
  - un trabajo `e2e-diseno` en CI con PostgreSQL.

  La validación con personas (R14) compara con `4168404`.

## Technical Context

**Language/Version**: TypeScript 5.x; Node.js 22 LTS; navegadores modernos. Sin cambios.

**Primary Dependencies**:

- Las de 003 en `apps/web`: React 19, React Router 7, Zustand y Vite 6.
- Nueva, solo de desarrollo: `@axe-core/playwright`.
- Sin dependencias nuevas en tiempo de ejecución:
  - tipografías: ficheros woff2 OFL en `apps/web/public/fuentes/`;
  - iconos: SVG en línea;
  - menú: `<dialog>`;
  - etiquetas emergentes: `popover`.

**Package Manager**: pnpm 9, sin excepciones (CLAUDE.md).

**Storage**: N/A. No hay migraciones ni cambios de datos.

**Testing**:

- Vitest:
  - `tests/unit/tokens.test.ts`: contrastes;
  - `colores.test.ts`: `necesitaContorno`;
  - `nombreRecortado.test.ts`: lógica de la pulsación larga.
- Playwright: `tests/e2e/diseno/` con axe, más la batería e2e existente para la no regresión.
- Personas: `checklists/visual.md` y `checklists/validacion.md`.

**Target Platform**: navegadores de escritorio y móvil actuales; de 360 a 1920 px de ancho; táctil y teclado.

**Project Type**: aplicación web (monorepo pnpm). Esta spec solo toca `apps/web` y `.github/workflows/ci.yml`.

**Performance Goals**:

- texto visible desde el primer pintado, con `font-display: swap`;
- sin saltos apreciables al cargar las fuentes (SC-009);
- animaciones solo de `opacity` y `transform`, a 60 fps;
- peso añadido por tipografías ≤ 120 KB (3 pesos de Barlow, subconjunto latino).

**Constraints**:

- contraste ≥ 4,5:1 en el texto (3:1 en el texto grande y en los bordes de controles);
- foco ≥ 3:1;
- objetivos táctiles ≥ 44 px;
- sin desplazamiento horizontal de 360 a 1920 px ni con ampliación del 200 %;
- movimiento reducido;
- sin cambios de comportamiento (FR-038).

**Scale/Scope**: 22 pantallas y elementos del inventario (data-model §3), unos 30 componentes y pantallas en `apps/web/src`, unas 1.900 líneas de CSS actuales (`base.css` y `cartas.css`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación | Estado |
|---|---|---|
| I. Estrategia determinante | No se toca ninguna regla ni el motor | ✅ N/A |
| II. Draft como núcleo | Mismas reglas. La pantalla del draft gana jerarquía (FR-018), sin cambiar la selección | ✅ |
| III. Reglas del dominio explícitas | No se mueven reglas a la interfaz. `necesitaContorno` es presentación, no regla de juego | ✅ |
| IV. Simulación separada de la vista | El renderizador 2D solo cambia los colores de interfaz; la lógica de simulación no se toca | ✅ |
| V. Un motor, dos modalidades | Las dos modalidades cambian solo de aspecto (marcador, franja, iconos) | ✅ |
| VI. Integridad multijugador | Sin cambios en el servidor ni en las validaciones | ✅ N/A |
| VII. Colecciones y monetización | Sin cambios | ✅ N/A |
| VIII. Modularidad | Los valores visuales quedan en un único módulo (`tokens.css`) y los componentes comunes, en `componentes/`. No hay lógica de juego en los estilos | ✅ |
| IX. Calidad demostrada con pruebas | Cada SC se comprueba usando la aplicación: quickstart, lista visual y validación con personas. FR-040 añade pruebas automáticas en CI. Las e2e existentes cubren FR-038 | ✅ |
| X. Incremental y trazable | Historias independientes: US1 (base de tokens y componentes) habilita US2 a US5. Trazabilidad FR → contrato → prueba en contracts/ui.md y quickstart | ✅ |
| Flujo de git | Los agentes no hacen commit ni push | ✅ |

**Resultado**: sin infracciones. No hace falta "Complexity Tracking".

**Re-evaluación tras el diseño (Phase 1)**: sin cambios. La única dependencia nueva es de desarrollo y sirve a las pruebas (Principio IX). No se añaden componentes de servidor ni capas.

## Project Structure

### Documentation (this feature)

```text
specs/004-mejoras-visuales-diseno/
├── plan.md              # Este fichero
├── research.md          # Phase 0: R1–R15
├── data-model.md        # Phase 1: tokens, componentes, inventario
├── quickstart.md        # Phase 1: validación
├── contracts/
│   └── ui.md            # Phase 1: contrato visual y de interacción
├── checklists/
│   ├── requirements.md  # Calidad de la spec
│   ├── visual.md        # SC-001 (se crea en tasks)
│   └── validacion.md    # SC-003, SC-004, SC-010 (se crea en tasks)
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
apps/web/
├── index.html                         # preload de Barlow 400 y Barlow Condensed 800 (R3)
├── package.json                       # + @axe-core/playwright (dev); script lint:tokens
├── public/fuentes/                    # + barlow-400/500/600.woff2 (OFL, misma LICENCIA)
├── scripts/
│   └── comprobar-tokens.mjs           # NUEVO: lint de literales (R5)
├── src/
│   ├── estilos/
│   │   ├── tokens.css                 # NUEVO: fuente única (FR-037)
│   │   ├── fuentes.css                # NUEVO: @font-face y alternativas ajustadas (R3)
│   │   ├── componentes.css            # NUEVO: botones, campos, paneles, tablas, avisos… (R7)
│   │   ├── base.css                   # Se reduce a maquetación de pantallas sobre tokens
│   │   └── cartas.css                 # Marco y colores de nivel recalibrados para el fondo oscuro (R4)
│   ├── componentes/
│   │   ├── Icono.tsx                  # NUEVO
│   │   ├── Aviso.tsx                  # NUEVO (+ región de avisos apilados)
│   │   ├── EstadoVacio.tsx            # NUEVO
│   │   ├── Esqueleto.tsx              # NUEVO
│   │   ├── NombreRecortado.tsx        # NUEVO (R9)
│   │   ├── Insignia.tsx               # NUEVO
│   │   ├── MenuNavegacion.tsx         # NUEVO (R8)
│   │   ├── colores.ts                 # + necesitaContorno (R11)
│   │   └── …                          # Existentes: se ajusta su marcado (ResultadoPartido, ResumenEventos, BandejaAvisos, AvisoPartido, AvisoDorsales, BarraPrincipal, FichaJugador…)
│   ├── campo2d/renderizador.ts        # Colores de interfaz desde los tokens (R6)
│   ├── app/Marco.tsx                  # Barra de navegación nueva
│   └── pantallas/*.tsx                # Jerarquía, estados y textos por pantalla
└── tests/
    ├── unit/
    │   ├── tokens.test.ts             # NUEVO
    │   ├── colores.test.ts            # NUEVO
    │   └── nombreRecortado.test.ts    # NUEVO
    └── e2e/
        └── diseno/                    # NUEVO (FR-040)
            ├── comprobaciones.ts
            ├── inventario.spec.ts
            ├── teclado.spec.ts
            ├── nombres.spec.ts
            ├── menu.spec.ts
            └── tema.spec.ts

.github/workflows/ci.yml               # + trabajo e2e-diseno con postgres:16 (R13)
```

**Structure Decision**: solo cambia el cliente web, `apps/web`, dentro de la estructura del monorepo de las specs 001 a 003. Los paquetes `domain`, `engine`, `ai`, `protocol` y `apps/server` no se modifican. Orden recomendado de construcción, que encaja con las historias de la spec:

1. **US1**: `tokens.css`, `fuentes.css`, `componentes.css` y la barra de navegación. Con esto, todas las pantallas ya adoptan la base.
2. **US2**: `Aviso`, `EstadoVacio`, `Esqueleto` y los textos.
3. **US4**: el menú móvil, `NombreRecortado`, el foco y las pruebas de diseño en CI.
4. **US5**: la jerarquía de draft, formación, 2D, tablas y eventos.
5. **US3**: la portada, los marcadores y los finales.
6. Validación con personas.

## Complexity Tracking

Sin infracciones de la constitución: no aplica.
