# Implementation Plan: Mejoras de interfaz, simulación y experiencia de juego

**Branch**: `003-mejoras-ux-simulacion` | **Date**: 2026-10-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-mejoras-ux-simulacion/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

La spec 003 mejora la experiencia sin cambiar la pila ni las reglas del draft. Se construye sobre el código de la spec 002 (commit `c8a1627`). Tiene cuatro frentes:

1. **Motor (US1, US9)**. Afecta a las dos modalidades, porque el motor es uno solo.
   - Elección del receptor y del tipo de pase según la distancia y la dirección reales: el juego es más combinado y desaparecen los pases largos hacia atrás sin sentido.
   - Tiro decidido y resuelto con la distancia y el ángulo reales del tirador, no con su zona lógica.
   - Más penaltis y faltas directas, y algún gol en propia puerta (1–3 %).
   - Stats que influyen en qué acción elige cada jugador, no solo en si le sale.
   - Parámetros **3.0.0**.
   - NPC más fáciles porque cometen errores de decisión creíbles. El motor no trata a nadie distinto.
2. **Preparación y partido (US2, US3, US5, US6)**.
   - «Formación» con un único campo y la carta ampliada al pasar el cursor.
   - Modo de simulación elegido en cada partido.
   - Pantalla de gestión del equipo con campo, en el descanso y en cualquier momento de la 2D.
   - Pantalla de resultado al finalizar un partido 2D.
3. **Presentación (US4, US7, US8)**.
   - Botón principal fijo y común a todas las pantallas.
   - Cartas con diseño final y texto legible.
   - Apertura de sobres con partículas, cartas completas y un sonido suave.
4. **Torneo e identidad (US10, US11)**.
   - Pantallas de derrota y de campeón.
   - «Simular resto del torneo» cuando ya no queda ningún humano en competición.
   - Nombre de equipo editable para todos, con valores por defecto guardados en la cuenta.
   - Equipaciones con diseño (lisa, rayas, franjas, banda, mitades) y hasta 3 colores.

**Enfoque técnico** (ver [research.md](./research.md)):

- **Línea base medida** (R1): con equipos sintéticos equilibrados, el motor actual ya da 2,91 goles por partido. Fallan otras cosas:
  - penaltis (3,8 %) y faltas directas (2,4 %) por debajo de su rango;
  - el resultado 1-2 aparece en el 20 % de los partidos;
  - el defensor que entra al duelo es el más débil de los dos más cercanos;
  - el receptor se elige sin mirar la dirección del pase.

  El problema de la 2D es sobre todo de selección de acciones y de coherencia espacial, no de cantidad de goles. Por eso se recalibra con dos tipos de serie: equipos sintéticos y plantillas reales de la colección Core.
- **Motor**: los cambios van en `engine/acciones` (opciones, receptor, tiro, balón parado). Los parámetros nuevos se agrupan en las secciones `decision`, `pases` y `tiro` de `v3.json` (R2 a R10). El motor registra la distancia y el tipo de cada remate en los eventos, y unas métricas por jugador solo cuando se piden, para la herramienta `balance` (R11).
- **IA**: `PerfilNPC.errores` define la frecuencia y la gravedad de los errores de draft, de alineación y de partido, con un guardarraíl contra decisiones absurdas (R12). Un **participante de referencia** en `tools/balance` mide SC-010 (R13). Las decisiones automáticas de un humano ausente usan un perfil `automatico` sin errores.
- **Servidor**:
  - la modalidad se envía en `POST /api/partidos/:id/abrir` y se recuerda en el participante y, para los registrados, en su perfil; por defecto, rápida (R19);
  - la gestión del equipo durante el partido solo existe contra un NPC: los partidos entre humanos se juegan con decisiones automáticas (002/FR-030);
  - las decisiones del partido llegan en un lote atómico, `partido.decisiones` (R17);
  - «Simular resto del torneo» resuelve las jornadas restantes en un solo comando del actor (R22);
  - perfil de cuenta y nombre de equipo (R23);
  - equipaciones v2 (R24);
  - migraciones `0006` (modo), `0007` (pantallas del torneo) y `0008` (identidad).
- **Cliente**:
  - un componente `CampoEquipo` con un único campo, compartido por «Formación» y por la gestión durante el partido (R14);
  - la vista ampliada de la carta, con posicionamiento propio (R15);
  - `BarraPrincipal` fija (R16);
  - un `ResultadoPartido` común a la rápida y a la 2D (R18);
  - partículas en Canvas 2D y un sonido sintetizado con Web Audio (R21).

  No se añade ninguna librería de interfaz.

