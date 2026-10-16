---

description: "Lista de tareas del MVP de Fútboosterdraft"
---

# Tasks: Fútboosterdraft MVP — Draft, equipo, simulación y torneos

**Input**: Documentos de diseño en `/specs/001-draft-manager-mvp/`: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md).

**Tests**: SE INCLUYEN. El Principio IX de la constitución exige pruebas automatizadas para el draft, las posiciones, los specials, el motor, la coherencia entre modalidades, la integridad y las desconexiones, y los criterios de éxito SC-001 a SC-017 son verificables. En cada historia, las pruebas se escriben **antes** que la implementación y deben fallar primero.

**Organization**: tareas agrupadas por historia de usuario. Gestor de paquetes: **pnpm**, siempre (research R17, [CLAUDE.md](../../CLAUDE.md)). Nunca npm, yarn ni bun.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede ejecutar en paralelo (ficheros distintos, sin dependencias pendientes).
- **[Story]**: historia a la que pertenece (US1 a US6, ver spec.md).
- Todas las rutas son relativas a la raíz del repositorio y siguen la estructura de [plan.md](./plan.md).

## Path Conventions (monorepo de plan.md)

- Reglas puras: `packages/domain/src/`, `packages/engine/src/`, `packages/ai/src/`; sus pruebas, en `packages/<paquete>/tests/`.
- Contratos compartidos: `packages/protocol/src/`.
- Servidor: `apps/server/src/`; pruebas en `apps/server/tests/{integration,contract}/`.
- Cliente: `apps/web/src/`; pruebas de principio a fin en `apps/web/tests/e2e/`.
- Herramientas: `tools/balance/`, `tools/load/`, `tools/fixtures/`. Datos: `data/core.json`.
- **Prohibido en `packages/domain` y `packages/engine`**: `Math.random`, `Date`, `performance.now`, E/S. Toda aleatoriedad pasa por el PRNG con semilla.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: inicializar el monorepo con pnpm y las herramientas comunes.

- [X] T001 Crear el `package.json` raíz:
  - `"private": true`, `"packageManager": "pnpm@9.15.0"` y `"engines": { "node": ">=22" }`.
  - Script `"preinstall": "npx only-allow pnpm"`.
  - Scripts `dev`, `build`, `lint`, `typecheck`, `test`, `test:integration`, `test:equivalence`, `e2e`, `balance`, `seed`, `db:migrate`, delegando con `pnpm -r` / `pnpm --filter`.
  - Crear también `pnpm-workspace.yaml` (con `packages/*`, `apps/*`, `tools/*`), `.npmrc` (`engine-strict=true`) y `.gitignore` (incluye `node_modules`, `dist`, `package-lock.json`, `yarn.lock`, `.env`).
- [X] T002 Crear `tsconfig.base.json` con `strict: true`, `noUncheckedIndexedAccess: true`, `module: "NodeNext"`, `target: "ES2023"`, `composite: true` y referencias de proyecto para cada paquete y app.
- [X] T003 [P] Configurar ESLint (configuración plana en `eslint.config.js`) y Prettier (`.prettierrc`). Añadir una regla `no-restricted-globals`/`no-restricted-properties` que prohíba `Math.random`, `Date` y `performance` en `packages/domain/**` y `packages/engine/**` (research R7).
- [X] T004 [P] Crear `vitest.workspace.ts` con los proyectos `packages/domain`, `packages/engine`, `packages/ai`, `apps/server` y `tools/balance`.
- [X] T005 [P] Crear `docker-compose.yml` con el servicio `db` (postgres:16, puerto 5432, volumen) y `mail` (axllent/mailpit, interfaz en el puerto 8025), y `.env.example` con `DATABASE_URL`, `SMTP_URL`, `AUTH_SECRET` y `PUBLIC_URL`.
- [X] T006 Crear el paquete `packages/domain`: `package.json` (`"name": "@fbd/domain"`, sin dependencias de E/S), `tsconfig.json` y `src/index.ts` vacío.
- [X] T007 [P] Crear el paquete `packages/engine`: `package.json` (`"name": "@fbd/engine"`, dependencia `"@fbd/domain": "workspace:*"`), `tsconfig.json` y `src/index.ts`.
- [X] T008 [P] Crear el paquete `packages/ai`: `package.json` (`"name": "@fbd/ai"`, dependencias `@fbd/domain` y `@fbd/engine` con `workspace:*`), `tsconfig.json` y `src/index.ts`.
- [X] T009 [P] Crear el paquete `packages/protocol`: `package.json` (`"name": "@fbd/protocol"`, dependencias `zod` y `@fbd/domain` con `workspace:*`), `tsconfig.json` y `src/index.ts`. Copiar `specs/001-draft-manager-mvp/contracts/player-data.schema.json` a `packages/protocol/schemas/player-data.schema.json`, que pasa a ser la fuente única que usa el código, y exportar su ruta.
- [X] T010 [P] Crear la app `apps/server`:
  - `package.json` con las dependencias `fastify`, `@fastify/cookie`, `@fastify/static`, `ws`, `drizzle-orm`, `drizzle-kit`, `pg`, `better-auth`, `pino`, `prom-client`, `nodemailer`, `ajv`, `ajv-formats` y los paquetes `@fbd/*` con `workspace:*`; y las de desarrollo `vitest`, `@testcontainers/postgresql`, `tsx`.
  - `tsconfig.json` y `src/main.ts` vacío.
