# Research (Fase 0): Rework de la tienda

**Fecha**: 2026-11-05 · **Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md)

Cada apartado sigue el formato Decisión / Razón / Alternativas. Las rutas son relativas a la raíz del repositorio.

## R1. Punto de partida en el código

- **Tienda y economía**: `apps/server/src/economia/servicio.ts` (`ServicioEconomia`). Toda compra pasa por `comprar()`,
  que es idempotente por `idCompra`, bloquea la fila de saldo (`select … for update`) y guarda en `compras`. Las rutas
  están en `apps/server/src/http/tienda.ts`, los tipos en `packages/protocol/src/http/tienda.ts` y los precios en
  `packages/domain/src/economia/parametros.ts` (`PARAMETROS_ECONOMIA`).
- **Círculo de color**: un único componente, `Chapa` en `apps/web/src/componentes/Marcador.tsx`. Lo usan `Marcador`,
  `GoleadoresFranja`, `ResumenEventos`, `Partido2D` (franja y poseedor) y `ReproduccionPartido`. Los colores salen de
  `partido.inicio.equipaciones` (`packages/protocol/src/ws/partido.ts`), que construye `equipacionesDelPartido` en
  `apps/server/src/actores/partidoRapido.ts`, usado también por `partidoEntreHumanos.ts`. La chapa de
  `CampoEquipo.tsx` es la de cada jugador en el campo, no la del equipo, y no cambia.
- **Identidad del equipo por partida**: `apps/server/src/actores/identidad.ts` toma el nombre y las equipaciones del
  perfil al unirse (`gestor.ts`, `sala.ts`). Se cambian por partida en la pantalla de Alineación con
  `PUT /api/partidas/:id/nombre-equipo` y `PUT /api/partidas/:id/equipaciones`. Las equipaciones de los NPC y de los
  equipos sin ellas se sortean en `actores/draft.ts` con `derivarSemilla(semilla, 'equipaciones:<pid>')`.
- **Perfil**: tabla `perfiles_usuario` y `GET/PUT /api/perfil` (`apps/server/src/http/perfil.ts`), solo para usuarios
  registrados.
- **Sobre**: un único componente, `SobreArte` (`apps/web/src/componentes/arte/SobreArte.tsx`), que pinta
  `/cartas/sobre.svg`. La versión rasgada es la clase `.rasgado`, un `clip-path` fijo en `estilos/cartas.css`. Se usa
  en `AperturaSobre` (draft y tienda) y como decoración en Inicio, Sala, CrearPartida, Draft y Tienda.
- **Catálogo de cartas**: `Catalogo` (`apps/server/src/persistencia/repos/catalogo.ts`) se carga en memoria al arrancar.
  Cada partida lo ve en su versión (`partidas.version_catalogo` → `Catalogo.enVersion`, usado por
  `ControladorPartida.catalogo`). Todas las cartas que se envían al cliente salen de `Catalogo.resumen()` o de
  `/api/catalogo/jugadores`.
- **Retratos**: `apps/web/public/cartas/retratos/*.webp` (300, de Transfermarkt), referenciados en el campo `imagen` de
  `data/core-real.json`. Siluetas por demarcación en `apps/web/public/cartas/siluetas/{por,def,med,del}.svg`.
- **Recursos nuevos**: `escudos/` (18 `NN_nombre.png` gratuitos y 20 `escudo_premiun_N.png`) y `sobres/` (30 PNG). En
  `sobres/` **no hay versiones rasgadas**: hay que generarlas (R8).

## R2. Catálogo de cosméticos: datos versionados y tabla

**Decisión**: el catálogo vive en `data/cosmeticos.json` (cosméticos y packs) y `pnpm seed` lo carga en las tablas
`cosmeticos` y `packs_cosmeticos`, como ya se hace con `data/colecciones.json`. El tipo es un texto con un *check*
(`'escudo' | 'sobre'`). Añadir un tipo nuevo (FR-022) solo exige ampliar ese *check*, la unión de TypeScript y su
selector. El esquema, la compra y la posesión no cambian.

**Razón**: el catálogo es editable sin tocar código, igual que el de cartas, y la posesión necesita una clave foránea.

