# Feature Specification: Preparación de la base de datos de las cartas, colecciones, fragmentos y tienda

**Feature Branch**: `006-preparacion-bd-cartas`

**Created**: 2026-10-25

**Status**: Draft

**Input**: User description: "Spec 6 — Preparación de la base de datos de las cartas. Fase previa a la creación de la base de datos de las cartas: estructurar las cartas en colecciones y plantear el esqueleto de la monetización. 0) Colecciones: colección básica Core de 300 jugadores para los registrados; packs de colecciones de 40 a 50 cartas nuevas; sobres de 8 cartas con el reparto de frecuencias del draft y solo cartas que el usuario no tiene; una carta puede pertenecer a varias colecciones (p. ej. Maradona en All Stars y Top Argentinos); analizar cómo almacenarlo teniendo en cuenta las futuras versiones premium. 1) Fragmentos: moneda del juego para comprar sobres (y en el futuro cosméticos); se obtienen comprándolos con dinero real, como recompensa al ganar un torneo (10 en el MVP, incluso contra la IA), desfragmentando cartas (Común 25, Épica 50, Legendaria 75, GOAT 100; las de Core no) y por duplicados al comprar colecciones. 2) JSON de las cartas: `nacionalidad` (bandera y escudo de la selección bajo la media y la demarcación), `coleccion` (según la decisión de almacenamiento) e `imagen_bg` (imagen de fondo al 20-30 % de opacidad con una acción según la demarcación; GOAT, y quizá Legendarias, con imagen propia); generar las imágenes genéricas; revisar el JSON actual en la clarificación. 3) Sección «Colección» solo para usuarios con sesión: cuadrícula de tamaño editable con paginador, buscador y ordenación; modal con la carta ampliada y su historia; selector de carta activa (los torneos usan la colección activa del anfitrión, mínimo de cartas activas por rareza, las colecciones compradas entran activas); acceso a la tienda. 4) Tienda con colecciones y sobres; en el MVP solo la experiencia de usuario, sin pasarela de pago ni facturas."

## Contexto

Hoy existe un único catálogo de 300 cartas, la colección **Core**, que comparten todos los participantes. Cada carta
guarda el nombre de una sola colección y todas las partidas sacan sus sobres de ese catálogo (spec 001, FR-014 y
FR-015). La constitución deja pendiente la definición de las colecciones adicionales y de su obtención con
recursos del juego o con dinero real (Principio VII y "Decisiones aún pendientes").

Esta especificación prepara el catálogo para la base de datos definitiva y define el esqueleto de la monetización:

1. Organiza las cartas en **colecciones**: una carta puede pertenecer a varias, y la estructura admite que en el
   futuro una carta tenga una **versión premium** con arte y efectos distintos.
2. Da a cada usuario registrado una **colección propia**: Core más lo que compre o abra en sobres.
3. Introduce los **fragmentos**, la moneda del juego, y sus cuatro vías de obtención.
4. Amplía los datos de cada carta con la información visual que falta: bandera y escudo de su país, e imagen de
   fondo.
5. Añade dos secciones nuevas: **Colección**, para consultar y activar las cartas propias, y **Tienda**, para
   comprar colecciones, sobres y fragmentos. En el MVP las compras con dinero real son simuladas.

Correspondencia de términos: lo que la descripción llama rareza **«Común»** es el nivel **Superclase** del juego;
Épica, Legendaria y GOAT son los niveles Épico, Legendario y GOAT.

## Clarifications

### Session 2026-10-25

- Q: ¿El mínimo de la colección activa se exige por combinación de demarcación y nivel o solo por nivel? → A: Por
  combinación de demarcación y nivel, igual a la distribución de Core (suma 300) (FR-012).
- Q: ¿Qué precio tiene el sobre en fragmentos? → A: 1.000 fragmentos, muy por encima de los 355 que se obtienen de
  media al desfragmentar un sobre, así que no hay bucle de fragmentos (FR-024).
- Q: ¿Escudo oficial de cada federación o emblema propio? → A: De momento, escudos oficiales. Antes de la versión
  definitiva de producción se investigarán sus implicaciones legales y, si las hay, se sustituirán o se suprimirán
  (FR-044).
- Q: ¿La rareza «Común» es el nivel Superclase? → A: Sí, confirmado.
- Nota del usuario: al abrir un sobre de la tienda se muestra una animación similar a la de apertura de sobres del
  draft (FR-030).
- Nota del usuario: al comprar una colección se muestra una animación de confirmación de la compra, y en la tienda
  el producto queda bloqueado, porque cada colección solo se puede comprar una vez (FR-027, FR-028a).
- Q: ¿Qué cambios se hacen en el JSON de las cartas? → A: Se elimina `coleccion` de la carta (las colecciones van
  en un fichero propio que lista los `id` de sus cartas); `nacionalidad` identifica la selección (`GBR` pasa a
  `ENG`, `SCO`, `WAL` o `NIR`); `imagen_bg` es obligatorio en todas las cartas, con la ruta genérica de su
  demarcación escrita de forma explícita cuando no tienen imagen propia; y se añade el campo obligatorio `imagen`,
  la imagen del jugador de la parte superior de la carta, que hoy es una silueta genérica por demarcación que no
  figura en el JSON (FR-043, FR-045, FR-047, FR-047a, FR-049).
- Q: ¿Cómo indica la carta qué parte del nombre del jugador se muestra destacada? → A: Con un campo obligatorio
  `nombre_carta` que contiene el texto exacto que se destaca («Raúl», «Maradona», «Julio Salinas», «Pelé»); debajo,
  en pequeño, va el nombre completo, y las vistas compactas muestran solo `nombre_carta` (FR-047b, FR-049).
