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

## Segunda ronda: correcciones (T030, T074, 2026-11-21)

| Comprobación | Resultado |
|---|---|
| `pnpm lint` y `pnpm typecheck` | Correcto |
| `pnpm test` | Correcto: 1.439 pruebas |
| `pnpm test:integration` | Correcto: 277 pruebas, con SEG-032 |
| `pnpm test:equivalence` | Correcto: 275 pruebas |
| `pnpm seguridad` | Correcto: 128 de 128 ataques bloqueados, con SEG-032 |
| `pnpm audit --audit-level=high` | Sin altos ni críticos |
| Imagen de producción | Se construye y no contiene herramientas de pruebas |
| CSP contra la imagen, con HTTPS local | Correcto: sin violaciones, con un control que confirma que se detectan |
| `pnpm e2e` | **124 correctas, 1 fallo y 1 omitida** (la de CSP, que necesita `E2E_BASE_URL`) |

### Pruebas intermitentes pendientes antes de T108

- `apps/web/tests/e2e/identidad.spec.ts:57` falló en la ejecución completa y en 1 de 3 repeticiones. Si la primera
  equipación choca con la del rival, el equipo juega con la segunda, y la prueba solo admite la primera.
- `apps/server/tests/integration/gestion-equipo.test.ts` («antes de la prórroga») falló una vez y pasó en 3 de 3
  repeticiones. Busca un empate con semillas aleatorias en 20 intentos.
- `apps/web/tests/e2e/draft-varios.spec.ts:16`, ya anotada en la línea base, no falló en esta ronda.
