# Roadmap de Fútboosterdraft

**Estado**: propuesta, pendiente de aprobación · **Fecha**: 2026-10-29 (actualizado el 2026-11-02) · **Constitución**: 1.3.0

Este documento es la *spec de specs* del proyecto: agrupa las especificaciones de `specs/` en iniciativas de
producto, fija su orden y dice cuándo se da por cerrada cada una. No sustituye a las specs: cada iniciativa remite
a la suya, y las que aún no tienen spec DEBEN tenerla antes de implementarse (constitución, Principio X y
"Decisiones aún pendientes").

## Cómo leerlo

- **Identificadores**: `INI-NN`. Son estables: no se renumeran ni se reutilizan. Una iniciativa descartada se queda
  con su id y el estado *Descartada*.
- **Prioridad**: **P0** bloquea la beta abierta · **P1** necesaria para la beta · **P2** después de la beta ·
  **P3** exploratoria.
- **Estado** (se decide por la evidencia de los checklists de validación, no por que exista la spec):

  | Estado | Significado |
  |---|---|
  | **Implementada** | Código en `main` y todos sus criterios de éxito comprobados y registrados. |
  | **Implementada, sin validar** | Código en `main` y pruebas automáticas en verde, pero faltan comprobaciones con personas, en un entorno real o manuales. |
  | **Parcial** | Parte del alcance o de los criterios de éxito no se cumple todavía. |
  | **Pendiente** | Aprobada como necesidad, sin implementar. Puede tener spec o no. |
  | **Idea** | Mencionada en specs o en la constitución como futuro; no aprobada como requisito. |

- **Hecha** significa que se cumplen todos sus criterios de cierre. Al cerrar una iniciativa se actualiza su fila
  y, si procede, la constitución ("Decisiones resueltas").

## Resumen