- [X] T011 [P] Crear la app `apps/web` con Vite + React 19 + TypeScript: `package.json` (dependencias `react`, `react-dom`, `react-router`, `zustand`, `@fbd/protocol` y `@fbd/domain` con `workspace:*`; de desarrollo `@playwright/test`), `vite.config.ts` (proxy de `/api` y `/ws` al servidor), `playwright.config.ts`, `index.html` y `src/main.tsx`.
- [X] T012 [P] Crear la herramienta `tools/balance`: `package.json` (`"name": "@fbd/balance"`, ejecutable `balance`, dependencias `@fbd/*` con `workspace:*`) y `src/cli.ts`, que de momento solo procesa los argumentos `--n`, `--seed`, `--torneos` y `--pro-vs-amateur`.
- [X] T013 [P] Crear la herramienta `tools/fixtures`, con `package.json` (`"name": "@fbd/fixtures"`, dependencia `@fbd/domain` con `workspace:*`, script `generar-core`) y `src/`, y la carpeta `tools/load/` con un `README.md` que explique cómo ejecutar k6.
- [X] T014 Crear `.github/workflows/ci.yml`:
  - Instalación: `pnpm/action-setup`, Node 22, caché del almacén de pnpm y `pnpm install --frozen-lockfile`.
  - Pasos: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration` (con Docker), `pnpm test:equivalence` y `pnpm balance --n 200`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: dominio base, catálogo, persistencia, autenticación, actor por partida, pasarela WebSocket y esqueleto de la web.

**⚠️ CRITICAL**: ninguna historia puede empezar hasta completar esta fase.

### Dominio base

- [X] T015 [P] Implementar el PRNG `xoshiro128**` con semilla de 128 bits en hex, más `derivarSemilla(raiz, etiqueta)` (hash determinista) y utilidades `entero(min,max)`, `probabilidad(milesimas)` y `barajar(array)`, en `packages/domain/src/rng/xoshiro.ts`. Pruebas de determinismo y de distribución uniforme (χ² sobre 100.000 tiradas) en `packages/domain/tests/rng.test.ts`.
- [X] T016 [P] Definir los tipos del catálogo en `packages/domain/src/catalogo/tipos.ts`, según data-model §1.1 y §1.2:
  - `Demarcacion = 'POR'|'DEF'|'MED'|'DEL'`.
  - `Posicion = POR|LI|LD|DCI|DCD|CI|CD|MD|MC|MII|MID|MCO|DC|SD|EI|ED`.
  - `Nivel = 'Superclase'|'Epico'|'Legendario'|'GOAT'`. En código y datos no se usan tildes; la etiqueta "Épico" para la interfaz se define en `apps/web/src/textos/niveles.ts`.
  - Uniones `Special` de los 15 genéricos y los 5 de cada demarcación, con los identificadores exactos de data-model §1.2.
  - `StatsPOR/DEF/MED/DEL`, con las 6 claves exactas de FR-019.
  - Interfaz `Jugador`, con los 14 campos de FR-016.
- [X] T017 Implementar `validarJugador(j)` y `validarColeccion(js)` en `packages/domain/src/catalogo/validar.ts`. Cada error devuelve `{ id, regla, mensaje }`. Reglas:
  - "exactamente las 6 claves de su demarcación (FR-019); enteros 1–99 (FR-020)".
  - "`media` = promedio de los 6 stats (±0,01)".
  - "Superclase hasta 1, Épico hasta 2, Legendario hasta 3, GOAT hasta 4" specials, sin repetidos.
  - Specials permitidos: genéricos más los de su demarcación; un DEF con `CI` o `CD` también puede tener los de MED.
  - "Un POR solo tiene `POR`"; ningún jugador de campo tiene `POR`.
  - `posicion` con 1 o más elementos y sin repetidos.
  - `altura` 150–215; `coleccion` = "Core"; `id` único.
- [X] T018 [P] Escribir las pruebas del validador en `packages/domain/tests/catalogo/validar.test.ts`: un caso válido por demarcación y un caso inválido por cada regla de FR-016 a FR-024.
- [X] T019 [P] Crear los parámetros de equilibrado versionados en `packages/domain/src/parametros/v1.json`, y su tipo y cargador en `packages/domain/src/parametros/index.ts` (data-model §1.5). Valores iniciales:
  - Penalizaciones: `penalizacionFueraPosicion: 0.25`, `penalizacionPorteria: 0.60`.
  - Cansancio: `cansancio.inicioMin: 65`, `cansancio.inicioMinPresionAlta: 55`.
  - Lesiones: `lesiones.reparto: { leve, media, grave, larga: 0.02 }`, con `partidos: {leve:1, media:2, grave:3, larga:5}`.
  - Sobres: `sobres.probPorteroEnHuecoPorDef: 0.5`, `sobres.probGoatEnAlta: 0.2`.
  - Bonificaciones fijas de specials: Capitanía +1, Fortaleza mental +2, Intimidante −1, Infranqueable +2 con regate ≥ 95, Jerarquía +1, Líbero +2, Box-to-Box +1.
  - Valores provisionales para el resto (efectos de táctica y formación, pendiente de la logística, tasas de faltas, tarjetas y lesiones).
  - `version: "1.0.0"`.
- [X] T020 Crear el generador de contenido (después de los tipos y del validador del catálogo) `tools/fixtures/src/generarCore.ts`. Debe producir `data/core.json` con **300 jugadores ficticios** (nombres inventados, sin personas reales) que respeten exactamente esta tabla:

  | | Superclase | Épico | Legendario | GOAT |
  |---|---|---|---|---|
  | POR | 14 | 8 | 7 | 3 |
  | DEF | 44 | 22 | 22 | 12 |
  | MED | 44 | 22 | 22 | 12 |
  | DEL | 30 | 15 | 15 | 8 |

  Además: el nivel se escribe sin tilde en los datos (`"Epico"`); stats coherentes con el nivel (Superclase ~70–79 de media, Epico ~78–84, Legendario ~83–89, GOAT ~88–94), posiciones verosímiles por demarcación, specials dentro del máximo del nivel y `historia` breve. Ejecutarlo y versionar el resultado `data/core.json`.
- [X] T021 Implementar las formaciones como datos estáticos en `packages/domain/src/equipo/formaciones.ts`, con las 10 formaciones y sus 11 casillas exactamente según la tabla de Assumptions de spec.md.
  - Cada casilla es `{ id, posicionesAdmitidas, zona: {x, y} }`.
  - La casilla central de una defensa de 3 o 5 tiene `posicionesAdmitidas: ['DCI','DCD']` (FR-025a).
  - Ids de formación: `'3-4-3'|'4-3-3'|'4-4-2'|'4-4-2-diamante'|'4-2-3-1'|'3-5-2'|'5-4-1'|'5-3-2'|'4-5-1'|'3-3-3-1'`.
  - Perfil `{ ofensividad, amplitud }` de cada una, con la ofensividad de la tabla de Assumptions: 3-4-3 y 3-3-3-1 +2; 4-3-3 y 3-5-2 +1; 4-2-3-1, 4-4-2 y 4-4-2 en diamante 0; 4-5-1 y 5-3-2 −1; 5-4-1 −2.
  - Pruebas en `packages/domain/tests/equipo/formaciones.test.ts`: 11 casillas, exactamente 1 POR y coincidencia con la tabla de la especificación.

### Protocolo base

- [X] T022 [P] Definir con Zod el sobre común de mensajes en `packages/protocol/src/ws/base.ts`: `{ t, ... }`, `ack { requestId, ok, error? }`, `error { codigo, mensaje }`, `estado { serverTime, fase, vista }`, `ping`/`pong`. Definir también el formato de error HTTP `{ error: { codigo, mensaje, detalles } }` en `packages/protocol/src/http/base.ts`, según contracts/realtime-protocol.md y contracts/http-api.md.

### Servidor base

- [X] T023 Configurar Drizzle en `apps/server/drizzle.config.ts` y definir el esquema base en `apps/server/src/persistencia/esquema/base.ts`:
  - `usuarios`: `id uuid`, `tipo 'registrado'|'invitado'`, `email` único y no nulo si `registrado`, `apodo` de 3–20 caracteres, `creadoEn`.
  - `jugadores`: columnas del catálogo, `stats jsonb`, `specials text[]`.
  - `partidas`: campos de data-model §2.2, con `CHECK` de `numParticipantes` según `modo` ("Liga 4–8; playoff ∈ {4, 8, 16}; mixto = 8").
  - `participantes`: campos de data-model §2.3.
  - `peticiones_procesadas`: `(partidaId, requestId)` PK, para descartar duplicados.
  - Generar la primera migración en `apps/server/drizzle/`.
- [X] T024 Implementar el *seed* en `apps/server/src/persistencia/seed.ts` y el script `pnpm seed --file <ruta>`:
  - Valida con Ajv contra `packages/protocol/schemas/player-data.schema.json` y después con `validarColeccion`.
  - Si hay errores, rechaza el fichero entero y lista `id` y regla.
  - Inserta de forma idempotente, con *upsert* por `id`.
  - Imprime el recuento por demarcación × nivel comparado con la tabla de 300, y avisa si el reparto equilibrado queda por debajo de 243.
- [X] T025 [P] Implementar la observabilidad en `apps/server/src/observabilidad/`:
  - `logger.ts`: pino con `partidaId` y `requestId` en el contexto.
  - `metricas.ts`: prom-client con `partidas_activas`, `turno_draft_resolucion_ms`, `partidos_simulados_total`, `desconexiones_total`.
  - `rutas.ts`: `GET /healthz`, que comprueba la base de datos, y `GET /metrics`.
- [X] T026 Implementar la autenticación en `apps/server/src/auth/`:
  - Better Auth con correo y contraseña y con sesiones anónimas.
  - Rutas `POST /api/auth/invitado`, `/registro` (si hay sesión de invitado, la convierte en cuenta), `/login` y `/logout`, y `GET /api/me`.
  - Cookie `HttpOnly`, `SameSite=Lax`.
  - Hooks `requiereSesion` y `requiereRegistrado`; este último responde `403 INVITADO_NO_PERMITIDO`.
- [X] T027 Crear el arranque de Fastify en `apps/server/src/http/app.ts` y `apps/server/src/main.ts`:
  - Registro de rutas y gestor de errores que traduce los errores de dominio a `400/401/403/404/409/422` con el formato común.
  - Plugin `Idempotency-Key` para los `POST` que cambian estado, guardado en `peticiones_procesadas`.
  - Servir los estáticos de `apps/web/dist` en producción.
- [X] T028 Implementar el reloj inyectable en `apps/server/src/programador/reloj.ts` (`Reloj` real y `RelojFalso` con `avanzar(ms)`, activable con `--fake-clock` en desarrollo) y los temporizadores cortos en `apps/server/src/programador/temporizadores.ts`. Los temporizadores trabajan con hora absoluta `venceEn`, se pueden cancelar y se reprograman al rehidratar.
- [X] T029 Implementar el actor por partida en `apps/server/src/actores/actor.ts`:
  - Cola de comandos procesada en serie (research R4).
  - Registro `RegistroActores`: obtener o crear por `partidaId`, y `rehidratarTodos()` al arrancar a partir de las partidas en estado `en_draft` o `en_torneo`.
  - La regla "guardar antes de anunciar": un comando solo emite mensajes después de confirmar la transacción.
- [X] T030 Implementar la pasarela WebSocket en `apps/server/src/ws/pasarela.ts`:
  - Ruta `GET /ws?partidaId=`, autenticada con la cookie de sesión y comprobando que el usuario participa en la partida.
  - Registro de conexiones por partida y participante.
  - Validación Zod de cada mensaje entrante.
  - Descarte de duplicados por `requestId`: si se repite, responde el `ack` ya guardado.
  - `ping`/`pong`.
  - Al conectar, envía `estado` con la vista filtrada que proporcione el actor.
  - Contabiliza las desconexiones.
- [X] T031 [P] Implementar las rutas del catálogo en `apps/server/src/http/catalogo.ts`: `GET /api/catalogo/jugadores/:id`, `GET /api/catalogo/formaciones` y `GET /api/catalogo/specials` (con nombre, ámbito y descripción en español de cada special, tomados de la especificación).
- [X] T032 [P] Crear las utilidades de prueba del servidor en `apps/server/tests/helpers/`:
  - `bd.ts`: PostgreSQL con Testcontainers, migraciones y *seed* con un `core.json` reducido.
  - `app.ts`: construye la app con `RelojFalso`.
  - `clienteWs.ts`: conecta con una cookie y espera mensajes por tipo.
  - `usuarios.ts`: crea invitados y registrados.

### Web base

- [X] T033 Crear el esqueleto de la web en `apps/web/src/`:
  - `app/Rutas.tsx`: rutas de inicio, crear partida, sala, draft, plantillas, alineación, partido y torneo.
  - `api/cliente.ts`: `fetch` con cookie y manejo del formato de error común.
  - `conexion/ws.ts`: reconexión con espera exponencial, corrección del desfase con `serverTime` y envío con `requestId` UUID.
  - `estado/sesion.ts`: Zustand.
  - Textos en español.
- [X] T034 [P] Crear el componente reutilizable `apps/web/src/componentes/CartaJugador.tsx`:
  - Muestra nombre, demarcación, posiciones, media redondeada al entero ("se muestra redondeada al entero más cercano"), nivel con su color y specials.
  - Variante compacta.
  - `apps/web/src/componentes/FichaJugador.tsx`: ventana con la ficha completa (stats con abreviaturas AGI/COL/…, historia, nacionalidad, altura, edad), cargada de `GET /api/catalogo/jugadores/:id`.
- [X] T035 Crear la pantalla `apps/web/src/pantallas/Inicio.tsx`, con los botones "Jugar como invitado", "Iniciar sesión" y "Registrarse" y sus formularios.

**Checkpoint**: base lista. Pasan el *seed*, `pnpm lint`, `pnpm typecheck` y las pruebas de `rng`, `validar` y `formaciones`.

---

## Phase 3: User Story 1 — Draftear una plantilla de 24 jugadores (Priority: P1) 🎯 MVP

**Goal**: crear una partida, rellenar con NPC y completar el draft simultáneo de 3 sobres × 8 cartas con circulación izquierda, derecha e izquierda; cada participante acaba con 24 jugadores.

**Independent Test**: sala con 1 humano (invitado) y NPC; completar los 3 sobres y comprobar 24 jugadores distintos por participante, que cada carta acaba en una sola plantilla y que la dirección de cada sobre es la correcta (quickstart, escenario A).

### Tests for User Story 1 ⚠️ (escribir primero; deben fallar)

- [X] T036 [P] [US1] Pruebas de propiedades del generador de sobres en `packages/domain/tests/sobres/generador.test.ts` (fast-check, N = 4..8):
  - Cada sobre tiene "1 carta 'POR o DEF', 2 DEF, 3 MED y 2 DEL" y "4 Superclase, 2 Épico, 1 Legendario y 1 carta 'alta' que es Legendario (80 %) o GOAT (20 %)".
  - Ningún `Jugador.id` se repite en la mesa (FR-011).
  - La misma semilla da el mismo resultado.
  - En 10.000 sobres, POR en el hueco "POR o DEF" = 50 % ± 1 y GOAT en la carta alta = 20 % ± 1 (SC-013).
  - 0 fallos en 10.000 mesas de 8 con el `core.json` real.
- [X] T037 [P] [US1] Pruebas de propiedades de la mesa de draft en `packages/domain/tests/draft/mesa.test.ts` (N = 4..8):
  - El asiento `i` entrega a `(i+1) mod N` en las rondas 1 y 3 y a `(i−1+N) mod N` en la 2 (SC-002).
  - Al final, 24 jugadores por participante, 8 de cada sobre, sin duplicados (SC-001, FR-012).
  - La autoelección toma la carta de mayor media y, si hay empate, la primera del sobre (FR-009).
  - Se rechazan la segunda elección del mismo turno (`YA_ELEGIDO`), una carta que no está en el sobre (`CARTA_NO_EN_SOBRE`) y una elección fuera de plazo (`TURNO_CERRADO`).
- [X] T038 [P] [US1] Pruebas de la partida en `packages/domain/tests/partida/partida.test.ts`:
  - `numParticipantes` "Liga 4–8; playoff ∈ {4, 8, 16}; mixto = 8".
  - Si el anfitrión es invitado, "`ritmo = 'directo'` y `numParticipantes − 1` plazas son NPC" (FR-000).
  - Transiciones `buscando → en_draft → en_torneo → terminada`, `buscando → cancelada` y `→ abandonada`.
  - El relleno automático asigna niveles aleatorios entre amateur, intermedio y avanzado, nunca PRO (FR-059).
  - Los asientos se sortean con la semilla de la partida: misma semilla, mismo orden (FR-005).
  - Una partida de invitado pasa a `abandonada` al cerrar la sesión o tras 10 minutos seguidos sin conexión, y no antes.
  - `colecciones` es `['Core']` por defecto (FR-015).
- [X] T039 [P] [US1] Pruebas de integración del draft en `apps/server/tests/integration/draft.test.ts`:
  - 1 humano + 3 NPC completan el draft.
  - El turno no avanza hasta que todos eligen o vence el tiempo.
  - Un `draft.progreso` nunca revela la carta elegida.
  - Al reenviar el mismo `requestId`, llega el mismo `ack`.
  - Tras una reconexión a mitad de turno, `estado` trae el sobre y las elecciones propias.
  - Un humano desconectado recibe autoelecciones (SC-011).
  - `GET /api/partidas/:id/plantillas` responde `409 DRAFT_EN_CURSO` durante el draft y devuelve las 24 cartas de todos al terminar.
  - Un playoff de 16 crea 2 mesas de 8.
  - Con `RelojFalso` y ningún humano eligiendo, un draft de 8 termina en 20 minutos o menos (SC-001).
  - Un invitado que se reconecta antes de 10 minutos continúa el draft; pasados 10 minutos sin conexión, la partida queda `abandonada`.
- [X] T040 [P] [US1] Pruebas de contrato HTTP de partidas en `apps/server/tests/contract/partidas.test.ts`: `POST /api/partidas` (validación `422 NUM_PARTICIPANTES_INVALIDO`; invitado con asíncrono o con plazas humanas → `403 INVITADO_NO_PERMITIDO`), `unirse` (`409 PARTIDA_COMPLETA`/`PARTIDA_INICIADA`), `npc`, `iniciar` y `GET /api/partidas/:id`.
- [X] T041 [P] [US1] Prueba de principio a fin `apps/web/tests/e2e/draft-solo.spec.ts`, el escenario A del quickstart:
  - El invitado crea una liga de 4 y el sistema rellena con 3 NPC.
  - En cada sobre se comprueba la composición.
  - El participante deja vencer un turno y se le añade la carta de mayor media.
  - Al terminar tiene 24 jugadores y ve las plantillas rivales.

### Implementation for User Story 1

- [X] T042 [P] [US1] Implementar el generador de mesa en `packages/domain/src/sobres/generador.ts`, con `generarMesa(pool, numParticipantes, semilla, parametros) → Sobre[]` (research R16):
  - El `pool` son solo los jugadores de las colecciones de `partida.colecciones` (FR-015).
  - Sortea, para cada sobre, el hueco "POR o DEF" con `probPorteroEnHuecoPorDef` y la carta alta con `probGoatEnAlta`.
  - Asigna el cruce demarcación × nivel por permutación aleatoria, restringida a las combinaciones con cartas disponibles, con un máximo de 500 reintentos por sobre.
  - Extrae las cartas sin reemplazo.
  - Baraja el orden dentro del sobre.
  - Lanza `ErrorPoolInsuficiente` si un sobre no se puede completar.
- [X] T043 [P] [US1] Implementar la entidad Partida en `packages/domain/src/partida/partida.ts`: validación de configuración (modo, número de participantes, `tipoSimulacion`, `ritmo`, `plazoJornadaHoras` por defecto 24, `tiempos` por defecto `{busquedaS:180, turnoDraftS:45, preparacionS:180, preparacionInicialS:300, descansoS:120}`), restricción de invitado (FR-000), `colecciones` (por defecto `['Core']`), máquina de estados de data-model §2.2 (incluido `abandonada` para invitados), `rellenarConNPC(semilla)` y `sortearAsientos(semilla)`.
- [X] T044 [US1] Implementar la máquina de estados de la mesa en `packages/domain/src/draft/mesa.ts`:
  - `crearMesa(participantes, sobres, ahora, turnoS)`.
  - `elegir(mesa, participanteId, jugadorId, ahora)`, con los errores `YA_ELEGIDO`, `CARTA_NO_EN_SOBRE` y `TURNO_CERRADO`.
  - `todosEligieron`.
  - `resolverTurno(mesa, ahora)`: aplica la autoelección a quien falte, rota los sobres según la ronda y abre el siguiente turno o la siguiente ronda.
  - `receptor(asiento, ronda, N)`.
  - `vistaParticipante(mesa, participanteId)`: solo el sobre propio y las elecciones propias.
  - `plantillas(mesa)`.
- [X] T045 [P] [US1] Implementar el NPC básico provisional en `packages/ai/src/basico.ts`: elige la carta de mayor media del sobre, con el mismo criterio de desempate. El servidor lo usa con cualquier nivel hasta la fase US5.
- [X] T046 [P] [US1] Definir los mensajes de sala y draft en `packages/protocol/src/ws/draft.ts`: `sala.actualizada`, `draft.turno`, `draft.progreso`, `draft.eleccion_auto` y `draft.terminado` (servidor → cliente), y `draft.elegir { requestId, ronda, turno, jugadorId }` (cliente → servidor), con los campos exactos de contracts/realtime-protocol.md. Añadir `JugadorResumen`.
- [X] T047 [P] [US1] Definir los esquemas HTTP de partidas en `packages/protocol/src/http/partidas.ts`, con el cuerpo de `POST /api/partidas` y sus respuestas según contracts/http-api.md.
- [X] T048 [US1] Ampliar el esquema de persistencia en `apps/server/src/persistencia/esquema/draft.ts` y generar la migración:
  - Tablas `mesas` (data-model §3.1), `sobres` (`cartas int[8]`, `restantes int[]`) y `elecciones`, con `UNIQUE(mesaId, ronda, turno, participanteId)` y `origen 'manual'|'auto'|'npc'`.
  - Tabla `plantillas`, con `jugadores int[24]`.
  - Repositorios en `apps/server/src/persistencia/repos/draft.ts`.
- [X] T049 [US1] Implementar el actor de sala en `apps/server/src/actores/sala.ts`:
  - Unirse y salir, con difusión de `sala.actualizada`.
  - Temporizador de búsqueda (`busquedaS`) que, al vencer, rellena las plazas con NPC aleatorios entre amateur, intermedio y avanzado.
  - Añadir NPC del anfitrión, admitiendo PRO.
  - `iniciar`: rellena, sortea los asientos con la semilla de la partida, crea 1 mesa (o 2 de 8 si el playoff es de 16) con semillas derivadas, y pasa a `en_draft`.
  - Partidas de invitado: al cerrar la sesión, o tras 10 minutos seguidos sin conexiones WebSocket del invitado (temporizador que se reinicia al reconectar), la partida pasa a `abandonada` y se liberan su actor y sus temporizadores.
- [X] T050 [US1] Implementar el actor de draft en `apps/server/src/actores/draft.ts`:
  - Genera los sobres al empezar, con el pool filtrado por `partida.colecciones`, y los persiste.
  - Envía `draft.turno` a cada participante con su propio sobre y `venceEn`.
  - Procesa `draft.elegir` mediante la mesa del dominio, y persiste antes de anunciar.
  - Difunde `draft.progreso` sin revelar cartas.
  - Los NPC eligen al inicio de cada turno.
  - Al vencer el turno, autoelige por quien falte y envía `draft.eleccion_auto`.
  - Resuelve y rota; mide `turno_draft_resolucion_ms`.
  - Al terminar: guarda las plantillas, envía `draft.terminado` y pasa la partida a `en_torneo` (o espera a la otra mesa en el playoff de 16).
  - Rehidratación tras un reinicio.
- [X] T051 [US1] Implementar las rutas de partidas en `apps/server/src/http/partidas.ts`:
  - `POST /api/partidas`, con las restricciones de invitado.
  - `GET /api/partidas?estado=buscando` (solo registrados).
  - `POST /api/partidas/:id/unirse`, `POST /api/partidas/:id/npc` (`{ nivel }`, solo el anfitrión) y `POST /api/partidas/:id/iniciar`.
  - `GET /api/partidas/:id`.
  - `GET /api/partidas/:id/plantillas`: `409 DRAFT_EN_CURSO` antes de terminar el draft (FR-054a).
- [X] T052 [P] [US1] Crear la pantalla `apps/web/src/pantallas/CrearPartida.tsx`:
  - Formulario con modo, número de participantes (las opciones válidas dependen del modo), tipo de simulación, ritmo (asíncrono desactivado para invitados, con un aviso que invita a registrarse) y NPC con nivel.
  - Envía `POST /api/partidas`.
- [X] T053 [P] [US1] Crear la pantalla `apps/web/src/pantallas/Sala.tsx`: lista de participantes (humano o NPC con su nivel, conectado o no), cuenta atrás de la búsqueda, botones del anfitrión "Añadir NPC" e "Iniciar", y enlace para compartir la partida.
- [X] T054 [US1] Crear la pantalla `apps/web/src/pantallas/Draft.tsx`:
  - Sobre actual con `CartaJugador` y ficha al pulsar.
  - Temporizador sincronizado con `venceEn`.
  - Indicador de ronda, turno y dirección (izquierda o derecha).
  - Confirmar elección.
  - Estado "esperando a N participantes".
  - Panel "mis elecciones" agrupado por demarcación (FR-013).
  - Aviso cuando hay una autoelección.
  - Reconexión transparente.
- [X] T055 [P] [US1] Crear la pantalla `apps/web/src/pantallas/Plantillas.tsx`: la plantilla propia y la de cada rival (24 cartas), visibles tras el draft (FR-054a).

**Checkpoint**: la Historia 1 funciona y se valida sola (escenario A hasta el final del draft).

---

## Phase 4: User Story 2 — Preparar el equipo (Priority: P1)

**Goal**: elegir una formación, colocar 11 titulares y hasta 7 suplentes, configurar la táctica y los lanzadores, ver las penalizaciones por posición y confirmar una alineación válida.

**Independent Test**: con una plantilla de 24 jugadores, probar cada formación, las combinaciones tácticas, las penalizaciones (25 %, 60 %, FR-025a, Todocampista) y los lanzadores; la alineación se acepta o se rechaza según las reglas (quickstart, escenario B).

### Tests for User Story 2 ⚠️

- [X] T056 [P] [US2] Pruebas de stats efectivos en `packages/domain/tests/equipo/statsEfectivos.test.ts`:
  - Jugador en una casilla de su posición: sin penalización.
  - Jugador de campo fuera de posición: −25 %.
  - Jugador de campo en la portería, o portero fuera de ella: −60 %.
  - DCI o DCD en la casilla central de una defensa de 3: sin penalización (FR-025a).
  - Todocampista: sin penalización salvo en la portería.
  - La media efectiva se recalcula correctamente.
- [X] T057 [P] [US2] Pruebas de alineación en `packages/domain/tests/equipo/alineacion.test.ts`:
  - "11 titulares distintos, uno por casilla, y hasta 7 suplentes elegidos entre los 13 jugadores restantes".
  - Un jugador de baja se rechaza (`JUGADOR_NO_DISPONIBLE`).
  - Errores acumulados en `ALINEACION_INVALIDA`.
- [X] T058 [P] [US2] Pruebas de táctica en `packages/domain/tests/equipo/tactica.test.ts`: valores por defecto (`zona`, `medio`, `false`, `equilibrado`, `false`); `lineaAdelantada` "No con `catenaccio`"; `juegoVertical` "No con `combinativo`" (`TACTICA_INCOMPATIBLE`).
- [X] T059 [P] [US2] Pruebas de lanzadores y alineación automática en `packages/domain/tests/equipo/lanzadores.test.ts`:
  - Se propone el titular con el special correspondiente (Lanzador de penalties, Lanzador de faltas, Guante en el pie) o, si no hay, el de mejor valor.
  - La tanda tiene 5 titulares distintos.
  - La alineación automática siempre es válida y minimiza los jugadores fuera de posición.
- [X] T060 [P] [US2] Pruebas de contrato de alineación en `apps/server/tests/contract/alineacion.test.ts`: `GET` / `POST previsualizar` / `PUT /api/partidas/:id/alineacion` con los errores `422 ALINEACION_INVALIDA`, `TACTICA_INCOMPATIBLE` y `JUGADOR_NO_DISPONIBLE`. No existe ninguna ruta que devuelva la alineación de un rival (FR-054a).
- [X] T061 [P] [US2] Prueba de principio a fin `apps/web/tests/e2e/alineacion.spec.ts`, el escenario B del quickstart: un 3-5-2 con un DCI en el centro sin penalización; un medio en esa casilla con −25 %; un defensa en la portería con −60 % y aviso; Catenaccio bloquea Línea adelantada; lanzadores propuestos y editables; confirmar.

### Implementation for User Story 2

- [X] T062 [P] [US2] Implementar `statsEfectivos(jugador, casilla, contexto, parametros)` en `packages/domain/src/equipo/statsEfectivos.ts`. Aplica la penalización por posición según `posicionesAdmitidas` de la casilla (FR-025a, FR-027, excepción de Todocampista) y devuelve los stats, la media efectiva y `fueraDePosicion`. Reexportarla desde `packages/engine/src/index.ts`, porque forma parte del contrato del motor.
- [X] T063 [P] [US2] Implementar la táctica en `packages/domain/src/equipo/tactica.ts`: tipo `Tactica` (data-model §4.2), `tacticaPorDefecto()` y `validarTactica(t)` con las incompatibilidades.
- [X] T064 [US2] Implementar la alineación en `packages/domain/src/equipo/alineacion.ts`: tipo `Alineacion` (data-model §4.1, con `version`), `validarAlineacion(alineacion, plantilla, bajasActivas)` y `previsualizar(alineacion)`, que calcula los stats efectivos de cada casilla y marca los jugadores fuera de posición.
- [X] T065 [US2] Implementar los lanzadores en `packages/domain/src/equipo/lanzadores.ts`:
  - `proponerLanzadores(titulares)`: penaltis, faltas, córners y tanda de 5 (FR-029a).
  - `lanzadorEfectivo(designado, enCampo, tipo)`: si el designado no está, el siguiente mejor.
- [X] T066 [US2] Implementar la alineación automática en `packages/domain/src/equipo/autoAlineacion.ts`, con `autoAlineacion(plantilla, bajasActivas, parametros)`. Prueba las 10 formaciones, asigna por el máximo de medias efectivas (asignación voraz con mejora local) priorizando un POR en la portería, elige 7 suplentes que cubran las demarcaciones y propone los lanzadores (FR-031).
- [X] T067 [P] [US2] Definir los esquemas HTTP de alineación en `packages/protocol/src/http/alineacion.ts`: cuerpo de `PUT` según contracts/http-api.md y respuesta con los stats efectivos por casilla.
- [X] T068 [P] [US2] Pruebas de dorsales y equipaciones en `packages/domain/tests/equipo/dorsales.test.ts`:
  - La asignación inicial da POR → 1, LD y CD → 2, LI y CI → 3, DCD → 4, DCI → 5, MD → 6, MC/MII/MID → 8, MCO → 10, EI → 7, DC → 9 y ED → 11.
  - Si dos casillas comparten dorsal fijo (dos MC, o MII y MID), lo recibe la primera en el orden de la formación (de atrás adelante y de derecha a izquierda), y las demás reciben uno aleatorio libre.
  - El central del medio de una defensa de 3 o 5, el SD y los suplentes reciben un dorsal aleatorio libre.
  - Los 24 jugadores tienen dorsal único entre 1 y 99.
  - La misma semilla da la misma asignación.
  - Cambiar la alineación después no reasigna.
  - Una edición con un dorsal repetido devuelve `DORSAL_REPETIDO`, y uno fuera de 1–99, `DORSAL_FUERA_DE_RANGO`.
  - Equipaciones aleatorias con primera ≠ segunda.
  - `equipacionEnPartido`: el local usa la primera; el visitante usa la segunda solo si su primera se confunde con la del local.
- [X] T069 [P] [US2] Implementar los dorsales en `packages/domain/src/equipo/dorsales.ts`:
  - `asignarDorsalesIniciales(plantilla, titulares, semilla)`, con la tabla de FR-031a (incluidos CD → 2 y CI → 3), la regla de "primera casilla en el orden de la formación" para los dorsales compartidos, y aleatorios libres para el resto.
  - `editarDorsales(dorsales, cambios)`: valida unicidad y rango.
- [X] T070 [P] [US2] Implementar las equipaciones en `packages/domain/src/equipo/equipaciones.ts`: `equipacionesAleatorias(semilla)`, `validarEquipaciones` y `equipacionEnPartido(local, visitante, parametros)` (distancia de color con el umbral de los parámetros).
- [X] T071 [US2] Añadir la tabla `alineaciones` en `apps/server/src/persistencia/esquema/equipo.ts` (versionada, `titulares jsonb`, `suplentes int[]`, `tactica jsonb`, `lanzadores jsonb`, `confirmadaEn`). Añadir también las columnas `plantillas.dorsales jsonb` (null hasta la primera alineación) y `participantes.equipaciones jsonb`, con sus repositorios y la migración.
- [X] T072 [US2] Implementar las rutas de alineación en `apps/server/src/http/alineacion.ts`: `GET /api/partidas/:id/alineacion` (la vigente o una automática, con stats efectivos y lanzadores propuestos), `POST .../alineacion/previsualizar` y `PUT .../alineacion` (valida con el dominio y crea una versión nueva; si `plantillas.dorsales` es null, asigna los dorsales iniciales). Añadir `PUT /api/partidas/:id/dorsales` (`422 DORSAL_REPETIDO` y `DORSAL_FUERA_DE_RANGO`; `409 PARTIDO_EN_CURSO`) y `PUT /api/partidas/:id/equipaciones` (`422 COLOR_INVALIDO` y `EQUIPACIONES_IGUALES`). Al terminar el draft, el actor asigna las equipaciones aleatorias.
- [X] T073 [US2] Crear la pantalla `apps/web/src/pantallas/Alineacion.tsx` con sus componentes `apps/web/src/componentes/CampoAlineacion.tsx` y `PanelTactica.tsx`:
  - Selector de las 10 formaciones.
  - Campo con 11 casillas y su código de posición.
  - Arrastrar y soltar desde la plantilla.
  - Stats y media efectivos por casilla, previsualizados en el servidor.
  - Distintivo visual "fuera de posición" y aviso al poner a un jugador de campo en la portería.
  - Banquillo de hasta 7.
  - Panel de táctica con radios y casillas, que deshabilita las opciones incompatibles.
  - Panel de lanzadores con orden de la tanda.
  - Dorsal visible en cada jugador y editor de dorsales con validación de unicidad.
  - Editor de la primera y la segunda equipación (selector de color principal y secundario, con vista previa de la chapa).
  - Botón "Confirmar".

**Checkpoint**: las Historias 1 y 2 funcionan; tras el draft se prepara y se confirma una alineación válida.

---

## Phase 5: User Story 3 — Jugar un partido en simulación rápida (Priority: P1)

**Goal**: un motor único y determinista simula el partido. La simulación rápida muestra el descanso, admite cambios, sincroniza el "Seguir" y muestra el final, con prórroga y penaltis en eliminatoria.

**Independent Test**: dos equipos preparados juegan; se ven el descanso y sus eventos, los cambios afectan a la segunda parte y se muestra el final (quickstart, escenario C). Además, la herramienta `balance` cumple SC-004 a SC-007.

### Tests for User Story 3 ⚠️

- [X] T074 [P] [US3] Prueba de determinismo del motor en `packages/engine/tests/determinismo.test.ts`: `avanzar(crearPartido(e), 'final')` da eventos y marcador idénticos para la misma entrada (100 semillas). Encadenar `'parte'` con decisiones da el mismo resultado que reproducir las decisiones registradas (FR-040).
- [X] T075 [P] [US3] Pruebas de reglas del motor en `packages/engine/tests/reglas.test.ts`:
  - Como máximo "5 sustituciones por partido (más 1 adicional si hay prórroga)"; un sustituido no vuelve.
  - Un expulsado no vuelve.
  - Menos de 7 jugadores: derrota 3-0, o se mantiene el resultado si era peor.
  - Si expulsan al portero sin cambios, un jugador de campo pasa a la portería con −60 %.
  - El cansancio empieza en el minuto 65, o en el 55 con Presión alta.
  - Incansable y Motivador ralentizan el cansancio.
  - Specials de equipo sin acumulación (dos Capitanía siguen dando +1).
  - Fortaleza mental solo actúa yendo por detrás.
  - Santo solo hace reroll a partir del minuto 80, en la prórroga, o en eliminatoria yendo ganando o empatado; en liga, antes del minuto 80, no actúa.
  - En liga, el empate termina a los 90 minutos; en eliminatoria hay prórroga de 2 × 15 y penaltis.
- [X] T076 [P] [US3] Pruebas de la tanda de penaltis en `packages/engine/tests/penaltis.test.ts`: 5 lanzamientos por equipo y muerte súbita; el orden respeta `lanzadores.tanda`; solo lanzan jugadores que estaban en el campo al final; Parapenalties y Lanzador de penalties modifican la probabilidad.
- [X] T077 [P] [US3] Pruebas de eventos y estadísticas en `packages/engine/tests/eventos.test.ts`: los goles llevan autor y, si hay, asistente; los eventos `relevante` incluyen goles, tarjetas, ocasiones claras y lesiones; las estadísticas incluyen posesión, tiros, tiros a puerta, córners, faltas y tarjetas (FR-047).
- [X] T078 [P] [US3] Comprobaciones estadísticas en `tools/balance/src/checks/partido.ts`, con semillas fijas:
  - SC-004: +5 de media → el mejor gana ≥ 60 % y el peor ≥ 10 %.
  - SC-005: posiciones naturales frente a 3 fuera de posición → ≥ 65 %.
  - SC-006, **con dirección**:
    - Goles a favor y en contra crecientes con la ofensividad: 3-4-3 > 4-4-2 > 5-4-1 en ambos.
    - Presión alta: más recuperaciones en campo rival y más cansancio que Bloque medio.
    - Catenaccio: menos posesión en campo rival y menos goles en contra que Bloque medio.
    - Línea adelantada: más fueras de juego provocados.
    - Contraataque: menos posesión; Juego combinativo: más.
  - SC-007: 2,0–3,5 goles por partido y menos de 2 % de partidos con 8 o más goles.
  - SC-015: Robusto reduce las lesiones un 30 % o más.
  - `pnpm balance --n 1000` falla si alguna comprobación no se cumple.
- [X] T079 [P] [US3] Pruebas de integración del partido rápido en `apps/server/tests/integration/partido-rapido.test.ts`:
  - `partido.inicio` revela las dos alineaciones solo al empezar.
  - El primer `partido.tramo` llega en ≤ 3 s (SC-009).
  - `partido.pausa_decision` en el descanso.
  - Una decisión en el descanso se aplica a la segunda parte.
  - Entre dos humanos, si solo uno pulsa `partido.seguir`, el partido espera hasta que pulse el otro o venza `descansoS`.
  - Contra un NPC, avanza cuando pulsa el humano.
  - En eliminatoria con empate, `pre_prorroga` y después la tanda.
  - Sin alineación confirmada, se usa la última válida o la automática.
- [X] T080 [P] [US3] Prueba de principio a fin `apps/web/tests/e2e/partido-rapido.spec.ts`, el escenario C del quickstart.

### Implementation for User Story 3

- [X] T081 [US3] Definir el estado del motor en `packages/engine/src/estado/estado.ts`:
  - `EstadoMotor`: tick (1 tick = 1 segundo de juego; 5.400 en 90 minutos; la prórroga continúa a partir de 5.400), fase, posesión, zona del balón en una rejilla del campo y posiciones aproximadas de los 22 jugadores.
  - Jugadores en el campo y en el banquillo, sustituciones usadas, tarjetas, cansancio por jugador, marcador, estadísticas, cola de decisiones y estado del PRNG.
  - `crearPartido(entrada)`, según contracts/engine-api.md.
- [X] T082 [P] [US3] Implementar el duelo de stats en `packages/engine/src/acciones/duelo.ts`: probabilidad = logística(stat atacante efectivo − stat defensor efectivo, pendiente según los parámetros) + modificadores, en milésimas enteras; `reroll` resuelve dos veces y se queda con el mejor (Filigranas, Muro defensivo, Guante en el pie, Santo).
- [X] T083 [P] [US3] Implementar los modificadores en `packages/engine/src/modificadores/`:
  - `posicion.ts`: usa `statsEfectivos`.
  - `cansancio.ts`: inicio en el minuto 65 o 55, degradación progresiva y factores de Incansable y Motivador.
  - `formacion.ts`: la ofensividad sube o baja **a la vez** las ocasiones propias (más jugadores en ataque, más llegadas) y las concedidas (más espacios a la espalda, peores transiciones defensivas). La amplitud cambia la zona de las acciones, por bandas o por dentro (FR-034).
  - `tactica.ts`: efectos de cada opción sobre la frecuencia de acciones, recuperaciones, fueras de juego provocados, ritmo de cansancio y tipo de ataque (FR-035).
- [X] T084 [US3] Implementar los specials en `packages/engine/src/modificadores/specials.ts`, una función por special que indica qué tipo de acción o fase modifica y en qué medida (FR-037):
  - Efectos cuantificados: Capitanía +1 a todos los compañeros; Fortaleza mental +2 yendo por detrás; Intimidante −1 al rival más cercano; Infranqueable +2 a tackling y marcaje frente a regate ≥ 95; Jerarquía +1 a la defensa; Líbero +2 al centro del campo; Box-to-Box +1 a defensa y ataque.
  - Rerolls: Filigranas, Muro defensivo, Guante en el pie y Santo. Santo solo actúa a partir del minuto 80, durante toda la prórroga, y en eliminatorias mientras su equipo va ganando o empatando.
  - El resto, según su descripción: Aura, Elegante, Presionador, Recuperador tras pérdida, Carismático, Potente, Robusto, Lanzador de faltas, Lanzador de penalties, Parapenalties, One-to-One, Ordenabarreras, Jugador de campo, Volador, Primer toque, Jugador entre líneas, Llegador, Matador, Rematador, Cabeceador, Desbordante.
  - Los specials de equipo no se acumulan (FR-038). Las magnitudes no cuantificadas salen de los parámetros.
- [X] T085 [US3] Implementar las acciones con balón en `packages/engine/src/acciones/juego.ts` (salida de balón, pase, conducción, regate, entrada, intercepción, centro, remate, parada, despeje), y elegir la acción de cada tick según la zona, la formación, la táctica y los jugadores implicados (FR-033).
- [X] T086 [US3] Implementar las acciones a balón parado y disciplinarias en `packages/engine/src/acciones/balonParado.ts`: falta, amarilla y roja (incluida la doble amarilla), fuera de juego, córner, falta directa y penalti, con los lanzadores designados y `lanzadorEfectivo`. Implementar las lesiones en `packages/engine/src/acciones/lesiones.ts`: probabilidad con la reducción de Robusto y gravedad con el reparto de los parámetros (2 % de larga duración).
- [X] T087 [US3] Implementar los tramos y las decisiones en `packages/engine/src/tramos/avanzar.ts` y `packages/engine/src/tramos/decisiones.ts`:
  - `avanzar(estado, 'parte' | 'final')`: hasta el descanso, el final, `pre_prorroga` o la tanda.
  - `aplicarDecision(estado, d)`: valida sustituciones (máximo 5, o 6 en prórroga; un jugador sustituido no vuelve), formación, táctica, lanzadores y recolocación, y las encola para el inicio del siguiente tramo.
  - Regla de los 7 jugadores.
  - Marca `relevante` en los eventos.
  - El modo `'interrupcion'` se añade en la fase US6.
- [X] T088 [P] [US3] Implementar la tanda de penaltis en `packages/engine/src/penaltis/tanda.ts`: orden según los lanzadores designados que siguen en el campo, 5 lanzamientos más muerte súbita y eventos `tanda_lanzamiento`.
- [X] T089 [US3] Completar la API pública en `packages/engine/src/index.ts`: `crearPartido`, `avanzar`, `aplicarDecision` y `statsEfectivos`, con los tipos `EntradaPartido`, `ResultadoTramo`, `EventoPartido` y `DecisionPartido` de contracts/engine-api.md.
- [X] T090 [US3] Implementar la simulación por series en `tools/balance/src/series.ts`: genera equipos de prueba desde `data/core.json`, ejecuta N partidos con semillas `seed+i` y agrega las estadísticas. Conectarla en `tools/balance/src/cli.ts` para ejecutar las comprobaciones de partido.
- [X] T091 [US3] Implementar el emparejamiento provisional de la primera jornada en `packages/domain/src/torneo/emparejamientoInicial.ts`, con un partido por pareja de asientos. Así se puede jugar un partido tras el draft; la fase US4 lo sustituye por los calendarios completos.
- [X] T092 [P] [US3] Definir los mensajes de partido en `packages/protocol/src/ws/partido.ts`: `preparacion.inicio`, `partido.inicio`, `partido.tramo`, `partido.pausa_decision`, `partido.decision_aplicada` y `partido.fin` (servidor → cliente), y `partido.seguir` y `partido.decision` (cliente → servidor), según contracts/realtime-protocol.md.
- [X] T093 [US3] Añadir la tabla `partidos` en `apps/server/src/persistencia/esquema/partido.ts`, con los campos de data-model §6.1: `semilla`, `versionParametros`, `alineacionesIniciales jsonb`, `decisiones jsonb`, `eventos jsonb`, `estadisticas jsonb`, `marcador jsonb`, `estado`, `eliminatoria` y `resueltoAutomaticamente`. Crear también su repositorio y su migración.
- [X] T094 [US3] Implementar el actor de preparación en `apps/server/src/actores/preparacion.ts`: envía `preparacion.inicio { partidoId, rival: { id, nombre, bajas }, venceEn }` con `preparacionInicialS` antes del primer partido y `preparacionS` después. Al vencer, fija para cada participante la última alineación válida o la automática; los NPC usan la automática por ahora.
- [X] T095 [US3] Implementar el actor de partido en modalidad rápida en `apps/server/src/actores/partido.ts`:
  - `partido.inicio`, con la revelación de las alineaciones, los dorsales y la equipación de cada equipo, calculada con `equipacionEnPartido`.
  - `avanzar('parte')` y `partido.tramo` con los eventos relevantes.
  - `partido.pausa_decision` con temporizador `descansoS` y lista de "listos".
  - `partido.decision` y `partido.seguir`, con `partido.decision_aplicada`.
  - `partido.fin`.
  - NPC contra NPC con `avanzar('final')` sin pausas.
  - Persistir decisiones y eventos antes de anunciar, y aumentar `partidos_simulados_total`.
- [X] T096 [P] [US3] Implementar la ruta `GET /api/partidos/:id` en `apps/server/src/http/partidos.ts`: resumen con marcador, eventos relevantes y estadísticas. Las alineaciones solo se devuelven si el partido ya empezó.
- [X] T097 [US3] Crear la pantalla `apps/web/src/pantallas/PartidoRapido.tsx` con sus componentes `apps/web/src/componentes/ResumenEventos.tsx`, `PanelCambios.tsx` y `Estadisticas.tsx`:
  - Marcador al descanso y lista de eventos con su minuto (`45+2'`).
  - Panel de sustituciones, formación, táctica y lanzadores, que valida contra el dominio.
  - Botón "Seguir" con el estado "esperando al rival" y la cuenta atrás.
  - Resumen final, con prórroga y tanda lanzamiento a lanzamiento.
  - Estadísticas.

