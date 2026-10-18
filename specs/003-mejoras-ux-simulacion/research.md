# Research — Fase 0: Mejoras de interfaz, simulación y experiencia de juego

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Fecha**: 2026-10-19

Cada apartado resuelve una incógnita del *Technical Context* con el formato **Decisión / Razón / Alternativas consideradas**.

- La pila tecnológica no cambia respecto a las specs 001 y 002 (ver [001/research.md](../001-draft-manager-mvp/research.md) y [002/research.md](../002-mejoras-mvp/research.md)).
- Las referencias "002/R4" apuntan a los apartados de esos documentos.

Unidades del campo, las de la capa espacial (002/R3):

- **Largo**: x va de 0 a 10.000 décimas de unidad, y el campo mide 105 m, así que 1 m ≈ 95 décimas.
- **Ancho**: y va de 0 a 6.400.
- **Distancias de referencia**:
  - frontal del área: x ≥ 8.430 en coordenadas del atacante;
  - 11 m ≈ 1.048;
  - 20 m ≈ 1.905;
  - 25 m ≈ 2.381;
  - 35 m ≈ 3.333.

---

## R1. Línea base del motor actual y diagnóstico (US1)

**Medición**: 300 partidos entre dos equipos sintéticos equilibrados de `tools/balance` (táctica por defecto), con el commit `c8a1627` y los parámetros 2.0.0. Script de medición fuera del repositorio.

| Medida | Valor actual | Objetivo 003 |
|---|---|---|
| Goles por partido | **2,91** | 2,6–3,4 (SC-001) ✔ |
| Partidos 0-0 | 3 % | aparecen (SC-001) ✔, pero pocos |
| Resultado más frecuente | 1-2: **20,0 %** | ≤ 20 % (SC-001), en el límite |
| Penaltis / goles | **3,8 %** | 6–12 % (SC-003) ✘ |
| Falta directa / goles | **2,4 %** | 5–10 % (SC-003) ✘ |
| Cabeza / goles | 15,8 % | 10–18 % ✔ |
| Mano a mano / goles | 25,3 % | (no fijado) |
| Tiro lejano / goles | 3,1 % | (dentro de SC-002) |
| Pases / equipo y partido | 91,8 | (SC-004 y SC-005 por longitud: hoy no se mide) |
| Conducciones / equipo y partido | 17,2 | ≥ 22,4, es decir +30 % (SC-005) |
| Coste del motor (tsx, sin fotogramas) | ~68 ms/partido en el script | el `bench` de CI es la referencia |

**Diagnóstico en el código**:

1. **Receptor sin dirección**. [contexto.ts](../../packages/engine/src/acciones/contexto.ts) `receptor()` pondera a todos los compañeros por cercanía a la celda de destino y por holgura, y multiplica por `2^(atraccionPasador·(pase − 70)/10)`. Con `atraccionPasador = 2`, un central con 90 de pase pesa 16 veces más que uno con 70, aunque esté lejos y por detrás.

   Además, un `pase_corto` sin avance busca receptor en la celda actual, sin mirar si está delante o detrás. Así aparece el delantero que devuelve el balón a su central (FR-017).
2. **El pase largo no se justifica**. En [formacionTactica.ts](../../packages/engine/src/modificadores/formacionTactica.ts), `pesosAcciones` da al pase largo un peso fijo por zona (30 / 20 / 10 en las zonas 0 a 2), haya o no un motivo táctico. Su destino es `zona + 2` en un carril al azar.
3. **El tiro se decide por zona lógica, no por posición**. `remate` solo existe en la zona 5 y `tiro_lejano` en las 3 y 4. La zona 5 abarca x ≥ 8.333 en todo el ancho, así que un "remate" puede salir desde la esquina del área a unos 25 m y con poco ángulo.

   La 2D muestra la posición real, y de ahí la percepción de "goles lejanos". La probabilidad de gol no depende de la distancia.
4. **Los stats apenas influyen en la elección**. En [opciones.ts](../../packages/engine/src/acciones/opciones.ts) solo el pase cambia el peso de su acción. El regate, el tiro, la velocidad y el físico solo influyen en el éxito.
5. **Defensa al revés**. `rivalCercano(…, valor)` elige al más débil de los dos defensores más cercanos el 65 % de las veces ("busca el punto débil"). Un defensa con 15 puntos más entra en menos duelos, lo contrario de lo que pide SC-006.
6. **Pocos penaltis y faltas directas**. El penalti solo nace de un regate o una conducción fallidos con falta en la zona 5: 12 % × 1,6 de falta y 30 % de penalti. La falta directa solo se tira en el 55 % de las faltas de las zonas 4 y 5, con `gol.falta = −1,2`.

**Decisión**: el trabajo de la US1 se centra en la selección de acciones, la coherencia espacial del tiro y el balón parado (R3 a R7). La media de goles ya está en el rango y se trata como una restricción que hay que conservar, no como el objetivo principal (R8).

Como la queja de "exceso de goles" de las pruebas con personas viene de partidos con plantillas reales, `balance` añade series con plantillas de la colección Core draftadas por NPC (R8).

**Alternativas consideradas**: bajar las probabilidades base de gol para reducir la media. Se descarta, porque la media ya está en el rango y eso no arregla ni la variedad (SC-003) ni la coherencia visual (SC-002).

## R2. Parámetros 3.0.0 y partidos de la versión 2 (FR-016 a FR-023)

- **Decisión**:
  - Se crea `packages/domain/src/parametros/v3.json` (versión **3.0.0**), con tres secciones nuevas (`decision`, `pases`, `tiro`, ver [data-model.md](./data-model.md) §1), `npc` para los errores (R12) y `draft.margenAnimacionS = 8` (FR-013).
  - `REGISTRO` solo incluye la 3.0.0. Con `versionMayor(version) < 3`, `parametrosPorVersion` lanza `VersionNoSoportada`, igual que hoy con la 1.x.
  - Un partido 2.x terminado muestra su resumen guardado y el aviso «Este partido se jugó con una versión anterior del motor». Los partidos 2.x en juego se terminan antes de desplegar, con el mismo procedimiento que en la spec 002 (002/R12).
- **Razón**: los cambios de esta spec modifican el código del motor, no solo sus magnitudes. Con los mismos parámetros 2.0.0, el motor nuevo daría otro partido. Subir la versión mayor deja claro que la reproducción exacta de los partidos antiguos ya no es posible (001/FR-040).
- **Alternativas consideradas**:
  - Mantener el motor 2 en paralelo para reproducir partidos antiguos: duplica el motor y va contra el Principio V.
  - Versión 2.1.0: daría a entender que los partidos 2.0 se pueden reproducir.

## R3. Receptor por tipo de pase, distancia y dirección (FR-016, FR-017, SC-004, SC-005)

