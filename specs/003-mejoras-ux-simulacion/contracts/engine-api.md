# Contrato del motor de simulación — cambios de la spec 003

Cambios sobre [001/contracts/engine-api.md](../../001-draft-manager-mvp/contracts/engine-api.md) y [002/contracts/engine-api.md](../../002-mejoras-mvp/contracts/engine-api.md). El motor sigue siendo puro: no hace E/S, no lee el reloj y es determinista con la semilla.

## Entrada

- `EntradaPartido` **no cambia**.
- `parametros.version` debe ser `3.x`. `crearPartido` con unos parámetros `< 3` lanza `VersionNoSoportada` (research R2).
- La entrada no contiene ningún campo que indique si un equipo es de un humano o de un NPC, y no lo contendrá (FR-037, invariante 11).

## Operaciones

```ts
avanzar(estado: EstadoMotor, modo: ModoAvance, opciones?: OpcionesAvance): ResultadoTramo

interface OpcionesAvance {
  fotogramas?: boolean;   // sin cambios (002)
  metricas?: boolean;     // ✚ calcula MetricasJugador (solo herramientas; research R11)
}

interface ResultadoTramo {
  // …campos actuales…
  metricas?: Record<number, MetricasJugador>;   // ✚ solo si opciones.metricas; acumuladas desde el saque inicial
}
```

`aplicarDecision` y `validarDecision` no cambian. El lote atómico (`partido.decisiones`) se compone en el servidor con estas dos funciones sobre una copia del estado (research R17). El motor no añade ninguna operación de lote.

## Salida: eventos

| Evento | `datos` (cambios) |
|---|---|
| `tiro` | `tipo` (TipoTiro), `resultado`, **`distancia`** (m, entero) ✚, **`zonaRemate`** (`area` \| `frontal` \| `lejos`) ✚ |
| `gol` | `tipo` (añade `propia` ✚: gol en propia puerta en un despeje de centro o un tiro desviado; el autor es el defensor y el gol suma al rival), `marcador`, **`distancia`** ✚, **`zonaRemate`** ✚ |
| `penalti` | sin cambios. El penalti solo se señala si el punto de la falta está dentro del área real (research R7). |

La agrupación para la interfaz y las métricas: `jugada` = `normal` + `lejano` + `manoAMano`. `cabeza`, `falta` y `penalti` van aparte. La tanda de penaltis no cuenta.

## Salida: estadísticas

`EstadisticasEquipo` añade `pasesCortos`, `pasesLargos`, `pasesLargosAtras`, `tirosArea`, `tirosFrontal`, `tirosLejos`, `golesPorTipo` y `golesPorZona` ([data-model.md](../data-model.md) §7.2). Los campos existentes no cambian de significado.

## Comportamiento (reglas comprobables)

| Regla | Requisito | Prueba |
|---|---|---|
| El receptor de un pase se elige según la distancia real y la dirección (factores de `pases.factorDireccion`). | FR-016 | `receptor.test.ts`: con un central libre a 40 m por detrás y un compañero a 10 m por delante, el portador del último tercio no elige al central en 1.000 sorteos, salvo en el callejón sin salida |
| Pase largo hacia atrás desde el último tercio solo sin otra opción razonable. | FR-017 | ídem, más SC-004 en `balance` |
| Pase largo con peso reducido salvo que haya un motivo táctico (5 motivos). | FR-016 | `opciones.test.ts` por motivo |
| La probabilidad de tirar y de marcar baja con la distancia real; por encima de 35 m, solo con el portero adelantado. | FR-018 | `tiroDistancia.test.ts` (monotonía y caso del portero adelantado) |
| Los stats modifican la elección de forma acotada (`decision.factores`). | FR-021 | `opciones.test.ts` (monotonía y cotas) más SC-006 |
| `rivalCercano` no elige al defensor más débil; el radio de intervención crece con `quite` y `anticipacion`. | FR-021 | `contexto.test.ts` |
| Penalti por criterio espacial; faltas en duelos aéreos en el área. | FR-020 | `balonParado.test.ts` |

## Invariantes comprobados por pruebas

Se mantienen los invariantes 1 a 9 de las specs 001 y 002. Se añaden dos:

10. **Métricas inocuas**: para cualquier entrada y semilla, `avanzar(…, { metricas: true })` y `avanzar(…, { metricas: false })` producen exactamente los mismos eventos, marcador, estadísticas y estado final. Se prueba con fast-check, con 200 semillas.
11. **Ceguera humano/NPC**: el resultado de un partido depende solo de `EntradaPartido`, la semilla y las decisiones aplicadas. `balance` comprueba SC-010a con 1.000 partidos, con las mismas entradas y cada lado etiquetado como humano o como NPC de cada nivel, y sin decisiones durante el partido.

Además:

- **Equivalencia de modalidades**: 001/SC-008 y 002/SC-010, sin cambios. La rápida y la 2D con la misma semilla dan el mismo partido.
- **Equivalencia del lote**: aplicar un lote `[d1…dn]` válido con el procedimiento atómico del servidor produce el mismo partido que aplicar `d1…dn` una a una en el mismo tick (FR-030).

## Rendimiento

| Medida | Umbral (CI, `bench`) |
|---|---|
| Partido completo sin fotogramas | ≤ 25 ms |
| Partido completo con fotogramas | ≤ 40 ms |
| Con `metricas: true` | ≤ 30 ms (solo herramientas) |

La selección de receptor y la distancia al carril de pase son O(jugadores en el campo) por acción, con aritmética entera.
