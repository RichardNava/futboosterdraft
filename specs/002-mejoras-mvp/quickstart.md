# Quickstart — validación de las mejoras del MVP

Guía para comprobar de principio a fin que la aplicación cumple [spec.md](./spec.md). No contiene código de implementación: los detalles están en [data-model.md](./data-model.md) y en [contracts/](./contracts/). La puesta en marcha es la de la spec 001 ([001/quickstart.md](../001-draft-manager-mvp/quickstart.md)).

## Puesta en marcha

```bash
pnpm install
docker compose up -d db
pnpm db:migrate                  # incluye 0004: sin `ritmo`, mesas con pausa, `visionados`, `resolucion` en partidos
pnpm seed --file data/core.json
pnpm dev                         # http://localhost:5173
```

**Antes de desplegar en la beta**: termina con la versión anterior los partidos en juego. Los partidos de la versión 1.x de los parámetros no se pueden volver a simular (research R12).

## Pruebas automáticas

| Comando | Qué valida |
|---------|-----------|
| `pnpm test` | **Dominio**: penalizaciones en todas las combinaciones (SC-012), zonas frente a casillas de las 10 formaciones, ofensividad igual a la tabla con la colocación de partida, dorsales del 1 al 24 y reasignación (SC-014), aportaciones y orden de las tablas (FR-041, FR-042). **Motor**: invariantes 5 a 9 de [engine-api.md](./contracts/engine-api.md) (finalizar, cinemática, fotogramas inocuos, colocación). **Cliente**: reloj de reproducción (SC-005, SC-006). |
| `pnpm test:equivalence` | Rápida = 2D (001/SC-008) y finalizar = ver hasta el final en los minutos 0, 30, descanso, 89 y prórroga (SC-010). |
| `pnpm test:integration` | Resolución única de un partido entre humanos con dos aperturas simultáneas, vista filtrada "pendiente de ver", `siguiente-jornada`, pausa del draft en solitario, abandono desde el draft, búfer de la 2D en directo, `partido.finalizar`, dorsales automáticos (FR-038). |
| `pnpm balance --n 1000` | SC-007 (pases, centros, tiros y secuencias), SC-008 (+10 de pase), SC-011 (penalizaciones), SC-018 (colocación más ofensiva), y los SC de la spec 001 tras el recalibrado. En CI, `--n 200`. |
| `pnpm --filter @fbd/engine bench` | Coste por partido: ≤ 25 ms sin fotogramas, ≤ 40 ms con fotogramas, `resolverResto` ≤ 30 ms. |
| `pnpm e2e` | Recorridos A a K de abajo, más la prueba de desbordamiento de las cartas en 1280 y 360 px (SC-002). |

## Escenarios de validación manual

Cada escenario se puede repetir sin conocer el código (Principio IX).

### A. Cartas (US1; SC-001, SC-002)

1. Crea una liga de 4 como invitado y entra al draft.
2. En cada carta: arriba están la silueta, la media y el nombre; debajo del nombre, las posiciones resaltadas; abajo, los 6 stats y las virtudes.
3. Toca una virtud: aparece su descripción.
4. Busca un GOAT con 4 virtudes (o usa la ficha de cualquier GOAT desde la plantilla): se lee entero sin desplazarse.
5. Repite en un móvil, o con la emulación de 360 px de ancho de las herramientas del navegador.
6. Pon juntas cartas de los cuatro niveles: se distinguen por el acabado.

**Esperado**: FR-001 a FR-005. Para SC-001, prueba con 5 personas: cada una identifica en 3 s o menos el nombre, la media, las posiciones y el nivel de una carta.

### B. Apertura de sobre (US10; SC-017)

1. En el mismo draft, al empezar las rondas 1, 2 y 3 se ve la animación con sonido. En el resto de turnos, las cartas aparecen sin animación.
2. Pulsa «Saltar» en una de ellas: las cartas se revelan al instante.
3. El temporizador del turno 1 muestra el tiempo de turno más 6 s.
4. Si sale un Legendario o un GOAT, tiene un efecto propio.
5. Silencia el sonido en la barra, recarga y abre otro sobre: no suena.
6. Activa "reducir movimiento" en el sistema: la animación es un fundido.
7. Recarga a mitad de una animación: las cartas aparecen directamente, sin repetirla.

### C. Avanzar sin esperas en solitario (US2; SC-003, SC-004)

1. Liga de 4 con 1 humano y simulación 2D. Elige al instante en cada turno: el siguiente sobre llega al momento, y el draft entero dura menos de 5 min.
2. «Preparar equipo» → «Comenzar partido»: el partido empieza al instante.
3. En el descanso, «Seguir» reanuda al instante.
4. Al final, «Siguiente» lleva a la clasificación. «Siguiente jornada» abre la jornada siguiente.
5. Al final del torneo, «Volver al menú».

**Esperado**: no hay que esperar a que venza un temporizador, y cada transición tarda menos de 1 s.

### D. Draft con varios humanos (US2, US6; SC-013)

1. Dos navegadores (o una ventana privada), dos cuentas y una liga de 4 con 2 humanos y 2 NPC.
2. El humano A elige: ve «Esperando a: B». Cuando B elige, el turno se resuelve al instante.
3. A intenta ir a «Mis partidas» desde la barra: aparece el modal.
   - «Seguir en el draft»: no cambia nada.
   - Vuelve a intentarlo y pulsa «Abandonar»: B ve que la plaza de A pasa a un NPC, y el NPC elige al instante en el turno abierto.

### E. Navegación libre en solitario (US6; FR-021)

