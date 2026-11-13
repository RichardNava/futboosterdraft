# Research: Mejoras del motor, navegación sin pestañeo y refactorización

Fase 0 del [plan](plan.md). Cada decisión cita los requisitos de la [spec](spec.md) que resuelve. Las rutas son del
monorepo.

---

## R1. Balón que se mueve solo (FR-001 a FR-003, SC-001)

**Causa localizada**: `packages/engine/src/acciones/animaciones.ts` → `recuperarSuelto()` abre una acción
`{ tipo: 'control', motivo: 'suelto', aId: recuperador }` y `espacio/balon.ts` → `moverBalon()` trata ese caso igual
que un saque: «rueda hacia su destino (o hacia quien va a por él)». Como `destinoBalon()` devuelve la posición del
jugador cuando hay `aId`, **el balón va al encuentro del jugador sin que nadie lo toque**. Pasa en tres sitios:

- tras un pase que el receptor aún no ha alcanzado (`volar` → `recuperarSuelto(ctx, aId, 1)`);
- tras una pérdida (`perder` → `recuperarSuelto` del recuperador) y en `RecuperadorTrasPerdida`;
- al empezar un `paso` en que el portador no tiene el balón (`paso` → `recuperarSuelto`).

La 2D no inventa movimiento: interpola en línea recta el balón entre fotogramas cada 2 ticks
(`apps/web/src/campo2d/interpolacion.ts`), así que dibuja fielmente lo que hace el motor.

**Decision**:

- El balón suelto **conserva la dirección y la velocidad con las que llegó** y frena con un rozamiento fijo
  (`espacio.rozamientoSuelto`, fracción por tick) hasta pararse. Se guarda su velocidad en
  `EstadoEspacio.velocidadBalon` (entera, en décimas por tick), que fijan `volar` y `conducir` al cerrar.
- `recuperarSuelto` abre su acción **sin `aId`** y el jugador corre hacia la **posición actual** del balón cada tick
  (`destinos[recuperador]` se actualiza en el bucle de `hasta`); la acción termina cuando el jugador llega
  (`LLEGADA`). Quien llega se queda el balón: si llega antes un rival, la posesión cambia (lo decide la carrera, con la
  velocidad del jugador, FR-002).
- Los saques (`reponer`) siguen rodando al punto del saque: es una reanudación reglamentaria (FR-001).
- Prueba `coherenciaBalon.test.ts`: en 20 partidos con semilla fija, para cada fotograma en que el vector del balón
  cambia (ángulo > 20° o arranque desde parado) dentro del campo, hay un jugador a ≤ `LLEGADA` + radio de chapa o una
  acción de reanudación abierta. Es la medida automática de SC-001; la revisión visual la completa (quickstart).

**Rationale**: arreglar la causa en el motor mantiene un único cálculo (FR-003, Principio V); una corrección en la 2D
escondería la incoherencia en la simulación rápida.

**Alternatives considered**: (a) dejar el balón parado en seco al terminar el vuelo: más simple, pero un pase que no
llega a nadie se clavaría en el césped; (b) suavizar en la 2D: prohibido por FR-003.

---

## R2. Mano a mano por posición (FR-004, FR-005, FR-007, SC-002)

**Situación actual**: `juego.ts` sortea `probabilidadManoAMano` (0,12) tras un pase al espacio que llega a la zona 5 o
un regate ganado en zona ≥ 4, y entonces `manoAMano()` conduce hasta 11 m y tira. Un atacante que de verdad queda solo
sin pasar por esos sorteos decide con los pesos normales (`pesosConEspacio`), que incluyen pases cortos hacia atrás.

**Decision**: nuevo módulo `acciones/manoAMano.ts`, puro, con dos funciones:

- `esManoAMano(estado, atacante, portador, entorno)`: el portador está en campo rival y **ningún rival de campo** está
  dentro del pasillo hacia la portería (segmento portador → centro de la portería ensanchado `manoAMano.pasilloM`)
  con `x` mayor que la del portador menos `manoAMano.margenAtrasM` (un defensa que viene por detrás y aún no le alcanza
  no cuenta). Solo el portero puede estar delante.
