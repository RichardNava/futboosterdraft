# Feature Specification: Mejora de cartas y nivel de rareza del draft

**Feature Branch**: `013-mejora-cartas-rareza-draft`

**Created**: 2026-11-09

**Status**: Draft

**Input**: User description: "Spec 13 - Mejora cartas & Draft Rarity Level: 1) fondos de cartas con las 300 imágenes anime de `./jugadores_bg`; 2) mejorar la legibilidad de virtudes/defectos (y stats) sobre el fondo; 3) opción de partida 'nivel de rareza del draft' (3-5 niveles, el actual como estándar), con posible monetización; 4) corrección de cinco errores (página bloqueada al arrancar con una pestaña abierta, error de inicio de sesión poco visible, 'Mis partidas' lenta, tooltip que parpadea en la esquina, media del equipo cortada con zoom); 5) Mi perfil: las dos equipaciones en un solo contenedor y el otro para escudos y sobres."

## Contexto: reparto de rareza actual

Para decidir los niveles en `/speckit-clarify` (lo pidió la persona), estos son los datos de hoy:

- **Cada sobre** (8 cartas) trae 4 Superclase, 2 Crack, 1 Legendario y 1 carta "alta" que es Legendario (80 %) o GOAT (20 %).
- **Por participante** (24 cartas en 3 sobres), de media: 12 Superclase (50 %), 6 Crack (25 %), 5,4 Legendario (22,5 %) y 0,6 GOAT (2,5 %).
- **Por mesa de 8** (192 cartas): 96 Superclase, 48 Crack, ~43 Legendario y ~4,8 GOAT.
- **Colección Core** (300 cartas): 140 Superclase, 70 Crack, 54 Legendario y 36 GOAT.
- Consecuencia: en una mesa de 8 sale de media el 13 % de los GOAT del Core (4,8 de 36). Que un GOAT concreto, como Messi, aparezca en la mesa ronda el 13 %, y que acabe en tu equipo, alrededor del 1,7 %. Eso explica que no haya salido en casi 100 drafts.
- **Límite del catálogo**: una mesa de 8 necesita 192 cartas distintas y el Core solo tiene 90 Legendario + GOAT. Ningún nivel que reparta más de 90 cartas Legendario o GOAT por mesa cabe sin ampliar el pool o permitir repeticiones en el draft.

## Clarifications

### Session 2026-11-09

- Q: ¿Cuántos niveles de rareza y qué reparto por sobre tiene cada uno? → A: 5 niveles (Pobre, Escaso, Moderado = actual, Abundante, Rico) con la tabla de FR-012; Rico no cabe en Core y se rige por FR-020.
- Q: ¿Qué hacemos con el nivel Rico, que pide más cartas Legendario y GOAT de las que tiene Core? → A: Rico pone en cada mesa todas las Legendario y GOAT de Core (54 + 36) y cubre los 6 huecos que faltan con Crack; sin repeticiones.
- Q: ¿Quién puede usar los niveles distintos de Moderado al crear una partida? → A: Libres durante las pruebas, con un ajuste de servidor para restringirlos sin desplegar; la venta se implementa ya: en modo restringido son gratis con cuenta premium y, sin ella, cuestan 100 fragmentos por partida.
- Q: ¿Cuánto dura la cuenta premium y cuánto cuesta? → A: 30 días desde la compra, 2,99 € o 2.990 fragmentos; sin renovación automática; comprarla con premium activa suma 30 días a la fecha de fin.

### Session 2026-11-10

Aclaraciones aportadas por la persona (sustituyen a lo anterior donde lo contradicen):

