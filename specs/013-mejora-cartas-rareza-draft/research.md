# Research: Mejora de cartas y nivel de rareza del draft

**Fase 0 de** [plan.md](plan.md) · **Spec**: [spec.md](spec.md) · **Fecha**: 2026-11-10

Cada apartado sigue el formato Decisión / Razón / Alternativas. Las causas de los cinco errores (US4–US6) se han
localizado leyendo el código; los ficheros y líneas citados son los de `main` en `e9aca5d`.

---

## R1. Incorporación de las 300 ilustraciones (FR-001 a FR-004, FR-007; SC-001, SC-002)

**Decisión**: script nuevo `pnpm --filter @fbd/fixtures fondos-core -- --origen <dir>` en
`tools/fixtures/src/fondosCore.ts`, con `sharp` (ya instalado en `@fbd/fixtures`):

1. Lee `<dir>`, extrae el id con `^(\d+)_` (el resto del nombre se ignora: mayúsculas, apodos…).
2. **Verifica antes de escribir nada** que hay exactamente un fichero por cada id 1…300 de `data/core-real.json`:
   informa de ids que faltan, que sobran o repetidos y termina con código ≠ 0 sin tocar datos ni origen (FR-003).
3. Convierte cada PNG a `apps/web/public/cartas/fondos/jugadores/<id>.webp` a su tamaño original (600 × 900, con alfa),
   calidad 80. Prueba con `100_Guido_Rodriguez.png`: 55,5 KB (SC-002 pide ≤ 120 KB de media). Termina con error si la
   media supera 120 KB.
4. Escribe `imagen_bg: "/cartas/fondos/jugadores/<id>.webp"` en las 300 fichas de `data/core-real.json` sin tocar
   ningún otro campo, y es repetible (si ya está, no cambia nada).
5. **No borra el origen.** `jugadores_bg/` no está en git (`git status`: `?? jugadores_bg/`), así que borrarla es
   irreversible: se borra a mano en una tarea aparte, después de `core-real` verde y del muestreo visual de SC-001,
   con confirmación de la persona (FR-007).

`validarCoreReal` (`tools/fixtures/src/coreReal.ts:288`) cambia su regla de `imagen_bg`: debe ser
`/cartas/fondos/jugadores/<id>.webp` **con el id de la propia ficha** (esto es la comprobación automática de SC-001:
ninguna carta lleva la ilustración de otra) y el fichero debe existir. `validarJugador` ya acepta la ruta
(`RUTA_IMAGEN`, `/cartas/…webp`), así que FR-004 no exige cambios en el dominio.

**Razón**: mismo patrón que `imagenes` (spec 011) y que `core-real`; los 600 × 900 originales ya superan la carta
más grande (ficha ampliada, ~300 px CSS de ancho a DPR 2), así que no se reescala.

**Alternativas**: reescalar a 400 × 600 (ahorra peso, pero pierde nitidez en la ficha a DPR 2 y ya cumplimos SC-002);
AVIF (mejor compresión, pero el resto del proyecto usa WebP: Assumptions).

## R2. Pintar la ilustración y el plan B (FR-005, FR-006)

**Decisión**: sin cambios en `CartaJugador`. `fondoDe()` (`apps/web/src/componentes/CartaJugador.tsx:52`) ya usa
`imagenBg` cuando no es el SVG genérico, y `img.carta-fondo-accion` ya aplica la misma transparencia, máscara y
`onError` → genérico que los fondos provisionales (edge case «una ilustración no carga»).

Para FR-006, `conIdentidad()` (`packages/domain/src/catalogo/identidad.ts`) añade, con identidad `alternativa`,
`imagen_bg: '/cartas/fondos/<dem>.svg'` **solo si** el fondo empieza por `/cartas/fondos/jugadores/`; con eso
`fondoDe()` vuelve al fondo genérico de la demarcación y las cartas no Core conservan el suyo.

**Razón**: la ruta ya está cubierta de extremo a extremo; el único cambio de lógica es una línea en la función que ya
centraliza el plan B (test en `identidad.test.ts`).

## R3. Legibilidad de rasgos y stats (FR-008 a FR-010; SC-003)

**Decisión**: opción C, solo CSS en `apps/web/src/estilos/cartas.css`:

- recuadro de `.carta-virtudes` / `.carta-defectos` menos translúcido (el alfa sube hasta el mínimo que da 4,5:1);
- `text-shadow` oscuro fino (0 0 2px) en el texto de los rasgos y en las cifras de los stats;
- las cifras de los stats, sobre una banda translúcida propia si hoy caen directamente sobre el fondo.

**Verificación sin analizar imágenes**: el peor fondo posible detrás de un recuadro es el blanco puro. Si el color del
texto contra «recuadro con alfa *a* compuesto sobre blanco» da ≥ 4,5:1, da ≥ 4,5:1 sobre cualquier ilustración. Un
test unitario (`apps/web/tests/unit/contrasteCarta.test.ts`) calcula ese contraste WCAG con los tokens del CSS (color
del texto, color y alfa del recuadro) para virtudes, defectos y stats, y falla si alguno baja de 4,5. La sombra no
cuenta para el cálculo: es estética (FR-010). La validación visual se hace en `/pruebas/cartas` con cartas de 4, 5
y 6 rasgos.

**Alternativas**: medir píxeles de las 300 ilustraciones (exacto pero caro, y depende del recorte de cada carta);
contorno grueso (`-webkit-text-stroke`), descartado por FR-010.

## R4. Reparto por nivel y regresión exacta (FR-012 a FR-015; SC-004, SC-005)

**Decisión**:

- Dominio nuevo `packages/domain/src/sobres/rareza.ts`: `NivelRareza = 'pobre' | 'escaso' | 'moderado' | 'abundante' |
  'rico'`, `NIVELES_RAREZA`, `NIVEL_RAREZA_POR_DEFECTO = 'moderado'` y el tipo `RepartoSobre = { superclase, crack,
  legendario, altas, probGoatEnAlta }`.
- El reparto vive en los parámetros de equilibrado (`sobres.niveles`, siguiente versión `v7.json`), con la tabla de
  FR-012 y Moderado a `probGoatEnAlta: 0.3`. Así el cambio de 20 % a 30 % es solo de parámetro y queda versionado
  (FR-013).
- `generarSobre(rng, p, reparto)` construye la lista de niveles a partir del reparto. **Consumo del RNG**: primero
  el sorteo POR/DEF y luego un sorteo por carta alta, en orden. Con un reparto `{4, 2, 1, 1, 0.2}` la secuencia de
  llamadas y la lista de niveles son idénticas a las de hoy ⇒ mismos sobres para la misma semilla (SC-005).
- `generarMesa(pool, n, semilla, p, reparto)`: el draft pasa `p.sobres.niveles[partida.nivelRareza]`.
- **Sobres de la tienda**: siguen con el reparto actual (`p.sobres.probGoatEnAlta`, que queda en 0,2). Fuera de
  alcance; así no cambia la economía (`valorEsperadoSobre`).

**Pruebas**: (1) regresión: antes de tocar el generador se guarda en `packages/domain/tests/sobres/fixtures/` la
salida de `generarMesa` para 50 semillas × {4, 8} participantes; tras el cambio, con el reparto de hoy, la salida es
idéntica byte a byte. (2) Estadística SC-004: sección nueva «Rareza del draft» en `pnpm balance` (Principio IX):
1.000 mesas de 8 por nivel con pool de solo Core, media S/C/L/G por participante frente a la tabla, umbral 5 %, y
probabilidad de que un GOAT concreto salga en la mesa.

**Alternativas**: un generador por nivel (duplica cupos y validación); guardar el reparto en la partida (innecesario:
el nivel + la versión de parámetros lo determinan).

## R5. Rico y huecos sin cartas altas (FR-020, FR-021)

**Decisión**: degradación hueco a hueco **antes** de asignar demarcaciones, y solo cuando hace falta:

1. Al planificar cada sobre se cuentan las cartas que quedan por nivel en toda la mesa (`restantes[nivel]`, menos lo
   ya planificado en el sobre). Un hueco Legendario o GOAT sin existencias pasa al otro nivel alto; si tampoco quedan,
   a Crack.
2. Si aun así `asignar()` no encuentra combinación demarcación × nivel en sus 500 reintentos (las altas que quedan
   son, p. ej., todas DEL), se degrada **un** hueco alto más (GOAT→Legendario→Crack, empezando por el último) y se
   reintenta; así hasta agotar los huecos altos. Solo entonces `ErrorPoolInsuficiente`.
