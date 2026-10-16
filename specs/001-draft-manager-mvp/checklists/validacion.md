# Validación del MVP (T144)

Resultados de la validación de [quickstart.md](../quickstart.md), ejecutada el 16-10-2026 en la rama
`001-draft-manager-mvp`.

**Entorno**: un portátil Windows 10 con Node 24, y PostgreSQL 16 y k6 en Docker Desktop. En la prueba de
carga, el servidor, la base de datos y el generador de carga (k6, 730 WebSocket) compartían máquina.

**Leyenda**: ✅ cumple · ⚠️ cumple en parte o con salvedades · ❌ no cumple · ⏳ pendiente (requiere
personas o un entorno que no estaba disponible).

## Pruebas automáticas

| Comando | Resultado | Notas |
|---|---|---|
| `pnpm lint` | ✅ | Sin errores. |
| `pnpm typecheck` | ✅ | 8 paquetes sin errores. |
| `pnpm test` | ✅ 239/239 | Dominio, motor, IA, protocolo, servidor sin base de datos y herramientas. |
| `pnpm test:integration` | ✅ 57/57 | PostgreSQL real (Testcontainers). Incluye NPC (US5), partido 2D (US6) y la auditoría de visibilidad (FR-054a). |
| `pnpm test:equivalence` | ✅ 3/3 | 200 semillas: rápida y 2D dan los mismos eventos y marcador, con y sin decisiones; los fotogramas no alteran el partido (SC-008). |
| `pnpm balance --n 1000` | ✅ 9/9 | SC-004 (70,4 % / 12,4 %), SC-005 (67,8 %), SC-006a–e, SC-007 (2,70 goles; 0,7 % con ≥ 8), SC-015 (−66 % de lesiones). |
| `pnpm balance --torneos 100 --pro-vs-amateur` | ✅ | SC-010: el PRO acaba por delante del amateur en el 88 % de los torneos y el avanzado, en el 86 %. |
| `pnpm e2e` | ✅ 5/5 | Escenarios A, B, C, D y E (sin correo). |
| `k6 run tools/load/beta-100.js` | ⚠️ | Ver «Carga (SC-017)». |

## Escenarios del quickstart

| Escenario | Resultado | Cómo se ha comprobado |
|---|---|---|
| A. Draft en solitario como invitado | ✅ | e2e `draft-solo.spec.ts` e integración `draft.test.ts`. El relleno nunca usa PRO (`npc.test.ts`). |
| B. Preparación del equipo | ✅ | e2e `alineacion.spec.ts` y contrato `alineacion.test.ts`. |
| C. Partido rápido y descanso | ✅ | e2e `partido-rapido.spec.ts`: descanso en menos de 3 s (SC-009). |
| D. Dos humanos en 2D | ✅ | e2e `partido-2d.spec.ts`: velocidad x4 compartida, cambio aplicado en la siguiente interrupción y aviso a los dos. Integración `partido-2d.test.ts`: espera a ambos, reconexión y desconexión de 10 s (SC-011). Se ha usado una liga de 4 en vez del playoff para que los dos humanos se crucen seguro. |
| E. Torneo asíncrono con bajas | ✅ | Integración `torneo-asincrono.test.ts` (avisos en la aplicación y por correo con Mailpit, plazo, SC-016) y e2e `torneo.spec.ts` (bajas, clasificación y campeón). Semillas de roja, amarillas y lesiones: `tools/fixtures/escenarios/`. |
| F. Mixto de 8 y NPC PRO | ✅ | Integración `torneo-directo.test.ts` (semifinales 1.º–4.º y 2.º–3.º) y `npc.test.ts` (1 humano y 7 NPC, uno de ellos PRO, hasta el final). SC-010 con `balance`. |

## Carga (SC-017)

100 partidas a la vez: 90 de 8 humanos y 10 de invitado contra 7 NPC, con 730 WebSocket. Cada una juega el
draft y una liga de 8 completa, con preparaciones y descansos de 5 s.

