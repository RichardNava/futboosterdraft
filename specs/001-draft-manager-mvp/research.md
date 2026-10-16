# Research — Fase 0: Fútboosterdraft MVP

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Fecha**: 2026-10-15

Cada apartado resuelve una incógnita del *Technical Context* con el formato
**Decisión / Razón / Alternativas consideradas**. La constitución deja la pila tecnológica como
"decisión pendiente", y este documento la fija para el MVP.

---

## R1. Lenguaje y entorno de ejecución

- **Decisión**: TypeScript 5.x en todo el sistema, con Node.js 22 LTS en el servidor y navegadores modernos (las dos últimas versiones de Chrome, Firefox, Safari y Edge) en el cliente.
- **Razón**:
  - El modelo de jugador ya viene descrito en TypeScript.
  - Un solo lenguaje permite compartir los tipos del dominio y los contratos de mensajes entre servidor y cliente.
  - El motor de simulación es código puro sin E/S, así que se ejecuta igual en el servidor, en las pruebas y en las herramientas de equilibrado.
- **Alternativas consideradas**:
  - C# con Unity: muy bueno para 2D, pero excesivo para "chapas" y complica el servidor web y las pruebas del dominio.
  - Go o Rust en el servidor con TS en el cliente: más rendimiento del necesario para 100 partidas, a cambio de duplicar el modelo de dominio en dos lenguajes.

## R2. Organización del código

- **Decisión**: un monorepo con workspaces de pnpm. Los paquetes de dominio no dependen de ninguna librería de E/S:
  - `packages/domain`: entidades y reglas: jugadores, sobres, draft, alineación, tácticas, torneos, bajas.
  - `packages/engine`: motor de simulación determinista.
  - `packages/ai`: NPC por niveles.
  - `packages/protocol`: contratos de mensajes cliente-servidor validados con esquemas.
  - `apps/server` y `apps/web`.
- **Razón**:
  - Cumple el Principio VIII (modularidad) y el III (las reglas no se dispersan entre interfaz y servidor).
  - El IV exige probar el motor sin interfaz, y el V exige que el mismo motor alimente las dos modalidades.
- **Alternativas consideradas**:
  - Un único proyecto backend con el motor dentro: mezcla reglas con E/S y dificulta las pruebas.
  - Microservicios: complejidad operativa injustificada para la escala beta (SC-017).

## R3. Comunicación en tiempo real

- **Decisión**: WebSocket (librería `ws`) bajo Fastify, con un protocolo propio de mensajes tipados y validados con Zod (ver [contracts/realtime-protocol.md](./contracts/realtime-protocol.md)). Las operaciones no en tiempo real (cuentas, crear partida, consultar torneo) van por HTTP/JSON ([contracts/http-api.md](./contracts/http-api.md)).
- **Razón**:
  - El draft simultáneo, el descanso sincronizado y la reproducción 2D necesitan avisos inmediatos del servidor al cliente.
  - Cada mensaje del cliente lleva un `requestId`, lo que permite descartar los duplicados (FR-062).
  - Tras una reconexión, el servidor reenvía una instantánea del estado, filtrada según lo que ese participante puede ver (FR-054a).
- **Alternativas consideradas**:
  - Socket.IO: añade "salas" y reconexión, pero su protocolo propio y su emulación por *polling* no aportan nada a navegadores modernos.
  - Colyseus: un framework de salas de juego muy acoplado a su propio modelo de estado sincronizado. Aquí la autoridad es un dominio puro y queremos controlar qué ve cada uno.
  - SSE + POST: válido para los avisos, pero hace falta canal bidireccional y de baja latencia para el 2D.

## R4. Autoridad del servidor y estado de las salas

- **Decisión**:
  - Cada partida activa vive en el servidor como un *actor* en memoria: una cola de comandos por partida que se procesan en serie.
  - Cada cambio de estado relevante se guarda en la base de datos antes de anunciarse.
  - Al reiniciar, el servidor reconstruye los actores desde la base de datos.
  - El cliente nunca calcula resultados (FR-061).
