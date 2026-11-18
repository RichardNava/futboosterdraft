# Feature Specification: Expansiones reales

**Feature Branch**: `016-expansiones-reales`

**Created**: 2026-11-18

**Status**: Draft

**Input**: User description: "Spec 016 — Expansiones reales. Crear las cuatro primeras expansiones de pago con jugadores
reales a partir del material de `./expansiones` (A = Remontada Histórica, B = Ídolos Dorados, C = Saque Ardiente,
D = Estrellas Fulgurantes): 24 jugadores cada una (6 por rareza), con su ficha completa, retrato manga sin fondo e
ilustración de fondo. En la tienda, cada expansión con nombre, precio en fragmentos, descripción, icono, «Comprar» y
«Ver detalle» (modal con el cartel grande, el botón de compra y la lista de jugadores). Precio 2400 fragmentos con
compensación por las cartas que ya se tengan (GOAT 175, Legendario 125, Crack 75, Superclase 25, lo mismo que dar por
desfragmentar). Cada expansión regala un sobre (A → sobre 7, B → sobre 1, C → sobre 4, D → sobre 28 nuevo), que deja de
venderse. Ocho sobres nuevos a la venta. Kimmich pasa de la D al Core y Verratti (299) pasa del Core a la D. Nuevo
icono del fragmento en toda la interfaz. El primer pase mensual regala una expansión al azar que no se tenga (o su
valor en fragmentos si se tienen todas). En el futuro habrá expansiones de 40 jugadores, con otro reparto y otro
precio."

## Clarifications

### Session 2026-11-18

- Q: El pase se puede pagar con euros y el Principio VII dice que el pase no entrega cartas, sobres, colecciones ni
  fragmentos. ¿Qué se hace con el regalo de una expansión con el primer pase? → A: Se descarta. La persona lo propuso
  para motivar la compra del pase y prefiere no implementarlo si choca con la constitución. Queda fuera del alcance de
  esta spec (ver «Fuera de alcance»).
- Q: ¿Qué pasa con las colecciones de prueba (All Stars, Top Argentinos) y sus 75 cartas (ids 301–375)? → A: Se
  eliminan del catálogo, de la tienda y de las cuentas que las tengan; las expansiones reutilizan los ids desde el 301.
- Q: ¿Qué se hace con los packs de sobres que contienen sobres de regalo (pack 2: sobres 1 y 4; pack 3: sobre 7)? →
  A: Los packs 2 y 3 se completan con 3 de los sobres nuevos y los otros 5 forman un pack nuevo (pack 7).
- Q: ¿Desfragmentar cualquier carta pasa a dar 25 / 75 / 125 / 175 o esos valores solo se usan para compensar al
  comprar una expansión? → A: Desfragmentar pasa a 25 / 75 / 125 / 175 y la compensación usa los mismos valores
  (FR-018).
- Q: ¿La retirada de las cartas y colecciones de prueba exige una migración con compensación o basta con borrarlas,
  ya que el juego no está en producción? → A: Borrado sin compensación: se elimina todo lo que apunte a cartas o
  colecciones de prueba (posesión, compras, plantillas y partidas terminadas que las citen) antes de cargar las
  expansiones (FR-010 a FR-012).
- Q: El esquema de la tarjeta de expansión no está en el repositorio, ¿se aporta como imagen o basta la descripción
  escrita? → A: La persona entregó el esquema como imagen (`esquema_shop.jpg`) solo como guía: no se guarda en el
  proyecto. Su contenido queda descrito con palabras en FR-017 y, con medidas, en
  [contracts/ui.md §2](contracts/ui.md).
- Q: ¿Los dos botones de la tarjeta («Comprar» y «Ver detalle») tienen el mismo tamaño? → A: Sí: los dos ocupan
  exactamente lo mismo, en ancho y en alto (FR-017).
- Q: Al salir del Core, ¿Verratti se trata como cualquier carta de expansión, también para desfragmentar? → A: Sí:
  deja de ser del Core y se comporta como el resto de cartas de Estrellas Fulgurantes; se puede desfragmentar
  (FR-007, FR-018).
