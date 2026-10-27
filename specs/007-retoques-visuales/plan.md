# Implementation Plan: Retoques visuales

**Branch**: `007-retoques-visuales` | **Date**: 2026-10-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-retoques-visuales/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

La spec 007 solo toca el cliente web (`apps/web`) y sus recursos estáticos. No cambian el dominio, el servidor, el
protocolo ni los datos del catálogo. Tiene seis frentes:

1. **Recursos gráficos (FR-002, FR-004, FR-009, FR-018)**. Un script de un solo uso, con Python y Pillow, prepara los
   recursos de `temp/` (R1):
   - quita el fondo negro del logo y del sobre;
   - recorta los cuatro marcos al contorno de la carta;
   - genera SVG que contienen una imagen WebP incrustada y un `clipPath` con el contorno;
   - convierte los seis fondos a WebP de 1599 × 900.
2. **Carta sobre marco (FR-004 a FR-007, FR-006b)**.
   - El marco de su nivel es el fondo de `.carta.completa`, con proporción fija 2 : 3.
   - La foto por demarcación va semitransparente dentro del marco.
   - El texto pasa a claro en los cuatro niveles, porque los cuatro interiores son oscuros.
   - La carta compacta usa el mismo marco como fondo, con un velo que mantiene la legibilidad (R2, R3).
3. **Logo y sobre (FR-001 a FR-003, FR-017 a FR-020)**.
   - `Escudo` y `SobreArte` siguen siendo los únicos puntos de entrada y pasan a pintar los SVG nuevos.
   - El rasgado del sobre es un `clip-path` CSS de borde irregular.
   - `--proporcion-sobre` adopta la proporción del sobre nuevo (R4).
4. **Sonido (FR-010 a FR-015)**.
   - Los nueve efectos son grabaciones CC0 en MP3 mono (R5, R6).
   - `sonido.ts` deja de sintetizar y solo reproduce ficheros.
   - Todas las ganancias se multiplican por 0,8.
   - `reproducir` devuelve una función para detener el sonido, para cortar la ruleta al saltar (R7).
   - Las pantallas de campeón y de derrota reproducen su efecto una vez por montaje (R8).
5. **Ruleta del estado de forma (FR-012)**. Una función pura de `secuenciaDuelos.ts` decide el valor que se ve durante el
   giro y cuándo termina. La pantalla de duelos solo lo pinta (R9).
6. **Fondos y torneo (FR-008, FR-016)**.
   - `FONDOS_PANTALLA` pasa de 5 a 11.
   - `Torneo.tsx` no añade las pestañas de goleadores y asistentes si `vista.modo === 'duelos'`.

Al terminar se borra `temp/` (FR-021) y nada del repositorio apunta a él.

## Technical Context

**Language/Version**: TypeScript 5.6 (cliente React 19 + Vite 6). Python 3.13 + Pillow solo para el script de
preparación de recursos, que no se versiona (R1).

**Primary Dependencies**: las que ya tiene el proyecto. No se añade ninguna dependencia. El recorte y la conversión de
audio se hacen una vez con `pnpm dlx ffmpeg-static` (R6).

**Storage**: ficheros estáticos en `apps/web/public/` (`marca/`, `cartas/marcos/`, `cartas/sobre.svg`, `fondos/`,
`sonidos/`). Sin cambios en la base de datos.

**Testing**: Vitest (unidad: `secuenciaDuelos`, `tokens`), `pnpm lint` (incluye `lint:tokens`) y Playwright (e2e: `apertura`, `cartas`, `duelos`, `torneo`,
`diseno/*`). También una revisión manual con la guía [quickstart.md](./quickstart.md) (constitución IX).

**Target Platform**: navegadores modernos de escritorio y móvil (Chrome, Firefox, Safari), con el mismo alcance que hoy.

**Project Type**: aplicación web (monorepo pnpm: `apps/web`, `apps/server`, `packages/*`). Solo cambia `apps/web`.

**Performance Goals**:
- Cada fondo pesa ≤ 150 KB.
- Cada SVG de marco o de sobre pesa ≤ 150 KB.
- El logo pesa ≤ 40 KB.
- Los sonidos suman ≤ 300 KB.
- Las animaciones existentes mantienen sus tiempos.

**Constraints**:
- Sin tildes en el código.
- Sin dependencias nuevas.
- Respeto de `prefers-reduced-motion` y del interruptor de silencio.
- Los SVG se usan como `<img>` o `background-image`, así que no pueden cargar recursos externos: la imagen va incrustada
  (R1).

**Scale/Scope**:
- 4 marcos, 1 logo, 1 sobre, 6 fondos y 9 sonidos.
- Componentes afectados: `CartaJugador`, `Escudo`, `SobreArte`, `AperturaSobre`, `Duelos`, `PantallaCampeon`,
  `PantallaDerrota`, `Torneo` y `Marco`.
