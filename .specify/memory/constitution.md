<!--
Sync Impact Report
- Version change: 1.0.2 → 1.0.3 (PATCH: se añade a "Decisiones resueltas" la referencia a
  `specs/002-mejoras-mvp/` para el ritmo de los torneos; ningún principio se añade, elimina ni redefine)
- Principios modificados: ninguno
- Secciones modificadas: "Decisiones resueltas" (torneos: los torneos son siempre asíncronos según la
  spec 002, FR-030)
- Secciones añadidas / eliminadas: ninguna
- Plantillas dependientes: no se modifican (leen la constitución en tiempo de ejecución)
- TODOs pendientes: ninguno
-->
# Fútboosterdraft Constitution

## Visión y propósito

Juego de fútbol manager online centrado en la construcción estratégica de equipos mediante un
*draft de sobres de cartas de jugadores*.

Cada participante construye su plantilla seleccionando jugadores de varios sobres, organiza su once
inicial, asigna posiciones y formación, define una táctica y compite en torneos contra otros
participantes o contra rivales controlados por la inteligencia artificial.

Los partidos se resuelven mediante un motor de simulación que tiene en cuenta las características
individuales de los jugadores, sus habilidades especiales, la alineación, las posiciones, la táctica
y las circunstancias del encuentro.

El juego ofrece dos formas de visualizar los partidos:

- **Simulación rápida:** presentación resumida de las acciones relevantes y del resultado.
- **Simulación 2D en tiempo real:** representación esquemática del partido, con jugadores y balón,
  inspirada en los juegos de fútbol de botones y con controles de velocidad.

Ambas modalidades utilizan el mismo motor de simulación y producen resultados coherentes bajo las
mismas condiciones.

## Core Principles

### I. La estrategia debe ser determinante

- El resultado de los partidos DEBE depender de la calidad de la plantilla, la selección de
  jugadores, sus posiciones, las habilidades especiales, la formación, la táctica y las decisiones
  del participante.
- La aleatoriedad PUEDE introducir variabilidad propia del fútbol, pero NO DEBE sustituir a la
  estrategia ni hacer irrelevantes las decisiones del usuario.
- Toda regla que influya en el resultado DEBE ser explícita, consistente y susceptible de prueba.

**Razón:** es un juego de gestión; si las decisiones no pesan, el juego pierde su sentido.

### II. El draft es el núcleo de la experiencia

El draft es la mecánica principal para construir las plantillas. Reglas iniciales confirmadas:

- Cada participante recibe tres sobres.
- Cada sobre contiene ocho cartas de jugadores.
- En cada turno, todos los participantes seleccionan un jugador de forma **simultánea**.
- Tras cada selección, las cartas restantes de cada sobre se pasan según la dirección de ese sobre:
  primer sobre hacia la **izquierda**, segundo hacia la **derecha**, tercero hacia la **izquierda**.
- El proceso continúa hasta agotar las cartas de los tres sobres.
- Al finalizar, cada participante DEBE tener exactamente 24 jugadores, que forman la plantilla
  disponible para preparar el equipo.

La implementación DEBE definir de forma inequívoca: la resolución de cada turno simultáneo, el
intercambio de sobres, la validación de selecciones y el tratamiento de desconexiones, retrasos o
selecciones no realizadas.

### III. Las reglas del dominio deben estar definidas explícitamente

Las entidades y reglas del juego DEBEN representarse mediante modelos de dominio claros y
coherentes que incluyan, como mínimo:

- Jugadores y sus atributos; demarcaciones y posiciones.
- Estadísticas, habilidades especiales y niveles o categorías de los jugadores.
- Plantillas, alineaciones, formaciones y tácticas.
- Reglas de elegibilidad para ocupar una posición.
- Partidos, acciones y resultados.
- Sobres, colecciones y cartas disponibles.
- Torneos, participantes y clasificaciones.

Las reglas del dominio NO DEBEN quedar dispersas arbitrariamente entre la interfaz, la lógica de
negocio y el motor de simulación. Los valores, fórmulas, excepciones y restricciones concretas se
especifican en los documentos funcionales correspondientes y DEBEN poder probarse de forma
independiente.

### IV. La simulación debe ser coherente, verificable y equilibrada

El motor DEBE combinar las características de los jugadores con las decisiones tácticas y el
contexto del partido para determinar acciones y resultado. Su diseño DEBE contemplar, entre otros:

- Estadísticas individuales según la posición y compatibilidad jugador-posición.
- Habilidades especiales e interacciones entre jugadores.
- Formaciones, distribución en el campo y sistemas defensivos y ofensivos.
- Desarrollo temporal del encuentro.
- Sustituciones y cambios tácticos cuando estén permitidos.
- Aleatoriedad controlada y reglas para resolver situaciones equivalentes.

