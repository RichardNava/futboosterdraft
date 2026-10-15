# Data Model — Fútboosterdraft MVP

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Research**: [research.md](./research.md)

Modelo del dominio (`packages/domain`) y su persistencia (`apps/server`). Los nombres de campo y los
valores enumerados van en español y **sin tildes** en el código y en los datos (p. ej. `Epico`,
`Capitania`); las tildes solo aparecen en los textos de la interfaz. Las referencias `FR-xxx` y
`SC-xxx` remiten a [spec.md](./spec.md).

---

## 1. Catálogo

### 1.1 Jugador (`Jugador`)

| Campo | Tipo | Reglas |
|-------|------|--------|
| `id` | entero | Único en todo el catálogo. |
| `nombre`, `apellidos` | texto | No vacíos. |
| `nacionalidad` | texto | Código ISO 3166-1 alfa-3 o nombre normalizado (decidido en el *seed*). |
| `fecha_nacimiento` | fecha ISO `YYYY-MM-DD` | Válida. |
| `altura` | entero (cm) | 150–215. |
| `demarcacion` | `'POR' \| 'DEF' \| 'MED' \| 'DEL'` | FR-017. |
| `posicion` | `Posicion[]` (≥ 1, sin repetidos) | FR-018. Todas compatibles con la demarcación (ver 1.2). |
| `historia` | texto | Puede estar vacío. |
| `stats` | `StatsPOR \| StatsDEF \| StatsMED \| StatsDEL` | Exactamente las 6 claves de su demarcación (FR-019); enteros 1–99 (FR-020). |
| `media` | número | **Derivado**: promedio de los 6 stats; se recalcula al cargar y debe coincidir (±0,01) con el valor del fichero. |
| `specials` | `Special[]` (sin repetidos) | Cantidad ≤ máximo del nivel (FR-021); permitidos según la demarcación (FR-022) y la regla de carrileros (FR-023). |
| `nivel` | `'Superclase' \| 'Epico' \| 'Legendario' \| 'GOAT'` | Sin tildes en código y datos; la interfaz muestra "Épico". |
| `coleccion` | texto | En el MVP, `"Core"`. |

**Posiciones por demarcación**:
- POR: `POR`.
- DEF: `LI, LD, DCI, DCD, CI, CD`.
- MED: `MD, MC, MII, MID, MCO`.
- DEL: `DC, SD, EI, ED`.

Un jugador PUEDE tener posiciones de otra línea (p. ej. un MED con `EI`) siempre que no sea `POR`. Un POR solo tiene `POR`. *(Supuesto del plan: la especificación no lo prohíbe y aporta riqueza; si se quiere restringir, basta con endurecer la validación.)*

**Specials permitidos**:
- Siempre: los 15 genéricos.
- Además, los de su demarcación.
- Un DEF con `CI` o `CD` en `posicion` puede tener también los de MED (FR-023).

**Validación de carga (FR-024)**: el *seed* rechaza el fichero entero si cualquier jugador incumple
alguna regla, e informa del `id` y de la regla incumplida.

### 1.2 Tipos enumerados

- `Posicion` = `POR | LI | LD | DCI | DCD | CI | CD | MD | MC | MII | MID | MCO | DC | SD | EI | ED`.
- `Special`:
  - Genéricos (15): `Incansable, Motivador, LanzadorFaltas, LanzadorPenalties, Aura, Capitania, Filigranas, FortalezaMental, Intimidante, Elegante, Presionador, RecuperadorTrasPerdida, Carismatico, Potente, Robusto`.
  - POR: `Parapenalties, OneToOne, Santo, Ordenabarreras, JugadorDeCampo`.
  - DEF: `Infranqueable, Jerarquia, Volador, Libero, MuroDefensivo`.
  - MED: `Llegador, BoxToBox, PrimerToque, Todocampista, JugadorEntreLineas`.
  - DEL: `Matador, Rematador, Cabeceador, Desbordante, GuanteEnElPie`.

### 1.3 Colección (`Coleccion`)

