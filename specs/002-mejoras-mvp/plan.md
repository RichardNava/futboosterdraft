# Implementation Plan: Mejoras del MVP — cartas, ritmo de juego, navegación, simulación 2D y reglas

**Branch**: `002-mejoras-mvp` | **Date**: 2026-10-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-mejoras-mvp/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

La spec 002 mejora el MVP en tres frentes. Se construye sobre el código de la spec 001; no hay pila nueva.

1. **Ritmo de juego**:
   - el draft pasa a ser la única fase síncrona, y los torneos son siempre asíncronos;
   - botón de avanzar en cada espera;
   - barra de navegación con el modal de abandono solo en el draft con otros humanos;
   - pausa de las partidas en solitario;
   - «Finalizar partido».
2. **Simulación 2D**:
   - una capa espacial continua y determinista dentro del motor sustituye a la rejilla de 6 × 3 celdas;
   - el reloj de reproducción es lineal y condensado: 4, 2 y 1 minuto a x2, x4 y x8;
   - acciones con origen, destino y física creíbles;
   - fotogramas compactos con suavizado de Hermite.
3. **Reglas y presentación**:
   - penalizaciones por posición proporcionadas (parámetros 2.0.0);
   - colocación libre por zonas, con ofensividad calculada;
   - dorsales del 1 al 24 con reasignación;
   - tablas de goleadores y asistentes;
   - cartas nuevas y animación de apertura con sonido.

**Enfoque técnico** (ver [research.md](./research.md)):
- **Modelo síncrono frente a asíncrono**: la evaluación de FR-029 está en R1.
- **Motor**: se amplía con un módulo `espacio/` (R3) y una selección de acciones con datos espaciales (R4). Ambos se calculan siempre, así que la rápida y la 2D siguen siendo un único cálculo.
- **Servidor**: sustituye la espera al reloj del humano más lento (001/R11) por:
  - un búfer de anticipación de 3 s en la 2D en directo contra un NPC (R6);
  - un procedimiento único `resolverResto` para finalizar, vencer un plazo y resolver los partidos entre humanos y los NPC contra NPC (R7);
  - una resolución única al abrir el partido, con la vista filtrada "pendiente de ver" (R8).

## Technical Context

**Language/Version**: TypeScript 5.x; Node.js 22 LTS; navegadores modernos (sin cambios, 001/R1).

**Primary Dependencies**:
- Las mismas de la spec 001.
- **Nueva**: `@fastify/compress` para la reproducción por HTTP.
- `permessage-deflate` en `ws` (configuración, no es una dependencia).
- **Sonido**: Web Audio API nativa.
- **Arrastre y popovers**: Pointer Events y el atributo `popover` de HTML. Sin librerías de interfaz nuevas.

**Package Manager**: pnpm 9, sin excepciones (001/R17, CLAUDE.md).

**Storage**: PostgreSQL 16. La migración `0004`:
- elimina `partidas.ritmo`;
- añade a `mesas_draft` las columnas `pausada_en` y `restante_ms`;
- añade a `partidos` las columnas `resolucion` y `abierto_por_id`;
- crea la tabla `visionados`.

La alineación (con `colocacion`) y el estado del torneo (con `aportaciones`) siguen en JSONB, sin cambios de esquema.

**Testing**:
- Vitest y fast-check: dominio, motor y los invariantes nuevos 5 a 9.
- Testcontainers: integración.
- Playwright: escenarios A a K y desbordamiento de las cartas a 360 px.
- `balance`: criterios nuevos SC-007, SC-008, SC-011 y SC-018, y el recalibrado de la spec 001.
- `bench` del motor: nuevo.

**Target Platform**: servidor Linux en Docker; cliente web de escritorio. **Novedad**: las cartas y la barra deben funcionar en móviles de 360 px de ancho (FR-003). El resto de la interfaz no debe romperse en móvil, aunque sigue sin ser un objetivo completo.

**Project Type**: aplicación web (monorepo con paquetes de dominio compartidos), como en la spec 001.

**Performance Goals**:
- Motor: ≤ 25 ms por partido sin fotogramas, ≤ 40 ms con fotogramas y `resolverResto` ≤ 30 ms (R3, R7).
- Avanzar: < 1 s en el 95 % de los casos (SC-003); finalizar: < 3 s en el 95 % (SC-010).
- 2D: reloj lineal con un margen de ±10 % por minuto (SC-005) y ±5 % por parte y partido (SC-006), a 60 fps.
- Cálculo de la colocación en el cliente: < 1 ms (SC-016).
- Draft de 1 humano y 7 NPC: < 5 min (SC-004).