La lógica de simulación DEBE estar separada de su representación visual y DEBE poder probarse sin
depender de la interfaz gráfica. Con las mismas condiciones iniciales y las mismas decisiones, las
dos modalidades DEBEN reflejar el mismo desarrollo subyacente del partido.

### V. Un único motor, dos modalidades de visualización

- Existe **un único motor de simulación compartido**, responsable de calcular el desarrollo, las
  acciones y el resultado del partido. NO se implementan dos sistemas independientes de cálculo.
- Las modalidades de visualización son responsables únicamente de presentar esa información de
  maneras diferentes.
- La simulación rápida muestra resúmenes, eventos relevantes y el resultado final.
- La modalidad 2D representa espacial y temporalmente las acciones, permite observar su evolución y
  ajustar la velocidad de reproducción.
- Las diferencias entre modalidades se limitan a la presentación, el ritmo de reproducción y las
  interacciones expresamente permitidas.
- Si la modalidad 2D reproduce el encuentro a partir de eventos calculados previamente, DEBE
  conservar la coherencia temporal y espacial necesaria para representarlos.

### VI. La integridad multijugador es obligatoria

- Las reglas competitivas DEBEN aplicarse de forma consistente a todos los participantes.
- El servidor DEBE validar las operaciones relevantes del draft, la configuración de los equipos,
  la participación en torneos y la resolución de los partidos.
- Las decisiones que afecten al estado competitivo NO DEBEN depender exclusivamente de información
  o lógica ejecutada en el cliente.
- DEBEN contemplarse errores de comunicación, desconexiones, solicitudes duplicadas y cualquier
  otra situación que pueda comprometer la integridad de una partida.

### VII. Las colecciones y la monetización deben respetar las reglas comunes de draft

- El juego parte de una colección básica de jugadores. Los participantes PUEDEN ampliar el conjunto
  de jugadores disponibles con recursos obtenidos jugando o con colecciones adquiridas con dinero
  real; estas PUEDEN ampliar la variedad de jugadores, sus combinaciones y las posibilidades
  estratégicas de construcción de plantillas.
- Todos los participantes DEBEN competir bajo las **mismas reglas de draft**, con independencia de
  cómo hayan obtenido sus colecciones.
- Poseer una colección más amplia NO DEBE otorgar selecciones adicionales, alterar el número de
  cartas por sobre, cambiar el orden de circulación ni conceder ventajas ajenas a las reglas
  competitivas comunes.
- La disponibilidad de jugadores, la composición de los sobres y los mecanismos de selección DEBEN
  definirse de forma transparente y coherente con el equilibrio del juego.
- Toda decisión futura de monetización DEBE preservar la integridad competitiva y NO DEBE introducir
  ventajas que eludan las reglas comunes de draft.

### VIII. La arquitectura debe favorecer la modularidad

El sistema DEBE organizarse en componentes con responsabilidades delimitadas. Como mínimo se
distinguen conceptualmente:

- Gestión de jugadores y colecciones.
- Sistema de sobres y draft.
- Construcción de plantillas y alineaciones.
- Formaciones y tácticas.
- Motor de simulación.
- Presentación de la simulación rápida.
- Presentación de la simulación 2D.
- Gestión de torneos y clasificaciones.
- Gestión de usuarios y sesiones.
- Persistencia de datos y comunicación cliente-servidor.

La arquitectura DEBE permitir evolucionar las reglas del juego sin reescribir componentes no
relacionados. Las decisiones técnicas concretas se documentan en la fase de planificación.

### IX. La calidad debe demostrarse mediante pruebas

- **Verificable por una persona no técnica:** cada criterio de éxito de una especificación DEBE
  poder comprobarse usando la aplicación, sin leer código.
- Las funcionalidades relevantes DEBEN acompañarse de pruebas adecuadas a su impacto y complejidad.
- Se priorizan pruebas automatizadas para: reglas y límites del draft; selección simultánea y
  circulación de sobres; cálculo de plantillas y validación de posiciones; aplicación de
  estadísticas y habilidades especiales; resolución de acciones del partido; coherencia entre las
  dos modalidades de simulación; integridad de los resultados competitivos; y gestión de errores,
  desconexiones y operaciones duplicadas.
- Todo cambio en las reglas del dominio DEBE incluir la actualización de pruebas y documentación.

### X. El desarrollo será incremental y trazable

- El proyecto se desarrolla en incrementos funcionales verificables.
- Cada funcionalidad DEBE tener criterios de aceptación claros y trazabilidad entre requisitos,
  diseño, tareas de implementación y pruebas.
- Las especificaciones DEBEN distinguir entre reglas confirmadas, decisiones pendientes y detalles
  técnicos aún no definidos.
