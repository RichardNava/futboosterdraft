# Feature Specification: Rework de la tienda — derechos de imagen, escudos y sobres cosméticos

**Feature Branch**: `main` (sin rama propia, como las specs 008 a 010)

**Created**: 2026-11-04

**Status**: Draft — pendiente de `/speckit-clarify` (Q1 a Q3)

**Input**: User description: "Spec 11 — Rework Shop. 0) Licencias y derechos: investigar los derechos de imagen de
futbolistas en activo y retirados (vivos o fallecidos) y decidir el rumbo entre seguir igual, versiones ficticias
estilo PES, jugadores reales con monetización no ligada a las cartas o jugadores inventados, a la espera de la
respuesta de FIFPRO. 1) Venta de cosméticos: escudos (`escudos/`, gratuitos los numerados, de pago los
`escudo_premiun_#`) y sobres (`sobres/`, todos de pago, con su versión rasgada distinta para cada diseño), adaptados
para web; la venta depende de la decisión del punto 0. 2) Escudos: selector en «Mi perfil» y al crear o unirse a una
partida; el escudo sustituye al círculo de color del equipo (marcador, resumen de acciones…); analizar qué pasa con dos
escudos iguales en un partido y si se permite subir un escudo propio. 3) Sobres: el diseño favorito se elige en «Mi
perfil» y se usa cada vez que se muestra un sobre; opción carrusel con varios favoritos que se alternan al azar."

## Contexto

