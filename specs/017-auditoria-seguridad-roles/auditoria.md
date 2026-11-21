# Informe de auditoría de seguridad

**Spec**: [017-auditoria-seguridad-roles](spec.md) | **Fecha**: 2026-11-21 | **Estado**: segunda ronda terminada: 31 hallazgos corregidos y 1 nuevo pendiente de decisión (SEG-032)

## Resumen

**La beta no puede abrirse todavía.** Los 31 hallazgos de la primera pasada están corregidos y `pnpm seguridad` bloquea
121 ataques. Falta decidir SEG-032, hacer los roles y el panel (US3), repetir la auditoría y ZAP (T103, T105) y tener
pagos reales (INI-12).

Hallazgos de la primera pasada:

| Severidad | Hallazgos | Qué significa aquí |
|---|---|---|
| Crítica | 1 | Cualquiera, sin cuenta, puede llenar la base de datos y tirar el servicio |
| Alta | 7 | Productos de pago gratis, prueba de contraseñas sin freno, controles que se pueden saltar y datos ajenos a la vista |
| Media | 13 | Defensas que faltan o se esquivan, pero que necesitan algo más para causar daño |
| Baja | 10 | Mejoras de endurecimiento, sin un ataque demostrado |

Lo que **ha resistido** los ataques:

- Nadie puede modificar la partida, el equipo, la colección o las compras de otra cuenta.
- El draft rechaza cartas de otro sobre, turnos falsos y elecciones repetidas, y no revela las elecciones ajenas.
- 50 compras simultáneas cobran una sola vez, el saldo nunca es negativo y siempre cuadra con sus movimientos.
- Un invitado no puede apropiarse de una cuenta existente.
- El enlace de recuperación es de un solo uso y caduca en una hora.
- No se ha encontrado inyección SQL, XSS ni inyección en correos.

### Decisiones de la persona responsable (2026-11-21)

