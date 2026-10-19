# Calibración del motor 3.0.0 (T033)

Registro de las rondas de calibración de `packages/domain/src/parametros/v3.json`, siguiendo el orden de research
R8. Cada ronda se mide con `pnpm balance` (la serie sintética y, cuando se indica, la serie Core) y genera el
informe legible `tools/balance/salida/informe.html` (Principio IX).

**Criterio de salida**: pasan todas las comprobaciones `003/SC-001` a `003/SC-009` y las de las specs 001 y 002.

**Estado**: **abierta**. La calibración no ha alcanzado el criterio de salida; ver "Pendiente" al final.

## Línea base (motor 2.0.0, `c8a1627`)

Ver [linea-base.md](./linea-base.md): 2,62 goles por partido y 16,9 conducciones por equipo y partido.

## Rondas 1 a 4 (pasos 1 a 6 de R8)

Ajustes acumulados, con los valores que quedaron en `v3.json`:

| Paso R8 | Parámetro | Valor |
|---|---|---|
| 1. Receptor y pases | `acciones.atraccionPasador` | 1,0 |
| | `pases.factorConMotivo` / `factorSinMotivo` | 1,4 / 0,15 (cambio de orientación ×1,5 en el código) |
| | `decision.factores.pase` | k 1,0, máx. 2 |
| 2. Conducción | `decision.conduccion.factorMax` | 14 |
| 3. Stats y specials | `decision.factores.remate` | k 0,22, máx. 1,4 |
| | `decision.factores.regate` | k 0,35, máx. 1,8 |
| | `acciones.duelo.pendiente` | 0,04 |
| | `acciones.controlPorStat` | 4 |
| 4. Tiro por distancia | `tiro.pesoPorTramo` | [200, 150, 55, 20] |
| | `tiro.pendienteAngulo` | 0,5 |
| 5. Balón parado y autogoles | `tiro.autogol.desvio` / `despejeCentro` | 0,008 / 0,008 |
| | `disciplina.probabilidadFaltaDueloAereoArea` | 0,04 |
| | `disciplina.factorFaltaUltimoTercio` | 1,6 |
| 6. Puerta y gol | `acciones.puerta` normal / lejano / falta | 0,5 / −0,2 / 0,6 |
| | `acciones.gol` normal / cabeza / manoAMano / lejano / falta | 0,15 / 0 / 0,05 / −0,6 / 0,6 |
| | `acciones.probabilidadManoAMano` | 0,12 |
| | `acciones.dificultadZona` | 0,13 |
| Otros | `formaciones.efectoOfensividad` | 0,45 |
| | `tacticas.catenaccio.defensiva` | 0,9 |

Cambios de modelo durante estas rondas (no son parámetros):

- **Zonas híbridas**: los pases conservan la zona lógica planificada (mecánica de la 002); la conducción usa la
  zona real, y el tiro se decide por la distancia y el ángulo reales. Con la zona real en todo, la progresión
  se hundía; con la lógica en todo, había tiros desde demasiado lejos.
- Se eliminaron `acciones.probabilidadFaltaDirectaTiro` y `disciplina.probabilidadPenaltiPorFaltaEnArea`: las
  faltas y los penaltis salen de los duelos espaciales.

## Ronda 5 (`pnpm balance --n 500 --serie todas`, 1.648,7 s)

16 de 23 comprobaciones superadas.

