# Research — Fase 0: Virtudes, defectos y nuevo modo de juego

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Fecha**: 2026-10-22

Cada apartado resuelve una incógnita del *Technical Context* con el formato **Decisión / Razón / Alternativas
consideradas**. La pila no cambia respecto a las specs 001 a 004 (ver [001/research.md](../001-draft-manager-mvp/research.md)).

---

## R1. Línea base de disciplina, lesiones y penaltis (US4)

**Medición** (commit `5007f5a`, parámetros 3.0.0, scripts de sonda temporales fuera del repositorio):

| Medida por partido (dos equipos) | Sintética: 2.000 partidos, equipos equilibrados | Core: 560 partidos, 10 ligas de NPC avanzados | Objetivo (FR-071) |
|---|---|---|---|
| Faltas | 6,77 | 5,85 | — (medio para llegar a las tarjetas) |
| Amarillas | 0,98 | 0,81 | 4 (3,2–4,8) |
| Rojas | 0,039 (0,024 directas + 0,015 por doble amarilla) | 0,025 | 0,20 (0,16–0,24) |
| Penaltis | 0,44 | ≈ 0,36 (0,27 goles de penalti; conversión ≈ 75 %) | 0,35 (0,28–0,42) |
| Lesiones | 0,079 (de larga duración: 0,002) | 0,070 | 0,35 (0,28–0,42) |
| Partidos sin roja | 96,3 % | — | — |
| Partidos sin lesión | 92,4 % | — | — |

**Diagnóstico**:

- Amarillas, rojas y lesiones están entre 4 y 8 veces por debajo de su objetivo. Encaja con lo que percibe el usuario: en
  36 partidos lo esperable eran 1–2 rojas y unas 3 lesiones.
- Los **penaltis ya están en su rango**. La percepción de que «no hay penaltis» viene de la presentación:
  - en `ResumenEventos` el penalti usa el mismo icono que el gol;
  - el texto «Penalti a favor; lo lanza X» no dice si se marcó o se falló;
  - en la 2D no hay ningún rótulo propio.

  Ver R2.
- Las faltas (6–7 por partido, frente a 22–26 en el fútbol real) son el cuello de botella de las tarjetas: con 0,13 de
  amarillas por falta no se puede llegar a 4 sin más faltas o más probabilidad por falta.

---

## R2. Calibración de frecuencias en los parámetros 4.0.0 (US4, FR-070 a FR-072)

**Decisión**: subir las faltas de forma moderada y concentrar el resto en las probabilidades por falta. Mantener los
penaltis compensando la proporción de faltas que ocurren dentro del área.

| Parámetro (`disciplina`, `lesiones`) | 3.0.0 | 4.0.0 inicial | Efecto esperado |
|---|---|---|---|
| `probabilidadFaltaPorEntrada` | 0,12 | 0,22 | faltas ≈ 12/partido |
| `probabilidadAmarillaPorFalta` | 0,13 | 0,33 | amarillas ≈ 4 |
| `probabilidadRojaDirectaPorFalta` | 0,003 | 0,011 | rojas directas ≈ 0,13; con las de doble amarilla, ≈ 0,20 |
| `factorFaltaArea` (nuevo; 1 en 3.x) | — | 0,55 | faltas en el área de vuelta al nivel actual: penaltis ≈ 0,35–0,40 |
| `probabilidadFaltaDueloAereoArea` | 0,04 | 0,03 | ídem, en los centros |
| `lesiones.probabilidadPorEntrada` | 0,0025 | 0,0095 | lesiones ≈ 0,33 con más entradas |
| `lesiones.reparto` (leve/media/grave/larga) | 0,55/0,28/0,15/0,02 | 0,60/0,27/0,11/0,02 | más lesiones, pero sin que las plantillas se queden sin jugadores en una liga de 14 jornadas |

Los valores finales se ajustan con la nueva comprobación `balance` **`disciplina`**:

