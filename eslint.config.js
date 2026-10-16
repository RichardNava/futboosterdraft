import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Fuentes de no determinismo prohibidas en las reglas puras (research R7):
// toda aleatoriedad pasa por el PRNG con semilla y el tiempo entra como parámetro.
const sinNoDeterminismo = {
  'no-restricted-globals': [
    'error',
    { name: 'Date', message: 'domain/engine son puros: recibe el instante como parámetro.' },
    { name: 'performance', message: 'domain/engine son puros: no midas tiempo aquí.' },
  ],
  'no-restricted-properties': [
    'error',
    { object: 'Math', property: 'random', message: 'Usa el PRNG con semilla (rng/xoshiro).' },
  ],
};

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/*.min.js',
      'apps/web/test-results/**',
      'apps/web/playwright-report/**',
      'apps/server/drizzle/**',
      'specs/**',
      '.specify/**',
      '.claude/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // En las pruebas, las respuestas JSON se leen sin tipo fijo.
    files: ['**/tests/**/*.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ['packages/domain/src/**/*.ts', 'packages/engine/src/**/*.ts'],
    rules: sinNoDeterminismo,
  },
);