- La tienda de la [006](../006-preparacion-bd-cartas/spec.md) vende sobres, colecciones y fragmentos con **pago
  simulado** (006/FR-031) y ya prevé cosméticos (006/FR-033). Los pagos reales son [INI-12](../../ROADMAP.md#ini-12-pagos-reales).
- Desde la [008](../008-datos-reales-core/spec.md), las 300 cartas de Core son futbolistas reales, en activo y
  retirados, con nombre y retrato. Eso convierte los derechos de imagen en un riesgo para producción
  ([INI-11](../../ROADMAP.md#ini-11-catálogo-de-cartas-definitivo)). La investigación está en
  [derechos-imagen.md](derechos-imagen.md).
- Recursos de origen en la raíz del repositorio (sin versionar): `escudos/` con 18 escudos gratuitos (`01_…` a `18_…`)
  y 20 de pago (`escudo_premiun_1` a `_20`), y `sobres/` con 30 diseños de pago (6 con nombre, `01_cubismo` a
  `06_tinta_y_trama`, y 24 numerados, `sobre_1` a `sobre_24`). Todos son PNG de 1024 px (escudos 1024 × 1024, sobres
  1024 × 1536); juntos pesan unos 116 MB.

Términos:

- **Cosmético**: objeto que solo cambia la presentación (escudo o diseño de sobre). Nunca afecta al draft, al partido
  ni a la colección de cartas.
- **Escudo del equipo**: imagen que identifica a un participante en una partida. Sustituye al círculo de color actual.
- **Diseño de sobre**: aspecto del sobre cerrado y su versión rasgada (abierto). El sobre original del juego es el
  diseño por defecto y es gratuito.
- **Identidad de una carta**: nombre y retrato que se muestran. Las stats, virtudes, defectos, rareza y demarcación
  no forman parte de la identidad.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Elegir escudo y verlo en el partido (Priority: P1)

Una persona registrada entra en «Mi perfil», abre el selector de escudos y elige uno de los que tiene (los 18
gratuitos y los de pago que haya comprado). Al crear o unirse a una partida, el escudo del perfil viene elegido y puede
cambiarlo solo para esa partida, igual que el nombre y la equipación. Durante el partido, su escudo aparece en todos los
sitios donde antes había un círculo de color: marcador, resumen de acciones, reproducción y demás.

**Why this priority**: es la parte visible para todos (también para quien no compra nada) y la base sobre la que se
vende la mitad de la tienda.

**Independent Test**: con una cuenta sin compras, elegir un escudo gratuito en el perfil, crear una partida, jugar un
partido y comprobar que el escudo aparece en el marcador y en el resumen de acciones en lugar del círculo.

**Acceptance Scenarios**:

1. **Given** una cuenta registrada sin compras, **When** abre el selector de escudos, **Then** ve los 18 gratuitos
   disponibles y los 20 de pago marcados como bloqueados, con acceso a la tienda.
2. **Given** un escudo elegido en el perfil, **When** crea o se une a una partida, **Then** ese escudo viene
   preseleccionado y puede cambiarse solo para esa partida sin alterar el del perfil.
3. **Given** un partido en curso, **When** se muestra el marcador o el resumen de acciones, **Then** cada equipo
   aparece con su escudo en lugar del círculo de color.
4. **Given** una cuenta que nunca ha elegido escudo, **When** entra en una partida, **Then** se le asigna un escudo
   gratuito estable (siempre el mismo para esa cuenta) hasta que elija otro.
5. **Given** un rival NPC, **When** se muestra el partido, **Then** el NPC tiene un escudo gratuito asignado.
6. **Given** un invitado (sin cuenta), **When** crea o se une a una partida, **Then** puede elegir entre los escudos
   gratuitos y no ve los de pago.

---

### User Story 2 - Elegir el diseño del sobre (favorito o carrusel) (Priority: P1)

En «Mi perfil», la persona elige qué diseño de sobre quiere ver. Puede marcar uno como favorito o activar el carrusel
y marcar varios; con el carrusel, cada vez que aparece un sobre se elige al azar uno de los marcados. El diseño se usa
en todos los sitios donde se muestra un sobre (draft y apertura en la tienda), cerrado y rasgado.

**Why this priority**: es la otra mitad de los cosméticos y la que más se ve: cada partida abre tres sobres.

**Independent Test**: con una cuenta que tenga dos diseños comprados, activar el carrusel con ambos, abrir varios
sobres en el draft y comprobar que aparecen los dos diseños y que cada uno se rasga con su propia rasgadura.

**Acceptance Scenarios**:

1. **Given** una cuenta sin diseños comprados, **When** abre el selector de sobres, **Then** solo tiene el diseño
   original activo y ve los 30 de pago bloqueados con acceso a la tienda.
2. **Given** un diseño favorito elegido, **When** se muestra un sobre en el draft o en la apertura de la tienda,
   **Then** se ve ese diseño cerrado y, al abrirlo, su versión rasgada.
3. **Given** el carrusel activo con N diseños marcados, **When** se muestran sobres, **Then** cada sobre muestra uno de
   esos N elegido al azar, y en 30 sobres seguidos aparecen todos los marcados (con N ≤ 5).
4. **Given** dos diseños distintos, **When** se abren, **Then** su rasgadura es distinta.
5. **Given** que el diseño elegido es un cosmético personal, **When** varios humanos hacen el draft en la misma
   partida, **Then** cada uno ve su propio diseño, y el contenido de los sobres no cambia por ello.

---

### User Story 3 - Comprar escudos y sobres en la tienda (Priority: P2)

La tienda tiene dos bloques nuevos, «Escudos» y «Sobres», con vista previa de cada cosmético y su precio. Al comprar uno,
pasa a estar disponible en el selector del perfil. La forma de pago depende de la decisión de la Q1.

**Why this priority**: sin compras los selectores ya aportan valor con los gratuitos; la venta es el siguiente paso.

**Independent Test**: comprar un escudo de pago y un diseño de sobre desde la tienda y comprobar que aparecen
desbloqueados en «Mi perfil»; repetir la compra con doble pulsación y comprobar que se cobra una sola vez.

**Acceptance Scenarios**:

1. **Given** un cosmético no comprado, **When** se compra, **Then** queda desbloqueado para siempre en la cuenta y el
   saldo o el pago se descuentan una sola vez, aunque se pulse dos veces o se corte la conexión.
2. **Given** un cosmético ya comprado, **When** se ve en la tienda, **Then** aparece como «Comprado» y no se puede
   comprar de nuevo.
3. **Given** un invitado, **When** entra en los bloques de cosméticos, **Then** ve el catálogo pero se le pide crear
   cuenta para comprar.

---

### User Story 4 - Plan B de identidad de las cartas (Priority: P2)

El responsable del juego puede cambiar, con un único ajuste del servicio, qué identidad muestran las cartas: la real
(nombre y retrato del futbolista) o la alternativa (nombre y retrato ficticios). El cambio no altera ninguna stat ni
ningún resultado. Es la respuesta preparada ante un «cese y desista» o el camino hacia jugadores ficticios, según
decida la Q1.

**Why this priority**: no lo ve la persona que juega mientras no haga falta, pero sin él un «cese y desista» obligaría
a cerrar el juego o a reescribir el catálogo con prisas.

**Independent Test**: con el ajuste en «alternativa», recorrer «Colección», draft y partido y comprobar que ninguna
carta con identidad alternativa muestra el nombre o el retrato real; jugar el mismo partido con la misma semilla en
ambos modos y comprobar que el resultado es idéntico.

**Acceptance Scenarios**:

1. **Given** el ajuste en «alternativa», **When** se muestra cualquier carta (colección, draft, alineación, partido,
   resúmenes, avisos), **Then** se ven su nombre y su retrato alternativos.
2. **Given** una carta sin identidad alternativa definida, **When** el ajuste está en «alternativa», **Then** se
   muestra con un nombre genérico derivado de su demarcación y la silueta por defecto, nunca con la identidad real.
3. **Given** el mismo partido con la misma semilla, **When** se juega con el ajuste en «real» y en «alternativa»,
   **Then** el desarrollo y el resultado son idénticos.
4. **Given** el catálogo, **When** se valida, **Then** el informe dice cuántas cartas tienen identidad alternativa,
   por rareza, y señala las de leyendas fallecidas sin ella.

---

### Edge Cases

- **Dos equipos con el mismo escudo en un partido**: ver FR-008 (pendiente de Q2).
- **Un cosmético retirado del catálogo**: quien lo compró lo conserva; si un escudo deja de existir, se usa el escudo
  gratuito asignado a la cuenta (FR-005).
- **Carrusel con un solo diseño marcado**: equivale a favorito. Desmarcar todos deja el diseño original.
- **Escudo de pago elegido en una partida y luego reembolsado o retirado**: la partida en curso conserva el escudo con
  el que empezó; las nuevas usan el del perfil.
- **Torneos ya en curso al desplegar la spec**: los participantes sin escudo reciben el asignado (FR-005) sin cambiar
  nada más de la partida.
- **Imagen de un cosmético que no carga**: se muestra el círculo de color (escudos) o el sobre original (sobres); el
  juego nunca se queda esperando una imagen.
- **Pantallas estrechas (360 px)**: el escudo del marcador sigue siendo reconocible; el selector se adapta sin
  desplazamiento horizontal.

## Requirements *(mandatory)*

### Functional Requirements

**Decisión de derechos (apartado 0)**

- **FR-001**: El rumbo sobre derechos de imagen DEBE quedar registrado en esta spec y en la constitución («Decisiones
  resueltas») a partir de la investigación de [derechos-imagen.md](derechos-imagen.md):
  [NEEDS CLARIFICATION: ¿qué opción se adopta ahora? A) monetización solo cosmética con jugadores reales + plan B de
  identidad listo; B) pasar ya a identidades alternativas estilo PES; C) jugadores totalmente inventados; D) seguir
  igual (0.1) vendiendo cartas]