- Q: ¿Las cartas de las colecciones de prueba son jugadores ficticios o reales? → A: Ficticios, generados de forma
  automática con las mismas reglas que Core (la opción más barata, porque solo sirven para pruebas); los jugadores
  reales quedan para la carga definitiva de la base de datos (FR-006).
- Q: ¿Qué tipo de imágenes genéricas de fondo se crean? → A: Ahora, siluetas vectoriales planas de un color con el
  estilo de la silueta actual de la carta; en el futuro podrán sustituirse por ilustraciones detalladas sin cambiar
  el formato de la carta (FR-046).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar mi colección (Priority: P1)

Un usuario registrado abre la sección «Colección» desde la barra de navegación o desde la página de inicio y ve
todas sus cartas en una cuadrícula. Puede cambiar el tamaño de las cartas (y con ello cuántas caben en cada
página), pasar páginas, buscar por nombre y ordenar por nombre, nacionalidad, colección, nivel, demarcación o
media. Al pulsar una carta, la ve ampliada en una ventana con toda su información: estadísticas, virtudes,
defectos, colecciones a las que pertenece e historia del jugador.

**Why this priority**: es la puerta de entrada a todo lo demás (activar, desfragmentar, ir a la tienda) y hace
visible el nuevo concepto de colección propia. Con solo esta historia, un usuario ya puede explorar sus 300
cartas Core.

**Independent Test**: con una cuenta recién registrada, abrir «Colección», comprobar que aparecen las 300 cartas
Core, cambiar el tamaño, buscar un jugador por su apellido, ordenar por nacionalidad y abrir la ficha ampliada de
una carta.

**Acceptance Scenarios**:

1. **Given** un usuario registrado con sesión iniciada, **When** mira la barra de navegación y la página de
   inicio, **Then** ve el acceso a «Colección» en ambos sitios.
2. **Given** un invitado o un visitante sin sesión, **When** mira la barra de navegación y la página de inicio,
   **Then** no ve el acceso a «Colección» y, si abre su dirección directamente, se le pide iniciar sesión o
   registrarse.
3. **Given** un usuario en «Colección», **When** reduce el tamaño de las cartas, **Then** caben más cartas por
   página, el número de páginas se recalcula y el usuario sigue viendo la carta en la que estaba o la página que
   la contiene.
4. **Given** un usuario en «Colección», **When** escribe parte del nombre o los apellidos de un jugador en el
   buscador, **Then** la cuadrícula muestra solo las cartas que coinciden, sin distinguir mayúsculas ni tildes, y
   el paginador se ajusta a los resultados.
5. **Given** un usuario en «Colección», **When** elige una ordenación (alfabética, nacionalidad, colección, nivel,
   demarcación o media) y su sentido, **Then** la cuadrícula se reordena entera, no solo la página visible.
6. **Given** un usuario en «Colección», **When** pulsa una carta, **Then** se abre una ventana con la carta
   ampliada, su historia, sus colecciones y sus datos completos, que se cierra con un botón, con la tecla Escape
   o pulsando fuera.
7. **Given** un usuario que vuelve a «Colección» tras haberla usado, **When** entra, **Then** encuentra el tamaño
   de carta y la ordenación que eligió la última vez.

---

### User Story 2 - Elegir qué cartas uso al jugar (Priority: P1)

Cada carta de la colección tiene un selector «Activa». Las cartas activas forman la **colección activa** del
usuario, que es la que se usa para generar los sobres del draft en los torneos que crea como anfitrión. El juego
impide desactivar cartas si la colección activa quedara por debajo del mínimo necesario para que los sobres se
puedan generar sin repetir cartas.

**Why this priority**: es lo que conecta la colección con el juego; sin ello, comprar cartas no tiene efecto en
las partidas.

**Independent Test**: con un usuario que tiene más cartas que el mínimo, desactivar algunas, crear un torneo como
anfitrión y comprobar que ninguna carta desactivada aparece en los sobres; después, intentar desactivar una carta
que dejaría la colección por debajo del mínimo y comprobar que se impide con una explicación.

**Acceptance Scenarios**:

1. **Given** un usuario con su colección activa, **When** crea un torneo como anfitrión, **Then** los sobres de
   todos los participantes se generan solo con cartas de la colección activa del anfitrión.
2. **Given** un participante que se une al torneo de otro, **When** se generan los sobres, **Then** se usa la
   colección activa del anfitrión, no la del participante.
3. **Given** un usuario cuya colección activa está justo en el mínimo de una combinación de demarcación y nivel,
   **When** intenta desactivar una carta de esa combinación, **Then** el cambio no se aplica y se le explica qué
   mínimo se incumpliría y cuántas cartas de esa combinación tiene activas.
4. **Given** un usuario que compra una colección, **When** las cartas nuevas llegan a su colección, **Then** todas
   entran activas.
5. **Given** un usuario en «Colección», **When** mira la cabecera de la sección, **Then** ve cuántas cartas
   tiene activas y si su colección activa cumple el mínimo.
6. **Given** un torneo ya creado, **When** el anfitrión cambia después su colección activa, **Then** el torneo en
   curso no se ve afectado: sigue usando las cartas que había al crearlo.
7. **Given** un invitado, **When** crea una partida, **Then** se usa la colección Core completa, como hasta ahora.

---

### User Story 3 - Ganar y gastar fragmentos (Priority: P1)

El usuario ve su saldo de fragmentos en la cabecera de «Colección» y de «Tienda». Gana 10 fragmentos cada vez que
gana un torneo, puede desfragmentar cartas que no sean de Core para obtener fragmentos según su nivel y puede
gastarlos en sobres en la tienda.

