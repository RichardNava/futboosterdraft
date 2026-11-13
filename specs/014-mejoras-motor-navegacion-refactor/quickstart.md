# Quickstart: validar la spec 014

Recorrido para comprobar cada historia. Los detalles de qué se garantiza están en los contratos
([motor](contracts/motor.md), [protocolo](contracts/protocolo.md), [ui](contracts/ui.md), [calidad](contracts/calidad.md)).

## Requisitos

```bash
pnpm install
pnpm db:migrate && pnpm seed
pnpm dev            # servidor y web
```

## 1. Pruebas automáticas del motor (US1–US4)

```bash
pnpm --filter @fbd/engine test coherenciaBalon manoAMano fueraDeJuego cansancio receptor
```

Esperado: todo en verde (M1–M5 de [motor.md](contracts/motor.md)).

## 2. Informe de equilibrado (US2–US5, criterios estadísticos)

```bash
pnpm balance
```

Abrir el informe generado y comprobar, con su objetivo, valor medido y «cumple»:

| Sección | Criterio |
|---------|----------|
| Mano a mano | SC-002: ≥ 80 % de tiros a distancia de disparo; < 2 % de pases atrás |
| Ida y vuelta | SC-003: 0 secuencias de más de dos |
| Fuera de juego | SC-004: 1–6 por partido; línea adelantada ≥ +30 %; SC-005 (parte automática) |
| Cansancio | SC-006: energía 45–55 % al 90'; naranja/rojo al 120'; rendimiento menor al final |
| Peso de las estadísticas | SC-008: ≥ +10 % en intentos y en acierto por estadística |
| Partido (existente) | SC-009 y FR-023: goleadas, goles por partido y rasgos sin empeorar |

## 3. Simulación 2D (US1, US3)

1. Crear una partida contra NPC, llegar al primer partido y elegir la 2D a ×1.
2. Durante varios minutos, seguir el balón: solo cambia de dirección cuando lo toca un jugador o en un saque; un pase
   que nadie alcanza sigue rodando y frena (SC-001, revisión visual).
3. Esperar un fuera de juego: pitido, evento «Fuera de juego» con el jugador y saque de falta del rival desde donde
   estaba. Pausar en el momento del pase y comprobar que el receptor estaba por delante del penúltimo defensor
   (SC-005).
4. Ver al final del partido «Fueras de juego» en las estadísticas.

## 4. «Gestionar equipo» con energía (US4)

1. En un partido contra NPC, abrir la gestión en el descanso: cada titular muestra cara verde sonriente y «100%», sin
   penalización.
2. Con «control total», esperar a un gol o una incidencia pasado el minuto 75 (o al final, a la pausa de la
   prórroga en un eliminatorio): porcentajes por debajo de 100, caras de otro tramo y penalización en rojo
   («−12 %») debajo (SC-007).
3. Hacer un cambio y volver a abrir la gestión: el que entra marca 100 %.
4. Abrir la ayuda «?» y comprobar la tabla de tramos.
5. Durante la reproducción de la 2D no aparece ningún indicador.

## 5. Navegación (US6)

1. Con la red normal, recorrer Inicio → Mis partidas → Perfil → Colección → Tienda → Inicio y volver a cada una:
   ninguna barra, esqueleto ni sección aparece y desaparece (SC-010).
2. En las herramientas del navegador, red «Slow 3G» (o el e2e `pnpm e2e navegacion`): al cambiar de pantalla se
   mantiene la anterior y, a los 2 s, aparece la barra de carga, que se va al terminar.
3. Con la red lenta, pulsar dos enlaces seguidos: solo se carga el último y no queda ningún indicador del primero.
4. Comprar algo en la tienda y volver a Inicio: el saldo mostrado es el nuevo, nunca el anterior.

```bash
pnpm e2e
```

## 6. Refactorización (US7)

Con el motor 7.0.0 ya cerrado y `huella-014.json` generada:

```bash
pnpm test && pnpm test:integration && pnpm test:equivalence
pnpm typecheck && pnpm lint
pnpm dlx knip
pnpm dlx jscpd
pnpm tsx scripts/comentarios.ts
graphify update .
```

Esperado: todo en verde y `refactorizacion.md` con las duplicidades unificadas y lo eliminado (Q1–Q7 de
[calidad.md](contracts/calidad.md)).
