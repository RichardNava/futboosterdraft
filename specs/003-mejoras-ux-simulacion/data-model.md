# Data Model — Mejoras de interfaz, simulación y experiencia de juego

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Research**: [research.md](./research.md)

Este documento recoge solo los **cambios** sobre los modelos de las specs anteriores:

- [001/data-model.md](../001-draft-manager-mvp/data-model.md)
- [002/data-model.md](../002-mejoras-mvp/data-model.md)

Convenciones:

- Los identificadores van en español sin tildes (CLAUDE.md).
- "(✚)" indica un campo o entidad nuevos, "(✎)" uno modificado y "(✖)" uno eliminado.

---

## 1. Parámetros de equilibrado 3.0.0 (`ParametrosEquilibrado`)

`packages/domain/src/parametros/v3.json`. Conserva todas las secciones de la 2.0.0 y cambia lo siguiente (R2 a R12). Los valores numéricos son iniciales y se calibran con `balance` (research R8).

| Sección / campo | Tipo | Valor inicial | Uso |
|---|---|---|---|
| `version` (✎) | string | `"3.0.0"` | `REGISTRO`; `versionMayor < 3` → `VersionNoSoportada` |
| `acciones.atraccionPasador` (✎) | número | 0,6 | atracción por el pase del receptor (R3) |
| `pases.distanciaCorto` (✚) | entero (décimas) | 1905 | 20 m |
| `pases.distanciaLargo` (✚) | entero | 3333 | 35 m |
| `pases.factorDireccion` (✚) | `{ adelante, lateral, atrasCorto, atrasLargo }` | `{1, 0.8, 0.5, 0.05}` | R3 |
| `pases.factorSinMotivo` (✚) | número | 0,15 | pase largo sin motivo táctico (R4) |
| `pases.factorConMotivo` (✚) | número | 1,3 | R4 |
| `pases.atraccionPasadorAcotada` (✚) | `[min, max]` | `[0.7, 1.6]` | R3 |
| `decision.factores` (✚) | `Record<'regate'\|'remate'\|'pase'\|'vision'\|'fisico', { k, min, max }>` | ver R9 | influencia de los stats en la elección |
| `decision.radioIntervencionPorPunto` (✚) | número | 0,04 | R9 |
| `decision.radioIntervencionMax` (✚) | número | 0,4 | R9 |
| `decision.conduccion` (✚) | `{ espacioMin, espacioMax, factorMin, factorMax, distanciaMin, distanciaMax }` | `{285, 1430, 6, 24, 400, 800}` | R5 |
| `tiro.pesoPorTramo` (✚) | `{ hastaM: number, peso: number }[]` | `[{11,60},{16.5,35},{25,5},{35,1}]` | R6; frontal calibrada para ~25 % de goles fuera del área (SC-002) |
| `tiro.anguloMinimoGrados` (✚) | entero | 6 | R6 |
| `tiro.anguloReducidoGrados` (✚) | entero | 15 | R6 |
| `tiro.pendienteDistancia` (✚) | número | 0,35 | término de la sigmoide por cada 10 m por encima de 11 m |
| `tiro.porteroAdelantadoM` (✚) | entero | 15 | permite tiros de > 35 m |
| `tiro.faltaDirectaTiro` (✚) | `{ distanciaMinM, distanciaMaxM, probabilidad }` | `{17, 30, 0.8}` | R7 |
| `tiro.autogol` (✚) | `{ despejeCentro, despejeCentroPorPuntoDefensa, desvio }` | `{0.012, 0.03, 0.02}` | FR-020, SC-003: propia puerta en despejes de centros (baja con la `defensa` del defensor) y en tiros desviados. Se calibra en T033 para el 1–3 % |
| `disciplina.probabilidadPenaltiPorFaltaEnArea` (✖) | — | — | sustituido por el criterio espacial (R7) |
| `disciplina.probabilidadFaltaDueloAereoArea` (✚) | número | 0,04 | R7 |
| `acciones.puerta.*` y `acciones.gol.*` (✎) | número | se recalibran | R6 a R8 |
| `asincrono.nivelDecisiones` (✎) | `'automatico'` | `"automatico"` | perfil sin errores (R12) |
| `draft.margenAnimacionS` (✎) | entero | 8 | FR-013 |
| `npc.errores` (✚) | ver §6 | — | R12 |

