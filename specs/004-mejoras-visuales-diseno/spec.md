# Feature Specification: Mejoras visuales y de diseño (GUI + UX)

**Feature Branch**: `004-mejoras-visuales-diseno`

**Created**: 2026-10-20

**Status**: Draft

**Input**: User description: "Spec 4 — Mejoras visuales y de diseño (GUI + UX): realizar mejoras de diseño y estilos para que la página quede de manera profesional, atractiva y moderna, con el criterio más adecuado para que la experiencia de usuario sea óptima. Seguir la guía de estilos DESIGN.md (moverla a otro directorio si conviene). Usar la skill frontend-design."

**Relación con las specs anteriores**: esta especificación cambia la presentación de las pantallas definidas en [specs/001-draft-manager-mvp/spec.md](../001-draft-manager-mvp/spec.md), [specs/002-mejoras-mvp/spec.md](../002-mejoras-mvp/spec.md) y [specs/003-mejoras-ux-simulacion/spec.md](../003-mejoras-ux-simulacion/spec.md). Las referencias del tipo "003/FR-007" apuntan a requisitos de esas specs. **No cambia ninguna regla del juego, del draft ni del motor de simulación**: solo el aspecto, la organización visual de cada pantalla y la claridad de la interacción. Cuando un requisito de esta spec contradice uno anterior, prevalece el de esta spec (ver "Requisitos de specs anteriores afectados").

**Guía de estilos**: la referencia visual es [docs/diseno/DESIGN.md](../../docs/diseno/DESIGN.md) (se ha movido desde la raíz del repositorio a `docs/diseno/`, junto al resto de la documentación transversal). La guía describe el estilo de un sitio de terceros: esta spec la adopta como **dirección visual** (lienzo casi negro, un único acento lima reservado a las acciones, titulares condensados a escala de cartel, esquinas de 6 px, superficies planas) y la adapta al juego en los puntos que se recogen en FR-001 a FR-012 y en Assumptions.

**Versión de referencia**: cuando un criterio compara con "la versión actual", se refiere al commit `4168404` de `main`, el último antes de esta spec.

## Clarifications

### Session 2026-10-20

