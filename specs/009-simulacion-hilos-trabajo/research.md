# Research: Simulación de partidos en hilos de trabajo

**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Fecha**: 2026-11-01

## R1. Dónde calcula hoy el servidor (inventario)

Recorrido de `apps/server/src` buscando llamadas a `@fbd/engine` y `@fbd/ai` que simulan:

| Llamada | Fichero | Coste | Quién espera | Pasa al grupo |
|---------|---------|-------|--------------|---------------|
| `resolverResto` (apertura o plazo entre humanos) | `partidoEntreHumanos.ts` `resolverPartidoEntreHumanos` | 150–400 ms | humano (apertura) / nadie (plazo) | Sí |
| `resolverResto` (partido síncrono heredado de la 001) | `partidoEntreHumanos.ts` `terminarPartidoEntreHumanosEnJuego` | 150–400 ms | nadie | Sí |
| `jugarHastaElFinal` (NPC contra NPC, plazo, `forzarFinal`) | `partidoRapido.ts` `jugarTramo('final')` | 150–400 ms | nadie | Sí |
| `avanzar(motor, 'parte')` (rápida en directo) | `partidoRapido.ts` `jugarTramo('parte')` | ~1/2 partido | humano | Sí |
| `avanzar(motor, 'ticks')` (2D en directo, trozos de 60 ticks) | `partido2d.ts` `avanzar2D` | pequeño, muy frecuente | humano | Sí |
| `resolverResto` con `alTramo` («Finalizar partido») | `partidoRapido.ts` `procesarFinalizar` | hasta 400 ms | humano | Sí |
| `decidirAlineacion` (NPC; el PRO simula partidos de prueba hasta `LIMITE_PRO_MS` = 2 s) | `partidoRapido.ts` `alineacionParaPartido` | hasta **2 s** | humano o nadie | Sí |
| `rehacer` (reproducción, `GET /api/partidos/:id/reproduccion`, con fotogramas en 2D) | `partidoEntreHumanos.ts` | 150–400 ms o más con fotogramas | humano | Sí |
| `decidirNPCEnPausa` al abrir una pausa | `partidoRapido.ts` `abrirPausa` | µs (no simula) | — | No (R9) |
| `crearPartido`, `ordenJugadores`, `aplicarLote`, `aplicarDecision` | varios | µs | — | No (R9) |
| `reconstruirMotor` (solo para el partido heredado) | `partidoRapido.ts` | hasta 6 partes | nadie | No (R9) |
| Duelos (`resolverCruce`, `decidirAlineacionDuelos`), IA del draft | `duelos.ts`, `draft.ts` | ms, sin motor | — | No (fuera de FR-001: no es un partido del motor) |

Hallazgos que la spec no nombraba y entran por FR-001 («todo cálculo del motor y de la IA de los NPC para un
partido»): la **alineación del NPC PRO** (hasta 2 s de CPU en el hilo principal, el cálculo más largo de todos) y la
**reproducción** de los partidos entre humanos (cada humano la pide al abrir; la caché LRU de 32 evita repetirla, no
el primer cálculo).

## R2. Hilos: `node:worker_threads` sin dependencias nuevas

- **Decisión**: grupo propio sobre `node:worker_threads` (~150 líneas en `apps/server/src/simulacion/grupo.ts`).
- **Razón**: lo que pide la spec es concreto y pequeño: dos colas FIFO (FR-012), una tarea por hilo, tiempo máximo,
  sustituir el hilo caído y reintentar (FR-008). Con eso escrito a mano se lee y se prueba entero; la constitución
  pide pruebas de la gestión de errores y las reglas de reintento son del dominio de la spec.
- **Alternativas**: `piscina` (cola personalizada para la prioridad, `AbortSignal` para el tiempo máximo y
  reintentos envueltos por fuera: casi el mismo código propio más una dependencia); `tinypool` (sin prioridades);
  `child_process`/cluster (fuera de alcance: varios procesos).

## R3. Cargar TypeScript en el hilo

- **Decisión**: el fichero del hilo se resuelve junto al módulo del grupo:
  `new URL(import.meta.url.endsWith('.ts') ? './hilo.ts' : './hilo.js', import.meta.url)`. Si es `.ts` (desarrollo
  con `tsx watch`, Vitest) el hilo arranca con `execArgv: ['--import', 'tsx']`; en producción `tsup` compila
  `src/simulacion/hilo.ts` como segunda entrada (`dist/hilo.js`, junto a `dist/main.js`).
- **Comprobado** (prueba de concepto durante el plan, ya borrada): un `Worker` sobre un `.ts` de `apps/server/src` que
  importa `@fbd/engine` arranca con `--import tsx` en Node 24.
- **Alternativa descartada**: el *type stripping* nativo de Node 24: los paquetes del monorepo importan sin extensión
  (`./estado/estado`), que Node no resuelve sin cargador.

## R4. Qué viaja al hilo: funciones puras con nombre y estado completo

