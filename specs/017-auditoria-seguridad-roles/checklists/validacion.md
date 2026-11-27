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

## Tercera ronda: roles, panel y auditoría repetida (T108 y T109, 2026-11-22)

| Comprobación | Resultado |
|---|---|
| `pnpm lint` y `pnpm typecheck` | Correcto |
| `pnpm test` | Correcto: 1.486 pruebas en 147 ficheros |
| `pnpm test:integration` | Correcto: 277 pruebas en 50 ficheros, con vitest 4.1.12 |
| `pnpm test:equivalence` | Correcto: 275 pruebas en 5 ficheros (SC-012) |
| `pnpm seguridad` | Correcto: 190 de 190 ataques bloqueados (SC-003, SC-004) |
| `pnpm audit --audit-level=high` | Sin altos ni críticos: 10 moderados y 5 bajos (SC-011) |
| `pnpm audit --prod --audit-level=high` | Sin altos ni críticos: 4 moderados y 4 bajos |
| Instalación limpia | `pnpm install --frozen-lockfile` deja vitest 4.1.12 en `apps/server` |
| ZAP contra la imagen final | `FAIL: 0`, sin errores 500. Alertas en `auditoria.md` (FR-006) |
| `pnpm e2e` completo | Correcto: 127 correctas y 1 omitida (la de CSP), con una base de datos desechable |
| CSP con el navegador contra la imagen final | Correcto: 2 de 2, con las pantallas principales y las cuatro pestañas del panel |

### Escenarios del quickstart (T109)

Los escenarios C a F se ejecutaron contra la imagen final, detrás de HTTPS y con una base de datos desechable. Las acciones de D
y E se hicieron por la API y la consola reales, y su recorrido por el navegador lo cubre `admin.spec.ts` en la suite e2e.

| Escenario | Resultado |
|---|---|
| A. Informe e inventario | Correcto: 16 áreas, 40 hallazgos cerrados, inventario igual a las rutas reales (SC-001, SC-002) |
| B. Ataques | Correcto: 190 de 190 (SC-003, SC-005, SC-006) |
| C. Producción | Correcto: salud mínima, `/metrics` y `/api/dev` con 404, secreto corto rechazado sin mostrarlo, euros cerrados |
| D. Roles y panel | Correcto (SC-004, SC-009). **SC-008 queda para el cronometraje de T110** |
| E. Suspensión y cierre | Correcto: conexión cortada en 1,9 s (SC-007) |
| F. robots.txt | Correcto contra la imagen; reglas validadas por `robots.test.ts` (SC-010) |
| G. Escaneo externo | Correcto |
| H. Calidad | Correcto (SC-011, SC-012) |

### Pruebas intermitentes

- `apps/web/tests/e2e/draft-varios.spec.ts:16`: **era un fallo real de la web, corregido**. Al confirmar, el botón desaparecía
  y su ayuda seguía tapando «Esperando a…», también para los lectores de pantalla. Pasa 23 de 23 repeticiones.
- `apps/web/tests/e2e/diseno/teclado.spec.ts:33`: **era un fallo real de accesibilidad, corregido**. Durante la apertura del
  sobre, el Tab entraba en botones de cartas decorativas ocultas al lector de pantalla. Pasa 8 de 8 repeticiones.
- `apps/web/tests/e2e/identidad.spec.ts:57`: **corregida la prueba**. Solo admitía la primera equipación, y de visitante se
  juega con la segunda si la primera choca.
- `apps/server/tests/integration/gestion-equipo.test.ts` («antes de la prórroga»): **sin cambios**. Busca un empate con semillas
  aleatorias en 20 intentos, así que aún puede fallar por azar. Pasó en las 5 ejecuciones completas de esta ronda.