1. **SEG-016**: 10 partidas en curso por cuenta registrada y 3 por invitado (FR-032a).
2. **SEG-031**: `testcontainers` sube a la 11.14, sin cambiar la versión mínima de Node (FR-038, SC-011).
3. **ZAP**: se añaden `Cross-Origin-Opener-Policy` y `Cross-Origin-Resource-Policy`, sin `Cross-Origin-Embedder-Policy`
   (FR-029). Ver [Escaneo externo](#escaneo-externo-owasp-zap).

## Criterios de severidad (FR-002)

| Severidad | Criterio |
|---|---|
| Crítica | Tomar el control de cuentas ajenas, ejecutar código en el servidor, acceder a los datos de todas las cuentas o dejar el servicio inutilizable con un esfuerzo mínimo y sin cuenta |
| Alta | Leer o modificar datos o partidas de otra cuenta, alterar el resultado competitivo, obtener fragmentos, cartas o productos de pago sin ganarlos o pagarlos, o eludir un control de seguridad |
| Media | Debilita una defensa o filtra información limitada, y necesita condiciones adicionales para causar daño |
| Baja | Mejora de endurecimiento sin vía de ataque demostrada |

## Cómo se ha comprobado

- Todos los ataques se lanzaron contra entornos propios y desechables (FR-005): PostgreSQL efímero con Testcontainers y
  servidores locales, en modo desarrollo o simulando producción con `iniciarServidorAtaque`
  (`apps/server/tests/seguridad/ayudas.ts`).
- La imagen Docker real se construyó e inspeccionó, y ZAP se lanzó contra ella en una red y una base de datos aisladas.
- Los puntos de entrada están en [inventario.json](inventario.json): 75 rutas HTTP y 9 mensajes WebSocket. La prueba
  `pnpm --filter @fbd/server test:integration inventario` falla si falta o sobra alguno.
- Las evidencias usan cuentas inventadas. Este informe no contiene secretos, tokens ni datos personales reales.

### Límites de esta pasada

- El punto exacto en que el servicio se satura (SEG-001, SEG-016) **no se ha medido**: se documenta el crecimiento sin límite.
- De la revocación de sesiones en WebSocket (SEG-006) solo se ha ejecutado el caso de cierre de sesión. Los demás
  (restablecimiento, caducidad, borrado) comparten el mismo mecanismo y los cubrirá T047.
- Para los avisos de dependencias no se ha construido un ataque propio: se tratan como aplicables y se corrigen subiendo
  de versión.
- ZAP usó identificadores de ejemplo, así que en las rutas con `:id` probó sobre todo la capa de validación. La inyección
  en esas rutas se apoya también en la revisión del código.

## Resultado por área (FR-003)

Esta tabla describe la primera pasada. El estado actual está en la ficha de cada hallazgo.

| # | Área | Qué se revisó | Resultado | Hallazgos |
|---|---|---|---|---|
| 1 | Autenticación y sesiones | API interna, cookie, token en respuestas, fuerza bruta, enumeración por respuesta y tiempo | Cookie correcta (`HttpOnly`, `Secure`, `SameSite=Lax`); faltan límites y sobra la API interna | SEG-003, 004, 025, 028, 029 |
| 2 | Invitados y paso a registrados | Reclamar un correo existente, conversión, login con sesión de invitado | **Sin hallazgos**: no da acceso a la cuenta y solo transfiere las partidas de ese invitado | Ninguno |
| 3 | Recuperación de contraseña | Un solo uso, caducidad, revocación de sesiones, token en registros y dirección | El token funciona bien; se filtra a los registros | SEG-012, 014, 030 |
| 4 | Autorización | Las 26 rutas con recurso, con una cuenta ajena y sin sesión; acciones de anfitrión; avisos ajenos | Sin sesión, 401 en todas. Una cuenta ajena solo puede **leer** el resumen de la partida | SEG-007 |
| 5 | Tiempo real | Origen, sesión, participante, tamaño, inundación, `requestId`, sesión revocada | La conexión se valida bien; el socket sobrevive al cierre de sesión | SEG-006, 020 |
| 6 | Integridad del juego | Carta de otro sobre o inexistente, turno y ronda falsos, duplicados, alineación con jugador ajeno, visibilidad | **Sin hallazgos** | Ninguno |
| 7 | Tienda y economía | Pago simulado, 50 compras iguales y distintas, `idCompra` ajeno, precio y moneda manipulados, cuadre de saldos | La concurrencia y los precios son correctos; el pago simulado entrega productos gratis | SEG-002, 017 |
| 8 | Entradas y límites | Cookies inventadas, proxy, bucles sin sesión, almacén de peticiones, `Limitador`, cuerpo grande | Sin límites efectivos fuera de las sesiones reales | SEG-001, 005, 013, 014, 015, 016, 022, 026 |
| 9 | Protecciones del navegador | Cabeceras, CORS, peticiones de otro origen | No hay CORS abierto; faltan todas las cabeceras | SEG-011, 019 |
| 10 | Inyección | Todo `sql` del servidor, ids y filtros manipulados, HTML en nombres, `dangerouslySetInnerHTML` | **Sin hallazgos explotables**: no hay `sql.raw` ni HTML sin escapar | SEG-026 (endurecimiento) |
| 11 | Rutas técnicas y de desarrollo | `/metrics`, `/healthz`, `/api/dev/*`, API inexistente | `/api/dev/*` no existe en producción; `/metrics` es público | SEG-010, 023, 024 |
| 12 | Errores y datos personales en registros | Contraseñas, tokens, cookies, correos, query strings, errores SMTP, errores internos | Sin contraseñas ni cookies; sí tokens de la dirección y correos en errores SMTP | SEG-012, 018, 027 |
| 13 | Secretos y configuración | Validación al arrancar, valores de ejemplo | Solo se comprueba que el secreto exista | SEG-021 |
| 14 | Imagen de despliegue | Usuario, contenido, secretos, herramientas | Corre como `node`, sin escritura en `/app`, sin secretos ni código fuente; incluye herramientas de pruebas | SEG-009 |
| 15 | Dependencias | `pnpm audit` de producción y completo | 3 críticos y 8 altos en producción | SEG-008, 009, 031 |
| 16 | Correo | Inyección de cabeceras y destinatarios, enlaces con otro `Host` | **Sin hallazgos** de inyección: los enlaces usan siempre `PUBLIC_URL`. Los errores SMTP filtran el correo | SEG-018 |

## Hallazgos

### SEG-001. Cualquiera, sin cuenta, puede llenar la base de datos

- **Área**: validación de entradas y límites de uso
- **Severidad**: crítica. Deja el servicio inutilizable con un esfuerzo mínimo y sin cuenta.
- **Evidencia**: enviar 300 `POST /api/no-existe/<n>` sin sesión, cada uno con una `Idempotency-Key` distinta de 4.000
  caracteres. Resultado: 300 filas nuevas en `peticiones_procesadas` y 368 KB más, con contenido muy comprimible. Ninguna
  fila caduca, no hay límite por IP y la clave se guarda entera.
- **Riesgo**: al ritmo medido, 1 GB son unas 850.000 peticiones. Al llenarse el disco, la base de datos deja de aceptar
  escrituras y el juego se detiene para todas las personas.
- **Estado**: corregido
- **Cierre**: ataques `SEG-001` de `tests/seguridad/` (idempotencia).

### SEG-002. Los productos de pago se obtienen gratis en producción

- **Área**: tienda y economía
- **Severidad**: alta. Permite obtener productos de pago sin pagarlos.
- **Evidencia**: con `NODE_ENV=production` y una cuenta sin saldo, `POST /api/tienda/cosmeticos/<id>/comprar`,
  `/api/tienda/packs/<id>/comprar` y `/api/tienda/pase-premium` con `moneda: "eur"` responden 200. El pase queda activo,
  el saldo sigue en 0 y las tres compras se guardan como simuladas.
- **Riesgo**: cualquiera obtiene todos los cosméticos y el pase premium sin pagar.
- **Estado**: corregido
- **Cierre**: ataques `SEG-002` de `tests/seguridad/` (economia).

### SEG-003. Se pueden probar contraseñas sin ningún freno

- **Área**: autenticación y sesiones
- **Severidad**: alta. No hay ningún control que impida adivinar contraseñas.
- **Evidencia**: 100 `POST /api/auth/login` seguidos contra una cuenta con contraseñas erróneas, cambiando la cookie y
  `X-Forwarded-For`: los 100 se evalúan (401) y ninguno se limita. Después, la contraseña correcta entra sin problema.
- **Riesgo**: un atacante puede probar listas de contraseñas filtradas contra cualquier cuenta.
- **Estado**: corregido
- **Cierre**: ataques `SEG-003` de `tests/seguridad/` (limites). Queda el riesgo de bloqueo dirigido descrito en SEG-032.

### SEG-004. La API interna de autenticación permite saltarse las validaciones

- **Área**: autenticación y sesiones
- **Severidad**: alta. Elude un control de seguridad.
- **Evidencia**: `/api/auth/ba/*` está abierta. `POST /api/auth/ba/sign-up/email` crea una cuenta con un apodo de 1 letra.
  `POST /api/auth/ba/update-user` guarda un apodo de 300 caracteres con HTML. `POST /api/auth/ba/change-password` cambia
  la contraseña y deja **abiertas las demás sesiones**. `GET /api/auth/ba/list-sessions` devuelve el token y la IP de
  cada sesión de la cuenta.
- **Riesgo**: cualquier límite que se añada a las rutas públicas se podría esquivar por aquí, y quien haya robado una
  sesión la conserva aunque la víctima cambie la contraseña.
- **Estado**: corregido
- **Cierre**: ataques `SEG-004` de `tests/seguridad/` (cuentas).

### SEG-005. Las respuestas guardadas se entregan a otra persona, incluso sin sesión

- **Área**: validación de entradas y límites de uso
- **Severidad**: alta. Permite leer datos de otra cuenta. Necesita conocer la clave, un UUID aleatorio del cliente.
- **Evidencia**: la víctima hace login con `Idempotency-Key: K`. Otra petición **sin sesión**, con la misma clave y una
  contraseña errónea, recibe 200 con el correo de la víctima y su token. Ese token sin firmar no abre sesión (401). Con
  una compra ocurre igual: quien repite la clave sin sesión recibe la respuesta de la compra ajena.
- **Riesgo**: quien obtenga una clave (registros, proxy, extensión del navegador) lee la respuesta de otra cuenta.
- **Estado**: corregido
- **Cierre**: ataques `SEG-005` de `tests/seguridad/` (idempotencia).

### SEG-006. Una sesión cerrada sigue activa en el canal en tiempo real

- **Área**: canal en tiempo real
- **Severidad**: alta. Elude el cierre de sesión.
- **Evidencia**: abrir un WebSocket y hacer `POST /api/auth/logout` con la misma cookie. La API ya responde 401, pero 6 s
  después el socket sigue abierto y responde a los mensajes.
- **Riesgo**: quien haya robado una sesión sigue jugando y recibiendo datos de la partida aunque la víctima cierre sesión.
- **Estado**: corregido
- **Cierre**: ataques `SEG-006` de `tests/seguridad/` (sesiones).

### SEG-007. Cualquier cuenta puede leer el resumen de una partida ajena

- **Área**: autorización de cada acción
- **Severidad**: alta. Permite leer datos de una partida de otra cuenta.
- **Evidencia**: una cuenta que no participa hace `GET /api/partidas/<id>` de una partida en torneo y recibe 200 con el
  id de la cuenta anfitriona, los nombres de los participantes, su estado de conexión y la configuración.
- **Riesgo**: quien conozca el id de una partida ve quién juega y cuándo está conectado. La corrección debe mantener
  visible la sala de las partidas abiertas, porque unirse depende de ella.
- **Estado**: corregido
- **Cierre**: ataques `SEG-007` de `tests/seguridad/` (autorizacion).

### SEG-008. Dependencias de producción con vulnerabilidades altas

- **Área**: dependencias
- **Severidad**: alta. Son avisos altos en código que se ejecuta en producción.
- **Evidencia**: `pnpm audit --prod`. Ver la [tabla de dependencias](#dependencias). Destacan el salto de protección de
  rutas de `@fastify/static` y los bloqueos por direcciones de correo de `nodemailer`.
- **Riesgo**: bloqueo del servidor o acceso a rutas protegidas, según el aviso.
- **Estado**: corregido
- **Cierre**: ataques `SEG-008` de `tests/seguridad/` (dependencias).

### SEG-009. La imagen de producción incluye herramientas de pruebas

- **Área**: imagen de despliegue
- **Severidad**: media. Incluye paquetes con avisos críticos, pero el servidor no los carga.
- **Evidencia**: en la imagen construida, `node_modules/.pnpm` contiene `tinypool` 1.1.1 (2 críticos), `vite` 5.4.21
  (alto), varias partes de `@vitest`, `tsx`, `esbuild` y `rollup`. Llegan como dependencia par opcional de `better-auth`.
- **Riesgo**: más superficie si alguien consigue ejecutar algo en el contenedor, y `pnpm audit --prod` nunca queda limpio.
- **Estado**: corregido
- **Cierre**: ataques `SEG-009` de `tests/seguridad/` (dependencias). La imagen final no contiene `vitest`, `vite`, `tinypool`, `tsx`, `esbuild` ni `rollup`. También se retiró `drizzle-kit` como dependencia par, porque arrastraba `tsx`.

### SEG-010. Las métricas internas son públicas

- **Área**: exposición de rutas técnicas y de desarrollo
- **Severidad**: media. Filtra información limitada.
- **Evidencia**: en producción, `GET /metrics` sin credenciales responde 200 con 38 series, incluidas las del proceso.
- **Riesgo**: revela la carga y la actividad del servidor, útil para preparar un ataque.
- **Estado**: corregido
- **Cierre**: ataques `SEG-010` de `tests/seguridad/` (superficie).

### SEG-011. No se envía ninguna protección del navegador

- **Área**: protecciones del navegador
- **Severidad**: media. Debilita la defensa frente a XSS y a la incrustación en otros sitios.
- **Evidencia**: las respuestas de `/` y de la API no llevan `Content-Security-Policy`, `Strict-Transport-Security`,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` ni `X-Frame-Options`. ZAP lo confirma.
- **Riesgo**: la web se puede incrustar en otro sitio para engañar a quien juega, y un fallo de XSS futuro no tendría
  ninguna barrera.
- **Estado**: corregido
- **Cierre**: ataques `SEG-011` de `tests/seguridad/` (superficie).

### SEG-012. El token de recuperación queda en los registros

- **Área**: errores y datos personales en registros
- **Severidad**: media. Permite tomar una cuenta, pero exige acceso a los registros en la hora de validez.
- **Evidencia**: con el registro de producción, `GET /?restablecer=<valor>` y `GET /api/...?secreto=<valor>` dejan ambos
  valores en el registro de peticiones.
- **Riesgo**: quien lea los registros o el servicio donde se guarden puede restablecer la contraseña de otra cuenta.
- **Estado**: corregido
- **Cierre**: ataques `SEG-012` de `tests/seguridad/` (superficie).

### SEG-013. El límite de peticiones se esquiva con cookies inventadas

- **Área**: validación de entradas y límites de uso
- **Severidad**: media. Elude un límite, aunque por sí solo no da acceso a nada.
- **Evidencia**: 200 peticiones simultáneas con una sesión real: 63 aceptadas y 137 con 429. Las mismas 200 con una
  cookie inventada distinta cada vez, o sin cookie: las 200 aceptadas.
- **Riesgo**: se puede saturar el servidor sin ningún freno.
- **Estado**: corregido
- **Cierre**: ataques `SEG-013` de `tests/seguridad/` (limites).

### SEG-014. Detrás del proxy, toda la beta compartiría un solo cupo

- **Área**: validación de entradas y límites de uso
- **Severidad**: media. Una persona puede impedir a otras recuperar su cuenta.
- **Evidencia**: 5 `POST /api/auth/recuperar` con `X-Forwarded-For: <cliente A>`. La siguiente, con `<cliente B>`, recibe
  429: el servidor no distingue a los clientes.
- **Riesgo**: en producción, una sola persona agotaría la recuperación de contraseña de todas las demás.
- **Estado**: corregido
- **Cierre**: ataques `SEG-014` de `tests/seguridad/` (limites).

### SEG-015. Registro e invitados sin límite

- **Área**: validación de entradas y límites de uso
- **Severidad**: media. Permite crear cuentas en masa.
- **Evidencia**: 12 registros y 30 invitados seguidos desde el mismo cliente: todos aceptados.
- **Riesgo**: llenar la base de datos de cuentas falsas y alimentar otros abusos.
- **Estado**: corregido
- **Cierre**: ataques `SEG-015` de `tests/seguridad/` (limites).

### SEG-016. Una cuenta puede crear partidas sin tope

- **Área**: validación de entradas y límites de uso
- **Severidad**: media. Consume memoria y temporizadores del servidor; no se ha medido el punto de saturación.
- **Evidencia**: un solo invitado crea 60 partidas de 8 plazas seguidas: todas 201 y las 60 quedan activas en memoria.
- **Riesgo**: combinado con SEG-015, se podría agotar la memoria del servidor sin cuenta.
- **Estado**: corregido
- **Cierre**: ataques `SEG-016` de `tests/seguridad/` (limites). Al corregirlo se detectó y arregló un cuelgue propio: 40 creaciones simultáneas agotaban las conexiones. Tiene su ataque.

### SEG-017. Una cuenta con pase premium no se puede eliminar

- **Área**: autenticación y sesiones
- **Severidad**: media. No da nada a un atacante, pero impide ejercer el derecho a borrar los datos.
- **Evidencia**: `DELETE /api/cuenta` de una cuenta con pase responde 500. La cuenta sigue existiendo y su sesión ya se ha cerrado.
- **Riesgo**: quien haya comprado el pase no puede borrar sus datos personales.
- **Estado**: corregido
- **Cierre**: ataques `SEG-017` de `tests/seguridad/` (cuentas).

### SEG-018. Los errores de correo guardan la dirección del destinatario

- **Área**: errores y datos personales en registros
- **Severidad**: media. Filtra un dato personal a quien lea los registros.
- **Evidencia**: con un servidor SMTP que rechaza al destinatario, el registro del error contiene su dirección de correo.
- **Riesgo**: datos personales en los registros, en contra de FR-035.
- **Estado**: corregido
- **Cierre**: ataques `SEG-018` de `tests/seguridad/` (superficie).

### SEG-019. El servidor acepta cambios enviados desde otros sitios

- **Área**: protecciones del navegador
- **Severidad**: media. `SameSite=Lax` lo frena en los navegadores, pero no hay una segunda barrera.
- **Evidencia**: `PUT /api/perfil` con sesión y `Origin: https://ajeno.test` responde 200 y aplica el cambio.
- **Riesgo**: si la cookie llegara a enviarse (subdominio comprometido, navegador antiguo), otra web actuaría en nombre
  de quien juega.
- **Estado**: corregido
- **Cierre**: ataques `SEG-019` de `tests/seguridad/` (superficie).

### SEG-020. Un error o un mensaje ajeno consume la clave de reintento

- **Área**: canal en tiempo real
- **Severidad**: media. Puede anular una acción legítima, pero exige conocer la clave.
- **Evidencia**: por HTTP, una petición sin sesión con la clave K guarda el 401, y la petición legítima con K recibe ese
  401. Por WebSocket, un mensaje mal formado gasta su `requestId`, y otro participante que use ese id recibe la
  respuesta ajena sin que su acción se ejecute.
- **Riesgo**: una acción legítima se pierde y la persona ve un error que no es suyo.
- **Estado**: corregido
- **Cierre**: ataques `SEG-020` de `tests/seguridad/` (idempotencia).

### SEG-021. El servidor arranca en producción con configuración insegura

- **Área**: secretos y configuración
- **Severidad**: media. Requiere un error al desplegar.
- **Evidencia**: `apps/server/src/main.ts` solo comprueba que `AUTH_SECRET` exista. La imagen arrancó en producción con
  `PUBLIC_URL` en `http://`, y el valor de ejemplo de `.env.example` sería aceptado.
- **Riesgo**: con el secreto de ejemplo, cualquiera podría falsificar la firma de las sesiones.
- **Estado**: corregido
- **Cierre**: ataques `SEG-021` de `tests/seguridad/` (entorno).

### SEG-022. El limitador puede crecer y ralentizarse con muchas claves

- **Área**: validación de entradas y límites de uso
- **Severidad**: baja. Con los límites actuales no se alcanza; sí con los nuevos, de ventana más larga.
- **Evidencia**: con 12.000 claves sin ningún cubo lleno, el mapa no se reduce y cada petición tarda unos 132 µs en
  recorrerlo.
- **Riesgo**: consumo creciente de memoria y CPU si un atacante rota direcciones.
- **Estado**: corregido
- **Cierre**: ataques `SEG-022` de `tests/seguridad/` (limites).

### SEG-023. Las rutas inexistentes responden de forma incorrecta

- **Área**: exposición de rutas técnicas y de desarrollo
- **Severidad**: baja. Sin vía de ataque.
- **Evidencia**: en producción, `GET /api/no-existe` devuelve la web con 200, y `POST /api/no-existe?token=x` repite la
  dirección completa en el error JSON. `/robots.txt` y `/sitemap.xml` también devuelven la web.
- **Riesgo**: confunde a clientes y escáneres, y refleja datos de la petición.
- **Estado**: corregido
- **Cierre**: ataques `SEG-023` de `tests/seguridad/` (robots, superficie).

### SEG-024. La comprobación de salud revela el estado de la base de datos

- **Área**: exposición de rutas técnicas y de desarrollo
- **Severidad**: baja. Información mínima.
- **Evidencia**: `GET /healthz` incluye el campo `baseDatos`.
- **Riesgo**: indica a un atacante si su ataque a la base de datos está funcionando.
- **Estado**: corregido
- **Cierre**: ataques `SEG-024` de `tests/seguridad/` (superficie).

### SEG-025. Login y registro devuelven el token en el cuerpo

- **Área**: autenticación y sesiones
- **Severidad**: baja. Sin la firma, el token no abre sesión (401).
- **Evidencia**: las respuestas de `POST /api/auth/login` y `/registro` incluyen el campo `token`.
- **Riesgo**: el código de la página puede leer un dato de la sesión, en contra de FR-017.
- **Estado**: corregido
- **Cierre**: ataques `SEG-025` de `tests/seguridad/` (cuentas).

### SEG-026. Nombres y apodos admiten HTML y caracteres de control

- **Área**: inyección de código y de consultas
- **Severidad**: baja. Se muestran como texto: no se ha podido ejecutar nada.
- **Evidencia**: `PUT /api/partidas/<id>/nombre-equipo` acepta `<img src=x onerror=1>` y lo guarda literal. La web no usa
  `dangerouslySetInnerHTML`. Un salto de línea se normaliza a espacio en el nombre del equipo, pero el apodo del
  registro solo comprueba su longitud.
- **Riesgo**: una pantalla o un correo futuros que no escapen el texto abrirían un XSS.
- **Estado**: corregido
- **Cierre**: ataques `SEG-026` de `tests/seguridad/` (entradas).

### SEG-027. Se guardan direcciones IP que el juego no usa

- **Área**: errores y datos personales en registros
- **Severidad**: baja. Dato personal innecesario.
- **Evidencia**: la tabla de sesiones guarda `ipAddress` (visible en `list-sessions`) y el registro de peticiones incluye
  `remoteAddress`.
- **Riesgo**: más datos personales que proteger y declarar.
- **Estado**: corregido
- **Cierre**: ataques `SEG-027` de `tests/seguridad/` (cuentas, superficie).

### SEG-028. El registro revela si un correo ya tiene cuenta

- **Área**: autenticación y sesiones
- **Severidad**: baja. FR-016 lo admite si queda limitado, y hoy no lo está (SEG-015).
- **Evidencia**: registrar un correo existente responde 422 `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`; uno nuevo, 200.
- **Riesgo**: se puede comprobar qué correos juegan.
- **Estado**: corregido
- **Cierre**: ataques `SEG-028` de `tests/seguridad/` (cuentas). Queda a propósito (FR-016): el registro sigue indicando que un correo ya existe, limitado a 5 intentos por hora y cliente.

### SEG-029. La recuperación tarda algo más si la cuenta existe

- **Área**: recuperación de contraseña
- **Severidad**: baja. La diferencia es mínima y la ruta ya está limitada a 5 seguidas por IP.
- **Evidencia**: mediana de 150 llamadas a la operación interna: 3,6 ms con cuenta y 3,1 ms sin ella. El login no muestra
  una diferencia relevante (76,4 frente a 74,4 ms) y sus respuestas son idénticas.
- **Riesgo**: en teoría, deducir si un correo tiene cuenta.
- **Estado**: corregido
- **Cierre**: ataques `SEG-029` de `tests/seguridad/` (cuentas). La recuperación responde sin esperar a la operación. El login no cambia: sus respuestas son idénticas y la primera pasada no midió una diferencia relevante.

### SEG-030. El token de recuperación permanece en la dirección

- **Área**: recuperación de contraseña
- **Severidad**: baja. La web no carga recursos de terceros.
- **Evidencia**: `apps/web/src/pantallas/Inicio.tsx` solo quita `?restablecer=` de la dirección al terminar el proceso.
- **Riesgo**: queda en el historial y a la vista mientras el formulario está abierto.
- **Estado**: corregido
- **Cierre**: recorrido e2e `apps/web/tests/e2e/acceso.spec.ts`.

### SEG-031. Dependencias de desarrollo con vulnerabilidades altas

- **Área**: dependencias
- **Severidad**: baja. Solo se usan en las pruebas y no llegan a la imagen.
- **Evidencia**: `pnpm audit` señala `undici` 5.29.0 (5 altos) y `@fastify/busboy` 2.1.1 (1 alto), que llegan por
  `testcontainers` 10.28.0. El plan no los contemplaba.
- **Riesgo**: bajo, pero impide cumplir SC-011, que exige `pnpm audit` sin altos ni críticos.
- **Estado**: corregido
- **Cierre**: ataques `SEG-031` de `tests/seguridad/` (dependencias).

### SEG-032. Se puede impedir a otra persona entrar y recuperar su cuenta

- **Área**: autenticación y sesiones
- **Severidad**: media. No da acceso a nada, pero exige solo conocer el correo de la víctima.
- **Evidencia**: aparece al aplicar los límites de FR-013. Los ataques de `limites.test.ts` comprueban por separado que 20
  fallos por hora desde varias direcciones bloquean el login de un correo y que, pasadas 3 peticiones por hora, ese correo
  deja de recibir enlaces. La combinación se deduce de ambos y no se ha ejecutado como un único ataque.
- **Riesgo**: repitiendo las dos cosas, alguien puede mantener a una persona sin poder entrar ni recuperar su cuenta. Las
  sesiones ya abiertas no se ven afectadas.
- **Estado**: abierto
- **Cierre**: decisión de la persona responsable (T073). Ver [Decisiones de riesgo](#decisiones-de-riesgo).

## Dependencias

`pnpm audit --prod`: 3 críticos, 8 altos, 36 moderados y 6 bajos. `pnpm audit` completo: 3 críticos, 14 altos, 49
moderados y 10 bajos.

| Paquete | Versión | Severidad | Versión mínima corregida | ¿Afecta? | Hallazgo |
|---|---|---|---|---|---|
| `tinypool` | 1.1.1 | 2 críticos | 2.1.2 | No se carga, pero está en la imagen | SEG-009 |
| `vitest` | 2.1.9 | 1 crítico | **3.2.6** | Solo pruebas; sus partes están en la imagen | SEG-009 |
| `vite` | 5.4.21 | 1 alto | 6.4.4 | No se carga, pero está en la imagen | SEG-009 |
| `nodemailer` | 6.10.1 | 5 altos | **10.0.6** | Sí, envía los correos | SEG-008 |
| `@fastify/static` | 8.3.0 | 1 alto | **10.1.1** | Sí, sirve la web | SEG-008 |
| `zod` | 3.25.76 | 1 alto | **4.6.6** | Sí, valida todas las entradas | SEG-008 |
| `undici` | 5.29.0 | 5 altos | 6.29.1 | Solo pruebas | SEG-031 |
| `@fastify/busboy` | 2.1.1 | 1 alto | 3.2.1 | Solo pruebas | SEG-031 |

Las tareas T026 a T029 deben usar como mínimo las versiones en negrita.

**Tras la corrección (T030)**: `pnpm audit` completo, 0 críticos, 0 altos, 10 moderados y 5 bajos; `pnpm audit --prod`, 0
críticos, 0 altos, 4 moderados y 4 bajos. `vitest` sube a la 4.x y no a la 3.2, porque la 3.2 sigue exigiendo `tinypool` 1.x,
la versión con los avisos críticos.

## Escaneo externo (OWASP ZAP)

`zap-baseline` y `zap-api-scan` (`ghcr.io/zaproxy/zaproxy:stable`) contra la imagen de producción, con 65 rutas y una
sesión de prueba. Sin fallos (`FAIL: 0`), sin alertas de inyección, sin errores 500 en el servidor, y el servicio siguió
respondiendo al terminar.

| Alerta | Riesgo | Resolución |
|---|---|---|
| Falta `Content-Security-Policy` | Medio | SEG-011 |
| Falta protección contra incrustación | Medio | SEG-011 |
| Falta `X-Content-Type-Options` | Bajo | SEG-011 |
| Falta `Permissions-Policy` | Bajo | SEG-011 |
| Faltan `Cross-Origin-Embedder/Opener/Resource-Policy` | Bajo | Se añaden `Opener` y `Resource` (T055). `Embedder` no se añade por decisión de la persona responsable |
| Tipo de contenido inesperado en rutas inexistentes | Bajo | SEG-023 |
| Marca de tiempo en el JS y en `/metrics` | Bajo | Falso positivo en el JS (números del bundle); `/metrics` queda cubierto por SEG-010 |
| Avisos informativos (caché, aplicación moderna, errores 4xx, autenticación identificada) | Informativo | Sin acción: describen el funcionamiento normal |

## Decisiones de riesgo

**Pendiente: SEG-032 (T073).** Opciones:

1. **Recomendada**: contar los fallos de login y las recuperaciones por correo y cliente, con un tope global por correo más
   alto. Un atacante con pocas direcciones deja de poder bloquear a la víctima. Cambia los valores de FR-013.
2. Aceptar el riesgo durante la beta cerrada, con la condición de revisarlo antes de abrirla al público.

Ninguna aceptada todavía. Solo la persona responsable puede aceptar un riesgo medio o bajo (FR-009), indicando quién, cuándo,
motivo, riesgo residual y condición para revisarlo.
