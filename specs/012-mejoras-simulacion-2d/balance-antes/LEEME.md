# Línea base de la spec 012 (T001, T002)

Antes de tocar el motor (2026-11-08, sobre el commit `2eb3116`):

| Comprobación | Resultado |
| --- | --- |
| `pnpm typecheck` | verde |
| `pnpm lint` | verde |
| `pnpm test` | verde: 111 ficheros, 933 pruebas |
| `pnpm test:equivalence` | verde: 3 ficheros, 32 pruebas |

Ningún fallo previo que atribuir a otra spec.

`informe.html` es el informe de `pnpm balance` de esa misma base (T001); se compara con el de después de la
resolución de los lances al terminar el paso (research R2) en la sección «Comparación» de abajo (T039).

## Comparación (T039)

Después de mover la resolución de lesiones y expulsiones al final del paso (motor de la spec 012):

| | Antes | Después |
| --- | --- | --- |
| Comprobaciones superadas | 47/47 | 47/47 |
| 005/SC-011 (serie 6.1.0): amarillas / rojas / penaltis / lesiones por partido | 3,63 / 0,17 / 0,41 / 0,38 | 3,60 / 0,17 / 0,41 / 0,38 |
| SC-011 naturales frente a penalizados | ✔ | ✔ (68,2 %) |
| 003/SC-009 sin regresiones (001/SC-004 y SC de la 002) | ✔ | ✔ |

Ninguna métrica sale de su umbral: se sigue con el servidor (T039). Las líneas de cada ejecución están en
`comprobaciones.txt` (antes) y `comprobaciones-despues.txt` (después).

Referencias con semilla fija regeneradas: el partido 14 de `packages/engine/tests/fixtures/equivalencia-005.json`
(anotado en su campo `regenerados`) y los escenarios de `tools/fixtures/escenarios/`
(`pnpm --filter @fbd/fixtures generar-escenarios`). `test:equivalence` en verde.

## Ronda 2: parámetros 6.2.0 (T082)

`pnpm balance` con la relajación del que gana de mucho y el 70 % de porteros en el hueco «POR o DEF»: **46/47**.

| | 6.1.0 | 6.2.0 |
| --- | --- | --- |
| 003/SC-001 serie sintética (goles por partido) | ✔ | ✔ 2,65 |
| SC-007 entre equilibrados (goles; % con 8 o más) | ✔ | ✔ 2,71; 0,3 % |
| 005/SC-013 (+5 de media pesa más que cualquier virtud) | ✔ | ✔ +1,195 frente a +0,355 |
| 005/SC-004/Fragil (lesiones por minuto, objetivo ×3 ± 20 %) | ✔ | ✘ ×4,96 (11 → 53 lesiones) |

Frágil es ruido de muestra, no efecto de la 6.2.0 (la relajación no toca las lesiones): con `--solo 005/SC-004/Fragil`
y otras semillas sale ×2,50 (25 → 61, ✔) con `--seed 2` y ×4,55 (12 → 53, ✘) con `--seed 3`. Con tan pocas lesiones en
la serie base la razón oscila mucho; conviene ampliar `n` de esa comprobación en una spec del motor.

Caso real que motivó el cambio (5 partidos del participante del 41-5, 40 repeticiones con otras semillas): de 9,0 /
5,3 / 6,5 / 9,2 / 5,0 goles a favor de media con la 6.1.0 a 4,9 / 3,9 / 4,0 / 4,8 / 3,5 con la 6.2.0.
