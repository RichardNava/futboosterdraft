# Informe del motor 9.0.0

Medidas y umbrales aprobados de la spec 018 (plan, etapa 3). Las secciones de calibración (T061) y de carga (T084) se añaden en sus tareas.

## Rendimiento antes de calibrar (T054, T055; FR-003)

### T054: medida oficial en CI

| Campo | Valor |
|---|---|
| Commit | `4ca6a40` (rama `018-rework-motor`, PR fusionado con `main`) |
| Job | `rendimiento-motor`, paso `umbral-motor` (20 partidos) |
| Node | 22 (GitHub Actions, `ubuntu-latest`) |
| Cadencia | movimiento cada 4 ticks, objetivos cada 4 (`PASO_OBJETIVOS = 4`), sin recalcular objetivos sin cambios en los saques |
| **Partido completo sin fotogramas** | **90,4 ms** (objetivo de FR-039: ≤ 60 ms) |

Supera los 60 ms: según FR-003, los objetivos pasan a calcularse cada 8 ticks.

### T055: medida previa con objetivos cada 8 ticks (local)

Antes de cambiar resultados se midió en local si 8 ticks bastan. El equipo local da casi lo mismo que CI con 4 ticks (89,6 frente a 90,4 ms), así que sirve de estimación. `umbral-motor -- --n 50`, Node 24, dos tandas alternas:

| Caso | Objetivos cada 4 | Objetivos cada 8 |
|---|---:|---:|
| Partido sin fotogramas | 93,0 / 87,2 ms | 82,3 / 77,7 ms |
| `resolverResto` desde el minuto 0 | 94,4 / 90,4 ms | 83,5 / 79,7 ms |
| Partido con métricas | 89,1 / 85,3 ms | 78,7 / 75,2 ms |
| Partido con fotogramas | 98,4 / 94,6 ms | 88,5 / 85,5 ms |

Con 8 ticks se gana un 11 % aproximadamente, y el partido sin fotogramas queda en unos 80 ms: **ni con 8 ticks se alcanza FR-039**. Según FR-003 y T055, la persona responsable decide cómo seguir antes de calibrar.

La estimación del research (R8: ~70 ms con 4 ticks y ~59 ms con 8) se quedó corta en unos 20 ms.

**Decisión (persona responsable)**: objetivos cada 8 ticks (`PASO_OBJETIVOS = 8` en `packages/engine/src/espacio/paso.ts`); los 20 ms que faltan se buscan en la optimización de la fase 7 (T066), sin cambiar resultados. Queda pendiente repetir la medida de T054 en CI con 8 ticks.

### Efecto en la cinemática (`packages/engine/tests/cinematica.test.ts`)

Con 8 ticks, la comprobación «distancia entre líneas en el rango de FR-023 en al menos el 95 % de los ticks» bajaba al 93,9 %, pero solo miraba los 10 primeros de los 50 partidos que simula. Por grupos de 10:

| Partidos | Objetivos cada 4 | Objetivos cada 8 |
|---|---:|---:|
| 1–10 | 96,1 % | 93,9 % |
| 11–20 | 96,1 % | 95,9 % |
| 21–30 | 96,9 % | 97,3 % |
| 31–40 | 98,8 % | 96,1 % |
| 41–50 | 97,3 % | 97,3 % |
| **Los 50** | **96,9 %** | **96,1 %** |

La persona responsable aprobó bajar el umbral al 93 %; en su lugar se mantiene el 95 % y se mide sobre los 50 partidos, que es más exigente. Se descartó subir `MARGEN_LINEAS` en `objetivos.ts` (250): de 300 a 350 la prueba alternaba sin tendencia entre fallar esta comprobación y la de jugadores demasiado juntos.