**Why this priority**: es el bucle de progresión jugando, sin dinero real; demuestra que la economía funciona y
respeta el Principio VII (se puede ampliar la colección jugando).

**Independent Test**: ganar un torneo contra la IA y comprobar que el saldo sube 10; desfragmentar una carta Épica
de una colección comprada y comprobar que el saldo sube 50 y la carta desaparece de la colección; intentar
desfragmentar una carta Core y comprobar que no se permite.

**Acceptance Scenarios**:

1. **Given** un usuario registrado que gana un torneo (incluso contra rivales de la IA), **When** el torneo
   termina, **Then** recibe 10 fragmentos, se le muestra en la pantalla de campeón y su saldo lo refleja.
2. **Given** un usuario con una carta que no pertenece a Core, **When** la desfragmenta y confirma, **Then** la
   carta desaparece de su colección y recibe 25, 50, 75 o 100 fragmentos según sea Superclase, Épico, Legendario o
   GOAT.
3. **Given** una carta que pertenece a Core (aunque también pertenezca a otras colecciones), **When** el usuario
   abre su ficha, **Then** la opción de desfragmentar no está disponible y se explica por qué.
4. **Given** un usuario que pulsa «Desfragmentar», **When** se le pide confirmación, **Then** se le indica que la
   acción no se puede deshacer y cuántos fragmentos recibirá; si cancela, no cambia nada.
5. **Given** una carta activa cuya desfragmentación dejaría la colección activa por debajo del mínimo, **When**
   el usuario intenta desfragmentarla, **Then** se impide con la misma explicación que al desactivarla.
6. **Given** un usuario que consulta su saldo, **When** abre el historial de fragmentos, **Then** ve cada
   movimiento con su fecha, su motivo (recompensa, desfragmentación, duplicado, compra o gasto) y su importe.

---

### User Story 4 - Comprar un sobre en la tienda (Priority: P2)

Desde la tienda (o desde el acceso directo de «Colección»), el usuario compra un sobre de 8 cartas con fragmentos o
con dinero real (simulado). El sobre se abre con una presentación de las cartas y solo contiene cartas que el
usuario todavía no tiene, con el mismo reparto de demarcaciones y niveles que los sobres del draft.

**Why this priority**: es el producto principal de la economía, tanto con fragmentos como con dinero; depende de
que existan colecciones con cartas que el usuario no tenga.

**Independent Test**: con saldo suficiente, comprar un sobre con fragmentos, comprobar que el saldo baja el
precio, que llegan 8 cartas nuevas (ninguna repetida ni ya poseída) con el reparto de demarcación y nivel del
draft, y que las cartas aparecen en «Colección».

**Acceptance Scenarios**:

1. **Given** un usuario con al menos 1.000 fragmentos, **When** compra un sobre con fragmentos, **Then** se
   descuentan 1.000, ve una animación de apertura similar a la del draft y recibe 8 cartas distintas que no tenía,
   reveladas una a una o todas a la vez, a su elección.
2. **Given** un usuario sin saldo suficiente, **When** intenta comprar un sobre con fragmentos, **Then** la compra
   no se realiza y se le indica cuántos fragmentos le faltan.
3. **Given** un usuario que compra un sobre con dinero real, **When** confirma la compra simulada, **Then** recibe
   el sobre igual que si lo hubiera pagado con fragmentos, y la interfaz deja claro que es un pago de prueba.
4. **Given** un sobre abierto, **When** el usuario revisa sus cartas, **Then** el sobre respeta los cupos de
   demarcación y nivel de los sobres del draft (spec 001, FR-014).
5. **Given** un usuario al que le quedan menos de 8 cartas por conseguir en el conjunto de colecciones a la venta,
   **When** abre la tienda, **Then** el sobre aparece como no disponible, con una explicación.
6. **Given** un usuario que pulsa «Comprar» dos veces seguidas o cuya conexión falla a mitad de la compra,
   **When** el sistema procesa las peticiones, **Then** se cobra y se entrega un único sobre.
7. **Given** las cartas recibidas en un sobre, **When** llegan a la colección, **Then** entran activas.

---

### User Story 5 - Comprar una colección en la tienda (Priority: P2)

La tienda muestra las colecciones a la venta (por ejemplo, *All Stars* o *Top Argentinos*), cada una con su nombre,
su número de cartas, una muestra de sus cartas destacadas y cuántas de ellas ya tiene el usuario. Al comprarla con
dinero real (simulado), el usuario recibe todas las cartas que no tenía y, por cada carta que ya tenía, los
fragmentos que le corresponden por su nivel.

**Why this priority**: es el segundo producto de la monetización; requiere que haya colecciones de prueba además
de Core.

**Independent Test**: con un usuario que ya tiene alguna carta de *Top Argentinos* (obtenida en un sobre o por
pertenecer también a *All Stars*), comprar *Top Argentinos* y comprobar que recibe las cartas que le faltaban,
todas activas, y los fragmentos por las que ya tenía.

**Acceptance Scenarios**:

1. **Given** un usuario en la tienda, **When** consulta una colección, **Then** ve su nombre, su descripción, su
   precio, su número total de cartas, su reparto por nivel, una muestra de sus cartas y cuántas ya tiene.
2. **Given** un usuario que compra una colección de la que ya tiene 3 cartas (una Superclase, una Épica y una
   GOAT), **When** confirma la compra, **Then** ve una animación que confirma la compra, recibe el resto de cartas
   y 25 + 50 + 100 = 175 fragmentos, y un resumen le detalla qué ha recibido.
3. **Given** un usuario que ya ha comprado una colección, **When** vuelve a la tienda, **Then** esa colección
   aparece bloqueada como adquirida y no se puede volver a comprar.
