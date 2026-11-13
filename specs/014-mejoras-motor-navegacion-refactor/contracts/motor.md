# Contrato del motor (spec 014)

Lo que el motor garantiza con los parámetros 7.0.0. Cada invariante tiene su prueba (columna «Prueba»). Las
coordenadas son las del equipo que ataca (x hacia la portería rival, 0–10000; y 0–6400) y las distancias en décimas de
unidad, como en el resto del motor.

## M1. Balón (US1)

| Id | Invariante | Prueba |
|----|------------|--------|
| M1.1 | Dentro del campo, todo cambio de dirección del balón (> 20°) o arranque desde parado ocurre con un jugador a ≤ `LLEGADA` + radio de chapa o con una acción `saque` abierta. | `coherenciaBalon.test.ts`, 20 semillas (SC-001) |
| M1.2 | Un balón suelto mantiene su dirección y frena (`rozamientoSuelto`); nunca se mueve hacia el jugador que va a por él. | `coherenciaBalon.test.ts` |
| M1.3 | Quien llega primero a un balón suelto se lo queda; el tiempo de llegada depende de su velocidad máxima. | `coherenciaBalon.test.ts` (dos jugadores, velocidades distintas) |
| M1.4 | Misma entrada, semilla y decisiones ⇒ mismos eventos y mismos fotogramas en la rápida y en la 2D. | `determinismo.test.ts`, `equivalencia.test.ts` |

## M2. Mano a mano (US2)

`esManoAMano(estado, atacante, portador, entorno): boolean` y
`decisionManoAMano(estado, atacante, portador, entorno): 'tiro' | { pase: JugadorEnPartido } | 'conduccion'`, puras, en
`acciones/manoAMano.ts`.

| Id | Situación preparada | Resultado esperado | Prueba |
|----|---------------------|--------------------|--------|
| M2.1 | Portador en campo rival, solo el portero delante, lejos (> distancia de disparo), sin presión | `conduccion` hacia la portería | `manoAMano.test.ts` |
| M2.2 | Igual, a distancia de disparo | `tiro` | `manoAMano.test.ts` |
| M2.3 | Remate 90 frente a remate 60 a la misma distancia límite | el de 90 tira, el de 60 conduce | `manoAMano.test.ts` (FR-007) |
| M2.4 | Portero adelantado (≥ `tiro.porteroAdelantadoM`) | `tiro` desde más lejos | `manoAMano.test.ts` |
| M2.5 | Rival encima + compañero en paralelo, libre, en posición correcta y con mejor ocasión | `{ pase: compañero }` | `manoAMano.test.ts` |
| M2.6 | Rival encima, compañero en paralelo **en fuera de juego** o marcado, o sin compañero | `tiro` o `conduccion`, nunca pase atrás | `manoAMano.test.ts` |
| M2.7 | Un defensa de campo dentro del pasillo por delante | no es mano a mano | `manoAMano.test.ts` |
| M2.8 | 1.000 partidos | ≥ 80 % de mano a mano a distancia de disparo acaban en tiro; < 2 % en pase atrás | informe `pnpm balance` (SC-002) |

## M3. Ida y vuelta (US2)

| Id | Invariante | Prueba |
|----|------------|--------|
| M3.1 | Tras `X → portador` sin presión y sin ganar `idaVuelta.avanceMinimoM`, X no es candidato a receptor. | `receptor.test.ts` |
| M3.2 | Con presión (`rivalEncima`), la pared X → portador → X sigue permitida. | `receptor.test.ts` |
| M3.3 | 1.000 partidos: 0 secuencias de más de dos idas y vueltas entre los mismos dos atacantes sin presión ni avance. | informe (SC-003) |

## M4. Fuera de juego (US3)

`penultimoDefensor(estado, defensor, ladoAtacante): number` (x) y `enFueraDeJuego(estado, atacante, receptor, xBalon):
boolean`, puras, en `acciones/fueraDeJuego.ts`.

| Id | Situación | Resultado | Prueba |
|----|-----------|-----------|--------|
| M4.1 | Receptor en campo rival, por delante del balón y del penúltimo defensor (> `toleranciaM`), pase de un compañero | evento `fuera_de_juego` con el receptor como `autor`; falta del defensor desde donde estaba el receptor al salir el pase | `fueraDeJuego.test.ts` |
| M4.2 | Receptor a la altura del penúltimo (≤ `toleranciaM`) o por detrás | sin fuera de juego | `fueraDeJuego.test.ts` |
| M4.3 | Receptor en su propio campo | sin fuera de juego | `fueraDeJuego.test.ts` |
| M4.4 | Receptor por detrás del balón (aunque pase al penúltimo) | sin fuera de juego | `fueraDeJuego.test.ts` |
| M4.5 | Saque de banda, de puerta o de esquina | nunca se evalúa | `fueraDeJuego.test.ts`, `balonParado.test.ts` |
| M4.6 | Receptor en posición correcta al salir el pase que queda por delante después | sin fuera de juego | `fueraDeJuego.test.ts` |
| M4.7 | Fuera de juego en el último minuto | se pita y se respeta el final del tiempo | `descuento.test.ts` |
| M4.8 | 1.000 partidos | 1–6 fueras de juego por partido; línea adelantada ≥ +30 % que sin ella | informe (SC-004) |
| M4.9 | Cada fuera de juego pitado tiene en métricas x del receptor > x del penúltimo y > x del balón | informe (SC-005, parte automática) |

Los eventos, `estadisticas.fuerasDeJuego` y `fuerasDeJuegoProvocados` no cambian de forma.

## M5. Cansancio y energía (US4)

`energiaDe(estado, jugador): { energia: number; penalizacion: number }`, exportada por `@fbd/engine`.

| Id | Invariante | Prueba |
|----|------------|--------|
| M5.1 | Sin rasgos, antes de `inicioMin` (o `inicioMinPresionAlta`): energía 100, penalización 0. | `cansancio.test.ts` |
| M5.2 | Sin rasgos, sin Presión alta ni individual, al final del 90': energía 45–55, penalización 27–33. | `cansancio.test.ts`, informe (SC-006) |
| M5.3 | Tras una prórroga completa: energía < 40 (naranja o rojo). | `cansancio.test.ts` |
| M5.4 | Un sustituto entra con energía 100 y se cansa desde su entrada con las mismas reglas. | `cansancio.test.ts` |
| M5.5 | Incansable, Fatigado, Indisciplinado, Motivador, Presión alta e individual cambian la energía exactamente como cambian `cansancio`. | `cansancio.test.ts`, `defectosFisicos.test.ts` |
| M5.6 | `cansancio` nunca supera `cansancio.maximo` ⇒ energía ≥ 0. | `cansancio.test.ts` |
| M5.7 | El rendimiento (acierto de pase, duelos) de los 10 últimos minutos es menor que antes del inicio. | informe (SC-006) |

## M6. Peso de las estadísticas (US5)

| Id | Invariante | Prueba |
|----|------------|--------|
| M6.1 | Para pase, regate, remate, defensa, físico: el equipo con +15 en la estadística intenta la acción que gobierna ≥ +10 % relativo y acierta ≥ +10 % relativo. | informe «Peso de las estadísticas» (SC-008) |
| M6.2 | Velocidad +15: ≥ +10 % de balones sueltos ganados. Portero +15: ≥ +10 % de paradas sobre tiros a puerta. | informe (SC-008) |
| M6.3 | Proporción de partidos con ≥ 6 goles de diferencia ≤ la de 6.3.0; goles por partido y rasgos dentro de sus criterios. | informe (SC-009, FR-023) |
