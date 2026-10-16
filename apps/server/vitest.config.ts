import { defineConfig } from 'vitest/config';

// Pruebas de integración y de contrato: levantan PostgreSQL con Testcontainers (requiere Docker).
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts', 'tests/contract/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
