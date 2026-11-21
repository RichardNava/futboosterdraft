import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Sin el resultado anterior: si Vitest no llega a escribirlo, el resumen no puede dar por buenos ataques viejos.
rmSync(fileURLToPath(new URL('./test-results/seguridad.json', import.meta.url)), { force: true });

// Ataques de la spec 017 (`pnpm seguridad`): levantan PostgreSQL con Testcontainers (requiere Docker).
export default defineConfig({
  test: {
    include: ['tests/seguridad/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
    env: { HILOS_SIMULACION_PRUEBAS: '0' },
    reporters: ['default', 'json'],
    outputFile: { json: 'test-results/seguridad.json' },
  },
});
