# Implementation Plan: Mejoras del motor, navegación sin pestañeo y refactorización

**Branch**: `main` (sin rama propia, como las specs 008 a 013) | **Date**: 2026-11-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/014-mejoras-motor-navegacion-refactor/spec.md`

## Summary

Tres bloques, en este orden obligatorio (FR-032): motor (US1–US5, una sola versión nueva de parámetros, **7.0.0**),
navegación (US6, independiente del motor) y refactorización (US7, al final, contra una huella fija de partidos y
drafts).

1. **Balón (US1)**: la causa está en el motor, no en la 2D. `recuperarSuelto` abre un `control` «suelto» con `aId` y
   `moverBalon` lo hace **rodar hacia quien va a por él**: el balón se mueve solo. El balón suelto pasa a rodar en su
   última dirección con rozamiento hasta pararse, y el jugador corre hasta él (R1). Prueba automática sobre fotogramas
   (SC-001).
2. **Mano a mano (US2)**: hoy es un sorteo (`probabilidadManoAMano` 0,12) tras un pase al espacio o un regate. Pasa a
   detectarse por posiciones (`esManoAMano`) en cada `paso` y a decidirse con la directriz de FR-004 antes del sorteo de
   acciones; el ida y vuelta se corta excluyendo al último pasador (R2, R3).
3. **Fuera de juego (US3)**: hoy es `probabilidadFueraDeJuegoBase` (+0,18 con línea adelantada) en los pases al
   espacio. Pasa a evaluarse en `planearPase` con la posición real del receptor, el balón y el penúltimo defensor; los
   desmarques se frenan en la línea según visión/posicionamiento (R4).
4. **Cansancio (US4)**: el tope 0,6 sale a parámetros (`cansancio.maximo`), el ritmo sube de 0,004 a ≈ 0,011 por minuto
   (calibrado en el informe: 50 % de energía al 90'). El servidor añade la energía de cada jugador en el campo a
   `partido.pausa_decision`; `GestionEquipo` la pinta con `IndicadorEnergia` (R5, R6).
5. **Estadísticas (US5)**: más pendiente en `decision.factores` (frecuencia) y en la probabilidad de éxito (acierto),
   más radio de intervención por quite, más rango de velocidad; sección nueva del informe «Peso de las estadísticas» con
   series A/B de +15 puntos (R7).
6. **Navegación (US6)**: las pantallas cargan con **loaders** del router de datos que ya existe
   (`createBrowserRouter`), sobre una caché en memoria con revalidación en segundo plano; los datos de decisión se piden
   frescos. Indicador global en `Marco` con `useNavigation()` y retardo de 2 s. Sin dependencias nuevas (R8–R10).
7. **Refactorización (US7)**: `knip` (código sin uso) y `jscpd` (duplicados) con `pnpm dlx`, un script propio con la API
   de TypeScript para los comentarios de lo exportado y una huella `huella-014.json` de 100 partidos + 20 drafts que
   debe salir idéntica (R11–R13).

## Technical Context

**Language/Version**: TypeScript 5 sobre Node ≥ 22, ESM.

**Primary Dependencies**: Fastify 5, Drizzle + `pg`, zod, React 19 + Vite, react-router 7 (modo datos), zustand.
Sin dependencias nuevas; `knip` y `jscpd` se ejecutan con `pnpm dlx` y no entran en ningún `package.json` (R11).

**Storage**: sin migración. El estado de energía vive en el estado del motor (`JugadorEnPartido.cansancio`) y viaja en
el mensaje de pausa; los eventos de fuera de juego ya existen (`fuera_de_juego`, `fuerasDeJuego`).

**Testing**: Vitest (motor: coherencia del balón, mano a mano, fuera de juego, cansancio; web: indicador y caché),
fixture de equivalencia nueva `huella-014.json`, informe de `pnpm balance` (secciones nuevas) y Playwright
(navegación con red lenta, indicador en «Gestionar equipo»).

**Target Platform**: navegador (escritorio y móvil desde 360 px) y servidor Linux en contenedor.

**Project Type**: monorepo web (`apps/server`, `apps/web`, `packages/{domain,engine,protocol,ai}`, `tools/`).

**Performance Goals**: el motor no se ralentiza más de un 10 % en `pnpm balance` (la detección de mano a mano y fuera
de juego es O(jugadores) por paso); navegación sin estados intermedios en red normal; indicador a 2,0 s ± 0,3 s.

**Constraints**:

- un único motor: la 2D no gana lógica propia (FR-003, Principio V);
- determinismo: misma semilla y versión ⇒ mismo partido; la refactorización no cambia ni un evento (FR-030);
- FR-023: goles por partido, freno a las goleadas (SC-009) y efecto de cada rasgo, sin regresión en el informe;
- datos de decisión nunca desde la caché (FR-025);
- Principio XI en «Gestionar equipo» (el indicador no hace crecer la chapa ni obliga a desplazarse).

**Scale/Scope**: ~12 ficheros del motor, 2 del protocolo/servidor, ~20 pantallas y componentes de la web, todo el repo
en la refactorización.

Sin NEEDS CLARIFICATION: las cuatro preguntas abiertas se cerraron en la sesión del 2026-11-13 (energía ≈ 50 % al 90',
alcance de los comentarios, peso de las estadísticas por comportamiento, qué datos no salen de la caché). Las causas y
técnicas están en [research.md](research.md).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo se cumple | Estado |
|-----------|----------------|--------|
| I. La estrategia es determinante | US5 sube el peso de las estadísticas en frecuencia y acierto; el cansancio da sentido a los cambios; la línea adelantada provoca fueras de juego por la posición de sus defensas. | ✅ |
| II. Draft | Sin cambios en las reglas del draft; la huella de 20 drafts comprueba que la refactorización no lo toca. | ✅ |
| III. Reglas de dominio explícitas | Mano a mano, fuera de juego y cansancio como funciones puras del motor con constantes en parámetros versionados; los tramos de energía, función pura con test. | ✅ |
| IV. Simulación coherente | Balón solo con contacto (prueba sobre fotogramas); versión 7.0.0 con informe; cada rasgo sigue con su comprobación (FR-023). Los partidos de versiones anteriores se ven como resumen (R14). | ✅ |
| V. Un único motor | La corrección del balón y la energía salen del motor; la 2D y la rápida solo pintan. | ✅ |
| VI. Integridad multijugador | La energía la calcula el servidor; el cliente no decide nada. Los datos de decisión no salen de la caché del cliente. | ✅ |
| VII. Colecciones y monetización | Sin cambios. | ✅ |
| VIII. Modularidad | Motor (`acciones/`, `modificadores/`), protocolo (pausa), web (loaders + caché en `api/`, indicador en `componentes/`). | ✅ |
| IX. Calidad con pruebas | Tests por historia; SC-002 a SC-009 en el informe de `pnpm balance`; SC-001/SC-005 con test de fotogramas y revisión en 2D; SC-011/SC-012 con huella, knip, jscpd y el script de comentarios. | ✅ |
| X. Incremental y trazable | Orden de entrega abajo; cada decisión de research cita su FR. | ✅ |
| XI. Sin desplazarse | El indicador va dentro de la chapa (encima y debajo del retrato), sin cambiar la rejilla de «Gestionar equipo». | ✅ |
| Flujo git | El agente no hace commit ni push. | ✅ |

**Re-check tras el diseño (Fase 1)**: todo en verde. Ningún principio necesita enmienda.

## Project Structure

### Documentation (this feature)

```text
specs/014-mejoras-motor-navegacion-refactor/
├── plan.md              # Este fichero
├── research.md          # Fase 0: R1–R14
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/
│   ├── motor.md         # Invariantes del balón, mano a mano, fuera de juego, cansancio y parámetros 7.0.0
│   ├── protocolo.md     # partido.pausa_decision con energía
│   ├── ui.md            # Indicador de energía y navegación sin pestañeo
│   └── calidad.md       # Huella, knip, jscpd y regla de comentarios
├── checklists/
└── tasks.md             # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/domain/src/parametros/index.ts            # PARAMETROS_V7 (7.0.0), tipos nuevos, VERSION_MAYOR_SOPORTADA = 7
packages/engine/src/
├── espacio/balon.ts                               # suelto: rueda en su dirección con rozamiento, no hacia el jugador
├── estado/estado.ts                               # EstadoEspacio.velocidadBalon (rodadura del suelto)
├── acciones/animaciones.ts                        # recuperarSuelto sin aId en la acción del balón
├── acciones/juego.ts                              # mano a mano por posición, fuera de juego real, sin sorteos
├── acciones/manoAMano.ts                          # NUEVO: esManoAMano, decisionManoAMano (puras)
├── acciones/fueraDeJuego.ts                       # NUEVO: enFueraDeJuego, penultimoDefensor (puras)
├── acciones/receptor.ts                           # excluir al último pasador sin presión; peso de receptores en fuera de juego
├── acciones/tiro.ts                               # rechace del portero/poste: posición en el disparo
├── acciones/opciones.ts                           # factores de stat con más pendiente (US5)
├── espacio/objetivos.ts                           # desmarque frenado en la línea según visión/posicionamiento
├── modificadores/cansancio.ts                     # tope en parámetros; energiaDe()
└── index.ts                                       # exporta energiaDe
packages/engine/tests/
├── coherenciaBalon.test.ts                        # NUEVO (SC-001)
├── manoAMano.test.ts, fueraDeJuego.test.ts        # NUEVOS
├── cansancio.test.ts                              # NUEVO (SC-006, tramos de prórroga)
└── fixtures/huella-014.json + generarHuella014.ts # NUEVOS (SC-011)
packages/protocol/src/ws/partido.ts                # MsgPartidoPausa.energia
apps/server/src/actores/partidoRapido.ts           # datosPausa añade energía (2D y rápida comparten)
apps/web/src/
├── api/cache.ts                                   # NUEVO: caché en memoria + revalidación + precarga
├── app/Rutas.tsx                                  # loaders por ruta
├── app/Marco.tsx                                  # IndicadorNavegacion (2 s)
├── componentes/IndicadorEnergia.tsx               # NUEVO: cara, % y penalización; tramoEnergia()
├── componentes/{GestionEquipo,CampoEquipo}.tsx    # energía en la chapa durante la pausa
├── componentes/BarraPrincipal.tsx                 # precarga al señalar/enfocar los enlaces
├── pantallas/*.tsx                                # leen del loader/caché en vez de useEffect + esqueleto
└── estilos/{base,campo}.css                       # indicador y barra de carga
tools/balance/src/checks/
├── motor014.ts                                    # NUEVO: mano a mano, ida y vuelta, fueras de juego, cansancio
└── pesoStats.ts                                   # NUEVO: series A/B +15 por estadística (SC-008)
scripts/comentarios.ts                             # NUEVO: lo exportado sin comentario (SC-012)
knip.json, .jscpd.json                             # NUEVOS: configuración de las revisiones
```

**Structure Decision**: el monorepo existente; ningún paquete nuevo. Las dos reglas nuevas del motor van en ficheros
propios de `acciones/` para probarlas sin montar un partido. La caché es un módulo de `api/`, junto al cliente HTTP.

### Orden de entrega

1. **US1** (balón) y **US3** (fuera de juego): P1, cambian la física y las reglas; se miden juntas en la 2D.
2. **US2** (mano a mano): P1, se apoya en el fuera de juego (no pasar a un compañero en fuera de juego).
3. **US4** (cansancio) y **US5** (estadísticas): P2, calibración final de la 7.0.0 con el informe; se fija
   `huella-014.json`.
4. **US6** (navegación): independiente del motor; puede ir en paralelo a 1–3.
5. **US7** (refactorización): al final, contra `huella-014.json` y la batería completa.

## Complexity Tracking

Sin violaciones de la constitución que justificar.