| Campo | Tipo | Reglas |
|-------|------|--------|
| `id` | texto | `"Core"` en el MVP. |
| `jugadores` | `Jugador[]` | Debe cubrir la distribución mínima de la especificación (300 recomendados; el *seed* avisa si hay menos de 243 en el reparto equilibrado). |

### 1.4 Formación (`Formacion`) — datos estáticos

| Campo | Tipo | Reglas |
|-------|------|--------|
| `id` | `'3-4-3' \| '4-3-3' \| '4-4-2' \| '4-4-2-diamante' \| '4-2-3-1' \| '3-5-2' \| '5-4-1' \| '5-3-2' \| '4-5-1' \| '3-3-3-1'` | FR-025. |
| `casillas` | `Casilla[11]` | Una `POR` más 10 de campo según la tabla de Assumptions. |
| `perfil` | `{ ofensividad: -2..2, amplitud: -2..2 }` | Alimenta el estilo de juego (FR-034). Valores de ofensividad iniciales según la tabla de Assumptions de la especificación (3-4-3 y 3-3-3-1 +2 … 5-4-1 −2); se ajustan en los parámetros de equilibrado. Más ofensividad = más ocasiones propias **y** más ocasiones concedidas. |

`Casilla` = `{ id: string, posicionesAdmitidas: Posicion[], zona: {x, y} }`:
- `posicionesAdmitidas` normalmente tiene un solo código.
- La casilla del central del medio admite `['DCI', 'DCD']` (FR-025a).
- `zona` es la posición de referencia en el campo, que usan el motor y el 2D.

### 1.5 Parámetros de equilibrado (`ParametrosEquilibrado`) — versionados

Fichero versionado (`version: semver`) en `packages/domain/src/parametros/`, porque lo usan el generador de sobres, la pantalla de alineación y el motor. Contiene, entre otros:
- `penalizacionFueraPosicion` (0,25) y `penalizacionPorteria` (0,60).
- `cansancio`: minuto de inicio (65; 55 con Presión alta), ritmo de degradación y factores de Incansable y Motivador.
- Bonificaciones de los specials que la especificación no cuantifica.
- Pendiente de la función logística de los duelos.
- Probabilidades de falta, de tarjeta y de lesión, y el reparto de gravedad: leve, media, grave y larga duración (2 %).
- Efectos de cada opción táctica y de cada formación.
- Probabilidades de los sobres: hueco "POR o DEF" al 50 %, carta alta GOAT al 20 %.

Cada `Partido` guarda la versión de parámetros con la que se jugó.

---

## 2. Usuarios y partidas

### 2.1 Usuario (`Usuario`)

| Campo | Tipo | Reglas |
|-------|------|--------|
| `id` | UUID | — |
| `tipo` | `'registrado' \| 'invitado'` | FR-000. |
| `email` | texto \| null | Obligatorio y único si es `registrado`. |
| `apodo` | texto | 3–20 caracteres. |
| `creadoEn` | fecha y hora | — |

La gestión de credenciales y sesiones corresponde a la librería de autenticación (R12) y queda fuera de este modelo.

### 2.2 Partida (`Partida`)

| Campo | Tipo | Reglas |
|-------|------|--------|
| `id` | UUID | — |
| `anfitrionId` | `Usuario.id` | — |
| `modo` | `'liga' \| 'playoff' \| 'mixto'` | — |
| `numParticipantes` | entero | Liga 4–8; playoff ∈ {4, 8, 16}; mixto = 8 (FR-051 a FR-053). |
| `tipoSimulacion` | `'rapida' \| '2d'` | Se aplica a todo el torneo (FR-004). |
| `ritmo` | `'directo' \| 'asincrono'` | FR-056. Un invitado solo puede usar `directo`. |
| `plazoJornadaHoras` | entero | 24 por defecto; solo con `asincrono`. |
| `npcConfig` | `{ nivel: NivelNPC }[]` | NPC añadidos por el anfitrión; `PRO` solo aquí (FR-059). |
| `colecciones` | `string[]` | Colecciones habilitadas para generar los sobres (FR-015). En el MVP, siempre `['Core']`. |
| `tiempos` | `{ busquedaS, turnoDraftS, preparacionS, preparacionInicialS, descansoS }` | Por defecto: 180, 45, 180, 300, 120. |
| `estado` | ver transiciones | — |
| `semilla` | entero de 128 bits (hex) | Semilla raíz; de ella se derivan las de mesas y partidos. |

