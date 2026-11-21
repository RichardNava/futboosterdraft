import { defineConfig } from 'vitest/config';

// Simulan cientos de partidos de forma síncrona: Vitest 2 no podía cortarlos y Vitest 4 sí aplica el tiempo máximo.
const testTimeout = 300_000;

// Pruebas sin E/S. Las de integración del servidor (con PostgreSQL) se ejecutan aparte con
// `pnpm test:integration`.
export default defineConfig({
  test: {
    projects: [
      { test: { name: 'domain', root: './packages/domain', include: ['tests/**/*.test.ts'], testTimeout } },
      { test: { name: 'engine', root: './packages/engine', include: ['tests/**/*.test.ts'], testTimeout } },
      { test: { name: 'ai', root: './packages/ai', include: ['tests/**/*.test.ts'], testTimeout } },
      { test: { name: 'protocol', root: './packages/protocol', include: ['tests/**/*.test.ts'] } },
      { test: { name: 'balance', root: './tools/balance', include: ['tests/**/*.test.ts'], testTimeout } },
      { test: { name: 'server-unit', root: './apps/server', include: ['tests/unit/**/*.test.ts'] } },
      { test: { name: 'fixtures', root: './tools/fixtures', include: ['tests/**/*.test.ts'] } },
      { test: { name: 'web', root: './apps/web', include: ['tests/unit/**/*.test.ts'] } },
    ],
  },
});