4. **Given** un usuario que ya tiene todas las cartas de una colección (por sobres y otras colecciones), **When**
   la consulta en la tienda, **Then** se le advierte de que la compra solo le daría fragmentos y cuántos.

---

### User Story 6 - Cartas con bandera, escudo e imagen de fondo (Priority: P2)

Todas las cartas muestran, en la esquina superior izquierda y debajo de la media y la demarcación, la bandera del
país del jugador y el escudo de su selección. El fondo de la carta muestra, con una opacidad de entre el 20 % y el
30 %, la silueta de un futbolista en una acción propia de su demarcación: disparo para los delanteros, pase para
los centrocampistas, entrada o despeje para los defensas y parada para los porteros. Las cartas GOAT sustituyen
esa imagen genérica por una imagen propia del jugador.

**Why this priority**: mejora la identidad de las cartas en todo el juego, pero no bloquea la colección ni la
economía.

**Independent Test**: abrir la vista de pruebas de cartas y la colección y comprobar, para una carta de cada
demarcación, la bandera, el escudo y la imagen de fondo correcta; y, para una carta GOAT, su imagen propia (o la
genérica de su demarcación si aún no tiene).

**Acceptance Scenarios**:

1. **Given** cualquier carta en cualquier pantalla (draft, plantilla, alineación, colección, tienda), **When** se
   muestra en tamaño normal o ampliado, **Then** se ven la bandera y el escudo de su país debajo de la media y la
   demarcación, sin tapar ningún otro dato.
2. **Given** una carta de cada demarcación, **When** se muestra, **Then** su fondo es la imagen de la acción que le
   corresponde, con una opacidad de entre el 20 % y el 30 %, y los textos siguen siendo legibles.
3. **Given** una carta GOAT con imagen propia, **When** se muestra, **Then** su fondo es esa imagen en lugar de la
   genérica.
4. **Given** una carta cuya imagen propia o cuya bandera no se pueden cargar, **When** se muestra, **Then** se usa
   la imagen genérica de su demarcación o el código del país, sin huecos ni iconos rotos.
5. **Given** una carta en tamaño reducido (por ejemplo, la cuadrícula de «Colección» al tamaño mínimo), **When** se
   muestra, **Then** la bandera sigue siendo reconocible y, si el escudo no cabe con claridad, se oculta.

---

### User Story 7 - Comprar fragmentos con dinero real (Priority: P3)

La tienda ofrece paquetes de fragmentos que se compran con dinero real (simulado en el MVP).

**Why this priority**: completa las cuatro vías de obtención de fragmentos, pero es la menos necesaria para probar
la experiencia, porque los fragmentos ya se obtienen jugando y desfragmentando.

**Independent Test**: comprar un paquete de fragmentos con el pago simulado y comprobar que el saldo sube la
cantidad del paquete y que el movimiento aparece en el historial como compra.

**Acceptance Scenarios**:

1. **Given** un usuario en la tienda, **When** compra un paquete de fragmentos con el pago simulado, **Then** su
   saldo aumenta la cantidad del paquete y el historial registra la compra.
2. **Given** cualquier compra con dinero real en el MVP, **When** el usuario llega al paso de pago, **Then** la
   interfaz indica de forma visible que es un pago de prueba y que no se cobra nada.

---

### Edge Cases

- **Sobre sin cartas suficientes de una combinación**: si al usuario no le quedan cartas por conseguir de la
  demarcación y el nivel que pide una casilla del sobre, la casilla se rellena con otra carta que no tenga,
  primero del mismo nivel y otra demarcación y, si tampoco la hay, del nivel inmediatamente inferior (o superior
  si no hay inferior). Si en total le quedan menos de 8 cartas por conseguir, el sobre no se puede comprar.
- **Carta en varias colecciones compradas**: si el usuario compra *All Stars* y después *Top Argentinos*, y
  Maradona está en ambas, recibe a Maradona con la primera y los fragmentos de su nivel con la segunda. Nunca
  tiene dos copias de la misma carta.
- **Carta desfragmentada que vuelve**: una carta desfragmentada deja de estar en la colección; puede volver a
  aparecer en un sobre o llegar al comprar una colección que la contenga (si la colección ya estaba comprada, no
  se recupera de nuevo gratis).
- **Recompensa en torneos sin humanos rivales**: en el MVP se otorga igual (10 fragmentos). Un invitado que gana un
  torneo no recibe fragmentos, porque no tiene cuenta; la pantalla de campeón le invita a registrarse.
- **Invitado que se registra**: al registrarse recibe la colección Core y un saldo de 0 fragmentos; no recupera
  recompensas de torneos que ganó como invitado.
- **Torneo con varios ganadores posibles**: la recompensa se da solo al campeón final del torneo, una vez por
  torneo, aunque el resultado se consulte o se recargue varias veces.
- **Torneo abandonado o cancelado**: no hay recompensa para nadie.
- **Cambios de la colección activa durante un torneo**: los torneos en curso no se alteran (User Story 2,
  escenario 6). Desfragmentar una carta que está en uso en un torneo en curso tampoco lo altera: la carta sigue
  en las plantillas de ese torneo hasta que termine.
- **Búsqueda sin resultados**: la cuadrícula muestra un estado vacío con la opción de borrar la búsqueda.
- **Nacionalidad sin bandera o escudo disponible**: se muestra el código del país en lugar de la imagen.
- **Saldo y compras simultáneas**: dos compras con fragmentos lanzadas a la vez desde dos pestañas no pueden dejar
  el saldo en negativo; la segunda falla si ya no hay saldo.
- **Catálogo cambiado tras la compra**: si una colección a la venta recibe cartas nuevas después de que un usuario
  la haya comprado, quien la compró recibe esas cartas nuevas, activas (o sus fragmentos si ya las tenía).