**Restricción**: si el anfitrión es `invitado`, entonces `ritmo = 'directo'` y `numParticipantes − 1` plazas son NPC (FR-000).

**Transiciones de `estado`**:

```text
buscando ──(plazas completas | vence búsqueda | anfitrión inicia)──► en_draft
en_draft ──(todas las mesas terminan)──► en_torneo
en_torneo ──(final jugada | última jornada de liga)──► terminada
buscando ──(anfitrión cancela)──► cancelada
cualquiera ──(partida de invitado: cierra sesión | 10 min seguidos sin conexión)──► abandonada
```

### 2.3 Participante (`Participante`)

| Campo | Tipo | Reglas |
|-------|------|--------|
| `id` | UUID | — |
| `partidaId` | `Partida.id` | — |
| `tipo` | `'humano' \| 'npc'` | — |
| `usuarioId` | `Usuario.id` \| null | Obligatorio si `humano`. |
| `nivelNPC` | `'amateur' \| 'intermedio' \| 'avanzado' \| 'PRO'` \| null | Obligatorio si `npc`. El relleno automático elige al azar entre los tres primeros (FR-059). |
| `nombreEquipo` | texto | Generado si no se indica. |
| `equipaciones` | `{ primera: Equipacion, segunda: Equipacion }` | `Equipacion = { principal: color hex, secundario: color hex }`. Se asignan al azar al terminar el draft y son editables (FR-031b). Local: primera. Visitante: primera, salvo que su color principal se confunda con el del local (distancia de color por debajo del umbral de los parámetros); entonces, segunda. |
| `mesaId`, `asiento` | `MesaDraft.id`, entero 0..N−1 | Asiento fijo (FR-005). |
| `estadoConexion` | `'conectado' \| 'desconectado'` | Solo en tiempo de ejecución. |
| `controladoPorNPC` | booleano | `true` si un humano abandonó (Edge Cases); en ese caso, nivel intermedio. |

---

## 3. Draft

### 3.1 Mesa de draft (`MesaDraft`)

| Campo | Tipo | Reglas |
|-------|------|--------|
| `id` | UUID | — |
| `partidaId` | `Partida.id` | Playoff de 16: 2 mesas; resto: 1. |
| `numParticipantes` | entero 4–8 | FR-006. |
| `semilla` | hex | Derivada de la partida; reproduce la generación de sobres (R16). |
| `ronda` | 1 \| 2 \| 3 | Sobre en juego. |
| `turno` | 1..8 | Turno dentro de la ronda. |
| `venceEn` | fecha y hora | Hora absoluta de fin del turno actual. |
| `estado` | `'generando' \| 'en_turno' \| 'resolviendo' \| 'terminada'` | — |

**Dirección de paso**: con N asientos, el asiento `i` entrega su sobre a `(i + 1) mod N` en las rondas 1 y 3 (izquierda) y a `(i − 1 + N) mod N` en la ronda 2 (derecha). Convención: "izquierda" = asiento siguiente en el sentido de las agujas del reloj visto desde arriba.

**Transiciones** (un ciclo por turno):

```text
generando ──(N·3 sobres creados y validados)──► en_turno(r=1,t=1)
en_turno ──(todos han elegido | vence venceEn → auto-elección)──► resolviendo
resolviendo ──(t < 8)──► en_turno(r, t+1)    [los sobres rotan según r]
resolviendo ──(t = 8, r < 3)──► en_turno(r+1, 1)
resolviendo ──(t = 8, r = 3)──► terminada
```

### 3.2 Sobre (`Sobre`)

