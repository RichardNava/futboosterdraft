# Research — Fase 0: Colecciones, fragmentos y tienda

Decisiones técnicas de la spec 006. Cada una indica qué se decide, por qué y qué alternativas se descartaron. Parten del
código actual (rama `006-preparacion-bd-cartas`, sobre la spec 005):

- `jugadores.coleccion` guarda una sola colección por carta;
- `partidas.colecciones text[]` elige el catálogo de la partida, y `Catalogo.pool(colecciones)` filtra por esa columna;
- `generarMesa` (`packages/domain/src/sobres/generador.ts`) reparte los sobres con cupos de demarcación × nivel;
- `DISTRIBUCION_CORE` (`packages/domain/src/catalogo/coleccionCore.ts`) fija el reparto de las 300 cartas.

## R1. Almacenamiento de la pertenencia a colecciones (FR-002, FR-007)

**Decisión**: relación de muchos a muchos. La carta no sabe en qué colecciones está:

- en los datos, un fichero `data/colecciones.json` lista cada colección con los `id` de sus cartas;
- en la base de datos, la tabla `colecciones_cartas (coleccion_id, jugador_id, version)`.

**Alternativas analizadas**:

| Alternativa | Ventajas | Desventajas |
|---|---|---|
| A. Lista de colecciones en la carta (`colecciones: string[]`) | Un solo fichero; consulta «colecciones de una carta» directa | Añadir una colección obliga a editar cada carta; la versión de la carta en cada colección no cabe sin anidar objetos; consulta «cartas de una colección» por filtro |
| B. Copia de la carta en cada colección | Cada colección es autónoma | Duplica datos de juego: una corrección de stats hay que hacerla N veces y pueden divergir (contradice FR-002 y FR-004) |
| **C. Relación N:M (fichero propio + tabla)** | Datos de juego una sola vez; colecciones se editan sin tocar cartas; consulta en ambos sentidos con índices; la versión es una columna más | Un fichero y una tabla más; la validación debe comprobar que los `id` existen |

**Por qué C**: es la única que cumple FR-002 y FR-003 sin rediseño, y su coste (un fichero y una tabla) es pequeño.

## R2. Versiones de carta (FR-003, FR-004, FR-010)

**Decisión**: columna `version text not null default 'normal'` en `colecciones_cartas` y en `cartas_usuario`, con un
`check (version in ('normal'))` que se amplía cuando llegue la premium. La clave de `cartas_usuario` es
`(usuario_id, jugador_id)`, sin la versión: un usuario tiene **una** fila por carta, y una premium futura *mejora* esa
fila en lugar de añadir otra. Así se cumple FR-004 (nunca normal y premium a la vez en la colección activa) y FR-010.

En esta spec, `imagen` e `imagen_bg` siguen en la carta (versión normal). La presentación de las versiones premium irá
en una tabla `versiones_carta (jugador_id, version, imagen, imagen_bg, efectos)` que **no se crea ahora** (nadie la usa
todavía).

**Alternativas descartadas**:

- **Premium como carta distinta con `id` propio y `carta_base`**: rompe «ninguna carta repetida en la mesa», porque el
  generador vería dos `id` para el mismo jugador, y obliga a deduplicar en todo el código.
- **Crear ya `versiones_carta`**: es código y esquema sin uso.

## R3. Formato de los ficheros de datos (FR-049)

**Decisión**:

- `data/core.json` mantiene su nombre (lo usan el CI, el Dockerfile, el seed y las pruebas) y pasa a ser un fichero de
  cartas: `{ version, jugadores }`. Se elimina la clave raíz `coleccion` y el campo `coleccion` de cada carta.
- Las cartas de prueba nuevas van en `data/cartas-prueba.json`, con el mismo formato.
- `data/colecciones.json` contiene `{ version, colecciones: [{ id, nombre, descripcion, tipo, precio_centimos?, cartas }] }`.
  `cartas` es un array de `id` o de `{ id, version }`; el `id` solo equivale a `{ id, version: 'normal' }`.
