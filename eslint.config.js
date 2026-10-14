// @ts-check
import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

/** Dependency rule (spec section 3):
 *  engine imports nothing from other packages.
 *  llm imports only engine types and zod.
 *  ui has no data access (no db/llm/app imports).
 *  app wires everything together (no restriction).
 */
const boundaries = [
  {
    files: ['packages/engine/**/*.{ts,tsx}'],
    rules: {
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './packages/engine',
              from: ['./packages/db', './packages/llm', './packages/ui', './packages/app'],
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/llm/**/*.{ts,tsx}'],
    rules: {
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './packages/llm',
              from: ['./packages/db', './packages/ui', './packages/app'],
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/ui/**/*.{ts,tsx}'],
    rules: {
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './packages/ui',
              from: ['./packages/db', './packages/llm', './packages/app'],
            },
          ],
        },
      ],
    },
  },
];

export default [
  { ignores: ['**/dist/**', '**/target/**', '**/node_modules/**', '**/coverage/**', '**/gen/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      // Browser globals (document, HTMLButtonElement, ...) everywhere by
      // default — this is a browser-only app (desktop webview + web demo).
      globals: { ...globals.browser },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      import: importPlugin,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // React/hooks rules only make sense where JSX actually lives — a plain
    // service module named e.g. `useShield` (packages/app/src/services) is
    // not a React hook and shouldn't be linted as one.
    files: ['**/*.tsx'],
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
  },
  {
    files: ['packages/engine/**/*.{ts,tsx}'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'Do not call Date.now() inside packages/engine. Time is always passed in.',
        },
      ],
    },
  },
  ...boundaries,
  {
    // Config files and build/CLI scripts run under Node, not the browser.
    files: [
      '*.config.{js,ts,cjs,mjs}',
      '**/*.config.{js,ts,cjs,mjs}',
      '**/scripts/**/*.ts',
      'packages/seed/src/cli.ts',
    ],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  prettier,
];