| Campo | Tipo | Reglas |
|-------|------|--------|
| `id` | UUID | — |
| `mesaId`, `ronda` | — | — |
| `asientoOrigen` | entero | Participante que lo abre. |
| `cartas` | `Jugador.id[8]` | FR-014: 1 POR o DEF, 2 DEF, 3 MED, 2 DEL; 4 Superclase, 2 Epico, 1 Legendario y 1 alta (Legendario o GOAT). |
| `restantes` | `Jugador.id[]` | Se reduce en 1 en cada turno. |
| `poseedorActual` | asiento | Calculado con la dirección de la ronda. |

**Invariante de mesa**: ningún `Jugador.id` aparece en dos sobres de la misma mesa (FR-011).

### 3.3 Elección (`Eleccion`)

| Campo | Tipo | Reglas |
|-------|------|--------|
| `id` | UUID | — |
| `mesaId`, `ronda`, `turno`, `participanteId` | — | **Única** por (mesa, ronda, turno, participante) (FR-010). |
| `sobreId`, `jugadorId` | — | `jugadorId` ∈ `sobre.restantes` en ese turno. |
| `origen` | `'manual' \| 'auto' \| 'npc'` | `auto` = venció el tiempo (FR-009). |
| `requestId` | texto \| null | Para descartar duplicados (FR-062). |
| `registradaEn` | fecha y hora | Debe ser ≤ `venceEn`. |

Mientras el turno está abierto, la elección solo se envía al propio participante. El resto solo sabe "ha elegido / no ha elegido" (FR-007, FR-054a).

### 3.4 Plantilla (`Plantilla`)

| Campo | Tipo | Reglas |
|-------|------|--------|
| `participanteId` | — | 1:1. |
| `jugadores` | `Jugador.id[24]` | Derivada de sus 24 elecciones (FR-012). Visible para todos los participantes al terminar el draft (FR-054a). |
| `dorsales` | `{ [jugadorId]: 1..99 }` \| null | `null` hasta la primera alineación. Entonces se asignan según FR-031a: por casilla (POR 1, LD/CD 2, LI/CI 3, DCD 4, DCI 5, MD 6, MC/MII/MID 8, MCO 10, EI 7, DC 9, ED 11); si dos casillas comparten dorsal, lo recibe la primera en el orden de la formación; aleatorios libres para el resto. **Únicos** en la plantilla. Fijos para todo el torneo; solo cambian si el participante los edita. |

---

## 4. Equipo

### 4.1 Alineación (`Alineacion`)

| Campo | Tipo | Reglas |
|-------|------|--------|
| `participanteId` | — | — |
| `version` | entero | Crece con cada confirmación; el partido guarda la versión usada. |
| `formacion` | `Formacion.id` | — |
| `titulares` | `{ casillaId, jugadorId }[11]` | Jugadores distintos de la plantilla y disponibles (sin baja); una casilla cada uno (FR-026). |
| `suplentes` | `Jugador.id[0..7]` | De la plantilla, disponibles, no titulares. |
| `tactica` | `Tactica` | Ver 4.2. |
| `lanzadores` | `{ penaltis, faltas, corners: Jugador.id, tanda: Jugador.id[5] }` | Titulares; propuestos automáticamente y editables (FR-029a). |
| `confirmadaEn` | fecha y hora | — |

**Valores derivados** (no se guardan): stats efectivos por casilla, aplicando la penalización por posición (FR-027, FR-025a y la excepción de Todocampista) y los specials de equipo, para mostrarlos en pantalla (FR-028).

**Alineación automática (FR-031 y Edge Cases)**: elige la formación y la asignación que maximizan la suma de medias efectivas con el mínimo de jugadores fuera de posición. Se usa el mismo evaluador que los NPC (R9, perfil "intermedio").

### 4.2 Táctica (`Tactica`) — FR-029

| Campo | Tipo | Por defecto | Incompatibilidades |
|-------|------|-------------|--------------------|
| `sistemaDefensivo` | `'zona' \| 'individual'` | `zona` | — |
| `alturaBloque` | `'catenaccio' \| 'medio' \| 'presion_alta'` | `medio` | — |
| `lineaAdelantada` | booleano | `false` | No con `catenaccio`. |
| `estiloConBalon` | `'equilibrado' \| 'contraataque' \| 'combinativo'` | `equilibrado` | — |
| `juegoVertical` | booleano | `false` | No con `combinativo`. |