**Checkpoint**: MVP del ciclo central (draft → alineación → partido rápido) completo y validable por separado. `pnpm balance --n 1000` cumple SC-004 a SC-007 y SC-015.

---

## Phase 6: User Story 4 — Competir en un torneo: liga, playoff o mixto (Priority: P2)

**Goal**: calendarios, cuadros, clasificación, bajas (rojas, acumulación de amarillas, lesiones de 1/2/3/5 partidos), ritmo en directo o asíncrono con plazos y avisos, y abandono.

**Independent Test**: una liga de 4 (1 humano + 3 NPC) con 12 partidos y clasificación final, un playoff de 4 con semifinales y final, y una liga asíncrona con plazos simulados (quickstart, escenario E).

### Tests for User Story 4 ⚠️

- [X] T098 [P] [US4] Pruebas del calendario en `packages/domain/tests/torneo/calendario.test.ts`:
  - Liga de N = 4..8: 2 × (N − 1) partidos por participante, ida y vuelta, y con N impar un equipo descansa en cada jornada.
  - SC-012: liga de 4 = 12 partidos, de 8 = 56, playoff de 16 = 15, mixto = 59.
- [X] T099 [P] [US4] Pruebas del cuadro en `packages/domain/tests/torneo/cuadro.test.ts`: sorteo de la primera ronda reproducible con semilla; con 16, los octavos enfrentan siempre a participantes de mesas distintas; en el mixto, 1.º contra 4.º y 2.º contra 3.º; partido único y final.
- [X] T100 [P] [US4] Pruebas de la clasificación en `packages/domain/tests/torneo/clasificacion.test.ts`: puntos 3/1/0; desempate por puntos, diferencia de goles, goles a favor, enfrentamiento directo (puntos y después diferencia de goles entre los empatados) y sorteo con semilla.
- [X] T101 [P] [US4] Pruebas de bajas y amarillas en `packages/domain/tests/torneo/bajas.test.ts` (SC-014):
  - Una roja (directa o por doble amarilla) = 1 partido.
  - Lesiones leve, media, grave y larga = 1, 2, 3 y 5 partidos.
  - `partidosRestantes` baja en 1 en cada partido que juega su equipo.
  - Tres amarillas acumuladas en liga = 1 partido y el contador vuelve a 0.
  - Las dos amarillas de una expulsión por doble amarilla no suman.
  - En eliminatoria no se acumulan.
  - Al pasar del mixto a la eliminatoria, los contadores vuelven a 0 y las bajas activas se mantienen.
  - Al terminar el torneo, desaparecen todas las bajas.
  - La alineación automática sustituye a un jugador de baja por el suplente disponible más adecuado.