- `decisionManoAMano(...)` → `'tiro' | { pase: receptor } | 'conduccion'`, en el orden de FR-004:
  1. **Tiro** si la distancia a la portería ≤ `distanciaDisparo`, que crece con el remate del portador
     (`manoAMano.distanciaBaseM` + `manoAMano.distanciaPorRemateM` × (remate − 70) / 10) y con el portero adelantado
     (`porteroAdelantado`, ya existe; FR-007 y caso límite de la vaselina).
  2. **Pase** si hay un rival encima (`entorno.rivalEncima`) y un compañero **en paralelo o por delante** (x ≥ x del
     portador − `manoAMano.paraleloM`), **en posición correcta** (R4), **libre** (sin rival a < `LIBRE`) y con mejor
     ocasión: menor distancia a portería o mejor ángulo (`anguloTiro`) que el portador.
  3. **Conducción** hacia la portería en otro caso: tramo de `distanciaConduccion` hacia el punto de penalti, sin
     sorteo de éxito salvo que un rival le alcance (entonces es un duelo de conducción normal, caso límite).
- En `paso()`, antes de `elegirPonderado`, si `esManoAMano` se aplica la decisión. **Error de decisión** (FR-005):
  con probabilidad `manoAMano.errorDecision` × (1 − factor de visión) se vuelve a los pesos normales; el valor se fija
  para que SC-002 (≥ 80 % de tiros a distancia de disparo, < 2 % de pases atrás) se cumpla con margen. Es el mismo para
  todos los equipos (el motor no distingue humanos y NPC; los errores de nivel de los NPC siguen en `npc.errores`, que
  actúan fuera de la jugada).
- Se retiran `probabilidadManoAMano` y la función `manoAMano()` actual; Matador conserva su efecto («siempre tira» en
  la frontal tras pase al espacio o regate).

**Rationale**: detectar la situación por posiciones hace que se cumpla en todos los mano a mano, no solo en los que
salen del sorteo, y deja la regla testeable con posiciones preparadas (Independent Test de US2).

**Alternatives considered**: subir el peso del tiro en `pesosConEspacio` cerca de la portería: no evita el pase atrás ni
se puede probar contra la directriz.

---

## R3. Ida y vuelta sin sentido (FR-006, SC-003)

**Decision**: `EstadoPosesion.ultimoPase` ya guarda `{ de, a }` (se usa para contar paredes). En `receptorDePase`
(`acciones/receptor.ts`), si el último pase fue `X → portador`, el portador no está presionado (`!rivalEncima`) y el
pase anterior no ganó terreno (x del receptor ≤ x del pasador + `idaVuelta.avanceMinimoM`), **X se excluye** de los
candidatos. Sin otros candidatos, `planearPase` devuelve `null` y el portador conduce (comportamiento ya existente). Una
pared con presión (`rivalEncima`) sigue permitida: es una jugada legítima y cuenta en `paredes`.

Métrica nueva en el informe: secuencias A → B → A → B sin presión ni avance (SC-003 exige 0 de más de dos idas y
vueltas).

**Alternatives considered**: penalizar el peso del último pasador en lugar de excluirlo: no garantiza SC-003.

---

## R4. Fuera de juego por posición (FR-008 a FR-013, SC-004, SC-005)

**Situación actual**: `juego.ts` (pase al espacio) sortea `probabilidadFueraDeJuegoBase` (0,06) +
`tacticas.lineaAdelantada.fuerasDeJuegoProvocados` (0,18) y llama a `fueraDeJuego()` de `balonParado.ts`, que ya emite
el evento `fuera_de_juego` con el autor, suma `fuerasDeJuego`/`fuerasDeJuegoProvocados` y repone con falta.

**Decision**:

- Módulo puro `acciones/fueraDeJuego.ts`:
  - `penultimoDefensor(estado, defensor, lado)`: x (en coordenadas del atacante) del segundo rival más adelantado hacia
    su propia línea de gol, contando al portero.
  - `enFueraDeJuego(estado, atacante, receptor, balon)`: el receptor está en campo rival (x > mitad) **y** su x es
    mayor que la del balón **y** mayor que la del penúltimo defensor (estrictamente; «a la altura» es legal, FR-009).
    Tolerancia de igualdad `fueraDeJuego.toleranciaM` (≈ 0,3 m) para no pitar empates de redondeo.
- En `paso()`, **todo pase** de juego (`pase_corto`, `pase_largo`, `pase_espacio`, y el centro con su rematador) se
  evalúa con las posiciones **en el momento del pase** (antes de `volar`). Si el receptor está en fuera de juego, el
  pase se dibuja, se registra como pase no completado y se llama a `fueraDeJuego()` con reposición **desde la posición
  del infractor en el momento del pase** (hoy repone en una celda fija: se corrige, FR-010).