- Q: ¿Se mantiene el 80 % / 20 % de la carta alta en Moderado? → A: No; Moderado pasa a 70 % Legendario / 30 % GOAT y se recalcula la tabla de niveles (FR-012).
- Q: ¿Cómo cubre Rico los huecos cuando faltan Legendario o GOAT? → A: Hueco a hueco: si no queda el nivel sorteado se usa el otro (Legendario ↔ GOAT) y, si no quedan ninguno de los dos, Crack. El límite de 90 solo se da con un pool de solo Core; con más colecciones o sobres comprados el pool llega a 96 o más (FR-020). Sustituye al reparto exacto de 90 por mesa.
- Q: ¿Quién tiene premium sin comprarlo? → A: De momento, las cuentas con una bandera de "premium de cortesía"; una spec próxima de RBAC la sustituirá por los roles DEVELOPER, BETATESTER y ADMIN. En esta spec se implementa ya la compra del pase premium y el pago por partida.
- Q: ¿Premium es solo para los niveles de rareza? → A: No; es un "pase premium" que en el futuro dará más beneficios (estadísticas de jugadores, modos de juego nuevos, editor de jugadores, sobre conmemorativo de regalo, descuentos en cosméticos especiales, sin publicidad al crear partida como anfitrión…). Esta spec solo implementa el beneficio de los niveles de rareza, pero el pase se modela como algo general.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fondos ilustrados en las cartas de Core (Priority: P1)

Quien juega ve en cada carta de Core una ilustración de cuerpo entero del jugador, de estilo anime, como fondo de la carta, en lugar del fondo genérico por demarcación que se ve hoy. La ilustración se integra con la misma transparencia que tienen los fondos provisionales.

**Why this priority**: Es el cambio más visible de la spec y los recursos ya existen. Da identidad a cada carta sin depender de nada más.

**Independent Test**: Abrir la colección, el draft o la ficha de cualquier carta de Core y comprobar que cada una muestra su propia ilustración de fondo, que corresponde al jugador correcto, y que la carpeta de origen ya no está en el proyecto.

**Acceptance Scenarios**:

1. **Given** las 300 ilustraciones de origen, **When** se completa la incorporación, **Then** cada carta de Core tiene asignada como fondo la ilustración cuyo identificador coincide con el suyo, optimizada para la web, y no queda ninguna carta de Core con el fondo genérico.
2. **Given** una carta de Core en cualquier pantalla que muestre cartas (draft, colección, ficha, plantilla, tienda), **When** se muestra, **Then** la ilustración se ve como fondo con la misma transparencia que los fondos provisionales y no tapa el retrato, el nombre, la media ni los stats.
3. **Given** la incorporación terminada y verificada, **When** se revisa la raíz del proyecto, **Then** la carpeta `jugadores_bg` ya no existe.
4. **Given** el ajuste de identidad de las cartas en "alternativa" (plan B de derechos de imagen), **When** se muestra una carta de Core, **Then** el fondo vuelve a ser el genérico de su demarcación, porque la ilustración representa al jugador real.

---

### User Story 2 - Virtudes, defectos y stats legibles sobre cualquier fondo (Priority: P1)

Quien juega lee sin esfuerzo las virtudes y defectos de una carta, también cuando tiene de 4 a 6 y el texto cae sobre la zona más clara o cargada del fondo (por ejemplo, la portería). Lo mismo con los números de los stats.

**Why this priority**: Leer los rasgos es imprescindible para decidir en el draft, y las nuevas ilustraciones de fondo aumentan el riesgo de que el texto se pierda.

**Independent Test**: Revisar en la página de pruebas de cartas las cartas con 4, 5 y 6 rasgos y las de fondos más claros, y comprobar que todos los textos y números se leen con el contraste mínimo.

**Acceptance Scenarios**:

1. **Given** una carta con 6 rasgos cuyo recuadro cae sobre la zona más clara de su fondo, **When** se muestra, **Then** el texto de cada rasgo cumple el contraste mínimo de legibilidad frente a lo que tiene detrás.
2. **Given** cualquier carta, **When** se muestran los números de los stats, **Then** se leen con el mismo contraste mínimo.
3. **Given** el tratamiento aplicado, **When** se compara con el diseño actual, **Then** el fondo ilustrado sigue viéndose y la carta conserva su estética (no aparecen trazos gruesos ni bloques opacos que tapen la ilustración).

---

### User Story 3 - Elegir el nivel de rareza del draft al crear una partida (Priority: P2)