## Requirements *(mandatory)*

### Functional Requirements

#### Catálogo y colecciones

- **FR-001**: El catálogo DEBE organizarse en **colecciones**. Cada colección tiene un identificador, un nombre que
  se muestra, una descripción, un tipo (básica o de pago), el conjunto de cartas que la forman y, si es de pago, un
  precio.
- **FR-002**: Una misma carta DEBE poder pertenecer a varias colecciones sin duplicar sus datos: los atributos de
  la carta (nombre, estadísticas, nivel, rasgos, historia, etc.) existen una sola vez y las colecciones hacen
  referencia a ella.
- **FR-003**: El modelo DEBE admitir, sin rediseñarse, que una carta tenga en el futuro una o varias **versiones**
  (por ejemplo, la normal y una premium con arte y efectos distintos) que comparten los atributos de juego y
  difieren solo en su presentación. Una versión premium PUEDE incluirse en una colección o aparecer al azar en un
  sobre; una colección DEBE poder indicar qué versión de cada carta incluye. En esta especificación solo existe la
  versión normal.
- **FR-004**: Las versiones de una carta NO DEBEN tener efectos distintos en el juego: el motor, el draft y los
  cupos de los sobres las tratan como la misma carta (Principio VII). Poseer la versión premium no permite tener
  además la normal como carta distinta en la colección activa.
- **FR-005**: La colección **Core** DEBE seguir conteniendo las 300 cartas actuales con la distribución por
  demarcación y nivel vigente (spec 001, Assumptions, "Tamaño de la colección Core").
- **FR-006**: El conjunto de pruebas DEBE incluir al menos dos colecciones de pago, *All Stars* y *Top Argentinos*,
  cada una con entre 40 y 50 cartas, que compartan al menos 5 cartas entre sí y al menos 3 cartas con Core, para
  poder probar la pertenencia múltiple y los duplicados. Las cartas nuevas de prueba son jugadores ficticios
  generados de forma automática y reproducible, y siguen las reglas de validación del catálogo (stats, media,
  nivel, virtudes y defectos).
- **FR-007**: El análisis de las alternativas para almacenar la pertenencia de cartas a colecciones y las versiones
  DEBE quedar documentado (ventajas, desventajas y decisión) en la fase de planificación; esta especificación fija
  el modelo conceptual (ver "Key Entities") y los requisitos que debe cumplir.
- **FR-008**: La constitución DEBE actualizarse para registrar en "Decisiones resueltas" que esta especificación
  concreta las colecciones adicionales a Core y su obtención (Principio VII).

#### Colección propia y colección activa

- **FR-009**: Cada usuario registrado DEBE tener una **colección propia**: el conjunto de cartas que posee. Al
  registrarse, su colección propia contiene todas las cartas de Core.
- **FR-010**: Un usuario NO DEBE poseer dos veces la misma carta (en la misma versión).
- **FR-011**: Cada carta de la colección propia DEBE tener un estado **activa** o **inactiva**. Las cartas activas
  forman la **colección activa**. Las cartas que llegan por cualquier vía (registro, colección, sobre) entran
  activas.
- **FR-012**: La colección activa DEBE cumplir en todo momento un **mínimo por combinación de demarcación y
  nivel** igual a la distribución de Core (spec 001; por ejemplo, 14 porteros Superclase, 12 defensas GOAT), que
  suma 300 cartas. Así los sobres de una mesa de 8 siempre se pueden generar sin repetir cartas.
- **FR-013**: El sistema DEBE impedir cualquier operación (desactivar o desfragmentar) que deje la colección activa
  por debajo del mínimo, y DEBE explicar qué combinación lo incumpliría.
- **FR-014**: Al crear un torneo, sus sobres DEBEN generarse solo con la colección activa del anfitrión tal y como
  esté en ese momento; los cambios posteriores de la colección del anfitrión NO DEBEN afectar a ese torneo.
- **FR-015**: Las partidas creadas por un invitado DEBEN usar la colección Core completa.
- **FR-016**: Los sobres del draft DEBEN mantener las reglas comunes (spec 001, FR-011 y FR-014) con independencia
  de la colección activa del anfitrión: mismo número de cartas, mismos cupos de demarcación y nivel, ninguna carta
  repetida en la mesa. Una colección activa más amplia solo aumenta la variedad de cartas posibles (Principio VII).

#### Fragmentos

- **FR-017**: Cada usuario registrado DEBE tener un **saldo de fragmentos**, que empieza en 0 y nunca puede ser
  negativo.
- **FR-018**: Todo cambio de saldo DEBE registrarse como un **movimiento** con fecha, importe, motivo
  (recompensa de torneo, desfragmentación, carta duplicada, compra de fragmentos, compra de sobre) y referencia a
  lo que lo originó (torneo, carta, colección, compra). El usuario DEBE poder consultar su historial.
- **FR-019**: El campeón de un torneo, si es un usuario registrado, DEBE recibir 10 fragmentos al terminar el
  torneo, una sola vez por torneo, aunque todos sus rivales sean de la IA. La cantidad DEBE ser un parámetro
  configurable, pensado para depender en el futuro del tipo de torneo, de la dificultad y de si hay rivales
  humanos.
- **FR-020**: El usuario DEBE poder **desfragmentar** cualquier carta de su colección propia que no pertenezca a
  Core: la carta sale de su colección y recibe 25 (Superclase), 50 (Épico), 75 (Legendario) o 100 (GOAT)
  fragmentos. Estos valores DEBEN ser parámetros configurables.
- **FR-021**: Las cartas que pertenecen a Core NO DEBEN poder desfragmentarse, aunque pertenezcan también a otras
  colecciones.