- [X] T102 [P] [US4] Pruebas de integración del torneo en directo en `apps/server/tests/integration/torneo-directo.test.ts`:
  - Una liga de 4 con 1 humano completa sus 6 jornadas, cada una tras el tiempo de preparación.
  - Los partidos NPC contra NPC se resuelven sin intervención y en < 10 s.
  - Un mixto pasa de la liga a las semifinales.
  - Se aplica el abandono (pasa a NPC intermedio).
  - Si un equipo tiene menos de 7 jugadores disponibles, pierde 3-0.
  - Un humano que se desconecta a mitad de un partido rápido no lo detiene: su descanso vence sin cambios y, al reconectar, recibe el estado completo (SC-011).
- [X] T103 [P] [US4] Pruebas de integración del torneo asíncrono en `apps/server/tests/integration/torneo-asincrono.test.ts`, con `RelojFalso`:
  - La jornada se abre con un plazo de 24 h.
  - `POST /api/partidos/:id/listo` de ambos humanos inicia el partido.
  - Al vencer el plazo, el partido se simula automáticamente (`resueltoAutomaticamente`, sin descanso interactivo) y se abre la siguiente jornada.
  - Avisos `jornada_abierta`, `rival_listo` y `plazo_proximo` (2 h antes), en la aplicación y por correo en Mailpit.
  - Un humano que nunca se conecta no bloquea el torneo (SC-016).
  - El draft de una partida asíncrona se juega igualmente en directo, con turnos de 45 s (FR-056c).