- **Razón**:
  - Procesar en serie dentro de una partida elimina las condiciones de carrera en el turno simultáneo (FR-007, FR-010).
  - Un solo proceso Node atiende de sobra 100 partidas: la carga dominante es el motor, que es barato (ver R7).
- **Alternativas consideradas**:
  - Estado compartido en Redis con varios procesos: necesario por encima de la escala beta, no ahora. El diseño por actores permite repartir las partidas entre procesos más adelante.
  - Bloqueos optimistas en la base de datos por cada elección: más E/S y más latencia por turno.
- **Ajuste tras la prueba de carga (T140)**:
  - Un comando largo puede adelantar con `ctx.publicar()` los mensajes de lo que ya está guardado. Lo usa el final de un partido, que se anuncia antes de cerrar la jornada y abrir la siguiente dentro del mismo comando.
  - Se probó a pasar ese cierre a un comando aparte, pero así otros comandos (por ejemplo, `GET /torneo`) veían estados intermedios.
  - Las elecciones del draft se siguen guardando una a una antes de confirmarlas, como exige esta decisión. Agruparlas por turno habría sido más rápido, pero confirmaría elecciones aún no guardadas.
  - Con 100 partidas en una sola máquina junto al generador de carga, el proceso queda casi saturado (ver `checklists/validacion.md`). Si en hardware dedicado no basta, la siguiente palanca es simular los partidos en *worker threads*.

## R5. Persistencia

- **Decisión**: PostgreSQL 16 con Drizzle ORM y migraciones versionadas. El catálogo de jugadores Core se carga desde un fichero JSON validado ([contracts/player-data.schema.json](./contracts/player-data.schema.json)) mediante un *seed* idempotente.
- **Razón**:
  - El modelo es relacional (partidas, mesas, elecciones, torneos, partidos, bajas) y necesita transacciones en la resolución de cada turno.
  - Las columnas JSONB guardan los stats, la alineación y el registro de eventos de cada partido.
- **Alternativas consideradas**:
  - MongoDB: peor para las restricciones de unicidad (una carta por mesa, una elección por turno).
  - SQLite: suficiente en local, pero limita el despliegue con conexiones concurrentes.

## R6. Plazos y tareas programadas (modo asíncrono, turnos, descansos)

- **Decisión**:
  - **Temporizadores cortos** (turno de draft, preparación, descanso): en memoria dentro del actor de la partida, guardando la hora absoluta de vencimiento. Al reiniciar el servidor, se reprograman a partir de esa hora.
  - **Plazos largos** (24 h por jornada, aviso a 2 h): el mismo mecanismo que los cortos. La hora de vencimiento se guarda en la tabla `jornadas` (`vence_en`) y, al rehidratar la partida tras un reinicio, se reprograman el vencimiento y el aviso previo.
- **Razón**: no exige más infraestructura (sin Redis ni cola de trabajos). Cada vencimiento se ejecuta dentro del actor de la partida y comprueba el estado antes de actuar (que la jornada siga abierta y el partido siga programado), así que repetirlo no tiene efecto. Esto da la garantía de "una sola vez" sin coordinación externa.
- **Desviación respecto al plan inicial**: el plan preveía `pg-boss` para los plazos largos y los avisos. En la implementación no hizo falta: con un único proceso, el actor ya serializa los comandos y la persistencia de `vence_en` cubre los reinicios. Si en el futuro hay varias réplicas del servidor, habrá que repartir las partidas entre réplicas (cada partida en una sola), o volver a una cola compartida como `pg-boss`.
- **Alternativas consideradas**: `pg-boss` (cola sobre PostgreSQL; descartada por ahora, ver arriba); BullMQ (requiere Redis); cron por *polling* de la tabla de jornadas (más simple, pero con peor precisión y más carga).

## R7. Diseño del motor de simulación

