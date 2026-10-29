# Feature Specification: Datos reales de la colección Core (fase 0.1)

**Feature Branch**: `main` (sin rama propia: se trabaja directamente en `main` y, al terminar, la persona hace el push a `origin/main`)

**Created**: 2026-10-29

**Status**: Draft

**Input**: User description: "Spec 8 — Create Real Data phase 0.1. Sin rama: se trabaja en main y al acabar se hace push a origin/main. 0) Adaptar retratos: en `retratos/` hay 250 retratos de los futbolistas de la colección Core; modificarlos, comprimirlos y adaptarlos para usarlos en las cartas y reubicarlos en /public o donde sea mejor. 1) JSON de datos reales de la colección Core: un JSON con la información real de cada jugador de `retratos/` (el nombre de archivo es el nombre real del jugador), lo más preciso y completo posible; la persona lo revisará y editará después. Mismo formato que el JSON actual. Las stats reflejan el prime del jugador, no su estado actual (p. ej. Messi, Cristiano Ronaldo y Neymar son GOAT y están entre las mayores medias). 2) Sumario para la fase 0.1: faltan 50 jugadores para completar los 300 de Core; informar de las posiciones/demarcaciones y rarezas de los 250 para decidir qué 50 añadir (p. ej. «necesitamos 7 porteros», «necesitamos 3 laterales derechos», «tenemos 30 GOAT, necesitamos 5 más»). Los 50 restantes se tratan en una fase posterior."

## Contexto

La colección Core del juego tiene hoy 300 cartas de datos ficticios (`data/core.json`, ids 1 a 300) con siluetas
genéricas. Esta fase empieza a sustituirlas por futbolistas reales: 250 jugadores de los que ya hay retrato. Los 50
que faltan para llegar a 300 se elegirán en una fase posterior, guiada por el sumario que produce esta.

Términos usados en esta spec:

- **Rareza** = **nivel** de la carta: Superclase, Épico, Legendario y GOAT.
- **Demarcación**: POR, DEF, MED o DEL. **Posición**: las 16 casillas del campo (POR, LI, LD, DCI, DCD, CI, CD, MD,
  MC, MII, MID, MCO, DC, SD, EI, ED).
- **Reparto objetivo de Core**: la distribución de 300 cartas por demarcación y nivel ya fijada en el juego:

  | Demarcación | Superclase | Épico | Legendario | GOAT | Total |
  |-------------|-----------:|------:|-----------:|-----:|------:|
  | POR         | 14         | 8     | 7          | 3    | 32    |
  | DEF         | 44         | 22    | 22         | 12   | 100   |
  | MED         | 44         | 22    | 22         | 12   | 100   |
  | DEL         | 30         | 15    | 15         | 8    | 68    |
  | **Total**   | **132**    | **67**| **66**     | **35**| **300** |

- **Bandas de media por nivel** (las del catálogo actual, que el motor y el equilibrado ya asumen): Superclase
  70–79,9; Épico 78–84,9; Legendario 83–89,9; GOAT 88 o más.

## Clarifications

### Session 2026-10-29

- Q: ¿Qué ids llevan los 250 jugadores reales? → A: Reutilizan los ids 1–250 de la Core ficticia (sustitución uno a uno); los 50 de la fase siguiente ocuparán 251–300.
- Q: ¿Las fichas reales entran ya en el catálogo Core en uso? → A: Sí: las cartas 1–250 de `data/core.json` pasan a ser las reales y las 251–300 siguen siendo ficticias hasta la fase siguiente.
- Q: ¿Qué se hace con las nacionalidades que no están entre las selecciones del juego? → A: Se amplían las selecciones del juego, con bandera y escudo, con todos los países que aparezcan en los 250, dentro de esta fase.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fichas reales de los 250 jugadores (Priority: P1)