- **Decisión**: una tabla fija de funciones puras (`apps/server/src/simulacion/funciones.ts`) que importan el hilo y
  el modo en proceso. El hilo principal pide `ejecutar(nombre, argumentos, prioridad)`; los argumentos y el resultado
  se copian con *structured clone* (`postMessage`). Contrato en [contracts/calculo.md](contracts/calculo.md).
- **Razón**: `EstadoMotor` es «un objeto plano y serializable» (`packages/engine/src/estado/estado.ts`); el azar es
  `EstadoRng` (estado plano), no una clase; `avanzar` ya trabaja sobre una copia. Por eso enviar el estado completo en
  cada tramo da exactamente el mismo resultado y el hilo no guarda nada entre llamadas (sin afinidad partido→hilo, un
  hilo caído no pierde estado). Responde a la suposición «Tramos en directo» de la spec.
- **Coste de copia**: un `EstadoMotor` con los eventos de un partido entero son decenas a pocos cientos de KB; clonarlo
  cuesta ~1 ms frente a 150–400 ms de cálculo. En la 2D (un trozo cada ~250 ms por espectador) se vigila con
  `calculo_duracion_ms` (R7).
- **Alternativa descartada**: hilos con estado (cada partido en directo fijado a un hilo): reparte peor, complica la
  recuperación tras una caída y no hace falta por el punto anterior.

## R5. Prioridades, tiempo máximo y reintentos

- **Colas** (FR-012): `humano` y `npc`, FIFO cada una; un hilo libre toma primero de `humano`. Sin expropiación.
  - `humano`: apertura entre humanos, tramos en directo (rápida y 2D), «Finalizar partido», alineación del NPC rival
    al abrir un partido en directo, reproducción.
  - `npc`: NPC contra NPC (alineaciones y partido), resoluciones por plazo (`vencerJornada`, `forzarFinal`), partido
    heredado de la 001.
- **Tiempo máximo**: **20 s por intento**, contados desde que un hilo empieza la tarea (no la espera en cola). El
  cálculo más largo previsto es la alineación PRO (2 s, limitada por su propio reloj) o una reproducción 2D con
  fotogramas; 20 s es un orden de magnitud por encima y no salta por una máquina cargada.
- **Reintentos**: **2** (3 intentos). Solo por caída del hilo (`error`/`exit`) o tiempo agotado: el hilo se termina,
  se crea otro y la tarea vuelve **al principio** de su cola.
- **Una excepción dentro de la función no se reintenta**: el cálculo es determinista, repetirlo daría el mismo error.
  Se devuelve al comando como hoy («como cualquier error actual del motor», Edge Cases).
- **Agotados los intentos**: la promesa se rechaza con `ErrorCalculo` (función, motivo, intentos). El comando de la
  partida falla, el actor lo descarta y sigue con la cola (`actor.ts` ya lo hace); se registra con partida, partido y
  semilla (el que llama los añade al registro).

## R6. Jornadas NPC en paralelo sin cambiar el orden de lo guardado

- **Decisión**: `resolverPartidosSinHumanos` pasa a dos fases dentro del mismo comando del actor:
  1. **Calcular** (en paralelo): por cada partido NPC programado, alineaciones de los dos NPC y después
     `jugarHastaElFinal`, todo en el grupo con prioridad `npc`; `Promise.allSettled`.
  2. **Guardar y anunciar** (en serie, en el orden de los cruces, como hoy): dorsales, `partido.inicio`, tramo,
     `terminarPartido` (que registra el resultado y puede cerrar la jornada).
- **Razón**: el orden de registro en el torneo y de los mensajes es el de hoy, así que clasificación, bajas y eventos
  son idénticos (FR-002). Dentro de una jornada cada participante juega un solo partido y las bajas valen para la
  jornada siguiente: el cálculo de un partido no depende de otro de la misma jornada.
- **Partido fallido** (FR-008, clarificación 2): no se guarda nada de él (fase 2 solo recorre los cálculos que
  terminaron); queda `programado` y se registra `{partidaId, partidoId, semilla, motivo}`. Se reintenta,
  idempotentemente (solo los `programado`):
  - al reiniciar el servidor (`reprogramarTorneo`, jornada abierta);
  - al terminar cualquier otro partido de esa jornada (cubre al humano sin plazo, que no tiene otro disparador);
  - al vencer el plazo (`vencerJornada` ya resuelve los `programado`).
- **`simularResto`**: hoy repite «jornada abierta → resolver» hasta 200 veces; con un partido que falla siempre
  repetiría el cálculo fallido. `resolverPartidosSinHumanos` devuelve cuántos fallaron y `simularResto` se detiene con
  error si alguno falla.

## R7. Configuración y observabilidad

- **Variable**: `HILOS_SIMULACION` (en el estilo de `MIGRAR_AL_ARRANCAR`). Sin valor:
  `max(1, os.availableParallelism() - 1)`. `0`: modo en proceso, con aviso. Entero ≥ 1: ese tamaño. Cualquier otra
  cosa: valor por defecto y aviso (FR-007). En contenedores con cuota de CPU, fijarla explícitamente si
  `availableParallelism` no refleja la cuota (se documenta en `docs/despliegue.md`).
