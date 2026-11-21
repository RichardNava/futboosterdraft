# Feature Specification: Auditoría de seguridad y roles

**Feature Branch**: `017-auditoria-seguridad-roles`

**Created**: 2026-11-21

**Status**: Draft ([ROADMAP](../../ROADMAP.md) INI-17, P0: bloquea INI-10)

**Input**: User description: "INI-17 del ROADMAP: «Auditoría de seguridad y roles». Spec nueva (será la 017). Prioridad
P0: bloquea INI-10 (preparación para producción) y está en el camino crítico de la beta abierta, en paralelo a INI-16
(motor). Objetivo: abrir la beta a personas ajenas al proyecto sin vulnerabilidades conocidas y con una administración
controlada por roles en lugar de por consola. Alcance, en este orden de prioridad: (1, P1) auditoría de seguridad a
fondo de todo el sistema, con un informe de hallazgos con severidad (crítica, alta, media o baja), evidencia y riesgo,
que cubra como mínimo autenticación y sesiones; recuperación de contraseña; autorización en cada ruta HTTP y en el
WebSocket (IDOR); integridad del juego (Principio VI, FR-054a); tienda y economía (idempotencia, fragmentos, pase
premium, pago simulado, condiciones de carrera); validación de entradas y límites, también sin sesión; cabeceras HTTP,
CORS, XSS e inyección SQL; exposición de /metrics, /healthz, rutas de desarrollo, errores y datos personales en
registros; secretos, configuración e imagen Docker; dependencias; y correo. (2, P1) Corrección de los hallazgos: todo
lo crítico y alto, y lo medio y bajo salvo que se acepte el riesgo con una decisión registrada; cada corrección con su
prueba que demuestre el ataque bloqueado. (3, P2) Gestión de roles (RBAC): hoy la administración se hace por consola
(`ajuste` de identidad_cartas y acceso_niveles_rareza, `premium <email> <si|no>`); definir los roles, sus permisos y
quién los asigna, comprobados siempre en el servidor. (4, P3) robots.txt según lo que deba indexarse (portada pública)
y lo que no (API, WebSocket, métricas, pantallas de partida). Fuera de alcance: pagos reales (INI-12; solo se revisa el
pago simulado actual), textos legales, copias de seguridad y despliegue (INI-10) y cambios de reglas del juego o del
motor (INI-16). Preguntas para /speckit-clarify: roles y panel de administración, primer administrador y registro de
acciones, umbral de aceptación, herramienta externa y páginas indexables. Criterios de éxito esperados: informe con
cada hallazgo cerrado o aceptado por decisión registrada, ningún crítico o alto abierto, cada permiso con su prueba de
acceso denegado, robots.txt publicado, y typecheck, lint, test, e2e y `pnpm audit` en verde (sin vulnerabilidades
altas ni críticas)."

## Clarifications

### Session 2026-11-21

- Q: ¿Cuándo podrán pagar con dinero real los jugadores que no sean betatesters? → A: Antes de abrir la beta: los pagos
  reales (INI-12) pasan a ser condición para la apertura. Habrá un rol betatester con fragmentos para comprar, y el resto
  de jugadores podrá pagar con dinero lo que permite el Principio VII.
- Q: ¿Cómo deben recibir sus fragmentos los betatesters? → A: Entrega manual: un administrador elige la cantidad desde el
  panel e indica un motivo, con un máximo de 10.000 fragmentos por entrega, y puede repetirla.
- Q: ¿Quién debe poder administrar el juego durante la beta, y desde dónde? → A: Solo administradores, con panel web. No
  hay rol de moderador; se puede añadir más adelante.
- Q: ¿Qué debe pasar con los fragmentos y las compras de un betatester cuando pierde el rol o termina la beta? → A: Lo
  conserva todo: lo comprado y los fragmentos que le queden.
- Q: ¿Confirmas las cinco decisiones provisionales que quedan en la spec (D-3 a D-7), o quieres cambiar alguna? → A: Se
  confirman las cinco tal como están.
- Q: ¿Cuántas partidas en curso puede tener a la vez cada cuenta? (SEG-016) → A: 10 una cuenta registrada y 3 un invitado.
- Q: ¿Subimos `testcontainers` para eliminar sus avisos de seguridad? (SEG-031) → A: Sí, a la 11.14, sin cambiar la
  versión mínima de Node.
