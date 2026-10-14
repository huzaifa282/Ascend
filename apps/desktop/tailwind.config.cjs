const preset = require('../../packages/ui/tailwind-preset.cjs');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [preset],
  content: [
    './main.html',
    './widget.html',
    './strip.html',
    './command.html',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
    '../../packages/app/src/**/*.{ts,tsx}',
  ],
  // PlayerBar (spec 9.2) hides elements by its own box width, not the
  // viewport's — e.g. it's narrower inside the widget than in the main window.
  plugins: [require('@tailwindcss/container-queries')],
};