Quien crea una partida, en cualquier modo, elige un nivel de rareza del draft. Los niveles bajos reparten más Superclase y Crack (esas cartas cobran protagonismo) y los altos reparten más Legendario y GOAT (equipos más potentes y jugadores carismáticos). Moderado, el nivel estándar, es el valor por defecto y sube algo la probabilidad de GOAT respecto a hoy (30 % en la carta alta en lugar de 20 %).

**Why this priority**: Es la novedad de juego más grande de la spec, pero depende de decisiones pendientes (niveles, capacidad del catálogo y acceso). Las historias anteriores no dependen de ella.

**Independent Test**: Crear partidas con cada nivel, jugar o simular sus drafts muchas veces con semillas distintas y comprobar que el reparto medio por participante de cada nivel coincide con su tabla, y que el generador con la probabilidad de hoy (80 % / 20 %) da los mismos sobres que hoy.

**Acceptance Scenarios**:

1. **Given** la pantalla de crear partida de cualquier modo, **When** quien crea la partida la configura, **Then** puede elegir el nivel de rareza del draft entre los definidos, con el estándar preseleccionado y una breve descripción de cada nivel.
2. **Given** una partida con un nivel elegido, **When** empieza el draft, **Then** todos los sobres de la partida se generan con el reparto de ese nivel y se siguen respetando los cupos de demarcación por sobre.
3. **Given** el generador con la probabilidad de carta alta de hoy (80 % / 20 %), **When** se genera un draft con la misma semilla que antes de esta spec, **Then** los sobres son idénticos a los de hoy; y con Moderado (70 % / 30 %) el reparto medio coincide con su fila de la tabla.
4. **Given** una partida creada, **When** cualquier participante consulta la sala o el resumen, **Then** ve qué nivel de rareza tiene la partida.
5. **Given** una partida de nivel Rico con pool de solo Core, **When** se genera el draft de una mesa, **Then** aparecen en ella las 90 cartas Legendario y GOAT de Core, cada una una sola vez, y los 6 huecos sobrantes se cubren con Crack; con un pool de 96 o más Legendario y GOAT no se usa ninguna Crack en su lugar (FR-020).
6. **Given** el nivel elegido, **When** termina el draft, **Then** ningún equipo tiene al mismo jugador dos veces.
7. **Given** el ajuste de acceso en `restringido` y una cuenta registrada sin pase premium con saldo suficiente, **When** crea una partida de nivel Rico, **Then** se le cobran 100 fragmentos una sola vez; con pase premium activo (comprado o de cortesía) no se le cobra nada, y un invitado solo puede elegir Moderado.

---

### User Story 4 - La aplicación arranca sola y "Mis partidas" carga rápido (Priority: P1)

Quien tiene la aplicación abierta en una pestaña mientras se arranca el proyecto ve que la página se recupera sola, sin quedarse en el esqueleto de carga hasta refrescar. En "Mis partidas" ve enseguida la partida en curso (si la hay) y sus 5 últimas partidas, y puede cargar más de 5 en 5.

**Why this priority**: Son errores que bloquean el uso o lo hacen lento en cuanto se acumula historial; afectan a todas las sesiones.

**Independent Test**: Con una pestaña abierta, parar y arrancar el servidor y comprobar que la página se recupera sola; con una cuenta de 50 partidas terminadas, abrir "Mis partidas" y medir el tiempo hasta ver la lista.

**Acceptance Scenarios**:

1. **Given** una pestaña abierta en cualquier pantalla y el servidor aún sin responder, **When** el servidor pasa a estar disponible, **Then** la pantalla se carga sola, sin refrescar a mano.
2. **Given** el servidor sin responder durante más de unos segundos, **When** la persona mira la pantalla, **Then** ve un aviso de que se está conectando, no solo el esqueleto de carga.
3. **Given** una cuenta con una partida en curso y 50 terminadas, **When** abre "Mis partidas", **Then** ve la partida en curso y las 5 terminadas más recientes, y un control para cargar las 5 siguientes.
4. **Given** la lista con más partidas por cargar, **When** pulsa el control, **Then** se añaden las 5 siguientes sin recargar las ya mostradas; cuando no quedan más, el control desaparece.

