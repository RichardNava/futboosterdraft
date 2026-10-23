# Data Model — Mejoras del MVP

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Research**: [research.md](./research.md)

Este documento describe solo los **cambios** sobre el modelo de la spec 001
([001/data-model.md](../001-draft-manager-mvp/data-model.md)). Lo que no aparece aquí no cambia. Se
mantienen las convenciones: identificadores y valores en español sin tildes, y referencias `FR-xxx` y
`SC-xxx` a [spec.md](./spec.md).

---

## 1. Parámetros de equilibrado 2.0.0 (`ParametrosEquilibrado`)

El fichero pasa a `packages/domain/src/parametros/v2.json`. Es un cambio de versión mayor porque cambian el motor y las reglas de posición (R12). Se conserva `v1.json` para leer los partidos antiguos, pero no para volver a simularlos.

| Bloque | Cambio | Origen |
|--------|--------|--------|
| `penalizacionFueraPosicion` | **Se elimina**. | FR-032 |
| `penalizacionPorteria` | Pasa a `penalizacionPosicion.porteria` (0,60). | FR-032 |
| `penalizacionPosicion` | **Nuevo**: `{ mismaDemarcacion: 0.10, porteria: 0.60, cruces: { origen, destino, valor }[] }` con las filas de la tabla de FR-032. Valores fijados por la spec, con una prueba que los compara con ella. | FR-031, FR-032 |
| `reproduccion` | **Nuevo**: `{ ticksPorSegundoX2: 23.5, descuentoMinS: 60, descuentoMaxS: 180, pausaGolMs: 2000, tandaLanzamientoMsX2: 3000, anticipacionTicks: 60 }`. | R2, R6 |
| `espacio` | **Nuevo**: velocidades máximas de los jugadores (según el stat de velocidad: +20 puntos → al menos +15 %, y como mucho 9 m/s visuales a x2), aceleración y frenada, radio de separación, velocidades del balón por tipo de acción (raso, largo, centro, tiro, despeje) dentro de los límites de FR-025, factores de basculación por línea, distancias entre líneas (10–25 m con balón, 8–18 m sin balón), desplazamiento del bloque por táctica (tabla de FR-023) y presionadores (2 como máximo; 3 en una presión coordinada, solo con Presión alta y durante ≤ 5 s tras una pérdida rival en su campo). Las velocidades están en unidades por tick. | R3, FR-023 |
| `acciones` | Se recalibra entero. Las duraciones fijas se sustituyen por tiempos de control por stat. Se añaden los pesos de la puntuación espacial de los pases (lo libre que está el receptor, distancia, líneas superadas). | R4 |
| `colocacion` | **Nuevo**: `{ beta: 0.6, gamma: 0.5, limite: 3, separacionMinima: 30 }`, para la ofensividad y la amplitud calculadas y la separación de jugadores superpuestos. | R13 |
| `asincrono` | **Nuevo**: `{ nivelDecisiones: 'avanzado' }`. | R8 |
| `draft` | **Nuevo**: `{ margenAnimacionS: 6 }`. | FR-008 |

Cada `Partido` sigue guardando `versionParametros`. Un partido con la versión `1.x` no se vuelve a simular: solo se muestran sus datos guardados.

## 2. Zonas del campo (`Zona`) — datos estáticos

`packages/domain/src/equipo/zonas.ts`. Las coordenadas son las del equipo: x = 0 en la propia línea de gol y 1000 en la rival; y = 0 en la banda izquierda y 640 en la derecha.

| Campo | Tipo | Reglas |
|-------|------|--------|
| `id` | texto | Único (p. ej. `C-MC`, `BD-ED-ATQ`). |
| `rect` | `{ x0, x1, y0, y1 }` | Semiabierto `[x0, x1) × [y0, y1)`. Las zonas cubren el campo sin huecos ni solapes. |
| `posicionesAdmitidas` | `Posicion[]` | Misma forma que en `Casilla`, así que `statsEfectivos` acepta una zona o una casilla. |
| `linea` | `'porteria' \| 'defensa' \| 'medio' \| 'ataque'` | Para el reparto por líneas y la ofensividad (R13). |

