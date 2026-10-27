# Research — Fase 0: Retoques visuales

Decisiones técnicas de la spec 007. Las que no surgen de una duda de la spec documentan cómo se aplica lo que ya está
decidido.

## Estado de partida (comprobado en el código)

- **Logo**: `componentes/arte/Escudo.tsx` (SVG dibujado a mano) se usa en cinco sitios:
  - la barra (`Marco.tsx`);
  - el menú (`MenuNavegacion.tsx`);
  - el dorso de las cartas en la apertura (`AperturaSobre.tsx`);
  - `CampoEquipo.tsx`;
  - `ResumenEventos.tsx`.

  El favicon es `public/favicon.svg`, con otro dibujo del mismo escudo.
- **Sobre**: `componentes/arte/SobreArte.tsx` (SVG dibujado a mano, prop `rasgado`) aparece en siete sitios: Inicio,
  CrearPartida, Sala, Draft, Tienda (×2) y AperturaSobre. La animación de apertura vive en CSS (`.sobre-cerrado`:
  `sobre-brilla`, `sobre-tiembla`, `sobre-rasga` con `clip-path`). No depende del contenido del SVG.
- **Carta**: `.carta.completa` tiene `aspect-ratio: 5 / 7` y crece en alto si los rasgos no caben. El acabado de cada
  nivel son variables CSS (`--carta-fondo`, `--carta-texto`…). La forma es un `clip-path` de escudo achaflanado. La foto
  por demarcación es una capa `ImagenCarta tipo="fondo"`. `--proporcion-sobre: 200 / 376` copia el alto real de las
  cartas.
- **Sonido**: hay seis efectos en `sonido/sonido.ts`:
  - tres en fichero WAV (`reparto`, `volteo`, `revelacion`);
  - tres sintetizados con Web Audio (`apertura`, `entradaDuelo`, `choqueDuelo`).

  Las ganancias están en `GANANCIA`.
- **Fondos**: `Marco.tsx` elige `background_<1..FONDOS_PANTALLA>.webp` (`FONDOS_PANTALLA = 5`). Los actuales miden
  1599 × 900 y pesan entre 65 y 92 KB.
- **Duelos**: la fase `resultado` dura 1480 ms a ×1 (`DURACION_FASE`). El estado de forma aparece en el desglose al
  entrar en esa fase (`Duelos.tsx`, `Desglose`).
- **Torneo**: la lista `pestanas` de `Torneo.tsx` siempre incluye `goleadores` y `asistentes`. `vista.modo` puede valer
  `'duelos'`.
- **Recursos de `temp/`**:

  | Fichero | Tamaño | Modo | Notas |
  |---------|--------|------|-------|
  | `carta_superclase.png` | 768 × 1152 | RGBA | |
  | `carta_epica.png` | 768 × 1152 | RGBA | |
  | `carta_legendaria.png` | 1024 × 1536 | RGBA | halo opaco alrededor del marco |
  | `carta_goat.png` | 1024 × 1536 | RGBA | halo opaco alrededor del marco |
  | `logo_fbd.png` | 1254 × 1254 | RGB | fondo negro |
  | `sobre_futbol_verde_2.png` | 1024 × 1536 | RGB | fondo negro |
  | `background_6..11.png` | 1672 × 941 | RGB | ~2 MB cada uno |

  Los cuatro marcos tienen el interior oscuro.

## R1 — SVG con imagen incrustada y script de preparación de un solo uso

**Decisión**: cada recurso gráfico nuevo (logo, sobre y cuatro marcos) es un SVG con un `<image>` cuyo `href` es un
`data:image/webp;base64,…`. Si hace falta recortar, el SVG lleva un `<clipPath>` con el contorno. Un script Python
(Pillow) de un solo uso, ejecutado desde el directorio temporal de la sesión, hace lo siguiente:

1. **Logo y sobre**: rellena por inundación el negro conectado con los bordes (tolerancia ≈ 24 sobre 255 por canal) y
   lo pasa a canal alfa, con un difuminado de 1 px en el borde. Después recorta a la caja del contenido.