---

### User Story 5 - Aviso claro al fallar el inicio de sesión (Priority: P2)

Quien escribe mal el email o la contraseña ve en la parte superior del formulario, sin desplazarse, un aviso claro de qué ha fallado y qué puede hacer, y la animación de cartas de la portada no se mueve ni parpadea.

**Why this priority**: Hoy el mensaje queda fuera de la pantalla, es genérico y provoca un salto visual; afecta a la primera impresión.

**Independent Test**: Intentar entrar con credenciales incorrectas, sin conexión y con demasiados intentos, y comprobar que cada caso muestra su aviso arriba, visible y sin mover la portada.

**Acceptance Scenarios**:

1. **Given** el formulario de inicio de sesión, **When** se envían credenciales incorrectas, **Then** aparece un aviso visible sin desplazar la página que indica que el email o la contraseña no son correctos y ofrece recuperar la contraseña.
2. **Given** el servidor no responde, **When** se intenta iniciar sesión, **Then** el aviso dice que no hay conexión con el servidor, distinto del de credenciales.
3. **Given** cualquier aviso de error, **When** aparece o desaparece, **Then** la animación de cartas de la portada no cambia de posición ni parpadea.

---

### User Story 6 - Tooltips y media del equipo sin fallos visuales (Priority: P3)

Quien pasa el cursor rápido sobre un rasgo ve su descripción directamente en su sitio, sin que aparezca un instante en la esquina superior izquierda. La media del equipo se ve completa, encima de la estrella, con cualquier nivel de zoom.

**Why this priority**: Son molestias visuales que no bloquean el juego.

**Independent Test**: Pasar el cursor rápido sobre rasgos en distintas cartas y grabar la pantalla; cambiar el zoom del navegador entre 50 % y 200 % y revisar la media del equipo.

**Acceptance Scenarios**:

1. **Given** una carta con rasgos, **When** el cursor pasa rápido por encima de uno o de varios seguidos, **Then** la descripción solo se dibuja en su posición final, nunca en otra parte.
2. **Given** la media del equipo sobre su estrella, **When** el zoom del navegador está entre 50 % y 200 %, **Then** los números se ven completos, sin cortes arriba ni abajo, y por encima de la estrella.

---

### User Story 7 - Mi perfil más compacto (Priority: P3)

En "Mi perfil" las dos equipaciones comparten un solo contenedor y el espacio liberado se usa para elegir escudo y sobre, que hoy quedan más abajo.

**Why this priority**: Mejora de distribución sin cambio funcional.

**Independent Test**: Abrir "Mi perfil" en un escritorio de 1366×768 y comprobar que las dos equipaciones, el escudo y el sobre se ven sin tener que desplazarse.

**Acceptance Scenarios**:

1. **Given** la pantalla "Mi perfil" en escritorio, **When** se abre, **Then** las dos equipaciones aparecen juntas en un contenedor y el escudo y el sobre en el contenedor de al lado.
2. **Given** el nuevo diseño, **When** se edita una equipación o se elige un escudo o sobre, **Then** se guarda igual que hoy (las equipaciones con "Guardar"; escudo y sobre al momento).
3. **Given** una pantalla estrecha (móvil), **When** se abre "Mi perfil", **Then** los contenedores se apilan y todo sigue siendo usable.

---

### Edge Cases

