# Contrato — Resolución de duelos (`packages/domain/src/duelos/`)

Función pura, sin E/S y determinista (research R9). La usan el servidor (actor `duelos.ts`), la IA (alineación de duelos)
y `tools/balance` (comprobación `duelos`).

```ts
export interface ConfigDuelos { formacion: FormacionId; estadoForma: boolean; }

export interface OnceDuelos {
  participanteId: string;
  /** casillaId de la formación común → carta en la versión de catálogo de la partida. */
  titulares: Readonly<Record<string, Jugador>>;
}

export interface LadoDuelo {
  jugadorId: number;
  media: number;          // centésimas
  penalizacion: number;   // centésimas restadas por jugar fuera de posición
  bonusVirtudes: number;  // centésimas
  malusDefectos: number;  // centésimas (positivo; se resta)
  forma: number;          // centésimas, [-200, 200]; 0 con estadoForma = false
  puntuacion: number;     // centésimas: media − penalizacion + bonusVirtudes − malusDefectos + forma
}

export interface Duelo {
  casillaId: string;
  local: LadoDuelo;
  visitante: LadoDuelo;
  ganador: 'local' | 'visitante' | 'nulo';
}

export interface ResultadoCruce {
  formacion: FormacionId;
  estadoForma: boolean;
  duelos: Duelo[];                               // en el orden de las casillas (portero → delanteros)
  ganados: { local: number; visitante: number };
  sumas: { local: number; visitante: number };
  desempate: 'duelos' | 'suma' | 'sorteo';
  ganador: 'local' | 'visitante';
}

/** Puntuación efectiva sin Estado de forma (FR-064). */
export function puntuacionEfectiva(jugador: Jugador, casilla: Casilla, p: ParametrosEquilibrado): Omit<LadoDuelo, 'forma' | 'puntuacion'> & { base: number };

/** Resuelve un cruce completo (FR-064a, FR-065, FR-066). */
export function resolverCruce(local: OnceDuelos, visitante: OnceDuelos, config: ConfigDuelos, semilla: Semilla, p: ParametrosEquilibrado): ResultadoCruce;
```

## Reglas

1. `bonusVirtudes = round(100 × pesoVirtud × Σ impacto(v))`.
2. `malusDefectos = round(100 × pesoDefecto × Σ (1 − impacto(d)))`.
3. Con `estadoForma`, `forma = rng.entero(−100 × estadoForma, +100 × estadoForma)`. El `rng` se deriva de
   `derivarSemilla(semilla, 'duelos')`. Los sorteos van en el orden de las casillas: primero el local y después el
   visitante.
4. Si `puntuacion` es igual en los dos lados, el duelo es `nulo`.
5. Desempate del cruce, en este orden: `ganados`, `sumas` y un sorteo de 50 % con el mismo `rng`, después de los 22
   sorteos de forma.

## Errores

`resolverCruce` lanza un `ErrorDuelos` en estos casos:

| Código | Causa |
|---|---|
| `CASILLAS_INCOMPLETAS` | falta alguna casilla de la formación en alguno de los onces |
| `JUGADOR_REPETIDO` | el mismo jugador aparece en dos casillas |

El servidor nunca debería llegar a ninguno de los dos, porque valida la alineación al confirmarla.