## Technical Context

**Language/Version**: TypeScript 5.x; Node.js 22 LTS; navegadores modernos. Sin cambios (001/R1).

**Primary Dependencies**:
- Las mismas de las specs 001 y 002: Fastify, `ws`, Drizzle, React 19, React Router 7, Zustand, Zod, better-auth.
- **Ninguna nueva**:
  - arrastre: Pointer Events;
  - vista ampliada: el atributo `popover` con posicionamiento calculado;
  - partículas: Canvas 2D;
  - giro de cartas: transformaciones 3D de CSS;
  - sonido: Web Audio API sintetizado;
  - tipografía de las cartas: un fichero woff2 con licencia OFL servido desde `public/fuentes`, no un paquete npm.

**Package Manager**: pnpm 9, sin excepciones (CLAUDE.md).

**Storage**: PostgreSQL 16. Las migraciones `0006_modo_simulacion`, `0007_pantallas_torneo` y `0008_identidad` (una por historia) hacen lo siguiente:
- crea la tabla `perfiles_usuario` en la `0006`, con `ultima_modalidad`, para que US3 no dependa de US11; la `0008` le añade `nombre_equipo` y `equipaciones`;
- añade a `participantes` las columnas `ultima_modalidad`, `derrota_vista_en` y `campeon_visto_en`, y un índice único `(partida_id, lower(nombre_equipo))`;
- añade a `partidos` la columna `modalidades` (jsonb);
- convierte el JSON de `participantes.equipaciones` al formato v2;
- traslada `partidas.tipo_simulacion` a `participantes.ultima_modalidad` y después elimina la columna.

Detalle en [data-model.md](./data-model.md) §9.

**Testing**:
- Vitest y fast-check: dominio (equipaciones v2, eliminaciones, nombre de equipo, guardarraíl de errores de los NPC), motor (receptor, tiro por distancia, eventos con distancia, equivalencia humano/NPC) e IA (orden de niveles, PRO con errores escasos).
- Testcontainers: integración (abrir con modo, lote de decisiones, simular resto, perfil y nombre, migraciones 0006 a 0008).
- Playwright: escenarios A a L de [quickstart.md](./quickstart.md), botón principal visible a 1366 × 768 y 360 × 640, y vista ampliada dentro de la pantalla.
- `balance`: comprobaciones nuevas de SC-001 a SC-007, SC-009, SC-010, SC-010a y SC-010b, y una serie con plantillas Core.
- `bench` del motor: se mantiene el umbral.

**Target Platform**: servidor Linux en Docker; cliente web de escritorio. La barra principal, la pantalla «Formación», la gestión del equipo y las pantallas de derrota y de campeón deben funcionar a 360 × 640 (FR-007 y SC-013).

**Project Type**: aplicación web (monorepo con paquetes de dominio puros), como en las specs 001 y 002.

**Performance Goals**:
- Motor: ≤ 25 ms por partido sin fotogramas y ≤ 40 ms con fotogramas. Son los umbrales de la spec 002; la selección de receptor y el carril de pase no deben superarlos (R3).
- Vista ampliada: aparece en < 500 ms en el 95 % de los casos, con un retardo de intención de 150 ms (SC-015).
- Simular el resto de un playoff de 16 tras caer en octavos: 7 partidos en < 5 s de extremo a extremo (SC-020a, R22).
- Apertura de sobre: ≤ 8 s, sin bajar de 30 fps. Si baja, primero se reducen las partículas (FR-013, Edge Cases).
- Arrastre en el campo: la posición efectiva se recalcula en < 1 ms en el cliente (002/SC-016).

**Constraints**:
- El motor sigue siendo determinista y entero en las decisiones espaciales (décimas, `isqrt`, milésimas en los factores).
- Ninguna regla del motor depende de si el equipo es de un humano o de un NPC (FR-037, SC-010a).
- El servidor es autoritativo: valida el nombre de equipo, las equipaciones, el lote de decisiones y la condición de «simular resto».
- La gestión del equipo durante la 2D no revela nada de los ticks que el participante aún no ha visto (R17).
- Los partidos de la versión 2.x no se pueden volver a simular con el motor 3: la interfaz muestra solo su resumen (R2).