3. Este camino no consume RNG cuando hay existencias, así que Moderado con Core sigue idéntico (R4).

Sin repeticiones: las cartas salen con `pop()` de `disponibles`, como hoy, así que ninguna carta aparece dos veces en
la mesa y ningún equipo puede tener un jugador repetido (FR-021). Test: Rico con Core ⇒ las 90 L + G aparecen una vez
y hay 6 Crack de sustitución por mesa de 8; con un pool de 96 L + G ⇒ 0 sustituciones.

**Rechazo al crear (FR-020, último punto)**: el pool (foto `poolCartas` o Core), el número de participantes y la
semilla se fijan al crear la partida, y la semilla de cada mesa es `derivarSemilla(semilla, 'mesa:<i>')`
(`apps/server/src/actores/draft.ts:93`). `crearPartida` hace un **ensayo** de `generarMesa` con esos mismos datos (pocos
ms) y, si lanza `ErrorPoolInsuficiente`, responde `422 POOL_INSUFICIENTE` sin crear nada ni cobrar.

**Alternativas**: reparto exacto de 90 por mesa (sustituido en la sesión del 2026-11-10); permitir repeticiones
(prohibido por FR-020).

## R6. Acceso, ajuste `acceso_niveles_rareza` y cobro (FR-016, FR-017, FR-019, FR-033)

**Decisión**:

- `ServicioAjustes` (`apps/server/src/ajustes/servicio.ts`) pasa de una clave a un mapa de claves conocidas con su
  valor por defecto: `identidad_cartas` (`real`) y `acceso_niveles_rareza` (`libre`), misma caché de 30 s. El CLI
  `ajuste` acepta las dos claves.
- Función pura de dominio `accesoNivelRareza({ nivel, acceso, tipoUsuario, premiumActivo, precio })` →
  `{ permitido: true, coste: 0 | precio } | { permitido: false, motivo: 'INVITADO' }`, con test de toda la tabla de
  FR-019. La usan la validación del servidor y el endpoint que alimenta la pantalla de crear partida.
- Precio: `PARAMETROS_ECONOMIA.precioNivelRareza = 100` (junto al precio del sobre).
- **Cobro e idempotencia**: el cliente genera **una** clave por envío del formulario (no una por petición, como hace
  hoy `api({ idempotente: true })`, que con un doble clic manda dos claves distintas) y deshabilita el botón mientras
  espera. La partida guarda `clave_creacion` con índice único `(anfitrion_id, clave_creacion)`. En la misma
  transacción: se bloquea el saldo del anfitrión (`bloquear`, ya existe), se busca una partida con esa clave (si existe,
  se devuelve sin crear ni cobrar), se crea y se cobra con `cobrar()` (motivo `nivel_rareza`, referencia = id de la
  partida). Un segundo envío concurrente espera al bloqueo y encuentra la primera (FR-033, edge case de doble clic).
- **Devolución**: hoy ningún flujo de usuario registrado pasa una partida de `buscando` a `cancelada` (el evento
  `cancelar` existe en `transicion()` pero nada lo dispara; el abandono es solo de invitados, que no pagan). Se añade
  `devolverCobroRareza(partidaId)` en `ServicioEconomia` (idempotente por índice único de movimiento con motivo
  `devolucion_nivel_rareza` y referencia), y se llama desde el único punto donde una partida sale de `buscando` sin
  draft. Queda probada con un test de integración que fuerza la transición.
- Partidas anteriores: columna `nivel_rareza` con `default 'moderado'` (FR-018).

**Alternativas**: reutilizar `compras` para el cobro por partida (no es un producto, y `compras` exige `producto_tipo`
del catálogo de la tienda); confiar solo en la cabecera `Idempotency-Key` global (deja una ventana de carrera entre
`preHandler` y `onSend` en `apps/server/src/http/app.ts:103`).

## R7. Pase premium (FR-034 a FR-036)

**Decisión**:

- Tabla `pases_premium (usuario_id pk, fin timestamptz null, cortesia boolean)`: estado general de la cuenta,
  independiente de Better Auth (como `perfiles_usuario`). Función pura `premiumActivo(estado, ahora)`:
  `cortesia || (fin !== null && fin > ahora)` (FR-036).
