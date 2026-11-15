# Data Model: Peso individual de las estadísticas (spec 015)

Sin tablas ni migraciones nuevas. Cambian tipos del dominio y del motor, los parámetros versionados y seis cartas del
catálogo de Core.

## 1. Carta de jugador (`@fbd/domain`, `catalogo/tipos.ts`)

Sin stats nuevas: siguen siendo seis por demarcación.

- **Virtudes por demarcación**: Cabeceador sale de `VIRTUDES_DEL` y pasa a `VIRTUDES_CAMPO = ['Cabeceador']`.
  `virtudesPermitidas` la añade a DEF, MED y DEL, nunca a POR.
- **Validación**: una carta POR con Cabeceador es un error de validación. Las seis cartas de FR-010 conservan su número
  de virtudes, porque cambian una por otra.

## 2. Rasgo (`catalogo/rasgos.ts`)

| Rasgo | Cambia | Antes | Ahora (con parámetros 8.0.0) |
|---|---|---|---|
| Cabeceador | ámbito | `DEL` | `campo` (nuevo valor de `AmbitoRasgo`, etiqueta «Jugador de campo») |
| Cabeceador | efecto | +0,15 al gol de cabeza; +10/+6 al elegir rematador | Lo mismo, más ±0,15 en todos los duelos aéreos de las dos áreas, en ataque y en defensa (research R5) |
| Presionador | efecto | −0,08 al portador al presionar; presión extra | Lo mismo, más +0,05 al multiplicador del quite (research R3) |
| Mal defensor | efecto | peso de candidato ×0,65 | Lo mismo, más −0,05 al multiplicador del quite |

Los textos `descripcion` y `efecto` se actualizan, y `virtudes-y-defectos.md` se regenera a partir de ellos.

## 3. Versión del catálogo (`catalogo/versionCatalogo.ts`)

- `VERSION_CATALOGO_ACTUAL`: 2 → **3**. Las partidas nuevas se crean con la 3.
- `VIRTUD_CEDIDA_015: Record<number, Virtud>` = { 60: MuroDefensivo, 76: Volador, 77: Potente, 86: Intimidante,
  87: Aura, 275: Potente }.
- `cartaEnVersion(j, v)`:
  - v ≥ 3: la carta tal cual.
  - v = 2: si `j.id` está en el mapa, cambia Cabeceador por la virtud cedida.
  - v = 1: hace lo mismo y además lo que ya hacía (quita las virtudes de la 005 y los defectos).

## 4. Atributo de partido (`@fbd/engine`, `modificadores/atributos.ts`)

`Atributo` gana tres valores: `marcaje`, `tecnica` y `liderazgo`. La traducción recibe la carta (para las posiciones y
los rasgos del quite) y los parámetros. Con un bloque de parámetros ausente, el atributo correspondiente vale lo
mismo que en la 7.0.0.

| Atributo | POR | DEF | MED | DEL | Bloque |
|---|---|---|---|---|---|
| quite | defensa | tackling × mult | (posicionamiento + velocidad) / 2 × mult | (agresividad + velocidad) / 2 × mult | `quite` |
| desmarque | — (no se le marca) | velocidad | visión | desmarque | `desmarque` |
| marcaje | 50 | marcaje | posicionamiento | agresividad | `desmarque` |
| tecnica | distribución | técnica | técnica | (regate + creatividad) / 2 | `controlPresion` |
| liderazgo | liderazgo | liderazgo | 0 | 0 | `liderazgo` |
| aéreo (DEF) | | anticipación (sin cambio) | | | — |

`mult` = base por demarcación (DEF 1,00; MED con MD en `posiciones` 0,92; MED sin MD 0,87; DEL 0,80) + 0,05 por
Presionador − 0,05 por Mal defensor.

Orden de los modificadores sin cambios (FR-017): stats base → posición → bonificaciones en puntos → **traducción** →
cansancio → defectos de equipo.

## 5. Duelo (`acciones/duelo.ts`)