- Falta la ilustración de algún identificador o sobra alguna que no corresponde a ninguna carta de Core: la incorporación se detiene, informa de los identificadores afectados y no borra la carpeta de origen.
- Dos archivos de origen con el mismo identificador (nombres distintos): se trata como error y se informa; no se elige uno al azar.
- Una ilustración no carga en el navegador: la carta muestra el fondo genérico de su demarcación.
- Cartas de colecciones que no son Core (p. ej. cartas de prueba): conservan su fondo actual.
- Una carta con 0 rasgos o con 1: el tratamiento de legibilidad no deja un recuadro vacío visible.
- Nivel de rareza en una partida con 16 participantes (varias mesas): el reparto se aplica a cada mesa por igual.
- Partida creada antes de esta spec: se considera de nivel estándar y se reanuda igual.
- La persona que crea la partida pierde el acceso al nivel (pasa el ajuste a `restringido` o le caduca el pase premium) después de crearla: la partida conserva el nivel elegido y no se cobra nada más.
- Saldo insuficiente al crear una partida de nivel no estándar en modo `restringido`: no se crea la partida y se informa del saldo y de lo que falta.
- La petición de crear partida llega dos veces (doble clic, reintento de red): se crea una sola partida y se cobra una sola vez.
- "Mis partidas" con 0 partidas, solo una en curso, o exactamente 5 terminadas: no se muestra el control de cargar más.
- Se termina una partida mientras se pagina la lista: no aparecen partidas duplicadas ni se pierde ninguna.
- El servidor vuelve tras una caída larga con la sesión caducada: la pantalla se recupera y lleva a iniciar sesión, sin quedarse en blanco.

## Requirements *(mandatory)*

### Functional Requirements

#### Fondos ilustrados (US1)

- **FR-001**: Cada una de las 300 cartas de Core DEBE tener como fondo (`imagen_bg`) su ilustración propia, emparejada por el identificador numérico que encabeza el nombre de archivo, sin importar el resto del nombre (mayúsculas, apellidos o apodos).
- **FR-002**: Las ilustraciones DEBEN convertirse a un formato optimizado para la web, conservando la transparencia y una resolución suficiente para la carta más grande que muestra la aplicación, y guardarse en la carpeta pública de cartas con un nombre basado solo en el identificador.
- **FR-003**: La incorporación DEBE ser repetible y DEBE verificar que hay exactamente una ilustración por carta de Core antes de asignar nada; si la verificación falla, no DEBE modificar datos ni borrar el origen.
- **FR-004**: La única fuente de las cartas de Core DEBE seguir siendo el archivo de datos de Core, y su validación DEBE aceptar las nuevas rutas de fondo.
- **FR-005**: La carta DEBE mostrar la ilustración con la misma transparencia y encuadre que los fondos provisionales actuales, en todas las pantallas que muestran cartas.
- **FR-006**: Con la identidad "alternativa" activa, las cartas de Core DEBEN mostrar el fondo genérico de su demarcación.
- **FR-007**: Tras verificar la incorporación, la carpeta de origen `jugadores_bg` DEBE eliminarse del proyecto.

#### Legibilidad (US2)

- **FR-008**: El texto de virtudes y defectos DEBE alcanzar un contraste mínimo de 4,5:1 frente a lo que tenga detrás en cualquier carta de Core, con hasta 6 rasgos.
- **FR-009**: Los números de los stats DEBEN alcanzar el mismo contraste mínimo.
- **FR-010**: La solución DEBE combinar con sutileza un recuadro de rasgos menos translúcido y un contorno o sombra oscura fina en el texto (opción C de la persona), manteniendo visible la ilustración de fondo; el resultado se valida visualmente en la página de pruebas de cartas.

#### Nivel de rareza del draft (US3)