- **Decisión**: un nuevo módulo [receptor.ts](../../packages/engine/src/acciones/receptor.ts) sustituye a `receptor()` en las acciones de pase.
  - **Tipo de pase por distancia real**, desde el portador hasta el compañero candidato:
    - corto, ≤ 20 m (1.905);
    - medio, 20–35 m;
    - largo, > 35 m (3.333).

    El tipo elegido en `pesosConEspacio` (corto, al espacio, largo) restringe las distancias admitidas. Si en ese rango no hay ningún candidato, se usa el rango contiguo.
  - **Dirección**: cada candidato recibe un factor según su avance en x respecto al portador (en coordenadas del atacante):
    - hacia delante: ×1;
    - lateral (|Δx| ≤ 5 m): ×0,8;
    - hacia atrás corto (≤ 15 m): ×0,5;
    - hacia atrás largo: ×0,05.
  - **Último tercio (FR-017)**: con el portador en x ≥ 6.667, un pase hacia atrás de más de 20 m solo es candidato si no hay ninguna otra opción razonable. Se considera que no la hay cuando el portador tiene un rival encima (≤ 6 m) y, a la vez, ningún compañero por delante o a su altura con holgura ≥ 300² en ≤ 20 m, ni ángulo de tiro (R6).
  - **Atracción del pasador**: `atraccionPasador` pasa de 2 a 0,6 y el factor se acota a [0,7, 1,6]. Se conserva 002/SC-008 (los buenos pasadores reciben más balones) sin que un central lejano acapare el juego.
  - **Interceptor en el carril**: un pase fallido lo corta el rival más cercano a la línea pase–receptor, ponderado por `anticipacion` (R9), en lugar del rival más cercano al balón. El cálculo es O(jugadores) y usa enteros: distancia de punto a segmento con `isqrt`.
- **Razón**: el problema del pase hacia atrás es de elección de receptor (R1.1). Filtrar por distancia y dirección reales se corresponde directamente con los criterios de SC-004 y SC-005, que miden la longitud y la dirección de los pases. Además, mantiene la coherencia espacial que exige el Principio V.
- **Alternativas consideradas**:
  - Prohibir sin más los pases hacia atrás en el último tercio: FR-017 permite los cortos, y en un callejón sin salida es lo razonable.
  - Elegir primero el receptor y deducir después el tipo de pase: desequilibraría los pesos de `pesosAcciones`, que ya están calibrados.

## R4. Pase largo solo con motivo táctico (FR-016, SC-004)

- **Decisión**: en `pesosConEspacio`, el peso del `pase_largo` se multiplica por `pases.factorSinMotivo = 0,15` salvo que haya un motivo. Hay cinco motivos, todos evaluados con posiciones reales:
  1. **cambio de orientación**: un compañero en el carril opuesto con holgura ≥ 15 m;
  2. **espalda**: la línea defensiva rival está adelantada (su defensa más retrasado a más de 30 m de su portería) y hay un compañero por delante de ella;
  3. **salida bajo presión**: rival encima y ningún compañero en ≤ 20 m con holgura ≥ 300²;
  4. **despeje**: zona 0 o 1, con rival encima;
  5. **contraataque con espacio**: `balon.transicion` está activo.

  Con motivo, el peso se multiplica por 1,3.

  El destino del pase largo pasa a ser el compañero que cumple ese motivo (R3), no una celda en un carril al azar. Las tácticas (contraataque, juego vertical, catenaccio) siguen multiplicando el peso como hoy, y por eso sus diferencias de 001/SC-006 se conservan.
- **Razón**: FR-016 enumera precisamente estas cinco situaciones. Convertirlas en condiciones booleanas sobre el espacio las hace verificables. SC-004 se cumple porque el pase largo queda reservado a ellas.
- **Alternativas consideradas**: solo bajar los pesos base del pase largo. Seguirían apareciendo pases largos sin sentido, solo que con menos frecuencia, y el contraataque perdería su identidad.

## R5. Conducción cuando hay espacio (FR-016, SC-005)

- **Decisión**:
  - El factor espacial de la conducción deja de ser binario (19 o 6) y pasa a ser proporcional al espacio libre por delante. Ese espacio es la distancia al rival más cercano en un cono de ±30° hacia la portería rival, acotada a 25 m:
    - 6 con < 3 m;
    - 24 con ≥ 15 m;
    - lineal entre medias.
  - La distancia máxima de una conducción (`espacio.conduccionMaxima`, 500) pasa a escalar con la velocidad y el físico del jugador (R9), entre 400 y 800, y nunca supera el espacio libre medido.
  - En las zonas 1 y 2, el peso base de la conducción sube de 25 a 32.
- **Razón**: SC-005 pide un +30 % de conducciones y un ≥ 60 % de pases de menos de 20 m. Que la conducción dependa del espacio real hace que se conduzca más en el campo propio y en el centro (US1, escenario 3) y menos ante una línea cerrada.
- **Alternativas consideradas**: subir solo el peso base. Inflaría las conducciones también en zonas congestionadas, lo que se traduce en más pérdidas y faltas sin sentido.

## R6. Tiro decidido y resuelto con la distancia y el ángulo reales (FR-018, SC-002)

- **Decisión**:
  - **Distancia y ángulo**. Se calculan la distancia `d` del tirador al centro de la portería (en décimas, con `isqrt`) y el ángulo de tiro, como la apertura entre los postes vista desde el tirador, aproximada con enteros a partir del ancho de portería proyectado.
  - **Clasificación del remate**: `area` (dentro del área), `frontal` (fuera del área y ≤ 25 m) y `lejos` (> 25 m). El tipo de tiro deja de depender de la zona lógica:
    - `normal` en el área;
    - `lejano` en la frontal o más lejos;
    - `cabeza`, `manoAMano`, `falta` y `penalti`, como hoy.
  - **Peso de tirar** (`pesosConEspacio`). Hay un único peso de tiro, que sustituye a `remate` y a `tiro_lejano`: `pesoTiro(d, angulo) × factorStat(remate) × factorEspacio`. `pesoTiro` es por tramos y está en `v3.json`, `tiro.pesoPorTramo`:
    - ≤ 11 m: 60;
    - 11–16,5 m: 35;
    - 16,5–25 m: 5;
    - 25–35 m: 1;
    - > 35 m: 0.

    El factor de ángulo baja el peso a la mitad por debajo de 15° y lo anula por debajo de 6°. Por encima de 35 m, solo se tira si el portero rival está a más de 15 m de su línea (US1, escenario 4).
  - **Probabilidad de puerta y de gol**. En la sigmoide de `duelo.probabilidad` se añade un término `−tiro.pendienteDistancia × max(0, d − 11 m)/10 m` y otro de ángulo. La base por tipo (`acciones.puerta` y `acciones.gol`) se recalibra en `balance`.
  - **Registro**. Los eventos `tiro` y `gol` llevan `datos.distancia` (metros enteros) y `datos.zonaRemate` (`area`, `frontal` o `lejos`; contracts/engine-api.md).
- **Razón**:
  - Se corrige la incoherencia espacial (R1.3): lo que se ve en la 2D es exactamente lo que el motor ha usado para decidir.
  - SC-002 exige medir la distancia, y solo puede medirse si el motor la usa y la registra.
  - La frontal tiene su propio tramo para alcanzar alrededor del 25 % de goles fuera del área (22–28 %, SC-002) sin generar tiros desde el centro del campo.
- **Alternativas consideradas**:
  - Mantener las zonas y solo bajar la probabilidad del `tiro_lejano`: no corrige los "remates" de la zona 5 desde la esquina.
  - Un modelo xG continuo con coma flotante: rompe el determinismo entero (002, Constraints).