- Q: ¿Añadimos las cabeceras `Cross-Origin-*` de las que avisó el escaneo con ZAP? → A: Sí, `Cross-Origin-Opener-Policy`
  y `Cross-Origin-Resource-Policy`, sin `Cross-Origin-Embedder-Policy`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Saber con certeza cómo de seguro es el sistema (Priority: P1)

La persona responsable del proyecto recibe un informe de auditoría que recorre todo el sistema y le dice, en lenguaje
claro, qué problemas hay, cómo de graves son, qué podría hacer un atacante con cada uno y cómo se ha comprobado. Con
ese informe decide si la beta puede abrirse.

**Why this priority**: sin el informe no se sabe qué hay que arreglar. Es la primera fase de INI-17 y fija el alcance
de la corrección.

**Independent Test**: se abre el informe y se comprueba que cubre todas las áreas exigidas y todos los puntos de
entrada del sistema, y que cada hallazgo tiene severidad, evidencia reproducible y riesgo. Aporta valor aunque aún no
se haya corregido nada.

**Acceptance Scenarios**:

1. **Given** el sistema en su estado actual, **When** termina la auditoría, **Then** el informe recoge el resultado de
   cada área de FR-003, también de las que no tienen hallazgos, indicando qué se revisó.
2. **Given** un hallazgo del informe, **When** otra persona sigue su evidencia en un entorno propio, **Then** reproduce
   el problema y llega a la misma severidad aplicando los criterios de FR-002.
3. **Given** el inventario de puntos de entrada, **When** se compara con los que ofrece el sistema, **Then** no falta
   ninguno y cada uno indica quién puede usarlo.
4. **Given** el informe terminado, **When** se busca en él, **Then** no contiene contraseñas, tokens, secretos ni datos
   personales reales.

---

### User Story 2 - Abrir la beta sin vulnerabilidades conocidas (Priority: P1)

Una persona ajena al proyecto juega en la beta con la garantía de que nadie puede entrar en su cuenta, ver sus
elecciones ocultas, actuar sobre sus partidas o colección, ni conseguir fragmentos, cartas o productos de pago sin
ganarlos o pagarlos. Cada problema encontrado queda corregido y con una prueba que demuestra que el ataque ya no
funciona.

**Why this priority**: es la condición para abrir a personas ajenas y lo que desbloquea INI-10.

**Independent Test**: se ejecuta la verificación de seguridad, que repite cada ataque conocido contra el sistema y
produce un resumen legible con el resultado de cada uno: todos bloqueados.

**Acceptance Scenarios**:

1. **Given** una persona con sesión, **When** intenta leer o modificar una partida, equipo, colección o compra de otra
   cuenta, **Then** el sistema lo rechaza y no cambia nada.
2. **Given** un atacante sin sesión, **When** prueba contraseñas en bucle contra una cuenta, **Then** el sistema lo
   frena al alcanzar el límite aunque cambie los datos de su petición para aparentar ser otro cliente.
3. **Given** una compra en curso, **When** llegan a la vez muchas peticiones iguales, **Then** se cobra y se entrega una
   sola vez y el saldo cuadra con sus movimientos.
4. **Given** un enlace de recuperación de contraseña, **When** se usa, caduca o se revisan los registros del sistema,
   **Then** no sirve una segunda vez, no sirve pasada una hora y no aparece en los registros.
5. **Given** un nombre de equipo o de partida con código malicioso, **When** se muestra en cualquier pantalla o correo,
   **Then** aparece como texto y no se ejecuta.
6. **Given** el sistema en producción, **When** alguien pide las métricas o una ruta de desarrollo desde Internet,
   **Then** no obtiene respuesta útil.
7. **Given** el sistema en producción sin pagos reales activos, **When** una cuenta intenta obtener un producto
   «pagando» en euros, **Then** la compra se rechaza y no recibe nada (D-1).

---

### User Story 3 - Administrar el juego con roles (Priority: P2)

Quien administra el juego deja de necesitar acceso a la consola del servidor: entra con su cuenta, ve un panel con todas
las acciones de administración, incluidas las del día a día (partidas atascadas, cuentas que abusan), y cada acción
queda registrada. Las demás cuentas no pueden entrar al panel ni usar esas acciones.

**Why this priority**: con personas ajenas harán falta moderación y control, pero la beta no puede abrirse antes de
cerrar las vulnerabilidades.