## 2. Partida (`ConfigPartida`, tabla `partidas`)

| Campo | Cambio | Detalle |
|---|---|---|
| `tipoSimulacion` / `tipo_simulacion` (✖) | eliminado | FR-034. La migración copia el valor a `participantes.ultima_modalidad` antes de borrar la columna (§9). |
| `dificultad` / `dificultad` (✚) | `'facil' \| 'normal' \| 'dificil'`, `NOT NULL DEFAULT 'normal'` | FR-038a (H14). `rellenarConNPC(cantidad, semilla, dificultad)` usa `NIVELES_RELLENO_POR_DIFICULTAD`: fácil → amateur e intermedio a partes iguales; normal → amateur, intermedio o avanzado al azar; difícil → intermedio y avanzado a partes iguales. Migración `0009_dificultad.sql`. |

`TipoSimulacion` se renombra a **`ModoSimulacion`** (`'rapida' | '2d'`) en `packages/domain/src/partida/partida.ts`, porque ahora es una propiedad del participante y del partido.

## 3. Participante (tabla `participantes`)

| Campo | Tipo | Cambio | Reglas |
|---|---|---|---|
| `nombre_equipo` | text NOT NULL | ✎ | 3–24 caracteres tras normalizar (§3.1). Es único por partida sin distinguir mayúsculas: índice único `(partida_id, lower(nombre_equipo))`. Se puede cambiar hasta que se abre el primer partido del torneo (FR-042). |
| `equipaciones` | jsonb | ✎ | formato v2 (§4) |
| `ultima_modalidad` | text NULL, check `in ('rapida','2d')` | ✚ | preselección del selector; `NULL` → `perfiles_usuario.ultima_modalidad` y, si tampoco hay, `rapida` (FR-032) |
| `derrota_vista_en` | timestamptz NULL | ✚ | marca de la pantalla de derrota vista (FR-041) |
| `campeon_visto_en` | timestamptz NULL | ✚ | marca de la pantalla de campeón vista (FR-041) |

### 3.1 Nombre de equipo (regla de dominio)

`packages/domain/src/equipo/nombreEquipo.ts`:

- `normalizarNombre(s)`: recorta los espacios del principio y del final y colapsa los espacios internos repetidos.
- `validarNombre(s, usados)` devuelve una lista de errores:
  - `NOMBRE_CORTO` (< 3), `NOMBRE_LARGO` (> 24) y `NOMBRE_VACIO` (solo espacios);
  - `NOMBRE_REPETIDO`, si coincide sin distinguir mayúsculas con otro equipo de la partida.
- `nombrePorDefecto(apodo, usados)`: `"Equipo de {apodo}"`, recortado a 24 caracteres. Si está ocupado, se añade ` 2`, ` 3`…
- Los NPC conservan `nombresNPC` (ya son únicos).

## 4. Equipación (`Equipacion` v2)

`packages/domain/src/equipo/equipaciones.ts` (FR-045 a FR-047, research R24).

```ts
type DisenoCamiseta = 'lisa' | 'rayas' | 'franjas' | 'banda' | 'mitades';

interface Equipacion {          // ✎ antes: { principal, secundario }
  diseno: DisenoCamiseta;
  /** 1–3 colores #rrggbb; colores[0] es el principal. */
  colores: [string] | [string, string] | [string, string, string];
}

interface Equipaciones { primera: Equipacion; segunda: Equipacion }   // sin cambios
```

