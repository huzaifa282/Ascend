import { defineConfig } from 'vitest/config';
import path from 'node:path';

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
  resolve: {
    alias: {
      '@ascendant/engine': path.resolve(__dirname, 'packages/engine/src'),
      '@ascendant/db': path.resolve(__dirname, 'packages/db/src'),
      '@ascendant/llm': path.resolve(__dirname, 'packages/llm/src'),
      '@ascendant/ui': path.resolve(__dirname, 'packages/ui/src'),
      '@ascendant/app': path.resolve(__dirname, 'packages/app/src'),
      '@ascendant/seed': path.resolve(__dirname, 'packages/seed/src'),
    },
  },
});