**Independent Test**: con una cuenta de cada rol se intenta cada acción de la matriz de FR-041: las permitidas
funcionan y quedan registradas, y las demás se rechazan en el servidor aunque se llamen directamente, sin pasar por
la interfaz.

**Acceptance Scenarios**:

1. **Given** una instalación sin administradores, **When** quien tiene acceso al servidor designa el primero por
   consola, **Then** esa cuenta puede entrar al panel y la acción queda registrada.
2. **Given** una cuenta de administrador, **When** cambia un ajuste, concede premium de cortesía o asigna un rol,
   **Then** el cambio se aplica sin reiniciar y el registro muestra quién, qué, sobre quién y cuándo.
3. **Given** una cuenta de jugador o betatester, **When** llama directamente a una acción de administrador, **Then**
   recibe un acceso denegado y el intento queda registrado.
4. **Given** una cuenta con sesión abierta y en partida, **When** un administrador la suspende, **Then** su sesión termina,
   no puede volver a entrar y sus partidas siguen para el resto según las reglas de desconexión.
5. **Given** una partida atascada, **When** un administrador la cierra indicando un motivo, **Then** sus participantes
   reciben un aviso y la partida no reparte premios.
6. **Given** el único administrador, **When** intenta quitarse el rol o suspenderse, **Then** el sistema lo impide.
7. **Given** una cuenta betatester, **When** un administrador le entrega fragmentos con un motivo, **Then** su saldo
   aumenta una sola vez y la entrega aparece en el registro; si la cantidad supera 10.000, se rechaza sin efecto.

---

### User Story 4 - Que los buscadores solo vean la portada (Priority: P3)

Quien busca el juego en Internet encuentra la portada pública, y los buscadores no indexan pantallas de partida, datos
de cuentas, enlaces de recuperación ni rutas técnicas.

**Why this priority**: mejora la imagen pública y reduce ruido, pero no es una medida de seguridad: lo privado ya lo
protege la autorización.

**Independent Test**: se abre `/robots.txt` en el navegador y se comprueba con un validador de robots qué direcciones
se permiten.

**Acceptance Scenarios**:

1. **Given** el sitio publicado, **When** se abre `/robots.txt`, **Then** se recibe el fichero de texto, no la
   aplicación web.
2. **Given** el fichero, **When** se valida la portada, **Then** está permitida.
3. **Given** el fichero, **When** se valida la API, el canal en tiempo real, las métricas, una pantalla de partida, el
   panel de administración o un enlace de recuperación, **Then** están bloqueados.
4. **Given** una pantalla nueva añadida en el futuro, **When** se valida, **Then** está bloqueada sin tocar el fichero.

---

### Edge Cases

- Una petición repetida con la misma clave de reintento por **otra cuenta o sin sesión**: nunca recibe la respuesta
  guardada de la primera.
- Una petición rechazada por límite o por falta de sesión **no consume** la clave de reintento: al repetirla en regla,
  se ejecuta.
- Muchas personas detrás de la **misma conexión** (un bar, una universidad): el límite por origen no debe impedirles
  jugar con su sesión; los límites estrictos se aplican a las acciones sin sesión.
- Un atacante intenta **bloquear a otra persona** fallando su contraseña a propósito: la persona legítima conserva la
  vía de recuperar la contraseña.
- Un **invitado pasa a cuenta registrada** con un correo que ya existe: no se fusiona con esa cuenta ni obtiene acceso a
  ella.
- Se cambia la contraseña con **sesiones abiertas en otros dispositivos**: esas sesiones y sus conexiones en tiempo real
  terminan.
- Se **suspende** a alguien en mitad de un draft o de un partido: el resto no queda bloqueado; se aplican la elección
  automática y las reglas de desconexión ya existentes.
- Un administrador **participa en la partida** que quiere cerrar: no puede cerrarla desde el panel; debe hacerlo otro
  administrador o, si no lo hay, quien tenga acceso a la consola (FR-046).
- Dos administradores se **quitan el rol mutuamente a la vez** y dejarían el sistema sin ninguno: una de las dos
  operaciones se rechaza.
- Se **elimina una cuenta** que aparece en el registro de administración: el registro se conserva sin sus datos
  personales.
- Se **cierra una partida** con un cobro de nivel de rareza: solo se devuelve en los casos en que las reglas actuales ya
  lo devuelven.