- **FR-022**: La desfragmentación DEBE pedir confirmación, indicando los fragmentos que se recibirán y que la
  acción no se puede deshacer.
- **FR-023**: Al comprar una colección, por cada carta de la colección que el usuario ya posea DEBE recibir los
  fragmentos de su nivel con los mismos valores de FR-020, y el resumen de la compra DEBE detallarlos.
- **FR-024**: Un sobre DEBE costar **1.000 fragmentos**, como parámetro configurable. El precio DEBE seguir por
  encima del valor esperado de desfragmentar un sobre (hoy 355 fragmentos: 4 × 25 + 2 × 50 + 75 + 80 de la casilla
  alta), para que comprar sobres y desfragmentarlos no genere fragmentos sin límite; la validación de los
  parámetros DEBE rechazar un precio que no lo cumpla.

#### Tienda

- **FR-025**: Los usuarios registrados DEBEN tener acceso a una sección **«Tienda»**, accesible al menos desde
  «Colección» y desde la barra de navegación, que ofrece colecciones, sobres y paquetes de fragmentos. Los
  invitados y visitantes no tienen acceso.
- **FR-026**: La tienda DEBE mostrar el saldo de fragmentos del usuario y, para cada producto, su precio en las
  monedas en que se puede pagar: las colecciones y los paquetes de fragmentos, en dinero real; los sobres, en
  dinero real o en fragmentos.
- **FR-027**: Cada colección DEBE mostrar nombre, descripción, precio, número de cartas, reparto por nivel, una
  muestra de cartas y cuántas de sus cartas posee ya el usuario. Cada colección solo se puede comprar una vez: una
  colección ya comprada DEBE aparecer bloqueada, marcada como adquirida y sin opción de compra.
- **FR-028**: Comprar una colección DEBE añadir a la colección propia todas sus cartas que el usuario no tenga,
  activas, y otorgar los fragmentos de FR-023 por las que ya tenga.
- **FR-028a**: Al completarse la compra de una colección DEBE mostrarse una animación que confirme la compra, seguida
  del resumen de cartas recibidas y fragmentos obtenidos. La animación DEBE poder saltarse y respetar la preferencia
  de movimiento reducido del sistema.
- **FR-029**: Un sobre de la tienda DEBE contener 8 cartas distintas, todas de colecciones a la venta (no de Core)
  y que el usuario no posea, con los mismos cupos de demarcación y nivel que los sobres del draft (spec 001,
  FR-014), aplicando la sustitución descrita en "Edge Cases" cuando una combinación esté agotada. Si quedan menos
  de 8 cartas por conseguir, el sobre NO DEBE poder comprarse.
- **FR-030**: Al abrir un sobre de la tienda DEBE mostrarse una animación de apertura similar a la de los sobres del
  draft; después, las cartas DEBEN presentarse con una revelación (una a una o todas a la vez, a elección del
  usuario) y quedar en la colección propia, activas. La animación DEBE poder saltarse y respetar la preferencia de
  movimiento reducido del sistema.
- **FR-031**: En el MVP, los pagos con dinero real DEBEN ser **simulados**: no hay pasarela de pago, ni datos de
  tarjeta, ni facturas, ni envíos. El paso de pago DEBE indicar de forma visible que es una prueba y que no se
  cobra nada, y la compra se completa al confirmar.
- **FR-032**: Toda compra, desfragmentación y recompensa DEBE validarse y resolverse en el servidor, de forma
  atómica (o se aplica entera o no se aplica) y sin efectos duplicados ante peticiones repetidas o fallos de
  conexión (Principio VI).
- **FR-033**: La tienda DEBE poder ampliarse en el futuro con otros tipos de producto (cosméticos y similares)
  pagables con fragmentos, sin rediseñar las compras ni los movimientos de saldo.

#### Sección «Colección»

- **FR-034**: Los usuarios registrados con sesión iniciada DEBEN ver un acceso a «Colección» en la barra de
  navegación y en la página de inicio; los invitados y visitantes no. El acceso directo a su dirección sin sesión
  registrada DEBE redirigir al inicio de sesión o registro.
- **FR-035**: «Colección» DEBE mostrar las cartas de la colección propia en una cuadrícula con al menos tres
  tamaños de carta seleccionables; el número de cartas por página DEBE adaptarse al tamaño elegido y al ancho de la
  pantalla.
- **FR-036**: La cuadrícula DEBE tener paginador (página anterior, siguiente, primera, última y número de página
  actual sobre el total), buscador por nombre y apellidos (sin distinguir mayúsculas ni tildes) y ordenación por
  nombre, nacionalidad, colección, nivel, demarcación y media, en sentido ascendente o descendente.
- **FR-037**: La cuadrícula DEBE permitir filtrar por estado (todas, activas, inactivas), por nivel, por
  demarcación y por colección.
- **FR-038**: El tamaño de carta, la ordenación y los filtros elegidos DEBEN recordarse para el usuario entre
  visitas.
- **FR-039**: Al pulsar una carta DEBE abrirse una ventana con la carta ampliada y, además, la historia del
  jugador, sus colecciones, sus estadísticas, virtudes y defectos, y las acciones disponibles: activar o
  desactivar y desfragmentar (solo si no es de Core).
- **FR-040**: Cada carta de la cuadrícula DEBE mostrar y permitir cambiar su estado activa o inactiva sin abrir la
  ventana de detalle, y las cartas inactivas DEBEN distinguirse visualmente de las activas.
- **FR-041**: La cabecera de «Colección» DEBE mostrar el número de cartas poseídas, el número de cartas activas,
  si la colección activa cumple el mínimo, el saldo de fragmentos y un acceso directo a la tienda.
