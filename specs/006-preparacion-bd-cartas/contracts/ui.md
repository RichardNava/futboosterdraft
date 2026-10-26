# Contrato — Interfaz

Todas las pantallas siguen [docs/diseno/DESIGN.md](../../../docs/diseno/DESIGN.md) y los tokens de `apps/web`
(`lint:tokens`). Deben funcionar a 360 px de ancho (FR-042). Las animaciones tienen un botón «Saltar» y respetan
`prefers-reduced-motion`.

## Carta de jugador (`CartaJugador`; FR-044 a FR-048, FR-047b; research R6, R7)

- **Esquina superior izquierda**: debajo de la media y de la demarcación, la bandera y, a su derecha, el escudo, en un
  bloque de unos 16 px de alto en la carta completa. En la variante `compacta` y en el tamaño pequeño de «Colección»
  solo se ve la bandera (US6, escenario 5).
- **Imagen superior**: `imagen`. Si es un `.svg`, se pinta como máscara CSS con `currentColor`; si no, con `<img>` y
  la silueta genérica en `onError`.
- **Fondo**: `imagen_bg` con `opacity: 0.25`, detrás de todo el contenido y sin captar eventos.
- **Nombre**: `nombreCarta` en grande y en negrita; debajo, en pequeño, `nombre apellidos`. La variante `compacta`
  muestra solo `nombreCarta`, recortado con `NombreRecortado`.
- **Alternativas ante fallos de carga**: si la bandera no carga, se muestra el código del país (`ESP`) en texto
  pequeño; si no carga el escudo, se oculta.
- **Accesibilidad**: la `aria-label` de la carta añade el nombre de la selección. Las imágenes son decorativas
  (`alt=""`), salvo la bandera, cuyo `alt` es el nombre de la selección.
- `/_pruebas/cartas` muestra una carta de cada demarcación y una GOAT con imagen propia, para SC-009.

## Navegación (FR-025, FR-034)

- `BarraPrincipal` añade «Colección» (`/coleccion`) y «Tienda» (`/tienda`) solo si `usuario` existe y no es invitado.
- `Inicio` añade una tarjeta de acceso a «Colección» para los usuarios registrados.
- **Rutas**: `/coleccion` y `/tienda` se envuelven en `ConSesionRegistrada`. Sin sesión, redirige al inicio con el
  diálogo de iniciar sesión o registrarse abierto. Si el usuario es invitado, muestra la invitación a registrarse.

## Colección (`pantallas/Coleccion.tsx`; US1, US2, US3)

**Cabecera** (FR-041):

- cartas poseídas;
- cartas activas;
- el indicador del mínimo: «Cumple el mínimo» o «Faltan N cartas activas en DEF Épico»;
- el saldo de fragmentos, que abre el historial (FR-018) en un `Dialogo`;
- el botón «Tienda».

**Barra de herramientas** (FR-035 a FR-037):

- buscador, con un botón para borrarlo;
- ordenación: nombre, nacionalidad, colección, nivel, demarcación o media, con su sentido;
- filtros: estado, nivel, demarcación y colección;
- tamaño: pequeño, mediano o grande (control segmentado).

**Cuadrícula**:

- cartas en la variante del tamaño elegido;
- cada carta lleva un interruptor «Activa» (`role="switch"`), fuera del cuerpo de la carta (FR-040). Si desactivarla
  incumpliría el mínimo, el interruptor queda `aria-disabled` y un `title` explica por qué; si aun así se pulsa, se
  muestra un aviso con el mismo texto;
- las cartas inactivas se ven atenuadas y con la etiqueta «Inactiva».

**Paginador**: «Primera», «Anterior», «Página X de Y», «Siguiente» y «Última».

**Estado vacío**: «No hay cartas que coincidan», con el botón «Borrar búsqueda» (Edge Cases).

**Ficha** (`FichaCartaColeccion`, en un `Dialogo`; FR-039):

- la carta ampliada;
- la historia;
- las colecciones, como chips;
- el interruptor «Activa»;
- el botón «Desfragmentar (+N)». Si la carta es de Core, el botón no aparece y en su lugar se lee «Las cartas de Core
  no se pueden desfragmentar».

El diálogo se cierra con el botón, con Escape o al pulsar fuera.

**Confirmación de desfragmentar** (FR-022): «Recibirás N fragmentos. Esta acción no se puede deshacer», con los botones
«Cancelar» y «Desfragmentar».

## Tienda (`pantallas/Tienda.tsx`; US4, US5, US7)

**Cabecera**: el saldo de fragmentos y el enlace a «Colección».

**Sobre**:

- arte de `SobreArte`;
- los dos precios: 1.000 fragmentos y el importe en euros;
- dos botones de compra. Si no hay saldo suficiente, el de fragmentos se deshabilita con el texto «Te faltan N»;
- si quedan menos de 8 cartas por conseguir, todo el producto aparece como no disponible, con el motivo.

**Colecciones**: una tarjeta por colección con:

- nombre, descripción y precio;
- número de cartas y reparto por nivel;
- una muestra de 3 cartas;
- «Tienes X de N»;
- si ya está comprada, la tarjeta queda bloqueada, con el sello «Adquirida» y sin botón (FR-027);
- si ya se tienen todas sus cartas, el aviso «Solo recibirías N fragmentos».

**Paquetes de fragmentos**: una tarjeta por paquete, con la cantidad y el precio.

**Pago simulado** (`DialogoPagoPrueba`; FR-031): resumen del producto, precio y cinta visible «PAGO DE PRUEBA — no se
cobra nada». Tiene los botones «Confirmar compra» y «Cancelar», sin campos de tarjeta. El `idCompra` se genera al abrir
el diálogo. Mientras la petición está en curso, el botón se deshabilita; si la conexión falla, «Reintentar» reenvía el
mismo `idCompra`.

**Tras comprar un sobre** (FR-030): `AperturaSobre` del draft. Después, la cuadrícula de 8 cartas con el conmutador
«Revelar una a una / Todas». Termina con los botones «Ver en mi colección» y «Seguir comprando».

**Tras comprar una colección** (FR-028a): una animación de confirmación de unos 1,2 s; después, el resumen con las
cartas recibidas y la lista de duplicados con sus fragmentos y el total.

## Pantalla de campeón (`PantallaCampeon`; FR-019, SC-008)

- Usuario registrado: añade la línea «+10 fragmentos», con un enlace a «Colección».
- Invitado: «Regístrate para ganar fragmentos con tus victorias».
