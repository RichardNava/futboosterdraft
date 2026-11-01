import { defineConfig } from 'vitest/config';

// Pruebas de integración y de contrato: levantan PostgreSQL con Testcontainers (requiere Docker).
// `--mode hilos` repite la suite con el cálculo en 2 hilos de trabajo (spec 009); por defecto, en proceso.
export default defineConfig(({ mode }) => ({
  test: {
    include: ['tests/integration/**/*.test.ts', 'tests/contract/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
    env: { HILOS_SIMULACION_PRUEBAS: mode === 'hilos' ? '2' : (process.env.HILOS_SIMULACION_PRUEBAS ?? '0') },
  },
}));
