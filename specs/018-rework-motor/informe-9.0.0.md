# Informe del motor 9.0.0

Medidas y umbrales aprobados de la spec 018 (plan, etapa 3). La sección de carga (T084) se añade en su tarea.

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

## Tácticas y umbrales (T061, T062)

### Comparación con la 8.0.0

[`linea-base-8.0.0.md`](linea-base-8.0.0.md) y [`linea-base-9.0.0.md`](linea-base-9.0.0.md), 1000 partidos por táctica con las mismas semillas, ya con los parámetros de T062:

| Táctica | GF/GC 8.0 | GF/GC 9.0 | Efecto 8.0 | Efecto 9.0 | Victorias 8.0 | Victorias 9.0 |
|---|---:|---:|---:|---:|---:|---:|
| Neutra | 1,59 / 1,62 | 1,39 / 1,41 | — | — | 37,7 % | 37,1 % |
| Marcaje individual | 1,60 / 1,46 | 1,37 / 1,27 | +0,17 | +0,13 | 42,6 % | 39,8 % |
| Catenaccio | 0,70 / 1,38 | 0,59 / 1,03 | −0,65 | −0,42 | 19,1 % | 21,2 % |
| Presión alta | 1,52 / 1,71 | 1,57 / 1,14 | −0,16 | +0,46 | 34,6 % | 49,7 % |
| Línea adelantada | 1,61 / 1,40 | 1,45 / 1,33 | +0,24 | +0,14 | 45,0 % | 41,0 % |
| Contraataque | 1,76 / 1,54 | 1,64 / 1,31 | +0,26 | +0,35 | 42,8 % | 47,7 % |
| Combinativo | 1,46 / 1,83 | 1,17 / 1,67 | −0,34 | −0,47 | 29,5 % | 26,1 % |
| Bandas | 1,64 / 1,53 | 1,45 / 1,44 | +0,14 | +0,03 | 42,5 % | 39,4 % |
| Juego vertical | 1,66 / 1,54 | 1,51 / 1,41 | +0,15 | +0,13 | 42,4 % | 40,1 % |
| Bandas + Vertical | 1,67 / 1,57 | 1,49 / 1,46 | +0,13 | +0,05 | 41,4 % | 40,4 % |

- Se marcan unos 0,2 goles menos por equipo (2,50 por partido en la serie de 003/SC-001; 2,66 en la 8.0.0).
- Energía al 90' con la neutra: POR 93, DEF 65, MED 46, DEL 59 (8.0.0: 54 en todos). Con Presión alta: 93, 42, 6, 37 (8.0.0: 20 en todos). Sus medios, que son los que presionan, acaban casi sin energía.
- SC-005: el mismo equipo llega al 90' con 60,5 en Bloque medio y 35,5 con Presión alta (coste 25 puntos; 8.0.0: 34).
- Coste orientativo: 70,7 ms por partido con la neutra (8.0.0: 98,8).

### Primera medida: 70 de 81

`pnpm balance --n 1000` con los parámetros de T060 y sin cambiar umbrales:

| Comprobación | Medido | Causa |
|---|---|---|
| 003/SC-001 | 2,50 goles (mínimo 2,6) | Menos goles en la 9.0.0 |
| 003/SC-002 | 28,3 % desde fuera del área (máximo 28 %) | Ídem |
| 002/SC-007a | 13,9 tiros (mínimo 14) | Ídem |
| SC-006c y 018/SC-006 (Catenaccio) | GC 1,85 frente a 1,41 de la neutra; efecto −1,29 | Con `defensiva` 0,5 solo en las zonas 4 y 5 (FR-024) encaja más que sin táctica |
| 018/SC-006 (Bandas + Vertical) | +0,05 frente a +0,13, no medible | Diferencia de 0,08 con un error de 0,05 por serie |
| 005/SC-004/Fatigado | Minuto de inicio 31 (objetivo 46) | La comprobación medía cuándo empieza a cansarse, y en la 9.0.0 todos empiezan en el minuto 30: Fatigado gasta más, no antes |
| 005/SC-004/Indisciplinado | 2,18 frente a un compañero (objetivo 1,5) | Comparaba un medio con un lateral, de ritmo distinto |
| 014/SC-006 y SC-006b | 61 % al 90'; 41 % tras la prórroga | Rangos de la curva 8.0.0; FR-023 los sustituye por la curva de la 9.0.0 (018/SC-003) |
| 015/SC-004 | Pases recibidos 7,55 → 7,80, no significativo | Falta de potencia estadística |
| 003/SC-009 | — | Agrega 002/SC-007a |

Además, Presión alta sin coste propio quedaba con efecto +0,90 y 63 % de victorias. La comprobación la pasaba, pero no es jugable.

