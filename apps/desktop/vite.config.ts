import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Tauri expects a fixed port and will fail if it is occupied.
const port = 1420;

export default defineConfig({
  plugins: [react()],
  // Multi-page build: one light entry per window (spec section 7.1, decision #1).
  // main = full app (router + every screen + the LLM pipeline).
  // widget / command host a command bar too (so they do pull in the LLM
  // pipeline), but never the router or the other screens, since they import
  // `@ascendant/app/companion/*` directly instead of the `App`-exporting
  // top-level barrel (see that barrel's own comment, and docs/decisions.md).
  // strip has no command bar and stays by far the lightest of the three.
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'main.html'),
        widget: path.resolve(__dirname, 'widget.html'),
        strip: path.resolve(__dirname, 'strip.html'),
        command: path.resolve(__dirname, 'command.html'),
      },
    },
    target: ['es2022', 'chrome105'],
    minify: 'esbuild',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
  },
  resolve: {
    // Exact-match aliases (RegExp, not prefix strings) so that subpath
    // imports like `@ascendant/ui/tokens.css` fall through to normal
    // node_modules resolution (pnpm's workspace symlink) instead of being
    // redirected into `<pkg>/src/tokens.css`, which doesn't exist.
    alias: [
      { find: /^@ascendant\/engine$/, replacement: path.resolve(__dirname, '../../packages/engine/src') },
      { find: /^@ascendant\/db$/, replacement: path.resolve(__dirname, '../../packages/db/src') },
      { find: /^@ascendant\/llm$/, replacement: path.resolve(__dirname, '../../packages/llm/src') },
      { find: /^@ascendant\/ui$/, replacement: path.resolve(__dirname, '../../packages/ui/src') },
      { find: /^@ascendant\/app$/, replacement: path.resolve(__dirname, '../../packages/app/src') },
      // Prefix alias (deliberately not exact-match): lets the widget/strip/
      // command entries reach the companion root components directly,
      // bypassing the `@ascendant/app` barrel above (which also exports the
      // full `App`, router and all).
      { find: /^@ascendant\/app\/companion\//, replacement: `${path.resolve(__dirname, '../../packages/app/src/companion')}/` },
      { find: /^@ascendant\/seed$/, replacement: path.resolve(__dirname, '../../packages/seed/src') },
    ],
  },

  // Vite/Tauri shared setup — see https://tauri.app/develop/#using-frameworks
  clearScreen: false,
  server: {
    port,
    strictPort: true,
    host: process.env.TAURI_DEV_HOST || false,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
});