**Scale/Scope**:
- Beta de 100 partidas simultáneas, sin cambios.
- 11 historias de usuario.
- Pantallas modificadas: «Formación» (Alineacion), Partido2D, PartidoRapido, Draft (apertura), Sala (nombre), CrearPartida (sin tipo de simulación), Torneo y AvisoPartido (modo).
- Pantallas o componentes nuevos: `CampoEquipo`, `VistaCarta`, `BarraPrincipal`, `GestionEquipo`, `ResultadoPartido`, `PantallaDerrota`, `PantallaCampeon`, `EditorEquipacion`, `SelectorModo` y la pantalla «Mi perfil».

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Verificación | Estado |
|-----------|--------------|--------|
| **I. La estrategia es determinante** | Los stats y los specials pesan más, porque cambian qué acción se elige (FR-021, FR-022). La colocación y la táctica siguen entrando en el cálculo. La dificultad de los NPC sale de peores decisiones y no de porcentajes impuestos (FR-037). SC-006, SC-007, SC-009 y SC-010 lo miden con `balance`. | ✅ |
| **II. El draft es el núcleo** | Las reglas del draft no cambian. La animación pasa de 6 a 8 s, con el margen del primer turno ajustado (FR-013), así que no resta tiempo de elección. Los errores de draft de los NPC se aplican sobre su evaluación; las reglas son las mismas para todos. | ✅ |
| **III. Reglas del dominio explícitas** | En `packages/domain` están: equipaciones v2 con la regla de parecido (R24), validación del nombre de equipo (R23), eliminaciones derivadas del torneo (R22) y la colocación, que no cambia. La interfaz usa esas funciones y no las duplica. | ✅ |
| **IV. Simulación coherente y verificable** | El tiro usa la posición real, así que lo que se ve coincide con lo que se calcula (R6). Las métricas nuevas (distancia del remate, longitud del pase, acciones por jugador) se prueban sin interfaz. | ✅ |
| **V. Un motor, dos modalidades** | El modo es una elección de presentación de cada participante (FR-033). La rápida y la 2D siguen saliendo del mismo `avanzar`. «Finalizar» lleva a una pantalla común. La pausa de la 2D solo detiene la reproducción del cliente. SC-009 y SC-017 lo comprueban. | ✅ |
| **VI. Integridad multijugador** | El servidor valida el nombre, las equipaciones, el lote de decisiones (todo o nada) y «simular resto» (solo sin humanos en competición). El modo no influye en el cálculo. La gestión durante la 2D no adelanta información. | ✅ |
| **VII. Colecciones y monetización** | Sin cambios. | ✅ |
| **VIII. Modularidad** | Cada cambio cae en un componente que ya existe: `engine/acciones`, `ai/perfiles` y `ai/errores`, `domain/equipo` y `domain/torneo`, `server/actores/torneo`, `web/componentes`. El campo con gestos es un solo componente y se reutiliza en dos pantallas. | ✅ |
| **IX. Calidad demostrada con pruebas** | Cada SC tiene una comprobación (R25 y quickstart). Los SC de percepción (SC-008, SC-011 a SC-014, SC-016 y SC-019) se comprueban con pruebas de uso con al menos 5 personas. Para que los SC estadísticos (SC-001 a SC-007, SC-009 y SC-010 a SC-010b) los pueda verificar una persona no técnica, `balance` genera un informe HTML legible con cada SC, su objetivo, el valor medido y si se cumple (`tools/balance/salida/informe.html`, T032a). La constitución v1.0.4 (2026-10-19) recoge expresamente esta forma de comprobación en el Principio IX. | ✅ |
| **X. Incremental y trazable** | Las P1 (motor, «Formación», modo por partido y botón principal) se pueden entregar antes que las P2 y P3. Los requisitos de las specs 001 y 002 afectados están listados en la spec, y se actualizarán al cerrarla. | ✅ |

**Resultado previo a la Fase 0**: no hay infracciones.

**Seguimiento (no es una infracción)**: la constitución, en "Decisiones resueltas", remite a la spec 001 para los niveles de los NPC y las equipaciones. La aclaración del Principio IX ya está aprobada (enmienda PATCH v1.0.4, 2026-10-19). Al cerrar esta spec conviene otra enmienda PATCH (v1.0.5) que añada la referencia a `specs/003-mejoras-ux-simulacion/`: FR-036 a FR-038 para la dificultad de los NPC, FR-045 a FR-047 para las equipaciones, y FR-032 para el tipo de simulación, que ya no se elige al crear la partida (T126).

