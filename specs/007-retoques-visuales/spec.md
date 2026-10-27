# Feature Specification: Retoques visuales

**Feature Branch**: `007-retoques-visuales`

**Created**: 2026-10-27

**Status**: Draft

**Input**: User description: "Spec 7 — Retoques visuales: sustituir el logo (navbar, favicon…) por el nuevo logo oficial en SVG; rehacer el diseño de las cartas sobre los nuevos marcos y fondos por rareza (Superclase, Épica, Legendaria, GOAT); añadir seis imágenes de fondo nuevas al reparto aleatorio de páginas, optimizadas; sustituir los sonidos estridentes por otros más suaves, bajar el volumen un 20 % y añadir sonidos de choque y ruleta del estado de forma en los duelos, aplausos en la pantalla de campeón y trompetas decaídas en la de derrota; ocultar «Máximos goleadores» y «Máximos asistentes» en el modo Duelos de jugadores. Los recursos están en `temp/`, que se elimina al terminar." Ampliación: "La imagen sobre_futbol_verde_2.png va a ser nuestro nuevo sobre, al que hay que añadirle la animación y sustituirlo en todos los lugares donde mostramos el sobre."

## Clarifications

### Session 2026-10-27

- Q: Los nuevos marcos traen su propio fondo (estadio); ¿qué pasa con la imagen de fondo por demarcación? → A: Se mantiene, semitransparente, superpuesta al estadio del marco.
- Q: ¿Qué proporción tiene la carta: la actual 5:7 o la del nuevo marco (~2:3)? → A: La del marco (~2:3), sin deformarlo; se ajustan los diseños que lo necesiten.
- Q: ¿El sonido de ruleta del estado de forma va acompañado de números girando? → A: Sí, animación corta (≈0,8 s) que gira hasta el valor final con el sonido sincronizado; con movimiento reducido o al saltar, valor directo y sin sonido.
- Q: ¿Los sonidos se sintetizan en el proyecto o se toman de grabaciones con licencia libre? → A: Todos a partir de grabaciones CC0 descargadas.
- Q: ¿Cuánto pueden pesar como máximo todos los ficheros de sonido juntos? → A: ≤ 300 KB en total.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cartas con el nuevo diseño por rareza (Priority: P1)

Quien juega ve todas las cartas de jugador (draft, apertura de sobres, plantilla, colección, tienda, duelos) con el nuevo marco y fondo de su rareza: Superclase, Épica, Legendaria o GOAT. Sobre ese marco siguen apareciendo, legibles y en su sitio, todos los elementos que tiene hoy la carta: retrato o silueta, imagen de fondo por demarcación, nombre, media y demás números, bandera, demarcación, virtudes y defectos.

**Why this priority**: La carta es el objeto central del juego y el cambio más visible de la spec; es el que más valor aporta y el de más riesgo (legibilidad, tamaños pequeños).

**Independent Test**: Abrir la pantalla de pruebas de cartas y un sobre; comprobar que cada rareza muestra su marco nuevo y que ningún dato de la carta queda tapado, cortado o ilegible en los tamaños de carta que usa la aplicación.

**Acceptance Scenarios**:

1. **Given** una carta de cada rareza, **When** se muestra en tamaño completo, **Then** cada una usa el marco y fondo de su rareza y muestra todos los datos que mostraba antes del cambio.
2. **Given** una carta en su tamaño más pequeño (miniatura en el campo o en listas), **When** se muestra, **Then** el nombre y la media siguen siendo legibles y la rareza se distingue a simple vista.
3. **Given** una carta sin retrato propio, **When** se muestra, **Then** aparece la silueta por defecto sobre el nuevo marco, igual que hoy.
4. **Given** una carta de una colección comprada (no *Core*), **When** se muestra, **Then** usa el mismo marco de su rareza que una carta *Core*.

---

### User Story 2 - Sonidos más agradables y momentos sonoros nuevos (Priority: P2)

