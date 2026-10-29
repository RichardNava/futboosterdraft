# Research — Fase 0: Datos reales de la colección Core

## Estado de partida (comprobado en el código)

- **Retratos**: `retratos/` tiene 250 ficheros (13 MB).
  - 247 son PNG RGBA de 139 × 181 px.
  - 3 son JPG RGB de 139 × 181 px, sin transparencia: Erling Haaland, Lamine Yamal y Manuel Neuer.
  - El nombre del archivo es el nombre del jugador, con espacios y tildes.
- **Imagen de la carta**: `ImagenCarta` (`CartaJugador.tsx`) pinta un `.svg` como máscara. Cualquier otra imagen va en
  un `<img class="carta-silueta">`. Si falla, pasa a la silueta genérica.
  `.carta-silueta` (`cartas.css`) usa `aspect-ratio: 1`, `object-fit: contain` y `max-height: clamp(40px, 24cqi, 76px)`.
- **Validación**:
  - `validarJugador` exige `nacionalidad` en `SELECCIONES` y una ruta `^/cartas/…\.(svg|png|webp|jpg)$`.
  - `validarCatalogo` da **error** si Core no cumple `DISTRIBUCION_CORE` exactamente.
  - El esquema `player-data.schema.json` repite el enumerado de nacionalidades. `selecciones.test` exige que coincida
    con `SELECCIONES`.
- **Core ficticia** (`data/core.json`, versión `1.0.0`): ids agrupados por demarcación y nivel. Después del 250 solo
  quedan delanteros: DEL Superclase 251–262, Épico 263–277, Legendario 278–292 y GOAT 293–300. Al sustituir 1–250, las
  50 ficticias restantes son todas DEL.
- **Seed**: `cargarCatalogo` hace *upsert* por id. `informeColecciones` ya compara Core con `DISTRIBUCION_CORE` y avisa.
- **Selecciones**: hay 23 códigos (ISO alfa-3, más ENG, SCO, WAL y NIR). Las banderas son de `flag-icons` (MIT), en
  `public/banderas/<COD>.svg`. Los escudos están desactivados: `ESCUDOS_ACTIVOS = false` y no existe `public/escudos/`.
  `docs/despliegue.md` lo recoge como riesgo abierto de licencias.

## R1 — Herramienta para los retratos

- **Decisión**: un script de Python + Pillow 13 de un solo uso, fuera del repositorio (en el scratchpad del agente),
  como en la spec 007. Lee `retratos/`, escribe en `apps/web/public/cartas/retratos/` y no toca los originales (FR-004).
- **Razón**: Pillow ya está instalado y escribe WebP con alfa. El proyecto no tiene `sharp` y no se añaden dependencias.
  Es una conversión que se hace una sola vez.
- **Alternativas**:
  - `sharp` en `tools/fixtures`: añade una dependencia nativa para una tarea de una sola vez.
  - ImageMagick: no está instalado; el `convert` del PATH es el de Windows.

## R2 — Formato, tamaño y nombre del retrato

- **Decisión**:
  - **Formato y tamaño**: WebP con pérdida, calidad 90 y canal alfa (`method=6`), a 139 × 181, el tamaño original. No
    se amplía.
  - **Los tres JPG**: se convierten igual, sin alfa, y se anotan en `dudas.md` para que la persona aporte una versión
    con fondo transparente.
  - **Nombre**: un *slug* del nombre del archivo:
    1. NFKD y se quitan las marcas diacríticas;
    2. se sustituyen las letras que NFKD no descompone (`ø→o`, `æ→ae`, `ß→ss`, `đ→d`, `ł→l`, `ı→i`);
    3. se pasa a minúsculas;
    4. todo lo que no sea `[a-z0-9]` se convierte en `-`;
    5. se colapsan los guiones repetidos.

    Si dos nombres dan el mismo slug, el script se detiene (FR-003).
