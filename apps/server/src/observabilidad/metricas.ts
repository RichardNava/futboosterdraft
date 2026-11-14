import { Counter, Gauge, Histogram, Registry, Summary, collectDefaultMetrics } from 'prom-client';

export interface Metricas {
  registro: Registry;
  partidasActivas: Gauge;
  turnoDraftResolucionMs: Histogram;
  partidosSimuladosTotal: Counter;
  desconexionesTotal: Counter;
  /** Hilos de simulación (spec 009, FR-009). */
  hilosSimulacion: Gauge;
  calculosEnEspera: Gauge<'prioridad'>;
  calculoDuracionMs: Histogram<'funcion'>;
  calculosFallidosTotal: Counter<'motivo'>;
  calculoReintentosTotal: Counter;
  /** Desglose por fases de cada operación (spec 010, FR-002). */
  operacionFaseMs: Summary<'operacion' | 'fase'>;
  operacionConsultas: Summary<'operacion'>;
}

/** Métricas de Prometheus del servidor. */
export function crearMetricas(): Metricas {
  const registro = new Registry();
  collectDefaultMetrics({ register: registro });
  return {
    registro,
    partidasActivas: new Gauge({
      name: 'partidas_activas',
      help: 'Partidas con actor en memoria',
      registers: [registro],
    }),
    turnoDraftResolucionMs: new Histogram({
      name: 'turno_draft_resolucion_ms',
      help: 'Tiempo desde la última elección hasta el envío del siguiente sobre',
      buckets: [10, 25, 50, 100, 250, 500, 1000, 2500],
      registers: [registro],
    }),
    partidosSimuladosTotal: new Counter({
      name: 'partidos_simulados_total',
      help: 'Partidos simulados por el motor',
      registers: [registro],
    }),
    desconexionesTotal: new Counter({
      name: 'desconexiones_total',
      help: 'Conexiones WebSocket cerradas',
      registers: [registro],
    }),
    hilosSimulacion: new Gauge({
      name: 'hilos_simulacion',
      help: 'Hilos de trabajo que simulan partidos (0 = en proceso)',
      registers: [registro],
    }),
    calculosEnEspera: new Gauge({
      name: 'calculos_en_espera',
      help: 'Cálculos en cola esperando un hilo libre',
      labelNames: ['prioridad'],
      registers: [registro],
    }),
    calculoDuracionMs: new Histogram({
      name: 'calculo_duracion_ms',
      help: 'Duración de cada cálculo en un hilo, desde que lo empieza',
      labelNames: ['funcion'],
      buckets: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10_000, 20_000],
      registers: [registro],
    }),
    calculosFallidosTotal: new Counter({
      name: 'calculos_fallidos_total',
      help: 'Cálculos fallidos: caída del hilo o tiempo agotado tras los reintentos, o error en la función',
      labelNames: ['motivo'],
      registers: [registro],
    }),
    calculoReintentosTotal: new Counter({
      name: 'calculo_reintentos_total',
      help: 'Cálculos repetidos en un hilo nuevo tras una caída o un tiempo agotado',
      registers: [registro],
    }),
    // Cuantiles acumulados desde el arranque: cada escenario de carga reinicia el servidor (research R12).
    operacionFaseMs: new Summary({
      name: 'operacion_fase_ms',
      help: 'Tiempo de cada fase de una operación (apertura, entrega de sobre, elección)',
      labelNames: ['operacion', 'fase'],
      percentiles: [0.5, 0.95],
      registers: [registro],
    }),
    operacionConsultas: new Summary({
      name: 'operacion_consultas',
      help: 'Consultas a PostgreSQL hechas por cada operación',
      labelNames: ['operacion'],
      percentiles: [0.5, 0.95],
      registers: [registro],
    }),
  };
}