- **FR-002**: Mientras no exista licencia de imagen, la tienda NO DEBE vender con dinero real cartas, sobres de cartas
  ni colecciones que muestren identidades reales, ni fragmentos que puedan gastarse en ellos (aplica si Q1 = A).

**Cosméticos: catálogo y recursos**

- **FR-003**: El catálogo de cosméticos DEBE incluir los 38 escudos de `escudos/` (18 gratuitos y 20 de pago) y los
  30 diseños de `sobres/` (todos de pago), más el sobre original como diseño gratuito por defecto. Cada cosmético tiene
  un identificador estable, un nombre visible y un precio si es de pago.
- **FR-004**: Cada imagen DEBE adaptarse a la web (formato, tamaño y compresión) y cada diseño de sobre DEBE tener su
  versión rasgada, con una rasgadura distinta para cada diseño. Los originales no se publican y dejan de estar en la
  raíz del repositorio al cerrar la spec.

**Escudos**

- **FR-005**: Cada cuenta DEBE tener un escudo en todo momento: el elegido o, si no ha elegido, uno gratuito asignado de
  forma estable a partir de la cuenta. Los NPC reciben un escudo gratuito por partida.
- **FR-006**: «Mi perfil» y las pantallas donde se elige el nombre del equipo al crear o unirse a una partida DEBEN
  ofrecer un selector con los escudos disponibles para esa persona (gratuitos y comprados) y mostrar los de pago no
  comprados como bloqueados con acceso a la tienda. Los invitados solo ven los gratuitos.
