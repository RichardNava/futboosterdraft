# Contrato — Interfaz

Cambios sobre [003/contracts/ui.md](../../003-mejoras-ux-simulacion/contracts/ui.md), sujetos a
[docs/diseno/DESIGN.md](../../../docs/diseno/DESIGN.md) (spec 004). Textos visibles con tildes; identificadores sin
ellas.

## Carta de jugador (`CartaJugador`; FR-020 a FR-024; research R11)

- Dos filas fijas bajo los stats:
  - `carta-virtudes`: hasta 4 recuadros;
  - `carta-defectos`: hasta 2. Su altura se reserva aunque esté vacía, para que todas las cartas midan lo mismo.
- Recuadro de defecto (`carta-defecto`):
  - misma forma, tipografía y tamaño que el de virtud;
  - borde y texto con `--color-defecto` (rojo de juego, contraste ≥ 4,5:1, distinto de `--color-error`);
  - icono `defecto` antes del nombre.
- Al pulsar un rasgo se abre su descripción. Con un defecto, el encabezado es «Defecto · {nombre}», y con una virtud,
  «Virtud · {nombre}». El clic no elige la carta en el draft.
- Aplica a `CartaJugador`, `VistaCarta`, `FichaJugador`, `AperturaSobre`, `CartaMesa`, `CampoEquipo`, `GestionEquipo` y
  `Duelos`.
- `PruebasCartas` añade los casos «GOAT con 4 virtudes y 2 defectos» y «Superclase sin rasgos».

## Crear partida (`CrearPartida`; FR-060)

- «Modo de juego» muestra 4 opciones con icono: Liga, Playoff, Mixto y **Duelo de jugadores** (icono `duelo`: dos perfiles
  de cara enfrentados).
- Con Duelo de jugadores, los participantes posibles son 4, 8 y 16, y el resumen dice «Duelo de jugadores».

## Sala (`Sala` + `ConfigDuelos`; FR-061, FR-064a)

- Solo aparece en el modo duelos y antes del draft.
- **Anfitrión**: selector «Formación» (por defecto 4-3-3, con una miniatura de la formación) e interruptor «Estado de
  forma» (activado por defecto), con este texto de ayuda: «Cada jugador suma o resta hasta 2 puntos al azar en cada
  duelo».
- **Resto de participantes**: los mismos datos en modo de solo lectura, con la nota «Lo elige el anfitrión».
- Al cambiar algo, se guarda en el momento y se ve en todos los clientes.

## Formación en modo duelos (`Alineacion`; FR-063, FR-063a)

- Solo se muestra el `CampoEquipo` con la formación común y la lista de la plantilla para intercambiar jugadores.
- **No se muestran** las pestañas ni los paneles de táctica, dorsales, equipación, comportamiento, lanzadores, banquillo y
  colocación libre.
- El botón principal «Confirmar once» abre un `Dialogo`: «Este será tu once para todo el torneo. No podrás cambiarlo».
  Ofrece «Confirmar» y «Seguir editando».
- Una vez bloqueado, el campo se ve en modo de solo lectura con la insignia «Once confirmado».

## Torneo (`Torneo`)

- El cuadro de un torneo de duelos muestra el marcador como «Duelos 7–4».
- En los cruces propios con visionado pendiente, el botón principal es «Ver duelos».

## Duelos (`pantallas/Duelos.tsx`; FR-067; research R11)

- **Cabecera**: los nombres de los dos equipos y el marcador de duelos, que se actualiza en cada duelo.
- **Secuencia de los 11 puestos**, de portero a delanteros. En cada duelo:
  1. las dos cartas entran desde los lados (300 ms);
  2. chocan en el centro: escala 1,08 y destello de 120 ms;
  3. las puntuaciones cuentan hasta su valor (600 ms) con el desglose: media, posición, virtudes, defectos y, si está
     activo, Estado de forma;
  4. la ganadora queda resaltada y la perdedora atenuada. En un duelo nulo, las dos quedan neutras con el rótulo «Empate».
- **Controles**: «×1», «×2» y «Saltar al resultado», accesibles por teclado. El visionado se marca al terminar o al
  saltar.
- **Resumen final**: tabla con los 11 duelos (puesto, jugadores, puntuaciones y ganador), el desempate si lo hubo
  («Empate a duelos: gana por suma de puntuaciones» o «… por sorteo») y el botón principal «Volver al torneo».
- **`prefers-reduced-motion`**: sin desplazamientos ni choque; fundido de 150 ms entre duelos.
- Solo se animan `transform` y `opacity`.

## Partido (rápida y 2D; FR-044, FR-071)

- `ResumenEventos`:
  - icono `penalti` propio y texto con el resultado del lanzamiento;
  - evento `malestar`: «Malestar en el equipo: {jugador} ({defecto})» al activarse y «Se acaba el malestar» al
    desactivarse.
- 2D: rótulo «Penalti» al pitarlo y aviso informativo de malestar en la banda superior.
