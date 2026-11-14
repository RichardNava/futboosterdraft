# Informe del motor 7.0.0 (spec 014, T055, T056 y T084)

Resultado de `pnpm balance --n 1000` (semilla 1) con los parámetros 7.0.0 finales y el motor cerrado, comparado con la
[referencia 6.3.0](referencia-6.3.0.md). **58 de 67 comprobaciones superadas** (la 6.3.0 pasaba 52 de 52; la 7.0.0
añade las 15 de la spec 014). El CI ejecuta el balance sin `--pendientes`: tal como está, falla.

## Parámetros finales

Sobre `PARAMETROS_V6_3` (`packages/domain/src/parametros/index.ts`):

| Bloque | Cambio | Motivo |
|---|---|---|
| `espacio` | `rozamientoSuelto` 0,3; `velocidadJugadorMin` 18 | Más rango de velocidad (US5, research R7) |
| `cansancio` | `maximo` 0,6; `degradacionPorMinuto` 0,011 | Energía 45–55 % al 90' (014/SC-006) |
| `manoAMano`, `idaVuelta`, `fueraDeJuego` | bloques nuevos | US2, US3 y FR-006; se retiran los sorteos `probabilidadManoAMano` y `probabilidadFueraDeJuegoBase` |
| `acciones` | `pendientePase` 2,2; `controlPaseTicks` 4; `pesoPasePorStat` 1,2; `gol.normal` 0,35; `gol.lejano` −0,5 | Peso del pase (002/SC-008, 014/SC-008) y goles sin los sorteos de mano a mano (003/SC-001 y SC-002) |
| `pases` | `factorSinMotivo` 0,1; `factorConMotivo` 1,1 | Menos pases largos (003/SC-005) |
| `disciplina` | `factorFaltaArea` 0,45 | Menos faltas en el área con la conducción hasta el punto de penalti (005/SC-011) |
| `tiro` | pesos por tramo ×1,7; `faltaDirectaTiro.probabilidad` ×0,65 | Goles (FR-023) y falta directa (003/SC-003) |
| `decision.factores` | `remate.k` 0,45; `fisico.k` 0,4 | Peso de las estadísticas (014/SC-008) |

## Rondas de calibración

| Ronda | Cambios | Resultado |
|---|---|---|
| 7.0a | primera versión | 51/67 |
| 7.0b | tiro, faltas en el área, `pendientePase`, `controlPaseTicks` | 57/67 |
| 7.0c | tiro ×1,7, `pesoPasePorStat` 1,2, `factorSinMotivo` 0,1, `factorFaltaArea` 0,45, objetivo de Frágil | 59/67 |
| 7.0d | `gol.normal` 0,35, `gol.lejano` −0,5, `factorConMotivo` 1,1 | 60/67 |
| 7.0e | motor: el sacador acude a la carrera (ver «Correcciones del motor») | **58/67** (final) |

Probadas y descartadas con `--solo` y `src/diagnostico.ts`: tiro ×1,85 (apenas sube los goles), `pesoPasePorStat` 1,6
(no mueve 002/SC-008), `factorConMotivo` 0,9 y 1,0 (los cambios de orientación bajan a 5,0 y SC-004 sale del
umbral), `idaVuelta.avanceMinimoM` 1,5, `acciones.paseCorto`/`paseLargo` y `distanciaLargo` (no mueven los pases
cortos).

## Frente a la 6.3.0

| Magnitud | 6.3.0 | 7.0.0 | Comprobación |
|---|---|---|---|
| Goles por partido | 2,65 | 2,86 | 003/SC-001 ✔ |
| Partidos con ≥ 6 goles | 41 | 41 | 003/SC-001 ✔ (SC-009: no sube) |
| 0-0 | 36 | 26 | 003/SC-001 ✔ |
| Entre equipos equilibrados | 2,71; 0,3 % con 8+ | 2,65; 0,2 % con 8+ | SC-007 ✔ |
| Fuera del área | 23,3 % | 24,0 % | 003/SC-002 ✔ |
| Penalti / cabeza / falta directa / propia | 9,6 / 14,0 / 9,2 / 2,0 % | 9,4 / 14,0 / 8,7 / 2,2 % | 003/SC-003 ✔ |
| +5 de media | 74,0 % / 10,0 % | 73,9 % / 10,9 % | SC-004 ✔ |
| Fueras de juego (sin / con línea adelantada) | 0,82 / 3,17 (sorteo) | 0,86 / 2,23 (por posición) | SC-006d ✔, 014/SC-004 ✔ |