- Compra con el flujo idempotente de siempre, `ServicioEconomia.comprar()`, producto `{ tipo: 'pase_premium', id:
  'pase-30', moneda, importe }`: el historial queda en `compras` (FR-036: saber cuál fue la primera). Al entregar:
  `fin = max(ahora, fin) + 30 días`. Precios en `PARAMETROS_ECONOMIA.pasePremium = { dias: 30, fragmentos: 2990,
  centimos: 299 }`. Solo cuentas registradas (`requiereRegistrado`).
- Cortesía: CLI `pnpm --filter @fbd/server premium <email> <si|no>` (como `ajuste`); no se ve en la tienda.
- La tienda y «Mi perfil» leen `{ activo, cortesia, fin }` de la respuesta de la tienda y de `GET /api/premium`.

**Constitución**: vender el pase **con euros** chocaba con el Principio VII de la 1.4.0 («solo cosméticos propios que
no cambian el juego»). Se resolvió el 2026-11-10 con la enmienda 1.5.0: el dinero real puede comprar acceso a opciones
de partida comunes a todos sus participantes que no entregan cartas, sobres, colecciones ni fragmentos.

## R8. Arranque con la pestaña abierta (FR-022, FR-023; SC-006)

**Causa**: `useSesion.cargar()` (`apps/web/src/estado/sesion.ts`) solo trata el 401. Si el servidor no responde,
`fetch` lanza `TypeError`, o el proxy de Vite devuelve un 5xx sin el JSON de error (o HTML, y `JSON.parse` lanza
`SyntaxError`). `cargar()` relanza, `cargando` se queda en `true` para siempre y `Rutas` pinta `PantallaCargando`
sin volver a intentarlo.

**Decisión**: en `api()` (`apps/web/src/api/cliente.ts`), las peticiones **GET** reintentan solas ante error de red,
cuerpo no JSON o 502/503/504/500 sin cuerpo de error, con espera 0,5 s → 1 s → 2 s (tope de 2 s, así se recupera en
< 5 s desde que el servidor vuelve). Mientras tanto se activa un estado global `conectando` (store pequeño de zustand)
y, si dura más de 3 s, `Marco` y `PantallaCargando` muestran «Conectando con el servidor…» (FR-023). Las peticiones que
no son GET no se reintentan (podrían repetir efectos). Con la sesión caducada, `/api/me` devuelve 401 y el flujo ya
lleva a iniciar sesión (edge case).

**Alternativas**: reintentar solo en `cargar()` (no cubre otras pantallas que cargan al abrirse); service worker
(desproporcionado).

## R9. «Mis partidas» lenta (FR-024, FR-025; SC-007)

**Causa**: `misPartidas()` (`apps/server/src/actores/misPartidas.ts`) lee **todas** las partidas del usuario y por cada
una llama a `gestor.obtener()`, que reconstruye el controlador completo (participantes, mesas, torneo) aunque esté
terminada. Además `participantes` no tiene índice por `usuario_id` (solo el único `(partida_id, usuario_id)`), así que
la consulta recorre la tabla.

**Decisión**:

- Índice `participantes_usuario_idx (usuario_id)`.
- `GET /api/mis-partidas?antes=<cursor>&limite=5`: `enCurso` (solo sin `antes`) se calcula como hoy (son pocas);
  `terminadas` sale de una sola consulta con paginación por clave `(actualizada_en, id)` descendente, sin
  `gestor.obtener()`: `nombreEquipo` y `controladoPorNPC` ya están en la fila de `participantes`. Devuelve `siguiente`
  (cursor) o `null`. La paginación por clave evita duplicados o huecos si una partida termina mientras se pagina.
- Web: `MisPartidas.tsx` muestra en curso + 5 y un botón «Cargar más» que desaparece con `siguiente === null`.

**Alternativas**: `offset` (duplica o salta filas al terminar una partida); scroll infinito (Assumptions: botón por
accesibilidad).

## R10. Error de inicio de sesión (FR-026 a FR-028; SC-008)

**Causa**: en `Inicio.tsx` el `<p className="error">` se inserta al final del formulario (líneas 130 y 171): queda bajo
el pliegue, y al aparecer cambia la altura del bloque centrado y mueve la animación de cartas de la portada.