- **FR-011**: La configuración de partida DEBE incluir el "nivel de rareza del draft" en todos los modos de juego.
- **FR-012**: DEBE haber 5 niveles con este reparto por sobre de 8 cartas ("alta" = carta Legendario o GOAT con la probabilidad indicada):

  | Nivel | Sobre | Alta (L / G) | Media por participante (S / C / L / G) | GOAT por mesa de 8 |
  |---|---|---|---|---|
  | Pobre | 5 S, 2 C, 1 alta | 95 % / 5 % | 15 / 6 / 2,85 / 0,15 | ~1,2 |
  | Escaso | 5 S, 2 C, 1 alta | 80 % / 20 % | 15 / 6 / 2,4 / 0,6 | ~4,8 |
  | Moderado (estándar) | 4 S, 2 C, 1 L, 1 alta | 70 % / 30 % | 12 / 6 / 5,1 / 0,9 | ~7,2 |
  | Abundante | 3 S, 2 C, 1 L, 2 altas | 50 % / 50 % | 9 / 6 / 6 / 3 | ~24 |
  | Rico | 2 S, 2 C, 1 L, 3 altas | 50 % / 50 % | 6 / 6 / 7,5 / 4,5 (con pool de solo Core: 6 / 6,75 / 6,75 / 4,5) | 36 (todos) |

  Probabilidad de que un GOAT concreto (p. ej. Messi) salga en una mesa de 8 con pool de solo Core, y de que acabe en tu equipo: Pobre 3 % / 0,4 %; Escaso 13 % / 1,7 %; Moderado 20 % / 2,5 % (hoy 13 % / 1,7 %); Abundante 67 % / 8,3 %; Rico 100 % / 12,5 %.

  Con pool de solo Core, Pobre, Escaso, Moderado y Abundante caben siempre; Rico pide 96 L + G por mesa y Core tiene 90, así que los 6 huecos sobrantes se cubren por la regla de FR-020. S, C, L y G = Superclase, Crack, Legendario y GOAT.
- **FR-013**: Moderado DEBE ser el valor por defecto. El generador DEBE conservar el algoritmo actual de modo que, con la probabilidad de la carta alta de hoy (80 % / 20 %), produzca exactamente los mismos sobres que hoy para la misma semilla; el cambio a 70 % / 30 % es solo de parámetro y DEBE versionarse como el resto de parámetros de equilibrado.
- **FR-014**: Todos los niveles DEBEN mantener los cupos de demarcación por sobre (1 "POR o DEF", 2 DEF, 3 MED, 2 DEL) y el tamaño de 8 cartas por sobre.
- **FR-015**: El reparto DEBE seguir siendo determinista a partir de la semilla de la partida, para poder reproducir y verificar cualquier draft.
- **FR-016**: El nivel DEBE quedar fijado al crear la partida, ser igual para todos los participantes (humanos y NPC) y mostrarse en la sala y en el resumen de la partida.
- **FR-017**: El servidor DEBE validar el nivel recibido (que existe y que quien crea la partida tiene acceso a él) y rechazar con un mensaje claro cualquier valor no válido.
- **FR-018**: Las partidas existentes sin nivel DEBEN tratarse como de nivel estándar.
- **FR-019**: El acceso a los niveles no estándar DEBE depender de un ajuste de servidor con dos valores, `libre` (por defecto) y `restringido`, que se cambia sin reiniciar ni desplegar (como `identidad_cartas`) y solo afecta a las partidas nuevas. En `libre`, todas las cuentas, invitados incluidos, usan los 5 niveles gratis. En `restringido`, Moderado sigue siendo libre para todos y los demás niveles: son gratis para cuentas con pase premium activo; cuestan 100 fragmentos por partida a las cuentas registradas sin pase premium; y no están disponibles para invitados.
- **FR-020**: Cuando el pool de la partida no tenga cartas del nivel sorteado para un hueco de Legendario o de carta alta, el generador DEBE usar el otro nivel alto (Legendario ↔ GOAT) y, si no quedan de ninguno de los dos, una carta Crack. Con pool de solo Core esto solo ocurre en Rico (6 huecos por mesa de 8); con más colecciones en el pool no hace falta. Ningún nivel DEBE repetir un jugador en la misma mesa ni arrancar un draft incompleto; si ni así se pueden completar los sobres, la partida DEBE rechazarse al crearla con un mensaje claro.
- **FR-021**: Ningún equipo DEBE terminar el draft con el mismo jugador repetido, sea cual sea el nivel.
- **FR-033**: El cobro de 100 fragmentos DEBE hacerse a quien crea la partida, una sola vez, al crearla (aunque la petición se repita), y DEBE rechazarse con el saldo y lo que falta si no alcanza, sin crear la partida. Si la partida se cancela antes de empezar el draft, los fragmentos DEBEN devolverse.
- **FR-034**: La tienda DEBE vender el pase premium con fragmentos y con euros, igual que el resto de productos, y mostrar en la pantalla de crear partida, junto a cada nivel no estándar, si es gratis (pase premium o modo `libre`), cuánto cuesta o por qué no está disponible. El pase dura 30 días desde la compra y cuesta 2,99 € o 2.990 fragmentos (editables en los datos de la tienda); no se renueva solo, y comprarlo con el pase activo suma 30 días a la fecha de fin. Solo pueden comprarlo cuentas registradas, y la tienda y "Mi perfil" DEBEN mostrar la fecha de fin si está activo.
- **FR-035**: Una cuenta DEBE poder tener una bandera de "premium de cortesía" que equivale a un pase premium activo sin fecha de fin, se activa o desactiva con un comando de servidor (como los ajustes) y no aparece en la tienda. La sustituirán los roles DEVELOPER, BETATESTER y ADMIN de la futura spec de RBAC.
- **FR-036**: El pase premium DEBE modelarse como un estado general de la cuenta (activo o no, de cortesía o comprado, fecha de fin) que cualquier beneficio pueda consultar; en esta spec el único beneficio es el acceso a los niveles de rareza. El historial de compras del pase DEBE conservarse, para poder saber cuál fue la primera.