La persona responsable del catálogo recibe un fichero de datos con los 250 futbolistas de los retratos: nombre y
apellidos reales, nombre de carta, nacionalidad, fecha de nacimiento, altura, demarcación, posiciones, una historia
breve, seis stats propias de su demarcación, media, virtudes, defectos, nivel y las rutas de su retrato y su fondo.
Las stats y el nivel reflejan el mejor momento de su carrera. Con ese fichero puede revisar y retocar jugador a
jugador, en lugar de investigar y escribir 250 fichas desde cero.

**Why this priority**: es el entregable principal; el resto (retratos en las cartas, sumario) depende de él o lo
complementa.

**Independent Test**: abrir el fichero, comprobar que tiene 250 jugadores, que pasa la validación del catálogo del
juego sin errores, y revisar una muestra de 20 jugadores conocidos contra fuentes públicas (fecha de nacimiento,
nacionalidad, altura, posiciones).

**Acceptance Scenarios**:

1. **Given** los 250 retratos de `retratos/`, **When** se genera el fichero de datos reales, **Then** hay
   exactamente una ficha por retrato, y cada ficha se corresponde con el jugador cuyo nombre lleva el archivo.
2. **Given** el fichero generado, **When** se pasa por la validación del catálogo del juego, **Then** no hay ningún
   error (campos, nacionalidad, fecha, altura, posiciones, stats en 1–99, media igual al promedio, máximo de virtudes
   por nivel, virtudes permitidas por demarcación, máximo dos defectos, rasgos compatibles, ids únicos).
3. **Given** jugadores cuyo prime fue de élite mundial (p. ej. Messi, Cristiano Ronaldo, Neymar), **When** se revisan
   sus fichas, **Then** son GOAT y sus medias están entre las más altas del fichero, aunque hoy estén en declive o
   retirados.
4. **Given** un jugador joven que aún no ha alcanzado su techo, **When** se revisa su ficha, **Then** se valora por su
   mejor rendimiento demostrado hasta hoy (no por proyección), y la historia lo menciona.
5. **Given** una ficha cualquiera, **When** se compara su media con su nivel, **Then** la media cae dentro de la
   banda de ese nivel.
6. **Given** un dato que no se ha podido confirmar con seguridad (p. ej. la altura exacta o el día de nacimiento),
   **When** se revisa el fichero, **Then** ese jugador y ese campo aparecen en una lista de dudas para que la persona
   los verifique.

---

### User Story 2 - Retratos listos para las cartas (Priority: P2)

Los 250 retratos pasan de la carpeta de trabajo a la ubicación de recursos públicos del juego, con un formato,
tamaño y peso adecuados para mostrarse en la carta (tamaño normal y ampliado), con nombres de archivo estables y sin
tildes ni espacios. Cada ficha del fichero de datos apunta a su retrato.

**Why this priority**: sin retratos las fichas reales seguirían mostrando siluetas; pero el fichero de datos tiene
valor por sí solo para la revisión.

**Independent Test**: cargar en el entorno de pruebas de cartas una muestra de fichas con su retrato y comprobar que
se ve nítido en tamaño normal y ampliado, sin deformarse, y que el peso total de los retratos es bastante menor que
el de los originales.

**Acceptance Scenarios**:

1. **Given** los 250 originales (247 PNG y 3 JPG), **When** se adaptan, **Then** hay 250 retratos en un mismo
   formato, con las mismas proporciones y dimensiones, nombrados a partir del nombre del jugador en minúsculas, sin
   tildes, sin espacios y sin caracteres especiales (p. ej. `alexander-sorloth`).
2. **Given** un retrato con fondo transparente, **When** se adapta, **Then** conserva la transparencia; un retrato
   sin transparencia (los JPG) se muestra en la carta con el mismo encuadre que los demás.
3. **Given** una carta con retrato real, **When** se ve en tamaño normal y ampliado, **Then** la cara se ve nítida y
   centrada en el hueco de la imagen, sin estiramientos.
4. **Given** el fichero de datos, **When** se recorren sus rutas de `imagen`, **Then** todas apuntan a un retrato
   existente; ninguna queda rota ni sin usar.