**Re-verificación tras la Fase 1** (data-model y contracts):
- **Contrato del motor** ([contracts/engine-api.md](./contracts/engine-api.md)):
  - la entrada no cambia;
  - la salida añade `datos.distancia` y `datos.zonaRemate` a `tiro` y `gol`, y campos de pase y de tiro a `EstadisticasEquipo`;
  - las métricas por jugador solo se generan con `opciones.metricas`, no se guardan y no influyen en el resultado (invariante nuevo 10);
  - no aparece ninguna entrada que distinga humano de NPC (invariante 11).
- **Protocolos**:
  - `partido.decisiones` es atómico e idempotente por `requestId`;
  - `partido.inicio.modalidad` es la del participante que lo recibe;
  - `GET /reproduccion?modalidad=` no cambia el resultado;
  - ningún mensaje adelanta eventos no vistos.
- **Dominio**:
  - `Equipacion` v2 sustituye a principal y secundario, con una conversión determinista desde v1;
  - las eliminaciones se derivan del `EstadoTorneo` y no se guardan, salvo la marca de "vista".

✅ Sin cambios.

## Project Structure

### Documentation (this feature)

```text
specs/003-mejoras-ux-simulacion/
├── plan.md              # Este fichero
├── research.md          # Fase 0: R1 a R25
├── data-model.md        # Fase 1: cambios sobre el modelo de las specs 001 y 002
├── quickstart.md        # Fase 1: validación (escenarios A a L)
├── contracts/
│   ├── engine-api.md        # motor 3.0.0: eventos de tiro y gol, estadísticas y métricas
│   ├── realtime-protocol.md # modalidad por participante, partido.decisiones, torneo.actualizado
│   ├── http-api.md          # abrir con modo, reproducción, perfil, nombre, simular resto, equipaciones v2
│   └── ui.md                # campo único, vista ampliada, barra principal, gestión, resultado, cartas, sobre, derrota y campeón, equipación
├── checklists/requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks), no se crea aquí
```

### Source Code (repository root)

Solo se listan los ficheros nuevos (✚), modificados (✎) y eliminados (✖) más relevantes, sobre la estructura de la spec 002.

