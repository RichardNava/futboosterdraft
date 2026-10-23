# Data Model — Virtudes, defectos y nuevo modo de juego

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Research**: [research.md](./research.md)

Solo se describen las entidades nuevas o modificadas. El resto sigue como en
[001/data-model.md](../001-draft-manager-mvp/data-model.md) y [003/data-model.md](../003-mejoras-ux-simulacion/data-model.md).

## 1. Rasgos (dominio)

### 1.1 `Virtud` (antes `Special`)

Unión de identificadores sin tildes. Las 35 actuales (mismos identificadores) más 4 nuevas genéricas: `DeAcero`,
`Versatil`, `FairPlayer` y `Revulsivo`.

### 1.2 `Defecto` (nuevo)

`Agresivo | Impulsivo | Fragil | Fatigado | Polemico | Indisciplinado | Canchero | Rebelde | Torpe | Provocador |
DeCristal | Estrellita | Chupon | Inflexible | MalDefensor`. Todos genéricos.

### 1.3 `DefinicionRasgo` (nuevo, `catalogo/rasgos.ts`)

| Campo | Tipo | Regla |
|---|---|---|
| `id` | `Virtud \| Defecto` | único |
| `tipo` | `'virtud' \| 'defecto'` | |
| `ambito` | `'generico' \| 'POR' \| 'DEF' \| 'MED' \| 'DEL'` | los defectos y las 4 virtudes nuevas son `generico` |
| `nombre` | string | texto de la interfaz, con tildes (p. ej. «De cristal») |
| `descripcion` | string | texto de la interfaz para el participante |
| `efecto` | string | regla exacta en el partido (documento) |
| `activacion` | string | cuándo está activo |
| `acumulacion` | string | regla de acumulación (FR-016, 001/FR-038) |
| `incompatibles` | `Rasgo[]` | simétrica: si A excluye B, B excluye A (prueba) |
| `impacto` | number | 0..1, dos decimales. Virtud: 1 = más beneficiosa. Defecto: 0 = más perjudicial (FR-051) |

Valores iniciales: [contracts/rasgos.md](./contracts/rasgos.md).

### 1.4 `REPARTO_DEFECTOS` (nuevo)

Por `Nivel`: `{ conDefecto: number; conDos: number }`. Superclase `{0,15; 0}`, Épico `{0,25; 0,20}`, Legendario
`{0,35; 0,30}`, GOAT `{0,50; 0,40}`. `conDos` es la proporción dentro de las cartas que tienen algún defecto.

## 2. Jugador (carta)

| Campo | Cambio |
|---|---|
| `specials: Special[]` | **renombrado** a `virtudes: Virtud[]` |
| `defectos: Defecto[]` | **nuevo**; 0..2 (`MAX_DEFECTOS = 2`) |

**Validación** (`validarColeccion`; FR-013, FR-024 de la spec 001, FR-040):

| Código | Regla |
|---|---|
| `virtud_desconocida`, `virtudes_repetidas`, `virtudes_maximo`, `virtud_no_permitida` | antes `special_*` |
| `defecto_desconocido`, `defectos_repetidos`, `defectos_maximo` | nuevos |
| `rasgos_incompatibles` | alguna pareja de `incompatibles` en la misma carta |
| `reparto_defectos` | aviso de colección (no de carta): la proporción con defectos no crece con el nivel (±5 puntos) |

### 2.1 Versión de catálogo

`cartaEnVersion(jugador, version)`:

- **versión 1**: devuelve la carta con `defectos: []` y sin `DeAcero`, `Versatil`, `FairPlayer` ni `Revulsivo` en
  `virtudes`;
- **versión 2**: devuelve la carta tal cual.

## 3. Persistencia (migración `0010_virtudes_defectos`)

| Tabla | Cambio |
|---|---|
| `jugadores` | `RENAME COLUMN specials TO virtudes`; `ADD COLUMN defectos text[] NOT NULL DEFAULT '{}'` |
| `partidos` | `entrada`: reemplazo de la clave `"specials":` por `"virtudes":` (R3); `ADD COLUMN tipo text NOT NULL DEFAULT 'futbol'` con `CHECK (tipo IN ('futbol','duelos'))`; `ADD COLUMN duelos jsonb` |
| `partidas` | `ADD COLUMN version_catalogo integer NOT NULL DEFAULT 1`; `ADD COLUMN config_duelos jsonb`; `partidas_modo_ck` admite `'duelos'`; `partidas_num_participantes_ck` añade `(modo = 'duelos' AND num_participantes IN (4, 8, 16))` |
| `alineaciones` | `ADD COLUMN bloqueada boolean NOT NULL DEFAULT false` |