- mide las cuatro frecuencias en las dos series, la sintética y la Core;
- las compara con FR-071 (±20 %);
- vigila que no se muevan los criterios vigentes de goles por partido y de victorias del mejor equipo.

**Presentación de los penaltis** (FR-071, último párrafo):

- `ResumenEventos` usa un icono `penalti` propio.
- El texto incluye el resultado («Penalti: marca X» o «Penalti: X falla» / «lo para Y»), tomándolo del evento `gol`,
  `parada` o `tiro` siguiente.
- La 2D muestra un rótulo «Penalti» al pitarlo.

**Razón**:

- Subir solo la probabilidad por falta haría que 1 de cada 2 faltas fuera tarjeta, algo poco creíble.
- Subir solo las faltas pararía demasiado el juego y cambiaría el ritmo calibrado en la spec 003.
- Repartir el aumento entre faltas y tarjetas mantiene el ritmo y acerca las dos magnitudes a la realidad.

**Alternativas consideradas**:

- Llegar a 22 faltas por partido como en la realidad: se descarta porque rompe el volumen de pases y tiros calibrado en la
  spec 003.
- Tarjetas por acumulación de faltas de un mismo jugador: es más realista, pero añade estado y no es necesario para los
  objetivos.

---

## R3. Estrategia de renombrado `specials` → `virtudes` (US1, FR-001 a FR-004)

**Decisión**: renombrado completo en un único cambio, sin alias ni capa de compatibilidad.

- **Código**:

  | Antes | Después |
  |---|---|
  | `Special*` | `Virtud*` |
  | `SPECIALS_*` | `VIRTUDES_*` |
  | `specialsPermitidos` | `virtudesPermitidas` |
  | `TODOS_LOS_SPECIALS` | `TODAS_LAS_VIRTUDES` |
  | `MAX_SPECIALS` | `MAX_VIRTUDES` |
  | `modificadores/specials.ts` | `modificadores/virtudes.ts` |
  | `textosSpecials.ts` | `textosRasgos.ts` |
  | clases CSS `carta-special*` | `carta-virtud*` |
  | `PruebasCartas` (texto «4 specials») | «4 virtudes» |

- **Parámetros**: la sección `specials` de `v1.json`, `v2.json` y `v3.json` pasa a llamarse `virtudes`. Los valores no
  cambian. La versión de un fichero de parámetros es su campo `version`, no el nombre de sus claves, así que los partidos
  guardados siguen apuntando a «3.0.0» y se reproducen igual.
- **Datos**:
  - `data/core.json` y `packages/protocol/schemas/player-data.schema.json`: la clave `specials` pasa a ser `virtudes`;
  - la copia del esquema en `specs/001-.../contracts/` se sustituye por un enlace;
  - en la migración `0010`, `ALTER TABLE jugadores RENAME COLUMN specials TO virtudes`;
  - para los partidos guardados:

    ```sql
    UPDATE partidos SET entrada = replace(entrada::text, '"specials":', '"virtudes":')::jsonb
    WHERE entrada::text LIKE '%"specials":%'
    ```

    La clave `"specials":` solo aparece en las cartas, así que el reemplazo textual es seguro. Las tareas comprueban con
    `grep` sobre el esquema que ninguna otra columna `jsonb` guarda cartas.
- **Documentación**: las specs 001 a 004, `README.md`, `DESIGN.md` y la constitución pasan a decir «virtud»; las listas
  duplicadas se sustituyen por enlaces (R14). `graphify-out/` se regenera con `graphify update .`.
- **Excepción (FR-002)**: los ficheros `apps/server/drizzle/0000_base.sql` y `meta/000*_snapshot.json` ya aplicados no se
  modifican.
- **Verificación**:
  - una prueba busca `special` en `apps/`, `packages/`, `tools/`, `data/`, `docs/` y `specs/` (salvo las migraciones ya
    aplicadas) y falla si aparece (SC-001);
  - la prueba de equivalencia del motor con semillas fijas y parámetros 3.0.0 debe dar eventos idénticos antes y después
    (SC-003).

