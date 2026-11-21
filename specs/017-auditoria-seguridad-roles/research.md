# Research: Auditoría de seguridad y roles

Decisiones técnicas de la spec 017. Lo «observado» se ha visto leyendo el código o ejecutando `pnpm audit` el
2026-11-21. **Ningún ataque se ha ejecutado todavía**: la auditoría debe reproducir cada problema y asignarle severidad.

## Auditoría y verificación

### R1. Informe e inventario

- **Decisión**: un único `auditoria.md` con hallazgos `SEG-NNN` y un `inventario.json` con cada ruta y mensaje: quién
  puede usarlo y qué lo protege. Una prueba compara el inventario con las rutas registradas en Fastify y los manejadores
  de la pasarela, y falla si falta alguno.
- **Razón**: FR-004 y SC-001 exigen que no falte ninguno, y la prueba mantiene esa garantía cuando se añadan rutas.
- **Alternativas**: inventario solo a mano (se queda viejo); generar el permiso desde el código (no prueba que alguien
  lo haya revisado).

### R2. Una sola verificación

- **Decisión**: `pnpm seguridad` ejecuta `apps/server/tests/seguridad/` con Vitest y su informe JSON, y escribe
  `verificacion.md`: ataque en lenguaje claro, hallazgo y resultado. Cada test se llama `SEG-NNN: <ataque>`. Se añade al CI.
- **Razón**: FR-010, FR-011 y Principio IX, con el mismo patrón legible que `pnpm balance`.
- **Alternativas**: herramienta de terceros (no conoce las reglas del juego).

## Correcciones

### R3. Idempotencia por cuenta

- **Observado**: el gancho global se ejecuta **antes** que la comprobación de sesión de cada ruta y usa solo URL y
  clave. Guarda también los 4xx y las peticiones sin sesión. Si alguien envía `Idempotency-Key` al hacer login, la
  respuesta guardada contiene el correo y el token de sesión. Los `requestId` del WebSocket se comparten dentro de la partida.
- **Decisión**:
  - un gancho `onRoute` coloca la lectura de idempotencia **después** de los `preHandler` de cada ruta;
  - el ámbito pasa a `http:<usuario>:<método>:<ruta sin query>` y `ws:<partida>:<participante>`;
  - solo se guardan respuestas 2xx de personas autenticadas, con clave de 128 caracteres como máximo;
  - en WebSocket no se guardan los mensajes rechazados por su esquema;
  - una tarea horaria borra las filas de más de 7 días (índice por `creada_en`).
- **Razón**: FR-025 y los dos casos límite de la spec, sin cambiar la interfaz del almacén.
- **Alternativas**: tabla nueva con `usuario_id` (más migración sin ganar nada).

### R4. Identificar al cliente real

- **Decisión**: variable `PROXIES_CONFIANZA` (número de proxies delante del servidor) pasada a `trustProxy` de Fastify.
  Es obligatoria en producción; `0` significa sin proxy.
- **Razón**: con `true` cualquiera falsifica `X-Forwarded-For`, y sin configurar toda la beta compartiría una IP (FR-014).
- **Además**: `advanced.ipAddress.disableIpTracking` en Better Auth, porque hoy guarda en `sesiones.ip` un valor que
  puede venir de esa cabecera y es un dato personal que el juego no usa.

### R5. Límites de uso

- **Decisión**: se reutiliza `Limitador` con los valores de FR-013, y:
  - el límite por sesión pasa a aplicarse **después** de validar la sesión, con el id de usuario como clave;
  - un límite amplio por IP en `/api/` (300 de ráfaga, 100/s) protege lo que va sin sesión; este valor es inicial;
  - los fallos por cuenta solo gastan ficha al fallar, y un restablecimiento correcto los borra, para que nadie pueda
    bloquear a otra persona de forma permanente;
  - `Limitador` gana un tope real de claves: hoy, si ningún cubo está lleno, el mapa crece sin límite;
  - la prueba de carga usa `LIMITES_DESACTIVADOS=1`, y el servidor se niega a arrancar con ella en producción.
- **Alternativas**: `@fastify/rate-limit` (dependencia nueva para lo que ya hace `Limitador`); Redis (hay una sola réplica).

### R6. Cerrar la API interna de autenticación

- **Decisión**: se elimina la ruta pública `/api/auth/ba/*`. Las rutas del contrato siguen llamando a `auth.api.*`.
- **Observado**: ni la web, ni las pruebas ni las herramientas la usan. Hoy permite saltarse las validaciones y los límites.
- **Razón**: FR-015 con una eliminación en lugar de duplicar controles.

### R7. Sesión y peticiones de otros sitios

- **Decisión**: se mantienen `HttpOnly`, `SameSite=Lax` y `Secure`. Un gancho rechaza con 403 los POST, PUT y DELETE cuyo
  `Origin` exista y no sea `PUBLIC_URL`. No se registra CORS.
- **Razón**: FR-017 y FR-030. Las rutas envueltas no pasan por la comprobación de origen del manejador de Better Auth.

### R8. Revocar conexiones en tiempo real

