# Validación de la spec 017

## Línea base antes de corregir (T001, 2026-11-21)

| Comprobación | Resultado |
|---|---|
| `pnpm lint` | Correcto |
| `pnpm typecheck` | Correcto |
| `pnpm test` | Correcto: 1.431 pruebas en 144 ficheros |
| `pnpm test:integration` | Correcto: 268 pruebas en 48 ficheros |
| `pnpm test:equivalence` | Correcto: 275 pruebas en 5 ficheros |
| `pnpm e2e` | **1 fallo y 124 correctas** |

### Fallo de partida en los e2e

`apps/web/tests/e2e/draft-varios.spec.ts:16` («Esperando a: B» y el turno se resuelve al elegir B) es **intermitente**.
Falló en la ejecución completa y en 1 de 3 repeticiones aisladas, con el mismo error: no aparece el aviso «Esperando a:».

La ejecución completa arrancó su servidor antes de los cambios de esta spec en `apps/server/src`, así que el fallo no
procede de ellos. Hay que resolverlo antes de T108, porque SC-011 exige los recorridos en verde.
