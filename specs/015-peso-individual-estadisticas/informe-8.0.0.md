# Informe del motor 8.0.0 (spec 015, T075, T076, T079 y decisiones del 2026-11-17)

Resultado de `pnpm balance --n 1000` (semilla 1, la del CI) con los parámetros 8.0.0 finales, tras aplicar las
decisiones del 2026-11-17 ([Clarifications](spec.md#session-2026-11-16-decisiones-tras-la-tanda-3)). **76 de 76
comprobaciones superadas**: la tanda 3 añade 015/SC-006a, 015/SC-006b y 015/SC-014. Con la semilla 5001, 002/SC-007a,
015/SC-006a y 015/SC-014 también pasan. El CI corre sin `--pendientes`.

- La 7.0.0 se sigue simulando igual: `huella-014.json` no ha cambiado en ninguna tanda.
- La 8.0.0 tarda un 5–6 % más que la 7.0.0 (SC-009, límite +12 %).

## Cómo leer este informe

- **Los códigos**: «015/SC-006a» es el criterio de éxito (*success criterion*) 6a de la spec 015; «002/SC-007a», uno de
  la spec 002. Los que el informe de `pnpm balance` muestra sin número de spec (SC-004, SC-006a…e, SC-007, SC-011,
  SC-015) son de la spec 001, salvo SC-011 y SC-011b, que son de la 002. Ojo: «SC-006a» sin prefijo (formaciones, de
  la 001) no es «015/SC-006a» (liderazgo). «FR» es un requisito, no un criterio.
- **Serie de 1.000 partidos**: el motor juega 1.000 partidos simulados y se mira si un número cae en su rango.
- **Serie A/B**: 1.000 partidos con un equipo y otros 1.000 con el mismo equipo cambiando una sola cosa (p. ej. +15 de
  regate a un delantero); se comparan los dos resultados.
- **Equipo sintético**: equipo de prueba con todos los jugadores en su posición y stats alrededor de 80. **Core**: las
  cartas reales del catálogo.
- **Semilla**: el número que fija el azar de la serie. El CI usa la 1; la 5001 sirve para comprobar si un resultado es
  real o casualidad.
- **Diferencia significativa**: más grande de lo que el azar explicaría con esa cantidad de partidos.
- **Umbral vigente**: el que comprueba hoy `tools/balance`. Varios han cambiado por decisiones de la 015; el anexo dice
  desde cuándo y el valor anterior.

Qué mide cada comprobación, con su umbral y su resultado: [anexo](#anexo-qué-mide-cada-comprobación).

## Parámetros finales

`PARAMETROS_V8` sobre `PARAMETROS_V7` (`packages/domain/src/parametros/index.ts`). Todo lo nuevo cuelga de bloques
opcionales (research R1):

| Bloque | Valor | Para qué |
|---|---|---|
| `curvas` | regate { −0,32; ×1,1 } · conducción { 0,25; ×1,15 } · pase corto { 1,57; ×1,27 } | Curvas de FR-002 (015/SC-001) |
| `quite` | DEF 1 · MED con MD 0,92 · MED 0,87 · DEL 0,8 · Presionador +0,05 · Mal defensor −0,05 | Quite por demarcación (FR-004/005) |
| `aereo` | `bonusCabeceador` 0,15 · `seleccionCabeceador` 10 | Cabeceador en todos los duelos aéreos (FR-008/009) |
| `decision.factores.regate` | k 1,1 · mínimo ×0,6 · máximo ×4 | El regateador lo intenta más (FR-007) |
| `estrella` | 80 · 4 · 5 · 0,4 · 1,5 · 3 m | Buscar a la estrella (US7) |
| `bandas` | 0,2 · ×1,5 · ×1,3 | Juego por las bandas (US8) |
| `subidaArea` | 1 · 1 · 8 · 60 s · 30 m | Subida al área a balón parado (US9) |
| `segundaLinea` | `xInterior` 7.900 · 10 m | Salir de su zona (US10) |
| `fueraDeCampo` | 0,9 · 0,25 · 0,5 · 22 m · 15 m · 20 · 15 · 6 · 4 · 0,3 | Balones fuera (US11) |
| `desmarque` | 3 m · base 0 · ×1 · libre +0,25 · marcado −0,4 · elección 1 | Desmarque contra marcaje (US4) |
| `controlPresion` | base 0,5 · ×1 | Técnica contra presión (US5) |
| `liderazgo` | radio 20 m · línea min(0,8; 0,34 × (L − 36,5) / 25) · portero 2,5 % de lo que pasa de 70, zonas 0 y 1 | Liderazgo del defensa y del portero (US6) |
| `acciones` | córner tras parada 0,45 y tras despeje 0,6; `puerta.lejano` 0,1; `gol.lejano` −0,1 | Balones fuera y 003/SC-002 |
| `espacio` | `velocidadJugadorMin` 14 | 014/SC-008-velocidad |
| `tiro.autogol` | `despejeCentro` 0,004 (la mitad) | 003/SC-003 |
| `disciplina` / `defectos` | `factorFaltaArea` 0,34 · `malDefensor` 0,5 | FR-021 |

Catálogo: versión 3; las cartas 60, 76, 77, 86, 87 y 275 de Core cambian una virtud por Cabeceador
(`cartaEnVersion` devuelve la anterior a las partidas creadas con la versión 2).

## Tandas de calibración

| Tanda | Contenido | Resultado de su serie de cierre |
|---|---|---|
| 1 (2026-11-14) | Curvas, quite, frecuencia del regate, Cabeceador | 015/SC-001 a SC-003 ✔ |
| 1b (2026-11-14 y 15) | Estrella, bandas, subida al área, segunda línea, balones fuera | 015/SC-002b, SC-003, SC-011 y SC-012 ✔ |
| 2 (2026-11-15 y 16) | Desmarque y control con presión | 71 de 73, después 73 de 73 con las decisiones del 2026-11-16 |
| 3 (2026-11-16) | Liderazgo | 71 de 74: quedaron cinco decisiones |
| Decisiones (2026-11-17) | Portero relativo a 70; la línea con la escala de la persona, medida en 20 escenarios; contraataques 1,5 y 015/SC-014; velocidad +8 %; optimización | **76 de 76** (este informe) |

Detalle de la tanda 3 y de las decisiones: [research.md, «Tanda 3»](research.md#tanda-3-liderazgo-2026-11-16) y
[«Decisiones del 2026-11-17»](research.md#decisiones-del-2026-11-17-y-su-implementación).

## Criterios de la spec 015

| Criterio | Resultado |
|---|---|
| 015/SC-001 curvas | ✔ los nueve duelos en rango (regate 98/90 51,6 %; pase corto 55/75 67,8 %; conducción 70/90 29,9 %…) |
| 015/SC-002a regateador | ✔ intentos +65,7 %, completados +88,1 % |
| 015/SC-002b mejor regateador de Core | ✔ Messi (247) supera a algún defensor en el 86,6 % de los partidos |
| 015/SC-003 Cabeceador | ✔ aéreos ganados 0,49 → 4,99; goles de cabeza de los centrales 0 → 0,164 |
| 015/SC-004 desmarque | ✔ libre 8,40 → 9,23; recibidos 6,98 → 7,30; con marcaje rival, libre 8,06 |
| 015/SC-005 control con presión | ✔ perdidos 27,7 % → 21,2 % (−23,3 %) |
| 015/SC-006a liderazgo del defensa | ✔ 0,312 % por punto (mínimo 0,12): central de 60 −7,6 %, 80 −13,5 %, 95 −18,2 %; semilla 5001, 0,223 % |
| 015/SC-006b liderazgo del portero | ✔ el defensa gana la conducción de referencia el 40,9 % con un portero de 95 y el 40,0 % con uno de 70 |
| 015/SC-011 Juego por las bandas | ✔ toques 27,2 → 28,7; centros 6,67 → 8,02 |
| 015/SC-012 segunda línea | ✔ 26,3 % de los goles (20 equipos) |
| 015/SC-013 balones fuera | ✔ 6,63 córners por partido |
| 015/SC-014 táctica Contraataque | ✔ +39,9 % de contraataques (0,77 → 1,08) |
| SC-007 pendientes de la 014 | ✔ las siete en verde y el CI sin `--pendientes` |
| SC-008 sin regresiones | ✔ con los umbrales vigentes |
| SC-009 rendimiento | ✔ +5,2 % y +6,2 % sobre la 7.0.0 (límite +12 %) |
| SC-010 2D = rápida | ✔ `huella-015.json` y la equivalencia entre modalidades con la 8.0.0 |

## Frente a la tanda 2

| Magnitud | Tanda 2 | 8.0.0 final | Comprobación |
|---|---|---|---|
| Goles por partido | 2,76 | 2,66 | 003/SC-001 ✔ (2,6–3,4) |
| Fuera del área | 26,4 % | 25,3 % | 003/SC-002 ✔ |
| Propia puerta | 3,1 % | 2,5 % | 003/SC-003 ✔ |
| Pases cortos | 60,5 % | 60,5 % | 003/SC-005 ✔ |
| Pases completados / tiros / contraataques | 136,0 / 14,6 / 1,8 | 135,6 / 14,6 / 1,7 | 002/SC-007a ✔ |
| Posesiones con 3 o más pases | 27,0 % | 26,7 % | 002/SC-007b ✔ |
| Fueras de juego | 1,37 | 1,40 | 014/SC-004 ✔ |
| Amarillas / lesiones | 4,53 / 0,38 | 4,54 / 0,35 | 005/SC-011 ✔ |
| Velocidad / defensa (014/SC-008) | +12,8 % / +13,0 % | +9,6 % / +13,0 % | ✔ |
| Mejor regateador de Core | 85,0 % | 86,6 % | 015/SC-002b ✔ |

Los goles bajan una décima: con la escala de la persona, todas las líneas van más ordenadas (un defensa de 80 corrige el
59 % del hueco). Con el portero relativo a 70, el portero ya no los baja.

**Al límite, para vigilar en cambios futuros**: goles 2,66 (mínimo 2,6); velocidad +9,6 % (mínimo +8 %); contraataques
1,7 (mínimo 1,5); pases cortos 60,5 % (mínimo 60 %); tiros 14,6 (mínimo 14).

## Rendimiento (SC-009)

El perfil mostró que el 58 % del sobrecoste de la 8.0.0 estaba en la colocación de la subida al área a balón parado (se
recalcula en cada tick del saque y calculaba el aéreo de cada jugador en cada comparación). Se calcula una vez por
jugador, y `bonusEquipo` recorre el equipo una sola vez; ningún partido cambia.

Misma sesión, cinco rondas alternas de 20 partidos, dos veces: 7.0.0 92,6 / 91,3 ms; 8.0.0 97,5 / 97,0 ms: **+5,2 % y
+6,2 %** (antes, +11,4–11,9 %).

## Pruebas y referencias

- `liderazgo.test.ts` (M2.10: portero relativo a 70, la línea desde `baseDefensa`, `habilitador` y `exposicionLinea`).
- `equivalencia015.test.ts` (100 partidos y 20 drafts de `huella-015.json`, generada con los parámetros finales el
  2026-11-17) y la equivalencia 2D = rápida = por ticks con la 8.0.0 en `equivalencia.test.ts`. Las cuatro
  equivalencias se pasaron antes y después de la optimización.
- `huella-014.json` sin cambios (la 7.0.0); `equivalencia-005.json` fija la 7.0.0 y no se regenera.
- `tools/fixtures/escenarios/*.json` regenerados con la 8.0.0 (`generar-escenarios`).
- `docs/juego/enfrentamientos.md` a la 8.0.0; `virtudes-y-defectos.md` ya estaba al día (`rasgos:doc` no lo cambia).

## Anexo: qué mide cada comprobación

Las 76 comprobaciones de `pnpm balance` con los parámetros de este informe (semilla 1), agrupadas por lo que vigilan,
y al final las cuatro de la 015 que se comprueban fuera de él. Cada una pregunta algo concreto sobre el juego; el umbral
es la respuesta que se da por buena. El texto original de cada criterio está en la spec de su número; el código que lo
mide, en `tools/balance/src/checks/`.

### Goles: cuántos, de qué tipo y de quién

| Código | Qué pregunta | Umbral vigente | 8.0.0 |
|---|---|---|---|
| 003/SC-001 | ¿Se marcan goles realistas? Media de goles por partido entre dos equipos sintéticos iguales, con algún 0-0, alguna goleada y sin un resultado que se repita demasiado | 2,6–3,4 goles; hay 0-0 y partidos de 6 o más; ningún resultado > 20 % | ✔ 2,66 |
| 001/SC-007 (SC-007) | Lo mismo entre equipos equilibrados (los dos con la misma media), con otro rango | 2,0–3,5 goles; < 2 % con 8 o más | ✔ 2,67; 0,1 % |
| 003/SC-002 | ¿Hay goles de lejos, sin exagerar? Parte de los goles marcados desde fuera del área | 22–28 %; la mayoría a ≤ 25 m; ≤ 0,5 % desde el propio campo | ✔ 25,3 % |
| 003/SC-003 | ¿Hay variedad de goles? Parte de penaltis, cabeza, falta directa y propia puerta | penalti 6–12 %, cabeza 10–18 %, falta 5–10 %, propia 1–4 % (1–3 % hasta el 2026-11-15) | ✔ 7,4 / 16,4 / 6,7 / 2,5 % |
| 003/SC-023 | ¿Marcan los extremos y mediapuntas (ED, EI, MCO) en las formaciones que los usan? | 25–50 % de los goles en 3-4-3, 4-2-3-1 y 4-3-3 | ✔ 29,2 / 36,4 / 28,7 % |
| 015/SC-012 | ¿Marcan también defensas y medios? Su parte de los goles, en 20 equipos de formaciones y tácticas distintas | 15–30 % (15–40 % y un solo equipo hasta el 2026-11-15) | ✔ 26,3 % |

### Un partido normal parece fútbol

| Código | Qué pregunta | Umbral vigente | 8.0.0 |
|---|---|---|---|
| 002/SC-007a | Entre dos equipos igualados con la táctica por defecto, ¿salen estadísticas realistas? Media por partido de los dos equipos juntos. Un **contraataque** es una posesión que empieza en campo propio y acaba en tiro en menos de 150 s de reloj y con 4 pases o menos | ≥ 130 pases completados (150), 9 centros, 14 tiros (15), 30 conducciones, 3 paredes, 4 cambios de orientación (5) y 1,5 contraataques (2, y 1,8 hasta el 2026-11-17); entre paréntesis, los valores anteriores | ✔ 135,6 · 13,8 · 14,6 · 61,5 · 16,9 · 4,3 · 1,7 |
| 002/SC-007b | ¿Se combina? Parte de las posesiones con 3 o más pases seguidos | ≥ 25 % (30 % hasta el 2026-11-14) | ✔ 26,7 % |
| 003/SC-004 | ¿Se abusa del pase largo? | ≤ 15 % de los pases; ≤ 0,5 largos hacia atrás por equipo y partido | ✔ 11,4 %; 0 |
| 003/SC-005 | ¿Se conduce y se pasa en corto? | ≥ 22 conducciones por equipo y partido; ≥ 60 % de los pases de menos de 20 m | ✔ 31,7; 60,5 % |
| 015/SC-013 | ¿Sale el balón del campo con naturalidad? Córners por partido entre equipos equilibrados | 6–9 córners | ✔ 6,63 |

### Las estadísticas de cada jugador se notan

| Código | Qué pregunta | Umbral vigente | 8.0.0 |
|---|---|---|---|
| 015/SC-001 | ¿Cada duelo enfrenta bien las dos stats? Nueve duelos de ejemplo (regate, pase corto, remate y conducción) calculados con la fórmula, sin jugar partidos | cada uno en su rango (p. ej. regate 98 contra quite 90: 44–54 %) | ✔ los nueve |
| 015/SC-002a | Un delantero con 95 de regate frente al mismo con 75: ¿lo intenta y lo consigue más? | ≥ +40 % intentos y ≥ +60 % completados | ✔ +66 % y +88 % |
| 015/SC-002b | El mejor regateador de Core, ¿supera a algún defensor en casi todos sus partidos? | regate o conducción ganados en ≥ 80 % de los partidos (90 % hasta el 2026-11-14) | ✔ Messi, 86,6 % |
| 015/SC-004 | Un delantero con +15 de desmarque, ¿se libra más de su marcador y recibe más pases? ¿Y un marcador con +15 de marcaje lo deja menos libre? | las tres diferencias, significativas | ✔ |
| 015/SC-005 | Un jugador con +15 de técnica, ¿pierde menos balones al controlar con un rival encima? | ≥ 15 % menos de controles perdidos | ✔ −23,3 % |
| 015/SC-006a | ¿Ordena la línea un central líder? En 20 escenarios (formaciones y tácticas), con el resto de la defensa sin liderazgo, un central de 60, 80 y 95 frente a la misma línea sin líder. Se mide la **exposición**: cuántos delanteros deja en juego, en cada segundo en que se defiende, un defensa que se ha quedado por detrás de los demás | bajada de al menos 1,5 % + 0,12 % por punto de liderazgo sobre 49 (60 ⇒ 2,82 %; 80 ⇒ 5,22 %; 95 ⇒ 7,02 %), estimada con los tres niveles juntos (≥ 0,12 % por punto sobre 36,5) y con los tres bajando. Hasta el 2026-11-17: un central de 95 frente a 70, −10 % de habilitaciones | ✔ 0,312 % por punto: −7,6 / −13,5 / −18,2 % |
| 015/SC-006b | ¿Ayuda el portero líder? Calculado sin jugar partidos: una conducción 80 contra 80 de un defensa en su área, con un portero de 95 y con uno de 70. La serie de partidos se informa como dato | el defensa la gana más con el de 95 | ✔ 40,9 % frente a 40,0 % |
| 003/SC-006 | Un titular con +15 en un stat, ¿hace más lo suyo sin volverse previsible? Regate → regates y conducciones; tiro → tiros de fuera; defensa → acciones defensivas; pase → pases que rompen líneas; físico y velocidad → duelos y conducciones largas | +25 %, +25 %, +20 %, +15 %, +15 % y +14,5 % (15 % hasta el 2026-11-14); nunca más del 60 % de esa acción de su equipo | ✔ +80 %, +213 %, +49 %, +28 %, +76 % y +23 % |
| 014/SC-008-regate, -defensa, -velocidad, -portero | Lo mismo con todo el equipo: +15 en un stat, ¿más intentos y más acierto en la acción que gobierna? (velocidad: balones sueltos ganados) | ≥ +10 % en intentos y en acierto; velocidad y portero, solo acierto; velocidad ≥ +8 % (+10 % hasta el 2026-11-17) | ✔ regate +52 / +36 %; defensa +27 / +13 %; velocidad +9,6 %; portero +26 % |
| 002/SC-008 | Con +10 de pase en los medios, ¿se completan más pases? Medido en las formaciones con 3 o más medios | ≥ +10 % (en un 4-4-2 hasta el 2026-11-16) | ✔ +15,3 % |

### La estrategia pesa (y el fútbol sigue siendo incierto)

| Código | Qué pregunta | Umbral vigente | 8.0.0 |
|---|---|---|---|
| 001/SC-004 (SC-004) | El equipo con 5 puntos más de media, ¿gana casi siempre, pero no siempre? | el mejor gana ≥ 60 %; el peor, ≥ 10 % | ✔ 73,9 % y 11,4 % |
| 001/SC-006a (SC-006a) | ¿Se nota la formación? Goles a favor y en contra según lo ofensiva que es | 3-4-3 > 4-4-2 > 5-4-1 | ✔ |
| 001/SC-006b | Presión alta frente a Bloque medio | más recuperaciones en campo rival y más cansancio | ✔ 15,7 frente a 12,4 |
| 001/SC-006c | Catenaccio frente a Bloque medio | menos posesión en campo rival y menos goles en contra | ✔ |
| 001/SC-006d | Línea adelantada | más fueras de juego provocados | ✔ 1,66 frente a 0,70 |
| 001/SC-006e | Contraataque y Juego combinativo | Contraataque, menos posesión; Combinativo, más | ✔ 46,9 / 50,1 / 51,5 % |
| 015/SC-014 | Un 4-4-2 con la táctica Contraataque y juego vertical, ¿contraataca más que con la táctica por defecto? | ≥ +30 % de contraataques (desde el 2026-11-17) | ✔ +39,9 % |
| 015/SC-011 | Juego por las bandas frente a Equilibrado: ¿tocan más el balón laterales y extremos y se centra más? | las dos diferencias, significativas | ✔ |
| 002/SC-011 (SC-011) | Jugar con todos en su posición, ¿gana a jugar con 3 titulares muy fuera de sitio (−40 %)? | gana ≥ 60 % | ✔ 66,4 % |
| 002/SC-011b (SC-011b) | ¿Y con 3 titulares un poco fuera de sitio (−10 %)? | diferencia de goles a favor > 0 | ✔ +0,28 |
| 002/SC-018 | Colocar a mano un delantero más y un defensa menos, ¿marca y recibe más goles? | más goles a favor y en contra que la formación | ✔ |
| 003/SC-009 | Comprobación paraguas: ¿siguen cumpliéndose 001/SC-004 y los criterios de la 002 de esta tabla y de las anteriores (002/SC-007a, b, SC-008, SC-011, SC-011b, SC-018)? | todas en verde | ✔ |

### Reglas del motor: mano a mano, fuera de juego y cansancio

| Código | Qué pregunta | Umbral vigente | 8.0.0 |
|---|---|---|---|
| 014/SC-002 | Solo ante el portero y a distancia de disparo, ¿se tira? | ≥ 80 % acaban en tiro; < 2 % en pase atrás | ✔ 98,8 %; 1,7 % |
| 014/SC-003 | ¿Hay pases de ida y vuelta absurdos entre dos jugadores sin presión? | 0 secuencias | ✔ 0 |
| 014/SC-004 | ¿Hay fueras de juego, en número normal? | 1–6 por partido | ✔ 1,40 |
| 014/SC-004b | ¿La Línea adelantada provoca más? | ≥ +30 % | ✔ +132 % |
| 014/SC-005 | ¿Cada fuera de juego pitado lo es de verdad? | 0 incoherentes | ✔ 0 de 2.362 |
| 014/SC-006 | Sin rasgos, ¿cuánta energía queda al final? | 45–55 % al 90' | ✔ 49 % |
| 014/SC-006b | ¿Y tras una prórroga? | < 40 % | ✔ 0 % |
| 014/SC-006c | En los últimos 10 minutos, ¿el cansado acierta menos pases que un Incansable? | menos | ✔ 82,4 frente a 84,1 % |

### Virtudes y defectos

| Código | Qué pregunta | Umbral vigente | 8.0.0 |
|---|---|---|---|
| 003/SC-007 | ¿Tiene efecto cada virtud en su jugada? | Lanzador de faltas ≥ +30 % de goles de falta; Matador: su conversión en el mano a mano no empeora más de 5 puntos y no marca más de 1,5 goles por partido (desde el 2026-11-15); el resto, diferencia significativa | ✔ |
| 015/SC-003 | Los centrales con Cabeceador, ¿ganan más balones aéreos y marcan más de cabeza? | las dos diferencias, significativas | ✔ aéreos 0,49 → 4,99; goles 0 → 0,164 |
| 001/SC-015 (SC-015) | ¿Robusto evita lesiones? | ≥ 30 % menos | ✔ −43 % |
| 005/SC-005 | De acero, Fair player y De cristal, ¿hacen exactamente lo que dicen? | 0 lesiones; 0 rojas; 100 % de lesiones largas | ✔ |
| 005/SC-011 | Con los rasgos repartidos, ¿salen tarjetas, penaltis y lesiones normales? | por partido, ±20 % de: 4 amarillas, 0,2 rojas, 0,35 penaltis y 0,35 lesiones | ✔ 4,54 / 0,23 / 0,37 / 0,35 |
| 005/FR-051 y FR-051b | ¿El orden de influencia de virtudes y de defectos es coherente? Ningún rasgo con un efecto claramente mayor que otro aparece como menos influyente en la diferencia de goles | ningún par incoherente | ✔ |
| 005/SC-013 | ¿Mandan los stats sobre los rasgos? +5 de media frente a la virtud más fuerte | +5 de media pesa más | ✔ +1,21 frente a +0,28 goles |

**005/SC-004**: cada defecto y cada virtud nueva produce el efecto de su ficha, con la magnitud dentro de ±20 % del
objetivo (p. ej., objetivo 0,5 ⇒ entre 0,4 y 0,6). Todos ✔:

| Rasgo | Qué hace | Objetivo | 8.0.0 |
|---|---|---|---|
| Agresivo | multiplica las rojas directas por falta | ×2 | 1,99 |
| Impulsivo | multiplica las amarillas por falta | ×2 | 1,86 |
| Canchero | multiplica las faltas que comete | ×1,5 | 1,45 |
| Frágil | multiplica las lesiones por minuto jugado | ×3 | 3,15 |
| De cristal | todas sus lesiones son largas | 100 % | 100 % |
| Torpe | multiplica sus autogoles | ×2 | 1,85 |
| Fatigado | empieza a cansarse antes | minuto 46 | 46 |
| Indisciplinado | se cansa más rápido | ×1,5 | 1,51 |
| Polémico | baja la media de su equipo cuando pierde | −5 % | −5 % |
| Rebelde | baja la media de su equipo cuando está en el banquillo | −5 % | −5 % |
| Estrellita | baja su media si no es el mejor del equipo | −10 % | −10 % |
| Provocador | sube la media de los GOAT rivales mientras juega | +1 | +0,99 |
| Chupón | pasa menos frente a sus otras acciones | ×0,5 | 0,56 |
| Mal defensor | hace menos intercepciones y entradas ganadas | ×0,5 | 0,50 |
| Inflexible | más penalización fuera de su posición | +5 puntos | +5 |
| Versátil | menos penalización fuera de su posición | −5 puntos | −5 |
| Revulsivo | sube sus stats al entrar desde el banquillo | +5 % | +5 % |

### Draft, colecciones y tienda (no dependen del motor)

| Código | Qué pregunta | Umbral vigente | 8.0.0 |
|---|---|---|---|
| colecciones/SC-003 (spec 006) | En 100 mesas de draft con colecciones activas, ¿todos los sobres salen del pool y con sus cupos de demarcación y nivel? | 0 fallos | ✔ |
| colecciones/SC-005 (spec 006) | En 1.000 sobres de la tienda, ¿sin repetidas, sin cartas que ya tienes y con el reparto de niveles? | 0 fallos | ✔ |
| rareza/pobre, escaso, moderado, abundante y rico (spec 013, SC-004) | En cada nivel de rareza del draft, ¿cuántas cartas de cada nivel (Superclase, Crack, Legendario, GOAT) recibe cada participante? | a menos del 5 % de la tabla de su FR-012 | ✔ los cinco |

### De la spec 015, fuera de `pnpm balance`

| Código | Qué pregunta | Cómo se comprueba | Estado |
|---|---|---|---|
| 015/SC-007 | ¿Pasan las siete comprobaciones que la 014 dejó pendientes y sale el CI sin lista de pendientes? | `ci.yml` sin `--pendientes` y las siete en verde | ✔ |
| 015/SC-008 | ¿Siguen en verde todas las que pasaban con la 7.0.0? | serie completa, con los umbrales vigentes | ✔ |
| 015/SC-009 | ¿El motor nuevo tarda como mucho un 12 % más que el anterior (10 % hasta el 2026-11-17)? | la 7.0.0 y la 8.0.0 en la misma sesión, y `umbral-motor` | ✔ +5,2–6,2 % |
| 015/SC-010 | ¿La 2D y la simulación rápida dan exactamente el mismo partido? | `huella-015.json` y `equivalencia.test.ts` | ✔ |