- Los saques de banda, puerta y esquina (`balonParado.ts`, `reponer`) no se evalúan (FR-009). Las faltas sí, como en el
  fútbol (no lo excluye la spec; un saque de falta es un pase).
- **Rechace** (caso límite): hoy un tiro parado termina en el portero, en córner o fuera; no existe el rechace a un
  atacante. `enFueraDeJuego` acepta una «foto» de posiciones para evaluarlo en el disparo si el motor lo añade, pero
  esta spec **no crea** el rechace (fuera de alcance).
- **Que la línea adelantada provoque más** (FR-011): sale de la colocación, que ya adelanta la línea con
  `espacio.lineaAdelantada`. Se retiran `probabilidadFueraDeJuegoBase` y `lineaAdelantada.fuerasDeJuegoProvocados`.
- **Atacantes que respetan la línea** (FR-012): en `espacio/objetivos.ts`, el destino de cada atacante sin balón se
  limita a x ≤ penúltimo defensor + holgura, con holgura `fueraDeJuego.holguraMaxM` × (1 − factor de desmarque o
  posicionamiento, que ya usa `llegadaAlArea`). Los buenos se quedan en la línea; los malos se pasan. Como la
  colocación sigue al balón con retraso (`velocidadBasculacion`), una línea que sube deja atrás a los lentos: de ahí
  salen los fueras de juego de la línea adelantada.
- **Receptores**: en `pesosReceptor` el peso de un candidato en fuera de juego se multiplica por
  `fueraDeJuego.pesoReceptor` × (1 − factor de visión del pasador) — el pasador «prefiere no darlo salvo error»
  (caso límite del compañero en paralelo).
- La 2D ya pinta el pitido y el saque del evento `fuera_de_juego` (spec 012); no cambia.

**Rationale**: la regla real simplificada que fija la spec (Assumptions), evaluada con las posiciones del motor, es
verificable por una persona (SC-005) y hace que la táctica cuente por su efecto espacial.

**Alternatives considered**: mantener el sorteo y sumarle la posición: duplica el mecanismo y viola FR-011.

---

## R5. Cansancio apreciable y energía (FR-014, FR-015, FR-019, SC-006)

**Situación actual** (`modificadores/cansancio.ts`): `cansancio` es la fracción de stats perdida, con tope fijo `0.6`
en el código; `degradacionPorMinuto` 0,004 ⇒ ≈ 0,10 al 90' (energía 83 %, apenas visible). Se aplica a todos los
atributos en `atributo()` como `× (1 − cansancio)`.

**Decision**:

- `cansancio.maximo: 0.6` pasa a parámetros (sin número mágico).
- **Energía** = `round(100 × (1 − cansancio / maximo))`; **penalización** = `round(100 × cansancio)`. Con el tope 0,6,
  energía 50 % ⇔ penalización 30 %, justo lo acordado (Clarifications). Una sola fuente: `energiaDe(estado, j)` en el
  motor (Assumptions: «sin una regla de cansancio aparte para la interfaz»).