#### Arranque y "Mis partidas" (US4)

- **FR-022**: Si al cargar una pantalla el servidor no responde, la aplicación DEBE reintentar automáticamente y cargar la pantalla cuando el servidor esté disponible, sin refrescar a mano.
- **FR-023**: Si la espera supera 3 segundos, la aplicación DEBE mostrar un aviso de que se está conectando con el servidor.
- **FR-024**: "Mis partidas" DEBE mostrar al entrar la partida en curso (si la hay) y las 5 partidas terminadas más recientes, y DEBE permitir cargar las siguientes de 5 en 5 bajo demanda.
- **FR-025**: El tiempo de carga inicial de "Mis partidas" NO DEBE crecer con el número de partidas terminadas de la cuenta.

#### Inicio de sesión (US5)

- **FR-026**: Los errores de inicio de sesión DEBEN mostrarse en la parte superior del formulario, visibles sin desplazar la página.
- **FR-027**: El aviso DEBE distinguir al menos: credenciales incorrectas (sin revelar si el email existe), servidor no disponible y demasiados intentos; y en el primer caso DEBE ofrecer recuperar la contraseña.
- **FR-028**: Mostrar u ocultar el aviso NO DEBE mover ni hacer parpadear la animación de cartas de la portada.

#### Retoques visuales (US6, US7)

- **FR-029**: La descripción de un rasgo DEBE dibujarse solo cuando ya conoce su posición final; nunca DEBE verse, ni un instante, en otra posición.
- **FR-030**: Los números de la media del equipo DEBEN verse completos y por encima de la estrella con el zoom del navegador entre 50 % y 200 %.
- **FR-031**: En "Mi perfil", las dos equipaciones DEBEN compartir un contenedor, y la elección de escudo y de sobre DEBE ocupar el contenedor contiguo; en pantallas estrechas los contenedores se apilan.
- **FR-032**: La reorganización de "Mi perfil" NO DEBE cambiar cómo se guardan las equipaciones, el escudo, el sobre ni la celebración.

### Key Entities