2. **Marcos**:
   - detecta la caja del marco: las columnas y filas donde empieza el filo metálico;
   - recorta a esa caja;
   - escala a 600 × 900 (2 : 3) con `contain` y centra el resultado;
   - escribe en el SVG un `clipPath` poligonal con las esquinas achaflanadas del propio marco, que elimina el halo de
     Legendaria y GOAT.

   El polígono se mide una vez sobre las imágenes y se comparte entre los cuatro marcos, porque los cuatro tienen la
   misma silueta. Si la caja de un marco no es 2 : 3, sobra un margen transparente de pocos píxeles; el marco no se
   deforma.
3. **Codificación**:

   | Recurso | Tamaño | Calidad WebP | Límite |
   |---------|--------|--------------|--------|
   | Marcos | 600 × 900 | 80 | ≤ 150 KB por SVG |
   | Sobre | 600 px de ancho | 80 | ≤ 150 KB |
   | Logo | 256 × 256 | 85 | ≤ 40 KB |
   | Fondos (WebP sueltos, sin SVG) | 1599 × 900 | ~72, ajustada | ≤ 150 KB |

   Los fondos se generan con el mismo tamaño que los actuales y la calidad se ajusta hasta quedar por debajo del límite.

**Rationale**:
- La spec admite «una imagen optimizada contenida en el SVG» (Assumptions). Vectorizar foil, brillos y estadios
  degradaría el aspecto.
- Un SVG usado como `<img>` o como `background-image` no carga recursos externos, así que la imagen debe ir incrustada.
- El `clipPath` resuelve el recorte sin depender de que la transparencia de origen sea limpia.
- Pillow ya está instalado y tiene codificador WebP. El script solo se usa una vez porque `temp/` se borra (FR-021).
  Versionarlo dejaría código muerto apuntando a un directorio inexistente.

**Alternativas descartadas**:
- Vectorizar con potrace o vtracer: pierde degradados y brillos, y la spec rechaza una vectorización que degrade el
  aspecto.
- PNG o WebP sin SVG: incumple FR-002, FR-004 y FR-018.
- SVG que enlaza un WebP externo: no se pinta dentro de `<img>` ni de `background-image`.
- Versionar el script: depende de `temp/`, que desaparece.

## R2 — La carta compone sus datos sobre el marco, con proporción fija 2 : 3

**Decisión**:
- `.carta.completa` pasa a `aspect-ratio: 2 / 3`, con
  `background: url(/cartas/marcos/<nivel>.svg) center / 100% 100% no-repeat`.
- La ruta del marco se fija con una variable por nivel, `--carta-marco-img`.
- Se eliminan el borde, el `clip-path` de escudo, el grano y el `::after` con la franja diagonal: ahora los aporta el
  marco.
- El contenido se coloca dentro del área interior del marco con un `padding` en `cqi` (≈ 8 % lateral y ≈ 7 % arriba y
  abajo). La medida definitiva sale de la pantalla de pruebas de cartas.
- La carta ya no crece en alto, porque el marco no puede estirarse (FR-006b). La zona de rasgos conserva su alto fijo y
  su escala `--escala-rasgos`. Si en la pantalla de pruebas no caben cuatro rasgos en 2 : 3 al ancho mínimo (160 px),
  se reduce la escala de los rasgos de la carta completa; la proporción no cambia.
- La foto por demarcación (`ImagenCarta tipo="fondo"`) queda recortada al área interior (`inset` igual al `padding`),
  con `opacity` ≈ 0,35 y una máscara degradada hacia abajo. Así se distinguen la foto y el estadio del marco
  (clarificación 1).
- La selección (`.seleccionada`) deja el `inset` de 4 px, que ahora taparía el marco, y pasa a un
  `outline: 3px solid #b7ff2c` con `outline-offset: 2px` y un `drop-shadow` lima.

**Rationale**:
- Proporción del marco sin deformar (clarificación 2).
- Las variables por nivel ya existen: se sustituye su contenido sin cambiar la estructura de `CartaJugador.tsx`.

**Alternativas descartadas**:
- Mantener 5 : 7 y estirar el marco: lo prohíbe FR-006b.
- `<img>` del marco dentro del componente: añade un nodo y un `key` por nivel cuando una variable CSS basta.