- `pnpm seed` lee por defecto los dos ficheros de cartas y el de colecciones. Admite `--file` repetido y
  `--colecciones`.

**Cambios en cada carta**:

- `nombre_carta` (obligatorio, no vacío);
- `imagen` e `imagen_bg` (obligatorios, rutas absolutas del sitio bajo `/cartas/`);
- `nacionalidad`, validada contra la tabla de selecciones (R6).

**Esquemas**: `player-data.schema.json` se actualiza y se añade `colecciones.schema.json`, los dos en `@fbd/protocol`.

**Validación cruzada**: al validar el catálogo (`validarCatalogo` en el dominio), se rechaza:

- un `id` de colección repetido;
- una colección que referencia una carta inexistente;
- una carta que no está en ninguna colección;
- que no exista exactamente una colección `basica` (Core);
- que Core no cumpla `DISTRIBUCION_CORE` exacta;
- una colección de pago sin `precio_centimos`.

## R4. Migración de las 300 cartas Core

**Decisión**: un script determinista, `tools/fixtures/src/migrarCartas006.ts`, que se ejecuta una vez y deja el
resultado versionado en `data/core.json`:

- **`nombre_carta`**: el nombre y el primer apellido (`"Teo Valotal"`), que es lo que muestran hoy las vistas compactas.
- **`GBR`**: las 19 cartas se reparten entre `ENG`, `SCO`, `WAL` y `NIR` con una semilla fija, en proporción 10/4/3/2.
  Además, se reescribe el código en `historia` (`"(GBR)"` → `"(ENG)"`, etc.).
- **`imagen`** e **`imagen_bg`**: la ruta genérica de su demarcación (R8).
- **`coleccion`**: se elimina.

La migración de base de datos (R10) aplica los mismos datos en las bases ya creadas a través del seed, que es
idempotente (upsert por `id`).

## R5. Colecciones de prueba (FR-006)

**Decisión**: `tools/fixtures/src/generarColeccionesPrueba.ts` reutiliza el generador de jugadores de `generarCore.ts`
(stats, media, nivel, virtudes y defectos, con las mismas reglas de validación) con una semilla fija. Genera:

| Colección | Cartas | Composición |
|---|---|---|
| *All Stars* (`all-stars`) | 45 | 3 de Core + 42 nuevas (`id` 301–342), varias nacionalidades |
| *Top Argentinos* (`top-argentinos`) | 42 | 3 de Core (`ARG`) + 6 de *All Stars* + 33 nuevas `ARG` (`id` 343–375) |

Se cumple FR-006: las dos colecciones comparten 6 cartas (≥ 5) y cada una tiene 3 cartas de Core (≥ 3). Para que el sobre
de la tienda se pueda probar con los cupos completos, las cartas nuevas cubren todas las combinaciones de demarcación ×
nivel con al menos 2 cartas cada una.

**Precios provisionales**: 4,99 € *All Stars* y 3,99 € *Top Argentinos* (R9).

## R6. Selecciones, banderas y escudos (FR-043, FR-044, FR-048)

**Decisión**:

- **Tabla única de selecciones**: `packages/domain/src/catalogo/selecciones.ts` exporta
  `SELECCIONES: Record<CodigoSeleccion, { nombre: string }>` con los códigos ISO 3166-1 alfa-3 actuales más `ENG`,
  `SCO`, `WAL` y `NIR`, sin `GBR`. La validación de cartas rechaza un código fuera de la tabla.
- **Banderas**: SVG en `apps/web/public/banderas/{CODIGO}.svg`, copiadas del paquete `flag-icons` (licencia MIT, banderas
  de dominio público), incluidas `gb-eng`, `gb-sct`, `gb-wls` y `gb-nir`. Se copian los ficheros; no se añade la
  dependencia, porque son unos 25 ficheros estáticos.