**Razón**: un alias dejaría los dos términos conviviendo, que es justo lo que prohíbe FR-002. El reemplazo de una sola vez
es mecánico y se verifica con la búsqueda y con la equivalencia.

**Alternativas consideradas**:

- Normalizar las cartas antiguas al leerlas, aceptando `specials`: deja el término viejo en el código.
- Reescribir las migraciones antiguas: rompe la integridad de Drizzle con bases ya migradas.

---

## R4. Torneos empezados antes del cambio: versión de catálogo (FR-036)

**Decisión**:

- `partidas.version_catalogo`: las partidas existentes quedan con `1` (valor por defecto de la migración) y las nuevas se
  crean con `2`.
- Al cargar las cartas de una partida con versión 1, `cartaEnVersion(jugador, 1)` (dominio):
  - devuelve `defectos: []`;
  - quita de `virtudes` las cuatro virtudes nuevas (`DeAcero`, `Versatil`, `FairPlayer`, `Revulsivo`).
- El resultado es exactamente la carta anterior, porque la pasada de R5 solo **añade** rasgos y nunca quita ni cambia
  una virtud existente. Una prueba recorre las 300 cartas y compara `cartaEnVersion(nueva, 1)` con la carta del commit
  base, guardada como fixture.
- Los partidos ya jugados no se ven afectados: su `entrada` guarda una copia de las cartas.

**Razón**: no duplica la tabla `jugadores` ni guarda una copia de 300 cartas por partida. Es una función pura y probada.

**Alternativas consideradas**:

- Copiar las cartas en cada partida al crearla: duplica datos y no resuelve las partidas ya existentes.
- Tabla `jugadores_version`: es más general, pero innecesaria mientras los cambios de catálogo sean solo añadir. Cuando
  llegue el catálogo de cartas reales (FR-037), será una colección nueva, no una versión de Core.

---

## R5. Reparto de defectos y virtudes nuevas en Core (FR-012, FR-035, FR-037)

**Decisión**: `tools/fixtures/src/asignarRasgos.ts` hace una pasada determinista (semilla fija `rasgos-005`) sobre el
catálogo existente:

1. **Defectos por nivel**: la proporción de cartas con al menos un defecto es Superclase 15 %, Épico 25 %, Legendario 35 %
   y GOAT 50 %. La proporción de cartas con dos defectos, dentro de las que tienen alguno, es 0 / 20 % / 30 % / 40 %. Los
   defectos se eligen con pesos que favorecen los coherentes con la demarcación:
   - Mal defensor, en delanteros y centrocampistas ofensivos;
   - Chupón, en delanteros;
   - Torpe, en defensas;
   - Agresivo e Impulsivo, en defensas y medios defensivos;
   - Estrellita, Polémico y Provocador, más probables en Legendario y GOAT.
2. **Virtudes nuevas**: solo en cartas con un hueco libre según `MAX_VIRTUDES`. El objetivo es unas 12 cartas por virtud
   nueva, repartidas por nivel.
3. **Validación**: cada carta respeta FR-013 y FR-040. Si un sorteo produce una incompatibilidad, se vuelve a sortear con
   la misma semilla.
4. **Comprobación de no regresión**: ids, nombres, stats, medias y virtudes anteriores no cambian. Se comprueba con la
   prueba de R4.

Las reglas (proporciones, máximo y pesos) viven en el dominio (`catalogo/rasgos.ts`, `REPARTO_DEFECTOS`). Así sirven para
cualquier catálogo (FR-037), y `validarColeccion` comprueba con una tolerancia de ±5 puntos que la proporción crece con el
nivel (SC-008).

**Razón**: el generador original (`generarCore`) no se vuelve a ejecutar porque cambiaría las cartas. Una pasada aditiva
cumple FR-035 y hace posible R4.

**Alternativas consideradas**: regenerar Core entero (descartado, rompe R4) o asignar los rasgos a mano (no reproducible).

---