- **Razón**:
  - El hueco de la carta mide como mucho 76 px de alto. En la carta ampliada, con DPR 2, apenas pasa de 150 px, así que
    los 181 px nativos bastan.
  - Ampliar no añade nitidez.
  - WebP con alfa a calidad 90 deja cada retrato en unos 8–15 KB, unos 3 MB en total, muy por debajo del 50 % de SC-005.
- **Alternativas**:
  - PNG optimizado: pesa más y no garantiza el 50 %.
  - AVIF: Pillow no siempre lo trae y no aporta nada a este tamaño.
  - Quitar el fondo de los JPG automáticamente: daría bordes malos y no se pidió.

## R3 — Encaje del retrato en la carta

- **Decisión**: una regla CSS para las imágenes de mapa de bits del hueco superior,
  `.carta-silueta:not(.mascara) { aspect-ratio: 139 / 181; object-fit: contain; }`. Mantiene el alto máximo actual. La
  máscara SVG genérica no cambia.
- **Razón**: `aspect-ratio: 1` reserva un hueco cuadrado y el retrato vertical quedaría pequeño. Con la proporción del
  retrato, la cara ocupa todo el alto sin deformarse (US2-3). Basta una regla y ningún componente cambia.
- **Alternativas**:
  - `object-fit: cover` sobre el cuadrado: recorta la cabeza o los hombros.
  - Cambiar `ImagenCarta`: no hace falta.

## R4 — Cómo se redactan las 250 fichas

- **Decisión**: el agente redacta las fichas a partir del conocimiento público del jugador. Trabaja en 5 lotes de 50
  por orden alfabético de archivo. Al cerrar cada lote, valida (`validarColeccion`) y anota las dudas. Si un dato es
  incierto (día de nacimiento, altura, homónimos, doble nacionalidad), consulta fuentes públicas en la web. Si sigue
  sin confirmarlo, lo deja en `dudas.md`.
- **Razón**: FR-007 y SC-002 piden datos reales comprobables. Por lotes, cada entrega es revisable y la validación
  detecta pronto los errores de formato.
- **Alternativas**: un generador a partir de una API de datos de fútbol. Ninguna da «stats de prime» con nuestras
  claves, y además añadiría dependencias, claves de API y licencias.

## R5 — Criterio de valoración de prime

- **Decisión**:
  - **Nivel**: se elige primero, por la jerarquía del jugador en su mejor tramo sostenido (2–4 temporadas). Si es joven,
    por su mejor rendimiento demostrado hasta hoy.
    - **GOAT**: Balón de Oro, sus finalistas habituales o referentes mundiales de su puesto en su época. Media
      ≥ 88; Messi, Cristiano Ronaldo y Neymar, en 93–97.
    - **Legendario**: titulares de élite en grandes clubes o selecciones. Media 83–89,9.
    - **Épico**: titulares sólidos de primera división europea o internacionales habituales. Media 78–84,9.
    - **Superclase**: el resto. Media 70–79,9.
  - **Stats**: se reparten según el perfil (FR-009) y se ajustan para que la media caiga en la banda del nivel. La
    media se guarda como el promedio exacto (decimales permitidos, como en `core.json`). En las zonas donde dos bandas
    se solapan, el nivel decide.
  - **Rasgos**: las virtudes salen del estilo conocido, hasta `MAX_VIRTUDES[nivel]`. Las virtudes de MED solo pueden
    ir en un DEF si tiene CI o CD. Los defectos se ponen solo si están justificados (lesiones → `Fragil` o
    `DeCristal`, expulsiones → `Agresivo` o `Impulsivo`…). Se toma `REPARTO_DEFECTOS` como guía. Si la valoración
    honesta se desvía, el sumario lo dice (FR-011).
  - **Posiciones**: la principal primero y como máximo tres en total (FR-008).
- **Razón**: si el nivel va primero, las bandas no se contradicen con las stats (SC-003). Los rasgos con justificación
  hacen que la ficha se pueda revisar.

## R6 — Lista de dudas