El dominio y el servidor rechazan las combinaciones incompatibles (FR-030).

---

## 5. Torneo

### 5.1 Torneo (`Torneo`)

| Campo | Tipo | Reglas |
|-------|------|--------|
| `partidaId` | — | 1:1. |
| `fase` | `'liga' \| 'eliminatoria'` | El mixto pasa de `liga` a `eliminatoria`. |
| `jornadas` | `Jornada[]` | Generadas al terminar el draft. |
| `campeonId` | `Participante.id` \| null | — |

**Calendario de liga**: todos contra todos con el método del círculo y vuelta en espejo. Con N impar, en cada jornada descansa un equipo. Por participante: 2 × (N − 1) partidos (FR-051, SC-012).

**Cuadro del playoff**: cruces de la primera ronda por sorteo con la semilla de la partida. Con 16, los octavos enfrentan a participantes de mesas distintas (FR-052). En el mixto: 1.º contra 4.º y 2.º contra 3.º (FR-053).

### 5.2 Jornada (`Jornada`)

| Campo | Tipo | Reglas |
|-------|------|--------|
| `id`, `torneoId`, `numero` | — | — |
| `tipo` | `'liga' \| 'octavos' \| 'cuartos' \| 'semifinal' \| 'final'` | — |
| `abreEn`, `venceEn` | fecha y hora \| null | `venceEn` solo en ritmo asíncrono. |
| `estado` | `'pendiente' \| 'abierta' \| 'cerrada'` | Se cierra cuando terminan todos sus partidos; entonces se abre la siguiente (FR-056a). |

### 5.3 Clasificación (derivada)

Por participante: `pj, g, e, p, gf, gc, dg, pts`. Se ordena por `pts`, luego `dg`, luego `gf`, luego el enfrentamiento directo (puntos y después diferencia de goles entre los empatados) y, en último lugar, un sorteo con semilla (FR-051).

### 5.4 Baja (`Baja`) y contador de amarillas

| Campo | Tipo | Reglas |
|-------|------|--------|
| `id`, `torneoId`, `participanteId`, `jugadorId` | — | — |
| `motivo` | `'roja' \| 'acumulacion_amarillas' \| 'lesion'` | — |
| `gravedad` | `'leve' \| 'media' \| 'grave' \| 'larga'` \| null | Solo para lesiones: 1, 2, 3 o 5 partidos. |
| `partidoOrigenId` | — | — |
| `partidosRestantes` | entero ≥ 0 | Baja en 1 en cada partido que juega **su equipo**; con 0 deja de estar activa (FR-043). |

`ContadorAmarillas` = `{ torneoId, jugadorId, participanteId, amarillas: 0..2 }`:
- Solo se usa en la fase `liga`.
- Al llegar a 3, se crea una `Baja` de tipo `acumulacion_amarillas` con 1 partido y el contador vuelve a 0.
- Las amarillas de una expulsión por doble amarilla no cuentan.
- Al pasar a la fase eliminatoria del mixto, los contadores se ponen a 0 y las bajas activas se mantienen.

---

## 6. Partido

### 6.1 Partido (`Partido`)

| Campo | Tipo | Reglas |
|-------|------|--------|
| `id`, `jornadaId` | — | — |
| `localId`, `visitanteId` | `Participante.id` | — |
| `eliminatoria` | booleano | Determina si hay prórroga y penaltis (FR-041). |
| `semilla` | hex | Derivada de la semilla de la partida y del id del partido. |
| `versionParametros` | semver | R7. |
| `alineacionesIniciales` | `{ local, visitante }` (instantáneas) | Visibles para el rival solo al empezar el partido (FR-054a). |
| `decisiones` | `DecisionPartido[]` | Registro ordenado; permite reproducir el partido (FR-040). |
| `estado` | ver transiciones | — |
| `marcador` | `{ local, visitante, penaltis?: {local, visitante} }` | — |
| `estadisticas` | `{ posesion, tiros, tirosPuerta, corners, faltas, amarillas, rojas, fuerasDeJuego }` por equipo | FR-047. |
| `eventos` | `EventoPartido[]` | Ver 6.3. |
| `resueltoAutomaticamente` | booleano | `true` si venció el plazo asíncrono (FR-056a). |