- Un cambio de rol con el panel **abierto en otra pestaña**: la siguiente acción ya se evalúa con el rol nuevo.
- La web se abre con un enlace de recuperación y carga **recursos externos**: el token no se envía a terceros.
- El servidor arranca en producción con un **secreto de ejemplo o demasiado corto**: se niega a arrancar y explica qué
  falta, sin mostrar el valor.
- Una **vulnerabilidad de dependencia sin versión corregida**: si es alta o crítica y afecta al sistema, se sustituye o
  se elimina su uso; si no le afecta, el informe lo justifica con evidencia.
- Una cuenta **en el tope de partidas** repite el envío de una creación ya hecha: recibe la misma partida, sin rechazo ni
  segundo cobro.

## Requirements *(mandatory)*

### Functional Requirements

#### Auditoría

- **FR-001**: La auditoría DEBE producir un único informe en la carpeta de esta spec. Cada hallazgo DEBE tener
  identificador, área, severidad, evidencia reproducible, riesgo, estado (abierto, corregido o aceptado) y, al cerrarse,
  la prueba que lo demuestra o la decisión que lo acepta.
- **FR-002**: La severidad DEBE asignarse con estos criterios:

  | Severidad | Criterio |
  |---|---|
  | Crítica | Tomar el control de cuentas ajenas, ejecutar código en el servidor, acceder a los datos de todas las cuentas o dejar el servicio inutilizable con un esfuerzo mínimo y sin cuenta |
  | Alta | Leer o modificar datos o partidas de otra cuenta, alterar el resultado competitivo, obtener fragmentos, cartas o productos de pago sin ganarlos o pagarlos, o eludir un control de seguridad |
  | Media | Debilita una defensa o filtra información limitada, y necesita condiciones adicionales para causar daño |
  | Baja | Mejora de endurecimiento sin vía de ataque demostrada |

- **FR-003**: El informe DEBE cubrir estas áreas: autenticación y sesiones; cuentas de invitado y su paso a registradas;
  recuperación de contraseña; autorización de cada acción; canal en tiempo real; integridad del juego; tienda y economía;
  validación de entradas y límites de uso; protecciones del navegador; inyección de código y de consultas; exposición de
  rutas técnicas y de desarrollo; errores y datos personales en registros; secretos y configuración; imagen de
  despliegue; dependencias; y correo.
- **FR-004**: El informe DEBE incluir el inventario completo de puntos de entrada (rutas y mensajes en tiempo real), con
  quién puede usar cada uno y qué comprobación lo protege.
- **FR-005**: Los ataques de prueba DEBEN ejecutarse solo contra entornos propios. El informe NO DEBE contener secretos,
  tokens ni datos personales reales.
- **FR-006**: La revisión DEBE contrastarse con un análisis de dependencias y con un escaneo automático externo contra un
  entorno local (D-5), y el informe DEBE recoger qué detectó cada uno y cómo se resolvió.
- **FR-007**: Al terminar la implementación, la auditoría DEBE repetirse sobre lo cambiado, incluido el panel y los roles,
  antes de cerrar la spec.

#### Corrección

- **FR-008**: Todos los hallazgos críticos y altos DEBEN corregirse; no se pueden aceptar.
- **FR-009**: Los hallazgos medios y bajos DEBEN corregirse salvo que la persona responsable acepte el riesgo con una
  decisión registrada (quién, cuándo, motivo, riesgo residual y condición para revisarla). Un agente NO PUEDE aceptar un
  riesgo.
- **FR-010**: Cada corrección DEBE tener una prueba automática que reproduzca el ataque y demuestre que queda bloqueado.
- **FR-011**: Una única verificación DEBE repetir todos los ataques y generar un resumen legible por una persona no
  técnica, con cada ataque, su hallazgo y su resultado (Principio IX).
- **FR-012**: Las correcciones NO DEBEN cambiar las reglas del juego ni los resultados del motor.

#### Cuentas y sesiones

- **FR-013**: El inicio de sesión, el registro, la entrada como invitado y la recuperación DEBEN limitarse también sin
  sesión. Valores iniciales: inicio de sesión, 10 intentos por minuto y origen, 20 fallos por hora por cuenta y origen, y 100
  por hora y cuenta; registro, 5 por hora y origen; invitado, 20 por hora y origen; recuperación, los 5 seguidos y 1 por
  minuto actuales, además de 3 por hora por correo y origen, y 10 por hora y correo. Tras el quinto fallo seguido, la cuenta
  DEBE recibir un aviso por correo, como máximo uno al día (decisión del 2026-11-21, SEG-032).