- **Decisión**: `specs/008-datos-reales-core/dudas.md`, una tabla `id | jugador | campo | valor propuesto | motivo`.
  Se ordena por id e incluye:
  - los tres JPG sin transparencia;
  - los homónimos;
  - la doble nacionalidad;
  - los cambios de demarcación;
  - los niveles en el límite de su banda;
  - los datos sin confirmar.
- **Razón**: FR-015. Markdown se lee sin herramientas y no ensucia `core-real.json`, que debe pasar el esquema estricto
  de campos.

## R7 — Fuente de verdad y fusión con Core

- **Decisión**:
  - **Fuente**: `data/core-real.json` (`{ version, jugadores }`, mismo formato que `core.json`) es la fuente de las 250
    fichas. El seed no lo lee, para que no haya ids repetidos.
  - **Comando**: `pnpm --filter @fbd/fixtures core-real` (`tools/fixtures/src/coreReal.ts`):
    1. valida `core-real.json` con `validarColeccion` y exige exactamente los ids 1–250;
    2. comprueba que cada `imagen` existe en `apps/web/public` y que todos los retratos se usan (SC-004);
    3. sustituye esos ids en `data/core.json` y deja 251–300 como estaban;
    4. sube la versión de `core.json` a `2.0.0`;
    5. reescribe `specs/008-datos-reales-core/sumario.md`.

    Si algo falla, no escribe nada.
  - **Orden de ids**: se asignan por demarcación (POR, DEF, MED, DEL), después por nivel (de Superclase a GOAT) y
    después por nombre, como en la Core ficticia.
- **Razón**: la persona revisa y edita un fichero de 250 fichas (US1) y vuelve a lanzar el comando. Así `core.json`
  nunca se desincroniza. Reutiliza el patrón de `asignarRasgos.ts`, que ya reescribe `core.json`.
- **Alternativas**:
  - Editar `core.json` directamente: mezcla las 250 reales con las 50 ficticias y complica la revisión.
  - Que el seed lea `core-real.json` por encima de `core.json`: cambia el seed para algo temporal.

## R8 — El reparto de Core pasa de error a aviso

- **Decisión**: se quita de `validarCatalogo` el error `Core no cumple DISTRIBUCION_CORE`. El aviso ya existe en
  `informeColecciones` (seed) y no cambia. Las demás comprobaciones de colecciones siguen siendo errores. Se ajustan
  `validar.test` y `seed.test` (el «no avisa con core.json» pasa a «avisa y carga»).
- **Razón**: FR-016 pide expresamente que el catálogo cargue aunque el reparto se aleje del objetivo.
- **Riesgo**: el generador de sobres necesita bastantes cartas en cada celda de demarcación × nivel. Con un solo sobre
  sortea entre las celdas que tienen cartas, pero una mesa de 8 pide 24 sobres. Se comprueba con `generador.test`
  («no falla en 10 000 mesas de 8 con el core.json real»). Si falla, la necesidad que lo provoca va la primera en el
  sumario y se avisa a la persona antes de dar la fase por cerrada. Los cupos no cambian.

## R9 — Selecciones nuevas

- **Decisión**: por cada país de los 250 que aún no exista, se hace lo siguiente.
  - **`SELECCIONES`**: se añade su código ISO 3166-1 alfa-3 con el nombre en español y tildes. El orden es alfabético
    por código, como ahora.
  - **Esquema**: se añade el código al enumerado `nacionalidad` de `player-data.schema.json`.
  - **Bandera**: se copia de `flag-icons` (la misma fuente MIT, `flags/4x3/<alfa-2>.svg`) a
    `public/banderas/<ALFA3>.svg`.
  - **Reino Unido e Irlanda**: los países del Reino Unido mantienen su código propio. Irlanda es `IRL`.
- **Razón**: FR-021, con el mismo mecanismo y la misma fuente que las banderas actuales. `selecciones.test` ya protege
  la coincidencia entre el esquema y la tabla.

## R10 — Escudos de las selecciones nuevas