- [X] T104 [P] [US4] Prueba de principio a fin `apps/web/tests/e2e/torneo.spec.ts`: liga de 4 en directo con clasificación, calendario y campeón, y bajas visibles en la alineación (partes del escenario E del quickstart que no dependen del correo).

### Implementation for User Story 4

- [X] T105 [US4] Implementar el calendario de liga en `packages/domain/src/torneo/calendario.ts`, con `calendarioLiga(participantes, semilla)`: método del círculo, vuelta en espejo y descanso con N impar. Elimina `emparejamientoInicial.ts` y sustituye sus usos.
- [X] T106 [P] [US4] Implementar el cuadro del playoff en `packages/domain/src/torneo/cuadro.ts`: `cuadroPlayoff(participantes, mesas, semilla)` para 4, 8 o 16 (octavos entre mesas distintas), `cuadroMixto(clasificacion)` (1.º–4.º y 2.º–3.º) y `avanzarCuadro(cuadro, resultado)`.
- [X] T107 [P] [US4] Implementar la clasificación en `packages/domain/src/torneo/clasificacion.ts`: `pj, g, e, p, gf, gc, dg, pts` y el orden de desempate de FR-051.
- [X] T108 [US4] Implementar las bajas y las amarillas en `packages/domain/src/torneo/bajas.ts`:
  - `aplicarConsecuencias(estadoTorneo, eventosPartido, fase)`: crea las `Baja` (motivo `'roja'|'acumulacion_amarillas'|'lesion'`, `gravedad` `'leve'|'media'|'grave'|'larga'`) y actualiza el `ContadorAmarillas` (0..2).
  - `avanzarBajas(equipoQueJugo)`.
  - `bajasActivas(participante)`.
  - `transicionAEliminatoria()`.