- **FR-014**: Los límites NO DEBEN poder eludirse alterando datos que controla el cliente, y DEBEN identificar a cada
  cliente real también detrás del proxy, sin que un cliente agote el límite de los demás.
- **FR-015**: Todas las vías hacia una misma operación de cuenta DEBEN aplicar las mismas validaciones y límites; no puede
  quedar una vía alternativa que se los salte.
- **FR-016**: El inicio de sesión y la recuperación NO DEBEN revelar si un correo tiene cuenta, ni por su respuesta ni por
  su tiempo de respuesta. Si el registro necesita revelarlo, DEBE quedar limitado por FR-013 y constar en el informe.
- **FR-017**: La credencial de sesión DEBE ser inaccesible para el código de la página, viajar solo por conexión cifrada
  en producción, no enviarse en peticiones iniciadas por otros sitios que cambien estado, caducar y poder revocarse.
- **FR-018**: Cambiar o restablecer la contraseña, suspender una cuenta o eliminarla DEBE terminar todas sus sesiones y
  conexiones en tiempo real en 5 segundos como máximo.
- **FR-019**: El paso de invitado a registrado DEBE transferir solo los datos de ese invitado y NO DEBE dar acceso a
  ninguna cuenta existente.
- **FR-020**: El enlace de recuperación DEBE ser de un solo uso, caducar en una hora y no aparecer en registros, cabeceras
  hacia terceros ni contenido indexable.

#### Autorización e integridad

- **FR-021**: Cada acción DEBE comprobar en el servidor la identidad y el permiso sobre ese recurso concreto. Ocultar algo
  en la interfaz no cuenta como control.
- **FR-022**: El canal en tiempo real DEBE aplicar las mismas comprobaciones en la conexión y en cada mensaje.
- **FR-023**: El servidor DEBE validar el draft, la alineación y los torneos, y rechazar sin efecto los mensajes
  manipulados, fuera de turno o duplicados (Principio VI).
- **FR-024**: Ninguna respuesta, tampoco para administradores, DEBE revelar elecciones ajenas durante el draft ni la
  alineación rival antes del partido (001/FR-054a).
- **FR-025**: Una respuesta guardada para reintentos DEBE devolverse solo a la misma cuenta, después de comprobar su sesión
  y su permiso. Solo DEBEN guardarse operaciones de personas autenticadas que se hayan ejecutado, con caducidad, de modo
  que el almacén no pueda crecer sin límite.

#### Tienda y economía

- **FR-026**: Las operaciones que mueven fragmentos, cartas, colecciones, cosméticos o el pase DEBEN tener efecto una sola
  vez aunque lleguen repetidas o simultáneas. El saldo NUNCA DEBE ser negativo y DEBE coincidir con la suma de sus
  movimientos.
- **FR-027**: Precio, moneda y producto DEBEN decidirse en el servidor; ningún valor enviado por el cliente puede reducir
  un cobro.
- **FR-028**: En producción, mientras los pagos reales (INI-12) no estén activos, NO DEBE poder obtenerse ningún producto
  con el pago simulado en euros: el servidor rechaza la compra y la tienda muestra esa opción como no disponible. En
  desarrollo y pruebas el pago simulado sigue funcionando. La beta NO DEBE abrirse al público hasta que INI-12 esté
  cerrada, y con dinero real solo podrán comprarse cosméticos, packs de cosméticos y el pase premium (Principio VII, D-1).

#### Superficie expuesta

- **FR-029**: Las páginas DEBEN enviar protecciones del navegador que impidan ejecutar código no autorizado, incrustar la
  aplicación en otros sitios, rebajar la conexión cifrada, filtrar direcciones a terceros, acceder a su ventana desde otros
  sitios y cargar sus recursos desde otros sitios.
- **FR-030**: La API NO DEBE admitir peticiones con credenciales desde otros orígenes.
- **FR-031**: Los textos escritos por personas DEBEN validarse en longitud y caracteres, y mostrarse siempre como texto en
  pantallas y correos.