- **Carta de jugador (Core)**: carta del catálogo identificada por su número; gana una ilustración de fondo propia (`imagen_bg`) en lugar del fondo genérico de su demarcación.
- **Ilustración de fondo**: imagen transparente de cuerpo entero del jugador, una por carta de Core, emparejada por identificador.
- **Nivel de rareza del draft**: opción de la configuración de partida con un nombre, una descripción breve, un reparto de niveles de carta por sobre y, si se acuerda, una regla de acceso. Uno de ellos es el estándar.
- **Configuración de partida**: gana el nivel de rareza del draft, fijado al crearla, y, si se cobró, el cobro asociado para poder devolverlo.
- **Ajuste de acceso a niveles**: ajuste de servidor `libre` o `restringido` (por defecto `libre`).
- **Pase premium**: estado general de una cuenta registrada: activo mientras su fecha de fin no haya pasado o si tiene la bandera de cortesía. Cada compra suma 30 días. En esta spec da acceso gratis a todos los niveles de rareza; en el futuro dará más beneficios.
- **Listado de "Mis partidas"**: partida en curso más páginas de 5 partidas terminadas, de la más reciente a la más antigua.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100 % de las 300 cartas de Core muestran su propia ilustración de fondo y ninguna muestra la de otro jugador (revisión automática por identificador y muestreo visual de al menos 20 cartas).
- **SC-002**: Las 300 ilustraciones optimizadas pesan de media 120 KB o menos cada una.
- **SC-003**: El 100 % de los textos de rasgos y stats de las cartas de Core cumplen un contraste de 4,5:1 o más frente a su fondo.
- **SC-004**: En 1.000 drafts simulados por nivel, el número medio de cartas de cada nivel por participante queda a menos del 5 % de lo previsto para ese nivel.
- **SC-005**: Con la probabilidad de carta alta de hoy (80 % / 20 %), los sobres generados son idénticos a los actuales para las mismas semillas (100 % de coincidencia en las pruebas de regresión).
- **SC-006**: Tras arrancar el servidor con pestañas abiertas, la pantalla se recupera sola en menos de 5 segundos desde que el servidor está disponible, en el 100 % de los intentos.
- **SC-007**: "Mis partidas" muestra su contenido en menos de 1 segundo, tanto con 5 como con 200 partidas terminadas.
- **SC-008**: En las pruebas de inicio de sesión fallido, el aviso se ve sin desplazar la página en el 100 % de los casos y la animación de la portada no se mueve.
- **SC-009**: En grabaciones de pasadas rápidas del cursor sobre rasgos, la descripción no aparece en ningún fotograma fuera de su posición final.
- **SC-010**: En "Mi perfil" a 1366×768, las dos equipaciones, el escudo y el sobre se ven sin desplazarse.

## Assumptions

- Las 300 ilustraciones corresponden una a una con los 300 identificadores de Core; ya se ha comprobado que hay 300 archivos con 300 identificadores distintos.
- Se usa el mismo formato de imagen optimizado que el resto de imágenes del proyecto (WebP); el atributo de datos es el `imagen_bg` existente, no un atributo nuevo.
- Las ilustraciones representan a jugadores reales, así que se tratan como los retratos a efectos del plan B de derechos de imagen (FR-006).
- Las cartas de colecciones distintas de Core no reciben ilustración en esta spec.
- Para la legibilidad se elige la opción C (combinación sutil); si en la validación visual el contorno de los stats queda feo, se deja solo la mejora del recuadro y una sombra suave, siempre que se cumpla el contraste.
- El nivel de rareza solo cambia la proporción de niveles de carta en los sobres; no cambia el número de sobres, de cartas por sobre ni los cupos de demarcación.
- Los NPC eligen como hoy; el nivel de rareza no cambia su comportamiento.
- En "Mis partidas" se usa un botón "Cargar más" en lugar de desplazamiento infinito, por accesibilidad y por el principio de mostrar lo importante sin desplazarse.
- El mensaje de credenciales incorrectas no dice si el fallo está en el email o en la contraseña, para no revelar qué cuentas existen.
- La causa exacta del bloqueo al arrancar y del parpadeo del tooltip se investiga en la planificación; la spec fija el comportamiento esperado.
- Fuera de alcance: los roles RBAC (spec próxima), el resto de beneficios del pase premium y la futura expansión de 20 cartas (4 Superclase, 4 Crack, 6 Legendario, 6 GOAT) que se regalaría con la primera compra del pase (antes de la beta, cuando haya más cartas). Esta spec deja preparado lo que necesitan: el estado general del pase (FR-036) y el historial de compras.
- El pool de una partida es el de las colecciones del anfitrión, como hoy; con solo Core, Rico cubre 6 huecos por mesa con Crack (FR-020), y en cuanto el anfitrión tiene más colecciones o sobres el pool suele bastar.
