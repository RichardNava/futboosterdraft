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