- **Escudos**: SVG o PNG en `apps/web/public/escudos/{CODIGO}.svg`, obtenidos a mano (tarea manual). Las rutas se
  construyen en un único sitio, `apps/web/src/textos/selecciones.ts`, con la constante `ESCUDOS_ACTIVOS`. Si vale
  `false`, ninguna carta muestra escudo. Sustituir o suprimir los escudos solo cambia esa carpeta o esa constante
  (FR-044); las cartas no guardan rutas de banderas ni de escudos.
- **Alternativa** cuando falta un escudo o una bandera: `onError` de la `<img>` la oculta y muestra el código en texto
  (`ESP`), sin icono roto (FR-048).

**Riesgo abierto** (Assumptions): la licencia de los escudos oficiales se revisa antes de producción. Hasta entonces,
bloquea el paso a producción.

## R7. Imágenes de la carta: `imagen` e `imagen_bg` (FR-045 a FR-047a, FR-048)

**Decisión**:

- Siluetas superiores: `apps/web/public/cartas/siluetas/{por,def,med,del}.svg`. Son la figura actual de
  `SiluetaJugador`, exportada a un solo color, con el emblema como hueco (`fill-rule="evenodd"`).
- Fondos de acción: `apps/web/public/cartas/fondos/{por,def,med,del}.svg`. Son siluetas planas nuevas de un color, con
  la misma línea gráfica: parada (POR), entrada o despeje (DEF), pase (MED) y disparo (DEL).
- **Pintado**:
  - si la ruta termina en `.svg`, se pinta como **máscara CSS** (`mask-image: url(...)` + `background: currentColor`),
    de modo que toma el color del nivel de la carta igual que hoy;
  - cualquier otra extensión (una foto propia de un GOAT) se pinta con `<img>`.
- **Fondo**: `opacity: 0.25`, dentro del intervalo del 20 % al 30 % de FR-045, y `pointer-events: none` detrás del
  contenido.
- **Alternativa ante un fallo de carga**:
  - para `<img>`, `onError` cambia a la ruta genérica de la demarcación;
  - para las máscaras, el fichero genérico siempre existe, y una ruta propia `.svg` que falle deja la carta sin fondo,
    sin icono roto.
- `SiluetaJugador.tsx` deja de usarse en la carta y se elimina si no queda ningún uso.

**Alternativa descartada**: `<img src=*.svg>` para las siluetas, porque pierde `currentColor` y obligaría a tener un SVG
por nivel y demarcación.

## R8. Colección propia: materialización de Core (FR-009, FR-011)

**Decisión**: la tabla `cartas_usuario` guarda una fila por carta poseída, también las de Core, con `activa`, `via` y
`obtenida_en`. Las filas de Core se crean **de forma perezosa e idempotente** con `asegurarColeccion(usuarioId)`:

```sql
insert into cartas_usuario … select … from colecciones_cartas where coleccion_id = 'core'
on conflict do nothing
```

Se llama al entrar en cualquier endpoint de colección o tienda y al crear una partida como usuario registrado.

**Por qué**:

- cubre a los usuarios que ya existían y a los invitados que se registran (`onLinkAccount`) sin un *backfill* ni un hook
  de Better Auth;
- si Core gana cartas, se entregan solas;
- Core no se puede desfragmentar, así que reinsertar sus cartas nunca devuelve una carta que el usuario haya destruido.

**Alternativas descartadas**:

- **Core implícita** (solo se guardan las cartas desactivadas): duplica la lógica de «qué poseo» en cada consulta.
- **Hook de registro**: no cubre a los usuarios existentes.

## R9. Economía: parámetros y precios (FR-019, FR-020, FR-024, Assumptions)

**Decisión**: `packages/domain/src/economia/parametros.ts` exporta `PARAMETROS_ECONOMIA`:

```ts
{
  recompensaTorneo: 10,
  desfragmentar: { Superclase: 25, Epico: 50, Legendario: 75, GOAT: 100 },
  precioSobreFragmentos: 1000,
  precioSobreCentimos: 99,
  paquetesFragmentos: [
    { id: 'fragmentos-1000', fragmentos: 1000, centimos: 99 },
    { id: 'fragmentos-5500', fragmentos: 5500, centimos: 499 },
    { id: 'fragmentos-12000', fragmentos: 12000, centimos: 999 },
  ],
}
```

`validarParametrosEconomia(p, parametrosEquilibrado)` calcula el valor esperado de desfragmentar un sobre a partir de los
cupos y de `sobres.probGoatEnAlta`: 4·25 + 2·50 + 75 + (0,8·75 + 0,2·100) = 355. Rechaza `precioSobreFragmentos` ≤ ese
valor (FR-024). Una prueba de unidad la ejecuta sobre los parámetros vigentes.

Los precios de las colecciones están en `data/colecciones.json`. Todos los precios en dinero se guardan en céntimos de
euro (`integer`) y la interfaz los muestra con `Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })`.

## R10. Persistencia e integridad de las operaciones (FR-017, FR-018, FR-032, SC-006, SC-007)

**Decisión**: una migración, `0011_colecciones`, con estas tablas (detalle en [data-model.md](./data-model.md)):

| Tabla | Contenido |
|---|---|
| `colecciones` | las colecciones del catálogo |
| `colecciones_cartas` | la pertenencia de las cartas a las colecciones |
| `cartas_usuario` | la colección propia de cada usuario |
| `colecciones_usuario` | las colecciones compradas |
| `saldos_fragmentos` | el saldo de cada usuario, con `check (saldo >= 0)` |
| `movimientos_fragmentos` | el historial de cambios del saldo |
| `compras` | las compras, con el `id` que genera el cliente |

**Atomicidad**: cada operación (comprar, desfragmentar, recompensar) se ejecuta en **una transacción** del servicio
`ServicioEconomia` (`apps/server/src/economia/`).

**Concurrencia del saldo**: el cargo se hace con

```sql
update saldos_fragmentos set saldo = saldo - $precio where usuario_id = $u and saldo >= $precio returning saldo
```

Si no devuelve ninguna fila, la respuesta es `422 SALDO_INSUFICIENTE`. Dos pestañas a la vez nunca dejan el saldo en
negativo; además, el `check` de la tabla lo garantiza.

**Idempotencia**:

- **Compras**: el cliente genera un `idCompra` (UUID) por intento y lo reenvía en cada reintento. `compras.id` es la
  clave primaria. Si llega un `idCompra` ya completado, se devuelve el resultado guardado en `compras.resultado`, sin
  cobrar otra vez. Si dos peticiones con el mismo `idCompra` llegan a la vez, el `insert` de la segunda choca con la
  clave y espera a que la primera confirme.
- **Recompensa de torneo**: índice único parcial `(usuario_id, motivo, referencia)` en `movimientos_fragmentos` para el
  motivo `recompensa_torneo`. Se inserta con `on conflict do nothing`.
- **Desfragmentar**: el `delete … returning` de `cartas_usuario` decide. Si la fila ya no existe, la respuesta es
  `404 CARTA_NO_POSEIDA`, y un reintento no suma fragmentos dos veces.

**Saldo frente a historial (SC-006)**: el saldo y el movimiento se escriben en la misma transacción. Una prueba de
integración comprueba que `sum(importe) = saldo` tras una serie aleatoria de operaciones.

**Alternativa descartada**: reutilizar `peticiones_procesadas`, que está ligada a `partida_id` y no guarda el estado de
una compra.

## R11. Mínimo de la colección activa (FR-012, FR-013, SC-004)

**Decisión**: función pura del dominio `comprobarMinimoActivo(activas, cambio)`, en
`packages/domain/src/coleccion/minimo.ts`. Recibe el recuento de cartas activas por demarcación × nivel (la función
`recuentoPorDemarcacionYNivel` ya existe) y devuelve `{ ok: true }` o
`{ ok: false, demarcacion, nivel, minimo, activas }`.