Quien juega con el sonido activado oye efectos más graves y suaves que los actuales, a un volumen un 20 % más bajo. En los duelos oye un choque cuando las cartas se encuentran y un tic-tac de ruleta mientras se calcula el estado de forma. Al ganar un torneo oye aplausos y vítores; al perder, unas trompetas decaídas.

**Why this priority**: Los sonidos actuales molestan (riesgo de que la gente silencie la aplicación) y los momentos clave (duelos, final del torneo) carecen de respuesta sonora.

**Independent Test**: Con el sonido activado, abrir un sobre, ver un cruce de duelos con estado de forma y llegar a las pantallas de campeón y de derrota; comprobar que cada momento suena, que ninguno resulta agudo o estridente y que el interruptor de silencio los anula todos.

**Acceptance Scenarios**:

1. **Given** el sonido activado, **When** se abre un sobre, **Then** los efectos de apertura, reparto, volteo y revelación suenan con tonos más graves y suaves que los anteriores y a un volumen un 20 % menor.
2. **Given** un cruce de duelos en reproducción, **When** dos cartas chocan, **Then** suena un efecto de choque.
3. **Given** un cruce de duelos con estado de forma activado, **When** se calcula y muestra el estado de forma, **Then** el valor de forma gira como una ruleta durante ≈0,8 s hasta pararse en su valor final, y el efecto de ruleta suena durante ese giro y termina con él.
4. **Given** el jugador gana el torneo, **When** se muestra la pantalla de campeón, **Then** suenan aplausos y vítores una vez.
5. **Given** el jugador queda eliminado o pierde, **When** se muestra la pantalla de derrota, **Then** suenan unas trompetas decaídas una vez.
6. **Given** el sonido silenciado, **When** ocurre cualquiera de los momentos anteriores, **Then** no suena nada.
7. **Given** la persona salta la animación de los duelos, **When** se salta, **Then** no se acumulan ni solapan sonidos de choque o ruleta pendientes.

---

### User Story 3 - Nuevo logo oficial (Priority: P2)

Quien entra en la aplicación ve el nuevo logo oficial (escudo verde con cartas y balón) en todos los sitios donde hoy aparece la marca: barra de navegación, menú, pestaña del navegador (favicon) y cualquier otra pantalla que muestre el logo.

**Why this priority**: Es identidad de marca; cambio pequeño y muy visible.

**Independent Test**: Abrir la aplicación y comprobar el logo en la barra, en el menú y en la pestaña del navegador, en tema claro y oscuro.

**Acceptance Scenarios**:

1. **Given** cualquier pantalla, **When** se muestra la barra de navegación o el menú, **Then** aparece el nuevo logo y no queda rastro del anterior.
2. **Given** la aplicación abierta en una pestaña, **When** se mira la pestaña, **Then** el favicon es el nuevo logo y se reconoce a tamaño pequeño.
3. **Given** un fondo claro u oscuro, **When** se muestra el logo, **Then** no aparece un recuadro negro alrededor del escudo (el fondo del logo es transparente).

---

### User Story 4 - Más variedad de fondos de página (Priority: P3)

Las páginas que asignan una imagen de fondo aleatoria eligen ahora entre las cinco actuales y seis nuevas (background_6 a background_11), sin que la carga de la página se note más lenta.

**Why this priority**: Mejora estética de bajo riesgo.

**Independent Test**: Recargar varias veces una página con fondo aleatorio y comprobar que aparecen los fondos nuevos y que cada uno pesa como los actuales.

**Acceptance Scenarios**:

1. **Given** una página con fondo aleatorio, **When** se recarga suficientes veces, **Then** pueden salir los once fondos.
2. **Given** un fondo nuevo, **When** se descarga, **Then** su peso está en el mismo orden que los fondos actuales (no más de unos 150 KB).

---

