import { defineConfig, devices } from '@playwright/test';

/**
 * Recorridos de principio a fin. Necesitan PostgreSQL con el catálogo cargado:
 *   docker compose up -d db && pnpm db:migrate && pnpm seed --file data/core.json
 * Playwright aplica las migraciones pendientes y arranca el servidor (con reloj simulado) y la web si no
 * están ya en marcha.
 */
const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://fbd:fbd@localhost:5432/futboosterdraft';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 180_000,
  expect: { timeout: 15_000 },
  workers: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : [
        {
          command: 'pnpm --filter @fbd/server db:migrate && pnpm --filter @fbd/server exec tsx src/main.ts --fake-clock',
          url: 'http://localhost:3000/healthz',
          reuseExistingServer: true,
          timeout: 60_000,
          env: {
            DATABASE_URL,
            AUTH_SECRET: process.env.AUTH_SECRET ?? 'secreto-e2e-suficientemente-largo-para-pruebas',
            PUBLIC_URL: 'http://localhost:5173',
            LOG_LEVEL: 'warn',
          },
        },
        {
          command: 'pnpm --filter @fbd/web dev',
          url: 'http://localhost:5173',
          reuseExistingServer: true,
          timeout: 60_000,
        },
      ],
});