- [X] T109 [US4] Implementar el estado del torneo en `packages/domain/src/torneo/torneo.ts`: fases `liga` y `eliminatoria`, jornadas (`pendiente`, `abierta`, `cerrada`; tipo `liga`, `octavos`, `cuartos`, `semifinal` o `final`), registro de resultados, cierre de jornada, apertura de la siguiente y campeón. Integrar `bajasActivas` en `validarAlineacion` y en `autoAlineacion`.
- [X] T110 [US4] Añadir las tablas `torneos`, `jornadas` (`abreEn`, `venceEn`, `estado`), `bajas`, `contadores_amarillas` y `avisos` (data-model §5 y §7) en `apps/server/src/persistencia/esquema/torneo.ts`, con sus repositorios y su migración.
- [X] T111 [US4] Programar los plazos de jornada (*desviación: sin pg-boss, ver research R6*): temporizadores `plazo:<n>` (resuelve automáticamente los partidos pendientes) y `aviso-plazo:<n>` (2 h antes) en `apps/server/src/actores/torneo.ts`, con el `Reloj` inyectable, `vence_en` persistido en `jornadas`, reprogramados al rehidratar y sin efecto si se repiten.
- [X] T112 [US4] Implementar el servicio de avisos en `apps/server/src/avisos/servicio.ts`: guarda el aviso, lo envía en vivo con el mensaje `aviso` si el usuario está conectado y manda correo con nodemailer (`SMTP_URL`) a los registrados. Tipos: `jornada_abierta`, `rival_listo`, `plazo_proximo`, `partido_auto_resuelto` y `torneo_terminado`.
- [X] T113 [US4] Implementar el actor de torneo en `apps/server/src/actores/torneo.ts`:
  - Al terminar el draft, genera el calendario o el cuadro.
  - Ritmo **directo**: encadena preparación → partidos de la jornada (NPC contra NPC con `'final'`) → cierre → siguiente.
  - Ritmo **asíncrono**: abre la jornada con `venceEn`, inicia un partido cuando ambos humanos están `listo` o cuando el humano lo inicia contra un NPC, y al vencer el plazo resuelve con `'final'` y las últimas alineaciones.
  - Aplica las consecuencias tras cada partido, emite `torneo.actualizado` y pasa el mixto a la eliminatoria.
  - Abandono: pasa al participante a `controladoPorNPC` con nivel intermedio.