```text
packages/
├── domain/src/
│   ├── parametros/v3.json                 ✚ parámetros 3.0.0 (decision, pases, tiro, npc; draft.margenAnimacionS = 8)
│   ├── parametros/index.ts                ✎ tipos 3.0.0; REGISTRO solo con la 3; versionMayor < 3 → VersionNoSoportada
│   ├── equipo/equipaciones.ts             ✎ Equipacion v2 (diseño + 1–3 colores), parecido, ajuste del visitante, desdeV1
│   ├── equipo/nombreEquipo.ts             ✚ normalizar, validar (3–24) y nombre por defecto
│   ├── torneo/eliminaciones.ts            ✚ eliminaciones derivadas, humanos en competición, nombre de la fase
│   └── partida/partida.ts                 ✎ fuera tipoSimulacion de ConfigPartida; ModoSimulacion
├── engine/src/
│   ├── acciones/opciones.ts               ✎ factores de stats (R9), conducción por espacio (R5), pase largo con motivo (R4), tiro por distancia (R6)
│   ├── acciones/receptor.ts               ✚ receptor por tipo de pase, distancia y dirección; interceptor en el carril (R3)
│   ├── acciones/contexto.ts               ✎ rivalCercano sin "busca al más débil"; radio de intervención por stat (R9)
│   ├── acciones/juego.ts                  ✎ tipos de pase por distancia real, faltas en el área, registro de pases
│   ├── acciones/tiro.ts                   ✎ distancia y ángulo en la probabilidad; datos.distancia y zonaRemate en los eventos
│   ├── acciones/balonParado.ts            ✎ falta directa según distancia; penalti por falta en el área en duelos y centros
│   ├── metricas.ts                        ✚ contadores por jugador (solo con opciones.metricas)
│   ├── tipos.ts                           ✎ EstadisticasEquipo ampliadas; MetricasJugador; OpcionesAvance.metricas
│   └── tests/                             ✎ receptor, tiroDistancia, eventosGol, equivalenciaNPC, bench
├── ai/src/
│   ├── perfiles.ts                        ✎ PerfilNPC.errores por nivel; perfil `automatico` sin errores
│   ├── errores.ts                         ✚ errores de draft, de alineación, de táctica y de partido, con guardarraíl (R12)
│   ├── draft.ts                           ✎ aplica errores de draft (incluida la decisión dudosa del PRO)
│   ├── alineacion.ts                      ✎ aplica errores de alineación, colocación, formación, táctica y lanzadores
│   └── partido.ts                         ✎ aplica errores en los cambios durante el partido
└── protocol/src/
    ├── ws/partido.ts                      ✎ partido.decisiones; modalidad por participante
    ├── ws/torneo.ts                       ✎ torneo.actualizado con miEliminacion y campeon
    └── http/*.ts                          ✎ abrir { modalidad }, perfil, nombre de equipo, simular resto, equipaciones v2, crear partida sin tipoSimulacion

apps/server/src/
├── persistencia/
│   ├── esquema/base.ts                    ✎ perfiles_usuario; participantes (+ultima_modalidad, +vistas, índice único); partidas (−tipo_simulacion)
│   ├── esquema/partido.ts                 ✎ partidos.modalidades
│   └── repos/perfiles.ts                  ✚
├── actores/
│   ├── torneo.ts                          ✎ abrirPartido(modalidad); simularResto; eliminación y campeón en la vista; sin plazos si no quedan humanos en competición
│   ├── partidoRapido.ts                   ✎ modalidad desde partidos.modalidades; lote de decisiones atómico
│   ├── partidoEntreHumanos.ts             ✎ reproducción por modo pedido (caché por modo)
│   ├── sala.ts                            ✎ nombre propuesto desde el perfil; cambiar nombre hasta que se abre el primer partido del torneo
│   └── draft.ts                           ✎ margen de animación 8 s; equipaciones iniciales desde el perfil
├── http/
│   ├── partidos.ts                        ✎ abrir { modalidad }; reproduccion?modalidad
│   ├── partidas.ts                        ✎ nombre-equipo; simular-resto; pantalla-vista (derrota y campeón vistos); sin tipoSimulacion
│   ├── perfil.ts                          ✚ GET/PUT /api/perfil
│   └── alineacion.ts                      ✎ equipaciones v2
├── ws/pasarela.ts                         ✎ partido.decisiones
└── drizzle/0006_modo_simulacion.sql, 0007_pantallas_torneo.sql, 0008_identidad.sql  ✚

apps/web/src/
├── componentes/CampoEquipo.tsx            ✚ campo único: titulares, arrastre libre, intercambios, banquillo (R14)
├── componentes/VistaCarta.tsx             ✚ carta ampliada al pasar el cursor o mantener pulsado (R15)
├── componentes/BarraPrincipal.tsx         ✚ barra fija con el botón principal y el motivo de desactivado (R16)
├── componentes/BotonAvanzar.tsx           ✎ se apoya en BarraPrincipal; etiquetas nuevas
├── componentes/GestionEquipo.tsx          ✚ gestión durante el partido sobre CampoEquipo (R17)
├── componentes/ResultadoPartido.tsx       ✚ marcador, eventos y estadísticas, común a la rápida y a la 2D (R18)
├── componentes/SelectorModo.tsx           ✚ (R19)
├── componentes/CartaJugador.tsx           ✎ diseño final; texto de stats y specials ≥ texto base (R20)
├── componentes/AperturaSobre.tsx          ✎ partículas, cartas completas, ≤ 8 s (R21)
├── componentes/particulas.ts              ✚ sistema de partículas en Canvas 2D con presupuesto por fotograma
├── componentes/EditorEquipacion.tsx       ✚ diseño y colores, con vista previa SVG (R24)
├── componentes/Camiseta.tsx               ✚ camiseta SVG de un diseño (vista previa, preparación, resultado)
├── componentes/CampoAlineacion.tsx        ✖ sustituido por CampoEquipo
├── componentes/CampoTacticas.tsx          ✖ sustituido por CampoEquipo
├── componentes/PanelCambios.tsx           ✖ sustituido por GestionEquipo
├── pantallas/Alineacion.tsx               ✎ «Formación» sobre CampoEquipo; un solo campo
├── pantallas/Partido2D.tsx                ✎ «Gestionar equipo» (pausa); al finalizar, ResultadoPartido
├── pantallas/PartidoRapido.tsx            ✎ gestión en el descanso; usa ResultadoPartido
├── pantallas/Partido.tsx                  ✎ modalidad del partido, no de la partida
├── pantallas/Torneo.tsx                   ✎ derrota y campeón; «Simular resto del torneo»
├── pantallas/PantallaDerrota.tsx          ✚
├── pantallas/PantallaCampeon.tsx          ✚
├── pantallas/Perfil.tsx                   ✚ nombre y equipaciones por defecto (registrados)
├── pantallas/Sala.tsx                     ✎ paso de nombrar el equipo
├── pantallas/CrearPartida.tsx             ✎ sin tipo de simulación
├── campo2d/renderizador.ts                ✎ chapas con el patrón del diseño
├── sonido/sonido.ts                       ✎ apertura sintetizada a volumen bajo
├── app/Marco.tsx                          ✎ modo compacto según la modalidad del partido
├── estilos/cartas.css, base.css           ✎ tokens del botón principal, cartas, barra
└── public/fuentes/                        ✚ tipografía OFL de las cartas + LICENCIA

tools/balance/src/
├── checks/partido.ts                      ✎ SC-001 a SC-007 y SC-009 de la 003
├── checks/npc.ts                          ✎ SC-010, SC-010a y SC-010b con el participante de referencia
├── informe.ts                             ✚ informe HTML legible de las comprobaciones (Principio IX)
├── referencia.ts                          ✚ participante de referencia (R13)
└── core.ts                                ✚ series con plantillas Core draftadas por NPC (R8)
```