**Alternativas**: una constante en `packages/domain` (sin FK, y cambiar un precio exigiría desplegar código); una
tabla por tipo (contradice FR-022).

## R3. Identificadores y rutas de imagen

**Decisión**: los ids son *slugs* sin tildes derivados del fichero, con el prefijo del tipo:
`escudo-flor-de-lis-azul-oro`, `escudo-premium-1` (se corrige la errata «premiun»), `sobre-cubismo`, `sobre-1`. El
sobre gratuito por defecto es `sobre-original`. Las imágenes siguen una convención fija a partir del id, así que el
cliente no necesita consultar el catálogo para pintar un escudo:

- `/cosmeticos/escudos/<id>-64.webp` (marcador y resumen) y `/cosmeticos/escudos/<id>-256.webp` (selector y tienda).
- `/cosmeticos/sobres/<id>.webp` (512 × 768) y `/cosmeticos/sobres/<id>-mini.webp` (192 × 288).
- `sobre-original` sigue usando `/cartas/sobre.svg`.

**Razón**: un escudo aparece en muchas vistas que solo conocen el id que llega en `partido.inicio`.

**Alternativas**: enviar la URL en cada mensaje (más bytes y acopla el protocolo a la ruta física).

## R4. Adaptación de imágenes (FR-004, SC-005)

**Decisión**: un guion `tools/fixtures/src/cosmeticos.ts` (`pnpm --filter @fbd/fixtures imagenes`) que lee las
carpetas de origen indicadas por argumento y escribe en `apps/web/public/cosmeticos/` y
`apps/web/public/cartas/retratos-propios/`. Usa **sharp** (nueva `devDependency` de `@fbd/fixtures`; no entra en el
servidor ni en el cliente). Salida WebP con calidad 80 y los tamaños de R3. El guion también genera los ids y nombres
iniciales de `data/cosmeticos.json`, que después se pueden editar a mano. Las carpetas de origen salen del repositorio
al cerrar la spec.

Estimación: 38 escudos × (~4 + ~20 kB) + 30 sobres × (~70 + ~15 kB) ≈ 3,5 MB. Es aproximadamente el 3 % de los
~116 MB originales, por debajo del límite del 10 % (SC-005). El guion imprime el total y falla si lo supera.

**Razón**: hay que procesar casi 400 imágenes de una vez y repetir el proceso cuando llegue arte nuevo. sharp es el
estándar en Node, se instala con `pnpm add -D` y trae binarios precompilados para Windows y Linux.

**Alternativas**: convertir a mano (no repetible); ImageMagick o cwebp por línea de comandos (no siempre instalados en
Windows); `@squoosh/lib` (abandonada).

## R5. Retratos propios en estilo manga (FR-021)

**Decisión**: los retratos que entrega el responsable del juego se procesan con el mismo guion (R4) a
`/cartas/retratos-propios/<slug>.webp`, con 278 × 362 (el doble de 139 × 181). El campo `imagen` de
`data/core-real.json` apunta a la ruta nueva. La regla «retrato de terceros» es cualquier `imagen` bajo
`/cartas/retratos/`. Al cerrar la spec, `apps/web/public/cartas/retratos/` se borra y la validación de Core exige 0
retratos de terceros.

**Razón**: con un directorio distinto, el origen del retrato se distingue sin campos nuevos, y la validación (FR-020)
lo cuenta con una sola comparación.

**Alternativas**: sobrescribir los ficheros con el mismo nombre (no se distingue cuáles quedan pendientes); un campo
`origen_retrato` (dato redundante).

## R6. Escudo de cada participante

**Decisión**:

- Nueva columna `participantes.escudo` (texto, puede ser nulo). Al unirse, `identidad.ts` toma el escudo del perfil si
  la cuenta lo tiene disponible (FR-009).
- Si el valor es nulo, el escudo se calcula al leerlo con `escudoDe(c, pid)`, sin migrar datos:
  - registrado: `escudoAsignado(usuarioId)`, que elige entre los 18 gratuitos con un *hash* estable del id (FR-005);
  - NPC: `derivarSemilla(semilla, 'escudo:<pid>')`, que elige entre los gratuitos;
  - invitado sin elección: `null`, y se pinta el círculo de color (indicación del plan).