- **FR-042**: «Colección» y «Tienda» DEBEN seguir la guía de estilos visuales del proyecto
  ([docs/diseno/DESIGN.md](../../docs/diseno/DESIGN.md)) y funcionar en anchos de móvil.

#### Datos y presentación de las cartas

- **FR-043**: Cada carta DEBE tener una **nacionalidad** que identifique la selección del jugador, de la que se
  derivan su bandera y su escudo. Como en el fútbol las selecciones de Inglaterra, Escocia, Gales e Irlanda del
  Norte son distintas, la nacionalidad DEBE identificar la selección, no solo el Estado: se usan códigos de tres
  letras y `GBR` se sustituye por `ENG`, `SCO`, `WAL` o `NIR`.
- **FR-044**: Todas las cartas DEBEN mostrar la bandera y el escudo de su selección en la esquina superior
  izquierda, debajo de la media y la demarcación, en todas las pantallas en que aparecen. Los escudos son, de
  momento, los oficiales de cada federación. Las imágenes de escudos DEBEN poder sustituirse o suprimirse de forma
  centralizada, sin tocar las cartas, porque antes de la versión definitiva de producción se revisarán sus
  implicaciones legales (ver Assumptions).
- **FR-045**: Cada carta DEBE tener una **imagen de fondo** que se muestra con una opacidad de entre el 20 % y el
  30 %, indicada en el campo obligatorio `imagen_bg`. Si la carta no tiene imagen propia, `imagen_bg` contiene de
  forma explícita la ruta de la imagen genérica de su demarcación: disparo (DEL), pase (MED), entrada o despeje
  (DEF) y parada (POR).
- **FR-046**: El proyecto DEBE incluir las cuatro imágenes genéricas de FR-045, creadas para el juego (sin derechos
  de terceros) como siluetas vectoriales planas de un color, con el estilo de la silueta actual de la carta y
  coherentes entre sí y con la guía de estilos, y asignadas a todas las cartas del conjunto de pruebas. Sustituirlas
  después por ilustraciones detalladas DEBE requerir solo cambiar los ficheros de imagen (o las rutas de
  `imagen_bg`), sin cambiar el formato de la carta.
- **FR-047**: Las cartas GOAT DEBEN poder tener una imagen de fondo propia del jugador; mientras no la tengan,
  `imagen_bg` apunta a la genérica de su demarcación. Cualquier carta de cualquier nivel (por ejemplo, Legendario)
  DEBE poder recibir después una imagen propia cambiando solo su `imagen_bg`.
- **FR-047a**: Cada carta DEBE tener un campo obligatorio `imagen` con la imagen del jugador que se muestra en la
  parte superior de la carta. Si la carta no tiene imagen propia, `imagen` contiene de forma explícita la ruta de la
  silueta genérica de su demarcación, la que se muestra hoy.
- **FR-047b**: Cada carta DEBE tener un campo obligatorio `nombre_carta` con el texto por el que se conoce al
  jugador, que se muestra destacado (en grande y en negrita): puede ser el nombre («Raúl»), un apellido
  («Maradona»), nombre y apellido («Julio Salinas») o un apodo («Pelé»). Debajo, en pequeño, la carta muestra el
  nombre completo (`nombre` y `apellidos`). Las vistas compactas, las listas, el buscador de «Colección» y la
  ordenación alfabética usan `nombre_carta`; el buscador encuentra también por `nombre` y `apellidos`.
- **FR-048**: Cuando una imagen (`imagen`, `imagen_bg`, bandera o escudo) no se pueda cargar, la carta DEBE mostrar
  una alternativa (la silueta o la imagen genérica de su demarcación, o el código del país) sin huecos ni iconos
  rotos.
- **FR-049**: El formato de datos de las cartas y su validación DEBEN actualizarse así: se elimina `coleccion` (la
  pertenencia a colecciones se guarda en un fichero de colecciones que lista los `id` de sus cartas, FR-002),
  `nacionalidad` identifica la selección (FR-043) y se añaden los campos obligatorios `imagen_bg` (FR-045),
  `imagen` (FR-047a) y `nombre_carta` (FR-047b). La validación DEBE rechazar una carta sin `imagen`, sin
  `imagen_bg` o con `nombre_carta` vacío, una nacionalidad
  desconocida y un `id` de colección que no exista en el catálogo.

### Key Entities *(include if feature involves data)*

- **Carta (jugador)**: los datos de juego de un jugador (identificador, nombre, apellidos, nombre de carta, nacionalidad, fecha de
  nacimiento, altura, demarcación, posiciones, estadísticas, media, virtudes, defectos, nivel, historia). Existe una
  sola vez en el catálogo, con independencia de cuántas colecciones la incluyan.
- **Versión de carta**: la presentación de una carta (normal o, en el futuro, premium): imagen del jugador, imagen
  de fondo, arte y efectos. En la versión normal, `imagen` e `imagen_bg` van en la propia carta. Comparte los datos de juego de su carta. En esta especificación cada carta tiene solo la versión normal.
- **Colección**: un conjunto con nombre de cartas (en una versión concreta), con descripción, tipo (básica o de
  pago) y precio. Core es la colección básica.
- **Pertenencia a colección**: la relación entre una colección y cada carta (y versión) que incluye. Una carta
  puede tener varias pertenencias; es la que permite que Maradona esté en *All Stars* y en *Top Argentinos* sin
  duplicarse.
- **Carta poseída**: una carta (en una versión) que pertenece a la colección propia de un usuario, con su estado
  activa o inactiva, su fecha y su vía de obtención (registro, colección, sobre).
- **Colección adquirida**: el registro de que un usuario ha comprado una colección, con su fecha.
- **Saldo de fragmentos** y **movimiento de fragmentos**: el saldo actual de un usuario y el historial de cambios
  que lo explica, con su motivo y su origen.