- Q: ¿Qué media debe tener Kimmich al entrar en el Core? → A: Como GOAT, una media de 88 como mínimo (la de Verratti
  es 88), para que la sustitución apenas afecte al Core. Se pasa `pnpm balance` tras el cambio (FR-007).

## Contexto

- La tienda ya vende **colecciones de pago** con fragmentos (specs 006 y 011): al comprar una se reciben sus cartas y,
  por cada carta que ya se tenía, los fragmentos de desfragmentarla. Hoy solo hay dos colecciones **de prueba** (All
  Stars y Top Argentinos) hechas con las 75 cartas de `data/cartas-prueba.json` (ids 301–375). El sobre de cartas de la
  tienda saca sus cartas de las colecciones de pago.
- Esta spec trae las primeras colecciones de pago con jugadores reales, cambia su nombre visible a **expansiones** y
  retira las colecciones y cartas de prueba. El Core (300 cartas, `data/core-real.json`, spec 008) sigue llamándose Core.
- El material de partida está en `./expansiones/`: por expansión, la lista de jugadores (id 1–24, nombre y enlaces de
  consulta), la rareza (`rareza_X.txt`), las páginas de retratos con fondo verde croma, las ilustraciones de fondo y
  dos imágenes de cartel (icono de tienda y cartel grande); además, 9 diseños de sobre (`sobres/sobre_25` a
  `sobre_33`) y el icono del fragmento (`icono/fragmento.png`).
- Diferencias del material que la implementación debe absorber: la carpeta de ilustraciones se llama `imagen_bg` en A y
  D y `jugadores_bg` en B y C; en B los ficheros llevan el id con cero a la izquierda (`01_…`); en C los nombres de
  fichero son los nombres largos con tildes; las páginas de retratos reparten los 24 jugadores de forma distinta en cada
  expansión (A y D: 18 + 6; B: 12 + 12; C: 6 + 18). Algunos nombres de la lista tienen erratas (p. ej. «Romé o Lavia»,
  «Keilor Navas») que se corrigen al documentar al jugador.
- Desfragmentar da hoy 25 / 50 / 75 / 100 fragmentos (Superclase / Crack / Legendario / GOAT). La persona fija
  25 / 75 / 125 / 175 para la compensación de las expansiones y dice que son «los mismos que se tienen que dar por
  desfragmentar una carta».
- Las cartas y colecciones de prueba las usan hoy varias pruebas automáticas (servidor, web y dominio) y el esquema de
  datos de jugador; esas pruebas tendrán que apoyarse en las expansiones o en datos propios de prueba.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Las cartas de las expansiones existen y se juegan (Priority: P1)

Como responsable del catálogo quiero que los jugadores de las cuatro expansiones tengan una carta completa y válida,
con datos reales, retrato y fondo, para que se puedan vender, coleccionar y usar en el draft como cualquier otra carta.

**Why this priority**: sin cartas no hay expansiones que vender; todo lo demás depende de esto.

**Independent Test**: cargar el catálogo y comprobar que cada expansión tiene 24 cartas válidas (6 por rareza), cada
una con retrato sin fondo e ilustración de fondo, que ya no existe ninguna carta ni colección de prueba, y que una
partida con un usuario que posee cartas de expansión las usa sin errores.

**Acceptance Scenarios**:

1. **Given** el catálogo cargado, **When** se consultan las cartas de cada expansión, **Then** hay 24 por expansión, 6 de
   cada rareza (GOAT ids 1–6, Legendario 7–12, Crack 13–18, Superclase 19–24 de su lista de partida) y todas pasan las
   mismas reglas de validación que las cartas del Core.
2. **Given** una carta de expansión, **When** se muestra en la colección o en el draft, **Then** se ve su retrato manga
   sin restos del fondo verde y su ilustración de fondo, con el mismo aspecto y tamaño que una carta del Core.
3. **Given** cualquier carta del catálogo, **When** se consulta a qué expansión pertenece, **Then** el sistema lo sabe sin
   ambigüedad (una carta puede pertenecer a más de una expansión en el futuro).
