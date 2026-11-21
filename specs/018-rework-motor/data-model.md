# Data Model: Rework del motor (spec 018)

## 1. Estado del motor

### `JugadorEnPartido`

| Campo | Tipo | Regla |
|---|---|---|
| `energia` | número, 0–100 | Sustituye a `cansancio`. Empieza en 100; los suplentes entran con 100 |
| `penalizacionFisica` | número, 0–54,5 | Derivado de `energia`; se actualiza siempre con ella |

### `PosicionMovil`

| Campo | Tipo | Regla |
|---|---|---|
| `sprint` | booleano opcional | Estaba en sprint en el paso anterior. Sirve para contar solo la entrada |

### `EquipoEstado`

| Campo | Tipo | Regla |
|---|---|---|
| `marcajeEstrella` | `{ estrellaId, marcadorId, activo } \| null` opcional | Del equipo con Individual. Se fija una vez; `activo = false` si sale uno de los dos |

### `EstadoMotor`

| Campo | Tipo | Regla |
|---|---|---|
| `ventajaBanda` | `{ lado, carril } \| null` opcional | Del equipo que recupera. La consume siempre su primera acción |
| `espacio.claveSaque` | texto opcional | Última clave de saque con objetivos calculados |

`estadisticas.cansancioMedio` se mantiene y vale la media de `1 − energia / 100` de los jugadores en el campo.

## 2. Reglas de energía

### Ritmo

```text
ritmo = ritmoRol(posición actual)
      × Incansable 0,70
      × Fatigado 1,30
      × Motivador 0,95 (si hay otro Motivador en el campo; no se acumula)
      × Individual 1,05
      × marcador de la estrella 1,15 (mientras dure ese marcaje)
```

### Tramos de fatiga

| Parte | General | Indisciplinado |
|---|---|---|
| 1.ª | `segundosEnParte > 1.800` | `> 1.500` |
| 2.ª | `segundosEnParte > 600` | `> 300` |
| Prórroga (ambas) | todo el tiempo | todo el tiempo |

El descuento sigue dentro del tramo en curso.

### Recuperación

| Momento | Recuperación | Con Motivador |
|---|---|---|
| Descanso | +10 | +15 si había un compañero Motivador en el campo al pitarse |
| Antes de la prórroga | +5 | +5 |
| Descanso de la prórroga | +5 | +5 |

Siempre con el tope de 100.

### Penalización física

| Energía | Puntos de penalización por punto perdido | Acumulado al final |
|---|---|---|
| 100 a 70 | 0,35 | 10,5 % |
| 70 a 45 | 0,50 | 23 % |
| 45 a 0 | 0,70 | 54,5 % |

| Tipo | Peso | Atributos |
|---|---|---|
| Física | 100 % | `velocidad`, `fisico`, `quite`, `aereo` |
| Técnica | 50 % | `pase`, `regate`, `remate`, `centro`, `tecnica`, `parada`, `desmarque`, `marcaje` |
| Mental | 25 % | `vision`, `anticipacion`, `liderazgo` |

## 3. Parámetros 9.0.0

`PARAMETROS_V9` parte de `PARAMETROS_V8`. `ParametrosMotor` es su tipo, con los bloques opcionales de versiones anteriores
ya obligatorios. Los valores marcados con **cal.** se fijan en la calibración.

```ts
fatiga: {
  inicioMin: { parte1: 30, parte2: 55 },
  gastoPorMinuto: 1,
  reparto: { rol: 0.8, acciones: 0.2 },
  recuperacion: { descanso: 10, preProrroga: 5, descansoProrroga: 5 },
  ritmoRol: { porteria: 0.2, defensa: 0.85, medio: 1.2, ataque: 0.95 },
  referenciaAcciones: { porteria, defensa, medio, ataque },   // cal.: puntos por minuto de tramo
  pesosAccion: { sprint, presion, regate, duelo },            // cal.
  umbralSprint,                                               // cal.: fracción de su velocidad máxima
  penalizacion: {
    tramos: [{ hasta: 70, pendiente: 0.35 }, { hasta: 45, pendiente: 0.5 }, { hasta: 0, pendiente: 0.7 }],
    tipo: { fisica: 1, tecnica: 0.5, mental: 0.25 },
  },
  rasgos: {
    incansable: 0.7,
    fatigado: 1.3,
    indisciplinado: { adelantoMin: 5, costeAccion: 1.5 },
    motivador: { ritmo: 0.95, recuperacionDescanso: 15 },
  },
}
```