## Criterios de la spec 014

| Criterio | Resultado |
|---|---|
| 014/SC-002 mano a mano | ✔ 99,3 % de tiros a distancia de disparo; 1,0 % de pases atrás |
| 014/SC-003 ida y vuelta | ✔ 0 secuencias |
| 014/SC-004 y SC-004b fueras de juego | ✔ 1,77 por partido; +159 % con línea adelantada |
| 014/SC-005 coherencia del fuera de juego | ✔ 0 de 3.098 |
| 014/SC-006, SC-006b y SC-006c cansancio | ✔ 48 % al 90'; 0 % tras la prórroga; el cansado acierta menos |
| 014/SC-008 regate, defensa, velocidad, portero | ✔ |
| 014/SC-008 pase | ✘ intentos +14,4 %, acierto +4,6 % |
| 014/SC-008 remate | ✘ intentos +3,1 %, acierto +47,7 % |
| 014/SC-008 físico | ✘ intentos +5,6 %, acierto +8,1 % |

## Comprobaciones que fallan

1. **014/SC-008 pase (acierto).** Parte del 82,9 %: un +10 % relativo exige el 91,2 %, y el acierto ya está casi
   saturado. No se puede cumplir sin bajar el acierto base, que rompe 002/SC-007a (≥ 150 pases completados; hoy
   150–154). Hay que reformular el criterio (p. ej. en puntos o sobre los fallos) en la spec.
2. **014/SC-008 remate y físico (intentos).** El acierto sube de sobra, pero la frecuencia apenas: el tiro lo decide la
   posición (mano a mano, distancia de disparo) más que el stat, y subir `remate.k` o `fisico.k` rompía SC-004 (el
   peor por debajo del 10 %). **Conflicto 014/SC-008 frente a 001/SC-004**: se prioriza FR-023 (no regresiones).
3. **002/SC-008** (+10 de pase en los medios ⇒ ≥ 10 % más pases completados): +6,7 %. La exclusión de la ida y vuelta
   (FR-006) quita devoluciones cortas, que eran buena parte de los pases del buen pasador. Arrastra **003/SC-009**.
4. **003/SC-005 pases cortos**: 59,2 % (≥ 60 %). Misma causa; las conducciones (+30 %) cumplen de sobra.
5. **003/SC-007 Matador**: +7 % de goles, no significativo. Con los mano a mano por posición todos tiran en esa
   situación, y lo que añade Matador (no pasarla nunca) pesa poco; en 7.0c (+13 %) sí pasaba.
6. **005/SC-004 Mal defensor** (0,366; objetivo 0,5 ± 20 %) y **005/SC-011 lesiones** (0,43 por partido; máximo
   0,42): pasaban en 7.0d y salen del margen con la corrección del sacador (menos tiempo parado: más minutos de juego y
   duelos). Están al borde y se recuperan ajustando sus parámetros (`defectos.malDefensor`, `lesiones`), no los
   objetivos.

## Decisiones

- **Objetivo de Frágil**: se medía contra 4,96, una rareza de la 6.x (el multiplicador de diseño es 3). Con la 7.0.0
  vuelve al valor del parámetro (`tools/balance/src/checks/rasgos.ts`): 2,81 frente a 3 ✔.
- **SC-004 frente a SC-008**: ante el conflicto se mantiene SC-004 (y FR-023) y se documenta el fallo de 014/SC-008.

## Correcciones del motor durante la calibración

- **Penalti sin lanzador junto al balón** (coherencia del balón): el lanzador designado, lejano y cansado, no llegaba
  en el tope de 150 ticks. Ahora el saque espera a que el sacador llegue (tope: cruzar el campo dos veces).