- Se prioriza una primera versión funcional que valide el ciclo central del juego (draft →
  alineación → partido) antes de ampliar su complejidad.

## Criterios de aceptación de alto nivel

1. Los participantes pueden completar un draft de tres sobres de ocho cartas, con selección
   simultánea y circulación izquierda, derecha e izquierda, respectivamente.
2. Cada participante obtiene 24 jugadores al completar el draft.
3. Se puede configurar un equipo con alineación, posiciones, formación y táctica conforme a las
   reglas del juego.
4. El motor calcula un partido utilizando las características de los jugadores y las decisiones
   tácticas.
5. El partido puede presentarse mediante simulación rápida y mediante visualización 2D.
6. Las dos modalidades utilizan el mismo motor y no mantienen lógicas independientes de cálculo.
7. Las colecciones obtenidas jugando o mediante pago amplían el conjunto de jugadores disponibles
   sin modificar las reglas comunes de draft.
8. Las operaciones competitivas relevantes se validan preservando la integridad multijugador.
9. Las reglas principales cuentan con pruebas que verifican su funcionamiento y detectan
   regresiones.
10. La arquitectura y la documentación permiten incorporar nuevas funcionalidades sin comprometer
    las reglas ya establecidas.

## Decisiones pendientes

Las decisiones que esta constitución dejó abiertas se concretan en las especificaciones funcionales y
técnicas, no en este documento. La constitución solo registra su estado y dónde están documentadas.
Esos documentos DEBEN respetar los principios anteriores.

### Decisiones resueltas

Resueltas para el MVP en `specs/001-draft-manager-mvp/`:

- **Participantes y NPC en el draft**: número de participantes por modo de juego y participación de
  los NPC en el draft, con sus niveles → `spec.md` (FR-006, FR-051 a FR-053, FR-057 a FR-060).
- **Turno simultáneo**: resolución, límites de tiempo, elección automática, duplicados,
  desconexiones y reconexiones → `spec.md` (FR-007 a FR-010, FR-062, Edge Cases) y
  `contracts/realtime-protocol.md`.
- **Jugadores y motor**: atributos, estadísticas, habilidades especiales y niveles → `spec.md`
  (FR-016 a FR-024, FR-037). Las fórmulas y magnitudes concretas del motor están en los parámetros de
  equilibrado versionados (`research.md` R7 y R8).
- **Posiciones, formaciones y tácticas**: elegibilidad posicional, formaciones, tácticas,
  dorsales y equipaciones → `spec.md` (FR-025 a FR-031b, Assumptions).
- **Torneos**: formato de torneos, clasificaciones, ritmo en directo o asíncrono, sanciones y
  lesiones → `spec.md` (FR-041 a FR-043, FR-051 a FR-056c). El ritmo lo actualiza
  `specs/002-mejoras-mvp/spec.md` (FR-030): los torneos son siempre asíncronos y, con un solo humano,
  sin plazos.
- **Sobres**: composición de los sobres, distribución de niveles y tamaño de la colección Core →
  `spec.md` (FR-011, FR-014, Assumptions).
- **Tecnología**: pila tecnológica, persistencia y protocolo cliente-servidor → `plan.md` y
  `research.md`.

### Decisiones aún pendientes

Lo siguiente NO está aprobado como requisito y DEBE concretarse en una especificación propia antes de
implementarse:

- Colecciones adicionales a "Core": mecanismos de obtención jugando, compra con dinero real y su
  efecto en la composición de los sobres. Siempre dentro de los límites del Principio VII.
- Modos de juego adicionales a liga, playoff y mixto.

## Governance

- Esta constitución establece los principios que DEBEN respetarse durante el diseño, la
  implementación y la evolución del proyecto, y prevalece sobre cualquier otra práctica.
  Especificaciones, planes técnicos, tareas y código DEBEN ser coherentes con ella; las revisiones
  DEBEN verificarlo.
- Las decisiones de implementación aún no definidas NO DEBEN tratarse como requisitos aprobados;
  DEBEN concretarse en las especificaciones funcionales o técnicas correspondientes (ver
  "Decisiones pendientes").
- Una propuesta que contradiga un principio DEBE revisarse o acompañarse de una modificación
  explícita de la constitución antes de adoptarse.
- Toda modificación DEBE documentar qué principio cambia y por qué, manteniendo la coherencia
  global del proyecto.
- Versionado semántico: MAJOR para eliminar o redefinir principios de forma incompatible; MINOR para
  añadir principios o secciones, o ampliar materialmente su contenido; PATCH para aclaraciones y
  correcciones de redacción.

**Version**: 1.0.3 | **Ratified**: 2026-10-15 | **Last Amended**: 2026-10-17
