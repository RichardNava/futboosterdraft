# Data Model: Mejoras del motor, navegación sin pestañeo y refactorización

Fase 1 del [plan](plan.md). Sin migración de base de datos: todo lo nuevo vive en el estado del motor, en los
parámetros versionados, en un mensaje de WebSocket y en memoria del navegador.

## 1. Parámetros de equilibrado 7.0.0

`PARAMETROS_V7` en `packages/domain/src/parametros/index.ts`, heredando de `PARAMETROS_V6_3`. Los valores marcados
«informe» se fijan iterando con `pnpm balance` ([research R5, R7](research.md)).

| Ruta | Tipo | Valor inicial | Regla |
|------|------|---------------|-------|
| `cansancio.maximo` | number | 0,6 | Tope de `JugadorEnPartido.cansancio` (antes, constante en el código). |
| `cansancio.degradacionPorMinuto` | number | ≈ 0,011 (informe) | Energía 45–55 % al 90' sin rasgos (SC-006). |
| `espacio.rozamientoSuelto` | number | informe | Fracción de velocidad que pierde por tick un balón suelto (R1). |
| `manoAMano.pasilloM` | number | ≈ 4 | Medio ancho del pasillo portador → portería en el que no puede haber rivales de campo. |
| `manoAMano.margenAtrasM` | number | ≈ 1 | Un rival hasta este margen por detrás del portador aún cuenta como delante. |
| `manoAMano.distanciaBaseM` | number | ≈ 14 | Distancia de disparo con remate 70. |
| `manoAMano.distanciaPorRemateM` | number | ≈ 1,5 | Metros más por cada 10 puntos de remate. |
| `manoAMano.paraleloM` | number | ≈ 2 | Un compañero hasta este margen por detrás cuenta como «en paralelo». |
| `manoAMano.errorDecision` | number | informe | Probabilidad máxima de saltarse la directriz (con visión 70; baja con más visión). |
| `idaVuelta.avanceMinimoM` | number | ≈ 3 | Avance por debajo del cual un pase de ida y vuelta «no gana terreno». |
| `fueraDeJuego.toleranciaM` | number | 0,3 | Empate con el penúltimo defensor ⇒ legal. |
| `fueraDeJuego.holguraMaxM` | number | informe | Lo que se pasa de la línea un atacante con desmarque/posicionamiento bajo. |
| `fueraDeJuego.pesoReceptor` | number | informe | Multiplicador máximo del peso de un receptor en fuera de juego. |
| `decision.factores.*`, `acciones.pendiente*`, `espacio.velocidadJugador*`, `tiro.*` | — | informe | Peso de las estadísticas (US5, R7). |

**Se retiran**: `acciones.probabilidadManoAMano`, `acciones.probabilidadFueraDeJuegoBase`,
`tacticas.lineaAdelantada.fuerasDeJuegoProvocados` (opcionales en el tipo para las 6.x, que ya no se simulan).