- **FR-032**: Todas las entradas DEBEN validarse en el servidor, y ninguna DEBE poder alterar una consulta a la base de
  datos.
- **FR-032a**: Una cuenta registrada NO DEBE tener más de 10 partidas en curso a la vez, ni un invitado más de 3, tampoco
  con peticiones simultáneas. Cuentan las partidas en sala, en draft o en torneo, creadas o unidas, en las que la cuenta
  sigue participando. Al llegar al tope, el servidor DEBE rechazar sin efecto ni cobro crear otra partida o unirse a ella;
  la plaza se libera al terminar o abandonar una.
- **FR-033**: Las métricas NO DEBEN ser accesibles desde Internet aunque el proxy esté mal configurado. La comprobación de
  salud pública DEBE limitarse a indicar si el servicio funciona.
- **FR-034**: Las rutas y opciones de desarrollo NO DEBEN existir en producción.
- **FR-035**: Los errores NO DEBEN mostrar detalles internos. Los registros NO DEBEN contener contraseñas, tokens,
  credenciales de sesión ni correos.
- **FR-036**: En producción, el servidor DEBE negarse a arrancar con secretos ausentes, cortos o de ejemplo, o con una
  dirección pública sin cifrar.
- **FR-037**: La imagen de despliegue DEBE ejecutarse sin privilegios y contener solo lo necesario.
- **FR-038**: Las dependencias de producción NO DEBEN tener vulnerabilidades altas ni críticas que afecten al sistema.
  Las de desarrollo tampoco DEBEN dar avisos altos ni críticos: `testcontainers` y `@testcontainers/postgresql` se suben
  a la 11.14 o a una 11.x posterior, sin elevar la versión mínima de Node (SEG-031).
- **FR-039**: Los correos NO DEBEN permitir inyectar cabeceras ni destinatarios, y sus enlaces DEBEN apuntar siempre a la
  dirección pública configurada.

#### Roles y administración

- **FR-040**: Cada cuenta DEBE tener exactamente un rol: invitado, jugador, betatester o administrador (D-1,
  D-2). Las cuentas nuevas son jugador, o invitado si entran sin registrarse.
- **FR-041**: Los permisos DEBEN ser los de esta matriz, y cada celda «no» DEBE tener una prueba de acceso denegado:

  | Permiso | Invitado | Jugador | Betatester | Administrador |
  |---|---|---|---|---|
  | Jugar sus partidas | sí | sí | sí | sí |
  | Colección, tienda y perfil propios | no | sí | sí | sí |
  | Entrar al panel y ver las partidas activas | no | no | no | sí |
  | Cerrar una partida en la que no participa, con motivo | no | no | no | sí |
  | Suspender y reactivar jugadores y betatesters | no | no | no | sí |
  | Cambiar los ajustes de operación | no | no | no | sí |
  | Conceder y retirar premium de cortesía | no | no | no | sí |
  | Entregar fragmentos a betatesters | no | no | no | sí |
  | Asignar roles | no | no | no | sí |
  | Consultar el registro de administración | no | no | no | sí |

- **FR-042**: Un cambio de rol DEBE aplicarse en la siguiente petición, sin volver a iniciar sesión.
- **FR-043**: Solo un administrador PUEDE asignar roles. Un invitado NO PUEDE ser betatester ni administrador, nadie puede
  cambiarse su propio rol y DEBE quedar siempre al menos un administrador activo.
- **FR-044**: El primer administrador DEBE designarse por consola, con acceso al servidor. NO DEBE existir ninguna cuenta,
  contraseña ni variable de entorno que conceda ese rol por defecto (D-3).
- **FR-045**: La web DEBE ofrecer un panel de administración, accesible solo para administradores, que cubra todas las
  acciones de la matriz, incluidas las que hoy se hacen por consola (D-2).
- **FR-046**: Las órdenes de consola existentes DEBEN seguir disponibles como vía de emergencia y registrar sus acciones
  con el actor «consola». DEBE existir además una orden de consola para cerrar una partida, con las condiciones de FR-049.
- **FR-047**: Cada acción de administración y cada intento denegado DEBEN registrarse con quién, su rol, qué acción, sobre
  qué, valor anterior y nuevo, motivo si lo hay, resultado y cuándo. El registro NO DEBE poder editarse ni borrarse desde
  la aplicación y DEBE conservarse sin datos personales si se elimina la cuenta (D-4).