Las partidas nuevas se crean con `version_catalogo = 2` (constante `VERSION_CATALOGO_ACTUAL` del dominio). Tras la
migración se vuelve a cargar `data/core.json` con `pnpm seed` para rellenar los defectos y las virtudes nuevas.

## 4. Partido en curso (motor)

| Entidad | Campo | Cambio |
|---|---|---|
| `JugadorEnPartido` | `entroDesdeBanquillo: boolean` | nuevo; `true` al entrar por `sustituir()` (Revulsivo) |
| `EstadoMotor` | `malestar: { local: Defecto[]; visitante: Defecto[] }` | nuevo; defectos colectivos activos ahora (Polémico, Rebelde), para emitir el evento al cambiar |
| `EventoPartido` | tipo `malestar` | nuevo; `datos: { defecto, activo, jugadorId }` |
| `EventoPartido` | tipo `penalti` | `datos.resultado: 'gol' \| 'parada' \| 'fuera'` añadido al resolverse el lanzamiento |

## 5. Parámetros de equilibrado 4.0.0

Secciones nuevas u ordenadas de otra forma (detalle en [contracts/engine-api.md](./contracts/engine-api.md)):

- `virtudes`: antes `specials`, más `revulsivo` y `versatil`;
- `defectos`: nueva;
- `duelos`: nueva;
- `disciplina.factorFaltaArea`: nuevo;
- valores de `disciplina` y `lesiones` actualizados.

En las versiones 1.x a 3.x, las secciones nuevas toman valores neutros.

## 6. Modo Duelo de jugadores

### 6.1 `ConfigDuelos`

| Campo | Tipo | Por defecto | Regla |
|---|---|---|---|
| `formacion` | `FormacionId` | `'4-3-3'` | una de `FORMACIONES_IDS` |
| `estadoForma` | boolean | `true` | |

Se guarda en `partidas.config_duelos`. Solo la modifica el anfitrión y solo en el estado `buscando`.

### 6.2 Ciclo de vida de la partida (modo `duelos`)

```text
buscando ──(anfitrión: configurar formación y Estado de forma)──► buscando
buscando ──(empezar)──► en_draft         [config_duelos queda fija]
en_draft ──(fin del draft)──► en_torneo  [preparación: once en la formación común]
  preparación: alineación sin confirmar ──(confirmar o plazo vencido)──► alineación bloqueada
en_torneo ──(cuadro: ronda abierta → cruces resueltos → visionados)──► … ──► terminada
```

### 6.3 Cruce de duelos (`partidos` con `tipo = 'duelos'`)

`partidos.duelos` (jsonb):

```text
{
  formacion: FormacionId,
  estadoForma: boolean,
  duelos: [
    { casillaId, local: LadoDuelo, visitante: LadoDuelo, ganador: 'local' | 'visitante' | 'nulo' }  // 11 entradas
  ],
  ganados: { local: number, visitante: number },
  sumas: { local: number, visitante: number },        // centésimas
  desempate: 'duelos' | 'suma' | 'sorteo',
  ganador: 'local' | 'visitante'
}
LadoDuelo = { jugadorId, media, penalizacion, bonusVirtudes, malusDefectos, forma, puntuacion }   // centésimas enteras
```

`partidos.marcador` = `{ local: ganados.local, visitante: ganados.visitante }`; `estado` = `finalizado` al resolverse;
`resolucion` = `npc` si no hay humanos, y si no, `apertura`.

**Invariantes** (pruebas de dominio):

- son exactamente 11 duelos, uno por casilla de la formación;
- `ganados.local + ganados.visitante + nulos = 11`;
- con `estadoForma = false`, todos los `forma` valen 0;
- con `estadoForma = true`, `|forma| ≤ 200`;
- el mismo cruce y la misma semilla dan el mismo JSON.

### 6.4 Alineación bloqueada

En el modo `duelos`:

- `alineaciones.bloqueada = true` tras la primera confirmación;
- `formacion` = `config_duelos.formacion`;
- `suplentes = []`;
- `tactica`, `lanzadores` y `colocacion` con valores por defecto;
- los dorsales no se asignan.