## R3 — Texto, contraste y carta compacta

**Decisión**:
- Los cuatro niveles usan texto claro, con `--carta-texto: #ffffff` y un `--carta-texto-suave` teñido del color del
  marco. Los chips y las líneas pasan a blanco translúcido.
- La media y el nombre llevan `text-shadow: 0 1px 2px rgb(0 0 0 / 70%)` para que sigan legibles sobre los brillos del
  estadio.
- La carta compacta usa el mismo SVG como fondo (`background-size: cover`, centrado en la mitad superior del marco),
  con un velo `linear-gradient(rgb(0 0 0 / 55%), rgb(0 0 0 / 35%))`.
- El borde de la compacta toma `--carta-marco` con el color dominante de cada marco:

  | Nivel | `--carta-marco` |
  |-------|-----------------|
  | Superclase | plata `#b9c2cc` |
  | Épica | violeta `#a879ff` |
  | Legendaria | oro `#e0a82e` |
  | GOAT | rubí `#ff3d6e` |

  Este borde distingue el nivel en miniatura (SC-002).

**Rationale**:
- Los cuatro interiores son oscuros. Con texto claro y sombra, el contraste es ≥ 4,5 : 1 sobre la parte donde va el
  texto (FR-007).
- En miniatura el marco no se apreciaría entero. Su color en el borde y su textura de fondo bastan para reconocer el
  nivel.

**Alternativas descartadas**:
- Mantener el texto oscuro en Superclase y Legendaria: sobre los nuevos interiores oscuros sería ilegible.

## R4 — Logo y sobre por sus componentes actuales

**Decisión**:
- **`Escudo`** pinta `<img src="/marca/logo.svg" alt="" width={tamano} height={tamano} className={className}>`. Mantiene
  su API (`className`, `tamano`), así que sus cinco usos no cambian.
- **Favicon**: `index.html` apunta a `/marca/logo.svg` y se borra `public/favicon.svg`.
- **`SobreArte`** pinta `<img src="/cartas/sobre.svg" alt="" className="sobre-arte …">`.
  - Con `rasgado` añade la clase `rasgado`. Esa clase aplica un `clip-path: polygon(...)` con el borde superior
    irregular a la altura del sellado (≈ 7 % del alto), con los mismos dientes que el trazado actual.
  - Se elimina el reflejo `sobre-arte-holo`, porque el foil ya viene en la imagen.
  - `.sobre-cerrado svg` pasa a `.sobre-cerrado img`. Las animaciones `sobre-brilla`, `sobre-tiembla` y `sobre-rasga`
    no cambian.
- **`--proporcion-sobre`** pasa a la proporción del sobre recortado, medida por el script (≈ 0,60, se escribe como
  `ancho / alto` en píxeles).
  - En la apertura, el sobre mide 200 px de ancho y las cartas que salen de él también (2 : 3, 300 px de alto). El
    sobre, algo más alto (≈ 333 px), las contiene sin descuadre (FR-020).
  - Los usos de `--proporcion-sobre` fuera de la apertura (portada, sala y tienda) se revisan en la pantalla de pruebas.

**Rationale**: los dos componentes ya son el punto único de cada recurso (FR-001, FR-017). Cambiar su interior cubre
todas las apariciones de una vez.

**Alternativas descartadas**:
- Dos SVG, uno cerrado y otro rasgado: dobla el peso por una diferencia que un `clip-path` resuelve.

## R5 — Origen de los sonidos (CC0)

**Decisión**: los nueve efectos salen de grabaciones con licencia CC0 1.0. Fuente preferente: los paquetes de audio de
Kenney (kenney.nl, CC0), que se descargan directamente en zip. Los que no estén en Kenney se buscan en Freesound con el
filtro de licencia *Creative Commons 0*. La previsualización en MP3 de un sonido CC0 sigue siendo CC0.