| Criterio | Objetivo | Resultado | Estado |
|---|---|---|---|
| Ninguna partida bloqueada | 100 terminadas | 100 terminadas, 0 bloqueadas | ✅ |
| Errores HTTP | 0 | 0 de 1.560 | ✅ |
| Entrega del sobre siguiente (servidor: `turno_draft_resolucion_ms`) | p95 < 1 s | 95 % ≤ 500 ms; 96 % < 1 s | ✅ |
| Entrega del sobre siguiente (medida en k6) | p95 < 1 s | p95 1,99 s | ❌ |
| SC-009: inicio → descanso | p95 < 3 s | p95 17 ms | ✅ |
| SC-009: «Seguir» → final | p95 < 3 s | p95 6,2 s | ❌ |
| Jornadas con partidos NPC | p95 < 10 s | p95 10,5 s | ⚠️ |
| Errores WebSocket | 0 | 7: «Seguir» que llega cuando ya ha vencido el descanso de 5 s (`PARTIDO_NO_ENCONTRADO`) | ⚠️ |

**Optimizaciones de T140** (de la primera a la última ejecución): partidas terminadas, de 98 a 100;
bloqueadas, de 2 a 0; «Seguir» → final (p95), de 24,7 s a 6,2 s; duración de cada torneo, de 9 min 21 s a
4 min 59 s. Los cambios:

- Pool de PostgreSQL de 10 a 25 conexiones (`DB_POOL_MAX`).
- La vista del torneo carga resúmenes de partidos, no las filas completas con eventos y alineaciones.
- El final del partido se anuncia en cuanto está guardado (`ctx.publicar()`), antes de cerrar la jornada.
- Caché de atributos en el motor: de 11,97 a 8,42 ms por partido, con resultados idénticos; objetivo de R7 < 10 ms.
- Memorización en la alineación automática: de 5,77 a 3,69 ms, con resultados idénticos.
- Caché de la alineación automática por participante.
- No se guarda el torneo dos veces cuando la jornada sigue abierta.

**Análisis**: el perfil de CPU con 100 partidas muestra el proceso de Node casi saturado (17 % ocioso):
simulación de partidos (~23 %), alineaciones automáticas (~17 %), envío por WebSocket (~8 %) y driver de
PostgreSQL (~10 %). Cada acceso a PostgreSQL tarda 0,4 ms. El retraso viene de que cada `await` cede el
turno a otras 99 partidas: el bucle de eventos tiene un retraso medio de 30 ms. El servidor resuelve los turnos
a tiempo; lo que ve el cliente suma ese retraso y el del propio k6, que corre en la misma máquina.

**No aplicado**: T140 proponía agrupar por turno las escrituras de las elecciones del draft. Eso
contradice la regla de R4 «cada cambio de estado relevante se guarda antes de anunciarse» (el `ack` de
una elección), así que se ha mantenido una escritura por elección.

**Pendiente**: repetir la carga con el generador en otra máquina y el servidor en hardware dedicado. Si
siguen sin cumplirse la entrega del sobre y el final del partido, la siguiente palanca es simular los
partidos en *worker threads*. Es un cambio de arquitectura que hay que decidir antes de hacerlo.

## Comprobaciones manuales

| Comprobación | Estado | Notas |
|---|---|---|
| Reproducción 2D a 60 fps | ⚠️ | 60,2 fps (intervalo p95 16,8 ms) a x16 en Chromium sin interfaz, 1366×768. Falta comprobarlo en un portátil medio con el navegador visible. |
| Aspecto del 2D en escritorio y móvil | ✅ | Capturas a 1280 px y a 390 px: campo, chapas con dorsal y nombre, balón, marcador y minuto legibles. Salvedad: dos equipaciones azules de tono distinto se distinguen poco (regla de choque de colores de FR-031b). |
| Accesibilidad (T143) | ✅ | Colores de nivel y de dorsal con contraste ≥ 4,5:1 en los temas claro y oscuro (prueba automática para los dorsales). Alternativa al arrastre: seleccionar y colocar, con «Al banquillo» y `Escape` para cancelar. Todos los textos en español. |
| SC-003: 5 usuarios nuevos completan el draft y la alineación en < 30 min sin ayuda (≥ 90 %) | ⏳ | Requiere una sesión con 5 personas. |
| Correo real de avisos (escenario E, paso 3) en un buzón externo | ⏳ | Comprobado con Mailpit en las pruebas de integración; falta con un proveedor SMTP real. |
| Imagen de producción | ✅ | `docker build` y arranque: `/healthz` sano, web servida, cookies `Secure`, migraciones al arrancar y `node dist/seed.js` carga el catálogo. |

## Criterio de «hecho»

Las pruebas automáticas y los escenarios A a F se cumplen. Quedan abiertos tres puntos:

1. **SC-017**: falta repetir la carga en un entorno representativo.
2. **SC-003**: falta la sesión con usuarios.
3. **60 fps**: falta comprobarlo en un portátil medio con el navegador visible.
