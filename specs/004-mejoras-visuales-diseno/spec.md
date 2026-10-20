# Feature Specification: Mejoras visuales y de diseño (GUI + UX)

**Feature Branch**: `004-mejoras-visuales-diseno`

**Created**: 2026-10-20

**Status**: Draft

**Input**: User description: "Spec 4 — Mejoras visuales y de diseño (GUI + UX): realizar mejoras de diseño y estilos para que la página quede de manera profesional, atractiva y moderna, con el criterio más adecuado para que la experiencia de usuario sea óptima. Seguir la guía de estilos DESIGN.md (moverla a otro directorio si conviene). Usar la skill frontend-design."

**Relación con las specs anteriores**: esta especificación cambia la presentación de las pantallas definidas en [specs/001-draft-manager-mvp/spec.md](../001-draft-manager-mvp/spec.md), [specs/002-mejoras-mvp/spec.md](../002-mejoras-mvp/spec.md) y [specs/003-mejoras-ux-simulacion/spec.md](../003-mejoras-ux-simulacion/spec.md). Las referencias del tipo "003/FR-007" apuntan a requisitos de esas specs. **No cambia ninguna regla del juego, del draft ni del motor de simulación**: solo el aspecto, la organización visual de cada pantalla y la claridad de la interacción. Cuando un requisito de esta spec contradice uno anterior, prevalece el de esta spec (ver "Requisitos de specs anteriores afectados").

**Guía de estilos**: la referencia visual es [docs/diseno/DESIGN.md](../../docs/diseno/DESIGN.md) (se ha movido desde la raíz del repositorio a `docs/diseno/`, junto al resto de la documentación transversal). La guía describe el estilo de un sitio de terceros: esta spec la adopta como **dirección visual** (lienzo casi negro, un único acento lima reservado a las acciones, titulares condensados a escala de cartel, esquinas de 6 px, superficies planas) y la adapta al juego en los puntos que se recogen en FR-001 a FR-012 y en Assumptions.

**Versión de referencia**: cuando un criterio compara con "la versión actual", se refiere al commit `4168404` de `main`, el último antes de esta spec.

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

1. **Given** una pantalla del flujo de juego, **When** el participante la mira, **Then** el único elemento relleno de lima es el botón principal (salvo la excepción de 003/FR-006a) y los secundarios son contorneados o de texto.
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

- **Nombres largos**: nombres de equipo, de jugador o de partida muy largos no rompen paneles, marcadores ni tablas; se recortan con puntos suspensivos y se ven completos al señalarlos.
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
- **FR-002**: El color lima de la guía DEBE reservarse a: el relleno del botón principal, el contorno y el texto de los botones de acción secundarios destacados, el elemento de navegación activo, las casillas y opciones marcadas, y el indicador de foco. NO DEBE usarse en titulares, texto corriente, fondos grandes ni decoración.
- **FR-003**: Fuera del lima, NO DEBEN introducirse colores decorativos. Se exceptúan, por ser información del juego y no decoración: los colores de nivel de las cartas (Superclase, Épico, Legendario y GOAT), los colores de las equipaciones, el césped y las líneas del campo 2D, y un único color de error reservado a los mensajes de error, que siempre se acompaña de icono y texto.
- **FR-004**: Los colores de nivel de las cartas DEBEN recalibrarse para el fondo oscuro y mantener un contraste mínimo de 4,5:1 cuando se usan como texto.
- **FR-005**: La tipografía DEBE tener dos papeles: una tipografía condensada a escala de cartel para titulares grandes, marcadores y cifras destacadas, y una tipografía sin remates legible para el resto del texto. La escala DEBE seguir la de la guía (cuerpo, subtítulo, título pequeño, título grande y cartel), con interlineado comprimido (0,85–1,0) en los titulares de cartel y de 1,5 en el texto corriente.
- **FR-006**: Los tamaños de cartel DEBEN adaptarse al ancho de la pantalla, de forma que un titular de cartel nunca provoque desplazamiento horizontal ni se parta en más de tres líneas a 360 px.
- **FR-007**: Todos los contenedores de interfaz (botones, paneles, diálogos, campos, imágenes y la barra de navegación) DEBEN tener esquinas de 6 px. Las cartas de jugador conservan su forma propia (003/FR-008), integrada visualmente en el panel que las contiene.
- **FR-008**: Las superficies DEBEN ser planas: sin degradados ni sombras, salvo la sombra sutil de la barra de navegación descrita en la guía. Los efectos de las cartas por nivel (002/FR-002) y de la apertura de sobres (003/FR-011 a FR-015) se mantienen, por ser parte del objeto de juego.
- **FR-009**: El espaciado DEBE seguir la escala de la guía (múltiplos de 4 px), con un relleno de 20–24 px en los paneles, una separación de 16–20 px entre elementos y de 48–64 px entre secciones en pantallas anchas (proporcionalmente menor en móvil).
- **FR-010**: Las líneas de texto corrido NO DEBEN superar unos 80 caracteres de ancho.