4. **Given** el intercambio entre el Core y Estrellas Fulgurantes, **When** se carga el catálogo, **Then** Joshua Kimmich
   está en el Core (que sigue teniendo 300 cartas) y no en Estrellas Fulgurantes, y Marco Verratti (id 299) está en
   Estrellas Fulgurantes y no en el Core; la expansión sigue teniendo 24 cartas, 6 por rareza.
5. **Given** la base de datos tras la actualización, **When** se busca cualquier carta o colección de prueba, **Then** no
   existe ninguna, y ninguna cuenta conserva cartas, colecciones, plantillas ni compras que apunten a ellas.

---

### User Story 2 - Ver y comprar una expansión en la tienda (Priority: P1)

Como jugador registrado quiero ver las expansiones en la tienda, consultar su detalle y comprarlas con fragmentos, y
recibir compensación por las cartas que ya tenía, para ampliar mi colección sin pagar dos veces la misma carta.

**Why this priority**: es el valor de negocio de la spec: el primer producto de cartas reales que se compra.

**Independent Test**: con un usuario con 2400 fragmentos y algunas cartas de una expansión conseguidas en sobres,
comprarla y comprobar el saldo final, las cartas recibidas, la compensación y el sobre de regalo.

**Acceptance Scenarios**:

1. **Given** la tienda abierta, **When** se mira la sección de expansiones, **Then** cada una de las cuatro aparece en una
   tarjeta con su nombre real arriba a la izquierda, debajo una breve descripción de su contenido, abajo los botones
   «Comprar» con el precio en fragmentos (izquierda) y «Ver detalle» con icono de lupa (derecha), del mismo ancho y
   alto, y su icono de tienda
   grande sobresaliendo por la esquina superior derecha de la tarjeta, como describe FR-017.
2. **Given** una tarjeta de expansión, **When** se pulsa «Ver detalle», **Then** se abre un modal con el nombre de la
   expansión, el cartel grande, el botón de compra con su precio y la lista de sus 24 jugadores, en la que se distinguen
   los que el usuario ya tiene.
3. **Given** un usuario con al menos 2400 fragmentos y ninguna carta de la expansión, **When** la compra, **Then** se le
   cobran 2400 fragmentos, recibe las 24 cartas y el sobre de regalo de esa expansión.
4. **Given** un usuario que ya tiene 1 GOAT, 2 Crack y 3 Superclase de una expansión (de sobres de la tienda), **When**
   la compra, **Then** se le cobran 2400, recibe las 18 cartas que no tenía y 175 + 2×75 + 3×25 = 400 fragmentos de
   compensación, y el resumen de compra le muestra ese desglose.
5. **Given** un usuario con menos de 2400 fragmentos, **When** intenta comprar, **Then** la compra no se hace y se le dice
   cuántos fragmentos le faltan.
6. **Given** un usuario que ya compró una expansión, **When** vuelve a la tienda, **Then** la expansión aparece como
   adquirida y no se puede volver a comprar.
7. **Given** una compra repetida por un doble clic o un reintento de red, **When** llega dos veces, **Then** se cobra y se
   entrega una sola vez.

---

### User Story 3 - Sobres: regalo de cada expansión y ocho diseños nuevos a la venta (Priority: P2)

Como jugador quiero que cada expansión me regale un diseño de sobre exclusivo y poder comprar diseños nuevos en la
tienda, para personalizar mis sobres.

**Why this priority**: añade valor a la compra y amplía el catálogo de cosméticos, pero las expansiones se pueden vender
sin ello.

**Independent Test**: comprar cada expansión y comprobar el sobre regalado; revisar que los cuatro sobres de regalo no
se pueden comprar sueltos ni en packs, que los ocho nuevos sí y que todos los packs de sobres tienen 5 sobres.

**Acceptance Scenarios**:

1. **Given** la compra de una expansión, **When** se completa, **Then** el usuario posee su sobre de regalo: Remontada
   Histórica → sobre 7, Ídolos Dorados → sobre 1, Saque Ardiente → sobre 4, Estrellas Fulgurantes → sobre 28.
2. **Given** la tienda de cosméticos, **When** se listan los sobres, **Then** los sobres 1, 4, 7 y 28 no aparecen a la
   venta (ni sueltos ni dentro de packs) y los sobres 25, 26, 27, 29, 30, 31, 32 y 33 sí, con el mismo formato, peso y
   precio que los demás sobres de pago.