| Comprobación | Resultado |
|---|---|
| ✔ 003/SC-001 | 3,04 goles por partido; 13 0-0 y 29 partidos de ≥ 6 goles en 500; más frecuente 1-2 (12,2 %) |
| ✘ 003/SC-001c | serie Core: 3,33 goles por partido, pero solo el 33,3 % de 9 torneos con su media en 2,6–3,4 (≥ 90 %) |
| ✔ 003/SC-002 | 27,1 % fuera del área (68,0 % de ellos a ≤ 25 m); 0,1 % desde el propio campo |
| ✔ 003/SC-003 | penalti 10,7 % · cabeza 17,3 % · falta directa 9,1 % · propia puerta 1,5 % |
| ✔ 003/SC-004 | 13,0 % de pases largos; 0,00 largos hacia atrás por equipo y partido |
| ✔ 003/SC-005 | 27,3 conducciones por equipo y partido (+62 %); 60,6 % de pases cortos |
| ✘ 003/SC-006 | regate +25 % (justo en el límite), pase que rompe líneas +8 % (objetivo +15 %); tiro, defensa y físico cumplen |
| ✘ 003/SC-007 | Filigranas +37 % de regates ganados, sin significación; el resto de specials cumplen |
| ✔ SC-004, SC-006a–e, SC-007, SC-015, SC-011, SC-011b, 002/SC-007b | |
| ✘ 002/SC-007a | contraataques 2,8 (objetivo 3); el resto cumple |
| ✘ 002/SC-008 | +10 de pase en los centrocampistas: +2,5 % de pases completados (objetivo +10 %) |
| ✘ 002/SC-018 | colocación ofensiva: GF 2,15 frente a 2,01 (no significativo); GC 2,92 frente a 1,84 |
| ✘ 003/SC-009 | compuesto: fallan 002/SC-007a, 002/SC-008 y 002/SC-018 |

## Ronda 6 (comprobaciones que fallaban, n = 500)

Cambios: `decision.factores.pase` k 1,2 y máx. 3; `decision.factores.regate` k 0,4; `acciones.atraccionPasador`
1,3; `pases.atraccionPasadorAcotada` [0,7, 1,8]; `tacticas.contraataque.peligroTransicion` 0,2.

2 de 5 superadas (1.042,8 s):

| Comprobación | Resultado |
|---|---|
| ✔ 003/SC-006 | regate +39 %, tiro +779 %, defensa +28 %, pase que rompe líneas +17 %, duelos +80 %, conducciones largas +39 % |
| ✔ 003/SC-007 | todos los specials con efecto (Filigranas +72 % de regates ganados) |
| ✘ 002/SC-007a | contraataques 2,9 (objetivo 3) |
| ✘ 002/SC-008 | +4,6 % de pases completados (objetivo +10 %) |
| ✘ 002/SC-018 | colocación GF 2,21 frente a 2,05 (no significativo) |

## Ronda 7 (`--serie todas`, n = 500)

Cambios: `tacticas.contraataque.peligroTransicion` 0,4; `acciones.pendientePase` 1,5; `acciones.pesoPasePorStat`
0,8; `colocacion.beta` 1,0.

19 de 23 superadas (1.992,6 s). Pasan ahora 002/SC-018 (colocación GF 2,44 / GC 3,01 frente a 2,03 / 1,65), 003/SC-006
(pase que rompe líneas +18 %) y 003/SC-007. Siguen fallando:

| Comprobación | Resultado |
|---|---|
| ✘ 003/SC-001c | 3,14 goles por partido en la serie Core; 33,3 % de 9 torneos en rango |
| ✘ 002/SC-007a | centros 9,9 (< 10) y contraataques 2,9 (< 3) |
| ✘ 002/SC-008 | +5,0 % de pases completados |
| ✘ 003/SC-009 | compuesto (002/SC-007a y 002/SC-008) |

## Ronda 8 (`--serie todas`, n = 500)

Cambios:

- parámetro nuevo `tacticas.transicionBase` = 0,12: con cualquier estilo, al recuperar en campo propio se busca a
  veces la espalda rival (antes, solo con el estilo «contraataque»);
- peso del centro 3,9 / 2,8 (antes 3,6 / 2,6, en `opciones.ts`);
- `acciones.atraccionPasador` 1,6, `pases.atraccionPasadorAcotada` [0,7, 2,5] y `acciones.pendientePase` 2.

17 de 23 superadas: **empeora**. Mejora 003/SC-001c (3,05 goles; 77,8 % de torneos en rango) y 002/SC-008 (+6,8 %),
pero el regate de 003/SC-006 cae a −11 % y SC-004 deja al peor en el 8,2 % (< 10 %); los contraataques siguen en 2,9.

## Ronda 9 (`--serie todas`, n = 500)

Se vuelve a los valores de pase de la ronda 7 (`atraccionPasador` 1,3, acotada [0,7, 1,8], `pendientePase` 1,5); se
mantiene el peso del centro 3,9 / 2,8 y `tacticas.transicionBase` sube a 0,25.