**Constraints**:
- Motor determinista sin coma flotante en las decisiones espaciales (enteros en décimas e `isqrt`).
- Servidor autoritativo para la resolución, la colocación y los dorsales.
- Visibilidad por participante (resultados pendientes de ver).
- Idempotencia de todos los botones de avanzar.
- Fotogramas recalculados, no guardados.

**Scale/Scope**:
- Beta de 100 partidas simultáneas, sin cambios.
- 11 historias de usuario.
- Unas 6 pantallas modificadas: draft, alineación y tácticas, plantilla, partido 2D, partido rápido y torneo.
- 2 pantallas nuevas: «Mis partidas» y la reproducción de un partido entre humanos.
- 1 componente transversal: el marco con la barra.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Verificación | Estado |
|-----------|--------------|--------|
| **I. La estrategia es determinante** | Las penalizaciones graduadas, la colocación con ofensividad calculada y los stats visibles en el movimiento (velocidad, pase) dan más peso a las decisiones. SC-008, SC-011 y SC-018 lo miden con `balance`. Las magnitudes están en los parámetros 2.0.0. | ✅ |
| **II. El draft es el núcleo** | Las reglas del draft no cambian. Sigue siendo simultáneo y es ahora la única fase síncrona. La animación no resta tiempo de elección (margen de 6 s). El abandono y la pausa están definidos (R10, R11). | ✅ |
| **III. Reglas del dominio explícitas** | La tabla de penalizaciones, las zonas, la colocación, la ofensividad, los dorsales y las tablas de goleadores están en `packages/domain`, con pruebas. La interfaz usa las mismas funciones del dominio (previsualización en el cliente) y no duplica reglas. | ✅ |
| **IV. Simulación coherente y verificable** | La capa espacial está en el motor, es pura y se prueba sin interfaz (invariante de cinemática). Se añade el invariante de que finalizar es equivalente a ver el partido. | ✅ |
| **V. Un motor, dos modalidades** | La capa espacial se calcula siempre, y los fotogramas solo serializan. «Finalizar» y la resolución automática usan el mismo `avanzar`. Coherencia espacial y temporal: el reloj es lineal y cada acción visible corresponde a una acción del motor. | ✅ |
| **VI. Integridad multijugador** | Resolución única en el actor; alineaciones fijadas al resolver; validación de la colocación y de los dorsales en el servidor; vista del torneo filtrada por participante; `requestId` en todos los avances. | ✅ |
| **VII. Colecciones y monetización** | Sin cambios. | ✅ |
| **VIII. Modularidad** | Los cambios se reparten entre los mismos componentes. `espacio/` es un submódulo del motor; la reproducción va en `campo2d`; el marco y la navegación, en `web/app`. | ✅ |
| **IX. Calidad demostrada con pruebas** | Cada SC tiene una comprobación (quickstart, R19). SC-001 y SC-009 se comprueban con pruebas de uso con personas, y SC-007a, con una revisión visual más una prueba automática de cinemática. | ✅ |
| **X. Incremental y trazable** | Las historias P1 (cartas, avanzar, 2D, penalizaciones y asíncrono) se pueden entregar antes que las P2 y P3. Los requisitos de la spec 001 afectados están listados en la spec 002 y se actualizarán al cerrarla. | ✅ |

**Resultado previo a la Fase 0**: no hay infracciones.

**Seguimiento (no es una infracción)**: la sección "Decisiones resueltas" de la constitución remite a la spec 001 para el "ritmo en directo o asíncrono" de los torneos. Al cerrar esta spec conviene una enmienda PATCH (v1.0.3) que añada la referencia a `specs/002-mejoras-mvp/` (FR-030).

**Re-verificación tras la Fase 1** (data-model y contracts):
- **Contrato del motor**:
  - mantiene la pureza (sin E/S ni reloj);
  - la entrada solo gana el campo opcional `ancla`;
  - la salida añade `acciones` y fotogramas v2, que no influyen en el resultado (invariante 7).
- **Protocolos** (WebSocket y HTTP):
  - ningún mensaje ni ruta revela el resultado de un partido "pendiente de ver" a su participante;
  - la alineación del rival solo se expone al empezar o resolverse el partido (001/FR-054a);
  - `torneo.actualizado` pasa a enviarse por participante.
- **Dominio**:
  - las zonas reutilizan la forma `posicionesAdmitidas` de las casillas, así que `statsEfectivos` sigue siendo la única puerta a la penalización;
  - no aparecen capas ni componentes nuevos sin justificar.

✅ Sin cambios.

## Project Structure

### Documentation (this feature)