## R6. Aplicación de defectos y virtudes nuevas en el motor (FR-014 a FR-016, FR-031 a FR-034, FR-042)

**Decisión**: un módulo nuevo, `engine/modificadores/defectos.ts`, con funciones puras que consultan los rasgos del
jugador y los parámetros. Cada efecto se engancha donde el motor ya resuelve esa situación:

| Rasgo | Punto de enganche | Regla |
|---|---|---|
| Canchero | `acciones/balonParado.ts` (falta por entrada) | prob. de falta × `defectos.canchero` (1,5) |
| Impulsivo | ídem (amarilla) | prob. × 2 |
| Agresivo | ídem (roja directa) | prob. × 2 |
| Fair player | `amarilla()` / `tarjetaRoja()` | sin roja directa; la segunda amarilla queda registrada pero no expulsa |
| Frágil | `acciones/lesiones.ts` | prob. × 3 |
| De acero | ídem | sin lesión (precede a todo) |
| De cristal | ídem | gravedad = `larga` |
| Fatigado | `modificadores/cansancio.ts` | inicio = min(inicio general, inicio de la 2.ª parte) |
| Indisciplinado | ídem | ritmo × 1,5 |
| Torpe | `acciones/tiro.ts` (`despejeEnPropia`, desvío) | prob. de autogol × 2 |
| Chupón | `acciones/opciones.ts` | peso de la opción «pase» × 0,5 |
| Mal defensor | `acciones/juego.ts` (elección del defensor que entra al duelo, presión y cobertura) | peso × 0,5 como candidato defensivo; nunca menos que el último recurso si es el único |
| Versátil / Inflexible | `domain/equipo/statsEfectivos.ts` (`penalizacionPorPosicion`) | solo si la penalización es > 0: −0,05 / +0,05 (5 puntos porcentuales), con un mínimo de 0 |
| Polémico | `modificadores/defectos.ts` → multiplicador de equipo | × 0,95 si hay uno en el campo y el equipo va perdiendo |
| Rebelde | ídem | × 0,95 si hay uno convocado en el banquillo (`!enCampo && !retirado && !expulsado && !lesionado`) |
| Estrellita | multiplicador individual | × 0,90 si su media efectiva sin este efecto no es la máxima del equipo en el campo (empate: no se aplica) |
| Provocador | bonificación en puntos al rival | +1 a cada jugador GOAT del rival en el campo, una sola vez por equipo |
| Revulsivo | multiplicador individual | × 1,05 si `entroDesdeBanquillo` (nuevo campo de `JugadorEnPartido`, lo marca `sustituir()`) |

**Orden de cálculo de un stat efectivo**: base → penalización por posición (con Versátil / Inflexible) → cansancio →
bonificaciones de equipo en puntos (virtudes y Provocador) → multiplicadores (Polémico × Rebelde × Estrellita ×
Revulsivo) → redondeo. Las penalizaciones de defectos distintos se multiplican entre sí. Un mismo defecto cuenta una sola
vez por equipo (FR-016).

Todas las condiciones (marcador, enCampo, sustituciones) se leen en el estado del momento, así que se reevalúan solas en
cada tramo (FR-042).

**«5 % de la penalización»**: se interpreta como 5 puntos porcentuales sobre la penalización (de 10 % a 15 % con
Inflexible y a 5 % con Versátil fuera de posición en la misma demarcación). Un 5 % relativo (10 % → 10,5 %) no tendría un
efecto perceptible ni medible. Queda documentado en la tabla de rasgos.

**Aviso de efectos colectivos (FR-044)**: el motor emite un evento `malestar` (activo o inactivo, con el rasgo y el
jugador) cuando cambia el estado de Polémico o Rebelde. La simulación rápida y la 2D lo muestran como aviso informativo.

**Razón**: reutiliza los puntos de decisión existentes y mantiene una sola fuente para cada efecto. Así las dos
modalidades lo ven igual (FR-041).

**Alternativas consideradas**:

- Un sistema genérico de «modificadores declarativos»: sobra para 19 rasgos y dificulta las pruebas de cada uno.
- Aplicar los porcentajes a la media mostrada en lugar de a los stats: el motor no usa la media, sino los stats.

---

## R7. Parámetros 4.0.0 y reproducibilidad (FR-017, FR-072, SC-003)

**Decisión**:

- Nuevo `parametros/v4.json` (versión `4.0.0`) con:
  - la sección `virtudes` (renombrada) más `revulsivo: 0.05` y `versatil: 0.05`;
  - una sección nueva, `defectos`: `canchero 1.5`, `impulsivo 2`, `agresivo 2`, `fragil 3`, `indisciplinado 1.5`,
    `torpe 2`, `chupon 0.5`, `malDefensor 0.5`, `inflexible 0.05`, `polemico 0.05`, `rebelde 0.05`, `estrellita 0.10`,
    `provocador 1`;
  - una sección nueva, `duelos`: `pesoVirtud 1`, `pesoDefecto 1`, `estadoForma 2`;
  - los cambios de `disciplina` y `lesiones` de R2.
- Las secciones nuevas son **opcionales** en el tipo `ParametrosEquilibrado`. Las versiones 1.x a 3.x se cargan con valores
  neutros (multiplicadores 1, sumandos 0, `factorFaltaArea` 1), así que un partido 3.0.0 se reproduce idéntico.
  `VERSION_MAYOR_SOPORTADA` sigue en 3 (las versiones 3 y 4 son reproducibles).
- `parametrosActuales()` pasa a devolver la 4.0.0.

**Razón**: con valores neutros por defecto, el motor nuevo es una extensión estricta del anterior y no hay que
mantener dos ramas de código.

**Alternativas consideradas**: subir `VERSION_MAYOR_SOPORTADA` a 4. Se descarta porque dejaría sin reproducción todos los
partidos ya jugados, sin necesidad.

---

## R8. Tabla única de rasgos y documento generado (FR-050 a FR-055)

**Decisión**:

- `packages/domain/src/catalogo/rasgos.ts` exporta `RASGOS: Record<Rasgo, DefinicionRasgo>`, con:
  - `tipo: 'virtud' | 'defecto'`;
  - `ambito: 'generico' | Demarcacion | 'DEF_CARRILERO'` (este último para las de mediocampo de los carrileros, 001/FR-023);
  - `nombre` y `descripcion`, los textos de la interfaz con tildes;
  - `efecto`, la regla exacta en el partido;
  - `activacion`, `acumulacion`, `incompatibles: Rasgo[]` e `impacto: number`.
- Las listas `VIRTUDES_*`, `DEFECTOS` y `TODAS_LAS_VIRTUDES` se derivan de esta tabla, y `textosRasgos.ts` del servidor la
  lee: desaparece la duplicación de textos de `textosSpecials.ts`.
- **Documento**: el script `pnpm --filter @fbd/domain rasgos:doc` genera `docs/juego/virtudes-y-defectos.md`. El documento
  tiene:
  - una introducción fija (qué es una virtud y un defecto, cómo se lee el impacto, reglas de acumulación y la regla de
    FR-055);
  - una tabla de virtudes y otra de defectos con todos los campos de FR-050;
  - la lista de incompatibilidades.

  La prueba `rasgos-doc.test.ts` regenera el documento en memoria y falla si difiere del fichero (FR-054, SC-007).
- **FR-055, rasgo sin efecto probado**:
  - `RASGOS_PROBADOS` es un registro en las pruebas del motor y de `balance`: cada rasgo apunta a su prueba de unidad y a su
    comprobación de `balance`;
  - una prueba falla si algún rasgo de `RASGOS` no está en el registro;
  - `validarColeccion` rechaza cartas con rasgos sin definición.
- Impactos iniciales: [contracts/rasgos.md](./contracts/rasgos.md).

**Razón**: con una sola fuente para el código, la interfaz y el documento, la sincronización deja de depender de la
disciplina de quien edita.