- **FR-007**: El escudo DEBE mostrarse en todos los sitios donde hoy se muestra el círculo con el color principal del
  equipo (como mínimo marcador, resumen de acciones, partido 2D y reproducción), con el mismo tamaño que ocupaba el
  círculo y un texto alternativo con el nombre del equipo.
- **FR-008**: Cuando los dos equipos de un partido tengan el mismo escudo, DEBEN poder distinguirse en todos los sitios
  donde aparecen juntos: [NEEDS CLARIFICATION: ¿cómo? A) ambos vuelven al círculo de color, local con el principal y
  visitante con el secundario; B) el visitante muestra su escudo con un distintivo (número o inicial); C) el visitante
  muestra su escudo con un filtro de color de su equipación]
- **FR-009**: El servidor DEBE validar que el escudo elegido está disponible para esa cuenta; uno no disponible se
  sustituye por el asignado (FR-005).
- **FR-010**: Subir un escudo propio desde el equipo de la persona: [NEEDS CLARIFICATION: ¿entra en esta spec? A) no
  (fuera de alcance); B) sí, para todas las cuentas; C) sí, solo para una futura cuenta premium (se deja para su spec)]

**Sobres**

- **FR-011**: «Mi perfil» DEBE permitir elegir un diseño de sobre favorito entre los disponibles o activar el carrusel
  y marcar varios.
- **FR-012**: Cada vez que se muestre un sobre a la persona (draft y apertura de la tienda), DEBE usarse su favorito o,
  con el carrusel, uno de los marcados elegido al azar en ese momento; abierto, se ve su versión rasgada.
- **FR-013**: El diseño del sobre es una preferencia personal: cada persona ve el suyo y NO DEBE cambiar el contenido de
  ningún sobre ni lo que ven los demás.

**Tienda**

- **FR-014**: La tienda DEBE tener los bloques «Escudos» y «Sobres» con vista previa (el sobre, cerrado y rasgado) y
  precio. Los cosméticos comprados aparecen como «Comprado».
- **FR-015**: Los cosméticos de pago DEBEN poder comprarse con fragmentos y con dinero real (pago simulado hasta
  INI-12). Toda compra se valida y resuelve en el servidor y se cobra una sola vez (como 006/FR-032 y 006/SC-007).
- **FR-016**: Comprar un cosmético NO DEBE dar ninguna ventaja en el juego (Principio VII).

**Identidad de las cartas**