El servidor la aplica antes de desactivar o desfragmentar, dentro de la transacción y tras bloquear las filas del
usuario con `select … for update`, para que dos cambios simultáneos no se salten el mínimo. El cliente la usa solo para
deshabilitar el selector y explicarlo; el servidor decide (Principio VI).

Una prueba de propiedades (fast-check) genera secuencias aleatorias de desactivaciones y desfragmentaciones y comprueba
que el recuento nunca baja del mínimo (SC-004).

## R12. Pool del torneo y foto de la colección activa (FR-014, FR-015, FR-016)

**Decisión**:

- Nueva columna `partidas.pool_cartas integer[]`, que admite `null`.
- Al crear una partida, si el anfitrión es un usuario registrado, se guarda la lista de `id` de sus cartas activas en
  ese momento. Si es un invitado, queda `null`.
- `iniciarDraft` usa `catalogo.poolPartida(partida)`: `pool_cartas` si existe y, si no, las cartas de
  `partida.colecciones` según la pertenencia (las partidas antiguas y las de invitados siguen con Core).
- `Catalogo` pasa a cargar también `colecciones_cartas` y `pool(colecciones)` filtra por pertenencia, no por
  `jugador.coleccion`.
- `generarMesa` no cambia: los cupos y la regla de no repetir cartas son los mismos para cualquier pool (FR-016). Como la
  colección activa siempre cumple el mínimo de Core, una mesa de 8 siempre se puede generar.

**Por qué una foto de los `id` y no de las cartas**: los datos de juego de las cartas no cambian por las acciones del
usuario, y las versiones de catálogo ya resuelven los cambios de rasgos (`version_catalogo`). Si el usuario
desfragmenta una carta de la foto, la carta sigue en el catálogo, así que el torneo no se altera (Edge Cases).

**Alternativa descartada**: generar los sobres al crear la partida. Cambia el momento de la generación (hoy se hace al
iniciar el draft) y la semilla de mesas de partidas de 16.

## R13. Sobre de la tienda (FR-029, SC-005)

**Decisión**: función pura `generarSobreTienda(disponibles, semilla, parametros)` en
`packages/domain/src/sobres/tienda.ts`:

1. Reutiliza `generarSobre` para sortear el plan (cupos de demarcación y nivel, hueco POR o DEF, carta alta).
2. Cada casilla se cubre en este orden:
   - con la combinación pedida;
   - si está agotada, con el mismo nivel y otra demarcación;
   - si tampoco, con el nivel inmediatamente inferior;
   - y, si no hay inferior, con el superior (Edge Cases).
3. Lanza `ErrorPoolInsuficiente` si `disponibles.length < 8`.

`disponibles` son las cartas de colecciones de pago que el usuario no posee. La semilla se deriva de `idCompra`, así que
un reintento da las mismas cartas.

El reparto entre colecciones es uniforme dentro de cada combinación, porque el pool no distingue colecciones
(Assumptions).

## R14. Recompensa de torneo (FR-019, SC-008)

**Decisión**: en `terminarTorneo` (`apps/server/src/actores/torneo.ts`), tras marcar la partida como `terminada`, si el
campeón es un participante `humano` cuyo usuario no es invitado (`usuarios.es_invitado = false`), se llama a
`servicioEconomia.recompensarTorneo(usuarioId, partidaId, PARAMETROS_ECONOMIA.recompensaTorneo)`. Es idempotente (R10).

**Casos sin recompensa**: las partidas `cancelada` o `abandonada` no pasan por `terminarTorneo`, así que no hay
recompensa.

**Pantalla de campeón**: la vista del torneo añade `recompensaFragmentos: number | null`, que se lee del movimiento
guardado. `PantallaCampeon` muestra «+10 fragmentos» o, para un invitado, la invitación a registrarse.

## R15. Sección «Colección»: datos en el cliente (FR-035 a FR-038, SC-001, SC-002)