La fórmula no cambia. La base y m de cada acción se leen de `parametros.duelos[accion]` si existe; si no, de
`acciones.*` y `pendientePase` como en la 7.0.0. Se añaden dos duelos que no son acciones del portador:

| Duelo | Atacante | Defensor | Cuándo | Si gana el atacante | Si pierde |
|---|---|---|---|---|---|
| Desmarque | `desmarque` del receptor | `marcaje` del marcador | Antes de cada pase a un compañero con marcador a ≤ `radioMarcaM` | Recibe libre: +`bonusLibre` en el pase, sin control | Marcado: −`penalizacionMarcado` en el pase; si llega, hay control |
| Control con presión | `tecnica` del receptor | `quite` del marcador | Pase completado a un receptor marcado | Conserva el balón | Pérdida (`perder`) |

## 6. Estado del motor

- **Plan del pase**: añade `marcadorId: number | null` y `libre: boolean`, transitorios dentro de la resolución del
  pase (no se guardan en el estado entre ticks).
- **Línea defensiva** (`objetivos.ts`): el x objetivo de cada defensa se corrige según `liderDeLinea`. No hay estado
  nuevo, porque se calcula por tick con la línea que ya existe.

## 7. Métricas por jugador (`tipos.ts`, `MetricasJugador`)

Se añaden contadores para el informe. No viajan en el protocolo ni cambian los eventos del partido.

| Métrica | Se anota a | Mide |
|---|---|---|
| `duelosDesmarque` | receptor | Duelos de desmarque jugados |
| `recibidoLibre` | receptor | Duelos de desmarque ganados (o recepciones sin marcador) |
| `marcajesGanados` | marcador | Duelos de desmarque ganados por el marcador |
| `controlesPresion` | receptor | Controles con presión |
| `controlesPerdidos` | receptor | Controles con presión perdidos |
| `duelosAereos` | cada participante | Duelos aéreos disputados (balón parado, remate de cabeza tapado, centro en el área) |
| `aereosGanados` | ganador | Duelos aéreos ganados |
| `habilitaciones` | defensa rezagado | Fueras de juego que su posición deshace (research R9) |

Las métricas que ya existían (`regates`, `regatesGanados`, `conducciones`, `conduccionesGanadas`, `golesCabeza`…) no
cambian.

## 8. Parámetros de equilibrado 8.0.0 (`parametros/index.ts`)

`PARAMETROS_V8 = { ...PARAMETROS_V7, version: '8.0.0', duelos, quite, aereo, desmarque, controlPresion, liderazgo,
decision.factores.regate }`. La forma y los valores de partida están en [contracts/motor.md](contracts/motor.md).
Registro: `REGISTRO['8.0.0']`; `parametrosActuales()` → V8; `VERSION_MAYOR_SOPORTADA` = 7 (research R1).

Añadidos (tanda 1b): `estrella`, `bandas`, `subidaArea` y `segundaLinea` (contracts/motor.md M1; research R12 a
R15), además de `disciplina.factorFaltaArea` 0,34 y `defectos.malDefensor` 0,5 (recalibrados en la tanda 1).

Transiciones por tanda: la tanda 1 fija `duelos`, `quite`, `aereo` y `factores.regate`; la tanda 2 añade `desmarque`
y `controlPresion`; la tanda 3, `liderazgo`. Entre tandas, `PARAMETROS_V8` se edita en el sitio, porque no se publica
ninguna versión intermedia.

## 9. Táctica (`@fbd/domain`, `equipo/tactica.ts`)

`ESTILOS_CON_BALON` añade `bandas` («Juego por las bandas», FR-027): `['equilibrado', 'contraataque', 'combinativo',
'bandas']`. Es compatible con todas las demás opciones (también con Juego vertical). La forma de `Tactica` no cambia,
así que las tácticas guardadas siguen siendo válidas; el esquema de `@fbd/protocol` (`http/alineacion.ts`) y el panel
de táctica de la web añaden el valor.