- Q: ¿Qué color tienen los avisos que no son errores (dorsales repetidos, avisos de partido, confirmaciones)? → A: Las advertencias que requieren atención usan ámbar alerta (#ffd000) con icono y texto; los avisos informativos y las confirmaciones de éxito son neutros (gris y blanco con icono); el color de error queda solo para los errores.
- Q: ¿Qué botones secundarios llevan contorno y texto lima? → A: Como máximo uno por pantalla, y solo si es la alternativa directa al botón principal (p. ej. "Ver en 2D" frente a "Simular"); el resto de secundarios usan contorno gris y texto blanco.
- Q: ¿Cómo se presenta la navegación principal en móvil? → A: Barra superior de una línea con el nombre del juego y un botón "Menú" que despliega los enlaces en un panel (a pantalla completa o lateral).
- Q: ¿Las comprobaciones de contraste, desplazamiento horizontal y foco se automatizan o son manuales? → A: Se automatizan en la integración continua (contraste y accesibilidad básica, ausencia de desplazamiento horizontal a 360/768/1366/1920 px y recorrido del flujo con teclado), sin comparación de capturas; la lista de verificación visual manual cubre el resto.
- Q: ¿Cómo se ve completo un nombre recortado en pantallas táctiles? → A: Manteniendo pulsado el nombre aparece una etiqueta emergente con el texto completo.

### Session 2026-10-21 — Revisión de la primera ronda (no aprobada)

La primera implementación no se aprueba: "apenas se han cambiado algunos colores; la página sigue pareciendo un MVP amateur". Se pide un resultado **profesional, moderno e impactante, digno de producción**, con **imágenes, logotipo, fondos, texturas y efectos**, y un draft en el que **no haya que desplazarse para elegir carta**.

- Q: ¿Se mantienen las superficies planas, sin degradados ni sombras (FR-008)? → A: No. Se sustituye por FR-041 a FR-043: atmósfera de estadio nocturno con fondos, texturas, luz, profundidad y vidrio.
- Q: ¿Se mantiene "sin fotografía ni ilustraciones decorativas" (Assumptions)? → A: No. Se añaden imágenes propias (SVG y CSS, sin licencias de terceros): logotipo, escudo, sobre, trofeo, campo y estadio (FR-044).
- Q: ¿Se mantiene "sin animaciones de entrada ni efectos de señalado en las tarjetas" (FR-028)? → A: Se relaja: efectos de luz, brillo y relieve en los objetos de juego (cartas, sobres, campo, marcadores) y una entrada orquestada por pantalla clave (FR-045). Sigue rigiendo el movimiento reducido (FR-033).
- Q: ¿Qué se mantiene de la primera ronda? → A: Lo medible y de comportamiento: lima solo para la acción (FR-002, FR-012), contrastes, foco, objetivos táctiles, sin desplazamiento horizontal, textos (FR-035), tipografías OFL y fuente única de valores (FR-037).

### Session 2026-10-21 — Ronda 3 (pequeñas mejoras)

La segunda ronda se aprueba. Antes de pasar a la spec 005 se piden tres mejoras pequeñas:

- Q: ¿Cómo se ve la simulación 2D? → A: El campo y el marcador deben verse enteros sin desplazarse ni ampliar (FR-049).
- Q: ¿Qué añade el marcador del resultado? → A: En pequeño, quiénes han marcado y en qué minuto (FR-048).
- Q: ¿Cómo se ven los campos de fútbol? → A: Con textura de césped, no con un color plano (FR-050).

### Session 2026-10-21 — Ronda 4 (últimos ajustes)

La tercera ronda se aprueba. Últimos ajustes visuales y una corrección del draft:

- Q: ¿Qué se ve al entrar en la portada sin sesión? → A: El titular, la llamada a la acción y los tres pasos del juego, sin desplazarse y con menos aire bajo la barra de navegación (FR-051).
- Q: ¿Cómo se reparte la pantalla de resultado? → A: «Resumen del partido» a la izquierda y «Estadísticas» a la derecha (FR-052).
- Q: ¿Qué añade la franja del 2D? → A: Los goleadores con su minuto, como el marcador del resultado (FR-053; amplía FR-048).
- Q: ¿Cómo se ven los goles en «Lo que ha pasado»? → A: Resaltados sobre el resto de eventos (FR-054).
- Q: ¿Qué tapa la barra en la pantalla del campeón? → A: El nombre del campeón; pasa a la parte superior (FR-055).
- Q: ¿Cómo se elige una carta en el draft? → A: Pulsando en cualquier parte de la carta que no sea un special (también la zona vacía del pie), y con doble clic se elige y confirma a la vez (FR-056).

### Session 2026-10-21 — Ronda 5 (correcciones)

- Q: ¿Cómo se ordenan los campos de «Dorsales»? → A: Todos alineados en vertical y en horizontal, sin depender de la longitud del nombre; el botón «Cambiar» se sustituye por dos botones pequeños con iconos (aceptar y descartar) bajo cada campo (FR-057).
- Q: ¿Qué falla en las tablas de máximos goleadores y asistentes? → A: Las filas quedaban a la derecha de los encabezados en lugar de debajo; la lista de goleadores del marcador compartía la clase de la tabla (FR-058).
- Q: ¿Qué forma tiene el sobre? → A: La de las cartas tal como se ven, no casi cuadrado, en todos los lugares donde aparece (FR-059).

### Session 2026-10-21 — Ronda 6 (último ajuste y media del once)

- Q: ¿Las dos columnas del resultado valen solo para el final? → A: No, también en los descansos y pausas del partido rápido (amplía FR-052).
- Q: ¿Cómo se ve la media del equipo en Formación? → A: Sobre el campo, diez estrellas que se rellenan de forma gradual con la media y, a la derecha y más grande, la cifra en un marco de estrella; en tiempo real, con los titulares alineados y sus penalizaciones (FR-060).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Una identidad visual coherente en todas las pantallas (Priority: P1)

Quien entra en Fútboosterdraft percibe un producto acabado: todas las pantallas comparten el mismo lienzo oscuro, la misma tipografía, el mismo tratamiento de paneles y el mismo color para las acciones. Pasar del inicio al draft, a la formación, al partido y al torneo se siente como recorrer un mismo estadio, no como saltar entre páginas hechas por separado.

**Why this priority**: es el núcleo del encargo ("que la página quede de manera profesional"). Sin una base visual común, cualquier mejora puntual queda aislada y la aplicación sigue pareciendo un prototipo.

**Independent Test**: recorrer todas las pantallas del inventario (FR-013) y comprobar con la lista de verificación visual que cada una usa la paleta, la tipografía, los paneles y los botones de la guía adaptada.

**Acceptance Scenarios**:

1. **Given** cualquier pantalla del inventario, **When** se abre, **Then** el fondo es el lienzo oscuro de la guía, los paneles están un escalón por encima y el texto es blanco o gris claro legible.
2. **Given** dos pantallas cualesquiera, **When** se comparan, **Then** los títulos, los paneles, los botones principales y secundarios, los campos de formulario y los avisos tienen el mismo aspecto.
3. **Given** un dispositivo configurado en modo claro, **When** se abre la aplicación, **Then** se muestra igualmente el tema oscuro, sin mezclas de superficies claras y oscuras.

---

### User Story 2 - Saber siempre qué hacer a continuación (Priority: P1)

En cada pantalla, el participante identifica de un vistazo la acción que le hace avanzar (botón lima) y la distingue de las acciones secundarias. Los estados de espera, error, vacío y desactivado le dicen qué pasa y qué puede hacer.

**Why this priority**: el acento único de la guía solo funciona si se reserva para la acción principal; es la mejora de UX con más impacto y complementa 003/FR-006 y FR-007.

**Independent Test**: enseñar capturas de cada pantalla a personas que no conocen el juego y pedirles que señalen qué pulsarían para avanzar; observar los estados vacíos y de error provocándolos.

**Acceptance Scenarios**:

1. **Given** una pantalla del flujo de juego, **When** el participante la mira, **Then** el único elemento relleno de lima es el botón principal (salvo la excepción de 003/FR-006a), como mucho un secundario lleva contorno lima (FR-002) y los demás secundarios son contorneados en gris o de texto.
2. **Given** un botón principal que aún no se puede usar, **When** se muestra, **Then** aparece apagado (sin lima) y con el motivo visible a su lado (003/FR-007).
3. **Given** una lista sin elementos (p. ej. "Mis partidas" sin partidas), **When** se abre, **Then** se explica qué falta y se ofrece la acción para empezar.
4. **Given** un error de conexión o de validación, **When** ocurre, **Then** el mensaje dice qué ha pasado y cómo resolverlo, con un icono y un texto que no dependen solo del color.

---

### User Story 3 - Una portada y unos momentos clave con carácter (Priority: P2)

La pantalla de inicio presenta el juego con un titular a escala de cartel y una llamada a la acción clara. Los momentos culminantes —inicio del draft, resultado del partido, campeón y eliminación— usan la tipografía de cartel para que se sientan como un acontecimiento.

**Why this priority**: da personalidad y memorabilidad; depende de la base de US1, pero no bloquea el uso del juego.

**Independent Test**: abrir el inicio sin sesión y con sesión, terminar un partido y un torneo, y comprobar el tratamiento de cartel en cada uno.

**Acceptance Scenarios**:

1. **Given** una persona sin sesión, **When** abre el inicio, **Then** ve el nombre del juego en tipografía de cartel, una frase que explica en qué consiste y el botón para empezar, sin desplazarse en una pantalla de 1366 × 768.
2. **Given** un partido terminado, **When** se muestra su resultado, **Then** el marcador aparece en tipografía de cartel con los nombres de los equipos.
3. **Given** el final de un torneo, **When** se muestra la pantalla del campeón o de la derrota (003/FR-041), **Then** el titular ocupa el protagonismo de la pantalla con tipografía de cartel.

---

### User Story 4 - Cómoda en el móvil y accesible para todos (Priority: P2)

El juego se usa con la misma comodidad en un móvil, una tableta o un portátil, con teclado o con pantalla táctil, y respeta las preferencias de accesibilidad del dispositivo.

**Why this priority**: un diseño profesional se mide también por su suelo de calidad; afecta a todas las personas, pero se apoya en la base de US1.

**Independent Test**: recorrer el inventario a 360 × 640, 768 × 1024 y 1366 × 768; navegar el flujo principal solo con teclado; activar movimiento reducido.

**Acceptance Scenarios**:

1. **Given** una ventana de 360 px de ancho, **When** se abre cualquier pantalla, **Then** no hay desplazamiento horizontal y todo el texto se lee sin ampliar.
2. **Given** navegación con teclado, **When** el foco recorre la pantalla, **Then** cada control enfocado muestra un indicador claramente visible.
3. **Given** la preferencia de movimiento reducido, **When** se usa la aplicación, **Then** las transiciones decorativas se sustituyen por cambios inmediatos o fundidos breves.

---

### User Story 5 - Tablero de juego legible: draft, formación, partido y torneo (Priority: P2)

Las pantallas de juego más densas (draft, plantillas, formación, partido rápido, partido 2D, torneo) organizan la información con jerarquía clara: lo que hay que decidir en primer plano, el contexto en segundo, y los datos en tablas y marcadores fáciles de escanear.

**Why this priority**: son las pantallas donde se pasa más tiempo; una buena jerarquía reduce errores y tiempo de decisión.

**Independent Test**: completar un draft, preparar la alineación, jugar un partido en cada modalidad y consultar la clasificación, comprobando la jerarquía descrita en FR-018 a FR-023.

**Acceptance Scenarios**:

1. **Given** el draft en curso, **When** el participante elige carta, **Then** las cartas disponibles son lo más destacado, y el temporizador, el sobre y la plantilla acumulada se ven sin competir con ellas.
2. **Given** la clasificación del torneo, **When** se consulta, **Then** la fila del participante se distingue del resto y las columnas numéricas están alineadas para compararse de un vistazo.
3. **Given** el partido 2D, **When** se reproduce, **Then** los controles y el marcador están integrados en el estilo oscuro sin tapar el campo.

---

### Edge Cases

- **Nombres largos**: nombres de equipo, de jugador o de partida muy largos no rompen paneles, marcadores ni tablas; se recortan con puntos suspensivos. El texto completo aparece en una etiqueta emergente al señalarlo con el ratón, al enfocarlo con el teclado o al mantenerlo pulsado en pantallas táctiles. Mantener pulsado un nombre dentro de una carta o de un elemento que se puede elegir NO DEBE contar como elección ni abrir el menú del navegador.
- **Equipaciones oscuras**: una equipación negra o muy oscura sigue distinguiéndose sobre el lienzo oscuro (en chapas, marcadores y camisetas) gracias a un contorno.
- **Fuentes que no cargan**: si la tipografía propia no se descarga, el texto se muestra con una tipografía del sistema de proporciones parecidas, sin texto invisible ni saltos bruscos de maquetación.
- **Zoom al 200 %**: con la ampliación del navegador al 200 %, el contenido sigue siendo usable sin desplazamiento horizontal en un portátil.
- **Varios avisos a la vez**: si coinciden avisos de partido, de dorsales y errores, se apilan sin taparse entre sí ni tapar el botón principal.
- **Carga lenta**: mientras se espera una respuesta, las zonas que se van a rellenar muestran un estado de carga con la forma del contenido, no una pantalla en blanco.
- **Pantalla de pruebas de cartas**: la pantalla interna de pruebas no forma parte del inventario y puede conservar un estilo básico, siempre que siga funcionando.

## Requirements *(mandatory)*

### Functional Requirements

#### Fundamentos visuales (US1)

- **FR-001**: La aplicación DEBE usar un único tema oscuro basado en la guía: lienzo casi negro como fondo de página, un panel un escalón más claro para tarjetas, diálogos y paneles, y bordes discretos entre ambos. El tema DEBE aplicarse con independencia de la preferencia de color del dispositivo.
- **FR-002**: El color lima de la guía DEBE reservarse a: el relleno del botón principal, el contorno y el texto de como máximo un botón secundario por pantalla, y solo cuando es la alternativa directa al principal (p. ej. "Ver en 2D" frente a "Simular"; el resto de secundarios usan contorno gris y texto blanco), el elemento de navegación activo, las casillas y opciones marcadas, y el indicador de foco. NO DEBE usarse en titulares, texto corriente, fondos grandes ni decoración.
- **FR-003**: Fuera del lima, NO DEBEN introducirse colores decorativos. Se exceptúan, por ser información del juego y no decoración: los colores de nivel de las cartas (Superclase, Épico, Legendario y GOAT), los colores de las equipaciones, el césped y las líneas del campo 2D, un único color de error reservado a los mensajes de error, y el ámbar alerta (#ffd000) reservado a las advertencias que requieren atención del participante (p. ej. dorsales repetidos o avisos de partido que piden una decisión). El color de error y el ámbar siempre se acompañan de icono y texto. Los avisos informativos y las confirmaciones de éxito (FR-027) son neutros: superficie de panel, texto blanco e icono por tipo, sin lima ni ámbar.
- **FR-004**: Los colores de nivel de las cartas DEBEN recalibrarse para el fondo oscuro y mantener un contraste mínimo de 4,5:1 cuando se usan como texto, y ninguno DEBE confundirse con el lima de acción ni con el ámbar de advertencia (FR-003).
- **FR-005**: La tipografía DEBE tener dos papeles: una tipografía condensada a escala de cartel para titulares grandes, marcadores y cifras destacadas, y una tipografía sin remates legible para el resto del texto. La escala DEBE seguir la de la guía (cuerpo, subtítulo, título pequeño, título grande y cartel), con interlineado comprimido (0,85–1,0) en los titulares de cartel y de 1,5 en el texto corriente.
- **FR-006**: Los tamaños de cartel DEBEN adaptarse al ancho de la pantalla, de forma que un titular de cartel nunca provoque desplazamiento horizontal ni se parta en más de tres líneas a 360 px.
- **FR-007**: Todos los contenedores de interfaz (botones, paneles, diálogos, campos, imágenes y la barra de navegación) DEBEN tener esquinas de 6 px. Las cartas de jugador conservan su forma propia (003/FR-008), integrada visualmente en el panel que las contiene.
- **FR-008**: Las superficies DEBEN ser planas: sin degradados ni sombras, salvo la sombra sutil de la barra de navegación descrita en la guía. Los efectos de las cartas por nivel (002/FR-002) y de la apertura de sobres (003/FR-011 a FR-015) se mantienen, por ser parte del objeto de juego.
- **FR-009**: El espaciado DEBE seguir la escala de la guía (múltiplos de 4 px), con un relleno de 20–24 px en los paneles, una separación de 16–20 px entre elementos y de 48–64 px entre secciones en pantallas anchas (proporcionalmente menor en móvil).
- **FR-010**: Las líneas de texto corrido NO DEBEN superar unos 80 caracteres de ancho.

#### Componentes comunes (US1, US2)

- **FR-011**: DEBE existir un conjunto único de componentes visuales compartido por todas las pantallas, con un aspecto definido para cada uno de sus estados (normal, señalado, pulsado, enfocado, desactivado y, cuando aplique, cargando o con error): botón principal, botón secundario contorneado, botón de texto, campo de texto, selector, casilla y opción, pestañas o selector segmentado, panel, diálogo, aviso emergente, tabla, insignia y barra de navegación.
- **FR-012**: El botón principal DEBE tener relleno lima con texto negro, y cumplir 003/FR-007 (siempre visible a partir de 360 × 640, el control más destacado, desactivado con motivo). Su alto mínimo de 48 px se mantiene. Desactivado, DEBE perder el lima y mostrarse apagado.
- **FR-012a**: La barra de navegación principal DEBE adoptar el estilo de la guía: lienzo oscuro, logotipo o nombre del juego a la izquierda, enlaces en blanco, el destino activo marcado con lima, y en móvil una barra superior de una sola línea con el nombre del juego y un botón "Menú" que despliega los enlaces en un panel a pantalla completa o lateral. El panel DEBE poder abrirse y cerrarse con teclado (también con Escape), devolver el foco al botón "Menú" al cerrarse y no tapar de forma permanente el botón principal de 003/FR-007.

#### Inventario de pantallas (US1, US3, US5)

- **FR-013**: El nuevo estilo DEBE aplicarse a todas las pantallas y elementos siguientes: Inicio (con y sin sesión), Mis partidas, Mi perfil, Nueva partida, Sala, Draft (incluida la apertura de sobres y "Draft terminado"), Plantillas, Formación (con táctica, dorsales, equipación y lanzadores), Partido (preparación, simulación rápida, simulación 2D, descanso y gestión del equipo), Resultado del partido, Reproducción de un partido, Torneo (jornadas, clasificación, cuadro y pendientes de ver), Pantalla de campeón, Pantalla de derrota, barra de navegación, bandeja de avisos, avisos de partido y de dorsales, y ficha de jugador.
- **FR-014**: El inicio sin sesión DEBE abrir con el nombre del juego en tipografía de cartel, una frase de una línea que explique el juego en lenguaje llano, y el botón principal para empezar; todo visible sin desplazarse a 1366 × 768 y a 360 × 640.
- **FR-015**: El inicio con sesión DEBE poner en primer plano la acción más probable: continuar la partida en curso más reciente si existe, o crear una partida nueva si no.
- **FR-016**: Los marcadores de resultado (partido rápido, 2D, resultado y reproducción) DEBEN mostrar los goles en tipografía de cartel y los nombres de los equipos con su color de equipación.
- **FR-017**: Las pantallas de campeón y de derrota DEBEN usar un titular de cartel como elemento protagonista; ese es su único momento de animación no provocada por el participante, y DEBE respetar el movimiento reducido.

#### Jerarquía de las pantallas de juego (US5)

- **FR-018**: En el draft, las cartas disponibles DEBEN ser el elemento dominante; el sobre actual, la dirección de paso, el temporizador y la plantilla acumulada DEBEN agruparse como contexto secundario y seguir visibles sin desplazarse en un portátil.
- **FR-019**: En Plantillas y en Formación, el campo y las cartas DEBEN integrarse en el tema oscuro (campo con su césped, panel lateral oscuro), sin cambiar la interacción definida en 003 (FR-001 a FR-005).
- **FR-020**: En el partido 2D, el marcador, el reloj y los controles de velocidad DEBEN presentarse como una franja compacta del estilo de la guía que no tape el campo, y los botones de 003/FR-006 y FR-027 DEBEN seguir sus reglas.
- **FR-021**: Las tablas (clasificación, estadísticas, goleadores) DEBEN alinear las cifras a la derecha con dígitos de ancho fijo, destacar la fila del participante y permitir leer cada fila completa a 360 px (con desplazamiento horizontal propio de la tabla si es imprescindible, nunca de la página).
- **FR-022**: Las listas de eventos del partido (resumen, "Lo más destacado", "Lo que ha pasado") DEBEN mostrar el minuto alineado y un icono por tipo de evento (gol, tarjeta, cambio, lesión), de modo que se escaneen sin leer cada línea.
- **FR-023**: La información de estado (fase del torneo, jornada, partidos pendientes de ver, conexión) DEBE mostrarse con insignias discretas en blanco y grises, no con colores.

#### Estados y retroalimentación (US2)

- **FR-024**: Cada pantalla que carga datos DEBE mostrar un estado de carga con la forma del contenido esperado.
- **FR-025**: Cada lista que puede estar vacía DEBE tener un estado vacío que explique la situación y ofrezca la acción para salir de ella.
- **FR-026**: Los mensajes de error DEBEN decir qué ha pasado y cómo resolverlo, en el tono de la interfaz, sin disculpas ni mensajes genéricos, y mostrarse junto al elemento que los causa cuando se trate de un formulario.
- **FR-027**: Las confirmaciones de acciones (guardar, confirmar alineación, unirse a una partida) DEBEN dar una respuesta visible inmediata que nombre la acción realizada con el mismo verbo del botón.
- **FR-028**: Las transiciones provocadas por el participante (abrir un diálogo, desplegar un panel, cambiar de pestaña) PUEDEN animarse brevemente para mostrar qué ha cambiado; NO DEBEN añadirse animaciones de entrada en cada sección ni efectos de señalado en cada tarjeta.

#### Accesibilidad y adaptación (US4)

- **FR-029**: Todo el texto DEBE cumplir un contraste mínimo de 4,5:1 (3:1 para texto grande y para los bordes de controles) sobre su fondo.
- **FR-030**: Todo control interactivo DEBE mostrar un indicador de foco visible con teclado, con contraste mínimo de 3:1, y ningún control DEBE ser inalcanzable con teclado.
- **FR-031**: Ninguna pantalla del inventario DEBE provocar desplazamiento horizontal de la página entre 360 px y 1920 px de ancho, ni con ampliación del 200 % en un portátil.
- **FR-032**: Los objetivos táctiles DEBEN medir al menos 44 × 44 px en pantallas táctiles.
- **FR-033**: Con la preferencia de movimiento reducido, todas las animaciones no esenciales DEBEN sustituirse por cambios inmediatos o fundidos breves (se mantiene 003/FR-015).
- **FR-034**: Las equipaciones muy oscuras o muy parecidas al fondo DEBEN mostrarse con un contorno claro en chapas, camisetas y marcadores para distinguirse del lienzo.

#### Textos de la interfaz (US2)

- **FR-035**: Los textos DEBEN revisarse para que usen frases en minúscula inicial salvo nombres propios (no mayúsculas sostenidas en etiquetas ni botones), verbos concretos en los botones ("Confirmar alineación", no "Enviar") y el mismo nombre para una acción a lo largo de todo el flujo.
- **FR-036**: NO DEBEN añadirse etiquetas decorativas sobre los títulos ni numeraciones que no correspondan a una secuencia real.

#### Mantenimiento y no regresión

- **FR-037**: Los valores visuales (colores, tipografías, escala de texto, espaciado, esquinas y sombras) DEBEN definirse en un único lugar y reutilizarse en todas las pantallas, de modo que cambiar un valor de la guía se refleje en toda la aplicación.
- **FR-038**: El cambio visual NO DEBE alterar el comportamiento: todos los flujos existentes (crear partida, sala, draft, plantillas, formación, partido en las dos modalidades, torneo, campeón, derrota, perfil) DEBEN funcionar igual que en la versión actual.
- **FR-039**: Las tipografías usadas DEBEN tener una licencia que permita incluirlas en el juego y servirlas desde la propia aplicación.
- **FR-040**: Las pruebas automáticas de extremo a extremo que se ejecutan en la integración continua DEBEN comprobar en cada pantalla del inventario (FR-013): el contraste y las reglas básicas de accesibilidad (FR-029, FR-030), la ausencia de desplazamiento horizontal de la página a 360, 768, 1366 y 1920 px (FR-031) y que el flujo de SC-007 se completa con teclado. No se exige comparación automática de capturas. Lo que no se puede comprobar automáticamente (jerarquía, uso del lima, textos) se verifica con la lista de verificación visual manual (SC-001).

#### Revisión 2026-10-21: identidad, atmósfera y draft sin desplazamiento

Estos requisitos **sustituyen** a FR-008, a la frase de FR-002 "NO DEBE usarse en … fondos grandes ni decoración" en lo que se refiere a la luz ambiental, a la limitación de FR-028 y a la suposición "Sin fotografía". Lo demás sigue vigente.

- **FR-041 (atmósfera)**: el lienzo DEBE dejar de ser un color plano y representar un estadio de noche: base verde noche profunda, luz de focos desde lo alto, líneas de cal del campo y una textura de grano fina. La atmósfera es decorativa (`aria-hidden`), fija detrás del contenido y no reduce los contrastes de FR-029.
- **FR-042 (superficies con profundidad)**: paneles, diálogos y barras DEBEN tener profundidad: superficie translúcida con desenfoque del fondo, borde con brillo superior y sombra de elevación. Las esquinas pasan a una escala (6 px en controles, 12 px en paneles, 20 px en las piezas protagonistas), definida en los tokens.
- **FR-043 (efectos de juego)**: las cartas DEBEN tener acabados por nivel de aspecto premium (plata, violeta, oro y holográfico oscuro), con brillo que sigue al puntero y relieve al señalar una carta elegible; los marcadores DEBEN parecer un marcador de retransmisión; el campo, césped segado con viñeta y líneas de cal.
- **FR-044 (imágenes propias)**: el juego DEBE tener logotipo (escudo + nombre) en la barra y como icono de la pestaña, y DEBE usar ilustraciones propias en SVG: sobre de cartas, trofeo, estadio y campo. Ninguna depende de licencias de terceros.
- **FR-045 (momentos)**: la portada DEBE abrir con una composición de impacto (sobre abierto con cartas reales en abanico bajo los focos); el draft, la apertura de sobres, el resultado y las pantallas finales DEBEN tener cada uno un único momento animado orquestado. Con movimiento reducido, todos se sustituyen por fundidos.
- **FR-046 (draft sin desplazamiento)**: a 1366 × 768 y mayores, las 8 cartas del sobre, el reloj, la dirección de paso, la mesa, la plantilla acumulada y el botón «Confirmar elección» DEBEN verse a la vez sin desplazamiento vertical; las cartas se escalan para ocupar el alto disponible. En móvil, las cartas se recorren con un carrusel horizontal (deslizar), sin desplazar la página para elegir.
- **FR-047 (lima como luz de acción)**: el lima sigue siendo el único relleno de acción, y además PUEDE emitir luz (resplandor) alrededor del botón principal y de la carta elegida. No se usa como color de fondo decorativo.
- **FR-048 (goleadores en el marcador)**: el marcador de cartel (resultado, partido rápido y resumen de una reproducción) DEBE mostrar en letra pequeña, bajo el nombre de cada equipo, sus goleadores con el minuto de cada gol («Pérez 12', 67' (pen.)»); los goles en propia puerta cuentan para el equipo que los recibe a favor y llevan «(p. p.)»; la tanda de penaltis no cuenta.
- **FR-049 (2D sin desplazamiento)**: desde 720 px de ancho, en el partido 2D en directo y en su reproducción, la franja del marcador, el campo entero y la barra principal DEBEN verse a la vez sin desplazar la página ni ampliar; el campo toma el mayor tamaño que cabe conservando su proporción y los eventos van en un carril lateral con su propio desplazamiento. En móvil, la franja y el campo se ven al entrar y los eventos van debajo.
- **FR-050 (textura del césped)**: los campos de fútbol (el del partido 2D y el de Plantillas y Formación) DEBEN tener textura de césped (grano, briznas y franjas de corte con luz y viñeta), sin restar contraste a las líneas, las chapas ni las fichas.
- **FR-051 (portada sin desplazamiento)**: desde 900 px de ancho y 720 px de alto, la portada sin sesión DEBE mostrar a la vez el titular, la entradilla, las acciones y los tres pasos del juego («Abre sobres», «Elige por turnos», «Gana el torneo») sin desplazar la página; el titular y la escena se escalan con el alto de la ventana y el hueco bajo la barra de navegación no pasa de 24 px.
- **FR-052 (resultado en dos columnas)**: desde 1024 px de ancho, la pantalla de resultado DEBE colocar «Resumen del partido» a la izquierda y «Estadísticas» a la derecha, bajo el marcador; en pantallas más estrechas van una debajo de otra. Lo mismo en los descansos y pausas del partido rápido («Lo más destacado» y «Estadísticas») y en el resumen de un partido de una versión anterior (ronda 6).
- **FR-053 (goleadores en la franja del 2D)**: la franja del marcador del partido 2D, en directo y en su reproducción, DEBE mostrar en letra pequeña los goleadores de cada equipo con el minuto, con las mismas reglas que FR-048 y solo con los goles ya vistos; sin romper FR-049.
- **FR-054 (goles resaltados)**: en la lista de eventos («Lo que ha pasado» del 2D y el resumen del resultado), los goles DEBEN destacar sobre el resto (fondo y borde con la luz del oro y el texto en negrita), sin usar el lima.
- **FR-055 (campeón visible)**: en la pantalla del campeón, el mensaje con el nombre del campeón DEBE ir en la parte superior, sin que lo tape la barra del botón «Volver al menú», a 1366 × 768 y a 390 × 844.
- **FR-056 (elegir carta en el draft)**: la carta del sobre DEBE elegirse al pulsar en cualquier punto de ella salvo los botones de los specials y el de la ficha (también el hueco del pie sin specials); el doble clic en una carta la elige y confirma la elección sin pasar por «Confirmar elección». Una sola elección por turno: un segundo envío mientras el primero está en curso se ignora.
- **FR-057 (dorsales alineados)**: en «Dorsales», cada jugador DEBE ocupar una celda con columnas fijas (dorsal actual, nombre recortado con puntos suspensivos y campo), de modo que los campos queden alineados en vertical y en horizontal. Bajo cada campo, dos botones pequeños con iconos, «Aceptar» y «Descartar», que solo se ven con un número escrito y ocupan su sitio siempre (la celda no cambia de alto); Intro acepta y Escape descarta. Se mantiene el aviso cuando el número lo lleva otro jugador.
- **FR-058 (tablas de goleadores y asistentes)**: las tablas de máximos goleadores y asistentes DEBEN mostrar sus filas debajo de los encabezados, como el resto de tablas. La lista de goleadores del marcador (FR-048, FR-053) usa su propia clase, `.lista-goleadores`.
- **FR-059 (sobre con forma de carta)**: el sobre ilustrado DEBE tener la proporción de las cartas completas tal como se ven (≈ 5 : 9, `--proporcion-sobre`) en todos los lugares donde aparece (portada, nueva partida, sala, apertura y fin del draft); donde convive con cartas (portada y apertura), también su mismo ancho.
- **FR-060 (media del once)**: en Formación, sobre el campo, DEBE mostrarse la media del equipo con diez estrellas que se rellenan de forma gradual (una por cada 10 puntos: 70 → 7 llenas; 88 → 8 llenas y la novena al 80 %) y, a su derecha y más grande, la cifra redondeada dentro de un marco de estrella. Es la media efectiva de los titulares colocados, con la penalización por jugar fuera de su posición (la misma que muestra cada ficha), y se recalcula al cambiar el once. Para el lector de pantalla, «Media del equipo: N de 100».

### Requisitos de specs anteriores afectados

- **003/FR-007**: el color del botón principal pasa del naranja actual al lima de la guía (FR-012). El resto de FR-007 se mantiene.
- **001 y 002 (modo claro)**: la aplicación deja de seguir la preferencia clara u oscura del dispositivo y usa siempre el tema oscuro (FR-001).
- **002/FR-002 y 003/FR-008**: los acabados por nivel de las cartas se mantienen, con sus colores recalibrados para el fondo oscuro (FR-004).

### Key Entities *(include if feature involves data)*

- **Guía de estilos adaptada**: conjunto de valores visuales del juego (paleta con sus papeles, tipografías y escala, espaciado, esquinas, superficies y sombra) derivado de `docs/diseno/DESIGN.md` con las adaptaciones de esta spec. Es la fuente única de FR-037.
- **Componente visual**: cada pieza reutilizable de FR-011, con sus estados.
- **Inventario de pantallas**: la lista de FR-013, usada para verificar la cobertura del nuevo estilo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100 % de las pantallas y elementos del inventario (FR-013) superan la lista de verificación visual de la spec (paleta, tipografía, paneles, botones, esquinas, superficies planas y estados).
- **SC-002**: En el 100 % de las pantallas del flujo de juego, el único elemento relleno de lima es el botón principal (con la excepción de 003/FR-006a).
- **SC-003**: Al menos 9 de cada 10 personas que no conocen el juego señalan correctamente, en menos de 5 segundos, el botón que les hace avanzar en cada pantalla del flujo principal.
- **SC-004**: En una valoración con al menos 5 personas, la media de "la aplicación se ve profesional y moderna" es de 4 o más sobre 5, y es al menos 1 punto superior a la de la versión actual valorada por las mismas personas.
- **SC-005**: El 100 % del texto y de los controles del inventario cumplen los contrastes de FR-029 al comprobarlos con un verificador de contraste.
- **SC-006**: Ninguna pantalla del inventario muestra desplazamiento horizontal de la página a 360, 768, 1366 y 1920 px de ancho.
- **SC-007**: El flujo completo (crear partida → draft → formación → partido → torneo) se puede completar solo con teclado, con el foco visible en todo momento.
- **SC-008**: Todos los flujos existentes se completan igual que en la versión actual, sin ningún cambio de comportamiento (FR-038), comprobado repitiendo las pruebas de extremo a extremo y la validación con personas de la spec 003.
- **SC-009**: El texto de cualquier pantalla es legible desde el primer momento de la carga, sin periodos de texto invisible, y la maquetación no salta de forma apreciable al terminar de cargar las tipografías.
- **SC-010**: Las personas tardan lo mismo o menos que con la versión actual en completar una elección del draft y en confirmar una alineación.

## Assumptions

- **Solo tema oscuro**: la guía define un único tema oscuro y su identidad depende de él; se elimina el modo claro en lugar de mantener dos temas.
- **Imágenes propias** (revisión 2026-10-21, sustituye a "Sin fotografía"): el juego no dispone de fotografías con licencia, así que el ambiente de la guía se recrea con ilustraciones vectoriales y texturas propias (estadio, focos, campo, sobre, trofeo, escudo) en SVG y CSS (FR-044).
- **Tipografía**: la tipografía de la guía (Roobert) es comercial. Se usa una alternativa libre con el mismo carácter: la familia condensada que ya incluye el juego para las cartas (Barlow Condensed) para los titulares de cartel y las cifras, y una sans geométrica libre de proporciones parecidas a las de la guía para el texto corriente. La elección concreta se cierra en el plan.
- **Adaptación de la guía**: los componentes propios del sitio de origen (aviso de cookies, botón "Sign in", logotipo) no se trasladan; se toman sus reglas (colores, escala, esquinas, superficies) y se aplican a los componentes del juego.
- **Excepciones de color**: los colores de nivel, las equipaciones, el campo 2D, el color de error y el ámbar de advertencia son información de juego o de estado y no rompen la regla de "un único acento" de la guía (FR-003).
- **Cartas y sobres**: el diseño de las cartas de 003 y las animaciones de apertura de sobres se conservan; esta spec solo los integra en el tema oscuro y recalibra sus colores.
- **Alcance**: no se añaden pantallas, funciones ni reglas nuevas; las reorganizaciones de cada pantalla se limitan a la jerarquía visual, la agrupación de la información y los textos.
- **Navegadores**: las versiones actuales de los navegadores de escritorio y móvil más usados, como en las specs anteriores.
- **Skill de diseño**: el plan y la implementación siguen la skill `frontend-design` del proyecto (plan de diseño revisado contra el encargo antes de construir, una sola apuesta visual memorable, suelo de calidad accesible y revisión con capturas).