- **`crearServidor`**: `ConfigServidor.hilosSimulacion?: number`, **por defecto 0**. Así los tests de integración no
  cambian (FR-010) y solo `main.ts` aplica el valor por defecto según los núcleos.
- **Métricas** (FR-009, en `observabilidad/metricas.ts`, prom-client como las existentes): `hilos_simulacion` (gauge),
  `calculos_en_espera{prioridad}` (gauge), `calculo_duracion_ms{funcion}` (histograma), `calculos_fallidos_total{motivo}`
  (`caida` | `tiempo` | `error`) y `calculo_reintentos_total`.
- **Registro**: al arrancar, `info {hilos}` o `warn` en modo en proceso / valor no válido; `warn` en cada reintento;
  `error` al agotarlos.

## R8. Determinismo: lo que ya depende de la hora

- La alineación del NPC **PRO** se corta con `performance.now()` (`LIMITE_PRO_MS`, `packages/ai/src/alineacion.ts`):
  en una máquina cargada prueba menos candidatas. Esto **ya ocurre hoy** en el hilo principal y no lo cambia esta spec;
  en un hilo propio, sin competir con HTTP, el resultado será en todo caso más estable. Un reintento tras una caída
  puede elegir otra alineación PRO, pero como no se guardó nada del intento fallido no hay incoherencia.
- Quitar ese reloj (p. ej. un número fijo de simulaciones) es optimización del motor/IA: queda para INI-06.
- Fuera de eso no hay estado global mutable en el camino del cálculo: `parametrosActuales()` es un valor del módulo que
  cada hilo carga igual del mismo bundle.
- FR-002 se comprueba en el servidor (R10): `pnpm test:equivalence` (paquetes `engine` y `ai`) sigue en verde porque
  esos paquetes no cambian.

## R9. Lo que se queda en el hilo principal (excepciones a FR-001, justificadas)

- `decidirNPCEnPausa` en `abrirPausa`: no simula; mira la plantilla y el marcador y aplica decisiones sobre `p.motor`
  en el sitio. Moverla obligaría a devolver el estado y no quita CPU apreciable.
- `crearPartido`, `ordenJugadores`, `aplicarLote`/`aplicarDecision`: preparan o validan el estado, en µs.
- `reconstruirMotor` (solo `terminarPartidoEntreHumanosEnJuego`, el camino heredado de la 001 al desplegar la 002):
  una vez por partido heredado al reiniciar. Su `resolverResto` sí va al grupo.

Si alguna aparece en el perfil de carga (R11), se mueve con el mismo patrón.

## R10. Cómo se prueba

- **Grupo** (unitarias, `apps/server/tests/unit/grupoHilos.test.ts`) con un hilo de prueba
  (`tests/fixtures/hiloPrueba.ts`: funciones `eco`, `fallar`, `morir`, `colgar`) que el grupo acepta por opción:
  prioridades y FIFO, una tarea por hilo, excepción sin reintento, caída y tiempo agotado con reintento y sustitución,
  agotar reintentos, `cerrar()` rechaza lo pendiente; `hilosConfigurados` con los valores de FR-007.
- **Equivalencia** (SC-004): `apps/server/tests/unit/calculoEquivalencia.test.ts` juega N partidos con semillas fijas
  por las funciones de `funciones.ts` en proceso y en el grupo y compara con `toEqual`. N = 50 por defecto;
  `MUESTRA_EQUIVALENCIA=1000` para la muestra de SC-004.
- **Integración en los dos modos** (FR-004, FR-010): el ayudante `tests/helpers/app.ts` lee
  `HILOS_SIMULACION_PRUEBAS` (por defecto 0). `pnpm --filter @fbd/server test:integration:hilos` repite toda la suite
  de integración con 2 hilos, incluido «dos aperturas simultáneas» de `torneo-asincrono`, sin cambiar expectativas.
- **Caída real** (SC-005): un test de integración con 1 hilo mata el hilo durante la apertura de un partido entre
  humanos y comprueba el mismo marcador que en modo en proceso y que la partida acepta otro comando.
- **Carga** (SC-001, SC-003, SC-006): `tools/load/beta-100.js` sin cambios; resultados en
  `specs/003-mejoras-ux-simulacion/checklists/validacion.md` y `ROADMAP.md` (FR-011).

## R11. Riesgos

- **Memoria**: cada hilo carga el motor, la IA y los parámetros (decenas de MB). Con 7 hilos, ~+300 MB; dentro de lo
  normal en una máquina de 4–8 núcleos. Se mide con las métricas por defecto de prom-client durante la carga.
- **Si SC-001 no se alcanza** con 4–8 núcleos: el motor (INI-06) o repartir entre procesos son las palancas siguientes;
  ambas fuera de alcance. El registro de la medición dirá qué umbral falla y con qué cola de espera.