| Id | Iniciativa | Specs | Prioridad | Estado | Depende de |
|---|---|---|---|---|---|
| [INI-01](#ini-01-ciclo-central-del-juego) | Ciclo central del juego | 001, 002, 003 | P0 | Implementada, sin validar | — |
| [INI-02](#ini-02-experiencia-de-juego-y-ritmo) | Experiencia de juego y ritmo | 002, 003 | P1 | Implementada, sin validar | INI-01 |
| [INI-03](#ini-03-identidad-visual-y-accesibilidad) | Identidad visual y accesibilidad | 004 | P1 | Implementada, sin validar | INI-02 |
| [INI-04](#ini-04-virtudes-defectos-y-modo-duelo) | Virtudes, defectos y modo Duelo | 005 | P1 | Implementada, sin validar | INI-01 |
| [INI-05](#ini-05-calibración-del-motor-y-de-los-npc) | Calibración del motor y de los NPC | 003, 005 | P0 | Hecho | INI-04 |
| [INI-06](#ini-06-rendimiento-del-motor) | Rendimiento del motor | 001, 002 | P1 | Parcial | INI-05 |
| [INI-07](#ini-07-carga-y-escalabilidad-de-la-beta) | Carga y escalabilidad de la beta | 001, 002, 003, 009, 010 | P0 | Parcial | INI-06 |
| [INI-08](#ini-08-colecciones-fragmentos-y-tienda) | Colecciones, fragmentos y tienda | 006 | P1 | Implementada, sin validar | INI-01 |
| [INI-09](#ini-09-gobernanza-y-documentación-al-día) | Gobernanza y documentación al día | — | P0 | Hecho | — |
| [INI-10](#ini-10-preparación-para-producción) | Preparación para producción | sin spec | P0 | Pendiente | INI-07, INI-08, INI-09 |
| [INI-11](#ini-11-catálogo-de-cartas-definitivo) | Catálogo de cartas definitivo | 008 (fase 0.1), 011 | P1 | Parcial | INI-08, INI-05 |
| [INI-12](#ini-12-pagos-reales) | Pagos reales | sin spec | P2 | Pendiente | INI-10, INI-11 |
| [INI-13](#ini-13-modos-de-juego-adicionales) | Modos de juego adicionales | sin spec | P3 | Idea | INI-05, INI-09 |
| [INI-14](#ini-14-cosméticos-y-versiones-premium) | Cosméticos y versiones premium de cartas | 011 | P2 | Implementada | INI-08 |
| [INI-15](#ini-15-retoques-visuales-y-sonoros) | Retoques visuales y sonoros | 007, 012 | P1 | Parcial | INI-03, INI-04, INI-08 |

Los ids siguen el orden en que se registran, no el de prioridad: INI-15 se añadió al aparecer la spec 007.

## Dependencias

```mermaid
graph LR
  INI01[INI-01 Ciclo central] --> INI02[INI-02 UX y ritmo] --> INI03[INI-03 Identidad visual]
  INI01 --> INI04[INI-04 Virtudes y defectos] --> INI05[INI-05 Calibración]
  INI05 --> INI06[INI-06 Rendimiento] --> INI07[INI-07 Carga beta]
  INI01 --> INI08[INI-08 Colecciones y tienda]
  INI07 --> INI10[INI-10 Producción]
  INI08 --> INI10
  INI09[INI-09 Gobernanza] --> INI10
  INI08 --> INI11[INI-11 Catálogo definitivo]
  INI05 --> INI11
  INI10 --> INI12[INI-12 Pagos reales]
  INI11 --> INI12
  INI12 --> INI14[INI-14 Cosméticos y premium]
  INI05 --> INI13[INI-13 Modos adicionales]
  INI09 --> INI13
  INI03 --> INI15[INI-15 Retoques visuales y sonoros]
  INI04 --> INI15
  INI08 --> INI15
```

**Camino crítico a la beta**: INI-07 → INI-10. INI-05 e INI-09 están hechas; la carga de INI-07 ya no la limita el
motor (spec 009), sino la apertura de partidos y la entrega de sobres ([spec 010](specs/010-latencia-apertura-sobres/spec.md),
implementada, sin validar en tres máquinas). Con 100 partidas en un equipo de 8 núcleos, el límite medido es la CPU que
cuesta simular los partidos.

---

## INI-01 Ciclo central del juego

- **Objetivo**: validar el ciclo draft → preparación → partido → torneo (constitución, Principio X).
- **Alcance**: draft de 3 sobres de 8 cartas con selección simultánea y circulación I-D-I; plantilla de 24;
  formación, once, posiciones y táctica; partido en simulación rápida y 2D con un único motor; torneos liga,
  playoff y mixto (asíncronos desde 002/FR-030); NPC de cuatro niveles; invitados y cuentas.
- **Specs**: [001](specs/001-draft-manager-mvp/spec.md) (US1–US6), [002](specs/002-mejoras-mvp/spec.md) US11
  (torneos asíncronos), [003](specs/003-mejoras-ux-simulacion/spec.md) US3 (modo de simulación por partido).
- **Prioridad / estado**: P0 · **Implementada, sin validar**.
- **Evidencia**: [001/checklists/validacion.md](specs/001-draft-manager-mvp/checklists/validacion.md): lint, typecheck,
  unitarias, integración, equivalencia rápida/2D (SC-008) y e2e en verde. Sin cerrar:
  - 001/SC-003: 5 personas nuevas completan draft y alineación en < 30 min sin ayuda.
  - Correo real de avisos con un proveedor SMTP (solo probado con Mailpit).
  - Reproducción 2D a 60 fps en un portátil medio con el navegador visible (002/FR-025b).
  - T144 sigue sin marcar en [001/tasks.md](specs/001-draft-manager-mvp/tasks.md) aunque la validación está registrada.
  - 001/SC-017 (carga) se trata en INI-07.
- **Criterios de cierre**:
  1. 001/SC-003 medido con al menos 5 personas y registrado en `validacion.md`.
  2. Aviso de correo recibido en un buzón externo real.
  3. 60 fps (nunca < 30) medidos en un portátil medio.
  4. T144 marcada.

## INI-02 Experiencia de juego y ritmo

- **Objetivo**: que jugar sea fluido: sin esperas, navegación clara, partido 2D creíble y preparación del equipo cómoda.
- **Alcance**: cartas legibles, botón «Siguiente», 2D fluida, penalizaciones de posición, «Finalizar partido»,
  barra de navegación, colocación libre, dorsales, goleadores, apertura de sobres (002 US1–US10); campo único de
  preparación, botones principales, gestión en el descanso, pantalla de resultado, campeón/eliminado, nombre y
  equipación, dificultad de partida Fácil/Normal/Difícil/Extrema (003 US2, US4–US8, US10, US11, FR-038a).
- **Specs**: [002](specs/002-mejoras-mvp/spec.md), [003](specs/003-mejoras-ux-simulacion/spec.md).
- **Prioridad / estado**: P1 · **Implementada, sin validar**.
- **Evidencia**: hallazgos H1–H14 de la prueba con personas de la 003 corregidos y cubiertos por e2e
  ([003/checklists/validacion.md](specs/003-mejoras-ux-simulacion/checklists/validacion.md)). Sin cerrar:
  - 002: SC-001 (cartas con 5 personas), SC-009 (comparativa con la versión anterior), SC-007a (revisión visual de
    3 partidos a x2), FR-025b (60 fps) — [002/checklists/validacion.md](specs/002-mejoras-mvp/checklists/validacion.md); T159 abierta.
  - 003: SC-008, SC-011, SC-012, SC-013, SC-014, SC-016 y SC-019 pendientes de repetir tras los hallazgos; T133 abierta.
- **Criterios de cierre**:
  1. Los criterios con personas de 002 y 003 listados arriba medidos y registrados.
  2. T159 (002) y T133 (003) marcadas.
  3. Ningún hallazgo crítico abierto en la segunda ronda con personas.

## INI-03 Identidad visual y accesibilidad

- **Objetivo**: una identidad visual coherente, saber siempre qué hacer después y uso cómodo en móvil y con
  tecnologías de apoyo.
- **Alcance**: 004 US1–US5; guía [docs/diseno/DESIGN.md](docs/diseno/DESIGN.md).
- **Specs**: [004](specs/004-mejoras-visuales-diseno/spec.md).
- **Prioridad / estado**: P1 · **Implementada, sin validar**.
- **Evidencia**: lint de tokens, unitarias, 22 e2e de diseño (en CI) e integración en verde; tipografías dentro de
  presupuesto (SC-009). Sin cerrar:
  - T074: recorrer [checklists/visual.md](specs/004-mejoras-visuales-diseno/checklists/visual.md) a 1366 × 768 y 360 × 640.
  - T076: SC-003 (prueba de cinco segundos, 10 personas), SC-004 y SC-010 (5 personas); las tablas de
    [004/checklists/validacion.md](specs/004-mejoras-visuales-diseno/checklists/validacion.md) están vacías.
- **Criterios de cierre**: T074 y T076 hechas, con las tablas de `validacion.md` rellenas y SC-003, SC-004 y SC-010 cumplidos.
- **Nota**: conviene hacer la sesión con personas de INI-01, INI-02, INI-03 e INI-08 a la vez (ver "Decisiones").

## INI-04 Virtudes, defectos y modo Duelo

- **Objetivo**: rasgos positivos y negativos con efecto medible en el partido y un modo de torneo nuevo.
- **Alcance**: 005 US1–US6: «virtudes» en todo el juego, 15 defectos, modo «Duelo de jugadores», penaltis,
  lesiones y tarjetas creíbles, cuatro virtudes nuevas y [docs/juego/virtudes-y-defectos.md](docs/juego/virtudes-y-defectos.md).
- **Specs**: [005](specs/005-virtudes-defectos/spec.md).
- **Prioridad / estado**: P1 · **Implementada, sin validar**. Las 123 tareas están marcadas, pero no toda la
  validación pasa.
- **Evidencia**: [005/checklists/validacion.md](specs/005-virtudes-defectos/checklists/validacion.md): unitarias,
  equivalencia, integración, SC-004, SC-005, SC-010 y SC-011 en verde con n = 1.000. Sin cerrar:
  - 005/FR-051 en virtudes y defectos: cumplido en INI-05 (2026-11-01) con la comprobación por pares y el criterio
    nuevo 005/SC-013 (los stats pesan más que cualquier virtud).
  - Constitución 1.2.0 (vocabulario «virtudes y defectos», modo Duelo): aplicada en INI-09 (2026-11-02).
- **Criterios de cierre**: ~~FR-051 cumplido en virtudes y defectos~~ (cerrado por INI-05) y ~~constitución 1.2.0
  aplicada~~ (cerrado por INI-09). Queda la validación con personas.

## INI-05 Calibración del motor y de los NPC

- **Objetivo**: que el motor 3.0.0 cumpla todos los criterios estadísticos de las specs 001 a 005, de modo que la
  estrategia sea determinante (Principios I y IV) y el CI no necesite excepciones.
- **Alcance**: parámetros de `packages/domain/src/parametros/v3.json`; criterios estadísticos mal planteados;
  comprobaciones que no se pueden medir con el tamaño de muestra actual.
- **Specs**: [003](specs/003-mejoras-ux-simulacion/spec.md) (T033, T034; [calibracion-motor.md](specs/003-mejoras-ux-simulacion/checklists/calibracion-motor.md),
  [calibracion-npc.md](specs/003-mejoras-ux-simulacion/checklists/calibracion-npc.md)), [005](specs/005-virtudes-defectos/spec.md) (FR-051, research R2).
- **Prioridad / estado**: P0 · **Hecho** (2026-11-01, parámetros 5.0.0).
- **Evidencia**:
  - NPC: 003/SC-010, SC-010a y SC-010b cumplidos en la ronda 4. **Hecho.**
  - Motor: ronda 14 de [calibracion-motor.md](specs/003-mejoras-ux-simulacion/checklists/calibracion-motor.md), estado
    **cerrada**. `pnpm balance --n 1000 --serie todas` pasa 49 de 49 con las semillas 1 y 2. El CI ejecuta `--n 1000` sin
    `--pendientes`. T033, T034 y T036 marcadas.
  - Decisiones: 003/SC-001c relativo al pool (spec 003), FR-051 por pares y 005/SC-013 (spec 005), 002/SC-007a con 9
    centros y 2 contraataques (spec 002).
  - *Histórico (antes de INI-05):*
    - Motor: calibración marcada como **abierta**. El CI pasa a `--pendientes` siete comprobaciones
      ([ci.yml](.github/workflows/ci.yml)): 002/SC-007a, 002/SC-008, 003/SC-009, SC-006a, 003/SC-006, 005/SC-011 y
      005/FR-051. Además falla 003/SC-001c (goles por torneo Core), cuyo criterio no es alcanzable con 28 partidos por torneo.
    - T036 (regenerar escenarios de `tools/fixtures`) está resuelta por el commit `29bf61e` y sus 12 pruebas pasan
      (comprobado el 2026-10-28), pero sigue sin marcar.
- **Criterios de cierre**:
  1. Decisión registrada sobre los criterios no medibles (003/SC-001c, regate de 003/SC-006): reformularlos en su
     spec o aceptar el fallo documentado.
  2. `pnpm balance --n 1000 --serie todas` pasa todas las comprobaciones vigentes con dos semillas.
  3. La lista `--pendientes` de `ci.yml` queda vacía.
  4. T033, T034 y T036 marcadas y `calibracion-motor.md` con estado **cerrada**.

## INI-06 Rendimiento del motor

- **Objetivo**: que el motor cumpla 002/FR-028a (≤ 25 ms por partido sin fotogramas y ≤ 40 ms con fotogramas en
  Node 22) para sostener torneos con muchos NPC.
- **Alcance**: optimización de `packages/engine` sin cambiar resultados (la equivalencia y las semillas deben seguir idénticas).
- **Specs**: [002](specs/002-mejoras-mvp/spec.md) FR-028a, T086.
- **Prioridad / estado**: P1 · **Parcial**. Medido: 82,9 ms (002), 103 ms (004) y 107 ms (005) sin fotogramas. El
  umbral bloqueante del CI se subió a 120 ms (commit `e850c11`) para que no falle, lo que no cumple el requisito.
- **Dependencia**: tras INI-05, porque calibrar cambia el coste por partido y optimizar antes obliga a medir dos veces.
- **Criterios de cierre**:
  1. `pnpm --filter @fbd/engine bench` ≤ 25 / 40 ms en la máquina de referencia (que hay que fijar y documentar),
     o FR-028a revisado en su spec con un objetivo justificado.
  2. `umbral-motor` del CI con el objetivo de FR-028a.
  3. `pnpm test:equivalence` en verde sin cambios en los resultados.
  4. T086 marcada.

## INI-07 Carga y escalabilidad de la beta

- **Objetivo**: demostrar 001/SC-017: 100 partidas simultáneas con los tiempos de respuesta del MVP.
- **Alcance**: rehacer `tools/load/beta-100.js` con el protocolo actual (un VU por humano) y medir en un entorno
  parecido al de producción.
- **Specs**: [001](specs/001-draft-manager-mvp/spec.md) SC-017 y SC-009; [002](specs/002-mejoras-mvp/tasks.md) T153;
  [003](specs/003-mejoras-ux-simulacion/tasks.md) T128; [009](specs/009-simulacion-hilos-trabajo/spec.md) (simulación
  en hilos de trabajo; T036 aplazada hasta tener tres máquinas); [010](specs/010-latencia-apertura-sobres/spec.md)
  (latencia de apertura de partidos y de entrega de sobres; implementada, sin validar: T036 aplazada hasta tener tres
  máquinas).
- **Prioridad / estado**: P0 · **Parcial**. En la 001 no se cumplió (entrega del sobre p95 1,99 s frente a < 1 s,
  «Seguir» → final p95 6,2 s frente a < 3 s). Desde la 002 el guion no se ha vuelto a ejecutar con el protocolo
  nuevo, y su resultado de la 002 apunta a un fallo del guion, no del servidor. **2026-10-31**: guion rehecho con un
  VU por humano (T153 y T128 marcadas, criterio 1 cumplido). En la prueba de humo (2 partidas, una máquina) todo
  cumple salvo `apertura_ms` (p95 11,1 s frente a < 3 s): abrir partidos entre humanos a la vez se encola en la
  partida. **2026-11-01**: la causa era esperar el SMTP de los avisos dentro de la partida (arreglado). Con 10
  partidas `apertura_ms` queda en p95 8,7 s: el motor (150–400 ms por partido entre humanos) corre en el hilo
  principal. Ver [003/validacion.md](specs/003-mejoras-ux-simulacion/checklists/validacion.md). **2026-11-02**: con
  la simulación en hilos de trabajo ([009](specs/009-simulacion-hilos-trabajo/spec.md)), 100 partidas (730 humanos,
  todos abren a la vez) en dos máquinas por Wi-Fi: las 100 terminan, 0 errores y ninguna apertura cortada (antes el
  22 %); `final_ms` p95 1,06 s y `jornada_npc_ms` p95 3,41 s cumplen, pero `entrega_sobre_ms` (p95 2,39 s) y
  `apertura_ms` (p95 42 s) no. Las colas de cálculo se quedan vacías: el límite ya no es el motor sino el hilo
  principal y la cola de cada partida. Sin cumplir aún el criterio 2: faltan tres máquinas y red por cable.
  **2026-11-03** ([spec 010](specs/010-latencia-apertura-sobres/spec.md), entorno de referencia: servidor, PostgreSQL
  y k6 en un mismo equipo de 8 núcleos, por cable, sin Docker Desktop; ver
  [diagnostico.md](specs/010-latencia-apertura-sobres/diagnostico.md)): aperturas de una partida resueltas en grupo
  (US2), cierre de turno del draft en una transacción (US3) y consultas del grupo de aperturas de 115 a 39. Con 10
  partidas se cumplen todos los umbrales (`apertura_ms` p95 de 2,93 s a 1,87 s; `entrega_sobre_ms` p95 163 ms). Con
  100 partidas las 100 terminan, sin bloqueos ni errores de WebSocket, pero `apertura_ms` (p95 de 27,17 s a 14,43 s;
  15,93 s al repetir), `entrega_sobre_ms` (p95 de 1,56 s a 1,67 s; 1,49 s al repetir) y `final_ms` (p95 de 1,01 s a
  3,63 s; 3,44 s al repetir) no cumplen, y `jornada_npc_ms` cumple pero empeora (p95 de 2,7 s a 5,1 s). Durante esa prueba el equipo está al 94 % de CPU de media y `node` usa 5,6 núcleos:
  el límite ya no es la base de datos sino el coste de simular los partidos. Sigue sin cumplir el criterio 2; la
  medición en tres máquinas (010/T036) queda aplazada.
- **Trabajo futuro**: abaratar la simulación del motor sin perder experiencia de juego. Motivo: con 100 partidas en un
  equipo de 8 núcleos la CPU está saturada (94 % de media, `node` 5,6 núcleos) y la apertura sigue en ~15 s de p95
  ([010/diagnostico.md](specs/010-latencia-apertura-sobres/diagnostico.md), «Uso de CPU con 100 partidas»). Requiere
  spec propia y se relaciona con [INI-06](#ini-06-rendimiento-del-motor); los resultados deben seguir idénticos
  (`pnpm test:equivalence`) o, si cambian, justificarse con calibración (INI-05).
- **Criterios de cierre**:
  1. Guion actualizado al protocolo vigente (T153 y T128 marcadas; son la misma tarea).
  2. 001/SC-017 cumplido, con servidor, base de datos y generador de carga en máquinas separadas, y resultado registrado.
  3. 0 errores de WebSocket atribuibles al servidor.

## INI-08 Colecciones, fragmentos y tienda

- **Objetivo**: la estructura de colecciones y el esqueleto de la monetización, respetando que todos juegan con las
  mismas reglas de draft (Principio VII).
- **Alcance**: 006 US1–US7: colección propia y activa con su mínimo, fragmentos (torneos ganados y desfragmentar),
  tienda de sobres, colecciones y fragmentos con **pago simulado**, cartas con bandera, escudo e imagen de fondo.
- **Specs**: [006](specs/006-preparacion-bd-cartas/spec.md).
- **Prioridad / estado**: P1 · **Implementada, sin validar**. No hay `checklists/validacion.md` de la 006.
- **Evidencia**: 110 de 112 tareas marcadas; tests de integración estabilizados (commits `c56b889`, `f1ab80b`). Sin cerrar:
  - T103: escenarios manuales A–O de [quickstart.md](specs/006-preparacion-bd-cartas/quickstart.md), incluido 360 px en «Colección» y «Tienda».
  - T087: escudos oficiales; desactivados (`ESCUDOS_ACTIVOS = false`) por licencia sin revisar. **Bloquea producción**
    ([docs/despliegue.md](docs/despliegue.md)).
  - 006/SC-007 (idempotencia de compras con dobles pulsaciones y cortes) debe quedar registrado en la validación.
- **Criterios de cierre**:
  1. `specs/006-preparacion-bd-cartas/checklists/validacion.md` creado con pruebas automáticas y escenarios A–O.
  2. T103 marcada.
  3. Escudos con licencia revisada y activados, o retirados de FR-044 por decisión registrada (T087).

## INI-09 Gobernanza y documentación al día

- **Objetivo**: que la constitución, el README y los estados de las specs reflejen lo que hay en `main`.
- **Alcance** (sin código):
  - Aplicar con `/speckit-constitution` las enmiendas pendientes: la PATCH 1.0.5 de la 003
    ([propuesta](specs/003-mejoras-ux-simulacion/propuesta-constitucion-1.0.5.md); su TODO sigue en el Sync Impact
    Report) y la MINOR 1.2.0 de la 005 ([propuesta](specs/005-virtudes-defectos/propuesta-constitucion-1.2.0.md)).
    Ambas se redactaron sobre versiones anteriores (1.0.4 y 1.1.0) y hay que rebasarlas sobre la 1.1.1.
  - Registrar el modo «Duelo de jugadores» (005) como decisión resuelta: hoy la constitución dice que los modos
    adicionales a liga, playoff y mixto están pendientes, y ya hay uno implementado.
  - Actualizar el README: el estado dice «MVP implementado», la tabla de documentación solo enlaza la 001 y la de
    `tools/balance` se queda en la 003.
  - Cambiar `**Status**: Draft` de las specs según este roadmap y añadir este documento al `CLAUDE.md`.
- **Prioridad / estado**: P0 · **Hecho** (2026-11-02).
- **Evidencia**: constitución 1.2.0 con las dos propuestas rebasadas sobre la 1.1.1 (marcadas como aplicadas) y sin
  TODOs; modo Duelo en "Decisiones resueltas"; README con el estado de este roadmap, enlaces a las specs 002–009 y
  `tools/balance` al día; las nueve specs pasan de `Draft` a «Implementada, sin validar» con su iniciativa; este
  documento enlazado desde `CLAUDE.md` y con las specs 008 y 009 en su tabla.
- **Criterios de cierre**: ~~constitución ≥ 1.2.0 sin TODOs en el Sync Impact Report; README con el estado de este
  roadmap; ninguna spec con estado `Draft` si está implementada~~ (cumplidos).

## INI-10 Preparación para producción

- **Objetivo**: poder abrir la beta a personas ajenas al proyecto con datos persistentes y sin riesgos legales abiertos.
- **Alcance propuesto** (a concretar en su spec): despliegue según [docs/despliegue.md](docs/despliegue.md); SMTP
  real; copias de seguridad y restauración probadas; registros y métricas mínimos para diagnosticar partidas
  bloqueadas; revisión de seguridad de autenticación y de la tienda; textos legales (privacidad, condiciones);
  resolución de los riesgos que bloquean producción (escudos).
- **Specs**: ninguna. **Requiere spec nueva** (p. ej. `011-beta-produccion`; la 010 se reserva para la latencia de INI-07).
- **Prioridad / estado**: P0 · **Pendiente**.
- **Dependencias**: INI-07 (la carga debe aguantar), INI-08 (escudos), INI-09.
- **Criterios de cierre**: los criterios de éxito de su spec, como mínimo: despliegue reproducible desde la imagen
  Docker, restauración de una copia probada, ningún riesgo abierto que bloquee producción en `docs/despliegue.md`.

## INI-11 Catálogo de cartas definitivo

- **Objetivo**: pasar del Core ficticio de 300 cartas y las 75 de prueba al catálogo real, que es para lo que la 006
  preparó el modelo («fase previa a la creación de la base de datos de las cartas»).
- **Alcance propuesto**: contenido de Core y de las primeras colecciones de pago (40–50 cartas cada una); imágenes
  propias de GOAT y Legendarias; historias de las cartas; validación de equilibrio del nuevo pool con `pnpm balance --serie core`;
  política de derechos de imagen y nombres de jugadores reales, si se usan.
- **Specs**: [008](specs/008-datos-reales-core/spec.md) (fase 0.1: las 300 cartas de Core son jugadores reales, con
  retratos; fuente `data/core-real.json`). La base es [006](specs/006-preparacion-bd-cartas/spec.md) FR-001 a FR-012. Las
  colecciones de pago, las historias y la política de derechos **requieren spec nueva**.
- **Prioridad / estado**: P1 · **Parcial**. 008: T012 y T022 (comprobaciones manuales en `pnpm dev`) abiertas.
  Con nombres y retratos de futbolistas reales, la política de derechos de imagen es ya un riesgo para producción
  (INI-10), no solo para el catálogo definitivo.
- **Hecho (2026-11-03): una sola fuente para la colección Core.** Se retiró `data/core.json`; el seed, los tests y
  `tools/` leen `data/core-real.json` (versión `2.0.0`), y `pnpm --filter @fbd/fixtures core-real` ya solo lo valida y
  regenera `specs/008-datos-reales-core/sumario.md`. Los e2e `cartas`, `coleccion`, `partido-rapido`, `dorsales` y
  `tienda` ya usan el Core real y el nombre de la carta (`nombreCarta`) en lugar del primer apellido. `torneo` no
  fallaba por los datos: el invitado se desconectaba al ir a la portada y su partida se abandonaba a los 10 minutos
  de reloj simulado; ahora lo juega un usuario registrado.
- **Hecho (2026-11-08): [011](specs/011-rework-tienda/spec.md).** Se mantienen los jugadores reales, pero los
  300 retratos de Core pasan a ser propios (estilo manga, entregados por el responsable del juego) y se retiran los de
  terceros. Hay un plan B de **identidad alternativa** (nombres y retratos genéricos) que se activa con
  `pnpm --filter @fbd/server ajuste identidad_cartas alternativa`, sin reiniciar y solo en las partidas nuevas.
  Hecho (2026-11-05): los 300 retratos están en `apps/web/public/cartas/retratos-propios/` y la validación de Core
  rechaza los de terceros («retratos de terceros: 0» en el sumario). Ninguna carta tiene aún identidad alternativa:
  en «alternativa» todas usan el nombre genérico (`Defensa 40`) y la silueta.
- **Dependencias**: INI-08 (modelo de colecciones) e INI-05 (el equilibrio del catálogo se mide con el motor ya calibrado).
- **Criterios de cierre**: los de su spec, como mínimo: `pnpm seed` carga el catálogo nuevo; validación del catálogo
  en verde; serie Core dentro de los criterios estadísticos; derechos de todo el contenido revisados.

## INI-12 Pagos reales

- **Objetivo**: sustituir el pago simulado (006/FR-031) por una pasarela real con facturas.
- **Alcance propuesto**: pasarela, facturación, reembolsos, conciliación con el saldo de fragmentos y auditoría de compras.
- **Specs**: ninguna. **Requiere spec nueva**; debe respetar el Principio VII (sin ventajas fuera de las reglas de draft).
- **Prioridad / estado**: P2 · **Pendiente**.
- **Dependencias**: INI-10 (entorno de producción) e INI-11 (algo que vender).
- **Criterios de cierre**: los de su spec, como mínimo: 006/SC-007 (cada compra se cobra una vez) con la pasarela real
  en su entorno de pruebas, y revisión de seguridad aprobada.

## INI-13 Modos de juego adicionales

- **Objetivo**: nuevos modos además de liga, playoff, mixto y Duelo.
- **Specs**: ninguna. La constitución lo lista en "Decisiones aún pendientes"; no está aprobado como requisito.
- **Prioridad / estado**: P3 · **Idea**.
- **Dependencias**: INI-05 (sin calibrar, un modo nuevo hereda los desequilibrios) e INI-09 (registrar Duelo primero).
- **Criterios de cierre**: no se definen hasta que exista una spec aprobada.

## INI-14 Cosméticos y versiones premium de cartas

- **Objetivo**: ampliar la tienda con cosméticos (006/FR-033) y versiones premium de las cartas (006/FR-003).
- **Specs**: [011](specs/011-rework-tienda/spec.md) (monetización cosmética: 38 escudos y 31 diseños de sobre, sueltos
  o en packs fijos, con fragmentos o euros simulados). Mientras no haya licencia de imagen, el dinero real solo compra
  cosméticos (constitución 1.4.0, Principio VII); las versiones premium de cartas quedan fuera.
- **Prioridad / estado**: P2 · **Implementada** (011, cerrada el 2026-11-08). Hecho: catálogo de cosméticos en
  `data/cosmeticos.json`, escudos en el marcador, el resumen y el 2D, sobres con carrusel y rasgadura propia, venta en
  la tienda (por secciones y con previsualización a tamaño grande) y tienda de cartas solo en fragmentos. Recorridos
  manuales 1–17 del quickstart aprobados (T068, T077) y `pnpm e2e` en verde. Las versiones premium de cartas siguen
  fuera hasta tener licencia de imagen.
- **Riesgo (economía de fragmentos, 011 research R11)**: sin venta de fragmentos, solo entran por torneos ganados (10),
  duplicados y desfragmentar; un cosmético de 250 fragmentos equivale a unos 25 torneos ganados y una colección a
  cientos. Requiere una spec de economía que revise `recompensaTorneo`.
- **Dependencias**: INI-08 (tienda y fragmentos). Los pagos reales (INI-12) solo hacen falta para cobrar de verdad.
- **Criterios de cierre**: los de la 011 (SC-001 a SC-009); debe respetar el Principio VII.

## INI-15 Retoques visuales y sonoros

- **Objetivo**: pulir la presentación antes de la beta: marca, cartas, sobre y sonido.
- **Alcance**: 007 US1–US6: cartas con marcos y fondos por rareza (Superclase, Crack, Legendaria, GOAT), sonidos más
  suaves (−20 %) y cuatro momentos sonoros nuevos (choque y ruleta de forma en los duelos, campeón, derrota), logo
  oficial en SVG, seis fondos de página nuevos, sin tablas de goleadores en el modo Duelos y nuevo sobre con su
  animación. Los recursos de origen están en `temp/`, que debe desaparecer al cerrar la spec (FR-021).
- **Specs**: [007](specs/007-retoques-visuales/spec.md), [012](specs/012-mejoras-simulacion-2d/spec.md).
- **Spec 012 (implementada el 2026-11-08, sin validar)**: sonidos del partido, del draft, del botón principal y de la
  tienda (síntesis propia; público y caja registradora provisionales, a sustituir por CC0), celebraciones de gol como
  cosmético (4 gratuitas + 1 de prueba de clase secuencia), franja de la 2D de altura fija y tarjetas con su color,
  «Gestionar equipo» con la mesa de Formación, «Control total» de lesiones y expulsiones contra un NPC (el motor resuelve
  los lances al terminar el paso: partido 14 de `equivalencia-005.json` regenerado), alineación confirmada respetada
  con bloqueo `409 BAJA_PENDIENTE` y avisos del equipo, escudos en Plantillas y botones de sesión. Pendiente: los
  recorridos a mano del [quickstart](specs/012-mejoras-simulacion-2d/quickstart.md), SC-009 con 5 personas y la
  comparación del informe de `pnpm balance` con `balance-antes/`.
- **Spec 012, ronda 2 (2026-11-08)**: grabaciones CC0 reales para pitidos, público y caja; celebraciones elaboradas y
  sin rótulo «¡Gol!», de igual duración a cualquier velocidad; en la 2D con control total, parada en cada gol; sin
  control total en la simulación rápida; arreglo del bloqueo de «Confirmar alineación» con bajas en el banquillo;
  avisos arriba a la derecha; ficha del equipo en Plantillas; motor 6.2.0 (el que gana de mucho baja la intensidad y
  salen más porteros en los sobres) tras un 41-5 en 5 partidos. Pendiente: T089 (recorrido a mano).
- **Prioridad / estado**: P1 · **Parcial**. 007: 62 de 63 tareas marcadas, incluida la segunda ronda de correcciones (T054–T063).
- **Dependencias**: INI-03 (sistema de diseño y [DESIGN.md](docs/diseno/DESIGN.md)), INI-04 (modo Duelos) e INI-08
  (rarezas y presentación de la carta de la 006).
- **Evidencia**: sin `checklists/validacion.md`. Sin cerrar:
  - ~~007/SC-007~~: `temp/` se borró en el commit `368a990`; T050 marcada el 2026-11-02 y `test ! -d temp` en verde.
  - T052: `pnpm typecheck`, `pnpm lint`, `pnpm test` y `pnpm e2e` completos. T063 solo cubrió unitarias de web y las e2e afectadas.
  - 007/SC-004 (ningún efecto agudo o molesto en una escucha de prueba) y SC-003 (carga no más lenta) necesitan
    una comprobación con personas; entran en la sesión común de INI-01 a INI-03.
  - Trazabilidad: el botón «Abandonar» en la barra de navegación (T062) se implementó en la segunda ronda sin
    requisito en la spec 007; hay que añadirlo a su `spec.md` o a la de la funcionalidad de abandono (Principio X).
- **Criterios de cierre**:
  1. ~~`temp/` eliminado del repositorio (T050) y T051 repetida en verde~~ (cumplido).
  2. T052 en verde y registrada en `specs/007-retoques-visuales/checklists/validacion.md`.
  3. SC-001 a SC-008 comprobados en esa validación.
  4. «Abandonar» recogido como requisito con su criterio de aceptación.

---

## Decisiones tomadas en esta propuesta

1. **Iniciativas por objetivo de producto, no una por spec.** Las specs 002 y 003 mezclan UX, motor y calibración;
   separarlas (INI-02, INI-05) deja ver que lo que bloquea la beta es la calibración, no la interfaz.
2. **«Implementada, sin validar» como estado propio.** Casi todas las specs tienen las tareas de código hechas y solo
   faltan las de validación con personas o en entorno real. Contarlas como hechas ocultaría trabajo; contarlas como
   parciales mezclaría eso con requisitos que no se cumplen (FR-028a, SC-017).
3. **Calibración antes que rendimiento.** Optimizar el motor y luego recalibrarlo obliga a medir dos veces.
4. **Una única sesión con personas** para INI-01, INI-02, INI-03 e INI-08: comparten perfil de participantes y
   equipo, y la 004 ya prevé comparar con una versión anterior.
5. **Criterios no medibles se reformulan en su spec**, no se aflojan en el CI. Hoy el CI tolera siete comprobaciones
   con `--pendientes` y un umbral de 120 ms frente a los 25 ms del requisito: este roadmap no las da por cumplidas.
6. **Lo que no tiene spec no se implementa** (INI-10 a INI-14): primero `/speckit-specify`.

## Comprobaciones pendientes (resumen)

| Comprobación | Dónde | Iniciativa |
|---|---|---|
| 7 comprobaciones de `balance` en `--pendientes` y 003/SC-001c | `.github/workflows/ci.yml`, `calibracion-motor.md` | INI-05 |
| FR-028a: 25 / 40 ms por partido (CI a 120 ms) | `pnpm --filter @fbd/engine bench` | INI-06 |
| 001/SC-017: carga de 100 partidas | `tools/load/beta-100.js` | INI-07 |
| Pruebas con personas: 001/SC-003; 002/SC-001, SC-009, SC-007a; 003/SC-008, SC-011–SC-014, SC-016, SC-019; 004/SC-003, SC-004, SC-010 | checklists `validacion.md` | INI-01 a INI-03 |
| 60 fps en un portátil medio con el navegador visible | 002/FR-025b | INI-01, INI-02 |
| Correo con SMTP real | 001 escenario E | INI-01, INI-10 |
| Escenarios manuales A–O de la 006 | `specs/006-preparacion-bd-cartas/quickstart.md` | INI-08 |
| Licencia de los escudos | `docs/despliegue.md` | INI-08, INI-10 |
| Tests intermitentes: `torneo-asincrono` con la máquina cargada; `torneo.spec.ts` y la regla de 10 minutos sin conexión con el reloj simulado | 002, 003 y 004 `validacion.md` | INI-07 |
| Tareas hechas sin marcar: T036 (003), T144 (001) | `tasks.md` | INI-05, INI-01 |
| Batería completa tras la 007 (T052) | `pnpm typecheck`, `lint`, `test`, `e2e` | INI-15 |
| Escucha de prueba de los sonidos (007/SC-004) | sesión con personas | INI-15 |
