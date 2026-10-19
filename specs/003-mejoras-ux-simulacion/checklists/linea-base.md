# Línea base del motor 2.0.0 (commit `c8a1627`)

**Tarea**: T003 (y T091 para SC-010) · **Fecha**: 2026-10-19

El código de `packages/`, `apps/` y `tools/` en `HEAD` (`3588ecf`) es idéntico al de `c8a1627`
(`git diff --stat c8a1627 HEAD -- packages apps tools` vacío), así que la serie de partidos se midió sobre el
árbol de trabajo antes de tocar el motor, con `tools/balance/src/medir.ts`. La línea base de los NPC (T091)
se midió en el worktree `../fbd-base` (`git worktree add ../fbd-base c8a1627`).

## Partidos (equipos sintéticos equilibrados, táctica por defecto)

Equipo `equipoSintetico({ semilla: 'medir' })` (4-4-2, media 80) contra su clon, alternando campo.

| Medida | 1.000 partidos | 300 partidos | research R1 (300, script externo) |
|---|---|---|---|
| Goles por partido | **2,62** | 2,56 | 2,91 |
| Partidos 0-0 | 6,3 % | 5,7 % | 3 % |
| Partidos con ≥ 6 goles | 3,8 % | 4,7 % | — |
| Resultado más frecuente | 1-1: 13,2 % | 1-1: 16,0 % | 1-2: 20,0 % |
| Goles de jugada (normal + lejano + mano a mano) | 79,0 % | 76,4 % | 81,3 % (normal + lejano + mano a mano) |
| Goles de cabeza | 15,4 % | 17,3 % | 15,8 % |
| Goles de falta directa | 2,4 % | 2,3 % | 2,4 % |
| Goles de penalti | 3,2 % | 3,9 % | 3,8 % |
| Goles en propia puerta | 0 % | 0 % | — (no existían) |
| Pases por equipo y partido | 89,8 | 88,9 | 91,8 |
| Pases completados por equipo y partido | 74,9 | 74,1 | — |
| **Conducciones** (conducciones + regates) por equipo y partido | **16,9** | 16,8 | 17,2 |
| Tiros por equipo y partido | 7,9 | 8,2 | — |
| Centros por equipo y partido | 5,3 | 5,4 | — |
| Coste (tsx, sin fotogramas) | 64 ms/partido | 65 ms/partido | ~68 ms/partido |

El motor 2.0.0 no registra la longitud de los pases ni la distancia de los remates (no hay `pasesCortos`,
`pasesLargos`, `golesPorZona` ni `datos.distancia`), así que SC-002 y SC-004 no tienen línea base numérica.

La pequeña diferencia con research R1 (2,91 frente a 2,62 goles) se debe al equipo sintético y a las
semillas: R1 se midió con un script fuera del repositorio. Los porcentajes de penaltis, faltas directas,
cabeza y conducciones coinciden. **Referencia de SC-005**: 16,9 conducciones por equipo y partido, así que el
objetivo del +30 % es **≥ 22,0**.

## NPC (SC-010, T091)

Medido en el worktree `../fbd-base` (`c8a1627`, motor 2.0.0) con `tools/balance/src/referencia.ts` y
`torneoReferencia` de `tools/balance/src/checks/npc.ts` copiados allí: 100 torneos de liga a doble vuelta de 8
por nivel, con el participante de referencia y 7 NPC del nivel. Se cuentan los 14 partidos del participante de
referencia en cada torneo (1.400 por nivel). El PRO prueba sus candidatas con el reloj simulado de 25 ms por
partido de prueba (equivale a su límite de 2 s del servidor, sin depender de la máquina).

| Nivel | Victorias | Empates | Derrotas | % victorias | Error estándar (por torneo) |
|---|---|---|---|---|---|
| amateur | 816 | 257 | 327 | **58,3 %** | 1,7 |
| intermedio | 587 | 297 | 516 | **41,9 %** | 1,9 |
| avanzado | 565 | 251 | 584 | **40,4 %** | 1,9 |
| PRO | 514 | 269 | 617 | **36,7 %** | 2,0 |

**Referencia de SC-010**: contra amateur, ≥ 73,3 % de victorias; contra intermedio, ≥ 56,9 %. Hoy intermedio,
avanzado y PRO están casi empatados: el orden no es estrictamente decreciente con 2 errores estándar.
