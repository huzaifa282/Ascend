import { defineConfig } from 'vitest/config';

// No `resolve.alias` for the @ascendant/* workspace packages: pnpm already
// symlinks them into node_modules, and each has "main" pointing at its own
// src/index.ts, so bare specifiers resolve correctly without one. Aliasing
// just the bare package name here previously broke deep subpath imports
// (e.g. `@ascendant/app/src/platform/browser`) by double-prefixing "src".
export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'packages/**/*.{test,spec}.ts',
      'packages/**/*.{test,spec}.tsx',
      'apps/**/*.{test,spec}.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**', '**/target/**', '**/gen/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['packages/engine/src/**/*.ts'],
      exclude: ['packages/engine/src/index.ts', 'packages/engine/src/**/*.test.ts'],
      thresholds: {
        lines: 100,
        statements: 100,
        branches: 95,
        functions: 100,
      },
    },
  },
});