5. **Given** la carpeta de originales `retratos/`, **When** termina la adaptación, **Then** los originales no se
   modifican (la persona decide después si los conserva fuera del repositorio).

---

### User Story 3 - Sumario para elegir los 50 jugadores que faltan (Priority: P3)

La persona recibe un informe que compara los 250 jugadores reales con el reparto objetivo de Core y dice qué falta,
en frases accionables: «necesitamos N porteros», «necesitamos N laterales derechos», «tenemos N GOAT, necesitamos M
más», además de los excesos (huecos que ya están llenos o sobrepasados) y qué jugadores convendría bajar o subir de
nivel si un nivel está sobrecargado.

**Why this priority**: es el insumo de la fase siguiente; se puede generar en cuanto existe el fichero de datos.

**Independent Test**: contar a mano en el fichero las cartas de una demarcación y un nivel, y comprobar que el informe
da la misma cifra y el mismo hueco respecto del reparto objetivo.

**Acceptance Scenarios**:

1. **Given** el fichero de 250 jugadores, **When** se genera el sumario, **Then** muestra una tabla demarcación ×
   nivel con lo que hay, lo objetivo y la diferencia, y la suma de los huecos positivos menos los excesos cuadra con
   los 50 que faltan.
2. **Given** el sumario, **When** se lee la parte de posiciones, **Then** indica cuántos jugadores pueden ocupar cada
   una de las 16 posiciones (contando posiciones secundarias aparte de la principal) y señala las que tienen poca
   cobertura para las formaciones del juego (p. ej. laterales, carrileros, mediocentros defensivos, extremos).
3. **Given** un nivel de una demarcación con más cartas de las del objetivo, **When** se lee el sumario, **Then** lo
   señala como exceso y propone qué jugadores, de los más cercanos al límite de la banda, se podrían recolocar.
4. **Given** el sumario, **When** se lee la lista final, **Then** hay una lista corta y priorizada de necesidades
   («faltan 3 GOAT DEF, preferiblemente centrales», «faltan 2 porteros Épicos»…) que permite elegir los 50 sin hacer
   cuentas.

---

### Edge Cases

- **Nombres ambiguos u homónimos** (p. ej. dos futbolistas con el mismo nombre): se elige el jugador de élite que
  encaja con el resto de la colección y se anota en la lista de dudas.
- **Nombres de archivo con caracteres especiales** (ø, é, ñ, ć…): el nombre de la ficha conserva la grafía real
  (con tildes, como dato visible); el nombre del archivo del retrato se normaliza sin tildes ni caracteres especiales.
- **Doble nacionalidad**: se usa la selección absoluta con la que ha jugado (o juega); si aún no ha debutado con
  ninguna, la de nacimiento, y se anota como duda.
- **País que no está entre las selecciones del juego**: se añade a las selecciones (FR-021), nunca se sustituye por
  otro país cercano.
- **Jugadores que jugaron en varias demarcaciones** a lo largo de su carrera (p. ej. un lateral reconvertido en
  extremo): la demarcación es la de su prime; las otras demarcaciones no se pueden reflejar, pero las posiciones
  afines sí, dentro de la demarcación elegida.
- **Retratos duplicados o del jugador equivocado**: se informa en la lista de dudas; no se descarta ningún retrato
  sin que la persona lo decida.
- **Más GOAT (u otro nivel) de los que admite el reparto**: el fichero refleja la valoración honesta de cada
  jugador; el exceso se señala en el sumario (no se degrada a nadie en silencio para cuadrar).
- **Jugadores retirados o muy jóvenes**: se valoran por el prime (retirados) o por el mejor rendimiento demostrado
  (jóvenes); la fecha de nacimiento es la real en ambos casos.

## Requirements *(mandatory)*

### Functional Requirements

**Retratos**

- **FR-001**: Los 250 retratos de `retratos/` DEBEN adaptarse a un único formato apto para la web, con transparencia
  donde el original la tenga, en unas mismas dimensiones y proporción acordes con el hueco de imagen de la carta, y
  colocarse en la carpeta de recursos públicos de las cartas, separada de las siluetas y fondos genéricos.
