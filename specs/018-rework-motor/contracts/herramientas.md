# Contrato: herramientas de medida y CI

## `linea-base` (nueva)

```bash
pnpm --filter @fbd/balance linea-base -- --n 1000 --salida specs/018-rework-motor/linea-base-8.0.0.md
```

- Funciona con la 8.0.0 y con la 9.0.0, para comparar con las mismas semillas.
- Mide, por táctica y frente a un rival neutro: goles, victorias, energía por rol y coste por partido.
- Registra el commit, Node, las semillas y el número de partidos.

## `umbral-motor`

| Caso | Máximo | Variable |
|---|---|---|
| Partido sin fotogramas | 60 ms | `MAX_PARTIDO_MS` |
| Partido con fotogramas (**nuevo**) | 80 ms | `MAX_FOTOGRAMAS_MS` |
| `resolverResto` desde el minuto 0 | 60 ms | `MAX_RESOLVER_RESTO_MS` |
| Partido con métricas | 60 ms | `MAX_METRICAS_MS` |

Termina con código 1 si se supera alguno. Los nuevos máximos se activan al **final de la etapa 5**. Antes se usa con
`MAX_*` explícitos para la decisión de cadencia, de modo que informa sin bloquear otras etapas.

## `bench`

`packages/engine/bench/partido.bench.ts` deja de usar los parámetros 7.0.0 al migrar `tests/ayudas.ts` a la versión actual.
Añade el caso de `resolverResto` si `@fbd/ai` se puede importar sin ciclo. Si no, ese caso queda solo en `umbral-motor`.

## `pnpm balance`

- `checks/motor018.ts` añade:

  | Criterio | Comprobación |
  |---|---|
  | SC-003 | Energía por rol a las 90:00, contra `curvaEnergia` con el descuento real (±3) |
  | SC-004 | Incansable, Fatigado e Indisciplinado (±3), y dirección de Motivador |
  | SC-005 | Presión alta contra Bloque medio: diferencia significativa y tamaño aprobado |
  | SC-006 | Efecto de cada táctica modificada frente a la línea base |

- Las comprobaciones antiguas de cansancio de `motor014.ts`, `partido.ts` y `rasgos.ts` se migran a energía.
- Un umbral solo se cambia con su fila aprobada en `informe-9.0.0.md`.

## Calibración de las referencias

```bash
pnpm --filter @fbd/balance calibrar-fatiga -- --n 1000
```

Mide los puntos de intensidad por minuto de tramo de cada rol con equipos neutros en Bloque medio y propone
`referenciaAcciones`. Como la energía influye en el juego, se repite hasta que cada referencia varíe menos de un 1 %.

## CI (`.github/workflows/ci.yml`)

```yaml
rendimiento-motor:
  runs-on: ubuntu-latest
  steps:
    # checkout, pnpm, Node 22 e instalación
    - run: pnpm --filter @fbd/engine bench
    - run: pnpm --filter @fbd/balance umbral-motor
```

Es un job **independiente** del job `ci`, para que se ejecute aunque fallen las huellas o la calibración durante las
etapas 2 y 3. Los pasos equivalentes se retiran del job `ci`.

## `pnpm test:equivalence`

| Etapa | Qué comprueba |
|---|---|
| 2 y 3 | Igualdad entre rápida y 2D, y `equivalenciaFinalizar` |
| 4 en adelante | Lo anterior y `huella-018.json` (100 partidos y 20 drafts) |