| Efecto | Momento | Carácter buscado | Fuente orientativa |
|--------|---------|------------------|--------------------|
| `apertura` | Rasgado del sobre | Roce de papel o plástico grave, sin campanillas | Kenney *Casino Audio* / Freesound |
| `reparto` | Sale una carta | Deslizamiento de carta corto | Kenney *Casino Audio* (card slide) |
| `volteo` | Se gira una carta | Chasquido de carta suave | Kenney *Casino Audio* (card flip/place) |
| `revelacion` | Legendaria o GOAT | Acorde cálido o «whoosh» grave, sin agudos | Freesound |
| `entradaDuelo` | Entran las cartas | Soplo de aire grave | Kenney *Impact/Interface* |
| `choqueDuelo` | Chocan las cartas | Golpe sordo (*impact soft heavy*) | Kenney *Impact Sounds* |
| `ruletaForma` | Gira el estado de forma | Tic-tac de ruleta que se frena, ≈ 0,8 s | Freesound / Kenney *Interface* (clicks encadenados) |
| `aplausos` | Pantalla de campeón | Aplausos y vítores, 2–3 s, con fundido de salida | Freesound |
| `trompetas` | Pantalla de derrota | Trompetas decaídas («wah-wah»), 2–3 s | Freesound |

Cada fichero queda documentado en `public/sonidos/LICENCIA` con el nombre del fichero, el momento, el autor, la URL de
origen, la licencia (CC0 1.0) y los cambios aplicados (recorte, mono, normalización).

**Rationale**: es lo que decidió la clarificación 4 y lo que pide FR-015. Kenney evita depender de cuentas y su licencia
es inequívoca.

**Alternativas descartadas**:
- Seguir sintetizando: lo descarta la clarificación 4.
- Grabaciones CC BY: obligan a atribuir en la interfaz, y la spec pide CC0.

## R6 — Formato, recorte y volumen de los ficheros de audio

**Decisión**:
- **Formato**: MP3 mono, 22,05 kHz y 48 kbps CBR (64 kbps para aplausos si a 48 kbps suenan metálicos).
- **Tratamiento**: cada fichero se recorta al momento útil, con fundido de salida de 30–150 ms, y se normaliza a −3 dBFS
  de pico.
- **Graves**: se aplica un paso bajo a 6 kHz para quitar los agudos (FR-010, «sin picos agudos»).
- **Herramienta**: `pnpm dlx ffmpeg-static` en una sola pasada. No se añade como dependencia.
- **Volumen (FR-011)**:
  - se fija una ganancia base por efecto para que, normalizado, suene al nivel que tenía el efecto anterior equivalente
    (ajuste de oído en la pantalla de pruebas);
  - después todas se multiplican por `FACTOR_VOLUMEN = 0.8`;
  - en el código queda `GANANCIA[efecto] = BASE[efecto] * FACTOR_VOLUMEN`, para que el −20 % se vea.
- **Presupuesto (SC-004b)**: la duración total ronda los 9 s (aplausos 3 s, trompetas 2,5 s, el resto ≤ 0,8 s). A
  48 kbps eso son ≈ 55 KB, muy por debajo de 300 KB.

**Rationale**: MP3 lo decodifica `decodeAudioData` en todos los navegadores objetivo, incluido Safari. Vorbis y Opus no
están garantizados en Safari antiguo. Mono y 22 kHz bastan para efectos cortos.

**Alternativas descartadas**:
- OGG/Opus: soporte irregular en Safari.
- WAV: incumple «ficheros comprimidos» y el presupuesto.

## R7 — `sonido.ts`: solo ficheros y la reproducción se puede detener

**Decisión**:
- Se eliminan `SINTETIZADOS`, `ruidoRosa`, `nota` y los tres `sintetizar*`.
- `Efecto` incluye los nueve nombres de R5. `cargar` pide `/sonidos/${efecto}.mp3`.
- `reproducir(efecto)` devuelve `() => void`, que detiene la fuente si aún suena. Si no suena nada (silencio, sin audio,
  contexto bloqueado), la función no hace nada. Los usos actuales, que ignoran el retorno, no cambian.
- La preferencia, el desbloqueo y `useSonido` no cambian (FR-014).

**Rationale**:
- Al no haber síntesis, el módulo se reduce a cargar y reproducir.
- La parada es lo mínimo necesario para cortar la ruleta al saltar o al acelerar (US2, escenario 7).