- **Decisión**: cada conexión guarda su id de sesión. Cada 3 s, una consulta devuelve las sesiones vigentes de cuentas
  no suspendidas y la pasarela cierra con `4401` el resto.
- **Razón**: cubre con un solo mecanismo logout, caducidad, restablecimiento, suspensión, borrado y órdenes de consola
  de otro proceso, dentro de los 5 s de FR-018 y SC-007.
- **Alternativas**: leer la sesión en cada mensaje (hasta 800 conexiones a 4 mensajes/s); avisar desde cada operación
  (se olvida alguna y no llega desde la consola).

### R9. Protecciones del navegador

- **Decisión**: un gancho `onSend` propio envía CSP, `Strict-Transport-Security` (solo en producción),
  `X-Content-Type-Options`, `Referrer-Policy: no-referrer`, `frame-ancestors 'none'` y `Permissions-Policy`.
  CSP: `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' <wss público>;
  object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`.
- **Observado**: la web compilada tiene un único script externo y no carga recursos de terceros. React aplica `style`
  por el DOM, lo que CSP permite. Si un e2e detecta otra cosa, se añade solo lo que haga falta.
- **Alternativas**: `@fastify/helmet` (dependencia nueva para seis cabeceras).

### R10. Métricas y salud

- **Decisión**: en producción `/metrics` exige `Authorization: Bearer <METRICAS_TOKEN>` con comparación de tiempo
  constante; sin token configurado responde 404. `/healthz` devuelve solo `{ "estado": "ok" }` o 503.
- **Razón**: FR-033 pide que no dependa del proxy. Un segundo puerto obligaría a cambiar el despliegue.

### R11. Registros y errores

- **Decisión**: serializador de petición sin query string, `redact` de cookies, autorización, contraseñas y tokens, y
  errores de SMTP reducidos a su código, porque pueden incluir destinatarios. La web quita el token de la dirección en
  cuanto lo lee.
- **Razón**: FR-020 y FR-035. El enlace de recuperación entra por `GET /?restablecer=…`, que hoy se registra entero.
- **Además**: en producción, un `GET` a una ruta `/api/` inexistente devuelve hoy la web; pasa a 404 JSON.

### R12. Arranque seguro

- **Decisión**: función pura `validarEntornoProduccion(env)` en `entorno.ts`, llamada desde `main.ts`. Rechaza:
  `AUTH_SECRET` ausente, de menos de 32 caracteres o de ejemplo; `PUBLIC_URL` sin HTTPS; `DATABASE_URL` con la credencial
  de ejemplo; `PROXIES_CONFIANZA` ausente; `METRICAS_TOKEN` corto; `LIMITES_DESACTIVADOS`. Nombra la variable, nunca su valor.
- **Razón**: FR-036.

### R13. Pago simulado

- **Observado**: `comprarCosmetico`, `comprarPack` y `comprarPase` con `moneda: 'eur'` entregan el producto sin cobrar.
- **Decisión**: `ServicioEconomia` recibe `pagoSimulado` (falso en producción). El rechazo va en `comprar()`, después de
  buscar una compra ya hecha, con `409 PAGO_NO_DISPONIBLE`. `GET /api/tienda` y `GET /api/cosmeticos` añaden
  `pagoEuros: boolean` para que la web muestre la opción como no disponible.
- **Razón**: un solo punto para todos los productos (FR-028, D-1).

### R14. Dependencias e imagen

- **Observado** (`pnpm audit --prod`): 53 avisos, con 3 críticos y 8 altos. Con desarrollo: 3 críticos y 14 altos.

  | Paquete | Severidad | Origen | Decisión |
  |---|---|---|---|
  | `vitest`, `tinypool`, `vite` | 3 críticos, 1 alto | Dependencia par opcional de `better-auth` | Sacarlos de producción |
  | `nodemailer` 6.10 | 5 altos | Directa | Subir a 10.x |
  | `@fastify/static` 8.3 | 1 alto | Directa | Subir a 10.x (admite Fastify 5) |
  | `zod` 3.25 | 1 alto | Directa | Subir a 4.x |

- **Decisión**:
  - un `.pnpmfile.cjs` retira `vitest` de las dependencias par de `better-auth`, y el Dockerfile lo copia;
  - en zod 4 hay que dar dos argumentos a los 7 `z.record(...)`, y `uuid()` pasa a ser más estricto;
  - `vitest` de desarrollo sube a 3.2.x o superior para que `pnpm audit` completo tampoco dé altos ni críticos (SC-011);
  - el CI añade `pnpm audit --prod --audit-level=high`.
- **Sin confirmar**: un `pnpm deploy --prod` de prueba incluyó `vite`, `tinypool` y partes de `@vitest`, pero el comando
  terminó con código 127. La auditoría debe confirmarlo sobre la imagen Docker real.

### R15. Imagen

- **Observado**: ya corre como `node`, en dos etapas y con un `.dockerignore` que excluye `.env`.
- **Decisión**: la auditoría comprueba que la imagen final no contenga herramientas de pruebas, código fuente ni
  secretos. No se cambia nada más salvo hallazgo.

## Roles y administración