#### Componentes comunes (US1, US2)

- **FR-011**: DEBE existir un conjunto único de componentes visuales compartido por todas las pantallas, con un aspecto definido para cada uno de sus estados (normal, señalado, pulsado, enfocado, desactivado y, cuando aplique, cargando o con error): botón principal, botón secundario contorneado, botón de texto, campo de texto, selector, casilla y opción, pestañas o selector segmentado, panel, diálogo, aviso emergente, tabla, insignia y barra de navegación.
- **FR-012**: El botón principal DEBE tener relleno lima con texto negro, y cumplir 003/FR-007 (siempre visible a partir de 360 × 640, el control más destacado, desactivado con motivo). Su alto mínimo de 48 px se mantiene. Desactivado, DEBE perder el lima y mostrarse apagado.
- **FR-012a**: La barra de navegación principal DEBE adoptar el estilo de la guía: lienzo oscuro, logotipo o nombre del juego a la izquierda, enlaces en blanco, el destino activo marcado con lima, y en móvil un menú compacto que no ocupe más de una línea de alto.

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
- **Sin fotografía**: la guía apoya su ambiente en fotografía a sangre, pero el juego no dispone de fotografías con licencia. El ambiente lo aportan la tipografía de cartel, las cartas, el campo y las equipaciones; no se añaden fotografías ni ilustraciones decorativas.
- **Tipografía**: la tipografía de la guía (Roobert) es comercial. Se usa una alternativa libre con el mismo carácter: la familia condensada que ya incluye el juego para las cartas (Barlow Condensed) para los titulares de cartel y las cifras, y una sans geométrica libre de proporciones parecidas a las de la guía para el texto corriente. La elección concreta se cierra en el plan.
- **Adaptación de la guía**: los componentes propios del sitio de origen (aviso de cookies, botón "Sign in", logotipo) no se trasladan; se toman sus reglas (colores, escala, esquinas, superficies) y se aplican a los componentes del juego.
- **Excepciones de color**: los colores de nivel, las equipaciones, el campo 2D y el color de error son información de juego o de estado y no rompen la regla de "un único acento" de la guía (FR-003).
- **Cartas y sobres**: el diseño de las cartas de 003 y las animaciones de apertura de sobres se conservan; esta spec solo los integra en el tema oscuro y recalibra sus colores.
- **Alcance**: no se añaden pantallas, funciones ni reglas nuevas; las reorganizaciones de cada pantalla se limitan a la jerarquía visual, la agrupación de la información y los textos.
- **Navegadores**: las versiones actuales de los navegadores de escritorio y móvil más usados, como en las specs anteriores.
- **Skill de diseño**: el plan y la implementación siguen la skill `frontend-design` del proyecto (plan de diseño revisado contra el encargo antes de construir, una sola apuesta visual memorable, suelo de calidad accesible y revisión con capturas).
