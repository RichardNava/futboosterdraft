# Data Model: Latencia de apertura de partidos y de entrega de sobres

**Spec**: [spec.md](spec.md) | **Research**: [research.md](research.md)

Sin cambios de esquema de base de datos. Las entidades nuevas viven solo en memoria del servidor.

## Desglose de una operación (en memoria, por petición)

| Campo | Tipo | Notas |
|-------|------|-------|
| `operacion` | `'apertura' \| 'entrega_sobre' \| 'eleccion'` | Una elección pasa a `entrega_sobre` si cierra el turno de su mesa (R2). |
| `inicio` | `number` (`performance.now()`) | Al recibir la petición HTTP o el mensaje WebSocket. |
| `fases` | `Record<'cola' \| 'calculo' \| 'bd' \| 'serializacion' \| 'difusion', number>` | ms acumulados; los tramos en paralelo cuentan su tiempo de reloj. |
| `consultas` | `number` | Consultas a PostgreSQL hechas en el contexto de la operación. |

- Al cerrarse: `total = ahora − inicio` y `resto = total − Σ fases`. Se observan las 6 fases (`resto` incluida) en
  `operacion_fase_ms`, el total con `fase="total"` y las consultas en `operacion_consultas`
  ([contracts/desglose.md](contracts/desglose.md)).
- Invariante (FR-001): `resto ≤ 0,1 × total` en la mediana y en el p95. Si no se cumple, falta instrumentar algo.
- Con `MEDIR_FASES=0` no se crea ningún desglose.

## Grupo de aperturas (en memoria, por partida)

| Campo | Tipo | Notas |
|-------|------|-------|
| `secuencia` | `number` | Número de secuencia del comando del grupo en el actor de la partida. |
| `estado` | `'abierto' \| 'en_curso'` | Pasa a `en_curso` cuando el actor empieza su comando; un grupo terminado se descarta. |
| `aperturas` | lista de `{ participanteId, partidoId, modalidad, desglose?, resolver, rechazar }` | En orden de llegada. |

Al resolverse se agrupan por partido (sin repetir):

| Campo | Tipo | Notas |
|-------|------|-------|
| `partidoId` | `string` | Una entrada por partido. |
| `indiceCalendario` | `number` | Índice del cruce en `c.jornada.cruces`; da el orden de aplicación. |
| `esperas` | aperturas de ese partido | Una o dos (los dos humanos) o más (duplicados). |
| `abiertoPorId` | `string` | El participante de la **primera** apertura que llegó (hoy: quien lo resolvió). |
| `resultado` | cálculo terminado o error | De `Promise.allSettled`. |

### Reglas

- **Unirse** (R4): una apertura se une al grupo `abierto` de su partida solo si
  `actor.secuencia === grupo.secuencia`, es decir, si no se ha encolado ningún otro comando después. Si no, se crea
  un grupo nuevo con su propio comando.
- **Orden de aplicación** (FR-006): `indiceCalendario` ascendente. No depende del orden en que terminan los cálculos.
- **Atomicidad** (FR-008): todas las escrituras de los partidos calculados bien van en una transacción. `c.torneo`,
  las modalidades en memoria y `partidosEnCurso` se actualizan después del commit.
- **Respuesta** (aclaración de la spec): ninguna espera se resuelve antes del commit. Si el cálculo de su partido
  falla, esa espera recibe el error (FR-010). Si falla la transacción, todas reciben error.
- **Avisos** (FR-013): `despuesDePartido` (cierre de jornada y `emitirTorneo`) se llama una vez por grupo, después
  del commit.

### Transiciones de un partido entre humanos (sin cambios en sus estados)

```text
programado ──(grupo: cálculo bien + commit)──▶ finalizado
programado ──(cálculo falla o la transacción falla)──▶ programado   (se puede volver a abrir; nada a medio guardar)
finalizado ──(apertura posterior o duplicada)──▶ finalizado        (responde «reproduccion» sin recalcular)
```

## Datos comunes de una emisión de `torneo.actualizado` (en memoria, por emisión)

| Campo | Origen | Consultas |
|-------|--------|----------:|
| `filasJornadas` | `repoTorneo.jornadas(partidaId)` | 1 |
| `partidos` | `repoPartidos.resumenesDePartida(partidaId)` | 1 |
| `pendientesPorParticipante` | `repoVisionados` (nueva consulta por partida, agrupada por participante) | 1 |
| `dorsalesPorParticipante` | `repoEquipo` (nueva consulta por lista de participantes) | 1 |
| `recompensa` | `economia.recompensaDe` solo para el campeón registrado | 0–1 |

La vista de cada humano se construye a partir de estos datos y es idéntica byte a byte a la de hoy (R7).