- **Producto de la tienda**: lo que se puede comprar (colección, sobre, paquete de fragmentos y, en el futuro,
  cosméticos), con sus precios en dinero real y en fragmentos, si los admite.
- **Compra**: una operación de compra de un usuario, con producto, moneda, importe, estado y resultado (cartas
  recibidas y fragmentos obtenidos), identificada de forma que una petición repetida no la duplique.

**Modelo conceptual elegido para colecciones y versiones**: las colecciones referencian cartas mediante una
relación de pertenencia de muchos a muchos, en lugar de guardar en cada carta una lista de nombres de colecciones o
de copiar la carta en cada colección. Así los datos de juego no se duplican, una carta se añade o quita de una
colección sin tocar la carta, se puede preguntar en ambos sentidos («qué cartas tiene esta colección» y «en qué
colecciones está esta carta») y la versión premium se incorpora como un dato más de la pertenencia y de la carta
poseída. El análisis completo de alternativas se documenta en el plan (FR-007).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario recién registrado ve sus 300 cartas Core en «Colección» y encuentra un jugador concreto
  con el buscador en menos de 15 segundos.
- **SC-002**: Cambiar el tamaño, la página, la búsqueda o la ordenación de la cuadrícula muestra el resultado en
  menos de 1 segundo con una colección de 500 cartas.
- **SC-003**: En 100 torneos creados por un anfitrión con cartas desactivadas, ninguna carta inactiva aparece en
  ningún sobre, y todos los sobres cumplen los cupos de demarcación y nivel del draft.
- **SC-004**: Ninguna secuencia de desactivaciones o desfragmentaciones consigue dejar la colección activa por
  debajo del mínimo: el sistema la impide siempre con una explicación.
- **SC-005**: En 1.000 sobres de la tienda abiertos por usuarios con colecciones distintas, ninguna carta está
  repetida dentro del sobre ni la poseía ya el usuario, y el reparto de niveles coincide con el del draft.
- **SC-006**: Comprar una colección entrega exactamente las cartas que faltaban más los fragmentos de las que ya se
  tenían, y la suma de movimientos del historial coincide siempre con el saldo mostrado.
- **SC-007**: En 50 compras repetidas por doble pulsación o por cortes de conexión simulados, cada compra se cobra
  y se entrega una sola vez, y el saldo nunca es negativo.
- **SC-008**: Un usuario que gana un torneo ve los 10 fragmentos en la pantalla de campeón y en su saldo; una
  carta Core nunca ofrece la opción de desfragmentar.
- **SC-009**: Una persona no técnica identifica, para una carta de cada demarcación, la acción de su imagen de
  fondo y el país de la bandera, y el 100 % de las cartas del conjunto de pruebas muestran bandera e imagen de
  fondo sin imágenes rotas.
- **SC-010**: Un usuario completa la compra simulada de un sobre con fragmentos, desde «Colección» hasta ver sus
  cartas reveladas, en menos de 1 minuto y sin dudar de que el pago es de prueba.

## Assumptions

- **«Común» = Superclase**: la rareza «Común» de la descripción corresponde al nivel Superclase del juego
  (confirmado por el usuario).
- **Escudos oficiales**: se usan provisionalmente. Antes de la versión definitiva de producción se investigarán sus
  implicaciones legales (marcas registradas de las federaciones) y, si las hay, se sustituirán por emblemas propios
  o se suprimirán. Hasta entonces es un riesgo abierto que bloquea el paso a producción.
- **Usuarios**: «Colección», «Tienda», los fragmentos y las compras son solo para usuarios registrados. Los
  invitados siguen jugando con Core completa y sin economía.
- **Recompensa**: «ganar un torneo» significa ser el campeón final. En el MVP la recompensa es de 10 fragmentos
  siempre, también contra la IA; la condición de "al menos un rival real" queda para una spec futura, con el
  ajuste por tipo de torneo y dificultad.
- **Cartas en los sobres de la tienda**: solo salen de colecciones de pago, porque Core la poseen todos los
  usuarios registrados y no puede desfragmentarse. El reparto entre colecciones es aleatorio y uniforme dentro de
  cada combinación de demarcación y nivel.
- **Precios**: los precios en dinero real de colecciones, sobres y paquetes de fragmentos, y las cantidades de los
  paquetes, son valores provisionales configurables, que se fijan en el plan.
- **Cartas de prueba**: las colecciones de prueba usan jugadores ficticios generados de forma automática, como
  Core; «Maradona» es solo el ejemplo de la descripción. Los jugadores reales llegarán con la carga definitiva de la
  base de datos, en una spec posterior. Las imágenes propias de las cartas GOAT de prueba pueden ser genéricas hasta que
  existan imágenes reales.
- **Datos actuales**: las cartas ya tienen un campo `nacionalidad` con códigos de país de tres letras (20 países en
  Core, incluido `GBR`) y un campo `coleccion` con un único nombre. Las 300 cartas Core se migran al formato nuevo
  (FR-049): sin `coleccion`, con las selecciones de `GBR` reasignadas, con `imagen` e `imagen_bg` apuntando a las
  imágenes genéricas de su demarcación y con `nombre_carta` igual a su nombre y primer apellido, que es lo que
  muestran hoy las vistas compactas.
- **Cartas en partidas en curso**: los torneos ya creados usan una copia de las cartas que había al crearlos, así
  que los cambios de la colección del anfitrión no los alteran.
- **Fuera de alcance**: pasarelas de pago, PayPal, facturación, impuestos, reembolsos, versiones premium reales,
  cosméticos, intercambio de cartas entre usuarios y la recompensa variable por tipo de torneo.