- **FR-017**: Cada carta DEBE poder tener, además de su identidad real, una identidad alternativa (nombre y retrato).
- **FR-018**: Un único ajuste del servicio DEBE decidir qué identidad se muestra en todo el juego; con «alternativa»,
  una carta sin identidad alternativa se muestra con un nombre genérico y la silueta por defecto (US4, escenario 2).
- **FR-019**: Cambiar el ajuste NO DEBE alterar stats, virtudes, defectos, rareza, composición de los sobres ni
  resultados (Principios I, IV y V).
- **FR-020**: La validación del catálogo DEBE informar de la cobertura de identidades alternativas por rareza y
  señalar las cartas de leyendas fallecidas sin ella.

### Key Entities

- **Cosmético**: identificador, tipo (escudo o diseño de sobre), nombre visible, gratuito o de pago, precio en
  fragmentos y en dinero, imágenes (escudo; o sobre cerrado y rasgado), activo o retirado.
- **Cosmético poseído**: relación cuenta–cosmético con fecha y origen de la compra; nunca se pierde.
- **Preferencias de aspecto**: por cuenta, escudo elegido, diseño de sobre favorito, carrusel activo y diseños
  marcados.
- **Escudo del participante**: escudo con el que cada participante (humano o NPC) juega una partida concreta.
- **Identidad de carta**: identidad real y alternativa (nombre y retrato) de cada carta; el ajuste global elige cuál
  se muestra.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una persona nueva elige escudo y diseño de sobre desde «Mi perfil» en menos de 1 minuto sin ayuda.
- **SC-002**: En un partido completo, en ninguno de los sitios donde antes aparecía el círculo de color falta el
  escudo; comprobado recorriendo marcador, resumen de acciones, 2D y reproducción.
- **SC-003**: En 20 partidos con los dos equipos con el mismo escudo, se distingue qué equipo es cuál en el 100 % de los
  sitios donde aparecen juntos.
- **SC-004**: Con el carrusel activo y 3 diseños marcados, los 3 aparecen en una partida completa de draft más tres
  aperturas en la tienda.
- **SC-005**: El peso total de los cosméticos publicados es como máximo el 10 % del de los originales (~116 MB), y un
  escudo o un sobre se ven nítidos al tamaño máximo al que se muestran.
- **SC-006**: Cada compra de cosmético se cobra una sola vez con dobles pulsaciones y cortes de conexión (mismo
  procedimiento que 006/SC-007).
- **SC-007**: Con el ajuste de identidad en «alternativa», ninguna pantalla muestra un nombre o retrato real; y el mismo
  partido con la misma semilla da el mismo resultado en ambos modos.
- **SC-008**: El cambio de identidad real a alternativa en producción tarda menos de 1 hora, sin desplegar código nuevo.
- **SC-009**: La decisión de derechos queda registrada en la constitución y en el [ROADMAP](../../ROADMAP.md)
  (INI-11 e INI-14) antes de implementar la venta.

## Assumptions

- La investigación legal es orientativa; la decisión final puede cambiar con la respuesta de FIFPRO o una consulta
  con un abogado, y el plan B de identidad (US4) sirve para cualquiera de las opciones.
- Los precios de cada cosmético se fijan en el plan; todos los de pago del mismo tipo pueden tener el mismo precio.
- El pago con dinero real sigue simulado hasta INI-12 (006/FR-031).
- Los escudos y diseños de sobre son arte propio del proyecto; hay que revisar que ningún escudo se parezca a uno real.
- No hay cuentas premium ni pase de temporada en esta spec.
- Las identidades alternativas (nombres y retratos ficticios) se crean fuera de esta spec; aquí solo se prepara el
  catálogo para tenerlas y el ajuste para mostrarlas.
- El escudo de selección de las cartas (006/FR-044, desactivado por T087) no cambia con esta spec.
- La rasgadura de cada sobre puede generarse de forma automática siempre que cada diseño tenga una distinta.