- **Decisión**: un motor de tiempo discreto, determinista y con semilla:
  - **PRNG**: generador propio `xoshiro128**` con semilla de 128 bits, guardada en el partido.
  - **Aritmética**: valores enteros o en "milésimas" para stats y probabilidades. Sin `Math.random`, sin funciones trigonométricas en las decisiones y sin depender del orden de iteración de objetos.
  - **Paso del tiempo**: avanza en *ticks* de 1 segundo de juego (5.400 en 90 minutos). En cada tick, la posesión genera una acción según la zona del balón, la formación, la táctica y los specials. La acción se resuelve con un **duelo de stats**: probabilidad = función logística de (stat atacante efectivo − stat defensor efectivo) más los modificadores.
  - **Stats efectivos**: base × penalización por posición × cansancio + specials de equipo (deduplicados, FR-038) + contexto (marcador, minuto).
  - **"Reroll"** (Filigranas, Muro defensivo, Guante en el pie, Santo): se resuelve dos veces y se queda el mejor resultado, consumiendo números del PRNG de forma determinista.
  - **Posiciones espaciales**: el motor mantiene posiciones aproximadas de jugadores y balón en una rejilla del campo. La modalidad 2D las interpola entre fotogramas clave; la rápida las ignora.
  - **Puntos de decisión**: el motor se ejecuta **por tramos** hasta la siguiente interrupción del juego (2D) o hasta el descanso o el final (rápida). Las decisiones del participante se encolan y se aplican al empezar el tramo siguiente. Así ambas modalidades recorren exactamente la misma secuencia (FR-032, SC-008).
  - **Configuración**: todas las magnitudes (penalizaciones, bonificaciones, pendiente de la logística, tasas de lesión y de tarjetas) viven en un fichero de **parámetros de equilibrado** versionado. Cada partido guarda la versión de parámetros con la que se jugó (FR-040).
- **Razón**:
  - Da partidos reproducibles (FR-040).
  - Separa el cálculo de la presentación (Principios IV y V).
  - Hace que cada decisión del usuario pese de forma medible (SC-004 a SC-006).
- **Coste estimado**: 5.400 ticks con ~1 acción por tick son menos de 10 ms por partido en Node. Una jornada de 4 partidos NPC contra NPC tarda menos de 100 ms, holgadamente por debajo de SC-017 (10 s).
- **Alternativas consideradas**:
  - Modelo de "ocasiones por minuto" sin espacio: rapidísimo, pero no puede alimentar el 2D sin inventar movimientos, lo que rompería el Principio V.
  - Física continua (motor tipo Box2D): muy costosa, difícil de hacer determinista y excesiva para chapas.
  - Simular el partido entero de antemano y reproducirlo: incompatible con los cambios en vivo, que alteran el futuro.

## R8. Equilibrado y verificación estadística

- **Decisión**: una herramienta de línea de comandos `balance` (en `tools/balance`) que ejecuta series de N partidos o torneos con semillas reproducibles y comprueba automáticamente SC-004, SC-005, SC-006, SC-007, SC-010 y SC-015. Se ejecuta en CI con N reducido (200) y en local con N = 1.000. También valida SC-013 (distribución de los sobres) y la holgura de la colección Core frente a la tabla de la especificación.
- **Razón**: el Principio IX exige pruebas para el equilibrado, y los criterios de éxito son estadísticos.
- **Alternativas consideradas**: ajustar a mano jugando: no se puede reproducir y no detecta regresiones.

## R9. NPC

- **Decisión**: una única función de evaluación compartida, con cuatro perfiles de "ruido y miopía":
  - **Evaluación**: cuánto mejora una carta o una alineación la fuerza esperada del equipo. Combina la media efectiva en la mejor casilla disponible, la cobertura de las posiciones que faltan para las formaciones viables, la escasez de porteros y la sinergia de specials.
  - **Amateur**: elige con mucho ruido y considera solo la media.
  - **Intermedio**: ruido moderado y cobertura básica de posiciones.
  - **Avanzado**: poco ruido; evaluación completa con 1 formación objetivo.
  - **PRO**: sin ruido; evalúa las 10 formaciones y todas las tácticas contra el rival conocido (su plantilla es visible tras el draft, FR-054a), y elige el máximo. En el draft también tiene en cuenta qué cartas pueden volver en sobres posteriores.
  - Las decisiones de alineación y táctica del PRO se apoyan en simulaciones rápidas de prueba con el propio motor (p. ej. 20 partidos por candidata, limitado a 2 s).