### R16. Modelo de roles

- **Decisión**: columna `usuarios.rol` (`jugador`, `betatester`, `administrador`). «Invitado» se deriva de `es_invitado`,
  y un *check* impide que un invitado tenga otro rol. La matriz de FR-041 va en `packages/domain/src/roles`. Better Auth
  expone `rol` como campo adicional con `input: false`.
- **Razón**: una sola fuente de verdad, sin migrar datos ni sincronizar dos campos. `input: false` evita que alguien se
  asigne un rol al registrarse. Sin caché de sesión en cookie, el cambio se aplica en la siguiente petición (FR-042).
- **Alternativas**: plugin `admin` de Better Auth (añade rutas y suplantación que la spec no pide).
- **Clasificación**: `/api/perfil/aspecto` cuenta como «Jugar sus partidas» porque el draft lo usa también con invitados.
  El perfil de la matriz es `/api/perfil`, que ya rechaza a los invitados.

### R17. Último administrador

- **Decisión**: los cambios de rol van en una transacción con `pg_advisory_xact_lock`, que vuelve a leer actor y objetivo
  y cuenta los administradores activos.
- **Razón**: resuelve el caso de dos administradores que se quitan el rol a la vez (FR-043).

### R18. Registro inalterable

- **Decisión**: tabla `registro_admin`, solo con inserción y lectura en el código, más un *trigger* que rechaza `UPDATE` y
  `DELETE`. Única excepción: vaciar `motivo` al eliminar la cuenta afectada, porque es texto libre. Guarda ids, no correos
  ni apodos. Los intentos denegados se agrupan por actor, acción y 10 s, con un contador `intentos`.
- **Razón**: FR-047 y D-4. Sin agrupar, una cuenta podría llenar la base de datos llamando a rutas de administración.

### R19. Suspensión

- **Decisión**: columna `usuarios.suspendida_en`. Suspender, en una transacción, la marca, borra las sesiones y escribe
  el registro. `databaseHooks.session.create.before` impide crear sesiones, y solo se llega ahí con la contraseña correcta,
  así que el mensaje no revela cuentas a terceros (FR-016). La lectura de sesión también comprueba la columna.
- **Razón**: FR-018 y FR-048, con el historial en el registro y sin otra tabla.

### R20. Entrega a betatesters

- **Decisión**: `ServicioEconomia.entregarBetatester` bloquea el saldo, relee el rol y anota el movimiento
  `entrega_betatester` con el `idEntrega` del cliente como referencia, bajo un índice único parcial. El registro va en la
  misma transacción.
- **Razón**: reutiliza `sumar` y el patrón de `recompensa_torneo` (FR-026, FR-050a).

### R21. Cierre de partidas y órdenes de consola

- **Decisión**:
  - evento de dominio `cerrar_admin`, que lleva a `abandonada`, y aviso nuevo `partida_cerrada` con un texto genérico: el
    motivo queda solo en el registro;
  - solo se devuelve el cobro de rareza en `buscando`, como hoy;
  - `terminarTorneo` y las simulaciones en curso comprueban el estado para que una partida cerrada no reparta premios;
  - como cada partida vive en la memoria del servidor, la orden de consola escribe en `ordenes_consola`; el servidor la
    recoge cada 2 s y la consola espera el resultado hasta 15 s. Las órdenes de más de 60 s se descartan.
- **Razón**: FR-046 y FR-049. Sondear son pocas líneas y funciona igual con cualquier proxy. `LISTEN/NOTIFY` necesitaría
  una conexión dedicada.

### Panel web

La pantalla `/admin` se carga de forma diferida y solo se enlaza a administradores. Es comodidad: el control está en el
servidor (FR-021). Detalle en [contracts/ui.md](contracts/ui.md).

## Superficie pública y contraste

### R22. robots.txt

- **Decisión**:

  ```text
  User-agent: *
  Allow: /$
  Allow: /assets/
  Allow: /fuentes/
  Allow: /marca/
  Disallow: /
  ```

- **Razón**: `Allow: /$` no coincide con `/?restablecer=…`, y todo lo futuro queda bloqueado (FR-052). La portada es una
  aplicación React: sin sus recursos, un buscador la vería en blanco. Permitir rastrear esos ficheros no indexa pantallas.

### R23. Escaneo externo

- **Decisión**: `zap-baseline` y `zap-api-scan` con la imagen `ghcr.io/zaproxy/zaproxy:stable` contra el servidor local en
  modo producción. No entra en el CI: se ejecuta en la auditoría y al repetirla.
- **Razón**: D-5, sin servicios de pago.

### R24. Borrado de cuentas con pase premium

- **Observado**: `pases_premium.usuario_id` no tiene `ON DELETE CASCADE`. Al borrar una cuenta con pase, la base de datos
  debería rechazarlo después de haber cerrado la sesión, con un error 500 y la cuenta intacta.
- **Decisión**: la migración añade la cascada y una prueba lo cubre. Además, la baja borra la cuenta antes de devolver las
  cookies de cierre.
- **Razón**: afecta al derecho a eliminar los datos personales y a FR-018.