**Decisión del usuario (2026-10-19)**: el objetivo de SC-002 pasa a ser alrededor del 25 % de goles fuera del área (22–28 %), en lugar del 35–40 % inicial, que se había marcado como riesgo para el realismo (SC-008). El peso inicial de la frontal en `tiro.pesoPorTramo` baja en consecuencia (data-model §1).

## R7. Variedad de goles: penaltis, faltas directas y cabeza (FR-020, SC-003)

- **Decisión**:
  - **Penaltis**, del 3,8 % al 6–12 %:
    - Las faltas en el área pueden nacer de los regates y conducciones fallidos (como hoy) y también de los duelos aéreos de centros y córners (agarrones). Para eso hay un parámetro nuevo, `disciplina.probabilidadFaltaDueloAereoArea`.
    - Una falta en la zona 5 es penalti si el punto de la falta está dentro del área real (x ≥ 8.430 e y entre 1.390 y 5.010). Así se cambia la probabilidad fija de 0,3 por un criterio espacial.
    - Las faltas en el área por regate dependen de `quite` frente a `regate` (R9). Como los buenos regateadores encaran más, también provocan más penaltis.
  - **Faltas directas**, del 2,4 % al 5–10 %:
    - La probabilidad de tirar directo depende de la distancia y el ángulo del punto de la falta: entre 17 y 30 m y con ángulo central, `tiro.faltaDirectaTiro` alta; en otros casos, balón colgado.
    - `acciones.gol.falta` se recalibra.
    - Hay más faltas en la frontal, porque hay más regates y conducciones en la zona 4 (R5 y R9).
    - `LanzadorFaltas` mantiene su bonus `Alto` en el tiro y además sube la probabilidad de elegir el tiro directo. Eso basta para el +30 % de SC-007.
  - **Cabeza**: el 15,8 % ya está en el rango. Se conserva la mecánica de centro y rematador, y se vigila en `balance` que el 10–18 % no se mueva al cambiar los pesos del centro.
- **Razón**: FR-020 pide más goles de estos tipos aumentando las situaciones que los originan, no inventando goles. Con criterios espaciales, la 2D muestra la falta donde realmente se comete.
- **Alternativas consideradas**: subir sin más la probabilidad de penalti por falta en la zona 5. Habría "penaltis" señalados fuera del área real.

## R8. Media y dispersión de goles y orden de calibración (FR-019, FR-023, SC-001, SC-009)

- **Decisión**:
  - **Restricción**: la media de goles por partido de las series de 1.000 partidos (SC-001) tiene que quedar entre 2,6 y 3,4, tanto con equipos sintéticos equilibrados como con la serie Core. El motor no corrige ningún partido concreto (FR-019).
  - **Serie Core** (`tools/balance/src/core.ts`): un torneo simulado de 8 NPC avanzados que draftan con la colección Core y la semilla de la serie, en el que se juegan todos los cruces con sus alineaciones. Se mide la media de goles del torneo y el reparto de resultados. Es la medida más cercana a lo que juzgaron las personas.
  - **Dispersión**: el 1-2 está hoy en el 20 %. No se añade ningún mecanismo de varianza propio. Los cambios de R3 a R7 (más tiros de la frontal y más balón parado, con menor probabilidad de gol por remate) ya reparten los goles en más ocasiones de valor diverso, y eso amplía la dispersión de resultados. Se comprueba con SC-001: ningún resultado concreto por encima del 20 % y presencia de 0-0 y de partidos de 6 o más goles.
  - **Orden de calibración**, para no perseguir varios efectos a la vez:
    1. receptor y pases (R3 y R4);
    2. conducción (R5);
    3. stats y specials en la elección (R9 y R10);
    4. tiro por distancia (R6);
    5. balón parado (R7);
    6. ajuste final de `acciones.gol.*` para la media.

    Después de cada paso, `pnpm balance` vuelve a validar los SC de la 001 y la 002 (FR-023 y SC-009).
- **Razón**: la media ya está en el rango (R1). El riesgo real es desplazarla al cambiar el resto. Un orden fijo hace que cada paso se pueda atribuir y revertir.
- **Alternativas consideradas**: un "factor de forma" por partido en el motor. Se descarta: añadiría azar sin relación con las decisiones (Principio I).

## R9. Peso de los stats en la elección de acciones (FR-021, SC-006)

- **Decisión**:
  - **Factor de stat**. Un factor común: `factorStat(valor, ref, k) = acotar(1 + k·(valor − ref)/10, min, max)`, en milésimas, con `ref = 70`. Los valores de `k`, `min` y `max` de cada acción están en `v3.json`, `decision.factores`:

    | Stat | Acciones a las que afecta | k | Acotación |
    |---|---|---|---|
    | regate | regate y conducción, también con un rival delante | 0,25 | [0,6, 1,6] |
    | remate | tiro en la frontal y más lejos (no en el área) | 0,3 | [0,5, 1,7] |
    | pase | pases | 0,5 (ya existe) | [0,5, 2] |
    | visión | pase al espacio y pases que rompen líneas | 0,25 | [0,6, 1,6] |
    | velocidad y físico | conducción larga en espacio abierto, distancia de conducción (R5), duelos | 0,2 | [0,7, 1,5] |

    Con 15 puntos más de regate, el factor pasa de 1 a 1,375. Así, SC-006 (≥ 25 % más de intentos) se cumple con margen incluso después de normalizar los pesos.
  - **Acotación por situación**: el factor solo multiplica la acción cuando la situación la permite. El regate requiere un rival a ≤ 6 m o espacio a ≤ 15 m; el tiro lejano, ángulo ≥ 15° y nadie a ≤ 3 m en la línea de tiro. Así, el jugador mejorado no concentra más del 60 % de esa acción de su equipo (SC-006).
  - **Defensa**:
    - `rivalCercano` deja de elegir "el más débil de los dos". Entra el más cercano, con un radio de intervención que crece con `quite` y `anticipacion`: +4 % del radio por cada punto sobre 70, acotado a ±40 %.
    - En los pases, el interceptor es el rival mejor situado en el carril (R3), ponderado por `anticipacion`.
    - Las recuperaciones se atribuyen a quien gana el duelo.
- **Razón**: FR-021 pide influencia en la elección, gradual y acotada por la situación. Un factor lineal acotado es fácil de explicar y de probar. Quitar el "busca al más débil" es imprescindible para que un mejor defensa defienda más (R1.5).
- **Alternativas consideradas**:
  - Que el atacante siga buscando al defensor más débil, con menos probabilidad: seguiría penalizando al buen defensa.
  - Factores exponenciales: con stats altos (90+) concentran la acción en un solo jugador, contra la cota del 60 % de SC-006.

## R10. Peso medible de los specials (FR-022, SC-007)