3. **Given** los packs de sobres, **When** se listan, **Then** el pack 2 tiene los sobres 2, 3, 25, 26 y «Tinta y trama»,
   el pack 3 tiene los sobres 5, 6, 8, 9 y 27, y hay un pack 7 nuevo con los sobres 29 a 33, todos al precio de los
   demás packs de sobres.
4. **Given** un usuario que ya tenía el sobre de regalo (comprado antes de esta spec), **When** compra la expansión,
   **Then** lo conserva y la compra no falla ni se lo duplica.
5. **Given** el cartel de cada expansión, **When** se ve en el detalle, **Then** el sobre que muestra el cartel coincide con
   el que se regala.

---

### User Story 4 - Nuevo icono del fragmento en toda la interfaz (Priority: P3)

Como jugador quiero reconocer de un vistazo la moneda del juego con un icono propio en todos los sitios donde aparece.

**Why this priority**: mejora visual independiente del resto.

**Independent Test**: recorrer la barra de navegación, la tienda (todos los botones de compra), los resúmenes de compra,
la colección (desfragmentar) y el perfil, y comprobar que el fragmento se representa siempre con el nuevo icono.

**Acceptance Scenarios**:

1. **Given** cualquier pantalla que muestre una cantidad de fragmentos, **When** se ve, **Then** junto a la cantidad
   aparece el nuevo icono del fragmento, legible a su tamaño, en tema claro y oscuro.
2. **Given** un lector de pantalla, **When** lee un precio o un saldo, **Then** anuncia la cantidad seguida de
   «fragmentos» (el icono no sustituye al texto accesible).

---

### Edge Cases

- **Usuario que ya tiene las 24 cartas** de una expansión (de sobres): puede comprarla igualmente; recibe 0 cartas,
  la compensación completa (6×175 + 6×125 + 6×75 + 6×25 = 2400 fragmentos, el mismo precio) y el sobre de regalo. La
  tienda se lo indica antes de comprar.
- **Verratti en cuentas existentes**: todos los registrados tienen hoy a Verratti por ser del Core. Lo conservan; al
  comprar Estrellas Fulgurantes cuenta como carta ya poseída (compensación de GOAT). Como ya no es del Core, se puede
  desfragmentar (175); si alguien lo hace y luego compra la expansión, lo recibe como carta nueva. Kimmich se entrega a todos los
  registrados, como cualquier carta del Core.
- **Verratti en plantillas guardadas o partidas en curso**: siguen funcionando; la carta no cambia, solo su pertenencia.
- **Cuentas con cartas o colecciones de prueba**: el juego no está en producción, así que se borran sin compensación.
  Como los ids 301 en adelante pasan a ser cartas de expansión, la posesión de cartas de prueba se borra antes de cargar
  las expansiones: nadie debe acabar con una carta de expansión que no ha conseguido.
- **Plantillas guardadas con cartas de prueba**: se eliminan las plantillas que contengan alguna carta de prueba.
- **Partidas con cartas de prueba**: la actualización se aplica con el servidor parado y sin partidas en curso; las
  partidas terminadas que citaban cartas de prueba se eliminan, para que ninguna se reproduzca con jugadores distintos.
- **Invitados**: no compran expansiones (igual que hoy con las colecciones); solo juegan con el Core.
- **Expansiones futuras** de 40 jugadores con otro reparto de rarezas y otro precio: el modelo no debe suponer 24
  cartas, 6 por rareza ni 2400 fragmentos.
- **Imágenes defectuosas**: un retrato con restos de verde, recortado o descentrado, o un fondo que falte, impide dar la
  carta por buena (la validación del catálogo lo detecta).

## Requirements *(mandatory)*

### Functional Requirements

**Catálogo y datos**

- **FR-001**: El catálogo DEBE incluir cuatro expansiones de pago con estos nombres visibles: Remontada Histórica (A),
  Ídolos Dorados (B), Saque Ardiente (C) y Estrellas Fulgurantes (D).