**Alternativas consideradas**: documento escrito a mano con una prueba que lo analice. Se descarta por frágil: depende del
formato de la tabla Markdown.

---

## R9. Puntuación efectiva y resolución de duelos (FR-064, FR-064a, FR-065, FR-066, SC-010)

**Decisión**: módulo puro `packages/domain/src/duelos/` (contrato en [contracts/duelos-api.md](./contracts/duelos-api.md)).

- **Puntuación efectiva**, en centésimas enteras para evitar errores de coma flotante:
  `round(100 × (media × (1 − penalizacionPosicion) + Σ pesoVirtud × impacto(v) − Σ pesoDefecto × (1 − impacto(d))))`.
  - `media` es la de la carta (media de los seis stats);
  - la penalización por posición es la de `statsEfectivos`, con Versátil, Todocampista e Inflexible.
- **Estado de forma**: si está activado, cada jugador recibe en cada duelo un sorteo entero en [−200, +200] centésimas,
  con un `Rng` derivado de la semilla del cruce y del índice del puesto. El orden de sorteo es fijo: local y luego
  visitante, por puesto.
- **Resultado del duelo**: gana la mayor puntuación final; si es igual, el duelo es nulo.
- **Resultado del cruce**: gana quien tenga más duelos ganados. Si empatan, gana la mayor suma de puntuaciones finales; si
  sigue el empate, un sorteo con el mismo `Rng`. Se guarda el motivo del desempate (`duelos`, `suma` o `sorteo`).
- **Emparejamiento**: por `casillaId` de la formación común. Cada casilla tiene exactamente un jugador por equipo.
- Los rasgos de partido (Rebelde, Revulsivo, etc.) no tienen efecto propio en los duelos: solo cuenta su impacto.

**Verificación de SC-010**: la comprobación `balance` **`duelos`**:

- juega 1.000 cruces entre onces del draft de NPC sobre Core, con el Estado de forma activado y desactivado;
- mide el porcentaje de duelos nulos (< 2 %);
- mide el porcentaje de victorias del equipo con mayor suma de medias (60–85 %);
- comprueba las remontadas por encima de 4 puntos (0) y que con la opción desactivada el peor nunca gana.

**Razón**: una función pura y entera es reproducible, fácil de probar y barata. Las centésimas dan resolución suficiente
para que los empates sean raros.

**Alternativas consideradas**: probabilidad proporcional a la diferencia (la opción C de la clarificación). El usuario
eligió A/B como opción del anfitrión; la C queda documentada como ampliación posible.

---

## R10. Flujo del torneo en el modo `duelos` (FR-060 a FR-069)

**Decisión**:

- **Dominio**:
  - `Modo` gana `'duelos'`, con el mismo número de participantes que el playoff (4, 8 o 16, con dos mesas en 16);
  - `ConfigPartida` gana `duelos?: ConfigDuelos` (`{ formacion: FormacionId; estadoForma: boolean }`), por defecto
    `{ '4-3-3', true }`.
- **Sala**:
  - el anfitrión cambia la configuración con `PATCH /api/partidas/:id/duelos` (o el comando WS `sala.configurarDuelos`)
    mientras la partida está en `buscando`;
  - los demás la reciben en la vista de la sala;
  - al empezar el draft queda fijada: el servidor rechaza cambios con `CONFIG_FIJADA`.
- **Preparación**:
  - la alineación de este modo solo acepta `titulares` en las casillas de la formación común; `suplentes`, `tactica`,
    `lanzadores` y `colocacion` se ignoran y se guardan con valores por defecto;
  - el primer `confirmar` guarda la alineación con `bloqueada = true`, y los siguientes reciben `ALINEACION_BLOQUEADA`;
  - los dorsales no se piden ni se asignan;
  - los NPC usan `decidirAlineacion` restringida a la formación común (R12).