**Alternativas descartadas**:
- Un gestor de sonidos activos con cola: no hace falta. Solo la ruleta puede quedar a medias, y la pantalla de duelos ya
  sabe cuándo se salta.

## R8 — Aplausos y trompetas, una vez por visita

**Decisión**: `PantallaCampeon` y `PantallaDerrota` llaman a `reproducir('aplausos')` y a `reproducir('trompetas')` en
un `useEffect` de montaje, protegido por un `useRef` para que el doble montaje de StrictMode en desarrollo no los
duplique. No se repiten mientras la pantalla siga montada. Al recargar empieza una visita nueva y vuelven a sonar una vez
(Edge Cases).

Si el audio aún está bloqueado, porque se llega por recarga sin interacción previa, no suena nada y no hay error. Es el
comportamiento actual de `reproducir`.

**Alternativas descartadas**:
- Recordar en `localStorage` que ya sonó: la spec pide una vez por visita, no una vez para siempre.

## R9 — Ruleta del estado de forma

**Decisión**: lógica pura en `componentes/secuenciaDuelos.ts`:

- `DURACION_RULETA_MS = 800`, a ×1. A ×2 dura 400 ms, igual que el resto de fases.
- `ruletaEn(i: Instante, velocidad): { girando: boolean; progreso: number }`. La ruleta ocupa el principio de la fase
  `resultado`: está girando mientras el tiempo de la fase sea menor que `DURACION_RULETA_MS / velocidad`, que siempre
  es menor que la fase (1480 ms a ×1).
- `valorRuleta(final: number, progreso: number, semilla: number): number`. Devuelve un valor que se ve mientras gira,
  dentro del rango posible de la forma con el mismo signo de formato. Cambia cada vez menos a medida que avanza el
  progreso, con desaceleración `1 − (1 − p)³`, y con progreso 1 devuelve exactamente `final`. Es determinista dada la
  semilla (índice del duelo y lado), así que se puede probar.
- Se elige `final` como valor de llegada para que la ruleta solo presente el `forma` calculado por el servidor
  (constitución IV).

En `Duelos.tsx`:

- La fila «Estado de forma» del desglose muestra `valorRuleta(...)` mientras gira.
- El total «Puntuación» y el realce del ganador esperan a que la ruleta se detenga, para no revelar el resultado antes.
- Al entrar en la ruleta suena `reproducir('ruletaForma')` y se guarda su función de parada. Esa función se llama en
  estos casos: cuando la ruleta termina (si el sonido dura algo más), al saltar, al cambiar de duelo y al desmontar.
- Con movimiento reducido o al saltar, `estadoForma` muestra el valor final directamente y no suena (FR-012).
- Sin estado de forma en el cruce (`estadoForma === false`), no hay ruleta.

**Rationale**:
- Sigue el patrón del fichero: la pantalla solo pinta lo que dice la función.
- Encaja en la fase existente sin alargar el cruce.

**Alternativas descartadas**:
- Añadir una fase `ruleta` a `FASES`: cambia `duracionDuelo` y los tiempos de todos los tests y e2e por una animación
  que cabe en la fase actual.
- Cambiar `playbackRate` del sonido a ×2: sube el tono una octava, en contra de FR-010.

## R10 — Pestañas del torneo y fondos

**Decisión**:
- En `Torneo.tsx`, las entradas `goleadores` y `asistentes` de `pestanas` se añaden solo si `vista.modo !== 'duelos'`.
  Es el mismo patrón que ya usa `clasificacion` con `playoff`. La pestaña activa solo cambia cuando se pulsa una de la
  lista, así que no puede quedar una pestaña oculta seleccionada.
- En `Marco.tsx`, `FONDOS_PANTALLA = 11`. Los ficheros nuevos `background_6..11.webp` van a `public/fondos/`.

**Rationale**: son cambios de una línea que siguen el patrón existente.

## Corrección a la spec

La spec (Assumptions) dice que hoy existen `reparto.wav`, `volteo.wav` y `revelacion.wav`. Es correcto: están en
`public/sonidos/` con su `LICENCIA`. Se eliminan al sustituirlos por los MP3.