- **Razón**: un mismo evaluador garantiza que los niveles estén ordenados (SC-010) y cumple FR-060 ("la mejor opción que el sistema evalúa").
- **Alternativas consideradas**: árboles de reglas distintos por nivel (difícil garantizar el orden de dificultad); aprendizaje por refuerzo (coste y opacidad injustificados para el MVP).

## R10. Cliente web y renderizado 2D

- **Decisión**: React 19 + Vite. El estado de pantalla lo gestiona Zustand. El 2D se dibuja en **Canvas 2D** nativo con interpolación a 60 fps, y la velocidad (x2 a x32) solo cambia el reloj de reproducción del cliente.
- **Razón**:
  - Son 22 círculos, un balón y textos: Canvas 2D sobra y no añade dependencias.
  - React cubre bien las pantallas de draft, alineación (arrastrar y soltar en casillas), torneo y resumen.
- **Alternativas consideradas**: PixiJS/WebGL (innecesario para esta carga); Phaser (motor de juego completo que duplicaría responsabilidades con el motor del servidor).

## R11. Velocidad compartida en la reproducción 2D entre humanos

- **Decisión**: el servidor emite los tramos simulados como fotogramas clave con su tiempo de juego. Cada cliente reproduce a su velocidad, pero el servidor **no simula el siguiente tramo** hasta que el reloj de reproducción del participante más lento llega a la interrupción (cada cliente envía señales periódicas de su minuto de reproducción). Así se cumple que avance "a la menor de las velocidades" (FR-049) y que los cambios se apliquen en la interrupción correcta.
- **Alternativas consideradas**: forzar en el servidor una única velocidad compartida, que hace que un cliente rápido quede bloqueado sin explicación en la interfaz.

## R12. Cuentas, invitados y sesiones

- **Decisión**:
  - Better Auth (librería TS) con correo y contraseña sobre la misma PostgreSQL.
  - Los **invitados** obtienen una sesión anónima con un identificador temporal. El servidor solo les permite crear partidas en directo de 1 humano con NPC (FR-000).
  - Las sesiones viajan en una cookie `HttpOnly`, que también autentica el WebSocket.
- **Razón**: es una solución estándar sin servicio externo, admite sesiones anónimas y se puede ampliar con OAuth más adelante.
- **Alternativas consideradas**: Auth.js (más orientado a Next.js); un proveedor gestionado (Clerk, Auth0), que añade dependencia y coste externos sin necesidad para la beta.

## R13. Avisos del modo asíncrono (FR-056b)

- **Decisión**: avisos dentro de la aplicación (bandeja y aviso en tiempo real si está conectado) y **correo transaccional** a través de un proveedor SMTP configurable. Los avisos se guardan en la tabla `avisos` y el correo se envía en el momento (si falla, queda registrado en el log y el aviso sigue en la bandeja).
- **Alternativas consideradas**: Web Push (requiere permisos del navegador y service worker; queda como mejora posterior); solo avisos dentro de la aplicación (insuficiente si el usuario no está conectado).

## R14. Pruebas

- **Decisión**:
  - **Vitest** para pruebas unitarias y de integración de `domain`, `engine`, `ai` y `server`.
  - **fast-check** para propiedades: circulación de sobres para N = 4 a 8, ausencia de duplicados, 24 cartas por participante, validez de las alineaciones y determinismo del motor.
  - **Testcontainers** (PostgreSQL) para la integración del servidor.
  - **Playwright** para recorridos completos en el navegador (draft, alineación, partido rápido, 2D, invitado).
  - La herramienta `balance` (R8) para los criterios estadísticos.
  - Una prueba de **coherencia rápida = 2D** que ejecuta el mismo partido y decisiones por ambos caminos y compara el registro de eventos (SC-008).
  - Una prueba de carga con **k6** (WebSocket) para SC-017.