- **Decisión**:
  - **Inventario**: cada special con efecto en el partido ([specials.ts](../../packages/engine/src/modificadores/specials.ts), [tiro.ts](../../packages/engine/src/acciones/tiro.ts) y [juego.ts](../../packages/engine/src/acciones/juego.ts)) tiene una **acción medida** y un **umbral de efecto** en `balance`. Ejemplos:
    - Lanzador de faltas: +30 % de goles de falta directa;
    - Cabeceador: más goles de cabeza del jugador;
    - Desbordante: más regates ganados por banda;
    - Muro defensivo: menos tiros a puerta en contra desde la frontal.
  - **Efectos que se refuerzan**: los specials que hoy solo ajustan la probabilidad de éxito, y cuyo efecto queda por debajo del umbral, también ajustan la elección:
    - Desbordante: regate por banda ×1,3;
    - Llegador: el centrocampista se suma al área en los centros;
    - Lanzador de faltas: más tiro directo (R7);
    - Matador: tiro en vez de pase en un mano a mano.
  - **Tabla de umbrales**: SC-007 queda como una comprobación por special en `checks/partido.ts`, con la tabla de umbrales en el propio check.
- **Razón**: SC-007 pide una diferencia medible para cada special con efecto. Medir special por special con el mismo equipo, con y sin él, aísla el efecto del de los stats y la táctica.
- **Alternativas consideradas**: medir solo los specials de remate. Así no se comprueba "cada special con efecto en el partido".

## R11. Métricas de equilibrado y registro de los goles (SC-001 a SC-007)

- **Decisión**:
  - **Estadísticas de equipo nuevas** (persistidas, data-model §7.2):
    - `pasesCortos` (< 20 m), `pasesLargos` (> 35 m) y `pasesLargosAtras` (desde el último tercio rival hacia el campo propio, > 35 m);
    - `tirosArea`, `tirosFrontal` y `tirosLejos`;
    - `golesPorTipo` y `golesPorZona`.
  - **Métricas por jugador** (`MetricasJugador`: regates, conducciones, tiros por zona, intercepciones, entradas ganadas y recuperaciones). Solo se calculan con `avanzar(…, { metricas: true })`, solo las usa `balance` y no se guardan. No consumen números del PRNG, así que no cambian el partido (invariante 10).
  - **Eventos**: `gol` y `tiro` llevan `distancia` y `zonaRemate`. `gol.datos.tipo` conserva los valores de `TipoTiro`. En la interfaz y en las métricas se agrupan como jugada (normal, lejano, manoAMano), cabeza, falta directa y penalti. El motor genera goles en propia puerta (`tipo = 'propia'`) en dos situaciones: el despeje de un centro o de un córner dentro del área, con una probabilidad que baja con la `defensa` del defensor, y el desvío de un tiro por un defensor (`tiro.autogol`). Son entre el 1 % y el 3 % de los goles (SC-003); el autor es el defensor, el gol suma al rival y no cuenta para goleadores ni asistentes. En las métricas se agrupan aparte (`golesPorTipo.propia`).
- **Razón**: SC-002 a SC-007 necesitan medidas por distancia, por tipo y por jugador que hoy no existen. Separar las métricas por jugador evita que crezca el JSON de cada partido guardado.
- **Alternativas consideradas**: reconstruir las métricas a partir de los fotogramas. Es costoso y depende de la presentación (Principio IV).

## R12. Dificultad de los NPC por calidad de decisión (FR-036 a FR-038, SC-010, SC-010a, SC-010b)

**Observación**: hoy los cuatro niveles usan `autoAlineacion`, que da la alineación óptima para cualquier formación. El amateur solo es peor en el draft (ruido ±8 y sin cobertura) y en la formación (50 % de despiste entre las básicas). Por eso la preparación del amateur es casi tan buena como la del PRO, lo que explica que cueste ganarle (US9).

- **Decisión**:
  - **Perfil de errores**: `PerfilNPC.errores` define, por nivel y por familia de error, una probabilidad (en milésimas) y un coste máximo (data-model §6). Las familias son:

    | Familia | Ejemplos de error creíble (FR-037a) |
    |---|---|
    | draft | elegir una carta de más media que no encaja; ignorar la falta de portero hasta tarde |
    | alineación | dejar en el banquillo a un jugador mejor de la misma demarcación |
    | colocación | colocar a un titular en una posición contigua fuera de la suya |
    | formación | elegir una formación básica que encaja peor |
    | táctica | presión alta contra un rival más rápido; catenaccio siendo mejor |
    | lanzadores | lanzador de penaltis con peor remate |
    | partido | cambio tardío por cansancio; no reaccionar al marcador; cambio de táctica contraproducente |

  - **Valores iniciales** (se calibran con R13):

    | Nivel | Probabilidad de error por decisión | Coste máximo de cada error |
    |---|---|---|
    | amateur | 350 | 6 puntos de fuerza de alineación |
    | intermedio | 200 | 4 puntos |
    | avanzado | 80 | 2 puntos |
    | PRO | 25 | 1,5 puntos |

    El PRO tiene además **una decisión dudosa obligatoria por draft** (FR-037b, SC-010b): en un turno al azar elige la segunda mejor carta si su valor está a ≤ 1,5 puntos de la mejor.
  - **Guardarraíl** ([errores.ts](../../packages/ai/src/errores.ts)): un error solo se aplica si la alineación resultante es válida (001/FR-057) y no es absurda. Cuenta como absurdo:
    - un portero fuera de la portería, o un jugador de campo en ella;
    - un cruce de demarcación con penalización > 0,2 (`v3.json`, `penalizacionPosicion`);
    - un coste de fuerza superior al máximo del nivel.

    fast-check prueba que ninguna combinación genera un error absurdo (SC-010b).
  - **Pureza**: los errores se aplican con el PRNG con semilla de la decisión (reproducibles). Se aplican solo en `@fbd/ai`, nunca en el motor. El motor no recibe el nivel (SC-010a).
  - **Decisiones automáticas de un humano ausente** (`asincrono.nivelDecisiones`): se cambian a un perfil `automatico`, el avanzado sin errores. Así un humano no sufre los errores pensados para los NPC.
- **Razón**: FR-037 exige que la dificultad salga solo de la calidad de las decisiones. Un catálogo de errores con coste acotado es explícito, se puede probar (Principio III) y permite cumplir a la vez SC-010 (orden de niveles) y SC-010b (errores creíbles, nunca absurdos).
- **Alternativas consideradas**:
  - Más ruido en el evaluador: no controla la gravedad y puede producir errores absurdos.
  - Peores cartas o stats para los NPC: va contra FR-037 y el Principio VI.
  - Porcentajes de victoria por nivel: prohibidos por FR-037.

## R13. Participante de referencia y comprobación de SC-010