| Función | Contrato |
|---|---|
| `principal(e)` (✚) | `e.colores[0]` |
| `colorDorsal(e)` (✚) | `colorDeContraste(principal(e))` |
| `pesosSuperficie(e)` (✚) | reparto por color según el diseño (tabla de R24); los pesos de los colores que faltan se suman a c1 |
| `parecido(a, b, p)` (✚) | `Σ wAᵢ·wBⱼ·[distanciaColor < p.equipaciones.umbralDistanciaColor]`, en [0, 1] |
| `chocan(a, b, p)` (✚) | `parecido ≥ 0,45` |
| `equipacionEnPartido(local, visitante, p)` (✎) | el local usa la primera; el visitante, la primera si no choca, si no la segunda, y si las dos chocan, una lisa ajustada con el color de `PALETA` más alejado de todos los del local (determinista) |
| `patronDiseno(e)` (✚) | regiones del diseño en coordenadas normalizadas: lo comparten el SVG `Camiseta` y la chapa de la 2D |
| `validarEquipaciones(e)` (✎) | errores `COLOR_INVALIDO`, `DISENO_INVALIDO`, `NUM_COLORES_INVALIDO` (1–3) y `EQUIPACIONES_PARECIDAS` (sustituye a `EQUIPACIONES_IGUALES`: la primera y la segunda no pueden chocar) |
| `desdeV1(json)` (✚) | `{ principal, secundario }` → `{ diseno: 'lisa', colores: [principal, secundario] }`; si ya es v2, lo devuelve igual |
| `equipacionesAleatorias(semilla, p)` (✎) | devuelve v2 lisas, como hoy |

## 5. Perfil de usuario (✚ tabla `perfiles_usuario`)

Solo para usuarios registrados (FR-032 y FR-042b). La tabla nace en la migración `0006` (US3) con `usuario_id`, `ultima_modalidad` y `actualizado_en`, para que US3 no dependa de US11. La `0008` (US11) añade `nombre_equipo` y `equipaciones` (§9).

| Campo | Tipo | Reglas |
|---|---|---|
| `usuario_id` | text PK, FK → `usuarios.id` ON DELETE CASCADE | — |
| `nombre_equipo` | text NULL | `validarNombre` sin la regla de unicidad |
| `equipaciones` | jsonb NULL | `Equipaciones` v2 válidas |
| `ultima_modalidad` | text NULL, check `in ('rapida','2d')` | se actualiza en cada `abrir` del usuario; preselecciona el selector en las partidas nuevas (FR-032) |
| `actualizado_en` | timestamptz NOT NULL | — |

**Uso**:

- Al unirse a una partida, si el perfil existe, se copian `nombre_equipo` y `equipaciones` al participante. Si el nombre está ocupado (sin distinguir mayúsculas), se usa `nombrePorDefecto` y la sala avisa (`nombreAjustado`).
- Cambiar el nombre o las equipaciones del participante no modifica el perfil.

## 6. Perfil de NPC (`PerfilNPC`, `@fbd/ai`)

`packages/ai/src/perfiles.ts` (✎) y `packages/ai/src/errores.ts` (✚), research R12.

```ts
type FamiliaError = 'draft' | 'alineacion' | 'colocacion' | 'formacion' | 'tactica' | 'lanzadores' | 'partido';

interface PerfilErrores {
  /** Probabilidad (milésimas) de cometer un error en cada decisión de la familia. */
  probabilidad: Record<FamiliaError, number>;
  /** Coste máximo de un error en puntos de fuerza de alineación (o de valor de carta en el draft). */
  costeMaximo: number;
  /** PRO: una decisión dudosa garantizada por draft (FR-037b). */
  dudosaPorDraft: boolean;
}

interface PerfilNPC { /* …campos actuales… */ errores: PerfilErrores }  // ✎
```

| Nivel | probabilidad (por familia, calibrada; ver checklists/calibracion-npc.md) | costeMaximo | dudosaPorDraft |
|---|---|---|---|
| amateur | 800 | 12 | no |
| intermedio | 600 | 10 | no |
| avanzado | 350 | 5 | no |
| PRO | 125 | 1,5 | sí |
| `automatico` (✚, solo para humanos ausentes) | 0 | 0 | no |

**Guardarraíl** (`esErrorAdmisible`): el error se descarta, y se mantiene la decisión correcta, si se da alguno de estos casos:

- la alineación resultante es inválida (001/FR-057);
- hay un portero fuera de la portería o un jugador de campo en ella;
- hay un cruce de demarcación con penalización > 0,2;
- la pérdida de fuerza supera `costeMaximo`.

Las probabilidades viven en `v3.json`, `npc.errores`, para poder calibrarlas sin tocar el código.

## 7. Partido

### 7.1 Partido (tabla `partidos`)