**Transiciones**:

```text
programado ──(inicio)──► primera_parte ──► descanso ──(ambos «Seguir» | vence)──► segunda_parte
segunda_parte ──(no eliminatoria | no empate)──► finalizado
segunda_parte ──(eliminatoria y empate)──► pre_prorroga ──► prorroga ──(empate)──► penaltis ──► finalizado
prorroga ──(no empate)──► finalizado
```

En la modalidad 2D, además, cada interrupción del juego es un **punto de decisión** dentro de cada parte (R7, R11).

### 6.2 Decisión de partido (`DecisionPartido`)

| Campo | Tipo | Reglas |
|-------|------|--------|
| `participanteId` | — | — |
| `tipo` | `'sustitucion' \| 'formacion' \| 'tactica' \| 'lanzadores' \| 'recolocacion'` | — |
| `datos` | según el tipo | Validados por el dominio. Hasta 5 sustituciones más 1 en la prórroga; un jugador sustituido no vuelve (FR-042). |
| `solicitadaEnTick`, `aplicadaEnTick` | entero | `aplicadaEnTick` = siguiente interrupción (2D) o inicio del siguiente tramo (rápida). |
| `requestId` | texto | Para descartar duplicados. |

### 6.3 Evento de partido (`EventoPartido`)

| Campo | Tipo |
|-------|------|
| `tick` | entero (segundo de juego; la prórroga continúa a partir de 5.400) |
| `minuto` | texto mostrable (`"45+2'"`) |
| `tipo` | `'gol' \| 'ocasion' \| 'tiro' \| 'parada' \| 'falta' \| 'amarilla' \| 'roja' \| 'lesion' \| 'sustitucion' \| 'corner' \| 'fuera_de_juego' \| 'penalti' \| 'interrupcion' \| 'inicio_tramo' \| 'fin_tramo' \| 'tanda_lanzamiento'` |
| `equipo` | `'local' \| 'visitante'` |
| `jugadores` | `{ rol: 'autor' \| 'asistente' \| 'defensor' \| 'portero' \| 'entra' \| 'sale', jugadorId }[]` |
| `datos` | según el tipo (p. ej. `gravedad` en una lesión, `resultado` en un lanzamiento de la tanda) |
| `relevante` | booleano: aparece en el resumen de la simulación rápida (FR-044) |

**Fotogramas 2D** (no se guardan, se recalculan al reproducir): `{ tick, balon: {x, y}, jugadores: {jugadorId: {x, y}}[] }`, emitidos cada 1 s de juego.

---

## 7. Avisos

### 7.1 Aviso (`Aviso`)

| Campo | Tipo | Reglas |
|-------|------|--------|
| `id`, `usuarioId` | — | — |
| `tipo` | `'jornada_abierta' \| 'rival_listo' \| 'plazo_proximo' \| 'partido_auto_resuelto' \| 'torneo_terminado'` | FR-056b. |
| `partidaId`, `partidoId?` | — | — |
| `leido` | booleano | — |
| `enviadoEmailEn` | fecha y hora \| null | — |

---

## 8. Resumen de relaciones

```text
Usuario 1─* Participante *─1 Partida 1─1 Torneo 1─* Jornada 1─* Partido
Partida 1─* MesaDraft 1─* Sobre      MesaDraft 1─* Eleccion *─1 Participante
Participante 1─1 Plantilla *─* Jugador(Core)
Participante 1─* Alineacion (versionada)   Partido *─2 Alineacion (instantánea)
Torneo 1─* Baja / ContadorAmarillas (por jugador y participante)
Partido 1─* EventoPartido, 1─* DecisionPartido
Usuario 1─* Aviso
```