**Decisión**: componente `AvisoAcceso` arriba del formulario, en una ranura de altura reservada solo dentro de la
tarjeta del formulario y con `position: absolute` sobre su cabecera, de modo que la altura del bloque no cambia; el
contenedor de la animación lleva `contain: layout`. Mensajes según el error:

| Origen | Mensaje |
|---|---|
| 401 / `INVALID_EMAIL_OR_PASSWORD` | «El email o la contraseña no son correctos.» + enlace «¿Has olvidado la contraseña?» |
| error de red o 5xx | «No hay conexión con el servidor. Inténtalo en unos segundos.» |
| 429 (`limitador.ts`) | «Demasiados intentos. Espera un minuto y vuelve a probar.» |

No se distingue email de contraseña (FR-027).

## R11. Tooltip que parpadea en la esquina (FR-029; SC-009)

**Causa**: en `CartaJugador.tsx` (rasgos, ~línea 340) la descripción es un `popover` que se coloca en `onToggle`.
El evento `toggle` es **asíncrono**: el navegador abre el popover, lo pinta un fotograma en su posición por defecto
(arriba a la izquierda, por `top`/`left` sin fijar) y solo después se ejecuta `colocarJunto()`.

**Decisión**: patrón que ya usa `VistaCarta.tsx` (`visibility: hidden` hasta colocar): CSS
`.carta-descripcion:popover-open:not([data-colocada]) { visibility: hidden }`; `colocarJunto()` se llama en
`onBeforeToggle` cuando sea posible y, en todo caso, en `onToggle` marca `data-colocada`; al cerrarse se quita. Además,
`conPuntero` coloca de forma síncrona justo tras `showPopover()`, en la misma tarea (sin fotograma intermedio).

## R12. Media del equipo cortada con zoom (FR-030)

**Causa probable**: la cifra (`.media-equipo-valor`, 50 px en `.ficha-equipo-plantilla`) va en una celda de anchura
fija en px (`.media-equipo-cifra { width: 140px }`) que comparte rejilla con la estrella; con zoom el redondeo de
`line-height` y la caja fija recortan por arriba o abajo. Se confirma en la implementación con Playwright aplicando
`zoom` del 50 % al 200 %.

**Decisión**: tamaños en `em` relativos a la cifra, `line-height: 1` con `padding-block` propio, `overflow: visible`
y la cifra con `z-index` por encima de la estrella. Test e2e: a 50 %, 100 %, 150 % y 200 %, la caja de la cifra queda
dentro de la del contenedor y su `elementFromPoint` central es la cifra, no la estrella.

## R13. «Mi perfil» (FR-031, FR-032; SC-010)

**Decisión**: solo maquetación en `Perfil.tsx` y su CSS: rejilla de dos columnas en escritorio, [equipación local +
visitante] | [escudo + sobre], y la celebración debajo, como hoy. Desde ~760 px de ancho, una columna. Los
manejadores de guardado no cambian (equipaciones con «Guardar»; escudo y sobre al momento). El pase premium activo
muestra su fecha de fin en la cabecera del perfil (FR-034).

## R14. Pruebas

| Ámbito | Prueba |
|---|---|
| Fondos | `core-real` (regla nueva de `imagen_bg`), test de `fondosCore` con un directorio temporal (falta, sobra, repetido), `identidad.test.ts` (plan B) |
| Legibilidad | `contrasteCarta.test.ts` (peor caso sobre blanco) + revisión visual en `/pruebas/cartas` |
| Generador | regresión de 50 semillas (SC-005), cupos de demarcación por nivel, Rico con Core y con pool de 96, sin repetidos (FR-021); `pnpm balance` sección «Rareza del draft» (SC-004) |
| Acceso y cobro | tabla de `accesoNivelRareza`; integración: cobro único con doble envío concurrente, saldo insuficiente (422 con `saldo` y `faltan`), devolución, invitado en `restringido`, pase de cortesía, compra del pase que suma 30 días |
| Mis partidas | integración: 1 en curso + 50 terminadas ⇒ primera página de 5, cursor, sin duplicados al terminar una entre páginas; tiempo con 200 |
| Web | `api()` reintenta GET y no POST; e2e: login fallido (aviso visible, portada quieta), tooltip, media con zoom, perfil a 1366 × 768 |
