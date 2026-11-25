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

**Decisión (persona responsable)**: objetivos cada 8 ticks (`PASO_OBJETIVOS = 8` en `packages/engine/src/espacio/paso.ts`); los 20 ms que faltan se buscan en la optimización de la fase 7 (T066), sin cambiar resultados.

### T055: medida en CI con objetivos cada 8 ticks

Mismo job y paso que T054, commit `1fee737`, Node 22:

| Caso | Objetivos cada 4 (`4ca6a40`) | Objetivos cada 8 (`1fee737`) |
|---|---:|---:|
| **Partido sin fotogramas** | **90,4 ms** | **80,7 ms** |
| `resolverResto` desde el minuto 0 | — | 88,8 ms |
| Partido con métricas | — | 70,6 ms |
| Partido con fotogramas (informativo hasta T068) | — | 84,0 ms (máximo 80) |

Con 8 ticks el partido cuesta un 11 % menos, como en local, pero faltan unos 21 ms para los 60 de FR-039. Se buscarán en la fase 7 (T066).

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

## Calibración de la energía (T056, T060)

### Referencias de las acciones intensas

`pnpm --filter @fbd/balance calibrar-fatiga -- --n 1000`, con pesos 1 y `umbralSprint` 0,85. Converge en 5 vueltas (la última varía un 0,5 %):

| Rol | Provisional | Sprints/min | Presiones/min | Regates/min | Duelos/min | **Referencia** |
|---|---:|---:|---:|---:|---:|---:|
| Portería | 0,5 | 0,155 | 0,000 | 0,000 | 0,006 | **0,161** |
| Defensa | 2 | 0,869 | 0,136 | 0,003 | 0,064 | **1,072** |
| Medio | 3 | 1,203 | 0,296 | 0,018 | 0,122 | **1,639** |
| Ataque | 2,5 | 1,088 | 0,178 | 0,010 | 0,061 | **1,337** |

Los sprints son en torno al 80 % de los puntos de intensidad.

### Peso de la presión y coste de Presión alta (SC-005)

Con las referencias calibradas, 500 partidos por serie. Al subir el peso de la presión, sube también la referencia de cada rol con sus presiones por minuto:

| Peso de la presión | Bloque medio al 90' | Presión alta al 90' | Coste |
|---:|---:|---:|---:|
| 1 | 60,4 | 59,4 | 1,0 |
| 2 | 60,4 | 59,2 | 1,2 |
| 3 | 60,4 | 58,9 | 1,4 |
| 4 | 60,3 | 58,8 | 1,6 |

En la 8.0.0 costaba 34 puntos (54 frente a 20). El peso apenas cambia el coste, porque la referencia sube con él: lo limitan el 20 % de gasto por acciones y que Presión alta presiona poco más que Bloque medio. Con cualquier peso, SC-003 y SC-004 quedan a menos de 2,6 puntos de su curva y la diferencia de SC-005 es significativa.

### Decisiones (persona responsable, 2026-11-25)

- `referenciaAcciones`: las de la tabla, con todos los `pesosAccion` a 1.
- `umbralSprint`: se mantiene en 0,85; no hay una cifra objetivo contra la que calibrarlo.
- SC-005: basta con una diferencia significativa, sin tamaño mínimo.
- SC-006 (la spec no fija la dirección esperada): se siguen las intenciones de la US2. Catenaccio, con menos goles en contra que la neutra y un efecto en la diferencia de goles mayor que en la 8.0.0 (−0,65). Individual, con menos goles en contra que la neutra. Bandas + Vertical, con un efecto en la diferencia de goles menor que en la 8.0.0 (+0,13). Línea adelantada, con más fueras de juego provocados que la neutra. «Medible» quiere decir más de 2 errores estándar.
- Cinemática (`cinematica.test.ts`, separación entre parejas): con las referencias calibradas, en 2 de los 10 partidos dos compañeros quedan 3 muestras seguidas a menos del radio (el límite es 2) yendo a por un balón suelto. Uno presiona y el otro tiene un destino en la jugada. La excepción de la prueba se amplía a quienes tienen un destino, igual que a los presionadores. El motor no cambia.