16 de 23 superadas: **empeora**. La transición en cualquier estilo vuelve el juego más directo (003/SC-005: 24,7
conducciones y 59,8 % de pases cortos; 003/SC-002: 28,2 % de goles de fuera del área; Llegador sin significación) y no
sube los contraataques (2,8), porque la métrica pide además un tiro rápido con pocos pases. Se descarta
`transicionBase` (parámetro y código retirados).

## Ronda 10 (`--serie todas`, n = 500): ronda 7 más el peso del centro 3,9 / 2,8

17 de 23 superadas (1.589,4 s): **empeora**. Con más centros, los extremos regatean menos: 003/SC-006 regate −8 % y
003/SC-007 sin significación para Matador (+14 %) y Desbordante (+24 %). Centros 10,2 y contraataques 2,9.

## Configuración final: la de la ronda 7

Se vuelve exactamente a la ronda 7 (peso del centro 3,6 / 2,6), la mejor medida: **19 de 23 comprobaciones**.

| Comprobación pendiente | Resultado (ronda 7) | Valoración |
|---|---|---|
| 003/SC-001c | 3,14 goles en la serie Core; 33 % de 9 torneos en rango (en otras rondas, 56–78 %) | El criterio del 90 % por torneo no es alcanzable con 28 partidos por torneo (ver abajo). |
| 002/SC-007a | centros 9,9 (≥ 10) y contraataques 2,9 (≥ 3); el resto cumple con margen | A 0,1 del umbral; subir los centros o forzar transiciones rompe SC-006 y SC-007 (rondas 8 a 10). |
| 002/SC-008 | +5,0 % de pases completados con +10 de pase (≥ 10 %) | El motor 3.0.0 conduce más (SC-005) y reparte menos pases por jugador; subir la atracción del pasador rompe el regate y SC-004 (ronda 8). |
| 003/SC-009 | compuesto de las dos anteriores | — |

Estos cuatro fallos quedan pendientes de una decisión: revisar sus criterios o seguir calibrando con cambios de
modelo (no de parámetros).

## Pendiente

- **003/SC-001c (≥ 90 % de torneos Core con la media en 2,6–3,4)**: con 28 partidos por torneo, la desviación de
  la media por muestreo ya es de unos 0,23 goles; con una media de torneos de unos 3,3, el criterio pide una
  dispersión entre torneos que el tamaño del torneo no permite. Hay que revisar el criterio (por ejemplo, el
  80 % o el rango 2,4–3,6 por torneo) o aceptar el fallo documentado.

## Ronda 11 (tras H8, H11 y H13; `--serie todas`, n = 500)

Cambios del motor desde la ronda 7: saque de centro con el balón ya en el centro (H8), llegada al área, centro raso y
peso del receptor que llega (H11; `espacio.llegadaAlArea`, `acciones.centroRaso` 0,35, `acciones.bonusLlegada` 2,5) y
córner tras un tiro aplazado al paso siguiente.

17 de 23 superadas (1.369,5 s). Respecto a la ronda 7 fallan además:

| Comprobación | Semilla 1 | Semilla 2 | Valoración |
|---|---|---|---|
| 003/SC-006 (regate) | +9 % | +19 % | Por debajo del +25 % con las dos semillas; en la ronda 7, +30 %. La llegada al área da al extremo más remates y menos regates. |
| SC-004 (peor ≥ 10 %) | 9,8 % | 11,4 % | Ruido: en el límite con una semilla, cumple con la otra. |

Prueba con `decision.factores.regate.k` = 0,5: el regate da +17 % y +43 % según la semilla (puro ruido) y empeoran
SC-004 y SC-007; se vuelve a 0,4. **La comprobación del regate de SC-006 mide unos 0,3 regates por partido de un solo
jugador: con 500 partidos su error es del orden de ±10 puntos**, así que no sirve para afinar. Propuesta: medirla sobre
varios jugadores o con más partidos antes de calibrar contra ella.

Siguen pendientes los de la ronda 7: 003/SC-001c, 002/SC-007a (9,8 centros y 2,9 contraataques), 002/SC-008 (+6,4 %) y
003/SC-009.