1. Partida de un humano, en mitad de un turno del draft: ve a «Mis partidas». No aparece ningún modal.
2. Espera más que el tiempo de turno y vuelve: el turno sigue con el tiempo que quedaba al salir.
3. Repite durante un partido 2D contra un NPC: al volver, la reproducción sigue en el mismo minuto.
4. Cierra la pestaña en mitad de un turno (sin usar la barra) y vuelve tras el tiempo del turno: se aplica la elección automática de la spec 001.
5. Desde cualquier pantalla, el menú principal está a 1 clic.

### F. Simulación 2D (US3; SC-005 a SC-007a, SC-009)

1. Partido 2D: empieza a x2 (o a la última velocidad elegida). Cronometra una parte (unos 2 min) y el partido entero (unos 4 min, descuento incluido y sin el descanso).
2. Pasa a x4 y a x8: el partido avanza el doble y el cuádruple de rápido, y el cambio es inmediato. Recarga: se mantiene la velocidad elegida.
3. La comprobación por minuto (SC-005) es automática (`pnpm test`); a mano, comprueba solo que no hay tirones a simple vista.
4. Pide una sustitución a x8 con el balón en juego: el aviso «Se aplicará en el minuto N» indica, como mucho, 1 minuto de juego más hasta la siguiente interrupción.
5. Observa 5 minutos:
   - hay secuencias de varios pases;
   - el balón viaja de un jugador a otro en menos de 1 s en los pases de unos 25 m;
   - hay centros desde la línea de fondo con rematadores entrando al área;
   - la defensa mantiene la forma, y solo uno o dos jugadores van al balón;
   - nadie tiembla, salta de sitio ni atraviesa a otro.
   - en córners y faltas laterales hay rematadores en el área, y tras un gol los equipos se colocan para el saque de centro.
6. Al final, en las estadísticas aparecen los pases intentados y completados, la precisión de pase, los centros y los tiros.

**Esperado**: SC-007a se comprueba revisando 3 partidos completos a x2, más la prueba automática de cinemática. SC-009 se comprueba con 5 personas que ven 2 min de la versión anterior (etiqueta en `95d9962`) y 2 min de la nueva, y puntúan la nueva de 1 a 5.

### G. Finalizar partido (US5; SC-010)

1. Partido 2D contra un NPC, en el minuto 30: pulsa «Finalizar partido». El resultado y el resumen aparecen en menos de 3 s.
2. Repite con el mismo escenario fijo (`tools/fixtures`, semilla fija, mismas decisiones) sin finalizar: el resultado y los eventos son idénticos.
3. Pide una sustitución y finaliza antes de la siguiente interrupción: en el resumen, la sustitución aparece aplicada en la siguiente interrupción.
4. En una eliminatoria empatada, finaliza en el minuto 80: la simulación incluye la prórroga y, si hace falta, los penaltis.
5. En la simulación rápida, «Finalizar partido» durante la primera parte y en el descanso lleva al resultado final.

### H. Penalizaciones por posición (US4; SC-011, SC-012)

En la pantalla de alineación:

| Jugador | Colocación | Penalización esperada |
|---------|------------|-----------------------|
| DEL (EI, ED) | casilla DC | −10 % |
| DEL | cualquier casilla de defensa | −40 % |
| MED solo MCO | ataque / defensa | −10 % / −30 % |
| MED solo MD | defensa / ataque | −10 % / −30 % |
| Jugador de campo | portería | −60 % |
| Portero | casilla de campo | −60 % |

Los stats efectivos que se muestran coinciden con el porcentaje. Un Todocampista no tiene penalización fuera de la portería.

### I. Colocación libre (US7; SC-016, SC-018)

1. En un 4-3-3, pon a un SD natural en la casilla DC y arrástralo un poco hacia atrás: su posición pasa a SD y la penalización desaparece al instante.
2. Intenta sacar al portero de la portería: no se puede.
3. En un 4-4-2, adelanta a un MC hasta la zona de delanteros: «Formación personalizada», reparto 4-3-3 y ofensividad +1.
4. Confirma y juega el partido: ese jugador parte de donde lo colocaste.

**Esperado**: SC-018 con `pnpm balance`.

### J. Dorsales (US8; SC-014)

1. Al terminar el draft, en la plantilla: dorsales del 1 al 24, sin repetir.
2. Pon el 33 al jugador que lleva el 14: el 14 queda libre.
3. Pon el 2 a otro jugador: el que lo tenía aparece como «Sin dorsal».
4. Convócalo y empieza el partido: recibe el dorsal libre más bajo y aparece un aviso.

### K. Torneo asíncrono con dos humanos (US11, US9; SC-015, SC-019)

1. Liga de 4 con 2 humanos (A y B), plazo de 24 h y simulación 2D.
2. En la jornada en que se enfrentan, A pulsa «Ver partido»: el partido se resuelve sin que B esté conectado, y A lo ve con velocidades y «Finalizar partido», pero sin panel de cambios.
3. B, más tarde: en la clasificación, su partido aparece como «Pendiente de ver», sin marcador, y la clasificación y las tablas no lo incluyen. «Ver partido» muestra exactamente los mismos eventos que vio A. Al terminar, la clasificación lo incluye.
4. En el partido de A contra un NPC, A puede hacer cambios. Si A no lo juega, al vencer el plazo (reloj simulado en `pnpm test:integration`) se resuelve solo y la jornada se cierra.
5. «Máximos goleadores» y «Máximos asistentes» coinciden con la suma de los resúmenes de los partidos. Los penaltis de una tanda no cuentan.

## Lista de comprobación de cierre

- [ ] Todos los comandos de la tabla de pruebas automáticas pasan.
- [ ] Los escenarios A a K están revisados manualmente.
- [ ] Las encuestas de SC-001 y SC-009 se han hecho con al menos 5 personas.
- [ ] La spec 001 está actualizada según "Requisitos de la spec 001 afectados" de la spec 002.