| Bloque de `tacticas` | Valores 9.0.0 |
|---|---|
| `catenaccio` | `defensiva: 0.5`, zonas 4 y 5, sin centro ni tiro lejano; costes ofensivos sin cambios |
| `individual` | `ritmoEquipo: 1.05`, `ritmoMarcador: 1.15`, `bonusMarcaje: 6`, `malusEstrella: 5`, `companeros: 0.05`, `regate: 0.12` |
| `bandas` | `ventajaPerdida: 0.15`, `factorPaseEspacio: 0.9` |
| `vertical` | `costePase: 0.15` (pases largos y al espacio) |
| `bandasVertical` | `centro: 1.8`, `probabilidadBanda: 0.25` |
| `presionAlta` | Sin `cansancio`; los efectos de duelo no cambian |
| `lineaAdelantada` | `espacio.lineaAdelantada` (450 = 4,7 m) con y sin balón; riesgo actual |
| `pesos` y `avance` | Los multiplicadores hoy fijos en `formacionTactica.ts`, **con el mismo valor** |

Desaparecen en la 9.0.0: `tacticas.vertical` antiguo (`accionesBanda`, `pasesLargos`), `tacticas.combinativo.posesion`,
`individual.recuperacion`, `individual.vulnerableDesmarque`, `individual.cansancio`, `presionAlta.cansancio` y el bloque `cansancio`.

## 4. Perfil de los NPC

| Nivel | `umbralCansancio` actual | `umbralEnergia` de partida |
|---|---|---|
| Amateur | 1 (nunca) | 0 (nunca) |
| Intermedio | 0,35 | 42 |
| Avanzado | 0,28 | 53 |
| PRO | 0,22 | 63 |

Se cambia a un jugador si `energia < umbral`. Para Fatigado e Indisciplinado, `umbral' = 100 − (100 − umbral) × 0,75`.

## 5. Persistencia

Sin tablas ni columnas nuevas.

| Tabla | Cambio |
|---|---|
| `avisos` | Usa el tipo `partida_cerrada`, creado por la migración de la spec 017 |
| `ajustes` | Fila `cierre_motor_9`: `{ fecha, partidas, devoluciones }`. No es un ajuste editable ni entra en `AJUSTES_CONOCIDOS` |
| `movimientos_fragmentos` | Usa `devolucion_nivel_rareza` y su índice único por partida |

### Transiciones de la partida

```text
en_draft  ── cerrar_version ──▶ abandonada
en_torneo ── cerrar_version ──▶ abandonada
buscando  ── (no se cierra; jugará con la 9.0.0)
```

### Partidos de una partida cerrada

| Estado anterior | Estado final | Datos |
|---|---|---|
| `programado` | `programado` | Sin cambios; ya no se puede abrir |
| `primera_parte`, `descanso`, `segunda_parte`, `pre_prorroga`, `prorroga`, `penaltis` | `programado` | Se vacían `entrada`, `decisiones`, `eventos`, `estadisticas`, `marcador` e `iniciadoEn` |
| `finalizado` | `finalizado` | Sin cambios; conserva su resumen |

## 6. Informes

### Línea base (`linea-base-8.0.0.md`)

Por táctica y frente a un rival neutro: goles a favor y en contra, victorias, energía por rol al 45', 75' y 90', y coste por
partido. Incluye commit, semillas y número de partidos.

### Umbral aprobado (`informe-9.0.0.md`)

| Campo | Contenido |
|---|---|
| Comprobación | Identificador y descripción |
| Valor anterior | Umbral de la 8.0.0 |
| Valor medido | Con la 9.0.0 |
| Propuesto | Umbral nuevo |
| Motivo | Por qué cambia |
| Aprobación | Persona responsable y fecha |