- **Decisión**:
  - **Participante de referencia** (`tools/balance/src/referencia.ts`). No es un nivel de NPC del juego (Assumptions). Su comportamiento:
    - draft: la mejor carta disponible que encaja en su plantilla, con el evaluador sin ruido, pesos `{ media: 1, cobertura: 4, porteros: 6 }` y sin anticipación;
    - formación: la estándar que mejor encaja, 4-4-2 o 4-3-3, con `autoAlineacion`;
    - táctica: la por defecto;
    - ningún cambio en el partido.
  - **Check `SC-010`**: por cada nivel, T torneos de liga de 8, con el participante de referencia y 7 NPC de ese nivel. Se mide el porcentaje de partidos que gana el de referencia. Para pasar:
    - contra amateur y contra intermedio, victorias > derrotas;
    - de amateur a PRO, las victorias bajan de forma estrictamente ordenada (con 2 errores estándar);
    - contra PRO, ≥ 10 %.
  - **Línea base**: el mismo check se ejecuta una vez con el commit `c8a1627` (primera tarea de la US9) para fijar la referencia de SC-010: contra amateur e intermedio, el porcentaje de victorias debe superarla en al menos 15 puntos porcentuales.
  - **Check `SC-010a`**: 1.000 partidos con las mismas entradas del motor y las mismas semillas, en los que cada lado se marca como humano o como NPC de cada nivel. Los resultados tienen que ser idénticos. Se comprueba sin decisiones durante el partido, porque las decisiones sí dependen del nivel.
  - **`SC-010b`**: el check guarda 20 drafts y preparaciones por nivel en `tools/balance/salida/npc-revision/`, para la revisión manual. Además, cuenta automáticamente los errores aplicados por familia y nivel, y comprueba que bajan de amateur a PRO y que el PRO tiene al menos una decisión dudosa en la mayoría de los drafts.
- **Razón**: SC-010 se mide contra un jugador medio. Hace falta un comportamiento fijo y explícito que no evolucione con los perfiles de los NPC.
- **Alternativas consideradas**: medir NPC contra NPC (el actual 001/SC-010). No refleja la experiencia de un humano medio.

## R14. «Formación» con un único campo (FR-001 a FR-003, FR-002a)

- **Decisión**:
  - **Componente `CampoEquipo`**. Sustituye a `CampoAlineacion` y a `CampoTacticas`.
    - **Modelo de estado**: `formacion`, `asignacion` (casilla → jugador), `puntos` (colocación libre, solo de los recolocados) y `banquillo`.
    - **Gestos, con Pointer Events y sin librería**:
      - soltar un titular en una zona libre: recoloca (`puntos[id]`, acotado como hoy con `acotar`);
      - soltar sobre otro titular: intercambia sus casillas y sus puntos;
      - soltar un suplente sobre un titular: intercambio con el banquillo;
      - soltar fuera del campo y del banquillo: no cambia nada.

      Se considera "encima" con una distancia ≤ radio de la ficha. "Muy cerca" ocupa el punto libre más cercano a ≥ `colocacion.separacionMinima`.
    - **Teclado**: seleccionar con Enter y mover con las flechas, como hoy en `CampoTacticas`.
    - **Cálculo**: la posición efectiva, la penalización y los stats efectivos se recalculan en el cliente con `calcularColocacion` y `previsualizar` del dominio en cada `pointerup`.
  - **Cambio de formación (FR-002a)**: si `Object.keys(puntos).length > 0`, se abre un diálogo de confirmación. Al aceptar, se vacía `puntos` y los titulares se reasignan a las casillas de la nueva formación, conservando a los 11 con la asignación por demarcación de `autoAlineacion` restringida a esos 11. Si no hay recolocaciones, el cambio se aplica sin aviso.
  - **Validación**: el servidor sigue validando como en 002/FR-034a. Mientras la alineación no es válida, el botón «Confirmar alineación» está desactivado y explica el motivo (FR-007).
- **Razón**: un único modelo y un único componente evitan la desincronización entre los dos campos, que era el fallo de la 002. Además, `GestionEquipo` reutiliza el mismo componente (FR-028).
- **Alternativas consideradas**: arreglar el segundo campo. La spec lo descarta (FR-001).

## R15. Vista ampliada de la carta (FR-004, FR-005, SC-015)

- **Decisión**:
  - **Componente `VistaCarta`**: una carta completa (`CartaJugador`) en un elemento con `popover="manual"` (en la capa superior, sin problemas de z-index).
  - **Cuándo se muestra**:
    - con ratón: `pointerenter` con un retardo de intención de 150 ms, y se oculta al instante en `pointerleave`;
    - en táctil: pulsación mantenida de 400 ms sin moverse más de 8 px, y se oculta al soltar;
    - nunca durante un arrastre: `CampoEquipo` expone su estado `arrastrando`.
  - **Posición**: se calcula en JS con `getBoundingClientRect`. Se prueban por orden derecha, izquierda, arriba y abajo de la ficha. Se elige el primer lado en el que la carta cabe entera y no tapa la ficha, y se acota al viewport con un margen de 8 px.
  - **Carga**: las cartas de la plantilla ya están en el cliente, así que mostrarla no requiere ninguna petición.
- **Razón**: el posicionamiento ancla de CSS no tiene todavía un soporte uniforme. El cálculo manual garantiza el 100 % de SC-015 (carta entera en pantalla) y se prueba en Playwright en las cuatro esquinas.
- **Alternativas consideradas**:
  - `title` o tooltip nativo: no muestra la carta.
  - Una librería de popovers: una dependencia nueva para un solo caso.

## R16. Botón principal fijo y común (FR-006, FR-007, SC-013)

- **Decisión**:
  - **Componente `BarraPrincipal`**: una barra `position: sticky; bottom: 0` dentro del contenedor desplazable del `Marco`, con `padding-bottom: env(safe-area-inset-bottom)`.
    - Contiene un único botón principal y, a la izquierda, como mucho un texto de estado o el motivo de desactivado.
    - El contenido de la pantalla tiene un `padding-bottom` igual a la altura de la barra, así que nunca queda tapado de forma permanente (Edge Case de pantallas bajas).
  - **Estilo único**: tokens `--boton-principal-*` en `base.css`, con un mínimo de 48 px de alto, contraste ≥ 4,5:1 y color de acento exclusivo.
    - Los botones secundarios usan `.secundario`, con borde y sin relleno.
    - Desactivado: opacidad 0,55 y `aria-disabled="true"`, para que siga siendo enfocable y el lector de pantalla anuncie el motivo (`aria-describedby`).
  - **`BotonAvanzar`**: se mantiene su lógica (una petición a la vez, `requestId`) y se monta siempre dentro de la `BarraPrincipal`.
  - **Pantallas con botón principal**: preparación, «Formación», partido (rápido y 2D), descanso, resultado, jornada, derrota, campeón y draft (fin).
  - **Prueba**: un test de Playwright recorre esas pantallas a 1366 × 768 y a 360 × 640, y comprueba que el botón principal está en el viewport antes y después de hacer scroll hasta el final.
- **Razón**: `sticky` dentro del contenedor del `Marco` funciona igual en escritorio y en móvil, y no interfiere con la barra de navegación superior de la 002. Tener un solo componente garantiza el estilo común que pide FR-007.
- **Alternativas consideradas**:
  - `position: fixed` sobre todo el documento: entra en conflicto con el teclado virtual en móvil y con el modo compacto de la 2D.
  - Mover los botones arriba: en móvil quedan lejos del pulgar.

## R17. Gestión del equipo durante el partido (FR-027 a FR-031, SC-016)