- **FR-002**: El peso total de los retratos adaptados DEBE ser como máximo la mitad del de los originales, sin
  pérdida de nitidez apreciable en la carta ampliada.
- **FR-003**: El nombre de archivo de cada retrato DEBE derivarse del nombre del jugador en minúsculas, sin tildes,
  sin espacios (separado por guiones) y sin caracteres especiales, y ser único.
- **FR-004**: Los originales de `retratos/` NO DEBEN modificarse.

**Fichero de datos reales**

- **FR-005**: DEBE generarse un fichero de datos nuevo con exactamente 250 fichas, una por retrato, con el mismo
  formato de carta que el catálogo actual (los campos de la plantilla de jugador del juego).
- **FR-006**: El fichero DEBE pasar la validación del catálogo del juego sin errores.
- **FR-007**: Los datos biográficos (nombre, apellidos, nacionalidad, fecha de nacimiento, altura) DEBEN ser los
  reales del jugador según fuentes públicas; `nombre_carta` DEBE ser el nombre con el que se le conoce (p. ej.
  «Lamine Yamal», «Neymar»).
- **FR-008**: La demarcación y las posiciones DEBEN ser las de su prime: la principal primero y, a continuación, las
  posiciones en las que haya jugado con regularidad, sin superar tres posiciones por jugador.
- **FR-009**: Las stats DEBEN reflejar el prime del jugador (el mejor tramo sostenido de su carrera), con las seis
  claves de su demarcación, y ser coherentes con su perfil (p. ej. un extremo rápido tiene velocidad y regate altos;
  un central de juego aéreo, anticipación y marcaje altos).
- **FR-010**: El nivel DEBE asignarse según la jerarquía real de los jugadores en su prime, y la media DEBE caer en la
  banda de su nivel. Los jugadores que en su prime estuvieron entre los mejores del mundo (Balón de Oro o finalistas,
  referentes de su época) DEBEN ser GOAT con las medias más altas.
- **FR-011**: Las virtudes y defectos DEBEN elegirse de los rasgos del juego, ajustados al estilo conocido del
  jugador (p. ej. un especialista en faltas con `LanzadorFaltas`, un jugador con historial de lesiones con `Fragil` o
  `DeCristal`), respetando los máximos por nivel; el reparto de defectos por nivel DEBE seguir la tendencia del juego
  (más proporción de cartas con defecto en los niveles bajos), y si se desvía DEBE decirse en el sumario.
- **FR-012**: La `historia` DEBE ser un texto breve en español (2–3 frases) con los hitos del jugador: clubes
  principales, títulos o rasgos que lo definen.
- **FR-013**: `imagen` DEBE apuntar al retrato adaptado del jugador; `imagen_bg` DEBE usar el fondo genérico de su
  demarcación.
- **FR-014**: Los ids DEBEN ser los enteros 1 a 250, únicos, para sustituir uno a uno a las cartas ficticias de Core
  con esos ids; los ids 251–300 quedan reservados para los 50 jugadores de la fase siguiente, y no hay choque con las
  cartas de prueba (301 en adelante).
- **FR-015**: DEBE entregarse una lista de dudas con cada jugador y campo que no se haya podido confirmar con
  seguridad, o que se haya decidido con un criterio discutible (homónimos, doble nacionalidad, demarcación
  cambiante, nivel en el límite).
- **FR-016**: Las 250 fichas reales DEBEN sustituir en el catálogo Core en uso (`data/core.json`) a las cartas
  ficticias con los mismos ids (1–250); las cartas 251–300 siguen siendo ficticias hasta la fase posterior. El juego
  sigue teniendo 300 cartas en Core; si el reparto por demarcación y nivel se aleja del objetivo, la carga del catálogo
  avisa pero no lo rechaza.

**Selecciones**