| Campo | Tipo | Cambio | Detalle |
|---|---|---|---|
| `modalidades` | jsonb NOT NULL default `'{}'` | ✚ | `{ [participanteId]: 'rapida' \| '2d' }`, fijado en el primer `abrir` de cada humano; no se cambia después (FR-035). No interviene en el cálculo. |

### 7.2 Estadísticas de equipo (`EstadisticasEquipo`) — añadidos

| Campo (✚) | Tipo | Definición |
|---|---|---|
| `pasesCortos` | entero | pases intentados de < 20 m |
| `pasesLargos` | entero | pases intentados de > 35 m |
| `pasesLargosAtras` | entero | pases de > 35 m desde el último tercio rival (x ≥ 6.667) hacia el campo propio (x < 5.000) |
| `tirosArea` / `tirosFrontal` / `tirosLejos` | entero | tiros por zona de remate (R6) |
| `golesPorTipo` | `Record<'jugada'\|'cabeza'\|'falta'\|'penalti'\|'propia', number>` | jugada = normal + lejano + manoAMano; `propia` = goles en propia puerta (suman al rival); sin contar la tanda de penaltis |
| `golesPorZona` | `Record<'area'\|'frontal'\|'lejos', number>` | — |

Se guardan con el resto de estadísticas del partido (JSONB).

### 7.3 Eventos de tiro y gol — `datos` ampliados

| Campo de `datos` | Tipo | Cambio |
|---|---|---|
| `tipo` | `TipoTiro` (`normal`, `cabeza`, `lejano`, `manoAMano`, `falta`, `penalti`, `propia` ✚) | `lejano` pasa a significar "fuera del área" (R6). `propia` solo aparece en `gol`: el autor es el defensor, el gol suma al rival y no cuenta como gol ni asistencia de nadie |
| `distancia` | entero (m) | ✚ distancia del remate al centro de la portería |
| `zonaRemate` | `'area' \| 'frontal' \| 'lejos'` | ✚ |

### 7.4 Métricas por jugador (`MetricasJugador`) — ✚, no se guardan

Solo con `avanzar(…, { metricas: true })` (research R11). No consumen números del PRNG.

```ts
interface MetricasJugador {
  regates: number; conducciones: number;
  tirosArea: number; tirosFrontal: number; tirosLejos: number;
  pases: number; pasesRompeLineas: number;
  intercepciones: number; entradasGanadas: number; recuperaciones: number;
  duelosGanados: number; conduccionesLargas: number; // conducciones de ≥ 15 m (SC-006)
}
// Salida: metricas?: Record<number /* jugadorId */, MetricasJugador>
```

### 7.5 Lote de decisiones (`partido.decisiones`) — mensaje, no entidad

Es una lista ordenada de `DecisionPartido`, sin cambios en sus tipos. Se valida todo o nada sobre una copia del estado (research R17).

## 8. Torneo

### 8.1 Eliminación (✚, derivada, no se guarda)

`packages/domain/src/torneo/eliminaciones.ts`:

```ts
type FaseEliminacion = 'liga' | 'octavos' | 'cuartos' | 'semifinal' | 'final';

interface Eliminacion { participanteId: string; fase: FaseEliminacion; jornada: number }

function eliminaciones(t: EstadoTorneo): Eliminacion[];
function eliminacionDe(t: EstadoTorneo, participanteId: string): Eliminacion | null;
function humanosEnCompeticion(t: EstadoTorneo, humanosActivos: readonly string[]): string[];
const ETIQUETA_FASE: Record<FaseEliminacion, string>;  // "Fase de liga", "Octavos de final", …
```

**Reglas** (FR-039):

- **Cuadro** (playoff, o fase final de un mixto): el perdedor de cada cruce con ganador queda eliminado con el `tipo` de su ronda.
- **Mixto**: al pasar de `fase: 'liga'` a `'eliminatoria'`, los participantes que no están en el cuadro quedan eliminados con la fase `liga`.
- **Liga pura**: `[]` siempre.

### 8.2 Vista del torneo por participante — añadidos