- **Torneo**:
  - `cuadroPlayoff` sin cambios;
  - cada cruce crea un `partido` con `tipo = 'duelos'`;
  - al abrirse la ronda, el actor `duelos.ts` resuelve todos sus cruces de inmediato (`resolverCruce`) y guarda el
    detalle en `partidos.duelos`, el marcador (duelos ganados por equipo) y el desempate;
  - el ganador avanza con `avanzarCuadro`;
  - no hay bajas, sanciones ni amarillas acumuladas.
- **Visibilidad**:
  - el resultado de un cruce con un humano no se revela hasta que lo ve, con el mecanismo de `visionados` de la spec 002;
  - «Ver duelos» abre la pantalla de duelos y marca el visionado al terminar o al saltar;
  - los cruces solo de NPC tienen `resolucion = 'npc'` y se ven en el cuadro.
- **Fin de ronda y torneo**: los mismos mensajes de eliminación, el «Simular resto del torneo» y la pantalla de campeón
  (FR-069).

**Razón**: reutilizar cuadro, partidos y visionados reduce el modo a un resolvedor nuevo y una pantalla nueva.

**Alternativas consideradas**:

- Tabla `enfrentamientos_duelos` aparte: duplicaría el ciclo de vida, la visibilidad y las vistas del torneo.
- Resolver los duelos en el cliente: viola el Principio VI.

---

## R11. Interfaz: cartas con dos filas, configuración, alineación y animación (FR-020 a FR-024, FR-060, FR-063, FR-067)

**Decisión**:

- **Carta** (`CartaJugador`):
  - fila `carta-virtudes` y debajo fila `carta-defectos`, con la altura de la segunda reservada aunque esté vacía;
  - cada defecto es un botón con la clase `carta-defecto` y un borde con el token nuevo `--color-defecto` (rojo de juego,
    distinto de `--color-error` y con contraste ≥ 4,5:1 sobre el fondo de la carta);
  - cada defecto lleva un pequeño icono `defecto` (triángulo hacia abajo) delante del nombre, para no depender del color;
  - la descripción emergente dice «Defecto · …»;
  - el clic en un rasgo no elige la carta (004/FR-056, mismo manejador que las virtudes);
  - `DESIGN.md` añade el token y la regla.
- **Crear partida**: cuarta opción «Duelo de jugadores» con el icono `duelo` (dos perfiles de cara enfrentados, trazo del
  mismo grosor que los demás iconos). Los tamaños son los del playoff.
- **Sala**: `ConfigDuelos`:
  - selector de formación con el 4-3-3 preseleccionado e interruptor «Estado de forma», activado;
  - editable solo por el anfitrión y de solo lectura para el resto;
  - un texto breve explica qué hace el Estado de forma.
- **Formación en modo duelos** (`Alineacion` con `modo === 'duelos'`):
  - solo el `CampoEquipo` con intercambio de jugadores entre el once y la plantilla;
  - se ocultan `PanelTactica`, `EditorDorsales`, `EditorEquipacion`, `EditorLanzadores`, el banquillo y la colocación
    libre;
  - el botón principal «Confirmar once» abre un diálogo: «No podrás cambiarlo durante el torneo».
- **Pantalla `Duelos`**:
  - recorre los 11 puestos en orden de la formación (portero → delanteros);
  - en cada duelo, las dos cartas entran desde los lados, chocan en el centro (escala y destello de 120 ms), las
    puntuaciones cuentan hasta su valor, aparece el Estado de forma (±) si está activo y la carta ganadora se queda
    resaltada mientras la perdedora se atenúa;
  - un marcador de duelos se actualiza en cada duelo;
  - controles: ×1, ×2 y «Saltar al resultado»;
  - al final, una tabla resumen con los 11 duelos, las puntuaciones, los rasgos que influyeron y el desempate si lo hubo;
  - con `prefers-reduced-motion`, sustitución por un fundido y sin choque;
  - animación con WAAPI y transformaciones (solo `transform` y `opacity`).

**Razón**: reutiliza los componentes de la spec 004 (`CampoEquipo`, `CartaJugador`, `BarraPrincipal`, `Dialogo`) y no
añade dependencias.