- **Decisión**: no se crean ficheros de escudo. Las selecciones nuevas siguen el mismo camino que las actuales:
  `rutaEscudo` devuelve `null` mientras `ESCUDOS_ACTIVOS = false`, y cuando se activen se espera
  `public/escudos/<COD>.svg` para todas.
- **Razón**: hoy ninguna carta muestra escudo (riesgo de licencias abierto en `docs/despliegue.md`). Que las
  selecciones nuevas se vean como las existentes (FR-021) significa lo mismo: bandera sí y escudo según el interruptor
  global.
- **Desviación que hay que comunicar**: SC-008 («se ven su bandera y su escudo») solo se cumple en la parte de la
  bandera mientras los escudos sigan desactivados en todo el juego. Se anota en `dudas.md` y en el informe final.

## R11 — Contenido y cálculo del sumario

- **Decisión**: `coreReal.ts` exporta una función pura, `sumarioCore(jugadores, distribucion)`, y el comando la
  convierte en Markdown. Calcula lo siguiente.
  1. **Tabla demarcación × nivel**: actual / objetivo / diferencia. Los huecos (diferencia > 0) y los excesos
     (diferencia < 0) se cuentan por separado. Se comprueba que `huecos − excesos = 50`.
  2. **Las 16 posiciones**: cuántos jugadores la tienen como principal (`posicion[0]`) y cuántos como secundaria. Se
     marca «poca cobertura» si las cartas que la cubren son menos que las casillas de esa posición en las formaciones
     del juego, multiplicadas por 8 participantes. Las casillas salen de `FORMACIONES`.
  3. **Nacionalidades**: recuento descendente. Se señalan las selecciones con 1 jugador y las que tienen más del 10 %.
  4. **Reparto de defectos por nivel**: frente a `REPARTO_DEFECTOS` (FR-011), con `proporcionDefectosPorNivel`.
  5. **Excesos**: por cada celda sobrecargada, los jugadores con la media más cercana al borde de su banda que se
     podrían recolocar en el nivel vecino con hueco.
  6. **Necesidades**: lista priorizada en frases llanas («Faltan 3 GOAT DEF, preferiblemente LD»). Se ordena por tamaño
     del hueco y la posición preferida es la de menor cobertura dentro de la demarcación.
- **Razón**: FR-017 a FR-020 y SC-006. La función pura lleva una prueba unitaria pequeña (US3: el recuento a mano
  coincide).

## R12 — Partidas en curso y versión del catálogo

- **Decisión**: `VERSION_CATALOGO_ACTUAL` no cambia. Tras el `pnpm seed`, las partidas que estén en curso ven las
  cartas nuevas con el mismo id. Se documenta en quickstart: conviene terminar o borrar las partidas de desarrollo
  antes de resembrar.
- **Razón**: el proyecto no está en producción. Un `cartaEnVersion` que reconstruya la Core ficticia obligaría a
  versionar 250 cartas para proteger partidas de prueba.
- **Alternativa**: guardar la Core ficticia como versión 2 del catálogo. Se descarta por coste y porque nadie lo ha
  pedido.

## R13 — Pruebas afectadas

- **Decisión**: se ejecuta `pnpm -r test` y se ajustan solo las pruebas que fijan datos de cartas ficticias concretas
  (SC-007). Candidatas:
  - `versionCatalogo.test`: compara las 300 cartas con `fixtures/core-004.json`. Pasa a comparar solo 251–300, o solo
    lo que la versión 1 cambia.
  - `datos006.test`.
  - `seed.test`.
  - `validar.test` (reparto de defectos de Core, SC-008 de la spec 005).
  - `packages/ai/tests/niveles.test` y `errores.test`.
  - `tools/balance/tests/referencia.test`.
  - `migracion-0011.test` (tabla GBR).

  Las pruebas de equilibrado que miden con Core se vuelven a medir. Si alguna se sale del objetivo, se informa sin
  tocar los parámetros, porque esta fase no es de equilibrado.
- **Razón**: las pruebas protegen reglas, no datos ficticios, salvo las de migración y versión, que se acotan a lo que
  sigue siendo cierto.