**Decisión**: `GET /api/coleccion` devuelve **toda** la colección propia de una vez: hasta unos 400 resúmenes de carta,
cerca de 150 KB, que se pueden comprimir. La búsqueda, los filtros, la ordenación y la paginación se hacen en el cliente
con `useMemo`.

- **Búsqueda**: normaliza con `normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()` sobre `nombre_carta`, `nombre` y
  `apellidos`.
- **Cartas por página**: `columnas × filas`. Las columnas salen del ancho del contenedor (`ResizeObserver`) y del tamaño
  de carta (pequeño, mediano o grande); las filas son fijas por tamaño. Al cambiar el tamaño, se recalcula la página
  para que siga visible la primera carta de la página anterior (US1, escenario 3).
- **Preferencias** (tamaño, ordenación y filtros, FR-038): en `localStorage['fbd.coleccion.<usuarioId>']`, como ya se
  hace con `fbd.velocidad2d` y `fbd.sonido`. *Limitación*: se recuerdan por navegador, no entre dispositivos. Pasarlo a
  `perfiles_usuario` es una columna `jsonb` más si se pide.

Con 500 cartas, filtrar y ordenar en memoria tarda bastante menos de 50 ms, dentro de SC-002.

**Alternativa descartada**: paginación en el servidor. Añade latencia de red a cada cambio y una API de consultas sin
necesidad a esta escala.

## R16. Presentación de compras y aperturas (FR-028a, FR-030, FR-031)

**Decisión**:

- **Apertura de un sobre de la tienda**: reutiliza `AperturaSobre` (draft) y `SobreArte`. La revelación «una a una /
  todas» es un conmutador sobre la cuadrícula de cartas reveladas.
- **Confirmación de la compra de una colección**: una animación corta, de unos 1,2 s, con `Trofeo` o el sello
  «Adquirida» (transform y opacity con la Web Animations API, como en la spec 005). Después se muestra el resumen.
- Las dos animaciones tienen un botón «Saltar» y respetan `prefers-reduced-motion`, en cuyo caso se muestra el resultado
  directamente.
- **Pago simulado**: un `Dialogo` de pago con la cinta «PAGO DE PRUEBA — no se cobra nada», sin campos de tarjeta. Al
  confirmar, llama al endpoint de compra.

No se añade ninguna dependencia.

## R17. Pruebas y criterios estadísticos (constitución IX)

| Criterio | Cómo se comprueba |
|---|---|
| SC-003 | Nueva comprobación `colecciones` en `tools/balance`: 100 mesas con pools de colecciones activas aleatorias que cumplen el mínimo; ninguna carta fuera del pool y todos los sobres con sus cupos |
| SC-005 | La misma comprobación: 1.000 sobres de tienda con colecciones poseídas aleatorias; sin repetidas, sin poseídas y con el reparto de niveles del draft |
| SC-004 | Propiedad con fast-check en `packages/domain/tests/coleccion/minimo.test.ts` |
| SC-006 y SC-007 | Integración en `apps/server/tests/integration/tienda.test.ts`: compras repetidas con el mismo `idCompra`, compras concurrentes desde dos clientes y la suma del historial igual al saldo |
| SC-001, SC-002, SC-009 y SC-010 | Playwright: `coleccion.spec.ts` y `tienda.spec.ts`, y revisión manual con la [quickstart](./quickstart.md) |

## R18. Constitución (FR-008)

**Decisión**: modificación PATCH (de 1.1.0 a 1.1.1). Solo registra una decisión, sin cambiar ningún principio:

- se mueve el punto «Colecciones adicionales a "Core"» de «Decisiones aún pendientes» a «Decisiones resueltas»;
- se añade la referencia a `specs/006-preparacion-bd-cartas/` (`spec.md` FR-001 a FR-033 y este plan).

Si antes se aplica la propuesta 1.2.0 de la spec 005, la versión pasa a ser la 1.2.1.