- **FR-002**: Cada jugador de las listas de `./expansiones` DEBE tener una carta con el modelo actual completo: nombre,
  apellidos, nombre de carta, nacionalidad, fecha de nacimiento, altura, demarcación, posiciones, historia, las seis
  estadísticas, media, virtudes, defectos, nivel, retrato e ilustración de fondo.
- **FR-003**: Los datos personales (nombre completo, nacionalidad, fecha de nacimiento, altura, demarcación, posiciones)
  DEBEN ser los reales del jugador, contrastados con las fuentes de su lista; la historia, las estadísticas, la media,
  las virtudes y los defectos DEBEN seguir los mismos criterios que se usaron para las cartas reales del Core (spec 008)
  y respetar su nivel.
- **FR-004**: El nivel de cada carta DEBE salir de su `rareza_X.txt`: ids 1–6 GOAT, 7–12 Legendario, 13–18 Crack,
  19–24 Superclase.
- **FR-005**: Cada carta DEBE tener un identificador único en todo el catálogo, a partir del 301, y el sistema DEBE
  registrar a qué expansión o expansiones pertenece; se DEBE conservar la correspondencia con su número dentro de la
  expansión (1–24).
- **FR-006**: Todas las cartas de expansión DEBEN pasar las mismas reglas de validación del catálogo que las del Core.
- **FR-007**: Joshua Kimmich (D-4) DEBE pasar al Core y Marco Verratti (id 299) DEBE pasar a Estrellas Fulgurantes; el
  Core sigue teniendo 300 cartas y el recuento de niveles por demarcación del Core no se descompensa (ambos son GOAT de
  medio campo). La carta de Kimmich DEBE tener una media de 88 como mínimo (la de Verratti es 88), y tras el cambio se
  DEBE pasar `pnpm balance`. Verratti pasa a comportarse como cualquier otra carta de expansión; en particular, se
  puede desfragmentar.
- **FR-008**: Kimmich DEBE entregarse a todos los usuarios registrados como el resto de cartas del Core; quien ya tenga
  a Verratti lo DEBE conservar.

**Retirada de las colecciones y cartas de prueba**

- **FR-009**: Las colecciones All Stars y Top Argentinos y sus 75 cartas de prueba DEBEN desaparecer del catálogo y de
  la tienda.
- **FR-010**: Antes de que los ids 301 en adelante se asignen a cartas de expansión, DEBE eliminarse de todas las cuentas
  la posesión de cartas de prueba, las compras de colecciones de prueba, las plantillas guardadas que contengan cartas
  de prueba y las partidas terminadas que las citen.
- **FR-011**: La retirada NO compensa: el juego no está en producción y no hay cuentas reales que proteger.
- **FR-012**: La retirada DEBE poder ejecutarse más de una vez sin error ni efectos adicionales.

**Imágenes de las cartas**

- **FR-013**: Cada retrato DEBE extraerse de su página, sin el fondo verde croma (sin halo verde visible en los bordes),
  y quedar con el mismo formato, encuadre y tamaño que los retratos propios del Core.
- **FR-014**: Cada ilustración de fondo DEBE adaptarse y comprimirse al mismo formato y tamaño que los fondos de las
  cartas del Core.
- **FR-015**: La asignación de retrato y fondo a cada carta DEBE ser verificable: una herramienta repetible genera las
  imágenes desde `./expansiones` y comprueba que cada carta tiene las dos y que no sobra ninguna.

**Tienda**

- **FR-016**: El nombre visible de las colecciones de pago DEBE pasar a ser «expansiones» en toda la interfaz (sección
  de la tienda, filtros, resúmenes de compra, colección). El Core sigue llamándose Core.
