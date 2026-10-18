import { defineWorkspace } from 'vitest/config';

// Pruebas sin E/S. Las de integración del servidor (con PostgreSQL) se ejecutan aparte con
// `pnpm test:integration`.
export default defineWorkspace([
  { test: { name: 'domain', root: './packages/domain', include: ['tests/**/*.test.ts'] } },
  { test: { name: 'engine', root: './packages/engine', include: ['tests/**/*.test.ts'] } },
  { test: { name: 'ai', root: './packages/ai', include: ['tests/**/*.test.ts'] } },
  { test: { name: 'protocol', root: './packages/protocol', include: ['tests/**/*.test.ts'] } },
  { test: { name: 'balance', root: './tools/balance', include: ['tests/**/*.test.ts'] } },
  { test: { name: 'server-unit', root: './apps/server', include: ['tests/unit/**/*.test.ts'] } },
  { test: { name: 'fixtures', root: './tools/fixtures', include: ['tests/**/*.test.ts'] } },
  { test: { name: 'web', root: './apps/web', include: ['tests/unit/**/*.test.ts'] } },
]);