**Alternativas consideradas**: animación en Canvas. Se descarta porque las cartas ya existen como componentes DOM
accesibles.

---

## R12. IA con el impacto de los rasgos (FR-043, FR-052)

**Decisión**:

- **`evaluador.ts`**: el valor de una carta suma `k × Σ impacto(virtud)` y resta `k × Σ (1 − impacto(defecto))`, con `k`
  por nivel de NPC (los niveles bajos lo ponderan menos, como errores creíbles de la spec 003). La sinergia mantiene las
  virtudes de equipo.
- **`alineacion.ts`**:
  - **Rebelde**: no se convoca si no va de titular (el banquillo admite 7 de los 13 restantes);
  - **Estrellita**: se evita de titular si no es la mejor media, salvo que siga siendo la mejor opción del puesto;
  - **Revulsivo**: se reserva en el banquillo cuando la diferencia con el titular alternativo es pequeña;
  - **Fatigado e Indisciplinado**: se sustituyen antes.
- **Duelos**: la alineación del NPC maximiza la suma de puntuaciones efectivas en la formación común. Es la misma función
  que usa la comprobación `balance` de duelos.

**Razón**: la spec pide usar el impacto como medida de la IA. Reutilizarlo evita inventar otra escala.

**Alternativas consideradas**: medir el valor de cada rasgo en simulación al vuelo. Es demasiado caro para cada decisión
del draft.

---

## R13. Pruebas y comprobaciones de equilibrado (SC-004, SC-005, SC-007, SC-010, SC-011)

**Decisión**:

- **Pruebas de unidad del motor**: una por rasgo nuevo, con escenarios deterministas; por ejemplo, un De acero con
  probabilidad de lesión forzada a 1 no se lesiona.
- **Comprobaciones nuevas de `balance`**:
  - **`rasgos`**: para cada defecto y virtud nueva, serie A/B (el mismo equipo con y sin el rasgo en un jugador). Mide la
    métrica asociada y la compara con la magnitud objetivo ±20 % (SC-004). De acero, Fair player y De cristal se comprueban
    al 100 % (SC-005);
  - **`impacto`**: dentro de cada tipo, mide la diferencia de goles esperada por el rasgo y comprueba que el orden de los
    impactos sea coherente con lo medido (correlación de Spearman ≥ 0,6; FR-051);
  - **`disciplina`**: R2 (SC-011);
  - **`duelos`**: R9 (SC-010).
- **E2E**:
  - cartas con defectos y dos filas en las pantallas de la spec 004 (SC-006);
  - creación de un torneo de duelos;
  - once bloqueado;
  - animación saltable y resumen.

---

## R14. Documentación y constitución (FR-053, FR-080)

**Decisión**:

- **Specs anteriores**:
  - 001/FR-022 y 001/FR-037: se sustituyen las listas por «Ver [virtudes y defectos](../../docs/juego/virtudes-y-defectos.md)»
    y se mantiene la regla propia de cada requisito (máximo por nivel, aplicación exacta, no acumulación);
  - el resto de menciones de «special» en 001 a 004 pasa a decir «virtud»;
  - `CLAUDE.md` añade el enlace al documento de referencia.
- **Constitución 1.1.0 → 1.2.0 (MINOR)**:
  - «habilidades especiales» pasa a «virtudes y defectos» en la visión y en los principios I, III, IV y IX;
  - en «Decisiones resueltas», el modo Duelo de jugadores se registra con referencia a `specs/005-virtudes-defectos/`;
  - en el Principio V se aclara que el motor único resuelve los **partidos**, y que un modo que resuelve los cruces sin
    partido (duelos) usa una función de dominio propia, sin un segundo motor de partidos;
  - se actualiza el informe de impacto de la cabecera.

  La propuesta se redacta en `specs/005-virtudes-defectos/propuesta-constitucion-1.2.0.md`, como en la spec 003, para que
  la persona la revise antes de aplicarla con `/speckit-constitution`.