- Estilos afectados: `cartas.css`, `tokens.css`, `index.html` y `sonido.ts`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación |
|-----------|------------|
| I. Estrategia determinante | No aplica: no cambian reglas ni resultados. La ruleta solo presenta un valor que ya calculó el servidor. ✅ |
| II. Draft como núcleo | Sin cambios en reglas del draft; solo el aspecto del sobre y las cartas. ✅ |
| III. Reglas del dominio explícitas | Ninguna regla nueva. El cálculo del estado de forma sigue en `packages/domain`. La ruleta es presentación pura en `secuenciaDuelos.ts`. ✅ |
| IV. Simulación coherente | El motor no cambia. La ruleta muestra el `forma` del resultado y no lo vuelve a sortear (R9). ✅ |
| V. Un motor, dos modalidades | No aplica. ✅ |
| VI. Integridad multijugador | No hay operaciones competitivas nuevas. Ocultar las pestañas es solo presentación. ✅ |
| VII. Colecciones y monetización | Las cartas de colecciones compradas usan el mismo marco de su nivel que *Core* (FR-006). ✅ |
| VIII. Modularidad | Los cambios quedan en los componentes de presentación existentes. `Escudo` y `SobreArte` siguen siendo puntos únicos. ✅ |
| IX. Calidad con pruebas | Hay pruebas unitarias de la ruleta, e2e actualizados (apertura, duelos sin pestañas, logo y favicon) y una guía manual en quickstart.md. ✅ |
| X. Incremental y trazable | Cada historia se prueba por separado. Las tareas se trazan a FR y SC. ✅ |
| Flujo git | El agente no hace commit ni push. ✅ |

**Resultado**: sin violaciones. Re-evaluación tras la Fase 1: sin cambios. El diseño no introduce capas, dependencias ni
lógica de dominio nuevas.

## Project Structure

### Documentation (this feature)

```text
specs/007-retoques-visuales/
├── plan.md              # Este fichero
├── research.md          # Fase 0: decisiones R1–R10
├── data-model.md        # Fase 1: recursos, efectos y estados de la UI
├── quickstart.md        # Fase 1: guía de validación
├── contracts/
│   └── recursos-y-ui.md # Rutas, formatos y límites de los recursos; API de sonido; contrato visual de la carta
├── checklists/requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
apps/web/
├── index.html                          # favicon → /marca/logo.svg
├── public/
│   ├── favicon.svg                     # se elimina
│   ├── marca/logo.svg                  # NUEVO (logo + favicon)
│   ├── cartas/
│   │   ├── marcos/{superclase,epico,legendario,goat}.svg   # NUEVOS
│   │   └── sobre.svg                   # NUEVO
│   ├── fondos/background_{6..11}.webp  # NUEVOS
│   └── sonidos/
│       ├── {apertura,reparto,volteo,revelacion,entradaDuelo,choqueDuelo,ruletaForma,aplausos,trompetas}.mp3  # NUEVOS
│       ├── {reparto,volteo,revelacion}.wav                  # se eliminan
│       └── LICENCIA                    # autor, origen y licencia de cada fichero
├── src/
│   ├── app/Marco.tsx                   # FONDOS_PANTALLA = 11
│   ├── componentes/
│   │   ├── arte/Escudo.tsx             # <img src="/marca/logo.svg">
│   │   ├── arte/SobreArte.tsx          # <img src="/cartas/sobre.svg">; rasgado por clase CSS
│   │   ├── AperturaSobre.tsx           # sin cambios de lógica (sonidos ya por nombre)
│   │   ├── CartaJugador.tsx            # sin cambios de estructura; la foto de fondo pasa a semitransparente por CSS
│   │   └── secuenciaDuelos.ts          # + valorRuleta(), DURACION_RULETA_MS
│   ├── pantallas/
│   │   ├── Duelos.tsx                  # ruleta del estado de forma + sonido sincronizado
│   │   ├── PantallaCampeon.tsx         # reproducir('aplausos') una vez
│   │   ├── PantallaDerrota.tsx         # reproducir('trompetas') una vez
│   │   └── Torneo.tsx                  # sin pestañas de goleadores/asistentes en modo duelos
│   ├── sonido/sonido.ts                # solo ficheros MP3, ganancias × 0,8, reproducir() → detener
│   └── estilos/{cartas.css,tokens.css} # carta 2:3 sobre marco; --proporcion-sobre; sobre <img>
└── tests/
    ├── unit/secuenciaDuelos.test.ts    # + ruleta
    └── e2e/{apertura,cartas,duelos,torneo,identidad,diseno/*}.spec.ts  # selectores y comprobaciones actualizadas
```

**Structure Decision**: la del monorepo actual. Todo el trabajo cae en `apps/web` (código y `public/`). El script de
preparación de recursos se ejecuta desde el directorio temporal de la sesión y no se versiona. Sus parámetros quedan en
[research.md](./research.md) R1, para poder repetirlo.

## Complexity Tracking

Sin violaciones de la constitución que justificar.