**Carriles (y)**:
- BI: banda izquierda, [0, 140).
- II: interior izquierdo, [140, 240).
- C: centro, [240, 400).
- ID: interior derecho, [400, 500).
- BD: banda derecha, [500, 640].

**Rejilla inicial** (la primera franja de cada carril llega hasta x = 0):

| Carril | Tramos de x → posición (línea) |
|--------|--------------------------------|
| BI | [0, 230) LI (def) · [230, 330) CI (def) · [330, 440) CI (med) · [440, 650) EI (med) · [650, 1000] EI (atq) |
| II | [0, 280) DCI (def) · [280, 400) MD (med) · [400, 560) MII (med) · [560, 680) MCO (med) · [680, 1000] EI (atq) |
| C | [0, 280) CENTRAL = `['DCI', 'DCD']` (def) · [280, 400) MD (med) · [400, 560) MC (med) · [560, 660) MCO (med) · [660, 750) SD (atq) · [750, 1000] DC (atq) |
| ID | como II, con DCD, MID y ED |
| BD | como BI, con LD, CD y ED |

**Zona de portería**: x en [0, 110) e y en [200, 440). Tiene prioridad sobre las demás, admite `['POR']` y su línea es `porteria`.

**Ajustes de casillas** para que cada casilla de las 10 formaciones caiga en una zona que admita su posición:

| Formación | Casilla | x actual → x nueva |
|-----------|---------|--------------------|
| 4-2-3-1 | MC | 330 → 410 |
| 3-5-2 | CI, CD | 430 → 410 |
| 5-4-1 | DC | 720 → 770 |
| 5-3-2 | DC | 740 → 770 |
| 4-5-1 | DC | 740 → 770 |
| 5-4-1, 5-3-2 | CI, CD (defensa de 5) | 240 → 250 |

Una prueba del dominio comprueba la condición para todas las casillas. Si al implementar se ajustan los límites de la rejilla, la prueba es la que manda.

## 3. Penalización por posición (regla de dominio)

`penalizacionPorPosicion(jugador, destino: { posicionesAdmitidas }, p)` sustituye a `penalizacionPorCasilla`. Devuelve 0, 0,10, 0,20, 0,30, 0,40 o 0,60.

1. Si `destino.posicionesAdmitidas` comparte alguna posición con `jugador.posicion`, devuelve 0.
2. Si la portería y el portero no coinciden (un jugador de campo en ella, o el portero fuera), devuelve `porteria`.
3. Con Todocampista, devuelve 0.
4. Rol de origen de cada posición del jugador:
   - `DC`, `SD`, `EI` y `ED` → `DEL`;
   - `MCO` → `MED_MCO`;
   - `MD` → `MED_MD`;
   - `MC`, `MII` y `MID` → `MED`;
   - `LI`, `LD`, `DCI`, `DCD`, `CI` y `CD` → `DEF`.
5. Clase del destino: `DEF`, `MED_MCO` (casilla o zona MCO), `MED` o `DEL`.
6. Para cada rol de origen: si la demarcación de origen y la de destino coinciden, `mismaDemarcacion`; si no, el valor de `cruces`. Devuelve **el mínimo**.

`StatsEfectivos.penalizacion` conserva su significado (la fracción aplicada) y la pantalla la muestra como porcentaje (FR-033).

## 4. Alineación (`Alineacion`) — cambios

| Campo | Cambio |
|-------|--------|
| `formacion` | Ahora es la **formación de partida**: la colocación inicial y la referencia para la ofensividad (FR-034). |
| `titulares` | Sin cambios: `{ casillaId, jugadorId }[11]`. La casilla identifica el hueco de partida y quién es el portero (casilla `POR`). |
| `colocacion` | **Nuevo**, opcional: `{ jugadorId, x, y }[]` en coordenadas del equipo, enteros (0–1000 y 0–640). Si falta un titular, se usa la zona de su casilla. |