### User Story 5 - Duelos sin tablas de goleadores (Priority: P3)

En un torneo del modo Duelos de jugadores, la pantalla del torneo deja de mostrar las pestañas «Máximos goleadores» y «Máximos asistentes», que en ese modo no tienen sentido.

**Why this priority**: Limpieza de interfaz; pequeña y aislada.

**Independent Test**: Abrir un torneo en modo Duelos y otro en modo fútbol; las pestañas solo aparecen en el segundo.

**Acceptance Scenarios**:

1. **Given** un torneo en modo Duelos de jugadores, **When** se abre la pantalla del torneo, **Then** no aparecen «Máximos goleadores» ni «Máximos asistentes».
2. **Given** un torneo de liga, playoff o mixto, **When** se abre la pantalla del torneo, **Then** ambas pestañas siguen apareciendo como hoy.

---

### User Story 6 - Nuevo sobre de cartas (Priority: P2)

Quien juega ve el nuevo sobre oficial (foil verde con franjas lima y el escudo del logo) en todos los lugares donde hoy aparece un sobre: inicio, creación de partida, sala, draft, tienda y apertura de sobres. Al abrir un sobre, el nuevo diseño tiene la misma animación de apertura que el actual (sacudida, rasgado del sellado superior, salida y reparto de las cartas), con su sonido.

**Why this priority**: El sobre es la otra pieza central del juego junto a la carta y comparte identidad con el nuevo logo; cambiar uno sin el otro deja la marca a medias.

**Independent Test**: Recorrer las pantallas que muestran sobres y abrir uno; comprobar que siempre sale el nuevo diseño, que la animación completa se ve sobre él y que no aparece el sobre anterior en ningún momento.

**Acceptance Scenarios**:

1. **Given** cualquier pantalla que muestra un sobre, **When** se muestra, **Then** aparece el nuevo diseño, sin recuadro negro alrededor (fondo transparente).
2. **Given** un sobre cerrado en el draft, **When** se abre, **Then** el nuevo sobre recorre todas las fases de la animación actual, incluido el rasgado del borde superior, y las cartas salen de él.
3. **Given** una persona con «reducir movimiento», **When** abre un sobre, **Then** se aplica la misma versión reducida de la animación que hoy, con el nuevo diseño.
4. **Given** sobres mostrados a distintos tamaños (miniatura en la tienda o en la sala, grande en la apertura), **When** se muestran, **Then** el diseño se reconoce y no se ve pixelado.

---

### Edge Cases

- Nombres de jugador muy largos sobre el nuevo marco: deben seguir recortándose o ajustándose como hoy sin invadir el marco.
- Carta en tamaño miniatura: el marco no debe comerse el espacio del retrato ni de la media.
- Usuarios con «reducir movimiento»: los sonidos nuevos no dependen de la animación; si la animación se omite, el sonido asociado tampoco debe dispararse en ráfaga.
- Navegador sin audio o con el audio aún bloqueado (sin interacción previa): la aplicación funciona sin errores y sin sonido.
- Volver a entrar en la pantalla de campeón o derrota (recargar): los aplausos o trompetas suenan como máximo una vez por visita, no en bucle.
- Fallo al cargar un recurso nuevo (marco, fondo o sonido): la carta o la página se muestra con un aspecto de reserva aceptable y sin romper la interfaz.

## Requirements *(mandatory)*

### Functional Requirements

**Logo**

- **FR-001**: El nuevo logo oficial MUST sustituir al anterior en todos los lugares donde se muestra la marca (barra de navegación, menú, favicon y cualquier otra aparición).
- **FR-002**: El logo MUST guardarse en formato vectorial (SVG), con fondo transparente, en una ubicación única de recursos reutilizable por todas sus apariciones.
- **FR-003**: El favicon MUST reconocerse a tamaño de pestaña (16–32 px).

**Cartas**