**Structure Decision**: se mantiene la estructura de las specs 001 y 002: un monorepo web con dominio, motor e IA puros.

| Componente (Principio VIII) | Dónde cae el cambio |
|---|---|
| Plantillas y alineaciones | `domain/equipo` (equipaciones v2, nombre de equipo); `web/componentes/CampoEquipo` |
| Formaciones y tácticas | `web/componentes/GestionEquipo`, sin reglas nuevas |
| Motor de simulación | `engine/acciones`, `engine/metricas`, parámetros 3.0.0 |
| Presentación rápida | `web/componentes/ResultadoPartido`, `PartidoRapido` |
| Presentación 2D | `web/pantallas/Partido2D`, `campo2d/renderizador` |
| Sobres y draft | `web/componentes/AperturaSobre`, `particulas`; `ai/errores` (NPC) |
| Torneos y clasificaciones | `domain/torneo/eliminaciones`, `server/actores/torneo` |
| Usuarios y sesiones | `server/http/perfil`, `perfiles_usuario` |
| Persistencia y comunicación | migraciones `0006` a `0008`, `protocol`, `ws/pasarela`, `http` |

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Ajustar a la vez la selección de acciones, los tiros y las faltas descuadra la media de goles y los SC de la 001 y la 002, por ejemplo la ventaja de +5 de media o los de la 2D. | Se calibra en un orden fijo (R8): primero receptor y pases, después tiro por distancia, después balón parado y por último la media. Al final de cada paso, `balance` vuelve a validar todos los SC. Las magnitudes son parámetros de `v3.json`, no código. |
| SC-002 pide alrededor del 25 % de goles fuera del área (22–28 %, decisión del usuario del 2026-10-19), con el riesgo de quedarse corto o pasarse al recalibrar el tiro. | La frontal (16,5–25 m) se trata como una zona de tiro propia, con su peso y su probabilidad (R6), y el reparto se ajusta en `balance` con un check específico. |
| Los errores de los NPC pueden parecer absurdos, o no bastar para cumplir SC-010. | Cada tipo de error tiene un guardarraíl con su coste máximo (R12), probado con fast-check. La frecuencia por nivel se ajusta con el participante de referencia (R13), y la revisión de 20 drafts por nivel cubre SC-010b. |
| Al cambiar de motor (3.0.0), los partidos 2.x guardados no se pueden reproducir. | Igual que en la spec 002 con los 1.x: se terminan antes de desplegar, y la interfaz muestra su resumen con un aviso (R2). |
| La gestión durante la 2D podría revelar eventos del búfer de anticipación. | El estado del equipo se deriva en el cliente con lo que ya ha visto (R17); el servidor solo valida. |
| La vista ampliada y la barra fija se comportan distinto según el navegador o el móvil. | No se usa CSS anchor positioning: el posicionamiento se calcula en JS (R15). Playwright comprueba los tamaños de SC-013 y SC-015. |

## Complexity Tracking

No hay infracciones de la constitución que justificar.

La complejidad nueva principal es el módulo de errores de los NPC (R12). Lo justifican FR-036 a FR-037b. Se descartaron alternativas más simples: subir el ruido del evaluador o quitar al amateur opciones de formación. Con ellas no se controla la gravedad del error ni se evitan decisiones absurdas (SC-010b).
