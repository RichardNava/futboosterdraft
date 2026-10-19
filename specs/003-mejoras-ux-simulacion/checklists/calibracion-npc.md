# Calibración de los errores de los NPC (T097)

`npc.errores` en `packages/domain/src/parametros/v3.json`, medido con el participante de referencia contra 7 NPC de
cada nivel (`003/SC-010`), la equivalencia humano/NPC (`003/SC-010a`) y la revisión de drafts (`003/SC-010b`).

**Objetivos (003/SC-010)**: contra amateur e intermedio, más victorias que derrotas y al menos 15 puntos sobre la
línea base (amateur 58,3 %, intermedio 41,9 %; ver [linea-base.md](./linea-base.md)); descenso ordenado de amateur a
PRO (cada paso, más de 2 errores estándar); contra PRO, ≥ 10 %.

## Ronda 1: valores iniciales de data-model §6 (30 torneos por nivel)

| Nivel | probabilidad | coste máximo | Victorias de la referencia |
|---|---|---|---|
| amateur | 350 | 6 | 58,6 % ± 2,3 |
| intermedio | 200 | 4 | 45,2 % ± 4,0 |
| avanzado | 80 | 2 | 37,6 % ± 4,2 |
| PRO | 25 | 1,5 | 32,4 % ± 3,6 |

`003/SC-010a` ✔ (300 de 300 partidos idénticos) · `003/SC-010b` ✔ (errores por draft 7,00 · 4,00 · 0,55 · 0,35; PRO con
dudosa en el 100 % de los drafts) · `003/SC-010` ✘ (amateur e intermedio por debajo de la línea base + 15).

## Sonda (`tools/balance/src/sondaNPC.ts`, 20 torneos)

| Configuración | Victorias de la referencia |
|---|---|
| amateur sin errores | 54,3 % ± 4,3 |
| amateur 350 / 6 | 63,9 % ± 3,8 |
| amateur 700 / 12 | 77,1 % ± 3,2 |
| intermedio 450 / 9 | 63,2 % ± 4,8 |
| avanzado 150 / 4 | 32,1 % ± 3,8 |

## Ronda 2: amateur 700 / 12, intermedio 450 / 9, avanzado 250 / 5, PRO 25 / 1,5 (100 torneos por nivel)

Con los parámetros del motor de la ronda 7 de [calibracion-motor.md](./calibracion-motor.md) (5.361,8 s):

| Nivel | Victorias de la referencia | Línea base + 15 |
|---|---|---|
| amateur | 80,1 % ± 1,4 (V 1121 / E 123 / D 156) | 73,3 % ✔ |
| intermedio | 56,6 % ± 2,0 (V 792 / E 254 / D 354) | 56,9 % ✘ (por 0,3 puntos) |
| avanzado | 40,2 % ± 2,2 | — |
| PRO | 32,5 % ± 2,1 | ≥ 10 % ✔ |

Descenso ordenado ✔. `003/SC-010a` ✔ (1.000 de 1.000) · `003/SC-010b` ✔ (errores por draft 16,15 · 10,40 · 4,30 · 0,35;
PRO con dudosa en el 100 %).

## Ronda 3: intermedio 500 / 10

Medición interrumpida: la validación con personas (hallazgos H12 y H13) pidió más errores antes de terminarla.

## Ronda 4 (valores finales): +100 milésimas por familia (H13)

amateur 800 / 12, intermedio 600 / 10, avanzado 350 / 5, PRO 125 / 1,5 (`automatico` 0 / 0). Con el motor tras H8 y H11
(100 torneos por nivel, 4.121,9 s):

| Nivel | Victorias de la referencia | Línea base + 15 |
|---|---|---|
| amateur | 83,6 % ± 1,0 (V 1171 / E 112 / D 117) | 73,3 % ✔ |
| intermedio | 63,1 % ± 1,7 (V 883 / E 218 / D 299) | 56,9 % ✔ |
| avanzado | 43,2 % ± 2,1 (V 605 / E 260 / D 535) | — |
| PRO | 33,9 % ± 1,9 (V 474 / E 255 / D 671) | ≥ 10 % ✔ |

**003/SC-010 ✔** (descenso ordenado) · **003/SC-010a ✔** (1.000 de 1.000 partidos idénticos) · **003/SC-010b ✔** (errores
por draft 18,75 · 14,50 · 5,85 · 1,60; PRO con dudosa en el 100 % de los drafts).