- **FR-004**: Cada rareza (Superclase, Épico, Legendario, GOAT) MUST usar como base de la carta el nuevo marco y fondo proporcionados, recortados al contorno de la carta (sin el halo exterior de la imagen original) y convertidos a SVG.
- **FR-005**: La carta MUST seguir mostrando sobre el nuevo marco todos los elementos actuales: retrato o silueta, imagen de fondo por demarcación (semitransparente, superpuesta al estadio del marco de modo que ambos se distingan), nombre, media y números, bandera, demarcación, virtudes y defectos, y cualquier otro distintivo que muestre hoy.
- **FR-006**: El nuevo diseño MUST aplicarse en todas las pantallas y tamaños en que aparece una carta, incluidas las cartas de colecciones compradas.
- **FR-006b**: La carta MUST adoptar la proporción del marco recortado (~2:3) en lugar de la actual 5:7, sin estirar ni recortar el marco; las rejillas, el campo, la tienda y la composición del sobre MUST ajustarse para que ninguna carta se solape ni se corte.
- **FR-007**: El texto de la carta MUST mantener un contraste legible sobre cada uno de los cuatro marcos.

**Fondos**

- **FR-008**: Las seis imágenes nuevas (background_6 a background_11) MUST añadirse al reparto aleatorio de fondos de página, junto a las cinco actuales.
- **FR-009**: Las imágenes nuevas MUST convertirse al mismo formato y tamaño que los fondos actuales y guardarse junto a ellos, con un peso comparable.

**Sonido**

- **FR-010**: Los efectos actuales (apertura, reparto, volteo, revelación, entrada y choque de duelo) MUST sustituirse por versiones de tono más grave y timbre más suave, sin picos agudos.
- **FR-011**: El volumen de todos los efectos MUST bajar un 20 % respecto al actual.
- **FR-012**: Los duelos MUST tener un sonido de choque cuando las cartas se encuentran y un sonido de ruleta de números mientras se calcula el estado de forma. El valor de forma MUST mostrarse con una animación corta (≈0,8 s) de números girando que se detiene en el valor final, con el sonido de ruleta sincronizado; con «reducir movimiento» o al saltar la animación, el valor aparece directamente y la ruleta no suena.
- **FR-013**: La pantalla de campeón MUST reproducir aplausos y vítores, y la de derrota unas trompetas decaídas, una vez por visita.
- **FR-014**: Todos los sonidos, nuevos y existentes, MUST respetar el interruptor de silencio actual y su preferencia guardada.
- **FR-015**: Todos los efectos (los sustituidos y los nuevos, incluidos los que hoy se sintetizan en el navegador: apertura, entrada y choque de duelo) MUST salir de grabaciones con licencia CC0, guardarse como ficheros comprimidos junto a los sonidos actuales y quedar documentados (autor, origen y licencia de cada uno) en el fichero de licencias de sonido.

**Duelos**

- **FR-016**: En los torneos del modo Duelos de jugadores, la pantalla del torneo MUST ocultar las pestañas «Máximos goleadores» y «Máximos asistentes»; en el resto de modos MUST seguir mostrándolas.

**Sobre**

- **FR-017**: El nuevo sobre (`sobre_futbol_verde_2.png`) MUST sustituir al sobre actual en todos los lugares donde se muestra un sobre, sin que quede rastro del diseño anterior.
- **FR-018**: El sobre MUST guardarse en SVG, con fondo transparente recortado al contorno del sobre, junto al resto de recursos gráficos.
- **FR-019**: La animación de apertura actual (todas sus fases, su versión con movimiento reducido y su sonido) MUST funcionar sobre el nuevo sobre, incluido el efecto de sellado superior rasgado.
- **FR-020**: El sobre MUST mantener la proporción con la que hoy se compone junto a las cartas, de modo que las cartas salgan de él sin descuadres.

**Limpieza**

