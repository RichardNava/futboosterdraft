---

description: "Lista de tareas de la spec 017: auditoría de seguridad y roles"
---

# Tasks: Auditoría de seguridad y roles

**Input**: documentos de diseño de `specs/017-auditoria-seguridad-roles/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md),
[contracts/](contracts/) y [quickstart.md](quickstart.md)

**Tests**: obligatorios. FR-010 exige una prueba automática por cada corrección, FR-011 una verificación única y FR-041
una prueba de acceso denegado por cada celda «no». Cada prueba de ataque se escribe antes que su corrección y debe fallar
primero.

**Organization**: las tareas se agrupan por historia de usuario. El orden sigue el del plan: auditar, corregir, roles,
robots.txt y repetir la auditoría.

## Formato: `[ID] [P?] [Story] Descripción`

- **[P]**: se puede hacer en paralelo (ficheros distintos, sin dependencias pendientes).
- **[Story]**: historia a la que pertenece (US1 a US4).
- **(persona responsable)**: la tarea no la puede cerrar un agente (FR-009, Principio IX).

## Reglas para toda la spec

- Los ataques se lanzan solo contra entornos propios (FR-005). Ni el informe ni las pruebas contienen secretos, tokens ni
  datos personales reales.
- Cada test de ataque se llama `SEG-NNN: <ataque en lenguaje claro>`, con el id del hallazgo de `auditoria.md`.
- Ninguna corrección cambia las reglas del juego ni el motor (FR-012). `pnpm test:equivalence` debe seguir en verde.
- Código e identificadores en español y sin tildes; las tildes solo en los textos de interfaz.
- Los agentes no ejecutan `git commit` ni `git push`.

---

## Phase 1: Setup

**Purpose**: fijar el estado de partida y preparar dónde vivirán los ataques.

- [X] T001 Ejecutar `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`, `pnpm test:equivalence` y `pnpm e2e`, y anotar el resultado como línea base (SC-011, SC-012) en `specs/017-auditoria-seguridad-roles/checklists/validacion.md`
- [X] T002 [P] Crear `apps/server/vitest.seguridad.config.ts` con `include: ['tests/seguridad/**/*.test.ts']`, los mismos tiempos que `apps/server/vitest.config.ts`, `fileParallelism: false` y salida JSON en `apps/server/test-results/seguridad.json`, y añadir `apps/server/test-results/` a `.gitignore` (la configuración actual solo incluye `tests/integration` y `tests/contract`)

---

## Phase 2: Foundational

**Purpose**: la verificación única (R2), que usan todas las correcciones.

**⚠️ CRITICAL**: sin esta fase no se puede registrar ningún ataque. La migración 0018 no va aquí a propósito: la auditoría
debe reproducir antes el estado actual, incluido el fallo de borrado de cuentas con pase (R24).

- [X] T003 Crear `apps/server/tests/seguridad/ayudas.ts` reutilizando `apps/server/tests/helpers/app.ts`, `usuarios.ts` y `clienteWs.ts`, con una opción para arrancar la app con los límites reales y otra con `NODE_ENV=production` simulado
- [X] T004 Crear `apps/server/tests/seguridad/resumen.ts`: lee `apps/server/test-results/seguridad.json`, escribe `specs/017-auditoria-seguridad-roles/verificacion.md` con la tabla `Ataque | Hallazgo | Resultado` de `contracts/seguridad.md` y termina con error si un ataque falla, si un test no sigue el formato `SEG-NNN: …` o si no hay ninguno
- [X] T005 [P] Añadir la prueba del generador (todo bloqueado, un fallo, nombre mal formado y resultado vacío) en `apps/server/tests/unit/resumenSeguridad.test.ts`
- [X] T006 Añadir el script `seguridad` en `apps/server/package.json` (Vitest con `vitest.seguridad.config.ts` y después `tests/seguridad/resumen.ts`, conservando el código de error) y el atajo `pnpm seguridad` en `package.json`

**Checkpoint**: `pnpm seguridad` funciona y falla con claridad mientras no haya ataques.

---

## Phase 3: User Story 1 - Saber con certeza cómo de seguro es el sistema (Priority: P1) 🎯 MVP

**Goal**: un informe único con todas las áreas de FR-003, todos los puntos de entrada y cada hallazgo con severidad,
evidencia reproducible y riesgo.

**Independent Test**: abrir `auditoria.md`, comprobar las 16 áreas y ejecutar
`pnpm --filter @fbd/server test:integration inventario`. Aporta valor aunque aún no se haya corregido nada.

### Inventario

- [X] T007 [US1] Añadir a `Pasarela` un método de lectura `tiposMensaje()` con los tipos registrados, para poder compararlos con el inventario, en `apps/server/src/ws/pasarela.ts`
- [X] T008 [US1] Crear `specs/017-auditoria-seguridad-roles/inventario.json` con cada ruta HTTP (incluidas `/healthz`, `/metrics`, `/ws`, `/api/auth/ba/*` y `/api/dev/*`) y cada mensaje WebSocket, con `tipo`, `metodo` y `ruta` o `mensaje`, `acceso`, `comprobacion` y `hallazgos` según `contracts/seguridad.md`
- [X] T009 [US1] Crear `apps/server/tests/integration/inventario.test.ts`: captura las rutas con `onRoute`, lee `tiposMensaje()` y falla si falta o sobra alguna entrada en `inventario.json` (FR-004, SC-001)

### Auditoría por áreas

Cada tarea reproduce los indicios en un entorno propio y anota en `auditoria.md` los hallazgos `SEG-NNN`, o qué se revisó si
no hay ninguno. La severidad sigue la tabla de FR-002.

- [X] T010 [US1] Crear `specs/017-auditoria-seguridad-roles/auditoria.md` con los criterios de FR-002, una sección por cada una de las 16 áreas de FR-003, el formato de hallazgo de `contracts/seguridad.md` y una sección de decisiones de riesgo
- [X] T011 [US1] Auditar **autenticación y sesiones** en `apps/server/src/auth/`: API interna `/api/auth/ba/*`, `token` en el cuerpo de login y registro (FR-017), atributos de la cookie, enumeración de correos por respuesta y por tiempo (FR-016), y anotarlo en `auditoria.md`
- [X] T012 [US1] Auditar **invitados** y **recuperación de contraseña**: paso a registrado con un correo existente (FR-019), un solo uso, caducidad de una hora, token en registros y cabeceras (FR-020), y anotarlo en `auditoria.md`
- [X] T013 [US1] Auditar la **autorización** de cada ruta de `inventario.json` con dos cuentas (lectura y escritura sobre partida, equipo, colección y compra ajenas, FR-021), y anotarlo en `auditoria.md`
- [X] T014 [US1] Auditar el **canal en tiempo real** en `apps/server/src/ws/pasarela.ts`: origen, sesión revocada con el socket abierto, permiso por mensaje y `requestId` compartido dentro de la partida (R3, FR-022), y anotarlo en `auditoria.md`
- [X] T015 [US1] Auditar la **integridad del juego** en `apps/server/src/actores/`: mensajes manipulados, fuera de turno o duplicados (FR-023) y elecciones o alineaciones ajenas en cualquier respuesta (FR-024), y anotarlo en `auditoria.md`
- [X] T016 [US1] Auditar **tienda y economía** en `apps/server/src/economia/servicio.ts`: pago simulado en producción (R13), 50 compras simultáneas, reutilización de `idCompra`, saldo frente a movimientos y precio decidido en el servidor (FR-026, FR-027), y anotarlo en `auditoria.md`
- [X] T017 [US1] Auditar **validación de entradas y límites**: cookie inventada, peticiones sin sesión, IP detrás del proxy, rotación de direcciones IPv6 dentro de un mismo /64, crecimiento de `peticiones_procesadas` y del mapa de `Limitador` (FR-013, FR-014, FR-025), y anotarlo en `auditoria.md`
- [X] T018 [US1] Auditar **protecciones del navegador** e **inyección**: cabeceras, CORS, XSS en nombres de equipo y partida en pantallas y correos, y todo `sql` con valores interpolados en `apps/server/src/` (FR-029 a FR-032), y anotarlo en `auditoria.md`
- [X] T019 [US1] Auditar **rutas técnicas**, **errores** y **registros**: `/metrics`, `/healthz`, `/api/dev/*`, GET a `/api/` inexistente, la URL reflejada en el 404, query strings, correos y errores SMTP en los registros (FR-033 a FR-035), y anotarlo en `auditoria.md`
- [X] T020 [US1] Auditar **secretos, configuración e imagen**: construir la imagen del `Dockerfile` y comprobar usuario, contenido, secretos y si incluye `vitest`, `vite` o `tinypool` (punto «Sin confirmar» de R14), y anotarlo en `auditoria.md`
- [X] T021 [US1] Auditar **dependencias** con `pnpm audit --prod --json` y `pnpm audit --json`, indicando para cada aviso alto o crítico si afecta al sistema (FR-006, FR-038), y anotarlo en `auditoria.md`
- [X] T022 [US1] Auditar **correo** en `apps/server/src/avisos/servicio.ts`: inyección de cabeceras y destinatarios, y enlaces siempre hacia `PUBLIC_URL` (FR-039), y anotarlo en `auditoria.md`
- [X] T023 [US1] Ejecutar `zap-baseline` y `zap-api-scan` con `ghcr.io/zaproxy/zaproxy:stable` contra la imagen local (R23) y recoger cada alerta en `auditoria.md`
- [X] T024 [US1] Cerrar el informe: enlazar los hallazgos en `inventario.json`, comprobar que cada uno tiene todos sus campos, buscar secretos y datos personales en `auditoria.md`, y presentar el resumen a la persona responsable

**Checkpoint**: el informe fija el alcance real de la corrección. Los hallazgos que no cubran las tareas siguientes entran
por T071 y T072.

---

## Phase 4: User Story 2 - Abrir la beta sin vulnerabilidades conocidas (Priority: P1)

**Goal**: cada hallazgo corregido o aceptado, y cada ataque demostrado como bloqueado.

**Independent Test**: `pnpm seguridad` termina sin errores y `verificacion.md` muestra todos los ataques como «Bloqueado».

### Dependencias e imagen (R14, R15)

Van primero y aisladas, porque zod 4 toca todo el protocolo.

- [ ] T025 [US2] Crear `.pnpmfile.cjs` que retire `vitest` de las dependencias par de `better-auth`, añadirlo al primer `COPY` del `Dockerfile` y regenerar `pnpm-lock.yaml` con `pnpm install`
- [ ] T026 [US2] Subir `zod` a 4.x en `apps/server/package.json` y `packages/protocol/package.json`, dar dos argumentos a los 7 `z.record(...)` de `packages/protocol/src/http/base.ts`, `http/partidos.ts`, `ws/draft.ts` y `ws/partido.ts`, y revisar los identificadores de pruebas que dejen de pasar con el `uuid()` estricto
- [ ] T027 [US2] Subir `nodemailer` a 10.x y `@types/nodemailer` en `apps/server/package.json`, y adaptar `apps/server/src/avisos/servicio.ts` si cambia su API
- [ ] T028 [US2] Subir `@fastify/static` a 10.x en `apps/server/package.json` y comprobar en `apps/server/src/http/app.ts` que siguen sirviéndose la web y sus recursos en modo producción
- [ ] T029 [US2] Subir `vitest` a 3.2.x o superior en `package.json` y corregir lo que cambie en la configuración de pruebas
- [ ] T030 [US2] Verificar la subida: `pnpm typecheck`, `pnpm test`, `pnpm test:integration`, `pnpm e2e`, `pnpm audit --audit-level=high` sin altos ni críticos y la imagen sin herramientas de pruebas, y anotar el resultado en `auditoria.md` (FR-038, SC-011)

### Migración 0018

- [ ] T031 [US2] Actualizar el esquema Drizzle: `rol` y `suspendidaEn` en `usuarios` (`apps/server/src/persistencia/esquema/base.ts`), cascada en `pasesPremium` y motivo `entrega_betatester` (`esquema/coleccion.ts`), tipo `partida_cerrada` en `avisos` (`esquema/torneo.ts`) y las tablas `registroAdmin` y `ordenesConsola` en un nuevo `esquema/admin.ts`, exportado desde `esquema/index.ts`
- [ ] T032 [US2] Escribir `apps/server/drizzle/0018_spec017.sql` y su entrada `idx: 18` en `apps/server/drizzle/meta/_journal.json`, con: `rol text not null default 'jugador'`; `suspendida_en timestamptz null`; los checks `usuarios_rol_ck`, `usuarios_invitado_rol_ck` (`not es_invitado or rol = 'jugador'`), `usuarios_admin_suspension_ck` (`rol <> 'administrador' or suspendida_en is null`) y `usuarios_invitado_suspension_ck` (`not es_invitado or suspendida_en is null`); `ON DELETE CASCADE` en `pases_premium`; `movimientos_fragmentos_motivo_ck` y `avisos_tipo_ck` recreados **conservando todos sus valores actuales** y añadiendo el nuevo; el índice único parcial `movimientos_entrega_betatester_uq`; `peticiones_procesadas_creada_idx`; `registro_admin` con `motivo` de hasta 500 caracteres, `intentos integer not null default 1` mayor que 0, sus tres índices y el *trigger* `BEFORE UPDATE OR DELETE` que solo admite poner `motivo` a `null` sin tocar otra columna; y `ordenes_consola` con su índice parcial sobre `creada_en` con `estado = 'pendiente'`
- [ ] T033 [US2] Probar la migración en `apps/server/tests/integration/migracion-0018.test.ts` con `bdHasta('0017_spec016')`: cuentas previas como `jugador`, cada check, cascada, índice único, *trigger* (rechaza `UPDATE` y `DELETE`, admite vaciar `motivo`) y valores anteriores de los checks recreados

### Límites de uso e identificación del cliente (FR-013, FR-014, R4, R5)

- [ ] T034 [P] [US2] Escribir los ataques en `apps/server/tests/seguridad/limites.test.ts`: 100 contraseñas cambiando la cookie y `X-Forwarded-For` (SC-005), registro, invitado y recuperación en bucle, rotación IPv6 en un /64, un cliente que no agota el cupo de otro y bloqueo de una cuenta ajena que no impide recuperarla
- [ ] T035 [US2] Ampliar `Limitador` en `apps/server/src/http/limitador.ts` con consulta sin gasto, gasto solo al fallar, borrado de una clave y un tope real de claves que expulse las más antiguas si ningún cubo está lleno, con sus casos en `apps/server/tests/unit/limitador.test.ts`
- [ ] T036 [US2] Añadir la opción para desactivar todos los límites en `apps/server/src/servidor.ts` y `apps/server/src/main.ts` (con `--fake-clock` o `LIMITES_DESACTIVADOS=1`), usarla en `apps/server/tests/helpers/app.ts` para que las pruebas actuales no choquen con los límites de registro, y documentarla en `tools/load/README.md`
- [ ] T037 [US2] Leer `PROXIES_CONFIANZA` y pasarlo a `trustProxy` en `apps/server/src/http/app.ts`, con una función de clave de cliente que agrupe las direcciones IPv6 por su /64
- [ ] T038 [US2] Aplicar en `apps/server/src/auth/rutas.ts` los límites de `contracts/seguridad.md`: login 10 por minuto e IP, 20 fallos por hora y correo normalizado con la misma respuesta exista o no la cuenta, registro 5 por hora e IP, invitado 20 por hora e IP, recuperación 5 seguidas y 1 por minuto por IP y 3 por hora y correo sin enviar correo ni cambiar la respuesta; un restablecimiento correcto borra los fallos de la cuenta
- [ ] T039 [US2] Sustituir en `apps/server/src/http/app.ts` el límite por cookie sin validar: un gancho `onRoute` añade el límite por usuario (60 de ráfaga, 20/s) **después** de los `preHandler` de sesión, y un `onRequest` aplica el límite por IP a `/api/` (300 de ráfaga, 100/s)

### Cuentas y sesiones (FR-015 a FR-020, R6, R7, R8, R24)

- [ ] T040 [P] [US2] Escribir los ataques en `apps/server/tests/seguridad/cuentas.test.ts`: uso de `/api/auth/ba/*`, `token` en la respuesta de login y registro, enumeración de correos por respuesta y tiempo, invitado que reclama un correo existente, enlace de recuperación reutilizado o caducado
- [ ] T041 [US2] Retirar la ruta `/api/auth/ba/*` de `apps/server/src/auth/rutas.ts` y actualizar el comentario de cabecera de `apps/server/src/auth/auth.ts`, manteniendo su `basePath` interno (R6)
- [ ] T042 [US2] Hacer que login y registro respondan solo `{ usuario }`, sin `token`, en `apps/server/src/auth/rutas.ts`, y adaptar `apps/server/tests/helpers/usuarios.ts` y las pruebas que lean el cuerpo anterior (FR-017)
- [ ] T043 [US2] Activar `advanced.ipAddress.disableIpTracking` en `apps/server/src/auth/auth.ts` (R4)
- [ ] T044 [US2] Igualar la respuesta y el tiempo de login y recuperación con y sin cuenta en `apps/server/src/auth/rutas.ts`, y dejar constancia en `auditoria.md` de lo que revele el registro (FR-016)
- [ ] T045 [US2] Corregir en `apps/server/src/auth/rutas.ts` y `apps/server/src/actores/gestor.ts` lo que T012 detecte en el paso de invitado a registrado, para transferir solo los datos de ese invitado (FR-019)
- [ ] T046 [US2] Quitar el token de la dirección en cuanto se lee y mantenerlo solo en memoria en `apps/web/src/pantallas/Inicio.tsx` (FR-020, `contracts/ui.md`)
- [ ] T047 [P] [US2] Escribir los ataques en `apps/server/tests/seguridad/sesiones.test.ts`: socket abierto tras logout, restablecimiento, caducidad, borrado y sesión retirada desde otro proceso; todos cerrados con `4401` en 5 s como máximo (SC-007)
- [ ] T048 [US2] Guardar el id de sesión en `ContextoConexion` y añadir en `apps/server/src/ws/pasarela.ts` la revisión cada 3 s con **una sola consulta** para todas las conexiones, parada al cerrar la app (R8); `usuarioDeLaPeticion` de `apps/server/src/auth/rutas.ts` debe devolver también ese id
- [ ] T049 [US2] Cambiar `DELETE /api/cuenta` en `apps/server/src/auth/rutas.ts` para borrar la cuenta antes de devolver las cookies de cierre, y probar la baja de una cuenta con pase premium en `apps/server/tests/seguridad/cuentas.test.ts` (R24)

### Idempotencia (FR-025, R3)

- [ ] T050 [P] [US2] Escribir los ataques en `apps/server/tests/seguridad/idempotencia.test.ts`: la misma clave desde otra cuenta o sin sesión, login con `Idempotency-Key` que guarda el token, 4xx que consume la clave, clave de más de 128 caracteres, `requestId` de otro participante y filas de más de 7 días
- [ ] T051 [US2] Mover en `apps/server/src/http/app.ts` la lectura de idempotencia **detrás** de los `preHandler` de cada ruta con `onRoute`; ámbito `http:<usuario>:<método>:<ruta sin query>`; guardar solo 2xx de personas autenticadas; clave de más de 128 caracteres: `400 CLAVE_INVALIDA`
- [ ] T052 [US2] Cambiar en `apps/server/src/ws/pasarela.ts` el ámbito a `ws:<partida>:<participante>` y dejar de guardar los mensajes rechazados por su esquema, actualizando `apps/server/tests/unit/pasarela.test.ts`
- [ ] T053 [US2] Añadir la purga de filas de más de 7 días a `AlmacenPeticionesBD` en `apps/server/src/persistencia/peticiones.ts` y programarla cada hora en `apps/server/src/servidor.ts`, con el temporizador parado al cerrar la app

### Superficie expuesta (FR-029, FR-030, FR-033 a FR-036, R7, R9 a R12)

- [ ] T054 [P] [US2] Escribir los ataques en `apps/server/tests/seguridad/superficie.test.ts`: cabeceras en todas las respuestas, sin `Access-Control-Allow-Origin`, POST, PUT y DELETE desde otro origen, `/metrics` sin token o con token incorrecto, `/healthz` mínimo, `/api/dev/*` en producción, GET a `/api/` inexistente, y contraseñas, tokens, cookies, correos y query strings ausentes de los registros
- [ ] T055 [US2] Crear `apps/server/src/http/cabeceras.ts` con el gancho `onSend` y las cabeceras exactas de `contracts/seguridad.md` (HSTS solo en producción, `connect-src` derivado de `PUBLIC_URL`) y registrarlo en `apps/server/src/http/app.ts`
- [ ] T056 [US2] Añadir en `apps/server/src/http/app.ts` el rechazo `403 ORIGEN_NO_PERMITIDO` de POST, PUT y DELETE cuyo `Origin` exista y no sea `PUBLIC_URL`
- [ ] T057 [US2] Proteger `/metrics` con `Authorization: Bearer <METRICAS_TOKEN>` y comparación de tiempo constante (404 en cualquier otro caso en producción) y reducir `/healthz` a `{ estado }` en `apps/server/src/observabilidad/rutas.ts`
- [ ] T058 [US2] Hacer que en producción un GET a `/api/` inexistente devuelva `404 RUTA_NO_ENCONTRADA` y no la web, y quitar la URL del mensaje de error, en `apps/server/src/http/app.ts`
- [ ] T059 [US2] Configurar en `apps/server/src/observabilidad/logger.ts` el serializador de petición sin query string y `redact` de cookies, autorización, contraseñas y tokens, y reducir los errores SMTP a su código en `apps/server/src/avisos/servicio.ts`
- [ ] T060 [P] [US2] Escribir el ataque de arranque inseguro (cada variable ausente, corta o de ejemplo, sin mostrar nunca su valor) en `apps/server/tests/seguridad/entorno.test.ts`
- [ ] T061 [US2] Crear la función pura `validarEntornoProduccion(env)` en `apps/server/src/entorno.ts` con las reglas de `contracts/seguridad.md` y llamarla desde `apps/server/src/main.ts` en producción
- [ ] T062 [US2] Crear `apps/web/tests/e2e/seguridad-csp.spec.ts`, que recorre las pantallas principales y falla con cualquier violación de CSP. Se ejecuta con `E2E_BASE_URL` contra la imagen de producción, porque en desarrollo el HTML lo sirve Vite y no recibe la CSP; ajustar la política en `apps/server/src/http/cabeceras.ts` solo con lo imprescindible

### Tienda y economía (FR-026 a FR-028, R13)

- [ ] T063 [P] [US2] Escribir los ataques en `apps/server/tests/seguridad/economia.test.ts`: compra en euros de cosmético, pack y pase con el pago cerrado, 50 compras simultáneas (SC-006), `idCompra` de otra cuenta, precio o moneda manipulados, y saldo igual a la suma de movimientos
- [ ] T064 [US2] Añadir `pagoSimulado` a `ServicioEconomia` en `apps/server/src/economia/servicio.ts` y rechazar en `comprar()`, después de buscar la compra previa, con `409 PAGO_NO_DISPONIBLE`; pasarlo desde `apps/server/src/servidor.ts` como falso en producción
- [ ] T065 [US2] Añadir `pagoEuros: boolean` a `packages/protocol/src/http/tienda.ts` y `http/cosmeticos.ts`, y a las respuestas de `apps/server/src/http/tienda.ts` y `apps/server/src/http/cosmeticos.ts`
- [ ] T066 [US2] Con `pagoEuros: false`, mostrar las opciones en euros desactivadas con el texto «Pago con tarjeta próximamente» en `apps/web/src/pantallas/Tienda.tsx` y `apps/web/src/componentes/TiendaCosmeticos.tsx`

### Autorización, integridad y entradas (FR-021 a FR-024, FR-031, FR-032, FR-039)

- [ ] T067 [P] [US2] Escribir los ataques de acceso a recursos ajenos, por HTTP y WebSocket, para cada ruta con recurso de `inventario.json`, en `apps/server/tests/seguridad/autorizacion.test.ts`
- [ ] T068 [P] [US2] Escribir los ataques de integridad en `apps/server/tests/seguridad/integridad.test.ts`: elección manipulada, fuera de turno o duplicada, alineación inválida, y ninguna respuesta con elecciones ajenas ni alineación rival antes del partido
- [ ] T069 [P] [US2] Escribir los ataques de entrada en `apps/server/tests/seguridad/entradas.test.ts`: código malicioso en nombres de equipo y partida, inyección SQL en parámetros y búsquedas, saltos de línea en cabeceras de correo y enlaces con otro `Host`
- [ ] T070 [US2] Corregir en `apps/server/src/http/`, `apps/server/src/actores/` y `apps/server/src/avisos/servicio.ts` lo que hagan fallar T067, T068 y T069

### Cierre de la corrección

- [ ] T071 [US2] Corregir cada hallazgo crítico o alto de `auditoria.md` que no cubra otra tarea, con su ataque en `apps/server/tests/seguridad/` (FR-008, FR-010)
- [ ] T072 [US2] Corregir los hallazgos medios y bajos restantes, o redactar en `auditoria.md` la propuesta de aceptación con riesgo residual y condición de revisión (FR-009)
- [ ] T073 [US2] (persona responsable) Aceptar o rechazar cada propuesta de T072 y registrar quién, cuándo y por qué en `specs/017-auditoria-seguridad-roles/auditoria.md`
- [ ] T074 [US2] Ejecutar `pnpm seguridad` y `pnpm test:equivalence`, y actualizar el estado y el cierre de cada hallazgo en `auditoria.md` (SC-002, SC-003, SC-012)

**Checkpoint**: ningún crítico o alto abierto y todos los ataques bloqueados.

---

## Phase 5: User Story 3 - Administrar el juego con roles (Priority: P2)

**Goal**: panel web solo para administradores, con cada acción registrada y la consola como vía de emergencia.

**Independent Test**: con una cuenta de cada rol, intentar cada acción de la matriz de FR-041, también llamando a la API
directamente.

**Depende de**: T031 a T033 (migración) y de las correcciones de sesión de US2.

### Dominio, contrato y pruebas

- [ ] T075 [P] [US3] Crear `packages/domain/src/roles/index.ts` con los roles, la matriz de FR-041 y `rolEfectivo` (`es_invitado ? 'invitado' : rol`), exportarlo en `packages/domain/src/index.ts` y probar cada celda en `packages/domain/tests/roles/roles.test.ts`
- [ ] T076 [P] [US3] Añadir el evento `cerrar_admin` desde `buscando`, `en_draft` y `en_torneo` hacia `abandonada` en `packages/domain/src/partida/partida.ts`, con sus casos en `packages/domain/tests/partida/partida.test.ts`
- [ ] T077 [P] [US3] Crear `packages/protocol/src/http/admin.ts` con los esquemas de `contracts/http-admin.md` (`motivo` de 3 a 500 caracteres sin caracteres de control; `cantidad` entera de 1 a 10.000; `idEntrega` UUID; `limite` máximo 50) y exportarlo en `packages/protocol/src/index.ts`
- [ ] T078 [P] [US3] Escribir en `apps/server/tests/seguridad/permisos.test.ts` una prueba de acceso denegado por **cada celda «no»** de FR-041, llamando directamente a la API (SC-004), con el intento registrado
- [ ] T079 [P] [US3] Escribir en `apps/server/tests/seguridad/admin.test.ts`: cambio de rol aplicado en la siguiente petición, rol propio, dos administradores que se quitan el rol a la vez, invitado con rol, suspensión con sesión abierta, entrega repetida y simultánea, cantidad 10.001, cuenta sin rol betatester, cierre con participación propia, cierre sin premios y registro inalterable

### Servidor

- [ ] T080 [US3] Exponer `rol` y `suspendidaEn` como campos adicionales con `input: false` en `apps/server/src/auth/auth.ts`, añadir `rol` a `UsuarioSesion`, impedir crear sesión a una cuenta suspendida con `databaseHooks.session.create.before` (`403 CUENTA_SUSPENDIDA`) y rechazar su sesión al leerla; `suspendidaEn` no debe salir en ninguna respuesta
- [ ] T081 [US3] Añadir el gancho `soloAdministrador` (`401 SIN_SESION`, `403 SOLO_ADMINISTRADORES` y registro del intento) en `apps/server/src/auth/rutas.ts`
- [ ] T082 [US3] Crear `apps/server/src/admin/registro.ts` solo con inserción y lectura paginada. Los denegados se acumulan **en memoria** por actor y acción durante 10 s y se insertan en **una sola fila** con su `intentos`, porque el *trigger* impide incrementar una fila existente; volcar lo pendiente al cerrar la app
- [ ] T083 [US3] Crear `apps/server/src/admin/servicio.ts` con el cambio de rol en una transacción con `pg_advisory_xact_lock`, que relee actor y objetivo y cuenta los administradores activos (`ROL_PROPIO`, `ULTIMO_ADMINISTRADOR`, `INVITADO_SIN_ROL`, `CUENTA_SUSPENDIDA`; R17)
- [ ] T084 [US3] Añadir suspender y reactivar en `apps/server/src/admin/servicio.ts`: marca, borrado de sesiones y registro en una transacción (`SUSPENSION_PROPIA`, `NO_SUSPENDIBLE`; R19)
- [ ] T085 [US3] Añadir premium de cortesía (`INVITADO_SIN_PREMIUM`) y cambio de ajustes, solo con claves y valores de `AJUSTES_CONOCIDOS`, en `apps/server/src/admin/servicio.ts`, cada uno con su registro en la misma transacción
- [ ] T086 [US3] Añadir `entregarBetatester` a `apps/server/src/economia/servicio.ts`: bloquea el saldo, relee el rol, usa `sumar` con motivo `entrega_betatester` y referencia `idEntrega`, y escribe el registro en la misma transacción (`CANTIDAD_INVALIDA`, `NO_BETATESTER`, `ID_ENTREGA_REUTILIZADO`; R20)
- [ ] T087 [US3] Añadir el cierre de partida en `apps/server/src/actores/gestor.ts`, el tipo `partida_cerrada` en `apps/server/src/avisos/servicio.ts` y la comprobación de estado en `terminarTorneo` y las simulaciones en curso de `apps/server/src/actores/torneo.ts`: sin premios, aviso genérico y devolución de rareza solo desde `buscando` (R21)
- [ ] T088 [US3] Crear `apps/server/src/admin/rutas.ts` con todas las rutas de `contracts/http-admin.md` bajo `soloAdministrador` y registrarlas en `apps/server/src/servidor.ts`. `GET /api/admin/partidas` no incluye cartas, elecciones, alineaciones ni tácticas (FR-024)
- [ ] T089 [US3] Crear `apps/server/src/admin/ordenes.ts`: recoge `ordenes_consola` cada 2 s, descarta las de más de 60 s como `caducada` y se para al cerrar la app; arrancarlo en `apps/server/src/servidor.ts`
- [ ] T090 [US3] Crear `apps/server/src/admin/cli.ts` con `designar <email>` (solo sin administradores activos) y `cerrar-partida <id> "<motivo>"` (espera hasta 15 s), y el script `admin` en `apps/server/package.json`
- [ ] T091 [US3] Registrar con actor `consola` las acciones de `apps/server/src/ajustes/cli.ts` y `apps/server/src/premium/cli.ts`, en la misma transacción que el cambio (FR-046)
- [ ] T092 [US3] Vaciar `motivo` en `registro_admin` de las entradas sobre la cuenta al eliminarla, en `eliminarCuenta` de `apps/server/src/actores/gestor.ts`, y mostrarla como «Cuenta eliminada» en la lectura del registro (FR-047)

### Web

- [ ] T093 [US3] Añadir `rol` al usuario de `apps/web/src/estado/sesion.ts`
- [ ] T094 [US3] Crear `apps/web/src/pantallas/Admin.tsx` con carga diferida y cuatro pestañas, la ruta `/admin` (redirige al inicio sin el rol) en `apps/web/src/app/Rutas.tsx` y el enlace «Administración» solo para administradores en `apps/web/src/app/Marco.tsx`
- [ ] T095 [US3] Implementar la pestaña Partidas con el `Dialogo` de cierre y su motivo en `apps/web/src/pantallas/Admin.tsx`
- [ ] T096 [US3] Implementar la pestaña Cuentas (buscador, lista paginada, rol, suspender, reactivar, premium y fragmentos con `idEntrega` generado al abrir el diálogo y reutilizado al reintentar) en `apps/web/src/pantallas/Admin.tsx`
- [ ] T097 [US3] Implementar las pestañas Ajustes y Registro y los mensajes de error de `contracts/ui.md` en `apps/web/src/pantallas/Admin.tsx`, con lista y detalle en columnas desde portátil y apilados a 360 px (Principio XI)
- [ ] T098 [US3] Mostrar los mensajes de cuenta suspendida y «Tu sesión ha terminado» en `apps/web/src/pantallas/Inicio.tsx` y `apps/web/src/conexion/useConexion.ts`, y el aviso `partida_cerrada` sin el motivo
- [ ] T099 [US3] Crear `apps/web/tests/e2e/admin.spec.ts` con el recorrido de quickstart D y E, y añadir `/admin` a `apps/web/tests/e2e/diseno/inventario.spec.ts` para cubrir accesibilidad y 360 px

**Checkpoint**: la matriz completa funciona y queda registrada; la consola sigue disponible.

---

## Phase 6: User Story 4 - Que los buscadores solo vean la portada (Priority: P3)

**Goal**: `/robots.txt` permite solo la portada y sus recursos, y bloquea todo lo demás, también lo futuro.

**Independent Test**: abrir `/robots.txt` y comprobarlo con un validador de robots.

- [ ] T100 [P] [US4] Escribir en `apps/server/tests/seguridad/robots.test.ts` la comprobación por coincidencia más larga: `/` permitida; `/api/`, `/ws`, `/metrics`, `/admin`, `/partidas/x/draft`, `/?restablecer=x` y una ruta inventada bloqueadas (SC-010)
- [ ] T101 [US4] Crear `apps/web/public/robots.txt` con el contenido de R22, comprobar que la portada no pide recursos fuera de las carpetas permitidas y que en producción se sirve como texto y no como la web

**Checkpoint**: las cuatro historias funcionan.

---

## Phase 7: Polish & Cross-Cutting

**Purpose**: repetir la auditoría y dejar la spec lista para cerrar.

- [ ] T102 Actualizar `specs/017-auditoria-seguridad-roles/inventario.json` con las rutas `/api/admin/*` y las retiradas, hasta que pase `apps/server/tests/integration/inventario.test.ts`
- [ ] T103 Repetir la auditoría sobre lo cambiado, incluidos panel, roles y lo que haya integrado INI-16, y añadir lo nuevo a `specs/017-auditoria-seguridad-roles/auditoria.md` (FR-007)
- [ ] T104 Corregir `specs/017-auditoria-seguridad-roles/quickstart.md`: con `PUBLIC_URL=https://localhost` y la web abierta en `http://localhost:3000`, el navegador recibiría `403 ORIGEN_NO_PERMITIDO`. Los escenarios C, D, F y G deben pasar por un proxy HTTPS local con `PROXIES_CONFIANZA=1` y `PUBLIC_URL` igual a esa dirección
- [ ] T105 Repetir ZAP contra la imagen final y recoger cada alerta y su resolución en `specs/017-auditoria-seguridad-roles/auditoria.md` (FR-006)
- [ ] T106 [P] Documentar en `.env.example` y `docs/despliegue.md` las variables obligatorias, la designación del primer administrador, el panel y la consola de emergencia (FR-053)
- [ ] T107 [P] Añadir `pnpm seguridad` y `pnpm audit --prod --audit-level=high` a `.github/workflows/ci.yml`
- [ ] T108 Ejecutar `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`, `pnpm test:equivalence`, `pnpm e2e`, `pnpm seguridad` y `pnpm audit --audit-level=high`, y anotar el resultado en `specs/017-auditoria-seguridad-roles/checklists/validacion.md` (SC-011, SC-012)
- [ ] T109 Recorrer los escenarios A a H de `specs/017-auditoria-seguridad-roles/quickstart.md` y registrar cada SC en `checklists/validacion.md`
- [ ] T110 (persona responsable) Cronometrar en el panel cambiar un ajuste y conceder premium de cortesía, menos de 1 minuto cada uno (SC-008), y aprobar el informe final en `specs/017-auditoria-seguridad-roles/checklists/validacion.md`
- [ ] T111 Actualizar `ROADMAP.md` (INI-17), `CLAUDE.md` (órdenes `admin` y `pnpm seguridad`) y ejecutar `graphify update .`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup y bloquea todas las historias.
- **US1 (Phase 3)**: depende de Foundational. Fija el alcance de US2.
- **US2 (Phase 4)**: depende de US1.
- **US3 (Phase 5)**: depende de la migración (T031 a T033) y de las correcciones de sesión e idempotencia de US2.
- **US4 (Phase 6)**: solo depende de Foundational; se puede hacer en cualquier momento.
- **Polish (Phase 7)**: depende de todas las historias.

### Dependencias dentro de US2

```text
T025-T030 (dependencias) → T031-T033 (migración)
T036 → T037-T039         (las pruebas actuales no deben chocar con los límites nuevos)
T034 → T035-T039         T040 → T041-T046         T047 → T048
T050 → T051-T053         T054 → T055-T059         T060 → T061
T055 → T062              T063 → T064 → T065 → T066
T067, T068, T069 → T070 → T071 → T072 → T073 → T074
```

### Dependencias dentro de US3

```text
T075, T076, T077 → T078, T079 → T080 → T081 → T082 → T083-T086
T076 → T087      T083-T087 → T088 → T089 → T090 → T091, T092
T088 → T093 → T094 → T095-T097 → T098 → T099
```

### Parallel Opportunities

- Fases 1 y 2: T002, y T005 con T006.
- US2: los ficheros de ataque T034, T040, T047, T050, T054, T060, T063, T067, T068 y T069.
- US3: T075, T076, T077, T078 y T079.
- US4 puede avanzar en paralelo a US2 y US3.
- Polish: T106 y T107.
- Las tareas de auditoría T011 a T023 pueden investigarse a la vez, pero escriben en el mismo `auditoria.md`: conviene
  integrar sus resultados de uno en uno.

---

## Parallel Example: User Story 2

```bash
# Escribir a la vez los ataques, cada uno en su fichero (deben fallar antes de corregir):
Task: "T034 Ataques de límites en apps/server/tests/seguridad/limites.test.ts"
Task: "T040 Ataques de cuentas en apps/server/tests/seguridad/cuentas.test.ts"
Task: "T050 Ataques de idempotencia en apps/server/tests/seguridad/idempotencia.test.ts"
Task: "T054 Ataques de superficie en apps/server/tests/seguridad/superficie.test.ts"
Task: "T063 Ataques de economía en apps/server/tests/seguridad/economia.test.ts"
```

---

## Implementation Strategy

### MVP (US1 y US2)

1. Completar Setup y Foundational.
2. Completar US1 y **parar a revisar el informe** con la persona responsable.
3. Completar US2: ningún crítico o alto abierto y todos los ataques bloqueados.
4. Validar con `pnpm seguridad`.

Con este MVP el sistema queda seguro, pero **la spec no se cierra** ni la beta se abre: faltan US3, US4, la repetición de
la auditoría (FR-007) y, para abrir al público, INI-12 (D-1).

### Entrega incremental

1. Setup + Foundational → verificación disponible.
2. US1 → informe con el alcance real.
3. US2 → vulnerabilidades cerradas.
4. US3 → administración sin consola.
5. US4 → robots.txt.
6. Polish → auditoría repetida y spec lista para cerrar.

---

## Notes

- Tres puntos del diseño se resuelven en estas tareas: el contador de denegados frente al *trigger* (T082), la CSP que no
  se puede probar contra Vite (T062) y el quickstart de producción bloqueado por la comprobación de origen (T104).
- T042 y T017 (rotación IPv6) añaden al plan dos comprobaciones que exigen FR-017 y FR-014.
- La severidad y la lista final de correcciones las fija el informe: si la auditoría descarta un indicio, su tarea se
  cierra indicando el motivo en `auditoria.md`.