```text
specs/002-mejoras-mvp/
├── plan.md              # Este fichero
├── research.md          # Fase 0: R1 a R19 (incluida la evaluación de FR-029)
├── data-model.md        # Fase 1: cambios sobre el modelo de la spec 001
├── quickstart.md        # Fase 1: validación (escenarios A a K)
├── contracts/
│   ├── engine-api.md        # cambios del motor y resolverResto
│   ├── realtime-protocol.md # cambios del WebSocket
│   ├── http-api.md          # rutas nuevas y modificadas
│   └── ui.md                # carta, botones de avanzar, barra, 2D, tácticas, tablas
├── checklists/requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks), no se crea aquí
```

### Source Code (repository root)

Solo se listan los ficheros nuevos (✚) y los modificados (✎) más relevantes, sobre la estructura de la spec 001.

```text
packages/
├── domain/src/
│   ├── parametros/v2.json                 ✚ parámetros 2.0.0 (penalizaciones, reproducción, espacio, colocación, asíncrono, draft)
│   ├── parametros/index.ts                ✎ tipos y selección por versión
│   ├── equipo/zonas.ts                    ✚ rejilla de zonas y zonaEn (R13)
│   ├── equipo/colocacion.ts               ✚ posición efectiva, personalizada, reparto, ofensividad y amplitud
│   ├── equipo/statsEfectivos.ts           ✎ penalizacionPorPosicion (R12)
│   ├── equipo/formaciones.ts              ✎ ajuste de coordenadas de casillas (data-model §2)
│   ├── equipo/alineacion.ts               ✎ validación de colocacion; previsualizar ampliado
│   ├── equipo/autoAlineacion.ts           ✎ usa la penalización nueva
│   ├── equipo/dorsales.ts                 ✎ 1–24, asignarDorsal, completarDorsales (R14)
│   ├── torneo/torneo.ts                   ✎ aportaciones en registrarResultado
│   ├── torneo/goleadores.ts               ✚ tablas de goleadores y asistentes (R15)
│   └── torneo/clasificacion.ts            ✎ excluirPartidos
├── engine/src/
│   ├── espacio/                           ✚ capa espacial (R3)
│   │   ├── aritmetica.ts                  ✚ enteros en décimas, isqrt
│   │   ├── objetivos.ts                   ✚ anclas, fase, basculación, roles, táctica
│   │   ├── movimiento.ts                  ✚ steering, aceleración, separación
│   │   └── balon.ts                       ✚ vuelo por tipo de acción, altura z
│   ├── acciones/opciones.ts               ✚ puntuación espacial de pase, conducción, centro y tiro (R4)
│   ├── acciones/juego.ts                  ✎ duraciones físicas; defensor real; acciones visibles
│   ├── acciones/contexto.ts               ✎ receptor y rivalCercano sobre posiciones reales
│   ├── modificadores/formacionTactica.ts  ✎ perfil calculado (ofensividad y amplitud de la colocación)
│   ├── estado/estado.ts                   ✎ ancla, posicion, espacio, perfil, posesion
│   ├── tramos/avanzar.ts                  ✎ paso espacial por tick; descuento acotado
│   ├── tramos/fotogramas.ts               ✎ fotogramas v2 cada 2 ticks
│   ├── tramos/decisiones.ts               ✎ recolocacion con colocacion
│   └── tests/                             ✎ cinematica, finalizar, colocacion, bench
├── ai/src/
│   ├── resolverResto.ts                   ✚ procedimiento único (R7)
│   └── partido.ts                         ✎ jugarHastaElFinal pasa a usar resolverResto
└── protocol/src/
    ├── ws/*.ts                            ✎ mensajes de realtime-protocol.md
    └── http/*.ts                          ✎ cuerpos y respuestas de http-api.md

apps/server/src/
├── persistencia/
│   ├── esquema/*.ts                       ✎ visionados, resolucion, pausa de mesa, sin ritmo
│   └── repos/visionados.ts                ✚
├── actores/
│   ├── partido2d.ts                       ✎ búfer de anticipación; se elimina la velocidad mínima (R6)
│   ├── partidoRapido.ts                   ✎ un humano por pausa; finalizar; dorsales automáticos
│   ├── partidoEntreHumanos.ts             ✚ resolución única y reproducción en caché LRU (R8)
│   ├── torneo.ts                          ✎ ritmo deducido, siguiente-jornada, vista por participante
│   ├── preparacion.ts                     ✎ sin temporizador de preparación
│   └── draft.ts                           ✎ margen de animación, pendientes, pausa y abandono en el draft
├── http/
│   ├── partidos.ts                        ✎ abrir, reproduccion, visto, revelar
│   ├── torneo.ts                          ✎ siguiente-jornada, goleadores, asistentes
│   ├── partidas.ts                        ✎ mis-partidas, cuerpo sin ritmo
│   └── app.ts                             ✎ @fastify/compress
├── ws/pasarela.ts                         ✎ permessage-deflate; partida.pausar, partido.finalizar
└── drizzle/0004_mejoras.sql               ✚

apps/web/src/
├── app/Marco.tsx                          ✚ barra de navegación, modal de abandono (useBlocker), sonido
├── app/Rutas.tsx                          ✎ rutas bajo el marco; «Mis partidas»
├── pantallas/MisPartidas.tsx              ✚
├── pantallas/ReproduccionPartido.tsx      ✚ partido entre humanos ya resuelto
├── pantallas/Draft.tsx                    ✎ «Esperando a…», animación
├── pantallas/Alineacion.tsx               ✎ colocación libre y penalización en porcentaje
├── pantallas/Partido2D.tsx                ✎ x2/x4/x8, finalizar, pausas anunciadas
├── pantallas/PartidoRapido.tsx            ✎ finalizar en el descanso
├── pantallas/Torneo.tsx                   ✎ pestañas de goleadores y asistentes, pendiente de ver
├── componentes/CartaJugador.tsx           ✎ diseño nuevo, variante compacta (R16)
├── componentes/AperturaSobre.tsx          ✚ animación (R17)
├── componentes/BotonAvanzar.tsx           ✚ (R18)
├── componentes/CampoTacticas.tsx          ✚ arrastre libre y zonas (sustituye a CampoAlineacion en tácticas)
├── campo2d/relojReproduccion.ts           ✎ K = 23,5 ticks/s a x2; pausas anunciadas
├── campo2d/interpolacion.ts               ✎ Hermite cúbica; fotogramas v2
├── campo2d/renderizador.ts                ✎ orientación y altura del balón
├── sonido/sonido.ts                       ✚ Web Audio y preferencia en localStorage
├── conexion/                              ✎ conexión persistente de invitados (R10)
└── public/sonidos/                        ✚ 4 efectos CC0 y LICENCIA

tools/balance/src/checks/
├── partido.ts                             ✎ SC-007, SC-008, revalidación de los SC de la spec 001
└── colocacion.ts                          ✚ SC-011, SC-018
```