- **FR-021**: Al terminar de usar los recursos, el directorio `temp/` MUST eliminarse y ningún fichero de la aplicación debe depender de él.

### Key Entities

- **Marco de rareza**: imagen base de la carta para una rareza concreta (cuatro en total); define el contorno y el fondo sobre el que se componen los datos.
- **Sobre**: imagen del sobre de cartas, cerrada o rasgada durante la apertura; una sola para todo el juego.
- **Fondo de página**: imagen del reparto aleatorio de fondos (pasa de cinco a once).
- **Efecto de sonido**: momento sonoro del juego (apertura, reparto, volteo, revelación, entrada de duelo, choque de duelo, ruleta de forma, aplausos de campeón, trompetas de derrota), con su volumen relativo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100 % de las apariciones de la marca muestran el nuevo logo; no queda ninguna referencia al logo anterior.
- **SC-002**: Las cuatro rarezas se distinguen entre sí a simple vista en cualquier tamaño de carta, y todos los datos visibles hoy en una carta siguen visibles tras el cambio.
- **SC-003**: Cada fondo nuevo pesa como máximo unos 150 KB (frente a ~2 MB de los originales) y la carga de las páginas no se percibe más lenta.
- **SC-004**: El volumen de cada efecto es un 20 % menor que el anterior, y en una escucha de prueba ningún efecto se percibe como agudo o molesto.
- **SC-004b**: Todos los ficheros de sonido juntos pesan como máximo 300 KB (aplausos y trompetas recortados a ≈2–3 s y comprimidos).
- **SC-005**: Los cuatro momentos nuevos (choque, ruleta de forma, campeón, derrota) suenan en el 100 % de las ocasiones con el sonido activado y en ninguna con el sonido silenciado.
- **SC-006**: En el modo Duelos no aparecen las tablas de goleadores ni asistentes; en los demás modos siguen apareciendo.
- **SC-007**: El repositorio no contiene el directorio `temp/` al cerrar la spec.
- **SC-008**: El 100 % de las apariciones de un sobre muestran el nuevo diseño, y la apertura de sobres conserva todas las fases de animación que tenía.

## Assumptions

- Los marcos de carta son ilustraciones con brillos y degradados: «convertir a SVG» se entiende como un SVG que conserve la fidelidad visual (vectorizado donde sea viable o una imagen optimizada contenida en el SVG); no se acepta una vectorización que degrade el aspecto.
- El logo original tiene fondo negro opaco; se elimina para que el escudo quede sobre fondo transparente.
- Los cuatro marcos sustituyen a los colores o marcos actuales por rareza; no cambia qué datos muestra la carta ni su distribución lógica, solo su presentación y su proporción (pasa a ~2:3).
- La lista de fondos de la petición repite background_6; se entiende que las nuevas son background_6 a background_11 (seis imágenes).
- «Añadir algún sonido adicional» queda cubierto por los cuatro momentos nuevos pedidos (choque, ruleta, campeón, derrota); no se añaden otros sin acordarlo.
- Hoy existen en disco `reparto.wav`, `volteo.wav` y `revelacion.wav` (CC0, sintetizados por el proyecto); la apertura y los dos efectos de duelo se sintetizan en el navegador. Esta spec sustituye todos ellos por grabaciones CC0 y deja de sintetizar sonido.
- `icono_3.png` y `sobre_futbol_verde.png` se han descartado y ya no están en `temp/`.
- El nuevo sobre, como el logo, tiene fondo negro opaco; se elimina para que el sobre quede sobre fondo transparente.
- «Añadirle la animación» se entiende como conservar la animación de apertura actual con el nuevo diseño, no como diseñar una animación nueva. El rasgado del sellado superior, que hoy se dibuja sobre el sobre vectorial, debe reproducirse sobre la nueva imagen (por ejemplo, recortando su borde superior con un contorno irregular).
- No cambian las reglas del juego, los datos del catálogo ni el comportamiento del servidor.
