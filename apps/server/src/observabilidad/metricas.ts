import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

export interface Metricas {
  registro: Registry;
  partidasActivas: Gauge;
  turnoDraftResolucionMs: Histogram;
  partidosSimuladosTotal: Counter;
  desconexionesTotal: Counter;
}

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
  };
}