- **Decisión**:
  - **Pantalla `GestionEquipo`**: un modal a pantalla completa sobre la pantalla del partido, con `CampoEquipo` en modo "partido". En ese modo:
    - los jugadores ya sustituidos o expulsados no se pueden arrastrar;
    - cada ficha muestra sus tarjetas, lesión y cansancio;
    - el contador de sustituciones restantes es visible;
    - los paneles de táctica y de lanzadores son los mismos de «Formación».

    Cerrar sin confirmar descarta los cambios, con un aviso si los había.
  - **Estado del equipo derivado en el cliente**. El cliente lo reconstruye a partir de lo que ya ha visto:
    - `partido.inicio.alineaciones` del propio equipo, que se amplían con la casilla, el ancla y los lanzadores (contracts/realtime-protocol.md);
    - los eventos reproducidos hasta el tick actual (sustitución, roja, lesión, amarilla);
    - las `partido.decision_aplicada` propias.

    En la 2D, el servidor va hasta 60 ticks por delante (002/R6). Pedir el estado al servidor podría revelar una tarjeta o una lesión futuras, y derivarlo en el cliente lo evita. La reducción de eventos (`estadoJugadores`) ya existe en `PanelCambios` y se traslada al dominio del cliente.
  - **Lote atómico** `partido.decisiones` (contracts/realtime-protocol.md):
    - al confirmar, el cliente envía la lista ordenada de decisiones (sustitución, recolocación o formación con asignación y colocación, táctica y lanzadores);
    - el servidor las valida en orden sobre una copia del estado del motor, con `validarDecision`; si alguna falla, no aplica ninguna y responde con el índice y el motivo;
    - si todas son válidas, las aplica con `aplicarDecision` en el mismo orden.

    Las decisiones aplicadas son exactamente las mismas que se habrían enviado una a una con los selectores, así que el partido resultante es idéntico (FR-030). Una prueba de equivalencia lo comprueba.
  - **Cuándo se puede abrir**:
    - en la rápida, solo en el descanso y antes de la prórroga, como hoy;
    - en la 2D, en cualquier momento (FR-031). Al abrirla, el reloj de reproducción del cliente se pausa: deja de enviar `partido.reproduccion`, así que el búfer del servidor no avanza más allá de sus 60 ticks. Al volver, se reanuda.

    Las decisiones confirmadas con el balón en juego se aplican en la siguiente interrupción, con el límite de 1 minuto de 002/FR-025a.
- **Razón**: derivar el estado en el cliente cumple el Principio VI (no adelantar información) sin estado nuevo en el servidor. El lote atómico evita estados intermedios inválidos, por ejemplo una formación aplicada sin la sustitución que la hacía válida.
- **Alternativas consideradas**:
  - Una instantánea del motor desde el servidor: revela el futuro en la 2D.
  - Enviar las decisiones una a una: deja estados intermedios y obliga a deshacer si falla la tercera.

## R18. Pantalla de resultado al finalizar (FR-024 a FR-026, SC-017)

- **Decisión**:
  - **Componente `ResultadoPartido`**: se extrae del resumen final de `PartidoRapido`. Muestra el marcador (con prórroga y penaltis), los eventos relevantes con su minuto, las estadísticas (`Estadisticas`) y el botón principal «Siguiente».
  - **Partido2D**: al recibir `partido.fin` tras «Finalizar partido», desmonta el lienzo y monta `ResultadoPartido` con el mismo `partido.fin`.
  - **Cálculo del resto**: no cambia (`procesarFinalizar` y `resolverResto`, 002/R7).
- **Razón**: un único componente garantiza el "mismo formato y la misma información" de FR-024 y US6, escenario 2.
- **Alternativas consideradas**: superponer el resultado al campo congelado. La spec pide salir del campo.

## R19. Modo de simulación por partido (FR-032 a FR-035, SC-018)

- **Decisión**:
  - **Selector**: `SelectorModo` en la tarjeta de preparación (`AvisoPartido`), junto al botón principal. Se preselecciona con `participantes.ultima_modalidad`; si no hay, con `perfiles_usuario.ultima_modalidad` del usuario registrado, y si tampoco, con `rapida` (FR-032).
  - **Petición**: `POST /api/partidos/:id/abrir` con el cuerpo `{ modalidad: 'rapida' | '2d' }`. El servidor:
    1. guarda `participantes.ultima_modalidad = modalidad`, `perfiles_usuario.ultima_modalidad = modalidad` (solo usuarios registrados) y `partidos.modalidades[participanteId] = modalidad` (data-model §5 y §7.1);
    2. si es contra un NPC, inicia el partido. Con `2d` usa el camino del búfer de anticipación (`avanzar2D`); con `rapida`, `jugarTramo('parte')`. Se sustituyen las lecturas actuales de `c.partida.tipoSimulacion` por `modalidadDe(partido, participanteHumano)`;
    3. si es contra un humano, lo resuelve como hoy y devuelve `reproduccion`. El cliente pide `GET /api/partidos/:id/reproduccion?modalidad=…`, y la caché LRU se indexa por `partidoId:modalidad`.
  - **Bloqueo**: un `abrir` repetido de un partido ya empezado devuelve el modo con el que se abrió (`partidos.modalidades`) y no lo cambia (FR-035). «Finalizar partido» sigue disponible.
  - **Presentación**: `partido.inicio.modalidad` es la del participante que recibe el mensaje. El `Marco` usa la modalidad del partido en curso para el modo compacto.
  - **Creación de la partida**: se elimina `tipoSimulacion` de `ConfigPartida`, del esquema HTTP y de `CrearPartida`. Zod ignora las claves desconocidas, así que los clientes antiguos no fallan (FR-034).
  - **Migración**: `participantes.ultima_modalidad` se rellena con el `partidas.tipo_simulacion` de la partida, solo para los humanos (Assumption de partidas ya creadas). Después se elimina la columna.
- **Razón**: el modo no afecta al cálculo (Principio V), así que basta con decidirlo al abrir. `abrir` ya es el punto único e idempotente en el que empieza un partido (002/R8).
- **Alternativas consideradas**:
  - Modo por jornada: más grueso de lo que pide la spec.
  - Un mensaje WS aparte para elegir el modo: añade una carrera entre la elección y la apertura.

## R20. Diseño de las cartas (FR-008 a FR-010, SC-012)

- **Decisión**:
  - **Disposición**: se mantiene la de 002/FR-001.
  - **Marco propio**:
    - forma de escudo con las esquinas superiores achaflanadas;
    - franja diagonal con el color del nivel;
    - textura de grano en CSS (`repeating-linear-gradient`);
    - brillo animado solo en Legendario y GOAT, desactivado con movimiento reducido.
  - **Tipografía**:
    - **Barlow Condensed** (OFL), servida desde `public/fuentes/` con su LICENCIA, para la media, el nombre y los stats;
    - el texto de los specials, con la fuente base de la interfaz.
  - **Legibilidad (FR-009)**:
    - en la carta completa de portátil, el texto de los stats y de los specials es ≥ `1rem`, el tamaño del texto base;
    - el valor del stat va en negrita a 1,25 veces el tamaño de su abreviatura;
    - en la carta completa de móvil (360 px), ≥ `0,875rem`;
    - los 4 specials de un GOAT caben en dos columnas, sin desplazamiento interno (002/FR-003).

    Un test de Playwright mide `getComputedStyle().fontSize` y el desbordamiento.
  - **Sin elementos de marca**: ni el marco, ni el logotipo, ni la tipografía de EA SPORTS FC (FR-008). Se revisa en la checklist de cierre.