- Las funciones puras (`escudoAsignado` y `escudosEnPartido`) van en `packages/domain/src/cosmeticos/`.

Así, los torneos en curso al desplegar reciben su escudo sin tocar la partida (caso límite de la spec), y una partida
conserva su escudo aunque el cosmético se retire después.

**Razón**: es el mismo patrón que las equipaciones, que ya se sortean con la semilla de la partida.

**Alternativas**: rellenar la columna con una migración (las cuentas sin escudo elegido cambiarían de escudo si cambia
la lista de gratuitos); guardar el escudo solo en el perfil (rompe «cambiarlo solo para esa partida»).

## R7. Mismo escudo en un partido (FR-008)

**Decisión**: `escudosEnPartido(local, visitante)` devuelve `{ local: null, visitante: null }` cuando los dos ids
coinciden. Entonces el cliente pinta círculos: el local con el color principal y el visitante con el secundario de la
equipación que lleva en ese partido. Si ese secundario se confunde con el principal del local (la regla de parecido de
la 003, `equipacionesParecidas`), el visitante usa su principal, que ya es distinguible porque
`equipacionEnPartido` resuelve los choques de equipación.

**Razón**: cumple la respuesta de Q2. El caso del secundario parecido no lo cubría la spec, y sin esta salida SC-003
podría fallar.

**Alternativas**: decidir los colores en el servidor (el cliente ya tiene las equipaciones y la regla de parecido).

## R8. Rasgadura propia de cada diseño (FR-004, US2-4)

**Decisión**: la versión rasgada se dibuja en el cliente con un `clip-path: polygon(...)` generado por
`rasgaduraDe(id)` (`apps/web/src/componentes/arte/rasgadura.ts`). La función usa un generador con semilla a partir del
id, con 17 a 23 vértices, la altura y el ancho de los picos variables y una banda del 8 % al 22 %. `sobre-original`
conserva el polígono actual. Un test comprueba que los 31 polígonos son distintos entre sí.

**Razón**: la spec permite generarla de forma automática (Assumptions), no duplica imágenes y la animación de apertura
actual ya funciona con `clip-path`.

**Alternativas**: un segundo PNG rasgado por diseño (el doble de peso y un paso manual más).

## R9. Carrusel con baraja por cuenta

**Decisión**:

- Nuevas columnas en `perfiles_usuario`: `escudo`, `sobre_favorito`, `sobre_carrusel` (booleano), `sobres_marcados`
  (array de textos), `sobre_baraja` (array de textos con lo que queda por salir) y `sobre_ultimo`.
- La función pura `siguienteSobre(estado, rng)` (`packages/domain/src/cosmeticos/carrusel.ts`) saca el siguiente
  diseño. Si la baraja está vacía, baraja los marcados sin poner el último en primer lugar.
- `POST /api/perfil/aspecto/sobre-siguiente` avanza la baraja dentro de una transacción con la fila del perfil
  bloqueada y devuelve el diseño. El cliente lo llama una vez por cada **apertura** de sobre: las 3 del draft (al
  empezar cada ronda) y cada compra de sobre en la tienda.
- Los sobres decorativos (Inicio, Sala…) muestran el diseño actual (`sobreActual`) sin avanzar la baraja.
- Al cambiar los marcados, se vacía la baraja.

**Razón**: la posición se guarda por cuenta (indicación del plan). Es un cosmético personal (FR-013), así que confiar
en que el cliente pida el siguiente no afecta a la integridad, y el draft no cambia su protocolo.

**Alternativas**: elegir el diseño en el actor del draft al repartir (mezcla un cosmético con el estado competitivo y
obliga a leer perfiles dentro de la partida); guardar la baraja en `localStorage` (descartado: tiene que ser por
cuenta).

Los invitados no tienen perfil: siempre ven `sobre-original`.

## R10. Compras de cosméticos y packs

**Decisión**:

- `ServicioEconomia.comprarCosmetico(usuario, id, moneda, idCompra)` y `comprarPack(usuario, packId, idCompra)`
  reutilizan `comprar()`, que ya aporta la idempotencia, el bloqueo y la compra repetida (FR-015, SC-006).
- `compras.producto_tipo` admite `'cosmetico'` y `'pack_cosmeticos'`. El *check* de `movimientos_fragmentos.motivo`
  admite `'compra_cosmetico'` y `'compra_coleccion'`. `cobrar()` recibe el motivo en lugar de fijar `'compra_sobre'`.
- La posesión es la tabla `cosmeticos_usuario` (usuario, cosmético, `compra_id`, `adquirido_en`), con clave primaria
  (usuario, cosmético).
- Comprar un cosmético que ya se tiene da `409 COSMETICO_POSEIDO`. Un pack solo se puede comprar si **no** se tiene
  ninguno de sus cosméticos (`409 PACK_CON_POSEIDOS`, con un mensaje que propone comprarlos sueltos); así nunca se paga
  por algo repetido.
- Los packs son fijos y de venta directa (nunca al azar; monetizacion.md, punto 8): 4 de escudos (premium 1–5, 6–10,
  11–15 y 16–20) y 6 de sobres, de 5 en 5 en el orden del catálogo: primero los 6 con nombre y después `sobre-1` a
  `sobre-24` (ver [data-model.md §1](data-model.md)). La composición se puede editar en `data/cosmeticos.json`. Solo
  se pagan con euros.
- Precios en `data/cosmeticos.json`: escudo 25 céntimos o 250 fragmentos; sobre 50 céntimos o 250 fragmentos; pack de
  escudos 99 céntimos; pack de sobres 199 céntimos.

**Razón**: reutiliza el camino de compra ya probado (006/SC-007), y la regla del pack es la más sencilla que es justa.

**Alternativas**: un pack con precio proporcional a lo que falta (más reglas y más tests para poco valor).

## R11. Fragmentos y venta de cartas tras Q4 = A (FR-002)

**Decisión**:

- Se retiran los paquetes de fragmentos. `PARAMETROS_ECONOMIA.paquetesFragmentos` queda vacío y
  `POST /api/tienda/fragmentos/:paquete/comprar` responde `410 PRODUCTO_RETIRADO`. Las compras antiguas siguen en el
  historial.
- El sobre de cartas solo se paga con fragmentos: `CuerpoCompraSobre.moneda` solo admite `'fragmentos'`, y `'eur'` da
  `422 MONEDA_NO_ADMITIDA`.
- Las colecciones de pago pasan a pagarse con fragmentos: nuevo campo `precio_fragmentos` en `colecciones` y en
  `data/colecciones.json`, con la equivalencia anterior (1000 fragmentos ≈ 0,99 €), es decir, All Stars 5000 y Top
  Argentinos 4000. `precio_centimos` se conserva para cuando haya licencia, pero no se ofrece.
- Una constante de dominio `VENTA_CARTAS_CON_DINERO = false` documenta la regla en un solo sitio, y los tests
  comprueban que ninguna ruta de cartas acepta euros.

**Riesgo a vigilar (fuera de alcance)**: los fragmentos ahora solo entran por torneos ganados (10 fragmentos), por
cartas desfragmentadas y por duplicados. Con esos ingresos, un cosmético de 250 fragmentos equivale a unos 25 torneos
ganados, y una colección a cientos. Es una decisión de equilibrio de la economía (`recompensaTorneo`), así que se anota
en el ROADMAP para una spec de economía y no se cambia aquí.

**Alternativas**: borrar las rutas (se rompería el cliente antiguo sin un error claro; 410 es explícito).

## R12. Ajuste de identidad sin reiniciar (FR-018, SC-008)

**Decisión**:

- Nueva tabla `ajustes` (`clave` como clave primaria, `valor` jsonb, `actualizado_en`), con la fila
  `identidad_cartas = "real" | "alternativa"`. Se cambia con un guion:
  `pnpm --filter @fbd/server ajuste identidad_cartas alternativa`.
- `ServicioAjustes.identidadCartas()` la lee con una caché de 30 s. La primera lectura tras el cambio llega en ≤ 30 s,
  sin reiniciar.