**Validación** (dominio y servidor, FR-034a):
- cada `jugadorId` de `colocacion` es un titular y aparece una sola vez;
- las coordenadas están dentro del campo;
- el titular de la casilla `POR` está en la zona de portería, y ningún otro titular está en ella.

Código de error: `ALINEACION_INVALIDA`, con motivos.

**Derivados** (no se guardan; los calcula `previsualizar`, que se usa en la interfaz, en el servidor y en el motor):
- `posicionEfectiva` por titular: la zona de su punto (en la casilla `POR`, siempre `POR`);
- `penalizacion` y stats efectivos con esa posición;
- `personalizada`: verdadero si algún titular está en una zona distinta de la de su casilla;
- `reparto: { defensa, medio, ataque }`, contado por la `linea` de cada zona;
- `ofensividad` y `amplitud`, con las fórmulas de R13 y acotadas a ±`colocacion.limite`;
- `avisos`: repartos muy desequilibrados (menos de 3 defensas, más de 5 delanteros o una línea vacía).

**Persistencia**: la columna JSONB de la alineación admite el campo nuevo sin migración. Las alineaciones antiguas no tienen `colocacion`.

## 5. Plantilla: dorsales

| Campo | Cambio |
|-------|--------|
| `dorsales` | `{ [jugadorId]: 1..99 }`. Un jugador **sin entrada** está "sin dorsal". Invariante: no hay valores repetidos (SC-014). |

Operaciones del dominio:

| Operación | Regla |
|-----------|-------|
| `asignarDorsalesIniciales` | Los fijos por casilla se asignan según la **posición efectiva** de cada titular, en el orden de la formación. El resto recibe números al azar entre los libres del **1 al 24** (FR-035). Resultado: exactamente los números del 1 al 24. |
| `asignarDorsal(d, jugadorId, n)` | `n` entre 1 y 99 (`DORSAL_FUERA_DE_RANGO`). Si otro jugador tenía `n`, pierde su entrada (FR-037). |
| `completarDorsales(d, convocados)` | Al empezar un partido, cada convocado sin dorsal recibe el número libre más bajo del 1 al 24, o a partir del 25 (FR-038). Devuelve `{ dorsales, asignados: { jugadorId, dorsal }[] }`. |

`PUT /api/partidas/:id/dorsales` deja de devolver `DORSAL_REPETIDO`.

## 6. Partida y torneo — cambios

### 6.1 Partida

| Campo | Cambio |
|-------|--------|
| `ritmo` | **Se elimina** (migración `0004`, R9). |
| `plazoJornadaHoras` | Se aplica solo si hay 2 o más humanos (contando los que no han abandonado). |
| `tiempos` | Se eliminan `preparacionS` y `preparacionInicialS`, porque ya no hay preparación con temporizador. Se mantienen `busquedaS`, `turnoDraftS` y `descansoS`. Este último es la ventana del descanso en el directo contra un NPC, como límite frente a un humano ausente. |

**Ritmo deducido** (R9):
- `soloUnHumano = humanosActivos === 1`;
- sin plazos ni apertura automática de jornadas si `soloUnHumano`;
- con plazos en cualquier otro caso.

### 6.2 Mesa de draft (`MesaDraft`)

| Campo | Cambio |
|-------|--------|
| `venceEn` | En el turno 1 de cada ronda incluye `draft.margenAnimacionS` (FR-008). |
| `pausadaEn` | **Nuevo**, fecha y hora o null: partida de un humano pausada con `partida.pausar` (R10). |
| `restanteMs` | **Nuevo**, entero o null: tiempo de turno que quedaba al pausar. Al reanudar, `venceEn = ahora + restanteMs`. |

Transición añadida:

```text
en_turno ──(partida.pausar, solo un humano)──► en_turno [pausada]
en_turno [pausada] ──(el humano reconecta)──► en_turno
```