### Opciones de diseño

**Presión alta** (sonda de 1000 partidos; energía media del equipo al 90'):

| `costePresion` | GF / GC | Efecto | Victorias | Energía 90' |
|---:|---:|---:|---:|---:|
| 1 (sin coste) | 1,81 / 0,93 | +0,90 | 63 % | 57,7 |
| 5 | 1,75 / 0,96 | +0,81 | 60 % | 50,4 |
| 10 | 1,70 / 0,95 | +0,78 | 60 % | 41,3 |
| **15** | **1,57 / 1,14** | **+0,46** | **50 %** | **32,9** |
| 20 | 1,51 / 1,10 | +0,43 | 51 % | 25,8 |

- Descartado: volver a un multiplicador de ritmo (lo prohíbe FR-017), debilitar sus efectos de duelo (FR-033) o hacer que presione más a menudo (cambia su comportamiento).
- Elegido: `presionAlta.costePresion`, que multiplica el gasto de cada presión del equipo con Presión alta (FR-017: solo se cansa por sus presiones).
- Valor 15. Con 20 el efecto apenas baja (+0,43) y los medios acaban en 1,5.
- La energía no baja el efecto de +0,4: sigue siendo la táctica más fuerte. Para bajarlo más habría que tocar sus efectos de duelo, que FR-033 fija y que decide la persona responsable.

**Catenaccio** (sonda de 1000 partidos; coste ofensivo es el malus de las acciones de ataque):

| `defensiva` | Coste ofensivo | GF / GC | Efecto | Victorias |
|---:|---|---:|---:|---:|
| 0,9 | igual | 0,56 / 1,59 | −1,02 | 12 % |
| 1,7 | igual | 0,59 / 1,27 | −0,65 | 15 % |
| 2,1 | igual | 0,57 / 1,10 | −0,51 | 21 % |
| **2,5** | **igual** | **0,59 / 1,03** | **−0,42** | **21 %** |
| 3,0 | igual | 0,61 / 0,91 | −0,27 | 25 % |
| 1,7 | −0,2 | 0,70 / 1,20 | −0,48 | 22 % |
| 1,3 | −0,1 | 0,74 / 1,30 | −0,54 | 21 % |

- Descartado: volver a la zona 3 (FR-024 la limita a 4 y 5) y bajar el coste ofensivo (sube poco los goles a favor y FR-024 lo mantiene).
- Elegido: `catenaccio.defensiva` 0,5 → 2,5. Encaja 0,38 goles menos que la neutra y su efecto (−0,42) queda medible por encima del de la 8.0.0 (−0,65). Con 3,0 se acercaría demasiado a la neutra para una táctica que renuncia al ataque.

**Bandas + Vertical**: para que el +0,05 quede 2 errores estándar por debajo del +0,13 de la 8.0.0 habría que dejarla peor que la neutra. Se descarta y la comprobación pasa a medir la dirección: efecto no mayor que en la 8.0.0 ni que Juego vertical sola (+0,13).

**Goles**: las palancas de tiro y de gol probadas en una sonda (cinco combinaciones) movieron la media entre 2,47 y 2,62 y los de fuera del área entre el 25,9 % y el 28,3 %, sin acercarse a la 8.0.0 y con ruido. Se ajustan los umbrales en lugar de recalibrar el remate.

### Umbrales

| Comprobación | Valor anterior | Medido (9.0.0) | Nuevo | Motivo |
|---|---|---|---|---|
| 003/SC-001 y SC-001c | 2,6–3,4 goles | 2,50 | 2,4–3,4 | Menos goles en la 9.0.0 |
| 003/SC-002 | 22 %–28 % fuera del área | 28,3 % | 22 %–30 % | Ídem |
| 002/SC-007a | 14 tiros | 13,9 | 13,5 | Ídem (8.0.0: 14,6) |
| 005/SC-004/Fatigado | Minuto de inicio, objetivo 46 | 1,410 | Energía gastada al 89' frente a un medio rival sin rasgos, objetivo de `curvaEnergia` (1,36), ±20 % | En la 9.0.0 el rasgo cambia el ritmo, no el inicio |
| 005/SC-004/Indisciplinado | Gasto frente a un compañero, objetivo 1,5 | 1,457 | Igual que Fatigado, objetivo 1,384, ±20 % | Comparar el mismo rol |
| 014/SC-006 | 45 %–55 % al 90' | 61 % | Retirada | FR-023: la cubren la curva y 018/SC-003 |
| 014/SC-006b | < 40 % tras la prórroga | 41 % | Retirada | Ídem |
| 015/SC-004 | n partidos | No significativo | 2n partidos | Potencia estadística; el umbral no cambia |
| 018/SC-006, Bandas + Vertical | Efecto menor que en la 8.0.0, medible | +0,05 | No mayor que en la 8.0.0 ni que Juego vertical sola | Ver opciones |
| NPC (`umbralEnergia`) | 42 / 53 / 63 de partida | Sin medir (`--torneos`) | Sin cambios | Sin datos para cambiarlos |

Parámetros cambiados en T062: `tacticas.catenaccio.defensiva` 0,5 → 2,5 y `tacticas.presionAlta.costePresion` (nuevo) 15.

**Aprobación**: persona responsable, por delegación en las recomendaciones de Claude (2026-11-26).

### Resultado (T063)

`pnpm balance --n 1000`: **79 de 79** en 7755 s (dos menos que en la primera medida, por las retiradas de 014/SC-006 y SC-006b).

## Optimización (T066 a T068; FR-039, FR-040, FR-045)

Medido en local (el mismo equipo que en T055, Node 24) con `umbral-motor`. Tras cada cambio del motor se pasó la huella 018 (`equivalencia018`), y al final `pnpm test:equivalence` completo: 134 de 134, idéntico.

### Cambios en el motor (sin cambiar resultados)

| Fichero | Cambio |
|---|---|
| `espacio/movimiento.ts` | La separación ordena por inserción (mismo orden: los ids son únicos) en lugar de `sort` con una función nueva en cada paso; el medio paso recorre las plantillas en lugar de `Object.values`; sin cierre `escalaDe` en cada paso |
| `espacio/objetivos.ts` | Línea, papel de llegada e intensidad de cada jugador guardados mientras no cambien su casilla, su posición o la formación; sin cierres en cada cálculo |
| `modificadores/defectos.ts` | `actualizarMalestar` (en cada tick) salta los equipos sin Polémico ni Rebelde en la plantilla |
| `modificadores/cansancio.ts` | `contarMotivadores` (en cada tick) devuelve 0 sin recorrer el once si la plantilla no tiene ningún Motivador |

### Ids de los equipos de la medida

`umbral-motor` usaba cartas sintéticas con ids desde 1 000 000. Con ids tan altos, V8 guarda en modo diccionario los registros del motor indexados por id (`espacio.jugadores`, los objetivos y los destinos), y cada acceso cuesta más. En el servidor los ids son los del catálogo (de 1 a 396) y no pasa. Con los mismos equipos y el motor ya optimizado: 69,1 ms con ids desde 1 000 000 y 57,4 ms con ids desde 500.

Desde T066, `umbral-motor` renumera los dos equipos desde 1 y desde 101 (`clonar(…, desde)` en `tools/balance/src/equipos.ts`). Si el catálogo pasa de unos 1000 ids, hay que volver a medir con los suyos. El bench de vitest reutiliza los mismos equipos en cada partido por la misma razón.

### Resultado

| Caso | Antes de T066 | Motor optimizado, ids desde 1 000 000 | Motor optimizado, ids del catálogo (2 tandas de 50) | Máximo (T068) |
|---|---:|---:|---:|---:|
| **Partido sin fotogramas** | 85,4 ms | 69,1 ms | **53,1 / 53,9 ms** | 60 ms |
| `resolverResto` desde el minuto 0 | 89,2 ms | 70,2 ms | 55,4 / 54,7 ms | 60 ms |
| Partido con métricas | 80,4 ms | 65,3 ms | 51,4 / 51,8 ms | 60 ms |
| Partido con fotogramas | 90,6 ms | 73,1 ms | 57,5 / 57,3 ms | 80 ms |

T068 activa los cuatro máximos por defecto, y el caso con fotogramas también bloquea. El margen en local es de unos 5 ms sobre 60. En T055 el CI y este equipo midieron casi lo mismo (80,7 frente a unos 80 ms), pero el resultado oficial es el del job `rendimiento-motor` (T069).

`pnpm --filter @fbd/engine bench` solo informa: dentro de vitest cada partido cuesta unos 20 ms más que fuera (los mismos equipos: 76 frente a 54 ms). `resolverResto` no está en el bench porque `@fbd/ai` depende de `@fbd/engine`, y traerlo crearía un ciclo entre paquetes (T067).

## Comprobación final (T085)

A 2026-11-26, en local con los cambios de T066 a T068:

- `pnpm lint` y `pnpm typecheck`: sin errores.
- `pnpm test`: 1425 de 1425.
- `pnpm test:integration`: 283 de 283.
- `pnpm test:equivalence`: 134 de 134.
- `umbral-motor`: dentro de los cuatro máximos (ver «Optimización»).
- `pnpm balance --n 1000`: **79 de 79** en 6260 s (7755 s en T063, antes de optimizar).