| Campo (✚) | Tipo |
|---|---|
| `miEliminacion` | `{ fase: FaseEliminacion; etiqueta: string } \| null` |
| `campeon` | ya existe (`{ id, nombre } \| null`); se muestra en la pantalla de campeón |
| `puedeSimularResto` | boolean: eliminado, sin humanos en competición y torneo sin terminar (FR-041a) |
| `pantallas` | `{ derrotaVista: boolean; campeonVisto: boolean }` |

### 8.3 Jornadas sin humanos en competición

`abrirSiguienteJornada` no programa plazos cuando `humanosEnCompeticion` está vacío, aunque haya varios humanos en la partida (Edge Case de R22).

## 9. Migraciones `0006` a `0008`

Para que cada historia se pueda entregar por separado, los cambios se reparten en tres migraciones:

| Migración | Historia | Pasos de la lista de abajo |
|---|---|---|
| `0006_modo_simulacion.sql` | US3 | 1a, 2 (solo `ultima_modalidad`), 3, 4 y 5 |
| `0007_pantallas_torneo.sql` | US10 | 2 (solo `derrota_vista_en` y `campeon_visto_en`) |
| `0008_identidad.sql` | US11 | 1b, 6 y 7 |

Cada una va dentro de una transacción. Los pasos:

1. Tabla `perfiles_usuario` (§5), en dos partes:
   - **1a** (`0006`): `CREATE TABLE perfiles_usuario (usuario_id text PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE, ultima_modalidad text NULL CHECK (ultima_modalidad IN ('rapida','2d')), actualizado_en timestamptz NOT NULL)`;
   - **1b** (`0008`): `ALTER TABLE perfiles_usuario ADD COLUMN nombre_equipo text NULL, ADD COLUMN equipaciones jsonb NULL`.
2. `ALTER TABLE participantes ADD COLUMN ultima_modalidad text NULL CHECK (ultima_modalidad IN ('rapida','2d')), ADD COLUMN derrota_vista_en timestamptz NULL, ADD COLUMN campeon_visto_en timestamptz NULL`.
3. `UPDATE participantes p SET ultima_modalidad = pa.tipo_simulacion FROM partidas pa WHERE p.partida_id = pa.id AND p.tipo = 'humano'` (Assumption de partidas ya creadas).
4. `ALTER TABLE partidas DROP CONSTRAINT partidas_tipo_simulacion_ck, DROP COLUMN tipo_simulacion`.
5. `ALTER TABLE partidos ADD COLUMN modalidades jsonb NOT NULL DEFAULT '{}'::jsonb`.
6. Convierte las equipaciones v1 a v2 (§4, `desdeV1`): `UPDATE participantes SET equipaciones = jsonb_build_object('primera', jsonb_build_object('diseno','lisa','colores', jsonb_build_array(equipaciones->'primera'->>'principal', equipaciones->'primera'->>'secundario')), 'segunda', …) WHERE equipaciones ? 'primera' AND NOT (equipaciones->'primera' ? 'diseno')`.
7. Elimina los nombres de equipo duplicados de una misma partida (sin distinguir mayúsculas) añadiendo ` 2`, ` 3`… a los repetidos, por orden de `id`. Después: `CREATE UNIQUE INDEX participantes_nombre_equipo_uq ON participantes (partida_id, lower(nombre_equipo))`.

La validación con personas añade `0009_dificultad.sql` (H14, FR-038a): `ALTER TABLE partidas ADD COLUMN dificultad text NOT NULL DEFAULT 'normal' CHECK (dificultad IN ('facil','normal','dificil'))`.

Los equipos sin nombre no existen, porque la columna ya es `NOT NULL`. Los partidos con `version_parametros` 2.x se tratan como no reproducibles (research R2), sin migración de datos.

## 10. Resumen de relaciones (añadidos)

```text
Usuario 1─0..1 PerfilUsuario ─ propone ─► Participante.nombre_equipo, Participante.equipaciones
Participante 1─1 ultima_modalidad ─ preselecciona ─► SelectorModo
Partido 1─* modalidades[participanteId]            (solo presentación)
EstadoTorneo ─ deriva ─► Eliminacion *─1 Participante
PerfilNPC 1─1 PerfilErrores ─ aplica (ai) ─► decisiones de draft, alineación y partido
Equipacion ─ patronDiseno ─► Camiseta (SVG) y chapa 2D
```