- [X] T114 [US4] Implementar las rutas del torneo en `apps/server/src/http/torneo.ts`: `GET /api/partidas/:id/torneo`, `POST /api/partidos/:id/listo`, `POST /api/partidas/:id/abandonar`, `GET /api/avisos?noLeidos=true` y `POST /api/avisos/:id/leido`. Añadir las bajas activas a `GET .../plantillas` y a `GET .../alineacion`.
- [X] T115 [P] [US4] Definir el mensaje `torneo.actualizado` y el mensaje `aviso` en `packages/protocol/src/ws/torneo.ts`.
- [X] T116 [P] [US4] Crear la pantalla `apps/web/src/pantallas/Torneo.tsx`: pestañas de clasificación (liga), cuadro (playoff y fase final del mixto), calendario con resultados y enlace al resumen de cada partido, jornada actual con su plazo y botón "Estoy listo" en asíncrono, y campeón al final.
- [X] T117 [P] [US4] Crear la bandeja de avisos `apps/web/src/componentes/BandejaAvisos.tsx` y mostrar las bajas en `Alineacion.tsx` y en `Plantillas.tsx`, con distintivo de lesionado o sancionado y partidos restantes, sin permitir alinear a esos jugadores.
- [X] T118 [P] [US4] Crear las semillas reproducibles de `tools/fixtures/escenarios/`: `roja.json`, `tres-amarillas.json`, `lesion-grave.json`, `lesion-larga.json` y `empate-eliminatoria.json`. Cada una es una entrada de partido con su semilla que provoca ese evento, y las usa el escenario E del quickstart. Se generan con `tools/fixtures/src/generarEscenarios.ts` (script `pnpm --filter @fbd/fixtures generar-escenarios`, por lo que `@fbd/fixtures` depende también de `@fbd/engine` con `workspace:*`) y se regeneran si cambian los parámetros del motor.

**Checkpoint**: las Historias 1 a 4 funcionan; se puede jugar un torneo completo en directo o asíncrono.

---

## Phase 7: User Story 5 — Rellenar la partida con NPC (Priority: P2)

**Goal**: NPC de cuatro niveles (amateur, intermedio, avanzado y PRO) con calidad de decisión creciente en draft, alineación, táctica y cambios; PRO solo a elección del anfitrión.

**Independent Test**: partida de 1 humano y 7 NPC; los NPC eligen siempre a tiempo, alinean equipos válidos y su nivel coincide con la configuración; en series de torneos, PRO ≥ 80 % y avanzado ≥ 65 % por delante de amateur (SC-010).

### Tests for User Story 5 ⚠️

- [X] T119 [P] [US5] Pruebas del evaluador en `packages/ai/tests/evaluador.test.ts`:
  - Una carta que cubre una posición que falta puntúa más que otra de media similar que no la cubre.
  - Con 0 porteros en la plantilla, la escasez de porteros sube el valor de un POR.
  - La sinergia de specials puntúa.
- [X] T120 [P] [US5] Pruebas de niveles en `packages/ai/tests/niveles.test.ts`: con los mismos datos, el PRO es determinista (sin ruido) y elige el máximo del evaluador; en cualquier nivel, la alineación siempre es válida (11 titulares, un portero en la portería y formación permitida) y la decisión llega antes del límite de tiempo.
- [X] T121 [P] [US5] Comprobación SC-010 en `tools/balance/src/checks/npc.ts`: `pnpm balance --torneos 100 --pro-vs-amateur` comprueba que el PRO termina por delante del amateur en ≥ 80 % de los torneos y el avanzado en ≥ 65 %.
- [X] T122 [P] [US5] Pruebas de integración del relleno en `apps/server/tests/integration/npc.test.ts`: el relleno automático nunca asigna PRO; `POST /api/partidas/:id/npc { nivel: 'PRO' }` solo lo puede hacer el anfitrión; una partida de 1 humano y 7 NPC completa draft y torneo con todos los NPC eligiendo a tiempo.

### Implementation for User Story 5

- [X] T123 [P] [US5] Implementar el evaluador común en `packages/ai/src/evaluador.ts` (research R9). Calcula la fuerza esperada de una plantilla o alineación a partir de:
  - la media efectiva en la mejor casilla;
  - la cobertura de posiciones para las formaciones viables;
  - la escasez de porteros;
  - la sinergia de specials.
- [X] T124 [P] [US5] Definir los perfiles de nivel en `packages/ai/src/perfiles.ts`, con ruido y alcance:
  - amateur: mucho ruido, solo la media;
  - intermedio: ruido moderado y cobertura básica;
  - avanzado: poco ruido y una formación objetivo;
  - PRO: sin ruido, las 10 formaciones y anticipación de los sobres siguientes.

  El ruido se genera con el PRNG con semilla.
- [X] T125 [US5] Implementar las decisiones de draft en `packages/ai/src/draft.ts`, con `elegirCarta(nivel, sobre, plantillaParcial, ronda, turno, semilla)`, que sustituye a `basico.ts` en el servidor.
- [X] T126 [US5] Implementar las decisiones de alineación y táctica en `packages/ai/src/alineacion.ts`, con `decidirAlineacion(nivel, plantilla, bajas, rivalPlantilla, semilla)`. El PRO evalúa candidatas con `packages/ai/src/pro/simulacionPrueba.ts`: 20 partidos rápidos por candidata contra la plantilla visible del rival, con un límite de 2 s.
- [X] T127 [US5] Implementar las decisiones durante el partido en `packages/ai/src/partido.ts`: sustituciones por cansancio, lesión o tarjeta, y cambios tácticos según marcador y minuto, más agresivos cuanto mayor es el nivel, respetando FR-042.
- [X] T128 [US5] Conectar los NPC por nivel en los actores `apps/server/src/actores/draft.ts`, `preparacion.ts`, `partido.ts` y `torneo.ts`: draft, alineación antes de cada partido, decisiones en cada punto de decisión, y el NPC intermedio que sustituye a un humano que abandona.
- [X] T129 [P] [US5] Mostrar y elegir el nivel de los NPC en `apps/web/src/pantallas/CrearPartida.tsx` y `Sala.tsx`: solo el anfitrión ve PRO, y cada NPC muestra su nivel en sala, plantillas y torneo.

**Checkpoint**: las Historias 1 a 5 funcionan; SC-010 se cumple.

---

## Phase 8: User Story 6 — Ver el partido en simulación 2D (Priority: P3)

**Goal**: vista "de chapas" en tiempo real a x2, x4, x8, x16 o x32, con cambios en cualquier momento aplicados en la siguiente interrupción, usando el mismo motor que la rápida.

**Independent Test**: reproducir un partido en 2D, cambiar la velocidad, pedir una sustitución en juego y comprobar que se aplica en la siguiente interrupción y que el resultado coincide con la modalidad rápida en las mismas condiciones (quickstart, escenario D).

### Tests for User Story 6 ⚠️

- [X] T130 [P] [US6] Prueba de equivalencia entre modalidades en `packages/engine/tests/equivalencia.test.ts` (SC-008, ejecutada por `pnpm test:equivalence`). Con 200 semillas y secuencias de decisiones con el mismo `aplicadaEnTick`:
  - encadenar `avanzar('interrupcion')` y encadenar `avanzar('parte')` producen la misma lista de eventos y el mismo marcador;
  - pedir fotogramas no altera el resultado.
- [X] T131 [P] [US6] Pruebas de integración del partido 2D en `apps/server/tests/integration/partido-2d.test.ts`:
  - Con dos humanos a x32 y x4, `partido.velocidad` efectiva = x4.
  - El servidor no simula el siguiente tramo hasta que todos los `partido.reproduccion` alcanzan la interrupción.
  - Una sustitución solicitada con el balón en juego se aplica en la siguiente interrupción y ambos reciben `partido.decision_aplicada`.
  - Tras una reconexión, `estado` trae los tramos ya simulados.
  - Si un humano se desconecta, a los 10 s el servidor deja de esperar su reloj de reproducción y el partido continúa al ritmo del otro (SC-011).
- [X] T132 [P] [US6] Prueba de principio a fin `apps/web/tests/e2e/partido-2d.spec.ts`, el escenario D del quickstart, con dos contextos de navegador y cuentas registradas.

### Implementation for User Story 6

- [X] T133 [US6] Añadir el modo `'interrupcion'` en `packages/engine/src/tramos/avanzar.ts`: avanza hasta la siguiente interrupción del juego (falta, fuera de banda, saque de puerta, córner, gol, descanso…) y aplica allí las decisiones encoladas, con exactamente la misma secuencia de PRNG que el modo `'parte'`.
- [X] T134 [US6] Implementar los fotogramas en `packages/engine/src/tramos/fotogramas.ts`: un fotograma por segundo de juego `{ tick, balon: [x, y], j: { [jugadorId]: [x, y] } }`, con coordenadas 0–1000 × 0–640, calculadas a partir de la rejilla del estado sin consumir números del PRNG del partido.
- [X] T135 [P] [US6] Definir los mensajes 2D en `packages/protocol/src/ws/partido2d.ts`: `partido.velocidad` (servidor → cliente, `{ velocidadEfectiva: 2|4|8|16|32 }`), `partido.velocidad { partidoId, velocidad }` y `partido.reproduccion { partidoId, tick }` (cliente → servidor), y `fotogramas` en `partido.tramo`.
- [X] T136 [US6] Implementar el flujo 2D en `apps/server/src/actores/partido.ts`:
  - Simula con `'interrupcion'` y fotogramas.
  - Envía cada `partido.tramo`.
  - Registra el reloj de reproducción de cada humano y solo simula el siguiente tramo cuando el más lento llega a la interrupción (research R11).
  - Calcula y difunde la velocidad efectiva (la mínima).
  - Acepta decisiones en cualquier momento y las aplica en la siguiente interrupción.
  - Contra un NPC, avanza al ritmo del humano.
  - Si un humano lleva 10 s desconectado, se ignora su reloj de reproducción hasta que reconecte.