Mientras está pausada, el temporizador del turno no corre.

### 6.3 Jornada

Sin campos nuevos. Cambia cuándo se abre:
- con varios humanos, al cerrarse la anterior (como hasta ahora);
- con un solo humano, al recibir `POST /api/partidas/:id/siguiente-jornada` con la anterior `cerrada`.

`venceEn` es null cuando hay un solo humano.

### 6.4 Torneo (`EstadoTorneo`, dominio)

| Campo | Cambio |
|-------|--------|
| `aportaciones` | **Nuevo**: `{ partidoId, participanteId, jugadorId, goles, asistencias, jugo: boolean }[]`. Se amplía en `registrarResultado` (R15). |

Funciones derivadas:
- `tablaGoleadores(t, { excluirPartidos? })` y `tablaAsistentes(t, { excluirPartidos? })` devuelven filas `{ posicion, jugadorId, participanteId, total, partidosJugados }`. Incluyen solo a los jugadores con total ≥ 1 y ordenan por total descendente, después por partidos jugados ascendente y después por nombre (el nombre se resuelve fuera del dominio y la ordenación final se completa en el servidor).
- `clasificacionActual(t, { excluirPartidos? })` admite la misma exclusión (R8).

**Reglas de las aportaciones**:
- Gol: el autor suma 1, y el asistente, si lo hay, suma 1 asistencia. No cuentan los goles con `datos.enPropia` ni los eventos `tanda_lanzamiento`.
- `jugo`: titular en la alineación inicial, o con un evento `sustitucion` con rol `entra`.

## 7. Partido — cambios

### 7.1 Partido (`Partido`)

| Campo | Cambio |
|-------|--------|
| `resolucion` | **Nuevo**: `'directo' \| 'apertura' \| 'plazo' \| 'npc'`. `directo` = humano contra NPC jugado en vivo. `apertura` = partido entre humanos resuelto al abrirlo uno de ellos. `plazo` = resuelto al vencer el plazo. `npc` = NPC contra NPC. Sustituye a `resueltoAutomaticamente`, que se conserva como derivado (`plazo`). |
| `abiertoPorId` | **Nuevo**: `Participante.id` o null. Quién lo abrió primero (partido entre humanos). |
| `alineacionesIniciales` | Incluyen `colocacion` y los dorsales completados al empezar. |
| `estadisticas` | Ver 7.3. |

**Transiciones**:

```text
Humano contra NPC (directo):
programado ──(«Comenzar partido»)──► primera_parte ──► descanso ──(«Seguir» | vence descansoS | «Finalizar»)──► segunda_parte …
cualquier fase en juego ──(«Finalizar partido» | vence el plazo de la jornada)──► finalizado   [resolverResto, R7]

Humanos entre sí (asíncrono) y NPC contra NPC:
programado ──(primer «abrir» | vence el plazo | NPC contra NPC al abrir la jornada)──► finalizado   [un solo comando]
```

Desaparecen las transiciones con «Seguir» de dos humanos y la espera al reloj de reproducción del más lento.

### 7.2 Visionado de partido (`VisionadoPartido`) — tabla `visionados`

| Campo | Tipo | Reglas |
|-------|------|--------|
| `partidoId`, `participanteId` | — | Clave primaria compuesta. Solo para los humanos de un partido entre humanos. |
| `estado` | `'pendiente' \| 'visto' \| 'revelado'` | Se crea `pendiente` al resolverse el partido. Pasa a `visto` al llegar al final de la reproducción o al pulsar «Finalizar», y a `revelado` con «Mostrar resultado». Nunca vuelve a `pendiente`. |
| `actualizadoEn` | fecha y hora | — |

**Efecto en la visibilidad** (FR-030, R8): para un participante con un visionado `pendiente`, la vista del torneo, las tablas, `GET /api/partidos/:id` y los avisos omiten el marcador y los eventos de ese partido, y la clasificación y las tablas se calculan sin él.

### 7.3 Estadísticas de equipo (`EstadisticasEquipo`)