- **FR-017**: Cada expansión DEBE mostrarse en la tienda con su nombre, una breve descripción de su contenido (número de
  jugadores, reparto por rareza y sobre de regalo), el botón «Comprar» con el precio en fragmentos, el botón «Ver
  detalle» con icono de lupa y su icono de tienda, colocados según el esquema de la persona:
  - la tarjeta es un rectángulo apaisado de esquinas redondeadas, unas 2,5 veces más ancho que alto;
  - **nombre**: arriba a la izquierda, en un bloque que ocupa algo más de la mitad del ancho de la tarjeta; es el texto
    más grande;
  - **descripción**: debajo del nombre, alineada a su izquierda, en la misma columna izquierda;
  - **botones**: en una fila a lo ancho de la parte inferior, con el mismo margen interior que el resto: «Comprar» con
    el precio a la izquierda y «Ver detalle» con la lupa detrás del texto a la derecha; los dos ocupan exactamente lo
    mismo, en ancho (la mitad de la fila cada uno, menos el hueco entre ellos) y en alto;
  - **icono de tienda**: un cuadrado grande, de casi la altura de la tarjeta, en la esquina superior derecha y por
    delante de ella: asoma por arriba alrededor de un tercio de su altura y sobresale un poco por la derecha; su borde
    izquierdo queda hacia el 60 % del ancho de la tarjeta, sin tapar el nombre, y su borde inferior acaba justo encima
    de la fila de botones, sin tocarlos.
- **FR-018**: Los valores de desfragmentar una carta DEBEN pasar a ser 25 / 75 / 125 / 175 (Superclase / Crack /
  Legendario / GOAT), para que compensación y desfragmentación coincidan. Comprar un sobre de cartas de la tienda y
  desfragmentarlo DEBE seguir dando menos fragmentos de los que cuesta (valor esperado ≈ 500 frente a 1000).
- **FR-019**: «Ver detalle» DEBE abrir un modal con el nombre de la expansión, su cartel en grande, el botón de compra y
  la lista de todos sus jugadores, señalando los que el usuario ya tiene y los fragmentos de compensación que recibiría.
- **FR-020**: Cada expansión DEBE costar 2400 fragmentos y solo se DEBE poder pagar con fragmentos.
- **FR-021**: Al comprar una expansión, por cada carta que el usuario ya tuviera DEBE recibir en fragmentos su valor de
  desfragmentar (FR-018): GOAT 175, Legendario 125, Crack 75, Superclase 25.
- **FR-022**: Una expansión ya adquirida NO DEBE poder comprarse otra vez; la compra DEBE ser idempotente frente a
  reintentos.
- **FR-023**: El resumen de la compra DEBE mostrar las cartas recibidas, las cartas compensadas con su importe, el total
  de fragmentos devueltos y el sobre regalado.
- **FR-024**: El sobre de cartas de la tienda DEBE sacar sus cartas de las expansiones.

**Sobres**

- **FR-025**: La compra de cada expansión DEBE regalar su sobre: A → sobre 7, B → sobre 1, C → sobre 4, D → sobre 28.
- **FR-026**: Los sobres 1, 4, 7 y 28 NO DEBEN venderse sueltos ni en packs; solo se DEBEN poder conseguir comprando su
  expansión. Quien ya los tenga los conserva.
- **FR-027**: Los sobres 25, 26, 27, 29, 30, 31, 32 y 33 DEBEN añadirse a la tienda de cosméticos, adaptados y
  comprimidos al formato de los sobres actuales, con el mismo precio que los sobres de pago existentes.
- **FR-028**: El sobre 28 DEBE añadirse al catálogo de cosméticos como sobre no vendible.
- **FR-029**: El pack de sobres 2 DEBE sustituir los sobres 1 y 4 por los sobres 25 y 26; el pack 3 DEBE sustituir el
  sobre 7 por el 27; DEBE crearse un pack 7 con los sobres 29, 30, 31, 32 y 33, al mismo precio que los demás packs de
  sobres.

**Icono del fragmento**

- **FR-030**: El icono `expansiones/icono/fragmento.png`, adaptado y comprimido, DEBE representar el fragmento en todos
  los sitios donde la interfaz muestra fragmentos: contador de la barra de navegación, botones de compra y precios,
  resúmenes de compra, desfragmentar, historial de movimientos y perfil.
- **FR-031**: El icono DEBE ser decorativo para los lectores de pantalla; la cantidad se anuncia con el texto
  «fragmentos».

**Extensibilidad**

- **FR-032**: El número de cartas, el reparto por rareza, el precio y el sobre de regalo DEBEN ser datos de cada
  expansión, de modo que añadir una expansión de 40 jugadores con otro reparto y otro precio no exija cambiar reglas.