`VERSION_MAYOR_SOPORTADA` = 7; `parametrosActuales()` = 7.0.0 ([R14](research.md#r14-versión-de-parámetros-y-partidos-antiguos-fr-022)).

## 2. Estado del motor

### 2.1 `EstadoEspacio` (`packages/engine/src/estado/estado.ts`)

| Campo | Tipo | Nuevo | Regla |
|-------|------|-------|-------|
| `velocidadBalon` | `{ x: number; y: number }` | sí | Décimas por tick, enteras. La fijan `volar`/`conducir` al cerrar; un balón suelto la conserva y frena con `rozamientoSuelto`; cero con el balón pegado a un jugador o parado. |

**Invariante (FR-001)**: entre dos ticks consecutivos, la dirección o el módulo de `velocidadBalon` solo cambian
(salvo el rozamiento) si hay una acción abierta con un jugador junto al balón o una reanudación (`saque`).

### 2.2 `JugadorEnPartido.cansancio` (sin cambio de forma)

Fracción de stats perdida, de 0 a `cansancio.maximo`. Fuente única de la energía:

```text
energia      = round(100 × (1 − cansancio / cansancio.maximo))   // 0–100
penalizacion = round(100 × cansancio)                           // % que pierden sus stats
```

### 2.3 Estado de energía del jugador (entidad de la spec)

No se guarda: se calcula con `energiaDe(estado, jugador)` en el momento de la pausa.

| Campo | Tipo | Origen |
|-------|------|--------|
| `jugadorId` | int | `JugadorEnPartido.id` |
| `energia` | int 0–100 | fórmula 2.2 |
| `penalizacion` | int 0–60 | fórmula 2.2 |
| tramo | derivado en la web | `tramoEnergia(energia)` (§4) |

Existe solo para los jugadores con `enCampo` en el tick de la pausa (FR-016, FR-018).

### 2.4 Evento de fuera de juego (ya existe; se completa)

`EventoPartido` tipo `fuera_de_juego` con `{ rol: 'autor', jugadorId }`, `minuto`, `lado`. Cambian:

- la **reposición**: saque de falta del equipo defensor desde la posición del infractor en el momento del pase (antes,
  una celda fija);
- el **origen**: sale de `enFueraDeJuego` con las posiciones reales (antes, un sorteo).

La posición del infractor y del penúltimo defensor no se añaden al evento público (no las pide ninguna pantalla); van
en las métricas del informe para SC-005 (`metricas.ts`: `fuerasDeJuego[]` con x del infractor, x del penúltimo y x del
balón).

### 2.5 `EstadoPosesion.ultimoPase` (sin cambio de forma)

`{ de, a }` ya existe; R3 lo usa además para excluir al último pasador. Se añade `avance` (x ganada por ese pase, en
décimas) para saber si «no ganó terreno».

## 3. Mensaje `partido.pausa_decision`

Ver [contracts/protocolo.md](contracts/protocolo.md). Campo nuevo opcional `energia: { jugadorId, energia,
penalizacion }[]`.

## 4. Tramos del indicador (web)

`tramoEnergia(energia: number): TramoEnergia`, pura, en `apps/web/src/componentes/IndicadorEnergia.tsx`.

| Tramo | Energía | Cara | Color (token) | Penalización visible |
|-------|---------|------|---------------|----------------------|
| `fresco` | 80–100 | sonriente | `--energia-fresco` (verde) | no |
| `bien` | 60–79 | algo menos sonriente | `--energia-bien` (verde claro) | sí |
| `medio` | 40–59 | seria | `--energia-medio` (amarillo) | sí |
| `cansado` | 20–39 | triste | `--energia-cansado` (naranja) | sí |
| `agotado` | 0–19 | muy triste | `--energia-agotado` (rojo) | sí |

Los límites (80, 60, 40, 20) pertenecen al tramo superior. La penalización se muestra con energía < 80 (Assumptions).

## 5. Caché de navegación (web, en memoria)

`apps/web/src/api/cache.ts`.

| Campo | Tipo | Regla |
|-------|------|-------|
| `clave` | string | Ruta de la API con sus parámetros (`/api/perfil`, `/api/mis-partidas?antes=…`). |
| `valor` | unknown | Última respuesta correcta. |
| `error` | `ErrorApi \| null` | Último error si nunca hubo valor. |
| `enVuelo` | `Promise \| null` | Una sola petición por clave a la vez. |
| `fresco` | boolean (de la llamada, no de la entrada) | Datos de decisión: nunca se sirven desde `valor` (FR-025). |

Transiciones: `vacía → cargando → con valor`; `con valor → revalidando → con valor` (sin estado visible);
`invalidar(prefijo)` borra las entradas tras una mutación.

## 6. Huella de equivalencia

`packages/engine/tests/fixtures/huella-014.json`:

| Campo | Tipo | Regla |
|-------|------|-------|
| `version` | `'7.0.0'` | Parámetros con los que se generó. |
| `partidos[]` | `{ semilla, marcador, eventos, estadisticas, hashFotogramas }` | 100 partidos. |
| `drafts[]` | `{ semilla, picks }` | 20 drafts. |

Se genera una vez al cerrar US5 y no se regenera en US7 (FR-030).