- **FR-021**: Las selecciones del juego DEBEN ampliarse con todos los países de los 250 jugadores que aún no estén.
  Cada selección nueva DEBE tener código propio de tres letras, nombre visible en español, bandera y escudo, y verse
  en la carta igual que las existentes.

**Sumario**

- **FR-017**: DEBE entregarse un sumario con la tabla demarcación × nivel (actual, objetivo, diferencia) respecto del
  reparto objetivo de Core.
- **FR-018**: El sumario DEBE contar, para cada una de las 16 posiciones, cuántos jugadores la tienen como posición
  principal y cuántos como secundaria, y señalar las posiciones con poca cobertura.
- **FR-019**: El sumario DEBE terminar con una lista priorizada de necesidades en lenguaje llano para elegir los 50
  jugadores que faltan (demarcación, nivel y posición preferida), y con los excesos y las propuestas de recolocación
  si alguno de los cupos se sobrepasa.
- **FR-020**: El sumario DEBE incluir el recuento por nacionalidad, para detectar selecciones con mucha o poca
  presencia.

### Key Entities

- **Retrato**: imagen de un futbolista real asociada a una ficha; nombre de archivo normalizado y ubicación pública.
- **Ficha de jugador real**: carta del catálogo con los datos reales de un futbolista y su valoración de prime
  (stats, media, nivel, rasgos).
- **Lista de dudas**: relación de jugador, campo y motivo de cada dato que la persona debe verificar.
- **Sumario de la fase 0.1**: recuento de la colección real frente al reparto objetivo de Core, cobertura de
  posiciones, nacionalidades y necesidades para los 50 jugadores restantes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El fichero tiene 250 fichas y la validación del catálogo da 0 errores.
- **SC-002**: En una muestra de 20 jugadores revisada contra fuentes públicas, al menos 19 tienen correctos fecha de
  nacimiento, nacionalidad y demarcación, y la altura está a ±2 cm de la publicada.
- **SC-003**: El 100 % de las fichas tiene la media dentro de la banda de su nivel.
- **SC-004**: El 100 % de las rutas de imagen del fichero corresponde a un retrato existente, y los 250 retratos se
  usan.
- **SC-005**: El peso total de los retratos adaptados es como máximo el 50 % del de los originales (13 MB).
- **SC-006**: La persona puede decidir los 50 jugadores que faltan leyendo solo la lista de necesidades del sumario,
  sin recontar el fichero.
- **SC-007**: Tras la sustitución, el catálogo carga sus 300 cartas sin errores, en el draft y en la colección se ven
  los jugadores reales con su retrato, y las pruebas existentes pasan (ajustando solo las que dependan de datos
  concretos de las cartas ficticias 1–250).
- **SC-008**: Todas las nacionalidades de los 250 jugadores existen como selección del juego, y en el 100 % de las
  cartas reales se ven su bandera y su escudo.

## Assumptions

- Sin rama propia: el trabajo se hace en `main`; los commits y el push los hace la persona (constitución, «Flujo de
  trabajo de desarrollo»).
- La rareza que pide la descripción es el nivel de la carta; las bandas de media por nivel son las del catálogo
  actual.
- El reparto objetivo de Core es el que el juego ya tiene fijado para 300 cartas; el sumario mide contra él.
- Los 250 jugadores son la base de la Core real y entran ya en el catálogo en uso (FR-016); los 50 restantes
  sustituirán a las ficticias 251–300 en la fase siguiente.
- Las cifras se elaboran a partir del conocimiento público disponible del jugador; son una propuesta razonada que la
  persona revisará, no datos oficiales.
- Los retratos son de uso del proyecto; esta fase no se ocupa de derechos de imagen ni de licencias de nombres
  reales.
- El fondo de cada carta es el genérico de su demarcación; los fondos propios (p. ej. para GOAT) quedan fuera de
  esta fase.
- El escudo de una selección nueva sigue el mismo estilo genérico que los escudos actuales del juego (no el escudo
  oficial de la federación).