- Nueva columna `partidas.identidad` (`'real'` por defecto). Al crear la partida se copia el valor del ajuste, así que
  las partidas en curso conservan el suyo (Q de 2026-11-05, opción C).
- `Catalogo.conIdentidad(identidad)` devuelve una vista cacheada, como `enVersion`, con `nombre`, `apellidos`,
  `nombre_carta` e `imagen` sustituidos. `ControladorPartida.catalogo` encadena
  `enVersion(v).conIdentidad(identidad)`.
- Fuera de las partidas (colección, tienda, rutas `/api/catalogo/*`, historial de fragmentos), el servicio usa
  `catalogo.conIdentidad(await ajustes.identidadCartas())`.

**Razón**: el patrón ya existe y está probado con la versión del catálogo. Las stats, los rasgos y los ids no cambian,
así que el motor y la IA no se enteran (FR-019): `test:equivalence` y un test con la misma semilla en los dos modos lo
demuestran.

**Alternativas**: variable de entorno (exige reiniciar); decidir la identidad en el cliente (los nombres reales
seguirían viajando por la red).

## R13. Identidad alternativa en los datos (FR-017, FR-020)

**Decisión**:

- Campo opcional `identidad_alternativa: { nombre, apellidos, nombre_carta, imagen? }` en `data/core-real.json` y en
  `data/cartas-prueba.json`, con las columnas nulables `nombre_alt`, `apellidos_alt`, `nombre_carta_alt` e
  `imagen_alt` en `jugadores`.
- Sin identidad alternativa, la vista «alternativa» usa un nombre genérico (`Portero 12`, `Defensa 40`… con el texto
  de la demarcación y el id) y la silueta `/cartas/siluetas/<dem>.svg`.
- El validador de Core (`pnpm --filter @fbd/fixtures core-real`) añade a `specs/008-datos-reales-core/sumario.md` una
  tabla por rareza: total de cartas, con identidad alternativa, con retrato propio y con retrato de terceros, más la
  lista de las que aún usan uno de terceros.

**Razón**: la función de dominio `identidadAlternativa(jugador)` es pura y se prueba sola, y el sumario ya es el
informe del catálogo.

**Alternativas**: una tabla aparte de identidades (más uniones para un dato 1:1).

## R14. Selectores y tienda en el cliente

**Decisión**:

- Un estado `apps/web/src/estado/aspecto.ts` carga `GET /api/perfil/aspecto` una vez por sesión, igual que
  `estado/saldo.ts`.
- `Chapa` recibe `escudo?: string | null`. Si hay escudo, pinta `<img>` con el tamaño actual y `alt` igual al nombre
  del equipo (FR-007), y si la imagen falla vuelve al círculo. `SobreArte` recibe `diseno?: string`.
- El selector de escudos es un componente `SelectorEscudo` que se usa en Perfil y en Alineación. El de sobres,
  `SelectorSobre`, solo se usa en Perfil.
- La tienda cambia así: quita el bloque de paquetes de fragmentos, muestra el precio en fragmentos de colecciones y
  sobres, y añade los bloques «Escudos» y «Sobres». Estos bloques se leen de `GET /api/cosmeticos`, que es público:
  los invitados ven el catálogo y, al comprar, se les pide crear cuenta (US3-3).

**Razón**: con dos componentes que ya concentran todos los usos (`Chapa` y `SobreArte`), el cambio visual se hace en
dos sitios.

## R15. Registro de la decisión (FR-001, SC-009)

**Decisión**:

- La constitución pasa a 1.4.0 (MINOR). Añade a «Decisiones resueltas» la entrada de la 011: derechos de imagen,
  dinero real solo para cosméticos y plan B de identidad, con enlace a la spec. En el Principio VII añade que, mientras
  no haya licencia de imagen, el dinero real no compra cartas, sobres, colecciones ni fragmentos.
- El ROADMAP actualiza INI-11 (retratos propios, identidad alternativa) e INI-14 (monetización cosmética), y anota el
  riesgo de economía de R11.
- Esto se hace antes de las tareas de venta (SC-009).