- **Razón**: cubre las prioridades de pruebas que fija el Principio IX.

## R15. Despliegue y operación (beta)

- **Decisión**: una imagen Docker del servidor (que además sirve los ficheros estáticos de la web) y una PostgreSQL gestionada, desplegadas en un PaaS que admita conexiones persistentes (WebSocket) y procesos de larga duración. Un único proceso por defecto, dimensionado para 100 partidas.
- **Monitorización**: logs estructurados con `pino` (con identificador de partida y de petición), métricas de Prometheus (partidas activas, duración de resolución de turno, partidos simulados por segundo, desconexiones) y una ruta de estado `/healthz`.
- **Alternativas consideradas**: plataformas solo *serverless*, sin procesos persistentes: incompatibles con los actores en memoria y los temporizadores de turno.

## R16. Generación de sobres sin quedarse sin cartas

- **Decisión**: el generador construye **toda la mesa de una vez** al empezar el draft (24 sobres para 8 participantes):
  1. Sortea los huecos "POR o DEF" y "alta" de cada sobre.
  2. Asigna las cartas con un **sorteo restringido por disponibilidad**: dentro de cada sobre, el cruce entre demarcación y nivel se hace al azar, pero solo entre las combinaciones que aún tienen cartas en el pool.
  3. Si un sobre no se puede completar, reintenta con otra permutación (como máximo 500). Si aun así fallara, aborta con un error explícito (nunca debería ocurrir con la colección de 300; en 100.000 mesas simuladas no ocurrió).
  - La semilla de la mesa se guarda para reproducirla.
- **Razón**: valida antes de empezar que se cumplen FR-011 y FR-014, y deja trazabilidad.
- **Alternativas consideradas**: generar cada sobre al abrirlo (riesgo de agotar una combinación a mitad del draft).

## R17. Gestor de paquetes

- **Decisión**: **pnpm** es el único gestor de paquetes del proyecto (requisito del propietario, 2026-10-15). Se impone así:
  - Campo `"packageManager": "pnpm@<versión 9.x fijada>"` en el `package.json` raíz, que Corepack respeta.
  - Script `"preinstall": "npx only-allow pnpm"` para que falle cualquier intento de `npm install` o `yarn`. Es la única aparición permitida de `npx`: ese script se ejecuta con el gestor que se haya lanzado por error, así que no puede depender de pnpm.
  - Un único `pnpm-lock.yaml` versionado; los `package-lock.json` y `yarn.lock` van al `.gitignore`.
  - Dependencias internas con el protocolo `workspace:*` y scripts ejecutados con `pnpm -r` / `pnpm --filter`.
  - En CI, `pnpm install --frozen-lockfile` con la caché del almacén de pnpm.
- **Razón**:
  - Su almacén direccionado por contenido y los enlaces duros reducen el tiempo de instalación y el espacio en disco.
  - Su `node_modules` estricto impide usar dependencias no declaradas, algo importante para que los paquetes puros (`domain`, `engine`) no dependan por accidente de librerías de E/S.
  - Sus workspaces encajan con el monorepo de R2.
- **Alternativas consideradas**: npm workspaces (más lento y con dependencias "fantasma" accesibles); Yarn Berry (PnP complica las herramientas); Bun (su compatibilidad con el ecosistema Node del servidor es menos madura).

---

## Resumen de incógnitas resueltas

| Incógnita del Technical Context | Resuelta en |
|---------------------------------|-------------|
| Lenguaje / versión | R1 |
| Dependencias principales | R2, R3, R5, R10, R12 |
| Almacenamiento | R5, R6 |
| Pruebas | R8, R14 |
| Plataforma objetivo | R1, R15 |
| Tipo de proyecto | R2 |
| Objetivos de rendimiento | R7, SC-009, SC-017 |
| Restricciones (determinismo, autoridad del servidor) | R4, R7, R11 |
| Escala | R4, R15 (100 partidas, unos 800 participantes) |

No queda ninguna marca `NEEDS CLARIFICATION`.