**Structure Decision**: se mantiene la estructura de la spec 001 (monorepo web con dominio y motor puros).

| Componente (Principio VIII) | Dónde cae el cambio |
|---|---|
| Plantillas y alineaciones | `domain/equipo` (zonas, colocación, dorsales, penalización) |
| Formaciones y tácticas | `domain/equipo/colocacion`, `engine/modificadores` |
| Motor de simulación | `engine/espacio`, `engine/acciones` |
| Presentación rápida | `web/pantallas/PartidoRapido` |
| Presentación 2D | `web/campo2d` |
| Sobres y draft | `server/actores/draft`, `web/componentes/AperturaSobre` |
| Torneos y clasificaciones | `domain/torneo`, `server/actores/torneo` y `partidoEntreHumanos` |
| Usuarios y sesiones | `web/app/Marco` (navegación), `web/conexion` (conexión de invitados) |
| Persistencia y comunicación | migración `0004`, `protocol`, `ws/pasarela`, `http` |

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Con 3–4 veces menos acciones por partido, se descuadran los SC estadísticos de la spec 001 (goles, ventaja de la estrategia, orden de los NPC). | `balance` revalida todos esos SC con los parámetros 2.0.0 antes de cerrar US3. Las probabilidades base son parámetros, no código. |
| SC-009 ("parece fútbol") es subjetivo y puede no alcanzarse a la primera. | La capa espacial está parametrizada (basculación, roles, velocidades), y se hacen iteraciones cortas de revisión visual con escenarios fijos de `tools/fixtures` antes de la prueba con personas. |
| El motor más caro afecta al NPC PRO (simulaciones de prueba con un límite de 2 s) y a la carga de la beta. | `bench` en CI con un umbral. El PRO ya limita por tiempo, y simulará menos partidos de prueba. La prueba de carga k6 (001/SC-017) se repite. |
| Los partidos con parámetros 1.x no se pueden volver a simular. | Se terminan antes de desplegar, y la interfaz muestra solo su resumen (R12). |

## Complexity Tracking

Sin infracciones de la constitución que justificar. La capa espacial (R3) es la principal complejidad nueva. Está justificada por FR-023, y se descartaron explícitamente alternativas más simples (R3: animación inventada en el cliente o una rejilla con mejor interpolación).
