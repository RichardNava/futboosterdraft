# Contrato: informe de equilibrado

Comprobaciones nuevas o cambiadas en `tools/balance` (Principio IX: cada criterio, con su objetivo, el valor medido y
si se cumple).

## B1. Comprobaciones

| Id | Fichero | Serie | Criterio |
|---|---|---|---|
| `015/SC-001` | `checks/curvas015.ts` | ninguna (cálculo directo) | Los nueve duelos de FR-002 dentro de su rango; el detalle da cada valor |
| `015/SC-002a` | `checks/motor015.ts` | sintética A/B: DEL titular con regate 95 contra 75 | Intentos de regate y conducción por partido ≥ +40 %; completados ≥ +60 % |
| `015/SC-002b` | `checks/motor015.ts` | Core: el mejor regateador del catálogo, titular contra equipos equilibrados | Supera a algún defensor (regate o conducción ganados ≥ 1) en ≥ 90 % de los partidos |
| `015/SC-003` | `checks/motor015.ts` | sintética A/B: centrales con Cabeceador o sin ella | Más `aereosGanados` y más goles de cabeza a balón parado, con diferencia significativa |
| `015/SC-004` | `checks/motor015.ts` | sintética A/B: receptor +15 de desmarque; marcador +15 de marcaje | Con desmarque, más `recibidoLibre` y más pases completados recibidos; con marcaje, menos `recibidoLibre` del rival; las dos significativas |
| `015/SC-005` | `checks/motor015.ts` | sintética A/B: +15 de técnica | `controlesPerdidos / controlesPresion` ≥ 15 % menor |
| `015/SC-006` | `checks/motor015.ts` | sintética A/B: central con 95 de liderazgo contra 70; portero con 95 contra 70 | `habilitaciones` ≥ 10 % menos; duelos ganados por los defensas cercanos al portero, mayores |

- «Significativa» usa el mismo criterio que 003/SC-007 (`mayorSignificativo`).
- Las series A/B usan `equipoSintetico` y `clonar`, como `pesoStats.ts`.

## B2. Retiradas y lista de pendientes

- Salen de `pesoStats.ts`: `014/SC-008-pase`, `014/SC-008-remate` y `014/SC-008-fisico`, sustituidas por
  `015/SC-001`. Se quedan regate, defensa, velocidad y portero.
- `.github/workflows/ci.yml`: al cerrar la tanda 3, `pnpm balance --n 1000` sin `--pendientes` (SC-007). Mientras
  tanto, las tres retiradas desaparecen de la lista y los ids de la 015 que aún no se cumplan entran en ella.

## B3. Siguen en verde (SC-008, FR-021)

Se exige lo mismo que con la 7.0.0:

- 001/SC-004.
- 003/SC-001 a SC-003 (goles).
- Todas las de la 005.
- 002/SC-007a ≥ 150 pases completados desde el cierre de la tanda 2.
- Además: 002/SC-008, 003/SC-009, 003/SC-005 y 003/SC-007, que hoy están pendientes.

## B4. Rendimiento (SC-009)

`umbralMotor.ts`: tiempo por partido de la 8.0.0 ≤ 1,10 × el de la 7.0.0, medido en la misma máquina y la misma
ejecución, y bajo el umbral absoluto que ya comprueba el CI.