| Campo | Cambio |
|-------|--------|
| `pases` | Pases **intentados** (corto, largo y al espacio). Ya no incluye los centros. |
| `pasesCompletados` | Igual que `pases`, pero solo los completados. |
| `centros` | **Nuevo**: centros intentados. |
| `precisionPase` | **Nuevo**, derivado: `pasesCompletados / pases`, en porcentaje entero. |
| `secuencias` | **Nuevo**, interno: histograma de pases seguidos por posesión `{ [n]: posesiones }`. Una posesión va de que el equipo gana el balón a que lo pierde; las interrupciones en las que lo conserva no la cortan (FR-024). Lo usa `balance` (SC-007) y no se muestra. |
| `conducciones`, `paredes`, `cambiosOrientacion`, `contraataques` | **Nuevo**, interno: recuentos para SC-007, con las definiciones de research R4. No se muestran. |

### 7.4 Estado del motor (`EstadoMotor`) — cambios

| Campo | Cambio |
|-------|--------|
| `JugadorEnPartido.ancla` | **Nuevo**: `{ x, y }`, el punto de la colocación en coordenadas del equipo. |
| `JugadorEnPartido.posicion` | **Nuevo**: posición efectiva (`Posicion`, o las admitidas por la zona central). |
| `EquipoEstado.perfil` | **Nuevo**: `{ ofensividad, amplitud }` calculados (R13). Sustituye a la consulta de `FORMACIONES[formacion].perfil` en `formacionTactica`. |
| `espacio` | **Nuevo**: `{ jugadores: { [id]: { x, y, vx, vy } }, balon: { x, y, z, vx, vy, accion: AccionEnCurso \| null } }`, en coordenadas absolutas (el local ataca hacia x = 1000) y enteros en décimas de unidad. |
| `balon.zona`, `balon.carril` | Pasan a **derivarse** de `espacio.balon`. Se conservan como lectura para las reglas que los usan (virtudes por zona, dificultad por zona). |
| `posesion` | **Nuevo**: `{ inicioTick, pasesSeguidos }`, para `secuencias`. |

`AccionEnCurso` = `{ tipo, deId, aId?, origen, destino, inicioTick, finTick, aerea }`.

### 7.5 Acción visible y fotograma v2 (no se guardan)

```text
AccionVisible = { tipo: 'pase_corto' | 'pase_largo' | 'pase_espacio' | 'conduccion' | 'regate' | 'centro' | 'tiro' | 'despeje' | 'saque' | 'control',
                  inicioTick, finTick, de: jugadorId, a?: jugadorId, exito: boolean }

Fotograma v2 = number[]  // [tick, bx, by, bz, x0, y0, x1, y1, …], enteros en unidades de campo
                         // jugadores en el orden de `partido.inicio.ordenJugadores`; (-1, -1) = fuera del campo
```

Se emite un fotograma cada 2 ticks, más uno en el inicio y el final de cada acción (R5). Se recalculan al reproducir un partido guardado (R8).

## 8. Avisos — cambios

| Campo | Cambio |
|-------|--------|
| `tipo` | Se añade `'dorsal_asignado'` (FR-038, cuando el partido se resolvió sin el participante). `rival_listo` deja de usarse, porque ya no hay que esperar a que los dos estén listos. |
| `texto` | En un partido entre humanos, `partido_auto_resuelto` **no** incluye el marcador (R8). |

## 9. Preferencias del usuario

Solo en el cliente: `localStorage['fbd.sonido'] = 'activado' | 'silenciado'`. Por defecto está activado. Lo respetan la animación de apertura y cualquier sonido futuro (FR-010, R17). No hay entidad en el servidor.

## 10. Resumen de relaciones (añadidos)

```text
Partido 1─0..2 VisionadoPartido *─1 Participante
Torneo 1─* AportacionJugador *─1 Partido
Alineacion 1─0..11 Colocacion
Zona (estática) ─ determina ─► posicionEfectiva de cada Colocacion
```