- **Córner de un lanzador lejano** (cansancio M5.2): el sacador cruzaba el campo andando a la velocidad del cansancio y
  la segunda parte se alargaba hasta 8 minutos (todos los titulares al 38 % al final). Ahora quien va a sacar una
  reanudación acude a su velocidad máxima (`moverJugadores`).

## Tests actualizados (T016, T056)

Sin rebajar lo que comprueban:

- `equivalencia-005.json` regenerada con la 7.0.0 (las 3.x ya no se simulan) y `huella-014.json` generada antes de
  refactorizar el motor; `pnpm test:equivalence` en verde después de las unificaciones.
- `tools/fixtures/escenarios/*.json` regenerados (`generar-escenarios`).
- `coherenciaBalon.test.ts`: la posición anterior del balón se compara con los jugadores del tick anterior (un portador
  que se lesiona en plena conducción ya no está en el campo en el tick siguiente; era un falso positivo).
- `malestar.test.ts`: semilla `malestar-rebelde-1` (con la anterior, una lesión en la primera parte metía al Rebelde
  por un cambio automático, que es correcto pero no lo que la prueba quiere medir).
- `migracion-0010.test.ts` y `helpers/baseDatos004.ts`: el partido de la 004 guarda eventos generados con el motor
  actual (la fila sigue siendo 3.0.0); la prueba comprueba que se conservan tras la migración y que la 3.0.0 ya no se
  resimula (`VersionNoSoportada`).
- `cinematica.test.ts` pasa sin cambios con el motor final.

## Verificación (T084)

| Orden | Resultado |
|---|---|
| `pnpm test` | ✔ 132 ficheros, 1.183 pruebas |
| `pnpm test:integration` | ✔ 46 ficheros (252 pruebas, 4 omitidas) |
| `pnpm test:equivalence` | ✔ huella sin cambios tras la refactorización |
| `pnpm e2e` | 118 de 120. `gestion-equipo` (distribución de Formación) es inestable: repetido, pasa. `rareza.spec.ts` necesita `acceso_niveles_rareza = libre` y la base de datos local está en `restringido` (desde el 2026-11-12 22:12; no se ha tocado) |
| `pnpm dlx knip@5` | ✔ 0 hallazgos |
| `pnpm dlx jscpd@4` | ✔ 0 clones |
| `pnpm tsx scripts/comentarios.ts` | ✔ 0 exportaciones sin comentario |
| `pnpm typecheck` | ✔ |
| `pnpm lint` | eslint ✔; `lint:tokens` falla por `coleccion.css:534` (anterior a esta spec) |

## Recorrido a mano del quickstart (T085)

Hecho el 2026-11-14 por una persona: todo correcto (fueras de juego y balón en la 2D incluidos) salvo lo siguiente, ya
corregido:

| Hallazgo | Corrección |
|---|---|
| `pnpm balance` no muestra nada durante la ejecución (1 h 49 min) | Progreso por grupo en stderr (`[3/14] … (412 s)`) |
| Pestañeos al abrir los sobres del draft | Una sonda fotograma a fotograma encontró dos: la mesa vacía asomaba ~120 ms antes de la apertura (esperaba a la imagen del sobre) y, en el fundido final, las cartas de la mesa seguían ocultas. Ahora se pinta el fondo de la apertura mientras tanto y el final es un fundido cruzado |
| «Rareza del draft» se desbloqueaba sin fragmentos suficientes (spec 013) | El botón solo desbloquea si el saldo cubre el coste; si no, avisa «No dispones de los fragmentos necesarios» (e2e nuevo en `rareza.spec.ts`) |
| `goleadores.test.ts` fallaba a veces | Una jornada sin asistencias deja la tabla vacía; la comprobación del nombre solo se aplica con filas |
| `lint:tokens` (`base.css`, `coleccion.css`, de la 013) | Valores pasados a tokens en `tokens.css` |

El `pnpm balance` de la persona da exactamente el resultado de este informe (58/67): es reproducible.

## Pendiente

- Decidir sobre las comprobaciones que fallan: reformular 014/SC-008 pase en la spec, otra ronda para Mal defensor y
  lesiones, y qué hacer con 002/SC-008, 003/SC-005 y Matador (calibrar más o `--pendientes` en `ci.yml`).