- **Razón**: una fuente condensada permite agrandar los números sin aumentar el tamaño de la carta. La comprobación automática del tamaño de letra sirve de apoyo a SC-012.
- **Alternativas consideradas**: una tipografía de Google Fonts por CDN. El cliente ya no depende de CDN y la beta puede funcionar sin acceso externo.

## R21. Apertura de sobres y sonido (FR-011 a FR-015, SC-019)

- **Decisión**:
  - **Secuencia** (≤ 8 s en total, parámetros en `AperturaSobre`):

    | Fase | Duración |
    |---|---|
    | sobre (brillo, temblor y rasgado con partículas) | 1.400 ms |
    | salida escalonada de las 8 cartas boca abajo hasta su sitio en la mesa | 8 × 250 ms |
    | giro de cada carta, mostrando la **carta completa** | 8 × 300 ms, solapado |
    | pausa extra para Legendario y GOAT, con destello y partículas de su color | 600 ms cada una |
    | fundido | 300 ms |

    El peor caso es un sobre con 2 especiales: unos 7,1 s.
  - **Partículas**: `particulas.ts`, en Canvas 2D sobre la mesa. Tiene un presupuesto de 6 ms por fotograma, medido con `performance.now()`. Si un fotograma lo supera, el número de partículas se reduce a la mitad. Por debajo de 30 fps durante 500 ms, se desactivan. La aparición de las cartas no depende nunca de las partículas (Edge Case).
  - **Salto**: un clic o un toque en cualquier punto revela todas las cartas colocadas, como hoy.
  - **Movimiento reducido**: fundido simple, sin partículas ni giros.
  - **Margen**: `draft.margenAnimacionS` pasa de 6 a 8 en `v3.json`, y el primer turno de cada sobre añade ese margen (002/FR-008).
  - **Sonido**: se sustituye `rasgado.wav` por un efecto **sintetizado** con Web Audio en `sonido.ts`:
    - ruido rosa filtrado paso bajo a 1,2 kHz, con una envolvente de 350 ms;
    - un acorde suave de dos senos (A3 y E4) con un ataque de 30 ms y una caída de 600 ms;
    - ganancia 0,25 frente al 0,6 del resto de sonidos.

    El efecto de las cartas especiales (`revelacion.wav`) se mantiene, con su ganancia bajada al 0,4. Se respeta `localStorage['fbd.sonido']`.
- **Razón**: la carta completa que gira es lo que pide FR-012. Un efecto sintetizado no tiene licencia que gestionar, ocupa unos pocos bytes y se ajusta para que no sea estridente (FR-014). El presupuesto de partículas cubre el Edge Case de los dispositivos con poca potencia.
- **Alternativas consideradas**:
  - Una librería de partículas: una dependencia nueva.
  - Otro fichero CC0: hay que buscarlo y licenciarlo, y es más difícil de ajustar.

## R22. Eliminación, campeón y simular el resto del torneo (FR-039 a FR-041b, SC-020, SC-020a)

- **Decisión**:
  - **Eliminaciones derivadas** ([eliminaciones.ts](../../packages/domain/src/torneo/eliminaciones.ts), una función pura sobre `EstadoTorneo`):
    - quien pierde un cruce del cuadro queda eliminado con la fase de esa ronda (`octavos`, `cuartos`, `semifinal` o `final`);
    - en un mixto, al cerrarse la liga, los no clasificados quedan eliminados con la fase `liga`;
    - en una liga pura, nunca hay eliminación.

    Las etiquetas visibles («Fase de liga», «Octavos de final», «Cuartos de final», «Semifinales», «Final») son las que ya usa el torneo.
  - **Humanos en competición**: `humanosEnCompeticion(t, participantes)` devuelve los humanos activos (no sustituidos por un NPC) que no están eliminados y cuyo torneo no ha terminado.
  - **Vista del torneo** (`torneo.actualizado` y `GET /torneo`): añade, por participante, `miEliminacion: { fase } | null`, `campeon: { id, nombre } | null`, `puedeSimularResto: boolean` y si ya ha visto cada pantalla.

    Las pantallas se muestran cuando la vista lo indica y `derrota_vista_en` o `campeon_visto_en` son nulos. `POST /api/partidas/:id/pantalla-vista` las marca (FR-041).

    La pantalla de derrota con «Simular resto del torneo» se sigue mostrando mientras `puedeSimularResto` sea cierto, aunque ya se haya visto (Edge Case de quien sale sin simular).
  - **`POST /api/partidas/:id/simular-resto`** (idempotente con `Idempotency-Key`):
    - si `humanosEnCompeticion` está vacío y el torneo no ha terminado, el actor ejecuta en un solo comando un bucle con `abrirSiguienteJornada` y `resolverPartidosSinHumanos` hasta que haya campeón;
    - las emisiones intermedias de `torneo.actualizado` se suprimen y se emite una sola vez al final;
    - en otro caso, responde 409 `HAY_HUMANOS_EN_COMPETICION`.

    Los partidos se registran como cualquier otro (FR-041b). Con varios humanos, todos eliminados o sustituidos, `abrirSiguienteJornada` no programa plazos (Edge Case).
  - **Rendimiento (SC-020a)**: el peor caso es un playoff de 16 con caída en octavos, con 7 partidos pendientes. Supone 7 resoluciones de unos 25 ms y unas 4 escrituras por partido en una sola transacción por jornada, con un objetivo de < 1,5 s en el servidor. Hay una prueba de integración con un límite de 5 s de extremo a extremo.
  - **Imágenes de derrota y de campeón**: ilustraciones SVG propias, en línea en los componentes, con animación CSS que se desactiva con movimiento reducido.
- **Razón**: derivar las eliminaciones evita un estado más que mantener coherente. Reutilizar `abrirSiguienteJornada` asegura las mismas reglas que si se jugara jornada a jornada (FR-041a y Principio V).
- **Alternativas consideradas**:
  - Guardar las eliminaciones como filas: se duplica la información del cuadro.
  - Simular el resto en segundo plano jornada a jornada: más lento, y el participante tendría que esperar sin ninguna información.

## R23. Nombre del equipo y perfil de la cuenta (FR-042 a FR-044, SC-021)

- **Decisión**:
  - **Dominio** ([nombreEquipo.ts](../../packages/domain/src/equipo/nombreEquipo.ts)):
    - `normalizarNombre` recorta los espacios del principio y del final y colapsa los espacios internos;
    - `validarNombre` exige 3–24 caracteres tras normalizar y unicidad sin distinguir mayúsculas en la partida;
    - `nombrePorDefecto(apodo, usados)` devuelve "Equipo de {apodo}", recortado a 24 caracteres y con un sufijo numérico si está ocupado.
  - **Persistencia**:
    - `participantes.nombre_equipo` ya existe y sigue siendo obligatorio;
    - se añade un índice único `(partida_id, lower(nombre_equipo))`. La migración deshace primero los duplicados que existan añadiendo un sufijo;
    - la tabla `perfiles_usuario (usuario_id PK, ultima_modalidad, actualizado_en)` se crea en la migración `0006` (US3, R19), y la `0008` le añade `nombre_equipo` y `equipaciones jsonb` (data-model §5 y §9). Es independiente de la tabla `usuarios` de better-auth.
  - **Flujo**:
    1. al unirse a una partida (`unirse`), un usuario registrado con perfil recibe el nombre y las equipaciones del perfil. Si el nombre está ocupado, recibe el nombre por defecto y la sala le indica que elija otro (FR-042b y FR-043);
    2. un invitado recibe el nombre por defecto;
    3. `PUT /api/partidas/:id/nombre-equipo` lo cambia hasta que se abre el primer partido del torneo (409 `TORNEO_INICIADO` después). No cambia el perfil.
  - **Perfil**: `GET/PUT /api/perfil`, solo para usuarios registrados (403 para invitados).
  - **Visualización**: todas las vistas usan ya `nombreDe(participante)`. Se comprueba que la lista de FR-044 lo usa, y la pantalla del draft añade los nombres a la lista de asientos.