- `degradacionPorMinuto` ≈ 0,011, **calibrado en el informe** para que un jugador sin rasgos termine el 90'
  (descuento incluido) con energía 45–55 % (SC-006). Con eso, la prórroga lleva a un jugador normal al tope (rojo) y
  Presión alta (inicio 55', ritmo × 1,25) termina el 90' en el tramo rojo-naranja; si el informe muestra que Presión
  alta pierde su sentido táctico, se baja `tacticas.presionAlta.cansancio` en la misma versión.
- Fatigado, Indisciplinado, Incansable y Motivador no cambian de forma: multiplican el mismo ritmo, así que el
  indicador los refleja sin código aparte (FR-019).
- Sección del informe «Cansancio»: energía media al 45', 75', 90' y 120' por perfil (normal, Presión alta, Fatigado,
  Incansable) y rendimiento (acierto de pase y duelos) antes del inicio frente a los 10 últimos minutos.

**Riesgo**: una penalización del 30 % en todos los stats puede mover goles por partido en el tramo final (FR-023). Se
mide en el informe junto con SC-009; si se sale, se ajusta `pendiente` o el reparto de pesos, no el objetivo de energía,
que es una decisión de la persona.

---

## R6. Energía hasta la interfaz (FR-016 a FR-018, FR-020, SC-007)

**Decision**:

- `MsgPartidoPausa` gana `energia?: { jugadorId, energia, penalizacion }[]` con todos los jugadores **en el campo** de
  los dos equipos en el tick de la pausa. Lo rellena `datosPausa()` (`apps/server/src/actores/partidoRapido.ts`), que
  ya usan la 2D y la rápida: así sale en todas las pausas de gestión (descanso, pre-prórroga, goles, incidencias) y en
  ninguna otra parte (FR-017). Opcional para no romper clientes con una pestaña abierta durante el despliegue.
- Los suplentes que no han jugado no vienen en la lista ⇒ sin indicador (FR-018). Un sustituto entra con `cansancio`
  0 (ya es así) ⇒ 100 % en la siguiente pausa. Un expulsado o lesionado no está en el campo ⇒ sin indicador.
- `GestionEquipo` pasa el mapa a `CampoEquipo`, que ya pinta distintivos por jugador en modo `partido`; el indicador va
  como un elemento más de la chapa (ver [contracts/ui.md](contracts/ui.md)).
- Tramos en una función pura `tramoEnergia(energia)` con test de los límites (80, 60, 40 y 20 pertenecen al tramo
  superior). La cara es un SVG propio de cinco expresiones; la legibilidad sin color la dan la expresión, el
  porcentaje y una ayuda (`title` + texto en el botón de ayuda de la gestión) con los tramos (FR-020).

**Alternatives considered**: calcular la energía en el cliente con el minuto y la táctica: duplicaría la regla y no
vería rasgos ni cambios de táctica (viola FR-019 y el Principio V).

---

## R7. Peso de las estadísticas (FR-021 a FR-023, SC-008, SC-009)

**Situación actual**: la frecuencia la deciden `decision.factores` (`factorStat`: `1 + k·(stat − 70)/10` acotado) en
`pesosConEspacio`; el éxito, `probabilidad({ base, atacante, defensor, pendiente })`. Los defensas no «intentan»
entradas: el duelo sale del rival más cercano según `radioIntervencion` (quite/anticipación).

**Decision** (todo en parámetros 7.0.0, nada en el código salvo donde falta el vínculo stat → frecuencia):

| Estadística | Frecuencia (intentos) | Acierto |
|-------------|-----------------------|---------|
| Pase | `factores.pase.k` y `vision.k` más altos | `pendientePase` más alta |
| Regate | `factores.regate.k` | `pendiente` general en regate |
| Remate | `factores.remate.k`; también dentro del área (hoy solo fuera) | probabilidad de gol del tiro (`tiro.*`) con más peso del remate |
| Defensa (quite) | `radioDe` con más peso del quite ⇒ más duelos defensivos | más peso del quite frente al regate/conducción; `factorFalta` baja con el quite (entradas más limpias) |
| Velocidad | rango `velocidadJugadorMin/Max` más abierto ⇒ llega antes a los sueltos (R1) | — |
| Físico | `factores.fisico.k` | peso en duelos de conducción |
| Portero | — | peso de la parada en `tiro` |

- Sección del informe «Peso de las estadísticas»: para cada estadística, serie A/B con `conStatsDesplazados` (ya existe
  en `tools/balance/src/equipos.ts`) de +15 puntos en los jugadores que la usan; mide intentos y tasa de éxito de la
  acción que gobierna con su error estándar; criterio SC-008: ≥ +10 % relativo en ambos (para velocidad, balones
  sueltos ganados; para portero, solo el acierto).
- SC-009 y FR-023: las comprobaciones existentes (goles por partido, goleadas, rasgos) se vuelven a ejecutar con la
  7.0.0; ninguna puede empeorar.
- Las constantes se fijan iterando con el informe; el plan no adelanta números que solo el informe puede decidir.

**Alternatives considered**: subir directamente la ventaja del equipo mejor en el resultado: descartado por la persona
(Clarifications: comportamiento, no porcentaje de victorias).

---

## R8. Navegación sin pestañeo: loaders del router (FR-024, FR-027, FR-028, SC-010)

**Situación actual**: `Rutas.tsx` ya usa `createBrowserRouter` (router de datos), pero cada pantalla carga en un
`useEffect` y devuelve `<PantallaCargando>` mientras tanto: al navegar se monta la pantalla nueva vacía, se ve el
esqueleto unos milisegundos y luego el contenido (el pestañeo).

**Decision**:

- Cada ruta con datos declara un `loader` que **espera** su contenido principal (devuelto por la caché de R9). React
  Router mantiene la pantalla anterior hasta que el loader resuelve (FR-024).
- `Marco` muestra `IndicadorNavegacion` cuando `useNavigation().state !== 'idle'` **durante más de 2000 ms**
  (`setTimeout` que se cancela al volver a `idle`). Una navegación abandonada la cancela el router (aborta el loader con
  `request.signal`) y el estado vuelve a `idle` o pasa a la nueva: el temporizador se reinicia y no queda indicador de
  la anterior (FR-028).
- Errores: el loader no lanza; devuelve `{ error }` y la pantalla pinta su aviso de error habitual (FR-027, escenario
  5). Sin `errorElement` nuevo.
- `PantallaCargando`/`Esqueleto` se quedan solo para la primera carga de la sesión (`ConSesion`) y para el directo de
  las pantallas con WebSocket (draft, partido), donde ya hay su propio estado.
- Primera carga de la aplicación: `HydrateFallback` mínimo (el fondo del `Marco`) con el mismo umbral de 2 s.

**Alternatives considered**: (a) mantener `useEffect` y retrasar el esqueleto 2 s: se seguiría viendo una pantalla en
blanco < 2 s, que es otra forma de pestañeo; (b) TanStack Query: resuelve la caché, pero es una dependencia nueva para
unas 80 líneas y no evita por sí sola montar la pantalla vacía; (c) `useTransition` manual en cada enlace: reimplementa
lo que ya hace el router de datos.

---

## R9. Caché y datos de decisión (FR-025, FR-026)

**Decision**: módulo `apps/web/src/api/cache.ts` (sin dependencias):

- `leer(clave, cargar, { fresco })`: si hay valor y **no** es `fresco`, lo devuelve al instante y lanza la revalidación
  en segundo plano (una sola en vuelo por clave); si no hay valor o es `fresco`, espera a `cargar()`.
- `useDato(clave)`: `useSyncExternalStore` sobre la caché; la pantalla se re-pinta cuando llega la revalidación, sin
  estado de carga (actualización «sin pestañeo»).
- `precargar(clave, cargar)`: lo mismo que `leer` sin esperar; lo llaman los enlaces de `BarraPrincipal` y de las
  listas en `onPointerEnter`/`onFocus` (FR-026). Solo para claves **no** frescas: precargar un dato de decisión no
  sirve (se pediría otra vez al navegar).
- **Claves frescas** (nunca se muestran desde la caché): saldo de fragmentos/monedas, estado de una partida en curso
  (sala, draft, plantillas, alineación, partido, torneo en marcha) y plazos/turnos. Las pantallas que muestran el saldo
  como dato secundario (cabecera) siguen con `estado/saldo.ts`, que ya se refresca tras cada compra.
- Invalidación: las mutaciones existentes (comprar, guardar perfil, crear partida…) llaman `invalidar(prefijo)`.
- La caché vive en memoria (se pierde al recargar): basta para «volver a una pantalla ya visitada en la sesión».

---

## R10. Inventario de pantallas (FR-024 a FR-026)

| Ruta | Datos principales | Caché |
|------|-------------------|-------|
| `/` Inicio | resumen de cuenta, partidas activas | resumen sí; partidas activas frescas |
| `/mis-partidas` | lista paginada | sí (página 1) |
| `/perfil` | perfil y equipaciones | sí |
| `/coleccion` | colección y catálogo | sí |
| `/tienda` | escaparate | escaparate sí; saldo fresco |
| `/partidas/nueva` | opciones, niveles de rareza y acceso | opciones sí; acceso/premium fresco |
| `/partidas/:id/{sala,draft,plantillas,alineacion,partido,torneo}` | estado de la partida | fresco |
| `/partidas/:id/reproduccion/:pid` | partido terminado | sí (inmutable) |

Las pantallas frescas también evitan el pestañeo: el loader espera (se mantiene la pantalla anterior) y solo pasan de
2 s si la red es lenta.

---

## R11. Código sin uso: knip (FR-029, SC-012)

**Decision**: `pnpm dlx knip` con `knip.json` en la raíz (workspaces: `apps/*`, `packages/*`, `tools/*`; entradas: los
`main`/`exports` de cada paquete, los `bin` y scripts de `package.json`, `vite.config`, los tests de Vitest y
Playwright). Detecta exportaciones, ficheros y dependencias sin uso. Se ejecuta sin añadirlo a `package.json`
(convención pnpm, sin `npx`). Las excepciones legítimas (p. ej. `PARAMETROS_V3` que solo usa un test de versión) se
declaran en `knip.json` con un comentario.

**Alternatives considered**: `ts-prune` (abandonado; no ve ficheros ni dependencias), `eslint` `no-unused-vars` (solo
dentro de un fichero).

---

## R12. Duplicados y comentarios (FR-029, FR-031, SC-012)

**Decision**:

- **Duplicados**: `pnpm dlx jscpd` con `.jscpd.json` (TypeScript/TSX, mínimo 8 líneas o 70 tokens, excluyendo tests,
  fixtures y JSON). El resumen de la refactorización (`specs/014-.../refactorizacion.md`, lo crea la implementación)
  lista cada duplicidad unificada y lo eliminado. Candidatas ya vistas: las constantes `RIVAL_ENCIMA`/`LIBRE` repetidas
  en `opciones.ts` y `receptor.ts`, `rivalDe` frente a `rival` de `estado.ts`, y los bucles «media de un atributo de los
  jugadores en el campo» de `juego.ts`.
- **Comentarios**: script `scripts/comentarios.ts` (se ejecuta con `pnpm tsx`, ya instalado) que recorre con la API de
  TypeScript cada fichero no de prueba y lista las declaraciones exportadas (funciones, clases, métodos públicos,
  componentes, `const` de función) sin comentario JSDoc delante. Sale con código ≠ 0 si hay alguna: es la prueba de
  SC-012. Las funciones internas no evidentes se revisan a mano (el script no puede juzgar «evidente»).
- Estilo: español, una o pocas líneas, qué hace y por qué cuando no es evidente; el mismo de los comentarios actuales.

**Alternatives considered**: `eslint-plugin-jsdoc` (`require-jsdoc`): dependencia nueva y más reglas de las que se
piden.

---

## R13. Equivalencia antes y después de refactorizar (FR-030, FR-032, SC-011)

**Decision**: al cerrar US5 se genera `packages/engine/tests/fixtures/huella-014.json` con un generador como el de la
005 (`generarEquivalencia005.ts`): 100 partidos (semillas 1–100, equipos de `tools/balance` variados en tácticas y
rasgos) con su lista de eventos, estadísticas y un hash de los fotogramas, y 20 drafts (semillas 1–20, 8 participantes
con NPC) con sus picks. `equivalencia014.test.ts` (dentro de `pnpm test:equivalence`) reproduce y compara. Durante
US7 el fichero **no se regenera**; cualquier diferencia es un fallo de la refactorización (caso límite de la spec).

---

## R14. Versión de parámetros y partidos antiguos (FR-022)

**Decision**: `PARAMETROS_V7` (7.0.0) en `parametros/index.ts`, por herencia de `PARAMETROS_V6_3` como las 6.x, con los
campos nuevos (`cansancio.maximo`, `espacio.rozamientoSuelto`, `manoAMano`, `idaVuelta`, `fueraDeJuego`) y sin
`probabilidadManoAMano`, `probabilidadFueraDeJuegoBase` ni `lineaAdelantada.fuerasDeJuegoProvocados`.
`parametrosActuales()` devuelve la 7.0.0. Como el **código** del motor cambia (no solo los parámetros), un partido 6.x
ya no se reproduciría igual: `VERSION_MAYOR_SOPORTADA` pasa a 7 y esos partidos muestran el resumen con el aviso que ya
existe (`AVISO_VERSION_ANTERIOR`, `ReproduccionPartido.tsx`). Los tests que crean partidos con 3.x–6.x pasan a la 7.0.0
o comprueban `VERSION_NO_SOPORTADA` (se actualizan en US1–US5, nunca en US7).

La versión se fija al preparar cada partido (`preparacion.ts`), no al crear la partida: los torneos en marcha juegan sus
partidos siguientes con la 7.0.0 sin hacer nada. Lo único afectado es un partido **a medias** durante el despliegue
(`partidoRapido.ts` y `partidoEntreHumanos.ts` devuelven `null` al rehacerlo con una versión menor): se despliega sin
partidos en juego, como en las versiones mayores anteriores.

**Alternatives considered**: ramas del motor por versión: mantendría dos motores dentro del mismo código, lo contrario
de lo que pide US7.
