# Contrato: desglose por fases y grupo de aperturas

**Spec**: [../spec.md](../spec.md) | **Research**: [../research.md](../research.md)

Esta spec no cambia nada que vea un participante (FR-015): ni la API HTTP, ni el protocolo WebSocket, ni el contenido
de los mensajes. Este contrato fija lo nuevo que sí es visible: las métricas, la configuración y la frontera interna
del buzón de aperturas.

## Configuración

| Variable | Valores | Por defecto | Efecto |
|----------|---------|-------------|--------|
| `MEDIR_FASES` | `1` / `0` | `1` | Activa el desglose por fases en todos los entornos (FR-003). Con `0` no se mide nada y las métricas de abajo no reciben observaciones. |

`ConfigServidor.medirFases: boolean` (tests: activado, como en producción).

## Métricas nuevas en `GET /metrics` (FR-002)

| Nombre | Tipo | Etiquetas | Cuantiles |
|--------|------|-----------|-----------|
| `operacion_fase_ms` | Summary | `operacion` ∈ {`apertura`, `entrega_sobre`, `eleccion`}; `fase` ∈ {`cola`, `calculo`, `bd`, `serializacion`, `difusion`, `resto`, `total`} | 0,5 y 0,95 (acumulados desde el arranque) |
| `operacion_consultas` | Summary | `operacion` | 0,5 y 0,95 |

Definición de cada fase en [research.md R2](../research.md#r2-medición-por-fases-asynclocalstorage-y-un-summary-de-prom-client).
Las métricas que ya existen (`turno_draft_resolucion_ms`, `calculo_duracion_ms`, …) no cambian.

Ejemplo:

```text
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="cola"} 812.4
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="bd"} 96.1
operacion_fase_ms{quantile="0.95",operacion="apertura",fase="total"} 1450.7
operacion_consultas{quantile="0.5",operacion="apertura"} 14
```

## API interna: `observabilidad/desglose.ts`

```ts
type Operacion = 'apertura' | 'entrega_sobre' | 'eleccion';
type Fase = 'cola' | 'calculo' | 'bd' | 'serializacion' | 'difusion';

medir<T>(operacion: Operacion, fn: () => Promise<T>): Promise<T>;   // abre el desglose y lo cierra al terminar fn
fase<T>(fase: Fase, fn: () => T): T;                                // suma el tiempo de fn (síncrona o promesa) al desglose actual
renombrar(operacion: Operacion): void;                              // p. ej. 'eleccion' → 'entrega_sobre' al cerrar un turno
contarConsulta(): void;
```

Sin desglose en el contexto (o con `MEDIR_FASES=0`), `fase` solo ejecuta `fn`. Ninguna función cambia valores ni el
orden de ejecución.

## API interna: buzón de aperturas (`actores/aperturas.ts`)

```ts
abrirEntreHumanos(c: ControladorPartida, participanteId: string, partidoId: string, modalidad: ModoSimulacion): Promise<ResultadoAbrir>;
```

- La llama `POST /api/partidos/:id/abrir` cuando la fila leída es de tipo `futbol`, está `programado` y
  `entreHumanos(c, fila)`. En cualquier otro caso la ruta sigue con `c.ejecutar(abrirPartido)`.
- Devuelve exactamente lo mismo que `abrirPartido` para ese caso (`{ modo: 'reproduccion', modalidad }` o
  `{ error }`), y la ruta lo traduce igual que hoy a HTTP.
- Si dentro de la cola el partido ya no está `programado` o ya no es entre humanos, esa apertura se procesa con
  `abrirPartido` dentro del mismo comando, en su orden de llegada.

Necesita de `ActorPartida`:

```ts
get secuencia(): number;   // número de comandos encolados hasta ahora; sube en cada ejecutar()
```

## Respuesta HTTP

Sin cambios: `POST /api/partidos/:id/abrir` devuelve el mismo cuerpo y los mismos códigos de error que hoy. La única
diferencia que se observa es el tiempo.