- **Razón**: el nombre ya es obligatorio en el esquema. Lo que falta es poder editarlo, validarlo y proponerlo desde la cuenta. Una tabla de perfil separada no toca la tabla de autenticación.
- **Alternativas consideradas**: columnas nuevas en `usuarios`. Acopla el esquema a better-auth y complica sus migraciones.

## R24. Equipaciones con diseño y hasta 3 colores (FR-045 a FR-047, SC-022)

- **Decisión**:
  - **Modelo** (data-model §4): `Equipacion = { diseno: 'lisa' | 'rayas' | 'franjas' | 'banda' | 'mitades', colores: [c1, c2?, c3?] }`.
    - `c1` es el principal. El color del dorsal se calcula con `colorDeContraste(c1)`.
    - Cada diseño tiene un reparto de superficie por color, con el que se miden los parecidos:

      | Diseño | c1 | c2 | c3 (detalles) |
      |---|---|---|---|
      | lisa | 0,9 | 0,1 | — |
      | rayas | 0,5 | 0,4 | 0,1 |
      | franjas | 0,5 | 0,4 | 0,1 |
      | banda | 0,75 | 0,2 | 0,05 |
      | mitades | 0,5 | 0,45 | 0,05 |

      Si falta un color, su peso se suma a c1.
  - **Parecido (FR-047)**: `parecido(A, B) = Σᵢ Σⱼ wAᵢ·wBⱼ·[distanciaColor(cAᵢ, cBⱼ) < umbralDistanciaColor]`. Dos equipaciones chocan si `parecido ≥ 0,45`.
    - En `equipacionEnPartido`, el visitante usa la segunda si la primera choca.
    - Si las dos chocan, se genera una equipación lisa con el color de `PALETA` más alejado de todos los colores del local, y su contraste.

    La función es pura y determinista.
  - **Conversión v1 → v2**: `{ principal, secundario }` pasa a `{ diseno: 'lisa', colores: [principal, secundario] }`. Lo hacen la migración y `desdeV1()` en el dominio, para cualquier JSON antiguo leído.
  - **Representación**:
    - `Camiseta.tsx` dibuja un SVG del diseño, usado en el editor, la preparación y el resultado;
    - en la 2D, la chapa es un círculo con c1 y el patrón del diseño recortado dentro, borde de contraste y dorsal (FR-046).

    El editor y la 2D comparten la función `patronDiseno(diseno, colores)`, que devuelve las franjas o regiones. Así coinciden siempre (SC-022).
  - **Validación**: colores `#rrggbb`, 1–3 colores y diseño conocido. La primera y la segunda equipación no pueden chocar entre sí, una regla nueva que sustituye a "principales distintos".
- **Razón**: medir el parecido con pesos de superficie tiene en cuenta todos los colores, como pide FR-047, y sigue siendo una fórmula explícita y que se puede probar. Una sola función de patrón asegura que la vista previa y el partido coinciden.
- **Alternativas consideradas**:
  - Comparar solo los colores principales: no cumple FR-047.
  - Comparar con métricas perceptuales (CIEDE2000): más preciso, pero más complejo. Se puede cambiar más adelante sin tocar el contrato.

## R25. Verificación de los criterios de éxito

| SC | Cómo se comprueba |
|---|---|
| SC-001 | `balance`: series de 1.000 partidos con equipos sintéticos y serie Core (media, ≥ 90 % de torneos Core con media en rango, 0-0, ≥ 6 goles, resultado más frecuente ≤ 20 %) |
| SC-002 | `balance`: `golesPorZona` y la distancia de los eventos de gol |
| SC-003 | `balance`: `golesPorTipo` (incluido `propia`, 1–3 %) |
| SC-004 | `balance`: `pasesLargos / pases`, `pasesLargosAtras` por equipo |
| SC-005 | `balance`: conducciones frente a la línea base (R1: 17,2) y `pasesCortos / pases` |
| SC-006 | `balance`: `MetricasJugador` con y sin +15 en un stat, y la cuota del jugador ≤ 60 % |
| SC-007 | `balance`: tabla de umbrales por special (R10) |
| SC-008 | prueba con ≥ 5 personas: 2 minutos de la 2D de `c8a1627` y 2 minutos de la nueva, con los escenarios fijos de `tools/fixtures` |
| SC-009 | `balance` (001/SC-004 y SC-008) más `equivalencia.test.ts` del motor |
| SC-010, SC-010a, SC-010b | `balance --torneos`, con el participante de referencia (R13), y revisión de los 20 drafts guardados |
| SC-011 | prueba con ≥ 5 personas contra NPC amateur |
| SC-012 | prueba con ≥ 5 personas, apoyada en el test de tamaño de letra (R20) |
| SC-013 | Playwright a 1366 × 768 y 360 × 640, más prueba con ≥ 5 personas |
| SC-014, SC-016 | prueba con ≥ 5 personas, con quickstart C y E |
| SC-015 | Playwright: tiempo hasta la carta visible (con el retardo de 150 ms) y carta dentro del viewport en las cuatro esquinas |
| SC-017 | `equivalenciaFinalizar.test.ts` (ya existe) más un e2e de la pantalla de resultado |
| SC-018 | integración: modo por partido respetado; dos humanos con modos distintos ven el mismo resultado |
| SC-019 | e2e con el tiempo de la apertura ≤ 8 s y el salto, más prueba del sonido con ≥ 5 personas |
| SC-020, SC-020a | integración: playoff de 8 y de 16, mixto y liga pura; tiempo de «simular resto» |
| SC-021 | integración: nombres únicos, invitados y NPC; e2e de las pantallas de FR-044 |
| SC-022 | unitarias de `patronDiseno` y `parecido`; captura visual del editor frente a la 2D |

## Resumen de incógnitas resueltas

El Technical Context del plan no tiene ningún NEEDS CLARIFICATION. Las decisiones de diseño abiertas por la spec quedan fijadas aquí:

| Asunto | Decisión |
|---|---|
| Errores de los NPC por nivel (Assumption) | R12 |
| Participante de referencia (Assumption) | R13 |
| Estética de las cartas, el sobre, las imágenes y el sonido (Assumption) | R20, R21 y R22 |
| Formato de la equipación y regla de parecido | R24 |
| Dónde se elige el modo y cómo se guarda | R19 |
| Estado del equipo en la gestión durante la 2D sin adelantar información | R17 |
| Versión del motor y partidos antiguos | R2 |