- **FR-048**: Una cuenta suspendida NO DEBE poder entrar, y DEBE ver un mensaje claro. Sus partidas continúan para el resto
  con las reglas de desconexión ya existentes. Nadie puede suspenderse a sí mismo y un administrador no puede ser
  suspendido.
- **FR-049**: Cerrar una partida DEBE exigir un motivo, avisar a sus participantes y no repartir premios ni fragmentos.
  Solo devuelve los cobros que las reglas actuales ya devuelven.
- **FR-050**: Un rol NO DEBE dar ninguna ventaja competitiva ni entregar cartas, sobres, colecciones o fragmentos
  (Principio VII), con la única excepción de los fragmentos del rol betatester (FR-050a).
- **FR-050a**: Un betatester es una cuenta registrada que recibe fragmentos de un administrador para comprar en la tienda
  durante la beta. El administrador elige la cantidad desde el panel e indica un motivo, con un máximo de 10.000 fragmentos
  por entrega, y puede repetir la entrega. El servidor DEBE rechazar sin efecto una cantidad que no sea un entero positivo,
  que supere el tope o que vaya a una cuenta sin el rol betatester. Cada entrega DEBE aplicarse una sola vez y quedar en el
  registro de administración y en los movimientos de su saldo (FR-026, FR-047). Al perder el rol o terminar la beta, la
  cuenta conserva lo comprado y los fragmentos que le queden, y no puede recibir más entregas.
- **FR-051**: *Retirado: sin rol de moderador (D-2).*

#### robots.txt

- **FR-052**: El sitio DEBE publicar `/robots.txt`, que permita indexar solo la portada y bloquee por defecto todo lo demás,
  incluidas las pantallas futuras y las direcciones de la portada con parámetros, como el enlace de recuperación.

#### Documentación

- **FR-053**: La guía de despliegue DEBE recoger la configuración de seguridad obligatoria, la designación del primer
  administrador y el uso del panel.

### Key Entities *(include if feature involves data)*

- **Hallazgo**: problema detectado en la auditoría; área, severidad, evidencia, riesgo, estado y prueba o decisión de
  cierre.
- **Decisión de riesgo**: aceptación de un hallazgo medio o bajo; quién, cuándo, motivo, riesgo residual y condición de
  revisión.
- **Rol**: nivel de permisos de una cuenta (invitado, jugador, betatester o administrador).
- **Suspensión**: estado de una cuenta que le impide entrar; quién la decide, motivo y fechas.
- **Registro de administración**: entrada inalterable de una acción o de un intento denegado; actor, rol, acción, objeto,
  valores, motivo, resultado y fecha.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El informe cubre el 100 % de las áreas de FR-003 y de los puntos de entrada del sistema.
- **SC-002**: Al cerrar la spec hay 0 hallazgos críticos o altos abiertos, y el 100 % de los medios y bajos están
  corregidos o aceptados con decisión registrada.
- **SC-003**: El resumen de la verificación muestra el 100 % de los ataques de los hallazgos corregidos como bloqueados.
- **SC-004**: El 100 % de las celdas «no» de la matriz de permisos tiene una prueba de acceso denegado en verde, también
  llamando a la acción sin pasar por la interfaz.
- **SC-005**: De 100 intentos seguidos de contraseña contra una cuenta desde un mismo cliente, se evalúan como máximo 10,
  aunque el cliente cambie los datos de su petición.
- **SC-006**: Con 50 peticiones simultáneas de una misma compra se produce 1 solo cobro y 1 sola entrega, y en el 100 % de
  las cuentas de la prueba el saldo coincide con sus movimientos.
- **SC-007**: Una cuenta suspendida o con la contraseña cambiada pierde el acceso en 5 segundos como máximo, en todas sus
  sesiones.
- **SC-008**: Quien administra completa cada tarea que hoy exige consola (cambiar un ajuste, conceder premium de cortesía)
  desde el panel en menos de 1 minuto.
- **SC-009**: El 100 % de las acciones de administración de la prueba de aceptación aparece en el registro con quién, qué
  y cuándo.
- **SC-010**: `/robots.txt` está publicado; un validador confirma la portada como permitida y el 100 % de las direcciones
  privadas de la lista de comprobación como bloqueadas.
