# Referencia 6.3.0 (spec 014, T001 y T002)

Línea base con la que se comparan SC-009 y FR-023. `pnpm balance --n 1000` con los parámetros 6.3.0 sobre `main`
(`ba76aab`), semilla 1: **52/52 comprobaciones superadas** en 84 min.

## Magnitudes de partido (serie sintética, 1.000 partidos)

| Magnitud | 6.3.0 | Comprobación |
|----------|-------|--------------|
| Goles por partido | 2,65 (SC-007: 2,71 entre equipos equilibrados) | 003/SC-001, SC-007 |
| Partidos con ≥ 6 goles (total) | 41 de 1.000 | 003/SC-001 |
| Partidos con 8 goles o más | 0,3 % | SC-007 |
| 0-0 | 36 de 1.000 | 003/SC-001 |
| Goles desde fuera del área | 23,3 % | 003/SC-002 |
| Penalti / cabeza / falta directa / propia puerta | 9,6 % / 14,0 % / 9,2 % / 2,0 % | 003/SC-003 |
| Fueras de juego provocados con y sin línea adelantada | 3,17 frente a 0,82 por partido (sorteo) | SC-006d |
| +5 de media | gana el mejor 74,0 %, el peor 10,0 % | SC-004 |
| Rasgos (005/SC-004, SC-005, FR-051) | todos dentro de ±20 % de su objetivo | 005/* |

Partidos muy desiguales (once de 88 contra uno de 70, `relajacion.test.ts`): el test exige una media ≤ 4,5 goles del
fuerte y ≤ 2 diferencias de 6 goles o más en 40 partidos; se cumplía con la 6.2.0 y la 6.3.0.

El informe completo de esta ejecución está en la salida de la herramienta (`tools/balance/salida/informe.html` se
sobrescribe en cada ejecución; la tabla anterior recoge los valores que compara esta spec).

## Tests que dependían de valores o versiones del motor 6.x (T002)

`pnpm test` sobre `main`: 124 ficheros, 1.012 pruebas, todas en verde. Con el motor 7.0.0 y `VERSION_MAYOR_SOPORTADA =
7` fallaban, y se actualizaron en US1–US5 (nunca en US7):

| Fichero | Motivo | Cambio |
|---------|--------|--------|
| `packages/engine/tests/ayudas.ts`, `ayudasRasgos.ts` | partidos con 3.0.0 / 4.0.0 | 7.0.0 |
| `version.test.ts` | «con 3.0.0 se crea el partido» | con 7.0.0 se crea; 3.0.0 y 6.3.0 lanzan `VERSION_NO_SOPORTADA` |
| `defectosDisciplina`, `virtudesNuevas`, `malestar`, `balonParado` | casos «con 3.0.0 el rasgo no hace nada» | quitados: las 3.x ya no se simulan (R14) |
| `incidencias`, `eventosGol`, `equivalencia` (intra-versión) | 3.0.0 / 4.0.0 | 7.0.0 |
| `relajacion.test.ts` | compara 6.1.0 con 6.2.0 | compara 7.0.0 sin y con el bloque `relajacion` |
| `receptor.test.ts` | cota del factor del pasador con 3.0.0 | 7.0.0 con una atracción alta |
| `acciones.test.ts` | pase que gana un rival en la carrera | el pase queda como no completado |
| `equivalencia005.test.ts` + `equivalencia-005.json` | eventos de referencia de la 3.0.0 | se regenera con la 7.0.0 (T056) |
| `apps/server/tests/unit/loteDecisiones.test.ts` | 3.0.0; sexta sustitución fija | 7.0.0; las sustituciones que queden |
| `apps/server/tests/unit/grupoHilos.test.ts` | rehacer con 5.0.0 | 7.0.0 |
| `packages/ai/tests/niveles.test.ts`, `rasgos.test.ts` | partidos con 3.0.0 / 4.0.0 | 7.0.0 (y una semilla sin el error de «cambio tardío») |
| `packages/domain/tests/parametros/parametros.test.ts` | parámetros actuales 6.3.0 y mínima 3 | 7.0.0 y mínima 7 |
| `tools/fixtures/escenarios/*.json` | semillas buscadas con 6.1.0 | regeneradas con `generar-escenarios` |
| `tools/balance/src/checks/disciplina.ts` | columna «actual 3.0.0» | quitada |