### Key Entities *(include if feature involves data)*

- **Expansión**: producto de pago con id, nombre visible, descripción, precio en fragmentos, lista de cartas, sobre de
  regalo, icono de tienda y cartel. Sustituye en la interfaz al término «colección de pago».
- **Carta de expansión**: carta del catálogo con el modelo actual, identificador global único (desde el 301) y su número
  dentro de la expansión; puede pertenecer a una o varias expansiones.
- **Sobre de regalo**: cosmético de sobre asociado a una expansión, que no se vende suelto ni en packs.
- **Compensación**: fragmentos que se suman al comprar una expansión por cada carta ya poseída, según el nivel de la
  carta.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Las 4 expansiones tienen 24 cartas cada una (96 en total, 6 por rareza en cada una) y el 100 % pasa la
  validación del catálogo.
- **SC-002**: El 100 % de las cartas de expansión tiene retrato e ilustración de fondo; en la revisión visual de las 96,
  ninguna muestra restos del fondo verde ni un retrato cortado.
- **SC-003**: El 100 % de los datos personales verificables (fecha de nacimiento, nacionalidad, altura, demarcación)
  coincide con las fuentes de consulta del jugador.
- **SC-004**: En las pruebas de compra, el saldo final es siempre exactamente saldo inicial − 2400 + compensación, para
  cualquier combinación de cartas ya poseídas (de 0 a 24).
- **SC-005**: Un usuario encuentra una expansión, abre su detalle y la compra en menos de 1 minuto sin ayuda.
- **SC-006**: Ningún sobre de regalo aparece a la venta, los 8 sobres nuevos sí y todos los packs de sobres tienen 5
  sobres.
- **SC-007**: Tras la retirada, 0 cuentas conservan cartas, colecciones, plantillas o partidas con cartas de prueba, y
  ejecutarla otra vez no cambia nada.
- **SC-008**: El 100 % de las apariciones de fragmentos en la interfaz usa el nuevo icono.
- **SC-009**: El peso de las imágenes nuevas por carta no supera el de las cartas del Core (retrato y fondo) en más de
  un 10 %.

## Fuera de alcance

- **Regalo de una expansión con el primer pase mensual**: descartado en esta spec. El pase se puede pagar con euros y el
  Principio VII establece que el pase no entrega cartas, sobres, colecciones ni fragmentos a ninguna cuenta mientras no
  haya licencia de imagen. Se puede retomar cuando cambie esa regla (INI-12, pagos reales) o como incentivo que no dé
  cartas.
- Expansiones de 40 jugadores: solo se prepara el modelo (FR-032).

## Assumptions

- **Valores de desfragmentar**: confirmado en las aclaraciones: desfragmentar pasa a 25 / 75 / 125 / 175 (FR-018). Esto
  cambia el valor esperado de desfragmentar un sobre (de ≈ 350 a ≈ 500) y los textos que lo citen.
- **Sobres de regalo**: la frase «solo se podrán obtener mediante los fragmentos de la venta directa» se interpreta como
  «solo se podrán obtener comprando la expansión» (FR-026).
- **Sin compensación por las cartas de prueba**: confirmado en las aclaraciones; el juego no está en producción (INI-10
  pendiente) y las cuentas afectadas son de desarrollo o de pruebas (FR-011).
- **Precio de los sobres y del pack nuevos**: el mismo que los sobres y packs de pago actuales (250 fragmentos o
  0,50 € por sobre; 1,99 € por pack).
- **Derechos de imagen**: los jugadores de las expansiones son reales; el riesgo es el mismo que el del Core y el plan B
  de identidad alternativa (`identidad_cartas`) les DEBE aplicar igual.
- **Draft y equilibrio**: las cartas de expansión entran en el draft con las reglas que ya rigen las colecciones de pago
  (spec 006 y Principio VII); esta spec no cambia el motor ni la composición de los sobres del draft.
- **Invitados**: no compran expansiones.
- **Material**: el contenido de `./expansiones` es la fuente; la implementación deja copia de lo necesario dentro del
  proyecto y no depende de que esa carpeta siga en la raíz.