- **SC-011**: Las comprobaciones de calidad del proyecto (tipos, estilo, pruebas y recorridos completos) terminan en verde,
  y el análisis completo de dependencias, incluidas las de desarrollo, no da vulnerabilidades altas ni críticas.
- **SC-012**: Las mismas partidas de referencia producen exactamente los mismos resultados antes y después de la spec.

## Assumptions

### Decisiones confirmadas

Confirmadas por la persona responsable el 2026-11-21 en `/speckit-clarify`.

- **D-1. Pago en la beta**: el pago simulado se desactiva en producción y la beta no se abre al
  público hasta que los pagos reales (INI-12) estén cerrados. Los betatesters compran con los fragmentos que reciben; el
  resto de jugadores puede pagar con dinero los cosméticos, los packs y el pase premium.
- **D-2. Roles y panel**: cuatro roles (invitado, jugador, betatester y administrador) y panel
  web solo para administradores, porque el objetivo es dejar de depender de la consola. No hay rol de moderador en la
  beta; se puede añadir más adelante.
- **D-3. Primer administrador**: por consola, porque ya exige acceso al servidor y no deja una credencial en la
  configuración.
- **D-4. Registro de administración**: sí, sin caducidad durante la beta, solo visible para administradores. La duración
  puede revisarse al redactar los textos legales (INI-10).
- **D-5. Contraste externo**: revisión por agente, análisis de dependencias del propio gestor de paquetes y un escaneo con
  OWASP ZAP (gratuito) contra un entorno local. Sin servicios de pago.
- **D-6. Umbral de corrección**: el que fija la descripción: todo lo crítico y alto, y lo medio y bajo salvo aceptación.
- **D-7. Indexación**: solo la portada.

### Puntos de partida observados

Vistos al leer el código para redactar esta spec. **No se han explotado**: la auditoría debe confirmarlos, clasificarlos y
buscar el resto.

| Indicio | Dónde | Requisito |
|---|---|---|
| El pago simulado en euros entrega productos también en producción | Tienda y cosméticos | FR-028 |
| Las respuestas guardadas para reintentos se identifican por dirección y clave, sin cuenta, y se devuelven antes de comprobar la sesión | Aplicación HTTP | FR-025 |
| Se guarda una fila por cada petición con clave, también sin sesión y con error, y nada las borra: crecimiento sin límite de la base de datos | Aplicación HTTP | FR-025 |
| El límite por sesión usa el valor de la cookie sin validarlo: cambiándolo se evita, y sin cookie no hay límite | Aplicación HTTP | FR-013, FR-014 |
| El límite de recuperación usa la IP sin configuración de proxy: detrás de él, toda la beta compartiría un solo cupo | Rutas de autenticación | FR-014 |
| La API interna de autenticación está expuesta y podría saltarse las validaciones y límites de las rutas públicas | Rutas de autenticación | FR-015 |
| El token de recuperación va en la dirección y el registro de peticiones de producción la guarda sin ocultarlo | Web y registros | FR-020, FR-035 |
| No se envía ninguna cabecera de protección del navegador | Aplicación HTTP | FR-029 |
| `/metrics` responde a cualquiera; solo lo protege una recomendación de configurar el proxy | Observabilidad | FR-033 |
| El secreto de autenticación solo se comprueba que exista, no que sea robusto | Arranque | FR-036 |

### Alcance y dependencias

- Fuera de alcance: pagos reales (INI-12), textos legales, copias de seguridad y despliegue (INI-10), y cambios de reglas o
  del motor (INI-16). La auditoría sí señala lo que afecte a esas iniciativas.
- INI-17 no depende de otra iniciativa y puede avanzar en paralelo a INI-16. Lo que INI-16 cambie en el servidor entra en la
  repetición de FR-007 si se integra antes de cerrar esta spec. INI-12 e INI-18 deben repetir la auditoría sobre lo que
  añadan. INI-12 se implementa en su propia spec, pero debe estar cerrada antes de abrir la beta (D-1).
- Los valores de FR-013 y FR-032a son iniciales y razonables para una beta; pueden ajustarse si la prueba con personas
  reales muestra bloqueos legítimos.
- La beta se sirve por HTTPS detrás de un proxy inverso, como indica la guía de despliegue. Aun así, las protecciones
  obligatorias no deben depender solo de que el proxy esté bien configurado.
- No hay datos de producción que migrar: las cuentas existentes pasan a jugador o invitado según su tipo actual.