- [X] T137 [P] [US6] Implementar el renderizador en `apps/web/src/campo2d/`:
  - `renderizador.ts`: Canvas 2D con el campo, círculos con los colores de la equipación que usa cada equipo en el partido (de `partido.inicio.equipaciones`), con el dorsal dentro y el nombre debajo, balón, marcador y minuto.
  - `interpolacion.ts`: interpolación lineal entre fotogramas a 60 fps.
  - `relojReproduccion.ts`: avanza según la velocidad efectiva y envía `partido.reproduccion` cada ~500 ms.
- [X] T138 [US6] Crear la pantalla `apps/web/src/pantallas/Partido2D.tsx`: el lienzo del campo, los botones x2, x4, x8, x16 y x32 (indicando la velocidad efectiva si otro humano va más lento), `PanelCambios` con el estado "pendiente hasta la próxima interrupción" y el aviso "aplicado", el feed de eventos, y el descanso, la prórroga y la tanda representados. La pantalla de partido elige entre `PartidoRapido` y `Partido2D` según `tipoSimulacion`.

**Checkpoint**: las 6 historias funcionan de forma independiente.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: rendimiento a escala beta, seguridad, despliegue y validación final.

- [X] T139 [P] Crear la prueba de carga `tools/load/beta-100.js` (k6, WebSocket): 100 partidas simultáneas (unos 800 participantes simulados) con drafts y jornadas. Comprueba SC-017:
  - p95 de entrega del nuevo sobre < 1 s;
  - SC-009 sigue cumpliéndose;
  - las jornadas NPC se resuelven en < 10 s;
  - ningún bloqueo.
- [X] T140 Optimizar lo que señale la prueba de carga en `apps/server/src/actores/` y `packages/engine/src/`: perfilado de CPU del motor (objetivo < 10 ms por partido, research R7) y agrupación de escrituras por turno.
  - *Resultado*: motor a 8,4 ms por partido. Las 100 partidas terminan sin bloqueos y «Seguir» → final pasa de 24,7 s a 6,2 s (p95). Cambios: pool de BD, vista de torneo ligera, `ctx.publicar()`, caché de atributos y de la alineación automática. No se agrupan las escrituras de elecciones porque contradice R4 (ver research R4).
  - SC-017 sigue sin cumplirse del todo en una sola máquina: ver `checklists/validacion.md`.
- [X] T141 [P] Endurecer la seguridad en `apps/server/src/http/app.ts` y `apps/server/src/ws/pasarela.ts`:
  - Límite de peticiones por sesión (HTTP y mensajes WebSocket).
  - Tamaño máximo de mensaje.
  - Comprobación de `Origin` en el WebSocket.
  - Cookies `Secure` en producción.
  - Auditoría para comprobar que ninguna respuesta filtra información no visible (FR-054a): una prueba que recorre todos los mensajes emitidos en un torneo de prueba.
- [X] T142 [P] Crear el despliegue: `Dockerfile` multietapa con pnpm (`corepack enable`, `pnpm install --frozen-lockfile`, `pnpm -r build`, imagen final con Node 22 que sirve la API, el WebSocket y la web) y `docs/despliegue.md` con las variables de entorno, las migraciones al arrancar, `/healthz` y `/metrics`.
- [X] T143 [P] Revisar la accesibilidad y los textos de `apps/web/src/`: todos los textos en español, contraste de los colores de nivel y equipo, navegación con teclado en el draft y la alineación, y alternativa a arrastrar y soltar (seleccionar y colocar).
- [ ] T144 Ejecutar la validación completa de [quickstart.md](./quickstart.md):
  - *Estado*: hecho todo lo automático y los escenarios A–F (resultados en `checklists/validacion.md`). Pendiente: sesión SC-003 con 5 usuarios, 60 fps en un portátil con navegador visible y repetir SC-017 en un entorno representativo.
  - toda la tabla de pruebas automáticas, `pnpm balance --n 1000` y los escenarios A a F;
  - registrar los resultados en `specs/001-draft-manager-mvp/checklists/validacion.md`;
  - comprobación manual de que la reproducción 2D va a 60 fps en un portátil medio;
  - con 5 usuarios nuevos, medir SC-003 (≥ 90 % completan el draft y la alineación en menos de 30 min sin ayuda).
- [X] T145 [P] Actualizar `README.md`: quitar el aviso "todavía no hay código" y documentar los comandos reales de puesta en marcha y de pruebas.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Fase 1)**: sin dependencias.
- **Foundational (Fase 2)**: depende de Setup y **bloquea** todas las historias.
- **US1 (Fase 3)**: depende de Foundational.
- **US2 (Fase 4)**: depende de Foundational. Para el recorrido completo necesita las plantillas de US1; sus pruebas de dominio usan plantillas de prueba y no dependen de US1.
- **US3 (Fase 5)**: depende de Foundational y usa la alineación de US2 (`statsEfectivos`, `autoAlineacion`, `lanzadores`). El motor se puede desarrollar en paralelo a US1 con alineaciones de prueba.
- **US4 (Fase 6)**: depende de US3 (actor de partido y motor) y sustituye `emparejamientoInicial.ts`.
- **US5 (Fase 7)**: depende de US1 (draft), US2 (alineación) y US3 (motor, para la simulación de prueba del PRO); la comprobación SC-010 necesita US4.
- **US6 (Fase 8)**: depende de US3 (motor y actor de partido).
- **Polish (Fase 9)**: depende de las historias que se quieran entregar.

### Grafo de historias

```text
Setup → Foundational ─┬─► US1 (draft) ──────────────┐
                      ├─► US2 (equipo) ─────────────┤
                      └─► US3 motor (paralelo) ─────┴─► US3 flujo completo ─┬─► US4 (torneo) ─► US5 (NPC, SC-010)
                                                                            └─► US6 (2D)
```

### Within Each User Story

- Las pruebas se escriben primero y deben fallar.
- Después: tipos y modelos de dominio → lógica de dominio y del motor → protocolo y persistencia → actores y rutas del servidor → pantallas web.
- Una historia se cierra en su checkpoint antes de pasar a la siguiente prioridad (si se trabaja en secuencia).

### Parallel Opportunities

- **Setup**: las tareas [P] de creación de paquetes y apps se hacen a la vez tras el `package.json` raíz y `tsconfig.base.json`.
- **Foundational**: PRNG, tipos, parámetros, generador de `core.json`, formaciones, protocolo base, observabilidad, rutas del catálogo y utilidades de prueba van en paralelo. Auth, arranque HTTP, actor y pasarela son secuenciales entre sí.
- **US1 ∥ US2 ∥ motor de US3**: tras Foundational, tres personas pueden trabajar a la vez en `domain/draft`, `domain/equipo` y `engine`.
- **US4 ∥ US6**: ambas dependen solo de US3.
- Dentro de cada historia, todas las pruebas [P] y los ficheros de dominio [P].

---

## Parallel Example: User Story 1

```bash
# Pruebas de US1 (en paralelo, antes de implementar):
Task: "Pruebas de propiedades del generador de sobres en packages/domain/tests/sobres/generador.test.ts"
Task: "Pruebas de propiedades de la mesa de draft en packages/domain/tests/draft/mesa.test.ts"
Task: "Pruebas de la partida en packages/domain/tests/partida/partida.test.ts"
Task: "Pruebas de integración del draft en apps/server/tests/integration/draft.test.ts"

# Dominio de US1 (en paralelo):
Task: "Generador de mesa en packages/domain/src/sobres/generador.ts"
Task: "Entidad Partida en packages/domain/src/partida/partida.ts"
Task: "NPC básico en packages/ai/src/basico.ts"
Task: "Mensajes de sala y draft en packages/protocol/src/ws/draft.ts"
```

## Parallel Example: User Story 3 (motor)

```bash
Task: "Duelo de stats en packages/engine/src/acciones/duelo.ts"
Task: "Modificadores en packages/engine/src/modificadores/"
Task: "Tanda de penaltis en packages/engine/src/penaltis/tanda.ts"
Task: "Comprobaciones estadísticas en tools/balance/src/checks/partido.ts"
```

---

## Implementation Strategy

### MVP primero (US1 → US2 → US3)

1. Fase 1 (Setup) y Fase 2 (Foundational).
2. US1 → **validar** el escenario A del quickstart hasta el final del draft.
3. US2 → **validar** el escenario B.
4. US3 → **validar** el escenario C y `pnpm balance --n 1000`.
5. **Parar y demostrar**: el ciclo central del juego (Principio X) ya es jugable: invitado contra NPC, un partido rápido tras el draft.

### Entrega incremental

1. MVP (US1 a US3).
2. \+ US4: torneos completos, directos y asíncronos, con bajas. Primera beta con amigos.
3. \+ US5: NPC con niveles reales y PRO.
4. \+ US6: vista 2D.
5. Polish: carga a 100 partidas, seguridad, despliegue y validación final.

### Equipo en paralelo

Tras Foundational: una persona en el draft (US1), otra en el equipo (US2) y otra en el motor (US3). Después, una en el torneo (US4) y otra en el 2D (US6), y por último los NPC (US5).

---

## Notes

- [P] = ficheros distintos y sin dependencias pendientes. [USn] = trazabilidad con spec.md.
- Siempre **pnpm**: `pnpm add` / `pnpm --filter @fbd/<paquete> add` / `pnpm dlx`. Nunca npm, yarn ni bun.
- Ningún uso de `Math.random` ni de `Date` en `domain` o `engine`; ESLint lo impide.
- Toda regla nueva o cambio de valor va al dominio o a `ParametrosEquilibrado` (nueva versión), con sus pruebas (Principio IX).
- Hacer commit al terminar cada tarea o grupo lógico; validar cada checkpoint antes de seguir.
